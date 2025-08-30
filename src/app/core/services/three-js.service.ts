import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThreeJsService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private selectedObject = new BehaviorSubject<THREE.Object3D | null>(null);
  selectedObject$ = this.selectedObject.asObservable();

  constructor() { }

  public init(container: HTMLElement) {
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public addObject(modelPath: string): void {
    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      this.scene.add(gltf.scene);
    }, undefined, (error) => {
      console.error(error);
    });
  }

  public setBackground(imageUrl: string): void {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      this.scene.background = texture;
    });
  }

  public getSceneObjects(): any[] {
    // This is a simplified representation. In a real app, you'd serialize the scene.
    return this.scene.children
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
