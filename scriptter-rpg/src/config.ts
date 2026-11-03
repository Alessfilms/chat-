/**
 * Constantes globais do projeto.
 *
 * Resolução base 360x640 (9:16). O mundo é desenhado em pixels de 1x e a câmera
 * do mundo repousa sempre em zoom inteiro (3, 2 ou 1). Durante as transições o
 * zoom passa por valores intermediários, mas sempre termina numa grade inteira,
 * então o quadro parado é pixel-perfect.
 */
export const GAME_W = 360;
export const GAME_H = 640;

/** Tamanho do tile da grade do mundo (posicionamento, colisão, mapas futuros). */
export const TILE = 16;

/** Zoom em que a câmera do mundo pode repousar. */
export const ZOOM_LEVELS = [4, 3, 2, 1] as const;

/** Escala inteira da UI (1 pixel da fonte = 2 pixels do canvas). */
export const UI_SCALE = 2;

/** Profundidades (depth) das camadas do mundo. */
export const DEPTH = {
  ground: 0,
  groundDecor: 5,
  /** Entidades usam DEPTH.entities + y, para ordenar de cima para baixo. */
  entities: 1000,
  canopyHigh: 5000,
  fog: 8000,
  lightMultiply: 8500,
  lightAdd: 8600,
  glowParticles: 8700,
  labels: 8800,
  foreground: 9000,
} as const;

/** Lê parâmetros de URL (ex.: ?ep=ep02&mode=explore&debug=1&api=...). */
export const URL_PARAMS = new URLSearchParams(window.location.search);

export const DEBUG = URL_PARAMS.has('debug');

/**
 * Modo captura (?capture=1): o relógio da narração é controlado de fora
 * (window.__captureTime) e o loop é avançado quadro a quadro por um script,
 * para exportar vídeo fluido em qualquer máquina. Ver scripts/render-video.cjs.
 */
export const CAPTURE = URL_PARAMS.has('capture');
