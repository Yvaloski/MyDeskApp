export class ContextMenu {
    constructor(container) {
        this.container = container || document.body;
        this.element = this.createElement();
        this.setupEventListeners();
        this.hide();
        this.resolvePromise = null;
    }

    createElement() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="newFolder">
                <i class="bi bi-folder-plus"></i> Nouveau dossier
            </div>
            <div class="context-menu-actions" id="contextMenuActions">
                <div class="context-menu-item" data-action="renameFolder">
                    <i class="bi bi-pencil"></i> Renommer
                </div>
                <div class="context-menu-item" data-action="deleteFolder">
                    <i class="bi bi-trash"></i> Supprimer
                </div>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="refresh">
                <i class="bi bi-arrow-clockwise"></i> Actualiser
            </div>
        `;
        
        this.container.appendChild(menu);
        return menu;
    }

    setupEventListeners() {
        // Fermer le menu quand on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.hide();
            }
        });

        // Empêcher la fermeture immédiate du menu
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    show(x, y, options = {}) {
        // Mettre à jour les options du menu
        const actionsContainer = this.element.querySelector('#contextMenuActions');
        const renameItem = this.element.querySelector('[data-action="renameFolder"]');
        const deleteItem = this.element.querySelector('[data-action="deleteFolder"]');
        
        // Afficher/masquer les actions de dossier
        const showActions = options.canDelete || options.canRename;
        if (actionsContainer) actionsContainer.style.display = showActions ? 'block' : 'none';
        
        // Afficher/masquer les actions spécifiques
        if (renameItem) renameItem.style.display = options.canRename ? 'flex' : 'none';
        if (deleteItem) deleteItem.style.display = options.canDelete ? 'flex' : 'none';
        
        // Afficher le menu
        this.element.style.display = 'block';
        
        // Ajuster la position pour rester dans la fenêtre
        const rect = this.element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (x + rect.width > viewportWidth) {
            x = viewportWidth - rect.width - 5;
        }
        
        if (y + rect.height > viewportHeight) {
            y = viewportHeight - rect.height - 5;
        }
        
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        
        // Retourner une promesse qui sera résolue avec l'action sélectionnée
        return new Promise((resolve) => {
            const handleAction = (e) => {
                const menuItem = e.target.closest('.context-menu-item');
                if (menuItem) {
                    const action = menuItem.dataset.action;
                    this.hide();
                    resolve(action);
                }
            };
            
            this.element.addEventListener('click', handleAction);
            
            // Nettoyer l'écouteur d'événements après utilisation
            const cleanup = () => {
                this.element.removeEventListener('click', handleAction);
                document.removeEventListener('click', handleOutsideClick);
            };
            
            const handleOutsideClick = (e) => {
                if (!this.element.contains(e.target)) {
                    cleanup();
                    resolve(null);
                }
            };
            
            // Ajouter un délai pour éviter la fermeture immédiate
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick);
            }, 0);
        });
    }

    hide() {
        this.element.style.display = 'none';
    }

    remove() {
        this.element.remove();
    }
}
