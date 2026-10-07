/* ==========================================================
   十五席 · 模拟庭审引擎（纯逻辑，不碰 DOM）
   依据：主持人游戏.md 第 2、3、5、7、8 节；开局流程.md；人物卡/00_卡司总则.md 第 5 节；
         运行规则.md 第 5.4、6、7.5 节；洋馆物理层.md 第 7、8 节；身体结算.md。

   - 浏览器：window.TrialEngine；Node：module.exports。
   - 所有随机都来自 game.r（mulberry32，可注入 seed）。
   - 庭审流程是一个生成器 TrialEngine.trialFlow(game, trial)：
     它逐个产出要演出的事件；遇到需要玩家决定的地方产出 ask-* 事件，
     由界面用 it.next(输入) 把选择送回。测试与旁观模式用 autoTrial 代答。
     产出的每个非 ask-* 事件同时记进 T.log（见 logEntry）；每次投票记进 T.rounds。
   - 辩论分两段（主持人游戏 3.2；开局流程 2.4）：
     ① 依次发言：turn → 指认 accuse → 旁人插话 interject{stance: agree|doubt}（0—2 人）
        → 被指认者回应：defend 辩解 / counter 反咬 / alibi 交代去向（玩家被指认时先产出 ask-respond）
        → expose 当众拆穿（说法与在场者的真实去向矛盾）；不指认时：speech{mode: statement|clue} / alibi / silent；
        也可以当众出示 present 一张证物（见下）。
     ② 公开讨论：discuss 之后若干拍（八人局 4—6、十五人局 6—8），每拍由「最有话说」的人发言
        （手里有没谈过的证物、知道谁的说法与自己的去向矛盾、刚被指认、想追问谁的去向、凶手要误导）；
        玩家举手（raiseHand，每场 3 次）后在下一拍产出 ask-interject：出示、对质两张证言、追问去向、附议或质疑当前指认、
        拿排除性事实反驳误导。没有新论点时主持人喊停，产出 debate-end（广播「辩论结束，开始投票。」）。
   - 当众出示（运行规则 3.2、4.6）：present{speaker, target, clue} → 不相符的人 rebut 拿出反证（看得见的特征当场可见；
     看不见的只是他自己的说法，算听说）；相符的人只能 defend 辩解，持秘密者掷破绽。玩家每场至多出示 3 次。
     出示「让死亡时间窗偏移」的证物 = 识破假窗口：之后大家按真正的死亡时刻对去向（T.refTime）。
   - 破绽（运行规则 5.4）：持秘密者被指认、被出示证物时掷一次，结果挂在他的回应事件上（ev.tell）；
     看见自己留下的痕迹被人谈起、谎言被当面戳穿时另产出 tell 事件。依次发言算一场，公开讨论另算一场。
   - 去向：newCase 时为每人生成「这个时段你在哪」的两段时间线（c.where[id].segs，切点 c.span.cut）；凶手亲手行凶时
     在含真正死亡时刻的那一段说谎；借冷池、蚕丝被、热池、冷冻柜让死亡时间窗偏移时，另一段（假窗口）他真的和别人在一起。
   - 死亡时间（洋馆物理层 7.4、7.5）：验尸得三格读数（体温、僵硬、尸斑，lore.bodyReadings），各对应一个死亡时段；
     医护「有 / 战场急救 / 基本常识」由窄到宽自动给出窗口；被干扰的读数按偏移后的样子读（内行也会估错）。
   - 调查的文字（诱饵点的排除性事实与陈设描写、疑似线索、验尸、发现线索的动作）与去向只用子随机数，不消耗 g.r。
   - 称呼：广播与台词里的〈某某〉{X}{V} 用 callOf（此人在馆里报的名字；同局重名或不报名时说「N号」）。
   - 结案对账：closeTrial 把本案的真相、线索的发现者、每轮选票与决定性的一票写进 c.record，并收进 g.records。

   本模拟的取舍（与原文一致之处见各函数注释）：
   - 受命者 = 本批唯一凶手（不是玩家）；死者不是玩家、不是凶手。
   - 不发放逆位能力，只把凶手卡背的敲钟人（三十分钟）、女巫（毒）、
     典狱长（门）当作行凶手段；国王、贞德等流程略去。
   - 凶手看见尸体时有时会在心里要求播报（主持人游戏 3.1），自己成为发现者。
   - 每案三条线索，维度（身高、性别、体格、医护、现场观察、年代与器械、随身物、死亡时间）互不重复，死因要求的维度也算在内。
     「死亡时间」一维是让时间窗偏移的处理，不筛人。
   - 持秘密者只算凶手与他的帮凶；破绽每一场至多一次：调查期的询问算一场，依次发言算一场，公开讨论算一场。
   - AI 只凭看得见的特征（身高、性别、体格、随身物）对照证物；医护、现场观察、年代这类看不见的，只从当众出示的回应里得知。
   - 金币（主持人游戏 8；价目表 8.1；物理层 7.4）：每人开局身上 10 枚（规则宣告时各取一摞）；余波时存活在馆者各得本轮的 5 或 10 枚，
     未查明时凶手另 10 枚在套房书桌（coinsDesk，不在身上）；死者身上的金币留在尸体处，有人取走（1 分钟）才转手，没人取就留在现场；
     被处刑者、离馆者身上的金币条文没写，不动。AI 每到饭点（8:00、12:00、18:00）用 1 枚吃一餐（只记账，不演出）。
   - 身体（身体结算 1、2、4）：起点第一日 12:00 吃过饭、7:00 起床。馆内没有食物，只有兑换来的饭才算吃过。
     未进食 24 小时以上「复杂推理慢一半」→ 验尸与询问耗时 ×1.5，「持续体力活每二十分钟要歇五分钟」→ 去别的房间追踪 +5 分钟；
     48 小时以上「不能做持续体力活」→ 不能去别的房间追踪。连续清醒 24 小时以上「反应时间翻倍」→ 验尸与询问同样 ×1.5（两项合计至多 ×2）。
     模拟不演作息：两案之间若跨过一个夜里（2:00—6:00 不在调查与庭审中），按戒备中睡了一觉回升一档（身体结算 4「睡四小时回升一档」，
     冷、地面、有人来往让睡眠少算）；兑换「热水浴、按摩、一夜安眠的服务」才算睡足七小时，回到 0。
   - 调查期的兑换只给物理事实（物理层 7.5）：鲁米诺要先用毛毯罩出暗处，只对有血的死因有用，漂白剂擦过处也会亮；
     指纹粉显出对凶手成立的手印（若有）；录音笔录下本案的询问，开庭对质时可以放录音；拍立得在尸体移走前拍下，开庭可出示。
     打听谁是凶手、谁是受命者之类一律不成立（价目表 8.2）。
   - 退出券（开局流程 2.4；主持人游戏 6）：持券离馆的人 inMansion = false，不是死亡；不再参加庭审与愿望的争夺。
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
    handprint: ['高处手印 约{v}厘米', '低处手印 约{v}厘米', '齐肩手印 约{v}厘米'],
    woodprint: ['大码湿鞋渍', '小码鞋印', '中码泥印'],
    spareclothes: ['大码换洗衣物', '小码换洗衣物'],
    bloodshirt: ['{v}血衣', '女式血衣'],
    lipstick: ['杯沿唇印', '卫生巾包装纸', '卸妆油渍'],
    defense: ['防御伤与颈部瘀痕', '地板刮痕', '杯底药粉'],
    freezer: ['冻硬的尸体', '球道重抹油', '手搓血衣'],
    coldpool: ['冷池浸尸', '蚕丝被裹尸', '热池泡尸'],
    vessel: ['大腿一刀', '颈侧一刀', '凌乱刀伤'],
    furniture: ['家具原样归位', '家具错位'],
    scrub: ['拼缝也擦净', '缝中残血'],
    gloves: ['手套污印', '少一双手套'],
    pipe: ['烟斗烟灰', '卷烟烟蒂'],
  }
  // 维度：线索模板与死因上的 glyph（lore.js）；旧数据按 attribute 推出
  const DIM_OF = { heightCm: 'height', gender: 'gender', physique: 'physique', medical: 'medical', observation: 'observation', knowsModernDevices: 'era', items: 'items' }
  const DIM_VISIBLE = { height: true, gender: true, physique: true, items: true, medical: false, observation: false, era: false, time: false }
  const dimOf = t => (t && (t.glyph || DIM_OF[t.attribute])) || null
  // 要压低侧光、贴地扫过才看得见的痕迹（洋馆物理层 7.1「侧光下」、7.2「要侧光近看」）：手印、湿鞋淡渍、刮痕、擦洗边界、压痕与色差、污印
  const RAKING = { handprint: [0, 1, 2], woodprint: [0], defense: [1], scrub: [0, 1], furniture: [0, 1], gloves: [0] }
  const isWood = room => /木|柚|枫|橡|黄花梨|楠/.test(String(room.floorSurface || '').split('·')[0])
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
  // 手印离地的高度：举手按在高处（身高 + 约 25 厘米）、垂手扶在低处（约身高的 55%）、齐肩（约身高的 82%），取整到 5 厘米
  function clueValue(tpl, vi, m) {
    const r5 = n => String(Math.round(n / 5) * 5)
    if (tpl === 'handprint') return r5(vi === 0 ? m.heightCm + 25 : vi === 1 ? m.heightCm * 0.55 : m.heightCm * 0.82)
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
  const START_COINS = 10
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
      records: [], // 每案结案对账（closeTrial 写入）
      notices: [],
      deaths: [],
      hooks: opts.hooks || null, // 可注入的 AI 决策（测试用），如 { ballot(g, T, V, voter, aiBallot) }
      lastCourt: null, // 上一场庭审结束的时刻（两案之间的作息从这里算）
    }
    g.startMinutes = g.minutes
    // 同局里报同一个名字的人（两位乔瑟夫、两位承太郎）：广播与台词改说「N号」（主持人游戏 7）
    const callCount = {}
    for (const id of order) { const cn = callNameRaw(charMap[id]); if (cn) callCount[cn] = (callCount[cn] || 0) + 1 }
    g.dupCalls = Object.keys(callCount).filter(k => callCount[k] > 1)
    // 身份：十五组洗牌，每人一组（主持人游戏 1、5；运行规则 0）
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
        coins: START_COINS, // 身上带着的枚数（开局各取一摞）；玩家的这一份由界面与 App.econ 同步
        ate: 12 * 60,       // 最近一次进食：第一日 12:00（身体结算 1）
        slept: 7 * 60,      // 最近一次睡醒：第一日 07:00
        mealAt: null,       // AI 已结算到哪一顿饭
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
  // 在馆里自我介绍时报的名字：callName；旧数据没有这个字段时取卡名去掉括号；null 为不报名
  function callNameRaw(c) {
    if (!c) return null
    if (c.callName !== undefined) return c.callName || null
    return String(c.name || '').replace(/[（(].*?[）)]/g, '').trim() || null
  }
  // 广播与台词里怎么称呼此人：报的名字；同局重名或不报名时说「N号」
  function callOf(g, id) {
    const c = g.charMap[id]
    const p = g.people[id]
    const seat = p ? p.seat : g.seats.indexOf(id) + 1
    const cn = callNameRaw(c)
    if (!cn || (g.dupCalls && g.dupCalls.includes(cn))) return seat > 0 ? seat + '号' : (c && c.name) || id
    return cn
  }
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
    return x ? s.replace(/\{X\}/g, callOf(g, x)) : s
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
  // 持退出券离馆（开局流程 2.4；主持人游戏 6）：不是死亡，席位留空；身上的金币条文没写，不动
  function leave(g, id) {
    const p = P(g, id)
    if (!p || !isLiving(g, id)) return false
    p.inMansion = false
    p.leftAt = g.minutes
    for (const q of Object.values(g.people)) if (q.puffSeat === p.seat) q.puffSeat = null
    if (g.mandated === id) g.mandated = null
    return true
  }

  /* ---------- 身体：饥饿与困倦（身体结算 1、2、4）→ 调查耗时 ---------- */
  const HUNGER_AT = [12, 24, 48]      // 未进食：12—24 走神 / 24—48 复杂推理慢一半 / 48 以上不能做持续体力活
  const AWAKE_AT = [18, 24, 36, 48]   // 连续清醒：18—24 / 24—36 反应时间翻倍 / 36—48 / 48 以上
  const tierOf = (h, cuts) => cuts.filter(x => h >= x).length
  function bodyState(g, id, at) {
    const p = P(g, id)
    const t = at == null ? g.minutes : at
    if (!p) return { hungerH: 0, awakeH: 0, hunger: 0, sleep: 0, mult: 1, awayPlus: 0, noAway: false }
    const hungerH = Math.max(0, (t - p.ate) / 60), awakeH = Math.max(0, (t - p.slept) / 60)
    const hunger = tierOf(hungerH, HUNGER_AT), sleep = tierOf(awakeH, AWAKE_AT)
    const mult = Math.min(2, 1 + (hunger >= 2 ? 0.5 : 0) + (sleep >= 2 ? 0.5 : 0))
    return { hungerH, awakeH, hunger, sleep, mult, awayPlus: hunger === 2 ? 5 : 0, noAway: hunger >= 3 }
  }
  // 吃了一餐（兑换来的饭）；ids 可以是一组人（十五人份的同一餐）
  function eat(g, ids, at) {
    for (const id of [].concat(ids)) { const p = P(g, id); if (p && isLiving(g, id)) p.ate = at == null ? g.minutes : at }
  }
  // 一夜安眠：睡足七小时，回到 0
  function rest(g, id, at) { const p = P(g, id); if (p) p.slept = at == null ? g.minutes : at }
  // 两案之间跨过一个夜里（2:00—6:00 不在调查与庭审中）：戒备中睡了一觉，回升一档
  function nightRest(g, id, from, to) {
    const p = P(g, id)
    if (!p || from == null || to <= from) return false
    let slept = false
    for (let d = Math.floor(from / 1440); d <= Math.floor(to / 1440); d++) {
      const a = d * 1440 + 120, b = d * 1440 + 360
      if (a < from || b > to) continue
      const h = Math.max(0, (b - p.slept) / 60)
      const tier = tierOf(h, AWAKE_AT)
      const back = tier <= 1 ? 0 : AWAKE_AT[tier - 2]
      p.slept = Math.max(p.slept, b - back * 60)
      slept = true
    }
    return slept
  }
  /* ---------- 金币：只记账（主持人游戏 8；价目表 8.1） ---------- */
  // AI 每到饭点用 1 枚吃一餐（8:00、12:00、18:00）；没钱就饿着
  const MEALS = [8 * 60, 12 * 60, 18 * 60]
  function aiMeals(g, upTo) {
    const t = upTo == null ? g.minutes : upTo
    for (const id of livingIds(g)) {
      if (id === g.player) continue
      const p = P(g, id)
      let from = p.mealAt == null ? g.startMinutes : p.mealAt
      for (let d = Math.floor(from / 1440); d <= Math.floor(t / 1440); d++) {
        for (const m of MEALS) {
          const at = d * 1440 + m
          if (at <= from || at > t) continue
          if (p.coins >= 1) { p.coins--; p.ate = at; p.spentMeals = (p.spentMeals || 0) + 1 }
        }
      }
      p.mealAt = t
    }
  }
  // 付出 n 枚（兑换）：身上不够返回 false
  function payCoins(g, id, n) {
    const p = P(g, id)
    n = Math.floor(+n || 0)
    if (!p || n < 0 || p.coins < n) return false
    p.coins -= n
    return true
  }
  function gainCoins(g, id, n) { const p = P(g, id); if (p && n > 0) p.coins += Math.floor(n) }
  // 拾取死者衣袋里的金币：耗 1 分钟（调查期内）；by 默认玩家
  function takeBodyCoins(g, c, by) {
    const who = by || g.player
    if (!c || !c.bodyCoins || !isLiving(g, who) || c.coinsTaken) return null
    if (g.minutes >= c.tCourt) return null
    const n = c.bodyCoins
    g.minutes += 1
    gainCoins(g, who, n)
    c.bodyCoins = 0
    c.coinsTaken = { by: who, n, at: g.minutes }
    return { n, by: who, cost: 1 }
  }

  /* ---------- 调查期兑换来的工具：只给物理事实，不给结论（洋馆物理层 7.5；价目表第 9 节鲁米诺） ----------
     luminol  鲁米诺：调查期灯关不掉，要先用毛毯罩出一块暗处；只对有血的现场有用——血类痕迹的热点显出来、细查省时；
              漂白剂擦过的地方也会亮（假阳性：那一处细查下去只是陈设）。
     powder   指纹粉：显出对凶手成立的手印——本案已有手印就直接显出；戴手套的人只留污印；否则多出一条手印（物理层 7.2：只看得出大小与位置）。
     camera   拍立得：尸体移走前拍下（体温、僵硬、尸斑的样子），开庭可出示。
     recorder 录音笔：本案此后的询问都录下来，开庭对质时可以放录音。
     返回 {cost, ...}；不能用返回 null。只用子随机数。 */
  const BLOODY = { stab: 1, blunt: 1, fall: 1 }
  function hasBlood(c) {
    return !!BLOODY[c.cause.id] || (c.clues || []).some(k => k.tpl === 'scrub' || k.tpl === 'bloodshirt' || (k.tpl === 'freezer' && k.vi === 2))
  }
  function useTool(g, c, name, by) {
    const who = by || g.player
    if (!c || g.minutes >= c.tCourt || !isLiving(g, who)) return null
    const tools = c.tools || (c.tools = {})
    const rr = subRng(g, c.no * 6263 + name.length * 31)
    const take = n => { const k = Math.min(n, c.tCourt - g.minutes); g.minutes += k; return k }
    if (name === 'recorder') { c.recorder = true; tools.recorder = true; return { cost: 0 } }
    if (name === 'camera') {
      if (tools.camera) return null
      const cost = take(1)
      c.photo = { at: g.minutes, by: who, readings: bodyReadings(g, c), ruler: [Math.floor((g.minutes - 540) / 60) * 60, g.minutes] }
      tools.camera = true
      return { cost, photo: c.photo }
    }
    if (name === 'luminol') {
      if (tools.luminol) return null
      const cost = take(3)
      tools.luminol = true
      const blood = hasBlood(c)
      const glow = []
      if (blood) {
        for (const s of c.spots) {
          if (s.done) continue
          const k = s.clue
          const bloodK = s.kind === 'body' || (k && (k.tpl === 'scrub' || k.tpl === 'bloodshirt' || (k.tpl === 'freezer' && k.vi === 2) || (k.place === 'away' && BLOODY[c.cause.id])))
          if (!bloodK) continue
          s.glow = true
          s.raking = false
          if (s.kind === 'clue') s.cost = Math.max(2, Math.round(s.cost * 0.6))
          glow.push(s.id)
        }
      }
      // 漂白剂擦过的一处陈设（若有）：也亮，细查下去只是陈设
      const decoys = c.spots.filter(s => s.kind === 'decoy' && !s.done)
      let fake = null
      if (decoys.length && rr() < 0.6) { fake = decoys[Math.floor(rr() * decoys.length)]; fake.glow = true; fake.fakeGlow = true; glow.push(fake.id) }
      return { cost, blood, glow, fake: fake ? fake.id : null }
    }
    if (name === 'powder') {
      if (tools.powder) return null
      const cost = take(2)
      tools.powder = true
      const m = charOf(g, c.murderer)
      const hand = c.spots.find(s => s.clue && s.clue.tpl === 'handprint')
      if (hand) { hand.raking = false; hand.glow = true; hand.cost = Math.max(2, Math.round(hand.cost * 0.6)); return { cost, spot: hand.id, existed: true } }
      if ((m.carried || []).some(i => /手套/.test(i))) return { cost, smudge: true }
      const t = (g.data.lore.clueTemplates || []).find(x => x.id === 'handprint')
      if (!t) return { cost }
      const vs = [{ text: t.text, predicate: t.predicate, vi: 0 }].concat((t.variants || []).map((v, i) => ({ text: v.text, predicate: v.predicate, vi: i + 1 })))
      const v = vs.find(x => pred(x.predicate)(m))
      if (!v) return { cost }
      const val = clueValue('handprint', v.vi, m)
      let text = v.text.replace(/\{v\}/g, val)
      if (!/\{v\}/.test(v.text)) text += '，离地约' + val + '厘米'
      const k = {
        id: 'kp', tpl: 'handprint', vi: v.vi, name: t.name, attribute: t.attribute, predicate: v.predicate, dim: 'height', visible: true,
        raking: false, value: val, text, label: (LABELS.handprint[v.vi] || t.name).replace(/\{v\}/g, val), place: 'room', awayTo: null, foundBy: null, powder: true,
      }
      c.clues.push(k)
      const sp = { id: 'kp', kind: 'clue', clue: k, cost: 3, done: false, lead: '刷开指纹粉——', raking: false, glow: true, added: true }
      c.spots.push(sp)
      return { cost, spot: 'kp', added: true }
    }
    return null
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
      // 受命者逾期：公开受命者身份并处死；帮凶一同处死（主持人游戏 2、5.11）
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
    aiMeals(g, tMurder)
    g.minutes = tMurder
    kill(g, victim, 'murder', tMurder)

    const c = {
      type: 'case', no: ++g.caseNo, murderer: m, victim, cause, roomInfo, plan,
      tMandate: g.mandateAt, tMurder, tDiscover: null, tCourt: null,
      bell: P(g, m).back === '敲钟人', investMinutes: 120,
      discoverer: null, selfReport: false, clues: [], spots: [], bodySeen: false, remaining: [],
      // 死者身上的金币随衣物留在尸体处（物理层 7.4）；有人取走才转手
      bodyCoins: P(g, victim).coins, coinsTaken: null,
      shift: null, // 让死亡时间窗偏移的处理（buildClues 决定）：{clue, dir, minutes, reads}
    }
    P(g, victim).coins = 0
    // 女巫的毒：发动后小玻璃瓶及瓶塞放在女巫房间的书桌上（主持人游戏 5.12）——受命者视为同时拥有女巫身份，即凶手的套房
    if (cause.id === 'poison') c.bottle = { room: P(g, m).seat + '号套房', at: Math.max(g.mandateAt, tMurder - randInt(subRng(g, tMurder), 40, 200)) }
    // 典狱长：发动时全馆广播（主持人游戏 5.1、7）；门锁一小时后自动弹开
    if (cause.id === 'door') c.doorLock = { at: tMurder, until: tMurder + 60 }
    g.cases.push(c)
    const after = livingIds(g)
    if (after.length <= 1) { c.lastStanding = after[0] || null; return c }

    // 有效发现：存活在馆的人看见尸体（主持人游戏 3.1）；不能行走者不去发现。
    // 凶手看见时可以在心里要求播报，那一刻也算有效发现——偶尔由他自己「发现」（子随机数，不消耗 g.r）
    const finders = after.filter(id => id !== m)
    let pool = finders.filter(id => id !== g.player && charOf(g, id).canWalk !== false)
    if (!pool.length) pool = finders.filter(id => charOf(g, id).canWalk !== false)
    if (!pool.length) pool = finders
    c.discoverer = pick(g.r, pool)
    if (charOf(g, m).canWalk !== false && subRng(g, c.no * 6151 + 7)() < 0.12) { c.discoverer = m; c.selfReport = true }
    c.tDiscover = tMurder + randInt(g.r, 12, 190)
    c.investMinutes = c.bell ? 30 : 120 // 敲钟人：三十分钟
    c.tCourt = c.tDiscover + c.investMinutes
    aiMeals(g, c.tDiscover)
    // 两案之间的作息（只算玩家：调查耗时随之变化）
    if (g.player && isLiving(g, g.player)) nightRest(g, g.player, g.lastCourt == null ? g.startMinutes : g.lastCourt, c.tDiscover)
    g.minutes = c.tDiscover
    buildClues(g, c)
    buildSpots(g, c)
    buildWhere(g, c)
    return c
  }

  /* ---------- 线索生成：每案三条，维度互不重复 ----------
     ① 让死亡时间窗偏移的处理（冷池、蚕丝被、热池、冷冻柜；lore 模板的 shift）：凶手想得到（模板的 predicate）、
        能走动、亲手行凶（毒与门不在场）时，约四成案件用它——这一条占「死亡时间」一维，不筛人（predicate 为 null）。
     ② 其余先贪心排除（每次在还没用过的维度里挑排除嫌疑人最多的一条），剩 1–2 名嫌疑人或已有三条为止；
        不足三条时只从没用过的维度里补足。死因要求的维度（扼颈要受训 → 体格）算作已用。筛人的线索都对凶手为真。 */
  function suspectsOf(g, c) {
    return livingIds(g).filter(id => id !== c.victim && !(id === g.player && isLiving(g, g.player)))
  }
  const SHIFT_P = 0.42
  function buildClues(g, c) {
    const L = g.data.lore
    const m = charOf(g, c.murderer)
    const suspects = suspectsOf(g, c)
    const opts = []
    const shifts = []
    for (const t of L.clueTemplates || []) {
      const vs = [{ text: t.text, predicate: t.predicate, vi: 0 }].concat((t.variants || []).map((v, i) => ({ text: v.text, predicate: v.predicate, vi: i + 1 })))
      const sh = vi => (t.shift || []).find(x => x.vi === vi) || null
      // 让时间窗偏移的变体另放一边（不进筛人的候选）
      for (const v of vs) {
        const s = sh(v.vi)
        if (!s || !pred(v.predicate)(m) || !compatible(t.id, v.vi, c)) continue
        if (m.canWalk === false || ['poison', 'door'].includes(c.cause.id)) continue
        shifts.push({ t, v, s })
      }
      const ok = vs.filter(v => !sh(v.vi) && pred(v.predicate)(m) && compatible(t.id, v.vi, c))
      if (!ok.length) continue
      const v = pick(g.r, ok)
      const val = clueValue(t.id, v.vi, m)
      const labels = LABELS[t.id] || []
      const [place, awayTo] = placeOf(t.id, v.vi, c.roomInfo)
      const dim = dimOf(t)
      let text = v.text.replace(/\{v\}/g, val)
      // 手印都标出离地多高（变体原文没写数字的，补在句尾）
      if (t.id === 'handprint' && !/\{v\}/.test(v.text)) text += '，离地约' + val + '厘米'
      opts.push({
        tpl: t.id, vi: v.vi, name: t.name, attribute: t.attribute, predicate: v.predicate,
        dim, visible: t.visible != null ? !!t.visible : !!DIM_VISIBLE[dim],
        raking: !!(RAKING[t.id] && RAKING[t.id].includes(v.vi) && placeOf(t.id, v.vi, c.roomInfo)[0] === 'room'),
        value: val || null,
        text,
        label: (labels[v.vi] || t.name).replace(/\{v\}/g, val),
        place, awayTo: awayTo || null, foundBy: null,
      })
    }
    const test = (o, id) => pred(o.predicate)(charOf(g, id))
    let remaining = suspects.slice()
    const used = new Set()
    const cd = dimOf(c.cause)
    if (c.cause.needs) { remaining = remaining.filter(id => pred(c.cause.needs)(charOf(g, id))); if (cd) used.add(cd) }
    const chosen = []
    // ① 偏移：方向与幅度（看上去的死亡时刻 tA = tMurder + dir·分钟）；看上去的时刻要早于发现、晚于受命
    if (shifts.length && g.r() < SHIFT_P) {
      const cand = shuffle(g.r, shifts)
      for (const { t, v, s } of cand) {
        const mins = randInt(g.r, 90, 170)
        const tA = c.tMurder + s.dir * mins
        if (tA > c.tDiscover - 20 || tA < c.tMandate) continue
        const labels = LABELS[t.id] || []
        const o = {
          tpl: t.id, vi: v.vi, name: t.name, attribute: t.attribute, predicate: null, needs: v.predicate,
          dim: 'time', visible: false, raking: false, value: null, text: v.text,
          label: labels[v.vi] || t.name, place: 'body', awayTo: null, foundBy: null,
          shift: { dir: s.dir, minutes: mins, reads: s.reads.slice() },
        }
        c.shift = { dir: s.dir, minutes: mins, reads: s.reads.slice(), tA, tpl: t.id, vi: v.vi }
        chosen.push(o)
        used.add('time')
        break
      }
    }
    const free = o => !chosen.includes(o) && !used.has(o.dim)
    while (remaining.length > 2 && chosen.length < 3) {
      let bestN = 0, best = []
      for (const o of opts) {
        if (!free(o)) continue
        const n = remaining.filter(id => !test(o, id)).length
        if (n > bestN) { bestN = n; best = [o] } else if (n === bestN && n > 0) best.push(o)
      }
      if (!bestN) break
      const o = pick(g.r, best)
      chosen.push(o)
      used.add(o.dim)
      remaining = remaining.filter(id => test(o, id))
    }
    // 不足三条时补足：只从没用过的维度里挑，排除力强的优先（仍然都对凶手为真）
    const rest = shuffle(g.r, opts)
      .sort((a, b) => suspects.filter(id => !test(b, id)).length - suspects.filter(id => !test(a, id)).length)
    for (const o of rest) {
      if (chosen.length >= 3) break
      if (!free(o)) continue
      chosen.push(o)
      used.add(o.dim)
      remaining = remaining.filter(id => test(o, id))
    }
    c.clues = shuffle(g.r, chosen).map((o, i) => Object.assign(o, { id: 'k' + i }))
    if (c.shift) c.shift.clue = (c.clues.find(k => k.shift) || {}).id || null
    c.remaining = remaining
    return c.clues
  }

  /* ---------- 调查的文字：陈设点的排除性事实与描写、疑似线索、验尸、发现线索时的动作 ----------
     调查期全馆灯都亮着（洋馆物理层 3.1）；馆刚打扫过，没有陈年积灰（物理层 9、7.2）；馆内没有食物，
     除了每人套房的那一把钥匙没有别的钥匙，柜、箱都没有锁（物理层 2.4）。描写只写馆里实有的东西。
     陈设点先给「排除性事实」（地毯毛没有倒伏、工具一件不少……），它们由本案的现场推出，不与本案的线索矛盾；
     没有合适的事实时才只给一句描写。同一局里不重复（用尽才重来）。
     这些文字只用子随机数（subRng），不消耗 g.r，规则结果不受影响。 */
  function subRng(g, salt) { return rng(((g.seed >>> 0) ^ Math.imul((salt >>> 0) + 1, 0x9e3779b1)) >>> 0) }
  const FLAVOR_KINDS = [
    ['thing', /梯架|银幕/], ['coin', /理币盘|金币/], ['lanes', /球道|置瓶机|保龄|球瓶|计分屏/], ['water', /泳池|浴池|喷泉/],
    ['basin', /浴缸|淋浴|盥洗台|洗手台|水槽|坐便器|内衬盆|洗涤台|水台$/], ['art', /挂毯|织锦|织画|解剖课|星月夜|十二庭|画架|画报/],
    ['mat', /软垫|练习垫|橡胶/], ['rug', /毯/], ['cloth', /床帘|窗帘|浴袍|长枕|油布|棉绳|胶带|软管|脏衣篮/], ['bed', /床(?!头)/],
    ['music', /钢琴|竖琴|四琴|谱架|音乐柜/], ['instrument', /放大镜|望远镜|六分仪|分规|量角仪|星盘|电子秤|温湿度表/],
    ['timer', /计时钟|棋钟/], ['clock', /钟/],
    ['mirror', /镜/], ['window', /窗/], ['lamp', /灯|烛台/], ['plant', /兰$|金花茶|拱架/],
    ['notebook', /绢面本|硬面簿/], ['book', /书柜|圣经|手稿|书刊/], ['desk', /笔匣|端砚|镇纸/],
    ['gym', /哑铃|划船机|力量架|扶杆|把杆|球拍/], ['pieces', /象棋|围棋|国际象棋|麻将|扑克|台球$|乒乓球$/], ['game', /球台|台球桌|计分牌/],
    ['tool', /刀|剪|钳|工具板|开瓶器|刷杆|救生杆|熨斗|缝纫机|急救箱/],
    ['fridge', /冷冻柜|保鲜柜/],
    ['machine', /洗衣机|烘干机|泵|过滤罐|水箱|咖啡机|投影机|电磁灶|洗碗机|总控柜|轮阀|电热座/],
    ['fixture', /插销|门铃|号码牌|编号锁|银钩|罗盘花|隔间|隔板|钥匙龛|酒款签/],
    ['vessel', /杯|壶|瓶|盘|罐|醒酒器|冰桶|盂|器皿|皂盒|花器|托盘/],
    ['exhibit', /像|雕|标本|骨架|化石|山子|礼器|皇冠|玉琮|地球仪|星球仪|太阳系仪|天球仪|切片|鲸牙|颅骨|凤蝶|极乐鸟|鹦鹉螺|屏风|霸王龙/],
    ['cabinet', /柜|架|格/], ['table', /桌|台|几|案|岛|车/], ['seat', /沙发|榻|椅|凳/],
  ]
  function flavorKind(name) {
    for (const [k, re] of FLAVOR_KINDS) if (re.test(name)) return k
    return 'thing'
  }
  // 地面怎么叫（皮毯、橡胶垫铺在什么上面）
  function floorWord(room) {
    const base = String((room && room.floorSurface) || '').split('·')[0]
    if (isWood(room)) return '木地板'
    if (/翡翠/.test(base)) return '翡翠地面'
    if (/玉|石|岩/.test(base)) return '玉面'
    return '地面'
  }
  // 本案现场的事实：哪些排除性的说法会与线索、死因相矛盾（由 caseFacts 推出，供 FACTS 的 bad 判断）
  function caseFacts(c) {
    const has = (tpl, vis) => (c.clues || []).some(k => k.tpl === tpl && (!vis || vis.includes(k.vi)))
    const k = c.cause.id
    return {
      moved: has('freezer', [0]) || has('coldpool', [0, 2]),
      washed: has('scrub') || has('freezer', [2]) || has('bloodshirt') || has('lipstick', [2]),
      scuffed: has('defense', [1]) || has('furniture'),
      furniture: has('furniture'),
      handprint: has('handprint'),
      footprint: has('woodprint'),
      gardenPrint: has('woodprint', [1]),
      laneOil: has('freezer', [1]),
      freezer: has('freezer', [0]),
      cupUsed: k === 'poison' || has('lipstick', [0]) || has('defense', [2]),
      blood: ['stab', 'blunt', 'fall'].includes(k),
      door: k === 'door',
      rope: k === 'strangle',
      drown: k === 'drown',
      wardrobe: has('bloodshirt') && /套房/.test(c.roomInfo.name),
      toolGloves: has('gloves', [1]) && c.roomInfo.name === '工具修理室',
      smoke: has('pipe'),
    }
  }
  // 排除性事实：{t 文字, key 排除了什么, bad(f, o) 与本案矛盾时不用, re 只用于名字合乎它的陈设}
  const FACTS = {
    rug: [
      { t: '{O}的毛顺着一个方向，没有倒伏——没有东西在上面拖过。', key: 'not-dragged', bad: f => f.moved || f.scuffed },
      { t: '{O}上的家具压痕都还在原处，没有挪动过。', key: 'not-moved', bad: f => f.furniture },
    ],
    mat: [{ t: '{O}的纹路里干干净净，没有水、血或泥。', key: 'clean', bad: f => f.blood || f.drown || f.footprint }],
    bed: [
      { t: '拨开床帘、俯身看过{O}底下：什么也没有藏。', key: 'nothing-hidden', bad: () => false },
      { t: '{O}的被面平整，没有人在上面躺过。', key: 'not-used', bad: f => f.moved },
    ],
    cloth: [{ t: '{O}是干的，叠得方方正正，没有被拿去包过、捆过什么。', key: 'not-used', bad: f => f.rope || f.moved }],
    basin: [{ t: '{O}是干的，排水口里没有血水——没有人在这里洗过东西。', key: 'no-wash', bad: f => f.washed }],
    water: [{ t: '{O}边一圈都是干的，没有从水里拖上岸的水痕。', key: 'not-from-water', bad: f => f.moved || f.drown }],
    lanes: [{ t: '{O}的油面完整，只有球滚过的条带，没有鞋印。', key: 'no-steps', bad: f => f.laneOil }],
    art: [{ t: '{O}挂得端正，挂钩牢靠，背后没有塞东西。', key: 'nothing-hidden', bad: () => false }],
    music: [{ t: '{O}的盖合着，凳子没有挪动。', key: 'not-moved', bad: f => f.furniture }],
    timer: [{ t: '{O}停着，两边的时间都没有走过。', key: 'untouched', bad: () => false }],
    clock: [{ t: '{O}走得好好的，和别处的钟只差一两分钟——没有人拨过。', key: 'time-ok', bad: () => false }],
    instrument: [{ t: '{O}摆在原位，底下的印子对得上，没有被拿起来过。', key: 'untouched', bad: () => false }],
    mirror: [{ t: '侧光扫过{O}：镜面上一个手印也没有。', key: 'no-handprint', bad: f => f.handprint }],
    window: [{ t: '{O}上一个手印也没有。', key: 'no-handprint', bad: f => f.handprint }],
    lamp: [{ t: '{O}亮着，灯罩上没有手印，没有人碰过。', key: 'no-handprint', bad: f => f.handprint }],
    plant: [{ t: '{O}根下的土微湿，是滴灌留下的；土面上没有脚印。', key: 'no-steps', bad: f => f.gardenPrint }],
    notebook: [{ t: '翻开{O}——一页页都空着，没有撕掉的页。', key: 'untouched', bad: () => false }],
    book: [{ t: '{O}好好地在原处，没有被翻动、抽走过。', key: 'untouched', bad: () => false }],
    desk: [{ t: '{O}在原位，桌面上没有墨迹，也没有挪动的印子。', key: 'untouched', bad: f => f.furniture }],
    gym: [
      { t: '{O}上的器械都在原位，一件不少——凶器不是从这里拿的。', key: 'weapon-not-here', bad: () => false, re: /架/ },
      { t: '{O}在原位，没有被拿下来过。', key: 'weapon-not-here', bad: () => false, re: /^(?!.*架)/ },
    ],
    pieces: [{ t: '{O}都在原处，一件不少。', key: 'untouched', bad: () => false }],
    game: [{ t: '{O}周围什么也没有，地上没有挪动的痕迹。', key: 'not-moved', bad: f => f.scuffed }],
    tool: [
      { t: '{O}上的东西一件不少——凶器不是从这里拿的。', key: 'weapon-not-here', bad: f => f.toolGloves, re: /工具板/ },
      { t: '{O}里的刀一把不少——凶器不是从这里拿的。', key: 'weapon-not-here', bad: () => false, re: /刀具抽屉/ },
      { t: '{O}扣着，里面的东西一样没少。', key: 'untouched', bad: () => false, re: /急救箱/ },
      { t: '{O}在原处，刃口和握柄都干干净净，没有沾过血。', key: 'weapon-not-here', bad: () => false, re: /^(?!.*(工具板|刀具抽屉|急救箱))/ },
    ],
    fridge: [{ t: '打开{O}——空的，只有一股冷气，里面没有放过东西的痕迹。', key: 'not-used', bad: f => f.freezer }],
    machine: [{ t: '{O}停着，开关上没有手印。', key: 'no-handprint', bad: f => f.handprint }],
    fixture: [{ t: '{O}好好的，没有撬过、碰过的痕迹。', key: 'no-forced', bad: f => f.door }],
    vessel: [{ t: '{O}是干的，没有人用过。', key: 'not-used', bad: f => f.cupUsed }],
    coin: [{ t: '{O}是空的，盘底一枚也没有。', key: 'empty', bad: () => false }],
    exhibit: [
      { t: '{O}在原位，底座和地上的印子对得上——没有被挪下来当凶器。', key: 'weapon-not-here', bad: () => false, re: /^(?!.*(霸王龙|骨架|屏风|标本))/ },
      { t: '{O}稳稳立在原位，周围没有碰撞的痕迹。', key: 'untouched', bad: () => false, re: /霸王龙|骨架|屏风|标本/ },
    ],
    cabinet: [
      { t: '{O}没有锁，门一拉就开；里面码得整齐，没有翻找过。', key: 'not-searched', bad: (f, o) => f.wardrobe && /衣柜/.test(o), re: /柜/ },
      { t: '{O}上的东西码得整整齐齐，没有空出来的位置。', key: 'not-searched', bad: () => false, re: /^(?!.*柜)/ },
    ],
    table: [{ t: '{O}上的东西都在原处，脚下的压痕对得上。', key: 'not-moved', bad: f => f.furniture || f.cupUsed }],
    seat: [
      { t: '{O}的坐垫平整，案发前后没有人坐过。', key: 'not-used', bad: () => false },
      { t: '{O}没有挪过，脚下的压痕对得上。', key: 'not-moved', bad: f => f.furniture },
    ],
    thing: [{ t: '{O}在原处，看不出被动过。', key: 'untouched', bad: () => false }],
  }
  // 没有合适的事实时的描写（只写看得见的样子，不下结论）
  const DECOY_TEXT = {
    rug: ['{O}吸走了所有脚步声。', '手指插进{O}的毛里，是凉的。', '{O}的边压得平平整整。'],
    mat: ['{O}踩上去软软的，又弹回来。', '{O}铺得平平整整。'],
    bed: ['{O}的被面铺得太平，像从没人睡过。', '掀开{O}的帷幔，里面只有叠好的被。'],
    cloth: ['{O}叠得方方正正，折痕锋利。', '{O}垂着，下摆一动不动。', '抖开{O}——什么也没掉出来。', '{O}上有沉香的味道，很淡。'],
    basin: ['拧开{O}的水——水声在空屋里格外响。', '灯光映在{O}上，晃了一下就停了。'],
    water: ['{O}的水面很平，倒映着灯光。', '{O}底什么也没有，只有灯影。', '{O}的水一圈圈循环着，声音一直没停。'],
    lanes: ['{O}的漆面光可鉴人，映出一道灯光。', '{O}旁的球按号排好，一个不少。'],
    art: ['{O}里的人看着门口，不看你。', '凑近{O}：颜料的裂纹里没有新东西。', '侧光下，{O}的笔触一道道立起来，又平下去。'],
    music: ['按下一个键——声音在屋里转了一圈。', '{O}的弦都在，调子却低了半音。'],
    timer: ['{O}的两只钟面并排停着。'],
    clock: ['{O}还在走，和别处的钟差了几分钟。', '{O}的指针一格一格地走，不快不慢。'],
    instrument: ['{O}的刻度停在一个没有意义的位置。', '{O}擦得很亮。', '{O}摆在原位，角度分毫不差。'],
    mirror: ['{O}里只有你，和你身后的灯。', '{O}擦得很亮，映出半间屋子。'],
    window: ['{O}后面没有天光，只有一层背光。', '{O}外什么也看不见。'],
    lamp: ['{O}亮着，灯罩是凉的——它一直这么亮。', '{O}的光晕里浮着细尘。', '{O}微微晃了一下。没有风。'],
    plant: ['{O}落了一片花瓣，边缘已经卷了。', '{O}的香气很重，盖住了别的味道。'],
    notebook: ['翻开{O}——一页页都空着。'],
    book: ['{O}合着，书页的边齐齐整整。', '{O}散着旧纸与墨的气味。'],
    desk: ['{O}擦得锃亮，映出一点灯光。'],
    gym: ['{O}擦得锃亮，一件也没有挪位。'],
    pieces: ['{O}摆得整整齐齐，像没开过局。'],
    game: ['{O}摸上去是凉的，很久没人碰了。'],
    tool: ['{O}挂在原处，刃口干净，没有新磕碰。', '{O}收得整整齐齐。', '{O}上一层薄油，防锈的。', '掂了掂{O}，又放回原处。'],
    fridge: ['{O}低低嗡了一声，又安静下来。'],
    machine: ['{O}低低嗡了一声，又安静下来。', '{O}的指示灯一明一暗，像在呼吸。', '{O}的门缝里什么也没夹。'],
    fixture: ['{O}摸上去冰凉。', '{O}纹丝不动，和别处的一样。', '{O}在灯下反着光。'],
    vessel: ['{O}擦得锃亮，映出一张变形的脸。', '轻敲{O}——声音清脆，没有裂。'],
    coin: ['{O}在灯下泛着白光。'],
    exhibit: ['{O}的影子在墙上被拉得很长。', '{O}静静立着，什么也不肯说。', '绕着{O}走了一圈，没有一处新痕。', '{O}比看上去更冷，像刚从地下取出来。'],
    cabinet: ['{O}合着，木香很淡。', '{O}的把手是凉的。'],
    table: ['{O}上什么也没有，映着灯光。', '{O}上的东西都在原处，像一幅静物。'],
    seat: ['{O}的坐垫还鼓着，没人坐过。', '{O}底下什么也没有。', '{O}朝着门，像有人在这里等过谁。'],
    thing: ['{O}在原处，看不出被动过。', '{O}，没有异样。', '看了很久。{O}就只是{O}。'],
  }
  // 氛围细节：接在描写后面（本房间的氛围句每间房一局只用一次）
  const DECOY_DETAIL = [
    '空气里一股淡淡的沉香味。', '远处有钟在走。', '门外好像有脚步声，停了。',
    '灯光很稳，每个角落都照得清清楚楚。', '这里比走廊冷一点。', '墙后一声闷响，再没有了。', '你听见自己的心跳。',
    '香味散得很快，像刚有人路过。', '安静得能听见自己的呼吸。', '有一瞬间，像有人在背后。',
  ]
  // 疑似线索：先看见可疑的东西；要「再看一次」才看清是无害的（when：只在现场条件允许时用）
  const HERRINGS = [
    { bait: '{O}边沿一抹暗红。', truth: '凑近闻——是干掉的葡萄酒。', when: (f, room) => /酒/.test((room.objects || []).join('') + room.name) },
    { bait: '{O}下压着一根头发。', truth: '颜色和长短都对上了：是死者自己的。' },
    { bait: '一道浅浅的拖痕，从{O}延伸到墙边。', truth: '是有人挪{O}时椅脚蹭出来的，痕里没有血。', when: (f, room) => isWood(room) && !f.scuffed },
    { bait: '{O}后面塞着一团揉皱的纸。', truth: '展开：一张 A4 白纸，什么也没写。' },
    { bait: '{O}旁躺着一枚金币。', truth: '两面都是一百——谁都可能掉。' },
    { bait: '{O}上一圈湿痕。', truth: '是杯底的水印，水是清的——有人在这里放过一杯水。', when: f => !f.cupUsed },
    { bait: '{O}脚下滚着一枚纽扣。', truth: '样式对上了——是死者自己袖口上掉的。' },
    { bait: '{O}上一块被擦过的亮斑。', truth: '圆形的——有人在这里放过一只杯子，又拿走了。', when: f => !f.cupUsed && !f.washed },
    { bait: '{O}旁一股淡淡的清洁液味。', truth: '是{O}被擦过——只擦掉了一圈杯印，擦布扔在一旁，干干净净。', when: f => !f.washed && !f.cupUsed },
    { bait: '{O}缝里卡着一片碎玻璃。', truth: '对着灯看——是水晶杯沿崩下的一小片，断口干净，没有血。' },
    { bait: '{O}上三道细长的划痕。', truth: '划痕浅而平行，是搬动时刮的，边上没有血。', when: f => !f.scuffed },
    { bait: '{O}下一小撮白色的东西。', truth: '捻开，是棉絮——擦布上掉的。', when: f => !f.cupUsed },
    { bait: '{O}底下压着半张撕下的纸。', truth: '上面只有一行乐谱。', when: (f, room) => /谱架|钢琴|竖琴|音乐柜/.test((room.objects || []).join('')) },
  ]
  // 验尸：按死因（毒：口唇和指甲发紫、少量白沫、没有气味、杯子喝空——主持人游戏 5.12）
  const BODY_TEXT = {
    stab: ['衣襟被血浸透，伤口边缘整齐。', '伤口不止一处，血已经发暗。', '身下一摊血，还留着倒下时的弧度。'],
    blunt: ['后脑塌陷，发间结着血块。', '额角重重一击，地上溅着细小的血点。', '一侧肋骨摸上去是断的。'],
    strangle: ['颈上一圈瘀紫，指痕叠着指痕。', '眼睑里布满针尖大的红点。', '领口被扯开，颈侧发青。'],
    smother: ['口鼻周围一圈压痕，唇色发绀。', '脸上没有伤，只有鼻梁一道浅压印。', '指甲里嵌着细小的织物纤维。'],
    poison: ['嘴边一点白沫，口唇和指甲发紫。', '身旁倒着一只喝空的杯子。', '凑近闻，什么气味也没有。', '死前抓过胸口，衣扣崩了一颗。'],
    drown: ['衣服湿透，口鼻一圈细白泡沫。', '指甲缝里有池壁的滑腻。', '头发湿贴在脸上，水还在往下滴。'],
    fall: ['四肢扭成不自然的角度，头先着地。', '断骨顶起了袖管。', '身下的{FLOOR}上磕出一道新痕。'],
    door: ['肩胸一道笔直的压痕，像被门扇夹住。', '{DOOR}', '手指伸向门缝，指甲劈了。'],
    alcohol: ['浓重的酒气，仰面，口鼻有呕吐物。', '身旁一只倒空的酒瓶。', '脸色紫红，衣襟上一片酒渍。'],
  }
  // 发现线索时的动作（无主语：玩家与旁观时的调查者都能用）
  const CLUE_LEAD = {
    room: ['侧光压低，贴着地面扫过去——', '蹲下，侧过光——', '指尖拂过，停住了——', '换个角度再看一眼——', '屏住呼吸，凑近——'],
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
  // 一处陈设：先找一条与本案不矛盾、本局没说过的排除性事实；没有就给一句描写
  function decoyText(g, c, rr, object, facts) {
    const kind = flavorKind(object)
    const seen = g.flavorSeen || (g.flavorSeen = new Set())
    let text = '', fact = null
    const cands = (FACTS[kind] || FACTS.thing).filter(x => (!x.re || x.re.test(object)) && !x.bad(facts, object))
    for (const x of shuffle(rr, cands)) {
      const t = fillO(x.t, object)
      if (!seen.has(t)) { text = t; fact = x.key; break }
    }
    // 同一件陈设（同一间房再次成为现场）不说同一句；本类用尽时借用通用的说法
    for (let n = 0; n < 8 && (!text || seen.has(text)); n++) {
      fact = null
      const list = n < 6 ? DECOY_TEXT[kind] || DECOY_TEXT.thing : DECOY_TEXT.thing
      text = fillO(flavorPick(g, rr, 'd:' + (n < 6 ? kind : 'thing'), list), object)
    }
    seen.add(text)
    let detail = ''
    const moodKey = 'm:' + c.roomInfo.floor + c.roomInfo.name
    const used = g.flavorUsed || (g.flavorUsed = {})
    if (c.roomInfo.mood && !used[moodKey] && rr() < 0.35) { used[moodKey] = [1]; detail = c.roomInfo.mood + '。' }
    else if (rr() < 0.5) detail = flavorPick(g, rr, 'detail', DECOY_DETAIL)
    return { kind, text, detail, fact }
  }

  /* ---------- 现场热点与耗时（洋馆物理层 8.3） ----------
     spot：{id, kind: body|clue|decoy, cost 细查要花的分钟, done, ...}
       body：obs 验尸所见；clue：clue（c.clues 的一项）、lead 发现时的动作、raking 要压低侧光才看得见；
       decoy：object 陈设名、desc 排除性事实或描写、fact 事实的 key（无则 null）、herring 疑似线索 {bait, truth, cost, cleared}。
     界面点热点 → inspect；疑似线索要「再看一次」→ reexamine；询问 → interview；空闲时 → spend。 */
  const DECOY_WORDS = ['如常', '无痕', '没有异样', '干净', '空']
  function bodyObs(g, c, rr) {
    const list = (BODY_TEXT[c.cause.id] || ['']).map(s => s
      .split('{FLOOR}').join(floorWord(c.roomInfo))
      .split('{DOOR}').join(c.tDiscover - c.tMurder < 60 ? '身旁那扇门锁死了，推不动。' : '身旁那扇门已经弹开，门扇上一道新压痕。'))
    return flavorPick(g, rr, 'b:' + c.cause.id, list)
  }
  function buildSpots(g, c) {
    const pc = g.player && isLiving(g, g.player) ? charOf(g, g.player) : null
    const med = pc ? pc.stats.medical : '无'
    const obs = pc ? pc.stats.observation : '一般'
    const jit = () => randInt(g.r, -1, 2)
    // 每处细查五到二十分钟：检查尸体约 5—15 分钟（医护者更快），细查痕迹数分钟，追到别的房间另加步行与粗搜
    const cost = n => Math.min(20, Math.max(5, n))
    const rr = subRng(g, c.no * 7919 + 13)
    const facts = caseFacts(c)
    const spots = []
    // 饥饿与困倦（身体结算 2、4）：验尸慢一半；追到别的房间要歇脚，饿过两天就去不了
    const bs = pc ? bodyState(g, g.player, c.tDiscover) : bodyState(g, null)
    c.body = bs
    spots.push({ id: 'body', kind: 'body', cost: Math.round(cost((med === '有' ? 8 : med === '战场急救' ? 10 : 13) + jit()) * bs.mult), done: false, obs: bodyObs(g, c, rr) })
    for (const k of c.clues) {
      let n = k.place === 'away' ? 18 : k.place === 'body' ? 8 : 7
      if (obs === '擅长' && k.place !== 'away') n -= 2
      const lead = flavorPick(g, rr, 'l:' + k.place, CLUE_LEAD[k.place] || CLUE_LEAD.room).split('{TO}').join(k.awayTo || '门外')
      const away = k.place === 'away'
      spots.push({ id: k.id, kind: 'clue', clue: k, cost: cost(n + jit()) + (away ? bs.awayPlus : 0), done: false, lead, raking: !!k.raking, blocked: away && bs.noAway })
    }
    const objs = shuffle(g.r, (c.roomInfo.objects || []).slice())
    // 陈设点：两到三处，各给一条排除性事实（或描写）；每案至多一处「疑似线索」
    const nDecoy = objs.length >= 4 ? 3 : Math.min(2, objs.length)
    const herringAt = rr() < 0.6 ? Math.floor(rr() * nDecoy) : -1
    objs.slice(0, nDecoy).forEach((o, i) => {
      const d = decoyText(g, c, rr, o, facts)
      const s = { id: 'd' + i, kind: 'decoy', object: o, word: pick(g.r, DECOY_WORDS), cost: cost(6 + jit()), done: false, flavor: d.kind, desc: d.text, detail: d.detail, fact: d.fact }
      if (i === herringAt) {
        const pool = HERRINGS.filter(h => !h.when || h.when(facts, c.roomInfo))
        const h = flavorPick(g, rr, 'herring', pool)
        s.herring = { bait: fillO(h.bait, o), truth: fillO(h.truth, o), cost: 3 + Math.floor(rr() * 3), cleared: false }
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
  /* ---------- 死亡时间（洋馆物理层 7.4、7.5） ----------
     三格读数：体温、僵硬、尸斑各按死后分钟数落在表里的一档，每一档对应一个死亡时段（钟面时刻 band [早, 晚]，null 为更早）。
     被偏移处理干扰的读数（冷池让体温看上去更久，蚕丝被、热池让体温看上去更新，冷冻柜让体温与僵硬都像死了很久）
     按「看上去」的死后分钟读；没被干扰的照实读——几格对不上，就是有人动过尸体。 */
  const apparentDeath = c => c.tMurder + (c.shift ? c.shift.dir * c.shift.minutes : 0)
  function bodyReadings(g, c, at) {
    const R = (g.data.lore && g.data.lore.bodyReadings) || []
    const t = at == null ? g.minutes : at
    const sh = c.shift
    return R.map(r => {
      const off = sh && sh.reads.includes(r.key) ? sh.dir * sh.minutes : 0
      const since = t - (c.tMurder + off)
      let from = 0, step = r.steps.length - 1
      for (let i = 0; i < r.steps.length; i++) {
        const to = r.steps[i].to
        if (to == null || since < to) { step = i; break }
        from = to
      }
      const s = r.steps[step]
      return { key: r.key, name: r.name, text: s.text, step, band: [s.to == null ? null : t - s.to, t - from], shifted: !!off }
    })
  }
  // 几格读数共同落在的时段（交集）；没有交集返回 null
  function readingsWindow(reads, ruler0) {
    let a = -Infinity, b = Infinity
    for (const r of reads) { a = Math.max(a, r.band[0] == null ? -Infinity : r.band[0]); b = Math.min(b, r.band[1]) }
    if (a === -Infinity) a = ruler0 == null ? b - 360 : ruler0
    return a < b ? [a, b] : null
  }
  // 医护按卡上的程度自动给出死亡时间窗（7.5：常态下前后一两个小时余量；战场急救、基本常识更宽）。
  // 被偏移处理骗过时，窗口落在「看上去」的时刻；知道尸体被怎样处理过（找到了那条线索），才按真正的时刻估
  const MED_SPAN = { 有: [60, 80], 战场急救: [100, 130], 基本常识: [150, 190] }
  function medWindow(g, c, who, knowsShift) {
    const ch = charOf(g, who)
    const span = ch && ch.stats && MED_SPAN[ch.stats.medical]
    if (!span) return null
    const rr = subRng(g, c.no * 3571 + (P(g, who) ? P(g, who).seat : 0))
    const center = (knowsShift ? c.tMurder : apparentDeath(c)) + Math.round((rr() - 0.5) * 30)
    const w = span[0] + Math.floor(rr() * (span[1] - span[0] + 1))
    return [center - w, center + w]
  }
  // 这个人知不知道尸体被怎样处理过：那条线索是他找到的
  const knowsShift = (c, who) => !!(c.shift && c.clues.some(k => k.shift && k.foundBy && k.foundBy === who))
  // 细查一处：消耗馆内时间，返回所得。by：调查者（缺省为玩家；旁观时为代为调查的人）
  // 疑似线索这时只看见可疑的东西（herring.bait）；看清它（herring.truth）要另花三到五分钟 reexamine
  function inspect(g, c, spotId, by) {
    const s = c.spots.find(x => x.id === spotId)
    if (!s || s.done) return null
    if (s.blocked && (!by || by === g.player)) return null // 饿过两天：去不了别的房间
    s.done = true
    const who = by || g.player
    s.by = who
    const cost = Math.min(s.cost, Math.max(0, c.tCourt - g.minutes))
    g.minutes += cost
    const out = { spot: s, cost, by: who }
    if (s.kind === 'body') {
      c.bodySeen = true
      const since = g.minutes - c.tMurder
      out.cause = c.cause
      out.stage = bodyStage(g, since)
      out.obs = s.obs || ''
      out.readings = bodyReadings(g, c)
      out.ruler = [Math.floor((g.minutes - 540) / 60) * 60, g.minutes]
      out.window = medWindow(g, c, who, knowsShift(c, who))
      out.coins = c.bodyCoins || 0
      c.autopsy = { at: g.minutes, by: who, readings: out.readings, ruler: out.ruler, window: out.window }
    } else if (s.kind === 'clue') {
      s.clue.foundBy = who
      out.clue = s.clue
      out.lead = s.lead || ''
    } else {
      out.word = s.word
      out.desc = s.desc || s.object
      out.detail = s.detail || ''
      out.fact = s.fact || null
      out.herring = s.herring ? { bait: s.herring.bait, cost: s.herring.cost } : null
    }
    return out
  }
  // 疑似线索再看一次：花三到五分钟，看清它是无害的
  function reexamine(g, c, spotId) {
    const s = c.spots.find(x => x.id === spotId)
    if (!s || !s.done || !s.herring || s.herring.cleared) return null
    const left = Math.max(0, c.tCourt - g.minutes)
    if (left <= 0) return null
    const cost = Math.min(s.herring.cost, left)
    g.minutes += cost
    s.herring.cleared = true
    return { spot: s, cost, truth: s.herring.truth }
  }
  function spend(g, c, minutes) {
    g.minutes = Math.min(c.tCourt, g.minutes + minutes)
    return c.tCourt - g.minutes
  }
  /* ---------- 去向：「这个时段你在哪」——两段时间线（不在场陈述） ----------
     时段 c.span = {from, cut, to} 盖住真正的死亡时刻（以及偏移后看上去的时刻），在 cut 处切成两段（各取整到十分钟）。
     无辜者照实说两段（连同同在一处的人）；凶手若亲手行凶，含真正死亡时刻的那一段说谎、说自己没有同伴——
     他说的那间房里那一段若真有人，那人就能拆穿他。借冷池、蚕丝被、热池、冷冻柜让时间窗偏移时，
     他在「看上去」的那一段真的和别人在一起（假窗口里的不在场证明是真的），真正的那一段多半说自己在套房里，没人能拆穿——
     只有识破偏移，才看得出他在真正的死亡时刻没有人作证。下毒与关门不必在场，凶手照实说。
     where[id] = {segs[{room, floor, with}], claim{segs[{room, with}]}, lie, lieSeg}；room/with/claim.room/claim.with 是含真正死亡时刻那一段的简写。
     只用子随机数（subRng），不消耗 g.r。 */
  const walks = (g, id) => (g.walkFix && g.walkFix[id]) || charOf(g, id).canWalk !== false
  function buildWhere(g, c) {
    const rr = subRng(g, c.no * 104729 + 31)
    const L = g.data.lore.rooms || {}
    const all = Object.keys(L).map(k => L[k])
    const crime = c.roomInfo.name
    const common = all.filter(x => x.crimeScene && !/套房/.test(x.name) && x.name !== crime)
    const suiteOf = id => { const r = all.find(x => x.name === P(g, id).seat + '号套房'); return r && r.name !== crime ? r : null }
    const lying = !['poison', 'door'].includes(c.cause.id) && isLiving(g, c.murderer)
    const m = c.murderer
    const tA = apparentDeath(c)
    const r10 = x => Math.round(x / 10) * 10
    const cut = c.shift ? r10((c.tMurder + tA) / 2) : r10(c.tMurder + (rr() < 0.5 ? -1 : 1) * (60 + Math.floor(rr() * 51)))
    const lo = Math.min(c.tMurder, tA, cut), hi = Math.max(c.tMurder, tA, cut)
    c.span = { from: r10(lo - 70 - Math.floor(rr() * 51)), cut, to: r10(hi + 70 + Math.floor(rr() * 51)) }
    const segOf = t => (t < cut ? 0 : 1)
    const kTrue = segOf(c.tMurder), kFake = c.shift ? segOf(tA) : null
    const people = livingIds(g)
    const segs = {}
    for (const id of people) segs[id] = [null, null]
    // 先排凶手的两段里要特殊处理的部分
    const fixed = {}
    if (lying) {
      fixed[kTrue] = { room: crime, floor: c.roomInfo.floor }
    }
    for (let k = 0; k < 2; k++) {
      const taken = []
      for (const id of shuffle(rr, people)) {
        if (id === m && fixed[k]) { segs[id][k] = fixed[k]; continue }
        if (id === m && kFake === k) continue // 假窗口那一段：等别人都排好，再坐到有人的房里
        const walk = walks(g, id)
        const own = suiteOf(id)
        let room = null
        const prev = k === 1 && segs[id][0]
        if (prev && prev.room !== crime && (!walk || rr() < 0.35)) room = all.find(x => x.name === prev.room) || null
        if (!room) {
          if (walk && taken.length && rr() < 0.3) room = taken[Math.floor(rr() * taken.length)]
          else if (own && rr() < (walk ? 0.38 : 0.75)) room = own
          else {
            const near = walk ? common : common.filter(x => own && x.floor === own.floor)
            const pool = near.length ? near : common
            room = pool[Math.floor(rr() * pool.length)] || own
          }
        }
        if (!room) continue
        segs[id][k] = { room: room.name, floor: room.floor }
        taken.push(room)
      }
      if (lying && kFake === k) {
        // 假窗口：凶手真的和别人待在一处（挑一位能走动的人，坐到他那里）
        const mates = people.filter(x => x !== m && segs[x][k] && walks(g, x))
        const mate = mates.length ? mates[Math.floor(rr() * mates.length)] : null
        const at = mate ? segs[mate][k] : (suiteOf(m) ? { room: suiteOf(m).name, floor: suiteOf(m).floor } : { room: common[0].name, floor: common[0].floor })
        segs[m][k] = { room: at.room, floor: at.floor }
      }
    }
    const where = {}
    for (const id of people) {
      if (!segs[id][0] || !segs[id][1]) continue
      where[id] = { segs: segs[id].map(x => ({ room: x.room, floor: x.floor, with: [] })) }
    }
    for (const id in where) for (let k = 0; k < 2; k++) {
      where[id].segs[k].with = Object.keys(where).filter(o => o !== id && where[o].segs[k].room === where[id].segs[k].room)
    }
    for (const id in where) {
      where[id].claim = { segs: where[id].segs.map(x => ({ room: x.room, with: x.with.slice() })) }
      where[id].lie = false
      where[id].lieSeg = null
    }
    if (lying && where[m]) {
      const occupied = Array.from(new Set(Object.keys(where).filter(x => x !== m).map(x => where[x].segs[kTrue].room)))
      const own = suiteOf(m)
      const free = common.filter(r => !occupied.includes(r.name))
      const freeRoom = () => (free.length ? free[Math.floor(rr() * free.length)] : common[Math.floor(rr() * common.length)] || { name: '走廊' }).name
      const x = rr()
      let lie
      if (c.shift) lie = own && x < 0.75 ? own.name : freeRoom()
      else if (x < 0.5 && occupied.length) lie = occupied[Math.floor(rr() * occupied.length)]
      else if (x < 0.8 && own) lie = own.name
      else lie = freeRoom()
      where[m].segs[kTrue].with = []
      where[m].claim.segs[kTrue] = { room: lie, with: [] }
      where[m].lie = true
      where[m].lieSeg = kTrue
    }
    // 简写：含真正死亡时刻的那一段
    for (const id in where) {
      const W = where[id]
      W.room = W.segs[kTrue].room
      W.floor = W.segs[kTrue].floor
      W.with = W.segs[kTrue].with
      W.claim.room = W.claim.segs[kTrue].room
      W.claim.with = W.claim.segs[kTrue].with
    }
    c.where = where
    c.kTrue = kTrue
    c.tAlibi = c.span.from
    c.asked = []
    c.known = []
    return where
  }
  // 一段时间线的起止
  const segSpan = (c, k) => (k === 0 ? [c.span.from, c.span.cut] : [c.span.cut, c.span.to])
  const segAt = (c, t) => (t < c.span.cut ? 0 : 1)
  // a 说自己某一段在某处；w 那一段真在那里，却没和 a 在一起 → w 能拆穿 a（返回是哪一段，没有返回 -1）
  function contradictSeg(c, a, w) {
    const A = c && c.where && c.where[a], W = c && c.where && c.where[w]
    if (!A || !W || a === w) return -1
    for (let k = 0; k < 2; k++) if (W.segs[k].room === A.claim.segs[k].room && !W.segs[k].with.includes(a)) return k
    return -1
  }
  const contradicts = (c, a, w) => contradictSeg(c, a, w) >= 0
  // 说法的两段（给界面与事件）：[{from, to, room, with}]
  function claimSegs(g, c, id) {
    const W = c.where && c.where[id]
    if (!W) return []
    return W.claim.segs.map((x, k) => ({ from: segSpan(c, k)[0], to: segSpan(c, k)[1], room: x.room, with: x.with.filter(o => g.people[o]) }))
  }
  // 玩家在调查期询问一人：「这个时段你在哪」，他照自己的说法交代两段去向；花费调查时间。与玩家所知相矛盾的说法被记下
  function interviewCost(g, id) {
    const pc = charOf(g, g.player), t = charOf(g, id)
    const base = 6 + (pc && pc.stats.readsPeople === '是' ? 0 : 2) + (t && t.stats.suspicion === '重' ? 2 : 0)
    return Math.round(base * bodyState(g, g.player).mult)
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
      if (!c.known.some(k => k.liar === liar && k.witness === witness)) { const k = { liar, witness, seg: contradictSeg(c, liar, witness) }; c.known.push(k); found.push(k) }
    }
    if (contradicts(c, id, g.player)) note(id, g.player)
    for (const b of c.asked) {
      if (contradicts(c, id, b)) note(id, b)
      if (contradicts(c, b, id)) note(b, id)
    }
    c.asked.push(id)
    // 录音笔开着：这一段问话录下来了（开庭对质时可以放录音）
    if (c.recorder) (c.recorded || (c.recorded = [])).push(id)
    // 被问到案发的时间与地点：持秘密者掷一次破绽（调查期的询问算一场），只有问话的玩家在看着他
    const tell = rollTell(g, c, c.tells || (c.tells = {}), id, [g.player], 'asked')
    if (tell) (c.tellLog || (c.tellLog = [])).push(Object.assign({ t: g.minutes, scene: 'inv' }, tell))
    return { id, segs: claimSegs(g, c, id), room: w.claim.room, with: w.claim.with.slice(), time: c.span.from, span: Object.assign({}, c.span), cost, conflicts: found, tell, recorded: !!c.recorder }
  }

  /* ---------- 破绽与察觉（运行规则 5.4） ----------
     持秘密的人（凶手与他的帮凶）受到直击要害的刺激——被点名指认、被问到案发的时间地点、看见自己留下的痕迹被人谈起、
     谎言被当面戳到——时，每一场至多判一次：伪装 高 10%、中 25%、低 45%；承压（被当众拆穿过）+10%，极限（已被确认是凶手）+25%。
     成立后，正注视着他的人各掷一次察觉：一般 50%，善于读人「是」75%。察觉者只得到「看见了什么表现」。
     book：本场的记录（调查期 c.tells，庭审 T.tells），{holder: true} 表示这一场已经判过。
     返回 null（不是持秘密者，或本场已判过）或 {holder, at, shown 破绽是否成立, seen 察觉到的人, player 玩家是否察觉} */
  const TELL_P = { 高: 0.1, 中: 0.25, 低: 0.45 }
  function secretHolders(g, c) {
    const m = c && c.murderer
    if (!isLiving(g, m)) return []
    const acc = accompliceOf(g, m)
    return acc ? [m, acc] : [m]
  }
  function tellChance(g, T, id) {
    const ch = charOf(g, id)
    let p = TELL_P[ch && ch.stats && ch.stats.disguise] != null ? TELL_P[ch.stats.disguise] : 0.25
    if (T && T.knownMurderer === id) p += 0.25
    else if (T && T.exposed && T.exposed[id]) p += 0.1
    return p
  }
  function noticeChance(g, id) {
    const ch = charOf(g, id)
    return ch && ch.stats && ch.stats.readsPeople === '是' ? 0.75 : 0.5
  }
  function rollTell(g, c, book, id, watchers, at, T) {
    if (!secretHolders(g, c).includes(id) || book[id]) return null
    book[id] = true
    const rr = g.r
    const shown = rr() < tellChance(g, T, id)
    const seen = []
    if (shown) for (const w of watchers) if (w && w !== id && isLiving(g, w) && rr() < noticeChance(g, w)) seen.push(w)
    return { holder: id, at, shown, seen, player: !!g.player && seen.includes(g.player) }
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
  // 占卜家：每天一次，得知当前正位身份名。被查验者不收到任何通知（主持人游戏 5.7，v4.71 已删去旧版的「身份已被知悉」）
  function fortune(g, actor, target) {
    const p = P(g, actor)
    if (!p || frontName(g, actor) !== ID.FORTUNE || !isLiving(g, target)) return null
    const day = dayOf(g.minutes)
    if (p.fortuneDay === day) return null
    p.fortuneDay = day
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
      queue: [], votes: 0, vote: null,
      log: [],     // 本场产出的事件（logEntry 的精简记录），结案对账与第二段辩论用
      rounds: [],  // 每次投票（含执行者的特殊表决）：beginVote 时登记，settle 后带结果
      executed: [], // 处刑：{id, correct, via, t}
      agree: {}, doubt: {}, exposed: {}, claimed: {}, lastMode: null,
      tells: {},    // 本场已判过破绽的人（依次发言算一场）
      tellsOpen: {}, // 公开讨论另算一场
      tellSeen: {}, // 谁察觉了谁的破绽：{观察者: [持秘密者]}（AI 的怀疑度据此加权）
      tellLog: [],  // 本场成立与否的每一次破绽判定
      stage: 'turns', // 辩论的哪一段：turns 依次发言 / open 公开讨论
      // 当众出示（A5）：玩家每场至多 3 次；tested[某人][证物] = 'match' 相符（只能辩解）/ 'rebut' 不相符（拿出反证）
      presentLeft: PRESENT_MAX, presents: [], tested: {},
      // 公开讨论（A6）：玩家举手 3 次；current 当前的指认 {accuser, target, clue?, claim?}
      hands: HAND_MAX, handUp: false, current: null, spoken: {}, spokeOpen: {}, answered: {}, beats: 0, beatsRun: 0, stopReason: null,
      misled: false, refuted: {}, openClaim: null, // 凶手拿陈设误导（一次）；被排除性事实驳倒的人；桌上还没被驳回的误导
      // 大家按哪个时刻对去向：开庭时按尸体「看上去」的死亡时刻；有人出示让时间窗偏移的证物（识破）后按真正的时刻
      refTime: apparentDeath(c), refKnown: !c.shift,
    }
    // 调查期询问时察觉到的破绽，带进庭审
    for (const tl of c.tellLog || []) for (const w of tl.seen || []) (T.tellSeen[w] || (T.tellSeen[w] = [])).push(tl.holder)
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

  /* ---------- 当众看得到的相符：身高、性别、体格、随身物一眼可见；看不见的特征只认当众出示时的回应 ---------- */
  function publicMatches(g, T, t) {
    const ch = charOf(g, t)
    const c = T.case
    let n = 0
    for (const k of c.clues || []) {
      if (!k.foundBy || !k.predicate) continue
      const res = T.tested && T.tested[t] && T.tested[t][k.id]
      if (k.visible) n += pred(k.predicate)(ch) ? 1 : 0
      else if (res === 'match') n += 1
      else if (res === 'rebut') n -= 0.3
    }
    if (c.cause && c.cause.needs) n += pred(c.cause.needs)(ch) ? 1 : 0
    return n
  }
  // 按大家对的时刻，此人交代的那一段有没有人作证（只算当众交代过的）：独自 +，有同伴 −
  function alibiWeight(g, T, t) {
    const c = T.case
    if (!T.claimed[t] || !c.where || !c.where[t] || !c.span) return 0
    const s = c.where[t].claim.segs[segAt(c, T.refTime)]
    return s.with.some(x => g.people[x]) ? -0.3 : 0.35
  }
  /* ---------- AI 的怀疑度：当众看得到的相符 + 噪声 + 旁人指认 + 已知事实 ---------- */
  function suspicion(g, T, a, t) {
    if (T.knownMurderer) return t === T.knownMurderer ? 100 : (T.noise[a][t] || 0) * 0.1
    let s = publicMatches(g, T, t) + ((T.noise[a] && T.noise[a][t]) || 0) + alibiWeight(g, T, t)
    if (T.refuted && T.refuted[t]) s += 1.4
    const by = (T.accuse[t] || []).filter(x => x !== a)
    s += 0.32 * by.length
    // 旁人的附议与质疑、被当众拆穿的谎
    if (T.agree) s += 0.15 * (T.agree[t] || []).filter(x => x !== a).length
    if (T.doubt) s -= 0.12 * (T.doubt[t] || []).filter(x => x !== a).length
    if (T.exposed && T.exposed[t]) s += 1.6
    // 自己察觉到的破绽（只是推测，不是证据）
    if (T.tellSeen && T.tellSeen[a]) s += 1.1 * T.tellSeen[a].filter(x => x === t).length
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
      const n = publicMatches(g, T, id)
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
     投票（主持人游戏 3.2—3.3：辩论与投票、平票、误判与结束）
     ========================================================== */
  function beginVote(g, T, kind = 'normal', extra = {}) {
    const living = livingIds(g)
    const voters = living.filter(id => hasVoteRight(g, T, id) && (kind === 'special' || !T.tieBan.includes(id)))
    const targets = kind === 'special' ? living.slice() : living.filter(id => !T.idiotOut.includes(id) && id !== T.hopeBan)
    const V = Object.assign({
      kind, round: ++T.votes, voters, targets, ballots: [], judges: [], reflect: null, settled: false,
      banned: kind === 'normal' ? T.tieBan.slice() : [], hopeBan: kind === 'normal' ? T.hopeBan : null,
      // 没有人能投（两人终局并列后的重投）：界面直接快进到结果
      empty: voters.length === 0,
    }, extra)
    T.vote = V
    if (T.rounds) T.rounds.push(V)
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
    // 小丑的能力不会被沉默（主持人游戏 5.2）：只看活着、在馆、当前正位是小丑
    const clowns = livingIds(g).filter(id => frontName(g, id) === ID.CLOWN)
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
    if (T.executed) T.executed.push({ id: pending, correct, via: via ? via.kind : 'normal', t: g.minutes, with: executed.slice(1), round: T.vote ? T.vote.round : null })
    // 一组处刑及其连坐全部结算完毕后判断胜者（主持人游戏 6）：只剩一人或无人，本场到此为止
    if (!T.ended && livingIds(g).length <= 1) { T.ended = true; T.endReason = 'last' }
    T.phase = T.ended ? 'ended' : 'vote'
    return { correct, pending, executed, misjudge: T.misjudge, ended: T.ended }
  }

  /* ---------- 审判结束：金币（主持人游戏 8） ---------- */
  function closeTrial(g, T) {
    T.ended = true
    T.phase = 'ended'
    const table = {}, desk = {}
    aiMeals(g, g.minutes)
    for (const id of livingIds(g)) {
      table[id] = T.solved ? 10 : 5
      P(g, id).coinsTable += table[id]
      P(g, id).coins += table[id] // 出现在各人伸手可及的圆桌上，随手收起
    }
    if (!T.solved && isLiving(g, T.murderer)) {
      desk[T.murderer] = 10
      P(g, T.murderer).coinsDesk += 10 // 在他套房的书桌上，不在身上
    }
    T.case.result = { solved: T.solved, reason: T.endReason, misjudge: T.misjudge }
    T.case.record = caseRecord(g, T, { table, desk })
    g.records.push(T.case.record)
    // 存活在馆的现任受命者重新取得完整二十四小时
    if (isLiving(g, g.mandated)) g.mandateAt = g.minutes
    g.lastCourt = g.minutes
    g.trial = null
    return { table, desk, solved: T.solved }
  }
  /* ---------- 结案对账（运行规则 7.5）：真相、线索被谁找到、每轮选票与决定性的一票 ----------
     决定性的一票：在决定结果的那一轮里，从这一票起，待处刑者按基础票成为并保持唯一领先。 */
  function decisiveBallot(V) {
    const pend = V && V.result && V.result.pending
    if (!pend || !V.ballots) return null
    const cnt = {}
    let tip = null
    V.ballots.forEach((b, i) => {
      if (!b.target) return
      cnt[b.target] = (cnt[b.target] || 0) + 1
      const lead = Object.keys(cnt).every(k => k === pend || cnt[k] < (cnt[pend] || 0))
      if (lead && (cnt[pend] || 0) > 0) { if (tip == null) tip = i } else tip = null
    })
    return tip == null ? null : Object.assign({ index: tip }, V.ballots[tip])
  }
  function caseRecord(g, T, pay) {
    const c = T.case
    const rounds = (T.rounds || []).map(V => ({
      round: V.round, kind: V.kind, target: V.target || null, actor: V.actor || null, empty: !!V.empty,
      voters: V.voters.slice(), banned: (V.banned || []).slice(),
      ballots: V.ballots.map(b => ({ voter: b.voter, target: b.target, forced: !!b.forced, abstain: !!b.abstain })),
      judges: (V.judges || []).map(j => ({ actor: j.actor, target: j.target, effective: j.effective !== false })),
      result: V.result ? { outcome: V.result.outcome, pending: V.result.pending || null, totals: Object.assign({}, V.result.totals || {}), count: V.result.count, total: V.result.total } : null,
      decisive: decisiveBallot(V),
    }))
    return {
      no: c.no, victim: c.victim, murderer: c.murderer, accomplice: accompliceOf(g, c.murderer) || null,
      cause: (c.cause || {}).id || null, causeName: (c.cause || {}).name || '', room: (c.roomInfo || {}).name || '', floor: (c.roomInfo || {}).floor || '',
      tMandate: c.tMandate, tMurder: c.tMurder, tDiscover: c.tDiscover, tCourt: c.tCourt,
      discoverer: c.discoverer, selfReport: !!c.selfReport, bottle: c.bottle || null, doorLock: c.doorLock || null,
      where: c.where && c.where[c.murderer] ? { room: c.where[c.murderer].room, claim: c.where[c.murderer].claim.room, lie: !!c.where[c.murderer].lie } : null,
      clues: (c.clues || []).map(k => ({ id: k.id, tpl: k.tpl, vi: k.vi, name: k.name, label: k.label, text: k.text, dim: k.dim, visible: !!k.visible, raking: !!k.raking, place: k.place, awayTo: k.awayTo, foundBy: k.foundBy || null })),
      herrings: (c.spots || []).filter(s => s.herring).map(s => ({ object: s.object, bait: s.herring.bait, truth: s.herring.truth, cleared: !!s.herring.cleared, seen: !!s.done })),
      solved: T.solved, reason: T.endReason, misjudge: T.misjudge,
      executed: (T.executed || []).map(x => Object.assign({}, x)),
      knownMurderer: T.knownMurderer || null,
      tells: (c.tellLog || []).concat(T.tellLog || []),
      rounds, log: T.log.slice(),
      coins: { table: Object.assign({}, pay.table), desk: Object.assign({}, pay.desk), body: c.coinsTaken ? 0 : c.bodyCoins || 0, taken: c.coinsTaken ? Object.assign({}, c.coinsTaken) : null },
      // 死亡时间：真正的时刻、看上去的时刻（偏移处理）、问话的时段；凶手两段说法
      death: { t: c.tMurder, apparent: apparentDeath(c), shift: c.shift ? { dir: c.shift.dir, minutes: c.shift.minutes, tpl: c.shift.tpl, vi: c.shift.vi, clue: c.shift.clue } : null, span: c.span ? Object.assign({}, c.span) : null, refTime: T.refTime, refKnown: !!T.refKnown },
      alibi: c.where && c.where[c.murderer] ? { segs: c.where[c.murderer].segs.map(x => ({ room: x.room, with: x.with.slice() })), claim: c.where[c.murderer].claim.segs.map(x => ({ room: x.room, with: x.with.slice() })), lieSeg: c.where[c.murderer].lieSeg } : null,
      presents: (T.presents || []).map(x => Object.assign({}, x)),
      discuss: { beats: T.beats || 0, run: T.beatsRun || 0, stop: T.stopReason || null, hands: T.handsUsed || 0, misled: !!T.misled, refuted: Object.keys(T.refuted || {}) },
      tools: Object.assign({}, c.tools || {}),
    }
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
  const PRESENT_MAX = 3, HAND_MAX = 3
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
  // 能对 target 出示的证据：已发现、且与 target 相符——看得见的特征，或当众出示时他没能反驳的；先用自己找到的。
  // mine：玩家（证物栏里的都算他手里的）
  function clueFor(g, T, id, target, mine) {
    const ch = charOf(g, target)
    const ks = (T.case.clues || []).filter(k => k.foundBy && k.predicate && pred(k.predicate)(ch) && (k.visible || (T.tested[target] && T.tested[target][k.id] === 'match')))
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
    const nTarget = publicMatches(g, T, target)
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
  // 一条事件的精简记录（T.log）：去掉投票对象等大对象，只留编号与人
  function logEntry(g, ev) {
    const e = { t: g.minutes, type: ev.type }
    for (const k of ['speaker', 'target', 'actor', 'against', 'accuser', 'stance', 'mode', 'room', 'time', 'to', 'seg', 'truth', 'response', 'pending', 'via', 'correct', 'misjudge', 'ability', 'effect', 'holder', 'success', 'silenced', 'void', 'yes', 'seat', 'tie', 'ended', 'solved', 'reason', 'at', 'shown', 'player',
      'ok', 'liar', 'witness', 'recorded', 'a', 'b', 'beats', 'hearsay', 'visible', 'dim', 'photo', 'present', 'shift', 'from'])
      if (ev[k] !== undefined) e[k] = ev[k]
    if (ev.claim) e.claim = { spot: ev.claim.spot, key: ev.claim.key, label: ev.claim.label }
    if (ev.with) e.with = ev.with.slice()
    if (ev.seen) e.seen = ev.seen.slice()
    if (ev.executed) e.executed = ev.executed.slice()
    if (ev.banned) e.banned = ev.banned.slice()
    if (ev.clue) e.clue = ev.clue.id
    if (ev.tell) e.tell = { shown: ev.tell.shown, seen: ev.tell.seen.slice(), player: ev.tell.player, at: ev.tell.at }
    if (ev.vote) e.round = ev.vote.round
    if (ev.ballot) e.ballot = { voter: ev.ballot.voter, target: ev.ballot.target, forced: ev.ballot.forced, abstain: ev.ballot.abstain }
    if (ev.result) e.outcome = ev.result.outcome
    return e
  }
  // 庭审流程：产出的事件（ask-* 除外）都记进 T.log
  function* trialFlow(g, T) {
    const it = trialFlowRaw(g, T)
    let input
    while (true) {
      const { value, done } = it.next(input)
      if (done) return value
      if (value && !/^ask-/.test(value.type)) T.log.push(logEntry(g, value))
      input = yield value
    }
  }
  // 凶手拿陈设误导时说的「证据」（排除性事实的反面）：{O} 代入陈设名；用作台词里的 {CLUE}
  const CLAIM = {
    'not-dragged': '{O}上的拖痕', 'not-moved': '{O}的挪动痕', 'nothing-hidden': '{O}里藏的东西', 'not-used': '用过的{O}',
    'clean': '{O}上的血', 'no-wash': '{O}里的血水', 'not-from-water': '{O}边的水痕', 'no-steps': '{O}上的脚印',
    'untouched': '被动过的{O}', 'time-ok': '被拨过的{O}', 'no-handprint': '{O}上的手印', 'weapon-not-here': '{O}那里少了的一件',
    'not-searched': '被翻过的{O}', 'no-forced': '被撬过的{O}',
  }
  function* trialFlowRaw(g, T) {
    const c = T.case
    const tick = n => { g.minutes += n }
    // 破绽：本场每人至多判一次（依次发言一场，公开讨论另一场）；判过的记进 T.tellLog，察觉者记进 T.tellSeen
    const tellOf = (id, at) => {
      const tl = rollTell(g, c, T.stage === 'open' ? T.tellsOpen : T.tells, id, livingIds(g).filter(x => x !== id), at, T)
      if (!tl) return null
      T.tellLog.push(Object.assign({ t: g.minutes, scene: T.stage === 'open' ? 'discuss' : 'debate' }, tl))
      for (const w of tl.seen) (T.tellSeen[w] || (T.tellSeen[w] = [])).push(tl.holder)
      return tl
    }
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
    // 交代去向（两段时间线，说的是大家正在对的那个时刻所在的一段）；说法与某个在场者的真实去向相矛盾时，那人当众拆穿
    function* alibiFlow(id, response, tell) {
      if (!c.where || !c.where[id]) return
      T.claimed[id] = true
      tick(1)
      const segs = claimSegs(g, c, id)
      const k = segAt(c, T.refTime)
      const sg = segs[k]
      yield { type: 'alibi', speaker: id, room: sg.room, time: sg.from, to: sg.to, seg: k, segs, with: sg.with.filter(x => isLiving(g, x)), response: !!response, tell: tell || null }
      if (T.exposed[id] || T.ended) return
      const wits = livingIds(g).filter(x => contradicts(c, id, x) && P(g, x).lover !== id)
      if (!wits.length) return
      const wit = wits.includes(g.player) ? g.player : pick(g.r, wits)
      if (wit !== g.player && !chance(g.r, 0.85)) return
      yield* exposeFlow(wit, id)
    }
    function* exposeFlow(wit, liar) {
      if (T.exposed[liar] || !isLiving(g, wit) || !isLiving(g, liar)) return
      const k = contradictSeg(c, liar, wit)
      if (k < 0) return
      T.exposed[liar] = wit
      T.claimed[liar] = true
      tick(1)
      yield { type: 'expose', speaker: wit, target: liar, seg: k, room: c.where[liar].claim.segs[k].room, time: segSpan(c, k)[0], to: segSpan(c, k)[1], truth: c.where[wit].segs[k].room }
      // 谎言被当面戳到
      const tl = tellOf(liar, 'exposed')
      if (tl && tl.shown) yield Object.assign({ type: 'tell' }, tl)
    }
    // 指认 → 旁人插话 → 被指认者回应（辩解 / 反咬 / 交代去向）→（玩家调查时问出的矛盾）当众拆穿
    function* exchange(speaker, target, clue, claim) {
      recordAccuse(T, speaker, target)
      T.current = { accuser: speaker, target, clue: clue ? clue.id : null, claim: claim || null }
      // 误导的「证据」一直摆在桌上，直到有人驳回或辩论结束
      if (claim) T.openClaim = { claim, accuser: speaker, target, refuted: false }
      tick(2)
      yield { type: 'accuse', speaker, target, clue: clueInfo(clue), claim: claim || null }
      // 被点名指认（出示的若是他自己留下的痕迹，更是直击要害）：持秘密者掷破绽，表现挂在他的回应上
      const tell = tellOf(target, clue ? 'clue' : 'accused')
      // 误导的「证据」：看过那一处的旁人（AI 没有细查陈设的记录，按两成当作看过）当场驳回；玩家看过的，留给他举手
      if (claim && !claim.playerSaw) {
        const by = livingIds(g).filter(x => x !== speaker && x !== target && x !== g.player)
        if (by.length && chance(g.r, 0.22)) yield* refuteFlow(pick(g.r, by), speaker, claim)
      }
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
      ;(T.answered[target] || (T.answered[target] = [])).push(speaker)
      tick(1)
      if (kind === 'counter' && isLiving(g, speaker)) {
        recordAccuse(T, target, speaker)
        T.current = { accuser: target, target: speaker, clue: null, claim: null }
        yield { type: 'counter', speaker: target, target: speaker, tell }
      } else if (kind === 'alibi' && canAlibi(T, target)) yield* alibiFlow(target, true, tell)
      else yield { type: 'defend', speaker: target, against: speaker, tell }
      if (speaker === g.player && !T.exposed[target]) {
        const k = (c.known || []).find(x => x.liar === target && isLiving(g, x.witness))
        if (k) yield* exposeFlow(k.witness, target)
      }
    }
    // 当众出示（运行规则 3.2、4.6）：不相符的人拿出反证（看不见的特征只是他的说法——听说），相符的人只能辩解，持秘密者掷破绽。
    // 让时间窗偏移的证物：识破假窗口——此后大家按真正的死亡时刻对去向，被出示的人重新交代那一段。
    // 照片（拍立得）：尸体移走前的样子；出示时连同玩家自己框出的死亡时间窗（frame），大家按它对去向。
    function* presentFlow(speaker, target, k, opts = {}) {
      T.presents.push({ speaker, target: target || null, clue: k.id, t: g.minutes })
      if (speaker === g.player) T.presentLeft = Math.max(0, T.presentLeft - 1)
      if (target) recordAccuse(T, speaker, target)
      T.spoken[k.id] = true
      tick(2)
      if (target) T.current = { accuser: speaker, target, clue: k.id, claim: null }
      yield { type: 'present', speaker, target: target || null, clue: clueInfo(k), dim: k.dim || null, visible: !!k.visible, photo: !!opts.photo }
      if (k.shift || opts.photo) {
        const from = T.refTime
        if (k.shift) { T.refTime = c.tMurder; T.refKnown = true }
        else if (opts.frame && opts.frame.length === 2) T.refTime = Math.round((opts.frame[0] + opts.frame[1]) / 2)
        yield { type: 'reframe', speaker, time: T.refTime, from, shift: !!k.shift, frame: opts.frame || null }
        if (target && isLiving(g, target)) {
          const tl = tellOf(target, 'clue')
          yield* alibiFlow(target, true, tl)
        }
        return
      }
      if (!target || !isLiving(g, target) || !k.predicate) return
      const ok = pred(k.predicate)(charOf(g, target))
      ;(T.tested[target] || (T.tested[target] = {}))[k.id] = ok ? 'match' : 'rebut'
      tick(1)
      if (!ok) yield { type: 'rebut', speaker: target, against: speaker, clue: clueInfo(k), dim: k.dim || null, visible: !!k.visible, hearsay: !k.visible }
      else {
        const tell = tellOf(target, 'clue')
        yield { type: 'defend', speaker: target, against: speaker, tell, present: true, clue: clueInfo(k) }
      }
    }
    // 拿排除性事实（或看清了的疑似线索）驳回误导的「证据」
    function* refuteFlow(speaker, claimant, claim) {
      if (!isLiving(g, speaker)) return
      T.refuted[claimant] = speaker
      if (T.openClaim && T.openClaim.claim === claim) T.openClaim.refuted = true
      tick(1)
      yield { type: 'refute', speaker, target: claimant, claim, ok: true }
      const tl = tellOf(claimant, 'exposed')
      if (tl && tl.shown) yield Object.assign({ type: 'tell' }, tl)
    }
    // 凶手的误导：拿现场的一处陈设（排除性事实的反面，或一处疑似线索）指向最像的旁人
    function misleadSpots() {
      return (c.spots || []).filter(s => s.kind === 'decoy' && ((s.fact && CLAIM[s.fact]) || s.herring))
    }
    function* misleadFlow(a) {
      T.misled = true
      const sps = misleadSpots()
      const target = decoyOf(g, T, livingIds(g).filter(x => x !== a))
      if (!sps.length || !target) return false
      const sp = pick(g.r, sps)
      const label = sp.herring ? sp.object : fillO(CLAIM[sp.fact], sp.object)
      // 玩家细查过那一处（排除性事实卡；疑似线索要已看清）：留给他举手驳回
      const playerSaw = !!(sp.done && sp.by === g.player && (!sp.herring || sp.herring.cleared))
      const claim = { spot: sp.id, object: sp.object, key: sp.herring ? 'herring' : sp.fact, label, playerSaw }
      yield* exchange(a, target, null, claim)
      return true
    }
    // 玩家举手后的那一拍：出示 / 对质 / 追问 / 附议 / 质疑 / 驳回；返回是否真的说了（取消不算）
    function findClue(id) {
      if (id === 'photo') return c.photo ? { id: 'photo', name: '尸体照片', label: '尸体照片', tpl: 'photo', text: '', predicate: null } : null
      if (id === 'body') return c.cause.needs ? { id: 'body', name: c.cause.name, label: c.cause.name, tpl: 'body', predicate: c.cause.needs, dim: dimOf(c.cause), visible: !!c.cause.visible } : null
      return (c.clues || []).find(k => k.id === id && k.foundBy) || null
    }
    function* interjectFlow(a) {
      const me = g.player
      switch (a.kind) {
        case 'present': {
          if (T.presentLeft <= 0) return false
          const k = findClue(a.clue)
          if (!k || (a.target && (!isLiving(g, a.target) || a.target === me))) return false
          yield* presentFlow(me, a.target || null, k, { photo: k.id === 'photo', frame: a.frame })
          return true
        }
        case 'confront': {
          if (!a.a || !a.b || a.a === a.b) return false
          let liar = null, wit = null
          if (contradicts(c, a.a, a.b)) { liar = a.a; wit = a.b } else if (contradicts(c, a.b, a.a)) { liar = a.b; wit = a.a }
          const recorded = !!(a.recorded && c.recorded && [a.a, a.b].some(x => c.recorded.includes(x)))
          tick(1)
          yield { type: 'confront', speaker: me, a: a.a, b: a.b, ok: !!liar, liar, witness: wit, recorded }
          if (liar && isLiving(g, wit) && isLiving(g, liar) && !T.exposed[liar]) {
            yield* exposeFlow(wit, liar)
            // 放录音：说过的话抵赖不掉，旁人跟着附议
            if (recorded) {
              const by = shuffle(g.r, livingIds(g).filter(x => x !== me && x !== liar && x !== wit && P(g, x).lover !== liar)).slice(0, 2)
              for (const v of by) { (T.agree[liar] || (T.agree[liar] = [])).push(v); yield { type: 'interject', speaker: v, stance: 'agree', target: liar, accuser: me } }
            }
          }
          return true
        }
        case 'question': {
          if (!a.target || a.target === me || !isLiving(g, a.target)) return false
          tick(1)
          yield { type: 'question', speaker: me, target: a.target }
          yield* alibiFlow(a.target, true)
          return true
        }
        case 'agree': case 'doubt': {
          const cur = T.current
          if (!cur || !isLiving(g, cur.target) || cur.target === me) return false
          const book = a.kind === 'agree' ? T.agree : T.doubt
          ;(book[cur.target] || (book[cur.target] = [])).push(me)
          yield { type: 'interject', speaker: me, stance: a.kind, target: cur.target, accuser: cur.accuser }
          return true
        }
        case 'refute': {
          const oc = T.openClaim
          if (!oc || oc.refuted) return false
          const sp = (c.spots || []).find(x => x.id === oc.claim.spot)
          const ok = !!(sp && a.card === sp.id && sp.done && (!sp.herring || sp.herring.cleared))
          if (ok) yield* refuteFlow(me, oc.accuser, oc.claim)
          else { tick(1); yield { type: 'refute', speaker: me, target: oc.accuser, claim: oc.claim, ok: false } }
          return true
        }
      }
      return false
    }

    // ---- 第一段：从一号席起，在席的人依次各发言一次 ----
    T.phase = 'debate'
    const order = livingIds(g)
    for (const id of order) {
      yield* checkpoint()
      if (T.ended) break
      if (T.phase !== 'debate') break // 执行者通过并处刑后直接转入投票
      if (!isLiving(g, id)) continue
      yield { type: 'turn', speaker: id }
      if (id === g.player) {
        // 轮到玩家：可以先发动辩论能力（发动后仍轮到他发言），再指认、出示、交代去向或沉默
        let act = null, n = 0
        while (n++ < 8) {
          act = yield { type: 'ask-debate', speaker: id, canAlibi: canAlibi(T, id), presentLeft: T.presentLeft }
          yield* checkpoint()
          if (!act || act.kind !== 'ability' || T.ended || T.phase !== 'debate' || !isLiving(g, id)) break
        }
        if (T.ended || T.phase !== 'debate' || !isLiving(g, id)) break
        const pk = act && act.kind === 'present' && T.presentLeft > 0 ? findClue(act.clue) : null
        if (pk && (!act.target || (isLiving(g, act.target) && act.target !== id))) {
          yield* presentFlow(id, act.target || null, pk, { photo: pk.id === 'photo', frame: act.frame })
        } else if (act && act.kind === 'accuse' && isLiving(g, act.target) && act.target !== id) {
          yield* exchange(id, act.target, null)
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
          else {
            tick(2)
            const mode = d.say === 'clue' && d.clue ? 'clue' : 'statement'
            if (mode === 'clue') T.spoken[d.clue.id] = true
            yield { type: 'speech', speaker: id, mode, clue: mode === 'clue' ? clueInfo(d.clue) : null }
            // 看见自己留下的痕迹被人当众谈起
            if (mode === 'clue' && id !== c.murderer) {
              const tl = tellOf(c.murderer, 'traces')
              if (tl && tl.shown) yield Object.assign({ type: 'tell' }, tl)
            }
          }
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

    // ---- 第二段：公开讨论（每拍由最有话说的人发言；玩家举手插话；没有新论点时主持人喊停） ----
    function pickBeat(last) {
      const living = livingIds(g)
      const cands = []
      for (const a of living) {
        if (a === g.player || a === last) continue
        let best = null
        const add = (score, beat) => { if (!best || score > best.score) best = Object.assign({ score, speaker: a }, beat) }
        // 知道谁当众交代的去向与自己的真实去向矛盾：当众拆穿
        for (const L of living) if (L !== a && T.claimed[L] && !T.exposed[L] && contradicts(c, L, a) && P(g, a).lover !== L) add(3.4, { kind: 'expose', target: L })
        // 刚被指认、还没回应过
        const acc = (T.accuse[a] || []).filter(x => isLiving(g, x) && !(T.answered[a] || []).includes(x))
        if (acc.length) add(2.3, { kind: 'respond', target: acc[acc.length - 1] })
        // 凶手：拿现场的一处陈设误导（每场一次）
        if (a === T.murderer && !T.misled && T.mayMislead && misleadSpots().length && !T.knownMurderer) add(2.0, { kind: 'mislead' })
        const rk = ranked(g, T, a, living)
        const top = rk[0], margin = rk.length > 1 ? rk[0].s - rk[1].s : 9
        // 手里有让时间窗偏移的证物、还没人识破：出示（凶手自己不会）
        const sk = ownClues(T, a).find(k => k.shift)
        if (sk && !T.refKnown && a !== T.murderer && top) add(2.7, { kind: 'present', clue: sk, target: top.t })
        // 手里有看不见特征的证物：出示给最怀疑、还没对这件证物回应过的人
        const hidden = ownClues(T, a).filter(k => k.predicate && !k.visible && !T.presents.some(p => p.clue === k.id && p.speaker === a))
        if (hidden.length && a !== T.murderer) {
          const t = rk.find(x => !(T.tested[x.t] && T.tested[x.t][hidden[0].id]))
          if (t) add(2.1, { kind: 'present', clue: hidden[0], target: t.t })
        }
        // 自己找到、还没谈过的证物
        const fresh = ownClues(T, a).filter(k => !T.spoken[k.id])
        if (fresh.length) add(1.5, { kind: 'clue', clue: fresh[0] })
        // 有把握的怀疑：指认（还没指认过这个人）
        if (top && top.s > 0.9 && margin >= 0.5 && !(T.accuse[top.t] || []).includes(a)) add(1.2 + Math.min(1, margin * 0.3), { kind: 'accuse', target: top.t })
        // 追问去向：还没交代过的人里最可疑的
        const q = rk.find(x => !T.claimed[x.t] && canAlibi(T, x.t))
        if (q) add(0.9 + Math.max(0, Math.min(0.6, q.s * 0.2)), { kind: 'question', target: q.t })
        // 当前的指认：附议或质疑
        const cur = T.current
        if (cur && isLiving(g, cur.target) && cur.accuser !== a && cur.target !== a &&
          !(T.agree[cur.target] || []).includes(a) && !(T.doubt[cur.target] || []).includes(a)) add(0.95, { kind: 'interject', target: cur.target })
        if (!best) continue
        best.score += g.r() * 0.8 - 0.7 * (T.spokeOpen[a] || 0)
        cands.push(best)
      }
      cands.sort((x, y) => y.score - x.score)
      return cands.length && cands[0].score >= 1.05 ? cands[0] : null
    }
    function* runBeat(bt) {
      const a = bt.speaker
      T.spokeOpen[a] = (T.spokeOpen[a] || 0) + 1
      switch (bt.kind) {
        case 'expose': yield* exposeFlow(a, bt.target); break
        case 'respond': {
          ;(T.answered[a] || (T.answered[a] = [])).push(bt.target)
          const kind = aiRespond(g, T, a, bt.target)
          tick(1)
          if (kind === 'counter' && isLiving(g, bt.target)) { recordAccuse(T, a, bt.target); T.current = { accuser: a, target: bt.target, clue: null, claim: null }; yield { type: 'counter', speaker: a, target: bt.target, tell: null } }
          else if (kind === 'alibi' && canAlibi(T, a)) yield* alibiFlow(a, true)
          else yield { type: 'defend', speaker: a, against: bt.target, tell: null }
          break
        }
        case 'mislead': yield* misleadFlow(a); break
        case 'present': yield* presentFlow(a, bt.target, bt.clue); break
        case 'clue': {
          T.spoken[bt.clue.id] = true
          tick(2)
          yield { type: 'speech', speaker: a, mode: 'clue', clue: clueInfo(bt.clue) }
          if (a !== c.murderer) { const tl = tellOf(c.murderer, 'traces'); if (tl && tl.shown) yield Object.assign({ type: 'tell' }, tl) }
          break
        }
        case 'accuse': yield* exchange(a, bt.target, clueFor(g, T, a, bt.target, false)); break
        case 'question': {
          tick(1)
          yield { type: 'question', speaker: a, target: bt.target }
          yield* alibiFlow(bt.target, true)
          break
        }
        case 'interject': {
          const cur = T.current
          const sT = suspicion(g, T, a, cur.target), rk = ranked(g, T, a, livingIds(g))
          let stance = rk.length && sT >= rk[0].s - 0.6 ? 'agree' : 'doubt'
          if (P(g, a).lover === cur.target) stance = 'doubt'
          if (a === T.murderer && cur.target !== a) stance = 'agree'
          const book = stance === 'agree' ? T.agree : T.doubt
          ;(book[cur.target] || (book[cur.target] = [])).push(a)
          yield { type: 'interject', speaker: a, stance, target: cur.target, accuser: cur.accuser }
          break
        }
      }
    }
    if (!T.ended && T.phase === 'debate' && livingIds(g).length > 2) {
      T.stage = 'open'
      T.mayMislead = chance(g.r, 0.6) // 凶手这一场想不想拿陈设误导
      const n = livingIds(g).length
      let beats = n <= 8 ? randInt(g.r, 4, 6) : n >= 13 ? randInt(g.r, 6, 8) : randInt(g.r, 5, 7)
      T.beats = beats
      yield { type: 'discuss', beats }
      let b = 0, extra = 0, last = null, guardB = 0
      while (guardB++ < 40) {
        yield* checkpoint()
        if (T.ended || T.phase !== 'debate') break
        // 玩家举手：下一拍归他（最后一拍时举的手也算；最多多出两拍）
        if (T.handUp && g.player && isLiving(g, g.player) && T.hands > 0) {
          T.handUp = false
          const cur = T.current
          const oc = T.openClaim && !T.openClaim.refuted ? T.openClaim : null
          const a = yield { type: 'ask-interject', speaker: g.player, hands: T.hands, presentLeft: T.presentLeft, current: cur ? { accuser: cur.accuser, target: cur.target } : null, claim: oc ? { accuser: oc.accuser, target: oc.target, claim: oc.claim } : null }
          if (a && a.kind) {
            const said = yield* interjectFlow(a)
            if (said) {
              T.hands--
              T.handsUsed = (T.handsUsed || 0) + 1
              if (extra < 2) { beats++; extra++ }
              b++
              last = g.player
            }
          }
          continue
        }
        if (b >= beats) break
        const bt = pickBeat(last)
        if (!bt) { T.stopReason = 'exhausted'; break } // 论点说尽：主持人喊停
        yield* runBeat(bt)
        last = bt.speaker
        b++
      }
      T.beatsRun = b
      if (!T.stopReason) T.stopReason = 'beats'
      T.handUp = false
    }
    yield* checkpoint()

    // ---- 投票 ----
    if (!T.ended) {
      T.phase = 'vote'
      yield { type: 'debate-end', reason: T.stopReason || null }
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
  // 玩家举手（界面在公开讨论时调用）：下一拍归他
  function raiseHand(T) {
    if (!T || T.ended || T.stage !== 'open' || T.phase !== 'debate' || T.hands <= 0) return false
    T.handUp = true
    return true
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
      } else if (value.type === 'ask-interject') input = null
      else if (value.type === 'ask-respond') input = { kind: aiRespond(g, T, value.speaker, value.against) }
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
    version: 3, ID, LABELS, DIM_VISIBLE, RAKING, CLAIM, START_COINS, PRESENT_MAX, HAND_MAX,
    texts: { FACTS, DECOY_TEXT, DECOY_DETAIL, HERRINGS, BODY_TEXT, CLUE_LEAD },
    rng, pred, tally,
    create, newCase, buildClues, buildSpots, bodyStage, inspect, reexamine, spend, aiInvestigation,
    caseFacts, floorWord, dimOf,
    bodyReadings, readingsWindow, medWindow, apparentDeath, knowsShift, segAt, segSpan, claimSegs, contradictSeg, raiseHand, publicMatches,
    bodyState, eat, rest, nightRest, aiMeals, payCoins, gainCoins, takeBodyCoins, useTool, hasBlood, leave,
    buildWhere, contradicts, interview, interviewCost, flavorKind, aiRespond, aiInterject, clueFor,
    secretHolders, tellChance, noticeChance, rollTell, decisiveBallot, logEntry, callOf,
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
