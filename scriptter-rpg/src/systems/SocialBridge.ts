import { SOCIAL } from '../data/social';
import type { SocialSnapshot } from '../data/types';
import { bus, EV } from './EventBus';

/**
 * Ponte entre o Instagram (ou qualquer fonte) e o universo do Scriptter.
 *
 *   FOLLOW      → um novo historiador chega à clareira
 *   COMENTÁRIO  → uma nova história é entregue à Scriptter (pergaminho)
 *   META        → o mundo evolui (clareira → casas → vila → cidade → reino)
 *
 * Três formas de alimentar o jogo:
 *
 * 1) JSON/API por polling (?live=1 ou ?api=URL). Formato:
 *      { "historianCount": 742,
 *        "comments": [{ "user": "ana", "text": "Era uma vez..." }],
 *        "events":   [{ "type": "follow", "user": "joao" }] }
 *
 * 2) JavaScript na página (ex.: um widget ou OBS):
 *      window.scriptter.setHistorianCount(742)
 *      window.scriptter.follow('joao')
 *      window.scriptter.comment('ana', 'Era uma vez...')
 *
 * 3) postMessage de um iframe pai:
 *      iframe.contentWindow.postMessage({ type: 'scriptter:historianCount', value: 742 }, '*')
 */
export class SocialBridge {
  private timer?: number;
  private seenComments = new Set<string>();
  private seenEvents = new Set<string>();
  private started = false;
  lastCount?: number;

  constructor() {
    const api = {
      setHistorianCount: (n: number) => this.applyCount(Number(n)),
      follow: (user?: string) => bus.emit(EV.HISTORIANS_TARGET, null, { arrival: user ?? '' }),
      comment: (user: string, text: string) => bus.emit(EV.STORY_SUBMITTED, { user, text }),
      ingest: (snap: SocialSnapshot) => this.ingest(snap),
    };
    (window as unknown as { scriptter: typeof api }).scriptter = api;
    window.addEventListener('message', this.onMessage);
  }

  private onMessage = (e: MessageEvent) => {
    const d = e.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string') return;
    if (d.type === 'scriptter:historianCount') this.applyCount(Number(d.value));
    else if (d.type === 'scriptter:follow') bus.emit(EV.HISTORIANS_TARGET, null, { arrival: d.user ?? '' });
    else if (d.type === 'scriptter:comment') bus.emit(EV.STORY_SUBMITTED, { user: d.user, text: d.text });
    else if (d.type === 'scriptter:snapshot') this.ingest(d.value);
  };

  /** Começa o polling (chamado pela ação `syncApi` ou no modo exploração). */
  start() {
    if (this.started) return;
    this.started = true;
    if (SOCIAL.forcedCount !== undefined) this.applyCount(SOCIAL.forcedCount);
    if (!SOCIAL.live) return;
    const tick = async () => {
      try {
        const res = await fetch(SOCIAL.apiUrl, { cache: 'no-store' });
        if (res.ok) this.ingest((await res.json()) as SocialSnapshot);
      } catch (err) {
        console.warn('[social] falha ao buscar', SOCIAL.apiUrl, err);
      }
      this.timer = window.setTimeout(tick, SOCIAL.pollSeconds * 1000);
    };
    void tick();
  }

  ingest(snap: SocialSnapshot) {
    if (typeof snap.historianCount === 'number') this.applyCount(snap.historianCount);
    for (const c of snap.comments ?? []) {
      const k = `${c.user}|${c.text}`;
      if (this.seenComments.has(k)) continue;
      this.seenComments.add(k);
      // na primeira leitura só memoriza; depois, cada comentário novo vira história
      if (this.lastCount !== undefined) bus.emit(EV.STORY_SUBMITTED, c);
    }
    for (const ev of snap.events ?? []) {
      const k = JSON.stringify(ev);
      if (this.seenEvents.has(k)) continue;
      this.seenEvents.add(k);
      if (ev.type === 'follow') bus.emit(EV.HISTORIANS_TARGET, null, { arrival: ev.user ?? '' });
      if (ev.type === 'comment' && ev.text) bus.emit(EV.STORY_SUBMITTED, { user: ev.user, text: ev.text });
    }
  }

  private applyCount(n: number) {
    if (!isFinite(n) || n < 0) return;
    this.lastCount = n;
    bus.emit(EV.HISTORIANS_TARGET, n, { live: true });
  }

  stop() {
    clearTimeout(this.timer);
    this.started = false;
  }

  destroy() {
    this.stop();
    window.removeEventListener('message', this.onMessage);
  }
}
