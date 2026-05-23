import md5 from 'md5'

/**
 * URL do Gravatar (foto opcional ligada ao e-mail).
 * @param {string} email
 * @param {number} size pixels (quadrado)
 * @returns {string|null} null se o e-mail for inválido
 */
export function gravatarPhotoUrl(email, size = 96) {
  const e = String(email ?? '')
    .trim()
    .toLowerCase()
  if (!e || !e.includes('@')) return null
  const hash = md5(e)
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=mp&r=pg`
}
