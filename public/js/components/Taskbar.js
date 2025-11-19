export class Taskbar {
    constructor() {
        this.element = this.createElement();
    }

    createElement() {
        const taskbar = document.createElement('div');
        taskbar.className = 'taskbar';
        taskbar.innerHTML = `
            <div class="taskbar-start">
                <div class="start-button">
                    <i class="bi bi-windows"></i>
                </div>
            </div>
            <div class="taskbar-time">
                ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
            </div>
        `;
        
        // Mettre à jour l'heure toutes les minutes
        setInterval(() => {
            const timeElement = taskbar.querySelector('.taskbar-time');
            if (timeElement) {
                timeElement.textContent = new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
            }
        }, 60000);
        
        return taskbar;
    }

    appendTo(container) {
        container.appendChild(this.element);
    }

    remove() {
        this.element.remove();
    }
}
