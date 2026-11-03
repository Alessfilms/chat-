import Phaser from 'phaser';
import { STAGES, stageFor, stageIndex } from '../data/stages';
import type { StageDef, Vec } from '../data/types';
import type { WorldBuilder } from './WorldBuilder';
import type { CrowdSystem } from './CrowdSystem';
import { bus, EV } from './EventBus';

/**
 * Evolução do mapa conforme a meta de historiadores:
 * clareira → primeiras casas → vila → cidade → reino.
 *
 * Ao subir de estágio: a floresta recua (árvores somem), o chão é repintado
 * com a clareira maior e novas trilhas, e as construções "brotam" uma a uma
 * com poeira. Estágios são cumulativos.
 */
export class WorldEvolution {
  current: StageDef = STAGES[0];
  private built = new Set<string>();

  constructor(private scene: Phaser.Scene, private world: WorldBuilder, private crowd: CrowdSystem, private center: Vec) {}

  /** Aplica o estágio correspondente à contagem. */
  updateForCount(count: number, instant = false) {
    const target = stageFor(count);
    if (target.id === this.current.id && this.built.has(target.id)) return;
    this.setStage(target.id, instant);
  }

  setStage(id: string, instant = false) {
    const idx = stageIndex(id);
    const prev = this.current;
    this.current = STAGES[idx];
    this.crowd.maxVisible = this.current.maxVisibleCrowd;
    const grew = stageIndex(prev.id) < idx;

    // constrói todos os estágios até o alvo (cumulativo)
    const paths: StageDef['paths'] = [];
    for (let i = 0; i <= idx; i++) {
      const st = STAGES[i];
      for (const p of st.paths ?? []) paths.push({ width: p.width, points: p.points.map((q) => ({ x: q.x + this.center.x, y: q.y + this.center.y })) });
      if (this.built.has(st.id)) continue;
      this.built.add(st.id);
      st.structures.forEach((s, k) => {
        const img = this.world.addProp(s, this.center);
        if (!img || instant) return;
        const fy = img.scaleY;
        img.setScale(1, 0).setAlpha(0);
        this.scene.tweens.add({
          targets: img, scaleY: fy, alpha: 1, duration: 650, delay: 400 + k * 260, ease: 'Back.easeOut',
          onStart: () => this.dust(img.x, img.y),
        });
      });
    }
    if (idx > 0 || grew) {
      this.world.clearTrees(this.center, this.current.clearingRadius + 40, instant);
      this.world.paint(this.current.clearingRadius, paths, idx >= 2 ? 30 : 0);
    }
    bus.emit(EV.STAGE_CHANGED, this.current, instant);
    if (grew && !instant) {
      bus.emit(EV.UI_STAGE_BANNER, { label: this.current.label });
      this.scene.cameras.main.shake(400, 0.0035);
    }
  }

  private dust(x: number, y: number) {
    const e = this.scene.add.particles(x, y - 2, 'px-steam', {
      lifespan: 700, speed: { min: 10, max: 40 }, angle: { min: 180, max: 360 }, alpha: { start: 0.7, end: 0 }, emitting: false,
    }).setDepth(9000);
    e.explode(18);
    this.scene.time.delayedCall(900, () => e.destroy());
  }
}
