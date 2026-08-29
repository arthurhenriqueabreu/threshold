# Auditoria técnica completa do projeto

**Session ID:** ses_fb552f2ddffeQ9OXm8c6T6KkoA
**Created:** 8/28/2026, 8:20:50 PM
**Updated:** 8/28/2026, 8:28:14 PM

---

## User

Quero que você faça uma AUDITORIA TÉCNICA COMPLETA do estado atual deste projeto.

IMPORTANTE:
- NÃO implemente nada.
- NÃO refatore nada.
- NÃO altere nenhum arquivo.
- NÃO instale dependências.
- NÃO remova dependências.
- NÃO formate arquivos.
- NÃO faça commits.
- NÃO tente converter o projeto para PS1 ainda.
- Seu trabalho neste momento é SOMENTE analisar e documentar o que já existe.

O objetivo desta análise é gerar um relatório que será enviado para outra IA, que depois criará um plano/prompt preciso para transformar a direção visual do jogo em uma estética PlayStation 1 / PSX.

Portanto, seja extremamente concreto.

Não suponha como o projeto funciona.
Leia o código e descreva somente o que realmente está implementado.

==================================================
1. VISÃO GERAL
==================================================

Comece explicando:

- nome atual do projeto;
- objetivo aparente do jogo;
- estado atual de desenvolvimento;
- o que já é jogável;
- o que está incompleto;
- o que aparentemente ainda não foi iniciado.

Diga também:

- linguagem utilizada;
- bundler/framework;
- versão do Three.js;
- versão do Vite;
- demais dependências relevantes;
- scripts disponíveis no package.json.

Inclua o conteúdo relevante do package.json ou resuma-o fielmente.

==================================================
2. ESTRUTURA DO REPOSITÓRIO
==================================================

Mostre a árvore real do projeto.

Exemplo:

src/
├── core/
├── player/
├── world/
...

Não invente pastas.

Pode omitir:
- node_modules;
- dist;
- arquivos gerados;
- caches.

Para cada diretório importante, explique sua responsabilidade.

==================================================
3. ENTRY POINT E FLUXO DE INICIALIZAÇÃO
==================================================

Identifique:

- arquivo de entrada;
- como o jogo é inicializado;
- quem cria o renderer;
- quem cria a scene;
- quem cria a camera;
- como o game loop funciona;
- como delta time é calculado;
- como resize funciona;
- como os sistemas são inicializados.

Descreva o fluxo real.

Exemplo conceitual:

main.js
↓
Game
↓
World
↓
Player
↓
Systems

Mas use apenas o fluxo que realmente existir.

Inclua:
- nomes das classes;
- arquivos;
- métodos principais.

==================================================
4. RENDERIZAÇÃO THREE.JS
==================================================

Esta seção é MUITO IMPORTANTE.

Analise detalhadamente como o renderer está configurado atualmente.

Informe, quando existirem:

- WebGLRenderer options;
- antialias;
- alpha;
- pixel ratio;
- outputColorSpace;
- toneMapping;
- exposure;
- shadowMap;
- shadowMap type;
- clear color;
- clipping;
- logarithmicDepthBuffer;
- sortObjects;
- physicallyCorrectLights ou equivalente;
- qualquer configuração relevante.

Mostre o arquivo e, se útil, o trecho de código responsável.

Também diga se existe:

- EffectComposer;
- post-processing;
- render passes;
- custom framebuffer;
- WebGLRenderTarget;
- shaders globais;
- ShaderMaterial;
- RawShaderMaterial;
- onBeforeCompile;
- ShaderChunk customizado.

Se não existir, diga explicitamente.

==================================================
5. CAMERA
==================================================

Documente:

- tipo da câmera;
- FOV;
- near;
- far;
- posição inicial;
- orientação;
- como a câmera está ligada ao jogador;
- mouse look;
- pointer lock;
- movimentação.

Diga se qualquer transformação visual atualmente é aplicada à câmera.

==================================================
6. PLAYER
==================================================

Analise toda a implementação do jogador.

Documente:

- Player;
- PlayerController;
- PlayerMovement;
- InputManager ou equivalente;
- WASD;
- sprint;
- colisão;
- gravidade;
- câmera;
- altura;
- velocidade;
- radius/capsule;
- respawn;
- spawn points.

Mostre as relações entre as classes.

==================================================
7. COLISÕES
==================================================

Explique exatamente como as colisões funcionam.

Identifique:

- classe responsável;
- representação do collision world;
- bounding boxes;
- grids;
- raycasting;
- spatial partition;
- geometria;
- raio do jogador;
- colisões por eixo;
- sliding;
- portas dinâmicas;
- triggers.

Indique limitações visíveis no código.

==================================================
8. WORLD / LEVEL
==================================================

Documente como o ambiente atual é criado.

Diga:

- se o mapa é construído por código;
- se utiliza GLTF/GLB;
- se existe LevelManager;
- se existem múltiplos níveis;
- como paredes são criadas;
- como chão é criado;
- como teto é criado;
- como corredores/salas são definidos;
- escala utilizada;
- quantidade aproximada de objetos.

Identifique os arquivos responsáveis.

==================================================
9. GEOMETRIA
==================================================

Esta seção também será importante para o visual PS1.

Analise:

- BoxGeometry;
- PlaneGeometry;
- BufferGeometry;
- GLTF;
- modelos externos;
- geometria procedural;
- instancing;
- geometria compartilhada;
- número de meshes, quando fácil de determinar.

Informe se a geometria atual já é relativamente low-poly ou não.

NÃO faça alterações.

Apenas avalie a implementação atual.

==================================================
10. MATERIAIS
==================================================

Faça um inventário dos materiais utilizados.

Procure por:

- MeshBasicMaterial;
- MeshLambertMaterial;
- MeshPhongMaterial;
- MeshStandardMaterial;
- MeshPhysicalMaterial;
- ShaderMaterial;
- SpriteMaterial;
- LineMaterial;
- outros.

Explique onde cada tipo está sendo utilizado.

Informe particularmente se o jogo depende fortemente de PBR.

Liste propriedades relevantes:

- roughness;
- metalness;
- emissive;
- transparent;
- opacity;
- side;
- depthWrite;
- depthTest.

==================================================
11. TEXTURAS
==================================================

Faça um levantamento das texturas existentes.

Para cada textura relevante, diga:

- caminho;
- finalidade;
- resolução, se puder determinar facilmente;
- wrapS/wrapT;
- repeat;
- magFilter;
- minFilter;
- anisotropy;
- colorSpace;
- mipmaps.

Se TextureLoader ou outro loader estiver sendo usado, explique onde.

IMPORTANTE:
identifique especificamente se atualmente há uso de:

THREE.LinearFilter
THREE.LinearMipmapLinearFilter
THREE.NearestFilter

ou equivalentes.

==================================================
12. ILUMINAÇÃO
==================================================

Faça um inventário das luzes.

Procure por:

- AmbientLight;
- HemisphereLight;
- DirectionalLight;
- PointLight;
- SpotLight;
- RectAreaLight;
- emissive materials.

Documente:

- quantidade aproximada;
- intensidade;
- cores;
- sombras;
- distância;
- decay;
- performance potencial.

Explique como as lâmpadas fluorescentes das Backrooms estão sendo simuladas atualmente.

==================================================
13. SOMBRAS
==================================================

Explique:

- se renderer.shadowMap está ativo;
- quais luzes castam sombras;
- quais objetos castShadow;
- quais recebem receiveShadow;
- shadow map size;
- tipo de sombra.

Se não houver sombras, deixe claro.

==================================================
14. FOG / ATMOSFERA
==================================================

Documente qualquer uso de:

- THREE.Fog;
- THREE.FogExp2;
- partículas;
- ruído;
- flicker;
- pós-processamento;
- screen effects;
- overlay;
- CSS filters;
- vinheta;
- grain.

Explique como a atmosfera atual das Backrooms é produzida.

==================================================
15. INTERAÇÕES
==================================================

Documente o sistema de interação atual.

Inclua:

- raycaster;
- tecla E;
- distância;
- seleção;
- prompts;
- Interactable;
- PickupItem;
- Door;
- Switch;
- FuseBox;
- Keycard;
- Portal;
- qualquer outra interação.

Mostre o fluxo:

input
→ detecção
→ validação
→ ação
→ feedback

conforme estiver realmente implementado.

==================================================
16. GAME STATE
==================================================

Analise:

- GameState;
- ObjectiveManager;
- ScoreManager;
- EventBus;
- Inventory;
- estado da partida.

Liste os estados realmente existentes.

Exemplo:

hasFuse
hasKeycard
powerRestored
portalUnlocked

Mas não invente nomes.

Use os nomes reais do código.

==================================================
17. OBJETIVOS / PUZZLES
==================================================

Explique tudo que já existe de gameplay.

Liste:

- objetivos;
- puzzle;
- fusível;
- cartão;
- painel;
- portas;
- energia;
- pontuação;
- condições de conclusão.

Diga o que realmente funciona hoje.

==================================================
18. PORTAL
==================================================

Esta seção é MUITO IMPORTANTE.

Analise detalhadamente o portal atual.

Informe:

- arquivo;
- classe;
- geometria;
- material;
- shader;
- animação;
- trigger;
- estado locked/unlocked;
- teleport;
- troca de nível;
- efeitos;
- luzes;
- partículas;
- sons.

Diga explicitamente se existe ou não:

- ShaderMaterial;
- WebGLRenderTarget;
- câmera secundária;
- renderização da outra cena pelo portal;
- stencil buffer;
- clipping planes.

Explique o portal atual tecnicamente.

==================================================
19. UI / HUD
==================================================

Documente:

- menu;
- HUD;
- crosshair;
- objetivos;
- pontuação;
- notificações;
- prompts;
- tela final;
- pause;
- loading.

Explique se é:

- HTML/CSS;
- Three.js;
- Canvas;
- combinação.

Liste os arquivos CSS relevantes.

==================================================
20. ÁUDIO
==================================================

Documente:

- sistema de áudio;
- arquivos existentes;
- ambient hum;
- passos;
- interação;
- portal;
- música;
- AudioListener;
- THREE.Audio;
- HTMLAudioElement.

Informe o que está realmente implementado.

==================================================
21. ASSETS
==================================================

Faça uma lista dos assets presentes em:

public/
assets/
models/
textures/
audio/

ou outros diretórios.

Separe em:

TEXTURAS
MODELOS
ÁUDIOS
FONTES
OUTROS

Não precisa despejar arquivos irrelevantes.

==================================================
22. WEBXR
==================================================

Verifique o estado atual do suporte VR.

Procure por:

- renderer.xr.enabled;
- VRButton;
- WebXRManager;
- controllers;
- XRControllerModelFactory;
- teleport;
- grab;
- hand tracking;
- immersive-vr;
- navigator.xr.

Classifique:

NÃO IMPLEMENTADO
PARCIAL
FUNCIONAL

Explique.

==================================================
23. PERFORMANCE
==================================================

Faça uma análise baseada no código atual.

Procure possíveis custos como:

- muitas draw calls;
- muitas PointLights;
- sombras;
- meshes duplicados;
- materiais duplicados;
- texturas grandes;
- pixel ratio alto;
- loops desnecessários;
- raycasts excessivos;
- allocations dentro de update();
- Vector3 criados a cada frame;
- shaders caros.

NÃO otimize.

Apenas documente.

==================================================
24. CONFIGURAÇÕES CENTRALIZADAS
==================================================

Procure por Config.js ou equivalente.

Liste as configurações existentes:

- player;
- graphics;
- level;
- interaction;
- scoring;
- lighting;
- portal;
- debug.

Mostre valores importantes.

==================================================
25. SISTEMAS DE DEBUG
==================================================

Informe se existem:

- console logs;
- debug renderer;
- wireframe;
- bounding boxes;
- helpers;
- Stats.js;
- dat.GUI;
- lil-gui.

==================================================
26. TESTES / BUILD
==================================================

Sem modificar o projeto:

execute, se for seguro:

npm run build

e, caso exista:

npm test

ou scripts equivalentes.

Informe:

- se build passa;
- warnings;
- erros;
- testes existentes.

NÃO corrija nada.

Se executar o servidor de desenvolvimento não for apropriado, não precisa deixá-lo rodando.

==================================================
27. PROBLEMAS / BUGS VISÍVEIS
==================================================

Liste bugs ou problemas que você consegue identificar diretamente pelo código ou build.

Classifique:

CRÍTICO
ALTO
MÉDIO
BAIXO

Mas não os corrija.

==================================================
28. DÍVIDA TÉCNICA
==================================================

Liste pontos importantes, como:

- acoplamento;
- duplicação;
- arquivos grandes;
- responsabilidades misturadas;
- código morto;
- globals;
- arquitetura inconsistente.

Novamente:

NÃO refatore.

==================================================
29. AUDITORIA ESPECÍFICA PARA ESTILO PS1
==================================================

Agora analise o projeto SOMENTE com o objetivo de responder:

“Quão difícil será transformar o renderer atual em uma estética PlayStation 1?”

NÃO faça a transformação.

Avalie os seguintes pontos:

A) Low-poly

A geometria atual é adequada?

B) Low-resolution textures

As texturas atuais poderiam ser substituídas facilmente por:
64x64
128x128
256x256?

C) Nearest filtering

Existe algum sistema centralizado onde isso poderia futuramente ser aplicado?

D) Pixelated rendering

Onde seria mais seguro futuramente implementar renderização em resolução interna reduzida?

E) Vertex snapping / vertex jitter

Como os materiais atuais poderiam ser afetados?

Existe um local central onde shaders poderiam ser modificados?

F) Affine texture mapping / texture warping

Quais materiais e shaders teriam que ser adaptados?

G) Dithering

Existe post-processing atualmente?

Caso não exista, como a arquitetura atual se relacionaria com a futura implementação?

NÃO implemente.

H) Color quantization

Existe tone mapping / color management que precisaria ser levado em conta?

I) Fog

O fog atual ajudaria ou atrapalharia a estética PS1?

J) Lighting

O sistema atual é muito moderno/PBR?

K) Shadows

As sombras atuais combinam ou seriam incompatíveis com direção PS1?

L) VR

Identifique quais efeitos PS1 potencialmente poderiam ser desconfortáveis em VR:

- vertex jitter;
- baixa resolução;
- camera jitter;
- dithering;
- texture warping.

Não proponha implementação detalhada ainda.
Apenas identifique impacto.

==================================================
30. ARQUIVOS QUE SERIAM IMPACTADOS POR UMA FUTURA CONVERSÃO PS1
==================================================

Crie uma lista específica:

CRÍTICOS

Arquivos que provavelmente precisarão ser modificados.

Exemplo:

src/core/Game.js
src/world/Lighting.js

SECUNDÁRIOS

Arquivos possivelmente afetados.

ASSETS

Texturas/modelos que precisariam ser substituídos ou adaptados.

Use os arquivos REAIS do projeto.

==================================================
31. MAPA DE DEPENDÊNCIAS
==================================================

Monte um mapa simplificado das principais dependências.

Exemplo:

Game
├── Renderer
├── World
│   ├── Level0
│   └── Lighting
├── Player
│   └── PlayerMovement
├── InteractionSystem
└── UI

Use somente relações reais.

==================================================
32. RESUMO DO ESTADO ATUAL
==================================================

Finalize com uma tabela:

| Sistema | Estado | Arquivos principais | Observações |
|---|---|---|---|
| Renderer | ... | ... | ... |
| Player | ... | ... | ... |
| Collision | ... | ... | ... |
| Level | ... | ... | ... |
| Lighting | ... | ... | ... |
| Materials | ... | ... | ... |
| Textures | ... | ... | ... |
| Portal | ... | ... | ... |
| UI | ... | ... | ... |
| Audio | ... | ... | ... |
| WebXR | ... | ... | ... |

Classifique os estados como:

FUNCIONAL
PARCIAL
PLACEHOLDER
NÃO IMPLEMENTADO
COM PROBLEMAS

==================================================
33. FORMATO DO RELATÓRIO
==================================================

O relatório deve ser autossuficiente.

Outra IA que NÃO possui acesso ao repositório deverá conseguir entender como o projeto funciona somente lendo o relatório.

Sempre que mencionar uma implementação importante, cite:

ARQUIVO:
src/...

CLASSE/FUNÇÃO:
...

Se possível, cite também linhas aproximadas.

Não precisa copiar arquivos inteiros.

Inclua pequenos snippets somente quando eles forem importantes para entender a arquitetura.

Não esconda problemas.

Não fale sobre como “você faria”.

Primeiro documente COMO ESTÁ.

==================================================
34. REGRA FINAL
==================================================

Quando terminar a auditoria:

NÃO IMPLEMENTE NADA.

NÃO PERGUNTE SE DEVE COMEÇAR A IMPLEMENTAÇÃO.

Apenas entregue o relatório completo.

No final escreva literalmente:

=== FIM DO RELATÓRIO TÉCNICO === 

---

## Assistant

Vou realizar a auditoria técnica completa do projeto. Vou começar explorando a estrutura do repositório.



**Tool: bash**

**Tool: read**

---

## Assistant

Vou explorar a estrutura completa do projeto em src, public, scripts e ler o README.



**Tool: bash**

**Tool: read**

**Tool: read**

---

## Assistant

I have a good overview now. Let me read the core files and main.js.



**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

Now let me read the core files: EventBus, GameState, and the player files.



**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

Now let me read the systems files: InputManager, AudioManager, NotificationSystem, ObjectiveManager, ScoreManager, GameRepository.





**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

Now let me read the world files: Level, Level0, LevelManager, Lighting, MapData, Textures.





**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

Now let me read MapData.js and Textures.js, then the interactions files.



**Tool: read**

**Tool: read**

---

## Assistant

Now let me read the interactions files: Interactable, InteractionSystem, Door, FuseBox, PickupItem, Portal.





**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

Now let me read the UI files, and the scripts and CSS.



**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

Let me read the CSS file and the scripts, and check the public directory and gitignore.



**Tool: read**

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

I have a very comprehensive picture now. Let me check the public dir contents, verify three.js version installed, and run the build and tests.



**Tool: bash**

**Tool: bash**

---

## Assistant

The grep returned no results for postprocessing/filtering. Let me verify by doing a broader grep for these concepts and check WebXR/VR usage and any ColorManagement/toneMapping references.



**Tool: bash**

**Tool: bash**

---

## Assistant

Now I have confirmed: no WebXR, no toneMapping/outputColorSpace settings, no shadows, no post-processing, no filters. Let me run the build and the validation script to complete section 26.



**Tool: bash**

---

## Assistant

Build passes with a chunk-size warning. Let me run the validation script and check for a test script (there's none in package.json).



**Tool: bash**

---

## Assistant

Node isn't in PATH from this shell context, but npm worked. Let me find node.



**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

It's `node.exe` (Windows). Let me run the scripts using node.exe.



**Tool: bash**

---

## Assistant

I now have all the information needed. Let me look at the git log for context on development state, and verify a couple of details about the renderer configuration (sortObjects, clipping).



**Tool: bash**

---

## Assistant

I now have everything I need to write the complete technical audit report. Let me compile it based strictly on what I've read in the code.

I've read all source files and verified the actual implementation. Here is the complete technical audit report.

---

# RELATÓRIO DE AUDITORIA TÉCNICA — Threshold

## 1. VISÃO GERAL

- **Nome do projeto:** `threshold-webxr` (package.json:2)
- **Título em jogo:** "THRESHOLD — A LIMINAL ESCAPE" (index.html:6, Config.js:3)
- **Objetivo aparente:** Jogo de exploração 3D estilo *Backrooms* em primeira pessoa. Jogador deve coletar um fusível e um cartão de acesso, restaurar a energia num painel elétrico e atravessar um portal para concluir a missão. Projeto acadêmico (ADS SENAC Joinville).
- **Estado de desenvolvimento:** Vertical slice / primeira versão jogável. Um único nível completo e funcional (Level 0).
- **Jogável hoje:** Movimentação WASD, mouse look, sprint, coleta de fusível/cartão, painel/fusível, porta com chave, portal final, pontuação, dificuldades, HUD, minimapa (modo fácil), persistência de resultados.
- **Incompleto:** Níveis adicionais (a tela "LEVEL 2 — COMING SOON" existe no HTML mas só é mostrada como intro; LevelManager só conhece `level0`). Eventos ambientais de dificuldade (ex.: `closeDistantDoor`, `moveObjectSlightly` de Level0.js:724-730 são stubs vazios com comentário "Future"). Ameaças/entidades não implementadas (`hasEntities` já existe em Config mas não há entities).
- **Não iniciado:** WebXR/VR (mencionado no README como "preparação"), áudio de entidades/passos do jogador.

**Linguagem:** JavaScript (ES Modules, `"type": "module"`, package.json:5)
**Bundler/Framework:** Vite (só Vite; sem framework de UI, HTML/CSS vanilla)
**Versão Three.js:** `^0.185.1` (instalado: `0.185.1`)
**Versão Vite:** `^8.2.2` (instalado: `8.2.2`)

**Dependências (package.json):**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "validate": "node scripts/validate-map.mjs"
},
"devDependencies": { "vite": "^8.2.2" },
"dependencies": { "three": "^0.185.1" }
```
Não há testes automatizados no package.json (não existe script `test`). Existe um script utilitário não-automatizado `scripts/test-movement.mjs`.

---

## 2. ESTRUTURA DO REPOSITÓRIO

```
threshold/
├── index.html                 # Toda a markup da UI (telas, HUD)
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
├── dist/                      # build (gerado, ignorar)
├── public/
│   ├── audio/.gitkeep         # vazio
│   ├── icons/.gitkeep         # vazio
│   ├── models/.gitkeep        # vazio
│   └── textures/.gitkeep      # vazio
├── scripts/
│   ├── validate-map.mjs       # validação BFS do mapa + pontuação
│   └── test-movement.mjs      # teste manual de movimento/colisão
└── src/
    ├── main.js                # entry point
    ├── core/
    │   ├── Config.js          # valores centralizados
    │   ├── EventBus.js        # pub/sub
    │   ├── Game.js            # classe orquestradora
    │   └── GameState.js       # estado da partida
    ├── interactions/
    │   ├── Interactable.js    # base
    │   ├── InteractionSystem.js
    │   ├── PickupItem.js
    │   ├── Door.js
    │   ├── FuseBox.js
    │   └── Portal.js
    ├── player/
    │   ├── Player.js
    │   ├── PlayerController.js
    │   └── PlayerMovement.js
    ├── styles/
    │   └── main.css
    ├── systems/
    │   ├── InputManager.js
    │   ├── AudioManager.js
    │   ├── NotificationSystem.js
    │   ├── ObjectiveManager.js
    │   ├── ScoreManager.js
    │   └── GameRepository.js
    ├── ui/
    │   ├── UIManager.js
    │   ├── HUD.js
    │   ├── MainMenu.js
    │   ├── EndScreen.js
    │   └── Minimap.js
    └── world/
        ├── Level.js           # classe base
        ├── Level0.js          # implementação do nível
        ├── LevelManager.js
        ├── Lighting.js
        ├── MapData.js
        └── Textures.js
```

**Responsabilidades por diretório:**
- `core/` — orquestração e estado do jogo (Game, GameState, Config, EventBus).
- `world/` — construção do nível, iluminação, texturas e dados do mapa.
- `player/` — jogador: controller (input/look), movement (colisão), integração com câmera.
- `interactions/` — sistema de interação e objetos interativos.
- `systems/` — serviços transversais: input, áudio, objetivos, pontuação, notificações, persistência.
- `ui/` — interface HTML/CSS/Canvas (menus, HUD, minimapa, tela final).
- `scripts/` — utilitários de validação (não fazem parte do runtime).

---

## 3. ENTRY POINT E FLUXO DE INICIALIZAÇÃO

**Arquivo de entrada:** `index.html:150` carrega `/src/main.js` como módulo; `main.js` instancia `Game` e chama `init()`.

```
main.js:3
  new Game(document.getElementById('app'))
  → game.init()
```

**Fluxo em `Game.init()` (Game.js:28-88):**
1. Cria `THREE.WebGLRenderer({ antialias: true })` (Game.js:29).
2. `setPixelRatio(Math.min(devicePixelRatio, CONFIG.graphics.maxPixelRatio))` (Game.js:30).
3. `setSize(window.innerWidth, window.innerHeight)` e `container.appendChild(renderer.domElement)` (Game.js:31-32).
4. Cria `THREE.Scene`; `scene.background = Color(CONFIG.atmosphere.fogColor)`; `scene.fog = FogExp2(...)` (Game.js:34-39).
5. Cria `THREE.PerspectiveCamera(fov, aspect, near, far)` (Game.js:41-46).
6. Cria `THREE.Clock` (Game.js:48).
7. Instancia sistemas: `LevelManager`, `NotificationSystem`, `ObjectiveManager`, `ScoreManager`, `InteractionSystem` (Game.js:50-56).
8. Liga tecla E → `interactionSystem.tryInteract()` (Game.js:58-62).
9. Cria `HUD`, `UIManager`, `EndScreen`, `MainMenu` (Game.js:64-79).
10. Escuta `pointerlockchange` e `resize` (Game.js:81-82).
11. `renderer.setAnimationLoop(this.animate)` (Game.js:85).
12. Esconde a tela de loading após 600 ms (Game.js:87, 90-93).

**Game loop — `Game.animate()` (Game.js:257-282):**
- `delta = Math.min(clock.getDelta(), 0.05)` — clamp de delta em 0.05 s.
- Se `state === 'PLAYING'` (Game.js:261-275): incrementa `elapsedSeconds`, atualiza `player.update(delta, true)`, sincroniza `level.setPlayerPosition`, atualiza `interactionSystem.update()`, chama `level.updateAmbientEvents(delta, time)`, atualiza minimapa.
- Sempre chama `level.update(delta, time)` e `renderer.render(scene, camera)` (Game.js:277-281).

**Resize — `Game.onResize()` (Game.js:284-288):** atualiza `camera.aspect`, `updateProjectionMatrix`, `renderer.setSize`. Sem atualização de pixel ratio no resize.

**Início do jogo — `Game.start(name, difficulty)` (Game.js:104-115):** define dificuldade (`CONFIG.difficulty[difficulty]`), estado `PLAYING`, esconde menu, mostra HUD, `loadLevel()`, `requestPointerLock()`, `audio.startAmbient(...)`.

---

## 4. RENDERIZAÇÃO THREE.JS

**Configuração do renderer — `src/core/Game.js:29-32`:**
```js
this.renderer = new THREE.WebGLRenderer({ antialias: true });
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.graphics.maxPixelRatio));
this.renderer.setSize(window.innerWidth, window.innerHeight);
this.container.appendChild(this.renderer.domElement);
```

- **WebGLRenderer options:** apenas `{ antialias: true }`.
- **antialias:** `true`.
- **alpha:** não definido (default `false`).
- **pixel ratio:** `Math.min(devicePixelRatio, 2)` (Config maxPixelRatio=2).
- **outputColorSpace:** não definido explicitamente → default Three.js (SRGB output, r185).
- **toneMapping:** NÃO definido → default `NoToneMapping`. Nenhum `THREE.toneMapping`, `ACESFilmicToneMapping`, `exposure` no projeto (grep confirmou 0 ocorrências).
- **shadowMap:** NÃO habilita `renderer.shadowMap` (grep confirmou 0 ocorrências de shadowMap/castShadow/receiveShadow).
- **clear color:** não definido explicitamente; `scene.background` é setado (Game.js:35) para `CONFIG.atmosphere.fogColor` (0x2d281a).
- **clipping:** NÃO (0 ocorrências).
- **logarithmicDepthBuffer:** NÃO.
- **sortObjects:** NÃO sobrescrito (default true).
- **physicallyCorrectLights / useLegacyLights:** NÃO definido. Em r185, o modo físico é o padrão (PointLight usa decay 2 por padrão; aqui decay é 1.5 explícito em Lighting.js:84 e Portal.js:113).
- **Game loop:** usa `setAnimationLoop` (Game.js:85) em vez de `requestAnimationFrame` manual.

**Post-processing / passes / targets / shaders:**
- **EffectComposer:** NÃO existe.
- **post-processing:** NÃO existe.
- **render passes:** NÃO existem.
- **custom framebuffer / WebGLRenderTarget:** NÃO existem.
- **shaders globais / ShaderChunk customizado / onBeforeCompile:** NÃO.
- **ShaderMaterial:** EXISTE somente em `src/interactions/Portal.js:79` (portal).
- **RawShaderMaterial:** NÃO.

**Conclusão:** renderização totalmente vanilla Three.js, um único pass direct-to-screen, sem pós-processamento de nenhum tipo.

---

## 5. CAMERA

**Definição — Game.js:41-46 / Config.js:22:**
- **Tipo:** `THREE.PerspectiveCamera`.
- **FOV:** `75` (Config graphics.fov).
- **near:** `0.05`; **far:** `120`.
- **Posição/orientação inicial:** definida pelo spawn do nível; a câmera é posicionada pelo player a cada frame.

**Ligação com o jogador:** `Player.update()` chama `controller.applyToCamera(position)` (Player.js:31) que faz:
```js
this.camera.position.copy(position);
this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');   // PlayerController.js:35-38
```

**Mouse look — `PlayerController.js:9-20`:** escuta `mousemove` no `document`; só aplica se `document.pointerLockElement !== null` (pointer lock). Ajusta `yaw -= movementX * sensitivity`, `pitch -= movementY * sensitivity`, clamp de pitch em `±(PI/2 - 0.05)`.

**Pointer lock:** `Game.requestPointerLock()` usa `renderer.domElement.requestPointerLock()` (Game.js:162-167). Quando o lock é liberado (Esc), `onPointerLockChange` pausa o jogo (Game.js:169-173).

**Movimentação:** vinda de `Player` — forward/right derivados do `yaw` (Player.js:24-28).

**Transformações visuais à câmera:** NENHUMA. Não há FOV dinâmico, head-bob, shake, cambio de câmera, zoom, nem efeito pós na câmera. A câmera é totalmente "limpa".

---

## 6. PLAYER

Três classes em `src/player/`:

**`Player.js`** — orquestra `PlayerController` (input/look) e `PlayerMovement` (física/collsão). Mantém `Vector3` reutilizados (`moveVector`, `forward`, `right`) — sem alocação massiva por frame.
- `spawnAt(x, z)` → `movement.setPosition` + `controller.reset` (Player.js:16-19).
- `update(delta, allowMovement)` → monta vetor de movimento a partir de input e yaw, chama `movement.update`, depois `controller.applyToCamera` (Player.js:21-32).
- `getPosition()` → `movement.position` (Player.js:34-36).

**`PlayerController.js`** — `yaw`/`pitch`, mouse look (acima), `getMoveInput()` (W/S/A/D → z/x), `isSprinting()` (Shift), `applyToCamera`, `reset()`.

**`PlayerMovement.js`** — a física e colisão:
- `update(delta, moveInput, sprinting)` (PlayerMovement.js:11-20): calcula `displacement = normalize(input) * speed * delta`; executa `tryMoveAxis` separadamente para X e Z (movimento por eixo com sliding).
- `tryMoveAxis(dx, dz)` (PlayerMovement.js:22-29): testa `collides(newX,newZ)`; se não colide, move.
- `collides(x, z)` (PlayerMovement.js:31-39): verifica 4 pontos ao redor do centro usando o raio (`x±radius, z±radius`) — ou seja, o jogador é representado por um **quadrado/box** de 2×radius, não círculo/capsule. Testa `collisionWorld.isSolidAt`.
- `setPosition(x, z)` fixa `y = CONFIG.player.height` (1.7) (PlayerMovement.js:41-43).

**Parâmetros (Config.js):** speed 3.5, sprintSpeed 6, height 1.7, radius 0.35, mouseSensitivity 0.0022, interactionDistance 2.5.

**Sem:**
- **Gravidade:** NÃO há. Não existe força de queda, salto, ou física vertical além do `y` fixo. O jogo é efetivamente num "plano" com colisão só em X/Z.
- **Colisão com chão/teto:** N/A (percorre-se em altura fixa).
- **Respawn/spawn points:** `spawnPoint` é definido pelo nível no caractere `'S'` do mapa (Level0.js:57-61) e o jogador é reposicionado via `spawnAt`. Há reinício completo (`restart`) mas não respawn de morte.

**Relações:**
```
Player
├── PlayerController (input + câmera/yaw-pitch)
└── PlayerMovement (posição + colisão, usa collisionWorld = Level)
```

---

## 7. COLISÕES

**Classe responsável:** a colisão é implementada no `Level` (`src/world/Level.js`) como *grid 2D baseado em caracteres*, consumida por `PlayerMovement`.

**Representação do collision world:** `Level.grid` = array 2D de strings do `MapData.js` (`'#'` = parede sólida). `row = z`, `col = x`.

**API:**
- `worldToCell(x, z)` — converte posição de mundo para célula deslocando pelo centro do nível e dividindo por `cellSize` (Level.js:28-35).
- `cellToWorld(col, row)` — inverso; célula + 0.5 × cellSize − offset (Level.js:19-26).
- `isSolidCell(cx, cz)` (Level.js:37-45): retorna true se fora dos limites, se `grid[cz][cx] === '#'`, **ou** se algum `blocker` (porta) bloqueia: `blockers.some(b => b.isBlockingCell(cx, cz))`.
- `isSolidAt(x, z)` (Level.js:47-50): `worldToCell` → `isSolidCell`.

**Player collision (PlayerMovement.collides, PlayerMovement.js:31-39):** testa 4 cantos do quadrado do jogador (raio 0.35). Colisão por colisão de *cell occupancy*, **não** por AABB precisa nem por geometria — o jogador colide se qualquer canto tocar uma célula sólida.

**Sliding:** natural, pois `tryMoveAxis` testa X e Z separadamente (PlayerMovement.js:18-19): se X está bloqueado, Z ainda resolve.

**Geometria colidível:** as boxes visuais das paredes (InstancedMesh) são decorativas; a colisão real vem só do grid. Isso pode causar pequenas discrepâncias visuais/colisionais na borda das células.

**Portas dinâmicas (`Door`):** registrada como `blocker` (Level0.js:633). `Door.isBlockingCell(cx,cz)` retorna `!isOpen && cell===(cx,cz)` (Door.js:95-97) — então quando aberta, cessa o bloqueio do grid. **Porta dojá não fica "aberta" no world collision; a porta abre rotacionando visualmente.**

**Raycasting:** NÃO é usado para colisão de movimento. Apenas para interação (ver seção 15).

**Spatial partition:** NÃO existe; `isSolidCell` faz `Array.some` sobre `blockers` (poucos). Grid direto por índice.

**Triggers:** NÃO há sistema de colliders de trigger genérico. O "trigger" do portal é baseado em distância no `update` (Portal.js:210-213).

**Limitações visíveis:**
1. Colisão por célula inteira pode deixar o jogador "passar" parcialmente ou ficar com folgas em relação à geometria visual das paredes.
2. `blockers.some` percorre toda lista a cada `isSolidCell` (custo baixo, só porta).
3. Sem colisão vertical (sem rampas/escadas/queda).
4. Sem colisão com props (pilares/caixas visíveis não são sólidos — por exemplo, caixas em Level0 são puramente decorativas e atravessáveis).

---

## 8. WORLD / LEVEL

**Construção 100% por código** (procedural Three.js geometry + InstancedMesh). **Nenhum** GLTF/GLB/modelo externo (pastas `public/models` vazias).

**`Level` (src/world/Level.js)** — classe base: `group`, `interactables[]`, `grid`, `cols/rows`, `cellSize`, `spawnPoint`, `blockers[]`, `updatables[]`. Responsável por conversão cell↔world, colisão, `update` (itera updatables), `dispose` (libera geometrias/materiais).

**`LevelManager` (src/world/LevelManager.js)** — `load(name, options)` faz `switch` só em `'level0'` → `new Level0(...)`; `unload()` chama `dispose`. Só existe 1 nível registrado.

**`Level0` (src/world/Level0.js)** — implementação. Construtor (Level0.js:40-65): `buildEnvironment()`, `buildLights()`, `buildProps()`, `buildGameplay()`, acha spawn `'S'`, e se `hasGuide` → `buildGuideMarkers()`.

**Mapa:** `MapData.js`. Matriz ASCII 19 colunas × 15 linhas. Células: `'#'` parede, `'S'` spawn, `'F'` fusível, `'P'` painel, `'K'` cartão, `'D'` porta, `'O'` portal, `'.'` piso.

**Dimensões/escala (Config.js:5-6):** `cellSize = 3.5`, `wallHeight = 3`. Área total ≈ 19×3.5 × 15×3.5 ≈ 66.5 × 52.5 unidades.

**Construção do ambiente (buildEnvironment, Level0.js:77-120):**
- **Chão:** 1 `PlaneGeometry(size×size)` rotacionado, `MeshLambertMaterial` com `createCarpetTexture(cols/2, rows/2)`.
- **Teto:** 1 `PlaneGeometry` rotacionado, `MeshLambertMaterial` com `createCeilingTexture(...)`, em `y = wallHeight` (3).
- **Paredes:** 1 `BoxGeometry(cellSize, wallHeight, cellSize)` + `MeshLambertMaterial` com `createWallTexture(1,1)`, em 1 `InstancedMesh` com todas as células `'#'` (walls instanced): Level0.js:103-117.
- **Fixtures (luminárias):** 2 `InstancedMesh` de `BoxGeometry(1.4, 0.06, 0.5)` (aplicadas on/off, MeshStandard emissive) — Level0.js:122-170.

**Props (buildProps, Level0.js:187-192):**
- **Pilares:** `InstancedMesh` de `BoxGeometry(0.45, wallHeight, 0.45)` nos cantos das salas (8 posições) — Level0.js:194-221.
- **Caixas:** `InstancedMesh` de `BoxGeometry(0.7,0.7,0.7)` (4 posições) — decorativas.
- **Detalhes de parede (buildWallDetails, Level0.js:248-315):** tomadas elétricas (InstancedMesh, ~15% das células com 1 lado aberto) e canos verticais (InstancedMesh de cilindros, ~8% das células N/S abertas).
- **Estrutura do portal (buildPortalStructure, Level0.js:317-362):** cabos (6 cilindros), base e lateral de moldura (Box), e instancia `Portal`.

**Corredor/salas:** definidos implicitamente pela matriz ASCII (matriz 2D de células), não por arquivos separados.

**Quantidade aproximada de objetos:** pequena. Conta-se: ~1 chão, 1 teto, 1 walls-instance (100+ instâncias internas mas 1 draw call), 2 fixtures-instances, 1 pillars-instance, 1 crates-instance, ~2 outlet/pipe instances, 6 cabos + 2 frames do portal, 1 portal (shader surface + frame + innerframe + light + particles), 1 fusível (grupo 5 meshes), 1 cartão (3 meshes), 1 painel (grupo ~6 meshes), 1 porta (grupo ~6 meshes), ~1-5 guide markers. Aproximadamente **30-40 meshes/grupos, com draw calls na casa de ~40-60** (por causa de materiais não-combinados).

**Corredores/salas:** definidos implicitamente pela matriz ASCII (matriz 2D de células), não por arquivos separados.

---

## 9. GEOMETRIA

Toda procedural, nenhum modelo externo. Inventário:

- `BoxGeometry` — paredes (instanced), pilares, caixas, fixtures, detalhes, porta (painel/moldura/maçaneta/leitor/fechadura), painel elétrico, moldura do portal, cartão (corpo/chip/faixa), switch.
- `PlaneGeometry` — chão e teto.
- `CylinderGeometry` — canos, cabos, fusível (corpo/tampa/vidro/filamento), tomadas/leds, maçaneta, slot do fusível.
- `SphereGeometry` — glow dos pickups, indicador do painel, sphere do holofote.
- `CircleGeometry` — superfície do portal (64 segmentos).
- `TorusGeometry` — molduras do portal (frame/innerFrame).
- `RingGeometry` — guias no chão (modo fácil).
- `BufferGeometry` — partículas dos pickups (Points) e do portal (Points).

**Instancing:** usada extensivamente nas paredes, fixtures, pilares, caixas, tomadas e canos (`THREE.InstancedMesh`). As fixtures usam **2 instanced meshes com materiais fixos** (on/off) para evitar problema de vertexColors/instanceColor (comentário em Level0.js:125).

**Low-poly?** SIM, já é essencialmente low-poly: geometries primitivas com poucos segmentos (ex.: cilindros 6-16 segmentos, torus 8-64). Porém o portal usa `CircleGeometry` com 64 segmentos e partículas suaves (sizeAttenuation), que não são "PS1-like". O chão/teto são planos gigantes (1 face cada) — bem low-poly.

**Número de meshes:** conforme seção 8, ~30-40 objetos visíveis, compactados em poucas instâncias.

---

## 10. MATERIAIS

Inventário completo de materiais por uso:

**`MeshLambertMaterial`** (iluminação difusa não-brilhante):
- Chão (carpet) e teto (ceiling) — Level0.js:83, 88.
- Paredes (instanced) — Level0.js:108.
- Pilares — Level0.js:196.
- Caixas — Level0.js:225.

**`MeshStandardMaterial`** (PBR):
- Fixtures/luminárias (on/off, emissive forte) — Level0.js:126-139.
- Detalhes de parede (tomadas metalness 0.3; canos metalness 0.6) — Level0.js:249, 289.
- Moldura do portal (metalness 0.6) e inner frame — Portal.js:91, 101.
- Fusível (corpo/caps/glass emissive/transparent) — Level0.js:402-434.
- Cartão (corpo emissive, chip metalness 0.9, faixa) — Level0.js:455-479.
- Painel elétrico (box, cover, indicador emissive, switch, slot) — Level0.js:492-541.
- Porta (painel, moldura, maçaneta metalness 0.8, fechadura, leitor emissive) — Level0.js:569-613.
- Cabo da estrutura do portal (metalness 0.7) — Level0.js:328.

**`MeshBasicMaterial`** (sem luz):
- Filamento do fusível — Level0.js:437.
- Guias de chão (transparent, double side, depthWrite:false) — Level0.js:639.
- Glow (halo) dos pickups — PickupItem.js:19.

**`ShaderMaterial`**:
- Apenas o portal (Portal.js:79) — vertex shader simples + fragment com ruído/fbm.

**`PointsMaterial`**:
- Partículas dos pickups (PickupItem.js:45) e do portal (Portal.js:143) — ambos AdditiveBlending.

**Dependência de PBR:** Média-alta. Os **objetos interativos e detalhes** (fusível, cartão, painel, porta, portal, luminárias) usam `MeshStandardMaterial` com `metalness`/`roughness`/`emissive`. Já o **ambiente estrutural** (paredes, chão, teto, pilares, caixas) usa `MeshLambertMaterial` (não-PBR). Não há `MeshPhysicalMaterial` nem `MeshPhongMaterial` no projeto.

**Propriedades relevantes encontradas:**
- `emissive`/`emissiveIntensity`: luminárias, leds, indicadores, fusível/cartão, portal.
- `transparent: true` + `opacity`: vidro do fusível (0.85), glow dos pickups (0.22), guias (0.35), partículas, portal (shader alpha).
- `side: THREE.DoubleSide`: vidro do fusível, glow, guias; `BackSide` no glow dos pickups.
- `depthWrite: false`: glow, guias, partículas, portal.
- `blending: THREE.AdditiveBlending`: partículas dos pickups e do portal.
- `metalness`: 0.1–0.9 nos objetos PBR.
- `roughness`: 0.1–0.9.

---

## 11. TEXTURAS

**Nenhuma textura carregada de arquivo** (pastas `public/textures` vazias). Todas são **geradas proceduralmente em Canvas 2D** em `src/world/Textures.js`, e criadas via `THREE.CanvasTexture`.

**Três texturas geradas:**
1. **`createWallTexture(repeatX, repeatY)`** (Textures.js:23-43) — 256×256. Fundo `#b3a055`, linhas horizontais a cada 32px `#a89449`, ruído (`addNoise` amount 26). Usada nas paredes (repeat 1,1) e pilares (repeat 1,2).
2. **`createCarpetTexture(repeatX, repeatY)`** (Textures.js:45-59) — 256×256. Fundo `#6e6238` + ruído (amount 40). Usada no chão (repeat cols/2, rows/2).
3. **`createCeilingTexture(repeatX, repeatY)`** (Textures.js:61-83) — 256×256. Fundo `#c9c2a8` + grade de retângulos `#9a937d` + ruído (amount 18). Usada no teto.

**Configuração de cada textura (Textures.js):**
- `wrapS = THREE.RepeatWrapping`, `wrapT = THREE.RepeatWrapping`.
- `repeat.set(repeatX, repeatY)`.
- `colorSpace = THREE.SRGBColorSpace`.
- **magFilter/minFilter/anisotropy/mipmaps:** NÃO configurados explicitamente → defaults Three.js (LinearFilter / LinearMipmapLinearFilter, generateMipmaps true, anisotropy 1).

**Loader:** NÃO há `TextureLoader` em uso (grep por loader confirma; nada precisa carregar arquivo).

**Filters específicos solicitados:**
- `THREE.LinearFilter`: NÃO definido explicitamente (mas é o default).
- `THREE.LinearMipmapLinearFilter`: NÃO definido explicitamente (mas é o default).
- `THREE.NearestFilter`: **NÃO usado em nenhum lugar.**
- Não há nenhuma configuração central de filtros de textura; cada textura é instanciada isoladamente em `Textures.js`.

---

## 12. ILUMINAÇÃO

**`src/world/Lighting.js`** — classe `Lighting` + classe `FlickeringLight`.

**`setup(lightData, flickerIndices, flickerIntensity)` (Lighting.js:77-98):**
- `1 × AmbientLight(0xfff2cc, 0.7)` (Config atmosphere.ambientIntensity).
- `1 × HemisphereLight(0xfff4d6, 0x4a4228, 0.5)`.
- Para cada célula de luz em `POINT_LIGHT_CELLS` (8 células): `PointLight(0xffe9b0, 1.6, 18, 1.5)` posicionado em `y = wallHeight - 0.4` (2.6). `decay = 1.5`, `distance = 18` (Lighting.js:84-87).

**`POINT_LIGHT_CELLS` (MapData.js:19-22):** 8 point lights em: [2,1], [13,1], [8,4], [14,4], [5,7], [9,9], [12,11], [16,13].

**`FLICKER_INDICES` (MapData.js:24):** `[2, 6]` — 2 das 8 luzes piscam aleatoriamente (índices 2 e 6).

**`FlickeringLight` (Lighting.js:4-67):** timer aleatório (6–20 s / intensityMult), durante o flicker muda `light.intensity` aleatoriamente (base × (0.05–0.95)). Tem método `triggerFlicker(duration)` para flicker forçado, usado por eventos ambientais no modo difícil.

**`setPowerRestored(boost)` (Lighting.js:108-115):** multiplica intensidade de todas as point lights (limitado a 2.5) e `baseIntensity` dos flickering — usado quando energia é restaurada (boost 1.35, Game.js:145).

**Simulação das "lâmpadas fluorescentes" das Backrooms:** não há lâmpadas físicas + lights por lâmpada. Em vez disso:
- As estruturas visuais (fixtures/luminárias) são `InstancedMesh` com `MeshStandardMaterial` **emissive** (Level0.js:126-139) — brilham por emissão própria, não por luz real.
- A iluminação efetiva vem das **8 PointLights** (uma por "corredor/zona") + Ambient + Hemisphere.
- O **flicker** é feito alterando `intensity` das PointLights (Lighting.js), não via material das luminárias.

**Quantidade de luzes:** 1 Ambient + 1 Hemisphere + 8 PointLight = 10 luzes. Em Three.js r185 com forward rendering, 8 PointLights + sombras desligadas é razoável; porém, múltiplas point lights por pixel podem somar custo de shader fração-unidade (limitado a ~8 na versão antiga; no r185 o limite foi removido/maior), especialmente por representarem áreas com recursividade de luz.

**Sombras:** NENHUMA luz casta sombra (nenhum `castShadow`, e `shadowMap` não está habilitado).

**Emissive materials:** presentes (luminárias, indicadores, portal, fusível/cartão) — ajudam o visual sem luz real.

---

## 13. SOMBRAS

**Não há sombras no projeto:**
- `renderer.shadowMap` NUNCA é configurado (default `NoShadowMap`).
- Nenhuma luz tem `castShadow = true`.
- Nenhum object tem `castShadow`/`receiveShadow`.
- `shadow map size`, tipo de sombra: N/A.

**Consequência:** nenhum custo de shadow map, e o visual é totalmente "flat-lit" (iluminação difusa/ambient). Não há sombras projetadas nem contato.

---

## 14. FOG / ATMOSFERA

**Fog — Game.js:36-39 + Config.js:25-28:**
```js
this.scene.fog = new THREE.FogExp2(CONFIG.atmosphere.fogColor, CONFIG.atmosphere.fogDensity);
```
- `fogColor = 0x2d281a` (marrom-acinzentado escuro), `fogDensity = 0.025`.
- `scene.background` igual ao fogColor (Game.js:35) — fundo/longe se misturam.

**Atmosfera das Backrooms é produzida por:**
1. **FogExp2 denso** (0.025) — névoa escura que limita visibilidade, característica da estética.
2. **Iluminação quente/âmbar** — Ambient (0xfff2cc) + Hemisphere (0xfff4d6) + PointLights (0xffe9b0) → tom amarelado constante.
3. **Flicker das PointLights** (2 luzes + eventos no difícil).
4. **Eventos ambientais no modo difícil** (Level0.js:693-730): flicker de luzes próximas, sons distantes, stubs.

**NÃO existem expecificamente:**
- **Nenhum pós-processamento** (sem vinheta, grain, bloom, color grading).
- Nenhum overlay CSS/filter de cor na view.
- Nenhum sistema de partículas atmosféricas/poeira no ar (as partículas existentes são de pickups/portal somente).
- Nenhum ruído de tela.

**Conclusão:** a atmosfera hoje = fog exponencial + iluminação âmbar + flicker procedural. Não há filtro de tela.

---

## 15. INTERAÇÕES

**Sistema — `src/interactions/InteractionSystem.js`:**
- Constrói `THREE.Raycaster` com `far = CONFIG.interaction.maxDistance` (2.5) (InteractionSystem.js:8-9).
- `setDistanceMultiplier(mult)` ajusta `raycaster.far` conforme dificuldade (1.5 fácil / 1.0 normal / 0.8 difícil) — InteractionSystem.js:16-19, ligado em Game.js:134.
- `register(interactable)` mapeia `mesh.userData.interactable` e propaga aos filhos (InteractionSystem.js:21-32).
- `update()` (InteractionSystem.js:41-69): `raycaster.setFromCamera({x:0,y:0}, camera)` (centro da tela), coleta meshes dos interactables ativos, `intersectObjects(meshes, true)`, sobe na hierarquia até achar o interactable dono via `userData.interactable`, e se o alvo mudou chama `onPromptChange(prompt)`.
- `tryInteract()` (InteractionSystem.js:71-75): se `currentTarget.canInteract()`, chama `interact()`.

**Fluxo:**
```
input: tecla E (InputManager.onKeyDown → callbacks)   [InputManager.js:26-30]
→ Game: input.onInteract → interactionSystem.tryInteract() (se PLAYING)  [Game.js:58-62]
→ detecção: raycaster ao centro da tela cada frame (InteractionSystem.update)  [Game.js:266]
→ validação: currentTarget.canInteract()
→ ação: currentTarget.interact()
→ feedback: prompt via onPromptChange → hud.setPrompt; eventos notify/sfx dentro de cada interactable
```

**Interactables registrados no Level0 (Game.loadLevel, Game.js:136-138):** fusível, cartão (PickupItem), FuseBox, Door.

**`Interactable` (src/interactions/Interactable.js)** — base abstrata: `meshes`, `active`, `canInteract()`, `getPrompt()` (default `[E] Interagir`), `update()`, `interact()`.

**`PickupItem` (src/interactions/PickupItem.js):** adiciona glow (SphereGeometry, MeshBasic, BackSide, depthWrite:false) + partículas (Points, AdditiveBlending) animadas; gira e flutua (`update`); `interact()` chama `onPickup` (definido em Game.js:140-141 → `handlePickup`), esconde o mesh e o remove do array.

**`Door` (src/interactions/Door.js):** estados `cardInserted`/`isOpen`. `interact()`: sem keycard → notify "ACESSO NEGADO" + sfx denied + `pulseReader(true)`; com keycard → `insertCard()` (muda leitor para verde, emissive) → segundo E → `open()` (notify "PORTA ABERTA", sfx door, dispara `onDoorOpened` → eventBus `door:opened`). `update()` anima rotação da porta e pulso do leitor. É `blocker` do grid até abrir.

**`FuseBox` (src/interactions/FuseBox.js):** máquina de estados `FuseBoxState` (NO_FUSE → FUSE_READY → FUSE_INSTALLED → POWER_RESTORED). `refreshState()` promove para FUSE_READY quando o jogador tem o fusível (chamado em Game.handlePickup → Level0.refreshInteractionStates). `interact()`: sem fusível → aviso+denied; com fusível → `insertFuse()` (indicador âmbar); → `restorePower()` (indicador verde, energia restaurada, `onPowerRestored` → ObjectiveManager.complete('power')). `update()` anima pulso do indicador. `switchMesh` rotaciona.

**Keys usadas:** `E` (interagir) — na prática também `Enter` no campo de nome (MainMenu). Prompt muda com o alvo.

---

## 16. GAME STATE

**`src/core/GameState.js`** — mantém o estado da partida e emite eventos pelo `eventBus`.

**Estados reais (campos de `reset()`):**
- `playerName` (string)
- `score` (number)
- `objectives: { fuse, keycard, power }` (booleans)
- `inventory: { fuse, keycard }` (booleans)
- `scoredActions` (Set — evita pontuação dupla)
- `portalUnlocked` (boolean)
- `gameCompleted` (boolean)
- `elapsedSeconds` (number)
- `state` — string: `'MENU'`, `'PLAYING'`, `'PAUSED'`, `'COMPLETED'`

**Métodos:** `setState` (emite `game:stateChanged`), `addScore` (id+points, guarda em scoredActions, emite `score:changed`), `collectItem` (emite `inventory:changed`), `hasItem`, `completeObjective` (emite `objective:completed`; se todos completo → `unlockPortal()`), `allObjectivesComplete`, `unlockPortal` (emite `portal:unlocked`), `completeGame` (emite `game:completed`).

**`src/core/EventBus.js`** — pub/sub com `on/off/emit/clear`; singleton `eventBus`. **Eventos usados no projeto:** `game:stateChanged`, `score:changed`, `inventory:changed`, `objective:completed`, `portal:unlocked`, `game:completed`, `hud:updateObjectives`, `door:opened`.

**Outros sistemas de estado:**
- **ObjectiveManager** (src/systems/ObjectiveManager.js): lista `[fuse, keycard, power]` com título; simplifica pontuação (award via GameState.addScore); emite `hud:updateObjectives`.
- **ScoreManager** (src/systems/ScoreManager.js): mapeia actionId→pontos (fuse 100, keycard 100, power 200, portal 100).
- **Inventory:** apenas os dois campos acima (fuse/keycard); a "energia" e o estado do portal vivem em `portalUnlocked`/`objectives.power`.

**Estados de partida rastreados (nomes reais):** `hasItem('fuse')`, `hasItem('keycard')`, `objectives.power`, `portalUnlocked`, `gameCompleted`, `scoredActions`.

**`GameRepository` (src/systems/GameRepository.js):** `LocalGameRepository` persiste em `localStorage` (`threshold_results`). Abstração preparada para troca futura (README citam ApiGameRepository planejado mas não implementado).

---

## 17. OBJETIVOS / PUZZLES

**Cadeia de gameplay (jogável/implementada):**
1. **Coletar o FUSÍVEL** — `PickupItem` id 'fuse' (Level0.js:369-378). Prompt `[E] Pegar fusível`. Coleta: +100 (ScoreManager), inventory.fuse, objetive 'fuse'.
2. **Coletar o CARTÃO** — `PickupItem` id 'keycard' (Level0.js:380-389). +100, inventory.keycard, objetive 'keycard'.
3. **Restaurar ENERGIA** — `FuseBox` em célula 'P' (Level0.js:486-556). Requer ter fusível (senão avisa). Inserir fusível → liga energia → +200, objetive 'power'. Isso dispara `onPowerRestored` → `objectiveManager.complete('power')` → `GameState.completeObjective` → se todos (fuse, keycard, power) → `unlockPortal()` → evento `portal:unlocked` (Game.js:143-148: desbloqueia o Portal, `lighting.setPowerRestored(1.35)`, notify, sfx portal).
4. **Abrir a PORTA** — `Door` em 'D' (Level0.js:558-635). Precisa do cartão (senão "ACESSO NEGADO"). Usar cartão (E 1ª) → abrir (E 2ª). Sem pontuação pela porta.
5. **Atravessar o PORTAL** — `Portal` em 'O' (Level0.js:317-362, Portal.js). Quando dentro da distância (1.3) e unlocked → `onPortalEnter` → `Game.completePortalRun()` → +100 a 'portal', estado COMPLETED, tela final, salva resultado.

**Condições de conclusão:** todos objetivos `fuse, keycard, power` → desbloqueia portal → atravessar portal termina.

**Pontuação máxima:** 500 (README confirma; script validate-map confirma).

**Guias (modo fácil):** `buildGuideMarkers` cria anéis verdes pulsantes no chão apontando para objetivos ainda pendentes (Level0.js:637-678); chegando via `hud-legend` e minimapa.

**O que funciona hoje:** toda a cadeia acima está implementada e testável. O script `validate-map` garante alcançabilidade via BFS.

---

## 18. PORTAL

**Arquivo:** `src/interactions/Portal.js`. **Classe:** `Portal`.

**Geometria/material/shaders:**
- **Superfície:** `CircleGeometry(1.4, 64)` + **`THREE.ShaderMaterial`** (Portal.js:78-88) com vertex shader e fragment shader customizados, `transparent: true`, `depthWrite: false`, `side: DoubleSide`, `renderOrder = 1`.
  - Fragment shader (Portal.js:13-63) usa uniforms `uTime`, `uColor`, `uIntensity`, `uNoiseScale`; implementa `hash`, `noise` (value noise), `fbm` (5 oitavas); gera swirl (sin dos ângulos), anéis concêntricos, core brilhante, vignette, saída com alpha.
- **Frame externo:** `TorusGeometry(1.45, 0.07, 12, 64)` + `MeshStandardMaterial` (metalness 0.6, emissive - escuro).
- **Inner frame:** `TorusGeometry(1.3, 0.035, 8, 48)` + `MeshStandardMaterial` emissive âmbar (intensity 0 até unlock).
- **Light:** `PointLight(0x332211, 0, 10, decay 1.5)` em y=1.6; intensidade aumenta ao desbloquear.
- **Particles:** `Points` (150 vértices, BufferGeometry com position/size/alpha) + `PointsMaterial` AdditiveBlending.

**Estado locked/unlocked:** `this.unlocked` (Portal.js:118, `unlock()` em 157-161). Antes de desbloquear: shader escuro (uIntensity 0.08, cor marrom), frame rotaciona lentamente, light desligada. Após `unlock()`: anima `unlockProgress` 0→1 (Portal.js:184-208) — shader muda cor para âmbar vivo e intensidade sobe, light acende, inner frame brilha/gira/escala, partículas mais vivas.

**Trigger e teleport — `Portal.update(delta, time, cameraPosition)` (Portal.js:163-214):**
- Devolve `true` se `horizontalDistance(player, portal) < 1.3 && this.unlocked`.
- O **teleport não é feito pelo Portal**; o retorno dispara `onPortalEnter` (instruído em Level0.js:355-361) → `Game.completePortalRun()` (Game.js:186-212) que marca COMPLETED, pontua, fade, mostra "LEVEL 2 — COMING SOON" (tela `level-intro`) e a tela final. **Não há troca de nível real** — apenas término da partida.

**O que NÃO existe no portal:**
- **ShaderMaterial:** SIM (é o mecanismo).
- **WebGLRenderTarget:** NÃO.
- **câmera secundária / renderização da outra cena pelo portal:** NÃO. É só uma superfície com shader procedural (não "portal" vista-dentro-vista).
- **stencil buffer:** NÃO.
- **clipping planes:** NÃO.

**Efeitos:** shader procedural animado + pointlight + partículas + frame emissive. **Sons:** não há som posicional ligado ao portal; `sfx('portal')` (sweep) é tocado globalmente quando desbloqueia (Game.js:147).

**Tecnicamente:** é um "portal" puramente cosmético: um quad circular com shader de ruído animado que indica unlock, e um trigger de distância para encerrar o nível. Não renderiza outra cena.

---

## 19. UI / HUD

**Tipo:** 100% **HTML/CSS + JavaScript (DOM)**, com **um Canvas 2D** para o minimapa. **Nenhuma** UI em Three.js. Toda a markup está em `index.html`; estilos em `src/styles/main.css` (548 linhas).

**Componentes em index.html:**
- `#loading` — tela "CARREGANDO".
- `#main-menu` — título, botões INICIAR/INSTRUÇÕES, modais: nome (`#player-name-input`), dificuldade (FÁCIL/NORMAL/DIFÍCIL), instruções.
- `#hud` — objetivos (`#hud-objectives`/`#objectives-list`), placar (`#hud-score`), crosshair (`#crosshair` "＋"), prompt (`#hud-prompt`), notificações (`#notifications`), legenda modo fácil (`#hud-legend`), minimapa (`#hud-minimap` + canvas 168×132).
- `#pause-menu` — CONTINUAR/REINICIAR/MENU.
- `#level-intro` — "LEVEL 2 — COMING SOON".
- `#end-screen` — "MISSÃO CONCLUÍDA" com jogador/pontuação/tempo + JOGAR NOVAMENTE.
- `#fade` — overlay de transição.

**Classes JS:**
- **`UIManager`** (src/ui/UIManager.js): pause menu + fade (fadeIn/fadeOut com promises).
- **`MainMenu`** (src/ui/MainMenu.js): gerencia modais, dificuldade selecionada, nome.
- **`HUD`** (src/ui/HUD.js): renderiza objetivos via eventBus, score, prompt, legenda/modo fácil, visibilidade.
- **`EndScreen`** (src/ui/EndScreen.js): tela final + intro de nível.
- **`Minimap`** (src/ui/Minimap.js): Canvas 2D com paredes/chão xadrez/marcadores de objetivos/porta/jogador+seta.

**Crosshair/prompts:** CSS estático; prompt muda por interação.

**Notificações:** `NotificationSystem` (src/systems/NotificationSystem.js) cria divs dinâmicos com transição CSS.

**CSS relevante:** `src/styles/main.css`. Estética monoespaçada (`Courier New`), paleta amarelo-âmbar, letter-spacing alto — já tem cara "industrial/retro" no texto, mas a render 3D não.

---

## 20. ÁUDIO

**Sistema:** `src/systems/AudioManager.js` — usa **Web Audio API pura** (não há `THREE.Audio`, `AudioListener`, nem `HTMLAudioElement`). Nenhum arquivo de áudio (pasta `public/audio` vazia); todos os sons são **gerados proceduralmente** com osciladores e buffers de ruído.

**Estrutura:**
- `init()` cria `AudioContext` + `GainNode` master (0.3). `resume()` retoma contexto.
- **Ambiente (startAmbient):** `playHum` (sawtooth 55/110/220 Hz + lowpass), `playDrone` (sine 80/165 Hz + bandpass), `startWhispers` (buffer de ruído filtrado aleatório, agendado), `startDistantEvents` (passos/batida/hum distantes).
- **SFX (`sfx(name)`):** pickup, switch, door, denied, portal, power, ui, distant → blips/sweeps/varied procedurais.
- `stopAll()`, `setMasterVolume()`.

**Sons posicionais:** NÃO existe — nada ligado à posição do jogador. Não há "passos do jogador" ao andar.

**Inicialização do áudio:** `AudioManager.init()` é chamado no clique do menu (Game.js:75), e `audio.startAmbient(...)` na partida (Game.js:114). Master 0.3.

**Estado:** funcional, procedural, sem assets.

---

## 21. ASSETS

Todos os diretórios de assets estão **vazios** (apenas `.gitkeep`):

- **public/audio/** — vazio.
- **public/icons/** — vazio.
- **public/models/** — vazio (nenhum GLTF/GLB).
- **public/textures/** — vazio.

**TEXTURAS:** nenhuma em arquivo; 3 texturas geradas proceduralmente (Textures.js).
**MODELOS:** nenhum externo; geometria toda procedural.
**ÁUDIOS:** nenhum arquivo; sons procedurais via Web Audio.
**FONTES:** nenhuma carregada; usa `Courier New` do sistema.
**OUTROS:** favicon inline SVG em index.html.

---

## 22. WEBXR

**Estado: NÃO IMPLEMENTADO.**
- Nenhum `renderer.xr.enabled`, `VRButton`, `WebXRManager`, `XRControllerModelFactory`, `navigator.xr`, `immersive-vr` em qualquer arquivo (grep confirmou zero ocorrências).
- O README (linhas 89-96) afirma que a arquitetura "já separa input abstrato (InputManager) ... permitindo habilitar renderer.xr.enabled posteriormente" — é uma **pretensão/planejamento**, não código.
- O mesmo vale para o **nome do projeto** (`threshold-webxr`), que antecipa o objetivo DOI.

**Classificação: NÃO IMPLEMENTADO** (apenas intenção documentada).

---

## 23. PERFORMANCE

Análise baseada no código (sem otimizar):

- **Draw calls:** relativamente baixos. Paredes/fixtures/pilares/caixas/detalhes usam InstancedMesh (1 draw cada). Chão/teto/portal/props = 1 mesh cada. Estimativa ~40–60 draw calls no total. OK.
- **Muitas meshes duplicadas:** não; instancing bem usado no ambiente estrutural.
- **Materiais duplicados:** sim, em menor grau — cada Prop/recurso interativo cria materiais novos (fusível, cartão, porta, painel...), mas é baixo e de propósito (estado emissive). Algumas instâncias clonam material (`markerMat.clone()` em guide markers, Level0.js:660).
- **PointLights:** 8 + emissive não conta como luz. 8 point lights sem sombras é gerenciável, mas em forward-rendering moderno há custo de fragment-shader por luz em alcance.
- **Texturas:** 3 canvas 256×256, repetidas; pequenas. Nenhuma textura grande por arquivo (sem arquivo). Nenhum problema de Vram.
- **Pixel ratio:** limitado a 2 (bom); antialias true. Em telas 4K com pixelRatio 2 o custo de fragment é alto (4× supersampling), sem pós.
- **Allocações por frame:**
  - `PlayerMovement.update` cria `new THREE.Vector3(...)` a cada frame (PlayerMovement.js:13) — alocação menor, mas presente.
  - `PickupItem.update` (PickupItem.js:71-84) e `Portal.update` (Portal.js:169-183) reescrevem arrays de posições de partículas e setam `needsUpdate` a cada frame — custo de upload de geometry por frame (2 sistemas de partículas).
  - `InteractionSystem.update` aloca `meshes[]` array a cada frame e faz raycast a cada frame (InteractionSystem.js:44-52) — raycast por frame é comum, mas aqui itera todos os interactables montando arrays.
  - `Level0.updateAmbientEvents` usa `Math.random()` a cada frame para "chance" (Level0.js:687) — barato.
  - `Minimap` redesenha todo o mapa no Canvas 2D a cada frame no modo fácil (Minimap.update → clear+drawMap, 285 células) — custo de CPU por frame.
- **Loops desnecessários:** `flickerNearbyLights` (Level0.js:703-718) varre grid 7×7 a cada evento (ok, esporádico). `createWallTexture` é chamada múltiplas vezes (1x para paredes, 1x para pilares com repeat distinto) — pequena duplicação de geração.
- **Shadow:** não há custo de shadow.
- **Shaders caros:** o shader do portal usa fbm de 5 oitavas por fragmento — custoso em área de tela grande, mas é 1 objeto pequeno. Nenhum outro shader costoso.

**Observação geral:** performance razoável para o escopo; pontos de atenção = raycast e particle-upload por frame + Canvas minimap remapeado, e o fragment shader do portal.

---

## 24. CONFIGURAÇÕES CENTRALIZADAS

**`src/core/Config.js`** — objeto `CONFIG` exportado, única central.

- **game:** `name`, `subtitle`, `cellSize: 3.5`, `wallHeight: 3`.
- **player:** `speed: 3.5`, `sprintSpeed: 6`, `height: 1.7`, `radius: 0.35`, `mouseSensitivity: 0.0022`, `interactionDistance: 2.5`.
- **graphics:** `maxPixelRatio: 2`, `fov: 75`, `near: 0.05`, `far: 120`.
- **atmosphere:** `fogColor: 0x2d281a`, `fogDensity: 0.025`, `ambientIntensity: 0.7`.
- **scoring:** `fuse: 100`, `keycard: 100`, `power: 200`, `portal: 100`.
- **interaction:** `maxDistance: 2.5`.
- **difficulty:** `easy/normal/hard`, cada um com `name`, `description`, `hasGuide`, `hasEntities`, `interactionDistanceMult` (1.5/1.0/0.8), `flickerIntensity` (0.5/1.0/1.8), `ambientEventChance` (0.15/0.35/0.65), `guidePulseSpeed` (2.0/0/0).

Não há seções separadas para lighting/portal/debug. Alguns valores hardcoded fora de Config (ex.: boost 1.35 em Game.js:145, distância do portal 1.3 em Portal.js:213, decay 1.5/1.6 em Lighting.js, posições de POINT_LIGHT_CELLS em MapData.js).

---

## 25. SISTEMAS DE DEBUG

- **console.log:** NENHUM em `src/` (apenas 2 `console.warn` de tratamento de erro: AudioManager.js:23, GameRepository.js:10).
- **Debug renderer/wireframe/bounding boxes:** NENHUM (0 ocorrências).
- **Helpers (AxesHelper, GridHelper, BoxHelper, ArrowHelper):** NENHUM.
- **Stats.js / dat.GUI / lil-gui:** NENHUM.
- **Scripts externos de debug:** `scripts/test-movement.mjs` (teste de console) e `scripts/validate-map.mjs`.

**Conclusão:** não há infraestrutura de debug visual; apenas os dois utilitários via Node.

---

## 26. TESTES / BUILD

**Build:** `npm run build` → **PASSA** (vite v8.2.2, 37 módulos). Saída: `dist/index.html` (5.87 kB), CSS (7.12 kB), JS (590.42 kB / 149.61 kB gzip).
- **Warning:** "Some chunks are larger than 500 kB after minification" — chunk único de ~590 kB. Não é erro.
- **Erros:** nenhum.

**Testes automatizados:** NÃO há script `test` no package.json.

**Scripts utilitários (executados manualmente com node):**
- `node scripts/validate-map.mjs` → executa e passa: todos os objetivos alcançáveis, porta acessível de 1 lado, portal inacessível sem porta, pontuação máxima 500, "MAPA VÁLIDO".
- `node scripts/test-movement.mjs` → executa e passa: "MOVIMENTO OK".

Nota: no ambiente, `node` não está no PATH (instalado como `node.exe` no Windows); os scripts rodam via npm/`node.exe`.

---

## 27. PROBLEMAS / BUGS VISÍVEIS

**CRÍTICO:**
- Nenhum crítico evidenciado no build/código.

**ALTO:**
- Nenhum com impacto claro de bloqueio identificado.

**MÉDIO:**
1. **`buildWallDetails` usa `half` antes da declaração `const half` no fim do módulo (Level0.js:733)** — funciona porque a função só é **chamada** após o módulo ser avaliado (TDZ já passada), mas é frágil/confuso; `half = 3.5/2` hardcoded no escopo do módulo (também duplicado localmente no `buildDoor` com `const half = this.cellSize/2`, Level0.js:561). Não é bug em runtime, é dívida.
2. **Collision usa grid de célula inteira mas a geometria das paredes é caixas centradas** — o jogador pode "afundar" parcialmente ou ter folgas visuais nas bordas; props (pilares dentro de células não-'#'? e caixas) não são sólidos e podem ser atravessados.
3. **Particle upload por frame** em PickupItem e Portal com `needsUpdate` a cada frame — potencial custo; não é bug funcional.
4. **`fx`/fração do minimapa**: `drawPlayer` usa `(cell.x + 0.5 + fx*0.5)` — função de interpolação um tanto heuristicamente derivada; pode ficar ligeiramente imprecisa nas bordas da célula, mas é visual do minimapa.
5. **Eventos ambientais "Future" stubs** (`closeDistantDoor`, `moveObjectSlightly`) — vazios; o modo difícil promete "eventos intensos" mas parte deles não produz efeito.

**BAIXO:**
6. Nome do projeto `threshold-webxr` mas sem WebXR — inconsistência de naming.
7. README menciona "ApiGameRepository planejado" — não existe classe; só `LocalGameRepository`.
8. Bytecode: `Crosshair` e outros textos de HUD não traduzidos/sempre em PT; não é bug.

---

## 28. DÍVIDA TÉCNICA

- **Acoplamento moderado:** `Game` é orquestrador com muitas responsabilidades (renderer, scene, camera, níveis, input, sistemas, UI, portal, áudio, fluxo de estado) — ~289 linhas. Manipula DOM (Game.js:90-93), renderer e lógica de jogo no mesmo lugar.
- **`Level0` é grande (733 linhas):** construção de geometria + gameplay + estados + eventos ambientais + guias, tudo numa classe. Responsabilidades misturadas (visual + lógica + triggers).
- **Funções/modificação de regras:** Várias regras espalhadas — pontuação existe em 3 lugares (Config.scoring, ScoreManager, validate-map), e `half` hardcoded duplicado.
- **`PlayerController` não remove o listener** `mousemove` (PlayerController.js:9) mesmo em teardown/restart — listeners acumulam se instanciado múltiplas vezes (mas `Player` é criado por loadLevel e o controller anterior não é explicitamente descartado; leve vazamento potencial de listeners a cada restart).
- **`GameState` e `ObjectiveManager` têm lógica sobreposta** (cada um tem sua noção de objetivos; ObjectiveManager marca e o GameState completa — com pontuação gerenciada em ObjectiveManager.complete → GameState.addScore).
- **Código de UI legado `updateLegendVisibility`** é alias de `updateEasyVisibility` com comentário "compat: alias" (HUD.js:120-123).
- **Código morto/inativo:** handlers `closeDistantDoor`/`moveObjectSlightly` vazios; `LegendState.portalDone` sempre false.
- **Header do portão:** `frameSide` é 1 mesh vertical central, sem moldura superior completa — visual simples (não é bug).
- **Sem testes automatizados** e sem linter/config de formato visíveis.
- **Config.js sem tópicos lighting/portal/debug** — parte da config vive em MapData.js (light positions) e hardcoded.

---

## 29. AUDITORIA ESPECÍFICA PARA ESTILO PS1

**A) Low-poly — geometria adequada?**
Sim, em grande parte. Parsedes/chão/teto/pilares/caixas são boxes/planos com poucos polígonos. Os `InstancedMesh` enquadram bem. Porém: o **chão e o teto são planos únicos gigantes** (1 face cada) — de certa forma *muito* baixa resolução no sentido de "mesh inteira", sem segmentação; feição de topologia PS1 normalmente quiere malhas com vértices visíveis, não polígonos planos. O **portal usa `CircleGeometry(…,64)`** e `TorusGeometry(…,12,64)` (tem segmentos altos → aparência suave, não-PS1). Se o objetivo for low-poly perfeito, será preciso reduzir segmentos do portal/partículas.

**B) Texturas low-resolution substituíveis por 64/128/256?**
Sim, trivialmente. As 3 texturas são geradas em Canvas 256×256 e o tamanho é controlado por uma constante em `Textures.js` (`const size = 256`, em `createCanvas`). Reduzir para 64/128/256 é uma 1-linha por função. Porém, hoje estão com mipmap/linear — o aspecto PSX (elevado pixelado) exige `NearestFilter` + sem mipmap, o que seria aplicado nessas mesmas texturas.

**C) Nearest filtering — existe central onde aplicar?**
Parcialmente. Toda textura passa por `Textures.js` (3 funções). É um **lugar concentrado ideal** — bastaria centralizar um helper que aplica `texture.magFilter = NearestFilter; texture.minFilter = NearestFilter; generateMipmaps=false` nas 3. Não há hoje nenhum ponto de filtro configurado.

**D) Renderização em resolução interna reduzida — onde implementar?**
Hoje a renderização é direta ao canvas (`renderer.render` em Game.js:281, sem EffectComposer/framebuffer). Para baixar a resolução interna é preciso (futuramente) um `WebGLRenderTarget` de baixa resolução + pass de upscale (EffectComposer independente ou render de target para tela). Isso é uma **mudança arquitetural no `Game.animate`/renderer**, pois hoje não há camada de "render pipeline". Também possível via `renderer.setPixelRatio` baixo (já limitado a 2; reduzir para 1 arredondaria, mas não "pixelates" de forma PS1 sem resize de target).

**E) Vertex snapping / jitter — como os materiais atuais seriam afetados? Local central?**
Não há nenhum shader customizado exceto o do **portal** (Portal.js). "Vértice snapping/affine" afetaria todas as matérias; o único lugar central para modificar o pipeline de vértices seria **globalmente via `THREE.ShaderChunk`/`onBeforeCompile`/`Material.onBeforeCompile`** — nada disso existe hoje. Aplicar a todos os materiais exigiria um gancho global (ex.: patching em `Material.prototype` ou monkey-patch em cada material criado). O projeto cria materiais em vários arquivos (`Level0.js`, `Portal.js`, `PickupItem.js`) e **não há fábrica central de materiais**, o que é um ponto de fricção para vendas globais de materiais.

**F) Affine texture mapping / textura warp (perspectiva de 3 itens):**
Os materiais afetados seriam todos `MeshLambertMaterial` (paredes/chão/teto/pilares/caixas — texturizados) e os `MeshStandardMaterial` das props, além das superficies. Cada um precisaria de ajuste via `onBeforeCompile`. Como hoje usam o pipeline default, requer modificação nos pontos onde estes materiais são construídos, ou um hook global. O shader do portal usa sua própria UV (vUv) e precisaria considerações separadas se o warp for desejado também ali.

**G) Dithering — existe pós-processamento? Não. Como a arquitetura se relacionaria?**
Não há pós-processamento (0 EffectComposer/passes). A arquitetura atual renderiza direto ao canvas; para dithering futuro seria preciso **introduzir** uma camada de pós (EffectComposer/OutputPass, ou shader full-screen). Nada preexistente aproveita-se; seria uma adição nova no pipeline do `Game.animate`. O caminho mais natural seria adicionar um composer na inicialização (Game.init) e substituir `renderer.render` no loop.

**H) Color quantization — tone mapping / color management atual?**
Não há tone mapping definido → `NoToneMapping`. `colorSpace` explícito apenas nas texturas procedural (`SRGBColorSpace`) — e o renderer usa o default (SRGB output em r185). Redução de bits/índice de cores (quantização) não existe. Seria uma adição. Como o `scene.background`/`fog` usam cor hex literais e as texturas são SRGB, há base para color grading, mas nada está configurado hoje.

**I) Fog — ajudaria ou atrapalharia?**
Fog no PS1 era forte. O projeto já tem `FogExp2` bem denso (0.025) com cor quente. Isso **ajuda** a estética PSX (limite de draw distance). Porém, para PS1 puro, seria mais típico **Fog linear** (distância corte dura) do que exponencial suave — se o objetivo for fidelidade, o `FogExp2` atual é "moderno/suave"; serve bem como base mas pode precisar de conversão para `Fog` linear ou manutenção. De forma geral, o fog existente é uma vantagem.

**J) Lighting — muito moderno/PBR?**
O ambiente estrutural é `MeshLambertMaterial` (não-PBR, plastic look bom para PS1) — **bom ponto de partida**. Porém as props/ativos usam `MeshStandardMaterial` com `metalness`/`roughness` (PBR moderno), e há `AmbientLight` + `HemisphereLight` + 8 `PointLights` com decay físico. Para PS1 (máx. normalmente 2-8 luzes, sem físicas real‑time, cor de luz simples, sem emissive forte) o sistema atual precisa ser **simplificado**: Lightmap/fake lighting + luzes direcionais/point simples com contagem baixa, remover PBR, reduzir emissive exagerado. Ou seja: o pipeline de luz atual é "moderno" demais, embora a base Lambert do ambiente ajude.

**K) Shadows — compatíveis?**
Não há sombras atuais (NÃO está habilitado shadowMap). Para PS1, shadow maps modernos (blobs/texturas de dupla) geralmente não são necessários; a ausência de sombras é compatível — **zero sombras é consistente com PS1** (que usava fake/blob shadows ou nada). Logo, não haverá incompatibilidade; o atual "sem sombras" alinha-se. Se no futuro quiser verificar contato, seria um blob fake.

**L) VR — impacto dos efeitos PS1 em VR (identificação de potencial desconforto):**
- **Vertex jitter/snapping:** em VR, jitter de vértices por frame é perceptível e causa "swimming" que pode causar desconforto/náusea — risco **alto**.
- **Baixa resolução (rendering intern reduzido):** em VR a baixa resolução é mais visível e pode causar fadiga visual/tensão — risco **médio/alto**.
- **Camera jitter (se aplicado a câmera):** não há hoje; se efeito deslocar câmera em VR, maior desconforto — risco **alto** (qualquer movimento da câmera que não corresponda ao headset é problemático).
- **Dithering:** em geral seguro e até útil; risco baixo-médio.
- **Texture warping (affine):** o warp forte de texturas em VR pode ser perceptível, mas geralmente não causa náusea severa — risco baixo-médio (depende da magnitude).
**Nota:** como WebXR não está implementado, estes efeitos afetariam apenas futuramente.

---

## 30. ARQUIVOS QUE SERIAM IMPACTADOS POR UMA FUTURA CONVERSÃO PS1

**CRÍTICOS (prováveis modificações centrais):**
- `src/core/Game.js` — pipeline de render (atualmente direto ao canvas): renderização de baixa resolução, pós-processamento (dithering/grading) — maiores mudanças aqui.
- `src/core/Config.js` — novos parâmetros (resolução interna alvo, filtros, emergence/ids), fog linear, tone mapping.
- `src/world/Textures.js` — ponto central para `NearestFilter`/sem mipmap + resolução 64/128.
- `src/world/Level0.js` — criação de materiais (aplicar hooks de affinity/vertex), segmentação de malhas do chão/teto, reduzir segmentos de geometrias de portal/props, redução de luzes/integração de lightmap.
- `src/world/Lighting.js` — simplificar iluminação para estilo PS1 (menos/tipos de luz, fake light).
- `src/interactions/Portal.js` — Segmentos/aparência do portal; possível ajuste do shader (embora PS1 não exija aquilo, se mantido, pode precisar de alinhamento low-res).
- `src/player/PlayerMovement.js` / `PlayerController.js` — apenas se aplicar jitter de câmera (não recomendado em VR); caso contrário, mínimos.

**SECUNDÁRIOS:**
- `src/interactions/PickupItem.js`, `src/interactions/Door.js`, `src/interactions/FuseBox.js` — materiais PBR a converter para falso/lambert + hooks de afinity/nearest.
- `src/world/Level.js` — se introduzir re-orientação de malhas/fog.
- `src/ui/Minimap.js` — já usa `image-rendering: pixelated` (CSS) — sem impacto.
- `src/styles/main.css` — possíveis overlays de dither/scanline via CSS (opcional).
- `index.html` — containers de overlay de efeito de tela (opcional).

**ASSETS:**
- Não há assets externos para substituir. Texturas procedural (`Textures.js`) seriam reconfiguradas (filtros/res. baixa), não substituídas. Modelos: nenhum para trocar; malhas procedurais seriam simplificadas.

---

## 31. MAPA DE DEPENDÊNCIAS (relações reais)

```
main.js
└── Game (src/core/Game.js)
    ├── GameState (core/GameState.js) ─→ EventBus
    ├── EventBus (core/EventBus.js) [singleton]
    ├── Config (core/Config.js)
    ├── InputManager (systems/InputManager.js)
    ├── AudioManager (systems/AudioManager.js)
    ├── NotificationSystem (systems/NotificationSystem.js)
    ├── ObjectiveManager (systems/ObjectiveManager.js)
    ├── ScoreManager (systems/ScoreManager.js)
    ├── LocalGameRepository (systems/GameRepository.js)
    ├── InteractionSystem (interactions/InteractionSystem.js) ─→ Interactable
    ├── LevelManager (world/LevelManager.js) ─→ Level0 → Level
    │       ├── Lighting (world/Lighting.js)
    │       ├── Textures (world/Textures.js)
    │       ├── MapData (world/MapData.js)
    │       ├── PickupItem, Door, FuseBox, Portal (interactions/)
    │       └── CONFIG
    ├── Player (player/Player.js)
    │       ├── PlayerController (player/PlayerController.js)
    │       └── PlayerMovement (player/PlayerMovement.js) ─→ Level (grid de colisão)
    ├── HUD (ui/HUD.js) ─→ Minimap (ui/Minimap.js), EventBus
    ├── UIManager (ui/UIManager.js)
    ├── EndScreen (ui/EndScreen.js)
    └── MainMenu (ui/MainMenu.js)
```

**Fluxo de dados central:** `eventBus` (EventBus.js) conecta GameState ↔ ObjectiveManager ↔ ScoreManager ↔ HUD/Minimap ↔ NotificationSystem.

---

## 32. RESUMO DO ESTADO ATUAL

| Sistema | Estado | Arquivos principais | Observações |
|---|---|---|---|
| Renderer | FUNCIONAL | src/core/Game.js:29-32 | Antialias on, pixelRatio≤2, sem tone mapping, sem shadows, sem pós |
| Camera | FUNCIONAL | src/core/Game.js:41-46, src/player/PlayerController.js | Perspective FOV75 near0.05 far120; sem efeitos visuais |
| Player | FUNCIONAL | src/player/Player.js, PlayerController.js, PlayerMovement.js | WASD+sprint+mouse look; sem gravidade; alt. fixa 1.7 |
| Collision | FUNCIONAL (limitado) | src/world/Level.js, src/player/PlayerMovement.js | Grid de células 2D; por eixo com sliding; props não sólidos |
| Level | FUNCIONAL (1 nível) | src/world/Level.js, Level0.js, LevelManager.js, MapData.js | 1 nível ASCII procedural; InstancedMesh; semi-low-poly |
| Lighting | FUNCIONAL | src/world/Lighting.js, MapData.js | Ambient+Hemisphere+8 PointLight, decay; flicker; sem shadows |
| Materials | FUNCIONAL | Level0.js, Portal.js, PickupItem.js | Lambert (ambiente) + PBR Standard (props) + 1 ShaderMaterial (portal) |
| Textures | FUNCIONAL (procedural) | src/world/Textures.js | 3 canvas 256×256, RepeatWrapping, SRGB; sem NearestFilter |
| Portal | FUNCIONAL (cosmético) | src/interactions/Portal.js | ShaderMaterial procedural + trigger distância; não renderiza outra cena |
| UI | FUNCIONAL | index.html, src/styles/main.css, src/ui/* | HTML/CSS/DOM + 1 Canvas 2D minimapa |
| Audio | FUNCIONAL | src/systems/AudioManager.js | Web Audio procedural; sem assets/sem posicional |
| WebXR | NÃO IMPLEMENTADO | — | Só intenção (README/nome); zero código |
| Objetivos/Score | FUNCIONAL | GameState, ObjectiveManager, ScoreManager | Cadeia fusível→cartão→energia→porta→portal; máx 500 |
| Persistência | FUNCIONAL | src/systems/GameRepository.js | localStorage |
| Debug/Testes | PARCIAL | scripts/*.mjs | 2 utilitários manuais; sem testes automatizados |

---

## 33–34. FORMATO E REGRA FINAL

O relatório segue o formato autossuficiente: todas as implementações importantes citam ARQUIVO + CLASSE/FUNÇÃO + linhas aproximadas, com trechos mínimos apenas onde essenciais (renderer, loop, colisão, portal, texturas). Não houve implementação, refactor, alteração de arquivos, instalação/remoção de dependências, formatação, commit ou conversão para PS1 — apenas leitura, execução segura do build/scripts (que não modificam o código-fonte) e documentação do estado real.

=== FIM DO RELATÓRIO TÉCNICO ===

---

