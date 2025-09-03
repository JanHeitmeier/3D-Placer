import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonMenu, IonContent, IonList, IonListHeader, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';

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
  
  constructor() {
    this.initializeApp();
  }
  
  async initializeApp() {
    try {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setBackgroundColor({ color: '#000000' });
      StatusBar.setStyle({ style: Style.Dark }); // Design für Abstandbar am Top End
    } catch (err) {
      console.error('Error initializing StatusBar', err);
    }
  }
  
  //  Backwards comp. laut KI
  public get appPages() {
    return this.mainMenuItems;
  }
}