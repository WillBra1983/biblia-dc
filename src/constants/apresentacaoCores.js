/** Cores da letra no modo apresentação (Bíblia e hinário). */
export const CORES_APRESENTACAO_LEITURA = [
  { cor: '#000000', corLivro: '#ffffff', label: 'Preto' },
  { cor: '#ffffff', corLivro: '#000000', label: 'Branco' },
  { cor: '#ffeb3b', corLivro: '#ffffff', label: 'Amarelo' },
]

export const COR_APRESENTACAO_PADRAO = '#ffffff'

const COR_PRETO = '#000000'

export function corApresentacaoValida(cor) {
  return CORES_APRESENTACAO_LEITURA.some((c) => c.cor.toLowerCase() === String(cor || '').toLowerCase())
}

/** Texto/título da perícope usam `cor`; referência do livro usa `corLivro` do mesmo tema. */
export function resolverParCoresApresentacao(corEscolhida) {
  const normalizada = String(corEscolhida || COR_APRESENTACAO_PADRAO).toLowerCase()
  const tema =
    CORES_APRESENTACAO_LEITURA.find((c) => c.cor.toLowerCase() === normalizada) ||
    CORES_APRESENTACAO_LEITURA.find((c) => c.cor === COR_APRESENTACAO_PADRAO) ||
    CORES_APRESENTACAO_LEITURA[1]

  return {
    corTexto: tema.cor,
    corTitulo: tema.cor,
    corLivro: tema.corLivro,
  }
}

/** Peso da fonte no slide: normal 400, negrito 700 (evita 600→700 quase igual). */
export function pesoFonteApresentacao(negrito, papel = 'texto') {
  if (negrito) {
    if (papel === 'numero') return 800
    if (papel === 'livro') return 700
    return 700
  }
  if (papel === 'numero') return 600
  if (papel === 'livro') return 500
  return 400
}

/** Sombra esfumaçada branca quando a cor é preta (contraste no fundo verde). */
export function estiloSombraApresentacao(cor) {
  if (String(cor || '').toLowerCase() === COR_PRETO) {
    return {
      textShadow:
        '0 0 10px rgba(255,255,255,0.9), 0 0 22px rgba(255,255,255,0.55), 0 1px 3px rgba(255,255,255,0.75)',
    }
  }
  return {}
}
