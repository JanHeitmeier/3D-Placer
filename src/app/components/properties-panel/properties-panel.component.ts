import { Component, OnInit } from '@angular/core';
import { ThreeJsService } from '../../core/services/three-js.service';
import { Subscription } from 'rxjs';
import * as THREE from 'three';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel, IonInput } from '@ionic/angular/standalone';

@Component({
  selector: 'app-properties-panel',
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss'],
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, IonInput]
})
export class PropertiesPanelComponent implements OnInit {
  selectedObject: THREE.Object3D | null = null;
  private subscription!: Subscription;

  constructor(private threeJsService: ThreeJsService) { }

  ngOnInit() {
    this.subscription = this.threeJsService.selectedObject$.subscribe(obj => {
      this.selectedObject = obj;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  onPositionChange(axis: 'x' | 'y' | 'z', event: any) {
    if (this.selectedObject) {
      const newPosition = this.selectedObject.position.clone();
      newPosition[axis] = event.detail.value;
      this.threeJsService.setSelectedObjectPosition(newPosition.x, newPosition.y, newPosition.z);
    }
  }
}
