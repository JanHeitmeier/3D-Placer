import { Injectable, NgZone, ElementRef } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BehaviorSubject } from 'rxjs';

export interface ThreeJsOptions {
  backgroundColor?: THREE.ColorRepresentation;
  gridSize?: number;
  gridDivisions?: number;
  gridColor1?: THREE.ColorRepresentation;
  gridColor2?: THREE.ColorRepresentation;
  ambientLightColor?: THREE.ColorRepresentation;
  ambientLightIntensity?: number;
  directionalLightColor?: THREE.ColorRepresentation;
  directionalLightIntensity?: number;
  addBottomLight?: boolean;
  enableShadows?: boolean;
  dampingFactor?: number;
  rotateSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  cameraPosition?: THREE.Vector3;
  cameraFov?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ThreeJsService {
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _renderer!: THREE.WebGLRenderer;
  private _controls!: OrbitControls;
  private _animationFrameId: number | null = null;
  private _container!: HTMLElement;
  private _options!: ThreeJsOptions;

  private selectedObject = new BehaviorSubject<THREE.Object3D | null>(null);
  selectedObject$ = this.selectedObject.asObservable();

  // Getters for private properties
  get scene(): THREE.Scene { return this._scene; }
  get camera(): THREE.PerspectiveCamera { return this._camera; }
  get renderer(): THREE.WebGLRenderer { return this._renderer; }
  get controls(): OrbitControls { return this._controls; }

  constructor(private zone: NgZone) { }

  /**
   * Initialize the ThreeJS environment with enhanced options
   */
  public init(container: HTMLElement, options: ThreeJsOptions = {}): void {
    this._container = container;
    this._options = this.getDefaultOptions(options);

    // Get container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(this._options.backgroundColor);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(
      this._options.gridSize,
      this._options.gridDivisions,
      this._options.gridColor1,
      this._options.gridColor2
    );
    gridHelper.position.y = -0.01; // Prevent z-fighting
    this._scene.add(gridHelper);

    // Setup camera
    this._camera = new THREE.PerspectiveCamera(this._options.cameraFov, width / height, 0.1, 1000);
    this._camera.position.copy(this._options.cameraPosition!);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(
      this._options.ambientLightColor,
      this._options.ambientLightIntensity
    );
    this._scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      this._options.directionalLightColor,
      this._options.directionalLightIntensity
    );
    directionalLight.position.set(1, 1, 1);
    directionalLight.name = 'DirectionalLight'; // Name it for reference
    this._scene.add(directionalLight);

    // Add bottom light if requested
    if (this._options.addBottomLight) {
      const bottomLight = new THREE.DirectionalLight(0xffffcc, 0.3);
      bottomLight.position.set(0, -1, 0);
      bottomLight.name = 'BottomLight';
      this._scene.add(bottomLight);
    }

    // Create renderer
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setSize(width, height);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.shadowMap.enabled = this._options.enableShadows!;
    container.appendChild(this._renderer.domElement);

    // Add orbit controls
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = this._options.dampingFactor!;
    this._controls.rotateSpeed = this._options.rotateSpeed!;
    this._controls.panSpeed = this._options.panSpeed!;
    this._controls.zoomSpeed = this._options.zoomSpeed!;
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Start the animation loop
    this.startAnimationLoop();
  }

  /**
   * Clean up ThreeJS resources
   */
  public dispose(): void {
    // Cancel animation frame
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    // Dispose controls
    if (this._controls) {
      this._controls.dispose();
    }

    // Dispose renderer
    if (this._renderer) {
      this._renderer.dispose();
      if (this._container.contains(this._renderer.domElement)) {
        this._container.removeChild(this._renderer.domElement);
      }
    }

    // Remove resize listener
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    // Dispose scene objects
    if (this._scene) {
      this.disposeScene(this._scene);
    }
  }

  /**
   * Dispose all meshes, geometries and materials in the scene
   */
  private disposeScene(scene: THREE.Scene): void {
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

  /**
   * Handle window resize events
   */
  private onWindowResize(): void {
    if (!this._container || !this._camera || !this._renderer) return;

    const width = this._container.clientWidth;
    const height = this._container.clientHeight;

    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }

  /**
   * Start the animation loop
   */
  private startAnimationLoop(): void {
    // Run animation outside Angular zone for better performance
    this.zone.runOutsideAngular(() => {
      const animate = () => {
        this._animationFrameId = requestAnimationFrame(animate);

        if (this._controls) {
          this._controls.update();
        }

        if (this._renderer && this._scene && this._camera) {
          this._renderer.render(this._scene, this._camera);
        }
      };

      animate();
    });
  }

  /**
   * Fit camera to object
   */
  public fitCameraToObject(object: THREE.Object3D, offset: number = 1.5): void {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this._camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= offset;

    this._camera.position.set(center.x, center.y + maxDim / 3, center.z + cameraZ);
    this._camera.lookAt(center);
    this._camera.updateProjectionMatrix();

    this._controls.target.copy(center);
    this._controls.update();
  }

  /**
   * Merge options with defaults
   */
  private getDefaultOptions(options: ThreeJsOptions): ThreeJsOptions {
    return {
      backgroundColor: options.backgroundColor ?? 0xf0f0f0,
      gridSize: options.gridSize ?? 10,
      gridDivisions: options.gridDivisions ?? 10,
      gridColor1: options.gridColor1 ?? 0x888888,
      gridColor2: options.gridColor2 ?? 0xcccccc,
      ambientLightColor: options.ambientLightColor ?? 0xffffff,
      ambientLightIntensity: options.ambientLightIntensity ?? 0.6,
      directionalLightColor: options.directionalLightColor ?? 0xffffff,
      directionalLightIntensity: options.directionalLightIntensity ?? 0.8,
      addBottomLight: options.addBottomLight ?? true,
      enableShadows: options.enableShadows ?? true,
      dampingFactor: options.dampingFactor ?? 0.25,
      rotateSpeed: options.rotateSpeed ?? 0.9,
      panSpeed: options.panSpeed ?? 0.9,
      zoomSpeed: options.zoomSpeed ?? 1.2,
      cameraPosition: options.cameraPosition ?? new THREE.Vector3(0, 2, 5),
      cameraFov: options.cameraFov ?? 45
    };
  }

  public addObject(modelPath: string): void {
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      this._scene.add(gltf.scene);
    }, undefined, (error) => {
      console.error(error);
    });
  }

  public addObjectAsync(modelPath: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const fileExtension = this.getFileExtension(modelPath).toLowerCase();

      try {
        switch (fileExtension) {
          case 'gltf':
          case 'glb':
            this.loadGLTF(modelPath, resolve, reject);
            break;
          case 'obj':
            this.loadOBJ(modelPath, resolve, reject);
            break;
          case 'fbx':
            this.loadFBX(modelPath, resolve, reject);
            break;
          case 'dae':
            this.loadCollada(modelPath, resolve, reject);
            break;
          default:
            reject(new Error(`Unsupported file format: ${fileExtension}`));
        }
      } catch (error) {
        console.error('Error loading model:', error);
        reject(error);
      }
    });
  }

  public loadObjectToScene(modelPath: string, targetScene: THREE.Scene): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const fileExtension = this.getFileExtension(modelPath).toLowerCase();

      try {
        switch (fileExtension) {
          case 'gltf':
          case 'glb':
            this.loadGLTFToScene(modelPath, targetScene, resolve, reject);
            break;
          case 'obj':
            this.loadOBJToScene(modelPath, targetScene, resolve, reject);
            break;
          case 'fbx':
            this.loadFBXToScene(modelPath, targetScene, resolve, reject);
            break;
          case 'dae':
            this.loadColladaToScene(modelPath, targetScene, resolve, reject);
            break;
          default:
            reject(new Error(`Unsupported file format: ${fileExtension}`));
        }
      } catch (error) {
        console.error('Error loading model:', error);
        reject(error);
      }
    });
  }

  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }

  private loadGLTF(modelPath: string, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        this._scene.add(gltf.scene);
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadOBJ(modelPath: string, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new OBJLoader();
    loader.load(
      modelPath,
      (object) => {
        this._scene.add(object);
        resolve(object);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadFBX(modelPath: string, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new FBXLoader();
    loader.load(
      modelPath,
      (object) => {
        this._scene.add(object);
        resolve(object);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadCollada(modelPath: string, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new ColladaLoader();
    loader.load(
      modelPath,
      (collada) => {
        const object = collada.scene;
        this._scene.add(object);
        resolve(object);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadGLTFToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        targetScene.add(gltf.scene);
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadOBJToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new OBJLoader();
    loader.load(
      modelPath,
      (object) => {
        targetScene.add(object);
        resolve(object);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadFBXToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new FBXLoader();
    loader.load(
      modelPath,
      (object) => {
        targetScene.add(object);
        resolve(object);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  private loadColladaToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    const loader = new ColladaLoader();
    loader.load(
      modelPath,
      (collada) => {
        const object = collada.scene;
        targetScene.add(object);
        resolve(object);
      },
      undefined,
      (error) => {
        console.error(error);
        reject(error);
      }
    );
  }

  public setBackground(imageUrl: string): void {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      this._scene.background = texture;
    });
  }

  public getSceneObjects(): any[] {
    // This is a simplified representation. In a real app, you'd serialize the scene.
    return this._scene.children
      .filter(obj => obj.type !== 'PerspectiveCamera')
      .map(obj => ({
        uuid: obj.uuid,
        position: obj.position.clone(),
        rotation: obj.rotation.clone(),
        scale: obj.scale.clone(),
        // You would need to map this back to your modelId
      }));
  }

  public setSelectedObjectPosition(x: number, y: number, z: number): void {
    const selected = this.selectedObject.getValue();
    if (selected) {
      selected.position.set(x, y, z);
    }
  }
}
