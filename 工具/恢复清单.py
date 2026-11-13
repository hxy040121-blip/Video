# -*- coding: utf-8 -*-
"""恢复清单：照运行规则 9.3 列出恢复包里要读的每一份文件（绝对路径、字数），
写明上一条回复从正文存档的第几行起，草稿.md 是交付过的、写完没交付的，还是写到一半的。

用法：python3 工具/恢复清单.py                     在放着配置和记录的目录里跑
      python3 工具/恢复清单.py 记录目录             记录不在当前目录时
      python3 工具/恢复清单.py 记录目录 配置目录    配置不在这个脚本的上一层时

只读，不改任何文件。清单上的每一份都读全，同一步里一起读。
"各室"一节只列各人此刻所在的地方：紧接着要行动的、正在结算的事要用到的别处，自己补上。
"小游戏、事件"一节只是各条线里提到了名字：正在进行的才读；有正在进行的却没列出来的，照样读。
死者（续接记录"各人"一栏里记成"死"的）的卡单列一节，不在恢复包里：要用到他的样子、随身物时再读。
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REC = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
ROOT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.dirname(HERE)   # 配置所在的目录：工具/ 的上一层

RESIDENT = ['运行规则.md', '洋馆物理层.md', '本局卡司.md', '人物卡/00_卡司总则.md',
            '身体结算.md', '价目表.md', '主持人游戏.md']
FLOORS = {'B1': ['地下', '负一', 'B1'], '1F': ['一层', '一楼', '1F'], '2F': ['二层', '二楼', '2F'], '3F': ['三层', '三楼', '3F']}
PASSAGE = ['廊', '楼梯', '平台', '电梯']           # 位置里有这些字的，算在那一层的廊里
PLAIN = {'廊', '回廊', '楼梯'}                      # 文件名里这几段不单独拿来对位置
LONG = 15000                                       # 超过这么多字的，提醒一句：默认的读法一次读不全


def find(rel):
    """记录目录里有就用记录目录的，没有再到配置目录找。"""
    for base in (REC, ROOT):
        p = os.path.join(base, *rel.split('/'))
        if os.path.isfile(p):
            return p
    return None


def read(path):
    with open(path, encoding='utf-8-sig') as f:
        return f.read()


def sections(text):
    """续接记录：头部（第一个二级标题之前）和各栏。"""
    head, secs, name = [], {}, None
    for line in text.split('\n'):
        m = re.match(r'^##\s+(.+?)\s*$', line)
        if m:
            name = m.group(1)
            secs.setdefault(name, [])
        elif name is None:
            head.append(line)
        else:
            secs[name].append(line)
    return '\n'.join(head).strip(), secs


def cast(text):
    out = []
    for raw in text.split('\n'):
        cells = [c.strip() for c in re.split(r'[｜|]', raw) if c.strip()]
        if len(cells) >= 2 and cells[0].isdigit():
            out.append((cells[1], cells[2] if len(cells) > 2 else cells[1]))
    return out


def rooms_index():
    """各室/ 的文件名 → 每份文件拿来对位置的名字、所在楼层、是不是那一层的廊。"""
    folder = os.path.join(ROOT, '各室')
    idx = []
    if not os.path.isdir(folder):
        return idx
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith('.md'):
            continue
        stem = fn[:-3]
        floor, name = stem.split('_', 1) if '_' in stem else (None, stem)
        parts = name.split('与')
        idx.append({'path': os.path.join(folder, fn), 'floor': floor,
                    'names': [p for p in parts if p not in PLAIN],
                    'passage': any(p in PLAIN for p in parts)})
    return idx


def match_rooms(pos, idx):
    """一个人的位置 → 要读的各室文件。对不上的返回空。"""
    bare = pos.replace('地下一层', '地下').replace('地下一楼', '地下').replace('负一层', '负一').replace('负一楼', '负一')
    floors = [f for f, words in FLOORS.items() if any(w in bare for w in words)]
    hits = []                                      # (对上的那几个字, 文件)
    for r in idx:
        for n in r['names']:
            if n in pos:
                hits.append((n, r))
            elif len(n) >= 4 and n[-3:] in pos:    # "议事厅"对"穹顶议事厅"，"图书室"对"大图书室"
                hits.append((n[-3:], r))
    # "泳池机房"里也有"机房"：只留最长的那个名字对上的文件
    hits = [(n, r) for n, r in hits if not any(n != m and n in m for m, _ in hits)]
    # 同一个名字几层都有（起居室）：位置里写了楼层的，只留那一层
    if floors:
        keep = []
        for n, r in hits:
            same = [x for m, x in hits if m == n]
            if len(same) > 1 and r['floor'] not in floors:
                continue
            keep.append((n, r))
        hits = keep
    out = [r['path'] for _, r in hits]
    if any(w in pos for w in PASSAGE):
        fl = floors or (['1F'] if '门厅' in pos else [])
        for r in idx:
            if r['passage'] and r['floor'] in fl:
                out.append(r['path'])
    seen, uniq = set(), []
    for p in out:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return uniq


def last_reply():
    """最新一份正文存档里最后一个"## 回合 N"：文件、回合、起始行（从 1 数）、行数、全文。"""
    folder = os.path.join(REC, '正文')
    if not os.path.isdir(folder):
        return None
    files = sorted(f for f in os.listdir(folder) if f.endswith('.md'))
    for fn in reversed(files):
        path = os.path.join(folder, fn)
        lines = read(path).split('\n')
        at = [i for i, l in enumerate(lines) if re.match(r'^## 回合 \S+\s*$', l)]
        if at:
            i = at[-1]
            n = lines[i].split()[-1]
            return {'path': path, 'round': n, 'line': i + 1, 'count': len(lines) - i,
                    'text': '\n'.join(lines[i + 1:])}
    return None


def last_roll():
    path = os.path.join(REC, '投掷记录', 'rolls.jsonl')
    if not os.path.isfile(path):
        return None
    rows = [l for l in read(path).split('\n') if l.strip()]
    if not rows:
        return None
    try:
        return json.loads(rows[-1])
    except ValueError:
        return None


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    out, total, count = [], 0, 0

    def item(path, note=''):
        nonlocal total, count
        n = len(read(path))
        total += n
        count += 1
        if n > LONG:
            note = (note + '；' if note else '') + '长文件：放开长度限制读，读到末尾'
        out.append('%s\t%d字%s' % (path, n, ('\t' + note) if note else ''))

    def missing(rel, note=''):
        out.append('（找不到）%s%s' % (rel, ('\t' + note) if note else ''))

    cont_path = find('续接记录.md')
    head, secs = sections(read(cont_path)) if cont_path else ('', {})
    stop = re.search(r'止点[＝=]([^｜|]*)', head)
    days = [int(d) for d in re.findall(r'D(\d+)', stop.group(1))] if stop else []

    # 一、常驻文件和本局登场者的卡
    out.append('[常驻]')
    for rel in RESIDENT:
        p = find(rel)
        item(p) if p else missing(rel)
    cast_path = find('本局卡司.md')
    people = cast(read(cast_path)) if cast_path else []
    dead = set()
    for line in secs.get('各人', []):
        cells = [c.strip() for c in re.split(r'[｜|]', line.lstrip('-* ').strip())]
        if len(cells) >= 2 and cells[0] and cells[1].startswith('死'):
            dead.add(cells[0])
    dead_cards = []
    for card, shown in people:
        p = find('人物卡/%s.md' % card)
        if p and (shown in dead or card in dead):
            dead_cards.append((p, shown))
        else:
            item(p) if p else missing('人物卡/%s.md' % card)
    if not people:
        out.append('（本局卡司.md 里没读到登场者：卡自己找齐）')
    p = find('开局流程.md')
    if p and (not days or max(days) <= 1):
        item(p, '止点还在 D01')
    elif p:
        out.append('（开局流程.md：D01 已过。第 4 节的播报还没播完的才读）')

    if dead_cards:
        out.append('[死者的卡：不在恢复包里，要用到他的样子、随身物时再读；不算在上面的份数里]')
        for p, shown in dead_cards:
            out.append('%s\t%d字\t%s' % (p, len(read(p)), shown))

    # 进行中的小游戏、事件：只看头部和"各条线"里提到的名字
    scan = head + '\n' + '\n'.join(secs.get('各条线', []))
    named = []
    for folder in ('小游戏', '事件'):
        d = os.path.join(ROOT, folder)
        if not os.path.isdir(d):
            continue
        hit = [f for f in sorted(os.listdir(d))
               if f.endswith('.md') and not f.startswith('00_') and f[:-3] in scan]
        if hit:
            named.append(os.path.join(d, '00_通则.md'))
            named.extend(os.path.join(d, f) for f in hit)
    if named:
        out.append('[小游戏、事件：各条线里提到了这些名字。正在进行的才读，读的话同一步里一起读；不算在上面的份数里]')
        for p in named:
            out.append('%s\t%d字' % (p, len(read(p))) if os.path.isfile(p) else '（找不到）%s' % p)

    # 二、三、记录
    out.append('[记录]')
    if cont_path:
        item(cont_path)
    else:
        missing('续接记录.md')
    p = find('补定细节.md')
    if p:
        item(p)
    p = find('大纲.md')
    if p and read(p).strip():
        item(p, '有案件时才有这一份')

    # 四、各室：各人此刻所在
    out.append('[各室：各人此刻所在的地方。紧接着要行动的、正在结算的事要用到的别处，自己补上]')
    idx, where, lost = rooms_index(), {}, []
    for line in secs.get('各人', []):
        cells = [c.strip() for c in re.split(r'[｜|]', line.lstrip('-* ').strip())]
        if len(cells) < 2 or not cells[0] or cells[1].startswith('死'):
            continue
        pos = re.split(r'[（(]', cells[1])[0]
        got = match_rooms(pos, idx)
        if not got:
            lost.append('%s：%s' % (cells[0], pos))
        for g in got:
            where.setdefault(g, []).append(cells[0])
    for p in sorted(where):
        item(p, '、'.join(where[p]))
    if lost:
        out.append('（位置没对上各室文件的：%s）' % '；'.join(lost))
    if not secs.get('各人'):
        out.append('（续接记录里没有"各人"一栏：各室自己定）')

    # 五、上一条回复和草稿
    out.append('[上一条回复]')
    last = last_reply()
    if last:
        n = len(last['text'])
        total += n
        count += 1
        how = '从第 %d 行读到末尾' % last['line']
        if last['count'] > 2000:
            how += '（%d 行，一次读不完的接着往下读到末尾）' % last['count']
        out.append('%s\t%s\t回合 %s，%d 行，%d字' % (last['path'], how, last['round'], last['count'], n))
    else:
        out.append('（正文存档里还没有交付过的回复）')

    out.append('[草稿]')
    draft_path = os.path.join(REC, '草稿.md')
    if not os.path.isfile(draft_path):
        out.append('没有 草稿.md。')
    else:
        draft = read(draft_path)
        rows = [l.strip() for l in draft.split('\n') if l.strip()]
        done = bool(rows) and re.match(r'^字数＝\d*$', rows[-1]) is not None
        if last and draft.strip() == last['text'].strip():
            out.append('草稿.md 和上一条相同：上一条已经交付，不用读它。')
        elif done:
            item(draft_path, '写完了、还没交付的一条：读它，照 9.1 第 5 步交付')
        else:
            item(draft_path, '写到一半的一条：读它，从停下的地方接着写')
            roll = last_roll()
            d = (roll or {}).get('params', {}).get('draft') or (roll or {}).get('draft')
            sha = hashlib.sha256(draft.encode('utf-8')).hexdigest()[:16]
            if roll and d and d.get('sha') == sha:
                out.append('最后一掷 #%s（%s）之后草稿没有再写过：照它的结果写，不重掷。结果：%s' % (
                    roll.get('id'), roll.get('time'), json.dumps(roll.get('result'), ensure_ascii=False)[:300]))

    title = '恢复清单｜%s' % (head.split('｜')[0] if head else '续接记录没有头部')
    print(title)
    print('要读 %d 份，合计 %d 字。每一份都读全；同一步里一起读，不一份读完再读下一份。' % (count, total))
    print('\n'.join(out))


if __name__ == '__main__':
    main()
