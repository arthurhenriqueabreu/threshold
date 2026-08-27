import { CONFIG } from '../core/Config.js';
import { eventBus } from '../core/EventBus.js';

export class ObjectiveManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.objectives = [
            { id: 'fuse', title: 'Encontrar fusível', completed: false },
            { id: 'keycard', title: 'Encontrar cartão', completed: false },
            { id: 'power', title: 'Restaurar energia', completed: false }
        ];
        this.completedCount = 0;

        eventBus.on('objective:completed', (id) => this.markCompleted(id));
    }

    markCompleted(id) {
        const objective = this.objectives.find((o) => o.id === id);
        if (!objective || objective.completed) {
            return;
        }
        objective.completed = true;
        this.completedCount++;
        eventBus.emit('hud:updateObjectives', this.objectives);
    }

    reset() {
        for (const objective of this.objectives) {
            objective.completed = false;
        }
        this.completedCount = 0;
        eventBus.emit('hud:updateObjectives', this.objectives);
    }

    complete(id) {
        if (!this.gameState.completeObjective(id)) {
            return false;
        }
        const points = CONFIG.scoring[id] ?? 0;
        if (points > 0) {
            this.gameState.addScore(id, points);
        }
        return true;
    }
}
