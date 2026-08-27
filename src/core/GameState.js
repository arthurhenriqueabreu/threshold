import { eventBus } from './EventBus.js';

export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.playerName = '';
        this.score = 0;
        this.objectives = {
            fuse: false,
            keycard: false,
            power: false
        };
        this.inventory = {
            fuse: false,
            keycard: false
        };
        this.scoredActions = new Set();
        this.portalUnlocked = false;
        this.gameCompleted = false;
        this.elapsedSeconds = 0;
        this.state = 'MENU';
    }

    setState(state) {
        this.state = state;
        eventBus.emit('game:stateChanged', state);
    }

    setPlayerName(name) {
        this.playerName = name;
    }

    addScore(actionId, points) {
        if (this.scoredActions.has(actionId)) {
            return false;
        }
        this.scoredActions.add(actionId);
        this.score += points;
        eventBus.emit('score:changed', this.score);
        return true;
    }

    collectItem(item) {
        if (this.inventory[item]) {
            return false;
        }
        this.inventory[item] = true;
        eventBus.emit('inventory:changed', item);
        return true;
    }

    hasItem(item) {
        return this.inventory[item];
    }

    completeObjective(id) {
        if (this.objectives[id]) {
            return false;
        }
        this.objectives[id] = true;
        eventBus.emit('objective:completed', id);
        if (this.allObjectivesComplete()) {
            this.unlockPortal();
        }
        return true;
    }

    allObjectivesComplete() {
        return Object.values(this.objectives).every(Boolean);
    }

    unlockPortal() {
        if (this.portalUnlocked) {
            return;
        }
        this.portalUnlocked = true;
        eventBus.emit('portal:unlocked');
    }

    completeGame() {
        if (this.gameCompleted) {
            return false;
        }
        this.gameCompleted = true;
        eventBus.emit('game:completed');
        return true;
    }
}
