const BaseModel = require('./baseModel');
// SQL dialect configuration for linting
// noinspection JSUnresolvedReference
// noinspection SqlResolve
// noinspection SqlNoDataSourceInspection

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
                // Si parentId est null, on récupère les éléments à la racine
                querySpec = {
                    query: 'SELECT * FROM c WHERE c.parentId = null OR c.parentId = @nullValue',
                    parameters: [
                        {name: '@nullValue', value: null}
                    ]
                };
            } else {
                // Sinon, on récupère les enfants du dossier spécifié
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

        // Renommer un élément
        async
        renameItem(id, newName)
        {
            const item = await this.getById(id);
            if (!item) throw new Error('Élément non trouvé');

            item.name = newName;
            item.path = item.parentId
                ? (await this.getFolderPath(item.parentId)) + '/' + newName
                : '/' + newName;
            item.updatedAt = new Date().toISOString();

            return await this.update(id, item);
        }
    }


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
        return await this.delete(id);
    }

    // Mettre à jour un élément
    async updateItem(id, updates) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [ItemModel.updateItem] Début de la mise à jour de l'élément ${id}`);
        console.log(`[${timestamp}] Mises à jour reçues:`, JSON.stringify(updates, null, 2));
        
        // Récupérer l'élément existant
        console.log(`[${timestamp}] Récupération de l'élément existant...`);
        const existingItem = await this.findById(id);
        
        if (!existingItem) {
            const errorMsg = `[${timestamp}] Erreur: Élément non trouvé avec l'ID ${id}`;
            console.error(errorMsg);
            throw new Error('Élément non trouvé');
        }
        
        console.log(`[${timestamp}] Élément existant:`, JSON.stringify({
            id: existingItem.id,
            name: existingItem.name,
            type: existingItem.type,
            x: existingItem.x,
            y: existingItem.y,
            updatedAt: existingItem.updatedAt
        }, null, 2));
        
        console.log('Élément existant avant mise à jour:', JSON.stringify(existingItem, null, 2));
        
        // Créer une copie de l'élément existant
        const updatedItem = { ...existingItem };
        
        // Mettre à jour uniquement les champs fournis
        const updatedFields = [];
        Object.keys(updates).forEach(key => {
            if (key in updatedItem && key !== 'id' && !key.startsWith('_')) {
                const oldValue = updatedItem[key];
                const newValue = updates[key];
                
                // Ne mettre à jour que si la valeur a changé
                if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    updatedItem[key] = newValue;
                    updatedFields.push({
                        field: key,
                        oldValue: oldValue,
                        newValue: newValue
                    });
                }
            }
        });
        
        // Mettre à jour la date de modification
        const oldUpdatedAt = updatedItem.updatedAt;
        updatedItem.updatedAt = new Date().toISOString();
        
        console.log(`[${timestamp}] Champs mis à jour:`, JSON.stringify(updatedFields, null, 2));
        console.log(`[${timestamp}] updatedAt: ${oldUpdatedAt} -> ${updatedItem.updatedAt}`);
        
        // Appeler la méthode update du parent
        console.log(`[${timestamp}] Appel de this.update avec l'ID: ${id} et les mises à jour:`, 
            JSON.stringify(updatedItem, (key, value) => 
                key === 'content' ? '[CONTENT]' : value, 2));
        
        const result = await this.update(id, updatedItem);
        
        if (!result) {
            console.error(`[${timestamp}] Erreur: Aucun résultat retourné par this.update`);
            throw new Error('Échec de la mise à jour de l\'élément');
        }
        
        console.log(`[${timestamp}] Mise à jour réussie. Résultat:`, JSON.stringify({
            id: result.id,
            name: result.name,
            type: result.type,
            x: result.x,
            y: result.y,
            updatedAt: result.updatedAt
        }, null, 2));
        
        return result;
    }
}

module.exports = new ItemModel();
