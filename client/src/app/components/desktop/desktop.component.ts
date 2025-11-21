import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  isLoading = true;

  // Élément actuellement glissé
  private draggedItem: Item | null = null;
  // Élément cible actuel (pour le survol)
  private dropTarget: HTMLElement | null = null;
  // Classe CSS pour le style de survol
  private readonly DROP_TARGET_CLASS = 'drop-target';

  constructor(
    private desktopService: DesktopService,
    private cdr: ChangeDetectorRef
  ) {}

  private subscription: any;

  ngOnInit(): void {
    this.loadItems();
    
    // S'abonner aux mises à jour du service
    this.subscription = this.desktopService.items$.subscribe({
      next: (items) => {
        console.log('Mise à jour des éléments dans le composant:', items);
        // Filtrer les éléments à afficher sur le bureau
        this.items = items.filter(item => this.shouldDisplayOnDesktop(item));
        console.log('Éléments filtrés pour le bureau:', this.items);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des éléments:', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    // Nettoyer l'abonnement pour éviter les fuites de mémoire
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadItems(): void {
    this.isLoading = true;
    console.log('Chargement des éléments...');
    this.desktopService.loadItems();
  }

  // Fonction pour déterminer si un élément doit être affiché sur le bureau
  private shouldDisplayOnDesktop(item: Item): boolean {
    // Afficher les éléments sans parent ou avec parent null/undefined/''
    const shouldDisplay = !item.parentId || 
                        item.parentId === '' || 
                        item.parentId === null || 
                        item.parentId === undefined ||
                        item.parentId === 'null' ||
                        item.parentId === 'undefined';
    
    console.log(`Élément ${item.name} (${item.id}) - parentId: ${item.parentId} - Afficher: ${shouldDisplay}`);
    return shouldDisplay;
  }

  onContextMenu(event: MouseEvent, item?: Item): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuTarget = item || null;
    this.showContextMenu = true;
  }

  // Gestion du début du glissement
  onDragStart(event: DragEvent, item: Item): void {
    if (!event.dataTransfer) return;
    
    // Stocker l'élément en cours de déplacement
    this.draggedItem = item;
    
    // Définir les données de l'élément déplacé
    event.dataTransfer.setData('text/plain', item.id);
    event.dataTransfer.effectAllowed = 'move';
    
    // Définir l'image de glissement personnalisée (optionnel)
    const element = event.currentTarget as HTMLElement;
    if (element) {
      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      
      // Créer un élément temporaire pour l'image de glissement
      const dragImage = element.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.left = '-9999px';
      document.body.appendChild(dragImage);
      
      // Définir l'image de glissement
      event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
      
      // Nettoyer après un court délai
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  }
  
  // Trouver l'élément draggable parent
  private findDraggableElement(element: HTMLElement | null): HTMLElement | null {
    while (element && !element.classList.contains('draggable-item') && element !== document.body) {
      element = element.parentElement;
    }
    return element?.classList.contains('draggable-item') ? element : null;
  }

  // Gestion de la fin du glissement
  onDragEnd(event: DragEvent): void {
    // Nettoyer la cible de dépôt
    this.clearDropTarget();
    this.draggedItem = null;
  }

  // Gestion du survol d'un élément pouvant recevoir un dépôt
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    
    // Vérifier si dataTransfer est disponible
    if (!event.dataTransfer) {
      return;
    }
    
    const target = this.getDropTarget(event);
    if (!target) {
      console.log('Aucune cible valide pour le dépôt');
      return;
    }
    
    const targetId = target.getAttribute('data-item-id');
    console.log('Survol de la cible avec ID:', targetId);
    
    // Vérifier si on essaie de déplacer un dossier dans lui-même ou un de ses enfants
    if (this.draggedItem?.type === 'folder' && targetId && targetId !== 'root') {
      console.log('Vérification du déplacement d\'un dossier...');
      const targetItem = this.items.find(item => item.id === targetId);
      if (targetItem) {
        console.log('Cible trouvée:', targetItem);
        if (this.isDescendant(this.draggedItem, targetItem)) {
          console.log('Tentative de déplacement d\'un dossier dans lui-même ou un de ses sous-dossiers');
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'none';
          }
          return;
        }
      }
    }
    
    // Autoriser le dépôt
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.setDropTarget(target);
    console.log('Dépôt autorisé sur la cible');
  }

  // Gestion du départ du survol
  onDragLeave(event: DragEvent): void {
    const target = event.target as HTMLElement;
    if (this.dropTarget && this.dropTarget.contains(target)) {
      return;
    }
    this.clearDropTarget();
  }

  // Gestion du dépôt (fichiers ou éléments du bureau)
  onDrop(event: DragEvent): void {
    console.log('Début de la méthode onDrop');
    event.preventDefault();
    event.stopPropagation();
    
    // Gestion du dépôt de fichiers
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      console.log('Dépôt de fichiers détecté');
      Array.from(event.dataTransfer.files).forEach(file => {
        console.log('Téléversement du fichier:', file.name);
        this.desktopService.uploadFile(file).subscribe();
      });
      this.clearDropTarget();
      return;
    }
    
    // Gestion du dépôt d'éléments du bureau
    if (!this.draggedItem) {
      console.log('Aucun élément déplacé détecté');
      this.clearDropTarget();
      return;
    }
    
    console.log('Élément déplacé détecté:', this.draggedItem);
    
    // Vérifier si on est sur le bureau ou sur un dossier
    const target = this.getDropTarget(event);
    console.log('Cible du dépôt:', target);
    
    // Si pas de cible valide, on annule
    if (!target) {
      console.log('Aucune cible valide pour le dépôt');
      this.clearDropTarget();
      return;
    }
    
    const targetId = target.getAttribute('data-item-id');
    console.log('ID de la cible:', targetId);
    
    // Ne rien faire si on dépose sur l'élément lui-même
    if (targetId === this.draggedItem.id) {
      console.log('Dépôt sur soi-même, annulation');
      this.clearDropTarget();
      return;
    }
    
    // Déterminer le nouveau parent (null pour le bureau)
    const newParentId = targetId === 'root' || !targetId ? null : targetId;
    console.log('Nouveau parent ID:', newParentId);
    
    // Ne rien faire si le parent n'a pas changé
    if (newParentId === this.draggedItem.parentId) {
      console.log('Le parent n\'a pas changé, annulation du déplacement');
      this.clearDropTarget();
      return;
    }
    
    // Vérifier si on essaie de déplacer un dossier dans lui-même ou un de ses enfants
    if (this.draggedItem.type === 'folder' && targetId && targetId !== 'root') {
      const targetItem = this.items.find(item => item.id === targetId);
      if (targetItem && this.isDescendant(this.draggedItem, targetItem)) {
        console.error('Impossible de déplacer un dossier dans lui-même ou un de ses sous-dossiers');
        this.clearDropTarget();
        return;
      }
    }
    
    // Mettre à jour les coordonnées si on dépose sur le bureau
    if (!newParentId && event.dataTransfer) {
      const desktop = document.querySelector('.desktop');
      if (desktop) {
        const rect = desktop.getBoundingClientRect();
        this.draggedItem.x = event.clientX - rect.left - 20;
        this.draggedItem.y = event.clientY - rect.top - 20;
      }
    }
    
    // Si on dépose sur un dossier, utiliser moveItem
    if (newParentId) {
      console.log('Appel à moveItem avec:', { itemId: this.draggedItem.id, targetParentId: newParentId });
      this.desktopService.moveItem(this.draggedItem.id, newParentId).subscribe({
        next: (movedItem) => {
          console.log('Déplacement réussi, élément mis à jour:', movedItem);
          this.updateItemInList(movedItem);
          this.clearDropTarget();
        },
        error: (error) => {
          console.error('Erreur lors du déplacement de l\'élément:', error);
          if (error.error) {
            console.error('Détails de l\'erreur:', error.error);
          }
          this.clearDropTarget();
        }
      });
    } else {
      // Si on dépose sur le bureau, mettre à jour la position
      this.desktopService.updateItemPosition(
        this.draggedItem.id, 
        this.draggedItem.x, 
        this.draggedItem.y
      ).subscribe({
        next: (updatedItem) => {
          this.updateItemInList(updatedItem);
          this.clearDropTarget();
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour de la position:', error);
          this.clearDropTarget();
        }
      });
    }
  }

  // Méthode utilitaire pour mettre à jour un élément dans le tableau
  private updateItemInList(updatedItem: Item): void {
    const index = this.items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      this.items = [
        ...this.items.slice(0, index),
        { ...updatedItem },
        ...this.items.slice(index + 1)
      ];
      this.cdr.detectChanges();
    }
  }

  // Vérifier si un dossier est un descendant d'un autre
  private isDescendant(parent: Item, child: Item): boolean {
    // Si l'enfant n'a pas de parent, ce n'est pas un descendant
    if (!child.parentId) return false;
    
    // Si le parent direct correspond, c'est un descendant direct
    if (child.parentId === parent.id) return true;
    
    // Sinon, vérifier récursivement le parent
    const childParent = this.items.find(item => item.id === child.parentId);
    return childParent ? this.isDescendant(parent, childParent) : false;
  }
  // Obtenir la cible de dépôt à partir de l'événement
  private getDropTarget(event: DragEvent): HTMLElement | null {
    console.log('Recherche de la cible de dépôt...');
    let target = event.target as HTMLElement;
    
    console.log('Élément cible initial:', target);
    
    // Remonter jusqu'à trouver un élément avec data-item-id
    while (target && !target.hasAttribute('data-item-id') && target !== document.body) {
      target = target.parentElement as HTMLElement;
      console.log('Élément parent suivant:', target);
    }
    
    // Vérifier si on a trouvé une cible valide
    if (target && target.hasAttribute('data-item-id')) {
      const targetId = target.getAttribute('data-item-id');
      console.log('Cible potentielle trouvée avec ID:', targetId);
      
      // Vérifier si la cible est différente de l'élément déplacé
      if (targetId !== this.draggedItem?.id) {
        console.log('Cible valide:', target);
        return target;
      } else {
        console.log('Cible identique à l\'élément déplacé, ignorée');
      }
    } else {
      console.log('Aucune cible valide trouvée');
    }
    
    return null;
  }

  // Définir la cible de dépôt actuelle
  private setDropTarget(target: HTMLElement): void {
    // Nettoyer l'ancienne cible
    this.clearDropTarget();
    
    // Définir la nouvelle cible
    this.dropTarget = target;
  }

  // Nettoyer la cible de dépôt
  private clearDropTarget(): void {
    this.dropTarget = null;
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
      
      this.desktopService.createFolder(name, null, x, y).subscribe({
        next: () => {
          console.log('Dossier créé avec succès');
          // La liste sera mise à jour automatiquement via l'observable
        },
        error: (err) => {
          console.error('Erreur lors de la création du dossier:', err);
          alert('Erreur lors de la création du dossier: ' + (err.error?.message || 'Erreur inconnue'));
        }
      });
    }
  }

  createNewFile(): void {
    const name = prompt('Nom du nouveau fichier:', 'nouveau_fichier.txt');
    if (name) {
      const x = Math.floor(Math.random() * (window.innerWidth - 200)) + 50;
      const y = Math.floor(Math.random() * (window.innerHeight - 200)) + 50;
      
      this.desktopService.createFile(name, null, x, y).subscribe({
        next: () => {
          console.log('Fichier créé avec succès');
          // La liste sera mise à jour automatiquement via l'observable
        },
        error: (err) => {
          console.error('Erreur lors de la création du fichier:', err);
          alert('Erreur lors de la création du fichier: ' + (err.error?.message || 'Erreur inconnue'));
        }
      });
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
        next: () => {
          // La suppression a réussi, la liste est mise à jour automatiquement
          // grâce au BehaviorSubject dans le service
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression de l\'élément');
        }
      });
    }
  }

  // Gestion du déplacement d'un élément (changement de position x,y)
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
          this.updateItemInList(updatedItem);
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour de la position', err);
          // Annuler le déplacement en cas d'erreur
          item.x = event.item.x;
          item.y = event.item.y;
        }
      });
    }
  }

  onFileExplorerClose(): void {
    this.showFileExplorer = false;
  }
}
