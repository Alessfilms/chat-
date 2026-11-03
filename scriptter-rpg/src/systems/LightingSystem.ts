import Phaser from 'phaser';
import { DEPTH } from '../config';
import { bakeLight } from '../assets/ui';
import type { LightDef } from '../data/types';

/**
 * Iluminação dinâmica 2D, pixel-perfect.
 *
 * Uma RenderTexture do tamanho do mundo (em meia resolução → luz em blocos de
 * 2px) é preenchida com a cor ambiente da noite e recebe "carimbos" aditivos
 * de luz radial em faixas (com dithering). Essa textura é desenhada sobre o
 * mundo com blend MULTIPLY: onde não há luz, tudo escurece para o azul da
 * noite; perto da fogueira, a cor original volta, aquecida.
 *
 * Um segundo passe aditivo (sprites de brilho com alpha baixo) dá o "bloom"
 * quente acima do tom original.
 */
export interface LightHandle extends LightDef {
  id: string;
  x: number;
  y: number;
  /** multiplicador animável (0..1) — use para acender/apagar */
  level: number;
  follow?: { x: number; y: number };
  offsetY?: number;
  glowSprite?: Phaser.GameObjects.Image;
  phase: number;
}

const RES = 2; // 1 pixel de luz = 2 pixels do mundo

export class LightingSystem {
  private rt: Phaser.GameObjects.RenderTexture;
  private lights = new Map<string, LightHandle>();
  private ambient = new Phaser.Display.Color(58, 70, 112);
  private baked: number[] = [6, 10, 16, 24, 40, 64, 90, 120];
  /** 0 = noite total, 1 = sem escurecimento (dia) */
  ambientLevel = 0;
  enabled = true;
  private counter = 0;

  constructor(private scene: Phaser.Scene, worldW: number, worldH: number) {
    this.rt = scene.add.renderTexture(0, 0, Math.ceil(worldW / RES), Math.ceil(worldH / RES));
    this.rt.setOrigin(0, 0).setScale(RES).setDepth(DEPTH.lightMultiply);
    this.rt.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  setAmbient(r: number, g: number, b: number) {
    this.ambient.setTo(r, g, b);
  }

  add(def: LightDef & { x: number; y: number; id?: string; follow?: { x: number; y: number }; offsetY?: number; level?: number }): LightHandle {
    const id = def.id ?? `l${this.counter++}`;
    const h: LightHandle = {
      intensity: 1, flicker: 0, glow: 0, ...def, id,
      level: def.level ?? 1, phase: Math.random() * 1000,
    };
    if (h.glow && h.glow > 0) {
      const key = bakeLight(this.scene, this.pickBaked(h.radius / RES));
      h.glowSprite = this.scene.add.image(h.x, h.y, key).setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.lightAdd).setTint(h.color).setAlpha(0);
      h.glowSprite.setScale(h.radius / (this.pickBaked(h.radius / RES)));
    }
    this.lights.set(id, h);
    return h;
  }

  remove(id: string) {
    const h = this.lights.get(id);
    h?.glowSprite?.destroy();
    this.lights.delete(id);
  }

  get(id: string) {
    return this.lights.get(id);
  }

  private pickBaked(r: number): number {
    for (const b of this.baked) if (b >= r) return b;
    return this.baked[this.baked.length - 1];
  }

  update(time: number, view: Phaser.Geom.Rectangle) {
    this.rt.setVisible(this.enabled);
    if (!this.enabled) return;
    const amb = this.ambient;
    const k = this.ambientLevel;
    const r = Math.round(amb.red + (255 - amb.red) * k);
    const g = Math.round(amb.green + (255 - amb.green) * k);
    const b = Math.round(amb.blue + (255 - amb.blue) * k);
    this.rt.fill(Phaser.Display.Color.GetColor(r, g, b), 1);

    const margin = 160;
    for (const l of this.lights.values()) {
      if (l.follow) { l.x = l.follow.x; l.y = l.follow.y + (l.offsetY ?? 0); }
      // tremulação em degraus (sem suavizar demais, fica mais "pixel")
      let f = 1;
      if (l.flicker) {
        const t = time * 0.001 + l.phase;
        const n = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1) * 0.3 + Math.sin(t * 2.1) * 0.2;
        f = 1 - l.flicker * (0.5 + 0.5 * n);
      }
      const lvl = (l.intensity ?? 1) * l.level * f;
      if (l.glowSprite) {
        l.glowSprite.setPosition(Math.round(l.x), Math.round(l.y)).setAlpha((l.glow ?? 0) * lvl);
      }
      if (lvl <= 0.01) continue;
      if (l.x < view.x - margin || l.x > view.right + margin || l.y < view.y - margin || l.y > view.bottom + margin) continue;
      const rr = (l.radius * (0.97 + 0.03 * f)) / RES;
      const baked = this.pickBaked(rr);
      this.rt.stamp(bakeLight(this.scene, baked), undefined, Math.round(l.x / RES), Math.round(l.y / RES), {
        tint: l.color,
        alpha: Math.min(1, lvl),
        scale: rr / baked,
        blendMode: Phaser.BlendModes.ADD,
      });
    }
  }

  destroy() {
    for (const l of this.lights.values()) l.glowSprite?.destroy();
    this.lights.clear();
    this.rt.destroy();
  }
}
