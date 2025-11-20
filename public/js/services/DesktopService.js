const API_BASE_URL = 'http://localhost:3000/api/v1/items';

export class DesktopService {
    constructor() {
        this.items = [];
        this.folders = [];
        this.selectedFolders = new Set();
        this.isInitialized = false;
        
        // Charger les données initiales
        this.initialize().catch(error => {
            console.error('Erreur lors de l\'initialisation de DesktopService:', error);
        });
    }
    
    async initialize() {
        await this.loadInitialData();
        this.loadPositionsFromLocalStorage();
        this.isInitialized = true;
    }
    
    // Méthode utilitaire pour les appels API
    async apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`API Request: ${options.method || 'GET'} ${url}`);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include', // Important pour les cookies de session
                ...options
            });

            let data;
            try {
                data = await response.json();
                console.log(`API Response (${response.status}):`, data);
            } catch (e) {
                console.error('Erreur lors du parsing de la réponse JSON:', e);
                throw new Error('Réponse du serveur invalide');
            }

            if (!response.ok) {
                const errorMessage = data?.message || `Erreur ${response.status}: ${response.statusText}`;
                console.error(`Erreur API (${response.status}):`, errorMessage);
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error('Erreur API:', error.message, 'URL:', url);
            throw error;
        }
    }
    
    // Charger les données initiales
    async loadInitialData() {
        try {
            console.log('Chargement des données initiales...');
            
            // Créer des données de test pour le débogage
            const testData = [
                { id: 'folder1', name: 'Documents', type: 'folder', x: 50, y: 50 },
                { id: 'folder2', name: 'Images', type: 'folder', x: 200, y: 50 },
                { id: 'file1', name: 'test.txt', type: 'file', x: 50, y: 150 }
            ];
            
            this.items = [...testData];
            this.folders = this.items.filter(item => item.type === 'folder');
            
            console.log('Données de test chargées:', this.items);
            return true;
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.items = [];
            this.folders = [];
            throw error; // Propager l'erreur pour une gestion ultérieure
        }
    }
    
    // Récupérer tous les éléments d'un dossier
    async getItemsInPath(path = '/') {
        try {
            console.log(`Récupération des éléments pour le chemin: '${path}'`);
            
            // Normaliser le chemin
            const normalizedPath = path.replace(/^\/+|\/+$/g, '') || '/';
            
            // Pour la racine, retourner les données en cache
            if (normalizedPath === '' || normalizedPath === '/') {
                console.log('Retour des données en cache pour la racine');
                return [...this.items];
            }
            
            // Pour les autres chemins, retourner un tableau vide pour l'instant
            console.log('Chemin non géré:', normalizedPath);
            return [];
        } catch (error) {
            console.error('Erreur lors de la récupération des éléments:', error);
            return [];
        }
    }
    
    // Vider le cache et le localStorage
    clearCache() {
        console.log('Vidage du cache...');
        this.items = [];
        this.folders = [];
        try {
            localStorage.removeItem('itemPositions');
            console.log('Cache et localStorage vidés');
        } catch (e) {
            console.error('Erreur lors de la suppression du cache:', e);
        }
        return this;
    }
    
    // Récupérer un élément par son ID
    async getItemById(id) {
        try {
            console.log(`Tentative de récupération de l'élément avec l'ID: ${id}`);
            
            // Si l'ID est 'directory', retourner un objet dossier racine
            if (id === 'directory' || id === '/') {
                console.log('Accès au dossier racine');
                return {
                    id: 'root',
                    name: 'Racine',
                    type: 'folder',
                    path: '/',
                    parentId: null,
                    x: 0,
                    y: 0
                };
            }
            
            // Pour les autres IDs, faire un appel API
            const data = await this.apiRequest(`/${id}`);
            console.log('Réponse API pour getItemById:', data);
            
            // Retourner les données en fonction de la structure de la réponse
            return data.data || data;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'élément:', error);
            return null;
        }
    }
    
    // Créer un nouveau dossier
    async createFolder(name, parentId = null, x = 0, y = 0) {
        try {
            console.log(`Création du dossier: ${name}, parentId: ${parentId}, x: ${x}, y: ${y}`);
            const response = await this.apiRequest('/items/folders', {
                method: 'POST',
                body: JSON.stringify({ 
                    name, 
                    parentId: parentId || null,
                    x: x || 0,
                    y: y || 0,
                    type: 'folder'
                })
            });
            
            // Vérifier le format de la réponse
            if (!response || response.status !== 'success' || !response.data || !response.data.folder) {
                console.error('Réponse du serveur inattendue:', response);
                throw new Error('Réponse du serveur invalide lors de la création du dossier');
            }
            
            const folder = response.data.folder;
            console.log('Dossier créé avec succès:', folder);
            
            // Mettre à jour les données locales
            const existingIndex = this.items.findIndex(item => item.id === folder.id);
            if (existingIndex >= 0) {
                this.items[existingIndex] = folder;
            } else {
                this.items.push(folder);
            }
            
            // Mettre à jour la liste des dossiers
            const folderIndex = this.folders.findIndex(f => f.id === folder.id);
            if (folderIndex >= 0) {
                this.folders[folderIndex] = folder;
            } else {
                this.folders.push(folder);
            }
            
            console.log(`Dossier créé avec succès:`, folder);
            return folder;
        } catch (error) {
            console.error('Erreur lors de la création du dossier:', error);
            throw error;
        }
    }
    
    // Créer un nouveau fichier
    async uploadFile(file, parentId = null) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (parentId) {
                formData.append('parentId', parentId);
            }
            
            const response = await fetch(`${API_BASE_URL}/items/files`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erreur lors du téléchargement du fichier');
            }
            
            const data = await response.json();
            const newFile = data.data.file;
            this.items.push(newFile);
            return newFile;
        } catch (error) {
            console.error('Erreur lors du téléchargement du fichier:', error);
            throw error;
        }
    }
    
    // Mettre à jour la position d'un élément (avec sauvegarde en base de données)
    async updateItemPosition(itemId, x, y) {
        if (!itemId) {
            console.error('Impossible de mettre à jour la position : ID de l\'élément non défini');
            return null;
        }
        
        try {
            console.log(`Mise à jour de la position de l'élément ${itemId} vers (${x}, ${y})`);
            
            // Mettre à jour les données locales
            const itemIndex = this.items.findIndex(i => i.id === itemId);
            if (itemIndex >= 0) {
                // Mettre à jour l'élément dans le tableau items
                this.items[itemIndex] = {
                    ...this.items[itemIndex],
                    x,
                    y,
                    updatedAt: new Date().toISOString()
                };
                
                // Si c'est un dossier, mettre à jour également le tableau des dossiers
                if (this.items[itemIndex].type === 'folder') {
                    const folderIndex = this.folders.findIndex(f => f.id === itemId);
                    if (folderIndex >= 0) {
                        this.folders[folderIndex] = {
                            ...this.folders[folderIndex],
                            x,
                            y,
                            updatedAt: new Date().toISOString()
                        };
                    }
                    
                    // Sauvegarder la position dans le localStorage
                    try {
                        const positions = JSON.parse(localStorage.getItem('itemPositions') || '{}');
                        positions[itemId] = { x, y };
                        localStorage.setItem('itemPositions', JSON.stringify(positions));
                        console.log(`Position de l'élément ${itemId} sauvegardée dans le localStorage`);
                    } catch (error) {
                        console.error('Erreur lors de la sauvegarde de la position dans le localStorage:', error);
                    }
                }
                
                return this.items[itemIndex];
            }
            
            console.error(`Élément avec l'ID ${itemId} non trouvé dans les données locales`);
            return null;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la position:', error);
            return null;
        }
    }
    
    // Ajouter un fichier existant (upload)
    async addFile(file, path = '/', x = 0, y = 0) {
        try {
            // Extraire le nom du fichier sans l'extension
            const name = file.name.replace(/\.[^/.]+$/, '');
            
            // Lire le contenu du fichier
            const content = await this.readFileAsText(file);
            
            // Créer le fichier en utilisant createFile
            return await this.createFile(
                name,
                path === '/' ? null : path,
                x,
                y,
                content,
                file.type
            );
        } catch (error) {
            console.error('Erreur lors de l\'ajout du fichier:', error);
            throw error;
        }
    }
    
    // Méthode utilitaire pour lire un fichier comme texte
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }
    
    // Supprimer un élément (alias pour compatibilité)
    removeItem(itemId) {
        return this.deleteItem(itemId);
    }
    
    // Supprimer un élément par son ID
    async deleteItem(itemId) {
        console.log('Tentative de suppression de l\'élément avec ID :', itemId);
        try {
            // Supprimer l'élément du serveur
            const response = await this.apiRequest(`/items/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response && response.status === 'success') {
                // Mettre à jour les données locales
                const index = this.items.findIndex(item => item.id === itemId || item.id === itemId.toString());
                if (index !== -1) {
                    const deletedItem = this.items.splice(index, 1)[0];
                    // Si c'est un dossier, le supprimer aussi du tableau des dossiers
                    if (deletedItem.type === 'folder') {
                        const folderIndex = this.folders.findIndex(f => f.id === itemId);
                        if (folderIndex !== -1) {
                            this.folders.splice(folderIndex, 1);
                        }
                    }
                    console.log('Élément supprimé avec succès :', deletedItem);
                    return true;
                }
            }
            
            console.error('Échec de la suppression de l\'élément avec l\'ID :', itemId);
            return false;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'élément :', error);
            return false;
        }
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
    
    // Charger les positions depuis le localStorage
    loadPositionsFromLocalStorage() {
        try {
            const positions = JSON.parse(localStorage.getItem('itemPositions') || '{}');
            console.log('Positions chargées depuis le localStorage:', positions);
            
            // Mettre à jour les positions des éléments chargés
            this.items = this.items.map(item => {
                if (positions[item.id]) {
                    const posX = Number(positions[item.id].x) || 0;
                    const posY = Number(positions[item.id].y) || 0;
                    const updatedItem = { 
                        ...item, 
                        x: posX,
                        y: posY
                    };
                    console.log(`Position chargée pour ${item.id}:`, { x: posX, y: posY });
                    return updatedItem;
                }
                return item;
            });
            
            // Mettre à jour les dossiers
            this.folders = this.folders.map(folder => {
                if (positions[folder.id]) {
                    const posX = Number(positions[folder.id].x) || 0;
                    const posY = Number(positions[folder.id].y) || 0;
                    return {
                        ...folder,
                        x: posX,
                        y: posY
                    };
                }
                return folder;
            });
            
            console.log('Mise à jour des positions terminée');
        } catch (error) {
            console.error('Erreur lors du chargement des positions depuis le localStorage:', error);
        }
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
    
    // Créer un nouveau fichier
    async createFile(name, parentId = null, x = 0, y = 0, content = '', mimeType = 'text/plain') {
        try {
            console.log(`Création du fichier: ${name}, parentId: ${parentId}, type: ${mimeType}`);
            const response = await this.apiRequest('/items/files', {
                method: 'POST',
                body: JSON.stringify({ 
                    name, 
                    parentId: parentId || null,
                    x: x || 0,
                    y: y || 0,
                    content: typeof content === 'string' ? content : '',
                    mimeType: mimeType || 'text/plain',
                    type: 'file',
                    size: content ? content.length : 0
                })
            });
            
            // Vérifier le format de la réponse
            if (!response || response.status !== 'success' || !response.data || !response.data.file) {
                console.error('Réponse du serveur inattendue:', response);
                throw new Error('Réponse du serveur invalide lors de la création du fichier');
            }
            
            const file = response.data.file;
            console.log('Fichier créé avec succès:', file);
            
            // Mettre à jour les données locales
            const existingIndex = this.items.findIndex(item => item.id === file.id);
            if (existingIndex >= 0) {
                this.items[existingIndex] = file;
            } else {
                this.items.push(file);
            }
            
            console.log(`Fichier créé avec succès:`, file);
            return file;
        } catch (error) {
            console.error('Erreur lors de la création du fichier:', error);
            throw error;
        }
    }
    
    // Alias pour la rétrocompatibilité
    createNewFile(name, parentId = null, x = 0, y = 0, content = '', mimeType = 'text/plain') {
        return this.createFile(name, parentId, x, y, content, mimeType);
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
    async moveItem(itemId, targetPath) {
        console.log('Déplacement de l\'élément :', { itemId, targetPath });
        
        try {
            // Appel à l'API pour déplacer l'élément
            const data = await this.apiRequest(`/items/${itemId}/move`, {
                method: 'PATCH',
                body: JSON.stringify({ targetPath })
            });
            
            // Mettre à jour les données locales
            const updatedItem = data.data.item;
            const itemIndex = this.items.findIndex(item => item.id === itemId);
            
            if (itemIndex !== -1) {
                this.items[itemIndex] = updatedItem;
            } else {
                this.items.push(updatedItem);
            }
            
            console.log('Déplacement terminé avec succès');
            return true;
            
        } catch (error) {
            console.error('Erreur lors du déplacement de l\'élément :', error);
            return false;
        }
    }
}
