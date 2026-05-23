const DIGITOS_SOBRESCRITOS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/**
 * Separa o número do versículo do corpo do texto (evita "1" + "¹ Palavra…").
 * Usa `numeroVersiculo` do banco como referência canônica para exibição.
 */
export function separarNumeroVersiculoDoTexto(texto, numeroVersiculo) {
  const numero = String(Number(numeroVersiculo) > 0 ? numeroVersiculo : 1)
  let resto = String(texto || '').trim()
  const prefixoVerso = new RegExp(`^\\s*(?:[0-9${DIGITOS_SOBRESCRITOS}]+\\s*)+`, 'u')
  resto = resto.replace(prefixoVerso, '').trim()
  return {
    numero,
    textoSemNumero: resto || String(texto || '').trim(),
  }
}

/** Blocos contínuos de versículos por perícope (inclui trecho sem título antes da 1ª). */
export function calcularBlocosPericopeCapitulo(pericopesCapitulo, totalVersiculos) {
  const total = Math.max(0, Number(totalVersiculos) || 0)
  if (total === 0) return []

  const ordenadas = [...(pericopesCapitulo || [])]
    .map((p) => ({
      titulo: String(p?.titulo || '').trim(),
      referencias: p?.referencias ? String(p.referencias).trim() : null,
      inicio: Number(p?.versiculo) || 0,
    }))
    .filter((p) => p.inicio >= 1 && p.titulo)
    .sort((a, b) => a.inicio - b.inicio)

  if (!ordenadas.length) {
    return [{ titulo: null, referencias: null, inicio: 1, fim: total }]
  }

  const blocos = []
  let cursor = 1

  ordenadas.forEach((atual, i) => {
    const proxima = ordenadas[i + 1]
    const fim = proxima
      ? Math.max(atual.inicio, proxima.inicio - 1)
      : Math.max(atual.inicio, total)

    if (cursor < atual.inicio) {
      blocos.push({
        titulo: null,
        referencias: null,
        inicio: cursor,
        fim: atual.inicio - 1,
      })
    }

    blocos.push({
      titulo: atual.titulo,
      referencias: atual.referencias,
      inicio: atual.inicio,
      fim,
    })
    cursor = fim + 1
  })

  if (cursor <= total) {
    blocos.push({
      titulo: null,
      referencias: null,
      inicio: cursor,
      fim: total,
    })
  }

  return blocos
}

/** Um slide por versículo (sem slides de título de perícope). */
export function montarSlidesModoVersiculo(resultados) {
  const slides = []
  ;(resultados || []).forEach((verso, index) => {
    const numeroVersiculo = verso.numero || index + 1
    const { numero, textoSemNumero } = separarNumeroVersiculoDoTexto(verso.texto, numeroVersiculo)

    slides.push({
      id: `versiculo-${numeroVersiculo}`,
      tipo: 'versiculo',
      label: `v. ${numeroVersiculo}`,
      versiculo: numeroVersiculo,
      numero,
      textoSemNumero,
      texto: verso.texto,
    })
  })
  return slides
}

/** Um slide por bloco de perícope (título + versículos do trecho). */
export function montarSlidesModoPericope(resultados, pericopesCapitulo = []) {
  const total = (resultados || []).length
  const blocos = calcularBlocosPericopeCapitulo(pericopesCapitulo, total)

  return blocos.map((bloco, bi) => {
    const versiculos = []
    for (let v = bloco.inicio; v <= bloco.fim; v++) {
      const verso = resultados[v - 1]
      if (!verso) continue
      const numeroVersiculo = verso.numero || v
      const { numero, textoSemNumero } = separarNumeroVersiculoDoTexto(verso.texto, numeroVersiculo)
      versiculos.push({
        versiculo: numeroVersiculo,
        numero,
        textoSemNumero,
        texto: verso.texto,
      })
    }

    const faixa =
      bloco.inicio === bloco.fim ? `v. ${bloco.inicio}` : `v. ${bloco.inicio}–${bloco.fim}`

    return {
      id: `pericope-bloco-${bloco.inicio}-${bloco.fim}-${bi}`,
      tipo: 'pericope-bloco',
      label: bloco.titulo || faixa,
      titulo: bloco.titulo,
      referencias: bloco.referencias,
      inicio: bloco.inicio,
      fim: bloco.fim,
      versiculos,
    }
  })
}

/** @deprecated use montarSlidesModoVersiculo */
export function montarSlidesApresentacaoCapitulo(resultados, pericopesPorVersiculo = {}) {
  return montarSlidesModoVersiculo(resultados)
}

export const MODO_BIBLIA_APRESENTACAO_PERICOPE = 'pericope'
export const MODO_BIBLIA_APRESENTACAO_VERSICULO = 'versiculo'
/** @deprecated */
export const MODO_BIBLIA_APRESENTACAO_CAPITULO = 'capitulo'
export const STORAGE_MODO_BIBLIA_APRESENTACAO = 'salvation-biblia-apresentacao-modo'

export function carregarModoBibliaApresentacao() {
  try {
    const v = localStorage.getItem(STORAGE_MODO_BIBLIA_APRESENTACAO)
    if (v === MODO_BIBLIA_APRESENTACAO_PERICOPE || v === MODO_BIBLIA_APRESENTACAO_CAPITULO) {
      return MODO_BIBLIA_APRESENTACAO_PERICOPE
    }
    return MODO_BIBLIA_APRESENTACAO_VERSICULO
  } catch {
    return MODO_BIBLIA_APRESENTACAO_VERSICULO
  }
}

export function gravarModoBibliaApresentacao(modo) {
  try {
    const gravar =
      modo === MODO_BIBLIA_APRESENTACAO_PERICOPE
        ? MODO_BIBLIA_APRESENTACAO_PERICOPE
        : MODO_BIBLIA_APRESENTACAO_VERSICULO
    localStorage.setItem(STORAGE_MODO_BIBLIA_APRESENTACAO, gravar)
  } catch {
    /* ignore */
  }
}
