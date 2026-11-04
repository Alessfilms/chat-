"""Motor isométrico em pixel art — tudo desenhado do zero (sem imagens externas).
Grade: tile 32x16 px. EX = (16,8) por tile em gx, EY = (-16,8) por tile em gy, altura sobe em -y.
Luz de pôr do sol vindo do alto-direita: faces voltadas para +gx (direita) iluminadas, +gy (esquerda) em sombra violeta.
"""
import numpy as np
from PIL import Image, ImageDraw

EX = np.array([16., 8.]); EY = np.array([-16., 8.]); UP = np.array([0., -1.])
OUT = np.array([24, 14, 28], np.uint8)
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + .5) / 16

# ---------------- paleta ----------------
P = dict(
    grass=[(46, 52, 28), (78, 88, 34), (118, 120, 42), (160, 150, 52), (204, 184, 78)],
    dirt=[(96, 66, 46), (126, 90, 58), (156, 116, 72), (186, 146, 92)],
    stone=[(70, 62, 76), (102, 92, 102), (136, 124, 128), (170, 158, 152), (206, 192, 172)],
    water=[(20, 56, 84), (28, 88, 118), (40, 126, 150), (78, 178, 190), (196, 240, 236)],
    wood=[(58, 36, 26), (90, 56, 34), (124, 80, 46), (160, 108, 60)],
    slate=[(44, 38, 60), (66, 58, 84), (92, 82, 108), (124, 112, 134)],
    thatch=[(96, 60, 32), (136, 88, 44), (176, 122, 58), (210, 160, 80)],
    plaster=[(150, 120, 104), (196, 166, 132), (226, 200, 160), (244, 222, 182)],
    glow=[(200, 110, 40), (252, 176, 64), (255, 220, 120), (255, 246, 196)],
    purple=[(52, 22, 66), (88, 38, 110), (124, 60, 148), (162, 96, 182)],
    gold=[(150, 96, 30), (214, 160, 56), (250, 210, 100)],
    leaf=[(24, 30, 22), (40, 52, 28), (66, 80, 32), (104, 112, 38), (152, 148, 50), (206, 186, 76)],
    leafp=[(40, 20, 50), (72, 36, 92), (114, 64, 140), (160, 104, 182), (206, 156, 214)],
    pine=[(16, 30, 26), (26, 48, 36), (40, 70, 44), (70, 100, 52), (120, 136, 62)],
    skin=[(150, 96, 70), (206, 150, 108), (232, 186, 140)],
)

def c(name, i): return np.array(P[name][int(np.clip(i, 0, len(P[name]) - 1))], np.float32)

def lit(rgb, k):
    """k: 'sun' (face para o sol), 'mid', 'shade' (sombra violeta)."""
    rgb = np.asarray(rgb, np.float32)
    if k == 'sun': return np.clip(rgb * np.array([1.10, 1.02, .86]) + np.array([10, 4, 0]), 0, 255)
    if k == 'shade': return rgb * np.array([.60, .54, .72])
    return rgb * np.array([.86, .82, .86])

def hsh(*a):
    h = np.zeros(np.broadcast(*a).shape, np.uint64)
    for i, v in enumerate(a):
        h ^= (np.asarray(v).astype(np.int64).astype(np.uint64) + np.uint64(0x9E3779B9 + i * 7919)) * np.uint64(2654435761)
        h = (h ^ (h >> np.uint64(13))) * np.uint64(1274126177)
    return ((h >> np.uint64(8)) & np.uint64(0xFFFF)).astype(np.float32) / 65535.

# ---------------- sprite ----------------
class Spr:
    def __init__(self, w, h, ax, ay):
        self.a = np.zeros((h, w, 4), np.float32); self.ax, self.ay = ax, ay
    def o(self, gx=0, gy=0, z=0):  # ponto (relativo à âncora, em tiles/px) → pixel do canvas
        return np.array([self.ax, self.ay]) + gx * EX + gy * EY + z * UP
    def put(self, m, rgb, alpha=255):
        self.a[m, :3] = rgb if np.ndim(rgb) == 1 else rgb[m] if rgb.shape[:2] == m.shape else rgb
        self.a[m, 3] = alpha
    def finish(self, outline=True):
        if outline:
            al = self.a[..., 3] > 200
            ring = np.zeros_like(al)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ring |= np.roll(np.roll(al, dy, 0), dx, 1)
            ring &= ~al & (self.a[..., 3] < 200)
            self.a[ring, :3] = OUT; self.a[ring, 3] = 255
        ys, xs = np.nonzero(self.a[..., 3] > 0)
        if len(ys) == 0: return self
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        self.a = self.a[y0:y1, x0:x1].copy(); self.ax -= x0; self.ay -= y0
        self.a = np.clip(self.a, 0, 255).astype(np.uint8)
        return self

def face(s, O, A, B, tex, cond=None, alpha=255):
    """Preenche o paralelogramo O + u*A + v*B (u,v ∈ [0,1)). tex(U,V) recebe coordenadas em px ao longo de A e B."""
    O, A, B = map(np.asarray, (O, A, B))
    pts = np.array([O, O + A, O + B, O + A + B])
    x0, y0 = np.floor(pts.min(0)).astype(int) - 1; x1, y1 = np.ceil(pts.max(0)).astype(int) + 1
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, s.a.shape[1]), min(y1, s.a.shape[0])
    if x1 <= x0 or y1 <= y0: return
    yy, xx = np.mgrid[y0:y1, x0:x1] + .5
    M = np.array([[A[0], B[0]], [A[1], B[1]]]); Mi = np.linalg.inv(M)
    px, py = xx - O[0], yy - O[1]
    u = Mi[0, 0] * px + Mi[0, 1] * py; v = Mi[1, 0] * px + Mi[1, 1] * py
    m = (u >= 0) & (u < 1) & (v >= 0) & (v < 1)
    LA, LB = np.hypot(*A), np.hypot(*B)
    U, V = u * LA, v * LB
    if cond is not None: m &= cond(U, V, LA, LB)
    if not m.any(): return
    col = tex(U, V, LA, LB)
    if np.ndim(col) == 1: col = np.broadcast_to(col, U.shape + (3,))
    reg = s.a[y0:y1, x0:x1]
    reg[m, :3] = col[m]; reg[m, 3] = alpha

def line(s, p, q, rgb, alpha=255):
    p, q = np.asarray(p, float), np.asarray(q, float)
    n = int(max(abs(q - p).max(), 1)) + 1
    for t in np.linspace(0, 1, n):
        x, y = (p + (q - p) * t).astype(int)
        if 0 <= y < s.a.shape[0] and 0 <= x < s.a.shape[1]:
            s.a[y, x, :3] = rgb; s.a[y, x, 3] = alpha

def poly(s, pts, rgb, alpha=255):
    im = Image.new('L', (s.a.shape[1], s.a.shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    m = np.asarray(im) > 0
    s.a[m, :3] = rgb; s.a[m, 3] = alpha

def ground_shadow(s, gx, gy, w, d, h, strength=110):
    """Sombra projetada para a esquerda-baixo (sol no alto-direita)."""
    sh = np.array([-.55, .45]) * h
    P0 = s.o(gx, gy); P1 = s.o(gx + w, gy); P2 = s.o(gx + w, gy + d); P3 = s.o(gx, gy + d)
    pts = [P0, P1, P2 + sh * 0 + np.array([0, 0]), P2 + sh, P3 + sh, P0 + sh]
    im = Image.new('L', (s.a.shape[1], s.a.shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in [P0, P1, P2, P2 + sh, P3 + sh, P0 + sh]], fill=255)
    m = (np.asarray(im) > 0) & (s.a[..., 3] == 0)
    s.a[m, :3] = (30, 16, 40); s.a[m, 3] = strength

# ---------------- texturas ----------------
def tex_plaster(beams=True, windows=(), door=None, shade='mid', base='plaster'):
    def f(U, V, LA, LB):
        n = hsh(U.astype(int) // 3, V.astype(int) // 2)
        col = c(base, 2) + (n[..., None] - .5) * 14
        col = np.broadcast_to(col, U.shape + (3,)).copy()
        col[V < 2.5] = c('stone', 2)                         # soco de pedra
        if beams:
            wb = ((U % 13) < 2) | (V > LB - 2.2) | (np.abs(V - LB * .55) < 1) | (U < 1.5) | (U > LA - 1.5)
            diag = (np.abs((U % 13) - (V - 2.5) * .9) < 1) & (V < LB * .55) & (V > 2.5)
            col[wb | diag] = c('wood', 1)
        for (wu, wv, ww, wh) in windows:
            fr = (U >= wu - 1) & (U < wu + ww + 1) & (V >= wv - 1) & (V < wv + wh + 1)
            gl = (U >= wu) & (U < wu + ww) & (V >= wv) & (V < wv + wh)
            col[fr] = c('wood', 0)
            g = c('glow', 2) * (1 - (V[gl] - wv)[:, None] / (wh * 2.5))
            col[gl] = g
            col[gl & (np.abs(U - (wu + ww / 2)) < .6)] = c('wood', 0)
        if door is not None:
            du, dw, dh = door
            dm = (U >= du) & (U < du + dw) & (V < dh + 2 - ((U - du - dw / 2) / (dw / 2)) ** 2 * 2)
            col[dm] = c('wood', 1); col[dm & ((U - du).astype(int) % 2 == 0)] = c('wood', 0)
            col[dm & (np.abs(U - du - dw * .75) < .6) & (np.abs(V - dh * .45) < .6)] = c('gold', 2)
        return lit(col, shade)
    return f

def tex_stone(shade='mid', bw=6, bh=4, base=2, windows=()):
    def f(U, V, LA, LB):
        row = (V // bh).astype(int); off = (row % 2) * bw / 2
        col_i = ((U + off) // bw).astype(int)
        n = hsh(row, col_i)
        col = c('stone', base) + (n[..., None] - .5) * 26
        col = np.broadcast_to(col, U.shape + (3,)).copy()
        mort = ((V % bh) < 1) | (((U + off) % bw) < 1)
        col[mort] = c('stone', base - 1)
        moss = (hsh(col_i, row, 3) > .86) & (V < LB * .4)
        col[moss] = c('leaf', 3)
        for (wu, wv, ww, wh) in windows:
            gl = (U >= wu) & (U < wu + ww) & (V >= wv) & (V < wv + wh)
            col[gl] = c('glow', 1); col[gl & (V > wv + wh - 2)] = c('wood', 0)
        return lit(col, shade)
    return f

def tex_roof(kind='slate', shade='mid', rows=3):
    def f(U, V, LA, LB):
        r = (V // rows).astype(int); off = (r % 2) * 2.5
        k = ((U + off) // 5).astype(int); n = hsh(r, k, 9)
        col = c(kind, 2) + (n[..., None] - .5) * 18
        col = np.broadcast_to(col, U.shape + (3,)).copy()
        col[(V % rows) < 1] = c(kind, 0)
        col[(((U + off) % 5) < .8) & ((V % rows) >= 1)] = c(kind, 1)
        col[V < 1.2] = c(kind, 0)                          # beiral
        return lit(col, shade)
    return f

def tex_flat(name, i, shade='mid', noise=10):
    def f(U, V, LA, LB):
        n = hsh(U.astype(int), V.astype(int), 5)
        return lit(c(name, i) + (n[..., None] - .5) * noise, shade)
    return f

# ---------------- construções ----------------
def box(s, gx, gy, z, w, d, h, tex_r, tex_l, tex_top, cond_r=None, cond_l=None):
    P1 = s.o(gx + w, gy, z); P3 = s.o(gx, gy + d, z)
    face(s, P1, d * EY, h * UP, tex_r, cond_r)          # face direita (+gx) iluminada
    face(s, P3, w * EX, h * UP, tex_l, cond_l)          # face esquerda (+gy) sombra
    if tex_top is not None:
        face(s, s.o(gx, gy, z + h), w * EX, d * EY, tex_top)
    P2 = s.o(gx + w, gy + d, z)
    line(s, P2, P2 + h * UP, lit(c('stone', 0), 'shade'))

def gable_roof(s, gx, gy, z, w, d, rh, kind='slate', ov=.18, chimney=None):
    """Telhado de duas águas com cumeeira ao longo de gx; empena visível na face direita."""
    R0 = s.o(gx - ov, gy + d / 2, z + rh)
    # água de trás (voltada ao sol)
    E0 = s.o(gx - ov, gy - ov * 1.5, z)
    face(s, E0, (w + 2 * ov) * EX, R0 - E0, tex_roof(kind, 'sun'))
    # empena (face direita)
    G0 = s.o(gx + w, gy, z)
    face(s, G0, d * EY, rh * UP + d / 2 * EY * 0, tex_plaster(beams=False, shade='sun', base='plaster'),
         cond=lambda U, V, LA, LB: V <= LB * (1 - np.abs(2 * U / LA - 1)) + .5)
    if chimney is not None:
        cu, cd, ch = chimney
        box(s, gx + cu, gy + cd, z, .55, .55, rh + ch, tex_stone('sun', 3, 2), tex_stone('shade', 3, 2), tex_flat('stone', 0))
    # água da frente
    F0 = s.o(gx - ov, gy + d + ov * 1.5, z)
    face(s, F0, (w + 2 * ov) * EX, R0 - F0, tex_roof(kind, 'mid'))
    line(s, R0, R0 + (w + 2 * ov) * EX, c(kind, 3))

def house(seed, w=3, d=2, h=16, rh=14, roof='slate', stone=False, chimney=True, extra=None):
    rng = np.random.default_rng(seed)
    s = Spr(int((w + d) * 16 + 60), int(h + rh + (w + d) * 8 + 70), int(d * 16 + 30), int(rh + h + 34))
    ground_shadow(s, 0, 0, w, d, h + rh * .6)
    lw = w * np.hypot(*EX); dw = d * np.hypot(*EY)
    wins_l = [(lw * f - 2, h * .45, 3, 4) for f in (.2, .78)]
    wins_r = [(dw * .5 - 2, h * .45, 3, 4)]
    tr = tex_stone('sun', windows=wins_r) if stone else tex_plaster(windows=wins_r, shade='sun')
    tl = tex_stone('shade', windows=wins_l) if stone else tex_plaster(windows=wins_l, door=(lw * .45, 5, 10), shade='shade')
    box(s, 0, 0, 0, w, d, h, tr, tl, None)
    if stone:  # porta na pedra
        face(s, s.o(w * .45, d, 0), .35 * EX, 10 * UP, tex_flat('wood', 1, 'shade'))
    ch = (w * .7, d * .15, 6) if chimney else None
    gable_roof(s, 0, 0, h, w, d, rh, roof, chimney=ch)
    smoke = s.o(w * .7 + .27, d * .15 + .27, h + rh + 6) if chimney else None
    s.finish()
    s.smoke = None if smoke is None else (smoke[0] - s.ax, smoke[1] - s.ay)
    return s

def cylinder(s, cx, cy, r, h, roof_h=0, roof='slate', bricks=True, windows=(), flag=False):
    H, W = s.a.shape[:2]
    for dx in range(-r, r + 1):
        x = int(cx + dx)
        if not 0 <= x < W: continue
        ey = np.sqrt(max(r * r - dx * dx, 0)) / 2
        yb = cy + ey; yt = cy - h + ey
        ys = np.arange(int(np.floor(yt)), int(np.ceil(yb)))
        ys = ys[(ys >= 0) & (ys < H)]
        if len(ys) == 0: continue
        v = yb - ys
        ang = np.arcsin(np.clip(dx / r, -1, 1))
        u = ang * r
        row = (v // 4).astype(int); off = (row % 2) * 3
        n = hsh(row, ((u + off + 20) // 6).astype(int), 11)
        col = c('stone', 2) + (n[:, None] - .5) * 24
        if bricks:
            mort = ((v % 4) < 1) | (((u + off + 20) % 6) < 1)
            col[mort] = c('stone', 1)
        for (wu, wv, ww, wh) in windows:
            m = (u >= wu) & (u < wu + ww) & (v >= wv) & (v < wv + wh)
            col[m] = c('glow', 1)
        k = dx / r
        shade = 1.12 - .55 * (1 - k) / 2 - .25 * (k ** 4)
        col = col * shade
        col = col * np.array([1.0, .95 + .05 * k, .88 + .1 * (1 - k)])
        s.a[ys, x, :3] = np.clip(col, 0, 255); s.a[ys, x, 3] = 255
    if roof_h:
        R = r + 2
        for dx in range(-R, R + 1):
            x = int(cx + dx)
            if not 0 <= x < W: continue
            ey = np.sqrt(max(R * R - dx * dx, 0)) / 2
            yb = cy - h + ey + 1
            yt = cy - h - roof_h + roof_h * abs(dx) / R
            ys = np.arange(int(np.floor(yt)), int(np.ceil(yb)))
            ys = ys[(ys >= 0) & (ys < H)]
            if len(ys) == 0: continue
            v = yb - ys
            n = hsh((v // 3).astype(int), dx // 3 + 40, 13)
            col = c(roof, 2) + (n[:, None] - .5) * 16
            col[(v % 3) < 1] = c(roof, 0)
            k = dx / R
            col = col * (1.15 - .5 * (1 - k) / 2)
            s.a[ys, x, :3] = np.clip(col, 0, 255); s.a[ys, x, 3] = 255
        if flag:
            top = (int(cx), int(cy - h - roof_h))
            line(s, top, (top[0], top[1] - 9), c('wood', 0))
            for k in range(6):
                for j in range(3 - k // 3):
                    y = top[1] - 9 + j + (k // 2) % 2 * 0
                    x = top[0] + 1 + k
                    if 0 <= y < H and 0 <= x < W: s.a[y, x, :3] = c('purple', 3 - (j == 2)); s.a[y, x, 3] = 255

# ---------------- árvores ----------------
def tree(seed, r=11, kind='oak', trunk=True):
    rng = np.random.default_rng(seed)
    s = Spr(r * 4 + 20, r * 4 + 30, r * 2 + 10, r * 3 + 22)
    ax, ay = s.ax, s.ay
    # sombra no chão (esquerda-baixo)
    yy, xx = np.mgrid[0:s.a.shape[0], 0:s.a.shape[1]]
    sm = (((xx - ax + r * .6) / (r * 1.25)) ** 2 + ((yy - ay - 1) / (r * .5)) ** 2) < 1
    s.a[sm, :3] = (26, 16, 36); s.a[sm, 3] = 105
    if kind == 'pine':
        th = 4
        s.a[ay - th:ay, ax - 1:ax + 2, :3] = c('wood', 1); s.a[ay - th:ay, ax - 1:ax + 2, 3] = 255
        layers = 4; base = ay - th + 2
        for L in range(layers):
            w = r * (1 - L / (layers + .6)); top = base - r * .9 - L * r * .55
            bot = base - L * r * .55
            for y in range(int(top), int(bot)):
                hw = w * (y - top) / max(bot - top, 1)
                for x in range(int(ax - hw), int(ax + hw) + 1):
                    k = (x - ax) / max(hw, 1)
                    lv = 2 + k * 1.3 - (y - top) / (bot - top) * 1.2 + (BAYER[y % 4, x % 4] - .5) * .9
                    s.a[y, x, :3] = c('pine', lv); s.a[y, x, 3] = 255
        return s.finish()
    pal = 'leafp' if kind == 'purple' else 'leaf'
    th = int(r * .55) + 3 if trunk else -int(r * .5)
    tw = 2 if r < 10 else 3
    if trunk:
        s.a[ay - th:ay, ax - tw // 2:ax - tw // 2 + tw, :3] = c('wood', 1)
        s.a[ay - th:ay, ax - tw // 2 + tw - 1, :3] = c('wood', 2)
        s.a[ay - th:ay, ax - tw // 2:ax - tw // 2 + tw, 3] = 255
    cx, cy = ax, ay - th - r * .75
    blobs = []
    for k in range(int(r * 2.2)):
        a = rng.random() * 6.283; dist = r * np.sqrt(rng.random()) * .8
        blobs.append((cx + dist * np.cos(a), cy + dist * np.sin(a) * .78, 2 + 2.8 * rng.random() * (r / 11) ** .5))
    blobs.sort(key=lambda b: b[1])
    for bx, by, rr in blobs:
        x0, x1 = int(bx - rr - 1), int(bx + rr + 2); y0, y1 = int(by - rr - 1), int(by + rr + 2)
        sx, sy = xx[y0:y1, x0:x1] + .5 - bx, yy[y0:y1, x0:x1] + .5 - by
        d = (sx ** 2 + sy ** 2) / rr ** 2; body = d < 1
        lv = 2.2 - (sy - sx * .7) / rr * .9 + (-(by - cy) + (bx - cx) * .55) / r * 1.6
        lv += (BAYER[(yy[y0:y1, x0:x1]) % 4, (xx[y0:y1, x0:x1]) % 4] - .5) * .8
        col = np.array(P[pal], np.float32)[np.clip(lv.astype(int), 0, len(P[pal]) - 1)]
        reg = s.a[y0:y1, x0:x1]
        reg[body, :3] = col[body]; reg[body, 3] = 255
        rim = body & (d > .72) & (sy > .3)
        reg[rim, :3] = P[pal][0]
    return s.finish()

# ---------------- personagens ----------------
FRONT = ["..hhhh..", ".hCCCCh.", ".CSSSSC.", ".CSESEC.", ".cSssSc.", ".CCCCCC.", "CCCCCCCc", "CCBBBBCc",
         "CSBBBBSc", "CCbbbbCc", ".CCTTCc.", ".CCCCCc.", ".CCCCcc.", ".cCCCcc."]
BACK = ["..hhhh..", ".hhCCCh.", ".hCCCCC.", ".CCCCCc.", ".CCCCCc.", ".cCCCCc.", "CCCCCCCc", "CChCCCCc",
        "CChCCCcc", "CCCCCCcc", ".CCTTCc.", ".CCCCCc.", ".CCCCcc.", ".cCCCcc."]
HAIRF = ["..HHHH..", ".HHHHHH.", ".HSSSSH.", ".CSESEC.", ".cSssSc."]
LEGS = [["..L..L..", ".FF..FF."], ["..L.L...", "..FFF..."], [".L....L.", "FF....FF"], ["...LL...", "..FFFF.."]]

def person(cloak, cloak2, book, frame, back=False, flip=False, hair=None, idle=False):
    rows = list(BACK if back else FRONT)
    if hair is not None and not back: rows[:5] = HAIRF
    rows = rows + (LEGS[0] if idle else LEGS[frame % 4])
    hl = tuple(min(255, int(v * 1.3 + 22)) for v in cloak)
    cm = {'C': cloak, 'c': cloak2, 'h': hl, 'S': P['skin'][1], 's': P['skin'][0], 'E': (30, 20, 26),
          'B': book, 'b': tuple(int(v * .65) for v in book), 'T': P['gold'][1], 'L': (50, 34, 30), 'F': (30, 20, 18),
          'H': hair if hair is not None else cloak}
    s = Spr(10, len(rows) + 2, 5, len(rows) + 1)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in cm: s.a[y + 1, x + 1, :3] = cm[ch]; s.a[y + 1, x + 1, 3] = 255
    if not idle and frame % 2 == 1: s.a = np.roll(s.a, -1, 0)
    if flip: s.a = s.a[:, ::-1].copy(); s.ax = s.a.shape[1] - s.ax
    # sombra
    s2 = Spr(14, s.a.shape[0] + 2, 7, s.a.shape[0])
    s2.a[-3:-1, 2:12, :3] = (26, 16, 36); s2.a[-3:-1, 2:12, 3] = 110
    s2.a[-4, 4:10, :3] = (26, 16, 36); s2.a[-4, 4:10, 3] = 110
    s2.a[0:s.a.shape[0], 2:12][s.a[..., 3] > 0] = s.a[s.a[..., 3] > 0]
    return s2.finish()

# ---------------- adereços ----------------
FEATHER = ["...G", "..GG", "..Gg", ".GG.", ".Gg.", "GG..", "Gg..", "g..."]

def banner(frame, w=8, h=13, pole=22):
    s = Spr(w + 12, pole + h + 14, 3, pole + 4)
    ax, ay = s.ax, s.ay
    s.a[ay - pole:ay, ax:ax + 1, :3] = c('wood', 1); s.a[ay - pole:ay, ax:ax + 1, 3] = 255
    s.a[ay - pole, ax:ax + w + 3, :3] = c('wood', 2); s.a[ay - pole, ax:ax + w + 3, 3] = 255
    s.a[ay - pole - 1, ax + w + 2, :3] = c('gold', 2); s.a[ay - pole - 1, ax + w + 2, 3] = 255
    top = ay - pole + 1
    for y in range(h + 3):
        k = y / (h + 3)
        sh = int(round(1.4 * k * np.sin(frame * 1.5708 - y * .45)))
        for x in range(w):
            if y >= h and abs(x - (w - 1) / 2) < (y - h + 1) * 1.3: continue  # ponta em rabo de andorinha
            edge = x == 0 or x == w - 1 or y == 0 or y >= h - 1
            col = c('gold', 1) if edge else c('purple', 2 - (x < 2) + (x > w - 3))
            s.a[top + y, ax + 2 + x + sh, :3] = col; s.a[top + y, ax + 2 + x + sh, 3] = 255
        if 3 <= y < 3 + len(FEATHER):
            for x, ch in enumerate(FEATHER[y - 3]):
                if ch != '.':
                    s.a[top + y, ax + 2 + w // 2 - 2 + x + sh, :3] = c('gold', 2 if ch == 'G' else 1)
    return s.finish()

def table(seed, books=True):
    rng = np.random.default_rng(seed)
    s = Spr(70, 50, 30, 30)
    ground_shadow(s, 0, 0, 1.4, .7, 8, 90)
    for (lx, ly) in ((.05, .05), (1.3, .05), (1.3, .6), (.05, .6)):
        box(s, lx, ly, 0, .08, .08, 6, tex_flat('wood', 1, 'sun'), tex_flat('wood', 0, 'shade'), None)
    box(s, 0, 0, 6, 1.4, .7, 2, tex_flat('wood', 2, 'sun'), tex_flat('wood', 1, 'shade'), tex_flat('wood', 3, 'sun'))
    if books:
        bcols = [(140, 40, 40), (60, 70, 130), (120, 70, 30), (90, 40, 110), (50, 100, 70), (220, 200, 160)]
        for k in range(rng.integers(3, 6)):
            gx = .1 + rng.random() * 1.0; gy = .1 + rng.random() * .3
            bc = np.array(bcols[rng.integers(0, 6)], np.float32)
            hh = rng.integers(1, 4)
            box(s, gx, gy, 8, .25, .32, hh, lambda U, V, a, b: lit(bc, 'sun'), lambda U, V, a, b: lit(np.array([230, 216, 180.]), 'shade'),
                lambda U, V, a, b: lit(bc, 'sun'))
    return s.finish()

def stall(seed):
    s = Spr(110, 90, 40, 60)
    ground_shadow(s, 0, 0, 2, 1.2, 18, 90)
    table_s = table(seed)
    for (lx, ly) in ((0, 0), (2, 0), (2, 1.2), (0, 1.2)):
        box(s, lx, ly, 0, .1, .1, 22, tex_flat('wood', 2, 'sun'), tex_flat('wood', 1, 'shade'), None)
    box(s, .2, .3, 0, 1.6, .7, 8, tex_flat('wood', 2, 'sun'), tex_flat('wood', 1, 'shade'), tex_flat('wood', 3, 'sun'))
    stripe = lambda sh: (lambda U, V, LA, LB: lit(np.where(((U // 4) % 2 == 0)[..., None], c('purple', 2), np.array([232, 214, 180.])), sh))
    R0 = s.o(-.2, .6, 28)
    E0 = s.o(-.2, -.25, 22); face(s, E0, 2.4 * EX, R0 - E0, stripe('sun'))
    F0 = s.o(-.2, 1.45, 22); face(s, F0, 2.4 * EX, R0 - F0, stripe('mid'))
    return s.finish()

def tent(seed):
    s = Spr(90, 80, 45, 55)
    ground_shadow(s, -1, -1, 2, 2, 20, 90)
    apex = s.o(0, 0, 30)
    stripe = lambda sh: (lambda U, V, LA, LB: lit(np.where((((U) // 5) % 2 == 0)[..., None], c('purple', 2), c('gold', 1)), sh))
    for (a, b, sh) in (((-1, -1), (1, -1), 'sun'), ((1, -1), (1, 1), 'sun'), ((-1, 1), (-1, -1), 'mid'), ((1, 1), (-1, 1), 'shade')):
        A = s.o(*a); B = s.o(*b)
        face(s, A, B - A, apex - A, stripe(sh), cond=lambda U, V, LA, LB: (U / LA) + (V / LB) <= 1.0 + 1e-6)
    # porta
    face(s, s.o(-.2, 1), .4 * EX, 12 * UP, tex_flat('wood', 0, 'shade'))
    line(s, apex, apex + 6 * UP, c('wood', 0))
    return s.finish()

def crate(seed, barrel=False):
    s = Spr(40, 40, 20, 26)
    ground_shadow(s, 0, 0, .5, .5, 8, 90)
    if barrel:
        cylinder(s, s.ax + 0, s.ay + 0 + 4, 4, 9, bricks=False)
        s.a[..., :3] = np.where(s.a[..., 3:4] > 200, s.a[..., :3] * np.array([.85, .6, .4]), s.a[..., :3])
    else:
        box(s, 0, 0, 0, .5, .5, 7, tex_flat('wood', 2, 'sun', 18), tex_flat('wood', 1, 'shade', 18), tex_flat('wood', 3, 'sun'))
    return s.finish()

def campfire_frames(n=8, seed=1):
    rng = np.random.default_rng(seed)
    frames = []
    base = Spr(48, 48, 24, 34)
    # pedras em elipse
    for k in range(10):
        a = k / 10 * 6.283
        x, y = base.ax + 11 * np.cos(a), base.ay - 3 + 5.5 * np.sin(a)
        yy, xx = np.mgrid[0:48, 0:48]
        m = ((xx - x) / 3.2) ** 2 + ((yy - y) / 2.4) ** 2 < 1
        col = np.where((yy - y < -.5)[..., None], c('stone', 4), c('stone', 2))
        base.a[m, :3] = col[m]; base.a[m, 3] = 255
    for (p, q) in (((-6, -2), (6, -5)), ((-5, -5), (6, -1)), ((0, -7), (0, 0))):
        line(base, (base.ax + p[0], base.ay + p[1]), (base.ax + q[0], base.ay + q[1]), c('wood', 1))
    for f in range(n):
        s = Spr(48, 48, 24, 34); s.a = base.a.copy()
        noise = rng.random((40, 20))
        for y in range(18):
            hw = 6 * (1 - y / 18) ** .8 * (1 + .25 * np.sin(f * 1.3 + y * .6))
            off = 1.5 * np.sin(f * .9 + y * .35) * y / 18
            for x in range(int(-hw - 1), int(hw + 2)):
                k = abs(x - off) / max(hw, .5)
                if k > 1 + noise[y, x + 10] * .3: continue
                lv = 3 - k * 2.2 - y / 18 * 1.6 + noise[y + 20, x + 10] * .8
                s.a[s.ay - 4 - y, s.ax + x, :3] = c('glow', lv) if lv > .2 else (180, 60, 30)
                s.a[s.ay - 4 - y, s.ax + x, 3] = 255
        frames.append(s.finish(outline=False))
    return frames

def bridge(w, d, deck=13, arches=2):
    """Ponte de pedra ao longo de gy (atravessa rio que corre em gx). Origem = canto de trás (gx0, gy0)."""
    s = Spr(int((w + d) * 16 + 50), int((w + d) * 8 + deck + 60), int(d * 16 + 25), deck + 40)
    ramp = 1.3
    # pilares/face direita com arcos vazados (mostra a água atrás)
    span = d - 2 * ramp
    def arch_cond(U, V, LA, LB):
        tile = np.hypot(*EY)
        u_t = U / tile - ramp
        ok = np.ones_like(U, bool)
        for k in range(arches):
            c0 = span * (k + .5) / arches; rw = span / arches * .38
            dx = (u_t - c0) / rw
            ok &= ~((np.abs(dx) < 1) & (V < (deck - 4) * np.sqrt(np.clip(1 - dx ** 2, 0, 1))))
        return ok & (u_t > -ramp + (1 - np.clip(V / deck, 0, 1)) * 0)
    face(s, s.o(w, ramp, 0), span * EY, deck * UP, lambda U, V, LA, LB: np.broadcast_to(np.array([18., 30, 44]) + (V[..., None] > 1) * np.array([10., 16, 20]), U.shape + (3,)).copy())
    box(s, 0, ramp, 0, w, span, deck, tex_stone('sun', 5, 3), tex_stone('shade', 5, 3), None, cond_r=arch_cond)
    deck_tex = lambda sh: (lambda U, V, LA, LB: lit(c('stone', 3) + (hsh((U // 4).astype(int), (V // 3).astype(int), 2)[..., None] - .5) * 30 -
                                                    np.where((((U % 4) < .8) | ((V % 3) < .8))[..., None], 30, 0), sh))
    face(s, s.o(0, ramp, deck), w * EX, span * EY, deck_tex('sun'))
    # rampas
    face(s, s.o(0, 0, 0), w * EX, s.o(0, ramp, deck) - s.o(0, 0, 0), deck_tex('sun'))
    face(s, s.o(0, d - ramp, deck), w * EX, s.o(0, d, 0) - s.o(0, d - ramp, deck), deck_tex('mid'))
    # face direita das rampas (triângulos)
    face(s, s.o(w, 0, 0), ramp * EY, deck * UP, tex_stone('sun', 5, 3), cond=lambda U, V, LA, LB: V <= LB * U / LA)
    face(s, s.o(w, d - ramp, 0), ramp * EY, deck * UP, tex_stone('sun', 5, 3), cond=lambda U, V, LA, LB: V <= LB * (1 - U / LA))
    face(s, s.o(0, d, 0), w * EX, 1 * UP, tex_stone('shade', 5, 3))
    # parapeitos
    for side in (0, w - .18):
        box(s, side, ramp, deck, .2, span, 4, tex_stone('sun', 4, 3, 3), tex_stone('shade', 4, 3, 3), tex_flat('stone', 3, 'sun'))
    return s.finish()

def waterwheel(angle, r=9):
    s = Spr(40, 40, 20, 20)
    e = EX / np.hypot(*EX)
    C = np.array([s.ax, s.ay], float)
    pts = [C + r * np.cos(a) * e + r * np.sin(a) * UP for a in np.linspace(0, 6.283, 33)]
    for p, q in zip(pts[:-1], pts[1:]): line(s, p, q, c('wood', 2))
    pts2 = [C + (r - 2) * np.cos(a) * e + (r - 2) * np.sin(a) * UP for a in np.linspace(0, 6.283, 33)]
    for p, q in zip(pts2[:-1], pts2[1:]): line(s, p, q, c('wood', 1))
    for k in range(8):
        a = angle + k * 6.283 / 8
        p = C + r * np.cos(a) * e + r * np.sin(a) * UP
        line(s, C, p, c('wood', 1))
        line(s, p, C + (r + 2) * np.cos(a) * e + (r + 2) * np.sin(a) * UP, c('wood', 3))
    s.a[int(C[1]) - 1:int(C[1]) + 1, int(C[0]) - 1:int(C[0]) + 1, :3] = c('stone', 1); s.a[int(C[1]) - 1:int(C[1]) + 1, int(C[0]) - 1:int(C[0]) + 1, 3] = 255
    return s.finish()

def well():
    s = Spr(60, 70, 30, 46)
    ground_shadow(s, -.4, -.4, .8, .8, 14, 90)
    cylinder(s, s.ax, s.ay, 7, 7, bricks=True)
    yy, xx = np.mgrid[0:s.a.shape[0], 0:s.a.shape[1]]
    m = ((xx - s.ax) / 5.) ** 2 + ((yy - s.ay + 7) / 2.5) ** 2 < 1
    s.a[m, :3] = c('water', 1); s.a[m, 3] = 255
    for dx in (-6, 6): line(s, (s.ax + dx, s.ay - 6), (s.ax + dx, s.ay - 20), c('wood', 1))
    for k in range(5):
        y = s.ay - 20 - 4 + k
        hw = 9 - k * 1.8
        line(s, (s.ax - hw, y), (s.ax + hw, y), c('thatch', 2 - (k % 2)))
    line(s, (s.ax - 6, s.ay - 14), (s.ax + 6, s.ay - 14), c('wood', 2))
    return s.finish()

def rock(seed, r=4):
    rng = np.random.default_rng(seed)
    s = Spr(r * 4 + 6, r * 3 + 6, r * 2 + 3, r * 2 + 3)
    yy, xx = np.mgrid[0:s.a.shape[0], 0:s.a.shape[1]]
    d = ((xx - s.ax) / r) ** 2 + ((yy - s.ay + r * .6) / (r * .7)) ** 2
    m = d < 1
    lv = 3 - (yy - s.ay + r) / (r * 1.4) * 2 + (xx - s.ax) / r * .6 + (BAYER[yy % 4, xx % 4] - .5) * .7
    col = np.array(P['stone'], np.float32)[np.clip(lv.astype(int), 0, 4)]
    s.a[m, :3] = col[m]; s.a[m, 3] = 255
    return s.finish()
