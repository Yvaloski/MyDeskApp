export class DesktopService {
    constructor() {
        this.items = []; // Contient à la fois les dossiers et fichiers
        this.folders = []; // Pour la rétrocompatibilité
        this.nextId = 1; // Pour la génération des IDs
        this.selectedFolders = new Set(); // Pour la sélection multiple
        this.loadItems();
        this.loadFolders();
    }
    
    // Charger les éléments depuis le stockage local
    loadItems() {
        const savedItems = localStorage.getItem('desktopItems');
        if (savedItems) {
            this.items = JSON.parse(savedItems);
        }
    }
    
    // Sauvegarder les éléments dans le stockage local
    saveItems() {
        localStorage.setItem('desktopItems', JSON.stringify(this.items));
    }
    
    // Ajouter un nouvel élément (dossier ou fichier)
    addItem(item) {
        const newItem = {
            id: Date.now().toString(),
            type: item.type, // 'folder' ou 'file'
            name: item.name,
            path: item.path || '/',
            x: item.x || 0,
            y: item.y || 0,
            ...(item.type === 'file' && { 
                size: item.size,
                mimeType: item.mimeType,
                url: item.url 
            })
        };
        
        this.items.push(newItem);
        this.saveItems();
        return newItem;
    }
    
    // Mettre à jour la position d'un élément
    updateItemPosition(itemId, x, y) {
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            item.x = x;
            item.y = y;
            this.saveItems();
        }
    }
    
    // Récupérer tous les éléments d'un dossier
    getItemsInPath(path = '/') {
        return this.items.filter(item => item.path === path);
    }
    
    // Récupérer un élément par son ID
    getItemById(id) {
        return this.items.find(item => item.id === id || item.id === id.toString());
    }
    
    // Créer un nouveau dossier
    createFolder(name, path = '/', x = 0, y = 0) {
        const folder = this.addItem({
            type: 'folder',
            name,
            path,
            x,
            y
        });
        // Maintenir la liste des dossiers pour la rétrocompatibilité
        this.folders.push({
            id: folder.id,
            name: folder.name,
            x: folder.x,
            y: folder.y,
            createdAt: new Date().toISOString()
        });
        this.saveFolders();
        return folder;
    }
    
    // Créer un nouveau fichier vide
    createFile(name, path = '/', x = 0, y = 0, content = '', mimeType = 'text/plain') {
        const fileBlob = new Blob([content], { type: mimeType });
        return this.addItem({
            type: 'file',
            name,
            path,
            x,
            y,
            size: content.length,
            mimeType,
            content,
            url: URL.createObjectURL(fileBlob)
        });
    }
    
    // Ajouter un fichier existant (upload)
    addFile(file, path = '/', x = 0, y = 0) {
        return this.addItem({
            type: 'file',
            name: file.name,
            path,
            x,
            y,
            size: file.size,
            mimeType: file.type,
            url: URL.createObjectURL(file)
        });
    }
    
    // Supprimer un élément (alias pour compatibilité)
    removeItem(itemId) {
        return this.deleteItem(itemId);
    }
    
    // Supprimer un élément par son ID
    deleteItem(itemId) {
        console.log('Tentative de suppression de l\'élément avec ID :', itemId);
        const index = this.items.findIndex(item => item.id === itemId || item.id === itemId.toString());
        if (index !== -1) {
            const deletedItem = this.items.splice(index, 1)[0];
            this.saveItems();
            console.log('Élément supprimé avec succès :', deletedItem);
            return true;
        }
        
        console.error('Élément non trouvé avec l\'ID :', itemId);
        return false;
    }

    setSelectedFolders(folderIds) {
        this.selectedFolders = new Set(folderIds);
    }
    
    setSelectedFolder(folder) {
        if (folder) {
            this.selectedFolders = new Set([folder.id]);
        } else {
            this.selectedFolders.clear();
        }
    }

    // Sauvegarder les dossiers (pour la rétrocompatibilité)
    saveFolders() {
        localStorage.setItem('folders', JSON.stringify(this.folders));
    }
    
    // Charger les dossiers (pour la rétrocompatibilité)
    loadFolders() {
        const savedFolders = localStorage.getItem('folders');
        if (savedFolders) {
            this.folders = JSON.parse(savedFolders);
        }
    }
    
    // Créer un nouveau dossier (alias pour la rétrocompatibilité)
    createNewFolder(name) {
        return this.createFolder(
            name || `Nouveau dossier ${this.nextId}`,
            '/',
            50 + (this.folders.length * 20),
            50 + (this.folders.length * 20)
        );
    }
    
    // Supprimer un dossier
    deleteFolder(id) {
        // Supprimer de la liste des dossiers
        this.folders = this.folders.filter(folder => folder.id !== id);
        this.selectedFolders.delete(id);
        this.saveFolders();
        
        // Supprimer l'élément correspondant
        return this.deleteItem(id);
    }
    
    // Mettre à jour le contenu d'un fichier
    updateFileContent(fileId, content) {
        const file = this.getItemById(fileId);
        if (file && file.type === 'file') {
            file.content = content;
            file.size = content.length;
            file.lastModified = new Date().toISOString();
            
            // Mettre à jour l'URL de l'objet Blob si nécessaire
            if (file.url) {
                URL.revokeObjectURL(file.url);
            }
            
            const fileBlob = new Blob([content], { type: file.mimeType || 'text/plain' });
            file.url = URL.createObjectURL(fileBlob);
            
            this.saveItems();
            return true;
        }
        return false;
    }
    
    // Déplacer un élément (fichier ou dossier) vers un nouveau chemin
    moveItem(itemId, targetPath) {
        console.log('Déplacement de l\'élément :', { itemId, targetPath });
        
        // Trouver l'élément à déplacer
        const item = this.getItemById(itemId);
        if (!item) {
            console.error('Élément non trouvé avec l\'ID :', itemId);
            return false;
        }
        
        // Vérifier si le déplacement est nécessaire
        if (item.path === targetPath) {
            console.log('L\'élément est déjà à cet emplacement');
            return true;
        }
        
        // Si c'est un dossier, vérifier qu'on ne le déplace pas dans lui-même ou un de ses sous-dossiers
        if (item.type === 'folder') {
            const oldPath = item.path.endsWith(item.name) 
                ? item.path 
                : `${item.path}${item.path.endsWith('/') ? '' : '/'}${item.name}`;
                
            if (targetPath.startsWith(oldPath) && targetPath !== oldPath) {
                console.error('Impossible de déplacer un dossier dans un de ses sous-dossiers');
                return false;
            }
            
            // Mettre à jour le chemin de l'élément
            const oldPathForChildren = oldPath;
            item.path = targetPath;
            
            const newPathForChildren = targetPath.endsWith(item.name) 
                ? targetPath 
                : `${targetPath}${targetPath.endsWith('/') ? '' : '/'}${item.name}`;
            
            // Mettre à jour les chemins des éléments enfants
            this.items.forEach(child => {
                if (child !== item && child.path && child.path.startsWith(oldPathForChildren)) {
                    child.path = newPathForChildren + child.path.substring(oldPathForChildren.length);
                    console.log(`Mise à jour du chemin de l'enfant : ${child.path}`);
                }
            });
        } else {
            // Pour les fichiers, simplement mettre à jour le chemin
            item.path = targetPath;
        }
        
        // Sauvegarder les modifications
        this.saveItems();
        console.log('Déplacement terminé avec succès');
        return true;
    }
}
