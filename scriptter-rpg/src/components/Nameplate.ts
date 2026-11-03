import Phaser from 'phaser';
import { DEPTH } from '../config';
import { PixelText } from './PixelText';
import { FONT_SMALL } from '../assets/font';

/**
 * Placa de nome sobre o personagem (fundo escuro, borda creme) — no espaço
 * do mundo, então os pixels da placa casam com os pixels do cenário.
 */
export class Nameplate extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private label: PixelText;

  constructor(scene: Phaser.Scene, text: string, style: 'dark' | 'gold' = 'dark') {
    super(scene, 0, 0);
    this.label = new PixelText(scene, 0, 0, text, { font: FONT_SMALL, scale: 1, shadow: null });
    const w = this.label.textWidth + 6;
    this.bg = scene.add.nineslice(0, 0, style === 'gold' ? 'ui-panel-gold' : 'ui-panel', undefined, w, 9, 2, 2, 2, 2);
    this.label.anchor(0.5, 0.5);
    this.label.y = 0;
    this.add([this.bg, this.label]);
    this.setDepth(DEPTH.labels);
    scene.add.existing(this);
  }

  setText(t: string) {
    this.label.setText(t).anchor(0.5, 0.5);
    this.bg.setSize(this.label.textWidth + 6, 9);
    return this;
  }

  place(x: number, y: number) {
    this.setPosition(Math.round(x), Math.round(y));
  }
}
