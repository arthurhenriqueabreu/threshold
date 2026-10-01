import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

// HUD + menus 3D para immersive-vr. Um único CanvasTexture/Plane head-locked
// (filho da câmera) cobre: menu principal, pausa, conforto VR, game over,
// fim, intro de nível e HUD de gameplay. Seleção via ray do controller +
// index trigger (uv hit-test).
//
// Gameplay HUD é discreto (faixas compactas, fundo transparente) e encolhe
// em sprint/chase. Comfort mitigation — desktop intacto.
export class VRUI {
    constructor(camera) {
        this.camera = camera ?? null;
        this.mode = 'hidden';
        this.onAction = null;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 640;
        this.ctx = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.colorSpace = THREE.SRGBColorSpace;
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
            fog: false
        });
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.97), this.material);
        this.mesh.name = 'VRUIPlane';
        this.mesh.renderOrder = 9990;
        this.mesh.frustumCulled = false;
        this.mesh.visible = false;
        this.group = new THREE.Group();
        this.group.name = 'VRUI';
        this.group.add(this.mesh);
        // head-locked: à frente, levemente abaixo do centro
        this.group.position.set(0, -0.08, -1.6);
        if (camera) camera.add(this.group);

        this.hud = { objective: '', level: '', score: '', prompt: '', notification: '', notificationUntil: 0, debug: '', debugComfort: '', minimal: false };
        this.buttons = [];
        this._raycaster = new THREE.Raycaster();
        this._lastDraw = 0;
        this._focusedId = null;
        // De onde os submenus foram abertos ('main' | 'pause').
        this._comfortReturn = 'pause';
        this._visualReturn = 'pause';
    }

    setActionHandler(fn) {
        this.onAction = fn;
    }

    get isMenuOpen() {
        return this.mode === 'main' || this.mode === 'pause' || this.mode === 'comfort'
            || this.mode === 'visual' || this.mode === 'gameover' || this.mode === 'end' || this.mode === 'intro';
    }

    show(mode, data = {}) {
        if (mode === 'comfort') {
            this._comfortReturn = (data.from === 'main') ? 'main' : 'pause';
        }
        if (mode === 'visual') {
            this._visualReturn = (data.from === 'main') ? 'main' : 'pause';
        }
        this.mode = mode;
        this.menuData = data;
        this.mesh.visible = mode !== 'hidden';
        this._focusedId = null;
        this._draw(performance.now() / 1000);
        if (this.isMenuOpen && this.buttons.length > 0) {
            this._focusedId = this.buttons[0].id;
            this._draw(performance.now() / 1000);
        }
    }

    hide() {
        this.mode = 'hidden';
        this.mesh.visible = false;
    }

    setHUD(partial) {
        Object.assign(this.hud, partial);
        if (this.mode === 'playing' || this.mode === 'hidden') {
            if (this.mode === 'playing') this._draw(performance.now() / 1000);
        }
    }

    notify(text, durationMs = 2600) {
        this.hud.notification = text ?? '';
        this.hud.notificationUntil = performance.now() + durationMs;
        if (this.mode === 'playing') this._draw(performance.now() / 1000);
    }

    // Raycast do controller contra o plano; retorna id do botão ou null.
    pickButton(controller) {
        if (!this.isMenuOpen || !controller || !this.mesh.visible) return null;
        const origin = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const dir = new THREE.Vector3();
        controller.getWorldPosition(origin);
        controller.getWorldQuaternion(quat);
        dir.set(0, 0, -1).applyQuaternion(quat).normalize();
        this._raycaster.set(origin, dir);
        this._raycaster.far = 10;
        const hits = this._raycaster.intersectObject(this.mesh, false);
        if (!hits.length || !hits[0].uv) return null;
        const uv = hits[0].uv;
        const x = uv.x * this.canvas.width;
        const y = (1 - uv.y) * this.canvas.height;
        const pad = 24;
        for (const b of this.buttons) {
            if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) return b.id;
        }
        return null;
    }

    updatePointer(controller) {
        if (!this.isMenuOpen || !controller) return null;
        const id = this.pickButton(controller);
        if (id && id !== this._focusedId) {
            this._focusedId = id;
            this._draw(performance.now() / 1000);
        }
        return id;
    }

    moveFocus(direction = 1, axis = 'y') {
        if (!this.isMenuOpen || this.buttons.length === 0) return null;
        let current = this.buttons.find((b) => b.id === this._focusedId);
        if (!current) {
            this._focusedId = this.buttons[0].id;
            this._draw(performance.now() / 1000);
            return this._focusedId;
        }
        const cx = current.x + current.w / 2;
        const cy = current.y + current.h / 2;
        let best = null;
        let bestScore = Infinity;
        for (const b of this.buttons) {
            if (b === current) continue;
            const bx = b.x + b.w / 2;
            const by = b.y + b.h / 2;
            const dx = bx - cx;
            const dy = by - cy;
            const primary = axis === 'x' ? dx * direction : dy * direction;
            if (primary <= 2) continue;
            const secondary = axis === 'x' ? Math.abs(dy) : Math.abs(dx);
            const score = primary + secondary * 0.45;
            if (score < bestScore) {
                bestScore = score;
                best = b;
            }
        }
        if (!best) {
            const index = this.buttons.indexOf(current);
            const step = direction >= 0 ? 1 : -1;
            best = this.buttons[(index + step + this.buttons.length) % this.buttons.length];
        }
        this._focusedId = best.id;
        this._draw(performance.now() / 1000);
        return this._focusedId;
    }

    activateFocused() {
        if (!this.isMenuOpen || !this._focusedId) return null;
        const id = this._focusedId;
        if (this.onAction) this.onAction(id);
        return id;
    }

    activatePicked(controller) {
        const id = this.pickButton(controller) ?? this._focusedId;
        if (id && this.onAction) this.onAction(id);
        return id;
    }

    update(time) {
        // expira notificação
        if (this.hud.notification && performance.now() > this.hud.notificationUntil) {
            this.hud.notification = '';
            if (this.mode === 'playing') this._draw(time);
        }
        // throttled redraw do HUD playing (2Hz basta p/ score/objetivo)
        if (this.mode === 'playing' && time - this._lastDraw > 0.5) this._draw(time);
    }

    _draw(time) {
        this._lastDraw = time;
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);
        this.buttons = [];
        if (this.mode === 'hidden' || !this.mesh.visible) {
            this.texture.needsUpdate = true;
            return;
        }
        if (this.mode === 'playing') {
            this._drawHUD(ctx, W, H);
        } else {
            this._drawMenu(ctx, W, H);
        }
        this.texture.needsUpdate = true;
    }

    _frame(ctx, W, H, title, subtitle) {
        ctx.fillStyle = 'rgba(10,8,6,0.88)';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#d8c26a';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, W - 20, H - 20);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d8c26a';
        ctx.font = 'bold 64px VT323, monospace';
        ctx.fillText(title, W / 2, 92);
        if (subtitle) {
            ctx.fillStyle = '#fff4d6';
            ctx.font = '30px VT323, monospace';
            ctx.fillText(subtitle, W / 2, 134);
        }
    }

    _button(ctx, id, label, cx, y, w = 560, h = 74) {
        const x = cx - w / 2;
        const focused = id === this._focusedId;
        ctx.fillStyle = focused ? 'rgba(216,194,106,0.38)' : 'rgba(216,194,106,0.14)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = focused ? '#fff4d6' : '#d8c26a';
        ctx.lineWidth = focused ? 6 : 3;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = focused ? '#ffffff' : '#fff4d6';
        ctx.font = '34px VT323, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, y + 48);
        this.buttons.push({ id, x, y, w, h });
    }

    _smallNote(ctx, W, H, text) {
        ctx.fillStyle = 'rgba(216,194,106,0.8)';
        ctx.font = '22px VT323, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, W / 2, H - 40);
    }

    _profileLabel(name) {
        if (name === 'comfort') return 'CONFORTO';
        if (name === 'intense') return 'INTENSO';
        return 'PADRÃO';
    }

    _drawMenu(ctx, W, H) {
        const d = this.menuData ?? {};
        if (this.mode === 'main') {
            this._frame(ctx, W, H, 'THRESHOLD', 'A LIMINAL ESCAPE');
            ctx.fillStyle = '#fff4d6';
            ctx.font = '28px VT323, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(d.levelName ?? 'CHÃO 0', W / 2, 180);
            ctx.font = '24px VT323, monospace';
            ctx.fillStyle = 'rgba(255,244,214,0.85)';
            ctx.fillText('STICK = selecionar  •  A ou TRIGGER = confirmar', W / 2, 218);
            ctx.fillText('NO JOGO: GRIP/STICK ESQ = mover  •  STICK DIR = girar', W / 2, 250);
            this._button(ctx, 'vr-start', '[ INICIAR ]', W / 2, 292);
            this._button(ctx, 'vr-comfort', '[ CONFORTO VR ]', W / 2, 376, 560, 64);
            this._button(ctx, 'vr-visual', '[ VISUAL PS1 ]', W / 2, 450, 560, 58);
            ctx.fillStyle = 'rgba(216,194,106,0.8)';
            ctx.font = '22px VT323, monospace';
            ctx.fillText(d.playerName ? `JOGADOR: ${d.playerName}` : 'Aponte + TRIGGER p/ selecionar', W / 2, H - 40);
        } else if (this.mode === 'pause') {
            this._frame(ctx, W, H, 'THRESHOLD', 'PAUSADO');
            this._button(ctx, 'vr-resume', '[ CONTINUAR ]', W / 2, 158);
            this._button(ctx, 'vr-comfort', '[ CONFORTO VR ]', W / 2, 228, 560, 58);
            this._button(ctx, 'vr-visual', '[ VISUAL PS1 ]', W / 2, 294, 560, 58);
            this._button(ctx, 'vr-restart', '[ REINICIAR ]', W / 2, 360, 560, 58);
            this._button(ctx, 'vr-menu', '[ VOLTAR AO MENU ]', W / 2, 426, 560, 58);
            ctx.fillStyle = 'rgba(216,194,106,0.8)';
            ctx.font = '22px VT323, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('B / Y = continuar rápido', W / 2, H - 66);
            // Lembrete discreto de pausa (não diagnóstico, sem interromper).
            const mins = Math.floor((d.sessionTimeSec ?? 0) / 60);
            ctx.fillStyle = 'rgba(255,244,214,0.55)';
            ctx.font = '20px VT323, monospace';
            ctx.fillText(`SESSÃO VR: ${mins} MIN · FAÇA UMA PAUSA SE SENTIR DESCONFORTO`, W / 2, H - 40);
        } else if (this.mode === 'comfort') {
            const c = d.comfort ?? {};
            this._frame(ctx, W, H, 'CONFORTO VR', 'APLICADO NA HORA · SEM REINICIAR');
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff4d6';
            ctx.font = '30px VT323, monospace';
            ctx.fillText(`PERFIL: < ${this._profileLabel(c.profileName)} >`, W / 2, 182);
            this._button(ctx, 'vr-profile-prev', '< PERFIL', W / 2 - 200, 200, 220, 56);
            this._button(ctx, 'vr-profile-next', 'PERFIL >', W / 2 + 200, 200, 220, 56);
            this._button(ctx, 'vr-vignette', `VIGNETTE: ${c.vignette ? 'LIGADA' : 'DESLIGADA'}`, W / 2, 272, 560, 56);
            this._button(ctx, 'vr-turn-mode', `GIRO: ${(c.turnMode ?? 'smooth') === 'smooth' ? 'SUAVE' : `SNAP ${c.snapTurnAngle ?? 30}°`}`, W / 2, 336, 560, 56);
            this._button(ctx, 'vr-speed', `VELOCIDADE: ${(c.speedScale ?? 1) < 1 ? 'REDUZIDA' : 'NORMAL'}`, W / 2, 400, 560, 56);
            this._button(ctx, 'vr-effects', `EFEITOS: ${c.effectsScale === 'reduced' ? 'REDUZIDOS' : 'NORMAIS'}`, W / 2, 464, 560, 56);
            this._button(ctx, 'vr-locomotion', `LOCOMOÇÃO: ${(c.locomotionMode ?? 'continuous') === 'blink' ? 'BLINK STEP' : 'CONTÍNUA'}`, W / 2, 528, 560, 56);
            this._button(ctx, 'vr-comfort-back', '[ VOLTAR ]', W / 2, H - 54, 300, 42);
        } else if (this.mode === 'visual') {
            const v = d.visual ?? {};
            this._frame(ctx, W, H, 'VISUAL VR', 'ESTILO APLICADO NA HORA');
            ctx.fillStyle = '#fff4d6';
            ctx.font = '26px VT323, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PS1 usa paleta/curva retro stereo-safe no Quest', W / 2, 190);
            this._button(ctx, 'vr-visual-filter',
                `FILTRO: ${(v.visualFilter ?? 'ps1') === 'ps1' ? 'PS1' : 'LIMPO'}`,
                W / 2, 238, 580, 68);
            this._button(ctx, 'vr-visual-lighting',
                `ILUMINAÇÃO: ${(v.lightingMode ?? 'ps1') === 'ps1' ? 'PS1' : 'CLARA'}`,
                W / 2, 326, 580, 68);
            this._button(ctx, 'vr-visual-back', '[ VOLTAR ]', W / 2, 430, 320, 58);
            this._smallNote(ctx, W, H, 'FILTRO PS1 = mais próximo do visual desktop');
        } else if (this.mode === 'intro') {
            this._frame(ctx, W, H, d.title ?? 'NÍVEL', d.subtitle ?? '');
            ctx.fillStyle = '#fff4d6';
            ctx.font = '26px VT323, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('DESCANSE O QUANTO QUISER', W / 2, 220);
            this._button(ctx, 'vr-intro-continue', '[ CONTINUAR ]', W / 2, 280);
            this._smallNote(ctx, W, H, 'TRIGGER p/ continuar');
        } else if (this.mode === 'gameover') {
            this._frame(ctx, W, H, 'CAPTURADO', 'A ANOMALIA ALCANÇOU VOCÊ');
            ctx.fillStyle = '#fff4d6';
            ctx.font = '28px VT323, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(d.scoreText ?? '', W / 2, 190);
            this._button(ctx, 'vr-retry', '[ TENTAR NOVAMENTE ]', W / 2, 250);
            this._button(ctx, 'vr-menu', '[ MENU ]', W / 2, 344);
        } else if (this.mode === 'end') {
            this._frame(ctx, W, H, 'MISSÃO CONCLUÍDA', 'VOCÊ ACORDA');
            ctx.fillStyle = '#fff4d6';
            ctx.font = '28px VT323, monospace';
            ctx.textAlign = 'center';
            const lines = (d.statsText ?? '').split('\n');
            let y = 190;
            for (const l of lines) { ctx.fillText(l, W / 2, y); y += 36; }
            this._button(ctx, 'vr-again', '[ JOGAR NOVAMENTE ]', W / 2, y + 20);
            this._button(ctx, 'vr-menu', '[ MENU ]', W / 2, y + 114);
        }
    }

    _drawHUD(ctx, W, H) {
        const minimal = !!this.hud.minimal;
        // Painel compacto: fundo só em faixas p/ não bloquear visão.
        ctx.textAlign = 'left';
        // topo: level + score
        ctx.fillStyle = 'rgba(10,8,6,0.55)';
        ctx.fillRect(10, 10, W - 20, 56);
        ctx.strokeStyle = 'rgba(216,194,106,0.7)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, W - 20, 56);
        ctx.fillStyle = '#d8c26a';
        ctx.font = '28px VT323, monospace';
        ctx.fillText(this.hud.level ?? '', 30, 48);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff4d6';
        ctx.fillText(this.hud.score ?? '', W - 30, 48);
        // objetivo (oculto em minimal: sprint/chase)
        if (!minimal) {
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(10,8,6,0.45)';
            const objLines = (this.hud.objective ?? '').split('\n').slice(0, 3);
            const objH = 36 + objLines.length * 28;
            ctx.fillRect(10, 76, 560, objH);
            ctx.fillStyle = '#d8c26a';
            ctx.font = '22px VT323, monospace';
            ctx.fillText('OBJETIVO', 30, 102);
            ctx.fillStyle = 'rgba(255,244,214,0.92)';
            ctx.font = '24px VT323, monospace';
            let y = 130;
            for (const l of objLines) { ctx.fillText(l.slice(0, 52), 30, y); y += 28; }
        }
        // notificação crítica
        if (this.hud.notification) {
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(10,8,6,0.85)';
            const nl = this.hud.notification.split('\n');
            const nh = nl.length * 34 + 28;
            ctx.fillRect(W / 2 - 330, 200, 660, nh);
            ctx.strokeStyle = '#d8c26a';
            ctx.strokeRect(W / 2 - 330, 200, 660, nh);
            ctx.fillStyle = '#ffe9a8';
            ctx.font = '30px VT323, monospace';
            let ny = 200 + 42;
            for (const l of nl) { ctx.fillText(l.slice(0, 44), W / 2, ny); ny += 34; }
        }
        // prompt de interação (embaixo)
        if (this.hud.prompt) {
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(10,8,6,0.85)';
            ctx.fillRect(W / 2 - 300, H - 130, 600, 64);
            ctx.strokeStyle = '#d8c26a';
            ctx.strokeRect(W / 2 - 300, H - 130, 600, 64);
            ctx.fillStyle = '#ffe9a8';
            ctx.font = '32px VT323, monospace';
            const vrPrompt = String(this.hud.prompt).replace(/^\[E\]\s*/i, '');
            ctx.fillText(`[GATILHO] ${vrPrompt}`.slice(0, 44), W / 2, H - 88);
        }
        // debug conforto (flag CONFIG.xr.debugComfort) + debug input legado
        const dbgLines = [];
        if (CONFIG.xr?.debugComfort && this.hud.debugComfort) {
            dbgLines.push(...this.hud.debugComfort.split('\n'));
        }
        if (CONFIG.xr?.debugInput && this.hud.debug) {
            dbgLines.push(...this.hud.debug.split('\n'));
        }
        if (dbgLines.length > 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(120,255,170,0.9)';
            ctx.font = '20px monospace';
            let dy = H - dbgLines.length * 22 - 12;
            for (const l of dbgLines) { ctx.fillText(l.slice(0, 70), 20, dy); dy += 22; }
        }
    }

    dispose() {
        if (this.group.parent) this.group.parent.remove(this.group);
        this.mesh.geometry.dispose();
        this.material.dispose();
        this.texture.dispose();
    }
}
