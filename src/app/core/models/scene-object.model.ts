export interface SceneObject {
  id: string;        // Unique ID
  modelId: string;   // Reference zu model in model manager
  name?: string;     // Optional name
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}