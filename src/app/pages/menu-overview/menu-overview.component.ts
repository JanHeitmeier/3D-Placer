import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-overview',
  templateUrl: './menu-overview.component.html',
  styleUrls: ['./menu-overview.component.scss'],
})
export class MenuOverviewComponent {

  constructor(private router: Router) { }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
}
