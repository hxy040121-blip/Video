# -*- coding: utf-8 -*-
"""字数：数一条回复的正文字数（运行规则 2.2），在草稿末尾添上一行"字数＝N"；
带上正文存档的路径和回合数时（交付，运行规则 9.1 第 5 步），再做三件事：
把整份草稿原样追加在正文存档末尾；把草稿旁边 续接记录.md 的头部换成"回合 N｜止点行"（9.2）；
在草稿旁边的 耗时.md 末尾记一行交付的时刻和这时续接记录的字数。

用法：python3 字数.py 草稿.md
      python3 字数.py 草稿.md 正文/D01.md 37

只数字数、只做这几处写入，不做别的检查。末尾已经有"字数＝"那一行的（跑了第二遍），换掉它，不另添。
存档里已经有"## 回合 37"这一行的，不重复追加；耗时.md 里已经有这一回合的，不重复记。
续接记录只动头部（第一个二级标题之前），各栏一字不动；草稿里没有止点行、找不到续接记录的，头部不动。
正文从第一个场景标题起，到"各人去向"（或交接、止点行）之前为止。
算：叙述、台词、心理活动。不算：场景标题，心理活动以外的引用块（照录的主持人原话、身份卡原文），
分隔线，空白和 > ** * # ` 这类标记。汉字、标点、字母、数字各算一个。
"""
import calendar
import os
import re
import sys
import time

END = re.compile(r'^\s*(#+\s*)?(\*\*)?(各人去向|【轮到主持人】|止点[＝=]|```)')
TITLE = re.compile(r'^\s*〈[^〉]*〉\s*$')
MONO = re.compile(r'^\s*(>\s*)?\*\*[^*]{1,20}\*\*\s*[（(]')
RULE = re.compile(r'^\s*([-*_]\s*){3,}$')
LINE = re.compile(r'^字数＝\d*$')


def count(text):
    lines = text.split('\n')
    start = next((i for i, l in enumerate(lines) if re.search(r'〈[^〉]*·[^〉]*〉', l)), 0)
    end = next((i for i in range(start + 1, len(lines)) if END.match(lines[i])), len(lines))
    total, depth, i = 0, 0, start
    while i < end:
        l = lines[i]
        i += 1
        if not l.strip() or TITLE.match(l) or RULE.match(l):
            depth = 0
            continue
        if l.lstrip().startswith('>'):
            if MONO.match(l):
                depth = 0
            elif depth == 0:
                continue          # 心理活动以外的引用块：照录，不算
            depth = max(0, depth + l.count('（') + l.count('(') - l.count('）') - l.count(')'))
        else:
            depth = 0
        t = re.sub(r'^\s*>+', '', l).replace('**', '').replace('`', '').replace('*', '').replace('#', '')
        total += len(re.sub(r'\s+', '', t))
    return total


def archive(draft_text, path, n):
    """把草稿原样追加在正文存档末尾，前面加一行"## 回合 N"。已经存过这一回合的不再追加。"""
    head = '## 回合 %s' % n
    old = ''
    if os.path.exists(path):
        with open(path, encoding='utf-8-sig') as f:
            old = f.read()
        if any(l.strip() == head for l in old.split('\n')):
            return False
    folder = os.path.dirname(path)
    if folder and not os.path.isdir(folder):
        os.makedirs(folder)
    if not old.strip() or old.endswith('\n\n'):
        gap = ''
    elif old.endswith('\n'):
        gap = '\n'
    else:
        gap = '\n\n'
    with open(path, 'a', encoding='utf-8') as f:
        f.write(gap + head + '\n\n' + draft_text)
    return True


def set_head(draft_text, cont_path, n):
    """把续接记录的头部（第一个二级标题之前）换成"回合 N｜止点行"。各栏一字不动。"""
    stops = [l.strip() for l in draft_text.split('\n') if re.match(r'^\s*止点[＝=]', l)]
    if not stops:
        return 'head skipped: no stop line in draft'
    if not os.path.exists(cont_path):
        return 'head skipped: record file not found'
    with open(cont_path, encoding='utf-8-sig', newline='') as f:
        old = f.read()
    m = re.search(r'(?m)^## ', old)
    if not m:
        return 'head skipped: no section heading in record file'
    eol = '\r\n' if '\r\n' in old else '\n'
    new = '回合 %s｜%s' % (n, stops[-1]) + eol + eol + old[m.start():]
    if new == old:
        return 'head unchanged'
    with open(cont_path, 'w', encoding='utf-8', newline='') as f:
        f.write(new)
    return 'head updated'


def log_time(folder, n, draft_text, words):
    """在 耗时.md 末尾记一行：回合｜交付时刻｜全长｜字数｜续接记录的字数｜核到交付几分钟｜距上一条交付几分钟。"""
    path = os.path.join(folder, '耗时.md')
    old = ''
    if os.path.exists(path):
        with open(path, encoding='utf-8-sig') as f:
            old = f.read()
    if any(l.startswith('回合 %s｜' % n) for l in old.split('\n')):
        return 'time already logged'
    now = time.time()
    prev = None
    for stamp in re.findall(r'交付 (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) UTC', old):
        prev = calendar.timegm(time.strptime(stamp, '%Y-%m-%d %H:%M:%S'))
    cells = ['回合 %s' % n, '交付 %s UTC' % time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(now)),
             '全长 %d' % len(re.sub(r'\s+', '', draft_text)), '字数 %d' % words]
    cont = os.path.join(folder, '续接记录.md')
    if os.path.exists(cont):
        with open(cont, encoding='utf-8-sig') as f:
            cells.append('续接 %d' % len(f.read()))
    src = os.path.join(folder, '核对素材.md')
    if os.path.exists(src):
        made = os.path.getmtime(src)
        if prev is None or made > prev:
            cells.append('核到交付 %d 分' % round((now - made) / 60))
    if prev is not None:
        cells.append('距上一条交付 %d 分' % round((now - prev) / 60))
    with open(path, 'a', encoding='utf-8') as f:
        f.write(('' if not old or old.endswith('\n') else '\n') + '｜'.join(cells) + '\n')
    return 'time logged'


if __name__ == '__main__':
    if len(sys.argv) not in (2, 4):
        print(__doc__)
        sys.exit(1)
    path = sys.argv[1]
    with open(path, encoding='utf-8-sig') as f:
        text = f.read()
    body = text.rstrip('\n').split('\n')
    if body and LINE.match(body[-1].strip()):
        body = body[:-1]
        while body and not body[-1].strip():
            body = body[:-1]
    n = count('\n'.join(body))
    out = '\n'.join(body) + '\n\n字数＝%d\n' % n
    with open(path, 'w', encoding='utf-8') as f:
        f.write(out)
    print(n)
    if len(sys.argv) == 4:
        print('archived' if archive(out, sys.argv[2], sys.argv[3]) else 'already archived')
        folder = os.path.dirname(os.path.abspath(path))
        print(set_head(out, os.path.join(folder, '续接记录.md'), sys.argv[3]))
        print(log_time(folder, sys.argv[3], out, n))
