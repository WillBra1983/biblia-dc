const admin = require('./firebaseAdmin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

function atualizarInteracao(estado, uid, dados, anteriores = {}) {
  const atual = estado || { curtidas: { ...anteriores }, likesCount: Object.values(anteriores).filter((valor) => valor === true).length, sharesCount: 0 }
  atual.curtidas = atual.curtidas || {}
  if (dados.tipo === 'curtida') {
    if (dados.curtido) atual.curtidas[uid] = true
    else delete atual.curtidas[uid]
    atual.likesCount = Object.values(atual.curtidas).filter((valor) => valor === true).length
  } else if (dados.tipo === 'compartilhamento') {
    atual.envios = atual.envios || {}
    const chave = `${uid}_${dados.eventoId}`
    if (!atual.envios[chave]) {
      atual.envios[chave] = true
      atual.sharesCount = Number(atual.sharesCount || 0) + 1
    }
  }
  return atual
}

exports.registrarInteracaoDestaque = onCall({ region: 'us-central1', maxInstances: 5, cors: true }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na conta para registrar a interação.')
  const dados = req.data || {}
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(dados.id || '') || !['curtida', 'compartilhamento', 'consulta'].includes(dados.tipo)
    || (dados.tipo === 'curtida' && typeof dados.curtido !== 'boolean')
    || (dados.tipo === 'compartilhamento' && !/^[a-zA-Z0-9_-]{1,100}$/.test(dados.eventoId || ''))) {
    throw new HttpsError('invalid-argument', 'Interação inválida.')
  }
  const db = admin.database()
  if (!(await db.ref(`destaquesMenu/${dados.id}`).get()).exists()) throw new HttpsError('not-found', 'Destaque indisponível.')
  const anteriores = (await db.ref(`destaquesMenuCurtidas/${dados.id}`).get()).val() || {}
  const resultado = await db.ref(`destaquesMenuInteracoes/${dados.id}`).transaction((estado) => atualizarInteracao(estado, uid, dados, anteriores))
  const estado = resultado.snapshot.val()
  return { curtido: estado.curtidas?.[uid] === true, likesCount: estado.likesCount || 0, sharesCount: estado.sharesCount || 0 }
})
exports.atualizarInteracao = atualizarInteracao
