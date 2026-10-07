#!/usr/bin/env python3
"""从 Zerochan 收集某角色的候选图（官方图 / 截图 / 画集扫描），拼成带编号的对照表。
用法：python3 collect_z.py "L Lawliet" OUTDIR [--kinds "Official Art,Screenshot,Scan"] [--n 30]
对照表里的编号是 zerochan id；取原图：python3 collect_z.py --get ID OUT.jpg
"""
import io, json, os, subprocess, sys, urllib.parse
from PIL import Image, ImageDraw, ImageFont

UA = 'Mozilla/5.0 portrait-research - anon'
MULTI = {'Group', 'Couple', 'Pair', 'Duo', 'Trio', 'Two Girls', 'Two Boys', 'Multiple Persons', 'Multiple Girls', 'Multiple Boys'}

def get(url, binary=False):
    data = subprocess.run(['curl', '-sSL', '-m', '90', '-A', UA, url], capture_output=True, check=True).stdout
    return data if binary else json.loads(data)

def query(name, kind, n):
    tag = urllib.parse.quote_plus(name) + (',' + urllib.parse.quote_plus(kind) if kind else '')
    try:
        d = get(f'https://www.zerochan.net/{tag}?json&l={n}&s=fav')
    except Exception as e:
        print('query failed', name, kind, e); return []
    return d.get('items', [])

def fetch_full(zid, out):
    d = get(f'https://www.zerochan.net/{zid}?json')
    for k in ('full', 'large'):
        if d.get(k):
            data = get(d[k], True)
            try:
                Image.open(io.BytesIO(data)).verify()
                open(out, 'wb').write(data)
                print('saved', out, d.get('width'), d.get('height'), k)
                return
            except Exception:
                continue
    sys.exit(f'could not fetch {zid}')

def main():
    if sys.argv[1] == '--get':
        return fetch_full(sys.argv[2], sys.argv[3])
    name, outdir = sys.argv[1], sys.argv[2]
    kinds = ['Official Art', 'Screenshot', 'Scan']
    n = 30
    a = sys.argv[3:]
    for i, x in enumerate(a):
        if x == '--kinds': kinds = [k.strip() for k in a[i + 1].split(',')]
        if x == '--n': n = int(a[i + 1])
    os.makedirs(outdir, exist_ok=True)
    seen, cands = set(), []
    for k in kinds:
        for it in query(name, k, 60):
            if it['id'] in seen or MULTI & set(it.get('tags', [])):
                continue
            seen.add(it['id']); it['_kind'] = k; cands.append(it)
    # 优先：高分辨率、竖图
    cands.sort(key=lambda it: (-(min(it['width'], it['height']) >= 700), -(it['height'] >= it['width'] * 0.9)))
    cands = cands[:n]
    thumbs = []
    for it in cands:
        try:
            im = Image.open(io.BytesIO(get(it['thumbnail'], True))).convert('RGB')
        except Exception as e:
            print('skip', it['id'], e); continue
        im.thumbnail((240, 320))
        thumbs.append((it, im))
    json.dump([{k: it.get(k) for k in ('id', 'width', 'height', 'tag', '_kind')} for it, _ in thumbs], open(os.path.join(outdir, 'cands.json'), 'w'), indent=1)
    cols = 8
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 250 + 10, rows * 350 + 10), (24, 22, 24))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    except Exception:
        font = ImageFont.load_default()
    for i, (it, im) in enumerate(thumbs):
        x, y = 10 + (i % cols) * 250, 10 + (i // cols) * 350
        sheet.paste(im, (x + (240 - im.width) // 2, y))
        d.text((x, y + 324), f"{it['id']} {it['width']}x{it['height']} {it['_kind'][:5]}", fill=(230, 200, 140), font=font)
    sheet.save(os.path.join(outdir, 'sheet.jpg'), quality=85)
    print(f'{len(thumbs)} candidates -> {outdir}/sheet.jpg')

if __name__ == '__main__':
    main()
