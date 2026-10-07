/* ==========================================================
   卡池 · cast —— 二层东肖像廊
   滚动时长廊横向推进：38 幅肖像挂在暗酒红织锦墙上，细黄铜画框（尖拱 / 椭圆 / 内凹角 / 八角，一套四型），
   画框下一块小铜名牌（名字 + 尚未解出的称号）。
   光标是一支蜡烛：靠近的画框被照亮，黄铜反光与投影随烛光移动；远处的肖像沉在黑里，只剩一双双血粉的虹膜在发光
   （位图肖像的虹膜位置见 EYES）。画像随光标微微偏转、像在转头看你。
   你停下不动时它们一幅幅转开、望向长廊东头，眼里的光暗下去；你一动——整条长廊同时转回来，所有的眼睛一齐亮起。
   悬停：烛光落在这一幅上（暖光随烛火移动、背后垫一道金色轮廓光）、其余沉暗，玻璃上掠过一道反光，
   画框被风吹得晃一下，名牌上的称号解码出来。
   点击：弹丸论破「通信簿」式档案（App.overlay）：斜切的签名色块、巨大肖像、竖排巨名、
   判定七项七边形雷达、随身物、别人眼里、台词（打字机）、梦想；←/→ 切换。
   长廊尽头多挂一只空框：你走近时它是空的，你走远时，里面有一双眼睛。
   数据：CHARACTERS（人物卡/*.md 提炼）；判定七项的档位见 人物卡/00_卡司总则.md §3。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  if (window.ScrambleTextPlugin) gsap.registerPlugin(window.ScrambleTextPlugin)

  const PX = 'cast-'
  // el('div.frame.is-hot') → <div class="cast-frame is-hot">
  const el = (spec, attrs, kids) => U.el(spec.replace(/\.([a-z][\w-]*)/gi, (m, c) => '.' + (/^is-/.test(c) ? c : PX + c)), attrs, kids)
  const sv = (tag, attrs) => U.svg(tag, attrs)
  const CH = App.chars
  const N = CH.length
  const RM = App.reduced
  const PAL = { a: '#1c0a11', b: '#d9a54e', glow: 0.42 }
  const smooth = (a, b, v) => { const t = U.clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
  const approach = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.pow(1 - k, dt))
  const two = n => String(n).padStart(2, '0')
  const typo = s => String(s || '').replace(/'([^'\n]*)'/g, '‘$1’').replace(/"([^"\n]*)"/g, '“$1”')
  const Q = () => (App.quality ? App.quality.level : 2) // 2 全效果 / 1 / 0 最省

  /* 位图肖像的虹膜位置（画面比例 0–1；从 assets/art/portraits/*.webp 的血粉虹膜量出）。
     只露一只眼的（格斯、宇智波斑）只有一个点。十五席的圆形徽章也用它来对准脸。 */
  const EYES = {
    aizen: [[0.421, 0.407], [0.58, 0.408]], akagi: [[0.443, 0.404], [0.558, 0.4]], armin: [[0.435, 0.407], [0.565, 0.408]],
    baku: [[0.432, 0.411], [0.571, 0.405]], battler: [[0.421, 0.421], [0.579, 0.4]], beatrice: [[0.424, 0.419], [0.58, 0.4]],
    dio: [[0.437, 0.413], [0.563, 0.406]], eren: [[0.342, 0.409], [0.47, 0.414]], frieren: [[0.403, 0.404], [0.597, 0.404]],
    gilgamesh: [[0.418, 0.414], [0.581, 0.405]], griffith: [[0.396, 0.417], [0.605, 0.408]], guts: [[0.578, 0.412]],
    haruaki: [[0.412, 0.403], [0.587, 0.42]], higuruma: [[0.42, 0.391], [0.582, 0.403]], itachi: [[0.416, 0.409], [0.587, 0.408]],
    johnny: [[0.426, 0.415], [0.574, 0.404]], junko: [[0.425, 0.404], [0.574, 0.406]], kaiji: [[0.431, 0.415], [0.579, 0.396]],
    kiritsugu: [[0.412, 0.413], [0.589, 0.413]], kurisu: [[0.417, 0.407], [0.579, 0.405]], l: [[0.435, 0.429], [0.567, 0.395]],
    light: [[0.412, 0.405], [0.589, 0.407]], madara: [[0.583, 0.41]], makima: [[0.468, 0.393], [0.601, 0.423]],
    mikasa: [[0.417, 0.411], [0.58, 0.412]], muzan: [[0.42, 0.414], [0.575, 0.402]], naruhodo: [[0.418, 0.411], [0.582, 0.408]],
    obito: [[0.42, 0.412], [0.577, 0.406]], saber: [[0.414, 0.404], [0.603, 0.414]], sasuke: [[0.418, 0.411], [0.58, 0.41]],
    shanks: [[0.426, 0.4], [0.571, 0.415]], sherlock: [[0.435, 0.411], [0.564, 0.409]], shinichi: [[0.41, 0.419], [0.552, 0.401]],
    shinobu: [[0.424, 0.404], [0.575, 0.422]], sukuna: [[0.408, 0.422], [0.491, 0.4]], thragg: [[0.42, 0.41], [0.581, 0.411]],
    valentine: [[0.456, 0.421], [0.598, 0.398]], yumeko: [[0.423, 0.381], [0.579, 0.436]],
  }
  App.castEyes = EYES
  // 长廊里位图肖像的偏转幅度（与 cast.css 里 .cast-por.is-photo > img 的 transform 一致）
  const TURN = { x: 0.032, y: 0.022, s: 1.07 }
  const isPhoto = por => !!(por && por.classList.contains('is-photo'))

  /* =====================================================================
     画框：一套四型
     ===================================================================== */
  const SHAPES = {
    arch(x, y, w, h) {
      const a = Math.min(w * 0.64, h * 0.5)
      return `M${x} ${y + h}L${x} ${y + a}C${x} ${y + a * 0.42} ${x + w * 0.3} ${y + a * 0.1} ${x + w / 2} ${y}C${x + w * 0.7} ${y + a * 0.1} ${x + w} ${y + a * 0.42} ${x + w} ${y + a}L${x + w} ${y + h}Z`
    },
    oval(x, y, w, h) {
      const rx = w / 2, ry = h / 2
      return `M${x} ${y + ry}A${rx} ${ry} 0 1 1 ${x + w} ${y + ry}A${rx} ${ry} 0 1 1 ${x} ${y + ry}Z`
    },
    rect(x, y, w, h) {
      const r = Math.min(w, h) * 0.09
      return `M${x + r} ${y}L${x + w - r} ${y}A${r} ${r} 0 0 0 ${x + w} ${y + r}L${x + w} ${y + h - r}A${r} ${r} 0 0 0 ${x + w - r} ${y + h}L${x + r} ${y + h}A${r} ${r} 0 0 0 ${x} ${y + h - r}L${x} ${y + r}A${r} ${r} 0 0 0 ${x + r} ${y}Z`
    },
    oct(x, y, w, h) {
      const c = Math.min(w, h) * 0.17
      return `M${x + c} ${y}L${x + w - c} ${y}L${x + w} ${y + c}L${x + w} ${y + h - c}L${x + w - c} ${y + h}L${x + c} ${y + h}L${x} ${y + h - c}L${x} ${y + c}Z`
    },
  }
  const SIZE = { arch: [1, 1.38], rect: [0.93, 1.22], oct: [0.88, 1.16], oval: [0.86, 1.12] }
  const TOP = ['arch', 'oval', 'rect', 'oct', 'arch', 'rect', 'oval', 'oct']
  const BOT = ['oct', 'rect', 'arch', 'oval', 'rect', 'oct', 'arch', 'oval']
  const fr = v => Math.round(v * 10) / 10

  // 画框外圈的装饰（与身份纹章同一套：小菱形、圆点、短线）
  function ornaments(type, P, w, h, b) {
    const g = []
    const dia = (x, y, s) => `<path d="M${fr(x)} ${fr(y - s)}L${fr(x + s)} ${fr(y)}L${fr(x)} ${fr(y + s)}L${fr(x - s)} ${fr(y)}Z"/>`
    const dot = (x, y, r) => `<circle cx="${fr(x)}" cy="${fr(y)}" r="${r}"/>`
    const cx = P + w / 2
    if (type === 'arch') {
      const top = P - b
      g.push(`<path d="M${fr(cx)} ${fr(top - 3)}L${fr(cx)} ${fr(top - 17)}" fill="none"/>`, dia(cx, top - 20, 4.2), dot(cx - 7, top - 9, 1.4), dot(cx + 7, top - 9, 1.4))
      const a = Math.min(w * 0.64, h * 0.5)
      g.push(dot(P - b - 1, P + a, 2.2), dot(P + w + b + 1, P + a, 2.2))
    } else if (type === 'oval') {
      g.push(dia(cx, P - b - 6, 4), dia(cx, P + h + b + 6, 4), dia(P - b - 6, P + h / 2, 3.4), dia(P + w + b + 6, P + h / 2, 3.4))
    } else if (type === 'rect') {
      const o = b + 4
      for (const [x, y] of [[P - o, P - o], [P + w + o, P - o], [P - o, P + h + o], [P + w + o, P + h + o]]) g.push(`<rect x="${fr(x - 3)}" y="${fr(y - 3)}" width="6" height="6" transform="rotate(45 ${fr(x)} ${fr(y)})"/>`)
      g.push(dia(cx, P - b - 7, 3.2))
    } else {
      const c = Math.min(w, h) * 0.17
      for (const [x, y] of [[P + c, P - b - 5], [P + w - c, P - b - 5], [P + c, P + h + b + 5], [P + w - c, P + h + b + 5]]) g.push(dot(x, y, 1.8))
      g.push(dia(cx, P - b - 8, 3.6))
    }
    return g.join('')
  }

  /* =====================================================================
     墙纸：暗酒红织锦（SVG 图案，平铺）
     ===================================================================== */
  const DAMASK = (() => {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="184" viewBox="0 0 132 184">
<g fill="none" stroke="#4a1d29" stroke-width="1" stroke-linecap="round" stroke-opacity=".8">
<path d="M66 18C80 38 100 46 100 70C100 90 80 98 66 118C52 98 32 90 32 70C32 46 52 38 66 18Z" fill="#230c13" fill-opacity=".5"/>
<path d="M66 36C74 50 86 56 86 70C86 82 74 88 66 100C58 88 46 82 46 70C46 56 58 50 66 36Z"/>
<path d="M66 52C70 60 76 64 76 70C76 76 70 80 66 86C62 80 56 76 56 70C56 64 62 60 66 52Z" fill="#2e111a" fill-opacity=".5"/>
<path d="M66 118C66 134 56 142 44 148M66 118C66 134 76 142 88 148M66 118L66 160"/>
<path d="M32 70C16 66 10 52 14 40C20 50 27 52 34 50M100 70C116 66 122 52 118 40C112 50 105 52 98 50"/>
<path d="M44 148C36 152 30 150 28 144M88 148C96 152 102 150 104 144"/>
<circle cx="66" cy="10" r="2.4"/><circle cx="66" cy="166" r="2"/>
<path d="M0 0C10 12 10 26 0 36M132 0C122 12 122 26 132 36M0 92C12 100 12 116 0 124M132 92C120 100 120 116 132 124"/>
<path d="M0 160C8 168 8 178 0 184M132 160C124 168 124 178 132 184"/>
</g></svg>`
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(s.replace(/\n/g, '')) + '")'
  })()

  /* =====================================================================
     渲染结构（为合成器省力）
     整条长廊只有墙一个合成层（.cast-wall，随滚动平移）。每幅画在墙里画一份「未照亮」的静态版：
     投影、窗（暗底 + .12 的背光 + 肖像 + .62 的面纱）、.42 的黄铜框、.38 的名牌——都不单独成层，画一次就不再动。
     只有烛光够得着的那几幅（.cast-lv，挂在墙末尾的 .cast-live 里）才有动态层：
       · .cast-b     照亮版（背光全亮、黄铜框全亮、名牌全亮）一个层，opacity 随亮度：叠在静态版上做交叉淡入，
                     代替原来 back / veil / frame / plate 各自按亮度改 opacity（公式见 litMix）；
       · .cast-turn  肖像（连同压在肖像下沿的地面暗影）搬进这里的窗：偏转只改 transform；
                     原来盖在上面的面纱与沉暗（近黑色）改成同一层的 filter: brightness()，不重画、不多一层；
       · .cast-shine 黄铜反光：以框线为遮罩、跟着烛光平移的一块光斑（亮度够时才有）。
     悬停的那一幅另有暖斑、轮廓光、玻璃反光与晃动；晃动时墙里的静态版换成一份跟着晃的拷贝（.cast-a2）。
     眼睛的光点画在 .cast-fore 里（不各自成层，变化只重画几个小方块）。
     ===================================================================== */
  // 照亮版的权重：原公式背光 .12+.88L、面纱 .62-.62L，看得见的背光 = (.38+.62L)(.12+.88L)；
  // 静态版 .0456、照亮版 1，交叉淡入的权重取 f = .4283L + .5717L² 时背光与原来一致（框、名牌在中间亮度时略暗一点）
  const litMix = L => 0.4283 * L + 0.5717 * L * L
  const RANGE = 10 // 视线偏转幅度（原 App.trackEyes 的 eyeRange）

  /* =====================================================================
     状态
     ===================================================================== */
  const S = {
    built: false, visible: false, mob: false,
    vw: 1440, vh: 900, u: 200, introW: 600, trackW: 4000, travel: 3000, k: 0.8,
    p: 0, x: 0, cx: 720, cy: 450, dip: 0, flare: 0, flick: 1,
    items: [], hot: null, cur: -1,
    away: false, awaySince: 0, lastAct: 0, lastMoment: 0, firstPending: true, visSince: 0,
    lastTouch: -1e9, stageTop: 0, secTop: 0, secH: 0, fno: 0,
  }
  let sec, sticky, wall, livePlane, fore, dark, hudCount, hudFill, hudTicks, voidIt

  /* =====================================================================
     布局
     ===================================================================== */
  function layout() {
    S.vw = window.innerWidth
    S.vh = window.innerHeight
    S.mob = S.vw < 760
    const vh = S.vh
    const top = S.mob ? 66 : 82
    const bot = S.mob ? 62 : 74
    const plate = S.mob ? 44 : 52
    const nail = S.mob ? 20 : 26
    const gap = S.mob ? 18 : 26
    let u = (vh - top - bot - 2 * (plate + nail) - gap) / (2 * 1.38)
    u = Math.min(u, S.mob ? S.vw * 0.5 : 232)
    u = Math.max(u, 120)
    S.u = u
    const colW = u * (S.mob ? 1.16 : 1.2)
    S.introW = S.mob ? S.vw * 0.92 : Math.max(540, S.vw * 0.4)
    const rowH = 1.38 * u + plate + nail
    const y1 = top + nail + (1.38 * u) / 2
    const y2 = top + rowH + gap + nail + (1.38 * u) / 2
    S.rows = [y1, y2]
    const cols = Math.ceil(N / 2)
    for (let i = 0; i < N; i++) {
      const it = S.items[i]
      const c = Math.floor(i / 2), r = i % 2
      const type = (r ? BOT : TOP)[c % TOP.length]
      const [sw, sh] = SIZE[type]
      const w = Math.round(u * sw), h = Math.round(u * sh)
      const cx = S.introW + c * colW + (r ? colW / 2 : 0) + colW / 2
      const cy = r ? y2 : y1
      Object.assign(it, { type, w, h, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) })
    }
    // 尽头的空框
    const lastC = S.introW + cols * colW + colW * 0.9
    const vw0 = Math.round(u * 1.04), vh0 = Math.round(u * 1.44)
    Object.assign(voidIt, { type: 'arch', w: vw0, h: vh0, x: Math.round(lastC - vw0 / 2), y: Math.round((y1 + y2) / 2 - vh0 / 2) })
    S.trackW = Math.round(lastC + (S.mob ? S.vw * 0.62 : S.vw * 0.5))
    S.travel = Math.max(1, S.trackW - S.vw)
    S.k = S.mob ? 0.85 : 0.78 // 竖向滚动 1px → 横向推进 1/k px
    sec.style.height = Math.round(vh + S.travel * S.k) + 'px'
    wall.style.width = fore.style.width = S.trackW + 'px'
    for (const it of S.items) placeItem(it)
    placeItem(voidIt)
    const intro = fore.querySelector('.cast-intro')
    intro.style.width = S.introW + 'px'
    sec.classList.toggle('is-mob', S.mob)
    // 前景层只框住真正画了东西的那一条：标题与两排眼睛（它的合成层不必盖满整屏）
    let t0 = 1e9, t1 = -1e9
    for (const it of S.items.concat([voidIt])) { t0 = Math.min(t0, it.y + it.pt + it.ph * 0.3 - 30); t1 = Math.max(t1, it.y + it.pt + it.ph * 0.56 + 30) }
    intro.style.top = '0px'
    intro.style.height = vh + 'px'
    for (const n of intro.children) { t0 = Math.min(t0, n.offsetTop - 24); t1 = Math.max(t1, n.offsetTop + n.offsetHeight + 24) }
    const ft = Math.max(0, Math.floor(t0)), fb = Math.min(vh, Math.ceil(t1))
    S.foreTop = ft
    fore.style.top = ft + 'px'
    fore.style.height = fb - ft + 'px'
    intro.style.top = -ft + 'px'
    for (const it of S.items.concat([voidIt])) placeEyes(it)
    // 红线：从空框垂到画外（带入十五席）。SVG 只框住线本身（带发光的余量），发光滤镜只落在这一小块上
    const th = wall.querySelector('.cast-thread')
    if (th) {
      const x0 = voidIt.x + voidIt.w / 2, y0 = voidIt.y - nail
      const x1 = S.trackW - 10, y1b = vh + 40
      const pad = 12
      const bx = Math.floor(x0 - pad), by = Math.floor(y0 - pad), bw = Math.ceil(x1 - x0 + 2 * pad), bh = Math.ceil(y1b - y0 + 2 * pad)
      th.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`)
      Object.assign(th.style, { left: bx + 'px', top: by + 'px', width: bw + 'px', height: bh + 'px' })
      th.querySelector('path').setAttribute('d', `M${x0} ${y0}C${x0 + 60} ${y0 + vh * 0.5} ${x1 - 220} ${vh * 0.62} ${x1} ${y1b}`)
    }
    S.measured = false
    measureSec()
  }
  // 板块在文档里的位置（滚动中不读布局：烛光的竖直坐标用它与 scrollY 推出来）
  function measureSec() {
    if (!sec) return
    S.secTop = sec.getBoundingClientRect().top + window.scrollY
    S.secH = sec.offsetHeight
  }
  function stageTop() {
    const st = S.secTop - window.scrollY
    return st >= 0 ? st : Math.min(0, S.secTop + S.secH - S.vh - window.scrollY)
  }

  // 静态 SVG 一律做成背景图（data URI）：没有 SVG 子树要重算样式，同形同尺寸的画框共用一张
  const svgURL = s => 'url("data:image/svg+xml;utf8,' + encodeURIComponent(s) + '")'
  const frameCache = {}
  function frameLines(type, w, h, b, P, c) {
    return `<g fill="none" stroke="${c}">` +
      `<path d="${SHAPES[type](P - b, P - b, w + 2 * b, h + 2 * b)}" stroke-width="1.6"/>` +
      `<path d="${SHAPES[type](P - b * 0.5, P - b * 0.5, w + b, h + b)}" stroke-width=".6" stroke-dasharray="1 3" opacity=".8"/>` +
      `<path d="${SHAPES[type](P, P, w, h)}" stroke-width="1"/></g>` +
      `<g fill="${c}" stroke="${c}" stroke-width="1">${ornaments(type, P, w, h, b)}</g>`
  }
  // 黄铜框：线条是渐变最外圈的暗铜色；烛光的反光是叠在上面、以线条为遮罩的光斑（.cast-shine）
  function frameImages(type, w, h, b, P) {
    const key = `${type}:${w}x${h}:${b}`
    if (frameCache[key]) return frameCache[key]
    const W = w + 2 * P, H = h + 2 * P
    const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    const frame = svgURL(head +
      `<defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#21170e"/><stop offset=".5" stop-color="#0c0806"/><stop offset="1" stop-color="#1a120b"/></linearGradient></defs>` +
      `<path d="${SHAPES[type](P - b, P - b, w + 2 * b, h + 2 * b)} ${SHAPES[type](P, P, w, h)}" fill="url(#m)" fill-rule="evenodd" opacity=".96"/>` +
      frameLines(type, w, h, b, P, '#2a1d10') + '</svg>')
    const mask = svgURL(head + frameLines(type, w, h, b, P, '#fff') + '</svg>')
    return (frameCache[key] = { frame, mask, W, H })
  }

  function placeItem(it) {
    const { w, h, type } = it
    const b = Math.max(7, Math.round(S.u * 0.045)) // 框条宽
    const P = b + 26
    it.b = b; it.P = P
    for (const n of [it.node, it.lv]) {
      n.style.left = it.x + 'px'
      n.style.top = it.y + 'px'
      n.style.width = w + 'px'
      n.style.height = h + 'px'
    }
    const clip = `path('${SHAPES[type](0, 0, w, h)}')`
    for (const n of [it.win, it.bwin, it.wl, it.hit]) { n.style.clipPath = clip; n.style.webkitClipPath = clip }
    // 投影：画框形状的黑影，模糊预先烘焙成图（同形同尺寸的画框共用）；静态，不随烛光移动（暗处本来看不见，亮处几乎被框挡住）
    const SW = w + 2 * b, SH = h + 2 * b, sp = 30
    const sh = it.shadow.firstChild
    sh.style.width = SW + 2 * sp + 'px'
    sh.style.height = SH + 2 * sp + 'px'
    sh.style.left = sh.style.top = -sp + 'px'
    sh.style.backgroundImage = shadowImage(type, SW, SH, sp)
    it.shadow.style.left = it.shadow.style.top = -b + 'px'
    // 肖像：头部落在窗口约 46% 高处
    const pw = Math.max(w * 1.06, h * 0.78), ph = pw * 4 / 3
    it.pw = pw; it.ph = ph
    it.pl = (w - pw) / 2; it.pt = h * 0.46 - ph * 0.41
    Object.assign(it.por.style, { width: pw + 'px', height: ph + 'px', left: it.pl + 'px', top: it.pt + 'px' })
    if (it.floor) Object.assign(it.floor.style, { left: -it.pl + 'px', top: -it.pt + 'px', width: w + 'px', height: h + 'px' })
    // 黄铜框（静态版 .42 与照亮版 1 用同一张图）与反光的遮罩
    const F = frameImages(type, w, h, b, P)
    for (const n of [it.frame, it.bframe]) {
      n.style.width = F.W + 'px'
      n.style.height = F.H + 'px'
      n.style.left = n.style.top = -P + 'px'
      n.style.backgroundImage = F.frame
    }
    const sh2 = it.shine.style
    sh2.width = F.W + 'px'; sh2.height = F.H + 'px'; sh2.left = sh2.top = -P + 'px'
    sh2.webkitMaskImage = sh2.maskImage = F.mask
    it.sr = Math.max(F.W, F.H) * 0.95
    it.spot.style.width = it.spot.style.height = (2 * it.sr).toFixed(1) + 'px'
    it.gx = -1e9; it.gy = -1e9
    moveShine(it, F.W / 2, -F.H) // 初始：光在画框正上方很远处
    // 烛光暖斑的基准半径（实际半径 = 到窗口最远角的距离，用 scale 换算）
    it.lb = Math.hypot(w, h)
    it.lamp.firstChild.style.width = it.lamp.firstChild.style.height = (2 * it.lb).toFixed(1) + 'px'
    it.lmw = ''
    // 钉子与挂绳
    const nail = S.mob ? 20 : 26
    const a1 = type === 'oval' ? w * 0.22 : w * 0.16
    Object.assign(it.wire.style, { width: w + 'px', height: nail + 30 + 'px', top: -nail + 'px' })
    it.wire.style.backgroundImage = svgURL(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${nail + 30}" viewBox="0 0 ${w} ${nail + 30}"><path d="M${fr(a1)} ${nail + 22}L${fr(w / 2)} 3L${fr(w - a1)} ${nail + 22}" fill="none" stroke="#6f5532" stroke-width=".8" opacity=".75"/><circle cx="${fr(w / 2)}" cy="3" r="2.6" fill="#c29a5b"/><circle cx="${fr(w / 2 - 0.8)}" cy="2.2" r=".9" fill="#ffe7b0"/></svg>`)
    it.swing.style.transformOrigin = `${w / 2}px ${-nail + 3}px`
    // 名牌（静态版与照亮版各一块，叠在同一处）
    for (const n of [it.plate, it.bplate]) {
      n.style.left = w / 2 + 'px'
      n.style.top = h + b + (S.mob ? 8 : 12) + 'px'
    }
    it.tw = ''
    if (it.photo != null) freeze(it)
  }

  // 投影图：画框形状用 canvas 的 shadowBlur（= 2σ）模糊一次，转成图片缓存；形状画在画布外，只让影子落进来
  const shadowCache = {}
  function shadowImage(type, SW, SH, sp) {
    const key = `${type}:${SW}x${SH}`
    if (shadowCache[key]) return shadowCache[key]
    const c = document.createElement('canvas')
    c.width = SW + 2 * sp
    c.height = SH + 2 * sp
    const g = c.getContext('2d')
    const off = c.width + 40
    g.shadowColor = '#000'
    g.shadowBlur = 18
    g.shadowOffsetX = off
    g.translate(sp - off, sp)
    g.fill(new Path2D(SHAPES[type](0, 0, SW, SH)))
    return (shadowCache[key] = `url("${c.toDataURL()}")`)
  }

  // 2% 一档：亮度渐变时肉眼分不出，滚动中少写很多次
  const setOp = (it, key, node, v) => {
    if (!node) return
    const o = Math.round(v * 50) / 50
    if (it[key] !== o) { it[key] = o; node.style.opacity = o }
  }
  function moveShine(it, gx, gy) {
    it.gx = gx; it.gy = gy
    it.spot.style.transform = `translate3d(${(gx - it.sr).toFixed(1)}px,${(gy - it.sr).toFixed(1)}px,0)`
  }

  /* =====================================================================
     肖像偏转（原来由 App.trackEyes 给每幅画写 --pvx/--pvy；这里自己算，只把结果写给需要的那一层）
     ===================================================================== */
  // 动态层里：完整的偏转（平移 + 透视转头）
  function pose(it) {
    if (!it.photo) return
    const px = Math.round((it.ox / RANGE) * 50) / 50, py = Math.round((it.oy / RANGE) * 50) / 50
    const t = `translate3d(${(px * TURN.x * it.pw).toFixed(2)}px,${(py * TURN.y * it.ph).toFixed(2)}px,0) perspective(900px) rotateY(${(px * 5).toFixed(2)}deg)`
    if (t !== it.tw) { it.tw = t; it.turn.style.transform = t }
  }
  // 回到墙里：停在当时的姿态（二维平移，不再成层）
  function freeze(it) {
    if (!it.photo) { it.turn.style.transform = ''; return }
    const px = it.ox / RANGE, py = it.oy / RANGE
    it.turn.style.transform = `translate(${(px * TURN.x * it.pw).toFixed(1)}px,${(py * TURN.y * it.ph).toFixed(1)}px)`
    it.tw = ''
  }

  // 烛光够得着：照亮版、肖像、反光换成动态层
  function promote(it) {
    it.live = true
    it.lv.classList.add('is-on')
    it.wl.insertBefore(it.por, it.lamp)
    it.tw = ''; it.fw = ''
    it.oB = it.oWB = it.oSh = null
  }
  function demote(it) {
    if (it.warm) setWarm(it, false)
    it.live = false
    it.lv.classList.remove('is-on', 'is-shine')
    it.shineOn = false
    it.win.insertBefore(it.por, it.shade)
    it.turn.style.filter = ''
    it.fw = ''
    freeze(it)
  }
  // 悬停（与离开后的余温、晃动）期间：墙里的静态版藏起来，换成一份跟着晃的拷贝；照亮版的背光挪进窗里与肖像同组，暖斑才混合得到它
  function setWarm(it, on) {
    it.warm = on
    it.node.classList.toggle('is-warm', on)
    it.lv.classList.toggle('is-warm', on)
    if (it.a2) { it.a2.remove(); it.a2 = null }
    if (on) {
      it.a2 = it.a.cloneNode(true)
      it.a2.classList.add('cast-a2')
      it.swing.insertBefore(it.a2, it.bl)
    } else {
      if (it.svg) it.svg.style.filter = ''
      if (it.lamp) { it.lamp.style.opacity = '0'; it.low = '0' }
      if (it.rim) { it.rim.style.opacity = '0'; it.rimw = '' }
      it.filtered = false
    }
    it.oWB = null
  }

  /* =====================================================================
     建 DOM
     ===================================================================== */
  function makeItem(i, c) {
    const isVoid = !c
    const it = { i, k: isVoid ? 'v' : i, c, lit: 0, heat: 0, pf: 0, on: false, live: false, warm: false, sway: null, decoded: false, void: isVoid, gaze: { x: 0, y: 0 }, fixed: false, ox: 0, oy: 0, halos: [] }
    const node = el('div.item' + (isVoid ? '.item--void' : ''), { 'data-i': i })
    if (c) node.style.setProperty('--accent', (c.art && c.art.accent) || App.color.blood)
    // —— 静态版（墙里画一次）——
    const wire = el('i.wire', { 'aria-hidden': 'true' })
    const shadow = el('div.shadow', { 'aria-hidden': 'true' }, el('i'))
    const win = el('div.win')
    const back = el('div.back')
    const glass = isVoid ? el('div.glass') : null
    const por = App.portrait(isVoid ? '__void' : c.id, { className: 'cast-por', track: false })
    const shade = el('div.shade')
    win.append(...[back, glass, por, shade].filter(Boolean))
    const frame = el('div.frame', { 'aria-hidden': 'true' })
    const a = el('div.a', { 'aria-hidden': 'true' }, [shadow, win, frame])
    const epiTxt = isVoid ? '·····' : '·'.repeat(Math.max(3, Array.from(c.epithet || '').length))
    const plate = el('div.plate', null, [el('i.rivet'), el('span.name', { text: isVoid ? '？？？' : c.name }), el('span.epi', { text: epiTxt }), isVoid ? null : el('span.seatno'), el('i.rivet')])
    // 可交互的窗（透明，形状同窗口）：悬停时静态版会藏起来，热区不能跟着藏
    const hit = el('div.hit', isVoid
      ? { role: 'button', tabindex: '0', 'aria-label': '？', 'data-cursor': '', 'data-cursor-tone': 'blood' }
      : { role: 'button', tabindex: '0', 'aria-label': c.name, 'data-cursor': '' })
    node.append(wire, a, plate, hit)
    // —— 动态层（只在烛光够得着时显示）——
    const bwin = el('div.bwin')
    const bframe = el('div.frame.frame--lit', { 'aria-hidden': 'true' })
    const bplate = plate.cloneNode(true)
    bplate.setAttribute('aria-hidden', 'true')
    const bl = el('div.b', { 'aria-hidden': 'true' }, [bwin, bframe, bplate])
    const wback = el('div.wback', null, el('i.hotglow'))
    const lamp = el('div.lamp', null, el('i.lamp-spot'))
    const glint = isVoid ? null : el('div.glint')
    const wl = el('div.w', { 'aria-hidden': 'true' }, [wback, lamp, glint].filter(Boolean))
    const spot = el('i.shine-spot')
    const shineEl = el('div.shine', { 'aria-hidden': 'true' }, spot)
    const swing = el('div.swing', null, [bl, wl, shineEl])
    const lv = el('div.lv' + (isVoid ? '.lv--void' : ''), null, swing)
    if (c) lv.style.setProperty('--accent', (c.art && c.art.accent) || App.color.blood)
    Object.assign(it, {
      node, wire, a, shadow, win, back, glass, por, shade, frame, plate, hit,
      epi: plate.querySelector('.cast-epi'), seat: plate.querySelector('.cast-seatno'),
      lv, swing, bl, bwin, bframe, bplate, bepi: bplate.querySelector('.cast-epi'), bseat: bplate.querySelector('.cast-seatno'),
      wl, wback, lamp, glint, shine: shineEl, spot,
    })
    wrapPortrait(it)
    it.blinkAt = performance.now() + 2000 + Math.random() * 9000
    // 凝视方向（移开视线时看哪里）：多数顺着长廊望向东头
    if (isVoid) { it.gdx = -1; it.gdy = 0.1 } else {
      const rnd = U.seeded(97 + i * 31)
      const ang = rnd() < 0.68 ? U.lerp(-0.35, 0.75, rnd()) : Math.PI + U.lerp(-0.6, 0.5, rnd())
      it.gdx = Math.cos(ang); it.gdy = Math.sin(ang) * 0.8
    }
    if (isVoid) bindVoid(it); else bindItem(it)
    return it
  }

  // 肖像：.portrait（静态、裁边）> .cast-turn（偏转；动态时独立成层）> 图 + 地面暗影
  function wrapPortrait(it) {
    const por = it.por
    const turn = it.turn || (it.turn = el('div.turn'))
    const floor = it.void ? null : (it.floor || (it.floor = el('i.floor')))
    turn.textContent = ''
    for (const n of Array.from(por.childNodes)) turn.appendChild(n)
    if (floor) turn.appendChild(floor)
    por.appendChild(turn)
    it.photo = isPhoto(por)
    it.img = it.photo ? turn.querySelector('img') : null
    it.svg = turn.querySelector('svg')
    it.irises = it.photo ? [] : Array.from(turn.querySelectorAll('.p-iris'))
    if (it.rim && it.img) turn.insertBefore(it.rim, it.img)
    // 位图缺失（只拿到代码仓库时）核心会把肖像换成剪影占位（重写 innerHTML）：重新包一遍、重新量眼睛
    if (it.img) it.img.addEventListener('error', () => { it.rim = null; wrapPortrait(it); S.measured = false; it.tw = '' }, { once: true })
  }

  function bindItem(it) {
    const hit = it.hit
    if (App.finePointer) {
      hit.addEventListener('pointerenter', () => setHot(it))
      hit.addEventListener('pointerleave', () => { if (S.hot === it) setHot(null) })
    }
    hit.addEventListener('click', () => openFrom(it))
    hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFrom(it) } })
    hit.addEventListener('focus', () => {
      // 键盘移到画框：把长廊推到它面前
      let kb = false
      try { kb = hit.matches(':focus-visible') } catch (e) { /* */ }
      if (kb) { const sx = it.x + S.x; if (sx < 0 || sx + it.w > S.vw) bring(it) }
      if (App.finePointer) setHot(it)
    })
    hit.addEventListener('blur', () => { if (S.hot === it) setHot(null) })
  }

  function bindVoid(it) {
    let busy = false
    const poke = () => {
      if (busy) return
      busy = true
      if (!it.decoded) { it.decoded = true; for (const e of [it.epi, it.bepi]) App.text.scramble(e, '下一幅是你', { duration: 1.1 }) } // 空框不会「悬停」，两块名牌都看得见
      App.audio.sfx('dark', { volume: 0.8 })
      App.glitch([it.plate, it.bplate], 0.4)
      const wins = [it.win, it.bwin, it.wl]
      gsap.fromTo(wins, { opacity: 1 }, { opacity: 0.15, duration: 0.05, repeat: 5, yoyo: true, ease: 'steps(1)', onComplete: () => { gsap.set(wins, { clearProps: 'opacity' }); busy = false } })
    }
    it.hit.addEventListener('pointerenter', () => { if (App.finePointer) poke() })
    it.hit.addEventListener('click', poke)
  }

  // 黑暗与烛火的暖光合成一层：原来是 .cast-dark（黑，1200px）上再叠一层 .cast-glow（暖光，1040px，
  // 缩放为黑暗的 1/3.2、不透明度约 .75）。两层同心、一起移动，这里按「暖光叠在黑暗上」逐点合成为一张渐变
  // （按预乘颜色插值），合成器少画大半屏。暖光不再单独随火苗闪烁，闪烁只剩整体缩放（原来两者都有）
  function darkBackground() {
    const D = [[0, 0], [0.07, 0], [0.12, 0.3], [0.19, 0.66], [0.27, 0.84], [0.42, 0.9], [1, 0.9]]
    const G = [[0, [255, 190, 110, 0.2]], [0.3, [255, 160, 80, 0.08]], [0.6, [255, 140, 60, 0.02]], [0.8, [255, 140, 60, 0]], [1, [255, 140, 60, 0]]]
    const gs = 520 / 3.2 / 600, gop = 0.75
    const ia = p => { for (let k = 1; k < D.length; k++) if (p <= D[k][0]) { const t = (p - D[k - 1][0]) / (D[k][0] - D[k - 1][0]); return D[k - 1][1] + (D[k][1] - D[k - 1][1]) * t } return 0.9 }
    const ig = q => { // 预乘插值
      for (let k = 1; k < G.length; k++) if (q <= G[k][0]) {
        const t = (q - G[k - 1][0]) / (G[k][0] - G[k - 1][0]), c0 = G[k - 1][1], c1 = G[k][1]
        const a = c0[3] + (c1[3] - c0[3]) * t
        const pm = [0, 1, 2].map(j => c0[j] * c0[3] + (c1[j] * c1[3] - c0[j] * c0[3]) * t)
        return [pm, a]
      }
      return [[0, 0, 0], 0]
    }
    const ps = [0, 0.02, 0.04, 0.06, 0.07, 0.081, 0.095, 0.11, 0.12, 0.14, 0.1625, 0.19, 0.2167, 0.24, 0.27, 0.42, 1]
    const stops = ps.map(p => {
      const ad = ia(p)
      const [gp, ga0] = p / gs <= 1 ? ig(p / gs) : [[0, 0, 0], 0]
      const ga = ga0 * gop
      const A = 1 - (1 - ad) * (1 - ga)
      if (A < 1e-4) return `rgba(0,0,0,0) ${(p * 100).toFixed(2)}%`
      const col = [5, 2, 3].map((dc, j) => Math.round((dc * ad * (1 - ga) + gp[j] * gop) / A))
      return `rgba(${col.join(',')},${A.toFixed(4)}) ${(p * 100).toFixed(2)}%`
    })
    return `radial-gradient(circle closest-side, ${stops.join(', ')})`
  }

  function build(el0) {
    sec = el0
    sec.classList.add('cast', 'is-paused')
    sticky = el('div.sticky')
    wall = el('div.wall')
    const paper = el('div.paper')
    paper.style.backgroundImage = DAMASK
    wall.append(paper, el('div.crown'), el('div.wains', null, el('i')))
    const thread = sv('svg', { class: 'cast-thread', 'aria-hidden': 'true' })
    thread.innerHTML = '<path fill="none" stroke="#ff2e7e" stroke-width="1.4" stroke-linecap="round"/>'
    wall.appendChild(thread)
    for (let i = 0; i < N; i++) {
      const it = makeItem(i, CH[i])
      S.items.push(it)
      wall.appendChild(it.node)
    }
    voidIt = makeItem(N, null)
    wall.appendChild(voidIt.node)
    // 动态层都挂在墙的最后：之后不再有静态内容，动态层与静态画面之间不会因「叠在上面」被迫多出层
    livePlane = el('div.live')
    for (const it of S.items.concat([voidIt])) livePlane.appendChild(it.lv)
    wall.appendChild(livePlane)

    dark = el('div.dark', { 'aria-hidden': 'true' })
    dark.style.background = darkBackground()
    // 离开视口时：黑暗那一层（比视口大得多）藏起来，换成一块只盖住本板块、颜色同远处黑暗的静态幕——
    // 回到视口时哪怕晚一帧才重新显示烛光，露出来的那一条也是暗的（不会闪出没压暗的墙）
    const darkStill = el('div.darkstill', { 'aria-hidden': 'true' })

    fore = el('div.fore', { 'aria-hidden': 'true' })
    const title = el('h2.title', { text: '卡池' })
    title.classList.add('t-display')
    const intro = el('div.intro', null, [
      title,
      el('div.hall', { text: '东肖像廊' }),
      el('p.whisper', { text: '画里的人都醒着' }),
      el('div.latin', { text: 'XXXVIII · EAST GALLERY' }),
    ])
    fore.appendChild(intro)
    // 眼睛的光（浮在黑暗之上）
    for (const it of S.items.concat([voidIt])) {
      const box = el('div.eyes')
      it.eyesBox = box
      fore.appendChild(box)
      if (it.c) box.style.setProperty('--accent', (it.c.art && it.c.art.accent) || App.color.blood)
      else box.classList.add('is-void')
    }

    const hud = el('div.hud', { 'aria-hidden': 'true' })
    hudCount = el('span.count', { text: '01 / ' + N })
    hudFill = el('i')
    const hudBar = el('div.bar', null, hudFill)
    hudTicks = el('div.ticks')
    for (let i = 0; i < N; i++) hudTicks.appendChild(el('i'))
    hudBar.appendChild(hudTicks)
    hud.append(el('span.hudname', { text: 'EAST GALLERY' }), hudBar, hudCount)

    sticky.append(wall, dark, darkStill, fore, hud)
    sec.appendChild(sticky)
    // 焦点落到画外的画框时浏览器会偷偷滚动 overflow:hidden 的容器——一律复位
    sticky.addEventListener('scroll', () => { if (sticky.scrollLeft || sticky.scrollTop) { sticky.scrollLeft = 0; sticky.scrollTop = 0 } })
    S.built = true
  }

  /* =====================================================================
     眼睛的光点：量出每幅肖像眼白的位置
     ===================================================================== */
  function measureEyes() {
    S.measured = true
    for (const it of S.items.concat([voidIt])) {
      const box = it.eyesBox
      box.innerHTML = ''
      it.halos = []
      it.hqs = it.hqb = null
      it.photo = isPhoto(it.por)
      box.classList.toggle('is-photo', it.photo)
      const pts = []
      if (it.photo) {
        // 位图：用量好的虹膜位置，按 CSS 里的放大量换算
        const list = (it.c && EYES[it.c.id]) || [[0.42, 0.41], [0.58, 0.41]]
        for (const [x, y] of list) pts.push({ x: 0.5 + (x - 0.5) * TURN.s, y: 0.5 + (y - 0.5) * TURN.s })
      } else {
        const pr = it.por.getBoundingClientRect()
        if (!pr.width) continue
        for (const s of Array.from(it.por.querySelectorAll('.p-sclera'))) {
          const r = s.getBoundingClientRect()
          if (!r.width && !r.height) continue
          pts.push({ x: (r.left + r.width / 2 - pr.left) / pr.width, y: (r.top + r.height / 2 - pr.top) / pr.height })
        }
        if (!pts.length) pts.push({ x: 0.42, y: 0.41 }, { x: 0.58, y: 0.41 })
      }
      it.eyePts = pts.slice(0, 3)
      for (let k = 0; k < it.eyePts.length; k++) {
        const h = el('i.halo')
        box.appendChild(h)
        it.halos.push(h)
      }
      placeEyes(it)
    }
  }
  // 光点的盒子只框住这一双眼（放大到两倍也够）：每双眼各自是一个很小的合成层
  function placeEyes(it) {
    const box = it.eyesBox, pts = it.eyePts
    if (!box || !pts || !pts.length) return
    it.hs = Math.round(U.clamp(it.pw * (it.photo ? 0.078 : 0.085), 10, 24))
    box.style.setProperty('--hs', it.hs + 'px')
    const m = it.hs + 2
    const xs = pts.map(p => p.x * it.pw), ys = pts.map(p => p.y * it.ph)
    const x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m
    Object.assign(box.style, {
      left: (it.x + it.pl + x0).toFixed(1) + 'px', top: (it.y + it.pt + y0 - (S.foreTop || 0)).toFixed(1) + 'px',
      width: (Math.max(...xs) - x0 + m).toFixed(1) + 'px', height: (Math.max(...ys) - y0 + m).toFixed(1) + 'px',
    })
    it.halos.forEach((h, k) => { h.style.left = (xs[k] - x0).toFixed(1) + 'px'; h.style.top = (ys[k] - y0).toFixed(1) + 'px' })
  }

  /* =====================================================================
     悬停 / 风 / 解码
     ===================================================================== */
  function setHot(it) {
    if (S.hot === it) return
    const prev = S.hot
    S.hot = it
    if (prev) {
      prev.node.classList.remove('is-hot')
      prev.lv.classList.remove('is-hot')
      gsap.to(prev, { heat: 0, duration: 0.6, ease: 'power2.out' })
    }
    if (!it) return
    if (!it.live) promote(it)
    if (!it.warm) setWarm(it, true)
    it.node.classList.add('is-hot')
    it.lv.classList.add('is-hot')
    gsap.to(it, { heat: 1, duration: 0.55, ease: 'power2.out' })
    sway(it, App.mouse.vx)
    App.audio.sfx('hover', { pan: U.clamp(((it.x + S.x + it.w / 2) / S.vw - 0.5) * 1.6, -1, 1) })
    // 轮廓光：同一幅画的暖金剪影垫在后面，朝烛光一侧露出一道金边（第一次悬停时才建）
    if (!it.rim && it.img) {
      it.rim = U.el('img', { class: 'cast-rim', src: it.img.getAttribute('src'), alt: '', decoding: 'async', draggable: 'false' })
      it.turn.insertBefore(it.rim, it.img)
    }
    // 画框玻璃上掠过一道反光
    if (it.glint && !RM && Q() > 0) {
      it.glint.style.willChange = 'transform, opacity' // 掠过的 1.2 秒里独立合成，不重画整幅画
      gsap.fromTo(it.glint, { xPercent: -60, opacity: 1 }, { xPercent: 60, opacity: 0, duration: 1.2, ease: 'power2.inOut', overwrite: true, onComplete: () => { it.glint.style.willChange = '' } })
    }
    if (!it.decoded) {
      // 解码动画只做在看得见的那块（悬停期间是静态版的名牌），做完再抄给照亮版
      it.decoded = true
      const tw = App.text.scramble(it.epi, it.c.epithet, { duration: 0.9 })
      const done = () => { it.bepi.textContent = it.c.epithet }
      if (tw && tw.eventCallback) tw.eventCallback('onComplete', done); else done()
    }
  }

  function bring(it) {
    const p = U.clamp((it.x + it.w / 2 - S.vw / 2) / S.travel, 0, 1)
    const y = sec.getBoundingClientRect().top + window.scrollY + p * S.travel * S.k
    App.scroll.to(y, { duration: 0.9 })
  }

  // 被风吹得晃一下：同原来那条 GSAP 时间线（.32s sine.out，其后四段 sine.inOut 衰减），改用 Web Animations 交给合成器跑，
  // 晃的两秒半里主线程不必每帧改样式
  const SINE_OUT = 'cubic-bezier(0.61, 1, 0.88, 1)', SINE_IO = 'cubic-bezier(0.37, 0, 0.63, 1)'
  function sway(it, v) {
    if (RM) return
    const dir = (v || 0) >= 0 ? 1 : -1
    const amp = U.clamp(1.6 + Math.abs(v || 0) * 0.12, 1.6, 3.4)
    if (it.sw) it.sw.cancel()
    const seg = [[0.32, dir * amp, SINE_OUT], [0.6, -dir * amp * 0.62, SINE_IO], [0.55, dir * amp * 0.34, SINE_IO], [0.5, -dir * amp * 0.14, SINE_IO], [0.5, 0, SINE_IO]]
    const total = seg.reduce((a, s) => a + s[0], 0)
    const frames = [{ transform: 'rotate(0deg)', offset: 0, easing: seg[0][2] }]
    let t = 0
    seg.forEach(([d, r], k) => { t += d; frames.push({ transform: `rotate(${r.toFixed(3)}deg)`, offset: Math.min(1, t / total), easing: seg[k + 1] ? seg[k + 1][2] : 'linear' }) })
    it.sw = it.swing.animate(frames, { duration: total * 1000, easing: 'linear' })
  }
  const swaying = it => !!(it.sw && it.sw.playState === 'running')

  /* =====================================================================
     「整条长廊的眼睛同时转向你」
     ===================================================================== */
  function lookAway(stagger) {
    if (S.away) return
    S.away = true
    S.wake = false
    S.awaySince = performance.now()
    for (const it of S.items.concat([voidIt])) {
      if (!stagger) { it.fixed = true; continue }
      gsap.delayedCall(U.rand(0, 1.6), () => { if (S.away) it.fixed = true })
    }
  }
  function moment(big) {
    S.away = false
    S.lastMoment = performance.now()
    for (const it of S.items.concat([voidIt])) it.fixed = false
    S.flare = 1
    if (!RM) gsap.fromTo(S, { dip: big ? 1 : 0.7 }, { dip: 0, duration: big ? 1.3 : 0.9, ease: 'power2.out', overwrite: true })
    App.audio.sfx('heartbeat', { volume: big ? 1 : 0.6 })
    if (big) App.audio.sfx('dark', { volume: 0.5, delay: 0.05 })
    if (App.state.section === 'cast') {
      App.audio.setMood({ tension: 0.5 })
      gsap.delayedCall(2.4, () => { if (App.state.section === 'cast') App.audio.setMood({ tension: 0.18 }) })
    }
  }

  /* =====================================================================
     帧循环：滚动 → 长廊推进；光标 → 烛光、照亮、反光、视线
     只写合成层的 transform / opacity / filter；数值没变不写；滚动中不读布局
     ===================================================================== */
  function onAct() { S.lastAct = performance.now(); if (S.away) S.wake = true }
  window.addEventListener('pointermove', e => {
    onAct()
    if (e.pointerType === 'touch') S.lastTouch = performance.now()
  }, { passive: true })
  window.addEventListener('touchstart', () => { onAct(); S.lastTouch = performance.now() }, { passive: true })

  let lastP = 0
  function frame(t, dt) {
    if (!S.visible || !S.built) return
    if (!S.measured) measureEyes()
    const now = performance.now()
    const vw = S.vw, vh = S.vh
    if (Math.abs(S.p - lastP) > 0.0004) { onAct(); lastP = S.p }
    const x = -S.p * S.travel
    S.x = x
    const tr = `translate3d(${x.toFixed(1)}px,0,0)`
    if (tr !== S.trw) { S.trw = tr; wall.style.transform = tr; fore.style.transform = tr }
    const st = stageTop()
    S.stageTop = st

    // 烛光位置
    const m = App.mouse
    const touchRecent = now - S.lastTouch < 2600
    let tx, ty
    if (App.finePointer && m.active) { tx = m.sx; ty = m.sy - st }
    else if (touchRecent) { tx = m.x; ty = m.y - st }
    else { tx = vw * 0.5 + Math.sin(t * 0.37) * vw * 0.2; ty = vh * 0.46 + Math.sin(t * 0.23 + 1) * vh * 0.07 }
    S.cx = approach(S.cx, tx, 0.22, dt)
    S.cy = approach(S.cy, ty, 0.22, dt)
    // 火苗的抖动
    const fl = RM || Q() === 0 ? 1 : 1 + Math.sin(t * 11.3) * 0.025 + Math.sin(t * 23.7 + 1.3) * 0.018 + (Math.random() - 0.5) * 0.025
    S.flick = fl * (1 - S.dip * 0.55)
    const R = (S.mob ? Math.max(250, vw * 0.8) : U.clamp(vw * 0.31, 300, 560)) * S.flick
    const dkt = `translate3d(${S.cx.toFixed(1)}px,${S.cy.toFixed(1)}px,0) scale(${(R / 520 * 3.2).toFixed(3)})`
    if (dkt !== S.dkw) { S.dkw = dkt; dark.style.transform = dkt }
    S.flare = Math.max(0, S.flare - dt * 0.012)
    const flare = Math.round(S.flare * 25) / 25 // 光点用的「一齐亮起」：4% 一档地退（1.4 秒里分不出台阶，几十个光点不必每帧都重写）
    // 移开视线时眼里的光暗下去；转向你的那一刻同时亮起
    S.watchK = approach(S.watchK == null ? 1 : S.watchK, S.away ? 0.38 : 1, S.away ? 0.02 : 0.35, dt)

    // 首次进入 / 停顿 → 移开视线；再动 → 同时转向你
    if (S.firstPending) {
      if (!S.away) lookAway(false)
      if ((S.p > 0.002 || (st <= 1 && now - S.visSince > 1600)) && now - S.visSince > 500) { S.firstPending = false; moment(true) }
    } else if (!App.overlay.isOpen) {
      if (!S.away && now - S.lastAct > 6500 && now - S.lastMoment > 3000) lookAway(true)
      else if (S.away && S.wake && now - S.awaySince > 1400) moment(false)
    }

    // 每幅画
    const all = S.items
    const hot = S.hot
    const gk = 1 - Math.pow(0.8, dt) // 视线的平滑（原 App.trackEyes 每帧 lerp .2）
    // 长廊在动（滚动）时：光点的视线偏移一像素一档、肖像的偏转与压暗隔帧交替更新（单数、双数的画各更新一半）——
    // 这些都只差零点几像素，混在整条长廊的平移里看不出；静止时每帧、半像素一档
    const moving = tr !== S.trPrev
    S.trPrev = tr
    const qe = moving ? 1 : 2
    S.fno = (S.fno + 1) | 0
    let nearest = -1, nd = 1e9
    for (let i = 0; i <= all.length; i++) {
      const it = i < all.length ? all[i] : voidIt
      const sx = it.x + x
      if (sx > vw + 260 || sx + it.w < -260) {
        if (it.live && hot !== it) demote(it)
        it.on = false
        continue
      }
      it.on = true
      const fx = sx + it.w / 2, fy = it.y + it.h * 0.45
      const dx = fx - S.cx, dy = (fy - S.cy) * 1.15
      const d = Math.hypot(dx, dy) || 1
      const lit = smooth(R * 1.05, R * 0.18, d) * U.clamp(S.flick, 0, 1.1)
      it.lit = approach(it.lit, lit, 0.3, dt)
      const h = it.heat
      const L = Math.max(it.lit, h)
      // 悬停一幅时其余沉暗
      const pfT = hot && hot !== it ? 1 : 0
      it.pf = approach(it.pf, pfT, 0.085, dt)
      if (Math.abs(it.pf - pfT) < 0.004) it.pf = pfT
      // 烛光够得着才换成动态层（带滞回，免得在门槛上来回切）
      const warm = hot === it || h > 0.004 || swaying(it)
      // 「一齐亮起」那一下烛光会先缩一大圈再回来：这期间已有动态层的不撤（否则一圈画都要撤了又建、各重画一遍）
      const want = warm || hot === it || L > (it.live ? 0.03 : 0.05) || (it.live && S.dip > 0.01)
      if (want !== it.live) { if (want) promote(it); else demote(it) }
      if (warm !== it.warm && it.live) setWarm(it, warm)

      // 视线：转向烛光（光标）；移开视线时望向长廊东头
      const ex = sx + it.pl + it.pw * 0.5, ey = st + it.y + it.pt + it.ph * 0.41
      it.gaze.x = fx + it.gdx * 900
      it.gaze.y = fy + st + it.gdy * 900
      const gtx = it.fixed ? it.gaze.x : m.sx, gty = it.fixed ? it.gaze.y : m.sy
      const gdx = gtx - ex, gdy = gty - ey
      const gd = Math.hypot(gdx, gdy) || 1
      const gkk = Math.min(1, gd / (it.pw * 1.2))
      it.ox += ((gdx / gd) * RANGE * gkk - it.ox) * gk
      it.oy += ((gdy / gd) * RANGE * 0.7 * gkk - it.oy) * gk

      if (it.live) {
        // 照亮版：交叉淡入（悬停别的画时一起沉下去）
        const mix = litMix(L) * (1 - 0.62 * it.pf)
        setOp(it, 'oB', it.bl, mix)
        if (it.warm) setOp(it, 'oWB', it.wback, mix)
        // 肖像：偏转 + 面纱/沉暗（近黑色的半透明层 ≈ 压暗）
        if (!moving || it.warm || ((i + S.fno) & 1)) {
          pose(it)
          const gb = (0.38 + 0.62 * L) * (1 - 0.62 * it.pf)
          const fs = `brightness(${Math.round(gb * 50) / 50})`
          if (fs !== it.fw) { it.fw = fs; it.turn.style.filter = fs }
        }
        if (!it.photo && it.irises.length) {
          const ir = `translate(${it.ox.toFixed(1)} ${it.oy.toFixed(1)})`
          if (ir !== it.irw) { it.irw = ir; for (const n of it.irises) n.setAttribute('transform', ir) }
        }
        // 黄铜反光：光斑中心 = 烛光在框坐标里的位置（只改 transform）；亮度够才有这一层
        // （够不着的那圈画框上原来只有光斑最外圈一点暗铜色，看不出来，省掉这一层）
        const shOn = it.warm || L > (it.shineOn ? 0.3 : 0.35) || (it.shineOn && S.dip > 0.01)
        if (shOn !== it.shineOn) { it.shineOn = shOn; it.lv.classList.toggle('is-shine', shOn); it.gx = -1e9 }
        if (shOn) {
          const gx = S.cx - sx + it.P, gy = S.cy - it.y + it.P
          const so = ((0.42 + 0.58 * L) * (it.warm ? 1 : smooth(0.3, 0.45, L))).toFixed(2)
          if (so !== it.oSh) { it.oSh = so; it.spot.style.opacity = so }
          if (Math.abs(gx - it.gx) > 0.5 || Math.abs(gy - it.gy) > 0.5) moveShine(it, gx, gy)
        }
        // 悬停：烛光把这一幅照亮——正面的暖光跟着烛火在画上移动，背后垫一道金色轮廓光（朝向烛光的一侧）
        if (it.warm && h > 0.004 && it.photo) {
          const ux = -dx / d, uy = -dy / d
          if (it.rim) {
            const rt = `translate(${(-ux * 3.2 * h).toFixed(2)}px,${(U.clamp(-uy, -0.4, 0.4) * 2.4 * h).toFixed(2)}px) scale(${TURN.s})` // 竖直方向收着点：有几张原图顶上是直边
            if (rt !== it.rtw) { it.rtw = rt; it.rim.style.transform = rt }
            const rim = Q() > 0 ? h.toFixed(3) : '0'
            if (rim !== it.rimw) { it.rimw = rim; it.rim.style.opacity = rim }
          }
          if (Q() > 1) {
            // 暖斑：圆心跟着烛火（夹在窗口 -30%–130% 内），半径 = 到窗口最远角的距离
            const lx = U.clamp(S.cx - sx, -0.3 * it.w, 1.3 * it.w), ly = U.clamp(S.cy - it.y, -0.3 * it.h, 1.3 * it.h)
            const lr = Math.hypot(Math.max(lx, it.w - lx), Math.max(ly, it.h - ly))
            const lmt = `translate3d(${(lx - it.lb).toFixed(1)}px,${(ly - it.lb).toFixed(1)}px,0) scale(${(lr / it.lb).toFixed(3)})`
            if (lmt !== it.lmw) { it.lmw = lmt; it.lamp.firstChild.style.transform = lmt }
            const lo = h.toFixed(3)
            if (lo !== it.low) { it.low = lo; it.lamp.style.opacity = lo }
          }
          it.filtered = true
        } else if (it.warm && h > 0.004 && it.svg) {
          const ux = -dx / d, uy = -dy / d
          const rx = (ux * 2.6 * h).toFixed(2), ry = (uy * 2.2 * h).toFixed(2)
          it.svg.style.filter = `grayscale(${(0.85 * (1 - h)).toFixed(3)}) brightness(${(0.78 + 0.32 * h).toFixed(3)}) drop-shadow(${rx}px ${ry}px 0 rgba(236,198,128,${(0.95 * h).toFixed(3)}))`
          it.filtered = true
        } else if (it.filtered) {
          it.filtered = false
          if (it.svg) it.svg.style.filter = ''
          if (it.lamp) { it.lamp.style.opacity = '0'; it.low = '0' }
          if (it.rim) { it.rim.style.opacity = '0'; it.rimw = '0' }
        }
      }

      // 眼睛的光：浮在黑暗之上，跟着画像偏转、偶尔眨一下（画在 .cast-fore 里：小方块重画，不各自成层）
      if (it.halos.length && (!moving || ((i + S.fno) & 1))) {
        let ox, oy
        if (it.photo) { ox = (it.ox / RANGE) * TURN.x * it.pw; oy = (it.oy / RANGE) * TURN.y * it.ph }
        else { const s = it.pw / 600; ox = it.ox * s; oy = it.oy * s }
        let blink = 1
        if (!RM && now > it.blinkAt) {
          const bt = (now - it.blinkAt) / 170
          if (bt >= 1) it.blinkAt = now + (it.photo ? 2600 + Math.random() * 8000 : 2500 + Math.random() * 5000)
          else blink = 1 - Math.sin(bt * Math.PI) * 0.95
        }
        let op, sc
        if (it.void) { op = (1 - smooth(0.05, 0.55, it.lit)) * (S.away ? 0.55 : 1); sc = 1 + flare * 0.6 }
        else if (it.photo) {
          // 黑里：一双双血粉的眼；被烛光照到：画上的虹膜自己看得见，光点退去；悬停：虹膜微微发亮
          const darkK = 1 - smooth(0.15, 0.85, it.lit)
          op = Math.max((0.1 + 0.85 * darkK) * S.watchK, flare * (0.6 + 0.35 * darkK))
          op = op * (1 - h) + 0.62 * h
          sc = 1 + flare * (0.35 + 0.55 * darkK) + darkK * 0.15 - h * 0.3
        } else {
          op = (0.55 + 0.45 * Math.max(flare, h)) * (1 - 0.72 * it.lit * (1 - h)) * Math.max(S.watchK, h)
          sc = 1 + flare * 0.6 + h * 0.35
        }
        op *= blink > 0.3 ? 1 : 0.4 + blink * 2
        // 只在看得出的变化时才写（半像素、2% 的明暗与缩放）：滚动中几十个光点不必每帧都重算
        const bs = it.eyesBox.style
        const qx = Math.round(ox * qe) / qe, qy = Math.round(oy * qe) / qe
        if (qx !== it.bqx || qy !== it.bqy) { it.bqx = qx; it.bqy = qy; bs.transform = `translate(${qx}px,${qy}px)` }
        const os = Math.round(op * 50) / 50
        if (os !== it.how) { it.how = os; bs.opacity = os }
        const qs = Math.round(sc * 50) / 50, qb = Math.round(sc * Math.max(0.05, blink) * 50) / 50
        if (qs !== it.hqs || qb !== it.hqb) { it.hqs = qs; it.hqb = qb; const hs = `scale(${qs},${qb})`; for (const hl of it.halos) hl.style.transform = hs }
      }
      if (it.void) {
        // 空框：近了是空的，远了里面有人
        const vis = ((1 - smooth(0.04, 0.5, it.lit)) * 0.95).toFixed(3)
        if (vis !== it.visw) { it.visw = vis; it.turn.style.opacity = vis }
      } else {
        const cd = Math.abs(fx - vw * 0.5)
        if (cd < nd) { nd = cd; nearest = i }
      }
    }
    if (nearest >= 0 && S.p > 0.001 && nearest !== S.cur) {
      if (S.cur >= 0) App.audio.sfx('tick', { volume: 0.28, pan: 0 })
      S.cur = nearest
      hudCount.textContent = two(nearest + 1) + ' / ' + N
      const ticks = hudTicks.children
      for (let j = 0; j < ticks.length; j++) ticks[j].classList.toggle('is-on', j <= nearest)
    }
    // 进度条：直接写那一根线的 transform（原来写 --p 会让整排刻度跟着重算样式）
    const pw = `scaleX(${S.p.toFixed(4)})`
    if (pw !== S.pw) { S.pw = pw; hudFill.style.transform = pw }
  }

  /* =====================================================================
     档案（通信簿）
     ===================================================================== */
  const AX = [
    { k: 'physique', name: '体能与格斗', v: { 普通: 0.42, 受训: 0.8 } },
    { k: 'disguise', name: '伪装', v: { 低: 0.3, 中: 0.6, 高: 0.92 } },
    { k: 'readsPeople', name: '善于读人', v: { 一般: 0.45, 是: 0.9 } },
    { k: 'medical', name: '医护', v: { 无: 0.1, 基本常识: 0.42, 战场急救: 0.66, 有: 0.92 } },
    { k: 'observation', name: '现场观察', v: { 一般: 0.45, 擅长: 0.9 } },
    { k: 'killThreshold', name: '杀人门槛', v: { 高: 0.22, 中: 0.5, 低: 0.76, 无: 1 }, blood: true },
    { k: 'suspicion', name: '疑心', v: { 轻: 0.3, 中: 0.6, 重: 0.92 } },
  ]
  function axisVal(ax, st) {
    const g = st[ax.k]
    let v = ax.v[g] != null ? ax.v[g] : 0.5
    if (ax.k === 'physique' && /^顶尖/.test(st.physiqueNote || '')) v = 1
    return v
  }

  const D = { open: false, i: 0, root: null, page: null, nav: null, token: 0, lastNav: 0, busy: false, dir: 1, por: null }

  /* 档案大图：原图自带裁切直边的几位（斑的头顶、阿尔敏的方肩、几位偏高的胸口裁线），用渐隐遮罩化开。
     画面百分比；mt/mb = 上/下渐隐起止，rt/rb = 骨白硬描边的上/下收束，mx = 额外一层椭圆遮罩。见 cast.css .cast-dos-por */
  const EDGE = {
    madara: { mt0: 14, mt1: 32, mb0: 54, mb1: 70, rt: 17, rb: 48 },
    armin: { mb0: 56, mb1: 74, rb: 50, mx: 'radial-gradient(ellipse 36% 44% at 48% 40%, #000 70%, transparent 100%)' },
    kaiji: { mb0: 56, mb1: 72, rb: 52 },
    kiritsugu: { mb0: 56, mb1: 72, rb: 52 },
    shinobu: { mb0: 58, mb1: 73, rb: 54 },
    itachi: { mb0: 60, mb1: 75, rb: 54 },
  }

  /* 右下角的大编号：落在随身物与翻页之间，字身（Cinzel 数字的墨迹约占字号的 6%–87%）不压翻页 */
  function fitBig(P) {
    const big = P && P.big
    if (!big || !big.isConnected) return
    if (window.innerWidth <= 760) { big.style.fontSize = big.style.top = big.style.bottom = ''; return }
    const pr = P.page.getBoundingClientRect()
    const lo = D.nav.getBoundingClientRect().top - pr.top - 16
    const hi = P.stats.offsetTop + P.stats.offsetHeight + 20
    const maxF = Math.min(pr.height * 0.46, (pr.width * 1.01 - P.stats.offsetLeft) / 1.32)
    const F = U.clamp((lo - hi) / 0.81, Math.min(130, maxF), maxF)
    big.style.fontSize = F.toFixed(1) + 'px'
    big.style.top = (lo - 0.87 * F).toFixed(1) + 'px'
    big.style.bottom = 'auto'
  }
  window.addEventListener('resize', () => { if (D.open && D.page) fitBig(D.page) })

  function radar(c, onAxis) {
    const st = c.stats || {}
    const R = 104
    const svg = sv('svg', { viewBox: '-182 -152 364 316', class: 'cast-radar' })
    const ang = k => -Math.PI / 2 + (k * 2 * Math.PI) / 7
    const pt = (k, r) => [Math.cos(ang(k)) * r, Math.sin(ang(k)) * r]
    const poly = r => AX.map((a, k) => pt(k, r).map(n => n.toFixed(1)).join(',')).join(' ')
    const g = sv('g', { class: 'cast-radar-grid' })
    for (const f of [0.25, 0.5, 0.75, 1]) g.appendChild(sv('polygon', { points: poly(R * f), class: f === 1 ? 'is-outer' : '' }))
    for (let k = 0; k < 7; k++) {
      const [x, y] = pt(k, R)
      g.appendChild(sv('line', { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1), class: AX[k].blood ? 'is-blood' : '' }))
    }
    svg.appendChild(g)
    const vals = AX.map(a => axisVal(a, st))
    const pts = vals.map((v, k) => pt(k, R * v))
    let per = 0
    for (let k = 0; k < 7; k++) { const a = pts[k], b = pts[(k + 1) % 7]; per += Math.hypot(a[0] - b[0], a[1] - b[1]) }
    const area = sv('polygon', { class: 'cast-radar-area', points: pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ') })
    area.style.strokeDasharray = per.toFixed(1)
    area.style.strokeDashoffset = per.toFixed(1)
    svg.appendChild(area)
    const ki = AX.findIndex(a => a.blood)
    const kp = pts[ki]
    const kl = Math.hypot(kp[0], kp[1])
    const kline = sv('line', { class: 'cast-radar-kill', x1: 0, y1: 0, x2: kp[0].toFixed(1), y2: kp[1].toFixed(1) })
    kline.style.strokeDasharray = kl.toFixed(1)
    kline.style.strokeDashoffset = kl.toFixed(1)
    svg.appendChild(kline)
    const dots = []
    const labels = []
    for (let k = 0; k < 7; k++) {
      const [x, y] = pts[k]
      const d = sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: AX[k].blood ? 4.2 : 3, class: 'cast-radar-dot' + (AX[k].blood ? ' is-blood' : '') })
      svg.appendChild(d)
      dots.push(d)
      const [lx, ly] = pt(k, R + 26)
      const anchor = Math.abs(lx) < 8 ? 'middle' : lx > 0 ? 'start' : 'end'
      const t = sv('text', { x: lx.toFixed(1), y: (ly - 6).toFixed(1), 'text-anchor': anchor, class: 'cast-radar-lab' + (AX[k].blood ? ' is-blood' : '') })
      t.textContent = AX[k].name
      const v = sv('text', { x: lx.toFixed(1), y: (ly + 13).toFixed(1), 'text-anchor': anchor, class: 'cast-radar-val' + (AX[k].blood ? ' is-blood' : '') })
      v.textContent = st[AX[k].k] || '—'
      svg.append(t, v)
      labels.push(t, v)
    }
    // 悬停扇区
    const hit = sv('g', { class: 'cast-radar-hit' })
    for (let k = 0; k < 7; k++) {
      const a0 = ang(k) - Math.PI / 7, a1 = ang(k) + Math.PI / 7
      const r = R + 46
      const p = sv('path', { d: `M0 0L${(Math.cos(a0) * r).toFixed(1)} ${(Math.sin(a0) * r).toFixed(1)}A${r} ${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(1)} ${(Math.sin(a1) * r).toFixed(1)}Z`, 'data-cursor': '', 'data-k': k })
      p.addEventListener('pointerenter', () => onAxis(k, true))
      p.addEventListener('pointerleave', () => onAxis(k, false))
      p.addEventListener('click', () => onAxis(k, 'tap'))
      hit.appendChild(p)
    }
    svg.appendChild(hit)
    const play = delay => {
      const tl = gsap.timeline({ delay })
      tl.fromTo(g, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' })
        .to(area, { strokeDashoffset: 0, duration: 1.15, ease: 'power2.inOut' }, 0.15)
        .fromTo(area, { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.6, ease: 'power1.out' }, 0.95)
        .fromTo(dots, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(3)' }, 0.5)
        .to(kline, { strokeDashoffset: 0, duration: 0.5, ease: 'expo.in' }, 1.05)
        .fromTo(labels, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.03 }, 0.3)
      return tl
    }
    return { svg, play, ki }
  }

  function seatOf(id) {
    const s = App.state.seats || []
    const i = s.indexOf(id)
    return i
  }

  function buildPage(i) {
    const c = CH[i]
    const st = c.stats || {}
    const acc = (c.art && c.art.accent) || App.color.blood
    const [r, g, b] = U.hexToRgb(acc)
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    const reddish = r > 140 && g < 90 && b < 110
    const page = el('article.dos-page' + (reddish ? '.is-red' : ''), { 'aria-label': c.name })
    page.style.setProperty('--accent', acc)
    page.style.setProperty('--accent-rgb', `${r},${g},${b}`)
    // 签名色压进墨色里：暗金单色的肖像落在一块深色的签名色斜块上，块心被烛光照暖
    const mix = (k, base) => [r, g, b].map((v, j) => Math.round(v * k + base[j] * (1 - k)))
    const deep = mix(0.42, [16, 9, 8]), mid = mix(0.66, [34, 20, 14]), hi = mix(0.6, [255, 236, 200])
    page.style.setProperty('--slab', `rgb(${deep})`)
    page.style.setProperty('--slab-mid', `rgb(${mid})`)
    page.style.setProperty('--accent-hi', `rgb(${lum < 0.32 ? hi : [r, g, b]})`)

    const block = el('div.dos-block', null, [el('i.dos-halftone'), el('i.dos-light')])
    const stripe = el('div.dos-stripe')
    const big = el('div.dos-bignum', { text: two(i + 1), 'aria-hidden': 'true' })
    const fig = el('div.dos-fig')
    const por = App.portrait(c.id, { className: 'cast-dos-por', eyeRange: 8 })
    const edge = EDGE[c.id]
    if (edge) for (const k in edge) por.style.setProperty('--cast-' + k, k === 'mx' ? edge[k] : edge[k] + '%')
    const pimg = por.querySelector('img')
    if (pimg) {
      // 弹丸论破式的硬描边：同一幅画的剪影错开几像素垫在后面
      const rim = U.el('img', { class: 'cast-dos-rim', src: pimg.getAttribute('src'), alt: '', decoding: 'async', draggable: 'false' })
      por.insertBefore(rim, pimg)
    }
    fig.appendChild(por)
    const nameLen = Array.from(c.name).length
    const name = el('h3.dos-name', { 'aria-label': c.name })
    name.style.setProperty('--n', String(Math.max(2, nameLen)))
    const nameChars = []
    for (const ch of Array.from(c.name)) {
      const s = el('span', { text: ch === '·' ? '・' : ch, 'aria-hidden': 'true' })
      name.appendChild(s)
      nameChars.push(s)
    }
    const nameGhost = name.cloneNode(true)
    nameGhost.className = 'cast-dos-name cast-dos-name--ghost'
    nameGhost.setAttribute('aria-hidden', 'true')

    const height = c.heightCm ? c.heightCm + 'CM' : ''
    const meta = [c.age, height, c.era].filter(Boolean).join('  ／  ')
    const epi = el('div.dos-epi', { text: c.epithet })
    const work = el('div.dos-work', { text: c.work })
    const metaEl = el('div.dos-meta', { text: meta })
    const zh = el('p.dos-zh')
    const orig = el('p.dos-orig', { text: c.quote && c.quote.orig && c.quote.orig !== '—' ? typo(c.quote.orig) : '' })
    const quote = el('blockquote.dos-quote', null, [zh, orig])
    const see = el('div.dos-line.dos-see', null, [el('span.dos-k', { text: '别人眼里' }), el('p.dos-v', { text: c.othersSee || '' })])
    const dream = el('div.dos-line.dos-line--dream', null, [el('span.dos-k', { text: '梦想' }), el('p.dos-v', { text: c.dream || '' })])
    const info = el('div.dos-info', null, [el('div.dos-head', null, [epi, work, metaEl]), quote, see, dream])

    const read = el('div.dos-read', { 'aria-live': 'polite' }, [el('span.dos-read-k'), el('span.dos-read-v'), el('p.dos-read-n')])
    let pinned = -1
    const showAxis = (k, on) => {
      if (on === 'tap') { pinned = pinned === k ? -1 : k; on = pinned === k }
      const idx = on ? k : pinned
      rd.svg.classList.toggle('is-axis', idx >= 0)
      rd.svg.querySelectorAll('.cast-radar-hit path').forEach((p, j) => p.classList.toggle('is-on', j === idx))
      rd.svg.querySelectorAll('.cast-radar-lab, .cast-radar-val').forEach((t, j) => t.classList.toggle('is-on', Math.floor(j / 2) === idx))
      if (idx < 0) { read.classList.remove('is-on'); return }
      const ax = AX[idx]
      read.classList.add('is-on')
      read.classList.toggle('is-blood', !!ax.blood)
      read.children[0].textContent = ax.name
      read.children[1].textContent = st[ax.k] || '—'
      const note = ax.k === 'physique' ? st.physiqueNote : ''
      read.children[2].textContent = note ? '（' + note + '）' : ''
      if (on) App.audio.sfx('tick', { volume: 0.5, pitch: 1 + idx * 0.06 })
    }
    const rd = radar(c, showAxis)
    const tags = el('ul.dos-tags')
    for (const t of c.carried || []) tags.appendChild(el('li', { text: typo(t) }))
    const stats = el('div.dos-stats', null, [el('div.dos-sk', { text: 'VII · 判定' }), rd.svg, read, (c.carried || []).length ? el('div.dos-sk', { text: '随身物' }) : null, tags])

    page.append(stripe, block, big, fig, nameGhost, name, info, stats)
    return { page, c, por, block, stripe, big, fig, name, nameGhost, nameChars, epi, work, metaEl, zh, orig, quote, see, dream, rd, tags, stats, info }
  }

  function playPage(P, delay) {
    const d = delay || 0
    const tk = D.token
    const tl = gsap.timeline({ delay: d })
    const mob = S.mob
    tl.fromTo(P.block, { xPercent: mob ? 0 : -100, yPercent: mob ? -100 : 0 }, { xPercent: 0, yPercent: 0, duration: 0.75, ease: 'expo.out' }, 0)
      .fromTo(P.stripe, { xPercent: mob ? 0 : -100, yPercent: mob ? -100 : 0 }, { xPercent: 0, yPercent: 0, duration: 0.9, ease: 'expo.out' }, 0.06)
      .fromTo(P.fig, { y: 80, opacity: 0, filter: 'brightness(0) blur(6px)' }, { y: 0, opacity: 1, filter: 'brightness(1) blur(0px)', duration: 1.1, ease: 'expo.out', clearProps: 'filter' }, 0.12)
      .fromTo(P.nameChars, { yPercent: -120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'expo.out' }, 0.2)
      .fromTo(P.nameGhost, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 1.2, ease: 'expo.out' }, 0.35)
      .fromTo(P.big, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1.4, ease: 'expo.out' }, 0.15)
      .fromTo([P.epi, P.work, P.metaEl], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'expo.out' }, 0.3)
      .fromTo([P.see, P.dream], { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out' }, 0.75)
      .fromTo(P.stats.querySelectorAll('.cast-dos-sk'), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.2 }, 0.3)
      .fromTo(P.orig, { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0)
    if (P.tags.children.length) tl.fromTo(Array.from(P.tags.children), { opacity: 0, y: 8, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(2)' }, 1.1)
    P.rd.play(d + 0.35)
    App.text.scramble(P.epi, P.c.epithet, { duration: 0.8, delay: d + 0.3 })
    const q = (P.c.quote && P.c.quote.zh) || ''
    gsap.delayedCall(d + 0.6, () => {
      if (tk !== D.token) return
      App.text.type(P.zh, typo(q), { speed: 46, cancel: () => tk !== D.token }).then(() => {
        if (tk !== D.token) return
        gsap.to(P.orig, { opacity: 1, duration: 0.9, ease: 'power2.out' })
      })
    })
    return tl
  }

  // 换页时释放旧肖像的视线追随（核心若提供 _untrack 就用它，否则至少断开可见性监听）
  function dropPortrait(wrap) {
    if (!wrap) return
    if (typeof wrap._untrack === 'function') { try { wrap._untrack() } catch (e) { /* */ } return }
    const w = wrap._eyes
    if (w) { try { w.unobserve() } catch (e) { /* */ } w.visible = false }
  }

  function buildNav() {
    const prev = el('button.dos-arrow.dos-arrow--prev', { type: 'button', 'aria-label': '上一位', 'data-cursor': '' })
    prev.innerHTML = '<svg viewBox="0 0 48 16" aria-hidden="true"><path d="M47 8H2M9 1L2 8l7 7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
    const next = el('button.dos-arrow.dos-arrow--next', { type: 'button', 'aria-label': '下一位', 'data-cursor': '' })
    next.innerHTML = '<svg viewBox="0 0 48 16" aria-hidden="true"><path d="M1 8h45M39 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
    const idx = el('span.dos-idx')
    const seat = el('button.dos-seat', { type: 'button', 'data-cursor': '' }, [el('span.dos-seat-l'), el('span.dos-seat-n')])
    prev.addEventListener('click', () => go(-1))
    next.addEventListener('click', () => go(1))
    seat.addEventListener('click', () => toggleSeat())
    const nav = el('nav.dos-nav', null, [prev, idx, next, seat])
    nav._idx = idx
    nav._seat = seat
    return nav
  }

  function updateNav() {
    if (!D.nav) return
    const c = CH[D.i]
    D.nav._idx.textContent = two(D.i + 1) + ' / ' + N
    const si = seatOf(c.id)
    const btn = D.nav._seat
    btn.classList.toggle('is-seated', si >= 0)
    btn.children[0].textContent = si >= 0 ? '离席' : '入座'
    btn.children[1].textContent = si >= 0 ? two(si + 1) : ''
    btn.setAttribute('data-cursor', si >= 0 ? '离席' : '入座')
  }

  function toggleSeat() {
    const c = CH[D.i]
    const si = seatOf(c.id)
    if (si >= 0) { App.bus.emit('cast:unseat', { id: c.id }); App.audio.sfx('whoosh', { volume: 0.7 }) }
    else {
      const seats = App.state.seats || []
      if (seats.filter(Boolean).length >= 15) { App.audio.sfx('wrong'); App.glitch(D.nav._seat, 0.35); return }
      App.bus.emit('cast:seat', { id: c.id })
      App.audio.sfx('drop')
      App.flash(App.color.brass, { opacity: 0.12, duration: 0.5 })
    }
    updateNav()
  }

  function swapPage(i, mode) {
    D.token++
    const old = D.page
    D.i = (i + N) % N
    const P = buildPage(D.i)
    const put = () => {
      if (old) { dropPortrait(old.por); old.page.remove() }
      // 手机上档案是长页：换人时回到顶上的肖像
      const stage = D.root.parentNode
      if (stage && stage.scrollTop) stage.scrollTop = 0
      D.root.insertBefore(P.page, D.nav)
      D.page = P
      updateNav()
      fitBig(P)
      playPage(P, mode === 'open' ? 0.1 : 0.02)
    }
    if (mode === 'slash') {
      D.busy = true
      App.slash(put, { color: P.c.art && P.c.art.accent }).then(() => { D.busy = false })
    } else if (mode === 'cut') {
      put()
      App.audio.sfx('card', { pan: D.dir * 0.4 })
      App.flash(App.color.ink, { opacity: 0.85, duration: 0.35, hold: 0.03 })
      if (!RM) gsap.fromTo(P.page, { x: D.dir * 40, skewX: -D.dir * 6 }, { x: 0, skewX: 0, duration: 0.5, ease: 'expo.out' })
    } else put()
  }

  function go(dir) {
    if (!D.open || D.busy) return
    D.dir = dir
    const now = performance.now()
    const quick = now - D.lastNav < 900
    D.lastNav = now
    swapPage(D.i + dir, quick || RM ? 'cut' : 'slash')
  }

  function openFrom(it) {
    if (App.overlay.isOpen) return
    App.audio.sfx('card')
    setHot(it)
    if (!RM) gsap.fromTo(it.wl, { filter: 'brightness(2.2)' }, { filter: 'brightness(1)', duration: 0.5, ease: 'power2.out', clearProps: 'filter' })
    openDossier(it.i)
  }

  function openDossier(i) {
    D.root = el('div.dos')
    D.nav = buildNav()
    D.root.appendChild(D.nav)
    D.open = true
    D.page = null
    const stage = App.overlay.open(D.root, {
      className: 'cast-ov',
      onClose: () => {
        D.open = false
        D.token++
        if (D.page) dropPortrait(D.page.por)
        D.page = null
        setHot(null)
        // 合上档案：长廊里所有的眼睛已经在等你
        gsap.delayedCall(0.3, () => { if (S.visible) moment(true) })
      },
    })
    if (stage) stage.addEventListener('scroll', () => D.root.classList.toggle('is-scrolled', stage.scrollTop > 24), { passive: true })
    lookAway(false)
    swapPage(i, 'open')
  }

  window.addEventListener('keydown', e => {
    if (!D.open || !App.overlay.isOpen) return
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  })
  // 手机：左右滑动翻页
  let sx0 = null, sy0 = null
  window.addEventListener('touchstart', e => { if (!D.open) return; const p = e.touches[0]; sx0 = p.clientX; sy0 = p.clientY }, { passive: true })
  window.addEventListener('touchend', e => {
    if (!D.open || sx0 == null) return
    const p = e.changedTouches[0]
    const dx = p.clientX - sx0, dy = p.clientY - sy0
    sx0 = null
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(dx < 0 ? 1 : -1)
  }, { passive: true })

  /* =====================================================================
     入座标记（与十五席联动）
     ===================================================================== */
  function syncSeats() {
    const seats = App.state.seats || []
    for (const it of S.items) {
      const si = seats.indexOf(it.c.id)
      it.seat.textContent = it.bseat.textContent = si >= 0 ? two(si + 1) : ''
      it.plate.classList.toggle('is-seated', si >= 0)
      it.bplate.classList.toggle('is-seated', si >= 0)
    }
    if (D.open) updateNav()
  }

  /* =====================================================================
     注册
     ===================================================================== */
  App.section('cast', {
    palette: PAL,
    track: 'gallery',
    mount(node) {
      build(node)
      layout()
      syncSeats()
      ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: self => { S.p = self.progress } })
      // 进出视口：在滚动回调里同步切换（不等 IntersectionObserver 的下一帧），离开时停掉帧循环
      ScrollTrigger.create({
        trigger: sec, start: 'top bottom', end: 'bottom top',
        onToggle: self => {
          const v = self.isActive
          if (v === S.visible) return
          S.visible = v
          if (v) { S.visSince = performance.now(); measureSec() }
          else { if (S.hot) setHot(null); for (const it of S.items.concat([voidIt])) if (it.live) demote(it) } // 动态层全部撤掉
          sec.classList.toggle('is-paused', !v)
        },
      })
      ScrollTrigger.addEventListener('refresh', measureSec)
      App.tick(frame)
      // 画质：1 级起去掉暖斑的混合模式层；0 级再去掉轮廓光、玻璃反光与火苗抖动（见 frame / setHot）
      const applyQ = () => { sec.classList.toggle('is-lowq', Q() < 2) }
      applyQ()
      App.bus.on('quality', applyQ)
      // 标题入场
      const intro = fore.querySelector('.cast-intro')
      const title = intro.querySelector('.cast-title')
      gsap.set(title, { opacity: 1 })
      App.text.reveal(title, { scroll: { trigger: sec, start: 'top 70%' }, stagger: 0.12, y: 30, duration: 1.4 })
      gsap.fromTo(intro.querySelectorAll('.cast-hall, .cast-whisper, .cast-latin'), { opacity: 0, y: 16 }, {
        opacity: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'expo.out',
        scrollTrigger: { trigger: sec, start: 'top 55%', toggleActions: 'play none none reverse' },
      })
      App.bus.on('cast:change', syncSeats)
      let rw = 0
      window.addEventListener('resize', () => {
        clearTimeout(rw)
        rw = setTimeout(() => {
          if (Math.abs(window.innerWidth - S.vw) < 2 && Math.abs(window.innerHeight - S.vh) < 120) return
          layout()
          ScrollTrigger.refresh()
        }, 180)
      })
    },
    leave() { if (S.hot) setHot(null) },
  })
})()
