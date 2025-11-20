const createError = require('http-errors');
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

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var uploadRouter = require('./routes/upload');

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(logger('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans une heure!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
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

// Enable CORS with specific options
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://votredomaine.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Désactiver l'en-tête X-Powered-By
app.disable('x-powered-by');

// Désactiver le moteur de vue EJS car nous utilisons du HTML statique
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// Sécurisation des cookies
app.use(cookieParser(process.env.COOKIE_SECRET || 'votre-secret-securise'));

// Protéger contre les attaques de type Clickjacking
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', 'frame-ancestors \'none\'');
  next();
});

// Configuration des chemins statiques
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Route pour la page d'accueil - doit être après la configuration des fichiers statiques
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes API
app.use('/api', indexRouter);
app.use('/api/users', usersRouter);

// Upload route - must be before the catch-all route
app.use('/upload', uploadRouter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Gestion des routes SPA (Single Page Application) - This should be the last route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  const isDev = req.app.get('env') === 'development';
  const status = err.status || 500;
  
  // Envoyer une réponse JSON pour les erreurs d'API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({
      error: {
        status: status,
        message: err.message,
        ...(isDev && { stack: err.stack })
      }
    });
  }
  
  // Pour les autres routes, envoyer une page d'erreur HTML simple
  res.status(status);
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <title>Erreur ${status}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #d32f2f; }
          pre { text-align: left; background: #f5f5f5; padding: 15px; border-radius: 5px; max-width: 800px; margin: 20px auto; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Erreur ${status}</h1>
        <p>${err.message}</p>
        ${isDev ? `<pre>${err.stack}</pre>` : ''}
      </body>
    </html>
  `);
});

module.exports = app;
