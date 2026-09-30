import * as THREE from 'three';
import { CONFIG } from './Config.js';
import { eventBus } from './EventBus.js';
import { GameState } from './GameState.js';
import { InputManager } from '../systems/InputManager.js';
import { AudioManager } from '../systems/AudioManager.js';
import { AudioManifest } from '../audio/AudioManifest.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { ObjectiveManager } from '../systems/ObjectiveManager.js';
import { ScoreManager } from '../systems/ScoreManager.js';
import { ApiGameRepository } from '../systems/GameRepository.js';
import { InteractionSystem } from '../interactions/InteractionSystem.js';
import { LevelManager } from '../world/LevelManager.js';
import { RealRoom } from '../world/RealRoom.js';
import { EntityManager } from '../entities/EntityManager.js';
import { Flashlight } from '../player/Flashlight.js';
import { Player } from '../player/Player.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { EndScreen } from '../ui/EndScreen.js';
import { UIManager } from '../ui/UIManager.js';
import { RetroRenderer } from '../rendering/RetroRenderer.js';
import { clearRetroHandles } from '../rendering/RetroMaterial.js';
import { StaticEffect } from '../ui/StaticEffect.js';
import { ProximityStatic } from '../ui/ProximityStatic.js';
import { NokiaPhone } from '../ui/NokiaPhone.js';
import { VRScreenEffects } from '../xr/VRScreenEffects.js';
import { VRUI } from '../xr/VRUI.js';
import { VRComfortManager } from '../xr/VRComfort.js';
import { XRHaptics } from '../xr/XRHaptics.js';
import { XRPerformanceMonitor } from '../xr/XRPerformanceMonitor.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

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
        this.repository = new ApiGameRepository();
        this.difficulty = null;
        this.diffConfig = null;
        this.levelIndex = 0;
        this.entityManager = null;
        this.flashlight = null;
        this.flashlightOn = false;
        this.phoneTimer = 0;
        this.transitioning = false;
        this._lastPlayStart = 0;
        this.staticEffect = new StaticEffect();
        this.proximityStatic = new ProximityStatic();
        this.nokiaPhone = null;
        this.xrRig = null;
        this.vrButton = null;
        this.xrControllers = [];
        // --- XR entry / pause guards ---
        // _xrEntryPending=true entre o clique ENTER VR e sessionstart:
        // onPointerLockChange NÃO pode pausar nesse intervalo.
        this._xrEntryPending = false;
        // true se a pausa atual foi intencional (B/Y ou menu), false se foi
        // apenas perda de pointerlock durante a transição XR.
        this._realPause = false;
        this._wasPlayingBeforeXR = false;
        this.vrEffects = null;
        this.vrUI = null;
        // VR comfort (cybersickness mitigation): profiles + persistência.
        this.comfort = new VRComfortManager();
        this.haptics = new XRHaptics(() => this.input?.xrSources ?? {});
        this.perfMonitor = new XRPerformanceMonitor();
        this.xrSessionPlayTime = 0;
        this._introContinueResolve = null;
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // Fixa o mesmo gerenciamento de cor nos dois destinos (canvas e
        // framebuffer XR). Sem isso, o Quest pode compilar os materiais com
        // uma resposta de iluminação diferente da prévia desktop.
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.graphics.maxPixelRatio));
        this.container.appendChild(this.renderer.domElement);

        this.retroRenderer = new RetroRenderer(this.renderer);
        this.retroRenderer.applyPixelatedCSS();
        this.retroRenderer.setSize(window.innerWidth, window.innerHeight);

        this.scene = new THREE.Scene();
        // fog preto em todos os níveis
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(
            0x000000,
            CONFIG.retro.fogNear,
            CONFIG.retro.fogFar
        );
        this._baseFog = { near: CONFIG.retro.fogNear, far: CONFIG.retro.fogFar };

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.graphics.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.graphics.near,
            CONFIG.graphics.far
        );
        this.setupXR();

        // Timer evita o Clock deprecated do Three.js e zera o delta quando a
        // página perde visibilidade, importante para não dar um tranco ao
        // voltar de uma pausa/troca de janela durante uma sessão XR.
        this.clock = new THREE.Timer();
        this.clock.connect(document);

        this.levelManager = new LevelManager(this.scene);

        this.notificationSystem = new NotificationSystem('notifications');
        // Espelha mensagens críticas no HUD VR (DOM invisível no headset).
        {
            const origShow = this.notificationSystem.show.bind(this.notificationSystem);
            this.notificationSystem.show = (msg, opts) => {
                origShow(msg, opts);
                try {
                    if (this.renderer?.xr?.isPresenting) {
                        this.vrUI?.notify(msg);
                        this._syncVRHUD();
                    }
                } catch { }
            };
        }
        this.objectiveManager = new ObjectiveManager(this.gameState);
        this.scoreManager = new ScoreManager(this.gameState);

        // Registro central de pontuação: todo objetivo concluído pontua de
        // acordo com CONFIG.scoring. addScore é idempotente (Set), então não
        // soma em dobro mesmo quando o caminho de coleta também pontua.
        // Isso garante que gerador (Level1) e estabilizador (Level2), que usam
        // gameState.completeObjective diretamente, também recebam seus pontos.
        this.unsubscribeObjectiveScoring = eventBus.on('objective:completed', (id) => {
            this.scoreManager.award(id);
            if (this.renderer?.xr?.isPresenting) this._syncVRHUD();
        });
        eventBus.on('score:changed', () => {
            if (this.renderer?.xr?.isPresenting) this._syncVRHUD();
        });
        eventBus.on('hud:updateObjectives', () => {
            if (this.renderer?.xr?.isPresenting) this._syncVRHUD();
        });

        this.interactionSystem = new InteractionSystem(this.camera);
        this.interactionSystem.onPromptChange = (prompt) => {
            this.hud.setPrompt(prompt);
            if (this.renderer?.xr?.isPresenting) this.vrUI?.setHUD({ prompt: prompt ?? '' });
        };
        this.input.onInteract((controller = null) => {
            if (this.gameState.state !== 'PLAYING') return;
            if (this.nokiaPhone?.isOpen) return;
            this.interactionSystem.tryInteract(controller);
        });
        this.input.onKeyPress('KeyF', () => this.toggleFlashlight());

        this.hud = new HUD();
        this.nokiaPhone = new NokiaPhone({ input: this.input, gameState: this.gameState, audio: this.audio, camera: this.camera, scene: this.scene });
        // Toggle celular na direita com Q; quando aberto consome WASD/Arrows para navegação sem mover player
        this.input.onKeyPress('KeyQ', () => this.togglePhone());
        this.input.onKeyPress('ArrowLeft', () => {
            if (!this.nokiaPhone?.isOpen) return false;
            this.nokiaPhone.navigate(-1);
            return true;
        });
        this.input.onKeyPress('ArrowRight', () => {
            if (!this.nokiaPhone?.isOpen) return false;
            this.nokiaPhone.navigate(1);
            return true;
        });
        this.input.onKeyPress('ArrowUp', () => {
            if (!this.nokiaPhone?.isOpen) return false;
            this.nokiaPhone.navigate(-1);
            return true;
        });
        this.input.onKeyPress('ArrowDown', () => {
            if (!this.nokiaPhone?.isOpen) return false;
            this.nokiaPhone.navigate(1);
            return true;
        });
        this.input.onXRAction('flashlight', () => this.toggleFlashlight());
        this.input.onXRAction('phone', () => {
            if (this.renderer?.xr?.isPresenting && this.vrUI?.isMenuOpen) {
                this.vrUI.activateFocused();
                return;
            }
            this.togglePhone();
        });
        this.input.onXRAction('pause', () => {
            if (this.renderer?.xr?.isPresenting && this.vrUI?.mode === 'comfort') {
                this.onVRMenuAction('vr-comfort-back');
                return;
            }
            this.togglePauseXR();
        });
        this.input.onXRAction('menu-nav', ({ direction, axis } = {}) => {
            if (this.renderer?.xr?.isPresenting && this.vrUI?.isMenuOpen) {
                this.vrUI.moveFocus(direction ?? 1, axis ?? 'y');
            }
        });
        this.input.onXRAction('turn', (direction) => {
            if (this.gameState.state === 'PLAYING' && !this.nokiaPhone?.isOpen && !this.vrUI?.isMenuOpen) {
                this.snapTurnXR(direction);
            }
        });
        this.input.onXRAction('turn-smooth', ({ value, delta } = {}) => {
            if (this.gameState.state === 'PLAYING' && !this.nokiaPhone?.isOpen && !this.vrUI?.isMenuOpen) {
                this.smoothTurnXR(value ?? 0, delta ?? 0);
            }
        });
        // XR trigger também seleciona botões dos menus VR.
        this.input.onInteract(() => this._xrMenuTrigger());

        // Debug hotkeys (F1-F4)
        this.input.onKeyPress('F1', () => {
            if (typeof window === 'undefined') return;
            window.DEBUG_SHOW_GENERATOR_MARKER = !window.DEBUG_SHOW_GENERATOR_MARKER;
            const marker = this.level?.generator?.meshes?.[0]?.getObjectByName?.('generatorDebugMarker');
            if (marker) marker.visible = !!window.DEBUG_SHOW_GENERATOR_MARKER;
            this.notificationSystem.show(`MARCADOR GERADOR ${window.DEBUG_SHOW_GENERATOR_MARKER ? 'ON' : 'OFF'}`);
        });
        this.input.onKeyPress('F2', () => {
            // dar celular
            this.handlePickup('phone');
            this.notificationSystem.show('DEBUG: CELULAR ADICIONADO');
        });
        this.input.onKeyPress('F3', () => {
            // dar radar
            this.handlePickup('radar');
            this.notificationSystem.show('DEBUG: RADAR ADICIONADO');
        });
        this.input.onKeyPress('F4', () => {
            // dar ambos
            this.handlePickup('phone');
            this.handlePickup('radar');
            this.notificationSystem.show('DEBUG: CELULAR + RADAR ADICIONADOS');
        });
        this.input.onKeyPress('F6', () => {
            // DEBUG: troca pro quarto "mundo real" em construção, sem
            // passar pelo fluxo normal de nível (só pra ver o cenário).
            if (this.level?.group) this.scene.remove(this.level.group);
            this.level = new RealRoom(this.scene);
            this.interactionSystem.interactables = [];
            this.interactionSystem.currentTarget = null;
            this.hud.setPrompt(null);
            if (this.entityManager) { this.entityManager.dispose(); this.entityManager = null; }
            this.player.movement.collisionWorld = this.level;
            this._wakeCameraTest = false;
            this.player.spawnAt(this.level.spawnPoint.x, this.level.spawnPoint.z, this.level.spawnYaw);
            this.notificationSystem.show('DEBUG: QUARTO REAL (cenário em teste)');
        });
        this.input.onKeyPress('F7', () => {
            // DEBUG: ETAPA 2 — pose da câmera de despertar (deitado no
            // travesseiro). Garante que estamos no quarto primeiro, se
            // ainda não estiver. Alterna entre a pose fixa e o controle
            // normal de andar pela sala.
            if (!(this.level instanceof RealRoom)) {
                if (this.level?.group) this.scene.remove(this.level.group);
                this.level = new RealRoom(this.scene);
                this.interactionSystem.interactables = [];
                this.interactionSystem.currentTarget = null;
                this.hud.setPrompt(null);
                if (this.entityManager) { this.entityManager.dispose(); this.entityManager = null; }
                this.player.movement.collisionWorld = this.level;
            }
            this._wakeCameraTest = !this._wakeCameraTest;
            const pose = this.level.getWakeCameraPose();
            const inXR = this.renderer.xr.isPresenting;

            if (this._wakeCameraTest) {
                if (inXR) {
                    // VR: a rotação sempre vem do sensor do headset — só
                    // dá pra posicionar a ORIGEM (xrRig). Pra simular a
                    // altura de estar deitado mesmo com quem testa em
                    // pé, medimos a altura real atual (mundo) e aplicamos
                    // um deslocamento em Y no rig pra compensar — assim
                    // a altura final bate com a pose alvo seja qual for
                    // a altura de quem estiver com o headset.
                    const realWorldPos = new THREE.Vector3();
                    this.camera.getWorldPosition(realWorldPos);
                    const offsetY = pose.position.y - realWorldPos.y;
                    this.xrRig.position.set(pose.position.x, offsetY, pose.position.z);
                    this.notificationSystem.show('DEBUG: CÂMERA DE DESPERTAR — VR (F7 de novo pra sair)');
                } else {
                    this.camera.position.copy(pose.position);
                    this.camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
                    this.notificationSystem.show('DEBUG: CÂMERA DE DESPERTAR (F7 de novo pra sair)');
                }
            } else {
                if (inXR) {
                    this.xrRig.position.set(this.level.spawnPoint.x, 0, this.level.spawnPoint.z);
                }
                this.player.spawnAt(this.level.spawnPoint.x, this.level.spawnPoint.z, this.level.spawnYaw);
                this.notificationSystem.show('DEBUG: controle normal');
            }
        });
        this.input.onKeyPress('F8', () => {
            // DEBUG: roda a sequência de despertar inteira (fade, hold,
            // respiração, clareamento) sem precisar terminar o jogo.
            this.notificationSystem.show('DEBUG: SEQUÊNCIA DE DESPERTAR (F8)');
            this.playWakeSequence();
        });
        document.getElementById('item-phone')?.addEventListener('click', () => this.togglePhone());
        this.ui = new UIManager({
            onUiClick: () => this.audio.sfx('ui'),
            onResume: () => this.resume(),
            onRestart: () => this.restart(),
            onBackToMenu: () => this.backToMenu()
        });
        this.endScreen = new EndScreen({ onRestart: () => this.restart() });
        this.mainMenu = new MainMenu({
            onStart: (name, levelIndex) => this.start(name, levelIndex),
            onUiClick: () => {
                this.audio.init();
                this.audio.resume();
                this.audio.sfx('ui');
            }
        });

        document.getElementById('btn-go-restart')?.addEventListener('click', () => this.restart());
        document.getElementById('btn-go-menu')?.addEventListener('click', () => this.backToMenu());

        const tryLock = () => {
            if (this.gameState.state === 'PLAYING' && document.pointerLockElement === null && !this.transitioning) {
                if (!this.renderer.xr.isPresenting) this.requestPointerLock();
            }
        };
        // Clique no canvas ou em qualquer lugar durante PLAYING tenta travar
        document.addEventListener('pointerdown', tryLock);
        document.addEventListener('click', tryLock);

        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => {
            console.warn('[Game] pointer lock falhou');
            // Fallback: avisa que pode arrastar com botão do mouse
            if (this.gameState.state === 'PLAYING') {
                this.notificationSystem.show('CLIQUE E ARRASTE PARA OLHAR\nOU CLIQUE NOVAMENTE PARA TRAVAR MOUSE', { warning: true });
            }
        });
        window.addEventListener('resize', () => this.onResize());

        this.animate = this.animate.bind(this);
        this.renderer.setAnimationLoop(this.animate);

        // pre-carrega assets de áudio (CC0 procedural) em background
        this.audio.loadSounds(AudioManifest).then(res => {
            console.log('[Audio] manifest carregado', res);
        });

        this.showLoadingDone();
    }

    setupXR() {
        this.renderer.xr.enabled = true;
        this.renderer.xr.cameraAutoUpdate = true;
        this.renderer.xr.setReferenceSpaceType('local-floor');
        const xrScale = CONFIG.retro.vrSafe?.framebufferScale;
        if (Number.isFinite(xrScale) && this.renderer.xr.setFramebufferScaleFactor) {
            this.renderer.xr.setFramebufferScaleFactor(xrScale);
        }

        // The rig is the locomotion origin. WebXR keeps the headset pose on the
        // camera while the game moves this group through the level.
        this.xrRig = new THREE.Group();
        this.xrRig.name = 'XRPlayerRig';
        this.scene.add(this.xrRig);
        this.xrRig.add(this.camera);

        // Efeitos stereo-safe + HUD/menus 3D (sem DOM no headset).
        this.vrEffects = new VRScreenEffects(this.camera);
        this.vrUI = new VRUI(this.camera);
        this.vrUI.setActionHandler((id) => this.onVRMenuAction(id));
        // Aplica o comfort profile salvo e re-aplica em tempo real a cada
        // troca no menu (sem restart, sem tocar no áudio).
        this.applyComfort();
        this.comfort.onChange(() => this.applyComfort());

        this.vrButton = VRButton.createButton(this.renderer, {
            requiredFeatures: ['local-floor'],
            optionalFeatures: ['bounded-floor']
        });
        this.vrButton.setAttribute('aria-label', 'Entrar em realidade virtual');
        // O botão oficial é a única entrada para a sessão XR. Em navegadores
        // sem suporte, VRButton retorna um link de fallback; escondê-lo evita
        // deixar "VR NOT SUPPORTED" sobre o rodapé/HUD.
        this.vrButton.id = 'VRButton';
        this.vrButton.style.display = 'none';
        const syncVRButton = () => {
            const label = (this.vrButton.textContent || '').trim().toUpperCase();
            const supported = label === 'ENTER VR' || label === 'EXIT VR';
            const unsupported = label.includes('NOT SUPPORTED')
                || label.includes('NOT ALLOWED')
                || label.includes('NOT AVAILABLE')
                || label.includes('NEEDS HTTPS');
            this.vrButton.style.display = supported && !unsupported ? '' : 'none';
        };
        // VRButton resolve a própria detecção de suporte em outra promise e
        // pode sobrescrever display depois da nossa checagem. Observe apenas
        // mudanças de texto para esconder o fallback sem corrida assíncrona.
        if (typeof MutationObserver !== 'undefined') {
            this._vrButtonObserver = new MutationObserver(syncVRButton);
            this._vrButtonObserver.observe(this.vrButton, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
        if (typeof navigator !== 'undefined' && navigator.xr?.isSessionSupported) {
            navigator.xr.isSessionSupported('immersive-vr').then(syncVRButton).catch(syncVRButton);
        }
        syncVRButton();
        document.body.appendChild(this.vrButton);
        // Marca transição pendente ANTES do browser abrir a sessão, no mesmo
        // gesto do usuário (sem timeout arbitrário como solução).
        this.vrButton.addEventListener('click', () => this.beginXREntry(), { capture: true });

        const controllerModelFactory = new XRControllerModelFactory();
        for (let index = 0; index < 2; index++) {
            const controller = this.renderer.xr.getController(index);
            this.input.registerXRController(controller);

            const rayGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -1)
            ]);
            const ray = new THREE.Line(rayGeometry, new THREE.LineBasicMaterial({
                color: 0xd8c26a,
                transparent: true,
                opacity: 0.22
            }));
            ray.name = 'xr-target-ray';
            ray.scale.z = 1.2;
            controller.add(ray);
            // Keep hands/rays under the same locomotion origin as the camera.
            this.xrRig.add(controller);

            const grip = this.renderer.xr.getControllerGrip(index);
            grip.add(controllerModelFactory.createControllerModel(grip));
            this.xrRig.add(grip);
            this.xrControllers.push({ controller, grip });
        }

        this.renderer.xr.addEventListener('sessionstart', () => this.onXRSessionChange(true));
        this.renderer.xr.addEventListener('sessionend', () => this.onXRSessionChange(false));
    }

    // Chamado no gesto do usuário que inicia a sessão XR.
    beginXREntry() {
        this._xrEntryPending = true;
        this._wasPlayingBeforeXR = this.gameState.state === 'PLAYING';
        try { this.audio.init(); } catch { }
        try { this.audio.resume(); } catch { }
    }

    resolveVRPlayerName() {
        const fromInput = document.getElementById('player-name-input')?.value?.trim();
        if (fromInput) return fromInput;
        try {
            const saved = localStorage.getItem('threshold_playerName');
            if (saved?.trim()) return saved.trim();
        } catch { }
        return 'JOGADOR VR';
    }

    // Compat: textos antigos do menu VR agora viram modos do VRUI.
    _ensureVRMenu() {
        return this.vrUI?.group ?? null;
    }

    _updateVRMenu(text) {
        // legado: redireciona p/ notificação VR quando em HUD
        if (this.vrUI && this.gameState.state === 'PLAYING') {
            this.vrUI.notify(text);
        }
    }

    _setVRMenuVisible(visible, text) {
        if (!this.vrUI) return;
        if (!visible) {
            if (!this.vrUI.isMenuOpen && this.gameState.state === 'PLAYING') {
                this.vrUI.show('playing');
            } else if (!visible && this.vrUI.isMenuOpen) {
                this.vrUI.hide();
            }
            return;
        }
        this.vrUI.notify(text);
    }

    onXRSessionChange(active) {
        this.retroRenderer.setVRMode(active);
        if (active) {
            // Fim da transição: limpa flag pendente com evento real, não timeout.
            const wasEntry = this._xrEntryPending;
            this._xrEntryPending = false;
            this.input.clearActions();
            try { document.exitPointerLock(); } catch { }
            try { this.audio.resume(); } catch { }
            this.player?.controller.setXRActive(true);
            // Comfort: sessão nova = monitor zerado, flicker XR ativo.
            try { this.perfMonitor?.reset?.(); } catch { }
            try {
                const eff = this.comfort.getEffectiveConfig();
                this.level?.lighting?.setXRComfort?.(eff.flickerScale, true);
            } catch { }
            try { this.applyComfort(); } catch { }
            // Sincroniza rig na posição real do jogador (spawn foi com isPresenting false → rig 0,0)
            if (this.player) {
                const p = this.player.getPosition();
                this.xrRig.position.set(p.x, 0, p.z);
            }
            // Anexa lanterna/Nokia aos controllers quando já existem.
            this._attachXRDevices();
            if (this.gameState.state === 'MENU') {
                // Menu principal 3D — nunca "saia do VR p/ iniciar no monitor".
                this.mainMenu.hide();
                this.vrUI.show('main', {
                    playerName: this.gameState.playerName || this.resolveVRPlayerName(),
                    levelName: CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'CHÃO 0'
                });
            } else if (this.gameState.state === 'PAUSED') {
                if (wasEntry && this._wasPlayingBeforeXR && !this._realPause) {
                    // Pausa acidental herdada da perda de pointerlock ao entrar:
                    // restaura PLAYING e esconde painel.
                    this._realPause = false;
                    this.gameState.setState('PLAYING');
                    this._lastPlayStart = performance.now();
                    this.vrUI.show('playing');
                    this._syncVRHUD();
                } else {
                    this.vrUI.show('pause');
                }
            } else if (this.gameState.state === 'PLAYING') {
                this.vrUI.show('playing');
                this._syncVRHUD();
            } else if (this.gameState.state === 'GAMEOVER') {
                this.showVRGameOver();
            } else if (this.gameState.state === 'COMPLETED') {
                this.showVREnd();
            }
            // reseta arm-swing
            if (this.input._armSwing) {
                this.input._armSwing.hasPrev = false;
                this.input._armSwing.avgSpeed = 0;
            }
            return;
        }
        // ---- sessionend ----
        this._xrEntryPending = false;
        this.input.clearActions();
        try { this.level?.lighting?.setXRComfort?.(1, false); } catch { }
        if (this.nokiaPhone?.isOpen) this.nokiaPhone.close();
        this.nokiaPhone?.setXRController(null);
        if (this.flashlight) this.flashlight.setXRController(null);
        this.vrUI?.hide();
        this.vrEffects?.stopAll();
        this.xrRig?.position.set(0, 0, 0);
        this.player?.controller.setXRActive(false);
        this.vrEffects?.fadeTo(0, 0);
        // NÃO zera progresso; NÃO prende em PAUSED: se a pausa era apenas a
        // acidental da transição, volta a PLAYING no desktop; pausa real mantém.
        if (this.gameState.state === 'PAUSED' && !this._realPause) {
            this.gameState.setState('PLAYING');
            this._lastPlayStart = performance.now();
            this.ui.hidePause();
        }
    }

    _attachXRDevices() {
        const left = this.input.xrSources.left?.controller ?? null;
        const right = this.input.xrSources.right?.controller ?? null;
        try { this.nokiaPhone?.setXRController(left); } catch { }
        try { if (this.flashlight) this.flashlight.setXRController(right); } catch { }
    }

    // --- VR comfort ----------------------------------------------------
    // Aplica walk/sprint/accel/vignette/proximity/flicker do profile ativo
    // em tempo real (sem restart). Nunca toca em áudio, tracking ou FOV.
    applyComfort() {
        const eff = this.comfort.getEffectiveConfig();
        try { this.vrEffects?.applyComfortProfile(eff, eff.profileName); } catch { }
        try {
            const scale = eff.effectsScale ?? 1;
            this.vrEffects?.setEffectsScale(scale);
        } catch { }
        try { this.input?.setLocomotionMode?.(eff.locomotionMode); } catch { }
        try { this.input?.setTurnMode?.(eff.turnMode); } catch { }
        try { this.level?.lighting?.setXRComfort?.(eff.flickerScale, this.renderer?.xr?.isPresenting); } catch { }
        try {
            this.player?.setComfortHooks?.({
                comfortProfile: () => this.comfort.getEffectiveConfig(),
                locomotionMode: () => this.comfort.getEffectiveConfig().locomotionMode,
                consumeBlink: () => this.input?.consumeBlinkStep?.(),
                onBlink: () => {
                    try { this.haptics?.blink?.(); } catch { }
                    try { this.vrEffects?.pulseSnapTurn?.(); } catch { }
                }
            });
        } catch { }
        // Re-desenha o painel conforto se estiver aberto.
        try {
            if (this.vrUI?.mode === 'comfort') this._showVRComfort();
        } catch { }
    }

    _comfortUIData() {
        const eff = this.comfort.getEffectiveConfig();
        const ov = this.comfort.overrides;
        return {
            profileName: eff.profileName,
            vignette: eff.vignette,
            turnMode: eff.turnMode,
            snapTurnAngle: eff.snapTurnAngle,
            speedScale: ov.speedScale ?? 1,
            effectsScale: ov.effectsScale ?? 'normal',
            locomotionMode: eff.locomotionMode
        };
    }

    _showVRComfort() {
        const from = (this.gameState.state === 'MENU') ? 'main' : 'pause';
        this.vrUI?.show('comfort', { from, comfort: this._comfortUIData() });
    }

    // --- VR menus / pause ------------------------------------------------
    onVRMenuAction(id) {
        try { this.audio.sfx('ui'); } catch { }
        if (id === 'vr-comfort') {
            this._showVRComfort();
            return;
        }
        if (id === 'vr-comfort-back') {
            const from = this.vrUI?._comfortReturn ?? 'pause';
            if (from === 'main' || this.gameState.state === 'MENU') {
                this.vrUI?.show('main', {
                    playerName: this.gameState.playerName || this.resolveVRPlayerName(),
                    levelName: CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'CHÃO 0'
                });
            } else {
                this.vrUI?.show('pause', { sessionTimeSec: this.xrSessionPlayTime });
            }
            return;
        }
        if (id === 'vr-profile-prev' || id === 'vr-profile-next') {
            this.comfort.cycleProfile(id === 'vr-profile-next' ? 1 : -1);
            return;
        }
        if (id === 'vr-vignette') {
            const eff = this.comfort.getEffectiveConfig();
            this.comfort.setOverride('vignette', !eff.vignette);
            return;
        }
        if (id === 'vr-turn-mode') {
            const eff = this.comfort.getEffectiveConfig();
            this.comfort.setOverride('turnMode', eff.turnMode === 'smooth' ? 'snap' : 'smooth');
            return;
        }
        if (id === 'vr-speed') {
            const cur = this.comfort.overrides.speedScale ?? 1;
            this.comfort.setOverride('speedScale', cur < 1 ? 1 : 0.75);
            return;
        }
        if (id === 'vr-effects') {
            const cur = this.comfort.overrides.effectsScale ?? 'normal';
            this.comfort.setOverride('effectsScale', cur === 'reduced' ? 'normal' : 'reduced');
            return;
        }
        if (id === 'vr-locomotion') {
            const eff = this.comfort.getEffectiveConfig();
            this.comfort.setOverride('locomotionMode', eff.locomotionMode === 'blink' ? 'continuous' : 'blink');
            try { this.notificationSystem.show(`LOCOMOÇÃO: ${this.comfort.getEffectiveConfig().locomotionMode === 'blink' ? 'BLINK STEP' : 'CONTÍNUA'}`); } catch { }
            return;
        }
        if (id === 'vr-intro-continue') {
            if (this._introContinueResolve) {
                const r = this._introContinueResolve;
                this._introContinueResolve = null;
                r();
            }
            return;
        }
        if (id === 'vr-start' || id === 'vr-again' || id === 'vr-retry') {
            if (this.gameState.state === 'GAMEOVER' || this.gameState.state === 'COMPLETED' || id !== 'vr-start') {
                if (this.level || id === 'vr-start' && this.gameState.state === 'MENU') {
                    // vindo do menu VR: inicia run nova; vindo de gameover/end: restart na sessão
                    if (this.gameState.state === 'MENU') {
                        this.start(this.resolveVRPlayerName(), this.gameState.currentLevelIndex ?? 0);
                    } else {
                        this.restart();
                    }
                    return;
                }
            }
            this.start(this.resolveVRPlayerName(), this.gameState.currentLevelIndex ?? 0);
        } else if (id === 'vr-resume') {
            this.resume();
        } else if (id === 'vr-restart') {
            this.restart();
        } else if (id === 'vr-menu') {
            this.backToMenu();
            // continua dentro da sessão XR mostrando o menu principal VR
            if (this.renderer.xr.isPresenting) {
                this.mainMenu.hide();
                this.vrUI.show('main', {
                    playerName: this.gameState.playerName || this.resolveVRPlayerName(),
                    levelName: CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'CHÃO 0'
                });
            }
        }
    }

    _xrMenuTrigger() {
        // Só interessa em XR com menu VR aberto; em PLAYING o outro handler
        // (tryInteract) já cuida da interação com o mundo.
        if (!this.renderer.xr.isPresenting) return;
        if (!this.vrUI?.isMenuOpen) return;
        const right = this.input.xrSources.right?.controller;
        const left = this.input.xrSources.left?.controller;
        if (this.vrUI.activatePicked(right)) return;
        this.vrUI.activatePicked(left);
    }

    togglePauseXR() {
        if (!this.renderer.xr.isPresenting) return;
        if (this.gameState.state === 'PLAYING') {
            this._realPause = true;
            this.pause();
        } else if (this.gameState.state === 'PAUSED') {
            this._realPause = false;
            this.resume();
        }
    }

    // Snap turn rotaciona o RIG (nunca o quaternion da câmera WebXR).
    // Head tracking 1:1 preservado — sem translation jump, sem smoothing
    // da pose do headset. Ângulo vem do comfort (30° default, 45° opcional).
    snapTurnXR(direction) {
        if (!this.renderer.xr.isPresenting || !this.xrRig) {
            this.player?.controller.turnBy(direction * (Math.PI / 6));
            return;
        }
        const deg = this.comfort?.getEffectiveConfig?.().snapTurnAngle
            ?? CONFIG.xr?.snapTurnAngle ?? 30;
        const angle = direction * THREE.MathUtils.degToRad(deg);
        // Rotaciona o mundo ao redor da cabeça: preserva posição do headset.
        const headPos = new THREE.Vector3();
        this.camera.getWorldPosition(headPos);
        const rigPos = this.xrRig.position.clone();
        const offset = headPos.clone().sub(rigPos);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.xrRig.position.copy(headPos).sub(offset);
        this.xrRig.rotation.y += angle;
        // Mantém yaw desktop sincronizado p/ minimapa/bússola.
        if (this.player?.controller) this.player.controller.yaw += angle;
        // Pulso curtíssimo opcional na vignette (só se habilitada).
        try { this.vrEffects?.pulseSnapTurn?.(); } catch { }
    }

    smoothTurnXR(value, delta) {
        if (!this.renderer.xr.isPresenting || !this.xrRig) return;
        const dt = Math.max(0, Math.min(0.05, Number(delta) || 0));
        const input = Math.max(-1, Math.min(1, Number(value) || 0));
        if (dt <= 0 || Math.abs(input) < 0.001) return;
        const angle = -input * THREE.MathUtils.degToRad(CONFIG.xr?.smoothTurnSpeed ?? 85) * dt;
        const headPos = new THREE.Vector3();
        this.camera.getWorldPosition(headPos);
        const rigPos = this.xrRig.position.clone();
        const offset = headPos.clone().sub(rigPos);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.xrRig.position.copy(headPos).sub(offset);
        this.xrRig.rotation.y += angle;
        if (this.player?.controller) this.player.controller.yaw += angle;
    }

    // Posição do jogador p/ gameplay (entidade/portal/áudio): rig + headset.
    // Room-scale desloca a cabeça dentro do rig; a colisão corrige o rig quando
    // esse deslocamento físico encosta numa parede.
    getXRPlayerWorldPosition(out = new THREE.Vector3()) {
        if (this.renderer.xr.isPresenting) {
            this.camera.getWorldPosition(out);
            return out;
        }
        const p = this.player?.getPosition();
        if (p) return out.copy(p);
        return out.set(0, 0, 0);
    }

    _syncVRHUD() {
        if (!this.vrUI || !this.renderer.xr.isPresenting) return;
        const names = CONFIG.levels.names ?? [];
        const levelName = names[this.levelIndex] ?? `NÍVEL ${this.levelIndex}`;
        const diffName = this.diffConfig?.name ?? this.difficulty ?? '';
        const active = this.objectiveManager?.objectives?.filter(o => !o.completed).slice(0, 3) ?? [];
        const done = this.objectiveManager?.objectives?.filter(o => o.completed).length ?? 0;
        const total = this.objectiveManager?.objectives?.length ?? 0;
        const objText = active.length > 0
            ? active.map(o => `• ${o.title}`).join('\n')
            : `TUDO CONCLUÍDO (${done}/${total})`;
        this.vrUI.setHUD({
            level: `${levelName}${diffName ? ' · ' + diffName : ''}`,
            score: String(this.gameState.score).padStart(3, '0'),
            objective: objText
        });
    }

    _syncVRLaser() {
        const right = this.input.xrSources.right?.controller;
        if (!right) return;
        const ray = right.children?.find(c => c.name === 'xr-target-ray');
        if (!ray) return;
        const hasTarget = !!this.interactionSystem.currentTarget;
        const d = this.interactionSystem.lastHitDistance;
        const maxD = CONFIG.xr?.controllerRayDistance ?? 3.0;
        const len = hasTarget && Number.isFinite(d) ? Math.min(d, maxD) : 1.2;
        ray.scale.z = Math.max(0.3, len);
        ray.material.opacity = hasTarget ? 0.85 : 0.22;
    }

    showLoadingDone() {
        const loading = document.getElementById('loading');
        setTimeout(() => loading.classList.add('hidden'), 600);
    }

    events() {
        return {
            notify: (msg, opts) => {
                this.notificationSystem.show(msg, opts);
                if (this.renderer.xr.isPresenting) this.vrUI?.notify(msg);
            },
            sfx: (name) => this.audio.sfx(name),
            sfxPositional: (name, pos, opts) => {
                // Usa HRTF quando há um buffer posicional; sons procedurais
                // continuam com fallback global.
                try {
                    const played = pos ? this.audio.playPositional(name, pos, opts) : null;
                    if (!played) this.audio.sfx(name);
                    return played;
                } catch {
                    this.audio.sfx(name);
                    return null;
                }
            },
            onPowerRestored: () => {
                this.objectiveManager.complete('power');
                try { this.audio.sfx('power'); this.audio.setBusVolume('ambient', 0.3, 0.15); setTimeout(() => this.audio.setBusVolume('ambient', 1, 1.2), 800); } catch { }
            },
            onDoorOpened: () => eventBus.emit('door:opened')
        };
    }

    start(playerName, levelIndex = 0) {
        // Estado limpo pra essa partida (score/inventário/objetivos),
        // mas preserva o checkpoint salvo — assim escolher uma fase já
        // concluída pra jogar de novo não zera o progresso salvo.
        const inXR = this.renderer.xr.isPresenting;
        const resolvedName = (playerName?.trim?.()) || (inXR ? this.resolveVRPlayerName() : 'JOGADOR');
        try { localStorage.setItem('threshold_playerName', resolvedName); } catch { }
        this.gameState.reset(true);
        this.objectiveManager.reset();
        this.gameState.setPlayerName(resolvedName);
        this.gameState.setState('PLAYING');
        this._realPause = false;
        this._lastPlayStart = performance.now();
        this.mainMenu.hide();
        this.hud.reset();
        try { this.hud.setCheckpoint(this.gameState.checkpointLevelIndex ?? 0); } catch { }
        this.hud.show();
        this.loadLevel(levelIndex);
        this.proximityStatic.start();
        if (!inXR) this.requestPointerLock();
        else {
            this.vrUI?.show('playing');
            this._syncVRHUD();
            this.xrRig.position.set(this.player.getPosition().x, 0, this.player.getPosition().z);
        }
        try { this.audio.setReverbForLevel(this.levelIndex); } catch { }
        this.audio.startAmbient(this.diffConfig.flickerIntensity > 1 ? 1.3 : 1.0, this.levelIndex);
        if (this.renderer.xr.isPresenting && this.player) {
            const p = this.player.getPosition();
            this.xrRig.position.set(p.x, 0, p.z);
        }

        // Abertura narrativa — objetivo claro logo de cara, independente
        // da dificuldade (que agora vem sozinha, por andar).
        this.notificationSystem.show(
            'Você escorregou da realidade. Não devia estar aqui. Encontre o caminho de volta.',
            { duration: 6000 }
        );
    }

    loadLevel(index = this.gameState.currentLevelIndex) {
        this.levelIndex = index;
        this.gameState.currentLevelIndex = index;

        // Dificuldade automática por andar — não é mais escolha do menu.
        this.difficulty = CONFIG.levels.difficultyByLevel[index] ?? 'normal';
        this.diffConfig = CONFIG.difficulty[this.difficulty];
        this.hud.setDifficulty(this.difficulty);

        this.level = this.levelManager.load(index, {
            gameState: this.gameState,
            events: this.events(),
            difficulty: this.difficulty
        });

        // compute required support items for this difficulty and show on HUD
        const required = [];
        if (this.diffConfig.hasPhoneRequirement) required.push('phone');
        if (this.diffConfig.hasRadarRequirement) required.push('radar');
        if (this.diffConfig.hasFlashlightRequirement) required.push('flashlight');
        try { this.hud.setRequiredItems(required, this.gameState); } catch { }

        this.player = new Player(this.camera, this.input, this.level, {
            xrRig: this.xrRig,
            isXRActive: () => this.renderer.xr.isPresenting
        });
        this.player.setComfortHooks({
            comfortProfile: () => this.comfort.getEffectiveConfig(),
            locomotionMode: () => this.comfort.getEffectiveConfig().locomotionMode,
            consumeBlink: () => this.input?.consumeBlinkStep?.(),
            onBlink: () => {
                try { this.haptics?.blink?.(); } catch { }
                try { this.vrEffects?.pulseSnapTurn?.(); } catch { }
            }
        });
        this.player.spawnAt(this.level.spawnPoint.x, this.level.spawnPoint.z, this.level.spawnYaw);
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
            try {
                if (this.level.portal?.group) {
                    const p = this.level.portal.group.position;
                    this._portalHum = this.audio.playPositional('portalHum', new THREE.Vector3(p.x, 1, p.z), { volume: 0.16, loop: true, bus: 'world', refDistance: 2, maxDistance: 38, rolloff: 0.7 });
                    if (this._portalHum) this.audio.fadeGain(this._portalHum.gain.gain, 0.16, 1.2);
                }
            } catch { }
        });

        this.setupEntities();
        if (this.diffConfig.hasFlashlightRequirement) {
            this.setupFlashlight();
        }
        this._attachXRDevices();
        this.applyDarkness();
        // Flicker XR usa o scale do profile quando apresentando.
        try {
            const eff = this.comfort.getEffectiveConfig();
            this.level?.lighting?.setXRComfort?.(eff.flickerScale, this.renderer.xr.isPresenting);
        } catch { }
        this.updateItemUiFromState();
        if (this.gameState.state === 'PLAYING') this.proximityStatic.start();
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
            // se este item também for parte das objectives do nível, marque como completo
            try {
                if (this.level && Array.isArray(this.level.objectives) && this.level.objectives.some(o => o.id === itemId)) {
                    this.objectiveManager.complete(itemId);
                }
            } catch { }
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
            this.nokiaPhone?.setEnabled(true);
            this.nokiaPhone?.addMessage('SINAL VINCULADO.\nTRANSMISSÕES RECEBIDAS.');
            this.hud.showPhoneText('SINAL VINCULADO. \nTRANSMISSÕES RECEBIDAS.', 2800);
            this.notificationSystem.show('CELULAR [Q] PARA ABRIR', { warning: false });
        } else if (itemId === 'flashlight') {
            if (!this.flashlight) {
                this.setupFlashlight();
            }
            this.hud.setItemOn('flashlight', false, true);
        }
    }

    togglePhone() {
        if (this.gameState.state !== 'PLAYING') return;
        if (!this.gameState.hasItem('phone')) {
            this.notificationSystem.show('CELULAR NÃO ENCONTRADO', { warning: true });
            return;
        }
        const wasOpen = this.nokiaPhone?.isOpen;
        // alternância: se lanterna ligada, desliga ao abrir celular
        if (!wasOpen && this.flashlightOn && this.flashlight) {
            this.flashlightOn = this.flashlight.toggle() ? true : false;
            if (!this.flashlightOn) this.hud.setItemOn('flashlight', false, true);
        }
        if (this.nokiaPhone?.toggle()) {
            this.input.clearActions();
            document.exitPointerLock();
        } else if (wasOpen) {
            if (!this.renderer.xr.isPresenting) this.requestPointerLock();
        }
    }

    setupFlashlight() {
        if (this.flashlight) return;
        try {
            this.flashlight = new Flashlight(this.camera);
            const right = this.input.xrSources.right?.controller ?? null;
            if (right && this.renderer.xr.isPresenting) this.flashlight.setXRController(right);
        } catch (err) {
            this.flashlight = null;
        }
    }

    toggleFlashlight() {
        if (this.nokiaPhone?.isOpen) {
            // alternância: fecha celular e liga lanterna
            this.nokiaPhone.close();
            if (!this.renderer.xr.isPresenting) this.requestPointerLock();
        }
        if (this.gameState.state !== 'PLAYING' || !this.flashlight) {
            return;
        }
        if (!this.gameState.hasItem('flashlight')) {
            this.notificationSystem.show('LANTERNA NÃO ENCONTRADA', { warning: true });
            return;
        }
        this.flashlightOn = this.flashlight.toggle();
        this.hud.setItemOn('flashlight', this.flashlightOn, true);
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
            count: 1,
            events: this.events(),
            playerPosRef
        });
    }

    applyDarkness() {
        // Fog preto em todos os níveis — quanto mais difícil, mais perto
        const fogCfg = CONFIG.retro.fogByDifficulty?.[this.difficulty] || { near: CONFIG.retro.fogNear, far: CONFIG.retro.fogFar };
        if (this.scene.fog) {
            this.scene.fog.color.set(0x000000);
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog.near = fogCfg.near;
            this.scene.fog.far = fogCfg.far;
            this._baseFog = { near: fogCfg.near, far: fogCfg.far };
        }
        // Mantém luzes pontuais normais (visibilidade vem do fog + lanterna dinâmica)
        // Não escurece ambient — lanterna faz o papel de estender visão
    }

    resetFog() {
        const fallback = CONFIG.retro.fogByDifficulty?.[this.difficulty] || { near: CONFIG.retro.fogNear, far: CONFIG.retro.fogFar };
        if (this.scene.fog) {
            this.scene.fog.color.set(0x000000);
            this.scene.fog.near = fallback.near;
            this.scene.fog.far = fallback.far;
        }
        if (this.scene.background) {
            this.scene.background.set(0x000000);
        }
        this._baseFog = { near: fallback.near, far: fallback.far };
        if (this.level?.lighting?.ambient) this.level.lighting.ambient.intensity = CONFIG.atmosphere.ambientIntensity;
        if (this.level?.lighting?.hemisphere) this.level.lighting.hemisphere.intensity = 0.85;
    }

    handlePortalEnter() {
        if (this.gameState.state !== 'PLAYING' || this.transitioning) {
            return;
        }
        const missing = this.getMissingRequiredItems();
        if (missing.length > 0) {
            this.notificationSystem.show(`EQUIPAMENTO NECESSÁRIO\n${missing.join(' + ')}`, { warning: true });
            this.audio.sfx('denied');
            return;
        }
        // Each level has its own portal crossing, so use a unique score key.
        this.gameState.addScore(`portal:${this.levelIndex}`, CONFIG.scoring.portal);
        this.transitioning = true;
        const inXR = this.renderer.xr.isPresenting;
        if (this.levelIndex >= CONFIG.levels.count - 1) {
            this.completePortalRun();
            return;
        }
        this.gameState.advanceLevel();
        this.input.clearActions();
        if (!inXR) document.exitPointerLock();
        const nextName = CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'NÍVEL ?';
        const nextSubtitle = CONFIG.levels.subtitles?.[this.gameState.currentLevelIndex] ?? '';
        try { this.audio.stopAll(); } catch { }
        const doSwap = async () => {
            this.unloadLevel();
            this.loadLevel();
            this._attachXRDevices();
            if (this.player && inXR) {
                const p = this.player.getPosition();
                this.xrRig.position.set(p.x, 0, p.z);
            }
            try { this.audio.setReverbForLevel(this.levelIndex); this.audio.startAmbient(this.diffConfig.flickerIntensity > 1 ? 1.3 : 1.0, this.levelIndex); } catch { }
            if (inXR) {
                this._syncVRHUD();
                await this.vrEffects.fadeTo(0, 500);
                // Pausa natural: nome do nível + subtítulo no painel VR;
                // jogador continua quando quiser (TRIGGER) — sem pressa.
                this.vrUI?.show('intro', { title: nextName, subtitle: nextSubtitle });
                await this._waitVRIntroContinue();
                this.vrUI?.show('playing');
                this._syncVRHUD();
            } else {
                this.ui.fadeOut(500);
            }
            if (!inXR) {
                await this.endScreen.showLevelIntro({ title: nextName, subtitle: nextSubtitle }, 2200);
            }
            this.transitioning = false;
            if (!this.renderer.xr.isPresenting) this.requestPointerLock();
            this.updateItemUiFromState();
        };
        if (inXR) {
            // fade stereo-safe (DOM invisível no headset)
            this.vrEffects.fadeTo(1, 700).then(doSwap);
        } else {
            this.ui.fadeIn(700).then(doSwap);
        }
    }

    // Portais são pausas naturais: em XR o próximo nível só começa após
    // input do jogador (ou timeout de segurança). Nunca instantâneo.
    _waitVRIntroContinue(timeoutMs = 9000) {
        return new Promise((resolve) => {
            let done = false;
            const finish = () => {
                if (done) return;
                done = true;
                this._introContinueResolve = null;
                resolve();
            };
            this._introContinueResolve = finish;
            setTimeout(finish, timeoutMs);
        });
    }

    sendPhoneMessage() {
        if (!this.gameState.hasItem('phone')) {
            return;
        }
        const text = PHONE_MESSAGES[Math.floor(Math.random() * PHONE_MESSAGES.length)];
        this.hud.showPhoneText(text, 3500);
        this.nokiaPhone?.addMessage(text);
        this.audio.sfx('whisper');
    }

    updateItemUiFromState() {
        this.hud.setRadarEnabled(this.difficulty === 'easy' || this.gameState.hasItem('radar'));
        this.hud.setPhoneEnabled(this.gameState.hasItem('phone'));
        const hasFlashlight = this.gameState.hasItem('flashlight');
        this.hud.setItemOn('flashlight', this.flashlightOn && hasFlashlight, hasFlashlight);
    }

    unloadLevel() {
        if (this._portalHum) {
            try {
                const h = this._portalHum;
                this.audio.fadeGain(h.gain.gain, 0, 0.6);
                setTimeout(() => { try { h.stop(); } catch { } }, 650);
            } catch { }
            this._portalHum = null;
        }
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
        if (this.player) {
            this.player.dispose?.();
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
        this.staticEffect.stop();
        this.proximityStatic.stop();
        try { this.nokiaPhone?.close(); } catch { }
        try { this.audio.stopAll(); } catch { }
        try { this.audio.setProximityIntensity(0); } catch { }
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

    // -------------------------------------------------------------
    // Fade-pra-preto compatível com VR de verdade. O overlay 2D normal
    // (this.ui.fadeIn/fadeOut) é um <div> de HTML — não aparece dentro
    // do headset. Esta é uma esfera preta presa na própria câmera (por
    // dentro da cena 3D), então ela renderiza corretamente nos dois
    // olhos em VR e também no modo desktop normal.
    // -------------------------------------------------------------
    ensureWakeFadeOverlay() {
        if (this._wakeFadeMesh) return this._wakeFadeMesh;
        const geo = new THREE.SphereGeometry(0.6, 12, 8);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false,
            fog: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 9999; // desenha por cima de tudo, sempre
        mesh.frustumCulled = false;
        mesh.visible = false;
        this.camera.add(mesh); // segue a câmera automaticamente (desktop e VR)
        this._wakeFadeMesh = mesh;
        return mesh;
    }

    vrFadeTo(targetOpacity, durationMs) {
        // Em XR usa o overlay stereo-safe (shader); no desktop mantém a
        // esfera legada. Mesma assinatura, comportamento idêntico.
        if (this.renderer?.xr?.isPresenting && this.vrEffects) {
            return this.vrEffects.fadeTo(targetOpacity, durationMs);
        }
        const mesh = this.ensureWakeFadeOverlay();
        mesh.visible = true;
        const startOpacity = mesh.material.opacity;
        return new Promise((resolve) => {
            const start = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - start) / durationMs);
                mesh.material.opacity = startOpacity + (targetOpacity - startOpacity) * t;
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    mesh.visible = mesh.material.opacity > 0.001;
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    // Anima setWakeHaze(1 → 0) no nível atual ao longo de durationMs.
    animateWakeHazeClear(durationMs) {
        return new Promise((resolve) => {
            const start = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - start) / durationMs);
                const eased = 1 - Math.pow(1 - t, 3); // ease-out cúbico
                this.level?.setWakeHaze?.(1 - eased);
                if (t < 1) {
                    requestAnimationFrame(step);
                } else {
                    this.level?.clearWakeHaze?.();
                    resolve();
                }
            };
            requestAnimationFrame(step);
        });
    }

    // -------------------------------------------------------------
    // Sequência de despertar (chamada ao concluir a última fase).
    // Passos 1-10 do pedido: preto → segura → respiração → clareia
    // gradual + turvo→nítido → cabeça livre (VR) → sem movimento do
    // corpo → libera controle no final.
    // -------------------------------------------------------------
    async playWakeSequence() {
        const HOLD_BLACK_MS = 1400;
        const CLEAR_DURATION_MS = 4200;

        // 1) fade suave pro preto (funciona em VR — ver ensureWakeFadeOverlay)
        await this.vrFadeTo(1, 900);

        // 2) segura preto por um instante
        await new Promise((resolve) => setTimeout(resolve, HOLD_BLACK_MS));

        // Troca de cena pro quarto — ainda no preto, jogador não vê a troca
        if (this.level?.group) this.scene.remove(this.level.group);
        this.level = new RealRoom(this.scene);
        this.interactionSystem.interactables = [];
        this.interactionSystem.currentTarget = null;
        this.hud.setPrompt(null);
        if (this.entityManager) { this.entityManager.dispose(); this.entityManager = null; }
        this.player.movement.collisionWorld = this.level;

        const pose = this.level.getWakeCameraPose();
        const inXR = this.renderer.xr.isPresenting;
        if (inXR) {
            // VR: rotação sempre vem do sensor real do headset — só
            // posicionamos a origem (xrRig), com deslocamento de altura
            // pra simular estar deitado seja qual for a altura real de
            // quem estiver testando.
            const realWorldPos = new THREE.Vector3();
            this.camera.getWorldPosition(realWorldPos);
            const offsetY = pose.position.y - realWorldPos.y;
            this.xrRig.position.set(pose.position.x, offsetY, pose.position.z);
        } else {
            this.camera.position.copy(pose.position);
            this.camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
        }

        // 9) bloqueia movimento corporal — a rotação da cabeça (VR) nunca
        // é tocada aqui, continua 100% livre o tempo todo.
        this._wakeSequenceActive = true;

        // 3) respiração sutil
        try { this.audio.playWakeBreath(); } catch { }

        // turvo máximo antes de clarear
        this.level.setWakeHaze(1);

        // 4-6) revela a imagem do preto E clareia a névoa/luz ao mesmo
        // tempo, em paralelo — "abrir os olhos" e "focar a visão" juntos.
        await Promise.all([
            this.vrFadeTo(0, CLEAR_DURATION_MS),
            this.animateWakeHazeClear(CLEAR_DURATION_MS)
        ]);

        // 10) libera o controle do jogador de volta
        this._wakeSequenceActive = false;
    }

    showVRGameOver() {
        this.vrUI?.show('gameover', {
            scoreText: `${this.gameState.playerName} · ${String(this.gameState.score).padStart(3, '0')} PTS`
        });
    }

    showVREnd() {
        const mins = Math.floor(this.gameState.elapsedSeconds / 60);
        const secs = Math.floor(this.gameState.elapsedSeconds % 60);
        this.vrUI?.show('end', {
            statsText: `${this.gameState.playerName}\nPONTOS: ${this.gameState.score}\nTEMPO: ${mins}:${String(secs).padStart(2, '0')}`
        });
    }

    async completePortalRun() {
        if (this.gameState.state === 'GAMEOVER' || this.gameState.state === 'COMPLETED') {
            return;
        }
        this.gameState.setState('COMPLETED');
        this.transitioning = true;
        const inXR = this.renderer.xr.isPresenting;
        try { this.audio.stopAll(); } catch { }
        this.scoreManager.award('escape');
        this.input.clearActions();
        if (!inXR) document.exitPointerLock();


        this.hud.hide();
        if (inXR) {
            this.showVREnd();
        } else {
            this.ui.fadeOut(500);
            await this.endScreen.showLevelIntro(
                { title: 'VOCÊ ACORDA', subtitle: 'DE VOLTA À REALIDADE. QUANTO TEMPO REALMENTE SE PASSOU?' },
                3200
            );
            this.endScreen.show({
                playerName: this.gameState.playerName,
                score: this.gameState.score,
                durationSeconds: this.gameState.elapsedSeconds
            });
            this.ui.fadeOut();
        }

        this.repository.saveResult({
            playerName: this.gameState.playerName,
            score: this.gameState.score,
            duration: Math.round(this.gameState.elapsedSeconds),
            completedAt: new Date().toISOString(),
            levelName: CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'CHÃO 0',
            completed: true
        });
    }

    async gameOver() {
        if (this.gameState.state !== 'PLAYING') {
            return;
        }
        this.gameState.setState('GAMEOVER');
        this.input.clearActions();
        const inXR = this.renderer.xr.isPresenting;
        if (!inXR) document.exitPointerLock();

        try { this.audio.stopAll(); } catch { }
        this.audio.sfx('denied');
        // para ruído de proximidade e liga chuvisco total de game over
        this.proximityStatic.stop();
        if (inXR) {
            // Sequência VR: static forte CURTA (~0.6s) → fade escuro → painel.
            // Sem static intensa prolongada; haptics opcional na captura.
            try { this.haptics?.capture?.(); } catch { }
            this.vrEffects?.setProximityIntensity(0);
            this.vrEffects?.setChaseBoost?.(false);
            this.vrEffects?.setStaticIntensity(1);
            await new Promise((r) => setTimeout(r, 600));
            this.vrEffects?.setStaticIntensity(0);
            await this.vrEffects?.fadeTo(1, 450);
            this.hud.hide();
            this.showVRGameOver();
            this.vrEffects?.fadeTo(0, 600);
        } else {
            this.staticEffect.start();
            await this.ui.fadeIn(700);
            this.hud.hide();
            document.getElementById('go-player').textContent = this.gameState.playerName;
            document.getElementById('go-score').textContent = String(this.gameState.score).padStart(3, '0');
            document.getElementById('game-over-screen').classList.remove('hidden');
            this.ui.fadeOut(300);
        }

        this.repository.saveResult({
            playerName: this.gameState.playerName,
            score: this.gameState.score,
            duration: Math.round(this.gameState.elapsedSeconds),
            completedAt: new Date().toISOString(),
            levelName: CONFIG.levels.names[this.levelIndex] ?? 'CHÃO 0',
            completed: false
        });
    }

    requestPointerLock() {
        const el = this.renderer?.domElement;
        if (!el || typeof el.requestPointerLock !== 'function') return;
        // Garante foco antes de travar (alguns browsers exigem)
        try { el.focus?.(); } catch { }
        const result = el.requestPointerLock();
        if (result && typeof result.catch === 'function') {
            result.catch((err) => {
                console.warn('[Game] requestPointerLock falhou:', err?.message ?? err);
            });
        }
    }

    getMissingRequiredItems() {
        if (!this.diffConfig) return [];
        const required = [];
        if (this.diffConfig.hasRadarRequirement && !this.gameState.hasItem('radar')) required.push('RADAR');
        if (this.diffConfig.hasPhoneRequirement && !this.gameState.hasItem('phone')) required.push('CELULAR');
        if (this.diffConfig.hasFlashlightRequirement && !this.gameState.hasItem('flashlight')) required.push('LANTERNA');
        return required;
    }

    onPointerLockChange() {
        if (this.renderer?.xr?.isPresenting) {
            // em VR o pause 3D já foi tratado em pause()/resume()
            return;
        }
        // Transição XR pendente: a perda de pointerlock ao clicar ENTER VR
        // NÃO pode pausar o jogo (race sessionstart vs pointerlockchange).
        if (this._xrEntryPending) return;
        // Se o lock foi adquirido, esconde pausa caso estivesse visível
        if (document.pointerLockElement !== null) {
            if (this.gameState.state === 'PAUSED') {
                if (this.ui.isPauseVisible()) {
                    this.ui.hidePause();
                    this.gameState.setState('PLAYING');
                    this._lastPlayStart = performance.now();
                }
            }
            return;
        }
        // Celular aberto libera o cursor intencionalmente — não pausar
        if (this.nokiaPhone?.isOpen) return;
        // Evita pausar imediatamente após entrar em PLAYING (lock ainda não concedido)
        // - sem isso a câmera/minimapa parecem congelados no primeiro segundo
        if (document.pointerLockElement === null && this.gameState.state === 'PLAYING' && !this.transitioning) {
            const elapsedSincePlay = performance.now() - this._lastPlayStart;
            if (elapsedSincePlay < 900) return;
            this.pause();
        }
    }

    pause() {
        if (this.gameState.state !== 'PLAYING') return;
        this.gameState.setState('PAUSED');
        this.input.clearActions();
        if (this.renderer.xr.isPresenting) {
            this.vrUI?.show('pause', { sessionTimeSec: this.xrSessionPlayTime });
        } else {
            this.ui.showPause();
        }
        try { this.audio.context?.suspend?.(); } catch { }
    }

    resume() {
        if (this.gameState.state !== 'PAUSED') {
            // sessionstart pode chamar resume conceitual quando já PLAYING
            if (this.renderer.xr.isPresenting) this.vrUI?.show('playing');
            return;
        }
        this.gameState.setState('PLAYING');
        this._lastPlayStart = performance.now();
        try { this.audio.context?.resume?.(); } catch { }
        try { this.audio.resume?.(); } catch { }
        if (this.renderer.xr.isPresenting) {
            this.vrUI?.show('playing');
            this._syncVRHUD();
        } else {
            this.ui.hidePause();
            if (!this.renderer.xr.isPresenting) this.requestPointerLock();
        }
    }

    restart() {
        const inXR = this.renderer.xr.isPresenting;
        if (inXR) this.vrEffects?.fadeTo(1, 350);
        this.staticEffect.stop();
        this.proximityStatic.stop();
        this.vrEffects?.setStaticIntensity(0);
        this.vrEffects?.setProximityIntensity(0);
        this.cleanupRun();
        this.transitioning = false;
        this.endScreen.hide();
        document.getElementById('game-over-screen')?.classList.add('hidden');
        this.ui.hidePause();
        this.notificationSystem.clear();
        // preserve checkpoint so restart resumes at highest reached level
        this.gameState.reset(true);
        this.objectiveManager.reset();
        this.hud.reset();
        this.hud.setDifficulty(this.difficulty);

        // show checkpoint in HUD
        try { this.hud.setCheckpoint(this.gameState.checkpointLevelIndex ?? 0); } catch { }
        this.gameState.setState('PLAYING');
        this._realPause = false;
        this._lastPlayStart = performance.now();
        this.hud.show();
        this.loadLevel();
        this._attachXRDevices();
        if (this.player) {
            const p = this.player.getPosition();
            this.xrRig.position.set(inXR ? p.x : 0, 0, inXR ? p.z : 0);
        }
        if (inXR) {
            this.vrUI?.show('playing');
            this._syncVRHUD();
            this.vrEffects?.fadeTo(0, 500);
        } else {
            this.requestPointerLock();
        }
    }

    backToMenu() {
        const inXR = this.renderer.xr.isPresenting;
        this.staticEffect.stop();
        this.proximityStatic.stop();
        this.vrEffects?.stopAll();
        this.cleanupRun();
        this.transitioning = false;
        this._realPause = false;
        this.endScreen.hide();
        document.getElementById('game-over-screen')?.classList.add('hidden');
        this.ui.hidePause();
        this.notificationSystem.clear();
        // keep the highest reached floor when returning to the menu after death
        this.gameState.reset(true);
        this.objectiveManager.reset();
        this.hud.reset();
        this.hud.setDifficulty(null);
        this.hud.hide();
        this.resetFog();
        this.gameState.setState('MENU');
        if (inXR) {
            // Permanece na sessão XR com o menu principal 3D.
            this.mainMenu.hide();
            this.vrUI?.show('main', {
                playerName: this.resolveVRPlayerName(),
                levelName: CONFIG.levels.names[this.gameState.currentLevelIndex] ?? 'CHÃO 0'
            });
        } else {
            this.mainMenu.show();
        }
    }

    animate(timestamp) {
        this.clock.update(timestamp);
        const delta = Math.min(this.clock.getDelta(), 0.05);
        const time = this.clock.getElapsed();
        const inXR = this.renderer.xr.isPresenting;

        // Input XR NUNCA é suspenso: pause/menu/gameover precisam de resume,
        // navegação, trigger-select e tracking contínuo. Só a locomoção do
        // player e o gameplay ficam bloqueados fora de PLAYING.
        if (inXR) {
            try { this.input.updateXR(delta); } catch (err) { console.warn('[Game] input XR falhou', err); }
            try { this._attachXRDevicesLazy(); } catch { }
        }

        const playing = this.gameState.state === 'PLAYING';
        if (playing) {
            this.gameState.elapsedSeconds += delta;
            if (!inXR) {
                try { this.input.updateXR(delta); } catch { }
            }
            try {
                if (!this._wakeCameraTest && !this._wakeSequenceActive) {
                    this.player.update(delta, !this.nokiaPhone?.isOpen);
                    this.level.setPlayerPosition(this.player.getPosition());
                }
            } catch (err) {
                console.warn('[Game] player.update falhou', err);
            }
            try {
                if (inXR) {
                    const right = this.input.xrSources.right?.controller ?? null;
                    this.interactionSystem.update(right);
                    this._syncVRLaser();
                    // Prompt 3D no HUD VR (DOM invisível no headset).
                    const prompt = this.interactionSystem.currentTarget?.getPrompt?.() ?? null;
                    this.vrUI?.setHUD({ prompt: prompt ?? '' });
                } else {
                    this.interactionSystem.update();
                }
            } catch (err) { console.warn('[Game] interactionSystem.update falhou', err); }
            if (this.level.updateAmbientEvents) {
                try { this.level.updateAmbientEvents(delta, time); } catch (err) { console.warn('[Game] ambientEvents falhou', err); }
            }
            if (this.entityManager) {
                try { this.entityManager.update(delta, time, () => this.gameOver()); } catch (err) { console.warn('[Game] entityManager.update falhou', err); }
                try { this.updateProximityNoise(); } catch (err) { console.warn('[Game] proximity update falhou', err); }
            } else {
                try { this.proximityStatic.setIntensity(0); } catch { }
                try { this.vrEffects?.setProximityIntensity(0); } catch { }
            }
            if (this.flashlight) {
                try { this.flashlight.update(delta, time); } catch (err) { console.warn('[Game] flashlight.update falhou', err); }
                try { this.updateDynamicFog(delta, time); } catch (err) { console.warn('[Game] dynamic fog falhou', err); }
            } else {
                try { this.updateDynamicFog(delta, time); } catch { }
            }
            if (this.nokiaPhone?.update) {
                try { this.nokiaPhone.update(delta, time); } catch { }
            }
            // Listener acompanha a pose world real do headset em XR.
            try {
                if (inXR) {
                    const xrCam = this.renderer.xr.getCamera?.(this.camera) ?? this.camera;
                    this.audio.updateListener(xrCam);
                } else {
                    this.audio.updateListener(this.camera);
                }
            } catch { }

            if (this.gameState.hasItem('phone')) {
                this.phoneTimer += delta;
                if (this.phoneTimer > 18) {
                    this.phoneTimer = 0;
                    try { this.sendPhoneMessage(); } catch { }
                }
            }
            try { this.hud.updateMinimap(this.player.getPosition(), this.player.controller.yaw); } catch (err) { console.warn('[Game] minimap update falhou', err); }
            // passos do jogador -> sfx footstep por superfície (grip conta como movimento)
            try {
                const keysMoving = ['forward', 'backward', 'left', 'right']
                    .some((action) => this.input.isActionActive(action));
                const xrMove = this.input.getXRMoveInput?.() ?? { x: 0, z: 0 };
                const xrMoving = Math.hypot(xrMove.x, xrMove.z) > 0.12;
                const sprint = this.input.isActionActive('run') || this.input.isXRSprinting();
                const surface = this.level?.footstepSurface || 'carpet';
                if ((keysMoving || (inXR && xrMoving)) && this.gameState.state === 'PLAYING') this.audio.playFootstep(sprint, surface);
            } catch { }
            // Comfort XR por frame: vignette dirigida pela VELOCIDADE REAL
            // (currentVelocity), sessão local e HUD minimal em sprint/chase.
            // Head tracking nunca é tocado — só locomotion artificial.
            if (inXR) {
                try { this.xrSessionPlayTime += delta; } catch { }
                try {
                    const eff = this.comfort.getEffectiveConfig();
                    const speed = this.player?.getSpeed?.() ?? 0;
                    const top = Math.max(0.5, eff.sprintSpeed || 3.4);
                    const norm = Math.max(0, Math.min(1, speed / top));
                    this.vrEffects?.setLocomotionVignette?.(norm, eff.vignetteStrength, eff.vignette);
                    const sprinting = !!this.input?.isXRSprinting?.();
                    const chasing = !!this._wasHunt;
                    this.vrUI?.setHUD?.({ minimal: sprinting || chasing });
                } catch { }
            }
        } else if (inXR) {
            // Fora de PLAYING mas em XR: mantém HUD/menus/efeitos vivos sem
            // suspender o animation loop nem o polling dos controllers.
            try {
                if (this.vrUI?.isMenuOpen) {
                    const right = this.input.xrSources.right?.controller ?? null;
                    const left = this.input.xrSources.left?.controller ?? null;
                    const rightHit = this.vrUI.updatePointer(right);
                    if (!rightHit) this.vrUI.updatePointer(left);
                }
                this.vrUI?.update(time);
                this.vrEffects?.update(time, delta);
            } catch { }
        }

        if (inXR) {
            try {
                this.vrEffects?.update(time, delta);
                // Performance = conforto: monitor leve + qualidade adaptativa
                // SÓ de cosméticos (nunca collision/AI/input/tracking).
                try {
                    const prev = this.perfMonitor.level;
                    const lvl = this.perfMonitor.update(delta);
                    if (lvl !== prev) this._applyPerfLevel(lvl);
                } catch { }
                // Throttle extra do HUD em nível mínimo (CanvasTexture).
                this._perfHudTick = (this._perfHudTick ?? 0) + 1;
                const hudEvery = this.perfMonitor.level >= 2 ? 2 : 1;
                if (this._perfHudTick % hudEvery === 0) this.vrUI?.update(time);
                if (CONFIG.xr?.debugInput === true && this.vrUI?.mode === 'playing') {
                    const dbg = this.input.getXRDebugState?.();
                    if (dbg) {
                        const fmt = (s) => s ? `grip:${s.grip ? 1 : 0} trig:${s.trigger ? 1 : 0} st:(${s.stick.x.toFixed(2)},${s.stick.y.toFixed(2)})` : '—';
                        this.vrUI.setHUD({ debug: `L ${fmt(dbg.left)}\nR ${fmt(dbg.right)}\nmove:(${dbg.move.x.toFixed(2)},${dbg.move.z.toFixed(2)}) sprint:${dbg.sprinting ? 1 : 0}` });
                    }
                }
                if (CONFIG.xr?.debugComfort === true && this.vrUI?.mode === 'playing') {
                    try {
                        const eff = this.comfort.getEffectiveConfig();
                        const stats = this.perfMonitor.getStats?.() ?? {};
                        const prox = this.vrEffects?.proximity ?? 0;
                        const vig = this.vrEffects?.comfortVignette ?? 0;
                        const spd = this.player?.getSpeed?.() ?? 0;
                        const tgt = Math.hypot(
                            this.player?.movement?.targetVelocity?.x ?? 0,
                            this.player?.movement?.targetVelocity?.z ?? 0
                        );
                        this.vrUI.setHUD({
                            debugComfort: `profile:${eff.profileName} loco:${eff.locomotionMode}\nspd:${spd.toFixed(2)} tgt:${tgt.toFixed(2)} vig:${vig.toFixed(2)}\nframe:${(stats.avgMs ?? 0).toFixed(1)}ms worst:${(stats.worstMs ?? 0).toFixed(1)}ms\nprox:${prox.toFixed(2)} flick:${eff.flickerScale}`
                        });
                    } catch { }
                }
            } catch { }
        }

        if (this.level) {
            try { this.level.update(delta, time); } catch (err) { console.warn('[Game] level.update falhou', err); }
        }

        try { this.retroRenderer.render(this.scene, this.camera, time); } catch (err) { console.warn('[Game] render falhou', err); }
    }

    // Qualidade adaptativa: degrada SÓ cosméticos, com hysteresis/cooldown
    // no monitor (sem oscilação). Ordem: partículas do portal → proximity →
    // CanvasTexture do HUD. Nunca collision/AI/input/head tracking.
    _applyPerfLevel(level) {
        try {
            const base = this.comfort?.getEffectiveConfig?.().effectsScale ?? 1;
            const scale = level === 0 ? base : level === 1 ? Math.min(base, 0.6) : 0.35;
            this.vrEffects?.setEffectsScale(scale);
        } catch { }
        try {
            if (this.level?.portal?.particles) this.level.portal.particles.visible = level < 2;
        } catch { }
    }

    _attachXRDevicesLazy() {
        // Controllers podem conectar depois de sessionstart; garante anexo.
        const left = this.input.xrSources.left?.controller ?? null;
        const right = this.input.xrSources.right?.controller ?? null;
        if (left && this.nokiaPhone && this.nokiaPhone.xrController !== left) {
            try { this.nokiaPhone.setXRController(left); } catch { }
        }
        if (right && this.flashlight && this.flashlight.xrController !== right) {
            try { this.flashlight.setXRController(right); } catch { }
        }
    }

    updateDynamicFog(delta, time) {
        if (!this.scene?.fog || !this._baseFog) return;
        const isOn = this.flashlight?.isOn() && this.gameState?.hasItem('flashlight');
        // bônus de visão com lanterna: quanto mais difícil, maior o ganho
        const bonusByDiff = this.difficulty === 'hard' ? 16 : this.difficulty === 'normal' ? 10 : 6;
        const targetFar = this._baseFog.far + (isOn ? bonusByDiff + Math.sin(time * 2.1) * 1.2 : 0);
        const targetNear = this._baseFog.near + (isOn ? 2.5 + Math.sin(time * 1.3) * 0.6 : 0);
        // lerp suave
        const lerp = 1 - Math.pow(0.001, delta * 3); // ~0.15 a 60fps
        // fallback para delta grande
        const t = Math.min(1, delta * 4);
        const mix = lerp || t;
        this.scene.fog.far += (targetFar - this.scene.fog.far) * Math.min(1, delta * 5);
        this.scene.fog.near += (targetNear - this.scene.fog.near) * Math.min(1, delta * 5);
    }

    updateProximityNoise() {
        if (!this.entityManager || !this.proximityStatic) return;
        const entities = this.entityManager.entities;
        if (!entities || entities.length === 0) {
            this.proximityStatic.setIntensity(0);
            try { this.vrEffects?.setProximityIntensity(0); } catch { }
            return;
        }
        const level = this.level;
        // Em XR usa a cabeça real (room-scale); no desktop, movement.position.
        const playerPos = this.renderer.xr.isPresenting
            ? this.getXRPlayerWorldPosition(new THREE.Vector3())
            : (this.player?.getPosition() ?? this.playerPosRef);
        // distância pelo corredor (BFS) — não atravessa paredes
        const pathDistFor = (entity) => {
            try {
                if (!level || !level.worldToCell || !level.isSolidCell) return entity.distanceToPlayerXZ();
                const eCell = level.worldToCell(entity.group.position.x, entity.group.position.z);
                const pCell = level.worldToCell(playerPos.x, playerPos.z);
                if (eCell.x === pCell.x && eCell.z === pCell.z) return entity.distanceToPlayerXZ();
                // Se linha reta não bloqueada, usa euclidiana (mais barato e preciso)
                if (!entity.lineBlocked || !entity.lineBlocked(entity.group.position, playerPos)) {
                    return entity.distanceToPlayerXZ();
                }
                // BFS pelo grid para distância pelo corredor
                const cols = level.cols, rows = level.rows;
                const q = [{ x: eCell.x, z: eCell.z, d: 0 }];
                const visited = new Set([`${eCell.x},${eCell.z}`]);
                let head = 0;
                while (head < q.length) {
                    const cur = q[head++];
                    if (cur.x === pCell.x && cur.z === pCell.z) {
                        return cur.d * CONFIG.game.cellSize;
                    }
                    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = cur.x + dx, nz = cur.z + dz;
                        const key = `${nx},${nz}`;
                        if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
                        if (visited.has(key)) continue;
                        if (level.isSolidCell(nx, nz)) continue;
                        visited.add(key);
                        q.push({ x: nx, z: nz, d: cur.d + 1 });
                    }
                    if (q.length > 400) break;
                }
                // sem caminho: penaliza (parede grossa)
                return entity.distanceToPlayerXZ() * 2.2 + 12;
            } catch { return entity.distanceToPlayerXZ(); }
        };
        let minDist = Infinity;
        let maxObserve = 0;
        for (const e of entities) {
            const d = pathDistFor(e);
            if (d < minDist) minDist = d;
            if (e.observeRange > maxObserve) maxObserve = e.observeRange;
        }
        const maxDist = maxObserve || (9 * 3.5);
        const minClose = 2.0;
        let t = 0;
        if (minDist >= maxDist) t = 0;
        else if (minDist <= minClose) t = 1;
        else t = (maxDist - minDist) / (maxDist - minClose);
        t = Math.pow(Math.max(0, Math.min(1, t)), 1.35);
        let isHunt = false;
        let huntEntity = null;
        try {
            isHunt = entities.some(e => e.state === 'CHASING' || e.state === 'STALKING');
            huntEntity = entities.find(e => e.state === 'CHASING' || e.state === 'STALKING');
            if (isHunt) t = Math.min(1, t * 1.15 + 0.08);
        } catch { }
        if (entities.every(e => e.state === 'GONE' || e.state === 'IDLE_HIDDEN') && minDist > maxDist * 0.75) t *= 0.5;
        if (minDist > maxDist * 0.9) t *= 0.25;
        this.proximityStatic.setIntensity(t);
        // Mesmo t controla o overlay stereo-safe no headset, com curva XR
        // distinta (pow 1.5 × profileStrength) — desktop intacto.
        try {
            const visual = this.comfort?.getEffectiveConfig?.().proximityVisualStrength;
            this.vrEffects?.setProximityIntensity(t, visual);
        } catch { }
        try { this.audio.setProximityIntensity(t); } catch { }
        // chase layer: heartbeat + growl + ducking
        try {
            const wasHunt = this._wasHunt || false;
            if (isHunt && t > 0.28) {
                if (!wasHunt) {
                    const pos = huntEntity ? huntEntity.group.position : playerPos;
                    this.audio.playEntityGrowl(pos, t);
                    this.audio.startHeartbeat();
                    this.audio.duckBus('ambient', 0.62, 0.5);
                    // Comfort: vignette extra pequena no chase + haptic sutil.
                    try { this.vrEffects?.setChaseBoost?.(true); } catch { }
                    try { this.haptics?.chaseStart?.(); } catch { }
                }
                this.audio.updateHeartbeatRate(t);
                if (huntEntity && Math.random() < 0.07) this.audio.playEntityBreathAsset(huntEntity.group.position, t);
            } else if (wasHunt && !isHunt) {
                this.audio.stopHeartbeat(1.4);
                this.audio.setBusVolume('ambient', 1, 1.2);
                try { this.vrEffects?.setChaseBoost?.(false); } catch { }
            }
            // vanish detect
            for (const e of entities) {
                const prev = e._prevStateForAudio || null;
                if (e.state === 'VANISHING' && prev !== 'VANISHING') {
                    this.audio.playEntityVanish(e.group.position);
                }
                e._prevStateForAudio = e.state;
            }
            this._wasHunt = isHunt;
        } catch { }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.retroRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}
