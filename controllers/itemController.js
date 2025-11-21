const Item = require('../models/itemModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Récupérer tous les éléments
exports.getAllItems = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Récupération de tous les éléments');
  }
  
  const items = await Item.findAll();
  
  // S'assurer que chaque élément a des valeurs x et y valides
  const processedItems = items.map(item => ({
    ...item,
    x: typeof item.x === 'number' ? item.x : 0,
    y: typeof item.y === 'number' ? item.y : 0
  }));
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Retour de ${processedItems.length} éléments avec leurs positions`);
  }
  
  res.status(200).json({
    status: 'success',
    results: processedItems.length,
    data: {
      items: processedItems
    }
  });
});

// Créer un nouveau dossier
exports.createFolder = catchAsync(async (req, res) => {
  const { name, parentId } = req.body;
  const newFolder = await Item.createFolder(name, parentId);
  
  res.status(201).json({
    status: 'success',
    data: {
      folder: newFolder
    }
  });
});

// Créer un nouveau fichier vide (JSON)
exports.createFile = catchAsync(async (req, res) => {
  const { name, parentId, content = '', mimeType = 'text/plain' } = req.body;
  const newFile = await Item.createFile(name, content, parentId, mimeType);
  
  res.status(201).json({
    status: 'success',
    data: {
      file: newFile
    }
  });
});

// Créer un nouveau fichier
exports.uploadFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Aucun fichier téléchargé', 400));
  }

  const { originalname, buffer, mimetype } = req.file;
  const { parentId } = req.body;
  
  const newFile = await Item.createFile(
    originalname,
    buffer,
    parentId,
    mimetype
  );
  
  res.status(201).json({
    status: 'success',
    data: {
      file: newFile
    }
  });
});

// Récupérer un élément par son ID
exports.getItemById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  console.log(`Récupération de l'élément avec l'ID: ${id}`);
  
  const item = await Item.getById(id);
  
  if (!item) {
    return next(new AppError('Aucun élément trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      item
    }
  });
});

// Obtenir le contenu d'un dossier
exports.getDirectory = catchAsync(async (req, res) => {
  // Vérifier si parentId est dans les paramètres de requête ou dans l'URL
  const parentId = req.params.parentId || req.query.parentId || null;
  console.log(`Récupération du contenu du dossier avec parentId: ${parentId}`);
  
  const contents = await Item.listDirectory(parentId);
  
  res.status(200).json({
    status: 'success',
    results: contents.length,
    data: {
      contents
    }
  });
});

// Télécharger un fichier
exports.downloadFile = catchAsync(async (req, res, next) => {
  const { fileId } = req.params;
  const file = await Item.getById(fileId);
  
  if (!file || file.type !== 'file') {
    return next(new AppError('Fichier non trouvé', 404));
  }
  
  const content = Buffer.from(file.content, 'base64');
  
  res.set({
    'Content-Type': file.mimeType,
    'Content-Length': content.length,
    'Content-Disposition': `attachment; filename="${file.name}"`
  });
  
  res.send(content);
});

// Renommer un élément
exports.renameItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { newName } = req.body;
  
  if (!newName) {
    return next(new AppError('Le nouveau nom est requis', 400));
  }
  
  const updatedItem = await Item.renameItem(id, newName);
  
  res.status(200).json({
    status: 'success',
    data: {
      item: updatedItem
    }
  });
});

// Supprimer un élément
exports.deleteItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  try {
    // Vérifier d'abord si l'élément existe
    const item = await Item.getById(id);
    
    if (!item) {
      return next(new AppError('Aucun élément trouvé avec cet ID', 404));
    }
    
    // Supprimer l'élément
    
    try {
      await Item.deleteById(id, item.type);
      
      // Envoyer une réponse 200 avec un corps JSON
      return res.status(200).json({
        status: 'success',
        data: null,
        message: 'Élément supprimé avec succès'
      });
      
    } catch (deleteError) {
      // Si l'erreur est une 404, essayer sans spécifier la clé de partition
      if (deleteError.code === 404) {
        try {
          await Item.deleteById(id);
          return res.status(200).json({
            status: 'success',
            data: null,
            message: 'Élément supprimé avec succès (seconde tentative)'
          });
        } catch (retryError) {
          throw retryError;
        }
      }
      
      throw deleteError;
    }
    
  } catch (error) {
    // Si c'est une erreur 404, renvoyer une réponse 204 car la ressource n'existe plus
    if (error.code === 404) {
      return res.status(204).send();
    }
    
    return next(new AppError(
      `Erreur lors de la suppression de l'élément: ${error.message}`, 
      error.statusCode || 500
    ));
  }
});

// Déplacer un élément vers un autre dossier
exports.moveItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { targetParentId } = req.body;

  if (targetParentId === undefined) {
    return next(new AppError('L\'ID du dossier cible est requis', 400));
  }

  try {
    // Vérifier si l'élément existe
    const item = await Item.getById(id);
    if (!item) {
      return next(new AppError('Élément non trouvé', 404));
    }

    // Vérifier si le dossier cible existe (sauf si c'est la racine)
    if (targetParentId) {
      const target = await Item.getById(targetParentId);
      if (!target || target.type !== 'folder') {
        return next(new AppError('Le dossier cible n\'existe pas ou n\'est pas un dossier valide', 400));
      }

      // Vérifier qu'on ne déplace pas un dossier dans lui-même ou un de ses sous-dossiers
      if (item.type === 'folder' && item.id === targetParentId) {
        return next(new AppError('Impossible de déplacer un dossier dans lui-même', 400));
      }
    }

    // Effectuer le déplacement
    const updatedItem = await Item.moveItem(id, targetParentId || null);

    res.status(200).json({
      status: 'success',
      data: {
        item: updatedItem
      }
    });

  } catch (error) {
    if (error.message.includes('Impossible de déplacer un dossier dans lui-même')) {
      return next(new AppError(error.message, 400));
    }
    next(error);
  }
});

// Mettre à jour la position d'un élément
exports.updateItemPosition = catchAsync(async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('=== DEBUT updateItemPosition ===');
    console.log('Headers de la requête:', JSON.stringify(req.headers, null, 2));
    console.log('Paramètres de la requête:', { 
      params: req.params, 
      body: req.body,
      method: req.method,
      url: req.originalUrl
    });
  }
  
  const { id } = req.params;
  const { x, y } = req.body;
  
  if (x === undefined || y === undefined) {
    console.error('Erreur: Les coordonnées x et y sont requises');
    return next(new AppError('Les coordonnées x et y sont requises', 400));
  }
  
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Récupération de l'élément existant...`);
    }
    
    const existingItem = await Item.findById(id);
    
    if (!existingItem) {
      console.error(`[${new Date().toISOString()}] Erreur: Élément non trouvé avec l'ID ${id}`);
      return next(new AppError('Élément non trouvé', 404));
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Élément existant avant mise à jour:`, JSON.stringify({
        id: existingItem.id,
        name: existingItem.name,
        type: existingItem.type,
        x: existingItem.x,
        y: existingItem.y,
        updatedAt: existingItem.updatedAt
      }, null, 2));
    }
    
    const positionUpdate = { 
      x: parseFloat(x),
      y: parseFloat(y),
      type: existingItem.type, // S'assurer que le type est inclus pour la clé de partition
      updatedAt: new Date().toISOString()
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Mise à jour de position à appliquer:`, JSON.stringify(positionUpdate, null, 2));
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Appel de Item.updateItem...`);
    }
    
    const updatedItem = await Item.updateItem(id, positionUpdate);
    
    if (!updatedItem) {
      console.error(`[${new Date().toISOString()}] Échec de la mise à jour de la position`);
      return next(new AppError('Échec de la mise à jour de la position', 500));
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Position mise à jour avec succès:`, JSON.stringify({
        id: updatedItem.id,
        name: updatedItem.name,
        type: updatedItem.type,
        x: updatedItem.x,
        y: updatedItem.y,
        updatedAt: updatedItem.updatedAt
      }, null, 2));
    }
    
    const response = {
      status: 'success',
      data: {
        item: updatedItem
      }
    };
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] Réponse envoyée:`, JSON.stringify(response, null, 2));
    }
    
    res.status(200).json(response);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${new Date().toISOString()}] === FIN updateItemPosition ===`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erreur lors de la mise à jour de la position:`, error);
    next(error);
  }
});


