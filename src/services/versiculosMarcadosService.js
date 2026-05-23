/**
 * Serviço para gerenciar versículos marcados
 */

import { VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED } from '../config/featureFlags'

const LEGACY_STORAGE_KEY = 'versiculosMarcados'
const LEGACY_DELETES_STORAGE_KEY = 'versiculosMarcadosDeletes'
const STORAGE_KEY_PREFIX = 'versiculosMarcados:'
const DELETES_STORAGE_KEY_PREFIX = 'versiculosMarcadosDeletes:'
const ANON_STORAGE_SUFFIX = 'anon'
const LEGACY_MIGRATION_FLAG = 'versiculosMarcados_legado_migrado_uid'

/** Conta ativa: uid Firebase ou `null` (visitante → sufixo `anon`). */
let activeStorageUid = null

/** Evita loop de sync ao aplicar dados remotos. */
let aplicandoMarcadoresRemotos = false

/** Coalesce de reconciliações no mesmo tick (várias desmarcações em loop). */
let reconciliacaoNuvemPendente = false

function chaveMarcados(uid = activeStorageUid) {
  const sufixo = uid ? String(uid) : ANON_STORAGE_SUFFIX
  return `${STORAGE_KEY_PREFIX}${sufixo}`
}

function chaveDeletes(uid = activeStorageUid) {
  const sufixo = uid ? String(uid) : ANON_STORAGE_SUFFIX
  return `${DELETES_STORAGE_KEY_PREFIX}${sufixo}`
}

/** Chave `localStorage` da conta ativa (evitar gravar direto fora do serviço). */
export function obterChaveStorageVersiculosMarcados() {
  return chaveMarcados()
}

export function obterChaveStorageExclusoesVersiculosMarcados() {
  return chaveDeletes()
}

/** @deprecated Preferir funções do serviço; mantido para compatibilidade. */
export const VERSICULOS_MARCADOS_STORAGE_KEY = LEGACY_STORAGE_KEY
export const VERSICULOS_MARCADOS_DELETES_STORAGE_KEY = LEGACY_DELETES_STORAGE_KEY

function migrarLegadoLocalParaUid(uid) {
  if (!uid) return
  const scopedMarcados = chaveMarcados(uid)
  if (localStorage.getItem(scopedMarcados) != null) return

  const legadoMarcados = localStorage.getItem(LEGACY_STORAGE_KEY)
  const legadoDeletes = localStorage.getItem(LEGACY_DELETES_STORAGE_KEY)
  if (!legadoMarcados && !legadoDeletes) return

  const migradoPara = localStorage.getItem(LEGACY_MIGRATION_FLAG)
  if (migradoPara && migradoPara !== uid) return

  if (legadoMarcados) localStorage.setItem(scopedMarcados, legadoMarcados)
  if (legadoDeletes) localStorage.setItem(chaveDeletes(uid), legadoDeletes)
  localStorage.setItem(LEGACY_MIGRATION_FLAG, uid)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  localStorage.removeItem(LEGACY_DELETES_STORAGE_KEY)
}

/**
 * Troca o cache local ao mudar de conta no mesmo aparelho.
 * Deve ser chamado ao entrar/sair do login (antes do sync na nuvem).
 */
export function definirContaVersiculosMarcados(uid) {
  const next = uid ? String(uid) : null
  if (next === activeStorageUid) return
  activeStorageUid = next
  if (next) migrarLegadoLocalParaUid(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('versiculosMarcadosChange'))
  }
}

export function obterUidStorageVersiculosMarcados() {
  return activeStorageUid
}

function agendaSyncNuvem(options = {}) {
  if (!VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) return
  if (aplicandoMarcadoresRemotos) return
  const { reconciliar = false, ...flushOptions } = options || {}
  queueMicrotask(() => {
    import('./versiculosMarcadosCloudSync').then((m) =>
      m.scheduleVersiculosMarcadosCloudFlush(flushOptions)
    )
  })
  if (reconciliar) agendaReconciliacaoNuvem()
}

/**
 * Após operação destrutiva (desmarcar único, grupo ou limpar tudo), agenda
 * uma reconciliação com o servidor: envia o estado local e relê o nó no RTDB
 * — equivalente a um "recarregar da nuvem" silencioso.
 *
 * Várias chamadas no mesmo tick (ex.: desmarcar versículos em loop) são
 * coalescidas em uma única reconciliação ao final do microtask.
 */
function agendaReconciliacaoNuvem() {
  if (!VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED) return
  if (aplicandoMarcadoresRemotos) return
  if (reconciliacaoNuvemPendente) return
  reconciliacaoNuvemPendente = true
  queueMicrotask(() => {
    reconciliacaoNuvemPendente = false
    import('./versiculosMarcadosCloudSync')
      .then((m) => m.reconciliarVersiculosMarcadosComServidor?.())
      .catch(() => {})
  })
}

function obterMapaExclusoesRaw() {
  try {
    const dados = localStorage.getItem(chaveDeletes())
    if (!dados) return {}
    const p = JSON.parse(dados)
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {}
  } catch {
    return {}
  }
}

function gravarMapaExclusoes(map) {
  const limpo = {}
  for (const [k, v] of Object.entries(map || {})) {
    const n = Number(v)
    if (n > 0) limpo[k] = n
  }
  if (Object.keys(limpo).length === 0) {
    localStorage.removeItem(chaveDeletes())
  } else {
    localStorage.setItem(chaveDeletes(), JSON.stringify(limpo))
  }
}

function gravarMapaMarcados(marcados) {
  const chave = chaveMarcados()
  if (!marcados || Object.keys(marcados).length === 0) {
    localStorage.removeItem(chave)
  } else {
    localStorage.setItem(chave, JSON.stringify(marcados))
  }
}

/**
 * Mapa de exclusões sincronizáveis: chave `livro-cap-vers` → timestamp (ms) da exclusão.
 */
export function obterMapaExclusoesVersiculosMarcados() {
  return { ...obterMapaExclusoesRaw() }
}

export function removerExclusaoVersiculoMarcado(chave) {
  const d = obterMapaExclusoesRaw()
  if (!d[chave]) return
  delete d[chave]
  gravarMapaExclusoes(d)
}

/**
 * Aplica merges remotos: atualiza marcadores e mapa de exclusões de uma vez.
 */
export function aplicarEstadoSincronizadoMarcadores(marcados, deletes) {
  aplicandoMarcadoresRemotos = true
  try {
    gravarMapaMarcados(marcados || {})
    gravarMapaExclusoes(deletes || {})
    window.dispatchEvent(new Event('versiculosMarcadosChange'))
  } catch (error) {
    console.error('Erro ao aplicar sincronização de marcadores:', error)
  } finally {
    aplicandoMarcadoresRemotos = false
  }
}

/** Após alterar `localStorage` de marcadores manualmente (ex.: importação pelo chat). */
export function notificarAlteracaoMarcadoresParaNuvem(options = {}) {
  agendaSyncNuvem(options)
}

// Cores disponíveis para marcar versículos
export const CORES_DISPONIVEIS = [
  { id: 'amarelo', nome: 'Amarelo', cor: '#ffeb3b', corEscura: '#fbc02d' },
  { id: 'verde', nome: 'Verde', cor: '#4caf50', corEscura: '#388e3c' },
  { id: 'azul', nome: 'Azul', cor: '#2196f3', corEscura: '#1976d2' },
  { id: 'laranja', nome: 'Laranja', cor: '#ff9800', corEscura: '#f57c00' },
  { id: 'rosa', nome: 'Rosa', cor: '#e91e63', corEscura: '#c2185b' },
  { id: 'roxo', nome: 'Roxo', cor: '#9c27b0', corEscura: '#7b1fa2' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#f44336', corEscura: '#d32f2f' },
  { id: 'cinza', nome: 'Cinza', cor: '#9e9e9e', corEscura: '#616161' },
]

/**
 * Obtém todos os versículos marcados
 */
export function obterVersiculosMarcados() {
  try {
    const dados = localStorage.getItem(chaveMarcados())
    return dados ? JSON.parse(dados) : {}
  } catch (error) {
    console.error('Erro ao obter versículos marcados:', error)
    return {}
  }
}

/** Mescla marcadores importados (chat/exportação) na conta ativa. */
export function mesclarVersiculosMarcadosImportados(novosMarcados) {
  const marcados = { ...obterVersiculosMarcados(), ...(novosMarcados || {}) }
  for (const k of Object.keys(novosMarcados || {})) {
    removerExclusaoVersiculoMarcado(k)
  }
  gravarMapaMarcados(marcados)
  window.dispatchEvent(new Event('versiculosMarcadosChange'))
  notificarAlteracaoMarcadoresParaNuvem()
}

/**
 * Marca um versículo com uma cor
 */
export function marcarVersiculo(livroId, capitulo, versiculo, corId, texto = '') {
  try {
    const marcados = obterVersiculosMarcados()
    const chave = `${livroId}-${capitulo}-${versiculo}`

    removerExclusaoVersiculoMarcado(chave)

    marcados[chave] = {
      livroId,
      capitulo,
      versiculo,
      corId,
      texto,
      dataMarcacao: new Date().toISOString(),
      grupoMarcacaoId: null
    }

    gravarMapaMarcados(marcados)
    window.dispatchEvent(new Event('versiculosMarcadosChange'))
    agendaSyncNuvem()
    return true
  } catch (error) {
    console.error('Erro ao marcar versículo:', error)
    return false
  }
}

/**
 * Desmarca um versículo
 */
export function desmarcarVersiculo(livroId, capitulo, versiculo) {
  try {
    const marcados = obterVersiculosMarcados()
    const chave = `${livroId}-${capitulo}-${versiculo}`

    if (marcados[chave]) {
      const d = obterMapaExclusoesRaw()
      d[chave] = Date.now()
      gravarMapaExclusoes(d)
      delete marcados[chave]
      gravarMapaMarcados(marcados)
      window.dispatchEvent(new Event('versiculosMarcadosChange'))
      agendaSyncNuvem({ immediate: true, reconciliar: true })
      return true
    }
    return false
  } catch (error) {
    console.error('Erro ao desmarcar versículo:', error)
    return false
  }
}

/**
 * Verifica se um versículo está marcado
 */
export function versiculoEstaMarcado(livroId, capitulo, versiculo) {
  const marcados = obterVersiculosMarcados()
  const chave = `${livroId}-${capitulo}-${versiculo}`
  return marcados[chave] || null
}

/**
 * Obtém a cor de um versículo marcado
 */
export function obterCorVersiculo(livroId, capitulo, versiculo) {
  const marcado = versiculoEstaMarcado(livroId, capitulo, versiculo)
  if (marcado) {
    const cor = CORES_DISPONIVEIS.find(c => c.id === marcado.corId)
    return cor || CORES_DISPONIVEIS[0]
  }
  return null
}

/**
 * Marca múltiplos versículos com a mesma cor
 */
export function marcarVersiculos(versiculos, corId) {
  try {
    const marcados = obterVersiculosMarcados()
    const dataMarcacao = new Date().toISOString()
    const grupoMarcacaoId = `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    versiculos.forEach(({ livroId, capitulo, versiculo, texto = '' }) => {
      const chave = `${livroId}-${capitulo}-${versiculo}`
      removerExclusaoVersiculoMarcado(chave)
      marcados[chave] = {
        livroId,
        capitulo,
        versiculo,
        corId,
        texto,
        dataMarcacao,
        grupoMarcacaoId
      }
    })

    gravarMapaMarcados(marcados)
    window.dispatchEvent(new Event('versiculosMarcadosChange'))
    agendaSyncNuvem()
    return true
  } catch (error) {
    console.error('Erro ao marcar versículos:', error)
    return false
  }
}

/**
 * Obtém todos os versículos marcados de uma cor específica
 */
export function obterVersiculosPorCor(corId) {
  const marcados = obterVersiculosMarcados()
  return Object.values(marcados).filter(v => v.corId === corId)
}

/**
 * Obtém todos os versículos marcados ordenados por data
 */
export function obterTodosVersiculosMarcados() {
  const marcados = obterVersiculosMarcados()
  return Object.values(marcados).sort(
    (a, b) => new Date(b.dataMarcacao) - new Date(a.dataMarcacao)
  )
}

/**
 * Limpa todos os versículos marcados
 */
export function limparTodosVersiculosMarcados() {
  try {
    const marcados = obterVersiculosMarcados()
    const now = Date.now()
    const d = obterMapaExclusoesRaw()
    for (const k of Object.keys(marcados)) {
      d[k] = Math.max(Number(d[k]) || 0, now)
    }
    gravarMapaExclusoes(d)
    gravarMapaMarcados({})
    window.dispatchEvent(new Event('versiculosMarcadosChange'))
    agendaSyncNuvem({ immediate: true, reconciliar: true })
    return true
  } catch (error) {
    console.error('Erro ao limpar versículos marcados:', error)
    return false
  }
}
