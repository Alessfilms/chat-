import Phaser from 'phaser';
import { P } from './palette';
import { BAYER4, PixelCanvas, rng, valueNoise } from './PixelCanvas';

/**
 * Fogueira (8 quadros em loop perfeito), anel de pedras, toras de sentar,
 * caixotes, toco, placa, poço, tenda, casas, lampião, torre, muralha e castelo.
 */

const FIRE_RAMP = [P.fire0, P.fire1, P.fire2, P.fire3, P.fire4, P.fire5];
export const FIRE_FRAMES = 8;

export function bakeFire(scene: Phaser.Scene): void {
  const FW = 16, FH = 24;
  const pc = new PixelCanvas(FW * FIRE_FRAMES, FH);
  const noise = valueNoise(42);
  for (let f = 0; f < FIRE_FRAMES; f++) {
    const a = (f / FIRE_FRAMES) * Math.PI * 2;
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const v = (FH - 1 - y) / FH; // 0 base, 1 topo
        const cx = 7.5 + Math.sin(a + v * 3) * v * 1.6;
        const width = 6.2 * Math.pow(1 - v, 0.9) + 0.4;
        const dx = Math.abs(x + 0.5 - cx) / width;
        // turbulência em loop (amostra num círculo do espaço de ruído)
        const nz = noise(x * 0.28 + Math.cos(a) * 1.7, y * 0.22 + v * 2 + Math.sin(a) * 1.7, 2);
        let heat = 1 - dx - v * 0.55 + (nz - 0.5) * 0.9;
        // línguas de fogo
        const tongue = Math.max(0, Math.sin(x * 1.3 + a * 2) * 0.25) * v;
        heat += tongue;
        if (heat <= 0.12) continue;
        let idx = heat * 4.6 + (BAYER4[y & 3][x & 3] - 0.5) * 0.7;
        idx = Math.max(0, Math.min(5, Math.floor(idx)));
        pc.px(f * FW + x, y, FIRE_RAMP[idx]);
      }
  }
  const tex = scene.textures.addCanvas('fire', pc.commit())!;
  for (let f = 0; f < FIRE_FRAMES; f++) tex.add(String(f), 0, f * FW, 0, FW, FH);
  if (!scene.anims.exists('fire-loop'))
    scene.anims.create({ key: 'fire-loop', frames: Array.from({ length: FIRE_FRAMES }, (_, i) => ({ key: 'fire', frame: String(i) })), frameRate: 10, repeat: -1 });

  // base: toras cruzadas + brasas + pedras de trás
  const b = new PixelCanvas(30, 14);
  const stones = (front: boolean, pcx: PixelCanvas) => {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const sx = 15 + Math.cos(ang) * 12, sy = 7 + Math.sin(ang) * 5;
      const isFront = Math.sin(ang) > 0.1;
      if (isFront !== front) continue;
      pcx.ellipse(sx, sy, 2.2, 1.7, P.stone1);
      pcx.px(Math.floor(sx) - 1, Math.floor(sy) - 1, P.stone3);
      pcx.px(Math.floor(sx), Math.floor(sy) - 1, P.stone2);
    }
  };
  b.ellipse(15, 8, 13, 5.5, P.ink, 120);
  stones(false, b);
  b.line(8, 10, 22, 5, P.wood1); b.line(8, 9, 22, 4, P.wood2);
  b.line(8, 5, 22, 10, P.wood1); b.line(8, 4, 22, 9, P.wood3);
  for (let i = 0; i < 9; i++) b.px(11 + i, 7 + (i % 3) - 1, i % 2 ? P.fire2 : P.fire1);
  b.outline(P.ink);
  scene.textures.addCanvas('fire-base', b.commit());
  const fr = new PixelCanvas(30, 14);
  stones(true, fr);
  fr.outline(P.ink);
  scene.textures.addCanvas('fire-front', fr.commit());
}

export function bakeCampProps(scene: Phaser.Scene): void {
  // tora de sentar (horizontal)
  const lg = new PixelCanvas(34, 12);
  lg.ellipse(17, 9, 15, 2.5, P.ink, 80);
  lg.rect(4, 2, 26, 6, P.wood2);
  lg.hline(4, 29, 2, P.wood3); lg.hline(4, 29, 3, P.wood3);
  lg.hline(4, 29, 7, P.wood1);
  for (let x = 7; x < 28; x += 5) lg.px(x, 5, P.wood1);
  lg.ellipse(4, 5, 2, 3, P.dirt3); lg.px(4, 5, P.wood1); lg.px(4, 4, P.dirt4);
  lg.outline(P.ink);
  scene.textures.addCanvas('log', lg.commit());

  // caixote
  const cr = new PixelCanvas(16, 18);
  cr.ellipse(8, 15, 7, 2, P.ink, 80);
  cr.rect(2, 3, 12, 11, P.wood2);
  cr.rect(2, 3, 12, 2, P.wood3);
  cr.hline(2, 13, 8, P.wood1);
  cr.vline(2, 3, 13, P.wood1); cr.vline(13, 3, 13, P.wood0);
  cr.line(3, 12, 12, 9, P.wood1);
  cr.px(3, 4, P.dirt4);
  cr.outline(P.ink);
  scene.textures.addCanvas('crate', cr.commit());

  // toco
  const sp = new PixelCanvas(16, 14);
  sp.ellipse(8, 11, 7, 2.2, P.ink, 80);
  sp.rect(3, 4, 10, 7, P.bark2); sp.vline(11, 4, 10, P.bark1); sp.vline(12, 4, 10, P.bark0);
  sp.ellipse(8, 4, 5, 2, P.dirt3); sp.ellipse(8, 4, 3, 1.2, P.dirt4); sp.px(8, 4, P.dirt2);
  sp.outline(P.ink);
  scene.textures.addCanvas('stump', sp.commit());

  // placa
  const sg = new PixelCanvas(18, 22);
  sg.ellipse(9, 20, 5, 1.5, P.ink, 80);
  sg.rect(8, 8, 2, 12, P.wood1);
  sg.rect(1, 2, 16, 7, P.wood2); sg.hline(1, 16, 2, P.wood3); sg.hline(1, 16, 8, P.wood1);
  sg.hline(4, 13, 5, P.wood0);
  sg.outline(P.ink);
  scene.textures.addCanvas('signpost', sg.commit());

  // poço
  const wl = new PixelCanvas(26, 30);
  wl.ellipse(13, 26, 11, 3, P.ink, 80);
  wl.rect(3, 14, 20, 11, P.stone1);
  for (let y = 14; y < 25; y += 3) for (let x = 3 + ((y / 3) % 2) * 2; x < 23; x += 5) wl.px(x, y, P.stone0);
  wl.ellipse(13, 14, 10, 3, P.stone2); wl.ellipse(13, 14, 7, 1.8, P.night1);
  wl.rect(4, 3, 2, 11, P.wood1); wl.rect(20, 3, 2, 11, P.wood1);
  wl.rect(2, 1, 22, 3, P.violet1); wl.hline(2, 23, 1, P.violet2);
  wl.outline(P.ink);
  scene.textures.addCanvas('well', wl.commit());
}

/** Tenda de lona (estágio "clareira" avançado). */
export function bakeStructures(scene: Phaser.Scene): void {
  // tenda
  const tn = new PixelCanvas(34, 26);
  tn.ellipse(17, 23, 15, 3, P.ink, 80);
  for (let y = 0; y < 20; y++) {
    const hw = 1 + y * 0.75;
    for (let x = Math.round(17 - hw); x <= Math.round(17 + hw); x++) {
      const left = x < 17;
      tn.px(x, 3 + y, left ? P.paper2 : P.paper1);
    }
  }
  for (let y = 12; y < 23; y++) { const hw = (y - 12) * 0.45; for (let x = Math.round(17 - hw); x <= Math.round(17 + hw); x++) tn.px(x, y, P.night2); }
  tn.vline(17, 1, 4, P.wood1);
  tn.px(18, 1, P.fire1); tn.px(19, 1, P.fire1); tn.px(18, 2, P.fire1);
  tn.outline(P.ink);
  scene.textures.addCanvas('tent', tn.commit());

  // casas
  const house = (key: string, roof: string[], wall: string, seed: number) => {
    const W = 44, H = 46;
    const pc = new PixelCanvas(W, H);
    const r = rng(seed);
    pc.ellipse(22, 42, 20, 3.5, P.ink, 80);
    // paredes
    pc.rect(6, 22, 32, 19, wall);
    pc.rect(6, 22, 32, 2, P.paper1);
    for (const x of [6, 21, 37]) pc.vline(x, 22, 40, P.wood1);
    pc.hline(6, 37, 31, P.wood1);
    pc.line(7, 23, 20, 30, P.wood1);
    // porta
    pc.rect(18, 31, 8, 10, P.wood1); pc.rect(19, 32, 6, 9, P.wood2); pc.px(23, 36, P.gold3);
    pc.rect(18, 30, 8, 1, P.wood0);
    // janelas acesas
    for (const wx of [9, 29]) {
      pc.rect(wx, 25, 6, 5, P.fire3);
      pc.rect(wx + 1, 26, 2, 3, P.fire4);
      pc.vline(wx + 3, 25, 29, P.wood1); pc.hline(wx, wx + 5, 27, P.wood1);
      pc.rect(wx - 1, 30, 8, 1, P.wood1);
    }
    // telhado
    for (let y = 0; y < 18; y++) {
      const hw = 6 + y * 1.25;
      for (let x = Math.round(22 - hw); x <= Math.round(22 + hw); x++) {
        const row = Math.floor((y + (x % 2)) / 3);
        let ci = (row % 2 === 0) ? 1 : 2;
        if (x > 22 + hw - 4) ci = 0;
        if (x < 22 - hw + 3) ci = 3;
        if (r() < 0.08) ci = Math.max(0, ci - 1);
        pc.px(x, 5 + y, roof[ci]);
      }
    }
    pc.hline(Math.round(22 - 6), Math.round(22 + 6), 5, roof[3]);
    // chaminé
    pc.rect(30, 3, 4, 8, P.stone1); pc.rect(30, 3, 4, 1, P.stone2); pc.vline(33, 3, 10, P.stone0);
    pc.outline(P.ink);
    scene.textures.addCanvas(key, pc.commit());
  };
  house('houseA', [P.dirt2, P.dirt3, P.dirt4, P.paper1], P.paper2, 11);
  house('houseB', [P.violet0, P.violet1, P.violet2, P.violet3], P.paper1, 12);

  // lampião
  const lp = new PixelCanvas(10, 28);
  lp.ellipse(5, 26, 3, 1, P.ink, 80);
  lp.rect(4, 8, 2, 18, P.stone0); lp.vline(4, 8, 25, P.stone1);
  lp.rect(2, 2, 6, 6, P.fire4); lp.rect(3, 3, 4, 4, P.fire5);
  lp.hline(1, 8, 1, P.stone0); lp.hline(2, 7, 8, P.stone0); lp.px(5, 0, P.stone0);
  lp.outline(P.ink);
  scene.textures.addCanvas('lamp', lp.commit());

  // estandarte do Scriptter (pena + engrenagem)
  const bn = new PixelCanvas(16, 34);
  bn.ellipse(8, 32, 4, 1, P.ink, 80);
  bn.rect(2, 2, 1, 30, P.wood1);
  bn.rect(3, 3, 11, 16, P.violet1);
  bn.rect(13, 3, 1, 16, P.violet0);
  for (let x = 3; x < 14; x++) if (x % 2) bn.px(x, 19, P.violet1);
  bn.disc(8.5, 10, 3, P.gold2); bn.disc(8.5, 10, 1.4, P.violet1);
  bn.line(6, 15, 11, 6, P.paper3);
  bn.px(2, 1, P.gold3);
  bn.outline(P.ink);
  scene.textures.addCanvas('banner', bn.commit());

  // torre de pedra
  const tw = new PixelCanvas(36, 70);
  tw.ellipse(18, 66, 16, 3, P.ink, 80);
  tw.rect(6, 18, 24, 47, P.stone1);
  for (let y = 18; y < 65; y += 4) for (let x = 6 + ((y / 4) % 2) * 3; x < 30; x += 6) { tw.px(x, y, P.stone0); tw.hline(x, x + 4, y + 3, P.stone0); }
  tw.vline(6, 18, 64, P.stone2); tw.vline(29, 18, 64, P.stone0);
  tw.rect(4, 12, 28, 6, P.stone2);
  for (let x = 4; x < 32; x += 6) tw.rect(x, 8, 4, 4, P.stone2);
  tw.rect(15, 28, 6, 9, P.fire3); tw.rect(16, 29, 2, 7, P.fire4);
  tw.rect(15, 52, 6, 12, P.wood1);
  tw.vline(18, 0, 8, P.wood1); tw.rect(19, 0, 8, 5, P.violet1); tw.px(22, 2, P.gold3);
  tw.outline(P.ink);
  scene.textures.addCanvas('tower', tw.commit());

  // muralha
  const wa = new PixelCanvas(34, 26);
  wa.rect(0, 8, 34, 16, P.stone1);
  for (let y = 8; y < 24; y += 4) for (let x = ((y / 4) % 2) * 3; x < 34; x += 6) wa.hline(x, x + 4, y + 3, P.stone0);
  for (let x = 0; x < 34; x += 8) wa.rect(x, 3, 5, 5, P.stone2);
  wa.hline(0, 33, 8, P.stone2);
  wa.outline(P.ink);
  scene.textures.addCanvas('wall', wa.commit());

  // castelo dos historiadores
  const cs = new PixelCanvas(110, 100);
  cs.ellipse(55, 95, 52, 5, P.ink, 80);
  const towerAt = (tx: number, top: number) => {
    cs.rect(tx, top, 20, 94 - top, P.stone1);
    cs.vline(tx, top, 93, P.stone2); cs.vline(tx + 19, top, 93, P.stone0);
    for (let x = tx - 2; x < tx + 22; x += 6) cs.rect(x, top - 5, 4, 5, P.stone2);
    cs.rect(tx + 7, top + 10, 6, 8, P.fire3); cs.rect(tx + 8, top + 11, 2, 6, P.fire4);
    // telhado cônico
    for (let y = 0; y < 18; y++) { const hw = y * 0.65; for (let x = Math.round(tx + 10 - hw); x <= Math.round(tx + 10 + hw); x++) cs.px(x, top - 22 + y, x < tx + 10 ? P.violet2 : P.violet1); }
    cs.vline(tx + 10, top - 30, top - 22, P.wood1); cs.rect(tx + 11, top - 30, 6, 4, P.gold2);
  };
  cs.rect(16, 40, 78, 54, P.stone1);
  for (let y = 40; y < 94; y += 4) for (let x = 16 + ((y / 4) % 2) * 3; x < 94; x += 6) cs.hline(x, x + 4, y + 3, P.stone0);
  for (let x = 16; x < 94; x += 7) cs.rect(x, 35, 4, 5, P.stone2);
  towerAt(4, 30); towerAt(86, 30); towerAt(45, 12);
  cs.rect(46, 66, 18, 28, P.night1); cs.rect(48, 68, 14, 26, P.wood1);
  for (let x = 49; x < 62; x += 3) cs.vline(x, 68, 93, P.wood0);
  cs.disc(55, 55, 5, P.gold2); cs.disc(55, 55, 2.5, P.violet1);
  cs.outline(P.ink);
  scene.textures.addCanvas('castle', cs.commit());
}
