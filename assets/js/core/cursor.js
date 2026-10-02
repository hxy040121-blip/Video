/* ==========================================================
   自定义光标
   [data-cursor="文字"]   悬停时光标放大并显示文字（空字符串则只放大）
   [data-cursor-tone="blood"] 用血粉色
   [data-magnetic]        元素被光标轻微吸引
   App.cursor.set(label) / App.cursor.hide(bool)
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  const U = App.util
  if (!App.finePointer) { App.cursor = { set() {}, hide() {} }; return }

  document.documentElement.classList.add('has-cursor')
  const el = document.getElementById('cursor')
  const ring = el.querySelector('.cursor-ring')
  const dot = el.querySelector('.cursor-dot')
  const label = el.querySelector('.cursor-label')
  let rx = App.mouse.x, ry = App.mouse.y
  let current = null
  let forced = null
  let lastHoverSfx = 0

  function apply(target) {
    const txt = forced != null ? forced : target ? target.getAttribute('data-cursor') : null
    if (txt == null) {
      el.classList.remove('is-label', 'is-hot', 'is-blood')
      return
    }
    const tone = target && target.getAttribute('data-cursor-tone')
    el.classList.toggle('is-blood', tone === 'blood')
    if (txt) {
      label.textContent = txt
      el.classList.add('is-label')
      el.classList.remove('is-hot')
    } else {
      el.classList.add('is-hot')
      el.classList.remove('is-label')
    }
  }

  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('[data-cursor]')
    if (t === current) return
    current = t
    apply(t)
    if (t) {
      const now = performance.now()
      if (now - lastHoverSfx > 70) { App.audio.sfx('hover'); lastHoverSfx = now }
    }
  })
  document.addEventListener('pointerdown', () => { el.classList.add('is-down'); App.audio.sfx('click') })
  document.addEventListener('pointerup', () => el.classList.remove('is-down'))
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'))
  document.addEventListener('pointerenter', () => el.classList.remove('is-hidden'))
  window.addEventListener('blur', () => el.classList.add('is-hidden'))
  window.addEventListener('focus', () => el.classList.remove('is-hidden'))

  // 磁吸
  const magnets = new Map()
  function scanMagnets() {
    for (const m of U.qsa('[data-magnetic]')) if (!magnets.has(m)) magnets.set(m, { x: 0, y: 0 })
  }

  App.tick((t, dt) => {
    const m = App.mouse
    rx = U.lerp(rx, m.x, Math.min(1, 0.22 * dt))
    ry = U.lerp(ry, m.y, Math.min(1, 0.22 * dt))
    dot.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`
    const stretch = Math.min(0.35, m.speed / 60)
    const ang = Math.atan2(m.vy, m.vx)
    const k = m.down ? 0.82 : 1
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${ang}rad) scale(${(1 + stretch) * k}, ${(1 - stretch * 0.6) * k})`
    label.style.transform = `rotate(${-ang}rad)`
    if (magnets.size) {
      for (const [node, s] of magnets) {
        if (!node.isConnected) { magnets.delete(node); continue }
        const r = node.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = m.x - cx, dy = m.y - cy
        const near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9
        s.x = U.lerp(s.x, near ? dx * 0.25 : 0, 0.15)
        s.y = U.lerp(s.y, near ? dy * 0.25 : 0, 0.15)
        node.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`
      }
    }
  })

  App.cursor = {
    set(txt) { forced = txt; apply(current) },
    clear() { forced = null; apply(current) },
    hide(v) { el.classList.toggle('is-hidden', !!v) },
    scanMagnets,
  }
  App.ready(scanMagnets)
  new MutationObserver(U.debounce(scanMagnets, 300)).observe(document.body, { childList: true, subtree: true })
})()
