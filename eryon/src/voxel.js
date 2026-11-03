// Grade de voxels + mesher com culling de faces internas e Ambient Occlusion por vértice
// (o "contato" macio entre voxels que dá o aspecto de miniatura das referências).
import * as THREE from 'three';
import { hash3 } from './noise.js';

export const PAL = [null]; // índice 0 = vazio
const palKey = new Map();
const tmpC = new THREE.Color();
// cor sRGB -> linear; sway: quanto o vento move; emit: emissão (janelas, runas, brasas)
export function pal(hex, sway = 0, emit = 0, jitter = 0.07) {
  const k = `${hex}|${sway}|${emit}|${jitter}`;
  if (palKey.has(k)) return palKey.get(k);
  tmpC.setHex(hex);
  PAL.push({ r: tmpC.r, g: tmpC.g, b: tmpC.b, sway, emit, jitter });
  if (PAL.length > 255) throw new Error('palette overflow');
  palKey.set(k, PAL.length - 1); return PAL.length - 1;
}

export class Grid {
  constructor(sx, sy, sz) { this.sx = sx; this.sy = sy; this.sz = sz; this.d = new Uint8Array(sx * sy * sz); }
  i(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  get(x, y, z) {
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return 0;
    return this.d[(y * this.sz + z) * this.sx + x];
  }
  set(x, y, z, v) {
    x |= 0; y |= 0; z |= 0;
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return;
    this.d[(y * this.sz + z) * this.sx + x] = v;
  }
  setIfEmpty(x, y, z, v) { if (!this.get(x, y, z)) this.set(x, y, z, v); }
  box(x0, y0, z0, x1, y1, z1, v) { // inclusivo
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, v);
  }
}

const AO = [0.42, 0.62, 0.82, 1.0];
// direções: eixo a, sinal s
const DIRS = [];
for (let a = 0; a < 3; a++) for (const s of [1, -1]) DIRS.push({ a, s, u: (a + 1) % 3, v: (a + 2) % 3 });

export function meshGrid(g, x0 = 0, x1 = g.sx, z0 = 0, z1 = g.sz, opt = {}) {
  const { scale = 1, closedBottom = true, aoMul = 1 } = opt;
  const D = g.d, sx = g.sx, sy = g.sy, sz = g.sz;
  const solid = (x, y, z) => {
    if (y < 0) return closedBottom ? 1 : 0;
    if (x < 0 || z < 0 || x >= sx || y >= sy || z >= sz) return 0;
    return D[(y * sz + z) * sx + x] ? 1 : 0;
  };
  const P = [], N = [], C = [], M = [], I = [];
  const p = [0, 0, 0], q = [0, 0, 0];
  for (let y = 0; y < sy; y++) for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) {
    const c = D[(y * sz + z) * sx + x]; if (!c) continue;
    const e = PAL[c];
    const j = 1 + (hash3(x, y, z) - 0.5) * 2 * e.jitter;
    p[0] = x; p[1] = y; p[2] = z;
    for (const dd of DIRS) {
      q[0] = x; q[1] = y; q[2] = z; q[dd.a] += dd.s;
      if (solid(q[0], q[1], q[2])) continue;
      const base = P.length / 3;
      const ao = [0, 0, 0, 0];
      const corners = dd.s > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[0, 0], [0, 1], [1, 1], [1, 0]];
      for (let k = 0; k < 4; k++) {
        const [cu, cv] = corners[k];
        const su = cu ? 1 : -1, sv = cv ? 1 : -1;
        const a1 = [q[0], q[1], q[2]]; a1[dd.u] += su;
        const a2 = [q[0], q[1], q[2]]; a2[dd.v] += sv;
        const a3 = [q[0], q[1], q[2]]; a3[dd.u] += su; a3[dd.v] += sv;
        const s1 = solid(a1[0], a1[1], a1[2]), s2 = solid(a2[0], a2[1], a2[2]), s3 = solid(a3[0], a3[1], a3[2]);
        const o = (s1 && s2) ? 0 : 3 - (s1 + s2 + s3);
        ao[k] = o;
        const v = [x, y, z]; v[dd.a] += dd.s > 0 ? 1 : 0; v[dd.u] += cu; v[dd.v] += cv;
        P.push(v[0] * scale, v[1] * scale, v[2] * scale);
        const n = [0, 0, 0]; n[dd.a] = dd.s; N.push(n[0], n[1], n[2]);
        const f = j * (1 - (1 - AO[o]) * aoMul);
        C.push(e.r * f, e.g * f, e.b * f);
        M.push(e.sway, e.emit);
      }
      if (ao[0] + ao[2] < ao[1] + ao[3]) I.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      else I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  if (!I.length) return null;
  return toGeometry(P, N, C, M, I);
}

export function toGeometry(P, N, C, M, I) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(N), 3, true));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('aMisc', new THREE.Float32BufferAttribute(M, 2));
  geo.setIndex(P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}

// Mesher de heightfield para LOD distante: colunas de voxels grandes (topo + laterais com gradiente).
export function meshHeightfield(W, H, hAt, colAt, opt) {
  const { scale, ox, oz, skip, unit = scale } = opt; // altura em unidades de mundo, quantizada em 'unit'
  const P = [], N = [], C = [], M = [], I = [];
  const quad = (a, b, c, d, n, ca, cb) => {
    const base = P.length / 3;
    for (const v of [a, b, c, d]) P.push(v[0], v[1], v[2]);
    for (let k = 0; k < 4; k++) N.push(n[0], n[1], n[2]);
    C.push(...ca, ...ca, ...cb, ...cb); M.push(0, 0, 0, 0, 0, 0, 0, 0);
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const hq = (i, j) => Math.round(hAt(i, j) / unit) * unit;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (skip && skip(i, j)) continue;
    const h = hq(i, j), x = ox + i * scale, z = oz + j * scale, X = x + scale, Z = z + scale;
    const top = colAt(i, j, h, true);
    // topo (CCW visto de cima): (x,z) (x,Z) (X,Z) (X,z)
    const base = P.length / 3;
    P.push(x, h, z, x, h, Z, X, h, Z, X, h, z); for (let k = 0; k < 4; k++) { N.push(0, 1, 0); C.push(...top); M.push(0, 0); }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    const side = colAt(i, j, h, false);
    const nb = [[1, 0, [1, 0, 0]], [-1, 0, [-1, 0, 0]], [0, 1, [0, 0, 1]], [0, -1, [0, 0, -1]]];
    for (const [di, dj, n] of nb) {
      const hn = hq(i + di, j + dj); if (hn >= h) continue;
      const lo = hn, depth = Math.min(1, (h - lo) / (scale * 6));
      const dark = [side[0] * (1 - 0.55 * depth), side[1] * (1 - 0.5 * depth), side[2] * (1 - 0.45 * depth)];
      const tc = [side[0] * 0.92, side[1] * 0.92, side[2] * 0.95];
      if (di === 1) quad([X, h, z], [X, h, Z], [X, lo, Z], [X, lo, z], n, tc, dark);
      if (di === -1) quad([x, h, Z], [x, h, z], [x, lo, z], [x, lo, Z], n, tc, dark);
      if (dj === 1) quad([X, h, Z], [x, h, Z], [x, lo, Z], [X, lo, Z], n, tc, dark);
      if (dj === -1) quad([x, h, z], [X, h, z], [X, lo, z], [x, lo, z], n, tc, dark);
    }
  }
  if (!I.length) return null;
  return toGeometry(P, N, C, M, I);
}
