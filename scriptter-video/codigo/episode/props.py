"""Interiores, adereços e a máquina Scriptter (3D projetada em pixel art)."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'iso'))
from engine import *

# ---------------- interiores ----------------
def tex_planks(shade='mid'):
    def f(U, V, LA, LB):
        row = (V // 5).astype(int); n = hsh(row, ((U + row * 7) // 22).astype(int), 21)
        col = c('wood', 2) + (n[..., None] - .5) * 26
        col = np.broadcast_to(col, U.shape + (3,)).copy()
        col[(V % 5) < 1] = c('wood', 0)
        col[(((U + row * 7) % 22) < .8)] = c('wood', 1)
        return lit(col, shade)
    return f

def tex_floor_tiles(shade='mid'):
    def f(U, V, LA, LB):
        a, b = (U // 12).astype(int), (V // 12).astype(int)
        chk = (a + b) % 2
        col = np.where(chk[..., None] == 0, c('stone', 3), c('stone', 2)) + (hsh(a, b, 5)[..., None] - .5) * 14
        col[((U % 12) < .8) | ((V % 12) < .8)] = c('stone', 1)
        return lit(col, shade)
    return f

def wall_window(U, V, cu, v0, ww, wh, frame=None):
    """máscara de janela em arco + vidro em pôr do sol"""
    du = U - cu
    inside = (np.abs(du) < ww / 2) & (V > v0) & (V < v0 + wh + np.sqrt(np.clip((ww / 2) ** 2 - du ** 2, 0, None)))
    return inside

def throne_room(w=7, d=7, h=150):
    s = Spr(int((w + d) * 16 + 80), int(h + (w + d) * 8 + 90), int(d * 16 + 40), h + 50)
    # parede esquerda (plano gx=0, ao longo de gy) — com janelas altas de pôr do sol
    def wall_l(U, V, LA, LB):
        col = tex_stone('mid', 10, 6, 2)(U, V, LA, LB)
        for cu in (LA * .25, LA * .62):
            win = wall_window(U, V, cu, 50, 16, 46)
            t = np.clip((V - 50) / 60, 0, 1)
            g = np.array([252, 206, 120]) * (1 - t[..., None]) + np.array([214, 110, 120]) * t[..., None]
            col[win] = g[win]
            mull = win & ((np.abs(U - cu) < .7) | (np.abs(V - 76) < .7))
            col[mull] = c('stone', 0)
            fr = wall_window(U, V, cu, 48, 20, 50) & ~win
            col[fr] = c('stone', 3)
        col[V < 8] = lit(c('stone', 1), 'mid')
        col[(V > LB - 6)] = c('stone', 0)
        return col
    def wall_r(U, V, LA, LB):
        col = tex_stone('shade', 10, 6, 2)(U, V, LA, LB)
        col[V < 8] = lit(c('stone', 1), 'shade')
        col[(V > LB - 6)] = c('stone', 0)
        return col
    face(s, s.o(0, 0), d * EY, h * UP, wall_l)
    face(s, s.o(0, 0), w * EX, h * UP, wall_r)
    # piso + tapete roxo ao longo da diagonal
    def floor(U, V, LA, LB):
        col = tex_floor_tiles('mid')(U, V, LA, LB)
        gu, gv = U / LA * w, V / LB * d
        carpet = np.abs(gu - gv) < 1.1
        cc = np.where((np.abs(gu - gv) > .85)[..., None], c('gold', 1), c('purple', 2))
        col[carpet] = lit(cc, 'mid')[carpet]
        return col
    face(s, s.o(0, 0), w * EX, d * EY, floor)
    # estrado e trono no canto do fundo
    box(s, .15, .15, 0, 2.6, 2.6, 4, tex_stone('sun', 6, 4, 3), tex_stone('shade', 6, 4, 3), tex_floor_tiles('sun'))
    box(s, .15, .15, 4, 1.9, 1.9, 4, tex_stone('sun', 6, 4, 3), tex_stone('shade', 6, 4, 3), tex_flat('purple', 2, 'sun'))
    tg = lambda sh: tex_flat('gold', 1, sh, 18)
    box(s, .35, .35, 8, 1.1, .25, 46, tg('sun'), tg('shade'), tg('sun'))            # encosto
    box(s, .35, .35, 8, .25, 1.1, 46, tg('sun'), tg('shade'), tg('sun'))
    box(s, .45, .45, 8, 1.0, 1.0, 10, tex_flat('purple', 2, 'sun'), tex_flat('purple', 1, 'shade'), tex_flat('purple', 3, 'sun'))
    box(s, .35, 1.3, 8, 1.1, .2, 16, tg('sun'), tg('shade'), tg('sun'))            # braços
    box(s, 1.3, .35, 8, .2, 1.1, 16, tg('sun'), tg('shade'), tg('sun'))
    for (a, b) in ((.3, .3),):
        P0 = s.o(a + .2, b + .2, 56)
        for k in range(3): s.a[int(P0[1]) - 6 - k:int(P0[1]) - 4, int(P0[0]) - 2 + k * 2:int(P0[0]) + k * 2 - 1, :3] = c('gold', 2)
    # pilares
    for (gx, gy) in ((.3, 3.2), (.3, 5.6), (3.2, .3), (5.6, .3)):
        cylinder(s, *(s.o(gx, gy)), 5, h - 6, 0)
        box(s, gx - .35, gy - .35, h - 10, .7, .7, 4, tex_stone('sun', 4, 2, 3), tex_stone('shade', 4, 2, 3), tex_flat('stone', 3))
    # estandartes longos nas paredes
    for (gx, gy, side) in ((0, 2.0, 'l'), (0, 4.4, 'l'), (2.0, 0, 'r'), (4.4, 0, 'r')):
        L = 0.75; z0, hh = 50, 80
        if side == 'l':
            O = s.o(.02, gy, z0); A = L * EY
        else:
            O = s.o(gx, .02, z0); A = L * EX
        def bt(U, V, LA, LB, sh=('mid' if side == 'l' else 'shade')):
            col = np.broadcast_to(c('purple', 2), U.shape + (3,)).copy()
            edge = (U < 1.5) | (U > LA - 1.5) | (V > LB - 2)
            col[edge] = c('gold', 1)
            fx = (U - LA / 2) / LA * 2; fy = (V - LB * .55) / (LB * .25)
            fea = (np.abs(fx + fy * .35) < .22) & (np.abs(fy) < 1)
            col[fea] = c('gold', 2)
            return lit(col, sh)
        face(s, O, A, hh * UP, bt, cond=lambda U, V, LA, LB: (V > 10) | (np.abs(U - LA / 2) > (10 - V) * 1.0))
    # arandelas (tochas) — posições guardadas para chama animada
    s.torches = []
    for (gx, gy, side) in ((0, 1.2, 'l'), (0, 3.6, 'l'), (0, 6.2, 'l'), (1.2, 0, 'r'), (3.6, 0, 'r'), (6.2, 0, 'r')):
        p = s.o(gx + (.05 if side == 'l' else 0), gy + (0 if side == 'l' else .05), 62)
        s.a[int(p[1]):int(p[1]) + 6, int(p[0]) - 1:int(p[0]) + 1, :3] = c('wood', 0); s.a[int(p[1]):int(p[1]) + 6, int(p[0]) - 1:int(p[0]) + 1, 3] = 255
        s.a[int(p[1]) - 1, int(p[0]) - 2:int(p[0]) + 2, :3] = c('gold', 0)
        s.torches.append((p[0] - s.ax, p[1] - 1 - s.ay))
    # borda de corte (paredes da frente baixas)
    box(s, 0, d, 0, w, .3, 10, tex_stone('sun', 6, 4, 2), tex_stone('shade', 6, 4, 2), tex_flat('stone', 3, 'sun'))
    box(s, w, 0, 0, .3, d + .3, 10, tex_stone('sun', 6, 4, 2), tex_stone('shade', 6, 4, 2), tex_flat('stone', 3, 'sun'))
    # raios de luz das janelas no piso
    s.rays = [s.o(1.2, 1.4) - (s.ax, s.ay), s.o(1.2, 4.1) - (s.ax, s.ay)]
    s.finish(outline=False)
    return s

def workshop(w=6, d=6, h=124, door_open=0.0):
    s = Spr(int((w + d) * 16 + 80), int(h + (w + d) * 8 + 90), int(d * 16 + 40), h + 50)
    def wall_l(U, V, LA, LB):
        col = tex_plaster(beams=True, shade='mid')(U, V, LA, LB)
        col[V < 30] = tex_stone('mid', 8, 5, 2)(U, V, LA, LB)[V < 30]
        win = wall_window(U, V, LA * .55, 56, 22, 30)
        t = np.clip((V - 56) / 40, 0, 1)
        g = np.array([240, 150, 100]) * (1 - t[..., None]) + np.array([90, 60, 120]) * t[..., None]
        col[win] = g[win]; col[win & ((np.abs(U - LA * .55) < .7) | (np.abs(V - 71) < .7))] = c('wood', 0)
        return col
    def wall_r(U, V, LA, LB):
        col = tex_plaster(beams=True, shade='shade')(U, V, LA, LB)
        col[V < 30] = tex_stone('shade', 8, 5, 2)(U, V, LA, LB)[V < 30]
        du = U - LA * .78
        door = (np.abs(du) < 9) & (V < 34 + np.sqrt(np.clip(81 - du ** 2, 0, None)) * .5)
        if door_open > 0:
            col[door] = np.array([250, 196, 120]) * (.6 + .4 * door_open)
            leaf = door & (du < -9 + 18 * (1 - door_open))
            col[leaf] = lit(c('wood', 1), 'shade')
        else:
            col[door] = lit(c('wood', 1), 'shade'); col[door & ((U.astype(int) % 3) == 0)] = lit(c('wood', 0), 'shade')
        return col
    face(s, s.o(0, 0), d * EY, h * UP, wall_l)
    face(s, s.o(0, 0), w * EX, h * UP, wall_r)
    face(s, s.o(0, 0), w * EX, d * EY, tex_planks('mid'))
    # prateleiras com livros e potes (parede esquerda)
    for z in (40, 62, 84):
        box(s, 0, .6, z, .45, 2.2, 2, tex_flat('wood', 2, 'sun'), tex_flat('wood', 1, 'shade'), tex_flat('wood', 3, 'sun'))
        rng = np.random.default_rng(z)
        gy = .7
        while gy < 2.6:
            bw = rng.uniform(.08, .16); hh = rng.integers(7, 12)
            colb = np.array([(140, 40, 40), (60, 70, 130), (120, 70, 30), (90, 40, 110), (50, 100, 70), (190, 160, 90)][rng.integers(0, 6)], np.float32)
            box(s, .05, gy, z + 2, .3, bw, hh, lambda U, V, a, b, cc=colb: lit(cc, 'sun'), lambda U, V, a, b, cc=colb: lit(cc * .8, 'mid'), None)
            gy += bw + .02
    # ferramentas penduradas (parede direita)
    for k, gx in enumerate((1.0, 1.6, 2.2, 2.8)):
        p = s.o(gx, .02, 70)
        line(s, p, p + np.array([0, 12 + k * 2]), c('stone', 3 - k % 2))
        s.a[int(p[1]) + 12 + k * 2:int(p[1]) + 15 + k * 2, int(p[0]) - 1:int(p[0]) + 2, :3] = c('wood', 1)
    # engrenagens decorativas na parede
    s.wallgear = s.o(3.6, .02, 92) - (s.ax, s.ay)
    # borda de corte
    box(s, 0, d, 0, w, .3, 10, tex_stone('sun', 6, 4, 2), tex_stone('shade', 6, 4, 2), tex_flat('stone', 3, 'sun'))
    box(s, w, 0, 0, .3, d + .3, 10, tex_stone('sun', 6, 4, 2), tex_stone('shade', 6, 4, 2), tex_flat('stone', 3, 'sun'))
    s.door = s.o(w * .78, 0, 0) - (s.ax, s.ay)
    s.window = s.o(0, d * .55, 70) - (s.ax, s.ay)
    s.finish(outline=False)
    return s

def bench(parts=True):
    s = Spr(110, 80, 50, 50)
    ground_shadow(s, 0, 0, 2.4, 1.2, 14, 90)
    for (lx, ly) in ((.05, .05), (2.2, .05), (2.2, 1.0), (.05, 1.0)):
        box(s, lx, ly, 0, .15, .15, 14, tex_flat('wood', 1, 'sun'), tex_flat('wood', 0, 'shade'), None)
    box(s, 0, 0, 14, 2.4, 1.2, 3, tex_flat('wood', 2, 'sun', 16), tex_flat('wood', 1, 'shade', 16), tex_planks('sun'))
    return s.finish()

def gear_poly(cx, cy, r, teeth, ang, sx=1., sy=1.):
    pts = []
    for k in range(teeth * 4):
        a = ang + k * np.pi * 2 / (teeth * 4)
        rr = r + (2 if (k % 4) in (1, 2) else 0)
        pts.append((cx + rr * np.cos(a) * sx, cy + rr * np.sin(a) * sy))
    return pts

def draw_gear(arr, cx, cy, r, teeth, ang, col, sx=1., sy=1., hole=True):
    im = Image.new('L', (arr.shape[1], arr.shape[0]), 0); d = ImageDraw.Draw(im)
    d.polygon(gear_poly(cx, cy, r, teeth, ang, sx, sy), fill=255)
    m = np.asarray(im) > 0
    im2 = Image.new('L', (arr.shape[1], arr.shape[0]), 0); d2 = ImageDraw.Draw(im2)
    d2.polygon(gear_poly(cx, cy, r - 2, teeth, ang, sx, sy), fill=255)
    inner = np.asarray(im2) > 0
    col = np.asarray(col, np.float32)
    arr[m, :3] = col * .62; arr[m, 3] = 255
    arr[inner, :3] = col
    if hole:
        yy, xx = np.ogrid[0:arr.shape[0], 0:arr.shape[1]]
        hm = ((xx - cx) / max(r * .3 * sx, 1)) ** 2 + ((yy - cy) / max(r * .3 * sy, 1)) ** 2 < 1
        arr[hm, :3] = col * .45
        for k in range(4):
            a = ang + k * np.pi / 2
            p0 = (cx + r * .35 * np.cos(a) * sx, cy + r * .35 * np.sin(a) * sy)
            hm2 = ((xx - (cx + r * .62 * np.cos(a + .78) * sx)) / max(r * .16 * sx, 1)) ** 2 + ((yy - (cy + r * .62 * np.sin(a + .78) * sy)) / max(r * .16 * sy, 1)) ** 2 < 1
            arr[hm2, :3] = col * .5

def bench_parts(t=0., crystal_on=0.):
    """peças da máquina sobre a bancada (cena 04)."""
    s = Spr(90, 50, 45, 30)
    draw_gear(s.a, 30, 26, 6, 8, t * .8, (196, 140, 70), 1, .55)
    draw_gear(s.a, 42, 30, 4, 6, -t * 1.2, (176, 120, 60), 1, .55)
    draw_gear(s.a, 56, 24, 5, 7, t, (214, 160, 80), 1, .55)
    # cristal violeta
    cx, cy = 66, 22
    pts = [(cx, cy - 7), (cx + 3, cy - 2), (cx, cy + 2), (cx - 3, cy - 2)]
    poly(s, pts, (120 + 100 * crystal_on, 70 + 60 * crystal_on, 170 + 80 * crystal_on))
    poly(s, [(cx, cy - 7), (cx + 3, cy - 2), (cx, cy - 1)], (190, 150, 230))
    # rolo e chave
    s.a[30:32, 12:22, :3] = c('stone', 3); s.a[30:32, 12:22, 3] = 255
    s.a[33, 14:24, :3] = (150, 110, 60); s.a[33, 14:24, 3] = 255
    return s.finish()

def candle(frame):
    s = Spr(12, 22, 6, 18)
    s.a[11:18, 4:8, :3] = (236, 226, 200); s.a[11:18, 4:8, 3] = 255; s.a[11:18, 7, :3] = (200, 186, 160)
    s.a[17:19, 2:10, :3] = c('gold', 0); s.a[17:19, 2:10, 3] = 255
    fl = [(6, 10), (6, 9), (5, 8), (6, 7), (6, 6)]
    off = [0, 1, 0, -1][frame % 4]
    for k, (x, y) in enumerate(fl):
        s.a[y, x + (off if k > 2 else 0), :3] = c('glow', 3 - k // 2); s.a[y, x + (off if k > 2 else 0), 3] = 255
    s.a[9:11, 5:7, :3] = c('glow', 2); s.a[9:11, 5:7, 3] = 255
    return s.finish(outline=False)

def torch_flame(frame):
    s = Spr(10, 14, 5, 12)
    rng = np.random.default_rng(frame)
    for y in range(10):
        hw = 2.5 * (1 - y / 10) + .3
        o = np.sin(frame * 1.7 + y * .7) * y / 10 * 1.5
        for x in range(int(-hw), int(hw) + 1):
            lv = 3 - abs(x - o) / max(hw, .5) * 2 - y / 10 * 1.5 + rng.random() * .5
            s.a[11 - y, 5 + x + int(o), :3] = c('glow', lv); s.a[11 - y, 5 + x + int(o), 3] = 255
    return s.finish(outline=False)

def scroll_open(progress=1.0):
    s = Spr(40, 20, 20, 12)
    w = int(10 + 18 * progress)
    for y in range(6):
        x0 = 20 - w // 2 + y * 2; x1 = x0 + w
        s.a[6 + y, x0:x1, :3] = (240, 224, 186); s.a[6 + y, x0:x1, 3] = 255
    for k in range(int(progress * 4)):
        y = 7 + k; x0 = 20 - w // 2 + (k + 1) * 2 + 2
        s.a[y, x0:x0 + w - 8 - (k % 2) * 3, :3] = (120, 90, 80)
    s.a[5:12, 20 - w // 2 - 1:20 - w // 2 + 1, :3] = (200, 170, 120); s.a[5:12, 20 - w // 2 - 1:20 - w // 2 + 1, 3] = 255
    return s.finish()

def scroll_rolled():
    s = Spr(24, 12, 12, 8)
    for x in range(6, 18):
        y = 4 + (x - 6) // 4
        s.a[y:y + 3, x, :3] = (236, 220, 180) if x % 4 else (206, 186, 146); s.a[y:y + 3, x, 3] = 255
    s.a[5:8, 11:13, :3] = (180, 40, 50); s.a[5:8, 11:13, 3] = 255
    return s.finish()

def bottle(with_scroll=True, tilt=0):
    s = Spr(16, 26, 8, 22)
    for y in range(8, 21):
        hw = 3 if y > 10 else 1
        for x in range(8 - hw, 8 + hw + 1):
            s.a[y, x, :3] = (120, 190, 180); s.a[y, x, 3] = 200
    s.a[6:8, 7:10, :3] = (150, 110, 70); s.a[6:8, 7:10, 3] = 255
    s.a[9:19, 6, :3] = (210, 250, 240)
    if with_scroll:
        s.a[11:19, 8:10, :3] = (236, 220, 180); s.a[14, 8:10, :3] = (180, 40, 50)
    return s.finish()

def balloon(frame=0, string=26, with_bottle=True):
    s = Spr(40, 46 + string, 20, 44 + string)
    yy, xx = np.mgrid[0:s.a.shape[0], 0:s.a.shape[1]]
    cx, cy = 20, 16
    d = ((xx - cx) / 12.) ** 2 + ((yy - cy) / 14.) ** 2
    m = (d < 1) | ((yy > cy) & (yy < cy + 18) & (np.abs(xx - cx) < (12 * (1 - (yy - cy) / 18.)) + 1))
    lv = 2.2 + (xx - cx) / 12 * .9 - (yy - cy) / 14 * .9 + (BAYER[yy % 4, xx % 4] - .5) * .7
    col = np.array(P['purple'], np.float32)[np.clip(lv.astype(int), 0, 3)]
    s.a[m, :3] = col[m]; s.a[m, 3] = 255
    # pena dourada no balão
    for k, (dx, dy) in enumerate([(3, -6), (2, -5), (2, -4), (1, -3), (1, -2), (0, -1), (0, 0), (-1, 1), (-1, 2), (-2, 3), (-3, 4)]):
        s.a[cy + dy, cx + dx, :3] = c('gold', 2); s.a[cy + dy, cx + dx + 1, :3] = c('gold', 1)
    for a in np.linspace(0, 6.28, 26):
        x, y = int(cx + 7 * np.cos(a)), int(cy + 8 * np.sin(a))
        s.a[y, x, :3] = c('gold', 1)
    s.a[cy + 18:cy + 20, cx - 1:cx + 2, :3] = c('gold', 0); s.a[cy + 18:cy + 20, cx - 1:cx + 2, 3] = 255
    sw = [0, 1, 0, -1][frame % 4]
    for k in range(string):
        x = cx + int(round(sw * k / string * 2)); y = cy + 20 + k
        s.a[y, x, :3] = (230, 220, 200); s.a[y, x, 3] = 255
    bx, by = cx + sw * 2, cy + 20 + string
    if with_bottle:
        b = bottle(True)
        h, w = b.a.shape[:2]
        x0, y0 = bx - b.ax, by - 2
        reg = s.a[y0:y0 + h, x0:x0 + w]
        hh, ww = reg.shape[:2]
        mm = b.a[:hh, :ww, 3] > 0
        reg[mm] = b.a[:hh, :ww][mm]
    return s.finish()

def cart(books=0):
    s = Spr(90, 70, 40, 46)
    ground_shadow(s, 0, 0, 2.0, 1.1, 14, 90)
    box(s, 0, 0, 6, 2.0, 1.1, 9, tex_planks('sun'), tex_planks('shade'), tex_planks('mid'))
    # rodas
    for gx in (.4, 1.6):
        p = s.o(gx, 1.15, 5)
        for a in np.linspace(0, 6.28, 30):
            x, y = int(p[0] + 5 * np.cos(a) * .9), int(p[1] + 5 * np.sin(a))
            s.a[y, x, :3] = c('wood', 0); s.a[y, x, 3] = 255
        s.a[int(p[1]) - 1:int(p[1]) + 1, int(p[0]) - 1:int(p[0]) + 1, :3] = c('stone', 2); s.a[int(p[1]) - 1:int(p[1]) + 1, int(p[0]) - 1:int(p[0]) + 1, 3] = 255
    line(s, s.o(2.0, .55, 9), s.o(2.9, .55, 4), c('wood', 1))
    rng = np.random.default_rng(3)
    bcols = [(140, 40, 40), (60, 70, 130), (120, 70, 30), (90, 40, 110), (50, 100, 70), (220, 200, 160)]
    for k in range(books):
        gx = .15 + (k % 5) * .33; gy = .15 + (k // 5 % 2) * .4; z = 15 + (k // 10) * 3
        bc = np.array(bcols[k % 6], np.float32)
        box(s, gx, gy, z, .3, .35, 3, lambda U, V, a, b, cc=bc: lit(cc, 'sun'), lambda U, V, a, b: lit(np.array([230, 216, 180.]), 'shade'),
            lambda U, V, a, b, cc=bc: lit(cc, 'sun'))
    return s.finish()

# ---------------- máquina Scriptter 3D ----------------
class Cam3:
    def __init__(self, yaw, el=np.radians(30), scale=1., cx=0, cy=0):
        self.yaw, self.el, self.k, self.cx, self.cy = yaw, el, scale, cx, cy
        cy_, sy_ = np.cos(yaw), np.sin(yaw)
        self.R = np.array([[cy_, -sy_, 0], [sy_, cy_, 0], [0, 0, 1]])
    def rot(self, p): return self.R @ np.asarray(p, float)
    def proj(self, p):
        q = self.rot(p)
        return np.array([self.cx + q[0] * self.k, self.cy - (q[2] * np.cos(self.el) + q[1] * np.sin(self.el)) * self.k])
    def depth(self, p):
        q = self.rot(p); return q[1] * np.cos(self.el) - q[2] * np.sin(self.el)
    def facing(self, n):
        q = self.R @ np.asarray(n, float)
        return q[1] * -np.cos(self.el) + q[2] * np.sin(self.el)
    def light(self, n):
        q = self.R @ np.asarray(n, float)
        L = np.array([.55, -.45, .7]); L /= np.linalg.norm(L)
        return float(q @ L)

MAT = dict(metal=[(40, 20, 54), (68, 34, 90), (100, 54, 128), (136, 84, 166), (176, 128, 200)],
           gold=[(110, 70, 20), (160, 110, 34), (214, 160, 56), (246, 204, 96), (255, 238, 170)],
           bronze=[(80, 46, 26), (120, 74, 38), (162, 108, 56), (200, 146, 80), (232, 186, 120)],
           floor=[(40, 26, 22), (64, 42, 30), (92, 62, 40), (122, 84, 52), (150, 108, 66)],
           paper=[(170, 150, 120), (206, 188, 150), (236, 222, 186), (248, 238, 210), (255, 250, 232)])

def shade_tex(mat, inten, pattern=None):
    def f(U, V, LA, LB):
        lv = np.clip(inten * 4.2 + (BAYER[(V.astype(int)) % 4, (U.astype(int)) % 4] - .5) * .9, 0, 4)
        col = np.array(MAT[mat], np.float32)[lv.astype(int)]
        if pattern is not None: col = pattern(U, V, LA, LB, col)
        return np.clip(col, 0, 255)
    return f

def quad3(s, cam, O, A, B, mat, pattern=None, two_sided=False, emissive=None):
    O, A, B = map(lambda v: np.asarray(v, float), (O, A, B))
    n = np.cross(A, B); nn = np.linalg.norm(n)
    if nn == 0: return
    n /= nn
    f = cam.facing(n)
    if f <= 0 and not two_sided: return
    if f <= 0: n = -n
    inten = .38 + .62 * max(cam.light(n), 0) if emissive is None else emissive
    o2 = cam.proj(O); a2 = cam.proj(O + A) - o2; b2 = cam.proj(O + B) - o2
    if abs(a2[0] * b2[1] - a2[1] * b2[0]) < 1e-3: return
    face(s, o2, a2, b2, shade_tex(mat, inten, pattern))

def box3(items, cam, x0, y0, z0, sx, sy, sz, mat, pats=None):
    """adiciona as 6 faces de uma caixa à lista de desenho (ordenada por profundidade depois)."""
    P0 = np.array([x0, y0, z0], float)
    X, Y, Z = np.array([sx, 0, 0.]), np.array([0, sy, 0.]), np.array([0, 0, sz])
    faces = [(P0, Z, Y), (P0 + X, Y, Z), (P0, X, Z), (P0 + Y, Z, X), (P0, Y, X), (P0 + Z, X, Y)]
    names = ['-x', '+x', '-y', '+y', '-z', '+z']
    for (O, A, B), nm in zip(faces, names):
        ctr = O + A / 2 + B / 2
        items.append((cam.depth(ctr), 'quad', (O, A, B, mat, (pats or {}).get(nm))))

def machine_frame(t, yaw, W=270, H=480, scale=1.55, crystal=1.0, print_len=0.0, gear_speed=1.0, cy=300):
    """Renderiza a Scriptter. Unidades: px do modelo. Base 80x56x46."""
    cam = Cam3(yaw, scale=scale, cx=W / 2, cy=cy)
    s = Spr(W, H, 0, 0)
    items = []
    # piso de tábuas (gira junto com a câmera)
    plank = lambda U, V, LA, LB, col: np.where(((V % 10) < 1)[..., None], col * .6, col)
    fl = Spr(W, H, 0, 0)
    quad3(fl, cam, np.array([-170, -170, 0.]), np.array([340, 0, 0.]), np.array([0, 340, 0.]), 'floor', plank)
    # sombra da máquina no piso
    quad3(fl, cam, np.array([-52, -34, .1]), np.array([104, 0, 0.]), np.array([0, 76, 0.]), 'floor', lambda U, V, LA, LB, col: col * .55)
    # pés
    for (fx, fy) in ((-36, -24), (30, -24), (-36, 18), (30, 18)):
        box3(items, cam, fx, fy, 0, 6, 6, 6, 'bronze')
    trim = lambda U, V, LA, LB, col: np.where(((V < 2.5) | (V > LB - 2.5) | (U < 2.5) | (U > LA - 2.5))[..., None], np.array(MAT['gold'][3], np.float32) * (col.mean(-1, keepdims=True) / 120 + .3), col)
    box3(items, cam, -40, -28, 6, 80, 56, 40, 'metal', {k: trim for k in ('-x', '+x', '-y', '+y', '+z')})
    box3(items, cam, -26, -14, 46, 52, 32, 18, 'metal', {k: trim for k in ('-x', '+x', '-y', '+y', '+z')})
    # rolos na frente (-y)
    for (zr, ph) in ((34, 0), (25, 1)):
        n = 10
        for k in range(n):
            a0 = k / n * 2 * np.pi + t * 4 * gear_speed * (1 if ph == 0 else -1); a1 = (k + 1) / n * 2 * np.pi + t * 4 * gear_speed * (1 if ph == 0 else -1)
            p0 = np.array([-34, -32 + 5 * np.cos(a0), zr + 5 * np.sin(a0)]); p1 = np.array([-34, -32 + 5 * np.cos(a1), zr + 5 * np.sin(a1)])
            stripe = (lambda U, V, LA, LB, col, k=k: col * (.82 if k % 2 else 1.0))
            items.append((cam.depth((p0 + p1) / 2 + np.array([34, 0, 0])), 'quad', (p0, p1 - p0, np.array([68, 0, 0.]), 'bronze', stripe)))
    # papel impresso saindo entre os rolos
    if print_len > 0:
        L = print_len
        seg = 10
        prev = np.array([-28, -36, 30.])
        lines = lambda U, V, LA, LB, col, off=0: np.where((((V + off) % 5) < 1.2)[..., None] & ((U > 5) & (U < LA - 5) & (((U * 7 + (V + off) // 5 * 13) % 46) < 38))[..., None], col * .45, col)
        acc = 0.
        while acc < L:
            l = min(seg, L - acc)
            ang = np.radians(min(acc / 60 * 70, 80))
            d = np.array([0, -np.cos(ang), -np.sin(ang)]) * l
            items.append((cam.depth(prev + d / 2 + np.array([28, 0, 0])) - .5, 'quad2', (prev, np.array([56, 0, 0.]), d, 'paper', (lambda U, V, LA, LB, col, o=acc: lines(U, V, LA, LB, col, o)))))
            prev = prev + d; acc += l
    s._items = items
    items.sort(key=lambda it: -it[0])
    for dep, kind, data in items:
        O, A, B, mat, pat = data
        quad3(s, cam, O, A, B, mat, pat, two_sided=(kind == 'quad2'))
    # engrenagens nas laterais (+x e -x) e na frente
    def gear3(center, axis_u, axis_v, normal, r, teeth, ang, mat='gold'):
        f = cam.facing(normal)
        if f <= 0: return
        inten = .4 + .6 * max(cam.light(normal), 0)
        pts = []
        for k in range(teeth * 4):
            a = ang + k * np.pi * 2 / (teeth * 4)
            rr = r + (3 if (k % 4) in (1, 2) else 0)
            pts.append(cam.proj(center + rr * np.cos(a) * axis_u + rr * np.sin(a) * axis_v))
        col = np.array(MAT[mat][int(np.clip(inten * 4.2, 0, 4))], np.float32)
        im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
        m = np.asarray(im) > 0
        s.a[m, :3] = col * .7; s.a[m, 3] = 255
        pts2 = [cam.proj(center + (r - 2.5) * np.cos(a) * axis_u + (r - 2.5) * np.sin(a) * axis_v) for a in np.linspace(0, 6.283, 28)]
        im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in pts2], fill=255)
        m2 = np.asarray(im) > 0; s.a[m2, :3] = col
        for k in range(5):
            a = ang + k * 2 * np.pi / 5
            hp = [cam.proj(center + r * .55 * np.cos(a) * axis_u + r * .55 * np.sin(a) * axis_v + rr2 * np.cos(b) * axis_u + rr2 * np.sin(b) * axis_v)
                  for rr2 in (r * .18,) for b in np.linspace(0, 6.283, 10)]
            im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in hp], fill=255)
            s.a[np.asarray(im) > 0, :3] = col * .45
        cp = [cam.proj(center + r * .22 * np.cos(b) * axis_u + r * .22 * np.sin(b) * axis_v) for b in np.linspace(0, 6.283, 12)]
        im = Image.new('L', (W, H), 0); ImageDraw.Draw(im).polygon([tuple(p) for p in cp], fill=255)
        s.a[np.asarray(im) > 0, :3] = np.array(MAT['bronze'][1], np.float32)
    ex, ey, ez = np.array([1, 0, 0.]), np.array([0, 1, 0.]), np.array([0, 0, 1.])
    gs = t * gear_speed
    gear3(np.array([40.5, -6, 28]), ey, ez, ex, 13, 10, gs * 1.2, 'gold')
    gear3(np.array([40.5, 14, 16]), ey, ez, ex, 8, 7, -gs * 1.9 + .2, 'bronze')
    gear3(np.array([40.5, 12, 38]), ey, ez, ex, 6, 6, -gs * 2.4, 'bronze')
    gear3(np.array([-40.5, 4, 28]), ey, ez, -ex, 13, 10, -gs * 1.2, 'gold')
    gear3(np.array([-40.5, -16, 16]), ey, ez, -ex, 8, 7, gs * 1.9, 'bronze')
    gear3(np.array([10, 28.5, 30]), ex, ez, ey, 11, 9, gs, 'bronze')
    gear3(np.array([-26, -28.5, 16]), ex, ez, -ey, 6, 6, gs * 2.2, 'bronze')
    gear3(np.array([28, -28.5, 16]), ex, ez, -ey, 6, 6, -gs * 2.2, 'bronze')
    # selo da pena dourada na frente
    if cam.facing(-ey) > 0:
        ctr = np.array([0, -28.6, 14.])
        disc = [cam.proj(ctr + 8 * np.cos(b) * ex + 8 * np.sin(b) * ez) for b in np.linspace(0, 6.283, 24)]
        poly(s, disc, np.array(MAT['gold'][3]))
        disc2 = [cam.proj(ctr + 6.5 * np.cos(b) * ex + 6.5 * np.sin(b) * ez) for b in np.linspace(0, 6.283, 24)]
        poly(s, disc2, np.array(MAT['gold'][2]))
        fea = [(-1, -5), (3, 5), (1.5, 6), (-2.5, -3), (-3.5, -6)]
        poly(s, [cam.proj(ctr + a * ex + b * ez) for (a, b) in fea], np.array(MAT['metal'][1]))
        line(s, cam.proj(ctr + -3.5 * ex - 6 * ez), cam.proj(ctr + 2.5 * ex + 5.5 * ez), np.array(MAT['gold'][4]))
    # cristal violeta (octaedro, emissivo)
    cc = np.array([0, 0, 76.]); hgt = 16; rad = 8
    tops = [cc + np.array([0, 0, hgt])]; bot = cc - np.array([0, 0, hgt * .7])
    ring = [cc + rad * np.array([np.cos(a), np.sin(a), 0]) for a in np.linspace(0, 2 * np.pi, 7)[:-1] + t * .3]
    tris = []
    for i in range(6):
        a, b = ring[i], ring[(i + 1) % 6]
        for apex in (tops[0], bot):
            n = np.cross(b - a, apex - a)
            if apex is bot: n = -n
            tris.append((cam.depth((a + b + apex) / 3), a, b, apex, n))
    tris.sort(key=lambda q: -q[0])
    glow = .25 + .75 * crystal
    vio = [(46, 20, 70), (90, 40, 140), (150, 80, 210), (200, 140, 250), (246, 220, 255)]
    for dep, a, b, apex, n in tris:
        if cam.facing(n) <= 0: continue
        li = .3 + .7 * max(cam.light(n / np.linalg.norm(n)), 0)
        lv = int(np.clip((li * .55 + glow * .6) * 4.2, 0, 4))
        poly(s, [cam.proj(a), cam.proj(b), cam.proj(apex)], np.array(vio[lv], np.float32))
    # base do cristal
    box_items = []
    box3(box_items, cam, -8, -8, 64, 16, 16, 4, 'gold')
    box_items.sort(key=lambda it: -it[0])
    # (desenhada antes do cristal visualmente seria ideal; é pequena e fica abaixo)
    # chaminé de vapor
    s.crystal = cam.proj(cc); s.steam = cam.proj(np.array([18, 8, 80.])); s.paper_tip = None
    vent = []
    box3(vent, cam, 14, 4, 64, 8, 8, 14, 'bronze'); vent.sort(key=lambda it: -it[0])
    for dep, kind, data in vent:
        O, A, B, mat, pat = data; quad3(s, cam, O, A, B, mat, pat)
    for dep, kind, data in box_items:
        O, A, B, mat, pat = data; quad3(s, cam, O, A, B, mat, pat)
    # redesenha o cristal por cima da base
    for dep, a, b, apex, n in tris:
        if cam.facing(n) <= 0: continue
        li = .3 + .7 * max(cam.light(n / np.linalg.norm(n)), 0)
        lv = int(np.clip((li * .55 + glow * .6) * 4.2, 0, 4))
        poly(s, [cam.proj(a), cam.proj(b), cam.proj(apex)], np.array(vio[lv], np.float32))
    # contorno + composição sobre o piso
    al = s.a[..., 3] > 0
    ring = np.zeros_like(al)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): ring |= np.roll(np.roll(al, dy, 0), dx, 1)
    ring &= ~al
    s.a[ring, :3] = (22, 12, 28); s.a[ring, 3] = 255
    m = s.a[..., 3] > 0
    fl.a[m] = s.a[m]
    fl.crystal, fl.steam = s.crystal, s.steam
    fl.a = np.clip(fl.a, 0, 255)
    return fl
