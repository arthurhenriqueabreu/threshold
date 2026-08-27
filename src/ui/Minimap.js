export class Minimap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.level = null;
        this.gameState = null;
        this.cols = 0;
        this.rows = 0;
        this.cellPx = 8;
        this.padding = 6;
        this.visible = false;

        // cores do minimapa
        this.colors = {
            bg: '#0d0c08',
            wall: '#3a3528',
            floor: '#6e6238',
            floorAlt: '#7a6e40',
            grid: 'rgba(0,0,0,0.15)',
            fuse: '#ffcc44',
            keycard: '#44aaff',
            panel: '#ff8844',
            doorClosed: '#8a7a3a',
            doorOpen: '#5a7a3a',
            portal: '#aa66ff',
            player: '#e8e2ce',
            playerDir: '#d8c26a'
        };
    }

    setLevel(level, gameState) {
        this.level = level;
        this.gameState = gameState;
        if (!level) return;
        this.cols = level.cols;
        this.rows = level.rows;
        this.resize();
    }

    resize() {
        if (!this.canvas || !this.level) return;
        // canvas já tem tamanho fixo no HTML, calculamos cellPx para preencher
        const availW = this.canvas.width - this.padding * 2;
        const availH = this.canvas.height - this.padding * 2;
        this.cellPx = Math.min(availW / this.cols, availH / this.rows);
        // centralização
        this.offsetX = (this.canvas.width - this.cols * this.cellPx) / 2;
        this.offsetY = (this.canvas.height - this.rows * this.cellPx) / 2;
    }

    setVisible(visible) {
        this.visible = visible;
        if (this.canvas && this.canvas.parentElement) {
            if (visible) {
                this.canvas.parentElement.classList.remove('hidden');
            } else {
                this.canvas.parentElement.classList.add('hidden');
            }
        }
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMap() {
        if (!this.level || !this.ctx) return;
        const grid = this.level.grid;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const char = grid[row][col];
                const x = this.offsetX + col * this.cellPx;
                const y = this.offsetY + row * this.cellPx;
                const isWall = char === '#';
                // xadrez sutil no chão para dar profundidade
                if (isWall) {
                    this.ctx.fillStyle = this.colors.wall;
                } else {
                    this.ctx.fillStyle = (col + row) % 2 === 0 ? this.colors.floor : this.colors.floorAlt;
                }
                this.ctx.fillRect(x, y, this.cellPx + 0.5, this.cellPx + 0.5);

                // grade fina
                if (!isWall) {
                    this.ctx.strokeStyle = this.colors.grid;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.strokeRect(x, y, this.cellPx, this.cellPx);
                }

                // destaques de objetivos (só se ainda relevantes)
                if (!isWall) {
                    this.drawObjectiveMarker(char, x, y, col, row);
                }
            }
        }

        // porta: sobrepõe visual de bloqueador
        this.drawDoor();
    }

    drawObjectiveMarker(char, x, y, col, row) {
        if (!this.gameState) return;
        const cx = x + this.cellPx / 2;
        const cy = y + this.cellPx / 2;
        const r = this.cellPx * 0.28;

        // fusível: só mostra se ainda não coletado
        if (char === 'F' && !this.gameState.inventory.fuse) {
            this.ctx.fillStyle = this.colors.fuse;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        } else if (char === 'K' && !this.gameState.inventory.keycard) {
            this.ctx.fillStyle = this.colors.keycard;
            this.ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
            this.ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            this.ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
        } else if (char === 'P') {
            // painel sempre visível, mas pisca quando precisa
            const needsPower = !this.gameState.objectives.power;
            this.ctx.fillStyle = needsPower ? this.colors.panel : '#55cc55';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (char === 'O') {
            // portal
            const unlocked = this.gameState.portalUnlocked;
            this.ctx.fillStyle = unlocked ? this.colors.portal : 'rgba(120,100,140,0.35)';
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
            this.ctx.fill();
            if (unlocked) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
    }

    drawDoor() {
        if (!this.level || !this.level.door) return;
        const door = this.level.door;
        const col = door.cell.x;
        const row = door.cell.z;
        const x = this.offsetX + col * this.cellPx;
        const y = this.offsetY + row * this.cellPx;
        const isOpen = door.isOpen;

        this.ctx.fillStyle = isOpen ? this.colors.doorOpen : this.colors.doorClosed;
        // porta ocupa a célula toda com borda
        this.ctx.fillRect(x, y, this.cellPx, this.cellPx);
        this.ctx.strokeStyle = isOpen ? '#a0c080' : '#d8c26a';
        this.ctx.lineWidth = isOpen ? 1 : 1.5;
        this.ctx.strokeRect(x + 0.5, y + 0.5, this.cellPx - 1, this.cellPx - 1);
        // linha central indicando porta
        if (!isOpen) {
            this.ctx.fillStyle = '#2a2520';
            this.ctx.fillRect(x + this.cellPx * 0.35, y + 1, this.cellPx * 0.3, this.cellPx - 2);
        }
    }

    drawPlayer(playerPos, yaw) {
        if (!this.level || !playerPos || !this.ctx) return;
        const cell = this.level.worldToCell(playerPos.x, playerPos.z);
        // interpolação dentro da célula para movimento suave
        const world = this.level.cellToWorld(cell.x, cell.z);
        // fração dentro da célula
        const fx = (playerPos.x - world.x) / this.level.cellSize;
        const fz = (playerPos.z - world.z) / this.level.cellSize;
        const cx = this.offsetX + (cell.x + 0.5 + fx * 0.5) * this.cellPx;
        const cy = this.offsetY + (cell.z + 0.5 + fz * 0.5) * this.cellPx;
        // clamp dentro do canvas
        const x = Math.max(this.offsetX + this.cellPx * 0.4, Math.min(this.offsetX + this.cols * this.cellPx - this.cellPx * 0.4, cx));
        const y = Math.max(this.offsetY + this.cellPx * 0.4, Math.min(this.offsetY + this.rows * this.cellPx - this.cellPx * 0.4, cy));

        // halo
        this.ctx.fillStyle = 'rgba(232,226,206,0.25)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellPx * 0.55, 0, Math.PI * 2);
        this.ctx.fill();

        // corpo do jogador
        this.ctx.fillStyle = this.colors.player;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.cellPx * 0.32, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // direção (yaw do PlayerController) - mapeia forward do mundo para o minimapa
        if (typeof yaw === 'number') {
            const len = this.cellPx * 0.7;
            const dx = -Math.sin(yaw) * len;
            const dy = -Math.cos(yaw) * len;
            this.ctx.strokeStyle = this.colors.playerDir;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + dx, y + dy);
            this.ctx.stroke();
            // ponta da seta
            this.ctx.fillStyle = this.colors.playerDir;
            this.ctx.beginPath();
            this.ctx.arc(x + dx, y + dy, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    update(playerPos, yaw) {
        if (!this.visible || !this.level) return;
        this.clear();
        this.drawMap();
        this.drawPlayer(playerPos, yaw);
        // borda externa
        this.ctx.strokeStyle = '#8a7c4a';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(this.offsetX - 0.5, this.offsetY - 0.5, this.cols * this.cellPx + 1, this.rows * this.cellPx + 1);
    }

    reset() {
        if (this.ctx) {
            this.clear();
        }
    }
}
