# Efeitos sonoros do Episódio 4 (sem música): sons do próprio jogo (Kenney CC0 + lareira domínio público) e sintetizados.
import numpy as np, subprocess, sys, os, wave
SR = 48000; DUR = 83.0; N = int(SR * DUR)
SFX = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../eryon-online/public/sfx')
out = np.zeros((N, 2), np.float32); rng = np.random.default_rng(4)
def load(name):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(SFX, name + '.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
S = {n: load(n) for n in ['fire', 'chop', 'wood_hit', 'creak', 'door_open', 'sword_draw', 'slash', 'pot', 'coins', 'whoosh', 'anvil_0', 'anvil_1', 'step_grass_0', 'step_grass_1', 'step_grass_2', 'step_grass_3']}
def put(sig, t, vol=1.0, pan=0.0, rate=1.0):
    if rate != 1.0: idx = np.arange(0, len(sig) - 1, rate); sig = np.interp(idx, np.arange(len(sig)), sig).astype(np.float32)
    i = int(t * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    seg = sig[: j - i] * vol; out[i:j, 0] += seg * (1 - max(0, pan)); out[i:j, 1] += seg * (1 + min(0, pan))
def env(n, a, r): e = np.ones(n, np.float32); a = max(1, int(a * SR)); r = max(1, int(r * SR)); e[:a] = np.linspace(0, 1, a); e[-r:] = np.linspace(1, 0, r); return e
def band(dur, lo, hi):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n).astype(np.float32); return y / (np.abs(y).max() + 1e-9)
def bed(sig, t0, t1, vol, fade=.6):
    n = int((t1 - t0) * SR); reps = np.tile(sig, n // len(sig) + 1)[:n]; put(reps * env(n, fade, fade), t0, vol)
def chime(t, f0=880, vol=.12):
    n = int(1.4 * SR); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f0 * m * tt) * np.exp(-tt * (3 + i)) / (i + 1) for i, m in enumerate([1, 1.5, 2, 3])); put(s.astype(np.float32) * vol, t, 1, rng.uniform(-.4, .4))
def steps(t0, t1, every=.36, vol=.35):
    t = t0; k = 0
    while t < t1: put(S['step_grass_' + str(k % 4)], t, vol * rng.uniform(.7, 1), rng.uniform(-.3, .3), rng.uniform(.92, 1.08)); t += every * rng.uniform(.85, 1.15); k += 1
def thud(t, vol=.6):   # passo pesado do gigante
    n = int(.8 * SR); tt = np.arange(n) / SR; s = np.sin(2 * np.pi * (60 - 30 * tt) * tt) * np.exp(-tt * 6) + band(.8, 40, 300) * np.exp(-tt * 9) * .6; put(s.astype(np.float32) * vol, t)
def roar(t, dur=2.0, vol=.3, f0=22):
    n = int(dur * SR); s = band(dur, 80, 700) * env(n, .25, 1.0) * (1 + .5 * np.sin(np.arange(n) / SR * 2 * np.pi * f0)); put(s.astype(np.float32), t, vol)
def zap(t, vol=.35):
    n = int(.5 * SR); s = band(.5, 1500, 9000) * np.exp(-np.arange(n) / SR * 7); put(s.astype(np.float32), t, vol); thud(t + .05, .25)
def boom(t, vol=.5):
    n = int(1.6 * SR); tt = np.arange(n) / SR; s = band(1.6, 30, 900) * np.exp(-tt * 3); put(s.astype(np.float32), t, vol)
def pop(t, vol=.25):
    n = int(1.2 * SR); tt = np.arange(n) / SR; s = band(1.2, 400, 6000) * np.exp(-tt * 5) * .6 + band(1.2, 60, 400) * np.exp(-tt * 9); put(s.astype(np.float32), t, vol, rng.uniform(-.5, .5))
wind = band(8, 120, 900); murmur = band(6, 250, 1400) * (0.6 + 0.4 * np.abs(np.sin(np.arange(6 * SR) / SR * 3.1))); cheer = band(4, 300, 3000) * (0.5 + 0.5 * np.abs(np.sin(np.arange(4 * SR) / SR * 5.3)))
# 01–02 · sobrevoo e cidade viva
bed(wind, 0, 19.4, .06, 1.5); bed(S['fire'], 0, 10, .10); put(S['coins'], 5.2, .3); chime(8.15, 784, .10)
put(S['whoosh'], 10.0, .3, 0, .7); put(S['whoosh'], 11.75, .3, 0, .9); put(S['door_open'], 13.95, .35); bed(murmur, 13.95, 14.8, .12, .15); put(S['pot'], 14.3, .3)
put(S['coins'], 14.9, .3, .3); put(S['coins'], 15.3, .25, -.3); bed(murmur, 15.7, 19.4, .07, .5); steps(17.0, 19.0, .34, .3)
for k in range(3): put(S['chop'], 2.5 + k * 3.2, .12, -.4)
# 03 · ataque
drone_n = int(5 * SR); tt = np.arange(drone_n) / SR; put(((np.sin(2 * np.pi * 55 * tt) + .5 * np.sin(2 * np.pi * 82.4 * tt)) * env(drone_n, 1.5, 1.0)).astype(np.float32), 19.5, .12)
bed(murmur, 20.8, 24.0, .14, .4); steps(19.6, 23.8, .18, .32); bed(wind, 19.4, 57, .07, 1.0)
for t in np.arange(24.0, 27.0, 1 / 2.2): thud(t, .7)
roar(25.4, 1.8, .22, 14); bed(S['fire'], 26.9, 30, .35, .3); roar(27.6, 1.6, .2, 30)
put(S['whoosh'], 29.9, .5, -.3, .5); put(S['whoosh'], 30.6, .45, .3, .55); roar(30.8, 2.0, .3); bed(band(2, 200, 3000), 31.4, 32.8, .2, .2)
# 04 · o rei
put(S['sword_draw'], 34.4, .55); [put(S['slash'], t, .3) for t in np.arange(35.6, 39, 1.6)]; bed(murmur, 37.0, 39.9, .1, .3); steps(37.0, 39.6, .2, .3)
gal = np.zeros(int(.3 * SR), np.float32)
for t in np.arange(40.1, 45.8, .21): put(S['step_grass_' + str(int(t * 10) % 4)], t, .45, 0, .7)
# 06 · batalha
for t in [46.1, 46.5, 47.0, 47.6, 48.1, 48.4, 48.7, 49.2, 50.2, 50.9, 51.5, 52.0, 52.3]: put(S['slash'], t, .45, rng.uniform(-.4, .4)); put(S['anvil_' + str(int(t) % 2)], t + .03, .25)
for t in np.arange(46.84, 53.4, 1.5): zap(t + .05, .3)
for t in np.arange(47.4, 53.4, .45): put(S['whoosh'], t, .18, rng.uniform(-.5, .5), 1.6)
bed(S['fire'], 45.8, 53.8, .25, .4); roar(47.0, 1.4, .25); roar(50.0, 1.4, .2, 16)
for t in np.arange(45.9, 52.4, 1 / 1.2): thud(t, .35)
bed(murmur, 45.8, 52.4, .08, .4)
# vitória
boom(52.4, .6); thud(52.5, .9); boom(53.0, .45); roar(53.4, 1.6, .35, 40); boom(54.6, .7)
bed(cheer, 53.5, 57.0, .16, .6); chime(53.5, 659, .12); chime(53.7, 988, .12)
# 07 · festa (sem música: alegria, taverna, fogos)
bed(cheer, 57.0, 66.0, .12, .8); bed(S['fire'], 57.0, 66.0, .22, .8)
for t in np.arange(57.3, 65.6, .8): pop(t + rng.uniform(0, .3), .22)
put(S['door_open'], 59.5, .35); bed(murmur, 59.5, 61.3, .18, .2); put(S['pot'], 59.9, .3); put(S['coins'], 60.6, .3)
bed(cheer, 62.7, 65.6, .2, .4)
# mistérios
put(S['whoosh'], 65.75, .35, 0, .7); dn = int(3.2 * SR); tt = np.arange(dn) / SR; put(((np.sin(2 * np.pi * 110 * tt) + .4 * np.sin(2 * np.pi * 164.8 * tt)) * env(dn, .8, 1.2)).astype(np.float32), 65.9, .1); chime(66.6, 523, .1); chime(67.4, 392, .1)
# 08 · meta e convite
bed(wind, 69.0, 72.4, .07, .8); chime(69.8, 784, .1); bed(murmur, 72.4, 77.2, .08, .6); steps(72.6, 77.0, .5, .2)
put(S['whoosh'], 77.26, .3, 0, .9); steps(77.3, 78.9, .36, .3); [put(S['chop'], 79.2 + k * .56, .4) for k in range(3)]; steps(80.2, 81.4, .36, .3)
chime(81.7, 784, .12); put(S['coins'], 81.9, .3)
peak = np.abs(out).max(); out *= (0.9 / peak) if peak > .9 else 1.0
w = wave.open(sys.argv[1], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close(); print('sfx ok', DUR, 's')
