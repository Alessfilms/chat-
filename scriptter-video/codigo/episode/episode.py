"""Episódio completo — Scriptter: O Reino dos Historiadores.
python3 episode.py            → renderiza todas as cenas que faltam (retomável) e concatena
python3 episode.py S05        → (re)renderiza só uma cena
python3 episode.py --keys     → só quadros-chave de todas as cenas (checagem)
"""
import json, os, subprocess, sys, time
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'iso'))
import world_s01 as W
from engine import *
from chars import *
from props import *

ROOT = W.ROOT
OUT = f'{ROOT}/renders/EP'; os.makedirs(f'{OUT}/keyframes', exist_ok=True)
TL = json.load(open(f'{ROOT}/timeline.json'))
SCN = {s['id']: s for s in TL['cenas']}
FPS = 24
FW, FH = 1080, 1920
rng = np.random.default_rng(5)
def ease(t): t = np.clip(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10)
def lerp(a, b, u): return a + (b - a) * u
def seg(t, a, b): return float(np.clip((t - a) / (b - a), 0, 1))

# ---------------- som: eventos e níveis contínuos ----------------
EV = []      # (t, kind, pan, gain)
LV = {}      # kind -> [(t, level, pan)]
def ev(t, kind, pan=0., gain=1.): EV.append((round(float(t), 3), kind, float(np.clip(pan, -1, 1)), float(gain)))
def lv(t, kind, level, pan=0.): LV.setdefault(kind, []).append((round(float(t), 3), float(np.clip(level, 0, 1)), float(np.clip(pan, -1, 1))))

# ---------------- acabamento ----------------
_vig = {}
def finalize(v, ups):
    h, w = v.shape[:2]
    if (h, w) not in _vig:
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
        _vig[(h, w)] = (1 - np.clip(d - .75, 0, 1) * .35)[..., None]
    v = v.astype(np.float32)
    lum = v.mean(2, keepdims=True) / 255
    v = 1.07 * v * (np.array([1.10, 1.00, .86]) * lum + np.array([.92, .86, 1.04]) * (1 - lum)) + np.array([6, 0, 8])
    v = np.clip(v * _vig[(h, w)], 0, 255).astype(np.uint8)
    return v.repeat(ups, 0).repeat(ups, 1)

def blit(view, arr, x, y):
    h, w = arr.shape[:2]; x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, view.shape[1]), min(y + h, view.shape[0])
    if x1 <= x0 or y1 <= y0: return
    s = arr[y0 - y:y1 - y, x0 - x:x1 - x]; a = s[..., 3:4].astype(np.float32) / 255.
    view[y0:y1, x0:x1] = view[y0:y1, x0:x1] * (1 - a) + s[..., :3] * a

# ---------------- transições (desenhadas na grade 270x480, ampliadas 4x) ----------------
TW, TH = 270, 480
def _layer(): return np.zeros((TH, TW, 4), np.float32)
def tr_banner(p):
    L = _layer(); y = int(lerp(-TH * 1.15, TH * 1.15, p))
    x0, x1 = 10, TW - 10
    y0, y1 = y, y + int(TH * 1.15)
    yy, xx = np.mgrid[0:TH, 0:TW]
    m = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1 - np.abs(xx - TW / 2) * .35)
    col = np.array(P['purple'][2], np.float32) + (np.sin(xx / 9.) > .6)[..., None] * 14 - (np.sin(xx / 9. + 1) > .7)[..., None] * 22
    L[m, :3] = col[m]; L[m, 3] = 255
    edge = m & ((xx < x0 + 6) | (xx >= x1 - 6) | (yy >= y1 - np.abs(xx - TW / 2) * .35 - 7))
    L[edge, :3] = P['gold'][1]
    # pena dourada grande
    cy = y + TH * .55; cx = TW / 2
    fx, fy = (xx - cx) / 60., (yy - cy) / 110.
    fea = (np.abs(fx + fy * .45) < .16 * (1 - np.abs(fy) * .6)) & (np.abs(fy) < 1) & m
    L[fea, :3] = P['gold'][2]
    ring = m & (np.abs(np.hypot((xx - cx) / 90., (yy - cy) / 130.) - 1) < .035)
    L[ring, :3] = P['gold'][1]
    L[:max(y0, 0), :, :] = 0
    rod = (yy >= y0 - 6) & (yy < y0) & (xx > 0) & (xx < TW)
    L[rod, :3] = P['wood'][2]; L[rod, 3] = 255
    return L
def tr_gear(p, t):
    L = _layer(); cx = lerp(TW * 1.9, -TW * .9, p); cy = TH * .5
    draw_gear(L, cx, cy, 300, 28, t * .9, P['gold'][1], 1, 1, hole=False)
    draw_gear(L, cx, cy, 140, 14, -t * 1.6, P['wood'][3], 1, 1)
    return L
def tr_parchment(p):
    L = _layer(); x = int(lerp(TW * 1.05, -TW * 1.25, p)); w = int(TW * 1.2)
    yy, xx = np.mgrid[0:TH, 0:TW]
    m = (xx >= x) & (xx < x + w)
    col = np.array([236, 220, 180], np.float32) + (hsh(xx // 3, yy // 3, 4)[..., None] - .5) * 18
    L[m, :3] = col[m]; L[m, 3] = 255
    ln = m & ((yy % 22) < 2) & ((yy // 22) % 1 == 0) & (((xx - x) > 26) & ((xx - x) < w - 26)) & (((xx - x + yy * 3) % 70) < 58)
    L[ln, :3] = (120, 92, 80)
    for ex in (x, x + w):
        e = (np.abs(xx - ex) < 8); L[e, :3] = (200, 170, 120); L[e, 3] = 255; L[e & (np.abs(xx - ex) < 3), :3] = (150, 110, 70)
    return L
def tr_beam(p):
    L = _layer(); x = int(lerp(TW * 1.1, -TW * 1.6, p)); w = int(TW * 1.45)
    yy, xx = np.mgrid[0:TH, 0:TW]
    m = (xx >= x) & (xx < x + w)
    grain = (np.sin((yy + np.sin(xx / 13.) * 6) / 3.) > .7)
    col = np.where(grain[..., None], np.array([30, 18, 16.]), np.array([46, 28, 22.]))
    L[m, :3] = col[m]; L[m, 3] = 255
    return L
def tr_tree(p, seed=3):
    L = _layer(); off = lerp(TW * 1.3, -TW * 1.6, p)
    yy, xx = np.mgrid[0:TH, 0:TW]
    r3 = np.random.default_rng(seed)
    for k in range(40):
        bx = off + r3.uniform(0, TW * 1.3); by = r3.uniform(-40, TH + 40); rr = r3.uniform(50, 110)
        d = ((xx - bx) ** 2 + (yy - by) ** 2) / rr ** 2; m = d < 1
        lvv = np.clip(1.5 - (yy - by) / rr * .8 + (xx - bx) / rr * .5 + (BAYER[yy % 4, xx % 4] - .5) * .6, 0, 3).astype(int)
        col = np.array([(14, 20, 14), (24, 32, 20), (40, 50, 26), (60, 70, 30)], np.float32)[lvv]
        L[m, :3] = col[m]; L[m, 3] = 255
    return L
def tr_clouds(p, seed=8):
    L = _layer(); off = lerp(TH * 1.4, -TH * 1.5, p)
    yy, xx = np.mgrid[0:TH, 0:TW]
    r3 = np.random.default_rng(seed)
    for k in range(46):
        bx = r3.uniform(-30, TW + 30); by = off + r3.uniform(0, TH * 1.4); rr = r3.uniform(40, 90)
        d = ((xx - bx) / 1.3) ** 2 + (yy - by) ** 2; m = d < rr ** 2
        lvv = np.clip(2.5 - (yy - by) / rr * 1.2 + (BAYER[yy % 4, xx % 4] - .5) * .5, 0, 3).astype(int)
        col = np.array([(150, 110, 160), (206, 150, 170), (244, 196, 180), (255, 232, 210)], np.float32)[lvv]
        L[m, :3] = col[m]; L[m, 3] = 255
    return L

def apply_tr(frame, L):
    up = L.repeat(4, 0).repeat(4, 1)
    a = up[..., 3:4] / 255.
    return (frame * (1 - a) + up[..., :3] * a).astype(np.uint8)

# limites: (tempo, tipo)
def bounds():
    b = []
    order = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11']
    kinds = {'S01': 'clouds', 'S02': 'tree', 'S03': 'parchment', 'S04': 'beam', 'S05': 'gear', 'S06': 'banner', 'S07': 'parchment', 'S09': 'clouds'}
    for k in order[:-1]:
        if k in kinds: b.append((SCN[k]['end'], kinds[k]))
    b.append((SCN['S03']['start'] + 4.0, 'banner'))
    b.append((SCN['S06']['start'] + 3.2, 'tree'))
    return b
BOUNDS = bounds()
TR_HALF = .42
TR_SOUND = {'banner': 'cloth', 'gear': 'gearwhir', 'parchment': 'paper', 'beam': None, 'tree': 'leaves', 'clouds': None}
for (T, k) in BOUNDS:
    if TR_SOUND.get(k): ev(T - TR_HALF, TR_SOUND[k], 0, .8)

def transition_overlay(tg, frame):
    for (T, k) in BOUNDS:
        if T - TR_HALF <= tg < T + TR_HALF:
            p = (tg - (T - TR_HALF)) / (2 * TR_HALF)
            L = {'banner': lambda: tr_banner(p), 'gear': lambda: tr_gear(p, tg), 'parchment': lambda: tr_parchment(p),
                 'beam': lambda: tr_beam(p), 'tree': lambda: tr_tree(p), 'clouds': lambda: tr_clouds(p)}[k]()
            return apply_tr(frame, L)
    return frame

# ======================= EXTERIOR =======================
TABLE_POS = [(196, 598), (300, 640), (214, 650), (296, 590)]
STATIC_NT = [o for o in W.STATIC if (round(o['x']), round(o['y'])) not in TABLE_POS]
TBL_FULL = [table(k + 3, True) for k in range(4)]
TBL_EMPTY = [table(k + 3, False) for k in range(4)]
CART_FR = [cart(n) for n in range(0, 21)]
SMALL_CACHE = {}
def sm(spec, frame, back, flip, walk=True, scared=False):
    k = (spec['name'], frame % 4, back, flip, walk, scared)
    if k not in SMALL_CACHE: SMALL_CACHE[k] = small(spec, frame, back, flip, walk, scared)
    return SMALL_CACHE[k]
def vil(i, frame, back, flip, idle=False): return W.villager(i, frame, back, flip, idle)
def facing(v): back = v[1] < -.05; flip = (v[0] < 0) != back; return back, flip

def path_pos(pts, d):
    pts = np.asarray(pts, float); segs = np.hypot(*np.diff(pts, axis=0).T); cum = np.r_[0, np.cumsum(segs)]
    d = np.clip(d, 0, cum[-1]); k = min(np.searchsorted(cum, d, side='right') - 1, len(pts) - 2)
    u = (d - cum[k]) / max(segs[k], 1e-6); p = pts[k] + (pts[k + 1] - pts[k]) * u
    return p, pts[k + 1] - pts[k], cum[-1]

def ext_frame(tg, t, cx, cy, actors, tables='full', balloon_at=None, birds=None, petals=True, river_snd=True):
    VW, VH = W.VW, W.VH
    view = np.zeros((VH, VW, 3), np.float32)
    sky_y = (0 - cy) + (cy - W.CAM1[1]) * .5
    sky_y = max(sky_y, W.SKY.shape[0] * 0 + 300 - W.SKY.shape[0] - cy)
    view[:] = W.SKY[0, cx:cx + VW][None]
    sy0 = int(round(sky_y))
    if sy0 + W.SKY.shape[0] > 0:
        blit(view, np.dstack([W.SKY[:, cx:cx + VW], np.full(W.SKY.shape[:1] + (VW,), 255)]), 0, sy0)
    if cy + VH > 0:
        y0 = max(cy, 0); g = W.GROUND[y0:cy + VH, cx:cx + VW].copy(); ga = W.GALPHA[y0:cy + VH, cx:cx + VW]
        wm = W.WATER[y0:cy + VH, cx:cx + VW]
        if wm.any():
            yy, xx = np.nonzero(wm); wy, wx = yy + y0, xx + cx
            h1 = hsh(((wx - t * 14) // 4).astype(int), ((wy - t * 7) // 2).astype(int), 7)
            h2 = hsh(((wx - t * 22) // 3).astype(int), ((wy - t * 11) // 1).astype(int), 8)
            sp = h1 > .9; g[yy[sp], xx[sp]] = g[yy[sp], xx[sp]] * .45 + c('water', 3) * .55
            sp2 = h2 > .975; g[yy[sp2], xx[sp2]] = c('water', 4)
        sub = view[y0 - cy:]; sub[ga] = g[ga]
    fl = .85 + .1 * np.sin(t * 15) * np.sin(t * 6.1 + 1) + .05 * np.sin(t * 31)
    fx, fy = W.FIRE[0] - cx, W.FIRE[1] - cy
    if -80 < fy < VH + 80:
        y0_, y1_ = int(max(fy - 70, 0)), int(min(fy + 70, VH)); x0_, x1_ = int(max(fx - 110, 0)), int(min(fx + 110, VW))
        if y1_ > y0_ and x1_ > x0_:
            yy, xx = np.mgrid[y0_:y1_, x0_:x1_]
            d = np.hypot(xx - fx, (yy - fy) / .55)
            q = np.floor(np.clip(1 - d / 100, 0, 1) ** 1.6 * 5) / 5 * (.26 * fl)
            view[y0_:y1_, x0_:x1_] += q[..., None] * np.array([255, 140, 50])
    dyn = []
    dyn.append(dict(key=W.FIRE[1], spr=W.FIRE_FR[int(t * 12) % len(W.FIRE_FR)], x=W.FIRE[0], y=W.FIRE[1]))
    for k, (bx_, by_) in enumerate(W.BANNERS):
        dyn.append(dict(key=by_ + (40 if k == 4 else 0), spr=W.BANNER_FR[int(t * 6 + k) % 4], x=bx_, y=by_ + (-13 if k == 4 else 0)))
    dyn.append(dict(key=W.cy_ + 91, spr=W.BIGBANNER_FR[int(t * 5) % 4], x=W.GATE_BANNER[0] - 2, y=W.GATE_BANNER[1] + 10))
    dyn.append(dict(key=W.t2s(W.mgx + W.mw, W.mgy + W.md)[1] + 30, spr=waterwheel(-tg * 1.6), x=W.WHEEL_AT[0], y=W.WHEEL_AT[1]))
    for k, (tx, ty) in enumerate(TABLE_POS):
        full = tables == 'full' or (isinstance(tables, (list, tuple)) and tables[k])
        dyn.append(dict(key=ty, spr=(TBL_FULL if full else TBL_EMPTY)[k], x=tx, y=ty))
    allobj = sorted(STATIC_NT + dyn + actors, key=lambda o: o['key'])
    for o in allobj:
        sp = o['spr']; x = o['x'] - sp.ax - cx; y = o['y'] - sp.ay - cy
        if x > VW or y > VH or x + sp.a.shape[1] < 0 or y + sp.a.shape[0] < 0: continue
        blit(view, sp.a, x, y)
    for k in range(9):
        life = (t * .8 + k / 9) % 1
        ex = W.FIRE[0] + 6 * np.sin(k * 2.3 + t * 2) - cx; ey = W.FIRE[1] - 14 - life * 46 - cy
        if 0 <= ey < VH - 1 and 0 <= ex < VW - 1 and life < .85: view[int(ey), int(ex)] = np.array([255, 210 - life * 120, 80])
    for si, (sx, sy) in enumerate(W.SMOKES):
        for k in range(6):
            life = (t * .25 + k / 6 + si * .13) % 1
            px = sx + life * 26 + 3 * np.sin(life * 6 + k) - cx; py = sy - life * 70 - cy
            rad = 2 + life * 7; a = .6 * (1 - life)
            y0, y1, x0, x1 = int(py - rad), int(py + rad) + 1, int(px - rad), int(px + rad) + 1
            if y1 < 0 or y0 >= VH or x1 < 0 or x0 >= VW: continue
            gy_, gx_ = np.mgrid[max(y0, 0):min(y1, VH), max(x0, 0):min(x1, VW)]
            dd = ((gx_ - px) ** 2 + (gy_ - py) ** 2) / rad ** 2; m = dd < 1; m2 = dd < .45
            view[gy_[m], gx_[m]] = view[gy_[m], gx_[m]] * (1 - a * .7) + np.array([188, 170, 196]) * a * .7
            view[gy_[m2], gx_[m2]] = view[gy_[m2], gx_[m2]] * (1 - a * .5) + np.array([226, 214, 226]) * a * .5
    if balloon_at is not None:
        bx_, by_ = balloon_at
        blit(view, BALLOON_FR[int(t * 4) % 4].a, bx_ - BALLOON_FR[0].ax - cx, by_ - BALLOON_FR[0].ay - cy)
    if birds is not None:
        tb = t - birds
        if 0 <= tb <= 7:
            for i in range(6):
                bx_ = VW + 10 - tb * 70 + i * 13; by_ = 110 + (i % 2) * 8 + i * 3 - tb * 8 + 2 * np.sin(tb * 3 + i)
                fr_ = int(t * 10 + i) % 3
                pts = [[(0, 0), (1, 1), (2, 2), (3, 2), (4, 2), (5, 1), (6, 0)], [(0, 1), (1, 1), (2, 2), (3, 2), (4, 2), (5, 1), (6, 1)],
                       [(1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (2, 3), (4, 3)]][fr_]
                for (px, py) in pts:
                    X, Y = int(bx_ + px), int(by_ + py)
                    if 0 <= X < VW and 0 <= Y < VH: view[Y, X] = (44, 24, 44)
    if petals:
        for k in range(12):
            px = (k * 61 + t * (24 + k * 2)) % (VW - 2); py = (k * 113 + t * (14 + k % 5 * 4) + 20 * np.sin(t + k)) % VH
            view[int(py), int(px)] = (196, 140, 206) if k % 3 == 0 else (214, 196, 96)
    # níveis contínuos de som
    rs = ((240 - cx) / VW, (900 - cy) / VH)
    if river_snd: lv(tg, 'river', 1.3 - abs(rs[1] - .45) * 1.5, rs[0] * 2 - 1)
    fs = ((W.FIRE[0] - cx) / VW, (W.FIRE[1] - cy) / VH)
    lv(tg, 'fire', 1.2 - abs(fs[1] - .55) * 1.8, fs[0] * 2 - 1)
    ws = ((W.WHEEL_AT[0] - cx) / VW, (W.WHEEL_AT[1] - cy) / VH)
    lv(tg, 'wheel', 1.25 - abs(ws[1] - .5) * 1.7, ws[0] * 2 - 1)
    return view

BALLOON_FR = [balloon(f) for f in range(4)]

# ======================= INTERIOR =======================
IW, IH = 216, 384
THRONE = throne_room(7, 7, 190)
WORK = {k: workshop(6, 6, 190, door_open=k / 4) for k in range(5)}
BENCH = bench()
TORCH_FR = [torch_flame(f) for f in range(6)]
CANDLE_FR = [candle(f) for f in range(4)]
BIG = {}
def bg(spec, pose='rest', frame=0, back=False, flip=False, expr='neutral', walk=True):
    k = (spec['name'], pose, frame % 4, back, flip, expr, walk)
    if k not in BIG: BIG[k] = big(spec, pose, frame, back, flip, expr, walk)
    return BIG[k]

def room_frame(tg, t, room, ytop, items, warm=1.0, torches=False, candle_at=None, rays=False, beams=True):
    view = np.zeros((IH, IW, 3), np.float32)
    yy = np.arange(IH)[:, None, None]
    view[:] = np.array([20, 12, 22]) + (yy / IH) * np.array([10, 4, 8])
    left = (IW - room.a.shape[1]) // 2
    blit(view, room.a, left, ytop)
    ox, oy = left + room.ax, ytop + room.ay
    def to_s(gx, gy, z=0): return np.array([ox, oy]) + gx * EX + gy * EY + z * UP
    if rays:
        for k, r_ in enumerate(room.rays):
            base = np.array([ox, oy]) + r_
            a = .18 + .04 * np.sin(t * 1.3 + k)
            pts = [base + np.array([-10, -50]), base + np.array([14, -62]), base + np.array([60, 20]), base + np.array([30, 34])]
            from PIL import ImageDraw as _D
            im = Image.new('L', (IW, IH), 0); _D.Draw(im).polygon([tuple(p) for p in pts], fill=255)
            m = np.asarray(im) > 0
            view[m] = view[m] * (1 - a) + np.array([255, 200, 130]) * a
    items = sorted(items, key=lambda it: it[0])
    for key, spr, gx, gy, z in items:
        p = to_s(gx, gy, z)
        blit(view, spr.a, p[0] - spr.ax, p[1] - spr.ay)
    if torches:
        for k, (tx, ty) in enumerate(room.torches):
            fr = TORCH_FR[int(t * 10 + k * 2) % 6]
            blit(view, fr.a, ox + tx - fr.ax, oy + ty - fr.ay)
            y0, y1, x0, x1 = int(oy + ty - 40), int(oy + ty + 40), int(ox + tx - 40), int(ox + tx + 40)
            gy_, gx_ = np.mgrid[max(y0, 0):min(y1, IH), max(x0, 0):min(x1, IW)]
            d = np.hypot(gx_ - ox - tx, gy_ - oy - ty)
            fl = .8 + .2 * np.sin(t * 13 + k * 2) * np.sin(t * 5 + k)
            q = np.floor(np.clip(1 - d / 40, 0, 1) ** 1.5 * 4) / 4 * .22 * fl
            view[gy_, gx_] += q[..., None] * np.array([255, 150, 60])
    if candle_at is not None:
        gx, gy, z = candle_at
        p = to_s(gx, gy, z); fr = CANDLE_FR[int(t * 8) % 4]
        blit(view, fr.a, p[0] - fr.ax, p[1] - fr.ay)
        gy_, gx_ = np.mgrid[0:IH, 0:IW]
        d = np.hypot(gx_ - p[0], (gy_ - p[1] + 10) / .8)
        fl = .85 + .15 * np.sin(t * 11) * np.sin(t * 4.3)
        q = np.floor(np.clip(1 - d / 95, 0, 1) ** 1.4 * 5) / 5 * .3 * fl
        view += q[..., None] * np.array([255, 160, 70])
    view *= warm
    return view

def interior_sound(tg, kind_level):
    for k, (l, p) in kind_level.items(): lv(tg, k, l, p)

# ======================= CENAS =======================
def S01(tg, t, f):
    v = W.render(int(round(t * FPS)))
    # sons: mesmos cues da S01 aprovada
    cue = {k: W.cues[k][-1] for k in ('waterfall_vis', 'fall_pan', 'fire_vis', 'fire_pan')}
    lv(tg, 'river', cue['waterfall_vis'][1], cue['fall_pan'][1]); lv(tg, 'fire', cue['fire_vis'][1], cue['fire_pan'][1])
    WX, WY = W.WHEEL_AT; cx, cy = W.cam(int(round(t * FPS)))
    lv(tg, 'wheel', 1.25 - abs((WY - cy) / 640 - .5) * 1.7, ((WX - cx) / 360) * 2 - 1)
    return v.astype(np.float32), 3

def S02(tg, t, f):
    D = SCN['S02']['end'] - SCN['S02']['start']
    u = ease(t / D)
    cx, cy = int(round(lerp(70, 60, u))), int(round(lerp(560, 330, u)))
    actors = []
    # carroça de confisco ao lado do caminho, ganhando livros
    CART = (226, 708)
    trips = []
    gpaths = [[(214, 650), CART], [(196, 598), (210, 640), CART], [(300, 640), (262, 690), CART], [(296, 590), (280, 640), CART]]
    taken = [False] * 4
    books = 0
    for gi, (start_t, tbl) in enumerate([(0.6, 0), (1.2, 2), (3.0, 1), (3.6, 3)]):
        gp = gpaths[tbl]
        p_, v_, L = path_pos(gp, 0)
        speed = 22.
        dur = L / speed
        tt = t - start_t
        if tt < 0:
            pos, v_ = np.array(gp[0], float), np.array([0, 1.])
            walking = False
        elif tt < dur:
            pos, v_, _ = path_pos(gp, tt * speed); walking = True; taken[tbl] = True
            if int(tt * 6) != int((tt - 1 / FPS) * 6): ev(tg, 'armorstep', (pos[0] - cx) / 180 - 1, .5)
        else:
            pos, v_ = np.array(CART, float) + np.array([10 - gi * 6, -4]), np.array([0, 1.]); walking = False; taken[tbl] = True
            books += 5
            if tt - dur < 1 / FPS: ev(tg, 'bookthud', (pos[0] - cx) / 180 - 1, .9)
        back, flip = facing(v_)
        actors.append(dict(key=pos[1], spr=sm(GUARD, int(t * 7) if walking else 0, back, flip, walking), x=pos[0], y=pos[1]))
        if walking:
            bk = BOOKSTACK
            actors.append(dict(key=pos[1] + .1, spr=bk, x=pos[0] + (2 if not flip else -2), y=pos[1] - 8))
    tables = [not tk for tk in taken]
    actors.append(dict(key=CART[1], spr=CART_FR[min(books, 20)], x=CART[0], y=CART[1]))
    # moradores silenciosos, parados, cabisbaixos (sem livros)
    for j, (x, y) in enumerate([(232, 604), (268, 606), (180, 630), (318, 626), (246, 668), (282, 672), (204, 676), (150, 600), (340, 600),
                                 (256, 736), (290, 760), (214, 760)]):
        actors.append(dict(key=y, spr=vil(40 + j, 0, j % 3 == 0, j % 2 == 0, idle=True), x=x, y=y))
    # guarda vigiando na ponte
    actors.append(dict(key=W.BR_KEY + 1, spr=sm(GUARD, 0, False, True, False), x=258, y=880 - 13))
    v = ext_frame(tg, t + 10, cx, cy, actors, tables=tables)
    return v, 3

BOOKSTACK = Spr(10, 10, 5, 8)
for k, col in enumerate([(140, 40, 40), (60, 70, 130), (120, 70, 30)]):
    BOOKSTACK.a[6 - k * 2:8 - k * 2, 1 + k % 2:8 + k % 2, :3] = col; BOOKSTACK.a[6 - k * 2:8 - k * 2, 1 + k % 2:8 + k % 2, 3] = 255
BOOKSTACK.finish()

def throne_items(t, king_pose='rest', herald=False, extra=()):
    it = []
    it.append((1.6, bg(KING, king_pose, 0, False, False, 'serious', False), .95, .95, 8))
    it.append((3.7, bg(GUARD, 'rest', 0, False, False, 'neutral', False), 2.9, .8, 0))
    it.append((3.7, bg(GUARD, 'rest', 0, False, True, 'neutral', False), .8, 2.9, 0))
    if herald:
        it.append((5.0, bg(HERALD, 'hold', 0, False, True, 'neutral', False), 2.7, 2.3, 0))
        it.append((5.01, scroll_open(1.0), 2.7, 2.42, 17))
    it.extend(extra)
    return it

def S03(tg, t, f):
    D = SCN['S03']['end'] - SCN['S03']['start']
    if t < 4.0:
        u = ease(t / 4.0)
        cx, cy = 60, int(round(lerp(330, 70, u)))
        v = ext_frame(tg, t + 20, cx, cy, [], tables=[False] * 4, birds=0.5)
        if abs(t - 1.5) < 1 / FPS: ev(tg, 'gate', 0, .7)
        return v, 3
    tt = t - 4.0
    pose = 'point' if 2.4 < tt < 5.6 else 'rest'
    if abs(tt - 2.4) < 1 / FPS: ev(tg, 'robe', 0, .8)
    if abs(tt - .6) < 1 / FPS: ev(tg, 'paper', .2, .8)
    ytop = int(round(lerp(40, 10, ease(tt / (D - 4.0)))))
    v = room_frame(tg, tt, THRONE, ytop, throne_items(tt, pose, herald=True), torches=True, rays=True)
    lv(tg, 'torch', .8, 0)
    return v, 5

def workshop_items(t, inv_pose=('write', 'hold'), expr=('neutral', 'neutral'), parts=True, crystal=0.):
    it = []
    it.append((5.8, BENCH, 2.0, 2.6, 0))
    if parts: it.append((5.81, bench_parts(t, crystal), 3.2, 3.15, 17))
    it.append((4.6, bg(INV1, inv_pose[0], int(t * 6), False, False, expr[0], False), 2.6, 2.0, 0))
    it.append((4.6, bg(INV2, inv_pose[1], 0, False, True, expr[1], False), 3.9, 2.1, 0))
    return it

def S04(tg, t, f):
    D = SCN['S04']['end'] - SCN['S04']['start']
    ytop = int(round(lerp(10, 50, ease(t / D))))
    if int(t * 3) != int((t - 1 / FPS) * 3): ev(tg, 'tink', .1, .5)
    v = room_frame(tg, t, WORK[0], ytop, workshop_items(t), candle_at=(2.35, 2.75, 17))
    lv(tg, 'candle', .8, 0)
    return v, 5

def S05(tg, t, f):
    D = SCN['S05']['end'] - SCN['S05']['start']
    yaw = lerp(-.75, .55, ease(t / D))
    speed = .25 + 1.6 * seg(t, 0, 2.2)
    phase = .5 * (.25 * t + 1.6 * (np.clip(t, 0, 2.2) ** 2 / 4.4 + max(t - 2.2, 0)))
    crystal = seg(t, 2.0, 3.0) * (.85 + .15 * np.sin(t * 6))
    plen = 95 * seg(t, 3.2, D - .2)
    m = machine_frame(phase * 2, yaw, IW, IH, scale=1.75, crystal=crystal, print_len=plen, gear_speed=1.0, cy=236)
    view = np.zeros((IH, IW, 3), np.float32) + np.array([24, 14, 22])
    a = m.a[..., 3:4] / 255.
    view = view * (1 - a) + m.a[..., :3] * a
    # brilho do cristal
    if crystal > 0:
        cxp, cyp = m.crystal
        gy_, gx_ = np.mgrid[0:IH, 0:IW]
        d = np.hypot(gx_ - cxp, gy_ - cyp)
        q = np.floor(np.clip(1 - d / 120, 0, 1) ** 1.6 * 5) / 5 * .35 * crystal
        view += q[..., None] * np.array([180, 110, 255])
    # vapor
    sx, sy = m.steam
    for k in range(5):
        life = (t * .5 + k / 5) % 1
        if t < 1.0: break
        px, py = sx + life * 10, sy - life * 60; rad = 3 + life * 9; al = .55 * (1 - life)
        gy_, gx_ = np.mgrid[max(int(py - rad), 0):min(int(py + rad) + 1, IH), max(int(px - rad), 0):min(int(px + rad) + 1, IW)]
        mm = ((gx_ - px) ** 2 + (gy_ - py) ** 2) < rad ** 2
        view[gy_[mm], gx_[mm]] = view[gy_[mm], gx_[mm]] * (1 - al) + np.array([220, 210, 226]) * al
    lv(tg, 'gears', min(speed / 1.8, 1), 0)
    lv(tg, 'crystal', crystal, 0)
    lv(tg, 'printer', 1.0 if plen > 0 and plen < 95 else 0, 0)
    if int(t * .5 + .5) != int((t - 1 / FPS) * .5 + .5) and t > 1: ev(tg, 'steam', .3, .6)
    return view, 5

def S06(tg, t, f):
    if t < 3.2:
        door = min(int(seg(t, .2, .6) * 4), 4)
        if abs(t - .2) < 1 / FPS: ev(tg, 'door', .5, 1.0)
        it = workshop_items(t, ('scared', 'scared'), ('worried', 'worried'), parts=True, crystal=.3)
        for gi, (st, pts) in enumerate([(.6, [(4.7, .3), (4.6, 1.5)]), (1.0, [(4.7, .3), (5.2, 2.2)])]):
            u = seg(t, st, st + 1.4)
            p = np.array(pts[0]) + (np.array(pts[1]) - np.array(pts[0])) * u
            walking = 0 < u < 1
            if walking and int(t * 6) != int((t - 1 / FPS) * 6): ev(tg, 'armorstep', .5, .8)
            it.append((p[0] + p[1], bg(GUARD, 'rest', int(t * 7), False, True, 'serious', walking), p[0], p[1], 0))
        v = room_frame(tg, t, WORK[door], 40, it, candle_at=(2.35, 2.75, 17))
        return v, 5
    tt = t - 3.2
    route = [(340, 520), (300, 540), (262, 548), (244, 520), (240, 488), (237, 466)]
    acts = []
    lead, _, L = path_pos(route, 0)
    dd = tt * 20
    for k, (spec, off) in enumerate([(GUARD, 0), (INV1, -12), (INV2, -22), (GUARD, -34)]):
        p, v_, _ = path_pos(route, max(dd + off, 0))
        back, flip = facing(v_)
        spr = sm(spec, int(tt * 7 + k), back, flip, True)
        acts.append(dict(key=p[1], spr=spr, x=p[0] + (3 if k in (1, 2) and k == 2 else 0), y=p[1]))
        if int(tt * 6) != int((tt - 1 / FPS) * 6) and k in (0, 3): ev(tg, 'armorstep', 0, .5)
    cpos, _, _ = path_pos(route, dd - 10)
    cx, cy = 60, int(round(np.clip(cpos[1] - 380, 0, 900)))
    v = ext_frame(tg, t + 50, cx, cy, acts, tables=[False] * 4)
    return v, 3

def S07(tg, t, f):
    D = SCN['S07']['end'] - SCN['S07']['start']
    it = []
    # entrada pelo tapete (de costas), depois param
    for k, (spec, p0, p1, st) in enumerate([(INV1, (6.2, 5.6), (3.6, 3.0), 0), (INV2, (5.6, 6.2), (3.0, 3.6), 0),
                                            (GUARD, (6.8, 6.2), (4.6, 4.1), .2), (GUARD, (6.2, 6.8), (4.1, 4.6), .2)]):
        u = seg(t, st, st + 2.6)
        p = np.array(p0) + (np.array(p1) - np.array(p0)) * ease(u)
        walking = 0 < u < 1
        turned = t > 6.6 and k < 2
        if walking and int(t * 6) != int((t - 1 / FPS) * 6): ev(tg, 'armorstep' if k > 1 else 'step', 0, .6)
        spr = bg(spec, 'rest', int(t * 7), not turned, k % 2 == 1, 'worried', walking) if k < 2 else bg(spec, 'rest', int(t * 7), True, k % 2 == 1, 'neutral', walking)
        it.append((p[0] + p[1], spr, p[0], p[1], 0))
    pose = 'point' if 3.6 < t < 6.4 else ('raise' if 6.4 <= t < 7.4 else 'rest')
    if abs(t - 3.6) < 1 / FPS: ev(tg, 'robe', 0, .9)
    if abs(t - 4.4) < 1 / FPS: ev(tg, 'speartap', -.3, .9)
    # câmera: começa nos jovens (embaixo), sobe ao Rei, desce de novo (contraplano)
    a = ease(seg(t, 2.0, 3.6)); b = ease(seg(t, 6.6, 8.2))
    ytop = int(round(lerp(lerp(70, 20, a), 60, b)))
    v = room_frame(tg, t, THRONE, ytop, throne_items(t, pose, extra=it), torches=True, rays=True)
    lv(tg, 'torch', .8, 0)
    return v, 5

def S08(tg, t, f):
    D = SCN['S08']['end'] - SCN['S08']['start']
    it = workshop_items(t, ('write' if t < 1.7 else 'hold', 'hold'), ('worried', 'worried'), parts=False, crystal=0)
    if t < 1.7:
        it.append((5.9, scroll_open(min(t / 1.2, 1)), 3.2, 3.15, 17))
        if int(t * 5) != int((t - 1 / FPS) * 5): ev(tg, 'quill', 0, .7)
    elif t < 2.9:
        it.append((5.9, scroll_rolled(), 3.2, 3.15, 17))
        if abs(t - 1.7) < 1 / FPS: ev(tg, 'paper', 0, .8)
    elif t < 4.1:
        it.append((5.9, bottle(True), 3.2, 3.15, 17))
        if abs(t - 2.9) < 1 / FPS: ev(tg, 'glass', 0, 1.0)
        if abs(t - 3.5) < 1 / FPS: ev(tg, 'cork', 0, .9)
    else:
        rise = max(t - 5.0, 0) ** 1.6 * 70
        bf = BALLOON_FR[int(t * 4) % 4]
        it.append((5.9, bf, 3.2, 3.15, 17 + rise))
        if abs(t - 4.1) < 1 / FPS: ev(tg, 'rope', 0, .9)
        if abs(t - 5.0) < 1 / FPS: ev(tg, 'whoosh', 0, .8)
    v = room_frame(tg, t, WORK[0], 40, it, candle_at=(2.35, 2.75, 17))
    lv(tg, 'candle', .7, 0)
    return v, 5

def S09(tg, t, f):
    D = SCN['S09']['end'] - SCN['S09']['start']
    by = lerp(470, -40, ease(t / D) * .9 + t / D * .1)
    bx = 330 + 14 * np.sin(t * 1.1)
    cy = int(round(np.clip(by - 330, 0, 900)))
    v = ext_frame(tg, t + 70, 60, cy, [], tables=[False] * 4, balloon_at=(bx, by), birds=1.2)
    if int(t * 1.2) != int((t - 1 / FPS) * 1.2): ev(tg, 'flutter', (bx - 240) / 180, .6)
    return v, 3

# moradores da cena 10: 2 → 10 → 200
def crowd_plan():
    r2 = np.random.default_rng(42)
    occ = W.occ
    spots = []
    tries = 0
    while len(spots) < 200 and tries < 40000:
        tries += 1
        a = r2.uniform(0, 2 * np.pi); rr = np.sqrt(r2.random()) * 1.0
        x = W.PLAZA[0] + np.cos(a) * rr * 175; y = W.PLAZA[1] + np.sin(a) * rr * 120 + 20
        xi, yi = int(x), int(y)
        if not (70 <= xi < 420 and 360 <= yi < 830): continue
        if W.TMAP[yi, xi] in (3, 5): continue
        if abs(x - W.FIRE[0]) < 26 and abs(y - W.FIRE[1]) < 14: continue
        if occ[yi - 2:yi + 2, xi - 3:xi + 3].any() and W.TMAP[yi, xi] not in (2, 4): continue
        if any(abs(x - sx) < 7 and abs(y - sy) < 5 for sx, sy, _ in spots): continue
        spots.append((x, y, a))
    entries = [(196, 952), (72, 690), (428, 690), (236, 462), (300, 822)]
    plan = []
    for i, (x, y, a) in enumerate(spots):
        stage = 0 if i < 2 else (1 if i < 10 else 2)
        t0 = {0: .3, 1: 5.0, 2: 9.6}[stage] + (0 if stage < 2 else r2.uniform(0, 2.4)) + (0 if stage == 0 else r2.uniform(0, 1.0) if stage == 1 else 0)
        e = entries[int(np.argmin([np.hypot(ex - x, ey - y) for ex, ey in entries]))]
        e = (e[0] + r2.uniform(-10, 10), e[1] + r2.uniform(-6, 6))
        plan.append(dict(i=i, spot=(x, y), entry=e, t0=t0, speed=r2.uniform(24, 34), stage=stage))
    return plan
CROWD = crowd_plan()

def crowd_actors(t, cheer=False):
    acts = []
    for c_ in CROWD:
        tt = t - c_['t0']
        if tt < 0: continue
        e, s_ = np.array(c_['entry']), np.array(c_['spot'])
        L = np.hypot(*(s_ - e)); dur = L / c_['speed']
        if tt < dur:
            p = e + (s_ - e) * tt / dur; v_ = s_ - e; walking = True
        else:
            p = s_; v_ = np.array([W.FIRE[0] - s_[0], W.FIRE[1] - s_[1]]); walking = False
        back, flip = facing(v_)
        i = c_['i']
        if cheer and not walking and (i % 3 == 0):
            spr = sm(dict(INV1 if i % 2 else INV2, name=f'c{i%6}'), 0, False, flip, False, True) if False else vil(i, 0, False, flip, idle=True)
        else:
            spr = vil(i, int(t * 7 + i), back, flip, idle=not walking)
        acts.append(dict(key=p[1], spr=spr, x=p[0], y=p[1] - (1 if cheer and not walking and int(t * 4 + i) % 4 == 0 else 0)))
    return acts

def S10(tg, t, f):
    cx, cy = 60, int(round(lerp(350, 330, t / 15)))
    acts = crowd_actors(t)
    n_walk = sum(1 for c_ in CROWD if 0 <= t - c_['t0'] < np.hypot(*(np.array(c_['spot']) - np.array(c_['entry']))) / c_['speed'])
    lv(tg, 'crowdsteps', min(n_walk / 40, 1), 0)
    v = ext_frame(tg, t + 80, cx, cy, acts, tables='full')
    # névoa entre os tempos
    for T in (4.6, 9.2):
        d = 1 - abs(t - T) / .6
        if d > 0:
            yy2, xx2 = np.mgrid[0:W.VH:2, 0:W.VW:2]
            band = .5 + .5 * np.sin(yy2 * .02 + xx2 * .008 + t * .4) * np.sin(xx2 * .013 - t * .25)
            lvl = (np.floor(np.clip(band * d * .9 + d * .3, 0, 1) * 5) / 5 * .75).repeat(2, 0).repeat(2, 1)[:W.VH, :W.VW, None]
            v = v * (1 - lvl) + np.array([226, 196, 186]) * lvl
    return v, 3

def S11(tg, t, f):
    D = SCN['S11']['end'] - SCN['S11']['start']
    u = ease(t / (D - 1.0))
    cx, cy = 60, int(round(lerp(330, 40, u)))
    acts = crowd_actors(30 + t, cheer=True)
    v = ext_frame(tg, t + 95, cx, cy, acts, tables='full', birds=2.0)
    return v, 3

SCENES = dict(S01=S01, S02=S02, S03=S03, S04=S04, S05=S05, S06=S06, S07=S07, S08=S08, S09=S09, S10=S10, S11=S11)

def render_scene(sid, keys_only=False):
    sc = SCN[sid]; fn = SCENES[sid]
    f0, f1 = sc['frame_in'], sc['frame_out']
    path = f'{OUT}/{sid}.mp4'
    frames = range(f0, f1)
    if keys_only:
        n = f1 - f0
        for fg in (f0 + 2, f0 + n // 2, f1 - 12):
            tg = fg / FPS; v, ups = fn(tg, tg - sc['start'], fg - f0)
            img = transition_overlay(tg, finalize(v, ups))
            Image.fromarray(img).save(f'{OUT}/keyframes/{sid}_{fg:04d}.png')
        return
    ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{FW}x{FH}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-tune', 'animation', '-pix_fmt', 'yuv420p', path + '.part.mp4'],
                          stdin=subprocess.PIPE)
    n = f1 - f0
    for fg in frames:
        tg = fg / FPS
        v, ups = fn(tg, tg - sc['start'], fg - f0)
        img = transition_overlay(tg, finalize(v, ups))
        ff.stdin.write(img.tobytes())
        if fg - f0 in (n // 2,): Image.fromarray(img).save(f'{OUT}/keyframes/{sid}_{fg:04d}.png')
    ff.stdin.close(); ff.wait()
    os.replace(path + '.part.mp4', path)
    json.dump(dict(EV=[e for e in EV if sc['start'] - .5 <= e[0] < sc['end'] + .5], LV={k: [x for x in v_ if sc['start'] <= x[0] < sc['end']] for k, v_ in LV.items()}),
              open(f'{OUT}/{sid}_sound.json', 'w'))

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--keys' in args:
        for sid in ([a for a in args if a.startswith('S')] or list(SCENES)):
            render_scene(sid, keys_only=True); print('keys', sid, flush=True)
        sys.exit()
    todo = [a for a in args if a.startswith('S')] or [s for s in SCENES if not os.path.exists(f'{OUT}/{s}.mp4')]
    for sid in todo:
        t0 = time.time(); render_scene(sid); print(sid, 'ok', round(time.time() - t0, 1), 's', flush=True)
    with open(f'{OUT}/concat.txt', 'w') as fh:
        for sid in SCENES: fh.write(f"file '{OUT}/{sid}.mp4'\n")
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', f'{OUT}/concat.txt', '-c', 'copy', f'{OUT}/episodio_mudo.mp4'], check=True)
    print('concat ok')
