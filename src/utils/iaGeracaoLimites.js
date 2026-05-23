/**
 * Limites diários para geração de estudos pela IA (anti-curiosidade
 * e proteção de cota Gemini).
 *
 * Regras de negócio
 * -----------------
 * - **Por passagem:** depois que o usuário gera um estudo de uma
 *   passagem/perícope, não pode gerar outro para o mesmo trecho por 24 h.
 *   Pode continuar **lendo** o que já estiver salvo à vontade.
 * - **Cota diária global:** no máximo `LIMITE_VERSICULO_DIA` passagens
 *   de versículo distintas + `LIMITE_PERICOPE_DIA` perícope por dia,
 *   por aparelho. O contador zera ao virar a meia-noite local.
 * - **Admin:** isento (passa direto pelo `podeGerar({ admin: true })`).
 *
 * Persistência: localStorage (por aparelho). Não há sincronização entre
 * dispositivos — é proposital. Se o usuário insistir trocando de aparelho,
 * o cooldown técnico de cota Gemini ainda o trava no servidor.
 */

const PREFIXO_COOLDOWN_PASSAGEM = 'salvation:ia-passagem-cooldown:'
const CHAVE_COTA_DIARIA = 'salvation:ia-cota-diaria'

const MS_24H = 24 * 60 * 60 * 1000

export const LIMITE_VERSICULO_DIA = 3
export const LIMITE_PERICOPE_DIA = 1

/* ---------------- Identificação canônica de passagens ---------------- */

/**
 * ID canônico de uma seleção de versículos (independente de ordem do array).
 * Ex.: `idCanonicoVersiculo(43, 3, [16, 17])` → `"v:43_3_16-17"`.
 */
export function idCanonicoVersiculo(livroId, capitulo, versArr) {
  const vers = [...new Set((versArr || []).map((n) => Number(n)))]
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b)
    .join('-')
  return `v:${Number(livroId) || 0}_${Number(capitulo) || 0}_${vers}`
}

/**
 * ID canônico de uma perícope.
 */
export function idCanonicoPericope(livroId, capitulo, inicio, fim) {
  return `p:${Number(livroId) || 0}_${Number(capitulo) || 0}_${Number(inicio) || 0}_${Number(fim) || 0}`
}

/* ----------------------- Cooldown por passagem ----------------------- */

function chaveCooldown(id) {
  return `${PREFIXO_COOLDOWN_PASSAGEM}${id}`
}

export function lerCooldownPassagem(id) {
  if (!id) return { ativo: false }
  try {
    const ts = Number(localStorage.getItem(chaveCooldown(id)) || 0)
    if (!ts) return { ativo: false }
    const ate = ts + MS_24H
    if (ate <= Date.now()) {
      localStorage.removeItem(chaveCooldown(id))
      return { ativo: false }
    }
    return { ativo: true, ateMs: ate, restanteMs: ate - Date.now() }
  } catch {
    return { ativo: false }
  }
}

function marcarCooldownPassagem(id) {
  try {
    localStorage.setItem(chaveCooldown(id), String(Date.now()))
  } catch {
    /* localStorage indisponível */
  }
}

/* -------------------------- Cota diária ------------------------------ */

function dataHojeLocal() {
  const d = new Date()
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function lerCotaDiaria() {
  const hoje = dataHojeLocal()
  try {
    const raw = localStorage.getItem(CHAVE_COTA_DIARIA)
    if (!raw) return { data: hoje, versiculos: [], pericope: null }
    const p = JSON.parse(raw)
    if (!p || p.data !== hoje) {
      // Virou o dia: retorna estrutura vazia (não persistimos ainda
      // para não "queimar" o storage sem necessidade).
      return { data: hoje, versiculos: [], pericope: null }
    }
    return {
      data: hoje,
      versiculos: Array.isArray(p.versiculos) ? p.versiculos.filter((x) => typeof x === 'string') : [],
      pericope: typeof p.pericope === 'string' ? p.pericope : null
    }
  } catch {
    return { data: hoje, versiculos: [], pericope: null }
  }
}

function gravarCotaDiaria(cota) {
  try {
    localStorage.setItem(CHAVE_COTA_DIARIA, JSON.stringify(cota))
  } catch {
    /* localStorage indisponível */
  }
}

/* ----------------------- API pública principal ----------------------- */

/**
 * Verifica se o usuário pode gerar um estudo novo para a passagem/perícope.
 *
 * @param {object} args
 * @param {'versiculo'|'pericope'} args.tipo
 * @param {string} args.id  — id canônico (ver `idCanonicoVersiculo` / `idCanonicoPericope`).
 * @param {boolean} [args.admin] — quando true, ignora todos os limites.
 *
 * @returns {{
 *   ok: boolean,
 *   motivo?: 'cooldown_passagem' | 'limite_versiculo' | 'limite_pericope',
 *   mensagem?: string
 * }}
 */
export function podeGerar({ tipo, id, admin = false }) {
  if (admin) return { ok: true }
  if (!id) return { ok: true }

  const cdPassagem = lerCooldownPassagem(id)
  if (cdPassagem.ativo) {
    return {
      ok: false,
      motivo: 'cooldown_passagem',
      mensagem: 'Estudo indisponível! Volte amanhã ou encontre outro estudo em nossa biblioteca, acima.'
    }
  }

  const cota = lerCotaDiaria()
  if (tipo === 'versiculo') {
    if (cota.versiculos.includes(id)) {
      // Já consta como gerada hoje — equivale a estar em cooldown.
      return {
        ok: false,
        motivo: 'cooldown_passagem',
        mensagem: 'Estudo indisponível! Volte amanhã ou encontre outro estudo em nossa biblioteca, acima.'
      }
    }
    if (cota.versiculos.length >= LIMITE_VERSICULO_DIA) {
      return {
        ok: false,
        motivo: 'limite_versiculo',
        mensagem: `Você já gerou ${LIMITE_VERSICULO_DIA} estudos de versículos hoje. Volte amanhã para gerar mais.`
      }
    }
  } else if (tipo === 'pericope') {
    if (cota.pericope === id) {
      return {
        ok: false,
        motivo: 'cooldown_passagem',
        mensagem: 'Estudo indisponível! Volte amanhã ou encontre outro estudo em nossa biblioteca, acima.'
      }
    }
    if (cota.pericope && cota.pericope !== id) {
      return {
        ok: false,
        motivo: 'limite_pericope',
        mensagem: 'Você já gerou um estudo de perícope hoje. Volte amanhã para gerar outro.'
      }
    }
  }

  return { ok: true }
}

/**
 * Marca uma geração bem-sucedida — ativa o cooldown da passagem (24 h) e
 * registra na cota diária. Idempotente para a mesma passagem no mesmo dia.
 */
export function marcarGerado({ tipo, id, admin = false }) {
  if (admin) return
  if (!id) return
  marcarCooldownPassagem(id)
  const cota = lerCotaDiaria()
  if (tipo === 'versiculo') {
    if (!cota.versiculos.includes(id)) cota.versiculos.push(id)
  } else if (tipo === 'pericope') {
    cota.pericope = id
  }
  gravarCotaDiaria(cota)
}

/**
 * Limpeza de testes (admin/devs). Não exposto na UI.
 */
export function _limparLimitesDevApenas() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIXO_COOLDOWN_PASSAGEM)) localStorage.removeItem(k)
    }
    localStorage.removeItem(CHAVE_COTA_DIARIA)
  } catch {
    /* ignore */
  }
}
