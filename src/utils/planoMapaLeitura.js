/**
 * Mapa por blocos (AT/NT): atalhos para abrir leitura. A contagem do plano segue única (`capitulosLidos`).
 */

export const MAPA_BLOCOS_ORDEM = [
  { id: 'pentateuco', titulo: 'Pentateuco', livros: [1, 2, 3, 4, 5] },
  {
    id: 'historicos',
    titulo: 'Históricos',
    livros: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  },
  { id: 'poeticos', titulo: 'Poéticos', livros: [18, 19, 20, 21, 22] },
  {
    id: 'profeticos',
    titulo: 'Proféticos',
    livros: [
      23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    ],
  },
  { id: 'evangelhos', titulo: 'Evangelhos', livros: [40, 41, 42, 43] },
  { id: 'atos', titulo: 'Atos', livros: [44] },
  {
    id: 'paulinas',
    titulo: 'Paulinas',
    livros: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
  },
  {
    id: 'hebreus_cartas',
    titulo: 'Hebreus e cartas',
    livros: [58, 59, 60, 61, 62, 63, 64, 65],
  },
  { id: 'apocalipse', titulo: 'Apocalipse', livros: [66] },
]

function alcanceCapitulosNoPlano(livroPlano) {
  const from =
    livroPlano.inicioPlano != null && Number(livroPlano.inicioPlano) >= 1
      ? Number(livroPlano.inicioPlano)
      : 1
  const lim =
    livroPlano.fimPlano != null && Number(livroPlano.fimPlano) >= from
      ? Number(livroPlano.fimPlano)
      : Number(livroPlano.capitulos || 0)
  return { from, to: lim }
}

/**
 * Blocos que têm pelo menos um livro presente no template da instância.
 */
export function blocosVisiveisParaTemplate(template) {
  if (!template?.livros?.length) return []
  const ids = new Set(template.livros.map((l) => Number(l.id)))
  return MAPA_BLOCOS_ORDEM.filter((b) => b.livros.some((lid) => ids.has(lid)))
}

/**
 * Primeiro capítulo não lido do bloco; se o bloco estiver todo lido, primeiro capítulo válido do bloco.
 */
export function destinoMapaBloco(instancia, template, blocoId) {
  if (!instancia || !template?.livros?.length) return null
  const lidos = new Set(
    Array.isArray(instancia.capitulosLidos) ? instancia.capitulosLidos.map(String) : []
  )
  const bloco = MAPA_BLOCOS_ORDEM.find((b) => b.id === blocoId)
  if (!bloco) return null
  const livrosMap = new Map(template.livros.map((l) => [Number(l.id), l]))

  for (const lid of bloco.livros) {
    const livro = livrosMap.get(lid)
    if (!livro) continue
    const { from, to } = alcanceCapitulosNoPlano(livro)
    if (to < from) continue
    for (let c = from; c <= to; c++) {
      const key = `${lid}-${c}`
      if (!lidos.has(key)) return { livroId: lid, capitulo: c }
    }
  }

  for (const lid of bloco.livros) {
    const livro = livrosMap.get(lid)
    if (!livro) continue
    const { from, to } = alcanceCapitulosNoPlano(livro)
    if (to >= from) return { livroId: lid, capitulo: from }
  }

  return null
}
