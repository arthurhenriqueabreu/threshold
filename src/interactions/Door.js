import * as THREE from 'three';
import { Interactable } from './Interactable.js';

export class Door extends Interactable {
    constructor({ pivot, panelMesh, cell, gameState, events, readerLight, switchMesh }) {
        super(panelMesh);
        this.pivot = pivot;
        this.panelMesh = panelMesh;
        this.cell = cell;
        this.gameState = gameState;
        this.events = events;
        this.readerLight = readerLight;
        this.switchMesh = switchMesh;
        this.isOpen = false;
        this.openAmount = 0;
        this.cardInserted = false;
        this.readerPulse = 0;
    }

    canInteract() {
        return !this.isOpen && this.active;
    }

    getPrompt() {
        if (this.gameState.hasItem('keycard')) {
            return this.cardInserted ? '[E] Abrir porta' : '[E] Usar cartão';
        }
        return 'Acesso negado — cartão necessário';
    }

    interact() {
        if (!this.gameState.hasItem('keycard')) {
            this.events.notify('ACESSO NEGADO\nCARTÃO NECESSÁRIO', { warning: true });
            this.events.sfx('denied');
            this.pulseReader(true);
            return;
        }
        if (!this.cardInserted) {
            this.insertCard();
        } else {
            this.open();
        }
    }

    insertCard() {
        this.cardInserted = true;
        this.events.notify('CARTÃO ACEITO\nPORTA DESBLOQUEADA');
        this.events.sfx('switch');
        this.pulseReader(false);
        if (this.readerLight) {
            this.readerLight.emissive.set(0x00cc44);
            this.readerLight.color.set(0x00cc44);
            this.readerLight.emissiveIntensity = 1.0;
            this.readerLight.needsUpdate = true;
        }
    }

    pulseReader(error) {
        if (!this.readerLight) return;
        const originalColor = error ? 0xcc3322 : 0x880000;
        this.readerLight.emissive.set(originalColor);
        this.readerLight.emissiveIntensity = 2.0;
        setTimeout(() => {
            if (this.readerLight) {
                this.readerLight.emissive.set(0x880000);
                this.readerLight.emissiveIntensity = 0.5;
            }
        }, 300);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.active = false;
        this.events.notify('PORTA ABERTA');
        this.events.sfx('door');
        this.events.onDoorOpened?.(this);
    }

    update(delta, time) {
        if (this.isOpen && this.openAmount < 1) {
            this.openAmount = Math.min(1, this.openAmount + delta * 1.8);
            this.pivot.rotation.y = -Math.PI / 2 * this.openAmount;
        }
        this.readerPulse += delta;
        if (this.readerLight && !this.cardInserted) {
            const pulse = Math.sin(this.readerPulse * 2.5) * 0.5 + 0.5;
            this.readerLight.emissiveIntensity = 0.3 + pulse * 0.7;
        }
        if (this.switchMesh) {
            this.switchMesh.rotation.z = this.isOpen ? -Math.PI / 4 : 0;
        }
    }

    isBlockingCell(cx, cz) {
        return !this.isOpen && this.cell.x === cx && this.cell.z === cz;
    }
}