/* ==========================================================
   身份 · identities
   十五组身份牌。进入板块：十五张牌从画外一张张发到圆桌上，排成扇面（牌背朝上，字尚未确定），
   再依次翻成正位，纹章与卡面原文像墨一样浮出。
   光标：横向拨动扇面；离光标最近的牌抬起、放大、随光标 3D 倾斜，表面一道金箔反光。
   拿起：牌飞到画面中央，其余牌暗下后退；翻面 → 逆位（色差、背景烟雾转为血红）。
   圣女：按住 1.2 秒，「圣女」二字被火烧穿，烧出「贞德」。丘比特：翻过去还是同一面。
   无人触碰时一道光扫过整副牌；光标在一张牌上停久了，它会一瞬间露出逆位又若无其事地回来。
   滚到板块末尾：扇面收拢成一叠，逐张扣过去（牌背朝上，字隐去）。
   手机端：横向滑动的牌列，点按拿起，按钮翻面。
   卡面原文、卡背原文取自 WORLD.identities（主持人游戏.md 第 5 节），
   卡底极小的共同说明取自第 5 节开头的引用块。牌的尺寸取自洋馆物理层.md 第 9 节（63×88 mm，
   与扑克牌同大、更厚更硬）；身份卡撕不开、烧不坏（物理层 0.3）。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const WORLD = window.WORLD || {}
  const DEFS = (WORLD.identities || []).slice().sort((a, b) => a.no - b.no)
  if (window.ScrambleTextPlugin) gsap.registerPlugin(window.ScrambleTextPlugin)

  /* =====================================================================
     常量
     ===================================================================== */
  const PX = 'identities-'
  // el('div.face.is-pos') → <div class="identities-face is-pos">（is- 开头的状态类不加前缀）
  const el = (spec, attrs, kids) => U.el(spec.replace(/\.([a-z][\w-]*)/gi, (m, c) => '.' + (/^is-/.test(c) ? c : PX + c)), attrs, kids)
  const N = DEFS.length
  const MID = (N - 1) / 2
  const RATIO = 88 / 63
  const DEG = Math.PI / 180
  const OATH = '受命者视为同时拥有此身份。'
  const COMMON = [
    '主动能力须在心中向主持人明确提出发动请求及必要选择。要求公开身份的能力，须完成相应公开步骤。',
    '身份卡上写明会向全馆说明的能力，发动时全馆广播能力名称与发生了什么，不公布发动者；没有这样写的能力不广播。',
  ]
  const PAL = {
    base: { a: '#150c19', b: '#c29a5b', glow: 0.36 },
    rev: { a: '#1f0509', b: '#e3265a', glow: 0.58 },
    fire: { a: '#1d0d05', b: '#ff7b2e', glow: 0.68 },
  }
  const HOLD_MS = 1200
  // 金箔反光带的方向：原先 118° 线性渐变的走向（屏幕坐标，y 向下）
  const SDX = Math.sin(118 * DEG), SDY = -Math.cos(118 * DEG)
  const GLARE_R = 39 // 高光光斑的基准半径（mm，与 CSS 中 .identities-glare 的尺寸一致）
  const RM = App.reduced
  const typo = s => String(s || '').replace(/"([^"\n]*)"/g, '“$1”')
  const smooth = (a, b, v) => { const t = U.clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
  const approach = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.pow(1 - k, dt))
  // 同上，足够接近时直接落到目标值（之后数值不再变化，也就不再写样式）
  const settle = (cur, to, k, dt, eps) => { const v = approach(cur, to, k, dt); return Math.abs(v - to) < eps ? to : v }
  const mod360 = a => ((a % 360) + 360) % 360

  const S = {
    built: false, visible: false, awake: false, mode: 'desk',
    vw: 1440, vh: 900, W: 480, H: 670, mm: 7.6, fanW: 160, fanS: 0.33, geo: null,
    cards: [], hover: -1, kb: -1, pointerIn: false, cursorForced: false,
    psi: 0, psiV: 0, pin: 0, gather: 0, rowX: 0,
    dealt: false, ready: false, focus: null, busy: false, rev: false,
    fa: { v: 0 }, wheel: 0, hold: null, burning: false, lastPal: null, hush: false,
    q: App.quality ? App.quality.level : 2,
  }

  /* =====================================================================
     纹理：骨白厚卡纸、黑漆（只生成一次，作为背景图）
     ===================================================================== */
  function texture(size, paint) {
    try {
      const c = document.createElement('canvas')
      c.width = c.height = size
      const x = c.getContext('2d')
      paint(x, size)
      return c.toDataURL('image/jpeg', 0.84)
    } catch (e) { return '' }
  }
  function paperTexture() {
    return texture(512, (x, n) => {
      x.fillStyle = '#ebe3d6'
      x.fillRect(0, 0, n, n)
      const img = x.getImageData(0, 0, n, n), d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() - 0.5) * 13
        d[i] += v; d[i + 1] += v * 0.96; d[i + 2] += v * 0.86
      }
      x.putImageData(img, 0, 0)
      x.lineCap = 'round'
      for (let k = 0; k < 340; k++) {
        const px = Math.random() * n, py = Math.random() * n, a = Math.random() * Math.PI * 2, l = 3 + Math.random() * 15
        x.strokeStyle = Math.random() < 0.55 ? 'rgba(122,96,68,.11)' : 'rgba(255,252,244,.26)'
        x.lineWidth = 0.35 + Math.random() * 0.6
        x.beginPath()
        x.moveTo(px, py)
        x.quadraticCurveTo(px + Math.cos(a + 0.7) * l * 0.5, py + Math.sin(a + 0.7) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l)
        x.stroke()
      }
      for (let k = 0; k < 26; k++) {
        const px = Math.random() * n, py = Math.random() * n, r = 1 + Math.random() * 6
        const g = x.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, 'rgba(146,104,58,.13)')
        g.addColorStop(1, 'rgba(146,104,58,0)')
        x.fillStyle = g
        x.fillRect(px - r, py - r, r * 2, r * 2)
      }
    })
  }
  function lacquerTexture() {
    return texture(512, (x, n) => {
      x.fillStyle = '#0e0a0b'
      x.fillRect(0, 0, n, n)
      for (let k = 0; k < 7; k++) {
        const px = Math.random() * n, py = Math.random() * n, r = 80 + Math.random() * 180
        const g = x.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, 'rgba(60,24,30,.16)')
        g.addColorStop(1, 'rgba(60,24,30,0)')
        x.fillStyle = g
        x.fillRect(0, 0, n, n)
      }
      const img = x.getImageData(0, 0, n, n), d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() - 0.5) * 7
        d[i] += v; d[i + 1] += v * 0.9; d[i + 2] += v * 0.95
      }
      x.putImageData(img, 0, 0)
      // 细微的漆面开片
      for (let k = 0; k < 55; k++) {
        let px = Math.random() * n, py = Math.random() * n, a = Math.random() * Math.PI * 2
        x.beginPath()
        x.moveTo(px, py)
        const steps = 3 + (Math.random() * 6 | 0)
        for (let s = 0; s < steps; s++) {
          a += (Math.random() - 0.5) * 1.3
          px += Math.cos(a) * (6 + Math.random() * 16)
          py += Math.sin(a) * (6 + Math.random() * 16)
          x.lineTo(px, py)
        }
        x.strokeStyle = 'rgba(255,236,226,.035)'
        x.lineWidth = 0.6
        x.stroke()
      }
    })
  }

  /* =====================================================================
     SVG：边框（黄铜双线 + 哥特角花）与卡底极小的共同说明
     viewBox 0 0 630 880：1 单位 = 0.1 mm
     ===================================================================== */
  const INNER = 'M72 46H558A26 26 0 0 0 584 72V808A26 26 0 0 0 558 834H72A26 26 0 0 0 46 808V72A26 26 0 0 0 72 46Z'
  // 一个角（局部坐标：原点在内框角点，+x 向右、+y 向下）
  function cornerMarkup(dot) {
    return '' +
      // 内框凹角外侧的四瓣花
      '<g stroke-width="1.1"><circle cx="10.5" cy="4.6" r="3.6"/><circle cx="4.6" cy="10.5" r="3.6"/><circle cx="16.4" cy="10.5" r="3.6"/><circle cx="10.5" cy="16.4" r="3.6"/></g>' +
      `<circle cx="10.5" cy="10.5" r="1.9" fill="${dot}" stroke="none"/>` +
      // 与凹角平行的第二道弧
      '<path d="M36 0A36 36 0 0 1 0 36" stroke-width="1.2"/>' +
      '<path d="M44 0A44 44 0 0 1 0 44" stroke-width=".7" stroke-dasharray="1.5 4"/>' +
      // 沿对角线的尖拱叶
      '<path d="M37 37C46 39 56 47 66 66C47 56 39 46 37 37Z" stroke-width="1.15"/>' +
      '<path d="M43 43L60 60" stroke-width=".8"/>' +
      `<path d="M70.5 66.5L74 74L66.5 70.5Z" fill="${dot}" stroke="none"/>` +
      // 沿两边的卷须
      '<path d="M58 6C70 6 78 12 80 22C81 28 76 31 72 28" stroke-width="1.1"/>' +
      '<path d="M6 58C6 70 12 78 22 80C28 81 31 76 28 72" stroke-width="1.1"/>' +
      `<circle cx="90" cy="6" r="1.6" fill="${dot}" stroke="none"/><circle cx="6" cy="90" r="1.6" fill="${dot}" stroke="none"/>` +
      '<path d="M96 6H128M6 96V128" stroke-width=".8"/>'
  }
  // 边框画成一张独立的 SVG 图（金 / 红各一张），所有牌共用，作为 .identities-frame 的背景图。
  // 原先每张牌面里各有一棵近九十个节点的 SVG（三十面共两千六百多个节点），整块样式重算（如板块远近切换）时都要走一遍。
  function frameSVG(kind) {
    const neg = kind === 'neg'
    const g = 'g'
    const stops = neg
      ? '<stop offset="0" stop-color="#5b1010"/><stop offset=".3" stop-color="#9a1f22"/><stop offset=".5" stop-color="#6a1214"/><stop offset=".72" stop-color="#a8262a"/><stop offset="1" stop-color="#5b1010"/>'
      : '<stop offset="0" stop-color="#7a5627"/><stop offset=".2" stop-color="#c49a55"/><stop offset=".36" stop-color="#86622f"/><stop offset=".52" stop-color="#e0bc76"/><stop offset=".68" stop-color="#8f6a36"/><stop offset=".84" stop-color="#c79e5a"/><stop offset="1" stop-color="#76532a"/>'
    const line = `url(#${g})`
    const inner = neg ? '#ff2e7e' : line
    const dot = neg ? '#ff2e7e' : line
    const corners = [[46, 46, 1, 1], [584, 46, -1, 1], [584, 834, -1, -1], [46, 834, 1, -1]]
      .map(([x, y, sx, sy]) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${cornerMarkup(dot)}</g>`).join('')
    const mid = [[46, 440, 1], [584, 440, -1]].map(([x, y, s]) =>
      `<path d="M${x} ${y - 13}L${x + 6 * s} ${y}L${x} ${y + 13}L${x - 6 * s} ${y}Z" fill="${dot}" stroke="none"/>` +
      `<path d="M${x + 13 * s} ${y - 34}Q${x + 22 * s} ${y} ${x + 13 * s} ${y + 34}" stroke-width=".8"/>`).join('')
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 880" preserveAspectRatio="none">
<defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="420" y2="560" spreadMethod="reflect">${stops}</linearGradient></defs>
<g fill="none" stroke="${line}" stroke-linecap="round" stroke-linejoin="round">
<rect x="22" y="22" width="586" height="836" rx="15" stroke-width="5"/>
<rect x="31.5" y="31.5" width="567" height="817" rx="9" stroke-width="1.1"/>
<path d="${INNER}" stroke="${inner}" stroke-width="${neg ? 1.4 : 2.1}"${neg ? ' stroke-opacity=".82"' : ''}/>
${corners}${mid}
<path d="M300 834L315 826L330 834L315 842Z" fill="${dot}" stroke="none"/>
<path d="M300 46L315 38L330 46L315 54Z" fill="${dot}" stroke="none"/>
</g></svg>`
  }
  function fineSVG() {
    return `<svg viewBox="0 0 482 28" preserveAspectRatio="none" aria-hidden="true"><g fill="currentColor" font-size="9.4" font-family="Serif SC, Noto Serif SC, serif">
<text x="0" y="10.4" textLength="482" lengthAdjust="spacingAndGlyphs">${U.esc(COMMON[0])}</text>
<text x="0" y="24.2" textLength="482" lengthAdjust="spacingAndGlyphs">${U.esc(COMMON[1])}</text></g></svg>`
  }
  // 同一段小字预先画成两张图（金 / 红），所有牌共用。
  // SVG <text> 会随祖先的 transform 变化重新排版、重画（牌每帧都在微微摆动），画成图之后就不会了。
  // 与 SVG 版等价：viewBox 482×28、两行基线 10.4 / 24.2、字号 9.4、每行横向拉伸到正好 482 宽。
  // 按拿起时的实际设备像素画（字重、清晰度与原来的 SVG 一致）；尺寸变了（resize）再画一次。
  function fineImages() {
    const font = '400 9.4px "Serif SC", "Noto Serif SC", serif'
    const k = Math.max(0.5, 48 * S.mm * Math.min(3, window.devicePixelRatio || 1) / 482)
    if (S._fineK && Math.abs(S._fineK - k) < 0.01) return
    const draw = color => {
      const c = document.createElement('canvas')
      c.width = Math.round(482 * k); c.height = Math.round(28 * k)
      const x = c.getContext('2d')
      x.scale(c.width / 482, c.height / 28)
      x.font = font
      x.fillStyle = color
      x.textBaseline = 'alphabetic'
      ;[[COMMON[0], 10.4], [COMMON[1], 24.2]].forEach(([t, y]) => {
        const w = x.measureText(t).width
        if (!w) return
        x.save(); x.translate(0, y); x.scale(482 / w, 1); x.fillText(t, 0, 0); x.restore()
      })
      return c.toDataURL('image/png')
    }
    const apply = () => {
      try {
        const pos = draw('#8a6838'), neg = draw('#8a2328')
        if (!pos || !neg) return
        S.stage.style.setProperty('--idn-fine-pos', `url(${pos})`)
        S.stage.style.setProperty('--idn-fine-neg', `url(${neg})`)
        for (const c of S.cards) for (const f of [c.front, c.back]) f.fine.replaceChildren()
        S.stage.classList.add('is-fineimg')
        S._fineK = k
      } catch (e) { /* 画不出来就保留 SVG */ }
    }
    if (!document.fonts || !document.fonts.load) return
    document.fonts.load(font, COMMON.join('')).then(apply, () => {})
  }

  /* =====================================================================
     牌
     ===================================================================== */
  function buildFace(c, side) {
    const d = c.def
    const showFront = side === 'front' || d.noReverse
    const neg = !showFront
    const name = showFront ? d.front : d.back
    const paras = typo(showFront ? d.frontText : d.backText).split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
    let oath = null
    if (neg && paras[0] === OATH) oath = paras.shift()
    const total = paras.join('').length

    const face = el(`div.face.face--${side}.${neg ? 'is-neg' : 'is-pos'}.is-blank`, { 'aria-hidden': 'true' })
    face.style.setProperty('--tx-x', Math.round(U.rand(0, 100)) + '%')
    face.style.setProperty('--tx-y', Math.round(U.rand(0, 100)) + '%')
    const paper = el('div.paper')
    const frame = el('div.frame')
    const num = el('div.num', {}, [el('span', { text: U.roman(d.no) })])
    const sig = el('div.sig')
    sig.appendChild(App.sigil(name))
    const nameT = el('span.name-t', { text: name })
    const nameEl = el('div.name', {}, [nameT])
    setNameSize(nameEl, name)
    const div = el('div.div')
    const tx = el('div.tx' + (total <= 40 && paras.length === 1 ? '.is-short' : ''))
    for (const p of paras) tx.appendChild(U.el('p', { text: p }))
    const text = el('div.text', {}, [tx])
    const fine = el('div.fine', { html: fineSVG() })
    // 叠放：纸 → 金色烫印（边框、编号、纹章、分隔）→ 箔光 → 墨字。暗化是整张牌（.identities-slot）上的 brightness 滤镜。
    // 箔光是 color-dodge / soft-light 混合层，只能压在纸和烫金上；放在墨字之上会把黑字染成紫红。
    // 箔光亮着时是独立的合成层：光标移动时只改它的 transform / opacity，牌面不重画。
    let oathEl = null
    if (oath) oathEl = el('div.oath', {}, [el('span', { text: oath })])
    const ink = el('div.ink', {}, [nameEl, oathEl, text, fine])
    const sheen = el('div.sheen'), glare = el('div.glare')
    for (const k of [paper, frame, num, sig, div, sheen, glare, ink]) face.appendChild(k)
    return {
      el: face, side, neg, name, nameEl, nameT, sig, div, text, tx, num, oath: oathEl, fine, tf: 1.6, tfr: 1.9, inked: false,
      sheen, glare, lit: false, _st: '', _so: '', _gt: '', _go: '',
    }
  }
  function setNameSize(nameEl, name) {
    const n = Array.from(name).length
    const f = n <= 2 ? 5.6 : n === 3 ? 5.2 : n === 4 ? 4.7 : n === 5 ? 4.3 : 3.9
    const ls = n <= 2 ? 0.34 : n === 3 ? 0.2 : n === 4 ? 0.12 : 0.06
    nameEl.style.setProperty('--nf', f)
    nameEl.style.setProperty('--ns', ls + 'em')
  }

  function buildCard(def, i) {
    const c = {
      i, def, name: def.front, burned: false,
      cur: { x: 0, y: 0, r: 0, s: 0.3 }, mode: 'deck', fly: null,
      flip: 180, flipLift: 0, tx: 0, ty: 0, swing: 0, lift: 0, foil: 0, dim: 0, heat: 0,
      fx: 0.5, fy: 0.5, z: i + 1, jit: U.rand(-2.4, 2.4), _t: '', _c: '', _z: -1, _d: '', _sh: '', _sho: '',
    }
    const slot = el('div.slot', {
      role: 'button', tabindex: '-1', 'data-i': i,
      'aria-label': U.roman(def.no) + ' ' + def.front + (def.noReverse ? '' : ' / ' + def.back),
    })
    const shadow = el('div.shadow')
    const glitch = el('div.glitch')
    const card = el('div.card')
    // 三层牌边直接放在牌里（不再套一层容器：3D 时每多一层容器就多一个要合成的图层）
    const edges = [0, 1, 2].map(() => el('i.edge'))
    c.slot = slot; c.shadow = shadow; c.glitch = glitch; c.card = card
    c.front = buildFace(c, 'front')
    c.back = buildFace(c, 'back')
    card.append(...edges, c.front.el, c.back.el)
    glitch.appendChild(card)
    slot.append(shadow, glitch)
    slot.addEventListener('focus', () => { if (S.ready && S.focus == null) S.kb = i })
    slot.addEventListener('blur', () => { if (S.kb === i) S.kb = -1 })
    slot.addEventListener('keydown', e => {
      if (S.focus != null || !S.ready) return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openFocus(i) }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const j = U.clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1)
        S.cards[j].slot.focus({ preventScroll: true })
      }
    })
    return c
  }
  const faceOf = c => (Math.abs(mod360(c.flip) - 180) < 90 ? c.back : c.front)
  const isBack = c => Math.abs(mod360(c.flip) - 180) < 1

  /* ---------- 卡面小字自动适配（单位 mm，与牌的实际像素无关） ---------- */
  function fitFace(f, read) {
    const box = f.text, inner = f.tx
    const key = read ? '--tfr' : '--tf'
    const fits = v => { f.el.style.setProperty(key, v); return inner.offsetHeight <= box.clientHeight + 0.5 }
    let lo = 1.1, hi = 2.3
    if (!box.clientHeight) return read ? f.tfr : f.tf
    if (fits(hi)) return hi
    for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m }
    f.el.style.setProperty(key, lo.toFixed(3))
    return lo
  }
  function fitAll() {
    for (const c of S.cards) {
      // 量尺寸时关掉过渡（否则 top 的过渡让量到的是旧版式的高度）
      const inst = [c.front.el, c.back.el].filter(n => !n.classList.contains('is-instant'))
      inst.forEach(n => n.classList.add('is-instant'))
      c.slot.classList.remove('is-read')
      for (const f of [c.front, c.back]) f.tf = fitFace(f, false)
      c.slot.classList.add('is-read')
      for (const f of [c.front, c.back]) f.tfr = fitFace(f, true)
      c.slot.classList.toggle('is-read', !!c._read)
      for (const f of [c.front, c.back]) {
        f.el.style.setProperty('--tf', f.tf.toFixed(3))
        f.el.style.setProperty('--tfr', f.tfr.toFixed(3))
      }
      void c.slot.offsetWidth
      inst.forEach(n => n.classList.remove('is-instant'))
    }
  }
  // 拿起时是否改用「细读」版式（纹章缩小，字更大）：正常版式下字小于约 11.5px 时
  const needsRead = c => Math.min(c.front.tf, c.back.tf) * S.mm < 11.5

  /* =====================================================================
     DOM
     ===================================================================== */
  function build(sec) {
    S.el = sec
    sec.classList.add('identities')
    const root = el('div.sticky')
    const stage = el('div.stage')
    root.appendChild(stage)
    S.root = root; S.stage = stage

    const paper = paperTexture(), lacquer = lacquerTexture()
    if (paper) stage.style.setProperty('--idn-paper', `url(${paper})`)
    if (lacquer) stage.style.setProperty('--idn-lacquer', `url(${lacquer})`)
    for (const k of ['pos', 'neg']) stage.style.setProperty('--idn-frame-' + k, `url("data:image/svg+xml,${encodeURIComponent(frameSVG(k))}")`)

    // 背景大字：正 / 逆
    // 另有两层预先写好的「逆」「正」（亮色）叠在上面，闪一下时只切换 opacity，不重画
    S.bgword = el('div.bgword', { 'aria-hidden': 'true' }, [el('span', { text: '正' }), el('span.bgword-f', { text: '逆' }), el('span.bgword-f', { text: '正' })])
    S.bgwordT = S.bgword.firstChild
    S.bgFlash = [S.bgword.children[1], S.bgword.children[2]]

    // 圆桌（俯视，只看得见桌沿的一段）
    S.table = el('div.table', { 'aria-hidden': 'true' })
    // 桌沿双线、虚线圈静止；十五个席位记号在另一张 SVG 里，整张随扇面旋转（合成层，不重画）。
    // 记号层只有几个小菱形：SVG 本身只是桌心的一个点（1 单位 = 1px），记号画在盒子外（overflow 可见）。
    // 画面与原先 2000×2000 视框、铺满整张桌子的写法相同；只是不再有一个两千多像素见方、几乎全透明的盒子。
    S.tableSvg = U.svg('svg', { viewBox: '-1000 -1000 2000 2000', preserveAspectRatio: 'none', class: PX + 'table-svg' })
    S.tableRot = U.svg('svg', { viewBox: '-1 -1 2 2', class: PX + 'table-rot' })
    S.table.append(S.tableSvg, S.tableRot)
    // 桌面灯光：圆桌裁切内一个光斑，跟随光标平移
    S.tableLight = el('div.table-light')
    S.tableSpot = el('i.table-spot')
    S.tableLight.appendChild(S.tableSpot)
    S.table.appendChild(S.tableLight)

    // 名牌
    S.plate = el('header.plate', {}, [
      el('div.plate-num', { text: 'I — ' + U.roman(N) }),
      el('h2.plate-name', { text: '身份' }),
      el('div.plate-rev', {}, [el('span', { text: '' })]),
    ])
    S.plateNum = S.plate.children[0]; S.plateName = S.plate.children[1]; S.plateRev = S.plate.children[2]
    S.plateRevT = S.plateRev.firstChild

    // 牌
    S.cardsEl = el('div.cards')
    S.cards = DEFS.map(buildCard)
    for (const c of S.cards) S.cardsEl.appendChild(c.slot)
    S.veil = el('div.veil')
    S.hit = el('div.hit')
    S.cardsEl.append(S.veil, S.hit)

    // 手机：横向滑动的牌列（原生滚动 + 吸附）
    S.scroller = el('div.scroller', { 'data-lenis-prevent': '', 'aria-hidden': 'true' })
    S.track = el('div.track')
    for (let i = 0; i < N; i++) S.track.appendChild(el('i.snap'))
    S.scroller.appendChild(S.track)
    // 手机：牌列下方十五道刻度，指示当前位置，点按跳到那张
    S.rticks = el('div.rticks')
    S.rtickEls = DEFS.map((d, i) => {
      const b = el('button.rtick', { type: 'button', 'aria-label': U.roman(d.no) + ' ' + d.front })
      b.addEventListener('click', e => {
        e.stopPropagation()
        if (S.focus != null || !S.ready) return
        S.scroller.scrollTo({ left: i * S.geo.sp, behavior: RM ? 'auto' : 'smooth' })
      })
      S.rticks.appendChild(b)
      return b
    })

    // 拿起后的操作
    const chevron = d => `<svg viewBox="0 0 40 80" aria-hidden="true"><path d="${d}"/></svg>`
    S.prev = el('button.nav.nav--prev', { type: 'button', 'aria-label': '上一张', 'data-cursor': '' }, [el('span.nav-ico', { html: chevron('M30 6L10 40L30 74') }), el('span.nav-num')])
    S.next = el('button.nav.nav--next', { type: 'button', 'aria-label': '下一张', 'data-cursor': '' }, [el('span.nav-ico', { html: chevron('M10 6L30 40L10 74') }), el('span.nav-num')])
    S.flipBtn = el('button.flip', { type: 'button', 'data-cursor': '' }, [el('span', { text: '翻面' })])
    S.close = el('button.close', { type: 'button', 'aria-label': '放回', 'data-cursor': '放回' })
    S.ticks = el('div.ticks')
    S.tickEls = DEFS.map((d, i) => {
      const b = el('button.tick', { type: 'button', 'aria-label': U.roman(d.no) + ' ' + d.front, 'data-cursor': U.roman(d.no) })
      b.addEventListener('click', e => { e.stopPropagation(); if (S.focus != null && S.focus !== i) navTo(i) })
      S.ticks.appendChild(b)
      return b
    })
    S.ui = el('div.ui', {}, [S.prev, S.next, S.flipBtn, S.ticks, S.close])

    // 特效层、按住进度环、脚注
    S.fx = el('canvas.fx', { 'aria-hidden': 'true' })
    S.ring = el('div.ring', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 80 80"><circle class="identities-ring-t" cx="40" cy="40" r="30"/><circle class="identities-ring-p" cx="40" cy="40" r="30"/></svg>' })
    S.ringP = S.ring.querySelector('.' + PX + 'ring-p')
    S.foot = el('div.foot', {}, [
      el('span.foot-line', { text: '撕不开 · 剪不断 · 烧不着' }),
      el('span.foot-mm', { text: '63 × 88 mm' }),
    ])

    for (const n of [S.plate, S.foot, S.table, S.rticks]) n.style.setProperty('--in', '0')
    stage.append(S.bgword, S.table, S.plate, S.foot, S.cardsEl, S.scroller, S.rticks, S.ui, S.fx, S.ring)
    sec.appendChild(root)
    S.ctx = S.fx.getContext('2d')
    S.built = true
  }

  /* =====================================================================
     布局
     ===================================================================== */
  function layout() {
    const mob = App.isMobile()
    const modeChanged = S.mode !== (mob ? 'mob' : 'desk')
    S.mode = mob ? 'mob' : 'desk'
    S.el.classList.toggle('is-mob', mob)
    S.el.classList.toggle('is-desk', !mob)
    const vw = S.stage.clientWidth || window.innerWidth
    const vh = S.stage.clientHeight || window.innerHeight
    S.vw = vw; S.vh = vh
    const hud = mob ? 56 : 64
    // 牌的基准尺寸 = 拿起后的尺寸；扇面里按比例缩小
    let W
    if (!mob) W = Math.min((Math.min(vh * 0.8, vh - hud - 150)) / RATIO, vw * 0.4)
    else W = Math.min(vw - 34, (vh - hud - 150) / RATIO)
    W = Math.max(180, Math.round(W))
    S.W = W; S.H = W * RATIO; S.mm = W / 63
    S.stage.style.setProperty('--mm', S.mm.toFixed(4) + 'px')
    const fy = mob ? hud + Math.max(14 + S.H / 2, (vh - hud - 120) / 2) : hud + 12 + S.H / 2
    S.stage.style.setProperty('--fcy', fy.toFixed(1) + 'px')
    S.stage.style.setProperty('--fcw', (W / 2).toFixed(1) + 'px')
    S.stage.style.setProperty('--fch', (S.H / 2).toFixed(1) + 'px')

    if (!mob) {
      const fw = U.clamp(Math.min(vw * 0.112, vh * 0.2), 108, 250)
      S.fanW = fw; S.fanS = fw / W
      const fh = fw * RATIO
      const R = Math.max(vh * 1.22, vw * 0.66)
      const apexY = vh * 0.545
      const span = Math.min(vw * 0.8, R * 1.45)
      const half = Math.asin(U.clamp(span / 2 / R, 0.1, 0.92))
      S.geo = { cx: vw / 2, cy: apexY + R, R, apexY, delta: half / MID, fh, fy, rt: R + fh * 0.98 }
    } else {
      // 牌列：中间一张够大（能看清纹章与名字），左右两张各露出一半，提示还能滑
      const fw = Math.min(vw * 0.6, 250, (vh - hud - 300) / RATIO)
      S.fanW = fw; S.fanS = fw / W
      const fh = fw * RATIO
      const sp = fw * 0.8
      S.geo = { sp, fh, rowY: hud + (vh - hud) * 0.5 + 10, fy }
      S.track.style.width = (vw + (N - 1) * sp).toFixed(1) + 'px'
      Array.from(S.track.children).forEach((s, i) => {
        s.style.left = (vw / 2 + i * sp - sp / 2).toFixed(1) + 'px'
        s.style.width = sp.toFixed(1) + 'px'
      })
      S.scroller.style.top = (S.geo.rowY - fh * 0.62).toFixed(1) + 'px'
      S.scroller.style.height = (fh * 1.24).toFixed(1) + 'px'
      S.rticks.style.top = (S.geo.rowY + fh * 0.5 + 44).toFixed(1) + 'px'
    }
    layoutTable()
    sizeFx()
    // 尚未发牌：牌停在画外
    if (!S.dealt) for (const c of S.cards) Object.assign(c.cur, deckPose(c))
    if (modeChanged && S.focus != null) closeFocus(true)
  }

  // 特效画布（低画质时按 1 倍像素）
  function sizeFx() {
    const dpr = Math.min(S.q >= 2 ? 1.5 : 1, window.devicePixelRatio || 1)
    const w = Math.round(S.vw * dpr), h = Math.round(S.vh * dpr)
    if (S.fx.width !== w || S.fx.height !== h) { S.fx.width = w; S.fx.height = h; S.fxDirty = false }
    S.fxDpr = dpr
  }

  // 画质：2 全效果；1 不再有无人触碰时扫过整副牌的光、牌被盯久时的色差；0 再关掉箔光、灯光跟随与灰尘
  function applyQuality(n) {
    S.q = n
    if (!S.built) return
    S.stage.classList.toggle('is-q0', n === 0)
    sizeFx()
  }

  function layoutTable() {
    if (S.mode !== 'desk') { S.table.style.display = 'none'; return }
    const g = S.geo
    S.table.style.display = ''
    // 圆桌直径两千多像素，画面里只露出桌沿以下、视口以内的一段：元素只取这一段（视口宽 × 桌沿最高点到视口底），
    // 桌面渐变、桌沿圆圈按桌心坐标画在里面，画面与整张圆桌相同，图层却小得多
    const u = g.rt / 1000 // 原视框里 1 单位的像素数（半径 1000 = 桌子半径 g.rt）
    const y0 = Math.max(0, Math.floor(g.cy - g.rt))
    const h = Math.max(1, Math.ceil(S.vh - y0))
    const tcx = g.cx, tcy = g.cy - y0 // 桌心在这一段里的坐标
    S.table.style.width = S.vw.toFixed(0) + 'px'
    S.table.style.height = h + 'px'
    S.table.style.transform = `translate(0px, ${y0}px)`
    S.table.style.setProperty('--tr', g.rt.toFixed(1) + 'px')
    S.table.style.setProperty('--tc', `${tcx.toFixed(1)}px ${tcy.toFixed(1)}px`)
    // 灯光的圆形裁切仍是整张圆桌（不成层，只裁光斑）
    Object.assign(S.tableLight.style, { left: (tcx - g.rt).toFixed(1) + 'px', top: (tcy - g.rt).toFixed(1) + 'px', width: (g.rt * 2).toFixed(1) + 'px', height: (g.rt * 2).toFixed(1) + 'px' })
    S.tableRot.style.left = (tcx - 1).toFixed(1) + 'px'
    S.tableRot.style.top = (tcy - 1).toFixed(1) + 'px'
    // 桌沿（viewBox 半径 1000）：双线、十五个席位记号
    const ns = 'http://www.w3.org/2000/svg'
    const svg = S.tableSvg
    svg.setAttribute('viewBox', `${(-tcx / u).toFixed(3)} ${(-tcy / u).toFixed(3)} ${(S.vw / u).toFixed(3)} ${(h / u).toFixed(3)}`)
    svg.innerHTML = ''
    S.tableRot.innerHTML = ''
    S._tm = ''; S._lt = ''
    const ring = (r, w, o, dash) => {
      const c = document.createElementNS(ns, 'circle')
      c.setAttribute('r', r); c.setAttribute('fill', 'none')
      c.setAttribute('stroke', '#c29a5b'); c.setAttribute('stroke-width', w); c.setAttribute('stroke-opacity', o)
      c.setAttribute('vector-effect', 'non-scaling-stroke')
      if (dash) c.setAttribute('stroke-dasharray', dash)
      svg.appendChild(c)
    }
    ring(997, 1.4, 0.42)
    ring(989, 0.8, 0.22)
    const inner = 1000 * (g.R - g.fh * 0.86) / g.rt
    ring(inner, 0.8, 0.13, '2 9')
    const marks = document.createElementNS(ns, 'g')
    marks.setAttribute('class', PX + 'table-marks')
    // 原视框里的坐标换算成像素
    const f = v => +(v * u).toFixed(2)
    for (let k = 0; k < 15; k++) {
      const a = k * 24
      const p = document.createElementNS(ns, 'path')
      p.setAttribute('d', `M0 ${f(-1010)}L${f(7)} ${f(-993)}L0 ${f(-976)}L${f(-7)} ${f(-993)}Z`)
      p.setAttribute('transform', `rotate(${a})`)
      p.setAttribute('fill', '#c29a5b'); p.setAttribute('fill-opacity', '.55')
      marks.appendChild(p)
      const t = document.createElementNS(ns, 'path')
      t.setAttribute('d', `M0 ${f(-970)}V${f(-950)}`)
      t.setAttribute('transform', `rotate(${a})`)
      t.setAttribute('stroke', '#c29a5b'); t.setAttribute('stroke-opacity', '.3'); t.setAttribute('vector-effect', 'non-scaling-stroke')
      marks.appendChild(t)
    }
    S.tableRot.appendChild(marks)
    S.tableMarks = marks
  }

  /* =====================================================================
     姿态：扇面 / 牌列 / 拿起 / 牌堆
     ===================================================================== */
  function deckPose(c) {
    const fh = S.geo ? S.geo.fh : 200
    if (S.mode === 'mob') return { x: S.vw + S.fanW * 0.8 + c.i * 4, y: S.geo.rowY + U.rand(-30, 30), r: U.rand(10, 40), s: S.fanS * 1.1 }
    return { x: S.vw * 0.5 + U.rand(-70, 70), y: S.vh + fh * 0.95, r: U.rand(-38, 38), s: S.fanS * 1.12 }
  }
  function focusPose() { return { x: S.vw / 2, y: S.geo.fy, r: 0, s: 1 } }
  function fanTarget(c) { return S.mode === 'mob' ? rowTarget(c) : arcTarget(c) }

  function arcTarget(c) {
    const g = S.geo, i = c.i
    let ang = S.psi + (i - MID) * g.delta
    let off = 0
    for (const o of S.cards) {
      if (o === c || o.lift < 0.003) continue
      const k = i - o.i
      off += Math.sign(k) * g.delta * 0.66 * Math.exp(-(Math.abs(k) - 1) * 0.62) * o.lift
    }
    ang += off
    const lift = c.lift * (1 - S.gather)
    const R = g.R + lift * g.fh * 0.36
    let x = g.cx + Math.sin(ang) * R
    let y = g.cy - Math.cos(ang) * R
    let r = ang / DEG * (1 - 0.55 * lift) + Math.sin(S.t * 0.0011 + i * 1.7) * 0.35
    let s = S.fanS * (1 + 0.36 * lift)
    if (S.gather > 0.001) {
      const k = S.gather
      x = U.lerp(x, g.cx + (i - MID) * 1.1, k)
      y = U.lerp(y, g.apexY + g.fh * 0.12 - (i - MID) * 0.35, k)
      r = U.lerp(r, c.jit, k)
      s = U.lerp(s, S.fanS * 1.04, k)
    }
    const fa = S.fa.v
    if (fa > 0.001) { y += S.vh * 0.07 * fa; s *= 1 - 0.1 * fa; x = g.cx + (x - g.cx) * (1 + 0.04 * fa) }
    return { x, y, r, s }
  }

  function rowTarget(c) {
    const g = S.geo
    const x = S.vw / 2 + c.i * g.sp - S.rowX
    const d = (x - S.vw / 2) / S.vw
    const lift = c.lift
    let y = g.rowY + d * d * S.vh * 0.16 - lift * g.fh * 0.06
    let s = S.fanS * (1 + 0.1 * lift)
    const fa = S.fa.v
    if (fa > 0.001) { y += S.vh * 0.05 * fa; s *= 1 - 0.1 * fa }
    return { x, y, r: d * 16 * (1 - 0.5 * lift), s }
  }

  /* =====================================================================
     光标：最近的牌
     ===================================================================== */
  function pickArc(mx, my) {
    const g = S.geo
    const dx = mx - g.cx, dy = g.cy - my
    const r = Math.hypot(dx, dy)
    if (r < g.R - g.fh * 0.66 || r > g.R + g.fh * 1.08) return -1
    const f = (Math.atan2(dx, dy) - S.psi) / g.delta + MID
    if (f < -0.75 || f > N - 0.25) return -1
    const idx = U.clamp(Math.round(f), 0, N - 1)
    if (S.hover >= 0 && S.hover !== idx && Math.abs(f - S.hover) < 0.64) return S.hover
    return idx
  }
  function nearestRow() {
    const f = S.rowX / S.geo.sp
    return U.clamp(Math.round(f), 0, N - 1)
  }

  function setHover(h) {
    S.hover = h
    S.dwell = performance.now()
    S.peekAt = U.rand(1700, 3200)
    S.peeked = false
    if (h >= 0) {
      const c = S.cards[h]
      if (S.mode === 'desk' && S.awake) App.audio.sfx('hover', { pan: U.clamp((c.cur.x / S.vw - 0.5) * 1.4, -1, 1), pitch: 0.7 + (h / (N - 1)) * 0.6 })
      if (S.mode === 'desk' && S.pointerIn && App.cursor && App.cursor.set) { App.cursor.set('拿起'); S.cursorForced = true }
      setPlate(c)
    } else {
      releaseCursor()
      setPlate(null)
    }
  }
  function releaseCursor() {
    if (S.cursorForced && App.cursor && App.cursor.clear) App.cursor.clear()
    S.cursorForced = false
  }

  /* ---------- 名牌 ---------- */
  function setPlate(c) {
    const num = c ? U.roman(c.def.no) : 'I — ' + U.roman(N)
    const name = c ? c.name : '身份'
    const rev = c ? (c.def.noReverse ? c.name : c.def.back) : ''
    if (S.plateNum.textContent !== num) S.plateNum.textContent = num
    if (S._plateName !== name) {
      S._plateName = name
      gsap.killTweensOf(S.plateName)
      if (RM) S.plateName.textContent = name
      else gsap.to(S.plateName, { duration: 0.42, scrambleText: { text: name, chars: '█▓▒░', speed: 1.2, revealDelay: 0.08 }, ease: 'none' })
    }
    S.plate.classList.toggle('is-card', !!c)
    S.plate.classList.toggle('is-same', !!(c && c.def.noReverse))
    if (S.plateRevT.textContent !== rev) S.plateRevT.textContent = rev
  }

  /* =====================================================================
     帧循环
     ===================================================================== */
  function tick(time, dt) {
    if (!S.built || !S.visible) return
    S.t = performance.now()
    const rect = S.stage.getBoundingClientRect()
    const m = App.mouse
    const mx = m.x - rect.left, my = m.y - rect.top
    const inStage = m.active && mx >= 0 && mx <= S.vw && my >= 0 && my <= S.vh
    S.mx = mx; S.my = my

    if (!S.dealt && S.awake && rect.top < S.vh * 0.34 && rect.bottom > S.vh * 0.55) deal()
    if (S.mode === 'mob') S.rowX = S.scroller.scrollLeft

    // 滚到板块末尾：扇面收拢成一叠
    const gT = S.mode === 'desk' && S.ready && S.focus == null ? smooth(0.8, 1, S.pin) : 0
    S.gather = approach(S.gather, gT, 0.1, dt)
    const hush = S.gather > 0.56
    if (hush !== S.hush) {
      S.hush = hush
      for (const c of S.cards) c.back.el.classList.toggle('is-hush', hush)
      if (S.awake) for (let k = 0; k < 5; k++) App.audio.sfx('flip', { delay: k * 0.08, pitch: (hush ? 0.78 : 0.95) + k * 0.04, volume: 0.22 })
    }

    // 扇面被拨动：位置决定目标角，速度给一个冲量，弹簧回位
    if (S.mode === 'desk') {
      const nx = inStage ? U.clamp(mx / S.vw) : 0.5
      const target = (nx - 0.5) * 0.085 + (0.5 - S.pin) * 0.1
      if (inStage && S.pointerIn && S.focus == null && S.ready) S.psiV += U.clamp(m.vx, -60, 60) * 0.000085 * dt
      S.psiV += (target - S.psi) * 0.03 * dt
      S.psiV *= Math.pow(0.87, dt)
      S.psi += S.psiV * dt
    }

    // 最近的牌
    let h = -1
    if (S.ready && S.focus == null && !S.busy && S.gather < 0.35) {
      if (S.mode === 'desk') h = inStage && S.pointerIn ? pickArc(mx, my) : -1
      else h = nearestRow()
      if (h < 0 && S.kb >= 0) h = S.kb
    }
    if (h !== S.hover) setHover(h)
    if (S.hover >= 0 && !S.peeked && S.focus == null && !RM && S.t - S.dwell > S.peekAt) { S.peeked = true; peek(S.cards[S.hover]) }
    if (S.mode === 'mob') {
      const ri = nearestRow()
      if (ri !== S._ri) { S._ri = ri; S.rtickEls.forEach((t, k) => t.classList.toggle('is-on', k === ri)) }
    }

    S.idle = S.ready && !RM && S.q >= 2 && S.focus == null && S.hover < 0 && S.gather < 0.2
    S.wave = ((S.t * 0.0024) % 27) - 6
    for (const c of S.cards) updateCard(c, dt, mx, my)
    updateTable(mx, my, inStage)
    updateBgword(mx, my, inStage)
    if (S.hold) updateHold()
    fxTick(dt)
  }

  function updateCard(c, dt, mx, my) {
    if (c.mode === 'deck') return
    const isH = c.i === S.hover
    c.lift = settle(c.lift, isH ? 1 : 0, 0.15, dt, 0.001)
    const p = c.cur
    if (c.mode === 'fan') {
      const T = fanTarget(c)
      const k = 1 - Math.pow(1 - 0.2, dt)
      p.x += (T.x - p.x) * k; p.y += (T.y - p.y) * k; p.r += (T.r - p.r) * k; p.s += (T.s - p.s) * k
    } else if (c.mode === 'fly') {
      const F = c.fly
      const T = F.to === 'focus' ? focusPose() : fanTarget(c)
      const k = F.k
      p.x = U.lerp(F.from.x, T.x, k)
      p.y = U.lerp(F.from.y, T.y, k) - Math.sin(Math.PI * U.clamp(k)) * F.arc
      p.r = U.lerp(F.from.r, T.r, k) + Math.sin(Math.PI * U.clamp(k)) * F.spin
      p.s = U.lerp(F.from.s, T.s, k) * (1 + Math.sin(Math.PI * U.clamp(k)) * F.pop)
      c.swing = Math.sin(Math.PI * U.clamp(k)) * F.tilt
    } else if (c.mode === 'focus') {
      const T = focusPose()
      const k = 1 - Math.pow(1 - 0.25, dt)
      p.x += (T.x - p.x) * k; p.y += (T.y - p.y) * k; p.r += (0 - p.r) * k; p.s += (1 - p.s) * k
      c.swing = approach(c.swing, 0, 0.2, dt)
    }

    // 倾斜与反光：抬起的牌、拿在手里的牌跟随光标
    let ttx = 0, tty = 0, foilT = 0
    const active = (isH && S.mode === 'desk' && S.pointerIn) || (c.mode === 'focus' && S.focus === c.i && !S.burning)
    if (active) {
      const a = p.r * DEG
      const dx = mx - p.x, dy = my - p.y
      const hw = S.W * p.s * 0.5, hh = S.H * p.s * 0.5
      const lx = U.clamp((dx * Math.cos(a) + dy * Math.sin(a)) / hw, -1.3, 1.3)
      const ly = U.clamp((-dx * Math.sin(a) + dy * Math.cos(a)) / hh, -1.3, 1.3)
      const amp = c.mode === 'focus' ? 7 : 15
      tty = lx * amp * (RM ? 0.4 : 1)
      ttx = -ly * amp * 0.8 * (RM ? 0.4 : 1)
      c.fx = approach(c.fx, 0.5 + lx * 0.5, 0.2, dt)
      c.fy = approach(c.fy, 0.5 + ly * 0.5, 0.2, dt)
      foilT = 1
    } else if (isH) {
      foilT = 0.6
      c.fx = approach(c.fx, 0.5 + Math.sin(S.t * 0.0007) * 0.35, 0.05, dt)
      c.fy = approach(c.fy, 0.35, 0.05, dt)
    } else if (S.idle && c.mode === 'fan') {
      // 无人触碰时：一道光缓缓扫过整副牌，金边逐张闪一下
      const d = c.i - S.wave
      foilT = 0.55 * Math.exp(-d * d * 0.45)
      c.fx = approach(c.fx, U.clamp(0.5 - d * 0.32, 0, 1), 0.08, dt)
      c.fy = approach(c.fy, 0.3, 0.08, dt)
    }
    if (S.q === 0) foilT = 0
    c.tx = approach(c.tx, ttx, 0.14, dt)
    c.ty = approach(c.ty, tty, 0.14, dt)
    c.foil = settle(c.foil, foilT, 0.12, dt, 0.002)
    const hero = S.focus === c.i || (c.mode === 'fly' && c.fly.to === 'focus') || (S.focus == null && c.i === S.lastFocus)
    const hoverDim = (S.hover >= 0 && !isH && S.focus == null) ? 0.34 : 0
    c.dim = Math.max(settle(c.dim, hoverDim, 0.1, dt, 0.002), hero ? 0 : 0.74 * S.fa.v)
    render(c)
  }

  // 一张牌在画面上的三种画法：
  //   平放（扇面里静止的牌，绝大多数时候）：不做 3D，只画朝上的那一面，整张牌（连同影子）只占一个合成层；
  //   整张转（发牌时一张张飞进来、带一点前后倾）：仍是那一个合成层，把透视与倾角接在牌位的 transform 上，
  //     不建 3D 结构、飞行途中不重画。飞得快、牌在扇面尺寸，倾角最大 24°，牌边厚度不到 1px，看不出差别；
  //   立体（抬起、倾斜、拿在手里、飞去 / 飞回、发牌后的翻面浪、收拢后逐张扣过去、拿起后翻面）：
  //     原来的 3D 结构（两面 backface-visibility、三层鎏金牌边）。
  // 几种画法画面一致：rotateY(180°) 的牌 × rotateY(180°) 的背面 = 不转的背面；
  // perspective(230mm) 接在牌（或牌位 scale 之后）的 transform 最前面，与原先父元素上的 perspective 属性等价
  // （都以牌心为原点，单位是牌自身的像素），省掉一层 3D 容器。
  function render(c) {
    const p = c.cur
    // 收拢成一叠之后，牌由下往上逐张扣过去（牌背朝上，字隐去）
    const gk = S.gather > 0.4 && c.mode === 'fan' ? smooth(0.5 + c.i * 0.018, 0.68 + c.i * 0.018, S.gather) : 0
    const bump = Math.sin(Math.PI * gk)
    const s = p.s * (1 + (c.flipLift + bump * 0.8) * 0.06)
    const lift = bump * S.fanW * 0.1
    const fl = c.flip + (c.peek ? 180 : 0) + gk * 180
    const persp = `perspective(${(S.mm * 230).toFixed(1)}px)`
    const dealFly = c.mode === 'fly' && c.fly.deal && c.flipLift < 0.001
    const deep = (c.mode !== 'fan' && !dealFly) || c.lift > 0.04 || c.flipLift > 0.001 || (gk > 0.001 && gk < 0.999) || Math.abs(c.tx) + Math.abs(c.ty) > 0.6
    let t = `translate3d(${(p.x - S.W / 2).toFixed(2)}px,${(p.y - S.H / 2 - lift).toFixed(2)}px,0) rotate(${p.r.toFixed(3)}deg) scale(${s.toFixed(4)})`
    if (!deep && Math.abs(c.swing) > 0.005) {
      const res = fl - 180 * Math.round(fl / 180) // 朝上那一面自身的转角（-90°–90°）
      t += ` ${persp} rotateX(${c.swing.toFixed(2)}deg) rotateY(${res.toFixed(2)}deg)`
    }
    if (t !== c._t) { c.slot.style.transform = t; c._t = t }
    if (deep !== c._deep) { c._deep = deep; c.slot.classList.toggle('is-3d', deep) }
    const ct = deep ? `${persp} rotateX(${(c.tx + c.swing).toFixed(2)}deg) rotateY(${(fl + c.ty).toFixed(2)}deg)` : 'none'
    if (ct !== c._c) { c.card.style.transform = ct; c._c = ct }
    // 朝向观者的那一面；另一面不画（翻到一半、两面都可能露出来时才都画，由 backface-visibility 决定显示哪面）
    const ry = fl + (deep ? c.ty : 0)
    const vis = Math.cos(ry * DEG) < 0 ? c.back : c.front
    const edgeOn = deep && Math.abs(Math.sin(ry * DEG)) > 0.85
    const show = edgeOn ? 'both' : vis === c.back ? 'back' : 'front'
    if (show !== c._show) {
      c._show = show
      c.card.classList.toggle('is-front', show === 'front')
      c.card.classList.toggle('is-back', show === 'back')
    }
    // 叠放次序
    const z = S.focus === c.i ? 100 : c.mode === 'fly' ? (c.fly.to === 'focus' ? 99 : 90) : c.i === S.hover ? 60 : c.i + 1
    if (z !== c._z) { c.slot.style.zIndex = z; c._z = z }
    // 影子、暗化、箔光：数值没变就不写。平放时影子固定不动（与牌同在一个合成层里）
    const L = deep ? Math.max(c.lift, S.focus === c.i ? 1 : 0) : 0
    // 影子只在真会动的时候（抬起、随光标偏移、拿在手里）才单独成层；翻面、飞行时它不动，留在牌位的层里
    const shLive = deep && (L > 0.001 || Math.abs(c.ty) > 0.05 || c.mode !== 'fan')
    if (shLive !== c._shLive) { c._shLive = shLive; c.shadow.classList.toggle(PX + 'live', shLive) }
    const sh = `translate(${(deep ? -c.ty * 0.6 : 0).toFixed(1)}px, ${(10 + L * 28).toFixed(1)}px) scale(${(1 + L * 0.05).toFixed(3)})`
    if (sh !== c._sh) { c.shadow.style.transform = sh; c._sh = sh }
    const sho = (0.55 - L * 0.12).toFixed(3)
    if (sho !== c._sho) { c.shadow.style.opacity = sho; c._sho = sho }
    // 暗化：整张牌的 brightness 滤镜（与原先压在牌面上、opacity = d 的近黑色层等价）。
    // 滤镜加在已经是合成层的牌位上，数值变化由合成器直接套用，牌面不重画，也不多出图层
    const d = c.dim > 0.0005 ? `brightness(${(1 - c.dim).toFixed(3)})` : ''
    if (d !== c._d) { c.slot.style.filter = d; c._d = d }
    // 箔光只亮在朝向观者的那一面
    const thr = c.front.lit || c.back.lit ? 0.012 : 0.02
    const lit = S.q > 0 && c.foil > thr
    // 箔光亮着时，牌面做成一个小小的 3D 场景的叶子（自成渲染面）：箔光只与这一面混合，
    // 牌面圆角对箔光的裁切也在这一面自己的坐标里，牌位每帧微转时浏览器不必逐帧重画裁切遮罩
    // （类名带板块前缀：别的板块的 CSS 里有 .is-lit path 之类的写法，同名类一切换，浏览器会把牌里所有 path / circle 都重算一遍）
    if (lit !== c._lit) { c._lit = lit; c.card.classList.toggle(PX + 'lit', lit) }
    for (const f of [c.front, c.back]) {
      const on = lit && f === vis
      if (on !== f.lit) { f.lit = on; f.sheen.classList.toggle(PX + 'on', on); f.glare.classList.toggle(PX + 'on', on); f._st = f._so = f._gt = f._go = '' }
    }
    if (lit) renderFoil(c, vis)
  }

  // 金箔反光（与原先 260%、118° 渐变按 --fx/--fy 移动 background-position 的效果等价）：
  // 反光带沿渐变方向平移 s；高光光斑移到 (fx, fy)，半径 = 48% × 到最远角的距离
  function renderFoil(c, f) {
    const W = S.W, H = S.H, fx = c.fx, fy = c.fy
    const s = 0.8 * W * (1 - 2 * fx) * SDX + 0.8 * H * (1 - 2 * fy) * SDY - 0.026 * (W * SDX + H * SDY)
    const st = `rotate(28deg) translate3d(${s.toFixed(1)}px,0,0)`
    if (st !== f._st) { f.sheen.style.transform = st; f._st = st }
    const k = 0.48 * Math.hypot(Math.max(fx, 1 - fx) * W, Math.max(fy, 1 - fy) * H) / (GLARE_R * S.mm)
    const gt = `translate3d(${((fx - 0.5) * W).toFixed(1)}px,${((fy - 0.5) * H).toFixed(1)}px,0) scale(${k.toFixed(3)})`
    if (gt !== f._gt) { f.glare.style.transform = gt; f._gt = gt }
    const so = (c.foil * (f.neg ? 0.7 : 1)).toFixed(3)
    if (so !== f._so) { f.sheen.style.opacity = so; f._so = so }
    const go = (c.foil * (f.neg ? 0.4 : 1)).toFixed(3)
    if (go !== f._go) { f.glare.style.opacity = go; f._go = go }
  }

  function updateTable(mx, my, inStage) {
    if (S.mode !== 'desk' || !S.tableMarks) return
    const g = S.geo
    const rot = (S.psi / DEG) * 1
    const t = `rotate(${rot.toFixed(3)}deg)`
    if (t !== S._tm) { S.tableRot.style.transform = t; S._tm = t }
    const follow = inStage && S.q > 0
    const lx = (follow ? mx : S.vw / 2) - (g.cx - g.rt)
    const ly = (follow ? my : g.apexY) - (g.cy - g.rt)
    const lt = `translate3d(${lx.toFixed(0)}px,${ly.toFixed(0)}px,0)`
    if (lt !== S._lt) { S.tableSpot.style.transform = lt; S._lt = lt }
  }
  function updateBgword(mx, my, inStage) {
    const bx = inStage ? (mx / S.vw - 0.5) * -26 : 0
    const by = inStage ? (my / S.vh - 0.5) * -16 : 0
    S._bx = U.lerp(S._bx || 0, bx, 0.06)
    S._by = U.lerp(S._by || 0, by, 0.06)
    const t = `translate(${S._bx.toFixed(1)}px, calc(-50% + ${S._by.toFixed(1)}px))`
    if (t !== S._bt) { S.bgword.style.transform = t; S._bt = t }
  }

  // 牌在光标下停久了，会在一瞬间露出它的另一面（两帧的硬切 + 色差），然后若无其事地回来
  function peek(c) {
    if (c.flipTw || c.mode !== 'fan') return
    const same = !!c.def.noReverse
    c.peek = 1
    if (!same && S.q >= 2) App.glitch(c.glitch, 0.16)
    App.audio.sfx(same ? 'heartbeat' : 'glitch', { volume: same ? 0.35 : 0.3, pitch: same ? 1.3 : 0.8 })
    const fl = !same && !S.rev
    if (fl) bgFlick('逆')
    setTimeout(() => {
      c.peek = 0
      if (fl) bgFlick(null)
    }, same ? 160 : 110)
  }

  // 巨字一瞬间闪成亮色的「逆」/「正」；which 为空时回到原样，亮色的「正」在 1 秒里淡回原来的颜色
  function bgFlick(which) {
    const [fr, fp] = S.bgFlash
    if (S._bgFade) { S._bgFade.cancel(); S._bgFade = null }
    S.bgwordT.style.opacity = which ? '0' : ''
    fr.style.opacity = which === '逆' ? '1' : '0'
    fp.style.opacity = which === '正' ? '1' : '0'
    if (!which && fp.animate) S._bgFade = fp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(.16, 1, .3, 1)' })
  }

  /* =====================================================================
     发牌：一张张飞入（牌背朝上，字尚未确定）→ 依次翻成正面，墨迹浮出
     ===================================================================== */
  function deal() {
    if (S.dealt) return
    S.dealt = true
    S.busy = true
    const tl = gsap.timeline({
      onComplete: () => {
        for (const c of S.cards) { c.flip = 0; inkIn(c.back, true) }
        S.busy = false
        S.ready = true
        S.cards.forEach(c => c.slot.setAttribute('tabindex', '0'))
      },
    })
    S.dealTl = tl
    const step = RM ? 0.04 : 0.12
    S.cards.forEach((c, i) => {
      const from = deckPose(c)
      Object.assign(c.cur, from)
      c.flip = 180
      c.slot.classList.add('is-dealt')
      c.mode = 'fly'
      c.fly = { from, to: 'fan', k: 0, arc: RM ? 0 : U.rand(40, 90), spin: U.rand(-14, 14), pop: 0.12, tilt: RM ? 0 : -24, deal: true }
      tl.to(c.fly, {
        k: 1, duration: RM ? 0.5 : 0.82, ease: 'power3.out',
        onStart: () => {
          const T = fanTarget(c)
          App.audio.sfx('card', { pan: U.clamp((T.x / S.vw - 0.5) * 1.5, -1, 1), pitch: U.rand(0.9, 1.12), volume: 0.85 })
        },
        onComplete: () => { c.mode = 'fan'; c.swing = 0; dust(c) },
      }, i * step)
    })
    // 翻面的浪：音高逐张升高
    const t0 = (N - 1) * step + (RM ? 0.5 : 0.82) + 0.22
    S.cards.forEach((c, i) => {
      const o = { p: 0 }
      tl.to(o, {
        p: 1, duration: RM ? 0.3 : 0.64, ease: 'power2.inOut',
        onStart: () => App.audio.sfx('flip', { pan: U.clamp((c.cur.x / S.vw - 0.5) * 1.5, -1, 1), pitch: 0.82 + i * 0.026, volume: 0.42 }),
        onUpdate: () => {
          c.flip = 180 + 180 * o.p
          c.flipLift = Math.sin(Math.PI * o.p)
          if (o.p >= 0.5 && !c.front.inked) inkIn(c.front)
        },
        onComplete: () => { c.flip = 0; c.flipLift = 0 },
      }, t0 + i * (RM ? 0.05 : 0.115))
    })
  }

  // 卡面的字从空白里浮出
  function inkIn(f, instant) {
    if (f.inked) return
    f.inked = true
    if (instant) { f.el.classList.add('is-instant'); f.el.classList.remove('is-blank'); requestAnimationFrame(() => f.el.classList.remove('is-instant')); return }
    drawSigil(f.sig, RM ? 0.4 : 1.25)
    f.el.classList.remove('is-blank')
    if (!RM) App.text.scramble(f.nameT, f.nameT.textContent, { duration: 0.75, chars: '█▓▒░' })
  }

  /* ---------- 纹章：先画外框，再一笔笔画出图形 ---------- */
  function prepSigil(wrap) {
    const svg = wrap.querySelector('svg')
    if (!svg) return null
    const strokes = [], fills = []
    svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon').forEach(n => {
      if (n.closest('mask, defs, clipPath')) return
      const cs = getComputedStyle(n)
      const filled = cs.fill && cs.fill !== 'none'
      const stroked = cs.stroke && cs.stroke !== 'none'
      const dashed = cs.strokeDasharray && cs.strokeDasharray !== 'none'
      if (stroked && !filled && !dashed && n.getTotalLength) {
        let len = 0
        try { len = n.getTotalLength() } catch (e) { len = 0 }
        if (len > 0.5) { n._len = len; strokes.push(n); return }
      }
      fills.push(n)
    })
    return { strokes, fills }
  }
  function drawSigil(wrap, dur, delay = 0) {
    const P = wrap._prep || (wrap._prep = prepSigil(wrap))
    if (!P) return
    const n = P.strokes.length
    const span = dur * 0.55
    P.strokes.forEach(s => { s.style.strokeDasharray = `${s._len} ${s._len + 4}`; s.style.strokeDashoffset = s._len + 2; s.style.opacity = '0' })
    P.fills.forEach(s => { s.style.opacity = '0' })
    // 画的过程中纹章逐帧变化：让它暂时自成一个小图层，只重画纹章这一小块，不重画整面牌
    wrap.classList.add(PX + 'drawing')
    const o = { t: 0 }
    gsap.to(o, {
      t: 1, duration: dur, delay, ease: 'none',
      onUpdate: () => {
        const T = o.t * dur
        P.strokes.forEach((s, j) => {
          const st = (j / Math.max(1, n - 1)) * span
          const k = U.clamp((T - st) / (dur - span))
          const e = 1 - Math.pow(1 - k, 2.2)
          s.style.strokeDashoffset = ((s._len + 2) * (1 - e)).toFixed(2)
          s.style.opacity = k > 0 ? '1' : '0'
        })
        const fk = U.clamp((o.t - 0.45) / 0.5)
        P.fills.forEach((s, j) => { s.style.opacity = U.clamp(fk * 1.6 - (j / Math.max(1, P.fills.length)) * 0.6).toFixed(3) })
      },
      onComplete: () => {
        P.strokes.forEach(s => { s.style.strokeDasharray = ''; s.style.strokeDashoffset = ''; s.style.opacity = '' })
        P.fills.forEach(s => { s.style.opacity = '' })
        wrap.classList.remove(PX + 'drawing')
      },
    })
  }

  /* =====================================================================
     拿起 / 放回 / 换牌 / 翻面
     ===================================================================== */
  function flyTo(c, to, opts = {}) {
    if (c.flyTw) c.flyTw.kill()
    const from = { x: c.cur.x, y: c.cur.y, r: c.cur.r, s: c.cur.s }
    c.mode = 'fly'
    c.fly = { from, to, k: 0, arc: opts.arc || 0, spin: opts.spin || 0, pop: opts.pop || 0, tilt: opts.tilt || 0 }
    c.flyTw = gsap.to(c.fly, {
      k: 1, duration: opts.duration || 0.8, ease: opts.ease || 'expo.out',
      onComplete: () => { c.mode = to; c.swing = 0; c.flyTw = null; if (opts.done) opts.done() },
    })
  }

  function openFocus(i, nav) {
    if (!S.ready || (S.busy && !nav)) return
    const c = S.cards[i]
    if (!c || S.burning) return
    S.focus = i
    S.openAt = performance.now()
    S.wheelArmed = false
    S.kb = -1
    setHover(-1)
    releaseCursor()
    c.slot.classList.add('is-focus')
    c.slot.setAttribute('data-cursor', '')
    if (needsRead(c)) setRead(c, true)
    S.stage.classList.add('is-focus')
    S.hit.setAttribute('data-cursor', '放回')
    updateCardCursor(c)
    updateUI()
    refreshCursor()
    flyTo(c, 'focus', { duration: RM ? 0.45 : 0.95, ease: 'expo.out', tilt: RM ? 0 : -16, pop: 0, arc: 0 })
    App.audio.sfx('whoosh', { pan: U.clamp((c.cur.x / S.vw - 0.5) * 1.4, -1, 1), pitch: 1.05, volume: 0.8 })
    if (!nav) {
      gsap.to(S.fa, { v: 1, duration: 0.8, ease: 'power2.out' })
      if (App.scroll && App.scroll.stop) App.scroll.stop()
      if (S.mode === 'mob') alignMobile()
    }
    S.wheel = 0
    syncAria()
  }

  function closeFocus(instant, nav) {
    if (S.focus == null) return
    const c = S.cards[S.focus]
    cancelHold(true)
    S.lastFocus = c.i
    S.focus = null
    S.cardHover = false
    c.slot.classList.remove('is-focus')
    c.slot.removeAttribute('data-cursor')
    c.slot.removeAttribute('data-cursor-tone')
    // 放回时翻回正面（T0 时牌是正面朝上的）
    if (c.flipTw) { c.flipTw.kill(); c.flipTw = null }
    const m = mod360(c.flip)
    if (m > 0.5 && m < 359.5) {
      const f0 = c.flip
      const goal = f0 + (m <= 180 ? -m : 360 - m)
      if (instant) { c.flip = 0; c.flipLift = 0 }
      else {
        const o = { p: 0 }
        c.flipTw = gsap.to(o, {
          p: 1, duration: 0.7, ease: 'power2.inOut',
          onUpdate: () => { c.flip = U.lerp(f0, goal, o.p); c.flipLift = Math.sin(Math.PI * o.p) },
          onComplete: () => { c.flip = 0; c.flipLift = 0; c.flipTw = null },
        })
        App.audio.sfx('flip', { pitch: 0.9, volume: 0.5 })
      }
    } else { c.flip = 0; c.flipLift = 0 }
    if (instant) {
      if (c.flyTw) { c.flyTw.kill(); c.flyTw = null }
      c.mode = 'fan'; c.swing = 0
      setRead(c, false, true)
    } else {
      flyTo(c, 'fan', {
        duration: RM ? 0.45 : 0.85, ease: 'power3.inOut', tilt: RM ? 0 : 12,
        done: () => App.audio.sfx('card', { pan: U.clamp((c.cur.x / S.vw - 0.5) * 1.4, -1, 1), pitch: 0.95, volume: 0.6 }),
      })
      setRead(c, false)
      if (!nav) App.audio.sfx('whoosh', { pitch: 0.78, volume: 0.55 })
    }
    if (!nav) {
      S.stage.classList.remove('is-focus')
      S.hit.removeAttribute('data-cursor')
      gsap.killTweensOf(S.fa)
      if (instant) S.fa.v = 0
      else gsap.to(S.fa, { v: 0, duration: 0.7, ease: 'power2.inOut' })
      if (App.scroll && App.scroll.start) App.scroll.start()
      setRev(false)
      if (S.cursorForcedCard && App.cursor && App.cursor.clear) App.cursor.clear()
      S.cursorForcedCard = false
      refreshCursor()
    }
    syncAria()
  }

  function navTo(j) {
    if (S.focus == null || S.burning) return
    if (j === S.focus) return
    closeFocus(false, true)
    if (S.rev) setRev(false)
    openFocus(j, true)
    App.audio.sfx('whoosh', { pitch: 1.2, volume: 0.55 })
  }

  // 光标标签只在 pointerover 时更新：属性变了之后补发一次，让它重新读取
  function refreshCursor() {
    if (!App.finePointer || !App.cursor || !App.cursor.clear) return
    const m = App.mouse
    const t = document.elementFromPoint(m.x, m.y)
    if (t) t.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: m.x, clientY: m.y }))
    App.cursor.clear()
  }
  function nav(dir) {
    if (S.focus == null) return
    navTo((S.focus + dir + N) % N)
  }

  function flipFocus(dirHint) {
    if (S.focus == null || S.burning) return
    const c = S.cards[S.focus]
    if (c.flipTw) return
    const dir = dirHint || 1
    const f0 = c.flip
    const goal = f0 + 180 * dir
    const noRev = !!c.def.noReverse
    const o = { p: 0 }
    let mid = false
    App.audio.sfx('flip', { pitch: noRev ? 0.72 : 1, volume: 0.9 })
    c.flipTw = gsap.to(o, {
      p: 1, duration: RM ? 0.4 : 0.86, ease: 'power3.inOut',
      onUpdate: () => {
        c.flip = U.lerp(f0, goal, o.p)
        c.flipLift = Math.sin(Math.PI * o.p)
        if (!mid && o.p >= 0.5) {
          mid = true
          if (!noRev) {
            if (S.q > 0) App.glitch(c.glitch, 0.42)
            else App.audio.sfx('glitch')
            setRev(isBackAngle(goal))
          }
        }
      },
      onComplete: () => {
        c.flipLift = 0
        c.flip = mod360(goal) < 1 || mod360(goal) > 359 ? 0 : 180
        c.flipTw = null
        if (noRev) sameSide(c)
        updateCardCursor(c)
        updateUI()
      },
    })
  }
  const isBackAngle = a => Math.abs(mod360(a) - 180) < 1

  // 逆位：背景烟雾转为血红，巨字「逆」
  function setRev(on) {
    if (S.rev === on) return
    S.rev = on
    S.stage.classList.toggle('is-rev', on)
    S.bgwordT.textContent = on ? '逆' : '正'
    if (App.state.section === 'identities' || on) {
      App.bg.setPalette(on ? PAL.rev : PAL.base, on ? 0.9 : 1.4)
      if (on) { App.bg.pulse(0.9, 1.4); App.flash(App.color.blood, { opacity: 0.08, duration: 0.5 }) }
    }
    App.audio.setMood({ tension: on ? 0.45 : 0.12 })
  }

  // 丘比特 / 圣女：没有另一面。翻过去还是同样的字
  function sameSide(c) {
    const face = faceOf(c)
    // 巨字：一瞬间闪成「逆」，又回到「正」
    bgFlick('逆')
    setTimeout(() => bgFlick('正'), 70)
    setTimeout(() => bgFlick('逆'), 150)
    setTimeout(() => bgFlick(null), 210)
    // 回声：牌的轮廓一圈圈荡开
    for (let k = 0; k < 2; k++) {
      const g = el('div.echo')
      c.glitch.appendChild(g)
      gsap.fromTo(g, { opacity: 0.7, scale: 1 }, { opacity: 0, scale: 1.16 + k * 0.08, duration: 1.3, delay: 0.12 + k * 0.32, ease: 'power2.out', onComplete: () => g.remove() })
    }
    App.bg.pulse(0.28, 1.6)
    const glyph = face.sig.querySelector('.sg-glyph')
    if (c.def.front === '丘比特') {
      App.audio.sfx('heartbeat', { delay: 0.2, volume: 0.9 })
      if (glyph) {
        gsap.timeline({ delay: 0.21 })
          .to(glyph, { scale: 1.1, duration: 0.07, ease: 'power2.out', svgOrigin: '100 100' })
          .to(glyph, { scale: 1, duration: 0.16, ease: 'power2.in' })
          .to(glyph, { scale: 1.06, duration: 0.07, ease: 'power2.out' }, 0.24)
          .to(glyph, { scale: 1, duration: 0.3, ease: 'power2.in' })
      }
    } else {
      App.audio.sfx('chime', { delay: 0.15, pitch: 2, volume: 0.35 })
      face.sig.classList.add('is-halo')
      setTimeout(() => face.sig.classList.remove('is-halo'), 1300)
    }
  }

  // 细读版式的切换：字先淡出，换版，再淡入（避免逐帧重排时字跳动）
  function setRead(c, on, instant) {
    if (!!c._read === on) return
    c._read = on
    const els = []
    for (const f of [c.front, c.back]) els.push(f.text, f.nameEl, f.div, f.sig, f.oath)
    const list = els.filter(Boolean)
    gsap.killTweensOf(list, 'opacity')
    if (instant || RM) { c.slot.classList.toggle('is-read', on); gsap.set(list, { clearProps: 'opacity' }); return }
    gsap.to(list, {
      opacity: 0, duration: 0.14, ease: 'power1.in',
      onComplete: () => {
        c.slot.classList.toggle('is-read', on)
        gsap.to(list, { opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.06, clearProps: 'opacity' })
      },
    })
  }

  function updateCardCursor(c) {
    if (S.focus !== c.i) return
    const saint = c.def.front === '圣女' && !c.burned
    const label = saint ? '按住' : '翻面'
    const tone = isBack(c) && !c.def.noReverse ? 'blood' : null
    const changed = c.slot.getAttribute('data-cursor') !== label || c.slot.getAttribute('data-cursor-tone') !== tone
    c.slot.setAttribute('data-cursor', label)
    if (tone) c.slot.setAttribute('data-cursor-tone', tone)
    else c.slot.removeAttribute('data-cursor-tone')
    if (changed && S.cardHover) refreshCursor()
  }

  function updateUI() {
    const i = S.focus
    if (i == null) return
    const c = S.cards[i]
    const p = S.cards[(i - 1 + N) % N], n = S.cards[(i + 1) % N]
    S.prev.querySelector('.' + PX + 'nav-num').textContent = U.roman(p.def.no)
    S.next.querySelector('.' + PX + 'nav-num').textContent = U.roman(n.def.no)
    S.prev.setAttribute('data-cursor', U.roman(p.def.no))
    S.next.setAttribute('data-cursor', U.roman(n.def.no))
    S.tickEls.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.classList.toggle('is-rev', k === i && isBack(c) && !c.def.noReverse) })
    S.flipBtn.classList.toggle('is-rev', isBack(c) && !c.def.noReverse)
  }

  function syncAria() {
    for (const c of S.cards) {
      const on = S.focus === c.i
      const vis = on ? faceOf(c) : null
      c.front.el.setAttribute('aria-hidden', vis === c.front ? 'false' : 'true')
      c.back.el.setAttribute('aria-hidden', vis === c.back ? 'false' : 'true')
    }
  }

  // 手机：拿起时把板块对齐到视口
  function alignMobile() {
    const r = S.el.getBoundingClientRect()
    if (Math.abs(r.top) < 2) return
    const y = window.scrollY + r.top
    if (App.scroll && App.scroll.lenis) App.scroll.lenis.scrollTo(y, { duration: 0.55, force: true })
    else window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' })
  }

  /* =====================================================================
     圣女：按住 1.2 秒 → 「圣女」二字被火烧穿，烧出「贞德」
     ===================================================================== */
  function startHold(c, x, y, key) {
    if (S.hold || S.burning || c.burned) return
    S.hold = { c, t0: performance.now(), x, y, key, ticks: 0, done: false }
    S.ring.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    S.ring.classList.add('is-on')
    gsap.killTweensOf(c, 'heat')
  }
  function updateHold() {
    const h = S.hold
    if (!h || h.done) return
    const p = U.clamp((performance.now() - h.t0) / HOLD_MS)
    h.p = p
    S.ringP.style.strokeDashoffset = (188.5 * (1 - p)).toFixed(2)
    setHeat(h.c, p)
    const tk = Math.floor(p * 4)
    if (tk > h.ticks && p < 1) { h.ticks = tk; App.audio.sfx('tick', { pitch: 1 + tk * 0.12, volume: 0.5 }) }
    if (Math.random() < p * 0.9) emberAt(faceOf(h.c), 1)
    if (p >= 1) { h.done = true; ignite(h.c) }
  }
  function endHold(click) {
    const h = S.hold
    if (!h) return false
    const short = performance.now() - h.t0 < 260
    if (h.done) return true
    cancelHold()
    if (click && short) return 'click'
    return true
  }
  function cancelHold(silent) {
    const h = S.hold
    if (!h) return
    S.hold = null
    S.ring.classList.remove('is-on')
    if (!h.done) {
      const c = h.c
      const o = { v: c.heat }
      gsap.to(o, { v: 0, duration: silent ? 0 : 0.4, ease: 'power2.out', onUpdate: () => setHeat(c, o.v) })
    }
  }
  function setHeat(c, v) {
    c.heat = v
    for (const f of [c.front, c.back]) {
      if (c.burned) continue
      f.nameEl.style.setProperty('--heat', v.toFixed(3))
      f.sig.style.setProperty('--heat', v.toFixed(3))
    }
  }

  function ignite(c) {
    S.burning = true
    S.ring.classList.remove('is-on')
    S.ring.classList.add('is-burst')
    setTimeout(() => S.ring.classList.remove('is-burst'), 700)
    S.hold = null
    const face = faceOf(c)
    const other = face === c.front ? c.back : c.front
    // 声音：点燃、火势、钟
    App.audio.sfx('whoosh', { pitch: 0.62, volume: 1 })
    App.audio.sfx('wind', { pitch: 1.35, volume: 0.7 })
    App.audio.sfx('bell', { delay: 1.15, pitch: 0.9, volume: 0.55 })
    App.bg.setPalette(PAL.fire, 0.5)
    App.bg.pulse(0.7, 1.8)
    App.flash('#ff7a2c', { opacity: 0.16, duration: 0.9 })
    App.audio.setMood({ tension: 0.5 })
    burnName(c, face).then(() => {
      // 两面都已是贞德
      for (const f of [c.front, c.back]) {
        f.nameT.textContent = '贞德'
        f.name = '贞德'
        setNameSize(f.nameEl, '贞德')
        f.el.classList.add('is-joan')
        f.nameEl.style.removeProperty('--heat')
      }
      c.name = '贞德'
      c.burned = true
      c.heat = 0
      c.slot.setAttribute('aria-label', U.roman(c.def.no) + ' 贞德')
      S.tickEls[c.i].setAttribute('aria-label', U.roman(c.def.no) + ' 贞德')
      S.burning = false
      if (App.state.section === 'identities') App.bg.setPalette(S.rev ? PAL.rev : PAL.base, 2.2)
      App.audio.setMood({ tension: 0.15 })
      updateCardCursor(c)
    })
    swapSigil(c, face, other)
  }

  // 纹章：圣女的纹章烧红、化灰，贞德的纹章从余烬里画出
  function swapSigil(c, face, other) {
    const old = face.sig.querySelector('.sigil')
    face.sig.classList.add('is-ember')
    gsap.to(old, { opacity: 0, y: -S.mm * 2.2, filter: 'blur(3px)', duration: 0.7, delay: 0.35, ease: 'power2.in' })
    for (let k = 0; k < 26; k++) setTimeout(() => emberAt(face, 2, face.sig), 300 + k * 26)
    setTimeout(() => {
      for (const f of [face, other]) {
        const ns = App.sigil('贞德')
        f.sig.innerHTML = ''
        f.sig.appendChild(ns)
        f.sig._prep = null
      }
      face.sig.classList.add('is-ember')
      drawSigil(face.sig, 1.2)
      setTimeout(() => face.sig.classList.remove('is-ember'), 1500)
      face.sig.style.removeProperty('--heat')
      other.sig.style.removeProperty('--heat')
    }, 1000)
  }

  function burnName(c, face) {
    return new Promise(resolve => {
      const host = face.el
      const nameEl = face.nameEl
      const mm = S.mm
      // 画布覆盖名字所在的一条（左右留出边框）
      const top = nameEl.offsetTop - mm * 3.2
      const h = nameEl.offsetHeight + mm * 6.4
      const left = mm * 6.2
      const w = host.offsetWidth - mm * 12.4
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      const cw = Math.max(8, Math.round(w * dpr)), ch = Math.max(8, Math.round(h * dpr))
      const mk = cls => { const cv = el('canvas.' + cls); cv.width = cw; cv.height = ch; Object.assign(cv.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px' }); host.appendChild(cv); return cv }
      const base = mk('burn')
      const glow = mk('burn-glow')
      const bx = base.getContext('2d'), gx = glow.getContext('2d')
      // 两个字形的遮罩
      const cs = getComputedStyle(face.nameT)
      const fontPx = parseFloat(cs.fontSize) || mm * 5.6
      const ls = parseFloat(cs.letterSpacing) || 0
      const fam = cs.fontFamily
      const nameMid = nameEl.offsetTop + nameEl.offsetHeight / 2 - top
      const glyphs = text => {
        const cv = document.createElement('canvas')
        cv.width = cw; cv.height = ch
        const x = cv.getContext('2d')
        x.scale(dpr, dpr)
        x.font = `900 ${fontPx}px ${fam}`
        x.textBaseline = 'middle'
        x.fillStyle = '#000'
        const chars = Array.from(text)
        const ws = chars.map(t => x.measureText(t).width)
        const tot = ws.reduce((a, b) => a + b, 0) + ls * (chars.length - 1)
        let px = (w - tot) / 2
        chars.forEach((t, k) => { x.fillText(t, px, nameMid + fontPx * 0.02); px += ws[k] + ls })
        return x.getImageData(0, 0, cw, ch).data
      }
      const A = glyphs(face.nameT.textContent || '圣女')
      const B = glyphs('贞德')
      // 噪声 + 由中心向外
      const field = new Float32Array(cw * ch)
      const seed = U.seeded(Math.floor(Math.random() * 1e9))
      const G = 9, gw = Math.ceil(cw / (ch / G)) + 2
      const grid = []
      for (let k = 0; k < (G + 2) * gw; k++) grid.push(seed())
      const vn = (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
        const a = grid[(yi % (G + 2)) * gw + (xi % gw)], b = grid[(yi % (G + 2)) * gw + ((xi + 1) % gw)]
        const c2 = grid[((yi + 1) % (G + 2)) * gw + (xi % gw)], d = grid[((yi + 1) % (G + 2)) * gw + ((xi + 1) % gw)]
        const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
        return a + (b - a) * u + (c2 - a) * v * (1 - u) + (d - b) * u * v
      }
      const cell = ch / G
      const ox = cw / 2, oy = ch * 0.6
      const maxD = Math.hypot(cw / 2, ch)
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const n1 = vn(x / cell, y / cell), n2 = vn(x / cell * 2.3 + 3.1, y / cell * 2.3 + 1.7)
        const dd = Math.hypot((x - ox) * 0.55, (y - oy) * 1.2) / maxD
        field[y * cw + x] = (n1 * 0.62 + n2 * 0.38) * 0.5 + dd * 0.62
      }
      let fmin = Infinity, fmax = -Infinity
      for (let k = 0; k < field.length; k++) { if (field[k] < fmin) fmin = field[k]; if (field[k] > fmax) fmax = field[k] }
      for (let k = 0; k < field.length; k++) field[k] = (field[k] - fmin) / (fmax - fmin)
      const env = new Float32Array(cw * ch)
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const ex = Math.min(x / (cw * 0.16), (cw - x) / (cw * 0.16), 1)
        const ey = Math.min(y / (ch * 0.3), (ch - y) / (ch * 0.3), 1)
        env[y * cw + x] = U.clamp(ex) * U.clamp(ey)
      }
      const imgB = bx.createImageData(cw, ch), imgG = gx.createImageData(cw, ch)
      const db = imgB.data, dg = imgG.data
      const band = 0.075
      const st = { front: -0.08, heal: 0, cool: 0 }
      const rect = () => base.getBoundingClientRect()
      const draw = () => {
        const fr = st.front, heal = st.heal, cool = st.cool
        for (let k = 0, q = 0; k < field.length; k++, q += 4) {
          const d = field[k] - fr
          const e = env[k]
          const ta = A[q + 3] / 255, tb = B[q + 3] / 255
          let r = 0, g = 0, b = 0, a = 0, gr = 0, gg = 0, gb = 0, ga = 0
          if (d > band) {
            // 未燃：圣女二字（烧红的墨）+ 火线前的焦痕
            const pre = 1 - smooth(band, band + 0.2, d)
            const sc = pre * 0.42 * e
            r = 70; g = 32; b = 12; a = sc
            if (ta > 0) {
              const hot = 0.55 + pre * 0.45
              const tr = U.lerp(36, 255, hot), tg = U.lerp(26, 112, hot), tbb = U.lerp(28, 40, hot)
              r = tr * ta + r * (1 - ta); g = tg * ta + g * (1 - ta); b = tbb * ta + b * (1 - ta); a = ta + a * (1 - ta)
            }
          } else if (d > 0) {
            // 火线
            const z = d / band
            const ga0 = (1 - Math.abs(z - 0.45) * 1.3) * e
            r = 255; g = U.lerp(236, 120, z); b = U.lerp(170, 30, z); a = U.clamp(0.25 + ga0) * Math.max(e, ta)
            gr = 255; gg = U.lerp(200, 90, z); gb = 40; ga = U.clamp(ga0 * 1.2)
          } else {
            // 已燃：焦黑（随后愈合）+ 贞德二字
            const depth = -d
            const char = (0.82 - smooth(0, 0.35, depth) * 0.22) * e * (1 - heal)
            r = 38; g = 17; b = 8; a = char
            const ember = (1 - smooth(0, 0.18, depth)) * e * (1 - heal)
            if (ember > 0.01) { gr = 255; gg = 110; gb = 30; ga = ember * 0.7 }
            if (tb > 0) {
              const k2 = Math.min(1, cool + smooth(0, 0.5, depth) * 0.6)
              const tr = U.lerp(255, 125, k2), tg = U.lerp(150, 22, k2), tbb = U.lerp(60, 22, k2)
              r = tr * tb + r * (1 - tb); g = tg * tb + g * (1 - tb); b = tbb * tb + b * (1 - tb); a = tb + a * (1 - tb)
              const gl = (1 - k2) * tb * 0.8
              if (gl > ga) { gr = 255; gg = 120; gb = 40; ga = gl }
            }
          }
          db[q] = r; db[q + 1] = g; db[q + 2] = b; db[q + 3] = a * 255
          dg[q] = gr; dg[q + 1] = gg; dg[q + 2] = gb; dg[q + 3] = ga * 255
        }
        bx.putImageData(imgB, 0, 0)
        gx.putImageData(imgG, 0, 0)
        // 火星：从火线上随机取点
        if (fr > -0.05 && fr < 1.05) {
          const R = rect()
          for (let s = 0; s < 14; s++) {
            const k = (Math.random() * field.length) | 0
            const d = field[k] - fr
            if (d > 0 && d < band && env[k] > 0.2) {
              const px = k % cw, py = (k / cw) | 0
              spark(R.left - S.rect.left + (px / cw) * R.width, R.top - S.rect.top + (py / ch) * R.height)
            }
          }
        }
      }
      draw()
      face.el.classList.add('is-burning')
      S.rect = S.stage.getBoundingClientRect()
      const tl = gsap.timeline({ onComplete: () => {
        gsap.to([base, glow], { opacity: 0, duration: 0.45, onComplete: () => { base.remove(); glow.remove() } })
        face.el.classList.remove('is-burning')
        resolve()
      } })
      tl.to(st, { front: 1.12, duration: RM ? 1 : 1.75, ease: 'power1.in', onUpdate: () => { S.rect = S.stage.getBoundingClientRect(); draw() } })
        .to(st, { heal: 1, cool: 1, duration: 1.1, ease: 'power2.inOut', onUpdate: draw })
        .add(() => {
          // 换成 DOM 文字（与画布同色），画布淡出
          face.nameT.textContent = '贞德'
          setNameSize(face.nameEl, '贞德')
          face.el.classList.add('is-joan')
        })
    })
  }

  /* =====================================================================
     粒子：火星、灰、灰尘
     ===================================================================== */
  const parts = []
  function spark(x, y) {
    if (parts.length > 420) return
    parts.push({ k: 'spark', x, y, vx: U.rand(-0.6, 0.6), vy: U.rand(-2.6, -0.8), life: 0, max: U.rand(36, 80), r: U.rand(0.8, 2.1) })
    if (Math.random() < 0.18) parts.push({ k: 'ash', x, y, vx: U.rand(-0.4, 0.4), vy: U.rand(-1.1, -0.35), life: 0, max: U.rand(70, 130), r: U.rand(1.2, 2.6), a: U.rand(0, 6) })
  }
  function emberAt(face, n, node) {
    const target = node || face.nameEl
    const R = target.getBoundingClientRect(), SR = S.stage.getBoundingClientRect()
    for (let k = 0; k < n; k++) spark(R.left - SR.left + U.rand(0.15, 0.85) * R.width, R.top - SR.top + U.rand(0.3, 0.8) * R.height)
  }
  function dust(c) {
    if (RM || S.q === 0 || parts.length > 300) return
    const p = c.cur
    const hw = S.W * p.s * 0.5, hh = S.H * p.s * 0.5
    const a = p.r * DEG
    for (let k = 0; k < 9; k++) {
      const sx = U.rand(-1, 1) * hw, sy = hh * (Math.random() < 0.5 ? 1 : -1) * U.rand(0.7, 1)
      const x = p.x + sx * Math.cos(a) - sy * Math.sin(a)
      const y = p.y + sx * Math.sin(a) + sy * Math.cos(a)
      parts.push({ k: 'dust', x, y, vx: (x - p.x) * 0.012 + U.rand(-0.3, 0.3), vy: (y - p.y) * 0.01 + U.rand(-0.3, 0.1), life: 0, max: U.rand(40, 70), r: U.rand(6, 14) })
    }
  }
  // 灰尘的柔光点：中心 rgba(214,200,180,1) 线性淡到边缘全透明（乘上 globalAlpha 即原先的渐变）
  let dustImg = null
  function dustSprite() {
    if (dustImg) return dustImg
    const n = 128, c = document.createElement('canvas')
    c.width = c.height = n
    const x = c.getContext('2d')
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
    g.addColorStop(0, 'rgba(214,200,180,1)')
    g.addColorStop(1, 'rgba(214,200,180,0)')
    x.fillStyle = g
    x.fillRect(0, 0, n, n)
    return (dustImg = c)
  }
  function fxTick(dt) {
    const x = S.ctx
    // 没有粒子时画布清空并整块隐藏：一张全屏的透明画布也是一个要合成的全屏图层
    if (!parts.length) {
      if (S.fxDirty) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S.fx.width, S.fx.height); S.fxDirty = false }
      if (S.fxOn) { S.fxOn = false; S.fx.classList.remove('is-on') }
      return
    }
    if (!S.fxOn) { S.fxOn = true; S.fx.classList.add('is-on') }
    S.fxDirty = true
    x.setTransform(1, 0, 0, 1, 0, 0)
    x.clearRect(0, 0, S.fx.width, S.fx.height)
    x.setTransform(S.fxDpr, 0, 0, S.fxDpr, 0, 0)
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.life += dt
      const t = p.life / p.max
      if (t >= 1) { parts.splice(i, 1); continue }
      if (p.k === 'spark') {
        p.vx += U.rand(-0.08, 0.08) * dt; p.vy -= 0.012 * dt
        p.x += p.vx * dt; p.y += p.vy * dt
        x.globalCompositeOperation = 'lighter'
        const g = Math.floor(U.lerp(230, 70, t)), b = Math.floor(U.lerp(140, 20, t))
        x.strokeStyle = `rgba(255,${g},${b},${(1 - t) * 0.9})`
        x.lineWidth = p.r * (1 - t * 0.6)
        x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4); x.stroke()
      } else if (p.k === 'ash') {
        p.a += 0.05 * dt; p.vx += Math.sin(p.life * 0.08) * 0.01 * dt
        p.x += p.vx * dt; p.y += p.vy * dt
        x.globalCompositeOperation = 'source-over'
        x.fillStyle = `rgba(40,30,28,${(1 - t) * 0.7})`
        x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8); x.restore()
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97
        x.globalCompositeOperation = 'source-over'
        const r = p.r * (0.6 + t * 1.2)
        // 灰尘：同一张预先画好的柔光点按大小、透明度贴上去（与逐个新建径向渐变的画法相同，不必每帧每粒重建渐变）
        x.globalAlpha = 0.09 * (1 - t)
        x.drawImage(dustSprite(), p.x - r, p.y - r, r * 2, r * 2)
        x.globalAlpha = 1
      }
    }
    x.globalCompositeOperation = 'source-over'
  }

  /* =====================================================================
     事件
     ===================================================================== */
  function bind() {
    const hit = S.hit
    hit.addEventListener('pointerenter', () => { S.pointerIn = true })
    hit.addEventListener('pointerleave', () => { S.pointerIn = false; if (S.hover >= 0 && S.mode === 'desk') setHover(-1); releaseCursor() })
    hit.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') S.pointerIn = true })
    hit.addEventListener('click', e => {
      if (S.focus != null) {
        // 刚拿起的一瞬（双击的第二下、牌还在飞）不算「点空白处」
        if (S.burning || justOpened() || e.detail > 1) return
        closeFocus()
        return
      }
      if (!S.ready || S.mode !== 'desk' || S.gather > 0.35) return
      const r = S.stage.getBoundingClientRect()
      const prevHover = S.hover
      S.hover = -1
      const i = pickArc(e.clientX - r.left, e.clientY - r.top)
      S.hover = prevHover
      if (i >= 0) openFocus(i)
    })

    // 手机：点按牌列
    S.scroller.addEventListener('click', e => {
      if (!S.ready || S.focus != null) return
      const r = S.stage.getBoundingClientRect()
      const x = e.clientX - r.left
      const i = Math.round((x - S.vw / 2 + S.rowX) / S.geo.sp)
      if (i >= 0 && i < N) {
        const c = S.cards[i]
        if (Math.abs(x - c.cur.x) < S.fanW * 0.62) openFocus(i)
      }
    })

    // 拿在手里的牌：点击翻面；圣女按住发动
    for (const c of S.cards) {
      const s = c.slot
      s.addEventListener('pointerenter', () => { if (S.focus === c.i) { S.cardHover = true; updateCardCursor(c) } })
      s.addEventListener('pointerleave', () => {
        if (S.cardHover) { S.cardHover = false; if (S.cursorForcedCard && App.cursor && App.cursor.clear) App.cursor.clear(); S.cursorForcedCard = false }
        if (S.hold && S.hold.c === c && !S.hold.key) cancelHold()
      })
      s.addEventListener('contextmenu', e => { if (S.focus === c.i) e.preventDefault() })
      s.addEventListener('pointerdown', e => {
        if (S.focus !== c.i || S.burning || c.flipTw || justOpened()) return
        if (c.def.front === '圣女' && !c.burned) {
          const r = S.stage.getBoundingClientRect()
          startHold(c, e.clientX - r.left, e.clientY - r.top, false)
          S.holdPid = e.pointerId
          try { s.setPointerCapture(e.pointerId) } catch (err) { /* */ }
        }
      })
      s.addEventListener('pointermove', e => {
        const h = S.hold
        if (!h || h.c !== c || h.key) return
        const r = S.stage.getBoundingClientRect()
        if (Math.hypot(e.clientX - r.left - h.x, e.clientY - r.top - h.y) > 18) cancelHold()
      })
      const up = e => {
        if (S.focus !== c.i) return
        const h = S.hold
        if (h && h.c === c && !h.key) {
          const res = endHold(true)
          if (res === 'click') flipFromEvent(c, e)
          c._suppress = true
          setTimeout(() => { c._suppress = false }, 60)
        }
      }
      s.addEventListener('pointerup', up)
      s.addEventListener('pointercancel', () => { if (S.hold && S.hold.c === c) cancelHold() })
      s.addEventListener('click', e => {
        e.stopPropagation()
        if (S.focus !== c.i || c._suppress || S.burning || justOpened()) return
        if (c.def.front === '圣女' && !c.burned) return
        flipFromEvent(c, e)
      })
    }

    S.flipBtn.addEventListener('click', e => { e.stopPropagation(); flipFocus(1) })
    S.prev.addEventListener('click', e => { e.stopPropagation(); nav(-1) })
    S.next.addEventListener('click', e => { e.stopPropagation(); nav(1) })
    S.close.addEventListener('click', e => { e.stopPropagation(); closeFocus() })

    window.addEventListener('keydown', e => {
      if (S.focus == null) return
      const t = e.target
      const onBtn = t && t.closest && t.closest('button')
      if (e.key === 'Escape') { if (!S.burning) closeFocus(); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); nav(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nav(1) }
      else if ((e.key === 'Enter' || e.key === ' ') && !onBtn) {
        e.preventDefault()
        const c = S.cards[S.focus]
        if (c.def.front === '圣女' && !c.burned) { if (!e.repeat) startHold(c, c.cur.x, c.cur.y - S.H * 0.06, true) }
        else if (!e.repeat) flipFocus(1)
      } else if (e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!S.burning) closeFocus()
      }
    })
    window.addEventListener('keyup', e => {
      if (!S.hold || !S.hold.key) return
      if (e.key === 'Enter' || e.key === ' ') {
        const c = S.hold.c
        const res = endHold(true)
        if (res === 'click') flipFocus(1)
        void c
      }
    })
    // 拿在手里时滚轮：放回（页面此时不滚动）
    // 触控板的惯性滚动会在拿起之后继续送来一长串 wheel：只认拿起之后、停顿过再开始的一次新滚动
    window.addEventListener('wheel', e => {
      const now = performance.now()
      const gap = now - (S.lastWheel || 0)
      S.lastWheel = now
      if (S.focus == null || S.burning || !S.el.contains(e.target)) return
      if (!S.wheelArmed) {
        if (gap > 240 && now - S.openAt > 420) { S.wheelArmed = true; S.wheel = 0 }
        else return
      }
      if (gap > 400) S.wheel = 0
      S.wheel += Math.abs(e.deltaY) + Math.abs(e.deltaX) * 0.3
      if (S.wheel > 90) { S.wheel = 0; closeFocus() }
    }, { passive: true, capture: true })
    // 拿在手里时点到板块以外（HUD 等）：先放回
    document.addEventListener('pointerdown', e => {
      if (S.focus != null && !S.el.contains(e.target) && !S.burning) closeFocus()
    }, true)

    window.addEventListener('resize', U.debounce(() => {
      if (!S.built) return
      const wasMode = S.mode
      layout()
      if (S.mode !== wasMode) { S.cards.forEach(c => { if (c.mode === 'fan') Object.assign(c.cur, fanTarget(c)) }) }
      fitAll()
      fineImages()
    }, 180))
  }

  function justOpened() { return performance.now() - (S.openAt || 0) < 480 }

  function flipFromEvent(c, e) {
    const r = c.slot.getBoundingClientRect()
    const dir = e && e.clientX != null && e.clientX < r.left + r.width / 2 ? -1 : 1
    flipFocus(dir)
  }

  /* =====================================================================
     注册
     ===================================================================== */
  App.section('identities', {
    palette: PAL.base,
    track: 'gallery',
    mount(sec) {
      if (!N) return
      build(sec)
      applyQuality(S.q)
      App.bus.on('quality', applyQuality)
      layout()
      fitAll()
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitAll() })
      fineImages()
      for (const c of S.cards) Object.assign(c.cur, deckPose(c))
      bind()
      App.onVisible(sec, v => { S.visible = v; S.stage.classList.toggle('is-paused', !v); if (!v) parts.length = 0 }, { rootMargin: '0px' })
      ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: self => { S.pin = self.progress } })
      ScrollTrigger.create({
        trigger: sec, start: 'top 72%', once: true,
        onEnter: () => {
          // 入场只动 --in（CSS 里与「拿起」状态相乘），不写内联 opacity，免得盖掉拿起时的隐藏
          gsap.fromTo(S.plate, { '--in': 0 }, { '--in': 1, duration: 1.4, ease: 'expo.out' })
          gsap.fromTo([S.foot, S.rticks], { '--in': 0 }, { '--in': 1, duration: 2, delay: 0.6 })
          gsap.fromTo(S.table, { '--in': 0 }, { '--in': 1, duration: 2.2, ease: 'power2.out' })
        },
      })
      App.bus.on('wake', () => { S.awake = true })
      if (App.isReady && !document.getElementById('gate')) S.awake = true
      App.bus.on('section:enter', id => { if (id === 'identities' && S.rev) App.bg.setPalette(PAL.rev, 0.8) })
      App.tick(tick)
      // 调试
      App._identities = {
        S, open: openFocus, close: closeFocus, flip: flipFocus, nav, deal,
        ignite: () => { const c = S.cards.find(x => x.def.front === '圣女'); if (c) ignite(c) },
        settle: (n = 30) => { for (let k = 0; k < n; k++) tick(0, 3.8) },
      }
    },
    enter() { S.visible = true },
    leave() {
      if (S.focus != null) closeFocus(true)
      cancelHold(true)
      if (S.hover >= 0) setHover(-1)
      releaseCursor()
      S.pointerIn = false
    },
  })
})()
