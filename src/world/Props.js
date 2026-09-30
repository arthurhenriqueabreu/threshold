import * as THREE from 'three';

// ---------------------------------------------------------------
// Objetos de ambientação baixo-poligono, estilo PS2/survival horror.
// Geometria simples (caixas/cilindros, poucos segmentos), cores
// dessaturadas, sem textura fotográfica — tudo com MeshLambertMaterial
// flat-shaded, igual ao resto do jogo. Cada função retorna um
// THREE.Group pronto pra ser adicionado à cena, com um raio de colisão
// sugerido (quando fizer sentido ter colisão).
// ---------------------------------------------------------------

function mat(color, opts = {}) {
    return new THREE.MeshLambertMaterial({ color, ...opts });
}

// --- Caixote de madeira ---
export function createCrateProp() {
    const group = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(0x5a4a35));
    box.position.y = 0.35; // apoiado no chão (metade da altura) — antes ficava centralizado em y=0, meio enterrado
    box.castShadow = box.receiveShadow = true;
    group.add(box);
    // ripas em relevo (barato, dá leitura de madeira sem textura)
    [0.15, 0.55].forEach((oy) => {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.72), mat(0x3a2e20));
        strap.position.y = oy;
        group.add(strap);
    });
    return { group, radius: 0.42, height: 0.7 };
}

// --- Gaveteiro/arquivo metálico ---
// --- Tapete (âncora visual pra formar "cantos temáticos") ---
export function createRugProp(w = 1.6, d = 1.1, color = 0x5a3f38) {
    const group = new THREE.Group();
    const rug = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.02, d),
        mat(color, { emissive: color, emissiveIntensity: 0.06 })
    );
    rug.position.y = 0.011;
    rug.receiveShadow = true;
    group.add(rug);
    const border = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.12, 0.005, d - 0.12),
        mat(0x2a1c18)
    );
    border.position.y = 0.023;
    group.add(border);
    return { group, radius: 0, height: 0.02 }; // sem colisão — só decoração no chão
}

export function createFilingCabinetProp() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.6), mat(0x3a4048));
    body.position.y = 0.525;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    for (let i = 0; i < 3; i++) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), mat(0x8a8a8a));
        handle.position.set(0, 0.2 + i * 0.32, 0.315);
        group.add(handle);
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.01, 0.61), mat(0x24282c));
        seam.position.y = 0.05 + i * 0.32;
        group.add(seam);
    }
    return { group, radius: 0.36, height: 1.05 };
}

// --- Mesa simples (retangular, madeira) ---
export function createTableProp(w = 1.1, d = 0.65, h = 0.72) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat(0x5c4830));
    top.position.y = h;
    top.castShadow = top.receiveShadow = true;
    group.add(top);
    const legMat = mat(0x3a2e20);
    const legGeo = new THREE.BoxGeometry(0.06, h, 0.06);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08));
        leg.castShadow = true;
        group.add(leg);
    });
    return { group, radius: Math.max(w, d) / 2, height: h };
}

// --- Sacos de lixo (cluster de 2-3) ---
export function createTrashBagsProp() {
    const group = new THREE.Group();
    const bagMat = mat(0x1c1c1e, { emissive: 0x050505 });
    const positions = [[0, 0], [0.28, -0.05], [-0.22, 0.12]];
    positions.forEach(([x, z], i) => {
        const s = 0.85 - i * 0.08;
        const bag = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 7, 6), bagMat);
        bag.scale.set(1, 1.15, 1);
        bag.position.set(x, 0.24 * s, z);
        bag.rotation.y = Math.random() * Math.PI;
        bag.castShadow = bag.receiveShadow = true;
        group.add(bag);
        const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.1 * s, 5), bagMat);
        knot.position.set(x, 0.24 * s * 2 - 0.02, z);
        group.add(knot);
    });
    return { group, radius: 0.4, height: 0.5 };
}

// --- Lanterna/lampião pendurado ou de chão ---
// --- Lanterna/lampião de chão (poste baixo com gaiola e chama) ---
export function createLanternProp() {
    const group = new THREE.Group();
    const bodyMat = mat(0x1c1c1c);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.06, 8), bodyMat);
    base.position.y = 0.03;
    base.castShadow = base.receiveShadow = true;
    group.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.62, 8), bodyMat);
    pole.position.y = 0.06 + 0.31;
    pole.castShadow = true;
    group.add(pole);

    const cageMat = mat(0x1c1c1c, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.42, 7, 1, true), cageMat);
    cage.position.y = 0.06 + 0.62 + 0.21;
    group.add(cage);

    const top = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 8), bodyMat);
    top.position.y = 0.06 + 0.62 + 0.42 + 0.08;
    group.add(top);

    const flameY = 0.06 + 0.62 + 0.21;
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), mat(0xffcc66, { emissive: 0xffaa33, emissiveIntensity: 1.3 }));
    flame.position.y = flameY;
    group.add(flame);

    const glow = new THREE.PointLight(0xffaa55, 0.85, 3.4);
    glow.position.y = flameY;
    group.add(glow);

    return { group, radius: 0.2, height: 1.02 };
}

// --- Câmera de segurança (parede) ---
export function createCameraProp() {
    const group = new THREE.Group();
    const bodyMat = mat(0x1a1a1a);
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), bodyMat);
    group.add(mount);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 8), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0.13, -0.02, 0);
    group.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), mat(0x0a0a0a, { emissive: 0x1a2a2a }));
    lens.rotation.z = Math.PI / 2;
    lens.position.set(0.21, -0.02, 0);
    group.add(lens);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), mat(0xff2222, { emissive: 0xff0000, emissiveIntensity: 1 }));
    led.position.set(0.19, 0.01, 0.04);
    group.add(led);
    return { group, radius: 0, height: 0 }; // sem colisão — montada na parede, acima da altura de andar
}

// --- Extintor ---
export function createExtinguisherProp() {
    const group = new THREE.Group();
    const bodyMat = mat(0x7a1f1f);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.62, 9), bodyMat);
    body.position.y = 0.31;
    body.castShadow = true;
    group.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.08, 9), mat(0x2a2a2a));
    cap.position.y = 0.66;
    group.add(cap);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 4, 8), mat(0x2a2a2a));
    handle.rotation.x = Math.PI / 2;
    handle.position.y = 0.73;
    group.add(handle);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 5), mat(0x111111));
    hose.rotation.z = 0.5;
    hose.position.set(0.14, 0.38, 0);
    group.add(hose);
    return { group, radius: 0.16, height: 0.7 };
}

// --- Computador antigo (CRT + teclado) ---
export function createOldComputerProp() {
    const group = new THREE.Group();
    const beige = mat(0xc9c2a6);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.42), beige);
    tower.position.y = 0.2;
    tower.castShadow = tower.receiveShadow = true;
    group.add(tower);

    // Monitor CRT — bem maior que antes, lê como uma "TV velha" de longe.
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.48, 0.5), beige);
    monitor.position.y = 0.4 + 0.48 / 2;
    monitor.castShadow = true;
    group.add(monitor);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.02), mat(0x1a2a26, { emissive: 0x223d33, emissiveIntensity: 0.5 }));
    screen.position.set(0, monitor.position.y, 0.26);
    group.add(screen);

    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.16), beige);
    keyboard.position.set(0, 0.415, 0.32);
    group.add(keyboard);

    return { group, radius: 0.3, height: 0.9 };
}

// --- Carrinho de carga (metálico, com rodas) ---
export function createCartProp() {
    const group = new THREE.Group();
    const frameMat = mat(0x2e2b26);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), frameMat);
    platform.position.y = 0.32;
    platform.castShadow = platform.receiveShadow = true;
    group.add(platform);
    const wheelMat = mat(0x141414);
    [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]].forEach(([x, z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.06, z);
        group.add(wheel);
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 5), frameMat);
        leg.position.set(x, 0.19, z);
        group.add(leg);
    });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.05), frameMat);
    handle.position.set(0, 0.5, -0.24);
    group.add(handle);
    const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), frameMat);
    handleTop.position.set(0, 0.66, -0.24);
    group.add(handleTop);
    return { group, radius: 0.45, height: 0.66 };
}

// --- Placa de radiação/perigo ---
export function createHazardSignProp() {
    const group = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.02), mat(0xc9b224));
    group.add(plate);
    const symbol = new THREE.Mesh(new THREE.CircleGeometry(0.1, 3), mat(0x1a1a1a));
    symbol.position.set(0, 0.03, 0.011);
    symbol.rotation.z = Math.PI;
    group.add(symbol);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.05), mat(0x1a1a1a));
    stripe.position.set(0, -0.16, 0.011);
    group.add(stripe);
    return { group, radius: 0, height: 0 }; // montada na parede
}

// --- Traje de proteção (de pé, numa base — não pendurado, pra não
// correr risco de "flutuar" sem um varal/suporte de verdade) ---
export function createHazmatSuitProp() {
    const group = new THREE.Group();
    const suitMat = mat(0xd8d4c4);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 10), mat(0x2a2a2a));
    base.position.y = 0.02;
    base.receiveShadow = true;
    group.add(base);

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.6, 8), suitMat);
    legs.position.y = 0.04 + 0.3;
    legs.castShadow = true;
    group.add(legs);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 8), suitMat);
    torso.position.y = 0.04 + 0.6 + 0.275;
    torso.castShadow = true;
    group.add(torso);

    const hoodY = 0.04 + 0.6 + 0.55 + 0.12;
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), suitMat);
    hood.position.y = hoodY;
    group.add(hood);

    const visor = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), mat(0x1a2422, { transparent: true, opacity: 0.7 }));
    visor.position.set(0, hoodY - 0.02, 0.13);
    group.add(visor);

    return { group, radius: 0.24, height: hoodY + 0.14 };
}

// --- Sofá (2 lugares, estofado simples) ---
export function createSofaProp() {
    const group = new THREE.Group();
    const fabricMat = mat(0x3a3f4a);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.7), fabricMat);
    base.position.y = 0.2;
    base.castShadow = base.receiveShadow = true;
    group.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.16), fabricMat);
    back.position.set(0, 0.55, -0.27);
    back.castShadow = true;
    group.add(back);
    [-1, 1].forEach((side) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.7), fabricMat);
        arm.position.set(side * 0.67, 0.42, 0);
        arm.castShadow = true;
        group.add(arm);
    });
    const cushionMat = mat(0x4a5060);
    [-0.35, 0.35].forEach((x) => {
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.6), cushionMat);
        cushion.position.set(x, 0.43, 0.02);
        group.add(cushion);
    });
    return { group, radius: 0.85, height: 0.85 };
}

// --- Carro abandonado (área externa) ---
export function createAbandonedCarProp() {
    const group = new THREE.Group();
    const bodyMat = mat(0x8a7060, { emissive: 0x1a1410, emissiveIntensity: 0.15 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 4.0), bodyMat);
    body.position.y = 0.5;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.0), bodyMat);
    cabin.position.set(0, 0.95, -0.2);
    cabin.castShadow = true;
    group.add(cabin);
    const glassMat = mat(0x1c2422, { transparent: true, opacity: 0.6 });
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.05), glassMat);
    windshield.position.set(0, 0.95, 0.78);
    windshield.rotation.x = -0.25;
    group.add(windshield);
    const wheelMat = mat(0x14120f);
    [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]].forEach(([x, z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.32, z);
        wheel.castShadow = true;
        group.add(wheel);
    });
    return { group, radius: 2.1, height: 1.2 };
}

// -----------------------------------------------------------------
// Helper de posicionamento: cria o objeto, posiciona, opcionalmente
// rotaciona, adiciona ao grupo do nível e registra colisão fina se
// tiver raio > 0. Usar isso nos Level*.js pra manter o código enxuto.
// -----------------------------------------------------------------
export function placeProp(level, factory, x, z, rotationY = 0) {
    const { group, radius } = factory();
    group.position.set(x, 0, z);
    group.rotation.y = rotationY;
    level.group.add(group);
    if (radius > 0 && typeof level.addPropCollider === 'function') {
        level.addPropCollider(x, z, radius);
    }
    return group;
}

// Objetos montados na parede (câmera, placa) não usam addPropCollider —
// helper separado que também define a altura de montagem.
export function placeWallProp(level, factory, x, y, z, rotationY = 0) {
    const { group } = factory();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    level.group.add(group);
    return group;
}

// -----------------------------------------------------------------
// Encosta o objeto na parede mais próxima da célula (col,row), em vez
// de deixá-lo solto no meio do chão aberto. Olha as 4 direções no
// grid de verdade do nível e escolhe a primeira parede encontrada
// (prioridade N, S, O, L). A rotação gira o objeto pra ficar "de
// costas" pra parede escolhida — a maioria dos props aqui foi
// modelada com a frente voltada pro +Z local, então os 4 casos abaixo
// cobrem isso corretamente.
// -----------------------------------------------------------------
export function placePropAgainstWall(level, factory, col, row, hug = 1.3) {
    const center = level.cellToWorld(col, row);
    let dx = 0, dz = 0, rotationY = 0;

    if (level.isSolidCell(col, row - 1)) {
        dz = -hug; rotationY = 0;               // parede ao norte
    } else if (level.isSolidCell(col, row + 1)) {
        dz = hug; rotationY = Math.PI;          // parede ao sul
    } else if (level.isSolidCell(col - 1, row)) {
        dx = -hug; rotationY = -Math.PI / 2;    // parede a oeste
    } else if (level.isSolidCell(col + 1, row)) {
        dx = hug; rotationY = Math.PI / 2;      // parede a leste
    }
    // Sem parede adjacente (célula bem no meio de uma sala grande) —
    // fica no centro da célula mesmo, sem forçar nada.

    return placeProp(level, factory, center.x + dx, center.z + dz, rotationY);
}
