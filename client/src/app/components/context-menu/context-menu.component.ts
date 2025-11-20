import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="context-menu visible" 
         [style.left.px]="x" 
         [style.top.px]="y">
      
      @if (target?.type === 'folder' || target?.type === 'file') {
        <div class="context-menu-section">
          <div class="context-menu-item" (click)="emitAction('open')">
            <i class="bi bi-folder2-open"></i> Ouvrir
          </div>
          <div class="context-menu-item" (click)="emitAction('openInNewWindow')">
            <i class="bi bi-window-plus"></i> Ouvrir dans une nouvelle fenêtre
          </div>
        </div>
        <div class="context-menu-divider"></div>
      }
      
      <div class="context-menu-section">
        <div class="context-menu-item" (click)="emitAction('newFolder')">
          <i class="bi bi-folder-plus"></i> Nouveau dossier
        </div>
        <div class="context-menu-item" (click)="emitAction('newFile')">
          <i class="bi bi-file-earmark-plus"></i> Nouveau fichier
        </div>
      </div>
      
      @if (target) {
        <div class="context-menu-divider"></div>
        <div class="context-menu-section">
          <div class="context-menu-item" (click)="emitAction('cut')">
            <i class="bi bi-scissors"></i> Couper
          </div>
          <div class="context-menu-item" (click)="emitAction('copy')">
            <i class="bi bi-files"></i> Copier
          </div>
          <div class="context-menu-item" (click)="emitAction('paste')">
            <i class="bi bi-clipboard"></i> Coller
          </div>
          <div class="context-menu-item" (click)="emitAction('rename')">
            <i class="bi bi-pencil"></i> Renommer
          </div>
          <div class="context-menu-item text-danger" (click)="emitAction('delete')">
            <i class="bi bi-trash"></i> Supprimer
          </div>
        </div>
      }
      
      <div class="context-menu-divider"></div>
      <div class="context-menu-section">
        @if (target) {
          <div class="context-menu-item" (click)="emitAction('properties')">
            <i class="bi bi-info-circle"></i> Propriétés
          </div>
        }
        <div class="context-menu-item" (click)="emitAction('refresh')">
          <i class="bi bi-arrow-clockwise"></i> Actualiser
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ContextMenuComponent {
  @Input() x = 0;
  @Input() y = 0;
  @Input() target: Item | null = null;
  @Output() action = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(): void {
    this.close.emit();
  }

  emitAction(actionName: string): void {
    this.action.emit(actionName);
  }
}
