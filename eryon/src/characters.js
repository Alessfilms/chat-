// Moradores de Eryon — voxels de 0.5u, montados em partes articuladas para animação.
import * as THREE from 'three';
import { Grid, pal, meshGrid } from './voxel.js';

const V = 0.5;
function part(boxes, mat, pivot = [0, 0, 0]) {
  // boxes: [x0,y0,z0,x1,y1,z1,color] em voxels, relativos ao pivô
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const b of boxes) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b[k]); mx[k] = Math.max(mx[k], b[k + 3]); }
  const g = new Grid(mx[0] - mn[0] + 1, mx[1] - mn[1] + 1, mx[2] - mn[2] + 1);
  for (const b of boxes) g.box(b[0] - mn[0], b[1] - mn[1], b[2] - mn[2], b[3] - mn[0], b[4] - mn[1], b[5] - mn[2], b[6]);
  const geo = meshGrid(g, 0, g.sx, 0, g.sz, { scale: V, closedBottom: false, aoMul: 0.7 });
  geo.translate(mn[0] * V, mn[1] * V, mn[2] * V);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  const o = new THREE.Group(); o.position.set(...pivot.map(v => v * V)); o.add(m); return o;
}

const K = {
  skin: pal(0xf0c8a6, 0, 0, 0.02), eye: pal(0x221c1c, 0, 0, 0), blush: pal(0xe8a690, 0, 0, 0),
  teal: pal(0x2f5f69, 0, 0, 0.05), tealD: pal(0x234850, 0, 0, 0.05), tealSk: pal(0x2f5f69, 0.35, 0, 0.05), trim: pal(0xd9c79a, 0, 0, 0.03),
  pants: pal(0x3b3f4a, 0, 0, 0.04), boot: pal(0x2b2320, 0, 0, 0.04), brass: pal(0xb08a45, 0, 0, 0.05), flame: pal(0xffc070, 0, 1.6, 0),
  coat: pal(0x6c4a34, 0, 0, 0.05), coatD: pal(0x553826, 0, 0, 0.05), scarf: pal(0xd0582c, 0, 0, 0.05), scarfSw: pal(0xd0582c, 0.5, 0, 0.05),
  pack: pal(0x5d4c3b, 0, 0, 0.05), roll: pal(0x9c8a6c, 0, 0, 0.05), hair: pal(0x3a2a22, 0, 0, 0.05), cap: pal(0xc99a3a, 0, 0, 0.05),
  staff: pal(0x7a5638, 0, 0, 0.06), legB: pal(0x4a4038, 0, 0, 0.04),
};

export function makeCharacter(kind, mat) {
  const root = new THREE.Group();
  const isA = kind === 'A';
  const body = isA ? K.teal : K.coat, bodyD = isA ? K.tealD : K.coatD, leg = isA ? K.pants : K.legB;
  // pernas (pivô no quadril)
  const legL = part([[-1, -5, -1, 0, -1, 0, leg], [-1, -6, -1, 0, -6, 1, K.boot], [-1, -5, -1, 0, -5, 0, K.boot]], mat, [-1, 6, 0]);
  const legR = part([[-1, -5, -1, 0, -1, 0, leg], [-1, -6, -1, 0, -6, 1, K.boot], [-1, -5, -1, 0, -5, 0, K.boot]], mat, [1, 6, 0]);
  const hips = new THREE.Group(); hips.add(legL, legR); root.add(hips);
  // tronco (pivô na cintura)
  const tb = [[-3, 0, -2, 2, 6, 1, body], [-3, 0, -2, 2, 0, 1, bodyD]];
  if (isA) {
    tb.push([-4, -3, -3, 3, -1, 2, K.tealSk], [-4, -4, -3, 3, -4, 2, K.trim], [-1, 1, 2, 0, 5, 2, K.trim]); // capa até os joelhos
  } else {
    tb.push([-3, -2, -2, 2, -1, 1, K.coat], [-3, 0, -2, 2, 0, 1, K.coatD], [-3, 5, -2, 2, 6, 2, K.scarf], [1, 1, 2, 2, 4, 2, K.scarfSw]);
    tb.push([-2, 0, -4, 1, 5, -3, K.pack], [-3, 6, -4, 2, 7, -3, K.roll]); // mochila + saco de dormir
  }
  const torso = part(tb, mat, [0, 6, 0]);
  // cabeça (pivô no pescoço)
  const hb = [[-3, 0, -2, 2, 4, 2, K.skin], [-2, 1, 3, 1, 3, 3, K.skin], [-2, 2, 3, -2, 2, 3, K.eye], [1, 2, 3, 1, 2, 3, K.eye], [-3, 1, 3, -3, 1, 3, K.blush], [2, 1, 3, 2, 1, 3, K.blush]];
  if (isA) hb.push([-4, 0, -3, 3, 5, -2, K.teal], [-4, 5, -3, 3, 6, 3, K.teal], [-4, 0, -3, -4, 5, 3, K.teal], [3, 0, -3, 3, 5, 3, K.teal], [-3, 6, -2, 2, 6, 1, K.tealD], [-4, 5, 3, 3, 5, 3, K.trim], [-1, 7, -2, 0, 7, -1, K.tealD]);
  else hb.push([-3, 3, -3, 2, 5, -2, K.hair], [-3, 2, -2, -3, 3, 1, K.hair], [2, 2, -2, 2, 3, 1, K.hair], [-4, 4, -3, 3, 6, 2, K.cap], [-4, 4, 3, 3, 4, 3, K.coatD], [-1, 7, -1, 0, 7, 0, K.cap]);
  const head = part(hb, mat, [0, 7, 0]);
  torso.add(head);
  // braços (pivô no ombro)
  const sleeve = isA ? K.teal : K.coat;
  const armL = part([[-1, -6, -1, 0, 0, 0, sleeve], [-1, -7, -1, 0, -7, 0, K.skin]], mat, [-4, 5.5, 0]);
  const armR = part([[-1, -6, -1, 0, 0, 0, sleeve], [-1, -7, -1, 0, -7, 0, K.skin]], mat, [4, 5.5, 0]);
  torso.add(armL, armR);
  let prop = null;
  if (isA) { // lanterna pendurada na mão direita
    prop = part([[0, -2, 0, 0, 0, 0, K.brass], [-1, -3, -1, 1, -3, 1, K.brass], [-1, -6, -1, 1, -4, 1, K.flame], [-1, -7, -1, 1, -7, 1, K.brass], [0, -4, -1, 0, -6, -1, K.brass]], mat, [0.5, -7.5, 0.5]);
    armR.add(prop);
  } else { // cajado na mão esquerda
    prop = part([[0, -12, 0, 0, 14, 0, K.staff], [0, 14, 0, 0, 15, 0, K.brass]], mat, [-0.5, -7, 0.5]);
    armL.add(prop);
  }
  hips.add(torso);
  root.userData = { hips, torso, head, legL, legR, armL, armR, prop, kind };
  return root;
}

// pose procedural: tudo deriva de t (determinístico)
export function pose(ch, t, p = {}) {
  const u = ch.userData, ph = u.kind === 'A' ? 0 : 1.7;
  const breath = Math.sin(t * 2 * Math.PI / 3.4 + ph);
  u.torso.scale.set(1 + breath * 0.012, 1 + breath * 0.022, 1 + breath * 0.015);
  const walk = p.walk || 0, cyc = (p.walkPhase ?? t * 7.5);
  const sw = Math.sin(cyc) * 0.55 * walk;
  u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
  u.hips.position.y = Math.abs(Math.cos(cyc)) * 0.18 * walk + breath * 0.02;
  // olhar: yaw/pitch + micro-movimento
  const micro = Math.sin(t * 0.9 + ph) * 0.06 + Math.sin(t * 2.3 + ph * 2) * 0.025;
  u.head.rotation.y = (p.look || 0) + micro;
  u.head.rotation.x = -(p.up || 0) + Math.sin(t * 1.3 + ph) * 0.02;
  u.torso.rotation.x = -(p.up || 0) * 0.18 + (p.lean || 0);
  u.torso.rotation.y = (p.look || 0) * 0.25;
  const armSw = -sw * 0.7;
  u.armL.rotation.x = armSw + (p.armL || 0) + breath * 0.02;
  u.armR.rotation.x = -armSw + (p.armR || 0) - breath * 0.02;
  u.armL.rotation.z = -0.08 - (p.armLz || 0); u.armR.rotation.z = 0.08 + (p.armRz || 0);
  if (u.kind === 'A' && u.prop) { // lanterna balança de forma pendular
    u.prop.rotation.x = -u.armR.rotation.x + Math.sin(t * 2.1) * 0.12 + walk * Math.sin(cyc) * 0.3;
    u.prop.rotation.z = -u.armR.rotation.z + Math.sin(t * 1.7 + 1) * 0.08;
  }
}

export function ghostify(ch, mat) {
  const c = ch.clone(true);
  c.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; o.receiveShadow = false; } });
  // reconstrói referências de partes no clone
  const map = new Map(); ch.traverse(o => map.set(o, null));
  const src = [], dst = []; ch.traverse(o => src.push(o)); c.traverse(o => dst.push(o));
  const ud = {}; for (const k of Object.keys(ch.userData)) { const i = src.indexOf(ch.userData[k]); ud[k] = i >= 0 ? dst[i] : ch.userData[k]; }
  c.userData = ud; return c;
}
