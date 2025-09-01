import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SceneManagerService } from '../../core/services/scene-manager.service';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
  selector: 'app-scenes',
  templateUrl: './scenes.page.html',
  styleUrls: ['./scenes.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonLabel, IonButton, IonFab, IonFabButton, IonIcon]
})
export class ScenesPage {

  constructor(public sceneManager: SceneManagerService, private router: Router) {
    addIcons({ add });
  }

  openScene(sceneId: string) {
    this.router.navigate(['/scene-editor', { id: sceneId }]);
  }

  deleteScene(sceneId: string) {

  }

  renameScene(sceneId: string, newName: string) {

  }

  createScene() {
    
  }
}
