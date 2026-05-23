/**
 * Roda tudo que dá para automatizar no Windows (sem US$ 99).
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(label, args) {
  console.log(`\n▶ ${label}`)
  const r = spawnSync(npm, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('URL scheme Google', ['run', 'ios:inject-google-scheme'])

const team = spawnSync(process.execPath, ['scripts/ios-apply-team-id.mjs'], {
  cwd: root,
  stdio: 'inherit'
})
if (team.status !== 0) {
  console.log(
    '\n○ Team ID: adicione APPLE_TEAM_ID=XXXXXXXXXX no .env e rode npm run ios:apply-team-id'
  )
}

run('Build + sync iOS', ['run', 'ios:sync'])
run('Status', ['run', 'ios:free-status'])
