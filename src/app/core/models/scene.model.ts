import { SceneObject } from './scene-object.model';

export interface Scene {
  id: string;
  name: string;
  lastModified: number;
  objects: SceneObject[];   // Array of model instances
  thumbnailPath?: string;   // Optional path to scene thumbnail
}
