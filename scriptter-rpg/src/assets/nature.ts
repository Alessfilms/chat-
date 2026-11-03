import Phaser from 'phaser';
import { P } from './palette';
import { BAYER4, PixelCanvas, rng, valueNoise } from './PixelCanvas';

/**
 * Vegetação gerada pixel a pixel: árvores de copa redonda (estilo RPG top-down),
 * pinheiros, arbustos, tufos de grama animados, flores, pedras e cogumelos
 * mágicos. Iluminação "pintada" de cima-esquerda com dithering ordenado.
 */

interface Blob { x: number; y: number; r: number }

const LEAF_RAMP = [P.leaf0, P.leaf1, P.leaf2, P.leaf3, P.leaf4, P.leaf5];

function shadeBlobs(pc: PixelCanvas, blobs: Blob[], ramp: string[], seed: number, ox = 0, oy = 0, w = pc.w, h = pc.h) {
  const noise = valueNoise(seed);
  const L = { x: -0.55, y: -0.7, z: 0.45 };
  const top = Math.min(...blobs.map((b) => b.y - b.r));
  const bottom = Math.max(...blobs.map((b) => b.y + b.r));
  for (let y = oy; y < oy + h; y++)
    for (let x = ox; x < ox + w; x++) {
      let best: Blob | null = null;
      let bestH = -1;
      for (const b of blobs) {
        const dx = x + 0.5 - b.x, dy = y + 0.5 - b.y;
        const d2 = (dx * dx + dy * dy) / (b.r * b.r);
        if (d2 > 1) continue;
        // a bolha mais "alta" (mais ao sul + mais central) fica por cima
        const hgt = (1 - d2) * b.r + b.y * 0.15;
        if (hgt > bestH) { bestH = hgt; best = b; }
      }
      if (!best) continue;
      const nx = (x + 0.5 - best.x) / best.r, ny = (y + 0.5 - best.y) / best.r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let l = nx * L.x + ny * L.y + nz * L.z;
      // a parte de baixo da copa fica mais escura (oclusão)
      const v = (y - top) / Math.max(1, bottom - top);
      l -= v * 0.35;
      // textura de folhas
      l += (noise(x * 0.35, y * 0.35, 2) - 0.5) * 0.55;
      let idx = (l + 0.55) * 3.2;
      const t = BAYER4[y & 3][x & 3];
      idx = Math.floor(idx + (t - 0.5) * 0.9);
      idx = Math.max(1, Math.min(ramp.length - 1, idx));
      pc.px(x, y, ramp[idx]);
    }
}

function speckleHighlights(pc: PixelCanvas, r: () => number, color: string, count: number, minIdx: string[]) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * pc.w), y = Math.floor(r() * pc.h);
    if (pc.alphaAt(x, y) === 0) continue;
    const [cr, cg, cb] = pc.getRGBA(x, y);
    const hexc = '#' + ((cr << 16) | (cg << 8) | cb).toString(16).padStart(6, '0');
    if (minIdx.includes(hexc)) pc.px(x, y, color);
  }
}

/** Árvore de copa larga. Retorna altura da base (para origin). */
export function bakeOak(scene: Phaser.Scene, key: string, seed: number, size: 'l' | 'm'): void {
  const W = size === 'l' ? 64 : 48, H = size === 'l' ? 80 : 62;
  const pc = new PixelCanvas(W, H);
  const r = rng(seed);
  const baseY = H - 4;
  const cx = W / 2;
  const R = size === 'l' ? 25 : 18;
  const ccy = baseY - (size === 'l' ? 44 : 33);

  // sombra no chão
  pc.ellipse(cx + 2, baseY, R * 0.85, 4.5, P.ink, 70);

  // tronco com raízes
  const tw = size === 'l' ? 8 : 6;
  for (let y = ccy + 6; y <= baseY; y++) {
    const flare = y > baseY - 3 ? (y - (baseY - 3)) : 0;
    for (let x = Math.round(cx - tw / 2 - flare); x < Math.round(cx + tw / 2 + flare); x++) {
      const rel = (x - (cx - tw / 2 - flare)) / (tw + flare * 2);
      const c = rel < 0.25 ? P.bark3 : rel < 0.6 ? P.bark2 : rel < 0.85 ? P.bark1 : P.bark0;
      pc.px(x, y, (x + y * 3) % 7 === 0 ? P.bark1 : c);
    }
  }

  // copa
  const blobs: Blob[] = [{ x: cx, y: ccy, r: R }];
  const n = size === 'l' ? 9 : 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5;
    const d = R * (0.55 + r() * 0.25);
    blobs.push({ x: cx + Math.cos(a) * d, y: ccy + Math.sin(a) * d * 0.85, r: R * (0.38 + r() * 0.18) });
  }
  blobs.push({ x: cx - R * 0.2, y: ccy - R * 0.45, r: R * 0.5 });
  shadeBlobs(pc, blobs, LEAF_RAMP, seed);
  speckleHighlights(pc, r, P.leaf5, 60, [P.leaf4]);
  speckleHighlights(pc, r, P.leaf1, 70, [P.leaf2, P.leaf3]);
  pc.outline(P.ink);
  scene.textures.addCanvas(key, pc.commit());
}

/** Pinheiro em camadas. */
export function bakePine(scene: Phaser.Scene, key: string, seed: number): void {
  const W = 36, H = 64;
  const pc = new PixelCanvas(W, H);
  const r = rng(seed);
  const baseY = H - 4, cx = W / 2;
  pc.ellipse(cx + 1, baseY, 11, 3.5, P.ink, 70);
  pc.rect(cx - 2, baseY - 10, 4, 10, P.bark1);
  pc.vline(cx - 2, baseY - 10, baseY, P.bark2);
  const tiers = 5;
  for (let t = 0; t < tiers; t++) {
    const ty = 4 + t * 9;
    const th = 14;
    const half = 5 + t * 2.6;
    for (let y = 0; y < th; y++) {
      const wHere = (y / th) * half + (y === th - 1 ? 0 : 0);
      for (let x = Math.round(cx - wHere); x <= Math.round(cx + wHere); x++) {
        const rel = (x - (cx - wHere)) / Math.max(1, wHere * 2);
        let idx = rel < 0.3 ? 3 : rel < 0.6 ? 2 : rel < 0.85 ? 1 : 0;
        if (y > th - 3) idx = Math.max(0, idx - 1);
        const jag = y === th - 1 && (x + t) % 3 === 0;
        if (jag) continue;
        if (BAYER4[(ty + y) & 3][x & 3] > 0.8 && idx > 0) idx--;
        pc.px(x, ty + y, [P.pine0, P.pine1, P.pine2, P.pine3][idx]);
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * (baseY - 10));
    if (pc.alphaAt(x, y)) pc.px(x, y, P.leaf3);
  }
  pc.outline(P.ink);
  scene.textures.addCanvas(key, pc.commit());
}

/** Arbusto com flores opcionais. */
export function bakeBush(scene: Phaser.Scene, key: string, seed: number, flowers?: string): void {
  const W = 26, H = 18;
  const pc = new PixelCanvas(W, H);
  const r = rng(seed);
  pc.ellipse(W / 2 + 1, H - 3, 10, 2.5, P.ink, 70);
  const blobs: Blob[] = [
    { x: 9, y: 9, r: 6 }, { x: 16, y: 9, r: 6 }, { x: 12.5, y: 6, r: 6 },
  ];
  shadeBlobs(pc, blobs, LEAF_RAMP, seed);
  if (flowers) for (let i = 0; i < 7; i++) {
    const x = 5 + Math.floor(r() * 16), y = 3 + Math.floor(r() * 9);
    if (pc.alphaAt(x, y)) { pc.px(x, y, flowers); if (r() < 0.5) pc.px(x + 1, y, P.petal2); }
  }
  pc.outline(P.ink);
  scene.textures.addCanvas(key, pc.commit());
}

/** Tufos de grama: 3 quadros de balanço (esquerda, centro, direita). */
export function bakeGrassTufts(scene: Phaser.Scene, key: string): void {
  const FW = 8, FH = 7, variants = 3;
  const pc = new PixelCanvas(FW * 3, FH * variants);
  const cols = [P.grass3, P.grass4, P.grass5, P.moss];
  for (let v = 0; v < variants; v++) {
    const r = rng(77 + v);
    const blades = 4 + v;
    const bl = Array.from({ length: blades }, () => ({ x: 1 + Math.floor(r() * 6), h: 3 + Math.floor(r() * 3), c: cols[Math.floor(r() * cols.length)] }));
    for (let f = 0; f < 3; f++) {
      const sway = f - 1;
      for (const b of bl)
        for (let k = 0; k < b.h; k++) {
          const lean = k >= b.h - 2 ? sway : 0;
          pc.px(f * FW + b.x + lean, v * FH + FH - 1 - k, k === b.h - 1 ? P.moss : b.c);
        }
    }
  }
  const tex = scene.textures.addCanvas(key, pc.commit())!;
  for (let v = 0; v < variants; v++) for (let f = 0; f < 3; f++) tex.add(`${v}-${f}`, 0, f * FW, v * FH, FW, FH);
}

/** Pequenos itens de chão: flores, pedras, cogumelos mágicos, folhas. */
export function bakeSmallDecor(scene: Phaser.Scene): void {
  // flores 5x5 (3 cores)
  const fl = new PixelCanvas(15, 5);
  [P.petal, P.gold3, '#9fd3f0'].forEach((c, i) => {
    const ox = i * 5;
    fl.px(ox + 2, 4, P.grass4); fl.px(ox + 2, 3, P.grass4);
    fl.px(ox + 2, 1, P.fire4); fl.px(ox + 1, 1, c); fl.px(ox + 3, 1, c); fl.px(ox + 2, 0, c); fl.px(ox + 2, 2, c);
  });
  const ft = scene.textures.addCanvas('flower', fl.commit())!;
  for (let i = 0; i < 3; i++) ft.add(String(i), 0, i * 5, 0, 5, 5);

  // pedras
  const st = new PixelCanvas(20, 8);
  st.ellipse(4.5, 4.5, 4, 3, P.stone1);
  st.px(3, 3, P.stone2); st.px(4, 2, P.stone3); st.px(2, 4, P.stone2);
  st.ellipse(14.5, 5, 5, 2.6, P.stone1);
  st.px(12, 4, P.stone3); st.px(13, 3, P.stone2); st.hline(12, 17, 7, P.stone0);
  st.outline(P.ink);
  const stt = scene.textures.addCanvas('rock', st.commit())!;
  stt.add('0', 0, 0, 0, 10, 8); stt.add('1', 0, 10, 0, 10, 8);

  // cogumelos mágicos (brilham à noite)
  const mu = new PixelCanvas(16, 7);
  const mush = (ox: number, cap: string, capL: string) => {
    mu.rect(ox + 2, 4, 2, 3, P.paper2);
    mu.rect(ox + 0, 2, 6, 2, cap); mu.rect(ox + 1, 1, 4, 1, cap);
    mu.px(ox + 2, 1, capL); mu.px(ox + 1, 2, capL); mu.px(ox + 4, 2, P.white);
  };
  mush(0, '#4fc3c9', '#a9f0f0');
  mush(8, P.violet2, P.violet3);
  mu.outline(P.ink);
  const mt = scene.textures.addCanvas('mushroom', mu.commit())!;
  mt.add('0', 0, 0, 0, 8, 7); mt.add('1', 0, 8, 0, 8, 7);

  // folha caindo: 4 quadros girando
  const lf = new PixelCanvas(16, 4);
  const shapes = [
    [[0, 1], [1, 1], [2, 1], [1, 0], [2, 2]],
    [[1, 0], [1, 1], [1, 2], [2, 1]],
    [[0, 1], [1, 1], [2, 1], [1, 2], [0, 0]],
    [[1, 0], [1, 1], [1, 2], [0, 1]],
  ];
  shapes.forEach((sh, i) => sh.forEach(([x, y], k) => lf.px(i * 4 + x, y, k === 0 ? P.leaf5 : P.leaf4)));
  const lt = scene.textures.addCanvas('leaf', lf.commit())!;
  for (let i = 0; i < 4; i++) lt.add(String(i), 0, i * 4, 0, 4, 4);

  // pontos de luz de 1px e 2px (vagalumes, faíscas, pétalas)
  const dots: [string, string, number][] = [
    ['px-firefly', P.firefly, 1], ['px-ember', P.fire3, 1], ['px-ember2', P.fire4, 1],
    ['px-petal', P.petal, 1], ['px-petal2', P.petal2, 1], ['px-gold', P.gold3, 1],
    ['px-white', '#ffffff', 1], ['px-violet', P.violet3, 1], ['px-steam', P.steam, 2],
  ];
  for (const [k, c, s] of dots) {
    const d = new PixelCanvas(s, s);
    d.rect(0, 0, s, s, c);
    scene.textures.addCanvas(k, d.commit());
  }
  // vagalume com halo (3x3)
  const ff = new PixelCanvas(3, 3);
  ff.px(1, 1, P.firefly); ff.px(0, 1, P.firefly2, 140); ff.px(2, 1, P.firefly2, 140); ff.px(1, 0, P.firefly2, 140); ff.px(1, 2, P.firefly2, 140);
  scene.textures.addCanvas('firefly', ff.commit());
}

/** Folhagem escura de primeiro plano (parallax) — silhuetas de galhos. */
export function bakeForegroundLeaves(scene: Phaser.Scene): void {
  for (let v = 0; v < 3; v++) {
    const W = 96, H = 96;
    const pc = new PixelCanvas(W, H);
    const r = rng(500 + v);
    const blobs: Blob[] = [];
    for (let i = 0; i < 10; i++) blobs.push({ x: r() * W, y: r() * H, r: 10 + r() * 16 });
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let inside = false, edge = false;
        for (const b of blobs) {
          const d = Math.hypot(x - b.x, y - b.y) / b.r;
          if (d <= 1) { inside = true; if (d > 0.82) edge = true; }
        }
        if (inside) pc.px(x, y, edge && BAYER4[y & 3][x & 3] > 0.5 ? '#0d1a1c' : '#060c0e');
      }
    scene.textures.addCanvas(`fg-leaves-${v}`, pc.commit());
  }
}
