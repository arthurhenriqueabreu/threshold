import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export class PlayerMovement {
    constructor(collisionWorld) {
        this.collisionWorld = collisionWorld;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
    }

    update(delta, moveInput, sprinting) {
        const speed = sprinting ? CONFIG.player.sprintSpeed : CONFIG.player.speed;
        const displacement = new THREE.Vector3(moveInput.x, 0, moveInput.z);
        if (displacement.lengthSq() > 0) {
            displacement.normalize().multiplyScalar(speed * delta);
        }

        this.tryMoveAxis(displacement.x, 0);
        this.tryMoveAxis(0, displacement.z);
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
        return (
            this.collisionWorld.isSolidAt(x + radius, z + radius) ||
            this.collisionWorld.isSolidAt(x - radius, z + radius) ||
            this.collisionWorld.isSolidAt(x + radius, z - radius) ||
            this.collisionWorld.isSolidAt(x - radius, z - radius)
        );
    }

    setPosition(x, z) {
        this.position.set(x, CONFIG.player.height, z);
    }
}
