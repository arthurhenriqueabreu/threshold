import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

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

function xrCfg() {
    return CONFIG.xr ?? {};
}

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
        this.xrTurnArmed = true;
        this.xrMenuNavArmed = true;
        this.turnMode = CONFIG.xr?.turnMode === 'snap' ? 'snap' : 'smooth';
        this.xrConnectedInfo = { left: null, right: null };
        this._gripSmooth = 0;
        this._debugThrottle = 0;
        // Blink step (locomoção alternativa opcional): edge + cooldown.
        // Só dispara em blink mode; nunca vários por frame segurando o grip.
        this.locomotionMode = 'continuous';
        this._blinkPending = false;
        this._blinkCooldown = 0;
        this._prevGripLeft = false;
        this._prevGripRight = false;
        // Arm-swing locomotion (mãos como pernas) — DESABILITADO por padrão.
        // Mantido apenas como opção futura via CONFIG.xr.armSwing.
        this._armSwing = {
            enabled: false,
            prevLeft: new THREE.Vector3(),
            prevRight: new THREE.Vector3(),
            tmpLeft: new THREE.Vector3(),
            tmpRight: new THREE.Vector3(),
            leftVel: new THREE.Vector3(),
            rightVel: new THREE.Vector3(),
            hasPrev: false,
            avgSpeed: 0,
            walkIntensity: 0
        };
        this._armSwingThresholdWalk = 0.45;
        this._armSwingThresholdRun = 1.65;
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
            const profiles = event.data?.profiles ?? [];
            const axes = event.data?.gamepad?.axes?.length ?? 0;
            const buttons = event.data?.gamepad?.buttons?.length ?? 0;
            // Log UMA VEZ por conexão — nunca por frame.
            console.log(`[XR] ${handedness} connected profiles: ${JSON.stringify(profiles)} axes: ${axes} buttons: ${buttons}`);
            if (handedness === 'left' || handedness === 'right') {
                this.xrSources[handedness] = { controller, inputSource: event.data };
                this.xrConnectedInfo[handedness] = { profiles, axes, buttons };
            }
        });
        controller.addEventListener('disconnected', (event) => {
            const handedness = event.data?.handedness;
            if (handedness === 'left' || handedness === 'right') {
                this.xrSources[handedness] = null;
                this.xrConnectedInfo[handedness] = null;
                for (const key of this.xrButtonStates.keys()) {
                    if (key.startsWith(`${handedness}:`)) this.xrButtonStates.delete(key);
                }
            }
        });
        controller.addEventListener('selectstart', () => this.triggerInteract(controller));
    }

    triggerInteract(controller = null) {
        for (const callback of this.interactCallbacks) callback(controller);
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

    isXRButtonHeld(handedness, index) {
        const source = this.xrSources[handedness];
        const button = source?.inputSource?.gamepad?.buttons?.[index];
        return !!button?.pressed;
    }

    isLeftGripHeld() {
        const idx = xrCfg().buttons?.squeeze ?? 1;
        return this.isXRButtonHeld('left', idx);
    }

    isRightGripHeld() {
        const idx = xrCfg().buttons?.squeeze ?? 1;
        return this.isXRButtonHeld('right', idx);
    }

    getXRDebugState() {
        const btn = xrCfg().buttons ?? {};
        return {
            left: this.xrSources.left ? {
                grip: this.isLeftGripHeld(),
                trigger: this.isXRButtonHeld('left', btn.trigger ?? 0),
                stick: this.readXRStick(this.xrSources.left),
                buttons: this.xrSources.left.inputSource?.gamepad?.buttons?.map(b => !!b?.pressed) ?? []
            } : null,
            right: this.xrSources.right ? {
                grip: this.isRightGripHeld(),
                trigger: this.isXRButtonHeld('right', btn.trigger ?? 0),
                stick: this.readXRStick(this.xrSources.right),
                buttons: this.xrSources.right.inputSource?.gamepad?.buttons?.map(b => !!b?.pressed) ?? []
            } : null,
            move: { ...this.xrMove },
            sprinting: this.xrSprinting
        };
    }

    updateXR(delta) {
        const cfg = xrCfg();
        this.xrMove.x = 0;
        this.xrMove.z = 0;
        this.xrSprinting = false;
        this.xrTurnCooldown = Math.max(0, this.xrTurnCooldown - delta);
        const btn = cfg.buttons ?? { trigger: 0, squeeze: 1, thumbstick: 3, primary: 4, secondary: 5 };

        // --- Arm-swing (opcional, desligado por padrão) ---
        let armForward = 0;
        let armSprinting = false;
        const armEnabled = cfg.armSwing === true || this._armSwing.enabled === true;
        if (armEnabled && delta > 0 && delta < 0.2) {
            const leftCtrl = this.xrSources.left?.controller;
            const rightCtrl = this.xrSources.right?.controller;
            if (leftCtrl && rightCtrl) {
                leftCtrl.getWorldPosition(this._armSwing.tmpLeft);
                rightCtrl.getWorldPosition(this._armSwing.tmpRight);
                if (!this._armSwing.hasPrev) {
                    this._armSwing.prevLeft.copy(this._armSwing.tmpLeft);
                    this._armSwing.prevRight.copy(this._armSwing.tmpRight);
                    this._armSwing.hasPrev = true;
                } else {
                    this._armSwing.leftVel.subVectors(this._armSwing.tmpLeft, this._armSwing.prevLeft).divideScalar(delta);
                    this._armSwing.rightVel.subVectors(this._armSwing.tmpRight, this._armSwing.prevRight).divideScalar(delta);
                    const lSpeed = this._armSwing.leftVel.length();
                    const rSpeed = this._armSwing.rightVel.length();
                    const instantAvg = (lSpeed + rSpeed) * 0.5;
                    this._armSwing.avgSpeed = this._armSwing.avgSpeed * 0.82 + instantAvg * 0.18;
                    const zOpposite = this._armSwing.leftVel.z * this._armSwing.rightVel.z < 0;
                    const bothMoving = lSpeed > 0.25 && rSpeed > 0.25;
                    const swingFactor = (zOpposite && bothMoving) ? 1.18 : 0.72;
                    const effective = this._armSwing.avgSpeed * swingFactor;
                    if (effective > this._armSwingThresholdWalk) {
                        const t = Math.min(1, (effective - this._armSwingThresholdWalk) / 1.55);
                        armForward = t;
                        if (effective > this._armSwingThresholdRun) {
                            armSprinting = true;
                            armForward = Math.min(1.35, armForward * 1.35);
                        }
                    }
                    this._armSwing.walkIntensity = armForward;
                    this._armSwing.prevLeft.copy(this._armSwing.tmpLeft);
                    this._armSwing.prevRight.copy(this._armSwing.tmpRight);
                }
            } else {
                this._armSwing.hasPrev = false;
                this._armSwing.avgSpeed *= 0.92;
            }
        } else {
            this._armSwing.hasPrev = false;
        }

        // --- GRIP LOCOMOTION (primária): squeeze/grip = andar p/ frente ---
        // Direção = frente horizontal da cabeça (resolvida no Player.update).
        // Aqui geramos apenas o input escalar; ambos grips = sprint.
        let gripForward = 0;
        let gripSprint = false;
        if (cfg.gripLocomotion !== false) {
            const leftGrip = this.pollXRButton('left', btn.squeeze ?? 1, 'grip-left');
            const rightGrip = this.pollXRButton('right', btn.squeeze ?? 1, 'grip-right');
            if (leftGrip && rightGrip) {
                gripForward = 1;
                gripSprint = true;
            } else if (leftGrip || rightGrip) {
                gripForward = 1;
            }
            // Aceleração/desaceleração suave ~0.10–0.20s p/ conforto.
            const rate = delta > 0 ? Math.min(1, delta / 0.15) : 1;
            this._gripSmooth += ((gripForward > 0 ? 1 : 0) - this._gripSmooth) * rate;
            if (Math.abs(this._gripSmooth) < 0.01) this._gripSmooth = gripForward > 0 ? Math.max(this._gripSmooth, 0.01) : 0;
        } else {
            // ainda faz poll p/ limpar edge states
            this.pollXRButton('left', btn.squeeze ?? 1, 'grip-left');
            this.pollXRButton('right', btn.squeeze ?? 1, 'grip-right');
            this._gripSmooth = 0;
        }
        const gripMag = this._gripSmooth;

        // --- Thumbstick fallback: strafe + frente/trás ---
        const leftStick = this.readXRStick(this.xrSources.left);
        const combinedX = leftStick.x;
        // stick Y: + = trás, - = frente (padrão). Grip soma frente (-Z).
        let combinedZ = leftStick.y - gripMag;
        if (armForward > 0.08) {
            combinedZ = Math.min(combinedZ, -armForward);
            this.xrSprinting = armSprinting || gripSprint;
        } else {
            this.xrSprinting = gripSprint;
        }
        // clamp p/ não exceder magnitude 1.35 (sprint arm-swing legado)
        this.xrMove.x = Math.max(-1.35, Math.min(1.35, combinedX));
        this.xrMove.z = Math.max(-1.35, Math.min(1.35, combinedZ));

        // --- Botões de sistema Quest ---
        // X (left primary=4) = lanterna, A (right primary=4) = celular,
        // B/Y (secondary=5) = pause/resume.
        this.pollXRButton('left', btn.primary ?? 4, 'flashlight');
        this.pollXRButton('right', btn.primary ?? 4, 'phone');
        this.pollXRButton('left', btn.secondary ?? 5, 'pause');
        this.pollXRButton('right', btn.secondary ?? 5, 'pause');

        // --- Blink step: GRIP press edge → 1 salto (com cooldown) ---
        this._blinkCooldown = Math.max(0, this._blinkCooldown - delta);
        if (this.locomotionMode === 'blink') {
            const leftGrip = this.isXRButtonHeld('left', btn.squeeze ?? 1);
            const rightGrip = this.isXRButtonHeld('right', btn.squeeze ?? 1);
            const edge = (leftGrip && !this._prevGripLeft) || (rightGrip && !this._prevGripRight);
            if (edge && this._blinkCooldown <= 0 && !this._blinkPending) {
                this._blinkPending = true;
                this._blinkCooldown = cfg.blinkStep?.cooldown ?? 0.45;
            }
            this._prevGripLeft = leftGrip;
            this._prevGripRight = rightGrip;
        } else {
            this._prevGripLeft = this.isXRButtonHeld('left', btn.squeeze ?? 1);
            this._prevGripRight = this.isXRButtonHeld('right', btn.squeeze ?? 1);
        }

        // --- VR menu navigation ---
        const rightStick = this.readXRStick(this.xrSources.right);
        const navStick = Math.hypot(rightStick.x, rightStick.y) >= Math.hypot(leftStick.x, leftStick.y)
            ? rightStick
            : leftStick;
        const navRelease = cfg.menuStickReleaseThreshold ?? 0.24;
        const navThreshold = Math.max(navRelease + 0.05, cfg.menuStickThreshold ?? 0.68);
        const navMagnitude = Math.max(Math.abs(navStick.x), Math.abs(navStick.y));
        if (navMagnitude <= navRelease) this.xrMenuNavArmed = true;
        if (this.xrMenuNavArmed && navMagnitude >= navThreshold) {
            const vertical = Math.abs(navStick.y) >= Math.abs(navStick.x);
            const direction = vertical
                ? (navStick.y > 0 ? 1 : -1)
                : (navStick.x > 0 ? 1 : -1);
            this.emitXRAction('menu-nav', { direction, axis: vertical ? 'y' : 'x' });
            this.xrMenuNavArmed = false;
        }

        // --- Right-stick turning ---
        if (this.turnMode === 'smooth') {
            const deadzone = cfg.smoothTurnDeadzone ?? 0.18;
            const raw = rightStick.x;
            const abs = Math.abs(raw);
            if (abs > deadzone) {
                const normalized = Math.min(1, (abs - deadzone) / Math.max(0.001, 1 - deadzone));
                const curved = Math.pow(normalized, cfg.smoothTurnExponent ?? 1.35);
                this.emitXRAction('turn-smooth', { value: Math.sign(raw) * curved, delta });
            }
            this.xrTurnArmed = true;
            this.xrTurnCooldown = 0;
        } else {
            const turnRelease = cfg.snapTurnReleaseThreshold ?? 0.22;
            const turnThreshold = Math.max(turnRelease + 0.05, cfg.snapTurnThreshold ?? 0.70);
            if (Math.abs(rightStick.x) <= turnRelease) this.xrTurnArmed = true;
            if (this.xrTurnArmed && this.xrTurnCooldown <= 0 && Math.abs(rightStick.x) > turnThreshold) {
                this.emitXRAction('turn', rightStick.x > 0 ? -1 : 1);
                this.xrTurnCooldown = cfg.snapTurnCooldown ?? 0.28;
                this.xrTurnArmed = false;
            }
        }

        // Debug opcional throttled (1x/seg) — nunca por frame no console.
        if (cfg.debugInput === true) {
            this._debugThrottle += delta;
            if (this._debugThrottle > 1.0) {
                this._debugThrottle = 0;
                console.log('[XR-debug]', JSON.stringify(this.getXRDebugState()));
            }
        }
    }

    getXRMoveInput() {
        // Em blink mode não há locomotion contínua — só saltos discretos.
        if (this.locomotionMode === 'blink') return { x: 0, z: 0 };
        return this.xrMove;
    }

    isXRSprinting() {
        if (this.locomotionMode === 'blink') return false;
        return this.xrSprinting;
    }

    setLocomotionMode(mode) {
        this.locomotionMode = mode === 'blink' ? 'blink' : 'continuous';
        this._blinkPending = false;
        this._blinkCooldown = 0;
    }

    setTurnMode(mode) {
        this.turnMode = mode === 'snap' ? 'snap' : 'smooth';
        this.xrTurnCooldown = 0;
        this.xrTurnArmed = true;
    }

    // Consome 1 pedido de blink (edge). Retorna { distance } ou null.
    consumeBlinkStep() {
        if (!this._blinkPending) return null;
        this._blinkPending = false;
        const cfg = xrCfg().blinkStep ?? {};
        return { distance: cfg.distance ?? 1.0 };
    }

    isActionActive(action) {
        return this.actions.has(action);
    }

    clearActions() {
        this.actions.clear();
        this.xrMove.x = 0;
        this.xrMove.z = 0;
        this.xrSprinting = false;
        this._gripSmooth = 0;
        this.xrTurnCooldown = 0;
        this.xrTurnArmed = true;
        this.xrMenuNavArmed = true;
        this._blinkPending = false;
        this._blinkCooldown = 0;
    }
}
