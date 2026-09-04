/** Lista, para o administrador, os utilizadores presentes em uma data. */

const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')

function dataValida(data) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))
}

function rotuloProvedor(signInProvider, emailVerified) {
  const id = String(signInProvider || '').trim()
  const nomes = {
    'google.com': 'Google',
    password: 'E-mail e senha',
    phone: 'Telefone',
    'apple.com': 'Apple',
  }
  const nome = nomes[id] || id || '—'
  if (id === 'google.com') return `${nome} (verificado pelo Google)`
  if (id === 'password') {
    return emailVerified ? `${nome} (e-mail verificado)` : `${nome} (e-mail não verificado)`
  }
  if (emailVerified) return `${nome} (verificado)`
  return nome
}

async function carregarUsuarios(uids) {
  const encontrados = []
  for (let i = 0; i < uids.length; i += 100) {
    const lote = uids.slice(i, i + 100).map((uid) => ({ uid }))
    const resultado = await admin.auth().getUsers(lote)
    encontrados.push(...resultado.users)
  }
  return encontrados
}

exports.listarAcessosDiariosAdmin = onCall(
  { region: 'us-central1', maxInstances: 3, cors: true },
  async (req) => {
    const adminUid = req.auth?.uid
    if (!adminUid) throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')

    const flagSnap = await admin.database().ref(`users/${adminUid}/admin`).get()
    if (flagSnap.val() !== true) {
      throw new HttpsError('permission-denied', 'Apenas administradores podem listar acessos.')
    }

    const data = String(req.data?.data || '').trim()
    if (!dataValida(data)) throw new HttpsError('invalid-argument', 'Data inválida.')

    try {
      const db = admin.database()
      const acessosSnap = await db.ref(`adminMetrics/userAccess/daily/${data}`).get()
      const acessos = acessosSnap.val() || {}
      const uids = Object.keys(acessos)
      if (uids.length === 0) return { users: [], data }

      const authUsers = await carregarUsuarios(uids)
      const users = await Promise.all(authUsers.map(async (u) => {
        const profSnap = await db.ref(`users/${u.uid}/profile`).get().catch(() => null)
        const prof = profSnap?.val() || {}
        const providers = (u.providerData || []).map((p) => p.providerId).filter(Boolean)
        const signInProvider = providers[0] || ''
        const acesso = acessos[u.uid] || {}
        return {
          uid: u.uid,
          email: (u.email || '').trim(),
          displayName: u.displayName || prof.displayName || '',
          profileHandle: String(prof.handle || '').trim().replace(/^@+/, '').toLowerCase(),
          ehAdmin: false,
          disabled: Boolean(u.disabled),
          emailVerified: Boolean(u.emailVerified),
          providers,
          signInProvider,
          provedorLabel: rotuloProvedor(signInProvider, Boolean(u.emailVerified)),
          photoURL: u.photoURL || '',
          creationTime: u.metadata.creationTime || '',
          lastSignInTime: u.metadata.lastSignInTime || '',
          lastAccessAt: typeof prof.lastAccessAt === 'number'
            ? new Date(prof.lastAccessAt).toISOString()
            : '',
          acessoNoDiaFirstAt: Number(acesso.firstAccessAt) || 0,
          acessoNoDiaLastAt: Number(acesso.lastAccessAt) || 0,
        }
      }))

      users.sort((a, b) => b.acessoNoDiaLastAt - a.acessoNoDiaLastAt)
      logger.info('listarAcessosDiariosAdmin', { adminUid, data, count: users.length })
      return { users, data }
    } catch (e) {
      logger.error('listarAcessosDiariosAdmin falhou', { adminUid, data, err: e?.message })
      throw new HttpsError('internal', e?.message || 'Falha ao listar acessos do dia.')
    }
  }
)
