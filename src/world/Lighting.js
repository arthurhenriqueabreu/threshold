import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export class FlickeringLight {
    constructor(light, intensityMult = 1.0) {
        this.light = light;
        this.baseIntensity = light.intensity;
        this.intensityMult = intensityMult;
        this.nextFlicker = this.randomInterval();
        this.flickerTimer = 0;
        this.active = false;
        this.flickerDuration = 0;
        this.forcedFlicker = false;
        this.forcedTimer = 0;
    }

    randomInterval() {
        return (6 + Math.random() * 14) / this.intensityMult;
    }

    triggerFlicker(duration = 1.5) {
        this.forcedFlicker = true;
        this.forcedTimer = duration;
        this.active = true;
        this.flickerDuration = duration;
        this.elapsed = 0;
    }

    update(delta) {
        this.flickerTimer += delta;

        if (this.forcedFlicker) {
            this.forcedTimer -= delta;
            this.elapsed += delta;
            if (Math.random() > 0.3) {
                this.light.intensity = this.baseIntensity * (0.05 + Math.random() * 0.9);
            }
            if (this.forcedTimer <= 0) {
                this.forcedFlicker = false;
                this.active = false;
                this.light.intensity = this.baseIntensity;
                this.flickerTimer = 0;
                this.nextFlicker = this.randomInterval();
            }
            return;
        }

        if (!this.active && this.flickerTimer >= this.nextFlicker) {
            this.active = true;
            this.flickerDuration = (0.3 + Math.random() * 0.7) * this.intensityMult;
            this.elapsed = 0;
        }

        if (this.active) {
            this.elapsed += delta;
            if (Math.random() > 0.5) {
                this.light.intensity = this.baseIntensity * (0.1 + Math.random() * 0.85);
            }
            if (this.elapsed >= this.flickerDuration) {
                this.active = false;
                this.light.intensity = this.baseIntensity;
                this.flickerTimer = 0;
                this.nextFlicker = this.randomInterval();
            }
        }
    }
}

export class Lighting {
    constructor(scene) {
        this.scene = scene;
        this.pointLights = [];
        this.flickeringLights = [];
        this.lightCellMap = new Map();
        this.ambient = null;
        this.hemisphere = null;
    }

    setup(lightData, flickerIndices = [], flickerIntensity = 1.0) {
        // Difícil não escurece mais — só fog, luz igual ao normal para ficar jogável
        const ambientIntensity = CONFIG.atmosphere.ambientIntensity;
        const hemiIntensity = 0.85;
        const ambient = new THREE.AmbientLight(0xfff2cc, ambientIntensity);
        const hemisphere = new THREE.HemisphereLight(0xfff4d6, 0x5a5238, hemiIntensity);
        this.scene.add(ambient, hemisphere);
        this.ambient = ambient;
        this.hemisphere = hemisphere;

        lightData.forEach(({ col, row, position }, index) => {
            const baseIntensity = 3.2;
            const distance = 26;
            const decay = 1.2;
            const light = new THREE.PointLight(0xffe9b0, baseIntensity, distance, decay);
            light.position.set(position.x, CONFIG.game.wallHeight - 0.4, position.z);
            this.scene.add(light);
            this.pointLights.push(light);

            const cellKey = `${col},${row}`;
            this.lightCellMap.set(cellKey, { light, flickering: null, col, row });

            if (flickerIndices.includes(index)) {
                const flickering = new FlickeringLight(light, flickerIntensity);
                this.flickeringLights.push(flickering);
                this.lightCellMap.get(cellKey).flickering = flickering;
            }
        });
    }

    triggerFlickerAt(col, row) {
        const key = `${col},${row}`;
        const entry = this.lightCellMap.get(key);
        if (entry?.flickering) {
            entry.flickering.triggerFlicker(0.8 + Math.random() * 1.2);
        }
    }

    setPowerRestored(boost) {
        for (const light of this.pointLights) {
            light.intensity = Math.min(light.intensity * boost, 5.0);
        }
        for (const flickering of this.flickeringLights) {
            flickering.baseIntensity *= boost;
        }
    }

    dispose() {
        for (const light of this.pointLights) {
            this.scene.remove(light);
        }
        if (this.ambient) this.scene.remove(this.ambient);
        if (this.hemisphere) this.scene.remove(this.hemisphere);
        this.pointLights = [];
        this.flickeringLights = [];
        this.lightCellMap.clear();
        this.ambient = null;
        this.hemisphere = null;
    }

    update(delta) {
        for (const flickering of this.flickeringLights) {
            flickering.update(delta);
        }
    }
}