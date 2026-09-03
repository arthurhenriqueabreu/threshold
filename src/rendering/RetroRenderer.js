import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { RetroStyle } from './RetroStyle.js';
import { RetroPostVertexShader, RetroPostFragmentShader } from './RetroPostShader.js';
import { getAllRetroHandles, collectRetroUniforms } from './RetroMaterial.js';

// Camada de renderização retro.
// Pipeline:
//   Scene -> ???  (object snapshot) -> Low-res WebGLRenderTarget
//        -> RetroPostShader (dither + color quantization)
//        -> Screen (nearest upscale via magFilter NearestFilter)
//
// Mantém o renderer, scene e camera separados; o jogo simplesmente chama
// render() no lugar de renderer.render().
export class RetroRenderer {
    constructor(renderer, retroConfig = CONFIG.retro) {
        this.renderer = renderer;
        this.baseEnabled = retroConfig.enabled;
        this.enabled = this.baseEnabled;
        this.style = new RetroStyle(retroConfig);
        this.isVRMode = false; // preparação futura para preset vr-safe

        // RenderTarget de baixa resolução.
        this.renderTarget = new THREE.WebGLRenderTarget(1, 1, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            generateMipmaps: false,
            depthBuffer: true,
            stencilBuffer: false,
            colorSpace: THREE.SRGBColorSpace
        });

        // Materiais/geometria do fullscreen pass que vão aplicar o shader retro.
        this._initPostPass();

        // Uniforms compartilhados que precisam ser atualizados a cada frame
        // (vertex snapping / affine) — coletados dos handles registrados.
        this.sharedUniforms = [];
    }

    get targetWidth() {
        return this.style.resolution.x;
    }

    get targetHeight() {
        return this.style.resolution.y;
    }

    _initPostPass() {
        this.postMaterial = new THREE.ShaderMaterial({
            vertexShader: RetroPostVertexShader,
            fragmentShader: RetroPostFragmentShader,
            uniforms: {
                tDiffuse: { value: null },
                uResolution: { value: new THREE.Vector2(1, 1) },
                uDither: { value: CONFIG.retro.ditherStrength },
                uEnableDither: { value: CONFIG.retro.dithering },
                uQuantLevels: { value: Math.pow(2, CONFIG.retro.colorBits) - 1 },
                uEnableQuant: { value: CONFIG.retro.colorQuantization },
                uGamma: { value: CONFIG.retro.postGamma }
            },
            depthTest: false,
            depthWrite: false
        });

        // Fullscreen triangle (evita corner issues de quad com UV).
        // itemSize 3 (z = 0) para que computeBoundingSphere não leia além do
        // array (evita "Computed radius is NaN" em atributo 2D).
        this.postScene = new THREE.Scene();
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.postMesh = new THREE.Mesh(geometry, this.postMaterial);
        this.postScene.add(this.postMesh);
    }

    // Registra uniforms compartilhados (vertex snapping etc.) para atualização.
    // Compatibilidade: aceita itens { uniform, kind } OU botões brutos.
    registerSharedUniforms(sharedList) {
        if (!this.sharedUniforms) this.sharedUniforms = [];
        if (Array.isArray(sharedList)) {
            for (const entry of sharedList) {
                if (entry && entry.uniform) this.sharedUniforms.push(entry);
            }
        }
    }

    _syncSharedUniforms() {
        // Obtém os handles ativos (registrados por installRetroVertexHooks).
        // Como materiais podem ser recriados a cada loadLevel, recalcamos a
        // lista aqui; coleção tipada é barata para poucos materiais.
        const handles = getAllRetroHandles();
        this.sharedUniforms = [];
        for (const h of handles) {
            const collected = collectRetroUniforms(h);
            this.sharedUniforms.push(...collected);
        }
    }

    setSize(width, height) {
        // Mantém o canvas no tamanho real da viewport.
        this.renderer.setSize(width, height);

        // Resolução interna derivada do aspect preservado.
        const res = this.style.setResolution(width, height);
        this.renderTarget.setSize(res.width, res.height);

        this.postMaterial.uniforms.uResolution.value.set(res.width, res.height);
        this._syncSharedUniforms();
        this._updateResUniforms(res);
    }

    setPixelRatio(ratio) {
        this.renderer.setPixelRatio(ratio);
    }

    // Ajusta o pipeline para VR: o framebuffer XR continua nativo/stereo e os
    // efeitos de snap são suavizados para não introduzir desconforto visual.
    setVRMode(on) {
        this.isVRMode = on;
        const vr = CONFIG.retro.vrSafe;
        if (on) {
            this.enabled = !vr.internalLowRes;
        } else {
            this.enabled = this.baseEnabled;
        }
    }

    // Passa a redimensionar e também aplica pixelated no canvas CSS.
    applyPixelatedCSS() {
        const canvas = this.renderer.domElement;
        canvas.style.imageRendering = 'pixelated';
        canvas.style.imageRendering = 'crisp-edges';
    }

    _updatePostUniforms() {
        const u = this.postMaterial.uniforms;
        u.uDither.value = CONFIG.retro.ditherStrength;
        u.uEnableDither.value = CONFIG.retro.dithering;
        u.uQuantLevels.value = Math.pow(2, CONFIG.retro.colorBits) - 1;
        u.uEnableQuant.value = CONFIG.retro.colorQuantization;
        u.uGamma.value = CONFIG.retro.postGamma;
    }

    // Renderiza a cena via render target low-res + post pass fullscreen.
    render(scene, camera, time) {
        // The low-resolution post pass is mono and cannot be used as the XR
        // framebuffer. Let WebGLRenderer render the native stereo views.
        if (this.renderer.xr?.isPresenting) {
            // Materiais retro são registrados depois do primeiro setSize().
            // Sem esta atualização, uRetroRes permanece em (1, 1) no primeiro
            // caminho XR e o vertex snapping pode colapsar a geometria inteira.
            this._updateSharedUniforms(time);
            // O WebXRManager seleciona o framebuffer estéreo do headset antes
            // de chamar o animation loop. Não altere o render target aqui:
            // setRenderTarget(null) troca o framebuffer XR pelo canvas padrão
            // e pode resultar em uma cena preta/parcial no headset/emulador.
            this.renderer.render(scene, camera);
            return;
        }
        if (!this.enabled) {
            this.renderer.render(scene, camera);
            return;
        }

        // Atualiza uniforms compartilhados (snap jitter / res).
        this._updateSharedUniforms(time);

        // 1) Renderiza a cena para o target low-res.
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(null);

        // 2) Pass fullscreen com shader retro.
        this._updatePostUniforms();
        this.postMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.renderer.render(this.postScene, this.postCamera);
    }

    _updateSharedUniforms(time) {
        this._syncSharedUniforms();
        const res = this.style.resolution;
        const jitter = this.style.snapJitter(time);
        for (const entry of this.sharedUniforms) {
            if (!entry || !entry.uniform) continue;
            const u = entry.uniform;
            switch (entry.kind) {
                case 'res':
                    u.value.set(res.x, res.y);
                    break;
                case 'snapJitter':
                    u.value = jitter;
                    break;
                case 'snapStrength':
                    u.value = this.isVRMode ? CONFIG.retro.vrSafe.vertexSnapStrength : CONFIG.retro.vertexSnapStrength;
                    break;
                case 'affineStrength':
                    u.value = this.isVRMode ? CONFIG.retro.vrSafe.affineStrength : CONFIG.retro.affineStrength;
                    break;
                default:
                    break;
            }
        }
    }

    _updateResUniforms(res) {
        for (const entry of this.sharedUniforms) {
            if (entry && entry.kind === 'res' && entry.uniform) {
                entry.uniform.value.set(res.x, res.y);
            }
        }
    }

    dispose() {
        this.renderTarget.dispose();
        this.postMaterial.dispose();
        this.postMesh.geometry.dispose();
    }
}
