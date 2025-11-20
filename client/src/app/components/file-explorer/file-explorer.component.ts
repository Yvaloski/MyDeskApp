import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesktopService } from '../../services/desktop.service';
import { Item } from '../../models/item.model';

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.css']
})
export class FileExplorerComponent implements OnInit {
  @Input() path = '/';
  @Output() close = new EventEmitter<void>();

  items: Item[] = [];
  currentPath = '/';
  loading = false;

  constructor(private desktopService: DesktopService) {}

  ngOnInit(): void {
    this.currentPath = this.path;
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.desktopService.getItemsInPath(this.currentPath).subscribe({
      next: (items) => {
        let filteredItems = items;
        if (this.currentPath === '/') {
          filteredItems = items.filter(item => !item.parentId);
        } else {
          filteredItems = items.filter(item => 
            item.path && item.path.startsWith(this.currentPath + '/') && 
            item.path.split('/').length === this.currentPath.split('/').length + 1
          );
        }
        
        this.items = filteredItems.sort((a, b) => {
          if (a.type === 'folder' && b.type !== 'folder') return -1;
          if (a.type !== 'folder' && b.type === 'folder') return 1;
          return a.name.localeCompare(b.name);
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement:', err);
        this.loading = false;
      }
    });
  }

  onClose(): void {
    this.close.emit();
  }

  navigateTo(folderName: string): void {
    this.currentPath = this.currentPath === '/' ? `/${folderName}` : `${this.currentPath}/${folderName}`;
    this.loadItems();
  }

  goToParent(): void {
    if (this.currentPath === '/') return;
    const parts = this.currentPath.split('/').filter(p => p);
    parts.pop();
    this.currentPath = parts.length > 0 ? '/' + parts.join('/') : '/';
    this.loadItems();
  }

  createNewFolder(): void {
    const name = prompt('Nom du nouveau dossier:');
    if (name) {
      const x = Math.floor(Math.random() * 500) + 50;
      const y = Math.floor(Math.random() * 500) + 50;
      this.desktopService.createFolder(name, null, x, y).subscribe(() => {
        this.loadItems();
      });
    }
  }

  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        this.desktopService.uploadFile(file, null).subscribe(() => {
          this.loadItems();
        });
      });
    }
  }

  getFileIcon(item: Item): string {
    if (item.type === 'folder') return 'bi-folder';
    
    const extension = item.name.split('.').pop()?.toLowerCase() || '';
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

  onItemDoubleClick(item: Item): void {
    if (item.type === 'folder') {
      this.navigateTo(item.name);
    } else {
      this.openFile(item);
    }
  }

  openFile(file: Item): void {
    alert(`Ouverture de ${file.name}\n\nL'éditeur de texte sera implémenté prochainement.`);
  }

  formatFileSize(bytes: number = 0): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
