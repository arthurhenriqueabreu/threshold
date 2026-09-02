import { CONFIG } from '../core/Config.js';

export class PlayerController {
    constructor(inputManager, camera) {
        this.input = inputManager;
        this.camera = camera;
        this.yaw = 0;
        this.pitch = 0;
        this._dragging = false;
        this._lastX = 0;
        this._lastY = 0;
        this._onMouseMove = (e) => this.onMouseMove(e);
        this._onMouseDown = (e) => this.onMouseDown(e);
        this._onMouseUp = () => this.onMouseUp();
        document.addEventListener('mousemove', this._onMouseMove);
        // Fallback: permite arrastar camera sem pointer lock (caso lock falhe)
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup', this._onMouseUp);
    }

    onMouseDown(event) {
        // Apenas inicia drag se não estiver com pointer lock (fallback)
        if (document.pointerLockElement !== null) return;
        if (event.button !== 0) return;
        this._dragging = true;
        this._lastX = event.clientX;
        this._lastY = event.clientY;
    }

    onMouseUp() {
        this._dragging = false;
    }

    onMouseMove(event) {
        const isLocked = document.pointerLockElement !== null;
        let dx = 0;
        let dy = 0;
        if (isLocked) {
            dx = event.movementX ?? event.mozMovementX ?? 0;
            dy = event.movementY ?? event.mozMovementY ?? 0;
            // Alguns browsers retornam 0 quando não há movimento real
            if (dx === 0 && dy === 0) return;
        } else {
            // Fallback: só move se estiver arrastando com botão pressionado
            if (!this._dragging) return;
            // Se event.buttons indica que não está pressionado, ignora
            if (event.buttons !== undefined && event.buttons === 0) return;
            dx = event.clientX - this._lastX;
            dy = event.clientY - this._lastY;
            this._lastX = event.clientX;
            this._lastY = event.clientY;
            // Fallback precisa ser usável: mesma sensibilidade efetiva do lock
            dx *= 0.9;
            dy *= 0.9;
            if (dx === 0 && dy === 0) return;
        }
        this.yaw -= dx * CONFIG.player.mouseSensitivity;
        this.pitch -= dy * CONFIG.player.mouseSensitivity;
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

    dispose() {
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup', this._onMouseUp);
    }
}
