import { Component, OnInit, ElementRef, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ModelInfo } from '../../core/models/model-info.model';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, 
  IonText, IonLabel, IonButton, LoadingController, ToastController, IonIcon } from '@ionic/angular/standalone';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addIcons } from 'ionicons';
import { cameraOutline, refreshOutline, colorPaletteOutline } from 'ionicons/icons';

@Component({
  selector: 'app-model-editor',
  templateUrl: './model-editor.page.html',
  styleUrls: ['./model-editor.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
    IonContent, IonText, IonLabel, IonButton, IonIcon]
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
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modelManager: ModelManagerService,
    private zone: NgZone,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    // Add icons for the buttons
    addIcons({ cameraOutline, refreshOutline, colorPaletteOutline });
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
    // Clean up Three.js resources
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    // Clear the scene
    if (this.scene) {
      this.disposeScene(this.scene);
    }
    
    // Remove resize listener
    window.removeEventListener('resize', this.onWindowResize.bind(this));
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
    // Get the container dimensions
    const container = this.rendererContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);
    
    // Add grid helper (always shown)
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
    gridHelper.position.y = -0.01; // Slightly below the object to avoid z-fighting
    this.scene.add(gridHelper);
    
    // Add camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Add a soft light from the bottom for better visualization
    const bottomLight = new THREE.DirectionalLight(0xffffcc, 0.3);
    bottomLight.position.set(0, -1, 0);
    this.scene.add(bottomLight);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    
    // Add orbit controls with better defaults for viewing
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.rotateSpeed = 0.9;
    this.controls.panSpeed = 0.9;
    this.controls.zoomSpeed = 1.2;
    
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
      // Remove previous model if exists
      if (this.modelObject) {
        this.scene.remove(this.modelObject);
        this.modelObject = null;
      }
      
      // Get model URL
      const modelUrl = await this.modelManager.getModelPath(this.model.id);
      if (!modelUrl) {
        throw new Error('Could not get model URL');
      }
      
      // Load model using the service's loadModel functionality
      const object = await this.loadModelObject(modelUrl);
      if (!object) {
        throw new Error('Failed to load 3D model');
      }
      
      // Center the model
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.position.y = 0; // Place on the grid
      
      // Add to scene
      this.scene.add(object);
      this.modelObject = object;
      
      // Adjust camera to fit model
      this.fitCameraToObject(object);
      
      // Save original camera position and target for reset functionality
      this.originalCameraPosition = this.camera.position.clone();
      this.originalControlsTarget = this.controls.target.clone();
    } catch (error) {
      console.error('Error loading model into scene:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast('Error loading model: ' + errorMsg);
    }
  }
  
  private async loadModelObject(modelUrl: string): Promise<THREE.Object3D> {
    return new Promise<THREE.Object3D>(async (resolve, reject) => {
      try {
        const extension = this.model?.name.split('.').pop()?.toLowerCase() || '';
        
        if (extension === 'glb' || extension === 'gltf') {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
          const loader = new GLTFLoader();
          loader.load(modelUrl, (gltf) => resolve(gltf.scene), undefined, reject);
        } else if (extension === 'obj') {
          const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
          const loader = new OBJLoader();
          loader.load(modelUrl, resolve, undefined, reject);
        } else if (extension === 'fbx') {
          const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
          const loader = new FBXLoader();
          loader.load(modelUrl, resolve, undefined, reject);
        } else if (extension === 'dae') {
          const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
          const loader = new ColladaLoader();
          loader.load(modelUrl, (collada) => resolve(collada.scene), undefined, reject);
        } else {
          reject(new Error('Unsupported file format'));
        }
      } catch (error) {
        reject(error);
      }
    });
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
  
  applyRandomTexture() {
    this.showTextureOptions = true;
  }
  
  async applyTexture(size: number) {
    if (!this.modelObject) return;
    
    const loading = await this.loadingCtrl.create({
      message: 'Applying texture...'
    });
    await loading.present();
    
    try {

      const textureUrl = `https://picsum.photos/${size}`;
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(textureUrl, resolve, undefined, reject);
      });

      this.modelObject.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat instanceof THREE.MeshStandardMaterial || 
                  mat instanceof THREE.MeshLambertMaterial ||
                  mat instanceof THREE.MeshPhongMaterial) {
                mat.map = texture;
                mat.needsUpdate = true;
              }
            });
          } else if (child.material instanceof THREE.MeshStandardMaterial || 
                     child.material instanceof THREE.MeshLambertMaterial ||
                     child.material instanceof THREE.MeshPhongMaterial) {
            child.material.map = texture;
            child.material.needsUpdate = true;
          }
        }
      });
      
      this.showToast('Texture applied successfully');
      this.showTextureOptions = false;
    } catch (error) {
      console.error('Error applying texture:', error);
      this.showToast('Error applying texture');
    } finally {
      loading.dismiss();
    }
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
        const currentPosition = this.camera.position.clone();
        const currentTarget = this.controls.target.clone();
        
        this.renderer.render(this.scene, this.camera);
        
        const dataUrl = this.renderer.domElement.toDataURL('image/png');
        
        await this.modelManager.saveThumbnail(this.model.id, dataUrl);
        
        this.showToast('Thumbnail saved successfully');
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      this.showToast('Error generating thumbnail');
    } finally {
      loading.dismiss();
    }
  }
  
  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
  
  save() {
    // Save any model specific settings here
    this.showToast('Model settings saved');
  }
  
  deleteModel() {

    this.modelManager.deleteModel(this.model?.id || '').then(() => {
      this.showToast('Model deleted');
      this.router.navigate(['/model-library']);
    }).catch(error => {
      console.error('Error deleting model:', error);
      this.showToast('Error deleting model');
    });
  }
}
