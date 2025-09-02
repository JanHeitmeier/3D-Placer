import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonMenu, IonContent, IonList, IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { list, cube, create, build, settings, helpCircle, saveOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IonMenu, IonContent, IonList, IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet],
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
  
  //  Backwards comp.
  public get appPages() {
    return [...this.mainMenuItems, ...this.bottomMenuItems];
  }
  
  constructor() {
    addIcons({ list, cube, create, build, settings, helpCircle, 'save-outline': saveOutline, 'chevron-back-outline': chevronBackOutline, 'chevron-forward-outline': chevronForwardOutline });
  }
}