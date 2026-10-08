const { createHash } = require('node:crypto')
const admin = require('./firebaseAdmin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const OPCOES = { region: 'us-central1', maxInstances: 5, cors: true }

function uidVisitante(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) throw new HttpsError('invalid-argument', 'Identificação deste aparelho inválida.')
  return `visitante_${createHash('sha256').update(token).digest('hex')}`
}
async function identificarLeitor(req) {
  if (req.auth?.uid) return req.auth.uid
  const uid = uidVisitante(req.data?.dispositivoBiblioteca)
  const vinculo = (await admin.database().ref(`bibliotecaVinculosVisitantes/${uid}`).get()).val()
  if (vinculo?.uid) throw new HttpsError('permission-denied', 'Conecte-se à conta vinculada às compras deste aparelho.')
  return uid
}
exports.uidVisitante = uidVisitante
exports.identificarLeitor = identificarLeitor
exports.catalogoBibliotecaVisitante = onCall(OPCOES, async () => {
  const livros = (await admin.database().ref('bibliotecaLivros').get()).val() || {}
  return Object.fromEntries(Object.entries(livros).filter(([, livro]) => livro.publicado !== false && !livro.excluido))
})
exports.acessosBibliotecaVisitante = onCall(OPCOES, async (req) => {
  const uid = await identificarLeitor(req)
  return (await admin.database().ref(`bibliotecaAcessos/${uid}`).get()).val() || {}
})
exports.vincularComprasBibliotecaVisitante = onCall(OPCOES, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Conecte-se para vincular suas compras.')
  const visitante = uidVisitante(req.data?.dispositivoBiblioteca)
  const db = admin.database()
  const acessos = (await db.ref(`bibliotecaAcessos/${visitante}`).get()).val() || {}
  const pedidos = (await db.ref('bibliotecaPedidos').orderByChild('uid').equalTo(visitante).get()).val() || {}
  if (!Object.keys(acessos).length && !Object.keys(pedidos).length) {
    if (req.data?.recuperar === true) throw new HttpsError('not-found', 'Nenhuma compra foi encontrada para esta chave.')
    return { ok: true }
  }
  // Reserva exclusiva: o mesmo comprovante não pode vincular-se a duas contas.
  const reserva = await db.ref(`bibliotecaVinculosVisitantes/${visitante}`).transaction((atual) => {
    if (atual?.uid && atual.uid !== uid) return undefined
    return atual || { uid, criadoEm: Date.now() }
  })
  if (!reserva.committed) throw new HttpsError('permission-denied', 'Estas compras já foram vinculadas a outra conta.')
  const confirmados = (await db.ref(`bibliotecaAcessos/${visitante}`).get()).val() || {}
  for (const [livroId, acesso] of Object.entries(confirmados)) {
    if (acesso?.ativo !== true) continue
    await db.ref(`bibliotecaAcessos/${uid}/${livroId}`).transaction((atual) => atual?.ativo === true ? atual : { ...acesso, vinculadoEm: Date.now() })
  }
  return { ok: true }
})
