"""Cena 01 — só o som dos objetos que aparecem na tela (rio, fogueira, roda d'água).
Sem música, sem vento, sem pássaros, sem ambiência. Gera duas versões: com narração e sem narração."""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TL = json.load(open(f'{ROOT}/timeline.json'))
SC = [s for s in TL['cenas'] if s['id'] == 'S01'][0]
T0, DUR = SC['start'], SC['end'] - SC['start']
n = int(round(DUR * SR)); t = np.arange(n) / SR
cues = json.load(open(f'{ROOT}/renders/S01/s01_cues.json'))
rng = np.random.default_rng(9)
OUT = f'{ROOT}/sound_effects/S01_objetos'; os.makedirs(OUT, exist_ok=True)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def curve(k): a = np.array(cues[k]); return np.interp(t, a[:, 0], a[:, 1])
def pan(x, p): a = (np.asarray(p) + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], 1)
def db(x): return 10 ** (x / 20)
def pink(m):
    f = np.fft.rfft(rng.standard_normal(m)); k = np.arange(len(f)); k[0] = 1; return np.fft.irfft(f / np.sqrt(k), m)
def ease(x): x = np.clip(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10)

# rio: correnteza (sem cachoeira) — segue a posição do rio na tela
rv, rp = curve('waterfall_vis'), curve('fall_pan')
flow = bp(pink(n), 180, 4500); flow /= np.abs(flow).max()
bub = bp(rng.standard_normal(n), 1200, 5000) * np.abs(bp(rng.standard_normal(n), 3, 14, 1)) * 4
rio = pan((flow * .7 + bub * .3) * (.05 + .95 * rv), rp * .7) * db(-17)

# fogueira: estalos + sopro, aparece quando a praça entra no quadro
fv, fp = curve('fire_vis'), curve('fire_pan')
cr = np.zeros(n)
for tt in np.sort(rng.uniform(0, DUR, int(DUR * 14))):
    i = int(tt * SR); L = int(SR * rng.uniform(.004, .03))
    if i + L < n: cr[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(.2, 1)
fire = bp(cr, 900, 6500) * 1.2 + lp(pink(n), 260) * .35 * (1 + .3 * np.sin(t * 7))
fogo = pan(fire / np.abs(fire).max() * fv ** 1.5, fp * .7) * db(-18)

# roda d'água: pá batendo na água a cada 1/8 de volta (1,6 rad/s) + rangido de madeira
WX, WY = 309.6, 838.8
cy = 860 + (196 - 860) * ease(t / (DUR - 1 / 24)); cx = 66 + (60 - 66) * ease(t / (DUR - 1 / 24))
sy = (WY - cy) / 640; sx = (WX - cx) / 360
wvis = np.clip(1.25 - np.abs(sy - .5) * 1.7, 0, 1); wpan = np.clip(sx * 2 - 1, -1, 1)
roda = np.zeros(n)
per = (2 * np.pi / 8) / 1.6
for k in range(int(DUR / per) + 1):
    i = int((k * per + .05) * SR); L = int(SR * .16)
    if i + L < n:
        e = np.exp(-np.arange(L) / (SR * .035))
        roda[i:i + L] += bp(rng.standard_normal(L), 400, 3000) * e * rng.uniform(.6, 1)
    if k % 4 == 0:
        L2 = int(SR * .22); j = i + int(SR * .08)
        if j + L2 < n:
            u = np.arange(L2) / SR
            f0 = rng.uniform(170, 230) * (1 + .15 * u / u[-1])
            creak = np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) * np.sin(np.pi * u / u[-1]) ** 2
            roda[j:j + L2] += bp(creak, 300, 2500) * .25
roda = pan(roda / np.abs(roda).max() * wvis, wpan * .8) * db(-19)

objs = rio + fogo + roda
fade = np.clip(t / .5, 0, 1) * np.clip((DUR - t) / .3, 0, 1)
objs *= fade[:, None]

raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{T0}', '-t', f'{DUR}', '-i', f'{ROOT}/audio/narracao_original.mp3',
                      '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
nar = np.frombuffer(raw, np.float32)[:n]; nar = np.pad(nar, (0, n - len(nar)))
speech = np.zeros(n)
for fr in TL['frases']:
    a, b = max(fr['start'] - T0, 0), min(fr['end'] - T0, DUR)
    if b > a: speech[int(a * SR):int(b * SR)] = 1
duck = db(-5 * np.clip(lp(speech, 1 / .15, 1), 0, 1))

def wav(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
for k, v in (('rio', rio), ('fogueira', fogo), ('roda_dagua', roda)): wav(f'{OUT}/{k}.wav', v * fade[:, None])
wav(f'{OUT}/mix_com_narracao.wav', objs * duck[:, None] + nar[:, None] * db(-1))
wav(f'{OUT}/mix_sem_narracao.wav', objs)
V = f'{ROOT}/renders/S01/s01_video_mudo.mp4'
for name, src in (('S01_piloto_v3_1080x1920.mp4', 'mix_com_narracao.wav'), ('S01_piloto_v3_sem_narracao_1080x1920.mp4', 'mix_sem_narracao.wav')):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', V, '-i', f'{OUT}/{src}', '-c:v', 'copy',
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11' if 'com' in src else 'loudnorm=I=-20:TP=-1.5:LRA=11',
                    '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-ar', '48000', '-shortest', '-movflags', '+faststart',
                    f'{ROOT}/renders/S01/{name}'], check=True)
print('ok')
