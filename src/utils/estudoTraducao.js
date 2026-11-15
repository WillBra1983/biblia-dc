import { versaoBiblicaPorId } from '../data/bibliaVersoes.js'

export const TRADUCAO_PADRAO_ESTUDO = 'ara'
export function validarTraducaoEstudo(id = TRADUCAO_PADRAO_ESTUDO) {
  const versao = versaoBiblicaPorId(id)
  if (!versao) throw new Error('Tradução do estudo não disponível.')
  return versao
}
export function sufixoTraducaoEstudo(id) {
  return id == null ? '' : '~biblia_' + validarTraducaoEstudo(id).id
}
export function idEstudoNaTraducao(id, versao) {
  return id + sufixoTraducaoEstudo(versao)
}
export function semTraducaoNoId(id) {
  return String(id || '').replace(/~biblia_(ara|naa|ntlh)$/, '')
}
