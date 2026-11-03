import Phaser from 'phaser';
import { P } from './palette';
import { BAYER4, PixelCanvas } from './PixelCanvas';

/**
 * A máquina SCRIPTTER: caldeira de latão steampunk com núcleo mágico dourado,
 * tubos, teclas de máquina de escrever e uma fenda por onde sai o pergaminho.
 *
 * Texturas:
 *   scriptter         quadros 0 (desligada) e 1..4 (ligada, núcleo pulsando)
 *   gear-l / gear-s   engrenagens com 4 quadros de rotação (loop perfeito)
 *   bulb              lâmpada apagada/acesa
 *   scroll-paper      tira de pergaminho que sai da máquina
 */
export const MACHINE_W = 56;
export const MACHINE_H = 60;

function drawBody(pc: PixelCanvas, ox: number, on: boolean, pulse: number) {
  const W = MACHINE_W;
  const p = (x: number, y: number, c: string, a = 255) => pc.px(ox + x, y, c, a);
  const rect = (x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, c); };

  // sombra
  for (let y = 52; y < 60; y++) for (let x = 0; x < W; x++) {
    const dx = (x - 28) / 26, dy = (y - 55) / 3.5;
    if (dx * dx + dy * dy <= 1) p(x, y, P.ink, 90);
  }
  // base de madeira
  rect(6, 44, 44, 10, P.wood2);
  rect(6, 44, 44, 2, P.wood3);
  rect(6, 52, 44, 2, P.wood0);
  for (let x = 8; x < 48; x += 8) p(x, 49, P.wood1);
  // teclas
  for (let i = 0; i < 7; i++) {
    const kx = 11 + i * 5;
    rect(kx, 47, 3, 2, P.paper2);
    p(kx + 1, 47, P.paper3);
    p(kx, 49, P.ink);
    p(kx + 2, 49, P.ink);
  }
  // corpo (caldeira) — cilindro de latão
  for (let y = 12; y < 45; y++) {
    const yy = (y - 12) / 33;
    const hw = 17 - Math.max(0, (0.15 - yy)) * 30;
    for (let x = Math.round(28 - hw); x < Math.round(28 + hw); x++) {
      const rel = (x - (28 - hw)) / (hw * 2);
      let i = rel < 0.15 ? 3 : rel < 0.45 ? 2 : rel < 0.8 ? 1 : 0;
      if (BAYER4[y & 3][x & 3] > 0.85 && i > 0 && rel > 0.6) i--;
      p(x, y, [P.brass0, P.brass1, P.brass2, P.brass3][i]);
    }
  }
  // cintas de cobre com rebites
  for (const by of [16, 40]) {
    for (let x = 12; x < 44; x++) p(x, by, P.copper);
    for (let x = 14; x < 44; x += 5) p(x, by, P.brass3);
  }
  // núcleo mágico
  const cx = 28, cy = 28;
  for (let y = cy - 8; y <= cy + 8; y++) for (let x = cx - 8; x <= cx + 8; x++) {
    const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5);
    if (d <= 8.2 && d > 6.6) p(x, y, d > 7.6 ? P.ink : P.brass3);
    else if (d <= 6.6) {
      if (!on) p(x, y, d < 3 ? P.gold0 : P.night2);
      else {
        const k = Math.max(0, 1 - d / 6.6) + pulse * 0.25 + (BAYER4[y & 3][x & 3] - 0.5) * 0.25;
        const ramp = [P.gold0, P.gold1, P.gold2, P.gold3, P.gold4, P.white];
        p(x, y, ramp[Math.max(0, Math.min(5, Math.floor(k * 5.2)))]);
      }
    }
  }
  if (!on) { p(cx - 3, cy - 3, P.steam); p(cx - 2, cy - 4, P.steam); }
  else {
    // runa no centro
    p(cx, cy - 2, P.violet2); p(cx, cy + 2, P.violet2); p(cx - 2, cy, P.violet2); p(cx + 2, cy, P.violet2);
  }
  // fenda do papel
  rect(19, 42, 18, 2, P.ink);
  rect(19, 41, 18, 1, P.brass0);
  // tubos
  rect(4, 18, 4, 22, P.copper); rect(4, 18, 1, 22, P.brass3);
  rect(4, 18, 9, 3, P.copper); rect(4, 18, 9, 1, P.brass3);
  rect(48, 22, 4, 18, P.copper); rect(48, 22, 1, 18, P.brass3);
  rect(43, 22, 9, 3, P.copper); rect(43, 22, 9, 1, P.brass3);
  // chaminé
  rect(36, 2, 6, 11, P.brass1); rect(36, 2, 2, 11, P.brass2); rect(35, 1, 8, 2, P.brass3);
  // manômetro
  for (let y = 4; y < 13; y++) for (let x = 14; x < 23; x++) {
    const d = Math.hypot(x + 0.5 - 18.5, y + 0.5 - 8.5);
    if (d <= 4.2) p(x, y, d > 3.2 ? P.brass3 : P.paper3);
  }
  p(18, 8, P.fire1); p(19, 7, P.fire1); p(20, 6, on ? P.fire1 : P.paper3);
  rect(17, 12, 3, 1, P.brass1);
}

export function bakeMachine(scene: Phaser.Scene): void {
  const frames = 5;
  const pc = new PixelCanvas(MACHINE_W * frames, MACHINE_H);
  for (let f = 0; f < frames; f++) {
    const on = f > 0;
    const pulse = on ? Math.sin(((f - 1) / 4) * Math.PI * 2) : 0;
    drawBody(pc, f * MACHINE_W, on, pulse);
    pc.outline(P.ink, { x: f * MACHINE_W, y: 0, w: MACHINE_W, h: MACHINE_H });
  }
  const tex = scene.textures.addCanvas('scriptter', pc.commit())!;
  for (let f = 0; f < frames; f++) tex.add(String(f), 0, f * MACHINE_W, 0, MACHINE_W, MACHINE_H);
  if (!scene.anims.exists('scriptter-on'))
    scene.anims.create({ key: 'scriptter-on', frames: [1, 2, 3, 4].map((i) => ({ key: 'scriptter', frame: String(i) })), frameRate: 6, repeat: -1 });

  bakeGear(scene, 'gear-l', 13, 8);
  bakeGear(scene, 'gear-s', 9, 6);

  // lâmpada (0 apagada, 1 acesa)
  const bl = new PixelCanvas(10, 6);
  for (let i = 0; i < 2; i++) {
    const c = i ? P.fire4 : P.stone1, hl = i ? P.fire5 : P.stone2;
    bl.disc(i * 5 + 2.5, 2.5, 2.2, c); bl.px(i * 5 + 1, 1, hl);
  }
  bl.outline(P.ink);
  const bt = scene.textures.addCanvas('bulb', bl.commit())!;
  bt.add('0', 0, 0, 0, 5, 6); bt.add('1', 0, 5, 0, 5, 6);

  // pergaminho (16x40) com linhas de texto
  const sc = new PixelCanvas(18, 40);
  sc.rect(1, 0, 16, 40, P.paper3);
  sc.vline(1, 0, 39, P.paper2); sc.vline(16, 0, 39, P.paper1);
  for (let y = 4; y < 38; y += 3) {
    const len = 6 + ((y * 7) % 6);
    sc.hline(4, 4 + len, y, P.paper0);
  }
  sc.px(13, 34, P.fire1); sc.px(14, 35, P.fire1);
  sc.outline(P.ink);
  scene.textures.addCanvas('scroll-paper', sc.commit());
}

function bakeGear(scene: Phaser.Scene, key: string, size: number, teeth: number) {
  const frames = 4;
  const pc = new PixelCanvas(size * frames, size);
  const c = (size - 1) / 2;
  const rOuter = size / 2 - 0.6, rInner = rOuter - 1.6, hole = Math.max(1, size / 7);
  for (let f = 0; f < frames; f++) {
    const rot = (f / frames) * ((Math.PI * 2) / teeth);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x - c, dy = y - c;
      const d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) - rot;
      const tooth = Math.cos(a * teeth) > 0.2;
      const r = tooth ? rOuter : rInner;
      if (d <= r && d >= hole) {
        const light = dx * -0.6 + dy * -0.8 > 0;
        pc.px(f * size + x, y, d > rInner - 0.5 ? (light ? P.brass3 : P.brass1) : light ? P.brass2 : P.brass1);
      }
    }
  }
  for (let f = 0; f < frames; f++) pc.outline(P.ink, { x: f * size, y: 0, w: size, h: size }, 100);
  const tex = scene.textures.addCanvas(key, pc.commit())!;
  for (let f = 0; f < frames; f++) tex.add(String(f), 0, f * size, 0, size, size);
  if (!scene.anims.exists(key + '-spin'))
    scene.anims.create({ key: key + '-spin', frames: [0, 1, 2, 3].map((i) => ({ key, frame: String(i) })), frameRate: 10, repeat: -1 });
}
