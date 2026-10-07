/* ==========================================================
   平滑滚动（Lenis + ScrollTrigger）与板块切换
   - 当前板块变化时：发出 section:enter / section:leave，切换背景色调与音乐
   - 滚动进度映射为馆内时间：第一日 17:00 → 第二日 17:00
   App.scroll.to(target, opts) / stop() / start()
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  const U = App.util
  gsap.registerPlugin(ScrollTrigger)

  let lenis = null
  function init() {
    if (window.Lenis && !App.reduced) {
      lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false })
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(time => lenis.raf(time * 1000))
      gsap.ticker.lagSmoothing(0)
    }
    App.scroll.lenis = lenis
    if (lenis) lenis.stop() // 遮幕打开前锁住

    // 当前板块：谁覆盖视口中线
    for (const def of App.sections) {
      const el = document.getElementById(def.id)
      if (!el) continue
      ScrollTrigger.create({
        trigger: el,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: self => { if (self.isActive) setCurrent(def.id) },
      })
      // 进入/离开视口（用于暂停循环）
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: self => {
          const fn = self.isActive ? def.enter : def.leave
          if (fn) try { fn.call(def) } catch (e) { console.error(e) }
          App.bus.emit(self.isActive ? 'section:visible' : 'section:hidden', def.id)
        },
      })
    }

    // 滚动 → 馆内时间、背景位移
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: self => {
        const minutes = 17 * 60 + self.progress * 24 * 60
        App.state.minutes = minutes
        App.bus.emit('time', minutes)
        if (App.bg) App.bg.setScroll(self.progress * 6)
      },
    })

    // 板块事后变高（字体、图片、动态内容）时重算所有触发位置，色调与音乐切换才不会错位
    if (window.ResizeObserver) {
      const world = document.getElementById('world')
      let lastH = 0
      new ResizeObserver(() => {
        const h = world.offsetHeight
        if (Math.abs(h - lastH) > 2) { lastH = h; App.scroll.refresh() }
      }).observe(world)
    }
  }

  function setCurrent(id) {
    if (App.state.section === id) return
    const prev = App.state.section
    App.state.section = id
    if (prev) App.bus.emit('section:leave', prev)
    App.bus.emit('section:enter', id)
    const def = App.getSection(id)
    if (def) {
      if (def.palette && App.bg) App.bg.setPalette(def.palette)
      if (def.track && App.audio) App.audio.track(def.track)
    }
  }

  App.scroll = {
    init,
    lenis: null,
    stop() { if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden' },
    start() { if (lenis) lenis.start(); else document.body.style.overflow = '' },
    to(target, opts = {}) {
      if (lenis) lenis.scrollTo(target, Object.assign({ duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) }, opts))
      else {
        const el = typeof target === 'string' ? document.querySelector(target) : target
        if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' })
        else if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
    },
    refresh: U.debounce(() => ScrollTrigger.refresh(), 200),
    setCurrent,
  }

  window.addEventListener('resize', () => App.scroll.refresh())
})()
