import Phaser from 'phaser';
import { GAME_H, GAME_W, ZOOM_LEVELS } from '../config';
import type { Vec } from '../data/types';

/**
 * Diretor de câmera cinematográfica.
 *
 * - pan + zoom sincronizados num único tween (movimento "de grua")
 * - zoom sempre repousa em valor inteiro (3, 2, 1) → quadro parado pixel-perfect
 * - follow suave para o modo exploração
 * - shake leve, "respiração" lenta opcional
 */
export class CameraDirector {
  readonly cam: Phaser.Cameras.Scene2D.Camera;
  private state = { x: 0, y: 0, zoom: 3 };
  private tween?: Phaser.Tweens.Tween;
  private following?: Phaser.GameObjects.Components.Transform;
  private followLerp = 0.12;
  /** amplitude (px) de um balanço muito lento — dá vida à câmera parada */
  breathe = 0;

  constructor(private scene: Phaser.Scene, worldW: number, worldH: number) {
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, worldW, worldH);
    this.cam.setRoundPixels(true);
    this.cam.setBackgroundColor('#07090f');
  }

  get zoom() { return this.state.zoom; }
  get center(): Vec { return { x: this.state.x, y: this.state.y }; }

  jumpTo(x: number, y: number, zoom = this.state.zoom) {
    this.tween?.stop();
    this.following = undefined;
    this.state.x = x; this.state.y = y; this.state.zoom = zoom;
    this.apply();
  }

  /** Move e/ou dá zoom ao mesmo tempo. Retorna Promise que resolve ao terminar. */
  moveTo(x: number, y: number, zoom: number, duration: number, ease = 'Sine.easeInOut'): Promise<void> {
    this.tween?.stop();
    this.following = undefined;
    if (duration <= 0) { this.jumpTo(x, y, zoom); return Promise.resolve(); }
    return new Promise((resolve) => {
      this.tween = this.scene.tweens.add({
        targets: this.state, x, y, zoom, duration, ease,
        onComplete: () => resolve(),
        onStop: () => resolve(),
      });
    });
  }

  zoomTo(zoom: number, duration: number, ease = 'Sine.easeInOut') {
    return this.moveTo(this.state.x, this.state.y, zoom, duration, ease);
  }

  follow(target: Phaser.GameObjects.Components.Transform, lerp = 0.12) {
    this.tween?.stop();
    this.following = target;
    this.followLerp = lerp;
  }

  stopFollow() { this.following = undefined; }

  shake(intensity = 0.004, duration = 300) {
    this.cam.shake(duration, intensity);
  }

  /** Maior zoom inteiro que ainda enquadra um raio em volta do centro. */
  static zoomForRadius(radius: number): number {
    for (const z of ZOOM_LEVELS) if ((GAME_W / 2) / z >= radius && (GAME_H / 2) / z >= radius * 0.9) return z;
    return ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  }

  update(time: number, delta: number) {
    if (this.following) {
      const k = 1 - Math.pow(1 - this.followLerp, delta / 16.67);
      this.state.x += (this.following.x - this.state.x) * k;
      this.state.y += (this.following.y - 8 - this.state.y) * k;
    }
    this.apply(time);
  }

  private apply(time = 0) {
    // zoom em degraus de 1/16 durante transições; inteiro quando parado
    const z = Math.abs(this.state.zoom - Math.round(this.state.zoom)) < 0.01 ? Math.round(this.state.zoom) : Math.round(this.state.zoom * 16) / 16;
    this.cam.setZoom(z);
    const bx = this.breathe ? Math.sin(time * 0.00031) * this.breathe : 0;
    const by = this.breathe ? Math.sin(time * 0.00023 + 1) * this.breathe * 0.6 : 0;
    this.cam.centerOn(this.state.x + bx, this.state.y + by);
  }
}
