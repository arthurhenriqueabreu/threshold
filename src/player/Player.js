import * as THREE from 'three';
import { PlayerController } from './PlayerController.js';
import { PlayerMovement } from './PlayerMovement.js';

export class Player {
    constructor(camera, inputManager, collisionWorld) {
        this.camera = camera;
        this.controller = new PlayerController(inputManager, camera);
        this.movement = new PlayerMovement(collisionWorld);

        this.moveVector = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
    }

    spawnAt(x, z) {
        this.movement.setPosition(x, z);
        this.controller.reset();
    }

    update(delta, allowMovement) {
        if (allowMovement) {
            const input = this.controller.getMoveInput();
            this.forward.set(-Math.sin(this.controller.yaw), 0, -Math.cos(this.controller.yaw));
            this.right.set(Math.cos(this.controller.yaw), 0, -Math.sin(this.controller.yaw));
            this.moveVector.set(0, 0, 0)
                .addScaledVector(this.forward, -input.z)
                .addScaledVector(this.right, input.x);
            this.movement.update(delta, this.moveVector, this.controller.isSprinting());
        }
        this.controller.applyToCamera(this.movement.position);
    }

    getPosition() {
        return this.movement.position;
    }
}
