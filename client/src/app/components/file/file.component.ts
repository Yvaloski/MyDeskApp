import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-file',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file" 
         [style.left.px]="file.x" 
         [style.top.px]="file.y"
         (mousedown)="onMouseDown($event)"
         (contextmenu)="onContextMenu($event)"
         (dblclick)="onDoubleClick($event)">
      <div class="file-icon">
        <i class="bi" [ngClass]="getFileIcon()"></i>
      </div>
      <div class="file-name">{{ file.name }}</div>
    </div>
  `,
  styles: []
})
export class FileComponent {
  @Input() file!: Item;
  @Output() moved = new EventEmitter<{ item: Item, x: number, y: number }>();
  @Output() contextmenu = new EventEmitter<MouseEvent>();
  @Output() dblclick = new EventEmitter<void>();

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private startLeft = 0;
  private startTop = 0;

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
    this.startLeft = this.file.x;
    this.startTop = this.file.y;
    
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    
    this.file.x = this.startLeft + dx;
    this.file.y = this.startTop + dy;
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.moved.emit({ 
      item: this.file, 
      x: this.file.x, 
      y: this.file.y 
    });
  }

  getFileIcon(): string {
    const extension = this.file.name.split('.').pop()?.toLowerCase() || '';
    const iconMap: { [key: string]: string } = {
      'jpg': 'bi-file-image',
      'jpeg': 'bi-file-image',
      'png': 'bi-file-image',
      'gif': 'bi-file-image',
      'pdf': 'bi-file-pdf',
      'doc': 'bi-file-word',
      'docx': 'bi-file-word',
      'xls': 'bi-file-excel',
      'xlsx': 'bi-file-excel',
      'zip': 'bi-file-zip',
      'rar': 'bi-file-zip'
    };
    return iconMap[extension] || 'bi-file-earmark-text';
  }
}
