// 从仓库里的配置文件生成网站使用的数据（洋馆房间、十五组身份、价目铜牌与牌外价目、机制广播）。
// 用法：node tools/build-data.mjs
// 输出：assets/data/world.js（以 window.WORLD 的形式提供，双击 index.html 即可读取）
// 配置版本：v4.71（章节编号写作「## 5.」「### 5.1」「## 7.」）。哪一处找不到，脚本直接报错，不产出残缺数据。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = f => readFileSync(join(ROOT, f), 'utf8')
const must = (v, what) => { if (v === undefined || v === null || v === -1 || v === false) throw new Error('解析失败：' + what); return v }
// 取 md 里从 a 起、到 b 止的一段（b 从 a 之后找）
const slice = (md, a, b, what) => {
  const i = must(md.indexOf(a), what + '：找不到「' + a + '」')
  const j = b ? must(md.indexOf(b, i + a.length), what + '：找不到「' + b + '」') : md.length
  return md.slice(i, j)
}
const num = s => Number(String(s).replace(/,/g, ''))

// 门的写法（1.3 表与 1.2 条目共用）：「东门 y=1.3，宽1.2，通西浴场廊」「主楼梯厅敞口」「甲更衣室门」
function parseDoor(d) {
  const pos = d.match(/([xy])=([\d.]+)/)
  const w = d.match(/宽([\d.]+)/)
  const to = d.match(/通(.+)$/)
  return {
    raw: d,
    open: d.includes('敞口'),
    axis: pos ? pos[1] : null,
    at: pos ? Number(pos[2]) : null,
    width: w ? Number(w[1]) : null,
    dir: (d.match(/^(东|西|南|北)(门|口)/) || [])[1] || null,
    to: to ? to[1] : d.replace(/(门|敞口)$/, ''),
  }
}

// ---------- 洋馆：1.3 房间表 + 1.2 楼梯厅与北前室 ----------
function parseRooms() {
  const md = read('洋馆物理层.md')
  const sec = slice(md, '### 1.3 各层房间', '\n## 2.', '物理层 1.3')
  const rooms = []
  let floor = null
  for (const line of sec.split('\n')) {
    const h = line.match(/^#### (B1|1F|2F|3F)/)
    if (h) { floor = h[1]; continue }
    if (!floor || !line.startsWith('|') || line.startsWith('|---') || line.includes('净内坐标')) continue
    // v4.71 的表只有四列：空间｜净内坐标｜面积（「67.24 ㎡」）｜门与相通；「所属」一列已删，下面按包含关系推出
    const [name, coord, size, doors] = line.split('|').slice(1, -1).map(s => s.trim())
    const m = coord.match(/([\d.]+)—([\d.]+)；([\d.]+)—([\d.]+)/)
    if (!m) continue
    const [x0, x1, y0, y1] = m.slice(1).map(Number)
    const area = Number(must((size.match(/([\d.]+) ㎡/) || [])[1], name + ' 的面积'))
    rooms.push({ floor, name, x0, x1, y0, y1, area, doors: doors.split('；').map(parseDoor), parent: null })
  }
  must(rooms.length > 0, '物理层 1.3 一间房也没读到')

  // 所属：坐标完全落在同层另一间之内的，就是那一间的小室（衣帽间、公共盥洗室 → 迎宾前厅；
  // 食品储藏间、洗消间 → 厨房套区；园艺间 → 珍稀花园）
  for (const r of rooms) {
    const o = rooms.find(q => q !== r && q.floor === r.floor && q.x0 <= r.x0 && q.x1 >= r.x1 && q.y0 <= r.y0 && q.y1 >= r.y1)
    if (o) r.parent = o.name
  }

  // 楼梯厅与北前室：v4.71 移出了 1.3，改在 1.2 末尾用条目写，四层同位。按条目展开成每层五间，
  // 插回各层表里走廊之后（与旧版 world.js 的顺序一致）
  const stairs = parseStairs(md, rooms)
  const out = []
  for (const f of ['B1', '1F', '2F', '3F']) {
    const fr = rooms.filter(r => r.floor === f)
    let k = 0
    while (k < fr.length && /廊$/.test(fr[k].name)) k++
    out.push(...fr.slice(0, k), ...stairs.filter(r => r.floor === f), ...fr.slice(k))
  }
  return out
}

function parseStairs(md, rooms) {
  const sec = slice(md, '### 1.2 楼梯与廊厅', '### 1.3', '物理层 1.2')
  // 楼梯表：「| 主楼梯厅 | x=17.4—23.8；y=0—8.2 | 1.8 m |」
  const box = {}
  for (const line of sec.split('\n')) {
    const m = line.match(/^\| (\S+楼梯厅) \| x=([\d.]+)—([\d.]+)；y=([\d.]+)—([\d.]+) \|/)
    if (m) box[m[1]] = m.slice(2).map(Number)
  }
  // 条目：「- **西北楼梯厅、东北楼梯厅：** 各 37.12 ㎡。……」
  const items = []
  for (const line of sec.split('\n')) {
    const m = line.match(/^- \*\*(.+?)：\*\* ?(.+)$/)
    if (m) items.push({ names: m[1].split('、'), text: m[2] })
  }
  const item = name => must(items.find(it => it.names.includes(name)), '物理层 1.2 条目「' + name + '」').text
  const area = t => Number(must((t.match(/([\d.]+) ㎡/) || [])[1], '1.2 条目面积'))
  const FLOORS = ['B1', '1F', '2F', '3F']
  // 「本层西廊」「本层东廊」：门洞外侧紧邻、跨过门位的那间走廊。side 是门开在本室的哪面墙：
  // 西墙（x=wallX）上的门通向 x1≈wallX−0.2 的房间，东墙上的门通向 x0≈wallX+0.2 的房间（墙厚 0.2）
  const beside = (f, side, wallX, at) => {
    const r = rooms.find(q => q.floor === f && Math.abs((side === '西' ? q.x1 : q.x0) - wallX) <= 0.45 && q.y0 <= at && q.y1 >= at)
    must(r && /廊$/.test(r.name), f + ' ' + side + '侧 y=' + at + ' 的走廊')
    return r.name
  }
  // 「另有：B1 泳池机房门；1F 2号套房门、自然史大厅门；……」→ { B1: ['泳池机房门'], 1F: [...] }
  const extra = t => {
    const m = must(t.match(/另有：(.+?)。?$/), '1.2 前室「另有」')
    const o = {}
    for (const part of m[1].split('；')) {
      const p = part.trim().match(/^(B1|1F|2F|3F) (.+)$/)
      if (p) o[p[1]] = p[2].split('、')
    }
    return o
  }
  const out = []

  // 主楼梯厅：西口通本层西廊；东侧敞口接本层前厅（条目括号里逐层写明）
  const mainT = item('主楼梯厅')
  const mainBox = must(box['主楼梯厅'], '1.2 楼梯表：主楼梯厅')
  const westDoor = must(mainT.match(/(西口 y=([\d.]+)，宽[\d.]+)，通本层西廊/), '1.2 主楼梯厅西口')
  const fronts = {}
  for (const [, f, n] of must(mainT.match(/前厅（(.+?)）/), '1.2 主楼梯厅前厅')[1].matchAll(/(B1|1F|2F|3F) ([^，）]+)/g)) fronts[f] = n
  // 北楼梯厅：「南口分别在 x=11.3、x=40.7，宽1.8，通西北前室、东北前室」
  const northT = item('西北楼梯厅')
  const nm = must(northT.match(/南口分别在 x=([\d.]+)、x=([\d.]+)，(宽[\d.]+)，通(\S+?)、(\S+?)。/), '1.2 北楼梯厅南口')
  // 前室
  const ante = name => {
    const t = item(name)
    const c = must(t.match(/x=([\d.]+)—([\d.]+)，y=([\d.]+)—([\d.]+)/), '1.2 ' + name + ' 坐标').slice(1).map(Number)
    const stair = must(t.match(/北接(\S+?)敞口/), '1.2 ' + name + ' 北接')[1]
    const d = must(t.match(/([东西])口 y=([\d.]+)，(宽[\d.]+)，通本层/), '1.2 ' + name + ' 侧口')
    return { t, c, stair, side: d[1], at: Number(d[2]), w: d[3], extra: extra(t) }
  }
  const NW = ante('西北前室'), NE = ante('东北前室')

  for (const f of FLOORS) {
    const [x0, x1, y0, y1] = mainBox
    out.push({
      floor: f, name: '主楼梯厅', x0, x1, y0, y1, area: area(mainT),
      doors: [westDoor[1] + '，通' + beside(f, '西', x0, Number(westDoor[2])), must(fronts[f], '1.2 ' + f + ' 前厅') + '敞口'].map(parseDoor),
      parent: null,
    })
    for (const [name, x, to] of [['西北楼梯厅', nm[1], nm[4]], ['东北楼梯厅', nm[2], nm[5]]]) {
      const [a0, a1, b0, b1] = must(box[name], '1.2 楼梯表：' + name)
      out.push({ floor: f, name, x0: a0, x1: a1, y0: b0, y1: b1, area: area(northT), doors: [parseDoor('南口 x=' + x + '，' + nm[3] + '，通' + to)], parent: null })
    }
    for (const [name, A] of [['西北前室', NW], ['东北前室', NE]]) {
      const [a0, a1, b0, b1] = A.c
      // 东口开在东墙（x1），西口开在西墙（x0）；门外紧邻的走廊在另一侧
      const wall = A.side === '东' ? a1 : a0
      const hall = beside(f, A.side, wall, A.at)
      out.push({
        floor: f, name, x0: a0, x1: a1, y0: b0, y1: b1, area: area(A.t),
        doors: [A.stair + '敞口', A.side + '口 y=' + A.at + '，' + A.w + '，通' + hall, ...(A.extra[f] || [])].map(parseDoor),
        parent: null,
      })
    }
  }
  return out
}

// ---------- 主持人游戏：第 5 节十五组身份 ----------
function parseIdentities() {
  const md = read('主持人游戏.md')
  const sec = slice(md, '## 5. 十五组身份', '\n## 6. ', '主持人游戏 5')
  const blocks = sec.split(/\n### /).slice(1)
  const quote = text => text.split('\n')
    .filter(l => l.startsWith('>'))
    .map(l => l.replace(/^>\s?/, ''))
    .join('\n').trim()
  return blocks.map(b => {
    const title = b.split('\n')[0]
    // 「5.1 法官／典狱长」
    const [, no, names] = must(title.match(/^5\.(\d+) (.+)$/), '身份标题「' + title + '」')
    const [front, back] = names.split('／')
    const pick = (label, next) => {
      const i = b.indexOf(`**${label}**`)
      if (i < 0) return ''
      const j = next ? b.indexOf(`**${next}**`, i) : -1
      return b.slice(i + label.length + 4, j < 0 ? undefined : j)
    }
    const notes = pick('主持人要点', '正面').trim()
    const frontText = quote(pick('正面', '背面'))
    const backText = quote(pick('背面', null))
    const strip = (t, n) => t.split('\n').filter((l, k) => !(k === 0 && l.trim() === n)).join('\n').trim()
    const fText = strip(frontText, front)
    const bText = back ? strip(backText, back) : ''
    // 丘比特与圣女没有逆位身份，卡背与正面同文；贞德是圣女发动接任后的状态
    const noReverse = !bText
    return {
      no: Number(no),
      front,
      back: noReverse ? null : back,
      state: noReverse && back ? back : null,
      noReverse,
      frontText: fText,
      backText: noReverse ? fText : bText,
      notes,
    }
  })
}

// ---------- 价目表 ----------
// 章名：原文是「1. 食物」；铜牌上沿用「一、食物」的写法（中文刻字的习惯，plaque.js 也按「离场」二字认出第六节）
const CN = '〇一二三四五六七八九十'
const cnTitle = t => t.replace(/^(\d{1,2})\. /, (_, n) => (n <= 10 ? CN[n] : '十' + CN[n - 10]) + '、')

// 表格行 → { item, points }；表头与分隔行跳过
function tableItems(sec) {
  const items = []
  for (const line of sec.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || line.includes('| 物品 |') || line.includes('| 等级 |')) continue
    const cells = line.split('|').slice(1, -1).map(s => s.trim())
    items.push(cells)
  }
  return items
}

// 刻在铜牌上的部分：「兑换方式」与第 1–6 节（第 7 节起不在铜牌上，绝不能混进来）
function parsePrices() {
  const md = read('价目表.md')
  const sec = slice(md, '## 兑换方式', '\n## 7. ', '价目表 兑换方式–6')
  const chapters = []
  let cur = null
  const how = []
  for (const line of sec.split('\n')) {
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    if (h2) {
      if (h2[1] === '兑换方式') { cur = null; continue }
      cur = { title: cnTitle(h2[1]), items: [] }
      chapters.push(cur)
      continue
    }
    if (h3 && cur) { cur.items.push({ sub: h3[1] }); continue }
    if (!cur) { if (line.trim() && !line.startsWith('---')) how.push(line.trim()); continue }
    if (line.startsWith('|') && !line.startsWith('|---') && !line.includes('| 物品 |')) {
      const [item, pts] = line.split('|').slice(1, -1).map(s => s.trim())
      cur.items.push({ item, points: must(num(pts), item + ' 的分值') })
    }
  }
  must(chapters.length === 6 && /离场/.test(chapters[5].title), '铜牌应正好六节、第六节是离场')
  return { how, chapters, offPlaque: parseOffPlaque(md), void: parseVoid(md) }
}

// 第 10 节「牌外价目」：不刻在铜牌上，人物不知道；有人问到或要买，才照这里报价（价目表 8.2「人物知道的价」）。
// 结构：{ note, chapters: [{ no: '10.1', title: '食物', items: [{ item, points }] }, …,
//          { no: '10.7', title: '火器', note: '每升一级……乘 2。', tiers: [{ level: '一级', item: '手枪、左轮', points, round }], items: [{ 消音器 }] }] }
// tiers[].points 是一把的价，round 是弹药一发的价。
function parseOffPlaque(md) {
  const sec = slice(md, '## 10. 牌外价目', null, '价目表 10')
  const note = must(sec.split('\n').find(l => l.trim() && !l.startsWith('#')), '价目表 10 的说明').trim()
  const chapters = sec.split(/\n### /).slice(1).map(b => {
    const [, no, title] = must(b.split('\n')[0].match(/^(10\.\d+) (.+)$/), '价目表 10 的小节标题')
    const ch = { no, title, items: [] }
    const rows = tableItems(b)
    if (b.includes('| 等级 |')) {
      // 火器：| 等级 | 火器，可指定款式 | 一把 | 弹药一发 |
      ch.note = must(b.split('\n').slice(1).find(l => l.trim() && !l.startsWith('|')), '火器的说明').trim()
      ch.tiers = rows.map(([level, item, gun, round]) => ({ level, item, points: num(gun), round: num(round) }))
      // 表后另起一行：「消音器一只，装在一级、二级火器上：5,000。」
      for (const l of b.split('\n')) {
        const m = l.match(/^([^|].+)：([\d,]+)。$/)
        if (m) ch.items.push({ item: m[1], points: num(m[2]) })
      }
    } else {
      ch.items = rows.map(([item, pts]) => ({ item, points: must(num(pts), item + ' 的分值') }))
    }
    return ch
  })
  must(chapters.length >= 7, '价目表 10 应有 10.1–10.7')
  return { note, chapters }
}

// 价目表 8.2「不成立的兑换」及其他会让一次兑换不成立的条件（原文摘句），供本局钱袋的结算函数照办。
// { text: 8.2 那一段原文,
//   kinds: [{ key, text }]  —— 原文「比如……」列举的六类，逐条拆开；key 由关键词给出：
//            power 买回被封的本事 / super 买带超常本事的东西 / ask 打听受命者、身份、来历 /
//            kill 请主持人代杀 / bypass 绕过门锁墙出口或联络馆外 / outsider 买馆外的人进来
//   result: 「不收金币，不停笔，他只得知不成立。」
//   other: [{ key, text }] —— 另外三处会「不成立」的条件，text 是整段原文：
//            round 总价不是整百、又不添东西凑满（8.2「按整枚结算」）/ purse 身上的金币不够（8.2「只能用他身上带着的金币付」）/
//            repair 修复身体残疾：请求的是治伤，或对象没有卡上写明的残疾（第 9 节「不修什么」） }
function parseVoid(md) {
  const para = (label, what) => {
    const i = must(md.indexOf(label), what)
    const s = md.slice(i + label.length)
    return s.slice(0, s.indexOf('\n')).trim()
  }
  const text = para('**不成立的兑换。**', '价目表 8.2 不成立的兑换')
  const list = must(text.match(/比如(.+?)。/), '不成立的兑换：比如……')[1].split('，')
  const KEY = [[/被封/, 'power'], [/超常/, 'super'], [/打听/, 'ask'], [/杀/, 'kill'], [/绕过|联络/, 'bypass'], [/馆外的人/, 'outsider']]
  const kinds = list.map(t => ({ key: (KEY.find(([re]) => re.test(t)) || [, null])[1], text: t }))
  must(kinds.every(k => k.key), '不成立的兑换：有一类没认出来（' + list.join('／') + '）')
  const result = must(text.match(/(不收金币[^]*?不成立。)$/), '不成立的兑换：结果')[1]
  // 整段原文；段里必须真有「不成立」，否则说明条文改了，要回来看
  const other = [
    ['round', '**按整枚结算。**', '价目表 8.2 按整枚结算'],
    ['purse', '**只能用他身上带着的金币付。**', '价目表 8.2 只能用身上的金币'],
    ['repair', '- **不修什么。**', '价目表 9 修复身体残疾·不修什么'],
  ].map(([key, label, what]) => {
    const t = para(label, what)
    must(t.includes('不成立'), what + '：段里没有「不成立」')
    return { key, text: t }
  })
  return { text, kinds, result, other }
}

// ---------- 主持人游戏：第 7 节机制广播的固定句式 ----------
function parseBroadcasts() {
  const md = read('主持人游戏.md')
  const sec = slice(md, '## 7. ', '\n## 8. ', '主持人游戏 7')
  const fixed = []
  const abilities = []
  let table = 0
  let lastClass = ''
  for (const line of sec.split('\n')) {
    if (line.startsWith('| 时点')) { table = 1; continue }
    if (line.startsWith('| 归类')) { table = 2; continue }
    if (!line.startsWith('|') || line.startsWith('|---')) continue
    const cells = line.split('|').slice(1, -1).map(x => x.trim())
    if (table === 1) fixed.push({ when: cells[0], text: cells[1] })
    if (table === 2) {
      if (cells[0]) lastClass = cells[0]
      abilities.push({ kind: lastClass, ability: cells[1], text: cells[2] })
    }
  }
  return { fixed, abilities }
}

const world = {
  generatedFrom: ['洋馆物理层.md §1.2 §1.3', '主持人游戏.md §5 §7', '价目表.md 兑换方式–§6（铜牌）、§8.2 §9（不成立）、§10（牌外价目）'],
  floors: [
    { id: 'B1', level: -4.8, height: 4.8 },
    { id: '1F', level: 0, height: 8.4 },
    { id: '2F', level: 8.4, height: 6.0 },
    { id: '3F', level: 14.4, height: 5.2 },
  ],
  rooms: parseRooms(),
  identities: parseIdentities(),
  prices: parsePrices(),
  broadcasts: parseBroadcasts(),
}
must(world.identities.length === 15, '身份应有 15 组')

const out = '/* 由 tools/build-data.mjs 从配置文件生成，请勿手改 */\nwindow.WORLD = ' + JSON.stringify(world, null, 1) + ';\n'
writeFileSync(join(ROOT, 'assets/data/world.js'), out)
const P = world.prices
console.log(`rooms ${world.rooms.length}, identities ${world.identities.length}, price chapters ${P.chapters.length} (${P.chapters.reduce((a, c) => a + c.items.length, 0)} items), off-plaque ${P.offPlaque.chapters.length} (${P.offPlaque.chapters.reduce((a, c) => a + c.items.length + (c.tiers || []).length, 0)} items), void ${P.void.kinds.length}+${P.void.other.length}, broadcasts ${world.broadcasts.fixed.length}+${world.broadcasts.abilities.length}`)
