import { readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

/**
 * Inline de CSS crítico no `index.html` após o build (Beasties — fork moderno
 * do Critters, compatível com o pipeline Vite / Node recente).
 */
export function salvationBeastiesPlugin() {
  let outDir = ''
  let base = '/'

  return {
    name: 'salvation-beasties-inline',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      base = config.base || '/'
    },
    async closeBundle() {
      try {
        const indexPath = join(outDir, 'index.html')
        let html = readFileSync(indexPath, 'utf-8')
        const { default: Beasties } = await import('beasties')
        const beasties = new Beasties({
          path: outDir,
          publicPath: base,
          pruneSource: false,
          preload: 'swap',
          logLevel: 'warn'
        })
        html = await beasties.process(html)
        writeFileSync(indexPath, html, 'utf-8')
      } catch (e) {
        console.warn('[salvation-beasties]', e?.message || e)
      }
    }
  }
}
