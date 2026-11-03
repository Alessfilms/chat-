import type { TimelineDef, TimelineEvent } from '../../data/types';
import { parseTime } from '../../audio/NarrationPlayer';
import { ACTIONS } from './actions';
import type { Director } from './Director';

/**
 * Motor da timeline sincronizada com a narração.
 *
 * A cada quadro recebe o tempo atual do áudio (segundos) e dispara, em ordem,
 * todos os eventos cujo `time` já passou. Para "pular" (seek), o EpisodeScene
 * reconstrói a cena e chama `fastForward(t)`, que aplica instantaneamente o
 * estado final de todos os eventos anteriores a `t`.
 */
export interface CompiledEvent extends TimelineEvent {
  t: number;
}

export class TimelineSystem {
  readonly events: CompiledEvent[];
  private cursor = 0;
  readonly duration: number;

  constructor(def: TimelineDef, private director: Director, audioDuration = 0) {
    this.events = def.events
      .map((e) => ({ ...e, t: parseTime(e.time) }))
      .sort((a, b) => a.t - b.t);
    const last = this.events.length ? this.events[this.events.length - 1].t + 4 : 10;
    this.duration = def.duration ?? (audioDuration || last);
  }

  private run(ev: CompiledEvent, instant: boolean) {
    const fn = ACTIONS[ev.action];
    if (!fn) {
      console.warn(`[timeline] ação desconhecida: "${ev.action}" em ${ev.t}s`);
      return;
    }
    try {
      fn(this.director, ev.params ?? {}, instant);
    } catch (err) {
      console.error(`[timeline] erro em "${ev.action}" @${ev.t}s`, err);
    }
  }

  /** Aplica tudo antes de `t` sem animação. */
  fastForward(t: number) {
    while (this.cursor < this.events.length && this.events[this.cursor].t < t) {
      this.run(this.events[this.cursor], true);
      this.cursor++;
    }
  }

  update(now: number) {
    while (this.cursor < this.events.length && this.events[this.cursor].t <= now) {
      this.run(this.events[this.cursor], false);
      this.cursor++;
    }
  }

  get next(): CompiledEvent | undefined {
    return this.events[this.cursor];
  }

  /** Tempo do evento anterior/seguinte (navegação no modo debug). */
  neighbor(now: number, dir: 1 | -1): number {
    if (dir > 0) return this.events.find((e) => e.t > now + 0.05)?.t ?? now;
    const prev = [...this.events].reverse().find((e) => e.t < now - 0.5);
    return prev?.t ?? 0;
  }
}
