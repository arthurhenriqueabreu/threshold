import { CONFIG } from '../core/Config.js';
import { eventBus } from '../core/EventBus.js';

export class ObjectiveManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.objectives = [];
        this.completedCount = 0;

        eventBus.on('objective:completed', (id) => this.markCompleted(id));
    }

    setObjectives(list) {
        this.objectives = list.map((o) => ({ ...o, completed: false }));
        this.completedCount = 0;
        this.gameState.setLevelObjectives(this.objectives.map((o) => o.id));
        eventBus.emit('hud:updateObjectives', this.objectives);
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
