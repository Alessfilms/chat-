import Phaser from 'phaser';
import { DEPTH } from '../config';
import { CHAR_H, CHAR_W, CROWD_VARIANTS } from '../assets/characters';
import type { Vec } from '../data/types';
import { bus, EV } from './EventBus';

/**
 * Multidão de historiadores, otimizada para centenas de personagens.
 *
 * - Quem já chegou é um Bob dentro de um Blitter (1 draw call por faixa).
 *   Os Blitters são divididos em faixas horizontais de 16px, cada uma com
 *   depth = Y da faixa, então a multidão se ordena corretamente com a
 *   fogueira, a máquina e os protagonistas.
 * - Quem está andando até o seu lugar usa um Sprite de um pool fixo (pooling).
 * - O número de sprites visíveis tem teto (maxVisible); acima disso o
 *   contador continua subindo e o mundo evolui, mas não criamos mais sprites.
 */
interface Member {
  index: number;
  variant: number;
  slot: Vec;
  bob?: Phaser.GameObjects.Bob;
  band?: number;
  phase: number;
  nextFlip: number;
  frame: 'idle0' | 'idle1' | 'cheer';
  cheerUntil: number;
  fade: number;
}

interface Walker {
  spr: Phaser.GameObjects.Image;
  member?: Member;
  from: Vec;
  t: number;
  dur: number;
  busy: boolean;
}

const BAND = 16;
const POOL = 48;

export class CrowdSystem {
  private bands = new Map<number, Phaser.GameObjects.Blitter>();
  private members: Member[] = [];
  private slots: Vec[] = [];
  private walkers: Walker[] = [];
  private queue: { index: number; instant: boolean; user?: string }[] = [];
  private spawnTimer = 0;
  private spawnInterval = 120;
  maxVisible = 220;
  /** áreas proibidas (máquina, protagonistas...) */
  private blocked: { c: Vec; r: number }[] = [];
  private rnd: () => number;

  constructor(private scene: Phaser.Scene, private center: Vec, seed = 7) {
    let s = seed;
    this.rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < POOL; i++) {
      const spr = scene.add.image(0, 0, 'crowd', 'v0-idle0').setOrigin(0.5, 18 / 20).setVisible(false);
      this.walkers.push({ spr, from: { x: 0, y: 0 }, t: 0, dur: 0, busy: false });
    }
  }

  block(c: Vec, r: number) {
    this.blocked.push({ c, r });
    this.slots = [];
  }

  get count() { return this.members.length; }

  /** Lugares em anéis concêntricos em volta da fogueira. */
  private ensureSlots(n: number) {
    if (this.slots.length >= n) return;
    this.slots = [];
    let r = 44;
    let ring = 0;
    while (this.slots.length < Math.max(n, 600)) {
      const cap = Math.floor((Math.PI * 2 * r) / 13);
      const off = (ring % 2) * 0.5;
      for (let i = 0; i < cap; i++) {
        const a = ((i + off) / cap) * Math.PI * 2 + ring * 0.13;
        const jx = (this.hash(ring * 999 + i) - 0.5) * 4;
        const jy = (this.hash(ring * 777 + i) - 0.5) * 4;
        const p = { x: Math.round(this.center.x + Math.cos(a) * r + jx), y: Math.round(this.center.y + 6 + Math.sin(a) * r * 0.82 + jy) };
        if (this.blocked.some((b) => Math.hypot(p.x - b.c.x, p.y - b.c.y) < b.r)) continue;
        this.slots.push(p);
      }
      r += 13;
      ring++;
    }
    // ordena para preencher primeiro os lugares mais próximos da fogueira
    this.slots.sort((a, b) => Math.hypot(a.x - this.center.x, (a.y - this.center.y) / 0.82) - Math.hypot(b.x - this.center.x, (b.y - this.center.y) / 0.82));
  }

  private hash(n: number) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Raio ocupado pela multidão (para a câmera enquadrar). */
  radiusFor(count: number): number {
    const n = Math.min(count, this.maxVisible);
    this.ensureSlots(n);
    if (n <= 0) return 30;
    const s = this.slots[Math.min(n, this.slots.length) - 1];
    return Math.max(30, Math.hypot(s.x - this.center.x, (s.y - this.center.y) / 0.82)) + 14;
  }

  /**
   * Ajusta a quantidade de historiadores visíveis.
   * @param spreadMs as chegadas são distribuídas ao longo desse tempo
   */
  setCount(target: number, spreadMs = 3000, instant = false) {
    const visibleTarget = Math.min(target, this.maxVisible);
    const pending = this.members.length + this.queue.length;
    if (visibleTarget < pending) {
      // remover (ex.: ao voltar a timeline)
      this.queue = this.queue.filter((q) => q.index < visibleTarget);
      while (this.members.length > visibleTarget) this.removeMember(this.members.pop()!);
      return;
    }
    const add = visibleTarget - pending;
    if (add <= 0) return;
    this.ensureSlots(visibleTarget);
    for (let i = 0; i < add; i++) this.queue.push({ index: pending + i, instant });
    this.spawnInterval = instant ? 0 : Math.max(16, spreadMs / add);
  }

  /** Chegada individual (ex.: seguidor real em tempo real). */
  arrive(user?: string) {
    if (this.members.length + this.queue.length >= this.maxVisible) return;
    this.ensureSlots(this.members.length + this.queue.length + 1);
    this.queue.push({ index: this.members.length + this.queue.length, instant: false, user });
  }

  /** Membro mais próximo (para conversar no modo exploração). */
  nearestMember(x: number, y: number, maxDist: number) {
    let best: Member | undefined, bd = maxDist;
    for (const m of this.members) {
      if (!m.bob) continue;
      const d = Math.hypot(m.slot.x - x, m.slot.y - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  /** Colisores dos historiadores já parados perto de (x,y). */
  colliders(x: number, y: number, range: number) {
    const out: { x: number; y: number; r: number }[] = [];
    for (const m of this.members) if (m.bob && Math.abs(m.slot.x - x) < range && Math.abs(m.slot.y - y) < range) out.push({ x: m.slot.x, y: m.slot.y - 1, r: 4 });
    return out;
  }

  cheer(duration = 2200) {
    const now = this.scene.time.now;
    this.members.forEach((m, i) => { m.cheerUntil = now + 150 + (i % 17) * 60 + duration; m.nextFlip = now + (i % 17) * 60; });
  }

  private bandFor(y: number) {
    const b = Math.floor(y / BAND);
    let bl = this.bands.get(b);
    if (!bl) {
      bl = this.scene.add.blitter(0, 0, 'crowd').setDepth(DEPTH.entities + b * BAND + BAND - 1);
      this.bands.set(b, bl);
    }
    return { b, bl };
  }

  private placeBob(m: Member, alpha = 1) {
    const { b, bl } = this.bandFor(m.slot.y);
    // Bob desenha pelo canto superior esquerdo; ajusta para os pés
    m.bob = bl.create(m.slot.x - CHAR_W / 2, m.slot.y - Math.round(CHAR_H * 0.9), `v${m.variant}-idle0`);
    m.bob.setAlpha(alpha);
    m.band = b;
    // ordena a faixa por Y (quem está mais embaixo desenha por cima)
    bl.children.list.sort((p, q) => p.y - q.y);
  }

  private removeMember(m: Member) {
    if (m.bob && m.band !== undefined) this.bands.get(m.band)?.children.remove(m.bob, true);
    for (const w of this.walkers) if (w.member === m) { w.busy = false; w.spr.setVisible(false); w.member = undefined; }
  }

  private spawn(index: number, instant: boolean, user?: string) {
    this.ensureSlots(index + 1);
    const slot = this.slots[index];
    const variant = Math.floor(this.hash(index * 31 + 5) * CROWD_VARIANTS);
    const m: Member = { index, variant, slot, phase: this.rnd() * 1000, nextFlip: 0, frame: 'idle0', cheerUntil: 0, fade: 1 };
    this.members.push(m);
    bus.emit(EV.HISTORIAN_ARRIVED, index, user, slot, instant);

    if (instant) { this.placeBob(m); return; }
    const w = this.walkers.find((x) => !x.busy);
    if (!w) {
      // pool cheio: surge no lugar com fade (sem caminhar)
      m.fade = 0;
      this.placeBob(m, 0);
      return;
    }
    const a = Math.atan2(slot.y - this.center.y, slot.x - this.center.x) + (this.rnd() - 0.5) * 0.5;
    const dist = 120 + this.rnd() * 60;
    w.from = { x: slot.x + Math.cos(a) * dist, y: slot.y + Math.sin(a) * dist * 0.82 };
    w.t = 0;
    w.dur = 1700 + Math.hypot(slot.x - w.from.x, slot.y - w.from.y) * 9;
    w.busy = true;
    w.member = m;
    w.spr.setVisible(true).setAlpha(0).setPosition(w.from.x, w.from.y);
  }

  update(time: number, delta: number) {
    // fila de chegadas
    if (this.queue.length) {
      this.spawnTimer -= delta;
      let guard = 0;
      while (this.queue.length && (this.spawnTimer <= 0 || this.queue[0].instant) && guard++ < 400) {
        const q = this.queue.shift()!;
        this.spawn(q.index, q.instant, q.user);
        this.spawnTimer += this.spawnInterval;
      }
      if (!this.queue.length) this.spawnTimer = 0;
    }

    // caminhantes
    for (const w of this.walkers) {
      if (!w.busy || !w.member) continue;
      w.t += delta;
      const m = w.member;
      const k = Math.min(1, w.t / w.dur);
      const x = w.from.x + (m.slot.x - w.from.x) * k;
      const y = w.from.y + (m.slot.y - w.from.y) * k;
      const dx = m.slot.x - w.from.x, dy = m.slot.y - w.from.y;
      const step = Math.floor(w.t / 130) % 2;
      let fr: string;
      let flip = false;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) { fr = step ? 'ws1' : 'ws0'; flip = dx > 0; }
      else fr = dy < 0 ? (step ? 'wu1' : 'wu0') : step ? 'wd1' : 'wd0';
      w.spr.setFrame(`v${m.variant}-${fr}`).setFlipX(flip).setPosition(Math.round(x), Math.round(y))
        .setDepth(DEPTH.entities + y).setAlpha(Math.min(1, w.t / 400));
      if (k >= 1) {
        w.busy = false;
        w.spr.setVisible(false);
        w.member = undefined;
        this.placeBob(m);
      }
    }

    // idle / comemoração (troca de quadro barata nos Bobs)
    for (const m of this.members) {
      if (!m.bob) continue;
      if (m.fade < 1) { m.fade = Math.min(1, m.fade + delta / 500); m.bob.setAlpha(m.fade); }
      if (time < m.nextFlip) continue;
      if (time < m.cheerUntil) {
        m.frame = m.frame === 'cheer' ? 'idle0' : 'cheer';
        m.nextFlip = time + 180;
      } else {
        m.frame = m.frame === 'idle0' ? 'idle1' : 'idle0';
        m.nextFlip = time + 420 + ((m.phase * 7) % 500);
      }
      m.bob.setFrame(`v${m.variant}-${m.frame}`);
    }
  }
}
