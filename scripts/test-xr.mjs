// Testes lógicos XR (sem hardware): pause toggle, entry-pending, grip,
// both-grips sprint, polling contínuo, controller ray.
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
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.requestAnimationFrame = (fn) => 0;
globalThis.cancelAnimationFrame = () => {};

const { InputManager } = await import('../src/systems/InputManager.js');
const { InteractionSystem } = await import('../src/interactions/InteractionSystem.js');
const { PickupItem } = await import('../src/interactions/PickupItem.js');
const { Flashlight } = await import('../src/player/Flashlight.js');
const THREE = await import('three');

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log(`PASS ${name}`); } else { fail++; console.error(`FAIL ${name}`); } };

function fakeSource(buttons) {
    return { controller: { getWorldPosition() {} }, inputSource: { gamepad: { axes: [0, 0, 0, 0], buttons } } };
}
const btn = (pressed) => ({ pressed });

// 1. grip locomotion gera move input (left grip)
{
    const im = new InputManager();
    im.xrSources.left = fakeSource([btn(false), btn(true), btn(false), btn(false), btn(false), btn(false)]);
    im.xrSources.right = fakeSource([btn(false), btn(false), btn(false), btn(false), btn(false), btn(false)]);
    for (let i = 0; i < 20; i++) im.updateXR(0.016);
    const mv = im.getXRMoveInput();
    ok('grip-left gera frente (z<0)', mv.z < -0.2);
    ok('grip-left sozinho não é sprint', im.isXRSprinting() === false);
}
// 2. both grips = sprint
{
    const im = new InputManager();
    const both = [btn(false), btn(true), btn(false), btn(false), btn(false), btn(false)];
    im.xrSources.left = fakeSource(both);
    im.xrSources.right = fakeSource(both);
    for (let i = 0; i < 20; i++) im.updateXR(0.016);
    ok('both-grips sprint', im.isXRSprinting() === true);
    ok('both-grips gera frente', im.getXRMoveInput().z < -0.2);
}
// 3. release = para (decaimento do smoothing em ~0.15s)
{
    const im = new InputManager();
    im.xrSources.left = fakeSource([btn(false), btn(true)]);
    im.xrSources.right = fakeSource([btn(false), btn(false)]);
    im.updateXR(0.016);
    im.xrSources.left = fakeSource([btn(false), btn(false)]);
    for (let i = 0; i < 30; i++) im.updateXR(0.016);
    const mv = im.getXRMoveInput();
    ok('release para (|z|~0)', Math.abs(mv.z) < 0.05);
}
// 4. thumbstick fallback strafe
{
    const im = new InputManager();
    im.xrSources.left = { controller: {}, inputSource: { gamepad: { axes: [0, 0, 0.9, 0.1], buttons: [] } } };
    im.xrSources.right = { controller: {}, inputSource: { gamepad: { axes: [0, 0, 0, 0], buttons: [] } } };
    im.updateXR(0.016);
    ok('left-stick strafe (x>0)', im.getXRMoveInput().x > 0.5);
}
// 5. snap turn: uma emissão por inclinação; exige recentrar antes do próximo
{
    const im = new InputManager();
    im.setTurnMode('snap');
    let turns = [];
    im.onXRAction('turn', (direction) => turns.push(direction));
    const stick = (x) => ({ controller: {}, inputSource: { gamepad: { axes: [0, 0, x, 0], buttons: [] } } });
    im.xrSources.right = stick(0.95);
    for (let i = 0; i < 40; i++) im.updateXR(0.016);
    ok('snap turn segurado emite uma vez', turns.length === 1 && turns[0] === -1);
    im.xrSources.right = stick(0);
    im.updateXR(0.016);
    im.xrSources.right = stick(0.95);
    im.updateXR(0.016);
    ok('snap turn re-arma após recentrar', turns.length === 2 && turns[1] === -1);
}
// 5b. smooth turn: stick parcial emite valor contínuo, sem flick de 30°
{
    const im = new InputManager();
    im.setTurnMode('smooth');
    const values = [];
    im.onXRAction('turn-smooth', ({ value }) => values.push(value));
    im.xrSources.right = { controller: {}, inputSource: { gamepad: { axes: [0, 0, 0.55, 0], buttons: [] } } };
    im.updateXR(0.016);
    ok('smooth turn emite valor parcial', values.length === 1 && values[0] > 0 && values[0] < 1);
}
// 5c. pickup pequeno perto da mão continua coletável se o ray passar ao lado
{
    const cam = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    const sys = new InteractionSystem(cam);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial()));
    root.position.set(0.5, 1.2, 0);
    root.updateMatrixWorld(true);
    const pickup = new PickupItem(root, { id: 'test-pickup', prompt: '[E] PEGAR' });
    let collected = 0;
    pickup.onPickup = () => { collected++; return true; };
    sys.register(pickup);
    const ctrl = new THREE.Object3D();
    ctrl.position.set(0, 1.2, 0);
    ctrl.updateMatrixWorld(true);
    sys.tryInteract(ctrl);
    ok('pickup próximo usa grab assist', collected === 1 && pickup.collected === true);
}
// 6. B/Y (botão 5) emite pause com edge (1x por pressão)
{
    const im = new InputManager();
    let count = 0;
    im.onXRAction('pause', () => count++);
    const mk = (p) => [btn(false), btn(false), btn(false), btn(false), btn(false), btn(p)];
    im.xrSources.right = fakeSource(mk(true));
    im.xrSources.left = fakeSource(mk(false));
    im.updateXR(0.016);
    im.updateXR(0.016); // segurado: não re-emite
    ok('pause edge emite 1x', count === 1);
    im.xrSources.right = fakeSource(mk(false));
    im.updateXR(0.016);
    im.xrSources.right = fakeSource(mk(true));
    im.updateXR(0.016);
    ok('pause re-emite após soltar', count === 2);
}
// 7. controller ray gera target correto (não usa gaze)
{
    const cam = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    cam.position.set(0, 1.7, 5);
    cam.lookAt(0, 1.7, 0);
    const sys = new InteractionSystem(cam);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(0, 1.7, 0);
    mesh.updateMatrixWorld(true);
    let interacted = 0;
    const interactable = { meshes: [mesh], active: true, getPrompt: () => 'PEGAR', canInteract: () => true, interact: () => { interacted++; } };
    sys.register(interactable);
    // controller em (0,1.7,2) apontando -Z: deve acertar
    const ctrl = new THREE.Object3D();
    ctrl.position.set(0, 1.7, 2);
    ctrl.rotation.set(0, 0, 0);
    ctrl.updateMatrixWorld(true);
    sys.update(); // gaze desktop (não deve quebrar)
    const t = sys.updateFromXRController(ctrl);
    ok('controller ray acerta objeto à frente', t === interactable);
    // O gatilho esquerdo deve usar o ray da própria mão, não o alvo anterior.
    const leftCtrl = new THREE.Object3D();
    leftCtrl.position.set(0, 1.7, -2);
    leftCtrl.rotation.set(0, Math.PI, 0);
    leftCtrl.updateMatrixWorld(true);
    sys.tryInteract(leftCtrl);
    ok('gatilho esquerdo interage pelo próprio ray', interacted === 1);
    // virado p/ trás: não acerta
    ctrl.rotation.set(0, Math.PI, 0);
    ctrl.updateMatrixWorld(true);
    const t2 = sys.updateFromXRController(ctrl);
    ok('controller ray virado não acerta', t2 === null || t2 === undefined || t2 !== interactable);
}
// 7. entry-pending: lógica de guarda (Game.onPointerLockChange retorna cedo)
{
    // Replica a guarda: _xrEntryPending=true → sem pause.
    const gameLike = { _xrEntryPending: true, paused: false, pause() { this.paused = true; } };
    const onLockChange = () => { if (gameLike._xrEntryPending) return; gameLike.pause(); };
    onLockChange();
    ok('entry-pending não pausa', gameLike.paused === false);
    gameLike._xrEntryPending = false;
    onLockChange();
    ok('sem pending pausa normal', gameLike.paused === true);
}
// 8. lanterna XR usa a pose da mão, não a altura da câmera
{
    const camera = new THREE.Object3D();
    const controller = new THREE.Object3D();
    const flashlight = new Flashlight(camera);
    flashlight.setXRController(controller);
    flashlight.toggle();
    ok('lanterna XR segue o controle', flashlight.group.parent === controller);
    ok('lanterna XR não fica 1.55m acima da mão', flashlight.light.position.y < 0.1);
    ok('lanterna XR aponta no eixo do controle', flashlight.target.position.z < -3.9);
    flashlight.dispose();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
