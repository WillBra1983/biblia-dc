/**
 * Diagnóstico: o que falta para publicar na Apple (código local vs portais).
 * Uso: npm run ios:appstore-status
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
function aviso(msg) {
  checks.push({ ok: null, msg })
}

function lerEnv() {
  const p = path.join(root, '.env')
  if (!fs.existsSync(p)) return {}
  const out = {}
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const env = lerEnv()

// —— Código / projeto ——
if (fs.existsSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'))) {
  ok('Projeto Xcode (ios/) presente')
} else {
  falta('Pasta ios/ ausente')
}

const pbx = fs.existsSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'))
  ? fs.readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8')
  : ''
if (pbx.includes('MARKETING_VERSION = 1.5') && pbx.includes('CURRENT_PROJECT_VERSION = 6')) {
  ok('Versão iOS 1.5 (6) alinhada ao Android')
} else {
  aviso('Confira MARKETING_VERSION / CURRENT_PROJECT_VERSION no Xcode')
}

if (fs.existsSync(path.join(root, '.github/workflows/ios-appstore-release.yml'))) {
  ok('Workflow GitHub iOS App Store')
} else {
  falta('Workflow .github/workflows/ios-appstore-release.yml')
}

if (fs.existsSync(path.join(root, 'src/pages/Privacidade.jsx'))) {
  ok('Página de privacidade no app')
} else {
  falta('src/pages/Privacidade.jsx')
}

const ent = fs.readFileSync(path.join(root, 'ios/App/App/App.entitlements'), 'utf8')
if (ent.includes('com.apple.developer.applesignin')) ok('Entitlement Sign in with Apple')
else falta('Sign in with Apple em App.entitlements')

if (ent.includes('aps-environment') && ent.includes('production')) {
  ok('Push: aps-environment production')
} else {
  aviso('aps-environment deve ser production no release')
}

const aasa = fs.readFileSync(
  path.join(root, 'public/.well-known/apple-app-site-association'),
  'utf8'
)
if (aasa.includes('BDAN6452VU.com.bibliadc.app')) {
  ok('AASA com Team ID BDAN6452VU')
} else {
  falta('AASA: rode npm run ios:apply-team-id')
}

const cap = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'))
if (cap.plugins?.GoogleAuth?.iosClientId?.includes('.apps.googleusercontent.com')) {
  ok('iosClientId no capacitor.config.json')
} else {
  falta('iosClientId em capacitor.config.json')
}

const info = fs.readFileSync(path.join(root, 'ios/App/App/Info.plist'), 'utf8')
if (info.includes('ITSAppUsesNonExemptEncryption')) {
  ok('Info.plist: export compliance (criptografia)')
} else {
  aviso('ITSAppUsesNonExemptEncryption ausente no Info.plist')
}

// —— .env ——
if (env.APPLE_TEAM_ID === 'BDAN6452VU') ok('.env: APPLE_TEAM_ID')
else falta('.env: APPLE_TEAM_ID=BDAN6452VU')

ok('Gemini: chave protegida no servidor (Cloud Functions)')

if (env.VITE_FIREBASE_API_KEY?.startsWith('AIza')) ok('.env: Firebase web (build CI)')
else falta('.env: variáveis VITE_FIREBASE_*')

if (env.VITE_PRIVACY_POLICY_URL) ok('.env: URL privacidade')
else aviso('.env: defina VITE_PRIVACY_POLICY_URL (metadados / links)')

// —— Arquivos só no seu PC ——
const gs = path.join(root, 'ios/App/App/GoogleService-Info.plist')
if (fs.existsSync(gs)) {
  ok('GoogleService-Info.plist local (Firebase iOS)')
  const xml = fs.readFileSync(gs, 'utf8')
  const rev = xml.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/i)?.[1]
  if (rev && info.includes(rev)) ok('URL scheme Google ↔ plist')
  else falta('Rode: npm run ios:inject-google-scheme')
} else {
  falta('Baixe GoogleService-Info.plist → ios/App/App/ (Firebase Console, app iOS)')
}

// —— Só na Apple / GitHub (não dá para ver daqui) ——
console.log('\n=== Bíblia DC — status App Store (iOS) ===\n')
for (const c of checks) {
  const icon = c.ok === true ? '✓' : c.ok === false ? '○' : '·'
  console.log(`${icon} ${c.msg}`)
}

const pendentes = checks.filter((c) => c.ok === false).length
console.log('\n--- Fora do repositório (você faz) ---\n')
console.log('○ Certificado Apple Distribution (.p12) + perfil App Store')
console.log('○ Secrets no GitHub (lista: .github/APPLE_SECRETS_CHECKLIST.md)')
console.log('○ Firebase: provedor Apple ON + APNs .p8 (push)')
console.log('○ App Store Connect: app, screenshots, App Privacy, TestFlight')
console.log('\nGuias: docs/APPLE_PUBLICAR_AGORA.md · docs/GITHUB_IOS_APP_STORE.md\n')

if (pendentes === 0) {
  console.log('Código local: pronto. Próximo passo: plist Firebase + secrets GitHub + workflow.\n')
} else {
  console.log(`${pendentes} pendência(s) no projeto local.\n`)
}
process.exit(pendentes > 0 ? 1 : 0)
