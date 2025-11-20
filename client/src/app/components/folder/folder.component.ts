import {Component, Input, Output, EventEmitter, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-folder',
  standalone: true,
    imports: [CommonModule],
  template: `
      <div class="folder"
           [style.left.px]="folder.x"
           [style.top.px]="folder.y"
           (mousedown)="onMouseDown($event)"
           (contextmenu)="onContextMenu($event)"
           (dblclick)="onDoubleClick($event)">
          <div class="folder-icon">
              <img src="/assets/images/Folder.ico" alt="Dossier" width="64" height="64" draggable="false">
          </div>
          <div class="folder-name">{{ folder.name }}</div>
      </div>
  `,
  styles: []
})
export class FolderComponent {
  @Input() folder!: Item;
  @Output() moved = new EventEmitter<{ item: Item, x: number, y: number }>();
  @Output() contextmenu = new EventEmitter<MouseEvent>();
  @Output() dblclick = new EventEmitter<void>();

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private startLeft = 0;
  private startTop = 0;

  constructor() {}

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextmenu.emit(event);
  }

  onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dblclick.emit();
  }

  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    
    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startLeft = this.folder.x;
    this.startTop = this.folder.y;
    
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    
    this.folder.x = this.startLeft + dx;
    this.folder.y = this.startTop + dy;
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    // Mettre à jour la position dans le composant parent
    this.moved.emit({ 
      item: this.folder, 
      x: this.folder.x, 
      y: this.folder.y 
    });
  }
}
