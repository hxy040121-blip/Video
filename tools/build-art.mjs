// 把 assets/art/portraits/*.svg 与 assets/art/sigils/*.svg 打包成 JS（file:// 下不能 fetch SVG）。
// 用法：node tools/build-art.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function squeeze(svg) {
  return svg
    .replace(/<\?xml[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function bundle(dir, globalName, out) {
  const abs = join(ROOT, dir)
  const map = {}
  if (existsSync(abs)) {
    for (const f of readdirSync(abs).filter(f => f.endsWith('.svg')).sort()) {
      map[basename(f, '.svg')] = squeeze(readFileSync(join(abs, f), 'utf8'))
    }
  }
  const js = `/* 由 tools/build-art.mjs 从 ${dir}/*.svg 生成，请勿手改 */\nwindow.${globalName} = ${JSON.stringify(map)};\n`
  writeFileSync(join(ROOT, out), js)
  console.log(`${globalName}: ${Object.keys(map).length} 张, ${(js.length / 1024).toFixed(0)} KB`)
}

bundle('assets/art/portraits', 'PORTRAITS', 'assets/data/portraits.js')
bundle('assets/art/sigils', 'SIGILS', 'assets/data/sigils.js')
