const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor))

// A posição é contínua por versículo. Blocos como 9–10 ocupam duas unidades.
export function ancoraComparacao(blocos, topo, maximo) {
  if (!blocos.length) return { posicao: 1 }
  const bloco = [...blocos].reverse().find(item => item.topo <= topo) || blocos[0]
  const fracao = limitar((topo - bloco.topo) / Math.max(1, bloco.altura), 0, 1)
  return {
    posicao: bloco.inicio + fracao * (bloco.fim - bloco.inicio + 1),
    final: maximo > 0 && topo >= maximo - 1,
  }
}

export function topoComparacao(blocos, ancora, maximo) {
  if (!blocos.length) return 0
  if (ancora.final) return maximo
  const posicao = ancora.posicao || 1
  const bloco = blocos.find(item => item.inicio <= posicao && posicao < item.fim + 1)
    || (posicao < blocos[0].inicio ? blocos[0] : blocos.at(-1))
  const fracao = limitar((posicao - bloco.inicio) / (bloco.fim - bloco.inicio + 1), 0, 1)
  return limitar(bloco.topo + fracao * bloco.altura, 0, maximo)
}
