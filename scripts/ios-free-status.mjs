/**
 * Verifica o que já está pronto para iOS sem pagar os US$ 99 (só diagnóstico).
 * Uso: npm run ios:free-status
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const checks = []

function ok(msg) {
  checks.push({ ok: true, msg })
}
function falta(msg) {
  checks.push({ ok: false, msg })
}

if (fs.existsSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'))) {
  ok('Pasta ios/ do Capacitor presente')
} else {
  falta('Pasta ios/ ausente — rode: npx cap add ios')
}

const gs = path.join(root, 'ios/App/App/GoogleService-Info.plist')
if (fs.existsSync(gs)) {
  ok('GoogleService-Info.plist encontrado')
  const xml = fs.readFileSync(gs, 'utf8')
  if (xml.includes('REVERSED_CLIENT_ID')) {
    const info = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8')
    const rev = xml.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/i)?.[1]
    if (rev && info.includes(rev)) ok('URL scheme Google no Info.plist')
    else falta('Rode: npm run ios:inject-google-scheme')
  }
} else {
  falta('Baixe GoogleService-Info.plist do Firebase → ios/App/App/')
}

const capJson = fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8')
const iosClientMatch = capJson.match(/"iosClientId"\s*:\s*"([^"]+)"/)
if (iosClientMatch?.[1]?.includes('.apps.googleusercontent.com')) {
  ok('iosClientId em capacitor.config.json')
} else {
  falta('Adicione iosClientId em capacitor.config.json (OAuth iOS no Google Cloud)')
}

const aasa = fs.readFileSync(
  path.join(root, 'public/.well-known/apple-app-site-association'),
  'utf8'
)
if (aasa.includes('SUBSTITUA_TEAM_ID')) {
  falta('apple-app-site-association: substitua SUBSTITUA_TEAM_ID (grátis com Apple ID em developer.apple.com → Membership)')
} else {
  ok('Team ID preenchido no apple-app-site-association')
}

const env = fs.existsSync(path.join(root, '.env'))
if (env) ok('.env local presente (Firebase)')
else falta('.env ausente — copie de .env.example')

console.log('\n--- iOS (configuração gratuita) ---\n')
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '○'} ${c.msg}`)
}
const pendentes = checks.filter((c) => !c.ok).length
console.log(
  pendentes === 0
    ? '\nTudo que dá para preparar sem US$ 99 está OK. Próximo: push no GitHub para build no simulador (Actions).'
    : `\n${pendentes} item(ns) pendente(s). Guia: docs/IOS_GRATIS.md\n`
)
process.exit(pendentes > 0 ? 1 : 0)
