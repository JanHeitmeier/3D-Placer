export interface ModelInfo {
  // Basic
  id: string;
  name: string;
  path: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  thumbnailGenerated?: boolean;

  // Texture 
  texturePath?: string;
  textureUrl?: string;
  textureProjection?: 'box' | 'cylinder';
  textureOffsetU?: number;
  textureOffsetV?: number;
  textureScaleU?: number;
  textureScaleV?: number;
}
