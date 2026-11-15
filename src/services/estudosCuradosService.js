import { sufixoTraducaoEstudo, validarTraducaoEstudo } from '../utils/estudoTraducao'
/**
 * Camada de leitura/escrita para os **estudos curados** (aprovados pelo admin)
 * no Realtime Database.
 *
 * Conceito
 * --------
 * Quando um administrador aprova ("joia") um estudo bíblico gerado, salvamos
 * o conteúdo no RTDB para que **quem pedir o mesmo trecho receba a versão
 * aprovada direto** — sem chamar a IA novamente. Isso reduz drasticamente o
 * uso de cota Gemini e oferece a todos a versão pastoralmente revisada.
 *
 * Duas tabelas se complementam:
 *
 * 1. `estudosCurados/{livro}_{cap}_{versSet}[~tom]`:
 *      texto completo aprovado para a combinação exata de versículos.
 *
 * 2. `pericopesCuradas/{livro}_{cap}_{ini}_{fim}[~tom]`:
 *      estudo completo da perícope.
 *
 * `versSet` é a lista de versículos únicos, ordenados, unidos por hífen
 *   (ex.: "1-2-3"). Funciona como chave estável para o trecho.
 *
 * Convenção de chaves com **tom** (legado RTDB)
 * ----------------------------------------------
 * - `pastoral` (padrão) mantém a chave sem sufixo.
 * - Outros tons usam sufixo `~<tom>` (ex.: `43_3_1-2~academico`).
 * - A UI atual não expõe tons; a leitura ainda pode encontrar chaves antigas.
 */

import { sufixoChaveRtdbTom, TONS_IDS, extrairTomDaChave } from '../utils/iaTonalidade'

const PREFIXO_ESTUDO = 'estudosCurados'
const PREFIXO_PERICOPE = 'pericopesCuradas'
const PREFIXO_FEEDBACK = 'feedbackEstudos'
/** Candidato: foi aprovado por algum usuário comum (👍) e fica visível enquanto admin não decide. */
const PREFIXO_CANDIDATO = 'estudosCandidatos'
const PREFIXO_PERICOPE_CANDIDATA = 'pericopesCandidatas'
/** Voto individual de cada usuário: 'positivo' | 'negativo'. */
const PREFIXO_VOTO = 'votosEstudos'

/** Constrói uma string estável a partir do array de versículos. */
function montarVersSet(versArr) {
  return [...new Set((versArr || []).map((n) => Number(n)))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
    .join('-')
}

/**
 * Chave RTDB para o estudo de versículo(s) com tom opcional.
 *
 * `pastoral` mantém a chave antiga (sem sufixo). Outros tons sufixam
 * com `~<tom>`. Ver "Convenção de tom" no cabeçalho.
 */
export function chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica) {
  const base = `${Number(livroId) || 0}_${Number(capitulo) || 0}_${montarVersSet(versArr)}`
  return `${base}${sufixoChaveRtdbTom(tom)}${sufixoTraducaoEstudo(versaoBiblica)}`
}

export function chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  const base = `${Number(livroId) || 0}_${Number(capitulo) || 0}_${Number(inicio) || 0}_${Number(fim) || 0}`
  return `${base}${sufixoChaveRtdbTom(tom)}${sufixoTraducaoEstudo(versaoBiblica)}`
}

async function obterRtdb() {
  const { getFirebaseDatabase, loadFirebaseModules } = await import('../config/firebase')
  await loadFirebaseModules()
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Firebase não disponível')
  const dbApi = await import('firebase/database')
  return { db, dbApi }
}

/* =====================================================================
 * LEITURA
 * ===================================================================== */

/**
 * Lê o estudo curado completo para o set EXATO de versículos no tom dado.
 *
 * @returns {Promise<null | {
 *   texto: string,
 *   pericopeKey: string | null,
 *   referenciaCompacta: string,
 *   atualizadoEm: number,
 *   autorUid: string | null,
 *   versao: number
 * }>}
 */
export async function lerEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica) {
  try {
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    const { db, dbApi } = await obterRtdb()
    const snap = await dbApi.get(dbApi.ref(db, `${PREFIXO_ESTUDO}/${k}`))
    if (!snap.exists()) return null
    const v = snap.val() || {}
    if (typeof v.texto !== 'string' || !v.texto.trim()) return null
    return {
      texto: v.texto,
      versaoBiblica: v.versaoBiblica || versaoBiblica || null,
      origemEstudo: v.origemEstudo || null,
      geradoEm: Number(v.geradoEm) || 0,
      pericopeKey: v.pericopeKey || null,
      referenciaCompacta: v.referenciaCompacta || '',
      atualizadoEm: Number(v.atualizadoEm) || 0,
      autorUid: v.autorUid || null,
      versao: Number(v.versao) || 1
    }
  } catch (_) {
    return null
  }
}

export async function lerPericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  try {
    const k = chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)
    const { db, dbApi } = await obterRtdb()
    const snap = await dbApi.get(dbApi.ref(db, `${PREFIXO_PERICOPE}/${k}`))
    if (!snap.exists()) return null
    const v = snap.val() || {}
    const texto = typeof v.texto === 'string' ? v.texto : ''
    if (!texto.trim()) return null
    return {
      texto,
      versaoBiblica: v.versaoBiblica || versaoBiblica || null,
      origemEstudo: v.origemEstudo || null,
      geradoEm: Number(v.geradoEm) || 0,
      titulo: v.titulo || '',
      referencia: v.referencia || '',
      atualizadoEm: Number(v.atualizadoEm) || 0,
      autorUid: v.autorUid || null
    }
  } catch (_) {
    return null
  }
}

/**
 * Tenta extrair a seção "## Visão da perícope" de um texto markdown gerado.
 * Devolve apenas o conteúdo (sem o título), pronto para reuso.
 */
export function extrairVisaoPericopeDoMarkdown(textoMd) {
  const txt = String(textoMd || '')
  if (!txt) return ''
  const linhas = txt.split('\n')
  const idxIni = linhas.findIndex(
    (l) => /^##\s+vis[aã]o\s+d[ae]?\s*per[ií]cope\b/i.test(l.trim())
  )
  if (idxIni < 0) return ''
  let idxFim = linhas.length
  for (let i = idxIni + 1; i < linhas.length; i++) {
    if (/^##\s+\S/.test(linhas[i].trim())) {
      idxFim = i
      break
    }
  }
  return linhas.slice(idxIni + 1, idxFim).join('\n').trim()
}

/* =====================================================================
 * ESCRITA — admin (oficial)
 * ===================================================================== */

/**
 * Salva (cria/atualiza) o **comentário oficial** para o conjunto exato de
 * versículos. Promoção encerra a votação do tom: candidato e votos são
 * apagados em seguida.
 *
 * @param {{ livroId, capitulo, versArr, texto, referenciaCompacta?, pericopeKey?, uidAutor, tom? }} params
 */
export async function salvarEstudoCurado({
  livroId,
  capitulo,
  versArr,
  texto,
  referenciaCompacta = '',
  pericopeKey = null,
  uidAutor,
  tom,
  versaoBiblica,
  origemEstudo = null,
  geradoEm = 0
}) {
  if (!uidAutor) return { ok: false, error: 'Sem autorização.' }
  if (!texto || !String(texto).trim()) return { ok: false, error: 'Texto vazio.' }

  try {
    const { db, dbApi } = await obterRtdb()
    const agora = Date.now()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    await dbApi.set(dbApi.ref(db, `${PREFIXO_ESTUDO}/${k}`), {
      texto: String(texto),
      ...(versaoBiblica ? { versaoBiblica } : {}),
      ...(origemEstudo ? { origemEstudo } : {}),
      ...(geradoEm ? { geradoEm } : {}),
      referenciaCompacta: String(referenciaCompacta || ''),
      pericopeKey: pericopeKey || null,
      atualizadoEm: agora,
      autorUid: uidAutor,
      versao: 1
    })
    // Promoção encerra a "campanha" do candidato deste tom. A Cloud
    // Function de 10 👍 faz o mesmo ao promover automaticamente.
    await Promise.allSettled([
      dbApi.remove(dbApi.ref(db, `${PREFIXO_CANDIDATO}/${k}`)),
      dbApi.remove(dbApi.ref(db, `${PREFIXO_VOTO}/${k}`))
    ])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao salvar.' }
  }
}

export async function salvarPericopeCurada({
  livroId,
  capitulo,
  inicio,
  fim,
  texto,
  titulo = '',
  referencia = '',
  uidAutor,
  tom,
  versaoBiblica,
  origemEstudo = null,
  geradoEm = 0
}) {
  if (!uidAutor) return { ok: false, error: 'Sem autorização.' }
  if (!texto || !String(texto).trim()) return { ok: false, error: 'Texto vazio.' }
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)
    await dbApi.set(dbApi.ref(db, `${PREFIXO_PERICOPE}/${k}`), {
      texto: String(texto),
      ...(versaoBiblica ? { versaoBiblica } : {}),
      ...(origemEstudo ? { origemEstudo } : {}),
      ...(geradoEm ? { geradoEm } : {}),
      titulo: String(titulo || ''),
      referencia: String(referencia || ''),
      atualizadoEm: Date.now(),
      autorUid: uidAutor,
      versao: 1
    })
    // Votos de perícope usam prefixo `peri:`.
    await Promise.allSettled([
      dbApi.remove(dbApi.ref(db, `${PREFIXO_PERICOPE_CANDIDATA}/${k}`)),
      dbApi.remove(dbApi.ref(db, `${PREFIXO_VOTO}/peri:${k}`))
    ])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao salvar.' }
  }
}

export async function removerPericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)
    await dbApi.remove(dbApi.ref(db, `${PREFIXO_PERICOPE}/${k}`))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao remover.' }
  }
}

export async function removerEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica) {
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    await dbApi.remove(dbApi.ref(db, `${PREFIXO_ESTUDO}/${k}`))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao remover.' }
  }
}

export async function registrarFeedbackNegativo({ livroId, capitulo, versArr, motivo = '', uid, tom, versaoBiblica }) {
  if (!uid) return { ok: false, error: 'Sem autorização.' }
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    await dbApi.set(dbApi.ref(db, `${PREFIXO_FEEDBACK}/${k}/${uid}`), {
      motivo: String(motivo || '').slice(0, 400),
      criadoEm: Date.now()
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao registrar.' }
  }
}

/* =====================================================================
 * CANDIDATOS — publicados por usuários comuns via 👍
 * ===================================================================== */

export async function lerEstudoCandidato(livroId, capitulo, versArr, tom, versaoBiblica) {
  try {
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    const { db, dbApi } = await obterRtdb()
    const snap = await dbApi.get(dbApi.ref(db, `${PREFIXO_CANDIDATO}/${k}`))
    if (!snap.exists()) return null
    const v = snap.val() || {}
    if (typeof v.texto !== 'string' || !v.texto.trim()) return null
    return {
      texto: v.texto,
      versaoBiblica: v.versaoBiblica || versaoBiblica || null,
      origemEstudo: v.origemEstudo || null,
      geradoEm: Number(v.geradoEm) || 0,
      pericopeKey: v.pericopeKey || null,
      referenciaCompacta: v.referenciaCompacta || '',
      atualizadoEm: Number(v.atualizadoEm) || 0,
      autorUid: v.autorUid || null
    }
  } catch (_) {
    return null
  }
}

export async function lerPericopeCandidata(livroId, capitulo, inicio, fim, tom, versaoBiblica) {
  try {
    const k = chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)
    const { db, dbApi } = await obterRtdb()
    const snap = await dbApi.get(dbApi.ref(db, `${PREFIXO_PERICOPE_CANDIDATA}/${k}`))
    if (!snap.exists()) return null
    const v = snap.val() || {}
    const texto = typeof v.texto === 'string' ? v.texto : ''
    if (!texto.trim()) return null
    return {
      texto,
      versaoBiblica: v.versaoBiblica || versaoBiblica || null,
      origemEstudo: v.origemEstudo || null,
      geradoEm: Number(v.geradoEm) || 0,
      titulo: v.titulo || '',
      referencia: v.referencia || '',
      atualizadoEm: Number(v.atualizadoEm) || 0,
      autorUid: v.autorUid || null
    }
  } catch (_) {
    return null
  }
}

export async function publicarEstudoCandidato({
  livroId,
  capitulo,
  versArr,
  texto,
  referenciaCompacta = '',
  pericopeKey = null,
  uidAutor,
  tom,
  versaoBiblica,
  origemEstudo = null,
  geradoEm = 0
}) {
  if (!uidAutor) return { ok: false, error: 'Sem autorização.' }
  if (!texto || !String(texto).trim()) return { ok: false, error: 'Texto vazio.' }

  try {
    const { db, dbApi } = await obterRtdb()
    const agora = Date.now()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    const refEst = dbApi.ref(db, `${PREFIXO_CANDIDATO}/${k}`)
    const snapEst = await dbApi.get(refEst)
    if (!snapEst.exists()) {
      await dbApi.set(refEst, {
        texto: String(texto),
        ...(versaoBiblica ? { versaoBiblica } : {}),
        ...(origemEstudo ? { origemEstudo } : {}),
        ...(geradoEm ? { geradoEm } : {}),
        referenciaCompacta: String(referenciaCompacta || ''),
        pericopeKey: pericopeKey || null,
        atualizadoEm: agora,
        autorUid: uidAutor
      })
    }
    return { ok: true, jaExistia: snapEst.exists() }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao publicar.' }
  }
}

export async function descartarEstudoCandidato({ livroId, capitulo, versArr, tom, versaoBiblica }) {
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    await Promise.allSettled([
      dbApi.remove(dbApi.ref(db, `${PREFIXO_CANDIDATO}/${k}`)),
      dbApi.remove(dbApi.ref(db, `${PREFIXO_VOTO}/${k}`))
    ])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao descartar.' }
  }
}

export async function descartarPericopeCandidata({ livroId, capitulo, inicio, fim, tom, versaoBiblica }) {
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)
    await Promise.allSettled([
      dbApi.remove(dbApi.ref(db, `${PREFIXO_PERICOPE_CANDIDATA}/${k}`)),
      dbApi.remove(dbApi.ref(db, `${PREFIXO_VOTO}/peri:${k}`))
    ])
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao descartar.' }
  }
}

export async function publicarPericopeCandidata({
  livroId,
  capitulo,
  inicio,
  fim,
  texto,
  titulo = '',
  referencia = '',
  uidAutor,
  tom,
  versaoBiblica,
  origemEstudo = null,
  geradoEm = 0
}) {
  if (!uidAutor) return { ok: false, error: 'Sem autorização.' }
  if (!texto || !String(texto).trim()) return { ok: false, error: 'Texto vazio.' }
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)
    const refPeri = dbApi.ref(db, `${PREFIXO_PERICOPE_CANDIDATA}/${k}`)
    const snap = await dbApi.get(refPeri)
    if (!snap.exists()) {
      await dbApi.set(refPeri, {
        texto: String(texto),
        ...(versaoBiblica ? { versaoBiblica } : {}),
        ...(origemEstudo ? { origemEstudo } : {}),
        ...(geradoEm ? { geradoEm } : {}),
        titulo: String(titulo || ''),
        referencia: String(referencia || ''),
        atualizadoEm: Date.now(),
        autorUid: uidAutor
      })
    }
    return { ok: true, jaExistia: snap.exists() }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao publicar.' }
  }
}

/* =====================================================================
 * VOTOS — 1 voto por usuário por estudo (por tom)
 * ===================================================================== */

export async function registrarVoto({ livroId, capitulo, versArr, voto, uid, tom, versaoBiblica }) {
  if (!uid) return { ok: false, error: 'Sem autorização.' }
  if (voto !== 'positivo' && voto !== 'negativo') {
    return { ok: false, error: 'Voto inválido.' }
  }
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    await dbApi.set(dbApi.ref(db, `${PREFIXO_VOTO}/${k}/${uid}`), {
      voto,
      criadoEm: Date.now()
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao votar.' }
  }
}

export async function lerMeuVoto({ livroId, capitulo, versArr, uid, tom, versaoBiblica }) {
  if (!uid) return null
  try {
    const { db, dbApi } = await obterRtdb()
    const k = chaveEstudoCurado(livroId, capitulo, versArr, tom, versaoBiblica)
    const snap = await dbApi.get(dbApi.ref(db, `${PREFIXO_VOTO}/${k}/${uid}`))
    if (!snap.exists()) return null
    const v = snap.val() || {}
    return v.voto || null
  } catch (_) {
    return null
  }
}

export async function registrarVotoPericope({ livroId, capitulo, inicio, fim, voto, uid, tom, versaoBiblica }) {
  if (!uid) return { ok: false, error: 'Sem autorização.' }
  if (voto !== 'positivo' && voto !== 'negativo') return { ok: false, error: 'Voto inválido.' }
  try {
    const { db, dbApi } = await obterRtdb()
    const k = `peri:${chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)}`
    await dbApi.set(dbApi.ref(db, `${PREFIXO_VOTO}/${k}/${uid}`), {
      voto,
      criadoEm: Date.now()
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Falha ao votar.' }
  }
}

export async function lerMeuVotoPericope({ livroId, capitulo, inicio, fim, uid, tom, versaoBiblica }) {
  if (!uid) return null
  try {
    const { db, dbApi } = await obterRtdb()
    const k = `peri:${chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versaoBiblica)}`
    const snap = await dbApi.get(dbApi.ref(db, `${PREFIXO_VOTO}/${k}/${uid}`))
    if (!snap.exists()) return null
    const v = snap.val() || {}
    return v.voto || null
  } catch (_) {
    return null
  }
}

/* =====================================================================
 * PROBE — verifica quais tons já têm conteúdo (oficial/candidato).
 * Útil para ferramentas/admin; a UI pública de estudos usa tom integrado
 * na geração (`addonTomIntegrado`), sem seletor de tom.
 * ===================================================================== */

/**
 * @typedef {Object<string, { fonte: 'oficial'|'candidato'|null, atualizadoEm?: number }>} StatusTons
 */

/**
 * Resolve para cada tom se existe oficial, candidato ou nada — para
 * versículos. Faz `${TONS_IDS.length}*2` leituras pequenas em paralelo.
 *
 * @returns {Promise<StatusTons>}
 */
export async function lerStatusTonsVersiculo(livroId, capitulo, versArr) {
  const tarefas = TONS_IDS.map(async (tom) => {
    const [of, cd] = await Promise.all([
      lerEstudoCurado(livroId, capitulo, versArr, tom),
      lerEstudoCandidato(livroId, capitulo, versArr, tom)
    ])
    if (of?.texto) return [tom, { fonte: 'oficial', atualizadoEm: of.atualizadoEm }]
    if (cd?.texto) return [tom, { fonte: 'candidato', atualizadoEm: cd.atualizadoEm }]
    return [tom, { fonte: null }]
  })
  const pares = await Promise.all(tarefas)
  return Object.fromEntries(pares)
}

/**
 * Mesmo que `lerStatusTonsVersiculo`, mas para perícope.
 *
 * @returns {Promise<StatusTons>}
 */
export async function lerStatusTonsPericope(livroId, capitulo, inicio, fim) {
  const tarefas = TONS_IDS.map(async (tom) => {
    const [of, cd] = await Promise.all([
      lerPericopeCurada(livroId, capitulo, inicio, fim, tom),
      lerPericopeCandidata(livroId, capitulo, inicio, fim, tom)
    ])
    if (of?.texto) return [tom, { fonte: 'oficial', atualizadoEm: of.atualizadoEm }]
    if (cd?.texto) return [tom, { fonte: 'candidato', atualizadoEm: cd.atualizadoEm }]
    return [tom, { fonte: null }]
  })
  const pares = await Promise.all(tarefas)
  return Object.fromEntries(pares)
}

/* =====================================================================
 * LISTAGEM — alimenta a "Biblioteca de estudos"
 * ===================================================================== */

function parseChaveEstudo(key) {
  const { base, tom } = extrairTomDaChave(String(key).replace(/~biblia_(ara|naa|ntlh)$/, ''))
  const parts = String(base || '').split('_')
  if (parts.length < 3) return null
  const livroId = Number(parts[0])
  const capitulo = Number(parts[1])
  const vers = String(parts.slice(2).join('_') || '').trim()
  const versArr = vers
    .split('-')
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0)
  if (!livroId || !capitulo || !versArr.length) return null
  return { livroId, capitulo, versArr, tom }
}

function parseChavePericope(key) {
  const { base, tom } = extrairTomDaChave(String(key).replace(/~biblia_(ara|naa|ntlh)$/, ''))
  const parts = String(base || '').split('_')
  if (parts.length !== 4) return null
  const [livroId, capitulo, inicio, fim] = parts.map((x) => Number(x))
  if (!livroId || !capitulo || !inicio || !fim) return null
  return { livroId, capitulo, inicio, fim, tom }
}

async function lerNoCompleto(caminho) {
  try {
    const { db, dbApi } = await obterRtdb()
    const snap = await dbApi.get(dbApi.ref(db, caminho))
    if (!snap.exists()) return {}
    return snap.val() || {}
  } catch (_) {
    return {}
  }
}

/**
 * @returns {Promise<Array<{
 *   status: 'oficial'|'candidato',
 *   livroId: number,
 *   capitulo: number,
 *   versArr: number[],
 *   tom: string,
 *   referenciaCompacta: string,
 *   pericopeKey: string | null,
 *   atualizadoEm: number
 * }>>}
 */
export async function listarEstudosVersiculo() {
  const [oficiais, candidatos] = await Promise.all([
    lerNoCompleto(PREFIXO_ESTUDO),
    lerNoCompleto(PREFIXO_CANDIDATO)
  ])
  const itens = []
  for (const [chave, v] of Object.entries(oficiais)) {
    if (!v || typeof v.texto !== 'string' || !v.texto.trim()) continue
    if (/~biblia_(naa|ntlh)$/.test(chave)) continue
    if (!/~biblia_/.test(chave) && (oficiais[chave + '~biblia_ara'] || candidatos[chave + '~biblia_ara'])) continue
    const ids = parseChaveEstudo(chave)
    if (!ids) continue
    itens.push({
      status: 'oficial',
      livroId: ids.livroId,
      capitulo: ids.capitulo,
      versArr: ids.versArr,
      tom: ids.tom,
      referenciaCompacta: v.referenciaCompacta || '',
      pericopeKey: v.pericopeKey || null,
      atualizadoEm: Number(v.atualizadoEm) || 0
    })
  }
  for (const [chave, v] of Object.entries(candidatos)) {
    if (!v || typeof v.texto !== 'string' || !v.texto.trim()) continue
    if (/~biblia_(naa|ntlh)$/.test(chave)) continue
    if (!/~biblia_/.test(chave) && (oficiais[chave + '~biblia_ara'] || candidatos[chave + '~biblia_ara'])) continue
    const ids = parseChaveEstudo(chave)
    if (!ids) continue
    // Oficial do MESMO tom prevalece sobre candidato do mesmo tom.
    if (oficiais[chave]) continue
    itens.push({
      status: 'candidato',
      livroId: ids.livroId,
      capitulo: ids.capitulo,
      versArr: ids.versArr,
      tom: ids.tom,
      referenciaCompacta: v.referenciaCompacta || '',
      pericopeKey: v.pericopeKey || null,
      atualizadoEm: Number(v.atualizadoEm) || 0
    })
  }
  return itens
}

/**
 * @returns {Promise<Array<{
 *   status: 'oficial'|'candidato',
 *   livroId: number,
 *   capitulo: number,
 *   inicio: number,
 *   fim: number,
 *   tom: string,
 *   titulo: string,
 *   referencia: string,
 *   atualizadoEm: number
 * }>>}
 */
export async function listarEstudosPericope() {
  const [oficiais, candidatos] = await Promise.all([
    lerNoCompleto(PREFIXO_PERICOPE),
    lerNoCompleto(PREFIXO_PERICOPE_CANDIDATA)
  ])
  const itens = []
  for (const [chave, v] of Object.entries(oficiais)) {
    if (!v || typeof v.texto !== 'string' || !v.texto.trim()) continue
    if (/~biblia_(naa|ntlh)$/.test(chave)) continue
    if (!/~biblia_/.test(chave) && (oficiais[chave + '~biblia_ara'] || candidatos[chave + '~biblia_ara'])) continue
    const ids = parseChavePericope(chave)
    if (!ids) continue
    itens.push({
      status: 'oficial',
      livroId: ids.livroId,
      capitulo: ids.capitulo,
      inicio: ids.inicio,
      fim: ids.fim,
      tom: ids.tom,
      titulo: v.titulo || '',
      referencia: v.referencia || '',
      atualizadoEm: Number(v.atualizadoEm) || 0
    })
  }
  for (const [chave, v] of Object.entries(candidatos)) {
    if (!v || typeof v.texto !== 'string' || !v.texto.trim()) continue
    if (/~biblia_(naa|ntlh)$/.test(chave)) continue
    if (!/~biblia_/.test(chave) && (oficiais[chave + '~biblia_ara'] || candidatos[chave + '~biblia_ara'])) continue
    const ids = parseChavePericope(chave)
    if (!ids) continue
    if (oficiais[chave]) continue
    itens.push({
      status: 'candidato',
      livroId: ids.livroId,
      capitulo: ids.capitulo,
      inicio: ids.inicio,
      fim: ids.fim,
      tom: ids.tom,
      titulo: v.titulo || '',
      referencia: v.referencia || '',
      atualizadoEm: Number(v.atualizadoEm) || 0
    })
  }
  return itens
}

/** Cada página mantém seu repositório fixado à tradução do estudo. */
export function criarRepositorioEstudosPorTraducao(id, { legadoAra = false } = {}) {
  const versao = legadoAra && id === 'ara' ? undefined : validarTraducaoEstudo(id).id
  const posicional = (fn, quantidade) => (...args) => {
    while (args.length < quantidade - 1) args.push(undefined)
    return fn(...args, versao)
  }
  const objeto = fn => params => fn({ ...params, versaoBiblica: versao })
  return {
    lerEstudoCurado: posicional(lerEstudoCurado, 5), lerEstudoCandidato: posicional(lerEstudoCandidato, 5),
    lerPericopeCurada: posicional(lerPericopeCurada, 6), lerPericopeCandidata: posicional(lerPericopeCandidata, 6),
    chavePericopeCurada: posicional(chavePericopeCurada, 6),
    removerEstudoCurado: posicional(removerEstudoCurado, 5), removerPericopeCurada: posicional(removerPericopeCurada, 6),
    salvarEstudoCurado: objeto(salvarEstudoCurado), salvarPericopeCurada: objeto(salvarPericopeCurada),
    publicarEstudoCandidato: objeto(publicarEstudoCandidato), publicarPericopeCandidata: objeto(publicarPericopeCandidata),
    descartarEstudoCandidato: objeto(descartarEstudoCandidato), descartarPericopeCandidata: objeto(descartarPericopeCandidata),
    registrarVoto: objeto(registrarVoto), registrarVotoPericope: objeto(registrarVotoPericope),
    lerMeuVoto: objeto(lerMeuVoto), lerMeuVotoPericope: objeto(lerMeuVotoPericope),
  }
}

/** Falha de rede é propagada: não podemos tratá-la como ausência e cobrar nova geração. */
export async function consultarRegistrosEstudo({ tipo, livroId, capitulo, versArr, inicio, fim }) {
  const { db, dbApi } = await obterRtdb()
  const pericope = tipo === 'pericope'
  const tarefas = []
  for (const versao of [undefined, 'ara', 'naa', 'ntlh']) {
    for (const tom of TONS_IDS) {
      const chave = pericope
        ? chavePericopeCurada(livroId, capitulo, inicio, fim, tom, versao)
        : chaveEstudoCurado(livroId, capitulo, versArr, tom, versao)
      for (const fonte of ['oficial', 'candidato']) {
        const prefixo = pericope
          ? (fonte === 'oficial' ? PREFIXO_PERICOPE : PREFIXO_PERICOPE_CANDIDATA)
          : (fonte === 'oficial' ? PREFIXO_ESTUDO : PREFIXO_CANDIDATO)
        tarefas.push(dbApi.get(dbApi.ref(db, prefixo + '/' + chave)).then(snap => ({
          versao, tom, fonte, estudo: snap.exists() ? snap.val() : null
        })))
      }
    }
  }
  return Promise.all(tarefas)
}
