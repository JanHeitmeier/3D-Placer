import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonButton, 
  IonTitle, 
  IonContent,
  IonList,
  IonItem,
  IonThumbnail,
  IonLabel,
  ModalController
} from '@ionic/angular/standalone';
import { ModelInfo } from '../../../core/models/model-info.model';

@Component({
  selector: 'app-model-selector',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Select Model</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Cancel</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item *ngFor="let model of models" (click)="selectModel(model)" button>
          <ion-thumbnail slot="start">
            <img [src]="model.thumbnailUrl || 'assets/placeholder-model.png'" alt="Model thumbnail">
          </ion-thumbnail>
          <ion-label>{{ model.name }}</ion-label>
        </ion-item>
      </ion-list>
      <div *ngIf="!models || models.length === 0" class="ion-padding ion-text-center">
        <p>No models available. Please add models first.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-thumbnail {
      --size: 80px;
      margin: 10px;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonThumbnail,
    IonLabel
  ]
})
export class ModelSelectorComponent {
  @Input() models: ModelInfo[] = [];

  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss(null, 'cancel');
  }

  selectModel(model: ModelInfo) {
    this.modalController.dismiss(model, 'select');
  }
}