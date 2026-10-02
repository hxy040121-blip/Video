/* ==========================================================
   卡池 · cast —— 二层东肖像廊
   滚动时长廊横向推进：38 幅肖像挂在暗酒红织锦墙上，细黄铜画框（尖拱 / 椭圆 / 内凹角 / 八角，一套四型），
   画框下一块小铜名牌（名字 + 尚未解出的称号）。
   光标是一支蜡烛：靠近的画框被照亮，黄铜反光与投影随烛光移动；远处的肖像沉在黑里，只剩一双双发光的眼睛。
   眼睛：平时各看各的（顺着长廊望向东头）；你停下不动时它们移开视线，你一动——整条长廊的眼睛同时转向你。
   悬停：烛光点亮这一幅的轮廓光与眼睛、其余沉暗，画框被风吹得晃一下，名牌上的称号解码出来。
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
     状态
     ===================================================================== */
  const S = {
    built: false, visible: false, mob: false,
    vw: 1440, vh: 900, u: 200, introW: 600, trackW: 4000, travel: 3000, k: 0.8,
    p: 0, x: 0, cx: 720, cy: 450, dip: 0, flare: 0, flick: 1,
    items: [], hot: null, cur: -1,
    away: false, awaySince: 0, lastAct: 0, lastMoment: 0, firstPending: true, visSince: 0,
    lastTouch: -1e9, stageTop: 0,
  }
  let sec, sticky, wall, fore, dark, glow, hudCount, hudBar, hudTicks, voidIt

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
    S.introW = S.mob ? S.vw * 0.92 : Math.max(560, S.vw * 0.5)
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
    // 红线：从空框垂到画外（带入十五席）
    const th = wall.querySelector('.cast-thread')
    if (th) {
      const x0 = voidIt.x + voidIt.w / 2, y0 = voidIt.y - nail
      const x1 = S.trackW - 10, y1b = vh + 40
      th.setAttribute('viewBox', `0 0 ${S.trackW} ${vh}`)
      th.style.width = S.trackW + 'px'
      th.querySelector('path').setAttribute('d', `M${x0} ${y0}C${x0 + 60} ${y0 + vh * 0.5} ${x1 - 220} ${vh * 0.62} ${x1} ${y1b}`)
    }
    S.measured = false
  }

  function placeItem(it) {
    const { w, h, type } = it
    const b = Math.max(7, Math.round(S.u * 0.045)) // 框条宽
    const P = b + 26
    it.b = b; it.P = P
    const node = it.node
    node.style.left = it.x + 'px'
    node.style.top = it.y + 'px'
    node.style.width = w + 'px'
    node.style.height = h + 'px'
    const clip = `path('${SHAPES[type](0, 0, w, h)}')`
    it.win.style.clipPath = clip
    it.win.style.webkitClipPath = clip
    it.shadowIn.style.clipPath = `path('${SHAPES[type](0, 0, w + 2 * b, h + 2 * b)}')`
    it.shadowIn.style.width = w + 2 * b + 'px'
    it.shadowIn.style.height = h + 2 * b + 'px'
    it.shadow.style.left = it.shadow.style.top = -b + 'px'
    // 肖像：头部落在窗口约 46% 高处
    const pw = Math.max(w * 1.06, h * 0.78), ph = pw * 4 / 3
    it.pw = pw; it.ph = ph
    it.pl = (w - pw) / 2; it.pt = h * 0.46 - ph * 0.41
    it.por.style.width = pw + 'px'
    it.por.style.height = ph + 'px'
    it.por.style.left = it.pl + 'px'
    it.por.style.top = it.pt + 'px'
    if (it.eyesBox) {
      it.eyesBox.style.width = pw + 'px'
      it.eyesBox.style.height = ph + 'px'
      it.eyesBox.style.transform = `translate3d(${(it.x + it.pl).toFixed(1)}px,${(it.y + it.pt).toFixed(1)}px,0)`
    }
    // 黄铜框
    const W = w + 2 * P, H = h + 2 * P
    const gid = 'cast-g' + it.k
    it.border.setAttribute('viewBox', `0 0 ${W} ${H}`)
    it.border.style.width = W + 'px'
    it.border.style.height = H + 'px'
    it.border.style.left = it.border.style.top = -P + 'px'
    it.border.innerHTML =
      `<defs><radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${-H}" r="${Math.max(W, H) * 0.95}">` +
      `<stop offset="0" stop-color="#ffe7b0"/><stop offset=".28" stop-color="#d4a85f"/><stop offset=".62" stop-color="#6f5532"/><stop offset="1" stop-color="#2a1d10"/></radialGradient>` +
      `<linearGradient id="${gid}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#21170e"/><stop offset=".5" stop-color="#0c0806"/><stop offset="1" stop-color="#1a120b"/></linearGradient></defs>` +
      `<path class="cast-mould" d="${SHAPES[type](P - b, P - b, w + 2 * b, h + 2 * b)} ${SHAPES[type](P, P, w, h)}" fill="url(#${gid}m)" fill-rule="evenodd"/>` +
      `<g fill="none" stroke="url(#${gid})">` +
      `<path d="${SHAPES[type](P - b, P - b, w + 2 * b, h + 2 * b)}" stroke-width="1.6"/>` +
      `<path d="${SHAPES[type](P - b * 0.5, P - b * 0.5, w + b, h + b)}" stroke-width=".6" stroke-dasharray="1 3" opacity=".8"/>` +
      `<path d="${SHAPES[type](P, P, w, h)}" stroke-width="1"/></g>` +
      `<g fill="url(#${gid})" stroke="url(#${gid})" stroke-width="1">${ornaments(type, P, w, h, b)}</g>`
    it.grad = it.border.querySelector('radialGradient')
    it.gx = -1e9; it.gy = -1e9
    // 钉子与挂绳
    const nail = S.mob ? 20 : 26
    it.wire.setAttribute('viewBox', `0 0 ${w} ${nail + 30}`)
    it.wire.style.width = w + 'px'
    it.wire.style.height = nail + 30 + 'px'
    it.wire.style.top = -nail + 'px'
    const a1 = type === 'oval' ? w * 0.22 : w * 0.16
    it.wire.innerHTML = `<path d="M${a1} ${nail + 22}L${w / 2} 3L${w - a1} ${nail + 22}" fill="none" stroke="#6f5532" stroke-width=".8" opacity=".75"/><circle cx="${w / 2}" cy="3" r="2.6" fill="#c29a5b"/><circle cx="${w / 2 - .8}" cy="2.2" r=".9" fill="#ffe7b0"/>`
    it.swing.style.transformOrigin = `${w / 2}px ${-nail + 3}px`
    // 名牌
    if (it.plate) {
      it.plate.style.left = w / 2 + 'px'
      it.plate.style.top = h + b + (S.mob ? 8 : 12) + 'px'
    }
  }

  /* =====================================================================
     建 DOM
     ===================================================================== */
  function makeItem(i) {
    const c = CH[i]
    const it = { i, k: i, c, lit: 0, heat: 0, on: false, sway: null, decoded: false, gaze: { x: 0, y: 0 }, halo: [], halos: [] }
    const acc = (c.art && c.art.accent) || App.color.blood
    const node = el('div.item', { 'data-i': i })
    node.style.setProperty('--accent', acc)
    const wire = sv('svg', { class: 'cast-wire', 'aria-hidden': 'true' })
    const swing = el('div.swing')
    const shadow = el('div.shadow', { 'aria-hidden': 'true' }, el('i'))
    const win = el('div.win', {
      role: 'button', tabindex: '0', 'aria-label': c.name, 'data-cursor': '档案',
    })
    const back = el('div.back')
    const hotg = el('div.hotglow')
    const por = App.portrait(c.id, { className: 'cast-por' })
    const veil = el('div.veil')
    const dim = el('div.dim')
    win.append(back, hotg, por, veil, dim)
    const border = sv('svg', { class: 'cast-border', 'aria-hidden': 'true' })
    swing.append(shadow, win, border)
    const name = el('span.name', { text: c.name })
    const epi = el('span.epi', { text: '·'.repeat(Math.max(3, Array.from(c.epithet || '').length)) })
    const seat = el('span.seatno', { 'aria-hidden': 'true' })
    const plate = el('div.plate', null, [el('i.rivet'), name, epi, seat, el('i.rivet')])
    node.append(wire, swing, plate)
    Object.assign(it, { node, wire, swing, shadow, shadowIn: shadow.firstChild, win, back, hotg, por, veil, dim, border, plate, epi, seat, svg: por.querySelector('svg') })
    it.eyes = por._eyes || null
    // 凝视方向（移开视线时看哪里）：多数顺着长廊望向东头
    const rnd = U.seeded(97 + i * 31)
    const a = rnd() < 0.68 ? U.lerp(-0.35, 0.75, rnd()) : Math.PI + U.lerp(-0.6, 0.5, rnd())
    it.gdx = Math.cos(a); it.gdy = Math.sin(a) * 0.8
    // 交互
    if (App.finePointer) {
      win.addEventListener('pointerenter', () => setHot(it))
      win.addEventListener('pointerleave', () => { if (S.hot === it) setHot(null) })
    }
    win.addEventListener('click', () => openFrom(it))
    win.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFrom(it) } })
    win.addEventListener('focus', () => { if (!App.finePointer) return; setHot(it) })
    win.addEventListener('blur', () => { if (S.hot === it) setHot(null) })
    return it
  }

  function makeVoid() {
    const it = { i: N, k: 'v', c: null, lit: 0, heat: 0, void: true, gaze: { x: 0, y: 0 }, halo: [], halos: [] }
    const node = el('div.item.item--void')
    const wire = sv('svg', { class: 'cast-wire', 'aria-hidden': 'true' })
    const swing = el('div.swing')
    const shadow = el('div.shadow', { 'aria-hidden': 'true' }, el('i'))
    const win = el('div.win', { role: 'button', tabindex: '0', 'aria-label': '？', 'data-cursor': '', 'data-cursor-tone': 'blood' })
    const back = el('div.back')
    const glass = el('div.glass')
    const por = App.portrait('__void', { className: 'cast-por' })
    const veil = el('div.veil')
    win.append(back, glass, por, veil)
    const border = sv('svg', { class: 'cast-border', 'aria-hidden': 'true' })
    swing.append(shadow, win, border)
    const epi = el('span.epi', { text: '·····' })
    const plate = el('div.plate', null, [el('i.rivet'), el('span.name', { text: '？？？' }), epi, el('i.rivet')])
    node.append(wire, swing, plate)
    Object.assign(it, { node, wire, swing, shadow, shadowIn: shadow.firstChild, win, back, por, veil, border, plate, epi, svg: por.querySelector('svg') })
    it.eyes = por._eyes || null
    it.gdx = -1; it.gdy = 0.1
    let busy = false
    const poke = () => {
      if (busy) return
      busy = true
      if (!it.decoded) { it.decoded = true; App.text.scramble(epi, '下一幅是你', { duration: 1.1 }) }
      App.audio.sfx('dark', { volume: 0.8 })
      App.glitch(plate, 0.4)
      gsap.fromTo(win, { opacity: 1 }, { opacity: 0.15, duration: 0.05, repeat: 5, yoyo: true, ease: 'steps(1)', onComplete: () => { gsap.set(win, { clearProps: 'opacity' }); busy = false } })
    }
    win.addEventListener('pointerenter', () => { if (App.finePointer) poke() })
    win.addEventListener('click', poke)
    return it
  }

  function build(el0) {
    sec = el0
    sec.classList.add('cast')
    sticky = el('div.sticky')
    wall = el('div.wall')
    const paper = el('div.paper')
    paper.style.backgroundImage = DAMASK
    wall.append(paper, el('div.crown'), el('div.wains', null, el('i')))
    const thread = sv('svg', { class: 'cast-thread', 'aria-hidden': 'true', preserveAspectRatio: 'none' })
    thread.innerHTML = '<path fill="none" stroke="#ff2e7e" stroke-width="1.4" stroke-linecap="round"/>'
    wall.appendChild(thread)
    for (let i = 0; i < N; i++) {
      const it = makeItem(i)
      S.items.push(it)
      wall.appendChild(it.node)
    }
    voidIt = makeVoid()
    wall.appendChild(voidIt.node)

    dark = el('div.dark', { 'aria-hidden': 'true' })
    glow = el('div.glow', { 'aria-hidden': 'true' })

    fore = el('div.fore', { 'aria-hidden': 'true' })
    const title = el('h2.title.t-display', { text: '卡池' })
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
    hudBar = el('div.bar', null, el('i'))
    hudTicks = el('div.ticks')
    for (let i = 0; i < N; i++) hudTicks.appendChild(el('i'))
    hudBar.appendChild(hudTicks)
    hud.append(el('span.hudname', { text: 'EAST GALLERY' }), hudBar, hudCount)

    sticky.append(wall, dark, glow, fore, hud)
    sec.appendChild(sticky)
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
      it.eyeEls = Array.from(it.por.querySelectorAll('.p-eye'))
      const pr = it.por.getBoundingClientRect()
      if (!pr.width) continue
      const sc = Array.from(it.por.querySelectorAll('.p-sclera'))
      const pts = []
      for (const s of sc) {
        const r = s.getBoundingClientRect()
        if (!r.width && !r.height) continue
        pts.push({ x: (r.left + r.width / 2 - pr.left) / pr.width, y: (r.top + r.height / 2 - pr.top) / pr.height, w: r.width / pr.width })
      }
      if (!pts.length) pts.push({ x: 0.42, y: 0.41, w: 0.07 }, { x: 0.58, y: 0.41, w: 0.07 })
      for (const p of pts.slice(0, 3)) {
        const h = el('i.halo')
        h.style.left = (p.x * 100).toFixed(2) + '%'
        h.style.top = (p.y * 100).toFixed(2) + '%'
        box.appendChild(h)
        it.halos.push(h)
      }
    }
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
      gsap.to(prev, { heat: 0, duration: 0.6, ease: 'power2.out' })
    }
    sec.classList.toggle('is-focus', !!it)
    if (!it) return
    it.node.classList.add('is-hot')
    gsap.to(it, { heat: 1, duration: 0.55, ease: 'power2.out' })
    sway(it, App.mouse.vx)
    if (!it.decoded) {
      it.decoded = true
      App.text.scramble(it.epi, it.c.epithet, { duration: 0.9 })
    }
  }

  function sway(it, v) {
    if (RM) return
    const dir = (v || 0) >= 0 ? 1 : -1
    const amp = U.clamp(1.6 + Math.abs(v || 0) * 0.12, 1.6, 3.4)
    if (it.sw) it.sw.kill()
    it.sw = gsap.timeline()
      .to(it.swing, { rotation: dir * amp, duration: 0.32, ease: 'sine.out' })
      .to(it.swing, { rotation: -dir * amp * 0.62, duration: 0.6, ease: 'sine.inOut' })
      .to(it.swing, { rotation: dir * amp * 0.34, duration: 0.55, ease: 'sine.inOut' })
      .to(it.swing, { rotation: -dir * amp * 0.14, duration: 0.5, ease: 'sine.inOut' })
      .to(it.swing, { rotation: 0, duration: 0.5, ease: 'sine.inOut' })
  }

  /* =====================================================================
     「整条长廊的眼睛同时转向你」
     ===================================================================== */
  function lookAway(stagger) {
    if (S.away) return
    S.away = true
    S.awaySince = performance.now()
    for (const it of S.items.concat([voidIt])) {
      if (!it.eyes) continue
      if (!stagger) { it.eyes.fixed = it.gaze; continue }
      gsap.delayedCall(U.rand(0, 1.6), () => { if (S.away && it.eyes) it.eyes.fixed = it.gaze })
    }
  }
  function moment(big) {
    S.away = false
    S.lastMoment = performance.now()
    for (const it of S.items.concat([voidIt])) if (it.eyes) it.eyes.fixed = null
    S.flare = 1
    if (!RM) gsap.fromTo(S, { dip: big ? 1 : 0.7 }, { dip: 0, duration: big ? 1.3 : 0.9, ease: 'power2.out', overwrite: true })
    App.audio.sfx('heartbeat', { volume: big ? 1 : 0.75 })
    if (big) App.audio.sfx('dark', { volume: 0.5, delay: 0.05 })
    if (App.state.section === 'cast') {
      App.audio.setMood({ tension: 0.5 })
      gsap.delayedCall(2.4, () => { if (App.state.section === 'cast') App.audio.setMood({ tension: 0.18 }) })
    }
  }

  /* =====================================================================
     帧循环：滚动 → 长廊推进；光标 → 烛光、照亮、投影、反光
     ===================================================================== */
  function onAct() { S.lastAct = performance.now() }
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
    wall.style.transform = tr
    fore.style.transform = tr
    const st = sticky.getBoundingClientRect().top
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
    const fl = RM ? 1 : 1 + Math.sin(t * 11.3) * 0.025 + Math.sin(t * 23.7 + 1.3) * 0.018 + (Math.random() - 0.5) * 0.025
    S.flick = fl * (1 - S.dip * 0.55)
    const R = (S.mob ? Math.max(250, vw * 0.8) : U.clamp(vw * 0.31, 300, 560)) * S.flick
    dark.style.transform = `translate3d(${S.cx.toFixed(1)}px,${S.cy.toFixed(1)}px,0) scale(${(R / 520 * 3.2).toFixed(3)})`
    glow.style.transform = `translate3d(${S.cx.toFixed(1)}px,${S.cy.toFixed(1)}px,0) scale(${(R / 520).toFixed(3)})`
    glow.style.opacity = (0.75 + (fl - 1) * 4) * (1 - S.dip * 0.8)
    S.flare = Math.max(0, S.flare - dt * 0.012)

    // 首次进入 / 停顿 → 移开视线；再动 → 同时转向你
    if (S.firstPending) {
      if (!S.away) lookAway(false)
      if ((S.p > 0.002 || (st <= 1 && now - S.visSince > 1600)) && now - S.visSince > 500) { S.firstPending = false; moment(true) }
    } else if (!App.overlay.isOpen) {
      if (!S.away && now - S.lastAct > 5200 && now - S.lastMoment > 3000) lookAway(true)
      else if (S.away && now - S.lastAct < 80 && now - S.awaySince > 1400) moment(false)
    }

    // 每幅画
    const all = S.items
    let nearest = -1, nd = 1e9
    for (let i = 0; i <= all.length; i++) {
      const it = i < all.length ? all[i] : voidIt
      const sx = it.x + x
      if (sx > vw + 260 || sx + it.w < -260) {
        if (it.on) { it.on = false }
        continue
      }
      it.on = true
      const fx = sx + it.w / 2, fy = it.y + it.h * 0.45
      const dx = fx - S.cx, dy = (fy - S.cy) * 1.15
      const d = Math.hypot(dx, dy) || 1
      const lit = smooth(R * 1.05, R * 0.18, d) * U.clamp(S.flick, 0, 1.1)
      it.lit = approach(it.lit, lit, 0.3, dt)
      const L = Math.max(it.lit, it.heat)
      if (Math.abs(L - (it.lw || 0)) > 0.006) { it.node.style.setProperty('--lit', L.toFixed(3)); it.lw = L }
      // 投影：背向烛光
      const k = U.clamp(d * 0.028, 3, 26)
      const shx = (dx / d) * k, shy = (dy / d) * k * 0.8 + 6
      it.shadow.style.transform = `translate3d(${shx.toFixed(1)}px,${shy.toFixed(1)}px,0)`
      // 黄铜反光：渐变中心 = 烛光在框坐标里的位置
      if (it.grad && L > 0.02) {
        const gx = S.cx - sx + it.P, gy = S.cy - it.y + it.P
        if (Math.abs(gx - it.gx) > 1.5 || Math.abs(gy - it.gy) > 1.5) {
          it.grad.setAttribute('cx', gx.toFixed(0)); it.grad.setAttribute('cy', gy.toFixed(0))
          it.gx = gx; it.gy = gy
        }
      }
      // 悬停：烛光点亮轮廓光与眼睛
      if (it.heat > 0.004 && it.svg) {
        const h = it.heat
        const ux = -dx / d, uy = -dy / d
        const rx = (ux * 2.6 * h).toFixed(2), ry = (uy * 2.2 * h).toFixed(2)
        it.svg.style.filter = `grayscale(${(0.85 * (1 - h)).toFixed(3)}) brightness(${(0.78 + 0.32 * h).toFixed(3)}) drop-shadow(${rx}px ${ry}px 0 rgba(236,198,128,${(0.95 * h).toFixed(3)})) drop-shadow(0 0 ${(10 * h).toFixed(1)}px rgba(194,154,91,${(0.4 * h).toFixed(3)}))`
        it.filtered = true
      } else if (it.filtered) { it.svg.style.filter = ''; it.filtered = false }
      // 凝视目标（移开视线时）
      it.gaze.x = fx + it.gdx * 900
      it.gaze.y = fy + st + it.gdy * 900
      // 眼睛的光：跟随虹膜、跟着眨眼
      if (it.halos.length) {
        const w = it.eyes
        const s = it.pw / 600
        const ox = w ? w.ox * s : 0, oy = w ? w.oy * s : 0
        let blink = 1
        const e0 = it.eyeEls && it.eyeEls[0]
        if (e0) {
          const ta = e0.getAttribute('transform') || e0.style.transform || ''
          const mm = /matrix\(\s*[-\d.e]+[ ,]+[-\d.e]+[ ,]+[-\d.e]+[ ,]+([-\d.e]+)/.exec(ta) || /scale\(\s*[-\d.e]+\s*,\s*([-\d.e]+)/.exec(ta)
          if (mm) blink = U.clamp(parseFloat(mm[1]), 0, 1)
        }
        let op
        if (it.void) op = (1 - smooth(0.05, 0.55, it.lit)) * (S.away ? 0.55 : 1)
        else op = (0.55 + 0.45 * Math.max(S.flare, it.heat)) * (1 - 0.72 * it.lit * (1 - it.heat))
        op *= blink
        const sc = 1 + S.flare * 0.6 + it.heat * 0.35
        const ht = `translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0) scale(${sc.toFixed(3)},${(sc * Math.max(0.05, blink)).toFixed(3)})`
        for (const hl of it.halos) { hl.style.transform = ht; hl.style.opacity = op.toFixed(3) }
      }
      if (it.void) {
        // 空框：近了是空的，远了里面有人
        const vis = 1 - smooth(0.04, 0.5, it.lit)
        it.por.style.opacity = (vis * 0.95).toFixed(3)
      }
      if (!it.void) {
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
    hudBar.style.setProperty('--p', S.p.toFixed(4))
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

  function radar(c, onAxis) {
    const st = c.stats || {}
    const R = 104
    const svg = sv('svg', { viewBox: '-176 -150 352 312', class: 'cast-radar' })
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
    const page = el('article.dos-page' + (lum > 0.62 ? '.is-light' : ''), { 'aria-label': c.name })
    page.style.setProperty('--accent', acc)
    page.style.setProperty('--accent-rgb', `${r},${g},${b}`)

    const block = el('div.dos-block', null, [el('i.dos-halftone'), el('i.dos-light')])
    const stripe = el('div.dos-stripe')
    const big = el('div.dos-bignum', { text: two(i + 1), 'aria-hidden': 'true' })
    const fig = el('div.dos-fig')
    const por = App.portrait(c.id, { className: 'cast-dos-por', eyeRange: 8 })
    fig.appendChild(por)
    const nameLen = Array.from(c.name).length
    const name = el('h3.dos-name', { 'aria-label': c.name })
    name.style.setProperty('--n', String(Math.max(2, nameLen)))
    if (/^[A-Za-z]+$/.test(c.name)) name.classList.add('is-latin')
    const nameChars = []
    for (const ch of Array.from(c.name)) {
      const s = el('span', { text: ch === '·' ? '・' : ch, 'aria-hidden': 'true' })
      name.appendChild(s)
      nameChars.push(s)
    }
    const nameGhost = name.cloneNode(true)
    nameGhost.className = 'cast-dos-name cast-dos-name--ghost' + (name.classList.contains('is-latin') ? ' is-latin' : '')
    nameGhost.setAttribute('aria-hidden', 'true')

    const height = c.heightCm ? c.heightCm + 'CM' : ''
    const meta = [c.age, height, c.era].filter(Boolean).join('  ／  ')
    const epi = el('div.dos-epi', { text: c.epithet })
    const work = el('div.dos-work', { text: c.work })
    const metaEl = el('div.dos-meta', { text: meta })
    const zh = el('p.dos-zh')
    const orig = el('p.dos-orig', { text: c.quote && c.quote.orig && c.quote.orig !== '—' ? typo(c.quote.orig) : '' })
    const quote = el('blockquote.dos-quote', null, [el('span.dos-qmark', { text: '「', 'aria-hidden': 'true' }), zh, orig])
    const see = el('div.dos-line', null, [el('span.dos-k', { text: '别人眼里' }), el('p.dos-v', { text: c.othersSee || '' })])
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
      .fromTo(P.tags.children, { opacity: 0, y: 8, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(2)' }, 1.1)
      .fromTo(P.orig, { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0)
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

  function dropPortrait(wrap) {
    const w = wrap && wrap._eyes
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
      D.root.insertBefore(P.page, D.nav)
      D.page = P
      updateNav()
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
    if (!RM) gsap.fromTo(it.win, { filter: 'brightness(2.2)' }, { filter: 'brightness(1)', duration: 0.5, ease: 'power2.out', clearProps: 'filter' })
    openDossier(it.i)
  }

  function openDossier(i) {
    D.root = el('div.dos')
    D.nav = buildNav()
    D.root.appendChild(D.nav)
    D.open = true
    D.page = null
    App.overlay.open(D.root, {
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
      it.seat.textContent = si >= 0 ? two(si + 1) : ''
      it.plate.classList.toggle('is-seated', si >= 0)
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
      App.onVisible(sticky, v => {
        S.visible = v
        if (v) S.visSince = performance.now()
        sec.classList.toggle('is-paused', !v)
      }, { rootMargin: '0px' })
      App.tick(frame)
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
