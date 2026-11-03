import { rgb } from './palette';

/**
 * Tela de desenho pixel a pixel. Todo asset do Scriptter é desenhado aqui,
 * pixel por pixel, em resolução nativa (sem escala, sem antialias), e depois
 * registrado como textura no Phaser. Isso garante pixel art verdadeira.
 */
export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly w: number;
  readonly h: number;
  private data: Uint8ClampedArray;
  private img: ImageData;
  private ctx: CanvasRenderingContext2D;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false;
    this.img = this.ctx.createImageData(w, h);
    this.data = this.img.data;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  px(x: number, y: number, color: string | null, alpha = 255): void {
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    if (color === null) {
      this.data[i + 3] = 0;
      return;
    }
    const [r, g, b] = rgb(color);
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = alpha;
  }

  pxRGBA(x: number, y: number, r: number, g: number, b: number, a: number): void {
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  alphaAt(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  getRGBA(x: number, y: number): [number, number, number, number] {
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  rect(x: number, y: number, w: number, h: number, color: string | null, alpha = 255): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color, alpha);
  }

  hline(x0: number, x1: number, y: number, color: string): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, color);
  }

  vline(x: number, y0: number, y1: number, color: string): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, color);
  }

  /** Linha de Bresenham (sem antialias). */
  line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Disco preenchido (teste por pixel, borda serrilhada de propósito). */
  disc(cx: number, cy: number, r: number, color: string, alpha = 255): void {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) this.px(x, y, color, alpha);
      }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, alpha = 255): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, color, alpha);
      }
  }

  /**
   * Contorno automático: todo pixel transparente vizinho (4 direções) de um
   * pixel opaco recebe a cor de contorno. Só considera a região informada.
   */
  outline(color: string, region?: { x: number; y: number; w: number; h: number }, minAlpha = 200): void {
    const rx = region?.x ?? 0, ry = region?.y ?? 0;
    const rw = region?.w ?? this.w, rh = region?.h ?? this.h;
    const marks: number[] = [];
    for (let y = ry; y < ry + rh; y++)
      for (let x = rx; x < rx + rw; x++) {
        if (this.alphaAt(x, y) > 0) continue;
        const n = (xx: number, yy: number) =>
          xx >= rx && yy >= ry && xx < rx + rw && yy < ry + rh && this.alphaAt(xx, yy) >= minAlpha;
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) marks.push(x, y);
      }
    for (let i = 0; i < marks.length; i += 2) this.px(marks[i], marks[i + 1], color);
  }

  /** Copia uma região espelhada horizontalmente para outro lugar. */
  mirrorRegion(sx: number, sy: number, w: number, h: number, dx: number, dy: number): void {
    const tmp: number[][] = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) tmp.push(this.getRGBA(sx + x, sy + y));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [r, g, b, a] = tmp[y * w + (w - 1 - x)];
        this.pxRGBA(dx + x, dy + y, r, g, b, a);
      }
  }

  /** Copia uma região de outra PixelCanvas (respeita transparência). */
  blit(src: PixelCanvas, sx: number, sy: number, w: number, h: number, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [r, g, b, a] = src.getRGBA(sx + (flipX ? w - 1 - x : x), sy + y);
        if (a === 0) continue;
        this.pxRGBA(dx + x, dy + y, r, g, b, a);
      }
  }

  /** Grava os pixels no canvas e devolve o elemento. */
  commit(): HTMLCanvasElement {
    this.ctx.putImageData(this.img, 0, 0);
    return this.canvas;
  }
}

/** Gerador pseudoaleatório determinístico (mulberry32) — assets idênticos a cada execução. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Matriz de Bayer 4x4 para dithering ordenado. */
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));

/** Ruído de valor 2D simples e determinístico (para chão, neblina, copas). */
export function valueNoise(seed: number) {
  const perm = new Uint8Array(512);
  const r = rng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (ix: number, iy: number) => perm[(perm[ix & 255] + iy) & 511] / 255;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const n = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const a = grad(ix, iy), b = grad(ix + 1, iy), c = grad(ix, iy + 1), d = grad(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x: number, y: number, octaves = 3) => {
    let v = 0, amp = 1, f = 1, tot = 0;
    for (let o = 0; o < octaves; o++) {
      v += n(x * f, y * f) * amp;
      tot += amp;
      amp *= 0.5;
      f *= 2;
    }
    return v / tot;
  };
}
