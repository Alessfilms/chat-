// Geração procedural de Eryon: território congelado, clareira, riacho, ravina+ponte, ruínas,
// lago com torre, caverna, templo, falésia — e anéis de LOD até as montanhas e a estrutura colossal.
import * as THREE from 'three';
import { Grid, pal, PAL, meshGrid, meshHeightfield } from './voxel.js';
import { rng, hash2, hash3, vnoise, vnoise3, fbm, ridged, smoothstep, lerp, clamp } from './noise.js';

// ---------- paleta (sRGB) — branco-azulado gelado + acentos quentes ----------
export const C = {
  SNOW: pal(0xeef2f8, 0, 0, 0.035), SNOW2: pal(0xe1e8f1, 0, 0, 0.04), SNOWB: pal(0xd3dcea, 0, 0, 0.04),
  SOIL: pal(0x5b4a45), SOIL2: pal(0x6e5a50), STONE: pal(0x8b919d), STONE_D: pal(0x646b78), BED: pal(0x4c5866),
  GRASS: pal(0xb9c9d8, 0.55), GRASS2: pal(0x8fa3b8, 0.55), GRASS_TIP: pal(0xf3f6fb, 0.75), GRASS_W: pal(0xc9b48f, 0.55),
  LEAF_A: pal(0x7f95ad, 0.5, 0, 0.1), LEAF_B: pal(0x9cb0c6, 0.5, 0, 0.1), LEAF_D: pal(0x5a6c84, 0.45, 0, 0.1),
  LEAF_S: pal(0xf2f5fa, 0.5, 0, 0.05), LEAF_S2: pal(0xdae3ee, 0.5, 0, 0.06),
  FIR_A: pal(0x4c666f, 0.35, 0, 0.1), FIR_B: pal(0x3c545d, 0.35, 0, 0.1), FIR_S: pal(0xeef3f9, 0.35, 0, 0.05),
  TRUNK: pal(0x4a3530, 0.0, 0, 0.12), TRUNK2: pal(0x5f4336, 0.0, 0, 0.12), TRUNK_S: pal(0xe6ebf2),
  WOOD: pal(0x6d4b36), WOOD_D: pal(0x4b3326), ROOF: pal(0x3e3a44),
  RUIN: pal(0xa9a69f, 0, 0, 0.09), RUIN_D: pal(0x7e7b76, 0, 0, 0.09), MOSS: pal(0x6f857c, 0, 0, 0.1), STONE_S: pal(0xe4e9f0),
  WIN_D: pal(0x23262e, 0, 0, 0.02), RUNE: pal(0x8fe6ff, 0, 1, 0.1), GLOW: pal(0xffb860, 0, 1, 0.05), CRYSTAL: pal(0x9fd6ff, 0, 0.9, 0.1),
  BERRY: pal(0xc0473a, 0.4), ICE: pal(0xc4d9ea, 0, 0, 0.05),
};
const SNOWABLE = new Map([
  [C.STONE, C.STONE_S], [C.STONE_D, C.STONE_S], [C.RUIN, C.STONE_S], [C.RUIN_D, C.STONE_S], [C.MOSS, C.STONE_S],
  [C.WOOD, C.SNOW], [C.WOOD_D, C.SNOW], [C.TRUNK, C.TRUNK_S], [C.TRUNK2, C.TRUNK_S], [C.ROOF, C.SNOW],
  [C.LEAF_A, C.LEAF_S], [C.LEAF_B, C.LEAF_S2], [C.LEAF_D, C.LEAF_S2], [C.FIR_A, C.FIR_S], [C.FIR_B, C.FIR_S],
]);

// ---------- layout ----------
export const GX0 = -128, GZ0 = -448, GSX = 256, GSZ = 576, GSY = 96;
export const WATER_Y = 9.35;
export const POS = {
  clearing: new THREE.Vector3(0, 13, 0),
  ruins: new THREE.Vector3(38, 0, -200), tower: new THREE.Vector3(-86, 0, -262), lake: new THREE.Vector3(-30, 0, -272),
  temple: new THREE.Vector3(-48, 0, -372), cave: new THREE.Vector3(70, 0, -300), bridgeX: -14,
  cliff: new THREE.Vector3(0, 0, -440), mystery: new THREE.Vector3(60, -50, -2050),
};
const streamX = z => 42 + 10 * Math.sin(z * 0.03) + 6 * Math.sin(z * 0.011 + 1);
const ravineZ = x => -135 + 8 * Math.sin(x * 0.025);

// relevo macro (compartilhado por todos os LODs — evita costuras)
export function hBase(x, z) {
  let h = 15 + fbm(x * 0.008 + 3, z * 0.008 - 7) * 7 + fbm(x * 0.035, z * 0.035, 2) * 1.6;
  h += smoothstep(-360, -438, z) * 18;                                  // subida até a falésia
  const valley = smoothstep(-446, -470, z);                              // vale ao norte da falésia
  h = lerp(h, -42 + fbm(x * 0.01, z * 0.01) * 10, valley);
  const r = Math.hypot(x * 1.0, (z + 300) * 0.85);
  let mtn = smoothstep(700, 1500, r);
  if (z < -470) mtn *= 0.08 + 0.92 * smoothstep(120, 520, Math.abs(x - 60 - (z + 470) * 0.02)); // corredor de vale até a estrutura
  h += mtn * (ridged(x * 0.0016 + 4, z * 0.0016) * 420 + 40);
  return h;
}
// relevo detalhado (escavações: clareira, riacho, ravina, lago)
export function hWorld(x, z) {
  let h = hBase(x, z);
  const r = Math.hypot(x, z);
  h = lerp(12.6 + 4.5 * (1 - smoothstep(6, 52, r)) + fbm(x * 0.1, z * 0.1, 2) * 0.5, h, smoothstep(44, 68, r)); // clareira: leve monte
  // margens elevadas da ravina
  const dR = Math.abs(z - ravineZ(x));
  if (Math.abs(x) < 125) h += 11 * Math.exp(-(((dR - 15) / 11) ** 2)) * smoothstep(125, 100, Math.abs(x));
  // riacho
  if (z > ravineZ(x) + 6) {
    const dS = Math.abs(x - streamX(z));
    if (dS < 7) h = Math.min(h, lerp(8, h, smoothstep(2.2, 6.5, dS)));
  }
  // ravina (rio no fundo)
  if (Math.abs(x) < 118 && dR < 13) h = Math.min(h, lerp(4, h, smoothstep(9, 13, dR) ** 0.4));
  // lago
  const lx = (x - POS.lake.x) / 62, lz = (z - POS.lake.z) / 38, e = lx * lx + lz * lz + (vnoise(x * 0.05, z * 0.05) - 0.5) * 0.3;
  if (e < 1.15) h = Math.min(h, lerp(4, h, smoothstep(0.7, 1.15, e)));
  return h;
}

// ---------- utilidades de construção em coordenadas de mundo ----------
let G;
const S = (x, y, z, v) => G.set(Math.round(x) - GX0, Math.round(y), Math.round(z) - GZ0, v);
const Sf = (x, y, z, v) => G.set(Math.floor(x) - GX0, Math.floor(y), Math.floor(z) - GZ0, v);
const Gget = (x, y, z) => G.get(x - GX0, y, z - GZ0);
const HM = new Int16Array(GSX * GSZ); // altura do terreno por coluna
export const groundY = (x, z) => {
  const gx = Math.round(x) - GX0, gz = Math.round(z) - GZ0;
  if (gx < 0 || gz < 0 || gx >= GSX || gz >= GSZ) return hWorld(x, z);
  return HM[gz * GSX + gx];
};

function blob(cx, cy, cz, rx, ry, rz, pick, R, porosity = 0.22) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let z = Math.floor(cz - rz); z <= cz + rz; z++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
    const n = vnoise3(x * 0.35, z * 0.35, y * 0.35);
    if (d > 1 - 0.45 * n) continue;
    if (d > 0.55 && hash3(x, y, z) < porosity) continue;
    S(x, y, z, pick(x, y, z, d));
  }
}
function umbrellaTree(x, z, R) {
  const g = groundY(x, z), H = 21 + Math.floor(R() * 14);
  const lean = (R() - 0.5) * 0.25, leanZ = (R() - 0.5) * 0.25;
  const tk = R() < 0.5 ? C.TRUNK : C.TRUNK2;
  for (let y = 0; y < H; y++) { const ox = Math.round(lean * y), oz = Math.round(leanZ * y); S(x + ox, g + y, z + oz, tk); if (y < 3 || R() < 0.3) S(x + ox + 1, g + y, z + oz, tk); }
  const tx = x + lean * H, tz = z + leanZ * H, ty = g + H;
  const pads = 3 + Math.floor(R() * 3);
  const leaf = () => { const r = R(); return r < 0.45 ? C.LEAF_A : r < 0.85 ? C.LEAF_B : C.LEAF_D; };
  for (let i = 0; i < pads; i++) {
    const a = R() * Math.PI * 2, rr = i === 0 ? 0 : 3 + R() * 6, py = ty - i * 2.5 - R() * 3;
    const px = tx + Math.cos(a) * rr, pz = tz + Math.sin(a) * rr;
    // galho
    for (let s = 0; s <= 1; s += 0.12) S(lerp(tx, px, s), lerp(py - 4, py, s), lerp(tz, pz, s), tk);
    blob(px, py + 1, pz, 5 + R() * 3, 2.4 + R() * 1.6, 5 + R() * 3, leaf, R, 0.25);
  }
}
function firTree(x, z, R, big = 1) {
  const g = groundY(x, z), H = Math.floor((14 + R() * 15) * big), base = g + 2;
  for (let y = 0; y < H * 0.8; y++) S(x, g + y, z, C.TRUNK);
  const layers = Math.floor(H / 4);
  for (let l = 0; l < layers; l++) {
    const yy = base + l * (H - 3) / layers, rad = (1 - l / layers) * (5 + H * 0.12) + 1.2;
    for (let dy = 0; dy < 3; dy++) {
      const rr = rad - dy * 1.1;
      for (let dz = -Math.ceil(rr); dz <= rr; dz++) for (let dx = -Math.ceil(rr); dx <= rr; dx++) {
        const d = Math.hypot(dx, dz) + (vnoise(dx * 0.9 + x, dz * 0.9 + z + l * 3) - 0.5) * 1.6;
        if (d > rr) continue;
        if (d > rr - 1.5 && hash3(x + dx, yy + dy, z + dz) < 0.3) continue;
        const droop = d > rr - 1.6 && dy === 0 ? -1 : 0;
        Sf(x + dx, yy + dy + droop, z + dz, hash3(dx, l, dz) < 0.55 ? C.FIR_A : C.FIR_B);
      }
    }
  }
  S(x, base + H - 1, z, C.FIR_A); S(x, base + H, z, C.FIR_A);
}
function bush(x, z, R) {
  const g = groundY(x, z), r = 2 + R() * 2.5;
  blob(x, g + r * 0.5, z, r, r * 0.75, r, () => R() < 0.5 ? C.LEAF_B : C.LEAF_A, R, 0.3);
  if (R() < 0.3) for (let i = 0; i < 4; i++) S(x + (R() - 0.5) * r * 2, g + r * 0.9, z + (R() - 0.5) * r * 2, C.BERRY);
}
function rock(x, z, r, R) {
  const g = groundY(x, z);
  blob(x, g, z, r * (1 + R() * 0.4), r * 0.7, r * (1 + R() * 0.4), () => R() < 0.7 ? C.STONE : C.STONE_D, R, 0.0);
}

// ---------- marcos de exploração ----------
function bridge() {
  const x0 = POS.bridgeX, zc = ravineZ(x0);
  const zA = Math.round(zc - 17), zB = Math.round(zc + 17);
  const deck = Math.max(groundY(x0, zA), groundY(x0, zB)) + 1;
  const span = zB - zA;
  for (let z = zA - 3; z <= zB + 3; z++) {
    const t = (z - zA) / span, archY = deck - 3 - Math.max(0, Math.sin(Math.PI * clamp(t, 0, 1)) * 9) + 9 * (t < 0 || t > 1 ? 1 : 0);
    for (let x = x0 - 3; x <= x0 + 3; x++) {
      for (let y = Math.max(Math.floor(deck - 13 + Math.sin(Math.PI * clamp(t, 0, 1)) * 10), 2); y <= deck; y++) {
        if (y < deck - 2 && y < archY) continue;
        const c = hash3(x, y, z) < 0.12 ? C.MOSS : (y + z) % 3 === 0 ? C.RUIN_D : C.RUIN;
        S(x, y, z, c);
      }
      // pilares nas margens
      if (t < 0.05 || t > 0.95) for (let y = 3; y < deck; y++) if (Math.abs(x - x0) < 3) S(x, y, z, C.RUIN_D);
    }
    // parapeito (com trecho desabado)
    if (!(t > 0.55 && t < 0.72)) { S(x0 - 3, deck + 1, z, C.RUIN); S(x0 + 3, deck + 1, z, C.RUIN); if (z % 4 === 0) { S(x0 - 3, deck + 2, z, C.RUIN_D); S(x0 + 3, deck + 2, z, C.RUIN_D); } }
  }
}
function column(x, z, r, H, R, cap = true) {
  const g = groundY(x, z) - 1;
  for (let y = 0; y < H; y++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dz * dz > r * r + 1) continue;
    if (y > H - 4 && hash3(x + dx, y, z + dz) < 0.35 * (y - H + 4)) continue;
    S(x + dx, g + y, z + dz, (y % 4 === 0) ? C.RUIN_D : hash3(dx, y, dz) < 0.1 ? C.MOSS : C.RUIN);
  }
  if (cap && H > 12) for (let dz = -r - 1; dz <= r + 1; dz++) for (let dx = -r - 1; dx <= r + 1; dx++) S(x + dx, g + H, z + dz, C.RUIN_D);
  return g + H;
}
function ruins(R) {
  const { x: cx, z: cz } = POS.ruins;
  // piso de lajes
  for (let z = cz - 18; z <= cz + 18; z++) for (let x = cx - 18; x <= cx + 18; x++) {
    if (Math.hypot(x - cx, z - cz) > 17 || hash2(x, z) < 0.25) continue;
    S(x, groundY(x, z) - 1, z, (Math.floor(x / 3) + Math.floor(z / 3)) % 2 ? C.RUIN : C.RUIN_D);
  }
  const tops = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = Math.round(cx + Math.cos(a) * 14), z = Math.round(cz + Math.sin(a) * 14);
    const H = i === 1 || i === 2 ? 22 : 5 + Math.floor(R() * 15);
    tops.push(column(x, z, 2, H, R, H > 12));
  }
  // arco entre as colunas 1 e 2
  const a1 = 1 / 8 * Math.PI * 2, a2 = 2 / 8 * Math.PI * 2;
  const p1 = [cx + Math.cos(a1) * 14, cz + Math.sin(a1) * 14], p2 = [cx + Math.cos(a2) * 14, cz + Math.sin(a2) * 14];
  for (let s = 0; s <= 1; s += 0.02) {
    const x = lerp(p1[0], p2[0], s), z = lerp(p1[1], p2[1], s), y = Math.min(tops[1], tops[2]) + Math.sin(Math.PI * s) * 4;
    for (let k = 0; k < 3; k++) S(x, y + k, z, C.RUIN);
  }
  // blocos caídos
  for (let i = 0; i < 7; i++) { const x = cx + (R() - 0.5) * 34, z = cz + (R() - 0.5) * 34, g = groundY(x, z); for (let k = 0; k < 6; k++) { S(x + k * 0.7, g, z + k * 0.7, C.RUIN); S(x + k * 0.7 + 1, g, z + k * 0.7, C.RUIN_D); S(x + k * 0.7, g + 1, z + k * 0.7, C.RUIN); } }
}
function tower(R) {
  const { x: cx, z: cz } = POS.tower, g = groundY(cx, cz) - 2, H = 62;
  for (let y = 0; y < H; y++) {
    const rad = 7 - y * 0.02;
    for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) {
      const d = Math.hypot(dx, dz); if (d > rad) continue;
      if (y > H - 10 && hash3(dx, y, dz) < (y - H + 10) * 0.09) continue;
      let c = (y % 5 === 0) ? C.RUIN_D : hash3(dx + cx, y, dz) < 0.08 ? C.MOSS : C.RUIN;
      const ang = Math.atan2(dz, dx);
      if (d > rad - 1.2 && y % 14 > 9 && y % 14 < 13 && Math.abs(Math.sin(ang * 2)) < 0.2) c = (y > 40 && ang > 0) ? C.RUNE : C.WIN_D;
      S(cx + dx, g + y, cz + dz, c);
    }
  }
  // ameias
  for (let a = 0; a < 16; a++) if (a % 2 === 0 && hash2(a, 7) > 0.35) { const x = cx + Math.cos(a / 16 * Math.PI * 2) * 6.6, z = cz + Math.sin(a / 16 * Math.PI * 2) * 6.6; S(x, g + H, z, C.RUIN_D); S(x, g + H + 1, z, C.RUIN_D); }
}
function temple(R) {
  const { x: cx, z: cz } = POS.temple; let g = groundY(cx, cz) - 1;
  for (let tier = 0; tier < 3; tier++) {
    const w = 13 - tier * 2.5;
    for (let y = 0; y < 2; y++) for (let z = -w; z <= w; z++) for (let x = -w; x <= w; x++) S(cx + x, g + y, cz + z, (x + z) % 2 ? C.RUIN : C.RUIN_D);
    g += 2;
  }
  for (let s = 0; s < 6; s++) for (let x = -3; x <= 3; x++) S(cx + x, g - 6 + s, cz + 13 + 3 - s, C.RUIN);
  const P = [[-5, -5], [5, -5], [-5, 5], [5, 5]];
  for (const [px, pz] of P) for (let y = 0; y < 10; y++) { S(cx + px, g + y, cz + pz, C.RUIN); S(cx + px + 1, g + y, cz + pz, C.RUIN_D); }
  for (let k = 0; k < 6; k++) { const w = 8 - k * 1.4; for (let z = -w; z <= w; z++) for (let x = -w; x <= w; x++) S(cx + x, g + 10 + k, cz + z, k === 0 ? C.WOOD_D : C.ROOF); }
  // brasa misteriosa no altar
  S(cx, g, cz, C.RUIN_D); S(cx, g + 1, cz, C.RUNE);
}
function cave(R) {
  const { x: cx, z: cz } = POS.cave, g = groundY(cx, cz);
  blob(cx, g + 4, cz, 26, 24, 20, (x, y, z, d) => y > g + 20 && d < 0.6 ? C.STONE : hash3(x, y, z) < 0.5 ? C.STONE : C.STONE_D, R, 0.0);
  // boca da caverna voltada para oeste (lago)
  for (let x = cx - 30; x < cx + 6; x++) for (let y = g - 1; y < g + 11; y++) for (let z = cz - 7; z <= cz + 7; z++) {
    const ny = (y - (g - 1)) / 11, nz = (z - cz) / 7;
    if (ny * ny + nz * nz * (1 + 0.6 * ny) < 1 + (vnoise3(x * 0.3, z * 0.3, y * 0.3) - 0.5) * 0.4) S(x, y, z, 0);
  }
  for (let i = 0; i < 14; i++) { const x = cx - 8 + R() * 12, z = cz - 5 + R() * 10; const h = 1 + Math.floor(R() * 3); for (let k = 0; k < h; k++) S(x, g - 1 + k, z, C.CRYSTAL); }
}

// ---------- construção do grid detalhado ----------
export function buildDetail() {
  const t0 = performance.now();
  G = new Grid(GSX, GSY, GSZ);
  const R = rng(7);
  for (let gz = 0; gz < GSZ; gz++) for (let gx = 0; gx < GSX; gx++) {
    const x = gx + GX0, z = gz + GZ0;
    const h = Math.max(1, Math.min(GSY - 30, Math.floor(hWorld(x, z))));
    HM[gz * GSX + gx] = h;
  }
  for (let gz = 0; gz < GSZ; gz++) for (let gx = 0; gx < GSX; gx++) {
    const h = HM[gz * GSX + gx], x = gx + GX0, z = gz + GZ0;
    const hx = HM[gz * GSX + Math.min(GSX - 1, gx + 1)], hz = HM[Math.min(GSZ - 1, gz + 1) * GSX + gx];
    const hx2 = HM[gz * GSX + Math.max(0, gx - 1)], hz2 = HM[Math.max(0, gz - 1) * GSX + gx];
    const steep = Math.max(Math.abs(h - hx), Math.abs(h - hz), Math.abs(h - hx2), Math.abs(h - hz2)) > 2;
    for (let y = 0; y < h; y++) {
      let c = y < h - 3 ? (hash3(x, y, z) < 0.5 ? C.STONE_D : C.STONE) : C.SOIL;
      if (y === h - 1) {
        if (h <= 9) c = hash2(x, z) < 0.5 ? C.BED : C.STONE_D;
        else if (steep) c = hash3(x, y, z) < 0.6 ? C.STONE : C.STONE_D;
        else { const n = vnoise(x * 0.15, z * 0.15); c = n < 0.18 && Math.hypot(x, z) > 8 ? C.SOIL2 : hash2(x, z) < 0.12 ? C.SNOW2 : n > 0.75 ? C.SNOWB : C.SNOW; }
      } else if (y >= h - 3 && steep) c = hash3(x, y, z) < 0.5 ? C.STONE : C.SOIL;
      G.d[(y * GSZ + gz) * GSX + gx] = c;
    }
  }
  bridge(); ruins(R); tower(R); temple(R); cave(R);
  // árvores (amostragem em grade com jitter + máscaras de exclusão)
  const exclude = (x, z) => {
    const r = Math.hypot(x, z);
    if (r < 50 + vnoise(x * 0.08, z * 0.08) * 10) return true;
    if (z > ravineZ(x) && Math.abs(x - streamX(z)) < 8) return true;
    if (Math.abs(z - ravineZ(x)) < 16 && Math.abs(x) < 120) return true;
    const lx = (x - POS.lake.x) / 66, lz = (z - POS.lake.z) / 42; if (lx * lx + lz * lz < 1.2) return true;
    if (Math.hypot(x - POS.ruins.x, z - POS.ruins.z) < 21) return true;
    if (Math.hypot(x - POS.tower.x, z - POS.tower.z) < 13) return true;
    if (Math.abs(x - POS.temple.x) < 18 && Math.abs(z - POS.temple.z) < 22) return true;
    if (Math.hypot(x - POS.cave.x, z - POS.cave.z) < 30) return true;
    if (z < -437) return true;
    return false;
  };
  let trees = 0;
  for (let z = GZ0 + 4; z < GZ0 + GSZ - 4; z += 9) for (let x = GX0 + 4; x < GX0 + GSX - 4; x += 9) {
    const tx = Math.round(x + (R() - 0.5) * 7), tz = Math.round(z + (R() - 0.5) * 7);
    const dens = 0.55 + 0.4 * vnoise(tx * 0.02, tz * 0.02);
    const k = R();
    if (exclude(tx, tz) || k > dens) { if (!exclude(tx, tz) && R() < 0.4) bush(tx, tz, R); continue; }
    if (R() < 0.42) umbrellaTree(tx, tz, R); else firTree(tx, tz, R, 1 + R() * 0.3);
    trees++;
    if (R() < 0.35) bush(tx + 5, tz + 3, R);
  }
  // borda da clareira: algumas árvores emoldurando, arbustos, pedras, tronco caído
  const ring = [[-52, -12, 'u'], [-44, 26, 'f'], [50, -22, 'u'], [-16, -54, 'f'], [14, -55, 'u'], [-56, 8, 'f'], [54, 14, 'f'], [36, -44, 'f'], [-38, -40, 'u']];
  for (const [x, z, k] of ring) k === 'u' ? umbrellaTree(x, z, R) : firTree(x, z, R, 1.2);
  for (let i = 0; i < 40; i++) { const a = R() * Math.PI * 2, r = 36 + R() * 16; bush(Math.cos(a) * r, Math.sin(a) * r, R); }
  rock(-24, -12, 2.4, R); rock(19, 16, 1.6, R); rock(28, -20, 3.0, R); rock(-30, 20, 1.5, R); rock(-8, 34, 2.0, R); rock(36, 4, 1.8, R);
  { for (let k = 0; k < 13; k++) { const x = -30 + k, z = 4 + k * 0.3, g = groundY(x, z); S(x, g, z, C.TRUNK2); S(x, g, z + 1, C.TRUNK); if (k % 3) S(x, g + 1, z, C.TRUNK2); } }
  // grama congelada (tufos verticais como nas referências)
  for (let gz = 1; gz < GSZ - 1; gz++) for (let gx = 1; gx < GSX - 1; gx++) {
    const x = gx + GX0, z = gz + GZ0, h = HM[gz * GSX + gx];
    if (h <= 9 || Gget(x, h, z)) continue;
    const r = Math.hypot(x, z);
    let p = 0.05 + 0.25 * smoothstep(0.45, 0.8, vnoise(x * 0.06 + 5, z * 0.06));
    if (r < 56) p = 0.02 + 0.4 * smoothstep(16, 46, r) * vnoise(x * 0.12, z * 0.12);
    if (hash2(x * 3, z * 7) > p) continue;
    const H = 1 + Math.floor(hash2(x, z * 3) * (Math.hypot(x, z) < 56 ? 2.2 : 3.2));
    for (let k = 0; k < H; k++) S(x, h + k, z, k === H - 1 ? (hash2(x, z) < 0.15 ? C.GRASS_W : C.GRASS_TIP) : hash2(z, x + k) < 0.5 ? C.GRASS : C.GRASS2);
  }
  // remove voxels flutuantes: flood-fill (26-conectado) a partir do chão
  { const D = G.d, N = D.length, SXZ = GSX * GSZ, seen = new Uint8Array(N), q = new Int32Array(N); let h = 0, tl = 0;
    for (let i = 0; i < SXZ; i++) if (D[i]) { seen[i] = 1; q[tl++] = i; }
    while (h < tl) { const i = q[h++], y = (i / SXZ) | 0, r = i - y * SXZ, z = (r / GSX) | 0, x = r - z * GSX;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= GSY) continue;
        for (let dz = -1; dz <= 1; dz++) { const zz = z + dz; if (zz < 0 || zz >= GSZ) continue;
          for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= GSX) continue;
            const j = yy * SXZ + zz * GSX + xx; if (D[j] && !seen[j]) { seen[j] = 1; q[tl++] = j; } } } } }
    let removed = 0; for (let i = 0; i < N; i++) if (D[i] && !seen[i]) { D[i] = 0; removed++; }
    console.log('floating voxels removed', removed); }
  // passe de neve: toda face superior exposta recebe neve
  for (let y = GSY - 2; y >= 0; y--) for (let gz = 0; gz < GSZ; gz++) for (let gx = 0; gx < GSX; gx++) {
    const i = (y * GSZ + gz) * GSX + gx, c = G.d[i]; if (!c) continue;
    if (G.d[i + GSX * GSZ]) continue;
    const s = SNOWABLE.get(c); if (s && hash3(gx, y, gz) < 0.88) G.d[i] = s;
  }
  console.log('detail grid', (performance.now() - t0).toFixed(0), 'ms, trees', trees);
  return G;
}

export function meshDetail(material, group) {
  const t0 = performance.now(); let tris = 0;
  const CH = 32;
  for (let cz = 0; cz < GSZ; cz += CH) for (let cx = 0; cx < GSX; cx += CH) {
    const geo = meshGrid(G, cx, cx + CH, cz, cz + CH, {});
    if (!geo) continue;
    tris += geo.index.count / 3;
    const m = new THREE.Mesh(geo, material); m.position.set(GX0, 0, GZ0);
    m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix();
    group.add(m);
  }
  console.log('detail mesh', (performance.now() - t0).toFixed(0), 'ms, tris', tris);
}

// ---------- LOD: anel médio e distante ----------
const tmp = new THREE.Color();
const lin = hex => { tmp.setHex(hex); return [tmp.r, tmp.g, tmp.b]; };
const COL = { snow: lin(0xe9eef6), snowB: lin(0xd4dde9), canopy: lin(0x9aaec4), canopyS: lin(0xe8eef6), fir: lin(0x5d7680), rock: lin(0x7c8494), rockD: lin(0x5c6372) };
function crownAt(x, z) {
  // copas como domos/cones (não colunas): máximo das contribuições das células vizinhas
  const cs = 11, ci = Math.floor(x / cs), cj = Math.floor(z / cs); let best = 0;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const i = ci + di, j = cj + dj;
    if (hash2(i, j + 77) > 0.86) continue;
    const px = (i + 0.2 + hash2(i, j) * 0.6) * cs, pz = (j + 0.2 + hash2(j, i + 3) * 0.6) * cs;
    const rad = 6 + hash2(i + 9, j) * 4, H = 16 + hash2(i, j + 5) * 22, d = Math.hypot(x - px, z - pz) / rad;
    if (d >= 1) continue;
    const v = hash2(i + 1, j + 1) < 0.5 ? H * (1 - d) : H * (0.55 + 0.45 * Math.sqrt(1 - d * d)) * (d < 0.97 ? 1 : 0.5);
    if (v > best) best = v;
  }
  return best;
}
function lodHeight(x, z, withTrees) {
  let h = hBase(x, z);
  if (!withTrees) return h;
  const r = Math.hypot(x, (z + 300) * 0.85);
  const forest = smoothstep(-0.35, 0.15, fbm(x * 0.004 + 9, z * 0.004)) * (1 - smoothstep(650, 1000, r)) * (h > -30 || z > -470 ? 1 : 0.7);
  if (forest > 0.05) h += crownAt(x, z) * Math.min(1, forest * 1.5);
  return h;
}
function lodColor(x, z, h, top) {
  const base = hBase(x, z), j = 0.94 + hash2(Math.floor(x), Math.floor(z)) * 0.08;
  const slope = Math.abs(hBase(x + 6, z) - hBase(x - 6, z)) + Math.abs(hBase(x, z + 6) - hBase(x, z - 6));
  let c;
  if (h - base > 4) c = top ? (hash2(Math.floor(x / 4), Math.floor(z / 4) + 3) < 0.72 ? COL.canopyS : COL.canopy) : (hash2(Math.floor(x/4),Math.floor(h/4)) < 0.5 ? COL.fir : COL.canopy);
  else if (slope > 26) c = top ? COL.snowB : COL.rockD;
  else c = top ? COL.snow : COL.rock;
  return [c[0] * j, c[1] * j, c[2] * j];
}
export function buildLOD(material, group) {
  const t0 = performance.now(); let tris = 0;
  const add = geo => { if (!geo) return; tris += geo.index.count / 3; const m = new THREE.Mesh(geo, material); m.receiveShadow = true; m.matrixAutoUpdate = false; group.add(m); };
  // anel médio (voxel 4)
  const s1 = 4, mx0 = -448, mz0 = -768, mW = 224, mH = 288; // x: -448..448, z: -768..384
  const inDetail = (x, z, s) => x >= GX0 && x + s <= GX0 + GSX && z >= GZ0 && z + s <= GZ0 + GSZ;
  const CH = 32;
  for (let cj = 0; cj < mH; cj += CH) for (let ci = 0; ci < mW; ci += CH) {
    add(meshHeightfield(Math.min(CH, mW - ci), Math.min(CH, mH - cj),
      (i, j) => lodHeight(mx0 + (ci + i) * s1 + 2, mz0 + (cj + j) * s1 + 2, true),
      (i, j, h, top) => lodColor(mx0 + (ci + i) * s1, mz0 + (cj + j) * s1, h, top),
      { scale: s1, unit: 2, ox: mx0 + ci * s1, oz: mz0 + cj * s1, skip: (i, j) => inDetail(mx0 + (ci + i) * s1, mz0 + (cj + j) * s1, s1) }));
  }
  // anel distante (voxel 24)
  const s2 = 24, fx0 = -3600, fz0 = -3600, fW = 300, fH = 270;
  const inMid = (x, z) => x >= mx0 && x + s2 <= mx0 + mW * s1 && z >= mz0 && z + s2 <= mz0 + mH * s1;
  for (let cj = 0; cj < fH; cj += 30) for (let ci = 0; ci < fW; ci += 30) {
    add(meshHeightfield(30, 30,
      (i, j) => lodHeight(fx0 + (ci + i) * s2 + 12, fz0 + (cj + j) * s2 + 12, true),
      (i, j, h, top) => lodColor(fx0 + (ci + i) * s2, fz0 + (cj + j) * s2, h, top),
      { scale: s2, unit: 6, ox: fx0 + ci * s2, oz: fz0 + cj * s2, skip: (i, j) => inMid(fx0 + (ci + i) * s2, fz0 + (cj + j) * s2) }));
  }
  console.log('lod', (performance.now() - t0).toFixed(0), 'ms, tris', tris);
}

// ---------- a estrutura colossal (mistério) ----------
export function buildMystery(material) {
  const g = new Grid(120, 130, 46), V = (x, y, z, v) => g.set(x, y, z, v);
  const stone = (x, y, z) => hash3(x, y, z) < 0.15 ? C.RUIN_D : (y % 6 === 0 ? C.RUIN_D : C.RUIN);
  // base escalonada
  for (let t = 0; t < 6; t++) { const w = 58 - t * 6, d = 22 - t * 2.5; for (let y = t * 4; y < t * 4 + 4; y++) for (let z = 23 - d; z <= 23 + d; z++) for (let x = 60 - w; x <= 60 + w; x++) V(x, y, z, stone(x, y, z)); }
  // dois monólitos inclinados
  for (const side of [-1, 1]) for (let y = 20; y < 122; y++) {
    const cx = 60 + side * (34 - (y - 20) * 0.12), w = 7 - (y - 20) * 0.025;
    if (side === 1 && y > 108 && hash3(1, y, 2) < (y - 108) * 0.08) continue;
    for (let z = 16; z <= 30; z++) for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      let c = stone(x, y, z);
      if (Math.abs(x - cx) < 1 && y % 9 < 6 && z === 16) c = C.RUNE;
      V(x, y, z, c);
    }
  }
  // anel gigante entre eles (parcialmente quebrado) com runas
  const rc = [60, 70], R0 = 27, R1 = 22;
  for (let y = 38; y < 102; y++) for (let x = 25; x < 96; x++) {
    const d = Math.hypot(x - rc[0], y - rc[1]); if (d > R0 || d < R1) continue;
    const a = Math.atan2(y - rc[1], x - rc[0]);
    if (hash3(x >> 2, y >> 2, 1) < 0.12 && d > R0 - 2) continue; // erosão
    for (let z = 19; z <= 27; z++) V(x, y, z, (Math.abs(d - (R0 + R1) / 2) < 0.7 && Math.floor(a * 12) % 2 === 0 && (z === 19)) ? C.RUNE : stone(x, y, z));
  }
  // núcleo
  for (let y = 64; y < 77; y++) for (let x = 54; x < 67; x++) if (Math.hypot(x - 60, y - 70) < 5.5) { V(x, y, 23, C.RUNE); }
  const geo = meshGrid(g, 0, g.sx, 0, g.sz, { scale: 4 });
  const m = new THREE.Mesh(geo, material);
  m.position.set(POS.mystery.x - 240, POS.mystery.y, POS.mystery.z - 92);
  m.matrixAutoUpdate = false; m.updateMatrix();
  return m;
}

// consultas para validação de câmera (colisão / oclusão)
export function solidAt(x, y, z) { return Gget(Math.floor(x), Math.floor(y), Math.floor(z)) > 0; }
export function rayBlocked(a, b, stopShort = 4) {
  const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), n = Math.ceil(d / 0.5);
  for (let i = 1; i < n; i++) { const s = i / n; if (d * (1 - s) < stopShort) break;
    if (solidAt(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s)) return d * s; }
  return 0;
}
