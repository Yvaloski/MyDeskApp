export class FileExplorer {
    constructor(desktopService) {
        this.desktopService = desktopService;
        this.currentPath = '/';
        this.history = ['/'];
        this.historyIndex = 0;
        
        // Initialisation des gestionnaires d'événements
        this.handleDragOver = null;
        this.handleDragLeave = null;
        this.handleDrop = null;
        
        // Liaison des méthodes
        this.setupDropTarget = this.setupDropTarget.bind(this);
        this.onDragOver = this.onDragOver.bind(this);
        this.onDragLeave = this.onDragLeave.bind(this);
        this.onDrop = this.onDrop.bind(this);
        
        this.element = this.createElement();
        this.setupEventListeners();
        this.updateView();
    }

    createElement() {
        const element = document.createElement('div');
        element.className = 'file-explorer';
        element.style.display = 'none';
        
        element.innerHTML = `
            <div class="file-explorer-header">
                <div class="file-explorer-title">Explorateur de fichiers</div>
                <button class="file-explorer-close">&times;</button>
            </div>
            <div class="file-explorer-toolbar">
                <button class="file-explorer-btn" id="btnNewFolder">
                    <i class="bi bi-folder-plus"></i> Nouveau dossier
                </button>
                <button class="file-explorer-btn" id="btnUpload">
                    <i class="bi bi-upload"></i> Téléverser
                </button>
                <input type="file" id="fileInput" style="display: none;" multiple>
            </div>
            <div class="file-explorer-path"></div>
            <div class="file-explorer-content"></div>
        `;
        
        document.body.appendChild(element);
        return element;
    }

    setupEventListeners() {
        // Gestion du bouton de fermeture
        const closeBtn = this.element.querySelector('.file-explorer-close');
        closeBtn?.addEventListener('click', () => this.hide());

        // Gestion du bouton nouveau dossier
        const newFolderBtn = this.element.querySelector('#btnNewFolder');
        newFolderBtn?.addEventListener('click', () => this.createNewFolder());

        // Gestion du téléversement de fichiers
        const fileInput = this.element.querySelector('#fileInput');
        const uploadBtn = this.element.querySelector('#btnUpload');
        
        uploadBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files?.length > 0) {
                this.uploadFiles(e.target.files);
                e.target.value = '';
            }
        });

        // Gestion du glisser-déposer
        const content = this.element.querySelector('.file-explorer-content');
        
        // Gestion du glisser-déposer de fichiers externes
        content?.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            content.classList.add('drag-over');
        });
        
        content?.addEventListener('dragleave', (e) => {
            e.stopPropagation();
            content.classList.remove('drag-over');
        });
        
        content?.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            content.classList.remove('drag-over');
            
            // Gestion des fichiers glissés depuis l'extérieur
            if (e.dataTransfer?.files?.length > 0) {
                this.uploadFiles(e.dataTransfer.files);
            } 
            // Gestion du déplacement d'éléments dans l'explorateur
            else if (e.dataTransfer.types.includes('text/plain')) {
                try {
                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                    // Si on dépose sur la zone de contenu (et non sur un dossier)
                    if (e.target === content || content.contains(e.target) && !e.target.closest('.file-explorer-item.folder')) {
                        // Ne rien faire si c'est le même dossier
                        if (data.sourcePath === this.currentPath) return;
                        
                        // Déplacer l'élément vers le dossier courant
                        this.desktopService.moveItem(data.id, data.sourcePath, this.currentPath);
                        this.updateView();
                        
                        // Mettre à jour la vue du bureau si nécessaire
                        if (window.app) {
                            window.app.renderFolders();
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors du déplacement de l\'élément :', error);
                }
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

    setupDragAndDrop(element, item) {
        console.log('Configuration du glisser-déposer pour l\'élément :', item.name);
        
        // Vérifier que l'élément existe et est dans le DOM
        if (!element) {
            console.error('Erreur: L\'élément est null ou undefined');
            return;
        }
        
        // Vérifier que l'élément est dans le DOM
        if (!document.body.contains(element)) {
            console.error('Erreur: L\'élément n\'est pas dans le DOM');
            return;
        }
        
        // Configurer l'élément comme glissable
        element.draggable = true;
        
        // Supprimer les anciens écouteurs pour éviter les doublons
        element.removeEventListener('dragstart', this.handleDragStart);
        element.removeEventListener('dragend', this.handleDragEnd);
        
        // Ajouter les nouveaux écouteurs
        this.handleDragStart = (e) => {
            console.log('Début du glisser de :', item.name);
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: item.id,
                type: item.type,
                name: item.name,
                sourcePath: this.currentPath
            }));
            
            // Ajouter une classe pendant le glisser
            element.classList.add('dragging');
            
            // Pour le feedback visuel
            e.dataTransfer.setDragImage(element, 20, 20);
        };
        
        this.handleDragEnd = () => {
            console.log('Fin du glisser de :', item.name);
            element.classList.remove('dragging');
        };
        
        // Attacher les écouteurs
        element.addEventListener('dragstart', this.handleDragStart);
        element.addEventListener('dragend', this.handleDragEnd);
        
        // Si c'est un dossier, configurer les événements de dépôt
        if (item.type === 'folder') {
            this.setupDropTarget(element, item);
        }
    }
    
    // Gestionnaire d'événement de début de glissement
    onDragStart(e, item) {
        console.log('1. dragstart - Début du glissement :', item.name);
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Ajouter la classe de glissement
        e.currentTarget.classList.add('dragging');
        
        // Préparer les données à transférer
        const data = {
            id: item.id,
            type: item.type,
            name: item.name,
            sourcePath: this.currentPath
        };
        
        console.log('2. dragstart - Données à transférer :', data);
        
        // Définir les données de transfert
        try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('application/json', JSON.stringify(data));
            console.log('3. dragstart - Données transférées avec succès');
        } catch (error) {
            console.error('Erreur lors du transfert des données :', error);
        }
    }
    
    // Configuration de la cible de dépôt
    setupDropTarget(element, item) {
        console.log('Configuration de la cible de dépôt pour :', item.name);
        
        // Supprimer d'abord les anciens écouteurs s'ils existent
        element.removeEventListener('dragover', this.handleDragOver);
        element.removeEventListener('dragleave', this.handleDragLeave);
        element.removeEventListener('drop', this.handleDrop);
        
        // Créer de nouveaux gestionnaires
        this.handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            element.classList.add('drag-over');
            return false;
        };
        
        this.handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            return false;
        };
        
        this.handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                console.log('Dépôt sur le dossier :', item.name, 'Données :', data);
                
                // Vérifier que ce n'est pas un dépôt sur le même élément
                if (data.id === item.id) {
                    console.log('Tentative de dépôt sur le même élément, annulation');
                    return;
                }
                
                // Construire le chemin cible
                const targetPath = `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${item.name}`;
                
                // Vérifier que le déplacement est valide
                if (data.sourcePath === targetPath) {
                    console.log('Source et cible identiques, annulation');
                    return;
                }
                
                // Ne pas permettre de déplacer un dossier dans un de ses sous-dossiers
                if (data.sourcePath.startsWith(targetPath) && data.sourcePath !== targetPath) {
                    console.error('Impossible de déplacer un dossier dans un de ses sous-dossiers');
                    return;
                }
                
                console.log(`Tentative de déplacement de ${data.sourcePath} vers ${targetPath}`);
                
                // Vérifier si le service est disponible
                if (!this.desktopService || typeof this.desktopService.moveItem !== 'function') {
                    console.error('DesktopService ou la méthode moveItem n\'est pas disponible');
                    return;
                }
                
                // Déplacer l'élément
                const success = this.desktopService.moveItem(data.id, data.sourcePath, targetPath);
                console.log('Résultat du déplacement :', success);
                
                // Mettre à jour l'affichage
                if (success) {
                    this.updateView();
                    
                    // Mettre à jour la vue du bureau si nécessaire
                    if (window.app && typeof window.app.renderFolders === 'function') {
                        window.app.renderFolders();
                    }
                }
                
            } catch (error) {
                console.error('Erreur lors du dépôt :', error);
            }
        };
        
        // Ajouter les nouveaux écouteurs
        element.addEventListener('dragover', this.handleDragOver);
        element.addEventListener('dragleave', this.handleDragLeave);
        element.addEventListener('drop', this.handleDrop);
        
        // Ajouter un style pour indiquer que l'élément est une cible de dépôt
        element.classList.add('drop-target');
        
        // Ajouter un style visuel pour les dossiers cibles
        element.style.position = 'relative';
        element.style.transition = 'all 0.2s';
        
        // Style pour le survol des dossiers
        element.addEventListener('mouseenter', () => {
            if (element.classList.contains('folder')) {
                element.style.backgroundColor = 'rgba(78, 201, 176, 0.1)';
                element.style.border = '1px dashed #4ec9b0';
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (element.classList.contains('folder') && !element.classList.contains('drag-over')) {
                element.style.backgroundColor = 'transparent';
                element.style.border = '1px solid transparent';
            }
        });
    }
    
    // Gestionnaire d'événement de survol
    onDragOver(e, element) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
        
        element.classList.add('drag-over');
        return false;
    }
    
    // Gestionnaire de sortie de la zone de dépôt
    onDragLeave(e, element) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        element.classList.remove('drag-over');
        return false;
    }
    
    // Gestionnaire de dépôt
    onDrop(e, element, targetItem) {
        console.log('drop - Dépôt détecté sur :', targetItem.name);
        e.preventDefault();
        e.stopPropagation();
        element.classList.remove('drag-over');
        
        try {
            // Récupérer les données du glisser-déposer
            let data;
            try {
                data = JSON.parse(e.dataTransfer.getData('application/json'));
                console.log('Données récupérées (application/json) :', data);
            } catch (error) {
                console.log('Impossible de récupérer les données en application/json, essai avec text/plain');
                data = JSON.parse(e.dataTransfer.getData('text/plain'));
                console.log('Données récupérées (text/plain) :', data);
            }
            
            // Vérifier que les données sont valides
            if (!data || !data.id || !data.sourcePath) {
                console.error('Données de dépôt invalides');
                return;
            }
            
            // Calculer le chemin cible
            const targetPath = `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${targetItem.name}`;
            
            // Vérifier que le déplacement est valide
            if (data.sourcePath === targetPath) {
                console.log('Source et cible identiques, annulation');
                return;
            }
            
            // Ne pas permettre de déplacer un dossier dans un de ses sous-dossiers
            if (data.sourcePath.startsWith(targetPath) && data.sourcePath !== targetPath) {
                console.error('Impossible de déplacer un dossier dans un de ses sous-dossiers');
                return;
            }
            
            console.log(`Tentative de déplacement de ${data.sourcePath} vers ${targetPath}`);
            
            // Vérifier si le service est disponible
            if (!this.desktopService || typeof this.desktopService.moveItem !== 'function') {
                console.error('DesktopService ou la méthode moveItem n\'est pas disponible');
                return;
            }
            
            // Déplacer l'élément
            const success = this.desktopService.moveItem(data.id, data.sourcePath, targetPath);
            console.log('Résultat du déplacement :', success);
            
            // Mettre à jour l'affichage
            if (success) {
                this.updateView();
                
                // Mettre à jour la vue du bureau si nécessaire
                if (window.app && typeof window.app.renderFolders === 'function') {
                    window.app.renderFolders();
                }
            }
            
        } catch (error) {
            console.error('Erreur lors du dépôt :', error);
        }
    }

    updateView() {
        const content = this.element.querySelector('.file-explorer-content');
        if (!content) return;
        
        content.innerHTML = '';
        const pathElement = this.element.querySelector('.file-explorer-path');
        pathElement.textContent = this.currentPath === '/' ? 'Bureau' : this.currentPath;

        const list = document.createElement('ul');
        list.className = 'file-explorer-list';
        content.appendChild(list);

        // Bouton dossier parent
        if (this.currentPath !== '/') {
            const upItem = document.createElement('a');
            upItem.href = '#';
            upItem.className = 'file-explorer-item';
            upItem.innerHTML = `
                <div class="file-explorer-icon">
                    <i class="bi bi-arrow-90deg-up"></i>
                </div>
                <div class="file-explorer-name">Dossier parent</div>
            `;
            upItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToParent();
            });
            list.appendChild(upItem);
        }

        // Récupération et affichage des éléments
        const items = this.desktopService.getItemsInPath(this.currentPath);
        
        if (items.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'file-explorer-empty';
            emptyMessage.textContent = 'Ce dossier est vide';
            content.appendChild(emptyMessage);
            return;
        }
        
        // Tri des éléments
        const sortedItems = [...items].sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        
        // Affichage des éléments
        sortedItems.forEach(item => this.createListItem(list, item));
    }

    createListItem(list, item) {
        console.log('Création d\'un nouvel élément de liste :', item.name);
        
        // Vérifier si l'élément de liste parent existe
        if (!list || !(list instanceof HTMLElement)) {
            console.error('Erreur: L\'élément de liste parent n\'est pas valide');
            return null;
        }
        
        const itemElement = document.createElement('li'); 
        if (!itemElement) {
            console.error('Erreur: Impossible de créer l\'élément');
            return null;
        }
        
        itemElement.className = `file-explorer-item ${item.type}`;
        itemElement.draggable = true;
        itemElement.dataset.id = item.id;
        itemElement.dataset.type = item.type;
        itemElement.dataset.path = `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${item.name}`;
        
        // Ajout de styles pour le débogage
        itemElement.style.display = 'flex';
        itemElement.style.alignItems = 'center';
        itemElement.style.padding = '8px 12px';
        itemElement.style.borderRadius = '4px';
        itemElement.style.cursor = 'pointer';
        itemElement.style.transition = 'background-color 0.2s';
        itemElement.style.width = '100%';
        itemElement.style.boxSizing = 'border-box';
        itemElement.style.color = '#e0e0e0';
        itemElement.style.textDecoration = 'none';
        itemElement.style.marginBottom = '4px';
        
        // Style au survol
        itemElement.addEventListener('mouseover', () => {
            itemElement.style.backgroundColor = '#2a2d2e';
        });
        
        itemElement.addEventListener('mouseout', () => {
            itemElement.style.backgroundColor = 'transparent';
        });
        
        // Ajouter un style de débogage pour voir l'élément
        itemElement.style.border = '1px solid red';
        
        console.log('Élément créé avec les attributs :', {
            id: itemElement.dataset.id,
            type: itemElement.dataset.type,
            path: itemElement.dataset.path,
            draggable: itemElement.draggable
        });

        const iconClass = this.getFileIcon(item.name, item.mimeType);
        const icon = item.type === 'folder' ? 'bi-folder' : iconClass;
        
        itemElement.innerHTML = `
            <div class="file-explorer-icon">
                <i class="bi ${icon}"></i>
            </div>
            <div class="file-explorer-name">${item.name}</div>
            ${item.type !== 'folder' ? `<div class="file-explorer-size">${this.formatFileSize(item.size || 0)}</div>` : ''}
        `;

        itemElement.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.type === 'folder') {
                this.navigateTo(item.name);
            }
        });

        itemElement.addEventListener('dblclick', (e) => {
            e.preventDefault();
            if (item.type === 'folder') {
                this.navigateTo(item.name);
            } else {
                console.log('Ouvrir le fichier :', item);
                // Ici, vous pouvez ajouter la logique pour ouvrir le fichier
            }
        });

        // Ajouter l'élément au DOM d'abord
        try {
            list.appendChild(itemElement);
            console.log('Élément ajouté avec succès au DOM');
            
            // Configurer le glisser-déposer APRÈS l'insertion dans le DOM
            if (document.body.contains(itemElement)) {
                console.log('Configuration du glisser-déposer pour :', item.name);
                this.setupDragAndDrop(itemElement, item);
            } else {
                console.error('Erreur: L\'élément n\'est pas dans le DOM après insertion');
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'élément au DOM :', error);
        }
        console.log('Élément créé :', {
            id: item.id,
            name: item.name,
            type: item.type,
            path: item.path
        });
    }

    uploadFiles(files) {
        if (!files?.length) return;
        
        try {
            Array.from(files).forEach(file => {
                if (file instanceof File || file instanceof Blob) {
                    this.desktopService.addFile(file, this.currentPath);
                }
            });
            this.updateView();
        } catch (error) {
            console.error('Erreur lors du téléversement des fichiers :', error);
        }
    }
    
    goToParent() {
        if (this.currentPath === '/') return;
        const pathParts = this.currentPath.split('/');
        pathParts.pop();
        this.currentPath = pathParts.join('/') || '/';
        this.updateView();
    }

    navigateTo(folderName) {
        this.currentPath = `${this.currentPath}${this.currentPath === '/' ? '' : '/'}${folderName}`;
        this.updateView();
    }

    createNewFolder() {
        const folderName = prompt('Nom du nouveau dossier :');
        if (folderName) {
            this.desktopService.createFolder(folderName, this.currentPath);
            this.updateView();
        }
    }

    getFileIcon(filename, mimeType) {
        if (mimeType?.startsWith('image/')) return 'bi-image';
        
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        
        const icons = {
            // Documents
            'pdf': 'file-pdf',
            'doc': 'file-word', 'docx': 'file-word',
            'txt': 'file-text', 'rtf': 'file-text',
            
            // Feuilles de calcul
            'xls': 'file-excel', 'xlsx': 'file-excel', 'csv': 'file-excel',
            
            // Présentations
            'ppt': 'file-ppt', 'pptx': 'file-ppt',
            
            // Images
            'jpg': 'file-image', 'jpeg': 'file-image', 'png': 'file-image',
            'gif': 'file-image', 'svg': 'file-image', 'bmp': 'file-image', 'webp': 'file-image',
            
            // Archives
            'zip': 'file-zip', 'rar': 'file-zip', '7z': 'file-zip', 'tar': 'file-zip', 'gz': 'file-zip',
            
            // Code
            'js': 'file-code', 'jsx': 'file-code', 'ts': 'file-code', 'tsx': 'file-code',
            'html': 'file-code', 'css': 'file-code', 'scss': 'file-code', 'json': 'file-code', 'xml': 'file-code',
            
            // Autres
            'exe': 'file-binary', 'dll': 'file-binary', 'msi': 'file-binary',
            
            // Par défaut
            'default': 'file-earmark'
        };
        
        return `bi-${icons[ext] || icons['default']}`;
    }

    formatFileSize(bytes = 0) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
}
