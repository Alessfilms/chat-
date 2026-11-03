import Phaser from 'phaser';
import { bus, EV } from '../systems/EventBus';

/**
 * Controles de toque do modo exploração: d-pad (arrastar) e botão A.
 */
export class VirtualPad extends Phaser.GameObjects.Container {
  private pad: Phaser.GameObjects.Image;
  private btnA: Phaser.GameObjects.Image;
  private padPointer?: number;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    super(scene, 0, 0);
    this.pad = scene.add.image(56, h - 70, 'ui-dpad').setScale(2).setAlpha(0.85).setInteractive();
    this.btnA = scene.add.image(w - 50, h - 74, 'ui-btn-a').setScale(2).setAlpha(0.9).setInteractive();
    this.add([this.pad, this.btnA]);
    scene.add.existing(this);

    this.pad.on('pointerdown', (p: Phaser.Input.Pointer) => { this.padPointer = p.id; this.updateDir(p); });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.id === this.padPointer) this.updateDir(p); });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.id === this.padPointer) { this.padPointer = undefined; bus.emit(EV.INPUT_DIR, { x: 0, y: 0 }); }
    });
    this.btnA.on('pointerdown', () => {
      this.btnA.setY(this.btnA.y + 2);
      bus.emit(EV.INPUT_ACTION);
    });
    this.btnA.on('pointerup', () => this.btnA.setY(this.btnA.y - 2));
    this.btnA.on('pointerout', () => this.btnA.setY(h - 74));
  }

  private updateDir(p: Phaser.Input.Pointer) {
    const dx = p.x - this.pad.x, dy = p.y - this.pad.y;
    const l = Math.hypot(dx, dy);
    if (l < 6) { bus.emit(EV.INPUT_DIR, { x: 0, y: 0 }); return; }
    bus.emit(EV.INPUT_DIR, { x: dx / Math.max(l, 30), y: dy / Math.max(l, 30) });
  }
}
