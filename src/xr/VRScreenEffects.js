import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

// Overlay stereo-safe preso à câmera: 1 shader cobre proximity,
// comfort vignette, game-over static e fades. Sem DOM, sem postprocess mono,
// idêntico nos dois olhos (head-locked, sem paralaxe por olho).
//
// Versão XR-safe: hierarquia de proximidade suave (vignette → grain leve →
// static moderada), sem glitch bars contínuas, sem scanline viajando rápido,
// sem offset horizontal, sem flashes. Comfort mitigation — desktop intacto.
const VERT = /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */`
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uProximity; // 0..1 (curva XR já aplicada no JS)
uniform float uStatic;    // 0..1 (game over / captura — curta)
uniform float uFade;      // 0..1 (preto)
uniform float uComfortVignette; // 0..1 (locomoção — só periferia)
uniform float uChase;     // 0..1 (bônus de chase p/ vignette)
uniform float uEffectsScale; // 0..1 (efeitos reduzidos / qualidade adaptativa)

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
    float prox = clamp(uProximity, 0.0, 1.0) * clamp(uEffectsScale, 0.0, 1.0);
    float stat = clamp(uStatic, 0.0, 1.0);
    float vigAmt = clamp(uComfortVignette + uChase * 0.25, 0.0, 1.0);

    vec2 c = vUv - 0.5;
    float r = length(c);
    // Vignette de conforto: escurece SÓ a periferia, nunca o centro.
    // Não altera FOV real da câmera WebXR.
    float vigMask = smoothstep(0.18, 0.62, r);
    float vigAlpha = vigAmt * vigMask;

    // Grain temporal pouco móvel: deriva lenta, sem frenesi.
    float n = noise(vUv * vec2(160.0, 110.0) + vec2(uTime * 1.1, -uTime * 0.9));
    float n2 = noise(vUv * vec2(48.0, 70.0) - vec2(uTime * 0.7, uTime * 0.5));
    float grain = (n * 0.65 + n2 * 0.35);

    // Proximidade hierárquica: t baixo = só vignette + contraste mínimo;
    // grain cresce devagar; glitch bars SÓ em t muito alto e raras.
    float grainAmt = smoothstep(0.25, 0.9, prox);
    float scan = 0.5 + 0.5 * sin(vUv.y * 320.0 + uTime * 1.2);
    scan = mix(1.0, scan, 0.12 * prox);
    float barGate = step(0.995 - prox * 0.004, hash(vec2(floor(vUv.y * 40.0), floor(uTime * 2.0))));
    float barShift = barGate * step(0.75, prox) * 0.015 * prox;
    float nBar = noise((vUv + vec2(barShift, 0.0)) * vec2(160.0, 110.0));
    float lum = mix(grain, nBar, barGate * step(0.75, prox) * 0.5) * scan;

    float proxAlpha = prox * grainAmt * (0.06 + 0.30 * lum);
    // Static de captura: forte mas curta (JS limita a ~0.35–0.75s → fade).
    float statAlpha = stat * (0.25 + 0.45 * grain);

    float alpha = clamp(vigAlpha * 0.85 + proxAlpha + statAlpha, 0.0, 0.75);
    if (alpha < 0.002 && uFade < 0.002) discard;

    // Tom escuro quente: nunca flash branco fullscreen.
    vec3 col = vec3(0.05, 0.045, 0.04) + vec3(0.45, 0.44, 0.46) * lum * clamp(proxAlpha + statAlpha, 0.0, 1.0);
    col = mix(col, vec3(0.0), clamp(uFade, 0.0, 1.0));
    alpha = max(alpha, clamp(uFade, 0.0, 1.0));

    gl_FragColor = vec4(col, alpha);
}
`;

export class VRScreenEffects {
    constructor(camera) {
        this.camera = camera ?? null;
        this.proximity = 0;
        this.proximityTarget = 0;
        this.staticLevel = 0;
        this.staticTarget = 0;
        this.fade = 0;
        // Comfort vignette dinâmica (0 parado → sprint). Transição suave.
        this.comfortVignette = 0;
        this.comfortVignetteTarget = 0;
        this.comfortVignetteStrength = 0.45;
        this.comfortVignetteEnabled = true;
        this.chaseBoost = 0;
        this.chaseBoostTarget = 0;
        this.effectsScale = 1;
        this._snapPulse = 0;
        this._fadeAnim = null;
        this.mesh = null;
        this.material = null;
        if (camera) this.attach(camera);
    }

    attach(camera) {
        this.camera = camera;
        if (this.mesh) return this.mesh;
        const geo = new THREE.SphereGeometry(0.55, 24, 16);
        this.material = new THREE.ShaderMaterial({
            vertexShader: VERT,
            fragmentShader: FRAG,
            uniforms: {
                uTime: { value: 0 },
                uProximity: { value: 0 },
                uStatic: { value: 0 },
                uFade: { value: 0 },
                uComfortVignette: { value: 0 },
                uChase: { value: 0 },
                uEffectsScale: { value: 1 }
            },
            side: THREE.BackSide,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            fog: false
        });
        const mesh = new THREE.Mesh(geo, this.material);
        mesh.renderOrder = 9998;
        mesh.frustumCulled = false;
        mesh.visible = false;
        mesh.name = 'VRScreenEffects';
        camera.add(mesh);
        this.mesh = mesh;
        return mesh;
    }

    // Mesmo t do áudio/entidade, mas com curva XR distinta: evita efeito
    // cedo demais (visualXR = pow(t,1.5) * profileStrength).
    setProximityIntensity(t, visualStrength = null) {
        const strength = visualStrength
            ?? CONFIG.xr?.comfortProfiles?.[this._profileName]?.proximityVisualStrength
            ?? CONFIG.xr?.proximityEffectStrength
            ?? 0.65;
        const clamped = Math.max(0, Math.min(1, t));
        this.proximityTarget = Math.pow(clamped, 1.5) * strength;
    }

    setStaticIntensity(v) {
        this.staticTarget = Math.max(0, Math.min(1, v));
    }

    // Vignette dirigida pela VELOCIDADE REAL (currentVelocity.length),
    // não por "grip pressed": stick parcial → pouca vignette.
    setLocomotionVignette(normalizedSpeed, strength = null, enabled = null) {
        if (strength !== null && strength !== undefined) this.comfortVignetteStrength = strength;
        if (enabled !== null && enabled !== undefined) this.comfortVignetteEnabled = enabled;
        const s = Math.max(0, Math.min(1, normalizedSpeed ?? 0));
        this.comfortVignetteTarget = this.comfortVignetteEnabled ? s * s * this.comfortVignetteStrength : 0;
    }

    setChaseBoost(on) {
        this.chaseBoostTarget = on ? 1 : 0;
    }

    // Pulso curtíssimo opcional no snap turn.
    pulseSnapTurn() {
        this._snapPulse = Math.min(1, this._snapPulse + 0.35);
    }

    setEffectsScale(v) {
        this.effectsScale = Math.max(0, Math.min(1, v ?? 1));
    }

    applyComfortProfile(profile, name = '') {
        this._profileName = name;
        this.comfortVignetteStrength = profile?.vignetteStrength ?? 0.45;
        this.comfortVignetteEnabled = profile?.vignette ?? true;
        if (!this.comfortVignetteEnabled) this.comfortVignetteTarget = 0;
    }

    stopAll() {
        this.proximityTarget = 0;
        this.proximity = 0;
        this.staticTarget = 0;
        this.staticLevel = 0;
        this.comfortVignetteTarget = 0;
        this.comfortVignette = 0;
        this.chaseBoostTarget = 0;
        this.chaseBoost = 0;
        this._snapPulse = 0;
        this._syncUniforms(0);
        this._updateVisibility();
    }

    fadeTo(targetOpacity, durationMs = 700) {
        const target = Math.max(0, Math.min(1, targetOpacity));
        if (this._fadeAnim) cancelAnimationFrame(this._fadeAnim);
        const start = this.fade;
        if (durationMs <= 0) {
            this.fade = target;
            this._syncUniforms(performance.now() / 1000);
            this._updateVisibility();
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const t0 = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - t0) / durationMs);
                this.fade = start + (target - start) * t;
                this._syncUniforms(now / 1000);
                this._updateVisibility();
                if (t < 1) {
                    this._fadeAnim = requestAnimationFrame(step);
                } else {
                    this._fadeAnim = null;
                    resolve();
                }
            };
            this._fadeAnim = requestAnimationFrame(step);
        });
    }

    update(time, delta = 0.016) {
        // Lerp suave p/ aparecer/desaparecer sem salto.
        const k = delta > 0 ? Math.min(1, delta * 6) : 0.1;
        this.proximity += (this.proximityTarget - this.proximity) * k;
        this.staticLevel += (this.staticTarget - this.staticLevel) * Math.min(1, (delta || 0.016) * 5);
        const kv = delta > 0 ? Math.min(1, delta * 4.5) : 0.08;
        this.comfortVignette += (this.comfortVignetteTarget - this.comfortVignette) * kv;
        this.chaseBoost += (this.chaseBoostTarget - this.chaseBoost) * Math.min(1, (delta || 0.016) * 3);
        this._snapPulse = Math.max(0, this._snapPulse - (delta || 0.016) * 3.5);
        if (Math.abs(this.proximityTarget - this.proximity) < 0.001) this.proximity = this.proximityTarget;
        if (Math.abs(this.comfortVignetteTarget - this.comfortVignette) < 0.001) this.comfortVignette = this.comfortVignetteTarget;
        this._syncUniforms(time);
        this._updateVisibility();
    }

    _syncUniforms(time) {
        if (!this.material) return;
        this.material.uniforms.uTime.value = time ?? 0;
        this.material.uniforms.uProximity.value = this.proximity;
        this.material.uniforms.uStatic.value = this.staticLevel;
        this.material.uniforms.uFade.value = this.fade;
        this.material.uniforms.uComfortVignette.value = Math.min(1, this.comfortVignette + this._snapPulse * 0.15);
        this.material.uniforms.uChase.value = this.chaseBoost;
        this.material.uniforms.uEffectsScale.value = this.effectsScale;
    }

    _updateVisibility() {
        if (!this.mesh) return;
        this.mesh.visible = this.proximity > 0.002 || this.staticLevel > 0.002 || this.fade > 0.002
            || this.comfortVignette > 0.002 || this._snapPulse > 0.002 || this.chaseBoost > 0.002;
    }

    dispose() {
        if (this._fadeAnim) cancelAnimationFrame(this._fadeAnim);
        if (this.mesh?.parent) this.mesh.parent.remove(this.mesh);
        this.mesh?.geometry?.dispose?.();
        this.material?.dispose?.();
        this.mesh = null;
        this.material = null;
    }
}
