/* ==========================================================
   铜牌 · plaque —— 价目铜牌与 150 枚金币
   · 铜牌：穹顶议事厅东墙南段（洋馆物理层 §6.2）。深烟褐的青铜牌面，凹刻文字嵌铂金，
     古沉香窄框、羊脂白玉细边，框面突出墙面 5 cm。刻的就是《价目表》「兑换方式」与
     第 1 到第 6 节的原文（WORLD.prices.how / chapters；章名「1. 食物」由 build-data 写成「一、食物」），
     分三栏，「六、离场」独占最底一条。第 10 节牌外价目（WORLD.prices.offPlaque）与「不成立」的兑换
     （WORLD.prices.void）不刻在牌上。
     光标是一束掠射的光：牌面高光、拉丝反光、框的投影与每一行刻字的阴阳边随光源方位实时变化。
   · 理币盘：收纳台白玉台面上的白玉理币盘，十五摞 × 十枚，整列居中（Canvas 2D 简易透视）。
     点一摞取一枚，金币带着拖影飞进右下角「你的钱袋」。
   · 兑换：悬停条目 = 报价（需要几枚），点击 = 同意。一枚一百分，按整枚付，不找零。
     金币从钱袋飞向条目、熔进铜牌，条目一亮，物品名从光标处的墨里浮出（东西出现在身边）。
     手机：第一下报价，第二下同意。
   · 退出券：悬停时浮现一扇由 500 个空位排成的门，只有馆里现存的金币能填进去。
     点它：铜牌深处一声闷响，整块铜牌轻震，那一条的血粉光熄灭片刻。
   App.state.coins = 钱袋里的枚数；trial:coins（模拟庭审赢得的金币）在进入本板块时落进钱袋。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  if (!App || !window.gsap) return
  const U = App.util
  const PR = (window.WORLD && window.WORLD.prices) || { how: [], chapters: [] }
  const TAU = Math.PI * 2
  const clamp = U.clamp

  /* =====================================================================
     数据
     ===================================================================== */
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const coinsFor = pts => Math.max(1, Math.ceil(pts / 100)) // 按整枚付，不找零
  const CHS = (PR.chapters || []).map(ch => ({
    title: ch.title || '',
    exit: /离场/.test(ch.title || ''),
    items: (ch.items || []).map(it => (it.sub ? { sub: it.sub } : { name: it.item, pts: +it.points || 0, coins: coinsFor(+it.points || 0) })),
  }))
  const EXIT_CH = CHS.find(c => c.exit) || { title: '六、离场', exit: true, items: [{ name: '退出券一张', pts: 50000, coins: 500 }] }
  const EXIT = EXIT_CH.items.find(i => i.name) || { name: '退出券一张', pts: 50000, coins: 500 }
  const BODY = CHS.filter(c => !c.exit)
  const HOW = PR.how || []
  const NST = 15 // 十五摞
  const PER = 10 // 每摞十枚

  /* =====================================================================
     状态
     ===================================================================== */
  const S = {
    E: {}, el: null, visible: false,
    coins: 0, // 钱袋里的真实枚数（= App.state.coins）
    shown: 0, // 钱袋上显示的数（动画中可能落后于真实值）
    spent: 0, // 已熔进铜牌的枚数
    rain: 0, // 庭审赢得、尚未落进钱袋的枚数
    stacks: new Array(NST).fill(PER),
    eng: [], // 刻字：光照变量的载体
    quoted: null, quoteT: 0,
    hov: -1,
    ptr: 'mouse', touchT: 0, tap: null, tapT: 0, moveT: 0,
    titleBoost: 0,
    lastSweep: 0,
    doorT: 0,
    q: 2, live: undefined, on: undefined, rv: {}, // 画质、刻字阴阳边是否随光（影子副本）、板块是否真在视口里
    reduced: !!App.reduced,
    fine: !!App.finePointer,
  }
  const L = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.42, f: 1 }
  const trayLeft = () => S.stacks.reduce((a, b) => a + b, 0)

  function setCoins(n) {
    S.coins = Math.max(0, Math.round(n))
    App.state.coins = S.coins
    App.bus.emit('coins:change', S.coins)
  }

  /* =====================================================================
     颜色坡道（Canvas 用）
     ===================================================================== */
  const GOLD = [[0, [24, 14, 4]], [0.22, [80, 50, 14]], [0.45, [152, 105, 34]], [0.7, [214, 164, 70]], [0.95, [247, 210, 124]], [1.25, [255, 239, 192]], [1.7, [255, 253, 244]]]
  const SILVER = [[0, [26, 26, 30]], [0.3, [90, 92, 98]], [0.6, [162, 166, 172]], [0.95, [220, 224, 230]], [1.3, [251, 252, 253]]]
  // 羊脂白玉：暗处是温润的灰褐，不是死黑；亮处是奶白
  const JADE = [[0, [20, 16, 12]], [0.18, [64, 55, 42]], [0.42, [142, 129, 104]], [0.68, [210, 197, 168]], [0.92, [238, 230, 207]], [1.2, [252, 248, 236]]]
  const PLAT = [[0, [40, 40, 42]], [0.4, [122, 122, 126]], [0.8, [202, 204, 208]], [1.2, [252, 252, 253]]]
  const WOOD = [[0, [6, 4, 3]], [0.3, [26, 16, 10]], [0.7, [64, 40, 24]], [1.1, [120, 82, 52]]]
  function ramp(R, t) {
    if (!(t > R[0][0])) return R[0][1]
    for (let i = 1; i < R.length; i++) {
      if (t <= R[i][0]) {
        const a = R[i - 1], b = R[i], k = (t - a[0]) / (b[0] - a[0])
        return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k]
      }
    }
    return R[R.length - 1][1]
  }
  const rgba = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : +a.toFixed(3)) + ')'
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
  const easeIO = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  const easeOut = t => 1 - Math.pow(1 - t, 3)
  const bounce = t => {
    const n = 7.5625, d = 2.75
    if (t < 1 / d) return n * t * t
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
    return n * (t -= 2.625 / d) * t + 0.984375
  }

  /* =====================================================================
     纹理：运行时生成（拉丝青铜、拉丝遮罩、石墙），不加载任何图片
     ===================================================================== */
  function toURL(cv, cb, asBlob) {
    try {
      if (asBlob && cv.toBlob && window.URL && URL.createObjectURL) {
        cv.toBlob(b => { try { cb(b ? URL.createObjectURL(b) : cv.toDataURL('image/png')) } catch (e) { /* 忽略 */ } }, 'image/png')
      } else cb(cv.toDataURL('image/png'))
    } catch (e) { /* 忽略：没有纹理也能看 */ }
  }
  function vnoise(size, cells, rnd) {
    const grid = new Float32Array(cells * cells)
    for (let i = 0; i < grid.length; i++) grid[i] = rnd()
    const out = new Float32Array(size * size), sc = cells / size
    for (let y = 0; y < size; y++) {
      const gy = y * sc, y0 = gy | 0, fy = gy - y0, ty = fy * fy * (3 - 2 * fy)
      const r0 = (y0 % cells) * cells, r1 = ((y0 + 1) % cells) * cells
      for (let x = 0; x < size; x++) {
        const gx = x * sc, x0 = gx | 0, fx = gx - x0, tx = fx * fx * (3 - 2 * fx)
        const c0 = x0 % cells, c1 = (x0 + 1) % cells
        const a = grid[r0 + c0], b = grid[r0 + c1], c = grid[r1 + c0], e = grid[r1 + c1]
        const top = a + (b - a) * tx, bot = c + (e - c) * tx
        out[y * size + x] = top + (bot - top) * ty
      }
    }
    return out
  }
  function genTextures(root) {
    const rnd = U.seeded(1505)
    // —— 拉丝青铜 512×512：横向拉丝，深烟褐 ——
    setTimeout(() => {
      try {
        const N = 512
        const cv = document.createElement('canvas'); cv.width = cv.height = N
        const g = cv.getContext('2d')
        const img = g.createImageData(N, N), d = img.data
        const row = new Float32Array(N)
        for (let y = 0; y < N; y++) row[y] = (rnd() + rnd() + rnd() - 1.5) * 0.17
        const v = new Float32Array(N * N)
        for (let k = 0; k < 1700; k++) {
          const y = (rnd() * N) | 0, x0 = (rnd() * N) | 0, len = 20 + ((rnd() * 380) | 0), amp = (rnd() - 0.5) * 0.4
          const base = y * N
          for (let i = 0; i < len; i++) v[base + ((x0 + i) % N)] += amp * Math.sin((Math.PI * i) / len)
        }
        const low = vnoise(N, 4, rnd)
        for (let y = 0; y < N; y++) {
          const rb = row[y] * 0.6 + (row[(y + 1) % N] + row[(y + N - 1) % N]) * 0.2
          for (let x = 0; x < N; x++) {
            const i = y * N + x, o = i * 4
            const t = rb + v[i] + (rnd() - 0.5) * 0.1 + (low[i] - 0.5) * 0.26
            d[o] = 63 * (1 + t * 0.55); d[o + 1] = 46 * (1 + t * 0.55); d[o + 2] = 31 * (1 + t * 0.5); d[o + 3] = 255
          }
        }
        g.putImageData(img, 0, 0)
        toURL(cv, u => root.style.setProperty('--pq-bronze', 'url("' + u + '")'), true)
      } catch (e) { /* 忽略 */ }
    }, 30)
    // —— 拉丝遮罩 256×64（alpha 通道），显示为 512×128 ——
    setTimeout(() => {
      try {
        const W = 256, H = 64
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H
        const g = cv.getContext('2d')
        const img = g.createImageData(W, H), d = img.data
        const v = new Float32Array(W * H)
        for (let y = 0; y < H; y++) { const b = rnd() * 0.5; for (let x = 0; x < W; x++) v[y * W + x] = b }
        for (let k = 0; k < 520; k++) {
          const y = (rnd() * H) | 0, x0 = (rnd() * W) | 0, len = 16 + ((rnd() * 220) | 0), amp = (rnd() - 0.3) * 0.9
          for (let i = 0; i < len; i++) v[y * W + ((x0 + i) % W)] += amp * Math.sin((Math.PI * i) / len)
        }
        for (let i = 0; i < W * H; i++) { const o = i * 4; d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = clamp(0.18 + v[i], 0, 1) * 255 }
        g.putImageData(img, 0, 0)
        toURL(cv, u => root.style.setProperty('--pq-brush', 'url("' + u + '")'), false)
      } catch (e) { /* 忽略 */ }
    }, 60)
    // —— 暗色石墙 512×512：斑驳 + 错缝的石块 ——
    setTimeout(() => {
      try {
        const N = 512
        const cv = document.createElement('canvas'); cv.width = cv.height = N
        const g = cv.getContext('2d')
        const n1 = vnoise(N, 6, rnd), n2 = vnoise(N, 18, rnd), n3 = vnoise(N, 64, rnd), n4 = vnoise(N, 170, rnd)
        const img = g.createImageData(N, N), d = img.data
        for (let i = 0; i < N * N; i++) {
          const t = n1[i] * 0.45 + n2[i] * 0.27 + n3[i] * 0.17 + n4[i] * 0.11 + (rnd() - 0.5) * 0.06
          const o = i * 4
          d[o] = 10 + t * 20; d[o + 1] = 8 + t * 16; d[o + 2] = 7 + t * 13; d[o + 3] = 255
        }
        g.putImageData(img, 0, 0)
        for (let c = 0; c < 4; c++) {
          const y = c * 128
          g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, y, N, 2)
          g.fillStyle = 'rgba(255,226,190,.045)'; g.fillRect(0, y + 2, N, 1)
          for (let j = 0; j < 3; j++) {
            const x = ((c % 2 ? 128 : 0) + j * 256) % N
            g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, 2, 128)
            g.fillStyle = 'rgba(255,226,190,.035)'; g.fillRect(x + 2, y, 1, 128)
          }
        }
        toURL(cv, u => root.style.setProperty('--pq-stone', 'url("' + u + '")'), true)
      } catch (e) { /* 忽略 */ }
    }, 90)
  }

  /* =====================================================================
     DOM
     ===================================================================== */
  // kind：n 普通刻字 / t 标题大字（多一道深影）/ x 离场一条（多一道深影和一圈血粉光）/ s 落款圆章
  function reg(el, k, opts) {
    el.setAttribute('data-pq', S.eng.length)
    S.eng.push(Object.assign({ el, k, kind: 'n', boost: 0, vis: 1, sc: 1, gh: [] }, opts || {}))
    return el
  }

  // 把若干块按顺序分成 n 栏，使最高的一栏尽量矮（章节不拆开）
  function partition(blocks, n) {
    const m = blocks.length
    if (m <= n) return blocks.map(b => [b])
    let best = null, bestMax = Infinity
    const sum = g => g.reduce((a, b) => a + b.h, 0)
    const rec = (start, k, acc) => {
      if (k === n - 1) {
        const groups = acc.concat([blocks.slice(start)])
        const mx = Math.max.apply(null, groups.map(sum))
        if (mx < bestMax) { bestMax = mx; best = groups }
        return
      }
      for (let i = start + 1; i <= m - (n - 1 - k); i++) rec(i, k + 1, acc.concat([blocks.slice(start, i)]))
    }
    rec(0, 0, [])
    return best
  }

  function itemEl(it, exit) {
    const b = U.el('button.plaque-item' + (exit ? '.plaque-exit-item' : '.plaque-reveal'), {
      type: 'button',
      'data-cursor': '',
      'data-cursor-tone': exit ? 'blood' : null,
      'aria-label': it.name + '　' + fmt(it.pts),
    })
    // 中文 keep-all 时只在标点处断行；再在「与/或/含」前补几个可断点，避免把「麻将」之类拆开
    const name = U.el('span.plaque-name.plaque-eng', { text: it.name.replace(/([^，、（])(?=[与或含])/g, '$1\u200b') })
    const lead = U.el('span.plaque-lead', { 'aria-hidden': 'true' })
    const pts = U.el('span.plaque-pts.plaque-eng', { text: fmt(it.pts) })
    b.append(name, lead, pts)
    reg(name, exit ? 1.9 : 1, exit ? { kind: 'x' } : null)
    reg(pts, exit ? 1.9 : 1, exit ? { kind: 'x' } : null)
    b._it = it
    b._pts = pts
    b._eng = S.eng.slice(-2)
    bindItem(b, !!exit)
    return b
  }

  function chapterEl(ch) {
    const box = U.el('div.plaque-blk')
    box.appendChild(reg(U.el('h3.plaque-h.plaque-eng.plaque-reveal', { text: ch.title }), 1.3))
    for (const it of ch.items) {
      if (it.sub) { const sp = U.el('span', { text: it.sub }); reg(sp, 1); box.appendChild(U.el('h4.plaque-sub.plaque-eng.plaque-reveal', {}, [sp])) }
      else box.appendChild(itemEl(it, false))
    }
    return box
  }

  function build(el) {
    const E = S.E
    el.classList.add('plaque-root')
    el.textContent = ''

    // —— 视口层 ——
    E.fx = U.el('div.plaque-fx', { 'aria-hidden': 'true' })
    E.fxCv = U.el('canvas.plaque-fx-cv')
    E.dustCv = U.el('canvas.plaque-dust-cv')
    E.inks = U.el('div.plaque-inks', { 'aria-hidden': 'true' })
    E.inks.hidden = true // 没有墨字时不显示（否则它压在视口层上方，整块板块多出一个合成层）
    E.fx.append(E.fxCv, E.dustCv)

    // —— 墙与铜牌 ——
    E.scene = U.el('div.plaque-scene')
    E.cap = U.el('div.plaque-cap', { 'aria-hidden': 'true' }, [U.el('i'), U.el('span', { text: '穹顶议事厅 · 东墙' }), U.el('i')])
    E.wall = U.el('div.plaque-wall')
    E.stone = U.el('div.plaque-stone')
    E.wpool = U.el('i.plaque-wpool')
    E.mount = U.el('div.plaque-mount')
    E.cast = U.el('i.plaque-cast')
    E.frame = U.el('div.plaque-frame')
    E.jade = U.el('div.plaque-jade')
    E.face = U.el('div.plaque-face')
    E.body = U.el('div.plaque-body')
    // 唇口的影：同一时刻左右只有一侧、上下只有一侧有影，各用一层（另一侧时镜像过去）
    E.lips = ['t', 'l'].map(s => U.el('i.plaque-lip.plaque-lip--' + s))
    E.spec = U.el('i.plaque-spec')
    E.specbox = U.el('div.plaque-specbox', {}, [E.spec])
    E.dodge = U.el('i.plaque-dodge')
    E.need = U.el('div.plaque-need', { 'aria-hidden': 'true' })

    // 标题
    const title = U.el('h2.plaque-title', { 'aria-label': '价目' })
    E.tch = []
    for (const ch of '价目') {
      const s = U.el('span.plaque-tch.plaque-eng', { text: ch, 'aria-hidden': 'true' })
      title.appendChild(s)
      reg(s, 2.3, { title: true, kind: 't', vis: S.reduced ? 1 : 0 })
      E.tch.push(s)
    }
    E.orn = U.el('div.plaque-orn', { 'aria-hidden': 'true' }, [U.el('i'), U.el('b'), U.el('i')])

    // 兑换方式 + 第 1 到第 5 节，分三栏
    const how = U.el('div.plaque-blk.plaque-how')
    how.appendChild(reg(U.el('h3.plaque-h.plaque-eng.plaque-reveal', { text: '兑换方式' }), 1.3))
    for (const t of HOW) how.appendChild(reg(U.el('p.plaque-p.plaque-eng.plaque-reveal', { text: t }), 1))
    const blocks = [{ el: how, h: 2.2 + HOW.reduce((a, t) => a + Math.ceil(Array.from(t).length / 16) * 1.05 + 0.35, 0) }]
    for (const ch of BODY) blocks.push({ el: chapterEl(ch), h: 2.2 + ch.items.reduce((a, it) => a + (it.sub ? 1.8 : 1), 0) })
    S.blocks = blocks
    E.cols = U.el('div.plaque-cols')
    // 落款：一枚凹刻的圆章——十五个点围着「100」（十五摞金币、一枚一百分）。放在最矮的那一栏底部
    E.seal = reg(U.el('div.plaque-seal', { 'aria-hidden': 'true' }), 1.4, { kind: 's' })
    const ring = U.el('i.plaque-seal-ring')
    for (let i = 0; i < NST; i++) {
      const a = (i / NST) * TAU - Math.PI / 2
      ring.appendChild(U.el('b', { style: { left: (50 + 41 * Math.cos(a)).toFixed(2) + '%', top: (50 + 41 * Math.sin(a)).toFixed(2) + '%' } }))
    }
    E.seal.append(ring, U.el('i.plaque-seal-in'), U.el('span.plaque-seal-n.plaque-eng', { text: '100' }))
    S.ncols = 0
    layoutCols()

    // 六、离场
    E.exit = U.el('div.plaque-exit')
    const exH = reg(U.el('h3.plaque-h.plaque-exit-h.plaque-eng', { text: EXIT_CH.title }), 1.6)
    E.exitBtn = itemEl(EXIT, true)
    E.exit.append(U.el('i.plaque-exit-seam.plaque-exit-seam--t'), exH, E.exitBtn, U.el('i.plaque-exit-seam.plaque-exit-seam--b'))

    E.body.append(title, E.orn, E.cols, E.exit)
    E.face.append(E.body, ...E.lips, E.specbox)
    E.jade.appendChild(E.face)
    E.frame.appendChild(E.jade)
    E.mount.append(E.cast, E.frame)
    E.wall.append(E.stone, E.wpool, E.mount, E.dodge, E.need)

    // —— 收纳台 · 理币盘 ——
    E.table = U.el('div.plaque-table')
    E.trayWrap = U.el('div.plaque-traywrap')
    E.trayCv = U.el('canvas.plaque-tray-cv', { 'aria-hidden': 'true' })
    E.hits = U.el('div.plaque-stacks', { role: 'group', 'aria-label': '理币盘' })
    E.stackBtns = []
    for (let i = 0; i < NST; i++) {
      const b = U.el('button.plaque-stack', { type: 'button', 'data-cursor': '', 'aria-label': stackLabel(i) })
      bindStack(b, i)
      E.hits.appendChild(b)
      E.stackBtns.push(b)
    }
    E.trayWrap.append(E.trayCv, E.hits)
    E.table.appendChild(E.trayWrap)
    E.scene.append(E.cap, E.wall, E.table)

    // —— 你的钱袋 ——
    E.purseIco = U.el('span.plaque-purse-ico', {}, [U.el('i', { text: '100' })])
    E.purseN = U.el('b.plaque-purse-n', { text: '0' })
    E.purse = U.el('div.plaque-purse.is-empty', { role: 'status', 'aria-live': 'polite' }, [E.purseIco, E.purseN])

    el.append(E.fx, E.scene, E.inks, E.purse)
  }

  // 按屏宽分栏（三栏 / 两栏 / 单栏），章节不拆开，使最高的一栏尽量矮
  function layoutCols() {
    const E = S.E
    const n = window.innerWidth > 1180 ? 3 : window.innerWidth > 760 ? 2 : 1
    if (n === S.ncols) return false
    S.ncols = n
    const groups = n > 1 ? (partition(S.blocks, n) || [S.blocks]) : [S.blocks]
    E.cols.textContent = ''
    const cols = groups.map(g => U.el('div.plaque-col', {}, g.map(b => b.el)))
    E.cols.append(...cols)
    if (n > 1) {
      const sum = g => g.reduce((a, b) => a + b.h, 0)
      let k = 0
      groups.forEach((g, i) => { if (sum(g) < sum(groups[k])) k = i })
      cols[k].appendChild(E.seal)
    } else E.seal.remove()
    return true
  }

  function stackLabel(i) { return (i + 1) + ' · ' + S.stacks[i] }

  /* =====================================================================
     铜牌的光：光标是一束掠射的光
     ===================================================================== */
  // 量一次各部件相对板块根元素的位置（排版变化、resize、refresh 时）；帧循环里只读根元素的位置，
  // 墙、牌面、理币盘的位置由它推出来，不再每帧反复读排版
  function measure() {
    const E = S.E
    if (!E.face) return
    const fr = E.face.getBoundingClientRect()
    if (!fr.width) return
    const rr = S.el.getBoundingClientRect()
    const rel = r => ({ x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height })
    S.off = { wall: rel(E.wall.getBoundingClientRect()), face: rel(fr), tray: rel(E.trayWrap.getBoundingClientRect()) }
    measureUnits()
    if (!S.on) parkLight()
  }

  function lightTarget(now) {
    const m = App.mouse
    // 触摸：光落在最近一次点按 / 拖动的位置；停手一会儿后自己慢慢游移
    if (!S.fine && now - S.touchT <= 2600) {
      if (S.tap && S.tapT >= S.moveT) return [S.tap.x, S.tap.y]
      if (m.active) return [m.x, m.y]
    }
    const idle = !m.active || (!S.fine && now - S.touchT > 2600)
    if (idle) {
      const s = now / 1000
      return [window.innerWidth * (0.5 + 0.3 * Math.sin(s * 0.27) + 0.08 * Math.sin(s * 0.71 + 0.5)), window.innerHeight * (0.46 + 0.26 * Math.sin(s * 0.19 + 1.1))]
    }
    return [m.x, m.y]
  }

  // 只在值变了时才写样式（光标停住、光源收敛后不再触发样式计算）
  function put(el, k, v) {
    const c = el._pq || (el._pq = {})
    if (c[k] !== v) { c[k] = v; el.style[k] = v }
  }

  /* ---------- 刻字的阴阳边：影子副本，按「段」成层 ----------
     原先每帧改每一行的 text-shadow（--sx/--sy/--sa/--sd），整块牌面（约 950×1400）跟着整张重画。
     现在把牌面上的刻字整体复制几份（同样的排版，字本身透明，只留一道定色的模糊影），
     垫在原字下面；光源移动时只改副本的 transform / opacity——位移即阴阳边的偏移，不透明度即浓淡，
     与原来的 text-shadow 逐项对应，牌面不再重画。
     由下到上：血粉光（离场一条）→ 亮边 → 第二道深影（标题、离场）→ 暗边 → 原字。
     合成层：每一节里相邻的几行（不超过 SEG_H 高）合成一「段」，一段在每份副本里只占一个合成层
     （原先每一行各占一层，视口里两百多层）。段内各行的偏移方向随光源呈放射状变化，用一个小的
     仿射变换（以段中心为原点的平移 + 伸缩，伸缩量不超过 JMAX）近似；段很矮，浓淡按段中心取值。
     标题大字、落款圆章、离场一条仍各自成层（偏移大、或有入场缩放）。
     光的微微闪烁（L.f）按约 15 帧/秒取样，乘在亮边、血粉光副本各段的 opacity 上。 */
  const SEG_H = 320
  const JMAX = 0.006
  const PASSES = [
    { cls: 'pq-g-gl', kinds: 'x', lf: true, mul: () => 0, a: (sa, sd) => sa * 0.3 },
    { cls: 'pq-g-r', kinds: 'ntxs', lf: true, mul: () => 1, a: sa => sa },
    { cls: 'pq-g-d0', kinds: 'tx', mul: k => (k === 't' ? -0.45 : -0.5), a: (sa, sd, k) => sd * (k === 't' ? 0.7 : 0.75) },
    { cls: 'pq-g-d', kinds: 'ntxs', mul: () => -1, a: (sa, sd) => sd },
  ]
  function buildGhosts() {
    const E = S.E
    if (!E.body) return
    for (const g of E.ghosts || []) g.remove()
    E.ghosts = []
    S.rv = {}
    S.units = []
    for (const e of S.eng) e.gh = []
    E.body.querySelectorAll('[data-pqs]').forEach(n => n.removeAttribute('data-pqs'))
    if (!S.live) return
    E.body.querySelectorAll('.plaque-reveal').forEach((n, i) => n.setAttribute('data-pr', i))
    // 分段：每一节里相邻的几行（按排版高度）合成一段
    const units = []
    for (const blk of E.body.querySelectorAll('.plaque-blk')) {
      let cur = null, h = 0
      for (const ch of blk.children) {
        const hh = ch.getBoundingClientRect().height || 30
        if (!cur || h + hh > SEG_H) { cur = { seg: true, id: units.length, kids: [], eng: [], k: 1, kind: 'n' }; units.push(cur); h = 0 }
        h += hh
        cur.kids.push(ch)
        ch.setAttribute('data-pqs', cur.id)
      }
    }
    // 标题大字、落款圆章、离场一条的名与分：各自一个单元（离场的名与分相距很远，浓淡差别大，不合并）
    for (const e of S.eng) {
      const s = e.el.closest('[data-pqs]')
      if (s) units[+s.getAttribute('data-pqs')].eng.push(e)
      else units.push({ seg: false, id: units.length, el: e.el, eng: [e], k: e.k, kind: e.kind })
    }
    for (const u of units) {
      if (u.seg) { u.aff = true; u.k = u.eng.reduce((a, e) => a + e.k, 0) / Math.max(1, u.eng.length) }
      Object.assign(u, { cx: 0, cy: 0, hh: 0, sx: null, sy: null, j: null, sa: null, sd: null, lv: -1, lsc: -1, lf: -1, tw: [] })
    }
    for (const P of PASSES) {
      const body = E.body.cloneNode(true)
      const wrap = U.el('div.pq-ghost.' + P.cls, { 'aria-hidden': 'true', inert: '' }, [body])
      // 同一段的几行包进一个 div（只在有普通刻字的副本里）；外边距照常穿过它折叠，排版与原件一致
      const segEl = {}
      if (P.kinds.indexOf('n') >= 0) {
        for (const n of Array.from(body.querySelectorAll('[data-pqs]'))) {
          const id = n.getAttribute('data-pqs')
          let w = segEl[id]
          if (!w) { w = segEl[id] = document.createElement('div'); w.className = 'pq-seg'; n.parentNode.insertBefore(w, n) }
          w.appendChild(n)
        }
      }
      const byPq = {}
      for (const n of body.querySelectorAll('[data-pq]')) {
        const e = S.eng[+n.getAttribute('data-pq')]
        if (!e) continue
        byPq[n.getAttribute('data-pq')] = n
        e.gh.push(n)
        // 复制时原件身上可能正挂着入场动画的内联样式（模糊、缩放），副本不要带上；clip-path（逐行刻出）保留同步
        n.style.removeProperty('filter')
        n.style.removeProperty('transform')
        n.style.removeProperty('opacity')
      }
      for (const u of units) {
        if (P.kinds.indexOf(u.kind) < 0) continue
        const n = u.seg ? segEl[u.id] : byPq[u.el.getAttribute('data-pq')]
        if (!n) continue
        if (!u.seg) n.classList.add('pq-on')
        n.style.opacity = '0'
        u.tw.push({ el: n, m: P.mul(u.kind), a: P.a, lf: !!P.lf, tr: '', o: '0' })
      }
      // 逐行刻出：只同步看得见普通刻字的那几份副本
      if (P.kinds.indexOf('n') >= 0) for (const n of body.querySelectorAll('[data-pr]')) (S.rv[n.getAttribute('data-pr')] || (S.rv[n.getAttribute('data-pr')] = [])).push(n)
      E.face.insertBefore(wrap, E.body)
      E.ghosts.push(wrap)
    }
    S.units = units
    measureUnits()
  }
  // 各单元（段 / 单独的字）在牌面上的中心与半高（按原件量，副本身上有变换）
  function measureUnits() {
    const E = S.E
    const fr = E.face && E.face.getBoundingClientRect()
    if (!fr || !fr.width) return
    for (const u of S.units || []) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9
      u.pts = []
      for (const n of u.kids || [u.el]) {
        const r = n.getBoundingClientRect()
        if (r.left < x0) x0 = r.left
        if (r.top < y0) y0 = r.top
        if (r.right > x1) x1 = r.right
        if (r.bottom > y1) y1 = r.bottom
        u.pts.push(r.left + r.width / 2 - fr.left, r.top + r.height / 2 - fr.top)
      }
      if (x1 < x0) continue
      u.cx = (x0 + x1) / 2 - fr.left
      u.cy = (y0 + y1) / 2 - fr.top
      u.hh = (y1 - y0) / 2
      u.sx = u.sy = u.j = u.sa = u.sd = null
    }
  }
  // 原件上的状态变化同步到影子副本
  const twinsOf = el => {
    const e = S.eng[+el.getAttribute('data-pq')]
    return e && e.gh ? e.gh : []
  }
  const revealTwins = el => (S.rv && S.rv[el.getAttribute('data-pr')]) || []

  const r4 = v => String(Math.round(v * 1e4) / 1e4)
  function plaqueLight(vw, vh) {
    const E = S.E, rr = S.rr, of = S.off
    if (!rr || !of) return
    const wl = rr.left + of.wall.x, wt = rr.top + of.wall.y
    if (wt + of.wall.h < -40 || wt > vh + 40) return
    const fl = rr.left + of.face.x, ft = rr.top + of.face.y, fw = of.face.w, fh = of.face.h
    const lx = L.x - fl, ly = L.y - ft
    const tw = 'translate3d(' + (L.x - wl).toFixed(1) + 'px,' + (L.y - wt).toFixed(1) + 'px,0)'
    put(E.dodge, 'transform', tw)
    put(E.wpool, 'transform', tw)
    put(E.dodge, 'opacity', (0.92 * L.f).toFixed(2))
    // 镜面反射点：落在光源与视点（屏幕中心）的连线上、靠近光源一侧
    const ex = vw * 0.5 - fl, ey = vh * 0.5 - ft
    put(E.spec, 'transform', 'translate3d(' + (lx + (ex - lx) * 0.14).toFixed(1) + 'px,' + (ly + (ey - ly) * 0.14).toFixed(1) + 'px,0)')
    put(E.spec, 'opacity', L.f.toFixed(2))
    // 滚动中：上面三层光每帧跟着视口里的光走；投影、唇口的影与刻字的阴阳边每 4 帧更新一次（变化只有一两个像素）
    if (S.scrolling && S.frame % 4) return
    // 框的投影（与光反向）、唇口投在牌面上的影（靠光的一侧）
    let dx = fw / 2 - lx, dy = fh / 2 - ly
    const dn = Math.hypot(dx, dy) || 1
    dx /= dn; dy /= dn
    const off = clamp(9 + dn * 0.018, 9, 26)
    put(E.cast, 'transform', 'translate3d(' + (dx * off).toFixed(1) + 'px,' + (dy * off).toFixed(1) + 'px,0)')
    const lk = clamp(dn / (fh * 0.5), 0.3, 1)
    put(E.lips[0], 'opacity', (clamp(Math.abs(dy)) * lk).toFixed(2))
    put(E.lips[0], 'transform', dy >= 0 ? 'none' : 'translate3d(0,' + (fh - 46).toFixed(1) + 'px,0) scaleY(-1)')
    put(E.lips[1], 'opacity', (clamp(Math.abs(dx)) * lk).toFixed(2))
    put(E.lips[1], 'transform', dx >= 0 ? 'none' : 'translate3d(' + (fw - 46).toFixed(1) + 'px,0,0) scaleX(-1)')
    // 每一行刻字：亮边在背光一侧，暗边在向光一侧；越掠射，阴阳边越宽
    // （低画质：刻字的阴阳边固定为顶光，不随光标变化，见 plaque.css 的默认值）
    if (!S.live || !S.units) return
    const H = 140, R2 = 470 * 470
    const top = -ft - 60, bot = vh - ft + 60
    const lf = Math.round(L.f * 100) / 100
    for (const u of S.units) {
      if (u.cy + u.hh < top || u.cy - u.hh > bot) continue
      const ddx = u.cx - lx, ddy = u.cy - ly
      const r = Math.hypot(ddx, ddy) + 0.01
      const g = r / (r + H)
      const o = (0.42 + 1.18 * g) * u.k
      const ux = ddx / r, uy = ddy / r
      const sx = Math.round(ux * o * 10) / 10
      const sy = Math.round(uy * o * 10) / 10
      // 段：偏移场在段内的变化（雅可比：径向 a、切向 b），限幅后作为以段中心为原点的伸缩
      let jxx = 0, jxy = 0, jyy = 0
      if (u.aff) {
        const a = Math.min(JMAX, (1.18 * H * u.k) / ((r + H) * (r + H)))
        const b = Math.min(JMAX, o / r)
        jxx = Math.round((a * ux * ux + b * uy * uy) * 1e4) / 1e4
        jyy = Math.round((a * uy * uy + b * ux * ux) * 1e4) / 1e4
        jxy = Math.round((a - b) * ux * uy * 1e4) / 1e4
      }
      const j = jxx + ',' + jxy + ',' + jyy
      let boost = 0
      for (const e of u.eng) if (e.boost > boost) boost = e.boost
      const e0 = u.eng[0] || {}
      const vis = u.aff ? 1 : e0.vis, sc = u.aff ? 1 : e0.sc
      // 浓淡：段内各行按各自到光的距离取值再平均（一段里上下几行的亮边浓淡可以差得不少）
      let ea = Math.exp(-(r * r) / R2), eg = g
      if (u.seg && u.pts.length > 2) {
        ea = 0; eg = 0
        const n = u.pts.length / 2
        for (let i = 0; i < u.pts.length; i += 2) {
          const qx = u.pts[i] - lx, qy = u.pts[i + 1] - ly, q2 = qx * qx + qy * qy, q = Math.sqrt(q2)
          ea += Math.exp(-q2 / R2) / n
          eg += q / (q + H) / n
        }
      }
      let sa = 0.1 + 0.86 * ea + boost
      if (!u.aff && e0.title) sa += S.titleBoost
      sa = Math.round(clamp(sa) * 40) / 40
      const sd = Math.round((0.46 + 0.42 * eg) * 20) / 20
      if (sx === u.sx && sy === u.sy && j === u.j && sa === u.sa && sd === u.sd && vis === u.lv && sc === u.lsc && lf === u.lf) continue
      u.sx = sx; u.sy = sy; u.j = j; u.sa = sa; u.sd = sd; u.lv = vis; u.lsc = sc; u.lf = lf
      const scs = sc !== 1 ? ' scale(' + sc.toFixed(3) + ')' : ''
      for (const t of u.tw) {
        const m = t.m
        const tr = u.aff
          ? 'matrix(' + r4(1 + m * jxx) + ',' + r4(m * jxy) + ',' + r4(m * jxy) + ',' + r4(1 + m * jyy) + ',' + (sx * m).toFixed(2) + ',' + (sy * m).toFixed(2) + ')'
          : 'translate3d(' + (sx * m).toFixed(2) + 'px,' + (sy * m).toFixed(2) + 'px,0)' + scs
        if (tr !== t.tr) { t.tr = tr; t.el.style.transform = tr }
        const op = (Math.round(clamp(t.a(sa, sd, u.kind) * vis * (t.lf ? lf : 1)) * 100) / 100).toString()
        if (op !== t.o) { t.o = op; t.el.style.opacity = op }
      }
    }
  }

  /* =====================================================================
     报价 · 兑换
     ===================================================================== */
  function bindItem(b, exit) {
    const mouseLike = e => e.pointerType === 'mouse' || e.pointerType === 'pen'
    b.addEventListener('pointerenter', e => { if (mouseLike(e)) exit ? showDoor() : quote(b) })
    b.addEventListener('pointerleave', e => { if (mouseLike(e)) exit ? hideDoor() : unquote(b) })
    b.addEventListener('focus', () => { if (S.ptr === 'keyboard') exit ? showDoor() : quote(b) })
    b.addEventListener('blur', () => { exit ? hideDoor() : unquote(b) })
    b.addEventListener('click', e => (exit ? exitClick(e) : itemClick(b, e)))
  }

  function renderNeed(it) {
    const E = S.E, n = it.coins, have = S.coins
    E.need.textContent = ''
    E.need.classList.toggle('is-short', have < n)
    if (n <= 10) {
      for (let i = 0; i < n; i++) E.need.appendChild(U.el('i.plaque-coin' + (i < have ? '' : '.is-hollow')))
    } else {
      E.need.appendChild(U.el('i.plaque-coin' + (have >= n ? '' : '.is-hollow')))
      E.need.appendChild(U.el('b.plaque-need-n', { text: '×' + n }))
    }
  }
  // 报价落在这一行的点线上，紧挨着分数（不遮别的行）
  function placeNeed(b) {
    const E = S.E
    const wr = E.wall.getBoundingClientRect(), pr = b._pts.getBoundingClientRect()
    E.need.style.left = (pr.left - wr.left - 5).toFixed(1) + 'px'
    E.need.style.top = (pr.top + pr.height * 0.5 - wr.top).toFixed(1) + 'px'
  }
  function quote(b, sticky) {
    const E = S.E
    const now = performance.now()
    if (S.quoted !== b && now - (S.hovT || 0) > 70) { S.hovT = now; App.audio.sfx('hover', { volume: 0.32 }) }
    if (S.quoted && S.quoted !== b) S.quoted.classList.remove('is-quoted')
    S.quoted = b
    b.classList.add('is-quoted')
    renderNeed(b._it)
    placeNeed(b)
    E.need.classList.add('is-on')
    clearTimeout(S.quoteT)
    if (sticky) S.quoteT = setTimeout(() => unquote(b), 6000)
    if (!S.reduced) gsap.fromTo(E.need.children, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.32, stagger: 0.022, ease: 'back.out(2.6)', overwrite: true })
  }
  function unquote(b) {
    if (b && S.quoted !== b) return
    if (S.quoted) S.quoted.classList.remove('is-quoted')
    S.quoted = null
    clearTimeout(S.quoteT)
    S.E.need.classList.remove('is-on')
  }

  function itemClick(b, e) {
    if (S.ptr === 'touch' && S.quoted !== b) { // 第一下：报价
      quote(b, true)
      App.audio.sfx('click')
      return
    }
    buy(b, e)
  }

  function pointOf(e, el) {
    if (e && e.clientX && e.detail !== 0) return { x: e.clientX, y: e.clientY }
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width * 0.4, y: r.top + r.height / 2 }
  }
  // 现在的光标处（东西出现在身边）
  function cursorNow(fallback) {
    if (S.fine && App.mouse.active) return { x: App.mouse.x, y: App.mouse.y }
    return fallback || { x: L.x, y: L.y }
  }

  function buy(b, e) {
    const it = b._it
    if (b._busy) return
    if (S.coins < it.coins) return refuse(b)
    b._busy = true
    const n = it.coins
    const before = S.coins
    S.rain = 0
    setCoins(S.coins - n)
    S.spent += n
    unquote()
    const tap = pointOf(e, b)
    const vis = S.reduced ? Math.min(n, 4) : Math.min(n, 24)
    const gap = vis > 12 ? 0.045 : 0.08
    const anchor = () => { const r = b._pts.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.55, r: 4 } }
    let landed = 0
    for (let k = 0; k < vis; k++) {
      gsap.delayedCall(k * gap, () => {
        S.shown = Math.max(S.coins, Math.round(before - (n * (k + 1)) / vis))
        paintPurse(false)
        if (k % 2 === 0) App.audio.sfx('coin', { volume: 0.35, pitch: 1.15 + Math.random() * 0.2, pan: 0.6 })
        const p = purseC()
        fly({
          from: { x: p.x, y: p.y }, to: anchor, dur: U.rand(0.58, 0.74), arc: U.rand(0.22, 0.36), size: p.r * 0.72,
          arrive: () => {
            landed++
            melt(anchor)
            if (landed === 1) { App.audio.sfx('coins', { volume: 0.85 }); heat(b) }
            if (landed === vis) done()
          },
        })
      })
    }
    function done() {
      lightRow(b)
      gsap.delayedCall(0.36, () => {
        ink(it.name, cursorNow(S.fine ? null : tap))
        b._busy = false
      })
    }
  }

  function heat(b) {
    const p = b._pts
    p.classList.remove('is-cool')
    p.classList.add('is-hot')
    for (const t of twinsOf(p)) t.classList.add('is-hot') // 烧红时刻字的阴阳边让位给光晕
    clearTimeout(p._ht)
    p._ht = setTimeout(() => {
      p.classList.add('is-cool'); p.classList.remove('is-hot')
      for (const t of twinsOf(p)) t.classList.remove('is-hot')
    }, 520)
  }
  function lightRow(b) {
    b.classList.remove('is-lit')
    void b.offsetWidth
    b.classList.add('is-lit')
    for (const e of b._eng) { e.boost = 0.9 }
    gsap.to(b._eng, { boost: 0, duration: 1.4, ease: 'power2.out', delay: 0.15 })
    clearTimeout(b._lt)
    b._lt = setTimeout(() => b.classList.remove('is-lit'), 260)
  }

  function refuse(b) {
    App.audio.sfx('wrong', { volume: 0.7 })
    // 这一行连同它的阴阳边（影子副本里的同一行）一起抖
    const rows = [b].concat(twinsOf(b._pts).map(t => t.parentElement).filter(Boolean))
    gsap.killTweensOf(rows, 'x')
    if (!S.reduced) gsap.fromTo(rows, { x: 0 }, { keyframes: { x: [0, -6, 5, -4, 3, -1.5, 0] }, duration: 0.42, ease: 'none', clearProps: 'transform' })
    purseShort()
    quote(b, S.ptr === 'touch')
    if (trayLeft() > 0) trayHint()
  }

  function purseShort() {
    const P = S.E.purse
    P.classList.remove('is-short')
    void P.offsetWidth
    P.classList.add('is-short')
    clearTimeout(S.shortT)
    S.shortT = setTimeout(() => P.classList.remove('is-short'), 950)
    if (!S.reduced) gsap.fromTo(P, { x: 0 }, { keyframes: { x: [0, -7, 6, -4, 2, 0] }, duration: 0.42, ease: 'none', clearProps: 'transform' })
  }

  /* ---------- 墨：物品名从光标处的墨里浮出 ---------- */
  // 墨字挂在板块上（跟着页面走），不挂在视口层
  function ink(text, at) {
    const E = S.E
    const fr = S.el.getBoundingClientRect()
    const node = U.el('div.plaque-ink')
    const chars = Array.from(text).map(ch => U.el('span', { text: ch }))
    node.append(...chars)
    E.inks.hidden = false
    E.inks.appendChild(node)
    const w = node.offsetWidth, h = node.offsetHeight
    const x = clamp(at.x - fr.left, w / 2 + 14, Math.max(w / 2 + 14, fr.width - w / 2 - 14))
    const y = clamp(at.y - fr.top, h * 1.6 + 20, Math.max(h * 1.6 + 20, fr.height - 20))
    node.style.left = x.toFixed(1) + 'px'
    node.style.top = y.toFixed(1) + 'px'
    inkPool(x, y, w)
    if (S.reduced) {
      gsap.fromTo(node, { opacity: 0 }, { opacity: 1, duration: 0.5 })
    } else {
      gsap.fromTo(chars, { opacity: 0, yPercent: 70, scaleY: 1.5, filter: 'blur(12px)' }, { opacity: 1, yPercent: 0, scaleY: 1, filter: 'blur(0px)', duration: 1.2, stagger: 0.07, ease: 'expo.out', delay: 0.12 })
    }
    gsap.to(node, { opacity: 0, y: -28, filter: 'blur(8px)', duration: 1.4, delay: 3, ease: 'power2.in', onComplete: () => { node.remove(); if (!E.inks.childElementCount) E.inks.hidden = true } })
  }

  /* ---------- 退出券 ---------- */
  function showDoor() {
    const E = S.E
    E.exit.classList.add('is-hot')
    clearTimeout(S.doorT)
    if (FX.door && FX.door.on) return
    FX.door = { on: true, t0: performance.now(), tOff: 0, jolt: 0, sfx: false }
    App.audio.setMood({ tension: 0.55 })
  }
  function hideDoor(now) {
    const E = S.E
    E.exit.classList.remove('is-hot')
    clearTimeout(S.doorT)
    if (!FX.door || !FX.door.on) return
    FX.door.on = false
    FX.door.tOff = performance.now() - (now ? 1000 : 0)
    App.audio.setMood({ tension: 0.18 })
  }
  function exitClick(e) {
    if (S.ptr === 'touch' && !(FX.door && FX.door.on)) { // 第一下：看清这扇门
      showDoor()
      clearTimeout(S.doorT)
      S.doorT = setTimeout(hideDoor, 5200)
      App.audio.sfx('click')
      return
    }
    if (S.coins >= EXIT.coins) return buyExit(e)
    // 不够：铜牌深处一声闷响，整块铜牌轻震，血粉光熄灭片刻
    const E = S.E
    App.audio.sfx('door', { volume: 1, pitch: 0.7 })
    if (!S.reduced) App.shake(E.mount, 7, 0.55)
    if (App.bg && App.bg.pulse) App.bg.pulse(0.28, 1.6)
    E.exit.classList.remove('is-relight', 'is-hot')
    E.exit.classList.add('is-dead')
    clearTimeout(S.deadT)
    S.deadT = setTimeout(() => {
      E.exit.classList.remove('is-dead')
      void E.exit.offsetWidth
      E.exit.classList.add('is-relight')
      setTimeout(() => {
        E.exit.classList.remove('is-relight')
        if (FX.door && FX.door.on) E.exit.classList.add('is-hot')
      }, 1200)
    }, 1500)
    if (FX.door) FX.door.jolt = 1
    purseShort()
    if (S.ptr === 'touch') { clearTimeout(S.doorT); S.doorT = setTimeout(hideDoor, 3800) }
  }
  function buyExit(e) {
    const E = S.E, b = E.exitBtn
    if (b._busy) return
    b._busy = true
    const n = EXIT.coins, before = S.coins
    S.rain = 0
    setCoins(S.coins - n)
    S.spent += n
    const tap = pointOf(e, b)
    const vis = S.reduced ? 8 : 60
    const anchor = () => { const r = b._pts.getBoundingClientRect(); return { x: r.left + r.width * U.rand(0.2, 0.8), y: r.top + r.height * 0.55, r: 5 } }
    let landed = 0
    for (let k = 0; k < vis; k++) {
      gsap.delayedCall(k * 0.025, () => {
        S.shown = Math.max(S.coins, Math.round(before - (n * (k + 1)) / vis))
        paintPurse(false)
        const p = purseC()
        fly({
          from: { x: p.x, y: p.y }, to: anchor, dur: U.rand(0.55, 0.8), arc: U.rand(0.2, 0.45), size: p.r * 0.7,
          arrive: () => {
            landed++
            melt(anchor)
            if (landed === 1) App.audio.sfx('coins', { volume: 1 })
            if (landed === vis) {
              App.flash(App.color.blood, { opacity: 0.5, duration: 1.2 })
              E.exit.classList.add('is-hot')
              lightRow(b)
              gsap.delayedCall(0.4, () => { ink(EXIT.name, cursorNow(S.fine ? null : tap)); b._busy = false })
            }
          },
        })
      })
    }
  }

  /* =====================================================================
     理币盘：白玉台面上的白玉盘（Canvas 2D 简易透视，单位厘米）
     盘 90×16×2.4，浅槽 86×12 深 1；金币 Ø26.5 mm × 1.8 mm；相邻两摞边缘相距 2.8 cm，整列居中
     ===================================================================== */
  const G = {
    hw: 45, hh: 8, ht: 2.4, rr: 1.6, // 外廓
    ghw: 43, ghh: 6, grr: 1.1, fl: 1.4, // 浅槽
    cr: 1.325, ct: 0.18, // 金币
    pitch: 2.65 + 2.8,
    x0: -((NST * 2.65 + (NST - 1) * 2.8) / 2) + 1.325,
    tx0: -120, tx1: 120, ty0: -18, ty1: 47, tth: 3, // 收纳台台面（前沿距盘前沿 10 cm）
  }
  const T = {
    cv: null, ctx: null, W: 1, H: 1, dpr: 1, mob: false,
    yaw: 0, elev: 0.44, dist: 170, F: 1, cx: 0, cy: 0, fitW: 0.9, fitH: 0.6, fitY: 0.56,
    pyaw: 0, pel: 0,
    c: { px: 0, py: 0, pz: 0, rx: 1, ry: 0, ux: 0, uy: 0, uz: 1, fx: 0, fy: 1, fz: 0 },
    tg: { x: 0, y: 0.6, z: 2 },
    Lw: { x: 0, y: -30, z: 30 },
    glow: new Float32Array(NST), lift: new Float32Array(NST),
    hint: 0, sweep: -9, key: '', dirty: true, time: 0, last: 0,
  }
  function rrPts(hw, hh, r, z, n) {
    const out = []
    const cs = [[hw - r, -hh + r, -Math.PI / 2], [hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI]]
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]) }
    return out
  }
  const OB = rrPts(G.hw, G.hh, G.rr, 0, 4)
  const OT = rrPts(G.hw, G.hh, G.rr, G.ht, 4)
  const IT = rrPts(G.ghw, G.ghh, G.grr, G.ht, 4)
  const IB = rrPts(G.ghw, G.ghh, G.grr, G.fl, 4)
  const P1 = {}, P2 = {}, P3 = {}, P4 = {}

  function setCam(yaw, elev) {
    const c = T.c, t = T.tg, D = T.dist
    const ce = Math.cos(elev), se = Math.sin(elev)
    c.px = t.x + D * Math.sin(yaw) * ce
    c.py = t.y - D * Math.cos(yaw) * ce
    c.pz = t.z + D * se
    let fx = t.x - c.px, fy = t.y - c.py, fz = t.z - c.pz
    const fl = Math.hypot(fx, fy, fz)
    fx /= fl; fy /= fl; fz /= fl
    let rx = fy, ry = -fx
    const rl = Math.hypot(rx, ry) || 1
    rx /= rl; ry /= rl
    c.fx = fx; c.fy = fy; c.fz = fz; c.rx = rx; c.ry = ry
    c.ux = ry * fz; c.uy = -rx * fz; c.uz = rx * fy - ry * fx
  }
  function prj(x, y, z, o) {
    const c = T.c
    const vx = x - c.px, vy = y - c.py, vz = z - c.pz
    const zc = vx * c.fx + vy * c.fy + vz * c.fz
    const s = T.F / Math.max(zc, 1)
    o = o || {}
    o.x = T.cx + (vx * c.rx + vy * c.ry) * s
    o.y = T.cy - (vx * c.ux + vy * c.uy + vz * c.uz) * s
    o.z = zc
    return o
  }
  // 投影一个多边形（先按近平面裁剪）
  function prjPoly(pts) {
    const c = T.c, near = 12
    const depth = p => (p[0] - c.px) * c.fx + (p[1] - c.py) * c.fy + (p[2] - c.pz) * c.fz
    const keep = []
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]
      const da = depth(a), db = depth(b)
      if (da >= near) keep.push(a)
      if ((da >= near) !== (db >= near)) {
        const t = (near - da) / (db - da)
        keep.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
      }
    }
    return keep.map(p => prj(p[0], p[1], p[2], {}))
  }
  function path(ctx, pts) {
    ctx.beginPath()
    for (let i = 0; i < pts.length; i++) i ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y)
    ctx.closePath()
  }
  const cross = (a, b) => a.x * b.y - a.y * b.x

  // 光照：漫反射 + Blinn 高光，点光源按距离衰减
  const LT = { d: 0, s: 0, att: 0 }
  function lit(px, py, pz, nx, ny, nz, shin) {
    const Lw = T.Lw, c = T.c
    let lx = Lw.x - px, ly = Lw.y - py, lz = Lw.z - pz
    const ld = Math.hypot(lx, ly, lz) || 1
    lx /= ld; ly /= ld; lz /= ld
    let vx = c.px - px, vy = c.py - py, vz = c.pz - pz
    const vd = Math.hypot(vx, vy, vz) || 1
    vx /= vd; vy /= vd; vz /= vd
    const hx = lx + vx, hy = ly + vy, hz = lz + vz
    const hd = Math.hypot(hx, hy, hz) || 1
    const att = 1 / (1 + (ld / 64) * (ld / 64))
    LT.d = Math.max(0, nx * lx + ny * ly + nz * lz) * att
    LT.s = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hd), shin || 16) * att
    LT.att = att
    return LT
  }
  // 水平面上一点光源照出的光斑（透视下的椭圆径向渐变）
  function fillLit(ctx, poly, z, lo, gain, R) {
    const Lw = T.Lw, dpr = T.dpr
    path(ctx, poly)
    const h = Math.max(1, Lw.z - z)
    const f = prj(Lw.x, Lw.y, z, P1), fx = prj(Lw.x + 1, Lw.y, z, P2), fy = prj(Lw.x, Lw.y + 1, z, P3)
    ctx.setTransform(dpr * (fx.x - f.x), dpr * (fx.y - f.y), dpr * (fy.x - f.x), dpr * (fy.y - f.y), dpr * f.x, dpr * f.y)
    const rad = h * 2.4 + 40
    const att = 1 / (1 + (h / 64) * (h / 64))
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad)
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, dd = t * rad
      const irr = Math.pow((h * h) / (dd * dd + h * h), 1.5)
      g.addColorStop(t, rgba(ramp(R, lo + gain * irr * att)))
    }
    ctx.fillStyle = g
    ctx.fill()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  // 镜面反射点：平面 z 上，光源经它反射进镜头的那一点
  function mirror(z, o) {
    const c = T.c, Lw = T.Lw
    const lz = 2 * z - Lw.z
    const den = c.pz - lz
    if (Math.abs(den) < 1e-3) { o.x = 1e6; o.y = 1e6; return o }
    const t = (c.pz - z) / den
    o.x = c.px + (Lw.x - c.px) * t
    o.y = c.py + (Lw.y - c.py) * t
    return o
  }

  // 玉里的云絮：一张小纹理，按透视近似（仿射）贴在盘面上
  let JTEX = null
  function jadeTex() {
    if (JTEX) return JTEX
    const W = 320, H = 60
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const g = cv.getContext('2d')
    const rnd = U.seeded(9150)
    const img = g.createImageData(W, H), d = img.data
    const a = vnoise(W, 7, rnd), b = vnoise(W, 23, rnd), c = vnoise(W, 61, rnd)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, o = i * 4, k = (y % W) * W + x
        const cloud = a[k] * 0.55 + b[k] * 0.3 + c[k] * 0.15
        const vein = Math.max(0, 1 - Math.abs(b[k] - 0.5) * 16) * 0.5
        if (cloud > 0.52) { d[o] = 255; d[o + 1] = 250; d[o + 2] = 232; d[o + 3] = Math.min(255, (cloud - 0.52) * 520) }
        else { d[o] = 96; d[o + 1] = 84; d[o + 2] = 58; d[o + 3] = Math.min(255, (0.52 - cloud) * 300 + vein * 120) }
      }
    }
    g.putImageData(img, 0, 0)
    JTEX = cv
    return cv
  }
  function jadeVeins(ctx, poly, z, alpha) {
    if (poly.length < 3) return
    const tex = jadeTex(), dpr = T.dpr
    ctx.save()
    path(ctx, poly)
    ctx.clip()
    const a = prj(-G.hw, -G.hh, z, P1), b = prj(G.hw, -G.hh, z, P2), c = prj(-G.hw, G.hh, z, P3)
    ctx.setTransform(dpr * (b.x - a.x) / tex.width, dpr * (b.y - a.y) / tex.width, dpr * (c.x - a.x) / tex.height, dpr * (c.y - a.y) / tex.height, dpr * a.x, dpr * a.y)
    ctx.globalAlpha = alpha
    ctx.drawImage(tex, 0, 0)
    ctx.restore()
  }

  function trayInit() {
    T.cv = S.E.trayCv
    T.ctx = T.cv.getContext('2d')
    trayResize()
  }
  function trayResize() {
    const wrap = S.E.trayWrap
    const W = wrap.clientWidth, H = wrap.clientHeight
    if (!W || !H) return
    T.mob = H > W * 0.8
    // 像素预算：全效果至多 1.5 倍（2 倍屏上金币仍清楚，像素少了近一半）
    T.dpr = Math.min(window.devicePixelRatio || 1, S.q >= 2 ? 1.5 : S.q === 1 ? 1.25 : 1)
    T.W = W; T.H = H
    // 板块远离视口时画布不占显存（section:near 时再分配、重画）
    T.cv.width = S.far ? 0 : Math.round(W * T.dpr)
    T.cv.height = S.far ? 0 : Math.round(H * T.dpr)
    if (T.mob) { T.yaw = -Math.PI / 2; T.elev = 0.92; T.dist = 150; T.fitW = 0.62; T.fitH = 0.86; T.fitY = 0.5 } else { T.yaw = 0; T.elev = 0.56; T.dist = 160; T.fitW = 0.9; T.fitH = 0.62; T.fitY = 0.56 }
    // 按基准视角取景（视差不改变取景）
    setCam(T.yaw, T.elev)
    T.F = 1; T.cx = 0; T.cy = 0
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    const pts = [[-G.hw, -G.hh, 0], [G.hw, -G.hh, 0], [-G.hw, G.hh, 0], [G.hw, G.hh, 0], [-G.hw, -G.hh, G.ht], [G.hw, -G.hh, G.ht], [-G.hw, G.hh, G.ht], [G.hw, G.hh, G.ht], [G.x0, 0, 3.6], [-G.x0, 0, 3.6]]
    for (const p of pts) {
      const q = prj(p[0], p[1], p[2], P1)
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y)
    }
    T.F = Math.min((W * T.fitW) / (x1 - x0), (H * T.fitH) / (y1 - y0))
    T.cx = W / 2 - ((x0 + x1) / 2) * T.F
    T.cy = H * T.fitY - ((y0 + y1) / 2) * T.F
    T.dirty = true
  }

  // 屏幕上的光（视口坐标）→ 盘上方的点光源（世界坐标）
  function trayLight(r) {
    const c = T.c
    const a = (L.x - r.left - T.cx) / T.F, b = -(L.y - r.top - T.cy) / T.F
    let dx = c.fx + c.rx * a + c.ux * b, dy = c.fy + c.ry * a + c.uy * b, dz = c.fz + c.uz * b
    const dl = Math.hypot(dx, dy, dz) || 1
    dx /= dl; dy /= dl; dz /= dl
    const hz = 16
    let t = dz < -0.02 ? (hz - c.pz) / dz : -1
    if (!(t > 0 && t < 700)) t = 240
    let lx = c.px + dx * t, ly = c.py + dy * t, lz = c.pz + dz * t
    lx = clamp(lx, -150, 150); ly = clamp(ly, -80, 140); lz = clamp(lz, 8, 140)
    // 不让光源跑到镜头背后
    const dep = (lx - c.px) * c.fx + (ly - c.py) * c.fy + (lz - c.pz) * c.fz
    if (dep < 30) { const k = 30 - dep; lx += c.fx * k; ly += c.fy * k; lz += c.fz * k }
    T.Lw.x = lx; T.Lw.y = ly; T.Lw.z = lz
  }

  function trayTick(dtf, vw, vh, now) {
    if (!S.rr || !S.off || !T.cv.width) return
    const ot = S.off.tray
    const r = { left: S.rr.left + ot.x, top: S.rr.top + ot.y, width: ot.w, height: ot.h }
    r.right = r.left + r.width; r.bottom = r.top + r.height
    if (r.bottom < -30 || r.top > vh + 30 || !r.width) return
    const nx = clamp((L.x - (r.left + r.width / 2)) / (vw * 0.5), -1, 1)
    const ny = clamp((L.y - (r.top + r.height / 2)) / (vh * 0.6), -1, 1)
    const k = 1 - Math.pow(0.9, dtf)
    T.pyaw += ((T.mob ? 0.025 : 0.05) * nx - T.pyaw) * k
    T.pel += (-0.035 * ny - T.pel) * k
    setCam(T.yaw + T.pyaw, T.elev + T.pel)
    trayLight(r)
    let anim = false
    const kg = 1 - Math.pow(0.8, dtf)
    for (let i = 0; i < NST; i++) {
      const tgt = i === S.hov && S.stacks[i] > 0 ? 1 : 0
      let g = T.glow[i] + (tgt - T.glow[i]) * kg
      if (Math.abs(g - tgt) < 0.003) g = tgt
      else anim = true
      T.glow[i] = g
      T.lift[i] = S.reduced ? 0 : g * 0.55
    }
    if (T.hint > 0.001 || (T.sweep > -6 && T.sweep < 20)) anim = true
    T.time += dtf / 60
    const key = T.Lw.x.toFixed(1) + ',' + T.Lw.y.toFixed(1) + ',' + T.Lw.z.toFixed(1) + '|' + T.pyaw.toFixed(4) + ',' + T.pel.toFixed(4)
    if (anim || T.dirty || key !== T.key) {
      // 光在移动 / 光晕渐变时至多 30 帧重画一次（点按、取币等 dirty 立即画）
      if (!T.dirty && (now - T.last < 30 || (S.scrolling && S.frame % 3))) return
      T.last = now
      T.key = key
      T.dirty = false
      trayRender()
      placeHits()
    }
  }

  function trayRender() {
    const ctx = T.ctx, dpr = T.dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, T.W, T.H)
    drawTable(ctx)
    drawTray(ctx)
    drawStacks(ctx)
  }

  function drawTable(ctx) {
    const c = T.c
    // 白玉台面（竖屏俯视时台沿会横在画面一侧，干脆把台面铺满）
    const ty0 = T.mob ? -70 : G.ty0
    fillLit(ctx, prjPoly([[G.tx0, ty0, 0], [G.tx1, ty0, 0], [G.tx1, G.ty1, 0], [G.tx0, G.ty1, 0]]), 0, 0.06, 0.8, JADE)
    // 台面前沿厚 3 cm、铂金线，下面是沉香
    if (!T.mob && -(c.py - G.ty0) < 0) {
      const fr = prjPoly([[G.tx0, G.ty0, 0], [G.tx1, G.ty0, 0], [G.tx1, G.ty0, -G.tth], [G.tx0, G.ty0, -G.tth]])
      if (fr.length > 2) {
        lit(T.Lw.x, G.ty0, -1.5, 0, -1, 0, 8)
        const g = ctx.createLinearGradient(0, 0, T.W, 0)
        const fx = prj(T.Lw.x, G.ty0, 0, P1).x / T.W
        g.addColorStop(0, rgba(ramp(JADE, 0.05)))
        g.addColorStop(clamp(fx, 0.01, 0.99), rgba(ramp(JADE, 0.08 + LT.d * 0.7)))
        g.addColorStop(1, rgba(ramp(JADE, 0.05)))
        ctx.fillStyle = g; path(ctx, fr); ctx.fill()
        const ap = prjPoly([[G.tx0, G.ty0 + 1.2, -G.tth], [G.tx1, G.ty0 + 1.2, -G.tth], [G.tx1, G.ty0 + 1.2, -16], [G.tx0, G.ty0 + 1.2, -16]])
        if (ap.length > 2) {
          const ag = ctx.createLinearGradient(0, ap[0].y, 0, ap[2].y)
          ag.addColorStop(0, rgba(ramp(WOOD, 0.18 + LT.d * 0.6)))
          ag.addColorStop(1, rgba(ramp(WOOD, 0.02)))
          ctx.fillStyle = ag; path(ctx, ap); ctx.fill()
        }
        const a = prj(G.tx0, G.ty0, 0, P1), b = prj(G.tx1, G.ty0, 0, P2)
        const pg = ctx.createLinearGradient(0, 0, T.W, 0)
        pg.addColorStop(0, rgba(ramp(PLAT, 0.2), 0.5))
        pg.addColorStop(clamp(fx, 0.01, 0.99), rgba(ramp(PLAT, 0.4 + LT.d * 1.2), 0.95))
        pg.addColorStop(1, rgba(ramp(PLAT, 0.2), 0.5))
        ctx.strokeStyle = pg; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        const a2 = prj(G.tx0, G.ty0, -G.tth, P1), b2 = prj(G.tx1, G.ty0, -G.tth, P2)
        ctx.globalAlpha = 0.5
        ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
    // 四周渐隐进黑暗
    ctx.globalCompositeOperation = 'destination-in'
    let m = ctx.createLinearGradient(0, 0, T.W, 0)
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(T.mob ? 0.06 : 0.12, '#000'); m.addColorStop(T.mob ? 0.94 : 0.88, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = m; ctx.fillRect(0, 0, T.W, T.H)
    m = ctx.createLinearGradient(0, 0, 0, T.H)
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(T.mob ? 0.12 : 0.3, '#000'); m.addColorStop(T.mob ? 0.86 : 0.84, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = m; ctx.fillRect(0, 0, T.W, T.H)
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawTray(ctx) {
    const c = T.c, Lw = T.Lw, dpr = T.dpr
    // 盘在台面上的软影（偏离光源）
    {
      let ox = -Lw.x * 0.05, oy = -Lw.y * 0.05
      ox = clamp(ox, -5, 5); oy = clamp(oy, -3, 3)
      const p = prj(ox, oy, 0, P1), px = prj(ox + 1, oy, 0, P2), py = prj(ox, oy + 1, 0, P3)
      ctx.setTransform(dpr * (px.x - p.x), dpr * (px.y - p.y), dpr * (py.x - p.x), dpr * (py.y - p.y), dpr * p.x, dpr * p.y)
      ctx.scale(G.hw + 7, G.hh + 6)
      const g = ctx.createRadialGradient(0, 0, 0.55, 0, 0, 1)
      g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    // 外侧壁
    for (let i = 0; i < OB.length; i++) {
      const j = (i + 1) % OB.length
      const a = OB[i], b = OB[j]
      let nx = b[1] - a[1], ny = -(b[0] - a[0])
      const nl = Math.hypot(nx, ny) || 1
      nx /= nl; ny /= nl
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
      if (nx * (c.px - mx) + ny * (c.py - my) <= 0) continue
      lit(mx, my, G.ht * 0.5, nx, ny, 0, 10)
      const col = rgba(ramp(JADE, 0.2 + LT.d * 0.78 + LT.s * 0.4))
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.7
      path(ctx, prjPoly([a, b, OT[j], OT[i]])); ctx.fill(); ctx.stroke()
    }
    // 盘沿上面
    fillLit(ctx, prjPoly(OT), G.ht, 0.26, 0.92, JADE)
    jadeVeins(ctx, prjPoly(OT), G.ht, 0.5)
    // 浅槽：开口里是槽底；再画朝向镜头的内壁
    fillLit(ctx, prjPoly(IT), G.fl, 0.18, 0.78, JADE)
    jadeVeins(ctx, prjPoly(IT), G.fl, 0.36)
    for (let i = 0; i < IT.length; i++) {
      const j = (i + 1) % IT.length
      const a = IT[i], b = IT[j]
      let nx = -(b[1] - a[1]), ny = b[0] - a[0] // 朝槽内
      const nl = Math.hypot(nx, ny) || 1
      nx /= nl; ny /= nl
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
      if (nx * (c.px - mx) + ny * (c.py - my) <= 0) continue
      lit(mx, my, (G.ht + G.fl) / 2, nx, ny, 0, 10)
      const col = rgba(ramp(JADE, 0.12 + LT.d * 0.55))
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.6
      path(ctx, prjPoly([a, b, IB[j], IB[i]])); ctx.fill(); ctx.stroke()
    }
    // 薄铂金边沿：沿盘的长轴，光源附近一线亮
    const A = prj(-G.hw, 0, G.ht, P1), B = prj(G.hw, 0, G.ht, P2)
    const ABx = B.x - A.x, ABy = B.y - A.y, AB2 = ABx * ABx + ABy * ABy || 1
    const f = prj(Lw.x, Lw.y, G.ht, P3)
    const tt = clamp(((f.x - A.x) * ABx + (f.y - A.y) * ABy) / AB2, 0.02, 0.98)
    lit(Lw.x, 0, G.ht, 0, 0, 1, 6)
    const hi = 0.35 + LT.att * 1.1
    const pg = ctx.createLinearGradient(A.x, A.y, B.x, B.y)
    pg.addColorStop(0, rgba(ramp(PLAT, 0.32), 0.85))
    pg.addColorStop(clamp(tt - 0.14, 0, 1), rgba(ramp(PLAT, 0.36), 0.85))
    pg.addColorStop(tt, rgba(ramp(PLAT, hi), 1))
    pg.addColorStop(clamp(tt + 0.14, 0, 1), rgba(ramp(PLAT, 0.36), 0.85))
    pg.addColorStop(1, rgba(ramp(PLAT, 0.32), 0.85))
    ctx.strokeStyle = pg
    ctx.lineWidth = T.mob ? 1 : 1.3
    path(ctx, prjPoly(OT)); ctx.stroke()
    ctx.lineWidth = 0.7
    ctx.globalAlpha = 0.55
    path(ctx, prjPoly(IT)); ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawStacks(ctx) {
    const c = T.c, Lw = T.Lw, dpr = T.dpr
    // 落在槽底的影子（背离光源）
    for (let i = 0; i < NST; i++) {
      const n = S.stacks[i]
      if (!n) continue
      const x = G.x0 + i * G.pitch
      let dx = x - Lw.x, dy = -Lw.y
      const dl = Math.hypot(dx, dy) || 1
      dx /= dl; dy /= dl
      const h = Math.max(2, Lw.z - G.fl)
      const len = clamp(((n * G.ct + T.lift[i]) * dl) / h, 0.3, 5)
      const sx = x + dx * len * 0.5, sy = dy * len * 0.5
      const p = prj(sx, sy, G.fl, P1), pa = prj(sx + dx, sy + dy, G.fl, P2), pb = prj(sx - dy, sy + dx, G.fl, P3)
      ctx.setTransform(dpr * (pa.x - p.x), dpr * (pa.y - p.y), dpr * (pb.x - p.x), dpr * (pb.y - p.y), dpr * p.x, dpr * p.y)
      ctx.scale(G.cr + len * 0.5 + 0.3, G.cr + 0.35)
      const g = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 1)
      g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    // 远的先画
    const order = []
    for (let i = 0; i < NST; i++) order.push(i)
    const depth = i => (G.x0 + i * G.pitch - c.px) * c.fx + (0 - c.py) * c.fy
    order.sort((a, b) => depth(b) - depth(a))
    const sw = T.sweep, tm = T.time
    for (const i of order) {
      const n = S.stacks[i]
      if (!n) { ghost(ctx, G.x0 + i * G.pitch); continue }
      const x = G.x0 + i * G.pitch
      const glow = T.glow[i]
      const hint = T.hint > 0 ? T.hint * (0.5 + 0.5 * Math.sin(tm * 9 - i * 0.55)) : 0
      const sweep = Math.exp(-((i - sw) * (i - sw)) / 1.6)
      const I0 = glow * 0.22 + hint * 0.3
      const sp = sweep * 0.9
      // 悬停的光晕
      if (glow + hint > 0.02) {
        const m = prj(x, 0, G.fl + n * G.ct * 0.5, P1), ra = prj(x + G.cr, 0, G.fl, P2)
        const rr = Math.hypot(ra.x - m.x, ra.y - m.y) * 3.4
        ctx.globalCompositeOperation = 'lighter'
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rr)
        g.addColorStop(0, 'rgba(255,196,96,' + (0.34 * (glow + hint * 0.7)).toFixed(3) + ')')
        g.addColorStop(1, 'rgba(255,170,60,0)')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, TAU); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
      }
      const zb = G.fl, zt = G.fl + n * G.ct, lift = T.lift[i]
      if (lift > 0.01 && n > 1) {
        cyl(ctx, x, zb, zt - G.ct, n - 1, I0, sp)
        cyl(ctx, x, zt - G.ct + lift, zt + lift, 1, I0 + 0.08, sp)
      } else cyl(ctx, x, zb, zt + lift, n, I0, sp)
    }
  }

  // 空了的位置：槽底留下一圈比别处更干净的玉色
  function ghost(ctx, x) {
    const dpr = T.dpr
    const p = prj(x, 0, G.fl, P1), pa = prj(x + 1, 0, G.fl, P2), pb = prj(x, 1, G.fl, P3)
    ctx.setTransform(dpr * (pa.x - p.x), dpr * (pa.y - p.y), dpr * (pb.x - p.x), dpr * (pb.y - p.y), dpr * p.x, dpr * p.y)
    lit(x, 0, G.fl, 0, 0, 1, 8)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, G.cr * 1.12)
    const k = 0.1 + LT.d * 0.25
    g.addColorStop(0, 'rgba(255,250,236,' + (k * 0.35).toFixed(3) + ')')
    g.addColorStop(0.84, 'rgba(255,250,236,' + (k * 0.6).toFixed(3) + ')')
    g.addColorStop(0.9, 'rgba(40,32,22,' + (k * 0.9).toFixed(3) + ')')
    g.addColorStop(1, 'rgba(40,32,22,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(0, 0, G.cr * 1.12, 0, TAU); ctx.fill()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const MP = {}
  function cyl(ctx, x, z0, z1, count, I0, sp) {
    const r = G.cr, c = T.c, y = 0
    const cb = prj(x, y, z0, {}), ct = prj(x, y, z1, {})
    const pxb = prj(x + r, y, z0, P1), pyb = prj(x, y + r, z0, P2)
    const ab = { x: pxb.x - cb.x, y: pxb.y - cb.y }, bb = { x: pyb.x - cb.x, y: pyb.y - cb.y }
    const pxt = prj(x + r, y, z1, P1), pyt = prj(x, y + r, z1, P2)
    const at = { x: pxt.x - ct.x, y: pxt.y - ct.y }, bt = { x: pyt.x - ct.x, y: pyt.y - ct.y }
    const v = { x: ct.x - cb.x, y: ct.y - cb.y }
    const zm = (z0 + z1) / 2
    const E = (cc, a, b, t, o) => { o.x = cc.x + a.x * Math.cos(t) + b.x * Math.sin(t); o.y = cc.y + a.y * Math.cos(t) + b.y * Math.sin(t); return o }
    // —— 侧面 ——
    if (Math.hypot(v.x, v.y) > 0.25) {
      const t0 = Math.atan2(cross(bb, v), cross(ab, v))
      let tA = t0, tB = t0 + Math.PI
      const tm = t0 + Math.PI / 2
      const mx = ab.x * Math.cos(tm) + bb.x * Math.sin(tm), my = ab.y * Math.cos(tm) + bb.y * Math.sin(tm)
      if (-(mx * v.x + my * v.y) < 0) { tA = t0 + Math.PI; tB = t0 + TAU }
      const N = 18, q = {}
      ctx.beginPath()
      for (let k = 0; k <= N; k++) { E(cb, ab, bb, tA + ((tB - tA) * k) / N, q); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y) }
      for (let k = N; k >= 0; k--) { E(ct, at, bt, tA + ((tB - tA) * k) / N, q); ctx.lineTo(q.x, q.y) }
      ctx.closePath()
      const cm = { x: (cb.x + ct.x) / 2, y: (cb.y + ct.y) / 2 }
      const am = { x: (ab.x + at.x) / 2, y: (ab.y + at.y) / 2 }, bm = { x: (bb.x + bt.x) / 2, y: (bb.y + bt.y) / 2 }
      const pA = E(cm, am, bm, tA, {}), pB = E(cm, am, bm, tB, {})
      const left = pA.x <= pB.x ? pA : pB, right = pA.x <= pB.x ? pB : pA
      const gr = ctx.createLinearGradient(left.x, left.y, right.x, right.y)
      const phiR = Math.atan2(c.ry, c.rx)
      for (let k = 0; k <= 8; k++) {
        const phi = phiR + Math.PI + (k / 8) * Math.PI
        const nx = Math.cos(phi), ny = Math.sin(phi)
        lit(x + nx * r, y + ny * r, zm, nx, ny, 0, 28)
        const I = 0.17 + LT.d * 0.72 + LT.s * (1.5 + sp) + I0
        gr.addColorStop((1 - Math.cos((k / 8) * Math.PI)) / 2, rgba(ramp(GOLD, I)))
      }
      ctx.fillStyle = gr
      ctx.fill()
      // 币与币之间的细缝（金币边缘光滑、无齿纹）
      const span = Math.hypot(ab.x, ab.y) + Math.hypot(bb.x, bb.y)
      if (count > 1 && span > 6) {
        ctx.lineWidth = 0.65
        ctx.strokeStyle = 'rgba(70,40,6,.5)'
        ctx.beginPath()
        for (let m = 1; m < count; m++) {
          const fz = m / count
          const cc = { x: cb.x + v.x * fz, y: cb.y + v.y * fz }
          for (let k = 0; k <= 12; k++) { E(cc, ab, bb, tA + ((tB - tA) * k) / 12, q); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y) }
        }
        ctx.stroke()
      }
    }
    // —— 顶面 ——
    const q = {}
    ctx.beginPath()
    for (let k = 0; k < 28; k++) { E(ct, at, bt, (k / 28) * TAU, q); k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y) }
    ctx.closePath()
    lit(x, y, z1, 0, 0, 1, 40)
    const It = 0.22 + LT.d * 0.62 + I0
    const far = { x: ct.x + bt.x, y: ct.y + bt.y }, near = { x: ct.x - bt.x, y: ct.y - bt.y }
    const tg = ctx.createLinearGradient(far.x, far.y, near.x, near.y)
    tg.addColorStop(0, rgba(ramp(GOLD, It * 0.8)))
    tg.addColorStop(1, rgba(ramp(GOLD, It * 1.12 + 0.05)))
    ctx.fillStyle = tg
    ctx.fill()
    // 镜面反射点落在币面附近 → 一点闪光（随光标在一列金币上游走）
    mirror(z1, MP)
    const dd = Math.hypot(MP.x - x, MP.y - y)
    const glint = Math.exp(-(dd * dd) / (r * r * 1.6)) * LT.att * 1.7 + sp * 0.5
    if (glint > 0.02) {
      const mp = prj(MP.x, MP.y, z1, P3)
      const ra = Math.hypot(at.x, at.y) * 1.5
      ctx.save()
      ctx.clip()
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, ra)
      g.addColorStop(0, 'rgba(255,246,214,' + Math.min(0.95, glint * 0.8).toFixed(3) + ')')
      g.addColorStop(1, 'rgba(255,220,140,0)')
      ctx.fillStyle = g
      ctx.fillRect(mp.x - ra, mp.y - ra, ra * 2, ra * 2)
      ctx.restore()
    }
    ctx.lineWidth = 0.8
    ctx.strokeStyle = rgba(ramp(GOLD, It + 0.4), 0.75)
    ctx.stroke()
    // 两面各镶银字「100」
    if (Math.hypot(at.x, at.y) > 6.5) inscription(ctx, ct, at, bt, It + glint * 0.6)
  }
  function inscription(ctx, cc, a, b, I) {
    const dpr = T.dpr
    const cand = [a, { x: -a.x, y: -a.y }, b, { x: -b.x, y: -b.y }]
    let ex = cand[0]
    for (const q of cand) if (q.x > ex.x) ex = q
    const pair = ex === cand[0] || ex === cand[1] ? [cand[2], cand[3]] : [cand[0], cand[1]]
    const ey = pair[0].y > pair[1].y ? pair[0] : pair[1]
    const k = 1 / 20
    ctx.setTransform(dpr * ex.x * k, dpr * ex.y * k, dpr * ey.x * k, dpr * ey.y * k, dpr * cc.x, dpr * cc.y)
    ctx.font = '700 10.5px Cinzel, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(70,40,6,.6)'
    ctx.fillText('100', 0.8, 1.3)
    ctx.fillStyle = rgba(ramp(SILVER, I * 0.95 + 0.2))
    ctx.fillText('100', 0, 0.4)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // 点击区跟着每一摞的投影
  function placeHits() {
    const btns = S.E.stackBtns
    for (let i = 0; i < NST; i++) {
      const x = G.x0 + i * G.pitch
      const z1 = G.fl + PER * G.ct + 0.6
      const cb = prj(x, 0, G.fl, P1), ct = prj(x, 0, z1, P2)
      const ax = prj(x + G.cr, 0, G.fl, P3), ay = prj(x, G.cr, G.fl, P4)
      const hx = Math.hypot(ax.x - cb.x, ay.x - cb.x), hy = Math.hypot(ax.y - cb.y, ay.y - cb.y)
      let x0 = Math.min(cb.x, ct.x) - hx, x1 = Math.max(cb.x, ct.x) + hx, y0 = Math.min(cb.y, ct.y) - hy, y1 = Math.max(cb.y, ct.y) + hy
      const nb = prj(x + G.pitch, 0, G.fl, P3)
      const pitchPx = Math.hypot(nb.x - cb.x, nb.y - cb.y)
      if (!T.mob) {
        const cx = (x0 + x1) / 2, w = Math.max(x1 - x0, pitchPx * 0.94)
        x0 = cx - w / 2; x1 = cx + w / 2; y0 -= 16; y1 += 12
      } else {
        const cy = (y0 + y1) / 2, h = Math.max(y1 - y0, pitchPx * 0.94)
        y0 = cy - h / 2; y1 = cy + h / 2
        const cx = (x0 + x1) / 2, w = Math.max(x1 - x0 + 30, 84)
        x0 = cx - w / 2; x1 = cx + w / 2
      }
      const b = btns[i]
      const key = Math.round(x0) + ',' + Math.round(y0) + ',' + Math.round(x1 - x0) + ',' + Math.round(y1 - y0)
      if (b._k !== key) {
        b._k = key
        b.style.transform = 'translate(' + x0.toFixed(1) + 'px,' + y0.toFixed(1) + 'px)'
        b.style.width = (x1 - x0).toFixed(1) + 'px'
        b.style.height = (y1 - y0).toFixed(1) + 'px'
      }
    }
  }

  function bindStack(b, i) {
    b.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') hoverStack(i) })
    b.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && S.hov === i) hoverStack(-1) })
    b.addEventListener('focus', () => { if (S.ptr === 'keyboard') hoverStack(i) })
    b.addEventListener('blur', () => { if (S.hov === i) hoverStack(-1) })
    b.addEventListener('click', () => takeCoin(i))
  }
  function hoverStack(i) {
    if (S.hov === i) return
    S.hov = i
    T.dirty = true
    if (i >= 0 && S.stacks[i] > 0) App.audio.sfx('coin', { volume: 0.2, pitch: 1.25 + Math.random() * 0.25, pan: (i - 7) / 8 })
  }
  function syncStackBtn(i) {
    const b = S.E.stackBtns[i]
    b.setAttribute('aria-label', stackLabel(i))
    if (S.stacks[i] <= 0) {
      b.disabled = true
      b.removeAttribute('data-cursor')
      if (S.hov === i) S.hov = -1
    }
  }
  function stackTop(i) {
    const r = S.E.trayWrap.getBoundingClientRect()
    const x = G.x0 + i * G.pitch, z = G.fl + S.stacks[i] * G.ct + T.lift[i]
    const p = prj(x, 0, z, {}), pa = prj(x + G.cr, 0, z, P1)
    return { x: r.left + p.x, y: r.top + p.y, r: Math.max(6, Math.hypot(pa.x - p.x, pa.y - p.y)) }
  }
  function takeCoin(i) {
    if (S.stacks[i] <= 0) return
    const from = stackTop(i)
    S.stacks[i]--
    T.dirty = true
    syncStackBtn(i)
    App.audio.sfx('coin', { volume: 0.75, pitch: 0.92 + Math.random() * 0.12, pan: (i - 7) / 8 })
    melt(() => from, { gold: true, dur: 0.5 })
    fly({ from, to: purseC, dur: U.rand(0.72, 0.9), arc: T.mob ? 0.25 : U.rand(0.38, 0.5), size: from.r, arrive: () => gain(1) })
    if (trayLeft() === 0 && !S.reduced) gsap.delayedCall(0.9, () => App.glitch && App.glitch(S.E.purseN, 0.3))
  }
  function gain(k) {
    setCoins(S.coins + k)
    S.shown = Math.min(S.coins, S.shown + k)
    paintPurse(true)
    ring()
    if (S.quoted) renderNeed(S.quoted._it) // 报价跟着钱袋更新：空心的币被一枚枚填上
    App.audio.sfx('coin', { volume: 0.42, pitch: 1.42 + Math.random() * 0.2, pan: 0.7 })
    melt(purseC, { gold: true, dur: 0.55 })
  }
  function trayHint() {
    gsap.killTweensOf(T, 'hint')
    gsap.fromTo(T, { hint: 1 }, { hint: 0, duration: 1.7, ease: 'power1.out' })
  }
  function traySweep() {
    S.lastSweep = performance.now()
    gsap.killTweensOf(T, 'sweep')
    gsap.fromTo(T, { sweep: -3 }, { sweep: NST + 3, duration: 1.8, ease: 'power1.inOut' })
  }

  /* =====================================================================
     视口特效层：飞行的金币、熔光、墨、退出之门、光里的浮尘
     ===================================================================== */
  const FX = { cv: null, ctx: null, w: 1, h: 1, dpr: 1, fl: [], melts: [], pools: [], dust: [], door: null, ox: 0, oy: 0, frame: 0, pc: null, on: false, sprites: {} }
  // 光里的浮尘单独画在一张小画布上：浮尘只在离光约 340px 以内看得见（再远亮度不到 6%），画布只盖住光圈附近、跟着光平移（transform），
  // 约 24 帧/秒（浮尘漂得很慢；滚动时停住）。整屏的特效画布只在有金币飞行、熔光、墨、退出之门时才显示，闲着时不显示也不占显存。
  const DU = { cv: null, ctx: null, D: 680, dpr: 1, on: false, t: 0, x: 1e9, y: 1e9 }

  function fxInit() {
    FX.cv = S.E.fxCv
    FX.ctx = FX.cv.getContext('2d')
    DU.cv = S.E.dustCv
    DU.ctx = DU.cv.getContext('2d')
    FX.cv.style.display = 'none'
    DU.cv.style.display = 'none'
    FX.cv.width = FX.cv.height = 0
    fxResize()
    fxDust()
  }
  // 光里的浮尘：全效果 150 粒，降一级 70 粒，最省时不要
  function fxDust() {
    const n = S.fine && !S.reduced ? (S.q >= 2 ? 150 : S.q === 1 ? 70 : 0) : 0
    if (FX.dust.length > n) FX.dust.length = n
    while (FX.dust.length < n) FX.dust.push({ x: Math.random(), y: Math.random(), vx: U.rand(-0.006, 0.006), vy: U.rand(-0.016, -0.003), r: U.rand(0.4, 1.4), ph: U.rand(0, TAU), z: U.rand(0.35, 1) })
  }
  function fxResize() {
    // 尺寸取自视口层容器（画布闲着时不显示）；画质降级时分辨率降到 1 倍
    const w = S.E.fx.clientWidth, h = S.E.fx.clientHeight
    const dpr = Math.min(window.devicePixelRatio || 1, S.q >= 2 ? 1.5 : 1)
    if (!w || !h) return
    if (w !== FX.w || h !== FX.h || dpr !== FX.dpr) { FX.w = w; FX.h = h; FX.dpr = dpr; FX.sprites = {} }
    if (FX.on) {
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr)
      if (FX.cv.width !== cw || FX.cv.height !== ch) { FX.cv.width = cw; FX.cv.height = ch }
    }
    DU.dpr = dpr
    if (DU.on) dustSize()
  }
  function fxShow() { FX.on = true; FX.cv.style.display = ''; fxResize() }
  function fxHide() { FX.on = false; FX.cv.style.display = 'none'; FX.cv.width = FX.cv.height = 0 }
  function dustSize() { const s = Math.round(DU.D * DU.dpr); if (DU.cv.width !== s) { DU.cv.width = DU.cv.height = s; DU.t = 0 } }
  function dustShow() { DU.on = true; DU.cv.style.display = ''; dustSize() }
  function dustHide() { DU.on = false; DU.cv.style.display = 'none' }
  function purseC() {
    if (FX.pc && FX.pc.f === FX.frame) return FX.pc
    const r = S.E.purseIco.getBoundingClientRect()
    FX.pc = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, f: FX.frame }
    return FX.pc
  }

  function fly(o) {
    FX.fl.push({
      from: o.from, to: o.to, t: -(o.delay || 0), dur: o.dur || 0.8, arc: o.arc == null ? 0.4 : o.arc,
      s0: o.size || 10, spin: U.rand(0, TAU), spinV: U.rand(9, 15), bend: U.rand(-0.22, 0.22),
      trail: [], arrive: o.arrive, x: 0, y: 0, size: o.size || 10, tilt: U.rand(-0.5, 0.5),
    })
  }
  function melt(at, o) {
    o = o || {}
    const n = o.gold ? 5 : 8
    FX.melts.push({ at, t: 0, dur: o.dur || 0.95, gold: !!o.gold, sp: Array.from({ length: n }, () => ({ a: U.rand(-Math.PI * 0.95, -Math.PI * 0.05), v: U.rand(22, 70), r: U.rand(0.7, 1.6) })) })
  }
  // 一滴墨落在光标处、晕开（坐标相对于板块根元素）
  function inkPool(x, y, w) {
    const blobs = [{ dx: 0, dy: 0, r: 15, d: 0 }]
    for (let k = 0; k < 6; k++) {
      const a = U.rand(0, TAU), d = U.rand(6, 16)
      blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.6, r: U.rand(6, 11), d: U.rand(0.02, 0.12) })
    }
    const spat = []
    for (let k = 0; k < 11; k++) {
      const a = U.rand(0, TAU), d = U.rand(22, 30 + w * 0.22)
      spat.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.55, r: U.rand(0.8, 2.6), d: U.rand(0.03, 0.2) })
    }
    FX.pools.push({ x, y, t: 0, blobs, spat, ring: U.rand(0, TAU) })
  }

  function coinSprite(kind, rad) {
    const key = kind + ':' + Math.round(rad * 4)
    if (FX.sprites[key]) return FX.sprites[key]
    const d = FX.dpr, s = Math.ceil((rad * 2 + 4) * d)
    const cv = document.createElement('canvas'); cv.width = cv.height = s
    const g = cv.getContext('2d')
    const c = s / 2, R = rad * d
    const pal = kind === 'mine' ? ['#fffbe6', '#ffd978', '#d99b2c', '#7a4c0e'] : kind === 'rust' ? ['#c25a4a', '#7d1616', '#4a0c0c', '#200404'] : ['#fff1c4', '#eec060', '#b98126', '#5e3a0a']
    const gr = g.createRadialGradient(c - R * 0.35, c - R * 0.4, 0, c, c, R)
    gr.addColorStop(0, pal[0]); gr.addColorStop(0.3, pal[1]); gr.addColorStop(0.72, pal[2]); gr.addColorStop(1, pal[3])
    g.fillStyle = gr
    g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill()
    g.strokeStyle = kind === 'rust' ? 'rgba(20,2,2,.6)' : 'rgba(90,55,8,.6)'
    g.lineWidth = Math.max(0.6, R * 0.12)
    g.beginPath(); g.arc(c, c, R * 0.72, 0, TAU); g.stroke()
    FX.sprites[key] = cv
    return cv
  }

  function fxTick(dt, now) {
    const busy = FX.fl.length || FX.melts.length || FX.pools.length || FX.door
    const r = S.fxr
    if (r) { FX.ox = r.left; FX.oy = r.top }
    if (FX.dust.length) dustTick(dt, now)
    else if (DU.on) dustHide()
    if (!busy) { if (FX.on) fxHide(); return }
    if (!FX.on) fxShow()
    FX.frame++
    const ctx = FX.ctx
    ctx.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, FX.w, FX.h)
    if (FX.door) drawDoor(ctx, now, dt)
    if (FX.pools.length) drawPools(ctx, dt)
    if (FX.fl.length) { stepFlights(dt); drawFlights(ctx) }
    if (FX.melts.length) drawMelts(ctx, dt)
  }
  // 浮尘：光圈附近一粒也没亮着时整张画布不显示
  function dustTick(dt, now) {
    // 滚动时浮尘停住（画布跟着视口，停一下看不出来；滚动中整屏都在动，不必再为它重画）
    if (S.scrolling) return
    stepDust(dt)
    if (!dustLit()) { if (DU.on) dustHide(); return }
    if (DU.on && now - DU.t < 41) return
    if (!DU.on) dustShow()
    DU.t = now
    const half = DU.D / 2, d = DU.dpr
    // 画布以光为中心（视口层坐标），对齐设备像素
    const x = Math.round((L.x - FX.ox - half) * d) / d, y = Math.round((L.y - FX.oy - half) * d) / d
    if (x !== DU.x || y !== DU.y) { DU.x = x; DU.y = y; DU.cv.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)' }
    const ctx = DU.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, DU.cv.width, DU.cv.height)
    ctx.setTransform(d, 0, 0, d, -x * d, -y * d)
    drawDust(ctx)
  }

  function stepFlights(dt) {
    for (let i = FX.fl.length - 1; i >= 0; i--) {
      const f = FX.fl[i]
      f.t += dt / f.dur
      if (f.t < 0) continue
      const e = easeIO(Math.min(1, f.t))
      const A = typeof f.from === 'function' ? f.from() : f.from
      const B = typeof f.to === 'function' ? f.to() : f.to
      const d = Math.hypot(B.x - A.x, B.y - A.y)
      const mx = (A.x + B.x) / 2 + (B.y - A.y) * f.bend, my = Math.min(A.y, B.y) - d * f.arc
      const u = 1 - e
      f.x = u * u * A.x + 2 * u * e * mx + e * e * B.x
      f.y = u * u * A.y + 2 * u * e * my + e * e * B.y
      f.size = f.s0 + ((B.r || f.s0) - f.s0) * e
      f.spin += f.spinV * dt
      f.trail.push(f.x, f.y)
      if (f.trail.length > (S.reduced ? 4 : 30)) f.trail.splice(0, 2)
      if (f.t >= 1) {
        FX.fl.splice(i, 1)
        if (f.arrive) { try { f.arrive() } catch (err) { console.error(err) } }
      }
    }
  }
  function drawFlights(ctx) {
    const ox = FX.ox, oy = FX.oy
    ctx.lineCap = 'round'
    for (const f of FX.fl) {
      if (f.t < 0) continue
      const tr = f.trail, n = tr.length / 2
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 1; i < n; i++) {
        const a = i / n
        ctx.strokeStyle = 'rgba(255,190,90,' + (0.34 * a * a).toFixed(3) + ')'
        ctx.lineWidth = Math.max(0.5, f.size * 1.1 * a)
        ctx.beginPath()
        ctx.moveTo(tr[2 * i - 2] - ox, tr[2 * i - 1] - oy)
        ctx.lineTo(tr[2 * i] - ox, tr[2 * i + 1] - oy)
        ctx.stroke()
      }
      const x = f.x - ox, y = f.y - oy
      const gl = ctx.createRadialGradient(x, y, 0, x, y, f.size * 2.8)
      gl.addColorStop(0, 'rgba(255,206,120,.42)'); gl.addColorStop(1, 'rgba(255,170,60,0)')
      ctx.fillStyle = gl
      ctx.fillRect(x - f.size * 2.8, y - f.size * 2.8, f.size * 5.6, f.size * 5.6)
      ctx.globalCompositeOperation = 'source-over'
      // 翻转的金币：宽度随转角变化，侧面朝向时露出边缘
      const cs = Math.cos(f.spin)
      const rx = Math.max(f.size * Math.abs(cs), f.size * 0.14), ry = f.size
      const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry)
      const bright = 0.75 + 0.35 * Math.abs(Math.sin(f.spin * 0.5))
      g.addColorStop(0, rgba(ramp(GOLD, 0.5 * bright)))
      g.addColorStop(0.45, rgba(ramp(GOLD, 1.05 * bright)))
      g.addColorStop(1, rgba(ramp(GOLD, 0.42 * bright)))
      ctx.fillStyle = g
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, f.tilt, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(90,55,8,.7)'; ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }
  function drawMelts(ctx, dt) {
    const ox = FX.ox, oy = FX.oy
    ctx.globalCompositeOperation = 'lighter'
    for (let i = FX.melts.length - 1; i >= 0; i--) {
      const m = FX.melts[i]
      m.t += dt / m.dur
      if (m.t >= 1) { FX.melts.splice(i, 1); continue }
      const p = m.at()
      const x = p.x - ox, y = p.y - oy, e = m.t
      const a = (1 - e) * (1 - e)
      const r = m.gold ? 4 + 22 * easeOut(e) : 5 + 34 * easeOut(e)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      if (m.gold) {
        g.addColorStop(0, 'rgba(255,248,220,' + (0.8 * a).toFixed(3) + ')')
        g.addColorStop(0.4, 'rgba(255,200,100,' + (0.45 * a).toFixed(3) + ')')
        g.addColorStop(1, 'rgba(255,170,60,0)')
      } else {
        g.addColorStop(0, 'rgba(255,250,232,' + a.toFixed(3) + ')')
        g.addColorStop(0.28, 'rgba(255,200,104,' + (0.85 * a).toFixed(3) + ')')
        g.addColorStop(0.62, 'rgba(255,108,32,' + (0.38 * a).toFixed(3) + ')')
        g.addColorStop(1, 'rgba(255,80,20,0)')
      }
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(255,196,120,' + (0.5 * a).toFixed(3) + ')'
      ctx.lineWidth = 1.1
      ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, TAU); ctx.stroke()
      for (const s of m.sp) {
        const d = s.v * easeOut(e)
        const sx = x + Math.cos(s.a) * d, sy = y + Math.sin(s.a) * d + 70 * e * e
        ctx.fillStyle = 'rgba(255,' + ((200 - 90 * e) | 0) + ',90,' + a.toFixed(3) + ')'
        ctx.beginPath(); ctx.arc(sx, sy, s.r * (1 - e * 0.5), 0, TAU); ctx.fill()
      }
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  function drawPools(ctx, dt) {
    const rr = S.rr || S.el.getBoundingClientRect()
    const ox = FX.ox - rr.left, oy = FX.oy - rr.top
    for (let i = FX.pools.length - 1; i >= 0; i--) {
      const p = FX.pools[i]
      p.t += dt
      if (p.t > 3.6) { FX.pools.splice(i, 1); continue }
      const fade = 1 - smooth(1.8, 3.6, p.t)
      const cx = p.x - ox, cy = p.y - oy
      // 墨滴：几团硬边的黑，彼此相融
      for (const b of p.blobs) {
        const k = easeOut(clamp((p.t - b.d) / 0.42))
        if (k <= 0) continue
        const r = b.r * (0.25 + 0.75 * k) * (1 + 0.16 * p.t)
        const x = cx + b.dx * (0.6 + 0.4 * k), y = cy + b.dy * (0.6 + 0.4 * k)
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, 'rgba(8,4,4,' + (0.82 * fade).toFixed(3) + ')')
        g.addColorStop(0.72, 'rgba(8,4,4,' + (0.62 * fade).toFixed(3) + ')')
        g.addColorStop(1, 'rgba(8,4,4,0)')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill()
      }
      // 溅开的细点
      ctx.fillStyle = 'rgba(8,4,4,' + (0.8 * fade).toFixed(3) + ')'
      for (const s of p.spat) {
        const k = easeOut(clamp((p.t - s.d) / 0.3))
        if (k <= 0) continue
        ctx.beginPath(); ctx.arc(cx + s.dx * k, cy + s.dy * k, s.r, 0, TAU); ctx.fill()
      }
      // 墨在水里晕开的一圈淡环
      const e = clamp(p.t / 1.6)
      if (e < 1) {
        ctx.strokeStyle = 'rgba(8,4,4,' + (0.38 * (1 - e)).toFixed(3) + ')'
        ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.ellipse(cx, cy, 16 + 70 * easeOut(e), (16 + 70 * easeOut(e)) * 0.5, 0, 0, TAU); ctx.stroke()
      }
    }
  }
  function stepDust(dt) {
    for (const d of FX.dust) {
      d.x += d.vx * dt; d.y += d.vy * dt; d.ph += dt * 1.2
      if (d.y < -0.02) d.y += 1.04
      if (d.x < -0.02) d.x += 1.04
      else if (d.x > 1.02) d.x -= 1.04
    }
  }
  function dustLit() {
    const lx = L.x - FX.ox, ly = L.y - FX.oy, R2 = DUST_R * DUST_R
    for (const d of FX.dust) {
      const px = d.x * FX.w + Math.sin(d.ph) * 7, py = d.y * FX.h
      if ((px - lx) * (px - lx) + (py - ly) * (py - ly) < R2) return true
    }
    return false
  }
  const DUST_R = 340 // 浮尘的可见半径（= 小画布的一半）
  function drawDust(ctx) {
    const lx = L.x - FX.ox, ly = L.y - FX.oy
    const R = 210, R2 = R * R, C2 = DUST_R * DUST_R
    ctx.globalCompositeOperation = 'lighter'
    for (const d of FX.dust) {
      const px = d.x * FX.w + Math.sin(d.ph) * 7, py = d.y * FX.h
      const dd = (px - lx) * (px - lx) + (py - ly) * (py - ly)
      if (dd > C2) continue
      const b = Math.exp(-dd / R2) * (0.55 + 0.45 * Math.sin(d.ph * 2.3)) * d.z * L.f
      if (b < 0.03) continue
      ctx.fillStyle = 'rgba(255,226,172,' + (b * 0.85).toFixed(3) + ')'
      ctx.beginPath(); ctx.arc(px, py, d.r * (0.6 + d.z * 0.8), 0, TAU); ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  /* ---------- 退出之门：500 个空位，只有馆里现存的金币能填进去 ---------- */
  const DOOR_COLS = 16
  let DOOR = null
  function doorGeom() {
    if (DOOR) return DOOR
    const c = DOOR_COLS, r0 = c / 2
    let pts = []
    let R = 18
    for (; R < 40; R++) {
      pts = []
      for (let row = 0; row < R + r0 + 1; row++) {
        for (let col = 0; col < c; col++) {
          const x = col + 0.5, y = row + 0.5
          if (y <= R) pts.push({ x, y })
          else { const dx = x - c / 2, dy = y - R; if (dx * dx + dy * dy <= r0 * r0) pts.push({ x, y }) }
        }
      }
      if (pts.length >= 500) break
    }
    // 多出的从拱顶两端对称去掉
    while (pts.length > 500) {
      const topY = Math.max.apply(null, pts.map(p => p.y))
      const row = pts.filter(p => p.y === topY).sort((a, b) => Math.abs(b.x - c / 2) - Math.abs(a.x - c / 2))
      pts.splice(pts.indexOf(row[0]), 1)
    }
    pts.sort((a, b) => a.y - b.y || a.x - b.x)
    DOOR = { pts, R, H: Math.max.apply(null, pts.map(p => p.y)) + 0.6, cols: c }
    return DOOR
  }
  function drawDoor(ctx, now, dt) {
    const D = FX.door
    const tIn = (now - D.t0) / 1000
    let vis = smooth(0, 0.35, tIn)
    if (!D.on) {
      const k = 1 - clamp((now - D.tOff) / 380)
      vis *= k
      if (k <= 0) { FX.door = null; return }
    }
    const geo = doorGeom()
    const ox = FX.ox, oy = FX.oy
    const sr = S.E.exit.getBoundingClientRect()
    // 幕：留出离场那一条（边缘羽化）
    const hx = sr.left - ox - 16, hy = sr.top - oy - 10, hw = sr.width + 32, hh = sr.height + 20
    ctx.fillStyle = 'rgba(4,3,3,' + (0.8 * vis).toFixed(3) + ')'
    ctx.fillRect(0, 0, FX.w, FX.h)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.shadowColor = 'rgba(0,0,0,' + (0.92 * vis).toFixed(3) + ')'
    ctx.shadowBlur = 26
    ctx.shadowOffsetX = FX.w * 3 * FX.dpr
    ctx.fillStyle = '#000'
    ctx.fillRect(hx - FX.w * 3, hy, hw, hh)
    ctx.restore()
    // 门立在离场那一条的上方（上方放不下就立在下方），尽量高
    const up = sr.top - oy - 28, down = FX.h - (sr.bottom - oy) - 28
    const below = up < 300 && down > up
    const room = below ? down : up
    const Hpx = clamp(Math.min(room - 70, FX.h * 0.72), 150, 660)
    const base = below ? sr.bottom - oy + 26 + Hpx : up
    const p = Hpx / geo.H
    const Wd = geo.cols * p
    const cx = clamp(sr.left - ox + sr.width / 2, Wd / 2 + 60, Math.max(Wd / 2 + 60, FX.w - Wd / 2 - 60))
    const x0 = cx - Wd / 2
    D.jolt *= Math.pow(0.0015, dt)
    const jolt = D.jolt
    // 门框
    const pad = p * 0.55, Rr = geo.R * p, rad = Wd / 2 + pad
    const fp = easeOut(clamp((tIn - 0.05) / 0.7))
    const len = Rr * 2 + Math.PI * rad + 2 * pad
    // 门洞：比幕更深的黑
    ctx.fillStyle = 'rgba(2,1,1,' + (0.82 * vis).toFixed(3) + ')'
    ctx.beginPath()
    ctx.moveTo(x0 - pad, base + pad * 0.4)
    ctx.lineTo(x0 - pad, base - Rr)
    ctx.arc(cx, base - Rr, rad, Math.PI, 0)
    ctx.lineTo(x0 + Wd + pad, base + pad * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.setLineDash([len * fp, len])
    ctx.strokeStyle = 'rgba(194,154,91,' + (0.6 * vis).toFixed(3) + ')'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0 - pad, base + pad * 0.4)
    ctx.lineTo(x0 - pad, base - Rr)
    ctx.arc(cx, base - Rr, rad, Math.PI, 0)
    ctx.lineTo(x0 + Wd + pad, base + pad * 0.4)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(194,154,91,' + (0.22 * vis).toFixed(3) + ')'
    ctx.beginPath()
    ctx.moveTo(x0 - pad * 2.2, base + pad * 0.4)
    ctx.lineTo(x0 - pad * 2.2, base - Rr)
    ctx.arc(cx, base - Rr, rad + pad * 1.2, Math.PI, 0)
    ctx.lineTo(x0 + Wd + pad * 2.2, base + pad * 0.4)
    ctx.stroke()
    ctx.restore()
    // 数：盘里的 + 钱袋里的 + 熔掉的
    const tray = trayLeft(), mine = S.coins, spent = Math.min(S.spent, 500)
    const goldN = Math.min(500, tray + mine)
    const n1 = Math.min(500, tray), n2 = goldN, n3 = Math.min(500, goldN + spent)
    const rr = p * 0.34, cr = p * 0.4
    const step = 0.9 / Math.max(150, goldN)
    if (!D.sfx && tIn > 0.6 && D.on && goldN > 0) { D.sfx = true; App.audio.sfx('coins', { volume: 0.5, pitch: 0.85 }) }
    // 空位：按行呼吸
    ctx.lineWidth = 1
    let row = -1, rowA = 0
    ctx.beginPath()
    const flushRow = () => {
      if (row < 0) return
      ctx.strokeStyle = 'rgba(235,227,214,' + rowA.toFixed(3) + ')'
      ctx.stroke()
      ctx.beginPath()
    }
    const pts = geo.pts
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i]
      const ta = 0.1 + (i / 500) * 0.55
      const ra = clamp((tIn - ta) / 0.2) * vis
      if (ra <= 0) continue
      const filled = i < n3 && clamp((tIn - (0.6 + i * step)) / 0.26) >= 1
      if (filled) continue
      const ry = Math.floor(pt.y)
      if (ry !== row) {
        flushRow()
        row = ry
        rowA = (0.13 + 0.1 * (0.5 + 0.5 * Math.sin(tIn * 2.2 - ry * 0.32)) + jolt * 0.5) * ra
      }
      const x = x0 + pt.x * p, y = base - pt.y * p + jolt * p * 0.5 * Math.sin(i * 1.7)
      ctx.moveTo(x + rr, y)
      ctx.arc(x, y, rr, 0, TAU)
    }
    flushRow()
    // 金币落进空位
    for (let i = 0; i < n3; i++) {
      const pt = pts[i]
      const k = clamp((tIn - (0.6 + i * step)) / 0.26)
      if (k <= 0) break
      const kind = i < n1 ? 'gold' : i < n2 ? 'mine' : 'rust'
      const spr = coinSprite(kind, cr)
      const drop = (1 - bounce(k)) * p * 1.6
      const x = x0 + pt.x * p, y = base - pt.y * p - drop + jolt * p * 0.7 * Math.sin(i * 2.3)
      ctx.globalAlpha = Math.min(1, k * 3) * vis
      const s = spr.width / FX.dpr
      ctx.drawImage(spr, x - s / 2, y - s / 2, s, s)
    }
    ctx.globalAlpha = 1
    // 两个数：现存的金币 / 500
    const la = smooth(0.7, 1.3, tIn) * vis
    if (la > 0.01) {
      const fs = Math.round(clamp(p * 1.7, 15, 30))
      ctx.font = '700 ' + fs + 'px Cinzel, serif'
      ctx.textBaseline = 'middle'
      const rows = Math.ceil(goldN / geo.cols)
      const yf = base - Math.max(0.5, rows) * p
      ctx.fillStyle = 'rgba(232,184,92,' + la.toFixed(3) + ')'
      ctx.textAlign = 'right'
      ctx.fillText(String(goldN), x0 - pad * 3.2, yf)
      ctx.strokeStyle = 'rgba(232,184,92,' + (la * 0.45).toFixed(3) + ')'
      ctx.setLineDash([2, 4])
      ctx.beginPath(); ctx.moveTo(x0 - pad * 2.9, yf); ctx.lineTo(x0 - pad * 0.6, yf); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(235,227,214,' + (la * 0.9).toFixed(3) + ')'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(String(EXIT.coins), cx, base - Rr - rad - pad * 2.6)
    }
  }

  /* =====================================================================
     钱袋
     ===================================================================== */
  function paintPurse(pop) {
    const E = S.E
    E.purseN.textContent = String(S.shown)
    E.purse.classList.toggle('is-empty', S.shown <= 0)
    if (pop && !S.reduced) gsap.fromTo(E.purseIco, { scale: 1.35, rotate: -16 }, { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(3)', overwrite: true })
  }
  // 钱袋收到金币：一圈金光从币上漾开
  function ring() {
    const P = S.E.purse
    P.classList.remove('is-gain')
    void P.offsetWidth
    P.classList.add('is-gain')
    clearTimeout(S.gainT)
    S.gainT = setTimeout(() => P.classList.remove('is-gain'), 700)
  }
  // 庭审赢得的金币：从上方（庭审那一边）落进钱袋
  function rainIn() {
    const n = S.rain
    S.rain = 0
    const vis = Math.min(n, S.reduced ? 5 : 30)
    let got = 0
    App.audio.sfx('coins', { volume: 0.7 })
    for (let k = 0; k < vis; k++) {
      const from = { x: window.innerWidth * U.rand(0.4, 0.96), y: -30 - U.rand(0, 90) }
      fly({
        from, to: purseC, dur: U.rand(0.85, 1.25), arc: 0.06, size: U.rand(8, 12), delay: k * 0.07,
        arrive: () => {
          const tgt = Math.round((n * (k + 1)) / vis)
          S.shown = Math.min(S.coins, S.shown + (tgt - got))
          got = tgt
          paintPurse(true)
          ring()
          if (k % 3 === 0) App.audio.sfx('coin', { volume: 0.35, pitch: 1.3 + Math.random() * 0.3 })
        },
      })
    }
  }

  /* =====================================================================
     入场
     ===================================================================== */
  function intro() {
    const E = S.E, root = S.el
    const titles = S.eng.filter(e => e.kind === 't')
    if (!window.ScrollTrigger || S.reduced) for (const e of titles) e.vis = 1
    if (!window.ScrollTrigger) return
    if (S.reduced) {
      ScrollTrigger.create({ trigger: E.table, start: 'top 85%', once: true, onEnter: traySweep })
      return
    }
    root.classList.add('is-armed')
    ScrollTrigger.create({
      trigger: E.wall, start: 'top 80%', once: true,
      onEnter: () => {
        gsap.to(E.cap, { opacity: 1, duration: 1.4, ease: 'power2.out' })
        gsap.fromTo(E.tch, { opacity: 0, scale: 1.16, filter: 'blur(16px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.7, stagger: 0.2, ease: 'expo.out', clearProps: 'filter,transform' })
        // 标题的阴阳边（影子副本）跟着字一起浮现、一起缩回原大
        gsap.fromTo(titles, { vis: 0, sc: 1.16 }, { vis: 1, sc: 1, duration: 1.7, stagger: 0.2, ease: 'expo.out' })
        gsap.fromTo(S, { titleBoost: 1 }, { titleBoost: 0, duration: 2.6, ease: 'power2.out', delay: 0.5 })
        gsap.to(E.orn, { opacity: 1, duration: 1.4, delay: 0.6 })
      },
    })
    // 逐行刻出：原字与它的影子副本同一节奏；刻完后撤掉 clip-path（免得合成层的影子副本一直挂着裁切遮罩）
    const reveal = (els, stagger) => gsap.to(els, {
      clipPath: 'inset(-40% -3% -40% -3%)', duration: 1, stagger, ease: 'power3.out',
      onComplete: () => gsap.set(els, { clipPath: 'none' }),
    })
    ScrollTrigger.batch(E.body.querySelectorAll('.plaque-reveal'), {
      start: 'top 94%', once: true, interval: 0.07, batchMax: 16,
      onEnter: batch => {
        reveal(batch, 0.04)
        for (let p = 0; p < (E.ghosts || []).length; p++) {
          const tw = batch.map(b => revealTwins(b)[p]).filter(Boolean)
          if (tw.length) reveal(tw, 0.04)
        }
      },
    })
    ScrollTrigger.create({ trigger: E.exit, start: 'top 92%', once: true, onEnter: () => E.exit.classList.add('is-in') })
    ScrollTrigger.create({
      trigger: E.table, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.fromTo(E.trayCv, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' })
        gsap.delayedCall(0.5, traySweep)
      },
    })
  }

  /* =====================================================================
     帧循环
     ===================================================================== */
  function tick(time, dtf) {
    const vw = window.innerWidth, vh = window.innerHeight
    // 按板块的实际位置判断：IntersectionObserver 在板块恰好贴着视口下沿时也算「相交」，
    // 那时（还在庭审里）特效画布会白白每帧重画
    let on = S.visible, rr = null
    if (on) { rr = S.el.getBoundingClientRect(); on = rr.bottom > 1 && rr.top < vh - 1 }
    if (on !== S.on) {
      S.on = on
      S.el.classList.toggle('is-off', !on)
      if (on) { T.dirty = true; measure() } else { if (FX.on) fxHide(); if (DU.on) dustHide(); parkLight() }
    }
    if (!on) return
    // 本帧要用的位置只在这里读一次（先读后写，不在帧中途触发重排）
    S.rr = rr
    // 正在滚动：刻字阴阳边、投影、理币盘降频更新（每 3–4 帧一次），浮尘停住，光层照常每帧跟随
    S.frame = (S.frame || 0) + 1
    if (S.lastTop != null && Math.abs(rr.top - S.lastTop) > 0.5) S.scrollF = S.frame
    S.lastTop = rr.top
    S.scrolling = S.frame - (S.scrollF || -99) < 6
    S.fxr = FX.dust.length || FX.on || FX.fl.length || FX.melts.length || FX.pools.length || FX.door ? S.E.fx.getBoundingClientRect() : null
    const now = performance.now()
    const dt = Math.min(0.064, dtf * 0.016667)
    const tgt = lightTarget(now)
    const k = 1 - Math.pow(1 - 0.16, dtf)
    L.x += (tgt[0] - L.x) * k
    L.y += (tgt[1] - L.y) * k
    // 光的微微闪烁：约 15 帧/秒取样（幅度只有几个百分点，取样稀一点看不出来；整屏的光层不必每帧重新合成）
    const fq = Math.floor(now / 66)
    if (fq !== S.fq) {
      S.fq = fq
      const tq = fq * 66
      L.f = S.reduced ? 1 : 0.955 + 0.03 * Math.sin(tq * 0.0093) + 0.015 * Math.sin(tq * 0.031 + 1.7)
    }
    plaqueLight(vw, vh)
    trayTick(dtf, vw, vh, now)
    fxTick(dt, now)
    // 别处改了钱袋（App.state.coins）→ 跟上
    if (typeof App.state.coins === 'number' && App.state.coins !== S.coins) {
      S.coins = Math.max(0, Math.floor(App.state.coins))
      S.shown = S.coins
      paintPurse(false)
    }
    if (S.rain > 0) {
      const pr = S.E.purse.getBoundingClientRect()
      if (pr.top < vh && pr.bottom > 0) rainIn()
    }
    // 钱袋空着时，理币盘隔一会儿亮一道光
    if (S.coins === 0 && trayLeft() > 0 && now - S.lastSweep > 7600) {
      const tr = S.E.trayWrap.getBoundingClientRect()
      if (tr.top < vh * 0.9 && tr.bottom > vh * 0.1) traySweep()
    }
  }

  // 板块离开视口时，把跟着光走的大光层停在墙的中央（它们比墙还大，停在墙边时会伸进相邻板块的视口区域；
  // 仍然保留栅格化结果，回来时不必重画）
  function parkLight() {
    const E = S.E, of = S.off
    if (!of) return
    const tw = 'translate3d(' + (of.wall.w / 2).toFixed(1) + 'px,' + (of.wall.h / 2).toFixed(1) + 'px,0)'
    put(E.dodge, 'transform', tw)
    put(E.wpool, 'transform', tw)
    put(E.spec, 'transform', 'translate3d(' + (of.face.w / 2).toFixed(1) + 'px,' + (of.face.h / 2).toFixed(1) + 'px,0)')
  }

  // 画质：2 全效果；1 画布降到 1–1.25 倍、浮尘减半；0 再关掉随光变化的刻字阴阳边、浮尘与两层混合光
  function applyQuality() {
    const q = App.quality && typeof App.quality.level === 'number' ? App.quality.level : 2
    S.q = q
    const live = q >= 1
    if (live !== S.live) {
      S.live = live
      S.el.classList.toggle('pq-live', live)
      buildGhosts()
    }
    fxDust()
    if (FX.cv) fxResize()
    if (T.cv) trayResize()
  }

  function mount(el) {
    S.el = el
    S.coins = S.shown = typeof App.state.coins === 'number' ? Math.max(0, Math.floor(App.state.coins)) : 0
    App.state.coins = S.coins
    S.q = App.quality && typeof App.quality.level === 'number' ? App.quality.level : 2
    build(el)
    paintPurse(false)
    genTextures(el)
    trayInit()
    fxInit()
    applyQuality()
    intro()
    requestAnimationFrame(measure)
    if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', () => { measure(); trayResize(); fxResize() })
    window.addEventListener('resize', U.debounce(() => { if (layoutCols()) buildGhosts(); measure(); trayResize(); fxResize(); if (S.quoted) placeNeed(S.quoted) }, 160))
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); T.dirty = true })
    App.bus.on('quality', applyQuality)
    // 远离视口（上下一屏以外）：画布释放显存；回来时重新分配并重画
    App.bus.on('section:far', id => {
      if (id !== 'plaque') return
      S.far = true
      if (T.cv) T.cv.width = T.cv.height = 0
      if (DU.cv) { dustHide(); DU.cv.width = DU.cv.height = 0 }
      if (FX.on) fxHide()
    })
    App.bus.on('section:near', id => {
      if (id !== 'plaque' || !S.far) return
      S.far = false
      if (T.cv) trayResize()
    })
    App.onVisible(el, v => {
      S.visible = v
      if (!v) { hideDoor(true); unquote(); S.hov = -1 }
    }, { rootMargin: '0px' })
    // 指针类型：触摸时第一下报价、第二下同意；光跟随手指，停手后慢慢游移
    window.addEventListener('pointerdown', e => {
      S.ptr = e.pointerType || 'mouse'
      if (e.pointerType === 'touch') { S.touchT = S.tapT = performance.now(); S.tap = { x: e.clientX, y: e.clientY } }
    }, true)
    window.addEventListener('touchstart', () => { S.touchT = performance.now() }, { passive: true })
    window.addEventListener('touchmove', () => { S.touchT = S.moveT = performance.now() }, { passive: true })
    window.addEventListener('keydown', e => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') S.ptr = 'keyboard' }, true)
    // 模拟庭审赢得的金币
    App.bus.on('trial:coins', n => {
      n = Math.floor(+n || 0)
      if (n <= 0) return
      setCoins(S.coins + n)
      S.rain += n
    })
    App.tick(tick)
  }

  App.section('plaque', {
    palette: { a: '#140e0a', b: '#e2b260', glow: 0.5 },
    track: 'gallery',
    mount,
    leave() { hideDoor(true); unquote() },
  })
})()
