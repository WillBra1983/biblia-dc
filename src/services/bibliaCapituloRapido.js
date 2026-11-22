import { versaoBiblicaPorId } from '../data/bibliaVersoes'
import { obterVersaoBiblica } from '../utils/bibliaVersionStore'

const CHAVE = 'salvation:ultimo-capitulo:v1'

/** Cache de um único capítulo lido do SQLite, sem outro acervo no pacote. */
export function guardarCapituloConsultado(versao, livroId, capitulo, versiculos, pericopes) {
  if (!versao || !Array.isArray(versiculos) || !versiculos.length || !Array.isArray(pericopes)) return
  try {
    const atual = JSON.parse(localStorage.getItem('ultimaLeitura') || 'null')
    if (obterVersaoBiblica() !== versao.id || atual?.livroId !== Number(livroId) || atual?.capitulo !== Number(capitulo)) return
    localStorage.setItem(CHAVE, JSON.stringify({
      schema: 1, versao: versao.id, revisao: versao.revisao,
      livroId: Number(livroId), capitulo: Number(capitulo), versiculos, pericopes,
    }))
  } catch { /* Cache cheio ou indisponível não impede a leitura do banco. */ }
}

export function obterCapituloRapido(versao, livroId, capitulo) {
  try {
    const data = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (!data || !versao || data.schema !== 1 || data.versao !== versao.id || data.revisao !== versao.revisao ||
        data.livroId !== Number(livroId) || data.capitulo !== Number(capitulo) ||
        !Array.isArray(data.versiculos) || !data.versiculos.length || !Array.isArray(data.pericopes) ||
        !data.versiculos.every(v => typeof v.texto === 'string' && Number.isInteger(v.numero) && v.numero > 0 && Number.isInteger(v.numeroFim) && v.numeroFim >= v.numero)) return Promise.resolve(null)
    return Promise.resolve(data)
  } catch { return Promise.resolve(null) }
}

export function preaquecerCapituloInicial(versaoId = obterVersaoBiblica()) {
  let livroId = 1, capitulo = 1
  try {
    const salvo = JSON.parse(localStorage.getItem('ultimaLeitura') || 'null')
    if (salvo?.livroId > 0 && salvo?.capitulo > 0) ({ livroId, capitulo } = salvo)
    const query = new URLSearchParams(window.location.search)
    const livroQ = Number(query.get('livro')), capQ = Number(query.get('capitulo') ?? query.get('cap'))
    if (livroQ > 0 && capQ > 0) { livroId = livroQ; capitulo = capQ }
  } catch { /* Gênesis 1 na primeira abertura. */ }
  return obterCapituloRapido(versaoBiblicaPorId(versaoId), livroId, capitulo)
}
