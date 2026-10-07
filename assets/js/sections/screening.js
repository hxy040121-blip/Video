/* ==========================================================
   放映 · screening —— 宣传片《夙与愿》
   · 馆里的一间放映室：放映机从观众身后打出一束光，幕布上无声地循环着宣传片。
     光束里浮着尘，光标一动，幕布微微转向光标，光束随之偏斜，尘被搅开。
   · 点幕布（或顶栏的放映按钮）进入全屏放映：先是一段倒数胶片，随后带声音播放；
     整站配乐淡出，看完或关闭后淡回。
   · 放映中：点画面暂停 / 继续，空格同上，← → 快退 / 快进 5 秒，底部铜线可拖动，Esc 关闭。
   App.screening.open() 供 HUD 调用。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const SRC = 'assets/video/promo.mp4'
  const POSTER = 'assets/video/promo-poster.jpg'
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
  const fmt = s => {
    s = Math.max(0, Math.floor(s || 0))
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
  }

  const S = { el: null, room: null, screen: null, preview: null, air: null, inView: false, rx: 0, ry: 0, theater: null, active: false }

  /* =====================================================================
     放映室
     ---------------------------------------------------------------------
     性能：幕布后面的一切（放映机光束、光束里的浮尘、地面的反光、幕布四周的投影与光晕）都画在同一张
     画布上——合成器每帧只需叠这一层，而不是五六张全屏的渐变层；画布只在有变化时重画：浮尘 30 帧，
     光束随光标偏斜时跟手，滚动中（整个放映室在动，浮尘的细微漂移看不出来）不重画。
     幕布本身只剩三层：预览视频、闪烁的暖光、扫描线 + 暗角 + 边框（一层）。
     ===================================================================== */
  function playIcon(cls) {
    const s = U.svg('svg', { viewBox: '0 0 80 80', class: cls, 'aria-hidden': 'true' })
    s.appendChild(U.svg('circle', { cx: 40, cy: 40, r: 37 }))
    s.appendChild(U.svg('circle', { cx: 40, cy: 40, r: 31, class: 'in' }))
    s.appendChild(U.svg('path', { d: 'M33 27 L55 40 L33 53 Z' }))
    return s
  }

  function mount(el) {
    S.el = el
    const preview = U.el('video.scr-preview', {
      muted: true, loop: true, playsinline: true, 'webkit-playsinline': true, preload: 'metadata', poster: POSTER, 'aria-hidden': 'true',
    })
    preview.muted = true
    preview.src = SRC
    S.preview = preview

    const screen = U.el('div.scr-screen', { role: 'button', tabindex: '0', 'aria-label': '放映', 'data-cursor': '放映' }, [
      U.el('div.scr-screen-inner', null, [preview]),
      U.el('div.scr-flick', { 'aria-hidden': 'true' }),
      U.el('div.scr-vig', { 'aria-hidden': 'true' }),
      U.el('div.scr-play', null, [playIcon('scr-play-ic')]),
    ])
    S.screen = screen
    S.setRX = gsap.quickSetter(screen, 'rotationX', 'deg')
    S.setRY = gsap.quickSetter(screen, 'rotationY', 'deg')

    const dur = U.el('span.scr-dur', { text: '01:26' })
    preview.addEventListener('loadedmetadata', () => { if (isFinite(preview.duration)) dur.textContent = fmt(preview.duration) })

    const air = U.el('canvas.scr-air', { 'aria-hidden': 'true' })
    S.air = air

    S.room = U.el('div.scr-room.is-off', null, [
      air,
      U.el('div.scr-stage', null, [
        U.el('div.scr-curtain.scr-curtain--l', { 'aria-hidden': 'true' }),
        U.el('div.scr-curtain.scr-curtain--r', { 'aria-hidden': 'true' }),
        screen,
        U.el('div.scr-meta', null, [
          U.el('span.scr-mark', { text: '夙与愿' }),
          U.el('i.scr-rule', { 'aria-hidden': 'true' }),
          dur,
        ]),
      ]),
    ])
    el.appendChild(S.room)

    const go = () => open({ from: screen })
    screen.addEventListener('click', go)
    screen.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } })
    screen.addEventListener('pointerenter', () => screen.classList.add('is-hot'))
    screen.addEventListener('pointerleave', () => screen.classList.remove('is-hot'))

    // 离开视口：视频暂停、画布与 CSS 动画停下
    App.onVisible(el, v => {
      S.inView = v
      S.room.classList.toggle('is-off', !v)
      if (v && !S.active) tryPlay(preview)
      else preview.pause()
      if (v) { S.dirty = true; S.lastNow = 0 }
    }, { rootMargin: '0px' })
    // 远离视口（上下一屏以外）：连画布的显存也还回去，回来时再重建
    App.bus.on('section:far', id => { if (id === 'screening') freeAir() })
    App.bus.on('section:near', id => { if (id === 'screening') { layoutAir(); S.dirty = true } })
    App.bus.on('quality', () => { layoutAir(); S.dirty = true })

    initAir()
    App.tick(tick)

    // 幕布拉开：第一次进入视野时（画布上的投影与光晕跟着幕布一起浮现）
    S.curtainK = window.innerWidth < 760 ? 0.05 : 0.13
    S.show = { k: 0, s: 0.94 }
    gsap.set(el.querySelectorAll('.scr-curtain'), { scaleX: 1 })
    App.onVisible(el, v => {
      if (!v || S.opened) return
      S.opened = true
      S.curtainK = window.innerWidth < 760 ? 0.05 : 0.13
      layoutAir()
      gsap.to(el.querySelectorAll('.scr-curtain'), { scaleX: S.curtainK, duration: 2.2, ease: 'expo.inOut', delay: 0.15 })
      gsap.fromTo(screen, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 2, ease: 'expo.out', delay: 0.5 })
      S.showTw = gsap.fromTo(S.show, { k: 0, s: 0.94 }, { k: 1, s: 1, duration: 2, ease: 'expo.out', delay: 0.5, onUpdate: () => { S.dirty = true }, onComplete: () => { S.showTw = null } })
      gsap.fromTo(el.querySelector('.scr-meta'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 1.4 })
    }, { rootMargin: '-20% 0px' })
  }

  function tryPlay(v) {
    try { const p = v.play(); if (p && p.catch) p.catch(() => {}) } catch (e) { /* 自动播放被拦就停在海报上 */ }
  }

  /* ---------- 光标：幕布转向光标（合成层），光束偏斜、光晕与地面反光随光标（画布） ---------- */
  // 光束的明暗跳动（原 CSS 关键帧 steps(1)，5.3 秒一轮）
  const BEAM_K = [[0, 0.92], [0.07, 0.78], [0.09, 0.95], [0.31, 0.88], [0.33, 0.97], [0.58, 0.84], [0.6, 0.93], [0.81, 0.9], [0.83, 0.76], [0.85, 0.95]]
  const beamAlpha = sec => { const f = (sec / 5.3) % 1; let a = BEAM_K[0][1]; for (const q of BEAM_K) if (f >= q[0]) a = q[1]; return a }

  function tick(t, dt) {
    if (!S.inView || !S.room || S.active) { S.lastNow = 0; return }
    const now = performance.now()
    const dts = S.lastNow ? Math.min(0.1, (now - S.lastNow) / 1000) : 1 / 60
    S.lastNow = now
    const m = App.mouse
    const r = S.room.getBoundingClientRect()
    if (r.top !== S._rt) { S._rt = r.top; S.scrollAt = now }
    const scrolling = now - (S.scrollAt || -1e4) < 180
    const nx = clamp((m.sx - r.left) / r.width, 0, 1) - 0.5
    const ny = clamp((m.sy - r.top) / r.height, 0, 1) - 0.5
    const k = App.reduced ? 0 : 1
    S.rx = U.lerp(S.rx, -ny * 7 * k, 0.08 * dt)
    S.ry = U.lerp(S.ry, nx * 9 * k, 0.08 * dt)
    // 幕布转向：只在数值变化时写，只改 transform（合成层上完成）
    const rx = S.rx.toFixed(2), ry = S.ry.toFixed(2)
    if (rx !== S._rx) { S._rx = rx; S.setRX(+rx) }
    if (ry !== S._ry) { S._ry = ry; S.setRY(+ry) }
    // 光束偏斜（光标的横向位置；滚动不改变它）、光晕（光标离幕布中心越近越亮，0.5 秒缓入）、地面反光
    S.beamDX = nx * 0.14 * S.vw
    const lit = 1 - Math.min(1, Math.hypot(nx, ny) * 1.4)
    S.lit = lit
    S.glowK += (lit - S.glowK) * (1 - Math.exp(-dts / 0.16))
    if (Math.abs(lit - S.glowK) < 0.002) S.glowK = lit
    S.dustDt += dts
    // 画布最多 30 帧（画质 1/0 级 20 帧）；滚动中只有光束偏斜与幕布浮现跟着画，
    // 浮尘、光束明暗、光晕停在原处（整个放映室都在移动，看不出来），停下后再接着动
    const q = App.quality ? App.quality.level : 2
    if (now - (S.drawAt || 0) < (q >= 2 ? 30 : 46)) return
    const shifted = Math.abs(S.beamDX - S.drawn.dx) > 0.4
    let want
    if (scrolling) want = shifted || !!S.showTw
    else {
      const ba = beamAlpha(now / 1000)
      const glowMoved = Math.abs(S.glowK - S.drawn.glow) > 0.004 || Math.abs(lit - S.drawn.lit) > 0.008
      want = S.dirty || shifted || ba !== S.drawn.ba || glowMoved || S.dustDt > 0
    }
    if (want) { S.drawAt = now; drawAir(now / 1000, scrolling) }
  }

  /* ---------- 画布：光束 + 浮尘 + 地面反光 + 幕布投影与光晕 ---------- */
  const motes = []
  function initAir() {
    S.ctx = S.air.getContext('2d')
    S.glowK = 0; S.lit = 0; S.dustDt = 0; S.beamDX = 0; S.vw = window.innerWidth
    S.drawn = { dx: 1e9, ba: -1, glow: -1, lit: -1 }
    const n = App.finePointer ? 140 : 70
    for (let i = 0; i < n; i++) motes.push({ x: Math.random(), y: Math.random(), z: Math.random(), vx: 0, vy: 0, ph: Math.random() * 6.28 })
    layoutAir()
    window.addEventListener('resize', U.debounce(() => { layoutAir(); S.dirty = true }, 120))
  }
  function freeAir() {
    S.freed = true
    if (S.air) { S.air.width = 1; S.air.height = 1 }
    S.beamImg = S.shadowImg = S.glowImg = S.floorImg = null
  }
  const offscreen = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c }
  // 尺寸与预渲染：只在尺寸/画质变化时做
  function layoutAir() {
    if (!S.room) return
    S.freed = false
    const RW = S.room.clientWidth, RH = S.room.clientHeight
    if (!RW || !RH) return
    const vw = window.innerWidth
    S.vw = vw; S.RW = RW; S.RH = RH
    const q = App.quality ? App.quality.level : 2
    S.res = q >= 2 ? 1 : q === 1 ? 0.75 : 0.5 // 光束与浮尘都是柔的，按 CSS 像素（或更低）画即可
    // 拉开后的帷幕盖住的两边不画（画布也就不与帷幕重叠，帷幕不必另起合成层）
    const ix = Math.ceil(RW * 0.5 * (S.curtainK || 0.13)) + 1
    S.ix = ix
    S.cw = RW - ix * 2
    S.air.style.left = ix + 'px'
    S.air.style.width = S.cw + 'px'
    S.air.width = Math.max(1, Math.round(S.cw * S.res))
    S.air.height = Math.max(1, Math.round(RH * S.res))
    // 光束：宽 150vw（手机 220vw）、高 92%、顶在 -12%；梯形 49.2%–50.8% → 18%–82%
    const BW = (vw < 760 ? 2.2 : 1.5) * vw, BH = RH * 0.92
    S.beam = { x: RW / 2 - BW * 0.32, y: -RH * 0.12, w: BW * 0.64, h: BH }
    {
      const k = S.res, c = offscreen(S.beam.w * k, BH * k), g = c.getContext('2d')
      g.scale(k, k)
      g.beginPath()
      g.moveTo(BW * 0.312, 0); g.lineTo(BW * 0.328, 0); g.lineTo(BW * 0.64, BH); g.lineTo(0, BH); g.closePath()
      g.clip()
      const lin = g.createLinearGradient(0, 0, 0, BH)
      lin.addColorStop(0, 'rgba(255,236,200,0.13)'); lin.addColorStop(0.55, 'rgba(255,236,200,0.05)'); lin.addColorStop(1, 'rgba(255,236,200,0.015)')
      g.fillStyle = lin
      g.fillRect(0, 0, BW * 0.64, BH)
      // 顶部的椭圆光斑（radial-gradient ellipse 30% 22% at 50% 0%）
      const rx = BW * 0.3, ry = BH * 0.22
      g.save()
      g.translate(BW * 0.32, 0); g.scale(1, ry / rx)
      const rad = g.createRadialGradient(0, 0, 0, 0, 0, rx)
      rad.addColorStop(0, 'rgba(255,238,205,0.22)'); rad.addColorStop(0.7, 'rgba(255,238,205,0)'); rad.addColorStop(1, 'rgba(255,238,205,0)')
      g.fillStyle = rad
      g.fillRect(-rx, 0, rx * 2, rx)
      g.restore()
      S.beamImg = c
    }
    // 地面反光：底部 26%，radial-gradient(ellipse 60% 70% at 50% 0%) —— 极柔，半分辨率即可
    {
      const fh = RH * 0.26, k = 0.5, c = offscreen(RW * k, fh * k), g = c.getContext('2d')
      g.scale(k, k)
      const rx = RW * 0.6, ry = fh * 0.7
      g.translate(RW / 2, 0); g.scale(1, ry / rx)
      const rad = g.createRadialGradient(0, 0, 0, 0, 0, rx)
      rad.addColorStop(0, 'rgba(216,198,162,0.07)'); rad.addColorStop(0.7, 'rgba(216,198,162,0)'); rad.addColorStop(1, 'rgba(216,198,162,0)')
      g.fillStyle = rad
      g.fillRect(-rx, 0, rx * 2, rx)
      S.floorImg = c
      S.floorBox = { x: 0, y: RH - fh, w: RW, h: fh }
    }
    // 幕布：未变换时的位置（幕布的 3D 偏转只有几度，投影与光晕都极柔，留在原位看不出差别）
    const sc = S.screen
    const sw = sc.offsetWidth, sh = sc.offsetHeight
    S.scr = { cx: sc.offsetLeft + sw / 2, cy: sc.offsetTop + sh / 2, w: sw, h: sh }
    // 投影：0 50px 140px rgba(0,0,0,.85) 与 0 0 180px rgba(216,198,162,.05)（box-shadow 的模糊半径 = 2σ，与画布 shadowBlur 同义）
    {
      const k = 0.5, pad = 300, W = sw + pad * 2, H = sh + pad * 2 + 50
      const c = offscreen(W * k, H * k), g = c.getContext('2d')
      const far = 20000
      g.fillStyle = '#000'
      g.shadowColor = 'rgba(216,198,162,0.05)'; g.shadowBlur = 180 * k; g.shadowOffsetX = far * k; g.shadowOffsetY = 0
      g.fillRect((pad - far) * k, pad * k, sw * k, sh * k)
      g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = 140 * k; g.shadowOffsetX = far * k; g.shadowOffsetY = 50 * k
      g.fillRect((pad - far) * k, pad * k, sw * k, sh * k)
      S.shadowImg = c
      S.shadowBox = { dx: -sw / 2 - pad, dy: -sh / 2 - pad, w: W, h: H }
    }
    // 光晕：幕布外扩 22% 的 radial-gradient(closest-side, .14 → .05 @55% → 0)
    {
      const gw = sw * 1.44, gh = sh * 1.44, k = 0.5
      const c = offscreen(gw * k, gh * k), g = c.getContext('2d')
      g.scale(k, k)
      g.translate(gw / 2, gh / 2); g.scale(1, gh / gw)
      const rad = g.createRadialGradient(0, 0, 0, 0, 0, gw / 2)
      rad.addColorStop(0, 'rgba(216,198,162,0.14)'); rad.addColorStop(0.55, 'rgba(216,198,162,0.05)'); rad.addColorStop(1, 'rgba(216,198,162,0)')
      g.fillStyle = rad
      g.fillRect(-gw / 2, -gw / 2, gw, gw)
      S.glowImg = c
    }
    S.dirty = true
  }

  function stepDust(dt) {
    // dt：以 60 帧为 1；漂移、被光标搅动与阻尼都按实际经过的时间换算
    const m = App.mouse
    const r = S.roomRect
    const mx = (m.x - r.left) / r.width, my = (m.y - r.top) / r.height
    const stir = Math.min(3, m.speed * 0.05)
    const damp = Math.pow(0.985, dt)
    const now = performance.now() / 1000
    for (const p of motes) {
      p.vx += Math.sin(now * 0.3 + p.ph) * 0.00002 * dt
      p.vy += (Math.cos(now * 0.23 + p.ph) * 0.00002 - 0.000006) * dt
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy
      if (d2 < 0.02 && stir > 0.05) { p.vx += dx / (d2 + 0.002) * 0.00004 * stir * dt; p.vy += dy / (d2 + 0.002) * 0.00004 * stir * dt }
      p.vx *= damp; p.vy *= damp
      p.x += p.vx * dt; p.y += p.vy * dt
      if (p.y < -0.02) p.y = 1.02; if (p.y > 1.02) p.y = -0.02
      if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02
    }
  }

  function drawAir(sec, frozen) {
    if (S.freed || !S.beamImg) layoutAir()
    const c = S.ctx
    if (!c || !S.beamImg) return
    S.roomRect = S.room.getBoundingClientRect()
    if (!frozen && S.dustDt > 0) { stepDust(Math.min(4, S.dustDt * 60)); S.dustDt = 0 }
    const RW = S.RW, RH = S.RH, k = S.res
    c.setTransform(k, 0, 0, k, -S.ix * k, 0) // 以放映室的 CSS 像素为坐标
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
    c.clearRect(S.ix, 0, S.cw, RH)
    // 光束
    const ba = beamAlpha(sec)
    const B = S.beam
    c.globalAlpha = ba
    c.drawImage(S.beamImg, B.x + S.beamDX, B.y, B.w, B.h)
    // 浮尘：只在光束里看得见（光束是从上方中间张开的梯形）；与光束是「滤色」叠加
    const nx = S.beamDX / (0.14 * S.vw)
    c.globalCompositeOperation = 'screen'
    c.fillStyle = 'rgb(240,224,190)'
    for (const p of motes) {
      const bx = 0.5 + nx * 0.18 * (1 - p.y)
      const half = 0.09 + p.y * 0.36
      const inBeam = clamp(1 - Math.abs(p.x - bx) / half, 0, 1)
      if (inBeam <= 0) continue
      const a = inBeam * (0.25 + 0.75 * p.z) * (0.55 + 0.45 * Math.sin(sec * 1.7 + p.ph))
      c.globalAlpha = a * 0.55
      const s = 0.6 + p.z * 1.6
      c.fillRect(p.x * RW, p.y * RH, s, s)
    }
    c.globalCompositeOperation = 'source-over'
    // 地面反光
    const F = S.floorBox
    c.globalAlpha = 0.45 + S.lit * 0.55
    c.drawImage(S.floorImg, F.x, F.y, F.w, F.h)
    // 幕布的投影与光晕（随幕布浮现）
    const show = S.show || { k: 1, s: 1 }
    if (show.k > 0.002) {
      const sc = S.scr, sb = S.shadowBox, ss = show.s
      c.globalAlpha = show.k
      c.drawImage(S.shadowImg, sc.cx + sb.dx * ss, sc.cy + sb.dy * ss, sb.w * ss, sb.h * ss)
      if (S.glowK > 0.002) {
        c.globalAlpha = show.k * S.glowK
        const gw = sc.w * 1.44 * ss, gh = sc.h * 1.44 * ss
        c.drawImage(S.glowImg, sc.cx - gw / 2, sc.cy - gh / 2, gw, gh)
      }
    }
    c.globalAlpha = 1
    S.dirty = false
    S.drawn.dx = S.beamDX; S.drawn.ba = ba; S.drawn.glow = S.glowK; S.drawn.lit = S.lit
  }

  /* =====================================================================
     全屏放映
     ===================================================================== */
  function open(opts = {}) {
    if (S.active) return
    S.active = true
    if (S.preview) S.preview.pause()
    App.audio.hush(true)

    const video = U.el('video.scr-th-video', { playsinline: true, 'webkit-playsinline': true, preload: 'auto', poster: POSTER })
    video.src = App.screening.src || SRC
    const bar = U.el('div.scr-th-bar', { 'data-cursor': '' }, [U.el('i.scr-th-buf'), U.el('i.scr-th-fill'), U.el('i.scr-th-knob')])
    const time = U.el('span.scr-th-time', { text: '00:00 / 01:26' })
    const fsBtn = U.el('button.scr-th-fs', { type: 'button', 'aria-label': '全屏', 'data-cursor': '全屏' }, [U.el('i'), U.el('i'), U.el('i'), U.el('i')])
    const big = U.el('div.scr-th-big', { 'aria-hidden': 'true' }, [playIcon('scr-th-big-ic')])
    const leader = U.el('div.scr-th-leader', { 'aria-hidden': 'true' }, [
      U.el('div.scr-th-leader-ring'),
      U.el('div.scr-th-leader-sweep'),
      U.el('span.scr-th-leader-n', { text: '3' }),
    ])
    const frame = U.el('div.scr-th-frame', { 'data-cursor': '暂停' }, [video, big])
    const root = U.el('div.scr-th', null, [
      frame,
      U.el('div.scr-th-ui', null, [time, bar, fsBtn]),
      leader,
    ])
    const stage = App.overlay.open(root, { className: 'is-theater', onClose: () => teardown() })
    S.theater = { root, video, bar, time, frame, big, leader, stage }

    // 播放 / 暂停
    const toggle = () => {
      if (video.paused) { tryPlay(video) } else video.pause()
    }
    frame.addEventListener('click', toggle)
    video.addEventListener('play', () => { root.classList.remove('is-paused'); frame.setAttribute('data-cursor', '暂停'); flashBig(false) })
    video.addEventListener('pause', () => { if (!video.ended) { root.classList.add('is-paused'); frame.setAttribute('data-cursor', '继续'); flashBig(true) } })
    video.addEventListener('ended', () => ended())
    video.addEventListener('timeupdate', () => sync())
    video.addEventListener('progress', () => sync())
    video.addEventListener('loadedmetadata', () => sync())

    // 进度条拖动
    let drag = false
    const seekTo = e => {
      const r = bar.getBoundingClientRect()
      const k = clamp((e.clientX - r.left) / r.width, 0, 1)
      if (isFinite(video.duration)) video.currentTime = k * video.duration
      sync()
    }
    bar.addEventListener('pointerdown', e => { drag = true; bar.setPointerCapture(e.pointerId); seekTo(e) })
    bar.addEventListener('pointermove', e => { if (drag) seekTo(e) })
    bar.addEventListener('pointerup', () => { drag = false })

    // 全屏
    fsBtn.addEventListener('click', e => {
      e.stopPropagation()
      const d = document
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return }
      const t = root
      if (t.requestFullscreen) t.requestFullscreen().catch(() => {})
      else if (t.webkitRequestFullscreen) t.webkitRequestFullscreen()
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen()
    })

    // 键盘
    S.onKey = e => {
      if (!S.active) return
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle() }
      else if (e.key === 'ArrowRight') { video.currentTime = Math.min((video.duration || 0), video.currentTime + 5); sync() }
      else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); sync() }
    }
    window.addEventListener('keydown', S.onKey)

    // 光标静止一会儿就把控件和光标藏起来
    let idle = 0
    const hideCursor = b => { if (App.cursor && App.cursor.hide) App.cursor.hide(b) }
    S.onMove = () => {
      root.classList.remove('is-idle')
      hideCursor(false)
      clearTimeout(idle)
      idle = setTimeout(() => { if (S.active && !video.paused) { root.classList.add('is-idle'); hideCursor(true) } }, 2200)
    }
    S.clearIdle = () => { clearTimeout(idle); hideCursor(false) }
    root.addEventListener('pointermove', S.onMove)
    S.onMove()

    // 片头：倒数胶片，然后开映
    runLeader(() => { if (S.active) tryPlay(video) })
  }

  function runLeader(done) {
    const T = S.theater
    const n = T.leader.querySelector('.scr-th-leader-n')
    const sweep = T.leader.querySelector('.scr-th-leader-sweep')
    if (App.reduced) { T.leader.remove(); done(); return }
    const tl = gsap.timeline({ onComplete: () => { gsap.to(T.leader, { opacity: 0, duration: 0.35, onComplete: () => T.leader.remove() }); done() } })
    T.leaderTl = tl
    ;['3', '2', '1'].forEach((k, i) => {
      tl.call(() => { n.textContent = k; App.audio.sfx('tick', { volume: 0.6 }) }, null, i * 0.62)
      tl.fromTo(sweep, { '--sw': '0deg' }, { '--sw': '360deg', duration: 0.6, ease: 'none' }, i * 0.62)
    })
    tl.to({}, { duration: 0.1 })
  }

  function flashBig(show) {
    const T = S.theater
    if (!T) return
    gsap.killTweensOf(T.big)
    gsap.to(T.big, { opacity: show ? 1 : 0, scale: show ? 1 : 1.25, duration: show ? 0.35 : 0.5, ease: 'power2.out' })
  }

  function sync() {
    const T = S.theater
    if (!T) return
    const v = T.video
    const d = isFinite(v.duration) ? v.duration : 86.4
    const k = clamp(v.currentTime / d, 0, 1)
    T.bar.style.setProperty('--k', k.toFixed(4))
    let buf = 0
    try { if (v.buffered.length) buf = v.buffered.end(v.buffered.length - 1) / d } catch (e) { /* ignore */ }
    T.bar.style.setProperty('--b', clamp(buf, 0, 1).toFixed(4))
    const txt = fmt(v.currentTime) + ' / ' + fmt(d)
    if (T.time.textContent !== txt) T.time.textContent = txt
  }

  function ended() {
    const T = S.theater
    if (!T) return
    T.root.classList.add('is-ended')
    T.frame.setAttribute('data-cursor', '重映')
    App.audio.sfx('bell', { volume: 0.5 })
    flashBig(true)
    T.frame.addEventListener('click', () => { T.root.classList.remove('is-ended'); T.video.currentTime = 0 }, { once: true })
  }

  function teardown() {
    const T = S.theater
    S.active = false
    S.theater = null
    if (T) {
      if (T.leaderTl) T.leaderTl.kill()
      try { T.video.pause(); T.video.removeAttribute('src'); T.video.load() } catch (e) { /* ignore */ }
    }
    const d = document
    if (d.fullscreenElement || d.webkitFullscreenElement) { try { (d.exitFullscreen || d.webkitExitFullscreen).call(d) } catch (e) { /* ignore */ } }
    window.removeEventListener('keydown', S.onKey)
    if (S.clearIdle) S.clearIdle()
    App.audio.hush(false)
    if (S.inView && S.preview) tryPlay(S.preview)
    S.dirty = true
  }

  App.screening = { open: () => open(), src: '' }

  App.section('screening', {
    palette: { a: '#0c0a0a', b: '#d8c6a2', glow: 0.28 },
    track: 'dread',
    mount,
  })
})()
