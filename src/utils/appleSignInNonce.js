/** Nonce para Sign in with Apple + Firebase (SHA-256 do raw nonce enviado à Apple). */

function randomString(length = 32) {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._'
  let out = ''
  const random = new Uint8Array(length)
  crypto.getRandomValues(random)
  for (let i = 0; i < length; i++) {
    out += charset[random[i] % charset.length]
  }
  return out
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function criarNonceAppleSignIn() {
  const rawNonce = randomString(32)
  const data = new TextEncoder().encode(rawNonce)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashedNonce = bufferToHex(hashBuffer)
  return { rawNonce, hashedNonce }
}
