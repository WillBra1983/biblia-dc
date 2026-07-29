import { getFirebaseDatabase } from '../config/firebase'

const CHAVE_LOCAL = 'biblia-dc:avisos-admin-entregues'

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
  const agora = Date.now()
  const pendentes = []

  avisosSnap.forEach((item) => {
    const valor = item.val() || {}
    if (entreguesServidor.has(item.key) || entreguesLocais.has(item.key)) return
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
