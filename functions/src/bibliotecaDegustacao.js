function politicaLivro(livro = {}) {
  const modo = livro.degustacao?.modo === 'tempo' ? 'tempo' : 'percentual'
  return {
    modo,
    inicioEm: Math.max(0, Number(livro.degustacao?.inicioEm) || 0),
    fimEm: Math.max(0, Number(livro.degustacao?.fimEm) || 0),
    percentual: Math.max(1, Math.min(99, Number(livro.degustacao?.percentual) || 10)),
    downloadPermitido: livro.downloadPermitido === true,
  }
}

function decidirArquivo({ livro, finalidade, ehAdmin, comprado, download = false, agora }) {
  const politica = politicaLivro(livro)
  if (download && !ehAdmin && (!comprado || !politica.downloadPermitido)) return { erro: 'Este livro está disponível somente para leitura no sistema.' }
  if (ehAdmin || comprado) return { finalidade: download || (finalidade === 'amostra' && politica.modo !== 'amostra') ? 'completo' : finalidade }
  if (livro.publicado === false || livro.excluido) return { erro: 'Este livro não está disponível.' }
  if (finalidade === 'completo') return { erro: 'Seu acesso a este livro ainda não foi liberado.' }
  if (politica.modo === 'percentual') return { finalidade: 'completo', gerarAmostra: true, degustacao: politica }
  if (politica.modo !== 'tempo') return { finalidade: 'amostra', degustacao: politica }
  const acessoAte = politica.fimEm
  if (agora < politica.inicioEm) return { erro: 'A promoção de leitura gratuita ainda não começou.' }
  if (!acessoAte || agora >= acessoAte) return { erro: 'O período gratuito terminou. Compre para continuar a leitura.' }
  return { finalidade: 'completo', acessoAte, degustacao: politica }
}

module.exports = { politicaLivro, decidirArquivo }
