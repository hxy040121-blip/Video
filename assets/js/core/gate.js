/* ==========================================================
   遮幕：载入 → 16:59 → 「睁开眼睛」→ 17:00 五声钟响 → 眼睑睁开
   完成后发出 bus 事件 'wake'
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  const U = App.util

  function init(loaded) {
    const gate = document.getElementById('gate')
    const btn = gate.querySelector('.gate-open')
    const bar = gate.querySelector('.gate-pulse i')
    const time = gate.querySelector('.gate-time')
    const hint = gate.querySelector('.gate-hint')
    const top = gate.querySelector('.gate-lid--top')
    const bottom = gate.querySelector('.gate-lid--bottom')
    const world = document.getElementById('world')

    gsap.set(world, { filter: 'blur(14px) brightness(.4)' })

    // 载入进度：字体 + 最短时长
    const minDelay = U.wait(1400)
    gsap.to(bar, { scaleX: 0.7, duration: 1.3, ease: 'power2.out' })
    // 16:59 冒号闪烁
    let blink = true
    const blinkTimer = setInterval(() => { blink = !blink; time.textContent = blink ? '16:59' : '16 59' }, 600)

    Promise.all([loaded, minDelay]).then(() => {
      gsap.to(bar, { scaleX: 1, duration: 0.4, ease: 'power2.out' })
      gsap.to(btn, { opacity: 1, y: 0, duration: 1, delay: 0.3, ease: 'expo.out', onStart: () => btn.removeAttribute('disabled') })
      gsap.to(hint, { opacity: 1, duration: 1, delay: 0.8 })
      btn.focus({ preventScroll: true })
    })

    let opened = false
    function open() {
      if (opened) return
      opened = true
      clearInterval(blinkTimer)
      App.audio.start()
      App.audio.sfx('chimes5')
      const skip = App.reduced
      const tl = gsap.timeline({
        onComplete: () => {
          gate.classList.add('is-gone')
          gate.style.display = 'none'
          gsap.set(world, { clearProps: 'filter' }) // filter 会让内部 fixed 元素失效，必须清掉
          document.body.classList.remove('is-locked')
          App.scroll.start()
          App.bus.emit('wake')
        },
      })
      tl.to([btn, hint, bar.parentNode], { opacity: 0, duration: 0.5, ease: 'power2.in' })
        .add(() => { time.textContent = '17:00'; App.glitch(time, 0.3) })
        .to(time, { opacity: 0, duration: 0.8, delay: 0.9 })
      if (skip) {
        tl.to([top, bottom], { opacity: 0, duration: 0.6 })
          .to(world, { filter: 'blur(0px) brightness(1)', duration: 0.6 }, '<')
      } else {
        // 迷糊地睁眼：半睁 → 合上 → 再睁 → 完全睁开
        tl.to(top, { yPercent: -22, duration: 0.9, ease: 'power2.out' }, '-=0.2')
          .to(bottom, { yPercent: 18, duration: 0.9, ease: 'power2.out' }, '<')
          .to(world, { filter: 'blur(10px) brightness(.55)', duration: 0.9 }, '<')
          .to([top, bottom], { yPercent: 0, duration: 0.35, ease: 'power3.in' })
          .to(top, { yPercent: -55, duration: 1.1, ease: 'power2.out', delay: 0.35 })
          .to(bottom, { yPercent: 50, duration: 1.1, ease: 'power2.out' }, '<')
          .to(world, { filter: 'blur(5px) brightness(.75)', duration: 1.1 }, '<')
          .to(top, { yPercent: -40, duration: 0.3, ease: 'power2.inOut' })
          .to(bottom, { yPercent: 36, duration: 0.3, ease: 'power2.inOut' }, '<')
          .to(top, { yPercent: -102, duration: 1.6, ease: 'expo.inOut' })
          .to(bottom, { yPercent: 102, duration: 1.6, ease: 'expo.inOut' }, '<')
          .to(world, { filter: 'blur(0px) brightness(1)', duration: 1.6, ease: 'power2.out' }, '<')
      }
      tl.add(() => App.hud.show(), '-=1.0')
    }
    btn.addEventListener('click', open)
    window.addEventListener('keydown', e => {
      if (!opened && (e.key === 'Enter' || e.key === ' ') && !btn.disabled) { e.preventDefault(); open() }
    })
  }

  App.gate = { init }
})()
