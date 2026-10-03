// Cache apenas da sessão: nada é gravado no aparelho ou compartilhado.
export class CachePaginasPdf {
  constructor(limiteBytes = 32 * 1024 * 1024) {
    this.limiteBytes = limiteBytes
    this.bytes = 0
    this.paginas = new Map()
  }
  obter(chave) {
    const item = this.paginas.get(chave)
    if (!item) return null
    this.paginas.delete(chave)
    this.paginas.set(chave, item)
    return item.valor
  }
  guardar(chave, valor, bytes) {
    const anterior = this.paginas.get(chave)
    if (anterior) this.bytes -= anterior.bytes
    this.paginas.delete(chave)
    if (bytes > this.limiteBytes) return
    this.paginas.set(chave, { valor, bytes })
    this.bytes += bytes
    while (this.bytes > this.limiteBytes) {
      const [primeira, item] = this.paginas.entries().next().value
      this.paginas.delete(primeira)
      this.bytes -= item.bytes
    }
  }
  limpar() { this.paginas.clear(); this.bytes = 0 }
}

export class FilaRenderPdf {
  constructor(concorrencia = 2) {
    this.concorrencia = concorrencia
    this.ativos = 0
    this.pendentes = []
  }
  agendar(executar, prioridade = () => 0) {
    let cancelado = false
    let resolver
    let rejeitar
    const promise = new Promise((resolve, reject) => { resolver = resolve; rejeitar = reject })
    const item = { executar, prioridade, resolver, rejeitar, cancelado: () => cancelado }
    this.pendentes.push(item)
    // Agrupa solicitações dos observadores para ordenar as páginas visíveis primeiro.
    queueMicrotask(() => this.processar())
    return {
      promise,
      cancelar: () => { cancelado = true; this.pendentes = this.pendentes.filter((atual) => atual !== item); resolver(null) },
    }
  }
  processar() {
    this.pendentes.sort((a, b) => a.prioridade() - b.prioridade())
    while (this.ativos < this.concorrencia && this.pendentes.length) {
      const item = this.pendentes.shift()
      if (item.cancelado()) { item.resolver(null); continue }
      this.ativos++
      Promise.resolve().then(item.executar).then(item.resolver, item.rejeitar).finally(() => {
        this.ativos--
        this.processar()
      })
    }
  }
}

export function prioridadePaginaPdf(numero, atual, direcao = 1) {
  const distancia = numero - atual
  return Math.abs(distancia) * 2 + (distancia * direcao < 0 ? 1 : 0)
}
