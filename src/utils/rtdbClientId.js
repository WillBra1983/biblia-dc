/**
 * Identificador único por instância (aba/janela/APK), gerado uma vez por sessão.
 * Usado para etiquetar todas as escritas no RTDB e descartar o "eco" no
 * `onValue` deste mesmo cliente — evitando re-aplicar o estado que ele acabou
 * de gravar (efeito visível como travadinhas quando o mesmo usuário está
 * conectado em mais de um dispositivo simultaneamente).
 */

let clientId = null

function gerarId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getRtdbClientId() {
  if (clientId) return clientId
  try {
    const fromStorage = sessionStorage.getItem('rtdb_client_id')
    if (fromStorage && typeof fromStorage === 'string' && fromStorage.length >= 6) {
      clientId = fromStorage
      return clientId
    }
  } catch {
    /* ignore */
  }
  clientId = gerarId()
  try {
    sessionStorage.setItem('rtdb_client_id', clientId)
  } catch {
    /* ignore */
  }
  return clientId
}

/** Verdadeiro se o `clientId` recebido em um snapshot foi gravado por NÓS mesmos. */
export function snapshotEhEcoDoMesmoCliente(snapshotClientId) {
  if (!snapshotClientId) return false
  return String(snapshotClientId) === getRtdbClientId()
}
