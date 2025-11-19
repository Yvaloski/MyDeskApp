import { DesktopService } from './services/DesktopService.js';
import { FileExplorer } from './components/FileExplorer.js';
import { Folder } from './components/Folder.new.js';

class DesktopApp {
    constructor() {
        this.desktop = document.getElementById('desktop');
        this.desktopService = new DesktopService();
        this.fileExplorer = null;
        this.init();
    }
    
    init() {
        this.renderFolders();
        this.setupDesktopEvents();
        this.setupNewFolderButton();
    }
    
    renderFolders() {
        // Nettoyer les dossiers existants
        document.querySelectorAll('.folder').forEach(el => el.remove());
        
        // Afficher les dossiers à la racine
        const folders = this.desktopService.getItemsInPath('/');
        folders.forEach(folderData => {
            if (folderData.type === 'folder') {
                const folder = new Folder(folderData, (folder) => {
                    this.openFolder(folder);
                });
                this.desktop.appendChild(folder.element);
            }
        });
    }
    
    setupDesktopEvents() {
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
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.uploadFiles(Array.from(e.dataTransfer.files));
            }
        });
        
        // Clic droit pour le menu contextuel
        this.desktop.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // À implémenter: menu contextuel
        });
    }
    
    setupNewFolderButton() {
        const newFolderBtn = document.createElement('button');
        newFolderBtn.className = 'new-folder-btn';
        newFolderBtn.innerHTML = '<i class="bi bi-folder-plus"></i> Nouveau dossier';
        newFolderBtn.addEventListener('click', () => {
            const folderName = prompt('Nom du dossier :');
            if (folderName) {
                this.desktopService.createFolder(folderName, '/', 50, 50);
                this.renderFolders();
            }
        });
        document.body.appendChild(newFolderBtn);
    }
    
    openFolder(folder) {
        if (!this.fileExplorer) {
            this.fileExplorer = new FileExplorer(this.desktopService);
        }
        this.fileExplorer.show(`/${folder.name}`);
    }
    
    uploadFiles(files) {
        files.forEach(file => {
            this.desktopService.addFile(file, '/', 
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
