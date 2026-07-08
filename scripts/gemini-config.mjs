/**
 * Verifica se as três chaves Gemini (Web / Android / iOS) estão no .env.
 * Uso: npm run gemini:config
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')

const vars = [
  ['VITE_GEMINI_API_KEY_WEB', 'Gemini Web (referenciadores HTTP)'],
  ['VITE_GEMINI_API_KEY_ANDROID', 'Gemini Android (com.bibliadc.app + SHA-1)'],
  ['VITE_GEMINI_API_KEY_IOS', 'Gemini iOS (com.bibliadc.app)']
]

function lerValorEnv(texto, nome) {
  const re = new RegExp(`^${nome}=(.+)$`, 'm')
  const m = texto.match(re)
  if (!m) return ''
  return m[1].trim().replace(/^["']|["']$/g, '')
}

if (!fs.existsSync(envPath)) {
  console.error('\nArquivo .env não encontrado. Copie de .env.example e preencha as chaves.\n')
  process.exit(1)
}

const env = fs.readFileSync(envPath, 'utf8')
let explicitas = 0
let faltando = 0
const legado = lerValorEnv(env, 'VITE_GEMINI_API_KEY')
console.log('\n--- Chaves Gemini (.env) ---\n')

for (const [nome, desc] of vars) {
  const v = lerValorEnv(env, nome)
  if (v.length >= 8) {
    console.log(`✓ ${nome}`)
    explicitas++
  } else {
    console.log(`✗ ${nome} — falta (${desc})`)
    faltando++
  }
}

if (legado.length >= 8) {
  console.log(`\n○ VITE_GEMINI_API_KEY definida (fallback se faltar a da plataforma).`)
}

if (explicitas === 3) {
  console.log('\nPronto: web, Android e iOS usam chaves restritas no Google Cloud.')
  console.log(
    'Android (Capacitor): cadastre SHA-1 da Play App Signing + upload/debug na chave _ANDROID.'
  )
  console.log(
    '\nProdução (proxy): configure o secret GEMINI_API_KEY nas Cloud Functions e faça deploy:'
  )
  console.log('  npx firebase-tools functions:secrets:set GEMINI_API_KEY')
  console.log('  npm run deploy:functions')
  console.log('Builds PROD usam o proxy por padrão (VITE_GEMINI_USE_PROXY=1 implícito).\n')
  process.exit(0)
}
if (explicitas >= 1 || legado.length >= 8) {
  console.log(
    '\nPreencha as 3 variáveis _WEB, _ANDROID e _IOS (Credenciais → Exibir chave).\n' +
      'Com só VITE_GEMINI_API_KEY o APK pode falhar se a restrição for só Sites.\n'
  )
  process.exit(faltando > 0 ? 1 : 0)
}
console.log('\nNenhuma chave Gemini no .env. Copie de .env.example.\n')
process.exit(1)
