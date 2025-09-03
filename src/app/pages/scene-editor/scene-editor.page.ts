import { Component, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonFab,
  IonFabButton,
  IonInput,
  IonAlert,
  ModalController
} from '@ionic/angular/standalone';
import { ThreeJsService, TextureSettings } from '../../core/services/three-js.service';
import { SceneManagerService } from '../../core/services/scene-manager.service';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { Scene } from '../../core/models/scene.model';
import { SceneObject } from '../../core/models/scene-object.model';
import { ModelInfo } from '../../core/models/model-info.model';
import * as THREE from 'three';
import { Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ModelSelectorComponent } from '../../shared/components/model-selector/model-selector.component';
import { addIcons } from 'ionicons';
import { add, chevronDownOutline, chevronUpOutline, saveOutline, sunnyOutline, moonOutline, partlySunnyOutline, trashOutline, moveOutline, resizeOutline, refreshOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

export type LightingPreset = 'high-noon' | 'twilight' | 'night';

@Component({
  selector: 'app-scene-editor',
  templateUrl: './scene-editor.page.html',
  styleUrls: ['./scene-editor.page.scss'],
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
    IonButton,
    IonIcon,
    IonLabel,
    IonFab,
    IonFabButton,
    IonInput,
    IonAlert
  ]
})
export class SceneEditorPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('threeJsContainer', { static: false }) threeJsContainer!: ElementRef;
  
  scene: Scene | null = null;
  sceneId: string | null = null;
  sceneName: string = 'Scene Editor';
  isPanelCollapsed: boolean = false;
  sceneObjectCount: number = 0;
  currentLighting: LightingPreset = 'high-noon';
  private isThreeJsInitialized = false;
  
  // Transform controls
  selectedObjectName: string = 'None';
  showDeleteAlert: boolean = false;
  transformPosition = { x: 0, y: 0, z: 0 };
  transformRotation = { x: 0, y: 0, z: 0 };
  transformScale = { x: 1, y: 1, z: 1 };
  
  // Alert button configuration
  deleteAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => { 
        this.showDeleteAlert = false; 
      }
    },
    {
      text: 'Delete',
      role: 'confirm',
      handler: () => { 
        this.deleteSelectedObject(); 
      }
    }
  ];
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private threeJsScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  public selectedObject: THREE.Object3D | null = null;
  private modelSubscription?: Subscription;
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  private modelIdToObject: Map<string, THREE.Object3D> = new Map();
  private objectToSceneObject: Map<THREE.Object3D, SceneObject> = new Map();

  // Lighting objects
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private bottomLight!: THREE.DirectionalLight;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private threeJsService: ThreeJsService,
    private sceneManagerService: SceneManagerService,
    private modelManagerService: ModelManagerService,
    private modalController: ModalController
  ) {
    addIcons({ add, chevronDownOutline, chevronUpOutline, saveOutline, sunnyOutline, moonOutline, partlySunnyOutline, trashOutline, moveOutline, resizeOutline, refreshOutline });
  }

  async ngOnInit() {
    this.sceneId = this.route.snapshot.paramMap.get('id');
    
    // If no scene ID is provided, try to load the last opened scene
    if (!this.sceneId) {
      const lastOpenedSceneId = await this.sceneManagerService.getLastOpenedScene();
      if (lastOpenedSceneId) {
        // Navigate to the last opened scene
        this.router.navigate(['/scene-editor', lastOpenedSceneId]);
        return;
      }
      // If no last opened scene, we'll create a new one in ngAfterViewInit
    }
    
    this.modelSubscription = this.modelManagerService.models$.subscribe(() => {
      if (this.scene) {
        this.refreshSceneModels();
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initThreeJs();
      
      if (this.sceneId) {
        this.loadScene();
      } else {
        this.createDefaultScene();
      }
    }, 100);
  }

  ngOnDestroy() {
    if (this.modelSubscription) {
      this.modelSubscription.unsubscribe();
    }
    
    this.threeJsService.dispose();
  }

  toggleControlPanel() {
    this.isPanelCollapsed = !this.isPanelCollapsed;
  }

  async saveScene() {
    if (!this.scene) return;
    
    this.updateSceneObjectsFromThreeJs();
    
    await this.sceneManagerService.saveScene(this.scene);
    console.log('Scene saved successfully');
  }

  setLighting(preset: LightingPreset) {
    this.currentLighting = preset;
    this.applyLightingPreset(preset);
  }

  private applyLightingPreset(preset: LightingPreset) {
    if (!this.threeJsScene || !this.ambientLight || !this.directionalLight) return;

    switch (preset) {
      case 'high-noon':
        this.applyHighNoonLighting();
        break;
      case 'twilight':
        this.applyTwilightLighting();
        break;
      case 'night':
        this.applyNightLighting();
        break;
    }
  }

  private applyHighNoonLighting() {
    this.threeJsScene.background = new THREE.Color(0x87CEEB);
    
    this.ambientLight.color.setHex(0xffffff);
    this.ambientLight.intensity = 0.8;
    
    this.directionalLight.color.setHex(0xffffff);
    this.directionalLight.intensity = 1.2;
    this.directionalLight.position.set(0, 10, 2);
    
    if (this.bottomLight) {
      this.bottomLight.color.setHex(0xffffff);
      this.bottomLight.intensity = 0.2;
    }
  }

  private applyTwilightLighting() {
    this.threeJsScene.background = new THREE.Color(0xFF6B35);
    
    this.ambientLight.color.setHex(0xFFB366);
    this.ambientLight.intensity = 0.4;
    
    this.directionalLight.color.setHex(0xFF8C42);
    this.directionalLight.intensity = 0.8;
    this.directionalLight.position.set(8, 2, 8);
    
    if (this.bottomLight) {
      this.bottomLight.color.setHex(0x6B73FF);
      this.bottomLight.intensity = 0.3;
    }
  }

  private applyNightLighting() {
    this.threeJsScene.background = new THREE.Color(0x0D1B2A);
    
    this.ambientLight.color.setHex(0x4A90E2);
    this.ambientLight.intensity = 0.2;
    
    this.directionalLight.color.setHex(0xB0C4DE);
    this.directionalLight.intensity = 0.6;
    this.directionalLight.position.set(-3, 8, 5);
    
    if (this.bottomLight) {
      this.bottomLight.color.setHex(0x2E4057);
      this.bottomLight.intensity = 0.1;
    }
  }

  private initThreeJs() {
    if (!this.threeJsContainer) {
      console.error('ThreeJS container not found');
      return;
    }

    const container = this.threeJsContainer.nativeElement;
    
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.warn('Container has zero dimensions, forcing size');
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minHeight = '400px';
      
      setTimeout(() => {
        this.initThreeJsRenderer();
      }, 50);
    } else {
      this.initThreeJsRenderer();
    }
  }

  private initThreeJsRenderer() {
    const container = this.threeJsContainer.nativeElement;
    
    console.log('Initializing Three.js with container dimensions:', 
      container.clientWidth, 'x', container.clientHeight);
    
    try {
      this.threeJsService.init(container, {
        backgroundColor: 0x87CEEB,
        gridSize: 20,
        gridDivisions: 20,
        gridColor1: 0x444444,
        gridColor2: 0xaaaaaa,
        ambientLightIntensity: 0.8,
        directionalLightIntensity: 1.2,
        addBottomLight: true
      });
      
      this.threeJsScene = this.threeJsService.scene;
      this.camera = this.threeJsService.camera;
      this.renderer = this.threeJsService.renderer;
      
      // Get references to lights with better identification
      this.threeJsScene.children.forEach(child => {
        if (child instanceof THREE.AmbientLight) {
          this.ambientLight = child;
        } else if (child instanceof THREE.DirectionalLight) {
          if (child.name === 'DirectionalLight' || (!this.directionalLight && !child.name.includes('Bottom'))) {
            this.directionalLight = child;
          } else if (child.name === 'BottomLight' || child.position.y < 0) {
            this.bottomLight = child;
          }
        }
      });
      
      // Create lights if they weren't found
      if (!this.ambientLight) {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.threeJsScene.add(this.ambientLight);
      }
      
      if (!this.directionalLight) {
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.directionalLight.position.set(0, 10, 2);
        this.directionalLight.name = 'DirectionalLight';
        this.threeJsScene.add(this.directionalLight);
      }
      
      if (!this.bottomLight) {
        this.bottomLight = new THREE.DirectionalLight(0xffffff, 0.2);
        this.bottomLight.position.set(0, -1, 0);
        this.bottomLight.name = 'BottomLight';
        this.threeJsScene.add(this.bottomLight);
      }
      
      // Apply default lighting
      this.applyLightingPreset(this.currentLighting);
      
      // Add axis lines as gizmos (not saved with scene)
      this.addAxisGizmos();
      
      container.addEventListener('click', this.onSceneClick.bind(this));
      window.addEventListener('resize', this.onWindowResize.bind(this));
      
      this.isThreeJsInitialized = true;
      console.log('Three.js initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Three.js:', error);
    }
  }

  /**
   * Add axis lines as visual gizmos (not saved with the scene)
   */
  private addAxisGizmos(): void {
    if (!this.threeJsScene) return;

    // Add axis lines (20 units in each direction, 40 units total length each)
    const axisLength = 20;
    
    // X-axis (Red)
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    xAxisLine.name = 'XAxis_Gizmo';
    xAxisLine.userData['isGizmo'] = true; // Mark as gizmo so it's not saved
    this.threeJsScene.add(xAxisLine);

    // Y-axis (Green)
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    yAxisLine.name = 'YAxis_Gizmo';
    yAxisLine.userData['isGizmo'] = true; // Mark as gizmo so it's not saved
    this.threeJsScene.add(yAxisLine);

    // Z-axis (Blue)
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxisLine.name = 'ZAxis_Gizmo';
    zAxisLine.userData['isGizmo'] = true; // Mark as gizmo so it's not saved
    this.threeJsScene.add(zAxisLine);

    console.log('Axis gizmos added to scene');
  }

  private async loadScene() {
    if (!this.sceneId) {
      console.error('No scene ID provided');
      return;
    }

    try {
      this.scene = await this.sceneManagerService.getScene(this.sceneId);
      if (!this.scene) {
        console.error('Scene not found:', this.sceneId);
        return;
      }

      this.sceneName = this.scene.name;
      this.sceneObjectCount = this.scene.objects.length;
      
      // Set this as the last opened scene
      await this.sceneManagerService.setLastOpenedScene(this.sceneId);
      
      await this.loadSceneModels();
      
    } catch (error) {
      console.error('Error loading scene:', error);
    }
  }

  private async loadSceneModels() {
    if (!this.scene) return;
    
    this.clearSceneObjects();
    
    for (const sceneObject of this.scene.objects) {
      await this.loadAndPlaceModel(sceneObject);
    }
  }

  private async refreshSceneModels() {
    if (!this.scene) return;
    
    this.updateSceneObjectsFromThreeJs();
    
    await this.loadSceneModels();
  }

  private clearSceneObjects() {
    this.threeJsScene.children
      .filter(obj => 
        obj.type !== 'Camera' && 
        obj.type !== 'Light' && 
        obj.type !== 'GridHelper' &&
        !obj.userData['isGizmo'] // Don't remove gizmos
      )
      .forEach(obj => this.threeJsScene.remove(obj));
    
    this.loadedModels.clear();
    this.modelIdToObject.clear();
    this.objectToSceneObject.clear();
  }

  private async applyModelTexture(modelObject: THREE.Object3D, sceneObject: SceneObject): Promise<void> {
    try {
      // Get the model info to check for texture
      const modelInfo = await this.modelManagerService.getModelInfo(sceneObject.modelId);
      
      if (!modelInfo?.textureUrl) {
        console.log('No texture found for model:', modelInfo?.name || sceneObject.modelId);
        return; // No texture to apply
      }

      console.log('Applying texture to model in scene:', modelInfo.name, 'Texture URL:', modelInfo.textureUrl);

      // Verify texture URL is accessible
      try {
        const response = await fetch(modelInfo.textureUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.error('Texture file not accessible:', modelInfo.textureUrl, response.status);
          return;
        }
      } catch (fetchError) {
        console.error('Error accessing texture file:', modelInfo.textureUrl, fetchError);
        return;
      }

      const textureSettings: TextureSettings = {
        textureUrl: modelInfo.textureUrl,
        projection: modelInfo.textureProjection || 'box',
        scaleU: modelInfo.textureScaleU || 1,
        scaleV: modelInfo.textureScaleV || 1,
        offsetU: modelInfo.textureOffsetU || 0,
        offsetV: modelInfo.textureOffsetV || 0
      };

      await this.threeJsService.applyTextureToObject(modelObject, textureSettings);
      
      console.log('Texture applied successfully to model in scene');
    } catch (error) {
      console.error('Error applying texture to model in scene:', error);
    }
  }

  private async loadAndPlaceModel(sceneObject: SceneObject) {
    try {
      const modelPath = await this.modelManagerService.getModelPath(sceneObject.modelId);
      if (!modelPath) {
        console.error('Model path not found for:', sceneObject.modelId);
        return;
      }
      
      const modelObject = await this.threeJsService.loadObjectToScene(modelPath, this.threeJsScene);
      
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
      
      // Apply texture if the model has one
      await this.applyModelTexture(modelObject, sceneObject);
      
      // Store references - don't clone as it might lose materials/textures
      this.loadedModels.set(sceneObject.modelId, modelObject);
      this.modelIdToObject.set(sceneObject.id, modelObject);
      this.objectToSceneObject.set(modelObject, sceneObject);
      
      return modelObject;
    } catch (error) {
      console.error('Error loading model:', error);
      return null;
    }
  }

  private updateSceneObjectsFromThreeJs() {
    if (!this.scene) return;
    
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
    const rect = this.threeJsContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = this.raycaster.intersectObjects(this.threeJsScene.children, true);
    
    if (this.selectedObject) {
      this.removeOutline(this.selectedObject);
      this.selectedObject = null;
    }
    
    if (intersects.length > 0) {
      for (const intersect of intersects) {
        let obj = intersect.object;
        while (obj && !this.objectToSceneObject.has(obj) && obj.parent) {
          obj = obj.parent;
        }
        
        if (obj && this.objectToSceneObject.has(obj)) {
          this.selectedObject = obj;
          this.addOutline(obj);
          this.updateTransformsFromSelectedObject();
          break;
        }
      }
    } else {
      // No object selected, update transforms to show "None"
      this.updateTransformsFromSelectedObject();
    }
  }

  private addOutline(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) {
      const originalMaterial = object.material;
      if (Array.isArray(originalMaterial)) {
        object.material = originalMaterial.map(mat => {
          const newMat = mat.clone();
          (newMat as any).originalMaterial = mat;
          newMat.emissive = new THREE.Color(0x444444);
          newMat.emissiveIntensity = 0.2;
          return newMat;
        });
      } else {
        const newMaterial = originalMaterial.clone();
        (newMaterial as any).originalMaterial = originalMaterial;
        newMaterial.emissive = new THREE.Color(0x444444);
        newMaterial.emissiveIntensity = 0.2;
        object.material = newMaterial;
      }
    }
    
    object.children.forEach(child => this.addOutline(child));
  }

  private removeOutline(object: THREE.Object3D) {
    if (object instanceof THREE.Mesh) {
      if (Array.isArray(object.material)) {
        object.material = object.material.map(mat => {
          return (mat as any).originalMaterial || mat;
        });
      } else if ((object.material as any).originalMaterial) {
        object.material = (object.material as any).originalMaterial;
      }
    }
    
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
      this.scene = newScene;
      this.sceneId = newScene.id;
      this.sceneName = newScene.name;
      this.sceneObjectCount = 0;
      
      // Set this as the last opened scene
      await this.sceneManagerService.setLastOpenedScene(newScene.id);
    } catch (error) {
      console.error('Failed to create default scene', error);
    }
  }

  async showAddModelModal() {
    const models = await firstValueFrom(this.modelManagerService.models$);
    
    if (!models || models.length === 0) {
      console.log('No models available. Please add models first.');
      return;
    }
    
    const modal = await this.modalController.create({
      component: ModelSelectorComponent,
      componentProps: {
        models: models
      }
    });
    
    await modal.present();
    
    const { data, role } = await modal.onDidDismiss();
    
    if (role === 'select' && data) {
      await this.addModelToScene(data);
    }
  }
  
  async addModelToScene(model: ModelInfo) {
    if (!this.scene) return;
    
    const sceneObject: SceneObject = {
      id: uuidv4(),
      modelId: model.id,
      name: model.name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    };
    
    this.scene.objects.push(sceneObject);
    this.sceneObjectCount = this.scene.objects.length;
    
    const modelObject = await this.loadAndPlaceModel(sceneObject);
    
    // Texture is already applied in loadAndPlaceModel
    
    await this.saveScene();
  }

  // Transform control methods
  adjustTransform(type: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', delta: number): void {
    if (!this.selectedObject) return;

    if (type === 'position') {
      this.transformPosition[axis] = Math.round((this.transformPosition[axis] + delta) * 100) / 100;
      this.selectedObject.position[axis] = this.transformPosition[axis];
    } else if (type === 'rotation') {
      this.transformRotation[axis] = Math.round((this.transformRotation[axis] + delta) % 360);
      this.selectedObject.rotation[axis] = THREE.MathUtils.degToRad(this.transformRotation[axis]);
    } else if (type === 'scale') {
      this.transformScale[axis] = Math.max(0.1, Math.round((this.transformScale[axis] + delta) * 100) / 100);
      this.selectedObject.scale[axis] = this.transformScale[axis];
    }

    this.updateSceneObjectFromTransforms();
  }

  onTransformInputChange(type: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', event: any): void {
    if (!this.selectedObject) return;

    const value = parseFloat(event.detail.value) || 0;

    if (type === 'position') {
      this.transformPosition[axis] = Math.round(value * 100) / 100;
      this.selectedObject.position[axis] = this.transformPosition[axis];
    } else if (type === 'rotation') {
      this.transformRotation[axis] = Math.round(value % 360);
      this.selectedObject.rotation[axis] = THREE.MathUtils.degToRad(this.transformRotation[axis]);
    } else if (type === 'scale') {
      this.transformScale[axis] = Math.max(0.1, Math.round(value * 100) / 100);
      this.selectedObject.scale[axis] = this.transformScale[axis];
    }

    this.updateSceneObjectFromTransforms();
  }

  private updateSceneObjectFromTransforms(): void {
    if (!this.selectedObject) return;

    const sceneObject = this.objectToSceneObject.get(this.selectedObject);
    if (sceneObject) {
      sceneObject.position = { ...this.transformPosition };
      sceneObject.rotation = { ...this.transformRotation };
      sceneObject.scale = { ...this.transformScale };
    }
  }

  private updateTransformsFromSelectedObject(): void {
    if (!this.selectedObject) {
      this.selectedObjectName = 'None';
      return;
    }

    // Update the displayed transforms from the actual object
    this.transformPosition = {
      x: Math.round(this.selectedObject.position.x * 100) / 100,
      y: Math.round(this.selectedObject.position.y * 100) / 100,
      z: Math.round(this.selectedObject.position.z * 100) / 100
    };

    this.transformRotation = {
      x: Math.round(THREE.MathUtils.radToDeg(this.selectedObject.rotation.x)),
      y: Math.round(THREE.MathUtils.radToDeg(this.selectedObject.rotation.y)),
      z: Math.round(THREE.MathUtils.radToDeg(this.selectedObject.rotation.z))
    };

    this.transformScale = {
      x: Math.round(this.selectedObject.scale.x * 100) / 100,
      y: Math.round(this.selectedObject.scale.y * 100) / 100,
      z: Math.round(this.selectedObject.scale.z * 100) / 100
    };

    // Set the object name
    const sceneObject = this.objectToSceneObject.get(this.selectedObject);
    if (sceneObject) {
      this.selectedObjectName = sceneObject.name || 'Unknown Model';
    } else {
      this.selectedObjectName = this.selectedObject.name || 'Object';
    }
  }

  confirmDeleteSelectedObject(): void {
    if (this.selectedObject) {
      this.showDeleteAlert = true;
    }
  }

  deleteSelectedObject(): void {
    if (!this.selectedObject || !this.scene) return;

    const sceneObject = this.objectToSceneObject.get(this.selectedObject);
    if (sceneObject) {
      // Remove from scene data
      const index = this.scene.objects.findIndex(obj => obj.id === sceneObject.id);
      if (index > -1) {
        this.scene.objects.splice(index, 1);
      }

      // Remove from ThreeJS scene
      this.threeJsScene.remove(this.selectedObject);

      // Clean up maps
      this.objectToSceneObject.delete(this.selectedObject);
      this.modelIdToObject.delete(sceneObject.modelId);

      // Update UI
      this.sceneObjectCount = this.scene.objects.length;
      this.selectedObject = null;
      this.updateTransformsFromSelectedObject();

      console.log('Object deleted from scene');
    }

    this.showDeleteAlert = false;
  }
}