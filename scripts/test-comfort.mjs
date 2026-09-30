// Testes lógicos de VR comfort (sem hardware): profiles, vignette,
// blink edge/cooldown, affine off, flicker XR, desktop intacto.
globalThis.document = {
    addEventListener() {}, removeEventListener() {},
    pointerLockElement: null, exitPointerLock() {},
    getElementById() { return null; }, querySelectorAll() { return []; },
    createElement() {
        return { width: 0, height: 0, getContext: () => null, classList: { add() {}, remove() {} }, style: {} };
    }
};
globalThis.window = globalThis;
try { Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true }); } catch {}
const _store = {};
globalThis.localStorage = {
    getItem: (k) => (k in _store ? _store[k] : null),
    setItem: (k, v) => { _store[k] = String(v); },
    removeItem: (k) => { delete _store[k]; }
};
globalThis.requestAnimationFrame = (fn) => 0;
globalThis.cancelAnimationFrame = () => {};

const { CONFIG } = await import('../src/core/Config.js');
const { VRComfortManager } = await import('../src/xr/VRComfort.js');
const { VRScreenEffects } = await import('../src/xr/VRScreenEffects.js');
const { XRPerformanceMonitor } = await import('../src/xr/XRPerformanceMonitor.js');
const { FlickeringLight } = await import('../src/world/Lighting.js');
const { InputManager } = await import('../src/systems/InputManager.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`PASS ${name}`); }
    else { fail++; console.error(`FAIL ${name} ${extra}`); }
};

// 6. profiles trocam speeds (comfort / standard / intense)
{
    const c = new VRComfortManager();
    c.setProfile('comfort');
    let eff = c.getEffectiveConfig();
    ok('comfort walk 1.7 / sprint 2.7', eff.walkSpeed === 1.7 && eff.sprintSpeed === 2.7, JSON.stringify({ w: eff.walkSpeed, s: eff.sprintSpeed }));
    c.setProfile('standard');
    eff = c.getEffectiveConfig();
    ok('standard walk 2.2 / sprint 3.4', eff.walkSpeed === 2.2 && eff.sprintSpeed === 3.4, JSON.stringify({ w: eff.walkSpeed, s: eff.sprintSpeed }));
    c.setProfile('intense');
    eff = c.getEffectiveConfig();
    ok('intense walk 2.6 / sprint 4.0', eff.walkSpeed === 2.6 && eff.sprintSpeed === 4.0, JSON.stringify({ w: eff.walkSpeed, s: eff.sprintSpeed }));
}
// 10. persistência: default standard, restaura último preset
{
    for (const k of Object.keys(_store)) delete _store[k];
    const a = new VRComfortManager();
    ok('default standard', a.profileName === 'standard', `got ${a.profileName}`);
    a.setProfile('comfort');
    const b = new VRComfortManager();
    ok('restaura comfort salvo', b.profileName === 'comfort', `got ${b.profileName}`);
}
// 9/10. vignette = 0 parado; cresce com velocidade; transição suave
{
    const fx = new VRScreenEffects(null);
    fx.setLocomotionVignette(0, 0.45, true);
    for (let i = 0; i < 60; i++) fx.update(0, 0.016);
    ok('vignette 0 parado', Math.abs(fx.comfortVignette) < 0.005, `got ${fx.comfortVignette}`);
    fx.setLocomotionVignette(1, 0.45, true);
    fx.update(0, 0.016);
    const afterOne = fx.comfortVignette;
    ok('vignette transição suave (não salto)', afterOne > 0 && afterOne < 0.45, `got ${afterOne}`);
    for (let i = 0; i < 120; i++) fx.update(0, 0.016);
    ok('vignette converge → strength', Math.abs(fx.comfortVignette - 0.45) < 0.02, `got ${fx.comfortVignette}`);
    fx.setLocomotionVignette(0.3, 0.45, true);
    for (let i = 0; i < 120; i++) fx.update(0, 0.016);
    ok('stick parcial → pouca vignette', fx.comfortVignette < 0.15, `got ${fx.comfortVignette}`);
    // curva XR de proximidade: pow(t,1.5) * strength evita efeito cedo
    fx.setProximityIntensity(0.2, 0.55);
    ok('proximidade baixa atenuada', fx.proximityTarget < 0.06, `got ${fx.proximityTarget}`);
    fx.setProximityIntensity(1, 0.55);
    ok('proximidade máxima preservada', Math.abs(fx.proximityTarget - 0.55) < 0.001, `got ${fx.proximityTarget}`);
}
// 11/12. blink só em edge + cooldown; sem rajada segurando
{
    const im = new InputManager();
    im.setLocomotionMode('blink');
    const btn = (p) => ({ pressed: p });
    const grip = [btn(false), btn(true), btn(false), btn(false), btn(false), btn(false)];
    const none = [btn(false), btn(false), btn(false), btn(false), btn(false), btn(false)];
    const mk = (arr) => ({ controller: {}, inputSource: { gamepad: { axes: [0, 0, 0, 0], buttons: arr } } });
    im.xrSources.left = mk(grip);
    im.xrSources.right = mk(none);
    im.updateXR(0.016);
    const first = im.consumeBlinkStep();
    ok('blink dispara em edge', first && Math.abs(first.distance - 1.0) < 0.001, JSON.stringify(first));
    im.updateXR(0.016); // ainda segurado: sem rajada
    im.updateXR(0.016);
    ok('segurando não re-dispara', im.consumeBlinkStep() === null);
    im.xrSources.left = mk(none); // solta
    for (let i = 0; i < 40; i++) im.updateXR(0.016); // espera cooldown
    im.xrSources.left = mk(grip); // pressiona de novo
    im.updateXR(0.016);
    ok('re-pressiona após cooldown dispara', im.consumeBlinkStep() !== null);
    // continuous não gera blink
    const im2 = new InputManager();
    im2.xrSources.left = mk(grip);
    im2.xrSources.right = mk(none);
    im2.updateXR(0.016);
    ok('continuous não gera blink', im2.consumeBlinkStep() === null);
}
// 14. PS1 seguro em VR (XR-safe)
{
    ok('vrSafe affineMapping off', CONFIG.retro.vrSafe.affineMapping === false);
    ok('vrSafe snap off', CONFIG.retro.vrSafe.vertexSnapping === false && CONFIG.retro.vrSafe.vertexSnapStrength === 0);
    ok('vrSafe grade PS1 alinhado', CONFIG.retro.vrSafe.colorQuantization === true && CONFIG.retro.vrSafe.quantizationStrength > 0 && CONFIG.retro.vrSafe.quantizationStrength < 0.5 && CONFIG.retro.vrSafe.postGamma === CONFIG.retro.postGamma);
    ok('vrSafe dither de tela off', CONFIG.retro.vrSafe.dithering === false);
    ok('desktop affine intacto', CONFIG.retro.affineMapping === true && CONFIG.retro.affineStrength === 0.3);
}
// 15. flicker XR usa scale (sem quedas 100%→5% por frame)
{
    const light = { intensity: 3.0 };
    const fl = new FlickeringLight(light, 1.8);
    fl.setXRScale(0.45, true);
    fl.triggerFlicker(1.0);
    let minI = Infinity;
    let maxJump = 0;
    let prev = light.intensity;
    for (let i = 0; i < 60; i++) {
        fl.update(1 / 60);
        minI = Math.min(minI, light.intensity);
        maxJump = Math.max(maxJump, Math.abs(light.intensity - prev));
        prev = light.intensity;
    }
    ok('XR nunca apaga a 5%', minI > 3.0 * 0.1, `min=${minI}`);
    ok('XR sem saltos frenéticos', maxJump < 3.0 * 0.6, `maxJump=${maxJump}`);
}
// 16. desktop mantém valores originais
{
    ok('desktop speed 3.5/6', CONFIG.player.speed === 3.5 && CONFIG.player.sprintSpeed === 6);
    ok('desktop retro 240p', CONFIG.retro.internalResolutionHeight === 240);
    ok('desktop dithering on', CONFIG.retro.dithering === true);
    ok('hard flicker 1.8 intacto', CONFIG.difficulty.hard.flickerIntensity === 1.8);
}
// perf monitor: hysteresis (sem oscilação)
{
    const pm = new XRPerformanceMonitor();
    for (let i = 0; i < 200; i++) pm.update(0.033); // ~30ms sustentado
    ok('perf degrada sob carga', pm.level >= 1, `level=${pm.level}`);
    const lvl = pm.level;
    for (let i = 0; i < 5; i++) pm.update(0.033);
    ok('cooldown evita oscilação', pm.level === lvl, `level=${pm.level} prev=${lvl}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
