/* ==========================================================
   洋馆 · mansion
   四块黑玻璃楼板等轴测叠放 → 拉开 → 依次抽出（1F → 2F → 3F → B1）放平成俯视平面
   → 光标是手提灯；表盘拨动时刻，窗光与灯按《洋馆物理层》§3.1 变化。
   手机端：楼层标签 + 可点的平面（旋转 90° 竖放），光照落在点按处。
   全部几何取自 WORLD.rooms（净内坐标，米）与《洋馆物理层》§1 §2.5 §3.2 §6。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const WORLD = window.WORLD || {}
  const LORE = window.LORE || {}
  const SVGNS = 'http://www.w3.org/2000/svg'

  /* =====================================================================
     数据
     ===================================================================== */
  const FIDS = ['B1', '1F', '2F', '3F'] // 自下而上
  const ORDER = ['1F', '2F', '3F', 'B1'] // 抽出顺序：醒来的地方在 1F
  const FMETA = {
    B1: { cn: '地下一层', level: -4.8, height: 4.8 },
    '1F': { cn: '一层', level: 0, height: 8.4 },
    '2F': { cn: '二层', level: 8.4, height: 6 },
    '3F': { cn: '三层', level: 14.4, height: 5.2 },
  }
  for (const f of (WORLD.floors || [])) if (FMETA[f.id]) { FMETA[f.id].level = f.level; FMETA[f.id].height = f.height }
  const elevText = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(2)
  const ATMOS = Array.isArray(LORE.atmosphere) ? LORE.atmosphere : []
  const atmos = (s, fb) => ATMOS.find(a => a.indexOf(s) >= 0) || fb

  const ROOMS = {}
  for (const f of FIDS) ROOMS[f] = []
  for (const r of (WORLD.rooms || [])) {
    if (!ROOMS[r.floor]) continue
    const key = r.floor + '/' + r.name
    const lore = (LORE.rooms && LORE.rooms[key]) || {}
    const sm = /^(\d+)号套房$/.exec(r.name)
    ROOMS[r.floor].push({
      key, floor: r.floor, name: r.name,
      x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1,
      w: r.x1 - r.x0, h: r.y1 - r.y0, cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2,
      doors: r.doors || [], parent: r.parent || null, suite: sm ? +sm[1] : 0,
      win: !!lore.windows, mood: lore.mood || '',
      objects: (lore.objects || []).slice(0, 4), weapons: lore.weapons || [],
      surface: lore.floorSurface && lore.floorSurface !== '未注明' ? lore.floorSurface : '',
    })
  }
  for (const f of FIDS) ROOMS[f].sort((a, b) => (a.parent ? 1 : 0) - (b.parent ? 1 : 0))
  const roomByKey = {}
  for (const f of FIDS) for (const r of ROOMS[f]) roomByKey[r.key] = r

  // §3.2 窗的位置（全部）：[房名, 墙 x, y0, y1]
  const WINDOWS = { B1: [], '1F': [], '2F': [], '3F': [] }
  ;[['1F', 1], ['2F', 6], ['3F', 11]].forEach(([f, n]) => {
    WINDOWS[f].push([n + '号套房', 0, 2.9, 5.3], [n + 1 + '号套房', 0, 30.7, 33.1], [n + 2 + '号套房', 24.4, 12.0, 14.4], [n + 3 + '号套房', 52, 2.9, 5.3], [n + 4 + '号套房', 52, 30.7, 33.1])
  })
  WINDOWS['1F'].push(['自然史大厅', 0, 10.2, 25.8], ['宴饮厅', 52, 20.0, 25.8])
  WINDOWS['2F'].push(['大图书室', 0, 10.2, 25.8])
  WINDOWS['3F'].push(['标本陈列室', 52, 20.0, 25.8])

  // §3.3 五只钟
  const CLOCKS = { B1: [], '1F': [[24.42, 4.9, 1], [26, 35.62, 0], [44.9, 18.58, 0]], '2F': [[11.3, 7.82, 0]], '3F': [[11.3, 7.82, 0]] }

  // 名签位置（避开中央陈设）
  const LABEL_AT = {
    '1F/穹顶议事厅': [26, 23.25], '1F/迎宾前厅': [26, 6.25], '1F/自然史大厅': [11.6, 18.2], '1F/宴饮厅': [44.9, 19.6],
    '1F/厨房套区': [42.6, 16.4], '1F/音乐沙龙': [31.1, 13.4], '2F/地图与地球仪室': [31.1, 16.6], '2F/大图书室': [8, 18],
    '2F/私人放映厅': [44.9, 18.5], '2F/游戏酒廊': [46.5, 13.2], '2F/挂毯长厅': [26, 31.2], '2F/中央藏画厅': [29.3, 6.2],
    '3F/珍稀花园': [4.6, 17.55], '3F/天象室': [31, 23.1], '3F/晨间餐室': [29.3, 7.0], '3F/猎藏厅': [41.5, 23.1],
    '3F/北端景廊': [26, 33.6], '3F/标本陈列室': [48.7, 23], 'B1/玉石泳池厅': [7.1, 10.2], 'B1/双道保龄球馆': [20.7, 12.5],
    'B1/珍酿酒窖': [42.2, 21.3], 'B1/乒乓体育室': [23.4, 21.9], 'B1/体能训练室': [23.4, 30.8], 'B1/地下会客前厅': [29.3, 4.1],
    'B1/物资库': [41.4, 2.8], 'B1/洗衣布草室': [48.5, 34.6],
  }
  // B1 没有套房编号：八间主厅的房名像套房编号一样常显（暗铜，灯照处发亮）。
  // [x, y, 字号, 竖排]，位置避开陈设；d 桌面（北向上），m 手机（转 90°，横排沿南北向）
  const B1_NAMES = {
    玉石泳池厅: { d: [7.1, 10.2, 1.0], m: [12.15, 18, 1.2] },
    双道保龄球馆: { d: [36.2, 9.58, 0.95], m: [36.2, 9.58, 1.1, 1] }, // 球道南侧的空带
    珍酿酒窖: { d: [42.2, 23.3, 0.95, 1], m: [42.2, 23.3, 1.1] },
    乒乓体育室: { d: [23.4, 22.0, 0.95], m: [19.7, 24.6, 1.1] },
    体能训练室: { d: [25.3, 31.6, 0.9], m: [27.4, 32.4, 1.05] },
    地下会客前厅: { d: [29.3, 4.1, 0.9], m: [26, 4.1, 1.05] },
    物资库: { d: [41.4, 2.8, 0.8], m: [41.4, 2.8, 0.9] },
    洗衣布草室: { d: [48.3, 29.6, 0.9], m: [50.7, 31.0, 1.0] },
  }

  /* =====================================================================
     门：把房间表里有坐标的门汇成门洞，再在两侧的墙线上开缺口
     ===================================================================== */
  function compileDoors(rooms, fid) {
    const out = []
    const byName = {}
    for (const r of rooms) byName[r.name] = r
    for (const r of rooms) for (const d of r.doors) {
      if (d.at == null || !d.width || !d.dir) continue
      let o, line
      if (d.dir === '西') { o = 'v'; line = r.x0 } else if (d.dir === '东') { o = 'v'; line = r.x1 }
      else if (d.dir === '南') { o = 'h'; line = r.y0 } else if (d.dir === '北') { o = 'h'; line = r.y1 } else continue
      const other = byName[d.to]
      const raw = d.raw || ''
      const open = !!d.open || (/口/.test(raw) && !/门/.test(raw)) ||
        !!(other && other.doors.some(x => x.to === r.name && x.open)) || r.doors.some(x => x.to === d.to && x.open)
      const ex = out.find(q => q.o === o && Math.abs(q.line - line) <= 0.45 && Math.abs(q.at - d.at) < 0.1)
      if (ex) { ex.open = ex.open || open; continue }
      out.push({ o, line, at: d.at, a: d.at - d.width / 2, b: d.at + d.width / 2, open, side: d.dir })
    }
    if (fid === '1F') out.push({ o: 'h', line: 0, at: 26, a: 24.8, b: 27.2, open: false, side: '南', exterior: true })
    return out
  }

  function roomSegments(r, doors) {
    const segs = []
    const sides = [['h', r.y0, r.x0, r.x1], ['h', r.y1, r.x0, r.x1], ['v', r.x0, r.y0, r.y1], ['v', r.x1, r.y0, r.y1]]
    for (const [o, line, a, b] of sides) {
      const push = (s, e) => segs.push(o === 'h' ? [s, line, e, line] : [line, s, line, e])
      const gaps = doors
        .filter(d => d.o === o && Math.abs(d.line - line) <= 0.45 && d.at > a + 0.01 && d.at < b - 0.01)
        .map(d => [Math.max(a, d.a), Math.min(b, d.b)])
        .sort((p, q) => p[0] - q[0])
      let cur = a
      for (const [ga, gb] of gaps) { if (ga > cur + 0.005) push(cur, ga); cur = Math.max(cur, gb) }
      if (b > cur + 0.005) push(cur, b)
    }
    return segs
  }

  /* =====================================================================
     陈设（米；只画配置里写明的东西，位置未写明处取合理近似）
     ===================================================================== */
  const Fr = (x0, y0, x1, y1) => ({ t: 'r', x0, y0, x1, y1 })
  const Fc = (cx, cy, r) => ({ t: 'c', cx, cy, r })
  const Fl = (x0, y0, x1, y1) => ({ t: 'l', x0, y0, x1, y1 })
  const Fp = (pts, close) => ({ t: 'p', pts, close })

  function treads(L, x0, x1, y0, y1, step) { for (let y = y0 + step; y < y1 - 0.02; y += step) L.push(Fl(x0, y, x1, y)) }
  function seatRow(L, cx0, cy, n, step, w, d) { for (let i = 0; i < n; i++) { const x = cx0 + i * step; L.push(Fr(x - w / 2, cy - d / 2, x + w / 2, cy + d / 2)) } }

  function furnitureFor(fid) {
    const L = []
    // —— 三座楼梯（四层同位）——
    L.push(Fl(17.4, 2.5, 23.8, 2.5))
    for (const [a, b] of [[18.3, 20.1], [21.1, 22.9]]) { L.push(Fr(a, 2.75, b, 7.9)); treads(L, a, b, 2.75, 7.9, 0.28) }
    L.push(Fr(20.25, 2.9, 20.95, 7.75))
    for (const [h0, h1] of [[8.4, 14.2], [37.8, 43.6]]) {
      L.push(Fl(h0, 34.6, h1, 34.6))
      for (const [a, b] of [[h0 + 0.45, h0 + 1.75], [h1 - 1.75, h1 - 0.45]]) { L.push(Fr(a, 30.35, b, 34.6)); treads(L, a, b, 30.35, 34.6, 0.27) }
      L.push(Fr(h0 + 1.95, 30.6, h1 - 1.95, 34.4))
    }
    // —— 主廊双扇廊门（§1.2）与廊内展柜（§6.4）——
    const corridorDoor = (x0, x1, y) => { const m = (x0 + x1) / 2; L.push(Fl(x0 + 0.2, y, m - 0.03, y), Fl(m + 0.03, y, x1 - 0.2, y), Fl(x0 + 0.2, y - 0.12, x0 + 0.2, y + 0.12), Fl(x1 - 0.2, y - 0.12, x1 - 0.2, y + 0.12)) }
    corridorDoor(14.4, 17.2, 9.4); corridorDoor(14.4, 17.2, 26.6)
    if (fid === 'B1') corridorDoor(34.8, 37.6, 26.6)
    else { corridorDoor(34.8, 37.6, 9.4); corridorDoor(34.8, 37.6, 26.6) }
    const cab = (x0, ys) => ys.forEach(y => L.push(Fr(x0, y - 0.65, x0 + 0.35, y + 0.65)))
    const CABS = { B1: [[14.4, [20.7, 30.3]], [34.8, [1]], [34.8, [34.3]]], '1F': [[14.4, [17.5, 33.5]], [34.8, [1, 17.5, 33.5]]], '2F': [[14.4, [17.5, 30.3]], [34.8, [17.5, 30.3]]], '3F': [[14.4, [17.5, 30.3]], [34.8, [17.5, 30.3]]] }
    for (const [x0, ys] of CABS[fid]) cab(x0, ys)

    if (fid === '1F') {
      // 穹顶议事厅：墨玉圆盘 8.4、青白玉圆桌 4.8、十五把椅（1 号正北，顺时针）
      L.push(Fc(26, 29, 2.4), Fc(26, 29, 2.28))
      for (let i = 0; i < 15; i++) {
        const a = (i * 24) * Math.PI / 180, R = 2.95, sx = Math.sin(a), cy = Math.cos(a)
        const px = 26 + sx * R, py = 29 + cy * R, tx = cy, ty = -sx
        const hw = 0.31, hd = 0.27
        L.push(Fp([[px + tx * hw + sx * hd, py + ty * hw + cy * hd], [px - tx * hw + sx * hd, py - ty * hw + cy * hd], [px - tx * hw - sx * hd, py - ty * hw - cy * hd], [px + tx * hw - sx * hd, py + ty * hw - cy * hd]], true))
      }
      L.push(Fr(17.6, 27.8, 18.15, 30.2), Fr(21.3, 35.45, 23.5, 36), Fr(28.5, 35.45, 30.7, 36))
      // 迎宾前厅：罗盘花（26, 4.1）、黑玉环、两尊圆雕基座、沉香案、乌木长椅
      const st = []
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 0.2 : (i % 4 ? 0.42 : 0.6); st.push([26 + Math.sin(a) * r, 4.1 + Math.cos(a) * r]) }
      L.push(Fp(st, true), Fc(26, 4.1, 1.15), Fc(26, 4.1, 1.07))
      L.push(Fr(24.3, 7.5, 25.0, 8.2), Fr(27.0, 7.5, 27.7, 8.2), Fr(31.8, 7.55, 34.4, 8.2), Fr(32.5, 1.0, 33.0, 3.1), Fr(25.1, 0.6, 27.2, 1.05))
      // 列柱序廊：十根白玉柱与墨玉带
      for (const y of [9.2, 11.0, 12.8, 14.6, 16.4]) L.push(Fr(24.6, y - 0.15, 24.85, y + 0.15), Fr(27.15, y - 0.15, 27.4, y + 0.15))
      L.push(Fl(25.4, 8.4, 25.4, 18), Fl(26.6, 8.4, 26.6, 18))
      // 自然史大厅：霸王龙展台 14×5（头朝北）、双胸六足兽骨架展台、展柜、长椅
      L.push(Fr(0.8, 11.2, 5.8, 25.2), Fp([[3.3, 24.4], [3.0, 22.6], [3.5, 20.0], [3.1, 17.0], [3.4, 14.6], [3.3, 12.0]]))
      for (let y = 15.4; y <= 21.0; y += 0.7) L.push(Fl(2.5, y, 4.1, y))
      L.push(Fp([[2.9, 24.4], [3.3, 25.0], [3.7, 24.4]], true))
      L.push(Fr(7.2, 16.0, 9.7, 20.5), Fr(5.9, 26.9, 8.3, 27.6), Fr(8.5, 26.9, 10.9, 27.6), Fr(9.6, 8.6, 11.6, 9.4))
      // 音乐沙龙：三角钢琴、竖琴、北侧十二座
      L.push(Fp([[28.2, 9.0], [29.78, 9.0], [29.78, 10.2], [29.5, 11.2], [29.0, 11.75], [28.5, 11.6], [28.2, 11.0]], true), Fp([[33.2, 9.2], [33.9, 9.2], [33.4, 10.4]], true))
      for (const y of [15.3, 16.1, 16.9]) seatRow(L, 29.6, y, 4, 1.0, 0.5, 0.45)
      // 典礼前厅
      L.push(Fr(18.0, 18.5, 21.0, 19.0), Fr(31.0, 21.2, 34.0, 21.6))
      // 厨房套区、宴饮厅（十六把高背椅）
      L.push(Fr(40.9, 12.5, 44.3, 13.9), Fr(38.2, 8.4, 44.2, 9.15), Fr(40.0, 16.6, 42.6, 17.4))
      L.push(Fr(42.0, 22.15, 47.8, 23.65))
      for (let i = 0; i < 7; i++) { const x = 42.45 + i * 0.82; L.push(Fr(x - 0.25, 21.45, x + 0.25, 21.95), Fr(x - 0.25, 23.85, x + 0.25, 24.35)) }
      L.push(Fr(41.3, 22.65, 41.8, 23.15), Fr(48.0, 22.65, 48.5, 23.15), Fr(51.4, 19.0, 52, 22.2), Fr(51.4, 22.9, 52, 26.1))
      // 晨间厅、西南起居厅
      L.push(Fc(40.7, 2.2, 0.675), Fr(38.4, 5.4, 40.1, 6.0), Fr(41.3, 5.4, 43.0, 6.0), Fr(9.0, 3.4, 10.4, 4.15), Fr(9.4, 0, 11.8, 0.45))
    }
    if (fid === '2F') {
      // 大图书室：西墙十四座、南北墙各八座书柜，四张阅读桌
      L.push(Fr(0, 8.9, 0.4, 27.1)); for (let i = 1; i < 14; i++) L.push(Fl(0, 8.9 + i * 1.3, 0.4, 8.9 + i * 1.3))
      for (const [y0, y1] of [[8.4, 8.8], [27.2, 27.6]]) { L.push(Fr(0.4, y0, 10.8, y1)); for (let i = 1; i < 8; i++) L.push(Fl(0.4 + i * 1.3, y0, 0.4 + i * 1.3, y1)) }
      L.push(Fr(4.8, 14.6, 7.2, 15.8), Fr(8.6, 14.6, 11.0, 15.8), Fr(4.8, 20.2, 7.2, 21.4), Fr(8.6, 20.2, 11.0, 21.4), Fc(2.4, 12.4, 0.5), Fc(2.4, 23.6, 0.5))
      // 中央藏画厅：南墙《解剖课》、烟晶罩柜、长椅
      L.push(Fr(28.1, 0, 30.5, 0.12), Fr(28.4, 3.7, 30.2, 4.5), Fr(26.2, 2.0, 28.2, 2.5), Fr(30.4, 5.9, 32.4, 6.4))
      for (const [x, y, o] of [[24.05, 4.1, 'v'], [24.05, 6.6, 'v'], [34.55, 2.2, 'v'], [34.55, 6.0, 'v'], [29.3, 8.1, 'h'], [32.3, 8.1, 'h'], [25.6, 0.08, 'h'], [33.0, 0.08, 'h']]) {
        L.push(o === 'v' ? Fl(x, y - 0.45, x, y + 0.45) : Fl(x - 0.5, y, x + 0.5, y))
      }
      // 地图与地球仪室
      L.push(Fc(31.1, 13.2, 0.7), Fl(30.4, 13.2, 31.8, 13.2), Fc(29.0, 13.2, 0.4), Fr(28.6, 8.4, 30.4, 9.5), Fr(31.8, 8.4, 33.6, 9.5))
      // 书画工作室、棋艺室、挂毯长厅
      L.push(Fr(18.6, 24.6, 21.0, 25.7), Fr(22.0, 24.6, 24.4, 25.7), Fr(18.2, 29.45, 21.4, 30))
      for (const [x, y] of [[27.6, 24.2], [30.3, 27.4], [33.0, 24.2]]) { L.push(Fr(x - 0.6, y - 0.6, x + 0.6, y + 0.6), Fr(x - 0.24, y - 0.24, x + 0.24, y + 0.24)) }
      L.push(Fr(28.2, 29.55, 30.4, 30), Fr(20.0, 31.9, 32.0, 34.3))
      for (const x0 of [18.4, 22.4, 26.4]) L.push(Fr(x0, 35.86, x0 + 3.2, 36))
      for (const x0 of [21.0, 28.4]) L.push(Fr(x0, 30.2, x0 + 2.6, 30.34))
      // 游戏酒廊：台球桌
      L.push(Fr(39.2, 12.0, 42.1, 13.65), Fr(39.4, 12.2, 41.9, 13.45))
      for (const [x, y] of [[39.4, 12.2], [40.65, 12.2], [41.9, 12.2], [39.4, 13.45], [40.65, 13.45], [41.9, 13.45]]) L.push(Fc(x, y, 0.08))
      L.push(Fr(44.2, 9.6, 46.0, 11.4), Fr(48.0, 13.0, 50.0, 15.0))
      // 私人放映厅：北墙银幕，十五座三排
      L.push(Fr(42.0, 27.4, 47.8, 27.6))
      for (const y of [21.2, 22.7, 24.2]) seatRow(L, 43.0, y, 5, 0.95, 0.78, 0.6)
      L.push(Fc(44.9, 17.9, 0.2))
      // 西南阅览厅、东南起居厅、公共药柜
      L.push(Fc(10.4, 4.6, 0.55), Fr(9.3, 0, 11.1, 0.8), Fr(9.0, 7.8, 10.4, 8.2), Fr(12.0, 7.8, 13.4, 8.2), Fr(13.95, 0.8, 14.2, 1.7))
      L.push(Fr(39.95, 3.75, 41.45, 4.45), Fr(38.4, 2.6, 39.3, 5.6), Fr(42.1, 2.6, 43.0, 5.6), Fr(39.5, 7.7, 41.9, 8.2))
      // 手稿书廊：两侧浅龛
      for (const y of [9.4, 11.2, 13.0, 14.8, 16.6]) L.push(Fr(24.6, y - 0.3, 24.8, y + 0.3), Fr(27.2, y - 0.3, 27.4, y + 0.3))
    }
    if (fid === '3F') {
      // 珍稀花园：八座种植床（§6.5 原坐标）、泉盘、长凳
      for (const [x0, x1, y0, y1] of [[0.8, 3.8, 9.5, 11.5], [5.4, 8.4, 9.5, 11.5], [0.8, 3.8, 14, 16], [5.4, 8.4, 14, 16], [0.8, 3.8, 19, 21], [5.4, 8.4, 19, 21], [0.8, 3.8, 24, 26], [5.4, 8.4, 24, 26]]) {
        L.push(Fr(x0, y0, x1, y1)); L.push(Fl(x0 + 0.5, (y0 + y1) / 2, x1 - 0.5, (y0 + y1) / 2))
      }
      L.push(Fc(12.2, 20.8, 0.6), Fc(12.2, 20.8, 0.2), Fr(10.8, 17.2, 13.8, 17.8), Fr(10.8, 25.4, 13.8, 26.0), Fl(8.7, 8.6, 8.7, 27.4), Fl(10.5, 13.6, 10.5, 27.4))
      // 天象室：太阳系仪（八条银臂）、天球仪、两座罩柜
      L.push(Fc(31, 26.9, 1.6))
      for (let i = 1; i <= 8; i++) L.push(Fc(31, 26.9, 0.16 + i * 0.13))
      L.push(Fc(31, 26.9, 0.12), Fc(31, 30.6, 0.55), Fr(27.4, 25.8, 28.05, 28.0), Fr(33.95, 25.8, 34.6, 28.0))
      // 晨间餐室：三张圆桌；瓷器茶室：圆茶桌
      L.push(Fc(27.4, 5.2, 0.725), Fc(31.2, 5.2, 0.725), Fc(29.3, 2.4, 0.725), Fr(27.5, 0, 31.1, 0.65), Fr(28.1, 7.75, 30.5, 8.2))
      L.push(Fc(40.7, 4.1, 0.75), Fr(39.5, 0, 41.9, 0.45), Fr(39.5, 7.75, 41.9, 8.2))
      // 兰香小厅：三折白玉屏风、榻、茶几
      L.push(Fp([[10.1, 7.9], [10.9, 7.55], [11.7, 7.9], [12.5, 7.55]]), Fr(10.6, 3.6, 12.0, 4.3), Fr(10.45, 2.5, 12.15, 3.0), Fr(10.45, 4.9, 12.15, 5.4))
      // 观花茶厅、北端景廊
      L.push(Fr(18.6, 24.2, 21.4, 25.05), Fr(18.6, 27.6, 21.4, 28.45), Fc(25.6, 24.0, 0.45), Fr(23.7, 30.4, 27.1, 30.9), Fr(19.9, 35.65, 32.1, 36), Fr(25.0, 33.6, 27.0, 34.5))
      // 舞蹈排练室：东墙银背镜、西墙把杆
      L.push(Fl(51.9, 9.2, 51.9, 17.2), Fl(38.0, 9.0, 38.0, 12.4), Fl(38.0, 14.0, 38.0, 17.4), Fl(38.15, 9.0, 38.15, 12.4), Fl(38.15, 14.0, 38.15, 17.4))
      // 猎藏厅、标本陈列室
      L.push(Fr(42.4, 25.4, 45.0, 27.4), Fr(41.8, 18.6, 45.0, 19.9), Fr(39.5, 21.4, 42.5, 25.4), Fl(37.85, 21.2, 37.85, 22.1), Fl(37.85, 23.9, 37.85, 24.8))
      L.push(Fr(46.4, 18.2, 50.4, 18.75), Fr(46.4, 27.05, 50.4, 27.6), Fr(47.0, 20.4, 49.4, 21.4), Fr(47.0, 24.4, 49.4, 25.4), Fr(51.35, 21.9, 52, 23.9))
      // 手工与修复室
      L.push(Fr(28.6, 12.2, 31.0, 13.3), Fr(31.4, 12.2, 33.8, 13.3), Fr(34.0, 14.4, 34.6, 17.8))
      // 香木廊十龛
      for (const y of [9.4, 11.2, 13.0, 14.8, 16.6]) L.push(Fr(24.6, y - 0.3, 24.8, y + 0.3), Fr(27.2, y - 0.3, 27.4, y + 0.3))
    }
    if (fid === 'B1') {
      // 玉石泳池厅：水面 6×12（池岸东西 4.1、南北 3.6）、扶梯、躺椅
      L.push(Fr(4.1, 12, 10.1, 24), Fr(4.25, 12.15, 9.95, 23.85))
      for (let y = 14; y < 24; y += 2.2) L.push(Fp([[4.6, y], [5.6, y - 0.12], [6.6, y], [7.6, y - 0.12], [8.6, y], [9.6, y - 0.12]]))
      L.push(Fl(3.85, 12.8, 3.85, 13.4), Fl(10.35, 12.8, 10.35, 13.4))
      for (const y of [11.0, 12.2, 13.4, 22.6, 23.8, 25.0]) L.push(Fr(1.0, y - 0.3, 2.9, y + 0.3))
      L.push(Fr(5.6, 26.9, 8.6, 27.6))
      // 冷热浴疗室：两座墨玉方池
      L.push(Fr(0.2, 28.4, 2.6, 30.6), Fr(0.4, 28.6, 2.4, 30.4), Fr(0.2, 32.6, 2.6, 34.8), Fr(0.4, 32.8, 2.4, 34.6))
      // 泳池机房
      L.push(Fc(4.9, 31.4, 0.45), Fc(4.9, 32.6, 0.45), Fr(4.2, 29.0, 5.0, 30.0), Fr(5.3, 35.4, 7.9, 36))
      // 双道保龄球馆：双道 3.51 m，设备段 x=24—49.41
      L.push(Fr(24, 10.745, 49.41, 14.255), Fl(24, 12.275, 49.41, 12.275), Fl(24, 12.725, 49.41, 12.725))
      for (const [g0, g1] of [[10.745, 12.275], [12.725, 14.255]]) {
        L.push(Fl(26.0, g0 + 0.24, 47.4, g0 + 0.24), Fl(26.0, g1 - 0.24, 47.4, g1 - 0.24))
        const cy = (g0 + g1) / 2
        let k = 0
        for (let row = 0; row < 4; row++) for (let j = 0; j <= row; j++) { L.push(Fc(47.7 + row * 0.26, cy + (j - row / 2) * 0.3, 0.05)); k++ }
      }
      L.push(Fl(47.4, 10.745, 47.4, 14.255), Fr(18.2, 9.0, 22.4, 9.6), Fr(18.2, 15.4, 20.0, 16.0), Fr(21.6, 15.4, 23.4, 16.0))
      // 运动休息厅、乒乓体育室、体能训练室
      for (const x of [18.2, 21.2, 24.2]) L.push(Fr(x, 16.8, x + 2, 17.3))
      L.push(Fr(22.03, 23.84, 24.77, 25.36), Fl(23.4, 23.84, 23.4, 25.36))
      L.push(Fr(22, 33.7, 22.9, 35.8), Fr(24, 33.7, 24.9, 35.8), Fr(18.6, 29.2, 21.0, 31.2), Fr(23.0, 29.2, 25.6, 29.6), Fl(29.35, 30.6, 29.35, 34.6))
      // 地下会客前厅：两组坐席围海蓝宝石低桌
      L.push(Fr(28.6, 1.6, 30.0, 2.4), Fr(28.6, 5.8, 30.0, 6.6), Fr(28.0, 0.7, 30.6, 1.2), Fr(28.0, 6.95, 30.6, 7.45), Fr(30.0, 7.6, 33.6, 8.2))
      // 物资库四座货架、工具修理室工作台
      for (const [y0, y1] of [[1.3, 2.1], [3.5, 4.3]]) L.push(Fr(38.0, y0, 40.8, y1), Fr(42.0, y0, 44.8, y1))
      L.push(Fr(45.2, 4.75, 48.2, 5.6), Fr(45.2, 0, 49.0, 0.65), Fr(51.65, 1.6, 52, 3.8), Fr(47.8, 2.2, 49.4, 3.0))
      // 珍酿酒窖八组酒架、品酒室、洗衣布草室
      for (const y of [20.0, 22.0, 24.0, 26.0]) {
        for (const [a, b] of [[39.2, 41.2], [43.2, 45.2]]) { L.push(Fr(a, y, b, y + 0.6)); for (let x = a + 0.4; x < b; x += 0.4) L.push(Fl(x, y, x, y + 0.6)) }
      }
      L.push(Fr(41.2, 27.0, 43.2, 27.6), Fr(48.8, 20.4, 50.0, 22.6), Fr(46.8, 26.9, 49.6, 27.6))
      for (const y of [28.6, 29.4, 30.2, 31.0]) L.push(Fr(43.8, y - 0.35, 44.45, y + 0.35), Fc(44.12, y, 0.22))
      L.push(Fr(46.4, 31.2, 49.4, 32.6), Fr(48.0, 35.45, 50.0, 36))
    }
    return L
  }

  /* =====================================================================
     视图映射：桌面北向上；手机顺时针转 90°（北向右，东向下）
     ===================================================================== */
  const r3 = v => Math.round(v * 1000) / 1000
  function makeView(rot) {
    const P = rot ? (x, y) => [y, x] : (x, y) => [x, 36 - y]
    const vb = rot ? { x: -3.3, y: -1.8, w: 41.1, h: 55.6 } : { x: -1.8, y: -1.8, w: 55.6, h: 41.1 }
    const inv = rot ? (X, Y) => [Y, X] : (X, Y) => [X, 36 - Y]
    return {
      rot, P, vb, inv,
      pt(x, y) { const p = P(x, y); return r3(p[0]) + ' ' + r3(p[1]) },
      rect(x0, y0, x1, y1) { const a = P(x0, y0), b = P(x1, y1); return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) } },
    }
  }
  function primD(view, p) {
    if (p.t === 'r') return 'M' + view.pt(p.x0, p.y0) + 'L' + view.pt(p.x1, p.y0) + 'L' + view.pt(p.x1, p.y1) + 'L' + view.pt(p.x0, p.y1) + 'Z'
    if (p.t === 'l') return 'M' + view.pt(p.x0, p.y0) + 'L' + view.pt(p.x1, p.y1)
    if (p.t === 'c') { const c = view.P(p.cx, p.cy), r = r3(p.r); return `M${r3(c[0] - p.r)} ${r3(c[1])}a${r} ${r} 0 1 0 ${r3(2 * p.r)} 0a${r} ${r} 0 1 0 ${r3(-2 * p.r)} 0` }
    if (p.t === 'p') return p.pts.map((q, i) => (i ? 'L' : 'M') + view.pt(q[0], q[1])).join('') + (p.close ? 'Z' : '')
    return ''
  }

  function mk(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag)
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(n)
    return n
  }
  // 平面以「米」为单位，字号常在 0.3–0.7；Chrome 会按极小字号把整层的合成边界撑到几万像素。
  // 所以文字一律放大 TK 倍排版，再整体缩回去。
  const TK = 20
  function txt(parent, x, y, fs, str, attrs, rot) {
    const tr = `translate(${r3(x)} ${r3(y)})` + (rot ? ` rotate(${rot})` : '') + ` scale(${1 / TK})`
    const t = mk('text', Object.assign({ transform: tr, 'font-size': r3(fs * TK) }, attrs || {}), parent)
    if (str != null) t.textContent = str
    return t
  }
  // 平面上的常驻文字改用 HTML：SVG <text> 会按祖先变换的缩放重排字形，楼板随光标视差、随滚动缩放时
  // 整层每帧重画；HTML 文字不随变换重排。文字层里 1em = 1 个 svg 单位（米），位置用百分比，整层再按视窗缩放。
  const TXK = 24
  function txLayer(view, cls) {
    const vb = view.vb
    return U.el('div.mz-tx' + (cls ? '.' + cls : ''), { 'aria-hidden': 'true', style: { fontSize: TXK + 'px', width: r3(vb.w * TXK) + 'px', height: r3(vb.h * TXK) + 'px' } })
  }
  // anchor：m 居中 / e 右对齐 / s 左对齐；vert：竖排行距（字号的倍数）
  function htx(parent, view, x, y, fs, str, cls, opt) {
    const vb = view.vb
    const o = opt || {}
    const s = U.el('span.mz-t' + (o.anchor === 'e' ? '.is-e' : o.anchor === 's' ? '.is-s' : '') + (o.vert ? '.is-v' : '') + (cls ? '.' + cls : ''))
    s.style.left = r3((x - vb.x) / vb.w * 100) + '%'
    s.style.top = r3((y - vb.y) / vb.h * 100) + '%'
    s.style.fontSize = r3(fs) + 'em'
    if (o.ls) s.style.letterSpacing = o.ls + 'em'
    if (o.vert) s.style.lineHeight = o.vert
    s.textContent = o.vert ? Array.from(String(str)).join('\n') : String(str)
    parent.appendChild(s)
    return s
  }
  function stops(g, list) { for (const [o, c, a] of list) mk('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g) }
  const rectAttrs = (r, extra) => Object.assign({ x: r3(r.x), y: r3(r.y), width: r3(r.w), height: r3(r.h) }, extra || {})
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

  /* =====================================================================
     光（§3.1）
     ===================================================================== */
  function lightAt(min) {
    const h = ((((min % 1440) + 1440) % 1440)) / 60
    let win = 0
    if (h >= 5 && h < 7) win = (h - 5) / 2
    else if (h >= 7 && h < 17) win = 1
    else if (h >= 17 && h < 19) win = 1 - (h - 17) / 2
    const low = h >= 23 || h < 5
    // 边界处 15 分钟的连续过渡（不用 CSS 过渡：拖动/滚动本身就是连续的）
    const ramp = (a, b) => Math.min(1, Math.max(0, (h - a) / (b - a)))
    const lowK = h >= 23 ? ramp(23, 23.25) : h < 5 ? 1 : 1 - ramp(5, 5.25)
    const offK = h >= 7 && h < 17 ? ramp(7, 7.25) : h >= 17 && h < 17.25 ? 1 - ramp(17, 17.25) : 0
    // 灯的明暗分四档过渡（不再随每一分钟连续变）：每变一档，楼板的线稿就得整层重画一次
    const lowQ = Math.round(lowK * 4) / 4, offQ = Math.round(offK * 4) / 4
    const lampO = 1 - 0.7 * lowQ
    const lampW = lampO * (1 - offQ)
    const day = h >= 7 && h < 17
    return { h, win: Math.round(win * 24) / 24, low, day, lampO, lampW, dim: 1 - 0.34 * lowQ }
  }
  // 低亮：软边圆窗的半亮处约在三米（CSS 在低亮时段把圆窗的实心核放大）
  const LAN_R = { normal: 7.5, low: 4.2, stack: 9.5 }

  /* =====================================================================
     建一层：底图（静态）+ 暖光池 + 灯照层（经由移动的软边圆窗显出）+ 动效层/命中层
     手提灯只移动合成层，不重绘大图。
     ===================================================================== */
  function buildFloor(fid, view) {
    const uid = 'mz' + (view.rot ? 'm' : 'd') + fid
    const url = s => `url(#${uid}-${s})`
    const rooms = ROOMS[fid]
    const doors = compileDoors(rooms, fid)
    const vb = view.vb
    const vbStr = [vb.x, vb.y, vb.w, vb.h].join(' ')
    const newSvg = (cls, extra) => mk('svg', Object.assign({ class: 'mz-svg ' + cls, viewBox: vbStr, preserveAspectRatio: 'xMidYMid meet', 'data-floor': fid }, extra || {}))
    const base = newSvg('mz-base', { 'aria-hidden': 'true' })
    const lit = newSvg('mz-lit', { 'aria-hidden': 'true' })
    const fx = newSvg('mz-fx', { role: 'img', 'aria-label': FMETA[fid].cn })
    const defs = mk('defs', {}, base)
    for (const [k, x1, y1, x2, y2] of [['r', 0, 0, 1, 0], ['l', 1, 0, 0, 0], ['d', 0, 0, 0, 1], ['u', 0, 1, 0, 0]]) {
      const g = mk('linearGradient', { id: uid + '-sp' + k, x1, y1, x2, y2 }, defs)
      stops(g, [[0, '#f4ecdc', 0.5], [0.5, '#e9dec7', 0.13], [1, '#e9dec7', 0]])
    }
    const sheen = mk('linearGradient', { id: uid + '-sh', x1: 0, y1: 0, x2: 1, y2: 0.7 }, defs)
    stops(sheen, [[0, '#ebe3d6', 0.05], [0.3, '#ebe3d6', 0], [0.62, '#ebe3d6', 0], [0.66, '#ebe3d6', 0.045], [0.7, '#ebe3d6', 0], [1, '#ebe3d6', 0.02]])

    const ext = view.rect(-0.4, -0.4, 52.4, 36.4)
    const txBase = txLayer(view, 'mz-tx-base')
    const txLit = txLayer(view, 'mz-tx-lit')
    // dimEls：随低亮时段变暗的少数元素（--mz-dim 只写给它们，不写在根节点上让上万个节点重算样式）
    const fl = { fid, view, base, lit, fx, txBase, txLit, svgs: [base, lit, fx], uid, rooms, roomEls: {}, clocks: [], ext, dimEls: [] }

    // —— 楼板：黑玻璃 ——
    mk('rect', rectAttrs(ext, { class: 'mz-slab-fill' }), base)
    // 地下一层：墙是实心的岩体，房间从岩里掏出来（外框 − 房间 − 门洞，evenodd）
    let rockD = ''
    if (fid === 'B1') {
      const rp = (x0, y0, x1, y1) => primD(view, Fr(x0, y0, x1, y1))
      rockD = rp(-0.4, -0.4, 52.4, 36.4)
      for (const r of rooms) if (!r.parent) rockD += rp(r.x0, r.y0, r.x1, r.y1)
      for (const d of doors) {
        if (d.exterior) continue
        const t = (d.side === '西' || d.side === '南') ? [d.line - 0.2, d.line] : [d.line, d.line + 0.2]
        rockD += d.o === 'v' ? rp(t[0], d.a, t[1], d.b) : rp(d.a, t[0], d.b, t[1])
      }
      fl.dimEls.push(mk('path', { d: rockD, class: 'mz-rock', 'fill-rule': 'evenodd' }, base))
      // 水面：玉石泳池与冷热两池
      fl.waterD = [[4.25, 12.15, 9.95, 23.85], [0.4, 28.6, 2.4, 30.4], [0.4, 32.8, 2.4, 34.6]].map(q => rp(...q)).join('')
      fl.dimEls.push(mk('path', { d: fl.waterD, class: 'mz-water' }, base))
    }
    mk('rect', rectAttrs(ext, { class: 'mz-slab-sheen', fill: url('sh') }), base)

    // —— 刻度尺 ——
    // 两条刻度各自成组：放平时的淡入只重画两条细带，而不是整块 L 形外接框（≈ 整层楼板）
    let rdx = '', rdy = ''
    for (let x = 0; x <= 52; x++) { const big = x % 4 === 0; rdx += 'M' + view.pt(x, 36.62) + 'L' + view.pt(x, big ? 37.12 : 36.86) }
    for (let y = 0; y <= 36; y++) { const big = y % 4 === 0; rdy += 'M' + view.pt(-0.62, y) + 'L' + view.pt(big ? -1.12 : -0.86, y) }
    rdx += 'M' + view.pt(0, 36.62) + 'L' + view.pt(52, 36.62)
    rdy += 'M' + view.pt(-0.62, 0) + 'L' + view.pt(-0.62, 36)
    mk('path', { d: rdx, class: 'mz-ruler-ticks' }, mk('g', { class: 'mz-ruler' }, base))
    mk('path', { d: rdy, class: 'mz-ruler-ticks' }, mk('g', { class: 'mz-ruler' }, base))
    const txRuler = U.el('div.mz-tx-ruler')
    txBase.appendChild(txRuler)
    for (let x = 0; x <= 52; x += 4) { const p = view.P(x, 37.5); htx(txRuler, view, p[0], p[1], 0.52, x, 'mz-ruler-num', { anchor: view.rot ? 's' : 'm' }) }
    for (let y = 0; y <= 36; y += 4) { const p = view.P(-1.5, y); htx(txRuler, view, p[0], p[1], 0.52, y, 'mz-ruler-num', { anchor: view.rot ? 'm' : 'e' }) }

    // —— 灯（暖）与窗光（冷）——
    // 按种类分组、整组设不透明度（各元素互不重叠，与逐个设等价）；只在明暗交界的时段里变。
    // 不单独合成：底图中间若夹着合成层，其后的线条与文字都得另起整层，显存与栅格成倍。
    const gLight = mk('g', { class: 'mz-light' }, base)
    fl.gLampO = mk('g', { class: 'mz-lamps' }, gLight)
    fl.gLampW = mk('g', { class: 'mz-lamps' }, gLight)
    fl.gWinFill = mk('g', { class: 'mz-winfills' }, gLight)
    fl.gSpill = mk('g', { class: 'mz-spills' }, gLight)
    for (const r of rooms) {
      const rr = view.rect(r.x0, r.y0, r.x1, r.y1)
      if (!r.parent) mk('rect', rectAttrs(rr, { class: 'mz-lamp' }), r.win ? fl.gLampW : fl.gLampO)
      if (r.win) {
        if (fid === '3F' && r.name === '珍稀花园') {
          const pts = [[0, 8.4], [10.4, 8.4], [10.4, 13.4], [14.2, 13.4], [14.2, 27.6], [0, 27.6]]
          mk('path', { d: pts.map((q, i) => (i ? 'L' : 'M') + view.pt(q[0], q[1])).join('') + 'Z', class: 'mz-winfill' }, fl.gWinFill)
        } else mk('rect', rectAttrs(rr, { class: 'mz-winfill' }), fl.gWinFill)
      }
    }
    const winLines = []
    const roomOf = name => rooms.find(r => r.name === name)
    for (const [name, wx, wy0, wy1] of WINDOWS[fid]) {
      const r = roomOf(name)
      if (!r) continue
      const east = wx <= r.x0 + 0.01
      const depth = Math.min(r.w, r.suite ? 3.8 : 5.6)
      const sx0 = east ? r.x0 : r.x1 - depth, sx1 = east ? r.x0 + depth : r.x1
      const sr = view.rect(sx0, Math.max(r.y0, wy0 - 0.8), sx1, Math.min(r.y1, wy1 + 0.8))
      const dir = view.rot ? (east ? 'd' : 'u') : (east ? 'r' : 'l')
      mk('rect', rectAttrs(sr, { fill: url('sp' + dir), class: 'mz-spill' }), fl.gSpill)
      const lx = east ? wx + 0.12 : wx - 0.12
      winLines.push('M' + view.pt(lx, wy0) + 'L' + view.pt(lx, wy1))
    }
    if (fid === '3F') { // 花园天窗：白玉梁分格
      let sd = ''
      for (const x of [2.4, 4.8, 7.2, 9.6]) sd += 'M' + view.pt(x, 8.4) + 'L' + view.pt(x, 27.6)
      sd += 'M' + view.pt(12.0, 13.4) + 'L' + view.pt(12.0, 27.6)
      for (const y of [10.8, 13.2]) sd += 'M' + view.pt(0, y) + 'L' + view.pt(10.4, y)
      for (const y of [15.6, 18.0, 20.4, 22.8, 25.2]) sd += 'M' + view.pt(0, y) + 'L' + view.pt(14.2, y)
      fl.sky = mk('path', { d: sd, class: 'mz-sky' }, gLight)
    }

    // —— 墙线与陈设 ——
    let wd = '', jd = '', leaf = ''
    fl.outline = {}
    for (const r of rooms) {
      const d = roomSegments(r, doors).map(s => 'M' + view.pt(s[0], s[1]) + 'L' + view.pt(s[2], s[3])).join('')
      fl.outline[r.key] = d
      wd += d
    }
    for (const d of doors) {
      const t = d.exterior ? [-0.4, 0] : (d.side === '西' || d.side === '南') ? [d.line - 0.2, d.line] : [d.line, d.line + 0.2]
      for (const v of [d.a, d.b]) jd += d.o === 'v' ? 'M' + view.pt(t[0], v) + 'L' + view.pt(t[1], v) : 'M' + view.pt(v, t[0]) + 'L' + view.pt(v, t[1])
      if (!d.open) {
        const m = (t[0] + t[1]) / 2
        if (d.exterior) leaf += 'M' + view.pt(d.a, m) + 'L' + view.pt(25.97, m) + 'M' + view.pt(26.03, m) + 'L' + view.pt(d.b, m)
        else leaf += d.o === 'v' ? 'M' + view.pt(m, d.a + 0.06) + 'L' + view.pt(m, d.b - 0.06) : 'M' + view.pt(d.a + 0.06, m) + 'L' + view.pt(d.b - 0.06, m)
      }
    }
    let xd = 'M' + view.pt(-0.4, -0.4)
    if (fid === '1F') xd += 'L' + view.pt(24.8, -0.4) + 'M' + view.pt(27.2, -0.4)
    xd += 'L' + view.pt(52.4, -0.4) + 'L' + view.pt(52.4, 36.4) + 'L' + view.pt(-0.4, 36.4) + 'L' + view.pt(-0.4, -0.4)
    const fd = furnitureFor(fid).map(p => primD(view, p)).join('')

    fl.dimEls.push(mk('path', { d: fd, class: 'mz-furn-dim' }, base))
    fl.dimEls.push(mk('path', { d: wd + jd, class: 'mz-walls-dim' }, base))
    fl.dimEls.push(mk('path', { d: xd, class: 'mz-ext' }, base))
    const gWin = mk('g', { class: 'mz-wins' }, base)
    fl.gGlow = mk('g', { class: 'mz-glows' }, gWin)
    fl.gWinLine = mk('g', { class: 'mz-winlines' }, gWin)
    for (const d of winLines) { mk('path', { d, class: 'mz-win-glow' }, fl.gGlow); mk('path', { d, class: 'mz-win' }, fl.gWinLine) }

    // 灯照层（静态，靠圆窗显出）
    if (rockD) mk('path', { d: rockD, class: 'mz-rock-lit', 'fill-rule': 'evenodd' }, lit)
    if (fl.waterD) mk('path', { d: fl.waterD, class: 'mz-water-lit' }, lit)
    mk('path', { d: fd, class: 'mz-furn-lit' }, lit)
    mk('path', { d: leaf, class: 'mz-leaf' }, lit)
    mk('path', { d: wd + jd, class: 'mz-walls-lit' }, lit)
    mk('path', { d: xd, class: 'mz-ext-lit' }, lit)

    // —— 钟、钥匙、铜牌 ——
    const gSp = mk('g', { class: 'mz-special' }, base)
    const hands = CLOCKS[fid].length ? newSvg('mz-hands', { 'aria-hidden': 'true' }) : null
    if (hands) fl.svgs.push(hands)
    fl.hands = hands
    for (const [cx, cy, grand] of CLOCKS[fid]) {
      const c = view.P(cx, cy), r = grand ? 0.3 : 0.24
      const g = mk('g', { class: 'mz-clock' }, gSp)
      mk('circle', { cx: r3(c[0]), cy: r3(c[1]), r }, g)
      // 指针按 CSS 变换转动，放在底图层最后的一张小 SVG 里；不单独合成（走一格只重画指针那一小块，见 syncHands）
      const gh = mk('g', { class: 'mz-clock' }, hands)
      const hh = mk('line', { class: 'mz-hand', x1: r3(c[0]), y1: r3(c[1]), x2: r3(c[0]), y2: r3(c[1] - r * 0.55) }, gh)
      const mm = mk('line', { class: 'mz-hand', x1: r3(c[0]), y1: r3(c[1]), x2: r3(c[0]), y2: r3(c[1] - r * 0.85) }, gh)
      fl.clocks.push({ hh, mm, c, pre: `translate(${r3(c[0])}px, ${r3(c[1])}px) rotate(`, post: `deg) translate(${r3(-c[0])}px, ${r3(-c[1])}px)` })
    }
    const gNo = U.el('div.mz-g-seat')
    const gLab = U.el('div.mz-g-name')
    txLit.append(gNo, gLab)
    if (fid === '1F') {
      for (let i = 0; i < 15; i++) { // 十五枚号牌：1 号正北，顺时针
        const a = i * 24 * Math.PI / 180, p = view.P(26 + Math.sin(a) * 1.92, 29 + Math.cos(a) * 1.92)
        htx(gNo, view, p[0], p[1], 0.34, i + 1, 'mz-seatno')
      }
      mk('rect', rectAttrs(view.rect(33.45, 25, 34.1, 27.4), { class: 'mz-brass-o' }), gSp)
      for (let i = 0; i < 15; i++) {
        const row = i < 8 ? 0 : 1, j = row ? i - 8 : i
        const p = view.P(33.66 + row * 0.24, 25.35 + j * 0.24 + row * 0.12)
        mk('circle', { cx: r3(p[0]), cy: r3(p[1]), r: 0.05, class: 'mz-key' }, gSp)
      }
      mk('rect', rectAttrs(view.rect(34.42, 23.2, 34.6, 24.1), { class: 'mz-plaque' }), gSp)
    }

    // —— 名签与套房编号（HTML 文字层：底图一层、灯照一层）——
    const gNum = U.el('div.mz-g-suite'), gBn = U.el('div.mz-g-bname')
    const gNumLit = U.el('div.mz-g-suite.is-lit'), gBnLit = U.el('div.mz-g-bname.is-lit')
    txBase.append(gNum, gBn)
    txLit.append(gNumLit, gBnLit)
    for (const r of rooms) {
      const rr = view.rect(r.x0, r.y0, r.x1, r.y1)
      if (r.suite) {
        const c = view.P(r.cx, r.cy)
        htx(gNum, view, c[0], c[1], Math.min(rr.w, rr.h) * 0.3, r.suite, 'mz-suite')
        htx(gNumLit, view, c[0], c[1], Math.min(rr.w, rr.h) * 0.3, r.suite, 'mz-suite.mz-suite-lit') // 灯照过时编号的黄铜发亮
        continue
      }
      const big = fid === 'B1' && B1_NAMES[r.name]
      if (big) { // 地下主厅：常显的暗铜房名 + 灯照时的亮字
        const [bx, by, bfs, vert] = big[view.rot ? 'm' : 'd']
        const p = view.P(bx, by)
        for (const [g, cls] of [[gBn, 'mz-bname'], [gBnLit, 'mz-bname.mz-bname-lit']]) {
          const t = vert ? htx(g, view, p[0], p[1], bfs, r.name, cls, { vert: 1.42 }) : htx(g, view, p[0] + bfs * 0.09, p[1], bfs, r.name, cls, { ls: 0.18 })
          if (g === gBn) fl.dimEls.push(t)
        }
        continue
      }
      const at = LABEL_AT[r.key] || [r.cx, r.cy]
      const p = view.P(at[0], at[1])
      const n = Array.from(r.name).length
      const k = view.rot ? 1.15 : 1
      if (rr.h > rr.w * 1.9 && rr.w < 4.2) {
        const fs = Math.min(0.66 * k, rr.w * 0.34, (rr.h * 0.7) / n / 1.5)
        htx(gLab, view, p[0], p[1], fs, r.name, 'mz-name', { vert: 1.5 })
      } else {
        const fs = Math.min(0.62 * k, (rr.w * 0.84) / n / 1.14, rr.h * 0.36)
        htx(gLab, view, p[0], p[1], fs, r.name, 'mz-name', { ls: 0.14 })
      }
    }

    // —— 动效层：黑钻石封墙、聚光、证物锚点、命中；最后是各自合成的悬停底色、悬停框、刻度游标 ——
    // （会动的小件放在最后：夹在中间、又被临时提为合成层时，会把其后的内容劈成新的整层）
    if (fid === '1F') { // 黑钻石封墙：正门外侧（中心 x=26，净宽 2.4）
      const gSeal = mk('g', { class: 'mz-seal' }, fx)
      const dias = []
      for (let row = 0; row < 6; row++) {
        const y = -0.62 - row * 0.19
        const off = row % 2 ? 0.2 : 0
        for (let x = 23.6 + 0.2 + off; x <= 28.4 - 0.2 + 1e-6; x += 0.4) {
          const d = 'M' + view.pt(x, y + 0.19) + 'L' + view.pt(x + 0.2, y) + 'L' + view.pt(x, y - 0.19) + 'L' + view.pt(x - 0.2, y) + 'Z'
          const p = view.P(x, y)
          // transform 常驻（静止时为 0 位移）：震动时只改数值；临时增删 transform 会改动绘制结构，整层动效重画
          dias.push({ el: mk('path', { d, class: 'mz-dia', transform: 'translate(0 0)' }, gSeal), x: p[0], y: p[1], ph: Math.random() * 6.28, sp: U.rand(0.6, 1.8), lastO: '', lastF: '' })
        }
      }
      const sc = view.P(26, -1.05)
      fl.seal = { dias, cx: sc[0], cy: sc[1], hit: mk('rect', rectAttrs(view.rect(23.5, -1.75, 28.5, -0.4), { class: 'mz-seal-hit', 'data-cursor': '封死', 'data-cursor-tone': 'blood' })), heat: 0 }
    }
    fl.spot = mk('path', { class: 'mz-spot', d: '', 'fill-rule': 'evenodd' }, fx)
    fl.focus = mk('path', { class: 'mz-focus', d: '' }, fx)
    fl.gZoom = mk('g', { class: 'mz-zoomg' }, fx)
    const gHit = mk('g', { class: 'mz-hit' }, fx)
    for (const r of rooms) {
      const rr = view.rect(r.x0, r.y0, r.x1, r.y1)
      fl.roomEls[r.key] = { hit: mk('rect', rectAttrs(rr, { class: 'mz-hr', 'data-room': r.key, 'data-cursor': '' }), gHit), rr }
    }
    if (fl.seal) gHit.appendChild(fl.seal.hit)
    // 悬停房间的底色：三块轮换的矩形，fill-opacity 淡入淡出（只重画房间那一块，不另起合成层）
    const gFill = mk('g', { class: 'mz-hfills' }, fx)
    fl.hf = [0, 1, 2].map(() => mk('rect', { class: 'mz-hfill', x: 0, y: 0, width: 1, height: 1 }, gFill))
    fl.hfi = 0
    // 悬停框：四只角，滑行时只改平移（只重画四个小角）；整组用 stroke-opacity 淡入淡出
    fl.hl = mk('g', { class: 'mz-hl' }, fx)
    fl.hlC = { k: -1, c: [0, 1, 2, 3].map(() => mk('path', { class: 'mz-hlc' }, fl.hl)), t: [] }
    // 刻度尺游标（只在放平时跟着灯走，重画的只是两个小三角）
    const dX = view.rot ? 'M0.45 -0.3L0 0L0.45 0.3Z' : 'M-0.3 -0.45L0 0L0.3 -0.45Z', dY = view.rot ? 'M-0.3 -0.45L0 0L0.3 -0.45Z' : 'M-0.45 -0.3L0 0L-0.45 0.3Z'
    fl.markX = mk('path', { class: 'mz-ruler-mark', d: dX }, fx)
    fl.markY = mk('path', { class: 'mz-ruler-mark', d: dY }, fx)
    // 楼板叠放时游标不动：改由底图里的一对「钉」显示在原处，动效层就什么也不画、不必另起一层合成
    fl.pinX = mk('path', { class: 'mz-ruler-mark', d: dX, style: 'visibility:hidden' }, base)
    fl.pinY = mk('path', { class: 'mz-ruler-mark', d: dY, style: 'visibility:hidden' }, base)

    // —— HTML 层 ——
    const el = U.el('div.mz-floor', { 'data-floor': fid })
    // 手提灯：暖光池（.mz-lens::before）与灯照圆窗装在同一个移动的盒子里，一次 transform 带走两样
    const lens = U.el('div.mz-lens', { 'aria-hidden': 'true' })
    // 灯照层（SVG + 文字）装进同一个反向平移的盒子：手提灯移动只改这个合成层的 transform。
    // 软边遮罩放在圆窗里一层不动的盒子上（.mz-masker）：遮罩若直接挂在移动的圆窗上，Chrome 会随移动反复重画遮罩
    const litWrap = U.el('div.mz-litwrap', {}, [lit, txLit])
    lens.appendChild(U.el('div.mz-masker', {}, [litWrap]))
    // 底图 + 底图文字：画在楼板自己的合成层里；悬停楼层时整块提亮（切换的那一下重画一次）
    const under = U.el('div.mz-under', {}, [base, txBase])
    if (fl.hands) under.appendChild(fl.hands)
    el.append(under)
    if (fid === '1F') {
      fl.domeEl = U.el('div.mz-dome', { 'aria-hidden': 'true' }, [U.el('i.d'), U.el('i.r'), U.el('i.r.r2')])
      fl.domeC = view.P(26, 29)
      el.appendChild(fl.domeEl)
    }
    el.append(lens, fx)
    fl.el = el
    fl.lens = lens
    fl.litWrap = litWrap
    fl.lanS = { x: -60, y: -60, r: LAN_R.normal, tx: -60, ty: -60, last: '', fade: 1 }
    return fl
  }

  // HTML 层随视窗（缩放）定位；box 为该层元素的像素尺寸
  function setBox(fl, w, h) {
    fl.box = { w, h }
    fl.litWrap.style.width = w + 'px'
    fl.litWrap.style.height = h + 'px'
    const vb = fl.view.vb
    fl.Rref = Math.max(40, LAN_R.normal * w / vb.w)
    const d = (fl.Rref * 2).toFixed(1) + 'px'
    fl.lens.style.width = d; fl.lens.style.height = d
    fl.lanS.last = ''
    placeDome(fl)
    placeTx(fl)
  }
  // 文字层随视窗（含放大时的 viewBox 动画）缩放、平移；与 SVG 的 xMidYMid meet 映射一致（盒子与视窗同宽高比）
  function placeTx(fl) {
    if (!fl.box) return
    const vb = fl.view.vb, vs = fl.vbs || vb
    const k = fl.box.w / (vb.w * TXK) * (vb.w / vs.w)
    const t = `scale(${k.toFixed(5)}) translate(${((vb.x - vs.x) * TXK).toFixed(2)}px, ${((vb.y - vs.y) * TXK).toFixed(2)}px)`
    if (t === fl._txT) return
    fl._txT = t
    fl.txBase.style.transform = t
    fl.txLit.style.transform = t
  }
  function placeDome(fl) {
    if (!fl.domeEl) return
    const vb = fl.vbs || fl.view.vb
    const c = fl.domeC
    const X = (c[0] - vb.x) / vb.w * 100, Y = (c[1] - vb.y) / vb.h * 100
    const rw = 4.2 / vb.w * 100, rh = 4.2 / vb.h * 100
    Object.assign(fl.domeEl.style, { left: (X - rw).toFixed(3) + '%', top: (Y - rh).toFixed(3) + '%', width: (rw * 2).toFixed(3) + '%', height: (rh * 2).toFixed(3) + '%' })
  }
  // 把手提灯（svg 坐标 X,Y，半径 R）放到合成层上
  function placeLantern(fl, X, Y, R) {
    if (!fl.box) return false
    const vb = fl.vbs || fl.view.vb
    const k = fl.box.w / vb.w
    const x = (X - vb.x) * k, y = (Y - vb.y) * k
    const rp = Math.max(1, R * k)
    const s = rp / fl.Rref
    const key = x.toFixed(1) + ',' + y.toFixed(1) + ',' + s.toFixed(3)
    if (key === fl.lanS.last) return false
    fl.lanS.last = key
    const tx = (x - rp).toFixed(2), ty = (y - rp).toFixed(2)
    const t = `translate3d(${tx}px, ${ty}px, 0) scale(${s.toFixed(4)})`
    fl.lens.style.transform = t
    fl.litWrap.style.transform = `scale(${(1 / s).toFixed(4)}) translate3d(${(-x + rp).toFixed(2)}px, ${(-y + rp).toFixed(2)}px, 0)`
    // 刻度尺游标（只有放平的平面才显示刻度尺）：平移（svg 单位）
    if (!fl.rulerLive) return true
    const w = fl.view.inv(X, Y)
    const pX = fl.view.P(U.clamp(w[0], 0, 52), 36.62), pY = fl.view.P(-0.62, U.clamp(w[1], 0, 36))
    const mx = `translate(${r3(pX[0])}px, ${r3(pX[1])}px)`, my = `translate(${r3(pY[0])}px, ${r3(pY[1])}px)`
    if (mx !== fl._mx) { fl._mx = mx; fl.markX.style.transform = mx }
    if (my !== fl._my) { fl._my = my; fl.markY.style.transform = my }
    return true
  }

  // 刻度游标 ⇄ 底图里的钉：叠放时显示钉（停在游标最后的位置），放平时显示会动的游标
  function swapPins(fl, pinned) {
    if (pinned) { fl.pinX.style.transform = fl.markX.style.transform; fl.pinY.style.transform = fl.markY.style.transform }
    fl.pinX.style.visibility = fl.pinY.style.visibility = pinned ? 'visible' : 'hidden'
    fl.markX.style.visibility = fl.markY.style.visibility = pinned ? 'hidden' : 'visible'
  }
  // 悬停框（四只角）：角的臂长取目标房间的，滑行时只平移
  function placeHl(fl, r, k) {
    const H = fl.hlC
    k = r3(k)
    if (k !== H.k) {
      H.k = k
      H.c[0].setAttribute('d', `M0 ${k}V0H${k}`)
      H.c[1].setAttribute('d', `M${-k} 0H0V${k}`)
      H.c[2].setAttribute('d', `M0 ${-k}V0H${-k}`)
      H.c[3].setAttribute('d', `M${k} 0H0V${-k}`)
    }
    const o = 0.18
    const x0 = r.x - o, y0 = r.y - o, x1 = r.x + r.w + o, y1 = r.y + r.h + o
    const pos = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    for (let i = 0; i < 4; i++) {
      const t = `translate(${pos[i][0].toFixed(3)}px, ${pos[i][1].toFixed(3)}px)`
      if (t !== H.t[i]) { H.t[i] = t; H.c[i].style.transform = t }
    }
  }
  function moveHl(fl, target, dur) {
    if (!fl.hlBox || !fl.hl.classList.contains('is-on')) fl.hlBox = Object.assign({}, target)
    fl.hl.classList.add('is-on')
    const k = Math.min(1.2, target.w * 0.3, target.h * 0.3)
    gsap.killTweensOf(fl.hlBox)
    gsap.to(fl.hlBox, { x: target.x, y: target.y, w: target.w, h: target.h, duration: dur, ease: 'expo.out', onUpdate: () => placeHl(fl, fl.hlBox, k) })
    placeHl(fl, fl.hlBox, k)
  }
  // 悬停房间的底色：旧的淡出，新的一块定位后淡入（CSS 过渡跑在合成层上）
  function setHoverFill(fl, rr) {
    if (fl.hfOn) { fl.hfOn.classList.remove('is-on'); fl.hfOn = null }
    if (!rr) return
    fl.hfi = (fl.hfi + 1) % fl.hf.length
    const r = fl.hf[fl.hfi]
    for (const [k, v] of [['x', rr.x], ['y', rr.y], ['width', rr.w], ['height', rr.h]]) r.setAttribute(k, r3(v))
    r.classList.add('is-on')
    fl.hfOn = r
  }

  /* =====================================================================
     4×4 矩阵（列主序，与 CSS matrix3d 一致）
     ===================================================================== */
  const M4 = {
    mul(a, b) {
      const o = new Array(16)
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
      }
      return o
    },
    T: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z || 0, 1],
    S: s => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1],
    RX(d) { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1] },
    RY(d) { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1] },
    RZ(d) { const a = d * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
    P: d => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / d, 0, 0, 0, 1],
  }
  const project = (m, u, v) => { const w = m[3] * u + m[7] * v + m[15]; return [(m[0] * u + m[4] * v + m[12]) / w, (m[1] * u + m[5] * v + m[13]) / w] }
  function unproject(m, sx, sy) {
    const a = m[0] - sx * m[3], b = m[4] - sx * m[7], c = sx * m[15] - m[12]
    const d = m[1] - sy * m[3], e = m[5] - sy * m[7], f = sy * m[15] - m[13]
    const det = a * e - b * d
    if (Math.abs(det) < 1e-9) return null
    return [(c * e - b * f) / det, (a * f - c * d) / det]
  }

  /* =====================================================================
     板块状态
     ===================================================================== */
  const WP = 1300
  const VBD = makeView(false).vb
  const HP = WP * VBD.h / VBD.w
  const sstep = (a, b, v) => { const t = U.clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
  // 滚动编排：每层 抽出 a→b、放平停留 b→c、收回 c→d；下一层在上一层收回途中（c + lag）才开始抽出，两层不会在同一位置重叠
  const PH = (() => {
    const segs = []
    let t = 0.13
    const tin = 0.055, hold = 0.095, tout = 0.045, lag = 0.028
    for (const f of ORDER) {
      const s = { f, a: t, b: t + tin, c: t + tin + hold }
      s.d = s.c + tout
      segs.push(s)
      t = s.c + lag
    }
    const last = segs[segs.length - 1]
    last.d = last.c + 0.06 // 最后一层随整组回到中央
    return { spread: [0.02, 0.1], segs, out: [last.c, last.d], close: [last.d + 0.006, 0.965] }
  })()
  // 每帧系数（60fps 基准）按实际帧长换算：慢机器、高刷新率屏上的手感一致
  const ek = (k, dt) => 1 - Math.pow(1 - k, dt)

  const S = {
    mode: null, el: null, root: null, stage: null, floors: {}, cleanup: [],
    p: 0, enter: 0, visible: false, house: App.state.minutes, override: null, light: null, lightKey: '',
    par: { x: 0, y: 0 }, poses: {}, bases: {}, mats: {}, focus: {}, active: null, flat: null, lastActive: null,
    hoverFloor: null, hoverRoom: null, zoom: null, tipOn: false, lanR: LAN_R.normal, sealT: 0,
    hlBox: null, mobFloor: '1F', mobSel: null, zk: 0, lastNow: 0, q: 2, clockKey: null, lines: null,
  }
  function frameDt() {
    const now = performance.now()
    const d = S.lastNow ? (now - S.lastNow) / 16.667 : 1
    S.lastNow = now
    return U.clamp(d, 0.05, 90)
  }

  /* =====================================================================
     时刻
     ===================================================================== */
  const curMin = () => (S.override != null ? S.override : ((S.house % 1440) + 1440) % 1440)
  // 钟：只有看得清的那一层（放平 / 放大 / 光标指着；手机上是当前那一层）每（馆内）分钟走一格；
  // 叠放与侧边小叠层里的钟只有两三个像素，等它被抽出来时再对时。指针不单独合成，走一格只重画指针那一小块
  function handsLive(fid) {
    if (S.mode === 'mob') return fid === S.mobFloor
    const f = S.focus[fid]
    return !!((f && f.a > 0.3) || (S.zoom && S.zoom.fid === fid) || S.hoverFloor === fid)
  }
  function syncHands(force) {
    const m = curMin()
    const ck = Math.floor(m)
    const ha = (((m / 60) % 12) * 30).toFixed(1), ma = ((m % 60) * 6).toFixed(1)
    for (const fid in S.floors) {
      const fl = S.floors[fid]
      if (!fl.clocks.length || fl._hk === ck || (!force && !handsLive(fid))) continue
      fl._hk = ck
      for (const c of fl.clocks) {
        c.hh.style.transform = c.pre + ha + c.post
        c.mm.style.transform = c.pre + ma + c.post
      }
    }
  }
  // 时刻只在变了的部分落笔：指针见上；灯与窗光只在明暗交界的时段里变（分档）
  function applyLight(force) {
    const m = curMin()
    const L = lightAt(m)
    const ck = Math.floor(m)
    const key = L.win.toFixed(3) + L.lampO.toFixed(3) + L.lampW.toFixed(3) + L.dim.toFixed(3) + (L.low ? 1 : 0)
    if (!force && key === S.lightKey && ck === S.clockKey) return
    S.light = L
    if (force || ck !== S.clockKey) {
      S.clockKey = ck
      syncHands(force)
    }
    if (force || key !== S.lightKey) {
      S.lightKey = key
      for (const fid in S.floors) {
        const fl = S.floors[fid]
        setO(fl.gLampO, (L.lampO * 0.06).toFixed(3))
        setO(fl.gLampW, (L.lampW * 0.06).toFixed(3))
        setO(fl.gWinFill, (L.win * 0.15).toFixed(3))
        setO(fl.gSpill, L.win.toFixed(3))
        setO(fl.gWinLine, (0.22 + L.win * 0.78).toFixed(3))
        setO(fl.gGlow, (L.win * 0.9).toFixed(3))
        if (fl.sky) setO(fl.sky, (0.08 + L.win * 0.55).toFixed(3))
      }
      // 低亮时的线稿变暗：--mz-dim 只写给用到它的那几条路径与 B1 房名，不写在根节点上
      const dim = L.dim.toFixed(3)
      if (dim !== S._dim || force) {
        S._dim = dim
        for (const fid in S.floors) for (const n of S.floors[fid].dimEls) n.style.setProperty('--mz-dim', dim)
      }
      if (S.root) {
        S.root.classList.toggle('is-low', L.low)
        S.root.classList.toggle('is-day', L.win > 0.5)
      }
    }
    if (S.dial) S.dial.render(m, L)
    if (App.state.section === 'mansion' && S.moodLow !== L.low) { S.moodLow = L.low; App.audio.setMood({ tension: L.low ? 0.48 : 0.26 }) }
  }
  function setHouse(min) { S.house = min; if (S.override == null) applyLight() }

  /* =====================================================================
     表盘（24 小时，可拖动）
     ===================================================================== */
  function buildDial() {
    const wrap = U.el('div.mansion-dial', { 'data-cursor': '拖动', role: 'slider', 'aria-label': '时刻', 'aria-valuemin': '0', 'aria-valuemax': '1440', tabindex: '0' })
    const svg = mk('svg', { viewBox: '-100 -100 200 200', class: 'mansion-dial-face', 'aria-hidden': 'true' })
    const arc = (r0, r1, a0, a1) => {
      const p = (r, a) => r3(Math.cos(a) * r) + ' ' + r3(Math.sin(a) * r)
      return `M${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`
    }
    const ang = min => (min / 1440) * Math.PI * 2 - Math.PI / 2
    mk('circle', { r: 97, class: 'mansion-dial-rim' }, svg)
    for (let i = 0; i < 96; i++) {
      const t0 = i * 15, L = lightAt(t0 + 7.5)
      mk('path', { d: arc(80, 89, ang(t0) + 0.004, ang(t0 + 15) - 0.004), class: 'mansion-dial-win', style: `opacity:${(0.05 + L.win * 0.9).toFixed(3)}` }, svg)
      mk('path', { d: arc(72, 76, ang(t0) + 0.004, ang(t0 + 15) - 0.004), class: 'mansion-dial-lamp', style: `opacity:${L.low ? 0.2 : L.day ? 0.55 : 0.9}` }, svg)
    }
    let td = ''
    for (let i = 0; i < 96; i++) {
      const a = ang(i * 15), big = i % 24 === 0, mid = i % 4 === 0
      const r0 = big ? 90 : mid ? 92 : 94.5
      td += `M${r3(Math.cos(a) * r0)} ${r3(Math.sin(a) * r0)}L${r3(Math.cos(a) * 97)} ${r3(Math.sin(a) * 97)}`
    }
    mk('path', { d: td, class: 'mansion-dial-ticks' }, svg)
    for (const [h, lab] of [[0, '00'], [6, '06'], [12, '12'], [18, '18']]) {
      const a = ang(h * 60)
      const t = mk('text', { x: r3(Math.cos(a) * 62), y: r3(Math.sin(a) * 62), class: 'mansion-dial-num' }, svg)
      t.textContent = lab
    }
    // 光的时段边界：5 7 17 19 23
    for (const h of [5, 7, 17, 19, 23]) {
      const a = ang(h * 60)
      mk('line', { x1: r3(Math.cos(a) * 68), y1: r3(Math.sin(a) * 68), x2: r3(Math.cos(a) * 90), y2: r3(Math.sin(a) * 90), class: 'mansion-dial-cut' }, svg)
    }
    wrap.appendChild(svg)
    const hand = U.el('div.mansion-dial-hand')
    hand.innerHTML = '<svg viewBox="-100 -100 200 200" aria-hidden="true"><line x1="0" y1="-44" x2="0" y2="-78"/><path d="M0 -99 L5 -88 L0 -77 L-5 -88 Z"/></svg>'
    wrap.appendChild(hand)
    const read = U.el('div.mansion-dial-read', {}, [U.el('span.mansion-dial-time', { text: '17:00' }), U.el('span.mansion-dial-glyphs', { html: '<i class="g-win"></i><i class="g-lamp"></i><i class="g-low"></i>' })])
    wrap.appendChild(read)
    const sync = U.el('button.mansion-dial-sync', { type: 'button', 'data-cursor': '归位', 'aria-label': '归位' })
    sync.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 3v4.2h4.2"/></svg>'
    wrap.appendChild(sync)
    const timeEl = read.querySelector('.mansion-dial-time')
    const glyphs = read.querySelectorAll('i')
    let lastHour = null, dragging = false, shown = ''
    const dial = {
      el: wrap,
      render(m, L) {
        const t = U.clock(m).text
        if (t !== shown) { shown = t; timeEl.textContent = t; wrap.setAttribute('aria-valuenow', String(Math.round(m))); wrap.setAttribute('aria-valuetext', t) }
        if (!dragging) gsap.set(hand, { rotation: (m / 1440) * 360 })
        glyphs[0].classList.toggle('is-on', L.win > 0.02)
        glyphs[1].classList.toggle('is-on', !L.low && (L.lampO > 0.5))
        glyphs[2].classList.toggle('is-on', L.low)
        wrap.classList.toggle('is-override', S.override != null)
      },
    }
    const setFromRotation = rot => {
      const m = ((((rot % 360) + 360) % 360) / 360) * 1440
      const hr = Math.floor(m / 60)
      if (lastHour != null && hr !== lastHour) App.audio.sfx('tick', { pitch: hr % 6 === 0 ? 0.8 : 1 })
      lastHour = hr
      S.override = m
      applyLight()
    }
    const stopSync = () => { if (S.syncTw) { S.syncTw.kill(); S.syncTw = null } }
    if (window.Draggable) {
      gsap.registerPlugin(Draggable)
      const dr = Draggable.create(hand, {
        type: 'rotation', trigger: wrap,
        onPress() { stopSync(); dragging = true; S.dragOver = true; lastHour = Math.floor(curMin() / 60); wrap.classList.add('is-drag') },
        onDrag() { setFromRotation(this.rotation) },
        onRelease() { dragging = false; S.dragOver = false; wrap.classList.remove('is-drag'); if (S.override != null) gsap.set(hand, { rotation: (S.override / 1440) * 360 }) },
      })[0]
      S.cleanup.push(() => dr && dr.kill())
    }
    sync.addEventListener('click', e => {
      e.stopPropagation()
      if (S.override == null) return
      stopSync()
      const from = S.override
      let d = (((S.house % 1440) + 1440) % 1440) - from
      if (d > 720) d -= 1440
      if (d < -720) d += 1440
      App.audio.sfx('chime', { volume: 0.5 })
      const o = { t: 0 }
      S.syncTw = gsap.to(o, {
        t: 1, duration: Math.min(1.3, 0.4 + Math.abs(d) / 800), ease: 'power3.inOut',
        onUpdate() { S.override = (from + d * o.t + 1440) % 1440; applyLight() },
        onComplete() { S.syncTw = null; S.override = null; applyLight(true) },
      })
    })
    S.cleanup.push(stopSync)
    sync.addEventListener('pointerdown', e => e.stopPropagation())
    wrap.addEventListener('keydown', e => {
      const step = e.shiftKey ? 60 : 15
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { S.override = (curMin() + step) % 1440 }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { S.override = (curMin() - step + 1440) % 1440 }
      else return
      e.preventDefault()
      stopSync()
      App.audio.sfx('tick')
      applyLight()
    })
    S.dial = dial
    return wrap
  }

  /* =====================================================================
     提示（房名 + 氛围句）
     ===================================================================== */
  function buildTip() {
    const tip = U.el('div.mansion-tip', { 'aria-hidden': 'true' }, [
      U.el('div.mansion-tip-row', {}, [U.el('span.mansion-tip-code'), U.el('span.mansion-tip-win')]),
      U.el('div.mansion-tip-name'),
      U.el('div.mansion-tip-mood'),
    ])
    return tip
  }
  function fillTip(tip, room, fid, extra) {
    tip.querySelector('.mansion-tip-code').textContent = room ? (room.suite ? fid + ' · No.' + String(room.suite).padStart(2, '0') : fid) : fid
    tip.querySelector('.mansion-tip-name').textContent = room ? room.name : (extra && extra.name) || ''
    tip.querySelector('.mansion-tip-mood').textContent = room ? room.mood : (extra && extra.mood) || ''
    tip.querySelector('.mansion-tip-win').classList.toggle('is-on', !!(room && room.win))
    tip.classList.toggle('is-blood', !!(extra && extra.blood))
  }

  /* =====================================================================
     桌面：叠放 → 抽出 → 平面
     ===================================================================== */
  function buildDesk(sec) {
    sec.classList.add('is-desk')
    const root = U.el('div.mansion-sticky')
    S.root = root
    const stage = U.el('div.mansion-stage')
    S.stage = stage
    root.appendChild(stage)

    // 背景大字
    const bgword = U.el('div.mansion-bgword', { 'aria-hidden': 'true' }, [U.el('span', { text: '洋' }), U.el('span', { text: '馆' })])
    stage.append(bgword)
    S.bgword = bgword

    // 终幕：两扇黑钻石封墙从两侧合拢（光标是灯：照亮菱形、溅起闪光）
    const sealEl = U.el('div.mansion-seal', { 'aria-hidden': 'true' })
    S.sealWall = { el: sealEl, halves: [], k: -1, shut: false }
    for (const side of ['l', 'r']) {
      const half = U.el('div.mansion-seal-half.is-' + side)
      // 灯照圆窗：窗口跟着光标平移，里面的亮纹反向平移（对齐墙面纹样）——两层都只改 transform
      const pat = U.el('i.mansion-seal-pat')
      const lens = U.el('i.mansion-seal-lens', {}, [U.el('i.mansion-seal-mask', {}, [pat])])
      half.append(lens, U.el('b.mansion-seal-edge'))
      const glints = []
      for (let i = 0; i < 9; i++) {
        const g = U.el('i.mansion-glint')
        g.style.animationDelay = (-i * 0.37).toFixed(2) + 's'
        g.addEventListener('animationiteration', () => placeGlint(S.sealWall.halves[side === 'l' ? 0 : 1], g))
        half.appendChild(g)
        glints.push(g)
      }
      sealEl.appendChild(half)
      S.sealWall.halves.push({ el: half, lens, pat, glints, side, x: 0, lx: -9999, ly: -9999 })
    }
    S.sealWall.seam = U.el('i.mansion-seal-seam')
    sealEl.appendChild(S.sealWall.seam)
    sealEl.style.visibility = 'hidden'
    stage.appendChild(sealEl)

    // 场景
    const scene = U.el('div.mansion-scene')
    stage.appendChild(scene)
    for (const fid of FIDS) {
      const fl = buildFloor(fid, makeView(false))
      const el = fl.el
      el.classList.add('mansion-floor')
      el.style.width = WP + 'px'
      el.style.height = HP + 'px'
      // 楼板厚度：另一块同位、略低的板
      const edge = U.el('div.mansion-edge', { 'aria-hidden': 'true' }, [U.el('i')])
      edge.style.width = WP + 'px'
      edge.style.height = HP + 'px'
      const ex = fl.ext, vb = VBD
      const exBox = { left: ((ex.x - vb.x) / vb.w * 100) + '%', top: ((ex.y - vb.y) / vb.h * 100) + '%', width: (ex.w / vb.w * 100) + '%', height: (ex.h / vb.h * 100) + '%' }
      Object.assign(edge.firstChild.style, exBox)
      // 叠放时（楼板姿态只差 z）楼板厚度改由楼板自己画：在楼板平面内错开一段（= 26px 厚度沿视线投到板面上），
      // 和楼板同一个合成层，不再另起一张整层大小、每帧都要跟着重写 transform 的底板；只在抽出的前三分之一（厚度收起）时才用独立底板
      const edgeIn = U.el('i.mz-edge-in', { 'aria-hidden': 'true' })
      Object.assign(edgeIn.style, exBox)
      el.insertBefore(edgeIn, el.firstChild)
      fl.edgeIn = edgeIn
      scene.append(edge, el)
      fl.edge = edge
      S.floors[fid] = fl
      setBox(fl, WP, HP)
    }

    // 线框（楼梯井、角柱、引线）：每条线是一根独立合成的细条，随楼板视差只改 transform，不重画。
    // 证物线仍画在 SVG 里（只在点开房间时出现，那时楼板不动）。
    const lines = U.el('div.mansion-lines', { 'aria-hidden': 'true' })
    const lStack = U.el('div.mz-wl-stack')
    const hfill = U.el('div.mz-w-hfill', {}, [U.el('i')])
    {
      const ex = S.floors['1F'].ext, vb = VBD
      hfill.style.width = WP + 'px'
      hfill.style.height = HP + 'px'
      Object.assign(hfill.firstChild.style, { left: ((ex.x - vb.x) / vb.w * 100) + '%', top: ((ex.y - vb.y) / vb.h * 100) + '%', width: (ex.w / vb.w * 100) + '%', height: (ex.h / vb.h * 100) + '%' })
    }
    lStack.appendChild(hfill)
    const ln = wline
    const door = U.el('div.mz-w-door')
    const dpos = U.el('div.mz-w-door-pos', {}, [U.el('i.mz-w-door-ring'), U.el('i.mz-w-door-dia')])
    S.lines = {
      // 楼梯井：每口井前后两个竖面（各带左右两条边），竖面在楼板共用的 3D 姿态里摆好——一个元素画两条竖线，
      // 层距变化时只改这一个元素的 matrix3d（12 根线 → 6 个面）
      faces: STAIR_RECTS.flatMap(([x0, y0, x1, y1]) => [y0, y1].map(y => {
        const el = U.el('i.mz-wf')
        lStack.appendChild(el)
        const qa = VD.P(x0, y), qb = VD.P(x1, y)
        return { el, ua: (qa[0] - VBD.x) / VBD.w * WP, ub: (qb[0] - VBD.x) / VBD.w * WP, va: (qa[1] - VBD.y) / VBD.h * HP, w0: 0, h0: 0, t: '', bg: '', on: false }
      })),
      cols: [...STAIR_RECTS.flatMap(([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ({ x, y, dashed: false }))),
        ...RING.map(([x, y]) => ({ x, y, dashed: true }))].map(c => Object.assign(c, { ls: [0, 1, 2].map(() => ln(lStack, c.dashed ? 'is-post' : 'is-shaft', c.dashed)) })),
      // ↑ 每个角备 3 段屏幕空间的线：楼梯井的实线只用来画连着被抽出那层、正在弯折淡出的段；
      //   楼板四角的虚线：楼板未被抽出、深浅相同的连续几段共线，合成一根，否则分段
      ghost: [0, 1, 2, 3].map(() => ln(lStack, 'is-ghost', true)),
      hfill,
      // 终幕：一层正门（唯一的门，已封死）→ 引线 → 终句
      door: { el: door, pos: dpos, v: ln(door, 'is-door'), h: ln(door, 'is-door') },
    }
    door.appendChild(dpos)
    lines.append(lStack, door)
    stage.appendChild(lines)
    const wire = mk('svg', { class: 'mansion-wire', 'aria-hidden': 'true' })
    S.wire = { svg: wire, strings: mk('g', { class: 'mz-w-strings' }, wire) }
    stage.appendChild(wire)

    // 楼层标签（可点：跳到该层）
    const labels = U.el('div.mansion-flabels')
    S.flabels = {}
    for (const fid of FIDS) {
      const b = U.el('button.mansion-flabel', { type: 'button', 'data-floor': fid, 'data-cursor': '抽出', 'aria-label': FMETA[fid].cn },
        [U.el('span.mansion-flabel-code', { text: fid }), U.el('span.mansion-flabel-elev', { text: elevText(FMETA[fid].level) })])
      b.addEventListener('click', e => { e.stopPropagation(); jumpTo(fid) })
      labels.appendChild(b)
      S.flabels[fid] = b
    }
    stage.appendChild(labels)

    // 左上：标题 / 楼层名
    const head = U.el('div.mansion-head', {}, [
      U.el('div.mansion-head-title', {}, [U.el('h2.mansion-title', { text: '洋馆' }), U.el('p.mansion-line', { text: atmos('窗后没有太阳', '窗后没有太阳') })]),
      U.el('div.mansion-head-floor', {}, [U.el('span.mansion-head-code', { text: '1F' }), U.el('span.mansion-head-cn', { text: '一层' }), U.el('span.mansion-head-elev', { text: '±0.00' })]),
    ])
    stage.appendChild(head)
    S.head = head

    // 比例尺 + 指北
    const scale = U.el('div.mansion-scale', { 'aria-hidden': 'true', html: '<svg class="n" viewBox="0 0 10 16"><path d="M5 0 L10 13 L5 10 L0 13 Z"/></svg><span class="bar"><b></b><b></b></span><span class="lab"><i>0</i><i>5</i><i>10 m</i></span>' })
    stage.appendChild(scale)
    S.scaleEl = scale

    // 表盘
    stage.appendChild(buildDial())

    // 提示
    S.tip = buildTip()
    stage.appendChild(S.tip)

    // 证物（缩放）层
    const zl = U.el('div.mansion-zoom', { 'data-cursor': '返回' }, [
      U.el('div.mansion-zcard', {}, [
        U.el('div.mansion-zcard-code'),
        U.el('h3.mansion-zcard-name'),
        U.el('p.mansion-zcard-mood'),
        U.el('div.mansion-zcard-meta'),
      ]),
      U.el('div.mansion-tags'),
    ])
    stage.appendChild(zl)
    S.zl = zl
    zl.addEventListener('click', () => closeRoom())

    // 终句
    const outro = U.el('div.mansion-outro', { text: atmos('没有通向室外', '没有通向室外的路') })
    stage.appendChild(outro)
    S.outro = outro

    sec.appendChild(root)

    // 交互
    bindDeskEvents()
    layoutDesk()

    // 滚动
    // is-pinned：舞台处于钉住区间。别处（浮层）停下 Lenis 时，CSS 改用 position:fixed 顶住，舞台不会跳走
    const st1 = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: self => { S.p = self.progress }, onToggle: self => sec.classList.toggle('is-pinned', self.isActive) })
    sec.classList.toggle('is-pinned', st1.isActive)
    const st2 = ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'top top', onUpdate: self => { S.enter = self.progress }, onLeave: () => { S.enter = 1 }, onLeaveBack: () => { S.enter = 0 } })
    S.cleanup.push(() => { st1.kill(); st2.kill() })
    S.p = st1.progress || 0
    S.enter = sec.getBoundingClientRect().top <= 0 ? 1 : (st2.progress || 0)

    // 标题入场
    const title = head.querySelector('.mansion-title')
    const line = head.querySelector('.mansion-line')
    const st3 = ScrollTrigger.create({
      trigger: sec, start: 'top 70%', once: true,
      onEnter: () => {
        if (App.text && App.text.reveal) App.text.reveal(title, { stagger: 0.12, duration: 1.4 })
        gsap.fromTo(line, { opacity: 0, letterSpacing: '1.2em' }, { opacity: 1, letterSpacing: '0.5em', duration: 2, ease: 'expo.out', delay: 0.5 })
      },
    })
    S.cleanup.push(() => st3.kill())

    const off = App.tick(tickDesk)
    S.cleanup.push(off)
  }

  function layoutDesk() {
    const st = S.stage
    if (!st) return
    const vw = st.clientWidth || window.innerWidth, vh = st.clientHeight || window.innerHeight
    const g = U.clamp(vw * 0.04, 16, 64)
    const hud = 64
    const colR = U.clamp(vw * 0.215, 250, 380)
    const fx0 = colR + 18, fx1 = vw - g, fy0 = hud + 6, fy1 = vh - 22
    const ratio = VBD.w / VBD.h
    const fw = Math.min(fx1 - fx0, (fy1 - fy0) * ratio)
    const stackW = Math.min(vw * 0.46, vh * 0.92)
    S.L = {
      vw, vh, g, colR,
      flatS: fw / WP, flatCx: (fx0 + fx1) / 2, flatCy: (fy0 + fy1) / 2, flatW: fw,
      stackS: stackW / WP, stackCx: vw * 0.56, stackCy: vh * 0.55, gap: vh * 0.135,
      miniS: (colR - g) * 0.74 / WP, miniCx: g + (colR - g) * 0.5, miniCy: vh * 0.505, miniGap: vh * 0.072,
      ppm: WP / VBD.w,
    }
    const persp = Math.max(1700, vw * 1.5)
    S.PERSP = M4.mul(M4.mul(M4.T(vw / 2, vh / 2, 0), M4.P(persp)), M4.T(-vw / 2, -vh / 2, 0))
    S.wire.svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`)
    S.root.style.setProperty('--mz-col', colR + 'px')
    S.root.style.setProperty('--mz-g', g + 'px')
    // 比例尺：10 m 对应的像素
    const px10 = S.L.flatS * S.L.ppm * 10
    S.root.style.setProperty('--mz-10m', px10.toFixed(1) + 'px')
    if (S.outro) { const ls = S.outro.style.letterSpacing; S.outro.style.letterSpacing = '0.5em'; S.outroW = S.outro.offsetWidth; S.outro.style.letterSpacing = ls }
    if (S.sealWall) for (const h of S.sealWall.halves) { h.pat.style.width = Math.ceil(vw * 0.5 + 80) + 'px'; h.pat.style.height = Math.ceil(vh) + 'px' }
    // 楼板内的厚度错位：按叠放的基准视角（rotateX 57°、rotateZ −36°）把 z 方向 26px 投到板面上（板面像素）
    const ek0 = 26 * Math.tan(57 * Math.PI / 180) / S.L.stackS, ea = -36 * Math.PI / 180
    const et = `translate(${(ek0 * Math.sin(ea)).toFixed(1)}px, ${(ek0 * Math.cos(ea)).toFixed(1)}px)`
    for (const fid of FIDS) if (S.floors[fid] && S.floors[fid].edgeIn) S.floors[fid].edgeIn.style.transform = et
    S.scaleEl.style.left = (S.L.flatCx - fw / 2 + 4) + 'px'
    S.scaleEl.style.top = (S.L.flatCy + (fw / ratio) / 2 - 30) + 'px'
  }

  function lerpPose(a, b, t) {
    if (t <= 0) return a
    if (t >= 1) return b
    const o = {}
    for (const k in a) o[k] = a[k] + (b[k] - a[k]) * t
    return o
  }
  const mstr = m => 'matrix3d(' + m.map(v => (Math.abs(v) < 1e-10 ? 0 : +v.toPrecision(7))).join(',') + ')'
  function poseMatrix(p) {
    let m = M4.mul(S.PERSP, M4.T(p.cx, p.cy, 0))
    m = M4.mul(m, M4.RX(p.rx))
    m = M4.mul(m, M4.RY(p.ry))
    m = M4.mul(m, M4.RZ(p.rz))
    m = M4.mul(m, M4.T(p.slide, 0, p.z))
    m = M4.mul(m, M4.S(p.s))
    return M4.mul(m, M4.T(-WP / 2, -HP / 2, 0))
  }

  function focusOf(fid, p) {
    const s = PH.segs.find(q => q.f === fid)
    return sstep(s.a, s.b, p) * (1 - sstep(s.c, s.d, p))
  }

  function computePoses(time, dt) {
    const L = S.L, p = S.p
    const sp = sstep(PH.spread[0], PH.spread[1], p) * (1 - sstep(PH.close[0], PH.close[1], p))
    const mini = sstep(PH.segs[0].a, PH.segs[0].b, p) * (1 - sstep(PH.out[0], PH.out[1], p))
    const px = S.par.x, py = S.par.y
    const end = sstep(PH.close[0], PH.close[1], p)
    S.end = end
    const drift = App.reduced ? 0 : end * Math.sin(time * 0.16) * 5
    S.zk += ((S.zoom ? 1 : 0) - S.zk) * ek(0.08, dt)
    if (Math.abs((S.zoom ? 1 : 0) - S.zk) < 0.002) S.zk = S.zoom ? 1 : 0
    const zoomed = S.zk
    S.mini = mini
    S.spread = sp
    let best = null, bestA = 0
    const out = {}
    for (let i = 0; i < 4; i++) {
      const fid = FIDS[i]
      const real = (FMETA[fid].level - 4.5) * L.ppm * L.stackS
      const expl = (i - 1.5) * L.gap
      const stack = { cx: U.lerp(L.stackCx, L.vw * 0.5, end), cy: U.lerp(L.stackCy, L.vh * 0.45, end), s: L.stackS * (1 - 0.12 * end), rx: 57 - py * 7, ry: 0, rz: -36 + px * 12 + drift, z: U.lerp(real, expl, sp) * (1 - 0.12 * end), slide: 0 }
      const mp = { cx: L.miniCx, cy: L.miniCy, s: L.miniS, rx: 58 - py * 5, ry: 0, rz: -36 + px * 9, z: (i - 1.5) * L.miniGap, slide: 0 }
      let base = lerpPose(stack, mp, mini)
      // 入场：自上方依次落下
      const k = sstep(i * 0.14, 0.5 + i * 0.14, S.enter)
      if (k < 1) base = Object.assign({}, base, { z: base.z + (1 - k) * L.vh * 0.9 })
      S.bases[fid] = base // 各层的「叠放姿态」：除 z 之外各层相同（楼梯井的竖面用它）
      const a = focusOf(fid, p)
      out[fid] = { a, k }
      if (a > bestA) { bestA = a; best = fid }
      let pose = base
      if (a > 0) {
        const drawer = Object.assign({}, base, { slide: WP * base.s * 0.62, z: base.z + 24 })
        const flat = { cx: L.flatCx, cy: L.flatCy, s: L.flatS, rx: (-py * 3.2) * (1 - zoomed), ry: (px * 3.2) * (1 - zoomed), rz: 0, z: 0, slide: 0 }
        pose = lerpPose(lerpPose(base, drawer, sstep(0, 0.42, a)), flat, sstep(0.22, 1, a))
      }
      S.poses[fid] = pose
    }
    S.focus = out
    // 一层收回、下一层还没抽到一半时，标题仍停在上一层（滞后），避免中途闪回「洋馆」
    S.active = bestA > 0.5 ? best : (mini > 0.5 && S.active && out[S.active] && out[S.active].a > 0.02 ? S.active : (mini > 0.5 && bestA > 0.02 ? best : null))
    S.flat = bestA > 0.985 ? best : null
  }

  function applyPoses() {
    for (let i = 0; i < 4; i++) {
      const fid = FIDS[i]
      const fl = S.floors[fid]
      const pose = S.poses[fid]
      const m = poseMatrix(pose)
      S.mats[fid] = m
      const tr = mstr(m)
      if (tr !== fl._tr) { fl.el.style.transform = tr; fl._tr = tr; S.dirty = true }
      const f = S.focus[fid]
      // 楼板厚度：未抽出（a = 0）时由楼板自己的 .mz-edge-in 画；抽出的前三分之一用独立底板（厚度随之收起）
      const inner = f.a === 0
      if (inner !== fl._inner) { fl._inner = inner; fl.edgeIn.style.visibility = inner ? '' : 'hidden' }
      const thick = inner ? 0 : Math.max(0, 1 - f.a * 3) * 26 * pose.s / S.L.stackS
      const tre = thick > 0.2 ? mstr(poseMatrix(Object.assign({}, pose, { z: pose.z - thick }))) : 'none'
      if (tre !== fl._tre) {
        const was = fl._tre && fl._tre !== 'none'
        fl.edge.style.transform = tre; fl._tre = tre
        if (was !== (tre !== 'none')) { fl.edge.style.visibility = tre !== 'none' ? 'visible' : 'hidden'; fl._eop = fl._ez = null }
      }
      let op = f.k
      if (S.active && S.active !== fid) op *= 0.8
      if (S.zoom && S.zoom.fid !== fid) op *= 0.06
      const ops = op.toFixed(3)
      if (ops !== fl._op) { fl.el.style.opacity = ops; fl.el.style.visibility = op < 0.005 ? 'hidden' : 'visible'; fl._op = ops }
      const z = f.a > 0.01 ? 20 : i + 1
      if (z !== fl._z) { fl.el.style.zIndex = z; fl._z = z }
      // 独立底板只在用到时才跟着写透明度与层序
      if (tre !== 'none') {
        if (fl._eop !== ops) { fl._eop = ops; fl.edge.style.opacity = ops }
        if (fl._ez !== z) { fl._ez = z; fl.edge.style.zIndex = z }
      }
      const isFlat = S.flat === fid
      if (isFlat !== fl._flat) { fl._flat = isFlat; fl.el.classList.toggle('is-flat', isFlat) }
      const stackish = f.a < 0.5
      if (stackish !== fl._stackish) { fl._stackish = stackish; fl.el.classList.toggle('is-stack', stackish); fl.rulerLive = !stackish; fl.lanS.last = ''; swapPins(fl, stackish) }
      const hov = S.hoverFloor === fid
      if (hov !== fl._hov) { fl._hov = hov; fl.el.classList.toggle('is-hover', hov) }
    }
  }

  // 米（svg 坐标）→ 屏幕
  function svgToScreen(fid, X, Y) {
    const fl = S.floors[fid]
    const vb = fl.vbs || VBD
    return project(S.mats[fid], (X - vb.x) / vb.w * WP, (Y - vb.y) / vb.h * HP)
  }
  function screenToSvg(fid, sx, sy) {
    const fl = S.floors[fid]
    const vb = fl.vbs || VBD
    const uv = unproject(S.mats[fid], sx, sy)
    if (!uv) return null
    return [vb.x + uv[0] / WP * vb.w, vb.y + uv[1] / HP * vb.h]
  }

  function updateLanterns(mx, my, inside, dt) {
    const L = S.light || lightAt(curMin())
    // 光标没动、只是楼板在动（滚动）：灯跟着光标下的那一点平移，不留缓动的尾巴（尾巴意味着之后每帧都要重写）
    const still = App.mouse.x === S._lmx && App.mouse.y === S._lmy
    S._lmx = App.mouse.x; S._lmy = App.mouse.y
    for (const fid of FIDS) {
      const fl = S.floors[fid]
      const f = S.focus[fid]
      const st = fl.lanS
      const isFlat = f.a > 0.5
      const zoomHere = !!(S.zoom && S.zoom.fid === fid)
      // 退到一侧的小叠层：只有被光标指着的那一层才点灯
      const on = fl._op !== '0.000' && (S.mini < 0.5 || isFlat || zoomHere || S.hoverFloor === fid)
      if (on !== fl._lanOn) {
        fl._lanOn = on
        fl.lens.classList.toggle('is-off', !on) // 熄灯：藏起，光池的闪烁也停
        if (on) st.fresh = true
      }
      if (!on) continue
      // 光池的闪烁、穹顶的脉冲只在看得清的那一层（放平 / 放大）跑；叠放时停住（CSS 动画每帧都要重算样式）
      const live = isFlat || zoomHere
      if (live !== fl._live) { fl._live = live; fl.lens.classList.toggle('is-still', !live); if (fl.domeEl) fl.domeEl.classList.toggle('is-still', !live) }
      let tr = isFlat ? (L.low ? LAN_R.low : LAN_R.normal) : LAN_R.stack
      const ptx = st.tx, pty = st.ty
      if (zoomHere) { st.tx = S.zoom.lx; st.ty = S.zoom.ly; tr = S.zoom.lr }
      else if (inside) {
        const q = screenToSvg(fid, mx, my)
        if (q) { st.tx = q[0]; st.ty = q[1] }
      }
      if (st.fresh) {
        // 重新点亮：从光标处慢慢亮开（淡入；不再从小放大——放大会让软边遮罩每帧重新栅格化）
        st.fresh = false; st.x = st.tx; st.y = st.ty; st.r = tr; st.fade = 0
      } else if (still && !zoomHere) { st.x += st.tx - ptx; st.y += st.ty - pty }
      if (st.fade < 1) {
        st.fade += (1 - st.fade) * ek(0.08, dt)
        if (st.fade > 0.995) st.fade = 1
        const fo = st.fade.toFixed(3)
        if (fo !== fl._fo) { fl._fo = fo; fl.lens.style.opacity = st.fade < 1 ? fo : '' }
      }
      const kk = ek(zoomHere ? 0.12 : 0.26, dt)
      st.x += (st.tx - st.x) * kk
      st.y += (st.ty - st.y) * kk
      st.r += (tr - st.r) * ek(0.08, dt)
      if (Math.abs(st.tx - st.x) < 0.004) st.x = st.tx
      if (Math.abs(st.ty - st.y) < 0.004) st.y = st.ty
      if (Math.abs(tr - st.r) < 0.004) st.r = tr
      placeLantern(fl, st.x, st.y, st.r)
    }
  }

  // 只在值变化时写 DOM
  const setD = (el, d) => { if (el._d !== d) { el._d = d; el.setAttribute('d', d) } }
  const setO = (el, o) => { if (el._o !== o) { el._o = o; el.style.opacity = o } }
  const STAIR_RECTS = [[17.4, 0, 23.8, 8.2], [8.4, 29.6, 14.2, 36], [37.8, 29.6, 43.6, 36]]
  const VD = makeView(false)
  // 屏幕空间的一根线：独立合成的 1px 细条，平移 + 旋转 + 横向缩放。
  // 实线是纯色层，怎么缩放都不用重新栅格化；虚线的长度偏离超过 15% 时才重设一次宽度（重画这一根细条）。
  // 不用的线 visibility:hidden（只设 opacity:0 的话，它照样占一层合成）
  function wline(parent, cls, dashed) {
    const el = U.el('i.mz-wl.' + cls)
    parent.appendChild(el)
    return { el, dashed: !!dashed, w0: 0, t: '', o: '0' }
  }
  function setLine(L, x1, y1, x2, y2, o) {
    if (o !== L.o) {
      if (L.o === '0') L.el.style.visibility = 'visible'
      L.o = o; L.el.style.opacity = o
      if (o === '0') { L.el.style.visibility = 'hidden'; return }
    }
    if (o === '0') return
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
    if (!L.w0 || (L.dashed ? Math.abs(len / L.w0 - 1) > 0.15 : (len > L.w0 * 4 || len < L.w0 * 0.25))) {
      const w0 = Math.max(4, Math.round(len))
      if (w0 !== L.w0) { L.w0 = w0; L.el.style.width = w0 + 'px' }
    }
    const t = `translate(${x1.toFixed(1)}px, ${y1.toFixed(1)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad) scaleX(${(len / L.w0).toFixed(4)})`
    if (t !== L.t) { L.t = t; L.el.style.transform = t }
  }
  const hideLine = L => { if (L.o !== '0') { L.o = '0'; L.el.style.opacity = '0'; L.el.style.visibility = 'hidden' } }
  const RING = [[-0.4, -0.4], [52.4, -0.4], [52.4, 36.4], [-0.4, 36.4]]

  // 楼梯井竖面：PERSP·T(cx,cy)·RX·RY·RZ（叠放姿态）· 平移到井角（z 取最上一层）· 面内基（x → 板面 x，y → −z）· 缩放
  const WFW = 1.25 // 竖面左右两条边的宽度（面内像素；投到屏幕约 1px）
  function updateFaces(W, po, rigid) {
    const B = S.bases, b0 = B && B[FIDS[0]]
    if (!b0) return
    const zs = FIDS.map(fid => B[fid].z)
    const fo = [0, 1, 2].map(i => (po[i] && rigid[i] && rigid[i + 1] ? po[i] : 0))
    const zTop = zs[3], H = zTop - zs[0]
    const on = (fo[0] || fo[1] || fo[2]) && H > 1
    let bg = ''
    let Mr = null
    if (on) {
      const stops = []
      for (let i = 2; i >= 0; i--) { // 自上而下：2F–3F、1F–2F、B1–1F
        const c = `rgba(194,154,91,${(0.5 * fo[i]).toFixed(3)})`
        stops.push(`${c} ${((zTop - zs[i + 1]) / H * 100).toFixed(2)}%`, `${c} ${((zTop - zs[i]) / H * 100).toFixed(2)}%`)
      }
      const g = `linear-gradient(180deg,${stops.join(',')})`
      bg = `${g} left top / ${WFW}px 100% no-repeat, ${g} right top / ${WFW}px 100% no-repeat`
      Mr = M4.mul(M4.mul(M4.mul(M4.mul(S.PERSP, M4.T(b0.cx, b0.cy, 0)), M4.RX(b0.rx)), M4.RY(b0.ry)), M4.RZ(b0.rz))
    }
    for (const F of W.faces) {
      if (!on) { if (F.on) { F.on = false; F.el.style.visibility = 'hidden' }; continue }
      const Wr = b0.s * (F.ub - F.ua)
      if (!F.w0 || Math.abs(Wr / F.w0 - 1) > 0.15) { F.w0 = Math.max(8, Math.round(Wr)); F.el.style.width = (F.w0 + WFW).toFixed(2) + 'px' }
      if (!F.h0 || Math.abs(H / F.h0 - 1) > 0.15) { F.h0 = Math.max(8, Math.round(H)); F.el.style.height = F.h0 + 'px' }
      const sx = Wr / F.w0, sy = H / F.h0
      const ax = b0.s * (F.ua - WP / 2) - WFW / 2 * sx, ay = b0.s * (F.va - HP / 2)
      const t = mstr(M4.mul(Mr, [sx, 0, 0, 0, 0, 0, -sy, 0, 0, 1, 0, 0, ax, ay, zTop, 1]))
      if (t !== F.t) { F.t = t; F.el.style.transform = t }
      if (bg !== F.bg) { F.bg = bg; F.el.style.background = bg }
      if (!F.on) { F.on = true; F.el.style.visibility = 'visible' }
    }
  }

  function updateWire() {
    const W = S.lines
    const P = (fid, x, y) => { const q = VD.P(x, y); return svgToScreen(fid, q[0], q[1]) }
    // 楼梯井与楼板四角的竖线：相邻两层之间一段，深浅 = 两层可见度的较小者。
    // 两层都没被抽出（a = 0，姿态只差 z）时，同一角在各层的投影共线：楼梯井由竖面画（updateFaces）；
    // 四角的虚线连着的几段深浅相同就合成一根（只写一个元素），深浅不同（入场时各层先后落下）就分段
    const vis = FIDS.map(fid => (1 - Math.min(1, S.focus[fid].a * 2.2)) * S.focus[fid].k)
    const rigid = FIDS.map(fid => S.focus[fid].a === 0)
    const po = [0, 1, 2].map(i => { const o = Math.min(vis[i], vis[i + 1]); return o > 0.01 ? o : 0 })
    const pos = po.map(o => (o ? o.toFixed(3) : '0'))
    updateFaces(W, po, rigid)
    for (const col of W.cols) {
      let used = 0, i = 0
      let pts = null
      while (i < 3) {
        if (!po[i]) { i++; continue }
        // 楼梯井的实线：两层都没被抽出的那几段由竖面画；这里只画连着被抽出那层、正在弯折淡出的段
        if (!col.dashed && rigid[i] && rigid[i + 1]) { i++; continue }
        let j = i
        let rig = rigid[i] && rigid[i + 1]
        while (j + 1 < 3 && po[j + 1] && rig && rigid[j + 2] && (!col.dashed || pos[j + 1] === pos[i])) j++
        if (!pts) pts = FIDS.map(fid => P(fid, col.x, col.y))
        const a = pts[i], b = pts[j + 1]
        setLine(col.ls[used++], a[0], a[1], b[0], b[1], pos[i])
        i = j + 1
      }
      while (used < 3) hideLine(col.ls[used++])
    }
    // 被抽出的那一层在小叠层里留下虚线空位
    if (S.active && S.mini > 0.01) {
      const fid = S.active
      const i = FIDS.indexOf(fid), L = S.L
      const mp = { cx: L.miniCx, cy: L.miniCy, s: L.miniS, rx: 58 - S.par.y * 5, ry: 0, rz: -36 + S.par.x * 9, z: (i - 1.5) * L.miniGap, slide: 0 }
      const m = poseMatrix(mp)
      const ex = S.floors[fid].ext, vb = VBD
      const c = [[ex.x, ex.y], [ex.x + ex.w, ex.y], [ex.x + ex.w, ex.y + ex.h], [ex.x, ex.y + ex.h]].map(([X, Y]) => project(m, (X - vb.x) / vb.w * WP, (Y - vb.y) / vb.h * HP))
      const go = S.mini * S.focus[fid].a
      const gs = go > 0.0005 ? go.toFixed(3) : '0'
      for (let k = 0; k < 4; k++) { const p = c[k], q = c[(k + 1) % 4]; if (gs === '0') hideLine(W.ghost[k]); else setLine(W.ghost[k], p[0], p[1], q[0], q[1], gs) }
    } else W.ghost.forEach(hideLine)
    // 悬停楼层的底色与轮廓：同一个元素、与楼板同一个 matrix3d（轮廓是它的 outline，不再是四根各自每帧重写的线）。
    // outline 宽度按楼板此刻的缩放换算成屏幕上约 1.2px；缩放变化超过 15% 才改一次
    if (S.hoverFloor) {
      const tr = mstr(S.mats[S.hoverFloor])
      if (tr !== W._hft) { W._hft = tr; W.hfill.style.transform = tr }
      const hb = 1.2 / (0.68 * Math.max(0.02, S.poses[S.hoverFloor].s))
      if (!W._hb || Math.abs(hb / W._hb - 1) > 0.15) { W._hb = hb; W.hfill.style.setProperty('--hb', hb.toFixed(2) + 'px') }
      if (!W._hfOn) { W._hfOn = true; W.hfill.style.opacity = '1'; W.hfill.style.visibility = 'visible' }
    } else {
      if (W._hfOn) { W._hfOn = false; W.hfill.style.opacity = '0'; W.hfill.style.visibility = 'hidden' }
    }
    // 楼层标签与引线
    const L = S.L
    FIDS.forEach((fid, i) => {
      const lab = S.flabels[fid]
      const f = S.focus[fid]
      const corners = RING.map(([x, y]) => P(fid, x, y))
      let left = corners[0]
      for (const c of corners) if (c[0] < left[0]) left = c
      const flat = f.a
      let lx, ly, o
      if (flat > 0.5) {
        o = 0
        lx = left[0]; ly = left[1]
      } else {
        lx = Math.max(L.g * 0.5, left[0] - (S.mini > 0.5 ? 26 : 70))
        ly = left[1]
        o = f.k * Math.max(0, 1 - flat * 4) * (1 - (S.end || 0))
      }
      const tx = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`
      if (tx !== lab._tx) { lab.style.transform = tx; lab._tx = tx }
      const os = Math.max(0, o).toFixed(3)
      if (os !== lab._o) {
        const show = o > 0.002
        if (show !== lab._show) { lab._show = show; lab.style.visibility = show ? 'visible' : 'hidden' }
        lab.style.opacity = os; lab._o = os; lab.style.pointerEvents = o > 0.3 ? 'auto' : 'none'
      }
      const hv = S.hoverFloor === fid, mn = S.mini > 0.5
      if (hv !== lab._hv) { lab._hv = hv; lab.classList.toggle('is-hover', hv) }
      if (mn !== lab._mn) { lab._mn = mn; lab.classList.toggle('is-mini', mn) }
      // 引线：标签右侧的伪元素（与标签一起平移、一起淡出）；长度通常固定，只在被页边挤短时改
      const lead = Math.max(0, Math.round(left[0] - 4 - (lx + 6))) + 'px'
      if (lead !== lab._lead) { lab._lead = lead; lab.style.setProperty('--lead', lead) }
    })
    // 终幕：正门标记与引线（引线按进度从门口画出：先竖段、再横段）
    const D = W.door
    const dk = sstep(PH.close[0] + 0.03, PH.close[1] - 0.01, S.p)
    if (dk > 0.002) {
      const q = P('1F', 26, -0.4)
      const tr = `translate(${q[0].toFixed(1)}px, ${q[1].toFixed(1)}px)`
      if (tr !== D._tr) { D._tr = tr; D.pos.style.transform = tr }
      const ow = S.outroW || 300, oy = L.vh * 0.88 - 8
      const sx0 = L.vw / 2 - ow / 2 - 18, sx1 = L.vw / 2 + ow / 2 + 18
      const y0 = q[1] + 12
      let y1, ex
      if (q[0] > sx0 && q[0] < sx1) { y1 = oy - 30; ex = q[0] } else { y1 = oy - 14; ex = q[0] >= sx1 ? sx1 : sx0 }
      const V = Math.abs(y1 - y0), Hl = Math.abs(ex - q[0])
      const drawn = dk * (V + Hl)
      const dv = Math.min(drawn, V)
      setLine(D.v, q[0], y0, q[0], y0 + Math.sign(y1 - y0) * dv, '1')
      if (Hl > 0.5 && drawn > V) setLine(D.h, q[0], y1, q[0] + Math.sign(ex - q[0]) * (drawn - V), y1, '1')
      else hideLine(D.h)
    }
    const dOn = dk > 0.002
    if (dOn !== D._on) { D._on = dOn; D.el.style.visibility = dOn ? 'visible' : 'hidden' }
    setO(D.el, dk.toFixed(3))
  }

  // 特殊动效：黑钻石封墙（菱形阵列随光标闪光；靠近时转为血粉并震动）
  // 只重画封墙那一小块（约 5 m × 1.3 m）；远处每 4 帧闪一次、灯靠近时每 2 帧，震动每 3 帧一跳。
  // 一层缩在侧边小叠层（菱形不到一像素）时不动；画质 1 级减半、不震，0 级静止。
  function animateSpecials(time, dt) {
    const fl = S.floors['1F']
    if (!fl || fl._op === '0.000') return
    const s = fl.seal
    if (!s) return
    if (S.q === 0) { stillSeal(s); return }
    // 桌面：只有一层放平（或放大、或光标指着一层）时才闪；叠放时菱形只有两三个像素，静止即可
    if (S.mode === 'desk' && S.focus['1F'] && S.focus['1F'].a < 0.5 && S.hoverFloor !== '1F' && !(S.zoom && S.zoom.fid === '1F')) { stillSeal(s); return }
    s.still = false
    const lan = fl.lanS
    const lanOn = fl._lanOn !== false
    const dist = lanOn ? Math.hypot(lan.x - s.cx, lan.y - s.cy) : 99
    const near = U.clamp(1 - (dist - 1.2) / 7)
    const hot = S.sealHot ? 1 : U.clamp(1 - (dist - 0.6) / 2.2)
    s.heat += (hot - s.heat) * ek(0.12, dt || 1)
    S.sealT++
    const full = near > 0.02 || s.heat > 0.02
    const every = (full ? 2 : 6) * (S.q >= 2 ? 1 : 2) // 灯远时的零星闪烁 10 帧/秒就够
    if (S.sealT % every) return
    const shake = s.heat > 0.35 && !App.reduced && S.q >= 2
    const jitNow = shake && (S.sealT / every) % 3 < 1
    for (const dm of s.dias) {
      const dd = lanOn ? Math.hypot(lan.x - dm.x, lan.y - dm.y) : 99
      const lit = U.clamp(1 - dd / 6) * near
      const tw = Math.pow(0.5 + 0.5 * Math.sin(time * dm.sp * 2.4 + dm.ph), 14)
      const o = U.clamp(0.1 + tw * 0.75 * (0.35 + lit) + lit * 0.5)
      const so = (Math.round(o * 10) / 10).toFixed(1) // 分 10 档：少写一大半（每写一次就是一个元素重算样式；菱形只有几像素，看不出分档）
      if (so !== dm.lastO) { dm.el.style.strokeOpacity = so; dm.lastO = so }
      const blood = s.heat > 0.35 && (dd < 3.2 || S.sealHot)
      const f = blood ? (tw > 0.2 ? '#ff2e7e' : '#5a0a2a') : (tw > 0.6 && lit > 0.2 ? '#2a2422' : '#060505')
      if (f !== dm.lastF) { dm.el.style.fill = f; dm.lastF = f }
      if (shake) {
        if (jitNow) {
          const j = 0.07 * s.heat
          dm.el.setAttribute('transform', `translate(${U.rand(-j, j).toFixed(3)} ${U.rand(-j, j).toFixed(3)})`)
          dm.jit = true
        }
      } else if (dm.jit) { dm.el.setAttribute('transform', 'translate(0 0)'); dm.jit = false }
    }
  }
  function stillSeal(s) {
    if (s.still) return
    s.still = true
    for (const dm of s.dias) {
      dm.el.style.strokeOpacity = ''; dm.el.style.fill = ''; dm.lastO = dm.lastF = ''
      if (dm.jit) { dm.el.setAttribute('transform', 'translate(0 0)'); dm.jit = false }
    }
  }

  function tickDesk(time) {
    if (!S.visible || !S.L) { S.lastNow = 0; return }
    const dt = frameDt()
    const r = S.stage.getBoundingClientRect()
    const mx = App.mouse.x - r.left, my = App.mouse.y - r.top
    const inside = App.mouse.active && mx >= 0 && my >= 0 && mx <= r.width && my <= r.height
    const tx = inside ? (mx / r.width - 0.5) : 0, ty = inside ? (my / r.height - 0.5) : 0
    const k = ek(App.reduced ? 0.02 : 0.05, dt)
    const gx = tx * (App.reduced ? 0.4 : 1), gy = ty * (App.reduced ? 0.4 : 1)
    S.par.x += (gx - S.par.x) * k
    S.par.y += (gy - S.par.y) * k
    if (Math.abs(gx - S.par.x) < 0.0008) S.par.x = gx
    if (Math.abs(gy - S.par.y) < 0.0008) S.par.y = gy
    computePoses(time, dt)
    applyPoses()

    // 抽出时 whoosh
    if (S.active !== S.lastActive) {
      if (S.active) {
        if (S.lastActive !== undefined) App.audio.sfx('whoosh', { pan: 0.3 })
        setHeadFloor(S.active)
      }
      if (!S.active && S.zoom) closeRoom(true)
      S.lastActive = S.active
      S.root.classList.toggle('is-focus', !!S.active)
    }
    // 放大时页面被拖走（触屏、滚动条、键盘以外的途径）：收起房间
    if (S.zoom && (S.flat !== S.zoom.fid || Math.abs(S.p - S.zoom.p0) > 0.004)) closeRoom()
    // 放平的楼层变了：旧提示作废；新平面若正好在光标下，直接点亮光标下的房间
    if (S.flat !== S._lastFlat) {
      S._lastFlat = S.flat
      clearTimeout(S._hideT)
      setHoverRoom(null)
      S.sealHot = false
      hideTip()
      if (S.flat && inside && !S.zoom) probeHover()
    }
    const isMini = S.mini > 0.5
    if (isMini !== S._isMini) { S._isMini = isMini; S.root.classList.toggle('is-mini', isMini) }
    const outroK = sstep(PH.close[0] + 0.03, PH.close[1] - 0.01, S.p)
    if (Math.abs(outroK - (S._ok || 0)) > 0.002 || (outroK === 0 && S._ok)) {
      S._ok = outroK
      const on = outroK > 0.002
      if (on !== S._oOn) { S._oOn = on; S.outro.style.visibility = on ? 'visible' : 'hidden' }
      if (on) { S.outro.style.opacity = outroK.toFixed(3); S.outro.style.transform = `translate(-50%, ${(1 - outroK) * 16}px)`; S.outro.style.letterSpacing = (0.9 - outroK * 0.4).toFixed(3) + 'em' }
    }
    updateSealWall(mx, my, inside)

    // 叠放时：光标悬停楼层
    let hf = null
    if (inside && !S.zoom && !S.dragOver) {
      const cand = FIDS.slice().reverse()
      for (const fid of cand) {
        const f = S.focus[fid]
        if (f.a > 0.05 || f.k < 0.6) continue
        const q = screenToSvg(fid, mx, my)
        if (!q) continue
        const ex = S.floors[fid].ext
        if (q[0] >= ex.x && q[0] <= ex.x + ex.w && q[1] >= ex.y && q[1] <= ex.y + ex.h) { hf = fid; break }
      }
      // 平面区域内不选小叠层以外的楼层
      if (S.active && hf && mx > S.L.colR + 10) hf = null
    }
    if (hf !== S.hoverFloor) {
      S.hoverFloor = hf
      if (hf) { App.audio.sfx('hover', { pan: (mx / r.width - 0.5) }); if (App.cursor && App.cursor.set) App.cursor.set(hf) }
      else if (App.cursor && App.cursor.clear) App.cursor.clear()
    }

    updateLanterns(mx, my, inside, dt)
    syncHands()
    if (S.dirty || S.hoverFloor !== S._wireHover) { S.dirty = false; S._wireHover = S.hoverFloor; updateWire() }
    animateSpecials(time, dt)
    if (S.zoom) updateStrings()

    // 背景大字的视差（直接写在元素上，不经由根节点的变量，免得整棵 SVG 重算样式）
    if (S.bgword && !S.active) {
      const bt = `translate(${(-S.par.x * 26).toFixed(1)}px, calc(-50% + ${(-S.par.y * 18).toFixed(1)}px))`
      if (bt !== S._bt) { S._bt = bt; S.bgword.style.transform = bt }
    }

    // 提示跟随
    if (S.tipOn) {
      const tw = S.tipW || 180, th = S.tipH || 70
      let x = mx + 22, y = my + 20
      if (x + tw > r.width - 12) x = mx - tw - 22
      if (y + th > r.height - 12) y = my - th - 18
      const t = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      if (t !== S._tipT) { S._tipT = t; S.tip.style.transform = t }
    }
  }

  /* —— 终幕封墙 —— */
  const SEAL_TW = 24, SEAL_TH = 28, SEAL_R = 190
  function updateSealWall(mx, my, inside) {
    const W = S.sealWall
    if (!W) return
    const e = sstep(PH.close[0] + 0.01, PH.close[1] - 0.012, S.p)
    const isEnd = e > 0.001
    if (isEnd !== S._isEnd) { S._isEnd = isEnd; S.root.classList.toggle('is-end', isEnd); W.el.style.visibility = isEnd ? 'visible' : 'hidden' }
    const glint = e > 0.6
    if (glint !== S._glint) {
      S._glint = glint
      if (glint) for (const h of W.halves) for (const g of h.glints) placeGlint(h, g) // 先散开，再开始闪
      S.root.classList.toggle('is-glint', glint)
    }
    if (!isEnd) { W.k = 0; return }
    const L = S.L
    const px = S.par.x * 16
    for (const h of W.halves) {
      const dir = h.side === 'l' ? -1 : 1
      const tx = dir * (1 - e) * (L.vw * 0.5 + 60) - px
      const t = `translate3d(${tx.toFixed(1)}px, 0, 0)`
      if (t !== h._t) { h._t = t; h.el.style.transform = t }
      h.x0 = (h.side === 'l' ? -40 : L.vw * 0.5) + tx // 半扇左缘（屏幕坐标）
      const lx = inside ? mx - h.x0 : -9999, ly = inside ? my : -9999
      if (Math.abs(lx - h.lx) > 0.5 || Math.abs(ly - h.ly) > 0.5) {
        h.lx = lx; h.ly = ly
        const ox = lx - SEAL_R, oy = ly - SEAL_R
        h.lens.style.transform = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0)`
        h.pat.style.transform = `translate3d(${(-ox).toFixed(1)}px, ${(-oy).toFixed(1)}px, 0)`
      }
    }
    const st = `translate3d(${(-px).toFixed(1)}px, 0, 0)`
    if (st !== W._st) { W._st = st; W.seam.style.transform = st }
    // 合拢的一瞬：一声闭门、轻震、缝里渗出一线血光
    const shut = e > 0.985
    if (shut !== W.shut) {
      W.shut = shut
      S.root.classList.toggle('is-shut', shut)
      if (shut && S.visible && W.k > 0.2) {
        App.audio.sfx('door', { volume: 0.8 })
        if (!App.reduced) App.shake(S.stage, 5, 0.32)
        gsap.fromTo(W.seam, { opacity: 1, scaleX: 9 }, { opacity: 0.8, scaleX: 1, duration: 0.9, ease: 'expo.out', overwrite: true })
      } else if (shut) gsap.to(W.seam, { opacity: 0.8, scaleX: 1, duration: 0.6, overwrite: true }) // 直接跳到终幕：不补那一声
      else gsap.to(W.seam, { opacity: 0, duration: 0.3, overwrite: true })
    }
    W.k = e
  }
  // 一粒闪光落在光标附近的一颗菱形上（偶尔落在别处）；离光标近的偶尔是血粉色
  function placeGlint(h, g) {
    if (!h || !S.L) return
    const lit = h.lx > -9000
    let cx, cy, near = false
    if (lit && Math.random() < 0.82) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * SEAL_R * 0.85
      cx = h.lx + Math.cos(a) * d; cy = h.ly + Math.sin(a) * d
      near = d < SEAL_R * 0.45
    } else { cx = Math.random() * (S.L.vw * 0.5 + 40); cy = Math.random() * S.L.vh }
    const x = Math.round((cx - SEAL_TW / 2) / SEAL_TW) * SEAL_TW, y = Math.round((cy - SEAL_TH / 2) / SEAL_TH) * SEAL_TH
    g.style.transform = `translate3d(${x}px, ${y}px, 0)`
    g.classList.toggle('is-blood', near && Math.random() < 0.34)
  }

  function showTip() {
    if (!S.tip) return
    S.tipOn = true
    S.tip.classList.add('is-on')
    S.tipW = S.tip.offsetWidth
    S.tipH = S.tip.offsetHeight
  }
  function hideTip() {
    if (!S.tip) return
    S.tipOn = false
    S.tip.classList.remove('is-on')
  }
  // 平面刚放平而光标不动时，没有 pointerover；主动查一次光标下是谁
  function probeHover() {
    const t = document.elementFromPoint(App.mouse.x, App.mouse.y)
    if (!t || !t.getAttribute) return
    const key = t.getAttribute('data-room')
    const svg = t.ownerSVGElement
    const fid = svg && svg.getAttribute('data-floor')
    if (key && fid && S.flat === fid) setHoverRoom({ fid, key })
  }

  function setHeadFloor(fid) {
    const head = S.head
    const code = head.querySelector('.mansion-head-code')
    const cn = head.querySelector('.mansion-head-cn')
    const el = head.querySelector('.mansion-head-elev')
    if (App.text && App.text.scramble) App.text.scramble(code, fid, { duration: 0.6, chars: 'B1F23' })
    else code.textContent = fid
    cn.textContent = FMETA[fid].cn
    el.textContent = elevText(FMETA[fid].level)
    gsap.fromTo([cn, el], { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out' })
  }

  function jumpTo(fid) {
    const sec = S.el
    const seg = PH.segs.find(s => s.f === fid)
    if (!seg) return
    const top = sec.getBoundingClientRect().top + window.scrollY
    const span = sec.offsetHeight - window.innerHeight
    const y = top + ((seg.b + seg.c) / 2) * span
    if (S.zoom) closeRoom(true)
    App.scroll.to(y, { duration: 1.4 })
  }

  /* —— 房间悬停 —— */
  function setHoverRoom(h) {
    const prev = S.hoverRoom
    if (prev && h && prev.key === h.key) return
    S.hoverRoom = h
    if (prev) {
      const fl = S.floors[prev.fid]
      if (fl && fl.roomEls[prev.key]) fl.roomEls[prev.key].hit.classList.remove('is-hover')
      if (fl && (!h || h.fid !== prev.fid)) setHoverFill(fl, null)
    }
    if (!h) {
      if (!S.sealHot) hideTip()
      for (const fid in S.floors) { const fl = S.floors[fid]; fl.hl.classList.remove('is-on') }
      return
    }
    const fl = S.floors[h.fid]
    const re = fl.roomEls[h.key]
    re.hit.classList.add('is-hover')
    setHoverFill(fl, re.rr)
    // 悬停框在房间之间滑行
    moveHl(fl, Object.assign({}, re.rr), 0.38)
    if (S.tip) {
      fillTip(S.tip, roomByKey[h.key], h.fid)
      showTip()
    }
  }

  function bindDeskEvents() {
    const stage = S.stage
    const onOver = e => {
      if (S.zoom) return
      const t = e.target
      if (t.classList && t.classList.contains('mz-seal-hit')) {
        if (S.flat !== '1F') return
        clearTimeout(S._hideT)
        setHoverRoom(null)
        S.sealHot = true
        const now = performance.now()
        if (!S._glitchAt || now - S._glitchAt > 1400) { S._glitchAt = now; App.audio.sfx('glitch', { volume: 0.7 }) }
        fillTip(S.tip, null, '1F', { name: '正门', mood: atmos('黑钻石', '正门外紧贴黑钻石墙'), blood: true })
        showTip()
        return
      }
      const key = t.getAttribute && t.getAttribute('data-room')
      if (key) {
        const svg = t.ownerSVGElement
        const fid = svg && svg.getAttribute('data-floor')
        if (fid && S.flat === fid) { clearTimeout(S._hideT); setHoverRoom({ fid, key }) }
      }
    }
    const onOut = e => {
      const t = e.target
      if (t.classList && t.classList.contains('mz-seal-hit')) { S.sealHot = false; if (!S.hoverRoom) hideTip() }
      const rel = e.relatedTarget
      if (!rel || !(rel.getAttribute && (rel.getAttribute('data-room') || rel.classList.contains('mz-seal-hit')))) {
        if (S.hoverRoom && t.getAttribute && t.getAttribute('data-room')) { clearTimeout(S._hideT); S._hideT = setTimeout(() => setHoverRoom(null), 90) }
      }
    }
    stage.addEventListener('pointerover', onOver)
    stage.addEventListener('pointerout', onOut)
    stage.addEventListener('click', e => {
      if (S.zoom) return
      const t = e.target
      const key = t.getAttribute && t.getAttribute('data-room')
      if (key) {
        const fid = t.ownerSVGElement && t.ownerSVGElement.getAttribute('data-floor')
        if (fid && S.flat === fid) { if (!App.finePointer) App.audio.sfx('click'); openRoom(fid, key) }
        return
      }
      if (t.classList && t.classList.contains('mz-seal-hit')) {
        const fl = S.floors['1F']
        App.glitch(S.tip, 0.4)
        if (fl && fl.seal) fl.seal.heat = 1.4
        App.shake(S.stage, 4, 0.3)
        return
      }
      if (S.hoverFloor) { jumpTo(S.hoverFloor); return }
    })
    // 房间放大时不停 Lenis：Lenis 停下会给 <html> 加 overflow:clip，body（overflow-x:hidden）随即成了滚动容器，
    // 钉住的舞台就改为相对 body 粘附、跳回板块顶部——整个舞台从视口里消失。改为在捕获阶段截下滚轮与翻页键。
    const SCROLL_KEYS = { ' ': 1, PageDown: 1, PageUp: 1, ArrowDown: 1, ArrowUp: 1, Home: 1, End: 1 }
    const onKey = e => {
      if (!S.zoom) return
      if (e.key === 'Escape') { closeRoom(); return }
      if (SCROLL_KEYS[e.key] && !(e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable]'))) { e.preventDefault(); closeRoom() }
    }
    window.addEventListener('keydown', onKey)
    const onWheel = e => {
      if (!S.zoom) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (performance.now() - S.zoom.t0 > 700) closeRoom()
    }
    window.addEventListener('wheel', onWheel, { capture: true, passive: false })
    S.cleanup.push(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel, { capture: true }) })
  }

  /* =====================================================================
     点开房间：放大 + 证物标签
     ===================================================================== */
  function vbAnimate(fl, to, dur, ease, done) {
    if (!fl.vbs) fl.vbs = Object.assign({}, fl.view.vb)
    gsap.killTweensOf(fl.vbs)
    return gsap.to(fl.vbs, Object.assign({}, to, {
      duration: dur, ease: ease || 'expo.inOut', onComplete: done,
      onUpdate: () => {
        const v = [fl.vbs.x, fl.vbs.y, fl.vbs.w, fl.vbs.h].map(q => q.toFixed(3)).join(' ')
        for (const sv of fl.svgs) sv.setAttribute('viewBox', v)
        placeDome(fl)
        placeTx(fl)
        fl.lanS.last = ''
      },
    }))
  }

  function zoomTargetVB(fl, rr, fracW, fracH) {
    const vb = fl.view.vb
    const asp = vb.w / vb.h
    let w = Math.max(rr.w / fracW, (rr.h / fracH) * asp, 9)
    w = Math.min(w, vb.w)
    const h = w / asp
    const x = U.clamp(rr.x + rr.w / 2 - w / 2, vb.x, vb.x + vb.w - w)
    const y = U.clamp(rr.y + rr.h / 2 - h / 2, vb.y, vb.y + vb.h - h)
    return { x, y, w, h }
  }

  function anchorsFor(room, n) {
    const rnd = U.seeded(hash(room.key))
    const pts = []
    // 狭长的房间（廊、休息厅）锚点排成一列/一行，免得编号挤在一起
    const tall = room.h > room.w * 2.2, wide = room.w > room.h * 2.2
    const cols = tall ? 1 : wide ? n : (n > 2 ? 2 : n)
    for (let i = 0; i < n; i++) {
      const cx = (i % cols + 0.5) / cols, cy = (Math.floor(i / cols) + 0.5) / Math.ceil(n / cols)
      const fx = U.clamp(cx + (rnd() - 0.5) * 0.22, 0.14, 0.86), fy = U.clamp(cy + (rnd() - 0.5) * 0.22, 0.16, 0.84)
      pts.push([room.x0 + room.w * fx, room.y0 + room.h * fy])
    }
    return pts
  }
  const isWeapon = (room, obj) => room.weapons.some(w => w.indexOf(obj) >= 0 || obj.indexOf(w) >= 0 || (w.length >= 3 && obj.indexOf(w.slice(-3)) >= 0))

  function buildZoomMarks(fl, room, anchors, pxPerUnit) {
    const g = fl.gZoom
    g.innerHTML = ''
    const v = fl.view
    const u = 1 / pxPerUnit // 一个屏幕像素对应的 svg 单位
    const rr = v.rect(room.x0, room.y0, room.x1, room.y1)
    // 尺寸线
    const off = 16 * u, tk = 5 * u
    const dims = mk('g', { class: 'mz-dim' }, g)
    const top = rr.y - off, left = rr.x - off
    mk('path', { d: `M${r3(rr.x)} ${r3(top)}H${r3(rr.x + rr.w)}M${r3(rr.x)} ${r3(top - tk)}V${r3(top + tk)}M${r3(rr.x + rr.w)} ${r3(top - tk)}V${r3(top + tk)}M${r3(left)} ${r3(rr.y)}V${r3(rr.y + rr.h)}M${r3(left - tk)} ${r3(rr.y)}H${r3(left + tk)}M${r3(left - tk)} ${r3(rr.y + rr.h)}H${r3(left + tk)}` }, dims)
    const fs = 10.5 * u
    const wv = v.rot ? room.h : room.w, hv = v.rot ? room.w : room.h
    const fmt = q => q.toFixed(2).replace(/\.?0+$/, '')
    txt(dims, rr.x + rr.w / 2, top - 7 * u, fs, fmt(wv))
    txt(dims, left - 7 * u, rr.y + rr.h / 2, fs, fmt(hv), null, -90)
    // 证物锚点
    const marks = []
    anchors.forEach((a, i) => {
      const p = v.P(a[0], a[1])
      const m = mk('g', { class: 'mz-anchor' + (isWeapon(room, room.objects[i]) ? ' is-weapon' : '') }, g)
      mk('circle', { cx: r3(p[0]), cy: r3(p[1]), r: r3(9 * u) }, m)
      mk('circle', { cx: r3(p[0]), cy: r3(p[1]), r: r3(2.4 * u), class: 'c' }, m)
      mk('path', { d: `M${r3(p[0] - 14 * u)} ${r3(p[1])}H${r3(p[0] - 10 * u)}M${r3(p[0] + 10 * u)} ${r3(p[1])}H${r3(p[0] + 14 * u)}M${r3(p[0])} ${r3(p[1] - 14 * u)}V${r3(p[1] - 10 * u)}M${r3(p[0])} ${r3(p[1] + 10 * u)}V${r3(p[1] + 14 * u)}` }, m)
      txt(m, p[0] + 12 * u, p[1] - 11 * u, 9 * u, String(i + 1).padStart(2, '0'), { class: 'n' })
      marks.push({ g: m, p })
    })
    return marks
  }

  function openRoom(fid, key) {
    const fl = S.floors[fid]
    const room = roomByKey[key]
    if (!fl || !room || S.zoom) return
    setHoverRoom(null)
    // 滚动若还在惯性滑行，就地刹住（否则页面继续滑走，房间刚打开又被收起）
    const ln = App.scroll && App.scroll.lenis
    if (ln && ln.isScrolling) ln.scrollTo(ln.scroll, { immediate: true, force: true })
    const rr = fl.view.rect(room.x0, room.y0, room.x1, room.y1)
    const target = zoomTargetVB(fl, rr, 0.36, 0.54)
    const pxPerUnit = (S.L.flatW) / target.w
    const n = Math.max(1, Math.min(4, room.objects.length))
    const anchors = anchorsFor(room, n)
    S.zoom = { fid, key, room, lx: rr.x + rr.w / 2, ly: rr.y + rr.h / 2, lr: Math.hypot(rr.w, rr.h) * 0.7 + 1.5, t0: performance.now(), p0: S.p, anchors: [], tags: [] }
    S.root.classList.add('is-zoom')
    // 放大期间把平面裁在自己的框里：否则 overflow:visible 的 SVG 会把整层放大画到框外，合成层随之膨胀到数千像素
    fl.el.classList.add('is-clip')
    // 聚光
    const vb = fl.view.vb
    fl.spot.setAttribute('d', `M${vb.x - 5} ${vb.y - 5}H${vb.x + vb.w + 5}V${vb.y + vb.h + 5}H${vb.x - 5}Z M${r3(rr.x)} ${r3(rr.y)}V${r3(rr.y + rr.h)}H${r3(rr.x + rr.w)}V${r3(rr.y)}Z`)
    fl.focus.setAttribute('d', fl.outline[key])
    gsap.fromTo(fl.spot, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' })
    gsap.fromTo(fl.focus, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'steps(3)', delay: 0.15 })
    // 放大
    vbAnimate(fl, target, 1.05, 'expo.inOut')
    const marks = buildZoomMarks(fl, room, anchors, pxPerUnit)
    gsap.fromTo(fl.gZoom, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.75 })
    // 卡片
    const card = S.zl.querySelector('.mansion-zcard')
    card.querySelector('.mansion-zcard-code').textContent = fid + (room.suite ? ' · No.' + String(room.suite).padStart(2, '0') : '') + (room.parent ? ' · ' + room.parent : '')
    const nameEl = card.querySelector('.mansion-zcard-name')
    nameEl.textContent = room.name
    nameEl._chars = null
    const moodEl = card.querySelector('.mansion-zcard-mood')
    moodEl.textContent = ''
    const meta = card.querySelector('.mansion-zcard-meta')
    meta.innerHTML = ''
    meta.append(U.el('span.mansion-zcard-dim', { text: room.w.toFixed(1) + ' × ' + room.h.toFixed(1) + ' m' }))
    if (room.surface) meta.append(U.el('span.mansion-zcard-surf', { text: room.surface }))
    if (room.win) meta.append(U.el('span.mansion-zcard-win', { 'aria-hidden': 'true' }))
    S.zl.classList.add('is-on')
    gsap.fromTo(card, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out', delay: 0.25 })
    if (App.text && App.text.reveal) App.text.reveal(nameEl, { stagger: 0.06, duration: 1, delay: 0.3 })
    if (room.mood && App.text && App.text.scramble) gsap.delayedCall(0.6, () => { if (S.zoom && S.zoom.key === key) App.text.scramble(moodEl, room.mood, { duration: 1 }) })
    else moodEl.textContent = room.mood
    // 证物标签：等放大落定后散开
    const tagsBox = S.zl.querySelector('.mansion-tags')
    tagsBox.innerHTML = ''
    S.zoom.marks = marks
    gsap.delayedCall(0.95, () => { if (S.zoom && S.zoom.key === key) scatterTags(fl, room, marks, tagsBox) })
  }

  function scatterTags(fl, room, marks, box) {
    const L = S.L
    const pts = marks.map(m => svgToScreen(fl.fid, m.p[0], m.p[1]))
    const rr = fl.roomEls[room.key].rr
    const c0 = svgToScreen(fl.fid, rr.x, rr.y), c1 = svgToScreen(fl.fid, rr.x + rr.w, rr.y + rr.h)
    const R = { l: Math.min(c0[0], c1[0]), r: Math.max(c0[0], c1[0]), t: Math.min(c0[1], c1[1]), b: Math.max(c0[1], c1[1]) }
    const tw = 196, th = 74
    const minX = L.colR + 18, maxX = L.vw - L.g - tw
    const sides = []
    const n = marks.length
    // 锚点在房间左半的证物挂到左边、右半的挂到右边：线不交叉
    const cxs = (R.l + R.r) / 2
    for (let i = 0; i < n; i++) sides.push(pts[i][0] < cxs ? 'l' : 'r')
    const roomL = R.l - minX, roomR = maxX + tw - R.r
    for (let i = 0; i < n; i++) {
      if (sides[i] === 'l' && roomL < tw + 40) sides[i] = 'r'
      if (sides[i] === 'r' && roomR < tw + 40) sides[i] = roomL >= tw + 40 ? 'l' : 'r'
    }
    const bySide = { l: [], r: [] }
    marks.forEach((m, i) => bySide[sides[i]].push(i))
    const midY = (R.t + R.b) / 2
    const tags = []
    for (const side of ['l', 'r']) {
      const list = bySide[side]
      list.sort((a, b) => pts[a][1] - pts[b][1])
      list.forEach((i, k) => {
        const obj = room.objects[i]
        const weapon = isWeapon(room, obj)
        const rot = (hash(room.key + obj) % 900) / 100 - 4.5
        const x = side === 'r' ? Math.min(maxX, R.r + 46 + (k % 2) * 22) : Math.max(minX, R.l - 46 - tw - (k % 2) * 22)
        let y = midY + (k - (list.length - 1) / 2) * (th + 26) - th / 2
        y = U.clamp(y, 80, L.vh - th - 30)
        const el = U.el('div.mansion-tag' + (weapon ? '.is-weapon' : ''), { style: { left: x + 'px', top: y + 'px', '--r': rot.toFixed(2) + 'deg' } }, [
          U.el('i.mansion-tag-hole'),
          U.el('span.mansion-tag-no', { text: String(i + 1).padStart(2, '0') }),
          U.el('span.mansion-tag-name', { text: obj }),
        ])
        box.appendChild(el)
        const pin = side === 'r' ? [x + 16, y + th / 2] : [x + tw - 16, y + th / 2]
        const str = mk('path', { class: 'mz-w-string' + (weapon ? ' is-weapon' : '') }, S.wire.strings)
        tags.push({ el, i, pin, str, side })
        // 光标落在证物牌上：牌子浮起，红线绷紧，锚点发亮
        const mark = marks[i]
        el.setAttribute('data-cursor', '') // 光标只放大不写字，不挡牌上的字（悬停声由光标统一发出）
        el.addEventListener('pointerenter', () => { el.classList.add('is-hot'); str.classList.add('is-hot'); mark.g.classList.add('is-hot') })
        el.addEventListener('pointerleave', () => { el.classList.remove('is-hot'); str.classList.remove('is-hot'); mark.g.classList.remove('is-hot') })
        const from = pts[i]
        gsap.fromTo(el, { x: from[0] - x - tw / 2, y: from[1] - y - th / 2, scale: 0.2, opacity: 0, rotate: rot * 4 },
          { x: 0, y: 0, scale: 1, opacity: 1, rotate: rot, duration: 0.95, ease: 'expo.out', delay: 0.08 * tags.length })
        gsap.delayedCall(0.08 * tags.length + 0.25, () => { if (S.zoom) App.audio.sfx('card', { volume: 0.45, pan: side === 'r' ? 0.35 : -0.35 }) })
        str._k = 0
        gsap.to(str, { _k: 1, duration: 0.9, ease: 'expo.out', delay: 0.08 * tags.length + 0.15 })
      })
    }
    if (S.zoom) S.zoom.tags = tags
    if (tags.length) S.wire.svg.classList.add('is-on') // 证物红线的全屏 SVG 平时藏起（不占一层整屏合成）
  }

  function updateStrings() {
    const z = S.zoom
    if (!z || !z.tags || !z.marks) return
    for (const t of z.tags) {
      const m = z.marks[t.i]
      const a = svgToScreen(z.fid, m.p[0], m.p[1])
      const k = t.str._k || 0
      const b = t.pin
      const ex = a[0] + (b[0] - a[0]) * k, ey = a[1] + (b[1] - a[1]) * k
      const sag = 18 * k
      const mx = (a[0] + ex) / 2, my = (a[1] + ey) / 2 + sag
      setD(t.str, `M${a[0].toFixed(1)} ${a[1].toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`)
    }
  }

  function closeRoom(instant) {
    const z = S.zoom
    if (!z) return
    S.zoom = null
    const fl = S.floors[z.fid]
    S.root.classList.remove('is-zoom')
    S.zl.classList.remove('is-on')
    const tags = z.tags || []
    const d = instant ? 0 : 0.5
    tags.forEach((t, i) => {
      gsap.to(t.el, { opacity: 0, scale: 0.6, y: 20, duration: d * 0.8, delay: i * 0.04, ease: 'power2.in', onComplete: () => t.el.remove() })
      gsap.to(t.str, { opacity: 0, duration: d * 0.6, onComplete: () => t.str.remove() })
    })
    gsap.to(fl.gZoom, { opacity: 0, duration: d * 0.6, onComplete: () => { fl.gZoom.innerHTML = '' } })
    if (S.wire) gsap.delayedCall(d * 0.6 + 0.05, () => { if (!S.zoom && S.wire && !S.wire.strings.childElementCount) S.wire.svg.classList.remove('is-on') })
    gsap.to([fl.spot, fl.focus], { opacity: 0, duration: d })
    vbAnimate(fl, Object.assign({}, fl.view.vb), instant ? 0.01 : 0.9, 'expo.inOut', () => { if (!S.zoom) fl.el.classList.remove('is-clip') })
  }

  /* =====================================================================
     手机：楼层标签 + 平面
     ===================================================================== */
  function buildMob(sec) {
    sec.classList.add('is-mob')
    const root = U.el('div.mansion-mob')
    S.root = root
    const head = U.el('header.mansion-mhead', {}, [
      U.el('h2.mansion-title', { text: '洋馆' }),
      U.el('p.mansion-line', { text: atmos('窗后没有太阳', '窗后没有太阳') }),
    ])
    const tabs = U.el('div.mansion-tabs', { role: 'tablist' })
    S.tabs = {}
    for (const fid of FIDS.slice().reverse()) {
      const b = U.el('button.mansion-tab', { type: 'button', role: 'tab', 'data-floor': fid, 'aria-label': FMETA[fid].cn }, [
        U.el('i.mansion-tab-slab', { 'aria-hidden': 'true' }),
        U.el('span.mansion-tab-code', { text: fid }),
        U.el('span.mansion-tab-elev', { text: elevText(FMETA[fid].level) }),
      ])
      b.addEventListener('click', () => showMobFloor(fid))
      tabs.appendChild(b)
      S.tabs[fid] = b
    }
    const plan = U.el('div.mansion-mplan')
    S.mplan = plan
    for (const fid of FIDS) {
      const fl = buildFloor(fid, makeView(true))
      fl.el.classList.add('mansion-mfloor')
      fl.rulerLive = true
      plan.appendChild(fl.el)
      S.floors[fid] = fl
    }
    const cap = U.el('div.mansion-mcap', { 'aria-live': 'polite' }, [U.el('div.mansion-tip-row', {}, [U.el('span.mansion-tip-code'), U.el('span.mansion-tip-win')]), U.el('div.mansion-tip-name'), U.el('div.mansion-tip-mood')])
    S.mcap = cap
    const tagsBox = U.el('div.mansion-mtags')
    S.mtags = tagsBox
    const dialRow = U.el('div.mansion-mdial')
    dialRow.appendChild(buildDial())
    // 终幕：两扇黑钻石封墙随滚动合拢
    const outro = U.el('p.mansion-mout', { text: atmos('没有通向室外', '没有通向室外的路') })
    const mend = U.el('div.mansion-mend', { 'data-cursor': '' })
    const mh = [U.el('div.mansion-seal-half.mansion-mend-half.is-l', {}, [U.el('b.mansion-seal-edge')]), U.el('div.mansion-seal-half.mansion-mend-half.is-r', {}, [U.el('b.mansion-seal-edge')])]
    const rnd = U.seeded(7)
    mh.forEach((h, side) => {
      for (let i = 0; i < 5; i++) {
        const g = U.el('i.mansion-glint')
        g.style.transform = `translate3d(${Math.round(rnd() * 7 + (side ? 0 : 1)) * 24}px, ${Math.round(rnd() * 6) * 28}px, 0)`
        g.style.animationDelay = (-rnd() * 3.3).toFixed(2) + 's'
        if (i === 2) g.classList.add('is-blood')
        h.appendChild(g)
      }
    })
    const mseam = U.el('i.mansion-seal-seam')
    mend.append(mh[0], mh[1], mseam, outro)
    root.append(head, tabs, plan, cap, tagsBox, dialRow, mend)
    sec.appendChild(root)
    let mshut = false
    const stEnd = ScrollTrigger.create({
      trigger: mend, start: 'top 96%', end: 'center 56%', scrub: true,
      onUpdate: self => {
        const k = sstep(0, 1, self.progress)
        gsap.set(mh[0], { xPercent: -100 * (1 - k) })
        gsap.set(mh[1], { xPercent: 100 * (1 - k) })
        root.classList.toggle('is-end', k > 0.01)
        const shut = k > 0.985
        if (shut !== mshut) {
          mshut = shut
          if (shut) { App.audio.sfx('door', { volume: 0.7 }); gsap.fromTo(mseam, { opacity: 1, scaleX: 7 }, { opacity: 0.85, scaleX: 1, duration: 0.9, ease: 'expo.out', overwrite: true }) }
          else gsap.to(mseam, { opacity: 0, duration: 0.3, overwrite: true })
        }
      },
    })
    gsap.set(mh[0], { xPercent: -100 }); gsap.set(mh[1], { xPercent: 100 })
    S.cleanup.push(() => stEnd.kill())
    mend.addEventListener('click', () => { App.glitch(outro, 0.4); App.audio.sfx('glitch', { volume: 0.6 }) })

    plan.addEventListener('click', e => onMobTap(e))
    const off = App.tick(tickMob)
    S.cleanup.push(off)
    measureMob()
    showMobFloor('1F', true)
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top 75%', once: true,
      onEnter: () => {
        if (App.text && App.text.reveal) App.text.reveal(head.querySelector('.mansion-title'), { stagger: 0.12 })
        gsap.from(tabs.children, { opacity: 0, y: 16, stagger: 0.06, duration: 0.9, ease: 'expo.out', delay: 0.2 })
        gsap.from(plan, { opacity: 0, scale: 0.94, duration: 1.4, ease: 'expo.out', delay: 0.3 })
      },
    })
    S.cleanup.push(() => st.kill())
  }

  function showMobFloor(fid, silent) {
    if (S.mzoom) closeMobRoom(true)
    const prev = S.mobFloor
    S.mobFloor = fid
    for (const f of FIDS) {
      const ff = S.floors[f]
      ff.lens.classList.toggle('is-still', f !== fid)
      if (ff.domeEl) ff.domeEl.classList.toggle('is-still', f !== fid)
      S.tabs[f].classList.toggle('is-on', f === fid)
      S.tabs[f].setAttribute('aria-selected', f === fid ? 'true' : 'false')
      S.floors[f].el.classList.toggle('is-on', f === fid)
    }
    const fl = S.floors[fid]
    if (!silent && prev !== fid) {
      App.audio.sfx('whoosh')
      const dir = FIDS.indexOf(fid) > FIDS.indexOf(prev) ? -1 : 1
      gsap.fromTo(fl.el, { yPercent: 6 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out' })
    }
    // 手提灯默认落在：1F 议事厅；其他层的主楼梯厅
    const r = fid === '1F' ? roomByKey['1F/穹顶议事厅'] : roomByKey[fid + '/主楼梯厅']
    const c = fl.view.P(r ? r.cx : 26, r ? r.cy : 18)
    fl.lanS.x = fl.lanS.tx = c[0]; fl.lanS.y = fl.lanS.ty = c[1]
    S.mobSel = null
    fillTip(S.mcap, null, fid, { name: FMETA[fid].cn, mood: '' })
    S.mcap.classList.remove('is-sel')
    fl.hl.classList.remove('is-on')
  }

  function measureMob() {
    if (!S.mplan) return
    const r = S.mplan.getBoundingClientRect()
    if (!r.width) return
    for (const fid of FIDS) setBox(S.floors[fid], r.width, r.height)
  }

  function onMobTap(e) {
    const fl = S.floors[S.mobFloor]
    if (!fl) return
    if (S.mzoom) { closeMobRoom(); return }
    const pt = fl.fx.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = fl.fx.getScreenCTM()
    if (!ctm) return
    const q = pt.matrixTransform(ctm.inverse())
    fl.lanS.tx = q.x; fl.lanS.ty = q.y
    const t = e.target
    if (t.classList && t.classList.contains('mz-seal-hit')) {
      App.audio.sfx('glitch', { volume: 0.7 })
      fl.seal.heat = 1.4
      fillTip(S.mcap, null, '1F', { name: '正门', mood: atmos('黑钻石', '正门外紧贴黑钻石墙'), blood: true })
      S.mcap.classList.add('is-sel')
      App.glitch(S.mcap.querySelector('.mansion-tip-name'), 0.35)
      S.mobSel = null
      return
    }
    const key = t.getAttribute && t.getAttribute('data-room')
    if (!key) return
    if (S.mobSel === key) { App.audio.sfx('click'); openMobRoom(fl, key); return }
    S.mobSel = key
    App.audio.sfx('hover')
    const room = roomByKey[key]
    fillTip(S.mcap, room, fl.fid)
    S.mcap.classList.add('is-sel')
    gsap.fromTo(S.mcap.children, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'expo.out' })
    moveHl(fl, Object.assign({}, fl.roomEls[key].rr), 0.45)
  }

  function openMobRoom(fl, key) {
    const room = roomByKey[key]
    if (!room) return
    const rr = fl.view.rect(room.x0, room.y0, room.x1, room.y1)
    const target = zoomTargetVB(fl, rr, 0.62, 0.62)
    const pxPerUnit = fl.fx.getBoundingClientRect().width / target.w
    const n = Math.max(1, Math.min(4, room.objects.length))
    const anchors = anchorsFor(room, n)
    S.mzoom = { fid: fl.fid, key }
    fl.lanS.tx = rr.x + rr.w / 2; fl.lanS.ty = rr.y + rr.h / 2
    fl.lanS.lock = Math.hypot(rr.w, rr.h) * 0.7 + 1.5
    const vb = fl.view.vb
    fl.spot.setAttribute('d', `M${vb.x - 5} ${vb.y - 5}H${vb.x + vb.w + 5}V${vb.y + vb.h + 5}H${vb.x - 5}Z M${r3(rr.x)} ${r3(rr.y)}V${r3(rr.y + rr.h)}H${r3(rr.x + rr.w)}V${r3(rr.y)}Z`)
    fl.focus.setAttribute('d', fl.outline[key])
    gsap.fromTo([fl.spot, fl.focus], { opacity: 0 }, { opacity: 1, duration: 0.6 })
    fl.hl.classList.remove('is-on')
    fl.el.classList.add('is-clip')
    vbAnimate(fl, target, 0.9, 'expo.inOut')
    buildZoomMarks(fl, room, anchors, pxPerUnit)
    gsap.fromTo(fl.gZoom, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.6 })
    const box = S.mtags
    box.innerHTML = ''
    room.objects.slice(0, n).forEach((obj, i) => {
      const weapon = isWeapon(room, obj)
      const rot = (hash(room.key + obj) % 600) / 100 - 3
      const el = U.el('div.mansion-tag' + (weapon ? '.is-weapon' : ''), { style: { '--r': rot.toFixed(2) + 'deg' } }, [
        U.el('i.mansion-tag-hole'), U.el('span.mansion-tag-no', { text: String(i + 1).padStart(2, '0') }), U.el('span.mansion-tag-name', { text: obj }),
      ])
      box.appendChild(el)
      gsap.fromTo(el, { opacity: 0, y: -30, rotate: rot * 3 }, { opacity: 1, y: 0, rotate: rot, duration: 0.8, ease: 'expo.out', delay: 0.5 + i * 0.08 })
    })
    box.classList.add('is-on')
    box.onclick = () => closeMobRoom()
  }

  function closeMobRoom(instant) {
    const z = S.mzoom
    if (!z) return
    S.mzoom = null
    const fl = S.floors[z.fid]
    fl.lanS.lock = 0
    vbAnimate(fl, Object.assign({}, fl.view.vb), instant ? 0.01 : 0.8, 'expo.inOut', () => { if (!S.mzoom) fl.el.classList.remove('is-clip') })
    gsap.to([fl.spot, fl.focus, fl.gZoom], { opacity: 0, duration: instant ? 0 : 0.4, onComplete: () => { fl.gZoom.innerHTML = '' } })
    const box = S.mtags
    box.classList.remove('is-on')
    gsap.to(box.children, { opacity: 0, duration: instant ? 0 : 0.3, onComplete: () => { box.innerHTML = '' } })
    S.mobSel = null
    S.mcap.classList.remove('is-sel')
  }

  function tickMob(time) {
    if (!S.visible) { S.lastNow = 0; return }
    const dt = frameDt()
    const fl = S.floors[S.mobFloor]
    if (!fl) return
    const L = S.light || lightAt(curMin())
    const st = fl.lanS
    const tr = st.lock || (L.low ? LAN_R.low : LAN_R.normal) * 1.15
    const k = ek(0.12, dt)
    st.x += (st.tx - st.x) * k
    st.y += (st.ty - st.y) * k
    st.r += (tr - st.r) * ek(0.1, dt)
    if (Math.abs(st.tx - st.x) < 0.004) st.x = st.tx
    if (Math.abs(st.ty - st.y) < 0.004) st.y = st.ty
    if (Math.abs(tr - st.r) < 0.004) st.r = tr
    if (!fl.box || !fl.box.w) measureMob()
    placeLantern(fl, st.x, st.y, st.r)
    syncHands()
    if (S.mobFloor === '1F') animateSpecials(time, dt)
  }

  /* =====================================================================
     装配 / 拆卸
     ===================================================================== */
  function teardown() {
    for (const fn of S.cleanup.splice(0)) { try { fn() } catch (e) { /* noop */ } }
    S.zoom = null
    S.mzoom = null
    if (App.cursor && App.cursor.clear) App.cursor.clear()
    S.floors = {}
    S.dial = null
    S.hoverFloor = null
    S.hoverRoom = null
    S.lightKey = ''
    S.clockKey = null
    S.lines = null
    S.lastActive = undefined
    // 重建（桌面⇄手机）后这些「上一帧」缓存必须作废，否则新节点拿不到对应的类名与样式
    S.sealWall = null; S._isEnd = undefined; S._glint = undefined; S.end = 0; S._ok = undefined; S._oOn = undefined; S._isMini = undefined; S._lastFlat = undefined; S._bt = S._tipT = undefined
    if (S.el) { S.el.innerHTML = ''; S.el.classList.remove('is-desk', 'is-mob', 'is-pinned') }
  }

  function build() {
    teardown()
    S.mode = App.isMobile() ? 'mob' : 'desk'
    if (S.mode === 'desk') buildDesk(S.el)
    else buildMob(S.el)
    if (S.root) S.root.classList.toggle('is-paused', !S.visible)
    applyQuality()
    applyLight(true)
  }

  // 画质（App.quality.level：2 全效果 / 1 / 0 最省）：1 级关掉灯光闪烁、闪光辉光，封墙菱形减半、不震；
  // 0 级再关掉穹顶涟漪、窗辉与窗光渐变，封墙菱形静止
  function applyQuality() {
    const q = App.quality && App.quality.level != null ? App.quality.level : 2
    S.q = q
    if (S.root) { S.root.classList.toggle('is-q1', q <= 1); S.root.classList.toggle('is-q0', q === 0) }
  }

  // 板块完全离开视口：停掉所有循环，并把舞台整个藏起来（不再参与合成）
  function setVisible(v) {
    if (S.visible === v) return
    S.visible = v
    S.lastNow = 0
    if (S.root) S.root.classList.toggle('is-paused', !v)
    if (!v) {
      if (S.zoom) closeRoom(true)
      if (S.mzoom) closeMobRoom(true)
      if (App.cursor && App.cursor.clear) App.cursor.clear()
      S.hoverFloor = null
      setHoverRoom(null)
      hideTip()
    }
  }

  App.section('mansion', {
    palette: { a: '#15110f', b: '#c29a5b', glow: 0.34 },
    track: 'dread',
    mount(el) {
      S.el = el
      el.classList.add('mansion')
      const r = el.getBoundingClientRect()
      S.visible = r.bottom > 0 && r.top < window.innerHeight
      build()
      App.bus.on('time', m => setHouse(m))
      App.bus.on('time:set', m => setHouse(m))
      App.bus.on('section:enter', id => { if (id === 'mansion') { const L = S.light || lightAt(curMin()); S.moodLow = L.low; App.audio.setMood({ tension: L.low ? 0.48 : 0.26 }) } })
      App.bus.on('overlay:open', () => { if (S.zoom) closeRoom(true) })
      App.bus.on('quality', applyQuality)
      let lastMode = S.mode
      window.addEventListener('resize', U.debounce(() => {
        const mode = App.isMobile() ? 'mob' : 'desk'
        if (mode !== lastMode) { lastMode = mode; build(); App.scroll.refresh() }
        else if (S.mode === 'desk') { if (S.zoom) closeRoom(true); layoutDesk() }
        else { if (S.mzoom) closeMobRoom(true); measureMob() }
      }, 220))
    },
    enter() { setVisible(true) },
    leave() { setVisible(false) },
  })
})()
