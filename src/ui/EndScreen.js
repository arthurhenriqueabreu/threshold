export class EndScreen {
    constructor(callbacks) {
        this.root = document.getElementById('end-screen');
        this.introScreen = document.getElementById('level-intro');

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            callbacks.onRestart();
        });
    }

    showLevelIntro(durationOrOptions, fallbackDuration = 2500) {
        let duration = fallbackDuration;
        let title = 'LEVEL 1';
        let subtitle = 'COMING SOON';
        if (typeof durationOrOptions === 'number') {
            duration = durationOrOptions;
        } else if (durationOrOptions && typeof durationOrOptions === 'object') {
            if (durationOrOptions.title) title = durationOrOptions.title;
            if (durationOrOptions.subtitle) subtitle = durationOrOptions.subtitle;
            if (durationOrOptions.duration) duration = durationOrOptions.duration;
        }
        const titleEl = this.introScreen.querySelector('.level-intro-title') || this.introScreen.firstElementChild;
        const subEl = this.introScreen.querySelector('.level-intro-sub');
        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
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
