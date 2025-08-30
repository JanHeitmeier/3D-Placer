import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SceneManagerService } from '../../core/services/scene-manager.service';
import { ThreeJsService } from '../../core/services/three-js.service';
import { Scene } from '../../core/models/scene.model';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonContent, IonFab, IonFabButton, IonFabList } from '@ionic/angular/standalone';
import { ThreeViewportComponent } from '../../components/three-viewport/three-viewport.component';
import { PropertiesPanelComponent } from '../../components/properties-panel/properties-panel.component';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { AssetService } from '../../core/services/asset.service';
import { addIcons } from 'ionicons';
import { save, image, cube, add } from 'ionicons/icons';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.page.html',
  styleUrls: ['./editor.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonContent, ThreeViewportComponent, PropertiesPanelComponent, IonFab, IonFabButton, IonFabList]
})
export class EditorPage implements OnInit {
  scene!: Scene;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sceneManager: SceneManagerService,
    private threeJsService: ThreeJsService,
    private modelManager: ModelManagerService,
    private assetService: AssetService
  ) {
    addIcons({save,add,cube,image});
  }

  ngOnInit() {
    const sceneId = this.route.snapshot.paramMap.get('id');
    if (sceneId) {
      this.sceneManager.getScene(sceneId).then(scene => {
        if (scene) {
          this.scene = scene;
          this.loadSceneObjects();
        }
      });
    }
  }

  loadSceneObjects() {
    if (this.scene.backgroundImageUrl) {
      this.threeJsService.setBackground(this.scene.backgroundImageUrl);
    }
    this.scene.objects.forEach(async obj => {
      const modelPath = await this.modelManager.getModelPath(obj.modelId);
      if (modelPath) {
        // This needs to be expanded to handle position, rotation, scale
        this.threeJsService.addObject(modelPath);
      }
    });
  }

  addModel() {
    // For simplicity, this just navigates. A modal would be better UX.
    this.router.navigate(['/models']);
  }

  setBackground() {
    const imageUrl = this.assetService.getImageUrl(1024, 768);
    this.scene.backgroundImageUrl = imageUrl;
    this.threeJsService.setBackground(imageUrl);
  }

  saveScene() {
    // This is a simplified save. It doesn't correctly serialize the scene from three.js
    this.sceneManager.saveScene(this.scene);
  }
}
