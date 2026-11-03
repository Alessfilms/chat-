import Phaser from 'phaser';
import { DEBUG, GAME_H, GAME_W, URL_PARAMS } from '../config';
import { hex, P } from '../assets/palette';
import { PixelText } from '../components/PixelText';
import { HistorianCounter } from '../components/HistorianCounter';
import { DialogueBox } from '../components/DialogueBox';
import { Caption } from '../components/Caption';
import { Toasts } from '../components/Toasts';
import { ScrollPanel } from '../components/ScrollPanel';
import { VirtualPad } from '../components/VirtualPad';
import { bus, EV } from '../systems/EventBus';
import type { EpisodeManifest } from '../data/types';
import { SOCIAL } from '../data/social';
import { narration } from '../audio/NarrationPlayer';

/**
 * Interface em pixel art, numa câmera própria (não sofre o zoom do mundo).
 * Escuta o EventBus: legendas, diálogos, notificações, contador, pergaminho,
 * barras de cinema, fades, cartão de título e cartão final.
 */
export class UIScene extends Phaser.Scene {
  private manifest!: EpisodeManifest;
  private mode: 'story' | 'explore' = 'story';
  private counter!: HistorianCounter;
  private dialogue!: DialogueBox;
  private caption!: Caption;
  private toasts!: Toasts;
  private scroll!: ScrollPanel;
  private tag!: Phaser.GameObjects.Container;
  private barTop!: Phaser.GameObjects.Image;
  private barBot!: Phaser.GameObjects.Image;
  private fade!: Phaser.GameObjects.Image;
  private prompt!: PixelText;
  private promptBg!: Phaser.GameObjects.NineSlice;
  private debugText?: PixelText;
  private pad?: VirtualPad;
  private storyButtons?: Phaser.GameObjects.Container;
  private clean = URL_PARAMS.has('clean');

  constructor() {
    super('UI');
  }

  init(data: { manifest: EpisodeManifest; mode: 'story' | 'explore' }) {
    this.manifest = data.manifest;
    this.mode = data.mode;
  }

  create() {
    const W = GAME_W, H = GAME_H;

    this.barTop = this.add.image(0, 0, 'px').setOrigin(0, 0).setTint(hex(P.night0)).setDisplaySize(W, 0);
    this.barBot = this.add.image(0, H, 'px').setOrigin(0, 1).setTint(hex(P.night0)).setDisplaySize(W, 0);

    // etiqueta do episódio
    this.tag = this.add.container(8, 8);
    const epNum = new PixelText(this, 8, 5, `EP${String(this.manifest.number).padStart(2, '0')}`, { scale: 1, color: P.gold3 });
    const epTitle = new PixelText(this, 8, 17, this.manifest.title, { scale: 1, color: P.uiText });
    const tagBg = this.add.nineslice(0, 0, 'ui-panel', undefined, Math.max(epTitle.textWidth, 30) + 16, 32, 4, 4, 4, 4).setOrigin(0);
    this.tag.add([tagBg, epNum, epTitle]).setAlpha(0);

    this.counter = new HistorianCounter(this, W - 8, 8);
    this.counter.setAlpha(0);

    this.toasts = new Toasts(this, 8, 48, SOCIAL.toastBatchWindowMs);
    this.caption = new Caption(this, W / 2, { center: Math.round(H * 0.42), low: Math.round(H * 0.74), top: Math.round(H * 0.22) });
    this.scroll = new ScrollPanel(this, W / 2, 150);
    this.dialogue = new DialogueBox(this, W - 20, H - 100);
    this.dialogue.x = W / 2;

    this.promptBg = this.add.nineslice(W / 2, H - 120, 'ui-panel-violet', undefined, 100, 17, 4, 4, 4, 4).setVisible(false);
    this.prompt = new PixelText(this, W / 2, H - 120, '', { scale: 1, color: P.uiText }).setVisible(false);

    this.fade = this.add.image(0, 0, 'px').setOrigin(0).setDisplaySize(W, H).setTint(hex(P.night0)).setAlpha(this.mode === 'story' ? 1 : 0);

    // estado que o mundo já tinha antes da UI existir
    const ep = this.scene.get('Episode') as unknown as { historians?: number };
    if (ep?.historians) this.counter.setValue(ep.historians, 0);

    if (this.mode === 'explore') this.enterExplore();
    else if (!this.clean) this.createStoryButtons();
    if (DEBUG) this.debugText = new PixelText(this, 6, H - 14, '', { scale: 1, color: P.firefly });

    this.listen();
  }

  // ------------------------------------------------------------------ API
  dialogueOpen() { return this.dialogue.open; }
  advanceDialogue() { this.dialogue.advance(); }
  scrollOpen() { return this.scroll.open; }
  closeScroll() { this.scroll.hide(); }

  // ------------------------------------------------------------------ eventos
  private listen() {
    const on = (ev: string, fn: (...a: any[]) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      bus.on(ev, fn, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => bus.off(ev, fn, this));
    };
    on(EV.HISTORIANS_COUNT, (n: number, dur: number) => this.counter.setValue(n, dur));
    on(EV.UI_COUNTER, (p: { visible: boolean }) => this.tweens.add({ targets: this.counter, alpha: p.visible ? 1 : 0, duration: 400, ease: 'Stepped', easeParams: [4] }));
    on(EV.UI_EPISODE_TAG, (p: { visible: boolean }) => this.tweens.add({ targets: this.tag, alpha: p.visible ? 1 : 0, duration: 400, ease: 'Stepped', easeParams: [4] }));
    on(EV.UI_CAPTION, (p: { text: string; duration: number; position: string; size: number }) => this.caption.show(p.text, p.duration, p.position, p.size));
    on(EV.UI_CAPTION_HIDE, (instant: boolean) => this.caption.hide(instant));
    on(EV.UI_DIALOGUE, (p: { speaker: string; text: string; duration?: number }) => this.dialogue.show(p.speaker, p.text, p.duration));
    on(EV.UI_DIALOGUE_HIDE, () => this.dialogue.hide());
    on(EV.UI_TOAST, (p: { text?: string; icon?: string; arrival?: boolean; user?: string }) => {
      if (p.arrival) this.toasts.arrival(p.user);
      else if (p.text) this.toasts.push(p.text, p.icon);
    });
    on(EV.UI_FADE, (p: { to: number; duration: number; color?: string }) => {
      if (p.color) this.fade.setTint(hex(p.color));
      this.tweens.killTweensOf(this.fade);
      if (!p.duration) this.fade.setAlpha(p.to);
      else this.tweens.add({ targets: this.fade, alpha: p.to, duration: p.duration, ease: 'Stepped', easeParams: [Math.max(4, Math.round(p.duration / 120))] });
    });
    on(EV.UI_LETTERBOX, (p: { on: boolean; duration: number }) => {
      const h = p.on ? 46 : 0;
      for (const b of [this.barTop, this.barBot]) {
        if (!p.duration) b.setDisplaySize(GAME_W, h);
        else this.tweens.add({ targets: b, displayHeight: h, duration: p.duration, ease: 'Sine.easeInOut' });
      }
    });
    on(EV.UI_TITLE_CARD, (p: { title: string; subtitle?: string; duration: number }) => this.titleCard(p.title, p.subtitle, p.duration));
    on(EV.UI_SCROLL, (p: { title: string; text: string; user?: string }) => this.scroll.show(p.title, p.text, p.user));
    on(EV.UI_SCROLL_HIDE, () => this.scroll.hide());
    on(EV.UI_STAGE_BANNER, (p: { label: string }) => this.stageBanner(p.label));
    on(EV.UI_END_CARD, (p: { text?: string; cta?: string }) => this.endCard(p.text, p.cta));
    on(EV.EPISODE_ENDED, () => this.endCard());
    on(EV.UI_MODE, (m: 'story' | 'explore') => { if (m === 'explore' && this.mode !== 'explore') { this.mode = 'explore'; this.enterExplore(); } });
    on(EV.UI_PROMPT, (text: string | null) => {
      this.prompt.setVisible(!!text);
      this.promptBg.setVisible(!!text);
      if (text) { this.prompt.setText(text).anchor(0.5, 0.5); this.promptBg.setSize(this.prompt.textWidth + 14, 17); }
    });
    on(EV.UI_DEBUG_TIME, (t: number, next?: { t: number; action: string }) => {
      this.debugText?.setText(`${t.toFixed(2)}s  → ${next ? `${next.t}s ${next.action}` : 'FIM'}   [ESPAÇO pausa · ←/→ eventos]`);
    });
  }

  // ------------------------------------------------------------------ partes
  private enterExplore() {
    this.storyButtons?.destroy();
    this.fade.setAlpha(0);
    this.tag.setAlpha(1);
    this.counter.setAlpha(1);
    this.pad = new VirtualPad(this, GAME_W, GAME_H);
    if (!this.sys.game.device.input.touch) this.pad.setAlpha(0.55);
    this.smallButton(GAME_W / 2, GAME_H - 16, 'MENU', () => (this.scene.get('Episode') as unknown as { toTitle(): void }).toTitle());
    new PixelText(this, GAME_W / 2, GAME_H - 34, 'SETAS/WASD · E CONVERSAR', { scale: 1, color: P.uiMuted }).anchor(0.5, 0.5).setAlpha(this.sys.game.device.input.touch ? 0 : 0.8);
  }

  private createStoryButtons() {
    this.storyButtons = this.add.container(0, 0).setAlpha(0);
    const pause = this.smallButton(30, GAME_H - 16, '❚❚', () => narration.toggle());
    const explore = this.smallButton(GAME_W - 46, GAME_H - 16, 'EXPLORAR', () => (this.scene.get('Episode') as unknown as { setMode(m: string): void }).setMode('explore'));
    this.storyButtons.add([...pause, ...explore]);
    this.tweens.add({ targets: this.storyButtons, alpha: 0.75, delay: 1500, duration: 500 });
  }

  private smallButton(x: number, y: number, label: string, cb: () => void): Phaser.GameObjects.GameObject[] {
    const t = new PixelText(this, x, y, label, { scale: 1, color: P.uiText }).anchor(0.5, 0.5);
    const bg = this.add.nineslice(x, y, 'ui-panel', undefined, t.textWidth + 14, 17, 4, 4, 4, 4);
    this.children.moveBelow(bg, t);
    const z = this.add.zone(x, y, t.textWidth + 24, 26).setInteractive({ useHandCursor: true });
    z.on('pointerup', cb);
    return [bg, t, z];
  }

  private titleCard(title: string, subtitle: string | undefined, duration: number) {
    const c = this.add.container(GAME_W / 2, Math.round(GAME_H * 0.36)).setAlpha(0);
    const t1 = new PixelText(this, 0, -14, title, { scale: 3, color: P.gold3, shadow: P.violet0 }).anchor(0.5, 0.5);
    const line = this.add.image(0, 8, 'px').setDisplaySize(Math.min(300, t1.textWidth * 3 + 20), 2).setTint(hex(P.gold1));
    c.add([t1, line]);
    if (subtitle) c.add(new PixelText(this, 0, 22, subtitle, { scale: 1, color: P.uiText }).anchor(0.5, 0.5));
    this.tweens.add({ targets: c, alpha: 1, duration: 600, ease: 'Stepped', easeParams: [5] });
    this.tweens.add({ targets: c, alpha: 0, delay: duration - 600, duration: 600, ease: 'Stepped', easeParams: [5], onComplete: () => c.destroy() });
  }

  private stageBanner(label: string) {
    const c = this.add.container(GAME_W / 2, 92);
    const sub = new PixelText(this, 0, -7, 'O MUNDO CRESCEU!', { scale: 1, color: P.uiMuted }).anchor(0.5, 0.5);
    const t = new PixelText(this, 0, 7, label, { scale: 2, color: P.gold4 }).anchor(0.5, 0.5);
    const bg = this.add.nineslice(0, 0, 'ui-panel-gold', undefined, t.textWidth * 2 + 30, 40, 4, 4, 4, 4);
    c.add([bg, sub, t]).setScale(1, 0);
    this.tweens.add({ targets: c, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 3200, duration: 400, ease: 'Stepped', easeParams: [4], onComplete: () => c.destroy() });
  }

  private endShown = false;
  private endCard(text?: string, cta?: string) {
    if (this.endShown) return;
    this.endShown = true;
    this.storyButtons?.destroy();
    const c = this.add.container(GAME_W / 2, GAME_H - 150).setAlpha(0);
    const bg = this.add.nineslice(0, 0, 'ui-panel', undefined, 320, 112, 4, 4, 4, 4);
    c.add(bg);
    c.add(new PixelText(this, 0, -36, text ?? 'FIM DO EPISÓDIO', { scale: 2, color: P.gold3 }).anchor(0.5, 0.5));
    c.add(new PixelText(this, 0, -14, cta ?? 'SIGA E TORNE-SE UM HISTORIADOR', { scale: 1, color: P.uiText }).anchor(0.5, 0.5));
    const eps = (this.cache.json.get('episodes')?.episodes ?? []) as EpisodeManifest[];
    const next = eps.find((e) => e.number === this.manifest.number + 1);
    const btns: [string, () => void][] = [
      ['REVER', () => bus.emit(EV.REQUEST_RESTART, { mode: 'story', startAt: 0 })],
      ['EXPLORAR', () => bus.emit(EV.REQUEST_RESTART, { mode: 'explore' })],
    ];
    if (next) btns.push([`EP${String(next.number).padStart(2, '0')} ▶`, () => bus.emit(EV.REQUEST_RESTART, { mode: 'story', startAt: 0, episodeId: next.id })]);
    const span = 300 / btns.length;
    btns.forEach(([l, cb], i) => {
      const x = -150 + span * i + span / 2;
      const t = new PixelText(this, x, 26, l, { scale: 1, color: P.uiText }).anchor(0.5, 0.5);
      const b = this.add.nineslice(x, 26, i === 0 ? 'ui-panel' : 'ui-panel-gold', undefined, Math.max(70, t.textWidth + 16), 24, 4, 4, 4, 4);
      const z = this.add.zone(GAME_W / 2 + x, GAME_H - 150 + 26, Math.max(70, t.textWidth + 16), 28).setInteractive({ useHandCursor: true });
      z.on('pointerup', cb);
      c.add([b, t]);
    });
    this.tweens.add({ targets: c, alpha: 1, duration: 600, ease: 'Stepped', easeParams: [5] });
  }
}
