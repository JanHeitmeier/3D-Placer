import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ModelEditorPage } from './model-editor.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: ModelEditorPage
      }
    ])
  ],
  declarations: [ModelEditorPage]
})
export class ModelEditorPageModule { }
