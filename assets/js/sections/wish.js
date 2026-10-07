/* ==========================================================
   终章 · wish —— 回到同一张圆桌
   同样的俯视构图；滚动推进时十五把椅子一把接一把熄灭（编号变成锈红，人伏倒或散成墨），
   直到只剩最后一把，被穹顶顶端落下的一束光照着。
   那个人：模拟庭审若有胜者（App.state.winner / bus 'trial:winner'）就是他；
   否则这个位置的人在 38 人中缓慢轮换：剪影 → 片刻显形 → 又沉回黑暗。
   光标在黑暗里照出漂浮的愿望低语。最后「再睡一次」：眼睑合上，回到顶端，重新醒来。
   复用 App.domeHall（prologue.js）。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const TAU = Math.PI * 2
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v)
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
  const mix = (a, b, t) => a + (b - a) * t
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  // 《主持人游戏》第六节：仍存活、在馆且参加游戏的人只剩一名时，主持人实现其任何愿望。
  const RULE = '只剩一名时，实现其任何愿望。'

  // 滚动节点（钉住段的进度 0–1）
  const T = { out0: 0.07, outSpan: 0.5, beam0: 0.58, beam1: 0.68, cam0: 0.62, cam1: 0.84, fin: 0.8 }

  const W = {
    el: null, H: null, E: null, vis: false, p: 0, ps: 0, mob: false,
    fk: 1, order: [], mode: {}, outN: -1, people: [], winner: null,
    rot: { list: [], i: 0, id: null, calls: [] }, lineToken: 0, finaleOn: false, beamRung: false, lastP: 0,
    whispers: [], ptrIn: false, touchUntil: 0, sleeping: false, cur: null, yawT: 0,
  }

  /* ---------- DOM ---------- */
  function build(el) {
    const E = (W.E = {})
    el.innerHTML = ''
    E.track = U.el('div.wish-track')
    E.sticky = U.el('div.wish-sticky')
    E.stage = U.el('div.wish-stage')
    E.cv = U.el('canvas.wish-cv', { 'aria-hidden': 'true' })
    E.ribs = U.el('canvas.wish-ribs', { 'aria-hidden': 'true' })
    E.stage.append(E.cv, E.ribs)
    E.whis = U.el('div.wish-whispers', { 'aria-hidden': 'true' })
    E.countN = U.el('span.wish-count-n', { text: 'XV' })
    E.count = U.el('div.wish-count', { 'aria-hidden': 'true' }, [E.countN, U.el('i.wish-count-bar')])
    E.face = U.el('div.wish-face')
    E.eyes = U.el('div.wish-eyes', { 'aria-hidden': 'true' }, [U.el('i'), U.el('i')])
    E.faceWrap = U.el('div.wish-face-wrap', null, [E.face, E.eyes])
    E.faceAnim = U.el('div.wish-face-anim', null, [E.faceWrap])
    E.no = U.el('b.wish-no')
    E.name = U.el('span.wish-name')
    E.line = U.el('p.wish-line')
    E.who = U.el('div.wish-who', null, [U.el('div.wish-who-head', null, [E.no, E.name]), E.line])
    E.last = U.el('figure.wish-last', null, [E.faceAnim])
    E.rule = U.el('p.wish-rule', { text: RULE })
    // 位图肖像的剪影：身体压成纯黑，只留下画里血粉色的眼睛（蓝 − 绿 > 0 的像素）并让它发光
    E.defs = U.el('div.wish-defs', { 'aria-hidden': 'true', html:
      '<svg width="0" height="0" focusable="false"><filter id="wish-silf" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.016  0 0 0 0 0.016  0 0 0 1 0" result="body"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="1.5 0 0 0 0.08  0 1.3 0 0 0.02  0 0 1.4 0 0.06  0 -7 7 0 -0.18" result="hue"/>' +
      '<feComposite in="hue" in2="SourceAlpha" operator="in" result="eyes"/>' +
      '<feGaussianBlur in="eyes" stdDeviation="5" result="glow"/>' +
      '<feMerge><feMergeNode in="body"/><feMergeNode in="glow"/><feMergeNode in="glow"/><feMergeNode in="eyes"/></feMerge>' +
      '</filter></svg>' })
    // 进场与离场的两道暗：上沿从上一板块的墨色里化开；离开时整体压暗，下沿沉进「再睡一次」的黑
    E.shade = U.el('i.wish-shade', { 'aria-hidden': 'true' })
    E.fadeTop = U.el('i.wish-fade-top', { 'aria-hidden': 'true' })
    E.fadeEnd = U.el('i.wish-fade-end', { 'aria-hidden': 'true' })
    E.sticky.append(E.defs, E.stage, E.whis, E.last, E.who, E.count, E.rule, E.shade, E.fadeTop)
    E.track.append(E.sticky, E.fadeEnd)

    E.sleep = U.el('button.wish-sleep', { type: 'button', 'data-cursor': '闭眼' }, [U.el('span.wish-sleep-label', { text: '再睡一次' })])
    E.foot = U.el('footer.wish-foot', null, [
      U.el('span.wish-foot-mark', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="3.2"/></svg>' }),
      U.el('span.wish-foot-name', { text: '夙与愿' }),
    ])
    // 十五道刻度围成的环：十四道锈红，一道骨白（还亮着的那把椅子）
    let ticks = ''
    for (let i = 0; i < 15; i++) {
      const a = i / 15 * Math.PI * 2
      const x1 = 100 + Math.sin(a) * 86, y1 = 100 - Math.cos(a) * 86, x2 = 100 + Math.sin(a) * 94, y2 = 100 - Math.cos(a) * 94
      ticks += '<line data-k="' + (i + 1) + '" x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '"/>'
    }
    E.ring = U.el('div.wish-end-ring', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90"/><circle class="wish-end-ring-in" cx="100" cy="100" r="58"/>' + ticks + '</svg>' })
    E.end = U.el('div.wish-end', null, [U.el('div.wish-end-glow', { 'aria-hidden': 'true' }), E.ring, E.sleep, E.foot])
    if (App.trackMouseVars) App.trackMouseVars(E.ring)

    E.lidT = U.el('i.wish-lid.wish-lid--top')
    E.lidB = U.el('i.wish-lid.wish-lid--bottom')
    E.lids = U.el('div.wish-lids', { 'aria-hidden': 'true' }, [E.lidT, E.lidB])
    el.append(E.track, E.end, E.lids)
  }

  function layout() {
    const H = W.H
    W.mob = App.isMobile()
    H.resize()
    const portrait = H.H > H.W * 1.15
    H.fit = portrait ? 0.4 : 0.36
    H.numScale = portrait ? 1.7 : (Math.min(H.W, H.H) < 700 ? 1.3 : 1)
    H.lensW = portrait ? 0.95 : 0.62
    H.lensH = portrait ? 0.38 : 0.62
    H.ribA = portrait ? 0.55 : 1
    W.oy0 = portrait ? H.H * 0.04 : 0
    layoutWhispers()
  }

  /* ---------- 席位与熄灭顺序 ---------- */
  function setup() {
    const H = W.H
    W.people = App.domeHall.people()
    H.setPeople(W.people)
    const win = W.winner && App.char(W.winner) ? W.winner : null
    let fk = 1
    if (win) {
      const i = W.people.indexOf(win)
      if (i >= 0) fk = i + 1
      else H.setPerson(1, win)
    }
    W.fk = fk
    const rnd = U.seeded(fk * 977 + 15)
    const others = H.seats.map(s => s.k).filter(k => k !== fk)
    for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = others[i]; others[i] = others[j]; others[j] = t }
    W.order = others
    W.mode = {}
    others.forEach((k, i) => { W.mode[k] = i % 3 === 1 ? 'gone' : 'fall' })
    for (const s of H.seats) {
      gsap.killTweensOf(s)
      Object.assign(s, { awake: 1, eyes: 1, lamp: 1, lit: 1, out: 0, fall: 0, gone: 0, _out: false })
    }
    // 镜头最后转向那把椅子（取最短的方向）
    const a = H.seats[fk - 1].a
    let y = -a
    while (y > Math.PI) y -= TAU
    while (y < -Math.PI) y += TAU
    W.yawT = y
    // 轮换名单：从那把椅子上原本的人开始
    const first = H.seats[fk - 1].id
    W.rot.list = [first].concat(U.shuffle(App.chars.map(c => c.id).filter(id => id !== first)))
    W.rot.i = 0
    W.cur = win || first
    W.outN = -1
    syncOut(true)
    buildWhispers()
    for (const l of W.E.ring.querySelectorAll('line')) l.classList.toggle('is-last', +l.dataset.k === fk)
    W.E.ring.style.setProperty('--ring-rot', (-(fk - 1) * 24) + 'deg')
    if (W.finaleOn) { stopFinale(true); startFinale() }
  }

  function outCount(p) {
    if (p < T.out0) return 0
    return Math.min(14, Math.floor((p - T.out0) / (T.outSpan / 14)) + 1)
  }

  function syncOut(instant) {
    const H = W.H
    const n = outCount(W.ps)
    if (n === W.outN) return
    const prev = W.outN
    W.outN = n
    let loud = null
    W.order.forEach((k, i) => {
      const s = H.seats[k - 1]
      const out = i < n
      if (out === s._out) return
      s._out = out
      gsap.killTweensOf(s)
      if (instant) {
        Object.assign(s, out
          ? { lamp: 0, out: 1, eyes: 0, fall: W.mode[k] === 'fall' ? 1 : 0, gone: W.mode[k] === 'gone' ? 1 : 0, awake: W.mode[k] === 'fall' ? 0.6 : 1 }
          : { lamp: 1, out: 0, eyes: 1, fall: 0, gone: 0, awake: 1 })
      } else if (out) {
        extinguish(s, W.mode[k])
        loud = s
      } else {
        gsap.to(s, { lamp: 1, out: 0, eyes: 1, fall: 0, gone: 0, awake: 1, duration: 0.7, ease: 'power2.out' })
      }
    })
    if (loud && n > prev && prev >= 0) {
      const pan = U.clamp(loud.x / 3.2, -1, 1) * 0.7
      App.audio.sfx('heartbeat', { volume: 0.8, pitch: 0.82 + n * 0.012 })
      App.audio.sfx('tick', { volume: 0.55, pitch: 0.42, pan, delay: 0.34 })
      if (W.mode[loud.k] === 'fall') App.audio.sfx('drop', { volume: 0.35, pitch: 0.55, pan, delay: 1.1 })
    }
    setCount(15 - n, instant)
  }

  function extinguish(s, mode) {
    W.H.ripple(s.k, [150, 28, 28], true)
    // 灯先抽搐两下，再熄
    gsap.timeline()
      .to(s, { lamp: 0.2, duration: 0.05, ease: 'none' })
      .to(s, { lamp: 0.85, duration: 0.06, ease: 'none' })
      .to(s, { lamp: 0.1, duration: 0.04, ease: 'none' })
      .to(s, { lamp: 0, duration: 0.6, ease: 'power2.in' })
    s.flash = 0.35
    gsap.to(s, { out: 1, duration: 1, ease: 'power2.out' })
    gsap.to(s, { eyes: 0, duration: 0.3, delay: 0.28, ease: 'power3.in' })
    if (mode === 'fall') gsap.to(s, { fall: 1, awake: 0.6, duration: 1.1, delay: 0.32, ease: 'power3.in' })
    else gsap.to(s, { gone: 1, duration: 1.9, delay: 0.3, ease: 'power2.inOut' })
  }

  function setCount(n, instant) {
    const E = W.E
    const t = U.roman(Math.max(1, n))
    if (E.countN.textContent === t) return
    E.count.classList.toggle('is-last', n <= 1)
    if (instant || App.reduced) { E.countN.textContent = t; return }
    App.text.scramble(E.countN, t, { duration: 0.42, chars: 'IVX', revealDelay: 0.05 })
    gsap.fromTo(E.count, { x: -4 }, { x: 0, duration: 0.5, ease: 'expo.out' })
  }

  /* ---------- 最后那个人 ---------- */
  function showPerson(id, reveal) {
    const E = W.E, c = App.char(id)
    if (!c) return
    W.cur = id
    W.H.setPerson(W.fk, id)
    if (W.untrack) { W.untrack(); W.untrack = null }
    E.face.innerHTML = ''
    W.pt = null
    // 三种情况：位图肖像（正式）、矢量旧稿、还没有肖像（只用画布里那团黑影）
    W.kind = App.hasPortrait && App.hasPortrait(id) ? 'art' : 'none'
    if (W.kind === 'art') {
      const pt = App.portrait(id, { track: false, className: 'wish-portrait' })
      const img = pt.classList.contains('is-photo') && pt.querySelector('img')
      if (img) {
        W.kind = 'photo'
        pt.appendChild(U.el('div.wish-sil', { 'aria-hidden': 'true' }, [U.el('img', { src: img.getAttribute('src'), alt: '', decoding: 'async', draggable: 'false' })]))
        // 图片文件缺失：不用占位的蛋形剪影，改由画布里那团黑影当这个人
        img.addEventListener('error', () => {
          if (W.pt !== pt) return
          W.kind = 'none'
          E.faceWrap.classList.remove('is-photo')
          E.faceWrap.classList.add('is-empty')
          if (W.finaleOn) gsap.to(W.H.seats[W.fk - 1], { gone: 0, duration: 1.2, ease: 'power2.inOut', overwrite: 'auto' })
        }, { once: true })
      }
      E.face.appendChild(pt)
      W.untrack = App.trackEyes(pt, { eyeRange: 9 })
      W.pt = pt
    }
    E.faceWrap.classList.add('is-sil')
    E.faceWrap.classList.toggle('is-photo', W.kind === 'photo')
    E.faceWrap.classList.toggle('is-empty', W.kind === 'none')
    placeEyes()
    // 有肖像时画布里那团黑影让位给肖像；没有时它就是那个人
    if (W.finaleOn) gsap.to(W.H.seats[W.fk - 1], { gone: W.kind === 'none' ? 0 : 0.92, duration: 1.2, ease: 'power2.inOut', overwrite: 'auto' })
    const acc = c.art && c.art.accent ? c.art.accent : '#c29a5b'
    E.faceWrap.style.setProperty('--acc', acc)
    E.who.style.setProperty('--acc', acc)
    E.no.textContent = U.roman(W.fk)
    E.name.textContent = c.name
    E.line.textContent = ''
    gsap.fromTo(E.faceAnim, { opacity: 0, y: 26, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.6, ease: 'expo.out', clearProps: 'filter' })
    gsap.fromTo(E.name, { opacity: 0, letterSpacing: '0.5em' }, { opacity: 1, letterSpacing: '0.06em', duration: 1.4, ease: 'expo.out', delay: 0.2 })
    gsap.fromTo(E.no, { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.1 })
    if (reveal) later(1.5, () => manifest(id))
  }
  // 矢量旧稿：剪影时的两点眼光放在 .p-eye 实际所在处；量不到（或是位图）就不放
  function placeEyes() {
    const E = W.E
    const dots = E.eyes.children
    const eyes = W.kind === 'art' && W.pt ? Array.from(W.pt.querySelectorAll('.p-eye')).slice(0, 2) : []
    const pr = W.pt && W.pt.getBoundingClientRect()
    W.eyeOk = false
    if (eyes.length === 2 && pr && pr.width > 0) {
      eyes.forEach((e, i) => {
        const r = e.getBoundingClientRect()
        dots[i].style.left = ((r.left + r.width / 2 - pr.left) / pr.width * 100).toFixed(2) + '%'
        dots[i].style.top = ((r.top + r.height / 2 - pr.top) / pr.height * 100).toFixed(2) + '%'
        dots[i].style.width = Math.max(1.2, Math.min(2.4, r.width / pr.width * 40)).toFixed(2) + '%'
      })
      W.eyeOk = true
    }
    E.eyes.style.display = W.eyeOk ? '' : 'none'
  }
  // 显形：剪影亮起，浮出他的愿望
  function manifest(id) {
    const E = W.E, c = App.char(id)
    if (!c || W.cur !== id) return
    E.faceWrap.classList.remove('is-sil')
    // 没有肖像的人：画布里那双眼睛猛地亮一下
    if (W.kind === 'none') W.H.seats[W.fk - 1].flash = 1
    App.audio.sfx('whoosh', { volume: 0.35, pitch: 0.7 })
    const tok = ++W.lineToken
    gsap.set(E.line, { opacity: 1, filter: 'blur(0px)', letterSpacing: '0.04em' })
    later(0.7, () => App.text.type(E.line, (c.lines && c.lines.wish) || '……', { speed: 62, cancel: () => tok !== W.lineToken }))
  }
  // 沉回黑暗
  function sink(then) {
    const E = W.E
    W.lineToken++
    E.faceWrap.classList.add('is-sil')
    gsap.to(E.line, { opacity: 0, filter: 'blur(8px)', letterSpacing: '0.4em', duration: 1.4, ease: 'power2.in' })
    gsap.to([E.name, E.no], { opacity: 0, duration: 1.2, delay: 0.5, ease: 'power2.in' })
    gsap.to(E.faceAnim, { opacity: 0, y: 18, filter: 'blur(8px)', duration: 1.3, delay: 1.1, ease: 'power2.in', onComplete: then })
  }
  function later(sec, fn) {
    W.rot.calls = W.rot.calls.filter(c => c.progress() < 1)
    const d = gsap.delayedCall(sec, fn)
    W.rot.calls.push(d)
    return d
  }
  function rotate() {
    if (!W.finaleOn || W.winner) return
    // 看不见的时候不换人，过一会儿再来
    if (!W.vis) { later(2, rotate); return }
    sink(() => {
      if (!W.finaleOn) return
      W.rot.i = (W.rot.i + 1) % W.rot.list.length
      let id = W.rot.list[W.rot.i]
      if (id === W.cur) { W.rot.i = (W.rot.i + 1) % W.rot.list.length; id = W.rot.list[W.rot.i] }
      showPerson(id, true)
      const c = App.char(id)
      const len = (c && c.lines && c.lines.wish ? c.lines.wish.length : 10)
      later(1.5 + 0.7 + len * 0.07 + 4.2, rotate)
    })
  }
  function startFinale() {
    if (W.finaleOn) return
    W.finaleOn = true
    const E = W.E
    E.last.classList.add('is-on')
    E.who.classList.add('is-on')
    gsap.to(E.rule, { opacity: 1, duration: 2.2, delay: 1.2, ease: 'power2.out' })
    if (E.rule._chars) App.text.reveal(E.rule, { stagger: 0.07, duration: 1.6, y: 20, delay: 1.2 })
    const id = W.winner && App.char(W.winner) ? W.winner : W.cur
    showPerson(id, true)
    if (!W.winner) {
      const c = App.char(id)
      const len = (c && c.lines && c.lines.wish ? c.lines.wish.length : 10)
      later(1.5 + 0.7 + len * 0.07 + 4.5, rotate)
    }
  }
  function stopFinale(instant) {
    if (!W.finaleOn) return
    W.finaleOn = false
    for (const d of W.rot.calls) d.kill()
    W.rot.calls.length = 0
    W.lineToken++
    const E = W.E
    E.last.classList.remove('is-on')
    E.who.classList.remove('is-on')
    gsap.killTweensOf([E.faceAnim, E.line, E.name, E.no, E.rule])
    gsap.to([E.faceAnim, E.rule, E.name, E.no, E.line], { opacity: 0, duration: instant ? 0 : 0.5, ease: 'power2.out' })
    const s = W.H.seats[W.fk - 1]
    gsap.to(s, { gone: 0, duration: instant ? 0 : 0.8 })
    // 下次进入时，从同一个人重新开始
    if (!W.winner && W.cur) W.H.setPerson(W.fk, W.cur)
  }

  function setWinner(id) {
    if (!id || !App.char(id) || W.winner === id) return
    W.winner = id
    if (W.H) setup()
  }

  /* ---------- 愿望低语 ---------- */
  function buildWhispers() {
    const E = W.E
    E.whis.innerHTML = ''
    W.whispers = []
    const skip = new Set([W.H.seats[W.fk - 1].id, W.winner])
    const pool = U.shuffle(App.chars.filter(c => !skip.has(c.id) && c.lines && c.lines.wish))
    const n = App.isMobile() ? 8 : 12
    for (let i = 0; i < n && i < pool.length; i++) {
      const el = U.el('span.wish-w', { text: pool[i].lines.wish })
      E.whis.appendChild(el)
      W.whispers.push({ el, x: 0, y: 0, ph: Math.random() * TAU, o: 0, last: '', v: false, on: true })
    }
    layoutWhispers()
  }
  // 低语散在画面两侧：量出每句的实际尺寸（按读得清时的字距），避开中轴（圆桌与最后那个人）、名字与台词、
  // 右侧竖排的那句话、左下的计数与顶端 HUD，彼此也不重叠；放不下的那句就不出现
  function layoutWhispers() {
    if (!W.H || !W.whispers.length) return
    const Wd = W.H.W, Hd = W.H.H, mob = App.isMobile()
    const rnd = U.seeded(W.fk * 131 + Math.round(Wd) * 7 + Math.round(Hd))
    const m = mob ? 10 : 16
    const busy = [
      [0, 0, Wd, mob ? 64 : 84],                                                    // HUD
      [0, Hd - (mob ? 110 : 190), mob ? 170 : 300, Hd],                              // 计数
      [Wd - (mob ? 44 : Math.max(110, Wd * 0.024 + 120)), 0, Wd, Hd * 0.82],         // 竖排的那句话
    ]
    if (mob) {
      busy.push([Wd * 0.2, 0, Wd * 0.8, Hd])                                          // 手机：中间整列留给人和圆桌
      busy.push([0, Hd * 0.46, Wd, Hd * 0.68])                                        // 名字与愿望那一行
    } else {
      busy.push([Wd * 0.33, 0, Wd * 0.67, Hd])                                        // 中轴
      busy.push([Wd * 0.33 - Math.min(416, Wd * 0.32) - 24, Hd * 0.36, Wd * 0.33, Hd * 0.7]) // 名字与愿望
    }
    const hit = r => busy.some(b => r[0] < b[2] + m && r[2] > b[0] - m && r[1] < b[3] + m && r[3] > b[1] - m)
    W.whispers.forEach((w, i) => {
      const el = w.el
      w.v = mob || i % 3 === 1
      el.classList.toggle('is-v', w.v)
      el.style.letterSpacing = '0.22em' // 读得清时的字距
      el.style.filter = 'none'
      const ew = el.offsetWidth, eh = el.offsetHeight
      w.last = ''
      let ok = null
      for (let t = 0; t < 40 && !ok; t++) {
        const x = m + ew / 2 + rnd() * Math.max(1, Wd - 2 * m - ew)
        const y = (mob ? 70 : 92) + eh / 2 + rnd() * Math.max(1, Hd - (mob ? 80 : 110) - eh)
        const r = [x - ew / 2, y - eh / 2, x + ew / 2, y + eh / 2]
        if (!hit(r)) ok = [x, y, r]
      }
      w.on = !!ok
      el.style.display = ok ? '' : 'none'
      if (!ok) return
      busy.push(ok[2])
      w.x = ok[0]; w.y = ok[1]
      el.style.left = w.x.toFixed(0) + 'px'
      el.style.top = w.y.toFixed(0) + 'px'
    })
  }
  function updWhispers(t, rdt) {
    const up = 1 - Math.exp(-rdt / 0.11), down = 1 - Math.exp(-rdt / 0.5)
    if (!W.whispers.length) return
    const H = W.H
    const on = sstep(0.1, 0.26, W.ps)
    let mx = H.ptr.x, my = H.ptr.y, str = 1
    if (!H.ptr.on) {
      // 没有光标时，一个看不见的游魂慢慢掠过
      mx = H.W / 2 + Math.cos(t * 0.11) * H.W * 0.4
      my = H.H / 2 + Math.sin(t * 0.17 + 1) * H.H * 0.34
      str = 0.75
    }
    const R = W.mob ? 150 : 230
    for (const w of W.whispers) {
      if (!w.on) continue
      const d = Math.hypot(w.x - mx, w.y - my)
      let k = clamp01(1 - d / R)
      k = k * k * (3 - 2 * k) * str
      w.o += (k - w.o) * (k > w.o ? up : down)
      const o = w.o
      const op = on * (0.045 + 0.85 * o)
      const key = op.toFixed(3) + '|' + o.toFixed(2)
      if (key === w.last) continue
      w.last = key
      const dx = Math.sin(t * 0.3 + w.ph) * 6, dy = Math.cos(t * 0.23 + w.ph) * 5
      w.el.style.opacity = op.toFixed(3)
      w.el.style.filter = o > 0.97 ? 'none' : 'blur(' + ((1 - o) * 4.5).toFixed(2) + 'px)'
      w.el.style.letterSpacing = (0.08 + (1 - o) * 0.4).toFixed(3) + 'em'
      w.el.style.transform = 'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)'
    }
  }

  /* ---------- 滚动 ---------- */
  function applyScroll(p) {
    const H = W.H, v = H.view, E = W.E
    syncOut(false)
    // 一束光
    const b = sstep(T.beam0, T.beam1, p)
    H.beam.k = W.fk - 1
    H.beam.amt = b
    if (p > T.beam0 + 0.02 && !W.beamRung && p > W.lastP) { W.beamRung = true; App.audio.sfx('chime', { volume: 0.6 }) }
    if (p < T.beam0) W.beamRung = false
    // 光标的光让位给那束光
    H.poolA = 1 - 0.55 * sstep(T.beam0, T.cam1, p)
    // 镜头落向最后一把椅子
    const s = H.seats[W.fk - 1]
    const t = easeIO(sstep(T.cam0, T.cam1, p))
    // 离场时镜头缓缓抬起、退远，收进穹顶的黑暗
    const lv = easeIO(W.lv || 0)
    v.elev = mix(Math.PI / 2, W.mob ? 1.08 : 0.98, t) + 0.16 * lv
    v.dist = mix(10.6, W.mob ? 8.4 : 6.6, t) * (1 + 0.24 * lv)
    v.tx = mix(0, s.x * 0.66, t)
    v.ty = mix(0, s.y * 0.66, t)
    v.tz = mix(0.45, 1.0, t)
    v.yaw = mix(Math.sin(H.time * 0.05) * 0.05, W.yawT, t)
    v.oy = mix(W.oy0, W.oy0 + H.H * (W.mob ? 0.1 : 0.06), t)
    H.lensA = 0.85 - 0.35 * t
    // 镜头落下时，四壁与陈设退进黑暗，只留圆桌与那束光
    H.wallA = 1 - 0.85 * t
    H.chandA = 1 - 0.85 * t
    // 熄灭后的厅更暗
    H.o.amb = mix(0.06, 0.03, sstep(T.out0, T.out0 + T.outSpan, p))
    // 计数与最后的那个人
    E.count.style.opacity = (sstep(0.02, 0.08, p) * (1 - (W.mob ? 1 : 0.6) * sstep(T.fin - 0.04, T.fin + 0.04, p))).toFixed(3)
    if (p > T.fin) startFinale()
    else if (p < T.fin - 0.04) stopFinale(false)
    W.lastP = p
  }

  /* ---------- 帧 ---------- */
  function frame(time, dt) {
    if (!W.H) return
    const H = W.H, E = W.E
    const now = performance.now()
    // 离得很远时隔几帧才量一次位置
    if (W.far && (W.farSkip = ((W.farSkip || 0) + 1) % 8)) return
    const sec = Math.min(0.1, (dt || 1) / 60)
    // 可见性与进度都直接取自钉住段的位置（不依赖可能迟到的观察器回调或过期的 ScrollTrigger 缓存）
    const tr = E.track.getBoundingClientRect(), vh = window.innerHeight
    W.far = tr.bottom < -vh || tr.top > vh * 2
    setVis(tr.bottom > 0 && tr.top < vh)
    if (!W.vis) return
    W.p = clamp01(-tr.top / Math.max(1, tr.height - window.innerHeight))
    edges(tr, vh)
    // 平滑跟随用真实时间（与帧率无关；隔了很久才回来就直接到位）
    const rdt = Math.min(1, (now - (W.lastNow || now)) / 1000)
    W.lastNow = now
    W.ps += (W.p - W.ps) * (1 - Math.exp(-rdt / 0.12))
    if (Math.abs(W.p - W.ps) < 0.0004) W.ps = W.p
    applyScroll(W.ps)
    const r = E.stage.getBoundingClientRect()
    const m = App.mouse
    const inside = m.x >= r.left && m.x <= r.right && m.y >= r.top && m.y <= r.bottom
    H.ptr.x = m.x - r.left; H.ptr.y = m.y - r.top
    H.ptr.on = W.ptrIn && inside && (App.finePointer || now < W.touchUntil)
    if (App.finePointer) {
      H.home.x = Math.sin(H.time * 0.2) * 0.4
      H.home.y = Math.cos(H.time * 0.15) * 0.3
      H.home.z = 5.6; H.homePow = 0.8; H.homeRange = 3.4
    } else {
      // 触屏：一点微光绕着圆桌游走
      const a = -H.time * 0.17
      H.home.x = Math.sin(a) * 3.6
      H.home.y = Math.cos(a) * 3.0
      H.home.z = 2.5; H.homePow = 1.3; H.homeRange = 2.6
    }
    H.update(sec)
    H.render()
    updWhispers(H.time, rdt)
    // 那个人的肖像：眼睛落在画布里那颗头的位置
    if (W.finaleOn) {
      const hs = H.headScreen(W.fk)
      const fh = E.faceWrap.offsetHeight || 1
      const fw = E.faceWrap.offsetWidth || 1
      let x = H.W / 2, y = H.H * 0.42
      if (hs) { x = hs.x; y = hs.y }
      x = U.clamp(x, fw * 0.5 + 8, H.W - fw * 0.5 - 8)
      y = W.mob ? U.clamp(y, fh * 0.41 + 64, H.H * 0.34) : U.clamp(y, fh * 0.41 + 70, H.H - fh * 0.59 - 20)
      E.last.style.transform = 'translate3d(' + (x - fw / 2).toFixed(1) + 'px,' + (y - fh * 0.41).toFixed(1) + 'px,0)'
      // 没有肖像时，名字贴着画布里那颗头
      const gap = W.kind === 'none' ? Math.max(70, (hs ? hs.s : 100) * 0.45) : fw * 0.5 + 28
      if (W.mob) E.who.style.transform = 'translate3d(0,' + (y + (W.kind === 'none' ? gap * 0.9 : fh * 0.5)).toFixed(1) + 'px,0)'
      else E.who.style.transform = 'translate3d(' + (x - gap).toFixed(1) + 'px,' + (y + (W.kind === 'none' ? -10 : fh * 0.12)).toFixed(1) + 'px,0)'
      // 矢量旧稿剪影时的两点眼光，跟着肖像的视线走
      const ew = W.eyeOk && W.pt && W.pt._eyes
      if (ew) E.eyes.style.transform = 'translate(' + (ew.ox * fw / 600).toFixed(2) + 'px,' + (ew.oy * fh / 800).toFixed(2) + 'px)'
    }
  }

  // 钉住段的两端：直接取自位置（与滚动同步，不经平滑）
  function edges(tr, vh) {
    const E = W.E
    // 进场：钉住之前，舞台上沿是一道从墨色里化开的渐变，长度随露出的高度伸缩（钉住时收尽）
    const top = tr.top > 0 ? Math.min(1, tr.top * 1.3 / (vh * 0.52)) : 0
    // 离场：e = 舞台下沿离开视口底边的距离
    const e = vh - tr.bottom
    const lv = clamp01(e / vh)
    const pre = clamp01((e + vh * 0.14) / (vh * 0.14))
    const fe = pre * 0.26 + 0.74 * sstep(0, 0.72, lv)
    const sh = 0.84 * sstep(0.02, 0.86, lv)
    // 舞台比页面滚得慢：像是沉进黑暗，而不是被推走
    const dy = e > 0 ? e * 0.38 : 0
    W.lv = lv
    const key = top.toFixed(3) + '|' + fe.toFixed(3) + '|' + sh.toFixed(3) + '|' + dy.toFixed(1)
    if (key === W.edgeKey) return
    W.edgeKey = key
    E.fadeTop.style.transform = 'scaleY(' + top.toFixed(3) + ')'
    E.fadeEnd.style.transform = 'scaleY(' + fe.toFixed(3) + ')'
    E.shade.style.opacity = sh.toFixed(3)
    // 落后的那一截不越过钉住段的底边（下面「再睡一次」的底色是半透明的）
    E.sticky.style.transform = dy ? 'translate3d(0,' + dy.toFixed(1) + 'px,0)' : ''
    E.sticky.style.clipPath = dy ? 'inset(0 0 ' + dy.toFixed(1) + 'px 0)' : ''
  }

  function setVis(v) {
    if (W.vis === v) return
    W.vis = v
  }

  /* ---------- 再睡一次 ---------- */
  function sleepAgain() {
    if (W.sleeping) return
    W.sleeping = true
    const E = W.E
    E.lids.style.display = 'block'
    gsap.set(E.lidT, { yPercent: -102 })
    gsap.set(E.lidB, { yPercent: 102 })
    App.audio.sfx('whoosh', { volume: 0.55, pitch: 0.6 })
    const slow = !App.reduced
    const tl = gsap.timeline({ onComplete: () => { E.lids.style.display = 'none'; W.sleeping = false } })
    if (slow) {
      // 沉重地合上：半合 → 挣扎着睁开一点 → 合拢
      tl.to(E.lidT, { yPercent: -48, duration: 1.0, ease: 'power2.inOut' })
        .to(E.lidB, { yPercent: 44, duration: 1.0, ease: 'power2.inOut' }, '<')
        .to(E.lidT, { yPercent: -62, duration: 0.45, ease: 'power1.inOut' })
        .to(E.lidB, { yPercent: 58, duration: 0.45, ease: 'power1.inOut' }, '<')
    }
    tl.to([E.lidT, E.lidB], { yPercent: 0, duration: slow ? 0.75 : 0.3, ease: 'power3.in' })
      .add(() => App.audio.sfx('heartbeat', { volume: 0.9, pitch: 0.7 }))
      .add(() => {
        if (App.scroll && App.scroll.lenis) App.scroll.lenis.scrollTo(0, { immediate: true, force: true })
        else window.scrollTo(0, 0)
        ScrollTrigger.update()
        if (App.scroll) App.scroll.stop()
      }, '+=0.5')
      .add(() => App.audio.sfx('chimes5'), '+=0.6')
      .add(() => { App.bus.emit('wake'); if (App.scroll) App.scroll.start() }, slow ? '+=3.2' : '+=0.3')
    if (slow) {
      // 迷糊地睁眼（和遮幕一样）
      tl.to(E.lidT, { yPercent: -22, duration: 0.9, ease: 'power2.out' })
        .to(E.lidB, { yPercent: 18, duration: 0.9, ease: 'power2.out' }, '<')
        .to([E.lidT, E.lidB], { yPercent: 0, duration: 0.35, ease: 'power3.in' })
        .to(E.lidT, { yPercent: -55, duration: 1.0, ease: 'power2.out', delay: 0.3 })
        .to(E.lidB, { yPercent: 50, duration: 1.0, ease: 'power2.out' }, '<')
    }
    tl.to(E.lidT, { yPercent: -102, duration: slow ? 1.5 : 0.5, ease: 'expo.inOut' })
      .to(E.lidB, { yPercent: 102, duration: slow ? 1.5 : 0.5, ease: 'expo.inOut' }, '<')
  }

  App.section('wish', {
    palette: { a: '#050404', b: '#ebe3d6', glow: 0.1 },
    track: 'wish',
    mount(el) {
      if (!App.domeHall) return
      W.el = el
      el.classList.add('wish')
      build(el)
      W.H = App.domeHall.create({
        canvas: W.E.cv, ribCanvas: W.E.ribs,
        lightCol: [232, 222, 206], amb: 0.06, ambCol: [118, 118, 132],
        lampCol: [214, 188, 150], beamCol: [240, 233, 220],
        rim: [212, 196, 170], motes: App.reduced ? 20 : 60,
      })
      const H = W.H
      H.lampPow = 1.7; H.lampRange = 2.7; H.homePow = 0.8; H.homeRange = 3.4
      H.light.power = 0.8
      H.lensA = 0.85
      H.eyeScale = 1
      layout()
      W.E.rule._chars = App.text.split(W.E.rule)
      gsap.set([W.E.rule, W.E.faceAnim, W.E.name, W.E.no], { opacity: 0 })
      const w0 = App.state.winner
      if (w0 && App.char(w0)) W.winner = w0
      setup()
      // 结尾：滚到时浮出「再睡一次」与落款（每隔几帧量一次位置，不依赖可能迟到的观察器回调）
      let endShown = false, endSkip = 0
      App.tick(() => {
        if ((endSkip = (endSkip + 1) % 2)) return
        const r = W.E.end.getBoundingClientRect(), vh = window.innerHeight
        if (!endShown && r.top < vh * 0.72 && r.bottom > vh * 0.3) {
          endShown = true
          W.E.end.classList.add('is-shown')
          gsap.fromTo([W.E.sleep, W.E.foot], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.6, stagger: 0.25, ease: 'expo.out', delay: 0.5, overwrite: true })
          App.audio.sfx('chime', { volume: 0.35, pitch: 0.5 })
        } else if (endShown && (r.top > vh * 1.05 || r.bottom < 0)) {
          endShown = false
          W.E.end.classList.remove('is-shown')
          gsap.set([W.E.sleep, W.E.foot], { opacity: 0 })
        }
      })
      App.bus.on('trial:winner', setWinner)
      App.bus.on('cast:change', () => setup())
      const onMove = e => {
        W.ptrIn = true
        if (e.pointerType === 'touch') W.touchUntil = performance.now() + 2600
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onMove, { passive: true })
      document.documentElement.addEventListener('mouseleave', () => { W.ptrIn = false })
      window.addEventListener('blur', () => { W.ptrIn = false })
      W.E.sleep.addEventListener('click', sleepAgain)
      W.E.sleep.addEventListener('pointerenter', () => App.audio.sfx('heartbeat', { volume: 0.3, pitch: 1.2 }))
      window.addEventListener('resize', U.debounce(layout, 160))
      App.bus.on('quality', layout)
      App.tick(frame)
    },
  })
})()
