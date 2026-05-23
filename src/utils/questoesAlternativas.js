import { shuffleArrayDeterministic } from './seededShuffle'

function indicePosicaoCorreta(alternativas) {
  return (alternativas || []).findIndex((a) => a?.correta)
}

/** Evita cadeia +1 ou -1 módulo n (ex.: 0→1→2→3→0). */
function continuaPadraoCiclico(historico, pos, n) {
  if (!historico.length || n < 2) return false
  const ultimo = historico[historico.length - 1]
  const proximoAsc = (ultimo + 1) % n
  const proximoDesc = (ultimo - 1 + n) % n
  if (pos !== proximoAsc && pos !== proximoDesc) return false

  if (historico.length >= 2) {
    const penultimo = historico[historico.length - 2]
    if (proximoAsc === (penultimo + 1) % n && pos === proximoAsc) return true
    if (proximoDesc === (penultimo - 1 + n) % n && pos === proximoDesc) return true
  }

  const janela = Math.min(n, historico.length)
  if (janela >= n - 1 && janela >= 2) {
    const slice = historico.slice(-janela)
    let asc = true
    let desc = true
    for (let i = 1; i < slice.length; i++) {
      if (slice[i] !== (slice[i - 1] + 1) % n) asc = false
      if (slice[i] !== (slice[i - 1] - 1 + n) % n) desc = false
    }
    if (asc && pos === proximoAsc) return true
    if (desc && pos === proximoDesc) return true
  }
  return false
}

function embaralharUmaLista(alternativas, seed, historicoPosicoes) {
  const alts = [...alternativas]
  const n = alts.length
  if (n < 2) {
    return { alternativas: alts, posCorreta: indicePosicaoCorreta(alts) }
  }

  const hist = (historicoPosicoes || []).filter((p) => p >= 0)
  const ultimo = hist.length ? hist[hist.length - 1] : -1
  const janela = hist.slice(-Math.min(n, hist.length))
  const usadasNaJanela = new Set(janela)
  const haPosicaoNova = usadasNaJanela.size < n

  const preferidas = []
  const aceitaveis = []

  const tentar = (rejeitarPadrao) => {
    for (let t = 0; t < 64; t++) {
      const emb = shuffleArrayDeterministic(alts, t === 0 ? seed : `${seed}-t${t}`)
      const pos = indicePosicaoCorreta(emb)
      if (pos < 0) continue
      if (pos === ultimo) continue
      if (rejeitarPadrao && continuaPadraoCiclico(hist, pos, n)) continue

      const item = { emb, pos }
      if (haPosicaoNova && !usadasNaJanela.has(pos)) {
        preferidas.push(item)
      } else {
        aceitaveis.push(item)
      }
    }
  }

  tentar(true)
  if (!preferidas.length && !aceitaveis.length) tentar(false)

  const pick = preferidas[0] ?? aceitaveis[0]
  if (pick) return { alternativas: pick.emb, posCorreta: pick.pos }

  let embaralhadas = shuffleArrayDeterministic(alts, seed)
  let pos = indicePosicaoCorreta(embaralhadas)
  if (pos === ultimo) {
    const novaPos = (pos + 1) % n
    const swap = [...embaralhadas]
    ;[swap[pos], swap[novaPos]] = [swap[novaPos], swap[pos]]
    embaralhadas = swap
    pos = indicePosicaoCorreta(embaralhadas)
  }
  return { alternativas: embaralhadas, posCorreta: pos }
}

/**
 * Embaralha alternativas; evita correta na mesma posição em sequência
 * e padrões previsíveis (ex.: a→b→c→d→a em ciclo).
 */
export function embaralharQuestoesComAlternativas(questoes, seedBase, obterAlternativas) {
  const base = String(seedBase || 'questoes')
  const historicoPosicoes = []

  return (questoes || []).map((q, i) => {
    const brutas = obterAlternativas(q, i)
    if (!brutas?.length) return q

    const seed = `${base}-q${q?.id ?? i}`
    const { alternativas, posCorreta } = embaralharUmaLista(brutas, seed, historicoPosicoes)
    if (posCorreta >= 0) historicoPosicoes.push(posCorreta)
    return { ...q, alternativas }
  })
}

/** Discipulado: alternativas já vêm no JSON. */
export function embaralharQuestoesDiscipulado(questoes, seedBase) {
  return embaralharQuestoesComAlternativas(
    questoes,
    seedBase,
    (q) => [...(q?.alternativas || [])]
  )
}

/** Estudos bíblicos (modo estudo): monta opções a partir de respostaCerta / respostasErradas. */
export function montarAlternativasEstudoBiblico(questao) {
  const tipo = String(questao?.tipo || '').toLowerCase()
  if (tipo === 'ver_resposta') return []

  if (tipo === 'verdadeiro_falso') {
    const correta =
      String(questao?.respostaCerta || '').trim().toLowerCase() === 'falso' ? 'Falso' : 'Verdadeiro'
    const errada = correta === 'Verdadeiro' ? 'Falso' : 'Verdadeiro'
    return [
      { id: 'c', texto: correta, correta: true },
      { id: 'e0', texto: errada, correta: false }
    ]
  }

  const limpas = (questao?.respostasErradas || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 4)
  return [
    { id: 'c', texto: String(questao?.respostaCerta || '').trim(), correta: true },
    ...limpas.map((texto, i) => ({ id: `e${i}`, texto, correta: false }))
  ].filter((x) => x.texto.length > 0)
}

export function embaralharPerguntasEstudoBiblico(perguntas, studyId) {
  return embaralharQuestoesComAlternativas(perguntas, studyId, (q) => montarAlternativasEstudoBiblico(q))
}
