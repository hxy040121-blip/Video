# -*- coding: utf-8 -*-
"""空气扑克：替楼上的搭档拼牌、比牌（小游戏/空气扑克.md）。

拼牌：python3 空气扑克.py 47
      python3 空气扑克.py 47 SA,HK,D3
      给一个数，和前几轮两边亮出过的牌（逗号隔开，没有就不写），
      回报剩下的牌里点数和正好是这个数的最强一手，和它的全部拼法。

比牌：python3 空气扑克.py S10,SJ,SQ,SK,SA H8,D8,C8,S8,H4
      给两手牌，回报各自的点数和、牌型，谁大，有没有撞同一张牌（天灾）。

牌的写法：花色字母加点数。S 黑桃，H 红心，D 方块，C 梅花；点数 A 2 3 4 5 6 7 8 9 10 J Q K。
点数和：A 算 1，J、Q、K 算 11、12、13。比大小照普通扑克：A 最大，A-2-3-4-5 也算顺子（5 最大）。
"""
import sys

SUITS = 'SHDC'
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
NAMES = ['散牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺']


def parse(tok):
    t = tok.strip().upper()
    if len(t) < 2 or t[0] not in SUITS or t[1:] not in RANKS:
        raise ValueError('看不懂这张牌：%s' % tok)
    return (RANKS.index(t[1:]) + 1, t[0])          # (点数 1..13, 花色)


def show(card):
    return card[1] + RANKS[card[0] - 1]


def parse_list(text):
    cards = [parse(x) for x in text.replace('，', ',').split(',') if x.strip()]
    if len(set(cards)) != len(cards):
        raise ValueError('同一张牌写了两次：%s' % text)
    return cards


def rank(hand):
    """回报 (牌型 0..8, 比大小用的点)。A 当 14；A-2-3-4-5 的顺子最大点是 5。"""
    vals = sorted((14 if p == 1 else p for p, _ in hand), reverse=True)
    counts = {}
    for v in vals:
        counts[v] = counts.get(v, 0) + 1
    groups = sorted(counts.items(), key=lambda kv: (kv[1], kv[0]), reverse=True)
    order = tuple(v for v, _ in groups)
    shape = tuple(c for _, c in groups)
    flush = len(set(s for _, s in hand)) == 1
    straight, top = False, 0
    if len(counts) == 5:
        if vals[0] - vals[4] == 4:
            straight, top = True, vals[0]
        elif vals == [14, 5, 4, 3, 2]:
            straight, top = True, 5
    if straight and flush:
        return (8, (top,))
    if shape == (4, 1):
        return (7, order)
    if shape == (3, 2):
        return (6, order)
    if flush:
        return (5, tuple(vals))
    if straight:
        return (4, (top,))
    if shape == (3, 1, 1):
        return (3, order)
    if shape == (2, 2, 1):
        return (2, order)
    if shape == (2, 1, 1, 1):
        return (1, order)
    return (0, tuple(vals))


def label(key):
    if key == (8, (14,)):
        return '同花顺（10 到 A）'
    return NAMES[key[0]]


def best(total, used):
    deck = sorted((p, s) for p in range(1, 14) for s in SUITS if (p, s) not in used)
    n = len(deck)
    top_key, hands = None, []

    def walk(start, left, need, picked):
        nonlocal top_key, hands
        if left == 0:
            if need == 0:
                key = rank(picked)
                if top_key is None or key > top_key:
                    top_key, hands = key, [list(picked)]
                elif key == top_key:
                    hands.append(list(picked))
            return
        for i in range(start, n - left + 1):
            p = deck[i][0]
            if p * left > need:                       # 后面的牌只会更大
                break
            if p + 13 * (left - 1) < need:            # 这张太小，凑不够
                continue
            picked.append(deck[i])
            walk(i + 1, left - 1, need - p, picked)
            picked.pop()

    walk(0, 5, total, [])
    return top_key, hands, n


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if not argv or len(argv) > 2:
        print(__doc__)
        return 1
    try:
        if argv[0].strip().isdigit():
            total = int(argv[0])
            used = set(parse_list(argv[1])) if len(argv) == 2 else set()
            key, hands, n = best(total, used)
            print('数字 %d；用过 %d 张，剩 %d 张' % (total, len(used), n))
            if key is None:
                print('剩下的牌凑不出这个数：失误')
                return 0
            print('最强一手：%s' % label(key))
            print('拼法 %d 种：' % len(hands))
            for h in hands[:60]:
                print('  ' + ' '.join(show(c) for c in h))
            if len(hands) > 60:
                print('  ……其余 %d 种只是花色不同，牌点一样' % (len(hands) - 60))
            return 0
        if len(argv) != 2:
            print(__doc__)
            return 1
        a, b = parse_list(argv[0]), parse_list(argv[1])
        if len(a) != 5 or len(b) != 5:
            raise ValueError('每手必须正好五张')
        ka, kb = rank(a), rank(b)
        for name, h, k in (('第一手', a, ka), ('第二手', b, kb)):
            print('%s：%s｜点数和 %d｜%s' % (name, ' '.join(show(c) for c in h), sum(p for p, _ in h), label(k)))
        same = [show(c) for c in a if c in b]
        print('撞牌：%s' % ('无' if not same else ' '.join(same) + '（天灾）'))
        print('结果：%s' % ('第一手大' if ka > kb else '第二手大' if kb > ka else '一样大，平分'))
        return 0
    except ValueError as e:
        print('出错：%s' % e)
        return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
