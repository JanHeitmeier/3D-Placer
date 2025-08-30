import { Component, OnInit } from '@angular/core';
import { SceneManagerService } from '../../core/services/scene-manager.service';
import { SceneInfo } from '../../core/models/scene-info.model';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
  selector: 'app-scene-list',
  templateUrl: './scene-list.page.html',
  styleUrls: ['./scene-list.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon]
})
export class SceneListPage implements OnInit {
  scenes: SceneInfo[] = [];

  constructor(
    private sceneManagerService: SceneManagerService,
    private router: Router
  ) {
    addIcons({ add });
  }

  ngOnInit() {
    this.loadScenes();
  }


  ionViewWillEnter() {
    this.loadScenes();
  }

  async loadScenes() {
    this.scenes = await this.sceneManagerService.getScenes();
  }

  async createNewScene() {
    const newScene = await this.sceneManagerService.createNewScene('New Scene');
    this.router.navigate(['/editor', newScene.id]);
  }
}
