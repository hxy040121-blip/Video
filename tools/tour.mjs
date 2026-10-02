// 整站巡检（开发用）：打开 index.html，睁眼，然后沿整页滚动，每隔一段截一张图，并记录控制台错误。
// 用法：node tools/tour.mjs --out /tmp/tour [--w 1440 --h 900] [--step 0.8] [--sections prologue,mansion] [--mouse 0.62,0.42]
// --step：每张图之间滚动的距离（视口高度的倍数）
// 输出：<out>/<序号>-<板块>-<偏移>.png 与 <out>/errors.txt
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
let chromium
try { ({ chromium } = await import('playwright')) } catch (e) { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')) }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true])
  return acc
}, []))
const W = Number(args.w || 1440), H = Number(args.h || 900)
const out = args.out || '/tmp/tour'
const step = Number(args.step || 0.8)
const only = args.sections ? String(args.sections).split(',') : null
const [mx, my] = String(args.mouse || '0.62,0.42').split(',').map(Number)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: W < 760, isMobile: W < 760 })
const errors = []
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GroupMarkerNotSet|swiftshader|GPU stall/i.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`))
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href)
await page.waitForFunction(() => { const b = document.querySelector('.gate-open'); return b && !b.disabled }, null, { timeout: 30000 })
await page.screenshot({ path: join(out, '000-gate.png') })
await page.evaluate(() => { window.__woke = false; App.bus.on('wake', () => { window.__woke = true }) })
await page.click('.gate-open', { force: true })
await page.waitForFunction(() => window.__woke, null, { timeout: 30000 })
await page.mouse.move(W * mx, H * my, { steps: 8 })

const ids = await page.evaluate(() => App.sections.map(s => s.id))
let n = 1
for (const id of ids) {
  if (only && !only.includes(id)) continue
  const { top, height } = await page.evaluate(id => {
    const el = document.getElementById(id)
    const r = el.getBoundingClientRect()
    return { top: r.top + window.scrollY, height: el.offsetHeight }
  }, id)
  const shots = Math.max(1, Math.ceil(height / (H * step)))
  for (let i = 0; i < shots; i++) {
    const y = top + i * H * step
    await page.evaluate(y => {
      if (App.scroll.lenis) App.scroll.lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
    }, y)
    await page.mouse.move(W * mx + (i % 2 ? 40 : -40), H * my + (i % 3 ? 20 : -20), { steps: 6 })
    await page.waitForTimeout(Number(args.wait || 1300))
    const name = `${String(n++).padStart(3, '0')}-${id}-${i}.png`
    await page.screenshot({ path: join(out, name) })
  }
}
writeFileSync(join(out, 'errors.txt'), errors.join('\n') || 'no console errors')
console.log(`${n - 1} shots in ${out}; ${errors.length} console messages`)
await browser.close()
