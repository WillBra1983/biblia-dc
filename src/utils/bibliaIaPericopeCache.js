import { sufixoChaveCacheTom } from './iaTonalidade'
import { sufixoTraducaoEstudo, validarTraducaoEstudo } from './estudoTraducao'
const PREFIXO_CACHE_LOCAL = 'salvation-ia-pericope:'

function chaveCachePericope(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  return `${PREFIXO_CACHE_LOCAL}${Number(livroId) || 0}:${Number(capitulo) || 0}:${Number(inicio) || 0}:${Number(fim) || 0}${sufixoChaveCacheTom(tom)}${sufixoTraducaoEstudo(versaoBiblica)}`
}
export function lerCachePericope(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  try {
    const raw = localStorage.getItem(chaveCachePericope(livroId, capitulo, inicio, fim, tom, versaoBiblica))
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p.texto !== 'string' || !p.texto.trim()) return null
    return p
  } catch (_) {
    return null
  }
}
function gravarCachePericope(livroId, capitulo, inicio, fim, payload, tom, versaoBiblica) {
  try {
    localStorage.setItem(
      chaveCachePericope(livroId, capitulo, inicio, fim, tom, versaoBiblica),
      JSON.stringify({ ...payload, versaoBiblica })
    )
  } catch (_) { /* ignore */ }
}
function apagarCachePericope(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  try {
    localStorage.removeItem(chaveCachePericope(livroId, capitulo, inicio, fim, tom, versaoBiblica))
  } catch (_) { /* ignore */ }
}

export function criarCachePericopePorTraducao(id, { legadoAra = false } = {}) {
  const versao = validarTraducaoEstudo(id).id
  const chaveVersao = legadoAra && versao === 'ara' ? undefined : versao
  return {
    lerCachePericope: (livro, cap, ini, fim, tom) => lerCachePericope(livro, cap, ini, fim, tom, chaveVersao),
    apagarCachePericope: (livro, cap, ini, fim, tom) => apagarCachePericope(livro, cap, ini, fim, tom, chaveVersao),
    gravarCachePericope: (livro, cap, ini, fim, dados, tom) => gravarCachePericope(livro, cap, ini, fim, dados, tom, versao),
  }
}
