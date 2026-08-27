import * as THREE from 'three';

function createCanvas(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    return canvas;
}

function addNoise(ctx, size, amount, alpha) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
        data[i + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);
}

export function createWallTexture(repeatX = 1, repeatY = 1) {
    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#b3a055';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#a89449';
    for (let y = 0; y < size; y += 32) {
        ctx.fillRect(0, y, size, 2);
    }

    addNoise(ctx, size, 26, 255);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createCarpetTexture(repeatX = 1, repeatY = 1) {
    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6e6238';
    ctx.fillRect(0, 0, size, size);
    addNoise(ctx, size, 40, 255);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

export function createCeilingTexture(repeatX = 1, repeatY = 1) {
    const size = 256;
    const canvas = createCanvas(size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#c9c2a8';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#9a937d';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, size / 2, size / 2);
    ctx.strokeRect(size / 2, 0, size / 2, size / 2);
    ctx.strokeRect(0, size / 2, size / 2, size / 2);
    ctx.strokeRect(size / 2, size / 2, size / 2, size / 2);

    addNoise(ctx, size, 18, 255);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
