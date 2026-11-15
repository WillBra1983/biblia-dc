const admin = require('./firebaseAdmin')
const QRCode = require('qrcode')
const { crc16, validarCopiaCola } = require('./bibliotecaPixPayload')
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

function criarPayloadPix({ chave, nome, cidade, valorCentavos, txid }) {
  const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave)
  const valor = (valorCentavos / 100).toFixed(2)
  const base = [
    tlv('00', '01'), tlv('26', conta), tlv('52', '0000'),
    tlv('53', '986'), tlv('54', valor), tlv('58', 'BR'),
    tlv('59', somenteAscii(nome, 25)), tlv('60', somenteAscii(cidade, 15)),
    tlv('62', tlv('05', somenteAscii(txid, 25))), '6304',
  ].join('')
  return base + crc16(base)
}

function payloadConfigurado(pix, valorCentavos, txid) {
  if (pix.pixCopiaCola || String(pix.chave).startsWith('000201')) {
    let completo
    try { completo = validarCopiaCola(pix.pixCopiaCola || pix.chave) }
    catch { throw new HttpsError('failed-precondition', 'O Pix cadastrado está incompleto. Salve novamente o código completo em Configurar Pix.') }
    if (completo.valor && Math.round(Number(completo.valor) * 100) !== valorCentavos) throw new HttpsError('failed-precondition', 'O valor do Pix cadastrado é diferente do preço do livro. Cadastre um código sem valor fixo.')
    return completo.codigo
  }
  return criarPayloadPix({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, valorCentavos, txid })
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
  const entrada = String(req.data?.chave || '').trim()
  let completo = null
  if (entrada.startsWith('000201')) {
    try { completo = validarCopiaCola(entrada) }
    catch (erro) { throw new HttpsError('invalid-argument', erro.message) }
  } else if (entrada.length > 77) {
    throw new HttpsError('invalid-argument', 'Chave Pix inválida. Informe somente a chave ou o Pix Copia e Cola completo.')
  }
  const chave = completo?.chave || entrada
  const nome = completo?.nome || somenteAscii(req.data?.nome, 25)
  const cidade = completo?.cidade || somenteAscii(req.data?.cidade, 15)
  const ativo = req.data?.ativo !== false
  if (ativo && (!chave || !nome || !cidade)) {
    throw new HttpsError('invalid-argument', 'Informe a chave Pix, o nome do recebedor e a cidade.')
  }
  await admin.database().ref('bibliotecaConfiguracao/pix').set({
    chave, nome, cidade, pixCopiaCola: completo?.codigo || '', ativo, atualizadoEm: Date.now(), atualizadoPor: req.auth.uid,
  })
  return { ok: true }
})

exports.criarPedidoPixBiblioteca = onCall(OPCOES, async (req) => {
  const uid = await identificarLeitor(req)
  const livroId = texto(req.data?.livroId, 100).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!livroId) throw new HttpsError('invalid-argument', 'Livro inválido.')

  const nomeInformado = String(req.data?.nomeComprador || '').trim().replace(/\s+/g, ' ')
  if (!req.auth?.uid && (nomeInformado.length < 5 || nomeInformado.length > 160 || !/^\p{L}[\p{L}\p{M}'’.-]*(?: \p{L}[\p{L}\p{M}'’.-]*)+$/u.test(nomeInformado))) {
    throw new HttpsError('invalid-argument', 'Informe seu nome completo, com nome e sobrenome, para comprar sem login.')
  }
  const nomeComprador = req.auth?.uid ? texto(req.auth.token?.name || req.auth.token?.email, 160) : nomeInformado

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
    if (valor.livroId === livroId && ['aguardando_pagamento', 'pagamento_informado', 'recusado'].includes(valor.status)) {
      if (!existente || Number(valor.criadoEm || 0) > Number(existente.criadoEm || 0)) existente = { id: item.key, ...valor }
    }
  })
  if (existente?.pixCopiaCola) {
    if (!req.auth?.uid && existente.nomeComprador !== nomeComprador) {
      await db.ref(`bibliotecaPedidos/${existente.id}`).update({ nomeComprador, atualizadoEm: Date.now() })
      existente.nomeComprador = nomeComprador
    }
    const payloadAtual = existente.status === 'aguardando_pagamento'
      ? payloadConfigurado(pix, existente.valorCentavos, existente.codigo)
      : existente.pixCopiaCola
    if (existente.pixCopiaCola !== payloadAtual) {
      await db.ref(`bibliotecaPedidos/${existente.id}`).update({ pixCopiaCola: payloadAtual, atualizadoEm: Date.now() })
      existente.pixCopiaCola = payloadAtual
    }
    const qrCodeDataUrl = await QRCode.toDataURL(existente.pixCopiaCola, { width: 420, margin: 2, errorCorrectionLevel: 'M' })
    return {
      ok: true, pedidoId: existente.id, codigo: existente.codigo,
      valorCentavos: existente.valorCentavos, pixCopiaCola: existente.pixCopiaCola,
      qrCodeDataUrl, informado: existente.status === 'pagamento_informado',
      status: existente.status, observacaoAdmin: existente.observacaoAdmin || '', respostaCliente: existente.respostaCliente || '',
    }
  }

  const pedidoRef = db.ref('bibliotecaPedidos').push()
  const codigo = `BDC${pedidoRef.key.slice(-12).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`.slice(0, 25)
  const payload = payloadConfigurado(pix, valorCentavos, codigo)
  const qrCodeDataUrl = await QRCode.toDataURL(payload, { width: 420, margin: 2, errorCorrectionLevel: 'M' })
  const agora = Date.now()
  const token = req.auth?.token || {}
  await pedidoRef.set({
    uid, email: texto(token.email, 240), nomeComprador,
    livroId, livroTitulo: texto(livro.titulo, 180), valorCentavos,
    codigo, pixCopiaCola: payload, status: 'aguardando_pagamento', criadoEm: agora, atualizadoEm: agora,
  })
  return { ok: true, pedidoId: pedidoRef.key, codigo, valorCentavos, pixCopiaCola: payload, qrCodeDataUrl, status: 'aguardando_pagamento', informado: false }
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
  await ref.update({ status: 'pagamento_informado', ocultoAdmin: false, informadoEm: agora, atualizadoEm: agora })
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
  if (pedido.status !== 'pagamento_informado' && !(aprovado && pedido.status === 'recusado')) {
    throw new HttpsError('failed-precondition', 'Somente pagamentos informados podem ser analisados.')
  }
  const agora = Date.now()
  const observacaoAdmin = aprovado ? '' : texto(req.data?.observacao, 1000) || 'Não localizamos o recebimento deste Pix. Se você pagou, entre em contato e envie o comprovante para conferência. Se ainda não pagou, avise por aqui.'
  const atualizacoes = {
    [`bibliotecaPedidos/${pedidoId}/observacaoAdmin`]: observacaoAdmin,
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
      : { title: 'Pagamento não localizado', body: `Não localizamos o Pix de “${pedido.livroTitulo}”. Veja a observação na sua compra.` },
    data: { tipo: 'biblioteca_pix', url: aprovado ? `/biblioteca/${pedido.livroId}/ler` : '/biblioteca', pedidoId },
  })
  return { ok: true }
})


// Remove uma tentativa da lista administrativa sem invalidar um Pix já copiado.
exports.removerPendenciaPixBiblioteca = onCall(OPCOES, async (req) => {
  await exigirAdmin(req.auth?.uid)
  const pedidoId = texto(req.data?.pedidoId, 120).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!pedidoId) throw new HttpsError('invalid-argument', 'Pedido inválido.')
  const ref = admin.database().ref(`bibliotecaPedidos/${pedidoId}`)
  const resultado = await ref.transaction((pedido) => {
    // O primeiro valor pode ser null enquanto o SDK ainda não tem cache local.
    // Mantê-lo permite comparar com o servidor e repetir com o pedido real.
    // Retornar undefined aqui abortaria antes dessa leitura.
    if (pedido === null) return null
    if (!pedido || pedido.status !== 'aguardando_pagamento') return undefined
    return { ...pedido, ocultoAdmin: true, removidoDaListaEm: Date.now(), removidoDaListaPor: req.auth.uid }
  })
  if (!resultado.snapshot.exists()) throw new HttpsError('not-found', 'Pedido não encontrado. Atualize a lista de pagamentos.')
  if (!resultado.committed) throw new HttpsError('failed-precondition', 'Somente pedidos aguardando pagamento podem ser removidos da lista.')
  return { ok: true }
})

async function pedidoDoLeitor(req) {
  const uid = await identificarLeitor(req)
  const pedidoId = texto(req.data?.pedidoId, 120).replace(/[^a-zA-Z0-9_-]/g, '')
  if (!pedidoId) throw new HttpsError('invalid-argument', 'Pedido inválido.')
  const ref = admin.database().ref(`bibliotecaPedidos/${pedidoId}`)
  const pedido = (await ref.get()).val()
  const vinculo = pedido?.uid?.startsWith('visitante_') ? (await admin.database().ref(`bibliotecaVinculosVisitantes/${pedido.uid}`).get()).val() : null
  if (!pedido || (pedido.uid !== uid && vinculo?.uid !== uid)) throw new HttpsError('not-found', 'Pedido não encontrado.')
  return { ref, pedido }
}
exports.consultarPedidoPixBiblioteca = onCall(OPCOES, async (req) => {
  const leitura = await pedidoDoLeitor(req)
  let pedido = leitura.pedido
  if (req.data?.incluirPix === true && pedido.status === 'aguardando_pagamento') {
    const pix = (await admin.database().ref('bibliotecaConfiguracao/pix').get()).val() || {}
    if (pix.ativo === true && pix.chave && pix.nome && pix.cidade) {
      const resultado = await leitura.ref.transaction((atual) => {
        if (atual === null) return null
        if (atual.status !== 'aguardando_pagamento') return undefined
        return { ...atual, pixCopiaCola: payloadConfigurado(pix, atual.valorCentavos, atual.codigo) }
      })
      pedido = resultado.snapshot.val()
      if (!pedido) throw new HttpsError('not-found', 'Pedido não encontrado.')
    }
  }
  return { status: pedido.status, informado: pedido.status === 'pagamento_informado', observacaoAdmin: pedido.observacaoAdmin || '', respostaCliente: pedido.respostaCliente || '',
    ...(req.data?.incluirPix === true ? await apresentarPix(pedido, req.data.pedidoId) : {}) }
})

async function apresentarPix(pedido, pedidoId) {
  return {
    pedidoId, livroId: pedido.livroId, livroTitulo: pedido.livroTitulo || 'Livro',
    nomeComprador: pedido.nomeComprador || '', codigo: pedido.codigo,
    valorCentavos: pedido.valorCentavos, pixCopiaCola: pedido.pixCopiaCola,
    qrCodeDataUrl: await QRCode.toDataURL(pedido.pixCopiaCola, { width: 420, margin: 2, errorCorrectionLevel: 'M' }),
  }
}

// Consulta autenticada no servidor: inclui compras de visitantes vinculados,
// sem conceder leitura pública à coleção de pedidos.
exports.listarMeusPedidosPixBiblioteca = onCall(OPCOES, async (req) => {
  const uid = await identificarLeitor(req)
  const db = admin.database()
  const donos = [uid]
  if (req.auth?.uid) {
    const vinculos = await db.ref('bibliotecaVinculosVisitantes').orderByChild('uid').equalTo(uid).get()
    vinculos.forEach((item) => { if (item.val()?.uid === uid) donos.push(item.key) })
  }
  const consultas = await Promise.all(donos.map((dono) => db.ref('bibliotecaPedidos').orderByChild('uid').equalTo(dono).get()))
  const pedidos = []
  consultas.forEach((snap, indice) => snap.forEach((item) => {
    const pedido = item.val() || {}
    if (pedido.uid !== donos[indice] || !['recusado', 'aguardando_pagamento', 'pagamento_informado'].includes(pedido.status)) return
    pedidos.push({ pedidoId: item.key, livroId: pedido.livroId, livroTitulo: pedido.livroTitulo || 'Livro',
      status: pedido.status, observacaoAdmin: pedido.observacaoAdmin || '', atualizadoEm: pedido.atualizadoEm || pedido.criadoEm || 0 })
  }))
  return { pedidos: pedidos.sort((a, b) => (Number(b.status === 'recusado') - Number(a.status === 'recusado')) || b.atualizadoEm - a.atualizadoEm) }
})

exports.responderPagamentoNaoLocalizadoBiblioteca = onCall(OPCOES, async (req) => {
  const { ref } = await pedidoDoLeitor(req)
  const pix = (await admin.database().ref('bibliotecaConfiguracao/pix').get()).val() || {}
  if (pix.ativo !== true || !pix.chave || !pix.nome || !pix.cidade) throw new HttpsError('failed-precondition', 'O recebimento por Pix ainda não foi configurado.')
  const resultado = await ref.transaction((pedido) => {
    if (pedido === null) return null
    // Repetir a mesma resposta é seguro, mas nunca reabre pagamento em análise ou aprovado.
    if (!pedido || !(pedido.status === 'recusado' || (pedido.status === 'aguardando_pagamento' && pedido.respostaCliente === 'Ainda não fiz o pagamento.'))) return undefined
    return { ...pedido, pixCopiaCola: payloadConfigurado(pix, pedido.valorCentavos, pedido.codigo), status: 'aguardando_pagamento', respostaCliente: 'Ainda não fiz o pagamento.', respondidoEm: Date.now(), atualizadoEm: Date.now(), ocultoAdmin: false }
  })
  if (!resultado.snapshot.exists()) throw new HttpsError('not-found', 'Pedido não encontrado. Atualize suas compras.')
  if (!resultado.committed) throw new HttpsError('failed-precondition', 'Este pedido não aguarda uma resposta sobre o pagamento.')
  return { ok: true, status: 'aguardando_pagamento', informado: false, respostaCliente: 'Ainda não fiz o pagamento.', ...await apresentarPix(resultado.snapshot.val(), req.data.pedidoId) }
})
