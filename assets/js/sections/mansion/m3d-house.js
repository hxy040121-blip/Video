/* ==========================================================
   洋馆 · 三维 · 房子（外观）
   依据：洋馆物理层 1.1（外形 69.6×40.8，外墙 0.6 全在轴线外，屋面 15.0）、1.2、1.3（门厅南墙正门）、
         1.4（屋外地面 −0.45、三级石阶）、2.1（熏橡木双扇正门，高 3.6）、3.2（每一扇窗，黑色方格框）、
         world.windows / world.skylights / world.hall（天眼 2.4 m）。
   外立面的材料与线脚原文没写，是这里设计的：深色石砌墙身、骨白石的线脚，一层横向分缝，
   两道腰线，窗套与窗头（一层平拱与拱心石、二层山花与檐板、三层带耳的窗套），四角隅石，
   南面门厅两侧的壁柱，檐口与托檐石，栏杆女儿墙。没有加翼楼、塔楼、阳台，正门以外没有门。
   ========================================================== */
(function () {
  'use strict'
  const T = window.THREE, MZ = window.MZ3D
  if (!T || !MZ) return

  const REV = 0.3 // 玻璃退进外墙面
  const K = { WALL: 0, TRIM: 1, DARK: 2, ROOF: 3, OAK: 4, METAL: 5, ASHLAR: 6 }
  MZ.K = K
  const COL = {
    wall: MZ.lin('#47403a'), trim: MZ.lin('#b3a892'), trimD: MZ.lin('#9c917c'), plinth: MZ.lin('#2d2926'),
    lead: MZ.lin('#3a3e41'), oak: MZ.lin('#2a1c13'), bronze: MZ.lin('#6a5230'), black: MZ.lin('#0e0d0c'),
  }
  const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f]

  /* ---------- 四面外墙：局部坐标 (u 从外面看从左往右, v = 标高 z, w 朝外) → 轴线坐标 ---------- */
  const FAC = {
    S: { id: 'S', f: 0, L: 70.8, P: (u, v, w) => [-0.6 + u, -0.6 - w, v], fm: { F: 's', K: 'n', R: 'e', L: 'w' } },
    N: { id: 'N', f: 1, L: 70.8, P: (u, v, w) => [70.2 - u, 41.4 + w, v], fm: { F: 'n', K: 's', R: 'w', L: 'e' } },
    W: { id: 'W', f: 2, L: 42.0, P: (u, v, w) => [-0.6 - w, 41.4 - u, v], fm: { F: 'w', K: 'e', R: 's', L: 'n' } },
    E: { id: 'E', f: 3, L: 42.0, P: (u, v, w) => [70.2 + w, -0.6 + u, v], fm: { F: 'e', K: 'w', R: 'n', L: 's' } },
  }
  const SIDE = { 南: 'S', 北: 'N', 西: 'W', 东: 'E' }
  for (const F of Object.values(FAC)) {
    const o = MZ.v(...F.P(0, 0, 0))
    F.tan = MZ.v(...F.P(1, 0, 0)).sub(o).normalize()
    F.out = MZ.v(...F.P(0, 0, 1)).sub(o).normalize()
    F.M = new T.Matrix4().makeBasis(F.tan.clone(), new T.Vector3(0, 1, 0), F.out.clone()).setPosition(o)
  }
  MZ.FAC = FAC
  // 墙上的沿墙坐标（x 或 y）→ u
  const toU = (F, a) => F.id === 'S' ? a + 0.6 : F.id === 'N' ? 70.2 - a : F.id === 'W' ? 41.4 - a : a + 0.6
  const uSpan = (F, a, b) => { const p = toU(F, a), q = toU(F, b); return [Math.min(p, q), Math.max(p, q)] }

  const SHADE = { L: 0.86, R: 0.86, B: 0.7, K: 0.55 }
  function boxL(gb, F, u0, u1, v0, v1, w0, w1, col, kind, skip, shade) {
    const a = F.P(u0, v0, w0), b = F.P(u1, v1, w1)
    let sk = ''
    if (skip) for (const ch of skip) sk += ch === 'T' ? 't' : ch === 'B' ? 'b' : F.fm[ch]
    const shd = {}
    const s = Object.assign({}, SHADE, shade || {})
    for (const k in s) shd[k === 'T' ? 't' : k === 'B' ? 'b' : F.fm[k]] = s[k]
    gb.box(Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[2], b[2]), col, kind, sk, shd)
  }
  // 局部坐标里的一个四边形，n 是想要的局部法线（点序不对就自动翻过来）
  function quadL(gb, F, pts, n, col, kind) {
    const S = pts.map(p => F.P(p[0], p[1], p[2]))
    const o = F.P(0, 0, 0), q = F.P(n[0], n[1], n[2])
    const ns = [q[0] - o[0], q[1] - o[1], q[2] - o[2]]
    const e1 = [S[1][0] - S[0][0], S[1][1] - S[0][1], S[1][2] - S[0][2]], e2 = [S[3][0] - S[0][0], S[3][1] - S[0][1], S[3][2] - S[0][2]]
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    if (c[0] * ns[0] + c[1] * ns[1] + c[2] * ns[2] < 0) S.reverse()
    gb.quadS(S[0], S[1], S[2], S[3], col, kind)
  }
  // 横向线脚：在 [a, b] 上画一条，跳过与它在高度上相交的开口（含窗套）
  function bandL(gb, F, a, b, v0, v1, w0, w1, col, kind, openings, pad) {
    const cuts = openings.filter(o => o.v0 - o.pad < v1 && o.v1 + o.headPad > v0).map(o => [o.u0 - o.pad - (pad || 0), o.u1 + o.pad + (pad || 0)]).sort((p, q) => p[0] - q[0])
    let cur = a
    for (const [c0, c1] of cuts) {
      if (c1 <= cur || c0 >= b) continue
      if (c0 > cur + 0.02) boxL(gb, F, cur, c0, v0, v1, w0, w1, col, kind, 'K')
      cur = Math.max(cur, c1)
    }
    if (b > cur + 0.02) boxL(gb, F, cur, b, v0, v1, w0, w1, col, kind, 'K')
  }

  /* ---------- 立面上的元素 ---------- */
  // 一层窗头：平拱（拱石之间留缝）+ 拱心石
  function voussoirs(gb, F, o) {
    const h = 0.5, ext = 0.24
    const a = o.u0 - ext, b = o.u1 + ext
    const n = Math.max(5, Math.round((b - a) / 0.42) | 1)
    const step = (b - a) / n
    const mid = (n - 1) / 2
    for (let i = 0; i < n; i++) {
      const u0 = a + i * step + 0.014, u1 = a + (i + 1) * step - 0.014
      if (i === mid) boxL(gb, F, u0 - 0.04, u1 + 0.04, o.v1 - 0.06, o.v1 + h + 0.13, 0, 0.13, COL.trim, K.TRIM, 'K')
      else boxL(gb, F, u0, u1, o.v1, o.v1 + h, 0, 0.05, COL.trimD, K.TRIM, 'K')
    }
  }
  function architrave(gb, F, o, aw, ears) {
    const ap = 0.075
    boxL(gb, F, o.u0 - aw, o.u0, o.v0, o.v1 + aw, 0, ap, COL.trim, K.TRIM, 'K')
    boxL(gb, F, o.u1, o.u1 + aw, o.v0, o.v1 + aw, 0, ap, COL.trim, K.TRIM, 'K')
    boxL(gb, F, o.u0, o.u1, o.v1, o.v1 + aw, 0, ap, COL.trim, K.TRIM, 'K')
    if (ears) { // 窗套上角的耳
      boxL(gb, F, o.u0 - aw - 0.1, o.u0 - aw, o.v1 - 0.14, o.v1 + aw, 0, ap, COL.trim, K.TRIM, 'K')
      boxL(gb, F, o.u1 + aw, o.u1 + aw + 0.1, o.v1 - 0.14, o.v1 + aw, 0, ap, COL.trim, K.TRIM, 'K')
    }
  }
  function sill(gb, F, o, ext) {
    boxL(gb, F, o.u0 - ext, o.u1 + ext, o.v0 - 0.17, o.v0, -REV, 0.2, COL.trim, K.TRIM, 'K', { B: 0.55 })
    // 两只小托石
    for (const u of [o.u0 - ext + 0.12, o.u1 + ext - 0.3]) boxL(gb, F, u, u + 0.18, o.v0 - 0.38, o.v0 - 0.17, 0, 0.14, COL.trimD, K.TRIM, 'K')
  }
  function hood(gb, F, o, aw) {
    const top = o.v1 + aw
    boxL(gb, F, o.u0 - aw, o.u1 + aw, top, top + 0.24, 0, 0.09, COL.trimD, K.TRIM, 'K') // 檐壁
    boxL(gb, F, o.u0 - aw - 0.16, o.u1 + aw + 0.16, top + 0.24, top + 0.4, 0, 0.3, COL.trim, K.TRIM, 'K', { B: 0.5 }) // 檐板
    return top + 0.4
  }
  function pediment(gb, F, o, aw) {
    const base = hood(gb, F, o, aw)
    const a = o.u0 - aw - 0.16, b = o.u1 + aw + 0.16, c = (a + b) / 2, h = 0.4, d = 0.26
    // 三角山花：前面一块三角，两道斜面
    const P = (u, v, w) => [u, v, w]
    quadL(gb, F, [P(a, base, d), P(b, base, d), P(c, base + h, d), P(c, base + h, d)], [0, 0, 1], COL.trimD, K.TRIM)
    // 两道斜面（法线朝上、朝外侧）
    quadL(gb, F, [P(a, base, 0), P(c, base + h, 0), P(c, base + h, d + 0.02), P(a, base, d + 0.02)], [-h, c - a, 0], COL.trim, K.TRIM)
    quadL(gb, F, [P(c, base + h, 0), P(b, base, 0), P(b, base, d + 0.02), P(c, base + h, d + 0.02)], [h, b - c, 0], COL.trim, K.TRIM)
  }
  function keystone(gb, F, o, aw) {
    const c = (o.u0 + o.u1) / 2
    boxL(gb, F, c - 0.2, c + 0.2, o.v1 - 0.05, o.v1 + aw + 0.28, 0, 0.14, COL.trim, K.TRIM, 'K')
  }
  function reveals(gb, F, o, depth, col, withBottom) {
    quadL(gb, F, [[o.u0, o.v0, 0], [o.u0, o.v0, -depth], [o.u0, o.v1, -depth], [o.u0, o.v1, 0]], [1, 0, 0], col, K.ASHLAR)
    quadL(gb, F, [[o.u1, o.v0, 0], [o.u1, o.v0, -depth], [o.u1, o.v1, -depth], [o.u1, o.v1, 0]], [-1, 0, 0], col, K.ASHLAR)
    quadL(gb, F, [[o.u0, o.v1, 0], [o.u1, o.v1, 0], [o.u1, o.v1, -depth], [o.u0, o.v1, -depth]], [0, -1, 0], mul(col, 0.7), K.ASHLAR)
    if (withBottom) quadL(gb, F, [[o.u0, o.v0, 0], [o.u1, o.v0, 0], [o.u1, o.v0, -depth], [o.u0, o.v0, -depth]], [0, 1, 0], col, K.ASHLAR)
  }

  /* ---------- 圆柱、瓶饰（用 three 的几何生成，再并进拼装器） ---------- */
  function addLathe(gb, prof, seg, at, col, kind) {
    const g = new T.LatheGeometry(prof.map(p => new T.Vector2(p[0], p[1])), seg)
    const p = MZ.v(at[0], at[1], at[2])
    gb.addGeo(g, new T.Matrix4().makeTranslation(p.x, p.y, p.z), col, kind)
    g.dispose()
  }
  const URN = [[0, 0], [0.2, 0], [0.2, 0.08], [0.12, 0.12], [0.1, 0.2], [0.2, 0.3], [0.27, 0.44], [0.26, 0.56], [0.17, 0.66], [0.21, 0.7], [0.21, 0.75], [0.07, 0.8], [0.09, 0.88], [0.0, 0.92]]
  const BALUSTER = [[0, 0], [0.085, 0], [0.085, 0.05], [0.06, 0.075], [0.055, 0.11], [0.09, 0.24], [0.094, 0.3], [0.06, 0.43], [0.042, 0.48], [0.068, 0.5], [0.075, 0.55], [0.075, 0.6], [0, 0.6]]

  /* =====================================================================
     建房子
     ===================================================================== */
  MZ.buildHouse = function (o) {
    const detail = o.detail != null ? o.detail : 2
    const W = window.WORLD || {}
    const LORE = window.LORE || {}
    const lv = {}
    for (const f of (W.floors || [])) lv[f.id] = f
    const level = id => (lv[id] ? lv[id].level : { B1: -4.8, '1F': 0, '2F': 5, '3F': 10 }[id])
    const clearOf = id => (lv[id] ? lv[id].clear : 4.6)
    const roomByKey = {}
    for (const r of (W.rooms || [])) roomByKey[r.floor + '/' + r.name] = r

    const gb = new MZ.GB()
    const ggb = new MZ.GB({ aUVWH: 4, aBox: 4, aRoom: 4, aGrid: 4, aTan: 3, aNrm: 3 })
    const hgb = new MZ.GB({ aP: 2, aWH: 2 })
    const sgb = new MZ.GB({ aBmin: 3, aBmax: 3 })

    /* ---------- 开口：窗（world.windows）+ 正门 ---------- */
    const opens = { S: [], N: [], W: [], E: [] }
    const windows = []
    for (const w of (W.windows || [])) {
      const F = FAC[SIDE[w.side]]
      if (!F) continue
      const [u0, u1] = uSpan(F, w.a, w.b)
      const z0 = level(w.floor) + w.sill + (w.aboveMidLanding ? 2.5 : 0)
      const op = { F, u0, u1, v0: z0, v1: z0 + w.height, kind: w.kind, floor: w.floor, room: w.room, w, idx: windows.length, pad: 0.3, headPad: 0.55 }
      if (w.kind === 'foyer') { op.pad = 0.45; op.headPad = 0.25 }
      opens[F.id].push(op)
      windows.push(op)
    }
    const door = { F: FAC.S, u0: 34.8 - 1.8 + 0.6, u1: 34.8 + 1.8 + 0.6, v0: 0, v1: 3.6, kind: 'door', pad: 0.9, headPad: 0.9 }
    opens.S.push(door)

    /* ---------- 墙身（带洞的四面墙） ---------- */
    for (const F of Object.values(FAC)) {
      const sh = new T.Shape()
      sh.moveTo(0, -0.85); sh.lineTo(F.L, -0.85); sh.lineTo(F.L, 15.08); sh.lineTo(0, 15.08); sh.closePath()
      for (const op of opens[F.id]) {
        const h = new T.Path()
        h.moveTo(op.u0, op.v0); h.lineTo(op.u1, op.v0); h.lineTo(op.u1, op.v1); h.lineTo(op.u0, op.v1); h.closePath()
        sh.holes.push(h)
      }
      const g = new T.ShapeGeometry(sh)
      gb.addGeo(g, F.M, COL.wall, K.WALL)
      g.dispose()
    }

    /* ---------- 勒脚、腰线、檐口、女儿墙 ---------- */
    for (const F of Object.values(FAC)) {
      const op = opens[F.id]
      const ex = 0.32 // 转角处多伸一点，两面相交
      // 勒脚（深色石）+ 斜收顶
      // 南面正门前是石阶平台（x=30—39.6），勒脚在那里断开
      const landing = { u0: 30.6, u1: 40.2, v0: 0, v1: 0.5, pad: 0, headPad: 0 }
      bandL(gb, F, -ex, F.L + ex, -0.85, 0.55, 0, 0.24, COL.plinth, K.DARK, F.id === 'S' ? [landing] : [])
      {
        const segs = F.id === 'S' ? [[-0.24, landing.u0], [landing.u1, F.L + 0.24]] : [[-0.24, F.L + 0.24]]
        for (const [a, b] of segs) quadL(gb, F, [[a, 0.55, 0.24], [b, 0.55, 0.24], [b, 0.74, 0], [a, 0.74, 0]], [0, 0.8, 0.6], COL.plinth, K.DARK)
      }
      // 二层楼面处的腰线（两层）、三层楼面处的腰线
      bandL(gb, F, -ex, F.L + ex, 4.8, 5.04, 0, 0.17, COL.trimD, K.TRIM, op)
      bandL(gb, F, -ex - 0.1, F.L + ex + 0.1, 5.04, 5.22, 0, 0.27, COL.trim, K.TRIM, op)
      bandL(gb, F, -ex, F.L + ex, 9.88, 10.12, 0, 0.18, COL.trim, K.TRIM, op)
      // 檐壁、檐下线、托檐石、檐板、檐顶
      bandL(gb, F, -ex, F.L + ex, 14.24, 14.46, 0, 0.06, COL.trimD, K.TRIM, op.filter(x => x.v1 > 14.0))
      bandL(gb, F, -ex, F.L + ex, 14.46, 14.56, 0, 0.2, COL.trim, K.TRIM, op.filter(x => x.v1 > 14.3))
      boxL(gb, F, -0.8, F.L + 0.8, 14.72, 14.95, 0, 0.8, COL.trim, K.TRIM, 'K', { B: 0.42 })
      boxL(gb, F, -0.62, F.L + 0.62, 14.95, 15.09, 0, 0.62, COL.trim, K.TRIM, 'K')
      // 托檐石：每 0.62 m 一只（檐板下面的小托架）
      const mstep = 0.62
      for (let u = 0.31; u < F.L; u += mstep) {
        boxL(gb, F, u - 0.08, u + 0.08, 14.56, 14.72, 0, 0.66, COL.trimD, K.TRIM, 'K', { B: 0.55 })
        boxL(gb, F, u - 0.08, u + 0.08, 14.46, 14.56, 0.2, 0.34, COL.trimD, K.TRIM, 'KT', { B: 0.55 })
      }
    }

    /* ---------- 四角隅石（二层腰线以上，长短交替） ---------- */
    for (const F of Object.values(FAC)) {
      const alt = F.id === 'S' || F.id === 'N' ? 0 : 1
      let i = 0
      for (let v = 5.22; v < 14.2; v += 0.56, i++) {
        const v1 = Math.min(14.24, v + 0.53)
        const len = (i + alt) % 2 ? 0.72 : 1.18
        boxL(gb, F, -0.07, len, v, v1, 0, 0.07, COL.trim, K.TRIM, 'K', { T: 0.9 })
        boxL(gb, F, F.L - len, F.L + 0.07, v, v1, 0, 0.07, COL.trim, K.TRIM, 'K', { T: 0.9 })
      }
    }

    /* ---------- 窗套、窗头、窗台、窗洞侧壁 ---------- */
    for (const F of Object.values(FAC)) {
      for (const op of opens[F.id]) {
        if (op.kind === 'door') continue
        if (op.kind === 'foyer') continue
        const fl = op.floor
        const aw = 0.26
        const revCol = fl === '1F' && op.kind !== 'stair' ? mul(COL.wall, 0.75) : mul(COL.trim, 0.72)
        reveals(gb, F, op, REV, revCol, false)
        if (fl === '1F' && op.kind !== 'stair') {
          sill(gb, F, op, 0.3)
          voussoirs(gb, F, op)
        } else if (fl === '2F' && op.kind !== 'stair') {
          sill(gb, F, op, aw + 0.1)
          architrave(gb, F, op, aw, false)
          if (op.kind === 'room' && (F.id === 'S' || F.id === 'N')) pediment(gb, F, op, aw)
          else if (op.kind === 'room' || op.kind === 'suite') hood(gb, F, op, aw)
          else keystone(gb, F, op, aw)
        } else {
          sill(gb, F, op, aw + 0.1)
          architrave(gb, F, op, aw, op.kind !== 'stair')
          if (op.kind === 'stair') keystone(gb, F, op, aw)
        }
      }
    }

    /* ---------- 南面中段：门厅大窗、正门、壁柱、石阶 ---------- */
    {
      const F = FAC.S
      const gw = opens.S.find(x => x.kind === 'foyer')
      if (gw) {
        const aw = 0.42
        reveals(gb, F, gw, 0.36, mul(COL.trim, 0.7), false)
        boxL(gb, F, gw.u0 - aw, gw.u0, gw.v0, gw.v1 + 0.16, 0, 0.1, COL.trim, K.TRIM, 'K')
        boxL(gb, F, gw.u1, gw.u1 + aw, gw.v0, gw.v1 + 0.16, 0, 0.1, COL.trim, K.TRIM, 'K')
        boxL(gb, F, gw.u0 - aw, gw.u1 + aw, gw.v1, gw.v1 + 0.16, 0, 0.1, COL.trim, K.TRIM, 'K')
        // 内圈细线
        boxL(gb, F, gw.u0 - 0.1, gw.u0, gw.v0, gw.v1, 0, 0.16, COL.trimD, K.TRIM, 'K')
        boxL(gb, F, gw.u1, gw.u1 + 0.1, gw.v0, gw.v1, 0, 0.16, COL.trimD, K.TRIM, 'K')
        // 窗台：一道厚石台
        boxL(gb, F, gw.u0 - aw - 0.3, gw.u1 + aw + 0.3, gw.v0 - 0.26, gw.v0, -0.36, 0.28, COL.trim, K.TRIM, 'K', { B: 0.5 })
        // 拱心石伸进檐壁
        const c = (gw.u0 + gw.u1) / 2
        boxL(gb, F, c - 0.36, c + 0.36, gw.v1 - 0.4, 14.72, 0, 0.2, COL.trim, K.TRIM, 'K')
      }
      // 正门门套、两根半嵌的圆柱、门头檐
      const d = door
      boxL(gb, F, d.u0 - 0.38, d.u0, 0, d.v1 + 0.38, 0, 0.1, COL.trim, K.TRIM, 'K')
      boxL(gb, F, d.u1, d.u1 + 0.38, 0, d.v1 + 0.38, 0, 0.1, COL.trim, K.TRIM, 'K')
      boxL(gb, F, d.u0, d.u1, d.v1, d.v1 + 0.38, 0, 0.1, COL.trim, K.TRIM, 'K')
      reveals(gb, F, d, 0.36, mul(COL.trim, 0.66), false)
      for (const cu of [d.u0 - 0.38 - 0.42, d.u1 + 0.38 + 0.42]) {
        const p = F.P(cu, 0, 0.12)
        boxL(gb, F, cu - 0.34, cu + 0.34, 0, 0.34, 0, 0.46, COL.trim, K.TRIM, 'K') // 柱础
        const cyl = new T.CylinderGeometry(0.23, 0.26, 3.3, detail >= 2 ? 20 : 12, 1, true)
        const q = MZ.v(p[0], p[1], 0.34 + 1.65)
        gb.addGeo(cyl, new T.Matrix4().makeTranslation(q.x, q.y, q.z), COL.trim, K.TRIM)
        cyl.dispose()
        boxL(gb, F, cu - 0.33, cu + 0.33, 3.64, 3.98, 0, 0.44, COL.trim, K.TRIM, 'K', { B: 0.6 }) // 柱头
      }
      boxL(gb, F, d.u0 - 1.5, d.u1 + 1.5, 3.98, 4.24, 0, 0.42, COL.trimD, K.TRIM, 'K', { B: 0.55 })
      boxL(gb, F, d.u0 - 1.66, d.u1 + 1.66, 4.24, 4.44, 0, 0.6, COL.trim, K.TRIM, 'K', { B: 0.45 })
      // 熏橡木双扇正门：每扇三块凸起的门心板，铜把手
      const dz = -0.36
      boxL(gb, F, d.u0, d.u1, d.v0, d.v1, dz - 0.08, dz, COL.oak, K.OAK, 'K')
      const half = (d.u1 - d.u0) / 2
      for (let s = 0; s < 2; s++) {
        const a = d.u0 + s * half
        for (const [p0, p1] of [[0.25, 1.15], [1.35, 2.35], [2.55, 3.35]]) boxL(gb, F, a + 0.22, a + half - 0.22, p0, p1, dz, dz + 0.05, mul(COL.oak, 1.25), K.OAK, 'K')
        boxL(gb, F, a + (s ? 0.12 : half - 0.22), a + (s ? 0.22 : half - 0.12), 1.0, 1.36, dz, dz + 0.1, COL.bronze, K.METAL, 'K')
      }
      boxL(gb, F, d.u0 + half - 0.012, d.u0 + half + 0.012, d.v0, d.v1, dz, dz + 0.012, COL.black, K.DARK, 'K') // 两扇之间的缝
      // 三级石阶（每级 0.15，落到屋外地面 −0.45）
      const sx0 = 34.8 - 4.8, sx1 = 34.8 + 4.8
      gb.box(sx0, sx1, -2.1, -0.6, -0.85, 0, COL.trim, K.TRIM, 'n', { s: 0.82, e: 0.8, w: 0.8 })
      gb.box(sx0 - 0.42, sx1 + 0.42, -2.52, -0.6, -0.85, -0.15, COL.trimD, K.TRIM, 'n', { s: 0.8, e: 0.8, w: 0.8 })
      gb.box(sx0 - 0.84, sx1 + 0.84, -2.94, -0.6, -0.85, -0.3, COL.trimD, K.TRIM, 'n', { s: 0.78, e: 0.78, w: 0.78 })
      // 门厅两侧的通高壁柱（一层分缝、上面平整）
      for (const x of [26.4, 42.0]) {
        const [u0, u1] = uSpan(F, x, x + 1.2)
        boxL(gb, F, u0, u1, 0.74, 14.24, 0, 0.22, COL.trimD, K.WALL, 'K')
        boxL(gb, F, u0 - 0.1, u1 + 0.1, 0.55, 1.05, 0, 0.32, COL.trim, K.TRIM, 'K')
        boxL(gb, F, u0 - 0.12, u1 + 0.12, 13.8, 14.24, 0, 0.34, COL.trim, K.TRIM, 'K', { B: 0.55 })
      }
    }

    /* ---------- 女儿墙：转角墩、实心栏板、栏杆 ---------- */
    const balPos = [] // [x, y, z]（轴线坐标）每只栏杆柱的底
    {
      const V0 = 15.09, VB = 15.34, VT = 15.94, V1 = 16.14
      for (const F of Object.values(FAC)) {
        const L = F.L
        // 墩的位置（u）：转角、角楼线、中段两侧、各段正中
        let dies, solid
        if (F.id === 'S' || F.id === 'N') {
          dies = [0.45, 9.0, 18.4, 27.0, 43.8, 52.4, 61.8, L - 0.45]
          solid = [[0.45, 9.0], [27.0, 43.8], [61.8, L - 0.45]]
        } else {
          dies = [0.45, 9.0, 15.0, 21.0, 27.0, 33.0, L - 0.45]
          solid = [[0.45, 9.0], [33.0, L - 0.45]]
        }
        // 底座与压顶连续
        boxL(gb, F, -0.2, L + 0.2, V0, VB, -0.5, 0.12, COL.trimD, K.TRIM, '')
        boxL(gb, F, -0.24, L + 0.24, VT, V1, -0.56, 0.18, COL.trim, K.TRIM, '', { B: 0.55 })
        dies.forEach((u, i) => boxL(gb, F, i === 0 ? -0.2 : u - 0.36, i === dies.length - 1 ? L + 0.2 : u + 0.36, VB, VT, -0.52, 0.16, COL.trim, K.TRIM, 'BT'))
        for (const [a, b] of solid) {
          boxL(gb, F, a + 0.36, b - 0.36, VB, VT, -0.44, 0.02, COL.trimD, K.TRIM, 'BT')
          // 栏板上的凹框
          boxL(gb, F, a + 0.36, b - 0.36, VB, VB + 0.07, 0.02, 0.07, COL.trim, K.TRIM, 'K')
          boxL(gb, F, a + 0.36, b - 0.36, VT - 0.07, VT, 0.02, 0.07, COL.trim, K.TRIM, 'K')
        }
        // 栏杆段
        const runs = []
        for (let i = 0; i < dies.length - 1; i++) {
          const a = dies[i] + 0.36, b = dies[i + 1] - 0.36
          if (solid.some(([p, q]) => a >= p - 0.01 && b <= q + 0.01)) continue
          runs.push([a, b])
        }
        for (const [a, b] of runs) {
          const n = Math.max(1, Math.round((b - a) / 0.34))
          const st = (b - a) / n
          for (let i = 0; i < n; i++) { const p = F.P(a + (i + 0.5) * st, VB, -0.2); balPos.push(p) }
        }
      }
      // 瓶饰：四个转角与南北中段两侧
      const urns = [[-0.41, -0.41], [70.01, -0.41], [-0.41, 41.21], [70.01, 41.21], [26.4, -0.41], [43.2, -0.41], [26.4, 41.21], [43.2, 41.21]]
      for (const [x, y] of urns) addLathe(gb, URN, detail >= 2 ? 16 : 10, [x, y, V1], COL.trim, K.TRIM)
    }

    /* ---------- 屋面（铅皮，立咬口）、天顶的边框、天眼的鼓座 ---------- */
    const SKY = (W.skylights || []).length ? W.skylights : [{ over: '门厅', x0: 26.4, x1: 43.2, y0: 0, y1: 12 }, { over: '花园', x0: 12, x1: 22.8, y0: 12, y1: 28.8 }, { over: '自然史大厅', x0: 46.8, x1: 57.6, y0: 12, y1: 28.8 }]
    const hall = W.hall || { cx: 34.8, cy: 20.4, oculus: 2.4, apex: 13.2 }
    const ocR = (hall.oculus || 2.4) / 2
    {
      const sh = new T.Shape()
      sh.moveTo(-0.1, -0.1); sh.lineTo(69.7, -0.1); sh.lineTo(69.7, 40.9); sh.lineTo(-0.1, 40.9); sh.closePath()
      for (const s of SKY) {
        const h = new T.Path()
        h.moveTo(s.x0 - 0.3, s.y0 - 0.3); h.lineTo(s.x1 + 0.3, s.y0 - 0.3); h.lineTo(s.x1 + 0.3, s.y1 + 0.3); h.lineTo(s.x0 - 0.3, s.y1 + 0.3); h.closePath()
        sh.holes.push(h)
      }
      const oc = new T.Path()
      oc.absarc(hall.cx, hall.cy, ocR + 0.5, 0, Math.PI * 2, true)
      sh.holes.push(oc)
      const g = new T.ShapeGeometry(sh, 48)
      // 平面 (x, y) → 轴线坐标 (x, y, 15)：基底 x→+X，y→−Z，法线 +Y
      const m = new T.Matrix4().makeBasis(new T.Vector3(1, 0, 0), new T.Vector3(0, 0, -1), new T.Vector3(0, 1, 0)).setPosition(MZ.v(0, 0, 15.0))
      gb.addGeo(g, m, COL.lead, K.ROOF)
      g.dispose()
      // 天顶的石边框
      for (const s of SKY) {
        const a = 0.3, z0 = 14.9, z1 = 15.36
        gb.box(s.x0 - a, s.x1 + a, s.y0 - a, s.y0, z0, z1, COL.trimD, K.TRIM, 'b')
        gb.box(s.x0 - a, s.x1 + a, s.y1, s.y1 + a, z0, z1, COL.trimD, K.TRIM, 'b')
        gb.box(s.x0 - a, s.x0, s.y0, s.y1, z0, z1, COL.trimD, K.TRIM, 'b')
        gb.box(s.x1, s.x1 + a, s.y0, s.y1, z0, z1, COL.trimD, K.TRIM, 'b')
      }
      // 天眼：低矮的石鼓座 + 铜环 + 玻璃罩（玻璃另画）
      const c = MZ.v(hall.cx, hall.cy, 0)
      const seg = detail >= 2 ? 52 : 32
      const outer = new T.CylinderGeometry(ocR + 0.5, ocR + 0.62, 0.62, seg, 1, true)
      gb.addGeo(outer, new T.Matrix4().makeTranslation(c.x, 15.0 + 0.31, c.z), COL.trim, K.TRIM)
      outer.dispose()
      const inner = new T.CylinderGeometry(ocR, ocR, 2.2, seg, 1, true)
      inner.scale(-1, 1, 1) // 镜像让正面朝里，法线也翻过来
      { const nA = inner.attributes.normal; for (let i = 0; i < nA.count; i++) nA.setXYZ(i, -nA.getX(i), -nA.getY(i), -nA.getZ(i)) }
      gb.addGeo(inner, new T.Matrix4().makeTranslation(c.x, 15.62 - 1.1, c.z), mul(COL.trim, 0.6), K.TRIM)
      inner.dispose()
      const top = new T.RingGeometry(ocR, ocR + 0.5, seg, 1)
      gb.addGeo(top, new T.Matrix4().makeRotationX(-Math.PI / 2).setPosition(c.x, 15.62, c.z), COL.trim, K.TRIM)
      top.dispose()
      const tor = new T.TorusGeometry(ocR + 0.06, 0.07, 6, seg)
      gb.addGeo(tor, new T.Matrix4().makeRotationX(-Math.PI / 2).setPosition(c.x, 15.66, c.z), COL.bronze, K.METAL)
      tor.dispose()
    }

    /* ---------- 窗玻璃（室内用光线追一个盒子：真房间的进深与宽，灯、护壁、地面） ---------- */
    const FLOORMAT = s => (/地毯/.test(s) && !/橡木地板·/.test(s) ? 1 : /石/.test(s) ? 2 : 0)
    for (const op of windows) {
      const F = op.F, w = op.u1 - op.u0, h = op.v1 - op.v0
      const r = roomByKey[op.floor + '/' + op.room]
      const lore = (LORE.rooms && LORE.rooms[op.floor + '/' + op.room]) || {}
      let L = -3, R = w + 3, depth = 8, clear = clearOf(op.floor)
      if (r) {
        const ru = F.id === 'S' || F.id === 'N' ? uSpan(F, r.x0, r.x1) : uSpan(F, r.y0, r.y1)
        L = ru[0] - op.u0; R = ru[1] - op.u0
        depth = (F.id === 'S' ? r.y1 : F.id === 'N' ? 40.8 - r.y0 : F.id === 'W' ? r.x1 : 69.6 - r.x0) + (0.6 - REV)
      }
      const fo = op.kind === 'stair' ? op.w.sill : op.v0 - level(op.floor) // 后楼梯的窗看进去是中间平台
      const kindF = op.kind === 'suite' ? 1 : op.kind === 'corridor' ? 2 : op.kind === 'stair' ? 3 : op.kind === 'foyer' ? 4 : 0
      if (op.kind === 'foyer') clear = 14.6
      if (op.kind === 'stair') clear = 9.6
      const lampCol = op.kind === 'corridor' || op.kind === 'stair' ? 1 : 0
      const surf = lore.floorSurface || ''
      const fm = op.kind === 'suite' ? 1 : op.kind === 'corridor' || op.kind === 'stair' || op.kind === 'foyer' ? 2 : FLOORMAT(surf)
      const sashes = op.kind === 'foyer' ? 4 : Math.max(1, Math.round(w / 1.2))
      const cols = op.kind === 'foyer' ? 3 : Math.max(2, Math.round(w / sashes / 0.42))
      const rows = op.kind === 'foyer' ? 12 : Math.max(3, Math.round(h / 0.46))
      op.lampCol = lampCol
      const pts = [[op.u0, op.v0, -REV], [op.u1, op.v0, -REV], [op.u1, op.v1, -REV], [op.u0, op.v1, -REV]].map(p => F.P(p[0], p[1], p[2]))
      ggb.quadS(pts[0], pts[1], pts[2], pts[3], [1, 1, 1], 0, {
        aUVWH: [[0, 0, w, h], [w, 0, w, h], [w, h, w, h], [0, h, w, h]],
        aBox: [L, R, depth, fo], aRoom: [clear, lampCol, kindF, op.idx], aGrid: [sashes, cols, rows, fm],
        aTan: [F.tan.x, F.tan.y, F.tan.z], aNrm: [F.out.x, F.out.y, F.out.z],
      })
      // 夜里窗外一圈淡淡的光晕
      const m = 1.1
      const hp = [[op.u0 - m, op.v0 - m, 0.05], [op.u1 + m, op.v0 - m, 0.05], [op.u1 + m, op.v1 + m, 0.05], [op.u0 - m, op.v1 + m, 0.05]].map(p => F.P(p[0], p[1], p[2]))
      const hw = w / 2 + m, hh = h / 2 + m
      const ff = op.kind === 'foyer' ? 1.4 : 1
      hgb.quadS(hp[0], hp[1], hp[2], hp[3], [lampCol, ff, 0], 0, { aP: [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]], aWH: [w, h] })
    }

    /* ---------- 天顶玻璃（低坡的四坡玻璃顶） ---------- */
    for (const s of SKY) {
      const z0 = 15.36, rise = 0.62
      const bmin = [s.x0, s.y0, 0], bmax = [s.x1, s.y1, 14.6]
      const ex = { aBmin: bmin, aBmax: bmax }
      const P = (x, y, z) => MZ.v(x, y, z)
      const wx = s.x1 - s.x0, wy = s.y1 - s.y0
      const q = (a, b, c, d) => {
        const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(d, a)).normalize()
        if (n.y < 0) { sgb.quad3(d, c, b, a, n.negate(), [s.over === '门厅' ? 0 : s.over === '花园' ? 1 : 2, 0, 0], 0, ex) } else sgb.quad3(a, b, c, d, n, [s.over === '门厅' ? 0 : s.over === '花园' ? 1 : 2, 0, 0], 0, ex)
      }
      if (wx >= wy) {
        const yc = (s.y0 + s.y1) / 2, ra = s.x0 + wy / 2, rb = s.x1 - wy / 2
        q(P(s.x0, s.y0, z0), P(s.x1, s.y0, z0), P(rb, yc, z0 + rise), P(ra, yc, z0 + rise))
        q(P(s.x1, s.y1, z0), P(s.x0, s.y1, z0), P(ra, yc, z0 + rise), P(rb, yc, z0 + rise))
        q(P(s.x0, s.y1, z0), P(s.x0, s.y0, z0), P(ra, yc, z0 + rise), P(ra, yc, z0 + rise))
        q(P(s.x1, s.y0, z0), P(s.x1, s.y1, z0), P(rb, yc, z0 + rise), P(rb, yc, z0 + rise))
      } else {
        const xc = (s.x0 + s.x1) / 2, ra = s.y0 + wx / 2, rb = s.y1 - wx / 2
        q(P(s.x1, s.y0, z0), P(s.x1, s.y1, z0), P(xc, rb, z0 + rise), P(xc, ra, z0 + rise))
        q(P(s.x0, s.y1, z0), P(s.x0, s.y0, z0), P(xc, ra, z0 + rise), P(xc, rb, z0 + rise))
        q(P(s.x0, s.y0, z0), P(s.x1, s.y0, z0), P(xc, ra, z0 + rise), P(xc, ra, z0 + rise))
        q(P(s.x1, s.y1, z0), P(s.x0, s.y1, z0), P(xc, rb, z0 + rise), P(xc, rb, z0 + rise))
      }
    }

    /* ---------- 网格与材质 ---------- */
    const archMat = MZ.mat.arch()
    const house = new T.Mesh(gb.build(), archMat)
    house.name = 'house'
    const group = new T.Group()
    group.add(house)

    // 栏杆柱：一个实例网格
    {
      const g = new T.LatheGeometry(BALUSTER.map(p => new T.Vector2(p[0], p[1])), detail >= 2 ? 8 : 6)
      const n = g.attributes.position.count
      g.setAttribute('aCol', new T.Float32BufferAttribute(new Float32Array(n * 3).map((_, i) => COL.trim[i % 3]), 3))
      g.setAttribute('aKind', new T.Float32BufferAttribute(new Float32Array(n).fill(K.TRIM), 1))
      const im = new T.InstancedMesh(g, archMat, balPos.length)
      const m = new T.Matrix4()
      balPos.forEach((p, i) => { const q = MZ.v(p[0], p[1], p[2]); m.makeTranslation(q.x, q.y, q.z); im.setMatrixAt(i, m) })
      im.instanceMatrix.needsUpdate = true
      im.computeBoundingSphere && im.computeBoundingSphere()
      im.frustumCulled = false
      im.name = 'balusters'
      group.add(im)
    }

    const glass = new T.Mesh(ggb.build(), MZ.mat.glass())
    glass.name = 'windows'
    group.add(glass)
    const sky = new T.Mesh(sgb.build(), MZ.mat.atrium())
    sky.name = 'skylights'
    group.add(sky)
    // 天眼玻璃罩
    {
      const g = new T.SphereGeometry(ocR + 0.1, detail >= 2 ? 52 : 32, 6, 0, Math.PI * 2, 0, Math.PI / 2)
      g.scale(1, 0.36, 1)
      const c = MZ.v(hall.cx, hall.cy, 15.62)
      g.translate(c.x, c.y, c.z)
      const oc = new T.Mesh(g, MZ.mat.oculus())
      oc.name = 'oculus'
      group.add(oc)
    }
    const halo = new T.Mesh(hgb.build(), MZ.mat.halo())
    halo.name = 'halos'
    halo.renderOrder = 5
    group.add(halo)

    /* ---------- 夜里的窗光：外墙展开图、地上的光斑、天顶下的平面 ---------- */
    const glowCv = paintGlow(windows)
    const spillCv = paintSpill(windows)
    const atriumCv = paintAtrium()
    MZ.U.uGlowTex.value = MZ.canvasTex(glowCv, { mip: true })
    MZ.U.uSpillTex.value = MZ.canvasTex(spillCv, { mip: false })
    sky.material.uniforms.uPlan.value = MZ.canvasTex(atriumCv, { mip: true, srgb: true })

    // 拾取用：每扇窗在立面上的矩形
    const pick = windows.map(op => ({ F: op.F.id, u0: op.u0, u1: op.u1, v0: op.v0, v1: op.v1, floor: op.floor, room: op.room, kind: op.kind, idx: op.idx, lampCol: op.lampCol }))
    return { group, pick, FAC }
  }

  /* ---------- 画：外墙上的窗光（四面外墙展开，R 有窗房间、G 廊与楼梯） ---------- */
  function paintGlow(windows) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 512
    const x = cv.getContext('2d')
    x.fillStyle = '#000'
    x.fillRect(0, 0, 512, 512)
    x.globalCompositeOperation = 'lighter'
    const S = 6
    for (const op of windows) {
      const row = op.F.f * 102
      const col = op.lampCol ? '0,255,0' : '255,0,0'
      const u0 = op.u0 * S, u1 = op.u1 * S, v0 = row + (op.v0 + 1) * S, v1 = row + (op.v1 + 1) * S
      // 窗洞本身（照亮侧壁、窗台）
      x.fillStyle = `rgba(${col},0.95)`
      x.fillRect(u0, v0, u1 - u0, v1 - v0)
      // 四周一圈（墙面、窗套），往下多一些（窗台、下面的墙）
      const cx = (u0 + u1) / 2, cy = (v0 + v1) / 2 - 0.25 * S
      x.save()
      x.translate(cx, cy)
      x.scale((u1 - u0) / 2 + 1.1 * S, (v1 - v0) / 2 + 1.2 * S)
      const g = x.createRadialGradient(0, 0, 0.55, 0, 0, 1)
      g.addColorStop(0, `rgba(${col},0.42)`)
      g.addColorStop(1, `rgba(${col},0)`)
      x.fillStyle = g
      x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill()
      x.restore()
    }
    return cv
  }
  MZ.SPILL = { x0: -16, x1: 86, y0: -18, y1: 59, px: 3 }
  // 地上的光斑：只照到窗外几米（物理层 1.4）
  function paintSpill(windows) {
    const B = MZ.SPILL
    const cv = document.createElement('canvas')
    cv.width = Math.round((B.x1 - B.x0) * B.px)
    cv.height = Math.round((B.y1 - B.y0) * B.px)
    const x = cv.getContext('2d')
    x.fillStyle = '#000'
    x.fillRect(0, 0, cv.width, cv.height)
    x.globalCompositeOperation = 'lighter'
    const toPx = (sx, sy) => [(sx - B.x0) * B.px, (sy - B.y0) * B.px]
    for (const op of windows) {
      const F = op.F
      const h = op.v0 + 0.45 // 下缘离屋外地面多高
      const reach = Math.min(9, 1.6 + h * 0.42), spread = (op.u1 - op.u0) / 2 + 0.6 + h * 0.18
      const k = (op.kind === 'foyer' ? 0.9 : 1) * Math.min(1, 2.2 / (0.8 + h * 0.32)) * Math.min(1.6, (op.u1 - op.u0) * (op.v1 - op.v0) / 6.7)
      const uc = (op.u0 + op.u1) / 2
      const p = F.P(uc, 0, reach * 0.55)
      const [px, py] = toPx(p[0], p[1])
      const col = op.lampCol ? '0,255,0' : '255,0,0'
      x.save()
      x.translate(px, py)
      if (F.id === 'W' || F.id === 'E') x.rotate(Math.PI / 2)
      x.scale(spread * B.px, reach * 0.62 * B.px)
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, `rgba(${col},${Math.min(1, 0.85 * k).toFixed(3)})`)
      g.addColorStop(0.55, `rgba(${col},${Math.min(1, 0.32 * k).toFixed(3)})`)
      g.addColorStop(1, `rgba(${col},0)`)
      x.fillStyle = g
      x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill()
      x.restore()
    }
    return cv
  }
  // 天顶下面看得见的一层地面：门厅（罗盘花、大楼梯）、花园（十字路、十六床、泉盘）、自然史大厅（霸王龙台座）
  MZ.ATRIUM = { x0: 12, x1: 57.6, y0: 0, y1: 28.8, px: 10 }
  function paintAtrium() {
    const B = MZ.ATRIUM
    const cv = document.createElement('canvas')
    cv.width = cv.height = 512 // 2 的幂（WebGL1 也能生成多级纹理）
    const x = cv.getContext('2d')
    x.scale(512 / ((B.x1 - B.x0) * B.px), 512 / ((B.y1 - B.y0) * B.px))
    const R = (x0, x1, y0, y1, c) => { x.fillStyle = c; x.fillRect((x0 - B.x0) * B.px, (y0 - B.y0) * B.px, (x1 - x0) * B.px, (y1 - y0) * B.px) }
    const rnd = MZ.rng(11)
    // 石地
    R(B.x0, B.x1, B.y0, B.y1, '#77706a')
    x.strokeStyle = 'rgba(30,26,24,.35)'; x.lineWidth = 1
    const PW = (B.x1 - B.x0) * B.px, PH = (B.y1 - B.y0) * B.px
    for (let gx = B.x0; gx < B.x1; gx += 0.8) { x.beginPath(); x.moveTo((gx - B.x0) * B.px, 0); x.lineTo((gx - B.x0) * B.px, PH); x.stroke() }
    for (let gy = B.y0; gy < B.y1; gy += 0.8) { x.beginPath(); x.moveTo(0, (gy - B.y0) * B.px); x.lineTo(PW, (gy - B.y0) * B.px); x.stroke() }
    // 门厅：大楼梯（东西两座双跑）、罗盘花
    for (const [a, b] of [[26.4, 28], [28.2, 29.8], [41.6, 43.2], [39.8, 41.4]]) {
      R(a, b, 2.6, 8.4, '#5d5650')
      for (let y = 4.2; y < 8.4; y += 0.28) R(a, b, y, y + 0.03, '#3d3834')
    }
    R(26.4, 29.8, 2.6, 4.2, '#66605a'); R(39.8, 43.2, 2.6, 4.2, '#66605a')
    {
      const cx = (34.8 - B.x0) * B.px, cy = (4.8 - B.y0) * B.px, r = 0.6 * B.px
      x.fillStyle = '#2b2725'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill()
      x.fillStyle = '#c29a5b'
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, l = i % 2 ? r * 0.55 : r * 0.95
        x.beginPath(); x.moveTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l)
        x.lineTo(cx + Math.cos(a + 0.35) * r * 0.18, cy + Math.sin(a + 0.35) * r * 0.18)
        x.lineTo(cx + Math.cos(a - 0.35) * r * 0.18, cy + Math.sin(a - 0.35) * r * 0.18); x.fill()
      }
    }
    // 花园：石路、十六座种植床、泉盘
    R(12, 26.4, 12, 28.8, '#3b3328')
    R(12, 26.4, 19.2, 21.6, '#8a837a'); R(16.2, 18.6, 12, 28.8, '#8a837a')
    const beds = []
    for (const xs of [[13.2, 15.6], [19.2, 21.6]]) for (const ys of [[12.6, 14], [14.33, 15.73], [16.06, 17.46], [17.79, 19.19], [21.6, 23], [23.33, 24.73], [25.06, 26.46], [26.79, 28.19]]) beds.push([xs[0], xs[1], ys[0], ys[1]])
    const bloom = ['#e9e2cf', '#d8c38a', '#b8433f', '#e7d9d2', '#d9a43a', '#efe8dc', '#cf6f78', '#5aa7a0', '#f2f0ea', '#c32b2b', '#a8283d', '#d6a54a', '#d8492f', '#efece4', '#d9763a', '#5a0f14']
    beds.forEach(([x0, x1, y0, y1], i) => {
      R(x0, x1, y0, y1, '#9a9184')
      R(x0 + 0.1, x1 - 0.1, y0 + 0.1, y1 - 0.1, '#2f3d22')
      for (let k = 0; k < 22; k++) {
        x.fillStyle = k % 3 ? '#3e5a2c' : bloom[i % bloom.length]
        const px = (x0 + 0.2 + rnd() * (x1 - x0 - 0.4) - B.x0) * B.px, py = (y0 + 0.2 + rnd() * (y1 - y0 - 0.4) - B.y0) * B.px
        x.beginPath(); x.arc(px, py, (k % 3 ? 2.2 : 1.4) * B.px / 10, 0, Math.PI * 2); x.fill()
      }
    })
    {
      const cx = (17.4 - B.x0) * B.px, cy = (20.4 - B.y0) * B.px
      x.fillStyle = '#e8e4da'; x.beginPath(); x.arc(cx, cy, 0.6 * B.px, 0, Math.PI * 2); x.fill()
      x.fillStyle = '#6f8a8c'; x.beginPath(); x.arc(cx, cy, 0.45 * B.px, 0, Math.PI * 2); x.fill()
    }
    // 自然史大厅：霸王龙台座与骨架的影子
    R(43.2, 57.6, 12, 28.8, '#706a63')
    R(50.2, 54.2, 13.8, 27, '#3a3532')
    x.strokeStyle = '#1b1715'; x.lineWidth = 0.5 * B.px; x.lineCap = 'round'
    x.beginPath(); x.moveTo((52.2 - B.x0) * B.px, (26.4 - B.y0) * B.px)
    x.bezierCurveTo((52.6 - B.x0) * B.px, (22 - B.y0) * B.px, (51.6 - B.x0) * B.px, (18 - B.y0) * B.px, (52.4 - B.x0) * B.px, (14.4 - B.y0) * B.px); x.stroke()
    x.lineWidth = 0.9 * B.px
    x.beginPath(); x.moveTo((52.1 - B.x0) * B.px, (24.5 - B.y0) * B.px); x.lineTo((52.4 - B.x0) * B.px, (20.5 - B.y0) * B.px); x.stroke()
    return cv
  }
})()
