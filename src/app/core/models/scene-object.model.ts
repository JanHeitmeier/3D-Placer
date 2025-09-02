export interface SceneObject {
  id: string;        // Unique instance ID
  modelId: string;   // Reference to the model in model manager
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}