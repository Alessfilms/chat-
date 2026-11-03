# SCRIPTTER — experiência narrativa em pixel art

Um pequeno RPG indie top-down usado para contar a história do Scriptter nas redes sociais.
Phaser 3 + TypeScript + Vite, vertical 9:16.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # gera dist/ (site estático)
```

## 1. Análise da referência

| Aspecto | O que a referência faz | Como o Scriptter adota |
|---|---|---|
| Escala | Pixels grandes e uniformes; o personagem tem ~16px de altura, a tela mostra ~20 tiles de largura | Mundo desenhado em 1x e câmera repousando em zoom **inteiro** (3, 2 ou 1) |
| Câmera | Top-down puro, clareira no centro | Mesma visão, com travessia da floresta pela trilha |
| Personagens | Chibi (cabeça grande), contorno preto de 1px, sombra elíptica | Sprites 16×20 com contorno automático e sombra embutida |
| Iluminação | Escuridão azul-esverdeada; círculo quente em volta da fogueira em faixas | Camada de luz em meia resolução (blocos de 2px), faixas com dithering, blend multiply |
| Vegetação | Copas redondas com 3–4 tons, contorno escuro; chão pontilhado | Copas geradas por bolhas sombreadas de cima-esquerda; chão pintado pixel a pixel |
| Partículas | Pontos rosa/brancos/amarelos espalhados (pétalas, vagalumes) | Pétalas, poeira dourada, vagalumes que iluminam o chão, faíscas |
| Interface | Placas escuras de borda creme sobre a cabeça | Mesma linguagem nas placas, painéis 9-slice, fonte bitmap própria |

Nenhum asset da referência foi copiado: todos os sprites são **gerados por código, pixel a pixel**
(`src/assets/*.ts`), com paleta própria (`src/assets/palette.ts`): noite em verde/azul/roxo, luz em amarelo/laranja, magia em dourado/violeta.

## 2. Arquitetura

```
scriptter-rpg/
├─ public/                         ← conteúdo editável sem recompilar
│  ├─ episodes/
│  │  ├─ episodes.json             ← lista de episódios (mapa, áudio, contagem inicial…)
│  │  ├─ ep01/ timeline.json · dialogues.json · narration.mp3
│  │  ├─ ep02/ … ep05/             ← solte um narration.mp3 em cada pasta
│  └─ api/social.json              ← exemplo/mock da API de seguidores
└─ src/
   ├─ main.ts                      ← config Phaser (pixelArt, antialias:false, roundPixels)
   ├─ config.ts                    ← resolução, tile, zooms, camadas de profundidade
   ├─ scenes/   Boot · Title · Episode (mundo) · UI (interface)
   ├─ entities/ Character · Campfire · ScriptterMachine
   ├─ systems/  CameraDirector · LightingSystem · AmbientSystem · CrowdSystem
   │            WorldBuilder · WorldEvolution · SocialBridge · InputController · EventBus
   │            timeline/ TimelineSystem · actions · Director
   ├─ components/ PixelText · Nameplate · HistorianCounter · DialogueBox · Caption
   │              Toasts · ScrollPanel · VirtualPad
   ├─ assets/   palette · PixelCanvas · font · characters · nature · ground · props · machine · ui
   ├─ audio/    NarrationPlayer (relógio mestre) · Sfx (efeitos sintetizados)
   └─ data/     types · characters · stages · social · maps/
```

O mundo (`EpisodeScene`) e a interface (`UIScene`) só conversam pelo `EventBus`.
A timeline só fala com o mundo pela interface `Director`, então ações novas não mexem nas cenas.

## 3. Resolução e tiles

- **Resolução base 360×640** (9:16), `Scale.FIT` centralizado, CSS `image-rendering: pixelated`.
- **Tile de 16px** (grade de posicionamento, colisão e mapas futuros). O mapa da clareira tem 80×80 tiles.
- Câmera do mundo em **zoom 3 / 2 / 1**: as transições passam por valores intermediários, mas o quadro parado é sempre pixel-perfect.
- A UI fica numa câmera separada, em escala inteira 2× (texto) e 1× (detalhes).
- `pixelArt: true`, `antialias: false`, `antialiasGL: false`, `roundPixels: true`.

## 4. Sprites

- `PixelCanvas` desenha pixel por pixel (Bresenham, discos sem antialias, contorno automático, espelhamento, dithering Bayer).
- **Personagens** (`assets/characters.ts`): "paper doll" 16×20, sheet de 4 direções × 10 quadros
  `idle(2) · walk(4) · interact(2) · celebrate(2)`. Direita = espelho da esquerda.
  - **Protagonista A**: cabelo castanho bagunçado, cachecol vermelho que tremula, idle mais energético.
  - **Protagonista B**: cabelo escuro, óculos, casaco azul-noite, livro (abre o livro no `interact`).
- **Multidão**: 28 variações (cabelo, pele, roupa, capuz, chapéu, cachecol, óculos) × 9 quadros leves.
- Para trocar por arte feita à mão: carregue PNGs com as mesmas chaves no `BootScene` (ex.: `hero-a` com quadros `down-0…up-9`).

## 5. Câmera (`systems/CameraDirector.ts`)

`moveTo(x, y, zoom, ms, ease)` faz pan + zoom num único tween (movimento de grua) · `follow()` suave no modo exploração ·
`shake()` leve · `breathe` (balanço lentíssimo) · `zoomForRadius()` escolhe o maior zoom inteiro que enquadra a multidão.
Parallax: galhos escuros em primeiro plano (scrollFactor 1.35) e duas camadas de neblina com velocidades diferentes.

## 6. Timeline sincronizada com o áudio

O relógio mestre é o **próprio `<audio>`** (`currentTime`): a animação nunca escorrega da voz.
Sem áudio, um relógio interno assume (os EP02–05 rodam assim até você colocar o `narration.mp3`).

```json
{ "time": "00:06", "action": "showCharacters", "params": { "ids": ["A", "B"] } }
```

`time` aceita `6`, `"00:06"` ou `"01:02.5"`. Campo `note` é comentário livre.

| Ação | Parâmetros |
|---|---|
| `camera` | `to` (âncora ou `{x,y}`), `dx`, `dy`, `zoom`, `duration`, `ease` |
| `cameraJump` · `cameraFit` · `cameraShake` · `cameraFollow` · `cameraBreathe` | |
| `fade` · `letterbox` | `to` / `on`, `duration` |
| `caption` | `text` (use `\n`), `duration`, `position`: `top`/`center`/`low` |
| `dialogue` | `speaker`+`text` **ou** `line` (chave do dialogues.json) + `index`; `who`: `A`/`B` anima quem fala |
| `titleCard` · `toast` · `endCard` · `counter` · `episodeTag` · `hideCaption` · `hideDialogue` | |
| `igniteFire` · `fireBurst` | |
| `showCharacters` · `hideCharacters` · `showNames` · `anim` · `face` · `walk` · `celebrate` | `anim`: idle/walk/interact/celebrate; `dir`: down/left/right/up |
| `historians` | `count`, `duration` (as chegadas se espalham nesse tempo) |
| `syncApi` | passa a seguir os seguidores reais |
| `revealMachine` · `activateMachine` · `deactivateMachine` · `printStory` · `hideScroll` | `printStory`: `title`, `text`, `user` |
| `ambient` | `fog`, `fireflies`, `leaves` (frequência ms, 0 desliga), `foreground`, `daylight` |
| `stage` | `id`: clearing/houses/village/city/kingdom |
| `sfx` · `mode` · `mark` | |

Âncoras do mapa: `fire`, `heroA`, `heroB`, `machine`, `forestSouth`, `forestMid`, `forestEdge`, `north`.

**A timeline do EP01 foi alinhada às pausas reais da narração enviada** (17 falas detectadas por silêncio).
Não foi possível transcrever o áudio aqui, então as legendas usam os textos do roteiro; confira e ajuste os `time` se precisar.

### Sincronizando na prática
Abra com `?debug=1`: aparece o tempo atual e o próximo evento. **ESPAÇO** pausa, **←/→** pula entre eventos, **R** reinicia.
Para começar num ponto: `?ep=ep01&autostart=1&t=40&debug=1`.

## 7. Modos

- **STORY MODE**: narração + timeline. Botões discretos de pausa e "Explorar" (oculte com `?clean=1` para gravar).
- **EXPLORE MODE**: controle o HISTORIADOR 001 (setas/WASD + E, ou d-pad e botão A no celular). Converse com o 002,
  com os historiadores, leia a placa, olhe a fogueira e use a Scriptter (imprime histórias). Colisão com árvores, adereços e multidão.

## 8. Ações sociais → acontecimentos no mundo

| Instagram | No universo |
|---|---|
| FOLLOW | um historiador caminha da floresta até a fogueira (+ notificação) |
| COMENTÁRIO | a Scriptter liga, engrenagens giram, sai um pergaminho com o texto |
| META | o mapa evolui (`data/stages.ts`) |

| Seguidores | Estágio |
|---|---|
| 0 | A CLAREIRA |
| 500 | PRIMEIRAS CASAS (casas, tendas, lampiões, trilhas) |
| 1.000 | PEQUENA VILA (mais casas, poço, praça) |
| 5.000 | CIDADE (muralha, torres) |
| 10.000 | GRANDE REINO DOS HISTORIADORES (castelo) |

A floresta recua, o chão é repintado com a clareira maior e as construções "brotam" com poeira. O EP05 demonstra 200 → 500 → 1.000.

### Conectando a contagem real
```
?live=1                         → faz polling de public/api/social.json
?api=https://seu-backend/x.json → endpoint próprio (CORS liberado)
?poll=15                        → intervalo em segundos
?count=742                      → força um número (para gravar)
```
Formato: `{ "historianCount": 742, "comments": [{ "user": "ana", "text": "..." }], "events": [{ "type": "follow", "user": "joao" }] }`

Também é possível empurrar dados por JS (`window.scriptter.setHistorianCount(742)`, `.follow('joao')`, `.comment('ana','...')`)
ou por `postMessage({ type: 'scriptter:historianCount', value: 742 })` de um iframe pai.
O Instagram não oferece contagem pública em tempo real: o backend precisa usar a Instagram Graph API (conta Business/Creator) e expor esse JSON.

## 9. Performance da multidão

Quem já chegou vira um *Bob* dentro de um `Blitter` (um draw call por faixa de 16px de altura, ordenadas por Y).
Quem está caminhando usa um pool fixo de 48 sprites. Cada estágio define `maxVisibleCrowd`; acima dele o contador continua subindo,
mas não se criam mais sprites.

## 10. Episódios

Cada episódio tem pasta própria em `public/episodes/epXX/` com `timeline.json`, `dialogues.json` e `narration.mp3`,
e aponta para um mapa em `src/data/maps/`. EP03 (O Rei) ainda usa a clareira: o próximo passo é criar o mapa do castelo e registrá-lo em `maps/index.ts`.
