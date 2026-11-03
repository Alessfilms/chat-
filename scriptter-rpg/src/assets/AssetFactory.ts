import Phaser from 'phaser';
import { bakeFont, bakeSmallFont } from './font';
import { bakeCharacterSheet, bakeCrowdSheet, registerCharacterAnims } from './characters';
import { bakeBush, bakeForegroundLeaves, bakeGrassTufts, bakeOak, bakePine, bakeSmallDecor } from './nature';
import { bakeCampProps, bakeFire, bakeStructures } from './props';
import { bakeMachine } from './machine';
import { bakeFog, bakeLight, bakeUI } from './ui';
import { PROTAGONISTS } from '../data/characters';
import { P } from './palette';

/**
 * Gera todas as texturas do jogo em tempo de boot. Nada é carregado de PNG:
 * cada sprite é desenhado pixel a pixel por código (ver /assets/*.ts), o que
 * permite trocar paletas e criar variações sem perder a pixel art.
 *
 * Para trocar por sprites desenhados à mão no futuro, basta carregar PNGs com
 * as mesmas chaves (ex.: 'hero-a', 'scriptter', 'oakL-0') no BootScene.
 */
export const OAK_L = ['oakL-0', 'oakL-1', 'oakL-2'];
export const OAK_M = ['oakM-0', 'oakM-1', 'oakM-2'];
export const PINES = ['pine-0', 'pine-1', 'pine-2'];
export const BUSHES = ['bush-0', 'bush-1', 'bushF-0', 'bushF-1'];

export function bakeAllAssets(scene: Phaser.Scene): void {
  bakeFont(scene);
  bakeSmallFont(scene);
  bakeUI(scene);
  bakeFog(scene);
  for (const r of [6, 10, 16, 24, 40, 64, 90, 120]) bakeLight(scene, r);

  for (const p of PROTAGONISTS) {
    bakeCharacterSheet(scene, p.key, p.style, p.energetic);
    registerCharacterAnims(scene, p.key, p.energetic);
  }
  bakeCrowdSheet(scene, 'crowd');

  OAK_L.forEach((k, i) => bakeOak(scene, k, 10 + i * 7, 'l'));
  OAK_M.forEach((k, i) => bakeOak(scene, k, 40 + i * 5, 'm'));
  PINES.forEach((k, i) => bakePine(scene, k, 70 + i));
  bakeBush(scene, 'bush-0', 3);
  bakeBush(scene, 'bush-1', 5);
  bakeBush(scene, 'bushF-0', 7, P.petal);
  bakeBush(scene, 'bushF-1', 9, P.gold3);
  bakeGrassTufts(scene, 'tuft');
  bakeSmallDecor(scene);
  bakeForegroundLeaves(scene);

  bakeFire(scene);
  bakeCampProps(scene);
  bakeStructures(scene);
  bakeMachine(scene);
}
