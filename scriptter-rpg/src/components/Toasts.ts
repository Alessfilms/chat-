import Phaser from 'phaser';
import { P } from '../assets/palette';
import { PixelText } from './PixelText';

/**
 * Notificações pequenas ("+1 HISTORIADOR CHEGOU"): entram deslizando pela
 * esquerda, empilham, e somem. Várias chegadas seguidas são agrupadas.
 */
interface Toast { c: Phaser.GameObjects.Container; born: number }

export class Toasts {
  private list: Toast[] = [];
  private pending = 0;
  private pendingTimer?: Phaser.Time.TimerEvent;
  private lastUser?: string;

  constructor(private scene: Phaser.Scene, private x: number, private y: number, private batchMs = 1200) {}

  /** Chegada de historiador — agrupa rajadas. */
  arrival(user?: string) {
    this.pending++;
    if (user) this.lastUser = user;
    if (this.pendingTimer) return;
    this.pendingTimer = this.scene.time.delayedCall(this.pending > 1 ? this.batchMs : 250, () => {
      const n = this.pending;
      const u = this.lastUser;
      this.pending = 0;
      this.lastUser = undefined;
      this.pendingTimer = undefined;
      if (n === 1) this.push(u ? `+1 HISTORIADOR: @${u.toUpperCase()}` : '+1 HISTORIADOR CHEGOU', 'icon-person');
      else this.push(`+${n} HISTORIADORES CHEGARAM`, 'icon-person');
    });
  }

  push(text: string, icon = 'icon-quill') {
    const c = this.scene.add.container(this.x - 200, this.y);
    const label = new PixelText(this.scene, 24, 6, text, { scale: 1, color: P.uiText });
    const w = label.textWidth + 32;
    const bg = this.scene.add.nineslice(0, 0, 'ui-panel', undefined, w, 21, 4, 4, 4, 4).setOrigin(0, 0);
    const ic = this.scene.add.image(7, 2, icon).setOrigin(0, 0).setScale(2);
    c.add([bg, ic, label]);
    this.list.unshift({ c, born: this.scene.time.now });
    if (this.list.length > 4) {
      const old = this.list.pop()!;
      old.c.destroy();
    }
    this.relayout();
    c.x = this.x - w - 10;
    this.scene.tweens.add({ targets: c, x: this.x, duration: 260, ease: 'Back.easeOut' });
    this.scene.time.delayedCall(2600, () => {
      this.scene.tweens.add({
        targets: c, alpha: 0, duration: 300, ease: 'Stepped', easeParams: [3],
        onComplete: () => { this.list = this.list.filter((t) => t.c !== c); c.destroy(); this.relayout(); },
      });
    });
  }

  private relayout() {
    this.list.forEach((t, i) => {
      const ty = this.y + i * 24;
      if (t.c.y !== ty) this.scene.tweens.add({ targets: t.c, y: ty, duration: 160, ease: 'Stepped', easeParams: [3] });
    });
  }
}
