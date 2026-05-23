/**
 * Links para o leitor da Bíblia (rota `/`, `Biblia.jsx`), alinhados aos
 * parâmetros `livro`, `capitulo` e `versiculos` da query string.
 */

function normalizarListaVersiculos(versiculos) {
  if (!Array.isArray(versiculos)) return []
  return [
    ...new Set(
      versiculos
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  ].sort((a, b) => a - b)
}

/**
 * Monta o segmento de busca (`livro=…&capitulo=…&versiculos=…`) ou string vazia se inválido.
 *
 * @param {{ livroId?: number, capitulo?: number, versiculos?: number[] }} opts
 * @returns {string}
 */
export function montarSearchLeitorBiblia({ livroId, capitulo, versiculos } = {}) {
  const li = Number(livroId)
  const cap = Number(capitulo)
  if (!Number.isInteger(li) || li < 1 || !Number.isInteger(cap) || cap < 1) return ''
  const params = new URLSearchParams()
  params.set('livro', String(li))
  params.set('capitulo', String(cap))
  const vers = normalizarListaVersiculos(versiculos)
  if (vers.length) params.set('versiculos', vers.join(','))
  return params.toString()
}

/**
 * Caminho interno para `navigate()` / `<Link to={…}>` (compatível com HashRouter).
 *
 * @param {{ livroId?: number, capitulo?: number, versiculos?: number[] }} opts
 * @returns {string} ex.: `/?livro=43&capitulo=1&versiculos=1`
 */
export function urlLeitorBiblia(opts) {
  const s = montarSearchLeitorBiblia(opts)
  return s ? `/?${s}` : '/'
}
