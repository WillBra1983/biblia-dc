/** Valores padrão quando a página ainda não tem preferências gravadas. */
export const DEFAULT_LEITURA = {
  fontSize: 100,
  textAlign: 'left',
  fontFamily: 'system',
  /** 120–220 (×0.01 = line-height CSS); padrão 1.5 */
  lineHeight: 150,
  /** Só efeito na leitura de versículos: remove margem extra entre versículos (Bíblia / plano na Bíblia). */
  semEspacoEntreVersiculos: false,
}

/**
 * Overrides de padrão por seção (quando o usuário ainda não configurou nada).
 * Útil para começar a Bíblia em zoom mais confortável de leitura, mantendo
 * 100% para fluxos onde os textos já são naturalmente maiores (chat, hub).
 */
const DEFAULT_LEITURA_POR_PAGINA = {
  biblia: { lineHeight: 150, semEspacoEntreVersiculos: true },
  'plano-leitura-biblia': { lineHeight: 150, semEspacoEntreVersiculos: true },
  'estudo-strong-resumo': { textAlign: 'justify' },
  'biblia-apresentacao': { textAlign: 'justify' },
}

/**
 * Chave estável por “janela” da app — cada seção tem leitura independente (zoom, entrelinhas, alinhamento, fonte).
 * O tema claro/escuro continua global no AppContext.
 */
export function getLeituraPaginaKey(pathname) {
  if (!pathname) return 'outros'
  const p = pathname.replace(/\/$/, '') || '/'
  if (p === '/' || p === '/biblia') return 'biblia'
  if (p.startsWith('/plano-leitura-biblia')) return 'plano-leitura-biblia'
  if (p.startsWith('/plano')) return 'plano'
  if (p.startsWith('/discipulado')) return 'discipulado'
  if (p.startsWith('/hinario-editor')) return 'hinario-editor'
  if (p.startsWith('/hinario')) return 'hinario'
  if (p.startsWith('/confissao')) return 'confissao'
  if (p.startsWith('/catecismo-maior')) return 'catecismo-maior'
  if (p.startsWith('/catecismo-breve')) return 'catecismo-breve'
  if (p.startsWith('/devocional')) return 'devocional'
  if (p.startsWith('/mais-de-deus')) return 'mais-de-deus'
  if (p.startsWith('/youtube')) return 'youtube'
  if (p.startsWith('/versiculos-marcados')) return 'versiculos-marcados'
  if (p.startsWith('/quiz-retiro')) return 'quiz-retiro'
  if (p.startsWith('/chat')) return 'chat'
  /** Mesmas preferências de zoom/fonte/entrelinhas da leitura bíblica. */
  if (p.startsWith('/estudos-biblicos/ia-passagem') || p.startsWith('/estudos-biblicos/ia-pericope')) {
    return 'biblia'
  }
  if (p.startsWith('/estudos-biblicos')) return 'estudos-biblicos'
  if (p.startsWith('/biblia/apresentacao')) return 'biblia-apresentacao'
  if (/\/estudo-strong\/[^/]+\/resumo$/.test(p)) return 'estudo-strong-resumo'
  if (p.startsWith('/estudo-strong')) return 'estudo-strong'
  return 'outros'
}

/**
 * Mescla as preferências gravadas (`pageSlice`) com os padrões:
 *   gravado > override por seção > DEFAULT_LEITURA
 *
 * Quando o usuário muda algo no slider de configuração, isso vira gravado e
 * passa a ter prioridade — o override por seção só serve como "ponto de
 * partida" no primeiro uso (ex.: Bíblia começa em 100% e entrelinhas 1,50).
 */
export function mergeLeituraPagina(pageSlice, pageKey = null) {
  const overrides = (pageKey && DEFAULT_LEITURA_POR_PAGINA[pageKey]) || {}
  return {
    fontSize:
      pageSlice?.fontSize ?? overrides.fontSize ?? DEFAULT_LEITURA.fontSize,
    textAlign:
      pageSlice?.textAlign ?? overrides.textAlign ?? DEFAULT_LEITURA.textAlign,
    fontFamily:
      pageSlice?.fontFamily ?? overrides.fontFamily ?? DEFAULT_LEITURA.fontFamily,
    lineHeight:
      pageSlice?.lineHeight ?? overrides.lineHeight ?? DEFAULT_LEITURA.lineHeight,
    semEspacoEntreVersiculos:
      pageSlice?.semEspacoEntreVersiculos === true
        ? true
        : overrides.semEspacoEntreVersiculos ?? DEFAULT_LEITURA.semEspacoEntreVersiculos,
  }
}
