export class EndScreen {
    constructor(callbacks) {
        this.root = document.getElementById('end-screen');
        this.introScreen = document.getElementById('level-intro');

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            callbacks.onRestart();
        });
    }

    showLevelIntro(duration = 2500) {
        this.introScreen.classList.remove('hidden');
        return new Promise((resolve) => {
            setTimeout(() => {
                this.introScreen.classList.add('hidden');
                resolve();
            }, duration);
        });
    }

    show({ playerName, score, durationSeconds }) {
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        document.getElementById('end-player').textContent = playerName;
        document.getElementById('end-score').textContent = String(score).padStart(3, '0');
        document.getElementById('end-time').textContent = timeText;

        this.root.classList.remove('hidden');
    }

    hide() {
        this.root.classList.add('hidden');
    }
}
