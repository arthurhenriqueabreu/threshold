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
        this.xrActionCallbacks = new Map();
        this.xrSources = { left: null, right: null };
        this.xrButtonStates = new Map();
        this.xrMove = { x: 0, z: 0 };
        this.xrSprinting = false;
        this.xrTurnCooldown = 0;
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
        const action = KEY_ACTIONS[event.code];
        const handlers = this.keyCallbacks.get(event.code);
        let consumed = false;
        if (handlers) {
            for (const callback of handlers) {
                if (callback() === true) consumed = true;
            }
        }
        // A callback may consume a key (the phone consumes arrow keys while
        // open). Otherwise regular movement keys still become active.
        if (action && !consumed) {
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

    onXRAction(action, callback) {
        if (!this.xrActionCallbacks.has(action)) {
            this.xrActionCallbacks.set(action, new Set());
        }
        this.xrActionCallbacks.get(action).add(callback);
    }

    emitXRAction(action, payload) {
        const callbacks = this.xrActionCallbacks.get(action);
        if (!callbacks) return;
        for (const callback of callbacks) callback(payload);
    }

    registerXRController(controller) {
        controller.addEventListener('connected', (event) => {
            const handedness = event.data?.handedness;
            if (handedness === 'left' || handedness === 'right') {
                this.xrSources[handedness] = { controller, inputSource: event.data };
            }
        });
        controller.addEventListener('disconnected', (event) => {
            const handedness = event.data?.handedness;
            if (handedness === 'left' || handedness === 'right') {
                this.xrSources[handedness] = null;
                for (const key of this.xrButtonStates.keys()) {
                    if (key.startsWith(`${handedness}:`)) this.xrButtonStates.delete(key);
                }
            }
        });
        controller.addEventListener('selectstart', () => this.triggerInteract());
    }

    triggerInteract() {
        for (const callback of this.interactCallbacks) callback();
    }

    readXRStick(source) {
        const axes = source?.inputSource?.gamepad?.axes;
        if (!axes || axes.length < 2) return { x: 0, y: 0 };
        // Quest profiles normally expose the primary thumbstick at axes 2/3.
        const offset = axes.length >= 4 ? 2 : 0;
        const x = axes[offset] ?? 0;
        const y = axes[offset + 1] ?? 0;
        const deadzone = 0.16;
        const applyDeadzone = (value) => Math.abs(value) < deadzone ? 0 : value;
        return { x: applyDeadzone(x), y: applyDeadzone(y) };
    }

    pollXRButton(handedness, index, action) {
        const source = this.xrSources[handedness];
        const button = source?.inputSource?.gamepad?.buttons?.[index];
        const key = `${handedness}:${index}`;
        const pressed = !!button?.pressed;
        const wasPressed = this.xrButtonStates.get(key) === true;
        if (pressed && !wasPressed) this.emitXRAction(action);
        this.xrButtonStates.set(key, pressed);
        return pressed;
    }

    updateXR(delta) {
        this.xrMove.x = 0;
        this.xrMove.z = 0;
        this.xrSprinting = false;
        this.xrTurnCooldown = Math.max(0, this.xrTurnCooldown - delta);

        const leftStick = this.readXRStick(this.xrSources.left);
        this.xrMove.x = leftStick.x;
        this.xrMove.z = leftStick.y;
        const leftSqueeze = this.pollXRButton('left', 1, 'sprint');
        const rightSqueeze = this.pollXRButton('right', 1, 'sprint');
        this.xrSprinting = leftSqueeze || rightSqueeze;
        this.pollXRButton('left', 4, 'flashlight'); // X on Quest
        this.pollXRButton('right', 4, 'phone');     // A on Quest

        const rightStick = this.readXRStick(this.xrSources.right);
        if (this.xrTurnCooldown <= 0 && Math.abs(rightStick.x) > 0.7) {
            this.emitXRAction('turn', rightStick.x > 0 ? -1 : 1);
            this.xrTurnCooldown = 0.28;
        }
    }

    getXRMoveInput() {
        return this.xrMove;
    }

    isXRSprinting() {
        return this.xrSprinting;
    }

    isActionActive(action) {
        return this.actions.has(action);
    }

    clearActions() {
        this.actions.clear();
        this.xrMove.x = 0;
        this.xrMove.z = 0;
        this.xrSprinting = false;
    }
}
