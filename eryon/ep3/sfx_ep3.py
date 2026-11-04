# Efeitos sonoros do Episódio 3 (sem música). Usa os sons do próprio jogo (Kenney CC0 + lareira domínio público)
# e alguns sintetizados (vento, burburinho, pedra arrastando, zumbido). Saída: WAV estéreo 48 kHz.
import numpy as np, subprocess, sys, os
SR = 48000; DUR = 116.6; N = int(SR * DUR)
SFX = os.path.join(os.path.dirname(__file__), '../../eryon-online/public/sfx')
out = np.zeros((N, 2), np.float32); rng = np.random.default_rng(3)
def load(name):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(SFX, name + '.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()
S = {n: load(n) for n in ['fire', 'chop', 'wood_hit', 'creak', 'door_open', 'door_close', 'sword_draw', 'slash', 'pot', 'coins', 'whoosh', 'anvil_0', 'step_grass_0', 'step_grass_1', 'step_grass_2', 'step_grass_3', 'step_wood_0', 'step_wood_1']}
def put(sig, t, vol=1.0, pan=0.0, rate=1.0):
    if rate != 1.0: idx = np.arange(0, len(sig) - 1, rate); sig = np.interp(idx, np.arange(len(sig)), sig).astype(np.float32)
    i = int(t * SR); j = min(N, i + len(sig)); 
    if i >= N or j <= i: return
    seg = sig[: j - i] * vol; out[i:j, 0] += seg * (1 - max(0, pan)); out[i:j, 1] += seg * (1 + min(0, pan))
def env(n, a, r): e = np.ones(n, np.float32); a = int(a * SR); r = int(r * SR); e[:a] = np.linspace(0, 1, a); e[-r:] = np.linspace(1, 0, r); return e
def noise_band(dur, lo, hi):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, n).astype(np.float32); return y / (np.abs(y).max() + 1e-9)
def bed(sig, t0, t1, vol, fade=.6):
    n = int((t1 - t0) * SR); reps = np.tile(sig, n // len(sig) + 1)[:n]; put(reps * env(n, fade, fade), t0, vol)
def chime(t, f0=880, vol=.12):
    n = int(1.4 * SR); tt = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f0 * m * tt) * np.exp(-tt * (3 + i)) / (i + 1) for i, m in enumerate([1, 1.5, 2, 3])); put(s.astype(np.float32) * vol, t, 1, rng.uniform(-.4, .4))
def steps(t0, t1, every=.36, vol=.35, wood=False):
    t = t0; k = 0
    while t < t1: put(S[('step_wood_' if wood else 'step_grass_') + str(k % (2 if wood else 4))], t, vol * rng.uniform(.7, 1), rng.uniform(-.3, .3), rng.uniform(.92, 1.08)); t += every * rng.uniform(.85, 1.15); k += 1
wind = noise_band(8, 120, 900); murmur = noise_band(6, 250, 1400) * (0.6 + 0.4 * np.abs(np.sin(np.arange(6 * SR) / SR * 3.1)))
forest = noise_band(8, 200, 2500)
# 01–03 · vila: fogueira, vento, passos dos que chegam
bed(S['fire'], 0, 11.4, .22); bed(wind, 0, 26, .05, 1.5); steps(4.9, 8.6, .3, .3)
put(S['whoosh'], 11.55, .35, 0, .7); put(S['whoosh'], 14.6, .25, 0, .9)
put(S['creak'], 15.1, .25); put(S['door_open'], 16.2, .35, -.3); put(S['door_close'], 16.9, .25, .3)
bed(murmur, 16.86, 18.5, .10, .2); put(S['door_open'], 17.48, .4); put(S['pot'], 17.75, .3, .2); put(S['coins'], 18.05, .25, -.2)
put(S['coins'], 18.6, .35, .3); put(S['coins'], 19.05, .25, -.3); put(S['anvil_0'], 19.3, .18)
steps(19.5, 21.4, .28, .28); bed(S['fire'], 21.4, 26.4, .12)
# 04 · praça cheia e a candidatura
bed(murmur, 26.4, 38.2, .09, .8); bed(S['fire'], 26.4, 38.2, .2); steps(27.5, 30.8, .4, .3)
# 05 · a guilda: espada, aventureiros chegando, King
put(S['sword_draw'], 39.25, .5)
for t in np.arange(39.0, 50.0, 2.8): put(S['slash'], t + .25, .35, -.1)
steps(39.6, 42.4, .3, .32); steps(45.4, 48.0, .34, .38); bed(murmur, 38.2, 50.2, .06, .8)
# transição para os mistérios: floresta
put(S['whoosh'], 50.4, .35, 0, .8); bed(forest, 50.4, 59.0, .05, 1.0); steps(54.6, 58.6, .5, .2)
# Blü no cemitério / Xamã no círculo
put(S['whoosh'], 59.1, .3, 0, 1.2); bed(wind, 59.2, 63.3, .09, .6)
for t in np.arange(59.3, 63.2, 1.6): chime(t, 330, .10)
put(S['whoosh'], 63.3, .3, 0, 1.2); bed(forest, 63.4, 68.2, .05, .6)
for t in np.arange(63.5, 67.6, 1.6): chime(t, 523, .09)
# guardas no castelo
put(S['whoosh'], 68.2, .25); bed(wind, 68.3, 70.8, .07, .4); steps(68.3, 70.8, .42, .35)
# 07 · exploradores e a passagem secreta
put(S['whoosh'], 70.9, .3, 0, .8); bed(forest, 71.0, 83.5, .06, 1.0); steps(71.0, 77.2, .38, .3)
rumble = noise_band(2.2, 30, 220) * env(int(2.2 * SR), .2, .9); put(rumble, 79.6, .55); bed(noise_band(1.2, 1500, 6000), 79.7, 80.9, .06, .3); chime(80.7, 660, .13)
drone_n = int(5.2 * SR); tt = np.arange(drone_n) / SR; drone = (np.sin(2 * np.pi * 55 * tt) + .5 * np.sin(2 * np.pi * 82.4 * tt)) * env(drone_n, 1.5, 1.2); put(drone.astype(np.float32), 83.2, .12)
# 08 · o jogo online
put(S['whoosh'], 88.8, .35, 0, .9); chime(89.9, 988, .10)
bed(S['fire'], 88.8, 104.8, .14); steps(88.9, 92.4, .36, .3)
for t in np.arange(92.6, 96.4, 2.4): [put(S['chop'], t + .32 + k * .56, .45) for k in range(3)]; 
put(S['wood_hit'], 96.2, .3); steps(97.1, 104.5, .4, .3)
put(S['whoosh'], 101.4, .45, -.2, .6); put(S['whoosh'], 102.1, .35, .2, .55)
roar = noise_band(2.0, 80, 700) * env(int(2.0 * SR), .25, 1.2) * (1 + .5 * np.sin(np.arange(int(2.0 * SR)) / SR * 2 * np.pi * 22)); put(roar.astype(np.float32), 101.6, .22)
# cartela final e visão geral
chime(105.1, 784, .12); put(S['coins'], 105.3, .3); bed(wind, 107.9, 116.6, .06, 1.5); bed(S['fire'], 107.9, 116.6, .08, 1.5)
peak = np.abs(out).max(); out *= (0.9 / peak) if peak > .9 else 1.0
import wave; w = wave.open(sys.argv[1], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); w.close(); print('sfx ok', DUR, 's')
