import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { eventBus } from '../core/EventBus.js';
import { configureRetroMaterial } from '../rendering/RetroMaterial.js';

let cachedHudFbx = null;
let hudLoadPromise = null;

export class NokiaPhone {
    constructor({ input, gameState, audio, camera, scene } = {}) {
        this.input = input;
        this.gameState = gameState;
        this.audio = audio;
        this.camera = camera || null;
        this.scene = scene || null;
        this.root = document.getElementById('nokia-phone');
        this.display = document.getElementById('message-display');
        this.clockEl = document.getElementById('clock-display');
        this.zonePrev = document.getElementById('zone-prev');
        this.zoneNext = document.getElementById('zone-next');
        this.btnPrev = document.getElementById('btn-nokia-prev');
        this.btnNext = document.getElementById('btn-nokia-next');
        this.btnSelect = document.getElementById('btn-nokia-select');

        this.isOpen = false;
        this.enabled = false;
        this.currentIndex = 0;
        this.pages = [];
        this.objectives = [];
        this.messages = [];
        this.clockTimer = null;

        // 3D HUD
        this.hudGroup = new THREE.Group();
        this.hudGroup.visible = false;
        this.hudFbx = null;
        this.screenMesh = null;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 384;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d');
        this.screenTexture = new THREE.CanvasTexture(this.canvas);
        this.screenTexture.colorSpace = THREE.SRGBColorSpace;
        this.screenTexture.magFilter = THREE.NearestFilter;
        this.screenTexture.minFilter = THREE.NearestFilter;
        this.screenTexture.generateMipmaps = false;
        this.createScreenMesh();

        this.bindEvents();
        this.subscribe();
        this.updateClock();
        this.clockTimer = setInterval(() => this.updateClock(), 60000);
        this.rebuildPages();
        this.render();
        // pre-load modelo para abrir instantâneo
        this.preloadHudModel();
    }

    createScreenMesh() {
        // Plano da tela - mapeado em cima do modelo FBX
        // Tamanho calibrado para Nokia 3310: 0.088 x 0.062 após escala target 0.42 HUD
        const geo = new THREE.PlaneGeometry(0.088, 0.062);
        const mat = new THREE.MeshBasicMaterial({
            map: this.screenTexture,
            transparent: false
        });
        this.screenMesh = new THREE.Mesh(geo, mat);
        // Render order alto para não ser oculto pelo corpo
        this.screenMesh.renderOrder = 10;
        mat.depthTest = true;
        mat.depthWrite = false;
        // Leve emissivo via cor do canvas já basta
        this.screenMesh.frustumCulled = false;
    }

    preloadHudModel() {
        if (!this.camera) return;
        this.loadHudModel().catch(()=>{});
    }

    loadHudModel() {
        if (cachedHudFbx) {
            return Promise.resolve(this.cloneHudFbx(cachedHudFbx));
        }
        if (hudLoadPromise) return hudLoadPromise.then(fbx => this.cloneHudFbx(fbx));
        const loader = new FBXLoader();
        hudLoadPromise = new Promise((resolve, reject) => {
            loader.load('/models/nokia/Nokia.fbx', (fbx) => {
                // aplica textura base com precisão Nearest
                const texLoader = new THREE.TextureLoader();
                texLoader.load('/models/nokia/nokia-3310.jpg', (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.magFilter = THREE.NearestFilter;
                    tex.minFilter = THREE.NearestFilter;
                    tex.generateMipmaps = false;
                    // anisotropia baixa para pixelado
                    fbx.traverse(c => {
                        if (c.isMesh) {
                            // mapeia textura difusa com alta precisão
                            if (c.material) {
                                const mats = Array.isArray(c.material) ? c.material : [c.material];
                                mats.forEach(m => {
                                    if (m.map !== tex) {
                                        m.map = tex;
                                        m.needsUpdate = true;
                                    }
                                    m.magFilter = THREE.NearestFilter;
                                    m.minFilter = THREE.NearestFilter;
                                    configureRetroMaterial(m, null, { snapping: false, affine: true, flat: true });
                                });
                            }
                        }
                    });
                    cachedHudFbx = fbx;
                    resolve(fbx);
                }, undefined, () => {
                    fbx.traverse(c => { if (c.isMesh) configureRetroMaterial(c.material, null, { snapping: false }); });
                    cachedHudFbx = fbx;
                    resolve(fbx);
                });
            }, undefined, reject);
        });
        return hudLoadPromise.then(fbx => this.cloneHudFbx(fbx));
    }

    cloneHudFbx(src) {
        const clone = src.clone(true);
        // re-scale para HUD na mão: maior que pickup (0.20) => 0.42 para leitura
        const box = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3(); box.getSize(size);
        const center = new THREE.Vector3(); box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 0.42;
        const s = maxDim > 0.01 ? targetSize / maxDim : 1;
        // centraliza e corrige orientação (FBX Z-up)
        clone.scale.setScalar(s);
        clone.position.set(-center.x * s, -center.y * s, -center.z * s);
        clone.rotation.set(Math.PI / 2, 0, Math.PI);
        clone.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; }});
        return clone;
    }

    subscribe() {
        eventBus.on('hud:updateObjectives', (objectives) => {
            this.objectives = objectives || [];
            this.rebuildPages();
            this.render();
        });
        eventBus.on('inventory:changed', () => {
            this.rebuildPages();
            this.render();
        });
        eventBus.on('portal:unlocked', () => { this.rebuildPages(); this.render(); });
        eventBus.on('door:opened', () => { this.rebuildPages(); this.render(); });
    }

    bindEvents() {
        this.zonePrev?.addEventListener('click', (e) => { e.stopPropagation(); this.navigate(-1); });
        this.zoneNext?.addEventListener('click', (e) => { e.stopPropagation(); this.navigate(1); });
        this.btnPrev?.addEventListener('click', (e) => { e.stopPropagation(); this.navigate(-1); });
        this.btnNext?.addEventListener('click', (e) => { e.stopPropagation(); this.navigate(1); });
        this.btnSelect?.addEventListener('click', (e) => { e.stopPropagation(); this.audio?.sfx?.('ui'); });
        this.root?.addEventListener('click', (e) => {
            if (e.target === this.root) return;
        });
        document.getElementById('nokia-lcd')?.addEventListener('wheel', (e) => {
            if (!this.isOpen) return;
            e.preventDefault();
            this.navigate(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
        if (!enabled) this.close();
    }

    canOpen() {
        return this.enabled;
    }

    async open() {
        if (!this.canOpen() || this.isOpen) return false;
        this.isOpen = true;
        // esconde overlay HTML antigo e mostra modelo 3D na mão
        this.root?.classList.add('hidden');
        if (this.camera) {
            try {
                if (!this.hudFbx) {
                    const fbx = await this.loadHudModel();
                    this.hudFbx = fbx;
                    // monta grupo HUD: modelo + tela
                    this.hudGroup.clear();
                    this.hudGroup.add(this.hudFbx);
                    // posiciona tela exatamente sobre o display do modelo
                    // offset calibrado empiricamente após escala 0.42 e rotação PI/2+Y PI
                    // tela fica na face superior, ligeiramente à frente para evitar z-fighting
                    this.screenMesh.position.set(0, 0.025, 0.018);
                    this.screenMesh.rotation.set(0, 0, 0);
                    // corrige para não herdar rotação duplicada: tela é filho do hudGroup, não do fbx
                    // então posicionamos relativo ao hudGroup
                    this.hudGroup.add(this.screenMesh);
                    // pose mão: em frente à câmera, levemente inclinado
                    this.hudGroup.position.set(0.28, -0.24, -0.46);
                    this.hudGroup.rotation.set(-0.18, 0.18, -0.06);
                    this.hudGroup.scale.set(1, 1, 1);
                }
                this.camera.add(this.hudGroup);
                this.hudGroup.visible = true;
            } catch (e) {
                console.warn('[NokiaPhone] falha HUD 3D, fallback HTML', e);
                this.root?.classList.remove('hidden');
            }
        } else {
            this.root?.classList.remove('hidden');
        }
        this.rebuildPages();
        this.currentIndex = 0;
        this.render();
        this.audio?.sfx?.('ui');
        return true;
    }

    close() {
        if (!this.isOpen) return false;
        this.isOpen = false;
        this.root?.classList.add('hidden');
        if (this.camera && this.hudGroup.parent === this.camera) {
            this.camera.remove(this.hudGroup);
        }
        this.hudGroup.visible = false;
        this.audio?.sfx?.('ui');
        return true;
    }

    toggle() {
        if (this.isOpen) return this.close();
        return this.open();
    }

    navigate(dir) {
        if (!this.isOpen || this.pages.length === 0) return;
        this.currentIndex = (this.currentIndex + dir + this.pages.length) % this.pages.length;
        this.render();
        this.audio?.sfx?.('ui');
    }

    addMessage(text) {
        if (!text) return;
        this.messages.unshift({ text, time: new Date() });
        if (this.messages.length > 12) this.messages.pop();
        this.rebuildPages();
        if (this.isOpen) this.render();
    }

    rebuildPages() {
        const pages = [];
        const total = this.objectives.length || 3;
        const done = this.objectives.filter(o => o.completed).length;
        pages.push(`OBJETIVOS\n${done}/${total} concluidos\n\n< usar >\npara navegar`);
        for (const obj of this.objectives) {
            const mark = obj.completed ? '[x]' : '[ ]';
            const title = (obj.title || obj.id).toUpperCase();
            const status = obj.completed ? 'CONCLUIDO' : 'PENDENTE';
            pages.push(`${mark} ${title}\n\n${status}`);
        }
        if (this.messages.length === 0) {
            pages.push(`SEM\nMENSAGENS\n\nAGUARDE\nTRANSMISSAO`);
        } else {
            for (const m of this.messages) {
                pages.push(`${m.text}`);
            }
        }
        pages.push(`DICA:\nQ FECHA\nF LANTERNA\n\nBOA SORTE`);
        this.pages = pages;
        if (this.currentIndex >= this.pages.length) this.currentIndex = this.pages.length - 1;
        if (this.currentIndex < 0) this.currentIndex = 0;
    }

    render() {
        // DOM fallback (mantém atualizado)
        if (this.display) {
            const text = this.pages[this.currentIndex] ?? '...';
            this.display.classList.remove('message-text');
            void this.display.offsetWidth;
            this.display.classList.add('message-text');
            this.display.innerHTML = text.replace(/\n/g, '<br>');
        }
        // Canvas 3D - textura de alta precisão na tela do modelo
        if (!this.ctx || !this.screenTexture) return;
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        // fundo LCD Nokia #62a333
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#62a333';
        ctx.fillRect(0, 0, W, H);
        // scanlines sutis
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);
        // vinheta interna
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, 'rgba(0,0,0,0.18)');
        grad.addColorStop(0.08, 'rgba(0,0,0,0)');
        grad.addColorStop(0.92, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        const pageText = this.pages[this.currentIndex] ?? '...';
        const lines = pageText.split('\n');
        ctx.fillStyle = '#0f1f0f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // título / corpo com fonte pixelada
        // usa VT323 se disponível, fallback monospace
        const title = lines[0] || '';
        const body = lines.slice(1);
        // header
        ctx.font = 'bold 26px VT323, monospace';
        ctx.fillText(title, W/2, 36);
        // linha divisória pontilhada
        ctx.fillStyle = '#0f1f0f';
        ctx.fillRect(18, 58, W-36, 2);
        // body
        ctx.font = '20px VT323, monospace';
        let y = 88;
        for (const line of body) {
            if (!line.trim()) { y += 14; continue; }
            // marca [x]/[ ] em destaque
            if (line.startsWith('[x]') || line.startsWith('[ ]')) {
                ctx.font = 'bold 20px VT323, monospace';
            } else {
                ctx.font = '20px VT323, monospace';
            }
            // uppercase já vem, mas garante
            ctx.fillText(line.toUpperCase(), W/2, y);
            y += 22;
        }
        // footer paginação
        ctx.fillStyle = 'rgba(15,31,15,0.65)';
        ctx.font = '12px VT323, monospace';
        ctx.fillText(`${this.currentIndex+1}/${this.pages.length}`, W/2, H-14);
        // relógio canto superior direito
        if (this.clockEl) {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#0f1f0f';
            ctx.font = '12px VT323, monospace';
            ctx.fillText(this.clockEl.textContent || '', W-12, 18);
            ctx.textAlign = 'center';
        }

        this.screenTexture.needsUpdate = true;
        if (this.screenMesh) this.screenMesh.material.needsUpdate = true;
    }

    updateClock() {
        if (!this.clockEl) return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        this.clockEl.textContent = `${hh}:${mm}`;
        if (this.isOpen) this.render();
    }

    // sway sutil na mão
    update(delta, time) {
        if (!this.isOpen || !this.hudGroup.visible) return;
        const swayX = Math.sin(time * 0.9) * 0.008;
        const swayY = Math.cos(time * 1.1) * 0.006;
        this.hudGroup.position.x = 0.28 + swayX;
        this.hudGroup.position.y = -0.24 + swayY;
        this.hudGroup.rotation.y = 0.18 + Math.sin(time * 0.7) * 0.02;
    }

    setCamera(camera, scene) {
        this.camera = camera;
        this.scene = scene;
    }

    dispose() {
        if (this.clockTimer) clearInterval(this.clockTimer);
        if (this.hudGroup.parent) this.hudGroup.parent.remove(this.hudGroup);
        this.screenTexture?.dispose?.();
        this.canvas = null;
    }
}
