import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle,
  IonContent, IonText, IonLabel, IonButton, IonIcon, IonRange
} from '@ionic/angular/standalone';
import { LoadingController, ToastController } from '@ionic/angular/standalone';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import * as THREE from 'three';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { StorageService } from '../../core/services/storage.service';
import { ModelInfo } from '../../core/models/model-info.model';
import { ThreeJsService, TextureSettings } from '../../core/services/three-js.service';
// Add icon imports
import { addIcons } from 'ionicons';
import { 
  cameraOutline, 
  refreshOutline, 
  colorPaletteOutline, 
  imageOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-model-editor',
  templateUrl: './model-editor.page.html',
  styleUrls: ['./model-editor.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonText,
    IonLabel,
    IonButton,
    IonIcon,
    IonRange
  ]
})
export class ModelEditorPage implements OnInit, OnDestroy {
  @ViewChild('rendererContainer', { static: true }) rendererContainer!: ElementRef;

  model: ModelInfo | undefined;
  showTextureOptions: boolean = false;

  // Three.js properties
  private modelObject: THREE.Object3D | null = null;
  private originalCameraPosition: THREE.Vector3 | null = null;
  private originalControlsTarget: THREE.Vector3 | null = null;

  // Panel visibility
  isPanelVisible = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modelManager: ModelManagerService,
    private storageService: StorageService,
    private zone: NgZone,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private threeJsService: ThreeJsService
  ) {
    // Register icons
    addIcons({ 
      cameraOutline, 
      refreshOutline, 
      colorPaletteOutline, 
      imageOutline 
    });
  }

  async ngOnInit() {
    const modelId = this.route.snapshot.paramMap.get('id');

    if (modelId) {
      await this.loadModel(modelId);
    } else {
      const lastModelId = localStorage.getItem('lastOpenedModelId');
      if (lastModelId) {
        await this.loadModel(lastModelId);
      }
    }

    setTimeout(() => {
      this.setupThreeJs();
    }, 150);
  }

  ngOnDestroy() {
    this.threeJsService.dispose();
  }

  private async loadModel(modelId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Loading model...'
    });
    await loading.present();

    try {
      const modelInfo = await this.modelManager.getModelInfo(modelId);
      if (!modelInfo) {
        throw new Error('Model not found');
      }

      this.model = modelInfo;
      localStorage.setItem('lastOpenedModelId', modelId);

      if (this.threeJsService.scene) {
        await this.loadModelIntoScene();
      }
    } catch (error) {
      console.error('Error loading model:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast('Error loading model: ' + errorMsg);
    } finally {
      loading.dismiss();
    }
  }

  private setupThreeJs() {
    const container = this.rendererContainer.nativeElement;

    // Ensure container has dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.warn('Container has zero dimensions, waiting...');
      setTimeout(() => this.setupThreeJs(), 100);
      return;
    }

    console.log(`Setting up ThreeJS with container dimensions: ${container.clientWidth}x${container.clientHeight}`);

    try {
      this.threeJsService.init(container, {
        backgroundColor: 0xf0f0f0,
        gridSize: 10,
        gridDivisions: 10,
        gridColor1: 0x888888,
        gridColor2: 0xcccccc,
        addBottomLight: true,
        cameraPosition: new THREE.Vector3(0, 2, 5)
      });

      if (this.model) {
        this.loadModelIntoScene();
      }

      window.addEventListener('resize', this.onWindowResize.bind(this));
    } catch (error) {
      console.error('Error setting up ThreeJS:', error);
      // Retry after a delay
      setTimeout(() => this.setupThreeJs(), 200);
    }
  }

  private onWindowResize() {
    const container = this.rendererContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width > 0 && height > 0) {
      this.threeJsService.camera.aspect = width / height;
      this.threeJsService.camera.updateProjectionMatrix();
      this.threeJsService.renderer.setSize(width, height);
    } else {
      console.warn('Invalid container dimensions on resize');
    }
  }

  private async loadModelIntoScene() {
    if (!this.model) return;

    try {
      if (this.modelObject) {
        this.threeJsService.scene.remove(this.modelObject);
        this.modelObject = null;
      }

      const modelUrl = await this.modelManager.getModelPath(this.model.id);
      if (!modelUrl) {
        throw new Error('Could not get model URL');
      }

      const object = await this.threeJsService.loadObjectToScene(modelUrl, this.threeJsService.scene);
      if (!object) {
        throw new Error('Failed to load 3D model');
      }

      // Center and position the model
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.position.y = 0;

      this.modelObject = object;
      this.threeJsService.fitCameraToObject(object);

      this.originalCameraPosition = this.threeJsService.camera.position.clone();
      this.originalControlsTarget = this.threeJsService.controls.target.clone();

      // Apply texture if the model has one
      if (this.model.textureUrl) {
        console.log('Model has texture, applying automatically:', this.model.textureUrl);
        await this.applyTextureWithSettings();
      }
    } catch (error) {
      console.error('Error loading model into scene:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast('Error loading model: ' + errorMsg);
    }
  }

  resetView() {
    if (this.originalCameraPosition && this.originalControlsTarget && this.modelObject) {
      this.threeJsService.camera.position.copy(this.originalCameraPosition);
      this.threeJsService.controls.target.copy(this.originalControlsTarget);
      this.threeJsService.controls.update();
      this.showToast('View reset');
    } else if (this.modelObject) {
      this.threeJsService.fitCameraToObject(this.modelObject);
      this.showToast('View reset');
    }
  }

  async generateNewThumbnail() {
    if (!this.model) return;

    const loading = await this.loadingCtrl.create({
      message: 'Generating thumbnail...'
    });
    await loading.present();

    try {
      if (this.modelObject) {
        console.log('Creating offscreen renderer for thumbnail');

        const thumbnailSize = 512;
        const offscreenRenderer = new THREE.WebGLRenderer({
          antialias: true,
          preserveDrawingBuffer: true
        });
        offscreenRenderer.setSize(thumbnailSize, thumbnailSize);
        offscreenRenderer.setClearColor(0xf0f0f0);

        const thumbnailScene = new THREE.Scene();
        thumbnailScene.background = new THREE.Color(0xf0f0f0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        thumbnailScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.copy(this.threeJsService.scene.getObjectByName('DirectionalLight')?.position || new THREE.Vector3(1, 1, 1));
        thumbnailScene.add(directionalLight);

        const modelClone = this.modelObject.clone();
        thumbnailScene.add(modelClone);

        const thumbnailCamera = this.threeJsService.camera.clone();
        thumbnailCamera.aspect = 1.0;
        thumbnailCamera.updateProjectionMatrix();

        offscreenRenderer.render(thumbnailScene, thumbnailCamera);
        const dataUrl = offscreenRenderer.domElement.toDataURL('image/png');
        offscreenRenderer.dispose();

        try {
          await this.modelManager.saveThumbnail(this.model.id, dataUrl);
          const updatedModel = await this.modelManager.getModelInfo(this.model.id);
          if (updatedModel) {
            this.model = updatedModel;
          }
          await this.showToast('Thumbnail saved successfully');
        } catch (error) {
          console.error('Failed to save thumbnail:', error);
          await this.showToast('Failed to save thumbnail');
        }
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      await this.showToast('Error generating thumbnail');
    } finally {
      await loading.dismiss();
    }
  }

  private async showToast(message: string, duration: number = 2000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: duration,
      position: 'bottom'
    });
    return toast.present();
  }

  async applyRandomTexture() {
    this.showTextureOptions = true;
  }

  async applyTexture(size: number) {
    if (!this.modelObject || !this.model) return;

    const loading = await this.loadingCtrl.create({
      message: 'Downloading and applying texture...'
    });
    await loading.present();

    try {
      const textureUrl = this.modelManager.getRandomImageUrl(size, size);
      const texturePath = `textures/${this.model.id}_texture.jpg`;

      await this.storageService.downloadAndSaveImage(textureUrl, texturePath);
      const localTextureUrl = await this.getTextureUrl(texturePath);

      const textureSettings: TextureSettings = {
        textureUrl: localTextureUrl,
        projection: 'box',
        scaleU: 1,
        scaleV: 1,
        offsetU: 0,
        offsetV: 0
      };

      await this.threeJsService.applyTextureToObject(this.modelObject, textureSettings);

      const updatedModel: ModelInfo = {
        ...this.model,
        texturePath: texturePath,
        textureUrl: localTextureUrl,
        textureProjection: 'box',
        textureOffsetU: 0,
        textureOffsetV: 0,
        textureScaleU: 1,
        textureScaleV: 1
      };

      await this.modelManager.updateModelInfo(updatedModel);
      this.model = updatedModel;

      this.showToast('Texture applied successfully');
      this.showTextureOptions = false;
    } catch (error) {
      console.error('Error applying texture:', error);
      this.showToast('Error applying texture');
    } finally {
      loading.dismiss();
    }
  }

  private async getTextureUrl(path: string): Promise<string> {
    try {
      const fileUri = await Filesystem.getUri({
        directory: Directory.Data,
        path: path
      });
      return Capacitor.convertFileSrc(fileUri.uri);
    } catch (e) {
      const result = await Filesystem.readFile({
        path: path,
        directory: Directory.Data
      });
      return `data:image/jpeg;base64,${result.data}`;
    }
  }

  async changeTextureProjection(projection: 'box' | 'cylinder') {
    if (!this.model?.textureUrl || !this.modelObject) return;

    try {
      const updatedModel = {
        ...this.model,
        textureProjection: projection
      };

      await this.modelManager.updateModelInfo(updatedModel);
      this.model = updatedModel;

      await this.applyTextureWithSettings();
      this.showToast(`Applied ${projection} projection`);
    } catch (error) {
      console.error('Error changing projection:', error);
      this.showToast('Error changing projection');
    }
  }

  async updateTextureSettings() {
    if (!this.model?.textureUrl) return;

    try {
      const updatedModel = {
        ...this.model,
        textureOffsetU: this.model.textureOffsetU,
        textureOffsetV: this.model.textureOffsetV,
        textureScaleU: this.model.textureScaleU,
        textureScaleV: this.model.textureScaleV
      };

      await this.modelManager.updateModelInfo(updatedModel);
      await this.applyTextureWithSettings();
    } catch (error) {
      console.error('Error updating texture settings:', error);
    }
  }

  private async applyTextureWithSettings() {
    if (!this.model?.textureUrl || !this.modelObject) return;

    try {
      const textureSettings: TextureSettings = {
        textureUrl: this.model.textureUrl,
        projection: this.model.textureProjection || 'box',
        scaleU: this.model.textureScaleU || 1,
        scaleV: this.model.textureScaleV || 1,
        offsetU: this.model.textureOffsetU || 0,
        offsetV: this.model.textureOffsetV || 0
      };

      await this.threeJsService.applyTextureToObject(this.modelObject, textureSettings);
    } catch (error) {
      console.error('Error applying texture with settings:', error);
      this.showToast('Error applying texture');
    }
  }

  toggleControlsPanel() {
    this.isPanelVisible = !this.isPanelVisible;
  }

  async loadTextureFromGallery() {
    if (!this.model) return;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (!image.dataUrl) {
        throw new Error('No image data received');
      }

      const loading = await this.loadingCtrl.create({
        message: 'Applying texture...'
      });
      await loading.present();

      try {
        const timestamp = Date.now();
        const texturePath = `textures/${this.model.id}_custom_${timestamp}.jpg`;

        await this.storageService.saveBase64Image(image.dataUrl, texturePath);
        const localTextureUrl = await this.getTextureUrl(texturePath);

        const textureSettings: TextureSettings = {
          textureUrl: localTextureUrl,
          projection: 'box',
          scaleU: 1,
          scaleV: 1,
          offsetU: 0,
          offsetV: 0
        };

        await this.threeJsService.applyTextureToObject(this.modelObject!, textureSettings);

        const updatedModel: ModelInfo = {
          ...this.model,
          texturePath: texturePath,
          textureUrl: localTextureUrl,
          textureProjection: 'box',
          textureOffsetU: 0,
          textureOffsetV: 0,
          textureScaleU: 1,
          textureScaleV: 1
        };

        await this.modelManager.updateModelInfo(updatedModel);
        this.model = updatedModel;

        this.showToast('Custom texture applied successfully');
      } catch (error) {
        console.error('Error applying custom texture:', error);
        this.showToast('Error applying texture');
      } finally {
        loading.dismiss();
      }

    } catch (error) {
      console.error('Error accessing gallery:', error);

      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage.includes('cancelled') || errorMessage.includes('User cancelled')) {
          return;
        }
      }

      this.showToast('Error accessing gallery. Please check permissions.');
    }
  }
async takeTextureFromCamera() {
  if (!this.model) return;

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });

    if (!image.dataUrl) {
      throw new Error('No image data received');
    }

    const loading = await this.loadingCtrl.create({
      message: 'Applying texture...'
    });
    await loading.present();

    try {
      const timestamp = Date.now();
      const texturePath = `textures/${this.model.id}_camera_${timestamp}.jpg`;

      await this.storageService.saveBase64Image(image.dataUrl, texturePath);
      const localTextureUrl = await this.getTextureUrl(texturePath);

      const textureSettings: TextureSettings = {
        textureUrl: localTextureUrl,
        projection: 'box',
        scaleU: 1,
        scaleV: 1,
        offsetU: 0,
        offsetV: 0
      };

      await this.threeJsService.applyTextureToObject(this.modelObject!, textureSettings);

      const updatedModel: ModelInfo = {
        ...this.model,
        texturePath: texturePath,
        textureUrl: localTextureUrl,
        textureProjection: 'box',
        textureOffsetU: 0,
        textureOffsetV: 0,
        textureScaleU: 1,
        textureScaleV: 1
      };

      await this.modelManager.updateModelInfo(updatedModel);
      this.model = updatedModel;

      this.showToast('Camera texture applied successfully');
    } catch (error) {
      console.error('Error applying camera texture:', error);
      this.showToast('Error applying texture');
    } finally {
      loading.dismiss();
    }

  } catch (error) {
    console.error('Error accessing camera:', error);

    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as any).message;
      if (errorMessage.includes('cancelled') || errorMessage.includes('User cancelled')) {
        return; 
      }
    }

    this.showToast('Error accessing camera. Please check permissions.');
  }
}
}