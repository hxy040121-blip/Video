/* ==========================================================
   十五席 · 核心命名空间 App
   所有板块通过 window.App 协作（file:// 下不能用 ES module）。
   ========================================================== */
(function () {
  'use strict'

  const App = (window.App = window.App || {})
  const root = document.documentElement

  /* ---------- 颜色 ---------- */
  App.color = {
    ink: '#0a0809', ink2: '#120e10', ink3: '#1d1719',
    bone: '#ebe3d6', boneDim: '#a0968a', ash: '#5b534d',
    brass: '#c29a5b', brassDim: '#6f5532',
    blood: '#ff2e7e', bloodDeep: '#a3104a', rust: '#7d1616',
  }

  /* ---------- 环境 ---------- */
  App.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  App.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  App.isMobile = () => window.innerWidth < 760

  /* ---------- 工具 ---------- */
  const U = (App.util = {
    clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    map: (v, a, b, c, d, clamp = true) => {
      let t = (v - a) / (b - a)
      if (clamp) t = Math.min(1, Math.max(0, t))
      return c + (d - c) * t
    },
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    shuffle: arr => {
      const a = arr.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    },
    // 可复现的随机数（mulberry32）
    seeded: seed => {
      let s = seed >>> 0
      return () => {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    },
    debounce: (fn, ms = 150) => {
      let t
      return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
    },
    wait: ms => new Promise(r => setTimeout(r, ms)),
    qs: (s, el = document) => el.querySelector(s),
    qsa: (s, el = document) => Array.from(el.querySelectorAll(s)),
    // el('div.a.b', {attrs}, [children|string])
    el: (spec, attrs, children) => {
      const m = spec.match(/^([a-z0-9-]+)?((?:\.[\w-]+)*)(?:#([\w-]+))?$/i)
      const node = document.createElement((m && m[1]) || 'div')
      if (m && m[2]) node.className = m[2].slice(1).replace(/\./g, ' ')
      if (m && m[3]) node.id = m[3]
      if (attrs) for (const k in attrs) {
        const v = attrs[k]
        if (v == null || v === false) continue
        if (k === 'html') node.innerHTML = v
        else if (k === 'text') node.textContent = v
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v)
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v)
        else node.setAttribute(k, v === true ? '' : v)
      }
      if (children != null) {
        for (const c of [].concat(children)) {
          if (c == null || c === false) continue
          node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
        }
      }
      return node
    },
    svg: (tag, attrs) => {
      const n = document.createElementNS('http://www.w3.org/2000/svg', tag)
      if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k])
      return n
    },
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    // 馆内分钟数（从第一日 00:00 起）→ { day, hh, mm, text }
    clock: minutes => {
      const m = Math.max(0, Math.floor(minutes))
      const day = Math.floor(m / 1440) + 1
      const hh = Math.floor((m % 1440) / 60)
      const mm = m % 60
      return { day, hh, mm, text: String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') }
    },
    cnNum: n => {
      const d = '〇一二三四五六七八九'
      if (n <= 10) return n === 10 ? '十' : d[n]
      if (n < 20) return '十' + d[n - 10]
      if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '')
      return String(n)
    },
    roman: n => {
      const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
      let s = ''
      for (const [v, r] of t) while (n >= v) { s += r; n -= v }
      return s
    },
    hexToRgb: hex => {
      const h = hex.replace('#', '')
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    },
  })

  /* ---------- 事件总线 ---------- */
  const handlers = {}
  App.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => App.bus.off(ev, fn) },
    off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter(f => f !== fn) },
    emit(ev, data) { for (const fn of (handlers[ev] || []).slice()) { try { fn(data) } catch (e) { console.error('[bus]', ev, e) } } },
  }

  /* ---------- 本地存储 ---------- */
  const PREFIX = 'shiwuxi:'
  App.store = {
    get(k, def) {
      try { const v = localStorage.getItem(PREFIX + k); return v == null ? def : JSON.parse(v) } catch (e) { return def }
    },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)) } catch (e) { /* 隐私模式等 */ } },
  }

  /* ---------- 全局状态 ---------- */
  App.state = {
    seats: (() => {
      const s = App.store.get('seats', null)
      return Array.isArray(s) && s.length === 15 ? s : Array(15).fill(null)
    })(),
    minutes: 17 * 60, // 馆内时间
    section: null,
  }

  /* ---------- 角色数据 ---------- */
  App.chars = Array.isArray(window.CHARACTERS) ? window.CHARACTERS : []
  App.charMap = {}
  for (const c of App.chars) App.charMap[c.id] = c
  App.char = id => App.charMap[id] || null

  /* ---------- 光标 / 鼠标 ---------- */
  const mouse = (App.mouse = {
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    nx: 0.5, ny: 0.5,      // 0–1
    sx: window.innerWidth / 2, sy: window.innerHeight / 2, // 平滑后的位置
    vx: 0, vy: 0, speed: 0, // 平滑后的速度（px/帧）
    down: false, active: false,
  })
  let lastX = mouse.x, lastY = mouse.y
  const onMove = e => {
    const p = e.touches ? e.touches[0] : e
    if (!p) return
    mouse.x = p.clientX; mouse.y = p.clientY
    mouse.active = true
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('touchmove', onMove, { passive: true })
  window.addEventListener('pointerdown', () => { mouse.down = true }, { passive: true })
  window.addEventListener('pointerup', () => { mouse.down = false }, { passive: true })

  // 需要光标坐标 CSS 变量（--mx/--my，0–1）的元素；用 App.trackMouseVars(el) 登记
  const mouseVarEls = new Set()
  let lastMx = '', lastMy = ''
  App.trackMouseVars = el => {
    if (!el) return () => {}
    mouseVarEls.add(el)
    el.style.setProperty('--mx', mouse.nx.toFixed(3)); el.style.setProperty('--my', mouse.ny.toFixed(3))
    return () => mouseVarEls.delete(el)
  }

  /* ---------- 帧循环（统一使用 gsap.ticker） ---------- */
  const tickers = new Set()
  App.tick = fn => { tickers.add(fn); return () => tickers.delete(fn) }
  /* ---------- 画质自适应 ---------- */
  // level 2 = 全效果，1 = 降一级，0 = 最省。按这台电脑上的真实帧时间自动下调（只降不升，避免来回跳）。
  // 各部件读 App.quality.level，并监听 App.bus 的 'quality' 事件重新设定分辨率等。网址加 ?q=0/1/2 可手动指定。
  const qParam = /[?&]q=([012])/.exec(location.search)
  const Q = App.quality = { level: qParam ? +qParam[1] : 2, fps: 60, locked: !!qParam }
  Q.set = n => {
    n = Math.max(0, Math.min(2, n | 0))
    if (n === Q.level) return
    Q.level = n
    document.documentElement.dataset.q = n
    App.bus.emit('quality', n)
  }
  document.documentElement.dataset.q = Q.level
  let qAcc = 0, qN = 0, qSlow = 0, qFrom = performance.now() + 5000
  function sampleQuality(deltaMs) {
    if (Q.locked || Q.level === 0) return
    const now = performance.now()
    if (now < qFrom || document.hidden || deltaMs > 250) return
    qAcc += deltaMs; qN++
    if (qAcc < 1500) return
    const avg = qAcc / qN
    Q.fps = 1000 / avg
    qAcc = 0; qN = 0
    if (avg > 23) { // 低于约 43 帧
      if (++qSlow >= 2) { qSlow = 0; qFrom = now + 3000; Q.set(Q.level - 1) }
    } else qSlow = 0
  }

  function frame(time, delta) {
    sampleQuality(delta)
    const dt = Math.min(delta, 64) / 16.667
    const dx = mouse.x - lastX, dy = mouse.y - lastY
    lastX = mouse.x; lastY = mouse.y
    mouse.vx = U.lerp(mouse.vx, dx, 0.25)
    mouse.vy = U.lerp(mouse.vy, dy, 0.25)
    mouse.speed = U.lerp(mouse.speed, Math.hypot(dx, dy), 0.12)
    mouse.sx = U.lerp(mouse.sx, mouse.x, 0.14 * dt)
    mouse.sy = U.lerp(mouse.sy, mouse.y, 0.14 * dt)
    mouse.nx = mouse.x / window.innerWidth
    mouse.ny = mouse.y / window.innerHeight
    // 光标坐标只写给真正用到它的元素：写在根元素上会让上万个节点每帧重算样式
    const mxs = mouse.nx.toFixed(3), mys = mouse.ny.toFixed(3)
    if (mxs !== lastMx || mys !== lastMy) {
      lastMx = mxs; lastMy = mys
      for (const el of mouseVarEls) { el.style.setProperty('--mx', mxs); el.style.setProperty('--my', mys) }
    }
    for (const fn of tickers) { try { fn(time, dt) } catch (e) { console.error('[tick]', e); tickers.delete(fn) } }
  }
  if (window.gsap) gsap.ticker.add(frame)

  // 高刷新率屏幕（120/144/165/240Hz）上，把动画循环降到 刷新率÷n ≈ 55–72 帧：
  // 网站每帧的计算不再随刷新率成倍放大，节拍仍然均匀（屏幕本身照常刷新）
  if (window.gsap) {
    const ds = []
    let last = 0
    const probe = t => {
      if (last) ds.push(t - last)
      last = t
      if (ds.length < 45) { requestAnimationFrame(probe); return }
      ds.sort((a, b) => a - b)
      const hz = 1000 / ds[ds.length >> 1]
      const n = Math.max(1, Math.floor(hz / 55)) // 90Hz 不限；120→60，144→72，165→55，240→60
      App.refreshHz = Math.round(hz)
      if (n > 1) gsap.ticker.fps(hz / n + 1)
    }
    requestAnimationFrame(probe)
  }

  /* ---------- 可见性 ---------- */
  App.onVisible = (el, cb, opts) => {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) cb(e.isIntersecting, e)
    }, Object.assign({ rootMargin: '10% 0px' }, opts))
    io.observe(el)
    return () => io.disconnect()
  }

  /* ---------- 板块注册 ---------- */
  App.sections = []
  App.section = (id, def) => {
    def.id = id
    App.sections.push(def)
    return def
  }
  App.getSection = id => App.sections.find(s => s.id === id)

  /* ---------- 音频占位（core/audio.js 会替换） ---------- */
  App.audio = App.audio || {
    start() {}, track() {}, sfx() {}, setMood() {}, setMuted() {}, hush() {}, muted: false, level: () => 0,
  }

  /* ---------- 唯一 id 重写（同一张 SVG 在页面上出现多次时避免冲突） ---------- */
  let uid = 0
  function uniquify(svgText) {
    const n = ++uid
    const ids = new Set()
    svgText.replace(/\sid="([^"]+)"/g, (_, id) => { ids.add(id); return '' })
    if (!ids.size) return svgText
    let out = svgText
    for (const id of ids) {
      const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      out = out
        .replace(new RegExp(`id="${safe}"`, 'g'), `id="${id}__${n}"`)
        .replace(new RegExp(`url\\(#${safe}\\)`, 'g'), `url(#${id}__${n})`)
        .replace(new RegExp(`href="#${safe}"`, 'g'), `href="#${id}__${n}"`)
    }
    return out
  }
  App.uniquify = uniquify

  /* ---------- 肖像 ---------- */
  const PORTRAITS = window.PORTRAITS || {}
  const watchers = new Set() // 视线追随
  function placeholderSVG(c) {
    const acc = (c && c.art && c.art.accent) || App.color.blood
    return `<svg viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg" class="portrait-ph">
  <g class="p-body"><path d="M60 800 C 80 640 170 580 300 570 C 430 580 520 640 540 800 Z" fill="#050404"/></g>
  <g class="p-head"><path d="M300 150 C 395 150 440 225 440 320 C 440 420 380 520 300 530 C 220 520 160 420 160 320 C 160 225 205 150 300 150 Z" fill="#050404"/>
  <g class="p-eye"><ellipse class="p-sclera" cx="250" cy="330" rx="22" ry="9" fill="#0d0b0b"/><g class="p-iris"><circle cx="250" cy="330" r="6" fill="${acc}"/></g></g>
  <g class="p-eye"><ellipse class="p-sclera" cx="350" cy="330" rx="22" ry="9" fill="#0d0b0b"/><g class="p-iris"><circle cx="350" cy="330" r="6" fill="${acc}"/></g></g></g></svg>`
  }
  App.portraitSVG = id => PORTRAITS[id] || placeholderSVG(App.char(id))
  // 正式肖像是位图（官方原图经统一抠图、构图、暗金单色调色），见 assets/data/portrait-images.js
  const PHOTOS = window.PORTRAIT_IMAGES || {}
  App.hasPortrait = id => !!(PHOTOS[id] || PORTRAITS[id])

  App.portrait = (id, opts = {}) => {
    const c = App.char(id)
    const wrap = U.el('div.portrait', { 'data-char': id })
    if (opts.mono) wrap.classList.add('is-mono')
    if (opts.dead) wrap.classList.add('is-dead')
    if (opts.silhouette) wrap.classList.add('is-silhouette')
    if (opts.className) wrap.className += ' ' + opts.className
    if (c && c.art && c.art.accent) wrap.style.setProperty('--accent', c.art.accent)
    if (PHOTOS[id]) {
      wrap.classList.add('is-photo')
      const img = U.el('img', { src: PHOTOS[id], alt: '', decoding: 'async', draggable: 'false' })
      // 肖像文件缺失时（比如只拿到了代码仓库），退回统一的剪影占位
      img.addEventListener('error', () => {
        wrap.classList.remove('is-photo')
        wrap.innerHTML = uniquify(placeholderSVG(c))
        if (wrap._eyes) { watchers.delete(wrap._eyes); wrap._eyes.unobserve() }
        if (opts.track !== false) App.trackEyes(wrap, opts)
      }, { once: true })
      wrap.appendChild(img)
    } else {
      wrap.innerHTML = uniquify(App.portraitSVG(id))
      const svg = wrap.querySelector('svg')
      if (svg) {
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      }
    }
    if (opts.track !== false) wrap._untrack = App.trackEyes(wrap, opts)
    return wrap
  }

  // 让肖像随光标而动；返回取消函数。
  // 矢量占位：.p-iris 平移、偶尔眨眼。位图肖像：整幅画像向光标微微偏转（--pvx/--pvy，CSS 里换算成位移）。
  App.trackEyes = (wrap, opts = {}) => {
    const irises = Array.from(wrap.querySelectorAll('.p-iris'))
    const eyes = Array.from(wrap.querySelectorAll('.p-eye'))
    const photo = wrap.classList.contains('is-photo')
    if (!irises.length && !photo) return () => {}
    const w = {
      wrap, irises, eyes, photo, visible: false, ox: 0, oy: 0,
      range: opts.eyeRange || 7,
      nextBlink: performance.now() + U.rand(1500, 6000),
      fixed: null, // 可设为 {x,y} 让视线固定看某处（屏幕坐标）
    }
    for (const e of eyes) { e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center' }
    w.unobserve = App.onVisible(wrap, v => { w.visible = v })
    watchers.add(w)
    wrap._eyes = w
    return () => { watchers.delete(w); w.unobserve() }
  }

  const live = [] // 本帧要更新的肖像（先统一读位置，再统一写，避免反复触发排版）
  App.tick(() => {
    if (!watchers.size) return
    const now = performance.now()
    live.length = 0
    for (const w of watchers) {
      if (!w.wrap.isConnected) {
        // 已从页面移除超过 2 秒（比如档案页换人）就不再追踪
        if (!w.gone) w.gone = now
        else if (now - w.gone > 2000) { watchers.delete(w); w.unobserve() }
        continue
      }
      w.gone = 0
      if (!w.visible) continue
      const r = w.wrap.getBoundingClientRect()
      if (r.width) live.push(w, r)
    }
    for (let n = 0; n < live.length; n += 2) {
      const w = live[n], r = live[n + 1]
      // 眼睛大约在肖像的 (50%, 41%)
      const ex = r.left + r.width * 0.5
      const ey = r.top + r.height * 0.41
      const tx = w.fixed ? w.fixed.x : mouse.sx
      const ty = w.fixed ? w.fixed.y : mouse.sy
      const dx = tx - ex, dy = ty - ey
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, d / (r.width * 1.2))
      const gx = (dx / d) * w.range * k
      const gy = (dy / d) * w.range * 0.7 * k
      w.ox = U.lerp(w.ox, gx, 0.2)
      w.oy = U.lerp(w.oy, gy, 0.2)
      if (w.photo) {
        // 只在数值变化时才写：光标停住后画像不再每帧触发样式与重绘
        const px = (w.ox / w.range).toFixed(2), py = (w.oy / w.range).toFixed(2)
        if (px !== w.px) { w.px = px; w.wrap.style.setProperty('--pvx', px) }
        if (py !== w.py) { w.py = py; w.wrap.style.setProperty('--pvy', py) }
        continue
      }
      const tr = `translate(${w.ox.toFixed(2)}px, ${w.oy.toFixed(2)}px)`
      for (const i of w.irises) i.style.transform = tr
      if (now > w.nextBlink && !App.reduced) {
        w.nextBlink = now + U.rand(2500, 7500)
        for (const e of w.eyes) {
          if (window.gsap) gsap.fromTo(e, { scaleY: 1 }, { scaleY: 0.08, duration: 0.07, yoyo: true, repeat: 1, ease: 'power2.in' })
        }
      }
    }
  })

  /* ---------- 纹章 ---------- */
  const SIGILS = window.SIGILS || {}
  App.sigil = (name, opts = {}) => {
    const wrap = U.el('span.sigil', { 'data-sigil': name })
    const raw = SIGILS[name]
    wrap.innerHTML = raw ? uniquify(raw) : `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" stroke-width="1"/><text x="100" y="122" text-anchor="middle" font-size="64" fill="currentColor" font-family="serif">${U.esc(String(name).slice(0, 1))}</text></svg>`
    if (opts.className) wrap.className += ' ' + opts.className
    return wrap
  }

  /* ---------- 浮层 ---------- */
  const ov = { el: null, onClose: null, open: false }
  App.overlay = {
    open(node, opts = {}) {
      ov.el = ov.el || document.getElementById('overlay')
      App.overlay.close(true)
      ov.onClose = opts.onClose || null
      ov.el.innerHTML = ''
      const back = U.el('div.ov-backdrop')
      const stage = U.el('div.ov-stage', { 'data-lenis-prevent': '' })
      const close = U.el('button.ov-close', { type: 'button', 'aria-label': '关闭', 'data-cursor': '关闭' })
      back.addEventListener('click', () => App.overlay.close())
      close.addEventListener('click', () => App.overlay.close())
      stage.appendChild(node)
      ov.el.append(back, stage, close)
      if (opts.className) ov.el.className = opts.className
      ov.el.classList.add('is-open')
      ov.el.setAttribute('aria-hidden', 'false')
      ov.open = true
      if (App.scroll) App.scroll.stop()
      if (window.gsap) {
        gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' })
        gsap.fromTo(close, { opacity: 0, rotate: -90 }, { opacity: 1, rotate: 0, duration: 0.6, ease: 'expo.out', delay: 0.2 })
      }
      App.bus.emit('overlay:open')
      return stage
    },
    close(silent) {
      if (!ov.open) return
      ov.open = false
      const el = ov.el
      const fn = ov.onClose
      ov.onClose = null
      const done = () => {
        el.classList.remove('is-open')
        el.className = ''
        el.setAttribute('aria-hidden', 'true')
        el.innerHTML = ''
      }
      if (fn) try { fn() } catch (e) { console.error(e) }
      if (silent || !window.gsap) done()
      else gsap.to(el, { opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => { done(); gsap.set(el, { opacity: 1 }) } })
      if (App.scroll) App.scroll.start()
      App.bus.emit('overlay:close')
    },
    get isOpen() { return ov.open },
  }
  window.addEventListener('keydown', e => { if (e.key === 'Escape') App.overlay.close() })

  /* ---------- 全屏效果 ---------- */
  App.flash = (color = App.color.bone, opts = {}) => {
    const f = document.getElementById('flash')
    if (!f || !window.gsap) return
    gsap.killTweensOf(f)
    gsap.set(f, { background: color, opacity: opts.opacity == null ? 0.9 : opts.opacity })
    gsap.to(f, { opacity: 0, duration: opts.duration || 0.6, ease: 'power2.out', delay: opts.hold || 0.04 })
  }

  // 斜切转场：一道血粉斜幕扫过；midway 回调在幕布完全遮住时执行
  App.slash = (midway, opts = {}) => new Promise(resolve => {
    const s = U.el('div.slash')
    if (opts.color) s.style.background = opts.color
    document.body.appendChild(s)
    App.audio.sfx('slash')
    const tl = gsap.timeline({ onComplete: () => { s.remove(); resolve() } })
    tl.fromTo(s, { xPercent: -130 }, { xPercent: 0, duration: 0.42, ease: 'expo.in' })
      .add(() => { if (midway) midway() })
      .to(s, { xPercent: 130, duration: 0.55, ease: 'expo.out', delay: opts.hold || 0.08 })
  })

  // 色差抖动
  App.glitch = (el, duration = 0.45) => {
    if (!el || !window.gsap) return
    App.audio.sfx('glitch')
    const tl = gsap.timeline()
    const n = 6
    for (let i = 0; i < n; i++) {
      tl.to(el, {
        x: U.rand(-8, 8), skewX: U.rand(-6, 6),
        textShadow: `${U.rand(-6, 6)}px 0 ${App.color.blood}, ${U.rand(-6, 6)}px 0 #00e5ff`,
        filter: `hue-rotate(${U.rand(-30, 30)}deg)`,
        duration: duration / n, ease: 'steps(1)',
      })
    }
    tl.to(el, { x: 0, skewX: 0, textShadow: 'none', filter: 'none', duration: 0.01 })
    return tl
  }

  App.shake = (el = document.getElementById('world'), strength = 10, duration = 0.4) => {
    if (!window.gsap) return
    const tl = gsap.timeline()
    const n = 8
    for (let i = 0; i < n; i++) tl.to(el, { x: U.rand(-strength, strength) * (1 - i / n), y: U.rand(-strength, strength) * (1 - i / n), duration: duration / n, ease: 'none' })
    tl.to(el, { x: 0, y: 0, duration: 0.05, clearProps: 'transform' })
    return tl
  }

  /* ---------- 文字效果 ---------- */
  App.text = {
    // 把元素文字拆成单字 span，返回 span 数组
    split(el) {
      const text = el.textContent
      el.textContent = ''
      el.setAttribute('aria-label', text)
      const chars = []
      for (const ch of Array.from(text)) {
        const s = document.createElement('span')
        s.className = 'tx-char'
        s.setAttribute('aria-hidden', 'true')
        s.textContent = ch === ' ' ? ' ' : ch
        el.appendChild(s)
        chars.push(s)
      }
      return chars
    },
    // 逐字从墨里浮出；scroll: true 时绑定到滚动进入
    reveal(el, opts = {}) {
      const chars = el._chars || (el._chars = App.text.split(el))
      const from = { opacity: 0, yPercent: opts.y == null ? 60 : opts.y, filter: 'blur(10px)', scale: opts.scale || 1 }
      const to = {
        opacity: 1, yPercent: 0, filter: 'blur(0px)', scale: 1,
        duration: opts.duration || 1.1, ease: opts.ease || 'expo.out',
        stagger: opts.stagger == null ? 0.045 : opts.stagger, delay: opts.delay || 0,
      }
      if (opts.scroll) {
        to.scrollTrigger = Object.assign({ trigger: opts.trigger || el, start: 'top 82%', toggleActions: 'play none none reverse' }, opts.scroll === true ? {} : opts.scroll)
      }
      return gsap.fromTo(chars, from, to)
    },
    // 打字机，返回 Promise
    type(el, text, opts = {}) {
      const speed = opts.speed || 42
      el.classList.add('tx-caret')
      el.textContent = ''
      const arr = Array.from(text)
      let i = 0
      return new Promise(resolve => {
        const step = () => {
          if (opts.cancel && opts.cancel()) { el.textContent = text; el.classList.remove('tx-caret'); return resolve() }
          if (i >= arr.length) {
            if (!opts.keepCaret) el.classList.remove('tx-caret')
            return resolve()
          }
          el.textContent += arr[i]
          if (opts.sound !== false && arr[i].trim() && i % 2 === 0) App.audio.sfx('type')
          const ch = arr[i]
          i++
          const pause = /[。！？…]/.test(ch) ? speed * 6 : /[，、；：]/.test(ch) ? speed * 3 : speed
          setTimeout(step, pause * U.rand(0.7, 1.3))
        }
        step()
      })
    },
    // 乱码解码
    scramble(el, text, opts = {}) {
      return gsap.to(el, {
        duration: opts.duration || 1.2,
        scrambleText: { text, chars: opts.chars || '█▓▒░十五席谋杀推理辩论审判钥匙血钟', speed: 0.6, revealDelay: opts.revealDelay || 0.2 },
        ease: 'none',
        delay: opts.delay || 0,
      })
    },
  }

  /* ---------- 启动 ---------- */
  const readyFns = []
  App.ready = fn => { if (App.isReady) fn(); else readyFns.push(fn) }
  App._fireReady = () => {
    App.isReady = true
    for (const fn of readyFns) { try { fn() } catch (e) { console.error(e) } }
  }
})()
