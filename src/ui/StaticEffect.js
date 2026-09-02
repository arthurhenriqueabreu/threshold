export class StaticEffect {
    constructor(canvasId = 'static-canvas') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;
        this.raf = null;
        this.running = false;
        this.w = 160;
        this.h = 120;
        this.imageData = null;
        this.buf = null;
        this.onResize = this.onResize.bind(this);
    }

    onResize() {
        if (!this.canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.canvas.width = Math.floor(window.innerWidth * dpr);
        this.canvas.height = Math.floor(window.innerHeight * dpr);
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
    }

    start() {
        if (!this.canvas || !this.ctx) return;
        if (this.running) return;
        this.running = true;
        this.onResize();
        window.addEventListener('resize', this.onResize);
        // low-res buffer for performance
        this.buf = new Uint8ClampedArray(this.w * this.h * 4);
        const loop = () => {
            if (!this.running) return;
            this.drawFrame();
            this.raf = requestAnimationFrame(loop);
        };
        loop();
    }

    stop() {
        this.running = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
        window.removeEventListener('resize', this.onResize);
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawFrame() {
        // Fill low-res noise
        const buf = this.buf;
        for (let i = 0; i < buf.length; i += 4) {
            const v = Math.random() > 0.52 ? (180 + Math.random() * 75) : (10 + Math.random() * 55);
            // slight color tint variation for VHS feel
            const r = v + (Math.random() * 12 - 6);
            const g = v + (Math.random() * 10 - 5);
            const b = v + (Math.random() * 14 - 7);
            buf[i] = r;
            buf[i + 1] = g;
            buf[i + 2] = b;
            buf[i + 3] = 255;
        }
        // occasional horizontal glitch bar
        if (Math.random() < 0.18) {
            const y = Math.floor(Math.random() * this.h);
            const hh = 1 + Math.floor(Math.random() * 4);
            for (let yy = y; yy < Math.min(this.h, y + hh); yy++) {
                for (let x = 0; x < this.w; x++) {
                    const idx = (yy * this.w + x) * 4;
                    const nv = 220 + Math.random() * 35;
                    buf[idx] = nv; buf[idx + 1] = nv; buf[idx + 2] = nv;
                }
            }
        }
        // create temporary low-res canvas
        const tmp = document.createElement('canvas');
        tmp.width = this.w;
        tmp.height = this.h;
        const tctx = tmp.getContext('2d');
        const img = new ImageData(buf, this.w, this.h);
        tctx.putImageData(img, 0, 0);
        // upscale to main canvas with pixelated stretch
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);
        // occasional brightness flash
        if (Math.random() < 0.06) {
            this.ctx.fillStyle = `rgba(255,255,255,${0.07 + Math.random() * 0.08})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}
