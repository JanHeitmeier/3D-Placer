import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { AssetService } from './asset.service';
import { ModelInfo } from '../models/model-info.model';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelManagerService {
  private readonly MODELS_MANIFEST_KEY = 'models-manifest.json';
  private modelsSubject = new BehaviorSubject<ModelInfo[]>([]);
  public models$: Observable<ModelInfo[]> = this.modelsSubject.asObservable();

  constructor(
    private storageService: StorageService,
    private assetService: AssetService
  ) {
    this.loadModelsFromStorage();
  }


  private async loadModelsFromStorage(): Promise<void> {
    try {
      const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
      const models = manifest.models as ModelInfo[];
      
      // Initialize with empty array if no models exist
      if (!models || !Array.isArray(models)) {
        this.modelsSubject.next([]);
        return;
      }
      
      const modelsWithUrls = await Promise.all(models.map(async (model: ModelInfo) => {
        const url = model.thumbnailPath ? await this.getThumbnailUrlFromPath(model.thumbnailPath) : undefined;
        return { ...model, thumbnailUrl: url };
      }));
      this.modelsSubject.next(modelsWithUrls);
    } catch (error) {
      console.warn('First run or error loading models:', error);
      this.modelsSubject.next([]);
    }
  }

  getRandomImageUrl(width: number, height: number): string {
    return this.assetService.getImageUrl(width, height);
  }

  async importModel(sourceUri: string, name: string): Promise<ModelInfo> {
    const modelId = uuidv4();
    const extension = name.split('.').pop()?.toLowerCase() || 'glb';
    const destinationPath = `models/model_${modelId}.${extension}`;
    await this.storageService.copyFile(sourceUri, destinationPath);

    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
    const newModel: ModelInfo = {
      id: modelId,
      name: name,
      path: destinationPath,
      thumbnailGenerated: false // Initialize flag to false
    };
    manifest.models.push(newModel);
    await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);

    // Initial update without thumbnail
    this.modelsSubject.next(manifest.models);

    try {
      console.log('Starting thumbnail generation for', newModel.id);
      await this.tryGenerateThumbnail(newModel);
      console.log('Thumbnail generation successful for', newModel.id);
      // The saveThumbnail method will set the thumbnailGenerated flag
    } catch (e) {
      console.error('Auto thumbnail generation failed for', newModel.id, e);
      // Even if generation fails, mark it as attempted to prevent loops
      const updatedManifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
      const modelIndex = updatedManifest.models.findIndex((m: ModelInfo) => m.id === modelId);
      if (modelIndex > -1) {
        updatedManifest.models[modelIndex].thumbnailGenerated = true;
        await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, updatedManifest);
      }
    }

    return newModel;
  }


  async updateModelInfo(updatedModel: ModelInfo): Promise<void> {
    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
    const modelIndex = manifest.models.findIndex((m: ModelInfo) => m.id === updatedModel.id);

    if (modelIndex > -1) {
      manifest.models[modelIndex] = updatedModel;
      await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);

      // Update the models in the BehaviorSubject
      const currentModels = this.modelsSubject.getValue();
      const updatedModels = currentModels.map(model =>
        model.id === updatedModel.id ? updatedModel : model
      );
      this.modelsSubject.next(updatedModels);
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
    const modelIndex = manifest.models.findIndex((m: ModelInfo) => m.id === modelId);

    if (modelIndex > -1) {
      const model = manifest.models[modelIndex];

      if (model.path) {
        await this.storageService.deleteFile(model.path);
      }

      if (model.thumbnailPath) {
        await this.storageService.deleteFile(model.thumbnailPath);
      }

      manifest.models.splice(modelIndex, 1);
      await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);

      const modelsWithUrls = await Promise.all(manifest.models.map(async (model: ModelInfo) => {
        const url = model.thumbnailPath ? await this.getThumbnailUrlFromPath(model.thumbnailPath) : undefined;
        return { ...model, thumbnailUrl: url };
      }));
      this.modelsSubject.next(modelsWithUrls);
    }
  }

  public async tryGenerateThumbnail(model: ModelInfo): Promise<void> {
    // Only run in environments with a DOM
    if (typeof document === 'undefined') {
      console.log('No document available for thumbnail generation');
      throw new Error('No document available for thumbnail generation');
    }

    console.log('Getting model path for', model.id);
    const modelUrl = await this.getModelPath(model.id);
    if (!modelUrl) {
      console.error('Model URL not available for', model.id);
      throw new Error('Model URL not available');
    }
    console.log('Model URL obtained:', modelUrl);

    const canvasSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    console.log('Setting up Three.js renderer');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(canvasSize, canvasSize);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 2);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(1, 1, 1);
    scene.add(dir);

    try {
      console.log('Loading 3D model', model.name);
      const obj = await this.loadModel(model, modelUrl);
      console.log('Model loaded successfully');

      // Center and scale
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 1.0 / maxDim;
      obj.scale.set(scale, scale, scale);
      scene.add(obj);

      // Position camera to fit
      camera.position.set(0, 0, 1.8);
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      console.log('Rendering scene to canvas');
      renderer.render(scene, camera);

      console.log('Capturing canvas as data URL');
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Saving thumbnail for', model.id);
      await this.saveThumbnail(model.id, dataUrl);
      console.log('Thumbnail saved successfully');
    } catch (error) {
      console.error('Error during thumbnail generation:', error);
      throw error;
    } finally {
      // Cleanup
      try {
        renderer.dispose();
        // @ts-ignore
        if (renderer.getContext) {
          // Attempt to force context loss
          const gl = (renderer as any).getContext && (renderer as any).getContext();
          if (gl && gl.getExtension) {
            const loseExt = gl.getExtension('WEBGL_lose_context');
            if (loseExt) loseExt.loseContext();
          }
        }
      } catch (e) {
        console.error('Error during renderer cleanup:', e);
      }
    }
  }

  // Extract the model loading logic to a separate method for better organization
  private async loadModel(model: ModelInfo, modelUrl: string): Promise<THREE.Object3D> {
    const extension = model.name.split('.').pop()?.toLowerCase();

    const loadGltf = () => new Promise<THREE.Object3D>(async (resolve, reject) => {
      console.log('Using GLTFLoader');
      const loader = new GLTFLoader();
      try {
        // Fetch the resource so we can handle blob URLs and binary .glb properly
        const resp = await fetch(modelUrl);
        const isGlb = (model.name.split('.').pop() || '').toLowerCase() === 'glb';
        if (isGlb) {
          console.log('Processing as GLB binary');
          const arrayBuffer = await resp.arrayBuffer();
          loader.parse(arrayBuffer, '', (gltf: any) => resolve(gltf.scene || gltf), reject);
        } else {
          console.log('Processing as GLTF text');
          const text = await resp.text();
          loader.parse(text, '', (gltf: any) => resolve(gltf.scene || gltf), reject);
        }
      } catch (err) {
        console.error('GLTF loading error:', err);
        reject(err);
      }
    });

    const loadFbx = () => new Promise<THREE.Object3D>((resolve, reject) => {
      console.log('Using FBXLoader');
      const loader = new FBXLoader();
      loader.load(modelUrl,
        (obj: any) => resolve(obj),
        undefined,
        (err) => {
          console.error('FBX loading error:', err);
          reject(err);
        }
      );
    });

    const loadObj = () => new Promise<THREE.Object3D>((resolve, reject) => {
      console.log('Using OBJLoader');
      const loader = new OBJLoader();
      loader.load(modelUrl,
        (obj: any) => resolve(obj),
        undefined,
        (err) => {
          console.error('OBJ loading error:', err);
          reject(err);
        }
      );
    });

    const loadDae = () => new Promise<THREE.Object3D>((resolve, reject) => {
      console.log('Using ColladaLoader');
      const loader = new ColladaLoader();
      loader.load(modelUrl,
        (collada: any) => resolve(collada.scene || collada),
        undefined,
        (err) => {
          console.error('Collada loading error:', err);
          reject(err);
        }
      );
    });

    // Prefer loader based on extension
    try {
      console.log(`Choosing loader based on extension: ${extension}`);
      if (extension === 'glb' || extension === 'gltf') return await loadGltf();
      if (extension === 'fbx') return await loadFbx();
      if (extension === 'obj') return await loadObj();
      if (extension === 'dae') return await loadDae();

      // Fallback order
      console.log('No matching extension, trying loaders in sequence');
      try {
        console.log('Trying GLTF loader');
        return await loadGltf();
      } catch (e) {
        console.log('GLTF loader failed, trying next');
      }

      try {
        console.log('Trying FBX loader');
        return await loadFbx();
      } catch (e) {
        console.log('FBX loader failed, trying next');
      }

      try {
        console.log('Trying OBJ loader');
        return await loadObj();
      } catch (e) {
        console.log('OBJ loader failed, trying DAE loader');
      }

      console.log('Trying DAE loader as last resort');
      return await loadDae();
    } catch (err) {
      console.error('All loaders failed:', err);
      throw err;
    }
  }

  async getModelPath(modelId: string): Promise<string | null> {
    const models = this.modelsSubject.getValue();
    const model = models.find(m => m.id === modelId);
    if (!model) {
      return null;
    }
    try {
      const fileUri = await Filesystem.getUri({
        directory: Directory.Data,
        path: model.path
      });
      return Capacitor.convertFileSrc(fileUri.uri);
    } catch (e) {
      // Fallback: try to read file as base64 and create a blob URL (works in browser / dev)
      try {
        const result = await Filesystem.readFile({ path: model.path, directory: Directory.Data });
        const base64 = result.data as string;
        // Convert base64 to binary
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        const blobUrl = URL.createObjectURL(blob);
        return blobUrl;
      } catch (e2) {
        console.error('Unable to get model path for', modelId, e2);
        return null;
      }
    }
  }

  /**
   * Return the raw ModelInfo object for a given id (or null if not found).
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = this.modelsSubject.getValue();
    const model = models.find(m => m.id === modelId) || null;
    return model;
  }

  async saveThumbnail(modelId: string, imageData: string): Promise<void> {
    try {
      await this.storageService.createDir('thumbnails');

      const thumbnailPath = `thumbnails/thumb_${modelId}_${Date.now()}.png`;

      // Using a timestamp in the filename prevents caching issues
      let base64Data = imageData;
      const commaIndex = imageData.indexOf(',');
      if (imageData.startsWith('data:') && commaIndex > -1) {
        base64Data = imageData.substring(commaIndex + 1);
      }

      console.log(`Saving thumbnail for model ${modelId} to ${thumbnailPath}`);
      await this.storageService.saveBase64(thumbnailPath, base64Data);

      // Get the previous model info to delete old thumbnail
      const currentModel = await this.getModelInfo(modelId);
      if (currentModel?.thumbnailPath && currentModel.thumbnailPath !== thumbnailPath) {
        try {
          await this.storageService.deleteFile(currentModel.thumbnailPath);
          console.log(`Deleted old thumbnail: ${currentModel.thumbnailPath}`);
        } catch (e) {
          console.warn(`Failed to delete old thumbnail: ${currentModel.thumbnailPath}`, e);
        }
      }

      const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
      const modelIndex = manifest.models.findIndex((m: ModelInfo) => m.id === modelId);

      if (modelIndex > -1) {
        manifest.models[modelIndex].thumbnailPath = thumbnailPath;
        manifest.models[modelIndex].thumbnailGenerated = true;
        await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);

        // Get the new thumbnail URL and immediately update the models array
        const thumbnailUrl = await this.getThumbnailUrlFromPath(thumbnailPath);

        // Update the models in the BehaviorSubject
        const currentModels = this.modelsSubject.getValue();
        const updatedModels = currentModels.map(model => {
          if (model.id === modelId) {
            return { ...model, thumbnailPath, thumbnailGenerated: true, thumbnailUrl };
          }
          return model;
        });

        console.log(`Updated thumbnail URL for model ${modelId}: ${thumbnailUrl}`);
        this.modelsSubject.next(updatedModels);
      }
    } catch (error) {
      console.error('Error saving thumbnail:', error);
      throw error;
    }
  }

  async getThumbnailUrl(modelId: string): Promise<string | null> {
    const models = this.modelsSubject.getValue();
    const model = models.find(m => m.id === modelId);
    if (!model || !model.thumbnailPath) {
      return null;
    }
    try {
      const fileUri = await Filesystem.getUri({
        directory: Directory.Data,
        path: model.thumbnailPath
      });
      return Capacitor.convertFileSrc(fileUri.uri);
    } catch (e) {
      
      try {
        const result = await Filesystem.readFile({ path: model.thumbnailPath, directory: Directory.Data });
        const base64 = result.data as string;
        return `data:image/png;base64,${base64}`;
      } catch (e2) {
        console.error('Unable to get thumbnail for', modelId, e2);
        return null;
      }
    }
  }

  private async getThumbnailUrlFromPath(path: string): Promise<string | undefined> {
    try {
      const fileUri = await Filesystem.getUri({
        directory: Directory.Data,
        path: path
      });
      return Capacitor.convertFileSrc(fileUri.uri);
    } catch (e) {
      try {
        const result = await Filesystem.readFile({ path: path, directory: Directory.Data });
        return `data:image/png;base64,${result.data as string}`;
      } catch (e2) {
        return undefined;
      }
    }
  }

  async refreshThumbnails(): Promise<void> {
    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };

    // Add handling for models with invalid thumbnail paths
    const modelsWithUrls = await Promise.all(manifest.models.map(async (model: ModelInfo) => {
      let url = undefined;
      
      // Only try to get URL if thumbnailPath exists
      if (model.thumbnailPath) {
        try {
          url = await this.getThumbnailUrlFromPath(model.thumbnailPath);
          
          // If URL can't be retrieved but thumbnailGenerated is true, reset the flag
          // to prevent infinite refresh loops
          if (!url && model.thumbnailGenerated) {
            console.log(`Fixing inconsistent state for model ${model.name}: resetting thumbnailGenerated flag`);
            const updatedManifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
            const modelIndex = updatedManifest.models.findIndex((m: ModelInfo) => m.id === model.id);
            if (modelIndex > -1) {
              updatedManifest.models[modelIndex].thumbnailGenerated = false;
              await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, updatedManifest);
              model.thumbnailGenerated = false;
            }
          }
        } catch (e) {
          console.warn(`Failed to get thumbnail URL for ${model.name}`, e);
        }
      }
      
      return { ...model, thumbnailUrl: url };
    }));

    this.modelsSubject.next(modelsWithUrls);
  }

  public async createThumbnailsDirectory(): Promise<void> {
    try {
      await this.storageService.createDir('thumbnails');
    } catch (e) {
      // Ignore "already exists" errors
    }
  }

  public async getModelsManifest(): Promise<any> {
    return await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
  }

  public async updateModelsManifest(manifest: any): Promise<void> {
    await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);
  }
}
