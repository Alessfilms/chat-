import Phaser from 'phaser';
import { bus, EV } from './EventBus';

/**
 * Entrada unificada para o modo exploração: teclado (setas/WASD, E/Espaço/Z)
 * + d-pad virtual da UI (via EventBus). Expõe um vetor de direção normalizado.
 */
export class InputController {
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private touch = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,E,SPACE,Z,ENTER') as Record<string, Phaser.Input.Keyboard.Key>;
      for (const k of ['E', 'SPACE', 'Z', 'ENTER']) this.keys[k].on('down', () => bus.emit(EV.INPUT_ACTION));
    }
    bus.on(EV.INPUT_DIR, this.onDir, this);
  }

  private onDir(v: { x: number; y: number }) {
    this.touch = v;
  }

  get vector(): { x: number; y: number } {
    let x = this.touch.x, y = this.touch.y;
    const k = this.keys;
    if (k) {
      if (k.LEFT.isDown || k.A.isDown) x = -1;
      if (k.RIGHT.isDown || k.D.isDown) x = 1;
      if (k.UP.isDown || k.W.isDown) y = -1;
      if (k.DOWN.isDown || k.S.isDown) y = 1;
    }
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }

  destroy() {
    bus.off(EV.INPUT_DIR, this.onDir, this);
    if (this.keys) for (const k of Object.values(this.keys)) k.removeAllListeners();
  }
}
