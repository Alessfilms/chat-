// Linha do tempo do vídeo. render(t) desenha o quadro do segundo t de forma determinística,
// então o mesmo t sempre gera a mesma imagem (necessário para renderizar quadro a quadro).
(() => {
  const W = 1080, H = 1350, DURATION = 18.5;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  // ---------- easing (curvas no estilo do Graph Editor do After Effects) ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const expoOut = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const quintOut = x => 1 - Math.pow(1 - x, 5);
  const cubicInOut = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const quartInOut = x => (x < .5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
  const backOut = x => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  // ---------- elementos ----------
  const cam = $('#cam'), win = $('#win'), ghost = $('#ghost'), ripple = $('#ripple');
  const sweep = $('#sweep'), flash = $('#flash'), end = $('#end');
  const typedText = $('#typedText'), caret = $('#caret'), ph = $('#ph');
  const bubble = $('#bubble'), trial = $('#trialText'), hero = $('.hero');
  const sideItems = $$('.sidebar .item');
  sideItems[1].id = 's2';

  // título de fundo dividido em letras
  const bw = $('.backword');
  bw.innerHTML = [...bw.textContent].map(c => `<span class="bw">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const letters = $$('.backword .bw');

  // entradas escalonadas: atraso por coluna + índice
  const rises = $$('.rise').map(el => {
    const i = parseFloat(el.style.getPropertyValue('--i')) || 0;
    const col = el.closest('.sidebar') ? .1 : el.closest('.main') ? .2 : 0;
    return { el, start: 1.15 + col + i * .055 };
  });
  const riseMap = new Map(rises.map(r => [r.el, r]));

  const baseTransform = new Map([[$('.core'), 'rotate(45deg)']]);

  // ---------- roteiro do cursor ----------
  const FIXED = 'Crie um design para ';
  const TYPED = 'um app de chat animado em 3D';
  const MESSAGE = FIXED + TYPED;
  const SHOTS = [
    { sel: '.newchat',            a: 3.35, l: 4.35,  zoom: 1.32, click: 3.9 },
    { sel: '.item.hot',           a: 4.75, l: 5.55,  zoom: 1.4 },
    { sel: '#s2',                 a: 5.85, l: 6.5,   zoom: 1.4 },
    { sel: '.tab.secondary',      a: 6.95, l: 7.65,  zoom: 1.3 },
    { sel: '.core',               a: 8.05, l: 8.95,  zoom: 1.6,  click: 8.5 },
    { sel: '.card:nth-child(1)',  a: 9.35, l: 10.0,  zoom: 1.3 },
    { sel: '.card:nth-child(2)',  a: 10.25, l: 10.95, zoom: 1.3 },
    { sel: '.chip:nth-child(2)',  a: 11.3, l: 11.9,  zoom: 1.38, click: 11.6 },
    { sel: '#typed',              a: 12.2, l: 13.75, zoom: 1.4,  nopop: true },
    { sel: '.send',               a: 14.0, l: 14.8,  zoom: 1.5,  click: 14.35 },
  ].map(s => ({ ...s, el: $(s.sel) }));
  const CLICKS = SHOTS.filter(s => s.click).map(s => s.click);
  const TYPE_START = 12.35, TYPE_END = 13.65, SEND = 14.35;

  // ---------- estado de repouso (para medir posições) ----------
  function windowTransform(t, measuring) {
    const e = quintOut(prog(t, .2, 2.2));
    let rx = lerp(42, 7, e), ry = lerp(-50, -13, e), z = lerp(-1500, 0, e), y = lerp(460, 0, e);
    if (!measuring) {
      rx += Math.cos(t * .5) * .7;
      ry += Math.sin(t * .6) * 1.1;
      const out = cubicInOut(prog(t, 14.9, 16.1));
      ry += out * -5; rx += out * 3;
    }
    win.style.opacity = prog(t, .2, .6);
    win.style.transform = `translateY(${y}px) translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(1deg)`;
  }

  function measure() {
    cam.style.transform = 'none';
    windowTransform(5, true);
    rises.forEach(r => { r.el.style.transform = ''; r.el.style.opacity = 1; });
    for (const s of SHOTS) {
      const r = s.el.getBoundingClientRect();
      s.focus = [r.left + r.width / 2, r.top + r.height / 2];
      s.tip = [r.left + r.width * (s.nopop ? .45 : .62), r.top + r.height * .58];
    }
  }

  // ---------- câmera ----------
  const CENTER = [W / 2, H / 2];
  let camKeys;
  function buildCamera() {
    camKeys = [{ t: 0, f: [W / 2 + 40, H / 2 + 60], s: 1.12 }, { t: 2.9, f: CENTER, s: 1 }];
    for (const s of SHOTS) {
      const f = [lerp(CENTER[0], s.focus[0], .88), lerp(CENTER[1], s.focus[1], .88)];
      camKeys.push({ t: s.a - .2, f, s: s.zoom }, { t: s.l - .1, f, s: s.zoom });
    }
    camKeys.push({ t: 16.1, f: [W / 2 + 60, H / 2 + 40], s: .92 }, { t: DURATION, f: [W / 2 + 60, H / 2 + 40], s: .88 });
  }
  function camera(t) {
    let k = camKeys.length - 2;
    for (let i = 0; i < camKeys.length - 1; i++) if (t < camKeys[i + 1].t) { k = i; break; }
    const A = camKeys[k], B = camKeys[k + 1];
    const e = (k === 0 ? quartInOut : cubicInOut)(prog(t, A.t, B.t));
    return {
      fx: lerp(A.f[0], B.f[0], e) + Math.sin(t * 1.3) * 2.5,
      fy: lerp(A.f[1], B.f[1], e) + Math.cos(t * 1.1) * 2.5,
      s: lerp(A.s, B.s, e),
      rot: Math.sin(t * .45) * .35,
    };
  }
  const toScreen = (p, c) => {
    const dx = (p[0] - c.fx) * c.s, dy = (p[1] - c.fy) * c.s;
    const r = c.rot * Math.PI / 180;
    return [W / 2 + dx * Math.cos(r) - dy * Math.sin(r), H / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
  };

  // ---------- cursor ----------
  const START = [W + 120, H + 200];
  function cursorWorld(t) {
    let from = START, fromT = 2.55;
    for (const s of SHOTS) {
      if (t < s.a) {
        const e = cubicInOut(prog(t, fromT, s.a));
        const mx = (from[0] + s.tip[0]) / 2, my = (from[1] + s.tip[1]) / 2;
        const dx = s.tip[0] - from[0], dy = s.tip[1] - from[1];
        const cx = mx - dy * .18, cy = my + dx * .18; // arco suave
        const u = 1 - e;
        return [u * u * from[0] + 2 * u * e * cx + e * e * s.tip[0], u * u * from[1] + 2 * u * e * cy + e * e * s.tip[1]];
      }
      if (t < s.l) return s.tip;
      from = s.tip; fromT = s.l;
    }
    const e = cubicInOut(prog(t, fromT, fromT + 1.1));
    return [lerp(from[0], W + 300, e), lerp(from[1], H + 160, e)];
  }
  const press = (t, c) => Math.sin(Math.PI * prog(t, c - .09, c + .2));

  // ---------- granulação de filme ----------
  const grain = $('#grain'), g = grain.getContext('2d'), img = g.createImageData(grain.width, grain.height);
  function drawGrain(t) {
    let seed = (Math.floor(t * 24) * 9301 + 49297) % 233280;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      seed = (seed * 9301 + 49297) % 233280;
      const v = (seed / 233280) * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  // ---------- quadro ----------
  function render(t) {
    windowTransform(t, false);

    // título de fundo
    letters.forEach((l, i) => {
      const e = expoOut(prog(t, .05 + i * .045, 1.1 + i * .045));
      l.style.transform = `translateY(${(1 - e) * 140}px) skewX(${(1 - e) * -12}deg)`;
      l.style.opacity = prog(t, .05 + i * .045, .4 + i * .045);
    });
    bw.style.transform = `translateX(${-t * 5}px)`;

    // transformações por elemento: entrada + salto
    const parts = new Map();
    const add = (el, s) => parts.set(el, (parts.get(el) || '') + ' ' + s);

    for (const r of rises) {
      const e = expoOut(prog(t, r.start, r.start + .95));
      r.el.style.opacity = prog(t, r.start, r.start + .3);
      add(r.el, `translate3d(0, ${(1 - e) * 40}px, ${(1 - e) * 200}px)`);
    }

    $$('.slot').forEach(s => s.style.setProperty('--h', 0));
    for (const s of SHOTS) {
      if (s.nopop) continue;
      const up = backOut(prog(t, s.a - .12, s.a + .42));
      const down = cubicInOut(prog(t, s.l, s.l + .4));
      const h = clamp(up, 0, 1.2) * (1 - down);
      const p = s.click ? press(t, s.click) : 0;
      const since = Math.max(0, t - s.a);
      const wob = Math.sin(since * 11) * Math.exp(-since * 4) * 5 * (t > s.a ? 1 : 0);
      const z = (parseFloat(getComputedStyle(s.el).getPropertyValue('--z')) || 64) * 1.15;
      s.el.style.setProperty('--h', clamp(h - p * .3, 0, 1).toFixed(3));
      if (h > 0.001 || p > 0) {
        add(s.el, `translateZ(${z * h * (1 - .6 * p)}px) rotateX(${(-4 + wob * .4) * h}deg) rotateY(${(6 + wob) * h}deg) scale(${1 + .06 * h - .05 * p})`);
      }
      const slot = s.el.parentElement;
      if (slot.classList.contains('slot')) slot.style.setProperty('--h', clamp(h, 0, 1).toFixed(3));
    }

    // ícone central flutuando
    const core = $('.core');
    add(core, `translateY(${Math.sin(t * 1.4) * 5}px)`);

    for (const el of new Set([...parts.keys(), ...baseTransform.keys()])) {
      el.style.transform = (parts.get(el) || '') + ' ' + (baseTransform.get(el) || '');
    }

    // detalhes que se movem sozinhos
    $('.item.hot').style.backgroundPosition = `${50 + Math.sin(t * .9) * 50}% 0`;
    $('.prompt').style.backgroundPosition = `${50 + Math.sin(t * .7) * 50}% 0`;
    $('.ring .val').style.strokeDashoffset = lerp(126, 45, expoOut(prog(t, 2.1, 3.8)));
    $$('.orb .lines path').forEach((p, i) => { p.style.strokeDashoffset = lerp(160, 0, quintOut(prog(t, 2.2 + i * .08, 3.6 + i * .08))); });
    sweep.style.backgroundPosition = `${lerp(160, -60, cubicInOut(prog(t, 1.9, 3.1)))}% 0`;
    sweep.style.opacity = t > 3.1 ? 0 : 1;

    // digitação
    let text = '';
    if (t >= 11.6) text = FIXED;
    if (t >= TYPE_START) text += TYPED.slice(0, Math.floor(TYPED.length * prog(t, TYPE_START, TYPE_END)));
    if (t >= SEND + .05) text = '';
    typedText.textContent = text;
    ph.style.opacity = text ? 0 : 1;
    const typing = t >= TYPE_START && t <= TYPE_END;
    caret.style.opacity = t >= 11.6 && t < SEND + .05 && (typing || Math.floor(t * 2.4) % 2 === 0) ? 1 : 0;

    // mensagem enviada
    const b = prog(t, SEND + .08, SEND + .75);
    bubble.textContent = MESSAGE;
    bubble.style.opacity = Math.min(1, b * 2.5);
    bubble.style.transformOrigin = '100% 100%';
    bubble.style.transform = `translate3d(0, ${(1 - backOut(b)) * 140}px, ${40 * b}px) scale(${lerp(.5, 1, backOut(b))})`;
    const dim = lerp(1, .3, cubicInOut(prog(t, SEND, SEND + .6)));
    hero.style.opacity = dim; $('.cards').style.opacity = dim; $('.pinned-head').style.opacity = dim;
    trial.textContent = t >= SEND ? 'Mensagem enviada. A Nexa está pensando...' : 'Seu teste gratuito termina em breve. Continue seu fluxo.';

    // câmera
    const c = camera(t);
    cam.style.transform = `translate(${W / 2}px, ${H / 2}px) rotate(${c.rot}deg) scale(${c.s}) translate(${-c.fx}px, ${-c.fy}px)`;

    // cursor
    const sp = toScreen(cursorWorld(t), c);
    const pr = Math.max(0, ...CLICKS.map(k => press(t, k)));
    ghost.style.opacity = prog(t, 2.55, 2.8);
    ghost.style.transform = `translate(${sp[0] - 6}px, ${sp[1] - 4}px) scale(${1 - .18 * pr})`;

    // clique: anel + flash
    const last = CLICKS.filter(k => t >= k).pop();
    const rp = last ? prog(t, last, last + .6) : 1;
    if (rp < 1) {
      const at = toScreen(cursorWorld(last), camera(last));
      ripple.style.opacity = (1 - rp) * .9;
      ripple.style.transform = `translate(${at[0]}px, ${at[1]}px) scale(${lerp(.15, 1.5, quintOut(rp))})`;
      flash.style.opacity = (1 - prog(t, last, last + .25)) * .1;
    } else { ripple.style.opacity = 0; flash.style.opacity = 0; }

    // encerramento
    const ec = cubicInOut(prog(t, 16.15, 16.75));
    end.style.opacity = ec;
    $('#endmark').style.strokeDashoffset = lerp(100, 0, quintOut(prog(t, 16.4, 17.5)));
    const dot = backOut(prog(t, 17.0, 17.5));
    $('#enddot').style.transform = `scale(${dot})`; $('#enddot').style.transformOrigin = '20px 20px';
    const et = expoOut(prog(t, 16.65, 17.6)), es = expoOut(prog(t, 16.95, 17.8));
    $('#endtitle').style.cssText = `opacity:${prog(t, 16.65, 17)};transform:translateY(${(1 - et) * 40}px);letter-spacing:${lerp(.12, -.03, et)}em`;
    $('#endsub').style.cssText = `opacity:${prog(t, 16.95, 17.3)};transform:translateY(${(1 - es) * 24}px)`;
    end.style.transform = `scale(${lerp(1.06, 1, quintOut(prog(t, 16.15, 18.5)))})`;
    // fade final para preto
    document.body.style.filter = `brightness(${1 - prog(t, 18.1, 18.5)})`;

    drawGrain(t);
  }

  window.DURATION = DURATION;
  window.ready = document.fonts.ready.then(() => { measure(); buildCamera(); render(0); });
  window.render = render;
})();
