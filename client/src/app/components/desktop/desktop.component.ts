import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesktopService } from '../../services/desktop.service';
import { Item } from '../../models/item.model';
import { FolderComponent } from '../folder/folder.component';
import { FileComponent } from '../file/file.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { FileExplorerComponent } from '../file-explorer/file-explorer.component';

@Component({
  selector: 'app-desktop',
  standalone: true,
  imports: [CommonModule, FolderComponent, FileComponent, ContextMenuComponent, FileExplorerComponent],
  templateUrl: './desktop.component.html',
  styleUrls: ['./desktop.component.css']
})
export class DesktopComponent implements OnInit {
  items: Item[] = [];
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuTarget: Item | null = null;
  showFileExplorer = false;
  fileExplorerPath = '/';

  constructor(private desktopService: DesktopService) {}

  ngOnInit(): void {
    this.desktopService.items$.subscribe(items => {
      this.items = items.filter(item => !item.parentId || item.parentId === '/' || item.parentId === null);
    });
  }

  onContextMenu(event: MouseEvent, item?: Item): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuTarget = item || null;
    this.showContextMenu = true;
  }

  onContextMenuAction(action: string): void {
    this.showContextMenu = false;
    
    switch (action) {
      case 'newFolder':
        this.createNewFolder();
        break;
      case 'newFile':
        this.createNewFile();
        break;
      case 'open':
        if (this.contextMenuTarget) {
          this.openItem(this.contextMenuTarget);
        }
        break;
      case 'openInNewWindow':
        if (this.contextMenuTarget) {
          alert('Ouvrir dans une nouvelle fenêtre - À implémenter');
        }
        break;
      case 'cut':
        if (this.contextMenuTarget) {
          alert('Couper - À implémenter');
        }
        break;
      case 'copy':
        if (this.contextMenuTarget) {
          alert('Copier - À implémenter');
        }
        break;
      case 'paste':
        alert('Coller - À implémenter');
        break;
      case 'rename':
        if (this.contextMenuTarget) {
          this.renameItem(this.contextMenuTarget);
        }
        break;
      case 'delete':
        if (this.contextMenuTarget) {
          this.deleteItem(this.contextMenuTarget);
        }
        break;
      case 'properties':
        if (this.contextMenuTarget) {
          this.showProperties(this.contextMenuTarget);
        }
        break;
      case 'refresh':
        this.desktopService.loadItems();
        break;
    }
  }

  renameItem(item: Item): void {
    const newName = prompt('Nouveau nom:', item.name);
    if (newName && newName.trim()) {
      alert('Renommer - À implémenter dans l\'API');
      // TODO: Implémenter la route PATCH /items/:id/rename dans le service
    }
  }

  showProperties(item: Item): void {
    const props = `
Nom: ${item.name}
Type: ${item.type === 'folder' ? 'Dossier' : 'Fichier'}
ID: ${item.id}
Position: (${item.x}, ${item.y})
Créé: ${item.createdAt || 'N/A'}
Modifié: ${item.updatedAt || 'N/A'}
    `;
    alert(props);
  }

  createNewFolder(): void {
    const name = prompt('Nom du nouveau dossier:', 'Nouveau dossier');
    if (name) {
      const x = Math.floor(Math.random() * (window.innerWidth - 200)) + 50;
      const y = Math.floor(Math.random() * (window.innerHeight - 200)) + 50;
      this.desktopService.createFolder(name, null, x, y).subscribe();
    }
  }

  createNewFile(): void {
    const name = prompt('Nom du nouveau fichier:', 'nouveau_fichier.txt');
    if (name) {
      const x = Math.floor(Math.random() * (window.innerWidth - 200)) + 50;
      const y = Math.floor(Math.random() * (window.innerHeight - 200)) + 50;
      this.desktopService.createFile(name, null, x, y).subscribe();
    }
  }

  openItem(item: Item): void {
    if (item.type === 'folder') {
      this.fileExplorerPath = item.path || `/${item.name}`;
      this.showFileExplorer = true;
      console.log('Ouverture explorateur:', this.fileExplorerPath);
    } else if (item.type === 'file') {
      this.openFile(item);
    }
  }

  openFile(file: Item): void {
    // Pour l'instant, juste un log - on peut ajouter un éditeur plus tard
    console.log('Ouverture fichier:', file);
    alert(`Ouverture de ${file.name}\n\nL'éditeur de texte sera implémenté prochainement.`);
  }

  deleteItem(item: Item): void {
    if (confirm(`Voulez-vous vraiment supprimer ${item.name}?`)) {
      this.desktopService.deleteItem(item.id).subscribe({
        next: () => console.log('Item supprimé'),
        error: (err) => console.error('Erreur suppression:', err)
      });
    }
  }

  onItemMoved(event: { item: Item, x: number, y: number }): void {
    console.log('Déplacement détecté:', event);
    
    // Mettre à jour la position localement immédiatement pour un meilleur ressenti
    const item = this.items.find(i => i.id === event.item.id);
    if (item) {
      item.x = event.x;
      item.y = event.y;
      
      // Mettre à jour la position dans le service
      this.desktopService.updateItemPosition(item.id, event.x, event.y).subscribe({
        next: (updatedItem) => {
          console.log('Position mise à jour avec succès', updatedItem);
          // Mettre à jour l'élément dans la liste avec les données du serveur
          const index = this.items.findIndex(i => i.id === updatedItem.id);
          if (index !== -1) {
            this.items[index] = { ...this.items[index], ...updatedItem };
          }
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour de la position', err);
          // Annuler le déplacement en cas d'erreur
          if (item) {
            item.x = event.item.x;
            item.y = event.item.y;
          }
        }
      });
    }
  }

  onFileExplorerClose(): void {
    this.showFileExplorer = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files.length) {
      Array.from(event.dataTransfer.files).forEach(file => {
        this.desktopService.uploadFile(file).subscribe();
      });
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }
}
