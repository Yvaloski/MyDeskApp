const express = require('express');
const multer = require('multer');
const itemController = require('../controllers/itemController');

const router = express.Router();

// Récupérer tous les éléments
router.get('/', itemController.getAllItems);

// Récupérer un élément par son ID
router.get('/:id', itemController.getItemById);

// Configuration de Multer pour le téléchargement de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10 Mo par fichier
  },
  fileFilter: (req, file, cb) => {
    // Vous pouvez ajouter des validations de type de fichier ici si nécessaire
    cb(null, true);
  },
});

// Routes pour les dossiers
router.post('/folders', itemController.createFolder);

// Routes pour les fichiers
// Créer un fichier vide (JSON)
router.post('/files/create', itemController.createFile);

// Upload un fichier (multipart)
router.post(
  '/files',
  upload.single('file'), // 'file' est le nom du champ dans le formulaire
  itemController.uploadFile
);

// Obtenir le contenu d'un dossier (avec ou sans parentId)
router.get(['/directory', '/directory/:parentId'], itemController.getDirectory);

// Télécharger un fichier
router.get('/files/:fileId/download', itemController.downloadFile);

// Mettre à jour la position d'un élément
router.patch('/:id/position', itemController.updateItemPosition);

// Renommer un élément (fichier ou dossier)
router.patch('/:id/rename', itemController.renameItem);

// Supprimer un élément (fichier ou dossier)
router.delete('/:id', itemController.deleteItem);

module.exports = router;
