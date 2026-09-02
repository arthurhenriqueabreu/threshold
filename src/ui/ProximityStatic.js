export class ProximityStatic {
    constructor(canvasId = 'proximity-static') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: true }) : null;
        this.raf = null;
        this.running = false;
        this.w = 200;
        this.h = 150;
        this.buf = null;
        this.targetIntensity = 0;
        this.currentIntensity = 0;
        this.onResize = this.onResize.bind(this);
    }

    onResize() {
        if (!this.canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.2);
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
        this.buf = new Uint8ClampedArray(this.w * this.h * 4);
        const loop = () => {
            if (!this.running) return;
            this.draw();
            this.raf = requestAnimationFrame(loop);
        };
        loop();
    }

    stop() {
        this.running = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
        window.removeEventListener('resize', this.onResize);
        this.targetIntensity = 0;
        this.currentIntensity = 0;
        if (this.canvas) this.canvas.style.opacity = '0';
        if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setIntensity(v) {
        this.targetIntensity = Math.max(0, Math.min(1, v));
    }

    draw() {
        // smooth lerp 0.08
        this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.09;
        if (this.currentIntensity < 0.001 && this.targetIntensity < 0.001) {
            this.canvas.style.opacity = '0';
            // still clear to avoid ghost
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        // discreto: 0->0, 1->0.18 (só endgame fica opaco total via StaticEffect)
        const opacity = this.currentIntensity * 0.18;
        this.canvas.style.opacity = String(opacity);

        // intensity drives noise density and glitch frequency
        const buf = this.buf;
        const intens = this.currentIntensity;
        // base threshold: baixa densidade para ficar discreto
        for (let i = 0; i < buf.length; i += 4) {
            // mais intens => um pouco mais pixels claros, mas ainda esparso
            const thresh = 0.72 - intens * 0.12; // 0.72 -> 0.60 (bem mais raro)
            const isBright = Math.random() > thresh;
            const v = isBright ? (160 + Math.random() * 60) : (12 + Math.random() * 30);
            // desaturação leve
            const jitter = (1 - intens) * 6;
            buf[i] = v + (Math.random() * jitter - jitter * 0.5);
            buf[i + 1] = v + (Math.random() * jitter - jitter * 0.5);
            buf[i + 2] = v + (Math.random() * jitter - jitter * 0.5);
            buf[i + 3] = 255;
        }
        // glitch bars bem mais raro e sutil
        const glitchChance = 0.02 + intens * 0.06;
        if (Math.random() < glitchChance) {
            const y = Math.floor(Math.random() * this.h);
            const hh = 1 + Math.floor(Math.random() * (2 + intens * 4));
            for (let yy = y; yy < Math.min(this.h, y + hh); yy++) {
                for (let x = 0; x < this.w; x++) {
                    const idx = (yy * this.w + x) * 4;
                    const nv = 210 + Math.random() * 45;
                    buf[idx] = nv; buf[idx + 1] = nv; buf[idx + 2] = nv;
                }
            }
        }
        // vertical tearing só muito perto e raro
        if (intens > 0.85 && Math.random() < (intens - 0.82) * 0.15) {
            const x = Math.floor(Math.random() * this.w);
            const ww = 1 + Math.floor(Math.random() * 2);
            for (let xx = x; xx < Math.min(this.w, x + ww); xx++) {
                for (let y = 0; y < this.h; y++) {
                    const idx = (y * this.w + xx) * 4;
                    buf[idx] = 255 - buf[idx];
                    buf[idx + 1] = 255 - buf[idx + 1];
                    buf[idx + 2] = 255 - buf[idx + 2];
                }
            }
        }

        const tmp = document.createElement('canvas');
        tmp.width = this.w;
        tmp.height = this.h;
        const tctx = tmp.getContext('2d');
        tctx.putImageData(new ImageData(buf, this.w, this.h), 0, 0);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // draw scaled
        this.ctx.globalAlpha = 1;
        this.ctx.drawImage(tmp, 0, 0, this.canvas.width, this.canvas.height);

        // flash bem sutil
        if (Math.random() < 0.01 + intens * 0.025) {
            this.ctx.fillStyle = `rgba(255,255,255,${0.015 + intens * 0.025})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        // scanlines só quando muito perto e bem transparente
        if (intens > 0.75) {
            this.ctx.fillStyle = `rgba(0,0,0,${0.03 + intens * 0.02})`;
            for (let y = 0; y < this.canvas.height; y += 8) {
                this.ctx.fillRect(0, y, this.canvas.width, 1);
            }
        }
    }
}
