import { Level0 } from './Level0.js';
import { Level1 } from './Level1.js';
import { Level2 } from './Level2.js';

const LEVEL_CLASSES = [Level0, Level1, Level2];

export class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = null;
    }

    load(indexOrName, options) {
        this.unload();
        let index;
        if (typeof indexOrName === 'number') {
            index = indexOrName;
        } else {
            const match = /^(?:level)?(\d+)$/.exec(indexOrName);
            index = match ? parseInt(match[1], 10) : 0;
        }
        const LevelClass = LEVEL_CLASSES[index];
        if (!LevelClass) {
            throw new Error(`Nível desconhecido: ${indexOrName}`);
        }
        this.currentLevel = new LevelClass(this.scene, options);
        return this.currentLevel;
    }

    unload() {
        if (this.currentLevel) {
            this.currentLevel.dispose();
            this.currentLevel = null;
        }
    }
}