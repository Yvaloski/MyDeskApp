const BaseModel = require('./baseModel');
const fs = require('fs');
const path = require('path');

class ItemModel extends BaseModel {
    constructor() {
        super('items', 'type'); // 'items' est le nom du conteneur, 'type' est la clé de partition
    }

    // Créer un dossier
    async createFolder(name, parentId = null) {
        const folder = {
            id: `folder-${Date.now()}`,
            type: 'folder', // Type pour la clé de partition
            name,
            parentId,
            path: parentId ? await this.getFolderPath(parentId) + '/' + name : '/' + name,
            x: 0,
            y: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        console.log('Création du dossier avec les données:', folder);
        const createdFolder = await this.create(folder);
        console.log('Dossier créé avec succès:', createdFolder);
        return createdFolder;
    }

    // Créer un fichier
    async createFile(name, content, parentId = null, mimeType = 'text/plain') {
        const file = {
            id: `file-${Date.now()}`,
            type: 'file', // Type pour la clé de partition
            name,
            parentId,
            path: parentId ? await this.getFolderPath(parentId) + '/' + name : '/' + name,
            content: Buffer.from(content).toString('base64'),
            mimeType,
            size: content.length,
            x: 0,
            y: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        console.log('Création du fichier avec les données:', file);
        const createdFile = await this.create(file);
        console.log('Fichier créé avec succès:', createdFile);
        return createdFile;
    }

    // Obtenir le chemin complet d'un dossier
    async getFolderPath(folderId) {
        if (!folderId) return '';
        const folder = await this.getById(folderId);
        if (!folder) throw new Error('Dossier non trouvé');
        return folder.path;
    }

    // Lister le contenu d'un dossier
    async listDirectory(parentId = null) {
        try {
            // Construire la requête en fonction de si on est à la racine ou non
            let querySpec;
            
            if (parentId === null) {
                // Pour la racine, on cherche les éléments sans parent
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.parentId = null',
                    parameters: []
                };
            } else {
                // Pour un dossier spécifique, on cherche les éléments avec ce parent
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.parentId = @parentId',
                    parameters: [
                        { name: '@parentId', value: parentId }
                    ]
                };
            }
            
            console.log('Exécution de la requête:', JSON.stringify(querySpec, null, 2));
            
            const results = await this.query(querySpec);
            console.log(`Contenu brut du dossier ${parentId || 'racine'}:`, results);
            
            // Filtrer les résultats pour ne retourner que les éléments valides
            const processedResults = results.filter(item => item && (item.type === 'folder' || item.type === 'file'));
            
            console.log(`Résultats traités (${processedResults.length} éléments):`, processedResults);
            return processedResults;
        } catch (error) {
            console.error('Erreur lors de la récupération du contenu du dossier:', error);
            throw error;
        }
    }

    // Renommer un élément
    async renameItem(id, newName) {
        const item = await this.getById(id);
        if (!item) throw new Error('Élément non trouvé');
        
        item.name = newName;
        item.path = item.parentId 
            ? (await this.getFolderPath(item.parentId)) + '/' + newName 
            : '/' + newName;
        item.updatedAt = new Date().toISOString();
        
        return await this.update(id, item);
    }

    // Supprimer un élément (et son contenu si c'est un dossier)
    async deleteItem(id) {
        // Si c'est un dossier, on supprime d'abord son contenu
        const children = await this.listDirectory(id);
        for (const child of children) {
            await this.deleteItem(child.id);
        }
        
        // Puis on supprime l'élément lui-même
        return await this.delete(id);
    }

    // Autres méthodes spécifiques aux items...
}

module.exports = new ItemModel();
