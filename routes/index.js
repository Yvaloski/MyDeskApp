const express = require('express');
const itemRoutes = require('./itemRoutes');

const router = express.Router();

// Routes API pour les items
router.use('/v1/items', itemRoutes);

// Route de test
router.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is working!'
  });
});

// Gestion des routes API non trouvées
router.all('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Endpoint non trouvé: ${req.originalUrl}`
  });
});

module.exports = router;
