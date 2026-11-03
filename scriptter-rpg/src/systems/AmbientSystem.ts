import Phaser from 'phaser';
import { DEPTH } from '../config';
import { hex, P } from '../assets/palette';
import type { LightingSystem, LightHandle } from './LightingSystem';
import type { Vec } from '../data/types';

/**
 * Atmosfera: vagalumes (que iluminam o chão), pétalas e poeira mágica
 * flutuando, folhas caindo, duas camadas de neblina em parallax e grama
 * balançando com o vento (onda que atravessa o mapa).
 */
interface Firefly {
  img: Phaser.GameObjects.Image;
  home: Vec;
  ax: number; ay: number; fx: number; fy: number; ph: number;
  blink: number;
  light: LightHandle;
}

export class AmbientSystem {
  private fireflies: Firefly[] = [];
  private fog: Phaser.GameObjects.TileSprite[] = [];
  emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private leaves?: Phaser.GameObjects.Particles.ParticleEmitter;
  private tufts?: Phaser.GameObjects.Blitter;
  private tuftBobs: { bob: Phaser.GameObjects.Bob; v: number; x: number }[] = [];
  private lastTuftStep = 0;
  fireflyLevel = 1;
  fogLevel = 1;
  windPhase = 0;

  constructor(private scene: Phaser.Scene, private lighting: LightingSystem, private worldW: number, private worldH: number) {}

  createFog() {
    for (let i = 0; i < 2; i++) {
      const t = this.scene.add.tileSprite(0, 0, this.worldW, this.worldH, 'fog')
        .setOrigin(0).setDepth(DEPTH.fog + i).setTileScale(2 + i, 2 + i).setAlpha(i ? 0.55 : 0.8);
      this.fog.push(t);
    }
  }

  createFireflies(center: Vec, count: number, spread: number, seed = 1) {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2, d = 50 + rnd() * spread;
      const home = { x: center.x + Math.cos(a) * d, y: center.y + Math.sin(a) * d };
      const img = this.scene.add.image(home.x, home.y, 'firefly').setDepth(DEPTH.glowParticles).setBlendMode(Phaser.BlendModes.ADD);
      const light = this.lighting.add({ x: home.x, y: home.y, radius: 14, color: hex(P.firefly2), intensity: 0.4 });
      this.fireflies.push({ img, home, ax: 10 + rnd() * 26, ay: 6 + rnd() * 16, fx: 0.2 + rnd() * 0.5, fy: 0.3 + rnd() * 0.6, ph: rnd() * 10, blink: 2 + rnd() * 4, light });
    }
  }

  /** Pétalas rosadas e poeira mágica flutuando em volta da câmera. */
  createParticles(view: () => Phaser.Geom.Rectangle) {
    const zone = {
      getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
        const v = view();
        p.x = v.x + Math.random() * v.width;
        p.y = v.y + Math.random() * v.height;
        return p;
      },
    };
    const petals = this.scene.add.particles(0, 0, 'px-petal', {
      emitZone: { type: 'random', source: zone as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      lifespan: 7000, speedX: { min: 3, max: 9 }, speedY: { min: 2, max: 6 },
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.9 },
      frequency: 180, quantity: 1,
    }).setDepth(DEPTH.glowParticles);
    this.emitters.push(petals);
    const motes = this.scene.add.particles(0, 0, 'px-gold', {
      emitZone: { type: 'random', source: zone as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      lifespan: 5000, speedX: { min: -3, max: 3 }, speedY: { min: -6, max: -1 },
      alpha: { onEmit: () => 0, onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.8 },
      frequency: 260, quantity: 1, blendMode: 'ADD',
    }).setDepth(DEPTH.glowParticles);
    this.emitters.push(motes);
  }

  /** Folhas caindo (usado na travessia da floresta). */
  createLeaves(view: () => Phaser.Geom.Rectangle) {
    if (!this.scene.anims.exists('leaf-spin'))
      this.scene.anims.create({ key: 'leaf-spin', frames: [0, 1, 2, 3].map((i) => ({ key: 'leaf', frame: String(i) })), frameRate: 6, repeat: -1 });
    const zone = {
      getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
        const v = view();
        p.x = v.x - 20 + Math.random() * (v.width + 40);
        p.y = v.y - 10;
        return p;
      },
    };
    this.leaves = this.scene.add.particles(0, 0, 'leaf', {
      emitZone: { type: 'random', source: zone as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      anim: 'leaf-spin',
      lifespan: 9000, speedX: { min: 4, max: 14 }, speedY: { min: 10, max: 20 },
      frequency: 500, quantity: 1,
    }).setDepth(DEPTH.canopyHigh);
  }

  setLeafRate(freq: number) {
    if (!this.leaves) return;
    if (freq <= 0) this.leaves.stop();
    else { this.leaves.frequency = freq; if (!this.leaves.emitting) this.leaves.start(); }
  }

  /** Tufos de grama (Blitter = um único draw call para centenas). */
  createTufts(points: Vec[]) {
    this.tufts = this.scene.add.blitter(0, 0, 'tuft').setDepth(DEPTH.groundDecor);
    points.forEach((p, i) => {
      const v = i % 3;
      const bob = this.tufts!.create(Math.round(p.x), Math.round(p.y), `${v}-1`);
      this.tuftBobs.push({ bob, v, x: p.x });
    });
  }

  update(time: number, view: Phaser.Geom.Rectangle) {
    const t = time * 0.001;
    // neblina em parallax (deriva + paralaxe relativa à câmera)
    this.fog.forEach((f, i) => {
      f.tilePositionX = t * (3 + i * 4) + view.x * (0.15 + i * 0.1);
      f.tilePositionY = t * (1 + i) + view.y * (0.1 + i * 0.08);
      f.setAlpha((i ? 0.55 : 0.8) * this.fogLevel);
    });
    // vagalumes
    for (const f of this.fireflies) {
      const x = f.home.x + Math.sin(t * f.fx + f.ph) * f.ax + Math.sin(t * 1.7 + f.ph) * 3;
      const y = f.home.y + Math.cos(t * f.fy + f.ph * 1.3) * f.ay;
      f.img.setPosition(Math.round(x), Math.round(y));
      const b = Math.max(0, Math.sin(t * f.blink + f.ph));
      const a = (b > 0.5 ? 1 : b > 0.15 ? 0.55 : 0.12) * this.fireflyLevel;
      f.img.setAlpha(a);
      f.light.x = x; f.light.y = y; f.light.level = a;
    }
    // vento na grama: uma onda que atravessa o mapa
    if (this.tufts && time - this.lastTuftStep > 120) {
      this.lastTuftStep = time;
      this.windPhase = t;
      for (const tb of this.tuftBobs) {
        const w = Math.sin(t * 1.6 - tb.x * 0.02);
        const frame = w > 0.55 ? 2 : w < -0.75 ? 0 : 1;
        tb.bob.setFrame(`${tb.v}-${frame}`);
      }
    }
  }
}
