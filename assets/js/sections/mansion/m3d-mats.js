/* ==========================================================
   洋馆 · 三维 · 材质（全部是自己写的着色器：阴天的天光、雾、窗里的房间、夜里的窗光）
   不用实时阴影：阴天本来就没有方向光（物理层 3.1「没有太阳方向，也没有移动的日影」）；
   墙根、檐下、林子深处的暗是假的环境光遮蔽。
   ========================================================== */
(function () {
  'use strict'
  const T = window.THREE, MZ = window.MZ3D
  if (!T || !MZ) return
  const G = MZ.GLSL
  const mat = (MZ.mat = {})

  const VS_BASIC = `
varying vec3 vW; varying vec3 vN;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`

  // 南墙外皮（Z = 21）上的窗光倒影：沙滩的湿沙、海面用
  G.refl = `
vec2 facadeRefl(vec3 w, vec3 R){
  if (R.z > -0.02) return vec2(0.0);
  float t = (21.0 - w.z) / R.z;
  vec3 h = w + R * t;
  float u = h.x + 35.4;
  if (u < 0.0 || u > 70.8 || h.y < -0.5 || h.y > 15.5) return vec2(0.0);
  return texture2D(uGlowTex, glowUV(0.0, u, h.y)).rg;
}`

  /* ---------------- 石头：墙身、线脚、勒脚、屋面、门 ---------------- */
  mat.arch = () => MZ.shader({
    shared: MZ.ALL.concat(['uGlowTex']),
    vs: `
attribute vec3 aCol; attribute float aKind;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK;
void main(){
  vec4 p = vec4(position, 1.0); vec3 n = normal;
  #ifdef USE_INSTANCING
  p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vC = aCol; vK = aKind;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fs: G.common + G.glow + `
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vK;
void main(){
  vec3 n = normalize(vN);
  vec3 s = toSrc(vW);
  float side = 1.0 - step(0.5, abs(n.y));
  float along = abs(n.x) > abs(n.z) ? s.y : s.x;
  vec3 alb = vC;
  float k = vK;
  float fw = max(fwidth(s.z), fwidth(along)) + 1e-4;
  if (k < 0.5) {
    if (s.z < 4.8) {
      // 一层：横向分缝的粗面石（缝下沿受光、上沿背光）
      float c = (s.z - 0.74) / 0.676;
      float f = fract(c);
      float d = min(f, 1.0 - f) * 0.676;
      float g = 1.0 - smoothstep(0.02, 0.055 + fw, d);
      alb *= 1.0 - 0.62 * g * side;
      alb *= 1.0 + side * (0.07 * smoothstep(0.7, 0.97, f) - 0.08 * smoothstep(0.3, 0.03, f));
      float blk = floor(c);
      float a = (along + blk * 0.95) / 1.9;
      float fa = fract(a);
      float vj = 1.0 - smoothstep(0.004, 0.012 + fw, min(fa, 1.0 - fa) * 1.9);
      alb *= (0.92 + 0.13 * h21(vec2(blk, floor(a)))) * (1.0 - 0.25 * vj * side);
    } else {
      // 二三层：细缝方石，错缝
      float c = (s.z - 5.22) / 0.52;
      float f = fract(c); float d = min(f, 1.0 - f) * 0.52;
      float blk = floor(c);
      float a = (along + mod(blk, 2.0) * 0.62) / 1.24;
      float fa = fract(a); float da = min(fa, 1.0 - fa) * 1.24;
      float j = 1.0 - smoothstep(0.003, 0.012 + fw, min(d, da));
      alb *= (0.93 + 0.11 * h21(vec2(blk, floor(a)))) * (1.0 - 0.34 * j * side);
    }
  } else if (k < 1.5 || k > 5.5) {
    alb *= 0.92 + 0.12 * vn(vec2(along, s.z) * 3.1);
  } else if (k < 2.5) {
    alb *= 0.88 + 0.16 * vn(vec2(along, s.z) * 4.0);
  } else if (k < 3.5) {
    // 屋面：铅皮立咬口；议事厅穹顶的圆周（半径 7.8）以内改成朝天眼辐射的咬口
    vec2 q = s.xy - vec2(34.8, 20.4);
    float r = length(q);
    float pfw = fwidth(s.x) + 1e-4;
    float seam;
    if (r < 7.8) {
      float a = atan(q.y, q.x) / 6.28318 * 52.0;
      float fa = fract(a);
      float dm = min(fa, 1.0 - fa) * 6.28318 * r / 52.0;
      seam = 1.0 - smoothstep(0.02, 0.035 + pfw, dm);
    } else {
      float fa = fract(s.x / 0.6);
      seam = 1.0 - smoothstep(0.02, 0.035 + pfw, min(fa, 1.0 - fa) * 0.6);
    }
    alb *= 1.0 + 0.4 * seam;
    float ring = 1.0 - smoothstep(0.13, 0.16 + pfw, abs(r - 7.8));
    alb = mix(alb, vec3(0.36, 0.33, 0.27), ring);
    alb *= 0.8 + 0.32 * fbm3(s.xy * 0.3);
  } else if (k < 4.5) {
    alb *= 0.78 + 0.32 * vn(vec2(along * 26.0, s.z * 1.1));
  }
  // 雨水留下的竖向污痕
  if (k < 2.5) alb *= 1.0 - side * (0.12 - 0.16 * vn(vec2(along * 1.3, s.z * 0.08 + along * 0.21)));
  vec3 L = skyLight(n);
  float open = 0.84 + 0.16 * clamp(n.z, 0.0, 1.0);  // 南面朝着开阔的海
  float ao = mix(0.42, 1.0, smoothstep(-0.5, 1.7, s.z));
  ao *= 1.0 - 0.22 * side * smoothstep(12.4, 14.5, s.z) * (1.0 - step(14.62, s.z));
  vec3 col = alb * L * open * ao;
  if (k > 4.5 && k < 5.5) col += skyCol(reflect(normalize(vW - cameraPosition), n)) * alb * 0.5;
  vec2 g = glowAt(s);
  col += alb * uWarm * (g.r * uLampRoom + g.g * uLampHall) * (1.0 - uDay * 0.92) * 1.7;
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 窗玻璃：窗后的房间按真实进深、宽度和净高追一个盒子 ---------------- */
  mat.glass = () => MZ.shader({
    shared: MZ.ALL.concat(['uHover']),
    vs: `
attribute vec4 aUVWH; attribute vec4 aBox; attribute vec4 aRoom; attribute vec4 aGrid; attribute vec3 aTan; attribute vec3 aNrm;
varying vec3 vW; varying vec3 vTan; varying vec3 vNrm; varying vec4 vUVWH; varying vec4 vBox; varying vec4 vRoom; varying vec4 vGrid;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vTan = aTan; vNrm = aNrm; vUVWH = aUVWH; vBox = aBox; vRoom = aRoom; vGrid = aGrid;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fs: G.common + `
uniform float uHover;
varying vec3 vW; varying vec3 vTan; varying vec3 vNrm; varying vec4 vUVWH; varying vec4 vBox; varying vec4 vRoom; varying vec4 vGrid;
// 护壁（熏橡木，高 2.6）与象牙白灰泥（物理层开头）
vec3 wallA(float hy){ return hy < 2.6 ? vec3(0.05, 0.032, 0.022) : (hy < 2.68 ? vec3(0.03, 0.02, 0.014) : vec3(0.55, 0.51, 0.43)); }
vec3 floorA(float m, vec2 q){
  if (m < 0.5) return vec3(0.085, 0.052, 0.03) * (0.82 + 0.3 * vn(q * vec2(0.8, 7.0)));
  if (m < 1.5) return vec3(0.1, 0.028, 0.026) * (0.9 + 0.2 * vn(q * 3.0));
  return vec3(0.29, 0.27, 0.25) * (0.9 + 0.14 * h21(floor(q / 0.8)));
}
void main(){
  vec2 uv = vUVWH.xy; float w = vUVWH.z, h = vUVWH.w;
  float L = vBox.x, R = vBox.y, depth = vBox.z, fo = vBox.w;
  float clear = vRoom.x, lampCol = vRoom.y, kind = vRoom.z, idx = vRoom.w;
  vec3 V = normalize(vW - cameraPosition);
  vec3 d = vec3(dot(V, vTan), V.y, -dot(V, vNrm));
  d.z = max(d.z, 0.002);
  if (abs(d.x) < 1e-4) d.x = 1e-4;
  if (abs(d.y) < 1e-4) d.y = -1e-4;
  vec3 o = vec3(uv, 0.0);
  vec3 bmin = vec3(L, -fo, 0.0), bmax = vec3(R, clear - fo, depth);
  vec3 inv = 1.0 / d;
  vec3 tF = max((bmin - o) * inv, (bmax - o) * inv);
  float t = min(min(tF.x, tF.y), tF.z);
  vec3 p = o + d * t;
  float hy = p.y + fo;
  vec3 alb;
  if (t == tF.y && d.y < 0.0) alb = floorA(vGrid.w, p.xz);
  else if (t == tF.y) alb = vec3(0.58, 0.55, 0.48);
  else alb = wallA(hy);
  float lamp = mix(uLampRoom, uLampHall, lampCol);
  // 门厅：二、三层楼梯平台（靠北 3.6 m）的楼板与栏杆
  if (kind > 3.5) {
    for (int i = 0; i < 2; i++) {
      float lv = i == 0 ? 5.0 : 10.0;
      float tp = (lv - fo - o.y) / d.y;
      if (tp > 0.0 && tp < t) { vec3 q = o + d * tp; if (q.z > depth - 3.9) { t = tp; p = q; alb = d.y < 0.0 ? vec3(0.28, 0.26, 0.24) : vec3(0.5, 0.47, 0.41); hy = lv; } }
      float tr = (depth - 3.9 - o.z) / d.z;
      if (tr > 0.0 && tr < t) { vec3 q = o + d * tr; float rh = q.y + fo - lv; if (rh > 0.0 && rh < 1.1) { float bar = step(0.75, fract(q.x / 0.14)); if (bar > 0.5 || rh > 1.02 || rh < 0.06) { t = tr; p = q; alb = vec3(0.06, 0.045, 0.03); } } }
    }
    float tb = t;
    // 议事厅南门（北墙正中，宽 2.4 高 3.6）
    if (tb == tF.z && abs(p.x - (L + R) * 0.5) < 1.2 && hy < 3.6) alb = vec3(0.045, 0.03, 0.02);
  }
  vec3 lp = vec3((L + R) * 0.5, clear - fo - 0.6, min(depth * 0.5, 4.6));
  if (kind > 1.5 && kind < 2.5) lp.z = clamp(floor(p.z / 8.0) * 8.0 + 4.0, 3.0, max(3.0, depth - 2.0));
  if (kind > 3.5) lp = vec3((L + R) * 0.5, 11.5 - fo, depth * 0.45);
  float wide = R - L;
  if (wide > 10.0 && kind < 3.5) lp.x = p.x < (L + R) * 0.5 ? L + wide * 0.25 : L + wide * 0.75;
  vec3 dl = p - lp;
  float fall = kind > 3.5 ? 0.012 : 0.07;
  float illum = 1.35 / (1.0 + dot(dl, dl) * fall) + 0.16;
  vec3 light = uWarm * lamp * illum + vec3(0.82, 0.85, 0.9) * uDay * (0.035 + 0.16 / (1.0 + p.z * 0.3));
  vec3 inside = alb * light;
  // 乳白玻璃球灯本身
  vec3 oc = o - lp;
  float b = dot(oc, d), c = dot(oc, oc) - (kind > 3.5 ? 0.16 : 0.05);
  float disc = b * b - c;
  if (disc > 0.0) { float tg = -b - sqrt(disc); if (tg > 0.0 && tg < t) inside = vec3(0.7, 0.68, 0.62) * (0.08 + uDay * 0.25) + uWarm * lamp * 2.6; }
  // 套房：窗前的厚窗帘拉开在两边
  if (kind > 0.5 && kind < 1.5) {
    float tc = 0.2 / d.z; vec3 pc = o + d * tc;
    if ((pc.x < 0.58 || pc.x > w - 0.58) && pc.y > -fo + 0.04 && pc.y < clear - fo - 0.12) {
      float fold = 0.55 + 0.45 * sin(pc.x * 24.0 + 1.3);
      inside = vec3(0.12, 0.032, 0.028) * fold * (uWarm * lamp * 0.85 + vec3(0.7) * uDay * 0.12);
    }
  }
  // 玻璃：老玻璃每块略有起伏，映着天
  float sashW = w / vGrid.x;
  float paneW = sashW / vGrid.y, paneH = h / vGrid.z;
  vec2 cell = floor(vec2(uv.x / paneW, uv.y / paneH));
  vec3 Np = normalize(vNrm + vTan * (h21(cell + idx) - 0.5) * 0.06 + vec3(0.0, 1.0, 0.0) * (h21(cell * 1.7 + idx) - 0.5) * 0.06);
  vec3 Rv = reflect(V, Np);
  vec3 refl = Rv.y > 0.0 ? skyCol(Rv) : mix(uHemiGnd * 0.35, uHorCol, 0.25);
  float cosT = clamp(dot(-V, vNrm), 0.0, 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
  vec3 col = mix(inside * 0.84, refl * 0.85, F);
  // 黑色方格框：外框、窗扇、窗棂
  float aa = max(fwidth(uv.x), fwidth(uv.y)) + 1e-4;
  float edge = min(min(uv.x, w - uv.x), min(uv.y, h - uv.y));
  float fr = 1.0 - smoothstep(0.065 - aa, 0.065 + aa, edge);
  float su = mod(uv.x, sashW);
  fr = max(fr, 1.0 - smoothstep(0.034 - aa, 0.034 + aa, min(su, sashW - su)));
  float cu = mod(uv.x, paneW), cv = mod(uv.y, paneH);
  float bw = 0.013;
  float vis = clamp(bw * 1.6 / aa, 0.0, 1.0);
  fr = max(fr, (1.0 - smoothstep(bw - aa, bw + aa, min(min(cu, paneW - cu), min(cv, paneH - cv)))) * vis);
  if (kind > 3.5) { float tv = mod(uv.y, paneH * 3.0); fr = max(fr, 1.0 - smoothstep(0.045 - aa, 0.045 + aa, min(tv, paneH * 3.0 - tv))); }
  vec3 fc = vec3(0.011, 0.01, 0.009) + refl * 0.03 + uWarm * lamp * (1.0 - uDay) * 0.006;
  col = mix(col, fc, fr);
  if (abs(idx - uHover) < 0.5) {
    col = mix(col, vec3(0.62, 0.38, 0.14), fr * 0.9);
    col += inside * 0.35 + uWarm * 0.012;
  }
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 天顶玻璃：往下看是三层通高的门厅、两院 ---------------- */
  mat.atrium = () => MZ.shader({
    shared: MZ.ALL,
    uniforms: { uPlan: { value: null } },
    vs: `
attribute vec3 aCol; attribute vec3 aBmin; attribute vec3 aBmax;
varying vec3 vW; varying vec3 vN; varying vec3 vBmin; varying vec3 vBmax; varying float vKind;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vBmin = aBmin; vBmax = aBmax; vKind = aCol.x;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fs: G.common + `
uniform sampler2D uPlan;
varying vec3 vW; varying vec3 vN; varying vec3 vBmin; varying vec3 vBmax; varying float vKind;
void main(){
  vec3 V = normalize(vW - cameraPosition);
  vec3 n = normalize(vN);
  vec3 s = toSrc(vW);
  vec3 d = vec3(V.x, -V.z, V.y);
  if (abs(d.x) < 1e-4) d.x = 1e-4;
  if (abs(d.y) < 1e-4) d.y = 1e-4;
  d.z = min(d.z, -1e-3);
  vec3 o = vec3(clamp(s.x, vBmin.x + 0.01, vBmax.x - 0.01), clamp(s.y, vBmin.y + 0.01, vBmax.y - 0.01), vBmax.z);
  vec3 inv = 1.0 / d;
  vec3 tF = max((vBmin - o) * inv, (vBmax - o) * inv);
  float t = min(min(tF.x, tF.y), tF.z);
  vec3 p = o + d * t;
  vec3 alb;
  if (t == tF.z) alb = texture2D(uPlan, (p.xy - vec2(12.0, 0.0)) / vec2(45.6, 28.8)).rgb;
  else {
    float lv = mod(p.z, 5.0);
    alb = lv < 2.6 ? vec3(0.05, 0.032, 0.022) : vec3(0.55, 0.51, 0.43);
    if (lv > 4.5 || p.z < 0.3) alb = vec3(0.3, 0.28, 0.25);
    // 两院：二、三层朝院子是固定玻璃（黑色方格框）
    if (vKind > 0.5 && p.z > 5.0) { float gx = fract((p.x + p.y) / 1.2); alb = mix(vec3(0.03), vec3(0.008), step(0.92, gx)); }
  }
  // 门厅：楼梯平台（y=8.4—12）在二、三层
  if (vKind < 0.5) {
    for (int i = 0; i < 2; i++) {
      float lv = i == 0 ? 10.0 : 5.0;
      float tp = (lv - o.z) / d.z;
      if (tp > 0.0 && tp < t) { vec3 q = o + d * tp; if (q.y > 8.4) { t = tp; p = q; alb = vec3(0.27, 0.25, 0.23); } }
    }
  }
  float lamp = uLampRoom;
  vec3 light = uWarm * lamp * (0.55 + 0.35 * smoothstep(0.0, 9.0, p.z)) + vec3(0.85, 0.87, 0.9) * uDay * 0.32;
  vec3 inside = alb * light;
  vec3 Rv = reflect(V, n);
  float cosT = clamp(dot(-V, n), 0.0, 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
  vec3 col = mix(inside * 0.85, skyCol(Rv) * 0.9, F);
  // 方格框：平面上每 0.6 m 一格，四周与屋脊加粗
  float aa = max(fwidth(s.x), fwidth(s.y)) + 1e-4;
  vec2 g = fract(s.xy / 0.6);
  vec2 gd = min(g, 1.0 - g) * 0.6;
  float vis = clamp(0.03 / aa, 0.0, 1.0);
  float fr = (1.0 - smoothstep(0.016 - aa, 0.016 + aa, min(gd.x, gd.y))) * vis;
  float e = min(min(s.x - vBmin.x, vBmax.x - s.x), min(s.y - vBmin.y, vBmax.y - s.y));
  fr = max(fr, 1.0 - smoothstep(0.08 - aa, 0.08 + aa, e));
  col = mix(col, vec3(0.012) + skyCol(Rv) * 0.04, fr);
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 天眼的玻璃罩：十三道铜肋；往下看得见天眼下那一环十三盏灯 ---------------- */
  mat.oculus = () => MZ.shader({
    shared: MZ.ALL,
    vs: VS_BASIC,
    fs: G.common + `
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 V = normalize(vW - cameraPosition);
  vec3 n = normalize(vN);
  vec3 s = toSrc(vW);
  vec2 q = s.xy - vec2(34.8, 20.4);
  float r = length(q);
  float a = atan(q.y, q.x) / 6.28318 * 13.0;
  float fa = fract(a);
  float dm = min(fa, 1.0 - fa) * 6.28318 * r / 13.0;
  float aa = fwidth(s.x) + 1e-4;
  float rib = (1.0 - smoothstep(0.025 - aa, 0.025 + aa, dm)) * smoothstep(0.08, 0.25, r);
  vec3 d = vec3(V.x, -V.z, V.y);
  vec3 inside = vec3(0.0);
  float hl = uLampHall;
  if (d.z < -0.02) {
    float ts = (13.2 - s.z) / d.z; vec2 qs = (s + d * ts).xy - vec2(34.8, 20.4);
    float tl = (11.4 - s.z) / d.z; vec2 ql = (s + d * tl).xy - vec2(34.8, 20.4);
    float tt = (0.76 - s.z) / d.z; vec2 qt = (s + d * tt).xy - vec2(34.8, 20.4);
    float rt = length(qt);
    vec3 below = rt < 2.4 ? vec3(0.3, 0.28, 0.26) : (rt < 4.2 ? vec3(0.015, 0.02, 0.02) : vec3(0.28, 0.26, 0.24));
    inside = below * (uWarm * hl * 0.45 + vec3(0.8) * uDay * 0.28);
    float al = atan(ql.y, ql.x);
    float k = floor(al / 6.28318 * 13.0 + 0.5);
    float ak = k / 13.0 * 6.28318;
    float dg = length(ql - vec2(cos(ak), sin(ak)) * 0.92);
    inside = mix(inside, uWarm * (0.12 + 2.4 * hl) + vec3(0.6) * uDay * 0.2, smoothstep(0.15, 0.08, dg));
    inside += vec3(0.5, 0.36, 0.17) * (1.0 - smoothstep(0.0, 0.03, abs(length(ql) - 0.92))) * (0.1 + hl) * 0.5;
    if (length(qs) > 1.2) inside = vec3(0.5, 0.47, 0.4) * (uWarm * hl * 0.3 + vec3(0.7) * uDay * 0.25);
  }
  float cosT = clamp(dot(-V, n), 0.0, 1.0);
  float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);
  vec3 col = mix(inside * 0.85, skyCol(reflect(V, n)), F);
  col = mix(col, vec3(0.06, 0.045, 0.025) * skyLight(n) + skyCol(reflect(V, n)) * 0.08, rib);
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 夜里窗外的光晕（叠加） ---------------- */
  mat.halo = () => MZ.shader({
    shared: MZ.ALL,
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vs: `
attribute vec2 aP; attribute vec2 aWH; attribute vec3 aCol;
varying vec2 vP; varying vec2 vWH; varying vec3 vC; varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vP = aP; vWH = aWH; vC = aCol;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fs: G.common + `
varying vec2 vP; varying vec2 vWH; varying vec3 vC; varying vec3 vW;
void main(){
  vec2 q = abs(vP) - vWH * 0.5;
  float dOut = length(max(q, 0.0));
  float inside = step(max(q.x, q.y), 0.0);
  float g = exp(-dOut * 2.6) * (1.0 - inside * 0.7);
  float lamp = mix(uLampRoom, uLampHall, vC.x);
  float night = clamp(1.0 - uDay * 1.2, 0.0, 1.0);
  vec3 c = uWarm * g * lamp * night * 0.14 * vC.y * (1.0 - fogK(vW));
  gl_FragColor = vec4(c, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 屋外地面：草地、前庭的铺石、林下的落叶苔藓、沙滩与湿沙 ---------------- */
  mat.ground = () => MZ.shader({
    shared: MZ.ALL.concat(['uGlowTex', 'uSpillTex']),
    uniforms: { uSpillB: { value: new T.Vector4(MZ.SPILL ? MZ.SPILL.x0 : -16, MZ.SPILL ? MZ.SPILL.x1 : 86, MZ.SPILL ? MZ.SPILL.y0 : -18, MZ.SPILL ? MZ.SPILL.y1 : 59) } },
    vs: VS_BASIC,
    fs: G.common + G.glow + G.refl + `
uniform sampler2D uSpillTex; uniform vec4 uSpillB;
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 s = toSrc(vW);
  vec3 n = normalize(vN);
  float fw = fwidth(s.x) + 1e-4;
  vec2 dq = max(max(vec2(-15.6, -15.6) - s.xy, s.xy - vec2(85.2, 56.4)), 0.0);
  float dl = length(dq);
  float edgeN = (vn(s.xy * 0.4) - 0.5) * 0.9;
  float beachY = -15.6 + (vn(vec2(s.x * 0.11, 7.0)) - 0.5) * 1.4;
  vec3 alb;
  float wet = 0.0, ao = 1.0;
  if (s.y < beachY) {
    // 沙滩：细沙，靠水边一条湿沙（物理层 1.4）；没有礁石、贝壳和漂来的东西
    float rip = vn(vec2(s.x * 0.9 + s.y * 0.3, s.y * 2.4));
    alb = vec3(0.30, 0.27, 0.225) * (0.9 + 0.12 * rip) * (0.94 + 0.08 * vn(s.xy * 9.0));
    wet = smoothstep(-73.0, -77.5, s.y + (vn(vec2(s.x * 0.05, 1.0)) - 0.5) * 2.0);
    float sw = -80.6 + 1.1 + 0.9 * sin(uTime * 0.42 + s.x * 0.021) + 0.4 * sin(uTime * 0.71 + s.x * 0.05);
    float film = smoothstep(sw + 0.2, sw - 0.2, s.y);
    wet = max(wet, film);
    alb = mix(alb, vec3(0.115, 0.105, 0.088), wet * 0.85);
    float foamL = (1.0 - smoothstep(0.0, 0.22, abs(s.y - sw))) * (0.4 + 0.6 * vn(vec2(s.x * 0.8, uTime * 0.3)));
    alb = mix(alb, vec3(0.5, 0.5, 0.48), foamL * 0.55);
  } else if (dl < 0.6 + edgeN) {
    // 草地
    float patch = fbm3(s.xy * 0.13);
    alb = mix(vec3(0.05, 0.068, 0.032), vec3(0.085, 0.1, 0.045), patch) * (0.9 + 0.18 * vn(s.xy * 2.3));
    float inner = min(min(s.x + 15.6, 85.2 - s.x), min(s.y + 15.6, 56.4 - s.y));
    alb *= 0.72 + 0.28 * smoothstep(0.0, 4.0, inner + (s.y < -10.0 ? 6.0 : 0.0));
    // 前庭：铺石，宽 20、深 12
    if (s.x > 24.8 && s.x < 44.8 && s.y > -12.6 && s.y < -0.6) {
      float bd = min(min(s.x - 24.8, 44.8 - s.x), min(s.y + 12.6, 99.0));
      float row = floor((s.y + 12.6) / 0.8);
      float a = (s.x + mod(row, 2.0) * 0.6) / 1.2;
      vec2 f = vec2(fract(a), fract((s.y + 12.6) / 0.8));
      float jd = min(min(f.x, 1.0 - f.x) * 1.2, min(f.y, 1.0 - f.y) * 0.8);
      float joint = 1.0 - smoothstep(0.006, 0.016 + fw, jd);
      alb = vec3(0.16, 0.152, 0.138) * (0.88 + 0.16 * h21(vec2(floor(a), row))) * (1.0 - 0.45 * joint);
      if (bd < 0.6) alb = vec3(0.1, 0.095, 0.088) * (0.9 + 0.1 * vn(s.xy * 3.0));
    }
  } else {
    // 林下：落叶、苔藓与蕨，没有路
    float fd = min(dl, s.y + 15.6);
    float moss = smoothstep(0.45, 0.7, fbm3(s.xy * 0.09));
    alb = mix(vec3(0.05, 0.036, 0.024), vec3(0.035, 0.05, 0.022), moss);
    float leaf = step(0.78, h21(floor(s.xy * 5.0)));
    alb = mix(alb, vec3(0.1, 0.05, 0.022), leaf * 0.6 * (1.0 - moss));
    alb *= 0.85 + 0.25 * vn(s.xy * 1.7);
    alb *= mix(1.0, 0.32, smoothstep(1.0, 20.0, fd));
  }
  // 墙根的暗
  vec2 hq = max(max(vec2(-0.6, -0.6) - s.xy, s.xy - vec2(70.2, 41.4)), 0.0);
  float dh = length(hq);
  ao *= mix(0.5, 1.0, smoothstep(0.0, 2.4, dh));
  vec3 col = alb * skyLight(n) * ao;
  // 夜里窗口透出的光只照到窗外几米
  vec2 su = (s.xy - uSpillB.xz) / vec2(uSpillB.y - uSpillB.x, uSpillB.w - uSpillB.z);
  if (su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0) {
    vec2 sp = texture2D(uSpillTex, su).rg;
    col += alb * uWarm * (sp.r * uLampRoom + sp.g * uLampHall) * (1.0 - uDay * 0.95) * 2.4;
  }
  if (wet > 0.01) {
    vec3 V = normalize(vW - cameraPosition);
    vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
    float F = 0.02 + 0.98 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
    col = mix(col, skyCol(R) * 0.75, F * wet * 0.85);
    vec2 gr = facadeRefl(vW, R);
    col += uWarm * (gr.r * uLampRoom + gr.g * uLampHall) * (1.0 - uDay) * F * wet * 1.2;
  }
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 海：不涨不落，浪不大；水边一线白沫 ---------------- */
  mat.sea = () => MZ.shader({
    shared: MZ.ALL.concat(['uGlowTex']),
    vs: VS_BASIC,
    fs: G.common + G.glow + G.refl + `
varying vec3 vW; varying vec3 vN;
vec2 wv(vec2 p, vec2 dir, float k, float a, float sp){ float ph = dot(p, dir) * k - uTime * sp; return dir * (a * k * cos(ph)); }
void main(){
  vec3 s = toSrc(vW);
  float dist = length(vW - cameraPosition);
  vec2 p = vW.xz;
  vec2 g = vec2(0.0);
  g += wv(p, normalize(vec2(0.15, -1.0)), 0.21, 0.07, 0.95);
  g += wv(p, normalize(vec2(-0.45, -1.0)), 0.37, 0.035, 1.3);
  g += wv(p, normalize(vec2(0.7, -1.0)), 0.63, 0.018, 1.75);
  g += wv(p, normalize(vec2(-0.9, -0.6)), 1.1, 0.008, 2.3);
  float fade = 1.0 / (1.0 + dist * 0.006);
  float e = 0.35;
  vec2 rp = p * 0.55 + vec2(uTime * 0.12, -uTime * 0.2);
  float n0 = fbm3(rp), nx = fbm3(rp + vec2(e, 0.0)), nz = fbm3(rp + vec2(0.0, e));
  g += vec2(nx - n0, nz - n0) / e * 0.12;
  vec3 N = normalize(vec3(-g.x * fade, 1.0, -g.y * fade));
  vec3 V = normalize(vW - cameraPosition);
  vec3 R = reflect(V, N);
  R.y = abs(R.y);
  float cosT = clamp(dot(-V, N), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
  vec3 refl = skyCol(R);
  float off = -80.6 - s.y;
  float depth = min(15.0, max(off, 0.0) * 0.05 + max(0.0, off - 50.0) * 0.04);
  vec3 amb = skyLight(vec3(0.0, 1.0, 0.0));
  vec3 under = mix(vec3(0.12, 0.112, 0.092) * amb, uWater * amb, smoothstep(0.0, 1.8, depth));
  vec3 col = mix(under, refl * 0.92, F);
  // 近岸的小浪与白沫
  float ph = off * 0.8 - uTime * 0.85 + vn(vec2(s.x * 0.05, 3.0)) * 4.0;
  float crest = pow(max(0.0, sin(ph)), 14.0) * (1.0 - smoothstep(1.0, 11.0, off)) * smoothstep(-0.5, 1.0, off);
  float foam = crest * (0.45 + 0.55 * vn(vec2(s.x * 0.35, s.y * 0.8 + uTime * 0.15)));
  foam += (1.0 - smoothstep(-0.2, 1.3, off)) * 0.5 * (0.6 + 0.4 * vn(s.xy * 1.4 + uTime * 0.12));
  col = mix(col, vec3(0.55, 0.55, 0.53) * amb, clamp(foam, 0.0, 1.0) * 0.6);
  // 夜里：亮着的窗在海面上的倒影
  vec2 gr = facadeRefl(vW, R);
  col += uWarm * (gr.r * uLampRoom + gr.g * uLampHall) * (1.0 - uDay) * F * 2.2;
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 天：阴着；夜里看不见星月 ---------------- */
  mat.sky = () => MZ.shader({
    shared: MZ.ALL,
    depthWrite: false, depthTest: false, side: T.BackSide,
    vs: `
varying vec3 vD;
void main(){
  vD = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w * 0.9999;
}`,
    fs: G.common + `
varying vec3 vD;
void main(){
  vec3 d = normalize(vD);
  vec3 c = skyCol(d);
  vec2 q = d.xz / (max(d.y, 0.0) + 0.14) * 1.2 + vec2(uTime * 0.0035, uTime * 0.0012);
  float cl = fbm5(q);
  float k = smoothstep(-0.02, 0.3, d.y);
  c *= 1.0 + (cl - 0.5) * 0.24 * k * uCloud;
  gl_FragColor = vec4(c, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 树（实例化）：松树与山毛榉 ---------------- */
  mat.tree = () => MZ.shader({
    shared: MZ.ALL,
    side: T.DoubleSide,
    vs: G.common + `
attribute vec3 aCol;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vDepth; varying float vRel;
void main(){
  vec3 p = position;
  vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float ph = ip.x * 0.13 + ip.z * 0.07;
  float hk = max(0.0, p.y - 0.35) / 0.65;
  p.x += sin(uTime * 0.55 + ph) * 0.01 * hk * hk;
  p.z += cos(uTime * 0.43 + ph * 1.3) * 0.008 * hk * hk;
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  float hh = fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5453);
  vC = aCol * (0.8 + 0.4 * hh);
  vec3 s = toSrc(ip.xyz);
  vec2 dq = max(max(vec2(-15.6, -15.6) - s.xy, s.xy - vec2(85.2, 56.4)), 0.0);
  vDepth = min(length(dq), s.y + 15.6);
  vRel = p.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fs: G.common + `
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vDepth; varying float vRel;
void main(){
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float shade = mix(1.0, 0.36, smoothstep(2.0, 16.0, vDepth) * (1.0 - smoothstep(0.6, 0.98, vRel)));
  vec3 col = vC * skyLight(n) * shade;
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 蕨（实例化的交叉面片，透明贴图挖空） ---------------- */
  mat.fern = (tex) => MZ.shader({
    shared: MZ.ALL,
    side: T.DoubleSide,
    uniforms: { uTex: { value: tex } },
    vs: G.common + `
varying vec2 vUv; varying vec3 vW; varying float vTint; varying float vDepth;
void main(){
  vUv = uv;
  vec3 p = position;
  vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  p.x += sin(uTime * 0.9 + ip.x * 0.3) * 0.03 * p.y;
  vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vTint = fract(sin(dot(ip.xz, vec2(7.13, 3.71))) * 4375.85);
  vec3 s = toSrc(ip.xyz);
  vec2 dq = max(max(vec2(-15.6, -15.6) - s.xy, s.xy - vec2(85.2, 56.4)), 0.0);
  vDepth = min(length(dq), s.y + 15.6);
  gl_Position = projectionMatrix * viewMatrix * w;
}`,
    fs: G.common + `
uniform sampler2D uTex;
varying vec2 vUv; varying vec3 vW; varying float vTint; varying float vDepth;
void main(){
  vec4 t = texture2D(uTex, vUv);
  if (t.a < 0.5) discard;
  vec3 col = t.rgb * (0.75 + 0.5 * vTint) * skyLight(vec3(0.0, 1.0, 0.0)) * mix(0.9, 0.45, smoothstep(1.0, 12.0, vDepth));
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })

  /* ---------------- 远处的林冠（一张起伏的面）与林缘的「深处」 ---------------- */
  mat.canopy = () => MZ.shader({
    shared: MZ.ALL,
    vs: VS_BASIC,
    fs: G.common + `
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 s = toSrc(vW);
  vec3 n = normalize(vN);
  float pine = smoothstep(0.38, 0.62, vn(s.xy * 0.022));
  vec3 alb = mix(vec3(0.045, 0.058, 0.03), vec3(0.02, 0.032, 0.022), pine);
  float bump = fbm3(s.xy * 0.21);
  alb *= 0.55 + 0.8 * bump;
  if (abs(n.y) < 0.6) {
    float along = abs(n.x) > abs(n.z) ? s.y : s.x;
    float tr = smoothstep(0.5, 0.8, vn(vec2(along * 1.4, 0.5)));
    vec3 trunk = mix(vec3(0.008, 0.007, 0.006), vec3(0.03, 0.025, 0.02), tr);
    alb = mix(trunk, alb, smoothstep(7.0, 12.0, s.z));
  }
  vec3 col = alb * skyLight(n) * mix(0.6, 1.0, smoothstep(10.0, 22.0, s.z));
  col = applyFog(col, vW);
  gl_FragColor = vec4(col, 1.0);
` + G.out + `}`,
  })
})()
