const admin = require('./firebaseAdmin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

const opcoes = { region: 'us-central1', maxInstances: 5, cors: true }
const caminhoVotos = 'bibliotecaVotos'

function livroPublicado(livro) {
  return livro && livro.publicado !== false && !livro.excluido
}

exports.listarVotosBiblioteca = onCall(opcoes, async (req) => {
  const db = admin.database()
  const catalogo = (await db.ref('bibliotecaLivros').get()).val() || {}
  const uid = req.auth?.uid
  const resultados = await Promise.all(Object.entries(catalogo).filter(([, livro]) => livroPublicado(livro)).map(async ([id]) => {
    const ref = db.ref(caminhoVotos + '/' + id)
    const [total, voto] = await Promise.all([
      ref.child('total').get(),
      uid ? ref.child('contas').child(uid).get() : null,
    ])
    return [id, { total: Number(total.val()) || 0, votou: voto?.val() === true }]
  }))
  return Object.fromEntries(resultados)
})

exports.votarLivroBiblioteca = onCall(opcoes, async (req) => {
  const uid = req.auth?.uid
  if (!uid || req.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Entre na sua conta para votar.')
  }
  const { livroId, votou } = req.data || {}
  if (typeof livroId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(livroId) || typeof votou !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Informe o livro e o voto.')
  }
  const db = admin.database()
  const livro = (await db.ref('bibliotecaLivros/' + livroId).get()).val()
  if (!livroPublicado(livro)) throw new HttpsError('not-found', 'Este livro não está disponível para votação.')
  const { snapshot } = await db.ref(caminhoVotos + '/' + livroId).transaction(atual => {
    const contas = { ...atual?.contas }
    const anterior = contas[uid] === true
    if (anterior === votou) return atual || { total: 0 }
    if (votou) contas[uid] = true
    else delete contas[uid]
    return { contas, total: Object.keys(contas).length }
  })
  return { total: Number(snapshot.child('total').val()) || 0, votou }
})
