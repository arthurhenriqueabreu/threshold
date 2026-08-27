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
import { Player } from '../player/Player.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { EndScreen } from '../ui/EndScreen.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
    constructor(container) {
        this.container = container;
        this.gameState = new GameState();
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.repository = new LocalGameRepository();
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.graphics.maxPixelRatio));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.atmosphere.fogColor);
        this.scene.fog = new THREE.FogExp2(
            CONFIG.atmosphere.fogColor,
            CONFIG.atmosphere.fogDensity
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

    loadLevel() {
        this.level = this.levelManager.load('level0', {
            gameState: this.gameState,
            events: this.events(),
            difficulty: this.difficulty
        });

        this.player = new Player(this.camera, this.input, this.level);
        this.player.spawnAt(this.level.spawnPoint.x, this.level.spawnPoint.z);
        this.level.setPlayerPosition(this.player.getPosition());
        this.level.onPortalEnter = () => this.completePortalRun();

        // minimapa só no fácil - injeta level e gameState no HUD
        this.hud.setLevel(this.level, this.gameState);
        // desenha posição inicial no minimapa
        this.hud.updateMinimap(this.player.getPosition(), this.player.controller.yaw);

        this.interactionSystem.setDistanceMultiplier(this.diffConfig.interactionDistanceMult);

        for (const interactable of this.level.interactables) {
            this.interactionSystem.register(interactable);
        }

        this.level.fusePickup.onPickup = () => this.handlePickup('fuse', 'FUSÍVEL COLETADO');
        this.level.keycardPickup.onPickup = () => this.handlePickup('keycard', 'CARTÃO ENCONTRADO');

        this.unsubscribePortal = eventBus.on('portal:unlocked', () => {
            this.level.portal.unlock();
            this.level.lighting?.setPowerRestored(1.35);
            this.notificationSystem.show('ANOMALIA ESTABILIZADA\nPORTAL DISPONÍVEL');
            this.audio.sfx('portal');
        });
    }

    handlePickup(itemId, message) {
        if (!this.gameState.collectItem(itemId)) {
            return false;
        }
        this.level.refreshInteractionStates();
        this.objectiveManager.complete(itemId);
        this.notificationSystem.show(message);
        this.audio.sfx('pickup');
        return true;
    }

    requestPointerLock() {
        const result = this.renderer.domElement.requestPointerLock();
        if (result && typeof result.catch === 'function') {
            result.catch(() => {});
        }
    }

    onPointerLockChange() {
        if (document.pointerLockElement === null && this.gameState.state === 'PLAYING') {
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

    async completePortalRun() {
        if (this.gameState.state !== 'PLAYING') {
            return;
        }
        this.gameState.setState('COMPLETED');
        this.scoreManager.award('portal');
        this.input.clearActions();
        document.exitPointerLock();

        await this.ui.fadeIn(900);
        this.hud.hide();
        this.ui.fadeOut(600);
        await this.endScreen.showLevelIntro(2500);
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

    cleanupRun() {
        if (this.unsubscribePortal) {
            this.unsubscribePortal();
            this.unsubscribePortal = null;
        }
        this.interactionSystem.interactables = [];
        this.interactionSystem.currentTarget = null;
        this.hud.setPrompt(null);
        this.hud.setLevel(null, null);
        this.levelManager.unload();
        this.level = null;
        this.player = null;
    }

    restart() {
        this.cleanupRun();
        this.endScreen.hide();
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
        this.endScreen.hide();
        this.ui.hidePause();
        this.notificationSystem.clear();
        this.gameState.reset();
        this.objectiveManager.reset();
        this.hud.reset();
        this.hud.setDifficulty(null);
        this.hud.hide();
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
            // atualiza minimapa no fácil
            if (this.hud && this.player) {
                const yaw = this.player.controller ? this.player.controller.yaw : 0;
                this.hud.updateMinimap(this.player.getPosition(), yaw);
            }
        }

        if (this.level) {
            this.level.update(delta, time);
        }

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
