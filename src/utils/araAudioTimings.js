// Somente intervalos reais da gravação; não estima tempos pelo tamanho do texto.
export function validarMarcacoesAra(valor) {
  if (!Array.isArray(valor) || !valor.length || valor.length > 176) return []
  let anterior = 0, fimAnterior = 0
  for (const item of valor) {
    if (!item || !Number.isInteger(item.versiculo) || item.versiculo <= anterior || item.versiculo > 176
      || !Number.isFinite(item.inicio) || !Number.isFinite(item.fim) || item.inicio < fimAnterior
      || item.fim <= item.inicio || item.fim > 14400) return []
    anterior = item.versiculo; fimAnterior = item.fim
  }
  return valor
}

export function versiculoAraNoTempo(marcacoes, tempo) {
  if (!Number.isFinite(tempo) || tempo < 0) return null
  // Intervalo fechado no início e aberto no fim: inclui saltos e retrocessos.
  return marcacoes.find(item => tempo >= item.inicio && tempo < item.fim)?.versiculo ?? null
}
