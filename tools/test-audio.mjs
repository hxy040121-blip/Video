// 音频引擎自检（开发用）
// 1) 离线：在 Playwright 里用 OfflineAudioContext 把每段音乐渲染 N 秒（默认 8）、每个音效渲染一次，
//    打印峰值 / RMS（dBFS）/ 削波样本 / NaN / 有声比例 / 每秒起音数，并检查异常。
// 2) 在线：点开遮幕，切换全部音轨，狂按 hover/type，触发全部音效，静音/隐藏页面，检查无报错、发声数有上限。
// 用法：
//   node tools/test-audio.mjs [--seconds 8] [--sr 44100] [--tension 0] [--only dread,coin]
//                             [--wav /tmp/dir] [--no-live] [--no-offline] [--seed 1]
// --wav 会把每次渲染存成 16 位 WAV，便于用 ffmpeg 画频谱图：
//   ffmpeg -i dread.wav -lavfi showspectrumpic=s=1600x600:legend=1 dread.png
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'

let chromium
try { ({ chromium } = await import('playwright')) } catch (e) { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')) }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true])
  return acc
}, []))
const SECONDS = Number(args.seconds || 8)
const SR = Number(args.sr || 44100)
const ONLY = args.only ? String(args.only).split(',') : null
const WAV = args.wav ? String(args.wav) : null
if (WAV) mkdirSync(WAV, { recursive: true })

const TRACKS = ['dread', 'gallery', 'investigation', 'trial', 'wish', 'silence']
const SFX = ['hover', 'click', 'tick', 'chime', 'chimes5', 'discover', 'flip', 'card', 'coin', 'coins', 'stamp', 'vote', 'slash',
  'glitch', 'heartbeat', 'door', 'execute', 'wrong', 'correct', 'type', 'whoosh', 'drop', 'bell', 'dark', 'wind']
const SFX_SECONDS = { chimes5: 17, chime: 10, execute: 11, bell: 11, door: 7, discover: 6, dark: 6, wind: 6, coins: 5 }

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GroupMarkerNotSet|swiftshader|GPU stall|WebGL/i.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`))
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href)
await page.waitForFunction(() => window.App && App.audio && App.audio._render, null, { timeout: 20000 })

// 在页面里渲染并统计
async function render(spec) {
  return page.evaluate(async ({ spec, wantWav }) => {
    const t0 = performance.now()
    const { buffer, voices } = await App.audio._render(spec)
    const ms = performance.now() - t0
    const L = buffer.getChannelData(0), R = buffer.getChannelData(1), n = L.length, sr = buffer.sampleRate
    let peak = 0, sum = 0, nan = 0, clip = 0
    for (let i = 0; i < n; i++) {
      const a = L[i], b = R[i]
      if (a !== a || b !== b) { nan++; continue }
      const m = Math.max(Math.abs(a), Math.abs(b))
      if (m > peak) peak = m
      if (m >= 0.999) clip++
      sum += a * a + b * b
    }
    // 50 ms 窗口：有声比例；高通能量的跃升计为起音
    const hop = Math.round(sr * 0.05)
    let active = 0, frames = 0, onsets = 0, prev = 0
    for (let s = 0; s + hop <= n; s += hop) {
      let e = 0, h = 0
      for (let i = s + 1; i < s + hop; i++) { const x = L[i] + R[i]; e += x * x; const d = x - (L[i - 1] + R[i - 1]); h += d * d }
      const rms = Math.sqrt(e / hop / 2), hf = Math.sqrt(h / hop)
      if (rms > 0.003) active++
      if (hf > 0.004 && hf > prev * 1.8) onsets++
      prev = hf
      frames++
    }
    let wav = null
    if (wantWav) {
      const bytes = new Uint8Array(44 + n * 4), dv = new DataView(bytes.buffer)
      const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) }
      str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ')
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, sr, true)
      dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 4, true)
      for (let i = 0; i < n; i++) {
        dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] || 0)) * 32767, true)
        dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] || 0)) * 32767, true)
      }
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
      wav = btoa(bin)
    }
    return { peak, rms: Math.sqrt(sum / n / 2), clip, nan, active: active / frames, onsets: onsets / (n / sr), voices, ms, wav }
  }, { spec, wantWav: !!WAV })
}

const db = v => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-inf').padStart(6)
const problems = []
function report(name, r, kind) {
  const line = `${name.padEnd(22)} peak ${db(r.peak)} dBFS  rms ${db(r.rms)} dBFS  active ${(r.active * 100).toFixed(0).padStart(3)}%  onsets/s ${r.onsets.toFixed(1).padStart(5)}  nodes ${String(r.voices).padStart(4)}  ${r.ms.toFixed(0)} ms`
  console.log(line)
  if (r.nan) problems.push(`${name}: ${r.nan} NaN 样本`)
  if (r.clip) problems.push(`${name}: ${r.clip} 个削波样本`)
  if (r.peak > 0.97) problems.push(`${name}: 峰值过高 ${r.peak.toFixed(3)}`)
  if (kind !== 'silence' && (kind === 'sfx' ? r.peak < 0.01 : r.rms < 0.003)) problems.push(`${name}: 几乎无声`)
  if (WAV && r.wav) writeFileSync(join(WAV, name + '.wav'), Buffer.from(r.wav, 'base64'))
}

if (!args['no-offline']) {
  const tensions = args.tension != null ? [Number(args.tension)] : [0, 1]
  console.log(`— 离线渲染：音乐 ${SECONDS} s @ ${SR} Hz —`)
  for (const t of TRACKS) {
    if (ONLY && !ONLY.includes(t)) continue
    const ts = t === 'investigation' || t === 'trial' ? tensions : [tensions[0]]
    for (const tension of ts) {
      const r = await render({ track: t, seconds: SECONDS, sr: SR, tension, seed: Number(args.seed || 1) })
      report(ts.length > 1 ? `${t}@${tension}` : t, r, t)
    }
  }
  console.log('— 离线渲染：音效 —')
  for (const s of SFX) {
    if (ONLY && !ONLY.includes(s)) continue
    const r = await render({ sfx: s, seconds: SFX_SECONDS[s] || 3, sr: SR, seed: 1 })
    report('sfx:' + s, r, 'sfx')
  }
}

if (!args['no-live'] && !ONLY) {
  console.log('— 在线冒烟测试 —')
  await page.evaluate(() => { window.__woke = false; App.bus.on('wake', () => { window.__woke = true }) })
  await page.waitForFunction(() => { const b = document.querySelector('.gate-open'); return b && !b.disabled }, null, { timeout: 20000 })
  await page.click('.gate-open', { force: true })
  await page.waitForTimeout(500)
  const s0 = await page.evaluate(() => ({ ready: App.audio.ready, state: App.audio.ctx && App.audio.ctx.state, current: App.audio.current, worker: !!App.audio._state.E.bank.worker }))
  console.log('start:', JSON.stringify(s0))
  await page.waitForTimeout(6000)
  const lv = []
  for (const t of ['dread', 'gallery', 'investigation', 'trial', 'wish', 'silence', 'dread']) {
    await page.evaluate(t => { App.audio.track(t); App.audio.track(t) }, t)
    if (t === 'trial') await page.evaluate(() => App.audio.setMood({ tension: 1 }))
    await page.waitForTimeout(3500)
    const s = await page.evaluate(() => {
      const E = App.audio._state.E
      let mx = 0
      for (let i = 0; i < 20; i++) mx = Math.max(mx, App.audio.level())
      return { level: +App.audio.level().toFixed(3), voices: E.voices, ct: +E.ctx.currentTime.toFixed(1), sync: E.bank.syncCount }
    })
    lv.push(`${t}: level ${s.level} voices ${s.voices} syncRenders ${s.sync}`)
    if (t === 'trial') await page.evaluate(() => App.audio.setMood({ tension: 0 }))
  }
  console.log(lv.join('\n'))
  const spam = await page.evaluate(async () => {
    const E = App.audio._state.E
    let maxV = 0
    for (let i = 0; i < 300; i++) {
      App.audio.sfx('hover'); App.audio.sfx('type'); App.audio.sfx('coin', { volume: 0.5, pitch: 1.2 })
      maxV = Math.max(maxV, E.voices)
      await new Promise(r => setTimeout(r, 4))
    }
    return { maxV, hoverBusy: E.sfxBusy.hover, typeBusy: E.sfxBusy.type }
  })
  console.log('spam:', JSON.stringify(spam))
  if (spam.maxV > 150) problems.push('发声数超过上限：' + spam.maxV)
  for (const s of SFX) { await page.evaluate(s => App.audio.sfx(s), s); await page.waitForTimeout(120) }
  await page.waitForTimeout(2000)
  const m = await page.evaluate(async () => {
    App.audio.setMuted(true)
    await new Promise(r => setTimeout(r, 800))
    const a = { muted: App.audio.muted, state: App.audio.ctx.state, level: App.audio.level() }
    App.audio.setMuted(false)
    await new Promise(r => setTimeout(r, 600))
    const b = { muted: App.audio.muted, state: App.audio.ctx.state }
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 800))
    const c = { hiddenState: App.audio.ctx.state }
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise(r => setTimeout(r, 600))
    return Object.assign(a, { after: b }, c, { visibleState: App.audio.ctx.state, voices: App.audio._state.E.voices })
  })
  console.log('mute/visibility:', JSON.stringify(m))
  if (m.state !== 'suspended' || m.after.state !== 'running' || m.hiddenState !== 'suspended' || m.visibleState !== 'running') problems.push('静音/隐藏时的挂起与恢复不正确')
}

await browser.close()
if (errors.length) { console.log('控制台：'); console.log(errors.join('\n')) } else console.log('控制台：无错误')
if (problems.length) { console.log('问题：'); console.log(problems.join('\n')); process.exitCode = 1 } else console.log('全部通过')
