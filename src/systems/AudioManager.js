export class AudioManager {
    constructor() {
        this.context = null;
        this.master = null;
        this.ambientNodes = [];
        this.enabled = true;
        this.ambientLayers = {
            hum: [],
            drone: [],
            whisper: [],
            distant: []
        };
    }

    init() {
        if (this.context) return;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.master = this.context.createGain();
            this.master.gain.value = 0.3;
            this.master.connect(this.context.destination);
        } catch (e) {
            console.warn('Áudio indisponível.', e);
            this.enabled = false;
        }
    }

    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    startAmbient(intensity = 1.0) {
        if (!this.enabled || this.ambientLayers.hum.length > 0) return;

        this.playHum(110, 0.04 * intensity);
        this.playHum(220, 0.02 * intensity);
        this.playHum(55, 0.015 * intensity);

        this.playDrone(80, 0.03 * intensity);
        this.playDrone(165, 0.015 * intensity);

        this.startWhispers(0.08 * intensity);
        this.startDistantEvents(0.05 * intensity);
    }

    playHum(frequency, gainValue) {
        const ctx = this.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = frequency;
        gain.gain.value = gainValue;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.ambientLayers.hum.push({ osc, gain, filter });
    }

    playDrone(frequency, gainValue) {
        const ctx = this.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.value = gainValue;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency;
        filter.Q.value = 10;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.ambientLayers.drone.push({ osc, gain, filter });
    }

    startWhispers(baseGain) {
        const playWhisper = () => {
            if (!this.enabled) return;
            const ctx = this.context;
            const bufferSize = ctx.sampleRate * (2 + Math.random() * 3);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.8)) * 0.1;
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800 + Math.random() * 1200;
            filter.Q.value = 5;
            const gain = ctx.createGain();
            gain.gain.value = baseGain * (0.3 + Math.random() * 0.5);
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.master);
            source.start();
            this.ambientLayers.whisper.push({ source, gain });
            const nextDelay = 8000 + Math.random() * 20000;
            setTimeout(playWhisper, nextDelay);
        };
        setTimeout(playWhisper, 5000 + Math.random() * 10000);
    }

    startDistantEvents(baseGain) {
        const playEvent = () => {
            if (!this.enabled) return;
            const ctx = this.context;
            const type = Math.random();
            if (type < 0.4) {
                this.playDistantFootsteps(ctx, baseGain);
            } else if (type < 0.7) {
                this.playDistantBang(ctx, baseGain);
            } else {
                this.playDistantHum(ctx, baseGain);
            }
            const nextDelay = 15000 + Math.random() * 30000;
            setTimeout(playEvent, nextDelay);
        };
        setTimeout(playEvent, 20000 + Math.random() * 20000);
    }

    playDistantFootsteps(ctx, baseGain) {
        const steps = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < steps; i++) {
            setTimeout(() => {
                const bufferSize = ctx.sampleRate * 0.15;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) {
                    data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.05)) * 0.08;
                }
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 200;
                const gain = ctx.createGain();
                gain.gain.value = baseGain * 0.4;
                source.connect(filter);
                filter.connect(gain);
                gain.connect(this.master);
                source.start();
            }, i * (200 + Math.random() * 300));
        }
    }

    playDistantBang(ctx, baseGain) {
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15)) * 0.12;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 150;
        const gain = ctx.createGain();
        gain.gain.value = baseGain * 0.5;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        source.start();
    }

    playDistantHum(ctx, baseGain) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 60 + Math.random() * 40;
        gain.gain.value = baseGain * 0.3;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 100;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(ctx.currentTime + 2 + Math.random() * 3);
    }

    sfx(name) {
        if (!this.enabled) return;
        switch (name) {
            case 'pickup': this.blip(660, 0.15, 0.12); break;
            case 'switch': this.blip(220, 0.25, 0.2, 'square'); break;
            case 'door': this.slide(); break;
            case 'denied': this.blip(110, 0.3, 0.18, 'square'); break;
            case 'portal': this.sweep(80, 500, 1.5); break;
            case 'power': this.sweep(60, 180, 0.8); break;
            case 'ui': this.blip(440, 0.08, 0.08); break;
            case 'distant': this.playRandomDistant(); break;
            case 'whisper': this.whisperBlip(); break;
            default: break;
        }
    }

    whisperBlip() {
        const ctx = this.context;
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600 + Math.random() * 800;
        osc.frequency.exponentialRampToValueAtTime(200 + Math.random() * 300, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(ctx.currentTime + 0.75);
    }

    playRandomDistant() {
        const ctx = this.context;
        const type = Math.random();
        if (type < 0.5) {
            this.playDistantBang(ctx, 0.08);
        } else {
            this.playDistantFootsteps(ctx, 0.06);
        }
    }

    blip(frequency, duration, gainValue, type = 'sine') {
        const ctx = this.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(gainValue, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    sweep(from, to, duration) {
        const ctx = this.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(from, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    slide() {
        const ctx = this.context;
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        const gain = ctx.createGain();
        gain.gain.value = 0.25;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        source.start();
    }

    stopAll() {
        for (const layer of Object.values(this.ambientLayers)) {
            for (const node of layer) {
                try {
                    if (node.osc) node.osc.stop();
                    if (node.source) node.source.stop();
                } catch (e) { /* noop */ }
            }
        }
        this.ambientLayers = { hum: [], drone: [], whisper: [], distant: [] };
    }

    setMasterVolume(vol) {
        if (this.master) this.master.gain.value = vol;
    }
}