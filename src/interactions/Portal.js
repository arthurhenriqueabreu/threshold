import * as THREE from 'three';

const VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
    vUv = uv;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uNoiseScale;
varying vec2 vUv;
varying vec3 vNormal;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    float n = fbm(vUv * uNoiseScale + uTime * 0.15);
    float swirl = sin(angle * 3.0 - uTime * 1.2 + n * 2.0) * 0.5 + 0.5;
    float ring = sin(dist * 28.0 - uTime * 4.0 + n) * 0.5 + 0.5;
    float core = smoothstep(0.55, 0.02, dist);
    float edge = smoothstep(0.5, 0.45, dist);

    float alpha = (core * (0.65 + ring * 0.35) + swirl * 0.25) * uIntensity * (1.0 - edge * 0.8);
    vec3 baseColor = uColor;
    vec3 accentColor = mix(uColor, vec3(1.0, 0.9, 0.6), swirl * 0.5);
    vec3 color = mix(baseColor, accentColor, core * swirl);

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
            uIntensity: { value: 0.08 },
            uNoiseScale: { value: 4.0 }
        };

        const geometry = new THREE.CircleGeometry(1.4, 64);
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

        const frameGeometry = new THREE.TorusGeometry(1.45, 0.07, 12, 64);
        this.frame = new THREE.Mesh(frameGeometry, new THREE.MeshStandardMaterial({
            color: 0x3a3528,
            metalness: 0.6,
            roughness: 0.4,
            emissive: 0x1a1510,
            emissiveIntensity: 0.3
        }));
        this.frame.position.y = 1.6;

        const innerFrameGeo = new THREE.TorusGeometry(1.3, 0.035, 8, 48);
        const innerFrameMat = new THREE.MeshStandardMaterial({
            color: 0xffb84d,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xcc8822,
            emissiveIntensity: 0
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
        const count = 150;
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
            sizes[i] = 0.03 + Math.random() * 0.06;
            alphas[i] = 0.3 + Math.random() * 0.7;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffcc66,
            size: 0.06,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            vertexColors: false
        });

        return new THREE.Points(geometry, material);
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
            this.uniforms.uIntensity.value = 0.08 + p * 1.5;
            this.uniforms.uNoiseScale.value = 4.0 + p * 6.0;
            this.light.intensity = p * 4.0;
            this.light.color.setHSL(0.12, 0.9, 0.4 + p * 0.3);
            this.light.decay = 1.5 - p * 0.5;

            this.innerFrame.material.emissiveIntensity = p * 2.5;
            this.innerFrame.material.emissive.setHSL(0.1, 0.9, 0.4);
            this.innerFrame.rotation.z += delta * (0.3 + p * 2.0);
            this.innerFrame.scale.setScalar(1.0 + Math.sin(time * 3) * 0.02 * p);

            this.frame.material.emissiveIntensity = p * 0.8;
            this.frame.material.emissive.setHSL(0.1, 0.8, 0.2);

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