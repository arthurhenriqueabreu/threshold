export class NotificationSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.defaultDuration = 2500;
    }

    show(message, options = {}) {
        if (!this.container) {
            return;
        }
        const element = document.createElement('div');
        element.className = `notification${options.warning ? ' notification--warning' : ''}`;
        element.textContent = message;
        this.container.appendChild(element);

        requestAnimationFrame(() => element.classList.add('notification--visible'));

        setTimeout(() => {
            element.classList.remove('notification--visible');
            setTimeout(() => element.remove(), 400);
        }, options.duration ?? this.defaultDuration);
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
