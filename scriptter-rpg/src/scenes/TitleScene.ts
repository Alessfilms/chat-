import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { hex, P } from '../assets/palette';
import { PixelText } from '../components/PixelText';
import type { EpisodeManifest } from '../data/types';
import { narration } from '../audio/NarrationPlayer';
import { sfx } from '../audio/Sfx';

/**
 * Tela inicial: logotipo SCRIPTTER, fogueira acesa, vagalumes, seletor de
 * episódio e escolha de modo (STORY / EXPLORE). O toque aqui também destrava
 * o áudio do navegador para a narração tocar sincronizada.
 */
export class TitleScene extends Phaser.Scene {
  private episodes: EpisodeManifest[] = [];
  private index = 0;
  private epText!: PixelText;
  private epSub!: PixelText;

  constructor() {
    super('Title');
  }

  create() {
    this.episodes = (this.cache.json.get('episodes')?.episodes ?? []) as EpisodeManifest[];
    const cx = GAME_W / 2;
    this.cameras.main.setBackgroundColor(P.night0);

    // céu com estrelas
    for (let i = 0; i < 90; i++) {
      const s = this.add.image(Math.floor(Math.random() * GAME_W), Math.floor(Math.random() * GAME_H * 0.7), Math.random() < 0.2 ? 'px-violet' : 'px-white');
      s.setAlpha(0.2 + Math.random() * 0.6).setScale(Math.random() < 0.15 ? 2 : 1);
      this.tweens.add({ targets: s, alpha: 0.1, duration: 800 + Math.random() * 2000, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
    }
    // silhueta da floresta
    const g = this.add.graphics();
    g.fillStyle(hex('#0b1416'));
    for (let x = -10; x < GAME_W + 20; x += 18) {
      const h = 60 + ((x * 37) % 50);
      g.fillTriangle(x, GAME_H - 150, x + 18, GAME_H - 150, x + 9, GAME_H - 150 - h);
    }
    g.fillRect(0, GAME_H - 152, GAME_W, 152);

    // fogueira no centro, em escala 3 (pixels grandes, inteiros)
    const fy = GAME_H - 190;
    this.add.image(cx, fy, 'fire-base').setScale(3).setOrigin(0.5, 0.65);
    this.add.sprite(cx, fy + 3, 'fire', '0').setScale(3).setOrigin(0.5, 1).play('fire-loop');
    this.add.image(cx, fy, 'fire-front').setScale(3).setOrigin(0.5, 0.65);
    const glow = this.add.image(cx, fy - 20, 'light-90').setScale(2.2).setTint(hex('#ff9a4a')).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.18, duration: 140, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    this.add.sprite(cx - 66, fy + 6, 'hero-a', 'right-0').setScale(3).setOrigin(0.5, 0.9).play('hero-a-idle-right');
    this.add.sprite(cx + 66, fy + 6, 'hero-b', 'left-0').setScale(3).setOrigin(0.5, 0.9).play('hero-b-idle-left');
    this.add.particles(cx, fy - 30, 'px-ember', {
      lifespan: 1600, speedY: { min: -50, max: -25 }, speedX: { min: -10, max: 10 }, scale: 3,
      alpha: { start: 1, end: 0 }, frequency: 120, blendMode: 'ADD',
    });

    // logotipo
    const logo = new PixelText(this, cx, 96, 'SCRIPTTER', { scale: 5, color: P.gold3, shadow: P.violet0 }).anchor(0.5, 0.5);
    const shadow2 = new PixelText(this, cx, 98, 'SCRIPTTER', { scale: 5, color: P.violet1, shadow: P.ink }).anchor(0.5, 0.5);
    this.children.moveBelow(shadow2, logo);
    this.tweens.add({ targets: [logo, shadow2], y: '-=2', duration: 1400, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });
    new PixelText(this, cx, 132, 'A MÁQUINA QUE TRANSFORMA IDEIAS EM HISTÓRIAS', { scale: 1, color: P.uiMuted }).anchor(0.5, 0.5);
    this.add.image(cx, 148, 'icon-gear').setScale(2);

    // seletor de episódio
    const sel = this.add.nineslice(cx, 200, 'ui-panel', undefined, 270, 46, 4, 4, 4, 4);
    void sel;
    this.epText = new PixelText(this, cx, 191, '', { scale: 2, color: P.uiAccent });
    this.epSub = new PixelText(this, cx, 210, '', { scale: 1, color: P.uiMuted });
    const arrowL = new PixelText(this, cx - 122, 200, '<', { scale: 2, color: P.uiText }).anchor(0.5, 0.5);
    const arrowR = new PixelText(this, cx + 122, 200, '>', { scale: 2, color: P.uiText }).anchor(0.5, 0.5);
    this.hit(arrowL, 30, 40, () => this.pick(-1));
    this.hit(arrowR, 30, 40, () => this.pick(1));

    // botões de modo
    this.button(cx, 262, '▶ STORY MODE', 'ui-panel-gold', () => this.start('story'));
    this.button(cx, 300, 'EXPLORE MODE', 'ui-panel', () => this.start('explore'));
    new PixelText(this, cx, GAME_H - 18, 'TOQUE PARA ESCOLHER · SETAS + ENTER', { scale: 1, color: P.uiMuted }).anchor(0.5, 0.5);

    this.input.keyboard?.on('keydown-LEFT', () => this.pick(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.pick(1));
    this.input.keyboard?.on('keydown-ENTER', () => this.start('story'));
    this.input.keyboard?.on('keydown-E', () => this.start('explore'));
    this.pick(0);
  }

  private hit(obj: Phaser.GameObjects.Container, w: number, h: number, cb: () => void) {
    const z = this.add.zone(obj.x, obj.y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerup', cb);
  }

  private button(x: number, y: number, label: string, tex: string, cb: () => void) {
    const t = new PixelText(this, x, y, label, { scale: 2, color: tex === 'ui-panel-gold' ? P.gold4 : P.uiText }).anchor(0.5, 0.5);
    const bg = this.add.nineslice(x, y, tex, undefined, t.textWidth * 2 + 30, 30, 4, 4, 4, 4);
    this.children.moveBelow(bg, t);
    const z = this.add.zone(x, y, t.textWidth * 2 + 30, 30).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => { bg.y += 2; t.y += 2; });
    z.on('pointerout', () => { bg.y = y; t.y = y; });
    z.on('pointerup', () => { bg.y = y; t.y = y; cb(); });
  }

  private pick(d: number) {
    if (!this.episodes.length) return;
    this.index = (this.index + d + this.episodes.length) % this.episodes.length;
    const ep = this.episodes[this.index];
    this.epText.setText(`EP${String(ep.number).padStart(2, '0')} — ${ep.title}`).anchor(0.5, 0.5);
    this.epSub.setText(ep.subtitle ?? '').anchor(0.5, 0.5);
  }

  private start(mode: 'story' | 'explore') {
    const ep = this.episodes[this.index];
    if (!ep) return;
    sfx.unlock();
    // destrava a narração dentro do gesto do usuário
    if (mode === 'story' && ep.audio) narration.prime(`episodes/${ep.id}/${ep.audio}`);
    this.cameras.main.fadeOut(400, 7, 9, 15);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Episode', { episodeId: ep.id, mode }));
  }
}
