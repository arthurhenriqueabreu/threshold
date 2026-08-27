import { MAP } from '../src/world/MapData.js';

const rows = MAP.length;
const cols = MAP[0].length;

for (let r = 0; r < MAP.length; r++) {
    if (MAP[r].length !== cols) throw new Error(`Linha ${r} tem largura diferente`);
}

function find(ch) {
    for (let r = 0; r < rows; r++) {
        const c = MAP[r].indexOf(ch);
        if (c !== -1) return { c, r };
    }
    return null;
}

const start = find('S');
const targets = ['F', 'K', 'P'].map(find);
const door = find('D');
const portal = find('O');

const visited = new Set();
const queue = [[start.c, start.r]];
visited.add(`${start.c},${start.r}`);

while (queue.length > 0) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (visited.has(key)) continue;
        if (MAP[ny][nx] === '#' || MAP[ny][nx] === 'D') continue;
        visited.add(key);
        queue.push([nx, ny]);
    }
}

let ok = true;
for (const t of [...targets]) {
    if (!visited.has(`${t.c},${t.r}`)) {
        console.error(`FALHA: '${MAP[t.r][t.c]}' em (${t.c},${t.r}) inalcançável`);
        ok = false;
    } else {
        console.log(`OK: '${MAP[t.r][t.c]}' em (${t.c},${t.r}) alcançável`);
    }
}

// porta deve ser alcançável por um lado e o portal apenas pelo outro lado
const doorNeighbors = [[door.c, door.r - 1], [door.c, door.r + 1], [door.c - 1, door.r], [door.c + 1, door.r]];
const accessibleSides = doorNeighbors.filter(([x, y]) => visited.has(`${x},${y}`));
console.log(`Porta acessível por ${accessibleSides.length} lado(s)`);

if (!visited.has(`${portal.c},${portal.r}`)) {
    console.log('OK: portal inacessível sem atravessar a porta');
} else {
    console.error('FALHA: portal alcançável sem porta');
    ok = false;
}

// simular pontuação total
let score = 0;
const done = new Set();
for (const action of ['fuse', 'keycard', 'power', 'portal']) {
    if (done.has(action)) continue;
    done.add(action);
    score += { fuse: 100, keycard: 100, power: 200, portal: 100 }[action];
}
console.log(`Pontuação máxima simulada: ${score} ${score === 500 ? '(OK)' : '(ERRO)'}`);
console.log(ok ? 'MAPA VÁLIDO' : 'MAPA INVÁLIDO');
