/**
 * Cooldown local para chamadas à IA quando a cota da Gemini está esgotada
 * ou houve rate-limit. Evita que o app fique martelando a API em vão e dá
 * uma mensagem amigável ao usuário com o tempo de espera adequado.
 *
 * Armazenado em `localStorage` para sobreviver a recarregamentos. Como é
 * por aparelho/navegador, não cobre fraude, mas serve perfeitamente para
 * proteger a UX (e a cota) do dono do app.
 */

const CHAVE = 'salvation-ia-cooldown'

/**
 * Durações sugeridas por tipo de erro:
 *  - QUOTA_EXCEEDED: cota diária (ou plano) — Gemini Free reinicia à meia-noite
 *    do Pacífico (~04:00 UTC-4). Esperamos 4 h para evitar ping antes do reset.
 *  - RATE_LIMIT:     limite por minuto — basta esperar alguns minutos.
 *  - OVERLOADED:     o modelo está sobrecarregado — alguns minutos basta.
 */
const DURACAO_MS = {
  QUOTA_EXCEEDED: 4 * 60 * 60 * 1000,
  RATE_LIMIT: 15 * 60 * 1000,
  OVERLOADED: 5 * 60 * 1000
}

function lerStorage() {
  try {
    const raw = localStorage.getItem(CHAVE)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p
  } catch (_) {
    return null
  }
}

function gravarStorage(p) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p))
  } catch (_) { /* ignore */ }
}

function limparStorage() {
  try { localStorage.removeItem(CHAVE) } catch (_) { /* ignore */ }
}

/**
 * Retorna `{ ativo: true, tipo, ateMs, restanteMs }` se ainda há cooldown
 * pendente, ou `{ ativo: false }` caso contrário. Limpa registro expirado
 * para que `ativo` reflita só estado vivo.
 */
export function lerCooldownIa() {
  const p = lerStorage()
  if (!p) return { ativo: false }
  const ate = Number(p.ateMs) || 0
  const tipo = typeof p.tipo === 'string' ? p.tipo : 'QUOTA_EXCEEDED'
  const agora = Date.now()
  if (!ate || ate <= agora) {
    limparStorage()
    return { ativo: false }
  }
  return { ativo: true, tipo, ateMs: ate, restanteMs: ate - agora }
}

/**
 * Registra um cooldown a partir do código devolvido pela camada de IA.
 * Se já existe um cooldown mais longo no momento, mantém o existente.
 */
export function registrarCooldownIa(codigo) {
  const tipo = DURACAO_MS[codigo] ? codigo : 'QUOTA_EXCEEDED'
  const dur = DURACAO_MS[tipo]
  const novoAte = Date.now() + dur
  const atual = lerCooldownIa()
  if (atual.ativo && atual.ateMs > novoAte) return atual
  const p = { tipo, ateMs: novoAte, criadoEm: Date.now() }
  gravarStorage(p)
  return { ativo: true, tipo, ateMs: novoAte, restanteMs: dur }
}

export function limparCooldownIa() {
  limparStorage()
}

/**
 * Formata o tempo restante em forma humana, em pt-BR.
 *   "4 horas", "37 minutos", "15 minutos", "menos de 1 minuto".
 */
export function descreverEsperaIa(restanteMs) {
  const ms = Math.max(0, Number(restanteMs) || 0)
  if (ms < 60 * 1000) return 'menos de 1 minuto'
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} minuto${min === 1 ? '' : 's'}`
  const h = Math.floor(min / 60)
  const restoMin = min % 60
  if (restoMin === 0) return `${h} hora${h === 1 ? '' : 's'}`
  return `${h} h ${restoMin} min`
}

/**
 * Devolve uma mensagem amigável e completa para apresentar ao usuário.
 * Não menciona "Gemini", "cota", "API" — é texto orientado ao benefício.
 */
export function mensagemCooldownIa({ tipo, restanteMs }) {
  const espera = descreverEsperaIa(restanteMs)
  if (tipo === 'RATE_LIMIT' || tipo === 'OVERLOADED') {
    return {
      titulo: 'O preparo de novos estudos está ocupado agora.',
      detalhe:
        `Tente novamente em ${espera}. Enquanto isso, você pode abrir ` +
        'estudos já preparados em outros versículos ou escrever o seu próprio no editor.'
    }
  }
  return {
    titulo: 'O preparo de novos estudos voltará em breve.',
    detalhe:
      `O serviço de preparo automático está temporariamente indisponível e ` +
      `volta em cerca de ${espera}. Você pode abrir estudos já preparados em ` +
      'outros versículos ou escrever o seu próprio agora mesmo no editor.'
  }
}
