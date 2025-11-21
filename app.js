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
    
    // Middleware pour logger les requêtes
    app.use((req, res, next) => {
      req.requestTime = new Date().toISOString();
      
      // Logger les requêtes DELETE de manière plus détaillée
      if (req.method === 'DELETE' || req.method === 'OPTIONS') {
        console.log(`\n=== [${new Date().toISOString()}] ${req.method} ${req.originalUrl} ===`);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Params:', JSON.stringify(req.params, null, 2));
        console.log('Query:', JSON.stringify(req.query, null, 2));
        if (req.body && Object.keys(req.body).length > 0) {
          console.log('Body:', JSON.stringify(req.body, null, 2));
        }
      }
      
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
          'http://localhost:4200',
          'http://127.0.0.1:4200',
          'http://localhost:5500', 
          'http://127.0.0.1:5500',
          'https://mydeskapp-gdfzegdabhhdhxd5.azurewebsites.net',
          'https://mydeskapp-gdfzegdabhhdhxd5.scm.azurewebsites.net',
          'https://mydeskapp-gdfzegdabhhdhxd5.norwayeast-01.azurewebsites.net',
          'https://mydeskapp-gdfzegdabhhdhxd5.scm.norwayeast-01.azurewebsites.net'
        ];

    console.log('Origines CORS autorisées :', allowedOrigins);

    const corsOptions = {
      origin: function (origin, callback) {
        // Autoriser toutes les origines en développement
        if (process.env.NODE_ENV !== 'production' || !origin) {
          console.log('Mode développement - Origine autorisée:', origin || 'localhost');
          return callback(null, true);
        }

        // Vérifier si l'origine est dans la liste des origines autorisées
        if (allowedOrigins.indexOf(origin) !== -1) {
          console.log('Origine autorisée:', origin);
          return callback(null, true);
        }

        console.error('Origine non autorisée par CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
      ],
      exposedHeaders: [
        'Content-Range', 
        'X-Total-Count',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials'
      ],
      optionsSuccessStatus: 204, // Certains navigateurs (Chrome) ont des problèmes avec 204
      preflightContinue: false,
      optionsSuccessStatus: 200 // Pour les navigateurs plus anciens
    };
    
    // Appliquer CORS
    app.use(cors(corsOptions));
    
    // Gestion des requêtes OPTIONS (prévol CORS)
    app.options('*', cors(corsOptions));
    
    // Middleware pour gérer manuellement les requêtes OPTIONS si nécessaire
    app.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        console.log('Traitement de la requête OPTIONS');
        // Définir les en-têtes CORS
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // 24 heures
        
        // Répondre immédiatement avec 204 No Content pour les requêtes OPTIONS
        return res.status(204).send();
      }
      next();
    });
    
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
