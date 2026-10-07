#!/usr/bin/env python3
"""Fandom wiki 图片：搜索 File: 命名空间、下载并拼对照表。
  python3 fandom.py search WIKI "query" OUTDIR [--n 24]   → OUTDIR/sheet.jpg + cands.json（编号 #i）
  python3 fandom.py get WIKI "File:Title.png" OUT
WIKI 例：danganronpa、naruto、deathnote
"""
import io, json, os, subprocess, sys, urllib.parse
from PIL import Image, ImageDraw, ImageFont

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36'

def curl(url):
    return subprocess.run(['curl', '-sSL', '-m', '90', '-A', UA, url], capture_output=True, check=True).stdout

def api(wiki, **params):
    params['format'] = 'json'
    return json.loads(curl(f'https://{wiki}.fandom.com/api.php?' + urllib.parse.urlencode(params)))

def imageinfo(wiki, titles):
    out = {}
    for i in range(0, len(titles), 40):
        d = api(wiki, action='query', titles='|'.join(titles[i:i + 40]), prop='imageinfo', iiprop='url|size|mime')
        for p in d['query']['pages'].values():
            if 'imageinfo' in p:
                out[p['title']] = p['imageinfo'][0]
    return out

def font(sz):
    try:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', sz)
    except Exception:
        return ImageFont.load_default()

def search(wiki, q, outdir, n):
    os.makedirs(outdir, exist_ok=True)
    d = api(wiki, action='query', list='search', srsearch=q, srnamespace=6, srlimit=min(n * 2, 100))
    titles = [s['title'] for s in d['query']['search'] if not s['title'].lower().endswith(('.gif', '.ogg', '.mp3', '.webm'))]
    info = imageinfo(wiki, titles)
    items = [(t, info[t]) for t in titles if t in info][:n]
    thumbs = []
    for t, ii in items:
        try:
            im = Image.open(io.BytesIO(curl(ii['url']))).convert('RGBA')
        except Exception as e:
            print('skip', t, e); continue
        bg = Image.new('RGBA', im.size, (60, 56, 60, 255)); bg.alpha_composite(im)
        im = bg.convert('RGB'); im.thumbnail((240, 320))
        thumbs.append((t, ii, im))
    json.dump([{'i': i, 'title': t, 'url': ii['url'], 'w': ii['width'], 'h': ii['height']} for i, (t, ii, _) in enumerate(thumbs)], open(os.path.join(outdir, 'cands.json'), 'w'), indent=1, ensure_ascii=False)
    cols = 8; rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 250 + 10, rows * 350 + 10), (24, 22, 24))
    dr = ImageDraw.Draw(sheet); f = font(15)
    for i, (t, ii, im) in enumerate(thumbs):
        x, y = 10 + (i % cols) * 250, 10 + (i // cols) * 350
        sheet.paste(im, (x + (240 - im.width) // 2, y))
        dr.text((x, y + 324), f"#{i} {ii['width']}x{ii['height']}", fill=(230, 200, 140), font=f)
    sheet.save(os.path.join(outdir, 'sheet.jpg'), quality=85)
    print(f'{len(thumbs)} -> {outdir}/sheet.jpg')

def get(wiki, title, out):
    ii = imageinfo(wiki, [title])[title]
    open(out, 'wb').write(curl(ii['url']))
    print('saved', out, ii['width'], ii['height'])

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'search':
        n = int(sys.argv[sys.argv.index('--n') + 1]) if '--n' in sys.argv else 24
        search(sys.argv[2], sys.argv[3], sys.argv[4], n)
    elif cmd == 'get':
        get(sys.argv[2], sys.argv[3], sys.argv[4])
