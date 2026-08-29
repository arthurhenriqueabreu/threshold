import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

// Geração procedural de texturas de baixa resolução para a estética PS1.
// Tamanho padrão vem de CONFIG.retro.textureResolution (128), para que um
// único lugar controle a resolução de todas as texturas do ambiente.

function defaultSize() {
    return CONFIG.retro.textureResolution || 128;
}

function createCanvas(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
}

// Aplica a configuração retro a qualquer CanvasTexture:
// NearestFilter (mag/min), sem mipmaps, anisotropy 1, SRGB.
export function configureRetroTexture(texture) {
    if (CONFIG.retro.nearestFiltering) {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
    }
    if (CONFIG.retro.disableMipmaps) {
        texture.generateMipmaps = false;
    }
    texture.anisotropy = 1;
    texture.colorSpace = THREE.SRGBColorSpace;
    // Força reconfiguração no GPU.
    texture.needsUpdate = true;
    return texture;
}

// Ruído "agrupado": bloca a textura em blocos de `block` pixels para que os
// texels fiquem visíveis (em vez de ruído fino de pixel único).
function addBlockNoise(ctx, size, amount, alpha, block = 2) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const stride = size * 4;
    for (let by = 0; by < size; by += block) {
        for (let bx = 0; bx < size; bx += block) {
            const v = (Math.random() - 0.5) * amount;
            for (let j = 0; j < block && by + j < size; j++) {
                const rowOff = (by + j) * stride;
                for (let i = 0; i < block && bx + i < size; i++) {
                    const idx = rowOff + (bx + i) * 4;
                    data[idx] = Math.min(255, Math.max(0, data[idx] + v));
                    data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + v * 0.7));
                    data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + v * 0.5));
                    data[idx + 3] = alpha;
                }
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// Quantiza as cores de uma textura para uma palette limitada, reforçando o
// aspecto banded/PS1.
function quantizeCanvas(ctx, size, bits = 3) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const levels = (1 << bits) - 1; // ex.: 7 níveis
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / 255 * levels) / levels * 255;
        data[i + 1] = Math.round(data[i + 1] / 255 * levels) / levels * 255;
        data[i + 2] = Math.round(data[i + 2] / 255 * levels) / levels * 255;
    }
    ctx.putImageData(imageData, 0, 0);
}

function finalize(canvas, repeatX, repeatY) {
    const texture = configureRetroTexture(new THREE.CanvasTexture(canvas));
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
}

export function createWallTexture(repeatX = 1, repeatY = 1) {
    const size = defaultSize();
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Identidade amarela de Backrooms (base um pouco mais clara p/ leitura).
    ctx.fillStyle = '#c9b56a';
    ctx.fillRect(0, 0, size, size);

    // Painéis/linhas horizontais largas (pensado em texels visíveis).
    ctx.fillStyle = '#b39a52';
    const stripH = Math.max(2, Math.round(size / 12));
    for (let y = 0; y < size; y += stripH * 3) {
        ctx.fillRect(0, y, size, stripH);
    }
    // Variação vertical sutil entre painéis.
    ctx.fillStyle = 'rgba(132,110,60,0.25)';
    ctx.fillRect(0, 0, size, Math.max(2, Math.round(size / 16)));

    addBlockNoise(ctx, size, 26, 255, 3);
    quantizeCanvas(ctx, size, 4);

    return finalize(canvas, repeatX, repeatY);
}

export function createCarpetTexture(repeatX = 1, repeatY = 1) {
    const size = defaultSize();
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#7d6f45';
    ctx.fillRect(0, 0, size, size);

    // Padrão de carpete tipo parquet quadriculado, baixa res.
    ctx.fillStyle = 'rgba(66,58,38,0.30)';
    const cell = Math.max(2, Math.round(size / 8));
    for (let y = 0; y < size; y += cell) {
        for (let x = 0; x < size; x += cell) {
            if (((x / cell) + (y / cell)) % 2 === 0) {
                ctx.fillRect(x, y, cell * 0.6, cell * 0.6);
            }
        }
    }

    addBlockNoise(ctx, size, 36, 255, 3);
    quantizeCanvas(ctx, size, 3);

    return finalize(canvas, repeatX, repeatY);
}

export function createCeilingTexture(repeatX = 1, repeatY = 1) {
    const size = defaultSize();
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#d6d0b8';
    ctx.fillRect(0, 0, size, size);

    // Grade de placas do teto — grid simples.
    ctx.strokeStyle = '#a8a189';
    ctx.lineWidth = Math.max(2, Math.round(size / 64));
    const half = size / 2;
    ctx.strokeRect(0, 0, half, half);
    ctx.strokeRect(half, 0, half, half);
    ctx.strokeRect(0, half, half, half);
    ctx.strokeRect(half, half, half, half);

    addBlockNoise(ctx, size, 20, 255, 3);
    quantizeCanvas(ctx, size, 4);

    return finalize(canvas, repeatX, repeatY);
}
