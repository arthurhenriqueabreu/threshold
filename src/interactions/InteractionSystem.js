import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export class InteractionSystem {
    constructor(camera) {
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.baseDistance = CONFIG.interaction.maxDistance;
        this.raycaster.far = this.baseDistance;
        this.interactables = [];
        this.currentTarget = null;
        this.onPromptChange = null;
        this.distanceMultiplier = 1.0;
    }

    setDistanceMultiplier(mult) {
        this.distanceMultiplier = mult;
        this.raycaster.far = this.baseDistance * mult;
    }

    register(interactable) {
        this.interactables.push(interactable);
        for (const mesh of interactable.meshes) {
            mesh.userData.interactable = interactable;
            // garante que filhos também remontam ao dono (útil para debug, mas o while acima já resolve)
            mesh.traverse((child) => {
                if (child !== mesh && !child.userData.interactable) {
                    child.userData._parentInteractable = interactable;
                }
            });
        }
    }

    unregister(interactable) {
        const index = this.interactables.indexOf(interactable);
        if (index !== -1) {
            this.interactables.splice(index, 1);
        }
    }

    update() {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        const meshes = [];
        for (const interactable of this.interactables) {
            if (interactable.active) {
                meshes.push(...interactable.meshes);
            }
        }

        // true = recursivo: Group (fuse/keycard/box/door) contém Meshes filhos
        const hits = this.raycaster.intersectObjects(meshes, true);
        let target = null;
        if (hits.length > 0) {
            let obj = hits[0].object;
            // sobe na hierarquia até achar o interactable dono
            while (obj && !obj.userData.interactable) {
                obj = obj.parent;
            }
            target = obj ? obj.userData.interactable : hits[0].object.userData.interactable;
        }

        if (target !== this.currentTarget) {
            this.currentTarget = target;
            if (this.onPromptChange) {
                this.onPromptChange(target ? target.getPrompt() : null);
            }
        }
    }

    tryInteract() {
        if (this.currentTarget && this.currentTarget.canInteract()) {
            this.currentTarget.interact();
        }
    }
}