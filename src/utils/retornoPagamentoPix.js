// Só libera o aviso após uma saída real para segundo plano e o retorno.
// Perder foco (por exemplo, ao copiar o código) não conta como saída.
export function observarRetornoPagamentoPix({ documento, registrarEstadoNativo, onRetorno }) {
  let ativo = true
  let saiu = false
  let liberado = false
  let listenerNativo
  const atualizar = (emPrimeiroPlano) => {
    if (!ativo || liberado) return
    if (!emPrimeiroPlano) { saiu = true; return }
    if (saiu) { liberado = true; onRetorno() }
  }
  const visibilidade = () => atualizar(documento.visibilityState === 'visible')
  // No aplicativo nativo, o ciclo de vida do Capacitor é a referência.
  if (registrarEstadoNativo) {
    Promise.resolve().then(() => registrarEstadoNativo(({ isActive }) => atualizar(isActive)))
      .then((listener) => { if (ativo) listenerNativo = listener; else void listener.remove() })
      .catch(() => { if (ativo) documento.addEventListener('visibilitychange', visibilidade) })
  } else documento.addEventListener('visibilitychange', visibilidade)
  return () => {
    ativo = false
    documento.removeEventListener('visibilitychange', visibilidade)
    if (listenerNativo) void listenerNativo.remove()
  }
}
