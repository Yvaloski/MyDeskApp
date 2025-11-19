var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var uploadRouter = require('./routes/upload');

var app = express();

// Enable CORS for all routes
app.use(cors());

// Désactiver le moteur de vue EJS car nous utilisons du HTML statique
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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

// Gestion des routes SPA (Single Page Application) - This should be the last route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
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
    <html>
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
