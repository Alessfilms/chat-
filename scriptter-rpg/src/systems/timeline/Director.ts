import type Phaser from 'phaser';
import type { DialogueLine, MapDef, Vec } from '../../data/types';
import type { CameraDirector } from '../CameraDirector';
import type { LightingSystem } from '../LightingSystem';
import type { AmbientSystem } from '../AmbientSystem';
import type { CrowdSystem } from '../CrowdSystem';
import type { WorldEvolution } from '../WorldEvolution';
import type { WorldBuilder } from '../WorldBuilder';
import type { Campfire } from '../../entities/Campfire';
import type { ScriptterMachine } from '../../entities/ScriptterMachine';
import type { Character } from '../../entities/Character';

/**
 * Tudo o que as ações da timeline podem controlar. Implementado pelo
 * EpisodeScene. Novas ações só precisam desta interface.
 */
export interface Director {
  phaser: Phaser.Scene;
  map: MapDef;
  camera: CameraDirector;
  lighting: LightingSystem;
  ambient: AmbientSystem;
  crowd: CrowdSystem;
  world: WorldBuilder;
  evolution: WorldEvolution;
  fire: Campfire;
  machine: ScriptterMachine;
  heroes: Record<string, Character>;
  dialogues: Record<string, DialogueLine | DialogueLine[]>;
  /** contagem atual mostrada no contador */
  historians: number;
  setHistorians(count: number, spreadMs: number, instant: boolean): void;
  enableLiveSocial(): void;
  setMode(mode: 'story' | 'explore'): void;
  /** galhos escuros de primeiro plano (parallax) */
  setForeground(alpha: number, duration: number): void;
  /** aceita nome de âncora ("fire"), {x,y}, ou {anchor, dx, dy} */
  point(p: unknown): Vec;
}
