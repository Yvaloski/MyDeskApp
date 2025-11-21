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
const { initDatabase} = require('./config/cosmos');
const globalErrorHandler = require('./middlewares/error');

// Initialiser l'application avec Cosmos DB
async function initializeApp() {
  try {
    // Initialiser la connexion à Cosmos DB
    await initDatabase();
    process.env.NODE_ENV !== 'production' && console.log('✅ Base de données Cosmos DB initialisée avec succès');
    
    const app = express();
    
    // 1) MIDDLEWARES GLOBAUX
    
    // Middleware pour ajouter l'heure de la requête
    app.use((req, res, next) => {
      req.requestTime = new Date().toISOString();
      next();
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
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

    const corsOptions = {
      origin: (origin, callback) => {
        // Autoriser les requêtes sans origine (comme les applications mobiles ou postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
          const msg = `L'origine ${origin} n'est pas autorisée par CORS`;
          return callback(new Error(msg), false);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Range', 'X-Total-Count'],
      optionsSuccessStatus: 200,
      maxAge: 600 // Durée de mise en cache des pré-vérifications CORS en secondes
    };
    
    // Appliquer CORS
    app.use(cors(corsOptions));
    
    // Gestion des requêtes OPTIONS (pré-vol)
    app.options('*', cors(corsOptions));
    
    // Limiter le nombre de requêtes depuis une même IP
    const limiter = rateLimit({
      windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 3600000, // 1 heure par défaut
      max: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : 100, // 100 requêtes par fenêtre par défaut
      message: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans une heure!',
      standardHeaders: true, // Retourne les en-têtes de limite de taux
      legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*`
      keyGenerator: (req) => {
        // Utiliser l'adresse IP du client comme clé pour le rate limiting
        return req.ip || req.connection.remoteAddress;
      }
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
