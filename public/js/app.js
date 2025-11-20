import { DesktopService } from './services/DesktopService.js';
import { FileExplorer } from './components/FileExplorer.js';
import { ContextMenu } from './components/ContextMenu.js';

class DesktopApp {
    constructor() {
        this.desktop = document.getElementById('desktop');
        this.desktopService = new DesktopService();
        
        // Vider le cache au démarrage
        console.log('Nettoyage du cache au démarrage...');
        this.desktopService.clearCache();
        
        this.fileExplorer = new FileExplorer(this.desktopService);
        this.contextMenu = new ContextMenu(document.body);
        this.init();
    }
    
    init() {
        this.renderFolders();
        this.setupNewFolderButton();
        this.setupDesktopEvents();
    }
    
    async renderFolders() {
        console.log('=== DÉBUT DU RENDU DES DOSSIERS ===');
        
        // Vérifier que le conteneur du bureau existe
        this.desktop = document.getElementById('desktop');
        if (!this.desktop) {
            console.error('ERREUR: Élément #desktop introuvable dans le DOM');
            return;
        }
        
        console.log('Conteneur desktop trouvé:', this.desktop);
        
        // Nettoyer les éléments existants
        const existingItems = document.querySelectorAll('.folder, .file');
        console.log(`Suppression de ${existingItems.length} éléments existants`);
        existingItems.forEach(el => el.remove());
        
        try {
            // Récupérer les éléments
            console.log('Récupération des éléments...');
            const items = await this.desktopService.getItemsInPath('/');
            console.log(`Reçu ${items.length} éléments:`, items);
            
            if (items.length === 0) {
                console.log('Aucun élément à afficher');
                return;
            }
            
            // Afficher chaque élément
            items.forEach(item => {
                if (!item) {
                    console.warn('Élément invalide (null/undefined)');
                    return;
                }
                
                console.log(`Affichage de l'élément:`, item);
                
                if (item.type === 'folder') {
                    this.createFolderElement(item);
                } else if (item.type === 'file') {
                    this.createFileElement(item);
                }
            });
            
            console.log('=== FIN DU RENDU DES DOSSIERS ===');
        } catch (error) {
            console.error('ERREUR lors du rendu des dossiers:', error);
        }
    }
    
    createFolderElement(folderData) {
        const folder = document.createElement('div');
        folder.className = 'folder';
        
        // Forcer les positions à être des nombres
        const posX = Number(folderData.x) || 0;
        const posY = Number(folderData.y) || 0;
        
        console.log(`Positionnement du dossier ${folderData.name} (${folderData.id}) à (${posX}, ${posY})`);
        
        folder.style.position = 'absolute';
        folder.style.left = `${posX}px`;
        folder.style.top = `${posY}px`;
        folder.dataset.id = folderData.id;
        folder.draggable = true;
        
        folder.innerHTML = `
            <div class="folder-icon">
                <img src="/images/folder_icon.png" alt="Dossier" width="64" height="64" draggable="false">
            </div>
            <div class="folder-name">${folderData.name}</div>
        `;
        
        // Gestion du double-clic
        folder.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.fileExplorer.show(`/${folderData.name}`);
        });
        
        // Gestion du glisser-déposer pour déplacer le dossier
        let startX, startY, startLeft, startTop;
        
        // Créer une copie locale de folderData pour la fermeture
        const folderDataCopy = { ...folderData };
        
        folder.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Seulement le bouton gauche de la souris
            
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(folder.style.left) || 0;
            startTop = parseInt(folder.style.top) || 0;
            
            const onMouseMove = (e) => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                folder.style.left = `${startLeft + dx}px`;
                folder.style.top = `${startTop + dy}px`;
            };
            
            const onMouseUp = async () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                try {
                    const x = parseInt(folder.style.left) || 0;
                    const y = parseInt(folder.style.top) || 0;
                    
                    // Mettre à jour la position dans le service
                    if (folderDataCopy.id) {
                        await this.desktopService.updateItemPosition(
                            folderDataCopy.id,
                            x,
                            y
                        );
                        
                        // Mettre à jour les données locales
                        const item = this.desktopService.items.find(i => i.id === folderDataCopy.id);
                        if (item) {
                            item.x = x;
                            item.y = y;
                        }
                    } else {
                        console.error('Impossible de mettre à jour la position : ID du dossier non défini');
                    }
                } catch (error) {
                    console.error('Erreur lors de la mise à jour de la position du dossier :', error);
                }
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });
        
        // Gestion du clic droit
        folder.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, 'folder');
        });
        
        // Gestion du survol
        folder.addEventListener('mouseenter', () => {
            folder.style.backgroundColor = 'rgba(78, 201, 176, 0.1)';
        });
        
        folder.addEventListener('mouseleave', () => {
            folder.style.backgroundColor = 'transparent';
        });
        
        this.desktop.appendChild(folder);
        
        return folder;
    }
    
    createFileElement(fileData) {
        const file = document.createElement('div');
        file.className = 'file';
        file.style.position = 'absolute';
        file.style.left = `${fileData.x || 0}px`;
        file.style.top = `${fileData.y || 0}px`;
        file.dataset.id = fileData.id;
        
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
        file.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openFile(fileData);
        });
        
        // Gestion du glisser-déposer pour déplacer le fichier
        let startX, startY, startLeft, startTop;
        
        file.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Seulement le bouton gauche de la souris
            
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(file.style.left) || 0;
            startTop = parseInt(file.style.top) || 0;
            
            const onMouseMove = (e) => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                file.style.left = `${startLeft + dx}px`;
                file.style.top = `${startTop + dy}px`;
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                // Mettre à jour la position dans le service
                this.desktopService.updateItemPosition(
                    fileData.id,
                    parseInt(file.style.left) || 0,
                    parseInt(file.style.top) || 0
                );
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // Gestion du clic droit
        file.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e, 'file');
        });
        
        // Gestion du survol
        file.addEventListener('mouseenter', () => {
            file.style.backgroundColor = 'rgba(78, 201, 176, 0.1)';
        });
        
        file.addEventListener('mouseleave', () => {
            file.style.backgroundColor = 'transparent';
        });
        
        this.desktop.appendChild(file);
        
        // Si les coordonnées ne sont pas définies, positionner automatiquement
        if (fileData.x === undefined || fileData.y === undefined) {
            this.autoPositionFile(file);
        }
    }
    
    autoPositionFile(fileElement) {
        // Récupérer tous les éléments du bureau
        const desktopItems = document.querySelectorAll('.folder, .file');
        
        // Taille d'une cellule de grille (en pixels)
        const gridSize = 120;
        
        // Nombre maximum de colonnes
        const maxCols = Math.floor(this.desktop.offsetWidth / gridSize);
        
        // Trouver une position libre
        let row = 0, col = 0;
        let positionFound = false;
        
        while (!positionFound) {
            // Vérifier si la position est occupée
            const x = col * gridSize + 20;
            const y = row * gridSize + 20;
            
            const isOccupied = Array.from(desktopItems).some(item => {
                if (item === fileElement) return false;
                const rect = item.getBoundingClientRect();
                return !(x + gridSize < rect.left || 
                        x > rect.right || 
                        y + gridSize < rect.top || 
                        y > rect.bottom);
            });
            
            if (!isOccupied) {
                // Positionner l'élément
                fileElement.style.left = `${x}px`;
                fileElement.style.top = `${y}px`;
                
                // Mettre à jour les données de position
                const fileId = fileElement.dataset.id;
                const file = this.desktopService.getItemById(fileId);
                if (file) {
                    file.x = x;
                    file.y = y;
                    // Ne pas sauvegarder la position dans la base de données
                    // car nous ne voulons pas persister les positions
                }
                
                positionFound = true;
            } else {
                // Passer à la position suivante
                col++;
                if (col >= maxCols) {
                    col = 0;
                    row++;
                }
            }
        }
    }
    
    openFile(fileData) {
        // Vérifier si c'est un fichier texte
        if (fileData.mimeType.startsWith('text/')) {
            this.openTextEditor(fileData);
        } else if (fileData.mimeType.startsWith('image/')) {
            // Pour les images, on les ouvre dans un nouvel onglet
            window.open(fileData.url, '_blank');
        } else {
            // Pour les autres types de fichiers, on affiche une alerte
            alert(`Le fichier ${fileData.name} ne peut pas être édité directement.`);
        }
    }
    
    // Ouvrir l'éditeur de texte
    openTextEditor(fileData) {
        // Créer l'overlay
        const overlay = document.createElement('div');
        overlay.className = 'text-editor-overlay';
        
        // Créer l'éditeur
        const editor = document.createElement('div');
        editor.className = 'text-editor';
        editor.innerHTML = `
            <div class="text-editor-header">
                <h3 class="text-editor-title">${fileData.name}</h3>
                <button class="text-editor-close">&times;</button>
            </div>
            <div class="text-editor-toolbar">
                <button class="text-editor-button" data-action="save">
                    <i class="bi bi-save"></i> Enregistrer
                </button>
            </div>
            <textarea class="text-editor-content" spellcheck="false">${fileData.content || ''}</textarea>
            <div class="text-editor-footer">
                <span>${fileData.size || 0} caractères</span>
                <button class="text-editor-save">Enregistrer</button>
            </div>
        `;
        
        // Ajouter l'éditeur et l'overlay au document
        overlay.appendChild(editor);
        document.body.appendChild(overlay);
        
        // Afficher l'overlay avec une animation
        setTimeout(() => {
            overlay.classList.add('visible');
            editor.querySelector('.text-editor-content').focus();
        }, 10);
        
        // Gestionnaire d'événements pour le bouton de fermeture
        const closeButton = editor.querySelector('.text-editor-close');
        closeButton.addEventListener('click', () => {
            this.closeTextEditor(overlay, editor, null, fileData);
        });
        
        // Gestionnaire d'événements pour le bouton d'enregistrement
        const saveButton = editor.querySelector('.text-editor-save');
        saveButton.addEventListener('click', () => {
            const content = editor.querySelector('.text-editor-content').value;
            this.closeTextEditor(overlay, editor, content, fileData);
        });
        
        // Gestionnaire d'événements pour le bouton d'enregistrement de la barre d'outils
        const toolbarSaveButton = editor.querySelector('[data-action="save"]');
        toolbarSaveButton.addEventListener('click', () => {
            const content = editor.querySelector('.text-editor-content').value;
            this.closeTextEditor(overlay, editor, content, fileData);
        });
        
        // Gestionnaire d'événements pour la touche Échap
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this.closeTextEditor(overlay, editor, null, fileData);
            } else if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const content = editor.querySelector('.text-editor-content').value;
                this.closeTextEditor(overlay, editor, content, fileData);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        
        // Stocker la référence au gestionnaire d'événements pour le nettoyage
        editor._keyDownHandler = handleKeyDown;
    }
    
    // Fermer l'éditeur de texte
    closeTextEditor(overlay, editor, content, fileData) {
        // Supprimer le gestionnaire d'événements
        document.removeEventListener('keydown', editor._keyDownHandler);
        
        // Ajouter une animation de fermeture
        overlay.classList.remove('visible');
        
        // Supprimer l'overlay après l'animation
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
        
        // Si du contenu a été fourni, mettre à jour le fichier
        if (content !== null && fileData) {
            this.desktopService.updateFileContent(fileData.id, content);
            // Mettre à jour l'interface utilisateur si nécessaire
            this.renderFolders();
        }
    }
    
    setupNewFolderButton() {
        const folderModal = new bootstrap.Modal(document.getElementById('folderModal'));
        const folderNameInput = document.getElementById('folderName');
        const createFolderBtn = document.getElementById('createFolderBtn');
        
        // Gestion du clic sur le bouton de création
        createFolderBtn.addEventListener('click', async () => {
            const folderName = folderNameInput.value.trim();
            if (folderName) {
                try {
                    const folder = await this.desktopService.createFolder(
                        folderName,
                        null, // parentId à null pour la racine
                        Math.random() * (window.innerWidth - 100),
                        Math.random() * (window.innerHeight - 100)
                    );
                    this.createFolderElement(folder);
                    folderNameInput.value = '';
                    folderModal.hide();
                } catch (error) {
                    console.error('Erreur lors de la création du dossier:', error);
                    alert('Erreur lors de la création du dossier: ' + error.message);
                }
            } else {
                alert('Veuillez entrer un nom de dossier valide');
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
            e.stopPropagation();
            this.desktop.classList.add('drag-over');
        });
        
        this.desktop.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.desktop.classList.remove('drag-over');
        });
        
        this.desktop.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.desktop.classList.remove('drag-over');
            
            // Gérer le dépôt de fichiers depuis l'extérieur
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.uploadFiles(e.dataTransfer.files);
                return;
            }
            
            // Gérer le déplacement d'éléments (fichiers ou dossiers)
            const itemData = e.dataTransfer.getData('text/plain');
            if (itemData) {
                try {
                    // Essayer de parser les données comme JSON (pour les fichiers)
                    const data = JSON.parse(itemData);
                    if (data && data.id) {
                        this.updateFolderPosition(
                            data.id, 
                            e.clientX, 
                            e.clientY
                        );

                    }
                } catch (e) {
                    // Si le parsing échoue, traiter comme un ID simple (pour les dossiers)
                    this.updateFolderPosition(
                        itemData, 
                        e.clientX, 
                        e.clientY
                    );
                }
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
    
    async createNewFolder() {
        const folderName = prompt('Nom du nouveau dossier :', 'Nouveau dossier');
        if (folderName && folderName.trim() !== '') {
            try {
                const folder = await this.desktopService.createFolder(
                    folderName.trim(),
                    '/',
                    Math.random() * (window.innerWidth - 100),
                    Math.random() * (window.innerHeight - 100)
                );
                this.createFolderElement(folder);
            } catch (error) {
                console.error('Erreur lors de la création du dossier :', error);
                alert('Erreur lors de la création du dossier. Veuillez réessayer.');
            }
        }
    }
    
    async createNewFile() {
        const fileName = prompt('Nom du nouveau fichier (avec extension) :', 'nouveau_fichier.txt');
        if (fileName && fileName.trim() !== '') {
            try {
                const file = await this.desktopService.createFile(
                    fileName.trim(),
                    '/',
                    Math.random() * (window.innerWidth - 100),
                    Math.random() * (window.innerHeight - 100),
                    '', // Contenu vide par défaut
                    'text/plain' // Type MIME par défaut
                );
                this.createFileElement(file);
            } catch (error) {
                console.error('Erreur lors de la création du fichier :', error);
                alert('Erreur lors de la création du fichier. Veuillez réessayer.');
            }
        }
    }
    
    updateFolderPosition(itemId, clientX, clientY) {
        try {
            console.log('updateFolderPosition appelé avec :', { itemId, clientX, clientY });
            
            // Vérifier si l'ID est déjà un objet (cas des fichiers)
            let actualId = itemId;
            if (typeof itemId === 'object' && itemId !== null) {
                actualId = itemId.id || itemId;
            } else if (typeof itemId === 'string' && (itemId.startsWith('{') || itemId.startsWith('['))) {
                // Si c'est une chaîne JSON, essayer de la parser
                try {
                    const parsedData = JSON.parse(itemId);
                    actualId = parsedData.id || itemId;
                } catch (e) {
                    console.warn('Impossible de parser l\'ID comme JSON :', itemId);
                }
            }
            
            console.log('ID à utiliser :', actualId);
            
            // S'assurer que l'ID est une chaîne
            const itemIdStr = String(actualId);
            
            // Trouver l'élément dans le DOM
            const element = document.querySelector(`[data-id="${itemIdStr}"]`);
            if (!element) {
                console.error('Élément non trouvé avec l\'ID :', itemIdStr);
                console.log('Tous les éléments data-id :', 
                    Array.from(document.querySelectorAll('[data-id]')).map(el => el.dataset.id)
                );
                return;
            }
            
            // Calculer la nouvelle position
            const rect = this.desktop.getBoundingClientRect();
            const posX = clientX - rect.left - 32; // Ajustement pour le centre de l'icône
            const posY = clientY - rect.top - 32;
            
            console.log('Nouvelle position calculée :', { posX, posY });
            
            // Mettre à jour la position dans le DOM
            element.style.left = `${Math.max(0, posX)}px`;
            element.style.top = `${Math.max(0, posY)}px`;
            
            // Mettre à jour la position dans le service
            this.desktopService.updateItemPosition(
                itemIdStr, 
                Math.max(0, posX), 
                Math.max(0, posY)
            );
            
            console.log('Position mise à jour pour l\'élément :', {
                id: itemIdStr,
                x: Math.max(0, posX),
                y: Math.max(0, posY)
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la position :', error);
        }
    }
}

// Démarrer l'application
window.addEventListener('DOMContentLoaded', () => {
    window.app = new DesktopApp();
});
