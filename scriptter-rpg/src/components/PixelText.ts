import Phaser from 'phaser';
import { FONT_KEY, normalizeText } from '../assets/font';
import { hex, P } from '../assets/palette';

/**
 * Texto em pixel art: BitmapText com a fonte própria, escala inteira e
 * sombra dura de 1 pixel (outra cópia deslocada) — nunca texto vetorial.
 */
export class PixelText extends Phaser.GameObjects.Container {
  readonly main: Phaser.GameObjects.BitmapText;
  readonly shadow: Phaser.GameObjects.BitmapText;
  private _scale: number;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: { font?: string; scale?: number; color?: string; shadow?: string | null; align?: 0 | 1 | 2; maxWidth?: number } = {}) {
    super(scene, x, y);
    this._scale = opts.scale ?? 1;
    const t = normalizeText(text);
    this.shadow = scene.add.bitmapText(this._scale, this._scale, opts.font ?? FONT_KEY, t).setScale(this._scale).setTint(hex(opts.shadow ?? P.ink));
    this.main = scene.add.bitmapText(0, 0, opts.font ?? FONT_KEY, t).setScale(this._scale).setTint(hex(opts.color ?? P.uiText));
    if (opts.align !== undefined) { this.main.setCenterAlign(); this.shadow.setCenterAlign(); this.setAlign(opts.align); }
    if (opts.maxWidth) { this.main.setMaxWidth(opts.maxWidth); this.shadow.setMaxWidth(opts.maxWidth); }
    if (opts.shadow === null) this.shadow.setVisible(false);
    this.add([this.shadow, this.main]);
    scene.add.existing(this);
  }

  setAlign(a: 0 | 1 | 2) {
    // 0 esquerda, 1 centro, 2 direita
    this.main.align = a;
    this.shadow.align = a;
    return this;
  }

  setText(text: string) {
    const t = normalizeText(text);
    this.main.setText(t);
    this.shadow.setText(t);
    return this;
  }

  setColor(c: string) {
    this.main.setTint(hex(c));
    return this;
  }

  /** Posiciona o texto com âncora (0..1) — sempre em pixel inteiro. */
  anchor(ax: number, ay: number) {
    const w = this.main.width, h = this.main.height;
    this.main.setPosition(-Math.round(w * ax), -Math.round(h * ay));
    this.shadow.setPosition(this.main.x + this._scale, this.main.y + this._scale);
    return this;
  }

  get textWidth() { return this.main.width; }
  get textHeight() { return this.main.height; }
}
