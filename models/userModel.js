const BaseModel = require('./baseModel');

class UserModel extends BaseModel {
    constructor() {
        super('users', 'user'); // 'users' est le nom du conteneur, 'user' est la clé de partition
    }

    // Trouver un utilisateur par email
    async findByEmail(email) {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.email = @email AND c.type = @type',
            parameters: [
                { name: '@email', value: email },
                { name: '@type', value: this.partitionKey }
            ]
        };
        
        const results = await this.query(querySpec);
        return results[0] || null;
    }

    // Mettre à jour le mot de passe
    async updatePassword(userId, newPasswordHash) {
        return this.update(userId, {
            password: newPasswordHash,
            passwordChangedAt: new Date().toISOString()
        });
    }

    // Désactiver un compte utilisateur
    async deactivateAccount(userId) {
        return this.update(userId, {
            isActive: false,
            deactivatedAt: new Date().toISOString()
        });
    }
}

// Exporte une instance unique du modèle
module.exports = new UserModel();
