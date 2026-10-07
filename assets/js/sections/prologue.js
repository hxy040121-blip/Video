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
     中央悬一盏直径 2.4 m 的无色水晶灯；西侧沉香侧案；
     东侧收纳台 x 7.45–8.10、y −4.0–−1.6，台面 1.05，钥匙龛离地 1.12–1.76（上排 1–8，下排 9–15），
     其南侧墙面嵌价目铜牌。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const TAU = Math.PI * 2
  const HAS_FILTER = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype

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
  const hex = h => U.hexToRgb(h || '#c29a5b')
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

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

  /* =====================================================================
     发光贴图（预渲染，加色混合）
     ===================================================================== */
  const spriteCache = {}
  function glowSprite(r, g, b, hard) {
    r |= 0; g |= 0; b |= 0
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

  // 长方体：角点 i = x位 + 2·y位 + 4·z位；六个面 [角点序, 法线]
  const BOX_FACES = [
    [[4, 5, 7, 6], [0, 0, 1]],
    [[0, 1, 3, 2], [0, 0, -1]],
    [[0, 1, 5, 4], [0, -1, 0]],
    [[2, 3, 7, 6], [0, 1, 0]],
    [[0, 2, 6, 4], [-1, 0, 0]],
    [[1, 3, 7, 5], [1, 0, 0]],
  ]
  const RING = Array.from({ length: 10 }, (_, i) => [Math.cos(i / 10 * TAU), Math.sin(i / 10 * TAU)])

  // 材质（反照率）
  const EBONY = [0.07, 0.052, 0.046]
  const SILK = [0.07, 0.085, 0.2]
  const SEAT_FACE = [SILK, null, null, null, null, null]
  const BACK_FACE = [null, null, null, SILK, null, null]

  /* =====================================================================
     App.domeHall.create(opts)：议事厅渲染器
     opts.canvas（必需）、opts.ribCanvas（穹顶肋拱层，可选，CSS 模糊做景深）
     返回场景对象 S：S.seats[0..14]、S.light、S.view、S.update(dt)、S.render()、S.resize()、
     S.setPeople(ids)、S.pick(x, y)、S.seatScreen(k)
     ===================================================================== */
  function createHall(opts) {
    const o = Object.assign({
      lightCol: [255, 204, 154],   // 光（光标）的颜色：烛光
      amb: 0.07,                   // 穹顶散下的环境光
      ambCol: [140, 134, 150],
      floorAlb: [0.72, 0.68, 0.61],// 月白翡翠
      discAlb: [0.2, 0.19, 0.18],  // 墨玉（抛光）
      jadeAlb: [0.3, 0.4, 0.37],   // 青白玉
      num: [214, 172, 102],        // 编号：黄铜
      numDim: [111, 85, 50],
      numOut: [150, 28, 28],       // 熄灭：锈红
      lampCol: [226, 180, 112],    // 席位小光池
      beamCol: [235, 227, 214],    // 穹顶顶端落下的一束光
      ribTone: [5, 6, 11],
      glint: [190, 205, 255],
      rim: [222, 176, 108],        // 黑影的黄铜轮廓光
      silhouette: [9, 8, 8],
      motes: 70,
    }, opts)

    const S = {
      o, cam: new Camera(),
      W: 1, H: 1, dpr: 1,
      canvas: o.canvas, ctx: o.canvas.getContext('2d'),
      ribCanvas: o.ribCanvas || null, rctx: o.ribCanvas ? o.ribCanvas.getContext('2d') : null,
      sh: document.createElement('canvas'), sh2: document.createElement('canvas'), lensC: document.createElement('canvas'),
      seats: [],
      light: { x: 0, y: 0, z: 5.6, power: 1.1, range: 3, flick: 1 },
      home: { x: 0, y: 0, z: 5.6 },
      lampZ: 2.4, lampPow: 2.5, homePow: 1.5, lampRange: 3.5, homeRange: 4.2,
      ptr: { x: 0, y: 0, on: false },
      view: { elev: Math.PI / 2, yaw: 0, dist: 10.6, tx: 0, ty: 0, tz: 0.45, fk: 1, ox: 0, oy: 0 },
      dark: 0,          // 全局沉入黑暗 0–1
      ribA: 1,          // 肋拱
      numA: 1,          // 编号
      eyeA: 1,          // 眼睛
      wallA: 1,         // 墙与陈设
      poolA: 1,         // 光标光池
      glowA: 1,         // 光源自身的光晕
      floorA: 1,
      chandA: 1,        // 水晶灯
      lensA: 0, lensOpen: 1, lensW: 0.62, lensH: 0.6, // 杏仁形眼眶
      beam: { k: -1, amt: 0 },
      time: 0,
      motes: [],
      fit: 0.36,        // 正俯视时椅环半径占短边的比例
      numScale: 1,
      hoverK: -1, keyGone: -1, clock: 17 * 60,
      eyeQ: [], tilt: 0, ls: null, eyeScale: 1, gust: 0, eyePulse: 1, ripples: [],
    }
    S.sx = S.sh.getContext('2d')
    S.sx2 = S.sh2.getContext('2d')

    // 局部（椅子坐标 u 右、v 前、z 上）→ 世界
    const L2W = (s, u, v, z) => [s.x + u * s.rx + v * s.fx, s.y + u * s.ry + v * s.fy, z]
    function mkBox(s, u0, u1, v0, v1, z0, z1) {
      const P = []
      for (let i = 0; i < 8; i++) {
        const u = i & 1 ? u1 : u0, v = i & 2 ? v1 : v0, z = i & 4 ? z1 : z0
        P.push(s ? L2W(s, u, v, z) : [u, v, z])
      }
      const N = BOX_FACES.map(f => { const n = f[1]; return s ? [n[0] * s.rx + n[1] * s.fx, n[0] * s.ry + n[1] * s.fy, n[2]] : n })
      return { P, N }
    }

    const srnd = U.seeded(9157)
    for (let k = 1; k <= G.n; k++) {
      const a = (k - 1) * TAU / G.n
      const sa = Math.sin(a), ca = Math.cos(a)
      const s = {
        k, a, x: sa * G.seatR, y: ca * G.seatR,
        fx: -sa, fy: -ca,           // 面朝桌心
        rx: -ca, ry: sa,            // 右手方向
        id: null, acc: [194, 154, 91], hair: 0, long: false,
        awake: 0, eyes: 0, flash: 0, lit: 0, lamp: 0, out: 0, fall: 0, gone: 0, hover: 0,
        yaw: 0, blink: 1, blinkT: 0, nextBlink: 2 + srnd() * 5,
        droop: (srnd() - 0.5) * 0.9, sway: srnd() * TAU, lag: 0.02 + srnd() * 0.05,
        tuft: [0, 1, 2, 3, 4, 5, 6].map(() => srnd() * srnd() * 0.32),
        K: null,
      }
      // 乌木扶手椅（静止，预先算好世界坐标）
      s.legs = [[-0.29, -0.24, -0.33, -0.28], [0.24, 0.29, -0.33, -0.28], [-0.29, -0.24, 0.22, 0.27], [0.24, 0.29, 0.22, 0.27]]
        .map(b => mkBox(s, b[0], b[1], b[2], b[3], 0, 0.41))
      s.seatB = mkBox(s, -0.29, 0.29, -0.28, 0.28, 0.4, 0.47)
      s.backB = mkBox(s, -0.31, 0.31, -0.35, -0.27, 0.44, 1.13)
      s.arms = [
        mkBox(s, -0.325, -0.285, 0.21, 0.25, 0.47, 0.66), mkBox(s, 0.285, 0.325, 0.21, 0.25, 0.47, 0.66),
        mkBox(s, -0.335, -0.275, -0.27, 0.27, 0.66, 0.71), mkBox(s, 0.275, 0.335, -0.27, 0.27, 0.66, 0.71),
      ]
      // 投影用的轮廓点：椅背顶、扶手前端、座面、椅脚落地处
      s.shPts = [
        L2W(s, -0.31, -0.35, 1.13), L2W(s, 0.31, -0.35, 1.13), L2W(s, -0.31, -0.27, 1.13), L2W(s, 0.31, -0.27, 1.13),
        L2W(s, -0.335, 0.27, 0.71), L2W(s, 0.335, 0.27, 0.71), L2W(s, -0.29, 0.28, 0.45), L2W(s, 0.29, 0.28, 0.45),
        L2W(s, -0.29, -0.33, 0), L2W(s, 0.29, -0.33, 0), L2W(s, -0.29, 0.27, 0), L2W(s, 0.29, 0.27, 0),
      ]
      s.shTop = s.shPts.slice(0, 4).concat([L2W(s, -0.31, -0.31, 0.8), L2W(s, 0.31, -0.31, 0.8)])
      S.seats.push(s)
    }

    // 陈设（世界坐标长方体）
    const FURN = [
      { B: mkBox(null, COUNTER.x0, COUNTER.x1, COUNTER.y0, COUNTER.y1, 0, COUNTER.top), alb: [0.08, 0.06, 0.05], spec: 0.6 },   // 东：钥匙与金币收纳台
      { B: mkBox(null, -8.15, -7.6, -1.2, 1.2, 0, 0.95), alb: [0.16, 0.1, 0.06], spec: 0.35 },                                 // 西：沉香侧案
      { B: mkBox(null, -4.6, -2.4, 6.35, 6.9, 0, 0.8), alb: [0.09, 0.07, 0.06], spec: 0.4, glass: mkBox(null, -4.6, -2.4, 6.35, 6.9, 0.8, 1.25), item: [232, 190, 96] }, // 西柜：皇冠
      { B: mkBox(null, 2.4, 4.6, 6.35, 6.9, 0, 0.8), alb: [0.09, 0.07, 0.06], spec: 0.4, glass: mkBox(null, 2.4, 4.6, 6.35, 6.9, 0.8, 1.25), item: [150, 200, 160] },   // 东柜：玉琮
    ]

    // 落座：ids 长度 15，元素为角色 id 或 null
    S.setPerson = (k, id) => {
      const s = S.seats[k - 1]
      if (!s) return
      s.id = id || null
      const c = id ? App.char(id) : null
      s.acc = c && c.art && c.art.accent ? hex(c.art.accent) : [194, 154, 91]
      // 太暗的签名色在黑暗里看不见：提亮
      const lmax = Math.max(s.acc[0], s.acc[1], s.acc[2])
      if (lmax < 150) { const f = 150 / Math.max(1, lmax); s.acc = s.acc.map(v => Math.min(255, v * f + 20)) }
      s.long = !!(c && (/long|ponytail|braid|flowing|waist-length|shoulder-length/i.test(String(c.art && c.art.hair))))
      s.hair = c ? (/spik|wild|messy|shaggy|mane|untamed/i.test(String(c.art && c.art.hair)) ? 1 : 0) : 0
    }
    S.setPeople = ids => { for (const s of S.seats) S.setPerson(s.k, ids[s.k - 1]) }

    S.resize = () => {
      const r = S.canvas.parentNode.getBoundingClientRect()
      const W = Math.max(2, Math.round(r.width)), H = Math.max(2, Math.round(r.height))
      let dpr = Math.min(window.devicePixelRatio || 1, 2)
      const budget = App.isMobile() ? 2.2e6 : 4.4e6
      if (W * H * dpr * dpr > budget) dpr = Math.sqrt(budget / (W * H))
      S.W = W; S.H = H; S.dpr = dpr
      for (const c of [S.canvas, S.ribCanvas]) {
        if (!c) continue
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr)
        c.style.width = W + 'px'; c.style.height = H + 'px'
      }
      S.sh.width = S.sh2.width = Math.ceil(W / 2)
      S.sh.height = S.sh2.height = Math.ceil(H / 2)
      S.cam.W = W; S.cam.H = H
    }

    // 某点、某法线处的照度 → [r, g, b] 乘子（0–~2）
    function lum(px, py, pz, nx, ny, nz, extra) {
      const L = S.light, lc = o.lightCol
      const dx = L.x - px, dy = L.y - py, dz = L.z - pz
      const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2) || 1
      const lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / d)
      const e = L.power * L.flick * lam / (1 + d2 / (L.range * L.range)) * S.poolA
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
        const k = Math.pow(nh, 28) * spec * L.power * L.flick * S.poolA / (1 + (ll * ll) / (L.range * L.range))
        r += o.lightCol[0] * k; g += o.lightCol[1] * k; b += o.lightCol[2] * k
      }
      return rgb(r, g, b)
    }
    // 某点受到的直射光强度（不计法线）
    function irr(px, py, pz) {
      const L = S.light
      const d2 = (L.x - px) ** 2 + (L.y - py) ** 2 + (L.z - pz) ** 2
      return L.power * L.flick * S.poolA / (1 + d2 / (L.range * L.range))
    }
    // 席位附加的顶光（小光池 / 穹顶一束光）
    function seatExtra(s) {
      let amt = s.lamp * 0.8, col = o.lampCol
      if (S.beam.k === s.k - 1 && S.beam.amt > 0) { amt += S.beam.amt * 1.1; col = o.beamCol }
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
    const TOP = circle(0, 0, G.tableH, G.tableR, 120)
    const TOP_LO = circle(0, 0, G.tableH - 0.05, G.tableR - 0.01, 60)
    const DRUM_T = circle(0, 0, G.tableH - 0.05, G.drumR, 36), DRUM_B = circle(0, 0, 0, G.drumR * 1.05, 36)
    const RINGS = [2.2, 1.02, 0.3].map(r => circle(0, 0, G.tableH + 0.001, r, 90))
    const DISC = circle(0, 0, 0.002, G.disc, 112)
    const FLOOR = [[-G.hx, -G.hy, 0], [G.hx, -G.hy, 0], [G.hx, G.hy, 0], [-G.hx, G.hy, 0]]

    function hullScreen(pts3) {
      const q = []
      for (const p of pts3) { const s = S.cam.p(p[0], p[1], p[2]); if (s) q.push([s[0], s[1]]) }
      return q.length > 2 ? hull(q) : null
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
      RIBS.push({ a, sx: w[0], sy: w[1], major: i % 2 === 0, glints: g, ph: rnd() * TAU, side: 1 })
    }
    const SCREENS = []
    for (let k = 0; k < 15; k++) {
      const a = (k / 15) * TAU, w = wallHit(a)
      const onX = Math.abs(Math.abs(w[0]) - G.hx) < 1e-3 // 东西墙
      SCREENS.push({ x: w[0], y: w[1], ax: onX ? [0, 1] : [1, 0], n: onX ? [-Math.sign(w[0]), 0] : [0, -Math.sign(w[1])] })
    }
    // 水晶灯：三圈垂饰
    const CHAND = []
    for (const [r, z, n] of [[1.2, 5.25, 44], [0.86, 5.5, 32], [0.5, 5.75, 20]]) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r
        CHAND.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: z - 0.08 - (i % 3) * 0.05, ph: rnd() * TAU, r })
      }
    }

    function drawWalls(ctx) {
      // 墙面本身始终是一层墨色（挡住身后的烟雾，免得四壁淡出时露出一道地平线）；墙上的光与细节随 wallA 淡出
      const c = S.cam, Lt = S.light, Af = 1 - S.dark * 0.9, A = S.wallA * Af
      if (Af <= 0.01) return
      const C = c.pos
      ctx.save()
      for (const w of WALLS) {
        // 面向镜头才画（镜头在墙外时剔除）
        if ((C[0] - w.a[0]) * w.n[0] + (C[1] - w.a[1]) * w.n[1] <= 0) continue
        const q = c.poly([[w.a[0], w.a[1], 0], [w.b[0], w.b[1], 0], [w.b[0], w.b[1], G.spring], [w.a[0], w.a[1], G.spring]])
        if (!q) continue
        ctx.globalAlpha = Af
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
      const near = (x, y, z) => { const d2 = (x - Lt.x) ** 2 + (y - Lt.y) ** 2 + (z - Lt.z) ** 2; return Lt.power * Lt.flick * S.poolA / (1 + d2 / (Lt.range * Lt.range * 1.6)) }
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
        const m = Math.min(1, near(s.x, s.y, 1.8) * 0.55)
        ctx.globalAlpha = A
        pathPts(ctx, q)
        // 暗色真丝：上暗下亮的一层光泽，偏暖，不是蓝色色块
        const top = c.p(s.x, s.y, 3.9), bot = c.p(s.x, s.y, 0.55)
        if (top && bot) {
          const g = ctx.createLinearGradient(top[0], top[1], bot[0], bot[1])
          g.addColorStop(0, rgb(10, 9, 13))
          g.addColorStop(0.55, rgb(13 + 34 * m, 12 + 26 * m, 18 + 22 * m))
          g.addColorStop(1, rgb(11 + 18 * m, 10 + 13 * m, 14 + 10 * m))
          ctx.fillStyle = g
        } else ctx.fillStyle = rgb(13 + 30 * m, 12 + 22 * m, 18 + 20 * m)
        ctx.fill()
        ctx.globalAlpha = A * (0.22 + 0.5 * m)
        ctx.strokeStyle = rgb(150, 118, 70)
        ctx.lineWidth = 1
        ctx.stroke()
        // 织纹：两道极细的竖线
        if (top && bot && Math.abs(top[1] - bot[1]) > 30) {
          ctx.globalAlpha = A * (0.06 + 0.22 * m)
          ctx.beginPath()
          for (const f of [-0.33, 0.33]) {
            const a = c.p(s.x + s.ax[0] * hw * f, s.y + s.ax[1] * hw * f, 3.75), b = c.p(s.x + s.ax[0] * hw * f, s.y + s.ax[1] * hw * f, 0.7)
            if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) }
          }
          ctx.stroke()
        }
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
            ctx.beginPath(); ctx.ellipse(cc[0], cc[1], r, r * Math.max(0.25, 1 - S.tilt * 0.1), 0, 0, TAU); ctx.fill(); ctx.stroke()
            const mins = S.clock || 17 * 60
            const ha = ((mins / 60) % 12) / 12 * TAU, ma = (mins % 60) / 60 * TAU
            ctx.beginPath()
            ctx.moveTo(cc[0], cc[1]); ctx.lineTo(cc[0] + Math.sin(ha) * r * 0.5, cc[1] - Math.cos(ha) * r * 0.5)
            ctx.moveTo(cc[0], cc[1]); ctx.lineTo(cc[0] + Math.sin(ma) * r * 0.78, cc[1] - Math.cos(ma) * r * 0.78)
            ctx.stroke()
          }
        }
      }
      // 东墙：钥匙龛（十五把编号钥匙）与价目铜牌
      if (C[0] < G.hx - 0.05) {
        const wx = G.hx - 0.02
        const pl = c.poly([[wx, -6.0, 1.05], [wx, -4.7, 1.05], [wx, -4.7, 2.55], [wx, -6.0, 2.55]])
        if (pl) {
          ctx.globalAlpha = A
          pathPts(ctx, pl)
          ctx.fillStyle = shade([0.22, 0.16, 0.08], wx, -5.35, 1.8, -1, 0, 0, null, 1.6)
          ctx.fill()
          ctx.strokeStyle = rgb(150, 116, 64)
          ctx.globalAlpha = A * (0.35 + Math.min(0.5, irr(wx, -5.35, 1.8)))
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.globalAlpha = A * (0.18 + Math.min(0.4, irr(wx, -5.35, 1.8) * 0.6))
          for (let i = 1; i < 10; i++) {
            const z = 2.45 - i * 0.13
            const a = c.p(wx, -5.9, z), b = c.p(wx, -4.85 - ((i * 7) % 4) * 0.12, z)
            if (a && b) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke() }
          }
        }
        for (let i = 0; i < 15; i++) {
          if (i === S.keyGone) continue
          const row = i < 8 ? 0 : 1, col = row ? i - 8 : i
          const y = -3.62 + col * 0.24 + row * 0.12, z = row ? 1.3 : 1.66
          const a = c.p(wx - 0.02, y, z), b = c.p(wx - 0.02, y, z - 0.13)
          if (!a || !b) continue
          const m = irr(wx, y, z)
          ctx.globalAlpha = A * (0.35 + Math.min(0.65, m))
          ctx.strokeStyle = rgb(150 + 90 * m, 112 + 70 * m, 60 + 40 * m)
          ctx.lineWidth = Math.max(0.8, 0.018 * a[3])
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
          ctx.beginPath(); ctx.arc(a[0], a[1], Math.max(1, 0.025 * a[3]), 0, TAU); ctx.stroke()
        }
      }
      ctx.restore()
    }

    /* ---------- 地面：月白翡翠 + 墨玉圆盘 ---------- */
    function drawFloor(ctx) {
      const c = S.cam, Lt = S.light
      const fl = c.poly(FLOOR)
      if (!fl) return
      const fa = S.floorA
      const amb = o.amb
      ctx.save()
      pathPts(ctx, fl)
      ctx.clip()
      ctx.globalAlpha = fa
      ctx.fillStyle = rgb(o.floorAlb[0] * o.ambCol[0] * amb * 0.5, o.floorAlb[1] * o.ambCol[1] * amb * 0.5, o.floorAlb[2] * o.ambCol[2] * amb * 0.5)
      ctx.fillRect(0, 0, S.W, S.H)
      ctx.globalCompositeOperation = 'lighter'
      // 穹顶散下的一层极淡的光，中央略亮
      pool(ctx, [0, 0, 0], [1, 0, 0], [0, 1, 0], 7.2, 1, 7.5, o.ambCol, o.floorAlb, 11, amb * 0.9 * fa)
      // 光标
      pool(ctx, [Lt.x, Lt.y, 0], [1, 0, 0], [0, 1, 0], Lt.z, Lt.power * Lt.flick, Lt.range, o.lightCol, o.floorAlb, 12, S.poolA * fa)
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      // 墨玉圆盘
      const dp = c.poly(DISC)
      if (!dp) return
      ctx.save()
      pathPts(ctx, dp)
      ctx.clip()
      ctx.globalAlpha = fa
      ctx.fillStyle = rgb(o.discAlb[0] * o.ambCol[0] * amb * 0.6, o.discAlb[1] * o.ambCol[1] * amb * 0.6, o.discAlb[2] * o.ambCol[2] * amb * 0.6)
      ctx.fillRect(0, 0, S.W, S.H)
      ctx.globalCompositeOperation = 'lighter'
      pool(ctx, [Lt.x, Lt.y, 0], [1, 0, 0], [0, 1, 0], Lt.z, Lt.power * Lt.flick, Lt.range, o.lightCol, o.discAlb, 12, S.poolA * fa)
      // 墨玉里的放射纹（极淡，像虹膜）
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
        ctx.globalAlpha = fa * (0.02 + e * 0.1 + o.amb * 0.12)
        ctx.strokeStyle = rgb(lc[0], lc[1] * 0.92, lc[2] * 0.85)
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke()
      }
      // 席位小光池 / 一束光（落在墨玉上）
      for (const s of S.seats) {
        const ex = seatExtra(s)
        if (!ex) continue
        const beam = S.beam.k === s.k - 1
        pool(ctx, [s.x + s.fx * 0.05, s.y + s.fy * 0.05, 0], [1, 0, 0], [0, 1, 0], beam ? 2.2 : 1.3, ex.amt * (beam ? 1.6 : 1.3), beam ? 1.4 : 1.0, ex.col, [0.5, 0.47, 0.43], beam ? 3 : 2, fa)
      }
      ctx.globalCompositeOperation = 'source-over'
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

    /* ---------- 影子：点光源把物体投到平面 z=h 上 ---------- */
    function proj(P, h, out) {
      const L = S.light
      let dz = L.z - P[2]
      if (dz < 0.06) dz = 0.06
      const k = Math.min(16, (L.z - h) / dz)
      out.push([L.x + (P[0] - L.x) * k, L.y + (P[1] - L.y) * k])
    }
    function sphereProj(P, r, h, out) {
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU
        proj([P[0] + Math.cos(a) * r, P[1] + Math.sin(a) * r, P[2]], h, out)
      }
      proj([P[0], P[1], P[2] + r], h, out)
    }
    function personShadow(K, h, polys) {
      if (!K || K.A < 0.35) return
      const body = []
      for (const P of [K.pel, K.chest]) if (P[2] > h) sphereProj(P, 0.16, h, body)
      for (const P of [K.shL, K.shR, K.kneeL, K.kneeR]) if (P[2] > h) sphereProj(P, 0.07, h, body)
      if (h <= 0) { proj(K.footL, h, body); proj(K.footR, h, body) }
      if (body.length > 2) polys.push(hull(body))
      const head = []
      sphereProj(K.head, 0.11, h, head)
      if (K.neck[2] > h) sphereProj(K.neck, 0.05, h, head)
      if (head.length > 2) polys.push(hull(head))
    }
    function shadowPass(ctx, h, polys, alpha, blur) {
      if (alpha <= 0.01 || !polys.length) return
      const sc = S.sx, w = S.sh.width, hh = S.sh.height, q = w / S.W
      sc.setTransform(1, 0, 0, 1, 0, 0)
      sc.clearRect(0, 0, w, hh)
      sc.setTransform(q, 0, 0, q, 0, 0)
      sc.fillStyle = '#000'
      for (const poly of polys) {
        if (!poly || poly.length < 3) continue
        const pts = S.cam.poly(poly.map(p => [p[0], p[1], h]))
        if (pts) { pathPts(sc, pts); sc.fill() }
      }
      const s2 = S.sx2
      s2.setTransform(1, 0, 0, 1, 0, 0)
      s2.clearRect(0, 0, w, hh)
      if (HAS_FILTER) { s2.filter = 'blur(' + blur.toFixed(1) + 'px)'; s2.drawImage(S.sh, 0, 0); s2.filter = 'none' } else s2.drawImage(S.sh, 0, 0)
      ctx.globalAlpha = alpha
      ctx.drawImage(S.sh2, 0, 0, S.W, S.H)
      ctx.globalAlpha = 1
    }
    function shadowAlpha() {
      const L = S.light
      return 0.86 * clamp01(L.power * L.flick * S.poolA) * S.floorA * sstep(0, 1, 2.5 / Math.max(2.5, L.z - 1.2))
    }
    function drawFloorShadows(ctx) {
      const L = S.light, polys = []
      // 圆桌：桌面圆投成圆
      const k0 = L.z / Math.max(0.06, L.z - G.tableH)
      const tc = []
      for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; tc.push([L.x + (Math.cos(a) * G.tableR - L.x) * k0, L.y + (Math.sin(a) * G.tableR - L.y) * k0]) }
      polys.push(tc)
      for (const s of S.seats) {
        const pts = []
        for (const P of s.shPts) proj(P, 0, pts)
        polys.push(hull(pts))
        personShadow(s.K, 0, polys)
      }
      for (const f of FURN) {
        const pts = []
        for (const P of f.B.P) proj(P, 0, pts)
        if (f.glass) for (let i = 4; i < 8; i++) proj(f.glass.P[i], 0, pts)
        polys.push(hull(pts))
      }
      const fl = S.cam.poly(FLOOR)
      if (!fl) return
      ctx.save()
      pathPts(ctx, fl)
      ctx.clip()
      shadowPass(ctx, 0, polys, shadowAlpha(), 1.7)
      ctx.restore()
    }

    /* ---------- 席位脚下的涟漪（醒来 / 熄灭的一拍） ---------- */
    S.ripple = (k, col, inward) => { S.ripples.push({ k, t: 0, col: col || [214, 172, 102], inward: !!inward }) }
    function drawRipples(ctx, dt) {
      if (!S.ripples.length) return
      ctx.lineWidth = 1
      for (let i = S.ripples.length - 1; i >= 0; i--) {
        const r = S.ripples[i]
        r.t += dt / 1.6
        if (r.t >= 1) { S.ripples.splice(i, 1); continue }
        const s = S.seats[r.k - 1]
        const e = 1 - Math.pow(1 - r.t, 3)
        const rad = r.inward ? mix(1.6, 0.35, e) : mix(0.35, 1.9, e)
        const q = S.cam.poly(circle(s.x, s.y, 0.012, rad, 48))
        if (!q) continue
        ctx.globalAlpha = (1 - r.t) * (r.inward ? 0.5 : 0.65) * S.floorA * (1 - S.dark)
        ctx.strokeStyle = rgb(r.col[0], r.col[1], r.col[2])
        pathPts(ctx, q); ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    /* ---------- 圆桌 ---------- */
    function drawTable(ctx) {
      const c = S.cam, Lt = S.light, C = c.pos
      const hn = norm3(C[0], C[1], 0)
      ctx.globalAlpha = S.floorA
      if (S.tilt > 0.02) {
        // 老紫檀鼓形木座
        const d = hullScreen(DRUM_T.concat(DRUM_B))
        if (d) {
          pathPts(ctx, d)
          ctx.fillStyle = shade([0.17, 0.075, 0.05], hn[0] * G.drumR, hn[1] * G.drumR, 0.4, hn[0], hn[1], 0, null, 0.6)
          ctx.fill()
        }
        // 桌沿（4 cm 厚的玉）
        const e = hullScreen(TOP.concat(TOP_LO))
        if (e) {
          pathPts(ctx, e)
          ctx.fillStyle = shade([0.4, 0.46, 0.42], hn[0] * G.tableR, hn[1] * G.tableR, G.tableH - 0.02, hn[0], hn[1], 0.2, null, 1.2)
          ctx.fill()
        }
      }
      const top = c.poly(TOP)
      if (!top) return
      const a = o.amb
      ctx.save()
      pathPts(ctx, top)
      ctx.fillStyle = rgb(o.jadeAlb[0] * o.ambCol[0] * a * 0.9, o.jadeAlb[1] * o.ambCol[1] * a * 0.9, o.jadeAlb[2] * o.ambCol[2] * a * 0.9)
      ctx.fill()
      ctx.clip()
      ctx.globalCompositeOperation = 'lighter'
      const dp = Math.max(0.08, Lt.z - G.tableH)
      pool(ctx, [Lt.x, Lt.y, G.tableH], [1, 0, 0], [0, 1, 0], dp, Lt.power * Lt.flick, Lt.range, o.lightCol, o.jadeAlb, 7, S.poolA * S.floorA)
      // 玉的通透：更宽更淡的一层
      pool(ctx, [Lt.x * 0.85, Lt.y * 0.85, G.tableH], [1, 0, 0], [0, 1, 0], dp + 1.4, Lt.power * Lt.flick * 0.45, Lt.range * 1.5, o.lightCol, [0.08, 0.16, 0.13], 6, S.poolA * S.floorA)
      // 席位小光池照到桌沿
      for (const s of S.seats) {
        const ex = seatExtra(s)
        if (!ex) continue
        pool(ctx, [s.x * 0.8, s.y * 0.8, G.tableH], [1, 0, 0], [0, 1, 0], 0.9, ex.amt * 0.6, 0.9, ex.col, o.jadeAlb, 1.3, S.floorA)
      }
      // 玉纹
      ctx.lineCap = 'round'
      for (const v of JADE_VEINS) {
        const m = irr(v.pts[3][0], v.pts[3][1], G.tableH)
        ctx.globalAlpha = S.floorA * v.a * 0.7 * (0.25 + Math.min(1.6, m * 1.3))
        ctx.strokeStyle = rgb(190, 222, 205)
        const q = []
        for (const pt of v.pts) { const p = c.p(pt[0], pt[1], G.tableH + 0.001); if (p) q.push(p) }
        if (q.length < 3) continue
        ctx.lineWidth = Math.max(0.5, v.w * 0.7 * q[0][3])
        ctx.beginPath()
        ctx.moveTo(q[0][0], q[0][1])
        for (let i = 1; i < q.length - 1; i++) ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2)
        ctx.lineTo(q[q.length - 1][0], q[q.length - 1][1])
        ctx.stroke()
      }
      // 内圈的细铜线（像虹膜的环）
      for (let i = 0; i < RINGS.length; i++) {
        const q = c.poly(RINGS[i])
        if (!q) continue
        ctx.globalAlpha = S.floorA * (0.12 + 0.18 * Math.min(1, irr(0, 0, G.tableH)))
        ctx.strokeStyle = rgb(194, 154, 91)
        ctx.lineWidth = i === 0 ? 1.2 : 0.8
        pathPts(ctx, q); ctx.stroke()
      }
      // 十五道放射的铜嵌线（桌面像一只十五刻度的钟面）
      ctx.strokeStyle = rgb(194, 154, 91)
      for (const s of S.seats) {
        const sa = Math.sin(s.a), ca = Math.cos(s.a)
        const a = c.p(sa * 1.06, ca * 1.06, G.tableH + 0.001), b = c.p(sa * 2.16, ca * 2.16, G.tableH + 0.001)
        if (!a || !b) continue
        ctx.globalAlpha = S.floorA * (0.08 + 0.3 * Math.min(1, irr(sa * 1.6, ca * 1.6, G.tableH)) + s.hover * 0.4 + s.lit * 0.12)
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
        const sb = Math.sin(s.a + Math.PI / 15), cb = Math.cos(s.a + Math.PI / 15)
        const d = c.p(sb * 2.12, cb * 2.12, G.tableH + 0.001), e = c.p(sb * 2.2, cb * 2.2, G.tableH + 0.001)
        if (d && e) { ctx.globalAlpha *= 0.7; ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(e[0], e[1]); ctx.stroke() }
      }
      // 镜面高光（光源在抛光的玉面上的倒影）
      const m = mirror(G.tableH)
      if (m && m[0] * m[0] + m[1] * m[1] < G.tableR * G.tableR) {
        const pm = c.p(m[0], m[1], G.tableH)
        if (pm) {
          const k = Lt.power * Lt.flick * S.poolA * S.glowA
          drawGlow(ctx, glowSprite(o.lightCol[0], o.lightCol[1], o.lightCol[2]), pm[0], pm[1], 0.9 * pm[3], 0.35 * k)
          drawGlow(ctx, glowSprite(255, 244, 228, true), pm[0], pm[1], 0.14 * pm[3], 0.7 * k)
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      // 桌面上的影子（光在椅环之外时，人影会爬上桌面）
      const polys = []
      for (const s of S.seats) {
        const pts = []
        for (const P of s.shTop) proj(P, G.tableH, pts)
        polys.push(hull(pts))
        personShadow(s.K, G.tableH, polys)
      }
      shadowPass(ctx, G.tableH, polys, shadowAlpha() * 0.9, 1.3)
      ctx.restore()
      // 桌沿：一圈细线
      ctx.globalAlpha = S.floorA * (0.25 + 0.4 * Math.min(1, irr(Lt.x, Lt.y, G.tableH)))
      ctx.strokeStyle = rgb(170, 190, 178)
      ctx.lineWidth = 1
      pathPts(ctx, top); ctx.stroke()
      // 十五枚银号牌
      for (const s of S.seats) {
        const r0 = G.tableR - 0.09, sa = Math.sin(s.a), ca = Math.cos(s.a)
        const cx = sa * r0, cy = ca * r0, tx = ca * 0.075, ty = -sa * 0.075, nx = sa * 0.028, ny = ca * 0.028
        const q = c.poly([[cx - tx - nx, cy - ty - ny, G.tableH + 0.002], [cx + tx - nx, cy + ty - ny, G.tableH + 0.002], [cx + tx + nx, cy + ty + ny, G.tableH + 0.002], [cx - tx + nx, cy - ty + ny, G.tableH + 0.002]])
        if (!q) continue
        ctx.globalAlpha = S.floorA
        pathPts(ctx, q)
        ctx.fillStyle = shade([0.5, 0.52, 0.56], cx, cy, G.tableH, 0, 0, 1, seatExtra(s), 1)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    /* ---------- 长方体 ---------- */
    function drawBox(ctx, P, N, alb, spec, extra, faceAlb) {
      const C = S.cam.pos
      for (let f = 0; f < 6; f++) {
        const n = N[f], id = BOX_FACES[f][0]
        const a = P[id[0]], b = P[id[2]]
        const cx = (a[0] + b[0]) * 0.5, cy = (a[1] + b[1]) * 0.5, cz = (a[2] + b[2]) * 0.5
        if ((C[0] - cx) * n[0] + (C[1] - cy) * n[1] + (C[2] - cz) * n[2] <= 0) continue
        const q = S.cam.poly([P[id[0]], P[id[1]], P[id[2]], P[id[3]]])
        if (!q) continue
        const col = shade((faceAlb && faceAlb[f]) || alb, cx, cy, cz, n[0], n[1], n[2], extra, spec)
        pathPts(ctx, q)
        ctx.fillStyle = col
        ctx.fill()
        ctx.strokeStyle = col
        ctx.lineWidth = 0.6
        ctx.stroke()
      }
    }

    /* ---------- 黑影的黄铜轮廓光：凸包上朝向光源的边 ---------- */
    const rimBuckets = [[], [], []]
    function rimHull(ctx, pts, e, lw) {
      const ls = S.ls
      if (!ls || e < 0.02 || !pts || pts.length < 3) return
      let cx = 0, cy = 0
      for (const p of pts) { cx += p[0]; cy += p[1] }
      cx /= pts.length; cy /= pts.length
      for (const b of rimBuckets) b.length = 0
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length]
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
        let nx = b[1] - a[1], ny = a[0] - b[0]
        const nl = Math.hypot(nx, ny) || 1
        nx /= nl; ny /= nl
        if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny }
        let lx = ls[0] - mx, ly = ls[1] - my
        const ll = Math.hypot(lx, ly) || 1
        lx /= ll; ly /= ll
        const f = nx * lx + ny * ly
        if (f < 0.12) continue
        rimBuckets[f > 0.7 ? 2 : f > 0.4 ? 1 : 0].push(a, b)
      }
      const rc = o.rim
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      ctx.strokeStyle = rgb(rc[0], rc[1], rc[2])
      const base = ctx.globalAlpha
      for (let j = 0; j < 3; j++) {
        const L = rimBuckets[j]
        if (!L.length) continue
        ctx.globalAlpha = base * Math.min(1, e * [0.3, 0.62, 1][j])
        ctx.beginPath()
        for (let i = 0; i < L.length; i += 2) { ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[i + 1][0], L[i + 1][1]) }
        ctx.stroke()
      }
      ctx.globalAlpha = base
    }

    /* ---------- 人（坐在椅上的黑影） ---------- */
    function personKeys(s) {
      const A = s.id ? 1 - s.gone : 0
      if (A <= 0.01) return null
      const up = s.awake, fall = s.fall
      const br = Math.sin(S.time * 1.25 + s.sway) * 0.006 * (1 - fall)
      const sink = s.gone * 0.3
      let nu = s.droop * 0.05 * (1 - up), nv = mix(-0.08, -0.15, up), nz = mix(0.99, 1.06, up) + br - sink
      nu = mix(nu, s.droop * 0.1, fall); nv = mix(nv, 0.26, fall); nz = mix(nz, 0.9, fall)
      const yaw = s.yaw
      const hf = mix(0.1, 0.035, up), hz = mix(0.085, 0.165, up)
      let hu = nu + Math.sin(yaw) * hf + s.droop * 0.06 * (1 - up)
      let hv = nv + Math.cos(yaw) * hf
      let hh = nz + hz
      hu = mix(hu, s.droop * 0.2, fall); hv = mix(hv, 0.56, fall); hh = mix(hh, G.tableH + 0.1, fall)
      const tw = yaw * 0.28 * up
      const ru = Math.cos(tw), rv = -Math.sin(tw)
      const shz = nz - 0.04
      const K = {
        A,
        neck: L2W(s, nu, nv, nz),
        shL: L2W(s, nu - ru * 0.2, nv - rv * 0.2 - 0.01, shz), shR: L2W(s, nu + ru * 0.2, nv + rv * 0.2 - 0.01, shz),
        chest: L2W(s, nu * 0.6, mix(-0.11, 0.1, fall), mix(0.82, 0.72, fall) - sink),
        pel: L2W(s, 0, -0.06, 0.58 - sink * 0.5),
        kneeL: L2W(s, -0.11, 0.34, 0.58), kneeR: L2W(s, 0.11, 0.34, 0.58),
        hipL: L2W(s, -0.1, -0.02, 0.56), hipR: L2W(s, 0.1, -0.02, 0.56),
        elbL: L2W(s, mix(-0.29, nu - 0.24, fall), mix(-0.06, nv + 0.12, fall), mix(0.76, 0.82, fall)), elbR: L2W(s, mix(0.29, nu + 0.24, fall), mix(-0.06, nv + 0.12, fall), mix(0.76, 0.82, fall)),
        handL: L2W(s, mix(-0.3, -0.2, fall), mix(0.2, 0.5, fall), mix(0.74, G.tableH + 0.04, fall)), handR: L2W(s, mix(0.3, 0.2, fall), mix(0.2, 0.5, fall), mix(0.74, G.tableH + 0.04, fall)),
        footL: L2W(s, -0.12, 0.42, 0.05), footR: L2W(s, 0.12, 0.42, 0.05),
        head: L2W(s, hu, hv, hh),
      }
      const fu = Math.sin(yaw), fv = Math.cos(yaw)
      const pitch = mix(mix(-0.75, 0.04, up), -1.35, fall)
      const cp = Math.cos(pitch)
      K.fwd = [(fu * s.rx + fv * s.fx) * cp, (fu * s.ry + fv * s.fy) * cp, Math.sin(pitch)]
      K.right = [fv * s.rx - fu * s.fx, fv * s.ry - fu * s.fy, 0]
      const h = K.head, F = K.fwd, R = K.right
      K.eyeL = [h[0] + F[0] * 0.088 - R[0] * 0.042, h[1] + F[1] * 0.088 - R[1] * 0.042, h[2] + F[2] * 0.088 - 0.012]
      K.eyeR = [h[0] + F[0] * 0.088 + R[0] * 0.042, h[1] + F[1] * 0.088 + R[1] * 0.042, h[2] + F[2] * 0.088 - 0.012]
      return K
    }
    function sweep(out, P, r) {
      const p = S.cam.p(P[0], P[1], P[2])
      if (!p) return
      const rr = r * p[3]
      for (const d of RING) out.push([p[0] + d[0] * rr, p[1] + d[1] * rr])
    }
    function capsule(out, A, ra, B, rb) { sweep(out, A, ra); sweep(out, B, rb) }
    function drawPerson(ctx, s, ex) {
      const K = s.K
      if (!K) return
      const c = S.cam
      const e = irr(K.head[0], K.head[1], K.head[2]) + (ex ? ex.amt * 0.9 : 0)
      const sil = o.silhouette, lc = o.lightCol
      const fill = rgb(sil[0] + lc[0] * e * 0.02, sil[1] + lc[1] * e * 0.018, sil[2] + lc[2] * e * 0.016)
      const fillH = rgb(sil[0] + 7 + lc[0] * e * 0.03, sil[1] + 6 + lc[1] * e * 0.026, sil[2] + 6 + lc[2] * e * 0.022)
      const base = ctx.globalAlpha
      ctx.globalAlpha = base * K.A
      ctx.fillStyle = fill
      // 膝上的一团（两腿并拢）
      const lap = []
      sweep(lap, K.hipL, 0.085); sweep(lap, K.hipR, 0.085); sweep(lap, K.kneeL, 0.075); sweep(lap, K.kneeR, 0.075)
      if (S.tilt > 0.1) { sweep(lap, K.footL, 0.05); sweep(lap, K.footR, 0.05) }
      const lh = hull(lap)
      if (lh.length > 2) { pathPts(ctx, lh); ctx.fill(); rimHull(ctx, lh, e * 0.45, 0.9) }
      // 躯干：肩、胸、垂下的手肘（像披着斗篷的一团黑影）
      const body = []
      sweep(body, K.pel, 0.12); sweep(body, K.chest, 0.13); sweep(body, K.shL, 0.085); sweep(body, K.shR, 0.085)
      sweep(body, K.elbL, 0.05); sweep(body, K.elbR, 0.05)
      const bh = hull(body)
      if (bh.length > 2) {
        pathPts(ctx, bh); ctx.fill()
        rimHull(ctx, bh, e * 0.9, 1.1)
      }
      const hp = c.p(K.head[0], K.head[1], K.head[2])
      if (!hp) { ctx.globalAlpha = base; return }
      const R = 0.106 * hp[3]
      // 头与身体之间一圈暗影，让头在俯视里分得出来
      ctx.globalAlpha = base * K.A * 0.55
      ctx.fillStyle = '#000'
      ctx.beginPath(); ctx.arc(hp[0], hp[1], R * 1.32, 0, TAU); ctx.fill()
      ctx.globalAlpha = base * K.A
      // 长发：头后垂下的一片
      if (s.long) {
        const hb = []
        sweep(hb, K.head, 0.1)
        sweep(hb, [K.head[0] - K.fwd[0] * 0.08, K.head[1] - K.fwd[1] * 0.08, K.head[2] - 0.17], 0.09)
        const hh = hull(hb)
        pathPts(ctx, hh); ctx.fillStyle = fillH; ctx.fill()
        rimHull(ctx, hh, e, 1.1)
      }
      // 头
      const pts = []
      const n = s.hair ? 14 : 16
      const rot = s.sway
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + rot
        const rr = R * (s.hair ? (i % 2 ? 1.05 + s.tuft[i >> 1] : 0.96) : 1)
        pts.push([hp[0] + Math.cos(a) * rr, hp[1] + Math.sin(a) * rr])
      }
      pathPts(ctx, pts); ctx.fillStyle = fillH; ctx.fill()
      // 头部的轮廓光：朝向光源的一段弧
      if (S.ls && e > 0.02) {
        const ang = Math.atan2(S.ls[1] - hp[1], S.ls[0] - hp[0])
        const rc = o.rim
        ctx.strokeStyle = rgb(rc[0], rc[1], rc[2])
        ctx.lineCap = 'round'
        ctx.lineWidth = Math.max(1, R * 0.14)
        ctx.globalAlpha = base * K.A * Math.min(1, e * 1.2)
        ctx.beginPath(); ctx.arc(hp[0], hp[1], R * (s.hair ? 1.06 : 1), ang - 1.05, ang + 1.05); ctx.stroke()
      }
      ctx.globalAlpha = base
      queueEyes(s, K)
    }
    // 眼睛：放进最后一遍画（黑暗里也看得见）
    function queueEyes(s, K) {
      const open = s.eyes * s.blink
      if (open <= 0.01 && s.flash <= 0.01) return
      const c = S.cam, C = c.pos
      const tc = norm3(C[0] - K.head[0], C[1] - K.head[1], C[2] - K.head[2])
      const vis = sstep(-0.32, 0.18, K.fwd[0] * tc[0] + K.fwd[1] * tc[1] + K.fwd[2] * tc[2])
      if (vis <= 0.01) return
      const a = c.p(K.eyeL[0], K.eyeL[1], K.eyeL[2]), b = c.p(K.eyeR[0], K.eyeR[1], K.eyeR[2])
      if (!a || !b) return
      const rr = Math.min(5, Math.max(1.5, 0.026 * a[3])) * S.eyeScale // 镜头贴近时眼睛仍是两点寒光，不是两盏灯
      const rot = Math.atan2(b[1] - a[1], b[0] - a[0])
      const al = K.A * vis
      const sep = Math.hypot(b[0] - a[0], b[1] - a[1])
      S.eyeQ.push({ x: a[0], y: a[1], r: rr, rot, open, a: al, flash: s.flash, acc: s.acc, hov: s.hover, sep })
      S.eyeQ.push({ x: b[0], y: b[1], r: rr, rot, open, a: al, flash: s.flash, acc: s.acc, hov: s.hover, sep })
    }

    /* ---------- 椅背上的黄铜编号 ---------- */
    function drawNumber(ctx, s, ex) {
      const A = S.numA * S.floorA
      if (A <= 0.01) return
      const tau = sstep(0.3, 0.85, S.tilt)
      const sc = S.numScale
      const ov = mix(-0.35 - 0.11 * sc, -0.356, tau), oz = mix(1.135, 0.8, tau)
      const P0 = L2W(s, 0, ov, oz)
      const a2 = norm3(s.fx * (1 - tau), s.fy * (1 - tau), tau)
      const c = S.cam
      const p0 = c.p(P0[0], P0[1], P0[2])
      const p1 = c.p(P0[0] + s.rx * 0.01, P0[1] + s.ry * 0.01, P0[2])
      const p2 = c.p(P0[0] + a2[0] * 0.01, P0[1] + a2[1] * 0.01, P0[2] + a2[2] * 0.01)
      if (!p0 || !p1 || !p2) return
      const A1x = p1[0] - p0[0], A1y = p1[1] - p0[1], A2x = p2[0] - p0[0], A2y = p2[1] - p0[1]
      const det = -A1x * A2y + A2x * A1y
      if (det <= 0.0004) return // 背对镜头
      const e = irr(P0[0], P0[1], P0[2]) + (ex ? ex.amt : 0)
      const lit = s.lit, out = s.out, hov = s.hover
      const dim = o.numDim, nb = o.num, no = o.numOut
      let r = dim[0] * (0.35 + Math.min(1.1, e)), g = dim[1] * (0.35 + Math.min(1.1, e)), b = dim[2] * (0.35 + Math.min(1.1, e))
      r = mix(r, nb[0], lit); g = mix(g, nb[1], lit); b = mix(b, nb[2], lit)
      r = mix(r, no[0], out); g = mix(g, no[1], out); b = mix(b, no[2], out)
      r = mix(r, 245, hov * 0.8); g = mix(g, 236, hov * 0.8); b = mix(b, 220, hov * 0.8)
      const k = S.dpr
      ctx.save()
      ctx.setTransform(A1x * k, A1y * k, -A2x * k, -A2y * k, p0[0] * k, p0[1] * k)
      ctx.globalAlpha = A
      ctx.font = '700 ' + (15 * sc).toFixed(1) + 'px Cinzel, serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const glow = Math.max(lit * (1 - out) * 0.9, hov)
      if (glow > 0.02) {
        ctx.shadowColor = hov > 0.5 ? 'rgba(245,236,220,.9)' : 'rgba(226,178,96,.9)'
        ctx.shadowBlur = 10 * glow * k
      }
      ctx.fillStyle = rgb(r, g, b)
      ctx.fillText(U.roman(s.k), 0, 0)
      ctx.restore()
      ctx.setTransform(k, 0, 0, k, 0, 0)
    }

    function hoverRing(ctx, s) {
      const q = S.cam.poly(circle(s.x - s.fx * 0.02, s.y - s.fy * 0.02, 0.01, 0.62, 40))
      if (!q) return
      ctx.globalAlpha = s.hover * 0.55 * S.floorA
      ctx.strokeStyle = rgb(214, 172, 102)
      ctx.lineWidth = 1
      ctx.setLineDash([2, 5])
      pathPts(ctx, q); ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    function drawSeat(ctx, s) {
      const ex = seatExtra(s)
      const C = S.cam.pos
      const front = (C[0] - s.x) * s.fx + (C[1] - s.y) * s.fy > 0
      ctx.globalAlpha = S.floorA
      if (s.hover > 0.01) hoverRing(ctx, s)
      ctx.globalAlpha = S.floorA
      if (S.tilt > 0.05) for (const b of s.legs) drawBox(ctx, b.P, b.N, EBONY, 0.4, ex)
      drawBox(ctx, s.seatB.P, s.seatB.N, EBONY, 0.5, ex, SEAT_FACE)
      for (const b of s.arms) drawBox(ctx, b.P, b.N, EBONY, 0.45, ex)
      if (front) { drawBack(ctx, s, ex); drawPerson(ctx, s, ex) } else { drawPerson(ctx, s, ex); drawBack(ctx, s, ex) }
      ctx.globalAlpha = 1
    }
    function drawBack(ctx, s, ex) {
      drawBox(ctx, s.backB.P, s.backB.N, EBONY, 0.45, ex, BACK_FACE)
      const h = hullScreen(s.backB.P)
      if (h) rimHull(ctx, h, irr(s.x, s.y, 1) * 0.45 + (ex ? ex.amt * 0.3 : 0), 0.8)
      drawNumber(ctx, s, ex)
    }

    /* ---------- 陈设 ---------- */
    function drawFurniture(ctx) {
      const c = S.cam
      ctx.globalAlpha = S.floorA * S.wallA
      for (const f of FURN) {
        drawBox(ctx, f.B.P, f.B.N, f.alb, f.spec, null)
        if (f.glass) {
          // 水晶罩：只画棱
          const P = f.glass.P
          const m = irr((P[0][0] + P[7][0]) / 2, (P[0][1] + P[7][1]) / 2, 1)
          const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
          ctx.strokeStyle = rgb(170, 190, 220)
          ctx.lineWidth = 0.8
          ctx.globalAlpha = S.floorA * S.wallA * (0.12 + Math.min(0.5, m * 0.6))
          ctx.beginPath()
          for (const [i, j] of E) {
            const a = c.p(P[i][0], P[i][1], P[i][2]), b = c.p(P[j][0], P[j][1], P[j][2])
            if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]) }
          }
          ctx.stroke()
          const cp = c.p((P[0][0] + P[7][0]) / 2, (P[0][1] + P[7][1]) / 2, 0.95)
          if (cp) {
            ctx.globalCompositeOperation = 'lighter'
            drawGlow(ctx, glowSprite(f.item[0], f.item[1], f.item[2], true), cp[0], cp[1], 0.16 * cp[3], (0.15 + Math.min(0.8, m)) * S.floorA * S.wallA)
            ctx.globalCompositeOperation = 'source-over'
          }
          ctx.globalAlpha = S.floorA * S.wallA
        }
      }
      // 白玉理币盘：十五摞金币
      for (let i = 0; i < 15; i++) {
        const x = 7.62 + (i % 3) * 0.16, y = -3.55 + Math.floor(i / 3) * 0.42
        const q = c.p(x, y, COUNTER.top + 0.05)
        if (!q) continue
        ctx.fillStyle = shade([0.7, 0.52, 0.22], x, y, COUNTER.top + 0.05, 0, 0, 1, null, 3)
        ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(0.8, 0.045 * q[3]), 0, TAU); ctx.fill()
      }
      ctx.globalAlpha = 1
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
        // 冷光落在朝向光源的那一侧棱上
        r.side = (Math.cos(r.a) * Lt.x - Math.sin(r.a) * Lt.y) > 0 ? 1 : -1
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
              const w = Math.max(1, Math.min(40, (r.major ? 0.11 : 0.065) * (q[3] + prev[3]) * 0.5))
              ctx.globalAlpha = a * 0.78
              ctx.strokeStyle = rgb(o.ribTone[0], o.ribTone[1], o.ribTone[2])
              ctx.lineWidth = w
              ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke()
              // 钻石肋线的冷光
              const m = Lt.power * Lt.flick * S.poolA / (1 + ((r.sx * k - Lt.x) ** 2 + (r.sy * k - Lt.y) ** 2 + (z - Lt.z) ** 2) / (Lt.range * Lt.range * 2.2))
              ctx.globalAlpha = a * (0.03 + Math.min(0.45, m * 0.55))
              ctx.strokeStyle = rgb(o.glint[0] * 0.55, o.glint[1] * 0.58, o.glint[2] * 0.66)
              ctx.lineWidth = Math.max(0.6, w * 0.05)
              const ox = (q[1] - prev[1]), oy = -(q[0] - prev[0]), ol = Math.hypot(ox, oy) || 1, sh = w * 0.32 * r.side
              ctx.beginPath(); ctx.moveTo(prev[0] + ox / ol * sh, prev[1] + oy / ol * sh); ctx.lineTo(q[0] + ox / ol * sh, q[1] + oy / ol * sh); ctx.stroke()
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

    /* ---------- 水晶灯（离镜头最近，模糊成散景） ---------- */
    function drawChandelier(ctx) {
      const A = S.chandA * (1 - S.dark) * mix(0.3, 1, S.tilt)
      if (A <= 0.01) return
      const c = S.cam, Lt = S.light
      // 吊链
      const a = c.p(0, 0, G.apex - 0.05), b = c.p(0, 0, 5.85)
      if (a && b) {
        ctx.globalAlpha = A * 0.5
        ctx.strokeStyle = rgb(o.ribTone[0] * 1.6, o.ribTone[1] * 1.6, o.ribTone[2] * 1.6)
        ctx.lineWidth = Math.max(1, 0.03 * b[3])
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
      }
      // 三圈细框
      for (const [r, z] of [[1.2, 5.25], [0.86, 5.5], [0.5, 5.75]]) {
        const q = c.poly(circle(0, 0, z, r, 64))
        if (!q) continue
        ctx.globalAlpha = A * 0.32
        ctx.strokeStyle = rgb(60, 66, 84)
        ctx.lineWidth = Math.max(1, 0.012 * c.f / Math.max(0.5, c.depth(r, 0, z)))
        pathPts(ctx, q); ctx.stroke()
      }
      // 垂饰：随光源位置闪烁
      ctx.globalCompositeOperation = 'lighter'
      const spr = glowSprite(o.glint[0], o.glint[1], o.glint[2], true)
      const warm = glowSprite(o.lightCol[0], o.lightCol[1], o.lightCol[2], true)
      for (const d of CHAND) {
        const q = c.p(d.x, d.y, d.z)
        if (!q) continue
        const m = irr(d.x, d.y, d.z)
        const tw = Math.pow(Math.max(0, Math.sin(d.ph + Lt.x * 1.7 + Lt.y * 1.3 + S.time * 0.8)), 10)
        if (tw < 0.25) continue
        const al = A * tw * tw * Math.min(0.7, 0.08 + m * 0.7)
        drawGlow(ctx, tw > 0.75 ? spr : warm, q[0], q[1], Math.min(26, 0.045 * q[3] * (1 + tw)), al)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 穹顶落下的一束光 ---------- */
    function drawBeam(ctx) {
      const bm = S.beam
      if (bm.k < 0 || bm.amt <= 0.01) return
      const s = S.seats[bm.k]
      const c = S.cam, col = o.beamCol
      const spr = glowSprite(col[0], col[1], col[2])
      ctx.globalCompositeOperation = 'lighter'
      const n = 30
      const hard = glowSprite(255, 250, 240, true)
      const A = bm.amt * (1 - S.dark * 0.5)
      let prev = null
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = mix(0, s.x, t), y = mix(0, s.y, t), z = mix(G.apex - 0.3, 0.2, t)
        const p = c.p(x, y, z)
        if (!p) { prev = null; continue }
        const r = mix(0.16, 0.62, t)
        const rad = Math.min(r * p[3] * 1.6, 420)
        // 采样点在屏幕上挤在一起时（正俯视、或镜头贴近光柱底部）按密度减弱，免得叠成一团白
        const gap = prev ? Math.hypot(p[0] - prev[0], p[1] - prev[1]) : rad
        const k = Math.min(1, 0.22 + 2.2 * gap / Math.max(1, rad))
        prev = p
        drawGlow(ctx, spr, p[0], p[1], rad, A * (0.07 + 0.07 * t) * k)
        // 硬芯只在光柱上段；落到椅子上时散开（否则近景里会把椅背烧成一块白板）
        drawGlow(ctx, hard, p[0], p[1], Math.min(r * p[3] * 0.5, 140), A * 0.05 * (1 - 0.8 * t) * k)
      }
      const p = c.p(s.x, s.y, 1.1)
      if (p) { drawGlow(ctx, spr, p[0], p[1], Math.min(1.3 * p[3], 520), A * 0.16); drawGlow(ctx, hard, p[0], p[1], Math.min(0.3 * p[3], 90), A * 0.06) }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 光源本身与浮尘 ---------- */
    function drawLightOrb(ctx) {
      const ls = S.ls
      if (!ls || S.glowA <= 0.01) return
      const L = S.light, lc = o.lightCol
      const k = Math.min(1.2, L.power * L.flick) * S.glowA * S.poolA
      // 光升到穹顶时是一片散光，不是一团火：火芯随高度淡去；尺寸封顶，镜头再近也只是一点烛火
      const core = 1 - sstep(3.2, 5.2, L.z)
      ctx.globalCompositeOperation = 'lighter'
      drawGlow(ctx, glowSprite(lc[0], lc[1], lc[2]), ls[0], ls[1], Math.min(1.5 * ls[3], 260), 0.16 * k)
      drawGlow(ctx, glowSprite(255, 236, 205, true), ls[0], ls[1], Math.min(0.13 * ls[3], 20), 0.5 * k * core)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }
    for (let i = 0; i < o.motes; i++) {
      S.motes.push({ x: (Math.random() * 2 - 1) * 5, y: (Math.random() * 2 - 1) * 4.6, z: 0.4 + Math.random() * 4.2, ph: Math.random() * TAU, sp: 0.5 + Math.random() })
    }
    function drawMotes(ctx) {
      if (!S.motes.length) return
      const c = S.cam, L = S.light
      const spr = glowSprite(255, 230, 200, true)
      const bm = S.beam, bs = bm.k >= 0 ? S.seats[bm.k] : null
      ctx.globalCompositeOperation = 'lighter'
      for (const m of S.motes) {
        const q = c.p(m.x, m.y, m.z)
        if (!q) continue
        const d2 = (m.x - L.x) ** 2 + (m.y - L.y) ** 2 + (m.z - L.z) ** 2
        let e = L.power * L.flick * S.poolA / (1 + d2 / 0.9)
        if (bs && bm.amt > 0) {
          // 在光束里的尘
          const t = clamp01((G.apex - 0.3 - m.z) / (G.apex - 0.5))
          const bx = bs.x * t, by = bs.y * t, br = mix(0.16, 0.62, t)
          const dd = Math.hypot(m.x - bx, m.y - by)
          e += bm.amt * 1.2 * (1 - sstep(br * 0.6, br * 1.3, dd))
        }
        if (e < 0.04) continue
        const tw = 0.6 + 0.4 * Math.sin(S.time * 2 * m.sp + m.ph)
        drawGlow(ctx, spr, q[0], q[1], Math.max(1.4, 0.03 * q[3]), Math.min(0.9, e * 0.55 * tw) * (1 - S.dark))
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 眼睛（最后一遍，黑暗盖不住） ---------- */
    function drawEyes(ctx) {
      const A = S.eyeA
      if (A <= 0.01 || !S.eyeQ.length) return
      ctx.globalCompositeOperation = 'lighter'
      for (const e of S.eyeQ) {
        const a = e.a * A * S.eyePulse
        if (a <= 0.01) continue
        const acc = e.acc
        const spr = glowSprite(acc[0], acc[1], acc[2])
        const lift = 1 + e.hov * 0.6
        // 光晕不超过两眼间距太多：远看是一团寒光，近看仍是分开的两点
        const halo = Math.min(e.r * 7 * lift, Math.max(10, e.sep * 1.6)) + e.r * 24 * e.flash * lift
        drawGlow(ctx, spr, e.x, e.y, Math.min(70, halo), a * Math.max(e.open, e.flash) * (0.6 + e.flash * 0.6))
        if (e.open > 0.02) {
          ctx.globalAlpha = Math.min(1, a * 1.1)
          ctx.fillStyle = rgb(mix(acc[0], 255, 0.62), mix(acc[1], 255, 0.62), mix(acc[2], 255, 0.62))
          ctx.beginPath()
          ctx.ellipse(e.x, e.y, e.r * 1.5 * lift, Math.max(0.3, e.r * 0.85 * e.open * lift), e.rot, 0, TAU)
          ctx.fill()
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 杏仁形的眼眶（整个画面像一只眼睛） ---------- */
    function drawLens(ctx) {
      if (S.lensA <= 0.01) return
      const lc = S.lensC, q = 0.25
      const w = Math.max(4, Math.ceil(S.W * q)), h = Math.max(4, Math.ceil(S.H * q))
      if (lc.width !== w || lc.height !== h) { lc.width = w; lc.height = h }
      const x = lc.getContext('2d')
      x.setTransform(1, 0, 0, 1, 0, 0)
      x.globalCompositeOperation = 'source-over'
      x.clearRect(0, 0, w, h)
      x.fillStyle = '#050404'
      x.fillRect(0, 0, w, h)
      x.globalCompositeOperation = 'destination-out'
      const cx = w / 2 + S.view.ox * q, cy = h / 2 + S.view.oy * q
      const ha = w * S.lensW
      const hb = Math.max(1, Math.min(ha * 0.97, h * S.lensH * S.lensOpen))
      const R = (ha * ha + hb * hb) / (2 * hb)
      if (HAS_FILTER) x.filter = 'blur(' + (Math.min(w, h) * 0.06).toFixed(1) + 'px)'
      x.beginPath()
      x.arc(cx, cy + R - hb, R, Math.atan2(-(R - hb), -ha), Math.atan2(-(R - hb), ha))
      x.arc(cx, cy - (R - hb), R, Math.atan2(R - hb, ha), Math.atan2(R - hb, -ha))
      x.closePath()
      x.fill()
      if (HAS_FILTER) x.filter = 'none'
      ctx.globalAlpha = S.lensA
      ctx.drawImage(lc, 0, 0, S.W, S.H)
      ctx.globalAlpha = 1
    }

    /* =====================================================================
       每帧：光源追随光标、头转向光、眨眼
       ===================================================================== */
    S.update = dt => {
      if (!(dt > 0)) dt = 1 / 60
      if (dt > 0.1) dt = 0.1
      S.time += dt
      S.lastDt = dt
      setView()
      const L = S.light
      let tx = S.home.x, ty = S.home.y, tz = S.home.z, tp = S.homePow
      if (S.ptr.on) {
        const w = S.cam.unproject(S.ptr.x, S.ptr.y, S.lampZ)
        if (w) {
          tx = U.clamp(w[0], -G.hx + 0.5, G.hx - 0.5); ty = U.clamp(w[1], -G.hy + 0.5, G.hy - 0.5); tz = S.lampZ; tp = S.lampPow
        }
      }
      const f1 = 1 - Math.pow(0.8, dt * 60), f2 = 1 - Math.pow(0.94, dt * 60)
      L.x += (tx - L.x) * f1; L.y += (ty - L.y) * f1; L.z += (tz - L.z) * f2; L.power += (tp - L.power) * f2
      L.range += ((S.ptr.on ? S.lampRange : S.homeRange) - L.range) * f2
      const t = S.time
      // 烛火：光标甩得越快，火苗抖得越厉害
      const gust = Math.min(0.28, (App.mouse.speed || 0) * 0.006) * (S.ptr.on ? 1 : 0)
      S.gust += (gust - S.gust) * (1 - Math.pow(0.9, dt * 60))
      L.flick = 0.955 + 0.03 * Math.sin(t * 7.1) * Math.sin(t * 2.3 + 1.7) + 0.015 * Math.sin(t * 23.7)
        - S.gust * (0.5 + 0.5 * Math.sin(t * 31 + Math.sin(t * 13) * 2))
      const fh = 1 - Math.pow(0.84, dt * 60)
      for (const s of S.seats) {
        const dx = L.x - s.x, dy = L.y - s.y
        const lu = dx * s.rx + dy * s.ry, lv = dx * s.fx + dy * s.fy
        let tgt = Math.hypot(lu, lv) < 0.3 ? 0 : Math.atan2(lu, lv)
        tgt = U.clamp(tgt, -1.3, 1.3) * s.awake * (1 - s.fall)
        s.yaw += (tgt - s.yaw) * (1 - Math.pow(1 - s.lag, dt * 60))
        s.nextBlink -= dt
        if (s.nextBlink <= 0) { s.blinkT = 0.17; s.nextBlink = 2.2 + Math.random() * 6.5 }
        if (s.blinkT > 0) { s.blinkT = Math.max(0, s.blinkT - dt); s.blink = Math.min(1, Math.abs(s.blinkT - 0.085) / 0.085) } else s.blink = 1
        if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 1.3)
        s.hover += ((S.hoverK === s.k ? 1 : 0) - s.hover) * fh
      }
      for (const m of S.motes) {
        m.x += Math.sin(t * 0.21 * m.sp + m.ph) * 0.0025 + 0.0006
        m.y += Math.cos(t * 0.17 * m.sp + m.ph * 1.3) * 0.0025
        m.z += Math.sin(t * 0.33 * m.sp + m.ph * 0.7) * 0.0016 + 0.0004
        if (m.x > 5) m.x = -5
        if (m.z > 4.6) m.z = 0.4
      }
    }

    /* =====================================================================
       画一帧
       ===================================================================== */
    S.render = () => {
      setView()
      const ctx = S.ctx, k = S.dpr
      ctx.setTransform(k, 0, 0, k, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, S.W, S.H)
      S.eyeQ.length = 0
      const L = S.light
      S.ls = S.cam.p(L.x, L.y, L.z)
      for (const s of S.seats) s.K = personKeys(s)
      if (S.dark < 0.999) {
        drawWalls(ctx)
        drawFloor(ctx)
        drawFloorShadows(ctx)
        drawRipples(ctx, S.lastDt || 1 / 60)
        drawFurniture(ctx)
        // 远处的椅子 → 圆桌 → 近处的椅子
        const c = S.cam
        const fx = c.F[0], fy = c.F[1], fl = Math.hypot(fx, fy) || 1
        const list = S.seats.slice().sort((a, b) => c.depth(b.x, b.y, 0.6) - c.depth(a.x, a.y, 0.6))
        const behind = s => S.tilt > 0.1 && (s.x * fx + s.y * fy) / fl > 0.9
        for (const s of list) if (behind(s)) drawSeat(ctx, s)
        drawTable(ctx)
        for (const s of list) if (!behind(s)) drawSeat(ctx, s)
        drawBeam(ctx)
        drawLightOrb(ctx)
        drawMotes(ctx)
      } else {
        // 只算眼睛
        for (const s of S.seats) if (s.K) queueEyes(s, s.K)
      }
      if (S.dark > 0.001) {
        ctx.globalAlpha = S.dark
        ctx.fillStyle = '#050404'
        ctx.fillRect(0, 0, S.W, S.H)
        ctx.globalAlpha = 1
      }
      drawEyes(ctx)
      const r = S.rctx
      if (r) {
        r.setTransform(k, 0, 0, k, 0, 0)
        r.globalCompositeOperation = 'source-over'
        r.globalAlpha = 1
        r.clearRect(0, 0, S.W, S.H)
        drawRibs(r)
        drawChandelier(r)
        drawLens(r)
      } else {
        drawRibs(ctx)
        drawChandelier(ctx)
        drawLens(ctx)
      }
    }
    /* ---------- 拾取与屏幕位置 ---------- */
    S.pick = (x, y) => {
      setView()
      let best = -1, bd = 1e9
      for (const s of S.seats) {
        const p = S.cam.p(s.x - s.fx * 0.04, s.y - s.fy * 0.04, 0.75)
        if (!p) continue
        const d = Math.hypot(p[0] - x, p[1] - y)
        if (d < Math.max(16, 0.5 * p[3]) && d < bd) { bd = d; best = s.k }
      }
      return best
    }
    S.seatScreen = (k, z) => {
      const s = S.seats[k - 1]
      const zz = z == null ? 1.25 : z
      const p = S.cam.p(s.x, s.y, zz), q = S.cam.p(s.x - s.fx, s.y - s.fy, zz)
      if (!p || !q) return null
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1
      return { x: p[0], y: p[1], s: p[3], ox: dx / l, oy: dy / l }
    }
    S.project = (x, y, z) => S.cam.p(x, y, z)
    S.headScreen = k => {
      const s = S.seats[k - 1]
      const K = s.K || personKeys(s)
      if (!K) return S.seatScreen(k)
      const p = S.cam.p(K.head[0], K.head[1], K.head[2])
      return p ? { x: p[0], y: p[1], s: p[3] } : null
    }

    S.resize()
    return S
  }

  /* =====================================================================
     App.domeHall：共享给终章 wish
     ===================================================================== */
  let filler = null
  const domeHall = (App.domeHall = {
    create: createHall,
    G, COUNTER,
    // 十五席上坐的人：App.state.seats 里有人就用他们，空位从 38 人中随机补齐（整页共用一份）
    people() {
      const seats = (App.state.seats || []).slice(0, 15)
      while (seats.length < 15) seats.push(null)
      const used = new Set(seats.filter(id => id && App.char(id)))
      if (!filler) filler = U.shuffle(App.chars.map(c => c.id))
      let i = 0
      return seats.map(id => {
        if (id && App.char(id)) return id
        while (i < filler.length && used.has(filler[i])) i++
        const f = filler[i++] || null
        if (f) used.add(f)
        return f
      })
    },
  })

  /* =====================================================================
     醒来 · 板块
     ===================================================================== */
  const KEY_SVG = `<svg viewBox="0 0 170 64" aria-hidden="true">
  <defs><linearGradient id="prologue-key-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dca6"/><stop offset=".45" stop-color="#c29a5b"/><stop offset="1" stop-color="#4f3a1f"/></linearGradient></defs>
  <g fill="url(#prologue-key-g)">
    <path fill-rule="evenodd" d="M30 12a20 20 0 1 1 0 40a20 20 0 1 1 0-40zm0 9a11 11 0 1 0 0 22a11 11 0 1 0 0-22z"/>
    <circle cx="30" cy="32" r="3.2"/>
    <rect x="49" y="28.5" width="104" height="7" rx="2.5"/>
    <rect x="52" y="24" width="6" height="16" rx="2"/>
    <rect x="62" y="25.5" width="3.5" height="13" rx="1.5"/>
    <path d="M128 35h7v13h-7z M140 35h13v18h-5v-8h-8z"/>
  </g>
  <path d="M30 12a20 20 0 0 1 17 9" fill="none" stroke="#fff3d6" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
</svg>`

  const P = {
    el: null, H: null, E: null, vis: false, started: false,
    p: 0, ps: 0, lit: 0, mob: false,
    ptrIn: false, touchUntil: 0, hoverK: -1, tagK: -1, tagUntil: 0, lineK: -1,
    zoom: 1.4, lv: 0, keyNo: 1, keyLanded: false, keyShown: false, lastKeyP: 0, whooshed: false, cueOn: false, wakeDone: false, gateOpen: false,
  }

  function build(el) {
    const E = (P.E = {})
    el.innerHTML = ''
    const sticky = (E.sticky = U.el('div.prologue-sticky'))
    E.stage = U.el('div.prologue-stage')
    E.cv = U.el('canvas.prologue-cv', { 'aria-hidden': 'true' })
    E.ribs = U.el('canvas.prologue-ribs', { 'aria-hidden': 'true' })
    E.stage.append(E.cv, E.ribs)
    E.title = U.el('h1.prologue-title', { text: '夙与愿' })
    E.seal = U.el('i.prologue-seal', { 'aria-hidden': 'true' })
    E.latin = U.el('div.prologue-latin', { text: 'XV Sedes · Vnvm Votvm', 'aria-hidden': 'true' })
    E.head = U.el('div.prologue-head', null, [E.title, E.seal, E.latin])
    E.time = U.el('span.prologue-time', { text: '17:00' })
    E.clock = U.el('div.prologue-clock', { 'aria-hidden': 'true' }, [U.el('span.prologue-day', { text: '第一日' }), E.time, E.tick = U.el('i.prologue-clock-tick')])
    E.tagNo = U.el('b.prologue-tag-no')
    E.tagName = U.el('span.prologue-tag-name')
    E.tagLine = U.el('p.prologue-tag-line')
    E.tag = U.el('div.prologue-tag', { 'aria-hidden': 'true' }, [U.el('div.prologue-tag-in', null, [U.el('div.prologue-tag-head', null, [E.tagNo, E.tagName]), E.tagLine])])
    E.cue = U.el('div.prologue-cue', { 'aria-hidden': 'true' }, [U.el('i')])
    E.keyTag = U.el('span.prologue-key-no', { text: 'I' })
    E.key = U.el('div.prologue-key', { 'aria-hidden': 'true', html: KEY_SVG })
    E.key.appendChild(E.keyTag)
    sticky.append(E.stage, E.head, E.clock, E.tag, E.cue, E.key)
    el.appendChild(sticky)
  }

  function layout() {
    const H = P.H
    P.mob = App.isMobile()
    H.resize()
    const W = H.W, Hh = H.H
    const portrait = Hh > W * 1.15
    H.fit = portrait ? 0.4 : 0.36
    H.numScale = portrait ? 1.7 : (Math.min(W, Hh) < 700 ? 1.3 : 1)
    H.lensW = portrait ? 0.95 : 0.62
    H.lensH = portrait ? 0.38 : 0.62
    H.ribA = portrait ? 0.55 : 1
    P.oy0 = portrait ? Hh * 0.04 : 0
    H.view.oy = P.oy0
  }

  function setClock(m, instant) {
    const t = '17:0' + m
    P.H.clock = 17 * 60 + m
    // 让 HUD 的馆内时钟与大钟同步（只在板块顶端时；滚动后由核心按进度接管）
    if (P.el && P.el.getBoundingClientRect().top > -40) { App.state.minutes = 17 * 60 + m; App.bus.emit('time', 17 * 60 + m) }
    const E = P.E
    if (instant || App.reduced) { E.time.textContent = t; return }
    App.text.scramble(E.time, t, { duration: 0.5, chars: '0123456789', revealDelay: 0.1 })
    gsap.fromTo(E.tick, { scaleX: 1, opacity: 0.9 }, { scaleX: 0, opacity: 0, duration: 1.2, ease: 'expo.out' })
    gsap.fromTo(E.clock, { x: -3 }, { x: 0, duration: 0.4, ease: 'expo.out' })
  }

  function wakeSeat(s, i) {
    s.flash = 1
    P.H.ripple(s.k, s.acc)
    gsap.to(s, { eyes: 1, duration: 0.32, ease: 'power4.out', overwrite: 'auto' })
    gsap.to(s, { awake: 1, duration: App.reduced ? 0.4 : 2.2, ease: 'power3.inOut', delay: App.reduced ? 0 : 0.5 })
    App.audio.sfx('tick', { volume: 0.55 + i * 0.1, pan: U.clamp(s.x / 3.2, -1, 1) * 0.8, pitch: 0.7 + s.k * 0.035 })
  }
  function wakeBatch(b) {
    setClock(b + 1)
    App.audio.sfx('drop', { volume: 0.5, pitch: 0.7 + b * 0.06 })
    ;[b + 1, b + 6, b + 11].forEach((k, i) => {
      const s = P.H.seats[k - 1]
      if (App.reduced) wakeSeat(s, i)
      else gsap.delayedCall(0.14 + i * 0.2, () => wakeSeat(s, i))
    })
  }

  function revealTitle() {
    const E = P.E
    App.text.reveal(E.title, { stagger: 0.18, duration: 2, y: 34, ease: 'expo.out' })
    gsap.fromTo(E.seal, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(3)', delay: 1.1 })
    gsap.fromTo(E.latin, { opacity: 0, letterSpacing: '1.2em' }, { opacity: 1, letterSpacing: '0.62em', duration: 2.4, ease: 'expo.out', delay: 0.7 })
    gsap.fromTo(E.clock, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: 0.5 })
  }

  function runWake() {
    const H = P.H
    if (!H) return
    if (P.tl) P.tl.kill()
    P.started = true
    P.wakeDone = false
    for (const s of H.seats) { gsap.killTweensOf(s); s.awake = 0; s.eyes = 0; s.flash = 0; s.yaw = 0 }
    setClock(0, true)
    gsap.fromTo(H, { lensOpen: 0.42 }, { lensOpen: 1, duration: 3.4, ease: 'power2.inOut' })
    gsap.fromTo(P, { zoom: 1.4 }, { zoom: 0, duration: App.reduced ? 0.5 : 9.5, ease: 'power2.inOut' })
    gsap.fromTo(H, { poolA: 0.2 }, { poolA: 1, duration: 2.4, ease: 'power2.out' })
    const tl = (P.tl = gsap.timeline())
    tl.add(revealTitle, 0.2)
    const gap = App.reduced ? 0.35 : 1.45
    for (let b = 0; b < 5; b++) tl.add(() => wakeBatch(b), 1.5 + b * gap)
    tl.add(() => { P.wakeDone = true; showCue(true) }, 1.5 + 5 * gap + 0.8)
  }

  function showCue(on) {
    if (P.cueOn === on) return
    P.cueOn = on
    gsap.to(P.E.cue, { opacity: on ? 1 : 0, duration: on ? 1.2 : 0.4, ease: 'power2.out' })
  }

  /* ---------- 席位：悬停与点击 ---------- */
  function setHover(k) {
    if (k === P.hoverK) return
    P.hoverK = k
    P.H.hoverK = k
    if (k > 0) {
      showTag(k)
      App.audio.sfx('hover', { volume: 0.6, pitch: 0.8 + k * 0.02 })
      if (App.cursor && App.cursor.set) App.cursor.set('')
    } else {
      if (App.cursor && App.cursor.clear) App.cursor.clear()
      if (P.lineK < 0) hideTag()
    }
  }
  function showTag(k) {
    const s = P.H.seats[k - 1]
    const c = App.char(s.id)
    const E = P.E
    if (P.tagK !== k) {
      P.tagK = k
      E.tagNo.textContent = U.roman(k)
      E.tagName.textContent = c ? c.name : '—'
      if (P.lineK !== k) { P.lineK = -1; E.tagLine.textContent = ''; E.tagLine.classList.remove('is-on') }
      E.tag.style.setProperty('--acc', 'rgb(' + s.acc.map(v => v | 0).join(',') + ')')
      gsap.fromTo(E.tag, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out', overwrite: true })
      gsap.fromTo(E.tagName, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'expo.out' })
    }
  }
  function hideTag() {
    if (P.tagK < 0) return
    P.tagK = -1
    P.lineK = -1
    gsap.to(P.E.tag, { opacity: 0, duration: 0.4, ease: 'power2.in', overwrite: true })
  }
  function speak(k) {
    const s = P.H.seats[k - 1]
    const c = App.char(s.id)
    if (!c) return
    showTag(k)
    s.flash = 1
    P.keyNo = k
    P.E.keyTag.textContent = U.roman(k)
    App.audio.sfx('heartbeat', { volume: 0.5 })
    if (P.lineK === k) return
    P.lineK = k
    const line = (c.lines && c.lines.wake) || ''
    const el = P.E.tagLine
    el.classList.add('is-on')
    App.text.type(el, line, { speed: 34, cancel: () => P.lineK !== k })
    P.tagUntil = performance.now() + 2400 + line.length * 110
  }

  function onTap(e) {
    if (!P.H || P.ps > 0.62) return
    const r = P.E.stage.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const k = P.H.pick(x, y)
    if (k > 0) speak(k)
    else if (P.lineK > 0 && !App.finePointer) { P.lineK = -1; hideTag() }
  }

  /* ---------- 滚动：倾斜镜头、编号亮起、沉入黑暗、钥匙落下 ---------- */
  function applyScroll(p) {
    const H = P.H, v = H.view, E = P.E
    const t = easeIO(sstep(0.04, 0.66, p))
    const tm = H.time
    v.elev = mix(Math.PI / 2, P.mob ? 0.74 : 0.6, t)
    v.dist = mix(10.6 + P.zoom, P.mob ? 12.6 : 16.2, t)
    // 极慢的呼吸：整间厅像在缓缓转动
    v.yaw = mix(Math.sin(tm * 0.05) * 0.05, -0.42, t)
    v.tz = mix(0.45, 0.55, t)
    v.oy = mix(P.oy0, P.oy0 + H.H * 0.07, t)
    H.lensA = 1 - 0.55 * sstep(0.04, 0.4, p)
    // 编号一个个亮起（1 号正北，顺时针）
    const n = Math.floor(U.clamp((p - 0.1) / 0.42, 0, 1) * 15 + 1e-6)
    if (n !== P.lit) {
      if (n > P.lit && P.started) App.audio.sfx('tick', { volume: 0.32, pitch: 1.3 + n * 0.04, pan: U.clamp(H.seats[Math.max(0, n - 1)].x / 3, -1, 1) * 0.6 })
      P.lit = n
    }
    for (const s of H.seats) {
      const want = s.k <= n ? 1 : 0
      if (want && s.lit < 0.02 && P.started) H.ripple(s.k, [214, 172, 102])
      s.lit += (want - s.lit) * 0.14
    }
    // 沉入黑暗，只剩眼睛；然后眼睛也闭上
    H.dark = sstep(0.64, 0.86, p)
    H.eyeA = 1 - sstep(0.88, 0.96, p)
    // 文字退场
    const fade = 1 - sstep(0.03, 0.2, p)
    E.head.style.opacity = fade.toFixed(3)
    E.head.style.transform = 'translate3d(0,' + (-p * 120).toFixed(1) + 'px,0)'
    E.clock.style.opacity = (1 - sstep(0.02, 0.14, p)).toFixed(3)
    if (p > 0.03) showCue(false)
    else if (P.wakeDone) showCue(true)
    keyFall(p)
  }

  function keyFall(p) {
    const H = P.H, E = P.E
    const t = clamp01((p - 0.7) / 0.2)
    if (t <= 0) {
      if (P.keyShown) { P.keyShown = false; E.key.style.opacity = '0'; H.keyGone = -1 }
      P.keyLanded = false
      return
    }
    P.keyShown = true
    H.keyGone = P.keyNo - 1
    // 起点：钥匙龛在屏幕上的位置
    let sx = H.W * 0.82, sy = H.H * 0.28
    const row = P.keyNo <= 8 ? 0 : 1, col = row ? P.keyNo - 9 : P.keyNo - 1
    const q = H.project(G.hx - 0.04, -3.62 + col * 0.24 + row * 0.12, row ? 1.3 : 1.66)
    if (q && q[0] > 0 && q[0] < H.W && q[1] > 0 && q[1] < H.H) { sx = q[0]; sy = q[1] }
    const ex = H.W * 0.5, ey = H.H * (P.mob ? 0.8 : 0.82)
    const fallT = clamp01(t / 0.86)
    const g = fallT * fallT
    let x = mix(sx, ex, 1 - Math.pow(1 - fallT, 1.6)), y = mix(sy, ey, g)
    let rot = mix(-70, 720 + 8, 1 - Math.pow(1 - fallT, 2))
    // 落地：一次小弹跳
    if (t > 0.86) {
      const b = (t - 0.86) / 0.14
      y = ey - Math.sin(b * Math.PI) * 18 * (1 - b)
      rot = 728 - Math.sin(b * Math.PI) * 10
    }
    if (t >= 0.86 && !P.keyLanded) {
      P.keyLanded = true
      if (P.p > P.lastKeyP) App.audio.sfx('drop', { volume: 0.9, pitch: 1.2 })
    } else if (t < 0.86) P.keyLanded = false
    if (t > 0.05 && t < 0.2 && !P.whooshed && P.p > P.lastKeyP) { P.whooshed = true; App.audio.sfx('whoosh', { volume: 0.5 }) }
    if (t < 0.03) P.whooshed = false
    P.lastKeyP = P.p
    const sc = mix(0.55, 1, sstep(0, 0.5, fallT)) * (P.mob ? 0.8 : 1)
    E.key.style.opacity = sstep(0, 0.08, t).toFixed(3)
    E.key.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%) rotate(' + rot.toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')'
  }

  /* ---------- 帧 ---------- */
  function frame(time, dt) {
    if (!P.H) return
    const H = P.H, E = P.E
    const now = performance.now()
    // 遮幕打开之前，低频渲染即可
    if (!P.started && !P.gateOpen && (P.skip = (P.skip || 0) + 1) % 20) return
    // 离得很远时隔几帧才量一次位置
    if (P.far && (P.farSkip = ((P.farSkip || 0) + 1) % 8)) return
    const sec = Math.min(0.1, (dt || 1) / 60)
    // 可见性与进度都直接取自板块的位置（不依赖可能迟到的观察器回调或过期的 ScrollTrigger 缓存）
    const er = P.el.getBoundingClientRect(), vh = window.innerHeight
    P.far = er.bottom < -vh || er.top > vh * 2
    setVis(er.bottom > 0 && er.top < vh)
    if (!P.vis) return
    P.p = clamp01(-er.top / Math.max(1, er.height - window.innerHeight))
    // 平滑跟随用真实时间（与帧率无关；隔了很久才回来就直接到位）
    const rdt = Math.min(1, (now - (P.lastNow || now)) / 1000)
    P.lastNow = now
    P.ps += (P.p - P.ps) * (1 - Math.exp(-rdt / 0.12))
    if (Math.abs(P.p - P.ps) < 0.0004) P.ps = P.p
    applyScroll(P.ps)
    // 光标 → 光源
    const r = E.stage.getBoundingClientRect()
    const m = App.mouse
    const inside = m.x >= r.left && m.x <= r.right && m.y >= r.top && m.y <= r.bottom
    const touchOk = App.finePointer || now < P.touchUntil
    H.ptr.x = m.x - r.left; H.ptr.y = m.y - r.top
    H.ptr.on = P.ptrIn && inside && touchOk && P.started && H.dark < 0.95
    if (App.finePointer || !P.started) {
      // 光标离开画面：光回到穹顶中央，轻轻摇晃
      H.home.x = Math.sin(H.time * 0.23) * 0.5
      H.home.y = Math.cos(H.time * 0.17) * 0.35
      H.home.z = 5.6; H.homePow = 1.5; H.homeRange = 4.2
    } else {
      // 触屏没有光标：像有人举着蜡烛，绕着圆桌慢慢走
      const a = H.time * 0.21
      H.home.x = Math.sin(a) * 3.7
      H.home.y = Math.cos(a) * 3.1 + Math.sin(a * 2.3) * 0.4
      H.home.z = 2.5; H.homePow = 2.1; H.homeRange = 3.3
    }
    H.update(sec)
    // 眼睛随音乐轻轻起伏
    const lv = App.audio && App.audio.level ? App.audio.level() : 0
    P.lv += ((lv || 0) - P.lv) * 0.08
    H.eyePulse = 0.88 + 0.3 * Math.min(1, P.lv * 1.6)
    // 悬停
    if (App.finePointer) {
      const k = H.ptr.on && P.ps < 0.6 && !(App.overlay && App.overlay.isOpen) ? H.pick(H.ptr.x, H.ptr.y) : -1
      setHover(k)
    }
    if (P.lineK > 0 && now > P.tagUntil && P.hoverK !== P.lineK) hideTag()
    if (!App.finePointer && P.tagK > 0 && P.lineK < 0 && now > P.tagUntil) hideTag()
    if (P.ps > 0.62 && P.tagK > 0) { P.lineK = -1; hideTag() }
    H.render()
    // 名牌跟着席位
    if (P.tagK > 0) {
      const sc = H.seatScreen(P.tagK, 1.2)
      if (sc) {
        // 名牌放在席位外侧；靠近屏幕上下边缘时翻到内侧（桌面上）
        let dir = 1
        const off = 0.95 * sc.s
        const yo = sc.y + sc.oy * off
        if ((sc.oy < -0.4 && yo < 120) || (sc.oy > 0.4 && yo > H.H - 120)) dir = -1
        const ox = sc.ox * dir, oy = sc.oy * dir
        let x = sc.x + ox * off * (dir < 0 ? 0.85 : 1), y = sc.y + oy * off * (dir < 0 ? 0.85 : 1)
        const side = ox > 0.35 ? 'l' : ox < -0.35 ? 'r' : 'c'
        if (side !== P.tagSide) { P.tagSide = side; E.tag.dataset.side = side }
        const vside = oy > 0.2 ? 'b' : 't'
        if (vside !== P.tagV) { P.tagV = vside; E.tag.dataset.v = vside }
        x = U.clamp(x, 12, H.W - 12); y = U.clamp(y, 80, H.H - 30)
        E.tag.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'
      }
    }
  }

  function setVis(v) {
    if (P.vis === v) return
    P.vis = v
    if (!v) { setHover(-1); hideTag() }
  }

  App.section('prologue', {
    palette: { a: '#140f0c', b: '#c29a5b', glow: 0.3 },
    track: 'dread',
    mount(el) {
      P.el = el
      el.classList.add('prologue')
      build(el)
      P.H = createHall({ canvas: P.E.cv, ribCanvas: P.E.ribs, motes: App.reduced ? 20 : 70 })
      P.H.setPeople(domeHall.people())
      P.H.lensA = 1
      P.H.lensOpen = 0.42
      P.H.poolA = 0.2
      layout()
      // 遮幕前：未醒的人、未亮的编号
      P.E.title._chars = App.text.split(P.E.title)
      gsap.set(P.E.title._chars, { opacity: 0 })
      gsap.set([P.E.seal, P.E.latin, P.E.clock, P.E.cue, P.E.key], { opacity: 0 })
      P.vis = true
      App.bus.on('wake', runWake)
      App.bus.on('cast:change', () => P.H.setPeople(domeHall.people()))
      // 光标进出
      const onMove = e => {
        P.ptrIn = true
        if (e.pointerType === 'touch') P.touchUntil = performance.now() + 2600
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', e => {
        P.ptrIn = true
        if (e.pointerType === 'touch') P.touchUntil = performance.now() + 2600
        P.gateOpen = true
      }, { passive: true })
      window.addEventListener('keydown', () => { P.gateOpen = true })
      document.documentElement.addEventListener('mouseleave', () => { P.ptrIn = false })
      window.addEventListener('blur', () => { P.ptrIn = false })
      P.E.stage.addEventListener('click', onTap)
      window.addEventListener('resize', U.debounce(() => { layout() }, 160))
      App.tick(frame)
    },
  })
})()
