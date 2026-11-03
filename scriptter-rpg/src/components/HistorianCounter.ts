import Phaser from 'phaser';
import { P } from '../assets/palette';
import { PixelText } from './PixelText';

/**
 * Contador "HISTORIADORES / 200" no canto superior direito.
 * O número rola até o valor novo e o painel dá um pulinho de 1px.
 */
export class HistorianCounter extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private label: PixelText;
  private num: PixelText;
  private icon: Phaser.GameObjects.Image;
  private shown = 0;
  private target = 0;
  private roll?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, private rightX: number, y: number) {
    super(scene, 0, y);
    this.bg = scene.add.nineslice(0, 0, 'ui-panel', undefined, 120, 40, 4, 4, 4, 4).setOrigin(1, 0);
    this.icon = scene.add.image(0, 0, 'icon-quill').setOrigin(0, 0).setScale(2);
    this.label = new PixelText(scene, 0, 0, 'HISTORIADORES', { scale: 1, color: P.uiMuted });
    this.num = new PixelText(scene, 0, 0, '0', { scale: 2, color: P.uiAccent });
    this.add([this.bg, this.icon, this.label, this.num]);
    scene.add.existing(this);
    this.layout();
  }

  private format(n: number) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private layout() {
    const w = Math.max(this.label.textWidth, this.num.textWidth) + 34;
    this.bg.setSize(w, 40);
    this.x = this.rightX;
    this.bg.x = 0;
    const left = -w;
    this.icon.setPosition(left + 7, 11);
    this.label.setPosition(left + 28, 4);
    this.num.setPosition(left + 28, 15);
  }

  setValue(n: number, duration = 800) {
    this.target = n;
    this.roll?.stop();
    if (duration <= 0) { this.shown = n; this.num.setText(this.format(n)); this.layout(); return; }
    const up = n > this.shown;
    this.roll = this.scene.tweens.add({
      targets: this, shown: n, duration, ease: 'Cubic.easeOut',
      onUpdate: () => { this.num.setText(this.format(this.shown)); this.layout(); },
    });
    if (up) this.bump();
  }

  bump() {
    this.scene.tweens.add({ targets: this.num, y: 13, duration: 80, yoyo: true, ease: 'Stepped', easeParams: [2] });
    this.num.setColor(P.white);
    this.scene.time.delayedCall(160, () => this.num.setColor(P.uiAccent));
  }

  get value() { return this.target; }
}
