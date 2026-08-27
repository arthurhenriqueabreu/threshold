import * as THREE from 'three';
import { Level } from './Level.js';
import { Lighting } from './Lighting.js';
import { CONFIG } from '../core/Config.js';
import {
    createWallTexture,
    createCarpetTexture,
    createCeilingTexture
} from './Textures.js';
import { PickupItem } from '../interactions/PickupItem.js';
import { Door } from '../interactions/Door.js';
import { FuseBox } from '../interactions/FuseBox.js';
import { Portal } from '../interactions/Portal.js';
import { MAP, POINT_LIGHT_CELLS, FLICKER_INDICES } from './MapData.js';

const CORNER_NW = 'nw';
const CORNER_NE = 'ne';
const CORNER_SW = 'sw';
const CORNER_SE = 'se';

const PILLAR_CORNERS = [
    { col: 3, row: 3, corner: CORNER_NW }, // fuse room NW
    { col: 6, row: 3, corner: CORNER_NE }, // fuse room NE
    { col: 3, row: 5, corner: CORNER_SW }, // fuse room SW
    { col: 6, row: 5, corner: CORNER_SE }, // fuse room SE
    { col: 12, row: 3, corner: CORNER_NW }, // panel room NW
    { col: 15, row: 3, corner: CORNER_NE }, // panel room NE
    { col: 12, row: 5, corner: CORNER_SW }, // panel room SW
    { col: 15, row: 5, corner: CORNER_SE }, // panel room SE
];

const CRATE_PLACEMENTS = [
    { col: 15, row: 1, align: 'north' },    // north wall of main corridor
    { col: 17, row: 3, align: 'east' },     // east wall near panel room
    { col: 2, row: 13, align: 'south' },    // south wall bottom corridor
    { col: 6, row: 11, align: 'west' },     // west wall lower area
];

export class Level0 extends Level {
    constructor(scene, { gameState, events, difficulty }) {
        super(scene);
        this.gameState = gameState;
        this.events = events;
        this.difficulty = difficulty || 'normal';
        this.diffConfig = CONFIG.difficulty[this.difficulty];
        this.grid = MAP;
        this.rows = MAP.length;
        this.cols = MAP[0].length;
        this.portal = null;
        this.guideMarkers = [];
        this.ambientEventTimer = 0;

        this.buildEnvironment();
        this.buildLights();
        this.buildProps();
        this.buildGameplay();
        const spawnCell = this.findCell('S');
        if (spawnCell) {
            this.spawnPoint.copy(this.cellToWorld(spawnCell.col, spawnCell.row));
            this.spawnPoint.y = CONFIG.player.height;
        }
        if (this.diffConfig.hasGuide) {
            this.buildGuideMarkers();
        }
    }

    findCell(char) {
        for (let row = 0; row < this.rows; row++) {
            const col = this.grid[row].indexOf(char);
            if (col !== -1) {
                return { col, row };
            }
        }
        return null;
    }

    buildEnvironment() {
        const size = this.cols * this.cellSize;
        const wallTexture = createWallTexture(1, 1);
        const carpetTexture = createCarpetTexture(this.cols / 2, this.rows / 2);
        const ceilingTexture = createCeilingTexture(this.cols / 2, this.rows / 2);

        const floorMaterial = new THREE.MeshLambertMaterial({ map: carpetTexture });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.group.add(floor);

        const ceilingMaterial = new THREE.MeshLambertMaterial({ map: ceilingTexture });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(size, size), ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = CONFIG.game.wallHeight;
        this.group.add(ceiling);

        const wallCells = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.grid[row][col] === '#') {
                    wallCells.push({ col, row });
                }
            }
        }

        const wallGeometry = new THREE.BoxGeometry(
            this.cellSize,
            CONFIG.game.wallHeight,
            this.cellSize
        );
        const wallMaterial = new THREE.MeshLambertMaterial({ map: wallTexture });
        const walls = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCells.length);
        const matrix = new THREE.Matrix4();
        wallCells.forEach((cell, index) => {
            const world = this.cellToWorld(cell.col, cell.row);
            matrix.makeTranslation(world.x, CONFIG.game.wallHeight / 2, world.z);
            walls.setMatrixAt(index, matrix);
        });
        walls.instanceMatrix.needsUpdate = true;
        this.group.add(walls);

        this.buildFixtures();
    }

    buildFixtures() {
        const fixtureGeometry = new THREE.BoxGeometry(1.4, 0.06, 0.5);
        // Usa MeshStandard com emissive para nunca ficar preto puro, mesmo sem luz
        // Dois materiais fixos (sem instanceColor) evita bug de vertexColors/instanceColor
        const fixtureMaterialOn = new THREE.MeshStandardMaterial({
            color: 0xfff2b0,
            emissive: 0xfff2b0,
            emissiveIntensity: 1.2,
            roughness: 0.8,
            metalness: 0
        });
        const fixtureMaterialOff = new THREE.MeshStandardMaterial({
            color: 0xc9b896,
            emissive: 0xc9b896,
            emissiveIntensity: 0.45,
            roughness: 0.9,
            metalness: 0
        });
        const fixturesOn = [];
        const fixturesOff = [];

        for (let row = 1; row < this.rows - 1; row++) {
            for (let col = 1; col < this.cols - 1; col++) {
                if (this.grid[row][col] === '#') {
                    continue;
                }
                const isLit = (col * 7 + row * 5) % 4 !== 0 || this.isNearLight(col, row);
                const world = this.cellToWorld(col, row);
                const target = isLit ? fixturesOn : fixturesOff;
                target.push({ x: world.x, z: world.z, col, row, isLit });
            }
        }

        const addFixtures = (list, material) => {
            if (list.length === 0) return;
            const instanced = new THREE.InstancedMesh(fixtureGeometry, material, list.length);
            const matrix = new THREE.Matrix4();
            list.forEach((pos, index) => {
                matrix.makeTranslation(pos.x, CONFIG.game.wallHeight - 0.05, pos.z);
                instanced.setMatrixAt(index, matrix);
            });
            instanced.instanceMatrix.needsUpdate = true;
            this.group.add(instanced);
            if (fixturesOn === list) this.fixtureData = list;
        };

        addFixtures(fixturesOn, fixtureMaterialOn);
        addFixtures(fixturesOff, fixtureMaterialOff);
    }

    isNearLight(col, row) {
        return POINT_LIGHT_CELLS.some(([cx, cz]) => Math.abs(cx - col) <= 1 && Math.abs(cz - row) <= 1);
    }

    buildLights() {
        this.lighting = new Lighting(this.scene);
        const lightData = POINT_LIGHT_CELLS.map(([col, row]) => ({
            col,
            row,
            position: this.cellToWorld(col, row)
        }));
        this.lighting.setup(lightData, FLICKER_INDICES, this.diffConfig.flickerIntensity);
        this.updatables.push({ update: (delta) => this.lighting.update(delta) });
    }

    buildProps() {
        this.buildPillars();
        this.buildCrates();
        this.buildPortalStructure();
        this.buildWallDetails();
    }

    buildPillars() {
        const pillarGeometry = new THREE.BoxGeometry(0.45, CONFIG.game.wallHeight, 0.45);
        const pillarMaterial = new THREE.MeshLambertMaterial({
            map: createWallTexture(1, 2),
            color: 0xbfb28a
        });

        const pillars = new THREE.InstancedMesh(pillarGeometry, pillarMaterial, PILLAR_CORNERS.length);
        const matrix = new THREE.Matrix4();
        const half = this.cellSize / 2;
        const inset = 0.225;

        PILLAR_CORNERS.forEach((p, index) => {
            const world = this.cellToWorld(p.col, p.row);
            let x = world.x;
            let z = world.z;
            switch (p.corner) {
                case CORNER_NW: x -= half - inset; z -= half - inset; break;
                case CORNER_NE: x += half - inset; z -= half - inset; break;
                case CORNER_SW: x -= half - inset; z += half - inset; break;
                case CORNER_SE: x += half - inset; z += half - inset; break;
            }
            matrix.makeTranslation(x, CONFIG.game.wallHeight / 2, z);
            pillars.setMatrixAt(index, matrix);
        });
        pillars.instanceMatrix.needsUpdate = true;
        this.group.add(pillars);
    }

    buildCrates() {
        const crateGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const crateMaterial = new THREE.MeshLambertMaterial({ color: 0x5a4f32 });
        const crates = new THREE.InstancedMesh(crateGeometry, crateMaterial, CRATE_PLACEMENTS.length);
        const matrix = new THREE.Matrix4();
        const half = this.cellSize / 2;
        const inset = 0.45;

        CRATE_PLACEMENTS.forEach((p, index) => {
            const world = this.cellToWorld(p.col, p.row);
            let x = world.x;
            let z = world.z;
            switch (p.align) {
                case 'north': z -= half - inset; break;
                case 'south': z += half - inset; break;
                case 'east': x += half - inset; break;
                case 'west': x -= half - inset; break;
            }
            matrix.makeTranslation(x, 0.35, z);
            crates.setMatrixAt(index, matrix);
        });
        crates.instanceMatrix.needsUpdate = true;
        this.group.add(crates);
    }

    buildWallDetails() {
        const detailMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3528,
            metalness: 0.3,
            roughness: 0.8
        });

        const outletGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.08);
        const outlets = [];

        for (let row = 1; row < this.rows - 1; row++) {
            for (let col = 1; col < this.cols - 1; col++) {
                if (this.grid[row][col] !== '#') continue;
                const north = this.grid[row - 1][col] !== '#';
                const south = this.grid[row + 1][col] !== '#';
                const east = this.grid[row][col + 1] !== '#';
                const west = this.grid[row][col - 1] !== '#';
                const openSides = [north, south, east, west].filter(Boolean).length;
                if (openSides === 1 && Math.random() < 0.15) {
                    const world = this.cellToWorld(col, row);
                    if (north) outlets.push({ x: world.x, z: world.z - half + 0.05, rot: Math.PI });
                    else if (south) outlets.push({ x: world.x, z: world.z + half - 0.05, rot: 0 });
                    else if (east) outlets.push({ x: world.x + half - 0.05, z: world.z, rot: -Math.PI / 2 });
                    else if (west) outlets.push({ x: world.x - half + 0.05, z: world.z, rot: Math.PI / 2 });
                }
            }
        }

        if (outlets.length > 0) {
            const outletsMesh = new THREE.InstancedMesh(outletGeometry, detailMaterial, outlets.length);
            const matrix = new THREE.Matrix4();
            outlets.forEach((o, i) => {
                matrix.makeRotationY(o.rot);
                matrix.setPosition(o.x, 0.4, o.z);
                outletsMesh.setMatrixAt(i, matrix);
            });
            outletsMesh.instanceMatrix.needsUpdate = true;
            this.group.add(outletsMesh);
        }

        const pipeGeometry = new THREE.CylinderGeometry(0.04, 0.04, CONFIG.game.wallHeight - 0.2, 8);
        const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2822, metalness: 0.6, roughness: 0.4 });
        const pipes = [];

        for (let row = 1; row < this.rows - 1; row++) {
            for (let col = 1; col < this.cols - 1; col++) {
                if (this.grid[row][col] !== '#') continue;
                const north = this.grid[row - 1][col] !== '#';
                const south = this.grid[row + 1][col] !== '#';
                if ((north || south) && Math.random() < 0.08) {
                    const world = this.cellToWorld(col, row);
                    const offsetX = (Math.random() - 0.5) * (this.cellSize * 0.6);
                    pipes.push({ x: world.x + offsetX, z: world.z });
                }
            }
        }

        if (pipes.length > 0) {
            const pipesMesh = new THREE.InstancedMesh(pipeGeometry, pipeMaterial, pipes.length);
            const matrix = new THREE.Matrix4();
            pipes.forEach((p, i) => {
                matrix.makeTranslation(p.x, (CONFIG.game.wallHeight - 0.2) / 2, p.z);
                pipesMesh.setMatrixAt(i, matrix);
            });
            pipesMesh.instanceMatrix.needsUpdate = true;
            this.group.add(pipesMesh);
        }
    }

    buildPortalStructure() {
        const portalCell = this.findCell('O');
        const world = this.cellToWorld(portalCell.col, portalCell.row);
        const half = this.cellSize / 2;
        const structureMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2720,
            metalness: 0.5,
            roughness: 0.7
        });

        const cableGeometry = new THREE.CylinderGeometry(0.035, 0.035, CONFIG.game.wallHeight - 0.3, 6);
        const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1815, metalness: 0.7, roughness: 0.3 });
        for (const offset of [-1.3, -1.0, -0.6, 0.6, 1.0, 1.3]) {
            const cable = new THREE.Mesh(cableGeometry, cableMaterial);
            cable.position.set(world.x + half - 0.1, (CONFIG.game.wallHeight - 0.3) / 2, world.z + offset);
            this.group.add(cable);
        }

        const frameBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.12, this.cellSize * 0.9),
            structureMaterial
        );
        frameBase.position.set(world.x + half - 0.175, 0.06, world.z);
        this.group.add(frameBase);

        const frameSide = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, CONFIG.game.wallHeight * 0.9, 0.12),
            structureMaterial
        );
        frameSide.position.set(world.x + half - 0.175, CONFIG.game.wallHeight * 0.45, world.z);
        this.group.add(frameSide);

        this.portal = new Portal(
            new THREE.Vector3(world.x + half - 0.175, 0, world.z),
            -Math.PI / 2
        );
        this.group.add(this.portal.group);
        this.updatables.push({
            update: (delta, time) => {
                const entered = this.portal.update(delta, time, this.playerPosition ?? world);
                if (entered && this.onPortalEnter) {
                    this.onPortalEnter();
                }
            }
        });
    }

    setPlayerPosition(position) {
        this.playerPosition = position;
    }

    buildGameplay() {
        const fuseCell = this.findCell('F');
        const fuseWorld = this.cellToWorld(fuseCell.col, fuseCell.row);
        const fuse = new PickupItem(this.createFuseMesh(), {
            id: 'fuse',
            prompt: '[E] Pegar fusível'
        });
        fuse.meshes[0].position.set(fuseWorld.x, 0.9, fuseWorld.z);
        fuse.baseY = 0.9;
        this.group.add(fuse.meshes[0]);
        this.addInteractable(fuse);

        const cardCell = this.findCell('K');
        const cardWorld = this.cellToWorld(cardCell.col, cardCell.row);
        const keycard = new PickupItem(this.createKeycardMesh(), {
            id: 'keycard',
            prompt: '[E] Pegar cartão'
        });
        keycard.meshes[0].position.set(cardWorld.x, 0.9, cardWorld.z);
        keycard.baseY = 0.9;
        this.group.add(keycard.meshes[0]);
        this.addInteractable(keycard);

        this.fusePickup = fuse;
        this.keycardPickup = keycard;

        this.buildFuseBox();
        this.buildDoor();
    }

    createFuseMesh() {
        const group = new THREE.Group();

        const bodyGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.26, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            metalness: 0.4,
            roughness: 0.3,
            emissive: 0x442200,
            emissiveIntensity: 0.4
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);

        const capGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16);
        const capMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.9,
            roughness: 0.1
        });
        const capTop = new THREE.Mesh(capGeo, capMat);
        capTop.position.y = 0.135;
        const capBottom = new THREE.Mesh(capGeo, capMat);
        capBottom.position.y = -0.135;
        capBottom.rotation.x = Math.PI;

        const glassGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.20, 12, 1, true);
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0xffeedd,
            metalness: 0,
            roughness: 0.2,
            transparent: true,
            opacity: 0.85,
            emissive: 0x664422,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide
        });
        const glass = new THREE.Mesh(glassGeo, glassMat);

        const filamentGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6);
        const filamentMat = new THREE.MeshBasicMaterial({
            color: 0xffee88,
            transparent: true,
            opacity: 1.0
        });
        const filament = new THREE.Mesh(filamentGeo, filamentMat);

        group.add(body, capTop, capBottom, glass, filament);
        group.userData.filament = filament;
        group.userData.glass = glass;

        return group;
    }

    createKeycardMesh() {
        const group = new THREE.Group();

        const cardGeo = new THREE.BoxGeometry(0.28, 0.035, 0.42);
        const cardMat = new THREE.MeshStandardMaterial({
            color: 0xffd23a,
            metalness: 0.1,
            roughness: 0.3,
            emissive: 0x664400,
            emissiveIntensity: 0.45
        });
        const card = new THREE.Mesh(cardGeo, cardMat);

        const chipGeo = new THREE.BoxGeometry(0.035, 0.01, 0.035);
        const chipMat = new THREE.MeshStandardMaterial({
            color: 0x886622,
            metalness: 0.9,
            roughness: 0.1
        });
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.set(-0.07, 0.018, 0.1);

        const stripGeo = new THREE.BoxGeometry(0.18, 0.008, 0.025);
        const stripMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.1,
            roughness: 0.9
        });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(0, 0.017, -0.12);

        group.add(card, chip, strip);
        return group;
    }

    buildFuseBox() {
        const panelCell = this.findCell('P');
        const world = this.cellToWorld(panelCell.col, panelCell.row);
        const half = this.cellSize / 2;
        const wallZ = world.z - 1.5 * this.cellSize + 0.12;

        const indicatorMaterial = new THREE.MeshStandardMaterial({
            color: 0x881111,
            emissive: 0x550000,
            emissiveIntensity: 0.8
        });

        const boxGroup = new THREE.Group();

        const boxGeo = new THREE.BoxGeometry(1.3, 1.7, 0.28);
        const boxMat = new THREE.MeshStandardMaterial({
            color: 0x4a4638,
            metalness: 0.3,
            roughness: 0.7
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(world.x, 1.45, wallZ);

        const coverGeo = new THREE.BoxGeometry(1.35, 0.9, 0.12);
        const coverMat = new THREE.MeshStandardMaterial({
            color: 0x5a5545,
            metalness: 0.4,
            roughness: 0.6
        });
        const cover = new THREE.Mesh(coverGeo, coverMat);
        cover.position.set(world.x, 0.85, wallZ - 0.15);

        const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 12, 12),
            indicatorMaterial
        );
        indicator.position.set(world.x + 0.45, 1.95, wallZ - 0.18);

        const fuseSlotGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
        const fuseSlotMat = new THREE.MeshStandardMaterial({
            color: 0x1a1812,
            metalness: 0.2,
            roughness: 0.8
        });
        const fuseSlot = new THREE.Mesh(fuseSlotGeo, fuseSlotMat);
        fuseSlot.position.set(world.x - 0.35, 1.2, wallZ - 0.17);
        fuseSlot.rotation.x = -Math.PI / 2;

        const switchGeo = new THREE.BoxGeometry(0.06, 0.12, 0.04);
        const switchMat = new THREE.MeshStandardMaterial({
            color: 0xcc3322,
            metalness: 0.5,
            roughness: 0.4
        });
        const switchMesh = new THREE.Mesh(switchGeo, switchMat);
        switchMesh.position.set(world.x + 0.45, 0.95, wallZ - 0.17);
        switchMesh.userData.isSwitch = true;

        boxGroup.add(box, cover, indicator, fuseSlot, switchMesh);
        this.group.add(boxGroup);

        this.fuseBox = new FuseBox({
            mesh: boxGroup,
            indicatorMaterial,
            switchMesh,
            gameState: this.gameState,
            events: this.events,
            onPowerRestored: () => this.events.onPowerRestored()
        });
        this.addInteractable(this.fuseBox);
    }

    buildDoor() {
        const doorCell = this.findCell('D');
        const world = this.cellToWorld(doorCell.col, doorCell.row);
        const half = this.cellSize / 2;

        const pivot = new THREE.Group();
        pivot.position.set(world.x, 0, world.z + half);

        const doorGroup = new THREE.Group();

        const panelGeo = new THREE.BoxGeometry(0.12, 2.65, this.cellSize * 0.95);
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x5a5245,
            metalness: 0.4,
            roughness: 0.6
        });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 1.325, -half + half * 0.025);

        const frameGeo = new THREE.BoxGeometry(0.18, 2.8, this.cellSize + 0.1);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x3a3528,
            metalness: 0.3,
            roughness: 0.7
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 1.4, -half);

        const handleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x8a7a5a,
            metalness: 0.8,
            roughness: 0.2
        });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(-0.09, 1.1, -half + 0.5);
        handle.rotation.z = Math.PI / 2;

        const lockGeo = new THREE.BoxGeometry(0.05, 0.07, 0.04);
        const lockMat = new THREE.MeshStandardMaterial({
            color: 0x2a2520,
            metalness: 0.6,
            roughness: 0.4
        });
        const lock = new THREE.Mesh(lockGeo, lockMat);
        lock.position.set(-0.085, 1.25, -half + 0.3);

        const readerGeo = new THREE.BoxGeometry(0.08, 0.1, 0.03);
        const readerMat = new THREE.MeshStandardMaterial({
            color: 0x1a1815,
            metalness: 0.2,
            roughness: 0.8,
            emissive: 0x880000,
            emissiveIntensity: 0.5
        });
        const reader = new THREE.Mesh(readerGeo, readerMat);
        reader.position.set(-0.085, 1.25, -half + 0.12);
        reader.userData.isReader = true;
        reader.userData.lightMaterial = readerMat;

        doorGroup.add(frame, panel, handle, lock, reader);
        pivot.add(doorGroup);
        this.group.add(pivot);

        this.door = new Door({
            pivot,
            panelMesh: doorGroup,
            cell: { x: doorCell.col, z: doorCell.row },
            gameState: this.gameState,
            events: {
                ...this.events,
                onDoorOpened: () => this.events.onDoorOpened?.()
            },
            readerLight: readerMat
        });
        this.blockers.push(this.door);
        this.addInteractable(this.door);
    }

    buildGuideMarkers() {
        const markerGeo = new THREE.RingGeometry(0.35, 0.45, 8);
        const markerMat = new THREE.MeshBasicMaterial({
            color: 0x88cc44,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const objectives = [
            { id: 'fuse', pos: this.cellToWorld(4, 4) },
            { id: 'keycard', pos: this.cellToWorld(15, 9) },
            { id: 'power', pos: this.cellToWorld(13, 4) },
            { id: 'door', pos: this.cellToWorld(14, 13) },
            { id: 'portal', pos: this.cellToWorld(17, 13) }
        ];

        objectives.forEach((obj, i) => {
            if (obj.id === 'power' && this.gameState.objectives.power) return;
            if (obj.id === 'door' && !this.gameState.objectives.power) return;
            if (obj.id === 'portal' && !this.gameState.portalUnlocked) return;

            const marker = new THREE.Mesh(markerGeo, markerMat.clone());
            marker.position.set(obj.pos.x, 0.08, obj.pos.z);
            marker.rotation.x = -Math.PI / 2;
            marker.userData.guideId = obj.id;
            marker.userData.baseOpacity = markerMat.opacity;
            this.group.add(marker);
            this.guideMarkers.push({ marker, objectiveId: obj.id });
        });

        this.updatables.push({
            update: (delta, time) => {
                this.guideMarkers.forEach((g, i) => {
                    const pulse = Math.sin(time * this.diffConfig.guidePulseSpeed + i) * 0.5 + 0.5;
                    g.marker.material.opacity = g.marker.userData.baseOpacity * (0.4 + pulse * 0.6);
                    g.marker.scale.setScalar(0.9 + pulse * 0.2);
                });
            }
        });
    }

    refreshInteractionStates() {
        this.fuseBox.refreshState();
    }

    updateAmbientEvents(delta, time) {
        if (!this.diffConfig.hasEntities) return;
        this.ambientEventTimer += delta;
        const chance = this.diffConfig.ambientEventChance * delta;
        if (Math.random() < chance) {
            this.triggerAmbientEvent();
        }
    }

    triggerAmbientEvent() {
        const events = [
            () => this.flickerNearbyLights(),
            () => this.playDistantSound(),
            () => this.closeDistantDoor(),
            () => this.moveObjectSlightly()
        ];
        events[Math.floor(Math.random() * events.length)]();
    }

    flickerNearbyLights() {
        if (!this.playerPosition) return;
        const playerCell = this.worldToCell(this.playerPosition.x, this.playerPosition.z);
        const radius = 3;
        for (let r = -radius; r <= radius; r++) {
            for (let c = -radius; c <= radius; c++) {
                const col = playerCell.x + c;
                const row = playerCell.z + r;
                if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
                if (this.grid[row][col] === '#') continue;
                if (Math.random() < 0.3) {
                    this.lighting?.triggerFlickerAt(col, row);
                }
            }
        }
    }

    playDistantSound() {
        this.events?.sfx('distant');
    }

    closeDistantDoor() {
        // Future: could trigger a door slam sound far away
    }

    moveObjectSlightly() {
        // Future: subtle prop movement
    }
}

const half = 3.5 / 2;