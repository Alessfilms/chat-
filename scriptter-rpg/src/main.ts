import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { EpisodeScene } from './scenes/EpisodeScene';
import { UIScene } from './scenes/UIScene';
import './systems/social';

/**
 * SCRIPTTER — experiência narrativa em pixel art.
 *
 * Renderização pixel-perfect: pixelArt (filtro NEAREST), sem antialias,
 * roundPixels. Resolução base 360x640 (9:16) escalada para caber na tela.
 */
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#07090f',
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, EpisodeScene, UIScene],
});

(window as unknown as { game: Phaser.Game }).game = game;
