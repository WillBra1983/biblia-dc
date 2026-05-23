import { preloadPlanoRankingIcon } from './planoEscadaImagens'

/**
 * Prefetch dos chunks das rotas secundárias.
 * Cada função `import()` é a mesma usada em `lazy(() => import(...))` no App.jsx,
 * então acionar aqui aquece o cache do bundler e o navegador puxa o chunk
 * em paralelo — sem bloquear a UI.
 *
 * Uso típico: chamar `prefetchRota('chat')` quando o usuário foca/abre o menu
 * principal, antes mesmo de tocar no link.
 */

const importers = {
  chat: () => import('../pages/Chat'),
  discipulado: () => import('../pages/Discipulado'),
  hinario: () => import('../pages/Hinario'),
  hinarioEditor: () => import('../pages/HinarioEditor'),
  confissao: () => import('../pages/Confissao'),
  catecismoMaior: () => import('../pages/CatecismoMaior'),
  catecismoBreve: () => import('../pages/CatecismoBreve'),
  devocional: () => import('../pages/Devocional'),
  planoLeitura: () => import('../pages/PlanoLeitura'),
  planoLeituraBiblia: () => import('../pages/PlanoLeituraBiblia'),
  maisDeDeus: () => import('../pages/MaisDeDeus'),
  youtube: () => import('../pages/YouTube'),
  versiculosMarcados: () => import('../pages/VersiculosMarcados'),
  quizRetiro: () => import('../pages/QuizRetiro'),
  estudosBiblicosHub: () => import('../pages/EstudosBiblicosHub'),
  estudoBiblicoEditor: () => import('../pages/EstudoBiblicoEditor'),
  estudoBiblicoVer: () => import('../pages/EstudoBiblicoVer'),
  estudosBiblicosGerir: () => import('../pages/EstudosBiblicosGerir'),
  estudoBiblicoProvaResultado: () => import('../pages/EstudoBiblicoProvaResultado'),
  strongEstudo: () => import('../pages/StrongEstudo'),
  strongEstudoResumo: () => import('../pages/StrongEstudoResumo'),
  sobre: () => import('../pages/Sobre')
}

const carregadas = new Set()

export function prefetchRota(nome) {
  const fn = importers[nome]
  if (!fn || carregadas.has(nome)) return
  carregadas.add(nome)
  if (nome === 'planoLeitura' || nome === 'planoLeituraBiblia') {
    void preloadPlanoRankingIcon().catch(() => {})
  }
  try {
    fn().catch(() => carregadas.delete(nome))
  } catch {
    carregadas.delete(nome)
  }
}

/** Atalho para prefetar várias rotas (ex.: ao abrir o menu principal). */
export function prefetchRotasComuns() {
  if (typeof window === 'undefined') return
  const run = () => {
    prefetchRota('chat')
    prefetchRota('discipulado')
    prefetchRota('versiculosMarcados')
    prefetchRota('planoLeitura')
    prefetchRota('planoLeituraBiblia')
    prefetchRota('estudosBiblicosHub')
  }
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 1500 })
  } else {
    window.setTimeout(run, 200)
  }
}
