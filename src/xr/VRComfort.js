import { CONFIG } from '../core/Config.js';

// Gerenciador de comfort profiles VR (comfort mitigation, não diagnóstico).
// Perfis: comfort (conforto) | standard (padrão, default) | intense (intenso).
// Persistência em localStorage; aplicação em tempo real sem restart.

export const COMFORT_PROFILE_ORDER = ['comfort', 'standard', 'intense'];

const PROFILE_KEY = 'threshold_vrComfortProfile';
const SETTINGS_KEY = 'threshold_vrComfort';

function safeStorage() {
    try {
        if (typeof localStorage !== 'undefined') return localStorage;
    } catch {}
    return null;
}

export function getComfortProfileDef(name) {
    const profiles = CONFIG.xr?.comfortProfiles ?? {};
    return profiles[name] ?? profiles.standard ?? null;
}

export function resolveComfortProfileName(name) {
    const profiles = CONFIG.xr?.comfortProfiles ?? {};
    if (name && profiles[name]) return name;
    return 'standard';
}

export class VRComfortManager {
    constructor() {
        this.profileName = 'standard';
        // Overrides do menu (null = valor do profile).
        this.overrides = {
            vignette: null,
            turnMode: null,
            visualFilter: null,
            lightingMode: null,
            snapTurnAngle: null,
            speedScale: null,
            effectsScale: null,
            locomotionMode: null
        };
        this.listeners = new Set();
        this.load();
    }

    load() {
        const storage = safeStorage();
        try {
            const savedProfile = storage?.getItem(PROFILE_KEY);
            this.profileName = resolveComfortProfileName(savedProfile || CONFIG.xr?.comfortProfile || 'standard');
        } catch {
            this.profileName = 'standard';
        }
        try {
            const raw = storage?.getItem(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                for (const key of Object.keys(this.overrides)) {
                    if (parsed[key] !== undefined) this.overrides[key] = parsed[key];
                }
                if (parsed.profileName) this.profileName = resolveComfortProfileName(parsed.profileName);
            }
        } catch {}
        return this;
    }

    save() {
        const storage = safeStorage();
        try {
            storage?.setItem(PROFILE_KEY, this.profileName);
            storage?.setItem(SETTINGS_KEY, JSON.stringify({ profileName: this.profileName, ...this.overrides }));
        } catch {}
    }

    onChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _emit() {
        for (const fn of this.listeners) {
            try { fn(this.getEffectiveConfig()); } catch {}
        }
    }

    setProfile(name) {
        const resolved = resolveComfortProfileName(name);
        if (resolved === this.profileName) return this.getEffectiveConfig();
        this.profileName = resolved;
        this.save();
        this._emit();
        return this.getEffectiveConfig();
    }

    cycleProfile(direction = 1) {
        const idx = COMFORT_PROFILE_ORDER.indexOf(this.profileName);
        const next = COMFORT_PROFILE_ORDER[(idx + direction + COMFORT_PROFILE_ORDER.length) % COMFORT_PROFILE_ORDER.length];
        return this.setProfile(next);
    }

    setOverride(key, value) {
        if (!(key in this.overrides)) return this.getEffectiveConfig();
        this.overrides[key] = value;
        this.save();
        this._emit();
        return this.getEffectiveConfig();
    }

    getProfile() {
        return getComfortProfileDef(this.profileName);
    }

    // Config efetiva: profile + overrides (tempo real, sem restart).
    getEffectiveConfig() {
        const profile = this.getProfile() ?? {};
        const ov = this.overrides;
        const speedScale = ov.speedScale ?? 1;
        const reduced = speedScale < 1;
        return {
            profileName: this.profileName,
            walkSpeed: (profile.walkSpeed ?? 2.2) * (reduced ? 0.75 : 1),
            sprintSpeed: (profile.sprintSpeed ?? 3.4) * (reduced ? 0.75 : 1),
            acceleration: profile.acceleration ?? 6.5,
            deceleration: profile.deceleration ?? 8.5,
            vignette: ov.vignette ?? profile.vignette ?? true,
            vignetteStrength: profile.vignetteStrength ?? 0.45,
            proximityVisualStrength: (profile.proximityVisualStrength ?? 0.55)
                * (ov.effectsScale === 'reduced' ? 0.6 : 1),
            flickerScale: profile.flickerScale ?? 0.65,
            effectsScale: ov.effectsScale === 'reduced' ? 0.6 : 1,
            turnMode: ov.turnMode ?? CONFIG.xr?.turnMode ?? 'smooth',
            visualFilter: ov.visualFilter ?? CONFIG.xr?.visualFilter ?? 'ps1',
            lightingMode: ov.lightingMode ?? CONFIG.xr?.lightingMode ?? 'ps1',
            snapTurnAngle: ov.snapTurnAngle ?? CONFIG.xr?.snapTurnAngle ?? 30,
            locomotionMode: ov.locomotionMode ?? CONFIG.xr?.locomotionMode ?? 'continuous'
        };
    }
}
