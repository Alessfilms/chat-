"""Gera a trilha ambiente (vento, pad, sinos mágicos, efeitos) sincronizada com a cena.
A narração NÃO é alterada: ela é apenas mixada por cima no ffmpeg.
Uso: python3 ambience.py saida.wav
"""
import sys
import wave
import numpy as np

SR = 44100
OFFSET = 1.5
DUR = OFFSET + 53.4 + 0.2
N = int(SR * DUR)
rng = np.random.default_rng(5)
t = np.arange(N) / SR
L = np.zeros(N)
Rch = np.zeros(N)


def at(sec):  # tempo da cena -> amostra
    return int((sec + OFFSET) * SR)


def lp(x, a):  # filtro passa-baixa de 1 polo (vetorizado em blocos)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(0, len(x), 4096):
        blk = x[i:i + 4096]
        out = np.empty_like(blk)
        for j, v in enumerate(blk):
            acc += a * (v - acc)
            out[j] = acc
        y[i:i + 4096] = out
    return y


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def add(sig, start_sec, gain=1.0, pan=0.0):
    s = at(start_sec)
    if s < 0:
        sig = sig[-s:]
        s = 0
    e = min(N, s + len(sig))
    sig = sig[:e - s] * gain
    L[s:e] += sig * (1 - pan) * 0.5 ** 0.5 * 1.2
    Rch[s:e] += sig * (1 + pan) * 0.5 ** 0.5 * 1.2


def bell(freq, dur=2.5, bright=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for k, (m, g, d) in enumerate([(1, 1, 1.0), (2.76, .5 * bright, .5), (5.4, .25 * bright, .3), (8.93, .12 * bright, .2)]):
        s += g * np.sin(2 * np.pi * freq * m * tt) * np.exp(-tt / (dur * d * .35))
    s *= np.minimum(1, tt / .004)
    return s


def whoosh(dur, f0, f1, gain=1.0):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    a = np.linspace(f0, f1, n) / SR * 2 * np.pi
    y = np.zeros(n)
    acc = 0.0
    # passa-banda simples via passa-baixa com coeficiente variável
    for i in range(n):
        acc += min(a[i], 1.0) * (noise[i] - acc)
        y[i] = acc
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return y * e * gain


def thump(freq=70, dur=.5):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = freq * (1 + 1.5 * np.exp(-tt * 30))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9) + rng.standard_normal(n) * np.exp(-tt * 40) * .3


# ---------------- vento (base contínua)
noise = rng.standard_normal(N)
wind = lp(noise, 0.02)
wind2 = lp(rng.standard_normal(N), 0.05)
mod = 0.55 + 0.45 * np.sin(2 * np.pi * t / 9.0) * np.sin(2 * np.pi * t / 4.3 + 1)
grove = np.clip(((t - OFFSET) - 39) / 1.5, 0, 1) * np.clip((43.5 - (t - OFFSET)) / .3, 0, 1)
L += wind * mod * 2.2 * (1 - .3 * grove)
Rch += wind2 * mod[::-1].copy() * 1.6 * (1 - .3 * grove)

# ---------------- pad harmônico (acordes lentos)
def pad(freqs, s0, s1, gain):
    n = at(s1) - at(s0)
    tt = np.arange(n) / SR
    y = np.zeros(n)
    for i, f in enumerate(freqs):
        for det in (-0.6, 0.6):
            y += np.sin(2 * np.pi * (f + det) * tt + i) * (0.6 if f > 300 else 1.0)
    y *= env_adsr(n, min(2.5, n / SR / 3), min(2.5, n / SR / 3))
    y *= 0.8 + 0.2 * np.sin(2 * np.pi * tt / 5.0)
    add(y / len(freqs), s0, gain)

pad([110, 164.8, 220, 261.6], -1.5, 9.5, .05)          # Lá menor: mistério
pad([87.3, 130.8, 174.6, 261.6, 329.6], 8.0, 19.0, .045)  # Fá maior
pad([98, 146.8, 196, 293.7], 18.5, 26.5, .045)          # Sol: expectativa
pad([130.8, 196, 261.6, 329.6, 392], 25.5, 39.0, .05)   # Dó maior: crescimento
pad([110, 155.6, 207.7, 311.1], 38.5, 44.0, .045)       # tensão no bosque
pad([87.3, 130.8, 174.6, 220, 349.2], 43.4, 53.6, .055) # Fá: lar, final

# ---------------- eventos
add(whoosh(3.2, 200, 2500, 1.0), -1.4, 1.6, -.2)          # descida pelas nuvens
penta = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5]
add(bell(784, 3), 1.4, .10, -.3); add(bell(1046.5, 3), 1.75, .08, .3)  # orbes aparecem
add(whoosh(1.2, 400, 3000, .6), 4.0, .7, -.3); add(whoosh(1.2, 400, 3000, .6), 4.6, .7, .3)
add(bell(659.3, 3.5), 5.15, .16, -.2); add(bell(880, 3.5), 5.8, .16, .25)  # viram moradores
for i, f in enumerate([523.3, 659.3, 784, 1046.5, 1318.5]):            # título ERYON
    add(bell(f, 3, .8), 8.05 + i * .09, .07, (i - 2) * .2)
add(bell(392, 2, .5), 19.85, .06, -.2); add(bell(440, 2, .5), 20.95, .06, .2)  # fantasmas
add(whoosh(1.0, 1500, 300, .5), 22.0, .6)
add(thump(55, 1.4), 24.6, .35); add(bell(1318.5, 4, 1.2), 24.65, .06)  # pulso do cristal
add(whoosh(2.0, 300, 1800, .5), 24.0, .6)
for i in range(22):                                                 # chegada dos novos moradores
    tl = (30.7 + (i - 9) * .2) if i >= 9 else (26.8 + i * .34)
    add(bell(penta[(i * 3) % len(penta)], 1.6, .6), tl, .045, ((i * 7) % 5 - 2) * .25)
add(whoosh(3.0, 200, 1200, .5), 30.5, .7)                           # floresta recua
for i in range(11):                                                 # casas
    add(thump(90 + (i % 3) * 15, .5), 34.3 + i * .14 + .25, .14, ((i % 5) - 2) * .25)
for k, tb in enumerate([36.35, 36.85, 37.35]):                      # marcos
    add(bell([587.3, 784, 987.8][k], 3.5, 1.0), tb, .1, (k - 1) * .4)
add(whoosh(2.5, 250, 900, .6), 38.4, .8)
add(bell(207.7, 4, .4), 40.4, .06); add(bell(311.1, 4, 1.4), 41.95, .07)  # runas
add(whoosh(1.6, 300, 4000, .8), 42.9, 1.0)                          # névoa de transição
add(bell(784, 4, .7), 46.3, .07)                                     # círculo do 3º
for i, f in enumerate([523.3, 659.3, 784, 987.8, 1174.7]):
    add(bell(f, 4, .9), 48.2 + i * .12, .07, (i - 2) * .2)
for i, f in enumerate([392, 523.3, 659.3, 784]):
    add(bell(f, 5, .7), 49.05 + i * .1, .06, (i - 1.5) * .25)

# pássaros ocasionais (dia)
for s in [3.5, 10.2, 15.8, 27.5, 33.0, 45.0, 50.5]:
    for k in range(3):
        n = int(.09 * SR)
        tt = np.arange(n) / SR
        f = 3200 + 900 * np.sin(np.pi * tt / .09) + rng.uniform(-200, 200)
        ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / .09) ** 2
        add(ch, s + k * .13, .018, rng.uniform(-.8, .8))

# fade geral
fade = np.clip((t - .2) / 1.5, 0, 1) * np.clip(((OFFSET + 53.5) - t) / 1.6, 0, 1)
L *= fade
Rch *= fade
peak = max(np.abs(L).max(), np.abs(Rch).max())
L, Rch = L / peak * .5, Rch / peak * .5
out = np.stack([L, Rch], 1)
with wave.open(sys.argv[1], 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok', DUR)
