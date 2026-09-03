# Identificação de cubo preto no jogo

**Session ID:** ses_f9ba80cffffe720BaYrChwfWbI
**Created:** 9/2/2026, 7:58:00 PM
**Updated:** 9/2/2026, 8:18:33 PM

---

## User

[Image 1] o que era pra ser isso?

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: glob**

---

## Assistant

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

**Tool: read**

**Tool: read**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

Era pra ser um `crate` / caixote cenográfico - `src/world/Level0.js:34` e `228`.

`CRATE_PLACEMENTS` cria 4 cubos `0.7x0.7x0.7` `MeshLambertMaterial({ color: 0x5a4f32 })` espalhados no `CHÃO 0` pra quebrar a repetição do labirinto e dar vibe `PS1` de depósito abandonado, sem interação:

* `15,1 north` / `17,3 east` / `2,13 south` / `6,11 west`

O da print é o de canto `0.35m` do chão encostado na parede. Tá preto puro por bug de iluminação: `MeshLambert` precisa de luz direta, e nesse canto não tem `POINT_LIGHT_CELLS` `src/world/MapData.js:19` perto - sem luz + `fog` + `configureRetroMaterial()` vira preto. Era pra ser marrom escuro amadeirado.

Fix seria trocar pra `MeshBasic` ou dar `emissive: 0x221e12` / `PointLight` dedicada como foi feito no `FuseBox` `src/world/Level0.js:662`.

---

## User

corrija

---

## Assistant

**Tool: read**

**Tool: read**

**Tool: read**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: todowrite**

---

## Assistant

**Tool: todowrite**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: todowrite**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: todowrite**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: bash**

---

## Assistant

**Tool: todowrite**

---

## Assistant

Corrigido.

**Era:** `crate` decorativo `src/world/Level0.js:34` com `MeshLambert({color: 0x5a4f32})` sem textura/emissive - longe de `POINT_LIGHT_CELLS` `src/world/MapData.js:19` com `MeshLambert` + `Fog(0x000000)` virava preto puro.

**Fix:**

1. `src/world/Textures.js:154` - novo `createCrateTexture()` madeira PS1: base `#8a6d2e`, 3 tábuas com vãos, 3 ripas verticais, pregos `0x2a1f0a` + `addBlockNoise`/`quantize` + `NearestFilter` (mesmo padrão das outras texturas).

2. `src/world/Level0.js:5` + `229` - `buildCrates()` agora:
```js
map: createCrateTexture(1,1), color: 0xffffff, emissive: 0x2a1f0a, emissiveIntensity: 0.35
```
`emissive` garante base visível mesmo sem luz direta, mas ainda respeita `PointLight`/`AmbientLight` `src/world/Lighting.js:82` e `Fog` linear `12/34 easy`.

Build `vite build` ok `786kB` sem regressão.

---

## User

veja se tem algum outro atalho ou funcionalidade que está conflitando com a tecla "Q", quando eu vou tentar interagir na caixa com Q, aparece o menu de pausa

---

## Assistant

**Tool: read**

**Tool: read**

---

## Assistant

**Tool: read**

**Tool: read**

**Tool: grep**

---

## Assistant

**Tool: grep**

---

## Assistant

**Tool: read**

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: edit**

---

## Assistant

**Tool: bash**

---

## Assistant

Achado o conflito:

* `Q` nunca foi interação - interação é só `E` `src/systems/InputManager.js:27` -> `InteractionSystem.tryInteract()` `src/core/Game.js:113`. `Q` é `KeyQ togglePhone()` `src/core/Game.js:123`
* Ao apertar `Q` perto da caixa (`FuseBox` `src/interactions/FuseBox.js:33` prompt `[E] Inserir fusível` / `[E] Restaurar energia`) você abria o `NokiaPhone` `src/ui/NokiaPhone.js:182` - que faz `document.exitPointerLock()` `src/core/Game.js:342`
* `onPointerLockChange()` `src/core/Game.js:579` transformava todo `exitPointerLock` em `PAUSE` (`UIManager.showPause()` `src/ui/UIManager.js:35`) - inclusive o do celular. Resultado: `Q` -> celular + menu `PAUSADO` por cima.

**Corrigido:**

1. `src/core/Game.js:579` - `if (this.nokiaPhone?.isOpen) return;` antes de `pause()` - destravar cursor pro celular não pausa mais
2. `src/core/Game.js:113` - `onInteract` bloqueia `E` com celular aberto pra não interagir por baixo
3. `src/core/Config.js:156` - descrição `DIFÍCIL` trocada de `Q alterna lanterna` -> `F alterna lanterna, Q celular` (código já usa `F` `src/core/Game.js:118` e `PICKUP_MESSAGES` `F` `src/core/Game.js:36`)

Uso correto na caixa: `E` pra inserir fusível, `E` de novo pra restaurar - `Q` só abre/fecha celular.

---

## User

o que é webxr

---

## Assistant

WebXR é a `WebXR Device API` - API do browser pra acessar hardware XR (VR/AR) direto via `JavaScript` sem plugin.

* Abstrai `headset` (`Meta Quest`, `Vision Pro`), controle, tracking de posição/mãos
* Expõe `navigator.xr.isSessionSupported('immersive-vr')` e `requestSession('immersive-vr'|'immersive-ar')` com `WebGL` `XRSession` + `requestAnimationFrame` próprio
* Substitui o antigo `WebVR`

No projeto: `package.json` é `threshold-webxr` e `src/core/Config.js:109` tem `retro.vrSafe` (desativa `vertexSnapping` etc) mas não está ativo - está preparado pra VR futuro, hoje roda só 2D.

---

## User

Quero que você faça uma AUDITORIA ATUALIZADA DE GAME DESIGN, ROTEIRO E PROGRESSÃO do jogo THRESHOLD.

NÃO implemente nada.
NÃO altere arquivos.
NÃO refatore.
NÃO corrija inconsistências.
NÃO adicione história nova.
NÃO modifique gameplay.

Neste momento quero SOMENTE que você leia o repositório atual e documente COMO O JOGO REALMENTE ESTÁ.

O relatório será enviado para outra IA que NÃO possui acesso ao código.

IMPORTANTE:

- O código atual é a única fonte da verdade.
- Não confie em relatórios antigos.
- Não confie na conversa anterior.
- O projeto mudou bastante.
- Se a conversa e o código divergirem, use o CÓDIGO.

Quero entender principalmente:

- qual é a história atual;
- o que o jogador sabe;
- o que o jogador não sabe;
- por que ele está nas Backrooms;
- o que cada fase representa;
- qual é o objetivo de cada fase;
- como uma fase leva à outra;
- quais puzzles existem;
- quais itens existem;
- qual é a função dos monstros;
- como as dificuldades mudam a experiência;
- o que acontece no final;
- quais elementos narrativos existem;
- quais partes parecem desconectadas ou sem explicação.

==================================================
1. RESUMO DO JOGO ATUAL
==================================================

Comece com um resumo de aproximadamente 10-20 linhas explicando THRESHOLD como um jogo.

Inclua:

- nome completo;
- gênero;
- perspectiva;
- estilo visual;
- ambientação;
- premissa;
- objetivo principal;
- quantidade de fases;
- estrutura de progressão;
- ameaça principal;
- condição de vitória;
- condição de derrota.

Escreva como se estivesse explicando o jogo para alguém que nunca o viu.

==================================================
2. PREMISSA / ROTEIRO ATUAL
==================================================

Quero saber qual história REALMENTE existe no jogo hoje.

Procure por:

- textos de introdução;
- menu;
- mensagens;
- celular;
- objetivos;
- textos de level;
- game over;
- final;
- arquivos de configuração;
- comentários relevantes;
- documentação interna;
- qualquer mensagem entregue ao jogador.

Responda:

1. Quem é o jogador?
2. O jogo explica quem ele é?
3. Como ele chegou às Backrooms?
4. O jogo explica isso?
5. O jogador sabe onde está?
6. Existe alguma organização, laboratório, experimento ou lore externo?
7. Existe alguma explicação para os portais?
8. Existe explicação para a entidade?
9. Existe explicação para os níveis?
10. Existe um objetivo narrativo maior além de "escapar"?

Se não houver resposta no código:

escreva explicitamente:

NÃO EXPLICADO ATUALMENTE.

Não invente lore para preencher buracos.

==================================================
3. INTRODUÇÃO DO JOGO
==================================================

Documente exatamente o que acontece desde abrir o jogo até o jogador começar a andar.

Fluxo desejado para documentação:

ABRE O JOGO
↓
MENU
↓
ESCOLHA DE DIFICULDADE
↓
NOME
↓
TELA/INTRO
↓
SPAWN
↓
PRIMEIRO OBJETIVO

Informe:

- textos mostrados;
- instruções;
- mensagens;
- áudio relevante;
- transições;
- objetivo inicial;
- posição/contexto do jogador.

Explique se atualmente existe uma introdução narrativa ou se o jogador simplesmente aparece no Level 0.

==================================================
4. ESTRUTURA COMPLETA DA CAMPANHA
==================================================

Monte a campanha inteira atual.

Formato:

LEVEL 0
↓
PORTAL
↓
LEVEL 1
↓
PORTAL
↓
LEVEL 2
↓
FINAL

Use os níveis realmente existentes.

Para cada transição, explique:

- o que libera a saída;
- o que o jogador faz;
- o que aparece na tela;
- se existe mensagem;
- se existe explicação narrativa;
- se existe apenas uma transição mecânica.

==================================================
5. LEVEL 0
==================================================

Faça uma documentação completa.

### Identidade

- nome atual;
- aparência;
- inspiração;
- layout;
- clima;
- iluminação;
- sons relevantes.

### Spawn

- onde jogador aparece;
- o que ele vê inicialmente;
- qual primeira direção provável;
- qual informação recebe.

### Objetivo principal

Explique em uma frase.

### Objetivos / etapas

Liste EM ORDEM LÓGICA todos os objetivos.

Exemplo:

1. encontrar fusível;
2. encontrar cartão;
3. inserir fusível;
4. restaurar energia;
5. abrir porta;
6. ativar portal;
7. atravessar portal.

MAS use exatamente o fluxo atual do código.

Para cada objetivo:

OBJETIVO:
TRIGGER:
ITEM NECESSÁRIO:
LOCAL:
FEEDBACK:
PONTOS:
O QUE DESBLOQUEIA:

### Itens

Liste todos.

### Interações

Liste todas.

### Entidade

Explique seu papel nesse nível.

### Narrativa

Explique o que esse Level comunica narrativamente.

Se não comunica nada além de ser uma Backrooms clássica:

diga isso.

### Final da fase

Explique exatamente como termina.

==================================================
6. LEVEL 1
==================================================

Repita a mesma estrutura.

Quero entender:

- aparência;
- tema;
- diferença para Level 0;
- objetivo;
- Part A;
- Part B;
- Generator;
- sequência correta;
- portal;
- entidade;
- dificuldade;
- itens;
- feedback;
- narrativa.

Também responda:

POR QUE O JOGADOR PRECISA FAZER O PUZZLE DO LEVEL 1?

Existe uma justificativa narrativa?

Ou apenas uma condição de gameplay?

==================================================
7. LEVEL 2
==================================================

Repita novamente.

Documente especialmente:

- atmosfera;
- identidade visual;
- fragmento;
- Stabilizer;
- objetivo final;
- portal final;
- encerramento.

Explique:

POR QUE O STABILIZER EXISTE?

O que ele supostamente faz?

O jogo explica?

O jogador entende que está estabilizando uma anomalia?

Ou isso só existe como nome de objetivo/classe?

==================================================
8. OBJETIVOS DE TODOS OS NÍVEIS
==================================================

Crie uma tabela:

| Level | Objetivo principal | Subobjetivos | Item-chave | Puzzle | Saída |
|---|---|---|---|---|---|

Somente conteúdo real.

==================================================
9. OBJECTIVE MANAGER / GAME STATE
==================================================

Explique como objetivos estão estruturados tecnicamente apenas o suficiente para entendermos o design.

Liste todos os IDs reais.

Exemplo:

fuse
keycard
power
partA
partB
generator
fragment
stabilizer

Use IDs reais.

Para cada:

- nome mostrado;
- descrição;
- pontos;
- condição;
- dependências.

==================================================
10. PONTUAÇÃO
==================================================

Documente todo o sistema atual.

Quero saber:

- quanto cada objetivo vale;
- pickups;
- portal;
- conclusão de nível;
- conclusão do jogo;
- bônus;
- dificuldade;
- morte;
- tempo.

Monte uma tabela.

Informe pontuação máxima possível se for possível calcular.

==================================================
11. DIFICULDADES COMO GAME DESIGN
==================================================

Não quero somente parâmetros técnicos.

Explique a EXPERIÊNCIA que cada dificuldade produz.

### FÁCIL

- recursos disponíveis;
- minimapa;
- guia;
- entidade;
- fog;
- itens;
- objetivo;
- punição;
- chance de morte.

### NORMAL

- radar;
- celular;
- entidade;
- navegação;
- perseguição;
- fog;
- recursos.

### DIFÍCIL

- celular;
- lanterna;
- ausência de radar/minimap;
- fog;
- entidade;
- perseguição;
- navegação;
- recursos.

Depois diga:

As três dificuldades parecem realmente três experiências diferentes?

Ou só alteram valores?

==================================================
12. CELULAR
==================================================

Documente o papel do celular no GAME DESIGN e na NARRATIVA.

Não preciso agora de detalhes técnicos de FBX/shader.

Quero:

- em quais dificuldades existe;
- onde aparece;
- por que o jogador pega;
- como usa;
- o que mostra;
- quais objetivos mostra;
- quais mensagens recebe;
- qual frequência;
- se as mensagens contam alguma história;
- se são apenas dicas;
- se ajudam na navegação;
- se alertam sobre entidade.

Liste todas as mensagens reais existentes.

Se houver lista como:

PHONE_MESSAGES

copie os textos curtos ou resuma fielmente.

==================================================
13. RADAR
==================================================

Explique como elemento de game design.

- em qual dificuldade;
- onde encontra;
- o que desbloqueia;
- o que mostra;
- por que existe;
- se possui explicação narrativa;
- se é radar realmente ou simplesmente desbloqueia minimapa.

==================================================
14. LANTERNA
==================================================

Mesma coisa.

- dificuldade;
- spawn;
- por que necessária;
- fog;
- alcance;
- uso;
- relação com celular;
- risco/recompensa.

Explique se:

CELULAR e LANTERNA são mutuamente exclusivos durante o uso.

==================================================
15. ENTIDADE / MONSTRO
==================================================

Descreva o monstro como um componente de GAME DESIGN.

Não quero uma auditoria de código extensa.

Quero entender:

- aparência;
- quantidade;
- função;
- onde aparece;
- comportamento;
- como ameaça o jogador;
- captura;
- respawn;
- desaparecimento.

Depois, por dificuldade:

FÁCIL:
o que o jogador vivencia?

NORMAL:
o que o jogador vivencia?

DIFÍCIL:
o que o jogador vivencia?

==================================================
16. ENTIDADE — PAPEL NARRATIVO
==================================================

Muito importante.

Responda baseado no jogo atual:

- ela tem nome?
- origem?
- lore?
- texto explicando?
- relação com Backrooms?
- relação com portais?
- relação com jogador?
- existe razão narrativa para perseguir?

Se não existir:

NÃO EXPLICADO ATUALMENTE.

==================================================
17. MORTE / GAME OVER
==================================================

Explique:

- como jogador morre;
- o que acontece visualmente;
- áudio;
- texto;
- opções;
- o que perde;
- reinicia nível ou jogo;
- pontuação;
- narrativa.

==================================================
18. PORTAIS
==================================================

Explique o papel mecânico e narrativo.

MECÂNICO:
- como desbloqueia;
- quando aparece;
- como atravessa;
- troca de level.

NARRATIVO:
- o jogo explica o que são?
- quem criou?
- são naturais?
- são anomalias?
- por que levam ao próximo Level?

Se não houver explicação:

deixe claro.

==================================================
19. PROGRESSÃO DO JOGADOR
==================================================

O jogador evolui de alguma forma?

Procure:

- inventário persistente;
- itens carregados entre levels;
- habilidades;
- score;
- conhecimento;
- recursos.

Explique o que permanece e o que é resetado ao trocar de fase.

==================================================
20. INVENTÁRIO
==================================================

Liste todos os itens possíveis.

Tabela:

| Item | Level | Dificuldade | Função | Consumido? | Persiste? |
|---|---|---|---|---|---|

==================================================
21. ROTEIRO EM ORDEM CRONOLÓGICA
==================================================

Agora escreva o jogo inteiro como uma sequência cronológica.

Formato aproximado:

1. Jogador inicia o jogo.
2. Escolhe dificuldade.
3. Surge no Level 0.
4. Recebe objetivo X.
5. Explora...
6. Encontra...
7. Entidade...
8. Portal...
9. Level 1...
10. ...
11. Level 2...
12. Final.

Não invente acontecimentos.

Esse deve ser o roteiro REAL atualmente jogável.

==================================================
22. ROTEIRO PELO PONTO DE VISTA DO JOGADOR
==================================================

Depois escreva uma versão curta em linguagem natural:

"O jogador acorda/aparece..."

MAS somente diga "acorda", por exemplo, se isso realmente estiver estabelecido.

Se não estiver:

"O jogador simplesmente aparece no Level 0."

Quero perceber como a história é entendida por alguém jogando sem conhecer o projeto.

==================================================
23. STORYTELLING AMBIENTAL
==================================================

Procure se existem:

- textos nas paredes;
- placas;
- símbolos;
- computadores;
- documentos;
- mensagens;
- sons;
- objetos;
- detalhes de cenário;
- pistas;
- mudanças ambientais.

Liste tudo que transmite história sem UI.

Se praticamente não houver:

diga explicitamente.

==================================================
24. TEXTOS DO JOGO
==================================================

Faça um inventário dos principais textos apresentados ao jogador.

Separe:

MENU
OBJETIVOS
NOTIFICAÇÕES
CELULAR
LEVEL INTRO
GAME OVER
FINAL

Não precisa incluir texto técnico/de debug.

==================================================
25. TELA / INTRO DE CADA LEVEL
==================================================

Explique se há alguma apresentação como:

LEVEL 0
THE LOBBY

ou simplesmente fade.

Liste textos reais.

==================================================
26. FINAL ATUAL
==================================================

Documente exatamente o final.

Depois que o jogador conclui Level 2:

- o que acontece?
- que texto aparece?
- há cutscene?
- portal?
- fade?
- score?
- tempo?
- mensagem narrativa?
- volta ao menu?

Quero saber se existe um FINAL DE HISTÓRIA

ou apenas:

"jogo concluído".

==================================================
27. COERÊNCIA ENTRE OS LEVELS
==================================================

Analise sem inventar soluções ainda.

Responda:

Por que:

Level 0
→ Level 1
→ Level 2

faz sentido atualmente?

Existe conexão narrativa?

Ou apenas progressão mecânica por portal?

Quais elementos conectam as fases?

==================================================
28. COERÊNCIA DOS PUZZLES
==================================================

Para cada puzzle:

LEVEL 0
LEVEL 1
LEVEL 2

diga:

- o que o jogador faz;
- por que faz;
- resultado;
- se existe explicação narrativa.

Classifique:

COERENTE
PARCIALMENTE EXPLICADO
SEM EXPLICAÇÃO NARRATIVA

==================================================
29. COERÊNCIA DOS ITENS
==================================================

Faça o mesmo para:

- radar;
- celular;
- lanterna;
- fusível;
- cartão;
- partes;
- fragmento.

O jogador entende por que esses objetos existem?

==================================================
30. ELEMENTOS SEM EXPLICAÇÃO
==================================================

Faça uma lista objetiva.

Exemplo:

- origem do jogador — não explicada;
- portais — não explicados;
- entidade — não explicada;
- Level 2 — etc.

Use somente lacunas reais.

==================================================
31. ELEMENTOS QUE JÁ FORMAM UM BOM ROTEIRO
==================================================

Liste o que já funciona narrativamente.

Exemplo:

progressão de espaços normais → estranhos

somente se isso realmente estiver presente.

==================================================
32. INCONSISTÊNCIAS
==================================================

Liste qualquer inconsistência entre:

- gameplay;
- objetivo;
- roteiro;
- nomes;
- textos;
- levels;
- items;
- dificuldade;
- ending.

Classifique:

ALTA
MÉDIA
BAIXA.

NÃO corrija.

==================================================
33. ROTEIRO ATUAL VS GAMEPLAY
==================================================

Crie uma tabela:

| Elemento | Gameplay existe? | Narrativa explica? | Jogador entende? |
|---|---|---|---|

Exemplos:

Portal
Entity
Fuse
Generator
Stabilizer
Phone
Radar
Flashlight

Use elementos reais.

==================================================
34. ARCO DE TENSÃO
==================================================

Analise a curva atual:

INÍCIO
↓
LEVEL 0
↓
LEVEL 1
↓
LEVEL 2
↓
FINAL

Para cada, classifique tensão:

BAIXA
MÉDIA
ALTA
MUITO ALTA

E explique por quê baseado em:

- entidade;
- darkness;
- fog;
- puzzles;
- recursos;
- ambiente.

==================================================
35. DURAÇÃO
==================================================

Estime, se possível:

Level 0:
X minutos

Level 1:
X

Level 2:
X

Run inteira:
X

Diga se é estimativa.

==================================================
36. CONTEÚDO ACADÊMICO
==================================================

Como o projeto é para faculdade, faça também um resumo de como o jogo atual atende:

- ambiente 3D;
- exploração;
- pelo menos três interações;
- três desafios;
- pontuação;
- objetivo claro;
- conclusão;
- resultado;
- múltiplos níveis.

Não invente requisitos que não estejam representados no projeto.

==================================================
37. RESUMO EXECUTIVO DO ROTEIRO
==================================================

No final escreva:

ROTEIRO ATUAL EM 1 PARÁGRAFO

Depois:

GAMEPLAY ATUAL EM 1 PARÁGRAFO

Depois:

PRINCIPAL PROBLEMA NARRATIVO ATUAL

Depois:

PRINCIPAL FORÇA DO JOGO ATUAL

Não proponha uma reescrita ainda.

==================================================
38. ESTADO DOS SISTEMAS
==================================================

Tabela:

| Sistema | Estado | Papel no jogo |
|---|---|---|

Inclua:

Level 0
Level 1
Level 2
Objectives
Puzzles
Portal
Entity
Difficulty
Phone
Radar
Flashlight
Score
Game Over
Ending
Narrative
Environmental Storytelling

Estados:

COMPLETO
FUNCIONAL
PARCIAL
PLACEHOLDER
AUSENTE
INCONSISTENTE

==================================================
39. O QUE ESTÁ EXPLICITAMENTE NO JOGO VS INFERÊNCIA
==================================================

Muito importante.

Ao final separe:

EXPLÍCITO NO JOGO

e:

PODE SER INFERIDO, MAS NÃO É EXPLICADO

Não transforme inferência em fato.

==================================================
40. NÃO SUGERIR NOVO ROTEIRO AINDA
==================================================

NÃO crie lore.
NÃO crie personagens.
NÃO dê nome ao monstro.
NÃO invente organização.
NÃO invente motivo para os portais.
NÃO invente cutscene.

Primeiro quero descobrir exatamente qual história temos.

Depois outra IA vai usar esse relatório para desenvolver o roteiro.

==================================================
41. FORMATO PARA OUTRA IA
==================================================

Sempre que relevante cite:

ARQUIVO:
src/...

CLASSE:
...

MÉTODO:
...

LINHAS:
aproximadas

Outra IA precisa conseguir entender o jogo SEM acesso ao código.

==================================================
42. MARCADORES
==================================================

Comece o relatório exatamente com:

=== INÍCIO DO SNAPSHOT DE GAME DESIGN E ROTEIRO DO THRESHOLD ===

E termine exatamente com:

=== FIM DO SNAPSHOT DE GAME DESIGN E ROTEIRO DO THRESHOLD ===

Não coloque nada depois do marcador final.

Pode iniciar a auditoria. 

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: read**

---

## Assistant

**Tool: task**

---

## Assistant

**Tool: task**

---

## Assistant

=== INÍCIO DO SNAPSHOT DE GAME DESIGN E ROTEIRO DO THRESHOLD ===
# AUDITORIA ATUALIZADA DE GAME DESIGN, ROTEIRO E PROGRESSÃO — THRESHOLD

> Fonte única: código atual em `threshold` (branch `main` 02/09/2026). Relatórios antigos ignorados. Se divergência, vale `src/*:linha`.

---

### 1. RESUMO DO JOGO ATUAL

- **Nome completo:** `THRESHOLD — A LIMINAL ESCAPE` `src/core/Config.js:3-4` `index.html:6`
- **Gênero:** Horror/Exploração em primeira pessoa, puzzle-escape (Backrooms)
- **Perspectiva:** 1ª pessoa `Player.js` + `PlayerController.js:15` `mouseSensitivity 0.0022`
- **Estilo visual:** Retro PS1 `src/rendering/RetroRenderer.js` + `src/rendering/RetroMaterial.js:212` — `internalResolutionHeight 240` `src/core/Config.js:83` `pixelatedUpscale` `textureResolution 128` `src/world/Textures.js:9` `NearestFilter` `flatShading` `vertexSnapping` `affineMapping` `dithering` `colorQuantization 6bits` `fogNear 12 fogFar 62`
- **Ambientação:** Três labirintos `19x15` `cellSize 3.5 wallHeight 3` `src/core/Config.js:5` com carpete amarelo / concreto / metal `src/world/Level0.js:42` `Level1.js:90` `Level2.js` `footstepSurface`
- **Premissa jogável:** Sair das Backrooms atravessando portais que só abrem após resolver puzzles de cada nível.
- **Objetivo principal:** Restaurar/estabilizar anomalias para liberar portal e escapar.
- **Fases:** 3 `CONFIG.levels.count 3` `src/core/Config.js:174` nomes `CHÃO 0/1/2` `src/core/Config.js:176`
- **Progressão:** Linear `LevelManager.js:4` `LEVEL_CLASSES=[Level0,Level1,Level2]` `load(index)` `unload()` — `Level0 → Portal → Level1 → Portal → Level2 → Final` `src/core/Game.js:424`
- **Ameaça:** 1 entidade `BackroomsEntity.js` `/EntityManager.js:13` (max 1 mesmo com `entityCount 1`) com estados `IDLE_HIDDEN/OBSERVING/STALKING/CHASING` `src/entities/BackroomsEntity.js:7`
- **Vitória:** Atravessar portal do `CHÃO 2` `src/core/Game.js:515` `completePortalRun` → `MISSÃO CONCLUÍDA` `index.html:187` + score/tempo `src/ui/EndScreen.js:38`
- **Derrota:** `caughtPlayer true` quando distância `<0.75` (`CHASING/STALKING`) `BackroomsEntity.js:497` → `Game.gameOver()` `src/core/Game.js:545` → `VOCÊ FOI CAPTURADO` `index.html:202` com `static` e opções `TENTAR NOVAMENTE/MENU`

Jogo acadêmico ADS SENAC `README.md:7` sem cutscene ou diálogo de história — loop é explorar → coletar → inserir/ativar → portal.

---

### 2. PREMISSA / ROTEIRO ATUAL

Varredura: `index.html` `src/core/Game.js` `src/world/*` `src/ui/NokiaPhone.js` `src/core/Config.js` `src/entities/*` — **nenhum arquivo contém lore externa, organização, experimento, origem da entidade ou dos portais.**

1. **Quem é o jogador?** Nome digitado livremente `index.html:40` `Digite seu nome` `src/core/GameState.js:11` `playerName`. Não tem classe, profissão, passado.
2. **O jogo explica quem ele é?** **NÃO EXPLICADO ATUALMENTE.** Só armazena nome para `end-screen` `src/ui/EndScreen.js:30`.
3. **Como chegou às Backrooms?** **NÃO EXPLICADO ATUALMENTE.** Spawn direto `Level0.js:60` `findCell('S')` sem animação de queda/noclip.
4. **O jogo explica isso?** Não. Nenhum texto de intro `src/ui/EndScreen.js:13` só `LEVEL 1 / COMING SOON`.
5. **O jogador sabe onde está?** Sabe que são `CHÃO 0/1/2` `src/core/Game.js:248` e que HUD diz `Encontrar fusível/cartão` `src/ui/HUD.js:31`. Não há explicação de Backrooms no jogo.
6. **Existe organização/laboratório/experimento?** **NÃO EXPLICADO ATUALMENTE.** Nenhuma string `laboratório/organização`.
7. **Explicação para portais?** **NÃO EXPLICADO ATUALMENTE.** Mecânica: shader `Portal.js:4` `uTime/uColor/uIntensity` e `PointLight` — zero lore `portal:unlocked` `src/core/Game.js:257` só `ANOMALIA ESTABILIZADA` `src/core/Game.js:260`.
8. **Explicação para entidade?** **NÃO EXPLICADO ATUALMENTE.** `CONFIG.entities` `src/core/Config.js:48` só valores numéricos. `BackroomsEntity.js` sem nome, sem texto.
9. **Explicação para níveis?** **NÃO EXPLICADO ATUALMENTE.** Só troca de paleta/textura `createWall/Carpet/CeilingTexture` `src/world/Textures.js` e mapas ASCII `MapData.js:1` `Level1.js:15` `Level2.js:15`.
10. **Objetivo narrativo maior além de escapar?** Não. `Objetivos` são mecânicos: `fuse/keycard/power` `src/core/Game.js:240` `partA/partB/generator` `src/world/Level1.js:95` `fragment/stabilize` `src/world/Level2.js:99`. Final é `escape:250` `src/core/Config.js:45` sem motivação ficcional.

---

### 3. INTRODUÇÃO DO JOGO

```
ABRE O JOGO → #loading CARREGANDO / INITIALIZING ENVIRONMENT... index.html:19 → #main-menu THRESHOLD / A LIMINAL ESCAPE index.html:25 → [INICIAR] index.html:28 → #name-modal Digite seu nome + input maxlength20 index.html:40 → [ENTRAR] → #difficulty-modal SELECIONE A DIFICULDADE index.html:55 [FÁCIL/NORMAL/DIFÍCIL desc index.html:59/63/67] → fade → Level0 spawn → HUD
```

- **Textos mostrados:** `THRESHOLD` `A LIMINAL ESCAPE` `ADS SENAC JOINVILLE Profª Claudia Werlich Equipe: [preencher posteriormente]` `index.html:32` — sem intro narrativa.
- **Instruções:** Modal `MOVIMENTAÇÃO WASD MOVER MOUSE OLHAR SHIFT CORRER E INTERAGIR F LANTERNA Q CELULAR ESC liberar cursor` `index.html:76`
- **Áudio:** `AudioManager.loadSounds(AudioManifest)` `src/core/Game.js:171` + `audio.init/resume sfx('ui')` no clique `src/ui/MainMenu.js` — sem música/cutscene.
- **Transição:** `UIManager.fadeIn(700)/fadeOut(500)` `src/ui/UIManager.js:25` + `EndScreen.showLevelIntro({title: nextName},2000)` `src/core/Game.js:443` onde `nextName=CONFIG.levels.names[index]` `CHÃO 0`
- **Spawn CHÃO 0:** `Level0.js:60` `grid MAP.findCell('S') col1 row1 MapData.js:3 '#S.......#..R....W#'` `cellToWorld` `height 1.7` `src/core/Config.js:11` olhando `yaw 0`. Vê paredes `wallTexture #c9b56a` `src/world/Textures.js:88` e luminárias `Box 1.4x0.06x0.5` `src/world/Level0.js:135`.
- **Primeiro objetivo:** `ObjectiveManager.setObjectives([{id:'fuse',title:'Encontrar fusível'},{id:'keycard'},{id:'power'}])` falso fallback `HUD.js:31` ou real do Level `src/core/Game.js:238` → lista HUD `OBJETIVO` `index.html:98` com `[ ] Encontrar fusível` `src/ui/HUD.js:79` + legenda fácil `Encontre FUSÍVEL brilho amarelo` `src/ui/HUD.js:36` + anéis verdes `RingGeometry 0.35/0.45` `src/world/Level0.js:752`

**Conclusão:** **Não existe introdução narrativa.** Jogador simplesmente aparece no Level 0 após escolher dificuldade/nome.

---

### 4. ESTRUTURA COMPLETA DA CAMPANHA

```
CHÃO 0 src/world/Level0.js / MapData.js → PORTAL O(17,13) → CHÃO 1 src/world/Level1.js → PORTAL O(2,13) → CHÃO 2 src/world/Level2.js → PORTAL O(3,7) → FINAL src/core/Game.js:515 completePortalRun
```

**Transição CHÃO 0 → 1**
- Libera: `GameState.completeObjective('power')` via `FuseBox.restorePower()` `src/interactions/FuseBox.js:87` → `ObjectiveManager.complete('power')` `src/systems/ObjectiveManager.js:36` → se `levelObjectiveIds=[fuse,keycard,power]` todos `true` → `unlockPortal()` `src/core/GameState.js:28` emit `portal:unlocked` → `level.portal.unlock()` `src/interactions/Portal.js:196` `unlockProgress 0→1 em 1.6s` `src/interactions/Portal.js:214` + `Lighting.setPowerRestored(1.35)` `src/core/Game.js:259` + `notify ANOMALIA ESTABILIZADA PORTAL DISPONÍVEL` `src/core/Game.js:260` `sfx portal` + `playPositional portalHum` pos `world.x+half-0.175`
- Ação: jogador anda distância XZ `<1.3` `Portal.js:245` estando `unlocked` → `Level0.update: portal.update() → onPortalEnter()` `src/world/Level0.js:359` → `Game.handlePortalEnter()` `src/core/Game.js:424` se `levelIndex <2` → `advanceLevel()` `GameState.js:38` `portalUnlocked false emit portal:locked` → `UIManager.fadeIn 700` `src/core/Game.js:438` → `LevelManager.unload/load(next)` `src/world/LevelManager.js:18` → `audio.stopAll/setReverb/startAmbient` → `fadeOut 500` → `EndScreen.showLevelIntro({title: CHÃO 1},2000)` → `requestPointerLock`
- Mensagem: só `ANOMALIA ESTABILIZADA` — sem explicação narrativa, transição puramente mecânica.

**CHÃO 1 → 2 e CHÃO 2 → FINAL** idêntico, trocando IDs:
- CHÃO 1 libera: `hasItem partA && partB` no `Generator` `src/world/Level1.js:54` → `completeObjective('generator')` → desbloqueia mesmo `portal:unlocked`
- CHÃO 2 libera: `hasItem fragment` no `Stabilizer` `src/world/Level2.js:64` → `completeObjective('stabilize')`
- FINAL CHÃO 2: `handlePortalEnter` detecta `levelIndex >=2` → `completePortalRun` → `award('escape')250` `src/core/Game.js:522` → `fadeIn 900` `hud.hide()` `fadeOut 500` → `EndScreen.showLevelIntro 2200` (default `LEVEL 1/COMING SOON` bug quando sem título `src/core/Game.js:529`) → `EndScreen.show({playerName,score,duration})` `MISSÃO CONCLUÍDA Jogador: Pontuação: Tempo: MM:SS` `index.html:187` `src/ui/EndScreen.js:38` → `repository.saveResult()` `src/systems/GameRepository.js`. Não há boss/cutscene — só portal final.

---

### 5. LEVEL 0

**Identidade** `src/world/Level0.js:42` `Level0 extends Level` `src/world/Level.js:4`
- Nome: `CHÃO 0` `src/core/Config.js:176`
- Aparência: `wallTexture #c9b56a` faixas `#b39a52` `src/world/Textures.js:88` `carpetTexture #7d6f45` `src/world/Textures.js:111` `ceilingTexture #d6d0b8` grid `src/world/Textures.js:135` — Backrooms clássico amarelo.
- Layout: `19x15` `MapData.js:1` — labirinto com sala fusível `(3-6,3-5)` e sala painel `(12-15,3-5)` + corredor sul com porta `D(14,13)` e portal `O(17,13)` `MapData.js:15`
- Clima: `Fog(0x000000)` `src/core/Game.js:80` `fogByDifficulty easy 12/34 normal 11/32 hard 6/18` `src/core/Config.js:101` + `ambient 0xfff2cc 1.0` `hemisphere 0xfff4d6/0x5a5238 0.85` `src/world/Lighting.js:83` + `8 PointLight 3.2/26/1.2` `src/world/Lighting.js:93` flicker índices `[2,6]` `MapData.js:20`
- Sons: `flicker` `distant` 15/35/65% chance `src/world/Level0.js:834` `playDistant` + `footstep carpet` `src/audio/AudioManifest.js:3` + `AudioManager footstepGroups` + `entity breath/growl` se perseguição `src/core/Game.js:796`

**Spawn** `Level0.js:60`: `S col1 row1` `MapData.js:3` — corredor norte, visão de parede amarela, guia anéis verdes `src/world/Level0.js:751` `Ring 0x88cc44 opacity 0.35` + minimapa `src/ui/Minimap.js` se fácil.

**Objetivo principal em 1 frase:** Encontrar fusível e cartão, restaurar energia no painel e escapar pelo portal.

**Objetivos EM ORDEM LÓGICA código-real** (`GameState.levelObjectiveIds` `src/core/GameState.js:33` via `ObjectiveManager.setObjectives` `src/systems/ObjectiveManager.js:3`):

| # | OBJETIVO | TRIGGER | ITEM | LOCAL | FEEDBACK | PONTOS `Config.js:31` | DESBLOQUEIA |
|---|---|---|---|---|---|---|---|
|1| `fuse` `Encontrar fusível` `HUD.js:31` | `PickupItem.interact` `src/interactions/PickupItem.js:4` quando `raycast far 2.5*mult` `InteractionSystem.js:42` e `E` `Game.js:113` | `fuse` mesh `Cylinder 0.075x0.26` `src/world/Level0.js:515` cor `dedede emissive 332200` + filamento `ffee88` `halo Octahedron 0.34 opacity 0.28` | `F(4,4)` `MapData.js:6` `worldToCell` `src/world/Level.js:19` `y0.9 baseY` | `notify FUSÍVEL COLETADO` `Game.js:29` `sfx pickup` `HUD [x]` `phone page CONCLUIDO` `NokiaPhone.js:265` | 100 | `FuseBox.refreshState()` `src/interactions/FuseBox.js:42` muda `NO_FUSE→FUSE_READY` |
|2| `keycard` `Encontrar cartão` | idem | `keycard` `Box 0.28x0.035x0.42` `src/world/Level0.js:562` `ffd23a` | `K(15,9)` `MapData.js:11` | `CARTÃO ENCONTRADO` `Game.js:30` 100 | Permite `Door.interact()` `src/interactions/Door.js:55` `hasItem keycard` |
|3| Inserir fusível (sub-etapa de `power`) | `FuseBox.interact()` estado `FUSE_READY` `src/interactions/FuseBox.js:53` | exige `hasItem fuse` | `P(13,4)` painel `Group Box 1.3x1.7x0.28` `src/world/Level0.js:603` parede norte `z=world.z-1.5*cell+0.12` indicator `Sphere 0x881111` | `FUSÍVEL INSTALADO` `FuseBox.js:67` `indicator 0xccaa22` `sfx switch` | 0 (já contou fuse) | Muda `FUSE_INSTALLED` |
|4| `power` `Restaurar energia` `HUD.js:33` | `FuseBox.interact()` `FUSE_INSTALLED` `src/interactions/FuseBox.js:56` | — | mesmo `P` `switch Box 0.06x0.12x0.04` `0xdd4422` `src/world/Level0.js:647` + `PointLight 0xffe9b0 1.9/11/1.4` `Level0.js:663` | `ENERGIA RESTAURADA` `FuseBox.js:85` `indicator 0x33ff55 emissive 1.5` `sfx power` `bus ambient 0.3→1` `Game.js:201` + `completeObjective power` → `unlockPortal` `GameState.js:28` `score +200` | 200 | `portalUnlocked true` `panelLight` `portal.unlock()` `Door` ainda trancada |
|5| Abrir porta | `Door.interact()` `src/interactions/Door.js:47` precisa `keycard` segundo `E` (1º insere, 2º abre) `Door.js:60` `reader Mat 0x1a1815 emissive 880000→00ff00` | `keycard` | `D(14,13)` `MapData.js:15` pivot `Group` `panel 0.12x2.65x cell*0.95 0x5a5245` `src/world/Level0.js:685` `isBlockingCell` `src/interactions/Door.js:95` | `PORTA ABERTA`? Código `Door.js` notifica `ACESSO NEGADO sfx denied` se sem cartão, `Door.open animation rotation` `Door.js:72` `onDoorOpened emit door:opened` `Game.js:203` | 0 (card já 100) | Acesso corredor portal |
|6| Atravessar portal | `Portal.update(cameraPos) <1.3 && unlocked` `src/interactions/Portal.js:245` + `E` não precisa, só proximidade | `power` completo | `O(17,13)` `Portal Circle 1.4/frame Torus 1.45` `Portal.js:123` partículas `64 Points` | `ANOMALIA ESTABILIZADA` já ocorrido, entrar chama `handlePortalEnter` `Game.js:424` `fade` | 0 (escape só no final) | `LevelManager.load(1)` |

**Itens** (todos `PickupItem` `src/interactions/PickupItem.js` `spin+float` `halo`):
- `fuse` `Level0.js:374` `0.26m cilindro` `prompt [E] Pegar fusível`
- `keycard` `Level0.js:389` `0.42m cartão` `[E] Pegar cartão`
- Support por dificuldade `Level0.js:406` `SUPPORT_ITEM_CELLS MapData.js:27` `radar 12,1 0x44ffaa` `phone 1,13 0x66ccff` `flashlight 17,1 0xffdd66` — hard tem `flashlight+phone` `Config.js:154` easy tem `radar?` não, easy tem `hasRadarRequirement false` então `Level0.js:407` só `normal` ganha `radar+phone` `hard flashlight+phone`

**Interações:** `FuseBox` 3 estados, `Door` 2 passos, `Portal` proximidade, `PickupItem` `E`.

**Entidade papel L0:** Presente sempre que `hasEntities true` `Config.js:125` — todos difíceis `true`. Modo `stalker/timid/aggressive` `Config.js:129/146/163` ver §15.

**Narrativa L0:** Comunica só `Backrooms clássico` — paredes amarelas, carpete, fluorescentes, sem texto de parede `src/world/Level0.js:254` `buildWallDetails` só `outlets/pipes` `Box 0.15x0.1` `Cylinder 0.04` sem lore. Zero explicação.

**Final:** Walk sobre `CircleGeometry 1.4` iluminado `1.75 intensity` `Portal.js:218` → fade.

---

### 6. LEVEL 1

**Identidade** `src/world/Level1.js:41` `Generator extends Interactable`
- Nome `CHÃO 1` `Config.js:176`
- Aparência: paredes `0x8f8f8f`? Código `Level1.js` usa `createWallTexture(1,1)` igual L0 mas `floor 0x6a6a6a` `ceiling 0x9a9a9a` `footstepSurface concrete` `Level1.js:90` — cinza industrial
- Layout `19x15` ver MAP §4 extração — vazado, 2 salas `A(3,4)` `B(10,4)` e gerador `G(11,11)` portal `O(2,13)` `Level1.js:15`
- Iluminação `9 PointLight` `Level1.js:33` flicker `1,5,8` `Level1.js:39` fog `11/32 normal 6/18 hard` `Config.js:101`

**Spawn** `Level1.js:106` `S 1,1` canto NW, visão corredor longo, sem anéis guia (L1 não tem `hasGuide`).

**Objetivo principal:** Coletar duas peças e ativar gerador para abrir portal.

**Etapas código-real** `Level1.js:95`:

| # | OBJ | TRIGGER | LOCAL | FEEDBACK | PTS | DESBLOQUEIA |
|---|---|---|---|---|---|---|
|1| `partA` `Encontrar PECA A` | `PickupItem [E] Pegar peça A` `Level1.js:286` `Octahedron core 0xff5a3c` `halo 0.35` | `A 3,4` | `PECA A ENCONTRADA` `Game.js:31` `100` | Acesso gerador |
|2| `partB` `Encontrar PECA B` | idem `0x3c8aff` | `B 10,4` | `PECA B ENCONTRADA` `100` | idem |
|3| `generator` `Ativar GERADOR` | `Generator.interact()` `Level1.js:54` `if !hasItem partA/B → notify FALTAM AS PEÇAS sfx denied` else `activated true active false completeObjective generator` | `G 11,11` `base 1.6x0.5x1 drum Cylinder indicator Sphere 881111` | `GERADOR ATIVADO` `Level1.js:69` `indicator emissive pulse 0.8+` `sfx power` `score 200` → `unlockPortal` | 200 | Portal |

**Entidade:** Mesmo modo por dificuldade, `updateAmbientEvents` vazio `Level1.js:271` — sem `flickerNearby` do L0, menos tensão.

**Narrativa:** Zero justificativa textual para gerador. Título `Ativar GERADOR` só mecânico. Sem por que peças espalhadas.

**Final:** Mesmo portal que L0 `Level1.js:236` → `CHÃO 2`.

**POR QUE PUZZLE?** **SEM EXPLICAÇÃO NARRATIVA** — condição `hasItem` `Level1.js:55` puramente gameplay para gatear portal. Código não expõe lore.

---

### 7. LEVEL 2

**Identidade** `src/world/Level2.js:41` `Stabilizer extends Interactable`
- Nome `CHÃO 2` `Config.js:176`
- Aparência: `footstepSurface metal` `Level2.js` `walls #6a5a6a floor #5a4a5a ceiling #6a5a6a` tonalidade roxa/metal `Level2.js:120` — mais escuro/nobreak
- Layout `19x15` MAP `Level2.js:15` fragmento `R 3,3` stabilizer `Y 13,11` portal `O 3,7` spawn `S 9,2` `Level2.js:15`
- Iluminação `8 PointLight` `Level2.js:33` flicker `1,3,6`

**Objetivo** `Level2.js:99`: `fragment Coletar FRAGMENTO` + `stabilize Estabilizar DISPOSITIVO`

| # | OBJ | TRIGGER | LOCAL | FEEDBACK | PTS | DESBLOQUEIA |
|---|---|---|---|---|---|---|
|1| `fragment` | `PickupItem [E] Coletar fragmento` `Level2.js:298` `Tetrahedron 0xd8a0ff` | `R 3,3` | `FRAGMENTO COLETADO` `Game.js:33` `150` | Stabilizer |
|2| `stabilize` `Estabilizar DISPOSITIVO` | `Stabilizer.interact()` `Level2.js:64` `if !hasItem fragment → O DISPOSITIVO PRECISA DO FRAGMENTO sfx denied` else `stabilized true completeObjective stabilize` | `Y 13,11` `base Cylinder 0.5/0.6/0.35 pillar 1.4 gem Octahedron 0x8a5aff emissive 0x6a3aff` | `DISPOSITIVO ESTABILIZADO` `Level2.js:71` `indicator 0x5a2a5a pulse` `score 200` → `unlockPortal` | 200 | Portal final → Final |

**POR QUE STABILIZER EXISTE?** Código diz `class Stabilizer` `Level2.js:41` com `indicatorMaterial` `gem` e `onStabilized noop` `Level2.js:381`. Nenhum comentário lore, nenhuma mensagem além de `DISPOSITIVO ESTABILIZADO`. **NÃO EXPLICADO ATUALMENTE** se é anomalia, reator, portal anchor. Jogador só vê `DISPOSITIVO — precisa do fragmento` `Level2.js:58` `[E] Estabilizar`. Puramente nome de classe/objetivo.

---

### 8. OBJETIVOS DE TODOS OS NÍVEIS

| Level | Objetivo principal | Subobjetivos | Item-chave | Puzzle | Saída |
|---|---|---|---|---|---|
| `CHÃO 0` `Level0.js` | Restaurar energia | `fuse` encontrar fusível `keycard` encontrar cartão `power` restaurar energia | `fusível cilíndrico F(4,4)` `cartão K(15,9)` | `NO_FUSE→FUSE_READY(have fuse)→FUSE_INSTALLED→POWER_RESTORED` `FuseBox.js:4` + `Door 2x E` | `Portal O(17,13)` após `power` |
| `CHÃO 1` `Level1.js:95` | Ativar gerador | `partA` `partB` `generator` | `PECA A/B` | `Generator hasItem partA&&B` `Level1.js:54` | `Portal O(2,13)` |
| `CHÃO 2` `Level2.js:99` | Estabilizar dispositivo | `fragment` `stabilize` | `FRAGMENTO R` | `Stabilizer hasItem fragment` `Level2.js:64` | `Portal O(3,7)` → `completePortalRun` `escape` |

---

### 9. OBJECTIVE MANAGER / GAME STATE

`GameState.js:11` `reset() objectives={fuse:false,keycard:false,power:false} inventory={fuse:false,keycard:false,radar:false,phone:false,flashlight:false} scoredActions Set portalUnlocked false currentLevelIndex 0 levelObjectiveIds []`

- `completeObjective(id)` `GameState.js:17` `if(objectives[id]) return false` (bug: `partA` undefined → passa) `objectives[id]=true emit objective:completed → if levelObjectiveIds.includes(id) && allComplete→unlockPortal()` `setLevelObjectives(ids)` `GameState.js:29` `allObjectivesComplete()` `GameState.js:32` `levelObjectiveIds.every true`
- `collectItem(item)` `GameState.js:42` mesmo `undefined→true` `emit inventory:changed`
- `hasItem` `GameState.js:44` `inventory[item]`
- `addScore` `GameState.js:46` idempotente `scoredActions`
- `ObjectiveManager.js:3` `setObjectives(list)` `completed false completedCount 0 setLevelObjectives emit hud:updateObjectives` `markCompleted(id)` `emit hud:updateObjectives` `complete(id)` chama `gameState.completeObjective + addScore CONFIG.scoring[id]??0` `Game.js:107` também `scoreManager.award` via `eventBus`
- **IDs reais:** `fuse,keycard,power,partA,partB,generator,fragment,stabilize,radar,phone,flashlight,portal,escape,part` `Config.js:31` lista completa em `scoring` mas `fuse/keycard/power` únicos no reset. `partA/partB/generator/fragment/stabilize` são dinâmicos.

---

### 10. PONTUAÇÃO

`CONFIG.scoring` `src/core/Config.js:31` + `ScoreManager.js:8` `award` + `GameState.js:46` idempotente:

| ID | Valor | Level | Trigger |
|---|---|---|---|
| `fuse` | 100 | 0 | `handlePickup fuse` `Game.js:303` |
| `keycard` | 100 | 0 | idem |
| `power` | 200 | 0 | `FuseBox.restorePower completeObjective power` `FuseBox.js:87` via `ObjectiveManager.complete` + `eventBus` |
| `radar` | 150 | 0/1 `SUPPORT_ITEM_CELLS` | `PickupItem radar` |
| `phone` | 150 | 0/1/2 | idem |
| `flashlight` | 250 | hard | idem |
| `partA` | 100 | 1 | `PickupItem` |
| `partB` | 100 | 1 | |
| `generator` | 200 | 1 | `Generator.interact completeObjective` `Level1.js:69` |
| `fragment` | 150 | 2 | `PickupItem` |
| `stabilize` | 200 | 2 | `Stabilizer.interact` `Level2.js:71` |
| `portal` | 100 | — | **NUNCA AWARD no código atual** (definição existe mas `handlePortalEnter` não chama `award`) |
| `escape` | 250 | final | `completePortalRun award escape` `Game.js:522` |
| `part` | 100 | — | legacy não usado |

**Morte:** não perde pontos, `GameOver` `src/core/Game.js:545` só `sfx denied` `staticEffect.start()` `GameState state GAMEOVER`

**Máximo teórico** coletando tudo numa run `normal` (radar+phone + todos objetivos + escape, sem flashlight, sem portal): `100+100+200+150+150+100+100+200+150+200+250 = 1700`. Se `hard` com flashlight `150→250` troca radar por flashlight: `1650` + extras se pegar ambos? Inventário permite ambos mas spawn difere `Level0.js:406` hard `flashlight+phone` 250+150. Máximo absoluto (pegar tudo debug) `150+150+250+100+100+200+100+100+200+150+200+250 = 1950` (+ portal se implementado 2050). Sem `part` extra.

---

### 11. DIFICULDADES COMO GAME DESIGN

**FÁCIL** `Config.js:120` `hasGuide true hasMinimap true hasEntities true enemyMode stalker darkness1.0 interactionDistanceMult1.5 flicker0.5 ambient0.15 fog12/34 guidePulse2.0`
- Recursos: `SUPPORT_ITEM_CELLS` não obrigatório `hasRadarRequirement false hasFlashlightRequirement false` `Level0.js:407` só guia/minimapa `Level0.js:64` `Minimap.js` + anéis `Level0.js:752`
- Entidade: `observeRangeEasy 7*3.5=24.5` `speed walk2.2 stalk3.0 chase5.5` `observeDelay stalker0.4` `loseTime 3.52` `BackroomsEntity.js:321/327` — `IDLE_HIDDEN wander 0.45*speed` → `OBSERVING 0.9s → STALKING` mantém `3-6m` `vanish se <1.1` `BackroomsEntity.js:528` **nunca `caughtPlayer`** `mode !== stalker` checa `BackroomsEntity.js:497` — experiência: vê silhueta ao longe, segue, some, susto sem morte.
- Fog generoso `12/34 +6 com lanterna=false` `Game.js:715` `bonus 6` mas sem lanterna — visão limpa
- Punição: quase zero, chance morte **0%** fácil

**NORMAL** `Config.js:137` `hasGuide false hasMinimap false hasRadarRequirement true hasPhoneRequirement true enemyMode timid darkness1 interaction1.0 flicker1.0 ambient0.35 fog11/32`
- Recursos: exige `radar` `phone` `Level0.js:407` `R 12,1` `C 1,13` `MapData.js:27` — sem isso minimapa bloqueado `HUD.js:206` `radarEnabled && easy` — navegação só memória + celular
- Entidade `timid` `observeRange 9*3.5=31.5` `delay 0.35` `lose 3.2` — `OBSERVING captures se <1.0` `BackroomsEntity.js:497` → `STALKING→CHASING se <10.5` `BackroomsEntity.js:510` → `CHASING capture <0.75` `BackroomsEntity.js:556` — persegue tarde, dá chance fugir `VANISH 0.7s GONE 7-13s` `BackroomsEntity.js:592`
- Fog `11/32 +10` `Game.js:715` visão média — sem lanterna, depende de luzes fixas
- Experiência: tensão média, precisa explorar labirinto sem mapa, sustos com perseguição possível mas escapável.

**DIFÍCIL** `Config.js:154` `hasPhoneRequirement false hasFlashlightRequirement true enemyMode aggressive darkness1 interaction0.8 flicker1.8 ambient0.65 fog6/18 guide0`
- Recursos: `flashlight+phone` `Level0.js:412` `FL 17,1` `phone 1,13` — sem radar, sem guia/minimapa nunca.
- Entidade `aggressive` `range 11*3.5=38.5` `delay0.12` `lose2.72` — `OBSERVING 0.12s → CHASING imediato` `BackroomsEntity.js:513` independente de distância — perseguição rápida `chase5.5` `stalk3.0` sempre, `flicker 1.8` + `ambientEvent 0.65/s` `Level0.js:802` + `closeDistantDoor/moveObject` — muito susto
- Fog `6/18 +16 com lanterna ON` `Game.js:715` — sem lanterna só 6m, com `F` toggle `Flashlight.js` `Spot 38/40 0.62` `src/player/Flashlight.js` estende `far+16 near+2.5` `Game.js:716` mas pisca e consome visão; `Q/F` mutuamente exclusivos `Game.js:338` `togglePhone desliga lanterna` `toggleFlashlight fecha celular`
- Experiência: navegação cega, interação curta `0.8*2.5=2.0m`, perseguição letal frequente, recurso luz como risco/recompensa.

**Três experiências diferentes?** Sim mecanicamente `stalker nunca mata vs timid tardio vs aggressive imediato` + `fog 34→32→18` + `guia/minimapa vs nada` produzem curvas distintas, mas **todos mantêm mesmo mapa/puzzle** e `entityCount 1` `EntityManager.js:13` cap 1 anula variação de quantidade — diferença é valores e `hasGuide/Minimap`, não conteúdo.

---

### 12. CELULAR

- **Dificuldades:** `normal` exige `hasPhoneRequirement true` `Config.js:144` mas fisicamente spawna `normal flashlight? não Level0.js:407 normal radar+phone` `hard flashlight+phone` `Level0.js:412` `easy` não spawna `(hasGuide true)` mas `phone` em `C 1,13` pode existir como extra? Código `Level0.js:406 if difficulty normal → radar+phone hard→flashlight+phone` easy adiciona nenhum — celular ausente fácil.
- **Onde:** `Level0 C 1,13` `SUPPORT_ITEM_CELLS.phone` `MapData.js:29` na parede sul corredor `Level0.js:422` `PickupItem Box 0.28x0.08x0.18 placeholder` → `FBX /models/nokia/Nokia.fbx` `nokia-3310.jpg` `Level0.js:450` escala `target 0.20` `halo Octahedron 0.34 opacity0.28`
- **Por que pegar:** Desbloqueia `HUD phone` `Game.js:317` `hud.setPhoneEnabled true` + `NokiaPhone.setEnabled true` + `addMessage SINAL VINCULADO` `Game.js:319` + `CELULAR [Q] PARA ABRIR` `Game.js:321` + pontos `150` `Config.js:37` + mensagens periódicas `Game.js:687` `phoneTimer >18s → sendPhoneMessage` `src/ui/NokiaPhone.js:248` `whisper sfx`
- **Como usar:** `Q` toggle `Game.js:123` `Game.togglePhone()` `src/core/Game.js:330` se `!hasItem phone → CELULAR NÃO ENCONTRADO` `isOpen? close:open` `open()` `NokiaPhone.js:182` `loadHudModel FBX` `hudGroup add camera` `position 0.28,-0.24,-0.46 rotation -0.18,0.18,-0.06` `close()` remove. Quando aberto `exitPointerLock` `Game.js:343` `clearActions` `Arrows navigate` `Q fecha` `F lanterna fecha celular` `Game.js:361`
- **O que mostra:** `NokiaPhone.rebuildPages()` `NokiaPhone.js:256` pages: `1 OBJETIVOS done/total < usar > para navegar` + cada objetivo `[x]/[ ] TITLE CONCLUIDO/PENDENTE` + `SEM MENSAGENS AGUARDE TRANSMISSAO` ou cada `message text` + `DICA: Q FECHA F LANTERNA BOA SORTE` `NokiaPhone.js:274` + footer `1/4` `NokiaPhone.js:342` + LCD `Canvas 384x256 #62a333 scanlines` `NokiaPhone.js:295` + relógio `HH:MM` `NokiaPhone.js:359`
- **Mensagens reais** `PHONE_MESSAGES` `src/core/Game.js:38`:
  1. `SINAL FRACO...`
  2. `ANOMALIA PRÓXIMA.`
  3. `ELAS OBSERVAM PELAS SOMBRAS.`
  4. `NÃO CORRA SEM SABER PARA ONDE.`
  5. `O CHÃO SE REPETE. VOCÊ JÁ PASSOU AQUI.`
  6. `CONTINUE PELO PORTAL. ELE É A ÚNICA SAÍDA.`
  + `SINAL VINCULADO. TRANSMISSÕES RECEBIDAS.` `Game.js:319`
- **Frequência:** `18s` `Game.js:690` + `whisper` `AudioManager` — dicas atmosféricas, não navegação; não alerta entidade diretamente exceto `ANOMALIA PRÓXIMA / ELAS OBSERVAM` genérico.
- **Narrativa:** Mensagens são ambiente vago, não contam história contínua, sem remetente — parecem sistema.

---

### 13. RADAR

- **Dificuldade:** `normal` `hasRadarRequirement true` `Config.js:143` — `Level0.js:409` `radar 12,1 col12 row1` `MapData.js:27` `Box 0.28x0.1x0.2 mat 0x44ffaa emissive` `halo 0.3 opacity` `Level0.js:503` `[E] Pegar radar` `prompt`
- **O que desbloqueia:** `Game.handleItemPickup radar → hud.setRadarEnabled true` `Game.js:315` — **não é radar ativo**, só libera `HUD minimapa`? Ver: `HUD.updateMinimap` `src/ui/HUD.js:206` `if !radarEnabled || difficulty !== easy → minimap hidden` — código atual liga `radarEnabled` mas esconde se não for `easy` → contradição. Na prática `normal` teria `radarEnabled true` mas `hasMinimap false` mantém minimapa escondido mesmo com radar — bug/inconsistência. Antigo session diz `radar+phone normal` deveria dar mapa, mas `HUD.js` checa `easy` — atualmente radar **não desbloqueia minimapa visível** fora do fácil. Sem docs narrativa.
- **Por que existe:** Gate de progressão `normal` — sem explicação ficcional, só item.
- **Narrativa:** Nenhuma `NÃO EXPLICADO ATUALMENTE.` Texto só `RADAR ENCONTRADO MAPA DISPONÍVEL` `Game.js:34`.

---

### 14. LANTERNA

- **Dificuldade:** `hard` `hasFlashlightRequirement true` `Config.js:162` — `Level0.js:412` `flashlight 17,1` `MapData.js:30` `hard flashlight+phone` — `Level1/2` não respawnam, persiste inventário `GameState.js:42`
- **Spawn:** `Flashlight.js` `src/player/Flashlight.js:15` `SpotLight 0xffdd66` `distance 22?` `angle 0.62/penumbra?` `castShadow false` `intensity 3.5` — toggle `KeyF` `Game.js:118` `toggleFlashlight()` `src/core/Game.js:359` `if isOpen phone close → requestPointerLock` `if !hasItem flashlight → LANTERNA NÃO ENCONTRADA`
- **Por que necessária:** Fog `hard 6/18` `Config.js:104` injogável sem luz `applyDarkness` `Game.js:396` + `updateDynamicFog` `Game.js:711` bônus `hard +16 far +2.5 near + sin` se `flashlight.isOn() && hasItem` `Game.js:713` `6→22` `18→34` — única forma estender visão.
- **Uso:** `F` liga/desliga `hud.setItemOn flashlight bool` `Game.js:373` `sfx switch` `Game.js:374` sway `sin 2.1*1.2` `Game.js:716` `lerp 5*delta`
- **Relação celular:** **Mutuamente exclusivos** `togglePhone` `Game.js:338` `if !wasOpen && flashlightOn → flashlight.toggle false` + `toggleFlashlight` `Game.js:360` `if isOpen phone → close + requestPointerLock` — não podem ficar ligados juntos.
- **Risco/recompensa:** Lanterna revela mas `ambientEventChance 0.65` `flickerNearby` mais intenso `Config.js:168` `flickerIntensity 1.8` e atrai `observeRangeHard 38.5` maior — design intencional.

---

### 15. ENTIDADE / MONSTRO

**Aparência** `BackroomsEntity.js:46` `USE_BONES false` sólido — `OBJ /models/slenderman/base.obj` `OBJLoader` `BackroomsEntity.js:276` `texture_diffuse.png` `NearestFilter` `src/entities/BackroomsEntity.js:28` `rigSlenderman offsetY -rawMin.y+0.06/scale targetHeight modelHeight 2.0` `Config.js:63` `scale rawSize.y?` `Box3` `Group` `visualRadius 0.52` `BackroomsEntity.js:103` `MeshLambert 0x0d0b08 polygonOffset` `BackroomsEntity.js:95` fallback `createFallbackVisual` `BackroomsEntity.js:382` `Tube spine CatmullRom Tube 0.038` `head Cylinder 0.06/0.16` `limbs Cylinder` — silhueta fina ~2m sem rosto.

**Quantidade:** `1` sempre `EntityManager.js:13` `Math.min(count,1)` — mesmo `levelManager` `Level0 Level1 Level2` só 1.

**Função:** `GameState STATE PLAYING` `EntityManager.update()` `src/entities/EntityManager.js:64` `setPlayerPos` `BackroomsEntity.update(delta,time)` `visibleToPlayer lineBlocked steps cellSize*0.5` `BackroomsEntity.js:446` — ameaça de captura; `keepCenteredInCorridor` `BackroomsEntity.js:745` evita parede.

**Comportamento estados** `BackroomsEntity.js:456` `update()` switch `IDLE_HIDDEN wander` `OBSERVING facePlayer flicker` `STALKING moveToward` `CHASING chaseSpeed 5.5` `SEARCHING` `COOLDOWN` `VANISHING scale 1-0.55*vanishTimer flicker random>0.45` `GONE invisible 7-13s respawn teleportAway distance>5` `BackroomsEntity.js:592`

**Captura:** `distanceToPlayerXZ <0.75` (+ radius 0.35 `Config.js:11` total ~1.1) `BackroomsEntity.js:497/547/557` `caughtPlayer true` → `EntityManager` `gameOver()` `src/entities/EntityManager.js:68` → `Game.gameOver` `src/core/Game.js:545` `state GAMEOVER` `staticEffect.start()` `proximityStatic.stop()` `sfx denied` `fadeIn 700` `VOCÊ FOI CAPTURADO` `index.html:202`

**Respawn:** `Vanishing 0.7s` `BackroomsEntity.js:66` `GONE 7-13s` `respawnDelay min7 max13` `BackroomsEntity.js:67` `teleportAway` `Level.js worldToCell` evita sólido `visualRadius+0.15`

**Por dificuldade:**

- **FÁCIL `stalker` `Config.js:129`** `observeDelay 0.4 lose3.52` — `IDLE_HIDDEN wander 0.45*2.2` `OBSERVING nunca captura` `STALKING mantém 3-6m vanishes se <1.1` `stateTimer>9+rand6` `BackroomsEntity.js:524` — jogador vê, segue, some; **morte impossível**.
- **NORMAL `timid` `Config.js:146**` `delay0.35 lose3.2` — observa 0.35s, `STALKING→CHASING se <10.5` `chaseRange 3*3.5` `BackroomsEntity.js:510` — persegue tarde, dá 3.2s sem visão pra despistar.
- **DIFÍCIL `aggressive` `Config.js:163**` `delay0.12 lose2.72 range38.5` — persegue imediato, `stalkTime5` vira `CHASING` direto `BackroomsEntity.js:513` — letal frequente.

---

### 16. ENTIDADE — PAPEL NARRATIVO

- **Nome?** **NÃO EXPLICADO ATUALMENTE.** Código usa `BackroomsEntity` `Slenderman` pasta `public/models/slenderman/base.obj` `texture_diffuse.png` `src/entities/BackroomsEntity.js:275` mas nunca exposto ao jogador.
- **Origem/lore?** **NÃO EXPLICADO ATUALMENTE.** Nenhum texto menu/hud/notificação menciona origem.
- **Texto explicando?** Nenhum.
- **Relação Backrooms?** Implícita por `Slenderman` + `BackroomsEntity` nome — não explicitada.
- **Relação portais?** **NÃO EXPLICADO.** Não reage a portal.
- **Relação jogador?** Apenas `distanceToPlayer` `BackroomsEntity.js:431` captura — sem motivação ficcional.
- **Razão perseguir?** Mecânica `visibleToPlayer` `lineBlocked` `BackroomsEntity.js:437` + `facePlayer` `BackroomsEntity.js:618` — zero narrativa.

---

### 17. MORTE / GAME OVER

- **Como morre:** Colisão XZ `<0.75` `BackroomsEntity.js:556` em `CHASING/STALKING/SEARCHING` (fácil bloqueia `BackroomsEntity.js:572`).
- **Visual:** `StaticEffect.start()` `src/ui/StaticEffect.js` `canvas #static-canvas` `CanvasTexture` scanlines `index.html:198` `proximityStatic.stop()` `src/core/Game.js:556` `game-over-screen hidden→visible` `index.html:197` `class game-over-static` `static-vignette/scanlines` `VOCÊ FOI CAPTURADO glitch data-text` `A anomalia alcançou você.` `index.html:203` `end-stats Jogador: go-player Pontuação: go-score padStart3` `src/core/Game.js:561`
- **Áudio:** `stopAll()` `Game.js:553` `sfx denied` `Game.js:554` `proximityStatic` `setIntensity 0` `AudioManager heartbeat stop` `Game.js:807`
- **Opções:** `TENTAR NOVAMENTE` `index.html:208` `btn-go-restart → Game.restart()` `src/core/Game.js:614` `cleanupRun unloadLevel reset objectiveManager hud reset state PLAYING loadLevel 0` `MENU` `btn-go-menu → backToMenu` `Game.js:634` `cleanupRun resetFog state MENU mainMenu.show`
- **Perde:** progresso run atual (`elapsedSeconds` `score` mantém até restart?), pontuação salva só se `completePortalRun` `repository.saveResult` `Game.js:537` — game over não salva.
- **Reinicia:** Jogo inteiro desde `CHÃO 0`, não só nível — `GameState.reset() currentLevelIndex0` `GameState.js:6`.
- **Narrativa:** Só `VOCÊ FOI CAPTURADO` / `A anomalia alcançou você` — sem lore.

---

### 18. PORTAIS

**MECÂNICO** `src/interactions/Portal.js:96` `ShaderMaterial vertex+fragment retro` `Circle 1.4 segments22 y1.6 frame Torus1.45/0.07 innerFrame1.3 light PointLight 0x332211 decay1.5 particles64` `Portal.js:105`:
- Desbloqueio: `unlock()` `Portal.js:196` `unlocked true unlockProgress 0` chamado via `GameState.unlockPortal emit portal:unlocked → Game.js:257 level.portal.unlock()` `lighting.setPowerRestored 1.35` `notify ANOMALIA ESTABILIZADA`
- Quando aparece: já existe na sala final desde `buildPortalStructure` `Level0.js:322` `Level1.js:236` mas `unlocked false` `uniforms uColor 0x2a251a uIntensity0.35` frame gira `0.03` `Portal.js:234` — invisível até unlock onde `uIntensity 0.35→1.75 uNoise 4→10 light 0→4` `Portal.js:217` `1.66s`
- Atravessar: `update(delta,time,cameraPos) return horizontalDistance <1.3 && unlocked` `Portal.js:245` — sem `E`, só andar em cima;
- Troca level: `Level.js updatables portal.update → onPortalEnter → Game.handlePortalEnter` `Game.js:424` `if lastLevel → completePortalRun else advanceLevel fade LevelManager.load`.

**NARRATIVO:** **NÃO EXPLICADO ATUALMENTE.** Nenhum texto diz quem criou, se natural/anomalia, por que leva ao próximo `CHÃO`. Só `ANOMALIA ESTABILIZADA PORTAL DISPONÍVEL` `Game.js:260` e `CONTINUE PELO PORTAL ELE É A ÚNICA SAÍDA` `Game.js:43` (phone). Não há lore inter-nível.

---

### 19. PROGRESSÃO DO JOGADOR

- **Inventário persistente:** `GameState.inventory` `fuse/keycard/radar/phone/flashlight` + dinâmico `partA/B/fragment` `GameState.js:13` `collectItem` não resetado em `advanceLevel` `GameState.js:38` — carrega entre níveis `Level0→1→2` (ex.: `phone` pego no 0 serve no 2). `GameState.reset()` só no `restart/backToMenu` `Game.js:623`.
- **Habilidades:** Não evolui — `Player speed3.5 sprint6 height1.7` `Config.js:9` constantes; `Flashlight` persiste se `hard` `Game.js:505` `dispose` só em `cleanupRun`.
- **Score:** Persiste `GameState.score` `GameState.js:7` `addScore` idempotente, só soma, nunca reset entre níveis até `reset`.
- **Conhecimento:** `levelObjectiveIds` trocado por `ObjectiveManager.setObjectives` `ObjectiveManager.js:5` — próximo nível define novos IDs, mas `objectives` antigos permanecem `true` (não limpa).
- **Reset troca fase:** `unloadLevel` `Game.js:466` `entityManager dispose flashlight toggle off player dispose interactionSystem clear levelManager unload clearRetroHandles` — mas `GameState.inventory/objectives/score/elapsedSeconds` **mantém**. Só `portalUnlocked false` em `advanceLevel`.
- **O que reseta:** Posição, luzes, entidade posição `EntityManager dispose` → novo `BackroomsEntity` com `seed` `EntityManager.js:22` `spawnMin6`.

---

### 20. INVENTÁRIO

| Item | Level spawn | Dificuldade | Função `Game.js:313` | Consumido? | Persiste? `GameState.js:38` |
|---|---|---|---|---|---|
| `fuse` `PickupItem` `Level0 F` `cylinder` | 0 | todas | `FuseBox hasItem fuse → FUSE_READY` `FuseBox.js:42` | Não (fica `inventory true`) | Sim até reset |
| `keycard` `Level0 K` | 0 | todas | `Door hasItem keycard` `Door.js` | Não | Sim |
| `radar` `Level0 R 12,1` `0x44ffaa` | 0 | `normal` (Código `Level0.js:409` exige) `easy/hard` não | `hud.setRadarEnabled` `Game.js:315` (bug minimapa só easy) | Não | Sim |
| `phone` `Level0 C 1,13` `Nokia` | 0 | `normal/hard` `Level0.js:412` | `hud.setPhoneEnabled` `NokiaPhone.setEnabled` mensagens `Game.js:317` | Não | Sim |
| `flashlight` `Level0 W 17,1` `0xffdd66` | 0 | `hard` `Level0.js:412` `hasFlashlightRequirement` `Config.js:162` | `Flashlight toggle F` `Game.js:359` `hud.setItemOn` | Não | Sim |
| `partA` `Level1 A 3,4` `0xff5a3c` | 1 | todas | `Generator hasItem partA&&B` `Level1.js:55` | Não | Sim |
| `partB` `Level1 B 10,4` `0x3c8aff` | 1 | todas | idem | Não | Sim |
| `fragment` `Level2 R 3,3` `0xd8a0ff` | 2 | todas | `Stabilizer hasItem fragment` `Level2.js:64` | Não | Sim |

`partA/partB/fragment` não declarados em `GameState.reset` mas funcionam dinamicamente `GameState.js:17` `inventory[item]=true`.

---

### 21. ROTEIRO EM ORDEM CRONOLÓGICA (REAL JOGÁVEL)

1. Jogador abre `threshold` → `loading CARREGANDO INITIALIZING ENVIRONMENT...` `index.html:19` → `THRESHOLD A LIMINAL ESCAPE` menu `index.html:25` `ADS SENAC` `Equipe: [preencher]`
2. Clic `INICIAR` `index.html:28` → modal `Digite seu nome` `index.html:40` `input maxlength20` → `ENTRAR`
3. Modal `SELECIONE A DIFICULDADE` `index.html:55` `FÁCIL Minimapa...` `NORMAL Exige radar/celular` `DIFÍCIL Sem radar... exige lanterna`
4. Fade `UIManager.fadeIn` `src/ui/UIManager.js:25` → `Game.start()` `src/core/Game.js:207` `setState PLAYING _lastPlayStart` `hud.setDifficulty show` `LevelManager.load(0)` `player.spawnAt S 1,1` `CHÃO 0` `src/core/Game.js:248` `hud.setLevelName CHÃO 0`
5. HUD mostra `OBJETIVO` `src/ui/HUD.js:79` `[ ] Encontrar fusível` + legenda fácil `Encontre FUSÍVEL brilho amarelo` `HUD.js:36` + prompt cruz `+` `notifications` vazias
6. Explora `WASD SHIFT E Q F ESC` `index.html:77` corredor amarelo `fog 12/34` `PointLight 3.2` `src/world/Lighting.js:93` ouve `flicker 0.15/s` `Level0.js:802` e `footstep carpet` `AudioManifest.js:3`
7. Encontra `FUSÍVEL F 4,4` `PickupItem` brilho amarelo `halo` → `[E] Pegar fusível` `InteractionSystem.js:42` `E` → `FUSÍVEL COLETADO` `Game.js:29` `+100` `scoredActions` + `sfx pickup` `phone page atualiza`
8. (Ordem livre) Encontra `CARTÃO K 15,9` azul → `CARTÃO ENCONTRADO +100`
9. (Se `normal/hard`) antes precisa `RADAR R 12,1` `RADAR ENCONTRADO MAPA DISPONÍVEL +150` e `CELULAR C 1,13` `CELULAR ENCONTRADO TRANSMISSÕES ATIVAS +150` `CELULAR [Q] PARA ABRIR` — `hard` pega `LANTERNA W 17,1` `LANTERNA ENCONTRADA PRESSIONE [F] +250` `F` liga `Spot 0xffdd66` `Flashlight.js`
10. Leva fusível ao `PAINEL P 13,4` parede norte `Group Box 1.3x1.7` `Level0.js:603` → `[E] Inserir fusível` `FuseBox.js:33` → `FUSÍVEL INSTALADO` `indicator âmbar 0xccaa22` `sfx switch`
11. `E` novamente ` [E] Restaurar energia` `FuseBox.js:35` → `ENERGIA RESTAURADA` `indicator 0x33ff55` `power +200` `Lighting 1.35` `dispatch portal:unlocked`
12. `ANOMALIA ESTABILIZADA PORTAL DISPONÍVEL` `Game.js:260` `portal unlockProgress 0→1 1.6s` `uIntensity 1.75` `Portal.js:217`
13. Vai ao sul `PORTA D 14,13` `Door pivot` → sem cartão `ACESSO NEGADO sfx denied` `Door.js` com cartão `[E] 2x` `insertCard reader verde` → `open()` luz `panel rotates` `isBlockingCell false`
14. Entra sala portal `O 17,13` `Portal.js:245` distância `<1.3` → `handlePortalEnter` `Game.js:424` `advanceLevel` `fade 700 unload/load Level1` `audio stop/setReverb/startAmbient` `showLevelIntro CHÃO 1 2000`
15. `CHÃO 1` `S 1,1` concreto cinza `footstep concrete` `AudioManifest.js:11` objetivos `Encontrar PECA A/B Ativar GERADOR` `Level1.js:95` `notifications` `PHONE_MESSAGES` a cada 18s `whisper` `Game.js:687`
16. Pega `PECA A 3,4 laranja 0xff5a3c` `PECA A ENCONTRADA +100` e `PECA B 10,4 azul 0x3c8aff +100`
17. Vai `GERADOR G 11,11` `Generator.js:56` sem peças `GERADOR — faltam peças A e B` → com ambas `[E] Ativar gerador` `Level1.js:58` → `GERADOR ATIVADO +200 sfx power completeObjective generator → unlockPortal`
18. Mesmo portal `ANOMALIA...` → andar `O 2,13` → fade `CHÃO 2`
19. `CHÃO 2` `S 9,2` metal roxo `footstep metal` `AudioManifest.js:17` objetivos `Coletar FRAGMENTO Estabilizar DISPOSITIVO` `Level2.js:99` `fog 6/18`
20. Pega `FRAGMENTO R 3,3 tetra 0xd8a0ff` `FRAGMENTO COLETADO +150`
21. Leva a `DISPOSITIVO Y 13,11` `Stabilizer.js:58` `DISPOSITIVO — precisa fragmento` sem → com `[E] Estabilizar` `Level2.js:60` → `DISPOSITIVO ESTABILIZADO +200 sfx power → unlockPortal`
22. `Portal O 3,7` → por ser último `completePortalRun` `Game.js:515` `award escape 250` `stopAll` `scoreManager` `state COMPLETED` `fadeIn 900 hud hide fadeOut 500 showLevelIntro 2200 (bug COMING SOON) show MISSÃO CONCLUÍDA Jogador: Score: Tempo: MM:SS` `index.html:187` `EndScreen.js:38` `repository.saveResult localStorage` `GameRepository.js` `volta menu` via `JOGAR NOVAMENTE` `EndScreen`.

Entidade pode interromper em qualquer ponto `caughtPlayer` `BackroomsEntity.js:497` → `VOCÊ FOI CAPTURADO` `index.html:202` `TENTAR NOVAMENTE` reinicia `CHÃO 0`.

---

### 22. ROTEIRO PELO PONTO DE VISTA DO JOGADOR (LEIGO)

"O jogador simplesmente aparece no `CHÃO 0` após digitar nome e escolher dificuldade. Não há cinemática de chegada às Backrooms. Vê paredes amarelas, carpete, luzes, ouve zumbido. HUD diz `Encontrar fusível` sem dizer por quê. Ele explora corredores idênticos, encontra um cilindro amarelo brilhante (fusível) e um cartão azul, aperta `E`. Leva o fusível a uma caixa na parede (`Painel elétrico`) e aperta `E` duas vezes — luzes ficam mais fortes e uma mensagem diz `ANOMALIA ESTABILIZADA PORTAL DISPONÍVEL`. Abre porta com cartão, entra num círculo brilhante com partículas que o teleporta. No `CHÃO 1` cinza, pega duas peças laranja/azul e liga um gerador cilíndrico; de novo portal. No `CHÃO 2` roxo, pega um fragmento roxo e `estabiliza` um pilar com gema. Outro portal — agora tela `MISSÃO CONCLUÍDA` com pontuação e tempo. Durante tudo, uma figura escura alta (sem nome) aparece ao longe, às vezes segue e desaparece (fácil) ou persegue até matar (difícil). Celular `Q` mostra objetivos e frases soltas como `ELAS OBSERVAM` sem explicar quem. O jogador entende que precisa escapar, mas não por que está ali nem o que são portais/monstro."

---

### 23. STORYTELLING AMBIENTAL

- **Textos paredes/placas:** **AUSENTE**. `Level0.buildWallDetails` `src/world/Level0.js:254` só `outlet Box 0.15` e `pipes Cylinder 0.04` `src/world/Level0.js:292` — geometria sem texto.
- **Computadores/documentos:** **AUSENTE**.
- **Símbolos:** Nenhum decal.
- **Objetos pistas:** Crates `4 InstancedMesh Box 0.7 0x5a4f32` `Level0.js:229` `createCrateTexture #8a6d2e tábuas` `src/world/Textures.js:154` `Pillars 8 Box 0.45 wallTexture` `Level0.js:198` `Portal cables 6 Cylinder` — puramente set dressing industrial, sem lore.
- **Sons storytelling:** `flickerNearbyLights 30% raio3` `Level0.js:817` `playPositional distant` `Level0.js:834` + `AudioManager ambient hum` `AudioManifest.js:38` `whisper` `entity breath/growl/vanish` `AudioManifest.js:23/26/30` — susto, não narrativa.
- **Mudanças ambientais:** Troca paleta `amarelo→cinza→roxo` e `carpet→concrete→metal` `Level0/1/2 footstepSurface` + `fog 34→32→18` — progressão visual de estranhamento, sem explicação diegética.
- **Conclusão:** **Praticamente não há storytelling ambiental textual.** História entregue só via `HUD/NokiaPhone/notifications`.

---

### 24. TEXTOS DO JOGO (INVENTÁRIO)

**MENU** `index.html` `src/ui/MainMenu.js`:
`THRESHOLD A LIMINAL ESCAPE` `INICIAR INSTRUÇÕES ADS SENAC JOINVILLE Profª Claudia Werlich Equipe: [preencher] Digite seu nome _ ENTRAR SELECIONE A DIFICULDADE FÁCIL Minimapa e guia; entidades só observam... NORMAL Exige achar radar... DIFÍCIL Sem radar... exige lanterna MOVIMENTAÇÃO WASD mover MOUSE olhar SHIFT correr E interagir F lanterna Q celular ESC liberar cursor VOLTAR PAUSADO CONTINUAR REINICIAR MENU`

**OBJETIVOS** `HUD.js:36` `ObjectiveManager.js`: `Encontrar fusível Encontrar cartão Restaurar energia Encontrar PECA A/B Ativar GERADOR Coletar FRAGMENTO Estabilizar DISPOSITIVO` `legendSteps Encontre FUSÍVEL brilho amarelo Encontre CARTÃO brilho azul Leve fusível ao PAINEL ELÉTRICO (parede norte) [E] Use CARTÃO na PORTA trancada ao sul [E]2x Atravesse PORTAL`

**NOTIFICAÇÕES** `Game.js:28`: `FUSÍVEL COLETADO CARTÃO ENCONTRADO PECA A/B ENCONTRADA FRAGMENTO COLETADO RADAR ENCONTRADO MAPA DISPONÍVEL CELULAR ENCONTRADO TRANSMISSÕES ATIVAS LANTERNA ENCONTRADA PRESSIONE [F] FALTAM AS PEÇAS A E B / GERADOR ATIVADO O DISPOSITIVO PRECISA DO FRAGMENTO / DISPOSITIVO ESTABILIZADO VOCÊ PRECISA DE UM FUSÍVEL FUSÍVEL INSTALADO ENERGIA RESTAURADA ACESSO NEGADO ANOMALIA ESTABILIZADA PORTAL DISPONÍVEL CELULAR NÃO ENCONTRADO LANTERNA NÃO ENCONTRADA CLIQUE E ARRASTE PARA OLHAR SINAL VINCULADO TRANSMISSÕES RECEBIDAS ITEM COLETADO`

**CELULAR** `Game.js:38` `NokiaPhone.js:260/268/274`: `OBJETIVOS 1/3 concluidos < usar > para navegar [x]/[ ] TITLE CONCLUIDO/PENDENTE SEM MENSAGENS AGUARDE TRANSMISSAO DICA: Q FECHA F LANTERNA BOA SORTE SINAL FRACO... ANOMALIA PRÓXIMA. ELAS OBSERVAM... NÃO CORRA... O CHÃO SE REPETE... CONTINUE PELO PORTAL... SINAL VINCULADO.`

**LEVEL INTRO** `index.html:181` `EndScreen.js:13`: `CHÃO 0/1/2` (via `Game.js:248/443`) e fallback `LEVEL 1 COMING SOON` `EndScreen.js:14` bug final.

**GAME OVER** `index.html:202`: `VOCÊ FOI CAPTURADO A anomalia alcançou você. Jogador: Pontuação: TENTAR NOVAMENTE MENU`

**FINAL** `index.html:187`: `MISSÃO CONCLUÍDA Jogador: Pontuação: Tempo: MM:SS JOGAR NOVAMENTE`

---

### 25. TELA / INTRO DE CADA LEVEL

Só `fade` + `EndScreen`. `src/ui/EndScreen.js:24` `showLevelIntro({title})` seta `.level-intro-title` `.level-intro-sub` `index.html:180` `screen hidden` `Game.js:443` `showLevelIntro({title: nextName},2000)` onde `nextName = CONFIG.levels.names[index]` `CHÃO 1` etc. Sem subtítulo lore, só nome. `Game.js:529` final chama `showLevelIntro(2200)` sem título → default `LEVEL 1 COMING SOON` `EndScreen.js:13`. Não há `THE LOBBY` ou lore.

---

### 26. FINAL ATUAL

Após `Stabilizer` → `portal:unlocked` → `Portal O 3,7 Level2` `update <1.3 unlocked` → `Game.handlePortalEnter` `src/core/Game.js:429` `if levelIndex >=2` → `completePortalRun` `src/core/Game.js:515` `if COMPLETED/GAMEOVER return` `setState COMPLETED transitioning true stopAll award escape 250 clearActions exitPointerLock fadeIn 900 hud.hide fadeOut 500 showLevelIntro 2200 (bug)` `show {playerName,score=pad3,duration MM:SS}` `index.html:187` `EndScreen.show` `GameState.elapsedSeconds` `src/core/GameState.js:9` `ui.fadeOut()` `repository.saveResult {playerName,score,duration,completedAt ISO}` `localStorage` `GameRepository.js` `state MENU` só via `JOGAR NOVAMENTE` `EndScreen` → `restart()` `Game.js:614` `cleanupRun reset hud reset state PLAYING loadLevel 0`. **Não há cutscene, diálogo final, explicação de escape, créditos narrativos** — só stats.

---

### 27. COERÊNCIA ENTRE OS LEVELS

`CHÃO 0 → CHÃO 1 → CHÃO 2` linear `LevelManager.js:4` faz sentido mecânico (portal gate), **não narrativo**.

- **Conexão:** Só portal circular idêntico `Portal.js:96` re-usado `Level0/1/2 buildPortalStructure` cópia verbatim. Nenhum texto liga níveis.
- **Visual:** Progressão `amarelo carpete → cinza concreto → roxo metal` sugere aprofundamento, mas sem diegese (sem placas `CHÃO` só HUD).
- **Puzzle:** Troca `fuse/door → generator parts → fragment/stabilizer` sem fio condutor — por que gerador depois de painel elétrico?
- **Conclusão:** Progressão puramente mecânica por portal; sem lore inter-nível; elementos que conectam são `portal shader` e `score/inventário persistente` `GameState.js:38`.

---

### 28. COERÊNCIA DOS PUZZLES

| Puzzle | O que faz | Por que faz (código) | Resultado | Narrativa | Classificação |
|---|---|---|---|---|---|
| `Level0 FuseBox` `NO_FUSE→FUSE_READY→INSTALLED→POWER_RESTORED` `FuseBox.js:4` | `E` insere fusível, `E` restaura | `hasItem fuse` `GameState.js:44` checa inventário | Luzes `setPowerRestored 1.35` `Game.js:259` `indicator 33ff55` `portal unlock` | Painel elétrico plausível em Backrooms, mas sem por que energia libera portal | **PARCIALMENTE EXPLICADO** (elétrica → energia) |
| `Level1 Generator` `Level1.js:41` `hasItem partA&&B` | Coleta `partA/B` → `[E] Ativar gerador` | `GameState.hasItem` gate, sem in-world cabos ligando | `GENERADOR ATIVADO` `complete generator 200` `portal unlock` | Nenhuma explicação por que peças espalhadas ligam portal | **SEM EXPLICAÇÃO NARRATIVA** |
| `Level2 Stabilizer` `Level2.js:41` `hasItem fragment` | Pega fragmento → `[E] Estabilizar` | `if !fragment → O DISPOSITIVO PRECISA...` `Level2.js:65` | `DISPOSITIVO ESTABILIZADO` `stabilize 200` `unlock` | `Stabilizer` nome genérico, gem `Octahedron 8a5aff` sem função ficcional | **SEM EXPLICAÇÃO NARRATIVA** |

---

### 29. COERÊNCIA DOS ITENS

| Item | Entende por que existe? | Classificação |
|---|---|---|
| `fusível` `Level0.js:515` `dedede` | Sim, painel precisa — mais coerente | **COERENTE** |
| `cartão` `Level0.js:562` `ffd23a` | Sim, porta com `reader emissive 880000` `Level0.js:720` | **COERENTE** |
| `radar` `0x44ffaa` `Level0.js:503` `RADAR ENCONTRADO` | Não, bug minimapa só fácil `HUD.js:206` — sem função visível normal | **SEM EXPLICAÇÃO / INCONSISTENTE** |
| `celular Nokia` `Level0.js:430` `FBX` | Como ferramenta `Q` para ver objetivos/mensagens `NokiaPhone.js:256` plausível, mas sem lore por que Nokia nas Backrooms | **PARCIALMENTE EXPLICADO** |
| `lanterna` `0xffdd66` `Level1 hard W17,1` `Flashlight.js Spot` | Sim, `fog 6/18` `Config.js:104` precisa, mas descrição `Config.js:156` desatualizada `Q` vs `F` | **COERENTE** mecânico |
| `partA/B` `Level1.js:286` `Octahedron laranja/azul` | Não, duas peças abstratas sem forma de gerador | **SEM EXPLICAÇÃO** |
| `fragment` `Level2.js:293` `Tetra d8a0ff` | Não, fragmento de quê? | **SEM EXPLICAÇÃO** |

---

### 30. ELEMENTOS SEM EXPLICAÇÃO (LISTA OBJETIVA)

- Origem do jogador — `NÃO EXPLICADO` `GameState.js:11` só nome
- Como/por que foi parar nas Backrooms — `NÃO EXPLICADO` `Level0 S` spawn
- O que são `CHÃO 0/1/2` — só nomes `Config.js:176`, sem lore
- Portais — mecânica `Portal.js:196` sem origem/criador
- Entidade `BackroomsEntity` — sem nome/lore `BackroomsEntity.js` `slenderman/base.obj` nunca nomeado ao jogador
- Por que `Level1` precisa `partA/B` + `Generator` — `NÃO EXPLICADO` `Level1.js:41`
- Por que `Level2` `fragment + Stabilizer` — `NÃO EXPLICADO` `Level2.js:41`
- `Radar` função real `NÃO EXPLICADO` e bug visibilidade `HUD.js:206`
- `Celular` quem envia `PHONE_MESSAGES` `Game.js:38` — `NÃO EXPLICADO`
- `ANOMALIA` termo `Game.js:260` sem definição
- Final `MISSÃO CONCLUÍDA` `index.html:187` sem conclusão ficcional

---

### 31. ELEMENTOS QUE JÁ FORMAM UM BOM ROTEIRO

- Progressão visual `amarelo→cinza→roxo` `Textures.js` + `metal` `Level2` cria aprofundamento natural `Level0 carpet 7d6f45 → Level1 concrete → Level2 metal` — base para `infiltração`
- Loop `coletar→inserir→estabilizar→portal` consistente `GameState.unlockPortal` `GameState.js:28` — esqueleto de "reativar sistema"
- Celular `Q` como diegese `NokiaPhone.js:182` `LCD #62a333` + mensagens `whisper 18s` `Game.js:687` já tem canal narrativo pronto sem alterar gameplay
- Entidade com `stalker→timid→aggressive` `Config.js:129/146/163` entrega curva de tensão sem novo código — fácil susto → difícil terror
- `Fog + PointLight flicker` `Lighting.js:93` `Config.js:101` + `ProximityStatic` `src/ui/ProximityStatic.js` `updateProximityNoise BFS` `Game.js:734` já vendem horror liminar — bom para storytelling ambiental se adicionar textos

---

### 32. INCONSISTÊNCIAS

| # | Inconsistência | Entre | Classificação |
|---|---|---|---|
|1| `Radar` anunciado `RADAR ENCONTRADO MAPA DISPONÍVEL` `Game.js:34` mas `HUD.js:206` `minimap hidden if difficulty !== easy` — normal nunca vê mapa | Gameplay↔texto | **ALTA** |
|2| `GameState.reset()` `GameState.js:6` só limpa `fuse/keycard/power` — `partA/B/fragment` persistem phantom após `restart` | Sistema↔reset | **MÉDIA** |
|3| `portal portal:100` `Config.js:35` nunca `award` `Game.js:522` só `escape 250` — score doc `README.md:68 500 max` desatualizado (atual >1700) | Docs↔código | **MÉDIA** |
|4| `Config hard description Q alterna lanterna` `Config.js:156` vs `KeyF` real `Game.js:118` vs `index.html:82 F lanterna` | Texto↔código | **BAIXA** corrigido recentemente mas histórico |
|5| `EndScreen.showLevelIntro` sem título final chama `LEVEL 1 COMING SOON` `Game.js:529` `EndScreen.js:13` — deveria ser `CHÃO 2` ou `FIM` | UI↔levels | **MÉDIA** |
|6| `EntityManager` `Math.min(count,1)` `EntityManager.js:13` sempre 1, mas `Config entityCount 1` sugere variação futura — não há `2 entidades` | Config↔código | **BAIXA** |
|7| `Level1/2 updateAmbientEvents` vazio `Level1.js:271` vs `Level0 flickerNearby` `Level0.js:817` — L1/2 sem `ambientEvent 0.35/0.65` `Config.js:151/168` | Level design | **MÉDIA** |
|8| `phone seven messages` `Game.js:38` incluem `O CHÃO SE REPETE` mas `MapData 19x15` repetido proposital — auto-referência sem explicação | Narrativa↔mapa | **BAIXA** |

---

### 33. ROTEIRO ATUAL VS GAMEPLAY

| Elemento | Gameplay existe? | Narrativa explica? | Jogador entende? |
|---|---|---|---|
| `Portal` `Portal.js:196` | Sim, `unlock → <1.3` | Não `NÃO EXPLICADO` | Só que teleporta |
| `Entity` `BackroomsEntity.js:46` `slenderman.obj` | Sim, `STALKING/CHASING capture 0.75` | Não | Entende que mata, não porquê |
| `Fuse` `Level0.js:515` `F 4,4` | Sim, `Pickup + FuseBox` | Parcial `painel elétrico` | Sim, ligar energia |
| `Generator` `Level1.js:41` `G 11,11` | Sim, `partA/B gate` | Não | Só mecânico |
| `Stabilizer` `Level2.js:41` `Y13,11` | Sim, `fragment gate` | Não | Só nome |
| `Phone` `NokiaPhone.js:182` `Q` | Sim, `toggle + messages 18s` | Não (quem envia) | Como HUD, não lore |
| `Radar` `Level0.js:409` `R12,1` | Sim `Pickup +150` mas minimapa bug `HUD.js:206` | Não | Confuso |
| `Flashlight` `Flashlight.js` `F` | Sim, `Spot + fog bonus 16` `Game.js:711` | Parcial `escuro precisa luz` | Sim |
| `Door` `Door.js:47` `reader 880000` | Sim, `keycard 2x E` | Sim `porta trancada` | Sim |
| `Anomalia` `Game.js:260` `ANOMALIA ESTABILIZADA` | Texto só | Não | Vago |

---

### 34. ARCO DE TENSÃO

- **INÍCIO Menu/Spawn** `index.html:25` `Game.start PLAYING` `Config.js:120 difficulty` — **BAIXA** sem ameaça imediata `GONE 7-13s` `BackroomsEntity.js:67`
- **CHÃO 0** `fog 12/34` `flicker0.5 ambient0.15` `stalker/timid` — exploração tutorial `legend anéis` `Level0.js:752` + `fuse/keycard` sem pressão `easy 0% morte` `normal 31.5 range` — **MÉDIA** (fácil baixa, normal média)
- **CHÃO 1** `fog 11/32→6/18` `flicker1.0 ambient0.35` `timid→aggressive` `generator` peças em lados opostos `A3,4 B10,4` mapa vazado `Level1.js:15` — corredores longos, menos `wall` `#`, visão `PointLight 9` — **ALTA** perseguição tardia, sem guia
- **CHÃO 2** `fog 6/18` `flicker1.8 ambient0.65` `aggressive range38.5 delay0.12` `metal` `ProximityStatic` `Game.js:792` `heartbeat  t*1.15` `growl` `Game.js:796` — visão curta, `interaction 0.8` `Config.js:166` `Fragment R3,3` longe de `Y13,11` — **MUITO ALTA** final.
- **FINAL** `completePortalRun fade 900` `MISSÃO CONCLUÍDA` `EndScreen.js` sem susto — **BAIXA**

Curva `baixa→média→alta→muito alta→baixa` funciona mecanicamente via `fogByDifficulty` `Config.js:101` + `ambientEventChance` `Config.js:168` + `observeDelay` `Config.js:68`, sem picos narrativos.

---

### 35. DURAÇÃO (ESTIMATIVA sem playtest cronometrado, baseada em labirinto 19x15 e objetivo)

- **CHÃO 0:** `easy 4-6 min` (guia+minimapa) `normal 7-10 min` `hard 9-13 min` (fog curto + entidade)
- **CHÃO 1:** `5-8 min` (2 peças + gerador, mapa aberto, menos paredes)
- **CHÃO 2:** `5-9 min` (fragmento único mas `fog 6m` hard + backtracking `S9,2→R3,3→Y13,11→O3,7`)
- **Run inteira:** `14-23 min` normal `≈18 min`; `10-16 min` fácil `≈13 min`; `19-30 min` difícil `≈24 min` (estimativa, sem morte)
- **Com mortes/restarts:** + `7-13s GONE` + `fade 0.7-2s` por captura `BackroomsEntity.js:66` / `Game.js:438`.

---

### 36. CONTEÚDO ACADÊMICO

Check `README.md:70-94` + `Config.js/LevelManager`:

- **Ambiente 3D:** `Three.js WebGLRenderer` `src/core/Game.js:69` `RetroRenderer.js` `scene.background Fog` `src/world/Level.js:19 cellToWorld` `InstancedMesh walls` `src/world/Level0.js:121` validado.
- **Exploração:** 3 labirintos `19x15` `LevelManager 3` `MapData/Level1/2` `Player WASD+Mouse` `src/player/Player.js` `collisão isSolidCell` `Level.js:37` `Raycaster far` `InteractionSystem.js:42`.
- **≥3 interações:** `E` `InteractionSystem.tryInteract` `src/interactions/InteractionSystem.js:71` + `5 PickupItem` (`fuse/keycard/partA/partB/fragment`) + `FuseBox` 3 estados `src/interactions/FuseBox.js:4` + `Door` 2 passos `src/interactions/Door.js:47` + `Generator` `Level1.js:41` + `Stabilizer` `Level2.js:41` + `Portal` proximidade `Portal.js:245` = 6+ interações.
- **≥3 desafios:** `Puzzle CHÃO 0` `Door+Fusível`, `Puzzle CHÃO 1` `partA/B→Generator`, `Puzzle CHÃO 2` `fragment→Stabilizer` + `Entidade` com `STALKING/CHASING` `BackroomsEntity.js:524/555` + `Fog/navigation` `Config.js:101` + `Radar/Phone/Flashlight` como gate `Config.js:143/162` = 5+ desafios.
- **Pontuação:** `ScoreManager.js` `Config.scoring 14 ids` `src/core/Config.js:31` `GameState.addScore idempotente` `GameState.js:46` `eventBus score:changed` `src/systems/ScoreManager.js:8` exibição `HUD padStart3` `src/ui/HUD.js:103`.
- **Objetivo claro:** `ObjectiveManager setObjectives` `src/systems/ObjectiveManager.js:3` + `HUD OBJETIVO` `index.html:98` + `NokiaPhone pages CONCLUIDO/PENDENTE` `NokiaPhone.js:265` — sempre visível.
- **Conclusão/Resultado:** `GameOver VOCÊ FOI CAPTURADO` `index.html:202` `GameOver state GAMEOVER` `Game.js:545` vs `COMPLETED MISSÃO CONCLUÍDA` `index.html:187` `EndScreen.show score/time` `src/ui/EndScreen.js` + `LocalGameRepository.saveResult` `src/systems/GameRepository.js` `score/time/nome`.
- **Múltiplos níveis:** `LevelManager LEVEL_CLASSES 3` `src/world/LevelManager.js:4` `load 0/1/2` `Game.handlePortalEnter advanceLevel` `Game.js:433` + `EndScreen level-intro CHÃO X` `Game.js:443`.

**Atende todos requisitos acadêmicos listados** `README.md:84` sem inventar.

---

### 37. RESUMO EXECUTIVO DO ROTEIRO

**ROTEIRO ATUAL EM 1 PARÁGRAFO:** `THRESHOLD` não tem roteiro explícito: o jogador digita um nome e aparece no `CHÃO 0` amarelo, coleta fusível/cartão, restaura um painel elétrico e atravessa um portal circular que o leva ao `CHÃO 1` cinza onde coleta duas peças e ativa um gerador, e depois ao `CHÃO 2` roxo onde coleta um fragmento e estabiliza um dispositivo com gema, sempre para liberar o próximo portal até ver `MISSÃO CONCLUÍDA` com pontuação e tempo; mensagens de celular (`SINAL FRACO... ELAS OBSERVAM`) e o termo `ANOMALIA` são os únicos fios narrativos, sem explicar quem é o jogador, como chegou, quem criou portais ou o que é a entidade sem rosto que persegue.

**GAMEPLAY ATUAL EM 1 PARÁGRAFO:** Loop linear de exploração em labirinto `19x15` `cell 3.5` `WASD+Mouse+E` `Raycaster2.5` contra `fog 12/34→6/18` `PointLight` e entidade única `Slenderman 2m` com `FSM OBSERVING→STALKING→CHASING→VANISHING→GONE 7-13s`; três puzzles de gate (`hasItem` `fuse/door`, `partA&&B/generator`, `fragment/stabilizer`) abrem `Portal unlockProgress 1.6s` `distance<1.3`; dificuldades `easy stalker 0% morte + guia/minimapa`, `normal timid hasRadar/Phone + chase tardio`, `hard aggressive fog6 + flashlight F vs phone Q mutuamente exclusivos + chase imediato 5.5`; pontuação idempotente `100-250` por objetivo `+ escape 250` persistente via `GameState.inventory`.

**PRINCIPAL PROBLEMA NARRATIVO ATUAL:** Ausência total de diegese — `NÃO EXPLICADO` origem do jogador, lógica dos puzzles (`por que gerador/fragmento abre portal`), natureza dos portais/entidade/`CHÃOs`; textos são labels mecânicos (`Encontrar PECA B`, `DISPOSITIVO ESTABILIZADO`) sem verbo ficcional, então progressão é só `portal gate` sem causalidade.

**PRINCIPAL FORÇA DO JOGO ATUAL:** Base técnica sólida e já com curva de tensão funcional `fog+dificuldade+entidade stalker/timid/aggressive` + canal narrativo pronto (`NokiaPhone Q` `LCD 384x256` `messages 18s` `whisper`) e estilo `PS1 retro 240p Nearest dithering` coeso `Textures.js RetroMaterial.js` — esqueleto permite inserir história sem refatorar gameplay.

---

### 38. ESTADO DOS SISTEMAS

| Sistema | Estado | Papel no jogo |
|---|---|---|
| `Level0` `src/world/Level0.js` | **COMPLETO** | Lobby amarelo `fuse/keycard/power/door` `8 lights` `guide/minimap L0` `crate/pillar/outlet` |
| `Level1` `src/world/Level1.js` | **FUNCIONAL** | Cinza `partA/B/generator portal` 9 lights `concrete` sem `ambientEvents` |
| `Level2` `src/world/Level2.js` | **FUNCIONAL** | Roxo metal `fragment/stabilizer portal` 8 lights |
| `Objectives` `src/systems/ObjectiveManager.js` `GameState.js:17` | **FUNCIONAL** | `setObjectives/complete/allComplete unlockPortal` `fuse/keycard/power/partA/B/generator/fragment/stabilize` |
| `Puzzles` `FuseBox.js Door.js Generator Level1 Stabilizer Level2` | **FUNCIONAL** | Gates `hasItem` `NO_FUSE→POWER_RESTORED` `Door 2xE` |
| `Portal` `src/interactions/Portal.js` | **FUNCIONAL** | Shader `96 grid` `unlockProgress 1.6s` `PointLight 4.0` `distance <1.3` `onPortalEnter` |
| `Entity` `src/entities/BackroomsEntity.js` `EntityManager.js:13` `1` | **FUNCIONAL** | `FSM 9 estados` `stalker/timid/aggressive` `capture 0.75` `GONE 7-13s` `keepCentered` |
| `Difficulty` `src/core/Config.js:119` | **COMPLETO** | `easy/normal/hard fog 12/34 11/32 6/18 +16F bonus + entityMode + hasGuide/Minimap/Radar/Phone/Flashlight` |
| `Phone` `src/ui/NokiaPhone.js` `Game.js:123 Q` | **FUNCIONAL** | `FBX HUD 0.42 camera 0.28,-0.24,-0.46 Canvas #62a333` `messages 18s` `pages OBJETIVOS` |
| `Radar` `src/world/Level0.js:409` `Game.js:315` | **INCONSISTENTE** | Pickup `150` mas `HUD.js:206` esconde minimapa fora easy |
| `Flashlight` `src/player/Flashlight.js` `Game.js:118 F` | **FUNCIONAL** | `Spot 3.5 angle0.62 + dynamicFog 6→22` `mutual exclusive Q` `Game.js:338` |
| `Score` `src/systems/ScoreManager.js` `Config.js:31` | **FUNCIONAL** | `award idempotente padStart3` `portal 100 nunca usado` `escape 250` |
| `GameOver` `src/core/Game.js:545` `index.html:197` | **COMPLETO** | `caughtPlayer 0.75 → static canvas → VOCÊ FOI CAPTURADO → RESTART/MENU` |
| `Ending` `src/core/Game.js:515` `index.html:187` `EndScreen.js` | **FUNCIONAL** | `completePortalRun → MISSÃO CONCLUÍDA score/time saveResult` sem cutscene `COMING SOON bug` |
| `Narrative` `index.html menu/phone` | **PLACEHOLDER** | Só `THRESHOLD A LIMINAL ESCAPE` + `6 PHONE_MESSAGES` + `ANOMALIA` |
| `Environmental Storytelling` `Level0.js:254 buildWallDetails` | **AUSENTE** | Só `outlet/pipe/crate/pillar` sem texto/placa |

---

### 39. O QUE ESTÁ EXPLICITAMENTE NO JOGO VS INFERÊNCIA

**EXPLÍCITO NO JOGO** (string/código visível ao jogador):
`THRESHOLD A LIMINAL ESCAPE` `index.html:6` `CHÃO 0/1/2` `Config.js:176` `OBJETIVO Encontrar fusível/cartão Restaurar energia Encontrar PECA A/B Ativar GERADOR Coletar FRAGMENTO Estabilizar DISPOSITIVO` `HUD.js:31 Level1.js:95 Level2.js:99` `FUSÍVEL COLETADO CARTÃO ENCONTRADO PECA A/B ENCONTRADA FRAGMENTO COLETADO GERADOR ATIVADO DISPOSITIVO ESTABILIZADO ANOMALIA ESTABILIZADA PORTAL DISPONÍVEL` `Game.js:28/260` `SINAL FRACO... ANOMALIA PRÓXIMA. ELAS OBSERVAM... CONTINUE PELO PORTAL...` `Game.js:38` `VOCÊ FOI CAPTURADO A anomalia alcançou você.` `index.html:202` `MISSÃO CONCLUÍDA Jogador Pontuação Tempo` `index.html:187` `RADAR/CELULAR/LANTERNA [Q]/[F]` `index.html:82` `PAUSADO` `Config.js` valores `fog/score/entityMode`.

**PODE SER INFERIDO, MAS NÃO É EXPLICADO** (jogador pode supor, código não confirma):
- Que `CHÃOs` são Backrooms níveis de profundidade `inferido por paleta amarelo→cinza→roxo + carpet→concrete→metal`, nunca dito.
- Que entidade `Slenderman` é a `anomalia` `inferido por modelos slenderman/` `BackroomsEntity.js:275` e `PHONE_MESSAGES ELAS OBSERVAM`, nunca conectada explicitamente.
- Que portais são anomalias/escapes `inferido por ANOMALIA ESTABILIZADA` `Game.js:260`, sem lore de origem.
- Que `Generator/Stabilizer` estabilizam espaço-tempo `inferido por nome stabilize`, sem descrição ficcional `Level2.js:41` sem texto.
- Que jogador é explorador/preso `inferido por NOME input e Backrooms trope`, sem backstory.
- Que radar `RADAR ENCONTRADO` deveria dar mapa `inferido por texto`, frustrado por bug `HUD.js:206`.

---

### 40. NÃO SUGERIR NOVO ROTEIRO AINDA

Conforme solicitado, **nenhuma lore/personagem/nome de monstro/organização/motivo de portal/cutscene foi criada** — apenas documentado o estado bruto para próxima IA roteirizar.

### 41. FORMATO PARA OUTRA IA

Toda referência acima traz `ARQUIVO: src/...` `CLASSE: Game/Level0/Level1/Level2/BackroomsEntity/Portal/FuseBox/Generator/Stabilizer/GameState/ObjectiveManager/ScoreManager/NokiaPhone/HUD` `MÉTODO: completeObjective/unlockPortal/onPortalEnter/togglePhone/toggleFlashlight/handlePortalEnter/setLevelObjectives/award/rigSlenderman/update` `LINHAS: aproximadas citadas` — replicável sem acesso ao repo.

=== FIM DO SNAPSHOT DE GAME DESIGN E ROTEIRO DO THRESHOLD ===


---

