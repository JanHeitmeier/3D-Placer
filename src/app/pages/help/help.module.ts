import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HelpPage } from './help.page';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent 
} from '@ionic/angular/standalone';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: HelpPage
      }
    ]),
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent
  ],
  declarations: [HelpPage]
})
export class HelpPageModule {}