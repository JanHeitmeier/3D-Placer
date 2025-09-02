import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SceneManagerService } from '../../core/services/scene-manager.service';
import { Router } from '@angular/router';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonFab, 
  IonFabButton, 
  IonIcon, 
  IonInput, 
  IonAlert,
  IonSpinner // Add this import
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pencil, trash, chevronDown, chevronUp, imageOutline } from 'ionicons/icons';
import { SceneInfo } from '../../core/models/scene-info.model';
import { Scene } from '../../core/models/scene.model';

@Component({
  selector: 'app-scenes',
  templateUrl: './scenes.page.html',
  styleUrls: ['./scenes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonButton, 
    IonFab, 
    IonFabButton, 
    IonIcon, 
    IonInput, 
    IonAlert,
    IonSpinner // Add this to imports
  ]
})
export class ScenesPage {
  editingSceneId: string | null = null;
  showDeleteAlert = false;
  sceneToDelete: string | null = null;
  showCreatePopup = false;  // Changed from showCreateAlert
  newSceneName = '';
  isLoading = true;

  // Add buttons configuration as a property
  alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => { 
        this.showDeleteAlert = false; 
      }
    },
    {
      text: 'Delete',
      role: 'confirm',
      handler: () => { 
        if (this.sceneToDelete) {
          this.deleteScene(this.sceneToDelete);
        }
      }
    }
  ];

  createAlertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.showCreatePopup = false;
        this.newSceneName = '';
      }
    },
    {
      text: 'Create',
      handler: () => {
        this.createSceneWithName(this.newSceneName || 'New Scene');
        this.newSceneName = '';
      }
    }
  ];

  // Add a cache for scene model counts
  public modelCountCache: {[sceneId: string]: number} = {};

  constructor(public sceneManager: SceneManagerService, private router: Router) {
    addIcons({trash,imageOutline,add,pencil,chevronDown,chevronUp});
    
    // Add subscription to know when scenes are loaded
    this.sceneManager.scenes$.subscribe(scenes => {
      // Only set loading to false after we have data
      if (scenes) {
        this.isLoading = false;
      }
    });
  }

  openScene(sceneId: string) {
    this.router.navigate(['/scene-editor', { id: sceneId }]);
  }

  async deleteScene(sceneId: string) {
    await this.sceneManager.deleteScene(sceneId);
    this.sceneToDelete = null;
  }

  async renameScene(sceneId: string, newName: string) {
    const scene = await this.sceneManager.getScene(sceneId);
    if (scene && newName.trim()) {
      scene.name = newName.trim();
      await this.sceneManager.saveScene(scene);
    }
  }

  openCreatePopup() {
    this.newSceneName = '';
    this.showCreatePopup = true;
  }
  
  cancelCreateScene() {
    this.showCreatePopup = false;
    this.newSceneName = '';
  }
  
  confirmCreateScene() {
    this.createSceneWithName(this.newSceneName || 'New Scene');
    this.showCreatePopup = false;
    this.newSceneName = '';
  }

  async createSceneWithName(name: string) {
    if (!name.trim()) {
      name = 'New Scene';
    }
    const scene = await this.sceneManager.createNewScene(name);
    this.router.navigate(['/scene-editor', { id: scene.id }]);
  }

  toggleEditMenu(sceneId: string) {
    if (this.editingSceneId === sceneId) {
      // Closing the panel
      this.editingSceneId = null;
    } else {
      // Opening the panel - load data only when needed
      this.editingSceneId = sceneId;
      // Load model count for this scene when panel is opened
      if (this.modelCountCache[sceneId] === undefined) {
        this.getSceneModelCount(sceneId);
      }
    }
  }

  confirmDelete(sceneId: string) {
    this.sceneToDelete = sceneId;
    this.showDeleteAlert = true;
  }

  getSceneSize(scene: SceneInfo): string {
    // In a real app, calculate actual size
    return '0.5';
  }

  async getSceneModelCount(sceneId: string): Promise<number> {
    // Check if we have a cached count first
    if (this.modelCountCache[sceneId] !== undefined) {
      return this.modelCountCache[sceneId];
    }
    
    try {
      const scene = await this.sceneManager.getScene(sceneId);
      const count = scene?.objects?.length || 0;
      // Cache the result
      this.modelCountCache[sceneId] = count;
      return count;
    } catch (error) {
      console.error('Error getting scene model count:', error);
      return 0;
    }
  }

  // Clear cache when data might have changed
  ngOnDestroy() {
    this.modelCountCache = {};
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
