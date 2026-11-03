/**
 * Efeitos sonoros sintetizados (WebAudio) — leves e discretos para ficarem
 * por baixo da narração. Nenhum arquivo extra: estalos da fogueira, sino de
 * chegada, zumbido da máquina e "whoosh" de evolução do mundo.
 *
 * Para usar arquivos próprios, troque as funções por `new Audio('...')`.
 */
class SfxEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private crackleTimer?: number;
  private machineNodes?: { osc: OscillatorNode; lfo: OscillatorNode; gain: GainNode };
  private lastChime = 0;
  muted = false;
  level = 0.5;

  /** Precisa ser chamado depois de um gesto do usuário. */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.level;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.level;
  }

  private noiseBurst(dur: number, gain: number, freq: number) {
    const ctx = this.ctx!, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master!);
    src.start();
  }

  fireCrackle(on: boolean) {
    if (!this.ctx) return;
    if (!on) { clearTimeout(this.crackleTimer); this.crackleTimer = undefined; return; }
    if (this.crackleTimer) return;
    const tick = () => {
      if (Math.random() < 0.7) this.noiseBurst(0.03 + Math.random() * 0.05, 0.05 + Math.random() * 0.07, 1500 + Math.random() * 2500);
      if (Math.random() < 0.15) this.noiseBurst(0.4, 0.015, 300);
      this.crackleTimer = window.setTimeout(tick, 60 + Math.random() * 260);
    };
    tick();
  }

  chime(pitch = 1) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastChime < 0.09) return;
    this.lastChime = now;
    for (const [mul, vol] of [[1, 0.06], [1.5, 0.03]] as const) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.value = 660 * pitch * mul;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o.connect(g).connect(this.master!);
      o.start(now); o.stop(now + 0.26);
    }
  }

  whoosh() {
    if (!this.ctx) return;
    this.noiseBurst(1.2, 0.12, 500);
  }

  machine(on: boolean) {
    if (!this.ctx) return;
    if (!on) {
      if (this.machineNodes) { this.machineNodes.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); const n = this.machineNodes; setTimeout(() => { n.osc.stop(); n.lfo.stop(); }, 800); }
      this.machineNodes = undefined;
      return;
    }
    if (this.machineNodes) return;
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 6;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 8;
    lfo.connect(lfoGain).connect(osc.frequency);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const gain = this.ctx.createGain(); gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.4);
    osc.connect(f).connect(gain).connect(this.master!);
    osc.start(); lfo.start();
    this.machineNodes = { osc, lfo, gain };
  }

  typeTick() {
    if (!this.ctx) return;
    this.noiseBurst(0.015, 0.04, 3200);
  }

  stopAll() {
    this.fireCrackle(false);
    this.machine(false);
  }
}

export const sfx = new SfxEngine();
