export class DesktopService {
    constructor() {
        this.items = []; // Contient à la fois les dossiers et fichiers
        this.loadItems();
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
    
    // Créer un nouveau dossier
    createFolder(name, path = '/', x = 0, y = 0) {
        return this.addItem({
            type: 'folder',
            name,
            path,
            x,
            y
        });
    }
    
    // Ajouter un fichier
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
    
    // Supprimer un élément
    removeItem(itemId) {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.items.splice(index, 1);
            this.saveItems();
            return true;
        }
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

    addFolder(name, x, y) {
        const folder = {
            id: this.nextId++,
            name: name || `Nouveau dossier ${this.nextId}`,
            x: x || 20,
            y: y || 20,
            createdAt: new Date().toISOString()
        };
        this.folders.push(folder);
        this.saveFolders();
        return folder;
    }

    deleteFolder(id) {
        this.folders = this.folders.filter(folder => folder.id !== id);
        this.selectedFolders.delete(id);
        this.saveFolders();
    }

    createNewFolder(name) {
        const newFolder = this.addFolder(name, 50 + (this.folders.length * 20), 50 + (this.folders.length * 20));
        return newFolder;
    }
}
