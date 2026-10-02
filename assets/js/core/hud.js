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
      a.addEventListener('click', e => { e.preventDefault(); App.scroll.to('#' + def.id) })
      nav.appendChild(a)
      links[def.id] = a
    })
    App.bus.on('section:enter', id => {
      for (const k in links) links[k].classList.toggle('is-on', k === id)
    })
    hud.querySelector('.hud-mark').addEventListener('click', e => { e.preventDefault(); App.scroll.to(0) })

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
    const lv = bars.map(() => 0.15)
    App.tick(() => {
      const level = App.audio.muted ? 0 : App.audio.level()
      bars.forEach((b, i) => {
        const target = 0.15 + level * (0.6 + 0.4 * Math.sin(performance.now() / (140 + i * 37) + i * 1.7)) * 0.95
        lv[i] = U.lerp(lv[i], target, 0.3)
        b.style.transform = `scaleY(${lv[i].toFixed(3)})`
      })
    })
  }

  App.hud = {
    init,
    show() { gsap.to('#hud', { opacity: 1, duration: 1.2, ease: 'power2.out' }) },
  }
})()
