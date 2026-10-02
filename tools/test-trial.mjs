// 庭审引擎的规则测试：node tools/test-trial.mjs
// 依据 主持人游戏.md 第三节（投票、平票、误判与结束）、第五节（各身份）、第八节（金币）。
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
globalThis.window = globalThis
require(join(ROOT, 'assets/data/world.js'))
require(join(ROOT, 'assets/data/characters.js'))
require(join(ROOT, 'assets/data/lore.js'))
const TE = require(join(ROOT, 'assets/js/sections/trial-engine.js'))

let pass = 0, fail = 0
function ok(cond, name) {
  if (cond) { pass++; console.log('  \x1b[32m✓\x1b[0m ' + name) }
  else { fail++; console.log('  \x1b[31m✗ ' + name + '\x1b[0m') }
}
function section(t) { console.log('\n' + t) }

const ALL = globalThis.CHARACTERS.map(c => c.id)
// 造一局：前 n 人入座，assign 指定正位身份
function game(n, assign = {}, opts = {}) {
  const seats = Array(15).fill(null)
  const ids = opts.ids || ALL.filter(id => !['griffith', 'johnny'].includes(id)).slice(0, n)
  ids.forEach((id, i) => { seats[opts.seatOf ? opts.seatOf(i) : i] = id })
  const g = TE.create({ seats, seed: opts.seed || 7, assign, player: opts.player || null })
  return { g, ids }
}
// 造一场庭审（不经过 newCase）：指定凶手
function trial(g, murderer) {
  const c = { type: 'case', no: 1, murderer, victim: null, cause: { id: 'stab', needs: '' }, clues: [], spots: [], tCourt: g.minutes, tMurder: g.minutes - 200 }
  return TE.openTrial(g, c)
}
function voteAll(g, T, V, map) {
  for (const v of V.voters) TE.cast(g, T, V, v, map[v] === undefined ? null : map[v])
}

/* ---------------- 计票纯函数 ---------------- */
section('计票')
{
  const r = TE.tally({ ballots: [{ voter: 'a', target: 'b' }, { voter: 'b', target: 'c' }, { voter: 'c', target: 'b' }], candidates: ['a', 'b', 'c'] })
  ok(r.result === 'b' && r.totals.b === 2, '唯一最高者形成有效选择')
}
{
  const r = TE.tally({ ballots: [], clowns: ['a'], candidates: ['a', 'b'] })
  ok(r.totals.a === -1, '负票数保留，不归零（小丑 0 → −1）')
  ok(r.result === null && r.max === 0, '最高票 ≤ 0 视为未产生唯一有效结果')
}
{
  const r = TE.tally({ ballots: [{ voter: 'a', target: 'b' }, { voter: 'b', target: 'a' }], candidates: ['a', 'b'] })
  ok(r.result === null && r.tie && r.top.length === 2, '最高票并列 → 无有效选择')
}
{
  const r = TE.tally({ ballots: [{ voter: 'a', target: 'b' }, { voter: 'b', target: 'a' }], judges: [{ actor: 'c', target: 'a' }], candidates: ['a', 'b', 'c'] })
  ok(r.result === 'a' && r.base.a === 1 && r.totals.a === 2, '法官 +1 可与本人票选对象不同，并打破并列')
}
{
  const ballots = [{ voter: 'a', target: 'h' }, { voter: 'b', target: 'h' }, { voter: 'h', target: 'h' }]
  const r = TE.tally({ ballots, reflect: { hanged: 'h', voter: 'a' }, candidates: ['a', 'b', 'h'] })
  ok(r.totals.h === 2 && r.totals.a === 1, '倒吊人把一张他人的基础票反弹给原投票者')
  const r2 = TE.tally({ ballots, reflect: { hanged: 'h', voter: 'h' }, candidates: ['a', 'b', 'h'] })
  ok(r2.totals.h === 3, '自投的票不能反弹')
  const r3 = TE.tally({ ballots: [{ voter: 'a', target: 'b' }], judges: [{ actor: 'j', target: 'h' }], reflect: { hanged: 'h', voter: 'j' }, candidates: ['a', 'b', 'h', 'j'] })
  ok(r3.totals.h === 1 && r3.totals.j === 0, '能力增加的票不能反弹')
}
{
  const r = TE.tally({ ballots: [{ voter: 'x', target: 'k' }], knightBonus: [{ knight: 'k', accuser: 'x' }], candidates: ['k', 'x'] })
  ok(r.totals.k === 2, '被骑士错指者投骑士时，骑士额外受一票')
}
{
  const r = TE.tally({ ballots: [{ voter: 'a', target: 'b' }], judges: [{ actor: 'j', target: 'a', effective: false }], candidates: ['a', 'b'] })
  ok(r.totals.a === 0, '被沉默的法官，指定不生效')
}

/* ---------------- 平票与无结果 ---------------- */
section('平票、无结果、误判')
{
  const { g, ids } = game(6)
  const [a, b, c, d, e, f] = ids
  const T = trial(g, f)
  T.phase = 'vote'
  let V = TE.beginVote(g, T)
  voteAll(g, T, V, { [a]: b, [b]: a, [c]: a, [d]: b, [e]: f, [f]: e })
  let r = TE.settle(g, T, V)
  ok(r.outcome === 'tie' && T.tieBan.includes(a) && T.tieBan.includes(b), '首次最高票并列 → 立即重投并记下并列者')
  V = TE.beginVote(g, T)
  ok(!V.voters.includes(a) && !V.voters.includes(b) && V.voters.length === 4, '并列者在紧接着的重投中不能投票')
  ok(V.targets.includes(a) && V.targets.includes(b), '并列者仍可被投')
  voteAll(g, T, V, { [c]: d, [d]: c, [e]: f, [f]: e })
  r = TE.settle(g, T, V)
  ok(r.outcome === 'end' && T.ended && T.endReason === 'noresult', '连续两次无法产生唯一有效结果，本批结束，不处刑')
  ok(ids.every(id => TE.isLiving(g, id)), '无结果结束时无人被处刑')
}
{
  const { g, ids } = game(5, { [ALL[0]]: '小丑' })
  const T = trial(g, ids[4])
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  V.voters.forEach(v => TE.cast(g, T, V, v, v === ids[0] ? ids[1] : ids[0]))
  const r = TE.settle(g, T, V)
  ok(r.outcome === 'unique' && r.base[ids[0]] === 4 && r.totals[ids[0]] === 3, '小丑总票数减一（隐藏修正），仍可成为唯一最高者')
}
{
  // 没有并列、但最高票不大于零：两名小丑都没有投票权，第三人（刚才的待处刑者，不能被选）投其中一人
  const { g, ids } = game(3, { [ALL[0]]: '小丑', [ALL[1]]: '小丑' })
  const [a, b, x] = ids
  const T = trial(g, x)
  T.phase = 'vote'
  TE.person(g, a).ident.noVote = true
  TE.person(g, b).ident.noVote = true
  T.hopeBan = x
  let V = TE.beginVote(g, T)
  ok(V.voters.length === 1 && !V.targets.includes(x), '只剩一名投票者，且他不能被选')
  TE.cast(g, T, V, x, a)
  const r = TE.settle(g, T, V)
  ok(r.totals[a] === 0 && r.totals[b] === -1 && r.top.length === 1, '唯一最高者为 0 票、另一人 −1 票')
  ok(r.outcome === 'none' && T.tieBan.length === 0 && T.noResult === 1, '最高票不大于零 → 无结果；没有并列对象 → 保持原投票资格重投')
  V = TE.beginVote(g, T)
  ok(V.voters.includes(x) && V.targets.includes(x), '重投时资格不变（希望之人的排除也已解除）')
}
{
  const { g, ids } = game(6)
  const m = ids[5]
  const T = trial(g, m)
  T.phase = 'vote'
  let V = TE.beginVote(g, T)
  voteAll(g, T, V, Object.fromEntries(ids.map(v => [v, v === ids[0] ? ids[1] : ids[0]])))
  let r = TE.settle(g, T, V)
  ok(r.outcome === 'unique' && r.pending === ids[0] && T.noResult === 0, '产生唯一选择，连续无结果计数清零')
  let v = TE.verdict(g, T, ids[0])
  ok(!v.correct && v.misjudge === 1 && !T.ended && !TE.isLiving(g, ids[0]), '第一次误判：被选中者先处死，审判继续')
  V = TE.beginVote(g, T)
  voteAll(g, T, V, Object.fromEntries(V.voters.map(x => [x, x === ids[1] ? ids[2] : ids[1]])))
  r = TE.settle(g, T, V)
  v = TE.verdict(g, T, r.pending)
  ok(!v.correct && v.misjudge === 2 && T.ended && T.endReason === 'misjudge', '本批第二次误判后结束')
  const pay = TE.closeTrial(g, T)
  ok(pay.desk[m] === 10 && Object.values(pay.table).every(n => n === 5), '未查明：存活者各五枚，凶手十枚在书桌上')
  ok(pay.table[ids[0]] === undefined, '死者不发金币')
}
{
  // 两人庭审误判：处刑结算完毕后只剩凶手一人 → 不再投票，由他胜出
  const { g, ids } = game(5)
  const [a, b] = ids
  for (const id of ids.slice(2)) TE.person(g, id).alive = false
  const T = trial(g, b)
  const v = TE.verdict(g, T, a)
  ok(!v.correct && v.ended && T.ended && T.endReason === 'last' && TE.winner(g) === b, '处刑结算完毕后只剩一人：本场结束，他就是胜者')
}
{
  const { g, ids } = game(5)
  const T = trial(g, ids[4])
  const v = TE.verdict(g, T, ids[4])
  ok(v.correct && T.solved && T.ended, '选中实际凶手：判定正确，本批结束')
  const pay = TE.closeTrial(g, T)
  ok(Object.values(pay.table).every(n => n === 10) && Object.keys(pay.desk).length === 0, '查明：每名存活者五枚 + 五枚')
}

/* ---------------- 白痴、身怀希望之人 ---------------- */
section('白痴与身怀希望之人')
{
  const { g, ids } = game(5, { [ALL[1]]: '白痴' })
  const idiot = ids[1]
  const T = trial(g, ids[4])
  ok(TE.idiotHolder(g, T, idiot) === idiot, '成为唯一待处刑者的白痴可以发动')
  const r = TE.useIdiot(g, T, idiot)
  ok(r.effect === 'cancel', '白痴不是凶手：撤销处刑')
  const V = TE.beginVote(g, T)
  ok(!V.voters.includes(idiot) && !V.targets.includes(idiot), '本场剩余期间白痴不能投票，也不能被投')
  ok(TE.idiotHolder(g, T, idiot) === null, '白痴的机会已消耗')
}
{
  const { g, ids } = game(5, { [ALL[2]]: '白痴' })
  const T = trial(g, ids[2])
  const r = TE.useIdiot(g, T, ids[2])
  ok(r.effect === 'fail' && T.knownMurderer === ids[2], '白痴是真凶时能力失败，并向全体确认其为凶手')
}
{
  const { g, ids } = game(5, { [ALL[3]]: '身怀希望之人' })
  const hope = ids[3]
  const T = trial(g, ids[4])
  ok(TE.hopeHolders(g, T, hope).length === 0, '待处刑者必须为其他角色')
  const r = TE.useHope(g, T, hope, ids[0])
  ok(r && r.effect === 'cancel', '身怀希望之人撤销结果')
  let V = TE.beginVote(g, T)
  ok(!V.targets.includes(ids[0]) && V.voters.includes(ids[0]), '立即重投：所有人不能选择刚才的待处刑者（他本人仍可投票）')
  TE.cast(g, T, V, ids[1], ids[0])
  ok(V.ballots[0].target !== ids[0], '投向原待处刑者的票无效（按弃票自投）')
  voteAll(g, T, V, {})
  TE.settle(g, T, V)
  V = TE.beginVote(g, T)
  ok(V.targets.includes(ids[0]), '限制在本次重投结束后解除')
}

/* ---------------- 执行者、骑士、沉默者、河豚 ---------------- */
section('执行者、骑士、沉默者、河豚')
{
  const { g, ids } = game(9, { [ALL[0]]: '执行者' })
  const ex = ids[0], target = ids[1]
  TE.person(g, ids[7]).ident.noVote = true
  TE.person(g, ids[8]).ident.noVote = true
  const T = trial(g, ids[6])
  T.phase = 'debate'
  let V = TE.beginVote(g, T, 'special', { actor: ex, target })
  ok(V.voters.length === 7, '特殊表决：无投票权者不投票')
  // 七名有投票权者中四人投指定对象：4 > 9/2 ? 否（总人数含无投票权者）
  V.voters.forEach((v, i) => TE.cast(g, T, V, v, i < 4 ? target : null))
  let r = TE.settle(g, T, V)
  ok(r.outcome === 'fail' && r.total === 9 && r.count === 4, '执行者的过半数以存活在馆总人数计（含无投票权者）：4/9 不通过')
  T.phase = 'debate'
  V = TE.beginVote(g, T, 'special', { actor: ex, target })
  V.voters.forEach((v, i) => TE.cast(g, T, V, v, i < 5 ? target : null))
  r = TE.settle(g, T, V)
  ok(r.outcome === 'pass' && r.pending === target, '5/9 超过半数，成为待处刑者')
  const v = TE.verdict(g, T, target, { kind: 'special', actor: ex })
  ok(!v.correct && TE.person(g, ex).ident.noVote === true, '处刑后若非真凶，执行者永久失去投票权')
}
{
  const { g, ids } = game(6, { [ALL[0]]: '骑士', [ALL[1]]: '骑士' })
  const T = trial(g, ids[5])
  T.phase = 'debate'
  const bad = TE.knight(g, T, ids[0], ids[2])
  ok(bad && bad.success === false && TE.person(g, ids[0]).ident.noVote && TE.person(g, ids[0]).ident.wrongTarget === ids[2], '骑士揭发失败：永久失去投票权，记下被错指者')
  ok(TE.knight(g, T, ids[0], ids[5]) === null, '骑士揭发仅一次')
  const good = TE.knight(g, T, ids[1], ids[5])
  ok(good.success && T.knownMurderer === ids[5] && !TE.person(g, ids[1]).ident.noVote, '揭发成功：主持人确认凶手，骑士保留投票权')
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  ok(!V.voters.includes(ids[0]), '失去投票权的骑士不在投票者之列')
  TE.cast(g, T, V, ids[2], ids[0])
  V.voters.filter(x => x !== ids[2]).forEach(x => TE.cast(g, T, V, x, ids[5]))
  const r = TE.settle(g, T, V)
  ok(r.totals[ids[0]] === 2, '被错指者把基础票投给骑士，骑士额外受一票')
}
{
  const { g, ids } = game(5, { [ALL[0]]: '沉默者', [ALL[1]]: '法官' })
  const T = trial(g, ids[4])
  T.phase = 'debate'
  TE.silence(g, T, ids[0], ids[1])
  ok(TE.silence(g, T, ids[0], ids[2]) === null, '沉默者每次审判仅一次')
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  const j = TE.judge(g, T, V, ids[1], ids[3])
  ok(j && j.effective === false, '被沉默者的正位能力失效（对方不会知道）')
}
{
  const seats = Array(15).fill(null)
  const ids = ALL.slice(0, 6)
  ;[1, 2, 3, 5, 6, 15].forEach((s, i) => { seats[s - 1] = ids[i] })
  const g = TE.create({ seats, seed: 3, assign: { [ids[0]]: '河豚' } })
  // 中心席 15 号（ids[5]）：左右相邻是 14 号（空席）与 1 号（ids[0]）
  let T = trial(g, ids[1])
  T.phase = 'debate'
  ok(TE.pufferChoose(g, ids[0], 2), '河豚选择一个有人的席位')
  ok(!TE.pufferChoose(g, ids[0], 3), '席位未成空席前不可变更')
  let r = TE.puffer(g, T, ids[0])
  ok(r.yes === false, '中心席本身不被查验（2 号席的凶手不算）')
  ok(TE.puffer(g, T, ids[0]) === null, '每次审判查询一次')
  // 换一场：凶手在 3 号席
  T = trial(g, ids[2]); T.phase = 'debate'
  r = TE.puffer(g, T, ids[0])
  ok(r.yes === true, '左右相邻席存在本批凶手 →「有」')
  const g2 = TE.create({ seats, seed: 3, assign: { [ids[0]]: '河豚' } })
  TE.pufferChoose(g2, ids[0], 6) // 6 号席：左 5 号（ids[3]），右 7 号（空席），空席不跨越到 8 号
  const T2 = trial(g2, ids[3]); T2.phase = 'debate'
  ok(TE.puffer(g2, T2, ids[0]).yes === true, '相邻的凶手被查到')
  const T3 = trial(g2, ids[5]); T3.phase = 'debate'
  ok(TE.puffer(g2, T3, ids[0]).yes === false, '空席不跨越')
}

/* ---------------- 先知、占卜家、敲钟人、恋人、魔术师 ---------------- */
section('先知、占卜家、敲钟人、恋人、魔术师')
{
  const { g, ids } = game(6, { [ALL[0]]: '先知', [ALL[1]]: '占卜家' }, { player: ALL[0] })
  const c = TE.newCase(g)
  ok(g.notices.some(n => n.type === 'death' && n.at === c.tMurder), '先知在死亡时刻收到「有人死亡」')
  const T = TE.openTrial(g, c)
  const before = g.notices.length
  const target = TE.livingIds(g).find(x => x !== g.player && x !== c.murderer)
  TE.verdict(g, T, target)
  ok(g.notices.length === before + 1, '先知的通知包括主持人处刑')
  const g2 = game(6, { [ALL[1]]: '占卜家' }, { player: ALL[0] }).g
  const fr = TE.fortune(g2, ALL[1], ALL[0])
  ok(fr && fr.name === TE.frontName(g2, ALL[0]) && g2.notices.some(n => n.type === 'known'), '占卜家得知当前正位身份名，被查验者收到通知')
  ok(TE.fortune(g2, ALL[1], ALL[2]) === null, '占卜家每天一次')
}
{
  let found = false
  for (let s = 1; s < 200 && !found; s++) {
    const { g } = game(12, {}, { seed: s })
    const c = TE.newCase(g)
    if (c.type === 'case' && TE.person(g, c.murderer).back === '敲钟人') {
      found = true
      ok(c.investMinutes === 30 && c.tCourt - c.tDiscover === 30, '敲钟人行凶：调查时间三十分钟')
    }
  }
  if (!found) ok(false, '敲钟人行凶：调查时间三十分钟（未抽到）')
  const { g } = game(12, {}, { seed: 11 })
  const c = TE.newCase(g)
  ok(c.type !== 'case' || TE.person(g, c.murderer).back === '敲钟人' || c.investMinutes === 120, '平常调查一百二十分钟')
}
{
  const { g, ids } = game(6, { [ALL[0]]: '丘比特' })
  TE.cupid(g, ids[0], ids[1], ids[2])
  const T = trial(g, ids[1])
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  TE.cast(g, T, V, ids[0], ids[3])
  TE.cast(g, T, V, ids[1], ids[4])
  const b = TE.cast(g, T, V, ids[2], ids[5])
  ok(b.target === ids[4] && b.forced, '恋人须票选同一对象，以先投票者为准')
  g.mandated = ids[1]
  const v = TE.verdict(g, T, ids[1])
  ok(v.correct && v.executed.includes(ids[2]) && !TE.isLiving(g, ids[2]), '受命者被处刑时，帮凶（恋人）一同处死')
}
{
  const { g, ids } = game(5, { [ALL[0]]: '魔术师', [ALL[1]]: '骑士' })
  TE.person(g, ids[1]).ident.noVote = true
  const r = TE.magic(g, ids[0], ids[1], ids[2])
  ok(r && TE.frontName(g, ids[2]) === '骑士' && TE.person(g, ids[2]).ident.noVote && !TE.person(g, ids[1]).ident.noVote, '魔术师交换正位，连同身份代价一并转移')
  ok(TE.magic(g, ids[0], ids[3], ids[4]) === null, '魔术师仅一次')
}

/* ---------------- 受命资格与线索 ---------------- */
section('受命资格与线索')
{
  let bad = 0, saintBad = 0, clueBad = 0, over = 0, cases = 0
  for (let s = 1; s <= 400; s++) {
    const ids = ['griffith', 'johnny'].concat(ALL.filter(x => !['griffith', 'johnny'].includes(x)).slice(s % 20, s % 20 + 10))
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s, player: ids[2] })
    const c = TE.newCase(g)
    if (c.type !== 'case') continue
    cases++
    const m = g.charMap[c.murderer]
    if (m.canWalk === false && !['poison', 'door'].includes(c.cause.id)) bad++
    if (TE.frontName(g, c.murderer) === '圣女') saintBad++
    if (c.murderer === g.player || c.victim === g.player || c.victim === c.murderer) bad++
    for (const k of c.clues) if (!TE.pred(k.predicate)(m)) clueBad++
    if (c.clues.length > 4 || c.clues.length < 1) over++
  }
  ok(cases > 300 && bad === 0, '不能行走者只以毒或门行凶；凶手、死者都不是玩家')
  ok(saintBad === 0, '圣女不会被选中成为受命者')
  ok(clueBad === 0, '每条线索对凶手都为真')
  ok(over === 0, '线索最多四条')
}
{
  let narrowed = 0, total = 0
  for (let s = 1; s <= 200; s++) {
    const { g } = game(15, {}, { seed: s, ids: ALL.slice(s % 20, s % 20 + 15) })
    const c = TE.newCase(g)
    if (c.type !== 'case') continue
    total++
    if (c.remaining.length <= 2) narrowed++
  }
  ok(narrowed / total > 0.6, `多数案件把嫌疑人缩到一两人（${narrowed}/${total}）`)
}

/* ---------------- 整局 ---------------- */
section('整局自动模拟')
{
  let finals = 0, stalls = 0, guards = 0, errors = 0, onlyOne = 0
  for (let s = 1; s <= 120; s++) {
    try {
      const n = [5, 8, 12, 15][s % 4]
      const ids = ALL.slice((s * 3) % 23, (s * 3) % 23 + n)
      const seats = Array(15).fill(null)
      ids.forEach((id, i) => { seats[(i * 2) % 15] = id })
      const res = TE.autoGame({ seats, seed: s * 13 })
      if (res.end.type === 'final') { finals++; if (TE.livingIds(res.g).length <= 1) onlyOne++ }
      else if (res.end.type === 'stall') stalls++
      else guards++
    } catch (e) { errors++; console.error(e) }
  }
  ok(errors === 0 && guards === 0, '一百二十局都能结束，无异常')
  ok(finals === onlyOne && finals + stalls === 120, `终局时只剩一人（${finals} 局终局，${stalls} 局无人可受命）`)
}

console.log(`\n${pass} 通过，${fail} 失败`)
process.exit(fail ? 1 : 0)
