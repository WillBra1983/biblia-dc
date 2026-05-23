/**
 * Prova bíblica (modo avaliação): gabarito só no servidor.
 * O aluno recebe perguntas e alternativas sem marcação de resposta correta.
 */

const admin = require('firebase-admin')
const crypto = require('crypto')
const { onCall, HttpsError } = require('firebase-functions/v2/https')

const SESSAO_TTL_MS = 24 * 60 * 60 * 1000

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

function sanitizarPontosQuestaoProva(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 1
  return Math.min(1000, round2(n))
}

function normalizarPerguntas(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return Object.keys(raw)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => raw[k])
    .filter(Boolean)
}

function shuffleDeterministic(items, seed) {
  const a = [...items]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0
    const j = h % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function novoAltId() {
  return crypto.randomBytes(8).toString('hex')
}

function montarAlternativasPublicas(questao, studyId, idx) {
  const tipo = String(questao?.tipo || '').toLowerCase()
  const seed = `${studyId}-${idx}`
  if (tipo === 'ver_resposta') {
    return { tipo, alternativas: [], gabarito: { tipo, respostaCerta: String(questao?.respostaCerta || '').trim() } }
  }
  if (tipo === 'verdadeiro_falso') {
    const correta =
      String(questao?.respostaCerta || '').trim().toLowerCase() === 'falso' ? 'Falso' : 'Verdadeiro'
    const errada = correta === 'Verdadeiro' ? 'Falso' : 'Verdadeiro'
    const idC = novoAltId()
    const idE = novoAltId()
    const alternativas = shuffleDeterministic(
      [
        { id: idC, texto: correta },
        { id: idE, texto: errada }
      ],
      seed
    )
    return {
      tipo,
      alternativas,
      gabarito: { tipo, correctAltId: idC, respostaCerta: correta }
    }
  }
  const limpas = (questao?.respostasErradas || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 4)
  const idCorreta = novoAltId()
  const itens = [
    { id: idCorreta, texto: String(questao?.respostaCerta || '').trim(), correta: true },
    ...limpas.map((texto) => ({ id: novoAltId(), texto, correta: false }))
  ].filter((x) => x.texto.length > 0)
  const embaralhadas = shuffleDeterministic(itens, seed)
  return {
    tipo,
    alternativas: embaralhadas.map(({ id, texto }) => ({ id, texto })),
    gabarito: {
      tipo,
      correctAltId: idCorreta,
      respostaCerta: String(questao?.respostaCerta || '').trim()
    }
  }
}

function avaliarQuestao(gabarito, questao, escolha, alternativas, pontosQ) {
  const t = String(gabarito?.tipo || questao?.tipo || '').toLowerCase()
  let acertou = false
  let respostaAluno = ''
  const respostaCorreta = String(gabarito?.respostaCerta || '').trim()

  if (t === 'ver_resposta') {
    respostaAluno = String(escolha || '').trim()
    acertou = respostaAluno.length > 0
    const pts = acertou ? pontosQ : 0
    return { acertou, respostaAluno, respostaCorreta, pontosObtidos: pts }
  }

  const esc = String(escolha || '')
  const alt = (alternativas || []).find((a) => a.id === esc)
  respostaAluno = alt?.texto || esc
  acertou = Boolean(gabarito?.correctAltId && esc === gabarito.correctAltId)
  const pts = acertou ? pontosQ : 0
  return { acertou, respostaAluno, respostaCorreta, pontosObtidos: pts }
}

exports.iniciarProvaBiblicaAluno = onCall(
  { region: 'us-central1', maxInstances: 20, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta para fazer a avaliação.')

    const studyId = String(req.data?.studyId || '').trim()
    if (!studyId) throw new HttpsError('invalid-argument', 'Estudo inválido.')

    const snap = await admin.database().ref(`bibliaEstudos/${studyId}`).get()
    if (!snap.exists()) throw new HttpsError('not-found', 'Estudo não encontrado.')
    const study = snap.val()
    if (!study?.modoProva) {
      throw new HttpsError('failed-precondition', 'Este estudo não está em modo avaliação.')
    }

    const isAuthor = study.authorUid === uid
    const perguntasRaw = normalizarPerguntas(study.perguntas)
    const gabaritoPorIndice = []
    const perguntasPublicas = perguntasRaw.map((q, i) => {
      const pontos = sanitizarPontosQuestaoProva(q.pontos)
      const built = montarAlternativasPublicas(q, studyId, i)
      gabaritoPorIndice.push(built.gabarito)
      return {
        tipo: built.tipo || String(q?.tipo || 'multipla_escolha'),
        pergunta: String(q?.pergunta || '').slice(0, 2000),
        pontos,
        alternativas: built.alternativas
      }
    })

    const sessionId = crypto.randomBytes(16).toString('hex')
    const now = Date.now()

    if (!isAuthor) {
      await admin
        .database()
        .ref(`bibliaEstudosProvaSessoes/${sessionId}`)
        .set({
          uid,
          studyId,
          gabaritoPorIndice,
          alternativasPorIndice: perguntasPublicas.map((p) => p.alternativas || []),
          perguntasMeta: perguntasPublicas.map((p) => ({
            pergunta: p.pergunta,
            tipo: p.tipo,
            pontos: p.pontos
          })),
          createdAt: now,
          expiresAt: now + SESSAO_TTL_MS
        })
    }

    return {
      sessionId: isAuthor ? null : sessionId,
      isAuthor,
      perguntas: perguntasPublicas
    }
  }
)

exports.avaliarProvaBiblicaAluno = onCall(
  { region: 'us-central1', maxInstances: 20, cors: true },
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta.')

    const sessionId = String(req.data?.sessionId || '').trim()
    const escolhas = req.data?.escolhas
    if (!sessionId || !escolhas || typeof escolhas !== 'object') {
      throw new HttpsError('invalid-argument', 'Sessão ou respostas inválidas.')
    }

    const ref = admin.database().ref(`bibliaEstudosProvaSessoes/${sessionId}`)
    const snap = await ref.get()
    if (!snap.exists()) {
      throw new HttpsError('not-found', 'Sessão expirada. Reabra a avaliação.')
    }
    const sessao = snap.val()
    if (sessao.uid !== uid) throw new HttpsError('permission-denied', 'Sessão inválida.')
    if (Number(sessao.expiresAt) < Date.now()) {
      await ref.remove().catch(() => {})
      throw new HttpsError('deadline-exceeded', 'Sessão expirada. Reabra a avaliação.')
    }

    let obtida = 0
    let max = 0
    const itens = []
    const meta = Array.isArray(sessao.perguntasMeta) ? sessao.perguntasMeta : []
    const gabarito = Array.isArray(sessao.gabaritoPorIndice) ? sessao.gabaritoPorIndice : []
    const alternativas = Array.isArray(sessao.alternativasPorIndice) ? sessao.alternativasPorIndice : []

    meta.forEach((questao, i) => {
      const pontosQ = sanitizarPontosQuestaoProva(questao.pontos)
      max = round2(max + pontosQ)
      const esc = escolhas[String(i)] ?? escolhas[i]
      const aval = avaliarQuestao(gabarito[i], questao, esc, alternativas[i], pontosQ)
      obtida = round2(obtida + aval.pontosObtidos)
      itens.push({
        pergunta: String(questao.pergunta || ''),
        tipo: String(questao.tipo || ''),
        pontosQuestao: pontosQ,
        pontosObtidos: aval.pontosObtidos,
        respostaAluno: aval.respostaAluno,
        respostaCorreta: aval.respostaCorreta,
        acertou: aval.acertou
      })
    })

    await ref.remove().catch(() => {})

    return { itens, obtida: round2(obtida), max: round2(max) }
  }
)
