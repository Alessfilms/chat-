"""Cena 01 — Os 200 historiadores. Mundo isométrico inteiramente gerado em código.
python3 world_s01.py            → vídeo mudo + quadros-chave + cues de som
python3 world_s01.py 0 120 240  → só esses quadros (teste)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUTD = f'{ROOT}/renders/S01'; os.makedirs(f'{OUTD}/keyframes', exist_ok=True)
TL = json.load(open(f'{ROOT}/timeline.json'))
SC = [s for s in TL['cenas'] if s['id'] == 'S01'][0]
FPS = 24; N = SC['frame_out'] - SC['frame_in']
VW, VH, UPS = 360, 640, 3
WW, WH = 480, 1500
OX = 240
rng = np.random.default_rng(21)

def t2s(gx, gy): return np.array([OX + (gx - gy) * 16., (gx + gy) * 8.])
def s2t(x, y):
    a, b = (np.asarray(x) - OX) / 16., np.asarray(y) / 8.
    return (a + b) / 2, (b - a) / 2
def ease(t):
    t = np.clip(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10)

# ---------------- layout (coordenadas de tela do mundo) ----------------
HOR = lambda x: 262 + 7 * np.sin(np.asarray(x) / 37.) + 4 * np.sin(np.asarray(x) / 13.)
PLAZA = np.array([250., 618.])
RIV_C = lambda gx: 56.25 + 1.1 * np.sin((gx - 56) / 4.)
RIV_W = 1.75
BR_GX = 55.4; BR_W = 1.8; BR_D = 6.4
BR_GY0 = RIV_C(56.3) - BR_D / 2
PATHS = [[(186, 1500), (205, 1380), (170, 1250), (215, 1120), (190, 1010), (196, 952)],
         [(292, 868), (300, 820), (268, 760), (262, 690), (250, 650)],
         [(250, 590), (232, 540), (240, 486), (236, 458)],
         [(186, 618), (120, 660), (70, 690)], [(316, 620), (380, 650), (430, 690)]]

def seg_dist(px, py, pts):
    d = np.full(np.shape(px), 1e9)
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        vx, vy = x1 - x0, y1 - y0; L = vx * vx + vy * vy
        t = np.clip(((px - x0) * vx + (py - y0) * vy) / L, 0, 1)
        d = np.minimum(d, np.hypot(px - x0 - t * vx, (py - y0 - t * vy) * 1.6))
    return d

# ---------------- chão ----------------
def build_ground():
    yy, xx = np.mgrid[0:WH, 0:WW] + .5
    gx, gy = s2t(xx, yy)
    # meia-tile → bordas em degrau isométrico
    qgx, qgy = np.floor(gx * 2) / 2 + .25, np.floor(gy * 2) / 2 + .25
    qx, qy = t2s(qgx, qgy)
    T = np.zeros((WH, WW), np.int8)                                     # 0 grama
    south = qy > 932 + (qx - 240) * .5
    T[south] = 1                                                        # grama da floresta
    path = np.zeros_like(T, bool)
    for p in PATHS: path |= seg_dist(qx, qy, p) < 9.5
    T[path] = 2
    plaza = ((qx - PLAZA[0]) / 74) ** 2 + ((qy - PLAZA[1]) / 38) ** 2 < 1
    T[plaza] = 4
    water = np.abs(qgy - RIV_C(qgx)) < RIV_W
    T[water] = 3
    T[yy < HOR(xx)] = 5
    # textura
    def vnoise(sc, seed):
        g = np.random.default_rng(seed).random((WH // sc + 3, WW // sc + 3))
        fy, fx = yy / sc, xx / sc; iy, ix = fy.astype(int), fx.astype(int); ty, tx = fy - iy, fx - ix
        ty, tx = ty * ty * (3 - 2 * ty), tx * tx * (3 - 2 * tx)
        return (g[iy, ix] * (1 - tx) + g[iy, ix + 1] * tx) * (1 - ty) + (g[iy + 1, ix] * (1 - tx) + g[iy + 1, ix + 1] * tx) * ty
    n = vnoise(22, 1) * .65 + vnoise(7, 2) * .35
    dth = BAYER[yy.astype(int) % 4, xx.astype(int) % 4]
    img = np.zeros((WH, WW, 3), np.float32)
    G = np.array(P['grass'], np.float32)
    lv = np.clip(n * 3.2 + (dth - .5) * .9 + .2, 0, 4).astype(int)
    img[:] = G[np.clip(lv, 1, 3)]
    lvf = np.clip(n * 2.6 + (dth - .5) * .9 - .2, 0, 4).astype(int)
    img[T == 1] = G[np.clip(lvf, 0, 2)][T == 1]
    hs = hsh(xx.astype(int), yy.astype(int), 3)
    tuft = (hs > .975) & (T <= 1)
    img[tuft] = G[np.clip(lv + 1, 0, 4)][tuft]
    fl = (hs < .0025) & (T == 0)
    img[fl] = np.where((hs[fl] < .003)[:, None], np.array(P['leafp'][4], np.float32), np.array(P['gold'][2], np.float32))
    D = np.array(P['dirt'], np.float32)
    dl = np.clip(n * 2 + 1 + (dth - .5) * .8, 1, 3).astype(int)
    img[T == 2] = D[dl][T == 2]
    peb = (hs > .97) & (T == 2); img[peb] = D[3]
    # pedras da praça em grade iso
    cu, cv = (gx * 3) % 1, (gy * 3) % 1
    cob = hsh((gx * 3).astype(int), (gy * 3).astype(int), 4)
    S = np.array(P['stone'], np.float32)
    pc = S[np.clip((cob * 2.5 + 1.6).astype(int), 2, 4)]
    pc[(cu < .14) | (cv < .14)] = S[1]
    img[T == 4] = pc[T == 4]
    # água
    W_ = np.array(P['water'], np.float32)
    dep = 1 - np.abs(gy - RIV_C(gx)) / RIV_W
    wl = np.clip(dep * 2.2 + (dth - .5) * .9 + .6, 0, 3).astype(int)
    wat = T == 3
    img[wat] = W_[3 - np.clip(wl, 1, 3)][wat] * 0 + W_[np.clip(3 - wl + 0, 0, 2) + 0][wat] if False else W_[np.clip(wl, 1, 3) - 1 + 0][wat]
    # barranco: água logo abaixo de terra vira face de terra (degrau)
    land = (T != 3) & (T != 5)
    bank = np.zeros_like(wat)
    for k in range(1, 5): bank |= wat & np.roll(land, k, 0)
    img[bank] = D[0] * .9
    rim = wat & ~bank & np.roll(bank, 1, 0)
    img[rim] = W_[4] * .85
    # borda grama/terra
    edge = (T <= 1) & (np.roll(T, -1, 0) == 2)
    img[edge] = G[0] * 1.1
    # grade de luz: mais quente e clara no alto-direita, violeta em baixo-esquerda
    grade = (1 - yy / WH) * .5 + (xx / WW) * .25
    img *= (0.80 + .32 * grade)[..., None] * np.array([1.0, .96, .92]) + np.array([0, 0, .06])[None, None, :] * (1 - grade)[..., None]
    alpha = (T != 5)
    return np.clip(img, 0, 255), alpha, wat & ~bank, T

def build_sky():
    H = 330; yy, xx = np.mgrid[0:H, 0:WW] + .5
    stops = [(0, (52, 34, 86)), (.35, (110, 58, 120)), (.62, (204, 98, 108)), (.82, (244, 150, 84)), (1, (252, 206, 112))]
    tt = yy / (H - 60)
    q = np.clip(tt + (BAYER[yy.astype(int) % 4, xx.astype(int) % 4] - .5) * .06, 0, 1)
    q = np.floor(q * 14) / 14
    img = np.zeros((H, WW, 3), np.float32)
    for (a, ca), (b, cb) in zip(stops[:-1], stops[1:]):
        m = (q >= a) & (q <= b); k = ((q - a) / (b - a))[m][:, None]
        img[m] = np.array(ca) * (1 - k) + np.array(cb) * k
    # sol
    sx, sy = 395, 236
    d = np.hypot(xx - sx, (yy - sy) * 1.0)
    img[d < 15] = (255, 236, 170)
    for r_, a_ in ((30, .22), (52, .12)):
        m = (d >= 15) & (d < r_); img[m] = img[m] * (1 - a_) + np.array([255, 210, 130]) * a_
    # nuvens em faixas
    for k in range(9):
        cy = 40 + k * 26 + rng.integers(-6, 6); cx = rng.integers(0, WW); L = rng.integers(60, 170); th = rng.integers(2, 5)
        m = (np.abs(yy - cy - 4 * np.sin((xx - cx) / 23)) < th) & (np.abs(xx - cx) < L)
        lit_ = np.array([255, 170, 150]) if cy > 120 else np.array([170, 100, 160])
        img[m] = img[m] * .45 + lit_ * .55
        m2 = m & (np.abs(yy - cy - 4 * np.sin((xx - cx) / 23) - th + 1) < 1)
        img[m2] = img[m2] * .7 + np.array([90, 50, 100]) * .3
    # montanhas em camadas
    for k, (base, amp, col, rimc) in enumerate([(250, 60, (120, 82, 140), (236, 150, 140)), (275, 42, (84, 58, 108), (210, 120, 110)), (300, 26, (52, 40, 74), (150, 90, 90))]):
        r2 = np.random.default_rng(40 + k)
        ph = r2.random(3) * 6
        ridge = base - amp * (.55 + .25 * np.sin(xx[0] / 61 + ph[0]) + .15 * np.sin(xx[0] / 23 + ph[1]) + .08 * np.sin(xx[0] / 9 + ph[2]))
        m = yy > ridge[None, :]
        img[m] = col
        slope = np.gradient(ridge)
        lm = m & (yy < ridge[None, :] + 3) & (slope[None, :] > 0)
        img[lm] = rimc
    # rio distante brilhando
    m = (np.abs(yy - 312 - 5 * np.sin(xx / 30)) < 1.5) & (xx > 250)
    img[m] = (250, 200, 150)
    return img

# ---------------- castelo ----------------
def castle():
    w, d, h, ph = 9, 5, 26, 14
    s = Spr(int((w + d) * 16 + 140), 440, int(d * 16 + 70), 250)
    ground_shadow(s, -.6, -.6, w + 1.2, d + 1.2, 60, 100)
    # plinto rochoso
    box(s, -.6, -.6, 0, w + 1.2, d + 1.2, ph, tex_stone('sun', 9, 5, 2), tex_stone('shade', 9, 5, 2), tex_flat('grass', 2, 'sun', 20))
    crenel = lambda hh: (lambda U, V, LA, LB: (V < hh) | (((U // 3).astype(int) % 2) == 0))
    T = 5  # torres
    cyl = lambda gx, gy, r, hh, rf, **kw: cylinder(s, *(s.o(gx, gy, ph)), r, hh, rf, **kw)
    cyl(0, 0, 9, 40, 20, windows=[(-2, 26, 2, 4)])
    cyl(w, 0, 9, 42, 22, windows=[(2, 28, 2, 4)])
    box(s, 0, 0, ph, w, .6, h + 3, tex_stone('sun'), tex_stone('shade'), tex_flat('stone', 3, 'sun'), crenel(h), crenel(h))
    box(s, 0, 0, ph, .6, d, h + 3, tex_stone('sun'), tex_stone('shade'), tex_flat('stone', 3, 'sun'), crenel(h), crenel(h))
    # torre de menagem
    box(s, 2.2, 1.0, ph, 4, 2.6, 46, tex_stone('sun', windows=[(10, 30, 3, 5), (26, 30, 3, 5)]),
        tex_stone('shade', windows=[(12, 32, 3, 5), (40, 32, 3, 5), (26, 14, 3, 5)]), None)
    gable_roof(s, 2.2, 1.0, ph + 46, 4, 2.6, 16, 'slate')
    cyl(7.2, 1.6, 7, 66, 24, windows=[(0, 50, 2, 4), (-4, 30, 2, 4)], flag=True)
    box(s, w - .6, 0, ph, .6, d, h + 3, tex_stone('sun'), tex_stone('shade'), tex_flat('stone', 3, 'sun'), crenel(h), crenel(h))
    box(s, 0, d - .6, ph, w, .6, h + 3, tex_stone('sun'), tex_stone('shade', windows=[(30, 16, 2, 3), (110, 16, 2, 3)]),
        tex_flat('stone', 3, 'sun'), crenel(h), crenel(h))
    # portaria
    gx0 = 3.6
    def gate_l(U, V, LA, LB):
        col = tex_stone('shade')(U, V, LA, LB)
        cx = LA / 2; arch = (np.abs(U - cx) < 6) & (V < 13 + np.sqrt(np.clip(36 - (U - cx) ** 2, 0, 36)) * .6)
        col[arch] = c('wood', 1); col[arch & ((U.astype(int) % 3) == 0)] = c('wood', 0)
        col[arch & (V > 13 + np.sqrt(np.clip(36 - (U - cx) ** 2, 0, 36)) * .6 - 1.2)] = c('stone', 4)
        for tx in (cx - 10, cx + 10):
            t = (np.abs(U - tx) < 1.1) & (np.abs(V - 16) < 2); col[t] = c('glow', 3)
        return col
    box(s, gx0, d - .3, ph, 1.8, .9, 36, tex_stone('sun'), gate_l, tex_flat('stone', 3, 'sun'), crenel(33), crenel(33))
    cyl(0, d, 9, 38, 20, windows=[(4, 24, 2, 4)])
    cyl(w, d, 10, 40, 22, windows=[(-3, 24, 2, 4), (6, 12, 2, 4)])
    # escadaria do portão até o chão
    for k in range(7):
        z = ph - k * 2
        box(s, gx0 + .1, d + .6 + k * .32, 0, 1.6, .32, max(z, 1), tex_stone('sun', 4, 2, 3), tex_stone('shade', 4, 2, 3), tex_flat('stone', 3, 'sun'))
    gpt = s.o(gx0 + .9, d + .6, ph + 22)
    rel = (gpt[0] - s.ax, gpt[1] - s.ay)
    s.finish()
    s.banner_at = rel
    return s

# ---------------- montagem do mundo ----------------
print('construindo mundo...', flush=True)
GROUND, GALPHA, WATER, TMAP = build_ground()
SKY = build_sky()
objs = []   # (key_y, sprite, x, y)  x,y = posição da âncora no mundo
occ = np.zeros((WH, WW), bool)

def add(spr, x, y, key=None, mark=None):
    objs.append(dict(key=y if key is None else key, spr=spr, x=x, y=y))
    if mark is not None:
        x0, y0, x1, y1 = [int(v) for v in mark]; occ[max(y0, 0):y1, max(x0, 0):x1] = True

def place_tile(spr, gx, gy, keyoff=0, mark=True):
    x, y = t2s(gx, gy)
    h, w = spr.a.shape[:2]
    add(spr, x, y, key=y + keyoff, mark=(x - spr.ax, y - 10, x - spr.ax + w, y + 30) if mark else None)
    return x, y

CAST = castle()
cgx, cgy = s2t(206, 318)
cx_, cy_ = t2s(cgx, cgy)
add(CAST, cx_, cy_, key=cy_ + 90, mark=(cx_ - CAST.ax, cy_ - 30, cx_ - CAST.ax + CAST.a.shape[1], cy_ + 140))
GATE_BANNER = (cx_ + CAST.banner_at[0], cy_ + CAST.banner_at[1])

HOUSES = [((92, 452), 3, 2, 16, 14, 'slate', False), ((318, 448), 3, 2, 17, 14, 'thatch', False), ((40, 560), 2, 2, 20, 12, 'slate', True),
          ((372, 556), 3, 2, 16, 14, 'slate', False), ((96, 686), 3, 2, 16, 13, 'thatch', False), ((356, 690), 2, 2, 18, 12, 'slate', True),
          ((420, 640), 2, 2, 15, 12, 'thatch', False), ((182, 470), 2, 2, 15, 12, 'slate', False), ((20, 690), 2, 2, 15, 12, 'slate', False),
          ((332, 820), 2, 2, 15, 12, 'thatch', False)]
SMOKES = []
for i, ((hx, hy), w, d, h, rh, roof, stone) in enumerate(HOUSES):
    sp = house(100 + i, w, d, h, rh, roof, stone)
    gx, gy = s2t(hx, hy); gx, gy = np.round(gx * 2) / 2, np.round(gy * 2) / 2
    x, y = t2s(gx, gy)
    key = y + (w + d) * 8 * .55
    add(sp, x, y, key=key, mark=(x - d * 16 - 8, y - 20, x + w * 16 + 8, y + (w + d) * 8 + 10))
    if sp.smoke is not None: SMOKES.append((x + sp.smoke[0], y + sp.smoke[1]))
    if i == len(HOUSES) - 1: MILL = (gx, gy, w, d, h)
# moinho: roda d'água na face voltada ao rio
mgx, mgy, mw, md, mh = MILL
WHEEL_AT = t2s(mgx + mw * .55, mgy + md + .25) + np.array([0, -8])

BR = bridge(BR_W, BR_D)
bx, by = t2s(BR_GX, BR_GY0)
BR_KEY = by + 60
add(BR, bx, by, key=BR_KEY)

# praça
FIRE = t2s(*s2t(*PLAZA))
add(well(), 300, 606, mark=(290, 596, 312, 616))
for k, (tx, ty) in enumerate([(196, 598), (300, 640), (214, 650), (296, 590)]):
    sp = table(k + 3); add(sp, tx, ty, mark=(tx - 16, ty - 8, tx + 22, ty + 12))
add(stall(5), 150, 548, mark=(130, 520, 200, 570))
add(tent(6), 430, 600, mark=(400, 570, 460, 625))
add(tent(7), 46, 760, mark=(16, 730, 80, 785))
for k, (x, y) in enumerate([(120, 478), (205, 700), (420, 486), (64, 640), (440, 760), (150, 760)]):
    add(crate(k, barrel=k % 2 == 1), x, y, mark=(x - 8, y - 6, x + 8, y + 6))
BANNERS = [(200, 572), (304, 574), (176, 652), (330, 664), (282, 902 - 26)]
for (x, y) in BANNERS: occ[int(y) - 6:int(y) + 6, int(x) - 6:int(x) + 6] = True
BANNER_FR = [banner(f) for f in range(4)]
BIGBANNER_FR = [banner(f, 12, 18, 6) for f in range(4)]
FIRE_FR = campfire_frames()
occ[int(FIRE[1]) - 20:int(FIRE[1]) + 20, int(FIRE[0]) - 30:int(FIRE[0]) + 30] = True

# árvores
TREES = {k: [tree(1000 + j, r, k) for j, r in enumerate([8, 9, 10, 11, 12, 13, 14, 16])] for k in ('oak', 'purple', 'pine')}
def try_tree(x, y, kind, r_i, margin=8):
    xi, yi = int(x), int(y)
    if not (4 <= xi < WW - 4 and 4 <= yi < WH - 2): return False
    t = TMAP[yi, xi]
    if t in (2, 3, 4, 5): return False
    win = TMAP[max(yi - 6, 0):yi + 6, max(xi - 8, 0):xi + 8]
    if (win == 3).any() or (win == 2).any() or (win == 4).any(): return False
    if occ[max(yi - margin, 0):yi + margin // 2, max(xi - margin, 0):xi + margin].any(): return False
    sp = TREES[kind][r_i]
    add(sp, x, y)
    occ[yi - margin // 2:yi + 2, xi - margin // 2:xi + margin // 2] = True
    return True
# floresta ao sul: densa
for k in range(5000):
    x, y = rng.uniform(0, WW), rng.uniform(900, WH)
    if y < 950 + (x - 240) * .5: continue
    kind = 'pine' if rng.random() < .22 else ('purple' if rng.random() < .1 else 'oak')
    try_tree(x, y, kind, rng.integers(2, 8), margin=9)
# linha de árvores no horizonte
for x in np.arange(0, WW, 9):
    if 150 < x < 380: continue
    try_tree(x + rng.uniform(-3, 3), HOR(x) + rng.uniform(6, 18), 'oak' if rng.random() < .7 else 'pine', rng.integers(3, 8), margin=4)
# vila: bosques agrupados + arbustos + pedras
BUSH = [tree(2000 + j, r, k, trunk=False) for j, (r, k) in enumerate([(5, 'oak'), (6, 'oak'), (7, 'oak'), (5, 'purple'), (6, 'purple'), (4, 'oak')])]
ROCK = [rock(3000 + j, r) for j, r in enumerate([3, 4, 5, 3])]
groves = [(rng.uniform(0, WW), rng.uniform(300, 900)) for _ in range(26)]
for (gx0, gy0) in groves:
    kind = 'purple' if rng.random() < .3 else 'oak'
    for k in range(rng.integers(3, 8)):
        try_tree(gx0 + rng.normal(0, 18), gy0 + rng.normal(0, 10), kind if rng.random() < .8 else 'oak', rng.integers(1, 7), margin=10)
def try_small(sp, x, y):
    xi, yi = int(x), int(y)
    if not (2 <= xi < WW - 2 and 2 <= yi < WH - 2): return
    if TMAP[yi, xi] in (2, 3, 4, 5) or occ[yi - 3:yi + 3, xi - 4:xi + 4].any(): return
    if (TMAP[max(yi - 4, 0):yi + 4, max(xi - 5, 0):xi + 5] == 3).any(): return
    add(sp, x, y); occ[yi - 2:yi + 2, xi - 3:xi + 3] = True
for k in range(380):
    x, y = rng.uniform(0, WW), rng.uniform(280, 960)
    try_small(BUSH[rng.integers(0, 6)] if rng.random() < .75 else ROCK[rng.integers(0, 4)], x, y)
for k in range(300):  # pedras e arbustos ao longo das margens e caminhos
    p = PATHS[rng.integers(0, len(PATHS))]; i = rng.integers(0, len(p) - 1); u = rng.random()
    x = p[i][0] + (p[i + 1][0] - p[i][0]) * u + rng.choice([-1, 1]) * rng.uniform(12, 18); y = p[i][1] + (p[i + 1][1] - p[i][1]) * u
    try_small(ROCK[rng.integers(0, 4)] if rng.random() < .5 else BUSH[rng.integers(0, 6)], x, y)
print('objetos:', len(objs), flush=True)

# ---------------- moradores ----------------
CLOAKS = [((112, 52, 128), (78, 34, 92)), ((122, 82, 52), (84, 54, 34)), ((84, 98, 56), (56, 66, 36)),
          ((140, 50, 54), (94, 32, 36)), ((70, 74, 120), (46, 48, 84)), ((150, 120, 80), (104, 82, 54))]
BOOKS = [(196, 160, 96), (232, 214, 170), (150, 60, 50), (70, 90, 150)]
HAIRS = [None, (60, 40, 30), None, (110, 70, 40), None, (40, 30, 30)]
_cache = {}
def villager(i, frame, back, flip, idle=False):
    k = (i % 24, frame % 4, back, flip, idle)
    if k not in _cache:
        cl, cl2 = CLOAKS[i % 6]
        _cache[k] = person(cl, cl2, BOOKS[i % 4], frame, back, flip, HAIRS[(i // 2) % 6], idle)
    return _cache[k]

WALKERS = [
    dict(path=[(186, 1490), (205, 1380), (170, 1250), (215, 1120)], sp=11, ph=.1),
    dict(path=[(198, 1300), (174, 1240), (212, 1130), (190, 1010)], sp=10, ph=.5),
    dict(path=[(196, 950), (292, 870), (300, 820)], sp=9, ph=.2, bridge=True),
    dict(path=[(300, 822), (268, 760), (262, 690), (250, 652)], sp=10, ph=0),
    dict(path=[(262, 700), (268, 760), (300, 820)], sp=9, ph=.6),
    dict(path=[(186, 618), (120, 660), (72, 690)], sp=8, ph=.3),
    dict(path=[(316, 622), (380, 652), (428, 690)], sp=9, ph=.7),
    dict(path=[(250, 590), (232, 540), (240, 488)], sp=8, ph=.4),
    dict(path=[(186, 628), (214, 600), (286, 600), (312, 628), (286, 642), (214, 642), (186, 628)], sp=9, ph=.15, loop=True),
    dict(path=[(312, 628), (286, 600), (214, 600), (186, 628), (214, 642), (286, 642), (312, 628)], sp=8, ph=.55, loop=True),
    dict(path=[(130, 590), (120, 530), (160, 500)], sp=7, ph=.8),
    dict(path=[(352, 520), (400, 540), (420, 520)], sp=7, ph=.25),
]
for w in WALKERS:
    pts = np.array(w['path'], float); seg = np.hypot(*np.diff(pts, axis=0).T); w['pts'] = pts; w['cum'] = np.r_[0, np.cumsum(seg)]
IDLE = [(232, 604, False, False), (268, 606, False, True), (226, 632, True, False), (272, 634, True, True),
        (198, 612, False, False), (300, 652, True, True), (214, 662, True, False), (150, 566, False, False)]

def walker_state(w, t, i):
    L = w['cum'][-1]; d = (t * w['sp'] + w['ph'] * L)
    if w.get('loop'): d = d % L; fwd = True
    else:
        d = d % (2 * L); fwd = d < L; d = d if fwd else 2 * L - d
    k = np.searchsorted(w['cum'], d, side='right') - 1; k = min(k, len(w['pts']) - 2)
    a, b = w['pts'][k], w['pts'][k + 1]; u = (d - w['cum'][k]) / max(w['cum'][k + 1] - w['cum'][k], 1e-6)
    p = a + (b - a) * u; v = (b - a) * (1 if fwd else -1)
    return p, v

def on_bridge(p):
    gx, gy = s2t(*p)
    return BR_GX - .2 < gx < BR_GX + BR_W + .2 and BR_GY0 < gy < BR_GY0 + BR_D

# ---------------- primeiro plano: copas (sobrevoo) ----------------
FG = []
r3 = np.random.default_rng(77)
for k in range(30):
    side = r3.random()
    x = r3.uniform(-30, 70) if side < .4 else (r3.uniform(290, 390) if side < .8 else r3.uniform(60, 300))
    y = r3.uniform(120, 760) if side < .8 else r3.uniform(430, 780)
    kind = 'purple' if r3.random() < .15 else ('pine' if r3.random() < .2 else 'oak')
    sp = TREES[kind][r3.integers(4, 8)]
    big = sp.a.repeat(2, 0).repeat(2, 1).astype(np.float32)
    big[..., :3] *= np.array([.78, .74, .84])     # mais perto da câmera, contra a luz
    FG.append((y, x, big, sp.ax * 2, sp.ay * 2))
FG.sort(key=lambda q: q[0])
NO_FG = True   # sem copas caindo no início (pedido do Aless)

# ---------------- câmera ----------------
CAM0, CAM1 = np.array([66., 860.]), np.array([60., 196.])
def cam(f):
    e = ease(f / (N - 1)); p = CAM0 + (CAM1 - CAM0) * e
    return int(round(p[0])), int(round(p[1]))

def blit(view, arr, x, y):
    h, w = arr.shape[:2]; x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, view.shape[1]), min(y + h, view.shape[0])
    if x1 <= x0 or y1 <= y0: return
    s = arr[y0 - y:y1 - y, x0 - x:x1 - x]; a = s[..., 3:4].astype(np.float32) / 255.
    view[y0:y1, x0:x1] = view[y0:y1, x0:x1] * (1 - a) + s[..., :3] * a

cues = dict(birds=[], waterfall_vis=[], fire_vis=[], fire_pan=[], fall_pan=[], canopy=[])
STATIC = sorted(objs, key=lambda o: o['key'])

def render(f):
    t = f / FPS
    cx, cy = cam(f)
    view = np.zeros((VH, VW, 3), np.float32)
    # céu (parallax 0.5)
    sky_y = (0 - cy) + (cy - CAM1[1]) * .5
    sy0 = int(round(sky_y))
    if sy0 + SKY.shape[0] > 0:
        blit(view, np.dstack([SKY[:, cx:cx + VW], np.full(SKY.shape[:1] + (VW,), 255)]), 0, sy0)
    g = GROUND[cy:cy + VH, cx:cx + VW].copy(); ga = GALPHA[cy:cy + VH, cx:cx + VW]
    # água animada (fluxo para baixo-direita, ao longo do rio)
    wm = WATER[cy:cy + VH, cx:cx + VW]
    if wm.any():
        yy, xx = np.nonzero(wm); wy, wx = yy + cy, xx + cx
        h1 = hsh(((wx - t * 14) // 4).astype(int), ((wy - t * 7) // 2).astype(int), 7)
        h2 = hsh(((wx - t * 22) // 3).astype(int), ((wy - t * 11) // 1).astype(int), 8)
        sp = h1 > .9; g[yy[sp], xx[sp]] = g[yy[sp], xx[sp]] * .45 + c('water', 3) * .55
        sp2 = h2 > .975; g[yy[sp2], xx[sp2]] = c('water', 4)
    view[ga] = g[ga]
    # luz da fogueira no chão
    fl = .85 + .1 * np.sin(t * 15) * np.sin(t * 6.1 + 1) + .05 * np.sin(t * 31)
    fx, fy = FIRE[0] - cx, FIRE[1] - cy
    if -80 < fy < VH + 80:
        y0, y1 = int(max(fy - 70, 0)), int(min(fy + 70, VH)); x0, x1 = int(max(fx - 110, 0)), int(min(fx + 110, VW))
        if y1 > y0 and x1 > x0:
            yy, xx = np.mgrid[y0:y1, x0:x1]
            d = np.hypot((xx - fx) / 1.0, (yy - fy) / .55)
            q = np.floor(np.clip(1 - d / 100, 0, 1) ** 1.6 * 5) / 5 * (.26 * fl)
            view[y0:y1, x0:x1] += q[..., None] * np.array([255, 140, 50])
    # objetos ordenados por profundidade (estáticos + dinâmicos)
    dyn = []
    fr = FIRE_FR[int(t * 12) % len(FIRE_FR)]
    dyn.append(dict(key=FIRE[1], spr=fr, x=FIRE[0], y=FIRE[1]))
    for k, (bx_, by_) in enumerate(BANNERS):
        dyn.append(dict(key=by_ + (40 if k == 4 else 0), spr=BANNER_FR[int(t * 6 + k) % 4], x=bx_, y=by_ + (-13 if k == 4 else 0)))
    dyn.append(dict(key=CAST and (cy_ + 91), spr=BIGBANNER_FR[int(t * 5) % 4], x=GATE_BANNER[0] - 2, y=GATE_BANNER[1] + 10))
    dyn.append(dict(key=t2s(mgx + mw, mgy + md)[1] + 30, spr=waterwheel(-t * 1.6), x=WHEEL_AT[0], y=WHEEL_AT[1]))
    for i, w in enumerate(WALKERS):
        p, v = walker_state(w, t, i)
        back = v[1] < 0; flip = (v[0] < 0) != back
        spr = villager(i, int(t * 7 + i), back, flip)
        if on_bridge(p):
            dyn.append(dict(key=BR_KEY + 1, spr=spr, x=p[0], y=p[1] - 13))
        else:
            dyn.append(dict(key=p[1], spr=spr, x=p[0], y=p[1]))
    for j, (x, y, back, flip) in enumerate(IDLE):
        dyn.append(dict(key=y, spr=villager(30 + j, 0, back, flip, idle=True), x=x, y=y - (1 if int(t * 2 + j) % 5 == 0 else 0)))
    allobj = sorted(STATIC + dyn, key=lambda o: o['key'])
    for o in allobj:
        sp = o['spr']; x = o['x'] - sp.ax - cx; y = o['y'] - sp.ay - cy
        if x > VW or y > VH or x + sp.a.shape[1] < 0 or y + sp.a.shape[0] < 0: continue
        blit(view, sp.a, x, y)
    # brasas
    for k in range(9):
        life = (t * .8 + k / 9) % 1
        ex = FIRE[0] + 6 * np.sin(k * 2.3 + t * 2) - cx; ey = FIRE[1] - 14 - life * 46 - cy
        if 0 <= ey < VH - 1 and 0 <= ex < VW - 1 and life < .85:
            view[int(ey), int(ex)] = np.array([255, 210 - life * 120, 80])
    # fumaça das chaminés
    for si, (sx, sy) in enumerate(SMOKES):
        for k in range(6):
            life = (t * .25 + k / 6 + si * .13) % 1
            px = sx + life * 26 + 3 * np.sin(life * 6 + k) - cx; py = sy - life * 70 - cy
            rad = 2 + life * 7; a = .6 * (1 - life)
            y0, y1, x0, x1 = int(py - rad), int(py + rad) + 1, int(px - rad), int(px + rad) + 1
            if y1 < 0 or y0 >= VH or x1 < 0 or x0 >= VW: continue
            y0c, y1c, x0c, x1c = max(y0, 0), min(y1, VH), max(x0, 0), min(x1, VW)
            gy_, gx_ = np.mgrid[y0c:y1c, x0c:x1c]
            dd = ((gx_ - px) ** 2 + (gy_ - py) ** 2) / rad ** 2
            m = dd < 1; m2 = dd < .45
            view[gy_[m], gx_[m]] = view[gy_[m], gx_[m]] * (1 - a * .7) + np.array([188, 170, 196]) * a * .7
            view[gy_[m2], gx_[m2]] = view[gy_[m2], gx_[m2]] * (1 - a * .5) + np.array([226, 214, 226]) * a * .5
    # pássaros
    tb = t - 2.0
    if 0 <= tb <= 7:
        for i in range(5):
            bx_ = VW + 10 - tb * 70 + i * 13; by_ = 120 + (i % 2) * 8 + i * 3 - tb * 8 + 2 * np.sin(tb * 3 + i)
            fr_ = int(t * 10 + i) % 3
            pts = [[(0, 0), (1, 1), (2, 2), (3, 2), (4, 2), (5, 1), (6, 0)], [(0, 1), (1, 1), (2, 2), (3, 2), (4, 2), (5, 1), (6, 1)],
                   [(1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (2, 3), (4, 3)]][fr_]
            for (px, py) in pts:
                X, Y = int(bx_ + px), int(by_ + py)
                if 0 <= X < VW and 0 <= Y < VH: view[Y, X] = (44, 24, 44)
        if f % 12 == 0: cues['birds'].append((t, float(np.clip((VW - tb * 70) / VW, 0, 1))))
    # pétalas ao vento
    for k in range(12):
        px = (k * 61 + t * (24 + k * 2)) % (VW - 2)
        py = (k * 113 + t * (14 + k % 5 * 4) + 20 * np.sin(t + k)) % VH
        view[int(py), int(px)] = (196, 140, 206) if k % 3 == 0 else (214, 196, 96)
    # névoa posterizada no começo
    dens0 = .38 * (1 - ease(t / 5.0))
    if dens0 > .01:
        yy2, xx2 = np.mgrid[0:VH:2, 0:VW:2]
        band = .5 + .5 * np.sin(yy2 * .02 + xx2 * .008 + t * .4) * np.sin(xx2 * .013 - t * .25)
        lvl = (np.floor(np.clip(band * dens0, 0, 1) * 5) / 5 * .6).repeat(2, 0).repeat(2, 1)[:VH, :VW, None]
        view = view * (1 - lvl) + np.array([226, 190, 176]) * lvl
    # copas em primeiro plano: a câmera passa por cima delas
    off = ease(t / 4.6) * (VH + 700)
    cov = 0.
    for (y, x, big, ax, ay) in ([] if NO_FG else FG):
        X = x - ax + int(1.5 * np.sin(t * 1.1 + x)); Y = y - ay + off
        if Y < VH and Y + big.shape[0] > 0:
            blit(view, big, X, Y); cov += 1
    cues['canopy'].append((t, min(cov / 25, 1.0)))
    # cues de som
    rs = ((240 - cx) / VW, (900 - cy) / VH)
    cues['waterfall_vis'].append((t, float(np.clip(1.3 - abs(rs[1] - .45) * 1.5, 0, 1))))
    cues['fall_pan'].append((t, float(np.clip(rs[0] * 2 - 1, -1, 1))))
    fs = ((FIRE[0] - cx) / VW, (FIRE[1] - cy) / VH)
    cues['fire_vis'].append((t, float(np.clip(1.2 - abs(fs[1] - .55) * 1.8, 0, 1))))
    cues['fire_pan'].append((t, float(np.clip(fs[0] * 2 - 1, -1, 1))))
    # vinheta suave
    return np.clip(view, 0, 255).astype(np.uint8)

VIG = None
def finalize(v):
    global VIG
    if VIG is None:
        yy, xx = np.mgrid[0:VH, 0:VW]
        d = np.hypot((xx - VW / 2) / (VW / 2), (yy - VH / 2) / (VH / 2))
        VIG = (1 - np.clip(d - .75, 0, 1) * .35)[..., None]
    v = v.astype(np.float32)
    lum = v.mean(2, keepdims=True) / 255
    v = 1.07 * v * (np.array([1.10, 1.00, .86]) * lum + np.array([.92, .86, 1.04]) * (1 - lum)) + np.array([6, 0, 8])
    v = np.clip(v * VIG, 0, 255).astype(np.uint8)
    return v.repeat(UPS, 0).repeat(UPS, 1)

if __name__ == '__main__':
    only = [int(a) for a in sys.argv[1:]]
    if only:
        for f in only: Image.fromarray(finalize(render(f))).save(f'{OUTD}/keyframes/s01_f{f:04d}.png')
        sys.exit()
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{VW*UPS}x{VH*UPS}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation',
                           '-pix_fmt', 'yuv420p', f'{OUTD}/s01_video_mudo.mp4'], stdin=subprocess.PIPE)
    keys = {0, N // 4, N // 2, 3 * N // 4, N - 1}
    for f in range(N):
        fr = finalize(render(f)); ff.stdin.write(fr.tobytes())
        if f in keys: Image.fromarray(fr).save(f'{OUTD}/keyframes/s01_f{f:04d}.png')
        if f % 24 == 0: print('frame', f, '/', N, flush=True)
    ff.stdin.close(); ff.wait()
    json.dump(cues, open(f'{OUTD}/s01_cues.json', 'w'))
    print('ok')
