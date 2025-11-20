import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DesktopComponent } from './components/desktop/desktop.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DesktopComponent],
  template: `
    <app-desktop></app-desktop>
    <router-outlet />
  `,
  styles: []
})
export class AppComponent {
  title = 'Bureau Windows - Angular';
}
