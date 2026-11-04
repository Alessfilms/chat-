const { chromium } = require('playwright'); const path = require('path'), http = require('http'), fs = require('fs');
const GAME = path.join(__dirname, '../../eryon-online/public');
const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { s.writeHead(404); return s.end('{}'); } const f = path.join(GAME, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : f.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream' }); s.end(d); }); }).listen(4011);
(async () => { const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  await pg.goto('http://localhost:4011/?cine=1'); await pg.waitForFunction(() => window.ready === true);
  const url = await pg.evaluate(async () => {
    await document.fonts.load('400 20px P2P'); await document.fonts.load('700 20px Pix');
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    // fundo: chão do mapa (Floresta de Outono, onde fica a estátua), escurecido
    x.drawImage(villageLayer, 1080, 250, 270, 338, 0, 0, W, H); x.fillStyle = 'rgba(8,10,16,.72)'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(330, 640, 40, 330, 640, 560); g.addColorStop(0, 'rgba(80,200,230,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const T = (s, X, Y, font, col, al = 'left', lw = 6) => { x.font = font; x.textAlign = al; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; x.lineWidth = lw; x.strokeStyle = '#140e06'; x.strokeText(s, X, Y); x.fillStyle = col; x.fillText(s, X, Y); };
    const box = (X, Y, w, h) => { x.fillStyle = 'rgba(12,20,16,.88)'; x.fillRect(X, Y, w, h); x.strokeStyle = '#c9a46a'; x.lineWidth = 4; x.strokeRect(X + 2, Y + 2, w - 4, h - 4); x.strokeStyle = '#060b0a'; x.lineWidth = 2; x.strokeRect(X, Y, w, h); };
    // título
    T('ERYON · CONCEITO DE PERSONAGEM', 60, 78, '700 30px Pix, monospace', '#9ff3ff', 'left', 5);
    T('O GIGANTE', 60, 150, '400 54px P2P, monospace', '#ffd84a', 'left', 10); T('DE PEDRA', 60, 222, '400 54px P2P, monospace', '#ffd84a', 'left', 10);
    // arte principal (sprite do jogo ampliado 7x) com brilho nos olhos
    const s = giantSprite(0), K = 7, gx = 70, gy = 300;
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(gx + 38 * K, gy + 92 * K, 32 * K, 7 * K, 0, 0, 6.283); x.fill();
    x.drawImage(s.r, gx, gy, s.W * K, s.H * K);
    x.globalCompositeOperation = 'lighter'; for (const ex of [33, 43]) { const eg = x.createRadialGradient(gx + ex * K, gy + 15 * K, 2, gx + ex * K, gy + 15 * K, 60); eg.addColorStop(0, 'rgba(159,243,255,.9)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = eg; x.fillRect(gx + ex * K - 60, gy + 15 * K - 60, 120, 120); } x.globalCompositeOperation = 'source-over';
    // anotações apontando partes
    const note = (tx, ty, px2, py2, lines) => { x.strokeStyle = '#ffd84a'; x.lineWidth = 3; x.beginPath(); x.moveTo(px2, py2); x.lineTo(tx - 10, ty - 10); x.stroke(); x.fillStyle = '#ffd84a'; x.fillRect(px2 - 5, py2 - 5, 10, 10); lines.forEach((l, i) => T(l, tx, ty + i * 30, '700 25px Pix, monospace', i ? '#fff3b0' : '#ffd84a', 'left', 5)); };
    note(640, 300, gx + 46 * K, gy + 15 * K, ['Olhos azuis', 'a mesma magia da', 'Estátua do Gigante']);
    note(640, 450, gx + 52 * K, gy + 40 * K, ['Corpo de rocha', 'com musgo de séculos', 'de sono na floresta']);
    note(640, 600, gx + 64 * K, gy + 66 * K, ['Punhos de pedra', 'pisa e esmaga', 'as construções']);
    // quadros de animação
    box(40, 1000, 540, 300); T('ANIMAÇÃO', 60, 1040, '700 26px Pix, monospace', '#ffd84a', 'left', 5);
    ['Andando', 'Andando', 'Braços erguidos', 'Pancada'].forEach((lbl, i) => { const f = giantSprite(i), k2 = 1.6; x.drawImage(f.r, 52 + i * 132, 1060, f.W * k2, f.H * k2); T(lbl, 52 + i * 132 + f.W * k2 / 2, 1288, '700 18px Pix, monospace', '#fff3b0', 'center', 4); });
    // escala
    box(600, 1000, 440, 300); T('ESCALA', 620, 1040, '700 26px Pix, monospace', '#ffd84a', 'left', 5);
    const k3 = 2.2, base = 1278; x.drawImage(giantSprite(0).r, 620, base - 96 * k3, 76 * k3, 96 * k3);
    x.drawImage(HOUSE_SPR[0], 800, base - HOUSE_SPR[0].height * k3, HOUSE_SPR[0].width * k3, HOUSE_SPR[0].height * k3);
    const ch = charFor('morador', { hair: '#d0622a', shirt: '#3f7ab0', pants: '#1d3550', skin: '#f2c9a4' }); const fr = ch.frame({ legs: 'stand', arm: 'down', eyes: 0, br: 0 }); x.drawImage(fr.c, 900, base - fr.ay * k3, fr.c.width * k3, fr.c.height * k3);
    T('morador', 930, 1295, '700 16px Pix, monospace', '#fff3b0', 'center', 3); T('casa', 830, 1295, '700 16px Pix, monospace', '#fff3b0', 'center', 3); T('gigante', 700, 1295, '700 16px Pix, monospace', '#fff3b0', 'center', 3);
    // ficha
    box(600, 690, 440, 290); T('FICHA', 620, 730, '700 26px Pix, monospace', '#ffd84a', 'left', 5);
    ['Origem: Estátua do Gigante', '(Floresta de Outono)', 'Vida: cresce com os moradores', 'online na hora do ataque', 'Fraco contra: catapultas,', 'lanças e o raio do Mago', 'Nunca apaga construções:', 'só racha e põe fogo'].forEach((l, i) => T(l, 620, 768 + i * 27, '700 21px Pix, monospace', i % 2 ? '#c3cad6' : '#fff8e0', 'left', 4));
    // paleta
    T('PALETA', 640, 238, '700 22px Pix, monospace', '#ffd84a', 'left', 4);
    ['#14161c', '#3e4554', '#5a6272', '#7a8396', '#9aa4b4', '#2f6a3a', '#66b350', '#9ff3ff'].forEach((col, i) => { x.fillStyle = '#060b0a'; x.fillRect(780 + i * 32 - 2, 218 - 2, 28, 28); x.fillStyle = col; x.fillRect(780 + i * 32, 218, 24, 24); });
    return c.toDataURL('image/png'); });
  fs.writeFileSync(path.join(__dirname, 'gigante_conceito.png'), Buffer.from(url.split(',')[1], 'base64')); await b.close(); srv.close(); console.log('ok'); })();
