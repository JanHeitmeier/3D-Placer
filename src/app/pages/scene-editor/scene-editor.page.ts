import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol 
} from '@ionic/angular/standalone';
import { ThreeJsService } from '../../core/services/three-js.service';
import { SceneManagerService } from '../../core/services/scene-manager.service';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { Scene } from '../../core/models/scene.model';
import { SceneObject } from '../../core/models/scene-object.model';
import { ModelInfo } from '../../core/models/model-info.model';
import * as THREE from 'three';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-scene-editor',
  templateUrl: './scene-editor.page.html',
  styleUrls: ['./scene-editor.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle, 
    IonContent,
    IonButton,
    IonIcon,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol
  ]
})
export class SceneEditorPage implements OnInit, OnDestroy {
  @ViewChild('threeJsContainer', { static: true }) threeJsContainer!: ElementRef;
  
  scene: Scene | null = null;
  sceneId: string | null = null;
  sceneName: string = 'Scene Editor';
  isPanelCollapsed: boolean = false;
  sceneObjectCount: number = 0;
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private threeJsScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private selectedObject: THREE.Object3D | null = null;
  private outlinePass: any = null;
  private modelSubscription?: Subscription;
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  private modelIdToObject: Map<string, THREE.Object3D> = new Map();
  private objectToSceneObject: Map<THREE.Object3D, SceneObject> = new Map();

  constructor(
    private route: ActivatedRoute,
    private threeJsService: ThreeJsService,
    private sceneManagerService: SceneManagerService,
    private modelManagerService: ModelManagerService
  ) {}

  ngOnInit() {
    this.sceneId = this.route.snapshot.paramMap.get('id');
    
    if (!this.sceneId) {
      // Auto-create a scene or redirect
      this.createDefaultScene();
      return;
    }
    
    this.initThreeJs();
    this.loadScene();
    
    // Subscribe to model updates
    this.modelSubscription = this.modelManagerService.models$.subscribe(() => {
      if (this.scene) {
        this.refreshSceneModels();
      }
    });
  }

  ngOnDestroy() {
    if (this.modelSubscription) {
      this.modelSubscription.unsubscribe();
    }
    // Clean up three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  toggleControlPanel() {
    this.isPanelCollapsed = !this.isPanelCollapsed;
  }

  async saveScene() {
    if (!this.scene) return;
    
    // Update the scene objects from the current state in three.js
    this.updateSceneObjectsFromThreeJs();
    
    // Save the scene
    await this.sceneManagerService.saveScene(this.scene);
    console.log('Scene saved successfully');
  }

  private initThreeJs() {
    const container = this.threeJsContainer.nativeElement;
    this.threeJsService.init(container);
    
    // Store references to three.js objects
    this.threeJsScene = this.threeJsService['scene'];
    this.camera = this.threeJsService['camera'];
    this.renderer = this.threeJsService['renderer'];
    
    // Set background color to make grid more visible
    this.threeJsScene.background = new THREE.Color(0xf0f0f0);
    
    // Add grid helper to the scene with more contrast
    const gridSize = 20;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0xaaaaaa);
    gridHelper.position.y = -0.01; // avoid z-fighting
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.8;
    this.threeJsScene.add(gridHelper);
    
    // Add ambient light to improve visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.threeJsScene.add(ambientLight);
    
    // Add directional light for shadows and better model visibility
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 1, 1);
    this.threeJsScene.add(dirLight);
    
    // Setup event listeners for object selection
    container.addEventListener('click', this.onSceneClick.bind(this));
    
    // Setup window resize handler
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private async loadScene() {
    if (!this.sceneId) {
      console.error('No scene ID provided');
      return;
    }

    try {
      // Load scene data
      this.scene = await this.sceneManagerService.getScene(this.sceneId);
      if (!this.scene) {
        console.error('Scene not found:', this.sceneId);
        return;
      }

      this.sceneName = this.scene.name;
      this.sceneObjectCount = this.scene.objects.length;
      
      // Load and place all models
      await this.loadSceneModels();
      
    } catch (error) {
      console.error('Error loading scene:', error);
    }
  }

  private async loadSceneModels() {
    if (!this.scene) return;
    
    // Clear existing models
    this.clearSceneObjects();
    
    // Load each model in the scene
    for (const sceneObject of this.scene.objects) {
      await this.loadAndPlaceModel(sceneObject);
    }
  }

  private async refreshSceneModels() {
    // This is called when model data changes, to refresh the models in the scene
    if (!this.scene) return;
    
    // Update existing models with current transforms
    this.updateSceneObjectsFromThreeJs();
    
    // Reload all models
    await this.loadSceneModels();
  }

  private clearSceneObjects() {
    // Remove all existing models from the scene
    this.threeJsScene.children
      .filter(obj => obj.type !== 'Camera' && obj.type !== 'Light' && obj.type !== 'GridHelper')
      .forEach(obj => this.threeJsScene.remove(obj));
    
    // Clear our maps
    this.loadedModels.clear();
    this.modelIdToObject.clear();
    this.objectToSceneObject.clear();
  }

  private async loadAndPlaceModel(sceneObject: SceneObject) {
    try {
      // Check if we already have loaded this model
      let modelObject = this.loadedModels.get(sceneObject.modelId);
      
      if (!modelObject) {
        // Load the model if not already loaded
        const modelPath = await this.modelManagerService.getModelPath(sceneObject.modelId);
        if (!modelPath) {
          console.error('Model path not found for:', sceneObject.modelId);
          return;
        }
        
        // Create a loading manager to track progress and completion
        const loadingManager = new THREE.LoadingManager();
        
        // Create a promise that resolves when the model is loaded
        const loadPromise = new Promise<THREE.Object3D>((resolve, reject) => {
          loadingManager.onLoad = () => {
            // Find the newly added object by checking which objects weren't there before
            const newObjects = this.threeJsScene.children.filter(
              obj => obj.type !== 'Camera' && obj.type !== 'Light' && obj.type !== 'GridHelper'
              && !this.objectToSceneObject.has(obj)
            );
            
            if (newObjects.length > 0) {
              modelObject = newObjects[newObjects.length - 1];
              resolve(modelObject);
            } else {
              reject(new Error('Model loaded but not found in scene'));
            }
          };
          
          loadingManager.onError = (url) => {
            reject(new Error(`Failed to load model from ${url}`));
          };
          
        });
        
        // Wait for the model to load
        modelObject = await loadPromise;
        this.loadedModels.set(sceneObject.modelId, modelObject);
      } else {
        // Clone the model if it's already loaded
        modelObject = modelObject.clone();
        this.threeJsScene.add(modelObject);
      }
      
      if (modelObject) {
        // Apply transform from scene object
        modelObject.position.set(
          sceneObject.position.x,
          sceneObject.position.y,
          sceneObject.position.z
        );
        modelObject.rotation.set(
          sceneObject.rotation.x,
          sceneObject.rotation.y,
          sceneObject.rotation.z
        );
        modelObject.scale.set(
          sceneObject.scale.x,
          sceneObject.scale.y,
          sceneObject.scale.z
        );
        
        // Store references for later use
        this.modelIdToObject.set(sceneObject.id, modelObject);
        this.objectToSceneObject.set(modelObject, sceneObject);
      }
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  private updateSceneObjectsFromThreeJs() {
    if (!this.scene) return;
    
    // Update the position, rotation, and scale of each scene object
    // from its corresponding Three.js object
    this.objectToSceneObject.forEach((sceneObject, threeObject) => {
      sceneObject.position = {
        x: threeObject.position.x,
        y: threeObject.position.y,
        z: threeObject.position.z
      };
      sceneObject.rotation = {
        x: threeObject.rotation.x,
        y: threeObject.rotation.y,
        z: threeObject.rotation.z
      };
      sceneObject.scale = {
        x: threeObject.scale.x,
        y: threeObject.scale.y,
        z: threeObject.scale.z
      };
    });
  }

  private onSceneClick(event: MouseEvent) {
    // Calculate mouse position in normalized device coordinates
    const rect = this.threeJsContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update the picking ray
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.threeJsScene.children, true);
    
    // Reset previous selection
    if (this.selectedObject) {
      this.removeOutline(this.selectedObject);
      this.selectedObject = null;
    }
    
    if (intersects.length > 0) {
      // Find the first object that has a corresponding scene object
      for (const intersect of intersects) {
        let obj = intersect.object;
        // Navigate up the hierarchy to find the parent object we care about
        while (obj && !this.objectToSceneObject.has(obj) && obj.parent) {
          obj = obj.parent;
        }
        
        if (obj && this.objectToSceneObject.has(obj)) {
          this.selectedObject = obj;
          this.addOutline(obj);
          break;
        }
      }
    }
  }

  private addOutline(object: THREE.Object3D) {
    // For a simple approach, we're just adding a class/material change
    // A more robust approach would use an EffectComposer with an OutlinePass
    if (object instanceof THREE.Mesh) {
      const originalMaterial = object.material;
      if (Array.isArray(originalMaterial)) {
        // Handle multi-material objects
        object.material = originalMaterial.map(mat => {
          const newMat = mat.clone();
          (newMat as any).originalMaterial = mat;
          newMat.emissive = new THREE.Color(0x0000ff);
          newMat.emissiveIntensity = 0.3;
          return newMat;
        });
      } else {
        // Handle single material objects
        const newMaterial = originalMaterial.clone();
        (newMaterial as any).originalMaterial = originalMaterial;
        newMaterial.emissive = new THREE.Color(0x0000ff);
        newMaterial.emissiveIntensity = 0.3;
        object.material = newMaterial;
      }
    }
    
    // Recursively apply to children
    object.children.forEach(child => this.addOutline(child));
  }

  private removeOutline(object: THREE.Object3D) {
    // Restore original materials
    if (object instanceof THREE.Mesh) {
      if (Array.isArray(object.material)) {
        // Handle multi-material objects
        object.material = object.material.map(mat => {
          return (mat as any).originalMaterial || mat;
        });
      } else if ((object.material as any).originalMaterial) {
        // Handle single material objects
        object.material = (object.material as any).originalMaterial;
      }
    }
    
    // Recursively apply to children
    object.children.forEach(child => this.removeOutline(child));
  }

  private onWindowResize() {
    if (!this.camera || !this.renderer || !this.threeJsContainer) return;
    
    const width = this.threeJsContainer.nativeElement.clientWidth;
    const height = this.threeJsContainer.nativeElement.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  async createDefaultScene() {
    try {
      const newScene = await this.sceneManagerService.createNewScene('New Scene');
      this.sceneId = newScene.id;
      // Now continue with initialization
      this.initThreeJs();
      this.loadScene();
    } catch (error) {
      console.error('Failed to create default scene', error);
      // Handle error (maybe navigate back)
    }
  }
}
