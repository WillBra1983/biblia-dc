const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { randomUUID } = require('node:crypto')
const admin = require('firebase-admin')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onValueWritten } = require('firebase-functions/v2/database')
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
const LOCK_TTL_MS = 150 * 1000
const WAIT_LIMIT_MS = 200 * 1000
const GEMINI_TIMEOUT_MS = 120 * 1000
const TONS_LEGADOS = ['', '~contemplativo', '~academico', '~conciso']
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

function normalizarLivro(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizarLivroEstrito(valor) {
  return String(valor || '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
}

function encontrarPorReferencia(catalogo, valor) {
  const entrada = String(valor || '').trim()
  const partes = entrada.match(/^(.+?)\s+(\d+)\s*[:.]\s*(\d+)$/)
  if (!partes) {
    throw new HttpsError('invalid-argument', 'Informe a referência completa, por exemplo: João 3:16.')
  }
  const livroOriginal = normalizarLivroEstrito(partes[1])
  const livroDigitado = normalizarLivro(partes[1])
  const capitulo = Number(partes[2])
  const versiculo = Number(partes[3])
  const livros = [...new Set(catalogo.map((item) => item.bookName))]
  let correspondencias = livros.filter((nome) => normalizarLivroEstrito(nome) === livroOriginal)
  if (!correspondencias.length && livroDigitado.length >= 4) {
    correspondencias = livros.filter((nome) => normalizarLivro(nome) === livroDigitado)
  }
  if (correspondencias.length !== 1) {
    throw new HttpsError('invalid-argument', 'Livro bíblico não encontrado. Digite o nome completo.')
  }
  const nomeLivro = correspondencias[0]
  const item = catalogo.find((valorCatalogo) => (
    valorCatalogo.bookName === nomeLivro &&
    Number(valorCatalogo.chapter) === capitulo &&
    Number(valorCatalogo.verse) === versiculo
  ))
  if (!item) throw new HttpsError('not-found', 'Essa referência não foi encontrada no texto bíblico do aplicativo.')
  return item
}

function idDestaqueMural(data) {
  return `versiculo-dia-${data}`
}

async function garantirDestaqueMural(db, registro, { resetarContadores = false } = {}) {
  if (!registro?.data || !registro?.chave) return
  const destaqueRef = db.ref(`versiculosCompartilhadosPublicos/${idDestaqueMural(registro.data)}`)
  await destaqueRef.transaction((valorAtual) => {
    const atual = resetarContadores ? null : valorAtual
    return ({
      referencia: registro.referencia,
      texto: registro.texto,
      fundoId: registro.fundoId,
      url: `${PUBLIC_APP_URL}/versiculo-do-dia?data=${encodeURIComponent(registro.data)}`,
      createdAt: Number(registro.criadoEm || atual?.createdAt || Date.now()),
      likesCount: Number(atual?.likesCount || 0),
      sharesCount: Number(atual?.sharesCount || 0),
      tipo: 'versiculo-do-dia',
      data: registro.data,
    })
  })
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

async function adquirirLock(ref, dono, chave = '') {
  const resultado = await ref.transaction((atual) => {
    const expirou = !atual || Date.now() - Number(atual.iniciadoEm || 0) >= LOCK_TTL_MS
    // Na troca manual, uma geracao do versiculo anterior pode continuar viva.
    // O lock pertence ao versiculo, nao apenas ao dia; uma chave diferente
    // pode substitui-lo sem esperar a expiracao completa.
    const pertenceAOutroVersiculo = Boolean(chave) && String(atual?.chave || '') !== chave
    return expirou || pertenceAOutroVersiculo
      ? { dono, iniciadoEm: Date.now(), ...(chave ? { chave } : {}) }
      : undefined
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

async function encontrarEstudoPersistido(db, chaveBase) {
  const chaves = TONS_LEGADOS.map((sufixo) => `${chaveBase}${sufixo}`)
  const leituras = await Promise.all(chaves.flatMap((chave) => ([
    db.ref(`estudosCurados/${chave}`).get(),
    db.ref(`estudosCandidatos/${chave}`).get(),
  ])))

  for (let indice = 0; indice < chaves.length; indice += 1) {
    const chave = chaves[indice]
    let oficial = leituras[indice * 2]
    const candidato = leituras[indice * 2 + 1]
    const textoOficial = String(oficial.child('texto').val() || '').trim()
    const textoCandidato = String(candidato.child('texto').val() || '').trim()

    // Versoes anteriores do versiculo do dia podiam criar um oficial automatico
    // por cima de um candidato que a Biblia comentada ja exibia. Recupere esse
    // texto anterior sem tocar em qualquer curadoria manual do administrador.
    if (
      textoCandidato &&
      textoOficial &&
      oficial.child('curadoria').val() === 'admin-automatica' &&
      Number(candidato.child('atualizadoEm').val() || 0) <= Number(oficial.child('atualizadoEm').val() || 0)
    ) {
      const oficialRef = db.ref(`estudosCurados/${chave}`)
      const restauracao = await oficialRef.transaction((atual) => {
        if (atual?.curadoria !== 'admin-automatica') return undefined
        return {
          ...atual,
          ...candidato.val(),
          versao: Number(atual?.versao || 0) + 1,
          atualizadoEm: Date.now(),
          curadoria: 'recuperada-de-candidato',
          recuperadoEm: Date.now(),
        }
      })
      if (restauracao.committed) oficial = restauracao.snapshot
    }

    const textoRestaurado = String(oficial.child('texto').val() || '').trim()
    if (textoRestaurado) {
      return { snapshot: oficial, chave, colecao: 'estudosCurados', texto: textoRestaurado }
    }
    if (textoCandidato) {
      return { snapshot: candidato, chave, colecao: 'estudosCandidatos', texto: textoCandidato }
    }
  }
  return null
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
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
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
  let persistido = await encontrarEstudoPersistido(db, registro.chave)
  let estudo = persistido?.snapshot || await estudoRef.get()
  let geradoAgora = false
  const textoExistente = String(persistido?.texto || estudo.child('texto').val() || '').trim()
  // O versiculo do dia apenas reaproveita a Biblia comentada. Mesmo um texto
  // curto ou gerado anteriormente e conteudo valido e nunca deve ser trocado
  // automaticamente. Regeneracao continua sendo uma decisao explicita do admin.
  if (!textoExistente) {
    const item = catalogo.find((valor) => chaveVersiculo(valor) === registro.chave)
    if (!item) throw new Error(`Versiculo ${registro.chave} nao encontrado no catalogo.`)
    const [texto, adminUid] = await Promise.all([
      gerarComentario(item, contextoDoVersiculo(catalogo, item)),
      encontrarAdminUid(),
    ])
    // A geracao leva alguns segundos. Nesse intervalo o admin pode salvar uma
    // explicacao ou outro processo pode criar o estudo. A transacao grava apenas
    // se o texto continuar vazio e preserva quaisquer metadados ja existentes.
    // Confira novamente os candidatos imediatamente antes da gravacao, pois um
    // usuario pode ter aprovado o estudo enquanto a IA preparava a resposta.
    persistido = await encontrarEstudoPersistido(db, registro.chave)
    if (persistido?.texto) {
      estudo = persistido.snapshot
    } else {
      const gravacao = await estudoRef.transaction((atual) => {
        const registroAtual = atual && typeof atual === 'object' ? atual : {}
        if (String(registroAtual.texto || '').trim()) return undefined
        return {
          ...registroAtual,
          texto,
          referenciaCompacta: registro.referencia,
          pericopeKey: registroAtual.pericopeKey || null,
          atualizadoEm: Date.now(),
          autorUid: adminUid,
          versao: Number(registroAtual.versao || 0) + 1,
          curadoria: 'admin-automatica',
          promptFingerprint: PROMPT_FINGERPRINT,
        }
      })
      estudo = gravacao.snapshot
      geradoAgora = gravacao.committed
    }
  }
  const comentarioPublicado = String(estudo.child('texto').val() || '').trim()
  if (!comentarioPublicado) throw new Error('A explicacao nao foi salva nem encontrada na Biblia comentada.')
  const pronto = {
    ...registro,
    status: 'pronto',
    estudoKey: persistido?.chave || registro.chave,
    estudoColecao: persistido?.colecao || 'estudosCurados',
    comentarioChave: persistido?.chave || registro.chave,
    comentario: comentarioPublicado,
    comentarioGeradoAutomaticamente: geradoAgora,
    publicadoEm: Date.now(),
  }
  const publicacao = await db.ref(`versiculosDoDia/${data}`).transaction((atual) => (
    atual?.chave === registro.chave ? pronto : undefined
  ))
  if (!publicacao.committed) return publicacao.snapshot.val()
  logger.info('Explicacao do versiculo do dia publicada', {
    data,
    estudoKey: registro.chave,
    geradoAgora,
    promptFingerprint: PROMPT_FINGERPRINT.slice(0, 12),
  })
  return pronto
}

async function vincularEstudoCuradoExistente(registro, data) {
  const chave = String(registro?.chave || '').trim()
  if (!chave) return null
  const db = admin.database()
  const persistido = await encontrarEstudoPersistido(db, chave)
  if (!persistido?.texto) return null
  const estudo = persistido.snapshot
  const texto = persistido.texto

  const refDia = db.ref(`versiculosDoDia/${data}`)
  const maisRecente = await refDia.get()
  if (String(maisRecente.child('chave').val() || '') !== chave) return null

  const publicacao = {
    status: 'pronto',
    estudoKey: persistido.chave,
    estudoColecao: persistido.colecao,
    comentarioChave: persistido.chave,
    comentario: texto,
    comentarioGeradoAutomaticamente: estudo.child('curadoria').val() === 'admin-automatica',
    publicadoEm: Date.now(),
    preparandoDesde: null,
    erroEm: null,
  }
  // Atualize apenas os campos de publicacao. Uma transacao no registro inteiro
  // entra em contencao quando varios clientes abrem a pagina ao mesmo tempo e
  // todos renovam o estado `preparando`.
  await refDia.update(publicacao)
  const publicado = (await refDia.get()).val()
  if (String(publicado?.chave || '') !== chave) return null
  logger.info('Estudo curado vinculado ao versiculo do dia', { data, estudoKey: chave })
  return publicado
}

async function garantirExplicacao(data = dataNoFuso()) {
  const db = admin.database()
  const refDia = db.ref(`versiculosDoDia/${data}`)
  const registro = await selecionarVersiculoDoDia(data)
  const jaCurado = await vincularEstudoCuradoExistente(registro, data)
  if (jaCurado) return jaCurado
  if (registro.status === 'pronto' && !comentarioIncompleto(registro.comentario)) return registro

  const lockRef = db.ref(`versiculosDoDiaLocks/${data}/explicacao`)
  const dono = randomUUID()
  const limite = Date.now() + WAIT_LIMIT_MS
  while (Date.now() < limite) {
    const atual = await refDia.get()
    if (atual.child('status').val() === 'pronto' && !comentarioIncompleto(atual.child('comentario').val())) return atual.val()
    const curadoDuranteEspera = await vincularEstudoCuradoExistente(atual.val() || registro, data)
    if (curadoDuranteEspera) return curadoDuranteEspera
    const chaveAtual = String(atual.child('chave').val() || registro.chave || '')
    if (await adquirirLock(lockRef, dono, chaveAtual)) {
      let chaveEmPreparacao = ''
      try {
        const maisRecente = await refDia.get()
        if (maisRecente.child('status').val() === 'pronto' && !comentarioIncompleto(maisRecente.child('comentario').val())) return maisRecente.val()
        chaveEmPreparacao = String(maisRecente.child('chave').val() || registro.chave || '')
        await refDia.update({ status: 'preparando', preparandoDesde: Date.now(), erroEm: null })
        const publicado = await publicarExplicacao(maisRecente.val() || registro, data)
        if (publicado?.status === 'pronto' && !comentarioIncompleto(publicado?.comentario)) {
          return publicado
        }
        // O administrador pode trocar o versiculo enquanto uma explicacao
        // anterior ainda esta sendo gerada. Nesse caso, a transacao de
        // publicacao devolve o registro novo (ainda sem comentario). Libere o
        // lock e repita o ciclo para preparar a explicacao correta.
      } catch (error) {
        await refDia.transaction((valor) => (
          valor?.chave === chaveEmPreparacao
            ? { ...valor, status: 'erro', erroEm: Date.now() }
            : undefined
        )).catch(() => {})
        throw error
      } finally {
        await liberarLock(lockRef, dono)
      }
      continue
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

exports.substituirVersiculoDoDia = onCall({
  region: 'us-central1',
  maxInstances: 5,
  timeoutSeconds: 30,
}, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Entre na conta de administrador.')
  const db = admin.database()
  const adminSnap = await db.ref(`users/${uid}/admin`).get()
  if (adminSnap.val() !== true) throw new HttpsError('permission-denied', 'Apenas o administrador pode substituir o versículo do dia.')

  const data = dataNoFuso()
  const lockRef = db.ref(`versiculosDoDiaLocks/${data}/trocaManual`)
  const dono = randomUUID()
  if (!(await adquirirLock(lockRef, dono))) {
    throw new HttpsError('aborted', 'Outra troca está em andamento. Aguarde alguns instantes.')
  }
  let registro
  try {
    const catalogo = carregarCatalogo()
    const item = encontrarPorReferencia(catalogo, request.data?.referencia)
    const chave = chaveVersiculo(item)
    registro = {
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
      substituidoManualmentePor: uid,
    }
    await db.ref().update({
      [`versiculosDoDia/${data}`]: registro,
      [`versiculosDoDiaUsados/${chave}`]: data,
      [`versiculosDoDiaLocks/${data}/explicacao`]: null,
    })
    await garantirDestaqueMural(db, registro, { resetarContadores: true })
    logger.info('Versiculo do dia substituido pelo administrador', { data, chave, uid })
  } finally {
    await liberarLock(lockRef, dono)
  }

  return (await vincularEstudoCuradoExistente(registro, data)) || registro
})

// A troca administrativa deve funcionar tambem em versoes do aplicativo que
// ainda nao conhecem o fluxo novo. O servidor observa a selecao manual e a
// conclui exatamente como faria com o versiculo sorteado no inicio do dia.
exports.prepararVersiculoDoDiaSubstituido = onValueWritten({
  ref: '/versiculosDoDia/{data}',
  region: 'us-central1',
  secrets: [GEMINI_API_KEY],
  timeoutSeconds: 240,
  maxInstances: 5,
}, async (event) => {
  const anterior = event.data.before.val()
  const atual = event.data.after.val()
  if (!atual?.substituidoManualmentePor || atual.status !== 'selecionado' || !atual.chave) return
  if (Number(anterior?.criadoEm || 0) === Number(atual.criadoEm || 0)) return

  try {
    await garantirExplicacao(event.params.data)
  } catch (error) {
    logger.error('Falha ao preparar versiculo substituido pelo administrador', {
      data: event.params.data,
      chave: atual.chave,
      error: error?.message,
    })
    throw error
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
  await db.ref(`versiculosCompartilhadosInteracoes/${idDestaqueMural(data)}/compartilhamentos/${request.auth.uid}`)
    .transaction((atual) => ({
      count: Number(atual?.count || 0) + 1,
      lastAt: Date.now(),
    }))
  return { sharesCount: Number(resultado.snapshot.val() || 0) }
})

exports._test = {
  dataNoFuso,
  limparNumero,
  chaveVersiculo,
  normalizarLivro,
  normalizarLivroEstrito,
  encontrarPorReferencia,
  candidatosElegiveis,
  escolher,
  comentarioIncompleto,
  contextoDoVersiculo,
  idDestaqueMural,
  promptFingerprint: PROMPT_FINGERPRINT,
}
