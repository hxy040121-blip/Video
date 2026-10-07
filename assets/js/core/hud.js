/* ==========================================================
   常驻 HUD：馆内时钟、板块索引、声音开关（随音乐跳动）
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  const U = App.util

  function init() {
    const hud = document.getElementById('hud')
    const nav = hud.querySelector('.hud-nav')
    const dayEl = hud.querySelector('.hud-day')
    const timeEl = hud.querySelector('.hud-time')
    const sound = hud.querySelector('.hud-sound')
    const bars = Array.from(sound.querySelectorAll('i'))

    // 板块索引
    const links = {}
    App.sections.forEach((def, i) => {
      const sec = document.getElementById(def.id)
      if (!sec) return
      const a = U.el('a', { href: '#' + def.id, 'data-cursor': '', 'aria-label': sec.dataset.title || def.id }, [
        U.roman(i + 1),
        U.el('span.hud-tip', { text: sec.dataset.title || '' }),
      ])
      a.addEventListener('click', e => { e.preventDefault(); App.nav.go(def.id) })
      nav.appendChild(a)
      links[def.id] = a
    })
    App.bus.on('section:enter', id => {
      for (const k in links) links[k].classList.toggle('is-on', k === id)
    })
    // 左上角的圆标：打开目录（手机上顶栏放不下编号，目录是主要的换章方式）
    hud.querySelector('.hud-mark').addEventListener('click', e => { e.preventDefault(); toggleMenu() })
    initKeys()

    // 放映：随时打开宣传片
    const film = hud.querySelector('.hud-film')
    if (film) film.addEventListener('click', () => { if (App.screening) App.screening.open() })

    // 时钟
    let shown = ''
    let shownDay = 0
    App.bus.on('time', minutes => {
      const c = U.clock(minutes)
      if (c.text !== shown) { shown = c.text; timeEl.textContent = c.text }
      if (c.day !== shownDay) {
        shownDay = c.day
        dayEl.textContent = '第' + U.cnNum(c.day) + '日'
        if (c.day > 1) App.glitch(dayEl, 0.3)
      }
    })

    // 声音
    const setMutedUI = m => sound.classList.toggle('is-muted', m)
    setMutedUI(App.store.get('muted', false))
    sound.addEventListener('click', () => {
      const m = !App.audio.muted
      App.audio.setMuted(m)
      App.store.set('muted', m)
      setMutedUI(m)
    })
    // 电平条：最多每秒 30 次，数值变化明显才写（静音或安静时完全不写）
    const lv = bars.map(() => 0.15), drawn = bars.map(() => -1)
    let lastBar = 0
    App.tick(() => {
      const now = performance.now()
      if (now - lastBar < 32) return
      lastBar = now
      const level = App.audio.muted ? 0 : App.audio.level()
      bars.forEach((b, i) => {
        const target = 0.15 + level * (0.6 + 0.4 * Math.sin(now / (140 + i * 37) + i * 1.7)) * 0.95
        lv[i] = U.lerp(lv[i], target, 0.45)
        if (Math.abs(lv[i] - drawn[i]) < 0.02) return
        drawn[i] = lv[i]
        b.style.transform = `scaleY(${lv[i].toFixed(2)})`
      })
    })
  }

  /* ---------- 目录 ---------- */
  const TAG = {
    prologue: '十五把椅子', screening: '宣传片', mansion: '窗后没有太阳', cast: '三十八张脸', table: '谁坐在哪里',
    identities: '撕不开的牌', cycle: '一夜的循环', trial: '亲手审一次', plaque: '一切都有价', wish: '只剩一个人',
  }
  let menuOpen = false
  function buildMenu() {
    const cur = App.state.section
    const list = U.el('nav.chap-list', { 'aria-label': '目录' })
    App.sections.forEach((def, i) => {
      const sec = document.getElementById(def.id)
      if (!sec) return
      const item = U.el('a.chap-item' + (def.id === cur ? '.is-current' : ''), { href: '#' + def.id, 'data-cursor': '' }, [
        U.el('span.chap-num', { text: U.roman(i + 1) }),
        U.el('span.chap-name', { text: sec.dataset.title || def.id }),
        U.el('span.chap-tag', { text: TAG[def.id] || '' }),
        U.el('span.chap-key', { text: String((i + 1) % 10) }),
      ])
      item.addEventListener('click', e => { e.preventDefault(); App.nav.go(def.id) })
      list.appendChild(item)
    })
    const keys = App.finePointer ? U.el('div.chap-keys', { text: 'PgUp / PgDn 换章 · 1–0 直达 · M 目录' }) : null
    return U.el('div.chap', null, keys ? [list, keys] : [list])
  }
  function openMenu() {
    if (menuOpen) return
    const node = buildMenu()
    App.overlay.open(node, { className: 'is-chapters', onClose: () => { menuOpen = false } })
    menuOpen = true
    if (window.gsap && !App.reduced) {
      gsap.fromTo(node.querySelectorAll('.chap-item'), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7, ease: 'expo.out', stagger: 0.035, clearProps: 'transform' })
    }
    const first = node.querySelector('.chap-item.is-current') || node.querySelector('.chap-item')
    if (first) first.focus({ preventScroll: true })
  }
  function toggleMenu() { if (menuOpen) App.overlay.close(); else openMenu() }

  /* ---------- 键盘：PgUp/PgDn 换章、数字键直达、M 目录 ---------- */
  // 晚一点再挂（排在各板块自己的按键处理之后），并尊重它们的 preventDefault（如身份牌聚焦、洋馆房间放大时）
  function initKeys() {
    const onKey = e => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return
      const k = e.key
      if (k === 'm' || k === 'M') { e.preventDefault(); toggleMenu(); return }
      if (App.overlay.isOpen && !menuOpen) return // 其他浮层（放映、画像）开着时不抢键
      if (k === 'PageDown') { e.preventDefault(); App.nav.next() }
      else if (k === 'PageUp') { e.preventDefault(); App.nav.prev() }
      else if (/^[0-9]$/.test(k)) {
        const list = App.nav.ids()
        const i = k === '0' ? 9 : +k - 1
        if (list[i]) { e.preventDefault(); App.nav.go(list[i]) }
      }
    }
    App.bus.on('wake', () => setTimeout(() => window.addEventListener('keydown', onKey), 0))
  }

  App.hud = {
    init,
    menu: { open: openMenu, toggle: toggleMenu },
    show() { gsap.to('#hud', { opacity: 1, duration: 1.2, ease: 'power2.out' }) },
  }
})()
