/* ==========================================================
   庭审（trial）：可以玩的模拟庭审
   入局（默认八人）→ 发牌 → 受命与行凶（不可见）→ 发现 → 调查（灯亮着；按住压低侧光）→ 庭审（议事厅的门关上）
   → 处刑 → 余波 → 结案对账（真相回放，可跳过）→ 下一案 … → 终局（一案一行的总表）
   规则全部在 TrialEngine（trial-engine.js）里；这里只负责画面、声音与交互。
   称呼：广播、台词的 {X}{V}、证言卡用 callOf（馆里报的名字；同局重名或不报名时说「N号」）；名牌、档案用卡名。
   第二部分：
   - 调查：验尸弹出三格读数与时间刻度（你自己拖出死亡时间窗；医护者自动有一个窗）；死者衣袋里的金币可取走；
     「默念」兑换工具（鲁米诺要毛毯、指纹粉先问价、录音笔、拍立得）；询问得两段时间线，落在你的窗里的那段标亮。
   - 庭审：席位下的小点是你自己的笔记（拿起证物点人：✓ ✗ ?）；当众出示（每场三次）→ 反证或辩解与破绽；
     依次发言之后是公开讨论，举手（每场三次）可出示、对质（两张证言卡拖到桌心）、追问、附议、质疑、驳回误导。
   - 余波：本轮的几枚落在各人面前（没有累计账）；「下一案」之前默念吃饭、一夜安眠；钱够可以买退出券，持券离馆。
   - 钱袋是全站共用的 App.econ（开局 newGame；余波 gain；兑换 settle / pay；离馆 exit）。
   ========================================================== */
(function () {
  'use strict'
  const App = window.App
  const TE = window.TrialEngine
  if (!App || !TE) return
  const U = App.util
  const el = U.el
  const svg = U.svg
  const ABORT = { trialAbort: true }

  /* ---------- 色调与音乐 ---------- */
  const PAL = {
    intro: { a: '#15100b', b: '#c29a5b', glow: 0.34 },
    cine: { a: '#0b0607', b: '#7d1616', glow: 0.18 },
    inv: { a: '#0a0c0f', b: '#8d98a6', glow: 0.22 },
    court: { a: '#18080a', b: '#a3104a', glow: 0.42 },
    exec: { a: '#2b0717', b: '#ff2e7e', glow: 0.8 },
    after: { a: '#130e08', b: '#c29a5b', glow: 0.42 },
    end: { a: '#110c07', b: '#e2c48c', glow: 0.55 },
    dead: { a: '#040303', b: '#5b534d', glow: 0.06 },
  }
  const TRACK = { intro: 'gallery', deal: 'gallery', cine: 'silence', inv: 'investigation', court: 'trial', exec: 'trial', after: 'trial', end: 'wish', dead: 'silence' }

  const VERB = {
    knight: '揭发', executor: '表决', silencer: '封锁', puffer: '查询',
    judge: '加票', hanged: '反弹', fortune: '查验', shifter: '复制', magician: '交换', cupid: '结成恋人',
  }
  const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

  /* ---------- 状态 ---------- */
  const S = {
    sec: null, stage: null, E: {},
    seats: Array(15).fill(null), me: null, G: null,
    active: false, paused: false, token: 0, scene: 'intro', running: false,
    spectate: false, deadShown: false, visible: false,
    seat: [], geo: null,
    cards: [], tests: {}, armed: null, targeting: null,
    T: null, V: null, C: null,
    coins: 0, skippers: new Set(), lastTime: -1,
    notes: {},      // 你自己的推理笔记：notes[席上的人][证物 id] = 'ok' 相符 / 'no' 不符 / 'q' 存疑（纯本地标记，不问引擎）
    frame: null,    // 你在时间刻度上框出的死亡时间窗 [早, 晚]（局内分钟）
  }
  let def

  /* ==========================================================
     小工具
     ========================================================== */
  const charOf = id => App.char(id) || { id, name: id, lines: {}, stats: {} }
  const nameOf = id => charOf(id).name || id
  // 馆里怎么称呼此人（广播、台词、证言）：报的名字；同局重名或不报名时说「N号」
  const callOf = id => (S.G ? TE.callOf(S.G, id) : (charOf(id).callName || nameOf(id)))
  const hhmm = m => U.clock(m).text
  const dayText = m => '第' + U.cnNum(U.clock(m).day) + '日'
  const seatOf = id => (S.G && S.G.people[id] ? S.G.people[id].seat : S.seats.indexOf(id) + 1)
  const living = () => (S.G ? TE.livingIds(S.G) : [])
  const isMe = id => id && id === S.me
  const meAlive = () => S.G && S.me && TE.isLiving(S.G, S.me)

  function guard(tok) { if (tok !== S.token) throw ABORT }
  // 离席（暂停）期间停在这里，续局后再往下走；重来则中止
  function hold(tok) {
    if (tok !== S.token) return Promise.reject(ABORT)
    if (!S.paused) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const off = App.tick(() => {
        if (tok !== S.token) { off(); reject(ABORT) } else if (!S.paused) { off(); resolve() }
      })
    })
  }
  // 动画 Promise：重来/换座之后不再继续；离席时动画放完就停住，不在别的板块里闪光、出声
  function anim(make) {
    const tok = S.token
    return new Promise((resolve, reject) => make(() => (tok === S.token ? resolve() : reject(ABORT)))).then(() => hold(tok))
  }
  // 斜切转场：中途的场景切换只在本局仍有效时执行
  function slash(midway, opts) {
    const tok = S.token
    return App.slash(() => { if (tok === S.token && midway) midway() }, opts).then(() => guard(tok)).then(() => hold(tok))
  }
  // 可跳过、可暂停的等待
  function wait(ms, skippable = true) {
    const tok = S.token
    return new Promise((resolve, reject) => {
      let left = ms, last = performance.now(), fin = false
      const sk = () => done(true)
      const off = App.tick(() => {
        if (tok !== S.token) return done(false)
        const now = performance.now()
        if (!S.paused) left -= now - last
        last = now
        if (left <= 0) done(true)
      })
      function done(ok) {
        if (fin) return
        fin = true
        off()
        S.skippers.delete(sk)
        ok ? resolve() : reject(ABORT)
      }
      if (skippable) S.skippers.add(sk)
    })
  }
  // 离席（遮幕在上）时不跳：点遮幕的空白处不能让对局在暂停中往前走
  function skipAll() { if (S.paused) return; for (const f of Array.from(S.skippers)) f() }
  // 等待玩家输入：setup(resolve) 安装处理器并返回清理函数
  function ask(setup) {
    const tok = S.token
    return new Promise((resolve, reject) => {
      let fin = false, cleanup = null
      const off = App.tick(() => { if (tok !== S.token) end(false) })
      function end(ok, v) {
        if (fin) return
        fin = true
        off()
        if (cleanup) try { cleanup() } catch (e) { /* */ }
        ok ? resolve(v) : reject(ABORT)
      }
      cleanup = setup(v => end(true, v))
    })
  }
  // quiet：动作描写（格里菲斯的台词）逐字浮现但不出打字声
  async function typeIn(node, text, speed = 24, quiet = false) {
    const tok = S.token
    node.textContent = ''
    node.classList.add('trial-caret')
    let skipped = false
    const sk = () => { skipped = true }
    S.skippers.add(sk)
    const chars = Array.from(text || '')
    try {
      for (let i = 0; i < chars.length; i++) {
        guard(tok)
        if (skipped) break
        node.textContent += chars[i]
        if (!quiet && i % 2 === 0 && chars[i].trim()) App.audio.sfx('type')
        const ch = chars[i]
        await wait(/[。！？…]/.test(ch) ? speed * 5 : /[，、；：]/.test(ch) ? speed * 2.4 : speed, false)
      }
    } finally { S.skippers.delete(sk) }
    node.textContent = text || ''
    node.classList.remove('trial-caret')
  }
  /* ==========================================================
     台词：按场合从台词池（assets/data/lines/*.js）抽句
     同一局里同一人同一场合不重复（洗牌袋，用完再洗）；缺占位符所需的数据时换一句不含它的；
     池里没有可用的就回落到人物卡的那一句，再不行就是「……」。用 Math.random，不碰引擎的随机数。
     ========================================================== */
  const Lines = { bags: {}, last: {}, log: [] }
  const linePool = (id, key) => { const P = window.TRIAL_LINES, a = P && P[id] && P[id][key]; return Array.isArray(a) ? a : [] }
  const holes = s => Array.from(String(s).matchAll(/\{(\w+)\}/g), m => m[1])
  const fillLine = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m))
  // 整句以（开头、）结尾的是动作描写（格里菲斯不能说话）：不加引号、斜体、无打字声
  const isAct = s => /^（[\s\S]*）$/.test(String(s || '').trim())
  const quoted = s => (isAct(s) || s === '……' ? s : '「' + s + '」')
  const isFemaleName = n => !!(App.chars || []).find(c => (c.name === n || c.callName === n) && c.gender === '女')
  function fitsLine(s, vars, ctx) {
    if (!holes(s).every(k => vars[k] != null && vars[k] !== '')) return false
    // 「{X}先生」只称呼男性（蝴蝶忍的旧句）
    if (/\{X\}先生/.test(s) && (isFemaleName(vars.X) || (ctx && ctx.female))) return false
    if (ctx) {
      // 对着说不出话的人（只做动作描写的格里菲斯）：不用「问、说、话」的句子
      if (ctx.mute && /问|说|话/.test(s)) return false
      // 少数发现/反应的句子默认了现场细节：与死因、时刻、楼层对不上的不用
      if (/伤/.test(s) && ['poison', 'drown', 'alcohol', 'smother'].includes(ctx.cause)) return false
      if (/不到两小时/.test(s) && ctx.since >= 120) return false
      if (ctx.floor !== undefined && /那层楼/.test(s) && !/^[23]F$/.test(ctx.floor || '')) return false
      // 调查时的自言自语提到的陈设，这间房里得有
      if (ctx.objs != null) {
        if (/地毯/.test(s) && !/毯/.test(ctx.objs)) return false
        if (/花瓶/.test(s) && !/瓶|花器/.test(ctx.objs)) return false
        if (/柜/.test(s) && !/柜|格|架/.test(ctx.objs)) return false
        if (/帘/.test(s) && !/帘/.test(ctx.objs)) return false
        if (/窗/.test(s) && !ctx.windows) return false
      }
    }
    return true
  }
  function line(id, key, vars = {}, ctx = null) {
    const list = linePool(id, key)
    const bk = id + '|' + key
    let bag = Lines.bags[bk]
    if (!bag || !bag.length) {
      bag = Lines.bags[bk] = U.shuffle(list.map((_, i) => i))
      // 新的一轮不以上一轮的最后一句开头
      if (bag.length > 1 && bag[0] === Lines.last[bk]) bag.push(bag.shift())
    }
    let idx = -1
    const i = bag.findIndex(n => fitsLine(list[n], vars, ctx))
    if (i >= 0) idx = bag.splice(i, 1)[0]
    else {
      // 袋里剩下的都缺数据：从整池里找一句能用的（只有这时才可能重复）
      const ok = list.map((_, n) => n).filter(n => fitsLine(list[n], vars, ctx))
      if (ok.length) idx = U.pick(ok)
    }
    let text
    if (idx >= 0) { text = fillLine(list[idx], vars); Lines.last[bk] = idx }
    else {
      const base = charOf(id).lines && charOf(id).lines[key]
      text = base && fitsLine(base, vars) ? fillLine(base, vars) : '……'
    }
    Lines.log.push({ id, key, idx, text, case: S.G ? S.G.caseNo : 0 })
    return text
  }
  function resetLines() { Lines.bags = {}; Lines.last = {}; Lines.log = [] }
  // 说不出话的人：辩解的台词全是动作描写
  const muteCache = {}
  function isMute(id) {
    if (!(id in muteCache)) { const p = linePool(id, 'defend'); muteCache[id] = p.length > 0 && p.every(isAct) }
    return muteCache[id]
  }
  const toX = id => ({ mute: isMute(id), female: charOf(id).gender === '女' })

  function face(id, opts = {}) {
    const w = App.portrait(id, Object.assign({}, opts, { track: false }))
    w._cancel = App.trackEyes(w, { eyeRange: opts.eyeRange || 7 })
    return w
  }
  function clearFaces(box) {
    if (!box) return
    for (const p of box.querySelectorAll('.portrait')) if (p._cancel) p._cancel()
    box.innerHTML = ''
  }
  function sigil(name, cls) {
    const s = App.sigil(name || '', { className: cls || '' })
    return s
  }
  function button(label, cls, act) {
    return el('button.btn.trial-btn' + (cls ? '.' + cls : ''), { type: 'button', 'data-cursor': '', 'data-trial-act': act || label }, [el('span', { text: label })])
  }
  function bcText(when, map = {}) {
    const W = window.WORLD
    const f = W && W.broadcasts && W.broadcasts.fixed && W.broadcasts.fixed.find(x => x.when === when)
    let t = f ? f.text : ''
    for (const k in map) t = t.split('〈' + k + '〉').join(map[k])
    return t
  }
  function bcPart(when, i, map) {
    const t = bcText(when, map)
    const parts = t.split('／')
    return (parts[i] || parts[0] || '').trim()
  }
  function mood(name) {
    const p = PAL[name] || PAL.court
    const t = TRACK[name]
    def.palette = p
    if (t) def.track = t
    if (App.state.section === 'trial' || S.active) {
      if (App.bg) App.bg.setPalette(p, 1.2)
      if (t) App.audio.track(t)
    }
  }
  function setScene(name) {
    if (S.scene !== name && typeof hideProf === 'function') hideProf()
    if (S.scene !== name && typeof killPicks === 'function') killPicks()
    if (S.scene !== name && S.E.me) S.E.me.classList.remove('is-open')
    S.scene = name
    if (S.stage) S.stage.setAttribute('data-scene', name)
    if (S.E.core) S.E.core.classList.toggle('is-case', name === 'court')
    updateMe()
  }

  /* ==========================================================
     证物卡图标（24×24，currentColor）
     ========================================================== */
  const ICON = {
    handprint: '<path d="M8 21c-2.5-2-4-5-4-8l1-3c.5-1 2-1 2.2.2L8 13V5c0-1.3 2-1.3 2 0v6V3.6c0-1.4 2-1.4 2 0V11V4.6c0-1.3 2-1.3 2 0V12V7c0-1.3 2-1.3 2 0v7c0 3-1 5.5-3 7z"/>',
    woodprint: '<path d="M8.5 3c2.2 0 3 2.4 3 5s-1 4.5-3 4.5S5.5 10.6 5.5 8 6.3 3 8.5 3zM7 14.5h3.2l-.4 4c-.2 1.6-2.3 1.6-2.5 0z"/><path d="M15.5 6c2.2 0 3 2.4 3 5s-1 4.5-3 4.5-3-1.9-3-4.5.8-5 3-5zM14 17.5h3.2l-.4 2.5c-.2 1.4-2.3 1.4-2.5 0z" opacity=".55"/>',
    spareclothes: '<path d="M12 3.5a1.6 1.6 0 1 1 1.6 1.6c-.8 0-1.6.6-1.6 1.4v.5M12 7l-9 6h18z"/><path d="M6 13l-1 7h14l-1-7"/>',
    bloodshirt: '<path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-.5 1.6-2 2.5-4 2.5S8.5 4.6 8 3z"/><path d="M12 12.5c1 1.4 1.6 2.3 1.6 3a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.6 1.6-3z"/>',
    lipstick: '<path d="M7 3h10l-1 7a4 4 0 0 1-8 0zM12 14v6M8.5 20.5h7"/><path d="M9.5 7.5c1 .9 1.7 1 2.5.4.8.6 1.5.5 2.5-.4"/>',
    defense: '<path d="M5 4l6 16M10 3l5 16M15 3l4 13"/>',
    freezer: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
    coldpool: '<path d="M3 15c2-1.5 3-1.5 4.5 0s2.5 1.5 4.5 0 3-1.5 4.5 0 2.5 1.5 4.5 0M3 19c2-1.5 3-1.5 4.5 0s2.5 1.5 4.5 0 3-1.5 4.5 0 2.5 1.5 4.5 0"/><path d="M12 3v7.5"/><circle cx="12" cy="11.5" r="1.6"/>',
    vessel: '<path d="M4 20L15 9l3-5 2 2-5 3L4 20zM13.5 10.5l1.8 1.8"/>',
    furniture: '<path d="M7 3h10v8H7zM6 11h12v3H6zM7 14v7M17 14v7M3 21h18" /><path d="M3 21l2-3" opacity=".5"/>',
    scrub: '<path d="M4 15h11l3-5H7zM6 15l-1.5 5M11 15l-.5 5M14 15l.5 5"/><path d="M18 3l.7 1.8L20.5 5.5 18.7 6.2 18 8l-.7-1.8L15.5 5.5l1.8-.7z"/>',
    gloves: '<path d="M7 21v-6L4.5 11.5c-.8-1.2.8-2.4 1.8-1.3L8 12V4.5c0-1.3 2-1.3 2 0V10V3.6c0-1.4 2-1.4 2 0V10V4.6c0-1.3 2-1.3 2 0V11V7c0-1.3 2-1.3 2 0v8l-1 6z"/><path d="M7 18h9"/>',
    pipe: '<path d="M3 9h7l6 6h2.5a2.5 2.5 0 0 0 0-5H16"/><path d="M16 10v-1.5a3 3 0 0 1 3-3"/><path d="M7 6c0-1 .8-1.5.8-2.5M10 6c0-1 .8-1.5.8-2.5" opacity=".6"/>',
    body: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7M12 9l-5 3M12 9l5-2M12 14l-4 6.5M12 14l4.5 6"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="5.5" y="6.5" width="13" height="9"/><path d="M8 13.5l2.5-3 2 2 1.5-1.5 2.5 2.5" opacity=".7"/>',
    luminol: '<path d="M9 9h6v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M10 9V6h4v3M12 6V4h4"/><path d="M18 3.5l2-1M18.5 5.5h2.2M18 7.5l2 1" opacity=".7"/>',
    powder: '<path d="M14 3l4 4-7 7-4-4z"/><path d="M7 10l-3 3c-1 1-1 3 0 4l3 3c1 1 3 1 4 0l3-3"/><circle cx="18" cy="17" r=".9"/><circle cx="20" cy="20" r=".7"/><circle cx="16" cy="20.5" r=".6"/>',
    recorder: '<rect x="6" y="2.5" width="12" height="19" rx="2"/><circle cx="12" cy="8" r="2.5"/><path d="M9 14h6M9 16.5h6M9 19h4" opacity=".7"/>',
    blanket: '<path d="M3 7c3-2 6 2 9 0s6-2 9 0v11c-3-2-6 2-9 0s-6-2-9 0z"/><path d="M3 12c3-2 6 2 9 0s6-2 9 0" opacity=".6"/>',
    meal: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3" opacity=".6"/>',
    sleep: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    drink: '<path d="M7 3h10l-1.5 18h-7z"/><path d="M7.6 9h8.8" opacity=".6"/>',
    ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>',
    voidask: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    exitdoor: '<path d="M5 21V3h11v18M3 21h18"/><path d="M16 7l4-2v18l-4-2"/><circle cx="13" cy="12" r=".9"/>',
    look: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M8 8.5a3 3 0 0 1 3-1.5" opacity=".6"/>',
    talk: '<path d="M4 5h16v10H10l-4 4v-4H4z"/><path d="M8 9h8M8 12h5" opacity=".6"/>',
  }
  function icon(key) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[key] || ICON.body) + '</svg>'
  }
  // 线索指向的维度（证物卡角上、席位档案、结案对账）：尺子=身高、性别、拳头=体格、十字=医护、眼睛=现场观察、齿轮=年代与器械、包=随身物
  const DIM_ICON = {
    height: '<rect x="8" y="2.5" width="8" height="19" rx="1"/><path d="M8 6.5h4M8 10h2.5M8 13.5h4M8 17h2.5"/>',
    gender: '<circle cx="10" cy="13.5" r="4.6"/><path d="M13.4 10.1L19 4.5M15.2 4.5H19v3.8M10 18.1V22M8 20h4"/>',
    physique: '<path d="M6 11.5h12.5v3a5.5 5.5 0 0 1-5.5 5.5h-1.5A5.5 5.5 0 0 1 6 14.5z"/><path d="M9 11.5V8.8a1.5 1.5 0 0 1 3 0v2.7M12 11.5V8a1.5 1.5 0 0 1 3 0v3.5M15 11.5V9.2a1.5 1.5 0 0 1 3 0v2.3M6 14h4.5"/>',
    medical: '<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>',
    observation: '<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    era: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="6.3"/><path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2M5.3 5.3l2.2 2.2M16.5 16.5l2.2 2.2M5.3 18.7l2.2-2.2M16.5 7.5l2.2-2.2"/>',
    items: '<path d="M4.5 8.5h15l-1.3 12H5.8z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    walk: '<circle cx="12" cy="14" r="6.5"/><circle cx="12" cy="14" r="1.2"/><path d="M12 7.5v13M5.5 14h13M10 2.5h4"/>',
    time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5V12l3.5 2.5"/><path d="M3 5l3-2M21 5l-3-2" opacity=".6"/>',
  }
  function dimIcon(key) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (DIM_ICON[key] || '') + '</svg>'
  }
  // 破绽的记号：一只小眼睛（只算推测，不算证据）
  const EYE_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2.5 12s3.8-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.8 5.5-9.5 5.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>'
  // 录音（磁带）、听说（只是他的说法）、举手、相符（证物贴在他身上）、追问
  const TAPE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="6" width="19" height="12" rx="1.5"/><circle cx="8" cy="12" r="2.2"/><circle cx="16" cy="12" r="2.2"/><path d="M8 14.2h8"/></svg>'
  const HEARSAY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10H10l-4 4v-4H4z"/><path d="M9 8.5c-1 .3-1.5 1-1.5 2M13 8.5c-1 .3-1.5 1-1.5 2"/></svg>'
  const HAND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11V3.8a1.5 1.5 0 0 1 3 0V11V5.2a1.5 1.5 0 0 1 3 0V13.5c0 4-2.2 7.5-6.2 7.5-2.6 0-4.1-1.3-5.4-3.4L3.6 14c-.7-1.2.9-2.4 1.9-1.4L8 15"/></svg>'
  const ASK_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8.5 8.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3v.5"/><circle cx="12" cy="18.5" r=".6" fill="currentColor"/></svg>'

  /* ==========================================================
     搭建 DOM
     ========================================================== */
  function chairSVG() {
    return '<svg class="trial-chair" viewBox="0 0 60 80" aria-hidden="true"><path class="trial-chair-back" d="M9 79V24C9 9 18 3 30 3s21 6 21 21v55"/><path class="trial-chair-inlay" d="M15 72V25c0-10 6-15 15-15s15 5 15 15v47"/><path class="trial-chair-arm" d="M2 58h13M45 58h13M4 58v21M56 58v21"/></svg>'
  }
  function domeSVG() {
    let ribs = ''
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI * (i / 24)
      const x = 500 + Math.cos(Math.PI + a) * 980
      const y = 40 + Math.sin(a) * 900
      ribs += `<path d="M500 -60 Q ${500 + (x - 500) * 0.35} ${y * 0.28} ${x.toFixed(1)} ${y.toFixed(1)}"/>`
    }
    let arcs = ''
    for (let i = 1; i <= 6; i++) arcs += `<ellipse cx="500" cy="-60" rx="${i * 150}" ry="${i * 92}"/>`
    return `<svg class="trial-dome-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><g class="trial-dome-ribs">${ribs}</g><g class="trial-dome-arcs">${arcs}</g></svg>`
  }
  function tableSVG() {
    let rose = ''
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, l = i % 4 === 0 ? 96 : i % 2 === 0 ? 62 : 40
      rose += `<path d="M200 120 L ${(200 + Math.cos(a) * l * 1.6).toFixed(1)} ${(120 + Math.sin(a) * l * 0.62).toFixed(1)}"/>`
    }
    return `<svg class="trial-table-svg" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
      <defs><radialGradient id="trialTableG" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#2a2420"/><stop offset=".6" stop-color="#15110f"/><stop offset="1" stop-color="#0a0809"/></radialGradient></defs>
      <ellipse cx="200" cy="120" rx="198" ry="118" class="trial-table-rim"/>
      <ellipse cx="200" cy="120" rx="190" ry="112" fill="url(#trialTableG)"/>
      <ellipse cx="200" cy="120" rx="172" ry="100" class="trial-table-line"/>
      <ellipse cx="200" cy="120" rx="120" ry="70" class="trial-table-line trial-table-line--thin"/>
      <g class="trial-table-rose">${rose}</g>
      <ellipse cx="200" cy="120" rx="10" ry="6" class="trial-table-hub"/>
    </svg>`
  }

  function build(sec) {
    sec.classList.add('trial-root')
    const st = el('div.trial-stage', { 'data-scene': 'intro' })
    const E = S.E
    E.dome = el('div.trial-dome', { html: domeSVG() })
    E.fx = el('div.trial-fx', null, [el('i.trial-fx-lines'), el('i.trial-fx-dots')])

    // 圆桌
    E.ring = el('div.trial-ring')
    E.lines = svg('svg')
    E.lines.setAttribute('class', 'trial-lines')
    E.lines.setAttribute('aria-hidden', 'true')
    E.table = el('div.trial-table', { html: tableSVG() })
    E.ring.append(E.table, E.lines)
    for (let k = 1; k <= 15; k++) {
      const s = buildSeat(k)
      S.seat[k] = s
      E.ring.appendChild(s.root)
    }
    // 桌心
    E.core = el('div.trial-core')
    E.mood = el('p.trial-core-mood', { text: '十五把椅子，一个愿望' })
    E.count = el('div.trial-core-count')
    E.ui = el('div.trial-core-ui')
    E.stamp = el('div.trial-stamp')
    E.say = el('div.trial-say', null, [
      el('div.trial-say-face'),
      el('div.trial-say-body', null, [
        el('div.trial-say-name', null, [el('b'), el('span')]),
        el('p.trial-say-line'),
        el('i.trial-say-tag'),
      ]),
    ])
    E.reel = el('div.trial-reel', null, [el('div.trial-reel-strip'), el('i.trial-reel-frame')])
    E.ask = el('div.trial-ask')
    E.core.append(E.count, E.mood, E.ui, E.stamp, E.say, E.reel, E.ask)
    E.ring.appendChild(E.core)

    // 发牌用的大卡
    E.idcard = el('div.trial-idcard', null, [
      el('div.trial-idcard-inner', null, [
        el('div.trial-idcard-back', { html: '<i></i><i></i><i></i>' }),
        el('div.trial-idcard-face', null, [el('span.trial-idcard-no'), el('div.trial-idcard-sigil'), el('b.trial-idcard-name'), el('p.trial-idcard-text')]),
      ]),
    ])

    // 案发前后的镜头
    E.cine = el('div.trial-cine', null, [
      el('div.trial-cine-dial', { html: dialSVG() }),
      el('div.trial-cine-clock', null, [el('span.trial-cine-day'), el('span.trial-cine-time')]),
      el('p.trial-cine-mood'),
      el('div.trial-cine-found', null, [el('div.trial-cine-face'), el('div.trial-cine-who', null, [el('b'), el('p')]), el('div.trial-cine-go')]),
    ])

    // 调查
    E.inv = el('div.trial-inv', null, [
      el('div.trial-inv-timer', { html: '<svg viewBox="0 0 1000 1000" aria-hidden="true"><g class="trial-inv-ticks"></g><circle class="trial-inv-track" cx="500" cy="500" r="430"/><circle class="trial-inv-arc" cx="500" cy="500" r="430"/></svg>' }),
      el('canvas.trial-inv-cv'),
      el('div.trial-inv-spots'),
      el('div.trial-inv-meta', null, [
        el('span.trial-inv-floor'),
        el('h3.trial-inv-room'),
        el('div.trial-inv-victim', null, [el('div.trial-inv-vface'), el('b')]),
      ]),
      el('div.trial-inv-read', null, [el('b.trial-inv-left'), el('span.trial-inv-unit', { text: '分' }), el('span.trial-inv-court')]),
      el('div.trial-inv-pop', null, [el('div.trial-inv-pop-ico'), el('div.trial-inv-pop-body', null, [el('i.trial-inv-pop-lead'), el('b'), el('p.trial-inv-pop-text'), el('p.trial-inv-pop-more'), el('p.trial-inv-pop-sub')]), el('i.trial-inv-pop-tag')]),
      el('div.trial-inv-tools'),
      el('div.trial-inv-go'),
    ])

    // 处刑
    E.exec = el('div.trial-exec', null, [
      el('i.trial-exec-dots'),
      el('i.trial-exec-rays'),
      el('div.trial-exec-word', null, [el('span', { text: '处刑' })]),
      el('div.trial-exec-who'),
      el('div.trial-exec-chain', { html: chainSVG() }),
    ])

    // 终局 / 死亡 / 无人受命
    E.end = el('div.trial-end', null, [
      el('div.trial-end-halo'),
      el('div.trial-end-face'),
      el('div.trial-end-text', null, [el('span.trial-end-tag'), el('b.trial-end-name'), el('p.trial-end-line')]),
      el('div.trial-end-row'),
      el('div.trial-end-actions'),
    ])

    // 前景控件
    E.top = el('div.trial-top', null, [
      el('div.trial-top-case', null, [el('b'), el('span')]),
      el('div.trial-top-clock', null, [el('span.trial-top-day'), el('span.trial-top-time')]),
      el('div.trial-top-body', { 'aria-hidden': 'true', html: '<i class="trial-gauge is-hunger">' + icon('meal') + '<b></b><b></b><b></b></i><i class="trial-gauge is-sleep">' + icon('sleep') + '<b></b><b></b><b></b><b></b></i>' }),
      el('div.trial-top-coins', { html: '<i></i><span>0</span>' }),
      el('button.trial-top-exit', { type: 'button', 'data-cursor': '', 'data-trial-act': '离席', text: '离席' }),
    ])
    E.bar = el('div.trial-bar', null, [el('div.trial-bar-track'), el('div.trial-bar-tip', null, [el('b'), el('p')])])
    E.me = el('div.trial-me', null, [
      el('button.trial-me-card', { type: 'button', 'data-cursor': '翻面', 'aria-label': '身份' }, [el('span.trial-me-sigil'), el('span.trial-me-name'), el('span.trial-me-no')]),
      el('button.trial-me-act', { type: 'button', 'data-cursor': '', 'data-cursor-tone': 'blood', 'data-trial-act': 'ability' }),
      el('div.trial-me-text', { 'data-lenis-prevent': '' }, [el('b'), el('p')]),
    ])
    E.roster = el('div.trial-roster', null, [el('div.trial-roster-list', { 'data-lenis-prevent': '' }), el('button.trial-roster-x', { type: 'button', 'data-cursor': '', text: '取消' })])
    E.cast = el('div.trial-cast', null, [el('div.trial-cast-band', null, [el('i.trial-cast-ico'), el('p.trial-cast-text')])])
    E.banner = el('div.trial-banner', null, [el('div.trial-banner-band', null, [el('div.trial-banner-sigil'), el('div.trial-banner-text', null, [el('b'), el('span')])])])
    E.notes = el('div.trial-notes')
    E.veil = el('div.trial-veil', null, [el('div.trial-veil-box', null, [el('div.trial-veil-sigil', { html: '<i></i>' }), el('div.trial-veil-row')])])
    E.desk = el('div.trial-desk', { html: '<i></i>' })
    E.dealGo = el('div.trial-deal-go')
    E.quips = el('div.trial-quips', { 'aria-live': 'polite' })
    E.prof = el('div.trial-prof', { 'aria-hidden': 'true' })
    E.replay = el('div.trial-replay', { 'data-lenis-prevent': '' }, [
      el('div.trial-rp-in', null, [el('div.trial-rp-head'), el('div.trial-rp-plan', null, [el('canvas.trial-rp-cv')]), el('div.trial-rp-clues'), el('div.trial-rp-votes')]),
      el('div.trial-rp-go'),
    ])

    // 公开讨论的举手、验尸的时间刻度、默念的价目
    E.hand = el('button.trial-hand', { type: 'button', 'data-cursor': '举手', 'aria-label': '举手' }, [el('i.trial-hand-ico', { html: HAND_ICON }), el('span.trial-hand-dots')])
    E.ap = el('div.trial-ap', { 'data-lenis-prevent': '' })
    E.mm = el('div.trial-mm', { 'data-lenis-prevent': '' })

    st.append(E.dome, E.fx, E.ring, E.idcard, E.dealGo, E.cine, E.inv, E.exec, E.replay, E.end, E.desk, E.quips, E.prof, E.top, E.bar, E.me, E.hand, E.ap, E.mm, E.roster, E.cast, E.banner, E.notes, E.veil)
    sec.appendChild(st)
    S.sec = sec
    S.stage = st
    sec._trial = { S, Lines, Inv: () => Inv } // 调试与巡检脚本用（台词统计、阶段）

    // 舞台与板块都是 overflow: hidden：键盘聚焦、自动化工具的「滚到可见」仍可能把它们横向滚开，一律拉回原位
    for (const box of [st, sec]) box.addEventListener('scroll', () => { if (box.scrollLeft || box.scrollTop) { box.scrollLeft = 0; box.scrollTop = 0 } }, { passive: true })

    // 事件
    st.addEventListener('click', onStageClick)
    E.top.querySelector('.trial-top-exit').addEventListener('click', e => { e.stopPropagation(); exitGame() })
    E.me.querySelector('.trial-me-card').addEventListener('click', e => { e.stopPropagation(); toggleMeText() })
    E.me.querySelector('.trial-me-act').addEventListener('click', e => { e.stopPropagation(); onAbility() })
    E.roster.querySelector('.trial-roster-x').addEventListener('click', e => { e.stopPropagation(); cancelTargeting() })
    E.hand.addEventListener('click', e => { e.stopPropagation(); onHand() })
    st.addEventListener('contextmenu', e => { if (S.armed || S.targeting) { e.preventDefault(); disarm(); cancelTargeting() } })
  }

  function buildSeat(k) {
    const root = el('div.trial-seat.is-empty', { 'data-seat': k })
    const card = el('div.trial-seat-card', { html: chairSVG() })
    const pt = el('div.trial-seat-pt')
    // 锁：并列者在紧接着的重投里不能投票（仍可被投）；白痴发动后出局
    card.append(pt, el('i.trial-seat-x'), el('i.trial-seat-lock', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 11V8a4.5 4.5 0 0 1 9 0v3"/><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M12 15v2.5"/></svg>' }))
    const no = el('div.trial-seat-no', { text: U.roman(k) })
    const name = el('div.trial-seat-name')
    const cnt = el('div.trial-seat-count', null, [el('span')])
    const pips = el('div.trial-seat-pips')
    const tag = el('div.trial-seat-tag', { text: '你' })
    const mark = el('div.trial-seat-mark')
    const coins = el('div.trial-seat-coins')
    const hit = el('button.trial-seat-hit', { type: 'button', 'aria-label': U.roman(k) })
    root.append(coins, card, cnt, no, name, pips, tag, mark, hit)
    const rec = { k, root, card, pt, name, cnt, pips, tag, mark, coins, hit, id: null, count: 0, longAt: 0 }
    hit.addEventListener('click', e => { e.stopPropagation(); onSeatClick(k) })
    hit.addEventListener('pointerenter', () => onSeatHover(k, true))
    hit.addEventListener('pointerleave', () => onSeatHover(k, false))
    // 触屏长按：看这个人的档案（松开后这一下不算点选）
    let hold = 0, sx = 0, sy = 0
    const cancel = () => { clearTimeout(hold); hold = 0 }
    hit.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' && App.finePointer) return
      sx = e.clientX; sy = e.clientY
      cancel()
      hold = setTimeout(() => { hold = 0; if (profOK(k)) { rec.longAt = performance.now(); showProf(k) } }, 420)
    })
    hit.addEventListener('pointermove', e => { if (hold && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel() })
    hit.addEventListener('pointerup', cancel)
    hit.addEventListener('pointercancel', cancel)
    hit.addEventListener('contextmenu', e => { if (!App.finePointer) e.preventDefault() })
    return rec
  }
  function dialSVG() {
    let t = ''
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, r1 = i % 5 === 0 ? 412 : 428, r2 = 446
      t += `<line x1="${(500 + Math.cos(a) * r1).toFixed(1)}" y1="${(500 + Math.sin(a) * r1).toFixed(1)}" x2="${(500 + Math.cos(a) * r2).toFixed(1)}" y2="${(500 + Math.sin(a) * r2).toFixed(1)}" class="${i % 5 === 0 ? 'is-major' : ''}"/>`
    }
    let dots = ''
    for (let i = 0; i < 15; i++) {
      const a = -Math.PI / 2 + (i / 15) * Math.PI * 2
      dots += `<circle cx="${(500 + Math.cos(a) * 360).toFixed(1)}" cy="${(500 + Math.sin(a) * 360).toFixed(1)}" r="5"/>`
    }
    return `<svg viewBox="0 0 1000 1000" aria-hidden="true"><g class="trial-dial-ticks">${t}</g><g class="trial-dial-dots">${dots}</g><circle cx="500" cy="500" r="470" class="trial-dial-rim"/><line class="trial-dial-hand trial-dial-hand--h" x1="500" y1="500" x2="500" y2="300"/><line class="trial-dial-hand trial-dial-hand--m" x1="500" y1="500" x2="500" y2="150"/></svg>`
  }
  function chainSVG() {
    let links = ''
    for (let i = 0; i < 26; i++) links += `<rect x="${i * 46}" y="${i % 2 ? 6 : 0}" width="56" height="${i % 2 ? 12 : 24}" rx="${i % 2 ? 6 : 12}"/>`
    return `<svg viewBox="0 0 1200 24" preserveAspectRatio="none" aria-hidden="true">${links}</svg>`
  }

  /* ==========================================================
     圆桌几何
     ========================================================== */
  function layout() {
    if (!S.stage) return
    const W = S.stage.clientWidth, H = S.stage.clientHeight
    if (!W || !H) return
    const mobile = W < 760
    const hud = mobile ? 56 : 64
    const top = hud + (mobile ? 48 : 52)
    const bottom = mobile ? 122 : Math.max(128, Math.min(156, H * 0.165))
    const areaH = Math.max(260, H - top - bottom)
    const cx = W / 2
    const cy = top + areaH / 2
    const sw = mobile ? Math.max(40, Math.min(52, W * 0.125)) : Math.max(62, Math.min(92, Math.min(W * 0.06, areaH * 0.13)))
    const sh = sw * 4 / 3
    const rx = mobile ? W / 2 - sw * 0.62 - 6 : Math.min(W * 0.4, areaH * 0.98, 640)
    const ry = mobile ? areaH / 2 - sh * 0.62 : areaH / 2 - sh * 0.58
    const pos = []
    // 沿椭圆等弧长分布：两侧的席位不再挤在一起
    const N = 720, cum = [0]
    let px = 0, py = -ry
    for (let i = 1; i <= N; i++) {
      const t = -Math.PI / 2 + (i / N) * Math.PI * 2
      const qx = Math.cos(t) * rx, qy = Math.sin(t) * ry
      cum.push(cum[i - 1] + Math.hypot(qx - px, qy - py))
      px = qx; py = qy
    }
    const L = cum[N]
    let j = 0
    for (let k = 1; k <= 15; k++) {
      const target = ((k - 1) / 15) * L
      while (j < N && cum[j + 1] < target) j++
      const f = cum[j + 1] > cum[j] ? (target - cum[j]) / (cum[j + 1] - cum[j]) : 0
      const a = -Math.PI / 2 + ((j + f) / N) * Math.PI * 2
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry
      const depth = (Math.sin(a) + 1) / 2
      const sc = mobile ? 0.94 + depth * 0.1 : 0.84 + depth * 0.2
      pos[k] = { x, y, a, depth, sc }
      const s = S.seat[k]
      s.root.style.left = x + 'px'
      s.root.style.top = y + 'px'
      s.root.style.setProperty('--sc', sc.toFixed(3))
      s.root.style.zIndex = String(depth < 0.25 ? 10 + Math.round(depth * 16) : 20 + Math.round(depth * 20))
      s.root.classList.toggle('is-far', depth < 0.25)
      s.root.classList.toggle('is-low', Math.sin(a) > 0.2)
      s.root.classList.toggle('is-west', Math.cos(a) < -0.3)
      s.root.classList.toggle('is-east', Math.cos(a) > 0.3)
    }
    S.stage.style.setProperty('--sw', sw.toFixed(1) + 'px')
    const tw = 2 * (rx - sw * (mobile ? 0.45 : 0.32)), th = 2 * (ry - sh * (mobile ? 0.2 : 0.1))
    Object.assign(S.E.table.style, { left: cx - tw / 2 + 'px', top: cy - th / 2 + 'px', width: tw + 'px', height: th + 'px' })
    const cw = mobile ? Math.min(W - 24, tw * 1.02) : Math.min(tw * 0.78, 720), chh = mobile ? Math.min(areaH * 0.56, th * 0.8) : th * 0.8
    Object.assign(S.E.core.style, { left: cx - cw / 2 + 'px', top: cy - chh / 2 + 'px', width: cw + 'px', height: chh + 'px' })
    S.E.lines.setAttribute('viewBox', `0 0 ${W} ${H}`)
    S.E.lines.setAttribute('width', W)
    S.E.lines.setAttribute('height', H)
    S.geo = { W, H, cx, cy, rx, ry, sw, sh, pos, mobile, top, bottom }
    if (S.scene === 'inv') Inv.resize()
    redrawLines()
    if (S.E.idcard.classList.contains('is-on')) fitIdcard()
    if (S.E.me.classList.contains('is-open')) fitMeText()
  }
  function seatCenter(k) {
    const p = S.geo && S.geo.pos[k]
    if (!p) return { x: 0, y: 0 }
    return { x: p.x, y: p.y }
  }

  /* ==========================================================
     席位
     ========================================================== */
  function fillSeats(ids) {
    for (let k = 1; k <= 15; k++) {
      const s = S.seat[k]
      const id = ids[k - 1] || null
      if (s.id === id && s.pt.firstChild) { s.root.classList.toggle('is-empty', !id); continue }
      clearFaces(s.pt)
      s.id = id
      s.root.classList.toggle('is-empty', !id)
      s.name.textContent = id ? nameOf(id) : ''
      s.hit.setAttribute('aria-label', U.roman(k) + (id ? ' ' + nameOf(id) : ''))
      if (id) s.pt.appendChild(face(id, { eyeRange: 6 }))
    }
  }
  function resetSeatStates() {
    for (let k = 1; k <= 15; k++) {
      const s = S.seat[k]
      s.root.classList.remove('is-dead', 'is-left', 'is-me', 'is-speaking', 'is-dim', 'is-voter', 'is-pending', 'is-banned', 'is-novote', 'is-out', 'is-target', 'is-picked', 'is-hope', 'is-lit', 'is-gone', 'is-shake', 'is-tie')
      setCount(k, 0, true)
      s.pips.innerHTML = ''
      s.mark.innerHTML = ''
      s.coins.innerHTML = ''
      s.hit.removeAttribute('data-cursor')
    }
    S.touchPick = 0
    refreshCursor()
  }
  function syncSeats() {
    if (!S.G) return
    for (let k = 1; k <= 15; k++) {
      const s = S.seat[k]
      const id = s.id
      if (!id) continue
      const p = S.G.people[id]
      const left = !!(p && p.alive && !p.inMansion)
      const dead = !TE.isLiving(S.G, id) && !left
      s.root.classList.toggle('is-dead', dead)
      s.root.classList.toggle('is-left', left)
      s.root.classList.toggle('is-me', isMe(id))
      s.root.classList.toggle('is-novote', !!(p && !dead && p.ident.noVote))
      s.root.classList.toggle('is-out', !!(S.T && S.T.idiotOut.includes(id)))
      const prt = s.pt.querySelector('.portrait')
      if (prt) { prt.classList.toggle('is-dead', dead); prt.classList.toggle('is-mono', left) }
    }
  }
  function setCount(k, n, silent) {
    const s = S.seat[k]
    s.count = n
    s.cnt.firstChild.textContent = String(n)
    s.cnt.classList.toggle('is-on', n !== 0)
    s.cnt.classList.toggle('is-neg', n < 0)
    if (!silent && window.gsap) gsap.fromTo(s.cnt, { scale: 1.9 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
    // 当前领先者的票数牌放大、脉动（并列时一起）
    let max = 0
    for (let i = 1; i <= 15; i++) if (S.seat[i] && S.seat[i].count > max) max = S.seat[i].count
    for (let i = 1; i <= 15; i++) if (S.seat[i]) S.seat[i].cnt.classList.toggle('is-lead', max > 0 && S.seat[i].count === max)
  }
  function bumpCount(id) {
    const k = seatOf(id)
    if (!k) return
    setCount(k, S.seat[k].count + 1)
  }
  function seatClass(cls, ids, on = true) {
    for (let k = 1; k <= 15; k++) S.seat[k].root.classList.toggle(cls, on ? ids.includes(S.seat[k].id) : false)
  }
  function spotlight(id) {
    for (let k = 1; k <= 15; k++) {
      const s = S.seat[k]
      s.root.classList.toggle('is-speaking', !!id && s.id === id)
      s.root.classList.toggle('is-dim', !!id && s.id !== id)
    }
  }
  function shakeSeat(id) {
    const k = seatOf(id)
    if (!k || !window.gsap) return
    const c = S.seat[k].card
    gsap.fromTo(c, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.25)' })
  }
  function seatMark(id, html, cls) {
    const k = seatOf(id)
    if (!k) return
    const m = el('i.trial-mark' + (cls ? '.' + cls : ''), { html })
    S.seat[k].mark.appendChild(m)
    if (window.gsap) gsap.from(m, { scale: 0, rotate: -40, duration: 0.6, ease: 'back.out(2)' })
    return m
  }

  /* ==========================================================
     席位档案（悬停 / 长按）：看得见的特征——身高刻度、性别、体格、能否行走、随身物、「别人眼里」
     只放卡面原文与数字；医护、现场观察、年代这类别人看不见的不放（运行规则 3.2）
     ========================================================== */
  // 能不能行走：卡上的 canWalk；本局在铜牌或默念里修复过残疾的，按能走算（App.econ.canWalk）
  const cantWalk = id => {
    const e = App.econ && App.econ.get()
    if (e && S.econGame && e.game === S.econGame) return !App.econ.canWalk(id)
    return charOf(id).canWalk === false
  }
  const profOK = k => !!(S.seat[k] && S.seat[k].id && !S.paused && ['intro', 'court', 'after'].includes(S.scene) && !S.E.reel.classList.contains('is-on'))
  function rulerSVG(cm) {
    const H = 92, top = 6, min = 140, max = 215
    const y = h => top + H - (U.clamp(h, min, max) - min) / (max - min) * H
    let t = ''
    for (let h = min; h <= max; h += 5) t += `<line x1="${h % 10 === 0 ? 4 : 8}" x2="13" y1="${y(h).toFixed(1)}" y2="${y(h).toFixed(1)}"/>`
    let lab = ''
    for (const h of [150, 175, 200]) lab += `<text x="0" y="${(y(h) + 3).toFixed(1)}">${h}</text>`
    const v = y(cm || min)
    return `<svg class="trial-prof-ruler" viewBox="-22 0 66 104" aria-hidden="true"><g class="trial-prof-ticks">${t}</g><g class="trial-prof-lab">${lab}</g>` +
      `<rect class="trial-prof-bar" x="16" y="${v.toFixed(1)}" width="7" height="${(top + H - v).toFixed(1)}"/>` +
      `<line class="trial-prof-mark" x1="2" x2="27" y1="${v.toFixed(1)}" y2="${v.toFixed(1)}"/><text class="trial-prof-cm" x="29" y="${(v + 3.5).toFixed(1)}">${cm || '—'}</text></svg>`
  }
  function showProf(k) {
    const s = S.seat[k]
    if (!s || !s.id || !S.geo) return
    const id = s.id, c = charOf(id), st = c.stats || {}
    const box = S.E.prof
    box.innerHTML = ''
    const call = callOf(id)
    const head = el('div.trial-prof-head', null, [
      el('span.trial-prof-no', { text: U.roman(k) }),
      el('b', { text: c.name }),
      call && call !== c.name && !/号$/.test(call) ? el('i', { text: call }) : null,
      S.tellMarks && S.tellMarks.has(id) ? el('span.trial-prof-tell', { html: EYE_MARK }) : null,
    ])
    const trait = (key, text, cls) => el('span.trial-prof-t' + (cls ? '.' + cls : ''), null, [el('i', { html: dimIcon(key) }), el('span', { text })])
    const traits = el('div.trial-prof-traits', null, [
      trait('gender', c.gender || '—'),
      trait('physique', st.physique || '—', st.physique === '受训' ? 'is-strong' : ''),
      cantWalk(id) ? trait('walk', '不能行走', 'is-strong') : null,
    ])
    const items = (c.carried || []).slice(0, 3)
    const bag = el('div.trial-prof-items', null, [el('i', { html: dimIcon('items') }), el('ul', null, items.length ? items.map(t => el('li', { text: t })) : [el('li', { text: '—' })])])
    const see = el('p.trial-prof-see', null, [el('span', { text: '别人眼里' }), document.createTextNode(c.othersSee || '')])
    box.append(head, el('div.trial-prof-body', null, [el('div.trial-prof-left', { html: rulerSVG(c.heightCm) }), el('div.trial-prof-right', null, [traits, bag, see])]))
    // 位置：贴着席位，朝桌心一侧；不出舞台、不压顶栏与证物栏
    const g = S.geo, p = g.pos[k]
    box.classList.add('is-measure')
    const w = box.offsetWidth, h = box.offsetHeight
    box.classList.remove('is-measure')
    const up = p.y > g.cy
    let x = p.x - w / 2, y = up ? p.y - g.sh * 0.62 * p.sc - h - 10 : p.y + g.sh * 0.62 * p.sc + 26
    const floor = g.H - (S.scene === 'court' ? (g.mobile ? 104 : 130) : 16) - h
    if (y > floor) y = Math.min(floor, p.y - g.sh * 0.6 - h - 10)
    x = U.clamp(x, 10, g.W - w - 10)
    y = U.clamp(y, (g.mobile ? 56 : 64) + 8, Math.max((g.mobile ? 56 : 64) + 8, g.H - h - 10))
    box.style.left = x.toFixed(0) + 'px'
    box.style.top = y.toFixed(0) + 'px'
    box.classList.add('is-on')
    S.profK = k
    App.audio.sfx('hover', { volume: 0.5 })
    if (window.gsap) gsap.fromTo(box, { opacity: 0, y: up ? 8 : -8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'expo.out', clearProps: 'transform' })
  }
  function hideProf() {
    clearTimeout(S.profT)
    if (!S.E.prof) return
    S.E.prof.classList.remove('is-on')
    S.profK = 0
  }

  /* ==========================================================
     红线
     ========================================================== */
  const lineData = []
  function linePath(a, b, bend = 0.22) {
    const p = seatCenter(a), q = seatCenter(b)
    const g = S.geo
    if (a === b) {
      const r = g ? g.sw * 0.55 : 30
      const dx = (g.cx - p.x), dy = (g.cy - p.y), d = Math.hypot(dx, dy) || 1
      const ux = dx / d, uy = dy / d
      const ox = p.x + ux * r * 1.6, oy = p.y + uy * r * 1.6
      return `M${p.x},${p.y} C${ox - uy * r},${oy + ux * r} ${ox + uy * r},${oy - ux * r} ${p.x},${p.y}`
    }
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2
    const cx = mx + (g.cx - mx) * bend, cy = my + (g.cy - my) * bend
    return `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`
  }
  function drawLine(fromId, toId, opts = {}) {
    const a = seatOf(fromId), b = seatOf(toId)
    if (!a || !b) return null
    const p = svg('path', { d: linePath(a, b, opts.bend), class: 'trial-line ' + (opts.cls || '') })
    S.E.lines.appendChild(p)
    let dot = null
    if (a !== b) {
      const q = seatCenter(b)
      dot = svg('circle', { cx: q.x, cy: q.y, r: opts.dot || 5, class: 'trial-line-dot ' + (opts.cls || '') })
      S.E.lines.appendChild(dot)
    }
    const rec = { a, b, p, dot, bend: opts.bend, kind: opts.kind || 'vote' }
    lineData.push(rec)
    const len = p.getTotalLength ? p.getTotalLength() : 600
    if (window.gsap) {
      // 画完交回样式表（虚线类的线：作废票、恋人、反咬、质疑）
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: opts.dur || 0.42, ease: 'power3.out', onComplete: () => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = '' } })
      if (dot) gsap.fromTo(dot, { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.3, delay: (opts.dur || 0.42) * 0.8, ease: 'back.out(3)' })
    }
    return rec
  }
  function clearLines(kind, fade = true) {
    for (let i = lineData.length - 1; i >= 0; i--) {
      const r = lineData[i]
      if (kind && r.kind !== kind) continue
      lineData.splice(i, 1)
      const nodes = [r.p, r.dot].filter(Boolean)
      if (fade && window.gsap) gsap.to(nodes, { opacity: 0, duration: 0.4, onComplete: () => nodes.forEach(n => n.remove()) })
      else nodes.forEach(n => n.remove())
    }
  }
  function redrawLines() {
    for (const r of lineData) {
      r.p.setAttribute('d', linePath(r.a, r.b, r.bend))
      if (r.dot) { const q = seatCenter(r.b); r.dot.setAttribute('cx', q.x); r.dot.setAttribute('cy', q.y) }
    }
  }

  /* ==========================================================
     顶栏、身份卡、证物栏、通知、广播
     ========================================================== */
  function updateTop() {
    const E = S.E
    if (!S.G) return
    const m = S.G.minutes
    E.top.querySelector('.trial-top-day').textContent = dayText(m)
    E.top.querySelector('.trial-top-time').textContent = hhmm(m)
    const n = S.G.caseNo
    E.top.querySelector('.trial-top-case b').textContent = n ? '第' + U.cnNum(n) + '案' : '入局'
    E.top.querySelector('.trial-top-case span').textContent = n ? 'CASE ' + U.roman(n) : ''
    const mm = Math.floor(m)
    if (S.active && mm !== S.lastTime) { S.lastTime = mm; emitTime(mm); updateBody() }
  }
  // 顶栏的时钟：游戏中以局内时刻为准。滚动进度（core/scroll.js）也会发 'time'——锁着的滚动被对齐、窗口改变大小时都会——
  // 那时在同一轮事件之后把局内时刻再发一次盖回去（见 mount 里的监听）
  function emitTime(mm) {
    S.shownTime = mm
    S.timeOwn = true
    try { App.bus.emit('time', mm) } finally { S.timeOwn = false }
  }
  function setCoins(n, pop) {
    S.coins = n
    const sp = S.E.top.querySelector('.trial-top-coins span')
    sp.textContent = String(n)
    if (pop && window.gsap) gsap.fromTo(S.E.top.querySelector('.trial-top-coins'), { scale: 1.25 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' })
  }

  // 身份卡
  function myIdent() { return S.G && S.me && S.G.people[S.me] ? S.G.people[S.me].ident : null }
  function identData(name) {
    const W = window.WORLD
    const ids = (W && W.identities) || []
    return ids.find(x => x.front === name) || ids.find(x => x.back === name) || { no: 0, front: name, frontText: '' }
  }
  function renderMe() {
    const id = myIdent()
    const E = S.E
    const sg = E.me.querySelector('.trial-me-sigil')
    sg.innerHTML = ''
    if (!id) return
    sg.appendChild(sigil(id.name))
    E.me.querySelector('.trial-me-name').textContent = id.name
    const d = identData(id.name)
    E.me.querySelector('.trial-me-no').textContent = U.roman(d.no || id.no || 1)
    E.me.querySelector('.trial-me-text b').textContent = id.name
    E.me.querySelector('.trial-me-text p').textContent = d.front === id.name ? d.frontText : (d.backText || '')
    if (E.me.classList.contains('is-open')) fitMeText()
  }
  function toggleMeText(force) {
    const on = force == null ? !S.E.me.classList.contains('is-open') : force
    if (on) fitMeText()
    S.E.me.classList.toggle('is-open', on)
    App.audio.sfx(on ? 'flip' : 'card', { volume: 0.6 })
  }
  // 卡面原文（圣女三百余字）在矮窗口里会顶进顶栏：先加宽，仍放不下就在框内滚动
  function fitMeText() {
    const E = S.E
    const box = E.me && E.me.querySelector('.trial-me-text')
    if (!box || !S.stage) return
    box.style.width = ''
    box.style.maxHeight = ''
    box.classList.remove('is-dense')
    const sr = S.stage.getBoundingClientRect()
    const mr = E.me.getBoundingClientRect()
    const tr = E.top.getBoundingClientRect()
    const ceil = Math.max(sr.top + 8, (tr.height ? tr.bottom : sr.top + 64) + 10)
    const bottom = mr.top + box.offsetTop + box.offsetHeight // 底边固定（布局值，不含入场的位移）
    const room = Math.max(150, Math.floor(bottom - ceil))
    const gutter = mr.left - sr.left
    const maxW = Math.min(600, S.stage.clientWidth - 2 * gutter)
    // 依次尝试：加宽 → 字距收紧 → 再加宽；都不够才滚动
    const base = box.offsetWidth
    for (const [w, dense] of [[420, false], [420, true], [500, true], [600, true]]) {
      if (box.scrollHeight <= room) break
      if (w > maxW && !(dense && !box.classList.contains('is-dense'))) continue
      if (w <= maxW && w > base) box.style.width = w + 'px'
      box.classList.toggle('is-dense', dense)
    }
    box.style.maxHeight = room + 'px'
    box.scrollTop = 0
    const scroll = box.scrollHeight > box.clientHeight + 1
    box.classList.toggle('is-scroll', scroll)
    box.classList.remove('is-end')
    if (scroll && !box._onScroll) {
      box._onScroll = () => box.classList.toggle('is-end', box.scrollTop + box.clientHeight >= box.scrollHeight - 2)
      box.addEventListener('scroll', box._onScroll, { passive: true })
    }
  }
  // 发牌大卡：卡面原文放不下时，纹章先让位，再逐级缩字
  function fitIdcard() {
    const card = S.E.idcard
    const t = card && card.querySelector('.trial-idcard-text')
    if (!t) return
    t.style.fontSize = ''
    t.style.lineHeight = ''
    card.style.removeProperty('--ch')
    card.classList.remove('is-tight')
    if (t.scrollHeight <= t.clientHeight + 1) return
    card.classList.add('is-tight')
    let fs = parseFloat(getComputedStyle(t).fontSize) || 11
    while (t.scrollHeight > t.clientHeight + 1 && fs > 9.5) {
      fs -= 0.5
      t.style.fontSize = fs + 'px'
      t.style.lineHeight = '1.5'
    }
    // 最后一招：卡身加高到放下全文
    const over = t.scrollHeight - t.clientHeight
    if (over > 1) card.style.setProperty('--ch', Math.ceil(card.offsetHeight + over + 4) + 'px')
  }
  // 当前可用的能力
  function myAbility() {
    if (!S.G || !meAlive() || S.spectate) return null
    const id = myIdent()
    if (!id) return null
    const T = S.T
    if (S.scene === 'inv') {
      for (const t of ['fortune', 'shifter', 'magician', 'cupid']) if (TE.canUse(S.G, null, S.me, t)) return t
      return null
    }
    if (S.scene !== 'court' || !T || T.ended) return null
    if (S.phase === 'debate') {
      // 已经提出、等流程结算的请求不再重复提供
      const queued = t => (T.queue || []).some(q => q.actor === S.me && q.type === t)
      for (const t of ['knight', 'executor', 'silencer', 'puffer']) if (TE.canUse(S.G, T, S.me, t) && !queued(t)) return t
    }
    if (S.phase === 'vote' && S.V && !S.V.settled) {
      for (const t of ['judge', 'hanged']) if (TE.canUse(S.G, T, S.me, t, S.V)) return t
    }
    return null
  }
  function updateMe() {
    if (!S.E.me) return
    // ① 正在为能力选人：按钮先变成「取消」（优先于一切判断，阶段变了也能退出）
    // ② 选完人、能力正在结算或揭示：收起按钮
    // ③ 其余时候：当前可用、且没有排队等待结算的能力
    const arming = !!(S.targeting && S.targeting.ability)
    const a = arming ? 'cancel' : abilityBusy ? null : myAbility()
    const label = a === 'cancel' ? '取消' : a ? VERB[a] : ''
    const btn = S.E.me.querySelector('.trial-me-act')
    const was = btn.classList.contains('is-on')
    btn.classList.toggle('is-on', !!a)
    if (a) btn.classList.toggle('is-armed', arming) // 收起时保留原来的样子
    if (label && btn.textContent !== label) btn.textContent = label // 收起时保留旧字，随按钮一同缩没
    btn.setAttribute('data-cursor', label)
    btn.setAttribute('aria-label', label)
    if (a && !was && window.gsap) gsap.fromTo(btn, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)', clearProps: 'transform,opacity' })
    S.E.me.classList.toggle('is-dead', !!(S.G && S.me && !meAlive()))
  }

  // 证物栏
  function clearBar() {
    S.cards = []
    S.talk = {}
    S.notes = {}
    S.armed = null
    S.E.bar.querySelector('.trial-bar-track').innerHTML = ''
    S.E.bar.classList.remove('is-tip')
  }
  // 证物栏的卡：item {id, label, text, predicate, icon, dim 维度, visible 这一维度看不看得见}；
  // opts：by 别人找到的（席号）、talk 证言卡、fact 陈设点的排除性事实、herring 疑似线索（虚边，「再看一次」才揭开）
  function addCard(item, opts = {}) {
    const track = S.E.bar.querySelector('.trial-bar-track')
    if (opts.talk) item.talk = true
    if (opts.fact) item.fact = item.fact || true
    const testable = !!(item.predicate || item.shift || item.id === 'photo')
    const no = String(S.cards.length + 1).padStart(2, '0')
    const cls = 'button.trial-card' + (opts.by ? '.is-shared' : '') + (testable ? '' : '.is-info') + (opts.talk ? '.is-talk' : '') + (opts.fact ? '.is-fact' : '') + (opts.herring ? '.is-herring' : '') + (item.shift ? '.is-shift' : '')
    const b = el(cls, { type: 'button', 'data-cursor': testable ? '出示' : opts.herring ? '再看' : '', 'aria-label': item.label })
    b.innerHTML = `<span class="trial-card-no">${no}</span><span class="trial-card-ico">${icon(item.icon)}</span><span class="trial-card-label">${U.esc(item.label)}</span>` +
      (item.dim ? `<span class="trial-card-dim${item.visible === false ? ' is-unseen' : ''}" data-dim="${item.dim}">${dimIcon(item.dim)}</span>` : '') +
      (opts.by ? `<span class="trial-card-by">${U.roman(seatOf(opts.by))}</span>` : '')
    if (opts.talk && item.segs) {
      const row = el('span.trial-card-segs')
      for (const sg of item.segs) row.appendChild(el('i', { text: sg.room }))
      b.appendChild(row)
    }
    if (opts.rec) b.appendChild(el('i.trial-card-rec', { html: TAPE_ICON }))
    const rec = { item, el: b, no, herring: opts.herring || null }
    S.cards.push(rec)
    track.appendChild(b)
    b.addEventListener('click', e => { e.stopPropagation(); onCardClick(rec) })
    b.addEventListener('pointerenter', () => showTip(rec))
    b.addEventListener('pointerleave', () => { if (S.armed !== rec) hideTip() })
    App.audio.sfx('card')
    if (window.gsap) {
      if (opts.from) {
        const r = b.getBoundingClientRect()
        const sr = S.stage.getBoundingClientRect()
        const fx = opts.from.x - (r.left - sr.left) - r.width / 2, fy = opts.from.y - (r.top - sr.top) - r.height / 2
        gsap.fromTo(b, { x: fx, y: fy, scale: 0.4, rotate: -14, opacity: 0 }, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.8, ease: 'expo.out', clearProps: 'transform,opacity' })
      } else gsap.fromTo(b, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform,opacity' })
    }
    track.scrollTo && track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' })
    return rec
  }
  function showTip(rec) {
    const tip = S.E.bar.querySelector('.trial-bar-tip')
    tip.querySelector('b').textContent = rec.item.label
    const p = tip.querySelector('p')
    p.textContent = rec.item.talk && rec.item.segs ? '' : rec.item.text || ''
    if (rec.item.talk && rec.item.segs) p.appendChild(timelineEl(rec.item.segs))
    S.E.bar.classList.add('is-tip')
  }
  function hideTip() { S.E.bar.classList.remove('is-tip') }
  // 能当众出示的证物：筛人的证物（有判别条件）、让死亡时间窗偏移的证物、尸体照片
  const presentable = rec => !!(rec && !rec.herring && !rec.item.talk && !rec.item.fact && (rec.item.predicate || rec.item.shift || rec.item.id === 'photo'))
  // 能做笔记的证物：筛人的证物
  const notable = rec => !!(rec && rec.item.predicate && !rec.herring)
  function onCardClick(rec) {
    if (S.dragEat && performance.now() - S.dragEat < 300) return
    // 选卡（出示、对质、驳回）：交给正在等的那一步
    if (S.cardPick) { if (S.cardPick.filter(rec)) S.cardPick.done(rec); else { App.audio.sfx('wrong', { volume: 0.25 }); shakeCard(rec) } return }
    // 疑似线索：调查期里点它「再看一次」（三到五分钟）
    if (rec.herring && !rec.herring.cleared && S.scene === 'inv') { Inv.recheck(rec); return }
    // 验尸卡、照片：打开死亡时间（三格读数与你框出的时间窗）；正要出示时，照常拿起
    const presenting = !!(S.presentArm || S.debateResolve) && presentable(rec)
    if (!presenting && rec.item.id === 'body' && S.autopsy && (S.scene === 'inv' || S.scene === 'court')) { openAutopsy(); return }
    if (!presenting && rec.item.id === 'photo' && S.C && S.C.photo && S.scene === 'court') { openAutopsy({ photo: true }); return }
    if (S.scene !== 'court' || !(notable(rec) || presentable(rec))) { showTip(rec); App.audio.sfx('flip', { volume: 0.5 }); return }
    if (S.armed === rec) return disarm()
    if (!S.presentArm && !S.debateResolve) cancelTargeting()
    armCard(rec)
  }
  function shakeCard(rec) {
    if (!rec || !window.gsap) return
    gsap.fromTo(rec.el, { x: -5 }, { x: 0, duration: 0.45, ease: 'elastic.out(1.2, 0.25)', clearProps: 'transform' })
  }
  function disarm() {
    if (!S.armed) return
    S.armed.el.classList.remove('is-armed')
    S.armed = null
    S.stage.classList.remove('is-armed')
    hideTip()
    refreshTargets()
  }
  // 推理笔记：拿起一张证物点席位，在 ✓ → ✗ → ? → 空 之间轮换。只是你自己的标记，不问任何人
  const NOTE_NEXT = { undefined: 'ok', ok: 'no', no: 'q', q: undefined }
  function noteSeat(rec, id) {
    const k = seatOf(id)
    const t = S.notes[id] || (S.notes[id] = {})
    const v = NOTE_NEXT[t[rec.item.id]]
    if (v) t[rec.item.id] = v
    else delete t[rec.item.id]
    App.audio.sfx(v === 'ok' ? 'stamp' : v ? 'tick' : 'click', { volume: 0.4 })
    renderPips(id)
    if (k && window.gsap) gsap.fromTo(S.seat[k].pips, { scale: 1.5 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' })
  }
  function renderPips(id) {
    const k = seatOf(id)
    if (!k) return
    const box = S.seat[k].pips
    box.innerHTML = ''
    const t = S.notes[id] || {}
    for (const rec of S.cards) {
      if (!notable(rec)) continue
      const v = t[rec.item.id]
      box.appendChild(el('i.trial-pip' + (v === 'ok' ? '.is-ok' : v === 'no' ? '.is-no' : v === 'q' ? '.is-q' : '.is-none')))
    }
  }
  function renderAllPips() { for (const id of Object.keys(S.notes)) renderPips(id) }
  // 私人通知（屏幕边缘）
  const NOTE_ICON = {
    death: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v18M7 8h10"/></svg>',
    lover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
    accomplice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="9" width="9" height="6" rx="3"/><rect x="12" y="9" width="9" height="6" rx="3"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  }
  function note(type, text, sub, extra) {
    const n = el('div.trial-note.is-' + type, null, [
      el('i.trial-note-ico', { html: NOTE_ICON[type] || NOTE_ICON.death }),
      el('div.trial-note-body', null, [el('b', { text }), sub ? el('span', { text: sub }) : null]),
      extra || null,
    ])
    S.E.notes.appendChild(n)
    // 恋人、帮凶是持续的关系：折成一枚小标留在边上；其余通知看过即散
    const keep = type === 'lover' || type === 'accomplice'
    const all = Array.from(S.E.notes.children)
    if (all.length > 5) all.slice(0, all.length - 5).forEach(x => x.remove())
    App.audio.sfx(type === 'death' ? 'heartbeat' : 'chime', { volume: type === 'death' ? 0.9 : 0.35 })
    if (window.gsap) {
      gsap.fromTo(n, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out' })
      gsap.to(n, { delay: 5.5, opacity: 0.6, duration: 0.6, ease: 'power2.inOut', onStart: () => n.classList.add('is-folded') })
      if (!keep) gsap.to(n, { delay: 14, x: 60, opacity: 0, duration: 0.8, ease: 'power2.in', onComplete: () => n.remove() })
    } else if (!keep) setTimeout(() => n.remove(), 14000)
    return n
  }
  async function flushNotices() {
    if (!S.G) return
    while (S.G.notices.length) {
      const n = S.G.notices.shift()
      if (n.type === 'death') note('death', '有人死亡', hhmm(n.at))
      else if (n.type === 'lover') note('lover', nameOf(n.with), n.name, mini(n.with))
      else if (n.type === 'accomplice') note('accomplice', '帮凶', nameOf(n.with), mini(n.with))
      else if (n.type === 'swap') { note('swap', n.name, hhmm(n.at)); await flipMe() }
      await wait(500)
    }
  }
  function mini(id) {
    const m = el('div.trial-note-face')
    m.appendChild(face(id, { eyeRange: 3 }))
    return m
  }
  async function flipMe() {
    const c = S.E.me.querySelector('.trial-me-card')
    App.audio.sfx('flip')
    if (window.gsap) {
      await anim(r => gsap.to(c, { rotateY: 90, duration: 0.25, ease: 'power2.in', onComplete: r }))
      renderMe()
      await anim(r => gsap.to(c, { rotateY: 0, duration: 0.35, ease: 'back.out(2)', onComplete: r }))
    } else renderMe()
    updateMe()
  }

  // 广播
  async function broadcast(text, opts = {}) {
    if (!text) return
    const E = S.E
    const box = E.cast
    const p = box.querySelector('.trial-cast-text')
    p.textContent = '' // 不让上一条广播在横幅展开时闪一下
    box.classList.add('is-on')
    box.classList.toggle('is-alarm', !!opts.alarm)
    App.audio.sfx(opts.sfx || 'chime', { volume: 0.7 })
    if (window.gsap) gsap.fromTo(box.querySelector('.trial-cast-band'), { scaleY: 0 }, { scaleY: 1, duration: 0.35, ease: 'expo.out' })
    await wait(250)
    await typeIn(p, text, opts.speed || 34)
    await wait(opts.hold == null ? 1600 : opts.hold)
    box.classList.remove('is-on')
    await wait(200, false)
  }
  // 公开能力的亮牌横幅
  async function banner(identName, who, hold = 1500) {
    const E = S.E
    const b = E.banner
    const sg = b.querySelector('.trial-banner-sigil')
    sg.innerHTML = ''
    sg.appendChild(sigil(identName))
    b.querySelector('.trial-banner-text b').textContent = identName
    b.querySelector('.trial-banner-text span').textContent = who ? nameOf(who) : ''
    b.classList.add('is-on')
    App.audio.sfx('stamp')
    App.audio.sfx('flip', { volume: 0.6 })
    if (window.gsap) {
      gsap.fromTo(b.querySelector('.trial-banner-band'), { xPercent: -120, skewX: -18 }, { xPercent: 0, skewX: -12, duration: 0.5, ease: 'expo.out' })
      App.glitch(b.querySelector('.trial-banner-text b'), 0.35)
    }
    App.shake(S.stage, 6, 0.3)
    await wait(hold)
    if (window.gsap) await anim(r => gsap.to(b.querySelector('.trial-banner-band'), { xPercent: 120, duration: 0.35, ease: 'expo.in', onComplete: r }))
    b.classList.remove('is-on')
  }
  // 桌心大字
  async function stamp(word, opts = {}) {
    const s = S.E.stamp
    s.textContent = word
    s.className = 'trial-stamp is-on' + (opts.cls ? ' ' + opts.cls : '')
    App.audio.sfx(opts.sfx || 'stamp')
    if (window.gsap) gsap.fromTo(s, { scale: 2.4, opacity: 0, rotate: -10 }, { scale: 1, opacity: 1, rotate: -4, duration: 0.45, ease: 'expo.out' })
    App.shake(S.stage, 5, 0.25)
    await wait(opts.hold || 900)
    if (window.gsap) gsap.to(s, { opacity: 0, scale: 0.9, duration: 0.3, onComplete: () => { s.className = 'trial-stamp' } })
    else s.className = 'trial-stamp'
  }

  /* ---------- 破绽（运行规则 5.4）：破绽成立而你察觉到了，才看得见——肖像抖一帧、话断出「……」、席位上留一只小眼睛 ---------- */
  // 这一次破绽玩家看不看得见（旁观时，在场有人察觉就演出来）
  const tellShown = t => !!(t && t.shown && (t.player || (S.spectate && t.seen && t.seen.length)))
  function tellJolt(node) {
    App.audio.sfx('glitch', { volume: 0.22 })
    if (!node || !window.gsap) return
    gsap.set(node, { x: 6, y: -2 })
    requestAnimationFrame(() => requestAnimationFrame(() => gsap.set(node, { x: 0, y: 0, clearProps: 'transform' })))
  }
  // 逐字打出，到三四成处断开：先停一拍，补上「……」，再说完
  async function typeBroken(node, text, speed = 22) {
    if (isAct(text)) return typeIn(node, text, speed, true)
    const tok = S.token
    const chars = Array.from(text || '')
    let cut = Math.max(2, Math.round(chars.length * 0.35))
    const pi = chars.findIndex((ch, i) => i >= 3 && i <= chars.length * 0.6 && /[，、；：]/.test(ch))
    if (pi > 0) cut = pi + 1
    node.textContent = ''
    node.classList.add('trial-caret')
    let skipped = false
    const sk = () => { skipped = true }
    S.skippers.add(sk)
    try {
      for (let i = 0; i < chars.length; i++) {
        guard(tok)
        if (skipped) break
        if (i === cut) {
          await wait(260, false)
          node.textContent += '……'
          App.audio.sfx('heartbeat', { volume: 0.25 })
          await wait(520, false)
        }
        node.textContent += chars[i]
        if (i % 2 === 0 && chars[i].trim()) App.audio.sfx('type')
        await wait(/[。！？…]/.test(chars[i]) ? speed * 5 : /[，、；：]/.test(chars[i]) ? speed * 2.4 : speed, false)
      }
    } finally { S.skippers.delete(sk) }
    node.textContent = chars.slice(0, cut).join('') + '……' + chars.slice(cut).join('')
    node.classList.remove('trial-caret')
  }
  // 记下这一案你察觉到的破绽：席位与证言卡上各留一只小眼睛
  function markTell(id, rec) {
    S.tellMarks = S.tellMarks || new Set()
    S.tellMarks.add(id)
    const card = rec || (S.talk && S.talk[id])
    if (card && !card.el.querySelector('.trial-card-tell')) card.el.appendChild(el('i.trial-card-tell', { html: EYE_MARK }))
    seatTell(id)
  }
  function seatTell(id) {
    const k = seatOf(id)
    if (!k || !S.seat[k] || S.seat[k].mark.querySelector('.is-tell')) return
    if (S.scene !== 'court' && S.scene !== 'after') return
    seatMark(id, EYE_MARK, 'is-tell')
  }

  // 发言：桌心出现说话人的脸与台词
  let sayFaceId = null
  async function say(id, text, opts = {}) {
    const E = S.E
    const box = E.say
    const fc = box.querySelector('.trial-say-face')
    if (sayFaceId !== id) {
      clearFaces(fc)
      fc.appendChild(face(id, { eyeRange: 8 }))
      sayFaceId = id
    }
    box.querySelector('.trial-say-name b').textContent = nameOf(id)
    box.querySelector('.trial-say-name span').textContent = U.roman(seatOf(id))
    const tag = box.querySelector('.trial-say-tag')
    tag.textContent = opts.tag || ''
    const act = isAct(text)
    const right = opts.tone === 'defend' || opts.tone === 'counter'
    box.className = 'trial-say is-on' + (opts.tone ? ' is-' + opts.tone : '') + (right ? ' is-right' : '') + (isMe(id) ? ' is-me' : '') + (act ? ' is-act' : '')
    spotlight(id)
    if (window.gsap) {
      gsap.fromTo(fc, { x: right ? 40 : -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'expo.out' })
      gsap.fromTo(box.querySelector('.trial-say-body'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'expo.out' })
      if (opts.tag) gsap.fromTo(tag, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, delay: 0.15, ease: 'expo.out' })
    }
    App.audio.sfx('whoosh', { volume: 0.35 })
    if (opts.tone === 'accuse' || opts.tone === 'counter') { App.shake(S.stage, 4, 0.25); S.stage.classList.add('is-hot'); setTimeout(() => S.stage.classList.remove('is-hot'), 700) }
    if (tellShown(opts.tell)) {
      await wait(200, false)
      tellJolt(fc)
      markTell(id)
      await typeBroken(box.querySelector('.trial-say-line'), text, S.spectate ? 16 : 21)
    } else await typeIn(box.querySelector('.trial-say-line'), text, S.spectate ? 16 : 21, act)
    await wait(opts.hold == null ? (S.spectate ? 600 : 850) : opts.hold)
  }
  function hideSay() {
    S.E.say.classList.remove('is-on')
    spotlight(null)
  }

  /* ---------- 插话气泡：一闪而过（附议、质疑、投票、旁观、自言自语……），不挡节奏 ----------
     at：舞台坐标 {x, y}（气泡中心）；life：停留秒数。只动 transform / opacity。 */
  function quip(id, text, opts = {}) {
    if (!S.E.quips || !text) return null
    const act = isAct(text)
    const q = el('div.trial-quip' + (opts.tone ? '.is-' + opts.tone : '') + (act ? '.is-act' : '') + (isMe(id) ? '.is-me' : ''), null, [
      el('div.trial-quip-face'),
      el('div.trial-quip-body', null, [el('b', { text: nameOf(id) }), el('p', { text })]),
    ])
    q.firstChild.appendChild(App.portrait(id, { track: false }))
    const g = S.geo || { W: S.stage.clientWidth, H: S.stage.clientHeight }
    const at = opts.at || { x: g.W / 2, y: g.H / 2 }
    S.E.quips.appendChild(q)
    // 不出舞台：按气泡实际宽高夹住中心点
    const w = q.offsetWidth, h = q.offsetHeight
    const x = U.clamp(at.x, w / 2 + 10, g.W - w / 2 - 10), y = U.clamp(at.y, h / 2 + 60, g.H - h / 2 - 10)
    q.style.left = (x - w / 2).toFixed(1) + 'px'
    q.style.top = (y - h / 2).toFixed(1) + 'px'
    const life = opts.life || 2.4
    if (window.gsap) {
      gsap.fromTo(q, { opacity: 0, y: 10, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'expo.out' })
      gsap.to(q, { opacity: 0, y: -10, duration: 0.4, delay: life, ease: 'power2.in', onComplete: () => q.remove() })
    } else setTimeout(() => q.remove(), life * 1000)
    return q
  }
  // 席位旁的气泡：从席位朝桌心挪一点
  function seatQuipAt(id) {
    const g = S.geo
    const k = seatOf(id)
    if (!g || !k) return null
    const p = g.pos[k]
    const dx = g.cx - p.x, dy = g.cy - p.y, d = Math.hypot(dx, dy) || 1
    const off = g.mobile ? g.sw * 1.1 : g.sw * 1.25
    return { x: p.x + (dx / d) * off, y: p.y + (dy / d) * off * 0.8 }
  }
  function quipSeat(id, text, opts = {}) { return quip(id, text, Object.assign({ at: seatQuipAt(id) }, opts)) }
  // 调查时的自言自语：底部正中，证物栏上方
  function voice(id, text) {
    const g = S.geo
    if (!g) return null
    // 手机上让过右下角的「询问 / 开庭」
    const y = g.mobile ? g.H - 104 - 14 - 48 - 44 : g.H - 112 - 46
    return quip(id, text, { at: { x: g.W / 2, y }, tone: 'voice', life: 2.8 })
  }
  function clearQuips() { if (S.E.quips) S.E.quips.innerHTML = '' }
  // 随机挑几个人各说一句（反应、旁观、公布后）
  function pickVoices(pool, n) { return U.shuffle(pool.filter(Boolean)).slice(0, n) }

  /* ---------- 出示证据：证物卡从证物栏飞到桌心、盖章，再射向被指认者 ---------- */
  async function proof(speaker, clue, target, opts = {}) {
    if (!clue || !S.geo) return null
    const g = S.geo
    const chip = el('div.trial-proof' + (clue.claim ? '.is-claim' : ''), null, [el('span.trial-proof-ico', { html: icon(clue.tpl) }), el('b', { text: clue.label || clue.name })])
    S.E.quips.appendChild(chip)
    const mid = { x: g.cx, y: g.cy - (g.mobile ? 96 : Math.min(150, g.ry * 0.62)) }
    chip.style.left = mid.x + 'px'
    chip.style.top = mid.y + 'px'
    const rec = S.cards.find(r => r.item.id === clue.id)
    const sr = S.stage.getBoundingClientRect()
    let from = seatCenter(seatOf(speaker))
    if (rec) {
      const r = rec.el.getBoundingClientRect()
      if (r.width) from = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 }
      rec.el.classList.add('is-shown')
      setTimeout(() => rec.el.classList.remove('is-shown'), 1600)
    }
    App.audio.sfx('card')
    if (window.gsap) {
      await anim(r => gsap.fromTo(chip, { x: from.x - mid.x, y: from.y - mid.y, scale: 0.45, rotate: -14, opacity: 0 }, { x: 0, y: 0, scale: 1.12, rotate: -4, opacity: 1, duration: 0.42, ease: 'expo.out', onComplete: r }))
    }
    App.audio.sfx('stamp', { volume: 0.7 })
    App.shake(S.stage, 4, 0.2)
    await wait(S.spectate ? 260 : 360)
    // 误导的「证据」：留在桌心，等人驳回（或辩论结束时收走）
    if (opts.keep) { chip.classList.add('is-kept'); if (window.gsap) gsap.to(chip, { scale: 0.86, y: -6, duration: 0.3, ease: 'power2.out' }); return chip }
    if (!window.gsap) { chip.remove(); return null }
    if (target) {
      const to = seatCenter(seatOf(target))
      gsap.to(chip, { x: to.x - mid.x, y: to.y - mid.y, scale: 0.35, rotate: 8, opacity: 0, duration: 0.38, ease: 'power3.in', onComplete: () => { chip.remove(); shakeSeat(target) } })
    } else gsap.to(chip, { y: -40, opacity: 0, duration: 0.5, delay: 0.5, ease: 'power2.in', onComplete: () => chip.remove() })
  }

  // 选择按钮（桌心）
  function choose(items, opts = {}) {
    const box = opts.box || S.E.ask
    return ask(done => {
      box.innerHTML = ''
      box.classList.add('is-on')
      for (const it of items) {
        const b = button(it.label, it.tone === 'blood' ? 'btn--blood' : '', it.act || it.label)
        if (it.breath) b.classList.add('is-breath')
        b.addEventListener('click', e => { e.stopPropagation(); App.audio.sfx('click'); done(it.value) })
        box.appendChild(b)
      }
      if (window.gsap) gsap.fromTo(box.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'expo.out' })
      return () => { box.innerHTML = ''; box.classList.remove('is-on') }
    })
  }

  /* ==========================================================
     交互：点席位、能力、选人
     ========================================================== */
  function onStageClick(e) {
    if (S.profK && !App.finePointer) hideProf()
    if (S.paused || e.target.closest('button, a, .trial-roster, .trial-me, .trial-bar, .trial-veil, .trial-replay, .trial-ap, .trial-mm')) return
    touchSelect(null)
    // 身份卡的说明开着时，点别处先把它收起
    if (S.E.me && S.E.me.classList.contains('is-open')) { toggleMeText(false); return }
    if (S.armed) { disarm(); return }
    skipAll()
  }
  // 触屏没有悬停：第一次点只选中（席位上方出现动作字），再点一次才确认；点别处取消
  function touchSelect(k) {
    if (S.touchPick && S.seat[S.touchPick]) S.seat[S.touchPick].root.classList.remove('is-picked')
    S.touchPick = k || 0
    if (k && S.seat[k]) { S.seat[k].root.classList.add('is-picked'); App.audio.sfx('hover') }
  }
  function onSeatHover(k, on) {
    const s = S.seat[k]
    if (S.scene === 'intro' && s.id) s.root.classList.toggle('is-lit', on)
    if (!App.finePointer) return
    clearTimeout(S.profT)
    if (on && profOK(k)) S.profT = setTimeout(() => showProf(k), 260)
    else if (!on) hideProf()
  }
  function onSeatClick(k) {
    const s = S.seat[k]
    if (s.longAt && performance.now() - s.longAt < 900) { s.longAt = 0; return } // 刚长按看过档案
    if (S.scene === 'intro') {
      if (!s.id || !introReady()) return
      pickMe(s.id)
      return
    }
    if (!s.id) return
    if (S.armed) {
      if (S.G && TE.isLiving(S.G, s.id) && !isMe(s.id)) {
        if (S.presentArm && presentable(S.armed) && S.presentArm.ok(s.id)) {
          if (!App.finePointer && S.touchPick !== k) { touchSelect(k); return }
          touchSelect(null)
          S.presentArm.done(S.armed, s.id)
        } else if (notable(S.armed)) noteSeat(S.armed, s.id)
      }
      return
    }
    if (S.targeting && S.targeting.seat) {
      const t = S.targeting
      if (!App.finePointer && t.filter && t.filter(s.id, k) && S.touchPick !== k) { touchSelect(k); return }
      touchSelect(null)
      t.seat(s.id, k)
    }
  }
  // 选人模式：filter(id) 决定谁可选；返回 Promise<id>
  // 选人可以嵌套（投票时临时发动能力）：结束后恢复上一层仍然有效的选人
  const picks = new Set()
  function pickSeat(filter, label, opts = {}) {
    const prev = S.targeting
    let kill = null
    const p = ask(done => {
      const t = {
        alive: true,
        ability: opts.ability || null,
        seat: (id, k) => { if (filter(id, k)) { App.audio.sfx('drop'); done(id) } },
        cancel: opts.cancelable ? () => done(null) : null,
        filter, label,
      }
      kill = () => done(null)
      picks.add(kill)
      S.targeting = t
      touchSelect(null)
      refreshTargets()
      updateMe()
      return () => {
        t.alive = false
        picks.delete(kill)
        if (S.targeting === t) S.targeting = prev && prev.alive ? prev : null
        touchSelect(null)
        refreshTargets()
        updateMe()
      }
    })
    p.kill = () => { if (kill) kill() }
    return p
  }
  function killPicks() {
    for (const k of Array.from(picks)) k()
    S.targeting = null
    hideRoster()
    refreshTargets()
  }
  function refreshTargets() {
    for (let k = 1; k <= 15; k++) {
      const s = S.seat[k]
      let ok = false, label = ''
      if (S.armed) {
        ok = !!(s.id && S.G && TE.isLiving(S.G, s.id) && !isMe(s.id))
        const pres = S.presentArm && presentable(S.armed) && ok && S.presentArm.ok(s.id)
        label = pres ? '出示' : '标记'
        if (!pres && !notable(S.armed)) ok = false
      }
      else if (S.targeting && S.targeting.filter && s.id) { ok = !!S.targeting.filter(s.id, k); label = S.targeting.label }
      else if (S.scene === 'intro' && s.id && introReady()) { ok = true; label = '入座' }
      s.root.classList.toggle('is-target', ok)
      if (ok) s.hit.setAttribute('data-cursor', label)
      else s.hit.removeAttribute('data-cursor')
    }
    refreshCursor()
  }
  // 席位的光标字随阶段变化；鼠标不动时也要立刻换字（否则「指认」会一直挂到投票）
  function refreshCursor() {
    if (!App.finePointer || !App.cursor || !App.cursor.clear || S.cursorRaf) return
    S.cursorRaf = requestAnimationFrame(() => {
      S.cursorRaf = 0
      if (!S.visible || !App.mouse || !App.mouse.active) return
      const e = document.elementFromPoint(App.mouse.x, App.mouse.y)
      if (!e || !S.sec || !S.sec.contains(e)) return
      try { e.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })) } catch (err) {}
      App.cursor.clear()
    })
  }
  function cancelTargeting() {
    if (S.targeting && S.targeting.cancel) S.targeting.cancel()
    hideRoster()
  }

  // 调查期的名单（选人）
  function roster(count, filter, verb) {
    const box = S.E.roster
    const list = box.querySelector('.trial-roster-list')
    return ask(done => {
      clearFaces(list)
      const picked = []
      for (const id of living()) {
        if (!filter(id)) continue
        const b = el('button.trial-roster-item', { type: 'button', 'data-cursor': verb, 'aria-label': nameOf(id) }, [
          el('div.trial-roster-face'), el('b', { text: nameOf(id) }), el('span', { text: U.roman(seatOf(id)) }),
        ])
        b.querySelector('.trial-roster-face').appendChild(face(id, { eyeRange: 3 }))
        if (isMe(id)) b.classList.add('is-me')
        b.addEventListener('click', e => {
          e.stopPropagation()
          if (picked.includes(id)) { picked.splice(picked.indexOf(id), 1); b.classList.remove('is-picked'); return }
          picked.push(id)
          b.classList.add('is-picked')
          App.audio.sfx('drop')
          if (picked.length >= count) done(picked.slice())
        })
        list.appendChild(b)
      }
      box.classList.add('is-on')
      const kill = () => done(null)
      picks.add(kill)
      S.targeting = { ability: true, alive: true, cancel: kill, kill }
      updateMe()
      if (window.gsap) gsap.fromTo(list.children, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: 'expo.out' })
      return () => { box.classList.remove('is-on'); picks.delete(kill); S.targeting = null; updateMe(); setTimeout(() => clearFaces(list), 400) }
    })
  }
  function hideRoster() { S.E.roster.classList.remove('is-on') }

  // 点身份卡旁的能力按钮
  let abilityBusy = false
  async function onAbility() {
    // 正在选人时再点一下 = 取消
    if (S.targeting && S.targeting.ability) { cancelTargeting(); return }
    const a = myAbility()
    if (!a || abilityBusy) return
    disarm()
    abilityBusy = true
    App.audio.sfx('flip')
    try {
      const G = S.G, T = S.T
      if (a === 'fortune' || a === 'shifter') {
        const ids = await roster(1, id => id !== S.me, VERB[a])
        if (!ids) return
        if (a === 'fortune') {
          const r = TE.fortune(G, S.me, ids[0])
          if (r) await Inv.reveal(ids[0], r.name)
        } else {
          const r = TE.shapeshift(G, S.me, ids[0])
          if (r) await flipMe()
        }
      } else if (a === 'magician' || a === 'cupid') {
        const ids = await roster(2, () => true, VERB[a])
        if (!ids) return
        if (a === 'magician') {
          const r = TE.magic(G, S.me, ids[0], ids[1])
          if (r) { App.audio.sfx('whoosh'); if (ids.includes(S.me)) await flipMe() }
        } else {
          const r = TE.cupid(G, S.me, ids[0], ids[1])
          if (r) { App.audio.sfx('chime'); await flushNotices() }
        }
      } else if (a === 'knight' || a === 'executor' || a === 'silencer') {
        const id = await pickSeat(x => TE.isLiving(G, x) && x !== S.me, VERB[a], { ability: true, cancelable: true })
        if (!id) return
        TE.request(T, { type: a, actor: S.me, target: id })
        if (S.debateResolve) S.debateResolve({ kind: 'ability' })
        skipAll()
      } else if (a === 'puffer') {
        const p = G.people[S.me]
        let seat = null
        if (!p.puffSeat || !G.seats[p.puffSeat - 1] || !TE.isLiving(G, G.seats[p.puffSeat - 1])) {
          const id = await pickSeat(x => TE.isLiving(G, x), '择席', { ability: true, cancelable: true })
          if (!id) return
          seat = seatOf(id)
        }
        TE.request(T, { type: 'puffer', actor: S.me, seat })
        if (S.debateResolve) S.debateResolve({ kind: 'ability' })
        skipAll()
      } else if (a === 'judge') {
        const V = S.V
        const id = await pickSeat(x => V.targets.includes(x), VERB[a], { ability: true, cancelable: true })
        if (!id) return
        const j = TE.judge(G, T, V, S.me, id)
        if (j) seatMark(id, '+1', 'is-judge')
      } else if (a === 'hanged') {
        const V = S.V
        const from = V.ballots.filter(b => b.target === S.me && b.voter !== S.me).map(b => b.voter)
        if (!from.length) { App.audio.sfx('wrong', { volume: 0.4 }); shakeSeat(S.me); return }
        const id = await pickSeat(x => from.includes(x), VERB[a], { ability: true, cancelable: true })
        if (!id) return
        const r = TE.reflect(G, T, V, S.me, id)
        if (r) {
          drawLine(S.me, id, { cls: 'is-reflect', kind: 'vote', bend: -0.2 })
          seatMark(S.me, '−1', 'is-judge')
          seatMark(id, '+1', 'is-judge')
          App.audio.sfx('glitch', { volume: 0.4 })
        }
      }
    } catch (e) {
      if (e !== ABORT) console.error(e)
    } finally {
      abilityBusy = false
      updateMe()
    }
  }

  /* ==========================================================
     入局
     ========================================================== */
  function seatedCount() { return S.seats.filter(Boolean).length }
  function introReady() { return seatedCount() >= 5 && !S.active }
  function renderIntro() {
    const E = S.E
    fillSeats(S.seats)
    resetSeatStates()
    if (S.me && !S.seats.includes(S.me)) S.me = null
    if (S.me) S.seat[seatOf(S.me)].root.classList.add('is-me')
    E.count.innerHTML = `<b>${U.roman(Math.max(1, seatedCount())) || '—'}</b><i></i><span>XV</span>`
    if (!seatedCount()) E.count.querySelector('b').textContent = '0'
    E.mood.textContent = '十五把椅子，一个愿望'
    const ui = E.ui
    ui.innerHTML = ''
    if (seatedCount() < 5) {
      // 默认八人局（三案左右，十几分钟）；十五人局留作可选
      const g = el('div.trial-fillset', null, [el('span.trial-fill-label', { text: '随机补满' })])
      const b8 = button('八人', 'btn--blood', 'fill8')
      const b15 = button('十五人', '', 'fill15')
      b8.classList.add('is-breath')
      b8.addEventListener('click', e => { e.stopPropagation(); randomFill(8) })
      b15.addEventListener('click', e => { e.stopPropagation(); randomFill(15) })
      g.append(b8, b15)
      ui.appendChild(g)
    } else {
      const rnd = button('随机', '', 'random')
      rnd.addEventListener('click', e => { e.stopPropagation(); rouletteMe() })
      const go = button('开始', 'btn--blood', 'start')
      go.disabled = !S.me
      go.addEventListener('click', e => { e.stopPropagation(); if (S.me) startGame() })
      if (S.me) go.classList.add('is-breath')
      ui.append(rnd, go)
    }
    refreshTargets()
  }
  function randomFill(n) {
    const pool = U.shuffle(App.chars.map(c => c.id).filter(id => !S.seats.includes(id)))
    const seats = S.seats.slice()
    let need = n - seats.filter(Boolean).length
    // 先填满空位（八人时隔席入座，圆桌更匀称）
    const order = n >= 15 ? Array.from({ length: 15 }, (_, i) => i) : [0, 2, 4, 6, 8, 10, 12, 13, 1, 3, 5, 7, 9, 11, 14]
    for (const i of order) {
      if (need <= 0) break
      if (!seats[i] && pool.length) { seats[i] = pool.shift(); need-- }
    }
    S.seats = seats
    App.audio.sfx('card')
    renderIntro()
    layout()
    if (window.gsap) {
      const nodes = S.seat.filter(s => s && s.id).map(s => s.card)
      gsap.fromTo(nodes, { y: -30, opacity: 0, rotate: -6 }, { y: 0, opacity: 1, rotate: 0, duration: 0.7, stagger: 0.04, ease: 'expo.out', onStart: () => App.audio.sfx('drop', { volume: 0.5 }) })
    }
  }
  function pickMe(id) {
    S.me = id
    App.audio.sfx('drop')
    for (let k = 1; k <= 15; k++) S.seat[k].root.classList.toggle('is-me', S.seat[k].id === id)
    const k = seatOf(id)
    if (window.gsap && k) gsap.fromTo(S.seat[k].card, { y: -14 }, { y: 0, duration: 0.6, ease: 'bounce.out' })
    renderIntro()
  }
  let rouletteBusy = false
  async function rouletteMe() {
    if (rouletteBusy || !introReady()) return
    rouletteBusy = true
    const ids = S.seats.filter(Boolean)
    const target = U.pick(ids)
    const ks = ids.map(id => S.seats.indexOf(id) + 1)
    let i = U.randInt(0, ks.length - 1)
    const steps = ks.length * 2 + ks.indexOf(S.seats.indexOf(target) + 1) - i + ks.length
    for (let n = 0; n < steps; n++) {
      i = (i + 1) % ks.length
      for (const k of ks) S.seat[k].root.classList.toggle('is-lit', k === ks[i])
      App.audio.sfx('tick', { volume: 0.5 })
      await new Promise(r => setTimeout(r, 40 + Math.pow(n / steps, 3) * 260))
      if (S.active || !introReady()) { rouletteBusy = false; return }
    }
    for (const k of ks) S.seat[k].root.classList.remove('is-lit')
    rouletteBusy = false
    pickMe(S.seats[ks[i] - 1])
  }

  /* ==========================================================
     游戏模式：滚动锁定 / 离席 / 续局
     ========================================================== */
  function lockScroll() {
    const top = S.sec.getBoundingClientRect().top + window.scrollY
    S.lockAt = performance.now()
    const L = App.scroll && App.scroll.lenis
    if (L) {
      L.scrollTo(top, { duration: 0.7, force: true, lock: true, onComplete: () => { if (S.active) App.scroll.stop() } })
      setTimeout(() => { if (S.active) App.scroll.stop() }, 900)
    } else {
      window.scrollTo(0, top)
      App.scroll && App.scroll.stop()
    }
  }
  // 游戏模式登记在 App.mode：顶栏编号、目录、PgUp/PgDn、数字键跳转前会先调用 exitGame（暂停、留住进度），再解锁滚动
  function enterGameMode() {
    S.active = true
    S.paused = false
    S.stage.classList.add('is-playing')
    S.E.veil.classList.remove('is-on')
    if (App.mode) App.mode.enter('trial', () => exitGame())
    lockScroll()
  }
  // 任何阶段都可以离席：等待、打字、计时、选人都停在原处（见 wait / hold / ask），续局时接着走
  function exitGame() {
    if (App.mode) App.mode.leave('trial')
    if (!S.active) return
    S.active = false
    S.paused = true
    disarm()
    touchSelect(null)
    S.stage.classList.remove('is-playing', 'is-hot')
    // 别把庭审的紧张、死后的黑暗带进别的板块
    App.audio.setMood({ tension: 0 })
    if (App.bg && App.bg.setDark) App.bg.setDark(0, 0.6)
    App.scroll && App.scroll.start()
    // 顶栏时钟交还给滚动进度
    if (App.state.minutes != null) App.bus.emit('time', App.state.minutes)
    showVeil()
  }
  // 音乐紧张度：记下来，离席时归零、续局时恢复
  function tension(v) {
    S.tension = v
    App.audio.setMood({ tension: v })
  }
  function showVeil() {
    const v = S.E.veil
    const row = v.querySelector('.trial-veil-row')
    row.innerHTML = ''
    const a = button('续局', 'btn--blood', 'resume')
    const b = button('重来', '', 'restart')
    a.addEventListener('click', e => { e.stopPropagation(); resumeGame() })
    b.addEventListener('click', e => { e.stopPropagation(); hardReset() })
    row.append(a, b)
    v.classList.add('is-on')
    App.audio.sfx('door', { volume: 0.4 })
  }
  function resumeGame() {
    enterGameMode()
    S.paused = false
    if (S.shownTime != null) emitTime(S.shownTime)
    mood(sceneMood())
    App.audio.setMood({ tension: S.tension || 0 })
    if (S.scene === 'end' && S.endMood === 'dead' && App.bg && App.bg.setDark) App.bg.setDark(0.6, 1.2)
    if (S.scene === 'inv' && S.visible) Inv.start()
  }
  function sceneMood() {
    return { intro: 'intro', deal: 'intro', cine: 'cine', inv: 'inv', court: 'court', exec: 'exec', after: 'after', replay: 'after', end: S.endMood || 'end' }[S.scene] || 'court'
  }
  function hardReset() {
    if (App.mode) App.mode.leave('trial')
    S.token++
    S.skippers.clear()
    S.active = false
    S.paused = false
    S.running = false
    S.G = null
    S.T = null
    S.V = null
    S.C = null
    S.shownTime = null
    S.spectate = false
    S.deadShown = false
    S.phase = null
    S.targeting = null
    S.debateResolve = null
    sayFaceId = null
    if (S.stage) {
      S.stage.classList.remove('is-playing', 'is-armed', 'is-hot', 'is-vote')
      S.E.veil.classList.remove('is-on')
      S.E.cast.classList.remove('is-on')
      S.E.banner.classList.remove('is-on')
      S.E.say.classList.remove('is-on')
      S.E.reel.classList.remove('is-on')
      S.E.ask.classList.remove('is-on')
      S.E.ask.innerHTML = ''
      S.E.notes.innerHTML = ''
      S.E.idcard.classList.remove('is-on', 'is-flipped')
      S.E.desk.classList.remove('is-on')
      S.E.me.classList.remove('is-open', 'is-on', 'is-dead', 'is-window', 'is-choice')
      hideHand()
      S.E.ap.classList.remove('is-on')
      S.E.mm.classList.remove('is-on')
      S.E.inv.classList.remove('is-dark')
      if (S.pairChips) { S.pairChips.forEach(x => x.remove()); S.pairChips = null }
      S.claimChip = null
      S.frame = null
      S.autopsy = null
      S.discuss = false
      hideRoster()
      clearBar()
      clearLines(null, false)
      clearCoins()
      clearDoors()
      hideProf()
      Inv.stop()
      clearFaces(S.E.say.querySelector('.trial-say-face'))
      clearFaces(S.E.end.querySelector('.trial-end-face'))
      clearFaces(S.E.end.querySelector('.trial-end-row'))
      const led = S.E.end.querySelector('.trial-end-ledger')
      if (led) { clearFaces(led); led.remove() }
      clearFaces(S.E.replay.querySelector('.trial-rp-head'))
      if (window.gsap) gsap.set(S.E.end.querySelector('.trial-end-face'), { clearProps: 'transform,opacity' })
      clearFaces(S.E.exec.querySelector('.trial-exec-who'))
      clearQuips()
      Inv.closePop()
    }
    App.scroll && App.scroll.start()
    tension(0)
    setCoins(0)
    setScene('intro')
    mood('intro')
    renderIntro()
    layout()
  }

  /* ==========================================================
     主流程
     ========================================================== */
  async function startGame() {
    if (S.running || !S.me) return
    const ids = S.seats
    S.G = TE.create({ seats: ids, player: S.me, seed: Math.floor(Math.random() * 2 ** 31) })
    S.lastTime = -1
    resetLines()
    S.running = true
    S.spectate = false
    S.deadShown = false
    S.left = false
    S.consumed = {}
    // 本局钱袋：规则宣告之后，有人坐的那几摞已各自取走，你身上 10 枚（不跨局累积）
    const e = App.econ ? App.econ.newGame({ me: S.me, seats: S.seats }) : null
    S.econGame = e ? e.game : 0
    setCoins(e ? e.coins : TE.START_COINS)
    syncPurse()
    enterGameMode()
    const tok = ++S.token
    try {
      await dealScene()
      let guardN = 0
      while (guardN++ < 60) {
        guard(tok)
        const t0 = S.G.minutes
        const c = TE.newCase(S.G)
        if (c.type === 'final') { await finale(c.winner); break }
        if (c.type === 'stall') { await stallScene(); break }
        if (c.type === 'overdue') {
          await overdueScene(c, t0)
          if (await checkDeath()) break
          const w = TE.winner(S.G)
          if (w) { await finale(w === 'none' ? null : w); break }
          continue
        }
        S.C = c
        await caseScene(c, t0)
        if (c.lastStanding !== undefined) { await finale(c.lastStanding); break }
        await investigate(c)
        const pay = await court(c)
        if (pay === 'restart') return
        await aftermath(c, pay)
        const w = TE.winner(S.G)
        // 结案对账（可跳过）：它的按钮就是「下一案」/「终局」
        await replay(c, w ? '终局' : '下一案')
        if (w) { await finale(w === 'none' ? null : w); break }
        clearCoins()
        clearBar()
        clearQuips()
        resetSeatStates()
        syncSeats()
      }
    } catch (e) {
      if (e !== ABORT) console.error('[trial]', e)
    } finally {
      if (tok === S.token) S.running = false
    }
  }
  // 玩家死后：旁观或重来；返回 true 表示应停止主流程
  async function checkDeath() {
    if (!S.G || S.deadShown || !S.me || TE.isLiving(S.G, S.me)) return false
    S.deadShown = true
    const v = await deadScene()
    if (v === 'restart') { setTimeout(hardReset, 0); return true }
    S.spectate = true
    return false
  }

  /* ---------- 发牌 ---------- */
  async function dealScene() {
    setScene('deal')
    mood('intro')
    updateTop()
    resetSeatStates()
    fillSeats(S.G.seats)
    syncSeats()
    S.E.ui.innerHTML = ''
    S.E.mood.textContent = ''
    S.E.count.innerHTML = ''
    const E = S.E
    // 牌从桌心飞向每个席位
    const g = S.geo
    const flights = []
    for (const id of S.G.order) {
      const k = seatOf(id)
      const c = el('i.trial-flycard')
      S.stage.appendChild(c)
      const p = seatCenter(k)
      c.style.left = g.cx + 'px'
      c.style.top = g.cy + 'px'
      flights.push({ c, p })
    }
    if (window.gsap) {
      await anim(r => {
        const tl = gsap.timeline({ onComplete: r })
        flights.forEach((f, i) => {
          tl.to(f.c, { x: f.p.x - g.cx, y: f.p.y - g.cy, rotate: U.rand(-200, 200), duration: 0.5, ease: 'power3.out', onStart: () => { if (i % 2 === 0) App.audio.sfx('card', { volume: 0.6 }) } }, i * 0.07)
          tl.to(f.c, { opacity: 0, scale: 0.4, duration: 0.25 }, i * 0.07 + 0.45)
        })
      })
    }
    flights.forEach(f => f.c.remove())
    // 你的牌
    const id = myIdent()
    const d = identData(id.name)
    const card = E.idcard
    const fc = card.querySelector('.trial-idcard-face')
    const sg = fc.querySelector('.trial-idcard-sigil')
    sg.innerHTML = ''
    sg.appendChild(sigil(id.name))
    fc.querySelector('.trial-idcard-name').textContent = id.name
    fc.querySelector('.trial-idcard-no').textContent = U.roman(d.no || 1)
    fc.querySelector('.trial-idcard-text').textContent = d.frontText || ''
    // 卡面原文长短不一：长文时纹章让位
    const len = (d.frontText || '').length
    card.classList.toggle('is-long', len > 150 && len <= 240)
    card.classList.toggle('is-xlong', len > 240)
    fitIdcard()
    card.classList.add('is-on')
    card.classList.remove('is-flipped')
    const mk = seatOf(S.me)
    const mp = seatCenter(mk)
    if (window.gsap) {
      gsap.fromTo(card, { x: mp.x - g.W / 2, y: mp.y - g.H / 2, scale: 0.2, rotate: -20, opacity: 0 }, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, duration: 0.9, ease: 'expo.out' })
    }
    App.audio.sfx('card')
    await wait(900)
    card.classList.add('is-flipped')
    App.audio.sfx('flip')
    App.bg && App.bg.pulse(0.35)
    await wait(700)
    await choose([{ label: '继续', value: 1, tone: 'blood', breath: true }], { box: E.dealGo })
    // 卡缩进左下角
    renderMe()
    const target = E.me.querySelector('.trial-me-card').getBoundingClientRect()
    const sr = S.stage.getBoundingClientRect()
    if (window.gsap) {
      await anim(r => gsap.to(card, {
        x: target.left - sr.left + target.width / 2 - g.W / 2, y: target.top - sr.top + target.height / 2 - g.H / 2,
        scale: 0.16, rotate: -8, opacity: 0, duration: 0.7, ease: 'expo.in', onComplete: r,
      }))
    }
    card.classList.remove('is-on', 'is-flipped')
    if (window.gsap) gsap.set(card, { clearProps: 'all' })
    E.me.classList.add('is-on')
    App.audio.sfx('drop')
    // 醒来的第一句：你，再两个人
    const wakers = [S.me].concat(pickVoices(S.G.order.filter(x => x !== S.me), 2))
    for (const id of wakers) {
      quipSeat(id, line(id, 'wake'), { tone: 'wake', life: 3 })
      await wait(700)
    }
    await wait(1300)
  }

  /* ---------- 受命 → 行凶 → 发现 ---------- */
  function setDial(m) {
    const E = S.E
    const mm = Math.floor(m)
    E.cine.querySelector('.trial-cine-day').textContent = dayText(mm)
    E.cine.querySelector('.trial-cine-time').textContent = hhmm(mm)
    const hands = E.cine.querySelectorAll('.trial-dial-hand')
    hands[1].setAttribute('transform', `rotate(${(mm % 60) * 6} 500 500)`)
    hands[0].setAttribute('transform', `rotate(${((mm % 720) / 60) * 30} 500 500)`)
  }
  async function caseScene(c, t0) {
    const E = S.E
    const hands = E.cine.querySelectorAll('.trial-dial-hand')
    const dots = E.cine.querySelectorAll('.trial-dial-dots circle')
    const moodEl = E.cine.querySelector('.trial-cine-mood')
    await slash(() => {
      setScene('cine')
      mood('cine')
      hideSay()
      E.cine.classList.remove('is-found')
      clearFaces(E.cine.querySelector('.trial-cine-face'))
      // 幕布揭开时表盘已经就位：十五颗席位点（空席、死者熄灭）、指针、时刻
      dots.forEach((d, i) => d.classList.toggle('is-off', !S.G.seats[i] || !TE.isLiving(S.G, S.G.seats[i]) && S.G.seats[i] !== c.victim))
      setDial(t0)
      moodEl.textContent = ''
    })
    const day = E.cine.querySelector('.trial-cine-day')
    const time = E.cine.querySelector('.trial-cine-time')
    moodEl.textContent = c.no === 1 ? '钟在走，有人在动' : '又一个二十四小时'
    if (window.gsap) gsap.fromTo(moodEl, { opacity: 0, letterSpacing: '1.2em' }, { opacity: 1, letterSpacing: '.6em', duration: 2.2, ease: 'power2.out' })
    const t1 = c.tDiscover || c.tMurder
    const seer = S.G.people[S.me] && S.G.people[S.me].ident.name === '先知' && (meAlive())
    let lastMin = -1, fired = false, tickN = 0
    const tok = S.token
    // 表盘从 from 走到 to（缓入缓出）；走过行凶时刻时熄灭死者的席位点
    const dialRun = (from, to, dur) => ask(done => {
      let last = performance.now(), run = 0
      const off = App.tick(() => {
        if (tok !== S.token) return
        // 只累计没有离席的时间：续局时钟从停下的地方接着走
        const now = performance.now()
        if (!S.paused) run += now - last
        last = now
        if (S.paused) return
        const k = Math.min(1, run / dur)
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        const m = from + (to - from) * e
        const mm = Math.floor(m)
        if (mm !== lastMin) {
          lastMin = mm
          day.textContent = dayText(mm)
          time.textContent = hhmm(mm)
          const mins = mm % 60, hrs = (mm % 720) / 60
          hands[1].setAttribute('transform', `rotate(${mins * 6} 500 500)`)
          hands[0].setAttribute('transform', `rotate(${hrs * 30} 500 500)`)
          if (++tickN % 9 === 0) App.audio.sfx('tick', { volume: 0.4 })
          if (S.G) { const keep = S.G.minutes; S.G.minutes = mm; updateTop(); S.G.minutes = keep }
        }
        if (!fired && m >= c.tMurder) {
          fired = true
          dots.forEach((d, i) => { if (S.G.seats[i] === c.victim) d.classList.add('is-off') })
          if (seer) { flushNotices() } else { S.G.notices = S.G.notices.filter(n => n.type !== 'death') }
        }
        if (k >= 1) { off(); done() }
      })
      return () => off()
    })
    if (c.doorLock && c.tMurder > t0) {
      // 典狱长：发动的那一刻全馆广播（主持人游戏 5.1、7）——表盘停在行凶时刻，广播之后再走到发现
      const share = U.clamp((c.tMurder - t0) / Math.max(1, t1 - t0), 0.45, 0.85)
      await dialRun(t0, c.tMurder, 4200 * share)
      App.audio.sfx('door', { volume: 0.9 })
      App.shake(S.stage, 10, 0.4)
      const ab = (window.WORLD && WORLD.broadcasts && WORLD.broadcasts.abilities || []).find(x => x.ability === '典狱长')
      await broadcast(ab ? ab.text : '', { alarm: true, hold: 1200, sfx: 'door' })
      await dialRun(c.tMurder, t1, 4200 * (1 - share))
    } else await dialRun(t0, t1, 4200)
    await flushNotices()
    if (c.lastStanding !== undefined) {
      await wait(900)
      return
    }
    // 发现：硬切
    S.G.minutes = c.tDiscover
    updateTop()
    App.flash(App.color.blood, { opacity: 0.85, duration: 0.7 })
    App.audio.sfx('discover')
    App.shake(S.stage, 14, 0.5)
    App.bg && App.bg.pulse(1)
    mood('inv')
    E.cine.classList.add('is-found')
    const fc = E.cine.querySelector('.trial-cine-face')
    fc.appendChild(face(c.discoverer, { eyeRange: 9 }))
    E.cine.querySelector('.trial-cine-who b').textContent = nameOf(c.discoverer)
    const lineEl = E.cine.querySelector('.trial-cine-who p')
    lineEl.textContent = ''
    if (window.gsap) gsap.fromTo(fc, { xPercent: -30, opacity: 0, skewX: -8 }, { xPercent: 0, opacity: 1, skewX: 0, duration: 0.6, ease: 'expo.out' })
    await wait(500)
    const ctx = { cause: c.cause.id, since: c.tDiscover - c.tMurder, floor: c.roomInfo.floor }
    const vName = callOf(c.victim)
    const said = line(c.discoverer, 'discover', { V: vName }, ctx)
    lineEl.classList.toggle('is-act', isAct(said))
    await typeIn(lineEl, said, 26, isAct(said))
    // 其余的人听说了：一两句反应，一闪而过
    const g = S.geo
    const others = pickVoices(living().filter(x => x !== c.discoverer), U.randInt(1, 2))
    others.forEach((id, i) => {
      const at = g.mobile ? { x: g.W / 2 + (i ? 40 : -40), y: g.H - 210 + i * 66 } : { x: g.W * (i ? 0.7 : 0.6), y: g.H * (i ? 0.81 : 0.7) }
      setTimeout(() => { if (S.scene === 'cine' && !S.paused) quip(id, line(id, 'react', { V: vName }, ctx), { at, tone: 'react', life: 2.6 }) }, 350 + i * 750)
    })
    await wait(600 + others.length * 650)
    if (c.bell) App.audio.sfx('bell')
    const text = c.bell
      ? bcText('同上，敲钟人生效', { 开庭时刻: hhmm(c.tCourt) })
      : bcText('尸体被有效发现', { 开庭时刻: hhmm(c.tCourt) })
    await broadcast(text, { alarm: true, hold: 1400 })
    await choose([{ label: '调查', value: 1, tone: 'blood', breath: true }], { box: S.E.cine.querySelector('.trial-cine-go') })
  }

  /* ---------- 逾期 ---------- */
  async function overdueScene(c, t0) {
    const E = S.E
    const dots = E.cine.querySelectorAll('.trial-dial-dots circle')
    await slash(() => {
      setScene('cine'); mood('cine'); E.cine.classList.remove('is-found'); clearFaces(E.cine.querySelector('.trial-cine-face'))
      dots.forEach((d, i) => d.classList.toggle('is-off', !S.G.seats[i] || !TE.isLiving(S.G, S.G.seats[i])))
      setDial(t0)
    })
    E.cine.querySelector('.trial-cine-mood').textContent = '二十四小时'
    const steps = 40
    for (let i = 0; i <= steps; i++) {
      const m = t0 + (c.at - t0) * (i / steps)
      setDial(m)
      if (i % 4 === 0) App.audio.sfx('tick', { volume: 0.4 })
      await wait(60, false)
    }
    c.executed.forEach(id => { const k = S.G.seats.indexOf(id); if (dots[k]) dots[k].classList.add('is-off') })
    S.G.minutes = c.at
    updateTop()
    await broadcast(bcText('受命者逾期', { 某某: callOf(c.mandated) }), { alarm: true })
    await execute(c.executed, { overdue: true })
    await flushNotices()
  }

  /* ==========================================================
     调查
     ========================================================== */
  /* 调查期全馆灯亮（洋馆物理层 3.1）：底图是亮着的房间，只在平面图或标记变了时重画（.trial-inv-cv）。
     光标是一盏「侧光」，画在跟着光平移的小画布上（.trial-inv-light）：平时只是一圈冷光；按住（触屏长按）时
     光圈压低、拉长成一道贴地的侧光，手印、淡渍、刮痕这类痕迹（物理层 7.1–7.2「侧光下」）只在它扫过时显出——
     这样的热点在被扫到之前不可点（sp.raking && !sp.revealed）。痕迹另画在一张整屏的离屏画布上（this.trace），侧光里才取用。 */
  const Inv = {
    cv: null, ctx: null, plan: null, pctx: null, trace: null, tctx: null,
    W: 0, H: 0, dpr: 1, geo: null, c: null, objs: [], doors: [], body: null, spots: [],
    light: { x: 0, y: 0, tx: 0, ty: 0, r: 120, tapAt: 0, p: 0, ang: -0.12, vx: 0, vy: 0 }, off: null, dust: [], running: false, busy: false, t: 0,
    press: false, autoPress: false,

    setup(c) {
      const E = S.E
      this.c = c
      this.cv = E.inv.querySelector('.trial-inv-cv')
      this.ctx = this.cv.getContext('2d')
      this.plan = document.createElement('canvas')
      this.pctx = this.plan.getContext('2d')
      this.trace = document.createElement('canvas')
      this.tctx = this.trace.getContext('2d')
      // 侧光单独一张小画布（只有光的大小，跟着光平移）；整屏的 .trial-inv-cv 只画亮着的底图与标记，不每帧重画
      if (!this.lv) {
        this.lv = el('canvas.trial-inv-light', { 'aria-hidden': 'true' })
        this.cv.after(this.lv)
        this.lvc = this.lv.getContext('2d')
      }
      this.lvx = this.lvy = null
      this.press = this.autoPress = false
      this.light.p = 0
      // 第一次调查时，光圈自己一压一放（呼吸），提示按住；按过一次就不再提示
      this.hint = !App.store.get('trial-rake', false)
      const r = U.seeded((c.no * 7919 + (S.G.seed % 100000)) >>> 0)
      this.layoutRoom(c, r)
      for (const sp of this.spots) sp.revealed = !sp.raking
      this.scuffs = Array.from({ length: 5 }, () => ({ u: r() * this.w, v: r() * this.h, a: r() * Math.PI, l: 0.15 + r() * 0.35 }))
      this.dust = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), v: 0.2 + Math.random() * 0.6 }))
      this.resize()
      const box = E.inv.querySelector('.trial-inv-spots')
      box.innerHTML = ''
      for (const sp of this.spots) {
        const label = sp.kind === 'body' ? '验尸' : sp.place === 'away' ? '追踪' : '细查'
        const b = el('button.trial-spot' + (sp.kind === 'body' ? '.is-body' : '') + (sp.revealed ? '' : '.is-hidden') + (sp.blocked ? '.is-blocked' : ''), { type: 'button', 'data-cursor': '', 'aria-label': label })
        b.addEventListener('click', e => { e.stopPropagation(); this.onSpot(sp) })
        sp.btn = b
        box.appendChild(b)
      }
      this.placeButtons()
    },

    /* --- 房间布局（米为单位，房间内局部坐标 u 向东、v 向北） --- */
    layoutRoom(c, r) {
      const R = c.plan || { x0: 0, x1: 8, y0: 0, y1: 8, doors: [], floor: c.roomInfo.floor, name: c.roomInfo.name }
      this.R = R
      const w = R.x1 - R.x0, h = R.y1 - R.y0
      this.w = w; this.h = h
      // 门
      const doors = []
      const rooms = (window.WORLD && window.WORLD.rooms) || []
      ;(R.doors || []).forEach((d, i) => {
        let wall = null, at = null
        if (d.axis === 'y' && d.at != null) { wall = d.dir === '东' ? 'E' : 'W'; at = d.at - R.y0 }
        else if (d.axis === 'x' && d.at != null) { wall = d.dir === '北' ? 'N' : 'S'; at = d.at - R.x0 }
        else {
          const o = rooms.find(x => x.floor === R.floor && x.name === d.to)
          if (o) {
            const ov = (a0, a1, b0, b1) => [Math.max(a0, b0), Math.min(a1, b1)]
            let a, b
            if (Math.abs(o.x0 - R.x1) < 0.7) { [a, b] = ov(R.y0, R.y1, o.y0, o.y1); if (b > a) { wall = 'E'; at = (a + b) / 2 - R.y0 } }
            if (!wall && Math.abs(o.x1 - R.x0) < 0.7) { [a, b] = ov(R.y0, R.y1, o.y0, o.y1); if (b > a) { wall = 'W'; at = (a + b) / 2 - R.y0 } }
            if (!wall && Math.abs(o.y0 - R.y1) < 0.7) { [a, b] = ov(R.x0, R.x1, o.x0, o.x1); if (b > a) { wall = 'N'; at = (a + b) / 2 - R.x0 } }
            if (!wall && Math.abs(o.y1 - R.y0) < 0.7) { [a, b] = ov(R.x0, R.x1, o.x0, o.x1); if (b > a) { wall = 'S'; at = (a + b) / 2 - R.x0 } }
          }
          if (!wall) { wall = ['N', 'S', 'E', 'W'][i % 4]; at = (wall === 'N' || wall === 'S' ? w : h) * (0.3 + 0.4 * r()) }
        }
        const width = Math.min(d.width || (d.open ? 1.8 : 1), (wall === 'N' || wall === 'S' ? w : h) * 0.6)
        const len = wall === 'N' || wall === 'S' ? w : h
        at = U.clamp(at, width / 2 + 0.15, len - width / 2 - 0.15)
        if (doors.some(x => x.wall === wall && Math.abs(x.at - at) < width)) return
        doors.push({ wall, at, width, to: d.to, open: !!d.open })
      })
      if (!doors.length) doors.push({ wall: 'S', at: w / 2, width: 1, to: '', open: false })
      this.doors = doors
      // 门内侧的点
      const doorIn = d => {
        if (d.wall === 'N') return { u: d.at, v: h - 0.7 }
        if (d.wall === 'S') return { u: d.at, v: 0.7 }
        if (d.wall === 'E') return { u: w - 0.7, v: d.at }
        return { u: 0.7, v: d.at }
      }
      this.doorIn = doorIn
      // 陈设
      const placed = []
      const kindOf = name => {
        if (/泳池/.test(name)) return { k: 'pool', a: w * 0.62, b: h * 0.58, center: true }
        if (/浴池/.test(name)) return { k: 'bath', a: Math.min(1.8, w * 0.4), b: Math.min(2.6, h * 0.35) }
        if (/球道/.test(name)) return { k: 'lanes', a: w * 0.78, b: Math.min(3, h * 0.4), center: true }
        if (/毯/.test(name)) return { k: 'rug', a: Math.min(3.2, w * 0.5), b: Math.min(2.4, h * 0.42), rug: true }
        if (/床/.test(name)) return { k: 'bed', a: 2.1, b: 2.3, post: /四柱/.test(name) }
        if (/浴缸/.test(name)) return { k: 'tub', a: 1.8, b: 0.9, wall: true }
        if (/钢琴/.test(name)) return { k: 'piano', a: 1.6, b: 1.5 }
        if (/球台|台球桌/.test(name)) return { k: 'table', a: 2.7, b: 1.5 }
        if (/圆桌|圆盘|圆雕/.test(name)) return { k: 'round', a: 1.4, b: 1.4 }
        if (/长桌|长椅|长板|长镜/.test(name)) return { k: /镜/.test(name) ? 'mirror' : 'table', a: Math.min(3.4, w * 0.5), b: /镜/.test(name) ? 0.1 : 1, wall: /镜|椅/.test(name) }
        if (/镜/.test(name)) return { k: 'mirror', a: 1.4, b: 0.1, wall: true }
        if (/窗|天窗/.test(name)) return { k: 'window', a: 1.6, b: 0.12, wall: true }
        if (/钟/.test(name)) return { k: 'clock', a: 0.6, b: 0.6, wall: true }
        if (/灯/.test(name)) return { k: 'lamp', a: 0.5, b: 0.5 }
        if (/柜|架|格|货架|书柜/.test(name)) return { k: 'cabinet', a: Math.min(2.4, Math.max(w, h) * 0.3), b: 0.55, wall: true }
        if (/桌|台|几|案|岛|车/.test(name)) return { k: 'table', a: 1.5, b: 0.85 }
        if (/沙发|榻/.test(name)) return { k: 'sofa', a: 2, b: 0.8 }
        if (/椅|凳|垫/.test(name)) return { k: 'seat', a: 0.6, b: 0.6 }
        if (/机|泵|罐|箱|器/.test(name)) return { k: 'machine', a: 0.9, b: 0.9, wall: true }
        if (/像|雕|标本|骨架|霸王龙|化石|山子|礼器|仪|皇冠|玉琮|兽/.test(name)) return { k: 'exhibit', a: /霸王龙|骨架/.test(name) ? Math.min(4, w * 0.4) : 1.1, b: /霸王龙|骨架/.test(name) ? Math.min(1.8, h * 0.3) : 1.1 }
        if (/门铃|插销|号码牌|方位牌|门$/.test(name)) return { k: 'fixture', a: 0.3, b: 0.3, door: true }
        return { k: 'thing', a: 0.7, b: 0.6 }
      }
      const objs = (c.roomInfo.objects || []).map(name => Object.assign({ name }, kindOf(name)))
      const prio = o => (o.center ? 0 : o.rug ? 1 : o.k === 'bed' || o.k === 'bath' ? 2 : o.wall ? 3 : 4)
      objs.sort((a, b) => prio(a) - prio(b))
      const inDoor = (cx, cy, rad) => doors.some(d => { const p = doorIn(d); return Math.hypot(p.u - cx, p.v - cy) < d.width / 2 + 0.9 + rad })
      const overlaps = (o, rug) => placed.some(p => {
        if (rug !== !!p.rug) return false
        return Math.abs(p.u - o.u) < (p.a + o.a) / 2 + 0.3 && Math.abs(p.v - o.v) < (p.b + o.b) / 2 + 0.3
      })
      for (const o of objs) {
        let ok = false
        for (let tries = 0; tries < 80 && !ok; tries++) {
          const sh = tries > 50 ? 0.7 : 1
          let a = Math.min(o.a * sh, w - 0.6), b = Math.min(o.b * sh, h - 0.6)
          let u, v, rot = false
          if (o.center) { u = w / 2; v = h / 2 }
          else if (o.door) { const d = doors[tries % doors.length]; const p = doorIn(d); u = p.u + (r() - 0.5) * 0.6; v = p.v + (r() - 0.5) * 0.6; a = b = 0.3 }
          else if (o.wall) {
            const wall = ['N', 'S', 'E', 'W'][Math.floor(r() * 4)]
            if (wall === 'E' || wall === 'W') { const t = a; a = b; b = t; rot = true }
            if (wall === 'N') { u = a / 2 + 0.1 + r() * (w - a - 0.2); v = h - b / 2 - 0.08 }
            else if (wall === 'S') { u = a / 2 + 0.1 + r() * (w - a - 0.2); v = b / 2 + 0.08 }
            else if (wall === 'E') { u = w - a / 2 - 0.08; v = b / 2 + 0.1 + r() * (h - b - 0.2) }
            else { u = a / 2 + 0.08; v = b / 2 + 0.1 + r() * (h - b - 0.2) }
          } else {
            u = a / 2 + 0.4 + r() * Math.max(0, w - a - 0.8)
            v = b / 2 + 0.4 + r() * Math.max(0, h - b - 0.8)
            if (r() < 0.4 && a !== b && w > 3 && h > 3) { const t = a; a = b; b = t; rot = true }
          }
          const cand = Object.assign({}, o, { u, v, a, b, rot })
          if (a <= 0 || b <= 0) continue
          if (!o.center && !o.door && !o.rug && inDoor(u, v, Math.max(a, b) / 2 * 0.6)) continue
          if (!o.center && !o.door && overlaps(cand, !!o.rug)) continue
          placed.push(cand)
          ok = true
        }
        if (!ok) placed.push(Object.assign({}, o, { u: w * (0.2 + 0.6 * r()), v: h * (0.2 + 0.6 * r()), a: 0.4, b: 0.4, ghost: true }))
      }
      this.objs = placed
      // 尸体
      const solid = placed.filter(p => !p.rug && !p.ghost && p.k !== 'pool' && p.k !== 'lanes')
      const free = (u, v, rad) => u > rad && v > rad && u < w - rad && v < h - rad &&
        !solid.some(p => Math.abs(p.u - u) < p.a / 2 + rad && Math.abs(p.v - v) < p.b / 2 + rad)
      let body = null
      const cause = c.cause.id
      const pool = placed.find(p => p.k === 'pool' || p.k === 'bath')
      for (let tries = 0; tries < 200 && !body; tries++) {
        let u, v
        if (cause === 'door' && tries < 120) { const d = doors[tries % doors.length]; const p = doorIn(d); u = p.u + (r() - 0.5) * 0.8; v = p.v + (r() - 0.5) * 0.8 }
        else if (cause === 'drown' && pool && tries < 120) {
          const side = Math.floor(r() * 4)
          u = side < 2 ? pool.u + (r() - 0.5) * pool.a : pool.u + (side === 2 ? 1 : -1) * (pool.a / 2 + 0.7)
          v = side >= 2 ? pool.v + (r() - 0.5) * pool.b : pool.v + (side === 0 ? 1 : -1) * (pool.b / 2 + 0.7)
        } else { u = 0.9 + r() * (w - 1.8); v = 0.9 + r() * (h - 1.8) }
        if (free(u, v, tries < 150 ? 0.55 : 0.3) || tries > 190) body = { u: U.clamp(u, 0.6, w - 0.6), v: U.clamp(v, 0.6, h - 0.6), rot: r() * Math.PI * 2 }
      }
      if (Math.min(w, h) < 2.2) body.rot = (w > h ? 0 : Math.PI / 2) + (r() - 0.5) * 0.4
      this.body = body
      // 热点
      const spots = []
      const taken = []
      const far = (u, v, d = 0.9) => taken.every(t => Math.hypot(t.u - u, t.v - v) > d)
      const put = (sp, u, v) => { sp.u = U.clamp(u, 0.35, w - 0.35); sp.v = U.clamp(v, 0.35, h - 0.35); taken.push({ u: sp.u, v: sp.v }); spots.push(sp) }
      const bodySpot = c.spots.find(s => s.kind === 'body')
      put(Object.assign(bodySpot, { place: 'body' }), body.u, body.v)
      const awayDoors = doors.slice().sort(() => r() - 0.5)
      let ai = 0
      for (const s of c.spots.filter(x => x.kind === 'clue')) {
        const k = s.clue
        s.place = k.place
        if (k.place === 'away') {
          const d = doors.find(x => x.to && k.awayTo && x.to.includes(k.awayTo)) || awayDoors[ai++ % awayDoors.length]
          s.door = d
          const p = doorIn(d)
          let u = p.u, v = p.v
          for (let t = 0; t < 10 && !far(u, v, 0.5); t++) { u += (r() - 0.5) * 0.6; v += (r() - 0.5) * 0.6 }
          put(s, u, v)
        } else if (k.place === 'body') {
          let u, v, n = 0
          do { const a = body.rot + (n * 2.1) + r(); u = body.u + Math.cos(a) * (0.9 + n * 0.08); v = body.v + Math.sin(a) * (0.9 + n * 0.08) } while (!far(u, v, 0.75) && n++ < 30)
          put(s, u, v)
        } else {
          let u, v, n = 0
          do {
            const p = solid.length && r() < 0.7 ? solid[Math.floor(r() * solid.length)] : null
            if (p) { u = p.u + (r() - 0.5) * (p.a + 0.9); v = p.v + (r() - 0.5) * (p.b + 0.9) } else { u = 0.6 + r() * (w - 1.2); v = 0.6 + r() * (h - 1.2) }
          } while (!far(u, v) && n++ < 40)
          put(s, u, v)
        }
      }
      for (const s of c.spots.filter(x => x.kind === 'decoy')) {
        const p = placed.find(o => o.name === s.object)
        let u = p ? p.u : w * r(), v = p ? p.v : h * r(), n = 0
        while (!far(u, v, 0.8) && n++ < 30) { u += (r() - 0.5) * 0.8; v += (r() - 0.5) * 0.8 }
        s.place = 'room'
        put(s, u, v)
      }
      this.spots = spots
    },

    // 平面图在屏幕上的位置：可旋转 90° 以获得更大的比例
    computeGeo() {
      const W = this.W, H = this.H
      const mobile = W < 760
      // 圆环计时器：桌面端平面图收在圆环之内
      const D = mobile ? Math.min(W * 0.98, (H - 90) * 0.98) : Math.min(W * 0.74, (H - 90) * 0.98)
      const top = mobile ? 56 + (H - 56 - 190 - D) / 2 + 40 : 64 + (H - 64 - D) / 2
      this.ring = { D, x: (W - D) / 2, y: top, cx: W / 2, cy: top + D / 2 }
      if (!mobile) {
        const rot = this.h > this.w * 1.05
        const s = Math.min((D * 0.84) / Math.hypot(this.w, this.h), 84)
        const pw = (rot ? this.h : this.w) * s, ph = (rot ? this.w : this.h) * s
        this.geo = { s, rot, ox: this.ring.cx - pw / 2, oy: this.ring.cy - ph / 2, pw, ph, mobile }
        return
      }
      const box = mobile
        ? { x: 14, y: 166, w: W - 28, h: H - 166 - 196 }
        : { x: Math.max(250, W * 0.2), y: 128, w: W - 2 * Math.max(250, W * 0.2), h: H - 128 - 150 }
      const w = this.w, h = this.h
      const sA = Math.min(box.w / w, box.h / h), sB = Math.min(box.w / h, box.h / w)
      const rot = sB > sA * 1.18
      const s = Math.min(rot ? sB : sA, mobile ? 52 : 80)
      const pw = (rot ? h : w) * s, ph = (rot ? w : h) * s
      const ox = box.x + (box.w - pw) / 2, oy = box.y + (box.h - ph) / 2
      this.geo = { s, rot, ox, oy, pw, ph, mobile }
    },
    P(u, v, geo) {
      const g = geo || this.geo
      return g.rot ? [g.ox + v * g.s, g.oy + u * g.s] : [g.ox + u * g.s, g.oy + (this.h - v) * g.s]
    },
    setLocal(ctx, geo, dpr) {
      const g = geo || this.geo, d = dpr || this.dpr
      if (g.rot) ctx.setTransform(0, d * g.s, d * g.s, 0, d * g.ox, d * g.oy)
      else ctx.setTransform(d * g.s, 0, 0, -d * g.s, d * g.ox, d * (g.oy + this.h * g.s))
    },
    // 把平面图放进一个框里（结案对账用）：{x, y, w, h} → geo
    fitGeo(box) {
      const w = this.w, h = this.h
      const sA = Math.min(box.w / w, box.h / h), sB = Math.min(box.w / h, box.h / w)
      const rot = sB > sA * 1.18
      const s = Math.min(rot ? sB : sA, 70)
      const pw = (rot ? h : w) * s, ph = (rot ? w : h) * s
      return { s, rot, ox: box.x + (box.w - pw) / 2, oy: box.y + (box.h - ph) / 2, pw, ph, mobile: box.w < 420 }
    },

    resize() {
      if (!this.cv || !S.stage) return
      const W = S.stage.clientWidth, H = S.stage.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      this.W = W; this.H = H; this.dpr = dpr
      for (const c of [this.cv, this.plan, this.trace]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr) }
      this.cv.style.width = W + 'px'
      this.cv.style.height = H + 'px'
      this.computeGeo()
      this.light.r = Math.max(this.geo.mobile ? 92 : 84, Math.min(W, H) * 0.12)
      // 小画布盖住压低后拉长的侧光（长半轴约 2R）
      this.lh = Math.ceil(this.light.r * 2.05) + 6
      this.lv.width = this.lv.height = Math.round(this.lh * 2 * dpr)
      this.lv.style.width = this.lv.style.height = this.lh * 2 + 'px'
      this.lvx = this.lvy = null
      S.E.inv.classList.toggle('is-narrow', !!this.geo.mobile)
      this.drawPlan()
      this.placeButtons()
      this.layoutTimer()
    },
    placeButtons() {
      if (!this.geo) return
      for (const sp of this.spots) {
        if (!sp.btn) continue
        const [x, y] = this.P(sp.u, sp.v)
        sp.btn.style.left = x + 'px'
        sp.btn.style.top = y + 'px'
        sp.btn.classList.toggle('is-done', !!sp.done)
        sp.btn.classList.toggle('is-hidden', !sp.revealed && !sp.done)
      }
    },
    layoutTimer() {
      const t = S.E.inv.querySelector('.trial-inv-timer')
      const R = this.ring
      Object.assign(t.style, { width: R.D + 'px', height: R.D + 'px', left: R.x + 'px', top: R.y + 'px' })
    },

    /* --- 画平面（亮着的房间；只在变化时画一次，底图与侧光都从这里取） --- */
    drawPlan() {
      this.planVer = (this.planVer || 0) + 1 // 底图在下一帧随之重画
      const ctx = this.pctx
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.plan.width, this.plan.height)
      this.paintPlan(ctx, this.geo, this.dpr, { bodyGone: this.bodyGone, labels: true, scale: true })
      this.drawTraces()
    },
    // 平面图本身：地面、陈设、墙与门、尸体粉笔线、离开现场的脚印、文字。geo/d 可换（结案对账在别的画布上重画）
    paintPlan(ctx, g, d, opts = {}) {
      const w = this.w, h = this.h
      const px = n => n / g.s // 像素 → 米
      const bone = a => `rgba(226,232,238,${a})`
      const brass = a => `rgba(194,154,91,${a})`
      this.setLocal(ctx, g, d)
      // 地面：灯亮着，冷灰的石面或木面
      const surf = this.c.roomInfo.floorSurface || ''
      const wood = /木|柚|枫|橡|黄花梨|楠/.test(surf.split('·')[0])
      const gr = ctx.createLinearGradient(0, 0, w, h)
      gr.addColorStop(0, wood ? '#272320' : '#20252b')
      gr.addColorStop(1, wood ? '#1b1816' : '#171b20')
      ctx.fillStyle = gr
      ctx.fillRect(0, 0, w, h)
      ctx.lineWidth = px(1)
      ctx.strokeStyle = bone(0.07)
      ctx.beginPath()
      if (wood) {
        const along = w >= h
        const step = 0.2
        for (let t = step; t < (along ? h : w); t += step) {
          if (along) { ctx.moveTo(0, t); ctx.lineTo(w, t) } else { ctx.moveTo(t, 0); ctx.lineTo(t, h) }
        }
        ctx.stroke()
        ctx.beginPath()
        let seed = 1
        const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
        for (let t = 0; t < (along ? h : w); t += step) {
          for (let s = rr() * 1.6; s < (along ? w : h); s += 1.2 + rr() * 1.4) {
            if (along) { ctx.moveTo(s, t); ctx.lineTo(s, t + step) } else { ctx.moveTo(t, s); ctx.lineTo(t + step, s) }
          }
        }
        ctx.stroke()
      } else if (/玉|石|翡翠|岩|晶/.test(surf)) {
        const step = Math.max(0.8, Math.min(w, h) / 10)
        for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
        for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
        ctx.stroke()
      } else {
        for (let t = -h; t < w; t += 0.5) { ctx.moveTo(t, 0); ctx.lineTo(t + h, h) }
        ctx.strokeStyle = bone(0.04)
        ctx.stroke()
      }
      // 陈设
      for (const o of this.objs) {
        if (o.ghost) continue
        const x0 = o.u - o.a / 2, y0 = o.v - o.b / 2
        ctx.lineWidth = px(1.4)
        ctx.strokeStyle = bone(0.62)
        ctx.fillStyle = 'rgba(12,14,17,.62)'
        switch (o.k) {
          case 'rug':
            ctx.fillStyle = 'rgba(125,22,22,.24)'
            ctx.fillRect(x0, y0, o.a, o.b)
            ctx.strokeStyle = brass(0.45)
            ctx.strokeRect(x0 + 0.12, y0 + 0.12, o.a - 0.24, o.b - 0.24)
            ctx.beginPath()
            for (let t = x0; t < x0 + o.a; t += 0.12) { ctx.moveTo(t, y0); ctx.lineTo(t, y0 - 0.1); ctx.moveTo(t, y0 + o.b); ctx.lineTo(t, y0 + o.b + 0.1) }
            ctx.stroke()
            break
          case 'pool': case 'bath': {
            ctx.fillStyle = 'rgba(52,104,112,.36)'
            ctx.fillRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0 + 0.25, y0 + 0.25, o.a - 0.5, o.b - 0.5)
            ctx.beginPath()
            ctx.strokeStyle = 'rgba(170,226,232,.22)'
            for (let y = y0 + 0.6; y < y0 + o.b - 0.3; y += 0.55) {
              for (let x = x0 + 0.4; x < x0 + o.a - 0.6; x += 0.9) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 0.22, y + 0.12, x + 0.45, y) }
            }
            ctx.stroke()
            break
          }
          case 'lanes':
            for (let i = 0; i < 2; i++) {
              const yy = o.v - o.b / 2 + i * (o.b / 2) + 0.1
              ctx.fillStyle = 'rgba(194,154,91,.12)'
              ctx.fillRect(x0, yy, o.a, o.b / 2 - 0.2)
              ctx.strokeRect(x0, yy, o.a, o.b / 2 - 0.2)
              ctx.beginPath()
              for (let k = 0; k < 4; k++) { const bx = x0 + o.a - 0.4 - k * 0.3; ctx.moveTo(bx, yy + 0.2); ctx.lineTo(bx, yy + o.b / 2 - 0.4) }
              ctx.stroke()
            }
            break
          case 'bed':
            ctx.fillRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0 + 0.15, y0 + o.b - 0.65, o.a / 2 - 0.25, 0.45)
            ctx.strokeRect(x0 + o.a / 2 + 0.1, y0 + o.b - 0.65, o.a / 2 - 0.25, 0.45)
            ctx.beginPath(); ctx.moveTo(x0, y0 + o.b * 0.55); ctx.lineTo(x0 + o.a, y0 + o.b * 0.5); ctx.stroke()
            if (o.post) { ctx.fillStyle = brass(0.6); for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) ctx.fillRect(x0 + a * o.a - 0.08, y0 + b * o.b - 0.08, 0.16, 0.16) }
            break
          case 'round': case 'lamp': case 'clock':
            ctx.beginPath(); ctx.ellipse(o.u, o.v, o.a / 2, o.b / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
            if (o.k === 'lamp') { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(o.u + Math.cos(a) * o.a * 0.6, o.v + Math.sin(a) * o.a * 0.6); ctx.lineTo(o.u + Math.cos(a) * o.a * 0.9, o.v + Math.sin(a) * o.a * 0.9) } ctx.strokeStyle = brass(0.6); ctx.stroke() }
            if (o.k === 'clock') { ctx.beginPath(); ctx.moveTo(o.u, o.v); ctx.lineTo(o.u, o.v + o.b * 0.35); ctx.moveTo(o.u, o.v); ctx.lineTo(o.u + o.a * 0.25, o.v); ctx.stroke() }
            break
          case 'mirror': case 'window':
            ctx.strokeStyle = o.k === 'mirror' ? 'rgba(200,220,236,.75)' : brass(0.6)
            ctx.lineWidth = px(2.2)
            ctx.strokeRect(x0, y0, o.a, o.b)
            break
          case 'exhibit':
            ctx.fillRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0, y0, o.a, o.b)
            ctx.beginPath(); ctx.ellipse(o.u, o.v, o.a * 0.32, o.b * 0.32, 0.4, 0, Math.PI * 2); ctx.strokeStyle = brass(0.6); ctx.stroke()
            break
          case 'piano':
            ctx.beginPath()
            ctx.moveTo(x0, y0); ctx.lineTo(x0 + o.a, y0); ctx.lineTo(x0 + o.a, y0 + o.b * 0.4)
            ctx.quadraticCurveTo(x0 + o.a * 0.55, y0 + o.b * 0.45, x0 + o.a * 0.4, y0 + o.b); ctx.lineTo(x0, y0 + o.b); ctx.closePath()
            ctx.fill(); ctx.stroke()
            break
          case 'cabinet': case 'machine':
            ctx.fillRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0, y0, o.a, o.b)
            ctx.beginPath()
            if (o.k === 'cabinet') { const n = Math.max(2, Math.round(Math.max(o.a, o.b) / 0.6)); for (let i = 1; i < n; i++) { if (o.a > o.b) { ctx.moveTo(x0 + i * o.a / n, y0); ctx.lineTo(x0 + i * o.a / n, y0 + o.b) } else { ctx.moveTo(x0, y0 + i * o.b / n); ctx.lineTo(x0 + o.a, y0 + i * o.b / n) } } }
            else ctx.ellipse(o.u, o.v, Math.min(o.a, o.b) * 0.32, Math.min(o.a, o.b) * 0.32, 0, 0, Math.PI * 2)
            ctx.stroke()
            break
          case 'tub':
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, o.a, o.b, 0.35) : ctx.rect(x0, y0, o.a, o.b); ctx.fill(); ctx.stroke()
            break
          case 'fixture':
            ctx.fillStyle = brass(0.7); ctx.fillRect(o.u - 0.08, o.v - 0.08, 0.16, 0.16)
            break
          default:
            ctx.fillRect(x0, y0, o.a, o.b)
            ctx.strokeRect(x0, y0, o.a, o.b)
            if (o.k === 'sofa') { ctx.beginPath(); ctx.moveTo(x0, y0 + o.b * 0.3); ctx.lineTo(x0 + o.a, y0 + o.b * 0.3); ctx.stroke() }
        }
      }
      // 墙（留出门洞）
      const T = 0.22
      ctx.strokeStyle = 'rgba(214,218,224,.92)'
      ctx.lineWidth = Math.max(T, px(4))
      ctx.lineCap = 'butt'
      const walls = { S: [[0, 0], [w, 0]], N: [[0, h], [w, h]], W: [[0, 0], [0, h]], E: [[w, 0], [w, h]] }
      for (const k of ['S', 'N', 'W', 'E']) {
        const [[ax, ay]] = walls[k]
        const len = k === 'S' || k === 'N' ? w : h
        const gaps = this.doors.filter(dd => dd.wall === k).map(dd => [dd.at - dd.width / 2, dd.at + dd.width / 2]).sort((p, q) => p[0] - q[0])
        let t = -T / 2
        ctx.beginPath()
        for (const [g0, g1] of gaps.concat([[len + T / 2, len + T / 2]])) {
          const pa = k === 'S' || k === 'N' ? [ax + t, ay] : [ax, ay + t]
          const pb = k === 'S' || k === 'N' ? [ax + g0, ay] : [ax, ay + g0]
          ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1])
          t = g1
        }
        ctx.stroke()
      }
      // 门扇与开启弧线
      ctx.lineWidth = px(1.4)
      for (const dd of this.doors) {
        const half = dd.width / 2
        let hx, hy, lx, ly
        if (dd.wall === 'S') { hx = dd.at - half; hy = 0; lx = hx; ly = dd.width }
        else if (dd.wall === 'N') { hx = dd.at - half; hy = h; lx = hx; ly = h - dd.width }
        else if (dd.wall === 'W') { hx = 0; hy = dd.at - half; lx = dd.width; ly = hy }
        else { hx = w; hy = dd.at - half; lx = w - dd.width; ly = hy }
        ctx.strokeStyle = brass(dd.open ? 0.35 : 0.8)
        if (!dd.open) {
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly); ctx.stroke()
          ctx.setLineDash([px(3), px(3)])
          ctx.beginPath()
          const r = dd.width
          const ang = dd.wall === 'S' ? [0, Math.PI / 2] : dd.wall === 'N' ? [-Math.PI / 2, 0] : dd.wall === 'W' ? [-Math.PI / 2, 0] : [Math.PI / 2, Math.PI]
          ctx.arc(hx, hy, r, ang[0], ang[1])
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      // 尸体：粉笔轮廓
      if (!opts.bodyGone) this.drawBody(ctx, px)
      // 离开现场的痕迹：脚印通向门
      for (const sp of this.spots) {
        if (sp.place !== 'away' || !sp.door) continue
        const p = this.doorIn(sp.door)
        const from = { u: this.body.u, v: this.body.v }
        const n = Math.max(3, Math.floor(Math.hypot(p.u - from.u, p.v - from.v) / 0.45))
        ctx.fillStyle = 'rgba(226,232,238,.3)'
        for (let i = 1; i < n; i++) {
          const t = i / n
          const u = from.u + (p.u - from.u) * t, v = from.v + (p.v - from.v) * t
          const ang = Math.atan2(p.v - from.v, p.u - from.u)
          const side = i % 2 ? 0.09 : -0.09
          ctx.save()
          ctx.translate(u + Math.cos(ang + Math.PI / 2) * side, v + Math.sin(ang + Math.PI / 2) * side)
          ctx.rotate(ang)
          ctx.beginPath(); ctx.ellipse(0, 0, 0.12, 0.05, 0, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
        }
      }
      // 暗角：四周压暗一点，冷色
      ctx.setTransform(d, 0, 0, d, 0, 0)
      const cx = g.ox + g.pw / 2, cy = g.oy + g.ph / 2, rad = Math.hypot(g.pw, g.ph) * 0.62
      const vg = ctx.createRadialGradient(cx, cy, rad * 0.35, cx, cy, rad)
      vg.addColorStop(0, 'rgba(8,10,14,0)')
      vg.addColorStop(1, 'rgba(8,10,14,.42)')
      ctx.fillStyle = vg
      ctx.fillRect(g.ox - 2, g.oy - 2, g.pw + 4, g.ph + 4)
      if (!opts.labels) return
      // 文字（屏幕坐标，不随变换镜像）
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = (g.mobile ? '10px' : '11px') + ' "Mono", "Sans SC", monospace'
      for (const o of this.objs) {
        if (o.ghost || o.k === 'fixture') continue
        const [x, y] = this.P(o.u, o.v, g)
        ctx.fillStyle = 'rgba(10,12,15,.55)'
        const tw = ctx.measureText(o.name).width
        const yy = y + (o.k === 'rug' ? Math.min(o.b, 1) * g.s * 0.3 : 0)
        ctx.fillRect(x - tw / 2 - 3, yy - 7, tw + 6, 14)
        ctx.fillStyle = bone(0.7)
        ctx.fillText(o.name, x, yy)
      }
      ctx.font = '11px "Sans SC", sans-serif'
      for (const dd of this.doors) {
        if (!dd.to) continue
        const p = this.doorIn(dd)
        const out = { u: p.u, v: p.v }
        if (dd.wall === 'N') out.v = h + 0.55
        else if (dd.wall === 'S') out.v = -0.55
        else if (dd.wall === 'E') out.u = w + 0.55
        else out.u = -0.55
        const [x, y] = this.P(out.u, out.v, g)
        ctx.fillStyle = brass(0.8)
        ctx.fillText(dd.to, x, y)
      }
      if (!opts.scale) return
      // 比例尺与罗盘
      const [bx, by] = [g.ox, g.oy + g.ph + 22]
      const m = this.w > 12 || this.h > 12 ? 5 : 2
      ctx.strokeStyle = bone(0.5)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + m * g.s, by); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4); ctx.moveTo(bx + m * g.s, by - 4); ctx.lineTo(bx + m * g.s, by + 4); ctx.stroke()
      ctx.fillStyle = bone(0.55)
      ctx.textAlign = 'left'
      ctx.font = '10px "Mono", monospace'
      ctx.fillText(m + ' m', bx + m * g.s + 8, by)
      const nx = g.ox + g.pw + 26, ny = g.oy + 4
      ctx.save()
      ctx.translate(nx, ny + 16)
      if (g.rot) ctx.rotate(Math.PI / 2)
      ctx.strokeStyle = brass(0.8)
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(5, 6); ctx.lineTo(0, 2); ctx.lineTo(-5, 6); ctx.closePath(); ctx.stroke()
      ctx.restore()
      ctx.fillStyle = brass(0.85)
      ctx.textAlign = 'center'
      ctx.font = '11px "Cinzel", serif'
      ctx.fillText('N', g.rot ? nx + 26 : nx, g.rot ? ny + 16 : ny - 8)
    },
    // 只在侧光下显出的痕迹（整屏离屏画布，设备像素）：本案要侧光才看得见的线索各画一处，另有几道无关的旧擦痕
    drawTraces() {
      const ctx = this.tctx, g = this.geo, d = this.dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, this.trace.width, this.trace.height)
      this.setLocal(ctx, g, d)
      const px = n => n / g.s
      const ink = a => `rgba(214,236,255,${a})`
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      // 无关的擦痕（让侧光扫过时总有东西浮起来）
      ctx.strokeStyle = ink(0.32)
      ctx.lineWidth = px(1)
      for (const s of this.scuffs || []) {
        ctx.beginPath(); ctx.moveTo(s.u, s.v); ctx.lineTo(s.u + Math.cos(s.a) * s.l, s.v + Math.sin(s.a) * s.l); ctx.stroke()
      }
      for (const sp of this.spots) {
        if (!sp.raking || !sp.clue) continue
        const k = sp.clue
        ctx.save()
        ctx.translate(sp.u, sp.v)
        ctx.rotate(((sp.u * 7 + sp.v * 13) % 6.28))
        ctx.fillStyle = ink(0.75)
        ctx.strokeStyle = ink(0.85)
        ctx.lineWidth = px(1.3)
        if (k.tpl === 'handprint' || k.tpl === 'gloves') {
          // 一枚手印：掌心与五指（手套污印更糊）
          const sc = k.tpl === 'gloves' ? 1.1 : 1
          ctx.globalAlpha = k.tpl === 'gloves' ? 0.6 : 1
          ctx.beginPath(); ctx.ellipse(0, 0, 0.055 * sc, 0.07 * sc, 0, 0, Math.PI * 2); ctx.fill()
          for (const [x, y, r] of [[-0.06, 0.1, 0.016], [-0.025, 0.125, 0.017], [0.012, 0.128, 0.017], [0.048, 0.112, 0.015], [0.075, 0.02, 0.016]]) { ctx.beginPath(); ctx.ellipse(x * sc, y * sc, r * sc, r * 2.1 * sc, 0, 0, Math.PI * 2); ctx.fill() }
        } else if (k.tpl === 'woodprint') {
          // 湿鞋的淡渍：两三枚交错的鞋印
          ctx.globalAlpha = 0.65
          for (const [x, y] of [[-0.18, -0.25], [0.12, 0.1], [-0.1, 0.45]]) { ctx.beginPath(); ctx.ellipse(x, y, 0.06, 0.13, 0.15, 0, Math.PI * 2); ctx.fill() }
        } else if (k.tpl === 'defense') {
          // 一片新刮痕
          for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-0.4 + i * 0.05, -0.2 + i * 0.03); ctx.lineTo(0.3 + i * 0.06, 0.05 + i * 0.05); ctx.stroke() }
        } else if (k.tpl === 'scrub') {
          // 擦洗的边界与缝里的残迹
          ctx.setLineDash([px(4), px(3)])
          ctx.beginPath(); ctx.ellipse(0, 0, 0.55, 0.35, 0, 0, Math.PI * 2); ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = k.vi === 1 ? 'rgba(255,90,140,.8)' : ink(0.5)
          for (let i = -4; i <= 4; i++) ctx.fillRect(i * 0.11, -0.01, 0.05, 0.02)
        } else if (k.tpl === 'furniture') {
          // 家具压痕与色差：一道对不齐的边
          ctx.strokeRect(-0.3, -0.2, 0.6, 0.4)
          ctx.globalAlpha = 0.55
          ctx.strokeRect(-0.26, -0.15, 0.6, 0.4)
        }
        ctx.restore()
      }
    },
    drawBody(ctx, px) {
      const b = this.body
      if (!b) return
      ctx.save()
      ctx.translate(b.u, b.v)
      ctx.rotate(b.rot)
      const cause = this.c.cause.id
      // 痕迹（不血腥：只有几处暗色点与水渍）
      if (cause === 'stab' || cause === 'blunt' || cause === 'fall') {
        ctx.fillStyle = 'rgba(125,22,22,.62)'
        const pts = [[0.35, 0.25, 0.2], [0.6, -0.2, 0.12], [-0.2, 0.3, 0.09], [0.9, 0.35, 0.07]]
        for (const [x, y, r] of pts) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0.4, 0, Math.PI * 2); ctx.fill() }
      } else if (cause === 'drown') {
        ctx.strokeStyle = 'rgba(170,226,232,.36)'; ctx.lineWidth = px(1)
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 0.6 + i * 0.25, 0.35 + i * 0.18, 0, 0, Math.PI * 2); ctx.stroke() }
      } else if (cause === 'alcohol') {
        ctx.fillStyle = 'rgba(194,154,91,.3)'
        for (const [x, y] of [[0.95, 0.4], [1.05, 0.5], [0.9, 0.55]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.08, y + 0.05); ctx.lineTo(x + 0.02, y + 0.1); ctx.fill() }
      } else if (cause === 'poison') {
        // 身旁一只喝空的杯子
        ctx.strokeStyle = 'rgba(214,236,255,.7)'; ctx.lineWidth = px(1.2)
        ctx.beginPath(); ctx.ellipse(1.05, -0.25, 0.07, 0.07, 0, 0, Math.PI * 2); ctx.stroke()
      }
      // 粉笔线
      ctx.strokeStyle = 'rgba(244,242,236,.95)'
      ctx.lineWidth = px(2.2)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.setLineDash([px(7), px(2.5)])
      ctx.beginPath()
      ctx.arc(0.78, 0, 0.13, 0, Math.PI * 2)
      ctx.moveTo(0.62, 0.09)
      ctx.lineTo(0.55, 0.22); ctx.lineTo(0.3, 0.55); ctx.lineTo(0.22, 0.5); ctx.lineTo(0.38, 0.2)
      ctx.lineTo(0.1, 0.17); ctx.lineTo(-0.15, 0.16); ctx.lineTo(-0.55, 0.32); ctx.lineTo(-0.85, 0.25); ctx.lineTo(-0.86, 0.15)
      ctx.lineTo(-0.55, 0.15); ctx.lineTo(-0.2, 0.04); ctx.lineTo(-0.2, -0.04); ctx.lineTo(-0.6, -0.12); ctx.lineTo(-0.9, -0.06)
      ctx.lineTo(-0.9, -0.17); ctx.lineTo(-0.55, -0.24); ctx.lineTo(-0.15, -0.17); ctx.lineTo(0.12, -0.18); ctx.lineTo(0.42, -0.3)
      ctx.lineTo(0.6, -0.5); ctx.lineTo(0.66, -0.43); ctx.lineTo(0.52, -0.22); ctx.lineTo(0.62, -0.09)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    },

    /* --- 底图：亮着的房间 + 已查过的标记（平面图或标记变了才重画） --- */
    drawBase() {
      const ctx = this.ctx
      this.baseVer = this.planVer
      this.nd = this.doneCount()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, this.cv.width, this.cv.height)
      ctx.globalAlpha = 1
      ctx.drawImage(this.plan, 0, 0)
      this.drawMarks(ctx, null)
    },
    doneCount() { let n = 0; for (const sp of this.spots) if (sp.done) n += 1; return n * 100 + this.spots.filter(sp => sp.revealed).length },
    // 已查的标记（clip：只画落在这块矩形里的，设备像素）
    drawMarks(ctx, clip) {
      const d = this.dpr
      let n = 0
      for (const sp of this.spots) {
        if (!sp.done) continue
        if (sp.kind === 'clue') n++
        const [x, y] = this.P(sp.u, sp.v)
        if (clip && (x * d < clip[0] - 12 * d || x * d > clip[2] + 12 * d || y * d < clip[1] - 12 * d || y * d > clip[3] + 12 * d)) continue
        if (sp.kind === 'clue') this.tent(ctx, x, y, n)
        else if (sp.kind === 'decoy') { ctx.strokeStyle = sp.herring && !sp.herring.cleared ? 'rgba(235,227,214,.7)' : 'rgba(160,170,180,.6)'; ctx.lineWidth = d; ctx.setLineDash(sp.herring && !sp.herring.cleared ? [3 * d, 3 * d] : []); ctx.beginPath(); ctx.arc(x * d, y * d, 6 * d, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]) }
      }
    },

    /* --- 每帧：侧光（只画光那一小块） --- */
    frame(t, dt) {
      if (!this.running || !this.geo) return
      const d = this.dpr, L = this.light
      const k = Math.min(1, 0.22 * dt)
      if (App.finePointer && !this.auto) {
        const r = S.stage.getBoundingClientRect()
        L.tx = App.mouse.sx - r.left
        L.ty = App.mouse.sy - r.top
      }
      const ox0 = L.x, oy0 = L.y
      L.x += (L.tx - L.x) * k
      L.y += (L.ty - L.y) * k
      // 侧光的朝向：跟着移动的方向慢慢转（只取 ±75° 以内，像贴着地面从一侧打过来）
      L.vx = L.vx * 0.85 + (L.x - ox0) * 0.15
      L.vy = L.vy * 0.85 + (L.y - oy0) * 0.15
      if (Math.hypot(L.vx, L.vy) > 0.6) {
        let a = Math.atan2(L.vy, L.vx)
        if (a > Math.PI / 2) a -= Math.PI
        if (a < -Math.PI / 2) a += Math.PI
        a = U.clamp(a, -1.3, 1.3)
        L.ang += (a - L.ang) * Math.min(1, 0.05 * dt)
      }
      this.t += dt
      // 压低：p 0 → 1；第一次调查时没按过，光圈自己一压一放
      const want = this.press || this.autoPress ? 1 : 0
      L.p += (want - L.p) * Math.min(1, (want ? 0.2 : 0.14) * dt)
      if (L.p < 0.002) L.p = 0
      const hint = this.hint && !this.press && !this.auto ? 0.42 * Math.pow(Math.max(0, Math.sin(this.t * 0.045)), 6) : 0
      const p = Math.max(L.p, hint)
      let R = L.r
      if (!App.finePointer || this.auto) {
        const age = (performance.now() - L.tapAt) / 1000
        R *= age < 0.2 ? 0.55 + age * 2.25 : 1
      }
      const rx = R * (1 + 0.95 * p), ry = R * (1 - 0.66 * p)
      if (this.baseVer !== this.planVer || this.doneCount() !== this.nd) this.drawBase()
      // 小画布以光为中心，对齐设备像素
      const S2 = this.lv.width
      const ox = Math.round((L.x - this.lh) * d), oy = Math.round((L.y - this.lh) * d)
      if (ox !== this.lvx || oy !== this.lvy) {
        this.lvx = ox; this.lvy = oy
        this.lv.style.transform = 'translate3d(' + ox / d + 'px,' + oy / d + 'px,0)'
      }
      const ctx = this.lvc
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, S2, S2)
      // 以下都按整屏的设备像素坐标画
      const cx = L.x * d, cy = L.y * d
      const ell = (sx, sy) => { ctx.setTransform(Math.cos(L.ang) * sx, Math.sin(L.ang) * sx, -Math.sin(L.ang) * sy, Math.cos(L.ang) * sy, cx - ox, cy - oy) }
      // ① 冷光：一圈淡淡的提亮（平时就是它）
      ctx.globalCompositeOperation = 'lighter'
      ell(rx * d, ry * d)
      const sheen = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      sheen.addColorStop(0, `rgba(176,206,236,${0.1 + 0.08 * p})`)
      sheen.addColorStop(0.6, `rgba(150,182,214,${0.05 + 0.05 * p})`)
      sheen.addColorStop(1, 'rgba(150,182,214,0)')
      ctx.fillStyle = sheen
      ctx.fillRect(-1, -1, 2, 2)
      if (p > 0.02) {
        // ② 压低的侧光：拉长的光带里，痕迹浮起来。痕迹层与（略提亮的）平面图先拷进一张同样大小的暂存画布，
        //    用椭圆渐变 destination-in 裁成光带，再叠到小画布上
        const tmp = this.tmp || (this.tmp = document.createElement('canvas'))
        if (tmp.width !== S2 || tmp.height !== S2) { tmp.width = S2; tmp.height = S2 }
        const tc = this.tmpc || (this.tmpc = tmp.getContext('2d'))
        tc.setTransform(1, 0, 0, 1, 0, 0)
        tc.globalCompositeOperation = 'source-over'
        tc.globalAlpha = 1
        tc.clearRect(0, 0, S2, S2)
        const sx = Math.max(0, ox), sy = Math.max(0, oy)
        const sw = Math.min(this.trace.width, ox + S2) - sx, sh = Math.min(this.trace.height, oy + S2) - sy
        if (sw > 0 && sh > 0) {
          tc.globalAlpha = 0.3
          tc.drawImage(this.plan, sx, sy, sw, sh, sx - ox, sy - oy, sw, sh)
          tc.globalAlpha = 1
          tc.drawImage(this.trace, sx, sy, sw, sh, sx - ox, sy - oy, sw, sh)
          tc.globalCompositeOperation = 'destination-in'
          tc.setTransform(Math.cos(L.ang) * rx * d, Math.sin(L.ang) * rx * d, -Math.sin(L.ang) * ry * d, Math.cos(L.ang) * ry * d, cx - ox, cy - oy)
          const m = tc.createRadialGradient(0, 0, 0, 0, 0, 1)
          m.addColorStop(0, 'rgba(0,0,0,1)')
          m.addColorStop(0.55, 'rgba(0,0,0,.85)')
          m.addColorStop(1, 'rgba(0,0,0,0)')
          tc.fillStyle = m
          tc.fillRect(-1, -1, 2, 2)
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = Math.min(1, p * 1.25)
          ctx.drawImage(tmp, 0, 0)
        }
        // 光带的芯：一道贴地的亮线
        ctx.globalAlpha = 1
        ell(rx * d, Math.max(2, ry * 0.18) * d)
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        core.addColorStop(0, `rgba(226,240,255,${0.16 * p})`)
        core.addColorStop(1, 'rgba(226,240,255,0)')
        ctx.fillStyle = core
        ctx.fillRect(-1, -1, 2, 2)
        // 光里的浮尘
        ctx.setTransform(1, 0, 0, 1, -ox, -oy)
        for (const q of this.dust) {
          q.y -= 0.0006 * q.v * dt
          q.x += Math.sin(this.t * 0.02 + q.z * 10) * 0.0004 * dt
          if (q.y < 0) q.y += 1
          const lx = (q.x - 0.5) * 2, ly = (q.y - 0.5) * 2
          if (lx * lx + ly * ly > 1) continue
          const x = L.x + Math.cos(L.ang) * lx * rx - Math.sin(L.ang) * ly * ry
          const y = L.y + Math.sin(L.ang) * lx * rx + Math.cos(L.ang) * ly * ry
          ctx.fillStyle = `rgba(226,240,255,${(1 - Math.hypot(lx, ly)) * 0.4 * q.z * p})`
          ctx.fillRect(x * d, y * d, (1 + q.z) * d, (1 + q.z) * d)
        }
        // 光带扫过：要侧光才看得见的痕迹显出来，热点从此可点
        if (L.p > 0.55) {
          for (const sp of this.spots) {
            if (sp.revealed || sp.done) continue
            const [x, y] = this.P(sp.u, sp.v)
            const dx = x - L.x, dy = y - L.y
            const lu = (dx * Math.cos(L.ang) + dy * Math.sin(L.ang)) / (rx * 0.85), lv = (-dx * Math.sin(L.ang) + dy * Math.cos(L.ang)) / (ry * 0.9)
            if (lu * lu + lv * lv <= 1) this.revealSpot(sp)
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.setTransform(1, 0, 0, 1, -ox, -oy)
      // 已查标记压在光上（光里的那几个重画一遍）；看得见的热点在光里闪
      this.drawMarks(ctx, [ox, oy, ox + S2, oy + S2])
      for (const sp of this.spots) {
        if (sp.done || !sp.revealed) continue
        const [x, y] = this.P(sp.u, sp.v)
        const dist = Math.hypot((x - L.x) / rx, (y - L.y) / Math.max(ry, R * 0.5))
        const vis = U.clamp(1.15 - dist)
        if (vis <= 0.02) continue
        const tw = 0.6 + 0.4 * Math.sin(this.t * 0.12 + sp.u * 3 + sp.v)
        const s = (sp.kind === 'body' ? 9 : 6) * (0.8 + 0.4 * tw) * d
        ctx.save()
        ctx.translate(x * d, y * d)
        ctx.rotate(this.t * 0.01)
        ctx.fillStyle = sp.kind === 'body' ? `rgba(255,46,126,${0.85 * vis})` : sp.raking ? `rgba(214,236,255,${0.95 * vis})` : `rgba(255,244,222,${0.9 * vis * tw})`
        ctx.beginPath()
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.22, -s * 0.22); ctx.lineTo(s, 0); ctx.lineTo(s * 0.22, s * 0.22)
        ctx.lineTo(0, s); ctx.lineTo(-s * 0.22, s * 0.22); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.22, -s * 0.22)
        ctx.closePath(); ctx.fill()
        ctx.restore()
      }
    },
    // 侧光扫到了一处要侧光才看得见的痕迹
    revealSpot(sp) {
      sp.revealed = true
      if (sp.btn) {
        sp.btn.classList.remove('is-hidden')
        sp.btn.classList.add('is-found')
        setTimeout(() => sp.btn && sp.btn.classList.remove('is-found'), 1600)
      }
      App.audio.sfx('tick', { volume: 0.45 })
      App.audio.sfx('hover', { volume: 0.5 })
    },
    tent(ctx, x, y, n) {
      const d = this.dpr
      ctx.save()
      ctx.translate(x * d, y * d)
      ctx.fillStyle = '#ff2e7e'
      ctx.beginPath(); ctx.moveTo(-8 * d, 6 * d); ctx.lineTo(0, -9 * d); ctx.lineTo(8 * d, 6 * d); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#0a0809'
      ctx.font = `${9 * d}px "Cinzel", serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(n), 0, 1.5 * d)
      ctx.restore()
    },

    start() {
      if (this.running) return
      this.running = true
      const r = S.stage.getBoundingClientRect()
      this.light.x = this.light.tx = App.finePointer ? App.mouse.x - r.left : this.W / 2
      this.light.y = this.light.ty = App.finePointer ? App.mouse.y - r.top : this.H / 2
      this.light.tapAt = performance.now() - 5000
      this.off = App.tick((t, dt) => this.frame(t, dt))
      if (this.lv) this.lv.style.display = ''
      // 按住（鼠标）或长按（触屏）：侧光压低；松开恢复。触屏上手指拖到哪里，光就到哪里
      const toLight = e => {
        const rr = S.stage.getBoundingClientRect()
        this.light.tx = e.clientX - rr.left
        this.light.ty = e.clientY - rr.top
      }
      this.onTap = e => {
        if (this.auto || this.ended || S.paused || (e.button != null && e.button > 0)) return
        if (!App.finePointer || e.pointerType === 'touch') {
          toLight(e)
          this.light.tapAt = performance.now()
          clearTimeout(this.holdT)
          this.holdT = setTimeout(() => this.setPress(true), 180)
          try { this.cv.setPointerCapture(e.pointerId) } catch (err) {}
        } else this.setPress(true)
      }
      this.onMove = e => { if (!App.finePointer || e.pointerType === 'touch') { if (e.buttons || this.press) toLight(e) } }
      this.onUp = () => { clearTimeout(this.holdT); this.setPress(false) }
      this.cv.addEventListener('pointerdown', this.onTap)
      this.cv.addEventListener('pointermove', this.onMove)
      window.addEventListener('pointerup', this.onUp)
      window.addEventListener('pointercancel', this.onUp)
      window.addEventListener('blur', this.onUp)
    },
    stop() {
      this.running = false
      this.press = false
      clearTimeout(this.holdT)
      if (this.off) { this.off(); this.off = null }
      if (this.lv) this.lv.style.display = 'none'
      if (this.cv && this.onTap) {
        this.cv.removeEventListener('pointerdown', this.onTap)
        this.cv.removeEventListener('pointermove', this.onMove)
        window.removeEventListener('pointerup', this.onUp)
        window.removeEventListener('pointercancel', this.onUp)
        window.removeEventListener('blur', this.onUp)
      }
    },
    setPress(on) {
      if (this.press === !!on) return
      this.press = !!on
      S.E.inv.classList.toggle('is-raking', this.press)
      if (on) {
        App.audio.sfx('whoosh', { volume: 0.25 })
        if (this.hint) { this.hint = false; App.store.set('trial-rake', true) }
      }
    },

    /* --- 时间圆环 --- */
    buildTicks(total) {
      const g = S.E.inv.querySelector('.trial-inv-ticks')
      let s = ''
      const n = total
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2
        const major = i % (total > 60 ? 10 : 5) === 0
        const r1 = major ? 452 : 462, r2 = 478
        s += `<line data-i="${i}" x1="${(500 + Math.cos(a) * r1).toFixed(1)}" y1="${(500 + Math.sin(a) * r1).toFixed(1)}" x2="${(500 + Math.cos(a) * r2).toFixed(1)}" y2="${(500 + Math.sin(a) * r2).toFixed(1)}" class="${major ? 'is-major' : ''}"/>`
      }
      g.innerHTML = s
      this.ticks = Array.from(g.children)
      this.total = total
    },
    updateTimer() {
      const c = this.c
      const left = Math.max(0, c.tCourt - S.G.minutes)
      const E = S.E.inv
      E.querySelector('.trial-inv-left').textContent = String(Math.ceil(left))
      const frac = left / this.total
      const arc = E.querySelector('.trial-inv-arc')
      const C = 2 * Math.PI * 430
      arc.style.strokeDasharray = `${C * frac} ${C}`
      const used = this.total - Math.ceil(left)
      if (this.ticks) this.ticks.forEach((t, i) => t.classList.toggle('is-used', i < used))
      E.classList.toggle('is-low', left <= Math.min(15, this.total * 0.2))
      updateTop()
    },
    async spendAnim(cost, from) {
      const steps = Math.max(1, Math.round(cost))
      const keep = S.G.minutes
      for (let i = 1; i <= steps; i++) {
        S.G.minutes = from + i
        this.updateTimer()
        if (i % 2 === 0) App.audio.sfx('tick', { volume: 0.35 })
        await wait(28, false)
      }
      S.G.minutes = keep
      this.updateTimer()
    },

    /* --- 点热点 --- */
    // by：旁观时代为调查的人（缺省为玩家自己）
    async onSpot(sp, by) {
      // 旁观时由在场的人轮流细查，点热点不起作用
      if (this.busy || sp.done || this.ended || S.paused || (this.auto && !by)) return
      // 饿过两天：去不了别的房间（身体结算 2）
      if (sp.blocked && !by) { App.audio.sfx('wrong', { volume: 0.35 }); if (window.gsap) gsap.fromTo(sp.btn, { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)', clearProps: 'transform' }); return }
      this.busy = true
      if (!sp.revealed) this.revealSpot(sp)
      if (!App.finePointer || by) {
        // 触屏 / 旁观：点到哪里，光就到哪里
        const [lx, ly] = this.P(sp.u, sp.v)
        this.light.tx = lx; this.light.ty = ly; this.light.tapAt = performance.now()
      }
      try {
        const c = this.c
        const before = S.G.minutes
        const res = TE.inspect(S.G, c, sp.id, by || null)
        if (!res) return
        sp.btn.classList.add('is-done')
        App.audio.sfx(sp.kind === 'body' ? 'heartbeat' : 'click')
        await this.spendAnim(res.cost, before)
        const [x, y] = this.P(sp.u, sp.v)
        const who = by || S.me
        const fast = !!by
        const cardBy = by && by !== S.me ? by : null
        if (sp.kind === 'decoy') {
          const h = res.herring
          if (h) {
            // 疑似线索：当场只看见可疑的东西；以虚边卡进证物栏，「再看一次」才揭开
            await this.popup(x, y, 'look', sp.object, h.bait, '', { fast, tag: '疑似' })
            const rec = addCard({ id: 'herring:' + sp.id, label: sp.object, text: h.bait, predicate: null, icon: 'look', spot: sp.id }, { from: { x, y }, by: cardBy, herring: sp.herring })
            rec.spot = sp
          } else {
            await this.popup(x, y, 'look', sp.object, res.desc + (res.detail ? res.detail : ''), '', { fast })
            // 排除性事实留在证物栏（庭上可以拿来反驳）
            if (res.fact) addCard({ id: 'fact:' + sp.id, label: sp.object, text: res.desc, predicate: null, icon: 'look', fact: res.fact, spot: sp.id }, { from: { x, y }, by: cardBy, fact: true })
          }
          const ri = c.roomInfo
          // 自言自语不是每处都说（玩家自己每案至多一句，免得同一人的池子很快用完）
          if (this.talk(who, 'search', !!h)) voice(who, line(who, 'search', { ROOM: ri.name }, { objs: (ri.objects || []).concat(ri.weapons || []).join('、'), windows: !!ri.windows }))
        } else if (sp.kind === 'body') {
          // 验尸：三格读数与时间刻度（你自己框出死亡时间窗；医护者自动得到一个窗）；衣袋里的金币可取走
          const cause = res.cause
          if (who === S.me || !S.autopsy) S.autopsy = { readings: res.readings, ruler: res.ruler, window: who === S.me ? res.window : null, causeName: cause.name, obs: (res.obs || cause.sign + '。') + res.stage + '。', coins: res.coins || 0, at: S.G.minutes, by: who }
          if (who === S.me && res.window && !S.frame) S.frame = res.window.slice()
          addCard({ id: 'body', label: cause.name, text: cause.sign + '。' + res.stage + '。', predicate: cause.needs || null, icon: 'body', dim: cause.needs ? cause.glyph || null : null, visible: cause.visible }, { from: { x, y }, by: cardBy })
          await openAutopsy({ auto: fast })
        } else {
          const k = res.clue
          await this.popup(x, y, k.tpl, k.label, k.text, k.place === 'away' && k.awayTo ? k.awayTo : '', { fast, lead: res.lead })
          addCard({ id: k.id, label: k.label, text: k.text, predicate: k.predicate, icon: k.tpl, dim: k.dim, visible: k.visible, shift: k.shift || null }, { from: { x, y }, by: cardBy })
          if (this.talk(who, 'found', false)) voice(who, line(who, 'found', { CLUE: k.name }))
        }
      } catch (e) {
        if (e !== ABORT) console.error(e)
      } finally {
        this.busy = false
        this.placeButtons()
        this.updateGo()
      }
    },
    // 这一处要不要出声：旁观时轮流调查的人各说各的；玩家自己每案每种（search / found）至多一句
    talk(who, key, force) {
      if (who !== S.me) return true
      const said = this.said || (this.said = {})
      const k = this.c.no + key
      if (said[k] || !(force || key === 'found' || Math.random() < 0.6)) return false
      said[k] = true
      return true
    },
    // 询问：点一个在场的人，他交代案发时的去向（凶手会说谎）；花费调查时间
    async interview() {
      const c = this.c
      if (this.busy || this.ended || S.paused || abilityBusy || !c || !meAlive() || S.spectate) return
      this.busy = true
      try {
        const ids = await roster(1, id => id !== S.me && !(c.asked || []).includes(id), '询问')
        if (!ids || !ids[0] || this.ended) return
        const before = S.G.minutes
        const r = TE.interview(S.G, c, ids[0])
        if (!r) return
        App.audio.sfx('door', { volume: 0.3 })
        await this.spendAnim(r.cost, before)
        // 「这个时段你在哪」：两段时间线；台词说的是落在你框出的窗里的那一段（没框就是前一段）
        const f = S.frame
        const segs = r.segs || []
        const hit = f ? segLight(segs, f).indexOf('is-lit') : -1
        const sg = segs[hit >= 0 ? hit : 0] || { room: r.room, from: r.time }
        const t = line(r.id, 'alibi', { ROOM: sg.room, TIME: hhmm(sg.from) })
        const rec = talkCard(r.id, r)
        // 与你自己的去向相矛盾（你当时就在那间房里）：你知道他在说谎
        const mine = r.conflicts.filter(k => k.witness === S.me)
        // 被问到案发的时间与地点：破绽成立、而你察觉到了——肖像抖一帧，话断出「……」，证言卡上留一只小眼睛
        const tell = r.tell && r.tell.shown && r.tell.player ? r.tell : null
        await this.popup(this.W / 2, this.H / 2, null, nameOf(r.id), quoted(t), '', { face: r.id, center: true, tag: mine.length ? '矛盾' : '', alarm: mine.length > 0, tell: !!tell, timeline: segs })
        if (tell) markTell(r.id, rec)
        for (const k of mine) markConflict(k)
      } catch (e) {
        if (e !== ABORT) console.error(e)
      } finally {
        this.busy = false
        this.updateGo()
      }
    },
    // 疑似线索「再看一次」：花三到五分钟，看清它是无害的；卡片从虚边变成灰色的已查
    async recheck(rec) {
      const c = this.c
      const sp = rec && rec.spot
      if (!sp || this.busy || this.ended || S.paused || abilityBusy || this.auto || !c) return
      this.busy = true
      try {
        const before = S.G.minutes
        const r = TE.reexamine(S.G, c, sp.id)
        if (!r) { App.audio.sfx('wrong', { volume: 0.3 }); return }
        App.audio.sfx('click')
        rec.el.classList.add('is-checking')
        const [x, y] = this.P(sp.u, sp.v)
        this.light.tx = x; this.light.ty = y; this.light.tapAt = performance.now()
        await this.spendAnim(r.cost, before)
        await this.popup(x, y, 'look', sp.object, sp.herring.bait, '', { tag: '疑似', more: r.truth, clear: true })
        rec.el.classList.remove('is-checking')
        rec.el.classList.add('is-cleared')
        rec.el.setAttribute('data-cursor', '')
        rec.item.text = sp.herring.bait + r.truth
        this.drawBase()
      } catch (e) {
        if (e !== ABORT) console.error(e)
      } finally {
        this.busy = false
        this.updateGo()
      }
    },
    // 手边的工具（兑换来的）：鲁米诺（要毛毯）、指纹粉、拍立得；录音笔开着时亮一个红点
    renderTools(pop) {
      const box = S.E.inv.querySelector('.trial-inv-tools')
      if (!box) return
      box.innerHTML = ''
      if (this.auto || !meAlive() || S.spectate) return
      const c = this.c
      const tools = c ? c.tools || {} : {}
      const add = (key, ico, used, extra) => {
        const b = el('button.trial-tool' + (used ? '.is-used' : '') + (extra || ''), { type: 'button', 'data-cursor': '', 'aria-label': IT[key] }, [el('i', { html: icon(ico) })])
        b.disabled = !!used || this.ended
        b.addEventListener('click', e => { e.stopPropagation(); this.useTool(key) })
        box.appendChild(b)
        if (pop && window.gsap) gsap.fromTo(b, { y: -20, opacity: 0, scale: 1.4 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'bounce.out' })
        return b
      }
      if (haveItem('luminol') || tools.luminol) {
        const b = add('luminol', 'luminol', tools.luminol)
        if (!haveItem('blanket')) b.classList.add('is-need')
      }
      if (haveItem('powder')) add('powder', 'powder', tools.powder)
      if (haveItem('camera')) add('camera', 'photo', tools.camera)
      if (haveItem('recorder')) { const b = add('recorder', 'recorder', true, '.is-rec'); b.disabled = true }
      box.classList.toggle('is-on', !!box.children.length)
    },
    async useTool(key) {
      const c = this.c
      if (this.busy || this.ended || S.paused || this.auto || !c) return
      if (key === 'luminol' && !haveItem('blanket')) {
        // 灯关不掉：要先用毛毯罩出一块暗处
        App.audio.sfx('wrong', { volume: 0.35 })
        const b = S.E.inv.querySelector('.trial-tool.is-need')
        if (b && window.gsap) gsap.fromTo(b, { x: -5 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)', clearProps: 'transform' })
        return
      }
      this.busy = true
      try {
        const before = S.G.minutes
        const r = TE.useTool(S.G, c, key === 'camera' ? 'camera' : key)
        if (!r) { App.audio.sfx('wrong', { volume: 0.3 }); return }
        if (key === 'luminol') { S.consumed = S.consumed || {}; S.consumed.luminol = (S.consumed.luminol || 0) + 1 }
        await this.spendAnim(r.cost, before)
        if (key === 'luminol') await this.luminolFx(r)
        else if (key === 'powder') await this.powderFx(r)
        else if (key === 'camera') this.cameraFx(r)
      } catch (e) {
        if (e !== ABORT) console.error(e)
      } finally {
        this.busy = false
        this.placeButtons()
        this.updateGo()
        this.renderTools()
      }
    },
    // 鲁米诺：毛毯罩出的暗处里，血类痕迹泛蓝光（漂白剂擦过的地方也亮）
    async luminolFx(r) {
      const inv = S.E.inv
      inv.classList.add('is-dark')
      App.audio.sfx('dark', { volume: 0.5 })
      await wait(500)
      for (const id of r.glow) {
        const sp = this.spots.find(x => x.id === id)
        if (!sp) continue
        sp.revealed = true
        if (sp.btn) { sp.btn.classList.remove('is-hidden'); sp.btn.classList.add('is-glow') }
        App.audio.sfx('tick', { volume: 0.4 })
        await wait(160)
      }
      if (!r.glow.length) App.audio.sfx('wrong', { volume: 0.3 })
      await wait(1100)
      inv.classList.remove('is-dark')
    },
    // 指纹粉：刷开——显出手印（本案已有的那处直接显出；新显出的一处另放一个热点）；戴手套的人只留污印
    async powderFx(r) {
      if (r.smudge || !r.spot) { App.audio.sfx('wrong', { volume: 0.35 }); return }
      let sp = this.spots.find(x => x.id === r.spot)
      if (!sp) {
        const src = this.c.spots.find(x => x.id === r.spot)
        const solid = this.objs.filter(o => !o.rug && !o.ghost && /mirror|window|table|cabinet|round|piano/.test(o.k))
        const o = solid[Math.floor(Math.random() * solid.length)] || this.objs[0] || { u: this.w / 2, v: this.h / 2, a: 1, b: 1 }
        src.u = U.clamp(o.u + (Math.random() - 0.5) * 0.6, 0.35, this.w - 0.35)
        src.v = U.clamp(o.v + (Math.random() - 0.5) * 0.6, 0.35, this.h - 0.35)
        src.place = 'room'
        src.revealed = true
        const b = el('button.trial-spot.is-glow', { type: 'button', 'data-cursor': '', 'aria-label': '细查' })
        b.addEventListener('click', e => { e.stopPropagation(); this.onSpot(src) })
        src.btn = b
        S.E.inv.querySelector('.trial-inv-spots').appendChild(b)
        this.spots.push(src)
        sp = src
      }
      sp.revealed = true
      if (sp.btn) { sp.btn.classList.remove('is-hidden'); sp.btn.classList.add('is-glow', 'is-found') }
      App.audio.sfx('hover', { volume: 0.6 })
      this.placeButtons()
      await wait(400)
    },
    // 拍立得：一闪，照片进证物栏（开庭可出示）
    cameraFx(r) {
      App.flash('#ffffff', { opacity: 0.6, duration: 0.5 })
      App.audio.sfx('flip')
      const [x, y] = this.body ? this.P(this.body.u, this.body.v) : [this.W / 2, this.H / 2]
      addCard({ id: 'photo', label: '尸体照片', text: r.photo.readings.map(x => x.name + '：' + x.text).join('；') + '。', predicate: null, icon: 'photo' }, { from: { x, y } })
    },
    // 默念：调查期的兑换（时间停着，买成一次花一分钟）
    async murmur() {
      if (this.busy || this.ended || S.paused || this.auto || !meAlive() || S.spectate) return
      this.busy = true
      let v
      try {
        v = await murmur('inv')
      } catch (e) {
        if (e !== ABORT) console.error(e)
      } finally {
        this.busy = false
        this.updateGo()
        this.renderTools()
      }
      if (v === 'exit' && S.invDone) S.invDone('exit')
    },
    // 「询问」按钮：问完所有人或时间到了就收起
    updateGo() {
      const b = this.askBtn
      if (!b) return
      const c = this.c
      const left = c ? c.tCourt - S.G.minutes : 0
      const any = c && living().some(id => id !== S.me && !(c.asked || []).includes(id))
      b.disabled = !any || left <= 0 || this.ended
    },
    closePop() {
      const box = S.E.inv && S.E.inv.querySelector('.trial-inv-pop')
      if (!box) return
      box.classList.remove('is-on')
      clearFaces(box.querySelector('.trial-inv-pop-ico'))
    },
    // 弹出的说明。opts：lead 发现时的动作；tag 角标（疑似 / 矛盾）；more 稍后补上的一句（疑似线索的真相）；
    // face 用肖像代替图标；center 居中；fast 旁观时快一些
    async popup(x, y, ico, title, text, sub, opts = {}) {
      const box = S.E.inv.querySelector('.trial-inv-pop')
      const ib = box.querySelector('.trial-inv-pop-ico')
      clearFaces(ib)
      ib.innerHTML = ''
      if (opts.face) { ib.appendChild(App.portrait(opts.face, { track: false })); ib.classList.add('is-face') }
      else { ib.innerHTML = ico ? icon(ico) : ''; ib.classList.remove('is-face') }
      const lead = box.querySelector('.trial-inv-pop-lead')
      lead.textContent = opts.lead || ''
      box.querySelector('b').textContent = title
      const subEl = box.querySelector('.trial-inv-pop-sub')
      subEl.textContent = sub || ''
      subEl.classList.toggle('is-tl', !!opts.timeline)
      if (opts.timeline) subEl.appendChild(timelineEl(opts.timeline))
      const more = box.querySelector('.trial-inv-pop-more')
      more.textContent = ''
      const tag = box.querySelector('.trial-inv-pop-tag')
      tag.textContent = opts.tag || ''
      tag.className = 'trial-inv-pop-tag' + (opts.tag ? ' is-on' : '') + (opts.alarm ? ' is-alarm' : '')
      box.classList.toggle('is-act', isAct(text))
      box.classList.remove('is-tell')
      const W = this.W
      const bw = Math.min(380, W - 32)
      const left = this.geo.mobile || opts.center ? (W - bw) / 2 : U.clamp(x + 30, 16, W - bw - 16)
      const top = this.geo.mobile ? this.H - 340 : opts.center ? this.H / 2 - 110 : U.clamp(y - 70, 120, this.H - 300)
      Object.assign(box.style, { left: left + 'px', top: top + 'px', width: bw + 'px' })
      box.classList.add('is-on')
      App.audio.sfx('card')
      if (window.gsap) {
        gsap.fromTo(box, { opacity: 0, y: 14, rotate: -2 }, { opacity: 1, y: 0, rotate: 0, duration: 0.45, ease: 'expo.out' })
        if (opts.lead) gsap.fromTo(lead, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.5, ease: 'expo.out' })
        if (opts.tag) gsap.fromTo(tag, { scale: 2.2, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.4, delay: 0.25, ease: 'expo.out' })
      }
      if (opts.alarm) {
        App.audio.sfx('glitch', { volume: 0.5 })
        if (window.gsap) gsap.fromTo(tag, { x: -10 }, { x: 0, duration: 0.6, delay: 0.3, ease: 'elastic.out(1.4, 0.25)' })
      }
      const sp = opts.fast ? 14 : 20
      if (opts.tell) {
        // 破绽：肖像抖一帧，话断出「……」
        box.classList.add('is-tell')
        await wait(160, false)
        tellJolt(ib)
        await typeBroken(box.querySelector('.trial-inv-pop-text'), text, sp)
      } else await typeIn(box.querySelector('.trial-inv-pop-text'), text, sp, isAct(text))
      if (opts.more) {
        // 疑似线索再看一次：停一拍，看清
        await wait(opts.fast ? 450 : 750)
        App.audio.sfx('tick')
        await typeIn(more, opts.more, sp)
        tag.textContent = '无关'
        tag.classList.add('is-clear')
        if (window.gsap) gsap.fromTo(tag, { scale: 1.6 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' })
      }
      const len = text.length + (opts.more || '').length
      await wait(opts.fast ? Math.min(1500, 600 + len * 14) : Math.min(2600, 900 + len * 25))
      if (window.gsap) await anim(r => gsap.to(box, { opacity: 0, y: 20, scale: 0.9, duration: 0.3, ease: 'power2.in', onComplete: r }))
      box.classList.remove('is-on')
      if (window.gsap) gsap.set(box, { clearProps: 'transform,opacity' })
    },
    // 占卜家：查验结果。被查验者不收到任何通知（主持人游戏 5.7），所以这里只有卡面，没有他的反应
    async reveal(id, name) {
      const box = S.E.inv.querySelector('.trial-inv-pop')
      const ib = box.querySelector('.trial-inv-pop-ico')
      clearFaces(ib)
      ib.innerHTML = ''
      ib.classList.remove('is-face')
      ib.appendChild(sigil(name))
      box.querySelector('.trial-inv-pop-lead').textContent = ''
      box.querySelector('.trial-inv-pop-more').textContent = ''
      box.querySelector('.trial-inv-pop-tag').className = 'trial-inv-pop-tag'
      box.querySelector('b').textContent = nameOf(id) + ' · ' + name
      box.querySelector('.trial-inv-pop-sub').textContent = ''
      const bw = Math.min(380, this.W - 32)
      Object.assign(box.style, { left: (this.W - bw) / 2 + 'px', top: (this.H / 2 - 120) + 'px', width: bw + 'px' })
      box.classList.add('is-on')
      App.audio.sfx('flip')
      if (window.gsap) gsap.fromTo(box, { opacity: 0, rotateY: 90 }, { opacity: 1, rotateY: 0, duration: 0.5, ease: 'back.out(1.6)' })
      box.classList.remove('is-act', 'is-tell')
      box.querySelector('.trial-inv-pop-text').textContent = ''
      await wait(2400)
      box.classList.remove('is-on')
    },
  }

  /* ==========================================================
     默念：兑换（价目表「兑换方式」、8.2、第 9 节）
     说出或默念 → 只对你报价 → 同意 → 付款 → 东西出现在手边。一次兑换的总价要正好整百，不找零；身上的不够就不成立。
     调查期列工具（鲁米诺要先用毛毯罩出暗处；指纹粉不在铜牌上，问了才知道价）；余波列吃的、一夜安眠。
     打听「谁是凶手」之类一律不成立，不收钱。退出券五百枚：买得起的话，持券可以要求离馆。
     ========================================================== */
  const IT = {
    luminol: '鲁米诺试剂一瓶', blanket: '毛毯、枕头、睡袋', juice: '一瓶果汁、汽水或牛奶', powder: '指纹粉、刷子与胶纸一套',
    recorder: '录音笔一支', camera: '拍立得相机一台，含相纸二十张', meal: '一餐，一人份，菜式任点', feast: '十五人份的同一餐',
    sleep: '热水浴、按摩、一夜安眠的服务', coffee: '一壶热咖啡或茶，含杯具', choc: '巧克力一板', ticket: '退出券一张', repair: '修复身体残疾',
  }
  const MM_LIST = {
    inv: [['luminol', 'luminol'], ['blanket', 'blanket'], ['juice', 'drink'], ['powder', 'powder'], ['recorder', 'recorder'], ['camera', 'photo'], ['meal', 'meal'], ['ticket', 'ticket']],
    after: [['meal', 'meal'], ['feast', 'meal'], ['sleep', 'sleep'], ['coffee', 'drink'], ['choc', 'meal'], ['juice', 'drink'], ['repair', 'walk'], ['ticket', 'ticket']],
  }
  const econ = () => (App.econ && App.econ.get()) || null
  // 手边有几件（买到的，减去这一局用掉的鲁米诺）
  function haveItem(key) {
    const e = econ()
    if (!e || e.game !== S.econGame) return 0
    const it = e.items.find(x => x.name === IT[key])
    return it ? Math.max(0, it.qty - ((S.consumed && S.consumed[key]) || 0)) : 0
  }
  // 引擎里你身上的枚数跟着钱袋走
  function syncPurse() {
    const e = econ()
    if (!e || !S.G || !S.me || e.game !== S.econGame) return
    const p = S.G.people[S.me]
    if (p) p.coins = e.coins
    S.G.walkFix = Object.assign({}, e.repaired || {})
  }
  // 顶栏的饥饿与困倦刻度（身体结算 2、4）
  function updateBody() {
    const box = S.E.top && S.E.top.querySelector('.trial-top-body')
    if (!box) return
    box.classList.toggle('is-off', !meAlive() || !!S.spectate)
    if (!S.G || !S.me || !S.G.people[S.me]) return
    const b = TE.bodyState(S.G, S.me)
    const key = b.hunger + '|' + b.sleep
    if (box._k === key) return
    box._k = key
    box.querySelectorAll('.trial-gauge').forEach(gg => {
      const n = gg.classList.contains('is-hunger') ? b.hunger : b.sleep
      gg.querySelectorAll('b').forEach((x, i) => x.classList.toggle('is-on', i < n))
      gg.classList.toggle('is-warn', gg.classList.contains('is-hunger') ? b.hunger >= 2 : b.sleep >= 2)
    })
  }
  function murmur(where) {
    const box = S.E.mm
    const list = (MM_LIST[where] || MM_LIST.inv).slice()
    const note = [] // 这一次兑换：{key, qty}
    box.innerHTML = ''
    const purse = el('div.trial-mm-purse', null, [el('i.trial-mm-coin'), el('b')])
    const rows = el('div.trial-mm-rows')
    const noteEl = el('div.trial-mm-note')
    const go = button('同意', 'btn--blood', 'mm-pay')
    const close = button('收起', '', 'mm-close')
    const exitBtn = button('持券离馆', '', 'mm-exit')
    exitBtn.classList.add('trial-mm-exit')
    exitBtn.prepend(el('i', { html: icon('exitdoor') }))
    const priceOf = key => { const p = App.econ.price(IT[key]); return p ? p.pts : null }
    const known = key => { const p = App.econ.price(IT[key]); const e = econ(); return !!p && (!p.off || (e && e.asked[IT[key]] != null)) }
    const listOf = () => note.map(n => ({ name: IT[n.key], qty: n.qty, repair: n.key === 'repair' ? S.me : undefined }))
    const render = () => {
      const e = econ()
      purse.querySelector('b').textContent = String(e ? e.coins : 0)
      noteEl.innerHTML = ''
      if (note.length) {
        const parts = []
        for (const n of note) {
          const chip = el('button.trial-mm-chip', { type: 'button', 'data-cursor': '', 'aria-label': IT[n.key] }, [el('i', { html: icon((list.find(x => x[0] === n.key) || [0, 'look'])[1]) }), n.qty > 1 ? el('b', { text: '×' + n.qty }) : null])
          chip.addEventListener('click', ev => { ev.stopPropagation(); n.qty--; if (n.qty <= 0) note.splice(note.indexOf(n), 1); App.audio.sfx('click'); render() })
          noteEl.appendChild(chip)
          parts.push(String((priceOf(n.key) || 0) * n.qty))
        }
        const r = App.econ.settle(listOf())
        noteEl.appendChild(el('span.trial-mm-sum', { text: parts.join(' + ') + ' = ' + r.total }))
        const res = el('span.trial-mm-res' + (r.ok ? '.is-ok' : '.is-no'), null, [el('i.trial-mm-coin'), el('b', { text: String(Math.floor(r.total / 100)) })])
        if (r.reason === 'round') res.appendChild(el('em', { text: '+' + r.short }))
        if (r.reason === 'purse') res.classList.add('is-short')
        if (r.reason === 'repair' || r.reason === 'exited') res.classList.add('is-void')
        noteEl.appendChild(res)
        go.disabled = !r.ok
      } else go.disabled = true
      noteEl.classList.toggle('is-on', !!note.length)
      go.classList.toggle('is-breath', !go.disabled)
      exitBtn.style.display = App.econ.hasTicket() && !(e && e.exited) && meAlive() ? '' : 'none'
    }
    // 铜牌上问过价的牌外物品，也列进来（问了才知道价）
    const e0 = econ()
    if (where === 'inv' && e0) for (const nm of Object.keys(e0.asked || {})) {
      if (Object.values(IT).includes(nm)) continue
      const key = 'asked:' + nm
      IT[key] = nm
      list.push([key, 'look'])
    }
    for (const [key, ico] of list) {
      if (key === 'repair' && !App.econ.disability(S.me)) continue
      const row = el('button.trial-mm-row', { type: 'button', 'data-cursor': '', 'aria-label': IT[key] }, [el('i', { html: icon(ico) }), el('span', { text: IT[key] }), el('b')])
      const showPrice = () => { row.querySelector('b').textContent = known(key) ? String(priceOf(key)) : '?' }
      showPrice()
      row.addEventListener('click', ev => {
        ev.stopPropagation()
        // 牌外的东西：先问价（只对你报）
        if (!known(key)) { App.econ.ask(IT[key]); showPrice(); App.audio.sfx('chime', { volume: 0.4 }); if (window.gsap) gsap.fromTo(row.querySelector('b'), { scale: 1.8, color: '#ff2e7e' }, { scale: 1, color: '', duration: 0.5, ease: 'back.out(3)', clearProps: 'color' }); return }
        const n = note.find(x => x.key === key)
        if (n) n.qty++
        else note.push({ key, qty: 1 })
        App.audio.sfx('card', { volume: 0.5 })
        render()
      })
      rows.appendChild(row)
    }
    // 打听：一律不成立，不收钱
    const asks = el('div.trial-mm-asks')
    for (const v of [{ label: '谁是凶手', key: 'ask' }].concat((App.econ.VOID_ASKS || []).slice(0, 3))) {
      const b = el('button.trial-mm-ask', { type: 'button', 'data-cursor': '', 'aria-label': v.label }, [el('i', { html: icon('voidask') }), el('span', { text: v.label })])
      b.addEventListener('click', ev => {
        ev.stopPropagation()
        const r = App.econ.settle([{ name: v.label, void: v.key }])
        b.classList.add('is-void')
        b.setAttribute('data-res', r.ok ? '' : '不成立')
        App.audio.sfx('wrong', { volume: 0.35 })
        if (window.gsap) gsap.fromTo(b, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.3)' })
      })
      asks.appendChild(b)
    }
    const foot = el('div.trial-mm-foot', null, [exitBtn, go, close])
    box.append(el('div.trial-mm-head', null, [el('i.trial-mm-ico', { html: icon('look') }), purse]), rows, asks, noteEl, foot)
    box.classList.toggle('is-after', where === 'after')
    box.classList.add('is-on')
    centerBox(box, where === 'after')
    render()
    App.audio.sfx('whoosh', { volume: 0.4 })
    if (window.gsap) gsap.fromTo(box, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expo.out' })
    return ask(done => {
      go.addEventListener('click', ev => {
        ev.stopPropagation()
        const r = App.econ.pay(listOf())
        if (!r.ok) { App.audio.sfx('wrong', { volume: 0.4 }); render(); return }
        syncPurse()
        App.audio.sfx('coins')
        delivered(r.items || [], where)
        note.length = 0
        render()
        if (where === 'inv' && S.C) { const before = S.G.minutes; TE.spend(S.G, S.C, 1); Inv.spendAnim(1, before) }
      })
      close.addEventListener('click', ev => { ev.stopPropagation(); App.audio.sfx('click'); done('close') })
      exitBtn.addEventListener('click', ev => { ev.stopPropagation(); done('exit') })
      const kill = () => done('close')
      picks.add(kill)
      return () => { picks.delete(kill); box.classList.remove('is-on') }
    })
  }
  // 交付：买到的东西落在手边（调查期落进工具栏；余波落在你席位前的桌面上），并生效
  function delivered(items, where) {
    const G = S.G
    for (const it of items) {
      if (it.name === IT.meal) TE.eat(G, S.me)
      else if (it.name === IT.feast) TE.eat(G, TE.livingIds(G))
      else if (it.name === IT.sleep) TE.rest(G, S.me)
      else if (it.name === IT.recorder && S.C && where === 'inv' && !Inv.ended) TE.useTool(G, S.C, 'recorder')
    }
    updateBody()
    if (where === 'inv') Inv.renderTools(true)
    // 东西出现的样子：小图标从桌心落下
    const g = S.geo
    if (!g || !window.gsap) return
    items.forEach((it, i) => {
      const key = Object.keys(IT).find(k => IT[k] === it.name)
      const row = (MM_LIST[where] || []).find(x => x[0] === key)
      const ico = el('i.trial-drop-item', { html: icon(row ? row[1] : 'look') })
      S.stage.appendChild(ico)
      const k = seatOf(S.me)
      const at = where === 'after' && k ? { x: g.pos[k].x + (g.cx - g.pos[k].x) * 0.3, y: g.pos[k].y + (g.cy - g.pos[k].y) * 0.3 } : { x: g.W / 2, y: g.H - 150 }
      ico.style.left = at.x + 'px'
      ico.style.top = at.y + 'px'
      gsap.fromTo(ico, { y: -60, opacity: 0, scale: 1.4 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, delay: i * 0.1, ease: 'bounce.out', onStart: () => App.audio.sfx('drop', { volume: 0.5 }) })
      gsap.to(ico, { opacity: 0, duration: 0.6, delay: 1.6 + i * 0.1, onComplete: () => ico.remove() })
    })
  }

  /* ==========================================================
     验尸：三格读数与死亡时间窗（洋馆物理层 7.4、7.5）
     体温、僵硬、尸斑各落在表里的一档，每一档对应一个死亡时段，画在同一条时间刻度上；你在刻度上自己拖出死亡时间窗。
     医护「有 / 战场急救 / 基本常识」的人自动得到一个由窄到宽的窗（虚线）。你手里有让时间窗偏移的证物时，
     被干扰的那一格裂开，显出它本来该在的位置。框好的窗决定证言卡上哪一段标亮。
     ========================================================== */
  const READ_TONE = { temp: 'is-temp', rigor: 'is-rigor', livor: 'is-livor' }
  // 居中的浮层：用 GSAP 的百分比位移（别用 CSS 的 translate 属性——GSAP 碰过一次就会把它覆盖成 none）
  function centerBox(box, on) {
    if (window.gsap) gsap.set(box, { xPercent: on ? -50 : 0, yPercent: on ? -50 : 0 })
    else box.style.transform = on ? 'translate(-50%, -50%)' : ''
  }
  // 你知不知道尸体被怎样处理过：证物栏里有那条让时间窗偏移的证物
  const knowShift = () => !!(S.C && S.C.shift && S.cards.some(r => r.item.shift))
  function openAutopsy(opts = {}) {
    const A = opts.photo && S.C && S.C.photo ? Object.assign({}, S.autopsy || {}, { readings: S.C.photo.readings, ruler: S.C.photo.ruler, photo: true, coins: 0 }) : S.autopsy
    if (!A || !A.readings || !S.E.ap) return Promise.resolve()
    const box = S.E.ap
    const c = S.C
    box.innerHTML = ''
    // 刻度只取有用的那一段：最早的读数、医护的窗、你的窗往前一点，到验尸的时刻；至少三小时
    const r1 = A.ruler[1]
    let lo = r1 - 180
    for (const r of A.readings) lo = Math.min(lo, r.band[0] == null ? r.band[1] - 120 : r.band[0])
    if (A.window) lo = Math.min(lo, A.window[0])
    if (S.frame) lo = Math.min(lo, S.frame[0])
    if (c && c.shift && knowShift()) lo = Math.min(lo, c.tMurder - 60, TE.apparentDeath(c) - 60)
    const r0 = Math.max(A.ruler[0], Math.floor((lo - 30) / 60) * 60)
    const span = r1 - r0
    const known = knowShift()
    const off = c && c.shift ? c.shift.dir * c.shift.minutes : 0
    // 头：死因、所见、尸体阶段
    const head = el('div.trial-ap-head', null, [
      el('i.trial-ap-ico', { html: icon(A.photo ? 'photo' : 'body') }),
      el('div', null, [el('b', { text: A.causeName || (c && c.cause.name) || '' }), A.obs ? el('p', { text: A.obs }) : null]),
    ])
    // 三格读数
    const cells = el('div.trial-ap-reads')
    for (const r of A.readings) {
      const crack = known && r.shifted
      cells.appendChild(el('div.trial-ap-cell.' + (READ_TONE[r.key] || '') + (crack ? '.is-crack' : ''), null, [el('i.trial-ap-sw'), el('b', { text: r.name }), el('span', { text: r.text })]))
    }
    // 刻度
    const ruler = el('div.trial-ap-ruler')
    const axis = el('div.trial-ap-axis')
    const rows = el('div.trial-ap-rows')
    const pct = t => U.clamp((t - r0) / span) * 100
    for (let t = Math.ceil(r0 / 60) * 60; t <= r1; t += 60) {
      const major = Math.round(t / 60) % 2 === 0
      axis.appendChild(el('i' + (major ? '.is-major' : ''), { style: { left: pct(t) + '%' } }))
      if (major) axis.appendChild(el('span', { text: hhmm(t), style: { left: pct(t) + '%' } }))
    }
    for (const r of A.readings) {
      const row = el('div.trial-ap-row.' + (READ_TONE[r.key] || ''))
      const band = (a, b, cls) => {
        const L = pct(a == null ? r0 : a), R = pct(b)
        row.appendChild(el('i.trial-ap-band' + (cls || '') + (a == null ? '.is-open' : ''), { style: { left: L + '%', width: Math.max(0.8, R - L) + '%' } }))
      }
      if (known && r.shifted) {
        band(r.band[0], r.band[1], '.is-false')
        band(r.band[0] == null ? null : r.band[0] - off, r.band[1] - off, '.is-true')
      } else band(r.band[0], r.band[1])
      rows.appendChild(row)
    }
    // 医护的窗（虚线）与你的窗（可拖）
    const med = A.window ? el('i.trial-ap-med', { html: dimIcon('medical'), style: { left: pct(A.window[0]) + '%', width: (pct(A.window[1]) - pct(A.window[0])) + '%' } }) : null
    const frame = el('div.trial-ap-frame', null, [el('i.trial-ap-h.is-a'), el('i.trial-ap-h.is-b'), el('b.trial-ap-ft')])
    ruler.append(axis, rows)
    if (med) ruler.appendChild(med)
    ruler.appendChild(frame)
    if (!S.frame && A.window) S.frame = A.window.slice()
    const drawFrame = () => {
      const f = S.frame
      frame.classList.toggle('is-on', !!f)
      if (!f) return
      frame.style.left = pct(f[0]) + '%'
      frame.style.width = Math.max(0, pct(f[1]) - pct(f[0])) + '%'
      frame.querySelector('.trial-ap-ft').textContent = hhmm(f[0]) + '—' + hhmm(f[1])
    }
    drawFrame()
    // 拖：在刻度上按下拖出一个窗；按住端点改一边
    let drag = null
    const tAt = e => { const rc = ruler.getBoundingClientRect(); return r0 + U.clamp((e.clientX - rc.left) / (rc.width || 1)) * span }
    const snap = t => Math.round(t / 10) * 10
    ruler.addEventListener('pointerdown', e => {
      if (opts.readonly) return
      e.preventDefault()
      const t = tAt(e)
      const f = S.frame
      const rc = ruler.getBoundingClientRect()
      const px = m => (m / span) * rc.width
      if (f && Math.abs(px(t - f[0])) < 14) drag = { side: 0 }
      else if (f && Math.abs(px(t - f[1])) < 14) drag = { side: 1 }
      else { drag = { anchor: snap(t) }; S.frame = [snap(t), snap(t) + 10] }
      try { ruler.setPointerCapture(e.pointerId) } catch (err) {}
      drawFrame()
      App.audio.sfx('tick', { volume: 0.4 })
    })
    ruler.addEventListener('pointermove', e => {
      if (!drag) return
      const t = snap(tAt(e))
      let f = S.frame.slice()
      if (drag.anchor != null) f = t < drag.anchor ? [t, drag.anchor] : [drag.anchor, Math.max(t, drag.anchor + 10)]
      else if (drag.side === 0) f[0] = Math.min(t, f[1] - 10)
      else f[1] = Math.max(t, f[0] + 10)
      S.frame = f
      drawFrame()
    })
    const end = () => { if (!drag) return; drag = null; lightTalk(); App.audio.sfx('drop', { volume: 0.4 }) }
    ruler.addEventListener('pointerup', end)
    ruler.addEventListener('pointercancel', end)
    // 脚：衣袋里的金币（调查期、尸体还在时可取走，耗一分钟）与收起
    const foot = el('div.trial-ap-foot')
    if (A.coins > 0 && !opts.readonly && S.scene === 'inv' && !Inv.ended && S.C && !S.C.coinsTaken && meAlive() && !S.spectate) {
      const purse = el('div.trial-ap-coins')
      for (let i = 0; i < Math.min(A.coins, 24); i++) purse.appendChild(el('i'))
      purse.appendChild(el('b', { text: String(A.coins) }))
      const take = button('取走', '', 'take-coins')
      take.addEventListener('click', e => { e.stopPropagation(); takeCoins(purse, take) })
      foot.append(purse, take)
    }
    const close = button('收起', 'btn--blood', 'ap-close')
    foot.appendChild(close)
    box.append(head, cells, ruler, foot)
    box.classList.toggle('is-photo', !!A.photo)
    box.classList.add('is-on')
    App.audio.sfx('flip', { volume: 0.6 })
    centerBox(box, true)
    if (window.gsap) {
      gsap.fromTo(box, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expo.out' })
      gsap.fromTo(rows.querySelectorAll('.trial-ap-band'), { scaleX: 0 }, { scaleX: 1, duration: 0.55, stagger: 0.08, delay: 0.2, ease: 'expo.out' })
      if (med) gsap.fromTo(med, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.6 })
      const tb = rows.querySelectorAll('.trial-ap-band.is-true')
      if (tb.length) gsap.fromTo(tb, { x: 0, opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.8, ease: 'expo.out', onStart: () => App.audio.sfx('glitch', { volume: 0.35 }) })
    }
    return ask(done => {
      const fin = e => { if (e) e.stopPropagation(); App.audio.sfx('click'); done() }
      close.addEventListener('click', fin)
      S.apClose = () => done()
      // 旁观：看一眼就收起
      let t = null
      if (S.spectate || opts.auto) t = setTimeout(() => done(), S.spectate ? 1700 : 2400)
      return () => {
        clearTimeout(t)
        S.apClose = null
        box.classList.remove('is-on')
        lightTalk()
      }
    })
  }
  // 拾取死者衣袋里的金币：一分钟；金币一枚枚飞进右上角
  async function takeCoins(purse, btn) {
    const c = S.C
    if (!c || Inv.busyCoins) return
    Inv.busyCoins = true
    btn.disabled = true
    const before = S.G.minutes
    const r = TE.takeBodyCoins(S.G, c, S.me)
    if (!r) { Inv.busyCoins = false; App.audio.sfx('wrong', { volume: 0.3 }); return }
    App.econ.gain(r.n, 'pickup')
    syncPurse()
    if (S.autopsy) S.autopsy.coins = 0
    const coins = Array.from(purse.querySelectorAll('i'))
    const to = S.E.top.querySelector('.trial-top-coins').getBoundingClientRect()
    if (window.gsap) {
      coins.forEach((ci, i) => {
        const rc = ci.getBoundingClientRect()
        gsap.to(ci, { x: to.left - rc.left, y: to.top - rc.top, scale: 0.6, opacity: 0, duration: 0.55, delay: i * 0.03, ease: 'power3.in', onComplete: () => { if (i % 3 === 0) App.audio.sfx('coin', { volume: 0.4 }) } })
      })
    }
    await Inv.spendAnim(r.cost, before)
    purse.classList.add('is-empty')
    Inv.busyCoins = false
  }

  // 去向的小标：时刻—时刻 房间（· 在一起的人）
  function alibiTag(room, time, withIds, to) {
    const w = (withIds || []).filter(id => S.G && S.G.people[id])
    return (to ? hhmm(time) + '—' + hhmm(to) : hhmm(time)) + ' ' + room + (w.length ? ' · ' + w.map(callOf).join('、') : '')
  }
  // 两段时间线的全文：21:00—21:40 宴饮厅，和某人在一起｜21:40—22:30 3号套房，独自
  function segText(segs) {
    return (segs || []).map(sg => {
      const w = (sg.with || []).filter(x => S.G && S.G.people[x])
      return hhmm(sg.from) + '—' + hhmm(sg.to) + ' ' + sg.room + (w.length ? '，和' + w.map(callOf).join('、') + '在一起' : '，独自')
    }).join('｜')
  }
  // 两段时间线的小图：按时长分成两截，标出时刻、房间、同伴；落在你框出的时间窗里的那一截亮
  function timelineEl(segs) {
    const box = el('div.trial-tl')
    const a = segs.length ? segs[0].from : 0, b = segs.length ? segs[segs.length - 1].to : 1
    const f = S.frame
    const L = segLight(segs, f)
    segs.forEach((sg, i) => {
      const w = (sg.with || []).filter(x => S.G && S.G.people[x])
      box.appendChild(el('div.trial-tl-seg' + (L[i] ? '.' + L[i] : '') + (w.length ? '' : '.is-alone'), { style: { flexGrow: String(Math.max(1, sg.to - sg.from)) } }, [
        el('i', { text: hhmm(sg.from) }), el('b', { text: sg.room }), w.length ? el('span', { text: w.map(callOf).join('、') }) : el('span.is-none', { text: '—' }),
      ]))
    })
    box.appendChild(el('i.trial-tl-end', { text: hhmm(b) }))
    if (f && b > a) {
      const L = U.clamp((f[0] - a) / (b - a)) * 100, R = U.clamp((f[1] - a) / (b - a)) * 100
      if (R > L) box.appendChild(el('i.trial-tl-frame', { style: { left: L + '%', width: (R - L) + '%' } }))
    }
    return box
  }
  // 证言卡：「这个时段你在哪」的两段（你自己的也算一张）；落在你框出的死亡时间窗里的那段标亮
  function talkCard(id, r) {
    S.talk = S.talk || {}
    if (S.talk[id]) return S.talk[id]
    const segs = r.segs || []
    const rec = addCard({
      id: 'talk:' + id, label: isMe(id) ? '你' : callOf(id), who: id, segs,
      text: segText(segs), predicate: null, icon: 'talk',
    }, { talk: true, rec: !!r.recorded })
    rec.who = id
    rec.recorded = !!r.recorded
    S.talk[id] = rec
    lightTalk()
    return rec
  }
  // 与时间窗相交的那一段标亮（没框就都不亮）
  // 与时间窗重叠得最多的那一段亮；另一段也碰到窗（重叠二十分钟以上）时半亮
  const overlap = (sg, f) => Math.max(0, Math.min(sg.to, f[1]) - Math.max(sg.from, f[0]))
  function segLight(segs, f) {
    if (!f) return segs.map(() => '')
    const ov = segs.map(sg => overlap(sg, f))
    const best = Math.max(...ov)
    return ov.map(o => (best > 0 && o === best ? 'is-lit' : o >= 20 ? 'is-half' : ''))
  }
  function lightTalk() {
    const f = S.frame
    for (const id in S.talk || {}) {
      const rec = S.talk[id]
      const chips = rec.el.querySelectorAll('.trial-card-segs i')
      const L = segLight(rec.item.segs || [], f)
      L.forEach((cls, i) => { if (chips[i]) { chips[i].classList.toggle('is-lit', cls === 'is-lit'); chips[i].classList.toggle('is-half', cls === 'is-half') } })
    }
  }
  function markConflict(k) {
    for (const id of [k.liar, k.witness]) {
      const rec = S.talk && S.talk[id]
      if (!rec) continue
      rec.el.classList.add('is-conflict')
      if (window.gsap) gsap.fromTo(rec.el, { y: -18 }, { y: 0, duration: 0.6, ease: 'bounce.out', clearProps: 'transform' })
    }
    App.audio.sfx('wrong', { volume: 0.35 })
  }

  async function investigate(c) {
    const E = S.E
    await slash(() => {
      setScene('inv')
      mood('inv')
      E.inv.classList.remove('is-low', 'is-over')
      E.inv.querySelector('.trial-inv-room').textContent = c.roomInfo.name
      E.inv.querySelector('.trial-inv-floor').textContent = c.roomInfo.floor
      const vf = E.inv.querySelector('.trial-inv-vface')
      clearFaces(vf)
      vf.appendChild(face(c.victim, { dead: true, eyeRange: 2 }))
      E.inv.querySelector('.trial-inv-victim b').textContent = nameOf(c.victim)
      E.inv.querySelector('.trial-inv-court').textContent = '开庭 ' + hhmm(c.tCourt)
      Inv.bodyGone = false
      Inv.ended = false
      S.tellMarks = new Set()
      S.frame = null
      S.autopsy = null
      S.refKnown = false
      syncPurse()
      Inv.auto = !!(S.spectate || !meAlive())
      E.inv.classList.toggle('is-auto', Inv.auto)
      Inv.setup(c)
      Inv.buildTicks(c.investMinutes)
      Inv.updateTimer()
      Inv.start()
      syncSeats()
    })
    if (window.gsap) {
      gsap.fromTo(E.inv.querySelector('.trial-inv-room'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' })
      gsap.fromTo(E.inv.querySelector('.trial-inv-timer svg'), { rotate: -90, scale: 0.85, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 1.4, ease: 'expo.out' })
    }
    // AI 的秘密能力在调查期发动；条文规定的私人通知送达玩家
    TE.aiInvestigation(S.G, c)
    await flushNotices()
    updateMe()

    const go = E.inv.querySelector('.trial-inv-go')
    go.innerHTML = ''
    Inv.askBtn = null
    const tok = S.token
    if (S.spectate || !meAlive()) {
      // 旁观：侧光自己扫过现场，在场的人轮流细查（尸体、各条痕迹、一处陈设），边看边自言自语
      const body = Inv.spots.filter(x => x.kind === 'body')
      const clues = U.shuffle(Inv.spots.filter(x => x.kind === 'clue'))
      const decoys = Inv.spots.filter(x => x.kind === 'decoy').sort((a, b) => (b.herring ? 1 : 0) - (a.herring ? 1 : 0)).slice(0, 1)
      // 能走动的人先上（不能行走的人也在场，只是排在后面）
      const walks = id => (cantWalk(id) ? 0 : 1)
      let crew = U.shuffle(living().filter(x => x !== c.murderer && x !== S.me)).sort((a, b) => walks(b) - walks(a))
      if (!crew.length) crew = living()
      let i = 0
      for (const sp of body.concat(clues, decoys)) {
        guard(tok)
        if (S.G.minutes >= c.tCourt) break
        const [x, y] = Inv.P(sp.u, sp.v)
        // 要侧光才看得见的痕迹：调查的人压低光，贴着地面扫过去
        Inv.autoPress = !!sp.raking
        if (sp.raking) { Inv.light.tx = x - 60; Inv.light.ty = y; await wait(260); }
        Inv.light.tx = x; Inv.light.ty = y; Inv.light.tapAt = performance.now()
        await wait(sp.raking ? 620 : 420)
        while (Inv.busy) await wait(100, false)
        await hold(tok)
        Inv.autoPress = false
        await Inv.onSpot(sp, crew[i++ % crew.length])
      }
      for (const sp of Inv.spots) {
        if (sp.done) continue
        guard(tok)
        const [x, y] = Inv.P(sp.u, sp.v)
        Inv.light.tx = x; Inv.light.ty = y; Inv.light.tapAt = performance.now()
        await wait(380)
      }
      S.G.minutes = c.tCourt
      Inv.updateTimer()
    } else {
      // 你自己这个时段在哪：一张证言卡
      const mine = c.where && c.where[S.me]
      if (mine) talkCard(S.me, { segs: TE.claimSegs(S.G, c, S.me) })
      // 手边已有录音笔：这一案的询问照样录下
      if (haveItem('recorder')) TE.useTool(S.G, c, 'recorder')
      Inv.renderTools()
      const how = await ask(done => {
        S.invDone = done
        const q = button('询问', '', 'interview')
        q.addEventListener('click', e => { e.stopPropagation(); App.audio.sfx('click'); Inv.interview() })
        Inv.askBtn = q
        Inv.updateGo()
        // 默念：兑换工具（时间停着）
        const mm = button('默念', '', 'murmur')
        mm.prepend(el('i.trial-mm-btn-ico', { html: icon('look') }))
        mm.addEventListener('click', e => { e.stopPropagation(); App.audio.sfx('click'); Inv.murmur() })
        const b = button('开庭', 'btn--blood', 'court')
        b.addEventListener('click', e => { e.stopPropagation(); done('go') })
        go.append(q, mm, b)
        let acc = 0, last = performance.now()
        let warned = false
        const off = App.tick(() => {
          const now = performance.now()
          const dtm = now - last
          last = now
          if (S.paused || Inv.busy || abilityBusy) return
          acc += dtm
          if (acc >= 1400) {
            acc -= 1400
            const left = TE.spend(S.G, c, 1)
            Inv.updateTimer()
            Inv.updateGo()
            if (left <= 15 && left > 0) App.audio.sfx(left <= 5 ? 'heartbeat' : 'tick', { volume: 0.5 })
            if (left <= 15 && !warned) { warned = true; tension(0.85) }
            if (left <= 0) done('time')
          }
          if (S.G.minutes >= c.tCourt && !Inv.busy) done('time')
        })
        return () => { off(); go.innerHTML = ''; Inv.askBtn = null; S.invDone = null }
      })
      if (how === 'exit') {
        // 持券离馆：调查到此为止，其余的人照常开庭（你可以旁观）
        Inv.ended = true
        Inv.renderTools()
        const v = await leaveMansion()
        if (v === 'restart') { setTimeout(hardReset, 0); throw ABORT }
        if (S.G.minutes < c.tCourt) S.G.minutes = c.tCourt
        return
      }
    }
    // 届满：主持人移走尸体
    Inv.ended = true
    S.G.minutes = Math.max(S.G.minutes, c.tCourt)
    Inv.updateTimer()
    App.audio.sfx('chime')
    E.inv.classList.add('is-over')
    Inv.bodyGone = true
    Inv.drawPlan()
    await wait(900)
  }

  /* ==========================================================
     庭审
     ========================================================== */
  async function court(c) {
    const E = S.E
    const G = S.G
    await slash(() => {
      Inv.stop()
      setScene('court')
      mood('court')
      tension(0.45)
      resetSeatStates()
      syncSeats()
      for (const id of S.tellMarks || []) seatTell(id)
      hideSay()
      S.E.ui.innerHTML = ''
      S.E.mood.textContent = nameOf(c.victim)
      S.E.count.innerHTML = '<b>' + U.roman(c.no) + '</b>'
    })
    const opened = TE.courtOpen(G, c)
    // 他人找到的证物，从他的席位飞进证物栏
    for (const k of opened.shared) {
      const p = seatCenter(seatOf(k.foundBy))
      addCard({ id: k.id, label: k.label, text: k.text, predicate: k.predicate, icon: k.tpl, dim: k.dim, visible: k.visible, shift: k.shift || null }, { by: k.foundBy, from: p })
      await wait(260)
    }
    if (opened.body) {
      const p = seatCenter(seatOf(opened.body.by))
      addCard({ id: 'body', label: c.cause.name, text: c.cause.sign + '。' + opened.body.stage + '。', predicate: c.cause.needs || null, icon: 'body', dim: c.cause.needs ? c.cause.glyph || null : null, visible: c.cause.visible }, { by: opened.body.by, from: p })
      await wait(260)
    }
    // 没亲手验尸：发现者转述的三格读数（听说），你仍可以在刻度上框出时间窗
    if (!S.autopsy && c.tDiscover != null) {
      const at = c.tDiscover + 10
      S.autopsy = { readings: TE.bodyReadings(G, c, at), ruler: [Math.floor((at - 540) / 60) * 60, at], window: null, causeName: c.cause.name, obs: c.cause.sign + '。', coins: 0, at, by: c.discoverer }
    }
    // 卡片多了：重排推理笔记
    renderAllPips()
    const T = TE.openTrial(G, c)
    S.T = T
    S.phase = 'debate'
    updateTop()
    const it = TE.trialFlow(G, T)
    let input
    let result = null
    let n = 0
    while (n++ < 3000) {
      const step = it.next(input)
      input = undefined
      if (step.done) break
      const ev = step.value
      updateTop()
      input = await renderEvent(ev, T, c)
      if (input === 'restart') return 'restart'
      if (ev.type === 'end') result = ev
    }
    hideSay()
    hideHand()
    clearLines(null)
    disarm()
    S.discuss = false
    if (S.claimChip) { S.claimChip.remove(); S.claimChip = null }
    S.phase = null
    updateMe()
    const pay = TE.closeTrial(G, T)
    S.T = null
    S.V = null
    void result
    return pay
  }

  async function renderEvent(ev, T, c) {
    const G = S.G
    if (S.discuss) refreshHand()
    switch (ev.type) {
      case 'open': {
        // 从开庭到这一场结束，议事厅的门关着，打不开（主持人游戏 3.1）：南、西、东三道门依次合上、扣死
        await shutDoors()
        await stamp('开庭', { hold: 1000 })
        // 在座者依次亮起
        for (const id of TE.livingIds(G)) {
          const k = seatOf(id)
          S.seat[k].root.classList.add('is-lit')
          setTimeout(() => S.seat[k] && S.seat[k].root.classList.remove('is-lit'), 500)
          await wait(45, false)
        }
        return
      }
      case 'turn':
        S.phase = 'debate'
        updateMe()
        spotlight(ev.speaker)
        return
      case 'speech': {
        // 一般看法；或谈自己找到的线索（线索名一闪）
        if (ev.mode === 'clue' && ev.clue) {
          focusActor(ev.speaker)
          await proof(ev.speaker, ev.clue, null)
          await say(ev.speaker, line(ev.speaker, 'found', { CLUE: ev.clue.name }))
        } else await say(ev.speaker, line(ev.speaker, 'statement'))
        return
      }
      case 'accuse': {
        drawLine(ev.speaker, ev.target, { cls: 'is-accuse', kind: 'accuse', dur: 0.35 })
        App.audio.sfx('slash', { volume: 0.5 })
        shakeSeat(ev.target)
        // 手里有相符的证据：先出示，再指认（上一位的台词先收起）；凶手的误导拿现场的一处陈设说事（虚边的「证据」）
        if (ev.clue) { focusActor(ev.speaker); await proof(ev.speaker, ev.clue, ev.target) }
        else if (ev.claim) { focusActor(ev.speaker); S.claimChip = await proof(ev.speaker, { label: ev.claim.label, tpl: 'look', claim: true }, null, { keep: true }) }
        const cl = ev.clue ? ev.clue.name : ev.claim ? ev.claim.label : null
        const text = cl ? line(ev.speaker, 'accuseClue', { X: callOf(ev.target), CLUE: cl }, toX(ev.target)) : line(ev.speaker, 'accuse', { X: callOf(ev.target) }, toX(ev.target))
        await say(ev.speaker, text, { tone: 'accuse' })
        // 这一处你细查过：举手的手势亮一下
        if (ev.claim && ev.claim.playerSaw && S.E.hand) pulseHand()
        return
      }
      case 'present': {
        // 当众出示：证物卡飞到桌心、盖章，射向被出示的人；照片连同你框出的时间窗
        drawLine(ev.speaker, ev.target || ev.speaker, { cls: 'is-accuse is-present', kind: 'accuse', dur: 0.32 })
        focusActor(ev.speaker)
        await proof(ev.speaker, ev.clue, ev.target)
        const tx = ev.target ? line(ev.speaker, 'accuseClue', { X: callOf(ev.target), CLUE: ev.clue.name }, toX(ev.target)) : line(ev.speaker, 'found', { CLUE: ev.clue.name })
        await say(ev.speaker, tx, { tone: 'accuse', tag: ev.clue.label })
        return
      }
      case 'rebut': {
        // 不相符：他拿出反证——看得见的特征当场可见（档案里那一项）；看不见的只是他自己的说法（听说）
        const ch = charOf(ev.speaker)
        const chip = rebutChip(ev, ch)
        const pool = linePool(ev.speaker, 'rebut').length ? 'rebut' : 'defend'
        await say(ev.speaker, line(ev.speaker, pool, { X: callOf(ev.against) }, toX(ev.against)), { tone: 'defend', tag: '' })
        if (chip) setTimeout(() => chip.remove(), 400)
        markNote(ev.speaker, ev.clue && ev.clue.id, 'no')
        clearLines('accuse')
        return
      }
      case 'reframe': {
        // 识破假窗口：大家改按真正的死亡时刻对去向（或按照片与你框出的时间窗）
        await reframeAnim(ev)
        if (ev.shift) S.refKnown = true
        return
      }
      case 'question': {
        // 追问去向：一条虚线 + 问号
        drawLine(ev.speaker, ev.target, { cls: 'is-doubt is-question', kind: 'accuse', dur: 0.3, dot: 3 })
        const k = seatOf(ev.speaker)
        if (k) seatMark(ev.speaker, ASK_MARK, 'is-ask')
        App.audio.sfx('tick', { volume: 0.5 })
        shakeSeat(ev.target)
        await wait(S.spectate ? 380 : 520)
        if (k) S.seat[k].mark.querySelectorAll('.is-ask').forEach(m => m.remove())
        return
      }
      case 'confront': {
        // 对质：两张证言卡撞在桌心；对得上矛盾就裂开
        await confrontAnim(ev)
        return
      }
      case 'refute': {
        // 拿排除性事实驳回误导的「证据」：那张卡飞到桌心压住它
        if (ev.ok) {
          const rec = S.cards.find(r => r.item.spot === (ev.claim && ev.claim.spot))
          focusActor(ev.speaker)
          if (rec && isMe(ev.speaker)) await proof(ev.speaker, { id: rec.item.id, label: rec.item.label, tpl: 'look' }, null)
          if (S.claimChip) { S.claimChip.classList.add('is-struck'); const cc = S.claimChip; S.claimChip = null; setTimeout(() => cc.remove(), 900) }
          await stamp('矛盾', { hold: 650, sfx: 'glitch' })
          await say(ev.speaker, line(ev.speaker, 'doubt', { X: callOf(ev.target) }, toX(ev.target)), { tone: 'accuse' })
          seatMark(ev.target, LIE_MARK, 'is-lie')
        } else {
          App.audio.sfx('wrong', { volume: 0.4 })
          shakeSeat(ev.speaker)
          await wait(500)
        }
        return
      }
      case 'discuss': {
        // 第二段：公开讨论。桌心盖章，举手的手势出现
        S.discuss = true
        clearLines('accuse')
        hideSay()
        await stamp('讨论', { hold: 700 })
        showHand()
        return
      }
      case 'ask-interject': return await interjectUI(ev)
      case 'interject': {
        // 旁人插话：附议（细线连向被指认者）或质疑（虚线连向指认者），气泡一闪而过
        const agree = ev.stance === 'agree'
        drawLine(ev.speaker, agree ? ev.target : ev.accuser, { cls: agree ? 'is-agree' : 'is-doubt', kind: 'accuse', dur: 0.25, dot: 3 })
        quipSeat(ev.speaker, line(ev.speaker, ev.stance, { X: callOf(ev.target) }, toX(ev.target)), { tone: ev.stance })
        App.audio.sfx(agree ? 'tick' : 'glitch', { volume: agree ? 0.5 : 0.25 })
        await wait(S.spectate ? 360 : 460)
        return
      }
      case 'defend':
        await say(ev.speaker, line(ev.speaker, 'defend'), { tone: 'defend', tell: ev.tell })
        // 被出示的证物与他相符：他只能辩解——证物的小图标贴在他的席位上
        if (ev.present && ev.clue) { seatMark(ev.speaker, icon(ev.clue.tpl), 'is-match'); markNote(ev.speaker, ev.clue.id, 'ok') }
        clearLines('accuse')
        return
      case 'counter': {
        // 反咬：一条反向的线
        drawLine(ev.speaker, ev.target, { cls: 'is-accuse is-counter', kind: 'accuse', dur: 0.3, bend: -0.16 })
        App.audio.sfx('slash', { volume: 0.45 })
        shakeSeat(ev.target)
        await say(ev.speaker, line(ev.speaker, 'counter', { X: callOf(ev.target) }, toX(ev.target)), { tone: 'counter', tell: ev.tell })
        clearLines('accuse')
        return
      }
      case 'alibi': {
        const text = line(ev.speaker, 'alibi', { ROOM: ev.room, TIME: hhmm(ev.time) })
        await say(ev.speaker, text, { tone: ev.response ? 'defend' : null, tag: alibiTag(ev.room, ev.time, ev.with, ev.to), tell: ev.tell })
        if (ev.response) clearLines('accuse')
        return
      }
      case 'expose': {
        // 当众拆穿：那个时刻真在那间房里的人站出来
        drawLine(ev.speaker, ev.target, { cls: 'is-accuse', kind: 'accuse', dur: 0.3 })
        shakeSeat(ev.target)
        await stamp('矛盾', { hold: 650, sfx: 'glitch' })
        await say(ev.speaker, line(ev.speaker, 'alibi', { ROOM: ev.truth || ev.room, TIME: hhmm(ev.time) }), { tone: 'accuse', tag: alibiTag(ev.truth || ev.room, ev.time, null, ev.to) })
        seatMark(ev.target, LIE_MARK, 'is-lie')
        if (S.talk) markConflict({ liar: ev.target, witness: ev.speaker })
        clearLines('accuse')
        return
      }
      case 'silent':
        await say(ev.speaker, line(ev.speaker, 'silent'), { hold: 520 })
        return
      case 'tell': {
        // 被当面戳穿、看见自己的痕迹被人谈起：只有察觉到的人看得见
        if (!tellShown(ev)) return
        const k = seatOf(ev.holder)
        shakeSeat(ev.holder)
        if (k) tellJolt(S.seat[k].pt)
        quipSeat(ev.holder, '……', { tone: 'tell', life: 1.6 })
        markTell(ev.holder)
        await wait(S.spectate ? 450 : 650)
        return
      }
      case 'ask-respond': {
        // 你被指认了：辩解、反咬，或交代去向
        turnBox()
        App.audio.sfx('heartbeat', { volume: 0.6 })
        const items = [{ label: '辩解', value: { kind: 'defend' } }, { label: '反咬', value: { kind: 'counter' }, tone: 'blood' }]
        if (ev.canAlibi) items.push({ label: '不在场证明', value: { kind: 'alibi' } })
        return await choose(items)
      }
      case 'ask-debate': {
        // 轮到你：指认一人，或沉默、交代去向；也可以先发动能力
        turnBox()
        App.audio.sfx('heartbeat', { volume: 0.5 })
        updateMe()
        const v = await ask(done => {
          S.debateResolve = done
          const pick = pickSeat(x => TE.isLiving(G, x) && x !== S.me, '指认')
          pick.then(id => { if (id) done({ kind: 'accuse', target: id }) }).catch(() => {})
          S.E.ask.innerHTML = ''
          // 出示：拿起一张证物、点一个人（算你这一次发言）；每场三次
          if (ev.presentLeft > 0 && S.cards.some(presentable)) {
            S.presentArm = { ok: x => TE.isLiving(G, x) && x !== S.me, done: (rec, id) => done({ kind: 'present', clue: rec.item.id, target: id, frame: S.frame }) }
            S.E.ask.appendChild(presentButton(ev.presentLeft))
          }
          const b = button('沉默', '', 'silent')
          b.addEventListener('click', e => { e.stopPropagation(); done({ kind: 'silent' }) })
          S.E.ask.appendChild(b)
          if (ev.canAlibi) {
            const a = button('不在场证明', '', 'alibi')
            a.addEventListener('click', e => { e.stopPropagation(); done({ kind: 'alibi' }) })
            S.E.ask.appendChild(a)
          }
          S.E.ask.classList.add('is-on')
          refreshTargets()
          return () => {
            S.debateResolve = null
            S.presentArm = null
            disarm()
            S.E.ask.innerHTML = ''
            S.E.ask.classList.remove('is-on')
            pick.kill()
          }
        })
        return v
      }
      case 'knight': {
        focusActor(ev.actor)
        await banner('骑士', ev.actor)
        drawLine(ev.actor, ev.target, { cls: 'is-accuse', kind: 'accuse' })
        shakeSeat(ev.target)
        if (ev.silenced) { await say(ev.actor, '……', { hold: 900 }); clearLines('accuse'); return }
        if (ev.success) {
          await broadcast(bcPart('骑士揭发', 0, { 某某: callOf(ev.target) }), { sfx: 'correct' })
          seatMark(ev.target, '!', 'is-known')
        } else {
          await broadcast(bcPart('骑士揭发', 1), { sfx: 'wrong' })
        }
        clearLines('accuse')
        syncSeats()
        return
      }
      case 'executor':
        S.phase = 'special'
        updateMe()
        focusActor(ev.actor)
        await banner('执行者', ev.actor)
        drawLine(ev.actor, ev.target, { cls: 'is-accuse', kind: 'accuse' })
        if (ev.silenced) { await say(ev.actor, '……', { hold: 900 }); clearLines('accuse'); S.phase = 'debate'; return }
        await wait(400)
        return
      case 'secret': {
        if (ev.actor !== S.me) return
        if (ev.ability === 'silencer') seatMark(ev.target, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>', 'is-lock')
        if (ev.ability === 'puffer') {
          const id = G.seats[ev.seat - 1]
          const r = seatMark(id, ev.void ? '?' : ev.yes ? '有' : '没有', 'is-puffer' + (ev.yes ? '.is-yes' : ''))
          App.audio.sfx(ev.yes ? 'heartbeat' : 'drop')
          void r
        }
        await wait(500)
        return
      }
      case 'debate-end':
        killPicks()
        hideHand()
        S.discuss = false
        if (S.claimChip) { S.claimChip.remove(); S.claimChip = null }
        hideSay()
        clearLines(null)
        S.phase = 'vote'
        updateMe()
        tension(1)
        S.stage.classList.add('is-vote')
        await broadcast(bcText('主持人只以【】喊停辩论') || '辩论结束，开始投票。')
        return
      case 'vote-begin': {
        const V = ev.vote
        S.V = V
        S.phase = V.kind === 'special' ? 'special' : 'vote'
        S.stage.classList.add('is-vote')
        tension(1)
        for (let k = 1; k <= 15; k++) setCount(k, 0, true)
        clearLines('vote', false)
        for (let k = 1; k <= 15; k++) S.seat[k].mark.querySelectorAll('.is-judge').forEach(m => m.remove())
        seatClass('is-banned', V.banned || [])
        seatClass('is-hope', V.hopeBan ? [V.hopeBan] : [])
        syncSeats()
        hideSay()
        updateMe()
        // 没有人能投（两人终局并列后的重投）：不盖章，直接到结果
        if (V.empty) return
        await stamp(V.kind === 'special' ? '表决' : V.round > 1 ? '重投' : '投票', { hold: 700 })
        if (V.kind === 'special') {
          const k = seatOf(V.target)
          S.seat[k].root.classList.add('is-pending')
        }
        return
      }
      case 'ask-vote': {
        const V = ev.vote
        S.E.me.classList.remove('is-open')
        spotlight(S.me)
        S.seat[seatOf(S.me)].root.classList.add('is-voter')
        if (ev.forced) {
          drawLine(S.me, (G.people[S.me].lover), { cls: 'is-thread', kind: 'thread', bend: 0.05 })
          await wait(1100)
          clearLines('thread')
          S.seat[seatOf(S.me)].root.classList.remove('is-voter')
          return ev.forced
        }
        updateMe()
        const v = await ask(done => {
          const pick = pickSeat(x => V.targets.includes(x) || x === S.me, '投票')
          pick.then(id => { if (id) done(id) }).catch(() => {})
          const b = button('弃票', '', 'abstain')
          b.addEventListener('click', e => { e.stopPropagation(); done(null) })
          S.E.ask.innerHTML = ''
          S.E.ask.appendChild(b)
          S.E.ask.classList.add('is-on')
          return () => {
            S.E.ask.innerHTML = ''
            S.E.ask.classList.remove('is-on')
            pick.kill()
          }
        })
        S.seat[seatOf(S.me)].root.classList.remove('is-voter')
        return v
      }
      case 'ballot': {
        const b = ev.ballot
        const V = ev.vote
        const vk = seatOf(b.voter)
        spotlight(null)
        S.seat[vk].root.classList.add('is-voter')
        if (b.target) {
          const counted = V.kind !== 'special' || b.target === V.target
          drawLine(b.voter, b.target, { cls: (counted ? '' : 'is-void') + (b.forced ? ' is-thread' : ''), kind: 'vote', dur: S.spectate ? 0.25 : 0.32 })
          App.audio.sfx('vote')
          if (counted) bumpCount(b.target)
          if (isMe(b.target)) updateMe()
          // 投票时挑几个人说一句（不是每张票都说）
          V.quips = V.quips || 0
          if (!b.abstain && b.target !== b.voter && V.quips < 3 && (V.ballots.length === 1 || Math.random() < 0.3)) {
            V.quips++
            quipSeat(b.voter, line(b.voter, 'vote', { X: callOf(b.target) }, toX(b.target)), { tone: 'vote', life: 1.9 })
          }
        }
        await wait(S.spectate ? 300 : isMe(b.voter) ? 300 : 520)
        S.seat[vk].root.classList.remove('is-voter')
        return
      }
      case 'vote-window': {
        updateMe()
        if (!myAbility() && !abilityBusy) return
        S.E.me.classList.add('is-window')
        App.audio.sfx('heartbeat', { volume: 0.5 })
        await wait(2600)
        let n = 0
        while (abilityBusy && n++ < 80) await wait(150, false)
        S.E.me.classList.remove('is-window')
        return
      }
      case 'settle': {
        const r = ev.result
        S.V = null
        S.phase = 'settle'
        killPicks()
        updateMe()
        if (ev.vote.empty) return
        App.glitch(S.E.core, 0.3)
        await reel(r.outcome === 'unique' ? r.pending : null, ev.vote.targets)
        clearLines('vote')
        return
      }
      case 'special-result': {
        const r = ev.result
        S.V = null
        const k = seatOf(ev.vote.target)
        if (r.outcome === 'pass') {
          App.audio.sfx('stamp')
          await stamp(r.count + ' / ' + r.total, { hold: 900 })
        } else {
          App.audio.sfx('wrong', { volume: 0.5 })
          await stamp(r.count + ' / ' + r.total, { hold: 900, cls: 'is-fail' })
          S.seat[k].root.classList.remove('is-pending')
          for (let i = 1; i <= 15; i++) setCount(i, 0, true)
          clearLines(null)
          S.stage.classList.remove('is-vote')
          S.phase = 'debate'
          tension(0.5)
        }
        return
      }
      case 'noresult': {
        S.seat.forEach(s => s && s.root.classList.remove('is-pending'))
        const res = ev.vote && ev.vote.result
        const tied = res && res.tie ? res.top.filter(id => TE.isLiving(G, id)) : []
        if (tied.length) {
          // 并列：并列者一同闪红，桌心盖章
          seatClass('is-tie', tied)
          for (const id of tied) shakeSeat(id)
          await stamp('并列', { hold: 800, sfx: 'glitch' })
          seatClass('is-tie', [], false)
        }
        if (ev.ended) {
          await broadcast(bcPart('未产生唯一结果', 1), { sfx: 'wrong' })
          S.stage.classList.remove('is-vote')
        } else {
          await broadcast(bcPart('未产生唯一结果', 0))
          // 并列者在紧接着的重投里不能投票：锁扣上
          if ((ev.banned || []).length) {
            seatClass('is-banned', ev.banned)
            App.audio.sfx('door', { volume: 0.5 })
            await wait(500)
          }
        }
        return
      }
      case 'pending': {
        const k = seatOf(ev.pending)
        S.seat.forEach(s => s && s.root.classList.remove('is-pending'))
        S.seat[k].root.classList.add('is-pending')
        App.audio.sfx('heartbeat')
        App.bg && App.bg.pulse(0.5)
        await wait(400)
        return
      }
      case 'ask-idiot': {
        await say(S.me, '……', { hold: 200 })
        // 身份卡亮起：这个选择来自你手里的牌
        S.E.me.classList.add('is-choice')
        const v = await choose([{ label: '发动', value: true, tone: 'blood' }, { label: '放弃', value: false }])
        S.E.me.classList.remove('is-choice')
        return v
      }
      case 'idiot': {
        focusActor(ev.holder)
        await banner('白痴', ev.holder)
        if (ev.effect === 'cancel') {
          await broadcast(bcPart('白痴发动', 0, { 某某: callOf(ev.holder) }))
          S.seat[seatOf(ev.holder)].root.classList.remove('is-pending')
          syncSeats()
          for (let i = 1; i <= 15; i++) setCount(i, 0, true)
        } else if (ev.effect === 'fail') {
          await broadcast(bcPart('白痴发动', 1, { 某某: callOf(ev.holder) }), { sfx: 'wrong' })
          seatMark(ev.holder, '!', 'is-known')
        } else await say(ev.holder, '……', { hold: 700 })
        return
      }
      case 'ask-hope': {
        await stampFace(ev.pending)
        S.E.me.classList.add('is-choice')
        const v = await choose([{ label: '撤销', value: true, tone: 'blood' }, { label: '放弃', value: false }])
        S.E.me.classList.remove('is-choice')
        return v
      }
      case 'hope': {
        focusActor(ev.holder)
        await banner('身怀希望之人', ev.holder)
        if (ev.effect === 'cancel') {
          S.seat[seatOf(ev.pending)].root.classList.remove('is-pending')
          seatClass('is-hope', [ev.pending])
          for (let i = 1; i <= 15; i++) setCount(i, 0, true)
        } else await say(ev.holder, '……', { hold: 700 })
        return
      }
      case 'last-words':
        await say(ev.speaker, line(ev.speaker, 'executed'), { tone: 'exec', hold: 1300 })
        return
      case 'verdict': {
        hideSay()
        const vic = callOf(c.victim)
        if (ev.correct) {
          await broadcast(bcText('判定正确', { 某某: callOf(ev.pending), 死者: vic }), { sfx: 'correct' })
          const r = await execute(ev.executed, { correct: true })
          if (r === 'restart') return 'restart'
        } else {
          const r = await execute(ev.executed, { correct: false })
          if (r === 'restart') return 'restart'
          await broadcast(bcText('误判', { 某某: callOf(ev.pending), 死者: vic, '一／二': NUM[ev.misjudge] || '一' }), { sfx: 'wrong' })
        }
        // 公布之后：一两个人的反应
        const vs = pickVoices(TE.livingIds(G).filter(x => !ev.executed.includes(x)), U.randInt(1, 2))
        for (const id of vs) { quipSeat(id, line(id, ev.correct ? 'right' : 'wrong', { X: callOf(ev.pending) }, toX(ev.pending)), { tone: ev.correct ? 'right' : 'wrong', life: 2.6 }); await wait(520) }
        if (vs.length) await wait(900)
        S.seat.forEach(s => s && s.root.classList.remove('is-pending'))
        for (let i = 1; i <= 15; i++) setCount(i, 0, true)
        syncSeats()
        return
      }
      case 'end':
        S.stage.classList.remove('is-vote')
        tension(0.3)
        return
      default:
        return
    }
  }
  // 议事厅的三道门（南、西、东）：开庭时合上、扣死，整场都在圆桌外暗着
  const DOOR_SVG = '<svg viewBox="0 0 40 52" aria-hidden="true"><path class="trial-door-frame" d="M4 51V5h32v46"/><rect class="trial-door-leaf" x="7" y="8" width="26" height="43"/><circle class="trial-door-knob" cx="28" cy="31" r="1.6"/><g class="trial-door-lock"><path d="M15.5 25v-3a4.5 4.5 0 0 1 9 0v3"/><rect x="13" y="25" width="14" height="10" rx="1.5"/></g></svg>'
  async function shutDoors() {
    const g = S.geo
    if (!g) return
    let box = S.E.doors
    if (!box) { box = S.E.doors = el('div.trial-doors'); S.E.ring.appendChild(box) }
    box.innerHTML = ''
    const pts = [
      { k: 's', x: g.cx, y: Math.min(g.H - g.bottom + 8, g.cy + g.ry + g.sh * 0.95) },
      { k: 'w', x: Math.max(22, g.cx - g.rx - g.sw * (g.mobile ? 0.2 : 1.05)), y: g.cy },
      { k: 'e', x: Math.min(g.W - 22, g.cx + g.rx + g.sw * (g.mobile ? 0.2 : 1.05)), y: g.cy },
    ]
    const doors = pts.map(p => {
      const d = el('i.trial-door.is-' + p.k, { html: DOOR_SVG })
      d.style.left = p.x + 'px'
      d.style.top = p.y + 'px'
      box.appendChild(d)
      return d
    })
    box.classList.add('is-on')
    if (!window.gsap) { doors.forEach(d => d.classList.add('is-shut')); return }
    for (const d of doors) {
      gsap.fromTo(d.querySelector('.trial-door-leaf'), { scaleX: 0.12 }, { scaleX: 1, duration: 0.32, ease: 'power4.in', onComplete: () => { d.classList.add('is-shut'); App.audio.sfx('door', { volume: 0.45 }); App.shake(S.stage, 3, 0.15) } })
      gsap.fromTo(d, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'expo.out' })
      await wait(S.spectate ? 220 : 300, false)
    }
    await wait(380, false)
    box.classList.add('is-dim')
  }
  function clearDoors() { if (S.E.doors) { S.E.doors.classList.remove('is-on', 'is-dim'); S.E.doors.innerHTML = '' } }
  const LIE_MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 5h16v10H10l-4 4v-4H4z"/><path d="M6 3l12 16"/></svg>'
  // 轮到你：桌心是你的脸，台词处留一个光标
  function turnBox() {
    S.E.me.classList.remove('is-open')
    spotlight(S.me)
    const box = S.E.say
    const fc = box.querySelector('.trial-say-face')
    if (sayFaceId !== S.me) { clearFaces(fc); fc.appendChild(face(S.me, { eyeRange: 8 })); sayFaceId = S.me }
    box.querySelector('.trial-say-name b').textContent = nameOf(S.me)
    box.querySelector('.trial-say-name span').textContent = U.roman(seatOf(S.me))
    box.querySelector('.trial-say-line').textContent = ''
    box.querySelector('.trial-say-tag').textContent = ''
    box.className = 'trial-say is-on is-me is-turn'
  }
  // 公开发动能力的人：上一位发言者的台词收起，聚光转到发动者身上
  function focusActor(id) {
    if (sayFaceId !== id || !S.E.say.classList.contains('is-on')) hideSay()
    spotlight(id)
  }
  async function stampFace(id) {
    spotlight(id)
    App.audio.sfx('heartbeat', { volume: 0.6 })
    await wait(300)
  }

  /* ---------- 当众出示、公开讨论的小件 ---------- */
  // 「出示」按钮：三颗小点是这一场还能出示几次；按下去，能出示的证物呼吸，拿起一张再点人
  function presentButton(left) {
    const b = button('出示', 'btn--blood', 'present')
    const dots = el('i.trial-btn-dots')
    for (let i = 0; i < TE.PRESENT_MAX; i++) dots.appendChild(el('b' + (i < left ? '.is-on' : '')))
    b.appendChild(dots)
    b.addEventListener('click', e => {
      e.stopPropagation()
      App.audio.sfx('click')
      S.E.bar.classList.add('is-picking')
      for (const r of S.cards) r.el.classList.toggle('is-pickable', presentable(r))
      setTimeout(() => { S.E.bar.classList.remove('is-picking'); for (const r of S.cards) r.el.classList.remove('is-pickable') }, 2600)
    })
    return b
  }
  function armCard(rec) {
    disarm()
    S.armed = rec
    rec.el.classList.add('is-armed')
    S.stage.classList.add('is-armed')
    showTip(rec)
    App.audio.sfx('whoosh', { volume: 0.5 })
    refreshTargets()
  }
  // 当众的结果写进你的笔记（相符 / 不符），省得再记
  function markNote(id, clueId, v) {
    if (!id || !clueId || !S.cards.some(r => r.item.id === clueId && notable(r))) return
    ;(S.notes[id] || (S.notes[id] = {}))[clueId] = v
    renderPips(id)
  }
  // 反证：看得见的特征（档案里那一项）亮出来；看不见的只是他的说法——画成一只对话框（听说）
  function rebutChip(ev, ch) {
    const at = seatQuipAt(ev.speaker)
    if (!at || !S.E.quips) return null
    const vis = !!ev.visible
    const chip = el('div.trial-rebut' + (vis ? '' : '.is-hearsay'), null, [
      el('i.trial-rebut-dim', { html: dimIcon(ev.dim || 'items') }),
      vis ? el('b', { text: featureOf(ev.dim, ch) }) : el('i.trial-rebut-say', { html: HEARSAY_ICON }),
      el('i.trial-rebut-x'),
    ])
    S.E.quips.appendChild(chip)
    const g = S.geo
    const w = chip.offsetWidth, h = chip.offsetHeight
    chip.style.left = U.clamp(at.x - w / 2, 8, g.W - w - 8) + 'px'
    chip.style.top = U.clamp(at.y - h - 40, 64, g.H - h - 8) + 'px'
    App.audio.sfx('flip', { volume: 0.5 })
    if (window.gsap) gsap.fromTo(chip, { scale: 0.5, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.4, ease: 'back.out(2.4)' })
    return chip
  }
  // 识破假窗口：旧的时刻划掉，箭头指向新的时刻
  async function reframeAnim(ev) {
    const box = el('div.trial-reframe' + (ev.shift ? '.is-shift' : ''), null, [
      el('i.trial-reframe-ico', { html: dimIcon('time') }), el('s', { text: hhmm(ev.from) }), el('i.trial-reframe-arrow'), el('b', { text: hhmm(ev.time) }),
    ])
    S.E.core.appendChild(box)
    App.audio.sfx('glitch', { volume: 0.45 })
    App.shake(S.stage, 5, 0.25)
    if (window.gsap) {
      gsap.fromTo(box, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'expo.out' })
      gsap.fromTo(box.querySelector('b'), { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, delay: 0.45, ease: 'expo.out', onStart: () => App.audio.sfx('stamp', { volume: 0.5 }) })
    }
    await wait(S.spectate ? 1000 : 1500)
    if (window.gsap) gsap.to(box, { opacity: 0, y: -12, duration: 0.35, onComplete: () => box.remove() })
    else box.remove()
  }
  // 对质：两张证言卡从证物栏飞到桌心，撞在一起；对得上矛盾就裂开（随后是当众拆穿），对不上就弹开
  function talkChip(id) {
    const rec = S.talk && S.talk[id]
    const chip = el('div.trial-proof.is-talk', null, [el('span.trial-proof-ico', { html: icon('talk') }), el('b', { text: isMe(id) ? '你' : callOf(id) }),
      rec ? el('span.trial-proof-segs', null, (rec.item.segs || []).map(sg => el('i', { text: sg.room }))) : null])
    S.E.quips.appendChild(chip)
    return { chip, rec }
  }
  function flyPair(idx, id) {
    const g = S.geo
    const { chip, rec } = talkChip(id)
    // 桌面：左右各一张；手机：上下各一张（并排放不下）
    const half = (chip.offsetWidth || 220) / 2
    const to = g.mobile ? { x: g.cx, y: g.cy - 70 + (idx ? 30 : -30) } : { x: g.cx + (idx ? 1 : -1) * Math.min(g.W * 0.45 - half, half + 14), y: g.cy - Math.min(120, g.ry * 0.5) }
    chip.style.left = to.x + 'px'
    chip.style.top = to.y + 'px'
    if (rec && window.gsap) {
      const sr = S.stage.getBoundingClientRect(), r = rec.el.getBoundingClientRect()
      gsap.fromTo(chip, { x: r.left - sr.left + r.width / 2 - to.x, y: r.top - sr.top + r.height / 2 - to.y, scale: 0.5, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'expo.out' })
    }
    App.audio.sfx('card')
    return chip
  }
  async function confrontAnim(ev) {
    const pair = S.pairChips && S.pairChips.length === 2 ? S.pairChips : [flyPair(0, ev.a), flyPair(1, ev.b)]
    S.pairChips = null
    focusActor(ev.speaker)
    await wait(350)
    if (ev.recorded) {
      // 放录音：磁带转起来，波形一闪
      const tape = el('div.trial-tape', { html: TAPE_ICON + '<i></i><i></i><i></i><i></i><i></i>' })
      S.E.core.appendChild(tape)
      App.audio.sfx('tick', { volume: 0.5 })
      await wait(S.spectate ? 600 : 1000)
      tape.remove()
    }
    const mob = S.geo && S.geo.mobile
    if (window.gsap) await anim(r => gsap.to(pair, mob ? { y: (i) => (i ? -1 : 1) * 22, duration: 0.22, ease: 'power3.in', onComplete: r } : { x: (i) => (i ? -1 : 1) * Math.min(56, S.geo.W * 0.08), duration: 0.22, ease: 'power3.in', onComplete: r }))
    if (ev.ok) {
      App.audio.sfx('glitch', { volume: 0.6 })
      App.shake(S.stage, 9, 0.35)
      pair.forEach(p => p.classList.add('is-crack'))
    } else {
      App.audio.sfx('wrong', { volume: 0.45 })
      if (window.gsap) gsap.to(pair, mob ? { y: (i) => (i ? 1 : -1) * 26, duration: 0.4, ease: 'back.out(3)' } : { x: (i) => (i ? 1 : -1) * 40, duration: 0.4, ease: 'back.out(3)' })
    }
    await wait(ev.ok ? 450 : 700)
    if (window.gsap) gsap.to(pair, { opacity: 0, y: -16, duration: 0.35, onComplete: () => pair.forEach(p => p.remove()) })
    else pair.forEach(p => p.remove())
  }
  // 举手：公开讨论时出现在证物栏上方，三颗小点是这一场还能举几次
  function showHand() {
    const h = S.E.hand
    if (!h || !S.T || !meAlive() || S.spectate) return
    const dots = h.querySelector('.trial-hand-dots')
    dots.innerHTML = ''
    for (let i = 0; i < TE.HAND_MAX; i++) dots.appendChild(el('b' + (i < S.T.hands ? '.is-on' : '')))
    h.disabled = S.T.hands <= 0
    h._n = S.T.hands
    h.classList.add('is-on')
    h.classList.remove('is-up')
    if (window.gsap) gsap.fromTo(h, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)', clearProps: 'transform,opacity' })
  }
  function hideHand() { if (S.E.hand) S.E.hand.classList.remove('is-on', 'is-up', 'is-hint') }
  // 举过手之后：小点跟着少一颗，用完就灰掉
  function refreshHand() {
    const h = S.E.hand
    if (!h || !S.T || !h.classList.contains('is-on')) return
    const n = S.T.hands
    if (h._n === n) return
    h._n = n
    h.querySelectorAll('.trial-hand-dots b').forEach((b, i) => b.classList.toggle('is-on', i < n))
    h.disabled = n <= 0
  }
  function pulseHand() {
    const h = S.E.hand
    if (!h || !h.classList.contains('is-on') || h.disabled) return
    h.classList.add('is-hint')
    setTimeout(() => h.classList.remove('is-hint'), 2400)
  }
  function onHand() {
    if (!S.T || S.paused || S.spectate || !meAlive()) return
    if (S.E.hand.classList.contains('is-up')) return
    if (TE.raiseHand(S.T)) {
      S.E.hand.classList.add('is-up')
      App.audio.sfx('whoosh', { volume: 0.5 })
      // 这一拍还在演：让它快一点收尾
      skipAll()
    } else { App.audio.sfx('wrong', { volume: 0.3 }); shakeSeat(S.me) }
  }
  // 驳回用的卡：排除性事实，或已经看清了的疑似线索
  const refuter = r => !!(r && r.item.spot && (r.item.fact || (r.herring && r.herring.cleared)))
  // 桌心的取消（选卡、选人时）
  function cancelBox(done) {
    const box = S.E.ask
    box.innerHTML = ''
    const x = button('取消', '', 'cancel')
    x.addEventListener('click', e => { e.stopPropagation(); App.audio.sfx('click'); done(null) })
    box.appendChild(x)
    box.classList.add('is-on')
  }
  function clearAsk() { S.E.ask.innerHTML = ''; S.E.ask.classList.remove('is-on') }
  // 选人（带取消）
  function pickSeatC(filter, label) {
    const p = pickSeat(filter, label, { cancelable: true })
    cancelBox(() => p.kill())
    return p.finally(clearAsk)
  }
  // 选一张卡（带取消）
  function pickCardC(filter) {
    return ask(done => {
      cancelBox(done)
      S.cardPick = { filter, done }
      S.E.bar.classList.add('is-picking')
      for (const r of S.cards) r.el.classList.toggle('is-pickable', !!filter(r))
      const kill = () => done(null)
      picks.add(kill)
      return () => {
        S.cardPick = null
        picks.delete(kill)
        clearAsk()
        S.E.bar.classList.remove('is-picking')
        for (const r of S.cards) r.el.classList.remove('is-pickable')
      }
    })
  }
  // 出示：拿起一张证物、点一个人（带取消）→ {rec, id}
  function pickPresent() {
    return ask(done => {
      cancelBox(done)
      S.presentArm = { ok: x => TE.isLiving(S.G, x) && x !== S.me, done: (rec, id) => done({ rec, id }) }
      S.E.bar.classList.add('is-picking')
      for (const r of S.cards) r.el.classList.toggle('is-pickable', presentable(r))
      refreshTargets()
      const kill = () => done(null)
      picks.add(kill)
      return () => {
        S.presentArm = null
        picks.delete(kill)
        disarm()
        clearAsk()
        S.E.bar.classList.remove('is-picking')
        for (const r of S.cards) r.el.classList.remove('is-pickable')
        refreshTargets()
      }
    })
  }
  // 对质：选两张证言卡（点，或拖到桌心）；选中的飞到桌心
  function pickTalkPair() {
    return ask(done => {
      cancelBox(done)
      const sel = []
      const chips = []
      const take = r => {
        if (!r || !r.item.talk || sel.includes(r)) return
        sel.push(r)
        r.el.classList.add('is-picked')
        chips.push(flyPair(sel.length - 1, r.who))
        if (sel.length === 2) { S.pairChips = chips.slice(); chips.length = 0; setTimeout(() => done(sel.slice()), 420) }
      }
      S.cardPick = { filter: r => !!r.item.talk && !sel.includes(r), done: take }
      S.E.bar.classList.add('is-picking')
      for (const r of S.cards) r.el.classList.toggle('is-pickable', !!r.item.talk)
      S.E.core.classList.add('is-drop')
      // 拖：按住一张证言卡拖到桌心
      const track = S.E.bar.querySelector('.trial-bar-track')
      let drag = null
      const down = e => {
        const b = e.target.closest('.trial-card.is-talk')
        const r = b && S.cards.find(x => x.el === b)
        if (!r || sel.includes(r)) return
        drag = { r, x: e.clientX, y: e.clientY, ghost: null }
      }
      const move = e => {
        if (!drag) return
        // 触屏：往上（朝桌心）拖才算拖，横着划是在滚证物栏
        const up = drag.y - e.clientY, side = Math.abs(e.clientX - drag.x)
        const go = e.pointerType === 'touch' ? up > 14 && up > side : Math.hypot(side, up) > 10
        if (!drag.ghost && go) {
          drag.ghost = drag.r.el.cloneNode(true)
          drag.ghost.classList.add('trial-drag-ghost')
          S.stage.appendChild(drag.ghost)
        }
        if (drag.ghost) {
          const sr = S.stage.getBoundingClientRect()
          drag.ghost.style.transform = `translate3d(${e.clientX - sr.left - 70}px, ${e.clientY - sr.top - 30}px, 0) rotate(-4deg)`
        }
      }
      const up = e => {
        if (!drag) return
        const d = drag
        drag = null
        if (!d.ghost) return
        d.ghost.remove()
        S.dragEat = performance.now() // 拖完的这一下不算点
        const cr = S.E.core.getBoundingClientRect()
        if (e.clientX > cr.left && e.clientX < cr.right && e.clientY > cr.top && e.clientY < cr.bottom) take(d.r)
      }
      track.addEventListener('pointerdown', down)
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      const kill = () => done(null)
      picks.add(kill)
      return () => {
        S.cardPick = null
        picks.delete(kill)
        clearAsk()
        track.removeEventListener('pointerdown', down)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        S.E.bar.classList.remove('is-picking')
        S.E.core.classList.remove('is-drop')
        for (const r of S.cards) r.el.classList.remove('is-pickable', 'is-picked')
        if (chips.length) chips.forEach(c => c.remove())
      }
    })
  }
  // 举手之后的这一拍：出示 / 对质 / 追问 / 附议 / 质疑 / 驳回 / 放下
  async function interjectUI(ev) {
    const G = S.G
    hideSay()
    turnBox()
    S.E.hand.classList.remove('is-up')
    App.audio.sfx('heartbeat', { volume: 0.5 })
    const cur = ev.current
    for (let n = 0; n < 12; n++) {
      const items = []
      if (ev.presentLeft > 0 && S.cards.some(presentable)) items.push({ label: '出示', value: 'present', tone: 'blood', act: 'present' })
      if (Object.keys(S.talk || {}).length >= 2) items.push({ label: '对质', value: 'confront', act: 'confront' })
      items.push({ label: '追问', value: 'question', act: 'question' })
      if (cur && TE.isLiving(G, cur.target) && cur.target !== S.me) items.push({ label: '附议', value: 'agree', act: 'agree' }, { label: '质疑', value: 'doubt', act: 'doubt' })
      if (ev.claim && S.cards.some(refuter)) items.push({ label: '驳回', value: 'refute', tone: 'blood', act: 'refute' })
      items.push({ label: '放下', value: 'cancel', act: 'hand-down' })
      const v = await choose(items)
      if (v === 'cancel') return null
      if (v === 'agree' || v === 'doubt') return { kind: v }
      if (v === 'question') {
        const id = await pickSeatC(x => TE.isLiving(G, x) && x !== S.me, '追问')
        if (id) return { kind: 'question', target: id }
        continue
      }
      if (v === 'present') {
        const r = await pickPresent()
        if (r) return { kind: 'present', clue: r.rec.item.id, target: r.id, frame: S.frame }
        continue
      }
      if (v === 'confront') {
        const pr = await pickTalkPair()
        if (pr) return { kind: 'confront', a: pr[0].who, b: pr[1].who, recorded: pr.some(r => r.recorded) }
        if (S.pairChips) { S.pairChips.forEach(c => c.remove()); S.pairChips = null }
        continue
      }
      if (v === 'refute') {
        const rec = await pickCardC(refuter)
        if (rec) return { kind: 'refute', card: rec.item.spot }
        continue
      }
    }
    return null
  }

  // 投票结果：桌心的转盘
  async function reel(pending, pool) {
    const box = S.E.reel
    const strip = box.querySelector('.trial-reel-strip')
    clearFaces(strip)
    const ids = (pool || []).filter(Boolean)
    const seq = []
    const loops = 3
    for (let l = 0; l < loops; l++) for (const id of U.shuffle(ids)) seq.push(id)
    seq.push(pending || null)
    for (const id of seq) {
      const cell = el('div.trial-reel-cell')
      if (id) cell.appendChild(face(id, { eyeRange: 2 }))
      else cell.classList.add('is-blank')
      strip.appendChild(cell)
    }
    box.classList.add('is-on')
    box.classList.toggle('is-none', !pending)
    const cellH = strip.firstChild ? strip.firstChild.offsetHeight : 120
    const dist = (seq.length - 1) * cellH
    App.audio.sfx('whoosh')
    if (window.gsap && !App.reduced) {
      let lastI = -1
      await anim(r => gsap.fromTo(strip, { y: 0 }, {
        y: -dist, duration: S.spectate ? 1.4 : 2.2, ease: 'power4.out', onComplete: r,
        onUpdate() {
          const i = Math.round(-gsap.getProperty(strip, 'y') / cellH)
          if (i !== lastI) { lastI = i; App.audio.sfx('tick', { volume: 0.3 }) }
        },
      }))
    } else strip.style.transform = `translateY(${-dist}px)`
    App.audio.sfx('stamp')
    App.shake(S.stage, 6, 0.3)
    await wait(S.spectate ? 700 : 1000)
    box.classList.remove('is-on')
    await wait(250, false)
    clearFaces(strip)
    if (window.gsap) gsap.set(strip, { y: 0 })
  }

  /* ==========================================================
     处刑
     ========================================================== */
  async function execute(ids, opts = {}) {
    const E = S.E
    const who = E.exec.querySelector('.trial-exec-who')
    const back = S.scene
    await slash(() => {
      setScene('exec')
      mood('exec')
      clearFaces(who)
      ids.forEach((id, i) => {
        const card = el('div.trial-exec-card' + (i ? '.is-second' : ''), null, [el('div.trial-exec-face'), el('b', { text: nameOf(id) }), svg('svg', { class: 'trial-exec-x', 'aria-hidden': 'true' })])
        card.querySelector('.trial-exec-face').appendChild(face(id, { eyeRange: 10 }))
        const x = card.querySelector('.trial-exec-x')
        x.setAttribute('viewBox', '0 0 100 133')
        x.innerHTML = '<path d="M10 14 L90 119"/><path d="M90 14 L10 119"/>'
        who.appendChild(card)
      })
    }, { color: App.color.blood })
    const cards = Array.from(who.children)
    const word = E.exec.querySelector('.trial-exec-word')
    const chain = E.exec.querySelector('.trial-exec-chain')
    if (window.gsap) {
      gsap.fromTo(cards, { y: 120, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: 'expo.out' })
      gsap.fromTo(word, { scale: 3, opacity: 0, rotate: -18 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.5, delay: 0.35, ease: 'expo.out' })
      gsap.set(chain, { xPercent: -110, yPercent: -60, rotate: 28, opacity: 1 })
    }
    App.audio.sfx('heartbeat')
    await wait(1300)
    // 锁链的影子斜斜落下
    App.audio.sfx('execute')
    if (window.gsap) await anim(r => gsap.to(chain, { xPercent: 0, yPercent: 0, duration: 0.42, ease: 'expo.in', onComplete: r }))
    App.flash('#ffffff', { opacity: 1, duration: 0.8 })
    App.shake(S.stage, 18, 0.5)
    App.bg && App.bg.pulse(1)
    cards.forEach(cd => cd.classList.add('is-done'))
    if (window.gsap) {
      cards.forEach((cd, i) => {
        const ps = cd.querySelectorAll('.trial-exec-x path')
        gsap.fromTo(ps, { strokeDashoffset: 140 }, { strokeDashoffset: 0, duration: 0.35, stagger: 0.16, delay: 0.25 + i * 0.3, ease: 'power3.in', onStart: () => App.audio.sfx('stamp') })
      })
      gsap.to(chain, { opacity: 0, duration: 1.2, delay: 0.5 })
    }
    // 看着处刑的一两个人
    const gg = S.geo
    const watchers = pickVoices(living().filter(x => !ids.includes(x)), U.randInt(1, 2))
    watchers.forEach((id, i) => setTimeout(() => {
      if (S.scene !== 'exec' || S.paused || !gg) return
      const at = gg.mobile ? { x: gg.W / 2, y: gg.H - 70 - i * 70 } : { x: gg.W * (i ? 0.82 : 0.18), y: gg.H * (i ? 0.8 : 0.74) }
      quip(id, line(id, 'watch', { X: callOf(ids[0]) }, toX(ids[0])), { at, tone: 'watch', life: 2.2 })
    }, 600 + i * 700))
    await wait(2300)
    await flushNotices()
    syncSeats()
    // 处刑的是你
    if (S.me && ids.includes(S.me) && !S.deadShown) {
      S.deadShown = true
      const v = await deadScene()
      if (v === 'restart') { setTimeout(hardReset, 0); return 'restart' }
      S.spectate = true
    }
    if (opts.overdue) return
    if (back === 'court') await slash(() => { setScene('court'); mood('court'); syncSeats() })
  }

  /* ==========================================================
     余波：金币落桌
     ========================================================== */
  async function aftermath(c, pay) {
    const E = S.E
    await slash(() => {
      setScene('after')
      mood('after')
      hideSay()
      resetSeatStates()
      syncSeats()
      clearLines(null, false)
      clearDoors()
      S.E.count.innerHTML = ''
      S.E.mood.textContent = ''
      tension(0.2)
    })
    S.G.minutes += 20
    updateTop()
    await stamp(pay.solved ? '查明' : '未能查明', { hold: 900, cls: pay.solved ? '' : 'is-fail' + ' is-long', sfx: pay.solved ? 'correct' : 'wrong' })
    // 第一轮：每人五枚
    const ids = Object.keys(pay.table)
    await dropCoins(ids, 5)
    if (pay.solved) {
      await wait(500)
      await dropCoins(ids, 5)
    }
    // 你这一轮的几枚进钱袋（一局一个钱袋，铜牌与庭审共用）
    const gain = meAlive() && pay.table[S.me] ? pay.table[S.me] : 0
    if (gain && App.econ) { App.econ.gain(gain, 'aftermath'); syncPurse() }
    // 未查明：凶手的十枚出现在他套房的书桌上（不广播）——只有一个极暗的光点
    if (!pay.solved && Object.keys(pay.desk).length) {
      E.desk.classList.add('is-on')
      setTimeout(() => E.desk.classList.remove('is-on'), 9000)
    }
    await wait(500)
    // 「下一案」之前：默念兑换（吃饭、一夜安眠……）；旁观时略过
    if (meAlive() && !S.spectate && App.econ) {
      const v = await murmur('after')
      if (v === 'exit') {
        const r = await leaveMansion()
        if (r === 'restart') { setTimeout(hardReset, 0); throw ABORT }
      }
    }
  }
  async function dropCoins(ids, n) {
    const g = S.geo
    const tok = S.token
    App.audio.sfx('coins')
    const tasks = []
    for (const id of ids) {
      const k = seatOf(id)
      if (!k) continue
      const s = S.seat[k]
      const p = g.pos[k]
      // 落在席位前的桌面上（朝桌心方向）
      const tx = p.x + (g.cx - p.x) * 0.24, ty = p.y + (g.cy - p.y) * 0.24
      for (let i = 0; i < n; i++) {
        const coin = el('i.trial-coin')
        S.E.ring.appendChild(coin)
        const stackY = -((Number(s.coins.dataset.n) || 0) % 12) * 2.2
        coin.style.left = tx + 'px'
        coin.style.top = ty + 'px'
        if (window.gsap) {
          tasks.push(anim(r => gsap.fromTo(coin, { y: -g.H * 0.6 - U.rand(0, 140), x: U.rand(-30, 30), rotateX: 0, opacity: 0 }, {
            y: stackY, x: U.rand(-3, 3), rotateX: 720, opacity: 1, duration: U.rand(0.7, 1.1), delay: i * 0.06 + U.rand(0, 0.25), ease: 'bounce.out',
            onComplete: () => {
              if (tok === S.token) {
                if (i % 3 === 0) App.audio.sfx('coin', { volume: 0.4 })
                if (isMe(id)) setCoins(S.coins + 1, true)
              }
              r()
            },
          })))
        } else if (isMe(id)) setCoins(S.coins + 1)
        s.coins.dataset.n = String((Number(s.coins.dataset.n) || 0) + 1)
      }
    }
    await Promise.all(tasks)
    guard(tok)
    // 席位前只显示这一轮落下的枚数（旁人看不见谁攒了多少：没有账本）
    for (const id of ids) {
      const k = seatOf(id)
      if (k) { const c = S.seat[k].coins; c.textContent = String(Number(c.dataset.n) || 0); if (window.gsap) gsap.fromTo(c, { scale: 1.6 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' }) }
    }
    await wait(300)
  }
  function clearCoins() {
    S.E.ring.querySelectorAll('.trial-coin').forEach(c => c.remove())
    for (let k = 1; k <= 15; k++) if (S.seat[k]) delete S.seat[k].coins.dataset.n
  }

  /* ==========================================================
     结案对账：真相回放（运行规则 7.5）——余波之后一屏，可跳过
     真凶翻牌（手法、房间、时刻）；平面图上的进出路线与尸体位置；每条线索被谁找到（没人找到的为灰）、
     连到凶手对应的特征；各轮投票的流向与决定性的一票。未能查明的案件也翻牌，封上「只有你看得见」。
     只用名字、时刻、编号、证物名与卡面原文。数据来自引擎的 c.record（closeTrial 写入）。
     ========================================================== */
  const CAUSE_ICON = {
    stab: '<path d="M4 20L15 9l3-5 2 2-5 3L4 20zM13.5 10.5l1.8 1.8"/>',
    blunt: '<path d="M14 3l7 7-3 3-7-7zM11.5 8.5L3 17l4 4 8.5-8.5"/>',
    strangle: '<path d="M5 9c2-3 12-3 14 0M5 9c0 5 3 9 7 9s7-4 7-9"/><path d="M12 18v3" opacity=".6"/>',
    smother: '<path d="M4 8h16v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M8 12h8" opacity=".6"/>',
    poison: '<path d="M9.5 3h5M10.5 3v4.5L6 15a4 4 0 0 0 3.5 6h5A4 4 0 0 0 18 15l-4.5-7.5V3"/><path d="M8 15.5h8" opacity=".6"/>',
    drown: '<path d="M3 13c2-1.5 3-1.5 4.5 0s2.5 1.5 4.5 0 3-1.5 4.5 0 2.5 1.5 4.5 0M3 18c2-1.5 3-1.5 4.5 0s2.5 1.5 4.5 0 3-1.5 4.5 0 2.5 1.5 4.5 0"/><circle cx="12" cy="6.5" r="2.5"/>',
    fall: '<path d="M12 3v14M7 12l5 5 5-5M5 21h14"/>',
    door: '<path d="M5 21V3h14v18M3 21h18"/><path d="M9 12h1.5" stroke-width="2.2"/>',
    alcohol: '<path d="M10 3h4v4l2 3v11H8V10l2-3z"/><path d="M8 14h8" opacity=".6"/>',
  }
  const causeIcon = id => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (CAUSE_ICON[id] || CAUSE_ICON.stab) + '</svg>'
  // 凶手在这一维度上的样子（卡面判定档位或数字）
  function featureOf(dim, ch) {
    const st = ch.stats || {}
    switch (dim) {
      case 'height': return ch.heightCm ? ch.heightCm + '厘米' : '—'
      case 'gender': return ch.gender || '—'
      case 'physique': return st.physique || '—'
      case 'medical': return st.medical || '—'
      case 'observation': return st.observation || '—'
      case 'era': return ch.knowsModernDevices ? '认得' : '没见过'
      case 'items': return (ch.carried || []).find(i => /手套|烟斗|烟管/.test(i)) || '无'
      default: return '—'
    }
  }
  // 一轮投票的小圆环：十五个席位点；选票是连线（投给凶手为血色、被带偏的为骨白虚线），决定性的一票加粗
  function voteRingSVG(V, rec) {
    const R = 46, C = 60
    const pos = k => { const a = -Math.PI / 2 + ((k - 1) / 15) * Math.PI * 2; return [C + Math.cos(a) * R, C + Math.sin(a) * R] }
    const seat = id => seatOf(id)
    let lines = '', dots = ''
    const inRound = new Set(V.voters.concat(V.ballots.map(b => b.target)).filter(Boolean))
    for (let k = 1; k <= 15; k++) {
      const id = S.G && S.G.seats[k - 1]
      const [x, y] = pos(k)
      const cls = !id ? 'is-empty' : id === rec.murderer ? 'is-m' : inRound.has(id) ? 'is-on' : 'is-off'
      dots += `<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${cls === 'is-m' ? 3.6 : 2.6}"/>`
    }
    V.ballots.forEach((b, i) => {
      if (!b.target) return
      const a = seat(b.voter), t = seat(b.target)
      if (!a || !t) return
      const [x1, y1] = pos(a), [x2, y2] = pos(t)
      const right = b.target === rec.murderer
      const dec = V.decisive && V.decisive.index === i
      if (a === t) { lines += `<circle class="trial-rp-self" cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="5.5"/>`; return }
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const qx = mx + (C - mx) * 0.45, qy = my + (C - my) * 0.45
      lines += `<path class="${right ? 'is-right' : 'is-led'}${dec ? ' is-dec' : ''}" style="--i:${i}" d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}"/>`
    })
    const pend = V.result && V.result.pending
    let x = ''
    if (pend && seat(pend)) {
      const [px, py] = pos(seat(pend))
      x = `<g class="trial-rp-x${pend === rec.murderer ? ' is-right' : ''}"><path d="M${px - 5},${py - 5}L${px + 5},${py + 5}M${px + 5},${py - 5}L${px - 5},${py + 5}"/></g>`
    }
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trial-rp-rim" cx="${C}" cy="${C}" r="${R}"/>${lines}${dots}${x}</svg>`
  }
  function buildReplay(c, rec) {
    const E = S.E
    const box = E.replay
    const ch = charOf(rec.murderer)
    const head = box.querySelector('.trial-rp-head')
    clearFaces(head)
    head.innerHTML = ''
    // ① 真凶翻牌
    const card = el('div.trial-rp-card', null, [el('div.trial-rp-card-in', null, [el('div.trial-rp-card-back', { html: '<i></i><i></i>' }), el('div.trial-rp-card-face')])])
    card.querySelector('.trial-rp-card-face').appendChild(face(rec.murderer, { eyeRange: 6 }))
    card.querySelector('.trial-rp-card-face').appendChild(el('span.trial-rp-card-no', { text: U.roman(seatOf(rec.murderer)) }))
    const how = el('div.trial-rp-how', null, [
      el('i.trial-rp-cause', { html: causeIcon(rec.cause) }),
      el('span', { text: rec.causeName }),
      el('span.trial-rp-room', { text: rec.floor + ' ' + rec.room }),
      el('span.trial-rp-time', { text: hhmm(rec.tMurder) }),
    ])
    const vic = el('div.trial-rp-victim', null, [el('div.trial-rp-vface'), el('b', { text: nameOf(rec.victim) })])
    vic.firstChild.appendChild(face(rec.victim, { dead: true, eyeRange: 2 }))
    const extra = el('div.trial-rp-extra')
    if (rec.bottle) extra.appendChild(el('span', null, [el('i', { html: causeIcon('poison') }), el('span', { text: rec.bottle.room + ' · 书桌 · ' + hhmm(rec.bottle.at) })]))
    if (rec.doorLock) extra.appendChild(el('span', null, [el('i', { html: causeIcon('door') }), el('span', { text: hhmm(rec.doorLock.at) + '—' + hhmm(rec.doorLock.until) })]))
    if (rec.where && rec.where.lie) extra.appendChild(el('span.is-lie', null, [el('i', { html: LIE_MARK }), el('span', { text: rec.where.claim })]))
    // 让死亡时间窗偏移：看上去的时刻 → 真正的时刻（识破了没有）
    if (rec.death && rec.death.shift) extra.appendChild(el('span.is-shift' + (rec.death.refKnown ? '.is-seen' : ''), null, [el('i', { html: dimIcon('time') }), el('s', { text: hhmm(rec.death.apparent) }), el('span', { text: '→ ' + hhmm(rec.death.t) })]))
    // 死者衣袋里的金币：谁取走了，或还留在现场
    if (rec.coins && (rec.coins.taken || rec.coins.body)) extra.appendChild(el('span.is-coins', null, [el('i.trial-mm-coin'), el('span', { text: rec.coins.taken ? rec.coins.taken.n + ' · ' + U.roman(seatOf(rec.coins.taken.by)) : String(rec.coins.body) })]))
    // 发现者（凶手在心里要求播报时，就是他自己）
    if (rec.discoverer) extra.appendChild(el('span' + (rec.selfReport ? '.is-self' : ''), null, [el('i', { html: icon('look') }), el('span', { text: nameOf(rec.discoverer) + ' · ' + hhmm(rec.tDiscover) })]))
    const info = el('div.trial-rp-info', null, [
      el('span.trial-rp-case', { text: 'CASE ' + U.roman(rec.no) }),
      el('b.trial-rp-name', { text: ch.name }),
      how, vic, extra.childNodes.length ? extra : null,
      el('div.trial-rp-stamp' + (rec.solved ? '' : '.is-fail'), { text: rec.solved ? '查明' : '未能查明' }),
      rec.solved ? null : el('div.trial-rp-seal', { text: '只有你看得见' }),
    ])
    head.append(card, info)
    // ② 平面图：进出路线、尸体、各条线索的位置与发现者
    const planBox = box.querySelector('.trial-rp-plan')
    const old = planBox.querySelector('svg')
    if (old) old.remove()
    const cv = planBox.querySelector('canvas')
    const pw = planBox.clientWidth || 480, ph = planBox.clientHeight || 300
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    cv.width = Math.round(pw * dpr); cv.height = Math.round(ph * dpr)
    cv.style.width = pw + 'px'; cv.style.height = ph + 'px'
    const ctx = cv.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    const sameCase = Inv.c === c && Inv.objs && Inv.body
    let ov = null
    if (sameCase) {
      const geo = Inv.fitGeo({ x: 12, y: 12, w: pw - 24, h: ph - 24 })
      Inv.paintPlan(ctx, geo, dpr, { bodyGone: false, labels: false })
      ov = svg('svg', { class: 'trial-rp-ov', viewBox: `0 0 ${pw} ${ph}`, 'aria-hidden': 'true' })
      const P = (u, v) => Inv.P(u, v, geo)
      const doors = Inv.doors
      const body = Inv.body
      const near = doors.slice().sort((a, b) => { const pa = Inv.doorIn(a), pb = Inv.doorIn(b); return Math.hypot(pa.u - body.u, pa.v - body.v) - Math.hypot(pb.u - body.u, pb.v - body.v) })
      const awaySp = Inv.spots.find(sp => sp.place === 'away' && sp.door)
      const din = near[0]
      const dout = awaySp ? awaySp.door : near[1] || near[0]
      const [bx, by] = P(body.u, body.v)
      if (rec.cause !== 'poison') {
        const pi = Inv.doorIn(din), po = Inv.doorIn(dout)
        const [ix, iy] = P(pi.u, pi.v), [ox2, oy2] = P(po.u, po.v)
        ov.appendChild(svg('path', { class: 'trial-rp-route', d: `M${ix.toFixed(1)},${iy.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)} L${(ox2 + (dout === din ? 6 : 0)).toFixed(1)},${(oy2 + (dout === din ? 6 : 0)).toFixed(1)}` }))
        for (const [x, y] of [[ix, iy], [ox2, oy2]]) ov.appendChild(svg('circle', { class: 'trial-rp-door', cx: x.toFixed(1), cy: y.toFixed(1), r: 4 }))
      }
      ov.appendChild(svg('circle', { class: 'trial-rp-body', cx: bx.toFixed(1), cy: by.toFixed(1), r: 9 }))
      const tt = svg('text', { class: 'trial-rp-bt', x: bx.toFixed(1), y: (by - 14).toFixed(1) })
      tt.textContent = hhmm(rec.tMurder)
      ov.appendChild(tt)
      rec.clues.forEach((k, i) => {
        const sp = Inv.spots.find(x => x.clue && x.clue.id === k.id)
        if (!sp) return
        const [x, y] = P(sp.u, sp.v)
        const g = svg('g', { class: 'trial-rp-tent' + (k.foundBy ? '' : ' is-lost') })
        g.appendChild(svg('path', { d: `M${(x - 8).toFixed(1)},${(y + 6).toFixed(1)} L${x.toFixed(1)},${(y - 9).toFixed(1)} L${(x + 8).toFixed(1)},${(y + 6).toFixed(1)}Z` }))
        const t = svg('text', { x: x.toFixed(1), y: (y + 3).toFixed(1) })
        t.textContent = String(i + 1)
        g.appendChild(t)
        const f = svg('text', { class: 'trial-rp-finder', x: x.toFixed(1), y: (y + 18).toFixed(1) })
        f.textContent = k.foundBy ? U.roman(seatOf(k.foundBy)) : '—'
        g.appendChild(f)
        ov.appendChild(g)
      })
      planBox.appendChild(ov)
    }
    planBox.classList.toggle('is-empty', !sameCase)
    // ③ 线索 → 凶手的特征
    const clues = box.querySelector('.trial-rp-clues')
    clues.innerHTML = ''
    rec.clues.forEach((k, i) => {
      const row = el('div.trial-rp-clue' + (k.foundBy ? '' : '.is-lost'), null, [
        el('span.trial-rp-k', null, [el('b', { text: String(i + 1) }), el('i', { html: icon(k.tpl) }), el('span', { text: k.label })]),
        el('span.trial-rp-by', { text: k.foundBy ? U.roman(seatOf(k.foundBy)) : '—' }),
        el('i.trial-rp-link'),
        el('span.trial-rp-f' + (k.visible ? '' : '.is-unseen'), null, [el('i', { html: dimIcon(k.dim) }), el('span', { text: k.dim === 'time' && rec.death ? hhmm(rec.death.apparent) + '→' + hhmm(rec.death.t) : featureOf(k.dim, ch) })]),
      ])
      clues.appendChild(row)
    })
    for (const h of rec.herrings || []) {
      if (!h.seen) continue
      clues.appendChild(el('div.trial-rp-clue.is-herring' + (h.cleared ? '.is-cleared' : ''), null, [
        el('span.trial-rp-k', null, [el('b', { text: '?' }), el('i', { html: icon('look') }), el('span', { text: h.object })]),
        el('span.trial-rp-by', { text: '' }),
        el('i.trial-rp-link'),
        el('span.trial-rp-f.is-none', { text: '—' }),
      ]))
    }
    // ④ 投票的流向
    const votes = box.querySelector('.trial-rp-votes')
    votes.innerHTML = ''
    for (const V of rec.rounds) {
      if (V.empty) continue
      const res = V.result || {}
      const label = V.kind === 'special' ? '表决' : V.round > 1 ? '重投' : '投票'
      const out = res.outcome === 'unique' || res.outcome === 'pass' ? (res.pending ? U.roman(seatOf(res.pending)) : '') : res.outcome === 'tie' ? '并列' : res.outcome === 'fail' ? (res.count + ' / ' + res.total) : '—'
      votes.appendChild(el('div.trial-rp-vote' + (res.pending && res.pending === rec.murderer ? '.is-right' : res.pending ? '.is-wrong' : ''), null, [
        el('div.trial-rp-ring', { html: voteRingSVG(V, rec) }),
        el('span.trial-rp-vk', { text: label }),
        el('b.trial-rp-vo', { text: out }),
      ]))
    }
    votes.classList.toggle('is-empty', !votes.children.length)
  }
  async function replay(c, nextLabel) {
    const rec = c.record
    if (!rec || !S.G) return
    const E = S.E
    const box = E.replay
    await slash(() => {
      setScene('replay')
      mood('after')
      hideSay()
      clearQuips()
      box.scrollTop = 0
      buildReplay(c, rec)
    })
    App.audio.sfx('flip')
    const cardIn = box.querySelector('.trial-rp-card-in')
    if (window.gsap) {
      const info = box.querySelectorAll('.trial-rp-info > *')
      gsap.fromTo(box.querySelector('.trial-rp-card'), { y: 40, opacity: 0, rotate: -6 }, { y: 0, opacity: 1, rotate: -3, duration: 0.6, ease: 'expo.out' })
      gsap.fromTo(cardIn, { rotateY: 180 }, { rotateY: 0, duration: 0.9, delay: 0.35, ease: 'back.out(1.4)', onStart: () => setTimeout(() => App.audio.sfx('stamp', { volume: 0.6 }), 450) })
      gsap.fromTo(info, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.07, delay: 0.7, ease: 'expo.out' })
      const route = box.querySelector('.trial-rp-route')
      if (route && route.getTotalLength) { const L = route.getTotalLength(); gsap.fromTo(route, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.2, delay: 0.9, ease: 'power2.inOut', onComplete: () => { route.style.strokeDasharray = ''; route.style.strokeDashoffset = '' } }) }
      gsap.fromTo(box.querySelectorAll('.trial-rp-tent, .trial-rp-body'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, delay: 1.2, ease: 'back.out(2)' })
      gsap.fromTo(box.querySelectorAll('.trial-rp-clue'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.12, delay: 1.0, ease: 'expo.out' })
      gsap.fromTo(box.querySelectorAll('.trial-rp-vote'), { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, delay: 1.4, ease: 'expo.out' })
      if (!rec.solved) gsap.fromTo(box.querySelector('.trial-rp-seal'), { scale: 2.2, opacity: 0, rotate: -16 }, { scale: 1, opacity: 1, rotate: -6, duration: 0.45, delay: 1.6, ease: 'expo.out', onStart: () => setTimeout(() => App.audio.sfx('stamp', { volume: 0.5 }), 200) })
    }
    await choose([{ label: nextLabel || '下一案', value: 1, tone: 'blood', breath: true, act: 'replay-go' }], { box: box.querySelector('.trial-rp-go') })
  }
  // 终局：一案一行的总表（死者、凶手、查明与否、误判次数）
  function ledger() {
    const recs = (S.G && S.G.records) || []
    const box = el('div.trial-end-ledger')
    for (const r of recs) {
      const row = el('div.trial-led-row' + (r.solved ? '' : '.is-fail'), null, [
        el('span.trial-led-no', { text: U.roman(r.no) }),
        el('span.trial-led-p.is-dead', null, [el('i.trial-led-face'), el('b', { text: nameOf(r.victim) })]),
        el('i.trial-led-arrow', { html: causeIcon(r.cause) }),
        el('span.trial-led-p', null, [el('i.trial-led-face'), el('b', { text: nameOf(r.murderer) })]),
        el('span.trial-led-st', { text: r.solved ? '查明' : '未能查明' }),
        el('span.trial-led-mis', { text: r.misjudge ? '×' + r.misjudge : '' }),
      ])
      const fs = row.querySelectorAll('.trial-led-face')
      fs[0].appendChild(face(r.victim, { dead: true, eyeRange: 1 }))
      fs[1].appendChild(face(r.murderer, { eyeRange: 1 }))
      box.appendChild(row)
    }
    return recs.length ? box : null
  }

  /* ==========================================================
     终局、死亡、无人受命
     ========================================================== */
  function endButtons(items) {
    const box = S.E.end.querySelector('.trial-end-actions')
    return ask(done => {
      box.innerHTML = ''
      for (const it of items) {
        const b = button(it.label, it.tone === 'blood' ? 'btn--blood' : '', it.act || it.label)
        b.addEventListener('click', e => { e.stopPropagation(); done(it.value) })
        box.appendChild(b)
      }
      if (window.gsap) gsap.fromTo(box.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'expo.out' })
      return () => { box.innerHTML = '' }
    })
  }
  async function finale(winner) {
    const E = S.E
    clearCoins()
    S.endMood = 'end'
    await slash(() => {
      setScene('end')
      mood('end')
      E.end.className = 'trial-end is-win'
      const fc = E.end.querySelector('.trial-end-face')
      clearFaces(fc)
      const row = E.end.querySelector('.trial-end-row')
      clearFaces(row)
      // 胜者脚下：其余的人按席位排成一行，全部熄灭
      if (winner && S.G) {
        for (const id of S.G.order.slice().sort((a, b) => seatOf(a) - seatOf(b))) {
          if (id === winner) continue
          const m = el('div.trial-end-mini.is-gone', { 'data-seat': U.roman(seatOf(id)) })
          m.appendChild(face(id, { dead: true, eyeRange: 2 }))
          row.appendChild(m)
        }
      }
      if (winner) fc.appendChild(face(winner, { eyeRange: 9 }))
      // 一案一行的总表
      const old = E.end.querySelector('.trial-end-ledger')
      if (old) { clearFaces(old); old.remove() }
      const led = ledger()
      if (led) E.end.querySelector('.trial-end-row').after(led)
      E.end.classList.toggle('has-ledger', !!led)
      E.end.querySelector('.trial-end-tag').textContent = winner ? U.roman(seatOf(winner)) : ''
      E.end.querySelector('.trial-end-name').textContent = winner ? nameOf(winner) : '—'
      E.end.querySelector('.trial-end-line').textContent = ''
    })
    if (winner) {
      App.state.winner = winner
      App.bus.emit('trial:winner', winner)
    }
    App.audio.sfx('chimes5')
    if (window.gsap) {
      // 死亡场景留下的倒地姿态要清掉（同一个肖像框）
      gsap.fromTo(E.end.querySelector('.trial-end-face'), { scale: 0.7, opacity: 0, x: 0, y: 40, rotate: 0, rotationX: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, y: 0, duration: 1.6, ease: 'expo.out' })
      gsap.fromTo(E.end.querySelector('.trial-end-halo'), { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.4, ease: 'expo.out' })
      const minis = E.end.querySelectorAll('.trial-end-row > *')
      if (minis.length) gsap.fromTo(minis, { y: 14, opacity: 0 }, { y: 0, opacity: 0.5, duration: 0.7, stagger: 0.05, delay: 0.9, ease: 'expo.out' })
      const rows = E.end.querySelectorAll('.trial-led-row')
      if (rows.length) gsap.fromTo(rows, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, stagger: 0.09, delay: 1.1, ease: 'expo.out' })
    }
    await wait(1200)
    if (winner) {
      // 撑到最后的一句，然后是愿望
      const endLine = E.end.querySelector('.trial-end-line')
      const w1 = line(winner, 'win')
      endLine.classList.toggle('is-act', isAct(w1))
      await typeIn(endLine, w1, 40, isAct(w1))
      await wait(1500)
      if (window.gsap) await anim(r => gsap.to(endLine, { opacity: 0, duration: 0.4, onComplete: r }))
      const w2 = line(winner, 'wish')
      endLine.classList.toggle('is-act', isAct(w2))
      if (window.gsap) gsap.set(endLine, { opacity: 1 })
      await typeIn(endLine, w2, 46, isAct(w2))
    }
    S.running = false
    const v = await endButtons([{ label: '终章', value: 'wish', tone: 'blood', act: 'wish' }, { label: '再来一局', value: 'again', act: 'again' }])
    if (v === 'wish') {
      hardReset()
      setTimeout(() => (App.nav ? App.nav.go('wish') : App.scroll.to('#wish')), 80)
    } else hardReset()
  }
  // 持券离馆（开局流程 2.4；主持人游戏 6）：不是死亡——你的椅子空出来（门开着，不是锈红），回到记忆截止的那一刻
  async function leaveMansion() {
    const G = S.G
    if (!App.econ.exit({ at: Math.floor(G.minutes) })) return 'watch'
    TE.leave(G, S.me)
    S.left = true
    S.deadShown = true
    updateBody()
    const E = S.E
    S.endMood = 'end'
    hideHand()
    await slash(() => {
      setScene('end')
      mood('end')
      E.end.className = 'trial-end is-left'
      const oldL = E.end.querySelector('.trial-end-ledger')
      if (oldL) { clearFaces(oldL); oldL.remove() }
      const fc = E.end.querySelector('.trial-end-face')
      clearFaces(fc)
      clearFaces(E.end.querySelector('.trial-end-row'))
      fc.appendChild(face(S.me, { eyeRange: 6 }))
      fc.appendChild(el('i.trial-end-door', { html: icon('exitdoor') }))
      E.end.querySelector('.trial-end-tag').textContent = U.roman(seatOf(S.me))
      E.end.querySelector('.trial-end-name').textContent = nameOf(S.me)
      E.end.querySelector('.trial-end-line').textContent = ''
      syncSeats()
    }, { color: '#e2c48c' })
    App.audio.sfx('door', { volume: 0.7 })
    if (window.gsap) {
      const fc = E.end.querySelector('.trial-end-face')
      gsap.set(fc, { rotate: 0, rotationX: 0, x: 0, y: 0, opacity: 1, transformPerspective: 760, transformOrigin: '50% 100%' })
      gsap.to(fc.querySelector('.portrait'), { xPercent: 26, opacity: 0.12, scale: 0.86, duration: 1.8, delay: 0.5, ease: 'power2.inOut' })
    }
    await wait(1600)
    E.end.querySelector('.trial-end-line').textContent = '回到记忆截止的那一刻'
    if (window.gsap) gsap.fromTo(E.end.querySelector('.trial-end-line'), { opacity: 0 }, { opacity: 1, duration: 1.2 })
    const v = await endButtons([{ label: '旁观', value: 'watch', tone: 'blood', act: 'watch' }, { label: '重来', value: 'restart', act: 'restart' }])
    if (v === 'watch') { S.spectate = true; S.endMood = 'end' }
    if (window.gsap) gsap.set(E.end.querySelector('.trial-end-face'), { clearProps: 'transform,opacity' })
    return v
  }
  async function deadScene() {
    const E = S.E
    S.endMood = 'dead'
    await slash(() => {
      setScene('end')
      mood('dead')
      E.end.className = 'trial-end is-dead'
      const oldL = E.end.querySelector('.trial-end-ledger')
      if (oldL) { clearFaces(oldL); oldL.remove() }
      const fc = E.end.querySelector('.trial-end-face')
      clearFaces(fc)
      clearFaces(E.end.querySelector('.trial-end-row'))
      fc.appendChild(face(S.me, { dead: true, eyeRange: 2 }))
      E.end.querySelector('.trial-end-tag').textContent = U.roman(seatOf(S.me))
      E.end.querySelector('.trial-end-name').textContent = nameOf(S.me)
      E.end.querySelector('.trial-end-line').textContent = ''
    }, { color: '#050404' })
    App.audio.sfx('dark')
    App.bg && App.bg.setDark(0.6, 1.2)
    if (window.gsap) {
      // 肖像像一张立着的牌，向后仰倒、拍在地上（以底边为轴的透视翻倒：位图与矢量都成立，不露出裁切边）
      const fc = E.end.querySelector('.trial-end-face')
      gsap.set(fc, { rotate: 0, rotationX: 0, x: 0, y: 0, opacity: 1, transformPerspective: 760, transformOrigin: '50% 100%' })
      gsap.timeline({ delay: 0.35 })
        .to(fc, { rotationX: -9, y: -4, duration: 0.32, ease: 'power2.out' })
        .to(fc, { rotationX: 66, y: 0, duration: 1.0, ease: 'bounce.out', onStart: () => setTimeout(() => { App.audio.sfx('drop'); App.shake(S.stage, 6, 0.3) }, 380) })
        .to(fc, { opacity: 0.7, duration: 0.8, ease: 'power2.out' }, '<0.5')
    }
    await wait(1400)
    E.end.querySelector('.trial-end-line').textContent = '你的席位熄灭了'
    if (window.gsap) gsap.fromTo(E.end.querySelector('.trial-end-line'), { opacity: 0 }, { opacity: 1, duration: 1.2 })
    const v = await endButtons([{ label: '旁观', value: 'watch', tone: 'blood', act: 'watch' }, { label: '重来', value: 'restart', act: 'restart' }])
    App.bg && App.bg.setDark(0, 0.8)
    updateMe()
    if (v === 'watch') {
      S.endMood = 'end'
      return 'watch'
    }
    return 'restart'
  }
  async function stallScene() {
    const E = S.E
    S.endMood = 'end'
    await slash(() => {
      setScene('end')
      mood('end')
      E.end.className = 'trial-end is-stall'
      const oldL = E.end.querySelector('.trial-end-ledger')
      if (oldL) { clearFaces(oldL); oldL.remove() }
      const led = ledger()
      if (led) E.end.querySelector('.trial-end-row').after(led)
      clearFaces(E.end.querySelector('.trial-end-face'))
      const row = E.end.querySelector('.trial-end-row')
      clearFaces(row)
      for (const id of living()) { const m = el('div.trial-end-mini'); m.appendChild(face(id, { eyeRange: 4 })); row.appendChild(m) }
      E.end.querySelector('.trial-end-tag').textContent = ''
      E.end.querySelector('.trial-end-name').textContent = ''
      E.end.querySelector('.trial-end-line').textContent = ''
    })
    App.audio.sfx('chime')
    await typeIn(E.end.querySelector('.trial-end-line'), '无人受命，钟声照旧', 60)
    S.running = false
    const v = await endButtons([{ label: '终章', value: 'wish', tone: 'blood', act: 'wish' }, { label: '再来一局', value: 'again', act: 'again' }])
    hardReset()
    if (v === 'wish') setTimeout(() => (App.nav ? App.nav.go('wish') : App.scroll.to('#wish')), 80)
  }

  /* ==========================================================
     光标：圆桌随鼠标轻微倾斜、穹顶视差
     ========================================================== */
  let tiltX = 0, tiltY = 0
  function onTick() {
    if (!S.visible || !S.stage) return
    const m = App.mouse
    const r = S.stage.getBoundingClientRect()
    // 游戏中滚动是锁住的：上方板块迟一步排版（远离视口时不画）会把舞台挤离视口顶端，锁着的滚动不会跟上——对齐回来
    if (S.active && !S.paused && Math.abs(r.top) > 1.5 && performance.now() - (S.lockAt || 0) > 1500) {
      S.lockAt = performance.now()
      const y = window.scrollY + r.top
      if (App.scroll && App.scroll.lenis) App.scroll.lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
    }
    const nx = U.clamp((m.sx - r.left) / (r.width || 1)) - 0.5
    const ny = U.clamp((m.sy - r.top) / (r.height || 1)) - 0.5
    tiltX = U.lerp(tiltX, nx, 0.06)
    tiltY = U.lerp(tiltY, ny, 0.06)
    const E = S.E
    if (!App.reduced) {
      E.ring.style.transform = `perspective(1600px) rotateX(${(-tiltY * 4).toFixed(2)}deg) rotateY(${(tiltX * 5).toFixed(2)}deg)`
      E.dome.style.transform = `translate3d(${(-tiltX * 30).toFixed(1)}px, ${(-tiltY * 18).toFixed(1)}px, 0)`
      // 视差变量只写给真正用到它的元素（写在场景容器上会让整棵子树每帧重算样式），数值没变不写
      const tl = E.tilt || (E.tilt = {
        exec: [E.exec.querySelector('.trial-exec-word')],
        end: [E.end.querySelector('.trial-end-face')],
        cine: [E.cine.querySelector('.trial-cine-dial'), E.cine.querySelector('.trial-cine-face')],
      })
      const els = tl[S.scene]
      if (els) {
        const tx = (S.scene === 'exec' ? tiltX * 2 : tiltX).toFixed(3), ty = tiltY.toFixed(3)
        for (const n of els) {
          if (!n) continue
          if (n._tx !== tx) { n._tx = tx; n.style.setProperty('--tx', tx) }
          if (S.scene !== 'exec' && n._ty !== ty) { n._ty = ty; n.style.setProperty('--ty', ty) }
        }
      }
    }
    // 加速：光标越快，调查期的灰尘越乱（不影响规则）
  }

  /* ==========================================================
     板块注册
     ========================================================== */
  function mount(sec) {
    build(sec)
    S.seats = (App.state.seats || []).slice(0, 15)
    while (S.seats.length < 15) S.seats.push(null)
    setScene('intro')
    renderIntro()
    requestAnimationFrame(layout)
    window.addEventListener('resize', U.debounce(() => { layout() }, 120))
    App.onVisible(sec, v => {
      S.visible = v
      if (S.scene === 'inv') { if (v) Inv.start(); else Inv.stop() }
    })
    App.tick(onTick)
    // 钱袋变了（余波发放、拾取、兑换，或在铜牌上动了它）：顶栏跟着变，引擎里你身上的枚数也跟着
    App.bus.on('econ:change', e => {
      if (!S.G || !e || e.game !== S.econGame) return
      if (e.coins !== S.coins) setCoins(e.coins, true)
      syncPurse()
    })
    App.bus.on('time', () => {
      if (S.timeOwn || !S.active || S.paused || !S.G || S.shownTime == null || S.reTime) return
      S.reTime = true
      Promise.resolve().then(() => { S.reTime = false; if (S.active && !S.paused && S.G && S.shownTime != null) emitTime(S.shownTime) })
    })
    App.bus.on('cast:change', () => {
      const next = (App.state.seats || []).slice(0, 15)
      while (next.length < 15) next.push(null)
      S.seats = next
      if (S.running || S.G) hardReset()
      else { renderIntro(); layout() }
    })
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return
      if (S.armed || (S.targeting && S.targeting.ability)) { disarm(); cancelTargeting(); return }
      if (S.active) exitGame()
    })
    // 字体就位后重排一次
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout())
  }

  def = App.section('trial', {
    palette: PAL.intro,
    track: 'trial',
    mount,
    enter() {
      S.visible = true
      layout()
    },
    leave() {
      S.visible = false
      if (S.scene === 'inv') Inv.stop()
    },
  })
  // 入局用小调圆舞曲；进入游戏后随场景切换
  def.track = TRACK.intro
})()
