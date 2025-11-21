const { CosmosClient } = require('@azure/cosmos');

// Vérification des variables d'environnement
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || 'myDeskDB';
const containerId = process.env.COSMOS_CONTAINER || 'items';

if (!endpoint || !key) {
    const errorMsg = 'Les variables COSMOS_ENDPOINT et COSMOS_KEY sont requises';
    console.error('❌ Erreur de configuration:', errorMsg);
    throw new Error(errorMsg);
}

// Initialisation du client
let client;
let database;
let container;

try {
    client = new CosmosClient({
        endpoint,
        key,
        connectionPolicy: {
            enableEndpointDiscovery: true,
            preferredLocations: ['westeurope'] // Ajustez selon votre région
        }
    });

    database = client.database(databaseId);
    container = database.container(containerId);

    console.log('✅ Configuration Cosmos DB chargée avec succès');
} catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Cosmos DB:', error.message);
    throw error;
}

// Fonction pour initialiser la base de données
async function initDatabase() {
    try {
        console.log('🔍 Vérification de la base de données...');

        // Crée la base de données si elle n'existe pas
        const { database: db } = await client.databases.createIfNotExists({
            id: databaseId
        });

        console.log(`✅ Base de données "${databaseId}" prête`);

        // Configuration du conteneur
        const containerDefinition = {
            id: containerId,
            partitionKey: { paths: ['/type'] },
            indexingPolicy: {
                indexingMode: 'consistent',
                automatic: true,
                includedPaths: [{ path: '/*' }],
                excludedPaths: [{ path: '/"_etag"/?' }]
            }
        };

        // Crée le conteneur s'il n'existe pas
        const { container: itemsContainer } = await db.containers.createIfNotExists(containerDefinition);
        console.log(`✅ Conteneur "${containerId}" prêt`);

        return { client, database: db, container: itemsContainer };
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la base de données:', error.message);
        throw error;
    }
}

module.exports = {
    client,
    database,
    container,
    initDatabase
};