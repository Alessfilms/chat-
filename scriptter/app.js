/* Scriptter: telas, navegação e microinterações sobre a UI existente.
 * Todas as durações, springs e distâncias vêm de Motion.tokens (motion.js). */
(() => {
  const { animate, haptic, wait, tokens: T } = Motion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const phone = $('#phone'), layer = $('#layer');
  const W = () => phone.clientWidth, H = () => phone.clientHeight;
  const rel = el => {
    const r = el.getBoundingClientRect(), p = phone.getBoundingClientRect();
    return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  $$('.screen').forEach(s => { const d = document.createElement('div'); d.className = 'shade'; s.append(d); });
  const shade = s => $('.shade', s);

  /* =========================================================
   * Dados
   * ========================================================= */
  const DOCS = ['Depois da Meia-Noite', 'A Chave do Cofre', 'O Número no Espelho', 'A Noiva da Herança', 'Mês da Vingança'];
  const SCRIPT = `
    <div class="scene"><span class="n">1.</span><span class="h">INT. SALÃO DE CASAMENTO - DIA</span></div>
    <p>O véu branco cobre o rosto de HELENA diante do altar. LARA atravessa os convidados com um envelope amassado na mão.</p>
    <p>Close no anel de Rafael. Lara sobe os degraus, puxa o véu de Helena e revela o rosto da noiva em choque.</p>
    <p class="char">LARA</p>
    <p class="dlg">Antes de dizerem “sim”, olhem para o homem que está ao lado dela. Rafael dormiu comigo e prometeu se casar comigo antes de escolher a minha irmã.</p>
    <p class="char">HELENA</p>
    <p class="dlg">Você enlouqueceu? Rafael, diga que isso é uma mentira.</p>
    <p class="char">RAFAEL</p>
    <p class="dlg">Lara, saia daqui agora.</p>
    <p>Lara abre o envelope. Uma certidão cai sobre o tapete vermelho.</p>
    <div class="scene"><span class="n">2.</span><span class="h">INT. SALA PRIVADA DO SALÃO - DIA</span></div>
    <p>A chave gira na fechadura. Antes que Rafael consiga empurrar a porta, ela se abre violentamente.</p>`;

  const EXCERPT = [
    { k: 'scene', html: '<span class="n">1.</span><span class="h">INT. SALA PRIVADA DO SALÃO - DIA</span>' },
    { k: 'act', id: 'b-act', text: 'A chave gira na fechadura. Antes que Rafael consiga empurrar a porta, ela se abre violentamente. HELENA aparece com o celular erguido, a gravação da ameaça de Augusto visível na tela.' },
    { k: 'char', text: 'HELENA' },
    { k: 'dlg', id: 'b-dlg', text: 'Eu chamei a polícia antes de entrar. Todos ouviram Augusto ameaçar Lara, e essa gravação já foi enviada para três pessoas.' },
  ];

  const ACTIONS = {
    hook:   { color: '#1f73df', target: 'b-act', msgs: ['Analisando o gancho…', 'Reescrevendo a abertura…', 'Fortalecendo o gancho…'],
              text: 'A chave gira. A porta explode para dentro. HELENA surge com o celular erguido: na tela, Augusto ameaçando Lara.',
              summary: 'Gancho inicial fortalecido: a cena agora abre no impacto da porta.' },
    threat: { color: '#c56a07', target: 'b-dlg', msgs: ['Lendo a ameaça…', 'Cortando excessos…', 'Encurtando a ameaça…'],
              text: 'A polícia está chegando. E três pessoas já têm essa gravação.',
              summary: 'Ameaça encurtada: a fala de Helena caiu de 22 para 11 palavras.' },
    clash:  { color: '#21913a', target: 'b-act', msgs: ['Medindo o ritmo…', 'Construindo cenas…', 'Acelerando o confronto…'],
              text: 'Rafael mal toca a porta e ela se abre. HELENA entra, celular erguido. A voz de Augusto ecoa no volume máximo.',
              summary: 'Confronto acelerado: a entrada de Helena ganhou 4 segundos de ritmo.' },
    reveal: { color: '#c53234', target: 'b-dlg', msgs: ['Encontrando a revelação…', 'Ajustando a ênfase…', 'Destacando a revelação…'],
              text: 'Todos ouviram Augusto ameaçar Lara. A gravação já saiu desta sala. Acabou, Augusto.',
              summary: 'Revelação destacada: a fala agora termina na virada contra Augusto.' },
  };

  const SHOTS = [
    { n: '01', img: 'assets/shot-1.jpg', f: 0 },
    { n: '02', img: 'assets/shot-2.jpg', f: 0 },
    { n: '03', img: 'assets/shot-3.jpg', f: 0 },
  ];
  const FORMATS = [{ l: '16:9', r: 16 / 9 }, { l: '9:16', r: 9 / 16 }, { l: '1:1', r: 1 }, { l: '4:3', r: 4 / 3 }, { l: '2.39:1', r: 2.39 }];

  let TL = [
    { id: 1, h: 'INT. SALÃO DE CASAMENTO - DIA', s: 'Lara interrompe o casamento e revela o caso.', d: 42 },
    { id: 2, h: 'INT. SALA PRIVADA DO SALÃO - DIA', s: 'Helena expõe a ameaça de Augusto.', d: 30 },
    { id: 3, h: 'EXT. ESTACIONAMENTO - NOITE', s: 'Rafael tenta fugir com o envelope.', d: 55 },
    { id: 4, h: 'INT. CARRO DE RAFAEL - NOITE', s: 'A ligação de Augusto muda tudo.', d: 38 },
    { id: 5, h: 'INT. MANSÃO - ESCRITÓRIO - NOITE', s: 'O testamento verdadeiro aparece.', d: 70 },
  ];

  /* =========================================================
   * Toast
   * ========================================================= */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    $('span', toastEl).textContent = msg;
    clearTimeout(toastTimer);
    animate(toastEl, [{ transform: 'translate(-50%, 0)' }], { spring: 'pop', fromCurrent: true });
    toastTimer = setTimeout(() => animate(toastEl, [{ transform: 'translate(-50%, -90px)' }], { duration: T.dur.normal, easing: T.ease.in, fromCurrent: true }), 1700);
  }

  /* =========================================================
   * Navegação: pilha + transições (push lateral, compartilhada, troca de modo)
   * ========================================================= */
  const stack = ['home'];
  const entry = {};          // id -> { kind, source }
  let busy = false;

  function clearScreen(s) {
    s.style.transform = ''; s.style.opacity = ''; s.style.zIndex = '';
    shade(s).style.opacity = '';
  }

  async function slide(from, to, dir) {
    const w = W(), top = dir > 0 ? to : from, under = dir > 0 ? from : to;
    from.classList.add('is-under'); to.classList.add('is-under');
    top.style.zIndex = 3; under.style.zIndex = 2;
    const o = { spring: 'standard', commit: false };
    await Promise.all([
      animate(top, [{ transform: `translateX(${dir > 0 ? w : 0}px)` }, { transform: `translateX(${dir > 0 ? 0 : w}px)` }], o),
      animate(under, [{ transform: `translateX(${dir > 0 ? 0 : -w * .3}px)` }, { transform: `translateX(${dir > 0 ? -w * .3 : 0}px)` }], o),
      animate(shade(under), [{ opacity: dir > 0 ? 0 : T.opacity.dim }, { opacity: dir > 0 ? T.opacity.dim : 0 }], o),
    ]);
    settle(from, to);
  }

  async function modeSwap(from, to, dir) {
    const d = T.distance.mode;
    from.classList.add('is-under'); to.classList.add('is-under');
    to.style.zIndex = 3; from.style.zIndex = 2;
    const o = { duration: T.dur.normal, easing: T.ease.out, commit: false };
    await Promise.all([
      animate(to, [{ opacity: 0, transform: `translateX(${d * dir}px)` }, { opacity: 1, transform: 'none' }], o),
      animate(from, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-d * dir}px)` }], o),
    ]);
    settle(from, to);
  }

  function settle(from, to) {
    from.classList.remove('is-active', 'is-under');
    to.classList.remove('is-under'); to.classList.add('is-active');
    clearScreen(from); clearScreen(to);
  }

  // Documento → editor: o papel do card cresce até virar a folha do editor.
  async function sharedOpen(source, from, to) {
    const paper = source.querySelector('.paper') || source;
    const r = rel(paper), w = W(), h = H();
    const g = document.createElement('div');
    g.className = 'ghost-paper';
    g.style.cssText = `width:${w}px;height:${h}px;background:#0e0e10`; // estado final escuro: a animação de cor parte do cinza do papel
    layer.append(g);
    paper.style.visibility = 'hidden';
    const from0 = `translate(${r.x}px,${r.y}px) scale(${r.w / w},${r.h / h})`;
    // o editor já fica por baixo do papel; quando o papel termina de crescer, ele se dissolve revelando o editor
    to.classList.add('is-under'); to.style.zIndex = 3; to.style.opacity = 0;
    await Promise.all([
      // o editor só passa a existir visualmente quando o papel já cobre a tela inteira
      animate(to, [{ opacity: 0 }, { opacity: 0, offset: .97 }, { opacity: 1 }], { duration: 265, easing: 'linear' }),
      animate(g, [{ transform: from0, borderRadius: '24px' }, { transform: 'none', borderRadius: '0px' }], { duration: T.dur.cinematic, easing: T.ease.out, commit: false }),
      // o papel escurece enquanto cresce, para não acender a tela inteira em cinza-claro
      animate(g, [{ backgroundColor: '#d6d6d8' }, { backgroundColor: '#0e0e10' }], { duration: 280, delay: 60, easing: T.ease.out, commit: false }),
      animate(g, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 270, easing: T.ease.inOut }).then(() => g.remove()),
      animate($('.sheet-paper', to), [{ opacity: 0, transform: `translateY(${T.distance.enter}px)` }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 300, commit: false }),
      animate(shade(from), [{ opacity: 0 }, { opacity: .5 }], { duration: T.dur.cinematic, commit: false }),
    ]);
    g.remove();
    settle(from, to);
    paper.style.visibility = '';
  }

  async function sharedClose(source, from, to) {
    const paper = source.querySelector('.paper') || source;
    to.classList.add('is-under'); to.style.zIndex = 1;
    const r = rel(paper), w = W(), h = H();
    const g = document.createElement('div');
    g.className = 'ghost-paper';
    g.style.cssText = `width:${w}px;height:${h}px;background:#0e0e10`;
    layer.append(g);
    from.style.opacity = 0;
    paper.style.visibility = 'hidden';
    const to0 = `translate(${r.x}px,${r.y}px) scale(${r.w / w},${r.h / h})`;
    await Promise.all([
      animate(g, [{ transform: 'none', borderRadius: '0px' }, { transform: to0, borderRadius: '24px' }], { spring: 'standard', commit: false }),
      animate(g, [{ backgroundColor: '#0e0e10' }, { backgroundColor: '#d6d6d8' }], { duration: 220, easing: T.ease.inOut, commit: false }),
      animate(shade(to), [{ opacity: .5 }, { opacity: 0 }], { duration: T.dur.slow, commit: false }),
    ]);
    paper.style.visibility = '';
    g.remove();
    settle(from, to);
    animate(source, [{ scale: '1.04' }, { scale: '1' }], { spring: 'snappy' });
  }

  const isVisible = el => el && el.isConnected && el.getClientRects().length > 0;

  async function push(id, opts = {}) {
    if (busy || stack.at(-1) === id) return;
    busy = true;
    const from = $('#' + stack.at(-1)), to = $('#' + id);
    stack.push(id);
    entry[id] = { kind: opts.kind || 'right', source: opts.source };
    tabbarFor(id);
    if (opts.kind === 'shared') await sharedOpen(opts.source, from, to);
    else if (opts.kind === 'mode') await modeSwap(from, to, 1);
    else await slide(from, to, 1);
    busy = false;
    enter(id, { kind: entry[id].kind });
  }

  async function pop() {
    if (busy || stack.length < 2) return;
    busy = true;
    const fromId = stack.pop(), toId = stack.at(-1);
    const from = $('#' + fromId), to = $('#' + toId), e = entry[fromId] || {};
    leave(fromId);
    tabbarFor(toId);
    if (e.kind === 'shared' && isVisible(e.source)) await sharedClose(e.source, from, to);
    else if (e.kind === 'mode') await modeSwap(from, to, -1);
    else await slide(from, to, -1);
    busy = false;
    returned(toId);
  }

  function hardShow(id, path) {
    closeRadial(null, true); closeSheet(true); closeFab(true);
    layer.innerHTML = '';
    $$('.screen').forEach(s => { s.classList.remove('is-active', 'is-under'); clearScreen(s); });
    $('#' + id).classList.add('is-active');
    stack.splice(0, stack.length, ...path);
    path.forEach((p, i) => { if (i) entry[p] = { kind: 'right' }; });
    tabbarFor(id, true);
    enter(id, { kind: 'jump' });
  }

  $$('[data-back]').forEach(b => b.addEventListener('click', pop));

  /* ---------- swipe back interativo a partir da borda ---------- */
  (() => {
    let g = null;
    phone.addEventListener('pointerdown', e => {
      if (stack.length < 2 || busy || sheetOpen || radialOpen || layer.childElementCount) return;
      const p = phone.getBoundingClientRect();
      if (e.clientX - p.left > 22) return;
      const top = $('#' + stack.at(-1)), under = $('#' + stack.at(-2));
      under.classList.add('is-under'); top.style.zIndex = 3; under.style.zIndex = 2;
      g = { top, under, x0: e.clientX, dx: 0, t: performance.now(), v: 0, id: e.pointerId };
      phone.setPointerCapture(e.pointerId);
      move(0);
    });
    function move(dx) {
      const w = W();
      g.top.style.transform = `translateX(${dx}px)`;
      g.under.style.transform = `translateX(${-w * .3 + dx * .3}px)`;
      shade(g.under).style.opacity = T.opacity.dim * (1 - dx / w);
    }
    phone.addEventListener('pointermove', e => {
      if (!g || e.pointerId !== g.id) return;
      const now = performance.now(), dx = clamp(e.clientX - g.x0, 0, W());
      g.v = (dx - g.dx) / Math.max(1, now - g.t); g.dx = dx; g.t = now;
      move(dx);
    });
    const end = async e => {
      if (!g || e.pointerId !== g.id) return;
      const s = g; g = null;
      const w = W(), done = s.dx > w * .35 || s.v > .5;
      const o = { spring: 'standard', commit: false, fromCurrent: true };
      if (done) {
        busy = true;
        await Promise.all([
          animate(s.top, [{ transform: `translateX(${w}px)` }], o),
          animate(s.under, [{ transform: 'translateX(0px)' }], o),
          animate(shade(s.under), [{ opacity: 0 }], o),
        ]);
        const fromId = stack.pop(), toId = stack.at(-1);
        leave(fromId); tabbarFor(toId);
        settle(s.top, s.under);
        busy = false; returned(toId);
        haptic('light');
      } else {
        await Promise.all([
          animate(s.top, [{ transform: 'translateX(0px)' }], o),
          animate(s.under, [{ transform: `translateX(${-w * .3}px)` }], o),
          animate(shade(s.under), [{ opacity: T.opacity.dim }], o),
        ]);
        s.under.classList.remove('is-under'); clearScreen(s.under); clearScreen(s.top); s.top.style.zIndex = '';
      }
    };
    phone.addEventListener('pointerup', end);
    phone.addEventListener('pointercancel', end);
  })();

  /* =========================================================
   * Bottom navigation: cápsula persistente
   * ========================================================= */
  const tabbar = $('#tabbar'), cap = $('#tabCap'), plusBtn = $('#plusBtn');
  const tabs = $$('.tab[data-tab]');
  let tabShown = true, activeTab = 'home';
  const capTo = (btn, o = {}) => animate(cap, [{ transform: `translateX(${btn.offsetLeft}px)` }], { spring: 'standard', fromCurrent: true, ...o });
  requestAnimationFrame(() => { cap.style.transform = `translateX(${tabs[0].offsetLeft}px)`; });

  function tabbarFor(id, instant) {
    const show = id === 'home' || id === 'profile';
    if (show === tabShown && !instant) return;
    tabShown = show;
    tabbar.style.pointerEvents = show ? '' : 'none';
    if (instant) { tabbar.style.transform = show ? 'none' : 'translateY(120px)'; tabbar.style.opacity = show ? 1 : 0; return; }
    animate(tabbar, [{ transform: show ? 'none' : 'translateY(120px)', opacity: show ? 1 : 0 }],
      show ? { spring: 'soft', fromCurrent: true, delay: 80 } : { duration: T.dur.normal, easing: T.ease.in, fromCurrent: true });
  }

  tabs.forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.tab;
    if (id === activeTab || busy || radialOpen) return;
    haptic('selection');
    const dir = tabs.indexOf(btn) > tabs.findIndex(t => t.dataset.tab === activeTab) ? 1 : -1;
    tabs.forEach(t => t.classList.toggle('is-on', t === btn));
    capTo(btn);
    animate($('svg', btn), [{ scale: '.92' }, { scale: '1' }], { spring: 'snappy' });
    const from = $('#' + activeTab), to = $('#' + id);
    activeTab = id; stack[0] = id;
    busy = true; await modeSwap(from, to, dir); busy = false;
  }));

  /* =========================================================
   * Menu radial do botão +
   * ========================================================= */
  const radial = $('#radial'), arc = $('#arc'), scrimR = $('#radialScrim'), ticks = $('#ticks');
  const rItems = $$('.r-item', radial);
  const plusIco = $('.plus-ico', plusBtn);
  let radialOpen = false;
  (() => {
    let s = '';
    for (let a = 186; a <= 354; a += 3) {
      const rad = a * Math.PI / 180, long = a % 15 === 0, r1 = 286, r2 = long ? 270 : 278;
      s += `<line x1="${297 + r1 * Math.cos(rad)}" y1="${297 + r1 * Math.sin(rad)}" x2="${297 + r2 * Math.cos(rad)}" y2="${297 + r2 * Math.sin(rad)}" stroke="currentColor" stroke-width="${long ? 2.4 : 1.4}" stroke-linecap="round" opacity="${long ? 1 : .7}"/>`;
    }
    ticks.innerHTML = s;
  })();

  plusBtn.addEventListener('click', () => (radialOpen ? closeRadial() : openRadial()));
  scrimR.addEventListener('click', () => closeRadial());

  async function openRadial() {
    if (radialOpen || busy) return;
    radialOpen = true;
    plusBtn.setAttribute('aria-expanded', 'true'); radial.setAttribute('aria-hidden', 'false');
    haptic('medium');
    // 1) press 1 → .90 → 1.03 → 1
    animate(plusBtn, [{ scale: '1' }, { scale: String(T.scale.pressStrong), offset: .3 }, { scale: String(T.scale.overshoot), offset: .7 }, { scale: '1' }], { duration: 320, easing: T.ease.out });
    // 2) a cápsula ativa desliza até o centro e vira o botão X
    capTo(plusBtn);
    tabbar.classList.add('is-radial');
    tabs.forEach(t => animate(t, [{ opacity: 0, scale: '.8' }], { duration: T.dur.fast, fromCurrent: true }));
    plusBtn.classList.add('is-on');
    animate(plusIco, [{ rotate: '0deg' }, { rotate: '45deg' }], { spring: 'snappy' });
    // 3) o arco nasce do botão: máscara circular + scaleY
    radial.classList.add('is-open');
    scrimR.style.pointerEvents = 'auto';
    animate(scrimR, [{ opacity: 1 }], { duration: T.dur.slow, fromCurrent: true });
    animate(arc, [{ clipPath: 'circle(0px at 50% 37%)', transform: 'scaleY(.86)' }, { clipPath: 'circle(480px at 50% 37%)', transform: 'scaleY(1)' }], { spring: 'soft', fromCurrent: true });
    animate(ticks, [{ opacity: 0, transform: 'rotate(-8deg)' }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 90 });
    // 4) itens em stagger do centro para as laterais
    rItems.forEach(it => {
      const order = +it.dataset.order, d = 90 + order * T.stagger.radial, faint = it.classList.contains('faint') ? .38 : 1;
      animate($('.r-circ', it), [{ opacity: 0, transform: `translateY(${T.distance.item}px) scale(.75)` }, { opacity: faint, transform: 'none' }], { spring: 'pop', delay: d, fromCurrent: false });
      animate($('.r-lbl', it), [{ opacity: 0, transform: 'translate(-50%, 8px)' }, { opacity: faint, transform: 'translate(-50%, 0)' }], { spring: 'gentle', delay: d + 30 });
      const b = $('.r-badge', it);
      if (b) animate(b, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { spring: 'pop', delay: d + 80 });
    });
  }

  async function closeRadial(go, instant) {
    if (!radialOpen) return;
    radialOpen = false;
    plusBtn.setAttribute('aria-expanded', 'false'); radial.setAttribute('aria-hidden', 'true');
    const activeBtn = tabs.find(t => t.dataset.tab === activeTab);
    if (instant) {
      radial.classList.remove('is-open'); tabbar.classList.remove('is-radial'); plusBtn.classList.remove('is-on');
      scrimR.style.opacity = 0; scrimR.style.pointerEvents = 'none';
      arc.style.clipPath = 'circle(0px at 50% 37%)'; plusIco.style.rotate = '0deg';
      tabs.forEach(t => { t.style.opacity = 1; t.style.scale = '1'; });
      $$('.r-circ, .r-lbl, .r-badge', radial).forEach(e => { e.style.opacity = 0; });
      cap.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
      return;
    }
    haptic('light');
    // itens saem das extremidades em direção ao centro
    rItems.forEach(it => {
      const d = (2 - +it.dataset.order) * T.stagger.radial;
      [$('.r-circ', it), $('.r-badge', it)].forEach(el => el && animate(el, [{ opacity: 0, transform: `translateY(12px) scale(.8)` }], { duration: T.dur.fast, easing: T.ease.in, delay: d, fromCurrent: true }));
      animate($('.r-lbl', it), [{ opacity: 0, transform: 'translate(-50%, 6px)' }], { duration: T.dur.fast, easing: T.ease.in, delay: d, fromCurrent: true });
    });
    animate(plusIco, [{ rotate: '0deg' }], { spring: 'snappy', fromCurrent: true });
    animate(scrimR, [{ opacity: 0 }], { duration: T.dur.normal, delay: 60, fromCurrent: true });
    scrimR.style.pointerEvents = 'none';
    animate(ticks, [{ opacity: 0 }], { duration: T.dur.fast, delay: 40, fromCurrent: true });
    await animate(arc, [{ clipPath: 'circle(0px at 50% 37%)', transform: 'scaleY(.86)' }], { duration: 300, easing: T.ease.inOut, delay: 90, fromCurrent: true });
    radial.classList.remove('is-open');
    tabbar.classList.remove('is-radial');
    plusBtn.classList.remove('is-on');
    capTo(activeBtn);
    tabs.forEach(t => animate(t, [{ opacity: 1, scale: '1' }], { spring: 'snappy', fromCurrent: true }));
    if (go) go();
  }

  rItems.forEach(it => it.addEventListener('click', () => {
    const go = it.dataset.go;
    haptic('light');
    animate($('.r-circ', it), [{ scale: '1' }, { scale: '.9', offset: .4 }, { scale: '1' }], { duration: T.dur.normal });
    const routes = {
      editor: () => push('editor'), ai: () => push('ai'), storyboard: () => push('storyboard'),
      camera: () => toast('A câmera abre aqui no app'), tele: () => toast('O teleprompter abre aqui no app'),
    };
    setTimeout(() => closeRadial(routes[go]), 90);
  }));

  /* =========================================================
   * HOME
   * ========================================================= */
  const docsEl = $('#docs');
  function renderDocs() {
    docsEl.innerHTML = DOCS.map(t => `<button class="doc" data-press="${T.scale.press}" aria-label="Abrir ${t}"><span class="paper"><i></i><i></i><i></i><i></i><i></i><svg class="ico"><use href="#i-feather"/></svg></span><span class="doc-title">${t}</span></button>`).join('');
  }
  renderDocs();

  // toque abre (transição compartilhada); segurar abre menu contextual
  (() => {
    let timer = null, longed = false, start = null;
    docsEl.addEventListener('pointerdown', e => {
      const card = e.target.closest('.doc'); if (!card) return;
      longed = false; start = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => { longed = true; openCtx(card); }, 450);
    });
    docsEl.addEventListener('pointermove', e => {
      if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) { clearTimeout(timer); timer = null; }
    });
    ['pointerup', 'pointercancel'].forEach(t => docsEl.addEventListener(t, () => { clearTimeout(timer); timer = null; }));
    docsEl.addEventListener('click', e => {
      const card = e.target.closest('.doc'); if (!card) return;
      if (longed) { longed = false; return; }
      haptic('light');
      setTimeout(() => push('editor', { kind: 'shared', source: card }), 90);
    });
  })();

  function flipSiblings(mutate) {
    const els = $$('.doc', docsEl), before = new Map(els.map(el => [el, el.getBoundingClientRect().left]));
    mutate();
    $$('.doc', docsEl).forEach(el => {
      const b = before.get(el); if (b === undefined) return;
      const dx = b - el.getBoundingClientRect().left;
      if (dx) animate(el, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { spring: 'standard', commit: false });
    });
  }

  function openCtx(card) {
    haptic('medium');
    const paper = $('.paper', card), r = rel(paper);
    const scrim = document.createElement('div'); scrim.className = 'ctx-scrim';
    const lift = paper.cloneNode(true);
    lift.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;margin:0;box-shadow:0 18px 40px -10px rgba(0,0,0,.9)`;
    const menu = document.createElement('div'); menu.className = 'ctx';
    const mx = clamp(r.x - 8, 12, W() - 222), my = r.y + r.h + 14;
    menu.style.cssText = `left:${mx}px;top:${my}px;transform-origin:${r.x - mx + r.w / 2}px -14px`;
    menu.innerHTML = `<button data-a="open">Abrir<svg class="ico i18"><use href="#i-script"/></svg></button>
      <button data-a="dup">Duplicar<svg class="ico i18"><use href="#i-copy"/></svg></button>
      <button data-a="del" class="danger">Excluir<svg class="ico i18"><use href="#i-trash"/></svg></button>`;
    layer.append(scrim, lift, menu);
    paper.style.visibility = 'hidden';
    animate(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: T.dur.normal });
    animate(lift, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }], { spring: 'pop' });
    animate(menu, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { spring: 'pop', delay: 40 });
    const close = async (after) => {
      animate(menu, [{ opacity: 0, transform: 'scale(.7)' }], { duration: T.dur.fast, easing: T.ease.in, fromCurrent: true });
      animate(scrim, [{ opacity: 0 }], { duration: T.dur.normal, fromCurrent: true });
      await animate(lift, [{ transform: 'scale(1)' }], { spring: 'snappy', fromCurrent: true });
      paper.style.visibility = '';
      scrim.remove(); lift.remove(); menu.remove();
      after && after();
    };
    scrim.addEventListener('click', () => close());
    menu.addEventListener('click', e => {
      const a = e.target.closest('button')?.dataset.a; if (!a) return;
      if (a === 'open') close(() => push('editor', { kind: 'shared', source: card }));
      if (a === 'dup') close(() => {
        haptic('success');
        let copy;
        flipSiblings(() => { copy = card.cloneNode(true); $('.doc-title', copy).textContent = 'Cópia de ' + $('.doc-title', card).textContent; card.after(copy); });
        animate(copy, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { spring: 'pop' });
        toast('Cópia criada');
      });
      if (a === 'del') { haptic('warning'); close(async () => {
        await animate(card, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.6)' }], { duration: T.dur.normal, easing: T.ease.in });
        flipSiblings(() => card.remove());
        toast('Movido para a lixeira');
      }); }
    });
  }

  $('#homePanel .ai-panel-top').addEventListener('click', () => push('ai'));

  async function homeIntro() {
    const hero = $('#hero');
    animate(hero, [{ opacity: 0, transform: 'scale(1.025)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: T.ease.out });
    animate($('.home-top'), [{ opacity: 0 }, { opacity: 1 }], { duration: T.dur.slow });
    animate($('#recentHead'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.normal, delay: 160, easing: T.ease.out });
    $$('.doc', docsEl).forEach((d, i) => animate(d, [{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 230 + i * T.stagger.cards }));
    animate($('#homePanel'), [{ opacity: 0, transform: `translateY(${T.distance.enter}px)` }, { opacity: 1, transform: 'none' }], { spring: 'soft', delay: 380 });
    animate(tabbar, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { spring: 'soft', delay: 460 });
  }

  /* =========================================================
   * Microfone com waveform
   * ========================================================= */
  let waveRaf = null;
  function waveLoop(t) {
    const live = $$('.mic.listening');
    if (!live.length) { waveRaf = null; return; }
    const s = t / 1000, burst = .55 + .45 * Math.max(0, Math.sin(s * 1.3)) * Math.abs(Math.sin(s * 3.7));
    live.forEach(m => $$('.wave i', m).forEach((b, i) => {
      const v = Motion.reduced() ? .55 : clamp(.25 + burst * Math.abs(Math.sin(s * (5 + i * 1.7) + i * 1.3)), .2, 1);
      b.style.transform = `scaleY(${v.toFixed(3)})`;
    }));
    waveRaf = requestAnimationFrame(waveLoop);
  }
  $$('.mic').forEach(m => m.addEventListener('click', () => {
    const on = !m.classList.contains('listening');
    haptic(on ? 'medium' : 'light');
    m.classList.toggle('listening', on);
    m.setAttribute('aria-pressed', String(on));
    if (on) {
      m._pulse = animate(m, [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 1500, easing: 'ease-in-out', iterations: Infinity, commit: false });
      if (!waveRaf) waveRaf = requestAnimationFrame(waveLoop);
    } else if (m._pulse && m._pulse.cancel) { m._pulse.cancel(); }
  }));

  /* =========================================================
   * EDITOR
   * ========================================================= */
  const script = $('#script');
  script.innerHTML = SCRIPT;
  const seg = $('#edSeg'), segInd = $('#segInd'), segBtns = $$('.seg-btn', seg);
  let segOn = null;
  function segTo(btn) {
    segInd.style.width = btn.offsetWidth + 'px';
    segBtns.forEach(b => b.classList.toggle('is-on', b === btn));
    if (!segOn) {
      segInd.style.transform = `translateX(${btn.offsetLeft}px)`;
      animate(segInd, [{ opacity: 0, scale: '.94' }, { opacity: 1, scale: '1' }], { spring: 'snappy' });
    } else {
      animate(segInd, [{ transform: `translateX(${btn.offsetLeft}px)` }], { spring: 'standard', fromCurrent: true });
    }
    segOn = btn;
  }
  function segClear() {
    if (!segOn) return;
    segOn = null;
    segBtns.forEach(b => b.classList.remove('is-on'));
    animate(segInd, [{ opacity: 0 }], { duration: T.dur.fast, fromCurrent: true });
  }
  segBtns.forEach(b => b.addEventListener('click', () => {
    haptic('selection');
    segTo(b);
    if (b.dataset.mode === 'analysis') openSheet();
    else setTimeout(() => push('ai', { kind: 'mode' }), 160);
  }));

  // barra de ferramentas: indicador deslizante + label em crossfade
  const toolbar = $('#toolbar'), toolInd = $('#toolInd'), toolLabel = $('#toolLabel');
  const tools = $$('button', toolbar);
  let toolOn = null, labelTimer;
  function toolTo(btn, silent) {
    if (toolOn === btn) return;
    if (toolOn) animate(toolOn, [{ translate: '0 0' }], { spring: 'snappy', fromCurrent: true });
    tools.forEach(t => t.classList.toggle('is-on', t === btn));
    animate(btn, [{ translate: `0 -${T.distance.toolLift}px` }], { spring: 'snappy', fromCurrent: true });
    // posição calculada pelo layout fixo da barra (12px de padding, botões de 44px, gap de 2px): funciona mesmo com a tela oculta
    const to = `translate(${12 + tools.indexOf(btn) * 46}px, -${T.distance.toolLift}px)`;
    if (!toolOn || silent) toolInd.style.transform = to;
    else animate(toolInd, [{ transform: to }], { spring: 'standard', fromCurrent: true });
    toolOn = btn;
    if (silent) return;
    animate($('svg', btn), [{ scale: '1' }, { scale: String(T.scale.pressTool), offset: .35 }, { scale: '1' }], { duration: T.dur.normal, easing: T.ease.out });
    const span = $('span', toolLabel);
    animate(toolLabel, [{ opacity: 1 }], { duration: T.dur.fast, fromCurrent: true });
    animate(span, [{ opacity: 0, transform: 'translateY(-4px)' }], { duration: 90, fromCurrent: true }).then(() => {
      span.textContent = btn.dataset.tool;
      animate(span, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.fast, easing: T.ease.out });
    });
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => animate(toolLabel, [{ opacity: 0 }], { duration: T.dur.normal, fromCurrent: true }), 1200);
  }
  tools.forEach(b => b.addEventListener('click', () => { haptic('light'); toolTo(b); }));
  requestAnimationFrame(() => toolTo(tools[3], true));

  // teclado: a barra acompanha o teclado virtual e volta com spring
  if (window.visualViewport) {
    const vv = visualViewport;
    toolbar.style.transition = 'translate var(--spring-soft-dur) var(--spring-soft)';
    const upd = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      toolbar.style.translate = kb > 60 ? `0 ${-(kb - 50)}px` : '';
    };
    vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd);
  }

  // botão lateral +: ações contextuais nascem do botão
  const sideFab = $('#sideFab'), fabMenu = $('#fabMenu'), fabItems = $$('button', fabMenu);
  let fabOpen = false;
  function openFab() {
    fabOpen = true; sideFab.setAttribute('aria-expanded', 'true');
    haptic('light');
    fabMenu.classList.add('is-open');
    animate($('svg', sideFab), [{ rotate: '45deg' }], { spring: 'snappy', fromCurrent: true });
    [...fabItems].reverse().forEach((b, i) => {
      b.style.transformOrigin = '100% 50%';
      animate(b, [{ opacity: 0, transform: 'translate(18px, 8px) scale(.6)' }, { opacity: 1, transform: 'none' }], { spring: 'pop', delay: i * T.stagger.radial });
    });
  }
  function closeFab(instant) {
    if (!fabOpen) return;
    fabOpen = false; sideFab.setAttribute('aria-expanded', 'false');
    if (instant) { fabMenu.classList.remove('is-open'); fabItems.forEach(b => { b.style.opacity = 0; }); $('svg', sideFab).style.rotate = '0deg'; return; }
    animate($('svg', sideFab), [{ rotate: '0deg' }], { spring: 'snappy', fromCurrent: true });
    const done = fabItems.map((b, i) => animate(b, [{ opacity: 0, transform: 'translate(14px, 6px) scale(.7)' }], { duration: T.dur.fast, easing: T.ease.in, delay: i * 25, fromCurrent: true }));
    Promise.all(done).then(() => { if (!fabOpen) fabMenu.classList.remove('is-open'); });
  }
  sideFab.addEventListener('click', () => (fabOpen ? closeFab() : openFab()));
  fabItems.forEach(b => b.addEventListener('click', () => {
    closeFab();
    if (b.classList.contains('ai')) continueWithAI();
    else toast(`${b.textContent.trim()} adicionada ao roteiro`);
  }));

  async function continueWithAI() {
    const p = document.createElement('p');
    const text = 'Lara recua um passo. Rafael pega o envelope do chão, mas Helena já está com a certidão nas mãos.';
    p.innerHTML = text.split(' ').map(w => `<span class="w" style="opacity:0">${w} </span>`).join('');
    p.style.position = 'relative';
    const hl = document.createElement('span');
    hl.style.cssText = 'position:absolute;inset:-4px -8px;border-radius:8px;background:#3d8ef2;opacity:0;pointer-events:none';
    p.prepend(hl);
    const anchor = $$('.scene', script)[1];
    script.insertBefore(p, anchor);
    p.scrollIntoView({ block: 'center', behavior: Motion.reduced() ? 'auto' : 'smooth' });
    await animate(hl, [{ opacity: 0 }, { opacity: T.opacity.highlight }], { duration: 180, commit: true });
    for (const w of $$('.w', p)) { w.style.transition = 'opacity .2s'; w.style.opacity = 1; await wait(T.stagger.words); }
    await animate(hl, [{ opacity: 0 }], { duration: 400, fromCurrent: true });
    hl.remove(); $$('.w', p).forEach(w => w.replaceWith(w.textContent));
    haptic('success');
  }

  function editorIntro(kind) {
    animate(toolbar, [{ opacity: 0, translate: '0 24px' }, { opacity: 1, translate: '0 0' }], { spring: 'soft', delay: kind === 'shared' ? 80 : 160, commit: false });
    animate($('.side-fabs'), [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { spring: 'soft', delay: 240, commit: false });
  }

  /* =========================================================
   * ANÁLISE: sheet com drag + gráfico desenhado + count-up
   * ========================================================= */
  const sheet = $('#sheet'), dim = $('#sheetDim'), area = $('#chartArea'), scan = $('#chartScan');
  const scores = $$('.score', sheet);
  let sheetOpen = false;

  function countUp(el, to, dur, delay) {
    if (Motion.reduced()) { el.textContent = to; return; }
    const t0 = performance.now() + delay;
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = 0;
    requestAnimationFrame(step);
  }

  function openSheet() {
    if (sheetOpen) return;
    sheetOpen = true;
    haptic('light');
    dim.classList.add('is-on');
    animate(dim, [{ opacity: T.opacity.dim }], { duration: T.dur.slow, fromCurrent: true });
    animate(sheet, [{ transform: 'translateY(0px)' }], { spring: 'soft', fromCurrent: true });
    area.style.clipPath = 'inset(0 100% 0 0)';
    scores.forEach(s => { s.style.opacity = 0; });
    $$('.num i', sheet).forEach(i => { i.textContent = 0; });
    const cw = $('#chart').clientWidth;
    animate(area, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: T.dur.chart, delay: 200, easing: T.ease.inOut });
    animate(scan, [{ opacity: 0, transform: 'translateX(0)' }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { opacity: 0, transform: `translateX(${cw}px)` }], { duration: T.dur.chart, delay: 200, easing: T.ease.inOut, commit: false });
    scores.forEach((s, i) => {
      const d = 260 + i * T.stagger.chips;
      animate(s, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: d });
      const n = $('.num i', s);
      countUp(n, +n.dataset.to, 620, d);
    });
  }

  async function closeSheet(instant) {
    if (!sheetOpen) return;
    sheetOpen = false;
    dim.classList.remove('is-on');
    segClear();
    if (instant) { sheet.style.transform = 'translateY(105%)'; dim.style.opacity = 0; return; }
    animate(dim, [{ opacity: 0 }], { duration: T.dur.normal, fromCurrent: true });
    await animate(sheet, [{ transform: 'translateY(105%)' }], { duration: 280, easing: T.ease.in, fromCurrent: true });
  }
  dim.addEventListener('click', () => closeSheet());
  $('#sheetClose').addEventListener('click', () => closeSheet());

  // arrastar a folha: segue o dedo, interrompe a animação em curso, decide pela distância/velocidade
  (() => {
    let d = null;
    const begin = e => {
      if (!sheetOpen || e.target.closest('#sheetClose')) return;
      sheet.getAnimations().forEach(a => { try { a.commitStyles(); } catch {} a.cancel(); });
      const y = new DOMMatrix(getComputedStyle(sheet).transform).m42;
      d = { y0: e.clientY - y, dy: y, t: performance.now(), v: 0, id: e.pointerId };
      sheet.setPointerCapture(e.pointerId);
    };
    $('#sheetGrab').addEventListener('pointerdown', begin);
    $('#sheetHead').addEventListener('pointerdown', begin);
    sheet.addEventListener('pointermove', e => {
      if (!d || e.pointerId !== d.id) return;
      let dy = e.clientY - d.y0;
      if (dy < 0) dy = dy * .2;
      const now = performance.now();
      d.v = (dy - d.dy) / Math.max(1, now - d.t); d.dy = dy; d.t = now;
      sheet.style.transform = `translateY(${dy}px)`;
      dim.style.opacity = T.opacity.dim * clamp(1 - dy / sheet.offsetHeight, 0, 1);
    });
    const end = e => {
      if (!d || e.pointerId !== d.id) return;
      const s = d; d = null;
      if (s.dy > 140 || s.v > .6) closeSheet();
      else {
        animate(sheet, [{ transform: 'translateY(0px)' }], { spring: 'soft', fromCurrent: true });
        animate(dim, [{ opacity: T.opacity.dim }], { duration: T.dur.fast, fromCurrent: true });
      }
    };
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  })();

  /* =========================================================
   * SCRIPTTER AI
   * ========================================================= */
  const excerpt = $('#excerpt'), aiCard = $('#aiCard'), summary = $('#aiSummary'), loaderEl = $('#aiLoader');
  // loader e resumo ocupam o mesmo lugar: crossfade em vez de empurrar o layout
  const status = document.createElement('div');
  status.className = 'ai-status';
  summary.before(status); status.append(summary, loaderEl);

  const words = t => t.split(' ').map(w => `<span class="w">${w} </span>`).join('');
  function renderExcerpt() {
    excerpt.innerHTML = EXCERPT.map(b => b.k === 'scene'
      ? `<div class="blk scene">${b.html}</div>`
      : `<div class="blk ${b.k}" ${b.id ? `id="${b.id}"` : ''}><span class="hl"></span><span class="txt">${words(b.text)}</span></div>`).join('');
  }
  renderExcerpt();

  let genToken = 0, generated = false;
  async function revealWords(blk, token, per = T.stagger.words) {
    blk.classList.add('gen');
    const ws = $$('.w', blk);
    for (let i = 0; i < ws.length; i += 3) {
      if (token !== genToken) return false;
      ws.slice(i, i + 3).forEach(w => w.classList.add('on'));
      await wait(per * 3);
    }
    blk.classList.remove('gen');
    return true;
  }

  async function generate() {
    const token = ++genToken;
    renderExcerpt();
    const blocks = $$('.blk', excerpt);
    if (Motion.reduced()) { $$('.w', excerpt).forEach(w => w.classList.add('on')); generated = true; return; }
    blocks[0].style.opacity = 0;
    await animate(blocks[0], [{ opacity: 0 }, { opacity: 1 }], { duration: T.dur.normal });
    for (const b of blocks.slice(1)) if (!(await revealWords(b, token))) return;
    generated = true;
  }

  const loader = {
    timer: null,
    show(msgs) {
      const spans = $$('.msg', loaderEl);
      msgs.forEach((m, i) => { spans[i].textContent = m; });
      let k = 0;
      spans.forEach((s, i) => s.classList.toggle('is-on', i === 0));
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        spans[k].classList.remove('is-on'); k = Math.min(k + 1, spans.length - 1); spans[k].classList.add('is-on');
      }, 650);
      animate(summary, [{ opacity: 0, transform: 'translateY(-4px)' }], { duration: T.dur.fast, fromCurrent: true });
      return animate(loaderEl, [{ opacity: 0 }, { opacity: 1 }], { duration: T.dur.fast, delay: 80 });
    },
    hide() {
      clearInterval(this.timer);
      animate(loaderEl, [{ opacity: 0 }], { duration: T.dur.fast, fromCurrent: true });
    },
  };

  async function aiIntro(kind) {
    animate(aiCard, [{ opacity: 0, transform: `translateY(${T.distance.enter}px) scale(.995)` }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: kind === 'mode' ? 0 : 60 });
    const rest = [status, $('.ai-row'), ...$$('.act')];
    rest.forEach((el, i) => animate(el, [{ opacity: 0, transform: `translateY(${T.distance.nudge}px)` }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 220 + i * T.stagger.cards }));
    animate($('#aiPanel'), [{ opacity: 0, transform: `translateY(${T.distance.enter}px)` }, { opacity: 1, transform: 'none' }], { spring: 'soft', delay: 260 });
    if (!generated) {
      await loader.show(['Lendo o roteiro…', 'Construindo cenas…', 'Escrevendo o trecho…']);
      await wait(700);
      loader.hide();
      animate(summary, [{ opacity: 1, transform: 'none' }], { duration: T.dur.normal, fromCurrent: true });
      generate();
    }
  }

  let aiBusy = false;
  async function runAction(btn) {
    if (aiBusy) return;
    aiBusy = true;
    const cfg = ACTIONS[btn.dataset.act];
    if (!generated) { genToken++; renderExcerpt(); $$('.w', excerpt).forEach(w => w.classList.add('on')); generated = true; }
    haptic('light');
    // 2) o ícone reage
    animate($('.act-ico', btn), [{ rotate: '0deg', scale: '1' }, { rotate: '-14deg', scale: '1.2', offset: .4 }, { rotate: '0deg', scale: '1' }], { duration: T.dur.slow, easing: T.ease.out });
    // 3) estado de processamento
    $$('.act').forEach(a => { if (a !== btn) a.classList.add('is-muted'); a.disabled = true; });
    const busyEl = document.createElement('span');
    busyEl.className = 'busy';
    busyEl.innerHTML = '<span class="quill"><svg class="ico i18"><use href="#i-feather"/></svg></span>Processando';
    btn.append(busyEl);
    const txt = $('.act-txt', btn), ico = $('.act-ico', btn);
    animate(txt, [{ opacity: 0, transform: 'translateY(-8px)' }], { duration: T.dur.fast, fromCurrent: true });
    animate(ico, [{ opacity: 0 }], { duration: T.dur.fast, fromCurrent: true });
    animate(busyEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.normal, delay: 60, easing: T.ease.out });
    loader.show(cfg.msgs);
    // 4) a IA processa: shimmer só no trecho que será alterado
    const blk = $('#' + cfg.target), hl = $('.hl', blk), txtEl = $('.txt', blk);
    blk.classList.add('gen');
    await wait(1500);
    blk.classList.remove('gen');
    // 5) highlight temporário mostrando onde a IA trabalhou (~900ms: 0 → .12 → 0)
    hl.style.setProperty('--hl', cfg.color);
    await animate(hl, [{ opacity: 0 }, { opacity: T.opacity.highlight }], { duration: 180 });
    // 6) aplica a alteração: o texto antigo sai, o novo entra em blocos
    await animate(txtEl, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-3px)' }], { duration: 120, easing: T.ease.in, commit: false });
    txtEl.innerHTML = words(cfg.text);
    const ws = $$('.w', txtEl);
    for (let i = 0; i < ws.length; i += 3) { ws.slice(i, i + 3).forEach(w => w.classList.add('on')); await wait(36); }
    // 7) o highlight desaparece
    animate(hl, [{ opacity: 0 }], { duration: 420, delay: 120, fromCurrent: true });
    haptic('success');
    loader.hide();
    $('span', summary).textContent = cfg.summary;
    animate(summary, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 80 });
    animate(busyEl, [{ opacity: 0, transform: 'translateY(-8px)' }], { duration: T.dur.fast }).then(() => busyEl.remove());
    animate(txt, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.normal, delay: 80, easing: T.ease.out });
    animate(ico, [{ opacity: 1 }], { duration: T.dur.normal, delay: 80 });
    $$('.act').forEach(a => { a.classList.remove('is-muted'); a.disabled = false; });
    aiBusy = false;
  }
  $$('.act').forEach(b => b.addEventListener('click', () => runAction(b)));

  $('#aiExcerpt').addEventListener('click', () => {
    haptic('light');
    if (stack.at(-2) === 'editor') pop(); else push('editor');
  });
  $('#toBoard').addEventListener('click', () => { haptic('light'); push('storyboard'); });
  $('#toTimeline').addEventListener('click', () => { haptic('light'); push('timeline'); });
  $('#aiPanel .ai-panel-top').addEventListener('click', () => toast('Escreva ou fale com a Scriptter AI'));

  // Novo episódio: o card nasce do botão
  $('#newEp').addEventListener('click', async e => {
    const btn = e.currentTarget;
    haptic('light');
    await wait(80);
    const r = rel(btn), fw = W() - 32, fh = 300, fx = 16, fy = Math.round((H() - fh) / 2 - 30);
    const scrim = document.createElement('div'); scrim.className = 'ctx-scrim';
    const card = document.createElement('div'); card.className = 'ep-card';
    card.style.cssText = `left:${fx}px;top:${fy}px;width:${fw}px;height:${fh}px;transform-origin:0 0`;
    card.innerHTML = `<div class="ep-inner">
      <h3>Novo episódio</h3><p>Continua a história de “A Noiva da Herança”.</p>
      <label class="ep-field" for="epTitle">Título<input id="epTitle" value="Episódio 2 · O Testamento" autocomplete="off"></label>
      <div class="ep-actions"><button class="cancel">Cancelar</button><button class="ok">Criar episódio</button></div></div>`;
    layer.append(scrim, card);
    btn.style.visibility = 'hidden';
    const fromT = `translate(${r.x - fx}px, ${r.y - fy}px) scale(${r.w / fw}, ${r.h / fh})`;
    animate(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: T.dur.slow });
    animate(card, [{ transform: fromT, borderRadius: '120px' }, { transform: 'none', borderRadius: '26px' }], { spring: 'soft' });
    const inner = $('.ep-inner', card);
    animate(inner, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.normal, delay: 180, easing: T.ease.out });
    const dismiss = async (create) => {
      animate(scrim, [{ opacity: 0 }], { duration: T.dur.normal, fromCurrent: true });
      animate(inner, [{ opacity: 0 }], { duration: 90, fromCurrent: true });
      if (create) {
        haptic('medium');
        await animate(card, [{ opacity: 0, transform: 'translateY(-16px) scale(.94)' }], { duration: T.dur.normal, easing: T.ease.in });
      } else {
        await animate(card, [{ transform: fromT, borderRadius: '120px' }], { spring: 'standard', fromCurrent: true });
      }
      btn.style.visibility = '';
      scrim.remove(); card.remove();
      if (create) { pendingEpisode = $('#epTitle', card)?.value || 'Episódio 2'; push('timeline'); }
    };
    scrim.addEventListener('click', () => dismiss(false));
    $('.cancel', card).addEventListener('click', () => dismiss(false));
    $('.ok', card).addEventListener('click', () => dismiss(true));
  });

  /* =========================================================
   * STORYBOARD
   * ========================================================= */
  const sbList = $('#sbList');
  const frameSize = r => { const maxW = Math.min(360, W() - 30), maxH = 420; let w = maxW, h = w / r; if (h > maxH) { h = maxH; w = h * r; } return { w: Math.round(w), h: Math.round(h) }; };
  function renderBoard() {
    sbList.innerHTML = SHOTS.map((s, i) => {
      const f = FORMATS[s.f], sz = frameSize(f.r);
      return `<div class="scene-row" data-i="${i}">
        <div class="scene-meta">
          <span class="meta-pill">CENA <span class="val"><span>${s.n}</span></span></span>
          <span class="shot">SHOT</span>
          <button class="meta-pill fmt" data-press=".96" aria-label="Alterar formato">FORMATO <span class="val"><span>${f.l}</span></span></button>
        </div>
        <button class="frame" data-press="${T.scale.pressImage}" style="width:${sz.w}px;height:${sz.h}px" aria-label="Ampliar cena ${s.n}"><img src="${s.img}" alt="Quadro da cena ${s.n}"></button>
      </div>`;
    }).join('');
  }
  renderBoard();

  sbList.addEventListener('click', e => {
    const row = e.target.closest('.scene-row'); if (!row) return;
    const s = SHOTS[+row.dataset.i];
    if (e.target.closest('.fmt')) changeFormat(row, s);
    else if (e.target.closest('.frame')) openViewer(row, s);
  });

  async function changeFormat(row, s) {
    haptic('selection');
    s.f = (s.f + 1) % FORMATS.length;
    const f = FORMATS[s.f], frame = $('.frame', row), sz = frameSize(f.r);
    // o próprio quadro muda de proporção; a imagem continua centralizada (crop animado via object-fit)
    animate(frame, [{ width: frame.offsetWidth + 'px', height: frame.offsetHeight + 'px' }, { width: sz.w + 'px', height: sz.h + 'px' }], { spring: 'standard' });
    const val = $('.fmt .val', row), old = $('span', val);
    const nu = document.createElement('span'); nu.textContent = f.l; nu.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center';
    val.append(nu);
    animate(old, [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-110%)', opacity: 0 }], { duration: T.dur.normal, easing: T.ease.inOut, commit: false }).then(() => old.remove());
    await animate(nu, [{ transform: 'translateY(110%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: T.dur.normal, easing: T.ease.inOut });
    nu.style.position = ''; nu.style.inset = '';
  }

  function openViewer(row, s) {
    haptic('light');
    const frame = $('.frame', row), r = rel(frame), ratio = FORMATS[s.f].r;
    let w = W(), h = w / ratio;
    if (h > H() * .72) { h = H() * .72; w = h * ratio; }
    const x = (W() - w) / 2, y = (H() - h) / 2 - 20;
    const bg = document.createElement('div'); bg.className = 'viewer-bg';
    const box = document.createElement('div'); box.className = 'viewer-img';
    box.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:0 0;touch-action:none`;
    box.innerHTML = `<img src="${s.img}" alt="Cena ${s.n} ampliada">`;
    const cap = document.createElement('div'); cap.className = 'viewer-cap'; cap.textContent = `CENA ${s.n} · ${FORMATS[s.f].l}`;
    layer.append(bg, box, cap);
    frame.style.visibility = 'hidden';
    const fromT = () => { const rr = rel(frame); return `translate(${rr.x - x}px, ${rr.y - y}px) scale(${rr.w / w}, ${rr.h / h})`; };
    animate(bg, [{ opacity: 0 }, { opacity: .94 }], { duration: T.dur.slow });
    animate(box, [{ transform: fromT(), borderRadius: '24px' }, { transform: 'none', borderRadius: '0px' }], { spring: 'soft' });
    animate(cap, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.normal, delay: 240 });
    let d = null;
    const close = async () => {
      animate(bg, [{ opacity: 0 }], { duration: T.dur.normal, fromCurrent: true });
      animate(cap, [{ opacity: 0 }], { duration: T.dur.fast, fromCurrent: true });
      await animate(box, [{ transform: fromT(), borderRadius: '24px' }], { spring: 'standard', fromCurrent: true });
      frame.style.visibility = '';
      bg.remove(); box.remove(); cap.remove();
    };
    box.addEventListener('pointerdown', e => {
      box.getAnimations().forEach(a => { try { a.commitStyles(); } catch {} a.cancel(); });
      d = { y0: e.clientY, x0: e.clientX, dy: 0, moved: false, id: e.pointerId };
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', e => {
      if (!d || e.pointerId !== d.id) return;
      d.dy = e.clientY - d.y0; const dx = e.clientX - d.x0;
      if (Math.abs(d.dy) > 4) d.moved = true;
      const k = clamp(1 - Math.abs(d.dy) / 900, .8, 1);
      box.style.transform = `translate(${dx * .3}px, ${d.dy}px) scale(${k})`;
      bg.style.opacity = .94 * clamp(1 - Math.abs(d.dy) / 400, .2, 1);
    });
    const up = e => {
      if (!d || e.pointerId !== d.id) return;
      const s2 = d; d = null;
      if (!s2.moved || Math.abs(s2.dy) > 100) close();
      else { animate(box, [{ transform: 'none' }], { spring: 'soft', fromCurrent: true }); animate(bg, [{ opacity: .94 }], { duration: T.dur.fast, fromCurrent: true }); }
    };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    bg.addEventListener('click', close);
  }

  function boardIntro() {
    $$('.scene-row', sbList).forEach((row, i) => {
      const d = 80 + i * T.stagger.scenes;
      animate($('.scene-meta', row), [{ opacity: 0, transform: `translateY(${T.distance.item}px)` }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: d });
      animate($('.frame', row), [{ opacity: 0, transform: `translateY(${T.distance.item}px)` }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: d + 30 });
      animate($('.frame img', row), [{ opacity: 0, transform: 'scale(1.015)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.cinematic, delay: d + 30, easing: T.ease.out });
    });
  }

  /* =========================================================
   * TIMELINE: seleção, drag com spring, régua sincronizada
   * ========================================================= */
  const tlList = $('#tlList'), tlRuler = $('#tlRuler'), tlExtra = $('#tlExtra');
  let selId = null, pendingEpisode = null;
  const fmtDur = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  function renderTL() {
    tlList.innerHTML = TL.map((s, i) => `<li class="tl-item ${s.id === selId ? 'is-sel' : ''}" data-id="${s.id}">
      <span class="tl-n">${i + 1}</span>
      <span class="tl-body"><b>${s.h}</b><span>${s.s}</span></span>
      <span class="tl-dur">${fmtDur(s.d)}</span>
      <span class="tl-grip" aria-label="Arrastar para reordenar"><svg class="ico i18"><use href="#i-grip"/></svg></span></li>`).join('');
    tlRuler.innerHTML = TL.map((s, i) => `<i data-id="${s.id}" class="${s.id === selId ? 'is-on' : ''}" style="flex:${s.d} 1 0"><b>${i + 1}</b></i>`).join('');
  }
  renderTL();

  function select(item) {
    const id = +item.dataset.id;
    haptic('selection');
    const prev = $('.tl-item.is-sel', tlList);
    if (prev && prev !== item) { prev.classList.remove('is-sel'); animate(prev, [{ scale: '1' }], { spring: 'snappy', fromCurrent: true }); }
    const on = prev !== item;
    item.classList.toggle('is-sel', on);
    selId = on ? id : null;
    animate(item, [{ scale: on ? String(T.scale.select) : '1' }], { spring: 'snappy', fromCurrent: true });
    $$('i', tlRuler).forEach(b => b.classList.toggle('is-on', +b.dataset.id === selId));
  }

  function rulerFlip(mutate) {
    const before = new Map($$('i', tlRuler).map(b => [b.dataset.id, b.getBoundingClientRect().left]));
    mutate();
    $$('i', tlRuler).forEach(b => {
      const dx = before.get(b.dataset.id) - b.getBoundingClientRect().left;
      if (dx) animate(b, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { spring: 'standard', commit: false });
    });
  }

  (() => {
    let press = null, drag = null;
    tlList.addEventListener('pointerdown', e => {
      const item = e.target.closest('.tl-item'); if (!item || drag) return;
      const onGrip = !!e.target.closest('.tl-grip');
      press = { item, x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
      if (onGrip) { e.preventDefault(); startDrag(item, e); }
      else press.timer = setTimeout(() => { if (press && !press.moved) startDrag(item, e); }, 380);
    });
    tlList.addEventListener('pointermove', e => {
      if (drag && e.pointerId === drag.id) return moveDrag(e);
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) { press.moved = true; clearTimeout(press.timer); }
    });
    const up = e => {
      if (drag && e.pointerId === drag.id) { endDrag(); press = null; return; }
      if (press) { clearTimeout(press.timer); if (!press.moved) select(press.item); press = null; }
    };
    tlList.addEventListener('pointerup', up);
    tlList.addEventListener('pointercancel', up);

    function startDrag(item, e) {
      if (press) clearTimeout(press.timer);
      haptic('medium');
      const items = $$('.tl-item', tlList);
      const rects = items.map(el => el.getBoundingClientRect());
      drag = { item, items, rects, idx: items.indexOf(item), to: items.indexOf(item), y0: e.clientY, id: e.pointerId, dy: 0 };
      try { tlList.setPointerCapture(e.pointerId); } catch {}
      item.classList.add('is-drag');
      animate(item, [{ scale: String(T.scale.select) }], { spring: 'snappy', fromCurrent: true });
      items.forEach(el => { if (el !== item) el.style.transition = 'transform var(--spring-standard-dur) var(--spring-standard)'; });
      press = null;
    }
    function moveDrag(e) {
      const { item, items, rects, idx } = drag;
      drag.dy = e.clientY - drag.y0;
      item.style.transform = `translateY(${drag.dy}px)`;
      const c = rects[idx].top + rects[idx].height / 2 + drag.dy;
      let to = idx;
      rects.forEach((r, j) => { if (j < idx && c < r.top + r.height / 2) to = Math.min(to, j); if (j > idx && c > r.top + r.height / 2) to = Math.max(to, j); });
      if (to !== drag.to) haptic('selection');
      drag.to = to;
      const step = rects[idx].height + 10;
      items.forEach((el, j) => {
        if (el === item) return;
        let s = 0;
        if (idx < to && j > idx && j <= to) s = -step;
        if (to < idx && j >= to && j < idx) s = step;
        el.style.transform = s ? `translateY(${s}px)` : '';
      });
    }
    async function endDrag() {
      const { item, items, rects, idx, to } = drag;
      drag = null;
      const target = to > idx ? rects[to].bottom - rects[idx].bottom : rects[to].top - rects[idx].top;
      await animate(item, [{ transform: `translateY(${target}px)`, scale: '1' }], { spring: 'standard', fromCurrent: true, commit: false });
      const moved = TL.splice(idx, 1)[0];
      TL.splice(to, 0, moved);
      items.forEach(el => { el.style.transition = ''; el.style.transform = ''; el.style.scale = ''; });
      rulerFlip(renderTL);
      if (to !== idx) haptic('light');
    }
  })();

  function tlIntro() {
    animate(tlRuler, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 40 });
    $$('i', tlRuler).forEach((b, i) => animate(b, [{ transform: 'scaleY(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }], { spring: 'pop', delay: 120 + i * T.stagger.list }));
    $$('.tl-item', tlList).forEach((it, i) => animate(it, [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], { spring: 'gentle', delay: 100 + i * T.stagger.list, commit: false }));
    if (pendingEpisode) {
      const title = pendingEpisode; pendingEpisode = null;
      tlExtra.innerHTML = `<div class="tl-ep" style="margin-top:18px"><span>${title}</span></div>
        <ol class="tl-list"><li class="tl-item is-new"><span class="tl-n">1</span><span class="tl-body"><b>INT. CARTÓRIO - DIA</b><span>Cena inicial pronta para escrever.</span></span><span class="tl-dur">0:00</span></li></ol>`;
      const head = $('.tl-ep', tlExtra), it = $('.tl-item', tlExtra);
      it.scrollIntoView({ block: 'nearest', behavior: Motion.reduced() ? 'auto' : 'smooth' });
      animate(head, [{ opacity: 0 }, { opacity: 1 }], { duration: T.dur.normal, delay: 420 });
      animate(it, [{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { spring: 'pop', delay: 480 }).then(() => {
        haptic('success'); toast('Episódio criado');
      });
    }
  }

  /* =========================================================
   * Ciclo de vida das telas
   * ========================================================= */
  function enter(id, { kind } = {}) {
    if (id === 'home' && kind === 'jump') homeIntro();
    if (id === 'editor') editorIntro(kind);
    if (id === 'ai') aiIntro(kind);
    if (id === 'storyboard') boardIntro();
    if (id === 'timeline') tlIntro();
  }
  function leave(id) {
    if (id === 'ai') { genToken++; loader.hide(); }
    if (id === 'editor') closeFab(true);
  }
  function returned(id) {
    if (id === 'editor') segClear();
  }

  /* =========================================================
   * Painel do protótipo
   * ========================================================= */
  const hlog = $('#hlog');
  window.addEventListener('scriptter:haptic', e => {
    $('.empty', hlog)?.remove();
    const li = document.createElement('li');
    li.innerHTML = `<b>${e.detail}</b><span>${new Date().toLocaleTimeString('pt-BR', { hour12: false })}</span>`;
    hlog.prepend(li);
    animate(li, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: T.dur.fast });
    while (hlog.children.length > 6) hlog.lastChild.remove();
  });
  $('#tokens').innerHTML = [
    ...Object.entries(T.dur).map(([k, v]) => `<span>motion.${k}</span><span>${v}ms</span>`),
    ...Object.keys(T.springs).map(k => `<span>spring.${k}</span><span>${Motion.spring(k).duration}ms</span>`),
  ].join('');
  const reduceToggle = $('#reduceToggle');
  reduceToggle.checked = Motion.reduced();
  reduceToggle.addEventListener('change', () => { Motion.setReduced(reduceToggle.checked); haptic('selection'); });

  $$('#jump button').forEach(b => b.addEventListener('click', async () => {
    const j = b.dataset.jump;
    if (j === 'home') hardShow('home', ['home']);
    if (j === 'radial') { hardShow('home', ['home']); await wait(500); openRadial(); }
    if (j === 'editor') hardShow('editor', ['home', 'editor']);
    if (j === 'analysis') { hardShow('editor', ['home', 'editor']); await wait(350); segTo(segBtns[0]); openSheet(); }
    if (j === 'ai') { generated = false; hardShow('ai', ['home', 'editor', 'ai']); entry.ai = { kind: 'mode' }; }
    if (j === 'storyboard') hardShow('storyboard', ['home', 'ai', 'storyboard']);
    if (j === 'timeline') hardShow('timeline', ['home', 'ai', 'timeline']);
  }));

  // primeira entrada
  document.fonts?.ready.then(() => { tabs.forEach(t => t.classList.toggle('is-on', t.dataset.tab === 'home')); cap.style.transform = `translateX(${tabs[0].offsetLeft}px)`; });
  homeIntro();
  if (location.hash && $('#jump [data-jump="' + location.hash.slice(1) + '"]')) $('#jump [data-jump="' + location.hash.slice(1) + '"]').click();
})();
