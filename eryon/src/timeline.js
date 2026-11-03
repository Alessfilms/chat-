// Linha do tempo derivada da análise do áudio (silencedetect -35dB: 23 segmentos de fala = 23 orações do roteiro).
export const DURATION = 51.6;
export const AUDIO_END = 50.68; // fim da última palavra ("Eryon?") -> corte para preto
export const LINES = [
  [0.00, 2.63, 'Essa página tem apenas 2 seguidores.'],
  [3.07, 3.62, 'Mas aqui,'],
  [4.12, 6.36, 'cada seguidor se torna um morador.'],
  [6.92, 8.67, 'E assim começa Eryon.'],
  [9.24, 11.58, 'Uma cidade em um território misterioso,'],
  [11.88, 13.66, 'onde ninguém jamais chegou.'],
  [14.28, 14.82, 'Por enquanto,'],
  [15.31, 17.60, 'tudo o que existe é uma pequena clareira…'],
  [18.16, 19.27, 'e dois moradores.'],
  [19.84, 21.64, 'Não há casas. Não há ruas.'],
  [22.01, 23.36, 'Não há nada construído.'],
  [23.92, 25.80, 'Mas isso está prestes a mudar.'],
  [26.17, 30.01, 'Porque cada novo seguidor será um novo habitante de Eryon.'],
  [30.60, 32.07, 'Quanto mais pessoas chegarem,'],
  [32.33, 33.84, 'mais a cidade vai crescer.'],
  [34.45, 35.88, 'Casas serão construídas.'],
  [36.20, 38.04, 'Novos lugares serão explorados.'],
  [38.47, 39.06, 'E talvez'],
  [39.37, 41.63, 'existam coisas escondidas nesse mundo'],
  [41.93, 43.41, 'que ainda nem conhecemos.'],
  [44.05, 45.73, 'Hoje somos apenas dois.'],
  [46.24, 47.58, 'Agora resta descobrir…'],
  [48.17, 50.68, 'quem será o terceiro morador de Eryon?'],
];
// Planos (cortes posicionados nas pausas da narração)
export const SHOTS = [
  ['territory', 0.00, 9.00],
  ['wild', 9.00, 14.00],
  ['reveal', 14.00, 19.55],
  ['empty', 19.55, 23.65],
  ['change', 23.65, 30.30],
  ['growth', 30.30, 34.15],
  ['house', 34.15, 36.05],
  ['bridge', 36.05, 37.30],
  ['ruins', 37.30, 38.30],
  ['mystery', 38.30, 43.75],
  ['final', 43.75, DURATION],
];
export function shotAt(t) { for (const s of SHOTS) if (t >= s[1] && t < s[2]) return s; return SHOTS[SHOTS.length - 1]; }
