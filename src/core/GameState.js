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
            keycard: false,
            radar: false,
            phone: false,
            flashlight: false
        };
        this.scoredActions = new Set();
        this.portalUnlocked = false;
        this.gameCompleted = false;
        this.elapsedSeconds = 0;
        this.state = 'MENU';
        this.currentLevelIndex = 0;
        this.levelObjectiveIds = [];
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
        if (this.levelObjectiveIds.includes(id)) {
            if (this.allObjectivesComplete()) {
                this.unlockPortal();
            }
        }
        return true;
    }

    setLevelObjectives(ids) {
        this.levelObjectiveIds = ids.slice();
    }

    allObjectivesComplete() {
        if (this.levelObjectiveIds.length === 0) {
            return Object.values(this.objectives).every(Boolean);
        }
        return this.levelObjectiveIds.every((id) => this.objectives[id]);
    }

    advanceLevel() {
        this.currentLevelIndex++;
        this.portalUnlocked = false;
        eventBus.emit('portal:locked');
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
