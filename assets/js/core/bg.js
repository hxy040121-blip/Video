/* ==========================================================
   全屏背景：墨色烟雾（WebGL，被光标照亮、搅动）+ 胶片颗粒
   App.bg.setPalette({a, b, glow}) 切换色调
   App.bg.pulse(strength) 一次脉冲（心跳、发现尸体）
   App.bg.setDark(v) 0–1 额外的黑暗（盲视者、熄灯）
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  const U = App.util

  const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

  const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uGlow;
uniform float uPulse;
uniform float uDark;
uniform float uScroll;
uniform int uOct;

float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8,-0.6,0.6,0.8);
  for(int i=0;i<5;i++){ if(i>=uOct) break; v += a*noise(p); p = r*p*2.02 + 3.1; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x*asp, uv.y);
  vec2 m = vec2(uMouse.x/uRes.x*asp, 1.0 - uMouse.y/uRes.y);
  float t = uTime*0.035;

  // 光标附近的漩涡
  vec2 dm = p - m;
  float md = length(dm);
  float swirl = exp(-md*3.2) * (0.35 + length(uVel)*0.04);
  float ang = swirl*1.6;
  mat2 rot = mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
  vec2 q = m + rot*dm;
  q.y += uScroll*0.15;

  // 域扭曲烟雾
  vec2 w1 = vec2(fbm(q*1.6 + vec2(t, -t*0.6)), fbm(q*1.6 + vec2(-t*0.7, t) + 5.2));
  vec2 w2 = vec2(fbm(q*2.1 + w1*1.8 + vec2(1.7, 9.2) + t*0.5), fbm(q*2.1 + w1*1.8 + vec2(8.3, 2.8) - t*0.4));
  float smoke = fbm(q*1.4 + w2*2.2);
  smoke = smoothstep(0.25, 0.95, smoke);

  // 光源：光标是一盏烛火
  float light = exp(-md*md*7.0) * (0.55 + 0.45*uGlow);
  float far = exp(-md*1.4) * 0.25;
  float flick = 0.92 + 0.08*noise(vec2(uTime*3.0, 1.3));

  vec3 col = uColA * (0.35 + smoke*0.9);
  col += uColB * smoke * (light*1.2 + far) * flick * (0.4 + uGlow);
  col += uColB * light * 0.10 * flick;
  // 脉冲（发现尸体、心跳）
  col += vec3(1.0, 0.18, 0.49) * uPulse * (0.25 + smoke*0.5) * (1.0 - smoothstep(0.0, 1.4, md));
  // 底部更深，像地板吞掉了光
  col *= mix(0.55, 1.0, smoothstep(0.0, 0.6, uv.y + 0.15));
  col *= (1.0 - uDark);
  gl_FragColor = vec4(col, 1.0);
}`

  const state = {
    a: [0.06, 0.045, 0.045], b: [0.76, 0.60, 0.36], glow: 0.35,
    pulse: 0, dark: 0, scroll: 0, running: true,
  }

  function hex3(hex) { return U.hexToRgb(hex).map(v => v / 255) }

  function initGL() {
    const canvas = document.getElementById('bg')
    if (!canvas) return null
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) { canvas.style.background = 'radial-gradient(ellipse at 50% 30%, #1a1214, #0a0809 70%)'; return null }
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s))
      return s
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = {}
    for (const n of ['uRes', 'uTime', 'uMouse', 'uVel', 'uColA', 'uColB', 'uGlow', 'uPulse', 'uDark', 'uScroll', 'uOct']) u[n] = gl.getUniformLocation(prog, n)

    // 烟雾本身是柔的：按 CSS 像素的一小部分渲染即可（不乘设备像素比，高分屏上也不会多算 4 倍），
    // 画质每降一级：分辨率更低、噪声层数更少、隔帧渲染
    const Q = () => (App.quality ? App.quality.level : 2)
    const SCALE = [0.24, 0.32, 0.42], OCT = [3, 4, 5], EVERY = [3, 2, 1]
    function resize() {
      const scale = SCALE[Q()] * (App.isMobile() ? 0.8 : 1)
      canvas.width = Math.max(2, Math.floor(window.innerWidth * scale))
      canvas.height = Math.max(2, Math.floor(window.innerHeight * scale))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', U.debounce(resize, 120))
    App.bus.on('quality', resize)

    const start = performance.now()
    let nFrame = 0
    App.tick(() => {
      if (!state.running) return
      if (++nFrame % EVERY[Q()]) return
      const m = App.mouse
      const k = canvas.width / window.innerWidth
      gl.uniform2f(u.uRes, canvas.width, canvas.height)
      gl.uniform1f(u.uTime, (performance.now() - start) / 1000)
      gl.uniform2f(u.uMouse, m.sx * k, m.sy * k)
      gl.uniform2f(u.uVel, m.vx, m.vy)
      gl.uniform3fv(u.uColA, state.a)
      gl.uniform3fv(u.uColB, state.b)
      gl.uniform1f(u.uGlow, state.glow)
      gl.uniform1f(u.uPulse, state.pulse)
      gl.uniform1f(u.uDark, state.dark)
      gl.uniform1f(u.uScroll, state.scroll)
      gl.uniform1i(u.uOct, OCT[Q()])
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    })
    return gl
  }

  function initGrain() {
    const c = document.getElementById('grain')
    if (!c) return
    const ctx = c.getContext('2d')
    const S = 256
    const frames = []
    for (let f = 0; f < 6; f++) {
      const t = document.createElement('canvas')
      t.width = t.height = S
      const tc = t.getContext('2d')
      const img = tc.createImageData(S, S)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = 255
      }
      tc.putImageData(img, 0, 0)
      frames.push(ctx.createPattern(t, 'repeat'))
    }
    function resize() {
      c.width = Math.ceil(window.innerWidth / 2)
      c.height = Math.ceil(window.innerHeight / 2)
    }
    resize()
    window.addEventListener('resize', U.debounce(resize, 120))
    let f = 0, n = 0
    const applyQ = () => { c.style.display = App.quality && App.quality.level === 0 ? 'none' : '' }
    applyQ()
    App.bus.on('quality', applyQ)
    App.tick(() => {
      if (++n % 3) return
      if (App.quality && App.quality.level < 2 && f) return
      f = (f + 1) % frames.length
      ctx.save()
      ctx.translate(Math.random() * -S, Math.random() * -S)
      ctx.fillStyle = frames[f]
      ctx.fillRect(0, 0, c.width + S, c.height + S)
      ctx.restore()
    })
  }

  const proxy = { a0: 0, a1: 0, a2: 0, b0: 0, b1: 0, b2: 0, glow: 0 }
  App.bg = {
    setPalette(p = {}, duration = 1.6) {
      const a = p.a ? hex3(p.a) : state.a
      const b = p.b ? hex3(p.b) : state.b
      const glow = p.glow == null ? state.glow : p.glow
      Object.assign(proxy, { a0: state.a[0], a1: state.a[1], a2: state.a[2], b0: state.b[0], b1: state.b[1], b2: state.b[2], glow: state.glow })
      gsap.killTweensOf(proxy)
      gsap.to(proxy, {
        a0: a[0], a1: a[1], a2: a[2], b0: b[0], b1: b[1], b2: b[2], glow,
        duration, ease: 'power2.inOut',
        onUpdate: () => {
          state.a = [proxy.a0, proxy.a1, proxy.a2]
          state.b = [proxy.b0, proxy.b1, proxy.b2]
          state.glow = proxy.glow
        },
      })
    },
    pulse(strength = 1, duration = 1.2) {
      gsap.killTweensOf(state, 'pulse')
      gsap.fromTo(state, { pulse: strength }, { pulse: 0, duration, ease: 'power3.out' })
    },
    setDark(v, duration = 0.8) { gsap.to(state, { dark: v, duration, ease: 'power2.inOut' }) },
    setScroll(v) { state.scroll = v },
    pause() { state.running = false },
    resume() { state.running = true },
    state,
  }

  initGL()
  initGrain()
})()
