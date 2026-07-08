/**
 * npm install interrompido no Windows pode deixar @popperjs/core sem lib/modifiers.
 * Verifica e reinstala só esse pacote quando necessário.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const marker = path.join(root, 'node_modules', '@popperjs', 'core', 'lib', 'modifiers', 'index.js')

if (fs.existsSync(marker)) {
  process.exit(0)
}

console.warn('[verify-popperjs] @popperjs/core incompleto — reinstalando…')
execSync('npm install @popperjs/core@2.11.8 --no-save --no-audit --no-fund', {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (!fs.existsSync(marker)) {
  console.error('[verify-popperjs] Falha: lib/modifiers ainda ausente. Apague node_modules e rode npm install.')
  process.exit(1)
}

console.log('[verify-popperjs] OK')
