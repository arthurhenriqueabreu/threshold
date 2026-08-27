export class ScoreManager {
    constructor(gameState) {
        this.gameState = gameState;
    }

    award(actionId) {
        return this.gameState.addScore(actionId, this.pointsFor(actionId));
    }

    pointsFor(actionId) {
        switch (actionId) {
            case 'fuse': return 100;
            case 'keycard': return 100;
            case 'power': return 200;
            case 'portal': return 100;
            default: return 0;
        }
    }

    getScore() {
        return this.gameState.score;
    }
}
