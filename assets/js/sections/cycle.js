/* ==========================================================
   受命（cycle）—— 一局游戏的循环
   一段钉住的长滚动（约 7.85 屏），七个满屏镜头，硬切相接：
     受命 → 行凶 → 发现 → 调查 → 庭审 → 判定 → 余波 →（倒卷）受命
   光标：倒计时随光标速度加快；走廊随视线偏移、墨迹从光标处晕开并干涸成锈红；
         放大镜照出看不见的痕迹；最后一票与判定的两个结局随光标左右；
         金币在光标附近闪光、躲开光标滚走；凶手书桌上的十枚只在光标靠近时看得见。
   手机：触摸位置代替光标；没有触摸时自动演示。
   文字只有：阶段名、编号、时刻、馆内广播原句（WORLD.broadcasts）、人名、
             LORE.phases 的阶段短句、LORE 的线索名与尸体变化。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const el = U.el
  const WORLD = window.WORLD || {}
  const LORE = window.LORE || {}

  /* =========================================================
     小工具
     ========================================================= */
  const clamp = U.clamp
  const lerp = U.lerp
  const seg = (a, b, x) => clamp((x - a) / (b - a))
  const sstep = (a, b, x) => { const t = seg(a, b, x); return t * t * (3 - 2 * t) }
  const eo3 = t => 1 - Math.pow(1 - t, 3)
  const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const pad2 = n => String(n).padStart(2, '0')
  const hhmm = m => U.clock(m).text
  const dayText = m => '第' + U.cnNum(U.clock(m).day) + '日'
  const nameOf = id => (App.char(id) || {}).name || ''
  const mk = (tag, attrs, parent) => { const n = U.svg(tag, attrs); if (parent) parent.appendChild(n); return n }
  const fx = v => v.toFixed(1)
  const hms = s => { s = Math.max(0, Math.floor(s)); return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor((s % 3600) / 60)) + ':' + pad2(s % 60) }
  const TAU = Math.PI * 2
  // 预先解码位图肖像：藏着的人像第一次露面（人影掠过、处刑）时不会空一两帧
  const warm = node => { if (node) for (const img of node.querySelectorAll('img')) if (img.decode) img.decode().catch(() => {}) }
  // 只在动画期间提升为合成层：开始时加 will-change，结束（或被打断）时撤掉
  const lift = (targets, v) => ({
    onStart: () => gsap.set(targets, { willChange: v }),
    onComplete: () => gsap.set(targets, { willChange: 'auto' }),
    onInterrupt: () => gsap.set(targets, { willChange: 'auto' }),
  })
  // 肖像随光标偏转（App.trackEyes）只在镜头放映时开：藏着的肖像不必每帧量位置、写样式
  function track(wrap, on, opts) {
    if (!wrap) return
    if (on && !wrap._trk) wrap._trk = App.trackEyes(wrap, opts || {})
    else if (!on && wrap._trk) { wrap._trk(); wrap._trk = null }
  }

  /* =========================================================
     原文数据
     ========================================================= */
  const PHASES = {}
  for (const p of (LORE.phases || [])) PHASES[p.key] = p
  const pline = (key, fb) => (PHASES[key] && PHASES[key].line) || fb

  const BCAST = {}
  for (const b of ((WORLD.broadcasts && WORLD.broadcasts.fixed) || [])) BCAST[b.when] = b.text
  const BC_FB = {
    '尸体被有效发现': '发现尸体。调查时间一百二十分钟，于〈开庭时刻〉在穹顶议事厅开庭。',
    '主持人只以【】喊停辩论': '辩论结束，开始投票。',
    '判定正确': '判定正确。〈某某〉是〈死者〉一案的凶手。',
    '误判': '判定错误。〈某某〉不是〈死者〉一案的凶手。本场第〈一／二〉次误判。',
  }
  // 广播句 → 片段（〈〉里代入的内容标成高亮）
  function bcSegs(when, map) {
    const t = BCAST[when] || BC_FB[when] || ''
    const out = []
    for (const part of t.split(/(〈[^〉]*〉)/)) {
      if (!part) continue
      const m = /^〈([^〉]*)〉$/.exec(part)
      if (m && map && map[m[1]] != null) out.push({ t: map[m[1]], hot: true })
      else out.push({ t: part })
    }
    return out
  }

  const CLUE = {}
  for (const c of (LORE.clueTemplates || [])) CLUE[c.id] = c
  const clueName = (id, fb) => (CLUE[id] && CLUE[id].name) || fb
  const STAGES = (LORE.bodyStages || []).slice().sort((a, b) => a.minutes - b.minutes)
  const stageAt = min => { let s = ''; for (const x of STAGES) if (min >= x.minutes) s = x.text; return s }

  /* =========================================================
     镜头表（w = 占用的屏数）
     ========================================================= */
  const SHOTS = [
    { key: 'mandate', name: '受命', w: 1.2, pal: { a: '#0c0607', b: '#7d1616', glow: 0.16 }, tension: 0.3, line: pline('mandate', '私人通知，只送达一人。') },
    { key: 'murder', name: '行凶', w: 0.95, pal: { a: '#140507', b: '#a3104a', glow: 0.3 }, tension: 0.62, line: pline('murder', '不可回头的那一步。') },
    { key: 'discover', name: '发现', w: 0.75, pal: { a: '#1e0611', b: '#ff2e7e', glow: 0.7 }, tension: 0.9, line: pline('discovery', '看见了，并确认他已死去。') },
    { key: 'inv', name: '调查', w: 1.25, pal: { a: '#0a0c0f', b: '#8d98a6', glow: 0.26 }, tension: 0.5, line: pline('investigate', '一百二十分钟，谁找到算谁的。') },
    { key: 'court', name: '庭审', w: 1.25, pal: { a: '#16100a', b: '#c29a5b', glow: 0.38 }, tension: 1, line: pline('debate', '自一号席起，各说一次。') },
    { key: 'verdict', name: '判定', w: 1.15, pal: { a: '#1c0408', b: '#d10f45', glow: 0.55 }, tension: 1, line: '' },
    { key: 'after', name: '余波', w: 1.3, pal: { a: '#130e08', b: '#c29a5b', glow: 0.42 }, tension: 0.16, line: pline('payout', '金币无声出现在圆桌上。') },
  ]
  let acc = 0
  for (const s of SHOTS) { s.a = acc; acc += s.w; s.b = acc }
  const TOTAL = acc
  const LINE_VOTE = pline('vote', '记名，依次，公开。')
  const LINE_OK = pline('verdict', '选中真凶，他当场被处死。')
  const LINE_NG = pline('misjudge', '错指的人先死，再公布。')
  const LINE_AGAIN = pline('aftermath', '受命者重获二十四小时。')

  const T_MANDATE = 19 * 60 // 第一日 19:00，窗光尽灭
  const DAY = 24 * 3600
  const E_MAX = 23.5 * 3600

  /* =========================================================
     状态
     ========================================================= */
  const S = {
    sec: null, sticky: null, stage: null, st: null, def: null,
    ready: false, visible: false, W: 0, H: 0, mob: false, rect: { left: 0, top: 0 },
    p: 0, idx: -1, lp: 0, fast: false, qEntry: false, tPrev: 0, err: false,
    seed: (Math.random() * 1e9) >>> 0,
    cast: null, story: null,
    E: 0, Etime: 0, frozen: false,
    branch: null,
    cur: { x: 0, y: 0, rx: 0, ry: 0, nx: 0.5, ny: 0.5, speed: 0, auto: true },
    lastTouch: -1e9, touchX: 0, touchY: 0,
    tension: -1, timers: [],
    q: 2, qDirty: false, lock: undefined, far: false, // 画质（App.quality.level）；画质变了待重设画布；舞台是否被锁住（离开视口）；板块是否离视口很远
  }
  /* 板块离开视口：舞台 content-visibility: hidden——里面所有元素不再算样式、不再画、循环动画也不跑。
     只改舞台这一个元素（原先给整个板块切 is-off 类，会让板块里所有元素重算样式）。 */
  function setLock(v) {
    if (v === S.lock || !S.stage) return
    S.lock = v
    S.stage.style.contentVisibility = v ? 'hidden' : ''
  }
  // 震屏只震本板块的舞台（常驻合成层，只改 transform）；默认的 #world 不是合成层，每震一下整页都要重画
  const shake = (strength, dur) => { if (S.stage) App.shake(S.stage, strength, dur) }
  const later = (fn, ms) => { const id = setTimeout(() => { S.timers = S.timers.filter(x => x !== id); fn() }, ms); S.timers.push(id); return id }
  const clearLater = () => { for (const id of S.timers) clearTimeout(id); S.timers = [] }

  /* =========================================================
     人选与票型
     ========================================================= */
  function pickCast() {
    const rnd = U.seeded(S.seed)
    const pick = arr => arr[Math.floor(rnd() * arr.length)]
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t } return a }
    const seats = (App.state.seats || []).slice(0, 15)
    while (seats.length < 15) seats.push(null)
    const roster = seats.map(id => (id && App.char(id) ? id : null))
    if (roster.filter(Boolean).length < 5) {
      const pool = shuffle(App.chars.map(c => c.id).filter(id => roster.indexOf(id) < 0))
      for (let i = 0; i < 15; i++) if (!roster[i] && pool.length) roster[i] = pool.pop()
    }
    // 万一没有角色数据：用占位
    for (let i = 0; i < 15; i++) if (!roster[i] && roster.filter(Boolean).length < 5) roster[i] = '__' + (i + 1)
    const ppl = []
    roster.forEach((id, i) => { if (id) ppl.push({ seat: i + 1, id }) })
    const side = p => Math.sin(((p.seat - 1) / 15) * TAU)
    const walk = p => { const c = App.char(p.id); return !c || c.canWalk !== false }
    const swing = ppl[ppl.length - 1] // 最后一个投票的人
    const rest = ppl.filter(p => p !== swing)
    // 凶手坐在圆桌左半、错指者坐在右半：最后一票随光标左右摆时两头分得开
    const kPool = rest.filter(p => side(p) < -0.45 && walk(p))
    const K = pick(kPool.length ? kPool : rest.filter(walk).length ? rest.filter(walk) : rest)
    const r2 = rest.filter(p => p !== K)
    const wPool = r2.filter(p => side(p) > 0.45)
    const Wp = pick(wPool.length ? wPool : r2)
    const r3 = r2.filter(p => p !== Wp)
    const V = pick(r3.length ? r3 : r2)
    const living = ppl.filter(p => p !== V)
    const r4 = living.filter(p => p !== K && p !== Wp && p !== swing)
    const W2 = pick(r4.length ? r4 : living.filter(p => p !== K && p !== Wp))
    const r5 = living.filter(p => p !== K && p !== Wp)
    const NEXT = pick(r5.length ? r5 : living.filter(p => p !== K))

    // 票：凶手投错指者，错指者投凶手，其余人在两人之间各半，少数散票；最后一票悬而未决
    const voters = living.filter(p => p !== swing)
    const others = voters.filter(p => p !== K && p !== Wp)
    const sh = shuffle(others)
    const nScatter = others.length >= 4 ? Math.max(1, Math.round(others.length * 0.22)) : 0
    const scatter = new Set(sh.slice(0, nScatter))
    const split = sh.slice(nScatter)
    if (split.length % 2 === 1) scatter.add(split.pop())
    const toK = new Set(shuffle(split).slice(0, split.length / 2))
    const votes = []
    for (const v of voters) {
      let to
      if (v === K) to = Wp
      else if (v === Wp) to = K
      else if (scatter.has(v)) {
        const c = living.filter(p => p !== v && p !== K && p !== Wp)
        to = c.length ? pick(c) : null
      } else to = toK.has(v) ? K : Wp
      if (to) votes.push({ from: v, to })
    }
    return { roster, ppl, living, K, W: Wp, V, W2, swing, NEXT, votes }
  }

  function computeStory() {
    const rnd = U.seeded((S.seed ^ 0x5bd1e995) >>> 0)
    const E = clamp(S.E, 9 * 60, E_MAX)
    const death = T_MANDATE + E / 60
    const delta = 18 + Math.floor(rnd() * 57)
    const disc = Math.floor(death) + delta
    S.story = { E, death, disc, court: disc + 120, delta, drift: Math.floor(rnd() * 7) - 3 }
  }

  /* =========================================================
     光标（或触摸 / 自动演示）
     ========================================================= */
  function readCursor(t) {
    const m = App.mouse
    const r = S.rect
    const touchRecent = performance.now() - S.lastTouch < 2600
    const usePtr = (App.finePointer && m.active) || touchRecent
    const c = S.cur
    if (usePtr) {
      const px = App.finePointer ? m.x : S.touchX, py = App.finePointer ? m.y : S.touchY
      c.rx = px - r.left; c.ry = py - r.top
      c.x = lerp(c.x, c.rx, 0.22); c.y = lerp(c.y, c.ry, 0.22)
      c.speed = App.finePointer ? m.speed : lerp(c.speed, m.speed, 0.2)
      c.auto = false
    } else {
      const sh = SH[S.idx]
      const a = sh && sh.auto ? sh.auto(t) : null
      const tx = a ? a[0] : S.W * (0.5 + 0.3 * Math.sin(t * 0.55))
      const ty = a ? a[1] : S.H * (0.52 + 0.2 * Math.sin(t * 0.83 + 1.2))
      c.rx = lerp(c.rx || tx, tx, 0.05); c.ry = lerp(c.ry || ty, ty, 0.05)
      c.x = c.rx; c.y = c.ry
      c.speed = 3 + 2.5 * Math.sin(t * 0.7)
      c.auto = true
    }
    c.nx = clamp(c.x / (S.W || 1)); c.ny = clamp(c.y / (S.H || 1))
  }

  /* =========================================================
     共用：阶段名（竖排）
     ========================================================= */
  const PH = { i: -1, chars: [] }
  function buildPhase() {
    PH.no = el('div.cycle-phase-no', null, [el('i'), el('span')])
    PH.name = el('div.cycle-phase-name')
    PH.line = el('div.cycle-phase-line')
    PH.root = el('div.cycle-phase.is-hide', { 'aria-hidden': 'true' }, [PH.no, el('div.cycle-phase-col', null, [PH.name, PH.line])])
    return PH.root
  }
  function setPhase(i, opts = {}) {
    const sh = SHOTS[i]
    const same = PH.i === i
    PH.i = i
    PH.no.lastChild.textContent = U.roman(i + 1)
    if (!same || opts.force) {
      PH.name.textContent = ''
      PH.chars = Array.from(sh.name).map(ch => { const s = el('span', { text: ch }); PH.name.appendChild(s); return s })
      setPhaseFill(0)
    }
    setPhaseLine(opts.line != null ? opts.line : sh.line, opts.quiet)
    if (opts.flick) {
      PH.root.classList.remove('is-flick'); void PH.root.offsetWidth; PH.root.classList.add('is-flick')
      return
    }
    if (!opts.quiet && !App.reduced && !same) {
      gsap.killTweensOf(PH.chars)
      gsap.fromTo(PH.chars, { opacity: 0, scale: 1.7, yPercent: k => (k ? 22 : -22) }, { opacity: 1, scale: 1, yPercent: 0, duration: 0.55, ease: 'expo.out', stagger: 0.07, ...lift(PH.chars, 'transform, opacity') })
      PH.root.classList.remove('is-stamp'); void PH.root.offsetWidth; PH.root.classList.add('is-stamp')
    } else if (!same) gsap.set(PH.chars, { opacity: 1, scale: 1, yPercent: 0 })
  }
  function setPhaseLine(text, quiet) {
    if (PH.lineText === text) return
    PH.lineText = text
    PH.line.textContent = text || ''
    if (!quiet && !App.reduced && text) gsap.fromTo(PH.line, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.15 })
    else gsap.set(PH.line, { opacity: 1, y: 0 })
  }
  function setPhaseFill(f) {
    PH.chars.forEach((s, k) => putVar(s, '--f', clamp(f * PH.chars.length - k).toFixed(3)))
  }
  PH.show = v => PH.root && PH.root.classList.toggle('is-hide', !v)

  /* =========================================================
     共用：馆内广播（打字机，代入内容高亮）
     ========================================================= */
  const BC = { token: 0, timer: 0 }
  function buildBC() {
    BC.text = el('p.cycle-bc-text')
    BC.root = el('div.cycle-bc', { 'aria-live': 'polite' }, [
      el('div.cycle-bc-ico', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="s" d="M3.5 9.2h3.6l5-4.2v14l-5-4.2H3.5z"/><path class="w1" d="M15.6 9.2a3.9 3.9 0 0 1 0 5.6"/><path class="w2" d="M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>' }),
      BC.text,
    ])
    return BC.root
  }
  function say(segs, opts = {}) {
    const tok = ++BC.token
    clearTimeout(BC.timer)
    BC.root.dataset.pos = opts.pos || 'low'
    BC.root.classList.add('is-on')
    BC.text.textContent = ''
    const spans = segs.map(s => { const n = el('span', s.hot ? { class: 'is-hot' } : null); BC.text.appendChild(n); return n })
    const caret = el('i.cycle-bc-caret')
    BC.text.appendChild(caret)
    if (opts.instant || App.reduced) {
      segs.forEach((s, k) => { spans[k].textContent = s.t })
      BC.root.classList.remove('is-live')
      caret.classList.add('is-done')
      return
    }
    BC.root.classList.add('is-live')
    const sp = opts.speed || 44
    const chars = segs.map(s => Array.from(s.t))
    let si = 0, ci = 0, n = 0
    const step = () => {
      if (tok !== BC.token) return
      while (si < segs.length && ci >= chars[si].length) { si++; ci = 0 }
      if (si >= segs.length) { BC.root.classList.remove('is-live'); caret.classList.add('is-done'); return }
      const ch = chars[si][ci++]
      spans[si].textContent += ch
      if (ch.trim() && (n++ % 2 === 0)) App.audio.sfx('type', { volume: 0.75 })
      const pause = /[。！？]/.test(ch) ? sp * 7 : /[，、；：]/.test(ch) ? sp * 3.2 : sp
      BC.timer = setTimeout(step, pause * U.rand(0.75, 1.25))
    }
    BC.timer = setTimeout(step, opts.delay || 0)
  }
  function hush() {
    BC.token++
    clearTimeout(BC.timer)
    if (BC.root) BC.root.classList.remove('is-on', 'is-live')
  }

  /* =========================================================
     共用：硬切、遮幅、循环环（导航）
     ========================================================= */
  const CUT = {}
  function buildCut() {
    CUT.k = el('i.cycle-cut-k')
    CUT.bar = el('i.cycle-cut-bar')
    CUT.scan = el('i.cycle-cut-scan')
    CUT.root = el('div.cycle-cut', { 'aria-hidden': 'true' }, [CUT.k, CUT.bar, CUT.scan])
    return CUT.root
  }
  // 三块满屏的硬切效果平时 visibility: hidden（autoAlpha），只在动画的几百毫秒里存在；动画期间加 will-change 成合成层，不逐帧重画
  function cutFX(dir, quiet) {
    if (App.reduced) return
    gsap.killTweensOf([CUT.k, CUT.bar, CUT.scan])
    if (dir > 0 && !quiet) {
      gsap.fromTo(CUT.k, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.14, ease: 'steps(2)', ...lift(CUT.k, 'opacity') })
      gsap.fromTo(CUT.bar, { xPercent: -140, autoAlpha: 1 }, { xPercent: 140, duration: 0.46, ease: 'expo.inOut', ...lift(CUT.bar, 'transform'), onComplete: () => gsap.set(CUT.bar, { autoAlpha: 0, willChange: 'auto' }) })
      App.audio.sfx('whoosh', { volume: 0.4, pitch: 1.25 })
    } else {
      gsap.fromTo(CUT.scan, { autoAlpha: 0.85 }, { autoAlpha: 0, duration: 0.4, ease: 'power2.out', ...lift(CUT.scan, 'opacity') })
    }
  }

  const NAV = {}
  function buildNav() {
    const svg = U.svg('svg', { viewBox: '0 0 80 80', class: 'cycle-loop-svg', 'aria-hidden': 'true' })
    mk('circle', { cx: 40, cy: 40, r: 30, class: 'cycle-loop-track' }, svg)
    NAV.arc = mk('circle', { cx: 40, cy: 40, r: 30, class: 'cycle-loop-arc', pathLength: 1, transform: 'rotate(-90 40 40)' }, svg)
    NAV.no = el('span.cycle-loop-no')
    NAV.dots = []
    const root = el('nav.cycle-loop', { 'aria-label': '循环' }, [svg, NAV.no])
    SHOTS.forEach((s, i) => {
      const a = (i / SHOTS.length) * TAU
      const b = el('button.cycle-loop-dot', { type: 'button', 'data-cursor': s.name, 'aria-label': s.name })
      b.style.left = fx(40 + Math.sin(a) * 30) + 'px'
      b.style.top = fx(40 - Math.cos(a) * 30) + 'px'
      b.addEventListener('click', e => { e.stopPropagation(); jumpTo(i) })
      root.appendChild(b)
      NAV.dots.push(b)
    })
    NAV.root = root
    return root
  }
  function jumpTo(i) {
    const top = S.sec.getBoundingClientRect().top + window.scrollY
    const dist = S.sec.offsetHeight - S.sticky.offsetHeight
    const target = top + dist * ((SHOTS[i].a + SHOTS[i].w * 0.035) / TOTAL)
    App.audio.sfx('click')
    App.scroll.to(target, { duration: 1.1 })
  }

  /* =========================================================
     墨迹（行凶）：从一点晕开，几秒后干涸成锈红
     ========================================================= */
  function Ink(canvas) {
    this.cv = canvas
    this.ctx = canvas.getContext('2d')
    this.dry = document.createElement('canvas')
    this.dctx = this.dry.getContext('2d')
    this.blobs = []
    this.w = 0; this.h = 0; this.k = 1
    this.dirty = true
    this.full = true // 下一次整张重画；否则只重画活着的墨迹（与上一帧）占的那一块
    this.prev = null
  }
  Ink.prototype.resize = function (w, h) {
    const k = Math.min(S.q >= 2 ? 1.5 : 1, window.devicePixelRatio || 1) * (App.isMobile() ? 0.85 : 1) // 画质降级时降到 1 倍
    if (w === this.w && h === this.h && k === this.k) return
    this.w = w; this.h = h; this.k = k
    for (const c of [this.cv, this.dry]) { c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k)) }
    this.blobs.length = 0
    this.dirty = this.full = true
  }
  Ink.prototype.clear = function () {
    this.blobs.length = 0
    this.dctx.clearRect(0, 0, this.dry.width, this.dry.height)
    this.dirty = this.full = true
  }
  // 一滴墨（含外圈晕、拖痕的延长段）在画布上可能占到的范围（CSS 像素），并入 box
  Ink.prototype.extent = function (b, box) {
    let x0, y0, x1, y1
    if (b.x2 != null) {
      const x3 = b.x2 + (b.x2 - b.x) * 0.25, y3 = b.y2 + (b.y2 - b.y) * 0.25
      const r = b.R + 2
      x0 = Math.min(b.x, x3) - r; x1 = Math.max(b.x, x3) + r
      y0 = Math.min(b.y, y3) - r; y1 = Math.max(b.y, y3) + r
    } else {
      const r = b.R * 1.6 + 2
      x0 = b.x - r; x1 = b.x + r; y0 = b.y - r; y1 = b.y + r
    }
    if (x0 < box[0]) box[0] = x0
    if (y0 < box[1]) box[1] = y0
    if (x1 > box[2]) box[2] = x1
    if (y1 > box[3]) box[3] = y1
  }
  Ink.prototype.add = function (x, y, R, o = {}) {
    if (this.blobs.length > 240) this.bake(this.blobs.shift())
    this.blobs.push({
      x, y, R, t: 0, sq: o.sq || 1, x2: o.x2, y2: o.y2,
      grow: o.grow || U.rand(0.35, 0.8), wet: o.wet || U.rand(1.1, 1.9),
      s1: Math.random() * TAU, s2: Math.random() * TAU, s3: Math.random() * TAU,
    })
  }
  // 画布元素整体半透明（CSS），这里一律不透明地画：重叠处不会叠深成一颗颗“珠子”
  Ink.prototype.paint = function (c, b, final) {
    const t = final ? 99 : b.t
    const g = 1 - Math.exp(-t / b.grow)
    const r = b.R * (0.3 + 0.7 * g)
    if (r < 0.3) return
    const d = final ? 1 : clamp((t - b.wet) / 2.6)
    const cr = lerp(150, 92, d) | 0, cg = lerp(8, 18, d) | 0, cb = lerp(46, 17, d) | 0
    if (b.x2 != null) {
      // 拖痕：一段圆头粗线，越往后越细
      c.save()
      c.lineCap = 'round'
      c.strokeStyle = `rgb(${cr},${cg},${cb})`
      c.lineWidth = r * 2
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x2, b.y2); c.stroke()
      c.lineWidth = r * 1.1
      c.beginPath(); c.moveTo(b.x2, b.y2); c.lineTo(b.x2 + (b.x2 - b.x) * 0.25, b.y2 + (b.y2 - b.y) * 0.25); c.stroke()
      c.restore()
      return
    }
    const ph = b.s3 + Math.min(t, 3) * 0.35
    c.save()
    if (b.sq !== 1) { c.translate(b.x, b.y); c.scale(1, b.sq); c.translate(-b.x, -b.y) }
    const hg = c.createRadialGradient(b.x, b.y, r * 0.55, b.x, b.y, r * 1.55)
    hg.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.2 * (1 - d * 0.45)).toFixed(3)})`)
    hg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
    c.fillStyle = hg
    c.beginPath(); c.arc(b.x, b.y, r * 1.55, 0, TAU); c.fill()
    c.beginPath()
    const n = 22
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU
      const rr = r * (1 + 0.11 * Math.sin(3 * a + b.s1) + 0.07 * Math.sin(5 * a + b.s2) + 0.045 * Math.sin(9 * a + ph))
      const x = b.x + Math.cos(a) * rr, y = b.y + Math.sin(a) * rr
      if (i) c.lineTo(x, y); else c.moveTo(x, y)
    }
    c.closePath()
    c.fillStyle = `rgb(${cr},${cg},${cb})`
    c.fill()
    if (d > 0.05 && b.R > 7) { c.lineWidth = 1; c.strokeStyle = `rgba(52,8,10,${(0.3 * d).toFixed(3)})`; c.stroke() }
    if (d < 0.95 && r > 3) {
      c.fillStyle = `rgba(255,46,126,${(0.26 * (1 - d)).toFixed(3)})`
      c.beginPath(); c.ellipse(b.x - r * 0.3, b.y - r * 0.32, r * 0.3, r * 0.15, -0.6, 0, TAU); c.fill()
    }
    c.restore()
  }
  Ink.prototype.bake = function (b) {
    this.dctx.setTransform(this.k, 0, 0, this.k, 0, 0)
    this.paint(this.dctx, b, true)
    this.dirty = true
  }
  Ink.prototype.bakeAll = function () { for (const b of this.blobs) this.bake(b); this.blobs.length = 0; this.dirty = this.full = true }
  Ink.prototype.step = function (dt) {
    for (let i = this.blobs.length - 1; i >= 0; i--) {
      const b = this.blobs[i]
      b.t += dt
      if (b.t > b.wet + 3.4) { this.bake(b); this.blobs.splice(i, 1) }
    }
    if (this.blobs.length) this.dirty = true
  }
  /* 只重画「这一帧活着的墨迹 ∪ 上一帧活着的墨迹」占的那一块：干透的部分从 dry 拷回来，活的再画一遍。
     （原先每帧整张清空重画；墨迹几乎总是只占光标附近、门口那一小片） */
  Ink.prototype.draw = function () {
    if (!this.dirty) return
    this.dirty = false
    const c = this.ctx, k = this.k
    const cw = this.cv.width, ch = this.cv.height
    const box = [Infinity, Infinity, -Infinity, -Infinity]
    for (const b of this.blobs) this.extent(b, box)
    const cur = box[0] < box[2] ? box.slice() : null
    const prev = this.prev
    this.prev = cur
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (this.full) {
      this.full = false
      c.clearRect(0, 0, cw, ch)
      c.drawImage(this.dry, 0, 0)
      c.setTransform(k, 0, 0, k, 0, 0)
      for (const b of this.blobs) this.paint(c, b, false)
      return
    }
    if (prev) {
      if (prev[0] < box[0]) box[0] = prev[0]
      if (prev[1] < box[1]) box[1] = prev[1]
      if (prev[2] > box[2]) box[2] = prev[2]
      if (prev[3] > box[3]) box[3] = prev[3]
    }
    if (!(box[0] < box[2])) return
    const X0 = Math.max(0, Math.floor(box[0] * k)), Y0 = Math.max(0, Math.floor(box[1] * k))
    const X1 = Math.min(cw, Math.ceil(box[2] * k)), Y1 = Math.min(ch, Math.ceil(box[3] * k))
    if (X1 <= X0 || Y1 <= Y0) return
    const w = X1 - X0, h = Y1 - Y0
    c.save()
    c.beginPath(); c.rect(X0, Y0, w, h); c.clip()
    c.clearRect(X0, Y0, w, h)
    c.drawImage(this.dry, X0, Y0, w, h, X0, Y0, w, h)
    c.setTransform(k, 0, 0, k, 0, 0)
    for (const b of this.blobs) this.paint(c, b, false)
    c.restore()
  }

  /* =========================================================
     图形素材
     ========================================================= */
  // 俯视的倒卧人形（头在左），单位约 [-100,100]×[-50,50]；extra 让线条加粗做轮廓
  function bodyShape(extra, cls) {
    const w = v => v + extra
    return `<g class="${cls}">` +
      `<circle cx="-84" cy="-6" r="${12.5 + extra / 2}"/>` +
      `<path d="M-70 -2 L-14 2" stroke-width="${w(31)}"/>` +
      `<path d="M-14 2 L-4 3" stroke-width="${w(27)}"/>` +
      `<path d="M-63 -14 L-50 -40 L-30 -49" stroke-width="${w(10.5)}"/>` +
      `<path d="M-62 13 L-40 24 L-19 33" stroke-width="${w(10)}"/>` +
      `<path d="M-4 -7 L32 -14 L69 -10" stroke-width="${w(12)}"/>` +
      `<path d="M-4 11 L25 28 L61 27" stroke-width="${w(12)}"/>` +
      `<path d="M69 -10 L80 -13" stroke-width="${w(9)}"/>` +
      `<path d="M61 27 L72 32" stroke-width="${w(9)}"/>` +
      '</g>'
  }
  const WALKER_SVG = '<svg viewBox="0 0 40 100" aria-hidden="true"><path d="M20 2c4.4 0 7.4 3.4 7.4 7.8 0 3.2-1.6 5.8-4 7l.6 2.2c5.8 1.6 9 5 9.8 10.4l3.4 24.6c.2 2-.8 3.2-2.4 3.4l-2.2.2-1 39.4c0 1.6-1 2.6-2.6 2.6h-2.4c-1.4 0-2.4-1-2.6-2.4L20.8 64h-1.6l-3.2 32.8c-.2 1.4-1.2 2.4-2.6 2.4H11c-1.6 0-2.6-1-2.6-2.6l-1-39.4-2.2-.2C3.6 56.8 2.6 55.6 2.8 53.6L6.2 29c.8-5.4 4-8.8 9.8-10.4l.6-2.2c-2.4-1.2-4-3.8-4-7C12.6 5.4 15.6 2 20 2z"/></svg>'
  const SOLE = 'M0 -13.5C4 -13.5 5.6 -9.4 5.3 -4.6 5.1 -.9 3.7 1 3.5 2.6L3.7 8.4C3.7 11.9 2.1 13.6 0 13.6S-3.7 11.9-3.7 8.4L-3.5 2.6C-3.8 .8-5.2-1.4-5.2-5.2-5.2-9.6-3.6-13.5 0-13.5Z'
  const HAND = 'M-2 14C-7 13-11 9-11 3L-11-4C-11-6-8-6-8-4L-8 1-8-11C-8-13.4-5-13.4-5-11L-5-1-4.6-14.6C-4.6-17-1.4-17-1.4-14.6L-1.2-1-.8-13C-.8-15.4 2.4-15.4 2.4-13L2.6 0 3.6-9.4C3.8-11.6 6.8-11.4 6.6-9.2L6 5C6 10 3 14-2 14Z'

  /* =========================================================
     走廊（行凶 / 发现）：一点透视
     ========================================================= */
  const FAR = 0.085
  const csc = t => 1 / (1 + t * (1 / FAR - 1))
  const RIBS = [0.08, 0.2, 0.33, 0.45, 0.56, 0.66, 0.75, 0.82, 0.88, 0.93]
  const DOORS = [[-1, 0.24, 0.31], [1, 0.38, 0.45], [-1, 0.6, 0.65], [1, 0.71, 0.75], [-1, 0.84, 0.865]]
  const LAMPS = [[-1, 0.14], [1, 0.14], [-1, 0.5], [1, 0.5], [-1, 0.7], [1, 0.7], [-1, 0.855], [1, 0.855]]
  function corrGeo(vp) {
    const hw = S.W * 0.62, hh = S.H * 0.66
    const P = (u, v, t) => { const s = csc(t); return [vp.x + u * hw * s, vp.y + v * hh * s] }
    const pt = p => fx(p[0]) + ' ' + fx(p[1])
    const L = (a, b) => 'M' + pt(a) + 'L' + pt(b)
    let edge = '', rib = '', joint = '', door = '', run = ''
    for (const uv of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) edge += L(P(uv[0], uv[1], 0), P(uv[0], uv[1], 1))
    edge += L(P(-1, 0.32, 0), P(-1, 0.32, 1)) + L(P(1, 0.32, 0), P(1, 0.32, 1))
    for (const t of RIBS) {
      const t2 = t + 0.014
      rib += L(P(-1, 1, t), P(-1, -1, t)) + L(P(-1, -1, t), P(1, -1, t)) + L(P(1, -1, t), P(1, 1, t))
      rib += L(P(-1, 1, t2), P(-1, -1, t2)) + L(P(1, -1, t2), P(1, 1, t2))
      joint += L(P(-1, 1, t), P(1, 1, t))
    }
    for (const d of DOORS) door += 'M' + pt(P(d[0], 1, d[1])) + 'L' + pt(P(d[0], -0.34, d[1])) + 'L' + pt(P(d[0], -0.34, d[2])) + 'L' + pt(P(d[0], 1, d[2]))
    run = L(P(-0.3, 1, 0), P(-0.3, 1, 1)) + L(P(0.3, 1, 0), P(0.3, 1, 1))
    const far = 'M' + pt(P(-1, -1, 1)) + 'L' + pt(P(1, -1, 1)) + 'L' + pt(P(1, 1, 1)) + 'L' + pt(P(-1, 1, 1)) + 'Z'
    const doorway = 'M' + pt(P(-0.34, 1, 1)) + 'L' + pt(P(-0.34, -0.22, 1)) + 'L' + pt(P(0.34, -0.22, 1)) + 'L' + pt(P(0.34, 1, 1)) + 'Z'
    return { edge, rib, joint, door, run, far, doorway, P, hw, hh }
  }
  function corrSVG(cls) {
    const svg = U.svg('svg', { class: cls, 'aria-hidden': 'true', preserveAspectRatio: 'none' })
    const o = { svg }
    o.doorway = mk('path', { class: 'k-doorway' }, svg)
    for (const k of ['joint', 'run', 'rib', 'door', 'edge', 'far']) o[k] = mk('path', { class: 'k-' + k }, svg)
    return o
  }
  function corrDraw(o, g) {
    for (const k of ['joint', 'run', 'rib', 'door', 'edge', 'far', 'doorway']) o[k].setAttribute('d', g[k])
  }

  /* =========================================================
     镜头 1 · 受命
     ========================================================= */
  const SM = { key: 'mandate', rateS: 1, lastS: null, hb: 0, revealed: false }
  SM.build = function () {
    SM.seatNo = el('span.cycle-m-seat')
    SM.seal = el('div.cycle-m-seal', null, [el('i.l'), el('i.r')])
    SM.flap = el('div.cycle-m-flap', null, [
      el('div.cycle-m-face.cycle-m-in', null, [el('span.cycle-m-ch', { text: '受' })]),
      el('div.cycle-m-face.cycle-m-out', null, [el('i.cycle-m-frame'), SM.seatNo, SM.seal, el('span.cycle-m-when', { text: hhmm(T_MANDATE) })]),
    ])
    SM.low = el('div.cycle-m-low', null, [el('span.cycle-m-ch', { text: '命' })])
    SM.tilt = el('div.cycle-m-tilt', null, [SM.low, SM.flap])
    SM.card = el('div.cycle-m-card', null, [SM.tilt])
    SM.hint = el('div.cycle-m-hint', null, [el('i')])
    SM.bigTx = el('div.cycle-m-bigtx', null, [el('span', { text: '受' }), el('span', { text: '命' })])
    SM.big = el('div.cycle-m-big', null, [SM.bigTx])
    SM.digits = el('div.cycle-m-digits', { text: '24:00:00' })
    SM.barI = el('i')
    SM.rate = el('div.cycle-m-rate')
    SM.cd = el('div.cycle-m-cd', null, [SM.rate, SM.digits, el('div.cycle-m-bar', null, [SM.barI])])
    SM.el = el('div.cycle-shot.cycle-m', null, [SM.card, SM.hint, SM.big, SM.cd])
    return SM.el
  }
  SM.setCast = function () { SM.seatNo.textContent = U.roman(S.cast.K.seat) }
  SM.enter = function (dir) {
    if (dir < 0) S.frozen = false
    PH.show(false)
    SM.lastS = null
  }
  SM.leave = function (dir) {
    if (dir > 0) { S.frozen = true; computeStory() }
  }
  SM.skip = function (dir) {
    if (dir > 0) { S.frozen = true; S.E = Math.max(S.E, 6 * 3600 + S.Etime); computeStory() } else S.frozen = false
  }
  SM.update = function (lp, dt, t) {
    const open = eio(seg(0.1, 0.3, lp))
    const push = eio(seg(0.27, 0.36, lp))
    const k = App.reduced ? 0.35 : 1
    const tx = S.cur.nx - 0.5, ty = S.cur.ny - 0.5
    put(SM.flap, 'transform', `rotateX(${(180 * (1 - open)).toFixed(2)}deg)`)
    put(SM.tilt, 'transform', `translateY(${(-25 * (1 - open)).toFixed(2)}%) rotateX(${((-ty * 18 + 12 * (1 - open)) * k).toFixed(2)}deg) rotateY(${(tx * 24 * k).toFixed(2)}deg)`)
    const fl = Math.sin(t * 1.25) * 7 * (1 - open) * k
    put(SM.card, 'transform', `translateY(${fx(fl)}px) scale(${(1 + push * 1.1).toFixed(4)})`)
    put(SM.card, 'opacity', SM.revealed ? '0' : (1 - push * 0.35).toFixed(3))
    put(SM.card, 'visibility', SM.revealed ? 'hidden' : '') // 透明了就别留着 3D 合成层
    put(SM.card, 'filter', push > 0.01 ? `blur(${(push * 2.4).toFixed(2)}px)` : '')
    const ho = 1 - seg(0, 0.05, lp)
    put(SM.hint, 'opacity', ho.toFixed(3))
    put(SM.hint, 'visibility', ho > 0 ? '' : 'hidden')

    const live = lp >= 0.52 && !S.frozen
    if (live) {
      const sp = Math.max(0, S.cur.speed - 0.8)
      const rate = 1 + Math.min(7200, Math.pow(sp, 1.7) * 20)
      SM.rateS = lerp(SM.rateS, rate, rate > SM.rateS ? 0.12 : 0.045)
      S.Etime += dt * SM.rateS
    } else SM.rateS = lerp(SM.rateS, 1, 0.1)
    if (!S.frozen) S.E = clamp(sstep(0.52, 1, lp) * 6 * 3600 + S.Etime, 0, E_MAX)

    const R = Math.max(0, DAY - S.E)
    const s = Math.floor(R)
    if (s !== SM.lastS) {
      SM.digits.textContent = hms(s)
      if (live && SM.lastS != null) App.audio.sfx('tick', { volume: 0.42, pitch: 1 + clamp(Math.log10(SM.rateS) / 5, 0, 0.7), pan: (S.cur.nx - 0.5) * 1.3 })
      SM.lastS = s
    }
    put(SM.barI, 'transform', `scaleX(${(R / DAY).toFixed(4)})`)
    SM.digits.classList.toggle('is-fast', SM.rateS > 30)
    SM.digits.classList.toggle('is-low', R < 3 * 3600)
    const ro = clamp((SM.rateS - 3) / 25)
    put(SM.rate, 'opacity', ro.toFixed(3))
    if (ro > 0.01) SM.rate.textContent = '×' + Math.round(SM.rateS).toLocaleString('en-US')
    if (live && R < 3 * 3600) {
      SM.hb -= dt
      if (SM.hb <= 0) { App.audio.sfx('heartbeat', { volume: 0.55 }); SM.hb = 0.5 + (R / (3 * 3600)) * 0.8 }
    }
    if (lp >= 0.5) setPhaseFill(seg(0.5, 1, lp))
  }
  SM.reveal = function (q) {
    SM.revealed = true
    gsap.killTweensOf(SM.bigTx)
    if (q || App.reduced) { gsap.set(SM.bigTx, { autoAlpha: 1, scale: 1, x: 0, y: 0, willChange: 'auto' }); return }
    gsap.fromTo(SM.bigTx, { autoAlpha: 0, scale: 1.4 }, { autoAlpha: 1, scale: 1, x: 0, y: 0, duration: 0.55, ease: 'expo.out', ...lift(SM.bigTx, 'transform, opacity') })
    App.flash(App.color.blood, { opacity: 0.3, duration: 0.55 })
    App.bg.pulse(0.55, 1.1)
    App.audio.sfx('stamp')
    App.audio.sfx('heartbeat', { delay: 0.2 })
  }
  SM.unreveal = function () {
    SM.revealed = false
    gsap.killTweensOf(SM.bigTx)
    gsap.set(SM.bigTx, { autoAlpha: 0, x: 0, y: 0, scale: 1, willChange: 'auto' })
  }
  SM.toColumn = function (q) {
    PH.show(true)
    setPhase(0, { quiet: true, force: true })
    gsap.killTweensOf([SM.bigTx, SM.cd, ...PH.chars])
    if (q || App.reduced) {
      gsap.set(SM.bigTx, { autoAlpha: 0, willChange: 'auto' })
      gsap.set(SM.cd, { opacity: 1, y: 0, willChange: 'auto' })
      gsap.set(PH.chars, { opacity: 1, willChange: 'auto' })
      return
    }
    const a = SM.bigTx.getBoundingClientRect(), b = PH.name.getBoundingClientRect()
    const sc = b.height / Math.max(1, a.height)
    gsap.set(PH.chars, { opacity: 0 })
    gsap.set(SM.bigTx, { willChange: 'transform, opacity' })
    gsap.to(SM.bigTx, {
      x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), scale: sc,
      duration: 0.7, ease: 'expo.inOut',
    })
    gsap.to(SM.bigTx, { autoAlpha: 0, duration: 0.12, delay: 0.62, onComplete: () => gsap.set(SM.bigTx, { willChange: 'auto' }) })
    gsap.to(PH.chars, { opacity: 1, duration: 0.1, delay: 0.62 })
    gsap.fromTo(SM.cd, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.4, ...lift(SM.cd, 'transform, opacity') })
    gsap.fromTo(SM.digits, { scrambleText: { text: '--:--:--' } }, { duration: 0.9, delay: 0.4, scrambleText: { text: hms(DAY - S.E), chars: '0123456789', speed: 0.8 } })
    App.audio.sfx('whoosh', { volume: 0.5, pitch: 0.8 })
  }
  SM.fromColumn = function () {
    PH.show(false)
    gsap.killTweensOf([SM.bigTx, SM.cd, SM.digits])
    gsap.set(SM.bigTx, { x: 0, y: 0, scale: 1, autoAlpha: SM.revealed ? 1 : 0, willChange: 'auto' })
    gsap.set(SM.cd, { opacity: 0, willChange: 'auto' })
    SM.lastS = null
  }
  SM.beats = [
    { at: 0.1, on(q) { SM.seal.classList.add('is-broken'); if (!q) App.audio.sfx('stamp', { volume: 0.32, pitch: 1.8 }) }, off() { SM.seal.classList.remove('is-broken') } },
    { at: 0.14, on(q) { if (!q) App.audio.sfx('whoosh', { volume: 0.28, pitch: 1.6 }) } },
    { at: 0.36, on(q) { SM.reveal(q) }, off() { SM.unreveal() } },
    { at: 0.5, on(q) { SM.toColumn(q) }, off() { SM.fromColumn() } },
  ]

  /* =========================================================
     镜头 2 · 行凶
     ========================================================= */
  /* 走廊随视线偏移：一点透视里消失点平移 δ，整幅走廊（线、灯、人影、墨迹）也恰好平移 δ。
     所以走廊只在布局时按基准消失点画一次，之后整层（.cycle-k-move，合成层）平移，不再每帧改 SVG 路径重画。
     光标处照亮的那一圈：一个带固定圆形遮罩的小窗（520×520）跟着光标平移，窗里的亮线用 viewBox 取光标周围那一块。 */
  const LIT_R = 260
  const SK = { key: 'murder', vp: { x: 0, y: 0 }, vp0: { x: 0, y: 0 }, ox: 0, oy: 0, hb: 0.6, lastX: -999, lastY: -999, seep: 0, flowOn: false, flowT: 0, flowAcc: 0 }
  SK.build = function () {
    SK.base = corrSVG('cycle-k-lines')
    SK.lit = corrSVG('cycle-k-lines is-lit')
    SK.litWrap = el('div.cycle-k-litwrap', null, [SK.lit.svg])
    SK.lampsEl = el('div.cycle-k-lamps')
    SK.lamps = LAMPS.map(() => { const n = el('i.cycle-k-lamp'); SK.lampsEl.appendChild(n); return n })
    SK.cv = el('canvas.cycle-k-ink')
    SK.ink = new Ink(SK.cv)
    SK.walker = el('div.cycle-k-walker', { html: WALKER_SVG })
    SK.pass = el('div.cycle-k-pass')
    SK.move = el('div.cycle-k-move', null, [SK.base.svg, SK.lampsEl, SK.litWrap, SK.walker, SK.cv])
    SK.scene = el('div.cycle-k-scene', null, [SK.move])
    SK.frz = el('div.cycle-k-frz')
    SK.stampT = el('b')
    SK.stampD = el('span')
    SK.stamp = el('div.cycle-k-stamp', null, [SK.stampT, SK.stampD])
    SK.el = el('div.cycle-shot.cycle-k', null, [SK.scene, SK.pass, SK.stamp, SK.frz])
    return SK.el
  }
  SK.setCast = function () {
    SK.pass.textContent = ''
    const id = S.cast.K.id
    SK.pass.append(
      App.portrait(id, { silhouette: true, track: false, className: 'cycle-k-fig' }),
      App.portrait(id, { track: false, className: 'cycle-eyes' }),
      el('i.cycle-k-streak'),
    )
    warm(SK.pass)
  }
  SK.layout = function () {
    SK.vp0 = { x: S.W * 0.5, y: S.H * 0.46 }
    if (SK.vp.x === 0) SK.vp = { x: SK.vp0.x, y: SK.vp0.y }
    SK.base.svg.setAttribute('viewBox', `0 0 ${S.W} ${S.H}`)
    SK.lit.svg._cya = null // 亮线的 viewBox 每帧按光标写（见 update）
    SK.ink.resize(S.W, S.H)
    SK.inkK = S.mob ? 0.72 : 1
    const fs = clamp(S.W * 0.12, 54, 210)
    SK.frz.style.fontSize = fs + 'px'
    SK.redraw()
  }
  // 按基准消失点画（平移由 .cycle-k-move 负责）
  SK.redraw = function () {
    SK.geo = corrGeo(SK.vp0)
    corrDraw(SK.base, SK.geo)
    corrDraw(SK.lit, SK.geo)
    LAMPS.forEach((l, i) => {
      const p = SK.geo.P(l[0], -0.46, l[1])
      const s = clamp(300 * csc(l[1]), 14, 140)
      const n = SK.lamps[i]
      n.style.transform = `translate(${fx(p[0] - s / 2)}px, ${fx(p[1] - s / 2)}px)`
      n.style.width = n.style.height = fx(s) + 'px'
    })
  }
  SK.enter = function (dir, q) {
    PH.show(true)
    warm(SK.pass)
    const R = DAY - S.story.E
    SK.stampT.textContent = hms(R)
    SK.stampD.textContent = dayText(S.story.death) + '  ' + hhmm(S.story.death)
    SK.frz.textContent = hms(R)
    SK.hb = 0.4
    SK.lastX = SK.lastY = -999
    gsap.killTweensOf([SK.frz, SK.scene, SK.stamp])
    if (dir > 0 && !q && !App.reduced) {
      // 倒计时骤停：数字停在原处，划一道血线，然后缩进角落
      gsap.set(SK.scene, { opacity: 0 })
      gsap.set(SK.stamp, { opacity: 0 })
      const st = SK.stamp.getBoundingClientRect()
      const sr = S.rect
      const cy = S.H / 2, ty = st.top - sr.top + st.height * 0.3
      gsap.fromTo(SK.frz, { autoAlpha: 1, scale: 1, y: 0 }, { scale: 0.13, y: ty - cy, autoAlpha: 0, duration: 0.6, delay: 0.5, ease: 'expo.inOut', ...lift(SK.frz, 'transform, opacity') })
      SK.frz.classList.remove('is-cut'); void SK.frz.offsetWidth; SK.frz.classList.add('is-cut')
      gsap.to(SK.scene, { opacity: 1, duration: 0.9, delay: 0.45, ease: 'power2.out' })
      gsap.to(SK.stamp, { opacity: 1, duration: 0.3, delay: 1 })
      App.audio.sfx('stamp', { volume: 0.9, pitch: 0.62 })
      App.audio.sfx('heartbeat', { volume: 0.8, delay: 0.35 })
    } else {
      gsap.set(SK.frz, { autoAlpha: 0 })
      gsap.set([SK.scene, SK.stamp], { opacity: 1 })
    }
  }
  SK.leave = function () {
    gsap.killTweensOf([SK.frz, SK.pass])
    gsap.set(SK.frz, { autoAlpha: 0, willChange: 'auto' })
    gsap.set(SK.pass, { display: 'none' })
    SK.flowOn = false
  }
  SK.auto = function (t) {
    return [S.W * (0.5 + 0.26 * Math.sin(t * 0.5)), S.H * (0.7 + 0.12 * Math.sin(t * 0.9 + 0.6))]
  }
  SK.update = function (lp, dt, t) {
    const k = App.reduced ? 0.3 : 1
    const tx = S.W * 0.5 + (0.5 - S.cur.nx) * S.W * 0.07 * k
    const ty = S.H * 0.46 + (0.5 - S.cur.ny) * S.H * 0.05 * k
    SK.vp.x = lerp(SK.vp.x, tx, 0.06)
    SK.vp.y = lerp(SK.vp.y, ty, 0.06)
    const ox = SK.vp.x - SK.vp0.x, oy = SK.vp.y - SK.vp0.y
    SK.ox = ox; SK.oy = oy
    put(SK.move, 'transform', `translate3d(${fx(ox)}px, ${fx(oy)}px, 0)`)
    // 照亮的一圈：窗口中心 = 光标（换算到走廊层里）。窗里的亮线只有窗那么大（520×520），
    // 用 viewBox 取走廊里光标周围的那一块——不再是一整张比屏幕还大、只露出一小圈的合成层
    // 取整像素：光标停住后走廊还在缓缓归位的那几十帧里，亮线不必每帧重画（这一圈边缘本就是虚的）
    const lx = Math.round(S.cur.x - ox), ly = Math.round(S.cur.y - oy)
    put(SK.litWrap, 'transform', `translate3d(${lx}px, ${ly}px, 0)`)
    putAttr(SK.lit.svg, 'viewBox', `${lx - LIT_R} ${ly - LIT_R} ${LIT_R * 2} ${LIT_R * 2}`)

    // 远处的人影走进尽头的门
    const wk = seg(0.05, 0.34, lp)
    if (wk > 0 && lp < 0.42) {
      const tt = 0.94
      const u = lerp(-0.86, 0, eio(wk))
      const foot = SK.geo.P(u, 1, tt), head = SK.geo.P(u, -0.12, tt)
      const h = foot[1] - head[1], w = h * 0.4
      const bob = Math.abs(Math.sin(wk * 34)) * h * 0.025
      put(SK.walker, 'display', 'block')
      put(SK.walker, 'width', fx(w) + 'px')
      put(SK.walker, 'height', fx(h) + 'px')
      put(SK.walker, 'transform', `translate(${fx(foot[0] - w / 2)}px, ${fx(head[1] - bob)}px)`)
      put(SK.walker, 'opacity', (seg(0.05, 0.09, lp) * (1 - seg(0.34, 0.41, lp))).toFixed(3))
    } else put(SK.walker, 'display', 'none')

    // 墨迹（画布在走廊层里，随走廊一起平移）
    const cx = S.cur.rx - ox, cy = S.cur.ry - oy
    const inside = S.cur.rx >= 0 && S.cur.rx <= S.W && S.cur.ry >= 0 && S.cur.ry <= S.H
    if (inside && lp > 0.02 && !S.fast) {
      const d = Math.hypot(cx - SK.lastX, cy - SK.lastY)
      const sp = S.cur.speed
      if (d > 11) {
        if (SK.lastX > -900 && d < 160) {
          // 拖痕：慢拖粗、快甩细；不时积成一小滩
          const wr = clamp(8.5 - sp * 0.22, 2.2, 8.5) * SK.inkK
          SK.ink.add(SK.lastX, SK.lastY, wr, { x2: cx, y2: cy, grow: 0.18 })
          if (sp < 9 && Math.random() < 0.3) SK.ink.add(cx, cy, U.rand(7, 14) * SK.inkK, { grow: 0.6 })
          if (sp > 10 && Math.random() < 0.55) {
            const a = Math.atan2(cy - SK.lastY, cx - SK.lastX)
            for (let i = 0; i < 2; i++) {
              const dd = U.rand(12, 46), aa = a + U.rand(-0.5, 0.5)
              SK.ink.add(cx + Math.cos(aa) * dd, cy + Math.sin(aa) * dd, U.rand(1.2, 3.6) * SK.inkK, { grow: 0.15 })
            }
          }
        }
        SK.lastX = cx; SK.lastY = cy; SK.seep = 0
      } else {
        SK.seep += dt
        if (SK.seep > 0.42) { SK.seep = 0; SK.ink.add(cx + U.rand(-5, 5), cy + U.rand(-5, 5), U.rand(9, 20) * SK.inkK, { grow: 1.4, wet: 2.2 }) }
      }
    }
    // 案发后：血从尽头的门里沿地面流出来
    if (SK.flowOn) {
      SK.flowT += dt
      SK.flowAcc += dt
      while (SK.flowAcc > 0.07 && SK.flowT < 4.4) {
        SK.flowAcc -= 0.07
        const q2 = SK.flowT / 4.4
        const tt = 0.99 - eo3(q2) * 0.6
        const g0 = corrGeo(SK.vp0)
        const p = g0.P(U.rand(-0.15, 0.15) * (1 - q2 * 0.3), 1, tt)
        SK.ink.add(p[0], p[1] + U.rand(-2, 2), (5 + 120 * csc(tt)) * U.rand(0.65, 1.15) * SK.inkK, { grow: 0.9, wet: 2.4, sq: 0.42 })
      }
      if (SK.flowT >= 4.4) SK.flowOn = false
    }
    SK.ink.step(dt)
    SK.ink.draw()

    SK.flicker(t)

    SK.hb -= dt
    if (SK.hb <= 0 && !S.fast) { App.audio.sfx('heartbeat', { volume: 0.42 }); SK.hb = clamp(1.4 - S.cur.speed / 28, 0.55, 1.4) }
    setPhaseFill(lp)
  }
  /* 壁灯闪烁：原 CSS 动画 cycle-lamp 4.3s steps(1)，八盏各错开 0.73 秒。steps(1) 是一段段的常值，
     CSS 动画却每帧都要在主线程上重算这八个元素的样式；改为只在换档的那一帧写 opacity（每盏 4.3 秒里换 6 次） */
  const LAMP_K = [[0, 1], [0.41, 0.55], [0.43, 1], [0.71, 0.82], [0.72, 0.25], [0.74, 0.95]]
  SK.flicker = function (t) {
    SK.lamps.forEach((n, i) => {
      const u = (((t + i * 0.73) % 4.3) + 4.3) % 4.3 / 4.3
      let v = 1
      for (const [a, o] of LAMP_K) if (u >= a) v = o
      put(n, 'opacity', String(v))
    })
  }
  SK.doPass = function () {
    gsap.killTweensOf(SK.pass)
    const h = S.H * 1.32, w = h * 0.75
    gsap.set(SK.pass, { display: 'block', x: -w * 1.02, skewX: -4 })
    gsap.to(SK.pass, { x: S.W + w * 0.05, skewX: -14, duration: App.reduced ? 1.4 : 0.66, ease: 'power3.inOut', onComplete: () => gsap.set(SK.pass, { display: 'none' }) })
    SK.lampsEl.classList.add('is-out')
    later(() => SK.lampsEl.classList.remove('is-out'), 560)
    App.audio.sfx('whoosh', { volume: 1, pitch: 0.75 })
    App.audio.sfx('heartbeat', { volume: 0.95, delay: 0.5 })
    App.bg.pulse(0.3, 0.8)
  }
  SK.beats = [
    { at: 0.46, on(q) { if (!q) SK.doPass() }, off() { gsap.killTweensOf(SK.pass); gsap.set(SK.pass, { display: 'none' }) } },
    {
      at: 0.53,
      on(q) {
        SK.el.classList.add('is-dead')
        if (!q) { SK.flowOn = true; SK.flowT = 0; SK.flowAcc = 0; App.audio.sfx('heartbeat', { volume: 1, delay: 0.1 }) }
      },
      off() { SK.el.classList.remove('is-dead'); SK.flowOn = false },
    },
  ]

  /* =========================================================
     镜头 3 · 发现
     ========================================================= */
  const SD = { key: 'discover' }
  SD.build = function () {
    // 放射的血光（原 .cycle-d-rays：满屏 repeating-conic + 径向遮罩 + CSS 闪烁动画）画成一张静止的画布（遮罩烘焙进去，
    // 不再有离屏遮罩面），闪烁只改这张画布的 opacity（合成层，不重画）；
    // 走廊线（原一张满屏 SVG）与干透的墨迹（原一张画布）合画在另一张画布上。两张都只在进入镜头/重排时画一次
    SD.rcv = el('canvas.cycle-d-rays')
    SD.cv = el('canvas.cycle-d-ink')
    SD.pool = el('i.cycle-d-pool')
    SD.body = el('div.cycle-d-body', { html: `<svg viewBox="-110 -60 220 120" aria-hidden="true">${bodyShape(7, 'b-rim')}${bodyShape(0, 'b-fill')}</svg>` })
    SD.scene = el('div.cycle-d-scene', null, [SD.rcv, SD.cv, SD.pool, SD.body])
    // 粉点网放在场景下面（原先在上面，会把它下面的层都逼成合成层；粉点只在四周，与场景几乎不重叠）
    SD.dots = el('div.cycle-d-dots')
    SD.stampT = el('b')
    SD.stampD = el('span')
    SD.stamp = el('div.cycle-d-stamp', null, [el('i'), SD.stampT, SD.stampD])
    SD.el = el('div.cycle-shot.cycle-d', null, [SD.dots, SD.scene, SD.stamp])
    return SD.el
  }
  SD.layout = function () {
    if (SD.el.classList.contains('is-on')) SD.place()
  }
  // 与原 SVG（.cycle-d-lines）同样的笔画：先填后描，次序 doorway → joint → run → rib → door → edge → far
  const D_LINE = 'rgba(235, 227, 214, .14)'
  const D_PATHS = [
    ['doorway', 'rgba(60, 4, 20, .8)', 'rgba(255, 46, 126, .4)'],
    ['joint', null, D_LINE], ['run', null, 'rgba(255, 46, 126, .3)'], ['rib', null, D_LINE],
    ['door', 'rgba(0, 0, 0, .5)', D_LINE], ['edge', null, D_LINE], ['far', null, D_LINE],
  ]
  const D_M = 20 // 画布四周多出的边：场景随光标视差平移（±12px）时边上不露空
  // 血光的闪烁：原 CSS 动画 cycle-rays 2.4s steps(3)（关键帧 0% .7 → 33% 1 → 66% .55 → 100% .7）
  const D_K = [[0, 0.7], [0.33, 1], [0.66, 0.55], [1, 0.7]]
  function raysAlpha(t) {
    const u = (((t % 2.4) + 2.4) % 2.4) / 2.4
    let i = 0
    while (i < 2 && u >= D_K[i + 1][0]) i++
    const v = (u - D_K[i][0]) / (D_K[i + 1][0] - D_K[i][0])
    return D_K[i][1] + (D_K[i + 1][1] - D_K[i][1]) * (Math.floor(v * 3) / 3)
  }
  SD.place = function () {
    const vp = SK.vp.x ? SK.vp : { x: S.W * 0.5, y: S.H * 0.46 }
    const g = corrGeo(vp)
    const tb = 0.34
    const c = g.P(0.06, 1, tb)
    const len = g.hw * 2 * csc(tb) * 0.82
    SD.body.style.width = fx(len) + 'px'
    SD.body.style.height = fx(len * 0.545) + 'px'
    SD.body.style.transform = `translate(${fx(c[0] - len / 2)}px, ${fx(c[1] - len * 0.545 / 2)}px) rotate(-4deg) scaleY(.36)`
    // 血泊：比尸体宽，偏向头部一侧（人形头朝左）
    SD.pool.style.width = fx(len * 1.05) + 'px'
    SD.pool.style.height = fx(len * 0.36) + 'px'
    SD.poolT = `translate(${fx(c[0] - len * 0.78)}px, ${fx(c[1] - len * 0.15)}px) rotate(-4deg)`
    SD.pg = null
    SD.setPool(SD.pgv == null ? 1 : SD.pgv)
    SD.el.style.setProperty('--bx', fx(c[0]) + 'px')
    SD.el.style.setProperty('--by', fx(c[1]) + 'px')
    SD.bx = +fx(c[0]); SD.by = +fx(c[1])
    // 墨迹快照：与行凶镜头同一位置，已经干透
    SK.ink.bakeAll()
    SK.ink.draw()
    // 画布分辨率：细线要清楚（最多 2 倍）；画质降级时 1.5 / 1 倍
    const k = Math.min(S.q >= 2 ? 2 : S.q === 1 ? 1.5 : 1, window.devicePixelRatio || 1)
    SD.k = k
    const w = Math.max(2, Math.round((S.W + D_M * 2) * k)), h = Math.max(2, Math.round((S.H + D_M * 2) * k))
    const kr = Math.min(k, 1.5), wr = Math.max(2, Math.round((S.W + D_M * 2) * kr)), hr = Math.max(2, Math.round((S.H + D_M * 2) * kr))
    if (SD.cv.width !== w || SD.cv.height !== h) { SD.cv.width = w; SD.cv.height = h }
    if (SD.rcv.width !== wr || SD.rcv.height !== hr) { SD.rcv.width = wr; SD.rcv.height = hr }
    const box = { left: -D_M + 'px', top: -D_M + 'px', width: `calc(100% + ${D_M * 2}px)`, height: `calc(100% + ${D_M * 2}px)` }
    Object.assign(SD.cv.style, box)
    Object.assign(SD.rcv.style, box)
    SD.drawRays(kr)
    SD.drawLines(g, k)
    SD.ra = -1
  }
  // 血光：原元素盒子是舞台四周各扩 10%，conic 中心 at (--bx + 1.25%, --by)、遮罩 circle at 50% 62%（farthest-corner），
  // 都按那个盒子换算到屏幕坐标；每 4° 一道、亮 0.8°（3.2°–4°），从 12 点钟方向起顺时针
  SD.drawRays = function (k) {
    const ctx = SD.rcv.getContext('2d'), W = S.W, H = S.H
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, SD.rcv.width, SD.rcv.height)
    ctx.setTransform(k, 0, 0, k, D_M * k, D_M * k)
    const X0 = -0.1 * W, Y0 = -0.1 * H, BW = 1.2 * W, BH = 1.2 * H
    const cx = X0 + SD.bx + 0.0125 * BW, cy = Y0 + SD.by
    const R = 3 * Math.max(W, H)
    ctx.fillStyle = 'rgba(255, 46, 126, .12)'
    ctx.beginPath()
    for (let i = 0; i < 90; i++) {
      const a1 = ((4 * i + 3.2 - 90) * Math.PI) / 180, a2 = ((4 * i + 4 - 90) * Math.PI) / 180
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R)
      ctx.lineTo(cx + Math.cos(a2) * R, cy + Math.sin(a2) * R)
      ctx.closePath()
    }
    ctx.fill()
    const mx = X0 + 0.5 * BW, my = Y0 + 0.62 * BH
    const fr = Math.hypot(Math.max(mx - X0, X0 + BW - mx), Math.max(my - Y0, Y0 + BH - my))
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, fr)
    mg.addColorStop(0.08, 'rgba(0,0,0,0)'); mg.addColorStop(0.34, 'rgba(0,0,0,1)'); mg.addColorStop(0.78, 'rgba(0,0,0,0)')
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = mg
    ctx.fillRect(X0, Y0, BW, BH)
    ctx.globalCompositeOperation = 'source-over'
  }
  SD.drawLines = function (g, k) {
    const ctx = SD.cv.getContext('2d'), W = S.W, H = S.H
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, SD.cv.width, SD.cv.height)
    ctx.setTransform(k, 0, 0, k, D_M * k, D_M * k)
    // 走廊线
    ctx.lineWidth = 1
    for (const [key, fill, stroke] of D_PATHS) {
      const path = new Path2D(g[key])
      if (fill) { ctx.fillStyle = fill; ctx.fill(path) }
      ctx.strokeStyle = stroke; ctx.stroke(path)
    }
    // 墨迹（原画布 CSS 不透明度 .9）：放到行凶镜头里墨迹随走廊平移到的位置
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 0.9
    ctx.drawImage(SK.cv, (D_M + SK.ox) * k, (D_M + SK.oy) * k, W * k, H * k)
    ctx.globalAlpha = 1
  }
  // 离开很远时释放画布（回来时 SD.place 重画）
  SD.release = function () { SD.cv.width = SD.cv.height = SD.rcv.width = SD.rcv.height = 1 }
  SD.enter = function (dir, q) {
    PH.show(true)
    SD.place()
    SD.stampT.textContent = hhmm(S.story.disc)
    SD.stampD.textContent = dayText(S.story.disc)
    SD.el.classList.remove('is-hit')
    if (dir > 0 && !q) {
      void SD.el.offsetWidth
      SD.el.classList.add('is-hit')
      App.flash(App.color.blood, { opacity: App.reduced ? 0.4 : 0.88, duration: 0.85, hold: 0.06 })
      App.audio.sfx('discover')
      App.bg.pulse(1.1, 1.8)
      if (!App.reduced) shake(13, 0.55)
    }
  }
  SD.leave = function () { hush(); SD.el.classList.remove('is-hit') }
  // 血泊随滚动漫开：scale 写在 transform 最外层（与原先 CSS 的 scale 属性同一顺序）
  SD.setPool = function (pg) {
    SD.pgv = pg
    const v = pg.toFixed(3)
    if (v === SD.pg || !SD.poolT) return
    SD.pg = v
    SD.pool.style.transform = `scale(${v}) ${SD.poolT}`
  }
  SD.update = function (lp, dt, t) {
    put(SD.rcv, 'opacity', raysAlpha(t).toFixed(3)) // 血光闪烁：只在换档时改 opacity（合成层）
    // 场景随光标视差：整层（合成层）平移，不再改继承的自定义属性（那会让血泊等每帧重画）
    put(SD.scene, 'transform', `translate3d(${fx((S.cur.nx - 0.5) * -24)}px, ${fx((S.cur.ny - 0.5) * -18)}px, 0)`)
    put(SD.scene, 'opacity', (1 - sstep(0.8, 1, lp) * 0.65).toFixed(3))
    SD.setPool(0.45 + 0.55 * eo3(seg(0, 0.7, lp)))
    setPhaseFill(lp)
  }
  SD.beats = [
    {
      at: 0.05,
      on(q) { say(bcSegs('尸体被有效发现', { '开庭时刻': ' ' + hhmm(S.story.court) + ' ' }), { instant: q, delay: q ? 0 : 380 }) },
      off() { hush() },
    },
  ]

  /* =========================================================
     镜头 4 · 调查（圆环计时器 + 放大镜）
     ========================================================= */
  const SI = { key: 'inv', traces: [], found: new Set(), lx: 0, ly: 0, lastRem: -1, lastStage: '', lensOn: false, autoI: 0 }
  SI.build = function () {
    SI.base = U.svg('svg', { class: 'cycle-i-scene', 'aria-hidden': 'true' })
    SI.lit = U.svg('svg', { class: 'cycle-i-scene is-lit', 'aria-hidden': 'true' })
    SI.floor = el('div.cycle-i-floor', null, [SI.base])
    SI.lens = el('div.cycle-i-lens', null, [SI.lit])
    SI.rim = el('div.cycle-i-rim', null, [el('i')])
    SI.remB = el('b')
    SI.courtT = el('span')
    SI.read = el('div.cycle-i-read', null, [el('div.cycle-i-rem', null, [SI.remB, el('em', { text: '分' })]), el('p', null, [el('em', { text: '开庭' }), SI.courtT])])
    SI.el = el('div.cycle-shot.cycle-i', null, [SI.floor, SI.lens, SI.rim, SI.read])
    return SI.el
  }
  // 现场：地面拼缝、尸体、痕迹、圆环；lit 版带标签与尸体变化
  SI.layout = function () {
    const W = S.W, H = S.H
    const C = [W * 0.5, H * (S.mob ? 0.47 : 0.5)]
    const R = Math.min(W, H) * (S.mob ? 0.335 : 0.35)
    SI.C = C; SI.R = R
    SI.LR = clamp(Math.min(W, H) * 0.15, 66, 128)
    const rnd = U.seeded(S.seed + 77)
    const jit = v => v + (rnd() - 0.5) * 0.12
    const xmin = S.mob ? 26 : W * 0.2, xmax = W - (S.mob ? 26 : W * 0.13), ymin = H * 0.12, ymax = H * 0.88
    const at = (dx, dy) => [clamp(C[0] + jit(dx) * R, xmin, xmax), clamp(C[1] + jit(dy) * R, ymin, ymax)]
    const T = []
    const deg = r => (r * 180) / Math.PI

    // 鞋印：一串脚印离开尸体
    {
      const a = at(0.34, 0.3), b = at(1.22, 0.9)
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
      const nx = -Math.sin(ang), ny = Math.cos(ang)
      const sc = (R * 0.072) / 27
      let m = ''
      const pts = []
      for (let i = 0; i < 7; i++) {
        const q = i / 6, s = i % 2 ? 1 : -1
        const x = lerp(a[0], b[0], q) + nx * s * R * 0.03, y = lerp(a[1], b[1], q) + ny * s * R * 0.03
        pts.push([x, y])
        m += `<path d="${SOLE}" transform="translate(${fx(x)} ${fx(y)}) rotate(${fx(deg(ang) + 90 + s * 6)}) scale(${(sc * (s > 0 ? -1 : 1)).toFixed(3)} ${sc.toFixed(3)})"/>`
      }
      T.push({ id: 'shoe', cls: 'tr-shoe', m, pts, lbl: clueName('woodprint', '鞋印'), lp: [b[0] - R * 0.05, b[1] + R * 0.12] })
    }
    // 血滴
    {
      const c = at(-0.4, 0.24)
      let m = ''
      const pts = [c]
      for (let i = 0; i < 11; i++) {
        const a = rnd() * TAU, d = rnd() * R * 0.17
        const x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d
        const r = R * (0.005 + rnd() * 0.012)
        if (i < 3) {
          m += `<ellipse cx="${fx(x)}" cy="${fx(y)}" rx="${fx(r * 2.4)}" ry="${fx(r * 0.9)}" transform="rotate(${fx(deg(a))} ${fx(x)} ${fx(y)})"/>`
          m += `<circle cx="${fx(x + Math.cos(a) * r * 4)}" cy="${fx(y + Math.sin(a) * r * 4)}" r="${fx(r * 0.45)}"/>`
        } else m += `<circle cx="${fx(x)}" cy="${fx(y)}" r="${fx(r)}"/>`
        if (i % 4 === 0) pts.push([x, y])
      }
      T.push({ id: 'drops', cls: 'tr-blood', m, pts, lbl: '', lp: [c[0], c[1] + R * 0.22] })
    }
    // 杯沿唇印：碎玻璃
    {
      const c = at(0.74, -0.52)
      let m = ''
      for (let i = 0; i < 9; i++) {
        const a = rnd() * TAU, d = R * (0.02 + rnd() * 0.11)
        const x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d
        const s = R * (0.012 + rnd() * 0.03), r0 = rnd() * TAU
        m += `<path d="M${fx(x + Math.cos(r0) * s)} ${fx(y + Math.sin(r0) * s)}L${fx(x + Math.cos(r0 + 2.3) * s * 0.7)} ${fx(y + Math.sin(r0 + 2.3) * s * 0.7)}L${fx(x + Math.cos(r0 + 3.9) * s)} ${fx(y + Math.sin(r0 + 3.9) * s)}Z"/>`
      }
      m += `<circle class="g-foot" cx="${fx(c[0] - R * 0.05)}" cy="${fx(c[1] + R * 0.02)}" r="${fx(R * 0.034)}"/>`
      m += `<path class="g-stem" d="M${fx(c[0] - R * 0.05)} ${fx(c[1] + R * 0.02)}L${fx(c[0] + R * 0.035)} ${fx(c[1] - R * 0.035)}"/>`
      m += `<path class="g-lip" d="M${fx(c[0] + R * 0.05)} ${fx(c[1] - R * 0.08)}q${fx(R * 0.03)} ${fx(-R * 0.025)} ${fx(R * 0.06)} 0"/>`
      T.push({ id: 'glass', cls: 'tr-glass', m, pts: [c], lbl: clueName('lipstick', '杯沿唇印'), lp: [c[0], c[1] - R * 0.2] })
    }
    // 停住的钟
    {
      const c = at(-0.98, -0.56)
      const r = R * 0.09
      const tm = (S.story ? Math.floor(S.story.death) + S.story.drift : T_MANDATE) % 720
      const ha = (tm / 720) * TAU, ma = ((tm % 60) / 60) * TAU
      let m = `<circle class="c-face" cx="${fx(c[0])}" cy="${fx(c[1])}" r="${fx(r)}"/>`
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU
        m += `<path class="c-tk" d="M${fx(c[0] + Math.sin(a) * r * 0.78)} ${fx(c[1] - Math.cos(a) * r * 0.78)}L${fx(c[0] + Math.sin(a) * r * 0.9)} ${fx(c[1] - Math.cos(a) * r * 0.9)}"/>`
      }
      m += `<path class="c-h" d="M${fx(c[0])} ${fx(c[1])}L${fx(c[0] + Math.sin(ha) * r * 0.5)} ${fx(c[1] - Math.cos(ha) * r * 0.5)}"/>`
      m += `<path class="c-m" d="M${fx(c[0])} ${fx(c[1])}L${fx(c[0] + Math.sin(ma) * r * 0.74)} ${fx(c[1] - Math.cos(ma) * r * 0.74)}"/>`
      m += `<path class="c-crack" d="M${fx(c[0] - r * 0.6)} ${fx(c[1] - r * 0.5)}l${fx(r * 0.5)} ${fx(r * 0.35)}l${fx(r * 0.1)} ${fx(r * 0.55)}m${fx(-r * 0.1)} ${fx(-r * 0.55)}l${fx(r * 0.6)} ${fx(-r * 0.1)}"/>`
      const tl = tm ? pad2(Math.floor(tm / 60) || 12) + ':' + pad2(tm % 60) : '12:00'
      SI.clk = { c, r }
      T.push({ id: 'clock', cls: 'tr-clock', m, pts: [c], lbl: tl, lp: [c[0], c[1] + r + R * 0.09] })
    }
    // 手套污印
    {
      const c = at(0.6, 0.06)
      const sc = (R * 0.13) / 30
      let m = `<path d="${HAND}" transform="translate(${fx(c[0])} ${fx(c[1])}) rotate(${fx(-30 + rnd() * 30)}) scale(${sc.toFixed(3)})"/>`
      for (let i = 0; i < 4; i++) m += `<path class="g-smear" d="M${fx(c[0] - R * 0.05)} ${fx(c[1] + R * (0.05 + i * 0.012))}l${fx(R * (0.1 + rnd() * 0.06))} ${fx(R * 0.02)}"/>`
      T.push({ id: 'glove', cls: 'tr-glove', m, pts: [c], lbl: clueName('gloves', '手套污印'), lp: [c[0] + R * 0.02, c[1] - R * 0.14] })
    }
    // 擦洗边界
    {
      const c = at(-0.66, 0.74)
      let m = ''
      for (let i = 0; i < 6; i++) {
        const r = R * (0.05 + i * 0.022), a0 = -2.4 + rnd() * 0.3, a1 = -0.5 - rnd() * 0.3
        m += `<path d="M${fx(c[0] + Math.cos(a0) * r)} ${fx(c[1] + Math.sin(a0) * r)}A${fx(r)} ${fx(r)} 0 0 1 ${fx(c[0] + Math.cos(a1) * r)} ${fx(c[1] + Math.sin(a1) * r)}"/>`
      }
      m += `<path class="g-edge" d="M${fx(c[0] - R * 0.2)} ${fx(c[1] + R * 0.04)}L${fx(c[0] + R * 0.2)} ${fx(c[1] + R * 0.04)}"/>`
      T.push({ id: 'scrub', cls: 'tr-scrub', m, pts: [[c[0], c[1] - R * 0.06]], lbl: clueName('scrub', '擦洗边界'), lp: [c[0], c[1] + R * 0.16] })
    }
    SI.traces = T

    // 地面拼缝
    const gs = R * 0.46
    let seams = ''
    for (let x = C[0] % gs - gs; x < W + gs; x += gs) seams += `M${fx(x)} 0V${fx(H)}`
    for (let y = C[1] % (gs * 1.5) - gs * 1.5; y < H + gs; y += gs * 1.5) seams += `M0 ${fx(y)}H${fx(W)}`
    // 圆环刻度
    let tk = '', tkM = ''
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU
      const major = i % 10 === 0
      const r0 = R + (major ? 7 : 8), r1 = R + (major ? 22 : 14)
      const d = `M${fx(C[0] + Math.sin(a) * r0)} ${fx(C[1] - Math.cos(a) * r0)}L${fx(C[0] + Math.sin(a) * r1)} ${fx(C[1] - Math.cos(a) * r1)}`
      if (major) tkM += d; else tk += d
    }
    let nums = ''
    for (const [m0, lab] of [[0, '120'], [30, '90'], [60, '60'], [90, '30']]) {
      const a = (m0 / 120) * TAU, r = R + (S.mob ? 30 : 40)
      nums += `<text class="r-num" x="${fx(C[0] + Math.sin(a) * r)}" y="${fx(C[1] - Math.cos(a) * r + 4)}">${lab}</text>`
    }
    const bodyLen = R * 0.98
    const bsc = bodyLen / 200
    const bodyT = `translate(${fx(C[0])} ${fx(C[1])}) rotate(-16) scale(${bsc.toFixed(4)})`
    const bodyG = `<g class="i-body" transform="${bodyT}">${bodyShape(6, 'b-rim')}${bodyShape(0, 'b-fill')}<g class="b-cloth">${bodyShape(0, 'b-cl')}</g></g>`

    // 剩余时间的亮弧拆成四段（每段一个象限，从 12 点钟起顺时针）：滚动时只有指针所在那一段在变，
    // 重画的只是那四分之一圈（原先一整个圆，每一步都重画整个圆环那么大一块）
    const qp = a => `${fx(C[0] + Math.sin(a) * R)} ${fx(C[1] - Math.cos(a) * R)}`
    const arcs = [0, 1, 2, 3].map(k => `<path class="r-arc" pathLength="1" d="M${qp((k * Math.PI) / 2)}A${fx(R)} ${fx(R)} 0 0 1 ${qp(((k + 1) * Math.PI) / 2)}"/>`).join('')
    const ring = lit => `<g class="i-ring">
      <circle class="r-track" cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(R)}" pathLength="1" transform="rotate(-90 ${fx(C[0])} ${fx(C[1])})"/>
      <path class="r-tk" d="${tk}"/><path class="r-tkm" d="${tkM}"/>
      ${arcs}
      <circle class="r-hand" cx="${fx(C[0])}" cy="${fx(C[1] - R)}" r="${lit ? 4 : 4.5}"/>${nums}</g>`

    const traces = lit => T.map((t, i) => `<g class="cycle-tr ${t.cls}" data-i="${i}">${t.m}</g>`).join('') +
      (lit ? T.map(t => (t.lbl ? `<text class="i-lbl${t.id === 'clock' ? ' i-clk' : ''}" x="${fx(t.lp[0])}" y="${fx(t.lp[1])}">${U.esc(t.lbl)}</text>` : '')).join('') : '')
    const mk0 = T.map((t, i) => `<g class="i-mk" data-i="${i}" transform="translate(${fx(t.pts[0][0] + R * 0.07)} ${fx(t.pts[0][1] - R * 0.07)})"><path d="M0 -15L10 4H-10Z"/><text y="1.5">${i + 1}</text></g>`).join('')
    const stageX = C[0] - R * 0.5, stageY = C[1] - R * 0.36

    SI.base.setAttribute('viewBox', `0 0 ${W} ${H}`)
    SI.lit.setAttribute('viewBox', `0 0 ${W} ${H}`)
    SI.base.innerHTML = `<path class="i-seam" d="${seams}"/>${bodyG}${traces(false)}${ring(false)}<g class="i-mks">${mk0}</g>`
    SI.lit.innerHTML = `<rect class="i-litbg" width="${W}" height="${H}"/><path class="i-seam" d="${seams}"/>${bodyG}${traces(true)}${ring(true)}<text class="i-stage" x="${fx(stageX)}" y="${fx(stageY)}"></text>`
    SI.rings = [SI.base, SI.lit].map(s => ({ track: s.querySelector('.r-track'), arcs: Array.from(s.querySelectorAll('.r-arc')), hand: s.querySelector('.r-hand') }))
    SI.trBase = Array.from(SI.base.querySelectorAll('.cycle-tr'))
    SI.trLit = Array.from(SI.lit.querySelectorAll('.cycle-tr'))
    SI.mks = Array.from(SI.base.querySelectorAll('.i-mk'))
    SI.stageEl = SI.lit.querySelector('.i-stage')
    SI.bodies = [SI.base, SI.lit].map(s => s.querySelector('.i-body'))
    SI.clkEls = { h: SI.svgs().map(s => s.querySelector('.tr-clock .c-h')), m: SI.svgs().map(s => s.querySelector('.tr-clock .c-m')), lbl: SI.lit.querySelector('.i-clk') }
    SI.clockFor = S.story ? S.story.death : null
    SI.lens.style.setProperty('--lr', fx(SI.LR) + 'px')
    // 放大镜里的现场只有镜片那么大：SVG 边长 2·LR/1.4、CSS 放大 1.4 倍，viewBox 每帧取光标周围那一块
    // （原先是整张现场 SVG 放大 1.4 倍、比屏幕还大的合成层，只露出镜片那一圈）
    SI.lit.style.width = SI.lit.style.height = fx((SI.LR * 2) / 1.4) + 'px'
    SI.rim.style.width = SI.rim.style.height = fx(SI.LR * 2) + 'px'
    if (SI.lens._cy) SI.lens._cy = null
    SI.lit._cya = null
    SI.lastRem = -1
    SI.lastStage = ''
    SI.order = []
    // 已找到的痕迹保留
    for (const id of SI.found) { const i = T.findIndex(t => t.id === id); if (i >= 0) SI.mark(i, true) }
    SI.applyBody()
  }
  SI.svgs = () => [SI.base, SI.lit]
  // 停住的钟：与 SI.layout 里同样的算法
  SI.setClock = function () {
    const E = SI.clkEls, K = SI.clk
    if (!E || !K) return
    const c = K.c, r = K.r
    const tm = (S.story ? Math.floor(S.story.death) + S.story.drift : T_MANDATE) % 720
    const ha = (tm / 720) * TAU, ma = ((tm % 60) / 60) * TAU
    const dh = `M${fx(c[0])} ${fx(c[1])}L${fx(c[0] + Math.sin(ha) * r * 0.5)} ${fx(c[1] - Math.cos(ha) * r * 0.5)}`
    const dm = `M${fx(c[0])} ${fx(c[1])}L${fx(c[0] + Math.sin(ma) * r * 0.74)} ${fx(c[1] - Math.cos(ma) * r * 0.74)}`
    for (const n of E.h) if (n) n.setAttribute('d', dh)
    for (const n of E.m) if (n) n.setAttribute('d', dm)
    if (E.lbl) E.lbl.textContent = tm ? pad2(Math.floor(tm / 60) || 12) + ':' + pad2(tm % 60) : '12:00'
  }
  SI.mark = function (i, quiet) {
    const t = SI.traces[i]
    if (!t) return
    if (!SI.found.has(t.id)) SI.found.add(t.id)
    if (SI.order.indexOf(i) < 0) SI.order.push(i)
    SI.trBase[i].classList.add('is-found')
    SI.trLit[i].classList.add('is-found')
    const mkEl = SI.mks[i]
    mkEl.querySelector('text').textContent = String(SI.order.indexOf(i) + 1)
    mkEl.classList.add('is-on')
    if (!quiet) {
      App.audio.sfx('tick', { volume: 0.9, pitch: 1.9, pan: (t.pts[0][0] / S.W - 0.5) * 1.2 })
      App.audio.sfx('tick', { volume: 0.5, pitch: 2.4, delay: 0.07 })
      mkEl.classList.remove('is-pop'); void mkEl.getBoundingClientRect(); mkEl.classList.add('is-pop')
    }
  }
  SI.applyBody = function () {
    for (const b of SI.bodies) if (b) b.classList.toggle('is-gone', !!SI.gone)
  }
  SI.enter = function () {
    PH.show(true)
    SI.courtT.textContent = hhmm(S.story.court)
    SI.lastRem = -1
    SI.lastStage = ''
    SI.lx = S.cur.rx; SI.ly = S.cur.ry
    // 钟的读数随死亡时刻变化：只改两根指针与读数（原先整个现场的两张 SVG 推倒重建，几百个节点重算样式）
    if (SI.clockFor !== S.story.death) { SI.clockFor = S.story.death; SI.setClock() }
  }
  SI.leave = function () { SI.lens.classList.remove('is-on'); SI.rim.classList.remove('is-on') }
  SI.auto = function (t) {
    const T = SI.traces
    if (!T.length) return null
    const k = Math.floor(t / 1.9) % T.length
    const p = T[k].pts[Math.floor(T[k].pts.length / 2)]
    return [p[0] + Math.sin(t * 1.7) * 14, p[1] + Math.cos(t * 1.3) * 10]
  }
  SI.update = function (lp, dt, t) {
    const e = eio(seg(0, 0.12, lp))
    put(SI.floor, 'transform', e >= 1 ? 'none' : `perspective(${fx(S.H * 1.5)}px) rotateX(${(56 * (1 - e)).toFixed(2)}deg) scale(${(1.3 - 0.3 * e).toFixed(4)})`)
    put(SI.floor, 'willChange', e >= 1 ? 'auto' : 'transform') // 地面只在倾倒入场时是合成层，放平后画进舞台层
    put(SI.floor, 'opacity', (0.15 + 0.85 * seg(0, 0.05, lp)).toFixed(3))
    // 圆环按 1/480 圈（0.75°）取整：平滑滚动收尾的那串极小的位移不再一帧帧重画圆环
    const q480 = v => Math.round(v * 480) / 480
    const draw = q480(eo3(seg(0, 0.11, lp)))
    const ef = seg(0.12, 0.92, lp)
    const minutes = Math.round(ef * 120)
    const rem = 120 - minutes
    const efq = q480(ef)
    const remF = 1 - efq
    const ha = -Math.PI / 2 + TAU * efq
    // 亮弧 = [efq, efq + remF·draw]（圈），落到四段上各自的一截
    const a0 = efq, a1 = efq + remF * draw
    for (const r of SI.rings) {
      put(r.track, 'strokeDasharray', `${draw.toFixed(4)} 1`)
      r.arcs.forEach((n, k) => {
        const q0 = k / 4, s0 = Math.max(a0, q0), e0 = Math.min(a1, q0 + 0.25)
        put(n, 'strokeDasharray', e0 > s0 ? `${((e0 - s0) * 4).toFixed(4)} 1` : '0 1')
        put(n, 'strokeDashoffset', e0 > s0 ? (-(s0 - q0) * 4).toFixed(4) : '0')
      })
      putAttr(r.hand, 'cx', fx(SI.C[0] + Math.cos(ha) * SI.R))
      putAttr(r.hand, 'cy', fx(SI.C[1] + Math.sin(ha) * SI.R))
    }
    if (rem !== SI.lastRem) {
      SI.remB.textContent = String(rem).padStart(3, '0')
      SI.read.classList.toggle('is-low', rem <= 15)
      if (SI.lastRem >= 0 && !S.fast) App.audio.sfx('tick', { volume: rem <= 15 ? 0.55 : 0.3, pitch: rem <= 15 ? 1.3 : 1 })
      SI.lastRem = rem
    }
    const st = stageAt(S.story.delta + minutes)
    if (st !== SI.lastStage) { SI.lastStage = st; SI.stageEl.textContent = st }
    put(SI.read, 'opacity', seg(0.04, 0.12, lp).toFixed(3))
    const tension = 0.45 + 0.5 * ef
    if (App.state.section === 'cycle' && Math.abs(tension - S.tension) > 0.05) setTension(tension)

    // 放大镜
    const on = lp > 0.115
    if (on !== SI.lensOn) { SI.lensOn = on; SI.lens.classList.toggle('is-on', on); SI.rim.classList.toggle('is-on', on) }
    if (on) {
      SI.lx = lerp(SI.lx, S.cur.rx, 0.3)
      SI.ly = lerp(SI.ly, S.cur.ry, 0.3)
      // 放大镜：圆形小窗跟着光标平移，窗里的现场放大 1.4 倍、反向平移（都是合成层，不重画）
      const lx = +fx(SI.lx), ly = +fx(SI.ly)
      const vw = SI.LR / 1.4
      put(SI.lens, 'transform', `translate3d(${lx}px, ${ly}px, 0)`)
      putAttr(SI.lit, 'viewBox', `${fx(lx - vw)} ${fx(ly - vw)} ${fx(vw * 2)} ${fx(vw * 2)}`)
      put(SI.rim, 'transform', `translate3d(${fx(lx - SI.LR)}px, ${fx(ly - SI.LR)}px, 0)`)
      const rr = (SI.LR / 1.4) * 0.82
      SI.traces.forEach((tr, i) => {
        if (SI.found.has(tr.id) && SI.order.indexOf(i) >= 0) return
        for (const p of tr.pts) if (Math.hypot(p[0] - SI.lx, p[1] - SI.ly) < rr) { SI.mark(i, S.fast); break }
      })
    }
    setPhaseFill(lp)
  }
  SI.beats = [
    {
      at: 0.935,
      on(q) { SI.gone = true; SI.applyBody(); if (!q) App.audio.sfx('whoosh', { volume: 0.45, pitch: 0.55 }) },
      off() { SI.gone = false; SI.applyBody() },
    },
  ]

  /* =========================================================
     镜头 5 · 庭审（十五席、发言、记名投票）
     ========================================================= */
  const SC = { key: 'court', seats: [], di: -2, counts: {}, swingS: 0.5 }
  SC.build = function () {
    SC.table = U.svg('svg', { class: 'cycle-c-table', 'aria-hidden': 'true' })
    SC.lines = U.svg('svg', { class: 'cycle-c-lines', 'aria-hidden': 'true' })
    SC.ghost = el('div.cycle-c-ghost')
    SC.who = el('b.cycle-c-who')
    SC.center = el('div.cycle-c-center', null, [SC.ghost, SC.who])
    SC.seatsEl = el('div.cycle-c-seats')
    for (let k = 1; k <= 15; k++) {
      const n = el('b.cycle-c-n', null, [el('span'), el('sup', { text: '+1' })])
      const root = el('div.cycle-c-seat', { 'data-seat': k }, [el('i.cycle-c-wave'), el('div.cycle-c-medal'), el('span.cycle-c-no', { text: U.roman(k) }), n])
      SC.seats[k] = { root, medal: root.querySelector('.cycle-c-medal'), n, nv: n.firstChild, sup: n.lastChild, x: 0, y: 0 }
      SC.seatsEl.appendChild(root)
    }
    SC.el = el('div.cycle-shot.cycle-c', null, [SC.table, SC.center, SC.lines, SC.seatsEl])
    return SC.el
  }
  SC.setCast = function () {
    const c = S.cast
    for (let k = 1; k <= 15; k++) {
      const s = SC.seats[k]
      s.medal.textContent = ''
      const id = c.roster[k - 1]
      s.id = id
      s.root.classList.toggle('is-empty', !id)
      s.root.classList.toggle('is-dead', !!id && id === c.V.id)
      // 席位上的小肖像不随光标偏转（直径几十像素，偏转不过一两像素）：省掉每帧量位置、写样式，也不必各自成合成层
      if (id && id !== c.V.id) s.medal.appendChild(App.portrait(id, { mono: true, track: false }))
    }
    SC.speakers = c.living.slice()
    SC.di = -2
    SC.counts = {}
    if (S.W) SC.layout()
  }
  SC.pos = function (seat) { const s = SC.seats[seat]; return [s.x, s.y] }
  SC.layout = function () {
    const W = S.W, H = S.H
    const C = [W * 0.5, H * (S.mob ? 0.5 : 0.52)]
    const Rr = Math.min(W * (S.mob ? 0.4 : 0.34), H * 0.355)
    const m = clamp(Math.min(W, H) * (S.mob ? 0.105 : 0.084), 38, 86)
    SC.C = C; SC.Rr = Rr; SC.m = m
    SC.Rt = Rr - m * 0.82
    SC.el.style.setProperty('--m', fx(m) + 'px')
    for (let k = 1; k <= 15; k++) {
      const a = ((k - 1) / 15) * TAU
      const s = SC.seats[k]
      s.x = C[0] + Math.sin(a) * Rr
      s.y = C[1] - Math.cos(a) * Rr
      s.root.style.left = fx(s.x) + 'px'
      s.root.style.top = fx(s.y) + 'px'
    }
    // 桌面
    let rose = ''
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU
      rose += `M${fx(C[0] + Math.sin(a) * SC.Rt * 0.16)} ${fx(C[1] - Math.cos(a) * SC.Rt * 0.16)}L${fx(C[0] + Math.sin(a) * SC.Rt * 0.86)} ${fx(C[1] - Math.cos(a) * SC.Rt * 0.86)}`
    }
    SC.table.setAttribute('viewBox', `0 0 ${W} ${H}`)
    SC.table.innerHTML = `<circle class="t-top" cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(SC.Rt)}"/>` +
      `<circle class="t-rim" cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(SC.Rt)}"/>` +
      `<g class="t-inner"><circle class="t-in" cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(SC.Rt * 0.9)}"/>` +
      `<circle class="t-dash" cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(SC.Rt * 0.6)}"/>` +
      `<path class="t-rose" d="${rose}"/>` +
      `<circle class="t-hub" cx="${fx(C[0])}" cy="${fx(C[1])}" r="${fx(SC.Rt * 0.06)}"/></g>`
    SC.tRim = SC.table.querySelector('.t-rim')
    SC.tTop = SC.table.querySelector('.t-top')
    SC.tInner = SC.table.querySelector('.t-inner')
    SC.center.style.left = fx(C[0]) + 'px'
    SC.center.style.top = fx(C[1]) + 'px'
    SC.center.style.width = SC.center.style.height = fx(SC.Rt * 1.6) + 'px'
    // 票线
    SC.lines.setAttribute('viewBox', `0 0 ${W} ${H}`)
    SC.lines.textContent = ''
    SC.vlines = []
    const votes = S.cast ? S.cast.votes : []
    SC.vd = votes.length ? 0.32 / votes.length : 0.32
    votes.forEach((v, j) => {
      const path = mk('path', { class: 'cycle-c-line', pathLength: 1, d: SC.curve(v.from.seat, SC.pos(v.to.seat)) }, SC.lines)
      const dot = mk('circle', { class: 'cycle-c-dot', r: 3.2 }, SC.lines)
      const end = SC.end(v.from.seat, SC.pos(v.to.seat))
      dot.setAttribute('cx', fx(end[0])); dot.setAttribute('cy', fx(end[1]))
      SC.vlines.push({ v, path, dot, arrived: false, a: 0.56 + j * SC.vd })
    })
    SC.swing = mk('path', { class: 'cycle-c-line is-swing', pathLength: 1 }, SC.lines)
    SC.swingDot = mk('circle', { class: 'cycle-c-dot is-swing', r: 4 }, SC.lines)
    SC.counts = {}
    SC.renderCounts()
  }
  SC.ctrl = function (a, b) {
    const C = SC.C
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    return [C[0] + (mid[0] - C[0]) * 0.3, C[1] + (mid[1] - C[1]) * 0.3]
  }
  SC.end = function (fromSeat, b) {
    const a = SC.pos(fromSeat)
    const c = SC.ctrl(a, b)
    const d = Math.hypot(c[0] - b[0], c[1] - b[1]) || 1
    const k = SC.m * 0.56
    return [b[0] + ((c[0] - b[0]) / d) * k, b[1] + ((c[1] - b[1]) / d) * k]
  }
  SC.curve = function (fromSeat, b) {
    const a = SC.pos(fromSeat)
    const c = SC.ctrl(a, b)
    const da = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1
    const k = SC.m * 0.52
    const a2 = [a[0] + ((c[0] - a[0]) / da) * k, a[1] + ((c[1] - a[1]) / da) * k]
    const b2 = SC.end(fromSeat, b)
    return `M${fx(a2[0])} ${fx(a2[1])}Q${fx(c[0])} ${fx(c[1])} ${fx(b2[0])} ${fx(b2[1])}`
  }
  SC.renderCounts = function () {
    for (let k = 1; k <= 15; k++) {
      const s = SC.seats[k]
      const n = SC.counts[k] || 0
      s.nv.textContent = n ? String(n) : ''
      s.n.classList.toggle('is-on', n > 0)
    }
  }
  SC.enter = function () {
    PH.show(true)
    SC.di = -2
    SC.counts = {}
    for (const vl of SC.vlines || []) vl.arrived = false
    SC.renderCounts()
    SC.el.classList.remove('is-vote')
    setTension(1)
  }
  SC.leave = function () { hush(); SC.setSpeaker(-1) }
  SC.setSpeaker = function (i) {
    if (i === SC.di) return
    const prev = SC.di
    SC.di = i
    for (let k = 1; k <= 15; k++) SC.seats[k].root.classList.remove('is-speaking')
    SC.ghost.textContent = ''
    SC.who.textContent = ''
    SC.center.classList.toggle('is-on', i >= 0)
    if (i < 0 || !SC.speakers[i]) return
    const p = SC.speakers[i]
    SC.seats[p.seat].root.classList.add('is-speaking')
    SC.ghost.appendChild(App.portrait(p.id, { track: false, mono: true }))
    SC.who.textContent = nameOf(p.id)
    if (!S.fast && prev !== -2) {
      App.audio.sfx('tick', { volume: 0.32, pitch: 0.8 + (p.seat / 15) * 0.6, pan: Math.sin(((p.seat - 1) / 15) * TAU) * 0.7 })
      gsap.fromTo(SC.ghost, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out', ...lift(SC.ghost, 'transform, opacity') })
    }
  }
  SC.auto = function (t) { return [S.W * (0.5 + 0.34 * Math.sin(t * 0.8)), S.H * 0.5] }
  SC.update = function (lp, dt, t) {
    const mo = eo3(seg(0, 0.07, lp))
    const r = lerp(SI.R || SC.Rt, SC.Rt, mo)
    const cx = lerp(SI.C ? SI.C[0] : SC.C[0], SC.C[0], mo), cy = lerp(SI.C ? SI.C[1] : SC.C[1], SC.C[1], mo)
    for (const n of [SC.tRim, SC.tTop]) { putAttr(n, 'r', fx(r)); putAttr(n, 'cx', fx(cx)); putAttr(n, 'cy', fx(cy)) }
    // 直接写不透明度/变换（原先写继承的 --tin、--pop，整组子元素跟着重算样式）
    put(SC.tInner, 'opacity', mo.toFixed(3))
    for (let k = 1; k <= 15; k++) {
      const s = eo3(seg(0.015 + k * 0.0042, 0.06 + k * 0.0042, lp))
      const root = SC.seats[k].root
      put(root, 'opacity', s.toFixed(3))
      put(root, 'transform', `scale(${(0.4 + s * 0.6).toFixed(3)})`)
    }
    // 辩论：自一号席起，每人发言一次
    const n = SC.speakers.length
    const di = lp >= 0.08 && lp < 0.43 ? Math.min(n - 1, Math.floor(seg(0.08, 0.43, lp) * n)) : -1
    SC.setSpeaker(di)
    // 投票：记名，依次，公开
    const quiet = S.fast || S.qFrame
    let changed = false
    for (const vl of SC.vlines) {
      const pj = seg(vl.a, vl.a + SC.vd * 0.86, lp)
      put(vl.path, 'strokeDashoffset', (1 - pj).toFixed(4))
      vl.path.classList.toggle('is-on', pj > 0)
      const arrived = pj >= 1
      vl.dot.classList.toggle('is-on', arrived)
      SC.seats[vl.v.from.seat].root.classList.toggle('is-voting', pj > 0 && pj < 1)
      if (arrived !== vl.arrived) {
        vl.arrived = arrived
        const k = vl.v.to.seat
        SC.counts[k] = (SC.counts[k] || 0) + (arrived ? 1 : -1)
        changed = true
        if (arrived && !quiet) {
          App.audio.sfx('vote', { volume: 0.8, pan: Math.sin(((k - 1) / 15) * TAU) * 0.7 })
          const b = SC.seats[k].n
          b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop')
        }
      }
    }
    if (changed) SC.renderCounts()
    // 最后一票：悬在两人之间，随光标左右
    const c = S.cast
    const sw = seg(0.89, 0.93, lp)
    const tgt = sstep(0.3, 0.7, S.cur.nx)
    SC.swingS = lerp(SC.swingS, tgt, 0.07)
    if (sw > 0) {
      const a = SC.pos(c.K.seat), b = SC.pos(c.W.seat)
      const s = SC.swingS
      const end = [lerp(a[0], b[0], s), lerp(a[1], b[1], s)]
      const ek = SC.end(c.swing.seat, a), ew = SC.end(c.swing.seat, b)
      const tip = [lerp(ek[0], ew[0], s), lerp(ek[1], ew[1], s)]
      const from = SC.pos(c.swing.seat)
      const ctl = SC.ctrl(from, end)
      const da = Math.hypot(ctl[0] - from[0], ctl[1] - from[1]) || 1
      const a2 = [from[0] + ((ctl[0] - from[0]) / da) * SC.m * 0.52, from[1] + ((ctl[1] - from[1]) / da) * SC.m * 0.52]
      putAttr(SC.swing, 'd', `M${fx(a2[0])} ${fx(a2[1])}Q${fx(ctl[0])} ${fx(ctl[1])} ${fx(tip[0])} ${fx(tip[1])}`)
      put(SC.swing, 'strokeDashoffset', (1 - sw).toFixed(4))
      SC.swing.classList.add('is-on')
      putAttr(SC.swingDot, 'cx', fx(tip[0])); putAttr(SC.swingDot, 'cy', fx(tip[1]))
      SC.swingDot.classList.toggle('is-on', sw >= 1)
      SC.seats[c.swing.seat].root.classList.add('is-voting')
      const sk = SC.seats[c.K.seat], swp = SC.seats[c.W.seat]
      put(sk.sup, 'opacity', (sw * (1 - s)).toFixed(3))
      put(swp.sup, 'opacity', (sw * s).toFixed(3))
      sk.root.classList.toggle('is-lean', s < 0.5)
      swp.root.classList.toggle('is-lean', s >= 0.5)
    } else {
      SC.swing.classList.remove('is-on')
      SC.swingDot.classList.remove('is-on')
      if (c) {
        put(SC.seats[c.K.seat].sup, 'opacity', '0')
        put(SC.seats[c.W.seat].sup, 'opacity', '0')
        SC.seats[c.K.seat].root.classList.remove('is-lean')
        SC.seats[c.W.seat].root.classList.remove('is-lean')
        if (!(SC.vlines || []).some(v => v.v.from === c.swing)) SC.seats[c.swing.seat].root.classList.remove('is-voting')
      }
    }
    setPhaseFill(lp)
  }
  SC.beats = [
    {
      at: 0.44,
      on(q) {
        SC.el.classList.add('is-vote')
        say(bcSegs('主持人只以【】喊停辩论'), { pos: 'mid', instant: q, delay: q ? 0 : 150 })
        setPhaseLine(LINE_VOTE, q)
        if (!q) { App.audio.sfx('stamp', { volume: 0.7 }); App.bg.pulse(0.4, 0.9) }
      },
      off() { SC.el.classList.remove('is-vote'); hush(); setPhaseLine(SHOTS[4].line, true) },
    },
    { at: 0.545, on() { hush() }, off() { say(bcSegs('主持人只以【】喊停辩论'), { pos: 'mid', instant: true }) } },
  ]

  /* =========================================================
     镜头 6 · 判定（斜切的两个结局）与处刑
     ========================================================= */
  const SV = { key: 'verdict', split: 0.5, splitT: null, tls: [] }
  /* 两个结局之间的斜切线随光标左右。原先每帧改两边的 clip-path、--d、--cx，两块满屏背景、
     两幅人像、两组大字每帧整张重画。现在：
     · 右边是「窗」(.cycle-v-r，斜边的 clip-path 固定不变) 套「景」(.cycle-v-in)，分界移动时窗平移 +x、
       景平移 -x（整像素），两层都是合成层，只改 transform；左边整屏铺开、不动，被盖在上面的右窗挡住
       （右边背景不透明），所以左边不需要窗，少两个满屏合成层；完全被挡住时整个藏起来；
     · 背景的明暗（原 filter: brightness）写在景层（合成层）的 filter 上，不重画，也不再多盖一层满屏的黑；
     · 跟着人走的光晕（原 radial-gradient at var(--cx)）是独立的一层 .cycle-v-glow，只平移；
       粉点网放在光晕下面（同色半透明两层，上下次序互换颜色不变），不必再被逼成合成层；
     · 人像、大字的居中与缩放直接写 transform / opacity；分界线是一条转动、平移的细条。 */
  function vSide(k, head) {
    const fig = el('div.cycle-v-fig')
    const dead = el('div.cycle-v-dead', null, [el('div.cycle-v-deadp'), el('i.cycle-v-x')])
    const name = el('b.cycle-v-name')
    const glow = el('i.cycle-v-glow')
    const txt = el('div.cycle-v-txt', null, [el('h3.cycle-v-head', { text: head }), name])
    const inner = el('div.cycle-v-in', null, [el('div.cycle-v-bg', null, [el('i.cycle-v-dots'), glow])])
    const root = el('div.cycle-v-side.cycle-v-' + k, null, [inner, fig, dead, txt])
    return { k, root, inner, fig, dead, deadp: dead.firstChild, name, glow, txt, shadow: false }
  }
  SV.build = function () {
    SV.L = vSide('l', '判定正确。')
    SV.R = vSide('r', '判定错误。')
    SV.div = el('i.cycle-v-divl', { 'aria-hidden': 'true' })
    SV.beam = el('div.cycle-v-beam')
    SV.tally = el('div.cycle-v-tally', null, [el('i', { text: 'I' }), el('i', { text: 'II' })])
    SV.eyes = el('div.cycle-v-eyes')
    SV.dark = el('div.cycle-v-dark', null, [SV.eyes])
    SV.el = el('div.cycle-shot.cycle-v', null, [SV.L.root, SV.R.root, SV.div, SV.beam, SV.tally, SV.dark])
    gsap.set(SV.beam, { rotation: 24, autoAlpha: 0 })
    return SV.el
  }
  SV.setCast = function () {
    const c = S.cast
    SV.L.fig.textContent = ''
    SV.R.fig.textContent = ''
    // 随光标偏转的肖像只在本镜头放映时追踪（见 SV.enter / SV.leave）
    SV.L.figK = App.portrait(c.K.id, { className: 'cycle-v-p', track: false })
    SV.R.figW = App.portrait(c.W.id, { className: 'cycle-v-p', track: false })
    SV.R.figW2 = App.portrait(c.W2.id, { className: 'cycle-v-p is-alt', track: false })
    SV.L.fig.append(SV.L.figK)
    SV.R.fig.append(SV.R.figW, SV.R.figW2)
    SV.L.deadp.textContent = ''
    SV.R.deadp.textContent = ''
    SV.L.deadp.append(App.portrait(c.K.id, { dead: true, track: false }))
    SV.R.deadW = App.portrait(c.W.id, { dead: true, track: false })
    SV.R.deadW2 = App.portrait(c.W2.id, { dead: true, track: false, className: 'is-alt' })
    SV.R.deadp.append(SV.R.deadW, SV.R.deadW2)
    SV.L.name.textContent = nameOf(c.K.id)
    SV.R.name.textContent = nameOf(c.W.id)
    SV.eyes.textContent = ''
    // 黑暗里：几乎看不见的轮廓 + 发光的眼（位图肖像只留眼睛那一道窄带）
    SV.eyesP = App.portrait(c.K.id, { className: 'cycle-eyes', eyeRange: 9, track: false })
    SV.eyes.append(App.portrait(c.K.id, { silhouette: true, track: false, className: 'cycle-v-shade' }), SV.eyesP)
    SV.trk = [[SV.L.figK], [SV.R.figW], [SV.R.figW2]] // 黑暗里的眼睛只在黑暗出现时追踪（见判定的最后一拍）
    if (S.idx === 5) SV.track(true)
    warm(SV.el)
  }
  // 位图肖像随光标的偏转并进人像层的 transform（见 SV.gaze）；只有退回矢量占位的（位图缺失）才用 App.trackEyes 转眼珠
  SV.track = function (on) {
    for (const [w, o] of SV.trk || []) track(w, on && !w.classList.contains('is-photo'), o)
    for (const s of [SV.L, SV.R]) { s.photo = !!s.fig.querySelector('.portrait.is-photo'); s.gx = s.gy = 0 }
  }
  /* 画像向光标微微偏转：与 App.trackEyes 同一算法（眼睛约在肖像 (50%, 41%)，偏移 ±1.4% / ±1%），
     但不写到 img 的 --pvx/--pvy 上——那样 img 是 3D 变换的独立合成层、外面的遮罩也得再单独成一层；
     改为并进人像这一层（本来就每帧写 transform 的合成层）的 transform 末尾 */
  SV.gaze = function (s, cx, sc) {
    const m = App.mouse
    const fw = (SV.figW || 400) * sc, fh = fw * 4 / 3
    const dx = (m.sx - S.rect.left) - cx, dy = (m.sy - S.rect.top) - (S.H - fh * 0.59)
    const d = Math.hypot(dx, dy) || 1
    const k = Math.min(1, d / (fw * 1.2))
    s.gx = lerp(s.gx || 0, (dx / d) * k, 0.2)
    s.gy = lerp(s.gy || 0, (dy / d) * 0.7 * k, 0.2)
    return ` translate(${(Math.round(s.gx * 100) * 0.014).toFixed(3)}%, ${(Math.round(s.gy * 100) * 0.01).toFixed(2)}%)`
  }
  SV.layout = function () {
    const W = S.W, H = S.H, s = (S.mob ? 0.12 : 0.085) * W
    // 右窗的斜边固定在局部坐标里：左边过 (0, H/2)，右侧放得足够远（左边不需要窗，见上）
    SV.R.root.style.clipPath = `polygon(${fx(s)}px 0, ${fx(3 * W)}px 0, ${fx(3 * W)}px ${fx(H)}px, ${fx(-s)}px ${fx(H)}px)`
    SV.sx = s
    SV.figW = S.mob ? W * 0.74 : Math.min(H * 0.66, W * 0.46) // = CSS 的 .cycle-v-fig 宽度
    const len = Math.hypot(2 * s + 1.2, H + 8) + 2
    SV.div.style.height = fx(len) + 'px'
    SV.div.style.marginTop = fx(-len / 2) + 'px'
  }
  SV.setAlt = function (v) {
    SV.R.root.classList.toggle('is-alt', v)
    SV.R.name.textContent = nameOf(v ? S.cast.W2.id : S.cast.W.id)
  }
  SV.reset = function () {
    for (const tl of SV.tls) tl.kill()
    SV.tls = []
    if (SV.splitT) { SV.splitT.kill(); SV.splitT = null }
    for (const s of [SV.L, SV.R]) {
      s.root.classList.remove('is-shadow', 'is-gone')
      s.shadow = false
      gsap.killTweensOf(s.fig)
      s.fig.style.setProperty('--cut', '0')
    }
    gsap.set(SV.beam, { autoAlpha: 0 })
    SV.setAlt(false)
    SV.tally.className = 'cycle-v-tally'
    SV.dark.classList.remove('is-on', 'is-out')
    track(SV.eyesP, false)
    SV.el.classList.remove('is-locked', 'is-ok', 'is-ng')
  }
  SV.enter = function (dir) {
    PH.show(true)
    warm(SV.el)
    SV.reset()
    if (dir > 0) { S.branch = null; SV.split = 0.5 }
    setPhaseLine('', true)
    SV.track(true)
  }
  SV.leave = function (dir) {
    if (dir < 0) S.branch = null
    hush()
    SV.track(false)
    track(SV.eyesP, false)
  }
  SV.skip = function (dir) {
    if (dir > 0 && !S.branch) S.branch = S.cur.nx <= 0.5 ? 'ok' : 'ng'
    if (dir < 0) S.branch = null
  }
  SV.auto = function (t) { return [S.W * (0.5 + 0.36 * Math.sin(t * 0.55)), S.H * 0.55] }
  SV.update = function (lp, dt, t) {
    if (!S.branch) {
      const tgt = lerp(0.84, 0.16, sstep(0.08, 0.92, S.cur.nx))
      SV.split = lerp(SV.split, tgt, 0.075)
    }
    SV.apply(t)
    setPhaseFill(lp)
  }
  SV.apply = function (t) {
    const W = S.W, H = S.H
    const sp = SV.split
    const sl = S.mob ? 0.12 : 0.085
    // 分界线的中点（整像素：窗与景一正一反地平移，景在屏幕上的位置不变、不重新采样）
    const xc = Math.round(sp * W)
    put(SV.R.root, 'transform', `translate3d(${xc}px, 0, 0)`)
    put(SV.R.inner, 'transform', `translate3d(${-xc}px, 0, 0)`)
    // 判定落定后有一边完全看不见：整边藏起来（左边被右窗整个盖住 / 右窗整个移出屏幕）
    const s = SV.sx || 0
    put(SV.L.root, 'visibility', xc + s <= 0 ? 'hidden' : '')
    put(SV.R.root, 'visibility', xc - s >= W ? 'hidden' : '')
    const dl = sstep(0.3, 0.7, sp)
    // 人物居中于各自的区域（右边的人像在窗里，窗平移了 xc，所以减去它）
    const lc = clamp(sp, 0, 1) * 0.5, rc = 0.5 + clamp(sp, 0, 1) * 0.5
    SV.side(SV.L, +dl.toFixed(3), clamp(lc, 0.2, 0.5) * W, 0)
    SV.side(SV.R, +(1 - dl).toFixed(3), clamp(rc, 0.5, 0.8) * W, xc)
    // 分界线：中点在 xc，随时间微微颤动（只改转角）
    const wob = App.reduced ? 0 : Math.sin(t * 7) * 0.6
    const ang = Math.atan2(2 * sl * W + 2 * wob, H + 8)
    put(SV.div, 'transform', `translate3d(${xc}px, 0, 0) rotate(${ang.toFixed(4)}rad)`)
    put(SV.div, 'opacity', sp > -0.1 && sp < 1.1 ? '1' : '0')
  }
  // 一边的明暗（d：0 暗 → 1 亮）与人物中心 cx（舞台坐标）；off：人像所在的窗平移了多少
  SV.side = function (s, d, cx, off) {
    // 背景明暗：brightness(.42 + d × .58)，写在景层（合成层）上；处刑时（is-shadow）由 CSS 接管背景的滤镜
    const b = 0.42 + d * 0.58
    put(s.inner, 'filter', s.shadow || b > 0.999 ? '' : `brightness(${b.toFixed(3)})`)
    put(s.glow, 'transform', `translate3d(${fx(cx)}px, 0, 0)`)
    const x = `translate3d(${fx(cx - off)}px, 0, 0)`
    const sc = 0.88 + d * 0.12
    const tf = `${x} translateX(-50%) scale(${sc.toFixed(4)})`
    put(s.fig, 'transform', s.photo ? tf + SV.gaze(s, cx, sc) : tf)
    put(s.dead, 'transform', tf)
    put(s.txt, 'transform', `${x} translateX(-50%) scale(${(0.58 + d * 0.42).toFixed(4)})`)
    put(s.txt, 'opacity', (0.3 + d * 0.7).toFixed(3))
  }
  SV.lock = function (q) {
    if (!S.branch) S.branch = SV.split >= 0.5 ? 'ok' : 'ng'
    const ok = S.branch === 'ok'
    SV.el.classList.add('is-locked', ok ? 'is-ok' : 'is-ng')
    setPhaseLine(ok ? LINE_OK : LINE_NG, q)
    const to = ok ? 1.2 : -0.2
    if (SV.splitT) SV.splitT.kill()
    if (q || App.reduced) { SV.split = to; return }
    SV.splitT = gsap.to(SV, { split: to, duration: 0.6, ease: 'expo.inOut' })
    App.audio.sfx('slash', { volume: 0.9 })
    App.flash(App.color.blood, { opacity: 0.22, duration: 0.45 })
  }
  SV.unlock = function () {
    if (SV.splitT) { SV.splitT.kill(); SV.splitT = null }
    SV.split = clamp(SV.split, 0.12, 0.88)
    SV.el.classList.remove('is-locked', 'is-ok', 'is-ng')
    setPhaseLine('', true)
  }
  SV.execute = function (side, q) {
    side.root.classList.add('is-shadow')
    side.shadow = true
    gsap.killTweensOf(side.fig)
    if (q || App.reduced) {
      side.fig.style.setProperty('--cut', '1')
      side.root.classList.add('is-gone')
      if (!q) { App.audio.sfx('execute'); App.flash(App.color.blood, { opacity: 0.35 }) }
      return
    }
    side.fig.style.setProperty('--cut', '0')
    side.root.classList.remove('is-gone')
    const tl = gsap.timeline()
    tl.fromTo(SV.beam, { x: -S.W * 0.85, autoAlpha: 1 }, { x: S.W * 0.85, duration: 0.8, ease: 'power3.inOut' }, 0)
      .to(side.fig, { '--cut': 1, duration: 0.46, ease: 'power2.in' }, 0.2)
      .add(() => {
        App.flash(App.color.blood, { opacity: 0.55, duration: 0.8 })
        App.audio.sfx('execute')
        shake(9, 0.45)
        App.bg.pulse(0.9, 1.4)
      }, 0.32)
      .add(() => side.root.classList.add('is-gone'), 0.66)
      .set(SV.beam, { autoAlpha: 0 }, 0.82)
    SV.tls.push(tl)
  }
  SV.unexecute = function (side) {
    gsap.killTweensOf(side.fig)
    side.root.classList.remove('is-shadow', 'is-gone')
    side.shadow = false
    side.fig.style.setProperty('--cut', '0')
    gsap.set(SV.beam, { autoAlpha: 0 })
  }
  const isOk = () => S.branch === 'ok'
  const isNg = () => S.branch === 'ng'
  const vNames = (who, n) => ({ '某某': nameOf(who.id), '死者': nameOf(S.cast.V.id), '一／二': n })
  SV.beats = [
    { at: 0.4, on(q) { SV.lock(q) }, off(leaving) { if (!leaving) { S.branch = null; SV.unlock() } } },
    // 判定正确：先宣布，再处死凶手
    { at: 0.47, on(q) { if (isOk()) { say(bcSegs('判定正确', vNames(S.cast.K)), { instant: q }); if (!q) App.audio.sfx('correct', { volume: 0.8 }) } }, off() { hush() } },
    { at: 0.64, on(q) { if (isOk()) SV.execute(SV.L, q) }, off() { SV.unexecute(SV.L) } },
    // 判定错误：被选中的人先死，再公布
    { at: 0.47, on(q) { if (isNg()) SV.execute(SV.R, q) }, off() { SV.unexecute(SV.R) } },
    {
      at: 0.58,
      on(q) { if (isNg()) { say(bcSegs('误判', vNames(S.cast.W, '一')), { instant: q }); SV.tally.classList.add('is-on', 'is-1'); if (!q) App.audio.sfx('wrong') } },
      off() { if (isNg()) hush(); SV.tally.classList.remove('is-on', 'is-1') },
    },
    {
      at: 0.71,
      on(q) {
        if (!isNg()) return
        hush()
        SV.unexecute(SV.R)
        SV.setAlt(true)
        if (!q) { App.audio.sfx('slash', { volume: 0.7 }); App.flash('#050404', { opacity: 0.9, duration: 0.25, hold: 0.05 }) }
        later(() => { if (S.idx === 5 && isNg() && S.lp >= 0.71) SV.execute(SV.R, q) }, q ? 0 : 520)
      },
      off() { SV.unexecute(SV.R); SV.setAlt(false); if (isNg() && S.lp >= 0.47) SV.execute(SV.R, true) },
    },
    {
      at: 0.82,
      on(q) { if (isNg()) { say(bcSegs('误判', vNames(S.cast.W2, '二')), { instant: q }); SV.tally.classList.add('is-2'); if (!q) App.audio.sfx('wrong') } },
      off() { if (isNg()) hush(); SV.tally.classList.remove('is-2') },
    },
    // 真凶逃过审判：黑暗里只剩他的眼睛
    {
      at: 0.93,
      on(q) { if (isNg()) { hush(); SV.dark.classList.add('is-on'); track(SV.eyesP, true, { eyeRange: 9 }); if (!q) App.audio.sfx('heartbeat', { volume: 0.9 }) } },
      off() {
        // 淡出的 1.4 秒里保留里面的眼睛（is-out），之后整块不再渲染
        if (SV.dark.classList.contains('is-on')) {
          SV.dark.classList.replace('is-on', 'is-out')
          clearTimeout(SV.outT)
          SV.outT = setTimeout(() => { SV.dark.classList.remove('is-out'); if (!SV.dark.classList.contains('is-on')) track(SV.eyesP, false) }, 1450)
        }
        if (isNg() && S.lp >= 0.82) say(bcSegs('误判', vNames(S.cast.W2, '二')), { instant: true })
      },
    },
  ]

  /* =========================================================
     镜头 7 · 余波（金币雨、滚走的一枚、收拢的光、回到受命）
     ========================================================= */
  const SA = { key: 'after', coins: [], roller: null, desk: 0, deskT: 0, rw: -1, palAfter: true }
  SA.build = function () {
    SA.cv = el('canvas.cycle-a-cv')
    SA.ctx = SA.cv.getContext('2d')
    SA.loop = U.svg('svg', { class: 'cycle-a-loop', 'aria-hidden': 'true' })
    SA.loop.innerHTML = '<defs><linearGradient id="cycleLoopG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2c48c"/><stop offset=".55" stop-color="#c29a5b"/><stop offset="1" stop-color="#ff2e7e"/></linearGradient></defs><path class="l-glow" pathLength="1"/><path class="l-line" pathLength="1"/><circle class="l-head" r="4"/>'
    SA.loopP = Array.from(SA.loop.querySelectorAll('path'))
    SA.loopHead = SA.loop.querySelector('.l-head')
    // 光标附近的暖光：原先每帧画在画布上（光标一动整张画布重画），改为一层只平移的小圆
    SA.light = el('i.cycle-a-light')
    SA.world = el('div.cycle-a-world', null, [SA.cv, SA.light, SA.loop])
    // 不动的部分（椅背、桌面、席号、死者的叉）预先画在离屏画布上，重画时整块拷过去
    SA.base = document.createElement('canvas')
    SA.bctx = SA.base.getContext('2d')
    SA.flare = el('i.cycle-a-flare')
    SA.rSeat = el('span.cycle-m-seat')
    const seal = el('div.cycle-m-seal', null, [el('i.l'), el('i.r')])
    SA.rCard = el('div.cycle-a-card', null, [el('div.cycle-m-face.cycle-m-out.is-flat', null, [el('i.cycle-m-frame'), SA.rSeat, seal])])
    SA.rCd = el('div.cycle-a-cd', { text: '24:00:00' })
    SA.reset = el('div.cycle-a-reset', null, [SA.rCard, SA.rCd])
    SA.scan = el('i.cycle-a-scan')
    SA.el = el('div.cycle-shot.cycle-a', null, [SA.world, SA.flare, SA.reset, SA.scan])
    return SA.el
  }
  SA.layout = function () {
    const W = S.W, H = S.H
    const k = Math.min(S.q >= 2 ? 1.5 : S.q === 1 ? 1.25 : 1, window.devicePixelRatio || 1) // 画质降级时降低分辨率（全画质也最多 1.5 倍）
    SA.k = k
    SA.full = true
    SA.baseDirty = true
    for (const c of [SA.cv, SA.base]) { c.width = Math.round(W * k); c.height = Math.round(H * k) }
    // 桌子避开左侧竖排的阶段名（桌面），手机上阶段名在顶上，桌子用满宽度
    const fNo = S.mob ? 1.3 : 1.32
    const cx = S.mob ? W * 0.5 : W * 0.535, cy = H * (S.mob ? 0.55 : 0.56)
    const rx = S.mob ? Math.min(W * 0.36, (W * 0.5 - 14) / fNo) : Math.max(160, Math.min(W * 0.29, (cx - 300) / fNo, 600, H * 0.62))
    const ry = rx * (S.mob ? 0.6 : 0.4)
    const seats = []
    for (let s = 1; s <= 15; s++) {
      const a = ((s - 1) / 15) * TAU
      const sx = Math.sin(a), sy = -Math.cos(a)
      seats.push({
        k: s, sx, sy, depth: (sy + 1) / 2,
        chair: [cx + sx * rx * 1.17, cy + sy * ry * 1.2],
        spot: [cx + sx * rx * 0.76, cy + sy * ry * 0.72],
        no: [cx + sx * rx * fNo, cy + sy * ry * (S.mob ? 1.42 : 1.5)],
      })
    }
    SA.G = { cx, cy, rx, ry, seats, r: clamp(rx * 0.034, 7, 14) }
    SA.sprite = coinSprite(SA.G.r * 1.25, k)
    SA.light.style.width = SA.light.style.height = fx(rx) + 'px'
    SA.light._cy = null
    SA.world.style.transformOrigin = `${fx(cx)}px ${fx(cy)}px`
    SA.loop.setAttribute('viewBox', `0 0 ${W} ${H}`)
    const lrx = rx * 1.07, lry = ry * 1.13
    const d = `M${fx(cx)} ${fx(cy - lry)}A${fx(lrx)} ${fx(lry)} 0 1 1 ${fx(cx)} ${fx(cy + lry)}A${fx(lrx)} ${fx(lry)} 0 1 1 ${fx(cx)} ${fx(cy - lry)}`
    for (const p of SA.loopP) p.setAttribute('d', d)
    SA.loopE = { cx, cy, rx: lrx, ry: lry }
    SA.reset.style.left = fx(cx) + 'px'
    SA.reset.style.top = fx(cy) + 'px'
    SA.flare.style.left = fx(cx) + 'px'
    SA.flare.style.top = fx(cy) + 'px'
    // 重排后金币落点要跟着变
    for (const c of SA.coins) { const s = seats[c.seat - 1]; c.x = s.spot[0] + c.jx * SA.G.r; c.y = s.spot[1] + c.jy * SA.G.r }
    SA.coins.forEach(c => { c.r = SA.G.r * (0.84 + 0.32 * seats[c.seat - 1].depth) })
  }
  SA.survivors = function () {
    const c = S.cast
    const dead = new Set([c.V.id])
    if (S.branch === 'ok') dead.add(c.K.id)
    else dead.add(c.W.id), dead.add(c.W2.id)
    return c.ppl.filter(p => !dead.has(p.id))
  }
  SA.enter = function () {
    PH.show(true)
    if (!S.branch) S.branch = (SV.split >= 0.5 || S.cur.nx <= 0.5) ? 'ok' : 'ng'
    SA.alive = SA.survivors()
    SA.deadSeats = new Set(S.cast.ppl.filter(p => SA.alive.indexOf(p) < 0).map(p => p.seat))
    const nextSeat = S.branch === 'ok' ? S.cast.NEXT.seat : S.cast.K.seat
    SA.rSeat.textContent = U.roman(nextSeat)
    SA.rw = -1
    SA.palAfter = true
    SA.coins = []
    SA.roller = null
    SA.desk = 0
    SA.full = SA.baseDirty = true
    PH.root.classList.remove('is-rewind')
    setPhase(6, { quiet: true })
  }
  SA.leave = function () {
    PH.root.classList.remove('is-rewind')
    SA.coins = []
    SA.roller = null
    SA.desk = 0
  }
  SA.auto = function (t) { return [S.W * (0.5 + 0.38 * Math.sin(t * 0.45)), S.H * (0.4 + 0.22 * Math.sin(t * 0.7))] }
  SA.rain = function (batch, q) {
    const G = SA.G
    const rnd = Math.random
    for (const p of SA.alive) {
      const s = G.seats[p.seat - 1]
      for (let j = 0; j < 5; j++) {
        const jx = (rnd() - 0.5) * 0.35, jy = (rnd() - 0.5) * 0.2
        const c = {
          seat: p.seat, j: batch * 5 + j, jx, jy,
          x: s.spot[0] + jx * G.r, y: s.spot[1] + jy * G.r,
          r: G.r * (0.84 + 0.32 * s.depth),
          h: 0, vh: 0, phi: rnd() * TAU, om: (rnd() < 0.5 ? -1 : 1) * U.rand(9, 17), bounces: 0,
          delay: q ? 0 : rnd() * 1.1 + j * 0.11, state: q ? 'rest' : 'wait',
        }
        c.h = c.y + U.rand(40, 360)
        if (q) c.h = 0
        SA.coins.push(c)
      }
    }
    SA.full = true
    if (!q) {
      App.audio.sfx('coins', { volume: 0.9 })
      later(() => App.audio.sfx('coins', { volume: 0.7, pan: -0.4 }), 420)
      later(() => App.audio.sfx('coins', { volume: 0.6, pan: 0.4 }), 860)
    }
  }
  SA.unrain = function (batch) { SA.coins = SA.coins.filter(c => Math.floor(c.j / 5) < batch); SA.full = true }
  SA.roll = function (q) {
    const G = SA.G
    const goRight = S.cur.nx < 0.5
    const cand = G.seats.filter(s => s.depth > 0.6 && !SA.deadSeats.has(s.k)).sort((a, b) => (goRight ? b.sx - a.sx : a.sx - b.sx))
    const s = cand[0] || G.seats[7]
    const r = G.r * (0.84 + 0.32 * s.depth)
    const x = s.spot[0] + (goRight ? 1 : -1) * r * 1.6, y = s.spot[1] + G.ry * 0.12
    const to = [goRight ? S.W - r * 0.55 : r * 0.55, S.H * (S.mob ? 0.86 : 0.9)]
    SA.roller = { x, y, r, h: q ? 0 : y + 260, vh: 0, phi: 0, om: 13, state: q ? 'rest' : 'fall', from: [x, y], to, u: q ? 1 : 0, spin: q ? 1 : 0, dir: goRight ? 1 : -1, tick: 0 }
    if (q) { SA.roller.x = to[0]; SA.roller.y = to[1] }
    SA.full = true
  }
  SA.step = function (dt) {
    const g = 2400
    for (const c of SA.coins) {
      if (c.state === 'wait') { c.delay -= dt; if (c.delay <= 0) c.state = 'fall'; continue }
      if (c.state !== 'fall') continue
      c.vh += g * dt
      c.h -= c.vh * dt
      c.phi += c.om * dt
      const top = c.j * 2.3
      if (c.h <= top) {
        c.h = top
        if (c.vh > 300 && c.bounces < 2) {
          if (!S.fast) App.audio.sfx('coin', { volume: clamp(c.vh / 1400, 0.15, 0.7), pitch: U.rand(0.85, 1.25), pan: (c.x / S.W - 0.5) * 1.4 })
          c.vh = -c.vh * 0.3; c.bounces++; c.om *= 0.45
        } else { c.state = 'rest'; c.vh = 0 }
      }
    }
    const R = SA.roller
    if (R) {
      if (R.state === 'fall') {
        R.vh += g * dt; R.h -= R.vh * dt; R.phi += R.om * dt
        if (R.h <= 0) {
          R.h = 0
          if (R.vh > 300) { R.vh = -R.vh * 0.36; if (!S.fast) App.audio.sfx('coin', { volume: 0.6, pan: (R.x / S.W - 0.5) * 1.4 }) } else { R.state = 'roll'; R.vh = 0 }
        }
      } else if (R.state === 'roll') {
        R.u = Math.min(1, R.u + dt / 2.5)
        const e = eo3(R.u)
        R.x = lerp(R.from[0], R.to[0], e)
        R.y = lerp(R.from[1], R.to[1], e) - Math.sin(e * Math.PI) * 18
        R.phi += dt * (1 - e) * 14
        R.tick -= dt
        if (R.tick <= 0 && R.u < 0.9) { R.tick = 0.3 + R.u * 0.4; if (!S.fast) App.audio.sfx('coin', { volume: 0.12 + (1 - R.u) * 0.12, pitch: 1.6, pan: (R.x / S.W - 0.5) * 1.6 }) }
        if (R.u >= 1) {
          R.state = 'spin'; R.spin = 0
          if (!S.fast) [0, 230, 400, 520, 600, 655, 690].forEach((ms, i) => later(() => App.audio.sfx('coin', { volume: 0.4 - i * 0.04, pitch: 1.1 + i * 0.08, pan: R.dir * 0.9 }), ms))
        }
      } else if (R.state === 'spin') {
        R.spin = Math.min(1, R.spin + dt / 0.85)
        if (R.spin >= 1) R.state = 'rest'
      }
    }
    if (SA.desk > 0 && SA.deskT < 1) SA.deskT = Math.min(1, SA.deskT + dt * 0.6)
  }
  function coinSprite(r, k) {
    const c = document.createElement('canvas')
    const w = Math.ceil((r * 2 + 4) * k), h = Math.ceil((r * 0.84 + 9) * k)
    c.width = w; c.height = h
    const x = c.getContext('2d')
    x.scale(k, k)
    const cx = r + 2, cy = r * 0.42 + 2
    x.fillStyle = '#4a3416'
    x.beginPath(); x.ellipse(cx, cy + 2.4, r, r * 0.42, 0, 0, TAU); x.fill()
    const g = x.createLinearGradient(cx - r, cy - r * 0.42, cx + r, cy + r * 0.42)
    g.addColorStop(0, '#f6e2ad'); g.addColorStop(0.45, '#c9a161'); g.addColorStop(1, '#755729')
    x.fillStyle = g
    x.beginPath(); x.ellipse(cx, cy, r, r * 0.42, 0, 0, TAU); x.fill()
    x.strokeStyle = 'rgba(88,62,26,.85)'; x.lineWidth = 0.8
    x.beginPath(); x.ellipse(cx, cy, r * 0.76, r * 0.32, 0, 0, TAU); x.stroke()
    x.fillStyle = 'rgba(255,244,212,.55)'
    x.beginPath(); x.ellipse(cx - r * 0.34, cy - r * 0.12, r * 0.3, r * 0.07, -0.18, 0, TAU); x.fill()
    return { c, w: w / k, h: h / k, ox: cx, oy: cy, r }
  }
  function drawSpin(c, x, y, r, phi) {
    const cw = Math.cos(phi)
    const rx = Math.max(r * 0.12, r * Math.abs(cw))
    c.fillStyle = '#6b4f25'
    c.beginPath(); c.ellipse(x + (cw > 0 ? 1.4 : -1.4), y, rx, r, 0, 0, TAU); c.fill()
    const g = c.createLinearGradient(x - rx, y - r, x + rx, y + r)
    const lit = 0.55 + 0.45 * Math.abs(Math.sin(phi + 0.6))
    g.addColorStop(0, `rgba(${(246 * lit) | 0},${(226 * lit) | 0},${(173 * lit) | 0},1)`)
    g.addColorStop(0.5, '#c29a5b'); g.addColorStop(1, '#6f5532')
    c.fillStyle = g
    c.beginPath(); c.ellipse(x, y, rx, r, 0, 0, TAU); c.fill()
    if (rx > r * 0.4) {
      c.strokeStyle = 'rgba(88,62,26,.8)'; c.lineWidth = 0.8
      c.beginPath(); c.ellipse(x, y, rx * 0.76, r * 0.76, 0, 0, TAU); c.stroke()
      if (r > 11) {
        c.save(); c.translate(x, y); c.scale(rx / r, 1)
        c.fillStyle = 'rgba(70,48,18,.75)'; c.font = `700 ${Math.round(r * 0.62)}px Cinzel, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
        c.fillText('100', 0, 1)
        c.restore()
      }
    }
  }
  // 不动的部分：远处的椅背、桌面、席号、死者的叉（进入镜头、重排、字体到位时重画一次）
  SA.drawBase = function () {
    SA.baseDirty = false
    const c = SA.bctx, G = SA.G, k = SA.k
    if (!G) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, SA.base.width, SA.base.height)
    c.setTransform(k, 0, 0, k, 0, 0)
    const dead = SA.deadSeats || new Set()
    const occupied = new Set((S.cast ? S.cast.ppl : []).map(p => p.seat))
    // 远处的椅背
    for (const s of G.seats) {
      if (s.depth > 0.56) continue
      const w = G.rx * 0.085 * (0.75 + 0.5 * s.depth), h = w * 1.45
      const [x, y] = s.chair
      c.beginPath()
      c.moveTo(x - w / 2, y)
      c.lineTo(x - w / 2, y - h * 0.62)
      c.quadraticCurveTo(x - w / 2, y - h, x, y - h)
      c.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h * 0.62)
      c.lineTo(x + w / 2, y)
      c.closePath()
      c.fillStyle = '#100c0a'; c.fill()
      c.lineWidth = 1
      c.strokeStyle = dead.has(s.k) ? 'rgba(125,22,22,.75)' : occupied.has(s.k) ? 'rgba(111,85,50,.8)' : 'rgba(91,83,77,.35)'
      c.stroke()
    }
    // 桌面
    c.fillStyle = '#060404'
    c.beginPath(); c.ellipse(G.cx, G.cy + G.ry * 0.1, G.rx, G.ry, 0, 0, TAU); c.fill()
    const tg = c.createRadialGradient(G.cx, G.cy - G.ry * 0.35, G.rx * 0.08, G.cx, G.cy, G.rx)
    tg.addColorStop(0, '#1d1612'); tg.addColorStop(1, '#0c0908')
    c.fillStyle = tg
    c.beginPath(); c.ellipse(G.cx, G.cy, G.rx, G.ry, 0, 0, TAU); c.fill()
    c.strokeStyle = 'rgba(111,85,50,.95)'; c.lineWidth = 1.2
    c.beginPath(); c.ellipse(G.cx, G.cy, G.rx, G.ry, 0, 0, TAU); c.stroke()
    c.strokeStyle = 'rgba(111,85,50,.5)'; c.lineWidth = 1
    c.beginPath(); c.ellipse(G.cx, G.cy, G.rx * 0.9, G.ry * 0.9, 0, 0, TAU); c.stroke()
    c.setLineDash([1, 5]); c.strokeStyle = 'rgba(111,85,50,.35)'
    c.beginPath(); c.ellipse(G.cx, G.cy, G.rx * 0.58, G.ry * 0.58, 0, 0, TAU); c.stroke()
    c.setLineDash([])
    c.strokeStyle = 'rgba(194,154,91,.06)'
    c.beginPath()
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU
      c.moveTo(G.cx + Math.sin(a) * G.rx * 0.12, G.cy - Math.cos(a) * G.ry * 0.12)
      c.lineTo(G.cx + Math.sin(a) * G.rx * 0.56, G.cy - Math.cos(a) * G.ry * 0.56)
    }
    c.stroke()
    // 席号
    c.font = `700 ${S.mob ? 9 : 11}px Cinzel, serif`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    for (const s of G.seats) {
      c.fillStyle = dead.has(s.k) ? 'rgba(160,40,40,.85)' : occupied.has(s.k) ? 'rgba(194,154,91,.7)' : 'rgba(91,83,77,.45)'
      c.fillText(U.roman(s.k), s.no[0], s.no[1])
      if (dead.has(s.k)) {
        const [x, y] = s.spot, d = G.r * 0.7
        c.strokeStyle = 'rgba(125,22,22,.8)'; c.lineWidth = 1.4
        c.beginPath(); c.moveTo(x - d, y - d * 0.5); c.lineTo(x + d, y + d * 0.5); c.moveTo(x + d, y - d * 0.5); c.lineTo(x - d, y + d * 0.5); c.stroke()
      }
    }
  }
  /* 重画：rect 为空时整张，否则只重画这一块（裁剪后从离屏画布拷回桌子，再按原次序画金币、滚走的一枚、书桌）。
     静止时一笔不画；光标移动只重画光标附近（金币的高光、抖动）与书桌那一块。 */
  SA.draw = function (t, rect) {
    const c = SA.ctx, G = SA.G, k = SA.k
    if (!G) return
    if (SA.baseDirty) SA.drawBase()
    const cw = SA.cv.width, ch = SA.cv.height
    c.setTransform(1, 0, 0, 1, 0, 0)
    let X0 = 0, Y0 = 0, w = cw, h = ch
    if (rect) {
      X0 = Math.max(0, Math.floor(rect[0] * k)); Y0 = Math.max(0, Math.floor(rect[1] * k))
      const X1 = Math.min(cw, Math.ceil((rect[0] + rect[2]) * k)), Y1 = Math.min(ch, Math.ceil((rect[1] + rect[3]) * k))
      w = X1 - X0; h = Y1 - Y0
      if (w <= 0 || h <= 0) return
      c.save()
      c.beginPath(); c.rect(X0, Y0, w, h); c.clip()
    }
    c.clearRect(X0, Y0, w, h)
    c.drawImage(SA.base, X0, Y0, w, h, X0, Y0, w, h)
    c.setTransform(k, 0, 0, k, 0, 0)
    SA.drawDyn(c, t)
    if (rect) c.restore()
  }
  SA.drawDyn = function (c, t) {
    const G = SA.G
    const mx = S.cur.x, my = S.cur.y
    // 金币（先远后近，先低后高）
    const sp = SA.sprite
    const rest = SA.coins.filter(x => x.state === 'rest').sort((a, b) => a.y - b.y || a.j - b.j)
    for (const co of rest) {
      const sc = co.r / sp.r * 1.25
      const near = Math.hypot(co.x - mx, co.y - my)
      const jig = near < 60 && S.cur.speed > 6 ? Math.sin(t * 40 + co.j) * 0.8 : 0
      c.drawImage(sp.c, co.x - sp.ox * sc + jig, co.y - co.j * 2.3 - sp.oy * sc, sp.w * sc, sp.h * sc)
      if (near < 120) {
        c.fillStyle = `rgba(255,240,205,${((1 - near / 120) * 0.35).toFixed(3)})`
        c.beginPath(); c.ellipse(co.x - co.r * 0.3, co.y - co.j * 2.3 - co.r * 0.12, co.r * 0.36, co.r * 0.09, -0.2, 0, TAU); c.fill()
      }
    }
    for (const co of SA.coins) {
      if (co.state !== 'fall') continue
      drawSpin(c, co.x, co.y - co.h, co.r * 1.08, co.phi)
    }
    // 滚走的一枚
    const R = SA.roller
    if (R) {
      const grow = 1 + 0.9 * clamp((R.y - R.from[1]) / Math.max(1, R.to[1] - R.from[1]))
      const r = R.r * grow
      if (R.state === 'fall') drawSpin(c, R.x, R.y - R.h, r, R.phi)
      else if (R.state === 'roll') {
        const lean = Math.sin(R.phi * 0.7) * 0.12
        c.save(); c.translate(R.x, R.y - r); c.rotate(lean * R.dir)
        c.fillStyle = '#5e4420'; c.beginPath(); c.ellipse(1.5 * R.dir, 0, r * 0.2, r, 0, 0, TAU); c.fill()
        const g = c.createLinearGradient(-r * 0.2, -r, r * 0.2, r)
        g.addColorStop(0, '#f2dba3'); g.addColorStop(1, '#7a5b2b')
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r * 0.2, r, 0, 0, TAU); c.fill()
        const ty = Math.cos(R.phi) * r * 0.8
        c.fillStyle = 'rgba(255,244,212,.7)'; c.fillRect(-r * 0.1, ty - 1, r * 0.2, 2)
        c.restore()
      } else {
        const q = R.state === 'spin' ? eo3(R.spin) : 1
        const rx = lerp(r * 0.2, r, q), ry = lerp(r, r * 0.42, q)
        const rot = (1 - q) * Math.sin(q * 26) * 0.9
        c.save(); c.translate(R.x, R.y - ry); c.rotate(rot)
        c.fillStyle = '#4a3416'; c.beginPath(); c.ellipse(0, 2.4 * q, rx, ry, 0, 0, TAU); c.fill()
        const g = c.createLinearGradient(-rx, -ry, rx, ry)
        g.addColorStop(0, '#f6e2ad'); g.addColorStop(0.45, '#c9a161'); g.addColorStop(1, '#755729')
        c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill()
        c.strokeStyle = 'rgba(88,62,26,.85)'; c.lineWidth = 0.9
        c.beginPath(); c.ellipse(0, 0, rx * 0.76, ry * 0.76, 0, 0, TAU); c.stroke()
        c.restore()
      }
    }
    // 凶手套房的书桌：十枚，不广播，只在光标靠近时看得见
    if (SA.desk > 0) SA.drawDesk(c, t)
  }
  SA.deskGeo = function () {
    const W = S.W, H = S.H
    const w = Math.min(W * (S.mob ? 0.34 : 0.15), 230), h = w * 0.42
    const x = W - w / 2 - (S.mob ? 18 : W * 0.07), y = H * (S.mob ? 0.2 : 0.24)
    return { w, h, x, y }
  }
  // 光标靠近才看得见；没有光标（触屏 / 自动演示）时像烛光一样时隐时现
  SA.deskAlpha = function (t, g) {
    const d = Math.hypot(S.cur.x - g.x, S.cur.y - g.y)
    const near = S.cur.auto ? 0 : clamp(1 - (d - 70) / 260)
    const a = S.cur.auto || !App.finePointer ? Math.max(near, 0.3 + 0.3 * Math.sin(t * 0.9)) : near
    return a * SA.deskT
  }
  SA.drawDesk = function (c, t) {
    const g = SA.deskGeo()
    const { w, h, x, y } = g
    const a = SA.deskAlpha(t, g)
    if (a < 0.01) return
    c.save()
    c.globalAlpha = a
    const lg = c.createRadialGradient(x, y, 0, x, y, w * 0.9)
    lg.addColorStop(0, 'rgba(226,196,140,.16)'); lg.addColorStop(1, 'rgba(226,196,140,0)')
    c.fillStyle = lg; c.fillRect(x - w, y - w, w * 2, w * 2)
    c.beginPath()
    c.moveTo(x - w * 0.42, y - h * 0.5); c.lineTo(x + w * 0.5, y - h * 0.5); c.lineTo(x + w * 0.42, y + h * 0.5); c.lineTo(x - w * 0.5, y + h * 0.5); c.closePath()
    c.fillStyle = '#1b120b'; c.fill()
    c.strokeStyle = 'rgba(111,85,50,.8)'; c.lineWidth = 1; c.stroke()
    const sp = SA.sprite
    const sc = (w * 0.075) / sp.r
    for (let st = 0; st < 2; st++) {
      for (let j = 0; j < 5; j++) {
        const cx = x + (st ? w * 0.1 : -w * 0.06), cy = y + (st ? h * 0.08 : -h * 0.02) - j * 2
        c.drawImage(sp.c, cx - sp.ox * sc, cy - sp.oy * sc, sp.w * sc, sp.h * sc)
      }
    }
    c.font = `500 ${S.mob ? 10 : 11}px "Sans SC", sans-serif`
    c.textAlign = 'center'; c.textBaseline = 'top'
    c.fillStyle = 'rgba(160,150,138,.9)'
    c.fillText(S.cast.K.seat + '号套房', x, y + h * 0.5 + 10)
    c.restore()
  }
  SA.update = function (lp, dt, t) {
    SA.step(dt)
    // 收拢的光：先画一圈回到起点的环，再把一切收进桌心
    const ring = eio(seg(0.5, 0.66, lp))
    const shrink = eio(seg(0.66, 0.86, lp))
    for (const p of SA.loopP) put(p, 'strokeDashoffset', (1 - ring).toFixed(4))
    put(SA.loop, 'opacity', ring > 0.001 ? '1' : '0')
    put(SA.loop, 'visibility', ring > 0.001 ? 'visible' : 'hidden')
    if (ring > 0.001) {
      const E = SA.loopE
      const a = ring * TAU
      putAttr(SA.loopHead, 'cx', fx(E.cx + Math.sin(a) * E.rx))
      putAttr(SA.loopHead, 'cy', fx(E.cy - Math.cos(a) * E.ry))
      put(SA.loopHead, 'opacity', ring < 0.999 ? '1' : '0')
    }
    put(SA.world, 'transform', shrink > 0 ? `scale(${(1 - shrink * 0.985).toFixed(4)})` : '')
    put(SA.world, 'opacity', (1 - seg(0.8, 0.88, lp)).toFixed(3))
    put(SA.world, 'filter', shrink > 0.02 ? `brightness(${(1 + shrink * 1.4).toFixed(3)})` : '')
    const fl = seg(0.78, 0.88, lp) * (1 - seg(0.9, 0.96, lp))
    put(SA.flare, 'opacity', fl.toFixed(3))
    put(SA.flare, 'visibility', fl > 0 ? 'visible' : 'hidden')
    put(SA.flare, 'transform', `translate(-50%, -50%) scale(${(0.2 + seg(0.78, 0.9, lp) * 1.8).toFixed(3)})`)
    const rv = eo3(seg(0.87, 0.94, lp))
    put(SA.reset, 'opacity', rv.toFixed(3))
    put(SA.reset, 'visibility', rv > 0 ? 'visible' : 'hidden')
    put(SA.reset, 'transform', `translate(-50%, -50%) scale(${(0.4 + rv * 0.6).toFixed(4)})`)
    SA.reset.classList.toggle('is-on', rv > 0.5)
    const so = sstep(0.66, 0.7, lp) * (1 - sstep(0.84, 0.88, lp))
    put(SA.scan, 'opacity', so.toFixed(3))
    put(SA.scan, 'visibility', so > 0.001 ? 'visible' : 'hidden')
    SA.scan.classList.toggle('is-run', so > 0.001) // 扫描线的无限动画只在看得见时跑

    // 阶段名倒放：余波 → 判定 → … → 受命
    if (lp < 0.66) {
      if (SA.rw !== -1) { SA.rw = -1; PH.root.classList.remove('is-rewind'); setPhase(6, { quiet: true, line: SHOTS[6].line }) }
      setPhaseFill(seg(0, 0.66, lp))
    } else if (lp < 0.87) {
      const i = Math.round(lerp(6, 0, eio(seg(0.68, 0.86, lp))))
      if (i !== SA.rw) {
        SA.rw = i
        PH.root.classList.add('is-rewind')
        setPhase(i, { flick: true, line: '' })
        setPhaseFill(1 - seg(0.68, 0.86, lp))
      }
    } else if (SA.rw !== 99) {
      SA.rw = 99
      PH.root.classList.remove('is-rewind')
      setPhase(0, { quiet: true, force: true, line: S.branch === 'ng' ? LINE_AGAIN : SHOTS[0].line })
      setPhaseFill(0)
    }
    // 色调回到受命
    const back = lp >= 0.87
    if (back === SA.palAfter) {
      SA.palAfter = !back
      applyPalette(back ? SHOTS[0].pal : SHOTS[6].pal, 1.2)
      setTension(back ? 0.28 : SHOTS[6].tension)
    }
    if (lp < 0.9) {
      const mx = S.cur.x, my = S.cur.y
      const rl = SA.G.rx * 0.5
      put(SA.light, 'transform', `translate3d(${fx(mx - rl)}px, ${fx(my - rl)}px, 0)`)
      SA.paint(t)
    }
  }
  /* 画布只在有东西在动时重画；静止时一笔不画：
     · 金币在落、那一枚在滚 → 整张重画（几秒钟）；
     · 光标移动 / 快速晃动 → 只重画光标旧、新位置附近有金币的那一块（高光与抖动只在 120px 以内）；
     · 书桌的明暗变了 → 只重画书桌那一块。 */
  // 正在动的金币（下落的、滚走的那一枚）这一帧占的范围（CSS 像素）
  SA.movingBox = function () {
    const b = [Infinity, Infinity, -Infinity, -Infinity]
    const add = (x, y, r) => { if (x - r < b[0]) b[0] = x - r; if (y - r < b[1]) b[1] = y - r; if (x + r > b[2]) b[2] = x + r; if (y + r > b[3]) b[3] = y + r }
    for (const c of SA.coins) if (c.state === 'fall') add(c.x, c.y - c.h, c.r * 1.4 + 6) // 含落地后静止的那枚贴图
    const R = SA.roller
    if (R && R.state !== 'rest') {
      const r = R.r * (1 + 0.9 * clamp((R.y - R.from[1]) / Math.max(1, R.to[1] - R.from[1]))) + 6
      add(R.x, R.y - (R.state === 'fall' ? R.h : r), r * 1.6)
    }
    return b[0] < b[2] ? b : null
  }
  SA.paint = function (t) {
    if (SA.full) {
      SA.full = false
      SA.draw(t)
      SA.pmx = S.cur.x; SA.pmy = S.cur.y; SA.pfast = S.cur.speed > 6
      SA.pbox = SA.movingBox()
      if (SA.desk > 0) SA.pDeskA = SA.deskAlpha(t, SA.deskGeo())
      return
    }
    // 下落、滚动：只重画这一帧与上一帧它们占的范围（落地的那一帧由上一帧的范围盖住）
    const box = SA.movingBox(), pb = SA.pbox
    SA.pbox = box
    if (box || pb) {
      const u = box && pb ? [Math.min(box[0], pb[0]), Math.min(box[1], pb[1]), Math.max(box[2], pb[2]), Math.max(box[3], pb[3])] : (box || pb)
      SA.draw(t, [u[0], u[1], u[2] - u[0], u[3] - u[1]])
    }
    const mx = S.cur.x, my = S.cur.y, fast = S.cur.speed > 6
    const RR = 175 // 高光半径 120 + 金币大小与叠高
    const near = (x, y) => { for (const c of SA.coins) if (c.state === 'rest' && Math.abs(c.x - x) < 130 && Math.abs(c.y - y) < 130) return true; return false }
    if (fast || mx !== SA.pmx || my !== SA.pmy || fast !== SA.pfast) {
      if (SA.pmx != null && near(SA.pmx, SA.pmy)) SA.draw(t, [SA.pmx - RR, SA.pmy - RR, RR * 2, RR * 2])
      if (near(mx, my)) SA.draw(t, [mx - RR, my - RR, RR * 2, RR * 2])
      SA.pmx = mx; SA.pmy = my; SA.pfast = fast
    }
    if (SA.desk > 0) {
      const g = SA.deskGeo()
      const a = SA.deskAlpha(t, g)
      const av = a < 0.01 ? 0 : a
      if (Math.abs(av - (SA.pDeskA || 0)) > 0.003 || (av === 0) !== ((SA.pDeskA || 0) === 0)) {
        SA.pDeskA = av
        SA.draw(t, [g.x - g.w - 2, g.y - g.w - 2, g.w * 2 + 4, g.w * 2 + 4])
      }
    }
  }
  // 离开很远时释放画布（回来时整张重画）
  SA.release = function () { SA.cv.width = SA.cv.height = SA.base.width = SA.base.height = 1; SA.full = SA.baseDirty = true }
  SA.beats = [
    { at: 0.05, on(q) { SA.rain(0, q) }, off() { SA.unrain(0) } },
    {
      at: 0.21,
      on(q) {
        if (S.branch === 'ok') SA.rain(1, q)
        else { SA.desk = 1; SA.deskT = q ? 1 : 0; SA.full = true }
      },
      off() { SA.unrain(1); SA.desk = 0; SA.deskT = 0; SA.full = true },
    },
    { at: 0.34, on(q) { SA.roll(q) }, off() { SA.roller = null; SA.full = true } },
    { at: 0.5, on(q) { if (!q) App.audio.sfx('whoosh', { volume: 0.5, pitch: 0.6 }) } },
    {
      at: 0.68,
      on(q) {
        if (q) return
        App.audio.sfx('whoosh', { volume: 0.85, pitch: 0.45 })
        for (let i = 0; i < 9; i++) later(() => App.audio.sfx('tick', { volume: 0.32, pitch: 1.5 - i * 0.06 }), i * (150 - i * 9))
      },
    },
    {
      at: 0.88,
      on(q) {
        SA.rCard.classList.remove('is-pop'); void SA.rCard.offsetWidth; SA.rCard.classList.add('is-pop')
        if (!q) { App.audio.sfx('chime', { volume: 0.75 }); App.audio.sfx('stamp', { volume: 0.5, delay: 0.05 }); App.bg.pulse(0.4, 1.2) }
      },
    },
  ]

  /* =========================================================
     镜头表 → 对象
     ========================================================= */
  const SH = [SM, SK, SD, SI, SC, SV, SA]

  function applyPalette(p, dur) {
    if (S.def) S.def.palette = p
    if (App.state.section === 'cycle' && App.bg) App.bg.setPalette(p, dur == null ? 1.1 : dur)
  }
  function setTension(v) {
    S.tension = v
    if (App.state.section === 'cycle') App.audio.setMood({ tension: v })
  }

  /* 各镜头的强调色。原先写在 .cycle-stage[data-shot] 上：每次切镜头，舞台里几百个元素都跟着重算样式；
     现在只写到真正用它的那几个元素上（阶段编号、广播、硬切、循环环、受命的提示线）。 */
  const ACC = { mandate: '#c3243f', murder: '#d1145a', discover: 'var(--blood)', inv: '#9fb0c2', court: 'var(--brass)', verdict: '#ff2e5e', after: '#d8b273' }
  function setAcc(key) {
    const v = ACC[key]
    for (const n of [PH.no, BC.root, CUT.root, NAV.root, SM.hint]) if (n) putVar(n, '--acc', v)
  }

  function switchTo(i, lp) {
    const from = S.idx
    const dir = from < 0 ? 1 : i > from ? 1 : -1
    const jump = from >= 0 && Math.abs(i - from) > 1
    const quiet = from < 0 || dir < 0 || jump || S.fast
    clearLater()
    if (from >= 0) {
      const o = SH[from]
      for (let k = o.beats.length - 1; k >= 0; k--) {
        const b = o.beats[k]
        if (b.fired) { b.fired = false; try { if (b.off) b.off(true) } catch (e) { console.error('[cycle]', e) } }
      }
      try { if (o.leave) o.leave(dir) } catch (e) { console.error('[cycle]', e) }
      o.el.classList.remove('is-on')
      if (dir > 0) for (let k = from + 1; k < i; k++) { if (SH[k].skip) SH[k].skip(1) }
      else for (let k = from - 1; k > i; k--) { if (SH[k].skip) SH[k].skip(-1) }
    }
    S.idx = i
    const n = SH[i]
    n.el.classList.add('is-on')
    S.stage.dataset.shot = SHOTS[i].key // 只作标记（样式表不再按它取色）
    setAcc(SHOTS[i].key)
    for (const b of n.beats) b.fired = false
    if (i !== 0) setPhase(i, { quiet })
    try { if (n.enter) n.enter(dir, quiet) } catch (e) { console.error('[cycle]', e) }
    S.qEntry = quiet
    if (from >= 0) cutFX(dir, quiet)
    applyPalette(SHOTS[i].pal)
    setTension(SHOTS[i].tension)
    NAV.dots.forEach((d, k) => d.classList.toggle('is-on', k === i))
  }
  function runBeats(shot, lp, quiet) {
    const bs = shot.beats
    for (let k = bs.length - 1; k >= 0; k--) {
      const b = bs[k]
      if (b.fired && lp < b.at - 0.003) { b.fired = false; try { if (b.off) b.off(false) } catch (e) { console.error('[cycle]', e) } }
    }
    for (const b of bs) {
      if (!b.fired && lp >= b.at) { b.fired = true; try { if (b.on) b.on(quiet) } catch (e) { console.error('[cycle]', e) } }
    }
  }

  /* =========================================================
     布局与帧循环
     ========================================================= */
  // 舞台尺寸只取视口（钉住的框由内联样式锁成 100vh 且 contain: strict），
  // 绝不取内容高度——否则画布按高度设尺寸 → 框被撑高 → 再次布局，会指数级失控。
  function viewSize() {
    const vw = document.documentElement.clientWidth || window.innerWidth || 1
    const vh = window.innerHeight || document.documentElement.clientHeight || 1
    const w = S.sticky.clientWidth || vw
    const h = S.sticky.clientHeight || vh
    return [Math.round(clamp(w, 1, Math.max(vw, 320) * 1.05)), Math.round(clamp(h, 1, Math.max(vh, 320) * 1.25))]
  }
  function layout() {
    const [w, h] = viewSize()
    S.W = w
    S.H = h
    S.mob = S.W < 760
    S.stage.classList.toggle('is-mob', S.mob)
    for (const sh of SH) { try { if (sh.layout) sh.layout() } catch (e) { console.error('[cycle]', e) } }
  }

  // 只在值变了时才写（光标停住、滚动停住时整板块不再触发样式计算）
  function put(node, k, v) {
    const c = node._cy || (node._cy = {})
    if (c[k] !== v) { c[k] = v; node.style[k] = v }
  }
  function putVar(node, k, v) {
    const c = node._cy || (node._cy = {})
    if (c[k] !== v) { c[k] = v; node.style.setProperty(k, v) }
  }
  function putAttr(node, k, v) {
    const c = node._cya || (node._cya = {})
    if (c[k] !== v) { c[k] = v; node.setAttribute(k, v) }
  }

  function frame(time) {
    // 离视口半屏以外：舞台锁住（不算样式、不画、动画不跑）；半屏以内先解锁，进场的第一帧不会是空的。
    // 「近」以 IntersectionObserver 为准；它晚一帧才报，所以再按上次量到的板块位置与当前 scrollY 估一下（不读排版）
    if (!S.ready) return
    let near = S.near
    if (!near && S.secTop != null) {
      const sy = window.scrollY, vh0 = window.innerHeight || S.H
      near = sy + vh0 * 1.6 > S.secTop && sy - vh0 * 0.6 < S.secTop + S.secH
    }
    if (!near) { setLock(true); return }
    setLock(false)
    if (S.restore) { S.restore = false; try { SA.layout(); if (S.idx === 2) SD.place() } catch (e) { console.error('[cycle]', e) } }
    if (!S.visible) return
    // 按板块的实际位置判断：IntersectionObserver 在板块恰好贴着视口边缘时也算「相交」
    const sr = S.sec.getBoundingClientRect()
    const vh = window.innerHeight || S.H
    S.secTop = sr.top + window.scrollY; S.secH = sr.height
    if (!(sr.bottom > 1 && sr.top < vh - 1)) return
    const dt = clamp(time - (S.tPrev || time), 0, 0.1)
    S.tPrev = time
    try {
      S.rect = S.sticky.getBoundingClientRect()
      if (time - (S.lastSizeCheck || 0) > 0.25) {
        S.lastSizeCheck = time
        const [w, h] = viewSize()
        // 画质变了：重设画布分辨率（行凶、发现两个镜头里墨迹画布正被用着，等离开再换，免得墨迹被清掉）
        const qNow = S.qDirty && S.idx !== 1 && S.idx !== 2
        if (Math.abs(w - S.W) > 1 || Math.abs(h - S.H) > 1 || qNow) { S.qDirty = false; layout() }
      }
      const p = clamp(-sr.top / Math.max(1, sr.height - S.H))
      S.p = p
      S.fast = S.st ? Math.abs(S.st.getVelocity()) > S.H * 3.2 : false
      const x = p * TOTAL
      let i = 0
      while (i < SHOTS.length - 1 && x >= SHOTS[i].b) i++
      const lp = clamp((x - SHOTS[i].a) / SHOTS[i].w)
      readCursor(time)
      if (i !== S.idx) switchTo(i, lp)
      S.lp = lp
      const quiet = S.fast || S.qEntry
      S.qFrame = S.qEntry
      runBeats(SH[i], lp, quiet)
      SH[i].update(lp, dt, time)
      S.qEntry = false
      S.qFrame = false
      // 遮幅：直接缩放上下两条（原先写舞台上的 --lbk，整棵子树重算样式、两条重排）
      const lb = sstep(0, 0.015, p) * (1 - sstep(0.985, 1, p))
      const lbt = `scaleY(${lb.toFixed(3)})`
      put(S.lbT, 'transform', lbt)
      put(S.lbB, 'transform', lbt)
      // 循环环
      let pr = p
      if (i === 6) pr = ((SHOTS[6].a + Math.min(lp, 0.68) * SHOTS[6].w) / TOTAL) * (1 - eio(seg(0.68, 0.86, lp)))
      put(NAV.arc, 'strokeDasharray', `${pr.toFixed(4)} 1`)
      const ni = i === 6 && lp >= 0.68 ? (SA.rw >= 0 && SA.rw < 99 ? SA.rw : 0) : i
      if (NAV.shown !== ni) { NAV.shown = ni; NAV.no.textContent = U.roman(ni + 1); NAV.dots.forEach((d, k) => d.classList.toggle('is-on', k === ni)) }
    } catch (e) {
      if (!S.err) { S.err = true; console.error('[cycle]', e) }
    }
  }

  /* =========================================================
     挂载
     ========================================================= */
  function mount(sec) {
    S.sec = sec
    sec.classList.add('cycle')
    // 结构尺寸写成内联样式：即使样式表缺失或没加载完，板块也只有 (TOTAL+1) 屏高
    const secH = ((TOTAL + 1) * 100).toFixed(0) + 'vh'
    sec.style.setProperty('--cycle-h', secH)
    Object.assign(sec.style, { height: secH, minHeight: '0', position: 'relative' })
    S.sticky = el('div.cycle-sticky')
    Object.assign(S.sticky.style, { position: 'sticky', top: '0', width: '100%', height: '100vh', overflow: 'hidden', contain: 'strict' })
    S.stage = el('div.cycle-stage', { 'data-shot': 'mandate' })
    Object.assign(S.stage.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', overflow: 'hidden' })
    for (const sh of SH) S.stage.appendChild(sh.build())
    // 画布的位图尺寸随舞台走，但它们的盒子永远是 100% × 100%，不参与撑高
    for (const cv of S.stage.querySelectorAll('canvas')) Object.assign(cv.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' })
    S.lbT = el('i.t'); S.lbB = el('i.b')
    S.stage.append(
      buildPhase(), buildBC(),
      el('div.cycle-lb', { 'aria-hidden': 'true' }, [S.lbT, S.lbB]),
      buildNav(), buildCut(),
    )
    // 位图肖像的“眼睛”滤镜：亮度 → 血粉
    const defs = U.svg('svg', { class: 'cycle-defs', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' })
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
    defs.innerHTML = '<filter id="cycle-pinkeye" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="' +
      '.2445 .8225 .0830 0 0  .0383 .1287 .0130 0 0  .1084 .3648 .0368 0 0  0 0 0 1 0"/></filter>'
    S.stage.appendChild(defs)
    S.sticky.appendChild(S.stage)
    sec.appendChild(S.sticky)

    S.q = App.quality && typeof App.quality.level === 'number' ? App.quality.level : 2
    App.bus.on('quality', q => { if (q !== S.q) { S.q = q; S.qDirty = true; S.lastSizeCheck = 0 } })
    S.cast = pickCast()
    S.Etime = U.rand(0, 1800)
    S.E = 6 * 3600 + S.Etime
    computeStory()
    for (const sh of SH) if (sh.setCast) sh.setCast()
    layout()

    // 进度与可见性都按板块的实时位置算，不依赖 ScrollTrigger 缓存的起止点：
    // 上方板块（卡池、十五席……）事后变高而没有 refresh 时，本板块的镜头也不会错位。
    // ScrollTrigger 只用来读滚动速度（快速拖过时静默）。
    S.st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' })
    App.onVisible(sec, v => {
      S.visible = v
      if (!v) { clearLater(); hush() }
    }, { rootMargin: '0px' })
    S.visible = (() => { const r = sec.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight })()
    { const r = sec.getBoundingClientRect(); S.secTop = r.top + window.scrollY; S.secH = r.height } // 供 frame() 粗估远近（之后每帧在视口里时更新）
    // 「近」：离视口半屏多一点以内（决定舞台锁不锁）
    App.onVisible(sec, (v, e) => {
      S.near = v
      if (e && e.boundingClientRect) { S.secTop = e.boundingClientRect.top + window.scrollY; S.secH = e.boundingClientRect.height }
    }, { rootMargin: '60% 0px' })
    S.near = (() => { const r = sec.getBoundingClientRect(), h = window.innerHeight; return r.bottom > -0.6 * h && r.top < 1.6 * h })()
    // 离视口很远（scroll.js 的 is-far）：释放可以重画出来的画布（余波的金币画布、发现镜头的走廊画布），回来时重画
    App.bus.on('section:far', id => { if (id === 'cycle' && !S.far) { S.far = true; S.restore = false; SA.release(); SD.release() } })
    App.bus.on('section:near', id => { if (id === 'cycle' && S.far) { S.far = false; S.restore = true } })

    const onTouch = e => {
      const p = e.touches ? e.touches[0] : e
      if (!p) return
      S.lastTouch = performance.now()
      S.touchX = p.clientX; S.touchY = p.clientY
    }
    S.stage.addEventListener('touchstart', onTouch, { passive: true })
    S.stage.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('resize', U.debounce(() => { if (S.ready) layout() }, 150))

    App.bus.on('cast:change', () => {
      S.cast = pickCast()
      for (const sh of SH) if (sh.setCast) { try { sh.setCast() } catch (e) { console.error('[cycle]', e) } }
      if (S.W) layout()
      // 当前镜头按新的人重进一次
      const i = S.idx
      if (i >= 0) { S.idx = -1; switchTo(i, S.lp); S.qEntry = true }
    })
    App.bus.on('section:enter', id => {
      if (id !== 'cycle') return
      const sh = SHOTS[Math.max(0, S.idx)]
      const pal = S.idx === 6 && !SA.palAfter ? SHOTS[0].pal : sh.pal
      if (App.bg) App.bg.setPalette(pal, 1.2)
      App.audio.setMood({ tension: S.tension >= 0 ? S.tension : sh.tension })
    })
    App.bus.on('section:leave', id => { if (id === 'cycle') App.audio.setMood({ tension: 0 }) })

    S.ready = true
    App.tick(frame)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (S.ready) layout() })
  }

  S.def = App.section('cycle', {
    palette: SHOTS[0].pal,
    track: 'investigation',
    mount,
  })
})()
