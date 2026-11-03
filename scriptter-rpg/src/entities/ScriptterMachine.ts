import Phaser from 'phaser';
import { DEPTH } from '../config';
import { hex, P } from '../assets/palette';
import { MACHINE_H } from '../assets/machine';
import type { LightHandle, LightingSystem } from '../systems/LightingSystem';

/**
 * A máquina SCRIPTTER.
 *
 *   reveal()   surge com faíscas e um tremor leve
 *   activate() engrenagens giram, lâmpadas acendem, núcleo dourado pulsa,
 *              vapor e partículas mágicas
 *   print()    um pergaminho sai pela fenda (e a UI mostra a história)
 */
export class ScriptterMachine {
  readonly body: Phaser.GameObjects.Sprite;
  private gears: Phaser.GameObjects.Sprite[] = [];
  private bulbs: Phaser.GameObjects.Image[] = [];
  private paper: Phaser.GameObjects.Image;
  private steam: Phaser.GameObjects.Particles.ParticleEmitter;
  private magic: Phaser.GameObjects.Particles.ParticleEmitter;
  private light: LightHandle;
  visible = false;
  active = false;
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor(private scene: Phaser.Scene, readonly x: number, readonly y: number, lighting: LightingSystem) {
    const top = y - MACHINE_H + 6;
    const d = DEPTH.entities + y;
    this.body = scene.add.sprite(x, y + 6, 'scriptter', '0').setOrigin(0.5, 1).setDepth(d);
    const gl = scene.add.sprite(x - 26, top + 26, 'gear-l', '0').setDepth(d + 1);
    const gs = scene.add.sprite(x - 22, top + 36, 'gear-s', '0').setDepth(d + 1);
    const gr = scene.add.sprite(x + 26, top + 18, 'gear-s', '1').setDepth(d + 1);
    this.gears.push(gl, gs, gr);
    for (const bx of [-3, 3]) this.bulbs.push(scene.add.image(x + bx, top + 9, 'bulb', '0').setDepth(d + 1));
    this.paper = scene.add.image(x, top + 43, 'scroll-paper').setOrigin(0.5, 0).setDepth(d + 2).setVisible(false);

    this.steam = scene.add.particles(x + 11, top - 2, 'px-steam', {
      lifespan: 2200, speedY: { min: -22, max: -12 }, speedX: { min: -3, max: 6 },
      alpha: { start: 0.6, end: 0 }, frequency: 140, emitting: false,
    }).setDepth(DEPTH.canopyHigh);
    this.magic = scene.add.particles(x, top + 28, 'px-gold', {
      lifespan: 1600, speed: { min: 8, max: 26 }, alpha: { start: 1, end: 0 },
      frequency: 90, emitting: false, blendMode: 'ADD',
    }).setDepth(DEPTH.glowParticles);

    this.light = lighting.add({ id: 'machine', x, y: top + 28, radius: 90, color: hex(P.gold3), intensity: 0.85, flicker: 0.08, glow: 0.3, level: 0 });
    this.parts = [this.body, ...this.gears, ...this.bulbs];
    this.parts.forEach((p) => (p as Phaser.GameObjects.Sprite).setAlpha(0));
  }

  reveal(instant = false) {
    this.visible = true;
    if (instant) { this.parts.forEach((p) => (p as Phaser.GameObjects.Sprite).setAlpha(1)); return; }
    this.scene.tweens.add({ targets: this.parts, alpha: 1, duration: 900, ease: 'Stepped', easeParams: [6] });
    this.magic.explode(30);
    this.scene.cameras.main.shake(260, 0.003);
  }

  activate(instant = false) {
    if (!this.visible) this.reveal(instant);
    this.active = true;
    this.body.play('scriptter-on');
    this.gears[0].play('gear-l-spin');
    this.gears[1].play({ key: 'gear-s-spin', frameRate: 14 });
    this.gears[2].play({ key: 'gear-s-spin', frameRate: 8 });
    this.bulbs.forEach((b, i) => this.scene.time.delayedCall(instant ? 0 : 250 + i * 250, () => b.setFrame('1')));
    this.steam.start();
    this.magic.start();
    if (instant) this.light.level = 1;
    else this.scene.tweens.add({ targets: this.light, level: 1, duration: 1200, ease: 'Sine.easeOut' });
  }

  deactivate() {
    this.active = false;
    this.body.stop(); this.body.setFrame('0');
    this.gears.forEach((g) => g.stop());
    this.bulbs.forEach((b) => b.setFrame('0'));
    this.steam.stop(); this.magic.stop();
    this.scene.tweens.add({ targets: this.light, level: 0, duration: 600 });
  }

  /** Pergaminho saindo pela fenda (crop crescendo em degraus de 1px). */
  print(): Promise<void> {
    if (!this.active) this.activate();
    this.paper.setVisible(true).setCrop(0, 0, 18, 0);
    const o = { h: 0 };
    this.magic.explode(16);
    return new Promise((res) => {
      this.scene.tweens.add({
        targets: o, h: 22, duration: 1600, ease: 'Linear',
        onUpdate: () => this.paper.setCrop(0, 0, 18, Math.round(o.h)),
        onComplete: () => res(),
      });
    });
  }

  retractPaper() {
    this.scene.tweens.add({ targets: this.paper, alpha: 0, duration: 400, onComplete: () => this.paper.setVisible(false).setAlpha(1) });
  }

  /** Raio de colisão para o modo exploração. */
  get footprint() { return { x: this.x, y: this.y, r: 22 }; }
}
