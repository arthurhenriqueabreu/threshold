export class MainMenu {
    constructor(callbacks) {
        this.root = document.getElementById('main-menu');
        this.nameModal = document.getElementById('name-modal');
        this.difficultyModal = document.getElementById('difficulty-modal');
        this.instructionsModal = document.getElementById('instructions-modal');
        this.nameInput = document.getElementById('player-name-input');
        this.callbacks = callbacks;
        this.selectedDifficulty = 'normal';

        document.getElementById('btn-start')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.showModal(this.difficultyModal);
        });

        document.getElementById('btn-instructions')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.showModal(this.instructionsModal);
        });

        document.getElementById('btn-close-instructions')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.hideModal(this.instructionsModal);
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                callbacks.onUiClick();
                this.selectDifficulty(btn.dataset.diff);
                this.showModal(this.nameModal);
                this.hideModal(this.difficultyModal);
            });
        });

        document.getElementById('btn-enter-game')?.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) {
                this.nameInput.classList.add('input-error');
                setTimeout(() => this.nameInput.classList.remove('input-error'), 800);
                return;
            }
            callbacks.onUiClick();
            callbacks.onStart(name, this.selectedDifficulty);
        });

        this.nameInput?.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                document.getElementById('btn-enter-game').click();
            }
        });
    }

    selectDifficulty(diff) {
        this.selectedDifficulty = diff;
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.diff === diff);
        });
    }

    showModal(modal) {
        modal.classList.remove('hidden');
    }

    hideModal(modal) {
        modal.classList.add('hidden');
    }

    hide() {
        this.root.classList.add('hidden');
        this.hideModal(this.nameModal);
        this.hideModal(this.difficultyModal);
        this.hideModal(this.instructionsModal);
    }

    show() {
        this.root.classList.remove('hidden');
    }
}