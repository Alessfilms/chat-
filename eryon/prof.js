const { chromium } = require('playwright'); const serve = require('./serve.js');
(async () => {
  const srv = await serve(8767);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:8767/index.html?scale=${process.env.SCALE||1}&msaa=${process.env.MSAA||4}`); await p.waitForFunction(() => window.ready, null, { timeout: 600000 });
  const r = await p.evaluate(() => {
    const { renderer, scene, camera, post, sun } = window.ctx; const gl = renderer.getContext(); const px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const T = {}; const tm = (k, f) => { sync(); const t = performance.now(); f(); sync(); T[k] = Math.round(performance.now() - t); };
    window.debugRender([60, 70, 110], [0, 14, 0], 125);
    tm('full', () => window.debugRender([60, 70, 110], [0, 14, 0], 125));
    renderer.shadowMap.autoUpdate = false;
    tm('noShadowUpdate', () => window.debugRender([60, 70, 110], [0, 14, 0], 125));
    renderer.shadowMap.autoUpdate = true;
    tm('sceneOnly', () => { renderer.setRenderTarget(post.scene); renderer.render(scene, camera); });
    tm('post', () => post.run(renderer, { time: 0 }));
    T.calls = renderer.info.render.calls; T.tris = renderer.info.render.triangles;
    return T;
  });
  console.log(JSON.stringify(r)); await b.close(); srv.close();
})();
