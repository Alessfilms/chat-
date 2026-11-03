import type { Dir, AnimName } from '../../assets/characters';
import type { DialogueLine } from '../../data/types';
import { CameraDirector } from '../CameraDirector';
import { bus, EV } from '../EventBus';
import { sfx } from '../../audio/Sfx';
import type { Director } from './Director';

/**
 * Catálogo de ações da timeline.json.
 *
 * Cada ação recebe (director, params, instant). `instant = true` quando o
 * motor está "pulando" para um ponto da timeline (seek / modo exploração):
 * a ação deve aplicar só o estado final, sem tween, e efeitos passageiros
 * (legenda, diálogo, notificação) são ignorados.
 *
 * Para criar uma ação nova: adicione uma entrada aqui e use no JSON.
 */
type Params = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Action = (d: Director, p: Params, instant: boolean) => void;

const ms = (s: unknown, def = 1) => Math.round((typeof s === 'number' ? s : def) * 1000);

function heroList(d: Director, ids: unknown): string[] {
  if (!ids || ids === 'all') return Object.keys(d.heroes);
  return (Array.isArray(ids) ? ids : [ids]).map(String);
}

function resolveLine(d: Director, p: Params): DialogueLine | undefined {
  if (p.line) {
    const l = d.dialogues[p.line];
    if (Array.isArray(l)) return l[p.index ?? 0];
    return l;
  }
  if (p.text) return { speaker: p.speaker ?? '', text: p.text };
  return undefined;
}

export const ACTIONS: Record<string, Action> = {
  // ---------------------------------------------------------------- câmera
  camera(d, p, instant) {
    const pt = d.point(p.to ?? d.camera.center);
    const zoom = p.zoom ?? d.camera.zoom;
    void d.camera.moveTo(pt.x + (p.dx ?? 0), pt.y + (p.dy ?? 0), zoom, instant ? 0 : ms(p.duration, 2), p.ease ?? 'Sine.easeInOut');
  },
  cameraJump(d, p) {
    const pt = d.point(p.to);
    d.camera.jumpTo(pt.x + (p.dx ?? 0), pt.y + (p.dy ?? 0), p.zoom ?? d.camera.zoom);
  },
  /** Enquadra a multidão para `count` (ou a contagem atual). */
  cameraFit(d, p, instant) {
    const c = d.point(p.to ?? 'fire');
    const r = d.crowd.radiusFor(p.count ?? d.historians);
    const z = p.zoom ?? CameraDirector.zoomForRadius(r);
    void d.camera.moveTo(c.x, c.y + (p.dy ?? 0), z, instant ? 0 : ms(p.duration, 3), p.ease ?? 'Sine.easeInOut');
  },
  cameraShake(d, p, instant) {
    if (!instant) d.camera.shake(p.intensity ?? 0.004, ms(p.duration, 0.3));
  },
  cameraFollow(d, p) {
    const h = d.heroes[p.target ?? 'A'];
    if (h) d.camera.follow(h, p.lerp ?? 0.1);
  },
  cameraBreathe(d, p) {
    d.camera.breathe = p.amount ?? 1.5;
  },

  // ------------------------------------------------------------- tela / ui
  fade(_d, p, instant) {
    bus.emit(EV.UI_FADE, { to: p.to ?? 0, duration: instant ? 0 : ms(p.duration, 1), color: p.color ?? '#07090f' });
  },
  letterbox(_d, p, instant) {
    bus.emit(EV.UI_LETTERBOX, { on: p.on ?? true, duration: instant ? 0 : ms(p.duration, 0.8) });
  },
  caption(_d, p, instant) {
    if (instant) return;
    bus.emit(EV.UI_CAPTION, { text: p.text, duration: ms(p.duration, 4), position: p.position ?? 'center', size: p.size ?? 2 });
  },
  hideCaption(_d, _p, instant) {
    bus.emit(EV.UI_CAPTION_HIDE, instant);
  },
  dialogue(d, p, instant) {
    if (instant) return;
    const line = resolveLine(d, p);
    if (!line) return;
    bus.emit(EV.UI_DIALOGUE, { speaker: line.speaker, text: line.text, duration: p.duration ? ms(p.duration) : undefined });
    // quem fala faz a animação "interact" (params.who = "A" | "B")
    if (p.who && d.heroes[p.who]) d.heroes[p.who].interact(ms(p.duration, 2));
  },
  hideDialogue(_d, _p) {
    bus.emit(EV.UI_DIALOGUE_HIDE);
  },
  titleCard(_d, p, instant) {
    if (instant) return;
    bus.emit(EV.UI_TITLE_CARD, { title: p.title, subtitle: p.subtitle, duration: ms(p.duration, 3.5) });
  },
  counter(_d, p) {
    bus.emit(EV.UI_COUNTER, { visible: p.visible ?? true });
  },
  episodeTag(_d, p) {
    bus.emit(EV.UI_EPISODE_TAG, { visible: p.visible ?? true });
  },
  toast(_d, p, instant) {
    if (!instant) bus.emit(EV.UI_TOAST, { text: p.text, icon: p.icon });
  },
  endCard(_d, p, instant) {
    if (!instant) bus.emit(EV.UI_END_CARD, { text: p.text, cta: p.cta });
  },

  // -------------------------------------------------------------- mundo
  igniteFire(d, p, instant) {
    d.fire.ignite(ms(p.duration, 1.5), instant);
    sfx.fireCrackle(true);
  },
  fireBurst(d, p, instant) {
    if (!instant) d.fire.burst(p.count ?? 20);
  },
  ambient(d, p, instant) {
    const dur = instant ? 0 : ms(p.duration, 2);
    const set = (obj: object, key: string, v: number | undefined) => {
      if (v === undefined) return;
      if (dur) d.phaser.tweens.add({ targets: obj, [key]: v, duration: dur });
      else (obj as Record<string, number>)[key] = v;
    };
    set(d.ambient, 'fogLevel', p.fog);
    set(d.ambient, 'fireflyLevel', p.fireflies);
    set(d.lighting, 'ambientLevel', p.daylight);
    if (p.leaves !== undefined) d.ambient.setLeafRate(p.leaves);
    if (p.foreground !== undefined) d.setForeground(p.foreground, dur);
  },
  stage(d, p, instant) {
    d.evolution.setStage(p.id, instant);
    if (!instant) sfx.whoosh();
  },

  // -------------------------------------------------------- personagens
  showCharacters(d, p, instant) {
    for (const id of heroList(d, p.ids)) {
      const h = d.heroes[id];
      if (!h) continue;
      h.setVisible(true);
      if (instant) { h.setAlpha(1); continue; }
      h.setAlpha(0);
      d.phaser.tweens.add({ targets: h, alpha: 1, duration: ms(p.duration, 1.2), ease: 'Stepped', easeParams: [5], delay: (p.stagger ?? 0.35) * 1000 * heroList(d, p.ids).indexOf(id) });
    }
  },
  hideCharacters(d, p) {
    for (const id of heroList(d, p.ids)) d.heroes[id]?.setVisible(false);
  },
  showNames(d, p) {
    for (const id of heroList(d, p.ids)) d.heroes[id]?.showName(p.visible ?? true);
  },
  anim(d, p) {
    for (const id of heroList(d, p.target)) d.heroes[id]?.anim((p.anim ?? 'idle') as AnimName, (p.dir ?? d.heroes[id].dir) as Dir, true);
  },
  face(d, p) {
    for (const id of heroList(d, p.target)) d.heroes[id]?.face(p.dir as Dir);
  },
  walk(d, p, instant) {
    const h = d.heroes[p.target];
    if (!h) return;
    const pt = d.point(p.to);
    if (instant) { h.setPosition(pt.x, pt.y); h.anim((p.then ?? 'idle') as AnimName, (p.dir ?? h.dir) as Dir); return; }
    void h.walkTo(pt.x, pt.y, ms(p.duration, 2), (p.then ?? 'idle') as AnimName).then(() => { if (p.dir) h.face(p.dir as Dir); });
  },
  celebrate(d, p, instant) {
    if (instant) return;
    const t = p.target ?? 'all';
    if (t === 'crowd' || t === 'all') d.crowd.cheer(ms(p.duration, 2.2));
    if (t !== 'crowd') for (const id of heroList(d, t === 'all' ? undefined : t)) d.heroes[id]?.celebrate(ms(p.duration, 2.2));
  },

  // -------------------------------------------------------- historiadores
  /** Define a contagem de historiadores. `duration` espalha as chegadas. */
  historians(d, p, instant) {
    d.setHistorians(Number(p.count ?? 2), instant ? 0 : ms(p.duration, 4), instant);
  },
  /** Passa a usar a contagem real vinda da API / JSON (seguidores). */
  syncApi(d) {
    d.enableLiveSocial();
  },

  // ------------------------------------------------------------ máquina
  revealMachine(d, _p, instant) {
    d.machine.reveal(instant);
  },
  activateMachine(d, _p, instant) {
    d.machine.activate(instant);
    sfx.machine(true);
  },
  deactivateMachine(d) {
    d.machine.deactivate();
    sfx.machine(false);
  },
  /** O pergaminho sai da máquina e a história aparece na UI. */
  printStory(d, p, instant) {
    if (instant) return;
    void d.machine.print().then(() => bus.emit(EV.UI_SCROLL, { title: p.title ?? 'UMA NOVA HISTÓRIA', text: p.text ?? '', user: p.user }));
  },
  hideScroll(d) {
    bus.emit(EV.UI_SCROLL_HIDE);
    d.machine.retractPaper();
  },

  // ------------------------------------------------------------ áudio
  sfx(_d, p, instant) {
    if (instant) return;
    const n = p.name as string;
    if (n === 'chime') sfx.chime(p.pitch ?? 1);
    else if (n === 'whoosh') sfx.whoosh();
    else if (n === 'crackle') sfx.fireCrackle(p.on ?? true);
  },

  // ------------------------------------------------------------ fluxo
  mode(d, p) {
    d.setMode(p.mode === 'explore' ? 'explore' : 'story');
  },
  /** marcador sem efeito (útil para anotar a narração no JSON) */
  mark() {},
};
