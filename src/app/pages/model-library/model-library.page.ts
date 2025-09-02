import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, 
         IonCard, IonCardHeader, IonCardTitle, IonCol, IonGrid, IonRow, 
         IonButton, IonFab, IonFabButton, IonIcon, IonCardContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, trash, open, image } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { AlertController, LoadingController } from '@ionic/angular/standalone';
import { ModelInfo } from '../../core/models/model-info.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-model-library',
  templateUrl: './model-library.page.html',
  styleUrls: ['./model-library.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, 
           IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, 
           IonCol, IonGrid, IonRow, IonButton, IonFab, IonFabButton, 
           IonIcon, IonCardContent]
})
export class ModelLibraryPage implements OnInit, OnDestroy {
  isLoading = false;
  private modelSubscription: Subscription | null = null;
  private processingModels = new Set<string>();

  constructor(
    public modelManager: ModelManagerService, 
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    addIcons({open,image,trash,add});
  }

  ngOnInit() {
    // Subscribe to model changes to detect missing thumbnails
    this.modelSubscription = this.modelManager.models$.subscribe(models => {
      this.checkForMissingThumbnails(models);
    });
  }

  ngOnDestroy() {
    if (this.modelSubscription) {
      this.modelSubscription.unsubscribe();
    }
  }

  private async checkForMissingThumbnails(models: ModelInfo[]) {
    // First, ensure the thumbnails directory exists
    try {
      await this.modelManager.createThumbnailsDirectory();
    } catch (error) {
      console.error('Failed to create thumbnails directory:', error);
    }

    for (const model of models) {
      if (!model.thumbnailGenerated && !this.processingModels.has(model.id)) {
        console.log(`Model ${model.name} needs thumbnail generation. Status: ${JSON.stringify({
          hasUrl: !!model.thumbnailUrl,
          thumbnailGenerated: model.thumbnailGenerated
        })}`);
        
        this.processingModels.add(model.id);
        
        try {
          console.log(`Auto-generating thumbnail for model: ${model.name}`);
          await this.modelManager.tryGenerateThumbnail(model);
          
          const updatedModel = await this.modelManager.getModelInfo(model.id);
          if (updatedModel && updatedModel.thumbnailPath) {
            await this.modelManager.refreshThumbnails();
          }
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${model.name}:`, error);
          
          // Mark as generated even if it failed to prevent loops
          try {
            const manifest = await this.modelManager.getModelsManifest();
            const modelIndex = manifest.models.findIndex((m: ModelInfo) => m.id === model.id);
            if (modelIndex > -1) {
              manifest.models[modelIndex].thumbnailGenerated = true;
              await this.modelManager.updateModelsManifest(manifest);
            }
          } catch (e) {
            console.error('Failed to mark thumbnail as generated:', e);
          }
        } finally {
          this.processingModels.delete(model.id);
        }
      } else if (model.thumbnailGenerated && !model.thumbnailUrl) {
        // This handles the case where a thumbnail was generated but the URL is missing
        // (which can happen due to caching or storage issues)
        console.log(`Model ${model.name} has thumbnailGenerated=true but no URL, refreshing...`);
        await this.modelManager.refreshThumbnails();
      }
    }
  }

  async openFilePicker() {
    try {
      // Supported 3D model formats
      const extensions = ['glb', 'gltf', 'fbx', 'obj', 'dae'];
      
      const result = await FilePicker.pickFiles({
        types: extensions.map(ext => `model/${ext}`),
        readData: false
      });
      
      if (result.files.length > 0) {
        const file = result.files[0];
        if (file.path) {
          await this.importModel(file.path, file.name || 'unknown_model');
        } else {
          this.showAlert('Error', 'File path is not available');
        }
      }
    } catch (error) {
      console.error('Error picking file', error);
      this.showAlert('Error', 'Failed to pick file. Please try again.');
    }
  }

  async importModel(filePath: string, fileName: string) {
    const loading = await this.loadingController.create({
      message: 'Importing model...',
      spinner: 'circular'
    });
    
    await loading.present();
    
    try {
      await this.modelManager.importModel(filePath, fileName);
      loading.dismiss();
    } catch (error) {
      console.error('Error importing model', error);
      loading.dismiss();
      this.showAlert('Import Failed', 'Failed to import the model. Please try again.');
    }
  }

  openModelEditor(modelId: string) {
    this.router.navigate(['/model-editor', modelId]);
  }

  async deleteModel(modelId: string) {
    const alert = await this.alertController.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this model?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting...',
              spinner: 'circular'
            });
            
            await loading.present();
            
            try {
              await this.modelManager.deleteModel(modelId);
              loading.dismiss();
            } catch (error) {
              console.error('Error deleting model', error);
              loading.dismiss();
              this.showAlert('Delete Failed', 'Failed to delete the model. Please try again.');
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    
    await alert.present();
  }

  async refreshThumbnails() {
    try {
      await this.modelManager.refreshThumbnails();
    } catch (error) {
      console.error('Error refreshing thumbnails', error);
    }
  }

  ionViewDidEnter() {
    this.refreshThumbnails();
  }
}