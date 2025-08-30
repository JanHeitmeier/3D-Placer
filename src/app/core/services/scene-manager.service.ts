import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { Scene } from '../models/scene.model';
import { v4 as uuidv4 } from 'uuid';
import { SceneInfo } from '../models/scene-info.model';

@Injectable({
  providedIn: 'root'
})
export class SceneManagerService {
  private readonly SCENES_MANIFEST_KEY = 'scenes-manifest.json';

  constructor(private storageService: StorageService) { }

  async getScenes(): Promise<SceneInfo[]> {
    const manifest = await this.storageService.readJSON(this.SCENES_MANIFEST_KEY) || { scenes: [] };
    return manifest.scenes;
  }

  async getScene(id: string): Promise<Scene> {
    return this.storageService.readJSON(`scenes/scene_${id}.json`);
  }

  async saveScene(scene: Scene): Promise<void> {
    scene.lastModified = Date.now();
    await this.storageService.saveJSON(`scenes/scene_${scene.id}.json`, scene);
    const manifest = await this.storageService.readJSON(this.SCENES_MANIFEST_KEY) || { scenes: [] };
    const sceneInfo: SceneInfo = { id: scene.id, name: scene.name, lastModified: scene.lastModified };
    const sceneIndex = manifest.scenes.findIndex((s: SceneInfo) => s.id === scene.id);
    if (sceneIndex > -1) {
      manifest.scenes[sceneIndex] = sceneInfo;
    } else {
      manifest.scenes.push(sceneInfo);
    }
    await this.storageService.saveJSON(this.SCENES_MANIFEST_KEY, manifest);
  }

  async createNewScene(name: string): Promise<Scene> {
    const newScene: Scene = {
      id: uuidv4(),
      name: name,
      lastModified: Date.now(),
      objects: [],
    };
    await this.saveScene(newScene);
    return newScene;
  }
}
