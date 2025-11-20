# MyDeskApp - Application de Bureau

Application de gestion de fichiers et dossiers avec interface de type bureau Windows, migrée vers Angular.

## 🚀 Démarrage rapide

### 1. Installation

```bash
# Backend
npm install

# Frontend
cd client
npm install
```

### 2. Configuration

Créer un fichier `.env` à la racine :

```env
COSMOS_ENDPOINT=your_cosmos_endpoint
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE_ID=myDeskAppDB
COSMOS_CONTAINER_ID=items
PORT=3000
NODE_ENV=development
COOKIE_SECRET=your_secret_key
```

### 3. Lancer l'application

**Terminal 1 - Backend:**
```bash
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm start
```

Accéder à : `http://localhost:4200`

## 📁 Structure

```
myDeskApp/
├── client/                 # Application Angular
│   ├── src/app/
│   │   ├── components/    # Composants UI
│   │   ├── services/      # Services
│   │   └── models/        # Modèles TypeScript
│   └── package.json
├── routes/                 # Routes API Express
├── controllers/            # Contrôleurs
├── models/                 # Modèles backend
├── config/                 # Configuration
├── _old_vanilla_js/        # Ancien code (archivé)
└── package.json
```

## ✨ Fonctionnalités

- Création de dossiers et fichiers
- Glisser-déposer
- Menu contextuel
- Explorateur de fichiers
- Upload de fichiers
- Interface Angular moderne

## 🛠️ Technologies

- **Frontend**: Angular 19, RxJS, TypeScript, Bootstrap 5
- **Backend**: Node.js, Express, Azure Cosmos DB
