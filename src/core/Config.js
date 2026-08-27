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
        fogColor: 0x2d281a,
        fogDensity: 0.025,
        ambientIntensity: 0.7
    },

    scoring: {
        fuse: 100,
        keycard: 100,
        power: 200,
        portal: 100
    },

    interaction: {
        maxDistance: 2.5
    },

    difficulty: {
        easy: {
            name: 'FÁCIL',
            description: 'Sem ameaças, guia de localização ativo, interação mais generosa',
            hasGuide: true,
            hasEntities: false,
            interactionDistanceMult: 1.5,
            flickerIntensity: 0.5,
            ambientEventChance: 0.15,
            guidePulseSpeed: 2.0
        },
        normal: {
            name: 'NORMAL',
            description: 'Experiência padrão, eventos atmosféricos ocasionais',
            hasGuide: false,
            hasEntities: false,
            interactionDistanceMult: 1.0,
            flickerIntensity: 1.0,
            ambientEventChance: 0.35,
            guidePulseSpeed: 0
        },
        hard: {
            name: 'DIFÍCIL',
            description: 'Eventos intensos, luzes instáveis, sensação constante de observação',
            hasGuide: false,
            hasEntities: true,
            interactionDistanceMult: 0.8,
            flickerIntensity: 1.8,
            ambientEventChance: 0.65,
            guidePulseSpeed: 0
        }
    }
};
