import { DesktopService } from './services/DesktopService.js';
import { FileExplorer } from './components/FileExplorer.js';

class DesktopApp {
    constructor() {
        this.desktop = document.getElementById('desktop');
        this.desktopService = new DesktopService();
        this.fileExplorer = new FileExplorer(this.desktopService);
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
        
        // Gestion du glisser-déposer
        folder.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', folderData.id);
            e.dataTransfer.effectAllowed = 'move';
        });
        
        this.desktop.appendChild(folder);
    }
    
    setupNewFolderButton() {
        const folderModal = new bootstrap.Modal(document.getElementById('folderModal'));
        const folderNameInput = document.getElementById('folderName');
        const createFolderBtn = document.getElementById('createFolderBtn');
        
        // Réinitialiser le champ et afficher la modale
        document.getElementById('newFolderBtn').addEventListener('click', () => {
            folderNameInput.value = '';
            folderNameInput.focus();
        });
        
        // Gérer la création du dossier
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
            } else {
                const folderId = e.dataTransfer.getData('text/plain');
                if (folderId) {
                    this.updateFolderPosition(folderId, e.clientX, e.clientY);
                }
            }
        });
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
        files.forEach(file => {
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
