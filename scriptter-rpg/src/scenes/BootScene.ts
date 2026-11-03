import Phaser from 'phaser';
import { bakeAllAssets } from '../assets/AssetFactory';

/**
 * Gera todas as texturas (pixel art procedural) e carrega a lista de
 * episódios de public/episodes/episodes.json.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.json('episodes', 'episodes/episodes.json');
  }

  create() {
    bakeAllAssets(this);
    const params = new URLSearchParams(location.search);
    const ep = params.get('ep');
    const mode = params.get('mode');
    // atalho para gravação: ?ep=ep01&mode=story&autostart=1 (&t=40 começa aos 40s)
    if (ep && params.has('autostart')) this.scene.start('Episode', { episodeId: ep, mode: mode === 'explore' ? 'explore' : 'story', startAt: Number(params.get('t') ?? 0) });
    else this.scene.start('Title');
  }
}
