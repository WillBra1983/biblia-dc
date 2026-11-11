// IDs novos separam os questionários revisados das respostas das antigas páginas.
const PAGINAS_VIDA_LEGADAS = { 1: 101, 2: 101, 3: 102, 4: 102, 5: 103, 6: 103, 7: 104, 8: 104 }

export function resolverLicaoDiscipulado(temaId, estudoId) {
  if (estudoId == null || estudoId === '') return null
  const numero = Number(estudoId)
  const id = Number.isFinite(numero) ? numero : estudoId
  return Number(temaId) === 4 ? (PAGINAS_VIDA_LEGADAS[id] ?? id) : id
}

export function rotuloModuloDiscipulado(temas, temaId) {
  const indice = temas.findIndex((tema) => tema.id === Number(temaId))
  return indice <= 0 ? 'Abertura' : `Módulo ${indice}`
}

export function buscarLicoesDiscipulado(temas, busca) {
  const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const consulta = normalizar(busca)
  const moduloBuscado = consulta.match(/\bmodulo\s+(\d+)\b/)?.[1]
  const licaoBuscada = consulta.match(/\blicao\s+(\d+)\b/)?.[1]
  const termos = consulta.replace(/\b(?:modulo|licao)\s+\d+\b/g, '').split(/\s+/).filter(Boolean)
  return temas.flatMap((tema) => (tema.estudos || []).filter((estudo) => !estudo.oculto).map((estudo, indice) => ({
    tema, estudo, numero: indice + 1,
    rotulo: rotuloModuloDiscipulado(temas, tema.id),
  }))).filter(({ tema, estudo, numero, rotulo }) => {
    if (moduloBuscado && normalizar(rotulo) !== `modulo ${Number(moduloBuscado)}`) return false
    if (licaoBuscada && numero !== Number(licaoBuscada)) return false
    const texto = normalizar(`${rotulo} ${tema.titulo} Lição ${numero} ${estudo.titulo}`)
    return termos.every((termo) => texto.includes(termo))
  })
}
