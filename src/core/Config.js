export const CONFIG = {
    game: {
        name: 'THRESHOLD',
        subtitle: 'A LIMINAL ESCAPE',
        cellSize: 3.5,
        wallHeight: 3
    },

    player: {
        speed: 3.5,
        sprintSpeed: 6,
        height: 1.7,
        radius: 0.35,
        mouseSensitivity: 0.0022,
        interactionDistance: 2.5
    },

    graphics: {
        maxPixelRatio: 2,
        fov: 75,
        near: 0.05,
        far: 120
    },

    atmosphere: {
        fogColor: 0x000000,
        fogDensity: 0.02,
        ambientIntensity: 1.0
    },

    scoring: {
        fuse: 100,
        keycard: 100,
        power: 200,
        portal: 100,
        radar: 150,
        phone: 150,
        flashlight: 250,
        part: 100,
        partA: 100,
        partB: 100,
        fragment: 150,
        generator: 200,
        stabilize: 200,
        escape: 250
    },

    entities: {
        observeRangeEasy: 7,
        observeRangeNormal: 9,
        observeRangeHard: 11,
        stalkRange: 5,
        chaseRange: 3,
        speed: {
            walk: 2.2,
            stalk: 3.0,
            chase: 5.5
        },
        chaseCooldown: 4,
        searchTime: 3.5,
        disappearTime: 1.2,
        stalkTime: 5,
        modelHeight: 2.0,
        // novo: tempo sem visão para considerar despistado + respawn
        loseTime: 3.2,
        vanishTime: 0.7,
        respawnDelay: { min: 7, max: 13 },
        observeDelay: { benign: 0.6, stalker: 0.4, timid: 0.35, aggressive: 0.12 }
    },

    items: {
        radar: { label: 'RADAR', color: 0x44ffaa },
        phone: { label: 'CELULAR', color: 0x66ccff },
        flashlight: { label: 'LANTERNA', color: 0xffdd66 }
    },

    interaction: {
        maxDistance: 2.5,
        // Small mandatory pickups get a forgiving XR hit target without
        // changing their visual size.
        pickupProxyRadius: 0.44
    },

    retro: {
        enabled: true,
        internalResolutionHeight: 240,
        pixelatedUpscale: true,
        textureResolution: 128,
        nearestFiltering: true,
        disableMipmaps: true,
        flatShading: true,
        vertexSnapping: false,
        vertexSnapStrength: 0,
        affineMapping: true,
        affineStrength: 0.3,
        dithering: true,
        ditherStrength: 0.4,
        colorQuantization: true,
        colorBits: 6,
        postGamma: 0.85,
        fogNear: 12,
        fogFar: 62,
        // Fog preto por dificuldade (quanto mais difícil, mais perto)
        fogByDifficulty: {
            easy: { near: 12, far: 34 },
            normal: { near: 11, far: 32 },
            hard: { near: 6, far: 18 }
        },
        portalPixelGrid: 96,
        // XR-safe presentation: preserves PS1 look (nearest filtering,
        // flat shading) with a stable color palette. Geometry/UV shader
        // distortions stay off because some Quest WebGL runtimes can reject
        // or destabilize those custom paths in stereo.
        vrSafe: {
            vertexSnapping: false,
            vertexSnapStrength: 0,
            affineMapping: false,
            affineStrength: 0,
            colorQuantization: true,
            // Mesma paleta/curva do desktop, aplicada por material para
            // continuar compatível com o framebuffer stereo do Quest.
            quantizationStrength: 0.35,
            postGamma: 0.85,
            dithering: false,
            internalLowRes: false,
            framebufferScale: 0.75
        }
    },

    difficulty: {
        easy: {
            name: 'FÁCIL',
            description: 'Minimapa, guia ativo, entidade stalker (só observa e segue, não mata)',
            hasGuide: true,
            hasMinimap: true,
            hasEntities: true,
            hasRadarRequirement: false,
            hasPhoneRequirement: false,
            hasFlashlightRequirement: false,
            enemyMode: 'stalker',        // só segue à distância, nunca CHASING
            darkness: 1.0,
            entityCount: 1,
            interactionDistanceMult: 1.5,
            flickerIntensity: 0.5,
            ambientEventChance: 0.15,
            guidePulseSpeed: 2.0
        },
        normal: {
            name: 'NORMAL',
            description: 'Precisa radar e celular; entidades observam, seguem e perseguem tarde',
            hasGuide: false,
            hasMinimap: false,
            hasEntities: true,
            hasRadarRequirement: true,
            hasPhoneRequirement: true,
            hasFlashlightRequirement: false,
            enemyMode: 'timid',         // OBSERVING -> STALKING -> CHASING (tarde)
            darkness: 1.0,
            entityCount: 1,
            interactionDistanceMult: 1.0,
            flickerIntensity: 1.0,
            ambientEventChance: 0.35,
            guidePulseSpeed: 0
        },
        hard: {
            name: 'DIFÍCIL',
            description: 'Exige lanterna e celular (F alterna lanterna, Q celular); entidades agressivas',
            hasGuide: false,
            hasMinimap: false,
            hasEntities: true,
            hasRadarRequirement: false,
            hasPhoneRequirement: false,
            hasFlashlightRequirement: true,
            enemyMode: 'aggressive',
            darkness: 1.0,
            entityCount: 1,
            interactionDistanceMult: 0.8,
            flickerIntensity: 1.8,
            ambientEventChance: 0.65,
            guidePulseSpeed: 0
        }
    },

    levels: {
        count: 3,
        // Dificuldade automática por andar (índice = nível): 0=fácil, 1=médio, 2=difícil.
        // Não é mais escolhida no menu — a progressão em si já é a dificuldade.
        difficultyByLevel: ['easy', 'normal', 'hard'],
        names: ['CHÃO 0', 'CHÃO 1', 'CHÃO 2'],
        // Texto mostrado na transição ao ENTRAR em cada andar (índice 0
        // nunca é mostrado — o jogo já começa nele, sem tela de transição).
        subtitles: [
            '',
            'ISSO NÃO É SÓ ABANDONO.',
            'A ÚLTIMA PORTA.'
        ]
    },

    xr: {
        gripLocomotion: true,
        armSwing: false,
        walkSpeed: 2.2,
        sprintSpeed: 3.4,
        // Quest default: smooth continuous turning. Snap remains available
        // as an explicit comfort option.
        turnMode: 'smooth',
        smoothTurnSpeed: 85,
        smoothTurnDeadzone: 0.18,
        smoothTurnExponent: 1.35,
        snapTurnAngle: 30,
        snapTurnCooldown: 0.28,
        snapTurnThreshold: 0.70,
        snapTurnReleaseThreshold: 0.22,
        controllerRayDistance: 3.5,
        pickupGrabRadius: 0.65,
        menuStickThreshold: 0.68,
        menuStickReleaseThreshold: 0.24,
        // Raio conservador do HMD para room-scale: impede que olhos/cabeça
        // atravessem parede mesmo quando o rig ainda está em posição livre.
        headColliderRadius: 0.28,
        proximityEffectStrength: 0.65,
        debugInput: false,
        // Comfort overlay: mostra profile/velocidade/vignette/frame ms no HUD VR.
        debugComfort: false,
        // Índices de botão no perfil Quest (podem variar por profile;
        // ver log [XR] connected). Padrão touch/oculus:
        // 0=trigger(index), 1=squeeze(grip), 3=thumbstick, 4=X/A, 5=B/Y
        buttons: { trigger: 0, squeeze: 1, thumbstick: 3, primary: 4, secondary: 5 },
        // Locomotion alternativa opcional p/ usuários sensíveis.
        // 'continuous' (default) | 'blink'. Blink nunca atravessa paredes.
        locomotionMode: 'continuous',
        blinkStep: {
            distance: 1.0,
            minDistance: 0.7,
            maxDistance: 1.2,
            cooldown: 0.45,
            substeps: 8
        },
        // Comfort profiles (pontos iniciais de playtest — não são valores
        // científicos universais; conforto varia entre indivíduos).
        // DEFAULT: standard. intense nunca é default.
        comfortProfile: 'standard',
        comfortProfiles: {
            comfort: {
                walkSpeed: 1.7,
                sprintSpeed: 2.7,
                acceleration: 5.0,
                deceleration: 7.5,
                vignette: true,
                vignetteStrength: 0.65,
                proximityVisualStrength: 0.40,
                flickerScale: 0.45,
                affineMapping: false
            },
            standard: {
                walkSpeed: 2.2,
                sprintSpeed: 3.4,
                acceleration: 6.5,
                deceleration: 8.5,
                vignette: true,
                vignetteStrength: 0.45,
                proximityVisualStrength: 0.55,
                flickerScale: 0.65,
                affineMapping: false
            },
            intense: {
                walkSpeed: 2.6,
                sprintSpeed: 4.0,
                acceleration: 8.0,
                deceleration: 10.0,
                vignette: false,
                vignetteStrength: 0,
                proximityVisualStrength: 0.65,
                flickerScale: 1.0,
                affineMapping: false
            }
        },
        // Runtime overrides do menu CONFORTO VR (persistidos em localStorage).
        // null = usar o valor do profile ativo.
        comfortOverrides: {
            vignette: null,
            turnMode: null,
            snapTurnAngle: null,
            speedScale: null,
            effectsScale: null,
            locomotionMode: null
        }
    }
};
