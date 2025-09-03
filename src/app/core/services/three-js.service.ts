import { Injectable, NgZone, ElementRef } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BehaviorSubject } from 'rxjs';
import { ModelInfo } from '../models/model-info.model';

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

export interface TextureSettings {
  textureUrl: string;
  projection?: 'box' | 'cylinder';
  scaleU?: number;
  scaleV?: number;
  offsetU?: number;
  offsetV?: number;
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

  get scene(): THREE.Scene { return this._scene; }
  get camera(): THREE.PerspectiveCamera { return this._camera; }
  get renderer(): THREE.WebGLRenderer { return this._renderer; }
  get controls(): OrbitControls { return this._controls; }

  private _clock = new THREE.Clock();

  constructor(private zone: NgZone) { }


  public init(container: HTMLElement, options: ThreeJsOptions = {}): void {
    this._container = container;
    this._options = this.getDefaultOptions(options);

    let width = container.clientWidth;
    let height = container.clientHeight;

    if (width <= 0 || height <= 0) {
      width = Math.max(width, 400);
      height = Math.max(height, 300);
    }

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(this._options.backgroundColor);

    const gridHelper = new THREE.GridHelper(
      this._options.gridSize,
      this._options.gridDivisions,
      this._options.gridColor1,
      this._options.gridColor2
    );
    gridHelper.position.y = -0.01; // Prevent z-fighting
    this._scene.add(gridHelper);

    const axisLength = 20;

    // X-axis 
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const xAxisLine = new THREE.Line(xAxisGeometry, xAxisMaterial);
    xAxisLine.name = 'XAxis';
    this._scene.add(xAxisLine);

    // Y-axis
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const yAxisLine = new THREE.Line(yAxisGeometry, yAxisMaterial);
    yAxisLine.name = 'YAxis';
    this._scene.add(yAxisLine);

    // Z-axis
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const zAxisLine = new THREE.Line(zAxisGeometry, zAxisMaterial);
    zAxisLine.name = 'ZAxis';
    this._scene.add(zAxisLine);

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

    try {
      this._renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      this._renderer.setSize(width, height);
      this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
      this._renderer.shadowMap.enabled = this._options.enableShadows!;

      // Validate KI-Debugging Vorschlag
      if (this._renderer.domElement.width <= 0 || this._renderer.domElement.height <= 0) {
        console.error('Renderer created with invalid canvas dimensions');
        this._renderer.setSize(400, 300);
      }

      container.appendChild(this._renderer.domElement);
    } catch (error) {
      console.error('Failed to create WebGL renderer:', error);
      throw error;
    }

    //orbit controls
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = this._options.dampingFactor!;
    this._controls.rotateSpeed = this._options.rotateSpeed!;
    this._controls.panSpeed = this._options.panSpeed!;
    this._controls.zoomSpeed = this._options.zoomSpeed!;

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.startAnimationLoop();
  }

  public async applyAppropriateTexture(object: THREE.Object3D, modelInfo: ModelInfo): Promise<void> {
    if (modelInfo?.textureUrl) {
      console.log('Texture found, applying to model:', modelInfo.name, 'Texture:', modelInfo.textureUrl);

      const textureSettings: TextureSettings = {
        textureUrl: modelInfo.textureUrl,
        projection: modelInfo.textureProjection || 'box',
        scaleU: modelInfo.textureScaleU || 1,
        scaleV: modelInfo.textureScaleV || 1,
        offsetU: modelInfo.textureOffsetU || 0,
        offsetV: modelInfo.textureOffsetV || 0
      };

      try {
        await this.applyTextureToObject(object, textureSettings);
        return;
      } catch (error) {
        console.error('Error applying texture, falling back to default:', error);
      }
    }
    this.applyDefaultMaterial(object);
  }



  public applyDefaultMaterial(object: THREE.Object3D): void {
    const defaultMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7,
      metalness: 0.2
    });

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material if it exists and hasn't been stored yet
        if (!child.userData['originalMaterial']) {
          child.userData['originalMaterial'] = child.material;
        }

        // Apply default material
        if (Array.isArray(child.material)) {
          child.material = Array(child.material.length).fill(defaultMaterial);
        } else {
          child.material = defaultMaterial;
        }
      }
    });
  }

  public async applyTextureToObject(object: THREE.Object3D, settings: TextureSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Loading texture:', settings.textureUrl);


      const loader = new THREE.TextureLoader();
      loader.load(
        settings.textureUrl,
        (texture) => {
          console.log('Texture loaded successfully:', settings.textureUrl);
          try {

            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(settings.scaleU || 1, settings.scaleV || 1);
            texture.offset.set(settings.offsetU || 0, settings.offsetV || 0);

            let material: THREE.Material;

            // Cylinder Projection
            if (settings.projection === 'cylinder') {
              material = this.createCylindricalMaterial(texture, object, settings);
            } else {
              // Box projection 
              material = this.createBoxMaterial(texture, object, settings);
            }


            this.applyMaterialToObject(object, material);

            console.log('Material applied successfully to object');
            resolve();
          } catch (error) {
            console.error('Error applying texture material:', error);
            reject(error);
          }
        },
        (progress) => {
          console.log('Texture loading progress:', progress);
        },
        (error) => {
          console.error('Error loading texture:', settings.textureUrl, error);
          reject(error);
        }
      );
    });
  }

  


  /**
   * Apply material to all meshes in an object
   */
  private applyMaterialToObject(object: THREE.Object3D, material: THREE.Material): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material for potential restoration
        if (!child.userData['originalMaterial']) {
          child.userData['originalMaterial'] = child.material;
        }
        child.material = material;
      }
    });
  }

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

  // REsolving of a negative value screenspace size.
  private onWindowResize(): void {
    if (!this._container || !this._camera || !this._renderer) return;

    let width = this._container.clientWidth;
    let height = this._container.clientHeight;


    if (width <= 0 || height <= 0) {
      console.warn('Invalid container dimensions on resize, skipping');
      return;
    }

    console.log(`Resizing to: ${width}x${height}`);

    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    try {
      this._renderer.setSize(width, height);
    } catch (error) {
      console.error('Error resizing renderer:', error);
    }
  }


  private startAnimationLoop(): void {

    this.zone.runOutsideAngular(() => {
      const animate = () => {
        this._animationFrameId = requestAnimationFrame(animate);

        try {
          const delta = this._clock.getDelta();

          if (this._controls) {
            this._controls.update();
          }


          if (this._renderer && this._scene && this._camera) {
            const size = this._renderer.getSize(new THREE.Vector2());
            if (size.width > 0 && size.height > 0) {
              this._renderer.render(this._scene, this._camera);

            } else {
              console.warn('Skipping render due to invalid renderer size');
            }
          }
        } catch (error) {
          console.error('Error in animation loop:', error);
        }
      };

      animate();
    });
  }

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


  public loadObjectToScene(
    modelPath: string,
    targetScene: THREE.Scene,
    modelInfo?: ModelInfo
  ): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const fileExtension = this.getFileExtension(modelPath).toLowerCase();

      try {
        const loaderCallback = async (object: THREE.Object3D) => {
          targetScene.add(object);

          // Apply texture if modelInfo is provided
          if (modelInfo) {
            try {
              await this.applyAppropriateTexture(object, modelInfo);
            } catch (error) {
              console.error('Error applying texture:', error);
            }
          }

          resolve(object);
        };

        switch (fileExtension) {
          case 'gltf':
          case 'glb':
            this.loadGLTFToScene(modelPath, targetScene, loaderCallback, reject);
            break;
          case 'obj':
            this.loadOBJToScene(modelPath, targetScene, loaderCallback, reject);
            break;
          case 'fbx':
            this.loadFBXToScene(modelPath, targetScene, loaderCallback, reject);
            break;
          case 'dae':
            this.loadColladaToScene(modelPath, targetScene, loaderCallback, reject);
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

  private loadGLTFToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    console.log('Loading GLTF model to scene:', modelPath);
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {

        const model = gltf.scene.clone();

        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (Array.isArray(node.material)) {
              node.material = node.material.map(mat => mat.clone());
            } else if (node.material) {
              const oldMaterial = node.material;
              const newMaterial = oldMaterial.clone();

              if (oldMaterial.map) newMaterial.map = oldMaterial.map;
              if (oldMaterial.normalMap) newMaterial.normalMap = oldMaterial.normalMap;
              if (oldMaterial.aoMap) newMaterial.aoMap = oldMaterial.aoMap;

              node.material = newMaterial;
            }
          }
        });

        targetScene.add(model);
        resolve(model);
      },
      (progress) => {
        console.log(`Model loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error('Error loading GLTF model:', error);
        reject(error);
      }
    );
  }

  private loadOBJToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    console.log('Loading OBJ model to scene:', modelPath);
    const loader = new OBJLoader();
    loader.load(
      modelPath,
      (object) => {
        // Clone the object to avoid issues with shared materials
        const model = object.clone();

        // Process and preserve materials
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (Array.isArray(node.material)) {
              node.material = node.material.map(mat => mat.clone());
            } else if (node.material) {
              const oldMaterial = node.material;
              const newMaterial = oldMaterial.clone();

              // Preserve texture maps if they exist
              if (oldMaterial.map) newMaterial.map = oldMaterial.map;
              if (oldMaterial.normalMap) newMaterial.normalMap = oldMaterial.normalMap;
              if (oldMaterial.aoMap) newMaterial.aoMap = oldMaterial.aoMap;

              node.material = newMaterial;
            }
          }
        });

        targetScene.add(model);
        resolve(model);
      },
      (progress) => {
        if (progress.lengthComputable) {
          console.log(`OBJ loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        }
      },
      (error) => {
        console.error('Error loading OBJ model:', error);
        reject(error);
      }
    );
  }

  private loadFBXToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    console.log('Loading FBX model to scene:', modelPath);
    const loader = new FBXLoader();
    loader.load(
      modelPath,
      (object) => {
        // Clone the object to avoid issues with shared materials
        const model = object.clone();

        // Process and preserve materials
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (Array.isArray(node.material)) {
              node.material = node.material.map(mat => mat.clone());
            } else if (node.material) {
              const oldMaterial = node.material;
              const newMaterial = oldMaterial.clone();

              // Preserve texture maps if they exist
              if (oldMaterial.map) newMaterial.map = oldMaterial.map;
              if (oldMaterial.normalMap) newMaterial.normalMap = oldMaterial.normalMap;
              if (oldMaterial.aoMap) newMaterial.aoMap = oldMaterial.aoMap;

              node.material = newMaterial;
            }
          }
        });

        targetScene.add(model);
        resolve(model);
      },
      (progress) => {
        if (progress.lengthComputable) {
          console.log(`FBX loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        }
      },
      (error) => {
        console.error('Error loading FBX model:', error);
        reject(error);
      }
    );
  }

  private loadColladaToScene(modelPath: string, targetScene: THREE.Scene, resolve: (value: THREE.Object3D) => void, reject: (reason: any) => void): void {
    console.log('Loading Collada model to scene:', modelPath);
    const loader = new ColladaLoader();
    loader.load(
      modelPath,
      (collada) => {
        // Get the scene from collada object and clone it
        const model = collada.scene.clone();

        // Process and preserve materials
        model.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (Array.isArray(node.material)) {
              node.material = node.material.map(mat => mat.clone());
            } else if (node.material) {
              const oldMaterial = node.material;
              const newMaterial = oldMaterial.clone();

              // Preserve texture maps if they exist
              if (oldMaterial.map) newMaterial.map = oldMaterial.map;
              if (oldMaterial.normalMap) newMaterial.normalMap = oldMaterial.normalMap;
              if (oldMaterial.aoMap) newMaterial.aoMap = oldMaterial.aoMap;

              node.material = newMaterial;
            }
          }
        });

        targetScene.add(model);
        resolve(model);
      },
      (progress) => {
        if (progress.lengthComputable) {
          console.log(`Collada loading progress: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        }
      },
      (error) => {
        console.error('Error loading Collada model:', error);
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

  private createBoxMaterial(texture: THREE.Texture, object: THREE.Object3D, settings: TextureSettings): THREE.ShaderMaterial {
    // Calculate bounding box for box mapping
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        modelCenter: { value: center },
        modelSize: { value: size },
        offsetU: { value: settings.offsetU || 0 },
        offsetV: { value: settings.offsetV || 0 },
        scaleU: { value: settings.scaleU || 1 },
        scaleV: { value: settings.scaleV || 1 }
      },
      vertexShader: `
      varying vec2 vUv;
      uniform vec3 modelCenter;
      uniform vec3 modelSize;
      uniform float offsetU;
      uniform float offsetV;
      uniform float scaleU;
      uniform float scaleV;
      
      void main() {
        vec3 localPos = position - modelCenter;
        
        // Determine dominant axis for this vertex
        vec3 absLocal = abs(localPos);
        float maxAxis = max(max(absLocal.x, absLocal.y), absLocal.z);
        
        vec2 uv;
        if (absLocal.x >= absLocal.y && absLocal.x >= absLocal.z) {
          // X dominant axis
          uv = vec2(localPos.z, localPos.y);
          uv /= modelSize.xz * 0.5;
        } else if (absLocal.y >= absLocal.x && absLocal.y >= absLocal.z) {
          // Y dominant axis
          uv = vec2(localPos.x, localPos.z);
          uv /= modelSize.xy * 0.5;
        } else {
          // Z dominant axis
          uv = vec2(localPos.x, localPos.y);
          uv /= modelSize.zy * 0.5;
        }
        
        // Remap from [-1,1] to [0,1] range
        uv = uv * 0.5 + 0.5;
        
        // Apply scale and offset
        vUv = vec2(uv.x * scaleU + offsetU, uv.y * scaleV + offsetV);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
      fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D map;
      
      void main() {
        gl_FragColor = texture2D(map, vUv);
        
        // Ensure we have some default color to avoid pure black
        if (gl_FragColor.r + gl_FragColor.g + gl_FragColor.b < 0.01) {
          gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
        }
      }
    `
    });
  }

  private createCylindricalMaterial(texture: THREE.Texture, object: THREE.Object3D, settings: TextureSettings): THREE.ShaderMaterial {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());

    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        modelCenter: { value: center },
        offsetU: { value: settings.offsetU || 0 },
        offsetV: { value: settings.offsetV || 0 },
        scaleU: { value: settings.scaleU || 1 },
        scaleV: { value: settings.scaleV || 1 }
      },
      vertexShader: `
          varying vec2 vUv;
          uniform vec3 modelCenter;
          uniform float offsetU;
          uniform float offsetV;
          uniform float scaleU;
          uniform float scaleV;
          void main() {
            vec3 localPos = position - modelCenter;
            float theta = atan(localPos.x, localPos.z);
            float u = 0.5 + theta / (2.0 * 3.14159);
            float v = 0.5 + localPos.y / 2.0;
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
  }
}
