import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModelInfo } from '../../core/models/model-info.model';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-model-editor',
  templateUrl: './model-editor.page.html',
  styleUrls: ['./model-editor.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent]
})
export class ModelEditorPage implements OnInit {
  model: ModelInfo | undefined;

  constructor(private route: ActivatedRoute, private modelManager: ModelManagerService) { }

  ngOnInit() {
    const modelId = this.route.snapshot.paramMap.get('id');
    if (modelId) {
      // this.model = this.modelManager.getModel(modelId);
    }
  }

  save() {}

  deleteModel() {}

}
