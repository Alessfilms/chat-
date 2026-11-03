import Phaser from 'phaser';
import { DEPTH } from '../config';
import { hex, P } from '../assets/palette';
import { BUSHES, OAK_L, OAK_M, PINES } from '../assets/AssetFactory';
import { paintGround } from '../assets/ground';
import { rng } from '../assets/PixelCanvas';
import type { MapDef, PropDef, Vec } from '../data/types';
import type { LightingSystem } from './LightingSystem';

/**
 * Monta o mundo a partir de um MapDef: chão pintado, floresta (posições
 * determinísticas por semente), arbustos, tufos, cogumelos que brilham,
 * adereços e colisores estáticos para o modo exploração.
 */
export interface TreeObj {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  r: number;
  sway?: Phaser.Tweens.Tween;
  removed?: boolean;
}

export interface Collider { x: number; y: number; r: number }

export class WorldBuilder {
  ground!: Phaser.GameObjects.Image;
  trees: TreeObj[] = [];
  colliders: Collider[] = [];
  tuftPoints: Vec[] = [];
  props: Phaser.GameObjects.Image[] = [];
  private groundKey = 'ground';

  constructor(private scene: Phaser.Scene, readonly map: MapDef, private lighting: LightingSystem) {}

  build(clearingRadius: number) {
    this.paint(clearingRadius);
    this.ground = this.scene.add.image(0, 0, this.groundKey).setOrigin(0).setDepth(DEPTH.ground);
    this.buildForest();
    this.buildDecor();
    for (const p of this.map.props) this.addProp(p);
  }

  paint(clearingRadius: number, extraPaths?: MapDef['paths'], plazaRadius = 0) {
    paintGround(this.scene, this.groundKey, this.map, { clearingRadius, extraPaths, plazaRadius });
    this.ground?.setTexture(this.groundKey);
  }

  private inKeepOut(x: number, y: number, pad = 0) {
    const m = this.map;
    for (const k of m.forest.keepOut) if (Math.hypot(x - k.center.x, y - k.center.y) < k.radius + pad) return true;
    for (const p of m.paths)
      for (let i = 0; i < p.points.length - 1; i++) {
        const a = p.points[i], b = p.points[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
        if (Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)) < p.width / 2 + 10 + pad) return true;
      }
    return false;
  }

  private buildForest() {
    const m = this.map;
    const r = rng(m.seed + 11);
    const cell = 44;
    const cols = Math.ceil(m.width / cell), rows = Math.ceil(m.height / cell);
    for (let gy = -1; gy <= rows; gy++)
      for (let gx = -1; gx <= cols; gx++) {
        const x = gx * cell + r() * cell * 0.9;
        const y = gy * cell + r() * cell * 0.9 + 30;
        const d = Math.hypot(x - m.clearing.center.x, y - m.clearing.center.y);
        // densidade cresce para longe da clareira
        const dens = Math.min(0.92, (d - m.clearing.radius) / 140);
        if (r() > dens) continue;
        if (this.inKeepOut(x, y)) continue;
        const isPine = r() < m.forest.pineRatio;
        const key = isPine ? PINES[Math.floor(r() * PINES.length)] : (r() < 0.55 ? OAK_L : OAK_M)[Math.floor(r() * 3)];
        const img = this.scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, (isPine ? 60 : key.startsWith('oakL') ? 76 : 58) / (isPine ? 64 : key.startsWith('oakL') ? 80 : 62));
        img.setDepth(DEPTH.entities + y).setFlipX(r() < 0.5);
        const tree: TreeObj = { img, x, y, r: isPine ? 5 : 7 };
        // balanço sutil da copa (1px, em degraus — preserva os pixels)
        if (r() < 0.6) tree.sway = this.scene.tweens.add({ targets: img, x: img.x + 1, duration: 1400 + r() * 1600, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [1], delay: r() * 2000 });
        this.trees.push(tree);
        this.colliders.push({ x, y: y - 2, r: tree.r });
      }
  }

  private buildDecor() {
    const m = this.map;
    const r = rng(m.seed + 21);
    // arbustos na borda da clareira
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = m.clearing.radius - 10 + r() * 160;
      const x = m.clearing.center.x + Math.cos(a) * d, y = m.clearing.center.y + Math.sin(a) * d;
      if (this.inKeepOut(x, y, -30)) continue;
      const key = BUSHES[Math.floor(r() * BUSHES.length)];
      this.scene.add.image(Math.round(x), Math.round(y), key).setOrigin(0.5, 0.85).setDepth(DEPTH.entities + y);
    }
    // flores e tufos espalhados
    for (let i = 0; i < 900; i++) {
      const x = r() * m.width, y = r() * m.height;
      const d = Math.hypot(x - m.clearing.center.x, y - m.clearing.center.y);
      if (d < m.clearing.dirtRadius + 8) continue;
      if (d < m.clearing.radius + 120 || r() < 0.25) this.tuftPoints.push({ x, y });
    }
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = m.clearing.dirtRadius + 20 + r() * 150;
      const x = m.clearing.center.x + Math.cos(a) * d, y = m.clearing.center.y + Math.sin(a) * d * 0.9;
      this.scene.add.image(Math.round(x), Math.round(y), 'flower', String(Math.floor(r() * 3))).setDepth(DEPTH.groundDecor);
    }
  }

  addProp(p: PropDef, offset: Vec = { x: 0, y: 0 }): Phaser.GameObjects.Image | undefined {
    const x = Math.round(p.x + offset.x), y = Math.round(p.y + offset.y);
    const keyMap: Partial<Record<PropDef['type'], string>> = {
      log: 'log', crate: 'crate', stump: 'stump', rock: 'rock', mushroom: 'mushroom', flower: 'flower',
      signpost: 'signpost', well: 'well', tent: 'tent', houseA: 'houseA', houseB: 'houseB', lamp: 'lamp',
      tower: 'tower', wall: 'wall', castle: 'castle', banner: 'banner',
    };
    const key = keyMap[p.type];
    if (!key) return undefined;
    const img = this.scene.add.image(x, y, key, p.frame).setOrigin(0.5, 0.9).setDepth(DEPTH.entities + y);
    if (p.flipX) img.setFlipX(true);
    if (p.type === 'flower') img.setDepth(DEPTH.groundDecor);
    this.props.push(img);

    // luzes de adereços
    if (p.type === 'mushroom')
      this.lighting.add({ x, y: y - 3, radius: 22, color: p.frame === '1' ? hex(P.violet3) : hex('#7fe6ea'), intensity: 0.55, flicker: 0.1, glow: 0.18 });
    if (p.type === 'lamp') this.lighting.add({ x, y: y - 22, radius: 60, color: hex('#ffcf7a'), intensity: 0.85, flicker: 0.05, glow: 0.18 });
    if (p.type === 'houseA' || p.type === 'houseB') {
      this.lighting.add({ x: x - 10, y: y - 14, radius: 34, color: hex('#ffc070'), intensity: 0.7, flicker: 0.04 });
      this.lighting.add({ x: x + 10, y: y - 14, radius: 34, color: hex('#ffc070'), intensity: 0.7, flicker: 0.04 });
    }
    if (p.type === 'tower') this.lighting.add({ x, y: y - 36, radius: 46, color: hex('#ffc070'), intensity: 0.7, flicker: 0.05, glow: 0.12 });
    if (p.type === 'castle') this.lighting.add({ x, y: y - 50, radius: 140, color: hex('#ffc070'), intensity: 0.7, flicker: 0.04, glow: 0.12 });

    // colisores
    const radius: Partial<Record<PropDef['type'], number>> = { log: 12, crate: 7, stump: 6, rock: 4, signpost: 3, well: 11, tent: 13, houseA: 18, houseB: 18, lamp: 3, tower: 15, wall: 16, castle: 46, banner: 3 };
    const cr = radius[p.type];
    if (cr) this.colliders.push({ x, y: y - 3, r: cr });
    return img;
  }

  /** Derruba (fade) árvores dentro de um raio — usado quando a vila cresce. */
  clearTrees(center: Vec, radius: number, instant = false) {
    for (const t of this.trees) {
      if (t.removed || Math.hypot(t.x - center.x, t.y - center.y) > radius) continue;
      t.removed = true;
      t.sway?.stop();
      this.colliders = this.colliders.filter((c) => !(c.x === t.x && c.y === t.y - 2));
      if (instant) t.img.destroy();
      else this.scene.tweens.add({ targets: t.img, alpha: 0, duration: 900, delay: Math.random() * 600, ease: 'Stepped', easeParams: [4], onComplete: () => t.img.destroy() });
    }
  }
}
