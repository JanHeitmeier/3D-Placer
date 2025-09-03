import { Component, ViewChild, ElementRef } from '@angular/core';
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
  IonSpinner 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, pencil, trash, chevronDown, chevronUp, imageOutline } from 'ionicons/icons';
import { SceneInfo } from '../../core/models/scene-info.model';
import { OnInit, OnDestroy } from '@angular/core';
import { Keyboard } from '@capacitor/keyboard';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';


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
    IonSpinner 
  ]
})
export class ScenesPage implements OnInit, OnDestroy {
  @ViewChild('sceneNameInput') sceneNameInput!: ElementRef;
  
  editingSceneId: string | null = null;
  showDeleteAlert = false;
  sceneToDelete: string | null = null;
  showCreatePopup = false; 
  newSceneName = '';
  isLoading = true;
  isKeyboardVisible = false;
  keyboardHeight = 0;

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


  public modelCountCache: {[sceneId: string]: number} = {};

  constructor(public sceneManager: SceneManagerService, private router: Router) {
    addIcons({trash,imageOutline,add,pencil,chevronDown,chevronUp});
    
    this.sceneManager.scenes$.subscribe(scenes => {
      if (scenes) {
        this.isLoading = false;
        if (scenes.length > 0) {
          this.loadThumbnails(scenes);
        }
      }
    });
  }

  ngOnInit() {

    Keyboard.addListener('keyboardWillShow', (info) => {
      this.isKeyboardVisible = true;
      this.keyboardHeight = info.keyboardHeight || 0;
      this.adjustPopupForKeyboard(true);
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      this.isKeyboardVisible = false;
      this.keyboardHeight = 0;
      this.adjustPopupForKeyboard(false);
    });
  }
  
  ngOnDestroy() {

    this.modelCountCache = {};
    

    Keyboard.removeAllListeners();
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
    
    setTimeout(() => {
      if (this.sceneNameInput?.nativeElement) {
        this.sceneNameInput.nativeElement.setFocus();
      }
    }, 100);
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

      this.editingSceneId = null;
    } else {
      this.editingSceneId = sceneId;
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
    // Keine Zeit mehr zum Implementieren gehabt.
    return '0.5';
  }

  async getSceneModelCount(sceneId: string): Promise<number> {

    if (this.modelCountCache[sceneId] !== undefined) {
      return this.modelCountCache[sceneId];
    }
    
    try {
      const scene = await this.sceneManager.getScene(sceneId);
      const count = scene?.objects?.length || 0;

      this.modelCountCache[sceneId] = count;
      return count;
    } catch (error) {
      console.error('Error getting scene model count:', error);
      return 0;
    }
  }

  private adjustPopupForKeyboard(isVisible: boolean) {
    if (!this.showCreatePopup) return;
    
    const popupContainer = document.querySelector('.popup-container') as HTMLElement;
    if (!popupContainer) return;
    
    if (isVisible) {
      // PopUp wird nach oben verschoben, beim Tippen
      const viewportHeight = window.innerHeight;
      if (viewportHeight < 600) {
        popupContainer.style.transform = `translateY(-${this.keyboardHeight / 2}px)`;
      }
    } else {
      // Reset position
      popupContainer.style.transform = 'translateY(0)';
    }
  }
  
  private async loadThumbnails(scenes: SceneInfo[]) {
    for (const scene of scenes) {
      try {
        if (scene.thumbnailPath) {
          const fileUri = await Filesystem.getUri({
            directory: Directory.Data,
            path: scene.thumbnailPath
          });
          // Use a different property for the display URL
          (scene as any).thumbnailUrl = Capacitor.convertFileSrc(fileUri.uri);
        }
      } catch (error) {
        console.warn(`Could not load thumbnail for scene ${scene.id}`, error);
      }
    }
  }

  // Add method to handle form submission via keyboard
  handleInputKeyup(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.confirmCreateScene();
    }
  }
  
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
}
