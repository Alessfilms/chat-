"""SFX originais da Cena 01 (síntese procedural — sem música, sem samples de terceiros).
Gera stems + mix com a narração e faz o mux do teste vertical."""
import json, os, subprocess
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TL = json.load(open(f'{ROOT}/timeline.json'))
SC = [s for s in TL['cenas'] if s['id'] == 'S01'][0]
T0, T1 = SC['start'], SC['end']
DUR = T1 - T0
n = int(round(DUR * SR))
t = np.arange(n) / SR
cues = json.load(open(f'{ROOT}/renders/S01/s01_cues.json'))
rng = np.random.default_rng(5)
OUT = f'{ROOT}/sound_effects/S01'; os.makedirs(OUT, exist_ok=True)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def curve(name):
    a = np.array(cues[name]); return np.interp(t, a[:, 0], a[:, 1])
def smooth(env, sec): return lp(np.pad(env, (0, 0)), 1 / sec, 1)
def pan(x, p):  # p em [-1,1], lei de potência constante
    a = (np.asarray(p) + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], 1)
def db(x): return 10 ** (x / 20)
def pink(m):
    w = rng.standard_normal(m); f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), m)

stems = {}
# vento: base grave + farfalhar de folhas, rajadas lentas; folhagem mais forte enquanto a copa está perto
gust = smooth(np.interp(t, np.linspace(0, DUR, 9), 0.5 + 0.5 * rng.random(9)), 1.2)
canopy = np.clip(curve('canopy') * 2.5, 0, 1)
wl = [lp(rng.standard_normal(n), 380) for _ in range(2)]
rl = [bp(rng.standard_normal(n), 1800, 7000) * smooth(np.abs(bp(rng.standard_normal(n), 2, 9, 1)) * 6, .05) for _ in range(2)]
wind = np.stack([wl[0], wl[1]], 1) * (gust * .9)[:, None] * db(-10)
rustle = np.stack(rl, 1) * (gust * (.25 + .9 * canopy))[:, None] * db(-14)
stems['vento'] = wind + rustle
# cachoeira: ruído rosa em banda, nível e pan seguem a posição na tela
wv = curve('waterfall_vis'); wp = curve('fall_pan')
roar = bp(pink(n), 120, 6000); roar /= np.abs(roar).max()
spl = hp(rng.standard_normal(n), 3000) * np.abs(bp(rng.standard_normal(n), 8, 30, 1)) * 3
stems['cachoeira'] = pan((roar * .8 + spl * .25) * (.12 + .88 * wv), wp * .8) * db(-15)
# fogueira: estalos + sopro grave, aparece com a revelação da praça
fv = curve('fire_vis'); fp = curve('fire_pan')
cr = np.zeros(n)
for tt in np.sort(rng.uniform(0, DUR, int(DUR * 14))):
    i = int(tt * SR); L = int(SR * rng.uniform(.004, .03))
    if i + L < n: cr[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(.2, 1)
fire = bp(cr, 900, 6500) * 1.2 + lp(pink(n), 260) * .35 * (1 + .3 * np.sin(t * 7))
stems['fogueira'] = pan(fire / np.abs(fire).max() * fv ** 1.5, fp * .7) * db(-17)
# pássaros: trinados FM curtos acompanhando o bando que cruza a tela (direita → esquerda)
birds = np.zeros((n, 2))
fl0 = 2.2
for k in range(16):
    tt = fl0 + rng.uniform(0, 5.5)
    for j in range(rng.integers(2, 5)):
        st = tt + j * rng.uniform(.09, .16); L = int(SR * rng.uniform(.05, .11)); i = int(st * SR)
        if i + L >= n: continue
        u = np.arange(L) / SR
        f0 = rng.uniform(2600, 4200); sweep = f0 * (1 + rng.uniform(-.25, .35) * u / u[-1])
        ph = 2 * np.pi * np.cumsum(sweep + 180 * np.sin(2 * np.pi * 38 * u)) / SR
        ch = np.sin(ph) * np.sin(np.pi * u / u[-1]) ** 2
        pp = np.clip(1 - 2 * (st - fl0) / 5.5, -1, 1) * .8
        birds[i:i + L] += pan(ch, pp) * rng.uniform(.4, 1)
stems['passaros'] = birds * db(-24)

# narração: trecho da cena, intacto (sem corte de frases, sem aceleração)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{T0}', '-t', f'{DUR}', '-i', f'{ROOT}/audio/narracao_original.mp3',
                      '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
nar = np.frombuffer(raw, np.float32)[:n]; nar = np.pad(nar, (0, n - len(nar)))
# ducking: ambiência −5 dB durante as frases
speech = np.zeros(n)
for fr in TL['frases']:
    a, b = max(fr['start'] - T0, 0), min(fr['end'] - T0, DUR)
    if b > a: speech[int(a * SR):int(b * SR)] = 1
duck = db(-5 * smooth(speech, .15).clip(0, 1))

amb = sum(stems.values()) * duck[:, None]
# fade in/out da ambiência nas bordas da cena (a transição real é feita no editor/encadeamento)
fade = np.clip(t / .6, 0, 1) * np.clip((DUR - t) / .3, 0, 1)
amb *= fade[:, None]
mix = amb + nar[:, None] * db(-1)
peak = np.abs(mix).max()
if peak > db(-1): mix *= db(-1) / peak
for k, v in stems.items():
    (v * 32767 * .9 / max(np.abs(v).max(), 1e-9)).astype(np.int16).tofile(f'{OUT}/{k}.raw')
import wave
def wav(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
for k, v in stems.items(): wav(f'{OUT}/{k}.wav', v * duck[:, None] * fade[:, None]); os.remove(f'{OUT}/{k}.raw')
wav(f'{OUT}/s01_sfx_ambiencia.wav', amb)
wav(f'{OUT}/s01_mix.wav', mix)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'{ROOT}/renders/S01/s01_video_mudo.mp4', '-i', f'{OUT}/s01_mix.wav',
                '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-ar', '48000', '-shortest', '-movflags', '+faststart',
                f'{ROOT}/renders/S01/S01_piloto_1080x1920.mp4'], check=True)
print('peak', 20 * np.log10(np.abs(mix).max()), 'amb rms dB', 20 * np.log10(np.sqrt((amb ** 2).mean())), 'nar rms dB', 20 * np.log10(np.sqrt((nar ** 2).mean())))
