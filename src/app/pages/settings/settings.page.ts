import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, 
         IonList, IonItem, IonLabel, IonToggle, IonRange, IonButton } from '@ionic/angular/standalone';
import { SettingsService, AppSettings } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
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
    IonToggle,
    IonRange,
    IonButton
  ]
})
export class SettingsPage implements OnInit {
  settings: AppSettings = {
    darkMode: false,
    gridSize: 10
  };

  constructor(private settingsService: SettingsService) { }

  ngOnInit() {
    // Subscribe to settings changes
    this.settingsService.settings$.subscribe(settings => {
      this.settings = settings;
    });
  }

  updateDarkMode(event: any) {
    const darkMode = event.detail.checked;
    this.settingsService.updateSettings({ darkMode });
  }

  updateGridSize(event: any) {
    const gridSize = event.detail.value;
    this.settingsService.updateSettings({ gridSize });
  }

  async resetSettings() {
    await this.settingsService.resetSettings();
  }
}
