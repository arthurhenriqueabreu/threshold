import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _pickupWorld = new THREE.Vector3();

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
        this.lastHitDistance = Infinity;
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

    _collectMeshes() {
        const meshes = [];
        for (const interactable of this.interactables) {
            if (interactable.active) {
                meshes.push(...interactable.meshes);
            }
        }
        return meshes;
    }

    _resolveTarget(hits) {
        let target = null;
        this.lastHitDistance = hits.length > 0 ? hits[0].distance : Infinity;
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
        return target;
    }

    // Desktop: ray do centro da câmera.
    updateFromCamera(camera) {
        const cam = camera ?? this.camera;
        this.raycaster.setFromCamera({ x: 0, y: 0 }, cam);
        this.raycaster.far = this.baseDistance * this.distanceMultiplier;
        const hits = this.raycaster.intersectObjects(this._collectMeshes(), true);
        return this._resolveTarget(hits);
    }

    // VR: ray do controller que está apontando (posição + forward -Z world).
    updateFromXRController(controller) {
        if (!controller) return this.updateFromCamera(this.camera);
        controller.getWorldPosition(_origin);
        controller.getWorldQuaternion(_quat);
        _dir.set(0, 0, -1).applyQuaternion(_quat).normalize();
        const dist = (CONFIG.xr?.controllerRayDistance ?? 3.0) * this.distanceMultiplier;
        this.raycaster.set(_origin, _dir);
        this.raycaster.far = Math.max(dist, this.baseDistance * this.distanceMultiplier);
        const hits = this.raycaster.intersectObjects(this._collectMeshes(), true);
        return this._resolveTarget(hits);
    }

    update(xrController = null) {
        if (xrController) return this.updateFromXRController(xrController);
        return this.updateFromCamera(this.camera);
    }

    _findNearbyPickup(controller) {
        if (!controller) return null;
        controller.getWorldPosition(_origin);
        const maxDistance = CONFIG.xr?.pickupGrabRadius ?? 0.65;
        const maxDistanceSq = maxDistance * maxDistance;
        let nearest = null;
        let nearestSq = maxDistanceSq;
        for (const interactable of this.interactables) {
            if (!interactable?.isPickupItem || !interactable.active || !interactable.canInteract?.()) continue;
            const root = interactable.meshes?.[0];
            if (!root) continue;
            root.getWorldPosition(_pickupWorld);
            const distSq = _origin.distanceToSquared(_pickupWorld);
            if (distSq <= nearestSq) {
                nearestSq = distSq;
                nearest = interactable;
            }
        }
        return nearest;
    }

    tryInteract(controller = null) {
        let target = controller ? this.updateFromXRController(controller) : this.currentTarget;
        if ((!target || !target.canInteract()) && controller) {
            target = this._findNearbyPickup(controller);
        }
        if (target && target.canInteract()) target.interact();
    }
}
