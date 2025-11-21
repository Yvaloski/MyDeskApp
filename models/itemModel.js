const BaseModel = require('./baseModel');

class ItemModel extends BaseModel {
    constructor() {
        super('items', 'type'); // 'items' est le nom du conteneur, 'type' est la clé de partition
    }

    // ==============================================
    // MÉTHODES DE CRÉATION
    // ==============================================

    // Créer un dossier
    async createFolder(name, parentId = null) {
        const folder = {
            id: `folder-${Date.now()}`,
            type: 'folder',
            name,
            parentId,
            path: parentId ? await this.getFolderPath(parentId) + '/' + name : '/' + name,
            x: 0,
            y: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const createdFolder = await this.create(folder);
        return createdFolder;
    }

    // Créer un fichier
    async createFile(name, content, parentId = null, mimeType = 'text/plain') {
        const file = {
            id: `file-${Date.now()}`,
            type: 'file',
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
        
        const createdFile = await this.create(file);
        return createdFile;
    }

    // ==============================================
    // MÉTHODES DE RÉCUPÉRATION
    // ==============================================

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
            let querySpec;

            if (parentId === null) {
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.parentId = null OR c.parentId = @nullValue',
                    parameters: [
                        {name: '@nullValue', value: null}
                    ]
                };
            } else {
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.parentId = @parentId',
                    parameters: [
                        {name: '@parentId', value: parentId}
                    ]
                };
            }

            const {resources: items} = await this.container.items.query(querySpec).fetchAll();
            return items;
        } catch (error) {
            console.error('Erreur lors de la récupération du contenu du dossier:', error);
            throw error;
        }
    }

    // Trouver tous les éléments par parentId
    async findByParentId(parentId) {
        const query = {
            query: 'SELECT * FROM c WHERE c.parentId = @parentId',
            parameters: [
                { name: '@parentId', value: parentId }
            ]
        };
        
        const { resources } = await this.container.items.query(query).fetchAll();
        return resources;
    }

    // ==============================================
    // MÉTHODES DE MISE À JOUR
    // ==============================================

    // Mettre à jour un élément
    async updateItem(id, updates) {
        try {
            const timestamp = new Date().toISOString();
            
            // Récupérer l'élément existant
            const existingItem = await this.findById(id);
            if (!existingItem) {
                throw new Error('Élément non trouvé');
            }
            
            // Créer une copie de l'élément existant
            const updatedItem = { ...existingItem };
            
            // Mettre à jour uniquement les champs fournis
            Object.keys(updates).forEach(key => {
                if (key in updatedItem && key !== 'id' && !key.startsWith('_')) {
                    updatedItem[key] = updates[key];
                }
            });
            
            // Mettre à jour la date de modification
            updatedItem.updatedAt = new Date().toISOString();
            
            // Appeler la méthode update du parent
            const result = await this.update(id, updatedItem);
            if (!result) {
                throw new Error('Échec de la mise à jour de l\'élément');
            }
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'élément:', error);
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

        return this.updateItem(id, item);
    }

    // ==============================================
    // MÉTHODES DE SUPPRESSION
    // ==============================================

    // Supprimer un élément par son ID
    async deleteById(id) {
        try {
            // Déterminer la clé de partition en fonction du type d'élément
            let partitionKey = id.startsWith('folder-') ? 'folder' : 
                             (id.startsWith('file-') ? 'file' : this.partitionKey);
            
            const { resource: result } = await this.container.item(id, partitionKey).delete();
            return result;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'élément:', error);
            throw error;
        }
    }

    // Supprimer un élément et ses enfants récursivement
    async deleteItem(id) {
        // D'abord, on récupère tous les enfants
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.parentId = @id',
            parameters: [
                { name: '@id', value: id }
            ]
        };
        
        const { resources: children } = await this.container.items.query(querySpec).fetchAll();
        
        // Supprimer récursivement les enfants
        for (const child of children) {
            await this.deleteItem(child.id);
        }
        
        // Puis on supprime l'élément lui-même
        return await this.deleteById(id);
    }

    // ==============================================
    // MÉTHODES DE DÉPLACEMENT
    // ==============================================

    // Déplacer un élément vers un nouveau dossier parent
    async moveItem(itemId, targetParentId) {
        try {
            // Récupérer l'élément à déplacer
            const item = await this.getById(itemId);
            if (!item) {
                throw new Error('Élément non trouvé');
            }

            // Si le parent ne change pas, retourner l'élément tel quel
            if (String(item.parentId) === String(targetParentId)) {
                return item;
            }

            // Vérifier que la cible est un dossier
            let target = null;
            if (targetParentId) {
                target = await this.getById(targetParentId);
                if (!target || target.type !== 'folder') {
                    throw new Error('La cible doit être un dossier valide');
                }
                
                // Vérifier que la cible n'est pas un descendant de l'élément à déplacer
                if (item.type === 'folder') {
                    const isDescendant = await this.isDescendant(item, target);
                    if (isDescendant) {
                        throw new Error('Impossible de déplacer un dossier dans un de ses propres sous-dossiers');
                    }
                }
            }

            // Vérifier qu'on ne déplace pas un dossier dans lui-même
            if (target && item.type === 'folder' && item.id === target.id) {
                throw new Error('Impossible de déplacer un dossier dans lui-même');
            }

            // Mettre à jour le parent et le chemin
            const oldPath = item.path;
            item.parentId = targetParentId || null;
            
            // Construire le nouveau chemin
            if (target) {
                item.path = (target.path.endsWith('/') ? target.path : target.path + '/') + item.name;
            } else {
                item.path = '/' + item.name;
            }
            
            // Mettre à jour la date de modification
            item.updatedAt = new Date().toISOString();

            // Sauvegarder les modifications
            const updatedItem = await this.updateItem(item.id, item);
            
            // Si c'est un dossier, mettre à jour les chemins des éléments enfants
            if (item.type === 'folder' && oldPath !== item.path) {
                await this.updateChildrenPaths(item.id, item.path);
            }

            return updatedItem;
        } catch (error) {
            console.error('Erreur lors du déplacement de l\'élément:', error);
            throw error;
        }
    }
    
    // Vérifier si un élément est un descendant d'un autre
    async isDescendant(parent, child) {
        if (!child.parentId) return false;
        if (child.parentId === parent.id) return true;
        
        const parentItem = await this.getById(child.parentId);
        return parentItem ? this.isDescendant(parent, parentItem) : false;
    }

    // Mettre à jour les chemins des éléments enfants
    async updateChildrenPaths(parentId, parentPath) {
        const children = await this.findByParentId(parentId);
        for (const child of children) {
            child.path = parentPath + '/' + child.name;
            await this.updateItem(child.id, child);
            
            // Mettre à jour récursivement les sous-dossiers
            if (child.type === 'folder') {
                await this.updateChildrenPaths(child.id, child.path);
            }
        }
    }
}

module.exports = new ItemModel();
