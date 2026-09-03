import * as THREE from 'three';
import { PlayerController } from './PlayerController.js';
import { PlayerMovement } from './PlayerMovement.js';

export class Player {
    constructor(camera, inputManager, collisionWorld, { xrRig = null, isXRActive = () => false } = {}) {
        this.camera = camera;
        this.xrRig = xrRig;
        this.isXRActive = isXRActive;
        this.controller = new PlayerController(inputManager, camera);
        this.movement = new PlayerMovement(collisionWorld);

        this.moveVector = new THREE.Vector3();
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
    }

    spawnAt(x, z) {
        this.movement.setPosition(x, z);
        this.controller.reset();
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
            this.movement.update(delta, this.moveVector, this.controller.isSprinting());
        }
        if (xrActive && this.xrRig) {
            // WebXR owns the camera pose. The rig is the locomotion origin.
            this.xrRig.position.set(this.movement.position.x, 0, this.movement.position.z);
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
