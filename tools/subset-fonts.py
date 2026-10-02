"""把开源字体裁成网站用到的字，输出 woff2 到 assets/fonts/。

用法：python3 tools/subset-fonts.py <字体源目录>
字体源（均为 SIL OFL 授权，可从 Google Fonts 下载 TTF）：
  Noto Serif SC (Regular / Black)、Noto Sans SC (Medium)、Zhi Mang Xing、Cinzel (Regular / Bold)、Courier Prime (Regular)
收录范围：GB2312 一级常用字 3755 个 + 仓库里所有配置文件与网站源码实际出现的字符。
需要：pip install fonttools brotli
"""
import glob
import os
import sys

from fontTools import subset

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/fonts'

FONTS = [
    # (源文件名关键字, 输出名, 是否中文)
    ('notoserifsc', 'Regular', 'serif-400', True),
    ('notoserifsc', 'Black', 'serif-900', True),
    ('notosanssc', 'Medium', 'sans-500', True),
    ('zhimangxing', 'Regular', 'brush', True),
    ('cinzel', 'Regular', 'cinzel-400', False),
    ('cinzel', 'Bold', 'cinzel-700', False),
    ('courierprime', 'Regular', 'mono-400', False),
]


def collect_text():
    chars = set()
    # GB2312 一级字
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode('gb2312'))
            except UnicodeDecodeError:
                pass
    pats = ['*.md', '人物卡/**/*.md', 'index.html', 'assets/**/*.js', 'assets/**/*.css', 'assets/**/*.svg']
    for pat in pats:
        for f in glob.glob(os.path.join(ROOT, pat), recursive=True):
            if '/vendor/' in f:
                continue
            with open(f, encoding='utf-8', errors='ignore') as fh:
                chars.update(fh.read())
    chars.update(chr(c) for c in range(0x20, 0x7F))
    chars.update('，。、；：？！“”‘’（）《》〈〉【】—…·～｜／　「」『』〇一二三四五六七八九十百千万零')
    return ''.join(sorted(c for c in chars if c.isprintable() or c == '　'))


def find_font(key, style):
    from fontTools.ttLib import TTFont
    for f in glob.glob(os.path.join(SRC, f'{key}*.ttf')):
        name = TTFont(f, lazy=True)['name'].getDebugName(4) or ''
        if name.endswith(style):
            return f
    raise SystemExit(f'找不到字体 {key} {style}（在 {SRC}）')


def main():
    text = collect_text()
    out_dir = os.path.join(ROOT, 'assets/fonts')
    os.makedirs(out_dir, exist_ok=True)
    for key, style, out, _cjk in FONTS:
        src = find_font(key, style)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        font = subset.load_font(src, opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        dest = os.path.join(out_dir, f'{out}.woff2')
        subset.save_font(font, dest, opts)
        print(f'{out}: {os.path.getsize(dest) // 1024} KB')


if __name__ == '__main__':
    main()
