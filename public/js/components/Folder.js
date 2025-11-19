export class Folder {
    constructor(folderData, onSelect, onDelete, onDoubleClick) {
        this.id = folderData.id;
        this.name = folderData.name;
        this.x = folderData.x;
        this.y = folderData.y;
        this.onSelect = onSelect;
        this.onDelete = onDelete;
        this.onDoubleClick = onDoubleClick;
        this.isSelected = false;
        this.element = this.createElement();
        this.setupEventListeners(desktopService);
        this.clickTimer = null;
    }

    createElement() {
        const element = document.createElement('div');
        element.className = 'folder';
        element.draggable = true;
        element.dataset.id = this.id;
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        element.innerHTML = `
            <div class="folder-icon">
                <img src="/images/folder_icon.png" alt="Dossier" width="64" height="64">
            </div>
            <div class="folder-name">${this.name}</div>
            <div class="folder-rename-input" style="display: none;">
                <input type="text" value="${this.name}" class="folder-rename-field">
            </div>
        `;
        return element;
    }

    setupEventListeners(desktopService) {
        // Gestion du clic simple (avec gestion du double-clic)
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Si c'est un clic sur le champ de renommage, on ne fait rien
            if (e.target.closest('.folder-rename-field')) {
                return;
            }
            
            if (this.isRenaming) {
                this.finishRenaming();
                return;
            }

            // Gestion de la sélection avec Ctrl/Cmd
            if (e.ctrlKey || e.metaKey) {
                this.toggleSelect();
            } else {
                this.select();
            }
            
            // Gestion du double-clic
            if (this.clickTimer) {
                clearTimeout(this.clickTimer);
                this.clickTimer = null;
                this.onDoubleClick(e);
            } else {
                this.clickTimer = setTimeout(() => {
                    this.clickTimer = null;
                }, 300);
            }
        });

        // Gestion du glisser-déposer
        this.element.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            this.isDragging = true;
            this.element.classList.add('dragging');
            
            // Stocker les données du dossier déplacé
            e.dataTransfer.setData('application/x-folder', JSON.stringify({
                id: this.id,
                name: this.name,
                x: this.x,
                y: this.y
            }));
            
            // Définir l'effet de déplacement
            e.dataTransfer.effectAllowed = 'move';
            
            // Définir l'élément de glissement personnalisé
            const dragImage = this.element.cloneNode(true);
            dragImage.style.position = 'fixed';
            dragImage.style.opacity = '0.8';
            dragImage.style.pointerEvents = 'none';
            dragImage.style.zIndex = '10000';
            document.body.appendChild(dragImage);
            
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            e.dataTransfer.setDragImage(dragImage, x, y);
            
            // Supprimer l'élément de glissement après un court délai
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });
        
        this.element.addEventListener('dragend', (e) => {
            e.stopPropagation();
            this.isDragging = false;
            this.element.classList.remove('dragging');
            
            // Mettre à jour la position après le déplacement
            const rect = this.element.getBoundingClientRect();
            this.x = rect.left;
            this.y = rect.top;
            
            // Notifier le parent du déplacement
            const moveEvent = new CustomEvent('folderMoved', {
                detail: {
                    id: this.id,
                    x: this.x,
                    y: this.y
                }
            });
            document.dispatchEvent(moveEvent);
        });
        
        // Empêcher le comportement par défaut pour les événements de glisser-déposer
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
        });
        
        this.element.addEventListener('dragleave', (e) => {
            e.stopPropagation();
        });
        
        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (e.dataTransfer.types.includes('application/x-folder')) {
                const folderData = JSON.parse(e.dataTransfer.getData('application/x-folder'));
                
                // Ne rien faire si c'est le même dossier
                if (folderData.id === this.id) return;
                
                // Déclencher un événement pour gérer le déplacement dans le composant parent
                const dropEvent = new CustomEvent('folderDropped', {
                    detail: {
                        sourceId: folderData.id,
                        targetId: this.id
                    }
                });
                document.dispatchEvent(dropEvent);
            }
        });

        // Gestion du double-clic
        this.element.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (!this.isRenaming) {
                this.onDoubleClick(e);
                // Émettre un événement pour ouvrir le dossier
                const openEvent = new CustomEvent('openFolder', {
                    detail: {
                        folderId: this.id,
                        folderName: this.name,
                        path: this.path || '/'
                    }
                });
                document.dispatchEvent(openEvent);
            }
        });

        // Gestion du clic droit
        this.element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.onSelect) {
                this.onSelect(this, false, true); // isContextMenu = true
            }
        });

        // Gestion du glisser-déposer
        this.element.draggable = true;
        this.element.addEventListener('dragstart', (e) => this.handleDragStart(e));
        
        // Gestion du dépôt de fichiers
        this.element.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.element.addEventListener('dragleave', () => this.handleDragLeave());
        this.element.addEventListener('drop', (e) => this.handleFileDrop(e));
        
        // Gestion du glisser-déposer pour les dossiers
        this.element.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.element.addEventListener('dragleave', () => this.handleDragLeave());
        this.element.addEventListener('drop', (e) => this.handleFolderDrop(e));
        
        // Gestion du renommage
        const renameField = this.element.querySelector('.folder-rename-field');
        if (renameField) {
            renameField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.finishRenaming();
                } else if (e.key === 'Escape') {
                    this.cancelRenaming();
                }
            });
            
            renameField.addEventListener('blur', () => {
                this.finishRenaming();
            });
            
            renameField.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    handleDragStart(e) {
        e.dataTransfer.setData('application/x-folder', JSON.stringify({
            id: this.id,
            name: this.name,
            type: 'folder',
            path: this.path || '/'
        }));
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(this.element, 20, 20);
    }
    
    handleDragOver(e) {
        if (e.dataTransfer.types.includes('application/x-folder')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.element.classList.add('drag-over');
        }
    }
    
    handleDragLeave() {
        this.element.classList.remove('drag-over');
    }
    
    async handleDrop(e) {
        e.preventDefault();
        this.element.classList.remove('drag-over');
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/x-folder'));
            if (data && data.id !== this.id) {
                // Émettre un événement pour indiquer qu'un dossier a été déposé sur ce dossier
                const dropEvent = new CustomEvent('folderDropped', {
                    detail: {
                        sourceId: data.id,
                        targetId: this.id
                    }
                });
                document.dispatchEvent(dropEvent);
            }
        } catch (error) {
            console.error('Erreur lors du traitement du dépôt :', error);
        }
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }
    
    remove() {
        // Supprimer tous les écouteurs d'événements
        const clone = this.element.cloneNode(true);
        this.element.parentNode.replaceChild(clone, this.element);
        this.element = null;
    }
    
    select(selected, multiSelect = false) {
        this.isSelected = selected;
        if (selected) {
            this.element.classList.add('selected');
        } else {
            this.element.classList.remove('selected');
        }
    }

    startRenaming() {
        const nameElement = this.element.querySelector('.folder-name');
        const renameInput = this.element.querySelector('.folder-rename-input');
        const renameField = this.element.querySelector('.folder-rename-field');
        
        if (nameElement && renameInput && renameField) {
            nameElement.style.display = 'none';
            renameInput.style.display = 'block';
            renameField.value = this.name;
            renameField.focus();
            renameField.select();
        }
    }

    finishRenaming() {
        const nameElement = this.element.querySelector('.folder-name');
        const renameInput = this.element.querySelector('.folder-rename-input');
        const renameField = this.element.querySelector('.folder-rename-field');
        
        if (nameElement && renameInput && renameField) {
            const newName = renameField.value.trim();
            if (newName && newName !== this.name) {
                this.name = newName;
                nameElement.textContent = newName;
                // Ici, vous pourriez appeler une méthode pour mettre à jour le nom dans le stockage
            }
            
            nameElement.style.display = '';
            renameInput.style.display = 'none';
        }
    }

    cancelRenaming() {
        const nameElement = this.element.querySelector('.folder-name');
        const renameInput = this.element.querySelector('.folder-rename-input');
        
        if (nameElement && renameInput) {
            nameElement.style.display = '';
            renameInput.style.display = 'none';
        }
    }

    remove() {
        this.element.remove();
    }
}
