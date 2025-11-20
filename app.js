require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const { initDatabase, database} = require('./config/cosmos');
const globalErrorHandler = require('./middlewares/error');

// Initialiser la base de données et l'application
async function initializeApp() {
  try {
    // Initialiser la connexion à la base de données
    await initDatabase();
    console.log('✅ Base de données initialisée avec succès');
    
    const app = express();
    
    // 1) MIDDLEWARES GLOBAUX
    
    // Vérifier la connexion à la base de données
    app.use(async (req, res, next) => {
      try {
        // Vérifier que la base de données est accessible
        await database.read();
        next();
      } catch (error) {
        console.error('Erreur de connexion à la base de données:', error);
        res.status(500).json({
          status: 'error',
          message: 'Erreur de connexion à la base de données'
        });
      }
    });
    
    // Sécurité des en-têtes HTTP
    app.use(helmet());
    
    // Désactiver l'en-tête X-Powered-By
    app.disable('x-powered-by');
    
    // Journalisation en développement
    if (process.env.NODE_ENV === 'development') {
      app.use(logger('dev'));
    }
    
    // Configuration CORS
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://votredomaine.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
    
    // Gestion des requêtes OPTIONS (pré-vol)
    app.options('*', cors(corsOptions));
    
    // Limiter le nombre de requêtes depuis une même IP
    const limiter = rateLimit({
      max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Plus permissif en dev
      windowMs: 60 * 60 * 1000, // 1 heure
      message: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans une heure!'
    });
    app.use('/api', limiter);
    
    // Parser le corps des requêtes
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    
    // Sécurisation des cookies
    app.use(cookieParser(process.env.COOKIE_SECRET || 'votre-secret-securise'));
    
    // Nettoyer les données contre les injections NoSQL
    app.use(mongoSanitize());
    
    // Protection contre les attaques XSS
    app.use(xss());
    
    // Protection contre la pollution des paramètres
    app.use(hpp({
      whitelist: [
        'duration',
        'ratingsQuantity',
        'ratingsAverage',
        'maxGroupSize',
        'difficulty',
        'price'
      ]
    }));
    
    // Protéger contre les attaques de type Clickjacking
    app.use((req, res, next) => {
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', 'frame-ancestors \'none\'');
      next();
    });
    
    // 1) ROUTES API
    const indexRouter = require('./routes/index');
    const usersRouter = require('./routes/users');
    const uploadRouter = require('./routes/upload');
    
    // Montage des routeurs API
    app.use('/api', indexRouter);  // Ceci va inclure /api/v1/items
    app.use('/api/users', usersRouter);
    app.use('/api/upload', uploadRouter);
    
    // 2) SERVIR LES FICHIERS STATIQUES
    // D'abord les fichiers uploadés
    app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), {
      setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));
    
    app.use('/images', express.static(path.join(__dirname, 'public/images')));
    
    // Ensuite, les fichiers statiques du front-end Angular
    app.use(express.static(path.join(__dirname, 'client/dist/mydeskapp-client')));
    
    // Enfin, pour toutes les autres routes, renvoyer vers index.html pour permettre le routage côté client
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'client/dist/mydeskapp-client/index.html'));
    });
    
    // 5) GESTION DES ERREURS
    
    // Gestion des erreurs 404 pour les routes API
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        status: 'fail',
        message: `Impossible de trouver ${req.originalUrl} sur ce serveur!`
      });
    });
    
    // Gestion des erreurs globales
    app.use(globalErrorHandler);
    
    return app;
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de l\'application:', error);
    process.exit(1);
  }
}

// Initialiser l'application
let app;

// Fonction pour démarrer le serveur
const startServer = async () => {
  try {
    app = await initializeApp();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`✅ Serveur démarré sur le port ${port} en mode ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

// Exporter la fonction d'initialisation pour les tests
module.exports = { initializeApp, startServer };
