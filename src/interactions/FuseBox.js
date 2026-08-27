import * as THREE from 'three';
import { Interactable } from './Interactable.js';

export const FuseBoxState = {
    NO_FUSE: 'NO_FUSE',
    FUSE_READY: 'FUSE_READY',
    FUSE_INSTALLED: 'FUSE_INSTALLED',
    POWER_RESTORED: 'POWER_RESTORED'
};

export class FuseBox extends Interactable {
    constructor({ mesh, indicatorMaterial, switchMesh, gameState, events, onPowerRestored }) {
        super(mesh);
        this.gameState = gameState;
        this.events = events;
        this.onPowerRestored = onPowerRestored;
        this.indicatorMaterial = indicatorMaterial;
        this.switchMesh = switchMesh;
        this.state = FuseBoxState.NO_FUSE;
        this.fuseInserted = false;
        this.powerLevel = 0;
    }

    canInteract() {
        return this.state !== FuseBoxState.POWER_RESTORED && this.active;
    }

    getPrompt() {
        switch (this.state) {
            case FuseBoxState.NO_FUSE:
                return 'Painel elétrico — sem energia';
            case FuseBoxState.FUSE_READY:
                return '[E] Inserir fusível';
            case FuseBoxState.FUSE_INSTALLED:
                return '[E] Restaurar energia';
            default:
                return null;
        }
    }

    refreshState() {
        if (this.state === FuseBoxState.NO_FUSE && this.gameState.hasItem('fuse')) {
            this.state = FuseBoxState.FUSE_READY;
        }
    }

    interact() {
        switch (this.state) {
            case FuseBoxState.NO_FUSE:
                this.events.notify('VOCÊ PRECISA DE UM FUSÍVEL', { warning: true });
                this.events.sfx('denied');
                break;
            case FuseBoxState.FUSE_READY:
                this.insertFuse();
                break;
            case FuseBoxState.FUSE_INSTALLED:
                this.restorePower();
                break;
            default:
                break;
        }
    }

    insertFuse() {
        this.state = FuseBoxState.FUSE_INSTALLED;
        this.fuseInserted = true;
        this.events.notify('FUSÍVEL INSTALADO');
        this.events.sfx('switch');
        if (this.indicatorMaterial) {
            this.indicatorMaterial.color.set(0xccaa22);
            this.indicatorMaterial.emissive.set(0x886611);
            this.indicatorMaterial.emissiveIntensity = 1.0;
        }
    }

    restorePower() {
        this.state = FuseBoxState.POWER_RESTORED;
        this.active = false;
        this.indicatorMaterial.color.set(0x33ff55);
        this.indicatorMaterial.emissive.set(0x22cc44);
        this.indicatorMaterial.emissiveIntensity = 1.5;
        if (this.switchMesh) {
            this.switchMesh.rotation.z = -Math.PI / 4;
        }
        this.events.notify('ENERGIA RESTAURADA');
        this.events.sfx('power');
        this.onPowerRestored();
    }

    update(delta, time) {
        if (this.state === FuseBoxState.FUSE_INSTALLED) {
            this.powerLevel = Math.min(1, this.powerLevel + delta * 0.5);
            if (this.indicatorMaterial) {
                const pulse = Math.sin(time * 4) * 0.5 + 0.5;
                this.indicatorMaterial.emissiveIntensity = 0.8 + pulse * 0.7;
            }
        }
        if (this.state === FuseBoxState.POWER_RESTORED) {
            if (this.indicatorMaterial) {
                const pulse = Math.sin(time * 6) * 0.5 + 0.5;
                this.indicatorMaterial.emissiveIntensity = 1.2 + pulse * 0.8;
            }
        }
    }
}