/**
 * Exporta um episódio como vídeo vertical 1080x1920 (pixel art ampliada 3x sem
 * interpolação) com a narração. Avança o jogo quadro a quadro com tempo fixo,
 * então o resultado é fluido mesmo em máquinas lentas.
 *
 *   npm run dev   (em outro terminal)
 *   node scripts/render-video.cjs ep01 out.mp4 [fps=30] [url=http://localhost:5173]
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [, , ep = 'ep01', out = `${ep}.mp4`, fpsArg = '30', base = 'http://localhost:5173'] = process.argv;
  const fps = Number(fpsArg);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(`${base}/?ep=${ep}&autostart=1&capture=1&clean=1`);
  await page.waitForFunction(() => window.game && window.game.scene.getScene('Episode') && window.game.scene.getScene('Episode').running, null, { timeout: 60000 });
  const info = await page.evaluate(() => {
    const s = window.game.scene.getScene('Episode');
    window.game.loop.sleep();
    window.__captureTime = 0;
    return { duration: s.timeline.duration, audio: s.manifest.audio ? `public/episodes/${s.manifest.id}/${s.manifest.audio}` : null };
  });
  const frames = Math.ceil(info.duration * fps);
  const audio = info.audio && require('fs').existsSync(info.audio) ? info.audio : null;
  console.log(`renderizando ${frames} quadros (${info.duration}s @ ${fps}fps)${audio ? ' + ' + audio : ''}`);

  const args = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (audio) args.push('-i', audio);
  args.push('-vf', 'scale=1080:1920:flags=neighbor', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (audio) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push(path.resolve(out));
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });

  const dt = 1000 / fps;
  const t0 = await page.evaluate(() => performance.now());
  for (let i = 0; i < frames; i++) {
    await page.evaluate(([i, dt, t0, fps]) => {
      window.__captureTime = i / fps;
      window.__captureDelta = dt;
      window.game.step(t0 + i * dt, dt);
    }, [i, dt, t0, fps]);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) console.log(`  ${(i / fps).toFixed(0)}s / ${info.duration}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('pronto:', out);
})();
