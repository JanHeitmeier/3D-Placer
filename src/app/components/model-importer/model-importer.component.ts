import { Component } from '@angular/core';
import { ModelManagerService } from '../../core/services/model-manager.service';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-model-importer',
  templateUrl: './model-importer.component.html',
  styleUrls: ['./model-importer.component.scss'],
  standalone: true,
  imports: [IonFab, IonFabButton, IonIcon]
})
export class ModelImporterComponent {

  constructor(private modelManager: ModelManagerService, private router: Router) { }

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
        // import and try auto-generate thumbnail inside service
        const newModel = await this.modelManager.importModel(path, name);
        // If auto-generation failed and model has no thumbnailPath, navigate to editor so user can create one
        const currentModels = await firstValueFrom(this.modelManager.models$);
        const fresh = currentModels.find(m => m.id === newModel.id);
        if (fresh && !fresh.thumbnailPath) {
          this.router.navigate(['/thumbnail-editor', fresh.id], { queryParams: { autoCapture: '1' } });
        }
      }
    }
  }
}
