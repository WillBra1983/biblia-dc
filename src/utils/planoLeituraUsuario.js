/**
 * Instância única de plano de leitura (máx. 1 ativa), prazo e métricas.
 * A sequência do plano só evolui com leitura registrada ou com confirmação explícita do usuário quando o fluxo permitir.
 */

import { PLANOS } from '../data/planos'
import {
  diaCivilAmericaSaoPaulo,
  diferencaDiasIso,
  subtrairDiasIso,
} from './fusoHorarioBrasil'
import {
  apagarChaveEscadaInstancia,
  processarAoConcluirDiaNoPlano,
  reconciliarEscadaComIndices,
  zerarEscadaInstancia,
  zerarInventarioEscada,
} from './escadaPlanoLeitura'

export const MAX_PLANOS_ATIVOS = 1
export const MAX_DIAS_PLANO = 366

const STORAGE = 'planoLeitura_instancias_v2'
const STORAGE_MIGR_FLAG = 'planoLeitura_migracao_v2_ok'
const LEGACY_PREFIX = 'planoLeitura_'

const VERSION = 2

function novoEstadoVazio() {
  return {
    v: VERSION,
    instanciaAtivaId: null,
    instancias: [],
  }
}

function carregarRaw() {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return null
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object') return null
    return j
  } catch {
    return null
  }
}

function gravarEstado(estado) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({ ...estado, v: VERSION }))
  } catch {
    /* ignore */
  }
}

function normalizarInstancia(i) {
  if (!i || typeof i !== 'object') return null
  return {
    id: String(i.id || ''),
    templateId: String(i.templateId || ''),
    dataInicio: String(i.dataInicio || ''),
    dataFim: String(i.dataFim || ''),
    createdAt: String(i.createdAt || ''),
    capitulosLidos: Array.isArray(i.capitulosLidos) ? i.capitulosLidos.map(String) : [],
    diasComLeitura: Array.isArray(i.diasComLeitura)
      ? [...new Set(i.diasComLeitura.map(String).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
      : [],
    ultimoDiaCadeia: String(i.ultimoDiaCadeia || ''),
    sequenciaConsecutiva: Math.max(0, Number(i.sequenciaConsecutiva) || 0),
    diasRecuperados: Array.isArray(i.diasRecuperados) ? [...new Set(i.diasRecuperados.map(String))].sort() : [],
    medalhasAberturaMostradas: Array.isArray(i.medalhasAberturaMostradas)
      ? i.medalhasAberturaMostradas.map(String)
      : [],
    capitulosMarcadosPorDia:
      i.capitulosMarcadosPorDia != null &&
      typeof i.capitulosMarcadosPorDia === 'object' &&
      !Array.isArray(i.capitulosMarcadosPorDia)
        ? Object.fromEntries(
            Object.entries(i.capitulosMarcadosPorDia).map(([k, v]) => [
              String(k),
              Math.max(0, Number(v) || 0),
            ])
          )
        : {},
    indicesPlanoBonificados: Array.isArray(i.indicesPlanoBonificados)
      ? [...new Set(i.indicesPlanoBonificados.map(Number).filter((n) => n >= 1))].sort((a, b) => a - b)
      : [],
  }
}

export function carregarEstadoPlanoLeituraUsuario() {
  const raw = carregarRaw()
  if (!raw) return novoEstadoVazio()
  const instancias = Array.isArray(raw.instancias)
    ? raw.instancias.map(normalizarInstancia).filter(Boolean)
    : []
  return {
    v: VERSION,
    instanciaAtivaId: raw.instanciaAtivaId ? String(raw.instanciaAtivaId) : null,
    instancias,
  }
}

export function exportarEstadoPlanoLeituraParaNuvem() {
  const estado = carregarEstadoPlanoLeituraUsuario()
  return {
    v: VERSION,
    instanciaAtivaId: estado.instanciaAtivaId ?? null,
    instancias: Array.isArray(estado.instancias) ? estado.instancias.map(normalizarInstancia).filter(Boolean) : [],
  }
}

export function aplicarEstadoPlanoLeituraDaNuvem(estadoRemoto) {
  if (!estadoRemoto || typeof estadoRemoto !== 'object') return false
  const instancias = Array.isArray(estadoRemoto.instancias)
    ? estadoRemoto.instancias.map(normalizarInstancia).filter(Boolean)
    : []
  const instanciaAtivaRemota = estadoRemoto.instanciaAtivaId ? String(estadoRemoto.instanciaAtivaId) : null
  const instanciaAtivaIdNormalizada =
    instanciaAtivaRemota && instancias.some((i) => i.id === instanciaAtivaRemota)
      ? instanciaAtivaRemota
      : instancias[0]?.id ?? null
  const proximo = {
    v: VERSION,
    instanciaAtivaId: instanciaAtivaIdNormalizada,
    instancias: instancias.slice(0, MAX_PLANOS_ATIVOS),
  }
  gravarEstado(proximo)
  emitirPlanoLeituraPersistenciaAlterada()
  return true
}

export function obterTemplate(templateId) {
  return PLANOS.find((p) => p.id === templateId) || null
}

/**
 * Dias civil entre início e fim (inclusive).
 */
export function contarDiasEntreInicioFim(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return 0
  const d = diferencaDiasIso(dataInicio, dataFim)
  return d < 0 ? 0 : d + 1
}

/** Dia 1 = primeiro dia do plano (dataInicio). Fora da janela → null. */
export function indiceDiaNoPlano(inst, iso) {
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return null
  if (diferencaDiasIso(inst.dataInicio, iso) < 0) return null
  if (diferencaDiasIso(inst.dataFim, iso) > 0) return null
  return diferencaDiasIso(inst.dataInicio, iso) + 1
}

export function cumulativoEsperadoAteDiaK(totalCaps, diasPlano, k) {
  if (k <= 0) return 0
  if (k >= diasPlano) return totalCaps
  return Math.floor((k * totalCaps) / diasPlano)
}

/**
 * Índices do plano (k) em que o prêmio do dia já foi conquistado (`indicesPlanoBonificados`).
 */
export function obterIndicesPremioDia(inst) {
  const t = obterTemplate(inst.templateId)
  if (!t) return []
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return []
  const total = t.capitulos
  const lidos = inst.capitulosLidos.length
  const raw = Array.isArray(inst.indicesPlanoBonificados) ? inst.indicesPlanoBonificados : []
  return [
    ...new Set(
      raw
        .map(Number)
        .filter(
          (k) =>
            Number.isFinite(k) && k >= 1 && k <= D && lidos >= cumulativoEsperadoAteDiaK(total, D, k)
        )
    ),
  ].sort((a, b) => a - b)
}

/** Dias de leitura = marcos do plano com prêmio do dia (não total de capítulos). */
export function calcularDiasLeitura(inst) {
  return obterIndicesPremioDia(inst).length
}

/**
 * Dias consecutivos do plano com prêmio, encerrando no dia do plano de hoje (Brasília).
 * Sem prêmio do dia de hoje → 0.
 */
export function calcularSequenciaConsecutiva(inst, hoje = diaCivilAmericaSaoPaulo()) {
  const indices = new Set(obterIndicesPremioDia(inst))
  const kHoje = indiceDiaNoPlano(inst, hoje)
  if (kHoje == null || !indices.has(kHoje)) return 0

  let seq = 0
  let k = kHoje
  while (indices.has(k)) {
    seq += 1
    k -= 1
  }
  return seq
}

function reconciliarSequenciaConsecutiva(inst, hoje = diaCivilAmericaSaoPaulo()) {
  inst.sequenciaConsecutiva = calcularSequenciaConsecutiva(inst, hoje)
  return inst.sequenciaConsecutiva
}

/** Próximo marco cumulativo (cada “dia do plano” = um degrau de bonificação). */
export function obterProximoMarcoProgresso(inst) {
  const t = obterTemplate(inst.templateId)
  if (!t) return null
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return null
  const total = t.capitulos
  const lidos = inst.capitulosLidos.length
  for (let k = 1; k <= D; k++) {
    const cum = cumulativoEsperadoAteDiaK(total, D, k)
    if (lidos < cum) {
      return {
        proximoIndiceDiaPlano: k,
        cumulativoAlvo: cum,
        lidos,
        faltam: cum - lidos,
      }
    }
  }
  return { planoCompleto: true, lidos, total }
}

function garantirIndicesHistoricosSemPremio(inst) {
  if (!Array.isArray(inst.indicesPlanoBonificados)) inst.indicesPlanoBonificados = []
  if (inst.indicesPlanoBonificados.length > 0) return
  const t = obterTemplate(inst.templateId)
  if (!t) return
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return
  const lidos = inst.capitulosLidos.length
  if (lidos < 1) return
  const total = t.capitulos
  const arr = []
  for (let k = 1; k <= D; k++) {
    if (lidos >= cumulativoEsperadoAteDiaK(total, D, k)) arr.push(k)
  }
  if (arr.length) {
    inst.indicesPlanoBonificados = arr
    salvarInstanciaAtualizada(inst)
    reconciliarEscadaComIndices(inst)
  }
}

/**
 * Cada “dia do plano” = marco cumulativo de capítulos. Pode concluir vários marcos de uma vez (ex.: 2 dias do plano numa sessão).
 */
function processarBonificacoesPorProgressoAcumulado(inst) {
  const t = obterTemplate(inst.templateId)
  if (!t) return []
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return []
  const total = t.capitulos
  const lidos = inst.capitulosLidos.length
  if (!Array.isArray(inst.indicesPlanoBonificados)) inst.indicesPlanoBonificados = []
  const claimed = new Set(inst.indicesPlanoBonificados)
  const eventos = []
  for (let k = 1; k <= D; k++) {
    const cum = cumulativoEsperadoAteDiaK(total, D, k)
    if (lidos < cum) break
    if (claimed.has(k)) continue
    claimed.add(k)
    inst.indicesPlanoBonificados = [...claimed].sort((a, b) => a - b)
    eventos.push(...processarAoConcluirDiaNoPlano(inst.id))
  }
  return eventos
}

function sincronizarIndicesAposDesmarcar(inst) {
  const t = obterTemplate(inst.templateId)
  if (!t) return
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return
  const total = t.capitulos
  const lidos = inst.capitulosLidos.length
  inst.indicesPlanoBonificados = (inst.indicesPlanoBonificados || []).filter((kk) => {
    const k = Number(kk)
    if (!Number.isFinite(k) || k < 1 || k > D) return false
    return lidos >= cumulativoEsperadoAteDiaK(total, D, k)
  })
  reconciliarEscadaComIndices(inst)
}

/**
 * Capítulos esperados só naquele dia civil (partição do total pelo número de dias do plano).
 * Ex.: média 4,91 → dias com 4 e dias com 5 capítulos; a soma bate com o total da Bíblia no plano.
 */
export function metaCapitulosNoDiaDoPlano(inst, iso) {
  const t = obterTemplate(inst.templateId)
  if (!t) return 0
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (D < 1) return 0
  const k = indiceDiaNoPlano(inst, iso)
  if (k == null || k < 1) return 0
  const total = t.capitulos
  return cumulativoEsperadoAteDiaK(total, D, k) - cumulativoEsperadoAteDiaK(total, D, k - 1)
}

export function obterCapitulosMarcadosNoDia(inst, iso) {
  const m = inst.capitulosMarcadosPorDia?.[iso]
  return Math.max(0, Number(m) || 0)
}

/**
 * Previsão ao escolher datas: capítulos/dia e validade (≤ 1 ano).
 */
export function calcularPrevisaoInicial(templateId, dataInicio, dataFim) {
  const t = obterTemplate(templateId)
  if (!t) {
    return { valido: false, erro: 'Plano não encontrado.' }
  }
  const dias = contarDiasEntreInicioFim(dataInicio, dataFim)
  if (dias < 1) {
    return { valido: false, erro: 'A data de término deve ser depois da data de início.' }
  }
  if (dias > MAX_DIAS_PLANO) {
    return { valido: false, erro: `O prazo máximo é ${MAX_DIAS_PLANO} dias (1 ano).` }
  }
  const capPorDia = t.capitulos / dias
  return {
    valido: true,
    dias,
    capitulosTotal: t.capitulos,
    capitulosPorDia: capPorDia,
    titulo: t.titulo,
  }
}

function salvarInstanciaAtualizada(inst) {
  const s = carregarEstadoPlanoLeituraUsuario()
  const idx = s.instancias.findIndex((x) => x.id === inst.id)
  if (idx === -1) return
  s.instancias[idx] = inst
  gravarEstado(s)
}

/** Outras telas (ex.: plano na Bíblia) ouçam e atualizam métricas sem depender de remount. */
function emitirPlanoLeituraPersistenciaAlterada() {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salvation-plano-leitura-atualizado'))
    }
  } catch {
    /* ignore */
  }
}

export function listarInstancias() {
  return carregarEstadoPlanoLeituraUsuario().instancias
}

export function obterInstancia(id) {
  if (!id) return null
  const inst = listarInstancias().find((i) => i.id === id) || null
  if (inst) {
    garantirIndicesHistoricosSemPremio(inst)
    reconciliarEscadaComIndices(inst)
  }
  return inst
}

export function instanciaAtivaId() {
  return carregarEstadoPlanoLeituraUsuario().instanciaAtivaId
}

export function definirInstanciaAtiva(id) {
  const s = carregarEstadoPlanoLeituraUsuario()
  if (id && !s.instancias.some((i) => i.id === id)) return false
  s.instanciaAtivaId = id || null
  gravarEstado(s)
  emitirPlanoLeituraPersistenciaAlterada()
  return true
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Cria instância; respeita MAX_PLANOS_ATIVOS.
 */
export function criarInstancia({ templateId, dataInicio, dataFim }) {
  const prev = calcularPrevisaoInicial(templateId, dataInicio, dataFim)
  if (!prev.valido) return { ok: false, erro: prev.erro }

  const s = carregarEstadoPlanoLeituraUsuario()
  if (s.instancias.length >= MAX_PLANOS_ATIVOS) {
    return {
      ok: false,
      erro:
        MAX_PLANOS_ATIVOS === 1
          ? 'Só pode haver um plano ativo. Remova o atual para criar outro.'
          : `Você pode ter no máximo ${MAX_PLANOS_ATIVOS} planos ativos.`,
    }
  }

  const inst = {
    id: uuid(),
    templateId,
    dataInicio,
    dataFim,
    createdAt: new Date().toISOString(),
    capitulosLidos: [],
    diasComLeitura: [],
    ultimoDiaCadeia: '',
    sequenciaConsecutiva: 0,
    diasRecuperados: [],
    medalhasAberturaMostradas: [],
    capitulosMarcadosPorDia: {},
    indicesPlanoBonificados: [],
  }

  s.instancias.push(inst)
  s.instanciaAtivaId = inst.id
  gravarEstado(s)
  emitirPlanoLeituraPersistenciaAlterada()
  return { ok: true, instancia: inst }
}

export function removerInstancia(id) {
  const s = carregarEstadoPlanoLeituraUsuario()
  s.instancias = s.instancias.filter((i) => i.id !== id)
  if (s.instanciaAtivaId === id) {
    s.instanciaAtivaId = s.instancias[0]?.id ?? null
  }
  gravarEstado(s)
  apagarChaveEscadaInstancia(id)
  if (s.instancias.length === 0) {
    zerarInventarioEscada()
  }
  emitirPlanoLeituraPersistenciaAlterada()
}

export function limparProgressoInstancia(id) {
  const inst = obterInstancia(id)
  if (!inst) return false
  inst.capitulosLidos = []
  inst.diasComLeitura = []
  inst.ultimoDiaCadeia = ''
  inst.sequenciaConsecutiva = 0
  inst.diasRecuperados = []
  inst.medalhasAberturaMostradas = []
  inst.capitulosMarcadosPorDia = {}
  inst.indicesPlanoBonificados = []
  salvarInstanciaAtualizada(inst)
  zerarEscadaInstancia(id)
  emitirPlanoLeituraPersistenciaAlterada()
  return true
}

export function obterProgressoInstancia(id) {
  const inst = obterInstancia(id)
  const t = inst ? obterTemplate(inst.templateId) : null
  if (!inst || !t) return { pct: 0, lidos: 0, total: 0 }
  const lidos = inst.capitulosLidos.length
  const total = t.capitulos
  const pct = total > 0 ? (lidos / total) * 100 : 0
  return { pct, lidos, total }
}

/** Média necessária (cap/dia) com base no prazo escolhido. */
export function obterCapitulosPorDiaMeta(inst) {
  const t = obterTemplate(inst.templateId)
  if (!t) return 0
  const dias = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (dias < 1) return 0
  return t.capitulos / dias
}

/** Capítulos que “deveriam” estar lidos até hoje (marco cumulativo do dia do plano). */
export function obterMetaAcumuladaAteHoje(inst, hoje = diaCivilAmericaSaoPaulo()) {
  const t = obterTemplate(inst.templateId)
  if (!t) return 0
  const diasPlano = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  if (diasPlano < 1) return 0
  const k = indiceDiaNoPlano(inst, hoje)
  if (k == null) {
    if (diferencaDiasIso(inst.dataInicio, hoje) < 0) return 0
    return t.capitulos
  }
  return cumulativoEsperadoAteDiaK(t.capitulos, diasPlano, k)
}

/**
 * Ritmo no calendário (meta acumulada até hoje) + meta por marcos cumulativos do plano.
 */
export function obterLeituraEmDia(inst, hoje = diaCivilAmericaSaoPaulo()) {
  const metaAcumulada = obterMetaAcumuladaAteHoje(inst, hoje)
  const metaEsperadaHoje = Math.ceil(metaAcumulada)
  const lidos = inst.capitulosLidos.length
  const marcDia = obterCapitulosMarcadosNoDia(inst, hoje)
  const faltamRitmo = Math.max(0, metaEsperadaHoje - lidos)
  const emDiaRitmo = faltamRitmo <= 0

  const t = obterTemplate(inst.templateId)
  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)
  const lidosBaseDia = Math.max(0, lidos - marcDia)
  let metaHojeMarco = 0
  if (t && D > 0) {
    for (let k = 1; k <= D; k++) {
      const cum = cumulativoEsperadoAteDiaK(t.capitulos, D, k)
      if (lidosBaseDia < cum) {
        metaHojeMarco = Math.max(1, cum - lidosBaseDia)
        break
      }
    }
  }
  const proximoMarco = obterProximoMarcoProgresso(inst)
  const leituraHojeEmDia = metaHojeMarco > 0 ? marcDia >= metaHojeMarco : true
  const faltamHojeMarco = Math.max(0, metaHojeMarco - marcDia)
  const capitulosAntecipados = Math.max(0, marcDia - metaHojeMarco)

  const indiceHoje = indiceDiaNoPlano(inst, hoje)

  return {
    /** Ritmo geral do prazo (marco cumulativo até o dia do plano em Brasília). */
    emDia: emDiaRitmo,
    /** Meta do marco do dia civil de hoje (gamificação por degraus do plano). */
    emDiaHoje: leituraHojeEmDia,
    metaAcumulada,
    metaEsperadaHoje,
    faltamRitmo,
    lidos,
    marcadosHoje: marcDia,
    metaHoje: metaHojeMarco,
    leituraHojeEmDia,
    faltamHoje: faltamHojeMarco,
    capitulosAntecipados,
    proximoMarco,
    hojeCivil: hoje,
    indiceDiaPlanoHoje: indiceHoje,
  }
}

export function obterMetricasResumo(instanciaId) {
  const inst = obterInstancia(instanciaId)
  if (!inst) return null
  const hoje = diaCivilAmericaSaoPaulo()
  garantirIndicesHistoricosSemPremio(inst)
  const seqAntes = inst.sequenciaConsecutiva
  reconciliarSequenciaConsecutiva(inst, hoje)
  if (inst.sequenciaConsecutiva !== seqAntes) {
    salvarInstanciaAtualizada(inst)
  }
  const md = obterLeituraEmDia(inst, hoje)
  const pm = md.proximoMarco
  const completo = Boolean(pm?.planoCompleto)
  return {
    diasLeitura: calcularDiasLeitura(inst),
    diasConsecutivos: inst.sequenciaConsecutiva,
    emDia: md.emDia,
    emDiaHoje: md.emDiaHoje,
    metaHoje: md.metaHoje,
    leituraHojeEmDia: md.leituraHojeEmDia,
    faltamHoje: md.faltamHoje,
    faltamRitmo: md.faltamRitmo,
    metaEsperadaHoje: md.metaEsperadaHoje,
    capitulosAntecipados: md.capitulosAntecipados,
    metaAcumulada: md.metaAcumulada,
    lidos: md.lidos,
    marcadosHoje: md.marcadosHoje,
    hojeCivil: md.hojeCivil,
    indiceDiaPlanoHoje: md.indiceDiaPlanoHoje,
    cumulativoProximoMarco: completo ? null : pm?.cumulativoAlvo ?? null,
    faltamProximoMarco: completo ? 0 : pm?.faltam ?? 0,
    proximoIndiceDiaPlano: completo ? null : pm?.proximoIndiceDiaPlano ?? null,
    planoCompleto: completo,
    diasRestantesCalendario: obterDiasRestantesCalendario(inst),
    capitulosPorDiaMeta: obterCapitulosPorDiaMeta(inst),
  }
}

export function obterDiasRestantesCalendario(inst, hoje = diaCivilAmericaSaoPaulo()) {
  const d = diferencaDiasIso(hoje, inst.dataFim)
  return d < 0 ? 0 : d
}

/**
 * Atualiza sequência no primeiro capítulo marcado no dia civil (a sequência não “pula” um dia vazio sozinha).
 * Bonificações por marcos cumulativos do plano: `processarBonificacoesPorProgressoAcumulado`.
 */
function aplicarPrimeiraLeituraDoDia(inst, hoje) {
  if (obterCapitulosMarcadosNoDia(inst, hoje) < 1) return
  if (!inst.diasComLeitura.includes(hoje)) {
    inst.diasComLeitura = [...new Set([...inst.diasComLeitura, hoje])].sort()
    inst.ultimoDiaCadeia = hoje
  }
}

/**
 * Marca capítulo; no primeiro mark do dia, atualiza métricas do plano (independente do fluxo global de incentivos da Palavra).
 */
export function marcarCapituloInstancia(instanciaId, livroId, capitulo) {
  const inst = obterInstancia(instanciaId)
  if (!inst) return { ok: false, eventos: [] }

  const key = `${livroId}-${capitulo}`
  const hoje = diaCivilAmericaSaoPaulo()

  if (!inst.capitulosMarcadosPorDia || typeof inst.capitulosMarcadosPorDia !== 'object') {
    inst.capitulosMarcadosPorDia = {}
  }
  if (!Array.isArray(inst.indicesPlanoBonificados)) {
    inst.indicesPlanoBonificados = []
  }

  if (inst.capitulosLidos.includes(key)) {
    inst.capitulosLidos = inst.capitulosLidos.filter((k) => k !== key)
    const prev = obterCapitulosMarcadosNoDia(inst, hoje)
    inst.capitulosMarcadosPorDia[hoje] = Math.max(0, prev - 1)
    if (inst.capitulosMarcadosPorDia[hoje] <= 0) {
      delete inst.capitulosMarcadosPorDia[hoje]
      inst.diasComLeitura = inst.diasComLeitura.filter((d) => d !== hoje)
    }
    sincronizarIndicesAposDesmarcar(inst)
    reconciliarSequenciaConsecutiva(inst, hoje)
    salvarInstanciaAtualizada(inst)
    emitirPlanoLeituraPersistenciaAlterada()
    return { ok: true, eventos: [], desmarcou: true }
  }

  inst.capitulosLidos = [...inst.capitulosLidos, key].sort()
  inst.capitulosMarcadosPorDia[hoje] = (inst.capitulosMarcadosPorDia[hoje] || 0) + 1

  aplicarPrimeiraLeituraDoDia(inst, hoje)
  const eventos = processarBonificacoesPorProgressoAcumulado(inst)
  reconciliarSequenciaConsecutiva(inst, hoje)
  salvarInstanciaAtualizada(inst)
  emitirPlanoLeituraPersistenciaAlterada()
  return { ok: true, eventos, desmarcou: false }
}

function instanciaContemCapitulo(inst, livroId, capitulo) {
  const t = obterTemplate(inst?.templateId)
  if (!t || !Array.isArray(t.livros)) return false
  const livroNoPlano = t.livros.find((l) => Number(l.id) === Number(livroId))
  if (!livroNoPlano) return false
  return Number(capitulo) >= 1 && Number(capitulo) <= Number(livroNoPlano.capitulos || 0)
}

/** Lista instâncias ativas cujo template inclui este capítulo. */
export function listarInstanciasQueContemCapitulo(livroId, capitulo) {
  return listarInstancias().filter((inst) => instanciaContemCapitulo(inst, livroId, capitulo))
}

/** Marca/desmarca o capítulo em várias instâncias e retorna ids alterados. */
export function marcarCapituloEmInstancias(instanciasIds, livroId, capitulo) {
  const ids = Array.isArray(instanciasIds) ? [...new Set(instanciasIds.map(String))] : []
  const resultados = []
  for (const id of ids) {
    const r = marcarCapituloInstancia(id, livroId, capitulo)
    if (r?.ok) resultados.push({ instanciaId: id, ...r })
  }
  return resultados
}

/**
 * Pode recuperar exatamente um dia em falta (entre a última leitura real e hoje).
 */
export function podeColocarLeituraEmDia(inst) {
  const hoje = diaCivilAmericaSaoPaulo()
  const diasOrdenados = [...inst.diasComLeitura].sort()
  const ultimoReal = diasOrdenados.length ? diasOrdenados[diasOrdenados.length - 1] : ''

  if (!ultimoReal) return { pode: false, motivo: 'sem_leitura' }

  const diff = diferencaDiasIso(ultimoReal, hoje)
  if (diff !== 2) return { pode: false, motivo: diff < 2 ? 'ja_em_dia' : 'falta_mais_de_um_dia' }

  const ontem = subtrairDiasIso(hoje, 1)
  if (inst.diasComLeitura.includes(ontem)) return { pode: false, motivo: 'ja_leu_ontem' }
  if (inst.diasRecuperados.includes(ontem)) return { pode: false, motivo: 'ja_recuperou' }

  return { pode: true, diaRecuperar: ontem }
}

/** Registra continuidade quando o usuário usa “Colocar leitura em dia” (ação explícita). */
export function colocarLeituraEmDia(instanciaId) {
  const inst = obterInstancia(instanciaId)
  if (!inst) return { ok: false, erro: 'Plano não encontrado.' }

  const chk = podeColocarLeituraEmDia(inst)
  if (!chk.pode) {
    return { ok: false, erro: 'Esta ação não está disponível agora.', detalhe: chk.motivo }
  }

  const gap = chk.diaRecuperar
  const ultimoReal = [...inst.diasComLeitura].sort().pop()

  if (!inst.diasRecuperados.includes(gap)) {
    inst.diasRecuperados = [...new Set([...inst.diasRecuperados, gap])].sort()
  }

  reconciliarSequenciaConsecutiva(inst, diaCivilAmericaSaoPaulo())

  salvarInstanciaAtualizada(inst)
  emitirPlanoLeituraPersistenciaAlterada()
  return { ok: true, dia: gap }
}

/**
 * Migração one-shot: `planoLeitura_${templateId}` + `planoLeitura` do storage.
 */
export function migrarLegadoSeNecessario() {
  try {
    if (localStorage.getItem(STORAGE_MIGR_FLAG) === '1') return

    const s = carregarEstadoPlanoLeituraUsuario()
    if (s.instancias.length > 0) {
      localStorage.setItem(STORAGE_MIGR_FLAG, '1')
      return
    }

    let planoAtualTemplate = null
    try {
      const raw = localStorage.getItem('planoLeitura')
      if (raw) {
        const p = JSON.parse(raw)
        planoAtualTemplate = p?.planoAtual ? String(p.planoAtual) : null
      }
    } catch {
      /* ignore */
    }

    const hoje = diaCivilAmericaSaoPaulo()
    const candidatos = PLANOS.map((p) => {
      const raw = localStorage.getItem(`${LEGACY_PREFIX}${p.id}`)
      const caps = raw ? JSON.parse(raw) : []
      const arr = Array.isArray(caps) ? caps : []
      return { templateId: p.id, caps: arr }
    }).filter((c) => c.caps.length > 0)

    if (candidatos.length === 0 && planoAtualTemplate) {
      const raw = localStorage.getItem(`${LEGACY_PREFIX}${planoAtualTemplate}`)
      const caps = raw ? JSON.parse(raw) : []
      if (Array.isArray(caps) && caps.length > 0) {
        candidatos.push({ templateId: planoAtualTemplate, caps })
      }
    }

    for (const c of candidatos.slice(0, MAX_PLANOS_ATIVOS)) {
      const t = obterTemplate(c.templateId)
      if (!t) continue
      const dataFim = (() => {
        const [y, m, d] = hoje.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        dt.setDate(dt.getDate() + Math.min(t.diasTotais, MAX_DIAS_PLANO) - 1)
        const yy = dt.getFullYear()
        const mm = String(dt.getMonth() + 1).padStart(2, '0')
        const dd = String(dt.getDate()).padStart(2, '0')
        return `${yy}-${mm}-${dd}`
      })()
      const D = contarDiasEntreInicioFim(hoje, dataFim)
      const total = t.capitulos
      const nCaps = c.caps.length
      const indicesPremio = []
      for (let k = 1; k <= D; k++) {
        if (nCaps >= cumulativoEsperadoAteDiaK(total, D, k)) indicesPremio.push(k)
      }
      const inst = {
        id: uuid(),
        templateId: c.templateId,
        dataInicio: hoje,
        dataFim,
        createdAt: new Date().toISOString(),
        capitulosLidos: c.caps.map(String),
        diasComLeitura: nCaps > 0 ? [hoje] : [],
        ultimoDiaCadeia: nCaps > 0 ? hoje : '',
        sequenciaConsecutiva: 0,
        diasRecuperados: [],
        medalhasAberturaMostradas: [],
        capitulosMarcadosPorDia: nCaps > 0 ? { [hoje]: nCaps } : {},
        indicesPlanoBonificados: indicesPremio,
      }
      reconciliarSequenciaConsecutiva(inst, hoje)
      s.instancias.push(inst)
      if (!s.instanciaAtivaId && planoAtualTemplate === c.templateId) {
        s.instanciaAtivaId = inst.id
      }
    }

    if (s.instancias.length && !s.instanciaAtivaId) {
      s.instanciaAtivaId = s.instancias[0].id
    }

    gravarEstado(s)
    localStorage.setItem(STORAGE_MIGR_FLAG, '1')
  } catch {
    /* ignore */
  }
}

export function caminhoEntradaBibliaPreferido() {
  migrarLegadoSeNecessario()
  const id = instanciaAtivaId()
  if (id) return `/plano-leitura-biblia?id=${encodeURIComponent(id)}`
  return '/'
}

function adicionarMedalhaAbertura(inst, id) {
  if (inst.medalhasAberturaMostradas.includes(id)) return false
  inst.medalhasAberturaMostradas = [...inst.medalhasAberturaMostradas, id]
  return true
}

/**
 * Confetes + medalhas ao abrir o ecrã do plano (chamar uma vez por abertura).
 * Grava marcos em `medalhasAberturaMostradas`.
 */
export function processarEventosAoAbrirPlano(instanciaId) {
  migrarLegadoSeNecessario()
  const inst = obterInstancia(instanciaId)
  if (!inst) return []

  const t = obterTemplate(inst.templateId)
  if (!t) return []

  const { pct, lidos } = obterProgressoInstancia(instanciaId)
  const hoje = diaCivilAmericaSaoPaulo()
  const restantes = Math.max(0, t.capitulos - lidos)
  const pctDez = t.capitulos * 0.1
  const quaseFim = lidos > 0 && restantes > 0 && restantes <= pctDez && pct < 100

  const out = []

  if (quaseFim) {
    const id = `pl_abrir_quase_${inst.id}_${hoje}`
    if (adicionarMedalhaAbertura(inst, `quase_${hoje}`)) {
      out.push({
        tipo: 'plano_abertura_quase_fim',
        chave: id,
        mensagem: `Faltam ${restantes} capítulo(s) para concluir o plano — você está quase lá!`,
        meta: { confete: 'nenhum', restantes, instanciaId: inst.id },
      })
    }
  }

  reconciliarSequenciaConsecutiva(inst, hoje)
  const seq = inst.sequenciaConsecutiva
  if (seq >= 1) {
    const id = `pl_abrir_seq_${inst.id}_${hoje}`
    if (adicionarMedalhaAbertura(inst, `seq_${hoje}`)) {
      out.push({
        tipo: 'plano_abertura_sequencia',
        chave: id,
        mensagem:
          seq === 1
            ? 'Você está no plano — que Deus abençoe cada capítulo!'
            : `${seq} dias consecutivos no plano — continuidade que edifica!`,
        meta: { confete: 'nenhum', diasConsecutivos: seq, instanciaId: inst.id },
      })
    }
  }

  salvarInstanciaAtualizada(inst)
  return out
}
