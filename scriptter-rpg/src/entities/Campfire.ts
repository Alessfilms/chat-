import Phaser from 'phaser';
import { DEPTH } from '../config';
import { hex } from '../assets/palette';
import type { LightHandle, LightingSystem } from '../systems/LightingSystem';

/**
 * Fogueira: base com toras e brasas, chama animada em loop (8 quadros),
 * pedras da frente, faíscas subindo, fumaça e luz quente tremulante.
 */
export class Campfire {
  readonly base: Phaser.GameObjects.Image;
  readonly flame: Phaser.GameObjects.Sprite;
  readonly front: Phaser.GameObjects.Image;
  readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;
  readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  readonly light: LightHandle;
  readonly lightCore: LightHandle;
  private _level = 0;

  constructor(private scene: Phaser.Scene, readonly x: number, readonly y: number, lighting: LightingSystem) {
    this.base = scene.add.image(x, y, 'fire-base').setOrigin(0.5, 0.65).setDepth(DEPTH.entities + y - 2);
    this.flame = scene.add.sprite(x, y + 1, 'fire', '0').setOrigin(0.5, 1).setDepth(DEPTH.entities + y).play('fire-loop');
    this.front = scene.add.image(x, y, 'fire-front').setOrigin(0.5, 0.65).setDepth(DEPTH.entities + y + 3);

    this.light = lighting.add({ id: 'fire', x, y: y - 6, radius: 150, color: hex('#ffb36b'), intensity: 1, flicker: 0.16, glow: 0.22, level: 0 });
    this.lightCore = lighting.add({ id: 'fire-core', x, y: y - 6, radius: 48, color: hex('#ffd890'), intensity: 0.9, flicker: 0.3, glow: 0.35, level: 0 });

    this.embers = scene.add.particles(x, y - 8, 'px-ember', {
      lifespan: { min: 900, max: 2000 }, speedY: { min: -30, max: -14 }, speedX: { min: -6, max: 6 },
      accelerationX: { min: -6, max: 6 },
      x: { min: -4, max: 4 },
      alpha: { start: 1, end: 0 },
      frequency: 110, blendMode: 'ADD',
    }).setDepth(DEPTH.glowParticles);
    this.smoke = scene.add.particles(x, y - 20, 'px-steam', {
      lifespan: 3200, speedY: { min: -12, max: -7 }, speedX: { min: 1, max: 5 },
      alpha: { start: 0.25, end: 0 }, frequency: 260,
    }).setDepth(DEPTH.canopyHigh - 1);
    this.setLevel(0);
  }

  get level() { return this._level; }

  /** 0 = apagada, 1 = acesa. */
  setLevel(v: number) {
    this._level = v;
    this.flame.setAlpha(v > 0.05 ? 1 : 0).setScale(1, Math.max(0.2, v));
    this.light.level = v;
    this.lightCore.level = v;
    this.embers.emitting = v > 0.4;
    this.smoke.emitting = v > 0.4;
  }

  ignite(duration = 1500, instant = false) {
    if (instant) { this.setLevel(1); return; }
    const o = { v: this._level };
    this.scene.tweens.add({ targets: o, v: 1, duration, ease: 'Cubic.easeOut', onUpdate: () => this.setLevel(o.v) });
    this.embers.explode(14);
  }

  /** Um "estouro" de faíscas (ex.: quando um novo historiador chega). */
  burst(n = 10) {
    if (this._level > 0.4) this.embers.explode(n);
  }
}
