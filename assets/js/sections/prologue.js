/* ==========================================================
   醒来 · prologue —— 网站的第一屏
   眼睑睁开：镜头在穹顶的天眼外俯视下去，穿过天眼落进厅里——圆桌、十三把高背扶手椅，光源就是光标。
   十三个人在 17:05 之前陆续醒来，先后每次随机（《洋馆物理层》§9：谁先谁后，开局时抽一次）；醒来时各坐自己编号
   的那一席，与房号无关（§9；卡司总则 §5）。
   往下滚：主持人的七条播报一句句浮现（《开局流程》§2 的原句；声音听不出从哪里来，画面上不给它出处），镜头斜下来——
     第一条说完，十三把钥匙一把把离开收纳台的钥匙龛；最后一把到手的那一刻，桌沿十三枚号牌同时无声地现出号码
     （1 号正北，顺时针；《主持人游戏》§1、各室/1F_穹顶议事厅.md），众人按自己所选的编号重新入座；
     第二条第一句说出的同时，每人面前的桌上出现十枚一摞的金币（没有理币盘）；随后从一号起依次自我介绍；
     第四条说完的那一刻，各人席位前的桌沿内侧出现规则卡；第五条，身份卡（两面空白）；
     第六条开口的同时，议事厅的三扇门自己打开（物理层 §9）；第七条说完，整个议事厅沉入黑暗，只剩眼睛与号码，
     一把钥匙落下，带进洋馆。
   天眼照窗光的时段明暗（物理层 3.1）：17:00—19:00 由亮渐无——天光的强弱跟着馆内时刻（App.state.minutes）。

   本文件同时提供 App.domeHall：穹顶议事厅的 Canvas 渲染器（终章 wish 复用同一张圆桌）。
   几何取自 WORLD.hall（build-data 由《洋馆物理层》§1.1 §2.1 §2.5 §3.1 §3.3 §9 与 各室/1F_穹顶议事厅.md 生成；
   单位米，原点在圆心，x 向东，y 向北，z 向上）：
     圆厅内径 13.2，墙高 6.6 处起穹顶，顶高 13.2，正中天眼直径 2.4；墙下部 2.6 m 熏橡木护壁，上部象牙白灰泥；
     穹顶白灰泥，三道金色细环，天眼下悬一环十三盏乳白球灯（黄铜灯环）；石材地面，圆桌下一面直径 8.4 的墨玉圆盘；
     圆桌直径 4.8、高 0.76，石面；桌沿嵌十三枚号牌，开局空白；十三把同式高背扶手椅（家具都是熏橡木）等距环绕，椅宽 0.62；
     墙上十三幅窄长丝绸织纹屏，与座椅的节奏相应；南、西、东三门居中，各宽 2.4、高 3.6；
     北墙两座玻璃罩柜（西：神圣罗马帝国皇冠；东：良渚玉琮王），两柜中间上方是挂钟；
     西门北侧侧案，上方弧墙嵌四层青铜平面图；东门北侧收纳台（钥匙龛十三钩：上排 1—7、下排 8—13），东门南侧价目铜牌。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const TAU = Math.PI * 2
  const DEG = Math.PI / 180

  /* =====================================================================
     几何常量（WORLD.hall；缺了就用同样的数）
     ===================================================================== */
  const WH = (window.WORLD && window.WORLD.hall) || {}
  const nv = (v, d) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : d)
  const OX = nv(WH.cx, 34.8), OY = nv(WH.cy, 20.4)
  const G = {
    R: nv(WH.r, 6.6), rOuter: nv(WH.rOuter, 7.8),
    wallH: nv(WH.springAt, 6.6), apex: nv(WH.apex, 13.2), ocR: nv(WH.oculus, 2.4) / 2,
    wains: 2.6, doorH: nv(WH.doorHeight, 3.6), roofZ: 15,
    disc: nv(WH.disc, 8.4) / 2,
    tableR: nv(WH.table && WH.table.d, 4.8) / 2, tableH: nv(WH.table && WH.table.h, 0.76), drumR: 1.05,
    seatR: 2.98, n: nv(WH.seats, 13) | 0, chairW: nv(WH.chairW, 0.62),
    lampR: 0.95, lampZ: 5.8, lamps: nv(WH.lamps, 13) | 0,
  }
  G.domeH = G.apex - G.wallH
  G.ocZ = G.wallH + G.domeH * Math.sqrt(Math.max(0, 1 - (G.ocR / G.R) ** 2)) // 天眼口的高度
  G.plateV = G.seatR - (G.tableR - 0.12) // 号牌中心：从席位往桌心走多远
  // 方位角：北为 0、顺时针（弧度）
  const azOf = (x, y) => Math.atan2(x - OX, y - OY)
  const CNT = WH.counter || {}
  const AZ_COUNTER = CNT.cx != null ? azOf(CNT.cx, CNT.cy) : 60 * DEG   // 东门北侧
  const AZ_PLAQUE = WH.plaque && WH.plaque.cx != null ? azOf(WH.plaque.cx, WH.plaque.cy) : 114.6 * DEG // 东门南侧
  const AZ_SIDE = TAU - AZ_COUNTER  // 西门北侧的侧案：与收纳台左右对称
  const AZ_CAB = 18 * DEG           // 北墙两座罩柜（只说在北墙、挂钟在两柜中间上方）
  // 三道门：南、西、东，居中，宽 2.4（物理层 1.3）
  const DIR_AZ = { 北: 0, 东: 90, 南: 180, 西: 270 }
  const hallRoom = window.WORLD && Array.isArray(window.WORLD.rooms) ? window.WORLD.rooms.find(r => r.name === (WH.name || '穹顶议事厅')) : null
  const DOORS = ((hallRoom && hallRoom.doors) || []).filter(d => d && d.dir in DIR_AZ).map(d => ({ az: DIR_AZ[d.dir] * DEG, w: nv(d.width, 2.4) }))
  if (!DOORS.length) for (const a of [180, 270, 90]) DOORS.push({ az: a * DEG, w: 2.4 })

  /* =====================================================================
     小工具
     ===================================================================== */
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
  const mix = (a, b, t) => a + (b - a) * t
  const norm3 = (x, y, z) => { const l = Math.sqrt(x * x + y * y + z * z) || 1; return [x / l, y / l, z / l] }
  const rgb = (r, g, b) => 'rgb(' + (r < 0 ? 0 : r > 255 ? 255 : r | 0) + ',' + (g < 0 ? 0 : g > 255 ? 255 : g | 0) + ',' + (b < 0 ? 0 : b > 255 ? 255 : b | 0) + ')'
  const hex = h => U.hexToRgb(h || '#c29a5b')
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  // 写样式：值没变就不写（免得每帧让元素重算样式）
  const css = (el, k, v) => { const c = el._css || (el._css = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v } }
  // 天眼的天光（物理层 3.1：05:00—07:00 由无渐亮，07:00—17:00 恒定最亮，17:00—19:00 由亮渐无，其余无）
  const dayK = minutes => {
    const m = (((minutes || 0) % 1440) + 1440) % 1440
    if (m < 300 || m >= 1140) return 0
    if (m < 420) return (m - 300) / 120
    if (m < 1020) return 1
    return 1 - (m - 1020) / 120
  }

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
    addPts(ctx, pts)
  }
  // 往当前路径里追加一个闭合子路径（几块拼成一条路径：一次 fill / clip）
  function addPts(ctx, pts) {
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
    return this.pt(x, y, z, null)
  }
  // 同上，写进 out（给每帧成百上千次的投影用，免得每次都新建数组）；out 为 null 时新建
  Camera.prototype.pt = function (x, y, z, out) {
    const dx = x - this.pos[0], dy = y - this.pos[1], dz = z - this.pos[2]
    const R = this.R, Up = this.Up, F = this.F
    const cz = dx * F[0] + dy * F[1] + dz * F[2]
    if (cz < this.near) return null
    const s = this.f / cz
    const sx = this.W / 2 + this.ox + (dx * R[0] + dy * R[1] + dz * R[2]) * s
    const sy = this.H / 2 + this.oy - (dx * Up[0] + dy * Up[1] + dz * Up[2]) * s
    if (!out) return [sx, sy, cz, s]
    out[0] = sx; out[1] = sy; out[2] = cz; out[3] = s
    return out
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

  /* =====================================================================
     低分辨率辅助画布：低频的东西（光池、影子、光束、眼眶、墙与穹顶的明暗）画在小画布上，
     再按全分辨率的轮廓（clip）贴回主画布——像素量只有原来的几分之一，看起来一样（这些本来就是柔和的渐变）
     ===================================================================== */
  const LQ = 0.2 // 光池（地面、墨玉、桌面、墙）：相对 CSS 像素
  const SQF = 1 / 6, SQT = 1 / 5 // 影子遮罩（地面的半影宽一些，桌面上的窄一些）
  const BQ = 0.25 // 落下的光束、天眼的天光
  const EQ = 0.25 // 眼眶
  const mkBuf = () => { const c = document.createElement('canvas'); c.width = c.height = 2; return { c, x: c.getContext('2d') } }
  // 正态分布的累积函数（眼眶边缘的高斯淡出）
  function phi(x) {
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2)
    return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y)
  }

  // 可复现的伪随机（石纹等固定的细节）
  const rnd = U.seeded(13017)
  const VEINS = []
  for (let i = 0; i < 9; i++) {
    const a0 = rnd() * TAU, r0 = 0.3 + rnd() * 1.8, pts = []
    let a = a0, r = r0
    for (let j = 0; j < 7; j++) {
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
      a += (rnd() - 0.5) * 0.5
      r = U.clamp(r + (rnd() - 0.5) * 0.5, 0.2, 2.1)
    }
    VEINS.push({ pts, w: 0.006 + rnd() * 0.012, a: 0.05 + rnd() * 0.07 })
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

  // 材质（反照率）：家具一律熏橡木（物理层开头）
  const OAK = [0.1, 0.072, 0.05]
  const OAK_IN = [0.082, 0.058, 0.043] // 座面、椅背朝里的一面：磨得更暗
  const SEAT_FACE = [OAK_IN, null, null, null, null, null]
  const BACK_FACE = [null, null, null, OAK_IN, null, null]
  const WALL_LO = [0.12, 0.085, 0.06]  // 熏橡木护壁
  const WALL_HI = [0.3, 0.29, 0.265]   // 象牙白灰泥（压暗：厅的明暗以光标与灯环为主）
  const DOME = [0.34, 0.33, 0.31]

  // 贴着弧墙的一件（宽 w）：背面是一条弦，弦的中点离圆心 rb；f 朝圆心，r 是面朝圆心时的右手
  function wallFrame(az, w, proud) {
    const sa = Math.sin(az), ca = Math.cos(az)
    const rb = Math.sqrt(Math.max(0, G.R * G.R - (w / 2) ** 2)) - (proud || 0)
    return { x: sa * rb, y: ca * rb, fx: -sa, fy: -ca, rx: -ca, ry: sa, az, w, rb }
  }

  /* =====================================================================
     App.domeHall.create(opts)：议事厅渲染器
     opts.canvas（必需）；opts.vignette：在最底下画一层暗角（醒来的舞台）
     返回场景对象 S：S.seats[0..12]、S.light、S.view、S.update(dt)、S.render()、S.resize()、
     S.needs(now)（这一帧要不要重画）、S.release()（远离视口时交还画布内存）、
     S.setPeople(ids)、S.pick(x, y)、S.seatScreen(k)、S.plateScreen(k)
     状态（0–1，可补间）：S.sky 天眼的天光、S.doorOpen 三扇门、S.keyT[k] 第 k+1 把钥匙离钩的进度（0 在钩上，1 已到手）；
     每席 s.coinA / s.coinN 面前那一摞金币、s.ruleA 规则卡、s.idA 身份卡
     ===================================================================== */
  function createHall(opts) {
    const o = Object.assign({
      lightCol: [255, 204, 154],   // 光（光标）的颜色：烛光
      amb: 0.07,                   // 环境光
      ambCol: [140, 134, 150],
      floorAlb: [0.62, 0.6, 0.56], // 石材地面
      discAlb: [0.2, 0.19, 0.18],  // 墨玉（抛光）
      tableAlb: [0.34, 0.335, 0.31], // 石面圆桌
      num: [214, 172, 102],        // 号码：黄铜
      numDim: [111, 85, 50],
      numOut: [150, 28, 28],       // 熄灭：锈红
      lampCol: [226, 180, 112],    // 席位小光池
      beamCol: [235, 227, 214],    // 天眼落下的一束光
      skyCol: [196, 208, 228],     // 阴天的天光
      skyPow: 0.95,
      ringCol: [255, 232, 204],    // 灯环：乳白玻璃球灯
      ringPow: 0.5,
      doorCol: [186, 176, 160],    // 门外（门厅、两院）的光
      glint: [190, 205, 255],
      rim: [222, 176, 108],        // 黑影的黄铜轮廓光
      silhouette: [9, 8, 8],
      motes: 70,
      blankNums: false,            // true：号牌未现出（lit = 0）时牌面空白（醒来）；false：未点亮的编号暗着可见（终章）
    }, opts)

    const S = {
      o, cam: new Camera(),
      W: 1, H: 1, dpr: 1,
      canvas: o.canvas, ctx: o.canvas.getContext('2d'),
      // 辅助画布：wal/flr/dsc/tbl 光池，mF/mT 地面与桌面的影子，rib 灯环、天眼与眼眶（景深），bm 光束，sky 天光，vig 暗角，lens 眼眶
      B: { wal: mkBuf(), flr: mkBuf(), dsc: mkBuf(), tbl: mkBuf(), mF: mkBuf(), mT: mkBuf(), rib: mkBuf(), bm: mkBuf(), sky: mkBuf(), vig: mkBuf(), lens: mkBuf() },
      ribQ: 0.5,        // 近景缓冲的比例（0 = 直接画在主画布上）
      dirty: true, released: false,
      seats: [],
      light: { x: 0, y: 0, z: 5.6, power: 1.1, range: 3, flick: 1 },
      home: { x: 0, y: 0, z: 5.6 },
      lampZ: 2.4, lampPow: 2.5, homePow: 1.5, lampRange: 3.5, homeRange: 4.2,
      ptr: { x: 0, y: 0, on: false },
      view: { elev: Math.PI / 2, yaw: 0, dist: 10.6, tx: 0, ty: 0, tz: 0.45, fk: 1, ox: 0, oy: 0 },
      dark: 0,          // 全局沉入黑暗 0–1
      ribA: 1,          // 穹顶（竖屏时压淡）
      numA: 1,          // 号码
      numDarkA: 0,      // 沉入黑暗后仍看得见的号码（画在黑幕之上）
      eyeA: 1,          // 眼睛
      wallA: 1,         // 墙与陈设
      poolA: 1,         // 光标光池
      glowA: 1,         // 光源自身的光晕
      floorA: 1,
      chandA: 1,        // 灯环
      sky: 1,           // 天眼的天光（0–1，跟着馆内时刻）
      skyA: 1,          // 天光那一柱的显隐
      doorOpen: 0,      // 三扇门 0 合拢 → 1 开足
      keyT: new Float64Array(G.n), keyTo: new Int8Array(G.n).fill(-1),
      lensA: 0, lensOpen: 1, lensW: 0.62, lensH: 0.6, // 杏仁形眼眶
      beam: { k: -1, amt: 0 },
      time: 0,
      motes: [],
      fit: 0.36,        // 正俯视时椅环半径占短边的比例
      numScale: 1,
      hoverK: -1, clock: 17 * 60,
      eyeQ: [], tilt: 0, ls: null, eyeScale: 1, gust: 0, eyePulse: 1, ripples: [],
    }
    // 常用颜色串（每帧不再拼字符串、解析颜色）
    const DISC_LINE = rgb(o.lightCol[0], o.lightCol[1] * 0.92, o.lightCol[2] * 0.85)
    const RIM = rgb(o.rim[0], o.rim[1], o.rim[2])
    const GOLD = 'rgb(196,158,88)', BRASS_DIM = 'rgb(111,85,50)'
    let lensKey = '', bmKey = '', skyKey = ''

    // 局部（u 右、v 前、z 上）→ 世界：s 是席位或贴墙的一件
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
        coinA: 0, coinN: 10, ruleA: 0, idA: 0, cflash: 0,
        yaw: 0, blink: 1, blinkT: 0, nextBlink: 2 + srnd() * 5,
        droop: (srnd() - 0.5) * 0.9, sway: srnd() * TAU, lag: 0.02 + srnd() * 0.05,
        tuft: [0, 1, 2, 3, 4, 5, 6].map(() => srnd() * srnd() * 0.32),
        K: null,
      }
      // 熏橡木高背扶手椅（静止，预先算好世界坐标）
      const hw = G.chairW / 2, BT = 1.26
      s.legs = [[-hw + 0.02, -hw + 0.07, -0.33, -0.28], [hw - 0.07, hw - 0.02, -0.33, -0.28], [-hw + 0.02, -hw + 0.07, 0.22, 0.27], [hw - 0.07, hw - 0.02, 0.22, 0.27]]
        .map(b => mkBox(s, b[0], b[1], b[2], b[3], 0, 0.41))
      s.seatB = mkBox(s, -hw + 0.02, hw - 0.02, -0.28, 0.28, 0.4, 0.47)
      s.backB = mkBox(s, -hw, hw, -0.35, -0.27, 0.44, BT)
      s.arms = [
        mkBox(s, -hw - 0.015, -hw + 0.025, 0.21, 0.25, 0.47, 0.66), mkBox(s, hw - 0.025, hw + 0.015, 0.21, 0.25, 0.47, 0.66),
        mkBox(s, -hw - 0.025, -hw + 0.035, -0.27, 0.27, 0.66, 0.71), mkBox(s, hw - 0.035, hw + 0.025, -0.27, 0.27, 0.66, 0.71),
      ]
      // 投影用的轮廓点：椅背顶、扶手前端、座面、椅脚落地处
      s.shPts = [
        L2W(s, -hw, -0.35, BT), L2W(s, hw, -0.35, BT), L2W(s, -hw, -0.27, BT), L2W(s, hw, -0.27, BT),
        L2W(s, -hw - 0.025, 0.27, 0.71), L2W(s, hw + 0.025, 0.27, 0.71), L2W(s, -hw + 0.02, 0.28, 0.45), L2W(s, hw - 0.02, 0.28, 0.45),
        L2W(s, -hw + 0.02, -0.33, 0), L2W(s, hw - 0.02, -0.33, 0), L2W(s, -hw + 0.02, 0.27, 0), L2W(s, hw - 0.02, 0.27, 0),
      ]
      s.shTop = s.shPts.slice(0, 4).concat([L2W(s, -hw, -0.31, 0.8), L2W(s, hw, -0.31, 0.8)])
      S.seats.push(s)
    }

    /* ---------- 陈设（贴着弧墙，各按自己的方位摆正） ---------- */
    const cntL = nv(CNT.l, 2.4) / 2, cntD = nv(CNT.d, 0.65), cntTop = nv(CNT.top, 1.05), cntH = nv(CNT.h, 1.8)
    const NI = CNT.niche || {}
    const niW = nv(NI.w, 1.6) / 2, niH = nv(NI.h, 0.64), niD = nv(NI.d, 0.12), niZ = nv(NI.z, 1.12)
    const panelD = niD + 0.06
    const ST = wallFrame(AZ_COUNTER, cntL * 2)
    const SBD = WH.sideboard || {}
    const SB = wallFrame(AZ_SIDE, nv(SBD.w, 2.4))
    const CBD = WH.cabinets || {}
    const cbW = nv(CBD.w, 2.2), cbD = nv(CBD.d, 0.55), cbH = nv(CBD.h, 1.25)
    const CW = wallFrame(-AZ_CAB, cbW), CE = wallFrame(AZ_CAB, cbW)
    const FURN = [
      { B: mkBox(ST, -cntL, cntL, 0, cntD, 0, cntTop), alb: OAK, spec: 0.5 },          // 东门北侧：收纳台
      { B: mkBox(ST, -cntL, cntL, 0, panelD, cntTop, cntH), alb: OAK, spec: 0.4, panel: true }, // 台后立板（钥匙龛）
      { B: mkBox(SB, -nv(SBD.w, 2.4) / 2, nv(SBD.w, 2.4) / 2, 0, nv(SBD.d, 0.55), 0, nv(SBD.h, 0.95)), alb: OAK, spec: 0.35 }, // 西门北侧：侧案
      { B: mkBox(CW, -cbW / 2, cbW / 2, 0, cbD, 0, 0.8), alb: OAK, spec: 0.4, glass: mkBox(CW, -cbW / 2, cbW / 2, 0, cbD, 0.8, cbH), item: [232, 190, 96] }, // 西柜：皇冠
      { B: mkBox(CE, -cbW / 2, cbW / 2, 0, cbD, 0, 0.8), alb: OAK, spec: 0.4, glass: mkBox(CE, -cbW / 2, cbW / 2, 0, cbD, 0.8, cbH), item: [150, 200, 160] },  // 东柜：玉琮
    ]
    // 钥匙龛的十三个挂钩：上排 1—7、下排 8—13，各排居中；从台前看，号码从左到右
    const KEYS = []
    const rows = Array.isArray(CNT.rows) && CNT.rows.length ? CNT.rows : [[1, 7], [8, 13]]
    const kGap = niW * 2 / 7.4
    rows.forEach((rw, ri) => {
      const n = rw[1] - rw[0] + 1
      for (let i = 0; i < n; i++) {
        const u = -(i - (n - 1) / 2) * kGap
        const z = niZ + niH * (ri === 0 ? 0.86 : 0.44)
        if (rw[0] + i - 1 < G.n) KEYS[rw[0] + i - 1] = { u, z, top: L2W(ST, u, panelD - niD + 0.03, z), bot: L2W(ST, u, panelD - niD + 0.03, z - 0.09) }
      }
    })
    for (let i = 0; i < G.n; i++) if (!KEYS[i]) KEYS[i] = KEYS[0]

    // 落座：ids 长度 13，元素为角色 id 或 null
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
      S.dirty = true
    }
    S.setPeople = ids => { for (const s of S.seats) S.setPerson(s.k, ids[s.k - 1]) }

    // 辅助画布按 CSS 尺寸 × q 定大小；返回已复位的 2D 上下文（变换 = 缩放 q，坐标仍用 CSS 像素）
    function bufCtx(b, q, clear) {
      const w = Math.max(2, Math.ceil(S.W * q)), h = Math.max(2, Math.ceil(S.H * q))
      if (b.c.width !== w || b.c.height !== h) { b.c.width = w; b.c.height = h }
      const x = b.x
      x.setTransform(1, 0, 0, 1, 0, 0)
      x.globalCompositeOperation = 'source-over'
      x.globalAlpha = 1
      if (clear) x.clearRect(0, 0, w, h)
      x.setTransform(q, 0, 0, q, 0, 0)
      return x
    }
    const blit = (ctx, b, q) => ctx.drawImage(b.c, 0, 0, b.c.width / q, b.c.height / q)

    S.resize = () => {
      const r = S.canvas.parentNode.getBoundingClientRect()
      const W = Math.max(2, Math.round(r.width)), H = Math.max(2, Math.round(r.height))
      const mob = App.isMobile()
      // 高分屏不乘满 dpr；像素预算随画质自适应下调（App.quality：2 全效果 → 0 最省）
      let dpr = Math.min(window.devicePixelRatio || 1, mob ? 2 : 1.5)
      const lvl = App.quality ? App.quality.level : 2
      const budget = (mob ? [0.45e6, 0.65e6, 0.9e6] : [0.6e6, 0.9e6, 1.3e6])[lvl]
      if (W * H * dpr * dpr > budget) dpr = Math.sqrt(budget / (W * H))
      S.W = W; S.H = H; S.dpr = dpr
      const c = S.canvas
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr)
      c.style.width = W + 'px'; c.style.height = H + 'px'
      // 近景（灯环、天眼口）：桌面版画在半分辨率缓冲里，放大贴回时的柔化就是景深；手机直接画
      S.ribQ = mob ? 0 : 0.5
      const B = S.B
      for (const k of ['wal', 'flr', 'dsc', 'tbl']) bufCtx(B[k], LQ)
      bufCtx(B.mF, SQF); bufCtx(B.mT, SQT)
      bufCtx(B.bm, BQ); bufCtx(B.sky, BQ)
      if (S.ribQ) bufCtx(B.rib, S.ribQ); else B.rib.c.width = B.rib.c.height = 1
      if (o.vignette) paintVignette(); else B.vig.c.width = B.vig.c.height = 1
      lensKey = ''; bmKey = ''; skyKey = ''
      S.cam.W = W; S.cam.H = H
      S.released = false
      S.dirty = true
    }
    // 板块远离视口时交还画布内存（scroll.js 的 'section:far'）；下次画之前自动 resize
    S.release = () => {
      if (S.released) return
      S.released = true
      S.canvas.width = S.canvas.height = 1
      for (const k in S.B) S.B[k].c.width = S.B[k].c.height = 1
      lensKey = ''; bmKey = ''; skyKey = ''
    }
    // 舞台底下的暗角（原来是 .prologue-sticky 的 CSS 背景，单独占一个整屏合成层）：画一次，每帧贴在最底下
    function paintVignette() {
      const q = 0.25, x = bufCtx(S.B.vig, q, true), W = S.W, H = S.H
      // radial-gradient(ellipse 70% 60% at 50% 50%, rgba(20,14,11,0), rgba(5,4,4,.55) 100%)
      const rx = W * 0.7, ry = H * 0.6
      x.setTransform(q, 0, 0, q * ry / rx, W * q / 2, H * q / 2)
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rx)
      g.addColorStop(0, 'rgba(20,14,11,0)')
      g.addColorStop(1, 'rgba(5,4,4,.55)')
      x.fillStyle = g
      x.fillRect(-W, -H * rx / ry, W * 2, H * 2 * rx / ry)
      x.setTransform(1, 0, 0, 1, 0, 0)
    }

    // 某点、某法线处的照度 → [r, g, b] 乘子（0–~2）：环境光 + 光标的光 + 天眼下那一环灯
    function lum(px, py, pz, nx, ny, nz, extra) {
      const L = S.light, lc = o.lightCol
      const dx = L.x - px, dy = L.y - py, dz = L.z - pz
      const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2) || 1
      const lam = Math.max(0, (dx * nx + dy * ny + dz * nz) / d)
      const e = L.power * L.flick * lam / (1 + d2 / (L.range * L.range)) * S.poolA
      const up = nz > 0 ? nz : 0
      const a = o.amb * (0.45 + 0.55 * up)
      // 灯环（看作圆心上方 lampZ 处的一盏）
      const gz = G.lampZ - pz, g2 = px * px + py * py + gz * gz, gd = Math.sqrt(g2) || 1
      const ge = o.ringPow * S.chandA * Math.max(0, (-px * nx - py * ny + gz * nz) / gd) / (1 + g2 / 20)
      const rc = o.ringCol
      let r = (o.ambCol[0] / 255) * a + (lc[0] / 255) * e + (rc[0] / 255) * ge
      let g = (o.ambCol[1] / 255) * a + (lc[1] / 255) * e + (rc[1] / 255) * ge
      let b = (o.ambCol[2] / 255) * a + (lc[2] / 255) * e + (rc[2] / 255) * ge
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
        const ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1, vl = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1
        const hx = lx / ll + vx / vl, hy = ly / ll + vy / vl, hz = lz / ll + vz / vl
        const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1
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
    // 席位附加的顶光（小光池 / 天眼落下的一束光）
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
    const TOP_LO = circle(0, 0, G.tableH - 0.06, G.tableR - 0.01, 60)
    const DRUM_T = circle(0, 0, G.tableH - 0.06, G.drumR, 36), DRUM_B = circle(0, 0, 0, G.drumR * 1.08, 36)
    const RINGS = [1.75, 0.98, 0.3].map(r => circle(0, 0, G.tableH + 0.001, r, 90))
    const DISC = circle(0, 0, 0.002, G.disc, 112)
    const FLOOR = circle(0, 0, 0, G.R, 120)
    const LAMP_RING = circle(0, 0, G.lampZ + 0.07, G.lampR, 64)
    const OC_LO = circle(0, 0, G.ocZ, G.ocR, 72), OC_HI = circle(0, 0, G.roofZ, G.ocR, 72)

    function hullScreen(pts3) {
      const q = []
      for (const p of pts3) { const s = S.cam.p(p[0], p[1], p[2]); if (s) q.push([s[0], s[1]]) }
      return q.length > 2 ? hull(q) : null
    }

    /* ---------- 光池：平面上一点附近的照度渐变（加色） ----------
       org 平面上光源垂足；ax、ay 平面内两轴（单位向量；放长即把光池拉成椭圆）；dp 光源到平面的距离 */
    function pool(ctx, org, ax, ay, dp, power, range, col, alb, maxR, alpha, k) {
      if (alpha <= 0.002 || dp <= 0.01 || power <= 0.002) return
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
      if (k == null) k = S.dpr
      ctx.setTransform((p1[0] - p0[0]) * k, (p1[1] - p0[1]) * k, (p2[0] - p0[0]) * k, (p2[1] - p0[1]) * k, p0[0] * k, p0[1] * k)
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, maxR, 0, TAU); ctx.fill()
      ctx.setTransform(k, 0, 0, k, 0, 0)
    }
    // 某一平面上的天光、灯环（每层光池共用）
    function ambientPools(x, h, alb, maxSky) {
      if (S.sky > 0.01) pool(x, [0, 0, h], [1, 0, 0], [0, 1, 0], G.ocZ - h, o.skyPow * S.sky * S.skyA, 9, o.skyCol, alb, maxSky, 1, LQ)
      pool(x, [0, 0, h], [1, 0, 0], [0, 1, 0], G.lampZ - h, o.ringPow * S.chandA, 4.6, o.ringCol, alb, 8, 1, LQ)
    }

    // 平面上的局部坐标系：原点 P0，x 轴 ax、y 轴 ay（世界单位向量），一个单位 = m 米（仿射近似，给小物件用）
    function plane(ctx, P0, ax, ay, m) {
      const c = S.cam
      const p0 = c.p(P0[0], P0[1], P0[2])
      const p1 = c.p(P0[0] + ax[0] * m, P0[1] + ax[1] * m, P0[2] + ax[2] * m)
      const p2 = c.p(P0[0] + ay[0] * m, P0[1] + ay[1] * m, P0[2] + ay[2] * m)
      if (!p0 || !p1 || !p2) return null
      const k = S.dpr
      ctx.setTransform((p1[0] - p0[0]) * k, (p1[1] - p0[1]) * k, (p2[0] - p0[0]) * k, (p2[1] - p0[1]) * k, p0[0] * k, p0[1] * k)
      return p0
    }
    const unplane = ctx => ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0)

    /* ---------- 圆墙、穹顶的可见范围 ----------
       镜头在厅里（正俯视附近）时整圈都画；退到厅外时只留远处那一半（剖面），近处的半圈连同穹顶切掉，免得挡住圆桌 */
    let ARC = null, ARC_SPAN = TAU
    const AZL = []
    function computeArc() {
      const C = S.cam.pos
      const h = Math.hypot(C[0], C[1])
      const T = G.R * (1 - sstep(1, 4.5, h))
      AZL.length = 0
      if (h < 1e-6 || T >= h) {
        ARC = null; ARC_SPAN = TAU
        for (let i = 0; i <= 72; i++) AZL.push(i / 72 * TAU)
        return
      }
      const phc = Math.acos(Math.max(-1, Math.min(1, T / h)))
      const caz = Math.atan2(C[0], C[1])
      ARC = [caz + phc, caz + TAU - phc]
      ARC_SPAN = ARC[1] - ARC[0]
      const n = Math.max(2, Math.ceil(ARC_SPAN / (5 * DEG)))
      for (let i = 0; i <= n; i++) AZL.push(ARC[0] + ARC_SPAN * i / n)
    }
    // 方位 a 在可见范围内（m > 0 放宽、m < 0 收紧，弧度）
    const azVis = (a, m) => {
      if (!ARC) return true
      m = m || 0
      const d = (((a - ARC[0]) % TAU) + TAU) % TAU
      return m >= 0 ? d <= ARC_SPAN + m || d >= TAU - m : d >= -m && d <= ARC_SPAN + m
    }
    // 四边形路径（四个角都在近平面前面时直接连，不新建数组；否则走近平面裁切）
    const QA = [0, 0, 0, 0], QB = [0, 0, 0, 0], QC = [0, 0, 0, 0], QD = [0, 0, 0, 0]
    function quad(x, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
      const c = S.cam
      const a = c.pt(ax, ay, az, QA), b = c.pt(bx, by, bz, QB), e = c.pt(cx, cy, cz, QC), f = c.pt(dx, dy, dz, QD)
      if (a && b && e && f) {
        x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.lineTo(e[0], e[1]); x.lineTo(f[0], f[1]); x.closePath()
        return true
      }
      const q = c.poly([[ax, ay, az], [bx, by, bz], [cx, cy, cz], [dx, dy, dz]])
      if (!q) return false
      pathPts(x, q)
      return true
    }
    const wallPt = (a, r, z) => [Math.sin(a) * r, Math.cos(a) * r, z]
    // 穹顶上的点：纬度 th（0 是起拱处）
    const domePt = (a, th) => { const r = G.R * Math.cos(th); return [Math.sin(a) * r, Math.cos(a) * r, G.wallH + G.domeH * Math.sin(th)] }
    const TH_OC = Math.acos(Math.min(1, G.ocR / G.R))
    const DOME_TH = [0, 0.32, 0.64, 0.96, 1.22, TH_OC]
    const GOLD_TH = [0.42, 0.86, 1.2].filter(t => t < TH_OC - 0.03) // 三道金色细环
    const SCREENS = Array.from({ length: G.n }, (_, i) => (i * TAU) / G.n) // 与座椅同一节奏
    // 门：弦上的局部坐标（u 沿门宽，v 朝圆心）
    for (const d of DOORS) d.F = wallFrame(d.az, d.w)
    const PL = wallFrame(AZ_PLAQUE, nv(WH.plaque && WH.plaque.w, 0.9), 0.05)
    const FP = wallFrame(AZ_SIDE, nv(WH.floorPlan && WH.floorPlan.w, 2.4), 0.01)
    const CLK = wallFrame(0, 0.4, 0.02)

    // 本帧的地面、墨玉圆盘、桌面轮廓（屏幕坐标；render 开头算一次）
    let FL = null, DP = null, TP = null
    // 屏幕上一组点的外接框，外扩 pad
    function bbox(list, pad) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
      for (const pts of list) for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1] }
      return [Math.max(-pad, x0 - pad), Math.max(-pad, y0 - pad), Math.min(S.W + pad, x1 + pad), Math.min(S.H + pad, y1 + pad)]
    }
    function clipBox(x, b) { x.beginPath(); x.rect(b[0], b[1], b[2] - b[0], b[3] - b[1]); x.clip() }
    // 主画布按「整屏减去若干块」裁切（evenodd：几块互不重叠、且都在第一块里面）
    function clipOut(ctx, outer, holes) {
      ctx.beginPath()
      if (outer) addPts(ctx, outer); else ctx.rect(-8, -8, S.W + 16, S.H + 16)
      for (const h of holes) if (h) addPts(ctx, h)
      ctx.clip('evenodd')
    }
    // 一圈（世界坐标的点由 fn(a) 给出）沿可见的方位折线描出来
    function arcLine(ctx, fn) {
      const c = S.cam
      let open = false
      ctx.beginPath()
      for (const a of AZL) {
        const P = fn(a)
        const q = c.pt(P[0], P[1], P[2], TMP)
        if (!q) { open = false; continue }
        if (open) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); open = true }
      }
      ctx.stroke()
    }

    /* ---------- 圆墙、穹顶、织纹屏、门、挂钟、平面图、价目铜牌 ---------- */
    function drawWalls(ctx) {
      // 墙面本身始终是一层墨色（挡住身后的烟雾）；墙上的光与细节随 wallA 淡出
      const c = S.cam, Lt = S.light, Af = 1 - S.dark * 0.9, A = S.wallA * Af
      if (Af <= 0.01) return
      const C = c.pos, R = G.R
      ctx.save()
      // 地面以外的整片（暗角 + 墙面 + 穹顶的明暗，都是低频）画进 1/5 分辨率缓冲，按「整屏减去地面」贴回一次
      const x = bufCtx(S.B.wal, LQ, true)
      if (o.vignette) {
        x.setTransform(1, 0, 0, 1, 0, 0)
        x.drawImage(S.B.vig.c, 0, 0)
        x.setTransform(LQ, 0, 0, LQ, 0, 0)
      }
      const ov = 0.6 * DEG // 相邻两段叠一点，免得低分辨率下露出接缝
      // 穹顶（只在斜视时看得见远处那一半的内面）：白灰泥，按纬带、经段平涂
      const domeOn = S.tilt > 0.05 && S.ribA > 0.01
      if (domeOn) {
        x.globalAlpha = Af * S.ribA
        for (let i = 0; i + 1 < AZL.length; i += 2) {
          const a0 = AZL[i], a1 = AZL[Math.min(AZL.length - 1, i + 2)] + ov, am = (a0 + a1) / 2
          const s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1), smm = Math.sin(am), cmm = Math.cos(am)
          for (let j = 0; j + 1 < DOME_TH.length; j++) {
            const t0 = DOME_TH[j], t1 = DOME_TH[j + 1], tm = (t0 + t1) / 2
            const r0 = G.R * Math.cos(t0), r1 = G.R * Math.cos(t1), z0 = G.wallH + G.domeH * Math.sin(t0), z1 = G.wallH + G.domeH * Math.sin(t1)
            const rm = G.R * Math.cos(tm), Px = smm * rm, Py = cmm * rm, Pz = G.wallH + G.domeH * Math.sin(tm)
            const n = norm3(-Px, -Py, G.wallH - Pz)
            if ((C[0] - Px) * n[0] + (C[1] - Py) * n[1] + (C[2] - Pz) * n[2] <= 0) continue
            if (!quad(x, s0 * r0, c0 * r0, z0, s1 * r0, c1 * r0, z0, s1 * r1, c1 * r1, z1, s0 * r1, c0 * r1, z1)) continue
            x.fillStyle = shade(DOME, Px, Py, Pz, n[0], n[1], n[2], null, 0)
            x.fill()
          }
        }
      }
      // 墙：下部熏橡木护壁、上部象牙白灰泥
      x.globalAlpha = Af
      for (let i = 0; i + 1 < AZL.length; i++) {
        const a0 = AZL[i], a1 = AZL[i + 1] + (i + 2 < AZL.length || !ARC ? ov : 0), am = (AZL[i] + AZL[i + 1]) / 2
        const sm = Math.sin(am), cm = Math.cos(am)
        const ax = Math.sin(a0) * R, ay = Math.cos(a0) * R, bx = Math.sin(a1) * R, by = Math.cos(a1) * R
        for (let b = 0; b < 2; b++) {
          const z0 = b ? G.wains : 0, z1 = b ? G.wallH : G.wains
          if (!quad(x, ax, ay, z0, bx, by, z0, bx, by, z1, ax, ay, z1)) continue
          x.fillStyle = shade(b ? WALL_HI : WALL_LO, sm * R, cm * R, (z0 + z1) / 2, -sm, -cm, 0, null, 0)
          x.fill()
        }
      }
      // 剖面：厚 1.2 m 的鼓座墙在切口处的断面
      if (ARC) {
        x.fillStyle = 'rgb(13,10,10)'
        for (const a of ARC) {
          const q = c.poly([wallPt(a, R, 0), wallPt(a, G.rOuter, 0), wallPt(a, G.rOuter, G.wallH), wallPt(a, R, G.wallH)])
          if (q) { pathPts(x, q); x.fill() }
        }
      }
      x.globalAlpha = 1
      ctx.save()
      clipOut(ctx, null, [FL])
      blit(ctx, S.B.wal, LQ)
      ctx.restore()

      const near = (px, py, pz) => { const d2 = (px - Lt.x) ** 2 + (py - Lt.y) ** 2 + (pz - Lt.z) ** 2; return Lt.power * Lt.flick * S.poolA / (1 + d2 / (Lt.range * Lt.range * 1.6)) }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      // 线：护壁上沿、起拱线
      ctx.strokeStyle = BRASS_DIM
      ctx.lineWidth = 1
      ctx.globalAlpha = A * 0.32
      arcLine(ctx, a => wallPt(a, R - 0.01, G.wains))
      ctx.lineWidth = 1.3
      ctx.globalAlpha = A * 0.26
      arcLine(ctx, a => wallPt(a, R - 0.01, G.wallH))
      // 穹顶的三道金色细环与天眼口
      if (domeOn) {
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 1
        ctx.globalAlpha = A * S.ribA * 0.45
        for (const th of GOLD_TH) arcLine(ctx, a => domePt(a, th))
        ctx.globalAlpha = A * S.ribA * 0.35
        const q = c.poly(OC_LO)
        if (q) { pathPts(ctx, q); ctx.stroke() }
      }
      // 剖面的边
      if (ARC) {
        ctx.strokeStyle = BRASS_DIM
        ctx.globalAlpha = A * 0.4
        ctx.lineWidth = 1
        for (const a of ARC) {
          const q = c.poly([wallPt(a, R, 0), wallPt(a, G.rOuter, 0), wallPt(a, G.rOuter, G.wallH), wallPt(a, R, G.wallH)])
          if (q) { pathPts(ctx, q); ctx.stroke() }
        }
      }
      // 十三幅窄长丝绸织纹屏（墙上部的灰泥上，与座椅同一节奏，避开门与陈设）
      for (const a of SCREENS) {
        if (!azVis(a, -1.5 * DEG)) continue
        const sa = Math.sin(a), ca = Math.cos(a), hw = 0.25, r = Math.sqrt(R * R - hw * hw) - 0.01
        const sx = sa * r, sy = ca * r, tx = ca, ty = -sa
        const z0 = 3.95, z1 = 6.2
        const q = c.poly([[sx - tx * hw, sy - ty * hw, z0], [sx + tx * hw, sy + ty * hw, z0], [sx + tx * hw, sy + ty * hw, z1], [sx - tx * hw, sy - ty * hw, z1]])
        if (!q) continue
        const m = Math.min(1, near(sx, sy, 4.8) * 0.9 + 0.12)
        ctx.globalAlpha = A
        pathPts(ctx, q)
        const top = c.p(sx, sy, z1), bot = c.p(sx, sy, z0)
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
        if (top && bot && Math.abs(top[1] - bot[1]) > 30) {
          ctx.globalAlpha = A * (0.06 + 0.22 * m)
          ctx.beginPath()
          for (const f of [-0.33, 0.33]) {
            const pa = c.p(sx + tx * hw * f, sy + ty * hw * f, z1 - 0.15), pb = c.p(sx + tx * hw * f, sy + ty * hw * f, z0 + 0.15)
            if (pa && pb) { ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]) }
          }
          ctx.stroke()
        }
      }
      // 三道门（南、西、东）：合拢时两扇熏橡木门扇；第六条播报开口的同时自己向厅里打开，门外的光照进来
      const op = easeIO(clamp01(S.doorOpen))
      for (const d of DOORS) {
        if (!azVis(d.az, 4 * DEG)) continue
        const F = d.F, hw = d.w / 2, H = G.doorH
        const q = c.poly([L2W(F, -hw, 0, 0), L2W(F, hw, 0, 0), L2W(F, hw, 0, H), L2W(F, -hw, 0, H)])
        if (q) {
          ctx.globalAlpha = A
          pathPts(ctx, q)
          ctx.fillStyle = 'rgb(5,4,4)'
          ctx.fill()
          if (op > 0.01) {
            const k = 0.45 + 0.55 * S.sky
            ctx.globalAlpha = A * op
            ctx.fillStyle = rgb(o.doorCol[0] * 0.5 * k, o.doorCol[1] * 0.5 * k, o.doorCol[2] * 0.5 * k)
            ctx.fill()
          }
          ctx.globalAlpha = A * 0.45
          ctx.strokeStyle = BRASS_DIM
          ctx.lineWidth = 1
          ctx.stroke()
        }
        const th = op * 1.42
        for (const sd of [-1, 1]) {
          const hu = sd * hw, eu = hu - sd * hw * Math.cos(th), ev = hw * Math.sin(th)
          const lq = c.poly([L2W(F, hu, 0.03, 0), L2W(F, eu, ev + 0.03, 0), L2W(F, eu, ev + 0.03, H), L2W(F, hu, 0.03, H)])
          if (!lq) continue
          // 门扇的法线（朝圆心那一面）
          const du = eu - hu, dv = ev, dl = Math.hypot(du, dv) || 1
          let nu = -dv / dl, nvv = du / dl
          if (nvv < 0) { nu = -nu; nvv = -nvv }
          const nx = nu * F.rx + nvv * F.fx, ny = nu * F.ry + nvv * F.fy
          const M = L2W(F, (hu + eu) / 2, ev / 2, H / 2)
          const facing = (C[0] - M[0]) * nx + (C[1] - M[1]) * ny
          ctx.globalAlpha = A
          pathPts(ctx, lq)
          ctx.fillStyle = shade(OAK, M[0], M[1], M[2], facing >= 0 ? nx : -nx, facing >= 0 ? ny : -ny, 0, null, 0.35)
          ctx.fill()
          ctx.globalAlpha = A * 0.3
          ctx.strokeStyle = BRASS_DIM
          ctx.stroke()
        }
      }
      // 北墙挂钟（钟心离地 2.5 m，两座罩柜中间上方），指针随 S.clock（馆内分钟）
      if (azVis(0, -2 * DEG)) {
        const P0 = L2W(CLK, 0, 0, 2.5)
        if ((C[0] - P0[0]) * CLK.fx + (C[1] - P0[1]) * CLK.fy > 0 && plane(ctx, P0, [-CLK.rx, -CLK.ry, 0], [0, 0, -1], 0.01)) {
          const m = near(P0[0], P0[1], 2.5)
          ctx.globalAlpha = A * (0.35 + Math.min(0.6, m))
          ctx.fillStyle = 'rgb(30,26,24)'
          ctx.strokeStyle = 'rgb(170,160,150)'
          ctx.lineWidth = 1.6
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.stroke()
          const mins = S.clock || 17 * 60
          const ha = ((mins / 60) % 12) / 12 * TAU, ma = (mins % 60) / 60 * TAU
          ctx.beginPath()
          ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ha) * 10, -Math.cos(ha) * 10)
          ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ma) * 15.6, -Math.cos(ma) * 15.6)
          ctx.stroke()
          unplane(ctx)
        }
      }
      // 西门北侧侧案上方：青铜四层平面图（B1、1F、2F、3F 从左到右；只画轮廓）
      if (azVis(AZ_SIDE, -6 * DEG)) {
        const fpH = nv(WH.floorPlan && WH.floorPlan.h, 1), fpZ = nv(WH.floorPlan && WH.floorPlan.z, 1.1)
        const P0 = L2W(FP, 0, 0, fpZ + fpH / 2), fw = FP.w * 50, fh = fpH * 50
        if ((C[0] - P0[0]) * FP.fx + (C[1] - P0[1]) * FP.fy > 0 && plane(ctx, P0, [-FP.rx, -FP.ry, 0], [0, 0, -1], 0.01)) {
          const m = near(P0[0], P0[1], P0[2])
          ctx.globalAlpha = A
          ctx.fillStyle = shade([0.24, 0.17, 0.09], P0[0], P0[1], P0[2], FP.fx, FP.fy, 0, null, 1.4)
          ctx.fillRect(-fw, -fh, fw * 2, fh * 2)
          ctx.strokeStyle = rgb(150, 116, 64)
          ctx.globalAlpha = A * (0.3 + Math.min(0.5, m))
          ctx.lineWidth = 2
          ctx.strokeRect(-fw, -fh, fw * 2, fh * 2)
          ctx.lineWidth = 1.4
          const cw = (fw * 2 - 30) / 4
          for (let i = 0; i < 4; i++) {
            const x0 = -fw + 6 + i * (cw + 6), y0 = -fh + 22
            ctx.strokeRect(x0, y0, cw, fh * 2 - 40)
            ctx.beginPath(); ctx.arc(x0 + cw / 2, 0, Math.min(cw, fh) * 0.22, 0, TAU); ctx.stroke()
          }
          unplane(ctx)
        }
      }
      // 东门南侧：价目铜牌（青铜牌面，凹刻文字分三栏，框面突出墙面 5 cm）
      if (azVis(AZ_PLAQUE, -2 * DEG)) {
        const plW = nv(WH.plaque && WH.plaque.w, 0.9), plH = nv(WH.plaque && WH.plaque.h, 1.6), plZ = nv(WH.plaque && WH.plaque.z, 1.6)
        const P0 = L2W(PL, 0, 0, plZ), pw = plW * 50, ph = plH * 50
        if ((C[0] - P0[0]) * PL.fx + (C[1] - P0[1]) * PL.fy > 0 && plane(ctx, P0, [-PL.rx, -PL.ry, 0], [0, 0, -1], 0.01)) {
          const m = irr(P0[0], P0[1], P0[2])
          ctx.globalAlpha = A
          ctx.fillStyle = shade([0.22, 0.16, 0.08], P0[0], P0[1], P0[2], PL.fx, PL.fy, 0, null, 1.6)
          ctx.fillRect(-pw, -ph, pw * 2, ph * 2)
          ctx.strokeStyle = rgb(150, 116, 64)
          ctx.globalAlpha = A * (0.35 + Math.min(0.5, m))
          ctx.lineWidth = 2.4
          ctx.strokeRect(-pw, -ph, pw * 2, ph * 2)
          ctx.globalAlpha = A * (0.16 + Math.min(0.4, m * 0.6))
          ctx.lineWidth = 1.6
          ctx.beginPath()
          const colW = (pw * 2 - 20) / 3
          for (let col = 0; col < 3; col++) {
            const x0 = -pw + 8 + col * (colW + 2)
            for (let i = 0; i < 14; i++) {
              const y = -ph + 16 + i * 10.4
              ctx.moveTo(x0, y); ctx.lineTo(x0 + colW * (0.5 + ((i * 7 + col * 3) % 5) * 0.1), y)
            }
          }
          ctx.stroke()
          unplane(ctx)
        }
      }
      ctx.restore()
    }

    /* ---------- 地面：石材 + 墨玉圆盘 ---------- */
    // 墨玉里的放射纹：端点固定，预先算好；每帧按亮度分桶，同一亮度的一次描完
    const DISC_RAYS = []
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * TAU + (i % 3) * 0.004
      const r0 = 2.5 + ((i * 37) % 11) / 30, r1 = G.disc - 0.06 - ((i * 53) % 7) / 25
      DISC_RAYS.push({ x0: Math.cos(a) * r0, y0: Math.sin(a) * r0, x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, mx: Math.cos(a) * 3.3, my: Math.sin(a) * 3.3 })
    }
    const rayBk = new Map(), RP0 = [0, 0, 0, 0], RP1 = [0, 0, 0, 0]
    function drawFloor(ctx) {
      const c = S.cam, Lt = S.light
      const fl = FL
      if (!fl) return
      const fa = S.floorA
      const amb = o.amb
      const dp = DP
      // 地面的光（低频）：1/5 分辨率缓冲 → 按全分辨率的轮廓贴回（挖掉随后整块盖上的墨玉圆盘）
      let x = bufCtx(S.B.flr, LQ)
      x.save()
      clipBox(x, bbox([fl], 8))
      x.fillStyle = rgb(o.floorAlb[0] * o.ambCol[0] * amb * 0.5, o.floorAlb[1] * o.ambCol[1] * amb * 0.5, o.floorAlb[2] * o.ambCol[2] * amb * 0.5)
      x.fillRect(0, 0, S.W + 8, S.H + 8)
      x.globalCompositeOperation = 'lighter'
      // 一层极淡的环境光，中央略亮
      pool(x, [0, 0, 0], [1, 0, 0], [0, 1, 0], 7.2, 1, 7.5, o.ambCol, o.floorAlb, 11, amb * 0.9, LQ)
      ambientPools(x, 0, o.floorAlb, 4.4)
      // 光标
      pool(x, [Lt.x, Lt.y, 0], [1, 0, 0], [0, 1, 0], Lt.z, Lt.power * Lt.flick, Lt.range, o.lightCol, o.floorAlb, 12, S.poolA, LQ)
      // 门开着：门外的光从门洞铺进来
      if (S.doorOpen > 0.01) {
        const op = easeIO(clamp01(S.doorOpen)) * (0.5 + 0.5 * S.sky)
        for (const d of DOORS) {
          const sa = Math.sin(d.az), ca = Math.cos(d.az)
          pool(x, [sa * (G.R - 0.9), ca * (G.R - 0.9), 0], [-sa * 1.9, -ca * 1.9, 0], [ca * 0.9, -sa * 0.9, 0], 1.4, 1.1 * op, 2.2, o.doorCol, o.floorAlb, 1.7, 1, LQ)
        }
      }
      x.restore()
      ctx.save()
      clipOut(ctx, fl, [dp])
      ctx.globalAlpha = fa
      blit(ctx, S.B.flr, LQ)
      ctx.restore()

      // 墨玉圆盘（同样：光池在缓冲里，轮廓全分辨率；挖掉随后整块盖上的桌面）
      if (!dp) return
      x = bufCtx(S.B.dsc, LQ)
      x.save()
      clipBox(x, bbox([dp], 8))
      x.fillStyle = rgb(o.discAlb[0] * o.ambCol[0] * amb * 0.6, o.discAlb[1] * o.ambCol[1] * amb * 0.6, o.discAlb[2] * o.ambCol[2] * amb * 0.6)
      x.fillRect(0, 0, S.W + 8, S.H + 8)
      x.globalCompositeOperation = 'lighter'
      ambientPools(x, 0.002, o.discAlb, 4.4)
      pool(x, [Lt.x, Lt.y, 0], [1, 0, 0], [0, 1, 0], Lt.z, Lt.power * Lt.flick, Lt.range, o.lightCol, o.discAlb, 12, S.poolA, LQ)
      // 席位小光池 / 一束光（落在墨玉上）
      const R9 = DISC_RAYS[DISC_RAYS.length - 1]
      x.globalAlpha = Math.min(1, fa * (0.02 + o.amb * 0.12 + Lt.power * Lt.flick * S.poolA / (1 + ((R9.mx - Lt.x) ** 2 + (R9.my - Lt.y) ** 2 + Lt.z * Lt.z) / (Lt.range * Lt.range)) * 0.1))
      for (const s of S.seats) {
        const ex = seatExtra(s)
        if (!ex) continue
        const beam = S.beam.k === s.k - 1
        pool(x, [s.x + s.fx * 0.05, s.y + s.fy * 0.05, 0], [1, 0, 0], [0, 1, 0], beam ? 2.2 : 1.3, ex.amt * (beam ? 1.6 : 1.3), beam ? 1.4 : 1.0, ex.col, [0.5, 0.47, 0.43], beam ? 3 : 2, 1, LQ)
      }
      x.restore()
      ctx.save()
      clipOut(ctx, dp, [TP])
      ctx.globalAlpha = fa
      blit(ctx, S.B.dsc, LQ)
      ctx.globalCompositeOperation = 'lighter'
      // 墨玉里的放射纹（极淡，像虹膜）
      ctx.lineWidth = 1
      ctx.strokeStyle = DISC_LINE
      const pw = Lt.power * Lt.flick * S.poolA, rr = Lt.range * Lt.range, z2 = Lt.z * Lt.z, base = 0.02 + o.amb * 0.12
      for (const R of DISC_RAYS) {
        const d2 = (R.mx - Lt.x) ** 2 + (R.my - Lt.y) ** 2 + z2
        const key = Math.round(fa * (base + pw / (1 + d2 / rr) * 0.1) * 250)
        if (key <= 0) continue
        const p0 = c.pt(R.x0, R.y0, 0.003, RP0), p1 = c.pt(R.x1, R.y1, 0.003, RP1)
        if (!p0 || !p1) continue
        let L = rayBk.get(key)
        if (!L) rayBk.set(key, (L = []))
        L.push(p0[0], p0[1], p1[0], p1[1])
      }
      for (const [key, L] of rayBk) {
        if (!L.length) continue
        ctx.globalAlpha = key / 250
        ctx.beginPath()
        for (let i = 0; i < L.length; i += 4) { ctx.moveTo(L[i], L[i + 1]); ctx.lineTo(L[i + 2], L[i + 3]) }
        ctx.stroke()
        L.length = 0
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()
      // 圆盘外缘的细缝
      ctx.save()
      pathPts(ctx, dp)
      ctx.globalAlpha = fa * 0.5
      ctx.strokeStyle = BRASS_DIM
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
    // 影子：低分辨率的遮罩（不加滤镜），放大贴回时的双线性插值本身就是柔和的半影；只贴影子覆盖的那一块
    function shadowPass(ctx, h, polys, alpha, q, m) {
      if (alpha <= 0.01 || !polys.length) return
      const sc = bufCtx(m, q, true)
      sc.fillStyle = '#000'
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
      sc.beginPath()
      for (const poly of polys) {
        if (!poly || poly.length < 3) continue
        for (const p of poly) p[2] = h
        const pts = S.cam.poly(poly)
        if (!pts) continue
        // 统一绕向后并进一条路径（一次 fill；nonzero 下重叠处仍是并集）
        let a2 = 0
        for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], r = pts[(i + 1) % n]; a2 += p[0] * r[1] - r[0] * p[1] }
        if (a2 < 0) pts.reverse()
        addPts(sc, pts)
        for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1] }
      }
      sc.fill()
      const bw = m.c.width, bh = m.c.height
      const ix0 = Math.max(0, Math.floor(x0 * q) - 2), iy0 = Math.max(0, Math.floor(y0 * q) - 2)
      const ix1 = Math.min(bw, Math.ceil(x1 * q) + 2), iy1 = Math.min(bh, Math.ceil(y1 * q) + 2)
      if (ix1 <= ix0 || iy1 <= iy0) return
      const sw = ix1 - ix0, sh = iy1 - iy0
      ctx.globalAlpha = alpha
      ctx.drawImage(m.c, ix0, iy0, sw, sh, ix0 / q, iy0 / q, sw / q, sh / q)
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
      if (!FL) return
      ctx.save()
      clipOut(ctx, FL, [TP]) // 桌面那块随后整块盖上
      shadowPass(ctx, 0, polys, shadowAlpha(), SQF, S.B.mF)
      ctx.restore()
    }

    /* ---------- 席位脚下的涟漪（醒来 / 熄灭的一拍） ---------- */
    S.ripple = (k, col, inward) => { S.ripples.push({ k, t: 0, col: col || [214, 172, 102], inward: !!inward }) }
    // 涟漪的时间在 S.update 里推进（跳过不画的帧也照常走）
    function drawRipples(ctx) {
      if (!S.ripples.length) return
      ctx.lineWidth = 1
      for (let i = S.ripples.length - 1; i >= 0; i--) {
        const r = S.ripples[i]
        if (r.t >= 1) continue
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
        // 石座
        const d = hullScreen(DRUM_T.concat(DRUM_B))
        if (d) {
          pathPts(ctx, d)
          ctx.fillStyle = shade([0.16, 0.155, 0.145], hn[0] * G.drumR, hn[1] * G.drumR, 0.4, hn[0], hn[1], 0, null, 0.5)
          ctx.fill()
        }
        // 桌沿（石面的厚度）
        const e = hullScreen(TOP.concat(TOP_LO))
        if (e) {
          pathPts(ctx, e)
          ctx.fillStyle = shade([0.3, 0.295, 0.275], hn[0] * G.tableR, hn[1] * G.tableR, G.tableH - 0.03, hn[0], hn[1], 0.2, null, 1)
          ctx.fill()
        }
      }
      const top = TP
      if (!top) return
      const a = o.amb, alb = o.tableAlb
      // 桌面的光（低频）：1/5 分辨率缓冲 → 按全分辨率的桌面轮廓贴回
      const x = bufCtx(S.B.tbl, LQ)
      x.fillStyle = rgb(alb[0] * o.ambCol[0] * a * 0.9, alb[1] * o.ambCol[1] * a * 0.9, alb[2] * o.ambCol[2] * a * 0.9)
      x.fillRect(0, 0, S.W + 8, S.H + 8)
      x.globalCompositeOperation = 'lighter'
      ambientPools(x, G.tableH, alb, 3)
      const dp = Math.max(0.08, Lt.z - G.tableH)
      pool(x, [Lt.x, Lt.y, G.tableH], [1, 0, 0], [0, 1, 0], dp, Lt.power * Lt.flick, Lt.range, o.lightCol, alb, 7, S.poolA, LQ)
      // 席位小光池照到桌沿
      for (const s of S.seats) {
        const ex = seatExtra(s)
        if (!ex) continue
        pool(x, [s.x * 0.8, s.y * 0.8, G.tableH], [1, 0, 0], [0, 1, 0], 0.9, ex.amt * 0.6, 0.9, ex.col, alb, 1.3, 1, LQ)
      }
      x.globalCompositeOperation = 'source-over'
      ctx.save()
      pathPts(ctx, top)
      ctx.clip()
      blit(ctx, S.B.tbl, LQ)
      ctx.globalCompositeOperation = 'lighter'
      // 石纹
      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgb(214,210,200)'
      for (const v of VEINS) {
        const m = irr(v.pts[3][0], v.pts[3][1], G.tableH)
        ctx.globalAlpha = S.floorA * v.a * 0.55 * (0.25 + Math.min(1.6, m * 1.3))
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
      ctx.strokeStyle = 'rgb(194,154,91)'
      for (let i = 0; i < RINGS.length; i++) {
        const q = c.poly(RINGS[i])
        if (!q) continue
        ctx.globalAlpha = S.floorA * (0.1 + 0.16 * Math.min(1, irr(0, 0, G.tableH)))
        ctx.lineWidth = i === 0 ? 1.1 : 0.8
        pathPts(ctx, q); ctx.stroke()
      }
      // 十三道放射的铜嵌线（桌面像一只十三刻度的钟面）
      for (const s of S.seats) {
        const sa = Math.sin(s.a), ca = Math.cos(s.a)
        const pa = c.p(sa * 1.02, ca * 1.02, G.tableH + 0.001), pb = c.p(sa * 1.71, ca * 1.71, G.tableH + 0.001)
        if (!pa || !pb) continue
        ctx.globalAlpha = S.floorA * (0.07 + 0.26 * Math.min(1, irr(sa * 1.4, ca * 1.4, G.tableH)) + s.hover * 0.4 + s.lit * 0.1)
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke()
      }
      // 镜面高光（光源在抛光石面上的倒影）
      const m = mirror(G.tableH)
      if (m && m[0] * m[0] + m[1] * m[1] < G.tableR * G.tableR) {
        const pm = c.p(m[0], m[1], G.tableH)
        if (pm) {
          const k = Lt.power * Lt.flick * S.poolA * S.glowA
          drawGlow(ctx, glowSprite(o.lightCol[0], o.lightCol[1], o.lightCol[2]), pm[0], pm[1], 0.9 * pm[3], 0.3 * k)
          drawGlow(ctx, glowSprite(255, 244, 228, true), pm[0], pm[1], 0.14 * pm[3], 0.6 * k)
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
      shadowPass(ctx, G.tableH, polys, shadowAlpha() * 0.9, SQT, S.B.mT)
      ctx.restore()
      // 桌沿：一圈细线
      ctx.globalAlpha = S.floorA * (0.25 + 0.4 * Math.min(1, irr(Lt.x, Lt.y, G.tableH)))
      ctx.strokeStyle = 'rgb(186,182,170)'
      ctx.lineWidth = 1
      pathPts(ctx, top); ctx.stroke()
      // 桌沿嵌着的十三枚号牌（开局空白；钥匙分配完成的那一刻同时现出号码）、号码
      const zt = G.tableH + 0.002
      const ps = plateSize()
      for (const s of S.seats) {
        const v = G.plateV
        const q = c.poly([L2W(s, -ps.hw, v - ps.hd, zt), L2W(s, ps.hw, v - ps.hd, zt), L2W(s, ps.hw, v + ps.hd, zt), L2W(s, -ps.hw, v + ps.hd, zt)])
        if (!q) continue
        const P = L2W(s, 0, v, zt)
        ctx.globalAlpha = S.floorA
        pathPts(ctx, q)
        ctx.fillStyle = shade([0.2, 0.15, 0.085], P[0], P[1], zt, 0, 0, 1, seatExtra(s), 1.4)
        ctx.fill()
        ctx.globalAlpha = S.floorA * (0.25 + 0.35 * s.lit)
        ctx.strokeStyle = BRASS_DIM
        ctx.stroke()
      }
      for (const s of S.seats) drawNumber(ctx, s, seatExtra(s))
      // 各人面前：规则卡、身份卡（桌沿内侧，平放，正向对着椅位）、十枚一摞的金币
      for (const s of S.seats) {
        if (s.ruleA > 0.005) drawCard(ctx, s, -0.1, s.ruleA, true)
        if (s.idA > 0.005) drawCard(ctx, s, 0.1, s.idA, false)
        if (s.coinA > 0.005 && s.coinN > 0) drawCoins(ctx, s)
      }
      ctx.globalAlpha = 1
    }
    // 号牌的尺寸随屏幕放大（实物尺寸条文没写；画小了号码认不出）
    const PS = { hw: 0, hd: 0, sc: 1 }
    function plateSize() {
      const sc = S.numScale * (1 + 0.3 * S.tilt)
      PS.sc = sc; PS.hw = 0.12 + 0.11 * sc; PS.hd = 0.06 + 0.025 * sc
      return PS
    }
    // 卡（63×88 mm，画大约 1.5 倍）：u 是从椅位看过去的左右
    function drawCard(ctx, s, u, a, rule) {
      const c = S.cam, zt = G.tableH + 0.004
      const k = (1.45 + 0.35 * (S.numScale - 1)) * mix(1.4, 1, easeIO(clamp01(a)))
      const hw = 0.0315 * k, hd = 0.044 * k, v = G.plateV + 0.27
      const q = c.poly([L2W(s, u - hw, v - hd, zt), L2W(s, u + hw, v - hd, zt), L2W(s, u + hw, v + hd, zt), L2W(s, u - hw, v + hd, zt)])
      if (!q) return
      const P = L2W(s, u, v, zt)
      ctx.globalAlpha = S.floorA * clamp01(a)
      pathPts(ctx, q)
      ctx.fillStyle = shade(rule ? [0.72, 0.69, 0.62] : [0.78, 0.76, 0.7], P[0], P[1], zt, 0, 0, 1, seatExtra(s), 0.8)
      ctx.fill()
      // 规则卡一出现就有字（字在卡面上流动）；身份卡两面空白，主人碰到才现字
      if (rule && plane(ctx, P, [s.rx, s.ry, 0], [-s.fx, -s.fy, 0], 0.001)) {
        ctx.globalAlpha = S.floorA * clamp01(a) * 0.5
        ctx.strokeStyle = 'rgb(40,34,30)'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const y = -hd * 1000 + 14 + i * (hd * 2000 - 26) / 5
          ctx.moveTo(-hw * 1000 + 9, y); ctx.lineTo(hw * 1000 - 9 - ((i * 5) % 4) * 6, y)
        }
        ctx.stroke()
        unplane(ctx)
      }
      if (s.cflash > 0.01) {
        const p = c.p(P[0], P[1], P[2])
        if (p) { ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, glowSprite(255, 240, 214, true), p[0], p[1], Math.max(10, 0.22 * p[3]), s.cflash * 0.8 * clamp01(a)); ctx.globalCompositeOperation = 'source-over' }
      }
    }
    // 一摞金币（直径 26.5 mm、十枚高 18 mm；画大约两倍，免得缩成一个点）
    function drawCoins(ctx, s) {
      const c = S.cam, k = 2 * (1 + 0.3 * (S.numScale - 1))
      const a = clamp01(s.coinA)
      const u = 0.31, v = G.plateV + 0.22
      const h = 0.0018 * Math.min(40, s.coinN) * k * (0.6 + 0.4 * easeIO(a))
      const B0 = L2W(s, u, v, G.tableH), T0 = L2W(s, u, v, G.tableH + h)
      const pb = c.p(B0[0], B0[1], B0[2]), pt = c.p(T0[0], T0[1], T0[2])
      if (!pb || !pt) return
      const r = Math.max(1.4, 0.01325 * k * pt[3])
      ctx.globalAlpha = S.floorA * a
      ctx.lineCap = 'butt'
      ctx.strokeStyle = shade([0.42, 0.3, 0.12], B0[0], B0[1], G.tableH + h / 2, s.fx, s.fy, 0.3, seatExtra(s), 2)
      ctx.lineWidth = r * 2
      ctx.beginPath(); ctx.moveTo(pb[0], pb[1]); ctx.lineTo(pt[0], pt[1] + 0.01); ctx.stroke()
      ctx.fillStyle = shade([0.75, 0.56, 0.24], T0[0], T0[1], T0[2], 0, 0, 1, seatExtra(s), 3)
      ctx.beginPath(); ctx.ellipse(pt[0], pt[1], r, r * mix(1, 0.6, S.tilt), 0, 0, TAU); ctx.fill()
      ctx.lineCap = 'round'
      if (s.cflash > 0.01) {
        ctx.globalCompositeOperation = 'lighter'
        drawGlow(ctx, glowSprite(255, 214, 140, true), pt[0], pt[1], Math.max(9, r * 7), s.cflash * a)
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    /* ---------- 长方体 ---------- */
    // 八个角一次投影；每个可见面向外扩 0.3px 填一次（相邻面的接缝不漏底），一面一笔
    const BQX = new Float64Array(8), BQY = new Float64Array(8), ENX = new Float64Array(4), ENY = new Float64Array(4), TMP = [0, 0, 0, 0]
    function drawBox(ctx, P, N, alb, spec, extra, faceAlb) {
      const c = S.cam, C = c.pos
      let all = true
      for (let i = 0; i < 8; i++) {
        const p = c.pt(P[i][0], P[i][1], P[i][2], TMP)
        if (!p) { all = false; break }
        BQX[i] = p[0]; BQY[i] = p[1]
      }
      for (let f = 0; f < 6; f++) {
        const n = N[f], id = BOX_FACES[f][0]
        const a = P[id[0]], b = P[id[2]]
        const cx = (a[0] + b[0]) * 0.5, cy = (a[1] + b[1]) * 0.5, cz = (a[2] + b[2]) * 0.5
        if ((C[0] - cx) * n[0] + (C[1] - cy) * n[1] + (C[2] - cz) * n[2] <= 0) continue
        const col = shade((faceAlb && faceAlb[f]) || alb, cx, cy, cz, n[0], n[1], n[2], extra, spec)
        if (!all) {
          const q = c.poly([P[id[0]], P[id[1]], P[id[2]], P[id[3]]])
          if (!q) continue
          pathPts(ctx, q)
          ctx.fillStyle = col
          ctx.fill()
          ctx.strokeStyle = col
          ctx.lineWidth = 0.6
          ctx.stroke()
          continue
        }
        let A2 = 0
        for (let j = 0; j < 4; j++) { const i = id[j], k = id[(j + 1) & 3]; A2 += BQX[i] * BQY[k] - BQX[k] * BQY[i] }
        if (Math.abs(A2) < 0.02) {
          // 侧对镜头、几乎成一条线：只剩那一笔描边
          ctx.beginPath(); ctx.moveTo(BQX[id[0]], BQY[id[0]])
          for (let j = 1; j < 4; j++) ctx.lineTo(BQX[id[j]], BQY[id[j]])
          ctx.closePath()
          ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.stroke()
          continue
        }
        const sg = A2 > 0 ? 0.3 : -0.3
        for (let j = 0; j < 4; j++) {
          const i = id[j], k = id[(j + 1) & 3]
          const dx = BQX[k] - BQX[i], dy = BQY[k] - BQY[i], l = Math.sqrt(dx * dx + dy * dy) || 1
          ENX[j] = dy / l * sg; ENY[j] = -dx / l * sg
        }
        ctx.beginPath()
        for (let j = 0; j < 4; j++) {
          const i = id[j], pj = (j + 3) & 3
          // 两条相邻边各外移 0.3px 的交点（斜接，限长）
          const sx = ENX[pj] + ENX[j], sy = ENY[pj] + ENY[j]
          const dn = Math.max(0.09, (1 + (ENX[pj] * ENX[j] + ENY[pj] * ENY[j]) / 0.09) / 2)
          const x = BQX[i] + sx / dn / 2, y = BQY[i] + sy / dn / 2
          if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle = col
        ctx.fill()
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
        const nl = Math.sqrt(nx * nx + ny * ny) || 1
        nx /= nl; ny /= nl
        if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny }
        let lx = ls[0] - mx, ly = ls[1] - my
        const ll = Math.sqrt(lx * lx + ly * ly) || 1
        lx /= ll; ly /= ll
        const f = nx * lx + ny * ly
        if (f < 0.12) continue
        rimBuckets[f > 0.7 ? 2 : f > 0.4 ? 1 : 0].push(a, b)
      }
      ctx.lineWidth = lw
      ctx.lineCap = 'round'
      ctx.strokeStyle = RIM
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
        ctx.strokeStyle = RIM
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

    /* ---------- 号牌上的号码 ----------
       平放在桌沿的号牌上，字头朝桌心（坐在这一席的人读得正）；mul：额外的透明度（黑幕之上那一遍用）；
       blankNums 时未现出的号牌是空白的 */
    function drawNumber(ctx, s, ex, mul) {
      const A = S.numA * S.floorA * (mul == null ? 1 : mul) * (o.blankNums ? s.lit : 1)
      if (A <= 0.01) return
      const sc = PS.sc || 1
      const P0 = L2W(s, 0, G.plateV, G.tableH + 0.004)
      const c = S.cam
      const p0 = c.p(P0[0], P0[1], P0[2])
      const p1 = c.p(P0[0] + s.rx * 0.01, P0[1] + s.ry * 0.01, P0[2])
      const p2 = c.p(P0[0] + s.fx * 0.01, P0[1] + s.fy * 0.01, P0[2])
      if (!p0 || !p1 || !p2) return
      const A1x = p1[0] - p0[0], A1y = p1[1] - p0[1], A2x = p2[0] - p0[0], A2y = p2[1] - p0[1]
      const det = -A1x * A2y + A2x * A1y
      if (det <= 0.0004) return // 从桌面底下看
      const e = irr(P0[0], P0[1], P0[2]) + (ex ? ex.amt : 0)
      const lit = s.lit, out = s.out, hov = s.hover
      const dim = o.numDim, nb = o.num, no = o.numOut
      let r = dim[0] * (0.35 + Math.min(1.1, e)), g = dim[1] * (0.35 + Math.min(1.1, e)), b = dim[2] * (0.35 + Math.min(1.1, e))
      r = mix(r, nb[0], lit); g = mix(g, nb[1], lit); b = mix(b, nb[2], lit)
      r = mix(r, no[0], out); g = mix(g, no[1], out); b = mix(b, no[2], out)
      r = mix(r, 245, hov * 0.8); g = mix(g, 236, hov * 0.8); b = mix(b, 220, hov * 0.8)
      const k = S.dpr
      ctx.save()
      // 字的 x 轴沿椅位的右手，y 轴（向下）背离桌心
      ctx.setTransform(A1x * k, A1y * k, -A2x * k, -A2y * k, p0[0] * k, p0[1] * k)
      ctx.globalAlpha = A
      const font = '700 ' + (11 * sc).toFixed(1) + 'px Cinzel, serif'
      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const glow = Math.max(lit * (1 - out) * 0.9, hov)
      if (glow > 0.02) {
        // 光晕：预先模糊好的编号贴图（代替每帧的 shadowBlur）；模糊半径按此刻的屏幕缩放取档，约等于屏幕上 10px
        const sq = Math.max(0.25, Math.round(Math.sqrt(det) * 4) / 4)
        const spr = numGlow(s.k, font, hov > 0.5, sq)
        ctx.globalAlpha = A * Math.min(1, glow)
        ctx.drawImage(spr, -spr.width / 2, -spr.height / 2)
        ctx.globalAlpha = A
      }
      ctx.fillStyle = rgb(r, g, b)
      ctx.fillText(U.roman(s.k), 0, 0)
      ctx.restore()
      ctx.setTransform(k, 0, 0, k, 0, 0)
    }
    const glowCache = new Map(), fontOk = {}
    // 字体是否已载入（载入后不再查；载入前最多每半秒查一次）
    function fontReady(font) {
      let f = fontOk[font]
      if (f === true) return true
      const now = performance.now()
      if (f && now - f < 500) return false
      f = !document.fonts || document.fonts.check(font)
      fontOk[font] = f || now
      return f
    }
    function numGlow(k, font, hov, sq) {
      // 字体载入前后各缓存一份（载入前用的是后备字体的形状）
      const ready = fontReady(font)
      const key = k + font + (hov ? 'h' : 'w') + sq + (ready ? '' : '~')
      let c = glowCache.get(key)
      if (c) return c
      const txt = U.roman(k), blur = 10 / sq
      c = document.createElement('canvas')
      const x = c.getContext('2d')
      x.font = font
      const tw = x.measureText(txt).width, fs = parseFloat(font.slice(4)) || 15
      const pad = Math.ceil(blur * 1.6)
      c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(fs * 1.3 + pad * 2)
      x.font = font
      x.textAlign = 'center'
      x.textBaseline = 'middle'
      // 只要影子：字画在画布外，影子平移回来
      x.shadowColor = hov ? 'rgba(245,236,220,.9)' : 'rgba(226,178,96,.9)'
      x.shadowBlur = blur
      x.shadowOffsetX = 4096
      x.fillStyle = '#000'
      x.fillText(txt, c.width / 2 - 4096, c.height / 2)
      if (glowCache.size > 300) glowCache.clear()
      glowCache.set(key, c)
      return c
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
      if (S.tilt > 0.05) for (const b of s.legs) drawBox(ctx, b.P, b.N, OAK, 0.4, ex)
      drawBox(ctx, s.seatB.P, s.seatB.N, OAK, 0.5, ex, SEAT_FACE)
      for (const b of s.arms) drawBox(ctx, b.P, b.N, OAK, 0.45, ex)
      if (front) { drawBack(ctx, s, ex); drawPerson(ctx, s, ex) } else { drawPerson(ctx, s, ex); drawBack(ctx, s, ex) }
      ctx.globalAlpha = 1
    }
    function drawBack(ctx, s, ex) {
      drawBox(ctx, s.backB.P, s.backB.N, OAK, 0.45, ex, BACK_FACE)
      const h = hullScreen(s.backB.P)
      if (h) rimHull(ctx, h, irr(s.x, s.y, 1) * 0.45 + (ex ? ex.amt * 0.3 : 0), 0.8)
    }

    /* ---------- 陈设：收纳台（钥匙龛与十三把钥匙）、侧案、两座玻璃罩柜 ---------- */
    function drawFurniture(ctx) {
      const c = S.cam, C = c.pos
      ctx.globalAlpha = S.floorA * S.wallA
      for (const f of FURN) {
        drawBox(ctx, f.B.P, f.B.N, f.alb, f.spec, null)
        if (f.glass) {
          // 玻璃罩：只画棱
          const P = f.glass.P
          const m = irr((P[0][0] + P[7][0]) / 2, (P[0][1] + P[7][1]) / 2, 1)
          const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
          ctx.strokeStyle = 'rgb(170,190,220)'
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
        if (f.panel) drawNiche(ctx)
      }
      ctx.globalAlpha = 1
    }
    // 立板正面的敞口钥匙龛：十三枚挂钩分两排（上排 1—7、下排 8—13），钥匙按号悬挂；分配时一把把离钩
    function drawNiche(ctx) {
      const c = S.cam, C = c.pos
      const F = ST, v = panelD + 0.001
      const M = L2W(F, 0, v, niZ + niH / 2)
      if ((C[0] - M[0]) * F.fx + (C[1] - M[1]) * F.fy <= 0) return
      const A = S.floorA * S.wallA
      const q = c.poly([L2W(F, -niW, v, niZ), L2W(F, niW, v, niZ), L2W(F, niW, v, niZ + niH), L2W(F, -niW, v, niZ + niH)])
      if (!q) return
      ctx.globalAlpha = A
      pathPts(ctx, q)
      ctx.fillStyle = 'rgb(7,6,5)'
      ctx.fill()
      ctx.globalAlpha = A * 0.5
      ctx.strokeStyle = BRASS_DIM
      ctx.lineWidth = 1
      ctx.stroke()
      for (let k = 0; k < G.n; k++) {
        if (S.keyT[k] > 0.001) continue
        const K = KEYS[k], a = c.p(K.top[0], K.top[1], K.top[2]), b = c.p(K.bot[0], K.bot[1], K.bot[2])
        if (!a || !b) continue
        const m = irr(K.top[0], K.top[1], K.top[2]) + o.ringPow * S.chandA * 0.25
        ctx.globalAlpha = A * (0.45 + Math.min(0.55, m))
        ctx.strokeStyle = rgb(150 + 90 * m, 112 + 70 * m, 60 + 40 * m)
        ctx.lineWidth = Math.max(0.8, 0.012 * a[3])
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
        ctx.beginPath(); ctx.arc(b[0], b[1] + Math.max(0.8, 0.012 * a[3]), Math.max(1, 0.016 * a[3]), 0, TAU); ctx.stroke()
      }
    }
    // 正在离钩、被人拿到手里的钥匙：一点黄铜的光，沿弧线落到那人手里
    function drawSparks(ctx) {
      const c = S.cam
      let any = false
      for (let k = 0; k < G.n; k++) if (S.keyT[k] > 0.001 && S.keyT[k] < 0.999 && S.keyTo[k] >= 0) { any = true; break }
      if (!any) return
      const spr = glowSprite(240, 196, 120), hard = glowSprite(255, 236, 196, true)
      ctx.globalCompositeOperation = 'lighter'
      for (let k = 0; k < G.n; k++) {
        const t = S.keyT[k]
        if (!(t > 0.001 && t < 0.999) || S.keyTo[k] < 0) continue
        const K = KEYS[k], s = S.seats[S.keyTo[k]]
        const to = L2W(s, 0, 0.3, 0.78)
        for (let j = 0; j < 4; j++) {
          const tt = clamp01(t - j * 0.05)
          const e = easeIO(tt)
          const x = mix(K.top[0], to[0], e), y = mix(K.top[1], to[1], e), z = mix(K.top[2], to[2], e) + Math.sin(Math.PI * e) * 1.1
          const p = c.p(x, y, z)
          if (!p) continue
          const a = Math.sin(Math.PI * clamp01(t)) * (1 - j * 0.24) * (1 - S.dark)
          drawGlow(ctx, spr, p[0], p[1], Math.max(8, 0.32 * p[3]) * (1 - j * 0.15), 0.4 * a)
          if (!j) drawGlow(ctx, hard, p[0], p[1], Math.max(3, 0.07 * p[3]), 0.9 * a)
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 天眼下悬着的一环十三盏乳白球灯（离镜头近，画进景深缓冲） ---------- */
    function drawLamps(ctx) {
      const A = S.chandA * (1 - S.dark) * mix(0.75, 1, S.tilt)
      if (A <= 0.01) return
      const c = S.cam, C = c.pos
      ctx.lineCap = 'round'
      // 吊链：从灯环往上，挂到天眼口外沿（离镜头太近的那一截不画）
      const top = Math.min(G.ocZ - 0.08, C[2] - 1.4)
      if (top > G.lampZ + 0.4) {
        ctx.strokeStyle = 'rgb(120,98,62)'
        ctx.globalAlpha = A * 0.32
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < G.lamps; i++) {
          const a = i * TAU / G.lamps, sa = Math.sin(a), ca = Math.cos(a)
          const rT = mix(G.lampR, G.ocR + 0.15, (top - G.lampZ) / (G.ocZ - G.lampZ))
          const pa = c.p(sa * G.lampR, ca * G.lampR, G.lampZ + 0.08), pb = c.p(sa * rT, ca * rT, top)
          if (pa && pb) { ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]) }
        }
        ctx.stroke()
      }
      // 黄铜灯环
      const q = c.poly(LAMP_RING)
      if (q) {
        ctx.globalAlpha = A * 0.55
        ctx.strokeStyle = 'rgb(176,138,76)'
        ctx.lineWidth = Math.max(1, 0.025 * c.f / Math.max(0.5, c.depth(0, 0, G.lampZ)))
        pathPts(ctx, q); ctx.stroke()
      }
      // 球灯：乳白玻璃，从里面亮着
      ctx.globalCompositeOperation = 'lighter'
      const halo = glowSprite(o.ringCol[0], o.ringCol[1], o.ringCol[2]), core = glowSprite(255, 246, 232, true)
      for (let i = 0; i < G.lamps; i++) {
        const a = i * TAU / G.lamps
        const p = c.p(Math.sin(a) * G.lampR, Math.cos(a) * G.lampR, G.lampZ)
        if (!p) continue
        const r = 0.11 * p[3]
        drawGlow(ctx, halo, p[0], p[1], Math.min(140, r * 5.5), 0.13 * A)
        drawGlow(ctx, core, p[0], p[1], Math.min(60, r * 2.1), 0.62 * A)
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 天眼口：镜头还在屋面上方时，从天眼往下看（天眼外是屋面的黑） ---------- */
    function drawRoof(ctx) {
      const cz = S.cam.pos[2]
      const A = sstep(G.ocZ + 0.3, G.ocZ + 1.4, cz)
      if (A <= 0.01) return
      const lo = S.cam.poly(OC_LO)
      if (!lo) return
      ctx.save()
      ctx.globalAlpha = A
      const hi = cz > G.roofZ + 0.25 ? S.cam.poly(OC_HI) : null
      // 天眼的井壁（屋面到穹顶之间那一截）
      const cp = S.cam.p(0, 0, G.ocZ)
      ctx.beginPath()
      ctx.rect(-8, -8, S.W + 16, S.H + 16)
      addPts(ctx, lo)
      if (cp) {
        let rl = 0
        for (const p of lo) rl += Math.hypot(p[0] - cp[0], p[1] - cp[1])
        rl /= lo.length
        const g = ctx.createRadialGradient(cp[0], cp[1], rl, cp[0], cp[1], rl * 1.6)
        g.addColorStop(0, 'rgb(34,28,24)')
        g.addColorStop(1, 'rgb(8,7,7)')
        ctx.fillStyle = g
      } else ctx.fillStyle = 'rgb(10,8,8)'
      ctx.fill('evenodd')
      // 屋面
      if (hi) {
        ctx.beginPath()
        ctx.rect(-8, -8, S.W + 16, S.H + 16)
        addPts(ctx, hi)
        ctx.fillStyle = '#050404'
        ctx.fill('evenodd')
      }
      // 天眼口的金边
      ctx.globalAlpha = A * 0.7
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 1.5
      pathPts(ctx, lo); ctx.stroke()
      ctx.restore()
    }

    /* ---------- 天眼落下的一束光（终章：照在最后那一席） ---------- */
    // 光束只随镜头变：按单位强度画进 1/4 分辨率缓冲（镜头不动就沿用上一张），再按强度加色贴回
    function camKey() {
      const c = S.cam
      return c.pos[0].toFixed(4) + ',' + c.pos[1].toFixed(4) + ',' + c.pos[2].toFixed(4) + ',' + c.F[0].toFixed(5) + ',' + c.F[1].toFixed(5) + ',' + c.F[2].toFixed(5) + ',' + c.f.toFixed(2) + ',' + c.ox.toFixed(1) + ',' + c.oy.toFixed(1) + ',' + S.W + 'x' + S.H
    }
    // 一柱光：从 (x0,y0,z0) 半径 r0 到 (x1,y1,z1) 半径 r1，画进缓冲 b
    function column(b, x0, y0, z0, r0, x1, y1, z1, r1, col, a0, a1, hardA) {
      const x = bufCtx(b, BQ, true)
      const c = S.cam
      const spr = glowSprite(col[0], col[1], col[2])
      const hard = glowSprite(255, 250, 240, true)
      x.globalCompositeOperation = 'lighter'
      const n = 30
      let prev = null
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const p = c.p(mix(x0, x1, t), mix(y0, y1, t), mix(z0, z1, t))
        if (!p) { prev = null; continue }
        const r = mix(r0, r1, t)
        const rad = Math.min(r * p[3] * 1.6, 420)
        // 采样点在屏幕上挤在一起时（正俯视、或镜头贴近光柱底部）按密度减弱，免得叠成一团白
        const gap = prev ? Math.hypot(p[0] - prev[0], p[1] - prev[1]) : rad
        const k = Math.min(1, 0.22 + 2.2 * gap / Math.max(1, rad))
        prev = p
        drawGlow(x, spr, p[0], p[1], rad, mix(a0, a1, t) * k)
        if (hardA) drawGlow(x, hard, p[0], p[1], Math.min(r * p[3] * 0.5, 140), hardA * (1 - 0.8 * t) * k)
      }
      x.globalCompositeOperation = 'source-over'
      x.globalAlpha = 1
      return x
    }
    function drawBeam(ctx) {
      const bm = S.beam
      if (bm.k < 0 || bm.amt <= 0.01) return
      const A = bm.amt * (1 - S.dark * 0.5)
      const key = camKey() + '|' + bm.k
      if (key !== bmKey) {
        bmKey = key
        const s = S.seats[bm.k]
        const x = column(S.B.bm, 0, 0, G.ocZ - 0.3, 0.16, s.x, s.y, 0.2, 0.62, o.beamCol, 0.07, 0.14, 0.05)
        const c = S.cam, col = o.beamCol
        const p = c.p(s.x, s.y, 1.1)
        if (p) {
          x.globalCompositeOperation = 'lighter'
          drawGlow(x, glowSprite(col[0], col[1], col[2]), p[0], p[1], Math.min(1.3 * p[3], 520), 0.16)
          drawGlow(x, glowSprite(255, 250, 240, true), p[0], p[1], Math.min(0.3 * p[3], 90), 0.06)
          x.globalCompositeOperation = 'source-over'
          x.globalAlpha = 1
        }
      }
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, A)
      blit(ctx, S.B.bm, BQ)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }
    // 天眼的天光：阴天的散光，从天眼口垂到桌面，一柱很淡的光（尘在里面）
    function drawSky(ctx) {
      const A = S.sky * S.skyA * (1 - S.dark)
      if (A <= 0.01) return
      const key = camKey()
      if (key !== skyKey) {
        skyKey = key
        column(S.B.sky, 0, 0, G.ocZ - 0.1, G.ocR * 0.9, 0, 0, G.tableH + 0.05, G.ocR * 1.25, o.skyCol, 0.03, 0.055, 0)
      }
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, A)
      blit(ctx, S.B.sky, BQ)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    /* ---------- 光源本身与浮尘 ---------- */
    function drawLightOrb(ctx) {
      const ls = S.ls
      if (!ls || S.glowA <= 0.01) return
      const L = S.light, lc = o.lightCol
      const k = Math.min(1.2, L.power * L.flick) * S.glowA * S.poolA
      // 光升到灯环的高度时是一片散光，不是一团火：火芯随高度淡去；尺寸封顶，镜头再近也只是一点烛火
      const core = 1 - sstep(3.2, 5.2, L.z)
      ctx.globalCompositeOperation = 'lighter'
      drawGlow(ctx, glowSprite(lc[0], lc[1], lc[2]), ls[0], ls[1], Math.min(1.5 * ls[3], 260), 0.16 * k)
      drawGlow(ctx, glowSprite(255, 236, 205, true), ls[0], ls[1], Math.min(0.13 * ls[3], 20), 0.5 * k * core)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }
    for (let i = 0; i < o.motes; i++) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 5
      S.motes.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: 0.4 + Math.random() * 4.4, ph: Math.random() * TAU, sp: 0.5 + Math.random() })
    }
    function drawMotes(ctx) {
      if (!S.motes.length) return
      const c = S.cam, L = S.light
      const spr = glowSprite(255, 230, 200, true)
      const bm = S.beam, bs = bm.k >= 0 ? S.seats[bm.k] : null
      const sk = S.sky * S.skyA * 0.7
      ctx.globalCompositeOperation = 'lighter'
      for (const m of S.motes) {
        const q = c.p(m.x, m.y, m.z)
        if (!q) continue
        const d2 = (m.x - L.x) ** 2 + (m.y - L.y) ** 2 + (m.z - L.z) ** 2
        let e = L.power * L.flick * S.poolA / (1 + d2 / 0.9)
        // 天眼那一柱天光里的尘
        if (sk > 0.01) e += sk * (1 - sstep(G.ocR * 0.7, G.ocR * 1.3, Math.hypot(m.x, m.y)))
        if (bs && bm.amt > 0) {
          // 在光束里的尘
          const t = clamp01((G.ocZ - 0.3 - m.z) / (G.ocZ - 0.5))
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
    // 只在眼眶的形状变化时重画（睁眼的那几秒、换版式）；上下多留一截，镜头下移（view.oy）时整张平移即可。
    // 柔和的边缘不用 ctx.filter：杏仁形是两个圆的交，模糊后的亮度 ≈ 两个「边缘按高斯累积分布淡出的圆盘」之积
    function softDisc(x, cx, cy, R, sg) {
      const r0 = Math.max(0, R - 3 * sg), r1 = R + 3 * sg
      const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1)
      for (let i = 0; i <= 8; i++) {
        const r = r0 + (r1 - r0) * i / 8
        g.addColorStop(i / 8, 'rgba(0,0,0,' + phi((R - r) / sg).toFixed(4) + ')')
      }
      return g
    }
    function drawLens(ctx) {
      if (S.lensA <= 0.01) return
      const b = S.B.lens, q = EQ
      const padX = Math.ceil(S.W * 0.04), padY = Math.ceil(S.H * 0.16)
      const w0 = Math.max(4, Math.ceil(S.W * q)), h0 = Math.max(4, Math.ceil(S.H * q))
      const w = w0 + Math.ceil(padX * q) * 2, h = h0 + Math.ceil(padY * q) * 2
      const key = w + 'x' + h + '|' + S.lensW.toFixed(4) + '|' + S.lensH.toFixed(4) + '|' + S.lensOpen.toFixed(4)
      const ox = Math.ceil(padX * q), oy = Math.ceil(padY * q)
      if (key !== lensKey) {
        lensKey = key
        if (b.c.width !== w || b.c.height !== h) { b.c.width = w; b.c.height = h }
        const x = b.x
        x.setTransform(1, 0, 0, 1, 0, 0)
        x.globalAlpha = 1
        x.globalCompositeOperation = 'source-over'
        x.clearRect(0, 0, w, h)
        const cx = ox + w0 / 2, cy = oy + h0 / 2
        const ha = w0 * S.lensW
        const hb = Math.max(1, Math.min(ha * 0.97, h0 * S.lensH * S.lensOpen))
        const R = (ha * ha + hb * hb) / (2 * hb)
        const sg = Math.min(w0, h0) * 0.06
        x.fillStyle = softDisc(x, cx, cy + R - hb, R, sg)
        x.fillRect(0, 0, w, h)
        x.globalCompositeOperation = 'destination-in'
        x.fillStyle = softDisc(x, cx, cy - (R - hb), R, sg)
        x.fillRect(0, 0, w, h)
        // 反过来：眼眶外是墨色
        x.globalCompositeOperation = 'xor'
        x.fillStyle = '#050404'
        x.fillRect(0, 0, w, h)
        x.globalCompositeOperation = 'source-over'
      }
      ctx.globalAlpha = S.lensA
      ctx.drawImage(b.c, S.view.ox - ox / q, S.view.oy - oy / q, w / q, h / q)
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
          // 光标的光留在圆厅里
          const r = Math.hypot(w[0], w[1]), lim = G.R - 0.6
          const k = r > lim ? lim / r : 1
          tx = w[0] * k; ty = w[1] * k; tz = S.lampZ; tp = S.lampPow
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
        if (s.cflash > 0) s.cflash = Math.max(0, s.cflash - dt * 0.9)
        s.hover += ((S.hoverK === s.k ? 1 : 0) - s.hover) * fh
      }
      for (let i = S.ripples.length - 1; i >= 0; i--) {
        const r = S.ripples[i]
        r.t += dt / 1.6
        if (r.t >= 1) S.ripples.splice(i, 1)
      }
      for (const m of S.motes) {
        m.x += Math.sin(t * 0.21 * m.sp + m.ph) * 0.0025 + 0.0006
        m.y += Math.cos(t * 0.17 * m.sp + m.ph * 1.3) * 0.0025
        m.z += Math.sin(t * 0.33 * m.sp + m.ph * 0.7) * 0.0016 + 0.0004
        if (m.x > 5) m.x = -5
        if (m.z > 4.8) m.z = 0.4
      }
    }

    /* =====================================================================
       画一帧
       ===================================================================== */
    S.render = () => {
      if (S.released) S.resize()
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
      plateSize()
      if (S.dark < 0.999) {
        computeArc()
        FL = S.cam.poly(FLOOR); DP = S.cam.poly(DISC); TP = S.cam.poly(TOP)
        drawWalls(ctx)
        drawFloor(ctx)
        drawFloorShadows(ctx)
        drawRipples(ctx)
        drawFurniture(ctx)
        // 远处的椅子 → 圆桌 → 近处的椅子
        const c = S.cam
        const fx = c.F[0], fy = c.F[1], fl = Math.hypot(fx, fy) || 1
        const list = S.seats.slice().sort((a, b) => c.depth(b.x, b.y, 0.6) - c.depth(a.x, a.y, 0.6))
        const behind = s => S.tilt > 0.1 && (s.x * fx + s.y * fy) / fl > 0.9
        for (const s of list) if (behind(s)) drawSeat(ctx, s)
        drawTable(ctx)
        for (const s of list) if (!behind(s)) drawSeat(ctx, s)
        drawSparks(ctx)
        drawBeam(ctx)
        drawSky(ctx)
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
        // 已现出的号码在黑暗里仍看得见（只补上被黑幕盖掉的那一部分）
        if (S.numDarkA > 0.01) for (const s of S.seats) if (s.lit > 0.01) drawNumber(ctx, s, null, S.numDarkA * S.dark)
      }
      drawEyes(ctx)
      // 离镜头最近的东西（灯环、天眼口）与眼眶在最上面：桌面版一起画进半分辨率缓冲、整屏只贴一次，
      // 放大贴回的柔化就是景深
      const q = S.ribQ
      const near = S.chandA * (1 - S.dark) > 0.01 || S.cam.pos[2] > G.ocZ + 0.3
      if (q) {
        if (near) {
          const x = bufCtx(S.B.rib, q, true)
          drawLamps(x)
          drawRoof(x)
          drawLens(x)
          blit(ctx, S.B.rib, q)
        } else drawLens(ctx) // 沉入黑暗后只剩眼眶
      } else {
        drawLamps(ctx)
        drawRoof(ctx)
        drawLens(ctx)
      }
      markRendered()
    }

    /* ---------- 这一帧要不要重画 ----------
       镜头或光源在屏幕上挪动超过约 1px、席位/全局状态在变（醒来、熄灭、悬停、涟漪…）：每帧都画；
       只剩烛火摇曳、浮尘、眨眼这类环境动画：约 30 帧；全黑且眼睛也闭上了：不画 */
    const REF = [[0, 0, 0], [G.R, 0, 0], [-G.R * 0.7, -G.R * 0.7, G.wallH], [0, G.R, G.lampZ]]
    const lastRef = new Float64Array(10)
    let lastSig = NaN, lastAt = -1e9
    function stateSig() {
      const L = S.light
      let v = S.lensOpen * 3.1 + S.poolA * 5.3 + S.dark * 7.7 + S.eyeA * 11.3 + S.beam.amt * 13.1 + S.wallA * 17.9 + S.chandA * 19.7 +
        S.ribA * 23.3 + S.numA * 29.1 + S.numDarkA * 30.7 + S.sky * 7.3 + S.skyA * 8.9 + S.doorOpen * 34.1 + S.lensA * 31.7 + (S.beam.k + 1) * 43 + o.amb * 470 + o.ringPow * 230 + S.glowA * 53 + S.floorA * 59 +
        L.power * 61 + L.range * 67 + S.clock * 0.07 + S.hoverK * 71 + S.numScale * 3.7
      for (let i = 0; i < G.n; i++) v += S.keyT[i] * (2.3 + i * 0.37)
      for (const s of S.seats) v += s.awake * 1.3 + s.eyes * 2.9 + s.lit * 4.1 + s.out * 6.7 + s.fall * 8.3 + s.gone * 9.7 + s.lamp * 12.1 + s.flash * 14.3 + s.hover * 16.9 +
        s.coinA * 3.3 + s.ruleA * 5.9 + s.idA * 7.1 + s.cflash * 2.1 + s.coinN * 0.013 + (s.id ? s.id.length * 0.11 + s.id.charCodeAt(0) * 0.007 : 0)
      return v
    }
    function refPts(out) {
      const c = S.cam, L = S.light
      for (let i = 0; i < 5; i++) {
        const P = i < 4 ? REF[i] : [L.x, L.y, L.z]
        const p = c.p(P[0], P[1], P[2])
        out[i * 2] = p ? p[0] : -1e5; out[i * 2 + 1] = p ? p[1] : -1e5
      }
    }
    function markRendered() {
      refPts(lastRef)
      lastSig = stateSig()
      lastAt = performance.now()
      S.dirty = false
    }
    const curRef = new Float64Array(10)
    S.needs = now => {
      if (S.dirty || S.released) return true
      setView()
      refPts(curRef)
      let mv = 0
      for (let i = 0; i < 10; i++) { const d = Math.abs(curRef[i] - lastRef[i]); if (d > mv) mv = d }
      if (mv > 0.75) return true
      if (S.ripples.length || Math.abs(stateSig() - lastSig) > 1e-4) return true
      // 全黑、眼睛也闭上了：画面不再变化
      if (S.dark >= 0.999 && S.eyeA <= 0.01 && S.numDarkA <= 0.01) return false
      return (now || performance.now()) - lastAt >= 26
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
    // 第 k 席号牌在屏幕上的位置
    S.plateScreen = k => {
      const s = S.seats[k - 1]
      const P = L2W(s, 0, G.plateV, G.tableH)
      const p = S.cam.p(P[0], P[1], P[2])
      return p ? { x: p[0], y: p[1], s: p[3] } : null
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
    G, dayK,
    // 十三席上坐的人（席位 = 号牌 = 房号）：App.state.seats 里有人就用他们，空位从卡池里随机补齐（整页共用一份）
    people() {
      const n = G.n
      const seats = (Array.isArray(App.state.seats) ? App.state.seats : []).slice(0, n)
      while (seats.length < n) seats.push(null)
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

  /* ---------- 主持人的播报（《开局流程》§2 原句，取自 WORLD.opening；缺了就用同样的原句） ---------- */
  const OPEN = (window.WORLD && Array.isArray(window.WORLD.opening)) ? window.WORLD.opening : []
  const sentences = no => {
    const b = OPEN.find(x => x && x.no === no)
    const out = []
    for (const para of (b && b.lines) || []) for (const s of String(para).split(/(?<=[。？！])/)) if (s.trim()) out.push(s.trim())
    return out
  }
  // 第 no 条播报里含 key 的那一句（整句）
  const said = (no, key, fb) => sentences(no).find(s => s.includes(key)) || fb
  const RULES = (() => {
    const rc = window.WORLD && Array.isArray(window.WORLD.ruleCard) ? window.WORLD.ruleCard : []
    if (rc.length) return rc.map(r => ({ no: r.no, text: r.text }))
    return sentences(4).map(s => s.match(/^([一二三四五六七八九十]+)：(.+)$/)).filter(Boolean).map(m => ({ no: m[1], text: m[2] }))
  })()

  // 滚动节点（钉住段的进度 0–1）
  const B = {
    tilt0: 0.04, tilt1: 0.42,
    keys0: 0.25, keys1: 0.296, bind: 0.299,      // 钥匙一把把离钩；最后一把到手 → 号牌同时现出号码
    seat0: 0.303, seat1: 0.345,                  // 按自己所选的编号重新入座
    coins: 0.352,                                // 第二条第一句：每人十枚
    intro0: 0.478, intro1: 0.536,                // 从一号起依次自我介绍
    rules0: 0.618, rules1: 0.692, ruleCard: 0.697, // 第四条：十九条规则，说完的那一刻出现规则卡
    ident: 0.712,                                // 第五条：身份卡
    doors: 0.758,                                // 第六条开口：三扇门自己打开
    dark0: 0.885, dark1: 0.94,
    key0: 0.895, keySpan: 0.078,
  }
  const VOICE = [
    { a: 0.05, b: 0.09, t: said(1, '欢迎来到这座馆', '大家好，都醒了吧，欢迎来到这座馆，各位可以称呼我为主持人。'), first: true },
    { a: 0.09, b: 0.135, t: said(1, '获胜者的一个愿望', '我将大家请来这里，是为了参加一场游戏，而我会实现获胜者的一个愿望。') + said(1, '不管内容是什么', '一个不管内容是什么都可以实现的愿望。') },
    { a: 0.135, b: 0.175, t: said(1, '十三把钥匙', '在说明游戏的具体规则之前，请各位先分配收纳台上的十三把钥匙，一人一把，号码自选。') },
    { a: 0.175, b: 0.21, t: said(1, '编号会影响各位的命运', '我现在可以透露的是：编号会影响各位的命运。') + said(1, '请慎重选择', '请慎重选择。') },
    { a: 0.21, b: 0.245, t: said(1, '重新入座', '钥匙分配完毕后，请按自己所选的编号重新入座。') },
    { a: 0.35, b: 0.395, t: said(2, '一枚金币代表一百分', '现在为大家发放的是每个人的初始积分，一枚金币代表一百分。'), first: true },
    { a: 0.395, b: 0.44, t: said(2, '抢夺他人的金币', '金币可以自由交易、赠与；抢夺他人的金币在本馆内视为许可的行为。') },
    { a: 0.44, b: 0.476, t: said(2, '按顺序进行自我介绍', '接下来，请各位从一号开始，按顺序进行自我介绍。') },
    { a: 0.476, b: 0.536, t: said(2, '严格的格式要求', '自我介绍有着严格的格式要求，分别说出自己的名称，愿望，以及如果一定要有一个人先死，希望是在座的几号？') },
    { a: 0.546, b: 0.592, t: said(3, '第二次表决', '接下来，进行第二次表决，同意立即处死刚才获票最多者的，请举手，我会根据举手人数考虑是否执行。'), first: true },
    { a: 0.6, b: 0.618, t: said(4, '现在说明规则', '现在说明规则。'), first: true },
    { a: 0.704, b: 0.75, t: said(5, '身份卡', '现在，为所有人发放身份卡，那是决定各位命运的另一项道具，身份无法转让、拒绝。'), first: true },
    { a: 0.758, b: 0.815, t: said(6, '任务', '现在，发布仅限今天二十四点之前完成的任务，只要去过馆内除套房外的每个房间，并在房间内待满至少五分钟，便可获得500积分的奖励，每人只能完成一次。'), first: true },
    { a: 0.815, b: 0.85, t: said(7, '小游戏，胜利', '我会不定期和大家进行一些小游戏，胜利会有奖励，失败则会有惩罚。'), first: true },
    { a: 0.85, b: 0.885, t: said(7, '第一次小游戏', '现在进行第一次小游戏。') },
  ]

  const P = {
    el: null, H: null, E: null, vis: false, started: false,
    p: 0, ps: 0, lastPs: 0, mob: false,
    ptrIn: false, touchUntil: 0, hoverK: -1, tagK: -1, tagUntil: 0, lineK: -1, autoK: -1,
    zoom: 1, lv: 0, keyNo: 1, keyLanded: false, keyShown: false, lastKeyP: 0, whooshed: false, cueOn: false, wakeDone: false, gateOpen: false,
    vi: -2, ri: -1, rulesOn: false, ruleOff: [], ruleY: '', crossed: {}, fast: false,
    fin: [], wake: [], shown: [], keyOrder: [], seatOrder: [],
  }

  function build(el) {
    const E = (P.E = {})
    el.innerHTML = ''
    const sticky = (E.sticky = U.el('div.prologue-sticky'))
    E.stage = U.el('div.prologue-stage')
    E.cv = U.el('canvas.prologue-cv', { 'aria-hidden': 'true' })
    E.stage.append(E.cv)
    E.title = U.el('h1.prologue-title', { text: '夙与愿' })
    E.seal = U.el('i.prologue-seal', { 'aria-hidden': 'true' })
    E.latin = U.el('div.prologue-latin', { text: U.roman(G.n) + ' Sedes · Vnvm Votvm', 'aria-hidden': 'true' })
    E.head = U.el('div.prologue-head', null, [E.title, E.seal, E.latin])
    E.time = U.el('span.prologue-time', { text: '17:00' })
    E.clock = U.el('div.prologue-clock', { 'aria-hidden': 'true' }, [U.el('span.prologue-day', { text: '第一日' }), E.time, E.tick = U.el('i.prologue-clock-tick')])
    E.tagNo = U.el('b.prologue-tag-no')
    E.tagName = U.el('span.prologue-tag-name')
    E.tagLine = U.el('p.prologue-tag-line')
    E.tag = U.el('div.prologue-tag', { 'aria-hidden': 'true' }, [U.el('div.prologue-tag-in', null, [U.el('div.prologue-tag-head', null, [E.tagNo, E.tagName]), E.tagLine])])
    E.cue = U.el('div.prologue-cue.is-off', { 'aria-hidden': 'true' }, [U.el('i')])
    E.keyTag = U.el('span.prologue-key-no', { text: 'I' })
    E.key = U.el('div.prologue-key', { 'aria-hidden': 'true', html: KEY_SVG })
    E.key.appendChild(E.keyTag)
    // 播报：一次一句，听不出从哪里来
    E.voiceLine = U.el('p.prologue-voice-line')
    E.voice = U.el('div.prologue-voice', null, [E.voiceLine])
    // 第四条播报的十九条：像规则卡上的字一样，读到哪里流到哪里
    E.rulesList = U.el('ol.prologue-rules-list', null, RULES.map(r => U.el('li', null, [U.el('b', { text: r.no + '：' }), r.text])))
    E.rules = U.el('div.prologue-rules', null, [E.rulesList])
    sticky.append(E.stage, E.head, E.clock, E.voice, E.rules, E.tag, E.cue, E.key)
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
    // 十九条的位置量好缓存（帧循环里不再读布局）
    const lis = P.E.rulesList.children
    P.ruleOff = Array.from(lis, li => li.offsetTop + li.offsetHeight / 2)
    P.ruleBox = P.E.rules.offsetHeight || 1
    P.ruleY = ''
  }

  function setClock(m, instant) {
    const t = '17:0' + m
    P.H.clock = 17 * 60 + m
    // 让 HUD 的馆内时钟与大钟同步（只在板块顶端时；滚动后由核心按进度接管）
    // 条件当场量位置（P.p 只在板块可见时更新，可能过期）
    if (P.vis && P.el && P.el.getBoundingClientRect().top > -40) { App.state.minutes = 17 * 60 + m; App.bus.emit('time', 17 * 60 + m) }
    const E = P.E
    // 醒来的几秒里就跳走了：板块看不见时只换数字，不再播动画
    if (instant || App.reduced || !P.vis || P.fast) { E.time.textContent = t; return }
    App.text.scramble(E.time, t, { duration: 0.5, chars: '0123456789', revealDelay: 0.1 })
    gsap.fromTo(E.tick, { scaleX: 1, opacity: 0.9 }, { scaleX: 0, opacity: 0, duration: 1.2, ease: 'expo.out' })
    gsap.fromTo(E.clock, { x: -3 }, { x: 0, duration: 0.4, ease: 'expo.out' })
  }

  /* ---------- 谁坐哪一席 ----------
     终局的坐法（席位 = 号牌 = 房号）来自 domeHall.people()；醒来时各人坐在自己编号的那一席（物理层 §9），
     与房号无关——同一批人换一种坐法（固定的错位排列）。第 k 把钥匙的主人醒来时坐在 wake.indexOf(fin[k]) */
  function arrange() {
    const H = P.H
    const fin = domeHall.people()
    const rnd = U.seeded(4211)
    let wake = fin.slice()
    for (let tries = 0; tries < 30; tries++) {
      wake = fin.slice()
      for (let i = wake.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = wake[i]; wake[i] = wake[j]; wake[j] = t }
      if (wake.every((id, i) => id !== fin[i])) break
    }
    P.fin = fin; P.wake = wake
    for (let k = 0; k < G.n; k++) H.keyTo[k] = Math.max(0, wake.indexOf(fin[k]))
    // 拿钥匙的先后、重新入座的先后（固定：来回滚动看到的是同一场）
    const r2 = U.seeded(7703)
    const ord = Array.from({ length: G.n }, (_, i) => i)
    for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); const t = ord[i]; ord[i] = ord[j]; ord[j] = t }
    P.keyOrder = ord.slice()
    for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); const t = ord[i]; ord[i] = ord[j]; ord[j] = t }
    P.seatOrder = ord
    P.shown = []
    seatPeople(P.ps)
  }
  // 重新入座：第 j 席在自己的时刻化开，换成按号入座的人
  const SW = 0.012
  function seatT(j) { return B.seat0 + SW / 2 + (B.seat1 - B.seat0 - SW) * P.seatOrder.indexOf(j) / Math.max(1, G.n - 1) }
  function seatPeople(p) {
    const H = P.H
    for (let j = 0; j < G.n; j++) {
      const t = seatT(j)
      const id = p < t ? P.wake[j] : P.fin[j]
      if (P.shown[j] !== id) { P.shown[j] = id; H.setPerson(j + 1, id) }
      const g = P.wake[j] === P.fin[j] ? 0 : clamp01(1 - Math.abs(p - t) / (SW / 2))
      H.seats[j].gone = g
    }
  }

  function wakeSeat(s, v) {
    s.flash = 1
    P.H.ripple(s.k, s.acc)
    gsap.to(s, { eyes: 1, duration: 0.32, ease: 'power4.out', overwrite: 'auto' })
    gsap.to(s, { awake: 1, duration: App.reduced || P.fast ? 0.4 : 2.2, ease: 'power3.inOut', delay: App.reduced || P.fast ? 0 : 0.5 })
    if (!P.fast) App.audio.sfx('tick', { volume: v, pan: U.clamp(s.x / 3.2, -1, 1) * 0.8, pitch: 0.7 + s.k * 0.04 })
  }
  function tickMinute(m) {
    setClock(m)
    if (!P.fast) App.audio.sfx('drop', { volume: 0.32, pitch: 0.7 + m * 0.06 })
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
    // 镜头从天眼外穿过天眼，落进厅里
    gsap.fromTo(P, { zoom: 1 }, { zoom: 0, duration: App.reduced ? 0.5 : 9.5, ease: 'power2.inOut' })
    gsap.fromTo(H, { poolA: 0.2 }, { poolA: 1, duration: 2.4, ease: 'power2.out' })
    const tl = (P.tl = gsap.timeline())
    tl.add(revealTitle, 0.2)
    // 时钟每 gap 秒走一分钟：17:01 … 17:05。十三个人按随机的先后，在 17:05 之前陆续醒来
    const gap = App.reduced ? 0.35 : 1.45
    const t5 = 1.5 + 4 * gap
    for (let m = 1; m <= 5; m++) tl.add(() => tickMinute(m), 1.5 + (m - 1) * gap)
    const order = U.shuffle(H.seats.slice())
    const t0 = App.reduced ? 0.4 : 0.9, span = t5 - 0.25 - t0
    order.forEach((s, i) => {
      const at = t0 + span * (i + (App.reduced ? 0 : Math.random() * 0.85)) / order.length
      tl.add(() => wakeSeat(s, 0.5 + Math.random() * 0.25), at)
    })
    tl.add(() => { P.wakeDone = true; showCue(true) }, t5 + 0.8)
  }
  // 第一条播报在「所有人都醒了以后」：还没醒完就滚下来了，剩下的人当场醒（不再一个个响）
  function finishWake() {
    if (!P.tl || P.wakeDone) return
    P.fast = true
    P.tl.progress(1)
    P.fast = false
  }

  function showCue(on) {
    if (P.cueOn === on) return
    P.cueOn = on
    const cue = P.E.cue
    // 收起后连同里面循环的小点一起停掉（不再占合成层）
    if (on) cue.classList.remove('is-off')
    gsap.to(cue, { opacity: on ? 1 : 0, duration: on ? 1.2 : 0.4, ease: 'power2.out', overwrite: true, onComplete: on ? null : () => { if (!P.cueOn) cue.classList.add('is-off') } })
  }

  /* ---------- 播报：一次一句 ---------- */
  function setVoice(i, down) {
    if (i === P.vi) return
    P.vi = i
    const E = P.E, el = E.voiceLine
    if (el._chars) gsap.killTweensOf(el._chars)
    if (i < 0) {
      gsap.to(E.voice, { opacity: 0, duration: 0.35, ease: 'power2.out', overwrite: true, onComplete: () => { if (P.vi < 0) E.voice.style.visibility = 'hidden' } })
      return
    }
    const v = VOICE[i]
    el.textContent = v.t
    el._chars = App.text.split(el)
    E.voice.style.visibility = 'visible'
    gsap.to(E.voice, { opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: true })
    if (!App.reduced) gsap.fromTo(el._chars, { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: Math.min(0.03, 1.3 / el._chars.length), ease: 'power1.out' })
    if (v.first && down) App.audio.sfx('chime', { volume: 0.2, pitch: 0.72 })
  }
  function setRules(on) {
    if (P.rulesOn === on) return
    P.rulesOn = on
    const E = P.E
    if (on) E.rules.style.visibility = 'visible'
    gsap.to(E.rules, { opacity: on ? 1 : 0, duration: on ? 0.5 : 0.35, ease: 'power2.out', overwrite: true, onComplete: on ? null : () => { if (!P.rulesOn) E.rules.style.visibility = 'hidden' } })
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
      if (P.lineK < 0 && P.autoK < 0) hideTag()
    }
  }
  function showTag(k) {
    const s = P.H.seats[k - 1]
    const c = App.char(s.id)
    const E = P.E
    if (P.tagK !== k || P.tagId !== s.id) {
      P.tagK = k
      P.tagId = s.id
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
    P.tagId = null
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
    if (!P.H || P.ps > B.dark0) return
    const r = P.E.stage.getBoundingClientRect()
    const x = e.clientX - r.left, y = e.clientY - r.top
    const k = P.H.pick(x, y)
    if (k > 0) speak(k)
    else if (P.lineK > 0 && !App.finePointer) { P.lineK = -1; hideTag() }
  }

  /* ---------- 滚动：镜头、播报、钥匙与号牌、入座、金币与卡、门、沉入黑暗 ---------- */
  // 向目标值平滑靠拢（与帧率无关）
  const ease = (obj, k, to, rdt, tau) => { const v = obj[k]; if (v === to) return; const n = v + (to - v) * (1 - Math.exp(-rdt / tau)); obj[k] = Math.abs(to - n) < 0.003 ? to : n }
  // 往下滚越过某一拍时只响一次；往回滚过去再滚下来才再响
  function crossed(key, on, down) {
    const was = !!P.crossed[key]
    P.crossed[key] = on
    return on && !was && down
  }
  function applyScroll(p, rdt) {
    const H = P.H, v = H.view, E = P.E
    const down = p > P.lastPs + 1e-5
    const t = easeIO(sstep(B.tilt0, B.tilt1, p))
    const tm = H.time
    if (p > B.tilt0 + 0.005) finishWake()
    // 镜头：先从天眼外落进厅里（醒来的那几秒），再斜下来；穿过天眼时圆桌几乎不变大（推拉变焦）
    const dive = P.zoom
    v.elev = mix(Math.PI / 2, P.mob ? 0.74 : 0.6, t)
    v.dist = mix(10.6 + dive * 8.4, P.mob ? 12.6 : 16.2, t)
    v.ref = mix(10.6 + dive * 7.4, 10.6, t)
    // 极慢的呼吸：整间厅像在缓缓转动；斜下来以后再慢慢绕一点
    v.yaw = mix(Math.sin(tm * 0.05) * 0.05, -0.5, t) - 0.14 * sstep(B.tilt1, B.dark1, p)
    v.tz = mix(0.45, 0.55, t)
    v.oy = mix(P.oy0, P.oy0 + H.H * 0.07, t)
    H.lensA = 1 - 0.55 * sstep(0.04, 0.4, p)
    // 天眼的天光跟着馆内时刻（17:00—19:00 由亮渐无）
    H.sky = dayK(App.state.minutes)
    // 沉入黑暗，只剩眼睛；钥匙落地后眼睛也闭上，号码随后没入黑暗
    H.dark = sstep(B.dark0, B.dark1, p)
    H.eyeA = 1 - sstep(0.958, 0.985, p)
    H.numDarkA = 1 - sstep(0.975, 1, p)
    // 文字退场（值没变就不写；完全淡出后不再占合成层）
    const fade = 1 - sstep(0.03, 0.2, p)
    css(E.head, 'opacity', fade.toFixed(3))
    css(E.head, 'transform', 'translate3d(0,' + (-p * 120).toFixed(1) + 'px,0)')
    css(E.head, 'visibility', fade > 0 ? 'visible' : 'hidden')
    // 时钟的淡入由 revealTitle 的补间负责，这里每帧照写（保持原来的先后关系）
    E.clock.style.opacity = (1 - sstep(0.02, 0.06, p)).toFixed(3)
    if (p > 0.03) showCue(false)
    else if (P.wakeDone) showCue(true)

    // 播报（醒完之前不说话）
    let vi = -1
    if (P.started && (P.wakeDone || p > B.tilt0)) for (let i = 0; i < VOICE.length; i++) if (p >= VOICE[i].a && p < VOICE[i].b) { vi = i; break }
    setVoice(vi, down)
    // 十九条：读到哪里，字流到哪里
    const rOn = p >= B.rules0 && p < B.rules1 && RULES.length > 0
    setRules(rOn)
    if (rOn && P.ruleOff.length) {
      const f = clamp01((p - B.rules0) / (B.rules1 - B.rules0)) * (RULES.length - 1)
      const i = Math.min(RULES.length - 1, Math.floor(f + 0.5)), i0 = Math.floor(f), i1 = Math.min(RULES.length - 1, i0 + 1)
      const y = mix(P.ruleOff[i0], P.ruleOff[i1], sstep(0.15, 0.85, f - i0))
      const ty = 'translate3d(0,' + (P.ruleBox / 2 - y).toFixed(1) + 'px,0)'
      if (ty !== P.ruleY) { P.ruleY = ty; E.rulesList.style.transform = ty }
      if (i !== P.ri) {
        if (P.ri >= 0 && E.rulesList.children[P.ri]) E.rulesList.children[P.ri].classList.remove('is-on')
        P.ri = i
        E.rulesList.children[i].classList.add('is-on')
      }
    }

    // 钥匙一把把离钩，落到拿它的人手里
    const kw = 0.012
    for (let o = 0; o < G.n; o++) {
      const k = P.keyOrder[o]
      if (k == null) continue
      const t0 = B.keys0 + (B.keys1 - B.keys0 - kw) * o / Math.max(1, G.n - 1)
      const kt = clamp01((p - t0) / kw)
      if (kt > 0 && H.keyT[k] <= 0 && down) App.audio.sfx('tick', { volume: 0.32, pitch: 1.1 + k * 0.03, pan: 0.5 })
      H.keyT[k] = kt
    }
    // 钥匙分配完成、各人与房号绑定的那一刻：十三枚号牌同时无声地现出号码（1 号正北，顺时针）
    const want = P.started && p >= B.bind ? 1 : 0
    for (const s of H.seats) ease(s, 'lit', want, rdt, 0.12)
    // 按自己所选的编号重新入座
    seatPeople(p)
    // 第二条第一句说出的同时，每人十枚金币出现在各人面前的桌上，码成一摞
    const coinOn = p >= B.coins
    if (crossed('coins', coinOn, down)) { App.audio.sfx('coins', { volume: 0.55 }); for (const s of H.seats) s.cflash = 1 }
    // 第四条说完：规则卡；第五条：身份卡（两面空白）
    const ruleOn = p >= B.ruleCard, idOn = p >= B.ident
    if (crossed('rule', ruleOn, down)) { App.audio.sfx('card', { volume: 0.6 }); for (const s of H.seats) s.cflash = 1 }
    if (crossed('ident', idOn, down)) { App.audio.sfx('card', { volume: 0.6, pitch: 0.8 }); for (const s of H.seats) s.cflash = 1 }
    // 自我介绍：从一号起，依次
    const introK = p >= B.intro0 && p < B.intro1 ? 1 + Math.min(G.n - 1, Math.floor((p - B.intro0) / (B.intro1 - B.intro0) * G.n)) : -1
    if (introK !== P.introK) { P.introK = introK; if (introK > 0 && down) App.audio.sfx('hover', { volume: 0.5, pitch: 0.7 + introK * 0.03 }) }
    for (const s of H.seats) {
      ease(s, 'coinA', coinOn ? 1 : 0, rdt, 0.1)
      ease(s, 'ruleA', ruleOn ? 1 : 0, rdt, 0.1)
      ease(s, 'idA', idOn ? 1 : 0, rdt, 0.1)
      ease(s, 'lamp', s.k === introK ? 1 : 0, rdt, 0.18)
    }
    P.autoK = introK
    // 第六条开口的同时，议事厅的三扇门自己打开
    const doorOn = p >= B.doors
    if (crossed('doors', doorOn, down)) { App.audio.sfx('wind', { volume: 0.45 }); App.audio.sfx('whoosh', { volume: 0.3, pitch: 0.5 }) }
    ease(H, 'doorOpen', doorOn ? 1 : 0, rdt, doorOn ? 0.9 : 0.4)

    keyFall(p)
    P.lastPs = p
  }

  function keyFall(p) {
    const H = P.H, E = P.E
    const t = clamp01((p - B.key0) / B.keySpan)
    if (t <= 0) {
      if (P.keyShown) { P.keyShown = false; E.key.style.opacity = '0'; E.key.style.visibility = 'hidden' }
      P.keyLanded = false
      return
    }
    if (!P.keyShown) E.key.style.visibility = 'visible'
    P.keyShown = true
    // 起点：这把钥匙那一席的号牌（钥匙早已在那个人手里）
    let sx = H.W * 0.5, sy = H.H * 0.36
    const q = H.plateScreen(P.keyNo)
    if (q && q.x > 0 && q.x < H.W && q.y > 0 && q.y < H.H) { sx = q.x; sy = q.y }
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
    // 舞台位置也在写样式之前量（之后再量会逼浏览器当场重算样式）
    const r = E.stage.getBoundingClientRect()
    // 平滑跟随用真实时间（与帧率无关；隔了很久才回来就直接到位）
    const rdt = Math.min(1, (now - (P.lastNow || now)) / 1000)
    P.lastNow = now
    P.ps += (P.p - P.ps) * (1 - Math.exp(-rdt / 0.12))
    if (Math.abs(P.p - P.ps) < 0.0004) P.ps = P.p
    applyScroll(P.ps, Math.max(1 / 240, rdt))
    // 光标 → 光源
    const m = App.mouse
    const inside = m.x >= r.left && m.x <= r.right && m.y >= r.top && m.y <= r.bottom
    const touchOk = App.finePointer || now < P.touchUntil
    H.ptr.x = m.x - r.left; H.ptr.y = m.y - r.top
    H.ptr.on = P.ptrIn && inside && touchOk && P.started && H.dark < 0.95
    if (App.finePointer || !P.started) {
      // 光标离开画面：光回到天眼下那一环灯，轻轻摇晃
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
      const k = H.ptr.on && P.ps < B.dark0 - 0.02 && !(App.overlay && App.overlay.isOpen) ? H.pick(H.ptr.x, H.ptr.y) : -1
      setHover(k)
    }
    // 自我介绍那一段：轮到谁，名牌就跟着谁（光标悬停、点开的台词优先）
    if (P.autoK > 0 && P.hoverK < 0 && P.lineK < 0) showTag(P.autoK)
    else if (P.autoK < 0 && P.hoverK < 0 && P.lineK < 0 && P.tagK > 0 && App.finePointer) hideTag()
    if (P.lineK > 0 && now > P.tagUntil && P.hoverK !== P.lineK) hideTag()
    if (!App.finePointer && P.tagK > 0 && P.lineK < 0 && P.autoK < 0 && now > P.tagUntil) hideTag()
    if (P.ps > B.dark0 && P.tagK > 0) { P.lineK = -1; hideTag() }
    // 镜头/光在动、状态在变时每帧画；只剩环境动画时约 30 帧；全黑时不画
    if (H.needs(now)) H.render()
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
        css(E.tag, 'transform', 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)')
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
      P.H = createHall({ canvas: P.E.cv, vignette: true, motes: App.reduced ? 20 : 70, blankNums: true })
      P.H.lensA = 1
      P.H.lensOpen = 0.42
      P.H.poolA = 0.2
      arrange()
      layout()
      // 遮幕前：未醒的人、空白的号牌
      P.E.title._chars = App.text.split(P.E.title)
      gsap.set(P.E.title._chars, { opacity: 0 })
      gsap.set([P.E.seal, P.E.latin, P.E.clock, P.E.cue, P.E.key, P.E.voice, P.E.rules], { opacity: 0 })
      P.E.voice.style.visibility = 'hidden'
      P.E.rules.style.visibility = 'hidden'
      P.vis = true
      App.bus.on('wake', runWake)
      App.bus.on('cast:change', () => arrange())
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
      App.bus.on('quality', () => layout())
      // 字体到了以后十九条的行高会变：重量一次
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout())
      // 远离视口时交还画布内存，回来之前重新铺好
      App.bus.on('section:far', id => { if (id === el.id && P.H) P.H.release() })
      App.bus.on('section:near', id => { if (id === el.id && P.H) layout() })
      App.tick(frame)
    },
  })
})()
