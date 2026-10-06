/* Scriptter Motion System
 * Tokens centralizados + springs físicas convertidas em easing CSS `linear()`.
 * Todas as animações passam por Motion.animate(), que:
 *  - usa só transform/opacity/scale (compositor), salvo exceções documentadas;
 *  - é interrompível (parte do valor atual quando `fromCurrent`);
 *  - respeita Reduce Motion (vira crossfade curto).
 */
(function () {
  const T = {
    dur: {
      press: 140,      // feedback de toque
      fast: 140,       // microinterações
      normal: 240,     // trocas de estado
      slow: 420,       // entradas de tela
      cinematic: 520,  // grandes transições
      chart: 800,      // gráfico sendo desenhado
      highlight: 900,  // destaque onde a IA trabalhou
    },
    stagger: { radial: 40, cards: 40, chips: 80, scenes: 70, list: 45, words: 28 },
    distance: { nudge: 8, mode: 10, enter: 12, item: 18, toolLift: 3 },
    scale: { press: 0.96, pressStrong: 0.90, pressTool: 0.88, pressImage: 0.98, select: 1.02, overshoot: 1.03 },
    opacity: { dim: 0.35, scrim: 0.5, highlight: 0.12, disabled: 0.45 },
    // springs no modelo massa/mola/amortecimento (como SwiftUI/Reanimated)
    springs: {
      snappy:   { stiffness: 620, damping: 34, mass: 1 }, // press release, ícones
      standard: { stiffness: 360, damping: 32, mass: 1 }, // navegação, indicadores
      soft:     { stiffness: 210, damping: 27, mass: 1 }, // sheets, painéis
      pop:      { stiffness: 460, damping: 24, mass: 1 }, // itens do menu radial
      gentle:   { stiffness: 150, damping: 22, mass: 1 }, // entradas de conteúdo
    },
    ease: {
      out: 'cubic-bezier(.22,1,.36,1)',
      inOut: 'cubic-bezier(.65,0,.35,1)',
      in: 'cubic-bezier(.55,0,1,.45)',
      linear: 'linear',
    },
  };

  const supportsLinear = (() => { try { return CSS.supports('animation-timing-function', 'linear(0, 1)'); } catch { return false; } })();
  const FALLBACK = 'cubic-bezier(.2,1.05,.3,1)';
  const cache = {};

  // Resolve a mola analiticamente e amostra a curva até ela assentar.
  function solve({ stiffness: k, damping: c, mass: m = 1 }) {
    const w0 = Math.sqrt(k / m), zeta = c / (2 * Math.sqrt(k * m));
    const x = t => {
      if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
      }
      return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    };
    let t = 0, settle = 2;
    const dt = 1 / 240;
    for (; t < 2; t += dt) {
      if (t > 0.05 && Math.abs(1 - x(t)) < 0.0015 && Math.abs(x(t + dt) - x(t)) / dt < 0.02) { settle = t; break; }
    }
    const N = 48, pts = [];
    for (let i = 0; i <= N; i++) pts.push(+x((settle * i) / N).toFixed(4));
    pts[N] = 1;
    return { easing: `linear(${pts.join(', ')})`, duration: Math.round(settle * 1000) };
  }

  function spring(name) {
    if (!cache[name]) {
      const s = solve(T.springs[name]);
      cache[name] = supportsLinear ? s : { easing: FALLBACK, duration: s.duration };
    }
    return cache[name];
  }

  // expõe as springs como variáveis CSS para transições declarativas
  const root = document.documentElement;
  Object.keys(T.springs).forEach(n => {
    const s = spring(n);
    root.style.setProperty(`--spring-${n}`, s.easing);
    root.style.setProperty(`--spring-${n}-dur`, s.duration + 'ms');
  });
  Object.entries(T.dur).forEach(([k, v]) => root.style.setProperty(`--dur-${k}`, v + 'ms'));
  root.style.setProperty('--ease-out', T.ease.out);

  // ---------- Reduce Motion ----------
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let forced = null;
  const reduced = () => (forced === null ? mq.matches : forced);
  const syncClass = () => root.classList.toggle('reduce-motion', reduced());
  mq.addEventListener?.('change', syncClass);
  syncClass();

  const MOTION_KEYS = ['transform', 'translate', 'scale', 'rotate', 'clipPath', 'width', 'height', 'filter', 'offset'];

  function toReduced(frames) {
    const kept = frames.map(f => (f.opacity !== undefined ? { opacity: f.opacity } : null));
    return kept.some(Boolean) ? kept.map(f => f || {}) : null;
  }

  /**
   * animate(el, frames, opts)
   * opts: spring (nome) | duration + easing, delay, commit (true: grava estado final no estilo),
   *       fromCurrent (lê o valor atual das propriedades animadas e cancela animações anteriores)
   */
  function animate(el, frames, opts = {}) {
    if (!el) return Promise.resolve();
    let { spring: sp, duration, easing, delay = 0, commit = true, fromCurrent = false, iterations = 1, direction } = opts;
    if (sp) { const s = spring(sp); duration = duration || s.duration; easing = s.easing; }
    duration = duration ?? T.dur.normal;
    easing = easing || T.ease.out;

    if (fromCurrent) {
      const cs = getComputedStyle(el), first = {};
      Object.keys(frames[frames.length - 1]).forEach(k => {
        if (k === 'offset' || k === 'easing') return;
        const prop = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        first[k] = cs.getPropertyValue(prop);
      });
      el.getAnimations().forEach(a => { try { a.commitStyles(); } catch {} a.cancel(); });
      frames = [first, ...frames.filter((f, i) => i > 0 || frames.length === 1)];
    }

    if (reduced()) {
      const r = toReduced(frames);
      const last = frames[frames.length - 1];
      if (commit) Object.entries(last).forEach(([k, v]) => { if (k !== 'offset' && k !== 'easing') el.style[k] = v; });
      if (!r || iterations === Infinity) return Promise.resolve();
      duration = Math.min(duration, 180); easing = 'linear'; delay = Math.min(delay, 60); frames = r;
    }

    const anim = el.animate(frames, { duration, easing, delay, fill: 'both', iterations, direction });
    if (iterations === Infinity) return anim;
    return anim.finished.then(() => {
      if (commit) { try { anim.commitStyles(); } catch {} }
      anim.cancel();
    }).catch(() => {});
  }

  // ---------- Haptics ----------
  const PATTERNS = { light: 8, selection: 4, medium: 14, heavy: 22, success: [10, 50, 14], warning: [18, 70, 18], error: [24, 60, 24, 60, 24] };
  function haptic(kind = 'light') {
    try { navigator.vibrate && navigator.vibrate(PATTERNS[kind] || 8); } catch {}
    window.dispatchEvent(new CustomEvent('scriptter:haptic', { detail: kind }));
  }

  // ---------- Press feedback declarativo: data-press=".96" ----------
  const pressed = new WeakMap();
  function pressIn(el) {
    const s = parseFloat(el.dataset.press) || T.scale.press;
    pressed.set(el, true);
    animate(el, [{ scale: String(s) }], { duration: T.dur.press, easing: T.ease.out, fromCurrent: true });
  }
  function pressOut(el) {
    if (!pressed.get(el)) return;
    pressed.delete(el);
    const overshoot = el.dataset.pressOvershoot;
    const frames = overshoot ? [{ scale: overshoot }, { scale: '1' }] : [{ scale: '1' }];
    animate(el, overshoot ? [{}, ...frames] : frames, { spring: 'snappy', fromCurrent: true });
  }
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-press]');
    if (el && !el.disabled) pressIn(el);
  });
  ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => {
    document.querySelectorAll('[data-press]').forEach(pressOut);
  }));
  document.addEventListener('pointerleave', () => document.querySelectorAll('[data-press]').forEach(pressOut));

  const wait = ms => new Promise(r => setTimeout(r, reduced() ? Math.min(ms, 80) : ms));

  window.Motion = {
    tokens: T, spring, animate, haptic, wait, reduced,
    setReduced(v) { forced = v; syncClass(); },
    supportsLinear,
  };
})();
