import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-thumbnail-editor',
  template: `<ion-header><ion-toolbar><ion-title>Thumbnail</ion-title></ion-toolbar></ion-header><ion-content class="ion-padding">Redirecting to Model Editor...</ion-content>`,
  standalone: true,
})
export class ThumbnailEditorPage implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const auto = this.route.snapshot.queryParamMap.get('autoCapture');
    if (id) {
      // Redirect to model-editor and preserve query params
      this.router.navigate(['/model-editor', id], { queryParams: { autoCapture: auto } });
    } else {
      // fallback to model list
      this.router.navigate(['/models']);
    }
  }
}
