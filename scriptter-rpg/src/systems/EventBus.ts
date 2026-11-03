import Phaser from 'phaser';

/**
 * Barramento de eventos global. O mundo (EpisodeScene) e a interface (UIScene)
 * conversam só por aqui, e a ponte social também publica aqui.
 */
export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  // social / população
  HISTORIANS_TARGET: 'historians:target', // (count:number, opts) pedido de nova contagem
  HISTORIANS_COUNT: 'historians:count', // (count:number) valor exibido mudou
  HISTORIAN_ARRIVED: 'historian:arrived', // (index:number, user?:string)
  STORY_SUBMITTED: 'story:submitted', // ({user, text})
  STAGE_CHANGED: 'world:stage', // (stage: StageDef, instant:boolean)

  // UI
  UI_CAPTION: 'ui:caption', // ({text, duration, style})
  UI_CAPTION_HIDE: 'ui:caption:hide',
  UI_DIALOGUE: 'ui:dialogue', // ({speaker, text, duration?})
  UI_DIALOGUE_HIDE: 'ui:dialogue:hide',
  UI_TOAST: 'ui:toast', // ({text, icon?})
  UI_COUNTER: 'ui:counter', // ({visible:boolean})
  UI_EPISODE_TAG: 'ui:episode', // ({visible:boolean})
  UI_TITLE_CARD: 'ui:titlecard', // ({title, subtitle, duration})
  UI_LETTERBOX: 'ui:letterbox', // ({on:boolean, duration})
  UI_FADE: 'ui:fade', // ({to:number, duration, color})
  UI_SCROLL: 'ui:scroll', // ({title, text, user?})
  UI_SCROLL_HIDE: 'ui:scroll:hide',
  UI_END_CARD: 'ui:endcard', // ({text, cta})
  UI_MODE: 'ui:mode', // (mode)
  UI_STAGE_BANNER: 'ui:stage', // ({label})
  UI_DEBUG_TIME: 'ui:debugtime', // (t, next)
  UI_PROMPT: 'ui:prompt', // (text | null) — dica "A: CONVERSAR"

  // entrada
  INPUT_ACTION: 'input:action',
  INPUT_DIR: 'input:dir', // ({x,y})
  INPUT_SKIP: 'input:skip',

  // controle do episódio
  EPISODE_ENDED: 'episode:ended',
  REQUEST_RESTART: 'episode:restart', // ({mode, startAt?, episodeId?})
} as const;
