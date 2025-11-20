require('dotenv').config();
const sql = require('mssql/msnodesqlv8');

// Configuration de la connexion ODBC avec Active Directory Password
const config = {
    connectionString: `Driver={ODBC Driver 18 for SQL Server};` +
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

async function testConnection() {
    let pool;
    try {
        console.log('🔍 Tentative de connexion à la base de données...');
        pool = await sql.connect(config);
        console.log('✅ Connecté avec succès à la base de données !');
        
        // Test de requête simple
        const result = await pool.request().query('SELECT @@VERSION as version');
        console.log('\n📋 Version du serveur SQL:');
        console.log(result.recordset[0].version);
        
        // Test de connexion utilisateur
        const userResult = await pool.request().query('SELECT SUSER_SNAME() as current_user');
        console.log('\n👤 Utilisateur connecté:');
        console.log(userResult.recordset[0].current_user);
        
    } catch (err) {
        console.error('\n❌ Erreur de connexion:');
        console.error('Message:', err.message);
        if (err.code) console.error('Code:', err.code);
        if (err.number) console.error('Numéro erreur SQL:', err.number);
        if (err.originalError?.info) {
            console.error('\nDétails:');
            console.error(err.originalError.info.message);
        }
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔌 Connexion fermée');
        }
        sql.close();
    }
}

testConnection();
