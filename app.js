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
      : [
          'http://localhost:3000', 
          'http://127.0.0.1:3000', 
          'http://localhost:5500', 
          'http://127.0.0.1:5500',
          'https://mydeskapp-gdfzegdabhhdhxd5.azurewebsites.net',
          'https://mydeskapp-gdfzegdabhhdhxd5.scm.azurewebsites.net',
          'https://mydeskapp-gdfzegdabhhdhxd5.norwayeast-01.azurewebsites.net',
          'https://mydeskapp-gdfzegdabhhdhxd5.scm.norwayeast-01.azurewebsites.net'
        ];

    console.log('Origines CORS autorisées :', allowedOrigins);

    const corsOptions = {
      origin: (origin, callback) => {
        // Autoriser toutes les origines en développement
        if (process.env.NODE_ENV === 'development') {
          console.log('Mode développement - Toutes les origines sont autorisées');
          return callback(null, true);
        }
        
        // En production, vérifier les origines autorisées
        if (!origin || allowedOrigins.includes(origin)) {
          console.log(`Origine autorisée : ${origin}`);
          return callback(null, true);
        }
        
        const errorMsg = `L'origine ${origin} n'est pas autorisée par CORS`;
        console.error('Erreur CORS:', errorMsg);
        return callback(new Error(errorMsg), false);
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
        // Utiliser x-forwarded-for si disponible (derrière un proxy comme Azure)
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress;
        return ip.replace(/^.*:/, ''); // Extraire l'IPv4 si c'est une adresse IPv6 mappée
    },
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans une heure!'
      });
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
    // 2) CONFIGURATION DES ROUTES API
    const indexRouter = require('./routes/index');
    const usersRouter = require('./routes/users');
    const uploadRouter = require('./routes/upload');
    
    // Montage des routeurs API
    app.use('/api', indexRouter);  // Ceci va inclure /api/v1/items
    app.use('/api/users', usersRouter);
    app.use('/api/upload', uploadRouter);
    
    // 3) CONFIGURATION DES FICHIERS STATIQUES
    const publicPath = process.env.NODE_ENV === 'production' 
      ? path.join(__dirname) 
      : path.join(__dirname, 'public');
    
    console.log(`Serving static files from: ${publicPath}`);
    
    // Servir les fichiers statiques
    app.use(express.static(publicPath));
    
    // Gérer les uploads et les images
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.use('/images', express.static(path.join(publicPath, 'images')));
    
    // 4) GESTION DES ROUTES SPA (Single Page Application)
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
          console.error('Erreur lors de l\'envoi du fichier index.html:', err);
          res.status(500).send('Erreur interne du serveur');
        }
      });
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
