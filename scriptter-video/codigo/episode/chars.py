"""Personagens desenhados do zero por partes (cabeça, rosto/expressão, corpo, braços, pernas).
Grandes (interiores, 4x) e pequenos (exteriores, 3x). Mesmas cores e traços nas duas escalas."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'iso'))
from engine import Spr, P

SKIN, SKIN2 = (232, 186, 140), (196, 140, 104)
EYE = (34, 22, 30)
INV1 = dict(name='inv1', hair=(118, 70, 38), style='short', goggles=True, scarf=(196, 44, 44), top=(128, 88, 52), top2=(96, 64, 38),
            pants=(74, 60, 50), boots=(46, 32, 26))
INV2 = dict(name='inv2', hair=(38, 28, 30), style='curly', glasses=True, top=(234, 224, 204), top2=(196, 186, 168), vest=(96, 50, 72),
            pants=(70, 76, 100), boots=(40, 30, 28))
KING = dict(name='king', hair=(196, 196, 204), style='king', crown=True, robe=(116, 48, 136), robe2=(84, 32, 100), fur=(240, 230, 210),
            cape=(74, 28, 90), boots=(60, 40, 40))
GUARD = dict(name='guard', helmet=(158, 164, 178), helmet2=(104, 110, 126), tabard=(108, 46, 132), mail=(124, 128, 140),
             pants=(64, 62, 74), boots=(40, 34, 36), spear=True)
HERALD = dict(GUARD, name='herald', spear=False, hat=(108, 46, 132))

def _r(a, x0, y0, x1, y1, col):
    a[max(y0, 0):y1, max(x0, 0):x1, :3] = col; a[max(y0, 0):y1, max(x0, 0):x1, 3] = 255
def _p(a, x, y, col):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]: a[y, x, :3] = col; a[y, x, 3] = 255
def dk(c, k=.72): return tuple(int(v * k) for v in c)
def lt(c, k=1.2, add=16): return tuple(min(255, int(v * k + add)) for v in c)

# ---------------- grande (16 de largura útil) ----------------
def big(spec, pose='rest', frame=0, back=False, flip=False, expr='neutral', walk=True):
    W, H = 22, 46; X, Y = 3, 13          # deslocamento (espaço para lança/braços)
    a = np.zeros((H, W, 4), np.float32)
    R = lambda x0, y0, x1, y1, col: _r(a, x0 + X, y0 + Y, x1 + X, y1 + Y, col)
    Pp = lambda x, y, col: _p(a, x + X, y + Y, col)
    bob = -1 if (walk and frame % 2 == 1) else 0
    king = spec.get('crown'); guard = spec['name'] in ('guard', 'herald')
    # capa do rei (atrás)
    if king:
        R(1, 11, 15, 29, spec['cape']); R(1, 11, 2, 29, dk(spec['cape']))
    # pernas
    if king:
        for y in range(12, 29):
            hw = 4 + (y - 12) * 2 // 8
            R(8 - hw, y, 8 + hw, y + 1, spec['robe'] if not back else spec['robe2'])
            Pp(8 - hw, y, spec['robe2'])
        ft = [(5, 7), (9, 11)] if frame % 2 == 0 or not walk else [(6, 8), (8, 10)]
        for x0, x1 in ft: R(x0, 28, x1, 29, spec['boots'])
    else:
        legs = {0: ((5, 7, 0), (9, 11, 0)), 1: ((6, 8, 0), (8, 10, -2)), 2: ((4, 6, 0), (10, 12, 0)), 3: ((6, 8, -2), (8, 10, 0))}
        L = legs[frame % 4] if walk else legs[0]
        for (x0, x1, lift) in L:
            R(x0, 21 + bob, x1, 27 + lift, spec['pants']); R(x0, 26 + lift, x1 + (1 if not back else 0), 29 + lift, spec['boots'])
            Pp(x0, 21 + bob, dk(spec['pants']))
    y0 = bob
    # tronco
    if not king:
        top = spec.get('top', spec.get('mail')); top2 = spec.get('top2', dk(top))
        R(4, 12 + y0, 12, 21 + y0, top); R(4, 12 + y0, 5, 21 + y0, top2); R(11, 12 + y0, 12, 21 + y0, lt(top, 1.05, 6))
        if spec.get('vest') and not back: R(4, 13 + y0, 6, 20 + y0, spec['vest']); R(10, 13 + y0, 12, 20 + y0, spec['vest'])
        if guard:
            R(5, 12 + y0, 11, 21 + y0, spec['tabard'] if not back else dk(spec['tabard'])); R(5, 20 + y0, 11, 22 + y0, dk(spec['tabard']))
            if not back:
                for (x, y) in ((8, 14), (8, 15), (7, 16), (7, 17)): Pp(x, y + y0, P['gold'][2])
        R(4, 19 + y0, 12, 20 + y0, (70, 44, 30)); Pp(8, 19 + y0, P['gold'][2])
    else:
        R(3, 11 + y0, 13, 13 + y0, spec['fur'])
        for x in (4, 7, 10): Pp(x, 12 + y0, (40, 30, 34))
        if not back: R(7, 13 + y0, 9, 28, spec['fur'])
    # braços
    sl = spec.get('robe') if king else (spec.get('mail') if guard else spec.get('top'))
    sl2 = dk(sl)
    def arm_rest(side):
        x = 3 if side < 0 else 12
        R(x, 13 + y0, x + 1, 19 + y0, sl2 if side < 0 else sl); R(x, 19 + y0, x + 1, 21 + y0, SKIN if side > 0 else SKIN2)
    if pose == 'scared':
        for side in (-1, 1):
            x = 2 if side < 0 else 13
            R(x, 10 + y0, x + 1, 15 + y0, sl if side > 0 else sl2); R(x - side * 0, 8 + y0, x + 1, 10 + y0, SKIN)
            R(x + (1 if side < 0 else -1), 13 + y0, x + (2 if side < 0 else 0), 15 + y0, sl2)
    else:
        arm_rest(-1)
        if pose == 'point':
            R(12, 13 + y0, 17, 15 + y0, sl); R(17, 13 + y0, 19, 15 + y0, SKIN); Pp(19, 13 + y0, SKIN)
        elif pose == 'raise':
            R(13, 5 + y0, 14, 14 + y0, sl); R(12, 12 + y0, 13, 14 + y0, sl); R(13, 3 + y0, 15, 5 + y0, SKIN)
        elif pose == 'write':
            dx = [0, 1, 2, 1][frame % 4]
            R(11, 15 + y0, 14 + dx, 17 + y0, sl); R(13 + dx, 16 + y0, 15 + dx, 18 + y0, SKIN)
        elif pose == 'hold':
            R(3, 15 + y0, 6, 17 + y0, sl2); R(10, 15 + y0, 13, 17 + y0, sl); R(5, 16 + y0, 7, 18 + y0, SKIN); R(9, 16 + y0, 11, 18 + y0, SKIN)
        else:
            arm_rest(1)
    if spec.get('spear'):
        R(14, -10, 15, 27, (92, 60, 40)); R(13, -13, 16, -10, (210, 214, 224)); Pp(14, -14, (240, 240, 250))
        R(13, 17 + y0, 16, 19 + y0, SKIN)
    # cabeça
    R(7, 11 + y0, 9, 12 + y0, SKIN2)
    R(4, 3 + y0, 12, 11 + y0, SKIN)
    R(4, 9 + y0, 5, 11 + y0, SKIN2); R(11, 9 + y0, 12, 11 + y0, SKIN2)
    hy = y0
    if back:
        hc = spec.get('hair', spec.get('helmet'))
        R(4, 2 + hy, 12, 11 + hy, hc); R(3, 4 + hy, 13, 9 + hy, hc); R(4, 2 + hy, 5, 11 + hy, dk(hc))
        if guard: R(4, 2 + hy, 12, 8 + hy, spec['helmet']); R(3, 7 + hy, 13, 8 + hy, spec['helmet2'])
        if king: R(4, 1 + hy, 12, 3 + hy, P['gold'][1])
    else:
        # olhos, sobrancelhas, boca
        for ex in (6, 9): Pp(ex, 7 + y0, EYE)
        brow = {'neutral': [(5, 6), (6, 6), (9, 6), (10, 6)], 'worried': [(5, 6), (6, 5), (9, 5), (10, 6)],
                'serious': [(5, 5), (6, 6), (9, 6), (10, 5)]}[expr]
        hc = spec.get('hair', (90, 60, 40))
        for (bx, by) in brow: Pp(bx, by + y0, dk(hc, .6) if not king else (150, 150, 160))
        if expr == 'worried': Pp(7, 9 + y0, (120, 50, 50)); Pp(8, 9 + y0, (120, 50, 50)); Pp(7, 10 + y0, (90, 36, 40))
        elif expr == 'serious': R(6, 9 + y0, 10, 10 + y0, (120, 60, 56))
        else: R(7, 9 + y0, 9, 10 + y0, (170, 90, 80))
        st = spec.get('style')
        if st == 'short':
            R(4, 2 + y0, 12, 5 + y0, hc); R(4, 5 + y0, 5, 8 + y0, hc); R(11, 5 + y0, 12, 7 + y0, hc); R(5, 1 + y0, 10, 2 + y0, hc)
            R(4, 2 + y0, 5, 5 + y0, dk(hc))
        elif st == 'curly':
            R(4, 1 + y0, 12, 5 + y0, hc); R(3, 2 + y0, 13, 7 + y0, hc)
            for (x, y) in ((3, 1), (6, 0), (9, 0), (12, 1), (2, 4), (13, 4), (3, 7), (12, 7)): Pp(x, y + y0, hc)
            for (x, y) in ((5, 2), (8, 1), (10, 3), (4, 5)): Pp(x, y + y0, lt(hc, 1.6, 20))
        elif st == 'king':
            R(3, 3 + y0, 5, 9 + y0, hc); R(11, 3 + y0, 13, 9 + y0, hc); R(4, 2 + y0, 12, 4 + y0, hc)
            # barba e bigode
            for y in range(8, 17):
                hw = 4 if y < 12 else max(1, 4 - (y - 11))
                R(8 - hw, y + y0, 8 + hw, y + 1 + y0, (222, 222, 228))
                Pp(8 - hw, y + y0, (176, 176, 186))
            R(6, 8 + y0, 10, 9 + y0, (200, 200, 210)); R(7, 9 + y0, 9, 10 + y0, (110, 56, 60)) if expr != 'serious' else R(6, 9 + y0, 10, 10 + y0, (110, 56, 60))
        if spec.get('goggles'):
            R(4, 4 + y0, 12, 5 + y0, (90, 60, 34))
            for gx in (5, 9): R(gx, 3 + y0, gx + 3, 5 + y0, P['gold'][1]); Pp(gx + 1, 4 + y0, (90, 190, 200))
        if spec.get('glasses'):
            for ex in (6, 9):
                for (x, y) in ((-1, 0), (1, 0), (0, -1), (0, 1)): Pp(ex + x, 7 + y + y0, (200, 204, 216))
            Pp(7, 7 + y0, (200, 204, 216)); Pp(8, 7 + y0, (200, 204, 216))
        if guard and spec.get('helmet'):
            R(4, 1 + y0, 12, 6 + y0, spec['helmet']); R(3, 5 + y0, 13, 6 + y0, spec['helmet2']); R(4, 1 + y0, 5, 6 + y0, spec['helmet2'])
            R(7, 0 + y0, 9, 1 + y0, spec['helmet']); R(8, 5 + y0, 9, 9 + y0, spec['helmet2'])
        if spec['name'] == 'herald':
            R(4, 1 + y0, 12, 4 + y0, spec['hat']); R(3, 3 + y0, 13, 4 + y0, dk(spec['hat'])); Pp(11, 0 + y0, P['gold'][2])
        if king:
            R(4, 1 + y0, 12, 3 + y0, P['gold'][1]); R(4, 2 + y0, 12, 3 + y0, P['gold'][0])
            for x in (4, 7, 8, 11): Pp(x, 0 + y0, P['gold'][2])
            Pp(8, 1 + y0, (200, 40, 60)); Pp(5, 1 + y0, (60, 120, 200)); Pp(10, 1 + y0, (60, 160, 90))
        if spec.get('scarf'):
            R(4, 11 + y0, 12, 13 + y0, spec['scarf']); R(5, 13 + y0, 7, 17 + y0, spec['scarf']); R(5, 16 + y0, 7, 17 + y0, dk(spec['scarf']))
            R(4, 12 + y0, 12, 13 + y0, dk(spec['scarf'], .8))
    s = Spr(W, H, X + 8, Y + 29)
    s.a = a
    # sombra no chão
    sh = Spr(W, H + 2, X + 8, Y + 29); sh.a[:H] = a
    for y, hw in ((29, 6), (30, 5)):
        m = sh.a[Y + y, X + 8 - hw:X + 8 + hw, 3] == 0
        sh.a[Y + y, X + 8 - hw:X + 8 + hw][m] = (26, 16, 36, 110)
    if flip:
        sh.a = sh.a[:, ::-1].copy(); sh.ax = W - sh.ax
    return sh.finish()

# ---------------- pequeno (exteriores) ----------------
def small(spec, frame=0, back=False, flip=False, walk=True, scared=False):
    W, H = 14, 26; X, Y = 3, 7
    a = np.zeros((H, W, 4), np.float32)
    R = lambda x0, y0, x1, y1, col: _r(a, x0 + X, y0 + Y, x1 + X, y1 + Y, col)
    Pp = lambda x, y, col: _p(a, x + X, y + Y, col)
    bob = -1 if walk and frame % 2 else 0
    guard = spec['name'] in ('guard', 'herald'); king = spec.get('crown')
    legs = [((2, 3), (5, 6)), ((3, 4), (4, 5)), ((1, 2), (6, 7)), ((3, 4), (4, 5))][frame % 4 if walk else 0]
    if king:
        R(1, 7, 7, 16, spec['robe']); R(1, 7, 2, 16, spec['robe2'])
    else:
        for x0, x1 in legs: R(x0, 12, x1, 15, spec['pants']); R(x0, 14, x1, 16, spec['boots'])
    top = spec.get('top', spec.get('mail', (100, 100, 100)))
    if not king:
        R(1, 7 + bob, 7, 13 + bob, top); R(1, 7 + bob, 2, 13 + bob, dk(top))
        if spec.get('vest') and not back: R(1, 8 + bob, 2, 12 + bob, spec['vest']); R(6, 8 + bob, 7, 12 + bob, spec['vest'])
        if guard: R(2, 7 + bob, 6, 13 + bob, spec['tabard'])
        R(1, 11 + bob, 7, 12 + bob, (70, 44, 30))
    else:
        R(1, 6 + bob, 7, 7 + bob, spec['fur'])
    if scared:
        R(0, 4 + bob, 1, 8 + bob, top); R(7, 4 + bob, 8, 8 + bob, top); _p(a, X + 0, Y + 3 + bob, SKIN); _p(a, X + 7, Y + 3 + bob, SKIN)
    else:
        R(0, 8 + bob, 1, 12 + bob, dk(top)); R(7, 8 + bob, 8, 12 + bob, top)
    R(1, 1 + bob, 7, 7 + bob, SKIN)
    hc = spec.get('hair', spec.get('helmet', (90, 60, 40)))
    if back:
        R(1, 0 + bob, 7, 6 + bob, hc)
    else:
        Pp(3, 3 + bob, EYE); Pp(5, 3 + bob, EYE)
        if spec.get('style') == 'curly': R(0, 0 + bob, 8, 2 + bob, hc); R(0, 2 + bob, 1, 4 + bob, hc); R(7, 2 + bob, 8, 4 + bob, hc); Pp(3, -1 + bob, hc); Pp(5, -1 + bob, hc)
        elif spec.get('style') == 'king': R(1, 4 + bob, 7, 7 + bob, (222, 222, 228)); R(1, 0 + bob, 7, 1 + bob, hc)
        else: R(1, 0 + bob, 7, 2 + bob, hc); Pp(1, 2 + bob, hc)
        if spec.get('goggles'): Pp(2, 1 + bob, P['gold'][2]); Pp(5, 1 + bob, P['gold'][2])
        if spec.get('glasses'): Pp(4, 3 + bob, (214, 214, 224))
        if spec.get('scarf'): R(1, 6 + bob, 7, 7 + bob, spec['scarf']); R(2, 7 + bob, 3, 10 + bob, spec['scarf'])
        if scared: Pp(4, 5 + bob, (110, 50, 50))
    if guard and spec.get('helmet'):
        R(1, -1 + bob, 7, 2 + bob, spec['helmet']); R(0, 1 + bob, 8, 2 + bob, spec['helmet2'])
    if king:
        R(1, -1 + bob, 7, 1 + bob, P['gold'][1]); Pp(1, -2 + bob, P['gold'][2]); Pp(4, -2 + bob, P['gold'][2]); Pp(6, -2 + bob, P['gold'][2])
    if spec.get('spear'):
        R(8, -6, 9, 14, (92, 60, 40)); R(7, -8, 10, -6, (210, 214, 224))
    s = Spr(W, H + 2, X + 4, Y + 15)
    s.a[:H] = a
    for y, hw in ((15, 4), (16, 3)):
        m = s.a[Y + y, X + 4 - hw:X + 4 + hw, 3] == 0
        s.a[Y + y, X + 4 - hw:X + 4 + hw][m] = (26, 16, 36, 110)
    if flip: s.a = s.a[:, ::-1].copy(); s.ax = W - s.ax
    return s.finish()
