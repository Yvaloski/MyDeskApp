const sql = require('mssql/msnodesqlv8');

// Configuration de la connexion ODBC avec Active Directory Password
const config = {
  connectionString: 'Driver={ODBC Driver 18 for SQL Server};' +
    `Server=${process.env.DB_SERVER || 'tcp:mydeskserver.database.windows.net,1433'};` +
    `Database=${process.env.DB_NAME || 'myDesk-ddb'};` +
    `Uid=${process.env.DB_USER};` +
    `Pwd=${process.env.DB_PASSWORD};` +
    'Encrypt=yes;' +
                     'TrustServerCertificate=no;' +
                     'Connection Timeout=30;' +
                     'Authentication=ActiveDirectoryPassword',
    options: {
        driver: 'ODBC Driver 18 for SQL Server',
        connectionTimeout: 30000,
        requestTimeout: 30000,
        trustedConnection: false,
        enableArithAbort: true
    }
};

// Pool de connexions
let connectionPool = null;

// Fonction pour établir la connexion
async function getConnection() {
    try {
        if (connectionPool) {
            return connectionPool;
        }

        connectionPool = await new sql.ConnectionPool(config).connect();
        console.log('Connecté à Azure SQL Database avec succès');
        
        // Gestion des erreurs de connexion
        connectionPool.on('error', err => {
            console.error('Erreur de connexion à la base de données:', err);
            connectionPool = null; // Force une nouvelle connexion au prochain appel
        });

        return connectionPool;
    } catch (err) {
        console.error('Erreur lors de la connexion à la base de données:', err);
        connectionPool = null;
        throw err;
    }
}

// Gestion de la fermeture de l'application
process.on('SIGINT', async () => {
    if (connectionPool) {
        await connectionPool.close();
        console.log('Connexion à la base de données fermée');
    }
    process.exit(0);
});

module.exports = {
    sql,
    getConnection,
    close: async () => {
        if (connectionPool) {
            await connectionPool.close();
            connectionPool = null;
        }
    }
};
