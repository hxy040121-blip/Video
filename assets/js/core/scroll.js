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
      // 排在帧循环最前面（prioritize）：先更新滚动位置，再跑各板块的 App.tick，
      // 否则跟着滚动走的画面会比滚动晚一帧，滚动时看起来发抖
      gsap.ticker.add(time => lenis.raf(time * 1000), false, true)
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
        const minutes = 17 * 60 + 5 + self.progress * (24 * 60 - 5) // 醒来时已是 17:05
        App.state.minutes = minutes
        // 交互模式（如模拟庭审）进行中，顶栏显示的是局内时刻，滚动不再覆盖它
        if (!(App.mode && App.mode.active)) App.bus.emit('time', minutes)
        if (App.bg) App.bg.setScroll(self.progress * 6)
      },
    })

    // 远离视口（上下一屏以外）的板块整块不画：visibility 不影响排版与滚动位置，
    // 但浏览器不再为里面的几百个合成层分配显存、每帧合成（整页图层从七百多个降到几十个）。
    // 板块可以监听 'section:far' / 'section:near' 释放或恢复自己的画布。
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(entries => {
        for (const e of entries) {
          const far = !e.isIntersecting
          if (e.target.classList.contains('is-far') === far) continue
          e.target.classList.toggle('is-far', far)
          App.bus.emit(far ? 'section:far' : 'section:near', e.target.id)
        }
      }, { rootMargin: '100% 0px 100% 0px' })
      for (const def of App.sections) { const el = document.getElementById(def.id); if (el) io.observe(el) }
    }

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
    // 有交互模式（App.mode）锁着滚动时不解锁，除非 force
    start(force) {
      if (!force && App.mode && App.mode.active) return
      if (lenis) lenis.start(); else document.body.style.overflow = ''
    },
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

  /* ---------- 章节导航：顶栏编号、目录、键盘都走这里 ---------- */
  // 跳转前先让正在进行的交互模式（如模拟庭审）退出并留存进度、关掉浮层，再解锁滚动
  const ids = () => App.sections.map(d => d.id).filter(id => document.getElementById(id))
  App.nav = {
    ids,
    index() { return Math.max(0, ids().indexOf(App.state.section)) },
    go(id) {
      const el = document.getElementById(id)
      if (!el) return
      if (App.mode) App.mode.exitAll()
      if (App.overlay && App.overlay.isOpen) App.overlay.close(true)
      App.scroll.start(true)
      const top = el.getBoundingClientRect().top + window.scrollY
      const dist = Math.abs(top - window.scrollY) / window.innerHeight
      // 远距离跳转不慢慢滑过中间所有板块：先淡出到黑，瞬移，再淡入
      if (lenis && dist > 3 && window.gsap && !App.reduced) {
        const veil = document.getElementById('flash')
        gsap.killTweensOf(veil)
        veil.dataset.c = '#050404'
        veil.style.background = '#050404'
        gsap.to(veil, {
          autoAlpha: 1, duration: 0.28, ease: 'power2.in',
          onComplete: () => {
            lenis.scrollTo(top, { immediate: true, force: true })
            ScrollTrigger.update()
            gsap.to(veil, { autoAlpha: 0, duration: 0.55, ease: 'power2.out', delay: 0.12 })
          },
        })
      } else App.scroll.to(top, { force: true, duration: Math.min(1.6, 0.6 + dist * 0.35) })
      App.bus.emit('nav:go', id)
    },
    step(d) {
      const list = ids()
      const i = U.clamp(App.nav.index() + d, 0, list.length - 1)
      // 板块很长时，「上一章」先回到本章开头
      if (d < 0) {
        const cur = document.getElementById(list[App.nav.index()])
        if (cur && cur.getBoundingClientRect().top < -window.innerHeight * 0.6) return App.nav.go(list[App.nav.index()])
      }
      App.nav.go(list[i])
    },
    next() { App.nav.step(1) },
    prev() { App.nav.step(-1) },
  }

  window.addEventListener('resize', () => App.scroll.refresh())
})()
