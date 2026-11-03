import * as THREE from 'three';
import { U, worldMaterial, skyMaterial, waterMaterial } from './materials.js';
import { Post } from './post.js';
import { buildDetail, meshDetail, buildLOD, buildMystery, groundY, GX0, GZ0, GSX, GSZ, WATER_Y, POS, solidAt, rayBlocked } from './world.js';
import { makeCharacter, pose, ghostify } from './characters.js';
import { makeSnow, Glows, PX, drawStar, starPos, makeCampfire, drawFire, makeMistCard, makeBirds, poseBirds, makeHouse, makeTent } from './fx.js';
import { DURATION, AUDIO_END, SHOTS, shotAt } from './timeline.js';
import { rng, hash2, smoothstep, clamp, lerp } from './noise.js';

const qs = new URLSearchParams(location.search);
const SCALE = Number(qs.get('scale') || 1);
const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
document.getElementById('stage').prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 8000);
const post = new Post(renderer, W, H, Number(qs.get('msaa') ?? 4));

// ---------------- luz ----------------
const sun = new THREE.DirectionalLight(0xffe2c4, 2.4); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.35;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xb8c8e0, 0x6a6470, 1.25); scene.add(hemi);
const fireLight = new THREE.PointLight(0xff9a50, 0, 70, 1.4); scene.add(fireLight);
const lanternLight = new THREE.PointLight(0xffb870, 0, 26, 1.6); scene.add(lanternLight);
const starLight = new THREE.PointLight(0xffd8a0, 0, 90, 1.3); scene.add(starLight);

// ---------------- mundo ----------------
const worldMat = worldMaterial();
const worldGroup = new THREE.Group(); scene.add(worldGroup);
buildDetail(); meshDetail(worldMat, worldGroup);
const lodGroup = new THREE.Group(); scene.add(lodGroup); buildLOD(worldMaterial({ key: 'lod' }), lodGroup);
const mystFog = { value: 6 };
const mystery = buildMystery(worldMaterial({ key: 'myst', uniforms: { uFogMul: mystFog } })); scene.add(mystery);
const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 32, 16), skyMaterial()); sky.renderOrder = -1; scene.add(sky);
const water = new THREE.Mesh(new THREE.PlaneGeometry(GSX, GSZ).rotateX(-Math.PI / 2), waterMaterial());
water.position.set(GX0 + GSX / 2, WATER_Y, GZ0 + GSZ / 2); scene.add(water);

// ---------------- personagens ----------------
const charMat = worldMaterial({ key: 'char' });
const A = makeCharacter('A', charMat), B = makeCharacter('B', charMat);
scene.add(A, B);
const ghostMats = [];
function ghostMaterial() { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.3, 0.62), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); ghostMats.push(m); return m; }

// visão do futuro: primeiro habitante + acampamento
const FIRST = { pos: new THREE.Vector3(-15, 0, -13) }; FIRST.pos.y = groundY(FIRST.pos.x, FIRST.pos.z);
const firstGhost = ghostify(A, ghostMaterial()); scene.add(firstGhost);
const R0 = rng(21);
const camp = [];
const campSpots = [[-28, -4, 't'], [18, -10, 'v'], [-8, -30, 'v'], [30, 14, 't'], [-22, 18, 'v'], [10, -30, 't'], [34, -20, 'v'], [-33, -20, 'v'], [-4, 24, 'v'], [16, 28, 'v'], [-38, 8, 't'], [24, -36, 'v'], [-18, -38, 'v'], [40, 2, 'v'], [-30, 32, 't'], [6, 38, 'v']];
const tentMatBase = ghostMaterial();
campSpots.forEach(([x, z, k], i) => {
  const y = groundY(x, z), t0 = 30.5 + i * 0.235, from = new THREE.Vector3(x * 0.6 + (R0() - 0.5) * 200, 240 + R0() * 60, -200 - R0() * 120);
  let obj;
  if (k === 't') { obj = makeTent(ghostMaterial()); obj.rotation.y = Math.atan2(-x, -z) + Math.PI; }
  else { obj = ghostify(i % 2 ? A : B, ghostMaterial()); obj.rotation.y = Math.atan2(-x, -z) + (R0() - 0.5) * 1.5; }
  obj.position.set(x, y, z); scene.add(obj);
  camp.push({ obj, star: { t0, tL: t0 + 0.75 + R0() * 0.25, from, to: new THREE.Vector3(x, y, z), k: 0.7, curve: (R0() - 0.5) * 20 }, kind: k });
});
const FIRST_STAR = { t0: 25.05, tL: 27.62, from: new THREE.Vector3(-80, 210, -300), to: FIRST.pos.clone(), k: 1, curve: 14 };
// casa (timelapse)
const HOUSE_O = new THREE.Vector3(2, 0, -26); HOUSE_O.y = groundY(2, -26) - 1;
const house = makeHouse(HOUSE_O, 34.42, 35.6, 35.78); scene.add(house);
// fogueira (presente, ao entardecer)
const FIRE = new THREE.Vector3(0.4, 0, 6); FIRE.y = groundY(FIRE.x, FIRE.z);
const campfire = makeCampfire(worldMaterial({ key: 'fire' })); campfire.position.copy(FIRE); scene.add(campfire);
// fx
const snow = makeSnow(6000); scene.add(snow);
const glows = new Glows(7000); scene.add(glows.points);
const puffs = new Glows(600, THREE.NormalBlending, true); scene.add(puffs.points);
const mists = Array.from({ length: 7 }, () => { const m = makeMistCard(); scene.add(m); return m; });
const birds = makeBirds(9); scene.add(birds);

// ---------------- utilitários de animação ----------------
const ease = u => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
const easeIO = u => u < 0 ? 0 : u > 1 ? 1 : (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
function kf(t, keys, fn = ease) { // [[t,v],...] numérico
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; if (t <= t1) return v0 + (v1 - v0) * fn((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}
const V3 = (...a) => new THREE.Vector3(...a);
function spline(t, keys) { // [[t,[x,y,z]],...] Catmull-Rom com tempo, suavizado nas pontas
  const n = keys.length;
  if (t <= keys[0][0]) return V3(...keys[0][1]);
  if (t >= keys[n - 1][0]) return V3(...keys[n - 1][1]);
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  let u = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  if (n === 2) u = easeIO(u);
  else if (i === 0) u = u * u * (2 - u);              // parte do repouso
  else if (i === n - 2) { const v = 1 - u; u = 1 - v * v * (2 - v); } // chega ao repouso
  const P = k => V3(...keys[Math.max(0, Math.min(n - 1, k))][1]);
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), u2 = u * u, u3 = u2 * u;
  return new THREE.Vector3(
    0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
    0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
    0.5 * (2 * p1.z + (-p0.z + p2.z) * u + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3));
}
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const yawTo = (ch, p) => clamp(wrapA(Math.atan2(p.x - ch.position.x, p.z - ch.position.z) - ch.rotation.y), -1.1, 1.1);

// ---------------- looks (dia / entardecer) ----------------
const LOOK = {
  day: { fogA: 0xf3d9c2, fogB: 0xb4c4d9, zenith: 0x8aa2c4, sunCol: 0xffd9b0, sun: 3.3, sunHex: 0xffdcb4, hemiS: 0x9fb6dc, hemiG: 0x5e5a6c, hemi: 0.95, dir: [0.62, 0.34, -0.42] },
  dusk: { fogA: 0xc9917a, fogB: 0x47536e, zenith: 0x18213a, sunCol: 0xff9a60, sun: 0.55, sunHex: 0xff9f70, hemiS: 0x5d6d96, hemiG: 0x2b2733, hemi: 0.62, dir: [0.7, 0.07, -0.55] },
};
const cA = new THREE.Color(), cB = new THREE.Color();
function applyLook(k) { // k: 0 dia -> 1 entardecer
  const a = LOOK.day, b = LOOK.dusk, mix = (x, y) => cA.setHex(x).lerp(cB.setHex(y), k);
  U.uFogA.value.copy(mix(a.fogA, b.fogA)); U.uFogB.value.copy(mix(a.fogB, b.fogB));
  sky.material.uniforms.uZenith.value.copy(mix(a.zenith, b.zenith)); sky.material.uniforms.uSunCol.value.copy(mix(a.sunCol, b.sunCol));
  sun.color.copy(mix(a.sunHex, b.sunHex)); sun.intensity = lerp(a.sun, b.sun, k);
  hemi.color.copy(mix(a.hemiS, b.hemiS)); hemi.groundColor.copy(mix(a.hemiG, b.hemiG)); hemi.intensity = lerp(a.hemi, b.hemi, k);
  U.uSunDir.value.set(lerp(a.dir[0], b.dir[0], k), lerp(a.dir[1], b.dir[1], k), lerp(a.dir[2], b.dir[2], k)).normalize();
  water.material.uniforms.uSky.value.copy(mix(0xdde6f0, 0x56607a));
}

// ---------------- direção: câmera por plano ----------------
const CHAR_A_DAY = V3(-2.6, 0, 1.6), CHAR_B_DAY = V3(3.0, 0, 0.4), CHAR_B_WALK = V3(6.2, 0, -1.6);
const CHAR_A_DUSK = V3(-4.6, 0, 5.4), CHAR_B_DUSK = V3(4.9, 0, 4.0);
function direct(t) {
  const [name, s0, s1] = shotAt(t), u = (t - s0) / (s1 - s0);
  const C = { pos: V3(), look: V3(), fov: 36, focusPt: null, focus: 50, aperture: 6, maxCoc: 14, tilt: 0, tiltY: 0.5, exposure: 0.95, dusk: 0, wind: 0.25, snow: 0.5, snowBox: [160, 90, 160], snowAt: null, fogDen: 0.0024, reveal: 0, roll: 0 };
  const chest = (ch, k = 6.5) => ch.position.clone().add(V3(0, k, 0));
  switch (name) {
    case 'territory': // sobrevoo: território imenso, névoa, montanhas; 2 luzes minúsculas na clareira
      C.pos = spline(t, [[0, [150, 200, 360]], [9, [62, 140, 160]]]);
      C.look = spline(t, [[0, [10, 40, -60]], [9, [0, 20, -6]]]);
      C.fov = 38; C.focusPt = V3(0, 19, 0); C.aperture = 9; C.tilt = 0.55; C.tiltY = 0.42; C.maxCoc = 14; C.snow = 0.25;
      C.snowAt = C.pos.clone().lerp(C.look, 0.12);
      break;
    case 'wild': // rasante sobre as copas rumo ao norte desconhecido
      C.pos = spline(t, [[9, [72, 78, 74]], [14, [52, 80, -4]]]);
      C.look = spline(t, [[9, [22, 50, -300]], [14, [-10, 46, -400]]]);
      C.fov = 38; C.focus = 280; C.aperture = 16; C.maxCoc = 18; C.tilt = 0.2; C.tiltY = 0.55; C.snow = 0.5;
      C.snowAt = C.pos.clone().add(V3(0, -5, -40));
      break;
    case 'reveal': // desce sobre as copas e revela a clareira; rack focus nos moradores em "e dois moradores"
      C.pos = spline(t, [[14, [96, 118, 150]], [16.8, [78, 106, 120]], [19.55, [60, 94, 94]]]);
      C.look = spline(t, [[14, [6, 19, -6]], [19.55, [0.4, 20, 1.0]]]);
      C.fov = 30; C.aperture = 22; C.maxCoc = 18; C.tilt = 0.3; C.tiltY = 0.47;
      { const dC = C.pos.distanceTo(V3(0, 19, 1)); C.focus = kf(t, [[14, 34], [14.9, 34], [16.0, dC * 0.93], [17.9, dC * 0.93], [18.5, C.pos.distanceTo(chest(A))]]); }
      C.snowAt = C.pos.clone().lerp(V3(0, 14, 0), 0.25);
      break;
    case 'empty': // diorama: órbita lenta em plongée; o vazio da clareira
      { const a = lerp(0.5, 1.05, easeIO(u)), r = lerp(120, 112, u);
        C.pos = V3(Math.sin(a) * r, 92 - u * 4, Math.cos(a) * r); C.look = V3(1.2, 19, 0); }
      C.fov = 30; C.focusPt = V3(1.5, 20, 0.5); C.aperture = 24; C.maxCoc = 18; C.tilt = 0.45; C.tiltY = 0.5;
      C.snowAt = V3(0, 30, 30);
      break;
    case 'change': // prestes a mudar: eles se viram, olham o céu; a luz cai; nasce o primeiro habitante
      C.pos = spline(t, [[23.65, [11, 27, 47]], [27.5, [9, 26.5, 43]], [30.3, [7, 25.5, 39]]]);
      { const sky = starPos(FIRST_STAR, clamp(t, FIRST_STAR.t0, FIRST_STAR.tL));
        const lookSky = sky.clone().sub(C.pos).normalize().multiplyScalar(60).add(C.pos);
        const base = V3(-2, 21, -4), land = FIRST.pos.clone().add(V3(1, 4, 0));
        const k1 = smoothstep(24.3, 25.6, t);
        C.look = base.clone().lerp(lookSky, k1 * 0.72);
        if (t > 26.2) C.look = base.clone().lerp(lookSky, 0.72).lerp(land, Math.pow(smoothstep(26.5, 27.8, t), 1.5));
      }
      C.fov = 34; C.aperture = 20; C.maxCoc = 18; C.tilt = 0.15;
      C.focus = kf(t, [[23.65, C.pos.distanceTo(chest(A))], [24.6, C.pos.distanceTo(chest(A))], [25.4, 200], [26.6, 200], [27.6, C.pos.distanceTo(FIRST.pos) + 2]]);
      C.wind = kf(t, [[23.65, 0.3], [25, 0.6], [28, 0.45]]); C.snow = 0.7;
      C.snowAt = C.pos.clone().add(V3(-6, 4, -24));
      break;
    case 'growth': // quanto mais pessoas chegarem: chuva de luzes, acampamento-visão
      C.pos = spline(t, [[30.3, [18, 34, 44]], [32.2, [34, 70, 90]], [34.15, [70, 128, 172]]]);
      C.look = spline(t, [[30.3, [-4, 20, -8]], [34.15, [0, 17, -8]]]);
      C.fov = 34; C.focusPt = V3(0, 18, -6); C.aperture = 16; C.maxCoc = 16; C.tilt = 0.5; C.tiltY = 0.5; C.snow = 0.4;
      C.snowAt = V3(0, 30, 10);
      break;
    case 'house': // casas serão construídas: moradores desfocados em primeiro plano
      C.pos = spline(t, [[34.15, [30, 27, 38]], [36.05, [26, 27.5, 33]]]);
      C.look = spline(t, [[34.15, [-1, 25, -26]], [36.05, [0, 26, -27]]]);
      C.fov = 32; C.focusPt = V3(2, 23, -20); C.aperture = 20; C.maxCoc = 18;
      C.snowAt = V3(6, 22, 10);
      break;
    case 'bridge': // novos lugares: a ponte antiga sobre a ravina
      C.pos = spline(t, [[36.05, [62, 37, -125]], [37.3, [46, 35, -127.5]]]);
      C.look = spline(t, [[36.05, [-14, 24, -137.7]], [37.3, [-18, 23, -139]]]); C.focusPt = V3(-14, 26, -137.7);
      C.fov = 38; C.aperture = 14; C.maxCoc = 16; C.tilt = 0.35; C.snow = 0.4;
      C.snowAt = C.pos.clone().add(V3(-20, -5, -6));
      break;
    case 'ruins': // ruínas; ao fundo, o lago e a torre na névoa
      C.pos = spline(t, [[37.3, [56, 58, -178]], [38.3, [50, 56, -184]]]);
      C.look = spline(t, [[37.3, [-30, 20, -262]], [38.3, [-40, 20, -266]]]);
      C.fov = 36; C.focusPt = V3(POS.ruins.x - 4, 20, POS.ruins.z - 4); C.aperture = 14; C.maxCoc = 16; C.tilt = 0.2;
      C.snowAt = C.pos.clone().add(V3(-20, -2, -20));
      break;
    case 'mystery': // a névoa se abre... e se fecha
      C.pos = spline(t, [[38.3, [-26, 78, -344]], [40.0, [-8, 78, -408]], [41.8, [0, 74, -446]], [43.75, [2, 72, -462]]]);
      C.look = spline(t, [[38.3, [-48, 28, -380]], [40.0, [0, 60, -900]], [43.75, [56, 150, -2050]]]);
      C.fov = kf(t, [[38.3, 42], [43.75, 37]]); C.focus = kf(t, [[38.3, 60], [40, 900], [43.75, 1600]]); C.aperture = kf(t, [[38.3, 12], [40.5, 6]]); C.maxCoc = 14; C.snow = 0.2;
      C.reveal = kf(t, [[39.9, 0], [41.0, 1], [42.25, 1], [43.3, 0]]);
      C.snowAt = C.pos.clone().add(V3(0, 0, -30));
      break;
    case 'final': // hoje somos apenas dois... afastamento; a luz no céu; corte para preto
      C.dusk = 1;
      C.pos = spline(t, [[43.75, [12, 60, 76]], [46.2, [10, 58, 70]], [48.6, [6, 84, 112]], [50.7, [0, 128, 176]]]);
      C.look = spline(t, [[43.75, [0, 19.5, 4]], [46.2, [0, 19.5, 4]], [48.4, [0, 28, -16]], [50.7, [-6, 66, -74]]]);
      C.fov = 30; C.focusPt = V3(0, 19, 5); C.aperture = kf(t, [[43.75, 18], [47, 18], [50.7, 12]]); C.maxCoc = 16; C.tilt = 0.35; C.tiltY = 0.5; C.snow = 0.55;
      C.exposure = 1.05; C.wind = 0.18;
      C.snowAt = C.pos.clone().lerp(V3(0, 19, 5), 0.5);
      break;
  }
  return { ...C, name, u };
}

// ---------------- render(t) ----------------
const counterEl = document.getElementById('counter'), counterNum = counterEl.querySelector('b'), titleEl = document.getElementById('title');
const tmpV = new THREE.Vector3();
function render(t) {
  const D = direct(t);
  U.uTime.value = t; U.uWind.value = D.wind; U.uReveal.value = D.reveal;
  U.uFogP.value.set(D.fogDen * (1 - D.dusk * 0.25), 0.028, 10, 0.65);
  applyLook(D.dusk);
  mystFog.value = lerp(7, 5.2, D.reveal); mystery.visible = D.name === 'mystery';
  // câmera
  camera.fov = D.fov; camera.position.copy(D.pos); camera.up.set(0, 1, 0); camera.lookAt(D.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  U.uCamPos.value.copy(camera.position); sky.position.copy(camera.position);
  PX.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(D.fov) / 2));
  // sombra acompanha o centro de interesse
  const fpt = D.focusPt || camera.position.clone().add(camera.getWorldDirection(tmpV).multiplyScalar(Math.min(D.focus, 250)));
  const sz = clamp(camera.position.distanceTo(fpt) * 0.9, 40, 220);
  sun.target.position.copy(fpt); sun.position.copy(fpt).addScaledVector(U.uSunDir.value, 400);
  const sc = sun.shadow.camera; sc.left = -sz; sc.right = sz; sc.top = sz; sc.bottom = -sz; sc.near = 50; sc.far = 900; sc.updateProjectionMatrix();
  // ---- personagens ----
  const dusk = D.dusk > 0.5;
  const pA = dusk ? CHAR_A_DUSK : CHAR_A_DAY;
  const pB = dusk ? CHAR_B_DUSK : CHAR_B_DAY.clone().lerp(CHAR_B_WALK, smoothstep(20.0, 22.0, t));
  A.position.set(pA.x, groundY(pA.x, pA.z), pA.z); B.position.set(pB.x, groundY(pB.x, pB.z), pB.z);
  const bWalk = !dusk && t > 19.9 && t < 22.1 ? Math.min(smoothstep(19.9, 20.25, t), 1 - smoothstep(21.8, 22.1, t)) : 0;
  if (!dusk) {
    A.rotation.y = kf(t, [[0, 0.45], [23.9, 0.45], [25.0, 2.95]]);
    B.rotation.y = kf(t, [[0, -0.55], [19.85, -0.55], [20.2, 2.05], [22.0, 2.05], [22.6, 0.4], [24.0, 0.4], [25.2, -2.75]]);
  } else { A.rotation.y = 1.25; B.rotation.y = -1.15; }
  const target = t < 27.6 ? starPos(FIRST_STAR, clamp(t, FIRST_STAR.t0, FIRST_STAR.tL)) : FIRST.pos.clone().add(V3(0, 4, 0));
  const pa = {}, pb = {};
  if (!dusk) {
    pa.look = kf(t, [[14, 0], [19.9, 0], [20.6, -0.7], [21.7, -0.7], [22.4, 0.6], [23.3, 0.3], [24, 0]]);
    pa.armR = -kf(t, [[20.8, 0], [21.3, 0.95], [22.4, 0.95], [22.9, 0]]);
    pb.look = kf(t, [[14, 0.5], [17.8, 0.5], [18.6, 0.05], [19.8, 0], [22.4, 0], [22.8, -0.5], [23.6, 0]]);
    pb.armL = -kf(t, [[22.3, 0], [22.55, 0.35], [22.75, 0], [22.95, 0.35], [23.15, 0]]);
    pb.walk = bWalk; pb.walkPhase = smoothstep(20.0, 22.0, t) * 22;
    if (t > 23.9) { // olhar para o céu / estrela / novo habitante
      const k = smoothstep(24.0, 24.9, t);
      for (const [ch, p] of [[A, pa], [B, pb]]) {
        const dy = target.y - (ch.position.y + 8), dh = Math.hypot(target.x - ch.position.x, target.z - ch.position.z);
        p.up = clamp(Math.atan2(dy, dh), -0.3, 0.85) * k; p.look = lerp(p.look || 0, yawTo(ch, target), k);
      }
      pa.armR = -0.25 * smoothstep(27.8, 28.4, t);
    }
  } else {
    pa.look = kf(t, [[43.75, -0.2], [45.5, 0.15], [48.2, 0]]); pa.armR = -0.75;
    pb.lean = 0.12;
    const skyP = V3(-30, 200, -200);
    if (t > 48.1) { const k = smoothstep(48.2, 49.0, t); pa.up = 0.8 * k; pb.up = 0.85 * smoothstep(48.4, 49.2, t); pa.look = lerp(pa.look, -0.4, k); pb.look = lerp(0, 0.3, k); }
  }
  pose(A, t, pa); pose(B, t, pb);
  if (dusk) { const u = B.userData; u.legL.rotation.x = -1.45; u.legR.rotation.x = -1.35; u.hips.position.y = -2.4; u.armL.rotation.x = -0.6; u.armR.rotation.x = -0.5; }
  // ---- visão do futuro ----
  const visionOff = smoothstep(35.75, 36.05, t);
  const showVision = !dusk && t < 36.05;
  const fg = smoothstep(27.65, 29.0, t) * (1 - visionOff) * (showVision ? 1 : 0);
  firstGhost.visible = fg > 0.001; firstGhost.userData.hips.parent.position.copy(FIRST.pos); firstGhost.position.copy(FIRST.pos);
  firstGhost.rotation.y = 0.6; firstGhost.traverse(o => { if (o.isMesh) o.material.opacity = fg * (0.3 + 0.06 * Math.sin(t * 9)); });
  pose(firstGhost, t, { look: kf(t, [[28.5, 0], [29.4, 0.7]]), up: kf(t, [[28.0, 0.4], [29.0, 0]]) });
  for (const c of camp) {
    const k = smoothstep(c.star.tL, c.star.tL + 0.6, t) * (1 - visionOff) * (showVision ? 1 : 0);
    c.obj.visible = k > 0.001;
    c.obj.traverse(o => { if (o.isMesh) o.material.opacity = k * (c.kind === 't' ? 0.22 : 0.3); });
    if (c.kind !== 't') pose(c.obj, t + c.star.t0 * 3, { look: Math.sin(t * 0.7 + c.star.t0) * 0.5 });
  }
  house.visible = !dusk && t > 34.1 && t < 36.1;
  campfire.visible = dusk;
  // ---- glows / partículas ----
  glows.begin(); puffs.begin();
  const lanternW = new THREE.Vector3(); A.userData.prop.children[0].getWorldPosition(lanternW); lanternW.y -= 2.4;
  const lampK = dusk ? 1.6 : 0.55;
  glows.add(lanternW.x, lanternW.y, lanternW.z, dusk ? 4.5 : 2.6, 1.8, 1.25, 0.6, lampK * (0.92 + 0.08 * Math.sin(t * 13)));
  lanternLight.position.copy(lanternW); lanternLight.intensity = dusk ? 40 : 10;
  if (D.name === 'territory') { // as duas luzes minúsculas = os 2 seguidores
    const k = smoothstep(1.2, 2.4, t);
    for (const ch of [A, B]) glows.add(ch.position.x, ch.position.y + 5, ch.position.z, 4.5, 2.4, 1.7, 0.9, k * (1.0 + 0.2 * Math.sin(t * 5 + ch.position.x)));
  }
  // respiração visível no frio
  for (const [ch, ph] of [[A, 0], [B, 1.7]]) {
    const head = new THREE.Vector3(); ch.userData.head.getWorldPosition(head);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(ch.userData.head.getWorldQuaternion(new THREE.Quaternion()));
    const cyc = ((t * 2 * Math.PI / 3.4 + ph) / (2 * Math.PI)) % 1;
    for (let i = 0; i < 4; i++) { const a = (cyc + i * 0.06) % 1; if (a > 0.55) continue; const k = a / 0.55;
      puffs.add(head.x + fwd.x * (1.8 + k * 2.2), head.y + 1 + k * 1.2, head.z + fwd.z * (1.8 + k * 2.2), 0.8 + k * 2.2, 0.95, 0.97, 1.0, (1 - k) * k * 0.9 * (dusk ? 0.5 : 1)); }
  }
  // estrelas
  let sl = 0; starLight.intensity = 0;
  if (!dusk && t > 24.4 && t < 31) { drawStar(glows, FIRST_STAR, t); const p = t < FIRST_STAR.tL ? starPos(FIRST_STAR, t) : FIRST.pos.clone().add(V3(0, 3, 0)); starLight.position.copy(p); starLight.intensity = t < FIRST_STAR.tL ? 200 * smoothstep(26.4, 27.6, t) : 900 * Math.exp(-(t - FIRST_STAR.tL) * 1.8) + 30 * fg; }
  if (fg > 0) for (let i = 0; i < 26; i++) { const a = ((t * 0.35 + hash2(i, 4)) % 1); gl_mote(FIRST.pos, i, a, fg); }
  if (!dusk && t > 30.3 && t < 36.05) for (const c of camp) { drawStar(glows, c.star, t); }
  if (house.visible) {
    const hk = smoothstep(35.4, 35.7, t) * (1 - visionOff);
    for (const w of house.userData.windows) glows.add(w.x, w.y, w.z, 2.2, 1.8, 1.1, 0.45, hk * 0.5);
    const ck = smoothstep(35.4, 35.8, t);
    for (let i = 0; i < 8; i++) { const a = ((t * 0.5 + i / 8) % 1); const c = house.userData.chimney; puffs.add(c.x + a * 3, c.y + a * 9, c.z + a, 1.5 + a * 4, 0.85, 0.87, 0.92, (1 - a) * Math.min(1, a * 4) * 0.7 * ck * (1 - visionOff)); }
    if (t > 35.75) for (let i = 0; i < 160; i++) { const a = clamp((t - 35.75 - hash2(i, 1) * 0.25) / 0.6, 0, 1); if (a <= 0) continue; glows.add(HOUSE_O.x - 7 + hash2(i, 2) * 14, HOUSE_O.y + 2 + hash2(i, 3) * 16 + a * 12, HOUSE_O.z - 6 + hash2(i, 4) * 12, 0.35, 2.4, 1.9, 1.2, (1 - a) * 2); }
  }
  // dissolução da visão em partículas
  if (!dusk && t > 35.7 && t < 36.1) for (const c of camp) { const p = c.obj.position; for (let i = 0; i < 6; i++) { const a = clamp((t - 35.72) / 0.35, 0, 1); glows.add(p.x + (hash2(i, 1) - 0.5) * 4, p.y + 2 + hash2(i, 2) * 6 + a * 8, p.z + (hash2(i, 3) - 0.5) * 4, 0.4, 2.4, 1.9, 1.2, (1 - a) * 2); } }
  // fogueira
  fireLight.intensity = 0;
  if (dusk) { drawFire(glows, puffs, FIRE, t, 0.75); fireLight.position.copy(FIRE).add(V3(0, 2.5, 0)); fireLight.intensity = 170 * (0.88 + 0.12 * Math.sin(t * 17) * Math.sin(t * 5.3)); }
  // estrela final: o terceiro morador?
  if (dusk) {
    const fs = { t0: 48.35, tL: 51.4, from: V3(-30, 150, -260), to: V3(-10, 14, -10), k: 1.6, curve: 10 };
    if (t > 48.0) {
      const app = smoothstep(48.0, 48.8, t);
      if (t < 49.2) { const p = fs.from; glows.add(p.x, p.y, p.z, 9 * (1 + 0.3 * Math.sin(t * 20)), 3, 2.4, 1.5, app * 2.5); glows.add(p.x, p.y, p.z, 40, 1, 0.75, 0.5, app * 0.4); }
      else drawStar(glows, { ...fs, t0: 49.2 }, t);
    }
  }
  glows.end(); puffs.end();
  function gl_mote(c, i, a, k) { const ang = hash2(i, 1) * 6.28 + t * 0.6, r = 1.5 + hash2(i, 2) * 3; glows.add(c.x + Math.cos(ang) * r, c.y + a * 12, c.z + Math.sin(ang) * r, 0.25, 2.5, 2, 1.2, Math.sin(a * Math.PI) * k * 1.6); }
  // neve
  snow.material.uniforms.uDensity.value = D.snow; snow.material.uniforms.uCenter.value.copy(D.snowAt || D.look);
  // névoa em cartões
  const mistDefs = mistFor(D, t);
  mists.forEach((m, i) => { const d = mistDefs[i]; m.visible = !!d; if (!d) return;
    m.position.set(...d.p); m.scale.set(d.w, d.h, 1); m.quaternion.copy(camera.quaternion);
    m.material.uniforms.uOp.value = d.o; m.material.uniforms.uSeed.value = i * 3.7; m.material.uniforms.uOpen.value = d.open || 0; });
  // pássaros
  birds.visible = ['territory', 'wild', 'bridge'].includes(D.name);
  if (D.name === 'territory') poseBirds(birds, t, V3(-120, 70, 60), V3(1, 0.05, -0.35).normalize(), 1.4);
  if (D.name === 'wild') poseBirds(birds, t - 9, V3(20, 70, -120), V3(-1, 0.02, -0.3).normalize(), 1.6);
  if (D.name === 'bridge') poseBirds(birds, t - 36, V3(-60, 60, -150), V3(1, 0.1, 0.2).normalize(), 1.2);
  // pós
  const P = post.P;
  P.focus = D.focusPt ? camera.position.distanceTo(D.focusPt) : D.focus;
  P.aperture = D.aperture * SCALE; P.maxCoc = D.maxCoc * SCALE; P.tilt = D.tilt * SCALE; P.tiltY = D.tiltY;
  P.exposure = D.exposure * (D.dusk ? 1.0 : 1.0); P.bloom = D.dusk ? 0.32 : 0.2; P.sat = D.dusk ? 1.02 : 0.96; P.warm = D.dusk ? 0.6 : 0;
  P.lift.set(...(D.dusk ? [0.012, 0.014, 0.03] : [0.01, 0.012, 0.022]));
  // transições: fade de entrada, mergulhos na névoa, corte seco para preto
  P.fade = (1 - smoothstep(0.0, 1.4, t)) + (t >= AUDIO_END ? 1 : 0);
  P.fade = Math.max(P.fade, smoothstep(43.45, 43.75, t) * (1 - smoothstep(43.75, 44.25, t)));
  let white = 0;
  for (const [tc, w] of [[9.0, 0.22], [36.05, 0.32], [37.3, 0.12], [38.3, 0.18]]) white = Math.max(white, (1 - Math.abs(t - tc) / w) * 0.85);
  P.white = clamp(white, 0, 1);
  P.grain = 0.035; P.vignette = D.dusk ? 0.28 : 0.16;
  // overlays
  titleEl.style.opacity = (smoothstep(6.95, 7.9, t) * (1 - smoothstep(10.6, 11.6, t))).toFixed(3);
  titleEl.style.letterSpacing = (0.32 + 0.1 * smoothstep(6.95, 11.6, t)).toFixed(3) + 'em';
  titleEl.style.filter = `blur(${((1 - smoothstep(6.95, 8.0, t)) * 10 + smoothstep(10.6, 11.6, t) * 6).toFixed(1)}px)`;
  let cOp = smoothstep(26.3, 26.9, t) * (1 - smoothstep(35.7, 36.0, t)) + smoothstep(44.2, 44.9, t) * (1 - smoothstep(47.2, 47.9, t));
  let n = 2;
  if (t > 27.7) n = 3;
  if (t > 30.6) n = Math.round(kf(t, [[30.6, 3], [32.1, 10], [32.4, 10], [33.9, 50]], u => u * u * (3 - 2 * u)));
  if (t > 43) n = 2;
  counterNum.textContent = String(n); counterEl.style.opacity = cOp.toFixed(3);
  counterNum.style.transform = `scale(${(1 + 0.12 * Math.exp(-Math.max(0, t - 27.7) * 6) * (t > 27.7 ? 1 : 0)).toFixed(3)})`;
  // render
  renderer.setRenderTarget(post.scene); renderer.render(scene, camera);
  post.run(renderer, { time: t });
}

function mistFor(D, t) {
  const c = camera.position, f = camera.getWorldDirection(new THREE.Vector3());
  const at = (d, dx = 0, dy = 0) => { const p = c.clone().addScaledVector(f, d); p.x += dx; p.y += dy; return [p.x, p.y, p.z]; };
  switch (D.name) {
    case 'territory': return [
      { p: at(lerp(40, 10, smoothstep(0, 4, t)), -10, -6), w: 160, h: 110, o: 0.9 * (1 - smoothstep(1, 4.5, t)) },
      { p: [30, 52, 120], w: 300, h: 60, o: 0.5 }, { p: [-40, 40, -40], w: 360, h: 70, o: 0.45 }, { p: [0, 60, -200], w: 600, h: 120, o: 0.6 }];
    case 'wild': return [{ p: [10, 40, -120], w: 400, h: 70, o: 0.55 }, { p: [-30, 45, -260], w: 600, h: 120, o: 0.65 }];
    case 'reveal': return [{ p: [0, 26, -40], w: 220, h: 40, o: 0.35 }];
    case 'empty': return [{ p: [-20, 24, -55], w: 240, h: 40, o: 0.35 }];
    case 'growth': return [{ p: [0, 30, -70], w: 300, h: 60, o: 0.3 }];
    case 'bridge': return [{ p: [-20, 30, -200], w: 400, h: 80, o: 0.55 }];
    case 'ruins': return [{ p: [-40, 30, -280], w: 300, h: 80, o: 0.6 }];
    case 'mystery': {
      const open = D.reveal;
      return [
        { p: at(220), w: 600, h: 300, o: 0.28, open: open * 1.25 },
        { p: at(600, 0, 30), w: 1500, h: 700, o: 0.5, open: open * 1.3 },
        { p: at(90, -30, -10), w: 220, h: 90, o: 0.35 * (1 - open * 0.6) },
        { p: at(1100, 60, 120), w: 2800, h: 1100, o: 0.6 + 0.3 * (1 - open), open: open * 1.4 }];
    }
    case 'final': return [{ p: [0, 30, -80], w: 300, h: 60, o: 0.25 }];
  }
  return [];
}

window.render = render; window.DURATION = DURATION;
window.ctx = { THREE, scene, camera, renderer, post, direct, chars: { A, B }, FIRST, HOUSE_O };
// validação: câmera dentro de voxels? alvo ocluído?
window.validate = () => {
  const out = [];
  for (let t = 0; t < DURATION; t += 0.25) {
    const D = direct(t); const tgt = D.focusPt || D.look;
    const inside = solidAt(D.pos.x, D.pos.y, D.pos.z) || solidAt(D.pos.x, D.pos.y + 1.5, D.pos.z) || solidAt(D.pos.x + 1.5, D.pos.y, D.pos.z) || solidAt(D.pos.x - 1.5, D.pos.y, D.pos.z);
    const occ = rayBlocked(D.pos, tgt, 6);
    if (inside || occ) out.push(`${t.toFixed(2)} ${D.name} ${inside ? 'INSIDE ' : ''}${occ ? 'occluded@' + occ.toFixed(0) + '/' + D.pos.distanceTo(tgt).toFixed(0) : ''}`);
  }
  return out;
};
window.ready = Promise.resolve(true);
