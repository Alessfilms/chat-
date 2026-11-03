import type { MapDef } from '../types';

/**
 * EP01/EP02 — A Clareira.
 * Mapa de 80x80 tiles (1280x1280 px). A fogueira fica no centro; uma trilha
 * desce para o sul, por onde a câmera "atravessa a floresta" na abertura.
 */
const W = 1280, H = 1280;
const FIRE = { x: 640, y: 620 };

export const clearingMap: MapDef = {
  id: 'clearing',
  width: W,
  height: H,
  seed: 2026,
  anchors: {
    fire: FIRE,
    heroA: { x: FIRE.x - 36, y: FIRE.y + 4 },
    heroB: { x: FIRE.x + 36, y: FIRE.y + 4 },
    machine: { x: FIRE.x, y: FIRE.y - 44 },
    clearing: FIRE,
    forestSouth: { x: 652, y: 1160 },
    forestMid: { x: 630, y: 920 },
    forestEdge: { x: 640, y: 770 },
    north: { x: 640, y: 420 },
  },
  clearing: { center: FIRE, radius: 150, dirtRadius: 36 },
  paths: [
    {
      width: 22,
      points: [
        { x: 640, y: 650 }, { x: 632, y: 760 }, { x: 660, y: 880 },
        { x: 628, y: 1000 }, { x: 650, y: 1130 }, { x: 640, y: 1290 },
      ],
    },
  ],
  forest: {
    count: 340,
    pineRatio: 0.32,
    keepOut: [{ center: FIRE, radius: 170 }],
  },
  props: [
    { type: 'crate', x: FIRE.x - 70, y: FIRE.y + 16 },
    { type: 'crate', x: FIRE.x + 68, y: FIRE.y + 10 },
    { type: 'log', x: FIRE.x - 40, y: FIRE.y - 30, id: 'logW' },
    { type: 'log', x: FIRE.x + 42, y: FIRE.y - 30, id: 'logE', flipX: true },
    { type: 'stump', x: FIRE.x + 92, y: FIRE.y - 60 },
    { type: 'rock', x: FIRE.x - 104, y: FIRE.y + 70, frame: '1' },
    { type: 'rock', x: FIRE.x + 120, y: FIRE.y + 40, frame: '0' },
    { type: 'signpost', x: 618, y: 790 },
    { type: 'mushroom', x: FIRE.x - 128, y: FIRE.y - 40, frame: '0' },
    { type: 'mushroom', x: FIRE.x + 134, y: FIRE.y - 10, frame: '1' },
    { type: 'mushroom', x: 600, y: 900, frame: '1' },
    { type: 'mushroom', x: 690, y: 1010, frame: '0' },
    { type: 'mushroom', x: FIRE.x + 70, y: FIRE.y + 120, frame: '0' },
  ],
};
