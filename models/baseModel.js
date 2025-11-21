const { container } = require('../config/cosmos');

class BaseModel {
    constructor(containerId, partitionKey) {
        this.container = container.database.container(containerId);
        this.partitionKey = partitionKey;
    }

    // Créer un nouvel élément
    async create(item) {
        // Ajoute la date de création (ne pas écraser le type s'il est déjà défini)
        const newItem = {
            ...item,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // S'assurer que le type est défini pour la clé de partition
        if (!newItem.type) {
            newItem.type = this.partitionKey;
        }
        
        const { resource } = await this.container.items.create(newItem);
        return resource;
    }

    // Trouver un élément par son ID
    async findById(id, partitionKeyValue = null) {
        console.log(`[BaseModel.findById] Début de la recherche de l'élément ${id}`);
        
        try {
            // Déterminer la clé de partition en fonction du type d'élément
            let pk = partitionKeyValue;
            
            // Si aucune clé de partition n'est fournie, la déterminer à partir de l'ID
            if (!pk) {
                if (id && id.startsWith('folder-')) {
                    pk = 'folder';
                } else if (id && id.startsWith('file-')) {
                    pk = 'file';
                } else {
                    pk = this.partitionKey;
                }
            }
            
            console.log(`[BaseModel.findById] Recherche de l'élément ${id} avec la clé de partition '${pk}'`);
            
            try {
                const response = await this.container.item(id, pk).read();
                
                // S'assurer que x et y ont des valeurs par défaut
                if (response.resource) {
                    const result = {
                        ...response.resource,
                        x: typeof response.resource.x === 'number' ? response.resource.x : 0,
                        y: typeof response.resource.y === 'number' ? response.resource.y : 0
                    };
                    
                    console.log('[BaseModel.findById] Élément trouvé:', {
                        id: result.id,
                        type: result.type,
                        name: result.name,
                        x: result.x,
                        y: result.y,
                        parentId: result.parentId,
                        path: result.path
                    });
                    
                    return result;
                }
                
                console.log(`[BaseModel.findById] Aucun élément trouvé avec l'ID ${id} et la clé de partition '${pk}'`);
                return null;
                
            } catch (readError) {
                console.error('[BaseModel.findById] Erreur lors de la lecture de l\'élément:', {
                    id,
                    partitionKey: pk,
                    errorCode: readError.code,
                    errorMessage: readError.message
                });
                
                // Si l'erreur est 404, essayer avec une autre clé de partition si possible
                if (readError.code === 404 && !partitionKeyValue) {
                    const alternatePk = pk === 'file' ? 'folder' : 'file';
                    console.log(`[BaseModel.findById] Tentative avec une autre clé de partition: ${alternatePk}`);
                    return this.findById(id, alternatePk);
                }
                
                throw readError;
            }
            
        } catch (error) {
            console.error(`[BaseModel.findById] Erreur lors de la recherche de l'élément ${id}:`, {
                errorCode: error.code,
                errorMessage: error.message
            });
            
            // Si c'est une erreur 404, retourner null au lieu de lancer une erreur
            if (error.code === 404) {
                return null;
            }
            
            throw error;
        }
    }


    // Alias pour la compatibilité avec le code existant
    async getById(id, partitionKeyValue = null) {
        return this.findById(id, partitionKeyValue);
    }

    // Supprimer un élément par son ID
    async deleteById(id, partitionKeyValue = null) {
        try {
            console.log(`[BaseModel.deleteById] Tentative de suppression de l'élément ${id} avec partitionKeyValue: ${partitionKeyValue}`);
            
            // Déterminer la clé de partition à utiliser
            let pk = partitionKeyValue || this.partitionKey;
            
            // Si aucune clé de partition n'est fournie, la déterminer à partir de l'ID
            if (!pk) {
                if (id && id.startsWith('folder-')) {
                    pk = 'folder';
                } else if (id && id.startsWith('file-')) {
                    pk = 'file';
                } else {
                    pk = this.partitionKey;
                }
                console.log(`[BaseModel.deleteById] Clé de partition déduite: ${pk}`);
            }
            
            console.log(`[BaseModel.deleteById] Tentative de suppression de l'élément ${id} avec la clé de partition '${pk}'`);
            
            // Vérifier d'abord si l'élément existe
            console.log(`[BaseModel.deleteById] Vérification de l'existence de l'élément ${id}`);
            const item = await this.findById(id, pk);
            
            if (!item) {
                // Si l'élément n'est pas trouvé, essayer avec l'autre clé de partition
                if (!partitionKeyValue) {
                    const alternatePk = pk === 'file' ? 'folder' : 'file';
                    console.log(`[BaseModel.deleteById] Tentative avec une autre clé de partition: ${alternatePk}`);
                    return this.deleteById(id, alternatePk);
                }
                
                const errorMsg = `[BaseModel.deleteById] Élément avec l'ID ${id} non trouvé`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log(`[BaseModel.deleteById] Élément trouvé:`, {
                id: item.id,
                type: item.type,
                name: item.name,
                parentId: item.parentId,
                path: item.path
            });
            
            // Supprimer l'élément
            console.log(`[BaseModel.deleteById] Appel à container.item(${id}, ${pk}).delete()`);
            
            const result = await this.container.item(id, pk).delete();
            
            console.log(`[BaseModel.deleteById] Réponse de Cosmos DB:`, {
                statusCode: result.statusCode,
                requestCharge: result.requestCharge,
                activityId: result.activityId
            });
            
            console.log(`[BaseModel.deleteById] Élément ${id} supprimé avec succès`);
            
            return { 
                id,
                status: 'deleted',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const errorMsg = `[BaseModel.deleteById] Échec de la suppression de l'élément ${id}: ${error.message}`;
            console.error(errorMsg);
            
            // Si c'est une erreur 404, essayer avec l'autre clé de partition
            if (error.code === 404 && !partitionKeyValue) {
                const alternatePk = pk === 'file' ? 'folder' : 'file';
                console.log(`[BaseModel.deleteById] Tentative avec une autre clé de partition: ${alternatePk}`);
                return this.deleteById(id, alternatePk);
            }
            
            throw error;
        }
    }

    /**
     * Find all items matching the query
     * @param {Object} [querySpec] - Optional query specification to customize the CosmosDB query
     * @returns {Promise<Array>} Array of items
     */
    async findAll(querySpec = {}) {
        const queryOptions = {
            query: 'SELECT c.id, c.name, c.type, c.parentId, c.path, c.x, c.y, c.size, c.mimeType, c.content, c.createdAt, c.updatedAt FROM c WHERE c.type IN ("folder", "file")',
            parameters: []
        };
        
        // Merge with provided querySpec
        const finalQuery = { ...queryOptions, ...querySpec };
        
        const { resources } = await this.container.items
            .query(finalQuery)
            .fetchAll();
            
        // S'assurer que x et y ont des valeurs par défaut
        return resources.map(item => ({
            ...item,
            x: typeof item.x === 'number' ? item.x : 0,
            y: typeof item.y === 'number' ? item.y : 0
        }));
    }

    // Mettre à jour un élément
    async update(id, updates) {
        try {
            console.log(`[UPDATE] Début de la mise à jour de l'élément ${id}`);
            console.log('Mises à jour reçues:', JSON.stringify(updates, null, 2));
            
            // Récupère l'élément existant directement depuis le conteneur
            const { resource: existingItem } = await this.container.item(id, updates.type || this.partitionKey).read();
            
            if (!existingItem) {
                console.error(`[UPDATE] Élément non trouvé: ${id}`);
                return null;
            }
            
            console.log('[UPDATE] Élément existant:', JSON.stringify(existingItem, null, 2));
            
            // Déterminer la clé de partition à utiliser
            const partitionKeyValue = updates.type || existingItem.type || this.partitionKey;
            
            // Créer une copie de l'élément existant
            const updatedItem = { ...existingItem };
            
            // Mettre à jour uniquement les champs fournis dans updates
            Object.keys(updates).forEach(key => {
                if (key in updatedItem && key !== 'id' && key !== '_etag' && key !== '_rid' && key !== '_self' && key !== '_ts') {
                    updatedItem[key] = updates[key];
                }
            });
            
            // Mettre à jour le timestamp
            updatedItem.updatedAt = new Date().toISOString();
            
            console.log('[UPDATE] Élément après mise à jour:', JSON.stringify(updatedItem, null, 2));
            
            // Remplacer l'élément
            const { resource } = await this.container
                .item(id, partitionKeyValue)
                .replace(updatedItem);
                
            console.log('[UPDATE] Résultat de la mise à jour:', resource ? 'succès' : 'échec');
            
            // Retourner l'élément mis à jour avec les valeurs par défaut pour x et y si nécessaire
            const result = resource || updatedItem;
            return {
                ...result,
                x: typeof result.x === 'number' ? result.x : 0,
                y: typeof result.y === 'number' ? result.y : 0
            };
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'élément:', error);
            throw error;
        }
    }

    // Supprimer un élément
    async delete(id) {
        try {
            // D'abord, récupérer l'élément pour le retourner
            const item = await this.findById(id);
            if (!item) {
                return { success: false, id, error: 'Not found' };
            }
            
            // Puis le supprimer
            await this.container
                .item(id, this.partitionKey)
                .delete();
                
            return { success: true, id, item };
        } catch (error) {
            if (error.code === 404) return { success: false, id, error: 'Not found' };
            console.error('Erreur lors de la suppression:', error);
            return { success: false, id, error: error.message };
        }
    }

    // Recherche avec un filtre personnalisé
    async query(querySpec) {
        const { resources } = await this.container.items.query(querySpec).fetchAll();
        return resources;
    }
}

module.exports = BaseModel;
