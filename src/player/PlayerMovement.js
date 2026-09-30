import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

const COLLISION_SAMPLE_DIRECTIONS = [
    [0, 0],
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [Math.SQRT1_2, Math.SQRT1_2],
    [Math.SQRT1_2, -Math.SQRT1_2],
    [-Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, -Math.SQRT1_2]
];

// Locomotion com velocidade real (comfort mitigation para XR).
//
// Pipeline: INPUT → direção + magnitude → targetVelocity →
// aceleração/desaceleração → currentVelocity → displacement → collision.
//
// Correção do bug do normalize: a magnitude analógica do input (thumbstick
// parcial, grip smoothing) é PRESERVADA — stick 0.3 ≈ 30% da velocidade.
// NUNCA normalize destruindo magnitude: qualquer input > 0 virava velocidade
// máxima instantânea, anulando o smoothing do InputManager.
export class PlayerMovement {
    constructor(collisionWorld) {
        this.collisionWorld = collisionWorld;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        // Velocidade real usada pela locomotion (XZ). `velocity` é mantido
        // como alias legado p/ compatibilidade.
        this.currentVelocity = this.velocity;
        this.targetVelocity = new THREE.Vector3();
        this._tmpDir = new THREE.Vector3();
        this._resolvedPosition = { x: 0, z: 0, corrected: false };
    }

    getSpeed() {
        return Math.hypot(this.currentVelocity.x, this.currentVelocity.z);
    }

    update(delta, moveInput, sprinting, speeds = null, dynamics = null) {
        const walk = speeds?.walk ?? CONFIG.player.speed;
        const sprint = speeds?.sprint ?? CONFIG.player.sprintSpeed;
        const topSpeed = sprinting ? sprint : walk;

        // --- direção + magnitude (magnitude analógica preservada) ---
        const ix = moveInput?.x ?? 0;
        const iz = moveInput?.z ?? 0;
        const mag = Math.hypot(ix, iz);
        if (mag > 0.0001) {
            // Clamp p/ diagonal digital não exceder 1; preserva < 1.
            const clampedMag = Math.min(mag, 1);
            this._tmpDir.set(ix / mag, 0, iz / mag);
            this.targetVelocity.copy(this._tmpDir).multiplyScalar(topSpeed * clampedMag);
        } else {
            this.targetVelocity.set(0, 0, 0);
        }

        // --- aceleração / desaceleração progressiva ---
        // Desktop (dynamics ausente): resposta imediata legada, sem sliding.
        const accel = dynamics?.acceleration ?? 0;
        const decel = dynamics?.deceleration ?? 0;
        if (!(accel > 0) && !(decel > 0)) {
            this.currentVelocity.copy(this.targetVelocity);
        } else {
            const cx = this.currentVelocity.x;
            const cz = this.currentVelocity.z;
            const tx = this.targetVelocity.x;
            const tz = this.targetVelocity.z;
            const curSpeed = Math.hypot(cx, cz);
            const tgtSpeed = Math.hypot(tx, tz);
            // Acelera em direção ao alvo; desacelera rápido mas não instântaneo.
            const speedingUp = tgtSpeed > curSpeed + 0.001;
            const rate = speedingUp ? accel : decel;
            if (!(rate > 0)) {
                this.currentVelocity.copy(this.targetVelocity);
            } else {
                const maxDelta = rate * Math.max(0, delta);
                const dx = tx - cx;
                const dz = tz - cz;
                const diff = Math.hypot(dx, dz);
                if (diff <= maxDelta) {
                    this.currentVelocity.set(tx, 0, tz);
                } else if (diff > 0.0001) {
                    this.currentVelocity.x = cx + (dx / diff) * maxDelta;
                    this.currentVelocity.z = cz + (dz / diff) * maxDelta;
                }
            }
        }

        const displacement = new THREE.Vector3(
            this.currentVelocity.x * delta,
            0,
            this.currentVelocity.z * delta
        );

        this.tryMoveAxis(displacement.x, 0);
        this.tryMoveAxis(0, displacement.z);
    }

    // Blink step: deslocamento discreto com collision por substeps.
    // NUNCA atravessa paredes/portas fechadas — para no último ponto livre.
    // Retorna a distância realmente percorrida.
    blinkStep(direction, distance = 1.0) {
        const dx = direction?.x ?? 0;
        const dz = direction?.z ?? 0;
        const len = Math.hypot(dx, dz);
        if (!(len > 0.0001) || !(distance > 0)) return 0;
        const cfg = CONFIG.xr?.blinkStep ?? {};
        const clamped = Math.max(
            cfg.minDistance ?? 0.7,
            Math.min(cfg.maxDistance ?? 1.2, distance)
        );
        const steps = Math.max(2, Math.round(cfg.substeps ?? 8));
        const nx = dx / len;
        const nz = dz / len;
        const stepLen = clamped / steps;
        let travelled = 0;
        for (let i = 0; i < steps; i++) {
            const nx2 = this.position.x + nx * stepLen;
            const nz2 = this.position.z + nz * stepLen;
            if (this.collides(nx2, nz2)) break;
            this.position.x = nx2;
            this.position.z = nz2;
            travelled += stepLen;
        }
        // Blink corta qualquer momentum p/ não deslizar após o salto.
        this.currentVelocity.set(0, 0, 0);
        this.targetVelocity.set(0, 0, 0);
        return travelled;
    }

    tryMoveAxis(dx, dz) {
        const newX = this.position.x + dx;
        const newZ = this.position.z + dz;
        if (!this.collides(newX, newZ)) {
            this.position.x = newX;
            this.position.z = newZ;
        }
    }

    collides(x, z) {
        const radius = CONFIG.player.radius;
        // Níveis com geometria conhecida fazem a checagem exata círculo ×
        // célula/prop. Isso cobre as arestas que a antiga amostragem dos
        // quatro cantos deixava atravessar.
        if (typeof this.collisionWorld?.getCollisionCorrection === 'function') {
            return !!this.collisionWorld.getCollisionCorrection(x, z, radius);
        }
        // Fallback para mundos legados: centro, cardinais e diagonais.
        return COLLISION_SAMPLE_DIRECTIONS.some(([sx, sz]) =>
            this.collisionWorld.isSolidAt(x + sx * radius, z + sz * radius)
        );
    }

    // Resolve uma posição já ocupada por uma parede/prop. É usado no XR para
    // corrigir o deslocamento físico do headset dentro do room-scale, que não
    // passa pelo deslocamento artificial normal do stick/grip.
    resolvePosition(x, z, radius = CONFIG.player.radius) {
        const result = this._resolvedPosition;
        result.x = x;
        result.z = z;
        result.corrected = false;
        if (typeof this.collisionWorld?.getCollisionCorrection !== 'function') {
            return result;
        }
        let px = x;
        let pz = z;
        let corrected = false;
        // Mais de uma iteração resolve quinas e interseções parede + prop.
        for (let i = 0; i < 6; i++) {
            const push = this.collisionWorld.getCollisionCorrection(px, pz, radius);
            const pushZ = push?.y ?? push?.z ?? 0;
            if (!push || Math.hypot(push.x, pushZ) < 0.00001) break;
            px += push.x;
            pz += pushZ;
            corrected = true;
        }
        result.x = px;
        result.z = pz;
        result.corrected = corrected;
        return result;
    }

    setPosition(x, z) {
        this.position.set(x, CONFIG.player.height, z);
        this.currentVelocity.set(0, 0, 0);
        this.targetVelocity.set(0, 0, 0);
    }
}
