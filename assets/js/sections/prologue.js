/* ==========================================================
   醒来 · prologue —— 网站的第一屏
   眼睑睁开后：从穹顶正上方俯视圆桌，十五把乌木扶手椅，光源就是光标。
   17:01 起按席位分五批醒来（《开局配置》§3）；滚动时镜头倾斜、圆桌后退、编号逐一亮起，
   整个议事厅沉入黑暗，一把黄铜钥匙从钥匙龛落下，带进洋馆。

   本文件同时提供 App.domeHall：穹顶议事厅的 Canvas 渲染器（终章 wish 复用同一张圆桌）。
   几何依据《洋馆物理层》§1.1 §6.2 §9（单位米；原点在桌心，x 向东，y 向北，z 向上）：
     厅 17.2×14，最高净高 7.8，穹顶起拱 4.6；墨玉圆盘直径 8.4；青白玉圆桌直径 4.8、高 0.76，
     老紫檀鼓形木座；桌沿十五枚银号牌；十五把乌木扶手椅等距环绕，椅宽 0.62，座背包暗蓝真丝，
     1 号正北、顺时针；墙上十五幅窄长丝绸织纹屏与座椅节奏相应；北墙两座水晶罩柜与石英挂钟；
     东侧收纳台 x 7.45–8.10、y −4.0–−1.6，台面 1.05，钥匙龛离地 1.12–1.76（上排 1–8，下排 9–15）。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const TAU = Math.PI * 2

  /* =====================================================================
     几何常量
     ===================================================================== */
  const G = {
    hx: 8.6, hy: 7.0, spring: 4.6, apex: 7.8,
    disc: 4.2, tableR: 2.4, tableH: 0.76, drumR: 1.05,
    seatR: 2.98, n: 15,
  }
  const COUNTER = { x0: 7.45, x1: 8.1, y0: -4.0, y1: -1.6, top: 1.05, h: 1.8, nicheZ0: 1.12, nicheZ1: 1.76 }

  /* =====================================================================
     小工具
     ===================================================================== */
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
  const mix = (a, b, t) => a + (b - a) * t
  const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l] }
  const rgb = (r, g, b) => 'rgb(' + (r < 0 ? 0 : r > 255 ? 255 : r | 0) + ',' + (g < 0 ? 0 : g > 255 ? 255 : g | 0) + ',' + (b < 0 ? 0 : b > 255 ? 255 : b | 0) + ')'
  const rgba = (r, g, b, a) => 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)) + ')'
  const hex = h => U.hexToRgb(h || '#c29a5b')

  // 二维凸包（单调链），点为 [x, y]
  function hull(pts) {
    if (pts.length < 3) return pts
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    const lo = [], up = []
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
    up.pop(); lo.pop()
    return lo.concat(up)
  }

  function pathPts(ctx, pts) {
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
  }

  /* =====================================================================
     摄像机：绕目标点的环绕镜头（elev 仰角，PI/2 = 正俯视；yaw 0 = 从南向北看，北在画面上方）
     ===================================================================== */
  function Camera() {
    this.pos = [0, 0, 10]; this.F = [0, 0, -1]; this.R = [1, 0, 0]; this.Up = [0, 1, 0]
    this.f = 1000; this.W = 1; this.H = 1; this.ox = 0; this.oy = 0; this.near = 0.2
  }
  Camera.prototype.set = function (o) {
    const ce = Math.cos(o.elev), se = Math.sin(o.elev), cy = Math.cos(o.yaw || 0), sy = Math.sin(o.yaw || 0)
    const bx = sy, by = -cy
    this.pos = [o.tx + bx * ce * o.dist, o.ty + by * ce * o.dist, o.tz + se * o.dist]
    this.F = norm3(-bx * ce, -by * ce, -se)
    this.R = [cy, sy, 0]
    const F = this.F, R = this.R
    this.Up = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]]
    this.f = o.f
    this.ox = o.ox || 0
    this.oy = o.oy || 0
  }
  // 摄像机坐标 [xc, yc, zc]
  Camera.prototype.cam = function (x, y, z) {
    const dx = x - this.pos[0], dy = y - this.pos[1], dz = z - this.pos[2]
    const R = this.R, Up = this.Up, F = this.F
    return [dx * R[0] + dy * R[1] + dz * R[2], dx * Up[0] + dy * Up[1] + dz * Up[2], dx * F[0] + dy * F[1] + dz * F[2]]
  }
  // 世界 → 屏幕 [sx, sy, depth, px/m]；在近平面之后返回 null
  Camera.prototype.p = function (x, y, z) {
    const c = this.cam(x, y, z)
    if (c[2] < this.near) return null
    const s = this.f / c[2]
    return [this.W / 2 + this.ox + c[0] * s, this.H / 2 + this.oy - c[1] * s, c[2], s]
  }
  Camera.prototype.depth = function (x, y, z) {
    return (x - this.pos[0]) * this.F[0] + (y - this.pos[1]) * this.F[1] + (z - this.pos[2]) * this.F[2]
  }
  // 多边形（世界坐标）→ 近平面裁切后的屏幕点
  Camera.prototype.poly = function (pts) {
    const n = this.near, c = [], out = []
    for (const q of pts) c.push(this.cam(q[0], q[1], q[2]))
    for (let i = 0; i < c.length; i++) {
      const a = c[i], b = c[(i + 1) % c.length]
      const ain = a[2] >= n, bin = b[2] >= n
      if (ain) out.push(a)
      if (ain !== bin) {
        const t = (n - a[2]) / (b[2] - a[2])
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, n])
      }
    }
    if (out.length < 3) return null
    const W2 = this.W / 2 + this.ox, H2 = this.H / 2 + this.oy, f = this.f
    return out.map(q => [W2 + q[0] * f / q[2], H2 - q[1] * f / q[2]])
  }
  // 屏幕点 → 与水平面 z = h 的交点（世界 x, y）
  Camera.prototype.unproject = function (sx, sy, h) {
    const xc = (sx - this.W / 2 - this.ox) / this.f, yc = -(sy - this.H / 2 - this.oy) / this.f
    const F = this.F, R = this.R, Up = this.Up
    const dx = F[0] + R[0] * xc + Up[0] * yc, dy = F[1] + R[1] * xc + Up[1] * yc, dz = F[2] + R[2] * xc + Up[2] * yc
    if (Math.abs(dz) < 1e-5) return null
    const t = (h - this.pos[2]) / dz
    if (t <= 0) return null
    return [this.pos[0] + dx * t, this.pos[1] + dy * t]
  }
  // 水平面 z=h 上一点附近的仿射近似（用来画椭圆形的光池）
  Camera.prototype.affine = function (x, y, h) {
    const o = this.p(x, y, h), ax = this.p(x + 1, y, h), by = this.p(x, y + 1, h)
    if (!o || !ax || !by) return null
    return [ax[0] - o[0], ax[1] - o[1], by[0] - o[0], by[1] - o[1], o[0], o[1]]
  }

  /* =====================================================================
     发光贴图（预渲染，加色混合）
     ===================================================================== */
  const spriteCache = {}
  function glowSprite(r, g, b, hard) {
    const key = r + ',' + g + ',' + b + (hard ? 'h' : '')
    if (spriteCache[key]) return spriteCache[key]
    const S = 128
    const c = document.createElement('canvas')
    c.width = c.height = S
    const x = c.getContext('2d')
    const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    if (hard) {
      gr.addColorStop(0, `rgba(${r},${g},${b},1)`)
      gr.addColorStop(0.18, `rgba(${r},${g},${b},.85)`)
      gr.addColorStop(0.4, `rgba(${r},${g},${b},.22)`)
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
    } else {
      gr.addColorStop(0, `rgba(${r},${g},${b},1)`)
      gr.addColorStop(0.25, `rgba(${r},${g},${b},.42)`)
      gr.addColorStop(0.6, `rgba(${r},${g},${b},.1)`)
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
    }
    x.fillStyle = gr
    x.fillRect(0, 0, S, S)
    spriteCache[key] = c
    return c
  }
  function drawGlow(ctx, spr, x, y, rad, alpha) {
    if (alpha <= 0.003 || rad <= 0.2) return
    ctx.globalAlpha = alpha > 1 ? 1 : alpha
    ctx.drawImage(spr, x - rad, y - rad, rad * 2, rad * 2)
  }

  // 可复现的伪随机（每个席位、每条肋固定的细节）
  const rnd = U.seeded(15017)
  const JADE_VEINS = []
  for (let i = 0; i < 9; i++) {
    const a0 = rnd() * TAU, r0 = 0.3 + rnd() * 1.8, pts = []
    let a = a0, r = r0
    for (let j = 0; j < 7; j++) {
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
      a += (rnd() - 0.5) * 0.5
      r = U.clamp(r + (rnd() - 0.5) * 0.5, 0.2, 2.25)
    }
    JADE_VEINS.push({ pts, w: 0.006 + rnd() * 0.012, a: 0.05 + rnd() * 0.07 })
  }

  /* =====================================================================
     App.domeHall.create(opts)：议事厅渲染器
     opts.canvas（必需）、opts.ribCanvas（穹顶肋拱层，可选，CSS 模糊做景深）
     返回场景对象 S：S.seats[0..14]、S.light、S.view、S.render()、S.resize()、S.setPeople(ids)
     ===================================================================== */
  function createHall(opts) {
    const o = Object.assign({
      lightCol: [255, 192, 128],   // 光（光标）的颜色
      amb: 0.1,                    // 穹顶散下的环境光
      ambCol: [150, 140, 150],
      floorAlb: [0.78, 0.74, 0.66],// 月白翡翠
      num: [194, 154, 91],         // 编号：黄铜
      numOut: [125, 22, 22],       // 熄灭：锈红
      lampCol: [226, 180, 112],    // 席位小光池
      beamCol: [235, 227, 214],    // 穹顶顶端落下的一束光
      ribTone: [14, 16, 26],
      glint: [190, 205, 255],
      silhouette: [9, 8, 8],
    }, opts)

    const S = {
      o, cam: new Camera(),
      W: 1, H: 1, dpr: 1,
      canvas: o.canvas, ctx: o.canvas.getContext('2d'),
      ribCanvas: o.ribCanvas || null, rctx: o.ribCanvas ? o.ribCanvas.getContext('2d') : null,
      sh: document.createElement('canvas'), sh2: document.createElement('canvas'),
      seats: [],
      light: { x: 0, y: 0, z: 5.6, power: 1.45, range: 4.6, flick: 1 },
      view: { elev: Math.PI / 2, yaw: 0, dist: 10.6, tx: 0, ty: 0, tz: 0.45, fk: 1, ox: 0, oy: 0 },
      dark: 0,          // 全局沉入黑暗 0–1
      ribA: 1,          // 肋拱
      numA: 1,          // 编号
      eyeA: 1,          // 眼睛
      wallA: 1,         // 墙与陈设
      poolA: 1,         // 光标光池
      glowA: 1,         // 光源自身的光晕
      floorA: 1,
      beam: { k: -1, amt: 0 },
      time: 0,
      motes: [],
      fit: 0.36,        // 正俯视时椅环半径占短边的比例
    }
    S.sx = S.sh.getContext('2d')
    S.sx2 = S.sh2.getContext('2d')

    for (let k = 1; k <= G.n; k++) {
      const a = (k - 1) * TAU / G.n
      const sa = Math.sin(a), ca = Math.cos(a)
      S.seats.push({
        k, a, x: sa * G.seatR, y: ca * G.seatR,
        fx: -sa, fy: -ca,           // 面朝桌心
        rx: -ca, ry: sa,            // 右手方向
        id: null, acc: [194, 154, 91], hair: 0, long: false,
        awake: 0, eyes: 0, flash: 0, lit: 0, lamp: 0, out: 0, fall: 0, gone: 0, hover: 0,
        yaw: 0, look: 0, blink: 1, nextBlink: 2 + Math.random() * 5,
        droop: (Math.random() - 0.5) * 0.9, sway: Math.random() * TAU,
        vanish: false,
      })
    }

    // 落座：ids 长度 15，元素为角色 id 或 null
    S.setPeople = ids => {
      for (const s of S.seats) {
        const id = ids[s.k - 1] || null
        s.id = id
        const c = id ? App.char(id) : null
        s.acc = c && c.art && c.art.accent ? hex(c.art.accent) : [194, 154, 91]
        s.long = !!(c && (c.gender === '女' || /long|ponytail|braid|flowing|waist-length|shoulder-length/i.test(String(c.art && c.art.hair))))
        s.hair = c ? (/spik|wild|messy|shaggy|mane|untamed/i.test(String(c.art && c.art.hair)) ? 1 : 0) : 0
      }
    }

    S.resize = () => {
      const r = S.canvas.parentNode.getBoundingClientRect()
      const W = Math.max(2, Math.round(r.width)), H = Math.max(2, Math.round(r.height))
      let dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (W * H * dpr * dpr > 4.4e6) dpr = Math.sqrt(4.4e6 / (W * H))
      S.W = W; S.H = H; S.dpr = dpr
      for (const c of [S.canvas, S.ribCanvas]) {
        if (!c) continue
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr)
        c.style.width = W + 'px'; c.style.height = H + 'px'
      }
      S.sh.width = S.sh2.width = Math.ceil(W / 3)
      S.sh.height = S.sh2.height = Math.ceil(H / 3)
      S.cam.W = W; S.cam.H = H
    }

    // 局部（椅子坐标 u 右、v 前、z 上）→ 世界
    const L2W = (s, u, v, z) => [s.x + u * s.rx + v * s.fx, s.y + u * s.ry + v * s.fy, z]

    // 某点、某法线处的照度 → [r, g, b] 乘子（0–~2）
    function lum(px, py, pz, nx, ny, nz, extra) {
      const L = S.light, lc = o.lightCol
      const dx = L.x - px, dy = L.y - py, dz = L.z - pz
      const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2) || 1
      const lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / d)
      const e = L.power * L.flick * lam / (1 + d2 / (L.range * L.range))
      const up = nz > 0 ? nz : 0
      const a = o.amb * (0.45 + 0.55 * up)
      let r = (o.ambCol[0] / 255) * a + (lc[0] / 255) * e
      let g = (o.ambCol[1] / 255) * a + (lc[1] / 255) * e
      let b = (o.ambCol[2] / 255) * a + (lc[2] / 255) * e
      if (extra) {
        const t = extra.amt * (0.35 + 0.65 * up)
        r += extra.col[0] / 255 * t; g += extra.col[1] / 255 * t; b += extra.col[2] / 255 * t
      }
      return [r, g, b]
    }
    function shade(alb, px, py, pz, nx, ny, nz, extra, spec) {
      const l = lum(px, py, pz, nx, ny, nz, extra)
      let r = alb[0] * l[0] * 255, g = alb[1] * l[1] * 255, b = alb[2] * l[2] * 255
      if (spec) {
        // 简单的高光：法线与「光→面→眼」半角
        const L = S.light, C = S.cam.pos
        const lx = L.x - px, ly = L.y - py, lz = L.z - pz, vx = C[0] - px, vy = C[1] - py, vz = C[2] - pz
        const ll = Math.hypot(lx, ly, lz) || 1, vl = Math.hypot(vx, vy, vz) || 1
        const hx = lx / ll + vx / vl, hy = ly / ll + vy / vl, hz = lz / ll + vz / vl
        const hl = Math.hypot(hx, hy, hz) || 1
        const nh = Math.max(0, (hx * nx + hy * ny + hz * nz) / hl)
        const k = Math.pow(nh, 28) * spec * L.power * L.flick / (1 + (ll * ll) / (L.range * L.range))
        r += o.lightCol[0] * k; g += o.lightCol[1] * k; b += o.lightCol[2] * k
      }
      return rgb(r, g, b)
    }
    // 席位附加的顶光（小光池 / 穹顶一束光）
    function seatExtra(s) {
      let amt = s.lamp * 0.55, col = o.lampCol
      if (S.beam.k === s.k - 1 && S.beam.amt > 0) { amt += S.beam.amt * 1.5; col = o.beamCol }
      return amt > 0.002 ? { amt, col } : null
    }

    /* ---------- 镜头 ---------- */
    function setView() {
      const v = S.view
      const minD = Math.min(S.W, S.H)
      const ref = v.ref || 10.6
      const f = minD * S.fit * (ref - 0.5) / 3.45 * (v.fk || 1)
      S.cam.set({ elev: v.elev, yaw: v.yaw, dist: v.dist, tx: v.tx, ty: v.ty, tz: v.tz, f, ox: v.ox, oy: v.oy })
      S.tilt = clamp01((Math.PI / 2 - v.elev) / (Math.PI / 2 - 0.5))
    }
    S.setView = setView

    const circle = (cx, cy, z, r, n) => {
      const pts = []
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]) }
      return pts
    }

    /* ---------- 光池：平面上一点附近的照度渐变（加色） ----------
       org 平面上光源垂足；ax、ay 平面内两轴（单位向量）；dp 光源到平面的距离 */
    function pool(ctx, org, ax, ay, dp, power, range, col, alb, maxR, alpha) {
      if (alpha <= 0.002 || dp <= 0.01) return
      const c = S.cam
      const p0 = c.p(org[0], org[1], org[2])
      const p1 = c.p(org[0] + ax[0], org[1] + ax[1], org[2] + ax[2])
      const p2 = c.p(org[0] + ay[0], org[1] + ay[1], org[2] + ay[2])
      if (!p0 || !p1 || !p2) return
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, maxR)
      const N = 10
      for (let i = 0; i <= N; i++) {
        const t = i / N, rho = t * t * maxR
        const d2 = rho * rho + dp * dp, d = Math.sqrt(d2)
        const e = power * (dp / d) / (1 + d2 / (range * range)) * (1 - sstep(0.7, 1, t * t)) * alpha
        g.addColorStop(t * t, rgb(col[0] * alb[0] * e, col[1] * alb[1] * e, col[2] * alb[2] * e))
      }
      const k = S.dpr
      ctx.setTransform((p1[0] - p0[0]) * k, (p1[1] - p0[1]) * k, (p2[0] - p0[0]) * k, (p2[1] - p0[1]) * k, p0[0] * k, p0[1] * k)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, maxR, 0, TAU); ctx.fill()
      ctx.setTransform(k, 0, 0, k, 0, 0)
    }

    /* ---------- 墙、壁柱、织纹屏、门、挂钟 ---------- */
    const WALLS = [
      { n: [0, -1], a: [-G.hx, G.hy], b: [G.hx, G.hy] },   // 北
      { n: [-1, 0], a: [G.hx, G.hy], b: [G.hx, -G.hy] },   // 东
      { n: [0, 1], a: [G.hx, -G.hy], b: [-G.hx, -G.hy] },  // 南
      { n: [1, 0], a: [-G.hx, -G.hy], b: [-G.hx, G.hy] },  // 西
    ]
    // 从桌心沿方位角 a（北为 0，顺时针）与墙的交点
    const wallHit = a => {
      const sx = Math.sin(a), cy = Math.cos(a)
      const t = Math.min(Math.abs(sx) > 1e-6 ? G.hx / Math.abs(sx) : 1e9, Math.abs(cy) > 1e-6 ? G.hy / Math.abs(cy) : 1e9)
      return [sx * t, cy * t]
    }
    const RIBS = []
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU, w = wallHit(a)
      const g = []
      for (let j = 0; j < 4; j++) g.push(0.18 + rnd() * 0.75)
      RIBS.push({ a, sx: w[0], sy: w[1], major: i % 2 === 0, glints: g, ph: rnd() * TAU })
    }
    const SCREENS = []
    for (let k = 0; k < 15; k++) {
      const a = (k / 15) * TAU, w = wallHit(a)
      const onX = Math.abs(Math.abs(w[0]) - G.hx) < 1e-3 // 东西墙
      SCREENS.push({ x: w[0], y: w[1], ax: onX ? [0, 1] : [1, 0], n: onX ? [-Math.sign(w[0]), 0] : [0, -Math.sign(w[1])] })
    }

    function drawWalls(ctx) {
      const c = S.cam, Lt = S.light, A = S.wallA * (1 - S.dark * 0.9)
      if (A <= 0.01) return
      const C = c.pos
      ctx.save()
      for (const w of WALLS) {
        // 面向镜头才画（镜头在墙外时剔除）
        if ((C[0] - w.a[0]) * w.n[0] + (C[1] - w.a[1]) * w.n[1] <= 0) continue
        const q = c.poly([[w.a[0], w.a[1], 0], [w.b[0], w.b[1], 0], [w.b[0], w.b[1], G.spring], [w.a[0], w.a[1], G.spring]])
        if (!q) continue
        ctx.globalAlpha = A
        pathPts(ctx, q)
        ctx.fillStyle = rgb(9, 7, 7)
        ctx.fill()
        ctx.save()
        ctx.clip()
        // 墙上的光：光源在墙面上的垂足
        const dirx = (w.b[0] - w.a[0]), diry = (w.b[1] - w.a[1]), len = Math.hypot(dirx, diry)
        const ux = dirx / len, uy = diry / len
        const dp = (Lt.x - w.a[0]) * w.n[0] + (Lt.y - w.a[1]) * w.n[1]
        const along = (Lt.x - w.a[0]) * ux + (Lt.y - w.a[1]) * uy
        const fx = w.a[0] + ux * along, fy = w.a[1] + uy * along
        ctx.globalCompositeOperation = 'lighter'
        pool(ctx, [fx, fy, Math.min(Lt.z, G.spring)], [ux, uy, 0], [0, 0, 1], Math.max(0.3, dp), Lt.power * Lt.flick, Lt.range, o.lightCol, [0.2, 0.15, 0.11], 9, A * S.poolA)
        ctx.globalCompositeOperation = 'source-over'
        ctx.restore()
      }
      // 线：护壁上沿、起拱线、壁柱
      ctx.lineCap = 'round'
      const near = (x, y, z) => { const d2 = (x - Lt.x) ** 2 + (y - Lt.y) ** 2 + (z - Lt.z) ** 2; return Lt.power * Lt.flick / (1 + d2 / (Lt.range * Lt.range * 1.6)) }
      for (const w of WALLS) {
        if ((C[0] - w.a[0]) * w.n[0] + (C[1] - w.a[1]) * w.n[1] <= 0) continue
        for (const z of [0.92, G.spring]) {
          const a = c.p(w.a[0], w.a[1], z), b = c.p(w.b[0], w.b[1], z)
          if (!a || !b) continue
          const m = near((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, z)
          ctx.globalAlpha = A * (0.16 + Math.min(0.5, m * 0.5))
          ctx.strokeStyle = rgb(111, 85, 50)
          ctx.lineWidth = z > 1 ? 1.4 : 1
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
        }
      }
      for (const r of RIBS) {
        const visible = WALLS.some(w => Math.abs((r.sx - w.a[0]) * w.n[0] + (r.sy - w.a[1]) * w.n[1]) < 1e-3 && (C[0] - w.a[0]) * w.n[0] + (C[1] - w.a[1]) * w.n[1] > 0)
        if (!visible) continue
        const a = c.p(r.sx, r.sy, 0), b = c.p(r.sx, r.sy, G.spring)
        if (!a || !b) continue
        const m = near(r.sx, r.sy, 1.6)
        ctx.globalAlpha = A * (r.major ? 0.3 : 0.16) * (0.5 + Math.min(1, m))
        ctx.strokeStyle = rgb(70, 78, 104)
        ctx.lineWidth = Math.max(1, Math.min(10, 0.05 * (a[3] + b[3])))
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
      }
      // 十五幅窄长丝绸织纹屏
      for (const s of SCREENS) {
        if ((C[0] - s.x) * s.n[0] + (C[1] - s.y) * s.n[1] <= 0) continue
        const hw = 0.26
        const x0 = s.x - s.ax[0] * hw, y0 = s.y - s.ax[1] * hw, x1 = s.x + s.ax[0] * hw, y1 = s.y + s.ax[1] * hw
        const q = c.poly([[x0, y0, 0.55], [x1, y1, 0.55], [x1, y1, 3.9], [x0, y0, 3.9]])
        if (!q) continue
        const m = near(s.x, s.y, 1.8)
        ctx.globalAlpha = A
        pathPts(ctx, q)
        ctx.fillStyle = rgb(14 + 60 * m * 0.4, 16 + 52 * m * 0.4, 30 + 70 * m * 0.4)
        ctx.fill()
        ctx.globalAlpha = A * (0.25 + Math.min(0.6, m * 0.6))
        ctx.strokeStyle = rgb(150, 118, 70)
        ctx.lineWidth = 1
        ctx.stroke()
      }
      // 门（合拢）：南门 x=±1.2，东西门 y=0.1–1.5
      const doors = [[[-1.2, -G.hy], [1.2, -G.hy], 2.7, [0, 1]], [[G.hx, 0.1], [G.hx, 1.5], 2.4, [-1, 0]], [[-G.hx, 1.5], [-G.hx, 0.1], 2.4, [1, 0]]]
      for (const d of doors) {
        if ((C[0] - d[0][0]) * d[3][0] + (C[1] - d[0][1]) * d[3][1] <= 0) continue
        const q = c.poly([[d[0][0], d[0][1], 0], [d[1][0], d[1][1], 0], [d[1][0], d[1][1], d[2]], [d[0][0], d[0][1], d[2]]])
        if (!q) continue
        ctx.globalAlpha = A
        pathPts(ctx, q)
        ctx.fillStyle = rgb(5, 4, 4)
        ctx.fill()
        ctx.globalAlpha = A * 0.4
        ctx.strokeStyle = rgb(111, 85, 50)
        ctx.stroke()
      }
      // 北墙石英挂钟（钟心离地 2.5 m），指针随 S.clock（馆内分钟）
      if ((C[1] - G.hy) * -1 > 0) {
        const cc = c.p(0, G.hy - 0.03, 2.5)
        if (cc) {
          const r = 0.2 * cc[3]
          if (r > 2) {
            const m = near(0, G.hy, 2.5)
            ctx.globalAlpha = A * (0.35 + Math.min(0.6, m))
            ctx.fillStyle = rgb(30, 26, 24)
            ctx.strokeStyle = rgb(170, 160, 150)
            ctx.lineWidth = Math.max(1, r * 0.08)
            ctx.beginPath(); ctx.ellipse(cc[0], cc[1], r, r * Math.max(0.25, Math.sin(S.view.elev) < 0.99 ? 1 - S.tilt * 0.1 : 1), 0, 0, TAU); ctx.fill(); ctx.stroke()
            const mins = S.clock || 17 * 60
            const ha = ((mins / 60) % 12) / 12 * TAU, ma = (mins % 60) / 60 * TAU
            ctx.beginPath()
            ctx.moveTo(cc[0], cc[1]); ctx.lineTo(cc[0] + Math.sin(ha) * r * 0.5, cc[1] - Math.cos(ha) * r * 0.5)
            ctx.moveTo(cc[0], cc[1]); ctx.lineTo(cc[0] + Math.sin(ma) * r * 0.78, cc[1] - Math.cos(ma) * r * 0.78)
            ctx.stroke()
          }
        }
      }
      ctx.restore()
    }

    /* ---------- 地面：月白翡翠 + 墨玉圆盘 ---------- */
    function drawFloor(ctx) {
      const c = S.cam, Lt = S.light
      const fl = c.poly([[-G.hx, -G.hy, 0], [G.hx, -G.hy, 0], [G.hx, G.hy, 0], [-G.hx, G.hy, 0]])
      if (!fl) return
      const fa = S.floorA
      ctx.save()
      pathPts(ctx, fl)
      ctx.clip()
      ctx.globalAlpha = fa
      const amb = o.amb
      ctx.fillStyle = rgb(o.floorAlb[0] * o.ambCol[0] * amb * 0.5, o.floorAlb[1] * o.ambCol[1] * amb * 0.5, o.floorAlb[2] * o.ambCol[2] * amb * 0.5)
      ctx.fillRect(0, 0, S.W, S.H)
      ctx.globalCompositeOperation = 'lighter'
      // 穹顶散下的一层极淡的光，中央略亮
      pool(ctx, [0, 0, 0], [1, 0, 0], [0, 1, 0], 7.2, 1, 7.5, o.ambCol, o.floorAlb, 11, amb * 0.9 * fa)
      // 光标
      pool(ctx, [Lt.x, Lt.y, 0], [1, 0, 0], [0, 1, 0], Lt.z, Lt.power * Lt.flick, Lt.range, o.lightCol, o.floorAlb, 12, S.poolA * fa)
      // 席位小光池 / 一束光
      for (const s of S.seats) {
        const ex = seatExtra(s)
        if (!ex) continue
        const beam = S.beam.k === s.k - 1
        pool(ctx, [s.x + s.fx * 0.05, s.y + s.fy * 0.05, 0], [1, 0, 0], [0, 1, 0], beam ? 2.2 : 1.2, ex.amt * (beam ? 1.2 : 0.8), beam ? 1.25 : 0.9, ex.col, o.floorAlb, beam ? 2.6 : 1.7, fa)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      // 墨玉圆盘
      const dp = c.poly(circle(0, 0, 0.002, G.disc, 112))
      if (!dp) return
      ctx.save()
      pathPts(ctx, dp)
      ctx.globalAlpha = fa
      ctx.fillStyle = 'rgba(4,3,3,.88)'
      ctx.fill()
      ctx.clip()
      // 墨玉里的放射纹（极淡，像虹膜）
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineWidth = 1
      const lc = o.lightCol
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * TAU + (i % 3) * 0.004
        const r0 = 2.5 + ((i * 37) % 11) / 30, r1 = G.disc - 0.06 - ((i * 53) % 7) / 25
        const mx = Math.cos(a) * 3.3, my = Math.sin(a) * 3.3
        const d2 = (mx - Lt.x) ** 2 + (my - Lt.y) ** 2 + Lt.z * Lt.z
        const e = Lt.power * Lt.flick / (1 + d2 / (Lt.range * Lt.range)) * S.poolA
        const p0 = c.p(Math.cos(a) * r0, Math.sin(a) * r0, 0.003), p1 = c.p(Math.cos(a) * r1, Math.sin(a) * r1, 0.003)
        if (!p0 || !p1) continue
        ctx.globalAlpha = fa * (0.02 + e * 0.08 + o.amb * 0.12)
        ctx.strokeStyle = rgb(lc[0], lc[1] * 0.92, lc[2] * 0.85)
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke()
      }
      // 光源在墨玉里的倒影
      const m = mirror(0)
      if (m) {
        const pm = c.p(m[0], m[1], 0)
        if (pm) {
          const glow = glowSprite(lc[0], lc[1], lc[2])
          const k = Lt.power * Lt.flick * S.poolA * fa
          drawGlow(ctx, glow, pm[0], pm[1], 1.4 * pm[3], 0.32 * k)
          drawGlow(ctx, glowSprite(255, 240, 220, true), pm[0], pm[1], 0.22 * pm[3], 0.5 * k)
        }
      }
      ctx.restore()
      // 圆盘外缘的细缝
      ctx.save()
      pathPts(ctx, dp)
      ctx.globalAlpha = fa * 0.5
      ctx.strokeStyle = rgb(111, 85, 50)
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()
    }
    // 光源关于水平面 z=h 的镜像，与镜头连线在该平面上的交点（镜面反光的位置）
    function mirror(h) {
      const Lt = S.light, C = S.cam.pos
      const lz = 2 * h - Lt.z
      const t = (h - C[2]) / (lz - C[2])
      if (!(t > 0 && t < 1)) return null
      return [C[0] + (Lt.x - C[0]) * t, C[1] + (Lt.y - C[1]) * t]
    }

    /* ---------- 穹顶肋拱（三十条，十五条主肋对着十五把椅子） ---------- */
    function drawRibs(ctx) {
      const c = S.cam, Lt = S.light
      const A = S.ribA * (1 - S.dark)
      if (A <= 0.01) return
      const center = c.p(0, 0, G.apex)
      const ringPx = Math.min(S.W, S.H) * S.fit
      const fwx = c.F[0], fwy = c.F[1], fl = Math.hypot(fwx, fwy) || 1
      ctx.lineCap = 'round'
      const N = 14
      for (const r of RIBS) {
        // 斜视时只留远侧的肋（近侧的在镜头背后）
        const side = (Math.sin(r.a) * fwx + Math.cos(r.a) * fwy) / fl
        const vis = mix(1, sstep(-0.05, 0.45, side), S.tilt)
        if (vis <= 0.01) continue
        let prev = null
        for (let j = 0; j <= N; j++) {
          const t = j / N, ang = t * Math.PI / 2
          const k = Math.cos(ang), z = G.spring + (G.apex - G.spring) * Math.sin(ang)
          const q = c.p(r.sx * k, r.sy * k, z)
          if (!q) { prev = null; continue }
          if (prev) {
            let a = A * vis * (r.major ? 1 : 0.6)
            if (center && S.tilt < 1) {
              const dx = (q[0] + prev[0]) / 2 - center[0], dy = (q[1] + prev[1]) / 2 - center[1]
              a *= mix(sstep(ringPx * 1.02, ringPx * 1.55, Math.hypot(dx, dy)), 1, S.tilt)
            }
            if (a > 0.005) {
              const w = Math.max(1, Math.min(46, (r.major ? 0.16 : 0.1) * (q[3] + prev[3]) * 0.5))
              ctx.globalAlpha = a * 0.9
              ctx.strokeStyle = rgb(o.ribTone[0], o.ribTone[1], o.ribTone[2])
              ctx.lineWidth = w
              ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke()
              // 钻石肋线的冷光
              const m = Lt.power * Lt.flick / (1 + ((r.sx * k - Lt.x) ** 2 + (r.sy * k - Lt.y) ** 2 + (z - Lt.z) ** 2) / (Lt.range * Lt.range * 2.2))
              ctx.globalAlpha = a * (0.1 + Math.min(0.5, m * 0.55))
              ctx.strokeStyle = rgb(o.glint[0] * 0.55, o.glint[1] * 0.55, o.glint[2] * 0.6)
              ctx.lineWidth = Math.max(0.6, w * 0.16)
              ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke()
            }
          }
          prev = q
        }
        // 闪点
        ctx.globalCompositeOperation = 'lighter'
        for (let gi = 0; gi < r.glints.length; gi++) {
          const t = r.glints[gi], ang = t * Math.PI / 2
          const k = Math.cos(ang), z = G.spring + (G.apex - G.spring) * Math.sin(ang)
          const q = c.p(r.sx * k, r.sy * k, z)
          if (!q) continue
          let a = A * vis
          if (center && S.tilt < 1) a *= mix(sstep(ringPx * 1.05, ringPx * 1.7, Math.hypot(q[0] - center[0], q[1] - center[1])), 1, S.tilt)
          const tw = Math.pow(Math.max(0, Math.sin(r.ph + gi * 2.1 + Lt.x * 0.9 - Lt.y * 0.7 + S.time * 0.6)), 14)
          if (tw * a < 0.02) continue
          drawGlow(ctx, glowSprite(o.glint[0], o.glint[1], o.glint[2], true), q[0], q[1], Math.min(26, 0.07 * q[3]), tw * a)
        }
        ctx.globalCompositeOperation = 'source-over'
      }
      ctx.globalAlpha = 1
    }

/*__R3__*/
    return S
  }

/*__RENDERER__*/
})()
