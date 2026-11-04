"""Efeitos sonoros do Episódio 2 (sem música e sem ruído contínuo), sincronizados com ep2.js.
Uso: python3 sfx_ep2.py saida.wav
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 119.2
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)


def env(n, a=.004, d=None):
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / a)
    if d: e = e * np.exp(-tt / d)
    k = int(.004 * SR); e[-k:] *= np.linspace(1, 0, k)
    return e


def smooth(x, k=6): return np.convolve(x, np.ones(k) / k, mode='same')


def tone(f, dur, d=None, slide=None, kind='sin', a=.004):
    n = int(dur * SR); fr = np.full(n, float(f)) if slide is None else np.geomspace(f, slide, n)
    ph = np.cumsum(fr) / SR
    if kind == 'sin': w = np.sin(2 * np.pi * ph)
    elif kind == 'tri': w = 2 * np.abs(2 * (ph % 1) - 1) - 1
    else: w = smooth(np.where((ph % 1) < .25, 1., -1.))
    return w * env(n, a, d)


def thud(f=90, dur=.25, d=.06):  # impacto grave curto (madeira, passos)
    n = int(dur * SR); tt = np.arange(n) / SR; fr = f * (1 + 1.2 * np.exp(-tt * 40))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt / d)


def click(dur=.03, k=8):  # estalo curto filtrado (fogueira, lascas)
    n = int(dur * SR); return smooth(rng.uniform(-1, 1, n), k) * np.exp(-np.arange(n) / SR / (dur / 4))


def metal(f=820, dur=.9):  # bigorna / martelo em metal: parciais inarmônicas
    n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m, g, d in [(1, 1, .35), (2.76, .5, .2), (5.4, .3, .12), (8.9, .15, .08)]: s += g * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt / d)
    return s * np.minimum(1, tt / .002)


def bird():
    n = int(.11 * SR); tt = np.arange(n) / SR; f = 3000 + 1100 * np.sin(np.pi * tt / .11) + rng.uniform(-300, 300)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / .11) ** 2


def add(sig, t, g=1., pan=0.):
    s = int(t * SR)
    if s >= N or s + len(sig) <= 0: return
    if s < 0: sig = sig[-s:]; s = 0
    e = min(N, s + len(sig)); L[s:e] += sig[:e - s] * g * (1 - pan) * .7; R[s:e] += sig[:e - s] * g * (1 + pan) * .7


def arp(t, notes, step=.07, g=.12, d=.25, kind='sin', pan=0.):
    for i, f in enumerate(notes): add(tone(f, .6, d, kind=kind), t + i * step, g, pan)


C5, D5, E5, G5, A5, C6, D6, E6, G6 = 523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568

# ---- fogueira (estalos) quando a fogueira está em cena
for a, b in [(0, 7.2), (100.2, 119)]:
    tt = a
    while tt < b: add(click(.025, 6), tt, .09, rng.uniform(-.3, .3)); tt += rng.uniform(.12, .45)
# ---- 0–7: Ontem / clareira
add(tone(392, 1.5, .8), 3.98, .06); add(tone(523, 1.5, .8), 5.14, .06)
# ---- 7.3–10.4: lapso de tempo
add(tone(220, 3.0, 2.0, slide=880), 7.3, .08); arp(9.58, [C5, E5, G5, C6, E6], step=.06, g=.09)
# ---- pássaros de dia
for tb in np.arange(10.8, 78, 3.4):
    for k in range(int(rng.integers(2, 4))): add(bird(), tb + rng.uniform(0, 1.2) + k * .13, .03, rng.uniform(-.8, .8))
for tb in [100.5, 101.8]: add(bird(), tb, .03, .4)
# ---- chegada: passos e contador
for i in range(70): add(thud(140, .12, .025), 10.9 + i * .08 + rng.uniform(0, .04), .05, rng.uniform(-.6, .6))
for i in range(26): add(tone(800 + i * 40, .05, .03, kind='sq'), 11.0 + i * .1 * (1 + i / 40), .03)
add(tone(1568, .4, .2, kind='sq'), 13.6, .05)
# ---- ícones: profissão, habilidade, história
for tt, f in [(18.58, G5), (19.62, C6), (20.84, E6)]: arp(tt, [f, f * 1.25], step=.05, g=.07)
# ---- Heitor corta a árvore
tt = 21.0 + .56 * .55
while tt < 24.3: add(thud(110, .3, .05), tt, .32, -.3); add(click(.04, 4), tt, .1, -.3); tt += .56
add(tone(160, .9, .6, slide=60, kind='tri'), 24.35, .25, -.3); add(thud(60, .6, .18), 24.7, .45, -.3)
# ---- construtores martelando
for i, tt in enumerate(np.arange(26.0, 31.2, 1 / 3.4)): add(thud(260 + (i % 2) * 40, .1, .02) + 0, tt + (i % 2) * .05, .18, -.2 if i % 2 else .2)
for tt in np.arange(100.3, 103.5, .5): add(thud(260, .1, .02), tt, .08, .3)
# ---- forja
add(thud(70, .5, .15), 32.4, .3)
for tt in np.arange(32.6 + .36, 37.6, .6): add(metal(880 + rng.uniform(-30, 30), .8), tt, .1, .3)
for i, tt in enumerate([35.8, 36.1, 36.4]): add(metal(1400 + i * 200, .4), tt, .05, .4)
# ---- cozinha (borbulhas)
for i in range(30): add(tone(rng.uniform(300, 520), .07, .03), 38.9 + i * .07 + rng.uniform(0, .05), .05, -.2)
# ---- médico (cura)
for tt in [42.8, 44.0]: arp(tt, [E5, G5, C6, E6], step=.08, g=.07)
# ---- taverna: porta abrindo e canecas
add(tone(180, .7, .5, slide=320, kind='tri'), 50.36, .12); add(metal(2200, .3), 51.4, .05); add(metal(2400, .3), 51.55, .05)
# ---- paliçada
for tt in np.arange(52.9, 55.6, .22): add(thud(120, .15, .04), tt, .14, rng.uniform(-.5, .5))
# ---- Gerald
for tt in [55.9, 56.5, 57.1]: add(thud(55, .35, .1), tt, .35, .3)
add(tone(900, .9, .6, slide=2400), 63.0, .08, .3); add(metal(1900, 1.2), 63.05, .08, .3)
# ---- Fenrir
add(tone(300, .4, .2, slide=900, kind='tri'), 65.0, .1, .5); add(thud(90, .3, .07), 65.7, .2, .5)
add(tone(330, 1.6, 1.0, slide=520), 67.1, .06, .4)
arp(69.76, [A5 / 2, C5, E5, A5], step=.1, g=.07, pan=.4)
# ---- Nyx
arp(73.38, [E6, G6, C6 * 2, G6], step=.06, g=.06, pan=-.4); arp(75.98, [C6, E6, G6], step=.12, g=.05, pan=-.4)
# ---- expedição: passos, floresta misteriosa
for tt in np.arange(78.4, 87.0, .32): add(thud(120, .12, .03), tt + rng.uniform(0, .05), .06, rng.uniform(-.3, .3))
add(tone(55, 15.0, 9.0, a=2.0), 83.8, .12); add(tone(82.4, 13.0, 8.0, a=2.0), 85.0, .07)
add(tone(420, .5, .25, slide=380), 85.6, .04, -.6); add(tone(400, .6, .3, slide=360), 86.0, .04, -.6)   # coruja
# ---- ruínas e inscrição
add(tone(110, 2.5, 1.5), 88.68, .2); add(tone(164.8, 2.5, 1.5), 88.68, .14); add(tone(207.7, 2.5, 1.5), 88.75, .1)
add(tone(1318, 2.0, 1.2), 92.1, .03); arp(94.1, [A5, C6, E6], step=.15, g=.05)
add(thud(50, .8, .3), 99.5, .25)
# ---- epílogo
arp(103.66, [C5, E5], step=.2, g=.05)
for i in range(26): add(tone(800 + i * 40, .05, .03, kind='sq'), 105.95 + i * .09, .03)
for k in range(10): add(tone(1046 + k * 60, .12, .06, kind='sq'), 109.5 + k * .3, .04)
add(tone(300, 1.0, .9, slide=1500), 113.9, .06); arp(114.05, [C5, E5, G5, C6, E6], step=.07, g=.07)
for i, f in enumerate([C5, D5, E5, G5, A5]): add(tone(f, .2, .1, kind='sq'), 115.0 + i * .1, .05)

peak = max(np.abs(L).max(), np.abs(R).max()); L, R = L / peak * .7, R / peak * .7
with wave.open(sys.argv[1], 'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.stack([L, R], 1) * 32767).astype(np.int16).tobytes())
print('ok')
