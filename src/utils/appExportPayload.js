// O dataset completo (`discipuladoData`) tem ~220 kB — antes era importado
// estaticamente aqui, mas como este módulo é carregado por páginas eager
// (ex.: `Biblia.jsx`), ele entrava no `modulepreload` do `index.html` mesmo
// para usuários que nunca abrem o Discipulado. Agora usamos:
//   - `discipuladoTitulos` (eager, leve) → para validar `temaId`/título.
//   - `import('../data/discipulado')` (dinâmico, com cache) → só em fluxos
//     que de fato precisam das perguntas completas (preview no chat).
import { discipuladoTitulos } from '../data/discipuladoTitulos'
import { livros } from '../data/biblia'

let _discipuladoFullPromise = null
function carregarDiscipuladoCompleto() {
  if (!_discipuladoFullPromise) {
    _discipuladoFullPromise = import('../data/discipulado').then(
      (m) => m.discipuladoData
    )
  }
  return _discipuladoFullPromise
}
import { APP_EXPORT_SCHEMA_VERSION, APP_EXPORT_MAX_APPLY_SCHEMA_VERSION } from '../constants/appExport'
import {
  QUIZ_STORAGE_BEST_FASE1,
  QUIZ_STORAGE_UNLOCK_PHASE2,
  QUIZ_STORAGE_UNLOCK_PHASE3
} from '../constants/quizRetiroStorage'
import {
  obterVersiculosMarcados,
  mesclarVersiculosMarcadosImportados,
} from '../services/versiculosMarcadosService'
import { formatarNotaProvaPtBr } from './provaPontos'

export const EXPORT_KIND_LABELS = {
  discipulado: 'Discipulado',
  versiculos_marcados: 'Versículos marcados',
  biblia_versiculos: 'Versículos bíblicos',
  devocional: 'Devocional',
  mais_de_deus: 'Mais de Deus',
  quiz: 'Quiz bíblico',
  estudo_biblico: 'Estudo compartilhado',
  prova_biblica: 'Avaliação (estudo compartilhado)'
}

function baseBody(kind, extra = {}) {
  return {
    schema: APP_EXPORT_SCHEMA_VERSION,
    app: 'biblia-dc',
    kind,
    createdAt: Date.now(),
    ...extra
  }
}

function schemaReadOnly(schema) {
  const canApply = schema <= APP_EXPORT_MAX_APPLY_SCHEMA_VERSION
  return {
    canApply,
    readOnlyReason: canApply
      ? null
      : 'Atualize o aplicativo para poder aplicar este envio na sua conta. Por agora pode só visualizar.'
  }
}

/**
 * Monta o JSON do discipulado (respostas do módulo/estudo atual) para enviar pelo chat.
 */
export function buildDiscipuladoExport({
  temaId,
  estudoId,
  respostas,
  questaoAtual,
  temaTitulo,
  estudoTitulo
}) {
  const tid = Number(temaId)
  const eid = estudoId != null && estudoId !== '' ? Number(estudoId) : null
  const prefix =
    eid != null && !Number.isNaN(eid) ? `${tid}_${eid}_` : `${tid}_`

  const answers = {}
  for (const [k, v] of Object.entries(respostas || {})) {
    if (!k.startsWith(prefix)) continue
    if (v === undefined || v === '') continue
    answers[k] = v
  }

  const body = {
    schema: APP_EXPORT_SCHEMA_VERSION,
    app: 'biblia-dc',
    kind: 'discipulado',
    createdAt: Date.now(),
    temaId: tid,
    estudoId: eid != null && !Number.isNaN(eid) ? eid : null,
    temaTitulo: String(temaTitulo || '').slice(0, 200),
    estudoTitulo: String(estudoTitulo || '').slice(0, 200),
    questaoAtual: Math.max(1, Number(questaoAtual) || 1),
    answers
  }

  const serialized = JSON.stringify(body)
  const n = Object.keys(answers).length
  const previewText = `[Discipulado] ${body.temaTitulo || 'Módulo'}${body.estudoTitulo ? ` — ${body.estudoTitulo}` : ''} · ${n} resposta(s)`

  return { serialized, previewText, body }
}

export function parseDiscipuladoExport(serialized) {
  if (typeof serialized !== 'string' || !serialized.trim()) return { error: 'Pacote vazio.' }
  let data
  try {
    data = JSON.parse(serialized)
  } catch {
    return { error: 'Não foi possível ler este envio.' }
  }
  if (!data || String(data.kind || '').trim().toLowerCase() !== 'discipulado') {
    return { error: 'Tipo de envio não reconhecido.' }
  }
  if (data.app && data.app !== 'biblia-dc') {
    return { error: 'Este pacote não é deste aplicativo.' }
  }
  if (typeof data.schema === 'string' && /^\d+$/.test(String(data.schema).trim())) {
    data.schema = Number(String(data.schema).trim())
  }
  if (typeof data.schema !== 'number' || Number.isNaN(data.schema)) {
    return { error: 'Versão do pacote inválida.' }
  }
  if (typeof data.temaId !== 'number' || !discipuladoTitulos.some((t) => t.id === data.temaId)) {
    return { error: 'Módulo de discipulado não encontrado nos dados atuais.' }
  }
  const answers = data.answers && typeof data.answers === 'object' ? data.answers : {}
  return {
    data: {
      ...data,
      answers
    },
    canApply: data.schema <= APP_EXPORT_MAX_APPLY_SCHEMA_VERSION,
    readOnlyReason:
      data.schema > APP_EXPORT_MAX_APPLY_SCHEMA_VERSION
        ? 'Atualize o aplicativo para poder aplicar este envio na sua conta. Por agora pode só visualizar.'
        : null
  }
}

/**
 * Gera o resumo do payload de discipulado para a UI de preview no chat.
 * Async porque precisa do dataset completo (perguntas, alternativas) —
 * carregado por `import()` dinâmico para não inflar o bundle inicial.
 */
export async function summarizeDiscipuladoForPreview(data) {
  const discipuladoData = await carregarDiscipuladoCompleto()
  const tema = discipuladoData.find((t) => t.id === data.temaId)
  const questoes =
    data.estudoId != null && tema?.estudos
      ? tema.estudos.find((e) => e.id === data.estudoId)?.questoes || []
      : tema?.questoes || []

  const byKey = data.answers || {}
  const rows = []
  for (let i = 0; i < questoes.length; i++) {
    const q = questoes[i]
    const qid = i + 1
    const key =
      data.estudoId != null
        ? `${data.temaId}_${data.estudoId}_${qid}`
        : `${data.temaId}_${qid}`
    const letter = byKey[key]
    if (letter === undefined) continue
    const alt = q?.alternativas?.find((a) => a.id === letter)
    rows.push({
      num: qid,
      pergunta: q?.pergunta || `Questão ${qid}`,
      letra: letter,
      textoResposta: alt?.texto || String(letter)
    })
  }
  return {
    titulo: data.temaTitulo || tema?.titulo || `Módulo ${data.temaId}`,
    subtitulo: data.estudoTitulo || '',
    questaoAtual: data.questaoAtual,
    linhas: rows
  }
}

// ——— Versículos marcados (cópia local) ———

export function buildVersiculosMarcadosExport() {
  const marcados = obterVersiculosMarcados()
  const n = Object.keys(marcados).length
  const body = baseBody('versiculos_marcados', { marcados })
  const serialized = JSON.stringify(body)
  const previewText = `[Versículos marcados] ${n} versículo(s)`
  return { serialized, previewText, body }
}

// ——— Versículos selecionados na Bíblia (texto + referência) ———

export function buildBibliaVersiculosExport(items) {
  const list = Array.isArray(items) ? items : []
  const body = baseBody('biblia_versiculos', {
    items: list.map((it) => ({
      livroId: Number(it.livroId),
      capitulo: Number(it.capitulo),
      versiculo: Number(it.versiculo),
      texto: String(it.texto || '').slice(0, 2000)
    }))
  })
  const serialized = JSON.stringify(body)
  const previewText = `[Bíblia] ${list.length} versículo(s)`
  return { serialized, previewText, body }
}

// ——— Devocional (lista de lidos) ———

export function buildDevocionalExport({ concluidos, destaqueTitulo }) {
  const arr = Array.isArray(concluidos) ? concluidos.map((x) => Number(x)).filter((x) => !Number.isNaN(x)) : []
  const body = baseBody('devocional', {
    concluidos: arr,
    destaqueTitulo: String(destaqueTitulo || '').slice(0, 200)
  })
  const serialized = JSON.stringify(body)
  const previewText = `[Devocional] ${arr.length} devocional(is) como lido(s)`
  return { serialized, previewText, body }
}

// ——— Mais de Deus ———

export function buildMaisDeDeusExport({ subtemasLidos }) {
  const arr = Array.isArray(subtemasLidos) ? subtemasLidos.map((x) => String(x)) : []
  const body = baseBody('mais_de_deus', { subtemasLidos: arr })
  const serialized = JSON.stringify(body)
  const previewText = `[Mais de Deus] ${arr.length} subtema(s) como lido(s)`
  return { serialized, previewText, body }
}

// ——— Quiz ———

/** Estudo criado/compartilhado (abre a leitura no app a partir do ID no RTDB). */
export function buildEstudoBiblicoChatExport({ studyId, tema, authorName, referenciaCompacta }) {
  const sid = String(studyId || '').trim()
  if (!sid) {
    return { serialized: '', previewText: '', body: null, error: 'Estudo inválido.' }
  }
  const body = baseBody('estudo_biblico', {
    studyId: sid,
    tema: String(tema || '').slice(0, 400),
    authorName: String(authorName || '').slice(0, 120),
    referenciaCompacta: String(referenciaCompacta || '').slice(0, 120)
  })
  const serialized = JSON.stringify(body)
  const refTxt = body.referenciaCompacta ? ` · ${body.referenciaCompacta}` : ''
  const previewText = `[Estudo compartilhado] ${body.tema || 'Estudo'}${refTxt}`
  return { serialized, previewText, body }
}

/** Resumo legível no chat (bolha + diálogo «Ver envio»): perguntas, respostas e gabarito. */
export function buildLinhasResumoProvaChat(itens) {
  const arr = Array.isArray(itens) ? itens : []
  return arr.slice(0, 18).map((it, i) => {
    const n = i + 1
    const pts = `${formatarNotaProvaPtBr(Number(it?.pontosObtidos) || 0)}/${formatarNotaProvaPtBr(Number(it?.pontosQuestao) || 0)}`
    const p = String(it?.pergunta || '').trim().slice(0, 160)
    const a = String(it?.respostaAluno || '—').trim().slice(0, 260)
    const g = String(it?.respostaCorreta || '—').trim().slice(0, 260)
    return {
      primary: `Questão ${n} · ${pts} pt`,
      secondary: `Enunciado: ${p}${p.length >= 160 ? '…' : ''}\nResposta do aluno: ${a}\nGabarito: ${g}`
    }
  })
}

/** Resultado de prova: metadados + link + resumo das questões (detalhe completo continua no RTDB). */
export function buildProvaBiblicaChatExport({
  submissionId,
  studyId,
  tema,
  professorName,
  alunoName,
  notaTexto,
  resultUrl,
  itens
}) {
  const linhasResumo = buildLinhasResumoProvaChat(itens)
  const body = baseBody('prova_biblica', {
    submissionId: String(submissionId || '').trim(),
    studyId: String(studyId || '').trim(),
    tema: String(tema || '').slice(0, 400),
    professorName: String(professorName || '').slice(0, 120),
    alunoName: String(alunoName || '').slice(0, 120),
    notaTexto: String(notaTexto || '').slice(0, 80),
    resultUrl: String(resultUrl || '').slice(0, 800),
    ...(linhasResumo.length ? { linhasResumo } : {})
  })
  const serialized = JSON.stringify(body)
  const prof = body.professorName ? ` — Professor: ${body.professorName}` : ''
  const previewText = `Avaliação recebida: ${body.tema || 'Estudo'}${prof} — Aluno: ${body.alunoName || '—'} — Nota: ${body.notaTexto || '—'}${linhasResumo.length ? ' — Resumo: perguntas, respostas e gabarito no «Ver envio».' : ''}`
  return { serialized, previewText, body }
}

export function buildQuizExport() {
  let points = 0
  try {
    const j = JSON.parse(localStorage.getItem(QUIZ_STORAGE_BEST_FASE1) || '{}')
    points = Math.max(0, Number(j.points) || 0)
  } catch {
    /* ignore */
  }
  const phase2Unlocked = localStorage.getItem(QUIZ_STORAGE_UNLOCK_PHASE2) === '1' ? '1' : '0'
  const phase3Unlocked = localStorage.getItem(QUIZ_STORAGE_UNLOCK_PHASE3) === '1' ? '1' : '0'
  /** Só `points` no envio público — não incluir `correct` (evita expor desempenho detalhado no chat/RTDB). */
  const body = baseBody('quiz', {
    fase1Best: { points },
    phase2Unlocked,
    phase3Unlocked
  })
  const serialized = JSON.stringify(body)
  const previewText = `[Quiz] Resultado: ${points} pts · F2 ${phase2Unlocked === '1' ? 'sim' : 'não'} · F3 ${phase3Unlocked === '1' ? 'sim' : 'não'}`
  return { serialized, previewText, body }
}

function rotuloVersiculo(livroId, cap, vers) {
  const livro = livros.find((l) => l.id === livroId)
  const abr = livro?.abreviacao || livro?.nome?.slice(0, 3) || `L${livroId}`
  return `${abr} ${cap}:${vers}`
}

/**
 * @param {string|object} serialized — JSON string do envio (ou objeto vindo do RTDB)
 * @param {{ fallbackExportKind?: string }} [options] — `exportKind` da mensagem no chat (se o JSON interno vier incompleto)
 */
export function parseAnyExport(serialized, options = {}) {
  const fallbackExportKind =
    typeof options.fallbackExportKind === 'string' ? options.fallbackExportKind.trim().toLowerCase() : ''

  if (serialized != null && typeof serialized === 'object') {
    try {
      serialized = JSON.stringify(serialized)
    } catch {
      return { error: 'Pacote inválido.' }
    }
  }
  if (typeof serialized !== 'string' || !serialized.trim()) return { error: 'Pacote vazio.' }
  let data
  try {
    data = JSON.parse(serialized)
  } catch {
    return { error: 'Não foi possível ler este envio.' }
  }
  if (!data || typeof data !== 'object') return { error: 'Pacote inválido.' }
  if (data.app && data.app !== 'biblia-dc') return { error: 'Este pacote não é deste aplicativo.' }

  if (typeof data.schema === 'string' && /^\d+$/.test(String(data.schema).trim())) {
    data.schema = Number(String(data.schema).trim())
  }

  let kindNorm = ''
  if (typeof data.kind === 'string' && data.kind.trim()) {
    kindNorm = data.kind.trim().toLowerCase()
  } else if (fallbackExportKind) {
    kindNorm = fallbackExportKind
  }
  if (!kindNorm && String(data?.studyId || '').trim() && fallbackExportKind === 'estudo_biblico') {
    kindNorm = 'estudo_biblico'
  }
  if (!kindNorm) return { error: 'Tipo de envio não reconhecido.' }
  data.kind = kindNorm
  serialized = JSON.stringify(data)

  if (typeof data.schema !== 'number' || Number.isNaN(data.schema)) {
    if (kindNorm === 'estudo_biblico' && String(data.studyId || '').trim()) {
      data.schema = APP_EXPORT_SCHEMA_VERSION
      serialized = JSON.stringify(data)
    } else if (kindNorm === 'prova_biblica' && String(data.submissionId || '').trim()) {
      data.schema = APP_EXPORT_SCHEMA_VERSION
      serialized = JSON.stringify(data)
    } else {
      return { error: 'Versão do pacote inválida.' }
    }
  }

  const { canApply, readOnlyReason } = schemaReadOnly(data.schema)

  if (data.kind === 'discipulado') {
    const p = parseDiscipuladoExport(serialized)
    if (p.error) return { error: p.error }
    return {
      kind: 'discipulado',
      data: p.data,
      canApply: p.canApply,
      readOnlyReason: p.readOnlyReason
    }
  }

  if (data.kind === 'versiculos_marcados') {
    if (!data.marcados || typeof data.marcados !== 'object') return { error: 'Dados de versículos inválidos.' }
    return { kind: 'versiculos_marcados', data, canApply, readOnlyReason }
  }

  if (data.kind === 'biblia_versiculos') {
    if (!Array.isArray(data.items) || data.items.length === 0) return { error: 'Nenhum versículo no envio.' }
    return { kind: 'biblia_versiculos', data, canApply, readOnlyReason }
  }

  if (data.kind === 'devocional') {
    const concluidos = Array.isArray(data.concluidos)
      ? data.concluidos.map((x) => Number(x)).filter((x) => !Number.isNaN(x))
      : []
    return {
      kind: 'devocional',
      data: { ...data, concluidos },
      canApply,
      readOnlyReason
    }
  }

  if (data.kind === 'mais_de_deus') {
    const subtemasLidos = Array.isArray(data.subtemasLidos)
      ? data.subtemasLidos.map((x) => String(x))
      : []
    return {
      kind: 'mais_de_deus',
      data: { ...data, subtemasLidos },
      canApply,
      readOnlyReason
    }
  }

  if (data.kind === 'quiz') {
    return { kind: 'quiz', data, canApply, readOnlyReason }
  }

  if (data.kind === 'estudo_biblico') {
    const studyId = String(data.studyId || '').trim()
    if (!studyId) return { error: 'Identificador do estudo ausente.' }
    return {
      kind: 'estudo_biblico',
      data: {
        ...data,
        studyId,
        tema: String(data.tema || '').slice(0, 400),
        authorName: String(data.authorName || '').slice(0, 120),
        referenciaCompacta: String(data.referenciaCompacta || '').slice(0, 120)
      },
      canApply,
      readOnlyReason
    }
  }

  if (data.kind === 'prova_biblica') {
    const submissionId = String(data.submissionId || '').trim()
    if (!submissionId) return { error: 'Identificador da avaliação ausente.' }
    const rawLinhas = Array.isArray(data.linhasResumo) ? data.linhasResumo : []
    const linhasResumo = rawLinhas.slice(0, 30).map((row) => ({
      primary: String(row?.primary || '').slice(0, 200),
      secondary: String(row?.secondary || '').slice(0, 1200)
    }))
    return {
      kind: 'prova_biblica',
      data: {
        ...data,
        submissionId,
        studyId: String(data.studyId || '').trim(),
        tema: String(data.tema || '').slice(0, 400),
        professorName: String(data.professorName || '').slice(0, 120),
        alunoName: String(data.alunoName || '').slice(0, 120),
        notaTexto: String(data.notaTexto || '').slice(0, 80),
        resultUrl: String(data.resultUrl || '').slice(0, 800),
        linhasResumo
      },
      canApply: true,
      readOnlyReason: null
    }
  }

  return {
    error:
      'Tipo de envio não reconhecido. Atualize o aplicativo para a última versão ou peça para reenviar o estudo.'
  }
}

/** Aplica o pacote no armazenamento local (exceto discipulado — usa estado React). */
export function applyExportImport(kind, data, { setDiscipuladoRespostas, setDiscipuladoTema, navigate } = {}) {
  if (kind === 'discipulado') {
    if (!setDiscipuladoRespostas || !setDiscipuladoTema || !navigate || !data?.answers) return
    setDiscipuladoRespostas((prev) => ({ ...prev, ...data.answers }))
    setDiscipuladoTema(data.temaId)
    try {
      localStorage.setItem(
        'discipulado_ultima_licao',
        JSON.stringify({ temaId: data.temaId, estudoId: data.estudoId ?? null })
      )
    } catch {
      /* ignore */
    }
    navigate(
      data.estudoId != null ? `/discipulado/${data.temaId}/${data.estudoId}` : `/discipulado/${data.temaId}`
    )
    return
  }

  if (kind === 'versiculos_marcados') {
    mesclarVersiculosMarcadosImportados(data.marcados || {})
    navigate?.('/versiculos-marcados')
    return
  }

  if (kind === 'biblia_versiculos') {
    const merged = {}
    const iso = new Date().toISOString()
    for (const it of data.items || []) {
      const livroId = Number(it.livroId)
      const capitulo = Number(it.capitulo)
      const versiculo = Number(it.versiculo)
      const chave = `${livroId}-${capitulo}-${versiculo}`
      if (!obterVersiculosMarcados()[chave]) {
        merged[chave] = {
          livroId,
          capitulo,
          versiculo,
          corId: 'amarelo',
          texto: String(it.texto || '').slice(0, 500),
          dataMarcacao: iso,
          grupoMarcacaoId: null
        }
      }
    }
    mesclarVersiculosMarcadosImportados(merged)
    navigate?.('/versiculos-marcados')
    return
  }

  if (kind === 'devocional') {
    try {
      const raw = localStorage.getItem('devocionaisConcluidos')
      const prev = raw ? JSON.parse(raw) : []
      const a = Array.isArray(prev) ? prev.map((x) => Number(x)) : []
      const next = [...new Set([...a, ...(data.concluidos || [])])].filter((x) => !Number.isNaN(x)).sort((x, y) => x - y)
      localStorage.setItem('devocionaisConcluidos', JSON.stringify(next))
    } catch {
      /* ignore */
    }
    navigate?.('/devocional')
    return
  }

  if (kind === 'mais_de_deus') {
    try {
      const raw = localStorage.getItem('subtemasAssimDizLidos')
      const prev = raw ? JSON.parse(raw) : []
      const a = Array.isArray(prev) ? prev.map(String) : []
      const next = [...new Set([...a, ...(data.subtemasLidos || [])])]
      localStorage.setItem('subtemasAssimDizLidos', JSON.stringify(next))
    } catch {
      /* ignore */
    }
    navigate?.('/mais-de-deus')
    return
  }

  if (kind === 'estudo_biblico') {
    const sid = String(data.studyId || '').trim()
    if (!sid) return
    navigate?.(`/estudos-biblicos/abrir?estudo=${encodeURIComponent(sid)}`)
    return
  }

  if (kind === 'prova_biblica') {
    const sid = String(data.submissionId || '').trim()
    if (!sid) return
    navigate?.(`/estudos-biblicos/avaliacao-resultado?id=${encodeURIComponent(sid)}`)
    return
  }

  if (kind === 'quiz') {
    try {
      const curRaw = localStorage.getItem(QUIZ_STORAGE_BEST_FASE1)
      const cur = curRaw ? JSON.parse(curRaw) : {}
      const remote = data.fase1Best && typeof data.fase1Best === 'object' ? data.fase1Best : {}
      const hasRemoteCorrect = Object.prototype.hasOwnProperty.call(remote, 'correct')
      const best = {
        points: Math.max(Number(cur.points) || 0, Number(remote.points) || 0),
        correct: hasRemoteCorrect
          ? Math.max(Number(cur.correct) || 0, Number(remote.correct) || 0)
          : Number(cur.correct) || 0
      }
      localStorage.setItem(QUIZ_STORAGE_BEST_FASE1, JSON.stringify(best))
      if (data.phase2Unlocked === '1') localStorage.setItem(QUIZ_STORAGE_UNLOCK_PHASE2, '1')
      if (data.phase3Unlocked === '1') localStorage.setItem(QUIZ_STORAGE_UNLOCK_PHASE3, '1')
    } catch {
      /* ignore */
    }
    navigate?.('/quiz-retiro')
    return
  }
}

/**
 * Resume um payload para o diálogo de preview no chat.
 * Async por causa do caso 'discipulado' (carrega dataset completo sob
 * demanda). Os demais kinds resolvem imediatamente.
 */
export async function summarizeExportForDialog(parsed) {
  if (!parsed || parsed.error || !parsed.kind) return null
  const k = parsed.kind
  const d = parsed.data

  if (k === 'discipulado') {
    return { kind: k, discipulado: await summarizeDiscipuladoForPreview(d) }
  }
  if (k === 'versiculos_marcados') {
    const marcados = d?.marcados && typeof d.marcados === 'object' ? d.marcados : {}
    const rows = Object.values(marcados).slice(0, 80)
    return {
      kind: k,
      titulo: `${Object.keys(marcados).length} versículo(s) marcado(s)`,
      linhas: rows.map((v) => ({
        primary: rotuloVersiculo(v.livroId, v.capitulo, v.versiculo),
        secondary: (v.texto || '').slice(0, 200)
      }))
    }
  }
  if (k === 'biblia_versiculos') {
    const items = Array.isArray(d?.items) ? d.items : []
    return {
      kind: k,
      titulo: `${items.length} versículo(s)`,
      linhas: items.map((it) => ({
        primary: rotuloVersiculo(it.livroId, it.capitulo, it.versiculo),
        secondary: (it.texto || '').slice(0, 400)
      }))
    }
  }
  if (k === 'devocional') {
    const ids = Array.isArray(d?.concluidos) ? d.concluidos : []
    return {
      kind: k,
      titulo: d?.destaqueTitulo || 'Progresso de devocionais',
      subtitulo: `IDs como lido: ${ids.slice(0, 40).join(', ')}${ids.length > 40 ? '…' : ''}`
    }
  }
  if (k === 'mais_de_deus') {
    const ids = Array.isArray(d?.subtemasLidos) ? d.subtemasLidos : []
    return {
      kind: k,
      titulo: 'Subtemas como lidos',
      subtitulo: ids.length ? ids.slice(0, 20).join(', ') + (ids.length > 20 ? '…' : '') : '—'
    }
  }
  if (k === 'quiz') {
    const f = d?.fase1Best && typeof d.fase1Best === 'object' ? d.fase1Best : {}
    const pts = Number(f.points) || 0
    return {
      kind: k,
      titulo: 'Resultado do quiz',
      subtitulo: `${pts} pts · Fase 2 desbloqueada: ${d?.phase2Unlocked === '1' ? 'sim' : 'não'} · Fase 3: ${d?.phase3Unlocked === '1' ? 'sim' : 'não'}`
    }
  }
  if (k === 'estudo_biblico') {
    const por = d?.authorName ? `Por ${d.authorName}` : ''
    const ref = d?.referenciaCompacta || ''
    const sub = [por, ref].filter(Boolean).join(' · ')
    return {
      kind: k,
      titulo: d?.tema || 'Estudo compartilhado',
      subtitulo: sub || 'O destinatário pode abrir a leitura completa no app.'
    }
  }
  if (k === 'prova_biblica') {
    const prof = d?.professorName ? `Professor: ${d.professorName}\n` : ''
    const linhas = Array.isArray(d?.linhasResumo) && d.linhasResumo.length
      ? d.linhasResumo.map((row) => ({
          primary: String(row?.primary || ''),
          secondary: String(row?.secondary || '')
        }))
      : null
    return {
      kind: k,
      titulo: d?.tema || 'Avaliação',
      subtitulo: `${prof}Aluno: ${d?.alunoName || '—'}\nNota: ${d?.notaTexto || '—'}\n${d?.resultUrl ? `Link (somente leitura): ${d.resultUrl}` : ''}`,
      linhas
    }
  }
  return null
}

export function applyLabelForKind(kind) {
  switch (kind) {
    case 'discipulado':
      return 'Aplicar no meu discipulado'
    case 'versiculos_marcados':
      return 'Mesclar com os meus marcados'
    case 'biblia_versiculos':
      return 'Adicionar aos meus marcados'
    case 'devocional':
      return 'Mesclar devocionais lidos'
    case 'mais_de_deus':
      return 'Mesclar subtemas lidos'
    case 'quiz':
      return 'Mesclar progresso do quiz'
    case 'estudo_biblico':
      return 'Abrir estudo'
    case 'prova_biblica':
      return 'Abrir resultado da avaliação'
    default:
      return 'Aplicar'
  }
}
