export class MainMenu {
    constructor(callbacks) {
        this.root = document.getElementById('main-menu');
        this.levelSelectModal = document.getElementById('level-select-modal');
        this.nameModal = document.getElementById('name-modal');
        this.instructionsModal = document.getElementById('instructions-modal');
        this.nameInput = document.getElementById('player-name-input');
        this.checkpointProgress = document.getElementById('checkpoint-progress-value');
        this.levelCards = Array.from(document.querySelectorAll('.level-card'));
        this.callbacks = callbacks;
        this.selectedLevelIndex = 0;
        this.updateCheckpointProgress();

        document.getElementById('btn-start')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.renderLevelCards();
            this.showModal(this.levelSelectModal);
        });

        document.getElementById('btn-close-level-select')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.hideModal(this.levelSelectModal);
        });

        this.levelCards.forEach((card) => {
            card.addEventListener('click', () => {
                if (card.classList.contains('level-card--locked')) return;
                callbacks.onUiClick();
                this.selectedLevelIndex = parseInt(card.dataset.level, 10) || 0;
                this.hideModal(this.levelSelectModal);
                this.showModal(this.nameModal);
            });
        });

        document.getElementById('btn-instructions')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.showModal(this.instructionsModal);
        });

        document.getElementById('btn-close-instructions')?.addEventListener('click', () => {
            callbacks.onUiClick();
            this.hideModal(this.instructionsModal);
        });

        document.getElementById('btn-enter-game')?.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) {
                this.nameInput.classList.add('input-error');
                setTimeout(() => this.nameInput.classList.remove('input-error'), 800);
                return;
            }
            callbacks.onUiClick();
            callbacks.onStart(name, this.selectedLevelIndex);
        });

        this.nameInput?.addEventListener('keydown', (e) => {
            if (e.code === 'Enter') {
                document.getElementById('btn-enter-game').click();
            }
        });

        // Esc fecha o modal de instruções/seleção de fase (acessibilidade)
        document.addEventListener('keydown', (e) => {
            if (e.code !== 'Escape') return;
            if (!this.instructionsModal.classList.contains('hidden')) {
                this.hideModal(this.instructionsModal);
            } else if (!this.levelSelectModal.classList.contains('hidden')) {
                this.hideModal(this.levelSelectModal);
            }
        });
    }

    getCheckpoint() {
        try {
            const saved = parseInt(localStorage.getItem('threshold_checkpointLevel'), 10);
            if (Number.isFinite(saved)) return Math.max(0, Math.min(2, saved));
        } catch {}
        return 0;
    }

    // Monta os 3 cartões de fase: bloqueado se ainda não alcançado,
    // marcado como "atual" se for exatamente o checkpoint (fase em
    // andamento, ainda não concluída). Fases já concluídas continuam
    // sempre selecionáveis pra jogar de novo.
    renderLevelCards() {
        const checkpoint = this.getCheckpoint();
        const statusLabels = ['Fácil', 'Médio', 'Difícil'];

        this.levelCards.forEach((card) => {
            const level = parseInt(card.dataset.level, 10) || 0;
            const locked = level > checkpoint;
            card.classList.toggle('level-card--locked', locked);
            card.classList.toggle('level-card--current', level === checkpoint);
            card.disabled = locked;

            const statusEl = card.querySelector('.level-card__status');
            if (statusEl) {
                if (locked) statusEl.textContent = '🔒 Bloqueada';
                else if (level === checkpoint) statusEl.textContent = `${statusLabels[level]} · em andamento`;
                else statusEl.textContent = `${statusLabels[level]} · concluída`;
            }
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
        this.hideModal(this.levelSelectModal);
        this.hideModal(this.nameModal);
        this.hideModal(this.instructionsModal);
    }

    show() {
        this.updateCheckpointProgress();
        this.root.classList.remove('hidden');
    }

    updateCheckpointProgress() {
        if (!this.checkpointProgress) return;
        const checkpoint = this.getCheckpoint();
        this.checkpointProgress.textContent = `CHECKPOINT: ${checkpoint} DE 2`;
    }
}
