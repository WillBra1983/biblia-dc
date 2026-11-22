const admin = require('./firebaseAdmin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { randomBytes, createHash } = require('node:crypto')
const { totaisIndicacoes } = require('./projetoIndicacoesContagem')
const OPCOES = { region: 'us-central1', maxInstances: 5, cors: true }
const META = 10, SEMANA = 7 * 86400000, PRAZO_CONVITE = 30 * 86400000
const hash = valor => createHash('sha256').update(String(valor)).digest('hex')
const raiz = () => admin.database().ref('projetoIndicacoes')
function dispositivo(req) {
  const valor = req.data?.dispositivo
  if (typeof valor !== 'string' || valor.length < 16 || valor.length > 160) throw new HttpsError('invalid-argument', 'Não foi possível identificar este aparelho. Tente novamente.')
  return hash(valor)
}
async function conta(req, confirmada = false) {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para acompanhar seus convites.')
  const usuario = await admin.auth().getUser(req.auth.uid)
  if (usuario.disabled || !usuario.providerData?.length) throw new HttpsError('permission-denied', 'Use uma conta pessoal para participar.')
  if (confirmada && (!usuario.email || !usuario.emailVerified)) throw new HttpsError('failed-precondition', 'Confirme o e-mail da sua conta para participar.', { motivo: 'email_nao_confirmado' })
  return usuario
}
async function livrosDisponiveis() {
  const livros = (await admin.database().ref('bibliotecaLivros').get()).val() || {}
  return Object.entries(livros).filter(([, l]) => l.publicado !== false && !l.excluido && l.arquivos?.completo?.chave)
    .map(([id, l]) => ({ id, titulo: String(l.titulo || 'Livro da biblioteca').slice(0, 180), autor: String(l.autor || '').slice(0, 140) }))
}
exports.obterCampanhaProjeto = onCall(OPCOES, async req => {
  await conta(req)
  const aparelho = dispositivo(req), uid = req.auth.uid, codigo = randomBytes(16).toString('hex')
  const referencia = raiz().child(`contas/${uid}`)
  const reserva = await referencia.transaction(atual => atual || { codigo, aparelho, criadoEm: Date.now() })
  const dados = reserva.snapshot.val()
  await raiz().child(`convites/${dados.codigo}`).transaction(atual => atual || { uid, criadoEm: dados.criadoEm })
  const { total, contas, cliquesIos } = totaisIndicacoes(dados)
  const livros = await livrosDisponiveis()
  const compras = (await admin.database().ref(`bibliotecaAcessos/${uid}`).get()).val() || {}
  return { codigo: dados.codigo, total, contasConfirmadas: contas, cliquesIos, meta: META, creditos: Math.max(0, Math.floor(total / META) - Number(dados.resgatados || 0)),
    livros: livros.filter(l => compras[l.id]?.ativo !== true), beneficios: Object.entries(dados.beneficios || {}).filter(([, b]) => b.acessoAte > Date.now()).map(([livroId, b]) => ({ livroId, acessoAte: b.acessoAte, titulo: livros.find(l => l.id === livroId)?.titulo || 'Livro da biblioteca' })) }
})
exports.registrarVisitaConviteProjeto = onCall(OPCOES, async req => {
  const codigo = String(req.data?.codigo || '')
  if (!/^[a-f0-9]{32}$/.test(codigo)) throw new HttpsError('invalid-argument', 'Convite inválido.')
  const convite = (await raiz().child(`convites/${codigo}`).get()).val()
  if (!convite?.uid) throw new HttpsError('not-found', 'Convite não encontrado.')
  const aparelho = dispositivo(req)
  const recibo = randomBytes(24).toString('hex'), criadoEm = Date.now()
  await raiz().child(`visitas/${recibo}`).set({ uid: convite.uid, aparelho, criadoEm })
  return { recibo, expiraEm: criadoEm + PRAZO_CONVITE }
})
exports.confirmarIndicacaoProjeto = onCall(OPCOES, async req => {
  const usuario = await conta(req, true), uid = req.auth.uid, aparelho = dispositivo(req)
  const recibo = String(req.data?.recibo || '')
  if (!/^[a-f0-9]{48}$/.test(recibo)) throw new HttpsError('invalid-argument', 'Convite inválido.')
  const visita = (await raiz().child(`visitas/${recibo}`).get()).val()
  if (!visita || visita.aparelho !== aparelho || Date.now() - visita.criadoEm > PRAZO_CONVITE) throw new HttpsError('failed-precondition', 'Este convite expirou ou pertence a outro aparelho.')
  const criadoEm = Date.parse(usuario.metadata?.creationTime)
  if (visita.uid === uid || !Number.isFinite(criadoEm) || criadoEm < visita.criadoEm) return { contabilizada: false, motivo: 'conta_existente' }
  const dono = (await raiz().child(`contas/${visita.uid}`).get()).val()
  if (!dono || dono.aparelho === aparelho) return { contabilizada: false, motivo: 'mesmo_aparelho' }
  // A mesma conta, e-mail ou aparelho só podem ser creditados uma vez, mesmo com convites diferentes.
  const reserva = { uid, indicador: visita.uid }
  for (const caminho of [`aparelhos/${aparelho}`, `emails/${hash(usuario.email.trim().toLowerCase())}`, `recebimentos/${uid}`]) {
    const resultado = await raiz().child(caminho).transaction(atual => !atual || (atual.uid === uid && atual.indicador === visita.uid) ? (atual || reserva) : undefined)
    if (!resultado.committed) return { contabilizada: false, motivo: 'ja_contabilizada' }
  }
  await raiz().child(`contas/${visita.uid}`).transaction(atual => {
    if (!atual) return null // Permite a repetição automática quando o cache local ainda está vazio.
    return { ...atual, confirmadas: { ...atual.confirmadas, [uid]: atual.confirmadas?.[uid] || Date.now() } }
  })
  return { contabilizada: true }
})
exports.resgatarLeituraProjeto = onCall(OPCOES, async req => {
  await conta(req, true)
  const livroId = String(req.data?.livroId || '')
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(livroId)) throw new HttpsError('invalid-argument', 'Escolha um livro.')
  if (!(await livrosDisponiveis()).some(l => l.id === livroId)) throw new HttpsError('not-found', 'Este livro não está disponível para o benefício.')
  const comprado = (await admin.database().ref(`bibliotecaAcessos/${req.auth.uid}/${livroId}/ativo`).get()).val()
  if (comprado === true) throw new HttpsError('failed-precondition', 'Você já possui este livro. Escolha outro título.')
  const agora = Date.now()
  const resultado = await raiz().child(`contas/${req.auth.uid}`).transaction(atual => {
    if (!atual) return null
    if (Math.floor(totaisIndicacoes(atual).total / META) <= Number(atual.resgatados || 0)) return undefined
    if (Number(atual.beneficios?.[livroId]?.acessoAte || 0) > agora) return undefined
    return { ...atual, resgatados: Number(atual.resgatados || 0) + 1, beneficios: { ...atual.beneficios, [livroId]: { inicioEm: agora, acessoAte: agora + SEMANA } } }
  })
  const beneficio = resultado.snapshot.val()?.beneficios?.[livroId]
  if (!resultado.committed || !beneficio || beneficio.inicioEm !== agora) throw new HttpsError('failed-precondition', 'Confira seus convites: é preciso ter um benefício disponível e escolher um livro sem período ativo.')
  return { livroId, acessoAte: beneficio.acessoAte }
})
