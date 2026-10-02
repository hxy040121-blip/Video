/* ==========================================================
   启动：等字体 → 依次挂载各板块 → 初始化滚动与 HUD → 遮幕
   ========================================================== */
(function () {
  'use strict'
  const App = window.App

  const fontsReady = document.fonts && document.fonts.ready
    ? Promise.race([document.fonts.ready, App.util.wait(4000)])
    : Promise.resolve()

  // 预先触发各字体加载（否则 fonts.ready 可能在用到之前就 resolve）
  if (document.fonts && document.fonts.load) {
    for (const f of ['900 20px "Serif SC"', '400 20px "Serif SC"', '500 12px "Sans SC"', '20px "Brush"', '12px "Cinzel"', '700 12px "Cinzel"', '12px "Mono"']) {
      document.fonts.load(f, '十五席').catch(() => {})
    }
  }

  const booted = fontsReady.then(() => {
    for (const def of App.sections) {
      const el = document.getElementById(def.id)
      if (!el || !def.mount) continue
      try { def.mount(el) } catch (e) { console.error('[mount]', def.id, e) }
    }
    App.scroll.init()
    App.hud.init()
    App._fireReady()
    ScrollTrigger.refresh()
  })

  App.gate.init(booted)
  window.addEventListener('load', () => ScrollTrigger.refresh())
})()
