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
| `Setas`      | Mover           |
| `F`         | Lanterna        |
| `Q`         | Celular         |
| `Esc`       | Pausar / liberar cursor |

### WebXR / Meta Quest

O jogo inclui um botão `ENTER VR` criado pelo Three.js. Para testar no navegador:

1. Execute `npm run dev` e abra o endereço local no Chrome ou Edge.
2. Inicie uma partida no modo desktop.
3. Clique em `ENTER VR` para entrar no headset ou no emulador WebXR.
4. Em um Meta Quest, abra o endereço pelo Meta Quest Browser. Em desktop, use uma extensão de emulação WebXR compatível com controladores Quest.

Controles VR: joystick esquerdo move, joystick direito faz snap-turn, gatilho interage, grip corre, `X` alterna a lanterna e `A` abre/fecha o celular.

## Como jogar

1. Clique em **INICIAR** e digite seu nome.
2. Explore o ambiente até encontrar o **fusível** (+100).
3. Encontre o **cartão de acesso** (+100).
4. Insira o fusível no painel elétrico e **restaure a energia** (+200).
5. Use o cartão na porta trancada para acessar a sala do portal.
6. Atravesse o **portal** (+100) para concluir a missão.

Pontuação: cada travessia de portal vale **100**, a fuga final vale **250**, e itens/objetivos concedem os pontos configurados em `src/core/Config.js`.

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

## WebXR

A versão desktop continua disponível com teclado/mouse e também oferece uma sessão
WebXR imersiva. O renderer usa o headset como câmera, um rig separado para
locomoção, controles Quest e renderização estéreo nativa durante o modo VR.

## Compatibilidade

Chrome, Edge e Meta Quest Browser (prioridade Chromium). O WebXR exige HTTPS em
produção; `localhost` é tratado como contexto seguro durante o desenvolvimento.
