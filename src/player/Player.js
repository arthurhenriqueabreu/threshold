import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { PlayerController } from './PlayerController.js';
import { PlayerMovement } from './PlayerMovement.js';

const _xrHeadWorld = new THREE.Vector3();

export class Player {
    constructor(camera, inputManager, collisionWorld, { xrRig = null, isXRActive = () => false } = {}) {
        this.camera = camera;
        this.xrRig = xrRig;
        this.isXRActive = isXRActive;
        this.controller = new PlayerController(inputManager, camera);
        this.movement = new PlayerMovement(collisionWorld);
        // Hooks opcionais injetados pelo Game (comfort profile, blink).
        this._comfortProfile = null;
        this._locomotionMode = null;
        this._consumeBlink = null;
        this._onBlink = null;

        this.moveVector = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
    }

    // Configuração de conforto VR (chamado pelo Game; sem restart).
    setComfortHooks({ comfortProfile = null, locomotionMode = null, consumeBlink = null, onBlink = null } = {}) {
        if (comfortProfile !== undefined) this._comfortProfile = comfortProfile;
        if (locomotionMode !== undefined) this._locomotionMode = locomotionMode;
        if (consumeBlink !== undefined) this._consumeBlink = consumeBlink;
        if (onBlink !== undefined) this._onBlink = onBlink;
    }

    getSpeed() {
        return this.movement.getSpeed?.() ?? 0;
    }

    spawnAt(x, z, yaw = null) {
        this.movement.setPosition(x, z);
        this.controller.reset();
        if (Number.isFinite(yaw)) this.controller.yaw = yaw;
        if (this.xrRig) {
            // Desktop mode keeps the camera in world coordinates. Only XR
            // uses the rig as a translated locomotion origin.
            const xrActive = this.isXRActive();
            this.xrRig.position.set(xrActive ? x : 0, 0, xrActive ? z : 0);
        }
    }

    update(delta, allowMovement) {
        const xrActive = this.isXRActive();
        this.controller.setXRActive(xrActive);
        if (allowMovement) {
            const input = this.controller.getMoveInput();
            if (xrActive) {
                this.camera.getWorldDirection(this.forward);
                this.forward.y = 0;
                if (this.forward.lengthSq() < 0.001) {
                    this.forward.set(0, 0, -1);
                } else {
                    this.forward.normalize();
                }
                this.right.set(-this.forward.z, 0, this.forward.x);
            } else {
                this.forward.set(-Math.sin(this.controller.yaw), 0, -Math.cos(this.controller.yaw));
                this.right.set(Math.cos(this.controller.yaw), 0, -Math.sin(this.controller.yaw));
            }
            this.moveVector.set(0, 0, 0)
                .addScaledVector(this.forward, -input.z)
                .addScaledVector(this.right, input.x);
            if (xrActive) {
                // VR usa o comfort profile ativo (walk/sprint/accel/decel).
                // Sprint walk→sprint é gradual via currentVelocity (sem salto).
                const profile = this._comfortProfile?.() ?? null;
                const walk = profile?.walkSpeed ?? CONFIG.xr?.walkSpeed ?? 2.6;
                const sprint = profile?.sprintSpeed ?? CONFIG.xr?.sprintSpeed ?? 4.0;
                const speeds = { walk, sprint };
                const dynamics = {
                    acceleration: profile?.acceleration ?? 6.5,
                    deceleration: profile?.deceleration ?? 8.5
                };
                const mode = this._locomotionMode?.() ?? 'continuous';
                if (mode === 'blink') {
                    // Blink step: consome pedidos discretos (edge + cooldown);
                    // sem locomotion contínua neste modo.
                    const req = this._consumeBlink?.();
                    if (req) {
                        this.movement.blinkStep(this.forward, req.distance);
                        this._onBlink?.();
                    }
                    // Zera velocidade p/ vignette não acusar movimento contínuo.
                    this.movement.currentVelocity.set(0, 0, 0);
                    this.movement.targetVelocity.set(0, 0, 0);
                } else {
                    this.movement.update(delta, this.moveVector, this.controller.isSprinting(), speeds, dynamics);
                }
            } else {
                // Desktop: resposta imediata legada (sem accel XR).
                this.movement.update(delta, this.moveVector, this.controller.isSprinting(), null, null);
            }
        }
        if (xrActive && this.xrRig) {
            // WebXR owns the camera pose. The rig is the locomotion origin.
            this.xrRig.position.set(this.movement.position.x, 0, this.movement.position.z);
            // Room-scale moves the HMD relative to the rig. Resolve that
            // physical offset too, otherwise the player can lean/walk through
            // a wall while the artificial locomotion origin stays legal.
            this.camera.getWorldPosition(_xrHeadWorld);
            const headRadius = CONFIG.xr?.headColliderRadius ?? CONFIG.player.radius;
            const resolved = this.movement.resolvePosition(
                _xrHeadWorld.x,
                _xrHeadWorld.z,
                headRadius
            );
            if (resolved.corrected) {
                const correctionX = resolved.x - _xrHeadWorld.x;
                const correctionZ = resolved.z - _xrHeadWorld.z;
                this.xrRig.position.x += correctionX;
                this.xrRig.position.z += correctionZ;
                this.movement.position.x = this.xrRig.position.x;
                this.movement.position.z = this.xrRig.position.z;
                // Evita tremor contra a parede enquanto o grip continua
                // pressionado; o próximo input pode retomar o movimento.
                this.movement.currentVelocity.set(0, 0, 0);
                this.movement.targetVelocity.set(0, 0, 0);
            }
        } else {
            if (this.xrRig) this.xrRig.position.set(0, 0, 0);
            this.controller.applyToCamera(this.movement.position);
        }
    }

    getPosition() {
        return this.movement.position;
    }

    dispose() {
        this.controller.dispose?.();
    }
}
