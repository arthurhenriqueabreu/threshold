export class UIManager {
    constructor(callbacks) {
        this.fade = document.getElementById('fade');
        this.pauseMenu = document.getElementById('pause-menu');

        document.getElementById('btn-resume')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.hidePause();
            callbacks.onResume();
        });

        document.getElementById('btn-restart-pause')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.hidePause();
            callbacks.onRestart();
        });

        document.getElementById('btn-back-to-menu')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.hidePause();
            callbacks.onBackToMenu();
        });
    }

    fadeIn(duration = 800) {
        this.fade.classList.add('visible');
        return new Promise((resolve) => setTimeout(resolve, duration));
    }

    fadeOut(duration = 800) {
        this.fade.classList.remove('visible');
        return new Promise((resolve) => setTimeout(resolve, duration));
    }

    showPause() {
        this.pauseMenu.classList.remove('hidden');
    }

    hidePause() {
        this.pauseMenu.classList.add('hidden');
    }

    isPauseVisible() {
        return !this.pauseMenu.classList.contains('hidden');
    }
}
