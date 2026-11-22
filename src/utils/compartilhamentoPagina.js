let contexto = null
const caminho = valor => String(valor || '/').replace(/\/+$/, '') || '/'

export function registrarCompartilhamentoPagina({ pathname, title, text, url }) {
  if (!url) return undefined
  const dono = Symbol('pagina')
  contexto = { dono, pathname: caminho(pathname), title, text, url }
  return () => { if (contexto?.dono === dono) contexto = null }
}

export function obterCompartilhamentoPagina(pathname) {
  if (!contexto || contexto.pathname !== caminho(pathname)) return null
  const { dono, ...dados } = contexto
  return dados
}
