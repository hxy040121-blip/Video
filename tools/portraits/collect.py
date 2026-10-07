#!/usr/bin/env python3
"""从 Danbooru 收集某角色的候选图（官方图 / 动画截图），下载缩略图并拼成带编号的对照表。
用法：python3 collect.py TAG OUTDIR [--extra anime_screenshot] [--n 16]
"""
import json, os, sys, urllib.parse, urllib.request, io
from PIL import Image, ImageDraw, ImageFont

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) portrait-collector/1.0'}

def get(url, binary=False):
    import subprocess
    data = subprocess.run(['curl', '-sSL', '-m', '90', '-A', 'Mozilla/5.0 (portrait-research)', url], capture_output=True, check=True).stdout
    return data if binary else json.loads(data)

def search(tag, extra, limit=200):
    q = urllib.parse.quote(f'{tag} {extra}')
    posts = get(f'https://danbooru.donmai.us/posts.json?tags={q}&limit={limit}')
    out = []
    for p in posts:
        gen = p.get('tag_string_general', '').split()
        if p.get('rating') not in ('g', 's') or not p.get('file_url'):
            continue
        if 'solo' not in gen:
            continue
        if p.get('tag_string_character', '').split() != [tag]:
            continue
        out.append(p)
    return out

def main():
    tag, outdir = sys.argv[1], sys.argv[2]
    extras = ['official_art']
    n = 16
    args = sys.argv[3:]
    for i, a in enumerate(args):
        if a == '--extra': extras = args[i + 1].split(',')
        if a == '--n': n = int(args[i + 1])
    os.makedirs(outdir, exist_ok=True)
    cands = []
    seen = set()
    for ex in extras:
        for p in search(tag, ex):
            if p['id'] in seen: continue
            seen.add(p['id']); p['_src'] = ex; cands.append(p)
    cands.sort(key=lambda p: (-(p['image_height'] >= 700), -p['score']))
    cands = cands[:n]
    meta = []
    thumbs = []
    for p in cands:
        url = p.get('large_file_url') or p['file_url']
        try:
            im = Image.open(io.BytesIO(get(url, True))).convert('RGB')
        except Exception as e:
            print('skip', p['id'], e); continue
        im.thumbnail((300, 400))
        thumbs.append((p, im))
        meta.append({k: p[k] for k in ('id', 'image_width', 'image_height', 'score', 'file_url', 'file_ext')} | {'src': p['_src'], 'copyright': p['tag_string_copyright']})
    json.dump(meta, open(os.path.join(outdir, 'cands.json'), 'w'), indent=1)
    cols = 6
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 310 + 10, rows * 430 + 10), (24, 22, 24))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
    except Exception:
        font = ImageFont.load_default()
    for i, (p, im) in enumerate(thumbs):
        x, y = 10 + (i % cols) * 310, 10 + (i // cols) * 430
        sheet.paste(im, (x + (300 - im.width) // 2, y))
        d.text((x, y + 404), f"#{i} {p['id']} {p['image_width']}x{p['image_height']} {p['_src'][:8]}", fill=(230, 200, 140), font=font)
    sheet.save(os.path.join(outdir, 'sheet.jpg'), quality=85)
    print(f'{len(thumbs)} candidates -> {outdir}/sheet.jpg')

if __name__ == '__main__':
    main()
