import * as THREE from 'three';

export class Interactable {
    constructor(meshes) {
        this.meshes = Array.isArray(meshes) ? meshes : [meshes];
        this.active = true;
    }

    canInteract() {
        return this.active;
    }

    getPrompt() {
        return '[E] Interagir';
    }

    update(delta, time) {}

    interact() {}
}

export function makeInteractableMesh(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) {
        mesh.position.copy(position);
    }
    return mesh;
}
