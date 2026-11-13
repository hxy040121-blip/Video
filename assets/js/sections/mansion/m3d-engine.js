/* ==========================================================
   洋馆 · 三维 · 引擎
   - 场景的几何在第一次靠近时生成一次（CPU 端留着）；画布与 WebGL 上下文只在板块靠近视口时存在：
     远离（section:far）就把显存全部交还、上下文主动丢弃，靠近（section:near）再建、预编译着色器。
   - 光：物理层 3.1 的时段表（窗光 = 屋外亮度；有窗房间的灯、廊与楼梯的灯各一栏），阴天、无日影、夜里无星月。
   - 拾取：鼠标射线与四面外墙（和屋面上的天顶、天眼）求交，落在哪扇窗里就是哪一间。
   ========================================================== */
(function () {
  'use strict'
  const T = window.THREE, MZ = window.MZ3D
  if (!T || !MZ) return
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const sm = t => t * t * (3 - 2 * t)

  /* ---------- 光（§3.1）：连续的，不分档（GPU 上改一个数不费事） ---------- */
  MZ.lightAt = min => {
    const h = ((((min % 1440) + 1440) % 1440)) / 60
    let win = 0
    if (h >= 5 && h < 7) win = (h - 5) / 2
    else if (h >= 7 && h < 17) win = 1
    else if (h >= 17 && h < 19) win = 1 - (h - 17) / 2
    const ramp = (a, b) => clamp((h - a) / (b - a))
    const lowK = h >= 23 ? ramp(23, 23.25) : h < 5 ? 1 : 1 - ramp(5, 5.25)
    const offK = h >= 7 && h < 17 ? ramp(7, 7.25) : h >= 17 && h < 17.25 ? 1 - ramp(17, 17.25) : 0
    const lampHall = 1 - 0.7 * lowK
    const lampRoom = lampHall * (1 - offK)
    return { h, win, lampRoom, lampHall, low: h >= 23 || h < 5, day: h >= 7 && h < 17 }
  }
  const PAL = {
    day: { zen: [0.4, 0.4, 0.39], hor: [0.6, 0.585, 0.56], sky: [1.0, 0.98, 0.95], gnd: [0.15, 0.148, 0.12], water: [0.032, 0.046, 0.046] },
    dusk: { zen: [0.045, 0.055, 0.08], hor: [0.1, 0.11, 0.145], sky: [0.15, 0.17, 0.24], gnd: [0.022, 0.022, 0.024], water: [0.012, 0.016, 0.022] },
    night: { zen: [0.0011, 0.0011, 0.0015], hor: [0.0022, 0.0022, 0.0028], sky: [0.011, 0.011, 0.016], gnd: [0.0018, 0.0018, 0.002], water: [0.002, 0.002, 0.003] },
  }
  const mixA = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
  MZ.applyLight = (L) => {
    const U = MZ.U
    const w = L.win
    let P
    if (w >= 0.4) { const t = sm((w - 0.4) / 0.6); P = k => mixA(PAL.dusk[k], PAL.day[k], t) } else { const t = Math.pow(w / 0.4, 1.6); P = k => mixA(PAL.night[k], PAL.dusk[k], t) }
    U.uZenCol.value.setRGB(...P('zen'))
    U.uHorCol.value.setRGB(...P('hor'))
    U.uFogCol.value.setRGB(...P('hor'))
    U.uHemiSky.value.setRGB(...P('sky'))
    U.uHemiGnd.value.setRGB(...P('gnd'))
    U.uWater.value.setRGB(...P('water'))
    U.uDay.value = w
    U.uLampRoom.value = L.lampRoom
    U.uLampHall.value = L.lampHall
  }

  /* ---------- 引擎 ---------- */
  class Engine {
    constructor(o) {
      this.detail = o.detail
      this.mobile = !!o.mobile
      this.scene = new T.Scene()
      this.camera = new T.PerspectiveCamera(40, 1, 0.6, 9000)
      this.renderer = null
      this.canvas = null
      this.built = false
      this.w = 1; this.h = 1
      this.dprCap = 1.5
      this.t0 = performance.now()
      this.ray = new T.Raycaster()
      this.lost = false
    }
    build() {
      if (this.built) return
      const h = MZ.buildHouse({ detail: this.detail })
      const g = MZ.buildGrounds({ detail: this.detail })
      this.house = h
      this.grounds = g
      this.scene.add(g.group, h.group)
      this.built = true
    }
    get ready() { return !!this.renderer && !this.lost }
    attach(host) {
      this.build()
      if (this.renderer) return
      const cv = document.createElement('canvas')
      cv.className = 'mansion-canvas'
      cv.setAttribute('aria-hidden', 'true')
      host.appendChild(cv)
      let r
      try {
        r = new T.WebGLRenderer({ canvas: cv, antialias: !this.mobile, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' })
      } catch (e) { cv.remove(); console.warn('[mansion] WebGL', e && e.message); return false }
      r.outputEncoding = T.sRGBEncoding
      r.toneMapping = T.ACESFilmicToneMapping
      r.toneMappingExposure = 1.06
      r.setClearColor(0x000000, 1)
      this.onLost = e => { e.preventDefault(); this.lost = true }
      this.onRestored = () => { this.lost = false }
      cv.addEventListener('webglcontextlost', this.onLost, false)
      cv.addEventListener('webglcontextrestored', this.onRestored, false)
      this.renderer = r
      this.canvas = cv
      this.applySize()
      try { r.compile(this.scene, this.camera) } catch (e) { /* 首帧再编译 */ }
      return true
    }
    // 交还显存：几何、材质、贴图逐个释放（CPU 端的数据留着），再丢掉上下文
    release() {
      if (!this.renderer) return
      const seen = new Set()
      const freeTex = t => { if (t && t.isTexture && !seen.has(t)) { seen.add(t); t.dispose() } }
      this.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose()
        const m = o.material
        if (m) {
          for (const k in m.uniforms || {}) freeTex(m.uniforms[k].value)
          m.dispose()
        }
        if (o.isInstancedMesh && o.dispose) o.dispose() // 释放实例矩阵的缓冲
      })
      for (const k in MZ.U) freeTex(MZ.U[k].value)
      const r = this.renderer
      this.canvas.removeEventListener('webglcontextlost', this.onLost)
      this.canvas.removeEventListener('webglcontextrestored', this.onRestored)
      r.dispose()
      try { r.forceContextLoss() } catch (e) { /* noop */ }
      this.canvas.remove()
      this.renderer = null
      this.canvas = null
      this.lost = false
    }
    setSize(w, h) { this.w = Math.max(1, w); this.h = Math.max(1, h); this.applySize() }
    setDprCap(c) { this.dprCap = c; this.applySize() }
    applySize() {
      if (!this.renderer) return
      const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap)
      this.renderer.setPixelRatio(dpr)
      this.renderer.setSize(this.w, this.h, false)
      this.canvas.style.width = this.w + 'px'
      this.canvas.style.height = this.h + 'px'
      this.camera.aspect = this.w / this.h
      this.camera.updateProjectionMatrix()
    }
    // 画质下调时少画几棵（实例已按离林缘的远近排好序：先省掉林子深处的）
    setTreeShare(k) {
      if (!this.built) return
      for (const m of this.grounds.trees.concat([this.grounds.ferns])) if (m) m.count = Math.max(1, Math.round(m.userData.full * k))
    }
    setLight(min) { const L = MZ.lightAt(min); MZ.applyLight(L); return L }
    pose(p) {
      const c = this.camera
      c.position.copy(p.pos)
      c.up.set(0, 1, 0)
      c.lookAt(p.tgt)
      if (p.roll) c.rotateZ(p.roll)
      if (Math.abs(c.fov - p.fov) > 1e-3) { c.fov = p.fov; c.updateProjectionMatrix() }
      if (p.near && Math.abs(c.near - p.near) > 1e-3) { c.near = p.near; c.updateProjectionMatrix() }
    }
    render() {
      if (!this.ready) return
      MZ.U.uTime.value = (performance.now() - this.t0) / 1000
      this.grounds.sky.position.copy(this.camera.position)
      this.renderer.render(this.scene, this.camera)
    }
    // 屏幕坐标（像素，相对画布）→ 指着哪一扇窗 / 哪一处天顶
    pick(x, y) {
      if (!this.built) return null
      const ndc = new T.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1)
      this.ray.setFromCamera(ndc, this.camera)
      const o = this.ray.ray.origin, d = this.ray.ray.direction
      let best = null
      const planes = [['S', 'z', 21.0, 1], ['N', 'z', -21.0, -1], ['W', 'x', -35.4, -1], ['E', 'x', 35.4, 1]]
      for (const [id, ax, at, sgn] of planes) {
        const dv = ax === 'z' ? d.z : d.x, ov = ax === 'z' ? o.z : o.x
        if (dv * sgn >= 0) continue
        const t = (at - ov) / dv
        if (t <= 0 || (best && t >= best.t)) continue
        const hp = o.clone().addScaledVector(d, t)
        const s = MZ.src(hp)
        const u = id === 'S' ? s.x + 0.6 : id === 'N' ? 70.2 - s.x : id === 'W' ? 41.4 - s.y : s.y + 0.6
        const L = id === 'S' || id === 'N' ? 70.8 : 42
        if (u < -0.3 || u > L + 0.3 || s.z < -0.5 || s.z > 16.2) continue
        const win = this.house.pick.find(w => w.F === id && u > w.u0 - 0.18 && u < w.u1 + 0.18 && s.z > w.v0 - 0.18 && s.z < w.v1 + 0.18)
        best = { t, win: win || null, wall: id }
      }
      // 屋面：天顶与天眼
      if (d.y < 0 && o.y > 15.2) {
        const t = (15.5 - o.y) / d.y
        if (!best || t < best.t) {
          const s = MZ.src(o.clone().addScaledVector(d, t))
          const inRoof = s.x > -0.6 && s.x < 70.2 && s.y > -0.6 && s.y < 41.4
          if (inRoof) {
            const W = window.WORLD || {}
            const hall = W.hall || { cx: 34.8, cy: 20.4, oculus: 2.4 }
            let room = null
            if (Math.hypot(s.x - hall.cx, s.y - hall.cy) < hall.oculus / 2 + 0.7) room = '穹顶议事厅'
            else for (const k of (W.skylights || [])) if (s.x > k.x0 && s.x < k.x1 && s.y > k.y0 && s.y < k.y1) room = k.over
            best = { t, win: room ? { floor: '1F', room, kind: 'roof', idx: -1 } : null, wall: 'roof' }
          }
        }
      }
      return best
    }
    info() {
      if (!this.renderer) return null
      const i = this.renderer.info
      return { calls: i.render.calls, triangles: i.render.triangles, points: i.render.points, lines: i.render.lines, geometries: i.memory.geometries, textures: i.memory.textures, programs: (i.programs || []).length, dpr: this.renderer.getPixelRatio(), size: [this.w, this.h] }
    }
  }
  MZ.Engine = Engine
})()
