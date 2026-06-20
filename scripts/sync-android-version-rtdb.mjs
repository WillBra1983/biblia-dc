/**
 * Registra a versão do build local (Gradle) no RTDB — **sem** alterar versaoAtual
 * que o app usa para avisar usuários (essa vem da Play Store / admin após publicar).
 *
 * Assim você pode rodar junto com android:build antes de subir o AAB na Play Console
 * sem bloquear quem acabou de baixar o app na loja.
 *
 * Requer:
 * - npx firebase-tools (devDependency do projeto)
 * - firebase login com conta admin no RTDB
 *
 * Uso: npm run sync:android-version
 * Após publicar na Play: botão admin «Sincronizar Android com Google Play» ou cron 12h.
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gradlePath = join(root, 'android', 'app', 'build.gradle')

function lerVersaoGradle() {
  const gradle = readFileSync(gradlePath, 'utf8')
  const versionName = gradle.match(/versionName\s+"([^"]+)"/)?.[1]?.trim()
  const versionCodeRaw = gradle.match(/versionCode\s+(\d+)/)?.[1]
  const versionCode = versionCodeRaw ? Number(versionCodeRaw) : null

  if (!versionName) {
    throw new Error(`versionName não encontrado em ${gradlePath}`)
  }
  return { versionName, versionCode }
}

function explicarErro(texto) {
  const t = String(texto || '')
  if (/PERMISSION_DENIED|permission.denied/i.test(t)) {
    console.error(
      '\nPermissão negada: a conta do `firebase login` precisa ser admin no RTDB\n' +
        '(users/{seu-uid}/admin = true). Alternativa: Admin → Enviar aviso → versão Android manual.'
    )
    return
  }
  if (/not logged in|login/i.test(t)) {
    console.error('\nExecute: npx firebase-tools login')
    return
  }
  if (/Unexpected error while setting data/i.test(t)) {
    console.error(
      '\nFalha ao enviar JSON (comum no Windows com --data inline). ' +
        'Este script usa arquivo temporário; se persistir, confira firebase login e flag admin.'
    )
  }
}

function main() {
  const { versionName, versionCode } = lerVersaoGradle()
  const payload = {
    versaoBuild: versionName,
    buildRegistradoEm: Date.now(),
    origemBuild: 'build-gradle',
    urlLoja: 'https://play.google.com/store/apps/details?id=com.bibliadc.app',
  }
  if (Number.isFinite(versionCode)) {
    payload.versionCodeBuild = versionCode
  }

  const tmpFile = join(tmpdir(), `biblia-dc-rtdb-${randomBytes(6).toString('hex')}.json`)
  writeFileSync(tmpFile, JSON.stringify(payload), 'utf8')

  try {
    const r = spawnSync(
      'npx',
      [
        'firebase-tools',
        'database:update',
        '/appConfig/lojaVersao/android',
        tmpFile,
        '--project',
        'biblia-dc',
        '--force',
      ],
      { cwd: root, encoding: 'utf8', shell: true }
    )

    const saida = [r.stdout, r.stderr].filter(Boolean).join('\n').trim()
    if (r.status !== 0) {
      console.error(saida || 'firebase database:update falhou')
      explicarErro(saida)
      process.exit(1)
    }

    if (saida) console.log(saida)
    console.log(
      `RTDB: build registrado versaoBuild=${versionName}` +
        `${versionCode ? ` (code ${versionCode})` : ''}. ` +
        `versaoAtual da loja NÃO foi alterada — após publicar na Play, use o botão admin ou aguarde o cron.`
    )
  } finally {
    try {
      unlinkSync(tmpFile)
    } catch {
      /* ignore */
    }
  }
}

main()
