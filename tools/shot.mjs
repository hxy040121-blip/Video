// 截图与检查工具（开发用）：用 Playwright 打开 file:// 的 index.html，点开遮幕，滚到某板块，截图并打印控制台错误。
// 用法：
//   node tools/shot.mjs --section mansion --out /tmp/a.png [--w 1440 --h 900] [--offset 0.5] [--mouse 700,400]
//        [--wait 1200] [--eval "js 代码"] [--click "css 选择器"] [--full] [--frames 3 --gap 400]
// --offset：在板块内再往下滚的距离，<=1 视为板块高度的比例，>1 视为像素
// --frames：连续截多张（文件名自动加 -1 -2 …），用于检查动画
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
const out = args.out || '/tmp/shot.png'

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'] })
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(args.dpr || 1), hasTouch: W < 760, isMobile: W < 760 })
const errors = []
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GroupMarkerNotSet|swiftshader|GPU stall/i.test(m.text())) errors.push(`[${m.type()}] ${m.text()}`) })
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`))
await page.goto(pathToFileURL(join(ROOT, 'index.html')).href)
await page.waitForFunction(() => { const b = document.querySelector('.gate-open'); return b && !b.disabled }, null, { timeout: 20000 })
if (!args['no-wake']) {
  await page.evaluate(() => { window.__woke = false; App.bus.on('wake', () => { window.__woke = true }) })
  await page.click('.gate-open', { force: true })
  await page.waitForFunction(() => window.__woke, null, { timeout: 20000 })
}
if (args.section) {
  await page.evaluate(({ id, offset }) => {
    const el = document.getElementById(id)
    let y = el.getBoundingClientRect().top + window.scrollY
    const o = Number(offset || 0)
    y += o <= 1 ? el.offsetHeight * o : o
    if (App.scroll.lenis) App.scroll.lenis.scrollTo(y, { immediate: true, force: true })
    else window.scrollTo(0, y)
  }, { id: args.section, offset: args.offset })
}
await page.waitForTimeout(Number(args.wait || 1500))
if (args.mouse) {
  const [x, y] = String(args.mouse).split(',').map(Number)
  await page.mouse.move(x - 120, y - 60)
  await page.mouse.move(x, y, { steps: 12 })
  await page.waitForTimeout(500)
}
if (args.click) { await page.click(args.click, { force: true }); await page.waitForTimeout(Number(args.after || 1200)) }
if (args.eval) { const r = await page.evaluate(args.eval); if (r !== undefined) console.log('eval:', JSON.stringify(r)) ; await page.waitForTimeout(Number(args.after || 1200)) }
const frames = Number(args.frames || 1)
for (let i = 0; i < frames; i++) {
  const p = frames > 1 ? out.replace(/(\.png)$/, `-${i + 1}$1`) : out
  await page.screenshot({ path: p, fullPage: !!args.full })
  if (i < frames - 1) await page.waitForTimeout(Number(args.gap || 400))
}
console.log(errors.length ? errors.join('\n') : 'no console errors')
await browser.close()
