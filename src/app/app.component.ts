import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { list, cube, create, build, settings, helpCircle } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet],
})
export class AppComponent {
  public mainMenuItems = [
    { title: 'Model Library', url: '/model-library', icon: 'cube' },
    { title: 'Model Editor', url: '/model-editor', icon: 'create' },
    { title: 'Scenes', url: '/scenes', icon: 'list' },
    { title: 'Scene Editor', url: '/scene-editor', icon: 'build' },
  ];
  
  public bottomMenuItems = [
    { title: 'Settings', url: '/settings', icon: 'settings' },
    { title: 'Help', url: '/help', icon: 'help-circle' },
  ];
  
  // Keep this for backward compatibility
  public get appPages() {
    return [...this.mainMenuItems, ...this.bottomMenuItems];
  }
  
  constructor() {
    addIcons({ list, cube, create, build, settings, helpCircle });
  }
}