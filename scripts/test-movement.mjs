globalThis.document = {
    addEventListener() {},
    pointerLockElement: null
};
globalThis.window = {};

const { InputManager } = await import('../src/systems/InputManager.js');
const { Player } = await import('../src/player/Player.js');
const { Level } = await import('../src/world/Level.js');
const { MAP } = await import('../src/world/MapData.js');
const { CONFIG } = await import('../src/core/Config.js');
const THREE = await import('three');

const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 100);

class TestLevel extends Level {
    constructor(scene) {
        super(scene);
        this.grid = MAP;
        this.rows = MAP.length;
        this.cols = MAP[0].length;
        const spawn = { col: 1, row: 1 };
        const w = this.cellToWorld(spawn.col, spawn.row);
        this.spawnPoint.set(w.x, CONFIG.player.height, w.z);
    }
}

const scene = new THREE.Scene();
const level = new TestLevel(scene);
const input = new InputManager();
const player = new Player(camera, input, level);
player.spawnAt(level.spawnPoint.x, level.spawnPoint.z);

console.log('spawn:', player.getPosition().x.toFixed(2), player.getPosition().z.toFixed(2));
console.log('spawn cell solid?', level.isSolidAt(level.spawnPoint.x, level.spawnPoint.z));

// simular W pressionado
input.onKeyDown({ code: 'KeyW', repeat: false });
console.log('forward ativo?', input.isActionActive('forward'));

const before = player.getPosition().clone();
for (let i = 0; i < 30; i++) {
    player.update(0.05, true);
}
const after = player.getPosition();
const moved = before.distanceTo(after);
console.log(`depois de 30 frames: delta=${moved.toFixed(3)} pos=(${after.x.toFixed(2)}, ${after.z.toFixed(2)})`);

// colisão: andar para a parede oeste (col 0)
input.onKeyUp({ code: 'KeyW' });
input.onKeyDown({ code: 'KeyA', repeat: false });
const beforeWall = player.getPosition().clone();
for (let i = 0; i < 200; i++) {
    player.update(0.05, true);
}
const afterWall = player.getPosition();
const cell = level.worldToCell(afterWall.x, afterWall.z);
console.log(`andando p/ oeste: pos=(${afterWall.x.toFixed(2)}, ${afterWall.z.toFixed(2)}) célula=(${cell.x},${cell.z}) sólido? ${level.isSolidAt(afterWall.x, afterWall.z)}`);
console.log('atravessou parede?', level.isSolidAt(afterWall.x, afterWall.z) ? 'SIM (BUG)' : 'não (ok)');

console.log(moved > 0.1 ? 'MOVIMENTO OK' : 'MOVIMENTO FALHOU');
