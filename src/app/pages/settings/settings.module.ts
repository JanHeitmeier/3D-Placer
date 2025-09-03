import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SettingsPage } from './settings.page';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
         IonContent, IonList, IonItem, IonLabel, IonToggle, 
         IonRange, IonButton } from '@ionic/angular/standalone';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: SettingsPage
      }
    ]),
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
  ],
  declarations: [SettingsPage]
})
export class SettingsPageModule {}
