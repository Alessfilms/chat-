import Phaser from 'phaser';
import { hex, P } from '../assets/palette';
import { PixelText } from './PixelText';
import { FONT_KEY, normalizeText } from '../assets/font';
import { sfx } from '../audio/Sfx';

/**
 * Caixa de diálogo estilo RPG: painel escuro, plaquinha com o nome de quem
 * fala, texto em máquina de escrever e seta piscando quando termina.
 */
export class DialogueBox extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private nameBg: Phaser.GameObjects.NineSlice;
  private nameText: PixelText;
  private bodyText: Phaser.GameObjects.DynamicBitmapText;
  private arrow: Phaser.GameObjects.Image;
  private full = '';
  private shown = 0;
  private total = 0;
  private typing?: Phaser.Time.TimerEvent;
  private hideTimer?: Phaser.Time.TimerEvent;
  open = false;

  constructor(scene: Phaser.Scene, w: number, private baseY: number) {
    super(scene, 0, baseY);
    const h = 74;
    this.bg = scene.add.nineslice(0, 0, 'ui-panel', undefined, w, h, 4, 4, 4, 4).setOrigin(0.5, 0);
    this.nameBg = scene.add.nineslice(-w / 2 + 8, -9, 'ui-panel-gold', undefined, 80, 15, 4, 4, 4, 4).setOrigin(0, 0);
    this.nameText = new PixelText(scene, -w / 2 + 14, -8, '', { scale: 1, color: P.gold3 });
    this.bodyText = scene.add.dynamicBitmapText(-w / 2 + 10, 10, FONT_KEY, '').setScale(2).setTint(hex(P.uiText)).setMaxWidth(w - 22);
    // texto já diagramado por inteiro; letras ainda não reveladas ficam escondidas (sem "pulo" de linha)
    this.bodyText.setDisplayCallback((d) => { if (d.index >= this.shown) d.y += 100000; return d; });
    this.arrow = scene.add.image(w / 2 - 12, h - 9, 'ui-arrow').setScale(2).setVisible(false);
    scene.tweens.add({ targets: this.arrow, y: h - 7, duration: 300, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    this.add([this.bg, this.nameBg, this.nameText, this.bodyText, this.arrow]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(speaker: string, text: string, duration?: number) {
    this.open = true;
    this.hideTimer?.remove();
    this.typing?.remove();
    this.full = normalizeText(text);
    this.shown = 0;
    this.bodyText.setText(this.full);
    this.total = this.full.replace(/\n/g, '').length;
    this.nameText.setText(speaker);
    this.nameBg.setVisible(!!speaker).setSize(this.nameText.textWidth + 14, 15);
    this.nameText.setVisible(!!speaker);
    this.arrow.setVisible(false);
    if (!this.visible) {
      this.setVisible(true).setAlpha(0);
      this.y = this.baseY + 8;
      this.scene.tweens.add({ targets: this, alpha: 1, y: this.baseY, duration: 220, ease: 'Stepped', easeParams: [4] });
    }
    const t0 = this.scene.time.now;
    this.typing = this.scene.time.addEvent({
      delay: 28, loop: true,
      callback: () => {
        this.shown = Math.floor((this.scene.time.now - t0) / 28);
        if (this.shown % 3 === 0) sfx.typeTick();
        if (this.shown >= this.total) {
          this.shown = 1e9;
          this.typing?.remove();
          this.arrow.setVisible(true);
        }
      },
    });
    if (duration) this.hideTimer = this.scene.time.delayedCall(duration, () => this.hide());
  }

  /** Completa o texto ou fecha (avançar no modo exploração). */
  advance(): boolean {
    if (this.shown <= this.total) {
      this.typing?.remove();
      this.shown = 1e9;
      this.arrow.setVisible(true);
      return true;
    }
    this.hide();
    return false;
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.typing?.remove();
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 180, ease: 'Stepped', easeParams: [3], onComplete: () => this.setVisible(false) });
  }
}
