import Phaser from 'phaser';
import { DEBUG, DEPTH } from '../config';
import { getMap } from '../data/maps';
import { PROTAGONISTS } from '../data/characters';
import { STAGES, stageFor } from '../data/stages';
import type { DialogueLine, EpisodeManifest, MapDef, TimelineDef, Vec } from '../data/types';
import { LightingSystem } from '../systems/LightingSystem';
import { CameraDirector } from '../systems/CameraDirector';
import { AmbientSystem } from '../systems/AmbientSystem';
import { CrowdSystem } from '../systems/CrowdSystem';
import { WorldBuilder, type Collider } from '../systems/WorldBuilder';
import { WorldEvolution } from '../systems/WorldEvolution';
import { TimelineSystem } from '../systems/timeline/TimelineSystem';
import type { Director } from '../systems/timeline/Director';
import { InputController } from '../systems/InputController';
import { bus, EV } from '../systems/EventBus';
import { social } from '../systems/social';
import { Campfire } from '../entities/Campfire';
import { ScriptterMachine } from '../entities/ScriptterMachine';
import { Character } from '../entities/Character';
import { narration } from '../audio/NarrationPlayer';
import { sfx } from '../audio/Sfx';
import type { Dir } from '../assets/characters';

export interface EpisodeData {
  episodeId: string;
  mode: 'story' | 'explore';
  startAt?: number;
}

/**
 * Cena do mundo. Monta mapa + sistemas, implementa o Director usado pela
 * timeline e roda os dois modos:
 *
 *   STORY   — a narração toca e a timeline.json comanda tudo
 *   EXPLORE — o jogador controla o HISTORIADOR 001 e explora a clareira
 */
export class EpisodeScene extends Phaser.Scene implements Director {
  map!: MapDef;
  camera!: CameraDirector;
  lighting!: LightingSystem;
  ambient!: AmbientSystem;
  crowd!: CrowdSystem;
  world!: WorldBuilder;
  evolution!: WorldEvolution;
  fire!: Campfire;
  machine!: ScriptterMachine;
  heroes: Record<string, Character> = {};
  dialogues: Record<string, DialogueLine | DialogueLine[]> = {};
  historians = 0;

  private data0!: EpisodeData;
  private manifest!: EpisodeManifest;
  private timeline!: TimelineSystem;
  private mode: 'story' | 'explore' = 'story';
  private running = false;
  private ended = false;
  private input2?: InputController;
  private liveSocial = false;
  private fgLeaves: Phaser.GameObjects.Image[] = [];
  private storyQueue: { user?: string; text: string }[] = [];
  private storyBusy = false;
  private talkIndex: Record<string, number> = {};
  private colliders: Collider[] = [];
  private lastPromptKey = '';

  constructor() {
    super('Episode');
  }

  init(data: EpisodeData) {
    this.data0 = { startAt: 0, ...data, mode: data.mode ?? 'story' };
    this.mode = this.data0.mode;
    this.heroes = {};
    this.historians = 0;
    this.running = false;
    this.ended = false;
    this.liveSocial = false;
    this.fgLeaves = [];
    this.storyQueue = [];
    this.storyBusy = false;
    this.talkIndex = {};
  }

  preload() {
    const eps = (this.cache.json.get('episodes')?.episodes ?? []) as EpisodeManifest[];
    this.manifest = eps.find((e) => e.id === this.data0.episodeId) ?? eps[0];
    const base = `episodes/${this.manifest.id}/`;
    if (!this.cache.json.exists(`tl-${this.manifest.id}`)) this.load.json(`tl-${this.manifest.id}`, base + this.manifest.timeline);
    if (!this.cache.json.exists(`dlg-${this.manifest.id}`)) this.load.json(`dlg-${this.manifest.id}`, base + this.manifest.dialogues);
  }

  create() {
    const m = (this.map = getMap(this.manifest.map));
    const tl = this.cache.json.get(`tl-${this.manifest.id}`) as TimelineDef;
    this.dialogues = (this.cache.json.get(`dlg-${this.manifest.id}`) ?? {}) as Record<string, DialogueLine | DialogueLine[]>;

    // --- mundo
    this.lighting = new LightingSystem(this, m.width, m.height);
    this.world = new WorldBuilder(this, m, this.lighting);
    this.world.build(STAGES[0].clearingRadius);
    this.ambient = new AmbientSystem(this, this.lighting, m.width, m.height);
    this.ambient.createTufts(this.world.tuftPoints);
    this.ambient.createFog();
    this.ambient.createFireflies(m.clearing.center, 26, 200);
    this.ambient.createFireflies(this.point('forestMid'), 12, 120, 9);
    const view = () => this.cameras.main.worldView;
    this.ambient.createParticles(view);
    this.ambient.createLeaves(view);
    this.ambient.setLeafRate(0);

    const fp = this.point('fire');
    this.fire = new Campfire(this, fp.x, fp.y, this.lighting);
    const mp = this.point('machine');
    this.machine = new ScriptterMachine(this, mp.x, mp.y, this.lighting);

    for (const p of PROTAGONISTS) {
      const a = this.point(p.id === 'A' ? 'heroA' : 'heroB');
      const c = new Character(this, a.x, a.y, p.key, p.label);
      c.anim('idle', p.id === 'A' ? 'right' : 'left');
      c.setAlpha(0);
      this.heroes[p.id] = c;
    }

    this.crowd = new CrowdSystem(this, fp);
    this.crowd.block(fp, 32);
    this.crowd.block(mp, 34);
    this.crowd.block(this.point('heroA'), 13);
    this.crowd.block(this.point('heroB'), 13);
    for (const pr of m.props) if (pr.type === 'log' || pr.type === 'crate') this.crowd.block({ x: pr.x, y: pr.y - 3 }, 16);
    this.evolution = new WorldEvolution(this, this.world, this.crowd, fp);
    this.evolution.setStage(stageFor(this.manifest.startHistorians ?? 0).id, true);

    this.createForegroundLeaves();

    this.camera = new CameraDirector(this, m.width, m.height);
    this.camera.jumpTo(fp.x, fp.y, 3);

    // --- UI
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.launch('UI', { manifest: this.manifest, mode: this.mode });
    this.scene.bringToTop('UI');

    // --- eventos
    this.listen();
    this.timeline = new TimelineSystem(tl, this, 0);

    // estado inicial do episódio
    if (this.manifest.startHistorians) this.setHistorians(this.manifest.startHistorians, 0, true);
    if (this.manifest.machine) this.machine.reveal(true);

    if (this.mode === 'explore') this.startExplore();
    else void this.startStory();
  }

  // ---------------------------------------------------------------- Director
  get phaser(): Phaser.Scene {
    return this;
  }

  point(p: unknown): Vec {
    if (typeof p === 'string') return this.map.anchors[p] ?? this.map.clearing.center;
    if (p && typeof p === 'object') {
      const o = p as { x?: number; y?: number; anchor?: string; dx?: number; dy?: number };
      const base = o.anchor ? this.map.anchors[o.anchor] ?? this.map.clearing.center : { x: o.x ?? 0, y: o.y ?? 0 };
      return { x: base.x + (o.dx ?? 0), y: base.y + (o.dy ?? 0) };
    }
    return this.map.clearing.center;
  }

  setHistorians(count: number, spreadMs: number, instant: boolean) {
    this.historians = Math.max(0, Math.round(count));
    this.crowd.setCount(this.historians, spreadMs, instant);
    bus.emit(EV.HISTORIANS_COUNT, this.historians, instant ? 0 : Math.max(600, spreadMs));
    this.evolution.updateForCount(this.historians, instant);
  }

  enableLiveSocial() {
    this.liveSocial = true;
    social.start();
    if (social.lastCount !== undefined && social.lastCount !== this.historians) this.onTarget(social.lastCount, { live: true });
  }

  setMode(mode: 'story' | 'explore') {
    if (mode === this.mode) return;
    if (mode === 'explore') { narration.stop(); this.startExplore(); }
  }

  // ---------------------------------------------------------------- fluxo
  private async startStory() {
    const url = this.manifest.audio ? `episodes/${this.manifest.id}/${this.manifest.audio}` : undefined;
    const ok = await narration.load(url);
    // garante que a UI já existe antes de disparar eventos (fade inicial, legendas...)
    await this.uiReady();
    if (!this.sys.isActive()) return;
    if (!ok && url) console.warn('[narração] não foi possível carregar', url, '— usando relógio interno');
    this.timeline = new TimelineSystem(this.cache.json.get(`tl-${this.manifest.id}`), this, narration.duration);
    narration.duration = this.timeline.duration;
    const start = this.data0.startAt ?? 0;
    if (start > 0) this.timeline.fastForward(start);
    else this.timeline.update(0);
    await narration.play(start);
    this.running = true;
  }

  private uiReady(): Promise<void> {
    const ui = this.scene.get('UI') as unknown as { ready?: boolean; events: Phaser.Events.EventEmitter };
    if (ui?.ready) return Promise.resolve();
    return new Promise((r) => ui.events.once(Phaser.Scenes.Events.CREATE, () => r()));
  }

  private startExplore() {
    this.mode = 'explore';
    this.timeline.fastForward(Number.POSITIVE_INFINITY);
    bus.emit(EV.UI_MODE, 'explore');
    bus.emit(EV.UI_FADE, { to: 0, duration: 400 });
    bus.emit(EV.UI_LETTERBOX, { on: false, duration: 0 });
    bus.emit(EV.UI_COUNTER, { visible: true });
    bus.emit(EV.UI_EPISODE_TAG, { visible: true });
    this.fgLeaves.forEach((l) => l.setAlpha(0));
    this.ambient.setLeafRate(0);
    if (this.fire.level < 1) this.fire.ignite(0, true);
    sfx.fireCrackle(true);
    for (const h of Object.values(this.heroes)) h.setVisible(true).setAlpha(1);
    const hero = this.heroes.A;
    hero.showName(false);
    hero.setPosition(this.point('heroA').x, this.point('heroA').y + 30);
    hero.anim('idle', 'up');
    this.heroes.B.anim('interact', 'left');
    this.camera.follow(hero, 0.1);
    this.camera.zoomTo(3, 800);
    this.input2 = new InputController(this);
    this.colliders = this.world.colliders;
    this.enableLiveSocial();
    this.running = true;
  }

  private listen() {
    const on = (ev: string, fn: (...a: any[]) => void) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      bus.on(ev, fn, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => bus.off(ev, fn, this));
    };
    on(EV.HISTORIANS_TARGET, (n: number | null, opts: { live?: boolean; arrival?: string }) => this.onTarget(n, opts));
    on(EV.HISTORIAN_ARRIVED, (_i: number, user: string | undefined, _slot: Vec, instant: boolean) => {
      if (instant) return;
      sfx.chime(1 + Math.random() * 0.3);
      if (Math.random() < 0.3) this.fire.burst(4);
      bus.emit(EV.UI_TOAST, { arrival: true, user });
    });
    on(EV.STORY_SUBMITTED, (s: { user?: string; text: string }) => {
      this.storyQueue.push(s);
      if (this.mode === 'explore' && this.machine.visible) this.nextStory();
      else bus.emit(EV.UI_TOAST, { text: 'NOVA HISTÓRIA ENTREGUE À SCRIPTTER', icon: 'icon-scroll' });
    });
    on(EV.REQUEST_RESTART, (d: Partial<EpisodeData>) => this.restart(d));
    on(EV.INPUT_ACTION, () => this.onAction());

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-SPACE', () => { if (this.mode === 'story') narration.toggle(); });
      kb.on('keydown-RIGHT', () => { if (this.mode === 'story' && DEBUG) this.restart({ startAt: this.timeline.neighbor(narration.time, 1) }); });
      kb.on('keydown-LEFT', () => { if (this.mode === 'story' && DEBUG) this.restart({ startAt: this.timeline.neighbor(narration.time, -1) }); });
      kb.on('keydown-R', () => this.restart({ startAt: 0 }));
      kb.on('keydown-X', () => { if (this.mode === 'story') this.setMode('explore'); });
      kb.on('keydown-ESC', () => this.toTitle());
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      narration.stop();
      sfx.stopAll();
      this.input2?.destroy();
      this.lighting.destroy();
    });
  }

  private onTarget(n: number | null, opts: { live?: boolean; arrival?: string } = {}) {
    if (opts.live && !this.liveSocial) return;
    if (n === null) {
      if (!this.liveSocial && this.mode !== 'explore') return;
      this.historians += 1;
      this.crowd.arrive(opts.arrival || undefined);
      bus.emit(EV.HISTORIANS_COUNT, this.historians, 600);
      this.evolution.updateForCount(this.historians);
      return;
    }
    const diff = n - this.historians;
    this.setHistorians(n, diff > 0 ? Math.min(8000, diff * 140) : 0, false);
  }

  restart(d: Partial<EpisodeData>) {
    narration.stop();
    // trocando de episódio por um toque: destrava o novo áudio ainda dentro do gesto
    const target = { ...this.data0, ...d };
    if (target.mode === 'story' && target.episodeId !== this.manifest.id) {
      const eps = (this.cache.json.get('episodes')?.episodes ?? []) as EpisodeManifest[];
      const ep = eps.find((e) => e.id === target.episodeId);
      if (ep?.audio) narration.prime(`episodes/${ep.id}/${ep.audio}`);
    }
    this.scene.restart({ ...this.data0, ...d });
  }

  toTitle() {
    narration.stop();
    this.scene.stop('UI');
    this.scene.start('Title');
  }

  // ---------------------------------------------------------------- explore
  private nearest(): { key: string; prompt: string; x: number; y: number } | null {
    const h = this.heroes.A;
    const cand: { key: string; prompt: string; x: number; y: number }[] = [
      { key: 'B', prompt: 'A: CONVERSAR', x: this.heroes.B.x, y: this.heroes.B.y },
      { key: 'fire', prompt: 'A: OLHAR A FOGUEIRA', x: this.fire.x, y: this.fire.y },
    ];
    if (this.machine.visible) cand.push({ key: 'machine', prompt: 'A: USAR A SCRIPTTER', x: this.machine.x, y: this.machine.y });
    for (const p of this.map.props) if (p.type === 'signpost') cand.push({ key: 'sign', prompt: 'A: LER', x: p.x, y: p.y });
    let best = null, bd = 30;
    for (const c of cand) {
      const d = Math.hypot(c.x - h.x, c.y - h.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (!best && this.historians > 2) {
      const m = this.crowd.nearestMember(h.x, h.y, 18);
      if (m) best = { key: `crowd:${m.index}`, prompt: 'A: CONVERSAR', x: m.slot.x, y: m.slot.y };
    }
    return best;
  }

  private lineFrom(key: string): DialogueLine | undefined {
    const l = this.dialogues[key];
    if (!l) return undefined;
    if (!Array.isArray(l)) return l;
    const i = this.talkIndex[key] ?? 0;
    this.talkIndex[key] = (i + 1) % l.length;
    return l[i];
  }

  private onAction() {
    if (this.mode !== 'explore') return;
    const ui = this.scene.get('UI') as unknown as { dialogueOpen(): boolean; advanceDialogue(): void; scrollOpen(): boolean; closeScroll(): void };
    if (ui.scrollOpen()) { ui.closeScroll(); this.machine.retractPaper(); this.storyBusy = false; return; }
    if (ui.dialogueOpen()) { ui.advanceDialogue(); return; }
    const t = this.nearest();
    if (!t) return;
    const h = this.heroes.A;
    const dx = t.x - h.x, dy = t.y - h.y;
    h.anim('interact', (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down') as Dir);
    this.time.delayedCall(500, () => { if (h.state2 === 'interact') h.anim('idle'); });
    if (t.key === 'machine') {
      if (!this.storyQueue.length) {
        const sample = this.lineFrom('stories');
        if (sample) this.storyQueue.push({ text: sample.text, user: sample.speaker || undefined });
      }
      this.nextStory();
      return;
    }
    let line: DialogueLine | undefined;
    if (t.key === 'B') { line = this.lineFrom('explore_B'); this.heroes.B.face(dx > 0 ? 'left' : 'right'); }
    else if (t.key === 'fire') line = this.lineFrom('explore_fire');
    else if (t.key === 'sign') line = this.lineFrom('explore_sign');
    else if (t.key.startsWith('crowd:')) {
      const idx = Number(t.key.split(':')[1]);
      const l = this.lineFrom('explore_crowd');
      if (l) line = { speaker: `HISTORIADOR ${String(idx + 3).padStart(3, '0')}`, text: l.text };
    }
    if (line) bus.emit(EV.UI_DIALOGUE, { speaker: line.speaker, text: line.text });
  }

  private nextStory() {
    if (this.storyBusy || !this.storyQueue.length) return;
    const s = this.storyQueue.shift()!;
    this.storyBusy = true;
    if (!this.machine.active) { this.machine.activate(); sfx.machine(true); }
    void this.machine.print().then(() => bus.emit(EV.UI_SCROLL, { title: 'UMA NOVA HISTÓRIA', text: s.text, user: s.user }));
  }

  private moveHero(delta: number) {
    const h = this.heroes.A;
    const v = this.input2!.vector;
    const ui = this.scene.get('UI') as unknown as { dialogueOpen(): boolean; scrollOpen(): boolean };
    if (ui.dialogueOpen() || ui.scrollOpen()) { if (h.state2 === 'walk') h.anim('idle'); return; }
    const speed = 62;
    if (v.x === 0 && v.y === 0) {
      if (h.state2 === 'walk') h.anim('idle');
    } else {
      const dir: Dir = Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? 'left' : 'right') : v.y < 0 ? 'up' : 'down';
      h.anim('walk', dir);
      let nx = h.x + v.x * speed * (delta / 1000);
      let ny = h.y + v.y * speed * (delta / 1000);
      // colisão por círculos (árvores, adereços, fogueira, máquina, multidão)
      const solids: Collider[] = [...this.colliders, { x: this.fire.x, y: this.fire.y, r: 16 }, { x: this.heroes.B.x, y: this.heroes.B.y, r: 7 }];
      if (this.machine.visible) solids.push({ x: this.machine.x, y: this.machine.y - 2, r: 22 });
      for (const c of solids.concat(this.crowd.colliders(nx, ny, 40))) {
        const dx = nx - c.x, dy = ny - c.y;
        const d = Math.hypot(dx, dy), min = c.r + 5;
        if (d < min && d > 0.001) { nx = c.x + (dx / d) * min; ny = c.y + (dy / d) * min; }
      }
      h.setPosition(Phaser.Math.Clamp(nx, 8, this.map.width - 8), Phaser.Math.Clamp(ny, 20, this.map.height - 4));
    }
    const t = this.nearest();
    const key = t ? t.prompt : '';
    if (key !== this.lastPromptKey) { this.lastPromptKey = key; bus.emit(EV.UI_PROMPT, key || null); }
  }

  // ---------------------------------------------------------------- visual
  private createForegroundLeaves() {
    // galhos escuros em primeiro plano ao longo da trilha (parallax 1.35x)
    const path = this.map.paths[0]?.points ?? [];
    let k = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      for (let t = 0; t < 1; t += 0.5) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (Math.hypot(x - this.map.clearing.center.x, y - this.map.clearing.center.y) < 200) continue;
        const side = k % 2 ? 1 : -1;
        const img = this.add.image(x + side * 78, y, `fg-leaves-${k % 3}`).setScrollFactor(1.35).setDepth(DEPTH.foreground).setFlipX(side > 0).setAlpha(0);
        this.fgLeaves.push(img);
        k++;
      }
    }
  }

  setForeground(alpha: number, duration: number) {
    if (duration <= 0) this.fgLeaves.forEach((l) => l.setAlpha(alpha));
    else this.tweens.add({ targets: this.fgLeaves, alpha, duration });
  }

  update(time: number, delta: number) {
    const view = this.cameras.main.worldView;
    if (this.mode === 'story' && this.running && !this.ended) {
      const t = narration.time;
      this.timeline.update(t);
      if (DEBUG) bus.emit(EV.UI_DEBUG_TIME, t, this.timeline.next);
      if (narration.ended || t >= this.timeline.duration) {
        this.ended = true;
        bus.emit(EV.EPISODE_ENDED, this.manifest);
      }
    }
    if (this.mode === 'explore' && this.input2) this.moveHero(delta);
    this.camera.update(time, delta);
    this.crowd.update(time, delta);
    this.ambient.update(time, view);
    this.lighting.update(time, view);
  }
}
