import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { eventBus } from './EventBus.js';
import { GameState } from './GameState.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { ObjectiveManager } from '../systems/ObjectiveManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { LocalGameRepository } from '../systems/GameRepository.js';
import { InteractionSystem } from '../interactions/InteractionSystem.js';
import { LevelManager } from '../world/LevelManager.js';
import { EntityManager } from '../entities/EntityManager.js';
import { Flashlight } from '../player/Flashlight.js';
import { Player } from '../player/Player.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { EndScreen } from '../ui/EndScreen.js';
import { UIManager } from '../ui/UIManager.js';
import { RetroRenderer } from '../rendering/RetroRenderer.js';
import { clearRetroHandles } from '../rendering/RetroMaterial.js';

const ITEM_ONLY_IDS = ['radar', 'phone', 'flashlight'];
const PICKUP_MESSAGES = {
    fuse: 'FUSÍVEL COLETADO',
    keycard: 'CARTÃO ENCONTRADO',
    partA: 'PECA A ENCONTRADA',
    partB: 'PECA B ENCONTRADA',
    fragment: 'FRAGMENTO COLETADO',
    radar: 'RADAR ENCONTRADO\nMAPA DISPONÍVEL',
    phone: 'CELULAR ENCONTRADO\nTRANSMISSÕES ATIVAS',
    flashlight: 'LANTERNA ENCONTRADA\nPRESSIONE [F]'
};
const PHONE_MESSAGES = [
    'SINAL FRACO...',
    'ANOMALIA PRÓXIMA.',
    'ELAS OBSERVAM PELAS SOMBRAS.',
    'NÃO CORRA SEM SABER PARA ONDE.',
    'O CHÃO SE REPETE. VOCÊ JÁ PASSOU AQUI.',
    'CONTINUE PELO PORTAL. ELE É A ÚNICA SAÍDA.'
];

export class Game {
    constructor(container) {
        this.container = container;
        this.gameState = new GameState();
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.repository = new LocalGameRepository();
        this.difficulty = null;
        this.diffConfig = null;
        this.levelIndex = 0;
        this.entityManager = null;
        this.flashlight = null;
        this.flashlightOn = false;
        this.phoneTimer = 0;
        this.transitioning = false;
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.graphics.maxPixelRatio));
        this.container.appendChild(this.renderer.domElement);

        this.retroRenderer = new RetroRenderer(this.renderer);
        this.retroRenderer.applyPixelatedCSS();
        this.retroRenderer.setSize(window.innerWidth, window.innerHeight);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.atmosphere.fogColor);
        this.scene.fog = new THREE.Fog(
            CONFIG.atmosphere.fogColor,
            CONFIG.retro.fogNear,
            CONFIG.retro.fogFar
        );

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.graphics.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.graphics.near,
            CONFIG.graphics.far
        );

        this.clock = new THREE.Clock();

        this.levelManager = new LevelManager(this.scene);

        this.notificationSystem = new NotificationSystem('notifications');
        this.objectiveManager = new ObjectiveManager(this.gameState);
        this.scoreManager = new ScoreManager(this.gameState);

        this.interactionSystem = new InteractionSystem(this.camera);
        this.interactionSystem.onPromptChange = (prompt) => this.hud.setPrompt(prompt);
        this.input.onInteract(() => {
            if (this.gameState.state === 'PLAYING') {
                this.interactionSystem.tryInteract();
            }
        });
        this.input.onKeyPress('KeyF', () => this.toggleFlashlight());

        this.hud = new HUD();
        this.ui = new UIManager({
            onUiClick: () => this.audio.sfx('ui'),
            onResume: () => this.resume(),
            onRestart: () => this.restart(),
            onBackToMenu: () => this.backToMenu()
        });
        this.endScreen = new EndScreen({ onRestart: () => this.restart() });
        this.mainMenu = new MainMenu({
            onStart: (name, difficulty) => this.start(name, difficulty),
            onUiClick: () => {
                this.audio.init();
                this.audio.resume();
                this.audio.sfx('ui');
            }
        });

        document.getElementById('btn-go-restart')?.addEventListener('click', () => this.restart());
        document.getElementById('btn-go-menu')?.addEventListener('click', () => this.backToMenu());

        document.addEventListener('pointerdown', () => {
            if (this.gameState.state === 'PLAYING' && document.pointerLockElement === null) {
                this.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        window.addEventListener('resize', () => this.onResize());

        this.animate = this.animate.bind(this);
        this.renderer.setAnimationLoop(this.animate);

        this.showLoadingDone();
    }

    showLoadingDone() {
        const loading = document.getElementById('loading');
        setTimeout(() => loading.classList.add('hidden'), 600);
    }

    events() {
        return {
            notify: (msg, opts) => this.notificationSystem.show(msg, opts),
            sfx: (name) => this.audio.sfx(name),
            onPowerRestored: () => this.objectiveManager.complete('power'),
            onDoorOpened: () => eventBus.emit('door:opened')
        };
    }

    start(playerName, difficulty = 'normal') {
        this.difficulty = difficulty;
        this.diffConfig = CONFIG.difficulty[difficulty];
        this.gameState.setPlayerName(playerName);
        this.gameState.setState('PLAYING');
        this.mainMenu.hide();
        this.hud.setDifficulty(difficulty);
        this.hud.show();
        this.loadLevel();
        this.requestPointerLock();
        this.audio.startAmbient(this.diffConfig.flickerIntensity > 1 ? 1.3 : 1.0);
    }

    loadLevel(index = this.gameState.currentLevelIndex) {
        this.levelIndex = index;
        this.gameState.currentLevelIndex = index;

        this.level = this.levelManager.load(index, {
            gameState: this.gameState,
            events: this.events(),
            difficulty: this.difficulty
        });

        this.player = new Player(this.camera, this.input, this.level);
        this.player.spawnAt(this.level.spawnPoint.x, this.level.spawnPoint.z);
        this.level.setPlayerPosition(this.player.getPosition());
        this.level.onPortalEnter = () => this.handlePortalEnter();

        const objectives = this.level.objectives?.length
            ? this.level.objectives
            : [
                { id: 'fuse', title: 'Encontrar fusível' },
                { id: 'keycard', title: 'Encontrar cartão' },
                { id: 'power', title: 'Restaurar energia' }
            ];
        this.objectiveManager.setObjectives(objectives);

        this.hud.setLevel(this.level, this.gameState);
        this.hud.setLevelName(CONFIG.levels.names[index] ?? `NÍVEL ${index}`);

        this.interactionSystem.setDistanceMultiplier(this.diffConfig.interactionDistanceMult);
        for (const interactable of this.level.interactables) {
            this.interactionSystem.register(interactable);
        }

        this.wirePickups();

        this.unsubscribePortal = eventBus.on('portal:unlocked', () => {
            this.level.portal?.unlock();
            this.level.lighting?.setPowerRestored(1.35);
            this.notificationSystem.show('ANOMALIA ESTABILIZADA\nPORTAL DISPONÍVEL');
            this.audio.sfx('portal');
        });

        this.setupEntities();
        if (this.diffConfig.hasFlashlightRequirement) {
            this.setupFlashlight();
        }
        this.applyDarkness();
        this.updateItemUiFromState();
    }

    wirePickups() {
        const register = (pickup, id) => {
            pickup.onPickup = () => this.handlePickup(id);
        };
        if (this.level.pickups) {
            for (const { item, id } of this.level.pickups) {
                register(item, id);
            }
        }
        if (this.level.fusePickup) {
            this.level.fusePickup.onPickup = () => this.handlePickup('fuse');
        }
        if (this.level.keycardPickup) {
            this.level.keycardPickup.onPickup = () => this.handlePickup('keycard');
        }
    }

    handlePickup(itemId) {
        if (!this.gameState.collectItem(itemId)) {
            return false;
        }
        this.level.refreshInteractionStates?.();
        if (ITEM_ONLY_IDS.includes(itemId)) {
            this.handleItemPickup(itemId);
        } else {
            this.objectiveManager.complete(itemId);
        }
        this.notificationSystem.show(PICKUP_MESSAGES[itemId] ?? 'ITEM COLETADO');
        this.audio.sfx('pickup');
        this.scoreManager.award(itemId);
        return true;
    }

    handleItemPickup(itemId) {
        if (itemId === 'radar') {
            this.hud.setRadarEnabled(true);
        } else if (itemId === 'phone') {
            this.hud.setPhoneEnabled(true);
            this.hud.showPhoneText('SINAL VINCULADO. \nTRANSMISSÕES RECEBIDAS.', 2800);
        } else if (itemId === 'flashlight') {
            if (!this.flashlight) {
                this.setupFlashlight();
            }
            this.hud.setItemOn('flashlight', false);
        }
    }

    setupFlashlight() {
        if (this.flashlight) return;
        try {
            this.flashlight = new Flashlight(this.camera);
        } catch (err) {
            this.flashlight = null;
        }
    }

    toggleFlashlight() {
        if (this.gameState.state !== 'PLAYING' || !this.flashlight) {
            return;
        }
        if (!this.gameState.hasItem('flashlight')) {
            this.notificationSystem.show('LANTERNA NÃO ENCONTRADA', { warning: true });
            return;
        }
        this.flashlightOn = this.flashlight.toggle();
        this.hud.setItemOn('flashlight', this.flashlightOn);
        this.audio.sfx('switch');
    }

    setupEntities() {
        if (this.entityManager) {
            this.entityManager.dispose();
            this.entityManager = null;
        }
        if (!this.diffConfig.hasEntities || !this.level) {
            return;
        }
        const playerPosRef = this.player?.getPosition() ?? new THREE.Vector3();
        this.entityManager = new EntityManager({
            level: this.level,
            enemyMode: this.diffConfig.enemyMode,
            count: this.diffConfig.entityCount,
            events: this.events(),
            playerPosRef
        });
    }

    applyDarkness() {
        const darkness = this.diffConfig?.darkness ?? 1.0;
        if (darkness < 1 && this.level?.lighting) {
            for (const light of this.level.lighting.pointLights) {
                light.intensity *= darkness;
            }
        }
        if (darkness < 1 && this.scene.fog) {
            this.scene.fog.near = CONFIG.retro.fogNear * darkness;
            this.scene.fog.far = CONFIG.retro.fogFar * darkness;
        }
    }

    resetFog() {
        if (this.scene.fog) {
            this.scene.fog.near = CONFIG.retro.fogNear;
            this.scene.fog.far = CONFIG.retro.fogFar;
        }
    }

    handlePortalEnter() {
        if (this.gameState.state !== 'PLAYING' || this.transitioning) {
            return;
        }
        this.transitioning = true;
        if (this.levelIndex >= CONFIG.levels.count - 1) {
            this.completePortalRun();
            return;
        }
        this.gameState.advanceLevel();
        this.input.clearActions();
        document.exitPointerLock();
        const nextName = CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'NÍVEL ?';
        this.ui.fadeIn(700).then(async () => {
            this.unloadLevel();
            this.loadLevel();
            this.ui.fadeOut(500);
            await this.endScreen.showLevelIntro({ title: nextName }, 2000);
            this.transitioning = false;
            this.requestPointerLock();
            this.updateItemUiFromState();
        });
    }

    sendPhoneMessage() {
        if (!this.gameState.hasItem('phone')) {
            return;
        }
        const text = PHONE_MESSAGES[Math.floor(Math.random() * PHONE_MESSAGES.length)];
        this.hud.showPhoneText(text, 3500);
        this.audio.sfx('whisper');
    }

    updateItemUiFromState() {
        this.hud.setRadarEnabled(this.difficulty === 'easy' || this.gameState.hasItem('radar'));
        this.hud.setPhoneEnabled(this.gameState.hasItem('phone'));
        this.hud.setItemOn('flashlight', this.flashlightOn && this.gameState.hasItem('flashlight'));
    }

    unloadLevel() {
        if (this.unsubscribePortal) {
            this.unsubscribePortal();
            this.unsubscribePortal = null;
        }
        if (this.entityManager) {
            this.entityManager.dispose();
            this.entityManager = null;
        }
        if (this.flashlight && this.flashlightOn) {
            this.flashlight.toggle();
        }
        this.interactionSystem.interactables = [];
        this.interactionSystem.currentTarget = null;
        this.hud.setPrompt(null);
        this.levelManager.unload();
        this.level = null;
        this.player = null;
        clearRetroHandles();
    }

    cleanupRun() {
        this.unloadLevel();
        if (this.flashlight) {
            this.flashlight.dispose();
            this.flashlight = null;
        }
        this.flashlightOn = false;
        this.hud.setRadarEnabled(false);
        this.hud.setPhoneEnabled(false);
        this.resetFog();
    }

    async completePortalRun() {
        if (this.gameState.state === 'GAMEOVER' || this.gameState.state === 'COMPLETED') {
            return;
        }
        this.gameState.setState('COMPLETED');
        this.transitioning = true;
        this.scoreManager.award('escape');
        this.input.clearActions();
        document.exitPointerLock();

        await this.ui.fadeIn(900);
        this.hud.hide();
        this.ui.fadeOut(500);
        await this.endScreen.showLevelIntro(2200);
        this.endScreen.show({
            playerName: this.gameState.playerName,
            score: this.gameState.score,
            durationSeconds: this.gameState.elapsedSeconds
        });
        this.ui.fadeOut();

        this.repository.saveResult({
            playerName: this.gameState.playerName,
            score: this.gameState.score,
            duration: Math.round(this.gameState.elapsedSeconds),
            completedAt: new Date().toISOString()
        });
    }

    async gameOver() {
        if (this.gameState.state !== 'PLAYING') {
            return;
        }
        this.gameState.setState('GAMEOVER');
        this.input.clearActions();
        document.exitPointerLock();

        this.audio.sfx('denied');
        await this.ui.fadeIn(900);
        this.hud.hide();
        document.getElementById('go-player').textContent = this.gameState.playerName;
        document.getElementById('go-score').textContent = String(this.gameState.score).padStart(3, '0');
        document.getElementById('game-over-screen').classList.remove('hidden');
        this.ui.fadeOut(500);
    }

    requestPointerLock() {
        const result = this.renderer.domElement.requestPointerLock();
        if (result && typeof result.catch === 'function') {
            result.catch(() => {});
        }
    }

    onPointerLockChange() {
        if (document.pointerLockElement === null && this.gameState.state === 'PLAYING' && !this.transitioning) {
            this.pause();
        }
    }

    pause() {
        this.gameState.setState('PAUSED');
        this.input.clearActions();
        this.ui.showPause();
    }

    resume() {
        this.gameState.setState('PLAYING');
        this.requestPointerLock();
    }

    restart() {
        this.cleanupRun();
        this.transitioning = false;
        this.endScreen.hide();
        document.getElementById('game-over-screen')?.classList.add('hidden');
        this.ui.hidePause();
        this.notificationSystem.clear();
        this.gameState.reset();
        this.objectiveManager.reset();
        this.hud.reset();
        this.hud.setDifficulty(this.difficulty);
        this.gameState.setState('PLAYING');
        this.hud.show();
        this.loadLevel();
        this.requestPointerLock();
    }

    backToMenu() {
        this.cleanupRun();
        this.transitioning = false;
        this.endScreen.hide();
        document.getElementById('game-over-screen')?.classList.add('hidden');
        this.ui.hidePause();
        this.notificationSystem.clear();
        this.gameState.reset();
        this.objectiveManager.reset();
        this.hud.reset();
        this.hud.setDifficulty(null);
        this.hud.hide();
        this.resetFog();
        this.gameState.setState('MENU');
        this.mainMenu.show();
    }

    animate() {
        const delta = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.elapsedTime;

        const playing = this.gameState.state === 'PLAYING';
        if (playing) {
            this.gameState.elapsedSeconds += delta;
            this.player.update(delta, true);
            this.level.setPlayerPosition(this.player.getPosition());
            this.interactionSystem.update();
            if (this.level.updateAmbientEvents) {
                this.level.updateAmbientEvents(delta, time);
            }
            if (this.entityManager) {
                this.entityManager.update(delta, time, () => this.gameOver());
            }
            if (this.flashlight) {
                this.flashlight.update(delta, time);
            }

            if (this.gameState.hasItem('phone')) {
                this.phoneTimer += delta;
                if (this.phoneTimer > 18) {
                    this.phoneTimer = 0;
                    this.sendPhoneMessage();
                }
            }
            this.hud.updateMinimap(this.player.getPosition(), this.player.controller.yaw);
        }

        if (this.level) {
            this.level.update(delta, time);
        }

        this.retroRenderer.render(this.scene, this.camera, time);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.retroRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}