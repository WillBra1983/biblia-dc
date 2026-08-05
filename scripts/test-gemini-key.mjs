/** Testa somente o secret Gemini mantido nas Cloud Functions. */
import { execSync } from 'child_process'

async function testarChave(key) {
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Responda apenas: OK' }] }],
      generationConfig: { maxOutputTokens: 16 }
    })
  })
  const data = await res.json().catch(() => ({}))
  console.log('SERVER | status', res.status, '|', data?.error?.message || data?.candidates?.[0]?.content?.parts?.[0]?.text || '(sem texto)')
}

let serverKey = ''
try {
  serverKey = execSync('npx firebase-tools functions:secrets:access GEMINI_API_KEY --project biblia-dc', {
    encoding: 'utf8'
  }).trim()
} catch (error) {
  console.error('Não foi possível ler GEMINI_API_KEY:', error.message)
  process.exit(1)
}

console.log('\n--- Secret Gemini do servidor ---')
console.log(serverKey ? `Configurado (${serverKey.length} caracteres)` : 'Não configurado')
if (serverKey) await testarChave(serverKey)
