import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { configureRetroMaterial } from '../rendering/RetroMaterial.js';

export const EntityState = {
    IDLE_HIDDEN: 'IDLE_HIDDEN',
    OBSERVING: 'OBSERVING',
    DISAPPEARING: 'DISAPPEARING',
    STALKING: 'STALKING',
    CHASING: 'CHASING',
    SEARCHING: 'SEARCHING',
    COOLDOWN: 'COOLDOWN',
    VANISHING: 'VANISHING',
    GONE: 'GONE'
};

const ECFG = CONFIG.entities;

let cachedSlenderTemplate = null;
let slenderLoadPromise = null;
let cachedDiffuse = null;

function loadDiffuseTexture() {
    if (cachedDiffuse) return Promise.resolve(cachedDiffuse);
    return new Promise((resolve) => {
        new THREE.TextureLoader().load(
            '/models/slenderman/texture_diffuse.png',
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
                cachedDiffuse = tex;
                resolve(tex);
            },
            undefined,
            () => resolve(null)
        );
    });
}

// Cria modelo sólido 3D sem bones (teste: sem skinning para não enterrar)
// Se precisar reativar esqueleto, mude USE_BONES para true
const USE_BONES = false;

function rigSlenderman(obj, diffuse) {
    // Primeiro calcula bounds raw
    const tmpBox = new THREE.Box3().setFromObject(obj);
    const rawMin = tmpBox.min.clone();
    const rawMax = tmpBox.max.clone();
    const rawCenter = new THREE.Vector3();
    tmpBox.getCenter(rawCenter);
    const rawSize = new THREE.Vector3();
    tmpBox.getSize(rawSize);
    const targetHeight = ECFG.modelHeight || 2.15;
    const scale = rawSize.y > 0.01 ? targetHeight / rawSize.y : 1;
    const FOOT_MARGIN = 0.060;
    const offsetY = -rawMin.y + FOOT_MARGIN / scale;
    const offsetX = -rawCenter.x;
    const offsetZ = -rawCenter.z;

    if (!USE_BONES) {
        // Versão sólida: bake transform e Mesh normal, sem skeleton
        const staticMeshes = [];
        const allMeshes = [];
        obj.traverse((c) => { if (c.isMesh) allMeshes.push(c); });
        for (const mesh of allMeshes) {
            let geo = mesh.geometry;
            const posAttr = geo.attributes.position;
            const uvAttr = geo.attributes.uv;
            const bakedPos = new Float32Array(posAttr.count * 3);
            for (let i = 0; i < posAttr.count; i++) {
                bakedPos[i * 3] = (posAttr.getX(i) + offsetX) * scale;
                bakedPos[i * 3 + 1] = (posAttr.getY(i) + offsetY) * scale;
                bakedPos[i * 3 + 2] = (posAttr.getZ(i) + offsetZ) * scale;
            }
            const newGeo = new THREE.BufferGeometry();
            newGeo.setAttribute('position', new THREE.BufferAttribute(bakedPos, 3));
            if (uvAttr) newGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvAttr.array), uvAttr.itemSize));
            else newGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posAttr.count * 2), 2));
            if (geo.index) newGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(geo.index.array), 1));
            newGeo.computeVertexNormals();
            let mat = mesh.material;
            if (!mat || !mat.isMaterial || mat.name === 'place_holder') {
                mat = new THREE.MeshLambertMaterial({ map: diffuse || null, color: diffuse ? 0xffffff : 0x0d0b08 });
            } else {
                if (diffuse && mat.map !== diffuse) { mat.map = diffuse; mat.needsUpdate = true; }
                if (mat.isMeshStandardMaterial) {
                    mat = new THREE.MeshLambertMaterial({ map: mat.map || diffuse || null, color: mat.color || new THREE.Color(0xffffff) });
                }
            }
            configureRetroMaterial(mat, null, { snapping: false, affine: true, flat: true });
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = -1.0;
            mat.polygonOffsetUnits = -1.0;
            const staticMesh = new THREE.Mesh(newGeo, mat);
            staticMesh.frustumCulled = false;
            staticMeshes.push(staticMesh);
        }
        const wrapper = new THREE.Group();
        for (const sm of staticMeshes) wrapper.add(sm);
        wrapper.userData.visualRadius = Math.max(rawSize.x, rawSize.z) * 0.5 * scale;
        wrapper.userData.height = targetHeight;
        wrapper.userData.isStatic = true;
        return wrapper;
    }

    // --- modo com bones (desativado no teste) ---
    const bones = [];
    const boneMap = {};
    function mkBone(name, y, x = 0, z = 0, parent = null) {
        const b = new THREE.Bone();
        b.name = name;
        b.position.set(x, y, z);
        if (parent) parent.add(b);
        bones.push(b);
        boneMap[name] = b;
        return b;
    }
    const sH = targetHeight / 2.65;
    const hips = mkBone('hips', 1.32 * sH, 0, 0, null);
    const spineLow = mkBone('spineLow', 0.38 * sH, 0, 0, hips);
    const spineHigh = mkBone('spineHigh', 0.42 * sH, 0, 0, spineLow);
    const head = mkBone('head', 0.45 * sH, 0, 0, spineHigh);
    const legL = mkBone('legL', -0.62 * sH, -0.12 * sH, 0, hips);
    const legLLower = mkBone('legLLower', -0.62 * sH, 0, 0, legL);
    const legR = mkBone('legR', -0.62 * sH, 0.12 * sH, 0, hips);
    const legRLower = mkBone('legRLower', -0.62 * sH, 0, 0, legR);
    const armL = mkBone('armL', -0.10 * sH, -0.22 * sH, 0, spineHigh);
    const armLLower = mkBone('armLLower', -0.45 * sH, 0, 0, armL);
    const armR = mkBone('armR', -0.10 * sH, 0.22 * sH, 0, spineHigh);
    const armRLower = mkBone('armRLower', -0.45 * sH, 0, 0, armR);

    const skeleton = new THREE.Skeleton(bones);

    // Converte cada mesh para SkinnedMesh com pesos por posição Y/X final
    const skinnedMeshes = [];
    const allMeshes = [];
    obj.traverse((c) => { if (c.isMesh) allMeshes.push(c); });

    for (const mesh of allMeshes) {
        let geo = mesh.geometry;
        // Garante indexado e non-indexed para manipulação simples
        const posAttr = geo.attributes.position;
        const uvAttr = geo.attributes.uv;
        const normalAttr = geo.attributes.normal;

        // Bake offset+scale nos vértices (para que finalY = (rawY - minY)*scale)
        const bakedPos = new Float32Array(posAttr.count * 3);
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);
            bakedPos[i * 3] = (x + offsetX) * scale;
            bakedPos[i * 3 + 1] = (y + offsetY) * scale;
            bakedPos[i * 3 + 2] = (z + offsetZ) * scale;
        }
        const newGeo = new THREE.BufferGeometry();
        newGeo.setAttribute('position', new THREE.BufferAttribute(bakedPos, 3));
        if (uvAttr) newGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvAttr.array), uvAttr.itemSize));
        else newGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(posAttr.count * 2), 2));
        if (geo.index) newGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(geo.index.array), 1));
        newGeo.computeVertexNormals();

        // Cria skinIndex / skinWeight (4 influências, usamos só 1 com peso 1)
        const vertCount = newGeo.attributes.position.count;
        const skinIndices = new Uint16Array(vertCount * 4);
        const skinWeights = new Float32Array(vertCount * 4);
        for (let i = 0; i < vertCount; i++) {
            const y = newGeo.attributes.position.getY(i);
            const x = newGeo.attributes.position.getX(i);
            let bIdx = 0;
            // faixas Y finais
            if (y < 0.70) {
                // pernas
                bIdx = x < 0 ? 4 : 6; // legL vs legR (upper)
                // parte baixa da perna
                if (y < 0.38) bIdx = x < 0 ? 5 : 7;
            } else if (y < 1.35) {
                bIdx = 0; // hips
            } else if (y < 1.75) {
                if (Math.abs(x) > 0.20) bIdx = x < 0 ? 8 : 10; // arm upper (indices reais: armL=8, armR=10)
                else bIdx = 1; // spineLow
            } else if (y < 2.25) {
                if (Math.abs(x) > 0.18) bIdx = x < 0 ? 9 : 11; // arm lower? na verdade usamos 9/11 como lower mas approx
                else bIdx = 2; // spineHigh
            } else {
                bIdx = 3; // head
            }
            // corrige índices mapeados para bones array ordem
            // bones ordem: 0 hips,1 spineLow,2 spineHigh,3 head,4 legL,5 legLLower,6 legR,7 legRLower,8 armL,9 armLLower,10 armR,11 armRLower
            // nosso bIdx acima já está nesse mapeamento para pernas/braços, mas para hips/spine usamos 0,1,2,3
            // Ajusta arm lower: se era 9/11, mapeia para 9 e 11
            skinIndices[i * 4] = bIdx;
            skinIndices[i * 4 + 1] = 0;
            skinIndices[i * 4 + 2] = 0;
            skinIndices[i * 4 + 3] = 0;
            skinWeights[i * 4] = 1;
            skinWeights[i * 4 + 1] = 0;
            skinWeights[i * 4 + 2] = 0;
            skinWeights[i * 4 + 3] = 0;
        }
        newGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        newGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        let mat = mesh.material;
        if (!mat || !mat.isMaterial || mat.name === 'place_holder') {
            mat = new THREE.MeshLambertMaterial({ map: diffuse || null, color: diffuse ? 0xffffff : 0x0d0b08 });
        } else {
            if (diffuse && mat.map !== diffuse) { mat.map = diffuse; mat.needsUpdate = true; }
            if (mat.isMeshStandardMaterial) {
                mat = new THREE.MeshLambertMaterial({ map: mat.map || diffuse || null, color: mat.color || new THREE.Color(0xffffff) });
            }
        }
        // Desativa vertex snapping na entidade (snap faz pé parecer enterrado)
        configureRetroMaterial(mat, null, { snapping: false, affine: true, flat: true });
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1.0;
        mat.polygonOffsetUnits = -1.0;
        const skinned = new THREE.SkinnedMesh(newGeo, mat);
        skinned.frustumCulled = false;
        skinned.add(bones[0]); // adiciona root ao skinned (necessário para bind)
        skinned.bind(skeleton);
        // O skeleton compartilhado precisa ser clonado por instância; guardamos template e clonamos depois
        skinnedMeshes.push(skinned);
    }

    const wrapper = new THREE.Group();
    // Adiciona root bone ao wrapper (para animação)
    wrapper.add(bones[0]);
    for (const sm of skinnedMeshes) wrapper.add(sm);
    wrapper.userData.bones = boneMap;
    wrapper.userData.skeleton = skeleton;
    wrapper.userData.visualRadius = Math.max(rawSize.x, rawSize.z) * 0.5 * scale;
    wrapper.userData.height = targetHeight;
    // Skeleton precisa de pose inicial
    skeleton.pose();
    return wrapper;
}

function cloneSlenderModel(source) {
    try {
        const cloned = SkeletonUtils.clone(source);
        // SkeletonUtils.clone duplica bones/skeleton corretamente, mas userData.bones aponta para original.
        // Reconstrói mapa a partir do clone.
        const newMap = {};
        cloned.traverse((o) => {
            if (o.isBone) newMap[o.name] = o;
        });
        if (Object.keys(newMap).length > 0) {
            cloned.userData.bones = newMap;
            // Atualiza skeleton reference se existir SkinnedMesh
            cloned.traverse((o) => {
                if (o.isSkinnedMesh && o.skeleton) {
                    cloned.userData.skeleton = o.skeleton;
                }
            });
        }
        return cloned;
    } catch (e) {
        // Fallback para clone simples se SkeletonUtils falhar (ex: modelo fallback sem skeleton)
        console.warn('[BackroomsEntity] SkeletonUtils.clone falhou, usando clone(true)', e);
        return source.clone(true);
    }
}

function loadSlenderTemplate() {
    if (cachedSlenderTemplate) {
        return Promise.resolve(cloneSlenderModel(cachedSlenderTemplate));
    }
    if (slenderLoadPromise) return slenderLoadPromise.then((g) => cloneSlenderModel(g));

    slenderLoadPromise = Promise.all([
        new Promise((resolve, reject) => {
            const loader = new OBJLoader();
            loader.load('/models/slenderman/base.obj', resolve, undefined, reject);
        }),
        loadDiffuseTexture()
    ]).then(([obj, diffuse]) => {
        const rigged = rigSlenderman(obj, diffuse);
        cachedSlenderTemplate = rigged;
        return cloneSlenderModel(rigged);
    }).catch((err) => {
        console.warn('[BackroomsEntity] falha ao carregar slenderman .obj, usando fallback', err);
        slenderLoadPromise = null;
        return null;
    });
    return slenderLoadPromise;
}

export class BackroomsEntity {
    constructor({ level, mode, seed, events }) {
        this.level = level;
        this.mode = mode;
        this.events = events;
        this.state = EntityState.IDLE_HIDDEN;
        this.seed = seed || 0;
        this.playerPos = new THREE.Vector3();
        this.time = 0;
        this.stateTimer = 0;
        this.target = new THREE.Vector3();
        this.caughtPlayer = false;
        this.speed = ECFG.speed.walk;
        this.observeRange = this.observeRangeFor(mode);
        this._visualRadius = 0.52;
        this._slenderReady = false;
        this.lostTimer = 0;
        this.respawnTimer = 0;
        this.vanishTimer = 0;
        this._respawnDelay = this.randomRespawnDelay();
        this.buildVisual();
        this.pickWanderTarget();
    }

    randomRespawnDelay() {
        const r = ECFG.respawnDelay || { min: 7, max: 13 };
        return r.min + Math.random() * (r.max - r.min);
    }

    observeRangeFor(mode) {
        if (mode === 'benign' || mode === 'easy' || mode === 'stalker') return ECFG.observeRangeEasy * CONFIG.game.cellSize;
        if (mode === 'aggressive' || mode === 'hard') return ECFG.observeRangeHard * CONFIG.game.cellSize;
        return ECFG.observeRangeNormal * CONFIG.game.cellSize;
    }

    loseTimeForMode() {
        if (this.mode === 'stalker' || this.mode === 'benign') return (ECFG.loseTime || 3.2) * 1.1;
        if (this.mode === 'aggressive') return (ECFG.loseTime || 3.2) * 0.85;
        return ECFG.loseTime || 3.2;
    }

    buildVisual() {
        const group = new THREE.Group();
        this.group = group;
        group.position.y = 0.015;
        const fallback = this.createFallbackVisual();
        group.add(fallback);
        this._fallback = fallback;
        this._fallbackVisible = true;
        loadSlenderTemplate().then((model) => {
            if (!model) return;
            if (this._fallback && this._fallback.parent === group) {
                this._fallback.traverse((o) => {
                    if (o.geometry) o.geometry.dispose();
                    if (o.material) {
                        const mats = Array.isArray(o.material) ? o.material : [o.material];
                        mats.forEach((m) => { try { m.dispose(); } catch {} });
                    }
                });
                group.remove(this._fallback);
                this._fallback = null;
            }
            const vr = model.userData.visualRadius;
            if (vr) this._visualRadius = Math.max(0.42, Math.min(0.65, vr));
            model.position.set(0, 0, 0);
            group.add(model);
            this._slenderModel = model;
            // guarda bones para animação - reconstrói se necessário
            let bones = model.userData.bones;
            if (!bones || !bones['hips'] || !bones['hips'].rotation) {
                const rebuilt = {};
                model.traverse((o) => { if (o.isBone) rebuilt[o.name] = o; });
                if (Object.keys(rebuilt).length > 0) {
                    bones = rebuilt;
                    model.userData.bones = rebuilt;
                }
            }
            this._bones = bones || null;
            // Valida que pelo menos hips/leg existem com rotation
            if (this._bones && this._bones['hips']?.rotation) {
                this._slenderReady = true;
            } else {
                console.warn('[BackroomsEntity] modelo sem bones válidos, mantendo fallback');
                // mantém fallback invisível mas não quebra
                this._bones = null;
                this._slenderReady = false;
            }
        });
    }

    createFallbackVisual() {
        const g = new THREE.Group();
        const skinMat = new THREE.MeshLambertMaterial({ color: 0x0d0b08 });
        const skinDarkMat = new THREE.MeshLambertMaterial({ color: 0x070605 });
        configureRetroMaterial(skinMat, null, { snapping: false });
        configureRetroMaterial(skinDarkMat, null, { snapping: false });
        const spinePoints = [
            new THREE.Vector3(0, 1.05, 0),
            new THREE.Vector3(0.03, 1.35, -0.02),
            new THREE.Vector3(-0.03, 1.58, 0.015),
            new THREE.Vector3(0, 1.95, 0)
        ];
        const spineCurve = new THREE.CatmullRomCurve3(spinePoints);
        const spineGeo = new THREE.TubeGeometry(spineCurve, 10, 0.038, 5, false);
        const spine = new THREE.Mesh(spineGeo, skinMat);
        g.add(spine);
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 2.08, 0);
        const headGeo = new THREE.CylinderGeometry(0.06, 0.16, 0.18, 7, 1, false);
        const head = new THREE.Mesh(headGeo, skinDarkMat);
        head.position.y = 0.05;
        headGroup.add(head);
        g.add(headGroup);
        const createLimb = (length, topR, botR) => {
            const limb = new THREE.Group();
            const upperGeo = new THREE.CylinderGeometry(topR, topR * 0.7, length * 0.55, 5);
            const lowerGeo = new THREE.CylinderGeometry(topR * 0.7, botR, length * 0.55, 5);
            const upper = new THREE.Mesh(upperGeo, skinMat);
            upper.position.y = -length * 0.27;
            const lower = new THREE.Mesh(lowerGeo, skinMat);
            lower.position.y = -length * 0.72;
            limb.add(upper, lower);
            return limb;
        };
        const legL = createLimb(1.12, 0.032, 0.014);
        legL.position.set(-0.08, 1.05, 0);
        const legR = createLimb(1.12, 0.032, 0.014);
        legR.position.set(0.08, 1.05, 0);
        const armL = createLimb(0.80, 0.024, 0.010);
        armL.position.set(-0.09, 1.58, 0);
        const armR = createLimb(0.80, 0.024, 0.010);
        armR.position.set(0.09, 1.58, 0);
        g.add(legL, legR, armL, armR);
        this._limbs = { legL, legR, armL, armR, headGroup, spine };
        return g;
    }

    setPlayerPos(pos) { this.playerPos.copy(pos); }
    resetState(state) { this.state = state; this.stateTimer = 0; }
    distanceToPlayer() { return this.group.position.distanceTo(this.playerPos); }
    distanceToPlayerXZ() {
        const dx = this.group.position.x - this.playerPos.x;
        const dz = this.group.position.z - this.playerPos.z;
        return Math.hypot(dx, dz);
    }
    visibleToPlayer() {
        const d = this.distanceToPlayer();
        if (d > this.observeRange) return false;
        return !this.lineBlocked(this.group.position, this.playerPos);
    }
    lockHeight() {
        // trava Y em 0.015 para nunca enterrar no chão (scale/bob não devem mexer no Group.y)
        if (this.group.position.y !== 0.015) this.group.position.y = 0.015;
    }
    lineBlocked(a, b) {
        const steps = Math.ceil(a.distanceTo(b) / (CONFIG.game.cellSize * 0.5));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = a.x + (b.x - a.x) * t;
            const z = a.z + (b.z - a.z) * t;
            if (this.level.isSolidAt(x, z)) return true;
        }
        return false;
    }
    update(delta, time) {
        this.time = time;
        this.stateTimer += delta;
        // GONE e VANISHING têm visibilidade própria
        if (this.state !== EntityState.GONE && this.state !== EntityState.VANISHING) {
            this.group.visible = true;
        }
        switch (this.state) {
            case EntityState.IDLE_HIDDEN: this.updateHidden(delta); break;
            case EntityState.OBSERVING: this.updateObserving(delta); break;
            case EntityState.DISAPPEARING: this.updateDisappearing(delta); break;
            case EntityState.STALKING: this.updateStalking(delta); break;
            case EntityState.CHASING: this.updateChasing(delta); break;
            case EntityState.SEARCHING: this.updateSearching(delta); break;
            case EntityState.COOLDOWN: this.updateCooldown(delta); break;
            case EntityState.VANISHING: this.updateVanishing(delta); break;
            case EntityState.GONE: this.updateGone(delta); break;
            default: break;
        }
        this.keepCenteredInCorridor();
        this.lockHeight();
        this.animateBones(delta, time);
    }
    updateHidden(delta) {
        // Mesmo em stalker/benign, fica levemente vagando até ver o player
        if (this.mode === 'benign' || this.mode === 'stalker') {
            this.wander(delta, ECFG.speed.walk * 0.45);
            if (this.distanceToPlayer() > this.observeRange) return;
            if (this.visibleToPlayer()) this.resetState(EntityState.OBSERVING);
            return;
        }
        // normal/hard: pode vagar ou ficar parado, mas detecta rápido
        this.wander(delta, ECFG.speed.walk * 0.35);
        if (this.visibleToPlayer() && this.stateTimer > (ECFG.observeDelay?.[this.mode] ?? 0.35) + this.seed * 0.35) {
            this.resetState(EntityState.OBSERVING);
        }
    }
    updateObserving(delta) {
        this.facePlayer();
        this.flicker(delta);
        const d = this.distanceToPlayerXZ();
        if (d < CONFIG.player.radius + 0.65 && this.mode !== 'stalker' && this.mode !== 'benign') { this.caughtPlayer = true; return; }
        // stalker: nunca persegue de perto, só observa e começa a seguir à distância
        if (this.mode === 'stalker' || this.mode === 'benign') {
            if (!this.visibleToPlayer()) { this.resetState(EntityState.IDLE_HIDDEN); return; }
            if (this.stateTimer > 0.9) this.resetState(EntityState.STALKING);
            return;
        }
        if (!this.visibleToPlayer()) {
            this.lostTimer += delta;
            if (this.lostTimer > 0.9) { this.resetState(EntityState.SEARCHING); this.lostTimer = 0; }
            return;
        }
        this.lostTimer = 0;
        const d3 = this.distanceToPlayer();
        const delay = ECFG.observeDelay?.[this.mode] ?? 0.35;
        if (this.stateTimer > delay) {
            if (this.mode === 'aggressive') this.resetState(EntityState.CHASING);
            else if (d3 < ECFG.chaseRange * CONFIG.game.cellSize) this.resetState(EntityState.CHASING);
            else this.resetState(EntityState.STALKING);
        }
    }
    updateDisappearing(delta) {
        this.facePlayer(); this.flicker(delta);
        if (this._slenderModel) this._slenderModel.position.y = Math.sin(this.time * 8) * 0.015;
        if (this.stateTimer > ECFG.disappearTime) { this.startVanish(); }
    }
    updateStalking(delta) {
        // stalker do fácil: segue lento, mantém distância, nunca mata
        const isEasyStalker = this.mode === 'stalker' || this.mode === 'benign';
        if (isEasyStalker) {
            const d = this.distanceToPlayerXZ();
            // se muito perto, afasta/disaparece em vez de capturar
            if (d < 1.1) { this.startVanish(); return; }
            // mantém distância de 3-5m
            if (d > 6) this.moveTowardPlayer(delta, ECFG.speed.walk);
            else if (d > 3.5) this.moveTowardPlayer(delta, ECFG.speed.stalk * 0.55);
            else { this.facePlayer(); this.wander(delta, ECFG.speed.walk * 0.3); }
            this.flicker(delta);
            // despistou?
            if (!this.visibleToPlayer()) {
                this.lostTimer += delta;
                if (this.lostTimer > this.loseTimeForMode()) this.startVanish();
            } else this.lostTimer = 0;
            // ocasionalmente some e respawna mesmo visível (assombra)
            if (this.stateTimer > 9 + Math.random() * 6) this.startVanish();
            return;
        }
        // normal: stalking é transição para chasing
        this.moveTowardPlayer(delta, ECFG.speed.stalk); this.flicker(delta);
        const d = this.distanceToPlayerXZ();
        if (d < 0.75 && this.mode !== 'stalker') { this.caughtPlayer = true; return; }
        if (!this.visibleToPlayer()) {
            this.lostTimer += delta;
            if (this.lostTimer > 1.8) { this.startVanish(); return; }
        } else this.lostTimer = 0;
        if (d < ECFG.chaseRange * CONFIG.game.cellSize) this.resetState(EntityState.CHASING);
        if (this.stateTimer > (ECFG.stalkTime || 5)) this.resetState(EntityState.CHASING);
    }
    updateChasing(delta) {
        const dBefore = this.distanceToPlayerXZ();
        if (dBefore < 0.75) { this.caughtPlayer = true; return; }
        this.moveTowardPlayer(delta, ECFG.speed.chase);
        const d = this.distanceToPlayerXZ();
        if (d < 0.75) { this.caughtPlayer = true; return; }
        // persegue sempre: só perde se ficar sem visão por loseTime
        if (!this.visibleToPlayer() || d > this.observeRange * 1.25) {
            this.lostTimer += delta;
            if (this.lostTimer > this.loseTimeForMode()) { this.startVanish(); return; }
        } else {
            this.lostTimer = 0;
        }
        this.flicker(delta);
    }
    updateSearching(delta) {
        this.facePlayer(); this.wander(delta, ECFG.speed.walk);
        if (this.distanceToPlayerXZ() < 0.75 && this.mode !== 'stalker' && this.mode !== 'benign') { this.caughtPlayer = true; return; }
        if (this.visibleToPlayer()) { this.lostTimer = 0; this.resetState(EntityState.CHASING); return; }
        this.lostTimer += delta;
        if (this.lostTimer > 1.2) { this.startVanish(); return; }
        if (this.stateTimer > ECFG.searchTime) this.resetState(EntityState.COOLDOWN);
    }
    updateCooldown(delta) {
        if (this._slenderModel) this._slenderModel.position.y = Math.sin(this.time * 6) * 0.015;
        this.flicker(delta);
        if (this.stateTimer > ECFG.chaseCooldown) { this.startVanish(); }
    }
    startVanish() {
        this.resetState(EntityState.VANISHING);
        this.vanishTimer = 0;
        this.lostTimer = 0;
        if (this._slenderModel) this._slenderModel.position.y = 0;
    }
    updateVanishing(delta) {
        this.vanishTimer += delta;
        // fade flicker
        this.group.visible = Math.random() > 0.45;
        const s = 1.0 - this.vanishTimer * 0.55;
        this.group.scale.set(Math.max(0.35, s), Math.max(0.35, s), Math.max(0.35, s));
        if (this._slenderModel) this._slenderModel.position.y = Math.sin(this.time * 10) * 0.02;
        if (this.vanishTimer > (ECFG.vanishTime || 0.7)) {
            this.group.visible = false;
            this.group.scale.set(1, 1, 1);
            if (this._slenderModel) this._slenderModel.position.y = 0;
            this.teleportAway();
            this.resetState(EntityState.GONE);
            this.respawnTimer = 0;
            this._respawnDelay = this.randomRespawnDelay();
        }
    }
    updateGone(delta) {
        this.group.visible = false;
        this.respawnTimer += delta;
        if (this.respawnTimer > this._respawnDelay) {
            this.teleportAway();
            this.group.visible = false;
            this.resetState(EntityState.IDLE_HIDDEN);
            this.respawnTimer = 0;
            this._respawnDelay = this.randomRespawnDelay();
            this.lostTimer = 0;
        }
    }
    facePlayer() {
        const dx = this.playerPos.x - this.group.position.x;
        const dz = this.playerPos.z - this.group.position.z;
        this.group.rotation.y = Math.atan2(dx, dz);
    }
    flicker(delta) {
        const isHunt = this.state === EntityState.CHASING || this.state === EntityState.STALKING;
        // Nunca escala abaixo de 1 para não enterrar pé (snap + pivô em hips)
        if (isHunt) {
            this.group.visible = true;
            const s = 1.0 + Math.sin(this.time * 6) * 0.012;
            this.group.scale.set(s, s, s);
        } else if (this.state === EntityState.DISAPPEARING || this.state === EntityState.COOLDOWN) {
            const s = 1.0 + Math.random() * 0.05;
            this.group.scale.set(s, s, s);
            this.group.visible = Math.random() > 0.06;
        } else {
            const s = 1.0 + Math.random() * 0.03;
            this.group.scale.set(s, s, s);
            this.group.visible = Math.random() > 0.025;
        }
        if (this._limbs && !this._slenderReady) {
            const w = Math.sin(this.time * 1.1) * 0.03;
            const w2 = Math.cos(this.time * 0.9) * 0.02;
            this._limbs.legL.rotation.x = w;
            this._limbs.legR.rotation.x = -w;
            this._limbs.armL.rotation.x = 0.10 + w2;
            this._limbs.armR.rotation.x = -0.06 - w2;
            this._limbs.headGroup.rotation.z = Math.sin(this.time * 0.7) * 0.06;
        }
    }
    animateBones(delta, time) {
        try {
            const isMoving = this.state === EntityState.CHASING || this.state === EntityState.STALKING || this.state === EntityState.SEARCHING || (this.mode === 'benign' && this.state === EntityState.IDLE_HIDDEN);
            if (!this._slenderReady || !this._slenderModel) return;
            const bMap = this._slenderModel.userData.bones || this._bones;
            let bHips, bLegL, bLegR, bLegLLower, bLegRLower, bSpine, bHead, bArmL, bArmR;
            if (bMap) {
                bHips = bMap['hips']; bLegL = bMap['legL']; bLegR = bMap['legR'];
                bLegLLower = bMap['legLLower']; bLegRLower = bMap['legRLower'];
                bSpine = bMap['spineHigh'] || bMap['spineLow']; bHead = bMap['head'];
                bArmL = bMap['armL']; bArmR = bMap['armR'];
            }
            // Fallback: busca por nome na hierarquia se mapa incompleto
            if (!bLegL || !bHips || !bLegL?.rotation) {
                this._slenderModel.traverse((o) => {
                    if (o.isBone) {
                        if (o.name === 'legL') bLegL = o;
                        if (o.name === 'legR') bLegR = o;
                        if (o.name === 'legLLower') bLegLLower = o;
                        if (o.name === 'legRLower') bLegRLower = o;
                        if (o.name === 'hips') bHips = o;
                        if (o.name === 'head') bHead = o;
                        if (o.name === 'spineHigh' || o.name === 'spineLow') bSpine = bSpine || o;
                        if (o.name === 'armL') bArmL = o;
                        if (o.name === 'armR') bArmR = o;
                    }
                });
            }
            const speed = this.state === EntityState.CHASING ? 5.5 : this.state === EntityState.STALKING ? 3.0 : 2.2;
            const freq = isMoving ? (speed > 5 ? 6.5 : speed > 3 ? 4.5 : 2.2) : 0.7;
            const amp = isMoving ? (speed > 5 ? 0.30 : 0.22) : 0.08;
            const t = time * freq;
            if (bLegL?.rotation) bLegL.rotation.x = Math.sin(t) * amp;
            if (bLegR?.rotation) bLegR.rotation.x = Math.sin(t + Math.PI) * amp;
            if (bLegLLower?.rotation) bLegLLower.rotation.x = Math.max(0, Math.sin(t) * 0.28);
            if (bLegRLower?.rotation) bLegRLower.rotation.x = Math.max(0, Math.sin(t + Math.PI) * 0.28);
            if (bArmL?.rotation) bArmL.rotation.x = Math.sin(t + Math.PI) * amp * 0.5;
            if (bArmR?.rotation) bArmR.rotation.x = Math.sin(t) * amp * 0.5;
            if (bHips?.position && bHips?.rotation && isMoving) {
                bHips.position.y = Math.abs(Math.sin(t)) * 0.035;
                bHips.rotation.z = Math.sin(t * 0.5) * 0.03;
            }
            if (bSpine?.rotation) bSpine.rotation.z = Math.sin(t * 0.5) * 0.04;
            if (bHead?.rotation) { bHead.rotation.y = Math.sin(time * 0.8) * 0.12; bHead.rotation.x = Math.cos(time * 0.6) * 0.06; }
            // Atualiza skeleton com guard
            this._slenderModel.traverse((o) => { if (o.isSkinnedMesh && o.skeleton?.update) try { o.skeleton.update(); } catch {} });
        } catch (err) {
            // Nunca deixar animação quebrar o loop principal (câmera estática)
            console.warn('[BackroomsEntity] animateBones falhou', err);
        }
    }
    moveTowardPlayer(delta, speed) {
        const dx = this.playerPos.x - this.group.position.x;
        const dz = this.playerPos.z - this.group.position.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.01) return;
        const step = Math.min(speed * delta, len);
        this.facePlayer();
        this.moveWithCollision((dx / len) * step, (dz / len) * step);
        this.keepCenteredInCorridor();
    }
    wander(delta, speed) {
        const dx = this.target.x - this.group.position.x;
        const dz = this.target.z - this.group.position.z;
        if (Math.hypot(dx, dz) < 0.3) { this.pickWanderTarget(); return; }
        const len = Math.hypot(dx, dz);
        const step = Math.min(speed * delta, len);
        this.moveWithCollision((dx / len) * step, (dz / len) * step);
        this.keepCenteredInCorridor();
    }
    pickWanderTarget() {
        const cell = this.level.worldToCell(this.group.position.x, this.group.position.z);
        let attempts = 0; let chosen = null;
        while (attempts++ < 16) {
            const dc = (Math.floor(Math.random() * 7) - 3);
            const dr = (Math.floor(Math.random() * 7) - 3);
            const nc = cell.x + dc; const nr = cell.z + dr;
            if (nc < 0 || nr < 0 || nc >= this.level.cols || nr >= this.level.rows) continue;
            if (this.level.isSolidCell(nc, nr)) continue;
            const wc = this.level.cellToWorld(nc, nr);
            const r = this._visualRadius + 0.15;
            if (this.level.isSolidAt(wc.x + r, wc.z) || this.level.isSolidAt(wc.x - r, wc.z) ||
                this.level.isSolidAt(wc.x, wc.z + r) || this.level.isSolidAt(wc.x, wc.z - r)) {
                if (Math.random() > 0.25) continue;
            }
            chosen = wc; break;
        }
        this.target.set(chosen ? chosen.x : this.group.position.x, 0, chosen ? chosen.z : this.group.position.z);
    }
    moveWithCollision(dx, dz) {
        const p = this.group.position; const r = this._visualRadius;
        if (!this.level.isSolidAt(p.x + dx + r, p.z) && !this.level.isSolidAt(p.x + dx - r, p.z) &&
            !this.level.isSolidAt(p.x + dx + r*0.7, p.z + r*0.7) && !this.level.isSolidAt(p.x + dx - r*0.7, p.z + r*0.7)) p.x += dx;
        if (!this.level.isSolidAt(p.x, p.z + dz + r) && !this.level.isSolidAt(p.x, p.z + dz - r) &&
            !this.level.isSolidAt(p.x + r*0.7, p.z + dz + r*0.7) && !this.level.isSolidAt(p.x - r*0.7, p.z + dz - r*0.7)) p.z += dz;
    }
    keepCenteredInCorridor() {
        const p = this.group.position; const r = this._visualRadius + 0.10;
        const cell = this.level.worldToCell(p.x, p.z);
        if (cell.x < 0 || cell.z < 0 || cell.x >= this.level.cols || cell.z >= this.level.rows) return;
        if (this.level.isSolidCell(cell.x, cell.z)) return;
        const center = this.level.cellToWorld(cell.x, cell.z);
        const half = CONFIG.game.cellSize / 2; const margin = r + 0.08;
        let openN = !this.level.isSolidCell(cell.x, cell.z - 1);
        let openS = !this.level.isSolidCell(cell.x, cell.z + 1);
        let openE = !this.level.isSolidCell(cell.x + 1, cell.z);
        let openW = !this.level.isSolidCell(cell.x - 1, cell.z);
        const openCount = (openN?1:0)+(openS?1:0)+(openE?1:0)+(openW?1:0);
        const isCorridor = openCount <= 2;
        if (isCorridor) {
            const horiz = (openE || openW) && !(openN || openS);
            const vert = (openN || openS) && !(openE || openW);
            if (horiz) p.z = THREE.MathUtils.lerp(p.z, center.z, 0.22);
            else if (vert) p.x = THREE.MathUtils.lerp(p.x, center.x, 0.22);
            else { p.x = THREE.MathUtils.lerp(p.x, center.x, 0.12); p.z = THREE.MathUtils.lerp(p.z, center.z, 0.12); }
        }
        const minX = center.x - half + margin; const maxX = center.x + half - margin;
        const minZ = center.z - half + margin; const maxZ = center.z + half - margin;
        if (!openE && p.x > maxX) p.x = maxX;
        if (!openW && p.x < minX) p.x = minX;
        if (!openS && p.z > maxZ) p.z = maxZ;
        if (!openN && p.z < minZ) p.z = minZ;
        for (let iter = 0; iter < 2; iter++) {
            let pushed = false;
            for (const [dx, dz] of [[r,0],[-r,0],[0,r],[0,-r]]) {
                if (this.level.isSolidAt(p.x + dx, p.z + dz)) {
                    const cx = center.x - p.x; const cz = center.z - p.z;
                    const len = Math.hypot(cx, cz) || 1;
                    p.x += (cx / len) * 0.09; p.z += (cz / len) * 0.09;
                    pushed = true; break;
                }
            }
            if (!pushed) break;
        }
    }
    teleportAway() {
        const playerCell = this.level.worldToCell(this.playerPos.x, this.playerPos.z);
        let chosen = null; const r = this._visualRadius + 0.15;
        for (let attempts = 0; attempts < 30; attempts++) {
            const c = Math.floor(Math.random() * this.level.cols);
            const rr = Math.floor(Math.random() * this.level.rows);
            if (this.level.grid[rr][c] === '#') continue;
            const d = Math.hypot(c - playerCell.x, rr - playerCell.z);
            if (d < 5) continue;
            const w = this.level.cellToWorld(c, rr);
            if (this.level.isSolidAt(w.x + r, w.z) || this.level.isSolidAt(w.x - r, w.z) ||
                this.level.isSolidAt(w.x, w.z + r) || this.level.isSolidAt(w.x, w.z - r)) continue;
            chosen = new THREE.Vector3(w.x, 0, w.z); break;
        }
        if (chosen) { this.group.position.copy(chosen); this.group.visible = false; this.group.position.y = 0.015; }
    }
    dispose() {
        if (this._fallback) { try { this.group.remove(this._fallback); } catch {} }
        if (this._slenderModel) { try { this.group.remove(this._slenderModel); } catch {} }
        this.level.group.remove(this.group);
        this.group.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                mats.forEach((m) => { try { m.dispose(); } catch {} });
            }
        });
    }
}
