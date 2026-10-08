const admin = require('./firebaseAdmin')
const QRCode = require('qrcode')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { enviarParaUsuarios } = require('./push')
const { identificarLeitor } = require('./bibliotecaVisitante')

const OPCOES = { region: 'us-central1', maxInstances: 5, cors: true }

function texto(valor, limite = 200) {
  return String(valor || '').trim().slice(0, limite)
}

function somenteAscii(valor, limite) {
  return texto(valor, limite * 2)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .toUpperCase().slice(0, limite)
}

function tlv(id, valor) {
  const conteudo = String(valor)
  return `${id}${String(Buffer.byteLength(conteudo, 'utf8')).padStart(2, '0')}${conteudo}`
}

function crc16(valor) {
  let crc = 0xffff
  for (const byte of Buffer.from(valor, 'utf8')) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function criarPayloadPix({ chave, nome, cidade, valorCentavos, txid }) {
  const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave)
  const valor = (valorCentavos / 100).toFixed(2)
  const base = [
    tlv('00', '01'), tlv('01', '12'), tlv('26', conta), tlv('52', '0000'),
    tlv('53', '986'), tlv('54', valor), tlv('58', 'BR'),
    tlv('59', somenteAscii(nome, 25)), tlv('60', somenteAscii(cidade, 15)),
    tlv('62', tlv('05', somenteAscii(txid, 25))), '6304',
  ].join('')
  return base + crc16(base)
}

async function exigirAdmin(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
  const snap = await admin.database().ref(`users/${uid}/admin`).get()
  if (snap.val() !== true) throw new HttpsError('permission-denied', 'Apenas administradores podem realizar esta ação.')
}

async function listarAdministradores() {
  const snap = await admin.database().ref('users').orderByChild('admin').equalTo(true).get()
  const uids = []
  snap.forEach((item) => uids.push(item.key))
  return uids
}

exports.salvarConfiguracaoPixBiblioteca = onCall(OPCOES, async (req) => {
  await exigirAdmin(req.auth?.uid)
  const chave = texto(req.data?.chave, 100)
  const nome = somenteAscii(req.data?.nome, 25)
  const cidade = somenteAscii(req.data?.cidade, 15)
  const ativo = req.data?.ativo !== false
  if (ativo && (!chave || !nome || !cidade)) {
    throw new HttpsError('invalid-argument', 'Informe a chave Pix, o nome do recebedor e a cidade.')
  }
  await admin.database().ref('bibliotecaConfiguracao/pix').set({
    chave, nome, cidade, ativo, atualizadoEm: Date.now(), atualizadoPor: req.auth.uid,
  })
  return { ok: true }
})

exports.criarPedidoPixBiblioteca = onCall(OPCOES, async (req) => {
  const uid = await identificarLeitor(req)
  const livroId = texto(req.data?.livroId, 100).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!livroId) throw new HttpsError('invalid-argument', 'Livro inválido.')

  const db = admin.database()
  const [livroSnap, pixSnap, acessoSnap] = await Promise.all([
    db.ref(`bibliotecaLivros/${livroId}`).get(),
    db.ref('bibliotecaConfiguracao/pix').get(),
    db.ref(`bibliotecaAcessos/${uid}/${livroId}`).get(),
  ])
  if (acessoSnap.child('ativo').val() === true) return { ok: true, jaPossui: true }
  const livro = livroSnap.val() || {}
  const pix = pixSnap.val() || {}
  const valorCentavos = Math.round(Number(livro.precoPixCentavos) || 0)
  if (livro.publicado === false || livro.pixAtivo !== true || valorCentavos < 1 || !livro.arquivos?.completo?.chave) {
    throw new HttpsError('failed-precondition', 'Este livro não está disponível para compra por Pix.')
  }
  if (pix.ativo !== true || !pix.chave || !pix.nome || !pix.cidade) {
    throw new HttpsError('failed-precondition', 'O recebimento por Pix ainda não foi configurado.')
  }

  const existentesSnap = await db.ref('bibliotecaPedidos').orderByChild('uid').equalTo(uid).get()
  let existente = null
  existentesSnap.forEach((item) => {
    const valor = item.val() || {}
    if (valor.livroId === livroId && ['aguardando_pagamento', 'pagamento_informado'].includes(valor.status)) {
      if (!existente || Number(valor.criadoEm || 0) > Number(existente.criadoEm || 0)) existente = { id: item.key, ...valor }
    }
  })
  if (existente?.pixCopiaCola) {
    const qrCodeDataUrl = await QRCode.toDataURL(existente.pixCopiaCola, { width: 420, margin: 2, errorCorrectionLevel: 'M' })
    return {
      ok: true, pedidoId: existente.id, codigo: existente.codigo,
      valorCentavos: existente.valorCentavos, pixCopiaCola: existente.pixCopiaCola,
      qrCodeDataUrl, informado: existente.status === 'pagamento_informado',
    }
  }

  const pedidoRef = db.ref('bibliotecaPedidos').push()
  const codigo = `BDC${pedidoRef.key.slice(-12).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`.slice(0, 25)
  const payload = criarPayloadPix({
    chave: texto(pix.chave, 100), nome: pix.nome, cidade: pix.cidade, valorCentavos, txid: codigo,
  })
  const qrCodeDataUrl = await QRCode.toDataURL(payload, { width: 420, margin: 2, errorCorrectionLevel: 'M' })
  const agora = Date.now()
  const token = req.auth?.token || {}
  await pedidoRef.set({
    uid, email: texto(token.email, 240), nomeComprador: texto(token.name || token.email, 160),
    livroId, livroTitulo: texto(livro.titulo, 180), valorCentavos,
    codigo, pixCopiaCola: payload, status: 'aguardando_pagamento', criadoEm: agora, atualizadoEm: agora,
  })
  return { ok: true, pedidoId: pedidoRef.key, codigo, valorCentavos, pixCopiaCola: payload, qrCodeDataUrl }
})

exports.informarPagamentoPixBiblioteca = onCall(OPCOES, async (req) => {
  const uid = await identificarLeitor(req)
  const pedidoId = texto(req.data?.pedidoId, 120).replace(/[^a-zA-Z0-9_-]/g, '')
  const ref = admin.database().ref(`bibliotecaPedidos/${pedidoId}`)
  const snap = await ref.get()
  const pedido = snap.val()
  const vinculo = pedido?.uid?.startsWith('visitante_') ? (await admin.database().ref(`bibliotecaVinculosVisitantes/${pedido.uid}`).get()).val() : null
  if (!pedido || (pedido.uid !== uid && vinculo?.uid !== uid)) throw new HttpsError('not-found', 'Pedido não encontrado.')
  if (pedido.status === 'aprovado') return { ok: true, aprovado: true }
  if (!['aguardando_pagamento', 'pagamento_informado'].includes(pedido.status)) {
    throw new HttpsError('failed-precondition', 'Este pedido não pode mais ser confirmado.')
  }
  const agora = Date.now()
  await ref.update({ status: 'pagamento_informado', informadoEm: agora, atualizadoEm: agora })
  const administradores = await listarAdministradores()
  await enviarParaUsuarios({
    uids: administradores,
    notification: { title: 'Pagamento Pix informado', body: `${pedido.livroTitulo} — ${pedido.nomeComprador || pedido.email || 'comprador'} — R$ ${(pedido.valorCentavos / 100).toFixed(2).replace('.', ',')}` },
    data: { tipo: 'biblioteca_pix', url: '/biblioteca?pedidos=1', pedidoId },
  })
  return { ok: true }
})

exports.decidirPedidoPixBiblioteca = onCall(OPCOES, async (req) => {
  const adminUid = req.auth?.uid
  await exigirAdmin(adminUid)
  const pedidoId = texto(req.data?.pedidoId, 120).replace(/[^a-zA-Z0-9_-]/g, '')
  const aprovado = req.data?.aprovado === true
  const db = admin.database()
  const ref = db.ref(`bibliotecaPedidos/${pedidoId}`)
  const snap = await ref.get()
  const pedido = snap.val()
  if (!pedido) throw new HttpsError('not-found', 'Pedido não encontrado.')
  if (pedido.status === 'aprovado' && aprovado) return { ok: true }
  if (pedido.status !== 'pagamento_informado') {
    throw new HttpsError('failed-precondition', 'Somente pagamentos informados podem ser analisados.')
  }
  const agora = Date.now()
  const atualizacoes = {
    [`bibliotecaPedidos/${pedidoId}/status`]: aprovado ? 'aprovado' : 'recusado',
    [`bibliotecaPedidos/${pedidoId}/atualizadoEm`]: agora,
    [`bibliotecaPedidos/${pedidoId}/decididoEm`]: agora,
    [`bibliotecaPedidos/${pedidoId}/decididoPor`]: adminUid,
  }
  if (aprovado) atualizacoes[`bibliotecaAcessos/${pedido.uid}/${pedido.livroId}`] = {
    ativo: true, origem: 'pix', pedidoId, adquiridoEm: agora,
  }
  await db.ref().update(atualizacoes)
  // Leia o vínculo depois da liberação. A migração também relê os acessos
  // depois de reservar a conta, cobrindo aprovação e login simultâneos.
  const vinculo = pedido.uid.startsWith('visitante_') ? (await db.ref(`bibliotecaVinculosVisitantes/${pedido.uid}`).get()).val() : null
  if (aprovado && vinculo?.uid) await db.ref(`bibliotecaAcessos/${vinculo.uid}/${pedido.livroId}`).transaction((atual) => atual?.ativo === true ? atual : { ativo: true, origem: 'pix', pedidoId, adquiridoEm: agora })
  await enviarParaUsuarios({
    uids: pedido.uid.startsWith('visitante_') ? (vinculo?.uid ? [vinculo.uid] : []) : [pedido.uid],
    notification: aprovado
      ? { title: 'Pagamento confirmado', body: `Seu acesso a “${pedido.livroTitulo}” foi liberado.` }
      : { title: 'Pagamento não localizado', body: `Não conseguimos confirmar o Pix de “${pedido.livroTitulo}”. Fale com o suporte para conferirmos.` },
    data: { tipo: 'biblioteca_pix', url: aprovado ? `/biblioteca/${pedido.livroId}/ler` : '/biblioteca', pedidoId },
  })
  return { ok: true }
})

