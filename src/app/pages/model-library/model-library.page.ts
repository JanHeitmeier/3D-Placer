import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonThumbnail, IonLabel, IonButton, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
  selector: 'app-model-library',
  templateUrl: './model-library.page.html',
  styleUrls: ['./model-library.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonThumbnail, IonLabel, IonButton, IonFab, IonFabButton, IonIcon]
})
export class ModelLibraryPage {

  constructor(public modelManager: ModelManagerService, private router: Router) {
    addIcons({ add });
  }

  openModel(modelId: string) {
    this.router.navigate(['/model-editor', { id: modelId }]);
  }

  deleteModel(modelId: string) {
    
  }
}
