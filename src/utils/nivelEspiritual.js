/**
 * Níveis de “progresso espiritual” no app — disciplina + constância (não competitivo).
 * Usado para futura UI (barra, perfil); lógica pura e local.
 */

const NIVEIS = [
  { id: 'iniciante', nome: 'Iniciante', minPontos: 0 },
  { id: 'discipulo', nome: 'Discípulo', minPontos: 45 },
  { id: 'servo', nome: 'Servo', minPontos: 120 },
  { id: 'mestre', nome: 'Mestre', minPontos: 260 },
]

/**
 * Pontuação heurística: sequência na Palavra + medalhas + quiz no dia.
 * @param {{ sequenciaBiblia?: number, medalhasCount?: number, diasQuizPalavra?: number }} p
 */
export function calcularPontosEspirituais(p) {
  const seq = Math.max(0, Number(p?.sequenciaBiblia) || 0)
  const med = Math.max(0, Number(p?.medalhasCount) || 0)
  const qz = Math.max(0, Number(p?.diasQuizPalavra) || 0)
  return seq * 4 + med * 22 + qz * 8
}

/**
 * @returns {{ id: string, nome: string, indice: number, pontos: number, proximoNome: string | null, pontosParaProximo: number | null }}
 */
export function obterNivelEspiritual(params) {
  const pontos = calcularPontosEspirituais(params)
  let indice = 0
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (pontos >= NIVEIS[i].minPontos) {
      indice = i
      break
    }
  }
  const atual = NIVEIS[indice]
  const proximo = NIVEIS[indice + 1] || null
  const pontosParaProximo = proximo ? Math.max(0, proximo.minPontos - pontos) : null
  return {
    id: atual.id,
    nome: atual.nome,
    indice,
    pontos,
    proximoNome: proximo?.nome ?? null,
    pontosParaProximo,
  }
}

export { NIVEIS }
