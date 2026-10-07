#!/usr/bin/env python3
"""把图（或其局部）缩放后画上带原图坐标的网格，用来读眼睛坐标。
用法：python3 grid.py SRC OUT [x0,y0,x1,y1] [--step N] [--w 900]
"""
import sys
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
box = None
args = sys.argv[3:]
step, width = None, 900
for i, a in enumerate(args):
    if a == '--step': step = int(args[i + 1])
    elif a == '--w': width = int(args[i + 1])
    elif ',' in a and box is None and (i == 0 or args[i - 1] not in ('--step', '--w')): box = tuple(map(int, a.split(',')))
im = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', im.size, (70, 66, 70, 255)); bg.alpha_composite(im); im = bg.convert('RGB')
if box: im = im.crop(box)
x0, y0 = (box[0], box[1]) if box else (0, 0)
k = width / im.width
im = im.resize((width, int(im.height * k)))
if not step:
    span = im.width / k
    step = max(5, int(round(span / 10 / 5)) * 5)
d = ImageDraw.Draw(im)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
gx = (x0 // step) * step
while gx < x0 + im.width / k:
    X = (gx - x0) * k
    if X >= 0:
        d.line([(X, 0), (X, im.height)], fill=(255, 40, 40), width=1); d.text((X + 2, 2), str(gx), fill=(255, 255, 0), font=f)
    gx += step
gy = (y0 // step) * step
while gy < y0 + im.height / k:
    Y = (gy - y0) * k
    if Y >= 0:
        d.line([(0, Y), (im.width, Y)], fill=(255, 40, 40), width=1); d.text((2, Y + 2), str(gy), fill=(0, 255, 255), font=f)
    gy += step
im.save(out)
print(out, im.size, 'step', step)
