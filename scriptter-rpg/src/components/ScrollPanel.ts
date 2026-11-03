import Phaser from 'phaser';
import { hex, P } from '../assets/palette';
import { FONT_KEY, normalizeText } from '../assets/font';
import { PixelText } from './PixelText';
import { sfx } from '../audio/Sfx';

/**
 * Pergaminho que a Scriptter imprime: desenrola (altura cresce em degraus de
 * 2px), mostra título, a história em tinta escura e a assinatura de quem
 * enviou (o comentário que virou história).
 */
export class ScrollPanel extends Phaser.GameObjects.Container {
  private paper: Phaser.GameObjects.NineSlice;
  private rollTop: Phaser.GameObjects.NineSlice;
  private rollBot: Phaser.GameObjects.NineSlice;
  private title: PixelText;
  private bodyText: Phaser.GameObjects.DynamicBitmapText;
  private sign: PixelText;
  private revealed = 0;
  private timer?: Phaser.Time.TimerEvent;
  open = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private pw = 260, private ph = 230) {
    super(scene, x, y);
    const w = pw, h = ph;
    this.paper = scene.add.nineslice(0, 0, 'ui-scroll', undefined, w, 8, 4, 4, 4, 4).setOrigin(0.5, 0);
    this.rollTop = scene.add.nineslice(0, -4, 'ui-scroll-roll', undefined, w + 16, 6, 3, 3, 2, 2).setOrigin(0.5, 0);
    this.rollBot = scene.add.nineslice(0, 4, 'ui-scroll-roll', undefined, w + 16, 6, 3, 3, 2, 2).setOrigin(0.5, 0);
    this.title = new PixelText(scene, 0, 14, '', { scale: 2, color: P.wood1, shadow: P.paper1 });
    this.bodyText = scene.add.dynamicBitmapText(-w / 2 + 14, 40, FONT_KEY, '').setScale(2).setTint(hex(P.night2)).setMaxWidth(w - 28);
    this.bodyText.setDisplayCallback((d) => { if (d.index >= this.revealed) d.y += 100000; return d; });
    this.sign = new PixelText(scene, w / 2 - 14, h - 22, '', { scale: 1, color: P.wood1, shadow: null });
    this.add([this.paper, this.title, this.bodyText, this.sign, this.rollTop, this.rollBot]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(title: string, text: string, user?: string) {
    this.open = true;
    this.timer?.remove();
    this.setVisible(true).setAlpha(1);
    this.title.setText(title).anchor(0.5, 0);
    const clean = normalizeText(text).slice(0, 150);
    this.bodyText.setText(clean);
    this.sign.setText(user ? `— @${user}` : '— SCRIPTTER').anchor(1, 0);
    [this.title, this.bodyText, this.sign].forEach((o) => o.setVisible(false));
    this.revealed = 0;
    const o = { h: 8 };
    this.scene.tweens.add({
      targets: o, h: this.ph, duration: 700, ease: 'Cubic.easeOut',
      onUpdate: () => {
        const hh = Math.round(o.h / 2) * 2;
        this.paper.setSize(this.pw, hh);
        this.rollBot.y = hh - 2;
      },
      onComplete: () => {
        [this.title, this.bodyText, this.sign].forEach((q) => q.setVisible(true));
        const total = clean.replace(/\n/g, '').length;
        const t0 = this.scene.time.now;
        this.timer = this.scene.time.addEvent({
          delay: 32, loop: true,
          callback: () => {
            this.revealed = Math.floor((this.scene.time.now - t0) / 32);
            if (this.revealed % 4 === 0) sfx.typeTick();
            if (this.revealed > total) { this.revealed = 1e9; this.timer?.remove(); }
          },
        });
      },
    });
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.timer?.remove();
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 300, ease: 'Stepped', easeParams: [3], onComplete: () => this.setVisible(false) });
  }
}
