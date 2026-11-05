import { compraPixDisponivel } from './disponibilidadeLivro.js'

const comparadorTitulo = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export function dataCadastroLivro(livro) {
  if (livro.criadoEm > 0) return livro.criadoEm
  const primeiroArquivo = Math.min(...[livro.arquivos?.completo, ...Object.values(livro.arquivos?.formatos || {})]
    .map(arquivo => Number(arquivo?.atualizadoEm))
    .filter(data => Number.isFinite(data) && data > 0))
  return Number.isFinite(primeiroArquivo) ? primeiroArquivo : Number(livro.atualizadoEm) || 0
}

export function ordenarLivros(livros, ordem, votos = {}) {
  if (ordem === 'padrao') return livros
  const alfabetica = (a, b) => comparadorTitulo.compare(a.titulo, b.titulo) || comparadorTitulo.compare(a.id, b.id)
  const compararValor = (a, b, direcao) => {
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    return (a - b) * direcao
  }
  const precoPix = livro => compraPixDisponivel(livro) ? Number(livro.precoPixCentavos) : 0
  const criterios = {
    recentes: (a, b) => compararValor(dataCadastroLivro(a), dataCadastroLivro(b), -1),
    antigos: (a, b) => compararValor(dataCadastroLivro(a), dataCadastroLivro(b), 1),
    menorPreco: (a, b) => compararValor(precoPix(a), precoPix(b), 1),
    maiorPreco: (a, b) => compararValor(precoPix(a), precoPix(b), -1),
    alfabetica: () => 0,
    alfabeticaInversa: (a, b) => alfabetica(b, a),
    votos: (a, b) => (votos[b.id]?.total || 0) - (votos[a.id]?.total || 0),
  }
  const comparar = criterios[ordem]
  return comparar ? [...livros].sort((a, b) => comparar(a, b) || alfabetica(a, b)) : livros
}
