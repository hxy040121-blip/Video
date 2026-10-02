// 把若干 SVG 渲染成一张对照图（开发用，检查立绘/纹章的画风统一）。
// 用法：node tools/render-svg.mjs --out /tmp/sheet.png [--cols 6] [--cell 300] [--bg #0a0809] [--look -1,0] a.svg b.svg ...
// --look dx,dy：把所有 .p-iris 平移（-1..1 乘 7px）检查视线追随时眼珠是否被正确裁切
// --labels：在每格下方写文件名
// --color：currentColor 的颜色（默认黄铜 #c29a5b）
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
let chromium
try { ({ chromium } = await import('playwright')) } catch (e) { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')) }

const argv = process.argv.slice(2)
const opts = {}
const files = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2)
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    opts[k] = v
  } else files.push(argv[i])
}
const cols = Number(opts.cols || Math.min(files.length, 6))
const cell = Number(opts.cell || 300)
const ratio = Number(opts.ratio || (4 / 3))
const rows = Math.ceil(files.length / cols)
const [lx, ly] = String(opts.look || '0,0').split(',').map(Number)
const cells = files.map((f, i) => {
  let svg = readFileSync(f, 'utf8').replace(/<\?xml[^>]*>/, '')
  svg = svg.replace(/\sid="([^"]+)"/g, ` id="$1__${i}"`).replace(/url\(#([^)]+)\)/g, `url(#$1__${i})`).replace(/href="#([^"]+)"/g, `href="#$1__${i}"`)
  return `<figure><div class="c">${svg}</div>${opts.labels ? `<figcaption>${basename(f)}</figcaption>` : ''}</figure>`
}).join('')
const html = `<!doctype html><html><head><style>
body{margin:0;background:${opts.bg || '#0a0809'};color:${opts.color || '#c29a5b'};}
.g{display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:12px;padding:12px;}
figure{margin:0}
.c{width:${cell}px;height:${Math.round(cell * ratio)}px;background:${opts.cellbg || '#161113'}}
.c svg{width:100%;height:100%}
.p-iris{transform:translate(${lx * 7}px,${ly * 7 * 0.7}px)}
figcaption{font:12px monospace;color:#a0968a;padding:4px 0}
</style></head><body><div class="g">${cells}</div></body></html>`
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: cols * (cell + 12) + 12, height: 400 } })
await page.setContent(html)
await page.waitForTimeout(200)
await page.screenshot({ path: opts.out || '/tmp/sheet.png', fullPage: true })
await browser.close()
console.log('saved', opts.out || '/tmp/sheet.png', `${files.length} files`)
