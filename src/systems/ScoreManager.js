import { CONFIG } from '../core/Config.js';

export class ScoreManager {
    constructor(gameState) {
        this.gameState = gameState;
    }

    award(actionId) {
        return this.gameState.addScore(actionId, this.pointsFor(actionId));
    }

    pointsFor(actionId) {
        return CONFIG.scoring[actionId] ?? 0;
    }

    getScore() {
        return this.gameState.score;
    }
}
