/**
 * Testa chaves Gemini (local .env vs secret Firebase).
 * Uso: node scripts/test-gemini-key.mjs
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function lerEnv(nome) {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return ''
  const env = fs.readFileSync(envPath, 'utf8')
  const re = new RegExp(`^${nome}=(.+)$`, 'm')
  const m = env.match(re)
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
}

async function testKey(label, key, opts = {}) {
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (opts.useHeaderKey) delete headers['Content-Type'] // keep content-type
  const fetchUrl = opts.useHeaderKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    : url
  if (opts.useHeaderKey) headers['x-goog-api-key'] = key

  const res = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Responda apenas: OK' }] }],
      generationConfig: { maxOutputTokens: 16 }
    })
  })
  const data = await res.json().catch(() => ({}))
  console.log(
    label,
    '| status', res.status,
    '|', data?.error?.message || data?.candidates?.[0]?.content?.parts?.[0]?.text || '(sem texto)'
  )
  if (!res.ok) console.log('  detail:', JSON.stringify(data?.error?.status || data?.error?.code || ''))
}

const webKey = lerEnv('VITE_GEMINI_API_KEY_WEB')
let serverKey = ''
try {
  serverKey = execSync('npx firebase-tools functions:secrets:access GEMINI_API_KEY --project biblia-dc', {
    encoding: 'utf8',
    cwd: root
  }).trim()
} catch (e) {
  console.error('Não foi possível ler GEMINI_API_KEY:', e.message)
}

console.log('\n--- Chaves ---')
console.log('WEB:', webKey ? `${webKey.slice(0, 6)}… (${webKey.length} chars)` : '(vazia)')
console.log('SERVER:', serverKey ? `${serverKey.slice(0, 6)}… (${serverKey.length} chars)` : '(vazia)')

console.log('\n--- Testes ---')
if (webKey) await testKey('WEB query ?key=', webKey)
if (serverKey) {
  await testKey('SERVER AQ query ?key=', serverKey)
  await testKey('SERVER AQ header x-goog-api-key', serverKey, { useHeaderKey: true })
  await testKey('SERVER AQ + newline (simula pipe PS)', `${serverKey}\n`)
}
