import { SceneObject } from './scene-object.model';

export interface Scene {
  id: string;
  name: string;
  lastModified: number;
  objects: SceneObject[];     
  thumbnailPath?: string; 
}
