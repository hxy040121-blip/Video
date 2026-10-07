#!/usr/bin/env python3
"""把加工好的肖像（pipe.py 输出的 <id>.mono.png，1200×1600 透明底）导出成网站用的 WebP，并生成清单。

用法：python3 tools/portraits/export.py <加工目录> [--size 900] [--quality 82]
输出：assets/art/portraits/<id>.webp（900×1200）与 assets/data/portrait-images.js（window.PORTRAIT_IMAGES）。
只导出 assets/data/characters.js 里有的角色；缺的会列出来。需要：pip install pillow
"""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def main():
    src = sys.argv[1]
    a = sys.argv[2:]
    size = int(a[a.index('--size') + 1]) if '--size' in a else 900
    q = int(a[a.index('--quality') + 1]) if '--quality' in a else 82
    ids = json.loads(subprocess.run(['node', '-e', "global.window={};require(process.argv[1]);console.log(JSON.stringify(window.CHARACTERS.map(c=>c.id)))",
                                     os.path.join(ROOT, 'assets/data/characters.js')], capture_output=True, text=True, check=True).stdout)
    out_dir = os.path.join(ROOT, 'assets/art/portraits')
    os.makedirs(out_dir, exist_ok=True)
    found, missing, total = {}, [], 0
    for cid in ids:
        p = os.path.join(src, f'{cid}.mono.png')
        if not os.path.exists(p):
            missing.append(cid); continue
        im = Image.open(p).convert('RGBA').resize((size, size * 4 // 3), Image.LANCZOS)
        dest = os.path.join(out_dir, f'{cid}.webp')
        im.save(dest, 'WEBP', quality=q, alpha_quality=90, method=6)
        total += os.path.getsize(dest)
        found[cid] = f'assets/art/portraits/{cid}.webp'
    js = ('/* 由 tools/portraits/export.py 生成：角色 id → 肖像位图（官方原图经统一抠图、构图、暗金单色调色）。请勿手改。 */\n'
          f'window.PORTRAIT_IMAGES = {json.dumps(found, ensure_ascii=False, indent=1)};\n')
    open(os.path.join(ROOT, 'assets/data/portrait-images.js'), 'w', encoding='utf-8').write(js)
    print(f'{len(found)} 张，共 {total / 1024 / 1024:.1f} MB；缺：{" ".join(missing) or "无"}')

if __name__ == '__main__':
    main()
