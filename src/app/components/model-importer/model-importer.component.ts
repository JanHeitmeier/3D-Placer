import { Component } from '@angular/core';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-model-importer',
  templateUrl: './model-importer.component.html',
  styleUrls: ['./model-importer.component.scss'],
  standalone: true,
  imports: [IonFab, IonFabButton, IonIcon]
})
export class ModelImporterComponent {

  constructor(private modelManager: ModelManagerService) { }

  async importModel() {
    const result = await FilePicker.pickFiles({
      types: [
        'model/gltf-binary',
        'application/octet-stream',
        'model/obj',
        'model/vnd.collada+xml',
        'text/plain',
        'application/xml',
        'text/xml'
      ]
    });

    if (result.files.length > 0) {
      const file = result.files[0];
      const name = file.name;
      const path = file.path;
      if (path) {
        this.modelManager.importModel(path, name);
      }
    }
  }
}
