import Phaser from 'phaser';
import { DEPTH } from '../config';
import type { AnimName, Dir } from '../assets/characters';
import { Nameplate } from '../components/Nameplate';

/**
 * Personagem principal com sprite sheet de 4 direções e estados
 * idle / walk / interact / celebrate. Ordenado por Y (depth = y).
 */
export class Character extends Phaser.GameObjects.Sprite {
  dir: Dir = 'down';
  state2: AnimName = 'idle';
  nameplate?: Nameplate;
  private moveTween?: Phaser.Tweens.Tween;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly sheet: string, label?: string) {
    super(scene, x, y, sheet, 'down-0');
    // origem nos pés (linha 18 do quadro de 20px)
    this.setOrigin(0.5, 18 / 20);
    scene.add.existing(this);
    if (label) this.nameplate = new Nameplate(scene, label);
    this.anim('idle', 'down');
  }

  anim(name: AnimName, dir: Dir = this.dir, restart = false) {
    this.dir = dir;
    this.state2 = name;
    const key = `${this.sheet}-${name}-${dir}`;
    if (restart || this.anims.currentAnim?.key !== key) this.play({ key, startFrame: 0 }, !restart);
    return this;
  }

  face(dir: Dir) { return this.anim(this.state2, dir); }

  /** Caminha até (x,y) em `duration` ms; volta para idle ao chegar. */
  walkTo(x: number, y: number, duration: number, then: AnimName = 'idle'): Promise<void> {
    this.moveTween?.stop();
    const dx = x - this.x, dy = y - this.y;
    const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.anim('walk', dir);
    return new Promise((res) => {
      this.moveTween = this.scene.tweens.add({
        targets: this, x, y, duration, ease: 'Linear',
        onComplete: () => { this.anim(then, dir); res(); },
        onStop: () => res(),
      });
    });
  }

  celebrate(duration = 1800) {
    const prev = this.dir;
    this.anim('celebrate', 'down');
    this.scene.time.delayedCall(duration, () => this.anim('idle', prev));
  }

  interact(duration = 1200) {
    this.anim('interact', this.dir);
    if (duration > 0) this.scene.time.delayedCall(duration, () => { if (this.state2 === 'interact') this.anim('idle'); });
  }

  showName(v: boolean) {
    this.nameplate?.setVisible(v);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.setDepth(DEPTH.entities + this.y);
    if (this.nameplate) {
      this.nameplate.place(this.x, this.y - 23);
      this.nameplate.setAlpha(this.alpha);
    }
  }

  destroy(fromScene?: boolean) {
    this.nameplate?.destroy();
    super.destroy(fromScene);
  }
}
