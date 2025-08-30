export interface SceneObject {
  objectId: string; // Unique ID for this object instance
  modelId: string;  // ID of the model from the ModelManager
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface Scene {
  id: string;
  name: string;
  lastModified: number;
  objects: SceneObject[];
  backgroundImageUrl?: string; // Optional background from the asset API
}
