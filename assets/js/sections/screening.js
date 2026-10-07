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

  const S = { el: null, room: null, screen: null, preview: null, dust: null, inView: false, rx: 0, ry: 0, theater: null, active: false }

  /* =====================================================================
     放映室
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
      U.el('div.scr-glow', { 'aria-hidden': 'true' }),
      U.el('div.scr-screen-inner', null, [
        preview,
        U.el('div.scr-scan', { 'aria-hidden': 'true' }),
        U.el('div.scr-flick', { 'aria-hidden': 'true' }),
        U.el('div.scr-vig', { 'aria-hidden': 'true' }),
        U.el('div.scr-play', null, [playIcon('scr-play-ic')]),
      ]),
    ])
    S.screen = screen
    S.glow = screen.querySelector('.scr-glow')
    S.setRX = gsap.quickSetter(screen, 'rotationX', 'deg')
    S.setRY = gsap.quickSetter(screen, 'rotationY', 'deg')

    const dur = U.el('span.scr-dur', { text: '01:26' })
    preview.addEventListener('loadedmetadata', () => { if (isFinite(preview.duration)) dur.textContent = fmt(preview.duration) })

    const dust = U.el('canvas.scr-dust', { 'aria-hidden': 'true' })
    S.dust = dust

    S.room = U.el('div.scr-room', null, [
      U.el('div.scr-beam', { 'aria-hidden': 'true' }),
      dust,
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
      U.el('div.scr-floor', { 'aria-hidden': 'true' }),
    ])
    el.appendChild(S.room)
    S.beam = S.room.querySelector('.scr-beam')
    S.floor = S.room.querySelector('.scr-floor')

    const go = () => open({ from: screen })
    screen.addEventListener('click', go)
    screen.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } })
    screen.addEventListener('pointerenter', () => screen.classList.add('is-hot'))
    screen.addEventListener('pointerleave', () => screen.classList.remove('is-hot'))

    App.onVisible(el, v => {
      S.inView = v
      if (v && !S.active) tryPlay(preview)
      else preview.pause()
    }, { rootMargin: '0px' })

    initDust()
    App.tick(tick)

    // 幕布拉开：第一次进入视野时
    gsap.set(el.querySelectorAll('.scr-curtain'), { scaleX: 1 })
    App.onVisible(el, v => {
      if (!v || S.opened) return
      S.opened = true
      gsap.to(el.querySelectorAll('.scr-curtain'), { scaleX: window.innerWidth < 760 ? 0.05 : 0.13, duration: 2.2, ease: 'expo.inOut', delay: 0.15 })
      gsap.fromTo(screen, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 2, ease: 'expo.out', delay: 0.5 })
      gsap.fromTo(el.querySelector('.scr-meta'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 1.4 })
    }, { rootMargin: '-20% 0px' })
  }

  function tryPlay(v) {
    try { const p = v.play(); if (p && p.catch) p.catch(() => {}) } catch (e) { /* 自动播放被拦就停在海报上 */ }
  }

  /* ---------- 光标：幕布转向光标，光束偏斜 ---------- */
  function tick(t, dt) {
    if (!S.inView || !S.room || S.active) return
    const m = App.mouse
    const r = S.room.getBoundingClientRect()
    const nx = clamp((m.sx - r.left) / r.width, 0, 1) - 0.5
    const ny = clamp((m.sy - r.top) / r.height, 0, 1) - 0.5
    const k = App.reduced ? 0 : 1
    S.rx = U.lerp(S.rx, -ny * 7 * k, 0.08 * dt)
    S.ry = U.lerp(S.ry, nx * 9 * k, 0.08 * dt)
    // 只在数值变化时写，且只改 transform / opacity（合成层上完成，不重画幕布四周的大面积发光）
    const rx = S.rx.toFixed(2), ry = S.ry.toFixed(2)
    if (rx !== S._rx) { S._rx = rx; S.setRX(+rx) }
    if (ry !== S._ry) { S._ry = ry; S.setRY(+ry) }
    const bx = (nx * 14).toFixed(1)
    if (bx !== S._bx) { S._bx = bx; S.beam.style.transform = `translateX(calc(-50% + ${bx}vw))` }
    const lit = (1 - Math.min(1, Math.hypot(nx, ny) * 1.4)).toFixed(2)
    if (lit !== S._lit) { S._lit = lit; S.glow.style.opacity = lit; S.floor.style.opacity = (0.45 + lit * 0.55).toFixed(2) }
    if ((S._dn = (S._dn || 0) + 1) % 2 === 0 || (App.quality && App.quality.level === 2)) stepDust(dt * (App.quality && App.quality.level === 2 ? 1 : 2), nx, ny)
  }

  /* ---------- 光束里的浮尘 ---------- */
  const motes = []
  let dctx = null, dw = 0, dh = 0, dpr = 1
  function initDust() {
    dctx = S.dust.getContext('2d')
    const n = App.finePointer ? 140 : 70
    for (let i = 0; i < n; i++) motes.push({ x: Math.random(), y: Math.random(), z: Math.random(), vx: 0, vy: 0, ph: Math.random() * 6.28 })
    const resize = () => {
      dpr = 1 // 浮尘是柔的点，按 CSS 像素画即可
      dw = S.dust.clientWidth; dh = S.dust.clientHeight
      S.dust.width = Math.round(dw * dpr); S.dust.height = Math.round(dh * dpr)
    }
    resize()
    window.addEventListener('resize', resize)
  }
  function stepDust(dt, nx, ny) {
    if (!dctx || !dw) return
    const m = App.mouse
    const r = S.dust.getBoundingClientRect()
    const mx = (m.x - r.left) / r.width, my = (m.y - r.top) / r.height
    const stir = Math.min(3, m.speed * 0.05)
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    dctx.clearRect(0, 0, dw, dh)
    const now = performance.now() / 1000
    for (const p of motes) {
      p.vx += Math.sin(now * 0.3 + p.ph) * 0.00002 * dt
      p.vy += (Math.cos(now * 0.23 + p.ph) * 0.00002 - 0.000006) * dt
      const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy
      if (d2 < 0.02 && stir > 0.05) { p.vx += dx / (d2 + 0.002) * 0.00004 * stir; p.vy += dy / (d2 + 0.002) * 0.00004 * stir }
      p.vx *= 0.985; p.vy *= 0.985
      p.x += p.vx * dt; p.y += p.vy * dt
      if (p.y < -0.02) p.y = 1.02; if (p.y > 1.02) p.y = -0.02
      if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02
      // 只在光束里看得见：光束是从上方中间张开的梯形
      const bx = 0.5 + nx * 0.18 * (1 - p.y)
      const half = 0.09 + p.y * 0.36
      const inBeam = clamp(1 - Math.abs(p.x - bx) / half, 0, 1)
      if (inBeam <= 0) continue
      const a = inBeam * (0.25 + 0.75 * p.z) * (0.55 + 0.45 * Math.sin(now * 1.7 + p.ph))
      dctx.fillStyle = `rgba(240,224,190,${(a * 0.55).toFixed(3)})`
      const s = 0.6 + p.z * 1.6
      dctx.fillRect(p.x * dw, p.y * dh, s, s)
    }
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
  }

  App.screening = { open: () => open(), src: '' }

  App.section('screening', {
    palette: { a: '#0c0a0a', b: '#d8c6a2', glow: 0.28 },
    track: 'dread',
    mount,
  })
})()
