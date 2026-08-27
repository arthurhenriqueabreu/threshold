import { Level0 } from './Level0.js';

export class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = null;
    }

    load(name, options) {
        this.unload();
        switch (name) {
            case 'level0':
                this.currentLevel = new Level0(this.scene, options);
                break;
            default:
                throw new Error(`Nível desconhecido: ${name}`);
        }
        return this.currentLevel;
    }

    unload() {
        if (this.currentLevel) {
            this.currentLevel.dispose();
            this.currentLevel = null;
        }
    }
}
