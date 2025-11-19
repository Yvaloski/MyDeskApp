export class Folder {
    constructor(data, onClick) {
        this.data = data;
        this.element = this.createElement();
        this.onClick = onClick;
        this.setupEventListeners();
    }
    
    createElement() {
        const folder = document.createElement('div');
        folder.className = 'folder';
        folder.style.left = `${this.data.x}px`;
        folder.style.top = `${this.data.y}px`;
        folder.draggable = true;
        
        folder.innerHTML = `
            <div class="folder-icon">
                <img src="/images/folder_icon.png" alt="Dossier" width="64" height="64">
            </div>
            <div class="folder-name">${this.data.name}</div>
        `;
        
        return folder;
    }
    
    setupEventListeners() {
        // Double-clic pour ouvrir le dossier
        this.element.addEventListener('dblclick', () => {
            if (this.onClick) this.onClick(this.data);
        });
        
        // Glisser-déposer
        this.element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', this.data.id);
            e.dataTransfer.effectAllowed = 'move';
        });
    }
    
    // Mettre à jour la position du dossier
    updatePosition(x, y) {
        this.data.x = x;
        this.data.y = y;
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }
    
    // Mettre à jour le nom du dossier
    updateName(name) {
        this.data.name = name;
        this.element.querySelector('.folder-name').textContent = name;
    }
}
