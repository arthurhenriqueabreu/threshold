// Haptics VR sutis e opcionais (fallback-safe).
// Só pulsos curtos em eventos (início de chase, captura). Nunca contínuo.
// Se a API não existir, ignora silenciosamente.

export function getHapticActuator(inputSource, hand = 'right') {
    try {
        const gamepad = inputSource?.gamepad;
        if (!gamepad) return null;
        if (Array.isArray(gamepad.hapticActuators) && gamepad.hapticActuators.length > 0) {
            return gamepad.hapticActuators[0];
        }
        if (gamepad.vibrationActuator) return gamepad.vibrationActuator;
    } catch {}
    return null;
}

export function pulseHaptic(inputSource, { durationMs = 60, intensity = 0.5 } = {}) {
    const actuator = getHapticActuator(inputSource);
    if (!actuator) return false;
    try {
        if (typeof actuator.pulse === 'function') {
            actuator.pulse(Math.max(0, Math.min(1, intensity)), Math.max(1, Math.min(400, durationMs)));
            return true;
        }
        if (typeof actuator.playEffect === 'function') {
            actuator.playEffect('dual-rumble', {
                duration: Math.max(1, Math.min(400, durationMs)),
                strongMagnitude: Math.max(0, Math.min(1, intensity)),
                weakMagnitude: Math.max(0, Math.min(1, intensity * 0.6))
            });
            return true;
        }
    } catch {}
    return false;
}

export class XRHaptics {
    constructor(getSources) {
        // getSources: () => ({ left, right }) com inputSource disponíveis.
        this.getSources = getSources;
        this.enabled = true;
    }

    setEnabled(on) {
        this.enabled = !!on;
    }

    _source(hand) {
        try {
            const sources = this.getSources?.();
            return sources?.[hand]?.inputSource ?? null;
        } catch {
            return null;
        }
    }

    chaseStart() {
        if (!this.enabled) return;
        pulseHaptic(this._source('left'), { durationMs: 60, intensity: 0.4 });
        pulseHaptic(this._source('right'), { durationMs: 60, intensity: 0.4 });
    }

    capture() {
        if (!this.enabled) return;
        pulseHaptic(this._source('left'), { durationMs: 180, intensity: 0.8 });
        pulseHaptic(this._source('right'), { durationMs: 180, intensity: 0.8 });
    }

    blink() {
        if (!this.enabled) return;
        pulseHaptic(this._source('right'), { durationMs: 25, intensity: 0.25 });
    }
}
