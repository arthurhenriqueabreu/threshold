import * as THREE from 'three';

export class Flashlight {
    constructor(camera) {
        this.camera = camera;
        this.on = false;

        this.target = new THREE.Object3D();
        this.target.position.set(0, 0, -4);

        this.light = new THREE.SpotLight(0xffe9b0, 0, 26, 0.62, 0.35, 1.5);
        this.light.position.set(0, 1.55, 0);
        this.light.castShadow = false;
        this.light.target = this.target;

        this.group = new THREE.Group();
        this.group.add(this.light);
        this.group.add(this.target);

        this.flickerTimer = 0;
    }

    toggle() {
        this.on = !this.on;
        this.light.intensity = this.on ? 0 : 0;
        if (this.on) {
            this.camera.add(this.group);
        } else {
            this.camera.remove(this.group);
        }
        return this.on;
    }

    isOn() {
        return this.on;
    }

    update(delta, time) {
        if (!this.on) return;
        const base = 26;
        if (this.flickerTimer > 0) {
            this.flickerTimer -= delta;
            this.light.intensity = base * (0.4 + Math.random() * 0.6);
        } else if (Math.random() < 0.008) {
            this.flickerTimer = 0.12 + Math.random() * 0.2;
        } else {
            this.light.intensity = base;
        }
        this.light.position.set(0, 1.55, 0);
    }

    dispose() {
        this.camera.remove(this.group);
        if (this.light) {
            this.light.dispose();
        }
    }
}