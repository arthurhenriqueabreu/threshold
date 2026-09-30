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

O jogo usa o botão *ENTER VR* do Three.js como entrada única da sessão. Para
testar no desktop:

1. Execute `npm run dev` e abra o endereço local no Chrome ou Edge.
2. Clique em `ENTER VR` no menu ou durante uma partida.
3. No desktop, use uma extensão de emulação WebXR compatível com controladores Quest.

Para testar em um Meta Quest, o headset não pode usar o `localhost` do PC:

1. Sirva o projeto em uma interface acessível pela rede, por exemplo
   `npm run dev -- --host 0.0.0.0`.
2. Abra no Quest o IP do computador na mesma rede, e não `localhost`.
3. Use HTTPS (certificado local confiável ou um túnel HTTPS); WebXR imersivo
   não deve ser testado via HTTP usando apenas o IP da rede.

Controles VR: stick esquerdo move/strafa, stick direito faz snap-turn, um grip
anda para frente, os dois grips fazem sprint gradual, gatilho interage, `X`
alterna a lanterna, `A` abre/fecha o celular e `B/Y` pausa ou retoma.
No room-scale, a colisão considera também o deslocamento físico do headset;
a lanterna usa a pose real do controle direito.

## VR Comfort

Opções de conforto para a sessão WebXR (menu VR → **[ CONFORTO VR ]**,
também acessível no pause). Aplicadas na hora, sem reiniciar. O conforto
varia entre indivíduos — estes são pontos iniciais de playtest, sem
garantia de zero desconforto.

- **Perfis**: CONFORTO (1.7/2.7 m/s, vignette forte, efeitos reduzidos) ·
  PADRÃO (default, 2.2/3.4 m/s) · INTENSO (2.6/4.0 m/s, sem vignette).
  Salvo em `localStorage` (`threshold_vrComfortProfile`).
- **Locomoção**: contínua com aceleração/desaceleração progressiva
  (magnitude analógica do stick/grip preservada, sprint gradual) ou
  **BLINK STEP** opcional (salto de ~1m por aperto de grip, com cooldown
  e collision — nunca atravessa paredes).
- **Snap turn** 30° (default) ou 45°; sem smooth turn por padrão.
- **Vignette de conforto**: escurece só a periferia conforme a velocidade
  real, com transição suave; bônus pequeno durante chase.
- **Efeitos XR reduzidos**: proximidade vira vignette + grain lento
  (sem glitch bars contínuas, scanlines rápidas ou flashes); static forte
  só na captura (~0.6s → fade). Flicker vira falha de fluorescente suave
  com escala por perfil. Affine mapping e vertex snapping desligados no XR.
- **Render PS1 XR-safe**: nearest filtering, flat shading, fog e uma paleta de
  cor quantizada de forma suave e igual nos dois olhos;
  vertex snapping/UV afim, postprocess mono e dither de tela ficam desligados
  no headset; head tracking sempre 1:1 (terror vai para mundo/áudio/luz,
  nunca para a câmera).
  No desktop, o vertex snapping também fica desligado porque o shader de
  posição podia colapsar o render target em alguns caminhos WebGL; o look
  continua vindo de low-res, nearest, flat shading, affine UV e quantização.
- **Performance = conforto**: monitor de frame time com qualidade
  adaptativa só de cosméticos (partículas do portal, efeitos, HUD).
- **Pausas naturais**: portais mostram o próximo nível e aguardam seu
  input; o pause exibe o tempo de sessão e sugere pausa se houver desconforto.

Testes lógicos: `npm run test:movement`, `npm run test:comfort`,
`npm run test:xr`. Roteiro de playtest com Quest 3 em
`docs/VR-COMFORT-PLAYTEST.md` (avaliação externa pode usar SSQ/VRSQ).

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
