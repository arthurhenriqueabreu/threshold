import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Shader retro do portal: UV quantizado (grade ~96x96), ruído grosseiro com
// poucas oitavas, palette limitada, banding e dithering ordenado. Anima em
// passos discretos de tempo para lembrar hardware limitado.
const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uNoiseScale;
uniform float uGrid;
varying vec2 vUv;
varying vec3 vNormal;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Quantiza a UV em uma grade pixelada de uGrid células (sem depender da
// resolução da tela — robusto em qualquer contexto).
vec2 quantUV(vec2 uv) {
    vec2 g = max(vec2(1.0), floor(uGrid));
    return (floor(uv * g) / g);
}

// Dithering Bayer 4x4 simples, estável espacialmente (sem índice dinâmico de
// array, para compatibilidade com GLSL ES 1.00 / WebGL1).
float bayer(vec2 p) {
    int idx = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
    float t = 0.5;
    if (idx == 0) t = 0.0;
    else if (idx == 1) t = 8.0;
    else if (idx == 2) t = 2.0;
    else if (idx == 3) t = 10.0;
    else if (idx == 4) t = 12.0;
    else if (idx == 5) t = 4.0;
    else if (idx == 6) t = 14.0;
    else if (idx == 7) t = 6.0;
    else if (idx == 8) t = 3.0;
    else if (idx == 9) t = 11.0;
    else if (idx == 10) t = 1.0;
    else if (idx == 11) t = 9.0;
    else if (idx == 12) t = 15.0;
    else if (idx == 13) t = 7.0;
    else if (idx == 14) t = 13.0;
    else if (idx == 15) t = 5.0;
    return t / 15.0;
}

void main() {
    // passo temporal discreto para a animação
    float t = floor(uTime * 6.0) / 6.0;

    vec2 uv = quantUV(vUv) - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    float n = noise(vUv * uNoiseScale + t * 0.12);
    float swirl = sin(angle * 3.0 - t * 1.2 + n * 2.0) * 0.5 + 0.5;
    float core = smoothstep(0.55, 0.05, dist);
    float edge = smoothstep(0.5, 0.42, dist);

    float alpha = (core * (0.6 + swirl * 0.35)) * uIntensity * (1.0 - edge * 0.8);
    vec3 color = uColor;
    color = mix(color, vec3(1.0, 0.9, 0.6), swirl * 0.5);

    // banding: reduz profundidade de cor (aprox. 4 bits)
    color = floor(color * 15.0) / 15.0;

    // dithering ordenado sutil
    float th = bayer(gl_FragCoord.xy);
    color += (th - 0.5) * 0.05 * uIntensity;

    float vignette = 1.0 - dist * 1.2;
    gl_FragColor = vec4(color * vignette, clamp(alpha * vignette, 0.0, 1.0));
}
`;

export class Portal {
    constructor(position, rotationY) {
        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.group.rotation.y = rotationY;

        this.uniforms = {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(0x2a251a) },
            uIntensity: { value: 0.35 },
            uNoiseScale: { value: 4.0 },
            uGrid: { value: CONFIG.retro.portalPixelGrid }
        };

        const geometry = new THREE.CircleGeometry(1.4, 22);
        this.surface = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        }));
        this.surface.position.y = 1.6;
        this.surface.renderOrder = 1;

        const frameGeometry = new THREE.TorusGeometry(1.45, 0.07, 6, 22);
        this.frame = new THREE.Mesh(frameGeometry, new THREE.MeshLambertMaterial({
            color: 0x3a3528,
            emissive: 0x14100c
        }));
        this.frame.position.y = 1.6;

        const innerFrameGeo = new THREE.TorusGeometry(1.3, 0.035, 5, 16);
        const innerFrameMat = new THREE.MeshBasicMaterial({
            color: 0xffb84d
        });
        this.innerFrame = new THREE.Mesh(innerFrameGeo, innerFrameMat);
        this.innerFrame.position.y = 1.6;

        this.light = new THREE.PointLight(0x332211, 0, 10);
        this.light.position.y = 1.6;
        this.light.decay = 1.5;

        this.particles = this.createParticles();

        this.group.add(this.surface, this.frame, this.innerFrame, this.light, this.particles);
        this.unlocked = false;
        this.unlockProgress = 0;
    }

    createParticles() {
        const count = 64;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const alphas = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.3 + Math.random() * 1.1;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = 0.5 + Math.random() * 2.2;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            sizes[i] = 0.05 + Math.random() * 0.05;
            alphas[i] = 0.3 + Math.random() * 0.7;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffcc66,
            size: 0.05,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(geometry, material);
    }

    destroy() {
        this.surface.geometry.dispose();
        this.surface.material.dispose();
        this.frame.geometry.dispose();
        this.frame.material.dispose();
        this.innerFrame.geometry.dispose();
        this.innerFrame.material.dispose();
        this.particles.geometry.dispose();
        this.particles.material.dispose();
        this.light.dispose();
    }

    unlock() {
        if (this.unlocked) return;
        this.unlocked = true;
        this.unlockProgress = 0;
    }

    update(delta, time, cameraPosition) {
        this.uniforms.uTime.value = time;

        this.particles.rotation.y += delta * 0.08;
        this.particles.position.y = Math.sin(time * 0.5) * 0.05;

        const positions = this.particles.geometry.attributes.position.array;
        const alphas = this.particles.geometry.attributes.alpha.array;

        for (let i = 0; i < alphas.length; i++) {
            positions[i * 3 + 1] += delta * 0.15;
            if (positions[i * 3 + 1] > 2.7) {
                positions[i * 3 + 1] = 0.5;
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.3 + Math.random() * 1.1;
                positions[i * 3] = Math.cos(angle) * radius;
                positions[i * 3 + 2] = Math.sin(angle) * radius;
            }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;

        if (this.unlocked) {
            this.unlockProgress = Math.min(1, this.unlockProgress + delta * 0.6);
            const p = this.unlockProgress;

            this.uniforms.uColor.value.setHSL(0.12, 0.8, 0.25 + p * 0.35);
            this.uniforms.uIntensity.value = 0.35 + p * 1.4;
            this.uniforms.uNoiseScale.value = 4.0 + p * 6.0;
            this.light.intensity = p * 4.0;
            this.light.color.setHSL(0.12, 0.9, 0.4 + p * 0.3);
            this.light.decay = 1.5 - p * 0.5;

            this.innerFrame.scale.setScalar(1.0 + Math.sin(time * 3) * 0.02 * p);

            this.particles.material.color.setHSL(0.1, 0.9, 0.6);
            this.particles.material.opacity = 0.4 + p * 0.6;
        } else {
            this.frame.rotation.z += delta * 0.03;
            this.innerFrame.rotation.z += delta * 0.01;
        }

        const dx = this.group.position.x - cameraPosition.x;
        const dz = this.group.position.z - cameraPosition.z;
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        return horizontalDistance < 1.3 && this.unlocked;
    }

    get position() {
        return this.group.position;
    }
}