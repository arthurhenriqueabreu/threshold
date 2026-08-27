# Threshold — A Liminal Escape

Jogo 3D web inspirado nas **Backrooms**, desenvolvido com JavaScript e Three.js.
Primeira versão (vertical slice): explore o Level 0, encontre o fusível e o cartão,
restaure a energia e atravesse o portal.

Projeto acadêmico — ADS SENAC Joinville · Profª Claudia Werlich

## Tecnologias

- HTML5
- CSS3
- JavaScript (ES Modules)
- Three.js
- Vite

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

## Build de produção

```bash
npm run build
```

## Preview do build

```bash
npm run preview
```

## Validação do mapa

Script utilitário que verifica conectividade do Level 0 (BFS) e regras de pontuação:

```bash
node scripts/validate-map.mjs
```

## Controles

| Tecla       | Ação            |
| ----------- | --------------- |
| `WASD`      | Mover           |
| Mouse       | Olhar           |
| `Shift`     | Correr          |
| `E`         | Interagir       |
| `Esc`       | Pausar / liberar cursor |

## Como jogar

1. Clique em **INICIAR** e digite seu nome.
2. Explore o ambiente até encontrar o **fusível** (+100).
3. Encontre o **cartão de acesso** (+100).
4. Insira o fusível no painel elétrico e **restaure a energia** (+200).
5. Use o cartão na porta trancada para acessar a sala do portal.
6. Atravesse o **portal** (+100) para concluir a missão.

Pontuação máxima: **500**.

## Estrutura do projeto

```
src/
├── core/          Game, EventBus, GameState, Config
├── world/         LevelManager, Level, Level0, Lighting, Textures, MapData
├── player/        Player, PlayerController, PlayerMovement
├── interactions/  InteractionSystem, Interactable, PickupItem, Door, FuseBox, Portal
├── systems/       ObjectiveManager, ScoreManager, AudioManager,
│                  NotificationSystem, InputManager, GameRepository
└── ui/            UIManager, HUD, MainMenu, EndScreen
```

## Persistência

Resultados são salvos localmente via `localStorage` (`LocalGameRepository`).
A arquitetura já possui a abstração `GameRepository` para futura troca por uma
implementação com API REST (`ApiGameRepository`).

## Preparação para WebXR

A versão atual roda em navegador convencional (teclado/mouse), mas a arquitetura
já separa input abstrato (`InputManager`), estados de jogo e lógica de gameplay,
permitindo habilitar `renderer.xr.enabled` e integrar controllers WebXR /
Meta Quest 3 posteriormente sem reescrita.

## Compatibilidade

Chrome, Edge e Firefox (prioridade Chromium). Futuramente: Meta Quest Browser.
