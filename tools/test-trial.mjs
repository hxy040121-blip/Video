// 庭审引擎的规则测试：node tools/test-trial.mjs
// 依据 主持人游戏.md 第 3 节（投票、平票、误判与结束；辩论分两段）、第 5 节（各身份）、第 7 节（广播与称呼）、第 8 节（金币）；
// 运行规则 3.2、4.6（当众出示与听说）、5.4（破绽与察觉）、7.5（结案对账）；洋馆物理层 7（痕迹、尸体读数与环境干扰）、8.3（耗时）；
// 身体结算 1、2、4（饥饿与困倦）；价目表 8.1—8.2（钱袋、整百、不成立）；开局流程 2.4（退出券）。
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
globalThis.window = globalThis
require(join(ROOT, 'assets/data/world.js'))
require(join(ROOT, 'assets/data/characters.js'))
require(join(ROOT, 'assets/data/characters-new.js'))
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
  // 小丑的能力不会被沉默（主持人游戏 5.2）
  const { g, ids } = game(5, { [ALL[0]]: '小丑', [ALL[1]]: '沉默者' })
  const T = trial(g, ids[4])
  T.phase = 'debate'
  ok(TE.silence(g, T, ids[1], ids[0]) && T.silenced.includes(ids[0]), '沉默者封锁了小丑')
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  V.voters.forEach(v => TE.cast(g, T, V, v, v === ids[0] ? ids[1] : ids[0]))
  const r = TE.settle(g, T, V)
  ok(r.base[ids[0]] === 4 && r.totals[ids[0]] === 3, '被沉默的小丑仍减一票')
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
  // 被表决者本人（AI）：自投或弃票都会计入指定对象，所以他会改投旁人
  let bad = 0
  for (let s = 1; s <= 40; s++) {
    const { g, ids } = game(8, { [ALL[0]]: '执行者' }, { seed: s })
    const T = trial(g, ids[7])
    T.phase = 'debate'
    const target = ids[1 + (s % 6)]
    const V = TE.beginVote(g, T, 'special', { actor: ids[0], target })
    const t = TE.aiBallot(g, T, V, target)
    if (t === target) bad++
  }
  ok(bad === 0, '特殊表决中，被指定者本人不会把票投给自己')
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
  ok(fr && fr.name === TE.frontName(g2, ALL[0]) && g2.notices.length === 0, '占卜家得知当前正位身份名，被查验者不收到任何通知')
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
    for (const k of c.clues) {
      if (k.shift) { if (k.predicate !== null || !TE.pred(k.needs)(m) || k.dim !== 'time') clueBad++ }
      else if (!TE.pred(k.predicate)(m)) clueBad++
    }
    if (c.clues.length !== 3) over++
  }
  ok(cases > 300 && bad === 0, '不能行走者只以毒或门行凶；凶手、死者都不是玩家')
  ok(saintBad === 0, '圣女不会被选中成为受命者')
  ok(clueBad === 0, '筛人的线索对凶手都为真；让死亡时间窗偏移的那条不筛人（判别条件为空），「想得到这样做」的条件对凶手成立')
  ok(over === 0, '每案恰好三条线索')
}
{
  // 线索去重：同一维度不重复（死因要求的维度也算已用）；每条都标出维度与看不看得见；手印带离地厘米数
  let cases = 0, dupDim = 0, noDim = 0, causeDup = 0, hand = 0, handBad = 0, labelLong = 0, dimSeen = new Set(), visBad = 0
  for (let s = 1; s <= 500; s++) {
    const ids = ALL.slice((s * 7) % 40, (s * 7) % 40 + [8, 12, 15][s % 3])
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 17, player: ids[1] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    cases++
    const dims = c.clues.map(k => k.dim)
    if (dims.some(d => !d)) noDim++
    if (new Set(dims).size !== dims.length) dupDim++
    if (c.cause.needs && c.cause.glyph && dims.includes(c.cause.glyph)) causeDup++
    for (const k of c.clues) {
      dimSeen.add(k.dim)
      if (k.visible !== TE.DIM_VISIBLE[k.dim]) visBad++
      if (Array.from(k.label).length > 12) labelLong++
      if (k.tpl === 'handprint') { hand++; if (!/约\d+厘米/.test(k.label) || !/离地约\d+厘米/.test(k.text)) handBad++ }
    }
  }
  ok(cases > 400 && noDim === 0 && dupDim === 0, `同一维度不重复（${cases} 案）`)
  ok(causeDup === 0, '死因要求的维度（扼颈要受训）不再出一条同维度的线索')
  ok(dimSeen.size === 8 && visBad === 0, '八个维度都会出现（含「死亡时间」）；身高、性别、体格、随身物看得见，医护、现场观察、年代与器械看不见')
  ok(hand > 20 && handBad === 0, `手印卡带「约 N 厘米」（${hand} 张）`)
  ok(labelLong === 0, '证物卡短名不超过十二个字')
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
  ok(narrowed / total > 0.65, `多数案件把嫌疑人缩到一两人（${narrowed}/${total}）`)
}

/* ---------------- 去向与询问 ---------------- */
section('去向、询问与拆穿')
{
  let cases = 0, bad = 0, lies = 0, truthful = 0, contraBad = 0, playerWit = 0, askBad = 0, costBad = 0
  for (let s = 1; s <= 300; s++) {
    const ids = ALL.slice(s % 24, s % 24 + 12)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 7, player: ids[s % 12] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    cases++
    const W = c.where
    for (const id of TE.livingIds(g)) if (!W[id]) bad++
    const m = W[c.murderer]
    if (['poison', 'door'].includes(c.cause.id)) { if (m.lie) bad++; else truthful++ }
    else {
      if (!m.lie || m.room !== c.roomInfo.name || m.claim.room === c.roomInfo.name || m.claim.with.length) bad++
      else lies++
    }
    for (const id in W) {
      if (id !== c.murderer && (W[id].lie || W[id].claim.room !== W[id].room || W[id].room === c.roomInfo.name)) bad++
      for (const w in W) if (TE.contradicts(c, id, w) && id !== c.murderer) contraBad++
    }
    // 询问：花时间、不能问两次、问出与玩家自己去向的矛盾
    const t0 = g.minutes
    const target = TE.livingIds(g).find(x => x !== g.player)
    const r = TE.interview(g, c, target)
    if (!r || r.cost <= 0 || g.minutes !== t0 + r.cost || r.room !== W[target].claim.room) costBad++
    if (TE.interview(g, c, target) !== null) askBad++
    if (TE.interview(g, c, g.player) !== null) askBad++
    if (W[c.murderer] && W[c.murderer].lie && W[g.player] && W[g.player].room === W[c.murderer].claim.room) {
      const before = c.known.length
      const r2 = c.asked.includes(c.murderer) ? null : TE.interview(g, c, c.murderer)
      if (r2 && c.tCourt > g.minutes - r2.cost) { playerWit++; if (!c.known.some(k => k.liar === c.murderer && k.witness === g.player) || c.known.length <= before) askBad++ }
    }
  }
  // 玩家问出凶手的谎、开庭时指认他：由玩家（在场的证人）当众拆穿
  let shown = 0, tried = 0
  for (let s = 1; s <= 400 && tried < 12; s++) {
    const ids = ALL.slice(s % 24, s % 24 + 12)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 7, player: ids[s % 12] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined || !c.where[c.murderer] || !c.where[c.murderer].lie) continue
    if (!c.where[g.player] || c.where[g.player].room !== c.where[c.murderer].claim.room) continue
    if (!TE.interview(g, c, c.murderer) || !c.known.length) continue
    tried++
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    const it = TE.trialFlow(g, T)
    let input, n = 0, hit = false, turn = false
    while (n++ < 2000) {
      const { value, done } = it.next(input)
      if (done) break
      input = undefined
      if (value.type === 'expose' && value.speaker === g.player && value.target === c.murderer) hit = true
      if (value.type === 'ask-debate') { turn = true; input = { kind: 'accuse', target: c.murderer } }
      else if (value.type === 'ask-respond') input = { kind: 'defend' }
      else if (value.type === 'ask-vote') input = value.forced || c.murderer
      else if (value.type === 'ask-idiot' || value.type === 'ask-hope') input = false
    }
    if (!turn) { tried--; continue } // 执行者提前终止了辩论，没轮到玩家
    if (hit) shown++
  }
  ok(tried > 0 && shown === tried, `询问时问出的谎，玩家指认时当众拆穿（${shown}/${tried}）`)
  ok(cases > 200 && bad === 0, `每个在馆者都有去向；无辜者照实说，亲手行凶的凶手说自己在别处（${lies} 案说谎，${truthful} 案下毒/关门照实说）`)
  ok(contraBad === 0, '只有凶手的说法会与旁人的真实去向相矛盾')
  ok(costBad === 0 && askBad === 0, `询问花费调查时间、每人一次、不能问自己；玩家本人在场时问出凶手的谎（${playerWit} 例）`)
}

/* ---------------- 调查的文字 ---------------- */
section('调查的文字')
{
  let decoys = 0, empty = 0, herrings = 0, repeats = 0, bodyBad = 0, leads = 0, games = 0, facts = 0, contra = 0, herrBad = 0, recheck = 0
  const texts = []
  for (let s = 1; s <= 60; s++) {
    const ids = ALL.slice(s % 23, s % 23 + 15)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 31, player: ids[0] })
    const seen = new Set()
    games++
    for (let n = 0; n < 6; n++) {
      const c = TE.newCase(g)
      if (c.type !== 'case' || c.lastStanding !== undefined) break
      const f = TE.caseFacts(c)
      for (const sp of c.spots) {
        if (sp.kind === 'decoy') {
          decoys++
          if (!sp.desc) empty++
          if (seen.has(sp.desc)) repeats++
          seen.add(sp.desc)
          if (sp.fact) facts++
          // 排除性事实不与本案矛盾
          if ((sp.fact === 'not-dragged' && (f.moved || f.scuffed)) || (sp.fact === 'no-wash' && f.washed) || (sp.fact === 'no-handprint' && f.handprint) ||
            (sp.fact === 'no-forced' && f.door) || (sp.flavor === 'vessel' && sp.fact === 'not-used' && f.cupUsed) || (sp.fact === 'not-moved' && f.furniture) ||
            (sp.fact === 'not-from-water' && (f.moved || f.drown)) || (sp.flavor === 'fridge' && f.freezer && sp.fact)) contra++
          texts.push(sp.desc, sp.detail || '')
          if (sp.herring) {
            herrings++
            if (!sp.herring.bait || !sp.herring.truth) empty++
            texts.push(sp.herring.bait, sp.herring.truth)
            const r1 = TE.inspect(g, c, sp.id, null)
            if (!r1 || !r1.herring || r1.herring.truth || r1.desc === sp.herring.truth) herrBad++ // 当场只看见可疑的东西
            const t0 = g.minutes
            const r2 = TE.reexamine(g, c, sp.id)
            if (r2 && (r2.cost < 3 || r2.cost > 5 || g.minutes !== t0 + r2.cost || r2.truth !== sp.herring.truth)) herrBad++
            if (r2) recheck++
            if (TE.reexamine(g, c, sp.id) !== null) herrBad++
          }
        } else if (sp.kind === 'body') { if (!sp.obs) bodyBad++; texts.push(sp.obs) } else if (sp.lead) { leads++; texts.push(sp.lead) }
      }
      const res = TE.inspect(g, c, 'body', null)
      if (!res || !res.obs || !res.stage) bodyBad++
      // 不调查，直接开庭、判定（让下一案能继续）
      TE.courtOpen(g, c)
      const T = TE.openTrial(g, c)
      TE.autoTrial(g, T)
      TE.closeTrial(g, T)
      if (TE.winner(g)) break
    }
  }
  ok(decoys > 300 && empty === 0, `诱饵点都有按陈设写的描写（${decoys} 处）`)
  ok(repeats === 0, '同一局里诱饵点的描写不重复')
  ok(herrings > decoys * 0.12 && herrings < decoys * 0.4, `偶有疑似线索（${herrings} 处）`)
  ok(bodyBad === 0 && leads > 100, '验尸按死因与尸体阶段描写；发现线索时有动作描写')
  ok(facts > decoys * 0.6 && contra === 0, `陈设点多半给出排除性事实，且不与本案矛盾（${facts}/${decoys}）`)
  ok(herrBad === 0 && recheck > 30, `疑似线索当场不揭晓，再看一次花三到五分钟才看清（${recheck} 处）`)
  // 描写里只写馆里实有的东西：灯亮着（没有手电）、刚打扫过（没有积灰）、没有备用钥匙与锁孔、没有便笺与爽身粉
  const pool = texts.concat(Object.values(TE.texts.FACTS).flat().map(x => x.t), Object.values(TE.texts.DECOY_TEXT).flat(), TE.texts.DECOY_DETAIL,
    TE.texts.HERRINGS.flatMap(h => [h.bait, h.truth]), Object.values(TE.texts.BODY_TEXT).flat(), Object.values(TE.texts.CLUE_LEAD).flat())
  const BAD = /手电|积灰|落着灰|薄灰|灰尘|只有灰|的灰|层灰|钥匙孔|锁孔|黄铜钥匙|便笺|爽身粉|上的蜡|残局|冷掉的茶|地面裂开/
  const badT = pool.filter(t => t && BAD.test(t))
  ok(badT.length === 0, '描写里没有手电、积灰、钥匙孔、便笺之类馆里没有的东西' + (badT.length ? '（' + badT.slice(0, 3).join('｜') + '）' : ''))
  const poison = TE.texts.BODY_TEXT.poison.join('')
  ok(/口唇和指甲发紫/.test(poison) && /喝空/.test(poison) && /气味/.test(poison) && !/发青|还剩一口/.test(poison), '毒杀的尸征：口唇指甲发紫、少量白沫、没有气味、杯子喝空')
}

/* ---------------- 辩论的节拍 ---------------- */
section('辩论的节拍')
{
  const seen = {}
  let bad = 0, deadAsk = 0, games = 0, ends = 0, clueBad = 0, exposeBad = 0, respondAsk = 0, cur = null, accusedBy = {}
  for (let s = 1; s <= 160; s++) {
    const n = [6, 9, 12, 15][s % 4]
    const ids = ALL.slice((s * 5) % 23, (s * 5) % 23 + n)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 101, player: ids[s % n] })
    games++
    let guard = 0, last = null
    while (guard++ < 30) {
      const c = TE.newCase(g)
      if (c.type === 'final' || c.type === 'stall') { ends++; break }
      if (c.type === 'overdue') { if (TE.winner(g)) { ends++; break } continue }
      if (c.lastStanding !== undefined) { ends++; break }
      TE.aiInvestigation(g, c)
      TE.courtOpen(g, c)
      const T = TE.openTrial(g, c)
      cur = null; accusedBy = {}
      TE.autoTrial(g, T, ev => {
        seen[ev.type] = (seen[ev.type] || 0) + 1
        const mark = (a, t) => { (accusedBy[t] || (accusedBy[t] = new Set())).add(a); cur = { accuser: a, target: t } }
        if (ev.type === 'accuse') { last = ev; mark(ev.speaker, ev.target); if (ev.clue) { seen.accuseClue = (seen.accuseClue || 0) + 1; const k = c.clues.find(x => x.id === ev.clue.id); if (!k || !k.foundBy || !TE.testClue(g, k, ev.target)) clueBad++ } }
        if (ev.type === 'present' && ev.target) mark(ev.speaker, ev.target)
        if (ev.type === 'interject') { seen[ev.stance] = (seen[ev.stance] || 0) + 1; if (!cur || ev.speaker === cur.accuser || ev.speaker === cur.target || ev.target !== cur.target) bad++ }
        if (ev.type === 'counter') { if (!accusedBy[ev.speaker] || !accusedBy[ev.speaker].has(ev.target)) bad++; mark(ev.speaker, ev.target) }
        if (ev.type === 'speech' && ev.mode === 'clue') seen.clueTalk = (seen.clueTalk || 0) + 1
        if (ev.type === 'expose' && (ev.target !== c.murderer || !TE.contradicts(c, ev.target, ev.speaker))) exposeBad++
        if (ev.type === 'ask-respond') respondAsk++
        if (/^ask-/.test(ev.type) && g.player && !TE.isLiving(g, g.player)) deadAsk++
      })
      TE.closeTrial(g, T)
      if (TE.winner(g)) { ends++; break }
    }
  }
  ok(ends === games, '加入新节拍后每局都能走到终局（含玩家死后的旁观）')
  ok(deadAsk === 0, '玩家出局后不再向他提问（旁观模式自动跑完）')
  ok(['interject', 'counter', 'alibi', 'expose', 'silent', 'defend'].every(k => seen[k] > 0) && seen.agree > 0 && seen.doubt > 0, '附议、质疑、反咬、交代去向、当众拆穿、保留都会出现')
  ok(seen.accuseClue > 0 && clueBad === 0, `出示证据时证据已被发现且与被指认者相符（${seen.accuseClue} 次）`)
  ok(seen.clueTalk > 0, '不指认时也会谈自己找到的线索')
  ok(bad === 0 && exposeBad === 0, '插话、反咬的对象正确；被拆穿的一定是说了谎的凶手')
  ok(respondAsk > 0, '玩家被指认时由他选择怎样回应')
}

/* ---------------- 破绽与察觉 ---------------- */
section('破绽与察觉')
{
  // 概率按伪装档；被当众拆穿过 +10%；已被确认是凶手 +25%；察觉 一般 50%、善于读人 75%
  const pickBy = (k, v) => ALL.find(id => CHARACTERS.find(c => c.id === id).stats[k] === v)
  const hi = pickBy('disguise', '高'), mid = pickBy('disguise', '中'), lo = pickBy('disguise', '低')
  const { g } = game(5, {}, { ids: [hi, mid, lo].concat(ALL.filter(x => ![hi, mid, lo].includes(x)).slice(0, 3)) })
  const T0 = trial(g, lo)
  const p = id => TE.tellChance(g, T0, id)
  ok(Math.abs(p(hi) - 0.1) < 1e-9 && Math.abs(p(mid) - 0.25) < 1e-9 && Math.abs(p(lo) - 0.45) < 1e-9, '破绽概率：伪装高 10%、中 25%、低 45%')
  T0.exposed[lo] = 'x'
  ok(Math.abs(p(lo) - 0.55) < 1e-9, '被当众拆穿过（承压）+10%')
  T0.knownMurderer = lo
  ok(Math.abs(p(lo) - 0.7) < 1e-9, '已被确认是凶手（极限）+25%')
  const rp = ALL.find(id => CHARACTERS.find(c => c.id === id).stats.readsPeople === '是'), nr = ALL.find(id => CHARACTERS.find(c => c.id === id).stats.readsPeople === '一般')
  ok(TE.noticeChance(g, rp) === 0.75 && TE.noticeChance(g, nr) === 0.5, '察觉：善于读人 75%，一般 50%')
}
{
  // 统计：每一场至多判一次；只判持秘密者；成立率与伪装档相符
  let rolls = 0, shown = 0, twice = 0, wrongHolder = 0, seenIn = 0, watchers = 0
  for (let s = 1; s <= 3000; s++) {
    const { g, ids } = game(8, {}, { seed: s, ids: ALL.slice(s % 40, s % 40 + 8) })
    const m = ids.find(id => CHARACTERS.find(c => c.id === id).stats.disguise === '中')
    if (!m) continue
    const T = trial(g, m)
    const book = {}
    const a = TE.rollTell(g, T.case, book, m, ids.filter(x => x !== m), 'accused', T)
    if (TE.rollTell(g, T.case, book, m, ids, 'accused', T) !== null) twice++
    const inno = ids.find(x => x !== m)
    if (TE.rollTell(g, T.case, {}, inno, ids, 'accused', T) !== null) wrongHolder++
    if (!a) continue
    rolls++
    if (a.shown) { shown++; watchers += 7; seenIn += a.seen.length }
  }
  ok(twice === 0 && wrongHolder === 0, '每一场至多判一次；不是持秘密者不判')
  ok(Math.abs(shown / rolls - 0.25) < 0.04, `伪装中档的破绽成立率约 25%（${(shown / rolls * 100).toFixed(1)}%）`)
  ok(seenIn / watchers > 0.5 && seenIn / watchers < 0.75, `成立后旁人按 50%/75% 察觉（${(seenIn / watchers * 100).toFixed(1)}%）`)
}
{
  // 庭审里：被指认时掷，表现挂在回应上；被拆穿、痕迹被谈起时单独产出 tell；AI 的怀疑度随察觉加权
  let tells = 0, onResp = 0, bad = 0, perScene = 0, inv = 0, invBad = 0, susp = 0, suspN = 0
  for (let s = 1; s <= 160; s++) {
    const ids = ALL.slice((s * 3) % 40, (s * 3) % 40 + 9)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 41, player: ids[0] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    const r = TE.interview(g, c, c.murderer)
    if (r && r.tell) { inv++; if (r.tell.holder !== c.murderer || (r.tell.seen.length && r.tell.seen[0] !== g.player)) invBad++ }
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    const counts = {}
    TE.autoTrial(g, T, ev => {
      if (ev.tell && ev.tell.shown) { onResp++; if (ev.speaker !== ev.tell.holder) bad++ }
      if (ev.type === 'tell') { tells++; if (!TE.secretHolders(g, c).includes(ev.holder) && !T.executed.some(x => x.id === ev.holder)) bad++ }
    })
    for (const tl of T.tellLog) counts[tl.holder + '|' + tl.scene] = (counts[tl.holder + '|' + tl.scene] || 0) + 1
    if (Object.values(counts).some(n => n > 1)) perScene++
    for (const a in T.tellSeen) for (const t of T.tellSeen[a]) {
      if (!TE.isLiving(g, a) || !TE.isLiving(g, t)) continue
      const base = TE.suspicion(g, T, a, t)
      const keep = T.tellSeen[a]; T.tellSeen[a] = []
      const without = TE.suspicion(g, T, a, t)
      T.tellSeen[a] = keep
      suspN++; if (base > without + 1) susp++
    }
  }
  ok(onResp > 0 && bad === 0, `被指认时的破绽挂在本人的回应上（${onResp} 次）；被拆穿、痕迹被谈起时也会判（${tells} 次单独的破绽）`)
  ok(perScene === 0, '依次发言、公开讨论各算一场：每一场里同一人至多判一次破绽')
  ok(inv > 0 && invBad === 0, `调查期询问凶手也会判破绽，只有问话的人看得见（${inv} 次）`)
  ok(suspN === 0 || susp === suspN, '察觉到的破绽让 AI 更怀疑那个人')
}

/* ---------------- 称呼、发现、手段的物理后果 ---------------- */
section('称呼、发现与手段')
{
  const two = ['joseph2', 'joseph3', 'l', 'obito', 'light']
  const seats = Array(15).fill(null)
  two.forEach((id, i) => { seats[i * 2] = id })
  const g = TE.create({ seats, seed: 5 })
  ok(TE.callOf(g, 'l') === '龙崎' && TE.callOf(g, 'light') === '夜神月', '广播与台词用馆里报的名字（L → 龙崎）')
  ok(TE.callOf(g, 'joseph2') === '1号' && TE.callOf(g, 'joseph3') === '3号', '同局两人报同一个名字：改说「N号」')
  ok(TE.callOf(g, 'obito') === '7号', '不报名的人：改说「N号」')
  const g1 = TE.create({ seats: ['joseph2', 'l'].concat(Array(13).fill(null)), seed: 5 })
  ok(TE.callOf(g1, 'joseph2') === '乔瑟夫·乔斯达', '同局只有一位乔瑟夫时照常报名字')
  ok(TE.lineOf(g, 'light', 'accuse', 'l').includes('龙崎'), '人物卡台词的 {X} 也代入报的名字')
}
{
  let self = 0, selfBad = 0, poison = 0, bottleBad = 0, door = 0, doorBad = 0, cases = 0
  for (let s = 1; s <= 600; s++) {
    const ids = ALL.slice((s * 11) % 40, (s * 11) % 40 + 10)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 23, player: ids[2] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    cases++
    if (c.selfReport) { self++; if (c.discoverer !== c.murderer || !TE.isLiving(g, c.discoverer)) selfBad++ }
    else if (c.discoverer === c.murderer) selfBad++
    if (c.cause.id === 'poison') { poison++; if (!c.bottle || c.bottle.room !== TE.person(g, c.murderer).seat + '号套房' || c.bottle.at > c.tMurder) bottleBad++ }
    if (c.cause.id === 'door') { door++; if (!c.doorLock || c.doorLock.until - c.doorLock.at !== 60) doorBad++ }
  }
  ok(self > 10 && self < cases * 0.25 && selfBad === 0, `凶手看见尸体时偶尔会在心里要求播报，成为发现者（${self}/${cases}）`)
  ok(poison >= 5 && bottleBad === 0, `女巫的毒：小玻璃瓶在凶手套房的书桌上，取在行凶之前（${poison} 案）`)
  ok(door >= 5 && doorBad === 0, `典狱长：门锁一小时，发动时全馆广播（${door} 案）`)
}

/* ---------------- 结案对账 ---------------- */
section('结案对账（T.log 与 c.record）')
{
  let recs = 0, bad = 0, decisive = 0, uniques = 0, empties = 0, logBad = 0, finders = 0
  for (let s = 1; s <= 120; s++) {
    const ids = ALL.slice((s * 5) % 40, (s * 5) % 40 + 8)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const res = TE.autoGame({ seats, seed: s * 7 })
    const g = res.g
    for (const r of g.records) {
      recs++
      if (!r.murderer || !r.victim || !r.room || r.clues.length !== 3 || !Array.isArray(r.rounds) || !Array.isArray(r.log)) bad++
      if (r.log.some(e => /^ask-/.test(e.type)) || !r.log.some(e => e.type === 'open')) logBad++
      for (const k of r.clues) if (k.foundBy) finders++
      for (const V of r.rounds) {
        if (V.empty) empties++
        if (V.kind === 'normal' && V.result && V.result.outcome === 'unique') {
          uniques++
          if (V.decisive) { decisive++; if (V.decisive.target !== V.result.pending) bad++ }
        }
        if (V.ballots.length && V.voters.length < V.ballots.length) bad++
      }
      if (r.solved !== (r.executed.some(x => x.correct))) bad++
    }
  }
  ok(recs > 200 && bad === 0, `每案结案后留下完整的记录：真相、三条线索、每轮选票、处刑（${recs} 案）`)
  ok(logBad === 0, 'T.log 记下每个演出事件，不含 ask-*')
  ok(finders > recs, '记录里有每条线索的发现者')
  ok(uniques > 100 && decisive / uniques > 0.8, `产生唯一结果的投票多半标出决定性的一票（${decisive}/${uniques}）`)
  void empties
}
{
  // 两人终局：互投并列 → 重投时两人都不能投，界面快进
  const { g, ids } = game(5)
  const [a, b] = ids
  for (const id of ids.slice(2)) TE.person(g, id).alive = false
  const T = trial(g, b)
  T.phase = 'vote'
  let V = TE.beginVote(g, T)
  TE.cast(g, T, V, a, b); TE.cast(g, T, V, b, a)
  const r = TE.settle(g, T, V)
  V = TE.beginVote(g, T)
  ok(r.outcome === 'tie' && V.empty && V.voters.length === 0, '两人终局并列后的重投没有人能投（标为 empty，界面快进）')
  const r2 = TE.settle(g, T, V)
  ok(r2.outcome === 'end' && T.endReason === 'noresult', '随即「连续两次未产生唯一结果，本场审判结束」')
}

/* ---------------- 台词池 ---------------- */
section('台词池')
{
  for (const f of ['a', 'b', 'c', 'd', 'e', 'f']) require(join(ROOT, 'assets/data/lines/' + f + '.js'))
  const P = globalThis.TRIAL_LINES || {}
  const KEYS = ['wake', 'discover', 'react', 'search', 'found', 'statement', 'alibi', 'accuse', 'accuseClue', 'agree', 'doubt', 'defend', 'counter', 'silent', 'vote', 'executed', 'watch', 'right', 'wrong', 'win', 'wish']
  const ALLOW = { discover: ['V'], react: ['V'], search: ['ROOM'], found: ['CLUE'], alibi: ['ROOM', 'TIME'], accuse: ['X'], accuseClue: ['X', 'CLUE'], agree: ['X'], doubt: ['X'], counter: ['X'], vote: ['X'], watch: ['X'], right: ['X'], wrong: ['X'] }
  let missing = [], badPh = []
  for (const id of ALL) for (const k of KEYS) {
    const arr = P[id] && P[id][k]
    if (!Array.isArray(arr) || !arr.length) { missing.push(id + '.' + k); continue }
    for (const t of arr) for (const m of t.matchAll(/\{(\w+)\}/g)) if (!(ALLOW[k] || []).includes(m[1])) badPh.push(id + '.' + k)
  }
  ok(ALL.length === 53 && missing.length === 0, '53 人每个场合都有台词' + (missing.length ? '（缺 ' + missing.slice(0, 6).join('、') + '）' : ''))
  ok(badPh.length === 0, '占位符只用该场合允许的')
}

/* ---------------- 庭审（二）：当众出示、公开讨论、死亡时间、金币、身体、工具、离馆 ---------------- */
// 造一局有玩家的案子：cond(c, g) 为真才要
function caseWith(cond, opts = {}) {
  for (let s = 1; s <= (opts.tries || 3000); s++) {
    const n = opts.n || 8
    const ids = ALL.filter(x => !['griffith', 'johnny'].includes(x)).slice((s * 7) % 40, (s * 7) % 40 + n)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * (opts.salt || 37), player: ids[1] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    if (cond(c, g)) return { g, c, ids }
  }
  return null
}
// 推进一场庭审：answer(value, T) 给 ask-* 的回答（缺省按 AI 代答）
function drive(g, T, answer) {
  const it = TE.trialFlow(g, T)
  let input, n = 0
  const evs = []
  while (n++ < 3000) {
    const { value, done } = it.next(input)
    if (done) break
    input = undefined
    evs.push(value)
    const a = answer ? answer(value, T) : undefined
    if (a !== undefined) { input = a; continue }
    if (value.type === 'ask-debate') input = { kind: 'silent' }
    else if (value.type === 'ask-interject') input = null
    else if (value.type === 'ask-respond') input = { kind: 'defend' }
    else if (value.type === 'ask-vote') input = value.forced || TE.aiBallot(g, T, value.vote, value.voter)
    else if (value.type === 'ask-idiot' || value.type === 'ask-hope') input = false
  }
  return evs
}
section('当众出示：反证、辩解与破绽（取代逐席比对）')
{
  // 一张看不见特征的证物：出示给不相符的人 → 他拿出反证（听说）；出示给相符的凶手 → 只能辩解，持秘密者掷破绽
  let tried = 0, rebutOk = 0, defendOk = 0, tellRolled = 0, limitOk = 0, handOk = 0, visRebut = 0
  for (let s = 1; s <= 4000 && tried < 25; s++) {
    const r = caseWith((c, g) => c.clues.some(k => k.predicate && !k.visible) && TE.livingIds(g).some(x => x !== g.player && x !== c.murderer && !TE.pred(c.clues.find(k => k.predicate && !k.visible).predicate)(g.charMap[x])), { salt: 41 + s, tries: 1 })
    if (!r) continue
    const { g, c } = r
    tried++
    for (const k of c.clues) k.foundBy = g.player // 都在玩家的证物栏里
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    const k = c.clues.find(x => x.predicate && !x.visible)
    const other = TE.livingIds(g).find(x => x !== g.player && x !== c.murderer && !TE.pred(k.predicate)(g.charMap[x]))
    const vis = c.clues.find(x => x.predicate && x.visible)
    const visOther = vis && TE.livingIds(g).find(x => x !== g.player && !TE.pred(vis.predicate)(g.charMap[x]))
    let hands = 0, asked = 0
    const evs = drive(g, T, (v, T) => {
      if (v.type === 'ask-debate') return { kind: 'present', clue: k.id, target: other }
      if (v.type === 'discuss') { TE.raiseHand(T); return undefined }
      if (v.type === 'ask-interject') {
        asked++
        const step = hands++
        if (step < 3 && T.presentLeft > 0) TE.raiseHand(T)
        if (step === 0) return { kind: 'present', clue: k.id, target: c.murderer }
        if (step === 1) return visOther ? { kind: 'present', clue: vis.id, target: visOther } : { kind: 'question', target: other }
        if (step === 2) return { kind: 'present', clue: k.id, target: other } // 出示次数用完：这一下不算，手也不放
        return { kind: 'question', target: other }
      }
      return undefined
    })
    const turnTurn = evs.some(e => e.type === 'turn' && e.speaker === g.player)
    if (!turnTurn) { tried--; continue }
    const ri = evs.findIndex(e => e.type === 'present' && e.speaker === g.player && e.target === other)
    if (ri >= 0 && evs[ri + 1] && evs[ri + 1].type === 'rebut' && evs[ri + 1].speaker === other && evs[ri + 1].hearsay && T.tested[other][k.id] === 'rebut') rebutOk++
    const di = evs.findIndex(e => e.type === 'present' && e.speaker === g.player && e.target === c.murderer)
    if (di >= 0) {
      const after = evs.slice(di + 1).find(e => e.type === 'defend' || e.type === 'rebut')
      if (after && after.type === 'defend' && after.present && after.speaker === c.murderer) defendOk++
      if (T.tellLog.some(t => t.holder === c.murderer && t.at === 'clue')) tellRolled++
    } else defendOk++, tellRolled++ // 讨论没开（执行者等）：不计
    const vi = evs.findIndex(e => e.type === 'present' && e.speaker === g.player && vis && e.clue.id === vis.id)
    if (vi < 0 || (evs[vi + 1] && evs[vi + 1].type === 'rebut' && evs[vi + 1].visible && !evs[vi + 1].hearsay)) visRebut++
    const mine = T.presents.filter(p => p.speaker === g.player).length
    if (mine <= TE.PRESENT_MAX && T.presentLeft === TE.PRESENT_MAX - mine) limitOk++
    if ((T.handsUsed || 0) <= TE.HAND_MAX && asked <= TE.HAND_MAX + 1) handOk++
  }
  ok(tried >= 15 && rebutOk === tried, `不相符的人拿出反证；看不见的特征只是他的说法（听说）（${rebutOk}/${tried}）`)
  ok(defendOk === tried && tellRolled === tried, `相符的凶手只能辩解，并掷一次破绽（${defendOk}/${tried}）`)
  ok(visRebut === tried, '看得见的特征不相符：反证当场可见（不是听说）')
  ok(limitOk === tried, `每场至多出示 ${TE.PRESENT_MAX} 次，用完的那一下不算`)
  ok(handOk === tried, `举手每场至多 ${TE.HAND_MAX} 次`)
}
{
  // 旧的逐席比对不在了：引擎不再给「符合 / 不符」的试射接口；AI 只凭看得见的特征与当众的回应
  ok(TE.fire === undefined && typeof TE.publicMatches === 'function', '没有免费的逐席比对；AI 只凭看得见的特征与当众出示的回应对照')
  const r = caseWith(c => c.clues.some(k => k.predicate && !k.visible))
  const { g, c } = r
  for (const k of c.clues) k.foundBy = c.victim
  const T = TE.openTrial(g, c)
  const k = c.clues.find(x => x.predicate && !x.visible)
  const t = c.murderer
  const before = TE.publicMatches(g, T, t)
  T.tested[t] = { [k.id]: 'match' }
  ok(TE.publicMatches(g, T, t) === before + 1, '看不见的特征：只有当众出示时他没能反驳，才算相符')
}
section('公开讨论：拍数、最有话说的人、主持人喊停')
{
  let trials = 0, disc = 0, bad8 = 0, bad15 = 0, runBad = 0, orderBad = 0, stopBad = 0, n8 = 0, n15 = 0, beatsSum = 0
  for (let s = 1; s <= 220; s++) {
    const n = s % 3 === 0 ? 15 : 8
    const ids = ALL.slice((s * 5) % 38, (s * 5) % 38 + n)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 59 })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    const living = TE.livingIds(g).length
    trials++
    const evs = []
    TE.autoTrial(g, T, ev => evs.push(ev))
    const di = evs.findIndex(e => e.type === 'discuss')
    if (di < 0) continue
    disc++
    const de = evs.findIndex(e => e.type === 'debate-end')
    if (de >= 0 && de < di) orderBad++
    if (living <= 8) { n8++; if (T.beats < 4 || T.beats > 6) bad8++ }
    if (living >= 13) { n15++; if (T.beats < 6 || T.beats > 8) bad15++ }
    if (T.beatsRun > T.beats) runBad++
    if (!['beats', 'exhausted'].includes(T.stopReason)) stopBad++
    beatsSum += T.beatsRun
  }
  ok(disc / trials > 0.7 && orderBad === 0, `依次发言之后进入公开讨论（${disc}/${trials} 场），主持人喊停后才投票`)
  ok(n8 > 30 && bad8 === 0, `八人局 4—6 拍（${n8} 场）`)
  ok(n15 > 20 && bad15 === 0, `十五人局 6—8 拍（${n15} 场）`)
  ok(runBad === 0 && stopBad === 0, `没有新论点时提前喊停；平均 ${(beatsSum / disc).toFixed(1)} 拍`)
}
{
  // 对质：两张矛盾的证言 → 当众拆穿；不矛盾 → 弹开，没有拆穿
  let tried = 0, good = 0, badPair = 0
  for (let s = 1; s <= 3000 && tried < 12; s++) {
    const r = caseWith((c, g) => { const W = c.where[c.murderer]; return W && W.lie && TE.livingIds(g).some(x => x !== c.murderer && TE.contradicts(c, c.murderer, x)) }, { salt: 53 + s, tries: 1 })
    if (!r) continue
    const { g, c } = r
    const wit = TE.livingIds(g).find(x => x !== c.murderer && TE.contradicts(c, c.murderer, x))
    const inno = TE.livingIds(g).filter(x => x !== c.murderer && x !== wit && x !== g.player)
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    let step = 0
    const evs = drive(g, T, (v, T) => {
      if (v.type === 'discuss') { TE.raiseHand(T); return undefined }
      if (v.type === 'ask-interject') { step++; if (step === 1) { TE.raiseHand(T); return { kind: 'confront', a: inno[0], b: inno[1] } } return { kind: 'confront', a: c.murderer, b: wit } }
      return undefined
    })
    const ci = evs.findIndex(e => e.type === 'confront' && e.a === c.murderer)
    if (ci < 0) continue
    if (evs.slice(0, ci).some(e => e.type === 'expose' && e.target === c.murderer)) continue // 对质之前就被拆穿了
    tried++
    const bad = evs.find(e => e.type === 'confront' && e.a === inno[0])
    if (!bad || bad.ok) badPair++
    const okE = evs.findIndex(e => e.type === 'confront' && e.a === c.murderer)
    if (okE >= 0 && evs[okE].ok && evs.slice(okE).some(e => e.type === 'expose' && e.target === c.murderer && e.speaker === wit)) good++
  }
  ok(tried >= 6 && good === tried, `对质两张矛盾的证言：那个时段真在那里的人当众拆穿（${good}/${tried}）`)
  ok(badPair === 0, '两张不矛盾的证言：撞不出什么')
}
{
  // 凶手拿现场的陈设误导；你细查过那一处（排除性事实，或看清了的疑似线索）就能驳回
  let tried = 0, good = 0, wrong = 0
  for (let s = 1; s <= 6000 && tried < 8; s++) {
    const r = caseWith(c => c.spots.some(sp => sp.kind === 'decoy' && (sp.fact || sp.herring)), { salt: 71 + s, tries: 1 })
    if (!r) continue
    const { g, c } = r
    for (const sp of c.spots) if (sp.kind === 'decoy') { TE.inspect(g, c, sp.id, null); if (sp.herring) TE.reexamine(g, c, sp.id) }
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    let claim = null, step = 0
    const evs = drive(g, T, (v, T) => {
      if (v.type === 'accuse' && v.claim && v.claim.playerSaw && !claim) { claim = v.claim; TE.raiseHand(T) }
      if (v.type === 'ask-interject' && claim) { step++; if (step === 1) { TE.raiseHand(T); return { kind: 'refute', card: 'nope' } } return { kind: 'refute', card: claim.spot } }
      return undefined
    })
    if (!claim) continue
    tried++
    const rf = evs.filter(e => e.type === 'refute' && e.speaker === g.player)
    if (rf.some(e => e.ok === false)) wrong++
    if (rf.some(e => e.ok) && T.refuted[c.murderer] === g.player) good++
  }
  ok(tried >= 4 && good === tried, `排除性事实驳回凶手的误导（${good}/${tried}）`)
  ok(wrong === tried, '拿错了卡：驳不倒')
}
section('死亡时间：三格读数、医护的窗、让时间窗偏移的处理')
{
  let n = 0, bad = 0, readBad = 0, segBad = 0, medBad = 0, plain = 0, plainBad = 0, pres = 0
  for (let s = 1; s <= 1500 && n < 80; s++) {
    const ids = ALL.slice((s * 3) % 40, (s * 3) % 40 + 10)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 83, player: ids[2] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    const tA = TE.apparentDeath(c)
    const W = c.where[c.murderer]
    if (!c.shift) {
      plain++
      if (tA !== c.tMurder) plainBad++
      for (const r of TE.bodyReadings(g, c, c.tDiscover)) if (r.shifted || (r.band[0] != null && c.tMurder < r.band[0]) || c.tMurder > r.band[1]) plainBad++
      if (W && W.lie && (W.lieSeg !== TE.segAt(c, c.tMurder) || Math.abs(c.span.cut - c.tMurder) < 15)) plainBad++
      continue
    }
    n++
    if (tA !== c.tMurder + c.shift.dir * c.shift.minutes || c.shift.minutes < 90 || c.shift.minutes > 170 || tA >= c.tDiscover || ['poison', 'door'].includes(c.cause.id)) bad++
    // 三格读数：被干扰的那几格落在「看上去」的时刻，其余照实
    const R = TE.bodyReadings(g, c, c.tDiscover)
    if (R.length !== 3) readBad++
    for (const r of R) {
      const t = r.shifted ? tA : c.tMurder
      if ((r.band[0] != null && t < r.band[0]) || t > r.band[1]) readBad++
      if (r.shifted !== c.shift.reads.includes(r.key)) readBad++
    }
    // 两段时间线：真正的时刻与看上去的时刻各落一段；假窗口那段凶手真的和别人在一起，真正那段他说谎、说自己独自
    const k1 = TE.segAt(c, c.tMurder), k2 = TE.segAt(c, tA)
    if (k1 === k2 || !W.lie || W.lieSeg !== k1 || !W.segs[k2].with.length || W.segs[k2].room !== W.claim.segs[k2].room || W.claim.segs[k1].with.length || W.segs[k1].room !== c.roomInfo.name) segBad++
    for (const x of W.segs[k2].with) if (!c.where[x] || !c.where[x].segs[k2].with.includes(c.murderer)) segBad++
    if (c.span.from >= Math.min(tA, c.tMurder) || c.span.to <= Math.max(tA, c.tMurder)) segBad++
    // 医护的窗：由窄到宽；被骗时落在看上去的时刻，识破后落在真正的时刻
    const pickMed = m => ALL.find(id => CHARACTERS.find(x => x.id === id).stats.medical === m)
    const w1 = TE.medWindow(g, c, pickMed('有'), false), w2 = TE.medWindow(g, c, pickMed('战场急救'), false), w3 = TE.medWindow(g, c, pickMed('基本常识'), false)
    const wk = TE.medWindow(g, c, pickMed('有'), true)
    if (!w1 || !w2 || !w3 || !(w1[1] - w1[0] < w2[1] - w2[0] && w2[1] - w2[0] < w3[1] - w3[0])) medBad++
    if (!(w1[0] <= tA && tA <= w1[1]) || !(wk[0] <= c.tMurder && c.tMurder <= wk[1]) || (wk[0] <= tA && tA <= wk[1])) medBad++
    if (TE.medWindow(g, c, ALL.find(id => CHARACTERS.find(x => x.id === id).stats.medical === '无'), false) !== null) medBad++
    // 出示这条证物：识破——大家改按真正的时刻对去向
    for (const k of c.clues) k.foundBy = g.player
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    const sk = c.clues.find(k => k.shift)
    const evs = drive(g, T, v => (v.type === 'ask-debate' ? { kind: 'present', clue: sk.id, target: c.murderer } : undefined))
    const rf = evs.find(e => e.type === 'reframe')
    if (evs.some(e => e.type === 'turn' && e.speaker === g.player)) {
      pres++
      if (!rf || rf.time !== c.tMurder || rf.from !== tA || !T.refKnown || T.refTime !== c.tMurder) bad++
    }
  }
  ok(n >= 40 && bad === 0, `约四成案件凶手借冷池、蚕丝被、热池、冷冻柜让时间窗偏移 90—170 分钟（${n} 案；出示后识破 ${pres} 场）`)
  ok(readBad === 0, '三格读数：被干扰的读数落在看上去的时刻，其余照实')
  ok(segBad === 0, '假窗口那一段凶手真的和别人在一起（证人也这样说）；真正的那一段他在现场、说自己独自')
  ok(medBad === 0, '医护「有 / 战场急救 / 基本常识」由窄到宽；被骗时窗口落在看上去的时刻，识破后落在真正的时刻；「无」不给窗')
  ok(plain > 50 && plainBad === 0, `没被处理过的尸体：三格读数都照实，凶手在含死亡时刻的那一段说谎（${plain} 案）`)
}
section('金币：开局十枚、余波、拾取、AI 吃饭')
{
  const { g, ids } = game(8, {}, { player: ALL[0] })
  ok(ids.every(id => TE.person(g, id).coins === TE.START_COINS), '开局每人身上 10 枚（规则宣告时各取一摞）')
  let bodyOk = 0, takeOk = 0, payOk = 0, deskOk = 0, neg = 0, meals = 0, playerMeals = 0, cases = 0
  for (let s = 1; s <= 60; s++) {
    const idz = ALL.slice((s * 3) % 40, (s * 3) % 40 + 8)
    const seats = Array(15).fill(null)
    idz.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 97, player: idz[0] })
    let guard = 0
    while (guard++ < 20) {
      const before = {}
      for (const id of TE.livingIds(g)) before[id] = TE.person(g, id).coins
      const c = TE.newCase(g)
      if (c.type !== 'case' || c.lastStanding !== undefined) break
      cases++
      if (c.bodyCoins >= 0 && TE.person(g, c.victim).coins === 0) bodyOk++
      const pc = TE.person(g, g.player).coins, t0 = g.minutes, n = c.bodyCoins
      const r = TE.takeBodyCoins(g, c, g.player)
      if (!TE.isLiving(g, g.player)) { if (r === null && c.bodyCoins === n) takeOk++ } // 玩家已出局：没人取，留在现场
      else if (n > 0 ? (r && r.n === n && g.minutes === t0 + 1 && TE.person(g, g.player).coins === pc + n && TE.takeBodyCoins(g, c, g.player) === null && c.bodyCoins === 0) : r === null) takeOk++
      TE.courtOpen(g, c)
      const T = TE.openTrial(g, c)
      TE.autoTrial(g, T)
      const mid = {}
      for (const id of TE.livingIds(g)) mid[id] = TE.person(g, id).coins
      const desk = c.murderer && TE.isLiving(g, c.murderer) ? TE.person(g, c.murderer).coinsDesk : 0
      const pay = TE.closeTrial(g, T)
      if (TE.livingIds(g).every(id => TE.person(g, id).coins >= mid[id] + pay.table[id] - 1)) payOk++
      if (pay.solved || !TE.isLiving(g, c.murderer) || TE.person(g, c.murderer).coinsDesk === desk + 10) deskOk++
      for (const id of g.order) if (TE.person(g, id).coins < 0) neg++
      if (TE.winner(g)) break
    }
    for (const id of g.order) { const p = TE.person(g, id); if (id === g.player) playerMeals += p.spentMeals || 0; else meals += p.spentMeals || 0 }
  }
  ok(cases > 100 && bodyOk === cases, `死者身上的金币留在尸体处（${cases} 案）`)
  ok(takeOk === cases, '拾取死者的金币：耗 1 分钟，转到拾取者身上，只能取一次；不取就留在现场')
  ok(payOk === cases && deskOk === cases, '余波：存活在馆者各得本轮的 5 或 10 枚；未查明时凶手另 10 枚在书桌上（不在身上）')
  ok(neg === 0 && meals > 100 && playerMeals === 0, `AI 每到饭点用 1 枚吃一餐（${meals} 餐），不会欠钱；玩家不自动扣`)
}
{
  // 本局钱袋（core/app.js 的 App.econ）：开局、整百、不成立、身上不够、退出券、修复残疾——不跨局累积
  const src = readFileSync(join(ROOT, 'assets/js/core/app.js'), 'utf8')
  const a = src.indexOf('  /* ---------- 本局钱袋'), b = src.indexOf('  /* ---------- 光标 / 鼠标')
  const charMap = Object.fromEntries(CHARACTERS.map(c => [c.id, c]))
  const App = { state: { seats: Array(15).fill(null), minutes: 0, econ: null }, bus: { emit() {} }, char: id => charMap[id] || null }
  new Function('App', 'window', src.slice(a, b))(App, globalThis)
  const E = App.econ
  const seats = Array(15).fill(null)
  ALL.slice(0, 8).forEach((id, i) => { seats[i * 2] = id })
  let e = E.newGame({ me: seats[0], seats })
  ok(e.coins === 10 && e.source === 'trial' && e.tray.filter(t => t.n === 0).length === 8 && e.tray.filter(t => t.n === 10).length === 7, '庭审开局：你身上 10 枚，有人坐的那几摞已取走，空席的还在盘里')
  ok(E.settle(['一瓶果汁、汽水或牛奶']).reason === 'round' && E.settle(['一瓶果汁、汽水或牛奶']).short === 80, '总价不是整百：不成立（差多少要添东西凑满）')
  const combo = E.settle(['一壶热咖啡或茶，含杯具', '巧克力一板'])
  ok(combo.ok && combo.coins === 1, '咖啡 60 + 巧克力 40 = 100：凑整一枚')
  const v = E.pay([{ name: '谁是凶手', void: 'ask' }])
  ok(v.reason === 'void' && E.get().coins === 10, '打听谁是凶手：不成立，不收钱')
  const lum = ['鲁米诺试剂一瓶', '毛毯、枕头、睡袋', '一瓶果汁、汽水或牛奶']
  ok(E.settle(lum).reason === 'purse' && E.settle(lum).total === 1600, '鲁米诺 1500 + 毛毯 80 + 果汁 20 = 1600：身上 10 枚不够')
  E.gain(10, 'aftermath')
  const pr = E.pay(lum)
  ok(pr.ok && E.get().coins === 4 && E.get().items.length === 3, '余波后 20 枚：付 16 枚，三样东西到手边')
  ok(E.pay(['退出券一张']).reason === 'purse', '退出券五百枚：买不起')
  e = E.newGame({ me: seats[0], seats })
  ok(e.coins === 10 && e.items.length === 0, '重开一局：钱袋整个换掉，不跨局累积')
  E.newGame({ me: seats[0], seats, coins: 600 })
  ok(E.pay(['退出券一张']).ok && E.hasTicket() && E.exit({ at: 1500 }) && E.get().exited && E.get().exited.at === 1500, '买下退出券、持券要求离馆')
  ok(E.settle(['一餐，一人份，菜式任点']).reason === 'exited', '离馆之后什么也换不了')
  const jseats = seats.slice(); jseats[0] = 'johnny'
  E.newGame({ me: 'johnny', seats: jseats })
  ok(!E.canWalk('johnny') && E.pay(['修复身体残疾']).ok && E.canWalk('johnny'), '修复身体残疾（乔尼）：此后庭审里按能走算')
  E.newGame({ me: seats[0], seats })
  ok(E.settle(['修复身体残疾']).reason === 'repair', '卡上没写明残疾的人：修复不成立')
  // 庭审引擎读修复记录：能走的人才会出去走动
  const g = TE.create({ seats: jseats, seed: 3, player: 'johnny' })
  g.walkFix = { johnny: true }
  const c = TE.newCase(g)
  ok(c.type === 'case' || c.type === 'final', '修复过的人在引擎里按能走算（walkFix）')
}
section('身体：饥饿与困倦 → 调查耗时')
{
  const { g, ids } = game(6, {}, { player: ALL[0] })
  const me = g.player
  const at = (d, h) => (d - 1) * 1440 + h * 60
  let b = TE.bodyState(g, me, at(1, 18))
  ok(b.hunger === 0 && b.sleep === 0 && b.mult === 1, '开局（第一日 18:00）：中午吃过、早上起床，没有影响')
  b = TE.bodyState(g, me, at(2, 13))
  ok(b.hunger === 2 && b.sleep === 2 && b.mult === 2 && b.awayPlus === 5 && !b.noAway, '未进食 25 小时、清醒 30 小时：验尸与询问 ×2，追踪 +5 分钟')
  b = TE.bodyState(g, me, at(3, 13))
  ok(b.noAway, '未进食 48 小时以上：不能去别的房间追踪')
  TE.eat(g, me, at(3, 12)); TE.rest(g, me, at(3, 12))
  b = TE.bodyState(g, me, at(3, 13))
  ok(b.hunger === 0 && b.sleep === 0 && b.mult === 1, '兑换一餐、一夜安眠：回到 0')
  const p = TE.person(g, me)
  p.slept = at(1, 7)
  TE.nightRest(g, me, at(1, 20), at(2, 9))
  ok(TE.bodyState(g, me, at(2, 9)).sleep === 0, '两案之间跨过一个夜里：戒备中睡了一觉，回升一档')
  p.ate = at(1, 12); p.slept = at(1, 7)
  g.minutes = at(1, 18)
  const c0 = TE.interviewCost(g, ids[1])
  g.minutes = at(2, 14)
  ok(TE.interviewCost(g, ids[1]) === Math.round(c0 * 2), '饿着、困着：询问耗时随之加长')
  let spotOk = 0, n = 0
  for (let s = 1; s <= 200; s++) {
    const r = caseWith(() => true, { salt: 101 + s, tries: 1 })
    if (!r) continue
    n++
    const bs = r.c.body, body = r.c.spots.find(x => x.kind === 'body')
    const away = r.c.spots.filter(x => x.kind === 'clue' && x.clue.place === 'away')
    if (body.cost >= Math.round(5 * bs.mult) && away.every(x => !!x.blocked === bs.noAway)) spotOk++
  }
  ok(n > 50 && spotOk === n, '验尸耗时按身体状态加长；饿过两天的追踪热点去不了')
}
section('调查期的工具：只给物理事实')
{
  const stab = caseWith(c => c.cause.id === 'stab')
  const r = TE.useTool(stab.g, stab.c, 'luminol')
  ok(r && r.blood && r.cost === 3 && r.glow.includes('body') && TE.useTool(stab.g, stab.c, 'luminol') === null, '鲁米诺：有血的现场，血迹亮起来（一瓶用一次，三分钟）')
  const poi = caseWith(c => c.cause.id === 'poison' && !TE.hasBlood(c))
  const r2 = TE.useTool(poi.g, poi.c, 'luminol')
  ok(r2 && !r2.blood && r2.glow.every(id => id === r2.fake), '没有血的现场：只有漂白剂擦过的地方会亮（假阳性）')
  let added = 0, existed = 0, smudge = 0, wrongP = 0
  for (let s = 1; s <= 400; s++) {
    const x = caseWith(() => true, { salt: 131 + s, tries: 1 })
    if (!x) continue
    const m = x.g.charMap[x.c.murderer]
    const res = TE.useTool(x.g, x.c, 'powder')
    if (res.added) { added++; const k = x.c.clues.find(k => k.id === 'kp'); if (!k || !TE.pred(k.predicate)(m) || k.dim !== 'height') wrongP++ }
    else if (res.existed) existed++
    else if (res.smudge) { smudge++; if (!m.carried.some(i => /手套/.test(i))) wrongP++ }
  }
  ok(added > 20 && existed > 5 && wrongP === 0, `指纹粉：显出对凶手成立的手印（新显出 ${added}，已有 ${existed}，戴手套只留污印 ${smudge}）`)
  const cam = caseWith(() => true)
  const ph = TE.useTool(cam.g, cam.c, 'camera')
  ok(ph && ph.photo.readings.length === 3 && TE.useTool(cam.g, cam.c, 'camera') === null, '拍立得：尸体移走前拍下三格读数（开庭可出示）')
  const rec = caseWith(() => true)
  TE.useTool(rec.g, rec.c, 'recorder')
  const who = TE.livingIds(rec.g).find(x => x !== rec.g.player)
  const ir = TE.interview(rec.g, rec.c, who)
  ok(ir && ir.recorded && rec.c.recorded.includes(who) && ir.segs.length === 2, '录音笔：这一案的询问录下来（开庭对质可放录音）；回答是两段时间线')
}
section('退出券：离馆不是死亡；旁观自动跑完')
{
  let games = 0, ends = 0, asks = 0, bad = 0
  for (let s = 1; s <= 60; s++) {
    const ids = ALL.slice((s * 7) % 40, (s * 7) % 40 + 8)
    const seats = Array(15).fill(null)
    ids.forEach((id, i) => { seats[i] = id })
    const g = TE.create({ seats, seed: s * 61, player: ids[3] })
    games++
    let guard = 0
    while (guard++ < 30) {
      const c = TE.newCase(g)
      if (c.type === 'final' || c.type === 'stall') { ends++; break }
      if (c.type === 'overdue') { if (TE.winner(g)) { ends++; break } continue }
      if (c.lastStanding !== undefined) { ends++; break }
      if (g.caseNo === 1) {
        // 第一案调查时持券离馆
        if (!TE.leave(g, g.player) || TE.isLiving(g, g.player) || !TE.person(g, g.player).alive || TE.person(g, g.player).inMansion) bad++
        if (TE.leave(g, g.player) !== false) bad++
      }
      if (c.victim === g.player || c.murderer === g.player) bad++
      TE.courtOpen(g, c)
      const T = TE.openTrial(g, c)
      TE.autoTrial(g, T, ev => { if (/^ask-/.test(ev.type) && (ev.voter === g.player || ev.speaker === g.player || ev.holder === g.player)) asks++ })
      TE.closeTrial(g, T)
      if (TE.winner(g)) { ends++; if (TE.winner(g) === g.player) bad++; break }
    }
  }
  ok(ends === games && bad === 0, `离馆者席位留空、不再是死者或凶手，也不会是胜者；每局照常走到终局（${ends}/${games}）`)
  ok(asks === 0, '离馆之后不再向他提问（旁观自动跑完，不卡住）')
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
