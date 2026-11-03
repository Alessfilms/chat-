import Phaser from 'phaser';
import { P } from './palette';
import { BAYER4, PixelCanvas, valueNoise } from './PixelCanvas';

/**
 * Texturas de interface (painéis 9-slice, ícones, botões de toque), luzes
 * radiais em faixas com dithering e a textura de neblina.
 */
export function bakeUI(scene: Phaser.Scene): void {
  // painel escuro com borda creme (igual às placas de nome da referência, mas com cantos recortados)
  const panel = (key: string, bg: string, edge: string, edgeDark: string) => {
    const pc = new PixelCanvas(12, 12);
    pc.rect(1, 1, 10, 10, bg);
    pc.rect(1, 0, 10, 1, P.ink); pc.rect(1, 11, 10, 1, P.ink); pc.rect(0, 1, 1, 10, P.ink); pc.rect(11, 1, 1, 10, P.ink);
    pc.rect(2, 1, 8, 1, edge); pc.rect(2, 10, 8, 1, edgeDark); pc.rect(1, 2, 1, 8, edge); pc.rect(10, 2, 1, 8, edgeDark);
    pc.px(1, 1, edge); pc.px(10, 10, edgeDark); pc.px(10, 1, edge); pc.px(1, 10, edgeDark);
    pc.rect(2, 2, 8, 1, bg);
    scene.textures.addCanvas(key, pc.commit());
  };
  panel('ui-panel', P.uiBg, P.uiEdge, P.uiEdgeDark);
  panel('ui-panel-gold', P.uiBg2, P.gold3, P.gold1);
  panel('ui-panel-violet', P.violet0, P.violet3, P.violet1);

  // pergaminho 9-slice
  const sc = new PixelCanvas(16, 16);
  sc.rect(1, 0, 14, 16, P.paper3);
  sc.vline(0, 1, 14, P.ink); sc.vline(15, 1, 14, P.ink); sc.hline(1, 14, 0, P.ink); sc.hline(1, 14, 15, P.ink);
  sc.vline(1, 1, 14, P.paper2); sc.vline(14, 1, 14, P.paper1); sc.hline(1, 14, 14, P.paper1);
  scene.textures.addCanvas('ui-scroll', sc.commit());
  // rolo do pergaminho (topo/base)
  const roll = new PixelCanvas(16, 6);
  roll.rect(0, 1, 16, 4, P.paper1); roll.hline(0, 15, 1, P.paper2); roll.hline(0, 15, 4, P.paper0);
  roll.outline(P.ink);
  scene.textures.addCanvas('ui-scroll-roll', roll.commit());

  // ícones 9x9
  const icon = (key: string, rows: string[], pal: Record<string, string>) => {
    const pc = new PixelCanvas(rows[0].length, rows.length);
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) pc.px(x, y, pal[ch]); }));
    scene.textures.addCanvas(key, pc.commit());
  };
  // historiador (pena)
  icon('icon-quill', [
    '.......kk',
    '......kwk',
    '.....kwgk',
    '....kwgk.',
    '...kwgk..',
    '..kwgk...',
    '.kggk....',
    '.kk......',
    'k........',
  ], { k: P.ink, w: P.paper3, g: P.gold2 });
  icon('icon-person', [
    '...kkk...',
    '..kssk...',
    '..kssk...',
    '...kk....',
    '.kvvvvk..',
    'kvvvvvvk.',
    'kvvvvvvk.',
    '.kvvvvk..',
    '..k..k...',
  ].map((r) => r.padEnd(9, '.')), { k: P.ink, s: P.skin0, v: P.violet2 });
  icon('icon-scroll', [
    '.kkkkkkk.',
    'kpppppppk',
    '.kwwwwwk.',
    '.kwddwwk.',
    '.kwwwwwk.',
    '.kwdddwk.',
    '.kwwwwwk.',
    'kpppppppk',
    '.kkkkkkk.',
  ], { k: P.ink, p: P.paper1, w: P.paper3, d: P.paper0 });
  icon('icon-gear', [
    '...k.k...',
    '.kkgggkk.',
    '.kgggggk.',
    'kggkkkggk',
    '.ggk.kgg.',
    'kggkkkggk',
    '.kgggggk.',
    '.kkgggkk.',
    '...k.k...',
  ], { k: P.ink, g: P.brass3 });
  icon('icon-house', [
    '....k....',
    '...krk...',
    '..krrrk..',
    '.krrrrrk.',
    'kkkkkkkkk',
    '.kwwwwwk.',
    '.kwykdwk.',
    '.kwwkdwk.',
    '.kkkkkkk.',
  ], { k: P.ink, r: P.dirt3, w: P.paper2, y: P.fire4, d: P.wood2 });

  // botões de toque (d-pad e ação)
  const dpad = new PixelCanvas(44, 44);
  const arm = (x: number, y: number, w: number, h: number) => { dpad.rect(x, y, w, h, P.uiBg2); };
  arm(15, 1, 14, 42); arm(1, 15, 42, 14);
  dpad.outline(P.ink);
  const tri = (cx: number, cy: number, dx: number, dy: number) => {
    for (let i = 0; i < 4; i++) for (let j = -i; j <= i; j++) dpad.px(cx + dx * (3 - i) + (dy ? j : 0), cy + dy * (3 - i) + (dx ? j : 0), P.uiEdge);
  };
  tri(22, 7, 0, -1); tri(22, 36, 0, 1); tri(7, 22, -1, 0); tri(36, 22, 1, 0);
  scene.textures.addCanvas('ui-dpad', dpad.commit());
  const btn = (key: string, label: string) => {
    const b = new PixelCanvas(26, 26);
    b.disc(13, 13, 12, P.uiBg2); b.disc(13, 12, 10, P.violet1);
    b.outline(P.ink);
    const glyphs: Record<string, string[]> = {
      A: ['.###.', '#...#', '#####', '#...#', '#...#'],
      B: ['####.', '#...#', '####.', '#...#', '####.'],
    };
    glyphs[label].forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') b.px(11 + x, 10 + y, P.uiText); }));
    scene.textures.addCanvas(key, b.commit());
  };
  btn('ui-btn-a', 'A');
  btn('ui-btn-b', 'B');

  // seta indicadora "▼" pulsante para diálogos
  const ar = new PixelCanvas(7, 4);
  for (let y = 0; y < 4; y++) for (let x = y; x < 7 - y; x++) ar.px(x, y, P.uiAccent);
  scene.textures.addCanvas('ui-arrow', ar.commit());

  // pixel branco para retângulos/barras
  const w = new PixelCanvas(2, 2);
  w.rect(0, 0, 2, 2, '#ffffff');
  scene.textures.addCanvas('px', w.commit());
}

/**
 * Luz radial branca em faixas, com dithering ordenado entre as faixas.
 * Usada carimbada (stamp) na camada de luz, tingida pela cor da luz.
 */
export function lightKey(radius: number): string {
  return `light-${radius}`;
}

export function bakeLight(scene: Phaser.Scene, radius: number, bands = 7): string {
  const key = lightKey(radius);
  if (scene.textures.exists(key)) return key;
  const s = radius * 2;
  const pc = new PixelCanvas(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const d = Math.hypot(x + 0.5 - radius, y + 0.5 - radius) / radius;
    if (d >= 1) continue;
    const v = Math.pow(1 - d, 1.35);
    const level = v * bands + (BAYER4[y & 3][x & 3] - 0.5);
    const q = Math.max(0, Math.min(bands, Math.round(level))) / bands;
    if (q <= 0) continue;
    pc.pxRGBA(x, y, 255, 255, 255, Math.round(q * 255));
  }
  scene.textures.addCanvas(key, pc.commit());
  return key;
}

/** Neblina: ruído suave em blocos, alpha baixo, para TileSprite em parallax. */
export function bakeFog(scene: Phaser.Scene): void {
  const S = 128;
  const pc = new PixelCanvas(S, S);
  const n = valueNoise(99);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // ruído periódico (amostragem em toro) para emendar sem costura
    const a = (x / S) * Math.PI * 2, b = (y / S) * Math.PI * 2;
    const v = n(3 + Math.cos(a) * 1.6, 3 + Math.sin(a) * 1.6 + Math.cos(b) * 1.6 + Math.sin(b) * 0.8, 3);
    const lvl = Math.floor((v - 0.45) * 10 + BAYER4[y & 3][x & 3] - 0.5);
    if (lvl <= 0) continue;
    pc.pxRGBA(x, y, 170, 190, 230, Math.min(4, lvl) * 22);
  }
  scene.textures.addCanvas('fog', pc.commit());
}
