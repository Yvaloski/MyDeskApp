const Item = require('../models/itemModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Récupérer tous les éléments
exports.getAllItems = catchAsync(async (req, res, next) => {
  const items = await Item.findAll();
  
  res.status(200).json({
    status: 'success',
    results: items.length,
    data: items // Retourne directement le tableau d'items
  });
});

// Créer un nouveau dossier
exports.createFolder = catchAsync(async (req, res, next) => {
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
exports.createFile = catchAsync(async (req, res, next) => {
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
exports.getDirectory = catchAsync(async (req, res, next) => {
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

// Mettre à jour la position d'un élément
exports.updateItemPosition = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { x, y } = req.body;
  
  if (x === undefined || y === undefined) {
    return next(new AppError('Les coordonnées x et y sont requises', 400));
  }
  
  try {
    // Récupérer l'élément existant pour déterminer son type
    const item = await Item.findById(id);
    if (!item) {
      return next(new AppError('Élément non trouvé', 404));
    }
    
    // Mettre à jour uniquement les champs nécessaires
    const updates = {
      x: parseInt(x, 10),
      y: parseInt(y, 10),
      updatedAt: new Date().toISOString(),
      // Inclure le type pour s'assurer que la clé de partition est correcte
      type: item.type || (id.startsWith('folder-') ? 'folder' : 'file')
    };
    
    // Mettre à jour l'élément dans la base de données
    const updatedItem = await Item.update(id, updates);
    
    if (!updatedItem) {
      return next(new AppError('Échec de la mise à jour de la position', 500));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        item: updatedItem
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la position:', error);
    return next(new AppError('Erreur lors de la mise à jour de la position', 500));
  }
});

// Supprimer un élément
exports.deleteItem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const result = await Item.deleteItem(id);
  
  if (!result.success) {
    return next(new AppError(result.error || 'Élément non trouvé', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      item: result.item
    }
  });
});

// Récupérer tous les items
exports.getAllItems = catchAsync(async (req, res, next) => {
  const items = await Item.findAll();
  
  res.status(200).json({
    status: 'success',
    results: items.length,
    data: {
      items
    }
  });
});

// Récupérer un item par son ID
exports.getItem = catchAsync(async (req, res, next) => {
  const item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new AppError('Aucun item trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      item
    }
  });
});

// Mettre à jour un item
exports.updateItem = catchAsync(async (req, res, next) => {
  const item = await Item.update(req.params.id, req.body);
  
  if (!item) {
    return next(new AppError('Aucun item trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      item
    }
  });
});

// Supprimer un item
exports.deleteItem = catchAsync(async (req, res, next) => {
  const result = await Item.delete(req.params.id);
  
  if (!result.success) {
    return next(new AppError('Aucun item trouvé avec cet ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});
