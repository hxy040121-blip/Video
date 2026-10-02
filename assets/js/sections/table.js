/* ==========================================================
   十五席 · table —— 装载
   与穹顶下的那张圆桌是同一张：青白玉桌面、老紫檀鼓座、墨玉地盘、十五把乌木扶手椅，
   1 号正北、顺时针；十五号与一号相邻（开局配置 §1、洋馆物理层 §1.1）。
   这里换成 3/4 俯视的「操作台」视角：桌沿十五枚黄铜号牌，桌下一排 38 枚圆形肖像徽章。
   拖：徽章拖向席位，身后拉出一根红线连回原处；靠近空席时被吸住（预览），落座 drop + 席位闪一下黄铜光。
       席上的人可以拖走（拖出桌外即离席），拖到别的席位互换。
   点：点徽章再点席位（手机用这个）；点席上的人再点别的席位互换，点 × 离席。
   随机：席位像老虎机一样闪过人像，一席一席定格；清空：一席一席熄灭。
   光标：靠近的席位抬起、号牌发亮；桌面与墨玉地盘的反光随光标移动；徽章排像船坞一样在光标下放大。
   每次变化写入 App.state.seats（长度 15，角色 id 或 null）、App.store('seats')，并发出 cast:change。
   另收 cast:seat / cast:unseat（卡池档案里的「入座 / 离席」）。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  if (window.Draggable) gsap.registerPlugin(window.Draggable)
  if (window.InertiaPlugin) gsap.registerPlugin(window.InertiaPlugin)
  if (window.ScrambleTextPlugin) gsap.registerPlugin(window.ScrambleTextPlugin)

  const PX = 'table-'
  const el = (spec, attrs, kids) => U.el(spec.replace(/\.([a-z][\w-]*)/gi, (m, c) => '.' + (/^is-/.test(c) ? c : PX + c)), attrs, kids)
  const sv = (tag, attrs) => U.svg(tag, attrs)
  const CH = App.chars
  const NS = 15
  const RM = App.reduced
  const PAL = { a: '#0d0a0a', b: '#eadcc2', glow: 0.3 }
  const smooth = (a, b, v) => { const t = U.clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
  const approach = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.pow(1 - k, dt))
  const two = n => String(n).padStart(2, '0')
  const f1 = n => n.toFixed(1)

  /* 几何（单位：席位环半径 = 1；《洋馆物理层》：桌径 4.8 m、椅环半径约 2.98 m） */
  const G = { table: 0.805, top: 0.255, lip: 0.02, drum: 0.352, floor: 1.42, inlay: 0.64, rim: 0.73, seatZ: 0.15, backZ: 0.37, chairW: 0.104, chairD: 0.09, headZ: 0.27 }

  const S = {
    built: false, visible: false, mob: false,
    W: 1440, H: 900, cx: 720, cy: 330, Rx: 440, Ry: 160, Rz: 400, d: 62, bd: 56,
    seats: Array(NS).fill(null),
    sel: null, // { kind: 'badge', id } | { kind: 'seat', i }
    drag: null, busy: false, justDragged: 0, hover: null, full: false,
    mx: -1e4, my: -1e4,
  }
  let sec, stage, svg, gTable, gFront, gBack, gRing, sheen, floorSheen, threadSvg, threadPath, threadPin
  let trayEl, readName, readEpi, countEl, countBig, btnRand, btnClear
  const seatEls = [] // { el, disc, head, x, y, nx, ny, num, k, lift, x: btn }
  const badges = {} // id → { el, disc, por, x, y, k }
  const heads = {} // id → 圆形头像（席位 / 拖动用，带视线追随）

  /* =====================================================================
     读取存档
     ===================================================================== */
  function loadSeats() {
    const src = Array.isArray(App.state.seats) ? App.state.seats : []
    const seen = new Set()
    for (let i = 0; i < NS; i++) {
      const id = src[i]
      S.seats[i] = id && App.char(id) && !seen.has(id) ? id : null
      if (S.seats[i]) seen.add(id)
    }
    App.state.seats = S.seats.slice()
  }

  /* =====================================================================
     投影
     ===================================================================== */
  const P = (x, y, z) => [S.cx + x * S.Rx, S.cy - y * S.Ry - (z || 0) * S.Rz]
  const seatAng = i => (i * 2 * Math.PI) / NS // 1 号正北，顺时针
  const ringPt = (i, r, z) => { const a = seatAng(i); return P(Math.sin(a) * r, Math.cos(a) * r, z) }
  function ellipsePath(r, z, a0, a1, n) {
    // 以「顺时针从北起算」的角度画一段圆（投影后是椭圆弧）
    const pts = []
    const steps = n || 48
    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((a1 - a0) * k) / steps
      pts.push(P(Math.sin(a) * r, Math.cos(a) * r, z))
    }
    return 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L')
  }
  const ellipseFull = (r, z) => { const [x, y] = P(0, 0, z); return { cx: x, cy: y, rx: r * S.Rx, ry: r * S.Ry } }

  /* =====================================================================
     布局
     ===================================================================== */
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight
    S.mob = vw < 760
    S.W = vw
    if (S.mob) {
      S.Rx = Math.min(vw * 0.39, 168)
      S.Ry = S.Rx * 0.6
      S.Rz = S.Rx * 0.8
      S.cx = vw / 2
      S.cy = 112 + S.Ry + S.Rz * G.backZ + 14
      S.d = Math.round(S.Rx * 0.25)
      const cols = 7
      const gap = 8
      S.bd = Math.floor((vw - 32 - gap * (cols - 1)) / cols)
      S.bd = Math.min(S.bd, 48)
      S.trayCols = cols
      S.trayGap = gap
      S.uiY = S.cy + S.Ry * 1.12 + 26
      S.readY = S.uiY + 52
      S.trayY = S.readY + 58
      const rows = Math.ceil(CH.length / cols)
      S.H = Math.round(S.trayY + rows * S.bd + (rows - 1) * (gap + 4) + 40)
    } else {
      S.H = Math.max(vh, 760)
      S.Rx = Math.min(vw * 0.3, 470, (S.H - 330) * 1.04)
      S.Ry = S.Rx * 0.37
      S.Rz = S.Rx * 0.93
      S.cx = vw / 2
      S.cy = Math.round(S.H * 0.17 + S.Ry + S.Rz * G.backZ * 0.85)
      S.d = Math.round(Math.min(72, Math.max(50, S.Rx * 0.14)))
      const cols = Math.ceil(CH.length / 2)
      const avail = Math.min(vw - 2 * Math.max(40, vw * 0.045), 1400)
      S.trayCols = cols
      S.trayGap = Math.max(8, Math.min(16, (avail - cols * 56) / (cols - 1)))
      S.bd = Math.floor(Math.min(60, (avail - S.trayGap * (cols - 1)) / cols))
      const trayH = 2 * S.bd + S.trayGap + 6
      S.trayY = S.H - trayH - Math.max(36, S.H * 0.05)
      S.readY = S.trayY - 62
      S.uiY = S.readY
    }
    stage.style.height = S.H + 'px'
    sec.classList.toggle('is-mob', S.mob)
    drawTable()
    placeSeats()
    placeTray()
    placeUI()
  }

  /* =====================================================================
     桌与椅（SVG）
     ===================================================================== */
  function chairPaths(i) {
    const a = seatAng(i)
    const r = [Math.sin(a), Math.cos(a)], t = [Math.cos(a), -Math.sin(a)]
    const at = (rad, tan, z) => P(r[0] * rad + t[0] * tan, r[1] * rad + t[1] * tan, z)
    const w = G.chairW, d = G.chairD
    const s = [at(1 - d, -w, G.seatZ), at(1 - d, w, G.seatZ), at(1 + d, w, G.seatZ), at(1 + d, -w, G.seatZ)]
    const ro = 1 + d * 0.92
    const b0 = at(ro, -w, G.seatZ), b1 = at(ro, w, G.seatZ)
    const b2 = at(ro, w * 0.86, G.backZ), bm = at(ro, 0, G.backZ + 0.05), b3 = at(ro, -w * 0.86, G.backZ)
    const seat = `M${s.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L')}Z`
    const back = `M${f1(b0[0])} ${f1(b0[1])}L${f1(b1[0])} ${f1(b1[1])}L${f1(b2[0])} ${f1(b2[1])}Q${f1(bm[0])} ${f1(bm[1] - 6)} ${f1(b3[0])} ${f1(b3[1])}Z`
    const arm = [at(ro, -w, 0.25), at(1 - d * 0.6, -w, 0.24), at(ro, w, 0.25), at(1 - d * 0.6, w, 0.24)]
    const arms = `M${f1(arm[0][0])} ${f1(arm[0][1])}L${f1(arm[1][0])} ${f1(arm[1][1])}M${f1(arm[2][0])} ${f1(arm[2][1])}L${f1(arm[3][0])} ${f1(arm[3][1])}`
    const legs = [at(1 - d, -w, 0), at(1 - d, -w, G.seatZ), at(1 - d, w, 0), at(1 - d, w, G.seatZ)]
    const legP = `M${f1(legs[0][0])} ${f1(legs[0][1])}L${f1(legs[1][0])} ${f1(legs[1][1])}M${f1(legs[2][0])} ${f1(legs[2][1])}L${f1(legs[3][0])} ${f1(legs[3][1])}`
    const faces = Math.cos(a) > 0 // 北侧的椅子：看得到座背正面的真丝
    return { seat, back, arms, legs: legP, faces }
  }

  function drawTable() {
    const W = S.W, H = S.H
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.style.width = W + 'px'
    svg.style.height = H + 'px'
    const fl = ellipseFull(G.floor, 0)
    const top = ellipseFull(G.table, G.top)
    const lip = ellipseFull(G.table, G.top - G.lip)
    const drumT = ellipseFull(G.drum, G.top - G.lip)
    const drumB = ellipseFull(G.drum, 0)
    const inl = ellipseFull(G.inlay, G.top)
    const inl2 = ellipseFull(G.inlay - 0.035, G.top)
    const cen = ellipseFull(0.12, G.top)
    const cen2 = ellipseFull(0.05, G.top)
    let h = ''
    h += `<defs>
<radialGradient id="table-floor" cx="${f1(fl.cx)}" cy="${f1(fl.cy)}" r="${f1(fl.rx)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${f1(fl.cy)}) scale(1 ${(fl.ry / fl.rx).toFixed(4)}) translate(0 ${f1(-fl.cy)})"><stop offset="0" stop-color="#121816"/><stop offset=".7" stop-color="#0a0d0c"/><stop offset="1" stop-color="#050606"/></radialGradient>
<radialGradient id="table-fsheen" gradientUnits="userSpaceOnUse" cx="${f1(fl.cx)}" cy="${f1(fl.cy)}" r="${f1(S.Rx * 0.55)}"><stop offset="0" stop-color="#e9dcc2" stop-opacity=".16"/><stop offset="1" stop-color="#e9dcc2" stop-opacity="0"/></radialGradient>
<linearGradient id="table-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f7c73"/><stop offset=".45" stop-color="#48534c"/><stop offset="1" stop-color="#232a26"/></linearGradient>
<radialGradient id="table-sheen" gradientUnits="userSpaceOnUse" cx="${f1(top.cx)}" cy="${f1(top.cy)}" r="${f1(S.Rx * 0.42)}"><stop offset="0" stop-color="#f4f0e4" stop-opacity=".42"/><stop offset=".5" stop-color="#e3e8dc" stop-opacity=".1"/><stop offset="1" stop-color="#e3e8dc" stop-opacity="0"/></radialGradient>
<linearGradient id="table-lip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b211e"/><stop offset=".5" stop-color="#3c463f"/><stop offset="1" stop-color="#151a17"/></linearGradient>
<linearGradient id="table-drum" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#170a07"/><stop offset=".45" stop-color="#3a1a12"/><stop offset="1" stop-color="#0f0605"/></linearGradient>
<clipPath id="table-topclip"><ellipse cx="${f1(top.cx)}" cy="${f1(top.cy)}" rx="${f1(top.rx)}" ry="${f1(top.ry)}"/></clipPath>
</defs>`
    // 墨玉地盘
    h += `<ellipse class="table-floor" cx="${f1(fl.cx)}" cy="${f1(fl.cy)}" rx="${f1(fl.rx)}" ry="${f1(fl.ry)}" fill="url(#table-floor)"/>`
    h += `<ellipse class="table-floor-sheen" cx="${f1(fl.cx)}" cy="${f1(fl.cy)}" rx="${f1(fl.rx)}" ry="${f1(fl.ry)}" fill="url(#table-fsheen)"/>`
    for (const k of [1, 0.985, 1.14]) {
      const e = ellipseFull(G.floor * k * (k > 1 ? 0.9 : 1), 0)
      h += `<ellipse cx="${f1(e.cx)}" cy="${f1(e.cy)}" rx="${f1(e.rx)}" ry="${f1(e.ry)}" fill="none" stroke="#6f5532" stroke-opacity="${k === 1 ? 0.55 : 0.22}" stroke-width="${k === 1 ? 1 : 0.6}"${k > 1 ? ' stroke-dasharray="2 6"' : ''}/>`
    }
    // 十五道放射线（地盘上）
    for (let i = 0; i < NS; i++) {
      const a = ringPt(i, 1.24, 0), b = ringPt(i, 1.36, 0)
      h += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="#6f5532" stroke-opacity=".45" stroke-width=".8"/>`
    }
    svg.innerHTML = h
    gBack = sv('g', { class: 'table-chairs table-chairs--back' })
    gTable = sv('g', { class: 'table-tbl' })
    gFront = sv('g', { class: 'table-chairs table-chairs--front' })
    svg.append(gBack, gTable, gFront)
    // 椅子
    const order = Array.from({ length: NS }, (_, i) => i).sort((a, b) => Math.cos(seatAng(b)) - Math.cos(seatAng(a)))
    for (const i of order) {
      const c = chairPaths(i)
      const g = sv('g', { class: 'table-chair', 'data-i': i })
      const back = Math.cos(seatAng(i)) >= 0
      g.innerHTML =
        `<path class="table-chair-leg" d="${c.legs}"/>` +
        (back ? `<path class="table-chair-back${c.faces ? ' is-silk' : ''}" d="${c.back}"/>` : '') +
        `<path class="table-chair-seat" d="${c.seat}"/>` +
        `<path class="table-chair-arm" d="${c.arms}"/>` +
        (!back ? `<path class="table-chair-back${c.faces ? ' is-silk' : ''}" d="${c.back}"/>` : '')
      ;(back ? gBack : gFront).appendChild(g)
    }
    // 鼓座、桌沿、桌面
    let t = ''
    t += `<path d="M${f1(drumB.cx - drumB.rx)} ${f1(drumB.cy)}L${f1(drumT.cx - drumT.rx)} ${f1(drumT.cy)}A${f1(drumT.rx)} ${f1(drumT.ry)} 0 0 0 ${f1(drumT.cx + drumT.rx)} ${f1(drumT.cy)}L${f1(drumB.cx + drumB.rx)} ${f1(drumB.cy)}A${f1(drumB.rx)} ${f1(drumB.ry)} 0 0 1 ${f1(drumB.cx - drumB.rx)} ${f1(drumB.cy)}Z" fill="url(#table-drum)" stroke="#2a140e" stroke-width=".8"/>`
    t += `<ellipse cx="${f1(drumB.cx)}" cy="${f1(drumB.cy + 2)}" rx="${f1(drumB.rx * 1.25)}" ry="${f1(drumB.ry * 1.25)}" fill="#000" opacity=".55"/>`
    t += `<path d="M${f1(lip.cx - lip.rx)} ${f1(lip.cy)}L${f1(top.cx - top.rx)} ${f1(top.cy)}A${f1(top.rx)} ${f1(top.ry)} 0 0 0 ${f1(top.cx + top.rx)} ${f1(top.cy)}L${f1(lip.cx + lip.rx)} ${f1(lip.cy)}A${f1(lip.rx)} ${f1(lip.ry)} 0 0 1 ${f1(lip.cx - lip.rx)} ${f1(lip.cy)}Z" fill="url(#table-lip)"/>`
    t += `<ellipse class="table-topface" cx="${f1(top.cx)}" cy="${f1(top.cy)}" rx="${f1(top.rx)}" ry="${f1(top.ry)}" fill="url(#table-top)" stroke="#c29a5b" stroke-opacity=".55" stroke-width="1"/>`
    t += `<g clip-path="url(#table-topclip)"><ellipse class="table-top-sheen" cx="${f1(top.cx)}" cy="${f1(top.cy)}" rx="${f1(top.rx)}" ry="${f1(top.ry)}" fill="url(#table-sheen)"/></g>`
    t += `<ellipse cx="${f1(inl.cx)}" cy="${f1(inl.cy)}" rx="${f1(inl.rx)}" ry="${f1(inl.ry)}" fill="none" stroke="#c29a5b" stroke-opacity=".38" stroke-width=".8"/>`
    t += `<ellipse cx="${f1(inl2.cx)}" cy="${f1(inl2.cy)}" rx="${f1(inl2.rx)}" ry="${f1(inl2.ry)}" fill="none" stroke="#c29a5b" stroke-opacity=".22" stroke-width=".6" stroke-dasharray="1 4"/>`
    for (let i = 0; i < NS; i++) {
      const a = ringPt(i, G.inlay - 0.035, G.top), b = ringPt(i, G.rim - 0.02, G.top)
      t += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="#c29a5b" stroke-opacity=".3" stroke-width=".6"/>`
    }
    t += `<ellipse cx="${f1(cen.cx)}" cy="${f1(cen.cy)}" rx="${f1(cen.rx)}" ry="${f1(cen.ry)}" fill="none" stroke="#c29a5b" stroke-opacity=".6" stroke-width="1"/>`
    t += `<ellipse class="table-core" cx="${f1(cen2.cx)}" cy="${f1(cen2.cy)}" rx="${f1(cen2.rx)}" ry="${f1(cen2.ry)}"/>`
    gTable.innerHTML = t
    // 桌面镶嵌的环：相邻两席都有人时，这一段亮起
    gRing = sv('g', { class: 'table-ring' })
    for (let i = 0; i < NS; i++) {
      const a0 = seatAng(i), a1 = seatAng(i + 1)
      gRing.appendChild(sv('path', { d: ellipsePath(G.inlay, G.top, a0, a1, 12), 'data-i': i }))
    }
    gTable.appendChild(gRing)
    sheen = svg.querySelector('#table-sheen')
    floorSheen = svg.querySelector('#table-fsheen')
    threadSvg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  }

  /* =====================================================================
     席位（HTML，叠在 SVG 之上）
     ===================================================================== */
  function placeSeats() {
    for (let i = 0; i < NS; i++) {
      const s = seatEls[i]
      const a = seatAng(i)
      const [x, y] = ringPt(i, 1, G.headZ)
      const depth = -Math.cos(a) // 南（近）= 1
      const k = S.mob ? 1 + depth * 0.08 : 1 + depth * 0.1
      s.x = x; s.y = y; s.k = k
      s.size = Math.round(S.d * k)
      s.el.style.left = f1(x) + 'px'
      s.el.style.top = f1(y) + 'px'
      s.el.style.width = s.el.style.height = s.size + 'px'
      s.el.style.marginLeft = s.el.style.marginTop = -s.size / 2 + 'px'
      s.el.style.zIndex = String(10 + Math.round((depth + 1) * 10))
      const [nx, ny] = ringPt(i, G.rim, G.top)
      s.num.style.left = f1(nx) + 'px'
      s.num.style.top = f1(ny) + 'px'
    }
  }

  function placeTray() {
    const cols = S.trayCols, bd = S.bd, gap = S.trayGap
    const total = cols * bd + (cols - 1) * gap
    const x0 = (S.W - total) / 2
    CH.forEach((c, n) => {
      const b = badges[c.id]
      const col = n % cols, row = Math.floor(n / cols)
      const rowGap = S.mob ? gap + 4 : gap
      b.x = x0 + col * (bd + gap) + bd / 2
      b.y = S.trayY + row * (bd + rowGap) + bd / 2
      b.el.style.left = f1(b.x) + 'px'
      b.el.style.top = f1(b.y) + 'px'
      b.el.style.width = b.el.style.height = bd + 'px'
      b.el.style.marginLeft = b.el.style.marginTop = -bd / 2 + 'px'
    })
  }

  function placeUI() {
    const read = stage.querySelector('.table-read')
    read.style.top = S.readY + 'px'
    const ui = stage.querySelector('.table-ui')
    ui.style.top = S.uiY + 'px'
  }

  /* =====================================================================
     头像
     ===================================================================== */
  function headEl(id) {
    if (heads[id]) return heads[id]
    const h = el('div.head')
    h.appendChild(App.portrait(id, { className: 'table-por', eyeRange: 8 }))
    heads[id] = h
    return h
  }
  function cloneHead(id) {
    const b = badges[id]
    const h = el('div.head.is-clone')
    const src = b && b.por
    if (src) {
      const p = src.cloneNode(true)
      p.style.removeProperty('transform')
      h.appendChild(p)
    }
    return h
  }

  /* =====================================================================
     渲染状态
     ===================================================================== */
  function renderSeat(i, fx) {
    const s = seatEls[i]
    const id = S.seats[i]
    s.el.classList.toggle('is-filled', !!id)
    s.el.setAttribute('aria-label', two(i + 1) + (id ? ' ' + App.char(id).name : ''))
    if (id) {
      const h = headEl(id)
      if (h.parentNode !== s.disc) { s.disc.querySelectorAll('.table-head').forEach(n => { if (n !== h) n.remove() }); s.disc.appendChild(h) }
      s.el.style.setProperty('--accent', (App.char(id).art && App.char(id).art.accent) || App.color.blood)
    } else {
      s.disc.querySelectorAll('.table-head').forEach(n => n.remove())
      s.el.style.removeProperty('--accent')
    }
    if (fx === 'drop') {
      App.audio.sfx('drop', { pan: U.clamp((s.x / S.W - 0.5) * 1.6, -1, 1) })
      const flash = s.el.querySelector('.table-flash')
      gsap.fromTo(flash, { opacity: 1, scale: 0.6 }, { opacity: 0, scale: 1.9, duration: 0.8, ease: 'expo.out' })
      gsap.fromTo(s.num, { color: '#fff3d6', textShadow: '0 0 18px rgba(255,220,150,1)' }, { color: '', textShadow: '', duration: 1, ease: 'power2.out', clearProps: 'color,textShadow' })
      if (id && !RM) gsap.fromTo(s.disc, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' })
    }
  }

  function renderAll() {
    for (let i = 0; i < NS; i++) renderSeat(i)
    renderTray()
    renderRing()
    renderCount()
  }

  function renderTray() {
    for (const c of CH) {
      const b = badges[c.id]
      const si = S.seats.indexOf(c.id)
      b.el.classList.toggle('is-seated', si >= 0)
      b.tag.textContent = si >= 0 ? two(si + 1) : ''
      b.el.classList.toggle('is-sel', !!(S.sel && S.sel.kind === 'badge' && S.sel.id === c.id))
    }
    for (let i = 0; i < NS; i++) seatEls[i].el.classList.toggle('is-sel', !!(S.sel && S.sel.kind === 'seat' && S.sel.i === i))
    stage.classList.toggle('is-picking', !!S.sel)
  }

  function renderRing() {
    const paths = gRing.children
    for (let i = 0; i < NS; i++) paths[i].classList.toggle('is-on', !!(S.seats[i] && S.seats[(i + 1) % NS]))
    const n = S.seats.filter(Boolean).length
    const full = n === NS
    stage.classList.toggle('is-full', full)
    if (full && !S.full) {
      S.full = true
      App.audio.sfx('chime', { volume: 0.9 })
      if (!RM) gsap.fromTo(gRing.children, { opacity: 0.2 }, { opacity: 1, duration: 0.25, stagger: 0.05, ease: 'power2.out', clearProps: 'opacity' })
    } else if (!full) S.full = false
  }

  function renderCount() {
    const n = S.seats.filter(Boolean).length
    const txt = two(n) + ' / ' + NS
    if (countEl.textContent !== txt) {
      countEl.textContent = txt
      countBig.textContent = two(n)
      if (!RM) gsap.fromTo(countBig, { opacity: 0.9, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out', clearProps: 'scale' })
    }
    btnClear.disabled = n === 0
  }

  function showName(id) {
    const c = id ? App.char(id) : null
    const key = c ? c.id : ''
    if (readName.dataset.id === key) return
    readName.dataset.id = key
    gsap.killTweensOf([readName, readEpi])
    if (!c) {
      gsap.to([readName, readEpi], { opacity: 0, duration: 0.3 })
      return
    }
    gsap.set([readName, readEpi], { opacity: 1 })
    readName.textContent = c.name
    readEpi.textContent = ''
    App.text.scramble(readEpi, c.epithet, { duration: 0.6 })
    if (!RM) gsap.fromTo(readName, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' })
  }

  /* =====================================================================
     提交
     ===================================================================== */
  function commit() {
    App.state.seats = S.seats.slice()
    App.store.set('seats', App.state.seats)
    App.bus.emit('cast:change', App.state.seats)
    renderTray()
    renderRing()
    renderCount()
  }

  function setSel(sel) {
    S.sel = sel
    renderTray()
    if (sel && sel.kind === 'badge') showName(sel.id)
    else if (sel && sel.kind === 'seat') showName(S.seats[sel.i])
    else showName(S.hover)
  }

  // 把 id 放进第 j 席。返回被挤下来的人（回徽章区）
  function place(id, j, fromSeat) {
    const prev = S.seats.indexOf(id)
    const other = S.seats[j]
    if (prev === j) return
    if (prev >= 0) S.seats[prev] = null
    S.seats[j] = id
    if (other && other !== id) {
      if (prev >= 0) { S.seats[prev] = other; renderSeat(prev, 'drop') } // 互换
      else returnToTray(other, j)
    }
    if (prev >= 0 && !S.seats[prev]) renderSeat(prev)
    renderSeat(j, 'drop')
    commit()
  }

  function unseat(i, animate) {
    const id = S.seats[i]
    if (!id) return
    S.seats[i] = null
    if (animate) returnToTray(id, i)
    renderSeat(i)
    commit()
  }

  // 被挤下 / 离席：头像从席位飞回徽章区
  function returnToTray(id, i) {
    const s = seatEls[i], b = badges[id]
    if (!s || !b || RM) return
    const fly = cloneHead(id)
    fly.classList.add('table-fly')
    const sz = s.size
    fly.style.width = fly.style.height = sz + 'px'
    stage.appendChild(fly)
    gsap.set(fly, { x: s.x - sz / 2, y: s.y - sz / 2 })
    gsap.to(fly, {
      x: b.x - sz / 2, y: b.y - sz / 2, scale: S.bd / sz, duration: 0.7, ease: 'power3.inOut',
      onComplete: () => { fly.remove(); gsap.fromTo(b.el, { scale: 1.25 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'scale' }) },
    })
    App.audio.sfx('whoosh', { volume: 0.5, pan: U.clamp((s.x / S.W - 0.5) * 1.6, -1, 1) })
  }

  /* =====================================================================
     点选（手机，也适用于桌面）
     ===================================================================== */
  function clickBadge(id) {
    if (S.busy || performance.now() - S.justDragged < 260) return
    if (S.sel && S.sel.kind === 'badge' && S.sel.id === id) { setSel(null); return }
    App.audio.sfx('card', { volume: 0.6 })
    setSel({ kind: 'badge', id })
    const b = badges[id]
    if (!RM) gsap.fromTo(b.disc, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
  }

  function clickSeat(i) {
    if (S.busy || performance.now() - S.justDragged < 260) return
    const sel = S.sel
    if (sel && sel.kind === 'badge') {
      setSel(null)
      place(sel.id, i)
      return
    }
    if (sel && sel.kind === 'seat') {
      setSel(null)
      if (sel.i === i) return
      const id = S.seats[sel.i]
      if (id) place(id, i)
      return
    }
    if (S.seats[i]) {
      App.audio.sfx('tick')
      setSel({ kind: 'seat', i })
    } else {
      // 空席：号牌跳一下
      const s = seatEls[i]
      App.audio.sfx('tick', { volume: 0.6, pitch: 0.7 })
      if (!RM) gsap.fromTo(s.num, { y: -6 }, { y: 0, duration: 0.5, ease: 'bounce.out', clearProps: 'y' })
      pulseTray()
    }
  }

  function pulseTray() {
    if (RM) return
    const list = CH.filter(c => S.seats.indexOf(c.id) < 0).map(c => badges[c.id].disc)
    gsap.fromTo(list, { boxShadow: '0 0 0 1px rgba(194,154,91,.9), 0 0 16px rgba(194,154,91,.6)' }, { boxShadow: '0 0 0 1px rgba(194,154,91,0), 0 0 0 rgba(194,154,91,0)', duration: 0.9, stagger: { each: 0.012, from: 'center' }, clearProps: 'boxShadow' })
  }

  /* =====================================================================
     拖动：Draggable + InertiaPlugin；红线连回原处
     ===================================================================== */
  function stageXY(cx, cy) {
    const r = stage.getBoundingClientRect()
    return [cx - r.left, cy - r.top]
  }

  function onPress(e, src) {
    if (S.busy || !window.Draggable) return
    if (e.pointerType === 'touch' || !App.finePointer || e.button !== 0) return
    const x0 = e.clientX, y0 = e.clientY
    const move = ev => {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) { off(); beginDrag(ev, src) }
    }
    const off = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', off) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', off)
  }

  function snapPoints(gd) {
    return seatEls.map(s => ({ x: s.x - gd / 2, y: s.y - gd / 2 }))
  }

  function beginDrag(ev, src) {
    const id = src.id
    const gd = Math.round(S.d * 1.06)
    const o = src.kind === 'seat' ? { x: seatEls[src.i].x, y: seatEls[src.i].y } : { x: badges[id].x, y: badges[id].y }
    setSel(null)
    const ghost = el('div.ghost')
    ghost.style.width = ghost.style.height = gd + 'px'
    ghost.style.setProperty('--accent', (App.char(id).art && App.char(id).art.accent) || App.color.blood)
    const disc = el('div.ghost-disc')
    ghost.appendChild(disc)
    disc.appendChild(headEl(id)) // 席位上的头像被拎起来
    stage.appendChild(ghost)
    const [px, py] = stageXY(ev.clientX, ev.clientY)
    gsap.set(ghost, { x: px - gd / 2, y: py - gd / 2 })
    if (!RM) gsap.fromTo(disc, { scale: S.bd / gd }, { scale: 1, duration: 0.35, ease: 'back.out(2)' })
    if (src.kind === 'seat') { seatEls[src.i].el.classList.add('is-lifted'); seatEls[src.i].el.classList.remove('is-filled') }
    else badges[id].el.classList.add('is-dragging')
    stage.classList.add('is-dragging')
    App.audio.sfx('whoosh', { volume: 0.45 })
    showName(id)
    S.drag = { src, id, o, ghost, gd, snap: -1, done: false }
    threadSvg.classList.add('is-on')
    gsap.set(threadPin, { attr: { cx: o.x, cy: o.y } })
    const R = Math.max(40, S.d * 0.95)
    const pts = snapPoints(gd)
    const self = Draggable.create(ghost, {
      type: 'x,y',
      inertia: !!window.InertiaPlugin,
      bounds: { minX: -gd / 2, minY: -gd / 2, maxX: S.W - gd / 2, maxY: S.H - gd / 2 },
      liveSnap: { points: pts, radius: R },
      snap: { points: pts, radius: R * 1.3 },
      edgeResistance: 0.8,
      throwResistance: 2400,
      maxDuration: 0.6,
      onDrag: dragUpdate,
      onThrowUpdate: dragUpdate,
      onRelease() { gsap.delayedCall(0.02, () => { if (!d.isThrowing) finishDrag() }) },
      onThrowComplete: finishDrag,
    })[0]
    const d = self
    S.drag.d = d
    d.startDrag(ev)
    dragUpdate()
  }

  function dragUpdate() {
    const D = S.drag
    if (!D) return
    const gx = gsap.getProperty(D.ghost, 'x') + D.gd / 2
    const gy = gsap.getProperty(D.ghost, 'y') + D.gd / 2
    let snap = -1
    for (let i = 0; i < NS; i++) if (Math.hypot(seatEls[i].x - gx, seatEls[i].y - gy) < 3) snap = i
    if (snap !== D.snap) {
      if (D.snap >= 0) seatEls[D.snap].el.classList.remove('is-snap')
      if (snap >= 0) {
        seatEls[snap].el.classList.add('is-snap')
        App.audio.sfx('tick', { volume: 0.5, pitch: 1.2, pan: U.clamp((gx / S.W - 0.5) * 1.6, -1, 1) })
      }
      D.snap = snap
      D.ghost.classList.toggle('is-snapped', snap >= 0)
    }
    // 红线：两端之间下垂
    const ox = D.o.x, oy = D.o.y
    const len = Math.hypot(gx - ox, gy - oy)
    const sag = Math.min(90, len * 0.22)
    const mx = (ox + gx) / 2, my = (oy + gy) / 2 + sag
    threadPath.setAttribute('d', `M${f1(ox)} ${f1(oy)}Q${f1(mx)} ${f1(my)} ${f1(gx)} ${f1(gy)}`)
  }

  function finishDrag() {
    const D = S.drag
    if (!D || D.done) return
    D.done = true
    S.justDragged = performance.now()
    const gx = gsap.getProperty(D.ghost, 'x') + D.gd / 2
    const gy = gsap.getProperty(D.ghost, 'y') + D.gd / 2
    let j = -1, best = Math.max(36, S.d * 0.75)
    for (let i = 0; i < NS; i++) { const dd = Math.hypot(seatEls[i].x - gx, seatEls[i].y - gy); if (dd < best) { best = dd; j = i } }
    if (D.snap >= 0) seatEls[D.snap].el.classList.remove('is-snap')
    stage.classList.remove('is-dragging')
    if (D.src.kind === 'seat') seatEls[D.src.i].el.classList.remove('is-lifted')
    else badges[D.id].el.classList.remove('is-dragging')
    try { D.d.kill() } catch (e) { /* */ }
    const end = () => { D.ghost.remove(); S.drag = null; showName(S.hover) }
    if (j >= 0) {
      // 落座
      const s = seatEls[j]
      gsap.to(D.ghost, {
        x: s.x - D.gd / 2, y: s.y - D.gd / 2, duration: 0.18, ease: 'power2.out',
        onComplete: () => {
          retractThread(s.x, s.y, true)
          end()
          if (D.src.kind === 'seat') {
            const from = D.src.i
            if (from === j) { renderSeat(j, 'drop'); return }
            const other = S.seats[j]
            S.seats[j] = D.id
            S.seats[from] = other || null
            renderSeat(from, other ? 'drop' : null)
            renderSeat(j, 'drop')
            commit()
          } else place(D.id, j)
        },
      })
    } else {
      // 没落到席位上：红线把它拽回原处（从席位拖出 = 离席）
      if (D.src.kind === 'seat') {
        const from = D.src.i
        S.seats[from] = null
        renderSeat(from)
        commit()
        const b = badges[D.id]
        retractThread(b.x, b.y, false)
        gsap.to(D.ghost, { x: b.x - D.gd / 2, y: b.y - D.gd / 2, scale: S.bd / D.gd, duration: 0.6, ease: 'power3.inOut', onUpdate: () => followThread(D), onComplete: end })
        App.audio.sfx('whoosh', { volume: 0.6 })
      } else {
        gsap.to(D.ghost, {
          x: D.o.x - D.gd / 2, y: D.o.y - D.gd / 2, scale: S.bd / D.gd, duration: 0.5, ease: 'back.in(1.2)', onUpdate: () => followThread(D),
          onComplete: () => {
            threadSvg.classList.remove('is-on')
            end()
            const p = S.seats.indexOf(D.id)
            if (p >= 0) renderSeat(p) // 拎起的是已经入座的人：头像放回原席
          },
        })
        App.audio.sfx('whoosh', { volume: 0.4, pitch: 0.8 })
      }
    }
  }

  function followThread(D) {
    const gx = gsap.getProperty(D.ghost, 'x') + D.gd / 2
    const gy = gsap.getProperty(D.ghost, 'y') + D.gd / 2
    const ox = D.o.x, oy = D.o.y
    const len = Math.hypot(gx - ox, gy - oy)
    const mx = (ox + gx) / 2, my = (oy + gy) / 2 + Math.min(90, len * 0.22)
    threadPath.setAttribute('d', `M${f1(ox)} ${f1(oy)}Q${f1(mx)} ${f1(my)} ${f1(gx)} ${f1(gy)}`)
  }

  // 红线收回：落座时线从原处被扯断、缩向席位
  function retractThread(x, y, landed) {
    const len = threadPath.getTotalLength ? threadPath.getTotalLength() : 0
    gsap.killTweensOf(threadPath)
    if (!len || RM) { threadSvg.classList.remove('is-on'); return }
    gsap.set(threadPath, { strokeDasharray: len, strokeDashoffset: 0 })
    gsap.to(threadPath, {
      strokeDashoffset: landed ? len : -len, duration: landed ? 0.45 : 0.6, ease: 'power2.in',
      onComplete: () => { threadSvg.classList.remove('is-on'); gsap.set(threadPath, { clearProps: 'strokeDasharray,strokeDashoffset' }) },
    })
  }

  /* =====================================================================
     随机：老虎机
     ===================================================================== */
  function randomize() {
    if (S.busy) return
    setSel(null)
    const filled = S.seats.filter(Boolean).length
    const targets = filled > 0 && filled < NS ? S.seats.map((v, i) => (v ? -1 : i)).filter(i => i >= 0) : Array.from({ length: NS }, (_, i) => i)
    const keep = new Set(S.seats.filter((v, i) => v && targets.indexOf(i) < 0))
    const pool = U.shuffle(CH.map(c => c.id).filter(id => !keep.has(id)))
    const final = {}
    targets.forEach((i, k) => { final[i] = pool[k] })
    S.busy = true
    stage.classList.add('is-spinning')
    for (const i of targets) S.seats[i] = null
    for (const i of targets) renderSeat(i)
    renderTray()
    App.audio.sfx('whoosh', { volume: 0.6 })
    App.audio.setMood({ tension: 0.45 })
    const start = performance.now()
    const step = RM ? 140 : 66
    const stops = {}
    targets.forEach((i, k) => { stops[i] = start + (RM ? 300 : 650) + k * (RM ? 60 : 125) })
    const ids = CH.map(c => c.id)
    let n = 0
    const timer = setInterval(() => {
      const now = performance.now()
      let live = 0
      n++
      for (const i of targets) {
        const s = seatEls[i]
        if (s.stopped) continue
        if (now >= stops[i]) {
          s.stopped = true
          s.disc.querySelectorAll('.table-head').forEach(h => h.remove())
          S.seats[i] = final[i]
          renderSeat(i, 'drop')
          s.el.classList.remove('is-reel')
          continue
        }
        live++
        s.el.classList.add('is-reel')
        const h = cloneHead(U.pick(ids))
        s.disc.querySelectorAll('.table-head').forEach(x => x.remove())
        s.disc.appendChild(h)
        if (!RM) gsap.fromTo(h, { yPercent: -55 }, { yPercent: 0, duration: step / 1000, ease: 'none' })
      }
      if (live && n % 2 === 0) App.audio.sfx('tick', { volume: 0.4, pitch: 0.9 + Math.random() * 0.3 })
      if (!live) {
        clearInterval(timer)
        for (const i of targets) seatEls[i].stopped = false
        S.busy = false
        stage.classList.remove('is-spinning')
        commit()
        App.audio.setMood({ tension: 0.15 })
      }
    }, step)
  }

  function clearAll() {
    if (S.busy) return
    setSel(null)
    const list = []
    for (let i = NS - 1; i >= 0; i--) if (S.seats[i]) list.push(i)
    if (!list.length) return
    S.busy = true
    App.audio.sfx('whoosh', { volume: 0.7, pitch: 0.7 })
    list.forEach((i, k) => {
      gsap.delayedCall(RM ? 0 : k * 0.05, () => {
        const s = seatEls[i]
        const id = S.seats[i]
        const h = id && heads[id]
        const done = () => {
          S.seats[i] = null
          renderSeat(i)
          if (h) gsap.set(h, { clearProps: 'all' })
          if (k === list.length - 1) { S.busy = false; commit() }
        }
        if (h && !RM) gsap.to(h, { scale: 0, rotation: -40, opacity: 0, duration: 0.32, ease: 'back.in(2)', onComplete: done })
        else done()
        App.audio.sfx('tick', { volume: 0.35, pitch: 0.6 + k * 0.03, pan: U.clamp((s.x / S.W - 0.5) * 1.6, -1, 1) })
      })
    })
  }

  /* =====================================================================
     建 DOM
     ===================================================================== */
  function build(node) {
    sec = node
    sec.classList.add('table')
    stage = el('div.stage')
    svg = sv('svg', { class: 'table-svg', 'aria-hidden': 'true' })
    stage.appendChild(svg)

    // 标题
    const title = el('h2.title', { text: '十五席' })
    title.classList.add('t-display')
    const head = el('div.head-l', null, [
      title,
      el('p.sub', { text: '醒来时，各坐各席' }),
      el('div.latin', { text: 'XV · FIFTEEN SEATS' }),
    ])
    countBig = el('div.bignum', { text: '00', 'aria-hidden': 'true' })
    stage.append(countBig, head)

    // 席位
    for (let i = 0; i < NS; i++) {
      const elx = el('div.seat', { role: 'button', tabindex: '0', 'data-cursor': '', 'data-i': i })
      const flash = el('i.flash')
      const ring = el('i.rim')
      const disc = el('div.disc')
      const x = el('button.x', { type: 'button', 'aria-label': '离席', 'data-cursor': '离席', 'data-cursor-tone': 'blood' })
      elx.append(flash, ring, disc, x)
      const num = el('span.num', { text: String(i + 1), 'aria-hidden': 'true' })
      stage.append(num, elx)
      const s = { el: elx, disc, num, x, i, lift: 0, near: 0 }
      seatEls.push(s)
      elx.addEventListener('click', e => { if (e.target.closest('.table-x')) return; clickSeat(i) })
      elx.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickSeat(i) } })
      elx.addEventListener('pointerdown', e => { if (S.seats[i] && !e.target.closest('.table-x')) onPress(e, { kind: 'seat', i, id: S.seats[i] }) })
      elx.addEventListener('pointerenter', () => { S.hover = S.seats[i] || null; if (!S.drag && !S.sel) showName(S.hover) })
      elx.addEventListener('pointerleave', () => { S.hover = null; if (!S.drag && !S.sel) showName(null) })
      x.addEventListener('click', e => { e.stopPropagation(); setSel(null); App.audio.sfx('whoosh', { volume: 0.6 }); unseat(i, true) })
    }

    // 徽章区
    trayEl = el('div.tray')
    for (const c of CH) {
      const b = el('button.badge', { type: 'button', 'aria-label': c.name, 'data-cursor': '', 'data-id': c.id })
      const disc = el('span.disc')
      const por = App.portrait(c.id, { className: 'table-por' })
      const h = el('span.head')
      h.appendChild(por)
      disc.appendChild(h)
      const tag = el('span.tag', { 'aria-hidden': 'true' })
      b.append(disc, tag)
      b.style.setProperty('--accent', (c.art && c.art.accent) || App.color.blood)
      trayEl.appendChild(b)
      badges[c.id] = { el: b, disc, por, tag, x: 0, y: 0, k: 1 }
      b.addEventListener('click', () => clickBadge(c.id))
      b.addEventListener('pointerdown', e => onPress(e, { kind: 'badge', id: c.id }))
      b.addEventListener('pointerenter', () => { S.hover = c.id; if (!S.drag && !S.sel) showName(c.id) })
      b.addEventListener('pointerleave', () => { S.hover = null; if (!S.drag && !S.sel) showName(null) })
    }
    stage.appendChild(trayEl)

    // 名字读出、计数、按钮
    readName = el('div.read-name')
    readEpi = el('div.read-epi')
    const read = el('div.read', { 'aria-live': 'polite' }, [readName, readEpi])
    countEl = el('span.count', { text: '00 / 15' })
    btnRand = el('button.btn', { type: 'button', 'data-cursor': '' }, [el('i.btn-ic', { html: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h3.5c3 0 4 8 7 8H17M14.5 11.5 17 14l-2.5 2.5M3 14h3.5c1.3 0 2.2-1.5 3-3M12 7.6C12.7 6.6 13.4 6 14.5 6H17M14.5 3.5 17 6l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>' }), el('span', { text: '随机' })])
    btnClear = el('button.btn', { type: 'button', 'data-cursor': '' }, [el('i.btn-ic', { html: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 14.5l9-9" stroke="currentColor" stroke-width="1.2"/></svg>' }), el('span', { text: '清空' })])
    btnRand.addEventListener('click', randomize)
    btnClear.addEventListener('click', clearAll)
    const ui = el('div.ui', null, [countEl, el('span.ui-gap'), btnRand, btnClear])
    stage.append(read, ui)

    // 红线
    threadSvg = sv('svg', { class: 'table-thread', 'aria-hidden': 'true' })
    threadPath = sv('path', { class: 'table-thread-path' })
    threadPin = sv('circle', { class: 'table-thread-pin', r: 3.5 })
    threadSvg.append(threadPath, threadPin)
    stage.appendChild(threadSvg)

    // 点空白处取消选择
    stage.addEventListener('click', e => {
      if (e.target.closest('.table-seat, .table-badge, .table-btn')) return
      if (S.sel) setSel(null)
    })
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sel) setSel(null) })

    sec.appendChild(stage)
    S.built = true
  }

  /* =====================================================================
     帧循环：光标 → 席位抬起、号牌发亮、桌面反光、徽章放大
     ===================================================================== */
  function frame(t, dt) {
    if (!S.visible || !S.built) return
    const m = App.mouse
    const r = stage.getBoundingClientRect()
    const fine = App.finePointer && m.active
    const mx = fine ? m.sx - r.left : -1e4
    const my = fine ? m.sy - r.top : -1e4
    // 桌面与地盘的反光
    if (sheen) {
      const tx = fine ? mx : S.cx + Math.sin(t * 0.3) * S.Rx * 0.4
      const ty = fine ? my : S.cy + Math.cos(t * 0.21) * S.Ry * 0.4
      S.mx = approach(S.mx < -1e3 ? tx : S.mx, tx, 0.12, dt)
      S.my = approach(S.my < -1e3 ? ty : S.my, ty, 0.12, dt)
      const sx = U.clamp(S.mx, S.cx - S.Rx * 1.2, S.cx + S.Rx * 1.2)
      const sy = U.clamp(S.my, S.cy - S.Ry * 2.4, S.cy + S.Ry * 2.4)
      sheen.setAttribute('cx', f1(sx)); sheen.setAttribute('cy', f1(sy))
      floorSheen.setAttribute('cx', f1(sx)); floorSheen.setAttribute('cy', f1(sy + S.Ry * 0.2))
    }
    // 席位
    const dragging = !!S.drag
    for (let i = 0; i < NS; i++) {
      const s = seatEls[i]
      const d = Math.hypot(mx - s.x, (my - s.y) * 1.3)
      const near = fine ? smooth(S.d * 2.6, S.d * 0.4, d) : 0
      s.near = approach(s.near, near, 0.18, dt)
      if (Math.abs(s.near - (s.nw || 0)) > 0.004) {
        s.nw = s.near
        s.el.style.setProperty('--near', s.near.toFixed(3))
        s.num.style.setProperty('--near', s.near.toFixed(3))
      }
    }
    // 徽章：船坞式放大
    if (!S.mob) {
      const inTray = fine && my > S.trayY - S.bd * 1.2 && my < S.trayY + S.bd * 3.4
      for (const c of CH) {
        const b = badges[c.id]
        let k = 1
        if (inTray && !dragging) {
          const dx = mx - b.x, dy = (my - b.y) * 1.6
          const g = Math.exp(-(dx * dx + dy * dy) / (2 * 62 * 62))
          k = 1 + g * 0.32
        }
        b.k = approach(b.k, k, 0.2, dt)
        if (Math.abs(b.k - (b.kw || 1)) > 0.002) { b.kw = b.k; b.el.style.setProperty('--k', b.k.toFixed(3)) }
      }
    }
  }

  /* =====================================================================
     与卡池档案联动
     ===================================================================== */
  function onSeatReq(p) {
    const id = p && p.id
    if (!id || !App.char(id) || S.seats.indexOf(id) >= 0 || S.busy) return
    const j = S.seats.indexOf(null)
    if (j < 0) return
    S.seats[j] = id
    renderSeat(j, S.visible ? 'drop' : null)
    commit()
  }
  function onUnseatReq(p) {
    const id = p && p.id
    const i = S.seats.indexOf(id)
    if (i < 0 || S.busy) return
    S.seats[i] = null
    renderSeat(i)
    commit()
  }

  /* =====================================================================
     注册
     ===================================================================== */
  App.section('table', {
    palette: PAL,
    track: 'gallery',
    mount(node) {
      loadSeats()
      build(node)
      layout()
      renderAll()
      App.onVisible(stage, v => { S.visible = v; sec.classList.toggle('is-paused', !v) }, { rootMargin: '0px' })
      App.tick(frame)
      App.bus.on('cast:seat', onSeatReq)
      App.bus.on('cast:unseat', onUnseatReq)
      // 入场
      const title = stage.querySelector('.table-title')
      App.text.reveal(title, { scroll: { trigger: sec, start: 'top 72%' }, stagger: 0.14, y: 40, duration: 1.3 })
      gsap.fromTo(stage.querySelectorAll('.table-sub, .table-latin'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: sec, start: 'top 60%', toggleActions: 'play none none reverse' } })
      if (!RM) {
        gsap.fromTo(seatEls.map(s => s.el), { opacity: 0, scale: 0.4 }, {
          opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)', stagger: 0.05, clearProps: 'opacity,scale',
          scrollTrigger: { trigger: sec, start: 'top 55%', toggleActions: 'play none none none' },
        })
        gsap.fromTo(seatEls.map(s => s.num), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.05, clearProps: 'opacity', scrollTrigger: { trigger: sec, start: 'top 55%', toggleActions: 'play none none none' } })
        gsap.fromTo(trayEl.children, { opacity: 0, y: 20 }, {
          opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: { each: 0.015, from: 'center' }, clearProps: 'opacity,y',
          scrollTrigger: { trigger: sec, start: 'top 40%', toggleActions: 'play none none none' },
        })
      }
      let rw = 0, lastW = window.innerWidth
      window.addEventListener('resize', () => {
        clearTimeout(rw)
        rw = setTimeout(() => {
          if (Math.abs(window.innerWidth - lastW) < 2 && S.mob) return
          lastW = window.innerWidth
          layout()
          renderAll()
          ScrollTrigger.refresh()
        }, 200)
      })
    },
  })
})()
