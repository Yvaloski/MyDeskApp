export class ContextMenu {
    constructor(container) {
        this.container = container || document.body;
        this.element = this.createElement();
        this.setupEventListeners();
        this.hide();
        this.resolvePromise = null;
        this.currentTarget = null;
    }

    createElement() {
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <!-- Actions pour les dossiers -->
            <div class="context-menu-section">
                <div class="context-menu-item" data-action="open">
                    <i class="bi bi-folder2-open"></i> Ouvrir
                </div>
                <div class="context-menu-item" data-action="openInNewWindow">
                    <i class="bi bi-window-plus"></i> Ouvrir dans une nouvelle fenêtre
                </div>
            </div>
            
            <div class="context-menu-divider"></div>
            
            <div class="context-menu-section">
                <div class="context-menu-item" data-action="newFolder">
                    <i class="bi bi-folder-plus"></i> Nouveau dossier
                </div>
                <div class="context-menu-item" data-action="newFile">
                    <i class="bi bi-file-earmark-plus"></i> Nouveau fichier
                </div>
            </div>
            
            <div class="context-menu-actions" id="contextMenuActions">
                <div class="context-menu-item" data-action="cut">
                    <i class="bi bi-scissors"></i> Couper
                </div>
                <div class="context-menu-item" data-action="copy">
                    <i class="bi bi-files"></i> Copier
                </div>
                <div class="context-menu-item" data-action="paste">
                    <i class="bi bi-clipboard"></i> Coller
                </div>
                <div class="context-menu-item" data-action="renameFolder">
                    <i class="bi bi-pencil"></i> Renommer
                </div>
                <div class="context-menu-item text-danger" data-action="deleteFolder">
                    <i class="bi bi-trash"></i> Supprimer
                </div>
            </div>
            
            <div class="context-menu-divider"></div>
            
            <div class="context-menu-section">
                <div class="context-menu-item" data-action="properties">
                    <i class="bi bi-info-circle"></i> Propriétés
                </div>
                <div class="context-menu-item" data-action="refresh">
                    <i class="bi bi-arrow-clockwise"></i> Actualiser
                </div>
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
        this.currentTarget = options.target || null;
        
        // Mettre à jour les options du menu
        const actionsContainer = this.element.querySelector('#contextMenuActions');
        
        // Afficher/masquer les sections en fonction du contexte
        const isOnFolder = options.isFolder || false;
        const isOnFile = options.isFile || false;
        const isOnDesktop = !isOnFolder && !isOnFile;
        
        // Mettre à jour la visibilité des sections
        const sections = this.element.querySelectorAll('.context-menu-section');
        sections.forEach(section => {
            const hasVisibleItems = Array.from(section.querySelectorAll('.context-menu-item'))
                .some(item => !item.style.display || item.style.display !== 'none');
            section.style.display = hasVisibleItems ? 'block' : 'none';
        });
        
        // Afficher/masquer les actions de dossier
        if (actionsContainer) {
            actionsContainer.style.display = (isOnFolder || isOnFile) ? 'block' : 'none';
        }
        
        // Mettre à jour les états des éléments de menu
        const menuItems = {
            'open': isOnFolder || isOnFile,
            'openInNewWindow': isOnFolder || isOnFile,
            'newFolder': isOnDesktop || isOnFolder,
            'newFile': isOnDesktop || isOnFolder,
            'cut': isOnFolder || isOnFile,
            'copy': isOnFolder || isOnFile,
            'paste': options.canPaste || false,
            'renameFolder': isOnFolder || isOnFile,
            'deleteFolder': isOnFolder || isOnFile,
            'properties': isOnFolder || isOnFile || isOnDesktop,
            'refresh': true
        };
        
        // Mettre à jour la visibilité des éléments de menu
        Object.entries(menuItems).forEach(([action, visible]) => {
            const item = this.element.querySelector(`[data-action="${action}"]`);
            if (item) {
                item.style.display = visible ? 'flex' : 'none';
            }
        });
        
        // Afficher le menu
        this.element.style.display = 'block';
        
        // Forcer le navigateur à recalculer le style pour déclencher la transition
        this.element.offsetHeight;
        
        // Ajouter la classe visible pour l'animation
        this.element.classList.add('visible');
        
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
        this.element.classList.remove('visible');
        // Attendre la fin de l'animation avant de cacher complètement
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 100);
    }

    remove() {
        this.element.remove();
    }
}
