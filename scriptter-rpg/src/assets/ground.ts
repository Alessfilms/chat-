import Phaser from 'phaser';
import { P, rgb } from './palette';
import { BAYER4, rng, valueNoise } from './PixelCanvas';
import type { MapDef, Vec } from '../data/types';

/**
 * Pinta o chão inteiro do mapa pixel a pixel (grama pontilhada, folhas no chão,
 * terra batida da clareira, trilhas, pétalas). Resultado: uma textura única,
 * orgânica, sem repetição de tile — mas ainda alinhada à grade de 16px para
 * posicionar objetos e colisões.
 */
export interface GroundOptions {
  clearingRadius: number;
  extraPaths?: { points: Vec[]; width: number }[];
  plazaRadius?: number;
}

function distToSegment(px: number, py: number, a: Vec, b: Vec): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - a.x) * dx + (py - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

export function paintGround(scene: Phaser.Scene, key: string, map: MapDef, opt: GroundOptions): void {
  const W = map.width, H = map.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;

  const n1 = valueNoise(map.seed);
  const n2 = valueNoise(map.seed + 9);
  const r = rng(map.seed + 3);

  const grass = [P.grass0, P.grass1, P.grass2, P.grass3, P.grass4, P.grass5].map(rgb);
  const dirt = [P.dirt0, P.dirt1, P.dirt2, P.dirt3, P.dirt4].map(rgb);
  const litter = [P.dirt1, P.bark2, P.leaf2].map(rgb);
  const petal = rgb(P.petal), petal2 = rgb(P.petal2), stone = rgb(P.stone2);

  const c = map.clearing.center;
  const paths = [...map.paths, ...(opt.extraPaths ?? [])];
  const plaza = opt.plazaRadius ?? 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const dist = Math.hypot(x - c.x, y - c.y);
      const big = n1(x / 90, y / 90, 3);
      const fine = n2(x / 9, y / 9, 2);
      const t = BAYER4[y & 3][x & 3];

      // claridade da clareira: perto do centro a grama é mais viva
      const edgeNoise = (n1(x / 30, y / 30, 2) - 0.5) * 60;
      const inClear = 1 - Math.min(1, Math.max(0, (dist + edgeNoise - opt.clearingRadius) / 90));

      let g = 1.2 + big * 1.6 + inClear * 1.7 + (fine - 0.5) * 1.3;
      g = Math.floor(g + (t - 0.5));
      g = Math.max(0, Math.min(5, g));
      let col = grass[g];

      // pontilhado de grama (o "ruído" fino da referência)
      const rr = r();
      if (rr < 0.09) col = grass[Math.min(5, g + 1)];
      else if (rr < 0.17) col = grass[Math.max(0, g - 1)];

      // folhas secas no chão da floresta
      if (inClear < 0.3 && rr > 0.985) col = litter[Math.floor(r() * 3)];

      // terra batida em volta da fogueira + praça
      const dirtR = map.clearing.dirtRadius + plaza;
      const dn = (n2(x / 14, y / 14, 2) - 0.5) * 18;
      let dirtAmt = dirtR > 0 ? (dirtR - (dist + dn)) / 10 : -1;

      // trilhas
      for (const p of paths) {
        for (let k = 0; k < p.points.length - 1; k++) {
          const ds = distToSegment(x, y, p.points[k], p.points[k + 1]);
          const pn = (n1(x / 12, y / 12, 2) - 0.5) * 8;
          const amt = (p.width / 2 - (ds + pn)) / 5;
          if (amt > dirtAmt) dirtAmt = amt;
        }
      }
      if (dirtAmt > 0) {
        let di = Math.floor(1.5 + fine * 2.5 + Math.min(1, dirtAmt) * 0.8 + (t - 0.5) * 0.8);
        di = Math.max(0, Math.min(4, di));
        col = dirt[di];
        if (rr < 0.05) col = dirt[Math.max(0, di - 1)];
        else if (rr > 0.993) col = stone;
        // borda: mistura com dithering
        if (dirtAmt < 0.6 && t > dirtAmt / 0.6) col = grass[Math.max(1, g)];
      }

      // pétalas espalhadas (rosa e branco, como na atmosfera mágica)
      if (dirtAmt <= 0 && rr > 0.9972) col = r() < 0.6 ? petal : petal2;

      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}
