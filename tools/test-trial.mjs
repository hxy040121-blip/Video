// 庭审引擎的规则测试：node tools/test-trial.mjs（配置 v7.11）
// 依据 主持人游戏.md 第 2 节（受命）、第 3 节（十三席、投票、平票、误判与结束；辩论分两段）、第 4—5 节（十三组身份）、
// 第 7 节（广播与称呼）、第 8 节（金币）；运行规则 1.1（听说）、5.4（破绽与察觉：一次辩论连同随后的投票算一场）、6.3（计票表）、
// 6.6（处刑：尸体消失，金币留在原地）；洋馆物理层 3.1（窗光）、7（痕迹、尸体读数与环境干扰）、8.3（耗时）；
// 身体结算 1、2、4（饥饿与困倦）；价目表 8.1—8.2（钱袋、整百、不成立）、第 6 节（退出券）、10.6（致死的毒 8,000）；
// 开局流程 2.3（开局十枚）、第 4 节（D01 20:00 每人五枚）。
// 卡池大小不写死：人都从载入的 CHARACTERS 里取（至少十三人）；要「不能行走」「同名」的人时，用卡池里的人复制一份改掉那一项。
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
globalThis.window = globalThis
require(join(ROOT, 'assets/data/world.js'))
require(join(ROOT, 'assets/data/characters.js'))
// 卡池的补充文件（有的话）
for (const f of ['assets/data/characters-new.js']) if (existsSync(join(ROOT, f))) require(join(ROOT, f))
require(join(ROOT, 'assets/data/lore.js'))
const TE = require(join(ROOT, 'assets/js/sections/trial-engine.js'))

let pass = 0, fail = 0
function ok(cond, name) {
  if (cond) { pass++; console.log('  \x1b[32m✓\x1b[0m ' + name) }
  else { fail++; console.log('  \x1b[31m✗ ' + name + '\x1b[0m') }
}
function section(t) { console.log('\n' + t) }

const NS = 13
const ALL = globalThis.CHARACTERS.map(c => c.id)
const CH = id => globalThis.CHARACTERS.find(c => c.id === id)
// 能走动的人（卡上 canWalk 不为 false）：默认的局都用他们
const W = ALL.filter(id => CH(id).canWalk !== false)
// 从卡池第 off 个起循环取 n 个不重复的人（不假定卡池多大）
function idsFrom(off, n, pool = ALL) {
  const out = []
  for (let i = 0; i < Math.min(n, pool.length); i++) out.push(pool[((off % pool.length) + i) % pool.length])
  return out
}
const seatsOf = (ids, at) => { const s = Array(NS).fill(null); ids.forEach((id, i) => { s[at ? at(i) : i] = id }); return s }
// 复制卡池里的一个人，改掉几项（不能行走、同名、不报名……）
const clone = (id, over) => Object.assign(JSON.parse(JSON.stringify(CH(id))), over)
// 造一局：前 n 人入座，assign 指定正位身份
function game(n, assign = {}, opts = {}) {
  const ids = opts.ids || W.slice(0, n)
  const seats = seatsOf(ids, opts.seatOf)
  const g = TE.create({ seats, seed: opts.seed || 7, assign, player: opts.player || null, chars: opts.chars })
  return { g, ids }
}
if (ALL.length < NS) { console.log('卡池不足十三人'); process.exit(1) }
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
  const r = TE.tally({ ballots: [], hermits: ['a'], candidates: ['a', 'b'] })
  ok(r.totals.a === -1, '负票数保留，不归零（隐者 0 → −1）')
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
  // 平民加倍（5.13）：第 1 到第 3 步算完以后的总票数 ×2，在定结果时先算
  const ballots = [{ voter: 'a', target: 'm' }, { voter: 'b', target: 'x' }, { voter: 'c', target: 'x' }, { voter: 'x', target: 'm' }]
  const r = TE.tally({ ballots, double: 'm', candidates: ['a', 'b', 'c', 'm', 'x'] })
  ok(r.base.m === 2 && r.totals.m === 4 && r.result === 'm', '平民加倍：杀了公开平民的人得票 2 → 4，压过并列的 2 票')
  const r2 = TE.tally({ ballots, double: 'm', hermits: ['m'], candidates: ['a', 'b', 'c', 'm', 'x'] })
  ok(r2.totals.m === 2 && r2.tie, '先算隐者的 −1，再加倍：(2 − 1) × 2 = 2')
  // 国王号令改写过的一票：照替换后的有效基础票重算，并记下这一步
  const r3 = TE.tally({ ballots: [{ voter: 'a', target: 'x' }, { voter: 'b', target: 'x', ordered: true }], candidates: ['a', 'b', 'x'] })
  ok(r3.totals.x === 2 && r3.steps.some(st => st.kind === 'king' && st.voter === 'b'), '国王号令：受号令的那一票按改过的对象计')
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
  const { g, ids } = game(5, { [W[0]]: '隐者' })
  const T = trial(g, ids[4])
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  V.voters.forEach(v => TE.cast(g, T, V, v, v === ids[0] ? ids[1] : ids[0]))
  const r = TE.settle(g, T, V)
  ok(r.outcome === 'unique' && r.base[ids[0]] === 4 && r.totals[ids[0]] === 3, '隐者总票数减一（隐藏修正），仍可成为唯一最高者')
}
{
  // 隐者的能力不会被沉默（主持人游戏 5.1）
  const { g, ids } = game(5, { [W[0]]: '隐者', [W[1]]: '沉默者' })
  const T = trial(g, ids[4])
  T.phase = 'debate'
  ok(TE.silence(g, T, ids[1], ids[0]) && T.silenced.includes(ids[0]), '沉默者封锁了隐者')
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  V.voters.forEach(v => TE.cast(g, T, V, v, v === ids[0] ? ids[1] : ids[0]))
  const r = TE.settle(g, T, V)
  ok(r.base[ids[0]] === 4 && r.totals[ids[0]] === 3, '被沉默的隐者仍减一票')
}
{
  // 没有并列、但最高票不大于零：两名隐者都没有投票权，第三人（刚才的待处刑者，不能被选）投其中一人
  const { g, ids } = game(3, { [W[0]]: '隐者', [W[1]]: '隐者' })
  const [a, b, x] = ids
  const T = trial(g, x)
  T.phase = 'vote'
  TE.person(g, a).ident.noVote = true
  TE.person(g, b).ident.noVote = true
  T.lawyerBan = x
  let V = TE.beginVote(g, T)
  ok(V.voters.length === 1 && !V.targets.includes(x), '只剩一名投票者，且他不能被选')
  TE.cast(g, T, V, x, a)
  const r = TE.settle(g, T, V)
  ok(r.totals[a] === 0 && r.totals[b] === -1 && r.top.length === 1, '唯一最高者为 0 票、另一人 −1 票')
  ok(r.outcome === 'none' && T.tieBan.length === 0 && T.noResult === 1, '最高票不大于零 → 无结果；没有并列对象 → 保持原投票资格重投')
  V = TE.beginVote(g, T)
  ok(V.voters.includes(x) && V.targets.includes(x), '重投时资格不变（律师的排除也已解除）')
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

/* ---------------- 愚者、律师 ---------------- */
section('愚者与律师')
{
  const { g, ids } = game(5, { [W[1]]: '愚者' })
  const fool = ids[1]
  const T = trial(g, ids[4])
  ok(TE.foolHolder(g, T, fool) === fool, '成为唯一待处刑者的愚者可以发动')
  const r = TE.useFool(g, T, fool)
  ok(r.effect === 'cancel', '愚者不是凶手：撤销处刑')
  const V = TE.beginVote(g, T)
  ok(!V.voters.includes(fool) && !V.targets.includes(fool), '本场剩余期间愚者不能投票，也不能被投')
  ok(TE.foolHolder(g, T, fool) === null, '愚者的机会已消耗')
}
{
  const { g, ids } = game(5, { [W[2]]: '愚者' })
  const T = trial(g, ids[2])
  const r = TE.useFool(g, T, ids[2])
  ok(r.effect === 'fail' && T.knownMurderer === ids[2], '愚者是真凶时能力失败，并向全体确认其为凶手')
}
{
  const { g, ids } = game(5, { [W[3]]: '律师' })
  const lawyer = ids[3]
  const T = trial(g, ids[4])
  ok(TE.lawyerHolders(g, T, lawyer).length === 0, '待处刑者必须为其他角色')
  const r = TE.useLawyer(g, T, lawyer, ids[0])
  ok(r && r.effect === 'cancel', '律师撤销结果')
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
  const { g, ids } = game(9, { [W[0]]: '执行者' })
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
    const { g, ids } = game(8, { [W[0]]: '执行者' }, { seed: s })
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
  const { g, ids } = game(6, { [W[0]]: '骑士', [W[1]]: '骑士' })
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
  // 沉默者每次审判仅一次；被沉默者的正位能力失效（对方不会知道）
  const { g, ids } = game(5, { [W[0]]: '沉默者', [W[1]]: '骑士', [W[4]]: '律师' })
  const T = trial(g, ids[4])
  T.phase = 'debate'
  TE.silence(g, T, ids[0], ids[1])
  ok(TE.silence(g, T, ids[0], ids[2]) === null, '沉默者每次审判仅一次')
  const k = TE.knight(g, T, ids[1], ids[4])
  ok(k && k.silenced && !T.knownMurderer && TE.person(g, ids[1]).ident.used.knight, '被沉默的骑士揭发不生效，机会照样消耗')
  // 法官是律师的逆位（5.8）：只有受命者有；沉默只封正位，封不住它
  g.mandated = ids[4]
  T.silenced.push(ids[4])
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  ok(TE.canUse(g, T, ids[4], 'judge', V) && !TE.canUse(g, T, ids[2], 'judge', V), '法官只给受命者（卡背是法官的那个人）')
  const j = TE.judge(g, T, V, ids[4], ids[3])
  ok(j && j.effective === true, '受命者的法官加票不受沉默影响')
  g.mandated = null
  ok(TE.judge(g, T, TE.beginVote(g, T), ids[4], ids[3]) === null, '没有受命资格：卡背的法官用不了')
}
{
  const ids = W.slice(0, 6)
  const seats = Array(NS).fill(null)
  ;[1, 2, 3, 5, 6, 13].forEach((s, i) => { seats[s - 1] = ids[i] })
  const g = TE.create({ seats, seed: 3, assign: { [ids[0]]: '河豚' } })
  ok(TE.seatLeft(1) === 2 && TE.seatRight(1) === 13 && TE.seatLeft(13) === 1, '十三席成环：1 号的左边是 2 号、右边是 13 号')
  ok(TE.neighborsOf(g, 1).includes(ids[5]) && TE.neighborsOf(g, 1).includes(ids[1]), '1 号与 13 号相邻')
  ok(TE.nearestOf(g, 3, 'left') === ids[3] && TE.nearestOf(g, 6, 'left') === ids[5] && TE.nearestOf(g, 1, 'right') === ids[5], '左右最近：越过空席')
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
  const { g, ids } = game(6, { [W[0]]: '先知', [W[1]]: '占卜家' }, { player: W[0] })
  const c = TE.newCase(g)
  ok(g.notices.some(n => n.type === 'death' && n.at === c.tMurder), '先知在死亡时刻收到「有人死亡」')
  const T = TE.openTrial(g, c)
  const before = g.notices.length
  const target = TE.livingIds(g).find(x => x !== g.player && x !== c.murderer)
  TE.verdict(g, T, target)
  ok(g.notices.length === before + 1, '先知的通知包括主持人处刑')
  const g2 = game(6, { [W[1]]: '占卜家' }, { player: W[0] }).g
  ok(TE.fortune(g2, W[1], 'nobody') === null && TE.canUse(g2, null, W[1], 'fortune'), '目标不在馆：无效，机会不消耗')
  const fr = TE.fortune(g2, W[1], W[0])
  const fn = TE.frontName(g2, W[0])
  ok(fr && fr.name === fn && fr.text && fr.text === WORLD.identities.find(x => x.front === fn).frontText && g2.notices.length === 0, '占卜家得知当前正位身份的名称和卡面原文，被查验者不收到任何通知')
  g2.minutes += 1440
  ok(TE.fortune(g2, W[1], W[2]) === null && !TE.canUse(g2, null, W[1], 'fortune'), '占卜家仅一次（第二天也不刷新）')
}
{
  // 敲钟人（5.5）：调查时间被取消——有效发现的那一刻就开庭；没人来得及搜查
  let found = 0, bad = 0
  for (let s = 1; s < 300 && found < 6; s++) {
    const { g } = game(12, Object.fromEntries(W.slice(0, 12).map(id => [id, '执行者'])), { seed: s })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    found++
    const op = TE.courtOpen(g, c)
    if (!c.bell || c.investMinutes !== 0 || c.tCourt !== c.tDiscover || op.shared.length || c.clues.some(k => k.foundBy)) bad++
  }
  ok(found >= 6 && bad === 0, `敲钟人行凶：调查取消，发现即开庭，没有人搜到线索（${found} 案）`)
  const bc = WORLD.broadcasts.fixed.find(x => x.when === '同上，敲钟人生效')
  ok(bc && /现在开庭/.test(bc.text), '广播：「发现尸体。由于敲钟人的能力，现在开庭。」')
  const { g } = game(12, Object.fromEntries(W.slice(0, 12).map(id => [id, '骑士'])), { seed: 11 })
  const c = TE.newCase(g)
  ok(c.type === 'case' && !c.bell && c.investMinutes === 120 && c.tCourt - c.tDiscover === 120, '平常调查一百二十分钟')
}
{
  const { g, ids } = game(6, { [W[0]]: '丘比特' })
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
  const { g, ids } = game(5, { [W[0]]: '魔术师', [W[1]]: '骑士', [W[3]]: '平民' })
  TE.person(g, ids[1]).ident.noVote = true
  const v = TE.magic(g, ids[0], ids[3], ids[2])
  ok(v && v.void && TE.frontName(g, ids[3]) === '平民' && TE.canUse(g, null, ids[0], 'magician'), '魔术师以平民为目标：无效，另一方也不受影响，机会不消耗')
  const r = TE.magic(g, ids[0], ids[1], ids[2])
  ok(r && TE.frontName(g, ids[2]) === '骑士' && TE.person(g, ids[2]).ident.noVote && !TE.person(g, ids[1]).ident.noVote, '魔术师交换正位，连同身份代价一并转移')
  ok(TE.magic(g, ids[0], ids[3], ids[4]) === null, '魔术师仅一次')
}

/* ---------------- v7.11 的新身份：平民、梦游神、窃贼、兆示、国王 ---------------- */
section('平民、梦游神、窃贼、兆示、国王')
{
  // 平民不会被选为受命者（主持人游戏 2.1、5.13）
  const all = Object.fromEntries(W.slice(0, 6).map(id => [id, '平民']))
  const { g } = game(6, all)
  ok(TE.newCase(g).type === 'stall', '全是平民：无人可受命')
  let bad = 0
  for (let s = 1; s <= 200; s++) {
    const { g } = game(8, {}, { seed: s })
    const c = TE.newCase(g)
    if (c.type === 'case' && TE.frontName(g, c.murderer) === '平民') bad++
  }
  ok(bad === 0, '平民从不受命')
}
{
  // 平民不能被复制、交换或沉默：发动者得知无效，机会不消耗
  const { g, ids } = game(6, { [W[0]]: '变形者', [W[1]]: '沉默者', [W[2]]: '平民' })
  const sh = TE.shapeshift(g, ids[0], ids[2])
  ok(sh && sh.void && TE.frontName(g, ids[0]) === '变形者', '变形者复制平民：无效')
  const T = trial(g, ids[5])
  T.phase = 'debate'
  const sl = TE.silence(g, T, ids[1], ids[2])
  ok(sl && sl.void && !T.silenced.includes(ids[2]) && TE.canUse(g, T, ids[1], 'silencer'), '沉默者沉默平民：无效，这一场的机会还在')
  ok(TE.canUse(g, T, ids[2], 'civilian') && TE.revealCivilian(g, T, ids[2]) && TE.person(g, ids[2]).civilPublic != null, '平民在辩论中公开身份')
  ok(TE.revealCivilian(g, T, ids[2]) === null && !TE.canUse(g, T, ids[2], 'civilian'), '平民公开仅一次')
}
{
  // 公开过的平民被当时的受命者杀死：审理这起死亡的那一场里，那个人得到的票以两倍计
  const ids = W.slice(0, 6)
  const assign = Object.fromEntries(ids.map((id, i) => [id, i === 5 ? '骑士' : '平民']))
  let ok1 = 0, tried = 0
  for (let s = 1; s <= 20; s++) {
    const { g } = game(6, assign, { seed: s })
    for (const id of ids.slice(0, 5)) TE.person(g, id).civilPublic = 0
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    tried++
    const T = TE.openTrial(g, c)
    T.phase = 'vote'
    const V = TE.beginVote(g, T)
    const others = V.voters.filter(v => v !== c.murderer)
    V.voters.forEach(v => TE.cast(g, T, V, v, v === others[0] || v === others[1] ? c.murderer : v === c.murderer ? others[0] : others[2]))
    const r = TE.settle(g, T, V)
    if (c.murderer === ids[5] && c.double === c.murderer && T.double === c.murderer && r.base[c.murderer] === 2 && r.totals[c.murderer] === 4) ok1++
  }
  ok(tried > 10 && ok1 === tried, `受命者杀了公开过的平民：那一场他的票 ×2（${ok1}/${tried}）`)
  const { g } = game(6, assign)
  const T = trial(g, ids[5])
  T.double = ids[5]
  T.phase = 'debate'
  const V = TE.beginVote(g, T, 'special', { actor: ids[0], target: ids[5] })
  V.voters.forEach(v => TE.cast(g, T, V, v, v === ids[0] || v === ids[1] ? ids[5] : v === ids[5] ? ids[0] : null))
  const r = TE.settle(g, T, V)
  ok(r.count === 4 && r.outcome === 'pass', '执行者的特殊表决：投给他的有效基础票 ×2（2 → 4，超过 6 人的一半）')
}
{
  // 梦游神（5.3 逆位）：查一人此刻的逆位，借来使用一次；没有逆位、一直生效的不消耗
  const ids = W.slice(0, 6)
  const { g } = game(6, { [ids[0]]: '占卜家', [ids[1]]: '丘比特', [ids[2]]: '执行者', [ids[3]]: '先知', [ids[4]]: '律师' }, { player: ids[3] })
  ok(TE.sleepwalk(g, ids[0], ids[3]) === null, '没有受命资格：卡背的梦游神用不了')
  g.mandated = ids[0]
  const a = TE.sleepwalk(g, ids[0], ids[1])
  ok(a && a.void && a.name === null, '对方没有逆位（丘比特）：不消耗')
  const b = TE.sleepwalk(g, ids[0], ids[2])
  ok(b && b.void && b.name === '敲钟人' && b.text, '敲钟人一直生效、没有可以使用的一次：只得知名称与原文，不消耗')
  const c = TE.sleepwalk(g, ids[0], ids[4])
  ok(c && c.void && c.name === '法官', '法官「每次普通投票」：借不到')
  const d = TE.sleepwalk(g, ids[0], ids[3])
  ok(d && d.borrowed === '兆示' && /兆示可随时得知/.test(d.text) && TE.person(g, ids[0]).borrowed.name === '兆示', '查到兆示：借到它的一次')
  ok(TE.sleepwalk(g, ids[0], ids[2]) === null, '梦游神仅一次')
  ok(TE.useBack(g, ids[0], '兆示') && TE.person(g, ids[3]).bused['兆示'] && g.notices.some(n => n.type === 'sleepwalk' && n.name === '兆示'), '用掉借来的兆示：对方收到私人通知，他的仅一次同时消耗')
  ok(!TE.useBack(g, ids[0], '兆示'), '借来的只有一次')
}
{
  // 窃贼（5.10 逆位）：把自身的窃贼替换为对方此刻的逆位；对方没有逆位时视为未发动
  const ids = W.slice(0, 5)
  const { g } = game(5, { [ids[0]]: '魔术师', [ids[1]]: '平民', [ids[2]]: '执行者' })
  g.mandated = ids[0]
  const a = TE.thief(g, ids[0], ids[1])
  ok(a && a.void && TE.backName(g, ids[0]) === '窃贼', '对方没有逆位（平民）：能力视为未发动，窃贼不变')
  const b = TE.thief(g, ids[0], ids[2])
  ok(b && b.got === '敲钟人' && TE.backName(g, ids[0]) === '敲钟人' && TE.backName(g, ids[2]) === '敲钟人', '换来对方的敲钟人；对方的身份不变')
  ok(TE.thief(g, ids[0], ids[3]) === null, '窃贼没有了：不能再发动')
  // 受命的 AI 窃贼会在受命的当下换一张
  let got = 0, n = 0
  for (let s = 1; s <= 120; s++) {
    const { g } = game(8, Object.fromEntries(W.slice(0, 8).map((id, i) => [id, i === 0 ? '魔术师' : i < 4 ? '平民' : '执行者'])), { seed: s })
    const c = TE.newCase(g)
    if (c.type !== 'case') continue
    if (TE.frontName(g, c.murderer) !== '魔术师') continue
    n++
    if (c.backs.back === '敲钟人' && c.bell) got++
  }
  ok(n > 5 && got === n, `受命的窃贼当即换来别人的逆位（换来敲钟人，这一案就取消调查；${got}/${n}）`)
}
{
  // 兆示（5.12 逆位）：行凶前看一次各人在哪，说自己在一间那一刻没人的房里——没人拆得穿
  let used = 0, bad = 0
  for (let s = 1; s <= 200; s++) {
    const { g } = game(10, Object.fromEntries(W.slice(0, 10).map(id => [id, '先知'])), { seed: s * 3 })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined || c.cause.id === 'poison') continue
    if (c.shift) { if (c.omen) bad++; continue }
    if (!c.omen) { bad++; continue }
    used++
    if (!TE.person(g, c.murderer).bused['兆示']) bad++
    if (TE.livingIds(g).some(w => TE.contradicts(c, c.murderer, w))) bad++
  }
  ok(used > 50 && bad === 0, `兆示：受命者说谎时挑没人的地方，没人能拆穿（${used} 案）`)
}
{
  // 国王（5.9）：翻面以后正位是国王、逆位是骑士；投票时号令一侧最近的存活者跟票或弃票自投
  const ids = W.slice(0, 7)
  const seats = Array(NS).fill(null)
  ;[1, 2, 4, 6, 8, 10, 12].forEach((k, i) => { seats[k - 1] = ids[i] })
  const g = TE.create({ seats, seed: 5, assign: Object.fromEntries(ids.map((id, i) => [id, i === 2 ? '骑士' : '执行者'])) })
  const king = ids[2] // 4 号席
  ok(TE.kingFlip(g, king) === null, '没有受命资格：翻不了面')
  g.mandated = king
  TE.person(g, king).ident.noVote = false
  ok(TE.kingFlip(g, king) && TE.frontName(g, king) === '国王' && TE.backName(g, king) === '骑士', '翻面：正位国王、逆位骑士')
  ok(TE.kingFlip(g, king) === null, '翻面仅一次')
  ok(/那一边最近的存活角色/.test(TE.identText(g, '国王')), '翻面以后的卡面原文（5.9 结算要点）')
  const T = trial(g, king)
  T.phase = 'vote'
  const V = TE.beginVote(g, T)
  ok(!TE.canUse(g, T, king, 'king', V), '国王本人还没投：不能号令')
  // 4 号投 1 号；左边最近的是 6 号（5 号空席），右边最近的是 2 号
  V.voters.forEach(v => TE.cast(g, T, V, v, v === king ? ids[0] : v === ids[3] ? king : ids[4]))
  const o = TE.kingOrder(g, T, V, king, 'left')
  ok(o && o.to === ids[3] && o.target === ids[0], '号令左边：越过空席，找到最近的存活者')
  ok(TE.kingOrder(g, T, V, king, 'right') === null && !TE.canUse(g, T, king, 'king', V), '同一次投票只有一道号令；国王的机会已用')
  TE.obeyOrder(g, T, V, true)
  const r = TE.settle(g, T, V)
  ok(V.ballots.find(b => b.voter === ids[3]).ordered && r.base[ids[0]] === 2 && r.base[king] === 0, '受号令者原来的票取消，改投国王的对象')
  const V2 = TE.beginVote(g, T)
  ok(!TE.canUse(g, T, king, 'king', V2), '号令仅一次')
  // AI 的国王：自己领先时才发号令
  let fired = 0, n = 0
  for (let s = 1; s <= 60; s++) {
    const { g } = game(9, Object.fromEntries(W.slice(0, 9).map(id => [id, '骑士'])), { seed: s })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined || TE.frontName(g, c.murderer) !== '国王') continue
    n++
    TE.courtOpen(g, c)
    const T = TE.openTrial(g, c)
    TE.autoTrial(g, T, ev => { if (ev.type === 'king' && ev.actor === c.murderer) fired++ })
  }
  ok(n > 10 && fired > 0, `受命的国王翻面后会在危急时号令（${n} 位国王，${fired} 次号令）`)
}

/* ---------------- 受命资格与线索 ---------------- */
section('受命资格与线索')
// 两个不能行走的人（卡池里的人复制一份，canWalk 改成 false）：受命资格只看手法，不认具体是谁
const NW = [clone(W[0], { id: 'test-nowalk-a', name: '不能行走甲', callName: '不能行走甲', canWalk: false }), clone(W[1], { id: 'test-nowalk-b', name: '不能行走乙', callName: '不能行走乙', canWalk: false })]
const CHARS_NW = globalThis.CHARACTERS.concat(NW)
{
  let bad = 0, civBad = 0, clueBad = 0, over = 0, cases = 0, nwMand = 0
  for (let s = 1; s <= 400; s++) {
    const ids = NW.map(c => c.id).concat(idsFrom(s % 20, 10, W))
    const g = TE.create({ seats: seatsOf(ids), seed: s, player: ids[2], chars: CHARS_NW })
    const c = TE.newCase(g)
    if (c.type !== 'case') continue
    cases++
    const m = g.charMap[c.murderer]
    if (m.canWalk === false) nwMand++
    if (m.canWalk === false && c.cause.id !== 'poison') bad++
    if (TE.frontName(g, c.murderer) === '平民') civBad++
    if (c.murderer === g.player || c.victim === g.player || c.victim === c.murderer) bad++
    for (const k of c.clues) {
      if (k.shift) { if (k.predicate !== null || !TE.pred(k.needs)(m) || k.dim !== 'time') clueBad++ }
      else if (!TE.pred(k.predicate)(m)) clueBad++
    }
    if (c.clues.length !== 3) over++
  }
  ok(cases > 300 && bad === 0 && nwMand === 0, '买不起毒（80 枚）的不能行走者没有可行手法，不会受命；凶手、死者都不是玩家')
  ok(civBad === 0, '平民不会被选中成为受命者')
  ok(clueBad === 0, '筛人的线索对凶手都为真；让死亡时间窗偏移的那条不筛人（判别条件为空），「想得到这样做」的条件对凶手成立')
  ok(over === 0, '每案恰好三条线索')
}
{
  // 兑换来的毒（价目表 10.6，80 枚）：不能行走的人身上加书桌上够 80 枚才有这条路；决定的那一刻付清
  const nw = NW[0].id
  const others = W.slice(0, 5)
  const assign = Object.fromEntries(others.map(id => [id, '平民'])) // 别人都是平民：只剩他能受命
  const mk = n => { const g = TE.create({ seats: seatsOf([nw].concat(others)), seed: 9, chars: CHARS_NW, assign }); TE.person(g, nw).coins = n; return g }
  ok(TE.newCase(mk(79)).type === 'stall', '79 枚：买不起毒，没有可行手法，无人受命')
  const g = mk(70)
  TE.person(g, nw).coinsDesk = 10
  const c = TE.newCase(g)
  const pn = TE.person(g, nw)
  ok(c.type === 'case' && c.murderer === nw && c.cause.id === 'poison' && c.buy && c.buy.coins === 80 && c.buy.at === 18 * 60 &&
    pn.coins + pn.coinsDesk === (g.d01 && g.d01.ids.includes(nw) ? 5 : 0) - (pn.spentMeals || 0), '身上 70 枚 + 书桌 10 枚：买下致死的毒一剂，付 80 枚')
  ok(c.cause.name === '兑换来的毒' && TE.poisonCoins(g) === 80, 'lore 死因「兑换来的毒」，8,000 分 = 80 枚')
  ok(!c.where[nw].lie, '下毒不必在场：凶手照实交代去向')
  let walkPoison = 0, n = 0
  for (let s = 1; s <= 300; s++) {
    const { g } = game(8, {}, { seed: s })
    const c = TE.newCase(g)
    if (c.type !== 'case') continue
    n++
    if (c.cause.id === 'poison') walkPoison++
  }
  ok(n > 200 && walkPoison === 0, '开局的 10 枚买不起毒：没有人用毒')
}
{
  // 线索去重：同一维度不重复（死因要求的维度也算已用）；每条都标出维度与看不看得见；手印带离地厘米数
  let cases = 0, dupDim = 0, noDim = 0, causeDup = 0, hand = 0, handBad = 0, labelLong = 0, dimSeen = new Set(), visBad = 0, floorBad = 0
  for (let s = 1; s <= 500; s++) {
    const ids = idsFrom(s * 7, [8, 12, 13][s % 3])
    const g = TE.create({ seats: seatsOf(ids), seed: s * 17, player: ids[1] })
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
      // 线索的文字与地面相容：木地板的湿鞋渍、石地的擦洗、地毯压痕与蜡面色差
      const surf = c.roomInfo.floorSurface || ''
      if (k.tpl === 'woodprint' && k.vi === 0 && !/木/.test(surf.split('·')[0])) floorBad++
      if (k.tpl === 'scrub' && !/石/.test(surf)) floorBad++
      if (k.tpl === 'furniture' && (k.vi === 0 ? !/毯/.test(surf + (c.roomInfo.objects || []).join('')) : !/木/.test(surf.split('·')[0]))) floorBad++
    }
  }
  ok(cases > 400 && noDim === 0 && dupDim === 0, `同一维度不重复（${cases} 案）`)
  ok(floorBad === 0, '线索的文字与现场的地面相容')
  ok(causeDup === 0, '死因要求的维度（扼颈要受训）不再出一条同维度的线索')
  ok(dimSeen.size === 8 && visBad === 0, '八个维度都会出现（含「死亡时间」）；身高、性别、体格、随身物看得见，医护、现场观察、年代与器械看不见')
  ok(hand > 20 && handBad === 0, `手印卡带「约 N 厘米」（${hand} 张）`)
  ok(labelLong === 0, '证物卡短名不超过十二个字')
}
{
  let narrowed = 0, total = 0
  for (let s = 1; s <= 200; s++) {
    const { g } = game(13, {}, { seed: s, ids: idsFrom(s, 13) })
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
    const ids = idsFrom(s, 12)
    const seats = seatsOf(ids)
    const g = TE.create({ seats, seed: s * 7, player: ids[s % 12] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined || c.bell) continue // 敲钟人的案子没有调查，不能询问
    cases++
    const W = c.where
    for (const id of TE.livingIds(g)) if (!W[id]) bad++
    const m = W[c.murderer]
    if (c.cause.id === 'poison') { if (m.lie) bad++; else truthful++ }
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
    const ids = idsFrom(s, 12)
    const seats = seatsOf(ids)
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
      else if (value.type === 'ask-fool' || value.type === 'ask-lawyer') input = false
    }
    if (!turn) { tried--; continue } // 执行者提前终止了辩论，没轮到玩家
    if (hit) shown++
  }
  ok(tried > 0 && shown === tried, `询问时问出的谎，玩家指认时当众拆穿（${shown}/${tried}）`)
  ok(cases > 200 && bad === 0, `每个在馆者都有去向；无辜者照实说，亲手行凶的凶手说自己在别处（${lies} 案说谎，${truthful} 案下毒照实说）`)
  ok(contraBad === 0, '只有凶手的说法会与旁人的真实去向相矛盾')
  ok(costBad === 0 && askBad === 0, `询问花费调查时间、每人一次、不能问自己；玩家本人在场时问出凶手的谎（${playerWit} 例）`)
}

/* ---------------- 调查的文字 ---------------- */
section('调查的文字')
{
  let decoys = 0, empty = 0, herrings = 0, repeats = 0, bodyBad = 0, leads = 0, games = 0, facts = 0, contra = 0, herrBad = 0, recheck = 0
  const texts = []
  for (let s = 1; s <= 60; s++) {
    const ids = idsFrom(s, 13)
    const seats = seatsOf(ids)
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
            (sp.flavor === 'vessel' && sp.fact === 'not-used' && f.cupUsed) || (sp.fact === 'not-moved' && f.furniture) ||
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
  ok(/发绀/.test(poison) && /鲜红/.test(poison) && /苦杏仁/.test(poison) && /喝空/.test(poison) && !/白沫|什么气味也没有/.test(poison), '兑换来的毒（氰化物）的尸征：口唇发绀、皮肤偏鲜红、苦杏仁气味、杯子喝空')
  ok(!TE.texts.BODY_TEXT.door && !TE.texts.FACTS.coin && !Object.values(TE.texts.DECOY_TEXT).flat().some(t => /背光|理币盘/.test(t)), '没有门扇夹压、理币盘与「背光窗」的描写')
  // 地面怎么叫：五类地面（物理层 4.2）；橡胶垫不是木地板
  const fw = surf => TE.floorWord({ floorSurface: surf })
  ok(fw('橡木地板·羊毛地毯') === '木地板' && fw('枫木助走区与球道') === '木地板' && fw('橡胶垫') === '橡胶垫' && fw('石材') === '石地' && fw('湿区防滑石') === '石地' && fw('羊毛地毯·卫浴防滑石') === '地毯', '地面：木地板、橡胶垫、石地、地毯')
  // 窗是真窗：窗光为「无」（19:00—05:00）时映出倒影，白天看得见屋外
  const gw = game(5).g
  ok(TE.windowDark(gw, 20 * 60) && TE.windowDark(gw, 3 * 60) && !TE.windowDark(gw, 12 * 60) && !TE.windowDark(gw, 18 * 60), '窗光：19:00—05:00 为「无」')
  ok(TE.texts.DECOY_TEXT.windowDark.every(t => /映|倒影/.test(t)) && TE.texts.DECOY_TEXT.window.every(t => !/倒影/.test(t)), '入夜的窗映出屋里的倒影；白天的窗看得见屋外')
}

/* ---------------- 辩论的节拍 ---------------- */
section('辩论的节拍')
{
  const seen = {}
  let bad = 0, deadAsk = 0, games = 0, ends = 0, clueBad = 0, exposeBad = 0, respondAsk = 0, cur = null, accusedBy = {}
  for (let s = 1; s <= 160; s++) {
    const n = [6, 9, 12, 13][s % 4]
    const ids = idsFrom((s * 5), n)
    const seats = seatsOf(ids)
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
    const { g, ids } = game(8, {}, { seed: s, ids: idsFrom(s, 8) })
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
    const ids = idsFrom((s * 3), 9)
    const seats = seatsOf(ids)
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
  ok(perScene === 0, '一次辩论连同随后的投票算一场：一场庭审里同一人至多判一次破绽')
  ok(inv > 0 && invBad === 0, `调查期询问凶手也会判破绽，只有问话的人看得见（${inv} 次）`)
  ok(suspN === 0 || susp === suspN, '察觉到的破绽让 AI 更怀疑那个人')
}

/* ---------------- 称呼、发现、手段的物理后果 ---------------- */
section('称呼、发现与手段')
{
  // 称呼（主持人游戏 7）：卡池里的人复制两份——一份与原人同名，一份不报名
  const named = W.filter(id => CH(id).callName)
  const a = named[0], b = named.find(id => CH(id).callName !== CH(a).callName)
  const callA = CH(a).callName, callB = CH(b).callName
  const twin = clone(a, { id: 'test-twin', name: CH(a).name + '（另一位）' })
  const mute = clone(W.find(id => id !== a && id !== b), { id: 'test-noname', callName: null })
  const chars = globalThis.CHARACTERS.concat([twin, mute])
  const seats = Array(NS).fill(null)
  ;[a, 'test-twin', b, 'test-noname'].forEach((id, i) => { seats[i * 2] = id })
  const g = TE.create({ seats, seed: 5, chars })
  ok(callB && TE.callOf(g, b) === callB, '广播与台词用馆里报的名字（' + CH(b).name + ' → ' + callB + '）')
  ok(TE.callOf(g, a) === '1号' && TE.callOf(g, 'test-twin') === '3号', '同局两人报同一个名字：改说「N号」')
  ok(TE.callOf(g, 'test-noname') === '7号', '不报名的人：改说「N号」')
  const g1 = TE.create({ seats: [a, b].concat(Array(NS - 2).fill(null)), seed: 5 })
  ok(TE.callOf(g1, a) === callA, '同局只有一位报这个名字时照常报名字')
  const withX = W.find(id => /\{X\}/.test((CH(id).lines || {}).accuse || ''))
  if (withX) {
    const g2 = TE.create({ seats: [withX, b].concat(Array(NS - 2).fill(null)), seed: 5 })
    ok(TE.lineOf(g2, withX, 'accuse', b).includes(callB), '人物卡台词的 {X} 也代入报的名字')
  }
}
{
  let self = 0, selfBad = 0, cases = 0
  for (let s = 1; s <= 600; s++) {
    const ids = idsFrom((s * 11), 10)
    const seats = seatsOf(ids)
    const g = TE.create({ seats, seed: s * 23, player: ids[2] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    cases++
    if (c.selfReport) { self++; if (c.discoverer !== c.murderer || !TE.isLiving(g, c.discoverer)) selfBad++ }
    else if (c.discoverer === c.murderer) selfBad++
  }
  ok(self > 10 && self < cases * 0.25 && selfBad === 0, `凶手看见尸体时偶尔会在心里要求播报，成为发现者（${self}/${cases}）`)
  ok(!(WORLD.broadcasts.abilities || []).some(x => /典狱长/.test(x.ability)) && !(LORE.causes || []).some(k => k.id === 'door'), '典狱长与门的手法都删了')
}
{
  // 广播：按 when 取句，引擎与界面用到的键都在，取不到就是空串（界面会静默）
  const keys = ['尸体被有效发现', '同上，敲钟人生效', '辩论结束，主持人没有亲自开口', '判定正确', '误判', '未产生唯一结果', '骑士揭发', '愚者发动', '受命者逾期']
  const miss = keys.filter(k => !WORLD.broadcasts.fixed.some(x => x.when === k && x.text))
  ok(miss.length === 0, '界面用到的广播键都在（含「愚者发动」「辩论结束，主持人没有亲自开口」）' + (miss.length ? '：缺 ' + miss.join('、') : ''))
  ok(!WORLD.broadcasts.fixed.some(x => /白痴|主持人只以|典律官|贞德/.test(x.when)), '旧键（白痴发动、主持人只以【】喊停辩论……）没有了')
  const src = readFileSync(join(ROOT, 'assets/js/sections/trial.js'), 'utf8')
  const used = Array.from(src.matchAll(/bc(?:Text|Part)\('([^']+)'/g), m => m[1])
  const unk = used.filter(k => !WORLD.broadcasts.fixed.some(x => x.when === k))
  ok(used.length >= 8 && unk.length === 0, 'trial.js 里每一处广播都取得到句子' + (unk.length ? '：' + unk.join('、') : ''))
}

/* ---------------- 结案回放 ---------------- */
section('结案回放（T.log 与 c.record）')
{
  let recs = 0, bad = 0, decisive = 0, uniques = 0, empties = 0, logBad = 0, finders = 0
  for (let s = 1; s <= 120; s++) {
    const ids = idsFrom((s * 5), 8)
    const seats = seatsOf(ids)
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
  for (const f of ['a', 'b', 'c', 'd', 'e', 'f']) if (existsSync(join(ROOT, 'assets/data/lines/' + f + '.js'))) require(join(ROOT, 'assets/data/lines/' + f + '.js'))
  const P = globalThis.TRIAL_LINES || {}
  const KEYS = ['wake', 'discover', 'react', 'search', 'found', 'statement', 'alibi', 'accuse', 'accuseClue', 'agree', 'doubt', 'defend', 'counter', 'silent', 'vote', 'executed', 'watch', 'right', 'wrong', 'win', 'wish']
  const ALLOW = { discover: ['V'], react: ['V'], search: ['ROOM'], found: ['CLUE'], alibi: ['ROOM', 'TIME'], accuse: ['X'], accuseClue: ['X', 'CLUE'], agree: ['X'], doubt: ['X'], counter: ['X'], vote: ['X'], watch: ['X'], right: ['X'], wrong: ['X'] }
  let missing = [], badPh = []
  for (const id of ALL) for (const k of KEYS) {
    const arr = P[id] && P[id][k]
    if (!Array.isArray(arr) || !arr.length) { missing.push(id + '.' + k); continue }
    for (const t of arr) for (const m of t.matchAll(/\{(\w+)\}/g)) if (!(ALLOW[k] || []).includes(m[1])) badPh.push(id + '.' + k)
  }
  ok(ALL.length >= NS && missing.length === 0, `卡池里的 ${ALL.length} 人每个场合都有台词` + (missing.length ? '（缺 ' + missing.slice(0, 6).join('、') + '）' : ''))
  ok(badPh.length === 0, '占位符只用该场合允许的')
}

/* ---------------- 庭审（二）：当众出示、公开讨论、死亡时间、金币、身体、工具、离馆 ---------------- */
// 造一局有玩家的案子：cond(c, g) 为真才要
function caseWith(cond, opts = {}) {
  for (let s = 1; s <= (opts.tries || 3000); s++) {
    const n = opts.n || 8
    const ids = idsFrom(s * 7, n, W)
    const seats = seatsOf(ids)
    const g = TE.create({ seats, seed: s * (opts.salt || 37), player: ids[1] })
    const c = TE.newCase(g)
    if (c.type !== 'case' || c.lastStanding !== undefined) continue
    if (c.bell && !opts.bell) continue // 敲钟人：没有调查
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
    else if (value.type === 'ask-fool' || value.type === 'ask-lawyer') input = false
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
      if (T.tellLog.some(t => t.holder === c.murderer)) tellRolled++ // 一场庭审只判一次：出示之前判过的，也算
    } else defendOk++, tellRolled++ // 讨论没开（执行者等）：不计
    const vi = evs.findIndex(e => e.type === 'present' && e.speaker === g.player && vis && e.clue.id === vis.id)
    if (vi < 0 || (evs[vi + 1] && evs[vi + 1].type === 'rebut' && evs[vi + 1].visible && !evs[vi + 1].hearsay)) visRebut++
    const mine = T.presents.filter(p => p.speaker === g.player).length
    if (mine <= TE.PRESENT_MAX && T.presentLeft === TE.PRESENT_MAX - mine) limitOk++
    if ((T.handsUsed || 0) <= TE.HAND_MAX && asked <= TE.HAND_MAX + 1) handOk++
  }
  ok(tried >= 15 && rebutOk === tried, `不相符的人拿出反证；看不见的特征只是他的说法（听说）（${rebutOk}/${tried}）`)
  ok(defendOk === tried && tellRolled === tried, `相符的凶手只能辩解；这一场他的破绽已判过或当场判（${defendOk}/${tried}）`)
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
    const n = s % 3 === 0 ? 13 : 8
    const ids = idsFrom((s * 5), n)
    const seats = seatsOf(ids)
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
    if (living >= 12) { n15++; if (T.beats < 6 || T.beats > 8) bad15++ }
    if (T.beatsRun > T.beats) runBad++
    if (!['beats', 'exhausted'].includes(T.stopReason)) stopBad++
    beatsSum += T.beatsRun
  }
  ok(disc / trials > 0.7 && orderBad === 0, `依次发言之后进入公开讨论（${disc}/${trials} 场），主持人喊停后才投票`)
  ok(n8 > 30 && bad8 === 0, `八人局 4—6 拍（${n8} 场）`)
  ok(n15 > 20 && bad15 === 0, `十三人局（开庭时在座十二人）6—8 拍（${n15} 场）`)
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
    const ids = idsFrom((s * 3), 10)
    const seats = seatsOf(ids)
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
section('金币：开局十枚、D01 20:00、审判的发放、处刑留下的金币、拾取、AI 吃饭')
{
  const { g, ids } = game(8, {}, { player: W[0] })
  ok(ids.every(id => TE.person(g, id).coins === TE.START_COINS) && TE.START_COINS === WORLD.coins.startEach, '开局每人身上 10 枚（第二条播报时出现在各人面前）')
  // D01 20:00：存活在馆者每人五枚（开局流程第 4 节）；只发一次
  TE.aiMeals(g, 19 * 60)
  ok(!g.d01 && ids.every(id => TE.person(g, id).coins === 10), '19:00：还没发')
  TE.aiMeals(g, 20 * 60)
  ok(g.d01 && g.d01.n === WORLD.coins.d01 && ids.every(id => g.d01.ids.includes(id) && TE.person(g, id).coins === 15), '20:00：每人 +5（玩家那一份由界面经 App.econ.d01() 同步）')
  TE.aiMeals(g, 23 * 60)
  ok(ids.every(id => TE.person(g, id).coins === 15), 'D01 20:00 的五枚只发一次')
  const late = TE.create({ seats: seatsOf(W.slice(0, 5)), seed: 3, startMinutes: 22 * 60 })
  TE.aiMeals(late, 23 * 60)
  ok(late.d01 && late.d01.ids.length === 0 && TE.person(late, W[0]).coins === 10, '从 20:00 以后才开始的局：不补发')
}
{
  // 处刑（运行规则 6.6）：尸体消失，金币留在原地——审判判出来的，留在他的席位上，有人拾取才转手
  const { g, ids } = game(6, {}, { player: W[0] })
  const T = trial(g, ids[5])
  TE.person(g, ids[2]).coins = 7
  const v = TE.verdict(g, T, ids[2])
  ok(!v.correct && v.coins[0] === 7 && TE.person(g, ids[2]).coins === 0 && g.seatCoins[2] === 7, '误判处死：他身上的 7 枚留在 3 号席上')
  ok(TE.takeSeatCoins(g, 3, g.player) === null, '庭审还没结束：拿不了')
  T.ended = true
  const r = TE.takeSeatCoins(g, 3, g.player)
  ok(r && r.n === 7 && TE.person(g, g.player).coins === 17 && g.seatCoins[2] === 0 && TE.takeSeatCoins(g, 3, g.player) === null, '庭审结束后拾起那 7 枚；只能拿一次')
}
{
  let bodyOk = 0, takeOk = 0, payOk = 0, deskOk = 0, neg = 0, meals = 0, playerMeals = 0, cases = 0
  for (let s = 1; s <= 60; s++) {
    const idz = idsFrom((s * 3), 8)
    const seats = seatsOf(idz)
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
      if (!TE.isLiving(g, g.player) || c.bell) { if (r === null && c.bodyCoins === n) takeOk++ } // 玩家已出局，或敲钟人取消了调查：没人取，留在现场
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
  ok(payOk === cases && deskOk === cases, '审判结束：存活在馆者各得本轮的 5 或 10 枚；未查明时凶手另 10 枚在书桌上（不在身上）')
  ok(neg === 0 && meals > 100 && playerMeals === 0, `AI 每到饭点用 1 枚吃一餐（${meals} 餐），不会欠钱；玩家不自动扣`)
}
{
  // 本局钱袋（core/app.js 的 App.econ，见 plan711/ECON.md）：开局、整百、不成立、身上不够、退出券、修复残疾——不跨局累积
  const src = readFileSync(join(ROOT, 'assets/js/core/app.js'), 'utf8')
  const a = src.indexOf('  /* ---------- 本局钱袋'), b = src.indexOf('  /* ---------- 光标 / 鼠标')
  // 一位卡上写明不能行走、残疾可修复的人（卡池里的人复制一份）：修复以后按能走算
  const lame = clone(W[0], { id: 'test-lame', name: '不能行走的人', canWalk: false, disability: '双腿不能行走' })
  const charMap = Object.fromEntries(CHARACTERS.concat([lame]).map(c => [c.id, c]))
  const App = { state: { seats: Array(NS).fill(null), minutes: 0, econ: null }, bus: { emit() {} }, char: id => charMap[id] || null }
  new Function('App', 'window', src.slice(a, b))(App, globalThis)
  const E = App.econ
  ok(E.NST === 13 && E.TOTAL === 130 && E.D01_AT === TE.D01_AT, '十三席，全馆开局 130 枚；D01 20:00 与引擎同一时刻')
  const seats = Array(NS).fill(null)
  W.slice(0, 8).forEach((id, i) => { seats[(i * 2) % NS] = id })
  let e = E.newGame({ me: seats[0], seats })
  ok(e.coins === 10 && e.source === 'trial' && e.front.length === 13 && e.front.every(n => n === 0) && e.seat === 1, '庭审开局：你身上 10 枚，各席面前的那一摞都已拿起')
  ok(E.d01() === 5 && E.get().coins === 15 && E.d01() === 0, '第一天晚上八点：+5，只发一次')
  e = E.newGame({ me: seats[0], seats })
  ok(E.settle(['一瓶果汁、汽水或牛奶']).reason === 'round' && E.settle(['一瓶果汁、汽水或牛奶']).short === 80, '总价不是整百：不成立（差多少要添东西凑满）')
  const combo = E.settle(['一壶热咖啡或茶，含杯具', '巧克力一板'])
  ok(combo.ok && combo.coins === 1, '咖啡 60 + 巧克力 40 = 100：凑整一枚')
  ok(E.settle(['十三人份的同一餐']).reason === 'round' && E.settle(['十三人份的同一餐']).short === 30 && E.settle(['十三人份的同一餐', '零食一包（薯片、饼干、糖）']).ok, '十三人份的同一餐 870：添一包零食 30 凑成 9 枚')
  const v = E.pay([{ name: '谁是受命者', void: 'ask' }])
  ok(v.reason === 'void' && E.get().coins === 10, '打听谁是受命者：不成立，不收钱')
  const lum = ['鲁米诺试剂一瓶', '毛毯、枕头、睡袋', '一瓶果汁、汽水或牛奶']
  ok(E.settle(lum).reason === 'purse' && E.settle(lum).total === 1600, '鲁米诺 1500 + 毛毯 80 + 果汁 20 = 1600：身上 10 枚不够')
  E.gain(10, 'payout')
  const pr = E.pay(lum)
  ok(pr.ok && E.get().coins === 4 && E.get().items.length === 3, '审判发放后 20 枚：付 16 枚，三样东西到手边')
  ok(E.pay(['退出券一张']).reason === 'purse', '退出券五百枚：买不起')
  e = E.newGame({ me: seats[0], seats })
  ok(e.coins === 10 && e.items.length === 0, '重开一局：钱袋整个换掉，不跨局累积')
  E.newGame({ me: seats[0], seats, coins: 600 })
  ok(E.pay(['退出券一张']).ok && E.hasTicket() && E.exit({ at: 1500 }) && E.get().exited && E.get().exited.at === 1500, '买下退出券、持券要求离馆')
  ok(E.settle(['一餐，一人份，菜式任点']).reason === 'exited', '离馆之后什么也换不了')
  const jseats = seats.slice(); jseats[0] = lame.id
  E.newGame({ me: lame.id, seats: jseats })
  ok(!E.canWalk(lame.id) && E.pay(['修复身体残疾']).ok && E.canWalk(lame.id), '修复身体残疾：此后庭审里按能走算')
  const plain = W.find(id => !E.disability(id))
  E.newGame({ me: plain, seats })
  ok(E.settle(['修复身体残疾']).reason === 'repair', '卡上没写明残疾的人：修复不成立')
  // 庭审引擎读修复记录：能走的人才会出去走动，也才有行凶的手法
  const g = TE.create({ seats: jseats, seed: 3, player: W[1], chars: CHARACTERS.concat([lame]), assign: Object.assign(Object.fromEntries(seats.filter(Boolean).map(id => [id, '平民'])), { [lame.id]: '骑士' }) })
  ok(TE.newCase(g).type === 'stall', '没修复：只剩他能受命，却没有可行手法')
  const g2 = TE.create({ seats: jseats, seed: 3, player: W[1], chars: CHARACTERS.concat([lame]), assign: Object.assign(Object.fromEntries(seats.filter(Boolean).map(id => [id, '平民'])), { [lame.id]: '骑士' }) })
  g2.walkFix = { [lame.id]: true }
  const c = TE.newCase(g2)
  ok(c.type === 'case' && c.murderer === lame.id && c.cause.id !== 'poison', '修复过的人在引擎里按能走算（walkFix）')
}
section('身体：饥饿与困倦 → 调查耗时')
{
  const { g, ids } = game(6, {}, { player: W[0] })
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
  const poi = caseWith(c => !TE.hasBlood(c))
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
    const ids = idsFrom((s * 7), 8)
    const seats = seatsOf(ids)
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
      const n = [5, 8, 12, 13][s % 4]
      const ids = idsFrom((s * 3), n)
      const seats = Array(NS).fill(null)
      ids.forEach((id, i) => { seats[n <= 7 ? i * 2 : i] = id })
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
