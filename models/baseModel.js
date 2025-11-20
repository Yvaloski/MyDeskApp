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
        try {
            // Utiliser la clé de partition fournie ou celle par défaut
            const pk = partitionKeyValue || this.partitionKey;
            const { resource } = await this.container.item(id, pk).read();
            return resource;
        } catch (error) {
            if (error.code === 404) {
                // Si l'élément n'est pas trouvé avec la clé de partition par défaut,
                // essayer avec le type de l'élément s'il est disponible
                if (partitionKeyValue === null && id && id.startsWith('folder-')) {
                    return this.findById(id, 'folder');
                } else if (partitionKeyValue === null && id && id.startsWith('file-')) {
                    return this.findById(id, 'file');
                }
                return null;
            }
            console.error('Erreur lors de la récupération de l\'élément:', error);
            throw error;
        }
    }

    // Trouver tous les éléments (avec pagination)
    async findAll(querySpec = {}) {
        const { resources } = await this.container.items
            .query({
                query: 'SELECT * FROM c WHERE c.type IN ("folder", "file")',
                parameters: [],
                ...querySpec
            })
            .fetchAll();
        return resources;
    }

    // Mettre à jour un élément
    async update(id, updates) {
        try {
            // Récupère l'élément existant
            const existingItem = await this.findById(id);
            if (!existingItem) return null;
            
            // Déterminer la clé de partition à utiliser
            const partitionKeyValue = updates.type || existingItem.type || this.partitionKey;

            // Mettre à jour uniquement les champs fournis dans updates
            const updatedItem = {
                ...existingItem,
                ...updates,
                updatedAt: new Date().toISOString(),
                // S'assurer que le type est toujours défini
                type: partitionKeyValue
            };

            // Remplacer l'élément
            const { resource } = await this.container
                .item(id, partitionKeyValue)
                .replace(updatedItem);
                
            return resource || updatedItem;
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
