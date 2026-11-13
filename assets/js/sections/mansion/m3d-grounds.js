/* ==========================================================
   洋馆 · 三维 · 屋外（物理层 1.4）
   房子四周一圈 15 m 草地；正门外三级石阶与 20×12 m 的铺石前庭（在房子模块里）；
   草地往北、东、西是松树和山毛榉的林子，一直到墙，南缘与南边草地的外缘齐平；树干相隔两三米，
   地上是落叶、苔藓和蕨，没有路。往南是约 65 m 宽的沙滩，靠水边一条湿沙；水边离南墙约 80 m，
   再往南是海，不涨不落，浪不大。没有活物，没有礁石和贝壳。
   透明的墙（半径 300 m）看不见，这里不画；墙外的林子、沙滩和海照样铺到天边。
   近处的树逐棵实例化（两种树各一次绘制）；林子深处与墙外是一张起伏的林冠面。
   ========================================================== */
(function () {
  'use strict'
  const T = window.THREE, MZ = window.MZ3D
  if (!T || !MZ) return
  const LB = MZ.LAWN

  const DETAIL = {
    2: { grid: 7, bandL: 40, bandB: 26, reach: 330, ferns: 2600, shell: 8 },
    1: { grid: 10, bandL: 30, bandB: 20, reach: 320, ferns: 1500, shell: 11 },
    0: { grid: 14, bandL: 20, bandB: 14, reach: 310, ferns: 700, shell: 15 },
  }

  // 一组网格线：中间一段等距，往外越来越疏，再加上必须落在线上的边界
  function lines(lo, hi, a, b, step, extra) {
    const out = []
    for (let v = a; v <= b + 1e-6; v += step) out.push(v)
    let s = step, v = a
    while (v > lo) { s *= 1.16; v -= s; out.push(Math.max(lo, v)) }
    s = step; v = b
    while (v < hi) { s *= 1.16; v += s; out.push(Math.min(hi, v)) }
    for (const e of extra || []) out.push(e)
    const r = [...new Set(out.map(x => Math.round(x * 100) / 100))].sort((p, q) => p - q)
    // 太近的两条并掉（边界线保留）
    const keep = new Set((extra || []).map(x => Math.round(x * 100) / 100))
    const res = []
    for (const x of r) { if (res.length && x - res[res.length - 1] < 0.3 && !keep.has(x)) continue; res.push(x) }
    return res
  }
  // 轴线坐标的网格 → 几何（高度由 fz(x, y) 给）
  function gridGeo(xs, ys, fz) {
    const nx = xs.length, ny = ys.length
    const pos = new Float32Array(nx * ny * 3)
    let k = 0
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const p = MZ.v(xs[i], ys[j], fz(xs[i], ys[j]))
      pos[k++] = p.x; pos[k++] = p.y; pos[k++] = p.z
    }
    const idx = []
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1
      // 轴线坐标 y 向北 = three −Z：(a, b, d) 从上往下看是逆时针
      idx.push(a, b, d, a, d, c)
    }
    const g = new T.BufferGeometry()
    g.setAttribute('position', new T.BufferAttribute(pos, 3))
    g.setIndex(nx * ny > 65535 ? new T.Uint32BufferAttribute(idx, 1) : new T.Uint16BufferAttribute(idx, 1))
    g.computeVertexNormals()
    g.computeBoundingSphere()
    return g
  }

  /* ---------- 树的单位几何（高 1；顶点色里带了树干/树冠与下部的暗） ---------- */
  function pineGeo(detail) {
    const gb = new MZ.GB()
    const trunk = MZ.lin('#4a3a2e'), crown = MZ.lin('#1f2c21')
    const seg = detail >= 2 ? 6 : 5
    const tg = new T.CylinderGeometry(0.0045, 0.0105, 1.0, seg, 1, true)
    gb.addGeo(tg, new T.Matrix4().makeTranslation(0, 0.5, 0), (v) => mul(trunk, 0.7 + 0.5 * v.y), 0)
    tg.dispose()
    const tiers = [[0.36, 0.66, 0.105], [0.5, 0.79, 0.088], [0.64, 0.9, 0.068], [0.77, 1.02, 0.046]]
    for (const [y0, y1, r] of tiers) {
      const cg = new T.ConeGeometry(r, y1 - y0, detail >= 2 ? 7 : 6, 1, false)
      gb.addGeo(cg, new T.Matrix4().makeTranslation(0, (y0 + y1) / 2, 0), (v) => mul(crown, 0.55 + 0.6 * MZ.smooth(y0, y1, v.y) + 0.1 * (y0 - 0.36)), 0)
      cg.dispose()
    }
    return toTreeGeo(gb)
  }
  function beechGeo(detail) {
    const gb = new MZ.GB()
    const trunk = MZ.lin('#6c6860'), crown = MZ.lin('#34462a')
    const seg = detail >= 2 ? 6 : 5
    const tg = new T.CylinderGeometry(0.006, 0.013, 0.78, seg, 1, true)
    gb.addGeo(tg, new T.Matrix4().makeTranslation(0, 0.39, 0), (v) => mul(trunk, 0.6 + 0.6 * v.y), 0)
    tg.dispose()
    const blobs = [[0, 0.7, 0, 0.2], [0.09, 0.62, 0.05, 0.15], [-0.08, 0.64, -0.06, 0.14], [0.02, 0.84, -0.02, 0.13]]
    for (const [x, y, z, r] of blobs) {
      const sg = new T.SphereGeometry(r, detail >= 2 ? 7 : 6, detail >= 2 ? 5 : 4)
      sg.scale(1, 0.82, 1)
      gb.addGeo(sg, new T.Matrix4().makeTranslation(x, y, z), (v) => mul(crown, 0.45 + 0.75 * MZ.smooth(y - r, y + r * 0.9, v.y)), 0)
      sg.dispose()
    }
    return toTreeGeo(gb)
  }
  const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f]
  // 拼装器里的坐标已经是 three 坐标（addGeo 直接放）；这里去掉用不着的属性
  function toTreeGeo(gb) {
    const g = gb.build()
    g.deleteAttribute('aKind')
    return g
  }

  /* ---------- 蕨的贴图（画布） ---------- */
  function fernTexture() {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 128
    const x = cv.getContext('2d')
    x.clearRect(0, 0, 128, 128)
    const rnd = MZ.rng(5)
    for (let f = 0; f < 6; f++) {
      const bx = 64 + (rnd() - 0.5) * 16, ang = -Math.PI / 2 + (f - 2.5) * 0.36 + (rnd() - 0.5) * 0.2
      const len = 70 + rnd() * 40
      const g = 70 + Math.floor(rnd() * 40)
      x.strokeStyle = `rgb(${24 + rnd() * 10},${g},${26 + rnd() * 10})`
      x.fillStyle = x.strokeStyle
      x.lineWidth = 1.6
      let px = bx, py = 128, a = ang
      const steps = 18
      for (let i = 0; i < steps; i++) {
        const t = i / steps
        const nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps
        x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke()
        const lw = (1 - t) * 13 + 2
        for (const sd of [-1, 1]) {
          x.beginPath()
          x.moveTo(nx, ny)
          x.quadraticCurveTo(nx + Math.cos(a + sd * 1.2) * lw * 0.6, ny + Math.sin(a + sd * 1.2) * lw * 0.6, nx + Math.cos(a + sd * 1.45) * lw, ny + Math.sin(a + sd * 1.45) * lw + 2)
          x.lineTo(nx + Math.cos(a + sd * 1.0) * lw * 0.4, ny + Math.sin(a + sd * 1.0) * lw * 0.4)
          x.fill()
        }
        px = nx; py = ny; a += (ang < -Math.PI / 2 ? -1 : 1) * 0.045
      }
    }
    const t = MZ.canvasTex(cv, { mip: true, srgb: true })
    return t
  }
  function fernGeo() {
    const g = new T.BufferGeometry()
    const pos = [], uv = [], idx = []
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI / 3, c = Math.cos(a) * 0.55, s = Math.sin(a) * 0.55
      const b = pos.length / 3
      pos.push(-c, 0, -s, c, 0, s, c, 0.75, s, -c, 0.75, -s)
      uv.push(0, 1, 1, 1, 1, 0, 0, 0)
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    return g
  }

  /* =====================================================================
     建屋外
     ===================================================================== */
  MZ.buildGrounds = function (o) {
    const D = DETAIL[o.detail != null ? o.detail : 2]
    const group = new T.Group()
    const CX = MZ.OX
    // 「林子深处」用切比雪夫距离（矩形外扩），与网格线对齐
    const boxDist = (x, y) => Math.max(LB.x0 - x, x - LB.x1, LB.y0 - y, y - LB.y1, 0)

    /* ---------- 地面 ---------- */
    {
      const xs = lines(CX - 3200, CX + 3200, CX - 330, CX + 330, D.grid, [LB.x0, LB.x1, -0.6, 70.2, 24.8, 44.8])
      const ys = lines(-260, 20.4 + 3200, -120, 360, D.grid, [LB.y0, LB.y1, -0.6, 41.4, -12.6, MZ.SHORE, -74, -78])
      const g = gridGeo(xs, ys, (x, y) => MZ.height(x, y))
      const m = new T.Mesh(g, MZ.mat.ground())
      m.name = 'ground'
      group.add(m)
    }

    /* ---------- 海 ---------- */
    {
      const g = new T.PlaneGeometry(1, 1, 1, 1)
      g.rotateX(-Math.PI / 2)
      const y0 = -76.5, y1 = -3400
      const a = MZ.v(CX, y0, MZ.SEA), b = MZ.v(CX, y1, MZ.SEA)
      g.scale(7000, 1, b.z - a.z)
      g.translate(a.x, MZ.SEA, (a.z + b.z) / 2)
      const m = new T.Mesh(g, MZ.mat.sea())
      m.name = 'sea'
      group.add(m)
    }

    /* ---------- 天（跟着镜头走的球） ---------- */
    const sky = new T.Mesh(new T.SphereGeometry(4000, 32, 16), MZ.mat.sky())
    sky.name = 'sky'
    sky.renderOrder = -10
    sky.frustumCulled = false
    group.add(sky)

    /* ---------- 林子：近处逐棵 ---------- */
    const rnd = MZ.rng(20240611)
    const spots = []
    const cell = 2.5
    for (let y = LB.y0 + 0.4; y < LB.y1 + D.bandL; y += cell) {
      for (let x = CX - D.reach; x < CX + D.reach; x += cell) {
        const px = x + (rnd() - 0.5) * cell * 0.85, py = y + (rnd() - 0.5) * cell * 0.85
        if (py < LB.y0 + 0.9) continue
        const bd = boxDist(px, py)
        if (bd < 0.9) continue
        const nearLawn = bd < D.bandL, nearBeach = py - LB.y0 < D.bandB
        if (!nearLawn && !nearBeach) continue
        spots.push({ x: px, y: py, prio: Math.min(bd, py - LB.y0) + rnd() * 1.5 })
      }
    }
    spots.sort((a, b) => a.prio - b.prio)
    const pines = [], beeches = []
    for (const s of spots) {
      const beech = MZ.noise2(s.x / 46, s.y / 46) * 0.8 + rnd() * 0.35 > 0.64
      ;(beech ? beeches : pines).push(s)
    }
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3()
    const plant = (list, geo, hMin, hMax) => {
      const im = new T.InstancedMesh(geo, MZ.mat.tree(), list.length)
      list.forEach((s, i) => {
        const H = hMin + rnd() * (hMax - hMin)
        const p = MZ.v(s.x, s.y, MZ.height(s.x, s.y) - 0.15)
        e.set((rnd() - 0.5) * 0.05, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.05)
        q.setFromEuler(e)
        const k = 0.88 + rnd() * 0.26
        sc.set(H * k, H, H * k)
        m4.compose(p, q, sc)
        im.setMatrixAt(i, m4)
      })
      im.instanceMatrix.needsUpdate = true
      im.frustumCulled = false
      im.userData.full = list.length
      return im
    }
    const pineM = plant(pines, pineGeo(o.detail), 17, 25)
    pineM.name = 'pines'
    const beechM = plant(beeches, beechGeo(o.detail), 15, 22)
    beechM.name = 'beeches'
    group.add(pineM, beechM)

    /* ---------- 蕨：林缘十来米以内 ---------- */
    {
      const fs = []
      let guard = 0
      while (fs.length < D.ferns && guard++ < D.ferns * 20) {
        const x = CX - D.reach + rnd() * D.reach * 2, y = LB.y0 + rnd() * (LB.y1 - LB.y0 + 14)
        const bd = boxDist(x, y)
        const fd = Math.min(bd, y - LB.y0)
        if (bd < 0.4 || y < LB.y0 + 0.3) continue
        if (fd > 11 || rnd() > 1 - fd / 14) continue
        fs.push([x, y, fd])
      }
      fs.sort((a, b) => a[2] - b[2])
      const tex = fernTexture()
      const im = new T.InstancedMesh(fernGeo(), MZ.mat.fern(tex), fs.length)
      fs.forEach(([x, y], i) => {
        const p = MZ.v(x, y, MZ.height(x, y) - 0.05)
        e.set(0, rnd() * Math.PI, 0); q.setFromEuler(e)
        const k = 0.7 + rnd() * 0.8
        sc.set(k, k * (0.8 + rnd() * 0.5), k)
        m4.compose(p, q, sc)
        im.setMatrixAt(i, m4)
      })
      im.instanceMatrix.needsUpdate = true
      im.frustumCulled = false
      im.userData.full = fs.length
      im.name = 'ferns'
      group.add(im)
    }

    /* ---------- 林冠面：近处逐棵的树以外，一直到天边 ---------- */
    {
      const cut = D.bandL - 7, cutB = D.bandB - 6, reach = D.reach - 8
      const open = (x, y) => y < LB.y0 + 1.2 || boxDist(x, y) < cut || (Math.abs(x - CX) < reach && y - LB.y0 < cutB)
      const ex = []
      const twin = v => { ex.push(v, v + 0.6) }
      const xs0 = [LB.x0 - cut, LB.x1 + cut, CX - reach, CX + reach]
      const exX = []
      for (const v of xs0) exX.push(v - 0.6, v)
      twin(LB.y1 + cut); twin(LB.y0 + cutB); twin(LB.y0 + 1.2)
      const xs = lines(CX - 3200, CX + 3200, CX - 340, CX + 340, D.shell, exX)
      const ys = lines(LB.y0, 20.4 + 3200, LB.y0, 380, D.shell, ex)
      const g = gridGeo(xs, ys, (x, y) => {
        if (open(x, y)) return -8
        return 14.5 + 7.5 * MZ.fbm2(x / 52, y / 52, 3) + 3.2 * MZ.noise2(x / 7.5, y / 7.5)
      })
      const m = new T.Mesh(g, MZ.mat.canopy())
      m.name = 'canopy'
      group.add(m)
    }

    return { group, sky, trees: [pineM, beechM], ferns: group.getObjectByName('ferns') }
  }
})()
