import * as THREE from 'three';

export class Flashlight {
    constructor(camera) {
        this.camera = camera;
        this.on = false;

        this.target = new THREE.Object3D();
        this.target.position.set(0, 0, -4);

        this.light = new THREE.SpotLight(0xffe9b0, 0, 40, 0.62, 0.35, 1.4);
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
        this.light.intensity = this.on ? 38 : 0;
        this._attachCurrent();
        return this.on;
    }

    // XR: spotlight segue o controller direito (-Z). Desktop: câmera.
    setXRController(controller) {
        this.xrController = controller || null;
        if (this.on) this._attachCurrent();
    }

    _attachCurrent() {
        const host = this.xrController ?? this.camera;
        if (!host) return;
        if (this.on) {
            if (this.group.parent !== host) {
                this.group.parent?.remove(this.group);
                host.add(this.group);
            }
            const isXR = host === this.xrController;
            // Camera.position já está na altura dos olhos. No controle, o
            // pose local é a própria mão; manter Y=1.55 colocava o facho
            // muito acima do Quest controller e fazia a luz parecer deslocada.
            this.light.position.set(0, isXR ? -0.03 : 0, isXR ? -0.04 : 0);
            this.target.position.set(0, 0, -4);
        } else {
            this.group.parent?.remove(this.group);
        }
    }

    isOn() {
        return this.on;
    }

    update(delta, time) {
        if (!this.on) return;
        const base = 38;
        // flicker forte ocasional
        if (this.flickerTimer > 0) {
            this.flickerTimer -= delta;
            this.light.intensity = base * (0.35 + Math.random() * 0.65);
            this.light.distance = 28 + Math.random() * 12;
            this.light.angle = 0.62 + (Math.random() - 0.5) * 0.08;
            return;
        }
        if (Math.random() < 0.006) {
            this.flickerTimer = 0.10 + Math.random() * 0.18;
            return;
        }
        // dinâmica suave: respiração + leve sway da mão
        const breath = Math.sin(time * 0.9) * 1.6 + Math.sin(time * 2.2) * 0.7;
        const sway = Math.sin(time * 1.4) * 0.03;
        const bob = Math.cos(time * 1.1) * 0.015;
        this.light.intensity = base + breath;
        this.light.distance = 40 + Math.sin(time * 0.55) * 3.2 + Math.sin(time * 1.7) * 1.0;
        this.light.angle = 0.60 + Math.sin(time * 0.68) * 0.035;
        this.light.penumbra = 0.35 + Math.sin(time * 1.2) * 0.04;
        // leve balanço da posição para não ficar estático. A pose base é
        // local ao host: câmera (desktop) ou controle direito (XR).
        const isXR = this.xrController && this.group.parent === this.xrController;
        this.light.position.set(sway, (isXR ? -0.03 : 0) + bob, isXR ? -0.04 : 0);
        this.target.position.set(sway * 0.5, bob * 0.3, -4);
    }

    dispose() {
        this.group.parent?.remove(this.group);
        this.xrController = null;
        if (this.light) {
            this.light.dispose();
        }
    }
}
