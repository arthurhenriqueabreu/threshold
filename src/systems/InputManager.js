const KEY_ACTIONS = {
    KeyW: 'forward',
    ArrowUp: 'forward',
    KeyS: 'backward',
    ArrowDown: 'backward',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    ShiftLeft: 'run',
    ShiftRight: 'run'
};

export class InputManager {
    constructor() {
        this.actions = new Set();
        this.interactCallbacks = [];
        this.keyCallbacks = new Map();
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(event) {
        if (event.repeat) {
            return;
        }
        if (event.code === 'KeyE') {
            for (const callback of this.interactCallbacks) {
                callback();
            }
            return;
        }
        const handlers = this.keyCallbacks.get(event.code);
        if (handlers) {
            for (const callback of handlers) {
                callback();
            }
            return;
        }
        const action = KEY_ACTIONS[event.code];
        if (action) {
            this.actions.add(action);
        }
    }

    onKeyUp(event) {
        const action = KEY_ACTIONS[event.code];
        if (action) {
            this.actions.delete(action);
        }
    }

    onInteract(callback) {
        this.interactCallbacks.push(callback);
    }

    onKeyPress(code, callback) {
        if (!this.keyCallbacks.has(code)) {
            this.keyCallbacks.set(code, new Set());
        }
        this.keyCallbacks.get(code).add(callback);
    }

    isActionActive(action) {
        return this.actions.has(action);
    }

    clearActions() {
        this.actions.clear();
    }
}
