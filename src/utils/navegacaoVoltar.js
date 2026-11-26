/** Retornos internos explícitos também funcionam ao abrir uma página por convite. */
export function destinoVoltarApp(pathname = '/', search = '') {
  const path = pathname.replace(/\/$/, '') || '/'
  const params = new URLSearchParams(search)
  const route = (to, label = 'Voltar') => ({ to, label })
  if (path === '/' || path === '/biblia') return null
  if (path.startsWith('/plano-leitura-biblia')) return route('/', 'Voltar à Bíblia')
  const disc = /^\/discipulado\/([^/]+)(?:\/[^/]+)?$/.exec(path)
  if (disc) return route(`/discipulado?modulo=${encodeURIComponent(disc[1])}`, 'Voltar às lições do módulo')
  if (path === '/discipulado' && params.has('modulo')) return route('/discipulado', 'Voltar aos módulos')
  const strong = /^(\/estudo-strong\/[^/]+)\/(?:resumo|ocorrencias)$/.exec(path)
  if (strong) return route(strong[1], 'Voltar ao estudo Strong')
  if (path.startsWith('/estudo-strong/')) {
    if (params.get('origem') === 'consulta') {
      params.delete('origem')
      const search = params.toString()
      return route(`/estudo-strong${search ? `?${search}` : ''}`, 'Voltar à pesquisa Strong')
    }
    return route('/', 'Voltar à Bíblia')
  }
  if (path.startsWith('/devocional/')) return route('/devocional', 'Voltar aos devocionais')
  if (path.startsWith('/biblioteca/pessoal/')) return route('/biblioteca', 'Voltar à livraria')
  const livro = /^(\/biblioteca\/[^/]+)\/(?:ler|amostra)$/.exec(path)
  if (livro) return route(livro[1], 'Voltar ao livro')
  if (path.startsWith('/biblioteca/') || path.startsWith('/compartilhar/livro/')) return route('/biblioteca', 'Voltar à livraria')
  if (/^\/estudos-biblicos\/ia-/.test(path)) return route('/biblioteca-estudos', 'Voltar aos comentários bíblicos')
  const edit = /^(\/estudos-biblicos\/[^/]+)\/edit$/.exec(path)
  if (edit) return route(edit[1], 'Voltar ao estudo')
  if (path.startsWith('/estudos-biblicos/')) return route('/estudos-biblicos', 'Voltar aos estudos')
  if (path === '/hinario-editor') return route('/hinario/outras-cancoes', 'Voltar às canções')
  if (path === '/configuracoes/notificacoes') return route('/configuracoes', 'Voltar às configurações')
  return { menu: true, label: 'Voltar ao menu principal' }
}

export function caminhoSemTelaCheia(location) {
  const params = new URLSearchParams(location.search)
  params.delete('telaCheia')
  const search = params.toString()
  return `${location.pathname}${search ? `?${search}` : ''}${location.hash || ''}`
}
