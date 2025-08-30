import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModelManagerService } from '../../core/services/model-manager.service';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonRange, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera } from 'ionicons/icons';

@Component({
  selector: 'app-thumbnail-editor',
  templateUrl: './thumbnail-editor.page.html',
  styleUrls: ['./thumbnail-editor.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonIcon, IonRange, IonLabel]
})
export class ThumbnailEditorPage implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  private modelId: string | null = null;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private model!: THREE.Object3D;
  private frameId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modelManager: ModelManagerService
  ) {
    addIcons({ camera });
  }

  ngOnInit() {
    this.modelId = this.route.snapshot.paramMap.get('id');
    this.initThree();
    this.loadModel();
  }

  ngOnDestroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThree() {
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdedede);

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 2;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    const animate = () => {
      this.frameId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private async loadModel() {
    if (!this.modelId) return;
    const modelUrl = await this.modelManager.getModelPath(this.modelId);
    if (!modelUrl) return;

    const extension = modelUrl.split('.').pop()?.toLowerCase();
    let loader: GLTFLoader | FBXLoader | OBJLoader | ColladaLoader;

    switch (extension) {
      case 'glb':
      case 'gltf':
        loader = new GLTFLoader();
        break;
      case 'fbx':
        loader = new FBXLoader();
        break;
      case 'obj':
        loader = new OBJLoader();
        break;
      case 'dae':
        loader = new ColladaLoader();
        break;
      default:
        console.error('Unsupported model format:', extension);
        return;
    }

    loader.load(modelUrl, (object: any) => {
      this.model = object.scene || object;
      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      this.model.position.sub(center);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDim;
      this.model.scale.set(scale, scale, scale);
      this.scene.add(this.model);
    });
  }

  onScaleChange(event: any) {
    if (!this.model) return;
    const scale = event.detail.value;
    this.model.scale.set(scale, scale, scale);
  }

  async takeThumbnail() {
    if (!this.modelId) return;
    const imageData = this.renderer.domElement.toDataURL('image/png');
    await this.modelManager.saveThumbnail(this.modelId, imageData);
    this.router.navigate(['/models']);
  }
}
