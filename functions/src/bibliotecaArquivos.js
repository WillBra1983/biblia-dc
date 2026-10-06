const admin = require('./firebaseAdmin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { decidirArquivo } = require('./bibliotecaDegustacao')
const { gerarAmostraAutomatica, VERSAO_AMOSTRA } = require('./bibliotecaAmostraAutomatica')
const { createHash } = require('node:crypto')
const { personalizarExemplar, VERSAO_EXEMPLAR } = require('./bibliotecaExemplarPersonalizado')

const R2_ACCOUNT_ID = defineSecret('R2_ACCOUNT_ID')
const R2_ACCESS_KEY_ID = defineSecret('R2_ACCESS_KEY_ID')
const R2_SECRET_ACCESS_KEY = defineSecret('R2_SECRET_ACCESS_KEY')
const R2_BUCKET_NAME = defineSecret('R2_BUCKET_NAME')
const SEGREDOS = [R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME]
const OPCOES = { region: 'us-central1', maxInstances: 5, cors: true, secrets: SEGREDOS }
const MAXIMO_BYTES = 100 * 1024 * 1024

function texto(valor, limite = 200) {
  return String(valor || '').trim().slice(0, limite)
}

function idSeguro(valor) {
  return texto(valor, 100).replace(/[^a-zA-Z0-9_-]/g, '')
}

function normalizarFinalidade(valor) {
  if (!['completo', 'amostra'].includes(valor)) {
    throw new HttpsError('invalid-argument', 'Escolha se o arquivo é o livro completo ou uma amostra.')
  }
  return valor
}

function normalizarFormato(nome, contentType) {
  const nomeNormalizado = texto(nome, 240).toLowerCase()
  const tipo = texto(contentType, 100).toLowerCase()
  if (nomeNormalizado.endsWith('.pdf') || tipo === 'application/pdf') {
    return { formato: 'pdf', contentType: 'application/pdf' }
  }
  if (nomeNormalizado.endsWith('.epub') || ['application/epub+zip', 'application/octet-stream'].includes(tipo)) {
    return { formato: 'epub', contentType: 'application/epub+zip' }
  }
  throw new HttpsError('invalid-argument', 'Envie um arquivo PDF ou EPUB.')
}

async function exigirAdmin(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'É preciso estar autenticado.')
  const snap = await admin.database().ref(`users/${uid}/admin`).get()
  if (snap.val() !== true) throw new HttpsError('permission-denied', 'Apenas administradores podem realizar esta ação.')
}

function clienteR2() {
  const accountId = R2_ACCOUNT_ID.value()
  const accessKeyId = R2_ACCESS_KEY_ID.value()
  const secretAccessKey = R2_SECRET_ACCESS_KEY.value()
  const bucket = R2_BUCKET_NAME.value()
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new HttpsError('failed-precondition', 'O armazenamento privado da Biblioteca ainda não foi configurado.')
  }
  return {
    bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  }
}

exports.prepararUploadLivroBiblioteca = onCall(OPCOES, async (req) => {
  await exigirAdmin(req.auth?.uid)
  const livroId = idSeguro(req.data?.livroId)
  const finalidade = normalizarFinalidade(req.data?.finalidade)
  const tamanho = Math.round(Number(req.data?.tamanho) || 0)
  if (!livroId) throw new HttpsError('invalid-argument', 'Livro inválido.')
  if (tamanho < 1 || tamanho > MAXIMO_BYTES) {
    throw new HttpsError('invalid-argument', 'O arquivo deve ter no máximo 100 MB.')
  }
  const { formato, contentType } = normalizarFormato(req.data?.nome, req.data?.contentType)
  const chave = `biblioteca/${livroId}/${finalidade}.${formato}`
  const { client, bucket } = clienteR2()
  const url = await getSignedUrl(client, new PutObjectCommand({
    Bucket: bucket,
    Key: chave,
    ContentType: contentType,
  }), { expiresIn: 15 * 60 })
  return { url, chave, formato, contentType, expiraEm: Date.now() + 15 * 60 * 1000 }
})

exports.confirmarUploadLivroBiblioteca = onCall(OPCOES, async (req) => {
  await exigirAdmin(req.auth?.uid)
  const livroId = idSeguro(req.data?.livroId)
  const finalidade = normalizarFinalidade(req.data?.finalidade)
  const { formato, contentType } = normalizarFormato(req.data?.nome, req.data?.contentType)
  const chave = `biblioteca/${livroId}/${finalidade}.${formato}`
  const { client, bucket } = clienteR2()
  let cabecalho
  try {
    cabecalho = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: chave }))
  } catch {
    throw new HttpsError('not-found', 'O arquivo não foi localizado após o envio.')
  }
  const agora = Date.now()
  const metadados = {
    chave,
    formato,
    contentType,
    tamanho: Number(cabecalho.ContentLength) || Number(req.data?.tamanho) || 0,
    nome: texto(req.data?.nome, 240),
    atualizadoEm: agora,
    atualizadoPor: req.auth.uid,
  }
  await admin.database().ref(`bibliotecaLivros/${livroId}/arquivos/${finalidade}`).set(metadados)
  await admin.database().ref(`bibliotecaLivros/${livroId}/atualizadoEm`).set(agora)
  return { ok: true, arquivo: metadados }
})

exports.obterArquivoLivroBiblioteca = onCall({ ...OPCOES, memory: '1GiB', concurrency: 1, timeoutSeconds: 180 }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para ler.')
  const livroId = idSeguro(req.data?.livroId)
  const finalidade = normalizarFinalidade(req.data?.finalidade)
  if (!livroId) throw new HttpsError('invalid-argument', 'Livro inválido.')

  const db = admin.database()
  const [livroSnap, adminSnap, acessoSnap] = await Promise.all([
    db.ref(`bibliotecaLivros/${livroId}`).get(),
    db.ref(`users/${uid}/admin`).get(),
    db.ref(`bibliotecaAcessos/${uid}/${livroId}/ativo`).get(),
  ])
  const livro = livroSnap.val() || {}
  const ehAdmin = adminSnap.val() === true
  const comprado = acessoSnap.val() === true
  const agora = Date.now()
  const decisao = decidirArquivo({ livro, finalidade, ehAdmin, comprado, download: req.data?.download === true, agora })
  if (decisao.erro) throw new HttpsError('permission-denied', decisao.erro)
  const arquivo = livro.arquivos?.[decisao.finalidade]
  if (!arquivo?.chave || !['pdf', 'epub'].includes(arquivo.formato)) {
    throw new HttpsError('not-found', finalidade === 'amostra' ? 'Este livro ainda não possui amostra.' : 'O arquivo deste livro ainda não foi enviado.')
  }
  const { client, bucket } = clienteR2()
  let chaveLeitura = arquivo.chave
  let restricao = null
  let codigoExemplar = null
  if (req.data?.download === true && !ehAdmin) {
    const conta = await admin.auth().getUser(uid)
    const nomeComprador = texto(conta.displayName, 100) || 'Comprador identificado pela licença'
    codigoExemplar = `BDC-${createHash('sha256').update(JSON.stringify([uid, livroId])).digest('hex').slice(0, 20).toUpperCase()}`
    const hash = createHash('sha256').update(JSON.stringify([arquivo.chave, arquivo.atualizadoEm, arquivo.tamanho, codigoExemplar, nomeComprador, VERSAO_EXEMPLAR])).digest('hex')
    chaveLeitura = `biblioteca-exemplares/${livroId}/${hash}.${arquivo.formato}`
    try { await client.send(new HeadObjectCommand({ Bucket: bucket, Key: chaveLeitura })) }
    catch (erro) {
      if (erro.$metadata?.httpStatusCode !== 404 && erro.name !== 'NotFound') throw new HttpsError('unavailable', 'Não foi possível consultar seu exemplar.')
      try {
        const origem = await client.send(new GetObjectCommand({ Bucket: bucket, Key: arquivo.chave }))
        if (Number(origem.ContentLength) > MAXIMO_BYTES) throw new Error('Arquivo muito grande.')
        const bytes = Buffer.from(await origem.Body.transformToByteArray())
        if (bytes.length > MAXIMO_BYTES) throw new Error('Arquivo muito grande.')
        const copia = await personalizarExemplar(bytes, arquivo.formato, codigoExemplar, nomeComprador)
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: chaveLeitura, Body: copia, ContentType: arquivo.contentType }))
      } catch (falha) {
        console.error('Falha ao personalizar exemplar', livroId, falha.message)
        throw new HttpsError('failed-precondition', 'Não foi possível preparar seu exemplar personalizado. O original não será entregue para download.')
      }
    }
    await db.ref(`bibliotecaLicencas/${codigoExemplar}`).transaction((atual) => atual || { uid, livroId, criadoEm: Date.now() })
  }
  if (decisao.gerarAmostra) {
    const hash = createHash('sha256').update(JSON.stringify([arquivo.chave, arquivo.atualizadoEm, arquivo.tamanho, decisao.degustacao.percentual, VERSAO_AMOSTRA])).digest('hex')
    chaveLeitura = `biblioteca-amostras/${livroId}/${hash}.${arquivo.formato}`
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: chaveLeitura }))
      restricao = JSON.parse(head.Metadata?.restricao || 'null')
      if (!restricao || restricao.percentual !== decisao.degustacao.percentual) throw new Error('Amostra sem metadados')
    } catch (erro) {
      if (erro.$metadata?.httpStatusCode && erro.$metadata.httpStatusCode !== 404) throw new HttpsError('unavailable', 'Não foi possível consultar a amostra agora.')
      try {
        const origem = await client.send(new GetObjectCommand({ Bucket: bucket, Key: arquivo.chave }))
        if (Number(origem.ContentLength) > MAXIMO_BYTES) throw new Error('Livro muito grande para recorte automático.')
        const bytes = Buffer.from(await origem.Body.transformToByteArray())
        if (bytes.length > MAXIMO_BYTES) throw new Error('Livro muito grande para recorte automático.')
        const amostra = await gerarAmostraAutomatica(bytes, arquivo.formato, decisao.degustacao.percentual)
        const { bytes: conteudo, ...metadados } = amostra
        restricao = metadados
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: chaveLeitura, Body: conteudo, ContentType: arquivo.contentType, Metadata: { restricao: JSON.stringify(restricao) } }))
      } catch (falha) {
        console.error('Falha na amostra automática', livroId, falha.message)
        throw new HttpsError('failed-precondition', 'Não foi possível preparar uma amostra segura deste arquivo. O livro completo não foi disponibilizado.')
      }
    }
  }
  const segundos = decisao.acessoAte ? Math.max(1, Math.min(300, Math.floor((decisao.acessoAte - agora) / 1000))) : 300
  const url = await getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket,
    Key: chaveLeitura,
    ResponseContentType: arquivo.contentType || (arquivo.formato === 'pdf' ? 'application/pdf' : 'application/epub+zip'),
    ResponseContentDisposition: `${req.data?.download === true ? 'attachment' : 'inline'}; filename="${livroId}.${arquivo.formato}"`,
  }), { expiresIn: segundos })
  if (req.data?.eventoId && !ehAdmin && req.data?.download !== true) {
    await require('./bibliotecaAcessos').salvarAcesso(uid, { eventoId: req.data.eventoId, tipo: 'leitura', livroId, modalidade: decisao.gerarAmostra ? 'amostra_percentual' : decisao.acessoAte ? 'promocao_tempo' : finalidade === 'amostra' && !comprado ? 'amostra' : 'comprado' }).catch((erro) => console.warn('Registro da biblioteca indisponível', erro.code || 'erro'))
  }
  return {
    url,
    formato: arquivo.formato,
    contentType: arquivo.contentType,
    versao: Number(arquivo.atualizadoEm || livro.atualizadoEm || 0),
    expiraEm: agora + segundos * 1000,
    acessoAte: decisao.acessoAte || null,
    servidorAgora: agora,
    degustacao: decisao.degustacao || null,
    restricao,
    codigoExemplar,
  }
})

exports.excluirArquivoLivroBiblioteca = onCall(OPCOES, async (req) => {
  await exigirAdmin(req.auth?.uid)
  const livroId = idSeguro(req.data?.livroId)
  const finalidade = normalizarFinalidade(req.data?.finalidade)
  const ref = admin.database().ref(`bibliotecaLivros/${livroId}/arquivos/${finalidade}`)
  const arquivo = (await ref.get()).val()
  if (arquivo?.chave) {
    const { client, bucket } = clienteR2()
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: arquivo.chave }))
  }
  await ref.remove()
  return { ok: true }
})
