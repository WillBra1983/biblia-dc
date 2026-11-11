export const VERSOES_BIBLICAS = Object.freeze([
  { id: 'ara', sigla: 'ARA', nome: 'Almeida Revista e Atualizada', arquivo: 'ara.sqlite', revisao: 'ea17063b', bibleComId: 1608 },
  { id: 'naa', sigla: 'NAA', nome: 'Nova Almeida Atualizada', arquivo: 'bibles/naa.sqlite', revisao: 'd0e1731b322d', bibleComId: 1840 },
  { id: 'ntlh', sigla: 'NTLH', nome: 'Nova Tradução na Linguagem de Hoje', arquivo: 'bibles/ntlh.sqlite', revisao: 'f0392c45e7e7', bibleComId: 211 },
])

export function versaoBiblicaPorId(id) {
  return VERSOES_BIBLICAS.find(versao => versao.id === id) || null
}
