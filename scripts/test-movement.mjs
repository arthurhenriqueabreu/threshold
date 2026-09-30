// Testes lógicos de locomotion (sem hardware): magnitude analógica,
// aceleração/desaceleração progressiva, sprint gradual, desktop intacto.
const { PlayerMovement } = await import('../src/player/PlayerMovement.js');
const { CONFIG } = await import('../src/core/Config.js');
const { Level } = await import('../src/world/Level.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`PASS ${name}`); }
    else { fail++; console.error(`FAIL ${name} ${extra}`); }
};
const openWorld = { isSolidAt: () => false };

const speedOf = (m) => Math.hypot(m.currentVelocity.x, m.currentVelocity.z);

// 1. magnitude analógica preservada: stick 0.3 → ~30% da velocidade
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(1.0, { x: 0, z: -0.3 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 50 });
    ok('stick 0.3 → ~30% walk', Math.abs(speedOf(m) - 0.6) < 0.02, `got ${speedOf(m)}`);
}
// 2. gripSmooth 0.2 NÃO produz velocidade máxima (bug do normalize)
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(1.0, { x: 0, z: -0.05 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 50 });
    ok('input 0.05 → 0.1 (não 2.0)', Math.abs(speedOf(m) - 0.1) < 0.02, `got ${speedOf(m)}`);
}
// 3. aceleração progressiva (não instantânea)
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(0.1, { x: 0, z: -1 }, false, { walk: 2, sprint: 4 }, { acceleration: 2, deceleration: 10 });
    ok('accel 2: 0.1s → 0.2 (não 2.0)', Math.abs(speedOf(m) - 0.2) < 0.02, `got ${speedOf(m)}`);
    m.update(0.1, { x: 0, z: -1 }, false, { walk: 2, sprint: 4 }, { acceleration: 2, deceleration: 10 });
    ok('accel progressiva acumula → 0.4', Math.abs(speedOf(m) - 0.4) < 0.02, `got ${speedOf(m)}`);
}
// 4. desaceleração progressiva (rápida mas não instantânea, sem sliding longo)
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(1.0, { x: 0, z: -1 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 10 });
    ok('atinge 2.0', Math.abs(speedOf(m) - 2.0) < 0.02, `got ${speedOf(m)}`);
    m.update(0.1, { x: 0, z: 0 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 10 });
    ok('decel 10: 0.1s → 1.0 (não 0)', Math.abs(speedOf(m) - 1.0) < 0.02, `got ${speedOf(m)}`);
    m.update(0.2, { x: 0, z: 0 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 10 });
    ok('para sem sliding longo → 0', speedOf(m) < 0.02, `got ${speedOf(m)}`);
}
// 5. sprint gradual (walk→sprint e sprint→walk sem salto)
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    const dyn = { acceleration: 2, deceleration: 8 };
    m.update(2.0, { x: 0, z: -1 }, false, { walk: 2, sprint: 4 }, dyn);
    ok('walk cheio 2.0', Math.abs(speedOf(m) - 2.0) < 0.02, `got ${speedOf(m)}`);
    m.update(0.1, { x: 0, z: -1 }, true, { walk: 2, sprint: 4 }, dyn);
    ok('sprint gradual → 2.2 (não 4.0)', Math.abs(speedOf(m) - 2.2) < 0.02, `got ${speedOf(m)}`);
    m.update(0.1, { x: 0, z: -1 }, false, { walk: 2, sprint: 4 }, dyn);
    ok('volta p/ walk gradual → 2.0 (não salto)', Math.abs(speedOf(m) - 2.0) < 0.05, `got ${speedOf(m)}`);
}
// 6. desktop intacto: resposta imediata legada
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(0.016, { x: 0, z: -1 }, false, null, null);
    ok('desktop imediato → CONFIG.player.speed', Math.abs(speedOf(m) - CONFIG.player.speed) < 0.001, `got ${speedOf(m)}`);
}
// 7. diagonal digital limitada a 1x (sem boost sqrt2)
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(1.0, { x: 1, z: 1 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 50 });
    ok('diagonal clamp → 2.0', Math.abs(speedOf(m) - 2.0) < 0.02, `got ${speedOf(m)}`);
}
// 8. blink respeita collision (nunca atravessa parede)
{
    const wall = { isSolidAt: (x) => x > 1.0 };
    const m = new PlayerMovement(wall);
    m.setPosition(0, 0);
    const travelled = m.blinkStep({ x: 1, z: 0 }, 5.0);
    ok('blink para antes da parede', travelled < 1.2 && m.position.x <= 1.0, `got ${travelled} x=${m.position.x}`);
    ok('blink zera momentum', speedOf(m) === 0);
}
// 9. movimento real desloca com collision por eixo (regressão)
{
    const m = new PlayerMovement(openWorld);
    m.setPosition(0, 0);
    m.update(1.0, { x: 0, z: -1 }, false, { walk: 2, sprint: 4 }, { acceleration: 50, deceleration: 50 });
    ok('desloca 2m em 1s', Math.abs(m.position.z - (-2)) < 0.02, `got z=${m.position.z}`);
}
// 10. colisão geométrica exata de parede (regressão XR / quina)
{
    const level = new Level({ add() {}, remove() {} });
    level.grid = [
        '#####',
        '#..##',
        '#..##',
        '#..##',
        '#####'
    ];
    level.rows = 5;
    level.cols = 5;
    level.cellSize = 3.5;
    const openCenter = level.cellToWorld(2, 2);
    const wallFaceX = level.cellToWorld(3, 2).x - level.cellSize / 2;
    const m = new PlayerMovement(level);
    const resolved = m.resolvePosition(wallFaceX - 0.1, openCenter.z, CONFIG.player.radius);
    ok('parede não aceita interseção do círculo', resolved.corrected === true);
    ok('resolve afasta o collider da face', resolved.x <= wallFaceX - CONFIG.player.radius + 0.001, `got x=${resolved.x}`);
    ok('posição livre não é corrigida', level.getCollisionCorrection(openCenter.x, openCenter.z, CONFIG.player.radius) === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
