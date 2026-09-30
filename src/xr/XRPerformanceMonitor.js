// Monitor leve de performance XR (comfort mitigation: framerate = conforto).
// Mede frame delta em janela móvel ~2–3s; degrada SÓ cosméticos com
// hysteresis/cooldown (sem oscilação high/low a cada segundo).
// NUNCA reduz collision, AI, input ou head tracking.

const WINDOW_S = 2.5;
const BAD_FRAME_MS = 22;
const BAD_RATIO_ENTER = 0.35;
const BAD_RATIO_EXIT = 0.15;
const COOLDOWN_S = 5;

export class XRPerformanceMonitor {
    constructor() {
        this.samples = [];
        this.level = 0; // 0=full, 1=reduced, 2=minimal
        this.cooldown = 0;
        this.lastAvg = 16.6;
        this.lastWorst = 16.6;
    }

    reset() {
        this.samples = [];
        this.level = 0;
        this.cooldown = 0;
    }

    update(delta) {
        const ms = Math.max(0.01, (delta || 0.016) * 1000);
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
        this.samples.push({ t: now, ms });
        while (this.samples.length > 0 && now - this.samples[0].t > WINDOW_S) {
            this.samples.shift();
        }
        this.cooldown = Math.max(0, this.cooldown - (delta || 0.016));
        if (this.samples.length < 10) return this.level;

        let sum = 0;
        let worst = 0;
        let bad = 0;
        for (const s of this.samples) {
            sum += s.ms;
            if (s.ms > worst) worst = s.ms;
            if (s.ms > BAD_FRAME_MS) bad++;
        }
        const avg = sum / this.samples.length;
        const badRatio = bad / this.samples.length;
        this.lastAvg = avg;
        this.lastWorst = worst;

        if (this.cooldown > 0) return this.level;
        if (this.level < 2 && badRatio > BAD_RATIO_ENTER) {
            this.level++;
            this.cooldown = COOLDOWN_S;
        } else if (this.level > 0 && badRatio < BAD_RATIO_EXIT) {
            this.level--;
            this.cooldown = COOLDOWN_S;
        }
        return this.level;
    }

    getStats() {
        return { avgMs: this.lastAvg, worstMs: this.lastWorst, level: this.level };
    }
}
