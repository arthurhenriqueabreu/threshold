import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { BackroomsEntity, EntityState } from './BackroomsEntity.js';

export class EntityManager {
    constructor({ level, enemyMode, count, events, playerPosRef }) {
        this.level = level;
        this.enemyMode = enemyMode;
        this.events = events;
        this.playerPosRef = playerPosRef || new THREE.Vector3();
        this.entities = [];

        const n = count ?? CONFIG.difficulty.normal.entityCount;
        for (let i = 0; i < n; i++) {
            const entity = new BackroomsEntity({
                level,
                mode: enemyMode,
                seed: i,
                events
            });
            this.placeEntity(entity, i);
            level.group.add(entity.group);
            this.entities.push(entity);
        }
    }

    placeEntity(entity, index) {
        const playerCell = this.level.worldToCell(this.playerPosRef.x, this.playerPosRef.z);
        let chosen = null;
        for (let attempts = 0; attempts < 30; attempts++) {
            const c = Math.floor(Math.random() * this.level.cols);
            const r = Math.floor(Math.random() * this.level.rows);
            if (this.level.grid[r][c] === '#') continue;
            const d = Math.hypot(c - playerCell.x, r - playerCell.z);
            if (d < 6) continue;
            const cellOpen = this.freeCell(c, r);
            if (!cellOpen) continue;
            const w = this.level.cellToWorld(c, r);
            chosen = new THREE.Vector3(w.x, 0, w.z);
            break;
        }
        if (!chosen) {
            const w = this.level.cellToWorld(3, 3);
            chosen = new THREE.Vector3(w.x, 0, w.z);
        }
        entity.group.position.copy(chosen);
        entity.group.visible = false;
    }

    freeCell(c, r) {
        for (const e of this.entities) {
            const ec = this.level.worldToCell(e.group.position.x, e.group.position.z);
            if (ec.x === c && ec.z === r) return false;
        }
        return true;
    }

    update(delta, time, onCaught) {
        const playerPos = this.playerPosRef;
        // invalida temporariamente os pontos de luz próximos ao ver entidade (atmosférico)
        for (const entity of this.entities) {
            entity.setPlayerPos(playerPos);
            entity.update(delta, time);
            if (entity.caughtPlayer) {
                entity.caughtPlayer = false;
                if (onCaught) onCaught(entity);
            }
        }
    }

    setLevel(level) {
        this.level = level;
        for (const entity of this.entities) {
            entity.level = level;
        }
    }

    dispose() {
        for (const entity of this.entities) {
            entity.dispose();
        }
        this.entities = [];
    }
}