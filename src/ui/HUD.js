import { eventBus } from '../core/EventBus.js';
import { Minimap } from './Minimap.js';

export class HUD {
    constructor() {
        this.root = document.getElementById('hud');
        this.scoreElement = document.getElementById('hud-score');
        this.promptElement = document.getElementById('hud-prompt');

        this.objectiveList = document.getElementById('objectives-list');
        this.legendElement = document.getElementById('hud-legend');
        this.legendList = document.getElementById('legend-list');
        this.minimapElement = document.getElementById('hud-minimap');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimap = this.minimapCanvas ? new Minimap(this.minimapCanvas) : null;
        this.difficulty = null;
        this.lastObjectives = [
            { id: 'fuse', title: 'Encontrar fusível', completed: false },
            { id: 'keycard', title: 'Encontrar cartão', completed: false },
            { id: 'power', title: 'Restaurar energia', completed: false }
        ];
        this.legendSteps = [
            { id: 'fuse', text: 'Encontre o FUSÍVEL — brilho amarelo flutuante' },
            { id: 'keycard', text: 'Encontre o CARTÃO — brilho azul flutuante' },
            { id: 'power', text: 'Leve o fusível ao PAINEL ELÉTRICO (parede norte) — [E] para inserir e restaurar' },
            { id: 'door', text: 'Use o CARTÃO na PORTA trancada ao sul — [E] 2x para abrir' },
            { id: 'portal', text: 'Atravesse o PORTAL na sala final' }
        ];

        this._portalUnlocked = false;
        this._doorOpened = false;
        eventBus.on('hud:updateObjectives', (objectives) => {
            this.lastObjectives = objectives;
            this.renderObjectives(objectives);
            this.renderLegend();
        });
        eventBus.on('score:changed', (score) => this.setScore(score));
        eventBus.on('portal:unlocked', () => {
            this._portalUnlocked = true;
            this.renderLegend();
            if (this.minimap) this.minimap.update(this._lastPlayerPos, this._lastYaw);
        });
        eventBus.on('door:opened', () => {
            this._doorOpened = true;
            this.renderLegend();
            if (this.minimap) this.minimap.update(this._lastPlayerPos, this._lastYaw);
        });
        eventBus.on('inventory:changed', () => {
            this.renderLegend();
            // minimapa reage a coleta de itens (remove marcadores)
            if (this.minimap) this.minimap.update(this._lastPlayerPos, this._lastYaw);
        });

        this.renderObjectives(this.lastObjectives);
        this.renderLegend();
    }

    renderObjectives(objectives) {
        if (!this.objectiveList) {
            return;
        }
        this.objectiveList.innerHTML = '';
        for (const objective of objectives) {
            const item = document.createElement('li');
            item.className = `objective${objective.completed ? ' objective--done' : ''}`;
            item.textContent = `${objective.completed ? '[x]' : '[ ]'} ${objective.title}`;
            this.objectiveList.appendChild(item);
        }
    }

    setScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = String(score).padStart(3, '0');
        }
    }

    setPrompt(prompt) {
        if (!this.promptElement) {
            return;
        }
        if (prompt) {
            this.promptElement.textContent = prompt;
            this.promptElement.classList.add('visible');
        } else {
            this.promptElement.classList.remove('visible');
        }
    }

    show() {
        this.root.classList.remove('hidden');
        this.updateEasyVisibility();
    }

    hide() {
        this.root.classList.add('hidden');
    }

    reset() {
        this.setScore(0);
        this._portalUnlocked = false;
        this._doorOpened = false;
        this._lastPlayerPos = null;
        this._lastYaw = 0;
        this.lastObjectives = [
            { id: 'fuse', title: 'Encontrar fusível', completed: false },
            { id: 'keycard', title: 'Encontrar cartão', completed: false },
            { id: 'power', title: 'Restaurar energia', completed: false }
        ];
        this.renderObjectives(this.lastObjectives);
        this.renderLegend();
        if (this.minimap) this.minimap.reset();
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.updateEasyVisibility();
        this.renderLegend();
    }

    updateLegendVisibility() {
        // compat: alias para updateEasyVisibility
        this.updateEasyVisibility();
    }

    updateEasyVisibility() {
        const isEasy = this.difficulty === 'easy';
        const isPlaying = !this.root.classList.contains('hidden');
        const show = isEasy && isPlaying;
        if (this.legendElement) {
            if (show) this.legendElement.classList.remove('hidden');
            else this.legendElement.classList.add('hidden');
        }
        if (this.minimap) {
            this.minimap.setVisible(show);
        }
        if (this.minimapElement) {
            if (show) this.minimapElement.classList.remove('hidden');
            else this.minimapElement.classList.add('hidden');
        }
    }

    setLevel(level, gameState) {
        if (this.minimap) {
            this.minimap.setLevel(level, gameState);
        }
    }

    updateMinimap(playerPos, yaw) {
        this._lastPlayerPos = playerPos;
        this._lastYaw = yaw;
        if (this.minimap && this.difficulty === 'easy') {
            this.minimap.update(playerPos, yaw);
        }
    }

    getLegendState() {
        const done = new Set(this.lastObjectives.filter((o) => o.completed).map((o) => o.id));
        return {
            fuseDone: done.has('fuse'),
            keycardDone: done.has('keycard'),
            powerDone: done.has('power'),
            doorDone: this._doorOpened === true,
            portalDone: false
        };
    }

    renderLegend() {
        if (!this.legendList) return;
        if (this.difficulty !== 'easy') {
            this.legendList.innerHTML = '';
            return;
        }

        // atualiza flag de portal se evento já ocorreu (mantida em this._portalUnlocked)
        const state = this.getLegendState();

        // determina índice ativo: primeiro não concluído
        let activeIndex = -1;
        const dones = [
            state.fuseDone,
            state.keycardDone,
            state.powerDone,
            state.doorDone,
            state.portalDone
        ];
        for (let i = 0; i < dones.length; i++) {
            if (!dones[i]) {
                activeIndex = i;
                break;
            }
        }

        this.legendList.innerHTML = '';
        this.legendSteps.forEach((step, index) => {
            const li = document.createElement('li');
            li.className = 'legend-step';
            const isDone = dones[index];
            const isActive = index === activeIndex;
            if (isDone) li.classList.add('legend-step--done');
            if (isActive) li.classList.add('legend-step--active');
            li.textContent = step.text;
            this.legendList.appendChild(li);
        });
    }
}
