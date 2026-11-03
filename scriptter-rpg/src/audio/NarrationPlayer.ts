/**
 * Player da narração externa (narration.mp3) e relógio mestre da timeline.
 *
 * A timeline lê `time` a cada quadro. Se houver áudio, o tempo vem do próprio
 * elemento de áudio (currentTime) — então a animação nunca "escorrega" da voz,
 * mesmo se o navegador engasgar. Sem áudio, um relógio interno assume.
 */
export class NarrationPlayer {
  private audio?: HTMLAudioElement;
  private clockStart = 0;
  private clockOffset = 0;
  private paused = true;
  private hasAudio = false;
  duration = 0;
  volume = 1;

  private primed?: { url: string; el: HTMLAudioElement };
  private loadedUrl?: string;

  /**
   * Deve ser chamado DENTRO de um gesto do usuário (toque/clique): cria o
   * elemento de áudio e o "destrava" (play + pause), contornando o bloqueio
   * de autoplay do iOS/Chrome. O load() seguinte reaproveita este elemento.
   */
  prime(url: string) {
    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.muted = true;
    el.play().then(() => { el.pause(); el.currentTime = 0; el.muted = false; }).catch(() => { el.muted = false; });
    this.primed = { url, el };
  }

  /** Tenta carregar o áudio. Resolve `true` se ficou pronto para tocar. */
  async load(url: string | undefined, timeoutMs = 6000): Promise<boolean> {
    if (!url) { this.hasAudio = false; return false; }
    // mesma narração já carregada (ex.: reinício/seek): reaproveita o elemento já destravado
    if (this.audio && this.loadedUrl === url) { this.hasAudio = true; return true; }
    let a: HTMLAudioElement;
    if (this.primed && this.primed.url === url) { a = this.primed.el; this.primed = undefined; }
    else { a = new Audio(); a.preload = 'auto'; a.src = url; }
    if (a.readyState >= 3) {
      this.loadedUrl = url;
      this.audio = a; this.hasAudio = true; this.duration = isFinite(a.duration) ? a.duration : 0;
      return true;
    }
    const ok = await new Promise<boolean>((resolve) => {
      const done = (v: boolean) => { clearTimeout(to); a.oncanplaythrough = null; a.onerror = null; resolve(v); };
      const to = setTimeout(() => done(a.readyState >= 2), timeoutMs);
      a.oncanplaythrough = () => done(true);
      a.onerror = () => done(false);
      if (a.readyState === 0) a.load();
    });
    if (ok) {
      this.loadedUrl = url;
      this.audio = a;
      this.hasAudio = true;
      this.duration = isFinite(a.duration) ? a.duration : 0;
    }
    return ok;
  }

  get usingAudio() { return this.hasAudio; }

  async play(from = 0): Promise<void> {
    this.paused = false;
    if (this.audio) {
      this.audio.currentTime = from;
      this.audio.volume = this.volume;
      try { await this.audio.play(); }
      catch { this.hasAudio = false; this.startClock(from); }
    } else this.startClock(from);
  }

  private startClock(from: number) {
    this.clockOffset = from;
    this.clockStart = performance.now();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    if (this.hasAudio && this.audio) this.audio.pause();
    else this.clockOffset = this.time;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.hasAudio && this.audio) void this.audio.play();
    else this.clockStart = performance.now();
  }

  toggle() { this.paused ? this.resume() : this.pause(); }

  get isPaused() { return this.paused; }

  get time(): number {
    if (this.hasAudio && this.audio) return this.audio.currentTime;
    if (this.paused) return this.clockOffset;
    return this.clockOffset + (performance.now() - this.clockStart) / 1000;
  }

  get ended(): boolean {
    if (this.hasAudio && this.audio) return this.audio.ended;
    return this.duration > 0 && this.time >= this.duration;
  }

  /** Para a reprodução (mantém o elemento carregado para reaproveitar). */
  stop() {
    this.paused = true;
    this.audio?.pause();
    this.clockOffset = 0;
  }
}

/** Converte 12, "12", "00:12", "1:02.5" em segundos. */
export function parseTime(t: number | string): number {
  if (typeof t === 'number') return t;
  const parts = t.trim().split(':').map(Number);
  return parts.reduce((acc, v) => acc * 60 + v, 0);
}

/** Instância única: o TitleScene destrava, o EpisodeScene usa. */
export const narration = new NarrationPlayer();
