// 从仓库里的配置文件生成网站使用的数据（洋馆房间、十五组身份、价目铜牌）。
// 用法：node tools/build-data.mjs
// 输出：assets/data/world.js（以 window.WORLD 的形式提供，双击 index.html 即可读取）
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = f => readFileSync(join(ROOT, f), 'utf8')

// ---------- 洋馆：第 1.3 节房间表 ----------
function parseRooms() {
  const md = read('洋馆物理层.md')
  const start = md.indexOf('### 1.3 各层房间')
  const end = md.indexOf('## 2.', start)
  const sec = md.slice(start, end)
  const rooms = []
  let floor = null
  for (const line of sec.split('\n')) {
    const h = line.match(/^#### (B1|1F|2F|3F)/)
    if (h) { floor = h[1]; continue }
    if (!floor || !line.startsWith('|') || line.startsWith('|---') || line.includes('净内坐标')) continue
    const cells = line.split('|').slice(1, -1).map(s => s.trim())
    const [name, coord, size, doors, parent] = cells
    const m = coord.match(/([\d.]+)—([\d.]+)；([\d.]+)—([\d.]+)/)
    if (!m) continue
    const [x0, x1, y0, y1] = m.slice(1).map(Number)
    const area = Number((size.match(/\/ ([\d.]+) ㎡/) || [])[1] || 0)
    const doorList = doors.split('；').map(d => {
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
    })
    rooms.push({ floor, name, x0, x1, y0, y1, area, doors: doorList, parent: parent === '—' ? null : parent })
  }
  return rooms
}

// ---------- 主持人游戏：第五节十五组身份 ----------
function parseIdentities() {
  const md = read('主持人游戏.md')
  const start = md.indexOf('## 五、十五组身份')
  const end = md.indexOf('## 六、', start)
  const sec = md.slice(start, end)
  const blocks = sec.split(/\n### /).slice(1)
  const quote = text => text.split('\n')
    .filter(l => l.startsWith('>'))
    .map(l => l.replace(/^>\s?/, ''))
    .join('\n').trim()
  return blocks.map(b => {
    const title = b.split('\n')[0]
    const [, no, names] = title.match(/^(\d+)．(.+)$/)
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

// ---------- 价目表：刻在铜牌上的部分 ----------
function parsePrices() {
  const md = read('价目表.md')
  const start = md.indexOf('## 兑换方式')
  const end = md.indexOf('## 七、')
  const sec = md.slice(start, end)
  const chapters = []
  let cur = null
  let how = []
  for (const line of sec.split('\n')) {
    const h2 = line.match(/^## (.+)/)
    const h3 = line.match(/^### (.+)/)
    if (h2) {
      if (h2[1] === '兑换方式') { cur = null; continue }
      cur = { title: h2[1], items: [] }
      chapters.push(cur)
      continue
    }
    if (h3 && cur) { cur.items.push({ sub: h3[1] }); continue }
    if (!cur) { if (line.trim() && !line.startsWith('---')) how.push(line.trim()); continue }
    if (line.startsWith('|') && !line.startsWith('|---') && !line.includes('| 物品 |')) {
      const [item, pts] = line.split('|').slice(1, -1).map(s => s.trim())
      cur.items.push({ item, points: Number(pts.replace(/,/g, '')) })
    }
  }
  return { how, chapters }
}

// ---------- 主持人游戏：第七节机制广播的固定句式 ----------
function parseBroadcasts() {
  const md = read('主持人游戏.md')
  const start = md.indexOf('## 七、')
  const end = md.indexOf('## 八、', start)
  const sec = md.slice(start, end)
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
  generatedFrom: ['洋馆物理层.md §1.3', '主持人游戏.md §5', '价目表.md 兑换方式–§6'],
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

const out = '/* 由 tools/build-data.mjs 从配置文件生成，请勿手改 */\nwindow.WORLD = ' + JSON.stringify(world, null, 1) + ';\n'
writeFileSync(join(ROOT, 'assets/data/world.js'), out)
console.log(`rooms ${world.rooms.length}, identities ${world.identities.length}, price chapters ${world.prices.chapters.length}, broadcasts ${world.broadcasts.fixed.length}+${world.broadcasts.abilities.length}`)
