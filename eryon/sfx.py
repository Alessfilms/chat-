"""Efeitos sonoros 8-bit (sem trilha, sem ruído contínuo) sincronizados com a cena.
Uso: python3 sfx.py saida.wav
"""
import sys
import wave
import numpy as np

SR = 44100
DUR = 53.6
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(3)


def smooth(x, k=6):  # passa-baixa leve para tirar a aspereza da onda quadrada
    return np.convolve(x, np.ones(k) / k, mode='same')


def env(n, a=.004, d=None):
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / a)
    if d:
        e *= np.exp(-tt / d)
    e[-int(.004 * SR):] *= np.linspace(1, 0, int(.004 * SR))
    return e


def sq(freq, dur, duty=.5, d=None, slide=None):
    n = int(dur * SR)
    f = np.full(n, float(freq)) if slide is None else np.geomspace(freq, slide, n)
    ph = np.cumsum(f) / SR
    w = np.where((ph % 1) < duty, 1.0, -1.0)
    return smooth(w) * env(n, d=d)


def tri(freq, dur, d=None, slide=None):
    n = int(dur * SR)
    f = np.full(n, float(freq)) if slide is None else np.geomspace(freq, slide, n)
    ph = np.cumsum(f) / SR
    return (2 * np.abs(2 * (ph % 1) - 1) - 1) * env(n, d=d)


def noise(dur, hold=4, d=None, k=10):
    n = int(dur * SR)
    x = np.repeat(rng.uniform(-1, 1, n // hold + 1), hold)[:n]
    return smooth(x, k) * env(n, d=d)


def add(sig, t, g=1.0, pan=0.0):
    s = int(t * SR)
    if s >= N:
        return
    e = min(N, s + len(sig))
    L[s:e] += sig[:e - s] * g * (1 - pan) * .7
    R[s:e] += sig[:e - s] * g * (1 + pan) * .7


def arp(t, notes, step=.055, g=.25, duty=.25, d=.12, pan=0.0):
    for i, f in enumerate(notes):
        add(sq(f, step * 2.2, duty, d=d), t + i * step, g, pan)


C5, D5, E5, G5, A5, C6, D6, E6, G6 = 523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568
G4, A4, C4, E4 = 392, 440, 261.6, 329.6

# ---- abertura: contador aparece
add(sq(E5, .08, .25, d=.05), .05, .18); add(sq(A5, .1, .25, d=.06), .11, .18)
# ---- orbes descem e viram moradores
add(sq(1400, .9, .125, d=.6, slide=500), 4.0, .12, -.4)
add(sq(1300, .9, .125, d=.6, slide=450), 4.6, .12, .4)
arp(5.15, [C5, E5, G5, C6], g=.22, pan=-.3)
arp(5.8, [D5, G5, A5, D6], g=.22, pan=.3)
add(sq(G5, .07, .25, d=.05), 5.7, .14); add(sq(C6, .1, .25, d=.07), 5.76, .14)  # contador vira "moradores"
# ---- título ERYON (letras caindo)
for i, f in enumerate([C5, D5, E5, G5, A5]):
    add(sq(f, .09, .5, d=.06), 8.05 + i * .1, .16, (i - 2) * .2)
arp(8.65, [C5, E5, G5, C6, E6, G6], step=.06, g=.18)
# ---- vista aérea (território misterioso)
add(tri(220, 1.6, d=.9, slide=110), 9.3, .25)
# ---- "não há casas / ruas / nada construído": fantasmas
add(tri(330, .6, d=.35, slide=660), 19.8, .3, -.3)
add(tri(294, .6, d=.35, slide=588), 20.9, .3, .3)
for i in range(6):  # falha/glitch ao sumir
    add(sq(rng.uniform(200, 900), .03, .5, d=.02), 22.0 + i * .06, .1, rng.uniform(-.5, .5))
add(noise(.35, 8, d=.15), 22.05, .12)
# ---- cristal: "prestes a mudar"
add(sq(200, .9, .25, d=.8, slide=1600), 24.1, .14)
add(tri(110, .8, d=.4, slide=55), 24.65, .45)
add(noise(.5, 12, d=.2, k=30), 24.65, .25)
arp(24.75, [C5, G5, C6, G6], step=.05, g=.13)
# ---- novos moradores chegando (moedinhas)
pent = [C5, D5, E5, G5, A5, C6, D6, E6]
for i in range(22):
    tl = (30.7 + (i - 9) * .2) if i >= 9 else (26.8 + i * .34)
    f = pent[(i * 3) % len(pent)]
    add(sq(f, .06, .25, d=.04), tl, .13, ((i * 7) % 5 - 2) * .3)
    add(sq(f * 1.5, .1, .25, d=.07), tl + .06, .13, ((i * 7) % 5 - 2) * .3)
# ---- floresta recua / estradas surgem
add(noise(2.8, 24, d=1.4, k=60), 30.5, .18)
for i in range(14):
    add(sq(1200 + i * 60, .025, .5, d=.015), 31.1 + i * .2, .05, rng.uniform(-.5, .5))
# ---- casas construídas (batidas)
for i in range(11):
    t0 = 34.3 + i * .14 + .25
    add(tri(150, .18, d=.06, slide=60), t0, .4, ((i % 5) - 2) * .25)
    add(noise(.12, 6, d=.04, k=20), t0, .15, ((i % 5) - 2) * .25)
add(sq(G5, .08, .25, d=.05), 35.95, .14); add(sq(C6, .14, .25, d=.09), 36.03, .14)
# ---- novos lugares (marcos acendendo)
for k, (tb, base) in enumerate([(36.35, C5), (36.85, E5), (37.35, G5)]):
    arp(tb, [base, base * 1.5, base * 2], step=.06, g=.15, pan=(k - 1) * .5)
# ---- bosque escondido
add(tri(98, 2.2, d=1.5), 39.4, .3)
add(tri(147, 2.0, d=1.4), 39.9, .2)
for i in range(4):  # olhos piscando
    add(sq(1800, .03, .5, d=.02), 40.3 + i * .35, .05, (-1) ** i * .6)
arp(41.95, [A4, C5, E5, A5, C6], step=.07, g=.15)
add(tri(220, .9, d=.5, slide=440), 41.95, .2)
# ---- transição de volta à clareira
add(noise(.5, 6, d=.25, k=40), 43.25, .2)
add(sq(900, .4, .125, d=.3, slide=300), 43.3, .08)
# ---- "agora resta descobrir": círculo de luz
add(tri(523.3, .5, d=.3), 46.3, .25); add(tri(784, .6, d=.35), 46.42, .2)
# ---- o terceiro morador aparece
add(sq(300, 1.0, .25, d=.9, slide=1500), 48.2, .12)
arp(48.6, [C5, E5, G5, C6, E6], step=.07, g=.18)
add(sq(A5, .08, .5, d=.05), 48.6, .12)
# ---- título final
for i, f in enumerate([C5, D5, E5, G5, A5]):
    add(sq(f, .09, .5, d=.06), 49.05 + i * .1, .15, (i - 2) * .2)
arp(49.7, [G4, C5, E5, G5, C6], step=.09, g=.16, d=.25)
add(tri(C4, 1.2, d=.7), 49.7, .3); add(tri(E4, 1.2, d=.7), 49.7, .2)

peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * .7, R / peak * .7
out = np.stack([L, R], 1)
with wave.open(sys.argv[1], 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print('ok')
