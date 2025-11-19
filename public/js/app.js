import { DesktopService } from './services/DesktopService.js';
import { FileExplorer } from './components/FileExplorer.js';
import { ContextMenu } from './components/ContextMenu.js';

class DesktopApp {
    constructor() {
        this.desktop = document.getElementById('desktop');
        this.desktopService = new DesktopService();
        this.fileExplorer = new FileExplorer(this.desktopService);
        this.contextMenu = new ContextMenu(document.body);
        this.init();
    }
    
    init() {
        this.renderFolders();
        this.setupNewFolderButton();
        this.setupDesktopEvents();
    }
    
    renderFolders() {
        // Nettoyer les dossiers existants
        document.querySelectorAll('.folder').forEach(el => el.remove());
        
        // Afficher les dossiers à la racine
        const folders = this.desktopService.getItemsInPath('/');
        folders.forEach(item => {
            if (item.type === 'folder') {
                this.createFolderElement(item);
            }
        });
    }
    
    createFolderElement(folderData) {
        const folder = document.createElement('div');
        folder.className = 'folder';
        folder.style.left = `${folderData.x}px`;
        folder.style.top = `${folderData.y}px`;
        folder.dataset.id = folderData.id;
        folder.draggable = true;
        
        folder.innerHTML = `
            <div class="folder-icon">
                <img src="/images/folder_icon.png" alt="Dossier" width="64" height="64">
            </div>
            <div class="folder-name">${folderData.name}</div>
        `;
        
        // Gestion du double-clic
        folder.addEventListener('dblclick', () => {
            this.fileExplorer.show(`/${folderData.name}`);
        });
        
        folder.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', folderData.id);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        // Gestion du clic droit
        folder.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, 'folder');
        });
        
        this.desktop.appendChild(folder);
    }
    
    createFileElement(fileData) {
        const file = document.createElement('div');
        file.className = 'file';
        file.style.left = `${fileData.x}px`;
        file.style.top = `${fileData.y}px`;
        file.dataset.id = fileData.id;
        file.draggable = true;
        
        // Déterminer l'icône en fonction de l'extension
        const extension = fileData.name.split('.').pop().toLowerCase();
        let iconClass = 'bi-file-earmark-text';
        
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
            iconClass = 'bi-file-image';
        } else if (['pdf'].includes(extension)) {
            iconClass = 'bi-file-pdf';
        } else if (['doc', 'docx'].includes(extension)) {
            iconClass = 'bi-file-word';
        } else if (['xls', 'xlsx'].includes(extension)) {
            iconClass = 'bi-file-excel';
        } else if (['zip', 'rar', '7z'].includes(extension)) {
            iconClass = 'bi-file-zip';
        }
        
        file.innerHTML = `
            <div class="file-icon">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="file-name">${fileData.name}</div>
        `;
        
        // Gestion du double-clic
        file.addEventListener('dblclick', () => {
            this.openFile(fileData);
        });
        
        file.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', fileData.id);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        // Gestion du clic droit
        file.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, 'file');
        });
        
        this.desktop.appendChild(file);
    }
    
    openFile(fileData) {
        // Pour les fichiers texte, on pourrait ouvrir un éditeur simple
        if (fileData.mimeType.startsWith('text/')) {
            const content = prompt('Contenu du fichier :', fileData.content || '');
            if (content !== null) {
                fileData.content = content;
                this.desktopService.updateFileContent(fileData.id, content);
            }
        } else {
            // Pour les autres types de fichiers, on pourrait essayer de les ouvrir dans un nouvel onglet
            // ou afficher un message indiquant qu'ils ne sont pas éditables
            alert(`Ouverture du fichier ${fileData.name}`);
        }
    }
    
    setupNewFolderButton() {
        const folderModal = new bootstrap.Modal(document.getElementById('folderModal'));
        const folderNameInput = document.getElementById('folderName');
        const createFolderBtn = document.getElementById('createFolderBtn');
        
        // Gestion du clic sur le bouton de création
        createFolderBtn.addEventListener('click', () => {
            const folderName = folderNameInput.value.trim();
            if (folderName) {
                const folder = this.desktopService.createFolder(
                    folderName,
                    '/',
                    Math.random() * (window.innerWidth - 100),
                    Math.random() * (window.innerHeight - 100)
                );
                this.createFolderElement(folder);
                folderNameInput.value = '';
                folderModal.hide();
            }
        });
        
        // Permettre la validation avec la touche Entrée
        folderNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createFolderBtn.click();
            }
        });
    }
    
    setupDesktopEvents() {
        // Gestion du clic droit sur le bureau
        this.desktop.addEventListener('contextmenu', (e) => {
            if (e.target === this.desktop) {
                e.preventDefault();
                this.showContextMenu(e, 'desktop');
            }
        });

        // Gestion du glisser-déposer sur le bureau
        this.desktop.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.desktop.classList.add('drag-over');
        });
        
        this.desktop.addEventListener('dragleave', () => {
            this.desktop.classList.remove('drag-over');
        });
        
        this.desktop.addEventListener('drop', (e) => {
            e.preventDefault();
            this.desktop.classList.remove('drag-over');
            
            // Gérer le dépôt de fichiers
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.uploadFiles(e.dataTransfer.files);
            }
            
            // Gérer le déplacement de dossiers
            const folderId = e.dataTransfer.getData('text/plain');
            if (folderId) {
                this.updateFolderPosition(folderId, e.clientX, e.clientY);
            }
        });
    }
    
    showContextMenu(e, targetType) {
        const { clientX: x, clientY: y } = e;
        
        // Options du menu contextuel en fonction de la cible
        const options = {
            isFolder: targetType === 'folder',
            isFile: targetType === 'file',
            target: e.target.closest('.folder, .file') || null,
            canPaste: false // À implémenter si nécessaire
        };
        
        // Afficher le menu contextuel
        this.contextMenu.show(x, y, options).then(action => {
            if (action) {
                this.handleContextAction(action, options.target);
            }
        });
    }
    
    handleContextAction(action, target) {
        switch (action) {
            case 'newFolder':
                this.createNewFolder();
                break;
            case 'newFile':
                this.createNewFile();
                break;
            case 'open':
                if (target) {
                    const folderId = target.dataset.id;
                    const folder = this.desktopService.getItemById(folderId);
                    if (folder) {
                        this.fileExplorer.show(`/${folder.name}`);
                    }
                }
                break;
            case 'renameFolder':
                if (target) {
                    const currentName = target.querySelector('.folder-name').textContent;
                    const newName = prompt('Nouveau nom :', currentName);
                    if (newName && newName.trim() !== '') {
                        const folderId = target.dataset.id;
                        this.desktopService.renameItem(folderId, newName.trim());
                        this.renderFolders();
                    }
                }
                break;
            case 'deleteFolder':
                if (target && confirm('Voulez-vous vraiment supprimer ce dossier ?')) {
                    const folderId = target.dataset.id;
                    this.desktopService.deleteItem(folderId);
                    target.remove();
                }
                break;
            case 'refresh':
                this.renderFolders();
                break;
            // Ajouter d'autres actions ici...
        }
    }
    
    createNewFolder() {
        const folderName = prompt('Nom du nouveau dossier :', 'Nouveau dossier');
        if (folderName && folderName.trim() !== '') {
            const folder = this.desktopService.createFolder(
                folderName.trim(),
                '/',
                Math.random() * (window.innerWidth - 100),
                Math.random() * (window.innerHeight - 100)
            );
            this.createFolderElement(folder);
        }
    }
    
    createNewFile() {
        const fileName = prompt('Nom du nouveau fichier (avec extension) :', 'nouveau_fichier.txt');
        if (fileName && fileName.trim() !== '') {
            const file = this.desktopService.createFile(
                fileName.trim(),
                '/',
                Math.random() * (window.innerWidth - 100),
                Math.random() * (window.innerHeight - 100),
                '', // Contenu vide par défaut
                'text/plain' // Type MIME par défaut
            );
            this.createFileElement(file);
        }
    }
    
    updateFolderPosition(folderId, x, y) {
        const folder = document.querySelector(`.folder[data-id="${folderId}"]`);
        if (folder) {
            const rect = this.desktop.getBoundingClientRect();
            const posX = x - rect.left - 50; // Ajustement pour le centre de l'élément
            const posY = y - rect.top - 50;
            
            folder.style.left = `${posX}px`;
            folder.style.top = `${posY}px`;
            
            this.desktopService.updateItemPosition(folderId, posX, posY);
        }
    }
    
    uploadFiles(files) {
        Array.from(files).forEach(file => {
            this.desktopService.addFile(
                file, 
                '/',
                Math.random() * (window.innerWidth - 100),
                Math.random() * (window.innerHeight - 100)
            );
        });
        this.renderFolders();
    }
}

// Démarrer l'application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new DesktopApp();
});
