import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'model-library',
    pathMatch: 'full',
  },
  {
    path: 'model-library',
    loadComponent: () => import('./pages/model-library/model-library.page').then(m => m.ModelLibraryPage)
  },
  {
    path: 'scenes',
    loadComponent: () => import('./pages/scenes/scenes.page').then(m => m.ScenesPage)
  },
  {
    path: 'model-editor',
    loadComponent: () => import('./pages/model-editor/model-editor.page').then(m => m.ModelEditorPage)
  },
  {
    path: 'model-editor/:id',
    loadComponent: () => import('./pages/model-editor/model-editor.page').then(m => m.ModelEditorPage)
  },
  {
    path: 'scene-editor',
    loadComponent: () => import('./pages/scene-editor/scene-editor.page').then(m => m.SceneEditorPage)
  },
  {
    path: 'scene-editor/:id',
    loadComponent: () => import('./pages/scene-editor/scene-editor.page').then(m => m.SceneEditorPage)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage)
  },
  {
    path: 'help',
    loadComponent: () => import('./pages/help/help.page').then(m => m.HelpPage)
  }
];
