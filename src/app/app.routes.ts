import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'scenes',
    pathMatch: 'full',
  },
  {
    path: 'scenes',
    loadComponent: () => import('./pages/scene-list/scene-list.page').then(m => m.SceneListPage)
  },
  {
    path: 'editor/:id',
    loadComponent: () => import('./pages/editor/editor.page').then(m => m.EditorPage)
  },
  {
    path: 'models',
    loadComponent: () => import('./pages/model-library/model-library.page').then(m => m.ModelLibraryPage)
  },
  {
    path: 'thumbnail-editor/:id',
    loadComponent: () => import('./pages/thumbnail-editor/thumbnail-editor.page').then(m => m.ThumbnailEditorPage)
  }
];
