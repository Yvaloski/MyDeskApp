export class FileExplorer {
    constructor(desktopService) {
        this.desktopService = desktopService;
        this.currentPath = '/';
        this.history = ['/'];
        this.historyIndex = 0;
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
        
        content?.addEventListener('dragover', (e) => {
            e.preventDefault();
            content.classList.add('drag-over');
        });
        
        content?.addEventListener('dragleave', () => {
            content.classList.remove('drag-over');
        });
        
        content?.addEventListener('drop', (e) => {
            e.preventDefault();
            content.classList.remove('drag-over');
            
            if (e.dataTransfer?.files?.length > 0) {
                this.uploadFiles(e.dataTransfer.files);
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
        const itemElement = document.createElement('a');
        itemElement.href = '#';
        itemElement.className = `file-explorer-item ${item.type}`;
        itemElement.draggable = true;
        itemElement.dataset.id = item.id;

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

        list.appendChild(itemElement);
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
