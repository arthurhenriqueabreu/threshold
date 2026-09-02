import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.interactables = [];
        this.grid = [];
        this.cols = 0;
        this.rows = 0;
        this.cellSize = CONFIG.game.cellSize;
        this.spawnPoint = new THREE.Vector3();
        this.blockers = [];
        this.updatables = [];
        scene.add(this.group);
    }

    cellToWorld(col, row) {
        const offsetX = (this.cols * this.cellSize) / 2;
        const offsetZ = (this.rows * this.cellSize) / 2;
        return {
            x: (col + 0.5) * this.cellSize - offsetX,
            z: (row + 0.5) * this.cellSize - offsetZ
        };
    }

    worldToCell(x, z) {
        const offsetX = (this.cols * this.cellSize) / 2;
        const offsetZ = (this.rows * this.cellSize) / 2;
        return {
            x: Math.floor((x + offsetX) / this.cellSize),
            z: Math.floor((z + offsetZ) / this.cellSize)
        };
    }

    isSolidCell(cx, cz) {
        if (cz < 0 || cz >= this.rows || cx < 0 || cx >= this.cols) {
            return true;
        }
        if (this.grid[cz][cx] === '#') {
            return true;
        }
        return this.blockers.some((b) => b.isBlockingCell(cx, cz));
    }

    isSolidAt(x, z) {
        const cell = this.worldToCell(x, z);
        return this.isSolidCell(cell.x, cell.z);
    }

    addInteractable(interactable) {
        this.interactables.push(interactable);
        this.updatables.push(interactable);
    }

    update(delta, time) {
        for (const updatable of this.updatables) {
            updatable.update(delta, time);
        }
    }

    dispose() {
        if (this.lighting) this.lighting.dispose();
        this.group.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];
                for (const material of materials) {
                    material.dispose();
                }
            }
        });
        this.scene.remove(this.group);
        // remove painel light se existir
        if (this._panelLight) {
            this.scene.remove(this._panelLight);
            this._panelLight = null;
        }
    }
}
