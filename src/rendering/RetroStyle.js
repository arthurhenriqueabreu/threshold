import * as THREE from 'three';

// Coletor central dos parâmetros retro usados pelos vários módulos de
// renderização. Responder por valores derivados das opções retiradas de
// CONFIG.retro de modo que não haja valores mágicos espalhados pelo projeto.
export class RetroStyle {
    constructor(retroConfig) {
        this.retro = retroConfig;
        this.resolution = new THREE.Vector2(1, 1);
        this.setResolution(1, 1);
    }

    get enabled() {
        return this.retro.enabled;
    }

    get targetHeight() {
        return this.retro.internalResolutionHeight || 240;
    }

    // Resolução interna derivada do aspect atual da viewport, mantendo
    // targetHeight fixo e largura calculada (preserva aspect ratio).
    setResolution(width, height) {
        const aspect = height > 0 ? width / height : 16 / 9;
        const h = this.targetHeight;
        const w = Math.max(2, Math.round(h * aspect));
        this.resolution.set(w, h);
        return { width: w, height: h };
    }

    get targetWidth() {
        return this.resolution.x;
    }

    // Uniform oscilante usado pelo vertex snapping. Pequeno; deve dar
    // sensação de bordas instáveis sem tremer violentamente o cenário.
    snapJitter(time) {
        return Math.sin(time * 0.35);
    }
}
