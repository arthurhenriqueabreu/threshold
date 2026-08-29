import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export const EntityState = {
    IDLE_HIDDEN: 'IDLE_HIDDEN',
    OBSERVING: 'OBSERVING',
    DISAPPEARING: 'DISAPPEARING',
    STALKING: 'STALKING',
    CHASING: 'CHASING',
    SEARCHING: 'SEARCHING',
    COOLDOWN: 'COOLDOWN',
    GONE: 'GONE'
};

const ECFG = CONFIG.entities;

export class BackroomsEntity {
    constructor({ level, mode, seed, events }) {
        this.level = level;
        this.mode = mode;            // benign | timid | aggressive
        this.events = events;
        this.state = EntityState.IDLE_HIDDEN;
        this.seed = seed || 0;
        this.playerPos = new THREE.Vector3();
        this.time = 0;
        this.stateTimer = 0;
        this.target = new THREE.Vector3();
        this.caughtPlayer = false;

        this.speed = ECFG.speed.walk;
        this.observeRange = this.observeRangeFor(mode);

        this.buildVisual();
        this.pickWanderTarget();
    }

    observeRangeFor(mode) {
        if (mode === 'easy') return ECFG.observeRangeEasy * CONFIG.game.cellSize;
        if (mode === 'aggressive') return ECFG.observeRangeHard * CONFIG.game.cellSize;
        return ECFG.observeRangeNormal * CONFIG.game.cellSize;
    }

    buildVisual() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x14120e });
        const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.28, 1.1, 4, 6),
            bodyMat
        );
        body.position.y = 0.85;
        body.scale.set(0.7, 1, 0.7);

        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd8c26a });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), eyeMat);
        eyeL.position.set(0.16, 1.42, 0.12);
        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), eyeMat);
        eyeR.position.set(-0.16, 1.42, 0.12);

        group.add(body, eyeL, eyeR);
        this.group = group;
    }

    setPlayerPos(pos) {
        this.playerPos.copy(pos);
    }

    resetState(state) {
        this.state = state;
        this.stateTimer = 0;
    }

    distanceToPlayer() {
        return this.group.position.distanceTo(this.playerPos);
    }

    visibleToPlayer() {
        const d = this.distanceToPlayer();
        if (d > this.observeRange) return false;
        return !this.lineBlocked(this.group.position, this.playerPos);
    }

    lineBlocked(a, b) {
        const steps = Math.ceil(a.distanceTo(b) / (CONFIG.game.cellSize * 0.5));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = a.x + (b.x - a.x) * t;
            const z = a.z + (b.z - a.z) * t;
            if (this.level.isSolidAt(x, z)) return true;
        }
        return false;
    }

    update(delta, time) {
        this.time = time;
        this.stateTimer += delta;
        this.group.visible = this.state !== EntityState.GONE;

        switch (this.state) {
            case EntityState.IDLE_HIDDEN:
                this.updateHidden(delta);
                break;
            case EntityState.OBSERVING:
                this.updateObserving(delta);
                break;
            case EntityState.DISAPPEARING:
                this.updateDisappearing(delta);
                break;
            case EntityState.STALKING:
                this.updateStalking(delta);
                break;
            case EntityState.CHASING:
                this.updateChasing(delta);
                break;
            case EntityState.SEARCHING:
                this.updateSearching(delta);
                break;
            case EntityState.COOLDOWN:
                this.updateCooldown(delta);
                break;
            default:
                break;
        }
    }

    updateHidden(delta) {
        if (this.mode === 'benign') {
            // vagar lentamente, some e reaparece longe do jogador
            this.wander(delta, ECFG.speed.walk * 0.5);
            const d = this.distanceToPlayer();
            if (d > this.observeRange) return;
            if (this.visibleToPlayer()) {
                this.resetState(EntityState.OBSERVING);
            }
            return;
        }
        if (this.visibleToPlayer() && this.stateTimer > 2 + this.seed) {
            this.resetState(EntityState.OBSERVING);
        }
    }

    updateObserving(delta) {
        // encara o jogador, imóvel
        this.facePlayer();
        this.flicker(delta);
        this.stateTimer += delta;
        if (!this.visibleToPlayer()) {
            this.resetState(EntityState.SEARCHING);
            return;
        }
        const d = this.distanceToPlayer();
        if (this.mode === 'benign') {
            if (this.stateTimer > 3) {
                this.resetState(EntityState.DISAPPEARING);
            }
        } else if (this.mode === 'aggressive') {
            if (this.stateTimer > 1.2) {
                this.resetState(EntityState.CHASING);
            }
        } else {
            // timid: observa, depois stalk, persegue só se próximo
            if (d < ECFG.chaseRange * CONFIG.game.cellSize * 0.5) {
                this.resetState(EntityState.CHASING);
            } else if (this.stateTimer > 4) {
                this.resetState(EntityState.STALKING);
            }
        }
        if (this.mode !== 'benign' && d < CONFIG.player.radius + 0.55) {
            this.caughtPlayer = true;
        }
    }

    updateDisappearing(delta) {
        this.facePlayer();
        this.flicker(delta);
        this.group.position.y = Math.sin(this.time * 8) * 0.02;
        this.stateTimer += delta;
        if (this.stateTimer > ECFG.disappearTime) {
            this.teleportAway();
            this.group.visible = false;
            this.resetState(EntityState.IDLE_HIDDEN);
        }
    }

    updateStalking(delta) {
        this.moveTowardPlayer(delta, ECFG.speed.stalk);
        this.flicker(delta);
        const d = this.distanceToPlayer();
        if (d < ECFG.chaseRange * CONFIG.game.cellSize) {
            this.resetState(EntityState.CHASING);
        }
        if (d < CONFIG.player.radius + 0.5) {
            this.caughtPlayer = true;
        }
    }

    updateChasing(delta) {
        this.moveTowardPlayer(delta, ECFG.speed.chase);
        const d = this.distanceToPlayer();
        if (d < CONFIG.player.radius + 0.5) {
            this.caughtPlayer = true;
            return;
        }
        if (d > this.observeRange * 1.5) {
            this.resetState(EntityState.SEARCHING);
        }
    }

    updateSearching(delta) {
        this.facePlayer();
        this.wander(delta, ECFG.speed.walk);
        if (this.stateTimer > ECFG.searchTime) {
            this.resetState(EntityState.COOLDOWN);
        }
    }

    updateCooldown(delta) {
        this.group.position.y = Math.sin(this.time * 6) * 0.03;
        this.flicker(delta);
        if (this.stateTimer > ECFG.chaseCooldown) {
            this.teleportAway();
            this.resetState(EntityState.IDLE_HIDDEN);
        }
    }

    facePlayer() {
        const dx = this.playerPos.x - this.group.position.x;
        const dz = this.playerPos.z - this.group.position.z;
        this.group.rotation.y = Math.atan2(dx, dz);
    }

    flicker(delta) {
        const s = 0.7 + Math.random() * 0.6;
        this.group.scale.setScalar(s);
        this.group.visible = Math.random() > 0.05;
    }

    moveTowardPlayer(delta, speed) {
        const dx = this.playerPos.x - this.group.position.x;
        const dz = this.playerPos.z - this.group.position.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.01) return;
        const step = Math.min(speed * delta, len);
        this.facePlayer();
        this.moveWithCollision((dx / len) * step, (dz / len) * step);
    }

    wander(delta, speed) {
        const dx = this.target.x - this.group.position.x;
        const dz = this.target.z - this.group.position.z;
        if (Math.hypot(dx, dz) < 0.3) {
            this.pickWanderTarget();
            return;
        }
        const len = Math.hypot(dx, dz);
        const step = Math.min(speed * delta, len);
        this.moveWithCollision((dx / len) * step, (dz / len) * step);
    }

    pickWanderTarget() {
        const cell = this.level.worldToCell(this.group.position.x, this.group.position.z);
        let attempts = 0;
        let chosen = null;
        while (attempts++ < 12) {
            const dc = (Math.floor(Math.random() * 7) - 3);
            const dr = (Math.floor(Math.random() * 7) - 3);
            const nc = cell.x + dc;
            const nr = cell.z + dr;
            if (nc < 0 || nr < 0 || nc >= this.level.cols || nr >= this.level.rows) continue;
            if (this.level.grid[nr][nc] === '#') continue;
            chosen = this.level.cellToWorld(nc, nr);
            break;
        }
        this.target.set(chosen ? chosen.x : this.group.position.x, 0, chosen ? chosen.z : this.group.position.z);
    }

    moveWithCollision(dx, dz) {
        const p = this.group.position;
        const r = 0.35;
        if (!this.level.isSolidAt(p.x + dx + r, p.z) && !this.level.isSolidAt(p.x + dx - r, p.z)) {
            p.x += dx;
        }
        if (!this.level.isSolidAt(p.x, p.z + dz + r) && !this.level.isSolidAt(p.x, p.z + dz - r)) {
            p.z += dz;
        }
    }

    teleportAway() {
        const playerCell = this.level.worldToCell(this.playerPos.x, this.playerPos.z);
        let chosen = null;
        for (let attempts = 0; attempts < 20; attempts++) {
            const c = Math.floor(Math.random() * this.level.cols);
            const r = Math.floor(Math.random() * this.level.rows);
            if (this.level.grid[r][c] === '#') continue;
            const d = Math.hypot(c - playerCell.x, r - playerCell.z);
            if (d < 5) continue;
            const w = this.level.cellToWorld(c, r);
            chosen = new THREE.Vector3(w.x, 0, w.z);
            break;
        }
        if (chosen) {
            this.group.position.copy(chosen);
            this.group.visible = false;
        }
    }

    dispose() {
        this.level.group.remove(this.group);
        this.group.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                mats.forEach((m) => m.dispose());
            }
        });
    }
}
