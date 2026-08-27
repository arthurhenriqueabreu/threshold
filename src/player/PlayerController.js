import { CONFIG } from '../core/Config.js';

export class PlayerController {
    constructor(inputManager, camera) {
        this.input = inputManager;
        this.camera = camera;
        this.yaw = 0;
        this.pitch = 0;
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onMouseMove(event) {
        if (document.pointerLockElement === null) {
            return;
        }
        this.yaw -= event.movementX * CONFIG.player.mouseSensitivity;
        this.pitch -= event.movementY * CONFIG.player.mouseSensitivity;
        const limit = Math.PI / 2 - 0.05;
        this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    }

    getMoveInput() {
        const input = { x: 0, z: 0 };
        if (this.input.isActionActive('forward')) input.z -= 1;
        if (this.input.isActionActive('backward')) input.z += 1;
        if (this.input.isActionActive('left')) input.x -= 1;
        if (this.input.isActionActive('right')) input.x += 1;
        return input;
    }

    isSprinting() {
        return this.input.isActionActive('run');
    }

    applyToCamera(position) {
        this.camera.position.copy(position);
        this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    }

    reset() {
        this.yaw = 0;
        this.pitch = 0;
    }
}
