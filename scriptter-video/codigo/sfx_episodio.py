"""Áudio do episódio: narração original intacta + somente sons de objetos em cena (sintetizados aqui).
Sem música, sem vento, sem pássaros cantando, sem ambiência genérica."""
import glob, json, os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = f'{ROOT}/renders/EP'
SR = 48000
TL = json.load(open(f'{ROOT}/timeline.json'))
DUR = TL['cenas'][-1]['frame_out'] / 24
n = int(round(DUR * SR)); t = np.arange(n) / SR
rng = np.random.default_rng(11)
OUT = f'{ROOT}/sound_effects/EP'; os.makedirs(OUT, exist_ok=True)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def db(x): return 10 ** (x / 20)
def pink(m):
    f = np.fft.rfft(rng.standard_normal(m)); k = np.arange(len(f)); k[0] = 1; return np.fft.irfft(f / np.sqrt(k), m)
def norm(x): return x / (np.abs(x).max() + 1e-9)

EV, LV = [], {}
for fpath in sorted(glob.glob(f'{EP}/S*_sound.json')):
    d = json.load(open(fpath)); EV += d['EV']
    for k, v in d['LV'].items(): LV.setdefault(k, []).extend(v)
EV = sorted(set(tuple(e) for e in EV))

mix = np.zeros((n, 2))
def add_mono(x, start, pan, gain):
    i = int(start * SR)
    if i >= n or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:n - i]
    a = (pan + 1) * np.pi / 4
    mix[i:i + len(x), 0] += x * np.cos(a) * gain; mix[i:i + len(x), 1] += x * np.sin(a) * gain

def env(L, atk=.002, dec=.05):
    u = np.arange(L) / SR; return np.minimum(u / atk, 1) * np.exp(-u / dec)

# ---------- sons pontuais ----------
def s_step(): L = int(SR * .12); return lp(rng.standard_normal(L), 900) * env(L, .002, .025) * 1.4
def s_armorstep():
    x = s_step(); L = len(x); u = np.arange(L) / SR
    jing = sum(np.sin(2 * np.pi * f * u + rng.random() * 6) for f in rng.uniform(2400, 6200, 5)) * np.exp(-u / .04) * .18
    return x + jing
def s_bookthud(): L = int(SR * .25); return lp(rng.standard_normal(L), 500) * env(L, .002, .05) * 2 + bp(rng.standard_normal(L), 1500, 4000) * env(L, .001, .015) * .5
def s_gate():
    L = int(SR * 1.4); u = np.arange(L) / SR
    f0 = 140 + 60 * np.sin(u * 3); cr = np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) * (1 - u / u[-1])
    return bp(cr, 200, 2000) * .4 + np.r_[np.zeros(int(SR * 1.1)), lp(rng.standard_normal(L - int(SR * 1.1)), 300) * env(L - int(SR * 1.1), .002, .12) * 2]
def s_robe(): L = int(SR * .45); u = np.arange(L) / SR; return bp(rng.standard_normal(L), 500, 3500) * np.sin(np.pi * u / u[-1]) ** 2 * .6
def s_paper():
    L = int(SR * .5); u = np.arange(L) / SR
    return bp(rng.standard_normal(L), 1500, 7000) * np.sin(np.pi * u / u[-1]) * (1 + .5 * np.sin(2 * np.pi * 18 * u)) * .5
def s_tink():
    L = int(SR * .35); u = np.arange(L) / SR; f = rng.uniform(1800, 3200)
    return (np.sin(2 * np.pi * f * u) + .5 * np.sin(2 * np.pi * f * 2.7 * u)) * np.exp(-u / .06) * .35
def s_steam(): L = int(SR * .9); u = np.arange(L) / SR; return hp(rng.standard_normal(L), 3000) * np.minimum(u / .05, 1) * np.exp(-u / .35) * .35
def s_door():
    L = int(SR * .8); x = lp(rng.standard_normal(L), 260) * env(L, .002, .09) * 2.5
    rat = bp(rng.standard_normal(L), 800, 3000) * env(L, .005, .12) * .4
    return x + rat
def addv(a, b):
    L = max(len(a), len(b)); return np.pad(a, (0, L - len(a))) + np.pad(b, (0, L - len(b)))
def s_speartap(): return addv(s_bookthud() * .8, s_tink() * .6)
def s_quill():
    L = int(SR * .25); u = np.arange(L) / SR
    return bp(rng.standard_normal(L), 2500, 8000) * (np.abs(np.sin(2 * np.pi * 9 * u)) ** 2) * .5
def s_glass():
    L = int(SR * .7); u = np.arange(L) / SR
    return sum(np.sin(2 * np.pi * f * u) * np.exp(-u / d) for f, d in ((3150, .25), (4720, .18), (6100, .1))) * .25
def s_cork(): L = int(SR * .15); u = np.arange(L) / SR; return np.sin(2 * np.pi * (600 - 300 * u / u[-1]) * u) * np.exp(-u / .02) * .8
def s_rope():
    L = int(SR * .6); u = np.arange(L) / SR; f0 = 220 * (1 + .2 * u / u[-1])
    return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)), 300, 2500) * np.sin(np.pi * u / u[-1]) ** 2 * .25
def s_whoosh():
    L = int(SR * 1.2); u = np.arange(L) / SR; x = rng.standard_normal(L); y = np.zeros(L)
    for k in range(6):
        a, b = k * L // 6, (k + 1) * L // 6; c = 400 + 1600 * k / 6
        y[a:b] = bp(x, c, c * 2.5)[a:b]
    return y * np.sin(np.pi * u / u[-1]) ** 2 * .6
def s_flutter():
    L = int(SR * .6); u = np.arange(L) / SR
    return bp(rng.standard_normal(L), 300, 2500) * (np.abs(np.sin(2 * np.pi * 7 * u)) ** 3) * np.sin(np.pi * u / u[-1]) * .5
def s_cloth(): a, b = s_flutter() * 1.3, s_robe() * .8; return np.r_[a, np.zeros(max(len(b) - len(a), 0))] + np.r_[b, np.zeros(max(len(a) - len(b), 0))]
def s_gearwhir():
    L = int(SR * .8); u = np.arange(L) / SR; clicks = np.zeros(L)
    for k in range(0, L, int(SR / 26)): clicks[k:k + 80] += np.exp(-np.arange(80) / 12)
    return bp(clicks * rng.standard_normal(L) * 0 + clicks, 1500, 6000) * np.sin(np.pi * u / u[-1]) * .6
def s_leaves(): L = int(SR * .8); u = np.arange(L) / SR; return bp(rng.standard_normal(L), 1500, 7000) * np.abs(bp(rng.standard_normal(L), 4, 20, 1)) * 3 * np.sin(np.pi * u / u[-1]) * .5

SYN = dict(step=s_step, armorstep=s_armorstep, bookthud=s_bookthud, gate=s_gate, robe=s_robe, paper=s_paper, tink=s_tink, steam=s_steam,
           door=s_door, speartap=s_speartap, quill=s_quill, glass=s_glass, cork=s_cork, rope=s_rope, whoosh=s_whoosh, flutter=s_flutter,
           cloth=s_cloth, gearwhir=s_gearwhir, leaves=s_leaves)
LEVEL_DB = dict(step=-20, armorstep=-19, bookthud=-16, gate=-15, robe=-20, paper=-17, tink=-20, steam=-22, door=-12, speartap=-16,
                quill=-20, glass=-16, cork=-16, rope=-18, whoosh=-18, flutter=-22, cloth=-18, gearwhir=-18, leaves=-20)
for (tt, kind, pan, gain) in EV:
    if kind in SYN: add_mono(norm(SYN[kind]()), tt, pan, gain * db(LEVEL_DB[kind]))

# ---------- contínuos guiados pelos níveis por quadro ----------
def curve(kind):
    a = np.array(sorted(LV.get(kind, [])))
    if len(a) == 0: return np.zeros(n), np.zeros(n)
    lvl = np.zeros(n); pn = np.zeros(n)
    # só onde existem amostras (zero fora das cenas onde o objeto aparece)
    ts = a[:, 0]
    m = (t >= ts.min()) & (t <= ts.max() + 1 / 24)
    lvl[m] = np.interp(t[m], ts, a[:, 1]); pn[m] = np.interp(t[m], ts, a[:, 2])
    # cortes entre cenas: zera trechos sem amostra por mais de 0,1 s
    idx = np.searchsorted(ts, t[m]); gaps = np.zeros(m.sum(), bool)
    prev = ts[np.clip(idx - 1, 0, len(ts) - 1)]; nxt = ts[np.clip(idx, 0, len(ts) - 1)]
    gaps = (nxt - prev) > .1
    tmp = lvl[m]; tmp[gaps] = 0; lvl[m] = tmp
    return lp(lvl, 6, 1), pn
def add_cont(x, kind, gain_db):
    l, p = curve(kind)
    a = (np.clip(p, -1, 1) * .75 + 1) * np.pi / 4
    mix[:, 0] += x * l * np.cos(a) * db(gain_db); mix[:, 1] += x * l * np.sin(a) * db(gain_db)

flow = norm(bp(pink(n), 180, 4500)) * .7 + norm(bp(rng.standard_normal(n), 1200, 5000) * np.abs(bp(rng.standard_normal(n), 3, 14, 1))) * .3
add_cont(flow, 'river', -17)
def crackle(rate, lo, hi):
    cr = np.zeros(n)
    for tt in rng.uniform(0, DUR, int(DUR * rate)):
        i = int(tt * SR); L = int(SR * rng.uniform(.004, .03))
        if i + L < n: cr[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(.2, 1)
    return norm(bp(cr, lo, hi) * 1.2 + lp(pink(n), 260) * .3)
add_cont(crackle(14, 900, 6500), 'fire', -18)
add_cont(crackle(10, 1200, 7000), 'torch', -22)
add_cont(crackle(4, 2000, 8000) * .6, 'candle', -26)
wheel = np.zeros(n); per = (2 * np.pi / 8) / 1.6
for k in range(int(DUR / per)):
    i = int((k * per) * SR); L = int(SR * .16)
    if i + L < n: wheel[i:i + L] += bp(rng.standard_normal(L), 400, 3000) * np.exp(-np.arange(L) / (SR * .035))
add_cont(norm(wheel), 'wheel', -19)
gears = np.zeros(n)
for i in range(0, n - 200, int(SR / 11)):
    gears[i:i + 200] += np.exp(-np.arange(200) / 25) * (1 if (i // int(SR / 11)) % 2 else .6)
gears = norm(bp(gears + rng.standard_normal(n) * .02, 800, 6000))
add_cont(gears, 'gears', -17)
crys = (np.sin(2 * np.pi * 523.25 * t) + .6 * np.sin(2 * np.pi * 784 * t + 1) + .3 * np.sin(2 * np.pi * 1046.5 * t)) * (.7 + .3 * np.sin(2 * np.pi * .7 * t))
crys = crys * .5 + bp(rng.standard_normal(n), 5000, 9000) * .2
add_cont(norm(crys), 'crystal', -28)
pr = np.zeros(n)
for i in range(0, n - 400, int(SR / 9)): pr[i:i + 400] += rng.standard_normal(400) * np.exp(-np.arange(400) / 60)
pr = norm(bp(pr, 600, 5000)) + norm(bp(rng.standard_normal(n), 2000, 7000)) * .25
add_cont(norm(pr), 'printer', -18)
crowd = np.zeros(n)
for tt in rng.uniform(0, DUR, int(DUR * 60)):
    i = int(tt * SR); L = int(SR * .1)
    if i + L < n: crowd[i:i + L] += lp(rng.standard_normal(L), 1100) * np.exp(-np.arange(L) / (SR * .02)) * rng.uniform(.2, 1)
add_cont(norm(crowd), 'crowdsteps', -20)

objs = mix.copy()
# narração intacta (sem corte, sem aceleração), começando em 0
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{ROOT}/audio/narracao_original.mp3', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                     capture_output=True).stdout
nar = np.frombuffer(raw, np.float32); nar = np.pad(nar, (0, max(n - len(nar), 0)))[:n]
speech = np.zeros(n)
for fr in TL['frases']: speech[int(fr['start'] * SR):int(fr['end'] * SR)] = 1
duck = db(-5 * np.clip(lp(speech, 1 / .15, 1), 0, 1))
fade = np.clip(t / .3, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)

def wav(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
wav(f'{OUT}/objetos.wav', objs * fade[:, None])
wav(f'{OUT}/mix_com_narracao.wav', (objs * duck[:, None]) * fade[:, None] + nar[:, None] * db(-1))
print('eventos', len(EV), 'contínuos', sorted(LV.keys()), 'dur', DUR)
V = f'{EP}/episodio_mudo.mp4'
for name, src, ln in (('Scriptter_Episodio_1080x1920.mp4', 'mix_com_narracao.wav', 'loudnorm=I=-14:TP=-1.5:LRA=11'),
                      ('Scriptter_Episodio_sem_narracao_1080x1920.mp4', 'objetos.wav', 'loudnorm=I=-20:TP=-1.5:LRA=11')):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', V, '-i', f'{OUT}/{src}', '-c:v', 'copy', '-af', ln, '-c:a', 'aac', '-b:a', '256k',
                    '-ac', '2', '-ar', '48000', '-shortest', '-movflags', '+faststart', f'{ROOT}/final/{name}'], check=True)
print('ok')
