// Efeitos vivos: neve com profundidade (vira bokeh no DOF), brilhos aditivos, fumaça/respiração,
// estrelas cadentes, fogueira, cartões de névoa, pássaros, casa em timelapse e acampamento-visão.
import * as THREE from 'three';
import { GLSL_COMMON, U, patchWorld } from './materials.js';
import { Grid, pal, meshGrid } from './voxel.js';
import { hash2, rng, vnoise, lerp, clamp, smoothstep } from './noise.js';

export const PX = { value: 1000 }; // px por unidade a 1u de distância (atualizado com a câmera)

// ---------- neve (opaca, escreve profundidade) ----------
export function makeSnow(n = 5000) {
  const R = rng(3), base = new Float32Array(n * 3), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) { base[i * 3] = R(); base[i * 3 + 1] = R(); base[i * 3 + 2] = R(); sz[i] = 0.12 + R() * 0.22; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(base, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(160, 80, 160) }, uPx: PX, uDensity: { value: 1 } },
    vertexShader: `${GLSL_COMMON}\nuniform vec3 uCenter; uniform vec3 uBox; uniform float uPx; uniform float uDensity; attribute float aSize; varying vec3 vWPos;
      void main(){
        vec3 b = position;
        if (b.x > uDensity) { gl_Position = vec4(2.,2.,2.,1.); gl_PointSize = 0.; return; }
        vec3 drift = vec3(uTime*(1.6+b.y*0.8), -uTime*(1.4 + b.z*0.9), uTime*0.5);
        vec3 p = fract(b + drift/uBox) - 0.5;
        vec3 w = uCenter + p*uBox;
        w.x += sin(uTime*1.3 + b.z*40.)*0.6; w.z += cos(uTime*1.1 + b.x*40.)*0.6;
        vWPos = w; vec4 mv = viewMatrix*vec4(w,1.);
        gl_Position = projectionMatrix*mv; gl_PointSize = clamp(aSize*uPx/(-mv.z), 1.2, 70.); if (-mv.z < 5.0) { gl_Position = vec4(2.,2.,2.,1.); }
      }`,
    fragmentShader: `${GLSL_COMMON}\nvarying vec3 vWPos; void main(){ vec2 q = gl_PointCoord-0.5; if (dot(q,q) > 0.25) discard;
        gl_FragColor = vec4(applyFog(vec3(1.05,1.07,1.12), vWPos), 1.); }`,
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; return pts;
}

// ---------- brilhos aditivos (estrelas, chamas, centelhas, janelas) ----------
export class Glows {
  constructor(cap = 6000, blending = THREE.AdditiveBlending, soft = false) {
    this.cap = cap; this.n = 0;
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.size = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.g = g;
    const frag = soft
      ? `varying vec4 vCol; varying float vSeed; uniform float uTime; float h(vec2 p){return fract(sin(dot(p,vec2(12.9,78.2)))*43758.5);}
         void main(){ vec2 q = gl_PointCoord-0.5; float d = length(q)*2.; if (d>1.) discard;
           float a = smoothstep(1.0, 0.2, d); a *= 0.75 + 0.25*sin(atan(q.y,q.x)*3. + vSeed*6.);
           gl_FragColor = vec4(vCol.rgb, vCol.a*a); }`
      : `varying vec4 vCol; varying float vSeed; void main(){ vec2 q = gl_PointCoord-0.5; float d = length(q)*2.; if (d>1.) discard;
           float a = exp(-d*d*5.0)*(1.0-d) + exp(-d*d*40.0)*0.6; gl_FragColor = vec4(vCol.rgb*vCol.a*a, 1.); }`;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uPx: PX, uTime: U.uTime },
      vertexShader: `uniform float uPx; attribute vec4 aCol; attribute float aSize; varying vec4 vCol; varying float vSeed;
        void main(){ vCol = aCol; vSeed = fract(position.x*0.37+position.z*0.71); vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = min(aSize*uPx/(-mv.z), 380.); }`,
      fragmentShader: frag, transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = soft ? 5 : 6;
  }
  begin() { this.n = 0; }
  add(x, y, z, s, r, g, b, a = 1) {
    if (this.n >= this.cap || a <= 0.001 || s <= 0) return; const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.size[i] = s;
    this.col[i * 4] = r; this.col[i * 4 + 1] = g; this.col[i * 4 + 2] = b; this.col[i * 4 + 3] = a;
  }
  end() { this.g.setDrawRange(0, this.n); for (const k of ['position', 'aCol', 'aSize']) this.g.attributes[k].needsUpdate = true; }
}

// ---------- estrela cadente: céu -> clareira ----------
export function starPos(s, t) {
  // s: {t0, tL, from:Vector3, to:Vector3}; aceleração (ease-in) com leve curva
  const u = clamp((t - s.t0) / (s.tL - s.t0), 0, 1), e = u * u * (1.2 - 0.2 * u);
  const p = new THREE.Vector3().lerpVectors(s.from, s.to, e);
  p.x += Math.sin(u * Math.PI) * (s.curve || 0); return p;
}
export function drawStar(gl, s, t) {
  if (t < s.t0 - 0.6) return;
  const k = s.k || 1;
  if (t < s.tL) {
    // aparição suave no céu (cintila antes de cair)
    const app = smoothstep(s.t0 - 0.6, s.t0 + 0.3, t);
    const head = starPos(s, t), tw = 1 + 0.25 * Math.sin(t * 23);
    gl.add(head.x, head.y, head.z, 6 * k * tw, 3.2, 2.6, 1.6, 2.6 * app);
    gl.add(head.x, head.y, head.z, 9 * k, 1.0, 0.8, 0.55, 0.22 * app);
    for (let i = 1; i < 28; i++) { const tt = t - i * 0.022; if (tt < s.t0) break; const p = starPos(s, tt);
      gl.add(p.x, p.y, p.z, (5 - i * 0.15) * k, 2.4, 1.9, 1.2, (1 - i / 28) * 1.4 * app); }
  } else {
    const a = t - s.tL; // impacto
    if (a < 2.5) {
      gl.add(s.to.x, s.to.y + 1, s.to.z, (14 + a * 30) * k, 2.4, 1.9, 1.3, Math.exp(-a * 3) * 4);
      const R = rng(Math.floor(s.t0 * 100));
      for (let i = 0; i < 46; i++) {
        const ang = R() * 6.283, sp = 4 + R() * 10, up = 3 + R() * 9, life = 0.8 + R() * 1.4;
        if (a > life) continue; const f = a / life;
        gl.add(s.to.x + Math.cos(ang) * sp * a, s.to.y + 0.5 + up * a - 6 * a * a, s.to.z + Math.sin(ang) * sp * a, 0.5 * k, 2.6, 2.0, 1.2, (1 - f) * 2.2);
      }
    }
  }
}

// ---------- fogueira ----------
export function makeCampfire(mat) {
  const g = new Grid(9, 4, 9), log = pal(0x5b3e2c), logD = pal(0x3c2a20), st = pal(0x7c8290), ember = pal(0xff7a30, 0, 1.4);
  for (let a = 0; a < 10; a++) { const x = Math.round(4 + Math.cos(a / 10 * 6.283) * 3.6), z = Math.round(4 + Math.sin(a / 10 * 6.283) * 3.6); g.set(x, 0, z, st); }
  for (let k = 1; k < 8; k++) { g.set(k, 0, 4, k % 2 ? log : logD); g.set(4, 1, k, k % 2 ? logD : log); }
  g.set(4, 0, 4, ember); g.set(3, 0, 3, ember); g.set(5, 0, 5, ember); g.set(4, 2, 4, logD);
  const m = new THREE.Mesh(meshGrid(g, 0, 9, 0, 9, { scale: 0.5 }), mat); m.geometry.translate(-2.25, 0, -2.25); m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function drawFire(gl, pf, at, t, k = 1) {
  for (let i = 0; i < 46; i++) {
    const life = 0.55 + hash2(i, 1) * 0.5, ph = hash2(i, 2) * life, a = ((t + ph) % life) / life;
    const ang = hash2(i, 3) * 6.283, r = (0.25 + hash2(i, 4) * 0.7) * (1 - a);
    const x = at.x + Math.cos(ang) * r + Math.sin(t * 6 + i) * 0.12 * a, z = at.z + Math.sin(ang) * r, y = at.y + 0.3 + a * (2.4 + hash2(i, 5));
    const hot = 1 - a;
    gl.add(x, y, z, (0.9 + hot * 1.1) * k, 3.2 * hot + 1.4, 1.5 * hot * hot + 0.35, 0.35 * hot * hot, (1 - a) * 1.6 * k);
  }
  gl.add(at.x, at.y + 1.0, at.z, 6 * k, 1.6, 0.7, 0.25, 0.35 * k * (0.9 + 0.1 * Math.sin(t * 17)));
  for (let i = 0; i < 18; i++) { // brasas
    const life = 2 + hash2(i, 7) * 2, a = ((t + hash2(i, 8) * life) % life) / life;
    gl.add(at.x + Math.sin(t * 1.3 + i) * 1.2 * a + (hash2(i, 9) - 0.5) * 2 * a, at.y + 1 + a * 9, at.z + Math.cos(t * 1.1 + i) * a, 0.18, 3, 1.3, 0.4, (1 - a) * 1.8 * k);
  }
  for (let i = 0; i < 14; i++) { // fumaça
    const life = 4, a = ((t + i / 14 * life) % life) / life;
    pf.add(at.x + Math.sin(t * 0.5 + i) * a * 2 + a * 3, at.y + 3 + a * 12, at.z + a * 1.5, 1.2 + a * 4, 0.42, 0.42, 0.48, (1 - a) * a * 0.6 * k);
  }
}

// ---------- cartões de névoa (billboards com fbm) ----------
export function makeMistCard() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U, uOp: { value: 0.5 }, uSeed: { value: 0 }, uColor: { value: new THREE.Color(0xe8edf3) }, uOpen: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vWPos; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vWPos = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${GLSL_COMMON}\nuniform float uOp, uSeed, uOpen; uniform vec3 uColor; varying vec2 vUv; varying vec3 vWPos;
      void main(){ vec2 p = vUv*vec2(3.0,1.6) + vec2(uTime*0.04 + uSeed, uSeed*0.3);
        float n = fbm2(p) * 0.7 + fbm2(p*2.7 - uTime*0.03)*0.4;
        float edge = smoothstep(0., 0.25, vUv.y) * smoothstep(1., 0.55, vUv.y) * smoothstep(0., 0.2, vUv.x) * smoothstep(1., 0.8, vUv.x);
        float hole = uOpen * smoothstep(0.65, 0.0, length((vUv-vec2(0.5,0.55))*vec2(1.4,1.0))) ;
        float a = smoothstep(0.25, 0.85, n) * edge * uOp * (1.0 - hole);
        gl_FragColor = vec4(mix(uColor, fogColor(normalize(vWPos-uCamPos)), 0.5), a); }`,
    transparent: true, depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.renderOrder = 4; m.frustumCulled = false; return m;
}

// ---------- pássaros distantes ----------
export function makeBirds(n = 9) {
  const grp = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0x2c3340 });
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group(), wl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), mat), wr = wl.clone(), body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.9), mat);
    wl.geometry = wl.geometry.clone().translate(-0.8, 0, 0); wr.geometry = wr.geometry.clone().translate(0.8, 0, 0);
    b.add(wl, wr, body); b.userData = { wl, wr }; grp.add(b);
  }
  return grp;
}
export function poseBirds(grp, t, origin, dir, scale = 1) {
  grp.children.forEach((b, i) => {
    const row = Math.floor((i + 1) / 2), side = i % 2 ? 1 : -1;
    const off = new THREE.Vector3(side * row * 3.2, Math.sin(t * 0.7 + i) * 0.8, row * 2.8);
    b.position.copy(origin).addScaledVector(dir, t * 9).add(off.multiplyScalar(scale));
    b.lookAt(b.position.clone().add(dir)); b.scale.setScalar(scale);
    const f = Math.sin(t * 9 + i * 1.3) * 0.6 * (Math.sin(t * 0.8 + i) > -0.3 ? 1 : 0.1);
    b.userData.wl.rotation.z = f; b.userData.wr.rotation.z = -f;
  });
}

// ---------- casa em timelapse (InstancedMesh com tempo de surgimento por voxel) ----------
export function makeHouse(origin, tStart, tEnd, tDis) {
  const R = rng(11), vox = [];
  const W = 14, D = 12;
  const c = { stone: 0x8a8f99, stoneD: 0x6b707b, wood: 0x7a5236, woodD: 0x5b3b27, roof: 0x4a3f45, snow: 0xeef2f8, win: 0xffc27a, door: 0x4a3020, chim: 0x7d7f86 };
  const add = (x, y, z, col, ph, win = 0) => vox.push({ x, y, z, col, ph, win });
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) for (let y = 0; y < 2; y++) {
    const edge = x === 0 || z === 0 || x === W - 1 || z === D - 1; if (!edge && y === 1) continue;
    add(x, y, z, (x + z + y) % 3 ? c.stone : c.stoneD, 0 + (x + z) / (W + D) * 0.8);
  }
  for (let y = 2; y < 9; y++) for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    if (!(x === 0 || z === 0 || x === W - 1 || z === D - 1)) continue;
    const front = z === D - 1;
    if (front && x >= 6 && x <= 7 && y < 7) { add(x, y, z, c.door, 1 + (y - 2) / 7); continue; }
    const isWin = (front || z === 0) && ((x >= 2 && x <= 3) || (x >= 10 && x <= 11)) && (y >= 4 && y <= 5);
    const isWinSide = (x === 0 || x === W - 1) && z >= 5 && z <= 6 && y >= 4 && y <= 5;
    if (isWin || isWinSide) { add(x, y, z, c.win, 1 + (y - 2) / 7, 1); continue; }
    add(x, y, z, (y % 2) ? c.wood : c.woodD, 1 + (y - 2) / 7 + R() * 0.15);
  }
  // telhado de duas águas (eixo x), com beiral e neve
  for (let k = 0; k <= 7; k++) for (let x = -1; x <= W; x++) {
    const y = 9 + k;
    for (const z of [k - 1, D - k]) { if (z > D - k) continue; add(x, y, z, k === 7 || hash2(x, y + z) < 0.6 ? c.snow : c.roof, 2 + k / 8 + R() * 0.1); }
    for (let z = k; z < D - k; z++) if (x === 0 || x === W - 1) add(x, y, z, c.wood, 1.9 + k / 8);
  }
  for (let y = 2; y < 19; y++) for (const [x, z] of [[11, 2], [12, 2], [11, 3], [12, 3]]) add(x, y, z, y === 18 ? c.stoneD : c.chim, 2.6 + (y - 2) / 17 * 0.5);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.setAttribute('aMisc', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  const n = vox.length, aT = new Float32Array(n), aW = new Float32Array(n), aD = new Float32Array(n);
  const maxPh = 3.2;
  const mat = patchWorld(new THREE.MeshLambertMaterial(), {
    key: 'house', uniforms: { uDis: { value: tDis }, uWinT: { value: tEnd - 0.15 } },
    vertHead: 'attribute float aT; attribute float aWin; attribute float aD; uniform float uDis; uniform float uWinT;',
    vertBody: `float ap = clamp((uTime - aT)/0.28, 0., 1.); ap = ap*ap*(3.-2.*ap);
      float ds = clamp((uTime - uDis - aD)/0.45, 0., 1.);
      float sc = ap*(1.-ds);
      transformed *= max(sc, 0.0001);
      transformed.y += (1.-ap)*3.0 + ds*ds*10.0;
      vEmit = (1.-ap)*1.2*step(0.001, ap) + ds*2.5 + aWin*smoothstep(uWinT, uWinT+0.35, uTime)*1.6;`,
  });
  const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.receiveShadow = true;
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  vox.forEach((v, i) => {
    mtx.makeTranslation(origin.x + v.x + 0.5 - W / 2, origin.y + v.y + 0.5, origin.z + v.z + 0.5 - D / 2); im.setMatrixAt(i, mtx);
    im.setColorAt(i, col.setHex(v.col));
    aT[i] = tStart + (v.ph / maxPh) * (tEnd - tStart - 0.3) + hash2(i, 3) * 0.08; aW[i] = v.win; aD[i] = (v.y / 19) * 0.25 + hash2(i, 5) * 0.2;
  });
  geo.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 1)); geo.setAttribute('aWin', new THREE.InstancedBufferAttribute(aW, 1)); geo.setAttribute('aD', new THREE.InstancedBufferAttribute(aD, 1));
  im.frustumCulled = false;
  im.userData = { chimney: new THREE.Vector3(origin.x + 12 - W / 2, origin.y + 19.5, origin.z + 3 - D / 2), windows: vox.filter(v => v.win).map(v => new THREE.Vector3(origin.x + v.x + 0.5 - W / 2, origin.y + v.y + 0.5, origin.z + v.z + 0.5 - D / 2)) };
  return im;
}

// ---------- tenda (para a visão do acampamento) ----------
export function makeTent(mat) {
  const g = new Grid(9, 7, 8), cv = pal(0xd8c8a8), cvD = pal(0xb09a78), pole = pal(0x6b4a35);
  for (let y = 0; y < 6; y++) for (let x = y; x < 9 - y; x++) for (let z = 0; z < 8; z++) {
    const shell = x === y || x === 8 - y || y === 5 || z === 0 || z === 7; if (!shell) continue;
    if (z === 7 && x > 3 && x < 5 && y < 3) continue;
    g.set(x, y, z, (z === 0 || z === 7) ? cvD : cv);
  }
  g.set(4, 6, 0, pole); g.set(4, 6, 7, pole);
  const m = new THREE.Mesh(meshGrid(g, 0, 9, 0, 8, { scale: 0.75 }), mat); m.geometry.translate(-3.4, 0, -3); return m;
}
