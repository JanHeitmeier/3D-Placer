import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { ModelInfo } from '../models/model-info.model';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModelManagerService {
  private readonly MODELS_MANIFEST_KEY = 'models-manifest.json';
  private modelsSubject = new BehaviorSubject<ModelInfo[]>([]);
  public models$: Observable<ModelInfo[]> = this.modelsSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadModelsFromStorage();
  }

  private async loadModelsFromStorage(): Promise<void> {
    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
    this.modelsSubject.next(manifest.models);
  }

  async importModel(sourceUri: string, name: string): Promise<void> {
    const modelId = uuidv4();
    const extension = name.split('.').pop()?.toLowerCase() || 'glb';
    const destinationPath = `models/model_${modelId}.${extension}`;
    await this.storageService.copyFile(sourceUri, destinationPath);

    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
    const newModel: ModelInfo = { id: modelId, name: name, path: destinationPath };
    manifest.models.push(newModel);
    await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);
    this.modelsSubject.next(manifest.models);
  }

  async getModelPath(modelId: string): Promise<string | null> {
    const models = this.modelsSubject.getValue();
    const model = models.find(m => m.id === modelId);
    if (!model) {
      return null;
    }
    const fileUri = await Filesystem.getUri({
      directory: Directory.Data,
      path: model.path
    });
    return Capacitor.convertFileSrc(fileUri.uri);
  }

  async saveThumbnail(modelId: string, imageData: string): Promise<void> {
    const thumbnailPath = `thumbnails/thumb_${modelId}.png`;
    await this.storageService.saveBase64(thumbnailPath, imageData);

    const manifest = await this.storageService.readJSON(this.MODELS_MANIFEST_KEY) || { models: [] };
    const modelIndex = manifest.models.findIndex((m: ModelInfo) => m.id === modelId);

    if (modelIndex > -1) {
      manifest.models[modelIndex].thumbnailPath = thumbnailPath;
      await this.storageService.saveJSON(this.MODELS_MANIFEST_KEY, manifest);
      this.modelsSubject.next(manifest.models);
    }
  }

  async getThumbnailUrl(modelId: string): Promise<string | null> {
    const models = this.modelsSubject.getValue();
    const model = models.find(m => m.id === modelId);
    if (!model || !model.thumbnailPath) {
      return null;
    }
    const fileUri = await Filesystem.getUri({
      directory: Directory.Data,
      path: model.thumbnailPath
    });
    return Capacitor.convertFileSrc(fileUri.uri);
  }
}
