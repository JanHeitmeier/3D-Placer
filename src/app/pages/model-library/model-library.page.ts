import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { ModelInfo } from '../../core/models/model-info.model';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle } from '@ionic/angular/standalone';
import { ModelImporterComponent } from '../../components/model-importer/model-importer.component';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';

interface ModelInfoWithThumbnail extends ModelInfo {
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-model-library',
  templateUrl: './model-library.page.html',
  styleUrls: ['./model-library.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, ModelImporterComponent]
})
export class ModelLibraryPage implements OnInit, OnDestroy {
  models: ModelInfoWithThumbnail[] = [];
  private modelsSubscription!: Subscription;

  constructor(private modelManagerService: ModelManagerService) { }

  ngOnInit() {
    this.modelsSubscription = this.modelManagerService.models$.subscribe(models => {
      this.updateThumbnails(models);
    });
  }

  async updateThumbnails(models: ModelInfo[]) {
    const modelsWithThumbs = await Promise.all(
      models.map(async (model) => {
        const thumbnailUrl = await this.modelManagerService.getThumbnailUrl(model.id);
        return { ...model, thumbnailUrl: thumbnailUrl || undefined };
      })
    );
    this.models = modelsWithThumbs;
  }

  ngOnDestroy() {
    if (this.modelsSubscription) {
      this.modelsSubscription.unsubscribe();
    }
  }
}
