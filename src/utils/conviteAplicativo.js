export const LINK_DOWNLOAD_BIBLIA = 'https://us-central1-biblia-dc.cloudfunctions.net/baixarBiblia'

export function extrairCodigoConviteProjeto(texto) {
  const valor = String(texto || '').trim()
  if (/^[a-f0-9]{32}$/i.test(valor)) return valor.toLowerCase()
  try {
    const link = (valor.match(/https?:\/\/[^\s]+/i)?.[0] || valor).replace(/[).,;]+$/, '')
    const codigo = new URL(link).searchParams.get('convite') || ''
    return /^[a-f0-9]{32}$/i.test(codigo) ? codigo.toLowerCase() : ''
  } catch { return '' }
}

export function linkDownloadBiblia(codigo) {
  const url = new URL(LINK_DOWNLOAD_BIBLIA)
  const convite = extrairCodigoConviteProjeto(codigo)
  if (convite) url.searchParams.set('convite', convite)
  return url.href
}
