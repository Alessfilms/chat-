import Phaser from 'phaser';
import { hex, P } from '../assets/palette';
import { FONT_KEY, normalizeText } from '../assets/font';

/**
 * Legenda cinematográfica (frases do narrador): centralizada, escala inteira,
 * letras surgindo uma a uma SEM reflow (o texto inteiro já está diagramado;
 * as letras ainda não reveladas ficam escondidas), sombra dura de 1px.
 */
export class Caption extends Phaser.GameObjects.Container {
  private main: Phaser.GameObjects.DynamicBitmapText;
  private shadow: Phaser.GameObjects.DynamicBitmapText;
  private revealed = 0;
  private typing?: Phaser.Time.TimerEvent;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, cx: number, private positions: Record<string, number>) {
    super(scene, cx, positions.center);
    const hideUnrevealed = (d: Phaser.Types.GameObjects.BitmapText.DisplayCallbackConfig) => {
      if (d.index >= this.revealed) d.y += 100000;
      return d;
    };
    this.shadow = scene.add.dynamicBitmapText(0, 0, FONT_KEY, '').setTint(hex(P.ink)).setCenterAlign();
    this.main = scene.add.dynamicBitmapText(0, 0, FONT_KEY, '').setTint(hex(P.uiText)).setCenterAlign();
    this.shadow.setDisplayCallback(hideUnrevealed);
    this.main.setDisplayCallback(hideUnrevealed);
    this.add([this.shadow, this.main]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(raw: string, duration: number, position = 'center', size = 2, color: string = P.uiText) {
    this.hideTimer?.remove();
    this.typing?.remove();
    this.scene.tweens.killTweensOf(this);
    const full = normalizeText(raw);
    for (const t of [this.main, this.shadow]) t.setScale(size).setMaxWidth(330).setText(full);
    this.main.setTint(hex(color));
    const w = this.main.width, h = this.main.height;
    this.main.setPosition(-Math.round(w / 2), -Math.round(h / 2));
    this.shadow.setPosition(this.main.x + size, this.main.y + size);
    this.y = (this.positions[position] ?? this.positions.center) + 2;
    this.setVisible(true).setAlpha(1);
    this.revealed = 0;
    // contamos só caracteres desenháveis (o índice do callback ignora quebras)
    const total = full.replace(/\n/g, '').length;
    const t0 = this.scene.time.now;
    this.typing = this.scene.time.addEvent({
      delay: 40, loop: true,
      callback: () => {
        // baseado no relógio (não no nº de ticks): mesmo ritmo em aparelhos lentos
        this.revealed = Math.floor((this.scene.time.now - t0) / 40);
        if (this.revealed >= total) { this.revealed = 1e9; this.typing?.remove(); }
      },
    });
    this.scene.tweens.add({ targets: this, y: this.y - 2, duration: 400, ease: 'Stepped', easeParams: [2] });
    this.hideTimer = this.scene.time.delayedCall(duration, () => this.hide());
  }

  hide(instant = false) {
    this.typing?.remove();
    this.hideTimer?.remove();
    if (instant) { this.setVisible(false); return; }
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 500, ease: 'Stepped', easeParams: [5], onComplete: () => this.setVisible(false) });
  }
}
