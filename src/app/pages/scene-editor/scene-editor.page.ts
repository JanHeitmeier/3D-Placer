import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-scene-editor',
  templateUrl: './scene-editor.page.html',
  styleUrls: ['./scene-editor.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent]
})
export class SceneEditorPage implements OnInit {

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    const sceneId = this.route.snapshot.paramMap.get('id');
  }

}
