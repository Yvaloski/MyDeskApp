const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads');
        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Générer un nom de fichier unique avec la date actuelle
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtre pour n'accepter que certains types de fichiers
const fileFilter = (req, file, cb) => {
    // Autoriser tous les types de fichiers pour l'instant
    // Vous pouvez ajouter une vérification de type de fichier ici si nécessaire
    cb(null, true);
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    }
});

// Route pour le téléversement de fichiers
// Note: This is mounted at /upload in app.js, so we use '/' here
router.post('/', (req, res, next) => {
    // Utilisation de multer dans le middleware
    upload.array('files')(req, res, function(err) {
        // Gestion des erreurs de multer
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false,
                    error: 'La taille du fichier dépasse la limite autorisée (10 Mo)'
                });
            }
            console.error('Erreur Multer:', err);
            return res.status(500).json({ 
                success: false,
                error: 'Erreur lors du téléversement des fichiers'
            });
        }

        // Vérifier si des fichiers ont été téléversés
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Aucun fichier téléversé' 
            });
        }

        try {
            // Préparer la réponse avec les informations sur les fichiers téléversés
            const uploadedFiles = req.files.map(file => ({
                originalname: file.originalname,
                filename: file.filename,
                size: file.size,
                path: `/uploads/${file.filename}`,
                url: `/uploads/${file.filename}`
            }));

            // Répondre avec succès
            return res.status(200).json({
                success: true,
                message: 'Fichiers téléversés avec succès',
                files: uploadedFiles
            });
        } catch (error) {
            console.error('Erreur lors du traitement des fichiers:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Erreur lors du traitement des fichiers' 
            });
        }
    });
});

module.exports = router;
