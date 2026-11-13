# -*- coding: utf-8 -*-
"""核对素材：给校对的子代理备料，并核大纲里"留下的东西"各条的来历（运行规则 9.1 第 3 步、7.3、1.2）。

用法：python3 核对素材.py 续接记录.md [配置目录]

一、把续接记录的"各人""共知""所知"三栏原样抄成 核对素材.md（和续接记录同一个目录，每次整份覆盖）。
二、同一个目录里有 大纲.md、而且不是空的（有人受命或决意杀人），再抄四栏：
      物态          续接记录里的那一栏
      掷            上一条交付以后掷过的各掷：谁要做成什么，掷出来的是哪一句（投掷记录/rolls.jsonl、耗时.md）
      真相          大纲"实际"一段里的
      留下的东西    大纲"实际"一段里的
三、"留下的东西"每一条行末〔〕里的来历，同原件逐字对一遍，结果打在屏幕上：
      〔掷 #6：原句〕          对投掷记录里第 6 掷掷出来的那一句：对抗的掷、照条文概率掷的，成了对"成了怎样"，
                               不成对"不成怎样"；抽选对抽中的；掷点数对掷的是什么和点数；破绽对谁受了什么刺激、成立没有
      〔正文 回合 12：原句〕   对 正文/ 里回合 12 那一条；这一回合还没交付的，对 草稿.md
      〔日志 D02：原句〕       对 日志/D02.md
      〔物理层 7.2：原句〕     对配置目录里的 洋馆物理层.md；别的文件写文件名，如〔身体结算 7：原句〕〔补定细节：原句〕
    原句太长的，中间可以用"……"省掉一段，两头都要对得上，先后也要对。
    对不上的、行末没有来历的，逐条打出来。只对原句在不在原件里，不判断它撑不撑得起这样东西。

配置目录缺省是这个脚本所在目录的上一层。只写 核对素材.md 一份，别的文件只读。
"""
import calendar
import json
import os
import re
import sys
import time

WANT = ['各人', '共知', '所知']
HEAD = re.compile(r'^##\s+(.+?)\s*$')
LEAD = re.compile(r'^\s*(?:[-*]\s*)?\*\*(真相|留下的东西)[。.：:]?\*\*')
BULLET = re.compile(r'^\s*[-*]\s+')
SRC = re.compile(r'〔([^〔〕：:]{1,40})[：:]([^〔〕]+)〕')
ROUND = re.compile(r'^##\s*回合\s*(\d+)\s*$', re.M)
ALIAS = {'物理层': '洋馆物理层'}
NOT_SOURCE = {'续接记录', '大纲', '大纲存档', '核对', '核对素材', '耗时', '草稿', '本局卡司'}  # 演出者自己的记录，不能拿来当来历
MINQ = 6  # 抄的原句至少这么多字


def read(path):
    with open(path, encoding='utf-8-sig') as f:
        return f.read()


def pick(text, want):
    """续接记录里 want 列出的各栏，原样。"""
    got, name = {}, None
    for line in text.split('\n'):
        m = HEAD.match(line)
        if m:
            name = m.group(1)
            if name in want:
                got.setdefault(name, [])
            continue
        if name in want:
            got[name].append(line)
    return got


def outline(text):
    """大纲里各案"实际"一段的"真相"和"留下的东西"。各案接在一起，前头注明是哪一案。"""
    got = {'真相': [], '留下的东西': []}
    case, cur = '', None
    for line in text.split('\n'):
        if line.startswith('#'):
            if line.startswith('## '):
                case = line[3:].strip()
            cur = None
            continue
        m = LEAD.match(line)
        if m:
            cur = m.group(1)
            got[cur].append('（%s）' % case)
            rest = line[m.end():].strip()
            if rest:
                got[cur].append(rest)
            continue
        if cur and line.strip():
            got[cur].append(line.rstrip())
    return got


def norm(s):
    """去掉空白，引号统一，用来逐字比对。"""
    s = ''.join(s.split())
    for a, b in (('“', '"'), ('”', '"'), ('‘', "'"), ('’', "'")):
        s = s.replace(a, b)
    return s


def pieces(quote):
    q = quote.strip()
    while len(q) >= 2 and q[0] in '"“「' and q[-1] in '"”」':
        q = q[1:-1].strip()
    return [p for p in (norm(x) for x in re.split(r'…+|\.{3,}', q)) if p]


def found(hay, quote):
    """原句在不在 hay 里。太短返回 None，在返回 True，不在返回 False。"""
    ps = pieces(quote)
    if sum(len(p) for p in ps) < MINQ:
        return None
    hay, pos = norm(hay), 0
    for p in ps:
        i = hay.find(p, pos)
        if i < 0:
            return False
        pos = i + len(p)
    return True


def load_rolls(rec):
    p = os.path.join(rec, '投掷记录', 'rolls.jsonl')
    if not os.path.isfile(p):
        return None
    rolls = []
    for line in read(p).split('\n'):
        line = line.strip()
        if line:
            try:
                rolls.append(json.loads(line))
            except ValueError:
                pass
    return rolls


def parts_of(r):
    p = r.get('params') if isinstance(r.get('params'), dict) else {}
    res = r.get('result') if isinstance(r.get('result'), dict) else {}
    return p, res


def outcome(r):
    """这一掷掷出来的那一句。只取掷中的：没成的那一句、没抽中的选项都不算。"""
    p, res = parts_of(r)
    kind = r.get('kind')
    if kind in ('roll', 'chance'):  # 对抗的掷、照条文概率掷的：成了取"成了怎样"，没成取"不成怎样"
        return (p.get('success') if res.get('success') else p.get('failure')) or ''
    if kind == 'tell':  # 破绽：谁受了什么刺激，成立没有，谁看见了
        seen = '、'.join(w.get('name', '') for w in (res.get('watchers') or []) if w.get('success'))
        return '%s：%s｜%s%s' % (p.get('who') or '', p.get('trigger') or '',
                                 '成立' if res.get('success') else '不成立', ('｜看见的：' + seen) if seen else '')
    if kind == 'dice':  # 掷点数：掷的是什么，点数
        vals = res.get('values') or []
        return '%s｜%s｜%sd%s＝%s%s' % (p.get('what') or '', p.get('source') or '', p.get('count') or 1, p.get('sides') or '',
                                      '、'.join(str(v) for v in vals), '（合计 %s）' % res.get('sum') if len(vals) > 1 else '')
    if kind == 'pick':  # 抽选：抽的是什么，抽中的
        return '%s｜抽中：%s' % (p.get('what') or '', '、'.join(str(x) for x in (res.get('picked') or [])))
    return ''


def roll_line(r):
    p, res = parts_of(r)
    kind, rid, out = r.get('kind'), r.get('id'), outcome(r)
    if kind == 'roll' and out:
        return '#%s｜%s｜%s对%s（%s）｜要做成：%s｜%s，掷出来的是：%s' % (
            rid, p.get('at') or '', p.get('actor') or '', p.get('opponent') or '', p.get('kind') or '',
            p.get('attempt') or '', '成了' if res.get('success') else '没成', out)
    if kind == 'chance' and out:
        return '#%s｜照条文掷｜%s（%s，%s%%）｜%s，掷出来的是：%s' % (
            rid, p.get('what') or '', p.get('source') or '', p.get('probability'), '成了' if res.get('success') else '没成', out)
    if kind == 'tell':
        return '#%s｜破绽｜%s' % (rid, out)
    if kind == 'dice':
        return '#%s｜掷点数｜%s' % (rid, out)
    if kind == 'pick':
        return '#%s｜抽选｜%s' % (rid, out)
    return '#%s｜%s｜（旧版的记录，里面没有掷出来的那一句）' % (rid, kind)


def stamp(s, fmt):
    try:
        return calendar.timegm(time.strptime(s, fmt))
    except ValueError:
        return None


def last_delivery(rec):
    """上一条交付的时刻。返回 (时刻, 说明)：找不到耗时.md、里面没有交付的，时刻是 None，说明里写原因。"""
    p = os.path.join(rec, '耗时.md')
    if not os.path.isfile(p):
        return None, '找不到 耗时.md（第一条还没交付时没有这一份；不是第一条的，先把它取过来再跑）'
    ts = re.findall(r'交付\s*(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\s*UTC', read(p))
    if not ts:
        return None, '耗时.md 里还没有一条交付'
    return stamp(ts[-1], '%Y-%m-%d %H:%M:%S'), ''


def roll_time(r):
    m = re.match(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d', r.get('time') or '')
    return stamp(m.group(0), '%Y-%m-%dT%H:%M:%S') if m else None


def round_text(rec, n):
    """正文存档里回合 n 那一条；没有返回 None。"""
    d = os.path.join(rec, '正文')
    if not os.path.isdir(d):
        return None
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.md'):
            continue
        t = read(os.path.join(d, fn))
        ms = list(ROUND.finditer(t))
        for i, m in enumerate(ms):
            if int(m.group(1)) == n:
                return t[m.end():ms[i + 1].start() if i + 1 < len(ms) else len(t)]
    return None


def conf_file(name, rec, root):
    name = ALIAS.get(name, name)
    rel = name if name.endswith('.md') else name + '.md'
    for base in (rec, root):
        p = os.path.join(base, *rel.split('/'))
        if os.path.isfile(p):
            return p
    stem = os.path.basename(rel)
    for base in (root, rec):
        for dp, _, fns in os.walk(base):
            if stem in fns:
                return os.path.join(dp, stem)
    return None


def check(label, quote, rec, root, rolls):
    """一个〔来历：原句〕对不对得上。返回 (对上了没有, 说明)。"""
    label = label.strip()
    m = re.match(r'^掷\s*#?\s*(\d+)$', label)
    if m:
        if rolls is None:
            return False, '核不了：找不到 投掷记录/rolls.jsonl，先把它取过来'
        r = next((x for x in rolls if x.get('id') == int(m.group(1))), None)
        if r is None:
            return False, '投掷记录里没有第 %s 掷（最后一掷是 #%s）' % (m.group(1), rolls[-1].get('id') if rolls else '无')
        hay = outcome(r)
        where = '第 %s 掷掷出来的是：%s' % (m.group(1), hay or '（旧版的记录，里面没有可抄的句子）')
    else:
        m = re.match(r'^(?:正文\s*)?回合\s*(\d+)$', label)
        if m:
            hay, where = round_text(rec, int(m.group(1))), '正文存档回合 %s' % m.group(1)
            if hay is None:
                p = os.path.join(rec, '草稿.md')
                if not os.path.isfile(p):
                    return False, '核不了：正文存档里没有回合 %s，也找不到 草稿.md' % m.group(1)
                hay, where = read(p), '草稿.md（正文存档里还没有回合 %s）' % m.group(1)
        else:
            m = re.match(r'^日志\s*(D\d+)$', label)
            name = label.split()[0]
            if not m and ALIAS.get(name, name).split('/')[-1].replace('.md', '') in NOT_SOURCE:
                return False, '"%s"是演出者自己的记录，不能当来历：写它最初出自哪一掷、哪一条条文、正文哪一句' % name
            p = os.path.join(rec, '日志', m.group(1) + '.md') if m else conf_file(name, rec, root)
            if not p or not os.path.isfile(p):
                return False, '认不出来历"%s"：找不到这份文件' % label
            hay, where = read(p), os.path.basename(p)
    ok = found(hay, quote)
    if ok is None:
        return False, '抄的原句不到 %d 个字' % MINQ
    return (True, '') if ok else (False, '%s里没有这一句' % where if not where.startswith('第') else where)


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        print(__doc__)
        sys.exit(1)
    src = os.path.abspath(sys.argv[1])
    rec = os.path.dirname(src)
    root = os.path.abspath(sys.argv[2]) if len(sys.argv) == 3 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cont = read(src)
    got = pick(cont, WANT)
    missing = [w for w in WANT if w not in got]
    if missing:
        print('missing: ' + ' '.join(missing))
        sys.exit(1)
    parts = ['## %s\n%s\n' % (w, '\n'.join(got[w]).strip('\n')) for w in WANT]
    report = []

    op = os.path.join(rec, '大纲.md')
    if os.path.isfile(op) and read(op).strip():
        state = pick(cont, ['物态']).get('物态')
        parts.append('## 物态\n%s\n' % ('\n'.join(state).strip('\n') if state else '（续接记录里没有这一栏）'))

        rolls = load_rolls(rec)
        if rolls is None:
            parts.append('## 掷\n（找不到 投掷记录/rolls.jsonl）\n')
            report.append('[掷] 找不到 投掷记录/rolls.jsonl：先把它取过来再跑')
        else:
            since, why = last_delivery(rec)
            new = [r for r in rolls if since is None or (roll_time(r) or 0) > since]
            if why:
                report.append('[掷] %s：投掷记录里的 %d 掷都算作上一条交付以后掷过的' % (why, len(rolls)))
            parts.append('## 掷\n%s\n' % ('\n'.join('- ' + roll_line(r) for r in new) if new else '（上一条交付以后没有掷过）'))
            last = rolls[-1] if rolls else None
            report.append('[掷] 上一条交付以后掷过 %d 掷；投掷记录最后一掷是 %s' % (
                len(new), '#%s（%s）' % (last.get('id'), (last.get('time') or '')[:16].replace('T', ' ') + ' UTC') if last else '（空）'))

        o = outline(read(op))
        if o['真相']:
            parts.append('## 真相\n%s\n' % '\n'.join(o['真相']))
        if o['留下的东西']:
            parts.append('## 留下的东西\n%s\n' % '\n'.join(o['留下的东西']))
        items = [l for l in o['留下的东西'] if BULLET.match(l)]
        bad = 0
        for l in items:
            srcs = SRC.findall(l)
            short = SRC.sub('', BULLET.sub('', l)).strip()[:30]
            if not srcs:
                bad += 1
                report.append('没有来历｜%s……' % short)
                continue
            fails = [(lab, q, msg) for lab, q in srcs for ok, msg in [check(lab, q, rec, root, rolls)] if not ok]
            if fails:
                bad += 1
                for lab, q, msg in fails:
                    report.append('对不上｜%s……｜〔%s：%s〕｜%s' % (short, lab.strip(), q.strip()[:40], msg))
        if o['真相'] or o['留下的东西']:
            report.insert(0, '[留下的东西] %d 条：来历对上 %d 条，对不上或没有来历 %d 条' % (len(items), len(items) - bad, bad))

    out = os.path.join(rec, '核对素材.md')
    with open(out, 'w', encoding='utf-8', newline='') as f:
        f.write('\n'.join(parts) + '\n')
    print('ok')
    for line in report:
        print(line)
