/* ==========================================================
   十五席 · 模拟庭审引擎（纯逻辑，不碰 DOM）
   依据：主持人游戏.md 第二、三、五、七、八节；开局配置.md；
         运行规则.md 第 6 章；洋馆物理层.md 第 7、8 节；身体结算.md。

   - 浏览器：window.TrialEngine；Node：module.exports。
   - 所有随机都来自 game.r（mulberry32，可注入 seed）。
   - 庭审流程是一个生成器 TrialEngine.trialFlow(game, trial)：
     它逐个产出要演出的事件；遇到需要玩家决定的地方产出 ask-* 事件，
     由界面用 it.next(输入) 把选择送回。测试与旁观模式用 autoTrial 代答。
   - 辩论的节拍：turn → 指认 accuse{clue 出示的证据} → 旁人插话 interject{stance: agree|doubt}（0—2 人）
     → 被指认者回应：defend 辩解 / counter 反咬 / alibi 交代去向（玩家被指认时先产出 ask-respond）
     → expose 当众拆穿（去向与在场者的真实去向矛盾）；不指认时：speech{mode: statement|clue} / alibi / silent。
   - 去向：newCase 时为每人生成案发时的真实去向与说法（c.where）；凶手亲手行凶时说谎。玩家调查期可 interview 询问。
   - 调查的文字（诱饵点的陈设描写、疑似线索、验尸、发现线索的动作）与去向只用子随机数，不消耗 g.r。

   本模拟的取舍（与原文一致之处见各函数注释）：
   - 受命者 = 本批唯一凶手（不是玩家）；死者不是玩家、不是凶手。
   - 不发放逆位能力，只把凶手卡背的敲钟人（三十分钟）、女巫（毒）、
     典狱长（门）当作行凶手段；国王、贞德等流程略去。
   ========================================================== */
(function (root) {
  'use strict'

  /* ---------- 随机 ---------- */
  function rng(seed) {
    let s = (seed >>> 0) || 1
    return () => {
      s = (s + 0x6d2b79f5) >>> 0
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)]
  const randInt = (r, a, b) => Math.floor(a + r() * (b - a + 1))
  const chance = (r, p) => r() < p
  function shuffle(r, arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  function gauss(r) {
    let u = 0, v = 0
    while (u === 0) u = r()
    while (v === 0) v = r()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  function weighted(r, items) {
    const sum = items.reduce((s, it) => s + it.w, 0)
    let x = r() * sum
    for (const it of items) { if ((x -= it.w) <= 0) return it.v }
    return items[items.length - 1].v
  }

  /* ---------- 谓词（LORE 中的字符串表达式） ---------- */
  const predCache = {}
  function pred(src) {
    if (!src) return () => true
    if (!predCache[src]) {
      let fn
      try { fn = new Function('c', 'return (' + src + ')') } catch (e) { fn = () => false }
      predCache[src] = c => { try { return !!fn(c) } catch (e) { return false } }
    }
    return predCache[src]
  }

  /* ---------- 身份名 ---------- */
  const ID = {
    JUDGE: '法官', CLOWN: '小丑', SHIFTER: '变形者', SILENCER: '沉默者', SAINT: '圣女',
    SEER: '先知', FORTUNE: '占卜家', MAGICIAN: '魔术师', HANGED: '倒吊人', EXECUTOR: '执行者',
    CUPID: '丘比特', PUFFER: '河豚', IDIOT: '白痴', HOPE: '身怀希望之人', KNIGHT: '骑士',
  }

  /* ---------- 线索：证物卡短名（≤12 字）与地点 ---------- */
  const LABELS = {
    handprint: ['高处手印 约{v}cm', '低处手印', '齐肩手印'],
    woodprint: ['大码湿鞋渍', '小码鞋印', '中码泥印'],
    spareclothes: ['大码换洗衣', '小码换洗衣'],
    bloodshirt: ['{v}血衣', '女式血衣'],
    lipstick: ['杯沿唇印', '卫生巾包装纸', '卸妆油渍'],
    defense: ['防御伤与扼痕', '地板刮痕', '杯底药粉'],
    freezer: ['冷冻结硬', '球道重抹油', '手搓血衣'],
    coldpool: ['冷池浸尸', '蚕丝被裹尸', '热池泡尸'],
    vessel: ['大腿一刀', '颈侧一刀', '零乱刀伤'],
    furniture: ['家具严丝归位', '家具错位'],
    scrub: ['连缝擦净', '缝中残血'],
    gloves: ['手套污印', '少一双手套'],
    pipe: ['烟斗烟灰', '卷烟烟蒂'],
  }
  const isWood = room => /木|柚|枫|橡/.test(room.floorSurface || '')
  const isSuite = room => /套房/.test(room.name)
  // 变体与死因、现场是否相容（避免自相矛盾的现场）
  function compatible(tpl, vi, c) {
    const k = c.cause.id
    switch (tpl) {
      case 'vessel': return k === 'stab'
      case 'defense':
        if (vi === 0) return k === 'strangle'
        if (vi === 1) return ['strangle', 'blunt', 'stab', 'smother'].includes(k) && isWood(c.roomInfo)
        return ['smother', 'drown', 'alcohol', 'fall', 'stab', 'blunt'].includes(k)
      case 'coldpool': return k !== 'drown' || vi !== 2
      default: return true
    }
  }
  // 证物在哪里：room 现场 / body 尸体旁 / away 馆内别处（脚印通向门外）
  function placeOf(tpl, vi, room) {
    switch (tpl) {
      case 'woodprint':
        if (vi === 0) return isWood(room) ? ['room'] : ['away', '廊']
        return room.name === '珍稀花园' ? ['room'] : ['away', '珍稀花园']
      case 'spareclothes': return room.name === '洗衣布草室' ? ['room'] : ['away', '洗衣布草室']
      case 'bloodshirt': return isSuite(room) ? ['room'] : ['away', '套房']
      case 'freezer':
        if (vi === 0) return ['body']
        if (vi === 1) return room.name === '双道保龄球馆' ? ['room'] : ['away', '双道保龄球馆']
        return isSuite(room) ? ['room'] : ['away', '套房']
      case 'coldpool': case 'vessel': return ['body']
      case 'defense': return vi === 1 ? ['room'] : ['body']
      case 'gloves': return vi === 1 && room.name !== '工具修理室' ? ['away', '工具修理室'] : ['room']
      default: return ['room']
    }
  }
  function clueValue(tpl, vi, m) {
    if (tpl === 'handprint' && vi === 0) return String(Math.round((m.heightCm + 25) / 5) * 5)
    if (tpl === 'bloodshirt' && vi === 0) return m.gender === '女' ? '女式' : '男式'
    return ''
  }

  // 死因与房间（洋馆物理层 6、7.4；身体结算）
  const CAUSE_WEIGHT = { stab: 3, blunt: 3, strangle: 2, smother: 2, drown: 1.5, fall: 1, alcohol: 1, poison: 4, door: 4 }
  function roomFits(cause, room) {
    const all = (room.objects || []).concat(room.weapons || []).join('、') + room.name
    switch (cause) {
      case 'drown': return /池水|浴池|浴缸|泳池/.test(all)
      case 'alcohol': return /酒/.test(all)
      case 'fall': return /梯架|霸王龙|标本|拱架|天窗|骨架/.test(all)
      case 'door': return true
      default: return true
    }
  }

  /* ==========================================================
     对局
     ========================================================== */
  function create(opts = {}) {
    const data = {
      chars: opts.chars || (root.CHARACTERS || []),
      identities: opts.identities || ((root.WORLD && root.WORLD.identities) || []),
      lore: opts.lore || (root.LORE || {}),
      world: opts.world || (root.WORLD || {}),
    }
    const seed = opts.seed == null ? Math.floor(Math.random() * 2 ** 31) : opts.seed
    const r = rng(seed)
    const charMap = {}
    for (const c of data.chars) charMap[c.id] = c
    const seats = (opts.seats || []).slice(0, 15)
    while (seats.length < 15) seats.push(null)
    const order = []
    seats.forEach((id, i) => { if (id && charMap[id] && !order.includes(id)) order.push(id); else if (id && order.includes(id)) seats[i] = null })
    for (let i = 0; i < 15; i++) if (seats[i] && !charMap[seats[i]]) seats[i] = null

    const g = {
      seed, r, data, charMap, seats, order,
      player: opts.player && order.includes(opts.player) ? opts.player : null,
      spectator: false,
      people: {},
      minutes: opts.startMinutes == null ? 18 * 60 : opts.startMinutes, // 第一日 18:00：规则宣告之后
      caseNo: 0,
      mandated: null,
      mandateAt: null,
      trial: null,
      cases: [],
      notices: [],
      deaths: [],
      hooks: opts.hooks || null, // 可注入的 AI 决策（测试用），如 { ballot(g, T, V, voter, aiBallot) }
    }
    // 身份：十五组洗牌，每人一组（主持人游戏 一、五；运行规则 0）
    const groups = shuffle(r, data.identities)
    order.forEach((id, i) => {
      const grp = (opts.assign && opts.assign[id] && data.identities.find(x => x.front === opts.assign[id])) || groups[i % groups.length]
      g.people[id] = {
        id,
        seat: seats.indexOf(id) + 1,
        char: charMap[id],
        alive: true,
        inMansion: true,
        ident: makeIdent(grp),
        back: grp ? grp.back : null,
        lover: null,
        coinsTable: 0,
        coinsDesk: 0,
        puffSeat: null,
        fortuneDay: 0,
        deathAt: null,
        deathBy: null,
      }
    })
    return g
  }
  function makeIdent(grp) {
    return { no: grp ? grp.no : 0, name: grp ? grp.front : '', used: {}, noVote: false, wrongTarget: null }
  }
  const P = (g, id) => g.people[id]
  const charOf = (g, id) => g.charMap[id]
  const nameOf = (g, id) => (g.charMap[id] && g.charMap[id].name) || id
  const isLiving = (g, id) => !!(id && g.people[id] && g.people[id].alive && g.people[id].inMansion)
  const livingIds = g => g.order.filter(id => isLiving(g, id)).sort((a, b) => g.people[a].seat - g.people[b].seat)
  const dayOf = minutes => Math.floor(minutes / 1440) + 1
  const frontName = (g, id) => (g.people[id] ? g.people[id].ident.name : '')
  const silenced = (g, id) => !!(g.trial && !g.trial.ended && g.trial.silenced.includes(id))
  // 正位能力此刻是否生效（被沉默者封锁的不生效）
  const frontActive = (g, id, name) => isLiving(g, id) && frontName(g, id) === name && !silenced(g, id)
  const lineOf = (g, id, key, x) => {
    const c = charOf(g, id)
    const s = (c && c.lines && c.lines[key]) || ''
    return x ? s.replace(/\{X\}/g, nameOf(g, x)) : s
  }

  function notify(g, n) {
    if (!g.player || !isLiving(g, g.player)) return
    g.notices.push(Object.assign({ at: g.minutes }, n))
  }

  // 死亡：先知立即收到「有人死亡」（含主持人处刑）；河豚的中心席成为空席时解除
  function kill(g, id, how, at) {
    const p = P(g, id)
    if (!p || !p.alive) return
    p.alive = false
    p.deathAt = at == null ? g.minutes : at
    p.deathBy = how
    g.deaths.push({ id, how, at: p.deathAt })
    for (const sid of livingIds(g)) {
      if (frontActive(g, sid, ID.SEER) && sid === g.player) notify(g, { type: 'death', at: p.deathAt })
    }
    for (const q of Object.values(g.people)) if (q.puffSeat === p.seat) q.puffSeat = null
    if (g.mandated === id) g.mandated = null
  }

  /* ---------- 受命资格 ---------- */
  function validCauses(g, id) {
    const c = charOf(g, id)
    const p = P(g, id)
    const list = []
    const L = g.data.lore.causes || []
    for (const k of L) {
      if (k.id === 'poison' && p.back !== '女巫') continue
      if (k.id === 'door' && p.back !== '典狱长') continue
      if (c && c.canWalk === false && k.id !== 'poison' && k.id !== 'door') continue
      if (k.needs && !pred(k.needs)(c)) continue
      list.push(k)
    }
    return list
  }
  function eligibleMandate(g, id) {
    if (!isLiving(g, id) || id === g.player) return false
    if (frontName(g, id) === ID.SAINT) return false // 圣女不会被选中
    return validCauses(g, id).length > 0
  }
  function accompliceOf(g, id) {
    const p = P(g, id)
    return p && p.lover && isLiving(g, p.lover) ? p.lover : null
  }

  /* ==========================================================
     案件：受命 → 行凶 → 发现
     返回 {type:'case'|'final'|'stall'|'overdue', ...}
     ========================================================== */
  function newCase(g) {
    const living = livingIds(g)
    if (living.length <= 1) return { type: 'final', winner: living[0] || null }
    let m = isLiving(g, g.mandated) ? g.mandated : null
    if (!m) {
      const pool = living.filter(id => eligibleMandate(g, id))
      if (!pool.length) return { type: 'stall', at: g.minutes, living }
      m = pick(g.r, pool)
      g.mandated = m
      g.mandateAt = g.minutes
      const acc = accompliceOf(g, m)
      if (acc === g.player) notify(g, { type: 'accomplice', with: m })
    }
    if (g.mandateAt == null) g.mandateAt = g.minutes
    const deadline = g.mandateAt + 1440
    const victims = living.filter(id => id !== m && id !== g.player)
    if (!victims.length) {
      // 受命者逾期：公开受命者身份并处死；帮凶一同处死（主持人游戏 二、五·11）
      g.minutes = Math.max(g.minutes, deadline)
      const executed = [m]
      const acc = accompliceOf(g, m)
      if (acc) executed.push(acc)
      for (const id of executed) kill(g, id, 'overdue', deadline)
      g.mandated = null
      const c = { type: 'overdue', no: ++g.caseNo, mandated: m, executed, at: deadline }
      g.cases.push(c)
      return c
    }

    const causes = validCauses(g, m)
    const cause = weighted(g.r, causes.map(k => ({ v: k, w: CAUSE_WEIGHT[k.id] || 1 })))
    const roomsAll = Object.keys(g.data.lore.rooms || {}).map(k => Object.assign({ key: k }, g.data.lore.rooms[k])).filter(x => x.crimeScene)
    let rooms = roomsAll.filter(x => roomFits(cause.id, x))
    if (!rooms.length) rooms = roomsAll
    const roomInfo = pick(g.r, rooms)
    const plan = (g.data.world.rooms || []).find(w => w.floor === roomInfo.floor && w.name === roomInfo.name) || null
    const victim = pick(g.r, victims)
    const start = Math.max(g.minutes, g.mandateAt)
    const tMurder = Math.min(deadline - 30, start + randInt(g.r, 150, 840))
    g.minutes = tMurder
    kill(g, victim, 'murder', tMurder)

    const c = {
      type: 'case', no: ++g.caseNo, murderer: m, victim, cause, roomInfo, plan,
      tMandate: g.mandateAt, tMurder, tDiscover: null, tCourt: null,
      bell: P(g, m).back === '敲钟人', investMinutes: 120,
      discoverer: null, clues: [], spots: [], bodySeen: false, remaining: [],
    }
    g.cases.push(c)
    const after = livingIds(g)
    if (after.length <= 1) { c.lastStanding = after[0] || null; return c }

    // 有效发现：存活在馆、不是凶手的人看见尸体（主持人游戏 三）；不能行走者不去发现
    const finders = after.filter(id => id !== m)
    let pool = finders.filter(id => id !== g.player && charOf(g, id).canWalk !== false)
    if (!pool.length) pool = finders.filter(id => charOf(g, id).canWalk !== false)
    if (!pool.length) pool = finders
    c.discoverer = pick(g.r, pool)
    c.tDiscover = tMurder + randInt(g.r, 12, 190)
    c.investMinutes = c.bell ? 30 : 120 // 敲钟人：三十分钟
    c.tCourt = c.tDiscover + c.investMinutes
    g.minutes = c.tDiscover
    buildClues(g, c)
    buildSpots(g, c)
    buildWhere(g, c)
    return c
  }

  /* ---------- 线索生成：贪心排除，剩 1–2 名嫌疑人为止，最多四条 ---------- */
  function suspectsOf(g, c) {
    return livingIds(g).filter(id => id !== c.victim && !(id === g.player && isLiving(g, g.player)))
  }
  function buildClues(g, c) {
    const L = g.data.lore
    const m = charOf(g, c.murderer)
    const suspects = suspectsOf(g, c)
    const opts = []
    for (const t of L.clueTemplates || []) {
      const vs = [{ text: t.text, predicate: t.predicate, vi: 0 }].concat((t.variants || []).map((v, i) => ({ text: v.text, predicate: v.predicate, vi: i + 1 })))
      const ok = vs.filter(v => pred(v.predicate)(m) && compatible(t.id, v.vi, c))
      if (!ok.length) continue
      const v = pick(g.r, ok)
      const val = clueValue(t.id, v.vi, m)
      const labels = LABELS[t.id] || []
      const [place, awayTo] = placeOf(t.id, v.vi, c.roomInfo)
      opts.push({
        tpl: t.id, vi: v.vi, name: t.name, attribute: t.attribute, predicate: v.predicate,
        text: v.text.replace(/\{v\}/g, val),
        label: (labels[v.vi] || t.name).replace(/\{v\}/g, val),
        place, awayTo: awayTo || null, foundBy: null,
      })
    }
    const test = (o, id) => pred(o.predicate)(charOf(g, id))
    let remaining = suspects.slice()
    if (c.cause.needs) remaining = remaining.filter(id => pred(c.cause.needs)(charOf(g, id)))
    const chosen = []
    while (remaining.length > 2 && chosen.length < 4) {
      let bestN = 0, best = []
      for (const o of opts) {
        if (chosen.includes(o)) continue
        const n = remaining.filter(id => !test(o, id)).length
        if (n > bestN) { bestN = n; best = [o] } else if (n === bestN && n > 0) best.push(o)
      }
      if (!bestN) break
      const o = pick(g.r, best)
      chosen.push(o)
      remaining = remaining.filter(id => test(o, id))
    }
    // 不足三条时补足（仍然都对凶手为真）
    const rest = shuffle(g.r, opts.filter(o => !chosen.includes(o)))
      .sort((a, b) => suspects.filter(id => !test(b, id)).length - suspects.filter(id => !test(a, id)).length)
    while (chosen.length < 3 && rest.length) chosen.push(rest.shift())
    c.clues = shuffle(g.r, chosen).map((o, i) => Object.assign(o, { id: 'k' + i }))
    c.remaining = remaining
    return c.clues
  }

  /* ---------- 调查的文字：诱饵点、疑似线索、验尸、发现线索时的动作 ----------
     按陈设种类给出具体的描写；同一局里不重复（用尽才重来）。
     这些文字只用子随机数（subRng），不消耗 g.r，规则结果不受影响。 */
  function subRng(g, salt) { return rng(((g.seed >>> 0) ^ Math.imul((salt >>> 0) + 1, 0x9e3779b1)) >>> 0) }
  const FLAVOR_KINDS = [
    ['thing', /梯架|银幕/], ['coin', /金币/], ['lanes', /球道|置瓶机|保龄|球瓶|计分屏/], ['water', /泳池|浴池|喷泉/],
    ['basin', /浴缸|淋浴|盥洗台|洗手台|水槽|坐便器|内衬盆|洗涤台|水台$/], ['art', /挂毯|织锦|织画|解剖课|星月夜|十二庭|画架|画报/],
    ['rug', /毯|软垫|练习垫/], ['cloth', /床帘|窗帘|浴袍|长枕|油布|棉绳|胶带|软管|脏衣篮/], ['bed', /床(?!头)/],
    ['music', /钢琴|竖琴|四琴|谱架|音乐柜/], ['instrument', /放大镜|望远镜|六分仪|分规|量角仪|星盘|电子秤|温湿度表/], ['clock', /钟/],
    ['mirror', /镜/], ['window', /窗/], ['lamp', /灯|烛台/], ['plant', /兰$|金花茶|拱架/],
    ['book', /书柜|圣经|手稿|绢面本|笔匣|端砚|镇纸|书刊/], ['game', /棋|麻将|扑克|台球|球台|球拍|乒乓|计分牌|哑铃|划船机|力量架|扶杆|把杆/],
    ['tool', /刀|剪|钳|工具板|开瓶器|刷杆|救生杆|熨斗|缝纫机|急救箱/],
    ['machine', /洗衣机|烘干机|泵|过滤罐|水箱|冷冻柜|保鲜柜|咖啡机|投影机|电磁灶|洗碗机|总控柜|轮阀|电热座/],
    ['fixture', /插销|门铃|号码牌|编号锁|银钩|罗盘花|隔间|隔板|钥匙龛|酒款签/],
    ['vessel', /杯|壶|瓶|盘|罐|醒酒器|冰桶|盂|器皿|皂盒|花器|托盘/],
    ['exhibit', /像|雕|标本|骨架|化石|山子|礼器|皇冠|玉琮|地球仪|星球仪|太阳系仪|天球仪|切片|鲸牙|颅骨|凤蝶|极乐鸟|鹦鹉螺|屏风|霸王龙/],
    ['cabinet', /柜|架|格/], ['table', /桌|台|几|案|岛|车/], ['seat', /沙发|榻|椅|凳/],
  ]
  function flavorKind(name) {
    for (const [k, re] of FLAVOR_KINDS) if (re.test(name)) return k
    return 'thing'
  }
  const DECOY_TEXT = {
    rug: ['{O}的长毛顺着一个方向倒伏，像被人抚平过。', '掀开{O}一角：底下的玉面干干净净。', '{O}吸走了所有脚步声，毛里只有灰。', '{O}中央一处浅凹，是放过重物的旧印。', '{O}的流苏理得一丝不乱。', '手指插进{O}的毛里，是凉的。'],
    bed: ['{O}的被面铺得太平，像从没人睡过。', '{O}下的黑暗里，只有一层薄灰。', '枕上一道浅凹，早已凉透。', '掀开{O}的帷幔，里面只有叠好的被。', '{O}的床柱上搭着一件睡袍，口袋是空的。'],
    cloth: ['{O}叠得方方正正，折痕锋利。', '{O}垂着，下摆一动不动。', '抖开{O}——什么也没掉出来。', '{O}上有沉香的味道，很淡。'],
    basin: ['{O}是干的，排水口没有一根头发。', '{O}边沿一圈水渍，早已干成白印。', '{O}里映着手电的光，晃了一下就停了。', '{O}旁的毛巾叠得整齐，没有用过。', '拧开{O}的水——水声在空屋里格外响。'],
    water: ['{O}的水面很平，倒映着手电的光。', '{O}底什么也没有，只有灯影。', '{O}边的水渍一路干到了墙根。', '水温与刻度对得上，没人动过阀门。'],
    lanes: ['{O}的漆面光可鉴人，映出一道手电光。', '{O}停着，上一局的分数还挂在那里。', '{O}旁的球按号排好，一个不少。', '{O}上只有一道很旧的划痕。'],
    art: ['{O}里的人看着门口，不看你。', '{O}的框背后只有挂钩和灰。', '凑近{O}：颜料的裂纹里没有新东西。', '{O}微微倾斜，挂钩却是牢的。', '手电下，{O}的颜色忽然变了，又变回去。'],
    music: ['{O}合着盖，上面落着灰。', '按下一个键——声音在屋里转了一圈。', '{O}的弦都在，调子却低了半音。', '{O}旁的乐谱停在某一页，没有折角。'],
    clock: ['{O}还在走，和别处的钟差了几分钟。', '{O}的摆停在一侧——它停在{T}。', '{O}的指针一格一格地走，不快不慢。', '{O}的钥匙孔里没有钥匙。'],
    instrument: ['{O}的刻度停在一个没有意义的位置。', '{O}擦得很亮，镜筒里只有灰。', '{O}摆在原位，角度分毫不差。'],
    mirror: ['{O}里只有你和你的手电。', '{O}擦得太亮，一个指印都没有。', '侧光照过{O}：只有一层薄雾。', '{O}的银背边缘起了细斑，是旧的。'],
    window: ['{O}后面没有天光，只有一层背光。', '{O}的缝塞得死死的，一线风都没有。', '{O}上凝着薄雾，没有字，没有手印。', '{O}外什么也看不见。'],
    lamp: ['{O}亮着，灯罩是凉的——它一直这么亮。', '{O}的光晕里浮着细尘。', '{O}微微晃了一下。没有风。', '{O}的灯座积着一层匀匀的灰。'],
    plant: ['{O}的叶上挂着水珠，是滴灌留下的。', '{O}落了一片花瓣，边缘已经卷了。', '{O}的香气很重，盖住了别的味道。', '{O}下的泥土松软，只有园艺铲的齿痕。'],
    book: ['{O}合着，夹着一根旧书签。', '翻开{O}——一页页都空着。', '{O}上一本书略微凸出。推回去，严丝合缝。', '{O}散着旧纸与墨的气味。', '{O}上的灰被一本书的形状打断——书都在。'],
    game: ['{O}的残局停在中盘，谁也没赢。', '{O}摆得整整齐齐，像没开过局。', '{O}旁边少了一枚？数了两遍，没少。', '{O}摸上去是凉的，很久没人碰了。'],
    tool: ['{O}挂在原处，刃口干净，没有新磕碰。', '{O}位置上的灰尘轮廓与它严丝合缝。', '{O}收得整整齐齐，一件不少。', '{O}上一层薄油，防锈的。', '掂了掂{O}，又放回原处。'],
    machine: ['{O}没在运转，按钮上的灰没有断。', '{O}低低嗡了一声，又安静下来。', '打开{O}——空的，只有一股冷气。', '{O}的指示灯一明一暗，像在呼吸。', '{O}的门缝里什么也没夹。'],
    vessel: ['{O}是空的，壁上没有一点水痕。', '{O}里剩着冷掉的茶，结了一层膜。', '{O}倒扣着，底下一圈干净的印子。', '{O}擦得锃亮，映出一张变形的脸。', '轻敲{O}——声音清脆，没有裂。', '{O}里的水还满着，落了一点灰。'],
    exhibit: ['{O}的眼睛在手电下亮了一下。', '{O}的底座积着一层匀匀的灰。', '{O}的影子在墙上被拉得很长。', '{O}静静立着，什么也不肯说。', '凑近{O}：标签上的字已经褪色。',
      '绕着{O}走了一圈，没有一处新痕。', '{O}比看上去更冷，像刚从地下取出来。', '{O}的位置与地上的旧印分毫不差。'],
    fixture: ['{O}摸上去冰凉，没有手印。', '{O}好好的，没有撬过、碰过的痕迹。', '{O}纹丝不动，和别处的一样。', '{O}在手电下反着光，干干净净。'],
    coin: ['{O}码得整整齐齐，一枚不少。', '{O}两面都是一百。数了一遍，没人动过。', '{O}在手电下泛着暗光。'],
    cabinet: ['{O}的门虚掩着，里面码得整齐。', '拉开{O}的抽屉：空的，只有木香。', '{O}顶上的灰很匀，没人够上去过。', '{O}的把手是凉的，没有手印。', '{O}空着一格——那一格本来就空。', '{O}的锁孔里没有钥匙，也不需要。'],
    table: ['{O}上什么也没有，映着手电的光。', '{O}上一圈杯底的水印，早就干了。', '{O}的抽屉里只有一张空白的纸。', '{O}被挪过？不，地上的压痕是旧的。', '{O}的漆面有一道细长的旧划痕。', '{O}上的东西都在原处，像一幅静物。'],
    seat: ['{O}的坐垫还鼓着，没人坐过。', '{O}的扶手上搭着一条叠好的披肩。', '{O}底下什么也没有。', '{O}朝着门，像有人在这里等过谁。', '{O}偏了一点角度。地上的压痕是旧的。'],
    thing: ['{O}在原处，看不出被动过。', '{O}上只有灰。', '{O}，没有异样。', '看了很久。{O}就只是{O}。'],
  }
  // 氛围细节：接在描写后面（{M} 为本房间的氛围句，每间房一局只用一次）
  const DECOY_DETAIL = [
    '空气里一股淡淡的沉香味。', '远处有钟在走。', '灰尘落得很匀，没有指痕。', '脚下的玉面冰凉。', '门外好像有脚步声，停了。',
    '手电闪了一下，又稳住了。', '这里比走廊冷一点。', '墙后一声闷响，再没有了。', '一根头发也没有，干净得过分。', '你听见自己的心跳。',
    '香味散得很快，像刚有人路过。', '地面映着灯光，没有一个脚印。', '安静得能听见灰落下来。', '窗光不动，日影也不动。', '有一瞬间，像有人在背后。',
  ]
  // 疑似线索：先看见可疑的东西，细看之后无害
  const HERRINGS = [
    ['{O}边沿一抹暗红。', '凑近闻——是干掉的葡萄酒。'],
    ['{O}下压着一根长发。', '颜色对上了：是死者自己的。'],
    ['一道拖痕，从{O}延伸到墙边。', '挪动{O}留下的旧痕，积着灰。'],
    ['{O}后面塞着一团揉皱的纸。', '展开：一张空白的便笺。'],
    ['{O}旁躺着一枚金币。', '两面都是一百——谁都可能掉。'],
    ['{O}上一圈湿痕。', '杯底的水印，几个钟头前就在了。'],
    ['{O}脚下滚着一枚纽扣。', '线头早就朽了，是旧物上掉的。'],
    ['{O}上的灰被抹掉一块。', '圆形的——放过一只杯子。'],
    ['空气里一股刺鼻的味道。', '是{O}新上的蜡。'],
    ['{O}缝里卡着一片碎玻璃。', '边缘早已磨圆，是很久以前的。'],
    ['{O}后面一枚黄铜钥匙。', '是装饰件，打不开任何门。'],
    ['{O}上三道细长的划痕。', '划痕里积着旧灰，早于今天。'],
    ['{O}下一小撮白色粉末。', '捻开，是爽身粉。'],
    ['{O}底下压着半张撕下的纸。', '上面只有一行乐谱。'],
  ]
  // 验尸：按死因
  const BODY_TEXT = {
    stab: ['衣襟被血浸透，伤口边缘整齐。', '伤口不止一处，血已经发暗。', '身下一摊血，还留着倒下时的弧度。'],
    blunt: ['后脑塌陷，发间结着血块。', '额角重重一击，地上溅着细小的血点。', '一侧肋骨摸上去是断的。'],
    strangle: ['颈上一圈瘀紫，指痕叠着指痕。', '眼睑里布满针尖大的红点。', '领口被扯开，颈侧发青。'],
    smother: ['口鼻周围一圈压痕，唇色发绀。', '脸上没有伤，只有鼻梁一道浅压印。', '指甲里嵌着细小的织物纤维。'],
    poison: ['嘴角干着一线白沫，指甲发青。', '身旁倒着一只杯子，杯底还剩一口。', '死前抓过胸口，衣扣崩了一颗。'],
    drown: ['衣服湿透，口鼻一圈细白泡沫。', '指甲缝里有池壁的滑腻。', '头发湿贴在脸上，水还在往下滴。'],
    fall: ['四肢扭成不自然的角度，头先着地。', '断骨顶起了袖管。', '身下的地面裂开一道细纹。'],
    door: ['肩胸一道笔直的压痕，像被门扇夹住。', '身旁那扇门锁死了，推不动。', '手指伸向门缝，指甲劈了。'],
    alcohol: ['浓重的酒气，仰面，口鼻有呕吐物。', '身旁一只倒空的酒瓶。', '脸色紫红，衣襟上一片酒渍。'],
  }
  // 发现线索时的动作（无主语：玩家与旁观时的调查者都能用）
  const CLUE_LEAD = {
    room: ['手电压低，贴着地面扫过去——', '蹲下，侧过光——', '指尖拂过，停住了——', '换个角度再看一眼——', '屏住呼吸，凑近——'],
    body: ['翻过死者的手腕——', '俯身，屏住呼吸——', '掀开死者的衣角——', '拨开死者的头发——'],
    away: ['痕迹通向{TO}——', '顺着痕迹，一路走到{TO}——', '{TO}里，它就在那儿——', '追到{TO}，门虚掩着——'],
  }
  // 从一组里取一句本局没用过的（用尽才重来）
  function flavorPick(g, rr, tag, list) {
    const used = g.flavorUsed || (g.flavorUsed = {})
    const set = used[tag] || (used[tag] = [])
    let free = list.map((_, i) => i).filter(i => !set.includes(i))
    if (!free.length) { set.length = 0; free = list.map((_, i) => i) }
    const i = free[Math.floor(rr() * free.length)]
    set.push(i)
    return list[i]
  }
  const fillO = (s, o) => s.split('{O}').join(o)
  function decoyText(g, c, rr, object) {
    const kind = flavorKind(object)
    const seen = g.flavorSeen || (g.flavorSeen = new Set())
    let text = ''
    // 同一件陈设（同一间房再次成为现场）不说同一句；本类用尽时借用通用的说法
    for (let n = 0; n < 8 && (!text || seen.has(text)); n++) {
      const list = n < 6 ? DECOY_TEXT[kind] || DECOY_TEXT.thing : DECOY_TEXT.thing
      text = fillO(flavorPick(g, rr, 'd:' + (n < 6 ? kind : 'thing'), list), object)
    }
    seen.add(text)
    if (text.includes('{T}')) {
      const t = ((c.tDiscover + 200 + Math.floor(rr() * 700)) % 1440 + 1440) % 1440
      text = text.split('{T}').join(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'))
    }
    let detail = ''
    const moodKey = 'm:' + c.roomInfo.floor + c.roomInfo.name
    const used = g.flavorUsed || (g.flavorUsed = {})
    if (c.roomInfo.mood && !used[moodKey] && rr() < 0.35) { used[moodKey] = [1]; detail = c.roomInfo.mood + '。' }
    else if (rr() < 0.5) detail = flavorPick(g, rr, 'detail', DECOY_DETAIL)
    return { kind, text, detail }
  }

  /* ---------- 现场热点与耗时（洋馆物理层 8.3） ---------- */
  const DECOY_WORDS = ['如常', '无痕', '没有异样', '干净', '空']
  function buildSpots(g, c) {
    const pc = g.player && isLiving(g, g.player) ? charOf(g, g.player) : null
    const med = pc ? pc.stats.medical : '无'
    const obs = pc ? pc.stats.observation : '一般'
    const jit = () => randInt(g.r, -1, 2)
    // 每处细查五到二十分钟：检查尸体约 5—15 分钟（医护者更快），细查痕迹数分钟，追到别的房间另加步行与粗搜
    const cost = n => Math.min(20, Math.max(5, n))
    const rr = subRng(g, c.no * 7919 + 13)
    const spots = []
    spots.push({ id: 'body', kind: 'body', cost: cost((med === '有' ? 8 : med === '战场急救' ? 10 : 13) + jit()), done: false,
      obs: flavorPick(g, rr, 'b:' + c.cause.id, BODY_TEXT[c.cause.id] || ['']) })
    for (const k of c.clues) {
      let n = k.place === 'away' ? 18 : k.place === 'body' ? 8 : 7
      if (obs === '擅长' && k.place !== 'away') n -= 2
      const lead = flavorPick(g, rr, 'l:' + k.place, CLUE_LEAD[k.place] || CLUE_LEAD.room).split('{TO}').join(k.awayTo || '门外')
      spots.push({ id: k.id, kind: 'clue', clue: k, cost: cost(n + jit()), done: false, lead })
    }
    const objs = shuffle(g.r, (c.roomInfo.objects || []).slice())
    // 诱饵点：两到三处陈设，各有具体的描写；每案至多一处「疑似线索」
    const nDecoy = objs.length >= 4 ? 3 : Math.min(2, objs.length)
    const herringAt = rr() < 0.6 ? Math.floor(rr() * nDecoy) : -1
    objs.slice(0, nDecoy).forEach((o, i) => {
      const d = decoyText(g, c, rr, o)
      const s = { id: 'd' + i, kind: 'decoy', object: o, word: pick(g.r, DECOY_WORDS), cost: cost(6 + jit()), done: false, flavor: d.kind, desc: d.text, detail: d.detail }
      if (i === herringAt) {
        const h = flavorPick(g, rr, 'herring', HERRINGS)
        s.herring = { bait: fillO(h[0], o), truth: fillO(h[1], o) }
        s.cost = cost(s.cost + 2)
      }
      spots.push(s)
    })
    c.spots = spots
    return spots
  }
  function bodyStage(g, minutesSince) {
    const st = (g.data.lore.bodyStages || []).slice().sort((a, b) => a.minutes - b.minutes)
    let cur = st[0] || { text: '' }
    for (const s of st) if (minutesSince >= s.minutes) cur = s
    return cur.text
  }
  // 细查一处：消耗馆内时间，返回所得。by：调查者（缺省为玩家；旁观时为代为调查的人）
  function inspect(g, c, spotId, by) {
    const s = c.spots.find(x => x.id === spotId)
    if (!s || s.done) return null
    s.done = true
    const who = by || g.player
    const cost = Math.min(s.cost, Math.max(0, c.tCourt - g.minutes))
    g.minutes += cost
    const out = { spot: s, cost, by: who }
    if (s.kind === 'body') {
      c.bodySeen = true
      const pc = charOf(g, who)
      const since = g.minutes - c.tMurder
      out.cause = c.cause
      out.stage = bodyStage(g, since)
      out.obs = s.obs || ''
      if (pc && pc.stats.medical === '有') {
        const a = c.tMurder - randInt(g.r, 30, 75), b = c.tMurder + randInt(g.r, 30, 75)
        out.window = [a, b]
      }
    } else if (s.kind === 'clue') {
      s.clue.foundBy = who
      out.clue = s.clue
      out.lead = s.lead || ''
    } else {
      out.word = s.word
      out.desc = s.desc || s.object
      out.detail = s.detail || ''
      out.herring = s.herring || null
    }
    return out
  }
  function spend(g, c, minutes) {
    g.minutes = Math.min(c.tCourt, g.minutes + minutes)
    return c.tCourt - g.minutes
  }
  /* ---------- 去向：案发时每人在哪、对外怎么说（不在场陈述） ----------
     无辜者照实说（连同同在一处的人）；凶手若亲手行凶，就说自己在别处、且没有同伴——
     他说的那间房里若真有人，那人就能拆穿他。下毒与关门不必在场，凶手照实说。
     只用子随机数（subRng），不消耗 g.r。 */
  function buildWhere(g, c) {
    const rr = subRng(g, c.no * 104729 + 31)
    const L = g.data.lore.rooms || {}
    const all = Object.keys(L).map(k => L[k])
    const crime = c.roomInfo.name
    const common = all.filter(x => x.crimeScene && !/套房/.test(x.name) && x.name !== crime)
    const suiteOf = id => { const r = all.find(x => x.name === P(g, id).seat + '号套房'); return r && r.name !== crime ? r : null }
    const lying = !['poison', 'door'].includes(c.cause.id)
    const people = livingIds(g).filter(id => !(lying && id === c.murderer))
    const where = {}
    const taken = []
    for (const id of shuffle(rr, people)) {
      const walk = charOf(g, id).canWalk !== false
      const own = suiteOf(id)
      let room = null
      if (walk && taken.length && rr() < 0.3) room = taken[Math.floor(rr() * taken.length)]
      else if (own && rr() < (walk ? 0.38 : 0.75)) room = own
      else {
        const near = walk ? common : common.filter(x => own && x.floor === own.floor)
        const pool = near.length ? near : common
        room = pool[Math.floor(rr() * pool.length)] || own
      }
      if (!room) continue
      where[id] = { room: room.name, floor: room.floor }
      taken.push(room)
    }
    for (const id in where) {
      where[id].with = Object.keys(where).filter(o => o !== id && where[o].room === where[id].room)
      where[id].claim = { room: where[id].room, with: where[id].with.slice() }
      where[id].lie = false
    }
    if (lying && isLiving(g, c.murderer)) {
      const m = c.murderer
      const occupied = Array.from(new Set(Object.values(where).map(w => w.room)))
      const own = suiteOf(m)
      const x = rr()
      let lie
      if (x < 0.5 && occupied.length) lie = occupied[Math.floor(rr() * occupied.length)]
      else if (x < 0.8 && own) lie = own.name
      else {
        const free = common.filter(r => !occupied.includes(r.name))
        lie = (free.length ? free[Math.floor(rr() * free.length)] : common[Math.floor(rr() * common.length)] || { name: '走廊' }).name
      }
      where[m] = { room: crime, floor: c.roomInfo.floor, with: [], claim: { room: lie, with: [] }, lie: true }
    }
    c.where = where
    // 大家被问到的那个时刻：案发前后，取整到十分钟
    c.tAlibi = Math.round((c.tMurder + Math.floor(rr() * 31) - 15) / 10) * 10
    c.asked = []
    c.known = []
    return where
  }
  // a 说自己在某处；w 当时真在那里，却没和 a 在一起 → w 能拆穿 a
  function contradicts(c, a, w) {
    const A = c && c.where && c.where[a], W = c && c.where && c.where[w]
    if (!A || !W || a === w) return false
    return W.room === A.claim.room && !W.with.includes(a)
  }
  // 玩家在调查期询问一人：他照自己的说法交代去向；花费调查时间。与玩家所知相矛盾的说法被记下
  function interviewCost(g, id) {
    const pc = charOf(g, g.player), t = charOf(g, id)
    return 6 + (pc && pc.stats.readsPeople === '是' ? 0 : 2) + (t && t.stats.suspicion === '重' ? 2 : 0)
  }
  function interview(g, c, id) {
    if (!c.where || !c.where[id] || !g.player || id === g.player || !isLiving(g, id) || !isLiving(g, g.player)) return null
    if (c.asked.includes(id)) return null
    const left = Math.max(0, c.tCourt - g.minutes)
    if (left <= 0) return null
    const cost = Math.min(left, interviewCost(g, id))
    g.minutes += cost
    const w = c.where[id]
    const found = []
    const note = (liar, witness) => {
      if (!c.known.some(k => k.liar === liar && k.witness === witness)) { const k = { liar, witness }; c.known.push(k); found.push(k) }
    }
    if (contradicts(c, id, g.player)) note(id, g.player)
    for (const b of c.asked) {
      if (contradicts(c, id, b)) note(id, b)
      if (contradicts(c, b, id)) note(b, id)
    }
    c.asked.push(id)
    return { id, room: w.claim.room, with: w.claim.with.slice(), time: c.tAlibi, cost, conflicts: found }
  }


  /* ---------- 调查期内 AI 的秘密能力（不广播；条文规定的私人通知照常送达） ---------- */
  function aiInvestigation(g, c) {
    const ev = []
    const day = dayOf(g.minutes)
    const ais = livingIds(g).filter(id => id !== g.player)
    for (const id of ais) {
      const p = P(g, id)
      const nm = p.ident.name
      if (nm === ID.FORTUNE && p.fortuneDay !== day) {
        const t = pick(g.r, livingIds(g).filter(x => x !== id))
        if (t) { const r = fortune(g, id, t); if (r) ev.push({ type: 'fortune', actor: id, target: t }) }
      } else if (nm === ID.CUPID && !p.ident.used.cupid && chance(g.r, 0.55)) {
        const others = shuffle(g.r, livingIds(g).filter(x => x !== id))
        if (others.length >= 2) {
          const pair = chance(g.r, 0.5) ? [id, others[0]] : [others[0], others[1]]
          cupid(g, id, pair[0], pair[1])
          ev.push({ type: 'cupid', actor: id, pair })
        }
      } else if (nm === ID.MAGICIAN && !p.ident.used.magic && chance(g.r, 0.35)) {
        const others = shuffle(g.r, livingIds(g).filter(x => x !== id))
        if (others.length >= 2) {
          const pair = chance(g.r, 0.5) ? [id, others[0]] : [others[0], others[1]]
          magic(g, id, pair[0], pair[1])
          ev.push({ type: 'magic', actor: id, pair })
        }
      } else if (nm === ID.SHIFTER && chance(g.r, 0.8)) {
        const t = pick(g.r, livingIds(g).filter(x => x !== id && frontName(g, x) !== ID.SHIFTER))
        if (t) { shapeshift(g, id, t); ev.push({ type: 'shift', actor: id, target: t }) }
      }
    }
    return ev
  }

  /* ---------- 审判流程外的能力 ---------- */
  // 占卜家：每天一次，得知当前正位身份名；被查验者获知自己的身份已被知悉
  function fortune(g, actor, target) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.FORTUNE || !isLiving(g, target)) return null
    const day = dayOf(g.minutes)
    if (p.fortuneDay === day) return null
    p.fortuneDay = day
    if (target === g.player && actor !== g.player) notify(g, { type: 'known' })
    return { target, name: frontName(g, target) }
  }
  // 变形者：复制对方当前正位（含使用状态与代价）
  function shapeshift(g, actor, target) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.SHIFTER || !isLiving(g, target) || actor === target) return null
    const src = P(g, target).ident
    p.ident = JSON.parse(JSON.stringify(src))
    return { name: p.ident.name }
  }
  // 魔术师：先消耗，再交换两人当前正位（含次数、代价）；逆位、受命、关系不随之交换
  function magic(g, actor, a, b) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.MAGICIAN || p.ident.used.magic) return null
    if (!isLiving(g, a) || !isLiving(g, b) || a === b) return null
    p.ident.used.magic = true
    const A = P(g, a), B = P(g, b)
    const t = A.ident; A.ident = B.ident; B.ident = t
    if (g.player === a && actor !== g.player) notify(g, { type: 'swap', name: A.ident.name })
    if (g.player === b && actor !== g.player) notify(g, { type: 'swap', name: B.ident.name })
    return { a: A.ident.name, b: B.ident.name }
  }
  // 丘比特：指定两名存活在馆角色成为恋人；一方为受命者时另一方成为帮凶并收到通知
  function cupid(g, actor, a, b) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.CUPID || p.ident.used.cupid) return null
    if (!isLiving(g, a) || !isLiving(g, b) || a === b) return null
    p.ident.used.cupid = true
    P(g, a).lover = b
    P(g, b).lover = a
    if (g.player === a) notify(g, { type: 'lover', with: b, name: frontName(g, b) })
    if (g.player === b) notify(g, { type: 'lover', with: a, name: frontName(g, a) })
    if (g.mandated === a && g.player === b) notify(g, { type: 'accomplice', with: a })
    if (g.mandated === b && g.player === a) notify(g, { type: 'accomplice', with: b })
    return { a, b }
  }

  /* ==========================================================
     开庭
     ========================================================== */
  // 调查期里玩家没找到的线索，由他人以一半的概率找到；尸体由发现者查看过
  function courtOpen(g, c, p = 0.5) {
    g.minutes = Math.max(g.minutes, c.tCourt)
    const shared = []
    let finders = livingIds(g).filter(id => id !== g.player && id !== c.murderer)
    if (!finders.length) finders = livingIds(g).filter(id => id !== g.player)
    for (const k of c.clues) {
      if (k.foundBy) continue
      if (finders.length && (g.spectator || !isLiving(g, g.player) || chance(g.r, p))) {
        k.foundBy = pick(g.r, finders)
        shared.push(k)
      }
    }
    let body = null
    if (!c.bodySeen) { c.bodySeen = true; body = { by: c.discoverer, stage: bodyStage(g, c.tCourt - c.tMurder) } }
    return { shared, body }
  }
  function knownClues(c) {
    const ks = c.clues.filter(k => k.foundBy)
    if (c.cause.needs) ks.push({ id: 'cause', predicate: c.cause.needs })
    return ks
  }
  function matches(g, c, id) {
    const ch = charOf(g, id)
    return knownClues(c).reduce((n, k) => n + (pred(k.predicate)(ch) ? 1 : 0), 0)
  }
  function testClue(g, clue, id) { return pred(clue.predicate)(charOf(g, id)) }

  function openTrial(g, c) {
    const T = {
      case: c, murderer: c.murderer, victim: c.victim,
      phase: 'debate', noResult: 0, misjudge: 0, ended: false, solved: false, endReason: null,
      tieBan: [], hopeBan: null, idiotOut: [], silenced: [],
      used: { hanged: {}, silencer: {}, puffer: {} },
      knownMurderer: null, accuse: {}, noise: {}, puffInfo: {}, decoy: null,
      queue: [], votes: 0, vote: null, log: [],
      agree: {}, doubt: {}, exposed: {}, claimed: {}, lastMode: null,
    }
    for (const a of livingIds(g)) {
      const ch = charOf(g, a)
      let sd = 1.1
      if (ch.stats.readsPeople === '是') sd *= 0.6
      if (ch.stats.observation === '擅长') sd *= 0.6
      T.noise[a] = {}
      for (const t of livingIds(g)) if (t !== a) T.noise[a][t] = gauss(g.r) * sd
      T.accuse[a] = []
    }
    g.trial = T
    g.minutes = Math.max(g.minutes, c.tCourt)
    return T
  }

  /* ---------- AI 的怀疑度：符合线索条数 + 噪声 + 旁人指认 + 已知事实 ---------- */
  function suspicion(g, T, a, t) {
    if (T.knownMurderer) return t === T.knownMurderer ? 100 : (T.noise[a][t] || 0) * 0.1
    let s = matches(g, T.case, t) + ((T.noise[a] && T.noise[a][t]) || 0)
    const by = (T.accuse[t] || []).filter(x => x !== a)
    s += 0.32 * by.length
    // 旁人的附议与质疑、被当众拆穿的谎
    if (T.agree) s += 0.15 * (T.agree[t] || []).filter(x => x !== a).length
    if (T.doubt) s -= 0.12 * (T.doubt[t] || []).filter(x => x !== a).length
    if (T.exposed && T.exposed[t]) s += 1.6
    const pi = T.puffInfo[a]
    if (pi) {
      const nb = neighborsOf(g, pi.seat)
      if (nb.includes(t)) s += pi.yes ? 0.9 : -2
    }
    return s
  }
  function ranked(g, T, a, pool) {
    return pool.filter(t => t !== a).map(t => ({ t, s: suspicion(g, T, a, t) })).sort((x, y) => y.s - x.s)
  }
  // 凶手把怀疑引向最符合线索的旁人
  function decoyOf(g, T, pool) {
    const cands = (pool || livingIds(g)).filter(id => id !== T.murderer && isLiving(g, id))
    if (!cands.length) return null
    if (T.decoy && cands.includes(T.decoy)) return T.decoy
    let best = -1, list = []
    for (const id of cands) {
      const n = matches(g, T.case, id)
      if (n > best) { best = n; list = [id] } else if (n === best) list.push(id)
    }
    const d = pick(g.r, list)
    if (!pool) T.decoy = d
    return d
  }
  function neighborsOf(g, seat) {
    const l = ((seat - 2 + 15) % 15) + 1, r = (seat % 15) + 1
    const out = []
    for (const s of [l, r]) { const id = g.seats[s - 1]; if (id && isLiving(g, id)) out.push(id) }
    return out
  }

  /* ---------- 辩论期间的能力 ---------- */
  function hasVoteRight(g, T, id) {
    return isLiving(g, id) && !P(g, id).ident.noVote && !T.idiotOut.includes(id)
  }
  // 骑士：公开揭发（仅一次）；失败则骑士身份永久失去投票权，并记下被错指者
  function knight(g, T, actor, target) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.KNIGHT || p.ident.used.knight || !isLiving(g, target) || T.phase !== 'debate') return null
    p.ident.used.knight = true
    if (silenced(g, actor)) return { actor, target, silenced: true }
    const success = target === T.murderer
    if (success) T.knownMurderer = target
    else { p.ident.noVote = true; p.ident.wrongTarget = target }
    return { actor, target, success }
  }
  // 沉默者：每次审判一次，秘密封锁一人的正位能力至本场结束
  function silence(g, T, actor, target) {
    if (frontName(g, actor) !== ID.SILENCER || T.used.silencer[actor] || !isLiving(g, target) || T.phase !== 'debate') return null
    T.used.silencer[actor] = true
    if (silenced(g, actor)) return { actor, target, void: true }
    if (!T.silenced.includes(target)) T.silenced.push(target)
    return { actor, target }
  }
  // 河豚：选一个有人的席位（除非成为空席，否则不可变更）；每次审判查询一次左右相邻席
  function pufferChoose(g, actor, seat) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.PUFFER) return false
    if (p.puffSeat && g.seats[p.puffSeat - 1] && isLiving(g, g.seats[p.puffSeat - 1])) return false
    const id = g.seats[seat - 1]
    if (!id || !isLiving(g, id)) return false
    p.puffSeat = seat
    return true
  }
  function puffer(g, T, actor) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.PUFFER || T.used.puffer[actor] || !p.puffSeat || T.phase !== 'debate') return null
    T.used.puffer[actor] = true
    if (silenced(g, actor)) return { actor, seat: p.puffSeat, void: true, yes: false }
    const yes = neighborsOf(g, p.puffSeat).includes(T.murderer)
    T.puffInfo[actor] = { seat: p.puffSeat, yes }
    return { actor, seat: p.puffSeat, yes }
  }
  function canUse(g, T, id, type, V) {
    if (!isLiving(g, id)) return false
    const p = P(g, id)
    const nm = p.ident.name
    const day = dayOf(g.minutes)
    switch (type) {
      case 'knight': return nm === ID.KNIGHT && !p.ident.used.knight && T && T.phase === 'debate' && !T.ended
      case 'executor': return nm === ID.EXECUTOR && !p.ident.used.executor && T && T.phase === 'debate' && !T.ended
      case 'silencer': return nm === ID.SILENCER && T && !T.used.silencer[id] && T.phase === 'debate' && !T.ended
      case 'puffer': return nm === ID.PUFFER && T && !T.used.puffer[id] && T.phase === 'debate' && !T.ended
      case 'judge': return nm === ID.JUDGE && V && V.kind === 'normal' && !V.settled && !V.judges.some(j => j.actor === id)
      case 'hanged': return nm === ID.HANGED && V && V.kind === 'normal' && !V.settled && !T.used.hanged[id] && V.ballots.some(b => b.target === id && b.voter !== id)
      case 'fortune': return nm === ID.FORTUNE && p.fortuneDay !== day && !T
      case 'shifter': return nm === ID.SHIFTER && !T
      case 'magician': return nm === ID.MAGICIAN && !p.ident.used.magic && !T
      case 'cupid': return nm === ID.CUPID && !p.ident.used.cupid && !T
      default: return false
    }
  }
  // 玩家在辩论中发动的能力进入队列，由流程在下一个检查点结算
  function request(T, act) { T.queue.push(act) }

  /* ==========================================================
     投票（主持人游戏 三：辩论与投票、平票、误判与结束）
     ========================================================== */
  function beginVote(g, T, kind = 'normal', extra = {}) {
    const living = livingIds(g)
    const voters = living.filter(id => hasVoteRight(g, T, id) && (kind === 'special' || !T.tieBan.includes(id)))
    const targets = kind === 'special' ? living.slice() : living.filter(id => !T.idiotOut.includes(id) && id !== T.hopeBan)
    const V = Object.assign({
      kind, round: ++T.votes, voters, targets, ballots: [], judges: [], reflect: null, settled: false,
      banned: kind === 'normal' ? T.tieBan.slice() : [], hopeBan: kind === 'normal' ? T.hopeBan : null,
    }, extra)
    T.vote = V
    T.phase = kind === 'special' ? 'special' : 'vote'
    return V
  }
  // 恋人同票：双方都有投票权时，以先投票者的选择为准（弃票作为自投参与约束）
  function forcedTarget(g, T, V, voter) {
    const lover = P(g, voter).lover
    if (!lover || !V.voters.includes(lover) || !V.voters.includes(voter)) return null
    const b = V.ballots.find(x => x.voter === lover)
    if (!b || !b.target) return null
    return V.kind === 'special' || V.targets.includes(b.target) ? b.target : null
  }
  function cast(g, T, V, voter, target) {
    if (V.settled || !V.voters.includes(voter) || V.ballots.some(b => b.voter === voter)) return null
    const forced = forcedTarget(g, T, V, voter)
    let t = forced || target || voter // 弃票按自投结算
    if (!V.targets.includes(t)) t = V.targets.includes(voter) ? voter : null
    const b = { voter, target: t, forced: !!forced, abstain: !forced && (!target || target === voter) }
    V.ballots.push(b)
    return b
  }
  function aiBallot(g, T, V, voter) {
    const forced = forcedTarget(g, T, V, voter)
    if (forced) return forced
    const pool = V.targets.filter(t => t !== voter)
    if (!pool.length) return voter
    if (V.kind === 'special') {
      if (voter === T.murderer) return V.target !== voter ? V.target : (decoyOf(g, T, pool) || voter)
      const rk = ranked(g, T, voter, pool)
      // 被表决的人自己：自投与弃票都会算作投给指定对象，所以改投旁人
      if (voter === V.target) return rk.length ? rk[0].t : voter
      const sT = suspicion(g, T, voter, V.target)
      return rk.length && sT >= rk[0].s - 0.6 ? V.target : voter
    }
    if (voter === T.murderer) return decoyOf(g, T, pool) || pick(g.r, pool)
    const rk = ranked(g, T, voter, pool)
    return rk.length ? rk[0].t : voter
  }
  // AI 的一票：可由 g.hooks.ballot 接管（测试用），否则按 aiBallot
  function ballotOf(g, T, V, voter) {
    return g.hooks && g.hooks.ballot ? g.hooks.ballot(g, T, V, voter, aiBallot) : aiBallot(g, T, V, voter)
  }
  // 法官：普通投票期间秘密指定一人 +1
  function judge(g, T, V, actor, target) {
    if (!V || V.settled || V.kind !== 'normal' || frontName(g, actor) !== ID.JUDGE || !isLiving(g, actor)) return null
    if (V.judges.some(j => j.actor === actor) || !V.targets.includes(target)) return null
    const j = { actor, target, effective: !silenced(g, actor) }
    V.judges.push(j)
    return j
  }
  // 倒吊人：每次审判一次，把另一人投给本人的一张基础票反弹给原投票者
  function reflect(g, T, V, actor, voter) {
    if (!V || V.settled || V.kind !== 'normal' || frontName(g, actor) !== ID.HANGED || !isLiving(g, actor)) return null
    if (T.used.hanged[actor] || voter === actor) return null
    if (!V.ballots.some(b => b.voter === voter && b.target === actor)) return null
    T.used.hanged[actor] = true
    V.reflect = { hanged: actor, voter, effective: !silenced(g, actor) }
    return V.reflect
  }
  function aiVoteAbilities(g, T, V) {
    const out = []
    if (V.kind !== 'normal') return out
    for (const id of livingIds(g)) {
      if (id === g.player) continue
      const nm = frontName(g, id)
      if (nm === ID.JUDGE && !V.judges.some(j => j.actor === id)) {
        const b = V.ballots.find(x => x.voter === id)
        let t = b && b.target !== id ? b.target : null
        if (id === T.murderer) t = decoyOf(g, T, V.targets.filter(x => x !== id))
        if (!t) { const rk = ranked(g, T, id, V.targets); t = rk.length ? rk[0].t : null }
        if (t) { const j = judge(g, T, V, id, t); if (j) out.push({ type: 'judge', actor: id }) }
      }
      if (nm === ID.HANGED && !T.used.hanged[id] && !V.reflect) {
        const base = {}
        for (const b of V.ballots) if (b.target) base[b.target] = (base[b.target] || 0) + 1
        const mine = base[id] || 0
        const top = Math.max(0, ...Object.values(base))
        const against = V.ballots.find(b => b.target === id && b.voter !== id)
        if (against && mine >= top - 1 && mine >= 1) {
          const r = reflect(g, T, V, id, against.voter)
          if (r) out.push({ type: 'reflect', actor: id })
        }
      }
    }
    return out
  }

  /* ---------- 计票（纯函数）：①基础票 ②反弹与修正 ④确定结果 ---------- */
  function tally({ ballots = [], judges = [], clowns = [], reflect = null, knightBonus = [], candidates }) {
    const base = {}, totals = {}
    const cand = candidates || Array.from(new Set(ballots.map(b => b.target).filter(Boolean)))
    for (const c of cand) base[c] = 0
    for (const b of ballots) if (b.target && b.target in base) base[b.target]++
    Object.assign(totals, base)
    const steps = []
    // 倒吊人：只反弹他人投来的基础票；自投与能力加的票不能反弹
    if (reflect && reflect.effective !== false && reflect.voter !== reflect.hanged &&
      ballots.some(b => b.voter === reflect.voter && b.target === reflect.hanged) && reflect.hanged in totals) {
      totals[reflect.hanged]--
      if (reflect.voter in totals) totals[reflect.voter]++
      steps.push({ kind: 'reflect', from: reflect.hanged, to: reflect.voter })
    }
    for (const j of judges) {
      if (j.effective === false || !(j.target in totals)) continue
      totals[j.target]++
      steps.push({ kind: 'judge', target: j.target })
    }
    for (const c of clowns) {
      if (!(c in totals)) continue
      totals[c]--
      steps.push({ kind: 'clown', target: c })
    }
    for (const k of knightBonus) {
      if (!(k.knight in totals)) continue
      if (ballots.some(b => b.voter === k.accuser && b.target === k.knight)) { totals[k.knight]++; steps.push({ kind: 'knight', target: k.knight }) }
    }
    const ids = Object.keys(totals)
    const max = ids.length ? Math.max(...ids.map(i => totals[i])) : 0
    const top = ids.filter(i => totals[i] === max)
    // 最终正票数的唯一最高者形成有效选择；负票保留不归零；最高票不大于零视为无结果
    const result = top.length === 1 && max > 0 ? top[0] : null
    return { base, totals, max, top, result, tie: top.length > 1, steps }
  }

  function settle(g, T, V) {
    V.settled = true
    if (V.kind === 'special') {
      // 执行者特殊表决：只数投给指定对象的有效基础票；不受加减票与反弹影响；
      // 超过本场存活在馆参与者总数的一半（无投票权者计入总数）
      const count = V.ballots.filter(b => b.target === V.target).length
      const total = livingIds(g).length
      const passed = count > total / 2
      V.result = { outcome: passed ? 'pass' : 'fail', count, total, need: Math.floor(total / 2) + 1, pending: passed ? V.target : null }
      T.phase = passed ? 'pending' : 'debate'
      return V.result
    }
    const clowns = livingIds(g).filter(id => frontActive(g, id, ID.CLOWN))
    const knightBonus = livingIds(g).filter(id => P(g, id).ident.wrongTarget).map(id => ({ knight: id, accuser: P(g, id).ident.wrongTarget }))
    const r = tally({ ballots: V.ballots, judges: V.judges, clowns, reflect: V.reflect, knightBonus, candidates: V.targets })
    // 本次投票结束：并列者禁投、希望之人的排除都只管「紧接着的一次」
    T.tieBan = []
    T.hopeBan = null
    if (r.result) {
      T.noResult = 0
      V.result = Object.assign({ outcome: 'unique', pending: r.result }, r)
      T.phase = 'pending'
    } else {
      T.noResult++
      if (T.noResult >= 2) {
        T.ended = true
        T.endReason = 'noresult'
        V.result = Object.assign({ outcome: 'end' }, r)
        T.phase = 'ended'
      } else {
        if (r.tie) T.tieBan = r.top.filter(id => isLiving(g, id))
        V.result = Object.assign({ outcome: r.tie ? 'tie' : 'none' }, r)
        T.phase = 'vote'
      }
    }
    return V.result
  }

  /* ---------- 唯一待处刑者：先白痴，再身怀希望之人，最后裁决 ---------- */
  function idiotHolder(g, T, pending) {
    const p = P(g, pending)
    return p && p.ident.name === ID.IDIOT && !p.ident.used.idiot ? pending : null
  }
  function useIdiot(g, T, pending) {
    const p = P(g, pending)
    if (idiotHolder(g, T, pending) !== pending) return null
    p.ident.used.idiot = true
    if (silenced(g, pending)) return { effect: 'void', holder: pending }
    if (pending === T.murderer) { T.knownMurderer = pending; return { effect: 'fail', holder: pending } }
    T.idiotOut.push(pending)
    T.phase = 'vote'
    return { effect: 'cancel', holder: pending }
  }
  function hopeHolders(g, T, pending) {
    return livingIds(g).filter(id => id !== pending && frontName(g, id) === ID.HOPE && !P(g, id).ident.used.hope)
  }
  function useHope(g, T, holder, pending) {
    if (!hopeHolders(g, T, pending).includes(holder)) return null
    P(g, holder).ident.used.hope = true
    if (silenced(g, holder)) return { effect: 'void', holder }
    T.hopeBan = pending
    T.phase = 'vote'
    return { effect: 'cancel', holder, pending }
  }
  function aiIdiot(g, T, pending) { return pending !== T.murderer }
  function aiHope(g, T, holder, pending) {
    if (holder === T.murderer || T.knownMurderer === pending) return false
    const rk = ranked(g, T, holder, livingIds(g))
    if (!rk.length) return false
    const sp = suspicion(g, T, holder, pending)
    return sp < rk[0].s - 1 && chance(g.r, 0.85)
  }
  function verdict(g, T, pending, via) {
    const correct = pending === T.murderer
    const executed = [pending]
    if (correct) {
      T.solved = true
      T.ended = true
      T.endReason = 'solved'
      const acc = accompliceOf(g, pending)
      if (acc) executed.push(acc) // 帮凶连坐
    } else {
      T.misjudge++
      if (via && via.kind === 'special' && isLiving(g, via.actor)) P(g, via.actor).ident.noVote = true // 执行者的代价
      if (T.misjudge >= 2) { T.ended = true; T.endReason = 'misjudge' }
    }
    for (const id of executed) kill(g, id, 'executed', g.minutes)
    // 一组处刑及其连坐全部结算完毕后判断胜者（主持人游戏 六）：只剩一人或无人，本场到此为止
    if (!T.ended && livingIds(g).length <= 1) { T.ended = true; T.endReason = 'last' }
    T.phase = T.ended ? 'ended' : 'vote'
    return { correct, pending, executed, misjudge: T.misjudge, ended: T.ended }
  }

  /* ---------- 审判结束：金币（主持人游戏 八） ---------- */
  function closeTrial(g, T) {
    T.ended = true
    T.phase = 'ended'
    const table = {}, desk = {}
    for (const id of livingIds(g)) {
      table[id] = T.solved ? 10 : 5
      P(g, id).coinsTable += table[id]
    }
    if (!T.solved && isLiving(g, T.murderer)) {
      desk[T.murderer] = 10
      P(g, T.murderer).coinsDesk += 10
    }
    T.case.result = { solved: T.solved, reason: T.endReason, misjudge: T.misjudge }
    // 存活在馆的现任受命者重新取得完整二十四小时
    if (isLiving(g, g.mandated)) g.mandateAt = g.minutes
    g.trial = null
    return { table, desk, solved: T.solved }
  }
  function winner(g) {
    const l = livingIds(g)
    if (l.length === 1) return l[0]
    if (l.length === 0) return 'none'
    return null
  }

  /* ==========================================================
     AI 辩论
     ========================================================== */
  const ACCUSE_P = { 重: 0.78, 中: 0.5, 轻: 0.3 }
  function aiDebate(g, T, id) {
    const out = { speaker: id, kind: 'statement', target: null, ability: null }
    const ch = charOf(g, id)
    const pool = livingIds(g).filter(x => x !== id)
    if (!pool.length) return out
    const isM = id === T.murderer
    const rk = ranked(g, T, id, pool)
    const top = rk[0], margin = rk.length > 1 ? rk[0].s - rk[1].s : 9
    const nm = frontName(g, id)
    // 公开能力
    if (nm === ID.KNIGHT && !P(g, id).ident.used.knight && !isM && !T.knownMurderer && top && margin >= 1 && chance(g.r, 0.5)) {
      out.ability = { type: 'knight', target: top.t }
    } else if (nm === ID.EXECUTOR && !P(g, id).ident.used.executor && !T.knownMurderer) {
      if (isM && chance(g.r, 0.22)) { const d = decoyOf(g, T); if (d) out.ability = { type: 'executor', target: d } }
      else if (!isM && top && margin >= 1.3 && chance(g.r, 0.35)) out.ability = { type: 'executor', target: top.t }
    }
    // 秘密能力
    if (nm === ID.SILENCER && !T.used.silencer[id] && chance(g.r, 0.65)) {
      const t = isM ? (g.player && isLiving(g, g.player) && chance(g.r, 0.5) ? g.player : pick(g.r, pool)) : top && top.t
      if (t) silence(g, T, id, t)
    }
    if (nm === ID.PUFFER && !T.used.puffer[id]) {
      const p = P(g, id)
      if (!p.puffSeat && top) {
        // 查询的是中心席的左右邻席，所以把中心选在头号嫌疑人的旁边
        const s0 = P(g, top.t).seat
        const adj = [((s0 - 2 + 15) % 15) + 1, (s0 % 15) + 1].filter(s => g.seats[s - 1] && isLiving(g, g.seats[s - 1]))
        pufferChoose(g, id, adj.length ? pick(g.r, adj) : s0)
      }
      if (p.puffSeat) puffer(g, T, id)
    }
    // 发言
    if (T.knownMurderer && T.knownMurderer !== id) { out.kind = 'accuse'; out.target = T.knownMurderer }
    else if (isM) {
      const d = decoyOf(g, T)
      if (d && chance(g.r, 0.7)) { out.kind = 'accuse'; out.target = d }
    } else if (top && top.s > 0.5 && chance(g.r, ACCUSE_P[ch.stats.suspicion] || 0.45)) {
      out.kind = 'accuse'; out.target = top.t
    }
    // 指认时手里有相符的证据就出示；不指认时，发言在一般看法、交代去向、谈线索、保留之间轮换
    if (out.kind === 'accuse') out.clue = clueFor(g, T, id, out.target, false)
    else {
      out.say = speechMode(g, T, id)
      if (out.say === 'clue') out.clue = pick(g.r, ownClues(T, id))
    }
    return out
  }
  function recordAccuse(T, accuser, target) {
    if (!T.accuse[target]) T.accuse[target] = []
    if (!T.accuse[target].includes(accuser)) T.accuse[target].push(accuser)
  }
  const clueInfo = k => (k ? { id: k.id, name: k.name, label: k.label, tpl: k.tpl, text: k.text } : null)
  const ownClues = (T, id) => (T.case.clues || []).filter(k => k.foundBy === id)
  const canAlibi = (T, id) => !!(T.case.where && T.case.where[id]) && !T.claimed[id]
  // 能对 target 出示的证据：已发现、且与 target 相符；先用自己找到的。mine：玩家（证物栏里的都算他手里的）
  function clueFor(g, T, id, target, mine) {
    const ch = charOf(g, target)
    const ks = (T.case.clues || []).filter(k => k.foundBy && pred(k.predicate)(ch))
    if (!ks.length) return null
    const own = ks.filter(k => k.foundBy === id)
    if (own.length) return pick(g.r, own)
    return mine || chance(g.r, 0.45) ? pick(g.r, ks) : null
  }
  function speechMode(g, T, id) {
    const opts = [{ v: 'statement', w: 4.4 }, { v: 'silent', w: 0.9 }]
    if (canAlibi(T, id)) opts.push({ v: 'alibi', w: id === T.murderer ? 1.4 : 2.4 })
    if (ownClues(T, id).length) opts.push({ v: 'clue', w: 2.4 })
    for (const o of opts) if (o.v === T.lastMode) o.w *= 0.3
    return weighted(g.r, opts)
  }
  // 被指认者怎么回应：辩解、反咬指认者、或交代去向（凶手更爱反咬；怀疑指认者的人也会反咬）
  function aiRespond(g, T, id, accuser) {
    if (T.knownMurderer === id) return chance(g.r, 0.5) ? 'counter' : 'defend'
    const opts = []
    if (id === T.murderer) opts.push({ v: 'counter', w: 4.5 }, { v: 'defend', w: 2 })
    else {
      const rk = ranked(g, T, id, livingIds(g))
      const w = rk.length && rk[0].t === accuser ? 4 : suspicion(g, T, id, accuser) > 1 ? 2.2 : 0.8
      opts.push({ v: 'counter', w }, { v: 'defend', w: 3 })
    }
    if (canAlibi(T, id)) opts.push({ v: 'alibi', w: 3.2 })
    return weighted(g.r, opts)
  }
  // 指认之后旁人插话：0—2 人附议或质疑。嫌疑越重越容易被附议；凶手乐于附和别人对旁人的指认；恋人护着对方
  function aiInterject(g, T, accuser, target) {
    const pool = livingIds(g).filter(x => x !== accuser && x !== target && x !== g.player)
    if (!pool.length) return []
    const n = weighted(g.r, [{ v: 0, w: 3 }, { v: 1, w: 4.6 }, { v: 2, w: 2.4 }])
    if (!n) return []
    const cands = []
    const nTarget = matches(g, T.case, target)
    for (const a of pool) {
      let stance = null, w = 0
      if (T.knownMurderer === target) { stance = 'agree'; w = 1 }
      else if (P(g, a).lover === target) { stance = 'doubt'; w = 2.5 }
      else if (a === T.murderer) { stance = 'agree'; w = 1.6 + 0.4 * nTarget }
      else {
        const rk = ranked(g, T, a, livingIds(g))
        const sT = suspicion(g, T, a, target), top = rk.length ? rk[0].s : 0
        if (sT >= top - 0.6 && sT > 0.3) { stance = 'agree'; w = 0.7 + (sT - top + 0.6) + 0.4 * nTarget }
        else if (sT < top - 0.8) { stance = 'doubt'; w = Math.min(2.2, 0.5 + (top - sT) * 0.45) }
      }
      if (stance) cands.push({ v: { speaker: a, stance }, w })
    }
    const out = []
    while (out.length < n && cands.length) {
      const v = weighted(g.r, cands)
      out.push(v)
      cands.splice(cands.findIndex(x => x.v === v), 1)
    }
    return out
  }

  /* ==========================================================
     庭审流程（生成器）
     ========================================================== */
  function* trialFlow(g, T) {
    const c = T.case
    const tick = n => { g.minutes += n }
    yield { type: 'open' }

    // 处理玩家排队的辩论能力（检查点）
    function* checkpoint() {
      while (T.queue.length && !T.ended && T.phase === 'debate') {
        const act = T.queue.shift()
        if (act.type === 'knight') {
          const r = knight(g, T, act.actor, act.target)
          if (r) { tick(3); yield Object.assign({ type: 'knight' }, r) }
        } else if (act.type === 'silencer') {
          const r = silence(g, T, act.actor, act.target)
          if (r) yield Object.assign({ type: 'secret', ability: 'silencer' }, r)
        } else if (act.type === 'puffer') {
          if (act.seat) pufferChoose(g, act.actor, act.seat)
          const r = puffer(g, T, act.actor)
          if (r) yield Object.assign({ type: 'secret', ability: 'puffer' }, r)
        } else if (act.type === 'executor') {
          yield* executorFlow(act.actor, act.target)
        }
      }
    }

    // 执行者：发动即终止当前辩论；通过则进入待处刑，否则恢复辩论
    function* executorFlow(actor, target) {
      const p = P(g, actor)
      if (!p || frontName(g, actor) !== ID.EXECUTOR || p.ident.used.executor || !isLiving(g, target) || T.phase !== 'debate') return
      p.ident.used.executor = true
      if (silenced(g, actor)) { yield { type: 'executor', actor, target, silenced: true }; return }
      yield { type: 'executor', actor, target }
      const V = beginVote(g, T, 'special', { actor, target })
      yield { type: 'vote-begin', vote: V }
      for (const v of V.voters) {
        if (!isLiving(g, v)) continue
        let t
        if (v === g.player) {
          const forced = forcedTarget(g, T, V, v)
          t = yield { type: 'ask-vote', voter: v, vote: V, forced }
        } else t = ballotOf(g, T, V, v)
        const b = cast(g, T, V, v, t)
        if (b) { tick(1); yield { type: 'ballot', vote: V, ballot: b } }
      }
      const res = settle(g, T, V)
      yield { type: 'special-result', vote: V, result: res }
      if (res.outcome === 'pass') {
        yield* pendingFlow(res.pending, { kind: 'special', actor })
      } else T.phase = 'debate'
    }

    // 唯一待处刑者之后：白痴 → 身怀希望之人 → 最后一句 → 裁决
    function* pendingFlow(pending, via) {
      T.phase = 'pending'
      yield { type: 'pending', pending, via: via ? via.kind : 'normal' }
      // 白痴
      if (idiotHolder(g, T, pending)) {
        let use
        if (pending === g.player) use = yield { type: 'ask-idiot', holder: pending, pending }
        else use = aiIdiot(g, T, pending)
        if (use) {
          const r = useIdiot(g, T, pending)
          if (r) {
            yield Object.assign({ type: 'idiot', pending }, r)
            if (r.effect === 'cancel') return 'revote'
          }
        }
      }
      // 身怀希望之人
      for (const h of hopeHolders(g, T, pending)) {
        let use
        if (h === g.player) use = yield { type: 'ask-hope', holder: h, pending }
        else use = aiHope(g, T, h, pending)
        if (!use) continue
        const r = useHope(g, T, h, pending)
        if (r) {
          yield Object.assign({ type: 'hope', pending }, r)
          if (r.effect === 'cancel') return 'revote'
        }
      }
      // 表决选出待处刑者之后，任何人都可以说话
      yield { type: 'last-words', speaker: pending }
      const v = verdict(g, T, pending, via)
      tick(6)
      yield Object.assign({ type: 'verdict', via: via ? via.kind : 'normal' }, v)
      return T.ended ? 'ended' : 'revote'
    }

    // ---- 辩论的节拍 ----
    // 交代去向；说法与某个在场者的真实去向相矛盾时，那人当众拆穿
    function* alibiFlow(id, response) {
      const w = c.where[id]
      T.claimed[id] = true
      tick(1)
      yield { type: 'alibi', speaker: id, room: w.claim.room, time: c.tAlibi, with: w.claim.with.filter(x => isLiving(g, x)), response: !!response }
      if (T.exposed[id] || T.ended) return
      const wits = livingIds(g).filter(x => contradicts(c, id, x) && P(g, x).lover !== id)
      if (!wits.length) return
      const wit = wits.includes(g.player) ? g.player : pick(g.r, wits)
      if (wit !== g.player && !chance(g.r, 0.85)) return
      yield* exposeFlow(wit, id)
    }
    function* exposeFlow(wit, liar) {
      if (T.exposed[liar] || !isLiving(g, wit) || !isLiving(g, liar)) return
      T.exposed[liar] = wit
      const w = c.where[liar]
      tick(1)
      yield { type: 'expose', speaker: wit, target: liar, room: w ? w.claim.room : '', time: c.tAlibi, truth: c.where[wit] ? c.where[wit].room : '' }
    }
    // 指认 → 旁人插话 → 被指认者回应（辩解 / 反咬 / 交代去向）→（玩家调查时问出的矛盾）当众拆穿
    function* exchange(speaker, target, clue) {
      recordAccuse(T, speaker, target)
      tick(2)
      yield { type: 'accuse', speaker, target, clue: clueInfo(clue) }
      for (const v of aiInterject(g, T, speaker, target)) {
        if (!isLiving(g, v.speaker)) continue
        const book = v.stance === 'agree' ? T.agree : T.doubt
        ;(book[target] || (book[target] = [])).push(v.speaker)
        yield { type: 'interject', speaker: v.speaker, stance: v.stance, target, accuser: speaker }
      }
      if (!isLiving(g, target)) return
      let kind
      if (target === g.player) {
        const a = yield { type: 'ask-respond', speaker: target, against: speaker, canAlibi: canAlibi(T, target) }
        kind = a && a.kind
      } else kind = aiRespond(g, T, target, speaker)
      tick(1)
      if (kind === 'counter' && isLiving(g, speaker)) {
        recordAccuse(T, target, speaker)
        yield { type: 'counter', speaker: target, target: speaker }
      } else if (kind === 'alibi' && canAlibi(T, target)) yield* alibiFlow(target, true)
      else yield { type: 'defend', speaker: target, against: speaker }
      if (speaker === g.player && !T.exposed[target]) {
        const k = (c.known || []).find(x => x.liar === target && isLiving(g, x.witness))
        if (k) yield* exposeFlow(k.witness, target)
      }
    }

    // ---- 辩论：从一号席起，在席的人依次各发言一次 ----
    T.phase = 'debate'
    const order = livingIds(g)
    for (const id of order) {
      yield* checkpoint()
      if (T.ended) break
      if (T.phase !== 'debate') break // 执行者通过并处刑后直接转入投票
      if (!isLiving(g, id)) continue
      yield { type: 'turn', speaker: id }
      if (id === g.player) {
        // 轮到玩家：可以先发动辩论能力（发动后仍轮到他发言），再指认或沉默
        let act = null, n = 0
        while (n++ < 8) {
          act = yield { type: 'ask-debate', speaker: id, canAlibi: canAlibi(T, id) }
          yield* checkpoint()
          if (!act || act.kind !== 'ability' || T.ended || T.phase !== 'debate' || !isLiving(g, id)) break
        }
        if (T.ended || T.phase !== 'debate' || !isLiving(g, id)) break
        if (act && act.kind === 'accuse' && isLiving(g, act.target) && act.target !== id) {
          yield* exchange(id, act.target, clueFor(g, T, id, act.target, true))
        } else if (act && act.kind === 'alibi' && canAlibi(T, id)) {
          T.lastMode = 'alibi'
          yield* alibiFlow(id, false)
        } else {
          tick(1)
          yield { type: 'silent', speaker: id }
        }
      } else {
        const d = aiDebate(g, T, id)
        if (d.kind === 'accuse' && d.target) yield* exchange(id, d.target, d.clue)
        else {
          T.lastMode = d.say || 'statement'
          if (d.say === 'alibi' && canAlibi(T, id)) yield* alibiFlow(id, false)
          else if (d.say === 'silent') { tick(1); yield { type: 'silent', speaker: id } }
          else { tick(2); yield { type: 'speech', speaker: id, mode: d.say === 'clue' && d.clue ? 'clue' : 'statement', clue: d.say === 'clue' ? clueInfo(d.clue) : null } }
        }
        if (d.ability && d.ability.type === 'knight') {
          const r = knight(g, T, id, d.ability.target)
          if (r) { tick(3); yield Object.assign({ type: 'knight' }, r) }
        } else if (d.ability && d.ability.type === 'executor') {
          yield* executorFlow(id, d.ability.target)
          if (T.ended) break
          if (T.phase !== 'debate') break
        }
      }
    }
    yield* checkpoint()

    // ---- 投票 ----
    if (!T.ended) {
      T.phase = 'vote'
      yield { type: 'debate-end' }
    }
    let guard = 0
    while (!T.ended && guard++ < 40) {
      const V = beginVote(g, T, 'normal')
      yield { type: 'vote-begin', vote: V }
      for (const v of V.voters) {
        if (!isLiving(g, v)) continue
        let t
        if (v === g.player) {
          const forced = forcedTarget(g, T, V, v)
          t = yield { type: 'ask-vote', voter: v, vote: V, forced }
        } else t = ballotOf(g, T, V, v)
        const b = cast(g, T, V, v, t)
        if (b) { tick(1); yield { type: 'ballot', vote: V, ballot: b } }
      }
      // 隐藏修正窗口：法官、倒吊人仍可在结果公布前发动
      if (g.player && isLiving(g, g.player) && (canUse(g, T, g.player, 'judge', V) || canUse(g, T, g.player, 'hanged', V))) {
        yield { type: 'vote-window', vote: V }
      }
      aiVoteAbilities(g, T, V)
      const res = settle(g, T, V)
      tick(3)
      yield { type: 'settle', vote: V, result: res }
      if (res.outcome === 'unique') {
        const r = yield* pendingFlow(res.pending, null)
        if (r === 'ended') break
      } else {
        yield { type: 'noresult', vote: V, tie: res.outcome === 'tie', ended: res.outcome === 'end', banned: T.tieBan.slice() }
      }
    }
    yield { type: 'end', solved: T.solved, reason: T.endReason, misjudge: T.misjudge }
  }

  // 自动推进一场庭审（测试与旁观）：ask-* 由 AI 代答
  function autoTrial(g, T, onEvent) {
    const it = trialFlow(g, T)
    let input
    let n = 0
    while (n++ < 2000) {
      const { value, done } = it.next(input)
      if (done) break
      input = undefined
      if (onEvent) onEvent(value)
      if (value.type === 'ask-debate') {
        const d = aiDebate(g, T, value.speaker)
        input = d.kind === 'accuse' ? { kind: 'accuse', target: d.target } : d.say === 'alibi' && value.canAlibi ? { kind: 'alibi' } : { kind: 'silent' }
      } else if (value.type === 'ask-respond') input = { kind: aiRespond(g, T, value.speaker, value.against) }
      else if (value.type === 'ask-vote') input = value.forced || aiBallot(g, T, value.vote, value.voter)
      else if (value.type === 'ask-idiot') input = aiIdiot(g, T, value.pending)
      else if (value.type === 'ask-hope') input = aiHope(g, T, value.holder, value.pending)
    }
    return T
  }

  // 整局自动模拟（测试用）
  function autoGame(opts = {}) {
    const g = create(opts)
    const log = []
    let guard = 0
    while (guard++ < 40) {
      const c = newCase(g)
      log.push(c.type)
      if (c.type === 'final' || c.type === 'stall') return { g, log, end: c }
      if (c.type === 'overdue') { if (winner(g)) return { g, log, end: { type: 'final', winner: winner(g) } }; continue }
      if (c.lastStanding !== undefined) return { g, log, end: { type: 'final', winner: c.lastStanding } }
      aiInvestigation(g, c)
      courtOpen(g, c)
      const T = openTrial(g, c)
      autoTrial(g, T, opts.onEvent)
      closeTrial(g, T)
      const w = winner(g)
      if (w) return { g, log, end: { type: 'final', winner: w } }
    }
    return { g, log, end: { type: 'guard' } }
  }

  const TrialEngine = {
    version: 1, ID, LABELS,
    rng, pred, tally,
    create, newCase, buildClues, buildSpots, bodyStage, inspect, spend, aiInvestigation,
    buildWhere, contradicts, interview, interviewCost, flavorKind, aiRespond, aiInterject, clueFor,
    fortune, shapeshift, magic, cupid,
    courtOpen, openTrial, knownClues, matches, testClue, suspicion,
    knight, silence, pufferChoose, puffer, canUse, request,
    beginVote, forcedTarget, cast, aiBallot, judge, reflect, aiVoteAbilities, settle,
    idiotHolder, useIdiot, hopeHolders, useHope, aiIdiot, aiHope, verdict,
    closeTrial, winner, aiDebate, trialFlow, autoTrial, autoGame,
    livingIds, isLiving, nameOf, frontName, lineOf, dayOf, neighborsOf, hasVoteRight, eligibleMandate, validCauses,
    person: P,
  }
  root.TrialEngine = TrialEngine
  if (typeof module !== 'undefined' && module.exports) module.exports = TrialEngine
})(typeof window !== 'undefined' ? window : globalThis)
