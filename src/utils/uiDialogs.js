/**
 * API global imperativa para diálogos e snackbars MUI.
 *
 * Permite chamar `await avisarAsync(...)`, `await confirmarAsync(...)` e
 * `mostrarSnackbar(...)` de qualquer lugar (inclusive utilitários e services)
 * sem precisar passar contexto/props. O `AppDialogsHost` (montado uma vez no
 * shell do app) consome este store e renderiza os componentes MUI.
 *
 * Antes: o app usava `window.alert`/`window.confirm` em ~25 pontos — o que
 * dava "cara de página web crua" e quebrava a estética do MUI + tema.
 */

let id = 0
const next = () => ++id

const state = {
  dialogs: [],
  snackbars: []
}

const subscribers = new Set()

function notify() {
  for (const cb of subscribers) {
    try { cb(state) } catch (e) { console.warn('[uiDialogs]', e) }
  }
}

export function subscribeUiDialogs(cb) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

export function getUiDialogsState() {
  return state
}

/**
 * Aviso simples (substitui `window.alert`). Resolve quando o usuário fecha.
 *
 * @param {string | {
 *   titulo?: string,
 *   mensagem: string,
 *   labelOk?: string,
 *   severidade?: 'info'|'success'|'warning'|'error'
 * }} opts
 * @returns {Promise<void>}
 */
export function avisarAsync(opts) {
  const o = typeof opts === 'string' ? { mensagem: opts } : (opts || {})
  return new Promise((resolve) => {
    const dlgId = next()
    state.dialogs.push({
      id: dlgId,
      tipo: 'aviso',
      titulo: o.titulo,
      mensagem: String(o.mensagem ?? ''),
      labelOk: o.labelOk || 'OK',
      severidade: o.severidade || 'info',
      resolver: () => {
        state.dialogs = state.dialogs.filter((d) => d.id !== dlgId)
        notify()
        resolve()
      }
    })
    notify()
  })
}

/**
 * Confirmação (substitui `window.confirm`). Resolve `true`/`false`.
 *
 * @param {string | {
 *   titulo?: string,
 *   mensagem: string,
 *   labelOk?: string,
 *   labelCancelar?: string,
 *   destrutivo?: boolean
 * }} opts
 * @returns {Promise<boolean>}
 */
export function confirmarAsync(opts) {
  const o = typeof opts === 'string' ? { mensagem: opts } : (opts || {})
  return new Promise((resolve) => {
    const dlgId = next()
    state.dialogs.push({
      id: dlgId,
      tipo: 'confirmacao',
      titulo: o.titulo,
      mensagem: String(o.mensagem ?? ''),
      labelOk: o.labelOk || 'Confirmar',
      labelCancelar: o.labelCancelar || 'Cancelar',
      destrutivo: Boolean(o.destrutivo),
      resolver: (val) => {
        state.dialogs = state.dialogs.filter((d) => d.id !== dlgId)
        notify()
        resolve(Boolean(val))
      }
    })
    notify()
  })
}

/**
 * Toast leve (sem bloquear). Útil para confirmações breves do tipo
 * "Link copiado!".
 *
 * @param {string | {
 *   mensagem: string,
 *   severidade?: 'info'|'success'|'warning'|'error',
 *   duracaoMs?: number
 * }} opts
 */
export function mostrarSnackbar(opts) {
  const o = typeof opts === 'string' ? { mensagem: opts } : (opts || {})
  const snackId = next()
  state.snackbars.push({
    id: snackId,
    mensagem: String(o.mensagem ?? ''),
    severidade: o.severidade || 'info',
    duracaoMs: Number.isFinite(o.duracaoMs) ? o.duracaoMs : 3200
  })
  notify()
  return snackId
}

/** Fecha um snackbar específico (chamado pelo host). */
export function fecharSnackbar(snackId) {
  state.snackbars = state.snackbars.filter((s) => s.id !== snackId)
  notify()
}

/**
 * Helper: tenta copiar para a área de transferência; em sucesso, mostra um
 * snackbar; em falha, abre um diálogo com o texto para o usuário copiar
 * manualmente (substituto elegante do `window.prompt`).
 *
 * @param {string} texto
 * @param {{ mensagemSucesso?: string, tituloFallback?: string }} [opts]
 */
export async function copiarParaAreaTransferencia(texto, opts = {}) {
  const mensagemSucesso = opts.mensagemSucesso || 'Copiado para a área de transferência.'
  try {
    if (!navigator?.clipboard?.writeText) throw new Error('sem clipboard API')
    await navigator.clipboard.writeText(String(texto ?? ''))
    mostrarSnackbar({ mensagem: mensagemSucesso, severidade: 'success' })
    return true
  } catch {
    await avisarAsync({
      titulo: opts.tituloFallback || 'Copie manualmente',
      mensagem: String(texto ?? ''),
      severidade: 'info'
    })
    return false
  }
}
