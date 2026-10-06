# Scriptter Motion System

Protótipo interativo das animações sobre a interface atual do Scriptter. Abra `index.html`. O painel à esquerda leva direto a cada tela, liga o Reduzir movimento e mostra os haptics disparados.

O código do app ainda não está neste repositório. Este protótipo é a referência executável para portar o sistema para a stack real.

## Arquivos

| Arquivo | Papel |
|---|---|
| `motion.js` | Tokens, solver de spring (gera easing `linear()`), `animate()` interrompível, haptics, press feedback declarativo (`data-press`) e Reduce Motion |
| `app.js` | Telas, navegação (push, transição compartilhada, troca de modo), gestos e microinterações |
| `styles.css` | Visual fiel às telas atuais e fontes embutidas |

## Tokens

| Token | Valor | Uso |
|---|---|---|
| `motion.press` / `fast` | 140ms | toque, microinterações |
| `motion.normal` | 240ms | troca de estado, troca de modo |
| `motion.slow` | 420ms | entradas, dim do sheet |
| `motion.cinematic` | 520ms | documento → editor |
| `motion.chart` | 800ms | gráfico da Análise |
| `spring.snappy` | k 620, c 34 | soltar o press, ícones, cápsula do X |
| `spring.standard` | k 360, c 32 | navegação, indicadores deslizantes, drag |
| `spring.soft` | k 210, c 27 | sheets, painéis, menu radial |
| `spring.pop` | k 460, c 24 | itens do menu radial, chips, novos itens |
| `spring.gentle` | k 150, c 22 | entrada de conteúdo |
| `stagger` | radial 40, cards 40, chips 80, cenas 70, lista 45 | |

## Como portar

| Conceito | SwiftUI | React Native (Reanimated) | Flutter |
|---|---|---|---|
| spring `{k, c}` | `.interpolatingSpring(stiffness:damping:)` | `withSpring(v, { stiffness, damping, mass: 1 })` | `SpringDescription(mass: 1, stiffness:, damping:)` |
| press `data-press` | `ButtonStyle` com `scaleEffect` | `Pressable` + `useAnimatedStyle` | `GestureDetector` + `AnimatedScale` |
| documento → editor | `matchedGeometryEffect` | Shared Element Transitions (Reanimated 3) | `Hero` |
| cápsula persistente / indicadores | `matchedGeometryEffect` no mesmo `Namespace` | `useSharedValue` de `translateX` | `AnimatedPositioned` |
| sheet com drag | `.presentationDetents` / `DragGesture` | Gesture Handler `Pan` + `withSpring` | `DraggableScrollableSheet` |
| haptics | `.sensoryFeedback(.selection / .impact / .success / .warning)` | `expo-haptics` | `HapticFeedback` |
| Reduce Motion | `@Environment(\.accessibilityReduceMotion)` | `useReducedMotion()` | `MediaQuery.disableAnimations` |

## Decisões

- **Só propriedades do compositor:** transform, opacity e scale. Há duas exceções, cada uma em um único elemento por vez:
  - o tamanho do quadro na troca de formato do Storyboard, para o crop acompanhar;
  - o `clip-path` que desenha o gráfico da Análise.
- **Animações interrompíveis:** com `fromCurrent`, uma animação nova parte do valor atual. Gestos cancelam a animação em curso e seguem o dedo.
- **Reduzir movimento:** movimentos viram crossfades de no máximo 180ms. Os loops decorativos (hero, pena, shimmer) param, e a geração da IA aparece inteira.
- **Texto do roteiro parado:** o texto nunca se move durante a escrita. Só as ferramentas animam.
