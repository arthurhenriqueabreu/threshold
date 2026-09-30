# THRESHOLD — Roteiro de Playtest VR Comfort (Quest 3)

Alvo: Meta Quest 3 · Meta Quest Browser · WebXR immersive-vr.
Ajustes de conforto vivem em `CONFIG.xr.comfortProfiles` (pontos iniciais
de playtest, não valores universais). Conforto varia entre indivíduos.

> Itens marcados REQUIRES PHYSICAL QUEST 3 TEST não são automatizáveis:
> percepção, náusea e feel só se avaliam no hardware.

## TESTE A — 5 MIN (base)

- [ ] Parado: vignette = 0, imagem estável (REQUIRES PHYSICAL QUEST 3 TEST)
- [ ] Andar devagar (stick parcial): pouca vignette, velocidade proporcional
- [ ] Andar por grip: aceleração suave, sem tranco
- [ ] Soltar tudo: para rápido, sem sliding longo
- [ ] Snap turn 30° e 45°: sem jump de posição (REQUIRES PHYSICAL QUEST 3 TEST)
- [ ] Interação por ray do controller
- [ ] Trocar perfil no menu: aplica na hora, áudio não reinicia

## TESTE B — 10 MIN (Level 0)

- [ ] Travessia completa do CHÃO 0 em PADRÃO
- [ ] Corrida (ambos grips): sprint gradual + vignette maior
- [ ] Entidade próxima: efeito visual leve, áudio (HRTF/growl) como indicador
- [ ] Portal: fade → nome do nível → aguarda TRIGGER → continua

## TESTE C — CHASE

- [ ] Sprint + snap durante perseguição (REQUIRES PHYSICAL QUEST 3 TEST)
- [ ] Static de captura curta (~0.6s) → fade → game over VR
- [ ] Heartbeat/growl/ducking coerentes com a distância
- [ ] Haptic sutil no início do chase e na captura (se suportado)

## TESTE D — LEVEL 2 (CHÃO 2, hard)

- [ ] Fog curto sem shimmering estranho (REQUIRES PHYSICAL QUEST 3 TEST)
- [ ] Entidade agressiva: dificuldade via IA/áudio, sem estímulo nauseante
- [ ] Flicker como falha de fluorescente lenta, nunca strobo
- [ ] Lanterna + flashlight legíveis no headset

## TESTE E — COMPARAR PERFIS

- [ ] Mesma rota em CONFORTO / PADRÃO / INTENSO (REQUIRES PHYSICAL QUEST 3 TEST)
- [ ] BLINK STEP: foge do chase sem trivializar, sem atravessar paredes
- [ ] Persistência: sair e voltar mantém o último perfil

## Avaliação externa (fora do jogo)

Para avaliação acadêmica, aplicar externamente questionários validados
(SSQ ou VRSQ). O jogo NÃO coleta dados médicos nem diagnostica jogadores.
