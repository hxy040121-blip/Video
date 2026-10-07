#!/usr/bin/env python3
"""立绘加工流水线：原图 → 抠图 → 统一构图 → 几种统一调色。

用法：
  python3 pipe.py SRC --id ID --out DIR [--face x,y,w,h] [--eyes lx,ly,rx,ry] [--flip]
                  [--scale 1.0] [--dx 0] [--dy 0] [--treat mono,dark,print] [--keep-alpha]
  --face / --eyes 是原图坐标（不给就自动检测脸）；--scale/--dx/--dy 在自动构图后微调。
输出：DIR/ID.cut.png（抠图缓存）、DIR/ID.<treat>.png（600×800 的 2 倍：1200×1600，透明背景）。
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image
import cv2
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1200, 1600          # 输出尺寸（网站 3:4，2 倍）
EYE_Y = 0.41 * H           # 网站假设双眼约在 41% 高度
FACE_W = 0.36 * W          # 脸框宽度占画面宽度

def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i+2], 16) for i in (0, 2, 4)], np.float32) / 255

INK, BRASS, BRASS_HI, BONE, BLOOD = map(hexrgb, ['#0a0809', '#c29a5b', '#e3c48a', '#ebe3d6', '#ff2e7e'])

def cutout(src, cache, keep_alpha):
    if os.path.exists(cache):
        return Image.open(cache).convert('RGBA')
    im = Image.open(src)
    if keep_alpha and im.mode in ('RGBA', 'LA', 'P'):
        out = im.convert('RGBA')
    else:
        from rembg import remove, new_session
        out = remove(im.convert('RGB'), session=new_session('isnet-anime'))
    out.save(cache)
    return out

def detect_face(rgb):
    casc = cv2.CascadeClassifier(os.path.join(HERE, 'animeface.xml'))
    g = cv2.equalizeHist(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
    faces = casc.detectMultiScale(g, scaleFactor=1.05, minNeighbors=4, minSize=(48, 48))
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])

def frame(rgba, face, eyes, scale=1.0, dx=0, dy=0):
    """把人物放进 W×H：脸宽统一、双眼落在 EYE_Y、居中。返回 (canvas RGBA float, 眼睛坐标)。"""
    a = np.asarray(rgba).astype(np.float32) / 255
    if eyes:
        lx, ly, rx, ry = eyes
        ex, ey = (lx + rx) / 2, (ly + ry) / 2
        s = FACE_W * 0.45 / max(1.0, np.hypot(rx - lx, ry - ly)) * scale
    else:
        x, y, w, h = face
        ex, ey = x + w / 2, y + h * 0.45
        s = FACE_W / w * scale
    tx = W / 2 - ex * s + dx
    ty = EYE_Y - ey * s + dy
    M = np.float32([[s, 0, tx], [0, s, ty]])
    # 原图边界：抠图贴着原图边缘的地方会出现一条直线 → 宽羽化，并记下这些地方（后面不打轮廓光）
    src_h, src_w = a.shape[:2]
    yy0, xx0 = np.mgrid[0:src_h, 0:src_w].astype(np.float32)
    dist = np.minimum.reduce([xx0, yy0, src_w - 1 - xx0, src_h - 1 - yy0])
    F = max(12.0, 0.07 * min(src_w, src_h))
    t = np.clip(dist / F, 0, 1); feather = t * t * (3 - 2 * t)
    t2 = np.clip((dist - F) / F, 0, 1); rimok_src = t2 * t2 * (3 - 2 * t2)
    a[..., 3] *= feather
    # 预乘后再缩放，避免边缘发白
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    out = cv2.warpAffine(pm, M, (W, H), flags=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    out = np.clip(out, 0, 1)
    rimok = cv2.warpAffine(rimok_src, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    al = out[..., 3:4]
    rgb = np.where(al > 1e-4, out[..., :3] / np.maximum(al, 1e-4), 0)
    # 底部统一沉入黑暗
    yy = np.linspace(0, 1, H)[:, None]
    fade = np.clip((0.97 - yy) / (0.97 - 0.70), 0, 1) ** 1.4
    al = al[..., 0] * fade
    # 左右两侧也轻轻溶进黑暗，裁切边不会是一条硬线
    xx = np.linspace(0, 1, W)[None, :]
    side = np.clip(np.minimum(xx, 1 - xx) / 0.07, 0, 1)
    al = al * (side * side * (3 - 2 * side))
    eyes_out = None
    if eyes:
        lx, ly, rx, ry = eyes
        eyes_out = (lx * s + tx, ly * s + ty, rx * s + tx, ry * s + ty)
    else:
        eyes_out = None
    global RIMOK
    RIMOK = rimok
    return np.clip(rgb, 0, 1), np.clip(al, 0, 1), eyes_out, s

def lum(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114

def gradient_map(L, stops):
    xs = np.array([p for p, _ in stops], np.float32)
    out = np.zeros(L.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = np.interp(L, xs, [hexrgb(col)[c] for _, col in stops])
    return out

def eye_mask(eyes, s, shape):
    m = np.zeros(shape, np.float32)
    if not eyes:
        return m
    lx, ly, rx, ry = eyes
    r = max(10, 0.085 * FACE_W)
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    for cx, cy in ((lx, ly), (rx, ry)):
        d = ((xx - cx) / r) ** 2 + ((yy - cy) / (r * 0.8)) ** 2
        m = np.maximum(m, np.clip(1.25 - d, 0, 1))
    return ndi.gaussian_filter(m, 2)

def tint_eyes(out, rgb, eyes, s, amount=0.9):
    """只把眼睛范围内偏暗的虹膜/瞳孔染成血粉；眼白和高光保持原样。"""
    if not eyes:
        return out
    L = lum(rgb)
    em = eye_mask(eyes, s, L.shape) * np.clip((0.78 - L) / 0.45, 0, 1)
    pink = BLOOD[None, None] * np.clip(L[..., None] * 1.5 + 0.18, 0, 1.1)
    out = out * (1 - em[..., None] * amount) + pink * (em[..., None] * amount)
    return np.clip(out, 0, 1)

def grain(shape, amt, seed):
    rng = np.random.default_rng(seed)
    return (rng.standard_normal(shape).astype(np.float32)) * amt

RIMOK = None

def rim_light(al, dx, dy, blur, strength):
    """形状错位得到的细轮廓光；只在光源一侧（右上）明显，原图裁切边不打光。"""
    sh = ndi.shift(al, (dy, dx), order=1, mode='constant')
    r = np.clip(al - sh, 0, 1)
    r = ndi.gaussian_filter(r, blur) * strength
    yy, xx = np.mgrid[0:al.shape[0], 0:al.shape[1]].astype(np.float32)
    side = np.clip((xx / al.shape[1] - 0.25) / 0.6, 0, 1) * np.clip(1.15 - yy / al.shape[0], 0, 1)
    r = r * (0.25 + 0.75 * side)
    if RIMOK is not None:
        r = r * RIMOK
    return np.clip(r, 0, 1)

def key_light(shape, cx, cy, rad):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]].astype(np.float32)
    d = np.sqrt(((xx - cx) / rad) ** 2 + ((yy - cy) / rad) ** 2)
    return np.clip(1.15 - 0.75 * d, 0.25, 1.0)

def t_mono(rgb, al, eyes, s, seed):
    """暗金单色：老照片 / 铜版的墨黑 + 黄铜，只有眼睛带一点血粉。"""
    L = lum(rgb)
    L = np.clip((L - 0.06) / 0.9, 0, 1)
    L = L * key_light(L.shape, W * 0.62, H * 0.30, W * 0.75)
    L = np.clip(L + grain(L.shape, 0.025, seed), 0, 1)
    out = gradient_map(L, [(0, '#050404'), (0.22, '#1c1310'), (0.45, '#5a4430'), (0.7, '#b08a52'), (0.88, '#e3c48a'), (1, '#f4e6c4')])
    out = tint_eyes(out, rgb, eyes, s, 0.9)
    rim = rim_light(al, -5, 4, 1.3, 1.9)
    out = np.clip(out + rim[..., None] * BRASS_HI * 0.75, 0, 1)
    return out, al

def t_dark(rgb, al, eyes, s, seed):
    """原色压暗：保留原作配色，统一压暗、同一盏侧光、黄铜轮廓光、暖色暗部。"""
    L = lum(rgb)[..., None]
    sat = 0.62
    c = L + (rgb - L) * sat
    c = c ** 1.18 * 0.86
    c = c * key_light(L.shape[:2], W * 0.64, H * 0.28, W * 0.7)[..., None]
    shadow = np.clip(1 - lum(c) * 2.2, 0, 1)[..., None]
    c = c + shadow * np.array([0.035, 0.012, 0.01], np.float32)
    rim = rim_light(al, -5, 4, 1.3, 1.9)
    c = np.clip(c + rim[..., None] * BRASS_HI * 0.7, 0, 1)
    c = np.clip(c + grain(L.shape[:2], 0.02, seed)[..., None], 0, 1)
    return c, al

def halftone(L, cell, angle):
    yy, xx = np.mgrid[0:L.shape[0], 0:L.shape[1]].astype(np.float32)
    ca, sa = np.cos(angle), np.sin(angle)
    u = (xx * ca + yy * sa) / cell
    v = (-xx * sa + yy * ca) / cell
    du = u - np.floor(u) - 0.5
    dv = v - np.floor(v) - 0.5
    d = np.sqrt(du * du + dv * dv)          # 0..0.707
    r = np.sqrt(np.clip(L, 0, 1) / np.pi) * 1.0   # 面积≈亮度
    return np.clip((r - d) * cell * 0.9 + 0.5, 0, 1)

def t_print(rgb, al, eyes, s, seed):
    """丝网版画：墨黑 + 黄铜两色网点，高光留骨白，眼睛血粉。"""
    L = lum(rgb)
    L = np.clip((L - 0.1) / 0.8, 0, 1)
    L = L * key_light(L.shape, W * 0.62, H * 0.30, W * 0.8)
    dots = halftone(L, 9, np.pi / 4)
    hi = np.clip((L - 0.78) / 0.08, 0, 1)
    out = INK[None, None] * (1 - dots[..., None]) + BRASS[None, None] * dots[..., None]
    out = out * (1 - hi[..., None]) + BONE[None, None] * hi[..., None]
    out = tint_eyes(out, rgb, eyes, s, 1.0)
    return np.clip(out, 0, 1), al

TREATS = {'mono': t_mono, 'dark': t_dark, 'print': t_print}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('--id', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--face'); ap.add_argument('--eyes'); ap.add_argument('--flip', action='store_true')
    ap.add_argument('--scale', type=float, default=1.0); ap.add_argument('--dx', type=float, default=0); ap.add_argument('--dy', type=float, default=0)
    ap.add_argument('--treat', default='mono'); ap.add_argument('--keep-alpha', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    import hashlib
    key = hashlib.md5(open(a.src, 'rb').read()).hexdigest()[:8]
    cut = cutout(a.src, os.path.join(a.out, f'{a.id}.{key}.cut.png'), a.keep_alpha)
    if a.flip:
        cut = cut.transpose(Image.FLIP_LEFT_RIGHT)
    rgb8 = np.asarray(cut.convert('RGB'))
    eyes = tuple(map(float, a.eyes.split(','))) if a.eyes else None
    face = tuple(map(float, a.face.split(','))) if a.face else (None if eyes else detect_face(rgb8))
    if face is None and not eyes:
        sys.exit(f'{a.id}: 没检测到脸，请用 --eyes lx,ly,rx,ry 指定')
    if eyes and a.flip:
        w0 = rgb8.shape[1]
        eyes = (w0 - eyes[2], eyes[3], w0 - eyes[0], eyes[1])
    rgb, al, eyes_c, s = frame(cut, face, eyes, a.scale, a.dx, a.dy)
    seed = sum(map(ord, a.id))
    for t in a.treat.split(','):
        c, al2 = TREATS[t](rgb, al, eyes_c, s, seed)
        img = np.dstack([c, al2])
        Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(a.out, f'{a.id}.{t}.png'))
    print(json.dumps({"id": a.id, "face": [float(v) for v in face] if face is not None else None, 'scale': s, 'eyes_canvas': eyes_c}))

if __name__ == '__main__':
    main()
