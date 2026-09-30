import * as THREE from 'three';
import { Interactable } from './Interactable.js';
import { CONFIG } from '../core/Config.js';

export class PickupItem extends Interactable {
    constructor(mesh, { id, prompt }) {
        super(mesh);
        this.id = id;
        this.prompt = prompt;
        this.collected = false;
        this.isPickupItem = true;
        this.baseY = mesh.position.y;
        this.setupInteractionProxy();
        this.setupEffects();
    }

    setupInteractionProxy() {
        const root = this.meshes[0];
        if (!root) return;
        const radius = CONFIG.interaction?.pickupProxyRadius ?? 0.44;
        const geometry = new THREE.SphereGeometry(radius, 10, 8);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
            colorWrite: false
        });
        const proxy = new THREE.Mesh(geometry, material);
        proxy.name = 'pickup_hit_proxy';
        proxy.userData.pickupProxy = true;
        root.add(proxy);
        this.interactionProxy = proxy;
    }

    setupEffects() {
        const mesh = this.meshes[0];
        
        // glow maior mas agora com oclusão real (não atravessa parede)
        const glowGeo = new THREE.SphereGeometry(0.32, 16, 12);
        const glowMat = new THREE.MeshBasicMaterial({
            color: this.id === 'fuse' ? 0xffcc44 : 0x44aaff,
            transparent: true,
            opacity: 0.16,
            depthTest: true,
            depthWrite: false,
            side: THREE.FrontSide
        });
        this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
        // posição local no centro do objeto (não copia world pos)
        this.glowMesh.position.set(0, 0, 0);
        mesh.add(this.glowMesh);

        const particleCount = 20;
        const pGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 0.15 + Math.random() * 0.15;
            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = Math.random() * 0.3;
            positions[i * 3 + 2] = Math.sin(angle) * r;
            sizes[i] = 0.02 + Math.random() * 0.03;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const pMat = new THREE.PointsMaterial({
            color: this.id === 'fuse' ? 0xffdd88 : 0x88bbff,
            size: 0.07,
            transparent: true,
            opacity: 0.85,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        this.particles = new THREE.Points(pGeo, pMat);
        this.particlePositions = positions;
        this.particleSizes = sizes;
        mesh.add(this.particles);
    }

    update(delta, time) {
        if (this.collected || this.meshes.length === 0) return;
        const mesh = this.meshes[0];
        mesh.rotation.y += delta * 1.0;
        mesh.position.y = this.baseY + Math.sin(time * 1.8) * 0.06;

        if (this.glowMesh) {
            this.glowMesh.scale.setScalar(1.0 + Math.sin(time * 2.5) * 0.15);
            this.glowMesh.material.opacity = 0.1 + Math.sin(time * 3) * 0.05;
        }

        if (this.particles) {
            const positions = this.particlePositions;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += delta * 0.3;
                if (positions[i * 3 + 1] > 0.5) {
                    positions[i * 3 + 1] = 0;
                    const angle = Math.random() * Math.PI * 2;
                    const r = 0.15 + Math.random() * 0.15;
                    positions[i * 3] = Math.cos(angle) * r;
                    positions[i * 3 + 2] = Math.sin(angle) * r;
                }
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += delta * 0.5;
        }
    }

    canInteract() {
        return !this.collected && this.active;
    }

    getPrompt() {
        return this.prompt;
    }

    interact() {
        if (this.onPickup(this)) {
            this.collected = true;
            this.active = false;
            this.meshes[0].visible = false;
            this.meshes = [];
        }
    }
}