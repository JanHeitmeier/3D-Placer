import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AssetService {

  constructor() { }

  getImageUrl(width: number, height: number): string {
    return `https://picsum.photos/${width}/${height}`;
  }
}
