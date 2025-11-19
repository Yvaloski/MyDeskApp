export class FileExplorer {
    constructor(desktopService) {
        this.desktopService = desktopService;
        this.currentPath = '/';
        this.history = ['/']; // Initialiser l'historique avec le dossier racine
        this.historyIndex = 0; // Index actuel dans l'historique
        this.element = this.createElement();
        this.setupEventListeners();
        this.updateView();
    }

    createElement() {
        const explorer = document.createElement('div');
        explorer.className = 'file-explorer';
        explorer.style.display = 'none';
        
        explorer.innerHTML = `
            <div class="file-explorer-header">
                <div class="file-explorer-path">Bureau</div>
                <button class="file-explorer-close">×</button>
            </div>
            <div class="file-explorer-toolbar">
                <button class="file-explorer-new-folder" title="Nouveau dossier">
                    <i class="bi bi-folder-plus"></i> Nouveau dossier
                </button>
                <button class="file-explorer-upload" title="Téléverser des fichiers">
                    <i class="bi bi-upload"></i> Téléverser
                </button>
                <input type="file" id="file-upload" style="display: none;" multiple>
            </div>
            <div class="file-explorer-content">
                <!-- Contenu du dossier -->
            </div>
        `;
        
        document.body.appendChild(explorer);
        return explorer;
    }

    setupEventListeners() {
        // Fermer l'explorateur
        this.element.querySelector('.file-explorer-close').addEventListener('click', () => {
            this.hide();
        });

        // Nouveau dossier
        this.element.querySelector('.file-explorer-new-folder').addEventListener('click', () => {
            const folderName = prompt('Nom du nouveau dossier :');
            if (folderName) {
                this.desktopService.createFolder(folderName, this.currentPath);
                this.updateView();
            }
        });

        // Téléverser des fichiers
        const fileInput = this.element.querySelector('#file-upload');
        this.element.querySelector('.file-explorer-upload').addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.uploadFiles(files);
            fileInput.value = ''; // Réinitialiser l'input
        });

        // Glisser-déposer
        const content = this.element.querySelector('.file-explorer-content');
        
        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            content.classList.add('drag-over');
        });
        
        content.addEventListener('dragleave', () => {
            content.classList.remove('drag-over');
        });
        
        content.addEventListener('drop', (e) => {
            e.preventDefault();
            content.classList.remove('drag-over');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.uploadFiles(Array.from(e.dataTransfer.files));
            }
        });
    }

    show(path = '/') {
        this.currentPath = path;
        this.updateView();
        this.element.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.element.style.display = 'none';
        document.body.style.overflow = '';
    }

    updateView() {
        const content = this.element.querySelector('.file-explorer-content');
        content.innerHTML = '';

        // Afficher le chemin actuel
        const pathElement = this.element.querySelector('.file-explorer-path');
        pathElement.textContent = this.currentPath === '/' ? 'Bureau' : this.currentPath;

        // Ajouter un bouton pour remonter d'un niveau si on n'est pas à la racine
        if (this.currentPath !== '/') {
            const upButton = document.createElement('button');
            upButton.className = 'file-explorer-up';
            upButton.innerHTML = '<i class="bi bi-arrow-up"></i> Dossier parent';
            upButton.addEventListener('click', () => this.goToParent());
            content.appendChild(upButton);
        }

        // Récupérer et afficher les éléments du dossier actuel
        const items = this.desktopService.getItemsInPath(this.currentPath);
        
        if (items.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'file-explorer-empty';
            emptyMessage.textContent = 'Ce dossier est vide';
            content.appendChild(emptyMessage);
            return;
        }
        
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = `file-explorer-item ${item.type}`;
            itemElement.draggable = true;
            itemElement.dataset.id = item.id;

            const icon = item.type === 'folder' ? 'bi-folder' : 'bi-file-earmark';
            
            itemElement.innerHTML = `
                <div class="file-explorer-icon">
                    <i class="bi ${icon}"></i>
                </div>
                <div class="file-explorer-name">${item.name}</div>
            `;

            // Double-clic pour ouvrir le dossier ou le fichier
            itemElement.addEventListener('dblclick', () => {
                if (item.type === 'folder') {
                    this.currentPath = `${this.currentPath}${this.currentPath === '/' ? '' : '/'}${item.name}`;
                    this.updateView();
                } else {
                    // Ouvrir le fichier (à implémenter)
                    console.log('Ouvrir le fichier :', item);
                }
            });

            content.appendChild(itemElement);
        });
    }

    // Méthode pour téléverser des fichiers
    uploadFiles(files) {
        files.forEach(file => {
            this.desktopService.addFile(file, this.currentPath);
        });
        this.updateView();
    }
    
    // Méthode pour revenir au dossier parent
    goToParent() {
        if (this.currentPath === '/') return;
        const pathParts = this.currentPath.split('/');
        pathParts.pop();
        this.currentPath = pathParts.join('/') || '/';
        this.updateView();
    }
    
    // Méthode pour naviguer vers un dossier
    navigateTo(path) {
        this.currentPath = path;
        this.updateView();
    }
    
    // Gestion du glisser-déposer
    setupDragAndDrop() {
        const content = this.element.querySelector('.file-explorer-content');
        
        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            content.classList.add('drag-over');
        });
        
        content.addEventListener('dragleave', () => {
            content.classList.remove('drag-over');
        });
        
        content.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            content.classList.add('drag-over');
        });

        content.addEventListener('dragleave', () => {
            content.classList.remove('drag-over');
        });

        content.addEventListener('drop', (e) => {
            e.preventDefault();
            content.classList.remove('drag-over');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.uploadFiles(Array.from(e.dataTransfer.files));
            }
        });
    }

    show(path = '/') {
        this.currentPath = path;
        this.updateView();
        this.element.style.display = 'block';
        // Empêcher le défilement de la page
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.element.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Téléverser des fichiers
    async uploadFiles(files) {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            // Use window.location.origin to get the current server's origin
            const uploadUrl = `${window.location.origin}/upload`;
            console.log('Uploading to:', uploadUrl);
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                // Don't set Content-Type header, let the browser set it with the correct boundary
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload error response:', errorText);
                throw new Error(`Échec du téléversement des fichiers: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Fichiers téléversés avec succès:', result);
            
            // Ajouter les fichiers au DesktopService
            if (result.files && Array.isArray(result.files)) {
                result.files.forEach(fileInfo => {
                    this.desktopService.addItem({
                        type: 'file',
                        name: fileInfo.originalname,
                        path: this.currentPath,
                        size: fileInfo.size,
                        mimeType: fileInfo.mimetype,
                        url: fileInfo.path
                    });
                });
            }
            
            // Recharger le contenu du dossier
            this.updateView();
        } catch (error) {
            console.error('Erreur lors du téléversement des fichiers:', error);
            alert('Une erreur est survenue lors du téléversement des fichiers: ' + error.message);
        }
    }

    updateView() {
        // Mettre à jour le chemin affiché
        const pathElement = this.element.querySelector('.file-explorer-path');
        pathElement.textContent = this.currentPath === '/' ? 'Bureau' : this.currentPath;

        // Mettre à jour le contenu du dossier
        const content = this.element.querySelector('.file-explorer-content');
        content.innerHTML = '';
        
        try {
            // Récupérer les dossiers et fichiers du dossier courant depuis le service
            const items = this.desktopService.getItemsInPath(this.currentPath);
            
            // Afficher les dossiers d'abord
            const folders = items.filter(item => item.type === 'folder');
            folders.forEach(folder => {
                const folderElement = this.createFolderElement(folder);
                content.appendChild(folderElement);
            });
            
            // Puis les fichiers
            const files = items.filter(item => item.type === 'file');
            files.forEach(file => {
                const fileElement = this.createFileElement(file);
                content.appendChild(fileElement);
            });
            
            // Si le dossier est vide
            if (items.length === 0) {
                content.innerHTML = '<div class="empty-folder">Ce dossier est vide</div>';
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la vue:', error);
            content.innerHTML = '<div class="error">Erreur lors du chargement du contenu</div>';
        }
    }

    // Créer un élément de dossier
    createFolderElement(folder) {
        const folderElement = document.createElement('div');
        folderElement.className = 'file-explorer-folder';
        folderElement.draggable = true;
        folderElement.innerHTML = `
            <div class="file-explorer-folder-icon">
                <img src="/images/folder_icon.png" alt="Dossier" width="64" height="64">
            </div>
            <div class="file-explorer-folder-name">${folder.name}</div>
        `;
        
        // Gestion du double-clic pour ouvrir le dossier
        folderElement.addEventListener('dblclick', () => {
            this.navigateTo(folder.name);
        });
        
        // Gestion du clic droit pour le menu contextuel
        folderElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.position = 'absolute';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
            menu.style.zIndex = '1000';
            menu.style.backgroundColor = 'white';
            menu.style.border = '1px solid #ccc';
            menu.style.borderRadius = '4px';
            menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            menu.style.padding = '5px 0';
            
            menu.innerHTML = `
                <div class="context-menu-item" data-action="open" style="padding: 8px 15px; cursor: pointer;">Ouvrir</div>
                <div class="context-menu-item" data-action="rename" style="padding: 8px 15px; cursor: pointer;">Renommer</div>
                <div class="context-menu-item" data-action="delete" style="padding: 8px 15px; cursor: pointer; color: #ff4444;">Supprimer</div>
            `;
            
            // Fermer les autres menus ouverts
            document.querySelectorAll('.context-menu').forEach(el => el.remove());
            document.body.appendChild(menu);
            
            // Gestion des clics sur le menu
            const handleMenuClick = (e) => {
                const action = e.target.dataset.action;
                if (action === 'delete') {
                    if (confirm(`Voulez-vous vraiment supprimer le dossier "${folder.name}" ?`)) {
                        this.desktopService.removeItem(folder.id);
                        this.updateView();
                    }
                } else if (action === 'rename') {
                    this.renameFolder(folder);
                } else if (action === 'open') {
                    this.navigateTo(folder.name);
                }
                menu.remove();
                document.removeEventListener('click', handleOutsideClick);
            };
            
            const handleOutsideClick = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', handleOutsideClick);
                }
            };
            
            menu.addEventListener('click', handleMenuClick);
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick);
            }, 0);
        });
        
        // Gestion du glisser-déposer
        folderElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-folder', JSON.stringify({
                id: folder.id,
                name: folder.name,
                type: 'folder',
                path: this.currentPath
            }));
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setDragImage(folderElement, 20, 20);
        });
        
        return folderElement;
    }
    
    // Créer un élément de fichier
    createFileElement(file) {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-explorer-file';
        fileElement.draggable = true;
        
        // Déterminer l'icône en fonction du type de fichier
        let iconUrl = '/images/file_icon.png';
        if (file.mimeType) {
            if (file.mimeType.startsWith('image/')) {
                iconUrl = file.url || iconUrl; // Afficher l'aperçu pour les images
            } else if (file.mimeType.includes('pdf')) {
                iconUrl = '/images/pdf_icon.png';
            } else if (file.mimeType.includes('word') || file.mimeType.includes('document')) {
                iconUrl = '/images/word_icon.png';
            } else if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet')) {
                iconUrl = '/images/excel_icon.png';
            }
        }
        
        fileElement.innerHTML = `
            <div class="file-explorer-file-icon">
                <img src="${iconUrl}" alt="${file.name}" width="64" height="64" style="${file.mimeType && file.mimeType.startsWith('image/') ? 'object-fit: cover;' : ''}">
            </div>
            <div class="file-explorer-file-name">${file.name}</div>
            <div class="file-explorer-file-size">${this.formatFileSize(file.size)}</div>
        `;
        
        // Gestion du double-clic pour ouvrir le fichier
        fileElement.addEventListener('dblclick', () => {
            window.open(file.url || `/${file.path}`, '_blank');
        });
        
        // Gestion du clic droit pour le menu contextuel
        fileElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.position = 'absolute';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
            menu.style.zIndex = '1000';
            menu.style.backgroundColor = 'white';
            menu.style.border = '1px solid #ccc';
            menu.style.borderRadius = '4px';
            menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            menu.style.padding = '5px 0';
            
            menu.innerHTML = `
                <div class="context-menu-item" data-action="open" style="padding: 8px 15px; cursor: pointer;">Ouvrir</div>
                <div class="context-menu-item" data-action="rename" style="padding: 8px 15px; cursor: pointer;">Renommer</div>
                <div class="context-menu-item" data-action="delete" style="padding: 8px 15px; cursor: pointer; color: #ff4444;">Supprimer</div>
            `;
            
            // Fermer les autres menus ouverts
            document.querySelectorAll('.context-menu').forEach(el => el.remove());
            document.body.appendChild(menu);
            
            // Gestion des clics sur le menu
            const handleMenuClick = (e) => {
                const action = e.target.dataset.action;
                if (action === 'delete') {
                    if (confirm(`Voulez-vous vraiment supprimer le fichier "${file.name}" ?`)) {
                        this.desktopService.removeItem(file.id);
                        this.updateView();
                    }
                } else if (action === 'rename') {
                    this.renameFile(file);
                } else if (action === 'open') {
                    window.open(file.url || `/${file.path}`, '_blank');
                }
                menu.remove();
                document.removeEventListener('click', handleOutsideClick);
            };
            
            const handleOutsideClick = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', handleOutsideClick);
                }
            };
            
            menu.addEventListener('click', handleMenuClick);
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick);
            }, 0);
        });
        
        // Gestion du glisser-déposer
        fileElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/x-file', JSON.stringify({
                id: file.id,
                name: file.name,
                type: 'file',
                path: this.currentPath
            }));
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setDragImage(fileElement, 20, 20);
        });
        
        return fileElement;
    }
    
    // Formater la taille du fichier en Ko, Mo, Go, etc.
    formatFileSize(bytes) {
        if (!bytes) return '0 Octets';
        const k = 1024;
        const sizes = ['Octets', 'Ko', 'Mo', 'Go', 'To'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    navigateTo(folderName) {
        // Ne rien faire si le nom du dossier est vide
        if (!folderName) return;
        
        // Construire le nouveau chemin
        const newPath = this.currentPath === '/' 
            ? `/${folderName}` 
            : `${this.currentPath}/${folderName}`;
        
        // Ne rien faire si on essaie de naviguer vers le même dossier
        if (newPath === this.currentPath) return;
        
        // Mettre à jour l'historique
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(newPath);
        this.historyIndex++;
        
        // Mettre à jour le chemin actuel et rafraîchir la vue
        this.currentPath = newPath;
        this.updateView();
        
        // Mettre à jour l'affichage du chemin
        const pathElement = this.element.querySelector('.file-explorer-path');
        if (pathElement) {
            pathElement.textContent = this.currentPath === '/' ? 'Bureau' : this.currentPath;
        }
    }

    navigateToParent() {
        if (this.currentPath === '/') return;
        
        const parentPath = this.currentPath.split('/').slice(0, -1).join('/') || '/';
        this.navigateToPath(parentPath);
    }

    navigateToPath(path) {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(path);
        this.historyIndex++;
        
        this.currentPath = path;
        this.updateView();
    }
    
    // Méthode pour renommer un dossier
    renameFolder(folder) {
        const newName = prompt('Nouveau nom du dossier :', folder.name);
        if (newName && newName.trim() !== '' && newName !== folder.name) {
            const index = this.desktopService.items.findIndex(item => item.id === folder.id);
            if (index !== -1) {
                this.desktopService.items[index].name = newName.trim();
                this.desktopService.saveItems();
                this.updateView();
            }
        }
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentPath = this.history[this.historyIndex];
            this.updateView();
            
            // Mettre à jour l'affichage du chemin
            const pathElement = this.element.querySelector('.file-explorer-path');
            if (pathElement) {
                pathElement.textContent = this.currentPath === '/' ? 'Bureau' : this.currentPath;
            }
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentPath = this.history[this.historyIndex];
            this.updateView();
            
            // Mettre à jour l'affichage du chemin
            const pathElement = this.element.querySelector('.file-explorer-path');
            if (pathElement) {
                pathElement.textContent = this.currentPath === '/' ? 'Bureau' : this.currentPath;
            }
            this.updateView();
        }
    }

    createNewFolder() {
        // Implémentez la création d'un nouveau dossier
        const folderName = prompt('Nom du nouveau dossier :');
        if (folderName) {
            // Ici, vous devriez ajouter la logique pour créer un nouveau dossier
            console.log(`Création du dossier : ${this.currentPath}/${folderName}`);
            this.updateView();
        }
    }

    handleDrop(e) {
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/x-folder'));
            if (data) {
                // Ici, vous devriez implémenter la logique pour déplacer le dossier
                console.log(`Déplacement de ${data.path}/${data.name} vers ${this.currentPath}`);
                
                // Mettre à jour la vue
                this.updateView();
                
                // Émettre un événement pour informer l'application du déplacement
                const event = new CustomEvent('folderMoved', {
                    detail: {
                        sourceId: data.id,
                        sourcePath: data.path,
                        targetPath: this.currentPath
                    }
                });
                document.dispatchEvent(event);
            }
        } catch (error) {
            console.error('Erreur lors du traitement du dépôt :', error);
        }
    }
}
