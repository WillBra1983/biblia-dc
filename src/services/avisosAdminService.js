import { getFirebaseDatabase, loadFirebaseModules } from '../config/firebase'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { compararVersoes } from '../utils/semverCompare'

const CHAVE_LOCAL = 'biblia-dc:avisos-admin-entregues'
const CHAVE_ATUALIZACOES = 'biblia-dc:atualizacoes-vistas:'
const vistasNestaSessao = new Set()
let ultimaInstalacao = null

export function reiniciarComunicadosAtualizacaoSessao() {
  vistasNestaSessao.clear()
}

function lerInstalacaoAvisada(uid) {
  try {
    const valor = JSON.parse(localStorage.getItem(`biblia-dc:atualizacoes-instalacao:${uid}`) || '{}')
    return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {}
  } catch { return {} }
}

function atualizacoesVistas(uid) {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_ATUALIZACOES + uid) || '[]')) } catch { return new Set() }
}

export function registrarAtualizacoesVistas(uid, ids) {
  if (!uid) return
  if (Capacitor.isNativePlatform?.()) {
    ids.forEach(id => vistasNestaSessao.add(`${uid}:${id}`))
    // Guarda a instalação, não uma dispensa permanente. Depois de atualizar,
    // um comunicado antigo sem versão alvo não deve continuar aparecendo.
    if (ultimaInstalacao) {
      const registro = lerInstalacaoAvisada(uid)
      ids.forEach(id => { registro[id] = ultimaInstalacao })
      try { localStorage.setItem(`biblia-dc:atualizacoes-instalacao:${uid}`, JSON.stringify(Object.fromEntries(Object.entries(registro).slice(-100)))) } catch { /* A versão remota continua sendo verificada. */ }
    }
    return
  }
  const vistas = atualizacoesVistas(uid)
  ids.forEach(id => vistas.add(String(id)))
  try { localStorage.setItem(CHAVE_ATUALIZACOES + uid, JSON.stringify([...vistas].slice(-100))) } catch { /* Continua nesta sessão pelo estado do diálogo. */ }
}

function lerIdsLocais() {
  try {
    const valor = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '[]')
    return new Set(Array.isArray(valor) ? valor.filter(Boolean).slice(-100) : [])
  } catch {
    return new Set()
  }
}

function salvarIdsLocais(ids) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify([...ids].slice(-100)))
  } catch (_) { /* armazenamento indisponível */ }
}

export function registrarAvisoAdminEntregueLocalmente(avisoId) {
  if (!avisoId) return
  const ids = lerIdsLocais()
  ids.add(String(avisoId))
  salvarIdsLocais(ids)
}

export async function marcarAvisoAdminEntregue(uid, avisoId) {
  if (!uid || !avisoId) return
  registrarAvisoAdminEntregueLocalmente(avisoId)
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return
  const { ref, set, serverTimestamp } = await import('firebase/database')
  await set(ref(db, `users/${uid}/avisosAdminEntregues/${avisoId}`), serverTimestamp())
}

/**
 * Retorna comunicados gerais ainda não entregues para esta conta/aparelho.
 * O limite evita uma sequência excessiva caso a conta fique meses sem entrar.
 */
export async function listarAvisosAdminPendentes(uid, limite = 5) {
  if (!uid) return []
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) return []
  const { ref, get, query, orderByChild, limitToLast } = await import('firebase/database')
  const [avisosSnap, entreguesSnap] = await Promise.all([
    get(query(ref(db, 'avisosAdmin'), orderByChild('criadoEm'), limitToLast(20))),
    get(ref(db, `users/${uid}/avisosAdminEntregues`)),
  ])

  const entreguesServidor = new Set()
  entreguesSnap.forEach((item) => entreguesServidor.add(item.key))
  const entreguesLocais = lerIdsLocais()
  const vistas = atualizacoesVistas(uid)
  const nativo = Capacitor.isNativePlatform?.()
  if (nativo) {
    try { ultimaInstalacao = await App.getInfo() } catch { ultimaInstalacao = null }
  }
  const instalacoesAvisadas = nativo ? lerInstalacaoAvisada(uid) : {}
  const agora = Date.now()
  const pendentes = []

  avisosSnap.forEach((item) => {
    const valor = item.val() || {}
    // Receber um push não comprova que o comunicado foi visto dentro deste aparelho.
    if (valor.acao === 'atualizar_app') {
      if (nativo) {
        if (vistasNestaSessao.has(`${uid}:${item.key}`)) return
        const anterior = instalacoesAvisadas[item.key]
        if (anterior && ultimaInstalacao) {
          const comparacao = compararVersoes(ultimaInstalacao.version, anterior.version)
          if (comparacao > 0 || (comparacao === 0 && Number(ultimaInstalacao.build) > Number(anterior.build))) return
        }
      } else if (vistas.has(item.key)) return
    } else if (entreguesServidor.has(item.key) || entreguesLocais.has(item.key)) return
    if (Number(valor.expiraEm) > 0 && Number(valor.expiraEm) < agora) return
    pendentes.push({
      id: item.key,
      titulo: String(valor.titulo || 'Bíblia DC'),
      mensagem: String(valor.mensagem || ''),
      url: String(valor.url || '/'),
      acao: String(valor.acao || 'abrir_destino'),
      criadoEm: Number(valor.criadoEm) || 0,
    })
  })

  return pendentes
    .sort((a, b) => a.criadoEm - b.criadoEm)
    .slice(-Math.max(1, Number(limite) || 5))
}
