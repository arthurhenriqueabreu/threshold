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
        // Orientação inicial usada apenas pelo modo desktop. Em XR a pose do
        // headset continua soberana e o rig só recebe a posição da fase.
        this.spawnYaw = 0;
        this.blockers = [];
        this.updatables = [];
        // Colisão fina pra objetos de ambientação que não ocupam a
        // célula inteira do grid (caixote, gaveteiro, sofá, etc.).
        this.propColliders = [];
        // Scratch usado pelo resolvedor de colisão circular. O método retorna
        // este vetor para não criar lixo a cada frame de locomotion XR.
        this._collisionCorrection = new THREE.Vector2();
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
        if (this.isSolidCell(cell.x, cell.z)) return true;
        for (const prop of this.propColliders) {
            const dx = x - prop.x;
            const dz = z - prop.z;
            if (dx * dx + dz * dz < prop.radius * prop.radius) return true;
        }
        return false;
    }

    // Retorna a menor correção que tira um círculo de uma célula sólida ou
    // de um prop circular. Diferente de isSolidAt(), isto resolve a forma
    // inteira do collider e evita que o jogador atravesse a quina de uma
    // parede só porque os quatro pontos amostrados ficaram livres.
    //
    // O método também é usado para o HMD em XR: o jogador pode deslocar a
    // cabeça fisicamente dentro do playspace, então só limitar o XR rig não
    // basta para impedir que os olhos atravessem uma parede.
    getCollisionCorrection(x, z, radius = CONFIG.player.radius) {
        const correction = this._collisionCorrection.set(0, 0);
        if (!(radius > 0)) return null;

        let bestDepth = 0;
        let bestX = 0;
        let bestZ = 0;
        const consider = (pushX, pushZ, depth) => {
            if (depth > bestDepth) {
                bestDepth = depth;
                bestX = pushX;
                bestZ = pushZ;
            }
        };

        // Níveis baseados em grid: examina só as células que podem tocar o
        // círculo. Níveis sem grid (ex.: RealRoom) implementam o mesmo
        // contrato localmente.
        if (this.rows > 0 && this.cols > 0) {
            const offsetX = (this.cols * this.cellSize) / 2;
            const offsetZ = (this.rows * this.cellSize) / 2;
            const minCol = Math.floor((x - radius + offsetX) / this.cellSize) - 1;
            const maxCol = Math.floor((x + radius + offsetX) / this.cellSize) + 1;
            const minRow = Math.floor((z - radius + offsetZ) / this.cellSize) - 1;
            const maxRow = Math.floor((z + radius + offsetZ) / this.cellSize) + 1;
            const half = this.cellSize / 2;

            for (let row = minRow; row <= maxRow; row++) {
                for (let col = minCol; col <= maxCol; col++) {
                    if (!this.isSolidCell(col, row)) continue;
                    const centerX = (col + 0.5) * this.cellSize - offsetX;
                    const centerZ = (row + 0.5) * this.cellSize - offsetZ;
                    const minX = centerX - half;
                    const maxX = centerX + half;
                    const minZ = centerZ - half;
                    const maxZ = centerZ + half;
                    const closestX = Math.max(minX, Math.min(x, maxX));
                    const closestZ = Math.max(minZ, Math.min(z, maxZ));
                    const dx = x - closestX;
                    const dz = z - closestZ;
                    const distSq = dx * dx + dz * dz;

                    if (distSq > 0) {
                        const distance = Math.sqrt(distSq);
                        if (distance >= radius) continue;
                        const depth = radius - distance;
                        consider((dx / distance) * depth, (dz / distance) * depth, depth);
                        continue;
                    }

                    // Centro dentro da célula: empurra pela face mais próxima
                    // e inclui o raio para deixar o círculo inteiro livre.
                    const toLeft = x - minX;
                    const toRight = maxX - x;
                    const toTop = z - minZ;
                    const toBottom = maxZ - z;
                    const nearest = Math.min(toLeft, toRight, toTop, toBottom);
                    if (nearest === toLeft) consider(-(radius + toLeft), 0, radius + toLeft);
                    else if (nearest === toRight) consider(radius + toRight, 0, radius + toRight);
                    else if (nearest === toTop) consider(0, -(radius + toTop), radius + toTop);
                    else consider(0, radius + toBottom, radius + toBottom);
                }
            }
        }

        // Props são círculos e podem existir em qualquer nível.
        for (const prop of this.propColliders) {
            const dx = x - prop.x;
            const dz = z - prop.z;
            const minDistance = radius + prop.radius;
            const distSq = dx * dx + dz * dz;
            if (distSq >= minDistance * minDistance) continue;
            if (distSq > 0) {
                const distance = Math.sqrt(distSq);
                const depth = minDistance - distance;
                consider((dx / distance) * depth, (dz / distance) * depth, depth);
            } else {
                consider(minDistance, 0, minDistance);
            }
        }

        if (bestDepth <= 0) return null;
        correction.set(bestX, bestZ);
        return correction;
    }

    addPropCollider(x, z, radius) {
        this.propColliders.push({ x, z, radius });
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
