/* ==========================================================
   洋馆 · 三维 · 公用（window.MZ3D）
   坐标：配置的定位轴线（x 向东、y 向北、z 向上，米，原点在西南角）→ three：
     X = x − 34.8，Y = z，Z = 20.4 − y   （议事厅圆心在原点；南 = +Z，北 = −Z）
   这里放：随机与噪声、几何拼装器（把成百上千块石构件并成一个网格、一次绘制）、
   共享的光照 uniform（时刻一变全部材质一起变）、GLSL 片段。
   ========================================================== */
(function () {
  'use strict'
  const T = window.THREE
  if (!T) return
  const MZ = (window.MZ3D = window.MZ3D || {})
  // 十六进制颜色按 sRGB 读入、换成线性；输出时再编码回 sRGB（三处一致，颜色才与网站其余部分对得上）
  if (T.ColorManagement) T.ColorManagement.legacyMode = false

  const OX = 34.8, OY = 20.4
  MZ.OX = OX; MZ.OY = OY
  MZ.SEA = -1.6 // 海面（比一层楼面低 1.6 m；水边 y≈−80.6）
  MZ.GROUND = -0.45 // 屋外地面（物理层 1.4）
  MZ.LAWN = { x0: -15.6, x1: 85.2, y0: -15.6, y1: 56.4 } // 外墙外皮外 15 m 草地（world.outside.lawnBox）
  MZ.SHORE = -80.6 // 水边（离南墙约 80 m）
  MZ.WALL_R = 300
  /** 轴线坐标 → three */
  MZ.v = (x, y, z) => new T.Vector3(x - OX, z, OY - y)
  MZ.src = p => ({ x: p.x + OX, y: OY - p.z, z: p.y })

  /* ---------------- 随机与噪声（CPU 端，与 GLSL 的不必一致） ---------------- */
  MZ.rng = seed => {
    let s = seed >>> 0
    return () => {
      s = (s + 0x6d2b79f5) >>> 0
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const hash2 = (x, y) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  MZ.hash2 = hash2
  MZ.noise2 = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
    const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
  }
  MZ.fbm2 = (x, y, oct = 4) => {
    let v = 0, a = 0.5, n = 0
    for (let i = 0; i < oct; i++) { v += a * MZ.noise2(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 3.7; a *= 0.5 }
    return v / n
  }
  MZ.smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
  MZ.lin = hex => { const c = new T.Color(hex); return [c.r, c.g, c.b] }

  /* ---------------- 地面高度（CPU：地面网格、树、蕨都用它） ---------------- */
  // 林子：草地外缘往外慢慢起伏；沙滩：从草地外缘的 −0.45 缓缓降到水边的海面，水下继续变深
  const L = MZ.LAWN
  MZ.lawnDist = (x, y) => { // 到草地矩形的距离（矩形内为 0）
    const dx = Math.max(L.x0 - x, 0, x - L.x1), dy = Math.max(L.y0 - y, 0, y - L.y1)
    return Math.hypot(dx, dy)
  }
  // 林子里离「开阔处」（草地或沙滩）多远；不在林子里为 0
  MZ.forestDepth = (x, y) => {
    if (y <= L.y0) return 0
    const dl = MZ.lawnDist(x, y)
    if (dl <= 0) return 0
    return Math.min(dl, y - L.y0)
  }
  MZ.height = (x, y) => {
    if (y < L.y0) { // 沙滩与海底
      const t = (L.y0 - y) / (L.y0 - MZ.SHORE)
      if (t <= 1) return MZ.GROUND + (MZ.SEA - MZ.GROUND) * Math.pow(t, 1.35) + (MZ.noise2(x * 0.08, y * 0.08) - 0.5) * 0.06 * Math.min(1, t * 4)
      const d = (MZ.SHORE - y) // 离水边多远
      return MZ.SEA - Math.min(15, d * 0.05 + Math.max(0, d - 50) * 0.04)
    }
    const fd = MZ.forestDepth(x, y)
    if (fd <= 0) return MZ.GROUND
    return MZ.GROUND + MZ.smooth(0, 14, fd) * (0.2 + 1.1 * MZ.fbm2(x / 34, y / 34, 3))
  }

  /* ---------------- 共享 uniform ---------------- */
  const C = () => new T.Color()
  MZ.U = {
    uTime: { value: 0 },
    uHemiSky: { value: C() }, uHemiGnd: { value: C() }, uTop: { value: 0.35 },
    uHorCol: { value: C() }, uZenCol: { value: C() }, uFogCol: { value: C() }, uFogDen: { value: 0.0016 },
    uDay: { value: 1 },        // 屋外亮度 = 窗光（0–1，物理层 1.4、3.1）
    uLampRoom: { value: 0 },   // 有窗房间的灯（亮 1 / 低亮 0.3 / 灭 0）
    uLampHall: { value: 1 },   // 无窗房间、廊道与楼梯的灯
    uWarm: { value: new T.Color(1.0, 0.74, 0.46) }, // 乳白玻璃球灯
    uWater: { value: C() },
    uGlowTex: { value: null }, // 外墙上的窗光（四面外墙的展开图，R 有窗房间、G 廊与楼梯）
    uSpillTex: { value: null }, // 草地与前庭上的窗光
    uHover: { value: -1 },
    uCloud: { value: 1 },
  }

  /* ---------------- GLSL ---------------- */
  const G = (MZ.GLSL = {})
  G.common = `
uniform float uTime, uTop, uFogDen, uDay, uLampRoom, uLampHall, uCloud;
uniform vec3 uHemiSky, uHemiGnd, uHorCol, uZenCol, uFogCol, uWarm, uWater;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm3(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ v += a*vn(p); p = p*2.03 + 17.1; a *= 0.5; } return v/0.875; }
float fbm5(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*vn(p); p = p*2.03 + 17.1; a *= 0.5; } return v/0.96875; }
vec3 toSrc(vec3 w){ return vec3(w.x + 34.8, 20.4 - w.z, w.y); }
// 阴天：天光从四面八方来，头顶亮一些，没有方向
vec3 skyLight(vec3 n){ float h = n.y*0.5 + 0.5; return mix(uHemiGnd, uHemiSky, h) + uHemiSky*uTop*max(n.y, 0.0); }
vec3 skyCol(vec3 d){ return mix(uHorCol, uZenCol, smoothstep(-0.02, 0.6, d.y)); }
float fogK(vec3 w){ float d = length(w - cameraPosition); return clamp(1.0 - exp(-d*d*uFogDen*uFogDen), 0.0, 1.0); }
vec3 applyFog(vec3 c, vec3 w){ return mix(c, uFogCol, fogK(w)); }
float aaStep(float w, float d){ return smoothstep(-w, w, d); }
`
  // 外墙窗光展开图：512×512，每米 6 像素；南、北、西、东四条（v 从 z=−1 起，17 m 高）
  G.glow = `
uniform sampler2D uGlowTex;
vec2 glowUV(float f, float u, float z){ return vec2(u*6.0/512.0, (f*102.0 + (z + 1.0)*6.0)/512.0); }
// 最近的一面外墙：0 南 1 北 2 西 3 东；u 是从外面看从左往右量的长度
vec3 facadeOf(vec3 s){
  float dS = abs(s.y + 0.6), dN = abs(s.y - 41.4), dW = abs(s.x + 0.6), dE = abs(s.x - 70.2);
  float m = min(min(dS, dN), min(dW, dE));
  if (m == dS) return vec3(0.0, s.x + 0.6, m);
  if (m == dN) return vec3(1.0, 70.2 - s.x, m);
  if (m == dW) return vec3(2.0, 41.4 - s.y, m);
  return vec3(3.0, s.y + 0.6, m);
}
vec2 glowAt(vec3 s){
  vec3 f = facadeOf(s);
  if (f.z > 1.4 || s.z > 15.2) return vec2(0.0);
  vec2 g = texture2D(uGlowTex, glowUV(f.x, f.y, s.z)).rg;
  return g * (1.0 - smoothstep(0.4, 1.4, f.z));
}
`
  G.out = `
  #include <tonemapping_fragment>
  #include <encodings_fragment>
`

  /* ---------------- 几何拼装器 ----------------
     attrs：额外的逐顶点属性 { 名: 维数 }；每个面都要给齐。
     所有坐标都按轴线坐标给（x 东、y 北、z 上），在这里换成 three。 */
  class GB {
    constructor(extra) {
      this.pos = []; this.nrm = []; this.col = []; this.kind = []; this.idx = []
      this.extra = extra || {}
      this.ex = {}
      for (const k in this.extra) this.ex[k] = []
      this.n = 0
    }
    // 一个四边形：四个轴线坐标点（从法线一侧看逆时针）
    quadS(p0, p1, p2, p3, col, kind, ex) {
      const a = MZ.v(p0[0], p0[1], p0[2]), b = MZ.v(p1[0], p1[1], p1[2]), c = MZ.v(p2[0], p2[1], p2[2]), d = MZ.v(p3[0], p3[1], p3[2])
      const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(d, a)).normalize()
      this.quad3(a, b, c, d, n, col, kind, ex)
    }
    quad3(a, b, c, d, n, col, kind, ex, cols) {
      const i = this.n
      for (const p of [a, b, c, d]) { this.pos.push(p.x, p.y, p.z); this.nrm.push(n.x, n.y, n.z) }
      for (let k = 0; k < 4; k++) {
        const cc = cols ? cols[k] : col
        this.col.push(cc[0], cc[1], cc[2]); this.kind.push(kind)
        for (const key in this.extra) { const v = ex && ex[key]; const dim = this.extra[key]; for (let j = 0; j < dim; j++) this.ex[key].push(v ? (Array.isArray(v[0]) ? v[k][j] : v[j]) : 0) }
      }
      this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3)
      this.n += 4
    }
    tri3(a, b, c, n, col, kind) {
      const i = this.n
      for (const p of [a, b, c]) { this.pos.push(p.x, p.y, p.z); this.nrm.push(n.x, n.y, n.z); this.col.push(col[0], col[1], col[2]); this.kind.push(kind); for (const key in this.extra) for (let j = 0; j < this.extra[key]; j++) this.ex[key].push(0) }
      this.idx.push(i, i + 1, i + 2)
      this.n += 3
    }
    // 轴线坐标里的长方体。skip：不画的面（'b' 底 't' 顶 'n' 'e' 's' 'w'）；shade：各面的明暗系数（假的环境光遮蔽）
    box(x0, x1, y0, y1, z0, z1, col, kind, skip, shade) {
      if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return
      skip = skip || ''
      const sh = k => { const f = shade && shade[k] != null ? shade[k] : (k === 'b' ? 0.7 : 1); return f === 1 ? col : [col[0] * f, col[1] * f, col[2] * f] }
      if (!skip.includes('t')) this.quadS([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], sh('t'), kind)
      if (!skip.includes('b')) this.quadS([x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], sh('b'), kind)
      if (!skip.includes('s')) this.quadS([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], sh('s'), kind)
      if (!skip.includes('n')) this.quadS([x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], sh('n'), kind)
      if (!skip.includes('w')) this.quadS([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], sh('w'), kind)
      if (!skip.includes('e')) this.quadS([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], sh('e'), kind)
    }
    // 把一个 three 的 BufferGeometry（已在 three 坐标里）按矩阵并进来
    addGeo(geo, mat, col, kind) {
      const g = geo.index ? geo.toNonIndexed() : geo
      const P = g.attributes.position, N = g.attributes.normal
      const nm = new T.Matrix3().getNormalMatrix(mat)
      const v = new T.Vector3(), n = new T.Vector3()
      const base = this.n
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(mat)
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize()
        this.pos.push(v.x, v.y, v.z); this.nrm.push(n.x, n.y, n.z)
        const cc = typeof col === 'function' ? col(v, n) : col
        this.col.push(cc[0], cc[1], cc[2]); this.kind.push(kind)
        for (const key in this.extra) for (let j = 0; j < this.extra[key]; j++) this.ex[key].push(0)
        this.idx.push(base + i)
      }
      this.n += P.count
      if (g !== geo) g.dispose()
    }
    build() {
      const g = new T.BufferGeometry()
      g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3))
      g.setAttribute('normal', new T.Float32BufferAttribute(this.nrm, 3))
      g.setAttribute('aCol', new T.Float32BufferAttribute(this.col, 3))
      g.setAttribute('aKind', new T.Float32BufferAttribute(this.kind, 1))
      for (const k in this.extra) g.setAttribute(k, new T.Float32BufferAttribute(this.ex[k], this.extra[k]))
      g.setIndex(this.n > 65535 ? new T.Uint32BufferAttribute(this.idx, 1) : new T.Uint16BufferAttribute(this.idx, 1))
      g.computeBoundingSphere()
      return g
    }
  }
  MZ.GB = GB

  /* ---------------- 材质工厂 ---------------- */
  // 所有材质共享 MZ.U 里的同一批 uniform 对象：时刻一变只改一处
  MZ.shader = (o) => {
    const uniforms = {}
    for (const k of o.shared || []) uniforms[k] = MZ.U[k]
    Object.assign(uniforms, o.uniforms || {})
    const m = new T.ShaderMaterial({
      uniforms, vertexShader: o.vs, fragmentShader: o.fs,
      side: o.side != null ? o.side : T.FrontSide,
      transparent: !!o.transparent, depthWrite: o.depthWrite !== false, depthTest: o.depthTest !== false,
      blending: o.blending != null ? o.blending : T.NormalBlending,
      extensions: { derivatives: true },
    })
    if (o.polygonOffset) { m.polygonOffset = true; m.polygonOffsetFactor = o.polygonOffset; m.polygonOffsetUnits = o.polygonOffset }
    return m
  }
  MZ.ALL = ['uTime', 'uHemiSky', 'uHemiGnd', 'uTop', 'uHorCol', 'uZenCol', 'uFogCol', 'uFogDen', 'uDay', 'uLampRoom', 'uLampHall', 'uWarm', 'uWater', 'uCloud']

  /* ---------------- 画布贴图 ---------------- */
  MZ.canvasTex = (cv, o = {}) => {
    const t = new T.CanvasTexture(cv)
    t.flipY = !!o.flipY
    t.wrapS = t.wrapT = o.repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping
    t.minFilter = o.mip === false ? T.LinearFilter : T.LinearMipmapLinearFilter
    t.magFilter = T.LinearFilter
    t.generateMipmaps = o.mip !== false
    if (o.srgb) t.encoding = T.sRGBEncoding
    t.needsUpdate = true
    return t
  }
})()
