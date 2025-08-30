import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ModelManagerService } from '../../core/services/model-manager.service';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonRange, IonLabel, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera } from 'ionicons/icons';

@Component({
  selector: 'app-thumbnail-editor',
  templateUrl: './thumbnail-editor.page.html',
  styleUrls: ['./thumbnail-editor.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, IonRange, IonLabel, IonSpinner]
})
export class ThumbnailEditorPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
  private modelId: string | null = null;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private model!: THREE.Object3D;
  private frameId!: number;
  public loading = false;
  public loadError: string | null = null;
  private autoCaptureRequested = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modelManager: ModelManagerService
  , private toastCtrl: ToastController) {
    addIcons({ camera });
  }

  ngOnInit() {
    this.modelId = this.route.snapshot.paramMap.get('id');
  const auto = this.route.snapshot.queryParamMap.get('autoCapture');
  this.autoCaptureRequested = auto === '1' || auto === 'true';
  }

  ngAfterViewInit() {
    this.initThree();
    this.loadModel();
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  window.removeEventListener('resize', this.onWindowResize);
  }

  private initThree() {
    const container = this.canvasContainer.nativeElement;
  const width = container.clientWidth || 400;
  const height = container.clientHeight || 300;

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

  private onWindowResize = () => {
    if (!this.canvasContainer || !this.renderer) return;
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private async loadModel() {
    if (!this.modelId) return;
    const modelUrl = await this.modelManager.getModelPath(this.modelId);
    const modelInfo = await this.modelManager.getModelInfo(this.modelId);
    if (!modelUrl) {
      console.error('Model URL not found for', this.modelId);
      return;
    }

    // Determine extension: prefer name from model info (keeps original extension), else try to parse from URL
    let extension = modelInfo?.name?.split('.').pop()?.toLowerCase();
    if (!extension) {
      const parsed = modelUrl.split('.').pop()?.toLowerCase();
      extension = parsed;
    }

    const tryLoaders = async () => {
      const tryGltf = () => new Promise<void>((resolve, reject) => {
        const loader = new GLTFLoader();
        (async () => {
          try {
            const isGlb = (modelInfo?.name?.split('.').pop() || '').toLowerCase() === 'glb';
            const resp = await fetch(modelUrl);
            if (isGlb) {
              const arrayBuffer = await resp.arrayBuffer();
              loader.parse(arrayBuffer, '', (gltf: any) => { this.onModelLoaded(gltf.scene || gltf); resolve(); }, reject);
            } else {
              const text = await resp.text();
              loader.parse(text, '', (gltf: any) => { this.onModelLoaded(gltf.scene || gltf); resolve(); }, reject);
            }
          } catch (err) { reject(err); }
        })();
      });

      const tryFbx = () => new Promise<void>((resolve, reject) => {
        const loader = new FBXLoader();
        loader.load(modelUrl, (object: any) => {
          this.onModelLoaded(object as THREE.Object3D);
          resolve();
        }, undefined, (err) => reject(err));
      });

      const tryObj = () => new Promise<void>((resolve, reject) => {
        const loader = new OBJLoader();
        loader.load(modelUrl, (object: any) => {
          this.onModelLoaded(object as THREE.Object3D);
          resolve();
        }, undefined, (err) => reject(err));
      });

      const tryDae = () => new Promise<void>((resolve, reject) => {
        const loader = new ColladaLoader();
        loader.load(modelUrl, (object: any) => {
          // Collada loader returns a Collada object
          this.onModelLoaded(object.scene || object as any);
          resolve();
        }, undefined, (err) => reject(err));
      });

      // Prefer loader by extension
    try {
        if (extension === 'glb' || extension === 'gltf') {
      this.loading = true;
          await tryGltf();
          return;
        }
        if (extension === 'fbx') {
          await tryFbx();
          return;
        }
        if (extension === 'obj') {
          await tryObj();
          return;
        }
        if (extension === 'dae') {
          await tryDae();
          return;
        }

        // Unknown extension: try common loaders in order
        try {
          this.loading = true;
          await tryGltf();
          return;
        } catch (e) {
          console.warn('GLTF load failed, trying FBX/OBJ/DAE', e);
        }
        try {
          await tryFbx();
          return;
        } catch (e) {
          console.warn('FBX load failed, trying OBJ/DAE', e);
        }
        try {
          await tryObj();
          return;
        } catch (e) {
          console.warn('OBJ load failed, trying DAE', e);
        }
        try {
          await tryDae();
          return;
        } catch (e) {
          console.error('All loaders failed for', modelUrl, e);
          this.loadError = 'Unable to load model (unsupported or corrupted file).';
        }
      } catch (err) {
        console.error('Error while attempting loaders', err);
        this.loadError = 'Unexpected error while loading model';
      }
    };

    tryLoaders();
  }

  private onModelLoaded(obj: THREE.Object3D) {
  // Remove previous model if any
    if (this.model && this.scene) {
      try { this.scene.remove(this.model); } catch (e) {}
    }
    this.model = obj;
    console.log('Model loaded and added to scene', this.model);
  this.loading = false;
  this.loadError = null;
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    this.model.position.sub(center);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.5 / maxDim;
    this.model.scale.set(scale, scale, scale);
    this.scene.add(this.model);
    // If import requested auto-capture, run takeThumbnail once model is loaded and the renderer is ready
    if (this.autoCaptureRequested) {
      // wait a tick to allow rendering
      setTimeout(() => {
        this.takeThumbnail();
        // clear the flag so user can retake later
        this.autoCaptureRequested = false;
      }, 400);
    }
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
    // Stay on the page to allow retakes. Show a confirmation toast instead.
    const toast = await this.toastCtrl.create({
      message: 'Thumbnail saved',
      duration: 1200,
      position: 'top'
    });
    await toast.present();
  }
}
