export interface ModelInfo {
  id: string;
  name: string;
  path: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  thumbnailGenerated?: boolean;

  // Texture properties
  texturePath?: string;
  textureUrl?: string;
  textureProjection?: 'box' | 'cylinder' | 'planar';
  textureOffsetU?: number;
  textureOffsetV?: number;
  textureScaleU?: number;
  textureScaleV?: number;
}
