import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ThreeJsService } from '../../core/services/three-js.service';

@Component({
  selector: 'app-three-viewport',
  templateUrl: './three-viewport.component.html',
  styleUrls: ['./three-viewport.component.scss'],
  standalone: true,
})
export class ThreeViewportComponent implements AfterViewInit {
  @ViewChild('container') containerRef!: ElementRef;

  constructor(private threeJsService: ThreeJsService) { }

  ngAfterViewInit() {
    this.threeJsService.init(this.containerRef.nativeElement);
  }
}
