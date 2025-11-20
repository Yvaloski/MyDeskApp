const { CosmosClient } = require('@azure/cosmos');

// Configuration de la connexion
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || 'myDeskDB';
const containerId = process.env.COSMOS_CONTAINER || 'items';

// Initialisation du client
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// Fonction pour initialiser la base de données
async function initDatabase() {
    try {
        // Crée la base de données si elle n'existe pas
        const { database: db } = await client.databases.createIfNotExists({ id: databaseId });
        
        // Crée le conteneur avec une clé de partition '/type'
        await db.containers.createIfNotExists({
            id: containerId,
            partitionKey: { paths: ["/type"] }
        });
        
        console.log('Base de données et conteneur prêts');
        return { client, database: db, container };
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
        throw error;
    }
}

module.exports = {
    client,
    database,
    container,
    initDatabase
};
