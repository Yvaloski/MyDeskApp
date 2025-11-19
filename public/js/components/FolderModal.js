export class FolderModal {
    constructor() {
        this.element = this.createElement();
        this.setupEventListeners();
        this.hide();
    }

    createElement() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'folderNameModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-title">Nouveau dossier</div>
                <input type="text" id="folderNameInput" placeholder="Nom du dossier">
                <div class="modal-actions">
                    <button id="cancelFolderBtn">Annuler</button>
                    <button id="createFolderBtn">Créer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    setupEventListeners() {
        this.folderNameInput = this.element.querySelector('#folderNameInput');
        this.createBtn = this.element.querySelector('#createFolderBtn');
        this.cancelBtn = this.element.querySelector('#cancelFolderBtn');
        
        // Fermer la modale en cliquant à l'extérieur
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.hide();
            }
        });
        
        // Valider avec la touche Entrée
        this.folderNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createBtn.click();
            }
        });
    }

    show() {
        this.folderNameInput.value = '';
        this.element.style.display = 'flex';
        this.folderNameInput.focus();
        
        return new Promise((resolve, reject) => {
            const onCreate = () => {
                const name = this.folderNameInput.value.trim();
                if (name) {
                    this.hide();
                    resolve(name);
                }
            };
            
            const onCancel = () => {
                this.hide();
                reject(new Error('User cancelled'));
            };
            
            this.createBtn.onclick = () => {
                onCreate();
                this.cleanupListeners();
            };
            
            this.cancelBtn.onclick = () => {
                onCancel();
                this.cleanupListeners();
            };
            
            // Nettoyer les écouteurs après utilisation
            this.cleanupListeners = () => {
                this.createBtn.onclick = null;
                this.cancelBtn.onclick = null;
            };
        });
    }

    hide() {
        this.element.style.display = 'none';
    }

    remove() {
        this.element.remove();
    }
}
