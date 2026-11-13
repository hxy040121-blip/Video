// 从仓库里的配置文件生成网站使用的数据：洋馆（房间、廊、楼梯、电梯、议事厅、院子、窗、钟、屋外与透明的墙）、
// 十三组身份、价目铜牌与牌外价目、机制广播、开局的八条播报与规则卡。
// 用法：node tools/build-data.mjs
// 输出：assets/data/world.js（以 window.WORLD 的形式提供，双击 index.html 即可读取）。顶层键：
//   version generatedFrom outline floors rooms hall courts foyer circulation outside light windows skylights clocks timed weather
//   identities identityNote prices coins broadcasts opening ruleCard openingTask
//   坐标是物理层 1.1 的定位轴线：原点在西南角，x 向东、y 向北，米；相邻两处共用同一个坐标值（墙以轴线居中，外墙在轴线外）。
//   rooms：房间表 58 行 + 1.2 的廊段、后楼梯、电梯、楼梯平台、穹顶回廊、上空，每层正好铺满外形；kind 区分它们。
//   每道门两边都有坐标：写全的一边门朝那一间开，另一边是 ref（坐标照抄，dir 换成本室这一侧的墙，owner 指写全的那一间）。
// 配置版本：v7.11（洋馆物理层的房间表是五列「空间｜坐标 x；y｜面积｜净尺寸｜门与相通」，廊与楼梯写在 1.2 的条目里；
// 主持人游戏第 5 节「十三组身份」，小节标签「结算要点」）。哪一处找不到、对不上，脚本直接报错，不产出残缺数据。
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = f => readFileSync(join(ROOT, f), 'utf8')
const must = (v, what) => { if (v === undefined || v === null || v === -1 || v === false || v === '' || Number.isNaN(v)) throw new Error('解析失败：' + what); return v }
// 取 md 里从 a 起、到 b 止的一段（b 从 a 之后找）
const slice = (md, a, b, what) => {
  const i = must(md.indexOf(a), what + '：找不到「' + a + '」')
  const j = b ? must(md.indexOf(b, i + a.length), what + '：找不到「' + b + '」') : md.length
  return md.slice(i, j)
}
const num = s => Number(String(s).replace(/,/g, '').replace('−', '-'))
const R = '([\\d.]+)—([\\d.]+)'
// 在 t 里按正则取一组数；取不到就报错
const nums = (re, t, what) => must(t.match(re), what).slice(1).map(Number)
const near = (a, b, e = 0.011) => Math.abs(a - b) <= e
const r2 = v => Math.round(v * 100) / 100
const FIDS = ['B1', '1F', '2F', '3F']
const OPP = { 东: '西', 西: '东', 南: '北', 北: '南' }
const CNN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
const cnNum = s => {
  // 「十三」「十九」「五」「二十」……（只到九十九）
  const m = must(String(s).match(/^([一二两三四五六七八九])?(十)?([一二三四五六七八九])?$/), '中文数字「' + s + '」')
  if (!m[2]) return must(CNN[m[1]], '中文数字「' + s + '」')
  return (m[1] ? CNN[m[1]] : 1) * 10 + (m[3] ? CNN[m[3]] : 0)
}
const quoteLines = text => text.split('\n').filter(l => l.startsWith('>')).map(l => l.replace(/^>\s?/, ''))
// 引用块 → 段落数组（空的 > 行分段）
const paras = text => {
  const out = []
  let cur = []
  for (const l of quoteLines(text)) {
    if (l.trim() === '') { if (cur.length) out.push(cur.join('')); cur = [] } else cur.push(l.trim())
  }
  if (cur.length) out.push(cur.join(''))
  return out
}
const hhmm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m }

// =====================================================================
// 洋馆物理层
// =====================================================================
const PHYS = read('洋馆物理层.md')
const S11 = slice(PHYS, '### 1.1 方位、面积与标高', '\n### 1.2', '物理层 1.1')
const S12 = slice(PHYS, '### 1.2 楼梯、电梯与廊', '\n### 1.3', '物理层 1.2')
const S13 = slice(PHYS, '### 1.3 各层房间', '\n### 1.4', '物理层 1.3')
const S14 = slice(PHYS, '### 1.4 屋外与透明的墙', '\n## 2.', '物理层 1.4')

// ---------- 1.1 外形、墙、楼层、议事厅、两院、门厅 ----------
function parseBuilding() {
  const [ox0, ox1, oy0, oy1] = nums(new RegExp('全馆外形 x=' + R + '、y=' + R), S11, '1.1 全馆外形')
  const [intWall] = nums(/内墙厚 ([\d.]+) m/, S11, '1.1 内墙厚')
  const [glassWall] = nums(/院子的玻璃隔断厚 ([\d.]+) m/, S11, '1.1 玻璃隔断厚')
  const [extWall] = nums(/外墙厚 ([\d.]+) m，全在轴线外侧/, S11, '1.1 外墙厚')
  const [lining, suiteNet] = nums(/从轴线向内占 ([\d.]+) m，十三间都净 ([\d.]+) m 见方/, S11, '1.1 套房内衬')
  const [roof] = nums(/屋面在 ([\d.]+) m/, S11, '1.1 屋面')
  const floors = []
  for (const m of S11.matchAll(/^\| (B1|1F|2F|3F) \| ([−\-\d.]+) m \| ([\d.]+) m \| ([\d.]+) m \| (.+?) \|$/gm)) {
    const s = m[5].match(/^(\d+)—(\d+)号$/)
    const suites = []
    if (s) for (let n = +s[1]; n <= +s[2]; n++) suites.push(n)
    else must(m[5] === '—', '1.1 楼层表 ' + m[1] + ' 的套房一栏')
    floors.push({ id: m[1], level: num(m[2]), height: +m[3], clear: +m[4], suites })
  }
  must(floors.length === 4 && floors.map(f => f.id).join() === FIDS.join(), '1.1 楼层表应是 B1、1F、2F、3F 四行')
  // 议事厅
  const [cx, cy, d, wall, rOuter] = nums(/圆心（([\d.]+)，([\d.]+)），内径 ([\d.]+) m，鼓座墙厚 ([\d.]+) m，外半径 ([\d.]+) m/, S11, '1.1 议事厅')
  must(near(d / 2 + wall, rOuter), '1.1 议事厅：内径的一半加墙厚应等于外半径')
  const [doorDepth] = nums(/三道门的门洞深 ([\d.]+) m/, S11, '1.1 议事厅门洞深')
  const [springAt, apex, oculus] = nums(/墙高 ([\d.]+) m 处起穹顶，顶高 ([\d.]+) m，正中天眼直径 ([\d.]+) m/, S11, '1.1 穹顶')
  const square = nums(new RegExp('外面方形（x=' + R + '，y=' + R + '）'), S11, '1.1 议事厅外面的方形')
  must(near((square[0] + square[1]) / 2, cx) && near((square[2] + square[3]) / 2, cy), '1.1 方形应以议事厅圆心为中心')
  // 两院
  const [cw, ch] = nums(/各 ([\d.]+) × ([\d.]+) m（x=/, S11, '1.1 两院尺寸')
  const [wx0, wx1, ex0, ex1, cy0, cy1] = nums(new RegExp('（x=' + R + ' 与 ' + R + '，y=' + R + '），一层地面，三层通高'), S11, '1.1 两院坐标')
  must(near(wx1 - wx0, cw) && near(cy1 - cy0, ch), '1.1 两院：尺寸与坐标对不上')
  const [cover] = nums(/内廊盖住靠议事厅的 ([\d.]+) m/, S11, '1.1 内廊盖住的宽')
  const [vw, vh] = nums(/院子上空只剩靠外的 ([\d.]+) × ([\d.]+) m/, S11, '1.1 院子上空')
  const [vwx0, vwx1, vex0, vex1] = nums(new RegExp('西院 x=' + R + '，东院 x=' + R + '）'), S11, '1.1 院子上空坐标')
  must(near(vwx1 - vwx0, vw) && near(vwx0, wx0) && near(wx1 - vwx1, cover) && near(vex1, ex1) && near(vex0 - ex0, cover) && near(vh, ch), '1.1 院子上空：坐标与尺寸对不上')
  const gardenName = must((S11.match(/西院(\S+?)、东院(\S+?)，/) || []).slice(1), '1.1 两院的名字')
  must(/门厅：\*\* 三层通高，顶上是透明玻璃天顶/.test(S11), '1.1 门厅三层通高')
  return {
    outline: { x0: ox0, x1: ox1, y0: oy0, y1: oy1, extWall, intWall, glassWall, suiteLining: lining, suiteNet, roof },
    floors,
    hall: { name: '穹顶议事厅', floor: '1F', cx, cy, r: d / 2, wall, rOuter, square, doorDepth, springAt, apex, oculus },
    courts: [
      { name: gardenName[0], side: '西', x0: wx0, x1: wx1, y0: cy0, y1: cy1, voidX0: vwx0, voidX1: vwx1 },
      { name: gardenName[1], side: '东', x0: ex0, x1: ex1, y0: cy0, y1: cy1, voidX0: vex0, voidX1: vex1 },
    ],
  }
}

// ---------- 1.3 房间表 ----------
// 门的写法（全部出自 1.3）：
//   「北门 x=19.2，宽1.2，通南廊西段」——写全的门：门朝这一行的房间开，「通X」是门外那一处（房间、1.2 的廊段，或屋外）
//   「更衣室门」「议事厅南门」——另一间那一行写全的门，这里只提一句（ref）；「议事厅」是穹顶议事厅
//   「这三道是玻璃门」——前面三道是院子的玻璃门
//   「南墙正门 x=34.8，宽3.6，通屋外（1.4）」
//   「西、东两边 y=8.4—12 敞接南廊」——门厅两侧没有墙也没有门，拆成两个敞口
const ALIAS = { 议事厅: '穹顶议事厅' }
function parseDoor(d) {
  const sp = d.match(/^([东西南北])、([东西南北])两边 ([xy])=([\d.]+)—([\d.]+) 敞接(.+)$/)
  if (sp) return { span: true, sides: [sp[1], sp[2]], axis: sp[3], a: +sp[4], b: +sp[5], to: sp[6] }
  const pos = d.match(/([xy])=([\d.]+)/), w = d.match(/宽([\d.]+)/), to = d.match(/通([^（(]+)/)
  if (pos) {
    return {
      raw: d, open: /敞口|敞接/.test(d), axis: pos[1], at: +pos[2], width: must(w ? +w[1] : null, '门「' + d + '」的宽'),
      dir: must((d.match(/^([东西南北])(?:墙正)?[门口]/) || [])[1], '门「' + d + '」开在哪面墙'),
      to: must(to ? to[1].trim() : null, '门「' + d + '」通哪里'), main: d.includes('正门'), glass: false,
    }
  }
  const m = must(d.match(/^(.+?)([东西南北])?门$/), '门的写法「' + d + '」')
  return { raw: d, ref: true, open: false, axis: null, at: null, width: null, dir: null, refDir: m[2] || null, to: ALIAS[m[1]] || m[1], glass: false }
}

function parseRoomTable(B) {
  const COLS = ['空间', '坐标', '面积', '净尺寸', '门与相通']
  const rooms = []
  let floor = null, ix = null
  for (const line of S13.split('\n')) {
    const h = line.match(/^#### (B1|1F|2F|3F)$/)
    if (h) { floor = h[1]; ix = null; continue }
    if (!floor || !line.startsWith('|') || line.startsWith('|---')) continue
    const cells = line.split('|').slice(1, -1).map(s => s.trim())
    if (cells[0] === '空间') { ix = COLS.map(k => must(cells.findIndex(c => c.startsWith(k)), floor + ' 表头「' + k + '」')); continue }
    must(ix, floor + ' 的表头')
    const [name, coord, size, net, doorStr] = ix.map(i => cells[i])
    const r = { floor, name, kind: /^\d+号套房$/.test(name) ? 'suite' : 'room' }
    const rect = coord.match(/^([\d.]+)—([\d.]+)；([\d.]+)—([\d.]+)$/), circ = coord.match(/^圆心 ([\d.]+)，([\d.]+)$/)
    if (rect) { [r.x0, r.x1, r.y0, r.y1] = rect.slice(1).map(Number); r.shape = 'rect' } else {
      must(circ, name + ' 的坐标「' + coord + '」')
      const H = B.hall
      must(name === H.name && near(+circ[1], H.cx) && near(+circ[2], H.cy), name + '：1.3 的圆心与 1.1 的议事厅对不上')
      const d = +must((net.match(/^内径 ([\d.]+)$/) || [])[1], name + ' 的内径')
      must(near(d / 2, H.r), name + '：1.3 的内径与 1.1 对不上')
      // 外框取 1.1 那块方形：三道门正好落在方形的南、西、东边上，与相邻房间共用轴线
      ;[r.x0, r.x1, r.y0, r.y1] = H.square
      Object.assign(r, { shape: 'circle', cx: H.cx, cy: H.cy, r: H.r, rOuter: H.rOuter })
    }
    r.area = Number(must((size.match(/^([\d.]+)/) || [])[1], name + ' 的面积'))
    r.areaNet = /净/.test(size)
    const nm = net.match(/^([\d.]+)×([\d.]+)$/)
    if (nm) { r.netW = +nm[1]; r.netH = +nm[2] } else must(r.shape === 'circle', name + ' 的净尺寸「' + net + '」')
    const sn = name.match(/^(\d+)号套房$/)
    if (sn) r.suite = +sn[1]
    r.doors = []
    for (const p of doorStr.split('；').map(s => s.trim()).filter(Boolean)) {
      const g = p.match(/^这(.)道是玻璃门$/)
      if (g) {
        const n = must(CNN[g[1]], '「' + p + '」')
        must(r.doors.length >= n, name + '：「' + p + '」前面不够' + n + '道门')
        r.doors.slice(-n).forEach(x => { must(!x.ref, name + '：玻璃门应是写全的门'); x.glass = true })
        continue
      }
      const d = parseDoor(p)
      if (d.span) {
        // 门厅：西边接南廊西段，东边接南廊东段（敞接，没有墙也没有门）
        for (const s of d.sides) {
          r.doors.push({ raw: p, open: true, axis: d.axis, at: r2((d.a + d.b) / 2), width: r2(d.b - d.a), dir: s, to: d.to + s + '段', main: false, glass: false })
        }
      } else r.doors.push(d)
    }
    r.parent = null
    rooms.push(r)
  }
  return rooms
}

// ---------- 1.2 廊、楼梯、电梯、楼梯平台、穹顶回廊、上空 ----------
function parseCirculation(B, rooms) {
  const g = (re, what) => nums(re, S12, '1.2 ' + what)
  // 后楼梯
  const [bw0, bw1, be0, be1, by0, by1] = g(new RegExp('梯间 x=' + R + ' 与 ' + R + '，y=' + R), '后楼梯梯间')
  const [bdW, bdY, bdXw, bdXe] = g(/每层一道宽 ([\d.]+) m 的双扇门，在梯间南墙正中（y=([\d.]+)，x=([\d.]+) 与 ([\d.]+)）/, '后楼梯门')
  must(near(bdY, by0) && near(bdXw, (bw0 + bw1) / 2) && near(bdXe, (be0 + be1) / 2), '1.2 后楼梯门应在梯间南墙正中')
  must(/西北、东北两座后楼梯/.test(S12), '1.2 后楼梯的名字')
  const backNames = ['西北后楼梯', '东北后楼梯']
  const [bsw, br0, br1, br2, br3] = g(new RegExp('梯段净宽 ([\\d.]+) m，西梯两跑在 x=' + R + ' 与 ' + R), '后楼梯梯段')
  const [blA, blB, bmA, bmB] = g(new RegExp('楼层平台在南端门内（y=' + R + '），中间平台在北端（y=' + R + '）'), '后楼梯平台')
  const [backSteps] = g(/梯间封闭。每层一道[\s\S]*?每层两跑，每跑 (\d+) 级/, '后楼梯级数')
  must(/从地下一层通到三层/.test(S12), '1.2 后楼梯从地下一层通到三层')
  // 电梯
  const [lw0, lw1, le0, le1, ly0, ly1] = g(new RegExp('井道 x=' + R + ' 与 ' + R + '，y=' + R), '电梯井道')
  const [ldW] = g(/电梯门朝北，宽 ([\d.]+) m，开在本层电梯厅的南端/, '电梯门')
  const [carW, carD] = g(/轿厢净 ([\d.]+) × ([\d.]+) m/, '轿厢')
  const [tOpen] = g(/开门 (\d+) 秒；开足后停/, '电梯开门')
  const [tDwell] = g(/开足后停 (\d+) 秒，自己关/, '电梯停门')
  const [tClose] = g(/关门 (\d+) 秒。按开门钮/, '电梯关门')
  const [tFloor] = g(/每过一层 (\d+) 秒/, '电梯每层')
  const [exA, exB] = g(/从按钮到二层开门共 (\d+) 秒，按关门钮省 (\d+) 秒/, '电梯算法举例')
  // 举例：轿厢在三层，人在一层：两层 ×6 + 开门 3 = 15……原文「按钮后 12 秒到，3 秒开门」；再停 5、关 3、走 6、开 3
  must(2 * tFloor + tOpen + tDwell + tClose + tFloor + tOpen === exA && exB === tDwell, '1.2 电梯：举例的秒数与规则对不上')
  // 大楼梯
  const [gso0, gso1, gsi0, gsi1] = g(new RegExp('西梯外跑贴西墙（x=' + R + '），内跑在 x=' + R), '大楼梯')
  const [gfrom] = g(/外跑从 y=([\d.]+) 起向南上/, '大楼梯外跑起点')
  const [gm0, gm1, gmRise] = g(new RegExp('中间平台（y=' + R + '，高出楼面 ([\\d.]+) m）'), '大楼梯中间平台')
  const [gSteps, gWidth] = g(/每层两跑，每跑 (\d+) 级；梯段净宽 ([\d.]+) m。西梯/, '大楼梯级数与梯段净宽')
  const [gRail] = g(/内跑和中间平台朝门厅中间一侧是 ([\d.]+) m 高的栏杆/, '大楼梯栏杆')
  must(/只通一至三层/.test(S12), '1.2 大楼梯只通一至三层')
  const foyer = must(rooms.find(r => r.floor === '1F' && r.name === '门厅'), '1.3 门厅')
  // 东梯与西梯对称：大楼梯以门厅中轴为镜，后楼梯以全馆中轴为镜（两条轴是同一条 x=34.8）
  must(near(foyer.x0 + foyer.x1, B.outline.x0 + B.outline.x1) && near(bw0 + be1, B.outline.x0 + B.outline.x1), '1.2 东西两侧应以中轴对称')
  const mir = x => r2(B.outline.x0 + B.outline.x1 - x)
  // 楼梯平台
  const [lp0, lp1, lpy0, lpy1] = g(new RegExp('楼梯平台：\\*\\* 二、三层各一道，x=' + R + '，y=' + R), '楼梯平台')
  // 廊
  const [corrW] = g(/廊宽 ([\d.]+) m（轴线）/, '廊宽')
  const [sy0, sy1, sw0, sw1, se0, se1, bsw0, bsw1, bse0, bse1] = g(new RegExp('\\*\\*南廊\\*\\*（y=' + R + '）：西段 x=' + R + '，东段 x=' + R + '[^。]*。地下只有西段 x=' + R + ' 和东段 x=' + R), '南廊')
  const [ny0, ny1, nw0, nw1, nm0, nm1, ne0, ne1, bn0, bn1] = g(new RegExp('\\*\\*北廊\\*\\*（y=' + R + '）：西段 x=' + R + '，北过厅 x=' + R + '[^，]*，东段 x=' + R + '。地下北廊在 x=' + R), '北廊')
  const bnMid = must((S12.match(/地下北廊在 x=[\d.]+—[\d.]+，中段叫(\S+?)。/) || [])[1], '1.2 地下北廊中段的名字')
  const [cw0, cw1, cxe0, cxe1, ly0b, ly1b, cmy0, cmy1] = g(new RegExp('\\*\\*西廊、东廊\\*\\*（x=' + R + ' 与 ' + R + '）：南头是电梯厅（y=' + R + '）[^；]*；北头是后楼梯；中间沿院子的一段 y=' + R), '西廊东廊')
  const lobbyNames = must((S12.match(/南头是电梯厅（y=[^）]+），叫(\S+?)、(\S+?)；/) || []).slice(1), '1.2 电梯厅的名字')
  const mid = must(S12.match(/西廊一层(\S+?)、二层(\S+?)、三层(\S+?)、地下(\S+?)，东廊一层(\S+?)、二层(\S+?)、三层(\S+?)、地下(\S+?)。/), '1.2 廊名').slice(1)
  const MID = { '1F': [mid[0], mid[4]], '2F': [mid[1], mid[5]], '3F': [mid[2], mid[6]], B1: [mid[3], mid[7]] }
  const [iw0, iw1, ie0, ie1, iy0, iy1] = g(new RegExp('西内廊（x=' + R + '）、东内廊（x=' + R + '），y=' + R), '内廊')
  must(/穹顶回廊是1\.1那块方形里鼓座以外的部分，南接楼梯平台，北接北过厅/.test(S12), '1.2 穹顶回廊')
  must(/一层的廊朝院子一面是玻璃隔断，二、三层朝院子是固定玻璃/.test(S12), '1.2 玻璃')
  const [glassBase] = g(/下部是高([\d.]+) m的黑色实心底框/, '玻璃底框')
  // 几何互相核对
  must(near(cw0, bw0) && near(cw1, bw1) && near(cxe0, be0) && near(cxe1, be1), '1.2 后楼梯应在西廊、东廊的北头')
  must(near(ly0b, ly1) && near(cmy0, B.courts[0].y0) && near(cmy1, B.courts[0].y1), '1.2 电梯厅、中间段的 y 与电梯井、院子对不上')
  must(near(sy1 - sy0, corrW) && near(ny1 - ny0, corrW) && near(cw1 - cw0, corrW), '1.2 廊宽')
  must(near(lp0, foyer.x0) && near(lp1, foyer.x1) && near(lpy0, sy0) && near(lpy1, sy1), '1.2 楼梯平台应在南廊中段')
  must(near(nm0, B.hall.square[0]) && near(nm1, B.hall.square[1]), '1.2 北过厅应在议事厅背后')
  must(near(iw0, B.courts[0].voidX1) && near(iw1, B.courts[0].x1) && near(ie0, B.courts[1].x0) && near(ie1, B.courts[1].voidX0), '1.2 内廊与院子上空对不上')

  const out = []
  const P = (floor, name, kind, x0, x1, y0, y1, extra = {}) => out.push(Object.assign({ floor, name, kind, shape: 'rect', x0, x1, y0, y1, area: r2((x1 - x0) * (y1 - y0)), doors: [], parent: null }, extra))
  for (const f of FIDS) {
    const up = f !== 'B1'
    P(f, '西电梯', 'elevator', lw0, lw1, ly0, ly1, { doors: [{ raw: '电梯门', open: false, axis: 'x', at: r2((lw0 + lw1) / 2), width: ldW, dir: '北', to: lobbyNames[0], main: false, glass: false }] })
    P(f, '东电梯', 'elevator', le0, le1, ly0, ly1, { doors: [{ raw: '电梯门', open: false, axis: 'x', at: r2((le0 + le1) / 2), width: ldW, dir: '北', to: lobbyNames[1], main: false, glass: false }] })
    P(f, lobbyNames[0], 'corridor', cw0, cw1, ly0b, ly1b)
    P(f, lobbyNames[1], 'corridor', cxe0, cxe1, ly0b, ly1b)
    P(f, MID[f][0], 'corridor', cw0, cw1, cmy0, cmy1)
    P(f, MID[f][1], 'corridor', cxe0, cxe1, cmy0, cmy1)
    if (up) {
      P(f, '南廊西段', 'corridor', sw0, sw1, sy0, sy1)
      P(f, '南廊东段', 'corridor', se0, se1, sy0, sy1)
      P(f, '北廊西段', 'corridor', nw0, nw1, ny0, ny1)
      P(f, '北过厅', 'corridor', nm0, nm1, ny0, ny1)
      P(f, '北廊东段', 'corridor', ne0, ne1, ny0, ny1)
    } else {
      P(f, '南廊西段', 'corridor', bsw0, bsw1, sy0, sy1)
      P(f, '南廊东段', 'corridor', bse0, bse1, sy0, sy1)
      // 原文没写地下北廊的分段界线：取地上各层的 26.4、43.2（与议事厅背后的北过厅同宽），由门位核对（见下面的门检查）
      P(f, '北廊西段', 'corridor', bn0, nw1, ny0, ny1)
      P(f, bnMid, 'corridor', nm0, nm1, ny0, ny1)
      P(f, '北廊东段', 'corridor', ne0, bn1, ny0, ny1)
    }
    for (const [name, x0, x1, door] of [[backNames[0], bw0, bw1, bdXw], [backNames[1], be0, be1, bdXe]]) {
      P(f, name, 'stair', x0, x1, by0, by1, { doors: [{ raw: '后楼梯门', open: false, axis: 'x', at: door, width: bdW, dir: '南', to: name === backNames[0] ? '北廊西段' : '北廊东段', main: false, glass: false }] })
    }
    if (f === '2F' || f === '3F') {
      P(f, '楼梯平台', 'landing', lp0, lp1, lpy0, lpy1, { over: '门厅' })
      P(f, '门厅上空', 'void', foyer.x0, foyer.x1, foyer.y0, lpy0, { over: '门厅' })
      P(f, '西内廊', 'corridor', iw0, iw1, iy0, iy1, { over: B.courts[0].name })
      P(f, '东内廊', 'corridor', ie0, ie1, iy0, iy1, { over: B.courts[1].name })
      P(f, '西院上空', 'void', B.courts[0].voidX0, B.courts[0].voidX1, iy0, iy1, { over: B.courts[0].name })
      P(f, '东院上空', 'void', B.courts[1].voidX0, B.courts[1].voidX1, iy0, iy1, { over: B.courts[1].name })
      // 穹顶回廊：方形里鼓座以外的部分（外框取方形，hole 是鼓座外圆）
      const [qx0, qx1, qy0, qy1] = B.hall.square
      P(f, '穹顶回廊', 'gallery', qx0, qx1, qy0, qy1, { shape: 'ring', cx: B.hall.cx, cy: B.hall.cy, hole: B.hall.rOuter, area: r2((qx1 - qx0) * (qy1 - qy0) - Math.PI * B.hall.rOuter ** 2) })
    }
  }
  const circulation = {
    corridorWidth: corrW,
    glassBase,
    grand: {
      floors: ['1F', '2F', '3F'], steps: gSteps, width: gWidth, rail: gRail, fromY: gfrom, mid: [gm0, gm1], midRise: gmRise,
      west: { outer: [gso0, gso1], inner: [gsi0, gsi1] },
      east: { outer: [mir(gso1), mir(gso0)], inner: [mir(gsi1), mir(gsi0)] },
    },
    back: backNames.map((name, i) => ({
      name, floors: FIDS.slice(), x0: i ? be0 : bw0, x1: i ? be1 : bw1, y0: by0, y1: by1, steps: backSteps, width: bsw,
      runs: i ? [[mir(br3), mir(br2)], [mir(br1), mir(br0)]] : [[br0, br1], [br2, br3]],
      landing: [blA, blB], mid: [bmA, bmB],
      door: { dir: '南', x: i ? bdXe : bdXw, y: bdY, width: bdW, to: i ? '北廊东段' : '北廊西段' },
    })),
    elevators: [['西电梯', lw0, lw1, lobbyNames[0]], ['东电梯', le0, le1, lobbyNames[1]]].map(([name, x0, x1, lobby]) => ({
      name, floors: FIDS.slice(), x0, x1, y0: ly0, y1: ly1, car: [carW, carD], door: { dir: '北', x: r2((x0 + x1) / 2), y: ly1, width: ldW }, lobby, start: '1F',
    })),
    elevatorTiming: { perFloor: tFloor, open: tOpen, dwell: tDwell, close: tClose, example: exA },
  }
  return { pieces: out, circulation }
}

// ---------- 门：ref 补坐标、廊段补门、全部核对 ----------
function linkDoors(all, B) {
  const byKey = {}
  for (const r of all) byKey[r.floor + '/' + r.name] = r
  const O = B.outline
  const wallPoint = (r, d) => {
    if (d.axis === 'x') { must(d.dir === '南' || d.dir === '北', r.name + '「' + d.raw + '」：x= 的门应在南墙或北墙'); return [d.at, d.dir === '北' ? r.y1 : r.y0] }
    must(d.dir === '东' || d.dir === '西', r.name + '「' + d.raw + '」：y= 的门应在东墙或西墙')
    return [d.dir === '东' ? r.x1 : r.x0, d.at]
  }
  // 门在本室这一面墙上、宽度不出墙
  const onWall = (r, d) => {
    const [a, b] = d.axis === 'x' ? [r.x0, r.x1] : [r.y0, r.y1]
    return d.at - d.width / 2 >= a - 0.011 && d.at + d.width / 2 <= b + 0.011
  }
  // 1) 写全的门：门外那一处必须存在，门位落在两边共用的墙上
  for (const r of all) for (const d of r.doors) {
    if (d.ref) continue
    must(onWall(r, d), r.floor + ' ' + r.name + '「' + d.raw + '」不在本室墙上')
    const [px, py] = wallPoint(r, d)
    if (d.to === '屋外') {
      must(near(py, O.y0) || near(py, O.y1) || near(px, O.x0) || near(px, O.x1), r.name + '「' + d.raw + '」通屋外，却不在外墙上')
      d.outside = true
      continue
    }
    const o = must(byKey[r.floor + '/' + d.to], r.floor + ' ' + r.name + '「' + d.raw + '」：通「' + d.to + '」，表里和 1.2 都没有这一处')
    const shared = d.dir === '北' ? near(o.y0, r.y1) : d.dir === '南' ? near(o.y1, r.y0) : d.dir === '东' ? near(o.x0, r.x1) : near(o.x1, r.x0)
    must(shared && onWall(o, d), r.floor + ' ' + r.name + '「' + d.raw + '」不在「' + d.to + '」的边上（' + px + '，' + py + '）')
  }
  // 2) ref 门：在对方那一行找写全的门，一一对应；坐标抄过来，dir 换成本室这一侧的墙
  for (const r of all) {
    const used = new Set()
    for (const d of r.doors) {
      if (!d.ref || d.owner) continue
      const o = must(byKey[r.floor + '/' + d.to], r.floor + ' ' + r.name + '「' + d.raw + '」：没有「' + d.to + '」这一间')
      const cands = o.doors.filter(x => !x.ref && x.to === r.name && (!d.refDir || x.dir === d.refDir) && !used.has(x))
      const full = must(cands[0], r.floor + ' ' + r.name + '「' + d.raw + '」：' + d.to + ' 那一行没有写全这道门')
      used.add(full)
      full.refBy = true
      Object.assign(d, { axis: full.axis, at: full.at, width: full.width, dir: OPP[full.dir], owner: o.name, open: full.open, glass: full.glass })
    }
  }
  // 3) 门外是廊段（或电梯厅、后楼梯外的交叉口）的：在那一段里补一道 ref 门
  for (const r of all) for (const d of r.doors) {
    if (d.ref || d.outside) continue
    const o = byKey[r.floor + '/' + d.to]
    if (d.refBy) continue
    must(o.kind !== 'room' && o.kind !== 'suite', r.floor + ' ' + r.name + '「' + d.raw + '」通房间「' + d.to + '」，那一行却没有写「' + r.name + '门」')
    o.doors.push({ raw: r.name + (d.open ? '敞接' : '门'), ref: true, open: d.open, axis: d.axis, at: d.at, width: d.width, dir: OPP[d.dir], to: r.name, owner: r.name, main: false, glass: d.glass, refDir: null })
    d.refBy = true
  }
  for (const r of all) for (const d of r.doors) delete d.refBy
}

// ---------- 几何：廊与廊敞接、朝院子的玻璃、平台栏杆；铺满核对 ----------
function edges(all) {
  const share = (a, b) => {
    // a 的哪条边与 b 的哪条边重合（返回 [side, lo, hi]）
    const ov = (p0, p1, q0, q1) => [Math.max(p0, q0), Math.min(p1, q1)]
    let s = null, lo, hi
    if (near(a.x1, b.x0)) { [lo, hi] = ov(a.y0, a.y1, b.y0, b.y1); s = '东' } else if (near(a.x0, b.x1)) { [lo, hi] = ov(a.y0, a.y1, b.y0, b.y1); s = '西' } else if (near(a.y1, b.y0)) { [lo, hi] = ov(a.x0, a.x1, b.x0, b.x1); s = '北' } else if (near(a.y0, b.y1)) { [lo, hi] = ov(a.x0, a.x1, b.x0, b.x1); s = '南' }
    return s && hi - lo > 0.05 ? { side: s, a: r2(lo), b: r2(hi) } : null
  }
  const OPENK = new Set(['corridor', 'landing', 'gallery'])
  for (const f of FIDS) {
    const fl = all.filter(r => r.floor === f)
    for (const a of fl) {
      if (OPENK.has(a.kind)) a.adj = []
      if (a.kind === 'corridor' || a.kind === 'void' || (f === '1F' && a.court)) a.glass = []
      if (a.kind === 'landing' || (a.kind === 'void' && a.over === '门厅')) a.rail = []
    }
    for (const a of fl) for (const b of fl) {
      if (a === b) continue
      const e = share(a, b)
      if (!e) continue
      // 廊与廊、廊与楼梯平台、穹顶回廊之间都敞接（1.2「廊上没有门」）
      if (OPENK.has(a.kind) && OPENK.has(b.kind)) a.adj.push({ to: b.name, ...e })
      // 一层：廊朝院子是玻璃隔断；二、三层：廊朝院子上空是固定玻璃
      const courtSide = x => (f === '1F' && x.court) || (x.kind === 'void' && x.over !== '门厅')
      if ((a.kind === 'corridor' && courtSide(b)) || (courtSide(a) && b.kind === 'corridor')) a.glass.push({ to: b.name, ...e })
      // 楼梯平台朝门厅一侧是栏杆
      if ((a.kind === 'landing' && b.kind === 'void' && b.over === '门厅') || (b.kind === 'landing' && a.kind === 'void' && a.over === '门厅')) a.rail.push({ to: b.name, ...e })
    }
    // 铺满：每层的房间、廊段、楼梯、电梯正好铺满外形，只差电梯井两侧的实墙；彼此不重叠
    for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) {
      const a = fl[i], b = fl[j]
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
      must(!(ox > 0.011 && oy > 0.011), f + ' ' + a.name + ' 与 ' + b.name + ' 重叠')
    }
    const lobby = fl.filter(r => r.kind === 'corridor' && /电梯厅$/.test(r.name))
    const shafts = fl.filter(r => r.kind === 'elevator')
    const solid = shafts.reduce((s, e) => s + ((lobby[0].x1 - lobby[0].x0) - (e.x1 - e.x0)) * (e.y1 - e.y0), 0)
    const covered = fl.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0)
    must(near(covered + solid, 69.6 * 40.8, 0.05), f + '：房间与廊段加电梯井两侧实墙应铺满外形（' + covered.toFixed(2) + ' + ' + solid.toFixed(2) + '）')
  }
}

// ---------- 3.1 光、3.2 窗、3.3 钟、3.4 定时的事、3.5 天气 ----------
function parseLight() {
  const sec = slice(PHYS, '### 3.1 光', '\n### 3.2', '物理层 3.1')
  const rows = []
  for (const m of sec.matchAll(/^\| (\d\d:\d\d)—(\d\d:\d\d) \| (.+?) \| (.+?) \| (.+?) \|$/gm)) {
    rows.push({ from: m[1], to: m[2], fromMin: hhmm(m[1]), toMin: hhmm(m[2]), window: m[3], lit: m[4], unlit: m[5] })
  }
  must(rows.length === 5 && rows[0].from === '05:00' && rows[4].to === '05:00', '3.1 光的时段表应有五行，从 05:00 起、到 05:00 止')
  const def = must((sec.match(/天默认(阴着)，不下雨/) || [])[1], '3.1 默认阴天')
  const windowed = must((sec.match(/"有窗"只指(.+?)。/) || [])[1], '3.1「有窗」')
  must(/调查期内（主持人游戏 3\.1），全馆的灯一律亮着/.test(sec), '3.1 调查期内灯一律亮着')
  must(/窗光为"无"的时段，窗面映出屋里的倒影/.test(sec), '3.1 窗面映出倒影')
  return { rows, sky: def, windowed, investigationAllLit: true, mirrorWhenDark: true }
}

function parseWindows(all, B) {
  const sec = slice(PHYS, '### 3.2 窗的位置', '\n### 3.3', '物理层 3.2')
  const O = B.outline
  const room = (f, n) => all.find(r => r.floor === f && r.name === n)
  const ext = r => ({ 南: near(r.y0, O.y0), 北: near(r.y1, O.y1), 西: near(r.x0, O.x0), 东: near(r.x1, O.x1) })
  const out = []
  const put = (f, r, side, n, width, height, sill, kind, extra = {}) => {
    must(ext(r)[side], f + ' ' + r.name + ' 的' + side + '墙不是外墙，不能开窗')
    const along = side === '南' || side === '北'
    const [a0, a1] = along ? [r.x0, r.x1] : [r.y0, r.y1]
    for (let i = 0; i < n; i++) {
      const c = r2(a0 + (a1 - a0) * (i + 0.5) / n)
      out.push(Object.assign({ floor: f, room: r.name, side, kind, at: c, a: r2(c - width / 2), b: r2(c + width / 2), width, height, sill, opens: true }, extra))
    }
  }
  // 十三间套房：正对房门那面外墙正中一扇
  const [sw, sh, ss] = nums(/\*\*十三间套房：\*\* 正对房门那面外墙正中一扇，宽([\d.]+) m、高([\d.]+) m，下缘距地([\d.]+) m。/, sec, '3.2 套房的窗')
  for (const r of all.filter(r => r.kind === 'suite')) {
    must(r.doors.length === 1, r.name + ' 应只有一道门')
    put(r.floor, r, OPP[r.doors[0].dir], 1, sw, sh, ss, 'suite', { placed: 'center' })
  }
  // 房间：三句，按墙分
  const [rh, rs] = nums(/\*\*房间：\*\* 宽2\.4 m或3\.6 m，高([\d.]+) m，下缘距地([\d.]+) m。/, sec, '3.2 房间的窗')
  const FL = { 一层: '1F', 二层: '2F', 三层: '3F' }
  let roomWin = 0
  for (const m of sec.matchAll(/^ {2}- (南墙|北墙|西墙、东墙)，([\d.]+) m：(.+)$/gm)) {
    const width = +m[2]
    const [body, ...rest] = m[3].split('。')
    for (const t of rest.filter(s => s.trim())) must(/不开窗$/.test(t), '3.2「' + t + '」')
    let floor = null, pending = []
    for (const group of body.split('；')) {
      floor = null
      for (let tok of group.split(/[、，]/).map(s => s.trim()).filter(Boolean)) {
        const cnt = tok.match(/^(.*?)(各)?([一两三四])扇$/)
        if (cnt) tok = cnt[1]
        if (tok) {
          const fp = tok.match(/^(一层|二层|三层)(.+)$/)
          let f = floor, n = tok
          if (fp && !FIDS.some(x => room(x, tok))) { f = FL[fp[1]]; n = fp[2] } else if (fp && room(FL[fp[1]], tok)) f = FL[fp[1]]
          floor = must(f, '3.2「' + group + '」：「' + tok + '」不知道在哪一层')
          pending.push([floor, must(room(floor, n), '3.2：' + floor + ' 没有「' + n + '」')])
        }
        if (cnt) {
          const k = CNN[cnt[3]]
          for (const [f, r] of pending) {
            const sides = m[1] === '西墙、东墙' ? ['西', '东'].filter(s => ext(r)[s]) : [m[1][0]]
            must(sides.length === 1, '3.2 ' + r.name + ' 的窗：西墙、东墙里应正好有一面外墙')
            put(f, r, sides[0], k, width, rh, rs, 'room', { placed: 'even' })
            roomWin += k
          }
          pending = []
        }
      }
    }
    must(!pending.length, '3.2「' + m[3] + '」：有房名后面没有扇数')
  }
  must(roomWin > 0, '3.2 房间的窗一扇也没读到')
  // 廊端：地上每层四扇，在南廊、北廊的东西两头
  const cn = cnNum(must((sec.match(/\*\*廊端：\*\* 地上每层(.)扇/) || [])[1], '3.2 廊端几扇'))
  const [cwid, chgt, csill] = nums(/\*\*廊端：\*\* 地上每层.扇，在南廊、北廊的东西两头；宽([\d.]+) m、高([\d.]+) m，下缘距地([\d.]+) m。/, sec, '3.2 廊端的窗')
  for (const f of ['1F', '2F', '3F']) {
    let k = 0
    for (const [n, side] of [['南廊西段', '西'], ['南廊东段', '东'], ['北廊西段', '西'], ['北廊东段', '东']]) { put(f, must(room(f, n), f + ' ' + n), side, 1, cwid, chgt, csill, 'corridor', { placed: 'center' }); k++ }
    must(k === cn, '3.2 廊端每层 ' + cn + ' 扇')
  }
  // 后楼梯：北墙三扇——一、二层往上的两个中间平台上方各一扇，三层一扇
  const [bw, bh, bsill, b3sill] = nums(/\*\*后楼梯：\*\* 北墙三扇，宽([\d.]+) m、高([\d.]+) m：一、二层往上的两个中间平台上方各一扇，下缘高出平台([\d.]+) m；三层一扇，下缘距三层楼面([\d.]+) m。/, sec, '3.2 后楼梯的窗')
  for (const n of ['西北后楼梯', '东北后楼梯']) {
    for (const f of ['1F', '2F']) put(f, room(f, n), '北', 1, bw, bh, bsill, 'stair', { placed: 'center', aboveMidLanding: true })
    put('3F', room('3F', n), '北', 1, bw, bh, b3sill, 'stair', { placed: 'center' })
  }
  // 门厅：南墙正门上方一面大窗（不能开），占二、三层的高度
  const [fw, fh, fs] = nums(/\*\*门厅：\*\* 南墙正门上方一面大窗，宽([\d.]+) m、高([\d.]+) m，下缘距一层地面([\d.]+) m，占二、三层的高度。/, sec, '3.2 门厅大窗')
  put('1F', room('1F', '门厅'), '南', 1, fw, fh, fs, 'foyer', { placed: 'center', opens: false })
  // 天顶与天眼
  const [skW, skD, skZ] = nums(/门厅（([\d.]+)×([\d.]+) m）和两院上空（1\.1）的天顶，内面约在([\d.]+) m/, sec, '3.2 天顶')
  const foyer = room('1F', '门厅')
  must(near(skW, foyer.x1 - foyer.x0) && near(skD, foyer.y1 - foyer.y0), '3.2 门厅天顶与门厅尺寸对不上')
  const skylights = [
    { over: '门厅', x0: foyer.x0, x1: foyer.x1, y0: foyer.y0, y1: foyer.y1, z: skZ },
    ...B.courts.map(c => ({ over: c.name, x0: c.voidX0, x1: c.voidX1, y0: c.y0, y1: c.y1, z: skZ })),
  ]
  must(/外墙上的窗都能开，门厅正门上方的大窗、天顶和天眼除外/.test(sec), '3.2 哪些窗能开')
  must(/地下全部无窗/.test(sec), '3.2 地下全部无窗')
  return { windows: out, skylights }
}

function parseClocks(all) {
  const sec = slice(PHYS, '### 3.3 钟', '\n### 3.4', '物理层 3.3')
  must(/常态显示一天时刻的钟只有五只：一只落地钟，四只挂钟/.test(sec), '3.3 五只钟')
  const room = (f, n) => must(all.find(r => r.floor === f && r.name === n), '3.3 ' + f + ' ' + n)
  const out = []
  // 落地钟：一层门厅北墙，议事厅南门西侧
  must(/\*\*落地钟：\*\* 在一层门厅北墙，议事厅南门西侧；高([\d.]+) m的重锤机械钟/.test(sec), '3.3 落地钟的位置')
  const [gh] = nums(/高([\d.]+) m的重锤机械钟/, sec, '3.3 落地钟高')
  const foyer = room('1F', '门厅')
  const hd = must(foyer.doors.find(d => d.to === '穹顶议事厅'), '门厅通议事厅的门')
  out.push({ kind: '落地钟', floor: '1F', room: '门厅', wall: '北', x: r2(hd.at - hd.width / 2 - 0.8), y: foyer.y1, height: gh, chimes: true, approx: true })
  // 挂钟：「在一层议事厅北墙（两座罩柜中间上方）、一层宴饮厅南墙、二层阅览室北墙、三层起居室北墙」
  const list = must((sec.match(/\*\*挂钟：\*\* 在(.+?)；石英钟/) || [])[1], '3.3 挂钟的位置')
  const FL = { 一层: '1F', 二层: '2F', 三层: '3F' }
  const [cz] = nums(/钟心距地约([\d.]+) m/, sec, '3.3 挂钟高')
  for (const it of list.split('、')) {
    const m = must(it.match(/^(一层|二层|三层)(.+?)([东西南北])墙(（.+）)?$/), '3.3 挂钟「' + it + '」')
    const f = FL[m[1]]
    // 「三层起居室」：房名本身带层号
    const name = all.find(r => r.floor === f && r.name === m[1] + m[2]) ? m[1] + m[2] : m[2] === '议事厅' ? '穹顶议事厅' : m[2]
    const r = room(f, name)
    let x, y
    if (r.shape === 'circle') { x = r.cx; y = r2(r.cy + r.r) } else if (m[3] === '北' || m[3] === '南') { x = r2((r.x0 + r.x1) / 2); y = m[3] === '北' ? r.y1 : r.y0 } else { y = r2((r.y0 + r.y1) / 2); x = m[3] === '东' ? r.x1 : r.x0 }
    // 宴饮厅南墙正中是门：钟在西柜上方（各室/1F_宴饮厅.md），放到门西侧
    const dr = r.doors.find(d => d.axis === 'x' && d.dir === m[3] && Math.abs(d.at - x) < 1.5)
    if (dr) x = r2(dr.at - dr.width / 2 - 1.6)
    out.push({ kind: '挂钟', floor: f, room: name, wall: m[3], x, y, z: cz, chimes: false, approx: true, note: m[4] ? m[4].slice(1, -1) : '' })
  }
  must(out.length === 5, '3.3 应正好五只钟')
  const quiet = must((sec.match(/地下和两座后楼梯里听不见/) || [])[0], '3.3 哪里听不见')
  const counts = must((sec.match(/原位时，(.+?)都能数声/) || [])[1], '3.3 哪里能数声')
  return { list: out, countable: counts, silent: quiet.replace(/里听不见$/, '') }
}

function parseTimed() {
  const sec = slice(PHYS, '### 3.4 定时的事', '\n### 3.5', '物理层 3.4')
  const rows = []
  for (const line of sec.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || line.startsWith('| 时刻')) continue
    const [when, what, ref] = line.split('|').slice(1, -1).map(s => s.trim())
    rows.push({ when, what, ref: ref.replace(/`/g, ''), times: [...when.matchAll(/(\d\d:\d\d)/g)].map(m => m[1]) })
  }
  must(rows.length >= 5, '3.4 定时的事至少五行')
  const w = slice(PHYS, '### 3.5 天气', '\n## 4.', '物理层 3.5')
  must(/默认是阴天/.test(w) && /整八小时（基准钟），回到阴天/.test(w), '3.5 天气：默认阴天、八小时回到阴天')
  return { timed: rows, weather: { default: '阴天', hours: 8 } }
}

// ---------- 1.4 屋外与透明的墙 ----------
function parseOutside(B) {
  const t = S14
  const [radius] = nums(/以穹顶议事厅的圆心为圆心、半径 (\d+) m，有一道透明的墙围成一圈/, t, '1.4 透明的墙')
  const [ground] = nums(/屋外地面比一层楼面低 ([\d.]+) m/, t, '1.4 屋外地面')
  const [lawn] = nums(/房子四周是一圈 (\d+) m 宽的草地/, t, '1.4 草地')
  const stepN = cnNum(must((t.match(/正门外(.)级石阶/) || [])[1], '1.4 石阶'))
  const [fw, fd] = nums(/铺石的前庭，宽 (\d+) m、深 (\d+) m/, t, '1.4 前庭')
  const [beachW, waterAt] = nums(/往南是沙滩，宽约 (\d+) m，水边离南墙约 (\d+) m/, t, '1.4 沙滩')
  const [waist, overhead, wallDepth] = nums(/离水边 (\d+) m 齐腰，(\d+) m 没过头顶，最远到墙边约 (\d+) m/, t, '1.4 海的深浅')
  const [tDay, tNight, rh] = nums(/白天约 (\d+) ℃，夜里约 (\d+) ℃，相对湿度约 (\d+)%/, t, '1.4 气温')
  const [tSea] = nums(/海水约 (\d+) ℃/, t, '1.4 海水')
  must(/林子的南缘和房子南边草地的外缘齐平/.test(t), '1.4 林子南缘')
  must(/沙滩东西两头也一直伸到墙边/.test(t), '1.4 沙滩伸到墙边')
  must(/白天在林子里看得见二三十米/.test(t), '1.4 林中视距')
  const sight = [20, 30]
  const O = B.outline, e = O.extWall
  // 草地：外墙外皮以外一圈 lawn 米宽
  const lawnBox = { x0: r2(O.x0 - e - lawn), x1: r2(O.x1 + e + lawn), y0: r2(O.y0 - e - lawn), y1: r2(O.y1 + e + lawn) }
  const waterY = r2(O.y0 - e - waterAt)
  must(near(lawn + beachW, waterAt, 1), '1.4 草地宽加沙滩宽应约等于水边离南墙的距离')
  return {
    wall: { cx: B.hall.cx, cy: B.hall.cy, r: radius },
    ground: -ground, lawn, lawnBox, steps: stepN,
    forecourt: { w: fw, d: fd, x0: r2(B.hall.cx - fw / 2), x1: r2(B.hall.cx + fw / 2), y0: r2(O.y0 - e - fd), y1: r2(O.y0 - e), approx: true },
    // 林子：草地外缘以北、以东、以西，一直到墙；林子的南缘与房子南边草地的外缘齐平
    forest: { southY: lawnBox.y0, trees: '松树和山毛榉', sight },
    // 沙滩：从房子南边草地外缘往南，宽约 65 m，东西两头伸到墙边；水边离南墙约 80 m，再往南是海，一直到墙
    beach: { y0: waterY, y1: lawnBox.y0, w: beachW },
    sea: { y1: waterY, waist, overhead, wallDepth, temp: tSea, tide: false },
    climate: { day: tDay, night: tNight, humidity: rh },
    noLife: true, noFreshWater: true,
  }
}

// ---------- 各室：议事厅的陈设数字（席位、圆桌、收纳台、铜牌、钥匙） ----------
function parseHallRoom(B) {
  const t = read('各室/1F_穹顶议事厅.md')
  const [disc] = nums(/直径([\d.]+) m的墨玉圆盘/, t, '各室/议事厅 墨玉圆盘')
  const [td, th, tw] = nums(/圆桌直径([\d.]+) m、高([\d.]+) m，石面，整桌约重([\d.]+) t/, t, '各室/议事厅 圆桌')
  const seats = cnNum(must((t.match(/桌沿嵌(.+?)枚号牌/) || [])[1], '各室/议事厅 号牌数'))
  must(/1号位于正北，按顺时针排列/.test(t), '各室/议事厅 1 号正北、顺时针')
  const chairs = cnNum(must((t.match(/([一二三四五六七八九十]+)把同式高背扶手椅等距环绕圆桌/) || [])[1], '各室/议事厅 椅子'))
  const [chairW] = nums(/椅宽([\d.]+) m/, t, '各室/议事厅 椅宽')
  const screens = cnNum(must((t.match(/墙上(.+?)幅窄长丝绸织纹屏/) || [])[1], '各室/议事厅 织纹屏'))
  const lamps = cnNum(must((t.match(/天眼下悬一环(.+?)盏乳白球灯/) || [])[1], '各室/议事厅 球灯'))
  const [pcx, pcy, pw, ph, pz] = nums(/\*\*价目铜牌。\*\* 中心约在（([\d.]+)，([\d.]+)），牌面朝向圆心；含框宽([\d.]+) m、高([\d.]+) m，中心距地([\d.]+) m/, t, '各室/议事厅 铜牌')
  const [ccx, ccy, cl, cdp, chh, ctop] = nums(/\*\*收纳台。\*\* 贴着弧墙，中心约在（([\d.]+)，([\d.]+)），正面朝向圆心；长([\d.]+) m、深([\d.]+) m、总高([\d.]+) m，台面距地([\d.]+) m/, t, '各室/议事厅 收纳台')
  const [nw, nh, nd, nz] = nums(/宽([\d.]+) m、高([\d.]+) m、深([\d.]+) m的敞口钥匙龛，龛底距地([\d.]+) m/, t, '各室/议事厅 钥匙龛')
  const [kr0, kr1, kr2, kr3] = nums(/上排(\d+)—(\d+)号、下排(\d+)—(\d+)号/, t, '各室/议事厅 钥匙分排')
  const [sbw, sbd, sbh] = nums(/西门北侧一张([\d.]+)×([\d.]+)×([\d.]+) m的侧案/, t, '各室/议事厅 侧案')
  const [cabW, cabD, cabH] = nums(/北墙两座玻璃罩柜，各([\d.]+)×([\d.]+)×([\d.]+) m/, t, '各室/议事厅 罩柜')
  must(seats === 13 && chairs === 13 && screens === 13 && lamps === 13 && kr3 === 13, '各室/议事厅：号牌、椅子、织纹屏、球灯、钥匙都应是十三')
  const [mapW, mapH, mapZ] = nums(/嵌一块宽([\d.]+) m、高([\d.]+) m的青铜平面图，底边距地([\d.]+) m/, PHYS, '物理层 2.5 平面图')
  const [rd, rcx, rcy] = nums(/地面嵌一面直径([\d.]+) m的罗盘花，中心为（([\d.]+)，([\d.]+)）；八向/, PHYS, '物理层 2.5 罗盘花')
  return {
    seats, disc, table: { d: td, h: th, t: tw }, chairW, screens, lamps,
    plaque: { cx: pcx, cy: pcy, w: pw, h: ph, z: pz },
    counter: { cx: ccx, cy: ccy, l: cl, d: cdp, h: chh, top: ctop, niche: { w: nw, h: nh, d: nd, z: nz }, rows: [[kr0, kr1], [kr2, kr3]] },
    sideboard: { w: sbw, d: sbd, h: sbh, where: '西门北侧' },
    cabinets: { w: cabW, d: cabD, h: cabH, where: '北墙', west: '神圣罗马帝国皇冠', east: '良渚文化反山十二号墓玉琮王' },
    floorPlan: { w: mapW, h: mapH, z: mapZ, where: '西侧侧案上方的弧墙', order: ['B1', '1F', '2F', '3F'] },
    compass: { floor: '1F', room: '门厅', cx: rcx, cy: rcy, d: rd },
  }
}

function parseMansion() {
  const B = parseBuilding()
  const table = parseRoomTable(B)
  // 院子：花园、自然史大厅是一层地面、三层通高
  for (const c of B.courts) { const r = must(table.find(x => x.floor === '1F' && x.name === c.name), '1.3 ' + c.name); r.court = true; must(near(r.x0, c.x0) && near(r.x1, c.x1), c.name + '：1.1 与 1.3 的坐标对不上') }
  const { pieces, circulation } = parseCirculation(B, table)
  // 条数：表里 58 行（B1 16、1F 17、2F 12、3F 13）；套房正好 13 间，1—13 号，层与 1.1 的楼层表一致
  const per = Object.fromEntries(FIDS.map(f => [f, table.filter(r => r.floor === f).length]))
  must(table.length === 58 && per.B1 === 16 && per['1F'] === 17 && per['2F'] === 12 && per['3F'] === 13, '1.3 应有 58 行（B1 16、1F 17、2F 12、3F 13），读到 ' + JSON.stringify(per))
  const suites = table.filter(r => r.kind === 'suite').map(r => r.suite).sort((a, b) => a - b)
  must(suites.join() === Array.from({ length: 13 }, (_, i) => i + 1).join(), '1.3 套房应是 1—13 号')
  for (const f of B.floors) must(table.filter(r => r.floor === f.id && r.kind === 'suite').map(r => r.suite).sort((a, b) => a - b).join() === f.suites.join(), f.id + ' 的套房与 1.1 楼层表对不上')
  // 面积：按轴线算
  for (const r of table) {
    if (r.shape === 'rect') must(near((r.x1 - r.x0) * (r.y1 - r.y0), r.area, 0.06), r.floor + ' ' + r.name + ' 的面积 ' + r.area + ' 与坐标对不上')
    else must(near(Math.PI * r.r * r.r, r.area, 0.6), r.name + ' 的净面积 ' + r.area + ' 与内径对不上')
    if (r.kind === 'suite') must(near(r.netW, B.outline.suiteNet) && near(r.netH, B.outline.suiteNet), r.name + ' 应净 ' + B.outline.suiteNet + ' m 见方')
  }
  // 顺序：每层先廊、楼梯、电梯，再表里的房间（与旧版「走廊在前」一致）
  const rooms = []
  for (const f of FIDS) rooms.push(...pieces.filter(r => r.floor === f), ...table.filter(r => r.floor === f))
  linkDoors(rooms, B)
  edges(rooms)
  // 院子的玻璃门：门外那段廊朝院子的一面应有玻璃
  for (const r of rooms) for (const d of r.doors) if (d.glass && !d.ref) must(r.court, r.name + '「' + d.raw + '」：玻璃门应开在院子上')
  // 每层都有门通到的地方：除电梯井外，每一处至少一道门或一处敞接
  for (const r of rooms) must(r.doors.length || (r.adj && r.adj.length) || r.kind === 'void', r.floor + ' ' + r.name + ' 没有门也没有敞接')
  // 正门：只有门厅一道，通屋外
  const exits = rooms.flatMap(r => r.doors.filter(d => d.outside).map(d => [r, d]))
  must(exits.length === 1 && exits[0][0].name === '门厅' && exits[0][1].main, '应只有门厅一道正门通屋外')
  const L = parseLight()
  const W = parseWindows(rooms, B)
  for (const r of rooms) r.win = W.windows.filter(w => w.floor === r.floor && w.room === r.name).length
  const C = parseClocks(rooms)
  const T = parseTimed()
  const outside = parseOutside(B)
  const mainDoor = exits[0][1]
  const [mdH] = nums(/正门（1\.3）是熏橡木双扇大门，高([\d.]+) m/, PHYS, '物理层 2.1 正门')
  must(/没有锁，也没有插销/.test(PHYS), '物理层 2.1 正门没有锁')
  const [doorH, hallDoorH] = nums(/门净高([\d.]+) m；议事厅三道门高([\d.]+) m/, PHYS, '物理层 2.1 门高')
  const keys = cnNum(must((PHYS.match(/钥匙共(.+?)把/) || [])[1], '物理层 2.2 钥匙数'))
  must(keys === 13, '物理层 2.2 钥匙应是十三把')
  B.hall.doorHeight = hallDoorH
  Object.assign(B.hall, parseHallRoom(B))
  return {
    outline: B.outline, floors: B.floors, rooms, hall: B.hall, courts: B.courts,
    foyer: { name: '门厅', floor: '1F', spans: ['1F', '2F', '3F'], mainDoor: { x: mainDoor.at, width: mainDoor.width, height: mdH, lock: false }, doorHeight: doorH, keys },
    circulation, outside, light: L, windows: W.windows, skylights: W.skylights, clocks: C, timed: T.timed, weather: T.weather,
  }
}

// =====================================================================
// 主持人游戏：第 5 节十三组身份
// =====================================================================
function parseIdentities() {
  const md = read('主持人游戏.md')
  const head = must((md.match(/^## 5\. (.+)组身份$/m) || [])[0], '主持人游戏 5 的标题（「## 5. 十三组身份」）')
  const count = cnNum(head.match(/^## 5\. (.+)组身份$/)[1])
  const sec = slice(md, head, '\n## 6. ', '主持人游戏 5')
  const blocks = sec.split(/\n### /)
  const intro = blocks.shift()
  // 共同说明：印在每张身份卡正面、正位那段下面
  const note = must(paras(intro).join('\n\n'), '主持人游戏 5：卡面的共同说明')
  const strip = (t, n) => t.split('\n').filter((l, k) => !(k === 0 && l.trim() === n)).join('\n').trim()
  const quote = text => quoteLines(text).join('\n').trim()
  const list = blocks.map(b => {
    const title = b.split('\n')[0]
    // 「5.1 隐者／暗杀者」「5.13 平民」
    const [, no, names] = must(title.match(/^5\.(\d+) (.+)$/), '身份标题「' + title + '」')
    const [front, back] = names.split('／')
    const pick = (label, next) => {
      const i = b.indexOf(`**${label}**`)
      if (i < 0) return ''
      const j = next ? b.indexOf(`**${next}**`, i) : -1
      return b.slice(i + label.length + 4, j < 0 ? undefined : j)
    }
    const notesRaw = must(pick('结算要点', '正面').trim(), '身份 ' + names + '：找不到「结算要点」')
    // 5.9：结算要点里写着翻面以后两面的卡面原文
    const fm = notesRaw.match(/翻面以后，卡面改成下面两段。正面：\n([\s\S]*?)\n背面：\n([\s\S]*?)\n\n(?!>)/)
    const flip = fm ? { front: back, back: front, frontText: strip(quote(fm[1]), back), backText: strip(quote(fm[2]), front) } : null
    const notes = notesRaw.split('\n').filter(l => !l.startsWith('>')).join('\n').replace(/\n{3,}/g, '\n\n')
      .replace(/卡面改成下面两段。正面：\n+背面：/, '卡面改成下面两段（见 flip）。').trim()
    const fText = must(strip(quote(pick('正面', '背面')), front), '身份 ' + front + ' 的正面')
    const bText = back ? must(strip(quote(pick('背面', null)), back), '身份 ' + back + ' 的背面') : ''
    // 丘比特与平民没有逆位身份，卡背与正面同文
    const noReverse = !back
    must(noReverse || /^成为受命者时，视为同时拥有此身份。/.test(bText), '身份 ' + back + ' 的背面应以「成为受命者时，视为同时拥有此身份。」开头')
    const o = { no: Number(no), front, back: noReverse ? null : back, noReverse, frontText: fText, backText: noReverse ? fText : bText, notes }
    if (flip) o.flip = flip
    return o
  })
  must(list.length === count, '主持人游戏 5：标题说 ' + count + ' 组，读到 ' + list.length + ' 组')
  must(list.map(x => x.no).join() === list.map((x, i) => i + 1).join(), '主持人游戏 5：小节编号应从 5.1 连续')
  const names = list.flatMap(x => [x.front, x.back]).filter(Boolean)
  must(new Set(names).size === names.length, '主持人游戏 5：身份名有重复')
  must(list.filter(x => x.flip).length === 1, '主持人游戏 5：应正好一组写了翻面以后的卡面（骑士／国王）')
  return { list, note }
}

// =====================================================================
// 价目表
// =====================================================================
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
  must(how.length === 4 && /问价即答/.test(how[3]), '铜牌「兑换方式」应是四行，末行是「……问价即答」')
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
//            power 买回被封的本事 / super 买带超常本事的东西 / ask 打听受命者、身份、来历和行踪 /
//            kill 请主持人代杀 / bypass 绕过门锁墙出口、透明的墙或联络馆外 / outsider 买馆外的人进来
//   result: 「不收金币，不停笔，他只得知不成立。」
//   other: [{ key, text }] —— 另外几处会「不成立」的条件，text 是整段原文：
//            round 总价不是整百、又不添东西凑满（8.2「按整枚结算」）/ purse 身上的金币不够（8.2「只能用他身上带着的金币付」）/
//            repair 修复身体残疾：请求的是治伤、治病，或对象没有卡上写明的残疾（第 9 节「不修什么」）/
//            service 服务办不了的对象：别人的身体、别人的套房和东西、尸体、没审结的命案现场（第 7 节第 4 条） }
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
  must(new Set(kinds.map(k => k.key)).size === KEY.length, '不成立的兑换：六类应各一条')
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
  // 第 7 节第 4 条「服务」：只取「别人的身体……都不成立（8.2）」那一句
  const svc = must((slice(md, '## 7. ', '\n## 8. ', '价目表 7').match(/能办的只在这些上面：[^。]*?；(别人的身体[^。]*?都不成立（8\.2）)。/) || [])[1], '价目表 7.4 服务不成立的对象')
  other.push({ key: 'service', text: svc + '。' })
  return { text, kinds, result, other }
}

// 金币的数字（价目表 8.1、第 6 节；主持人游戏 3.2、第 8 节；开局流程 2.3、2.7、第 4 节）
function parseCoins(seats, opening) {
  const pm = read('价目表.md'), hg = read('主持人游戏.md')
  must(/一枚金币计一百分/.test(pm) && /一枚一百分/.test(pm), '价目表 8.1、铜牌：一枚金币计一百分')
  const points = 100
  const each = cnNum(must((pm.match(/开局时每人(.+?)枚，在第二条播报时出现在各人面前/) || [])[1], '价目表 8.1 开局每人几枚'))
  const [dia, thick, grams, stackMm, stackG] = nums(/直径([\d.]+) mm、厚([\d.]+) mm、约(\d+) g[\s\S]*?十枚一摞高(\d+) mm、约(\d+) g/, pm, '价目表 8.1 金币的尺寸')
  const ticketPts = must(num((pm.match(/\| 退出券一张 \| ([\d,]+) \|/) || [])[1]), '价目表 6 退出券')
  const repairPts = must(num((pm.match(/\| 修复身体残疾 \| ([\d,]+) \|/) || [])[1]), '价目表 3 修复身体残疾')
  const g8 = slice(hg, '## 8. ', null, '主持人游戏 8')
  const batch = cnNum(must((g8.match(/每一名存活在馆的参与者各得(.+?)枚金币（500 分）/) || [])[1], '主持人游戏 8 每批审判几枚'))
  const solved = cnNum(must((g8.match(/每一名存活在馆的参与者再各得(.+?)枚，合计十枚/) || [])[1], '主持人游戏 8 全部查明再几枚'))
  const unsolved = cnNum(must((g8.match(/本批案件的实际凶手再各得(.+?)枚（1,000 分）/) || [])[1], '主持人游戏 8 未能查明时凶手几枚'))
  const d01 = cnNum(must((g8.match(/给存活在馆的参与者每人(.+?)枚金币/) || [])[1], '主持人游戏 8 第一天晚上八点几枚'))
  must(/罚五百积分/.test(hg), '主持人游戏 1 违反指令罚五百积分')
  const fine = 500
  must(opening[7].effect.coins === d01 && opening[1].effect.coins === each, '开局流程与价目表、主持人游戏的金币数对不上')
  return {
    points, startEach: each, seats, startTotal: each * seats, d01, batch, solvedBonus: solved, unsolvedKiller: unsolved,
    ticket: ticketPts / points, repair: repairPts / points, fine: fine / points,
    size: { d: dia, t: thick, g: grams, stack10mm: stackMm, stack10g: stackG },
  }
}

// =====================================================================
// 主持人游戏：第 7 节机制广播的固定句式
// =====================================================================
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
  // 网站按「时点」取句：这几个键缺了，庭审与循环章会静默，所以缺一个就报错
  for (const k of ['尸体被有效发现', '同上，敲钟人生效', '调查期内又发现尸体，庭期未变', '辩论结束，主持人没有亲自开口', '判定正确', '误判', '未产生唯一结果', '骑士揭发', '愚者发动', '受命者逾期']) {
    must(fixed.find(x => x.when === k), '主持人游戏 7：广播表里没有「' + k + '」')
  }
  must(abilities.find(x => x.ability === '盲视者'), '主持人游戏 7：能力广播表里没有盲视者')
  return { fixed, abilities }
}

// =====================================================================
// 开局流程：七条播报、第一天晚上八点、规则卡、任务
// =====================================================================
function parseOpening() {
  const md = read('开局流程.md')
  const sec = slice(md, '## 2. 流程', '\n## 3. ', '开局流程 2')
  const blocks = sec.split(/\n### /).slice(1)
  const out = []
  for (const b of blocks) {
    const title = b.split('\n')[0]
    const m = title.match(/^2\.(\d+) 第(.)条播报：(.+)$/)
    if (!m) { must(/^2\.1 苏醒$/.test(title), '开局流程「' + title + '」'); continue }
    const lines = must(paras(b), '开局流程「' + title + '」的播报原文')
    const after = b.split('\n').filter(l => l.trim() && !l.startsWith('>') && l !== title).join('\n')
    const effect = {}
    const no = cnNum(m[2])
    const dl = m[3].match(/^第(.)条播报说完(.)分钟以后$/)
    if (dl) { effect.after = cnNum(dl[1]); effect.afterMin = cnNum(dl[2]) }
    if (no === 2) { effect.coins = cnNum(must((after.match(/第一句说出的同时，每人(.+?)枚金币出现在各人面前的桌上/) || [])[1], '开局 2.3 金币出现')); effect.coinsAt = 'first' }
    if (no === 3) { must(/停笔交给主持人/.test(after), '开局 2.4 停笔'); effect.hostDecides = true }
    if (no === 4) { must(/说完的那一刻，各人席位前出现一张规则卡/.test(after), '开局 2.5 规则卡'); effect.ruleCard = true }
    if (no === 5) { must(/发放身份卡/.test(lines.join('')), '开局 2.6 身份卡'); effect.identityCard = true }
    if (no === 6) { must(/这一条开口的同时，议事厅的三扇门自己打开/.test(after), '开局 2.7 门打开'); effect.hallDoorsOpen = 'start' }
    if (no === 7) { must(/紧接着第六条播报/.test(m[3]), '开局 2.8 紧接第六条'); effect.after = 6; effect.afterMin = 0; effect.hostDecides = true }
    out.push({ no, title: '第' + m[2] + '条播报', when: m[3], text: lines.join('\n\n'), lines, effect })
  }
  must(out.length === 7 && out.map(x => x.no).join() === '1,2,3,4,5,6,7', '开局流程应有第一到第七条播报')
  const s4 = slice(md, '## 4. 第一天晚上八点', null, '开局流程 4')
  const [, hhS, mmS] = must(s4.match(/D01 (\d\d):(\d\d)，主持人对全馆播报/), '开局流程 4 的时刻')
  const hh = +hhS, mm = +mmS
  const d01 = paras(s4)
  const c = cnNum(must((s4.match(/每一名存活在馆的参与者各得(.+?)枚金币/) || [])[1], '开局流程 4 每人几枚'))
  out.push({ no: 8, title: '第一天晚上八点', when: 'D01 ' + hhS + ':' + mmS, day: 1, minute: hh * 60 + mm, text: d01.join('\n\n'), lines: d01, effect: { coins: c } })
  // 规则卡：第四条播报从「一」起的原文
  const rules = out[3].lines.filter(l => /^[一二三四五六七八九十]+：/.test(l)).map(l => {
    const [, n, t] = l.match(/^([一二三四五六七八九十]+)：(.+)$/)
    return { n: cnNum(n), no: n, text: t }
  })
  must(rules.length && rules.every((r, i) => r.n === i + 1), '开局 2.5 规则应从一起连续编号')
  // 第六条播报的任务：§3 的房间表
  const s3 = slice(md, '## 3. 第六条播报里的任务', '\n## 4. ', '开局流程 3')
  const task = { rooms: {}, minutes: cnNum(must((out[5].text.match(/待满至少(.)分钟/) || [])[1], '开局 2.7 待满几分钟')), points: +must((out[5].text.match(/便可获得(\d+)积分/) || [])[1], '开局 2.7 奖励'), until: 'D01 24:00' }
  for (const m of s3.matchAll(/^\| (B1|1F|2F|3F) \| (.+) \|$/gm)) task.rooms[m[1]] = m[2].split('、')
  must(FIDS.every(f => task.rooms[f]), '开局流程 3 的房间表')
  return { opening: out, ruleCard: rules, task }
}

// =====================================================================
const M = parseMansion()
const ID = parseIdentities()
const O = parseOpening()
// 开局任务的房间：套房、廊、门厅、楼梯、电梯以外的每一间，正好就是表里的 44 间
for (const f of FIDS) {
  const want = M.rooms.filter(r => r.floor === f && r.kind === 'room' && r.name !== '门厅').map(r => r.name).sort().join()
  must([...O.task.rooms[f]].sort().join() === want, '开局流程 3：' + f + ' 的房间与物理层 1.3 对不上')
}
const seats = M.hall.seats
must(seats === 13 && M.floors.reduce((s, f) => s + f.suites.length, 0) === seats, '席位、套房应都是 13')
const world = {
  version: 'v7.11',
  generatedFrom: [
    '洋馆物理层.md §1.1 §1.2 §1.3 §1.4 §2.1 §2.2 §2.5 §3.1–3.5',
    '各室/1F_穹顶议事厅.md',
    '主持人游戏.md §5 §7 §8',
    '价目表.md 兑换方式–§6（铜牌）、§7.4 §8.2 §9（不成立）、§8.1（金币）、§10（牌外价目）',
    '开局流程.md §2 §3 §4',
  ],
  outline: M.outline,
  floors: M.floors,
  rooms: M.rooms,
  hall: M.hall,
  courts: M.courts,
  foyer: M.foyer,
  circulation: M.circulation,
  outside: M.outside,
  light: M.light,
  windows: M.windows,
  skylights: M.skylights,
  clocks: M.clocks,
  timed: M.timed,
  weather: M.weather,
  identities: ID.list,
  identityNote: ID.note,
  prices: parsePrices(),
  coins: null,
  broadcasts: parseBroadcasts(),
  opening: O.opening,
  ruleCard: O.ruleCard,
  openingTask: O.task,
}
world.coins = parseCoins(seats, O.opening)
must(world.identities.length === seats, '身份应有 ' + seats + ' 组')

const out = '/* 由 tools/build-data.mjs 从配置文件（v7.11）生成，请勿手改 */\nwindow.WORLD = ' + JSON.stringify(world, null, 1) + ';\n'
writeFileSync(join(ROOT, 'assets/data/world.js'), out)
const P = world.prices
const K = k => M.rooms.filter(r => r.kind === k).length
const doors = M.rooms.reduce((s, r) => s + r.doors.length, 0)
console.log(`rooms ${M.rooms.length} (table ${K('room') + K('suite')}: ` + FIDS.map(f => f + ' ' + M.rooms.filter(r => r.floor === f && (r.kind === 'room' || r.kind === 'suite')).length).join(' ') + `; suites ${K('suite')}; corridor ${K('corridor')}, stair ${K('stair')}, elevator ${K('elevator')}, landing ${K('landing')}, gallery ${K('gallery')}, void ${K('void')}), doors ${doors} (all matched), windows ${M.windows.length}, clocks ${M.clocks.list.length}`)
console.log(`identities ${world.identities.length}, price chapters ${P.chapters.length} (${P.chapters.reduce((a, c) => a + c.items.length, 0)} items), off-plaque ${P.offPlaque.chapters.length} (${P.offPlaque.chapters.reduce((a, c) => a + c.items.length + (c.tiers || []).length, 0)} items), void ${P.void.kinds.length}+${P.void.other.length}, broadcasts ${world.broadcasts.fixed.length}+${world.broadcasts.abilities.length}, opening ${world.opening.length}, rules ${world.ruleCard.length}, task rooms ${FIDS.map(f => world.openingTask.rooms[f].length).join('/')}, coins start ${world.coins.startTotal}`)
