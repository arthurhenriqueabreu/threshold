import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export class FlickeringLight {
    constructor(light, intensityMult = 1.0) {
        this.light = light;
        this.baseIntensity = light.intensity;
        this.intensityMult = intensityMult;
        // Comfort mitigation: escala XR (profile.flickerScale) aplicada só
        // quando a sessão immersive-vr está ativa. Desktop continua igual.
        this.xrScale = 1;
        this.xrActive = false;
        this.nextFlicker = this.randomInterval();
        this.flickerTimer = 0;
        this.active = false;
        this.flickerDuration = 0;
        this.forcedFlicker = false;
        this.forcedTimer = 0;
    }

    setXRScale(scale, active) {
        this.xrScale = scale ?? 1;
        this.xrActive = !!active;
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

    // Envelope suave de "falha de fluorescente": normal → queda →
    // breve recuperação → queda menor → normal. Sem alternância
    // 100%/5%/90% em frames sucessivos (evita estímulo frenético em XR).
    _envelope(t) {
        // t: 0..1 ao longo do flicker forçado
        const dip1 = 1 - 0.75 * this._smoothPulse(t, 0.08, 0.30);
        const recover = 1 - 0.25 * this._smoothPulse(t, 0.42, 0.58);
        const dip2 = 1 - 0.45 * this._smoothPulse(t, 0.62, 0.85);
        return Math.max(0.12, dip1 * recover * dip2);
    }

    _smoothPulse(t, a, b) {
        // Pulso suave 0→1→0 centrado em [a,b] (smoothstep nas bordas).
        if (t <= a || t >= b) return 0;
        const x = (t - a) / (b - a);
        return Math.sin(x * Math.PI);
    }

    update(delta) {
        this.flickerTimer += delta;
        const scale = this.xrActive ? this.xrScale : 1;

        if (this.forcedFlicker) {
            this.forcedTimer -= delta;
            this.elapsed += delta;
            const total = Math.max(0.001, this.flickerDuration);
            const t = Math.min(1, this.elapsed / total);
            const env = this._envelope(t);
            // Em XR o jitter residual é quase nulo; no desktop mantém textura.
            const jitterAmp = this.xrActive ? 0.06 * scale : 0.25;
            const jitter = 1 + (Math.random() - 0.5) * 2 * jitterAmp;
            this.light.intensity = this.baseIntensity * env * jitter;
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
            if (this.xrActive) {
                // XR: pulsos mais lentos — falha de fluorescente natural.
                // effectiveFlicker = base * scale (comfort 0.45 / standard
                // 0.65 / intense 1.0); a profundidade da queda é atenuada.
                const total = Math.max(0.001, this.flickerDuration);
                const t = Math.min(1, this.elapsed / total);
                const env = this._envelope(t);
                this.light.intensity = this.baseIntensity * (1 - (1 - env) * scale);
            } else if (Math.random() > 0.5) {
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
        this.baseAmbientIntensity = CONFIG.atmosphere.ambientIntensity;
        this.baseHemisphereIntensity = 0.85;
    }

    setup(lightData, flickerIndices = [], flickerIntensity = 1.0) {
        // Difícil não escurece mais — só fog, luz igual ao normal para ficar jogável
        const ambientIntensity = this.baseAmbientIntensity;
        const hemiIntensity = this.baseHemisphereIntensity;
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

    // Comfort mitigation: aplica flickerScale do profile ativo quando em XR.
    // Chamado pelo Game a cada troca de profile/session (tempo real, sem restart).
    setXRComfort(flickerScale, xrActive) {
        for (const flickering of this.flickeringLights) {
            flickering.setXRScale(flickerScale ?? 1, xrActive);
        }
    }

    setXRVisualMode(mode, xrActive) {
        const presetName = mode === 'bright' ? 'bright' : 'ps1';
        const preset = CONFIG.xr?.lightingPresets?.[presetName] ?? { ambientScale: 1, hemisphereScale: 1 };
        const ambientScale = xrActive ? (preset.ambientScale ?? 1) : 1;
        const hemisphereScale = xrActive ? (preset.hemisphereScale ?? 1) : 1;
        if (this.ambient) this.ambient.intensity = this.baseAmbientIntensity * ambientScale;
        if (this.hemisphere) this.hemisphere.intensity = this.baseHemisphereIntensity * hemisphereScale;
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