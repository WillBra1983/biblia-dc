const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { defineSecret } = require('firebase-functions/params')
const { logger } = require('firebase-functions/v2')
const {
  INSTRUCAO_COMENTARIO_VERSICULO,
  PROMPT_FINGERPRINT,
} = require('./generated/comentarioVersiculoPrompt.cjs')

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const TIMEZONE = 'America/Cuiaba'
const MODEL = 'gemini-2.5-flash'
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || 'https://foundcine.com/biblia').replace(/\/$/, '')
const FUNDOS = ['amanhecer', 'montanhas', 'ceu', 'rio-sereno', 'cachoeira', 'cruz', 'lago', 'caminho', 'mar']
const LOCK_TTL_MS = 4 * 60 * 1000
const WAIT_LIMIT_MS = 170 * 1000
let catalogoCache = null

function dataNoFuso(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

function carregarCatalogo() {
  if (catalogoCache) return catalogoCache
  const file = path.join(__dirname, 'data', 'versiculos-dia.json.gz')
  catalogoCache = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'))
  return catalogoCache
}

function limparNumero(texto) {
  return String(texto || '').replace(/^\s*(?:\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*[.:;,)\-–—]?\s*/, '').trim()
}

function chaveVersiculo(item) {
  return `${item.bookId}_${item.chapter}_${item.verse}`
}

function referencia(item) {
  return `${item.bookName} ${item.chapter}:${item.verse}`
}

function idDestaqueMural(data) {
  return `versiculo-dia-${data}`
}

async function garantirDestaqueMural(db, registro) {
  if (!registro?.data || !registro?.chave) return
  const destaqueRef = db.ref(`versiculosCompartilhadosPublicos/${idDestaqueMural(registro.data)}`)
  await destaqueRef.transaction((atual) => ({
    referencia: registro.referencia,
    texto: registro.texto,
    fundoId: registro.fundoId,
    url: `${PUBLIC_APP_URL}/versiculo-do-dia?data=${encodeURIComponent(registro.data)}`,
    createdAt: Number(registro.criadoEm || atual?.createdAt || Date.now()),
    likesCount: Number(atual?.likesCount || 0),
    sharesCount: Number(atual?.sharesCount || 0),
    tipo: 'versiculo-do-dia',
    data: registro.data,
  }))
}

function hash(texto) {
  let value = 2166136261
  for (const char of String(texto)) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function candidatosElegiveis(catalogo, usados) {
  return catalogo.filter((item) => {
    if (usados[chaveVersiculo(item)]) return false
    const texto = limparNumero(item.text)
    return texto.length >= 55 && texto.length <= 290 && !/^[,;:)]/.test(texto)
  })
}

function escolher(candidatos, data) {
  if (!candidatos.length) throw new Error('Todos os versiculos elegiveis ja foram utilizados.')
  return candidatos[hash(data) % candidatos.length]
}

function contextoDoVersiculo(catalogo, alvo) {
  const inicio = Number(alvo.pericopeStart) || Math.max(1, alvo.verse - 2)
  const fim = Number(alvo.pericopeEnd) || alvo.verse + 2
  return catalogo
    .filter((item) => item.bookId === alvo.bookId && item.chapter === alvo.chapter && item.verse >= inicio && item.verse <= fim)
    .map((item) => `${item.verse}. ${limparNumero(item.text)}`)
    .join('\n')
}

function comentarioIncompleto(texto) {
  const limpo = String(texto || '').trim()
  const paragrafos = limpo.split(/\n\s*\n/).filter(Boolean)
  return limpo.length < 600 || paragrafos.length < 3 || !/[.!?…”)]$/.test(limpo)
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function adquirirLock(ref, dono) {
  const resultado = await ref.transaction((atual) => {
    const expirou = !atual || Date.now() - Number(atual.iniciadoEm || 0) >= LOCK_TTL_MS
    return expirou ? { dono, iniciadoEm: Date.now() } : undefined
  })
  return resultado.committed
}

async function liberarLock(ref, dono) {
  await ref.transaction((atual) => (atual?.dono === dono ? null : undefined)).catch(() => {})
}

async function selecionarVersiculoDoDia(data = dataNoFuso()) {
  const db = admin.database()
  const refDia = db.ref(`versiculosDoDia/${data}`)
  const existente = await refDia.get()
  if (existente.child('chave').exists()) {
    const registro = existente.val()
    await garantirDestaqueMural(db, registro)
    return registro
  }

  const lockRef = db.ref(`versiculosDoDiaLocks/${data}/selecao`)
  const dono = randomUUID()
  const limite = Date.now() + 20 * 1000
  while (Date.now() < limite) {
    if (await adquirirLock(lockRef, dono)) {
      try {
        const aposLock = await refDia.get()
        if (aposLock.child('chave').exists()) {
          const registro = aposLock.val()
          await garantirDestaqueMural(db, registro)
          return registro
        }
        const catalogo = carregarCatalogo()
        const usados = (await db.ref('versiculosDoDiaUsados').get()).val() || {}
        const item = escolher(candidatosElegiveis(catalogo, usados), data)
        const chave = chaveVersiculo(item)
        const registro = {
          status: 'selecionado',
          data,
          chave,
          livroId: item.bookId,
          livro: item.bookName,
          capitulo: item.chapter,
          versiculo: item.verse,
          referencia: referencia(item),
          texto: limparNumero(item.text),
          fundoId: FUNDOS[hash(chave) % FUNDOS.length],
          criadoEm: Date.now(),
        }
        await db.ref().update({
          [`versiculosDoDia/${data}`]: registro,
          [`versiculosDoDiaUsados/${chave}`]: data,
        })
        await garantirDestaqueMural(db, registro)
        logger.info('Versiculo do dia selecionado', { data, chave })
        return registro
      } finally {
        await liberarLock(lockRef, dono)
      }
    }
    await esperar(350)
    const selecionado = await refDia.get()
    if (selecionado.child('chave').exists()) {
      const registro = selecionado.val()
      await garantirDestaqueMural(db, registro)
      return registro
    }
  }
  throw new Error('Nao foi possivel selecionar o versiculo do dia.')
}

async function encontrarAdminUid() {
  const usersRef = admin.database().ref('users')
  let snap
  try {
    snap = await usersRef.orderByChild('admin').equalTo(true).limitToFirst(1).get()
  } catch (error) {
    logger.warn('Indice admin ausente em users; usando leitura de contingencia', { error: error?.message })
    snap = await usersRef.get()
  }
  let uid = 'sistema:admin-automatico'
  snap.forEach((child) => {
    if (uid === 'sistema:admin-automatico' && child.child('admin').val() === true) uid = child.key || uid
  })
  return uid
}

async function gerarComentario(item, contexto) {
  const apiKey = String(GEMINI_API_KEY.value() || '').trim()
  if (!apiKey) throw new Error('Secret GEMINI_API_KEY nao configurado.')
  const pericopeReferencia = Number(item.pericopeStart) && Number(item.pericopeEnd)
    ? `${item.bookName} ${item.chapter}:${item.pericopeStart}-${item.pericopeEnd}`
    : `${item.bookName} ${item.chapter}`
  const prompt = `VERSICULOS SELECIONADOS: ${referencia(item)}

TEXTO BIBLICO (traducao local):
---
${item.verse} ${limparNumero(item.text)}
---

CONTEXTO BIBLICO BRUTO DA PERICOPE ${pericopeReferencia}${item.pericopeTitle ? ` ("${item.pericopeTitle}")` : ''}:
---
${contexto}
---
Use esse contexto para impedir uma leitura isolada, mas concentre a resposta no versiculo selecionado. Nao gere nem reproduza um estudo completo da pericope.

Escreva a analise concentrada, exegetica e pastoral deste versiculo, seguindo estritamente as instrucoes do sistema. A forma deve nascer do texto: prosa fluida, sem secoes padronizadas, sem "Observacao", "Aplicacao" ou "Pergunta" como cabecalhos.
O teto e maximo, nao meta. Pare quando a ideia estiver completa e coerente; profundidade sobre extensao.`
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCAO_COMENTARIO_VERSICULO }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 8192,
        topP: 0.9,
      },
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini HTTP ${response.status}`)
  const texto = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (comentarioIncompleto(texto)) throw new Error('A IA devolveu uma explicacao vazia ou incompleta.')
  return texto
}

async function publicarExplicacao(registro, data) {
  const db = admin.database()
  const catalogo = carregarCatalogo()
  const estudoRef = db.ref(`estudosCurados/${registro.chave}`)
  let estudo = await estudoRef.get()
  let geradoAgora = false
  const textoExistente = String(estudo.child('texto').val() || '').trim()
  const regenerarAutomatico = estudo.child('curadoria').val() === 'admin-automatica' && comentarioIncompleto(textoExistente)
  if (!textoExistente || regenerarAutomatico) {
    const item = catalogo.find((valor) => chaveVersiculo(valor) === registro.chave)
    if (!item) throw new Error(`Versiculo ${registro.chave} nao encontrado no catalogo.`)
    const [texto, adminUid] = await Promise.all([
      gerarComentario(item, contextoDoVersiculo(catalogo, item)),
      encontrarAdminUid(),
    ])
    await estudoRef.set({
      texto,
      referenciaCompacta: registro.referencia,
      pericopeKey: null,
      atualizadoEm: Date.now(),
      autorUid: adminUid,
      versao: Number(estudo.child('versao').val() || 0) + 1,
      curadoria: 'admin-automatica',
      promptFingerprint: PROMPT_FINGERPRINT,
    })
    estudo = await estudoRef.get()
    geradoAgora = true
  }
  const pronto = {
    ...registro,
    status: 'pronto',
    estudoKey: registro.chave,
    comentario: String(estudo.child('texto').val() || '').trim(),
    comentarioGeradoAutomaticamente: geradoAgora,
    publicadoEm: Date.now(),
  }
  await db.ref(`versiculosDoDia/${data}`).set(pronto)
  logger.info('Explicacao do versiculo do dia publicada', {
    data,
    estudoKey: registro.chave,
    geradoAgora,
    promptFingerprint: PROMPT_FINGERPRINT.slice(0, 12),
  })
  return pronto
}

async function garantirExplicacao(data = dataNoFuso()) {
  const db = admin.database()
  const refDia = db.ref(`versiculosDoDia/${data}`)
  const registro = await selecionarVersiculoDoDia(data)
  if (registro.status === 'pronto' && !comentarioIncompleto(registro.comentario)) return registro

  const lockRef = db.ref(`versiculosDoDiaLocks/${data}/explicacao`)
  const dono = randomUUID()
  const limite = Date.now() + WAIT_LIMIT_MS
  while (Date.now() < limite) {
    const atual = await refDia.get()
    if (atual.child('status').val() === 'pronto' && !comentarioIncompleto(atual.child('comentario').val())) return atual.val()
    if (await adquirirLock(lockRef, dono)) {
      try {
        const maisRecente = await refDia.get()
        if (maisRecente.child('status').val() === 'pronto' && !comentarioIncompleto(maisRecente.child('comentario').val())) return maisRecente.val()
        await refDia.update({ status: 'preparando', preparandoDesde: Date.now(), erroEm: null })
        return await publicarExplicacao(maisRecente.val() || registro, data)
      } catch (error) {
        await refDia.update({ status: 'erro', erroEm: Date.now() }).catch(() => {})
        throw error
      } finally {
        await liberarLock(lockRef, dono)
      }
    }
    await esperar(1000)
  }
  throw new Error('A explicacao do versiculo do dia demorou mais que o esperado.')
}

exports.publicarVersiculoDoDia = onSchedule({
  schedule: '5 0 * * *',
  timeZone: TIMEZONE,
  region: 'us-central1',
  maxInstances: 1,
  timeoutSeconds: 60,
}, async () => selecionarVersiculoDoDia())

exports.selecionarVersiculoDoDia = onCall({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
}, async () => {
  try {
    return await selecionarVersiculoDoDia()
  } catch (error) {
    logger.error('Falha ao selecionar versiculo do dia', { error: error?.message })
    throw new HttpsError('internal', error?.message || 'Nao foi possivel selecionar o versiculo do dia.')
  }
})

exports.garantirVersiculoDoDia = onCall({
  region: 'us-central1',
  maxInstances: 10,
  secrets: [GEMINI_API_KEY],
  timeoutSeconds: 240,
}, async () => {
  try {
    return await garantirExplicacao()
  } catch (error) {
    logger.error('Falha ao preparar explicacao do versiculo do dia', { error: error?.message })
    throw new HttpsError('internal', error?.message || 'Nao foi possivel preparar a explicacao do versiculo do dia.')
  }
})

exports.registrarCompartilhamentoVersiculoDoDia = onCall({
  region: 'us-central1',
  maxInstances: 20,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para registrar o compartilhamento.')
  const data = String(request.data?.data || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new HttpsError('invalid-argument', 'Data invalida.')
  const db = admin.database()
  const registro = (await db.ref(`versiculosDoDia/${data}`).get()).val()
  if (!registro?.chave) throw new HttpsError('not-found', 'Versiculo do dia nao encontrado.')
  await garantirDestaqueMural(db, registro)
  const contadorRef = db.ref(`versiculosCompartilhadosPublicos/${idDestaqueMural(data)}/sharesCount`)
  const resultado = await contadorRef.transaction((valor) => Number(valor || 0) + 1)
  return { sharesCount: Number(resultado.snapshot.val() || 0) }
})

exports._test = {
  dataNoFuso,
  limparNumero,
  chaveVersiculo,
  candidatosElegiveis,
  escolher,
  comentarioIncompleto,
  contextoDoVersiculo,
  idDestaqueMural,
  promptFingerprint: PROMPT_FINGERPRINT,
}
