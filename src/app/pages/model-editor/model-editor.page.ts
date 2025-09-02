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
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; // Add this import
import * as THREE from 'three';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { StorageService } from '../../core/services/storage.service';
import { ModelInfo } from '../../core/models/model-info.model';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreeJsService } from '../../core/services/three-js.service';

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
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private modelObject: THREE.Object3D | null = null;
  private animationFrameId: number | null = null;
  private originalCameraPosition: THREE.Vector3 | null = null;
  private originalControlsTarget: THREE.Vector3 | null = null;

  // Add this property
  isPanelVisible = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modelManager: ModelManagerService,
    private storageService: StorageService,
    private zone: NgZone,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private threeJsService: ThreeJsService // Add this line
  ) {

  }

  async ngOnInit() {
    const modelId = this.route.snapshot.paramMap.get('id');

    if (modelId) {
      await this.loadModel(modelId);
    } else {
      // Try to load last opened model
      const lastModelId = localStorage.getItem('lastOpenedModelId');
      if (lastModelId) {
        await this.loadModel(lastModelId);
      }
    }

    this.setupThreeJs();
  }

  ngOnDestroy() {
    // Use the service's dispose method to clean up
    this.threeJsService.dispose();

    // No need for all the manual cleanup code that was here before
  }

  private disposeScene(scene: THREE.Scene) {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }

  private async loadModel(modelId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Loading model...'
    });
    await loading.present();

    try {
      // Get model info
      const modelInfo = await this.modelManager.getModelInfo(modelId);
      if (!modelInfo) {
        throw new Error('Model not found');
      }

      this.model = modelInfo;
      localStorage.setItem('lastOpenedModelId', modelId);

      // Load model into Three.js scene if scene is ready
      if (this.scene) {
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
    // Get the container
    const container = this.rendererContainer.nativeElement;

    // Initialize ThreeJS with our preferred options
    this.threeJsService.init(container, {
      backgroundColor: 0xf0f0f0,
      gridSize: 10,
      gridDivisions: 10,
      gridColor1: 0x888888,
      gridColor2: 0xcccccc,
      addBottomLight: true,
      cameraPosition: new THREE.Vector3(0, 2, 5)
    });

    // Store references to important objects
    this.scene = this.threeJsService.scene;
    this.camera = this.threeJsService.camera;
    this.renderer = this.threeJsService.renderer;
    this.controls = this.threeJsService.controls;

    // Load the model if available
    if (this.model) {
      this.loadModelIntoScene();
    }

    // Start animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private animate() {
    // Run the animation loop outside Angular's change detection
    this.zone.runOutsideAngular(() => {
      const animateLoop = () => {
        this.animationFrameId = requestAnimationFrame(animateLoop);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
      };

      animateLoop();
    });
  }

  private onWindowResize() {
    const container = this.rendererContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private async loadModelIntoScene() {
    if (!this.model) return;

    try {
      if (this.modelObject) {
        this.scene.remove(this.modelObject);
        this.modelObject = null;
      }

      const modelUrl = await this.modelManager.getModelPath(this.model.id);
      if (!modelUrl) {
        throw new Error('Could not get model URL');
      }

      const object = await this.loadModelObject(modelUrl);
      if (!object) {
        throw new Error('Failed to load 3D model');
      }

      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.position.y = 0;

      this.scene.add(object);
      this.modelObject = object;
      this.threeJsService.fitCameraToObject(object);

      this.originalCameraPosition = this.camera.position.clone();
      this.originalControlsTarget = this.controls.target.clone();

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

  private async loadModelObject(modelUrl: string): Promise<THREE.Object3D> {
    try {
      return await this.threeJsService.loadObjectToScene(modelUrl, this.scene);
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  private fitCameraToObject(object: THREE.Object3D, offset: number = 1.5) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= offset;

    this.camera.position.set(center.x, center.y + maxDim / 3, center.z + cameraZ);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(center);
    this.controls.update();
  }


  resetView() {
    if (this.originalCameraPosition && this.originalControlsTarget && this.modelObject) {
      this.camera.position.copy(this.originalCameraPosition);
      this.controls.target.copy(this.originalControlsTarget);
      this.controls.update();
      this.showToast('View reset');
    } else if (this.modelObject) {
      this.fitCameraToObject(this.modelObject);
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

        // Create an offscreen renderer and scene (won't affect the UI)
        const thumbnailSize = 512; // Consistent size for thumbnails
        const offscreenRenderer = new THREE.WebGLRenderer({
          antialias: true,
          preserveDrawingBuffer: true
        });
        offscreenRenderer.setSize(thumbnailSize, thumbnailSize);
        offscreenRenderer.setClearColor(0xf0f0f0); // Match the main scene background

        // Create a new scene for the thumbnail
        const thumbnailScene = new THREE.Scene();
        thumbnailScene.background = new THREE.Color(0xf0f0f0);

        // Add the same lighting as the main scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        thumbnailScene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.copy(this.scene.getObjectByName('DirectionalLight')?.position || new THREE.Vector3(1, 1, 1));
        thumbnailScene.add(directionalLight);

        // Clone the model
        const modelClone = this.modelObject.clone();
        thumbnailScene.add(modelClone);

        // Create a new camera with the same properties as the main camera
        const thumbnailCamera = this.camera.clone();
        thumbnailCamera.aspect = 1.0; // Square aspect ratio
        thumbnailCamera.updateProjectionMatrix();

        // Render the thumbnail
        offscreenRenderer.render(thumbnailScene, thumbnailCamera);

        // Get the image data
        const dataUrl = offscreenRenderer.domElement.toDataURL('image/png');

        // Clean up resources
        offscreenRenderer.dispose();

        try {
          await this.modelManager.saveThumbnail(this.model.id, dataUrl);

          // Update the local model reference with the latest data including the new thumbnail URL
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

  // Add the missing showToast method
  private async showToast(message: string, duration: number = 2000): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: duration,
      position: 'bottom'
    });

    return toast.present();
  }

  // Add to model-editor.page.ts
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
      // Get random image from asset service
      const textureUrl = this.modelManager.getRandomImageUrl(size, size);
      const texturePath = `textures/${this.model.id}_texture.jpg`;

      // Download and save the image
      await this.storageService.downloadAndSaveImage(textureUrl, texturePath);

      // Get the local URL for the saved image
      const localTextureUrl = await this.getTextureUrl(texturePath);

      // Apply the texture
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(localTextureUrl, resolve, undefined, reject);
      });

      // Apply texture settings
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);

      // Create a new material with the texture
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.7,
        metalness: 0.2
      });

      // Apply the material to all meshes
      this.modelObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Save original material for resetting if needed
          if (!child.userData['originalMaterial']) {
            child.userData['originalMaterial'] = child.material;
          }

          // Apply the new material
          child.material = material;
        }
      });

      // Update the model info
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

      // Save the updated model info
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

  private applyBoxProjection(texture: THREE.Texture) {
    if (!this.modelObject) return;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.2
    });

    this.modelObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData['originalMaterial']) {
          child.userData['originalMaterial'] = child.material;
        }
        child.material = material;
      }
    });
  }

  private applyCylinderProjection(texture: THREE.Texture) {
    if (!this.modelObject) return;

    // Calculate bounding box for the model
    const box = new THREE.Box3().setFromObject(this.modelObject);
    const center = box.getCenter(new THREE.Vector3());

    // Create a custom shader material for cylindrical mapping KI
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        modelCenter: { value: center },
        offsetU: { value: this.model?.textureOffsetU || 0 },
        offsetV: { value: this.model?.textureOffsetV || 0 },
        scaleU: { value: this.model?.textureScaleU || 1 },
        scaleV: { value: this.model?.textureScaleV || 1 }
      },
      vertexShader: `
      varying vec2 vUv;
      uniform vec3 modelCenter;
      uniform float offsetU;
      uniform float offsetV;
      uniform float scaleU;
      uniform float scaleV;
      void main() {
        // Cylindrical UV mapping
        vec3 localPos = position - modelCenter;
        float theta = atan(localPos.x, localPos.z);
        float u = 0.5 + theta / (2.0 * 3.14159);
        float v = 0.5 + localPos.y / 2.0;
        // Apply offset and scale
        vUv = vec2(u * scaleU + offsetU, v * scaleV + offsetV);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D map;
      void main() {
        gl_FragColor = texture2D(map, vUv);
      }
    `
    });

    this.modelObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData['originalMaterial']) {
          child.userData['originalMaterial'] = child.material;
        }
        child.material = material;
      }
    });
  }

  private applyPlanarProjection(texture: THREE.Texture) {
    if (!this.modelObject) return;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.2
    });

    this.modelObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData['originalMaterial']) {
          child.userData['originalMaterial'] = child.material;
        }
        child.material = material;
      }
    });
  }

  // Helper method to get texture URL from path
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

  // Add these methods to ModelEditorPage

  async changeTextureProjection(projection: 'box' | 'cylinder') {
    if (!this.model?.textureUrl || !this.modelObject) return;

    try {
      // Update the model with the new projection
      const updatedModel = {
        ...this.model,
        textureProjection: projection
      };

      await this.modelManager.updateModelInfo(updatedModel);
      this.model = updatedModel;

      // Re-apply the texture with the new projection
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
      // Update the model with new settings
      const updatedModel = {
        ...this.model,
        textureOffsetU: this.model.textureOffsetU,
        textureOffsetV: this.model.textureOffsetV,
        textureScaleU: this.model.textureScaleU,
        textureScaleV: this.model.textureScaleV
      };

      await this.modelManager.updateModelInfo(updatedModel);

      // Re-apply the texture with new settings
      await this.applyTextureWithSettings();
    } catch (error) {
      console.error('Error updating texture settings:', error);
    }
  }

  private async applyTextureWithSettings() {
    if (!this.model?.textureUrl || !this.modelObject) return;

    // Load the texture
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(this.model!.textureUrl!, resolve, undefined, reject);
    });

    // Apply settings
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.model.textureScaleU || 1, this.model.textureScaleV || 1);
    texture.offset.set(this.model.textureOffsetU || 0, this.model.textureOffsetV || 0);

    // Apply based on projection type
    if (this.model.textureProjection === 'cylinder') {
      this.applyCylinderProjection(texture);
    } else {
      // Default to box projection
      this.applyBoxProjection(texture);
    }
  }

  // Add this method to your ModelEditorPage class

  toggleControlsPanel() {
    this.isPanelVisible = !this.isPanelVisible;
  }

  // Add this method to your ModelEditorPage class
  async loadTextureFromGallery() {
    if (!this.model) return;

    try {
      // Request permission and open gallery
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos // This opens the gallery
      });

      if (!image.dataUrl) {
        throw new Error('No image data received');
      }

      const loading = await this.loadingCtrl.create({
        message: 'Applying texture...'
      });
      await loading.present();

      try {
        // Create a unique filename for the texture
        const timestamp = Date.now();
        const texturePath = `textures/${this.model.id}_custom_${timestamp}.jpg`;

        // Save the image to local storage
        await this.storageService.saveBase64Image(image.dataUrl, texturePath);

        // Get the local URL for the saved image
        const localTextureUrl = await this.getTextureUrl(texturePath);

        // Apply the texture
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(localTextureUrl, resolve, undefined, reject);
        });

        // Apply texture settings
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);

        // Create a new material with the texture
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.7,
          metalness: 0.2
        });

        this.modelObject!.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (!child.userData['originalMaterial']) {
              child.userData['originalMaterial'] = child.material;
            }

      
            child.material = material;
          }
        });

  
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
          // User cancelled the selection, don't show error
          return;
        }
      }

      this.showToast('Error accessing gallery. Please check permissions.');
    }
  }
}