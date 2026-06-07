/**
 * Lê versionName/versionCode de android/app/build.gradle e grava no RTDB.
 * Use após subir o versionCode e antes/depois de publicar na Play Store.
 *
 * Requer: firebase login (ou GOOGLE_APPLICATION_CREDENTIALS com acesso ao RTDB).
 *
 * Uso: npm run sync:android-version
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

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

function main() {
  const { versionName, versionCode } = lerVersaoGradle()
  const payload = {
    versaoAtual: versionName,
    sincronizadoEm: Date.now(),
    origem: 'build-gradle',
    urlLoja: 'https://play.google.com/store/apps/details?id=com.bibliadc.app',
  }
  if (Number.isFinite(versionCode)) {
    payload.versionCode = versionCode
  }

  const dataJson = JSON.stringify(payload)
  const r = spawnSync(
    'firebase',
    [
      'database:update',
      '/appConfig/lojaVersao/android',
      '--project',
      'biblia-dc',
      '--data',
      dataJson,
      '--force',
    ],
    { cwd: root, encoding: 'utf8', shell: true }
  )

  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || 'firebase database:update falhou')
    console.error('\nCertifique-se de estar logado: firebase login')
    process.exit(1)
  }

  console.log(`RTDB atualizado: Android versaoAtual=${versionName}${versionCode ? ` (code ${versionCode})` : ''}`)
}

main()
