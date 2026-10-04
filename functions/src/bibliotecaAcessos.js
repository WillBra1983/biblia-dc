const admin = require('./firebaseAdmin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const OPCOES = { region: 'us-central1', maxInstances: 5, cors: true }
const idSeguro = (valor) => String(valor || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100)

async function salvarAcesso(uid, dados) {
  const id = idSeguro(dados.eventoId)
  if (!id) throw new HttpsError('invalid-argument', 'Registro de acesso inválido.')
  const criadoEm = Date.now()
  const evento = { uid, tipo: dados.tipo, livroId: dados.livroId || '', modalidade: dados.modalidade || '', criadoEm }
  // O mesmo evento, reenviado por conexão instável, conta só uma vez.
  await admin.database().ref(`bibliotecaEstatisticas/${uid}_${id}`).transaction((valor) => valor || evento)
}

exports.registrarAcessoBiblioteca = onCall(OPCOES, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta.')
  if ((await admin.database().ref(`users/${uid}/admin`).get()).val() === true) return { ok: true }
  if (req.data?.tipo === 'entrada') await salvarAcesso(uid, { tipo: 'entrada', eventoId: req.data.eventoId })
  else if (req.data?.tipo === 'livro') {
    const livroId = idSeguro(req.data.livroId)
    const livro = (await admin.database().ref(`bibliotecaLivros/${livroId}`).get()).val()
    if (!livro || livro.publicado === false || livro.excluido) throw new HttpsError('permission-denied', 'Livro indisponível.')
    await salvarAcesso(uid, { tipo: 'livro', livroId, modalidade: 'detalhes', eventoId: req.data.eventoId })
  } else throw new HttpsError('invalid-argument', 'Tipo de acesso inválido.')
  return { ok: true }
})

exports.listarAcessosBibliotecaAdmin = onCall(OPCOES, async (req) => {
  const uid = req.auth?.uid
  if (!uid || (await admin.database().ref(`users/${uid}/admin`).get()).val() !== true) throw new HttpsError('permission-denied', 'Apenas administradores podem consultar os acessos.')
  const fim = Math.min(Date.now(), Number(req.data?.fim) || Date.now())
  const inicio = Math.max(fim - 93 * 86400000, Number(req.data?.inicio) || fim - 30 * 86400000)
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || inicio > fim) throw new HttpsError('invalid-argument', 'Período inválido.')
  const snap = await admin.database().ref('bibliotecaEstatisticas').orderByChild('criadoEm').startAt(inicio).endAt(fim).limitToLast(5001).get()
  const eventos = Object.values(snap.val() || {})
  const limitado = eventos.length > 5000
  const itens = eventos.slice(-5000)
  const contas = [...new Set(itens.map((item) => item.uid))]
  const usuarios = {}
  for (let i = 0; i < contas.length; i += 100) {
    const lote = await admin.auth().getUsers(contas.slice(i, i + 100).map((id) => ({ uid: id })))
    for (const conta of lote.users) usuarios[conta.uid] = conta.displayName || conta.email || conta.uid
  }
  return { eventos: itens, usuarios, limitado, inicio, fim }
})
exports.salvarAcesso = salvarAcesso
