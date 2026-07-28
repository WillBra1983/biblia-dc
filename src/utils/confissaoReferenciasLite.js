/**
 * Versão "lite" de `confissaoReferencias.js` — só a regex e parsers leves,
 * sem importar `confissaoFe`, `catecismoMaior` ou `breveCatecismo` (~250 kB).
 *
 * Por que existir: `TextoComReferencias` (usado em quase toda página) só
 * precisa da regex para *detectar* links como `(CFW V.1)` ou `(CMW 17)` no
 * render. O lookup pesado (`buscarPerguntaCatecismo`,
 * `buscarParagrafoConfissaoOuInicioCapitulo`) só roda no clique do link e
 * pode ser carregado por `import()` dinâmico.
 *
 * Antes: importar a regex puxava também todo o dataset → 250 kB no path
 * crítico. Agora: 0 kB de dados no eager bundle.
 */

/** Converte numeral romano (I–XXXIII) ou string numérica para inteiro do capítulo. */
export function parseNumeroRomanOuArabico(raw, max = 999) {
  const s = String(raw || '').trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Math.min(max, Math.max(1, parseInt(s, 10)))
  const u = s.toUpperCase()
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100 }
  let total = 0
  let prev = 0
  for (let i = u.length - 1; i >= 0; i--) {
    const v = map[u[i]]
    if (!v) return null
    if (v < prev) total -= v
    else total += v
    prev = v
  }
  if (!total || total > max) return null
  return total
}

/** Compat: parser usado para capítulo da CFW (limita a 33 capítulos). */
export function parseCapituloRomanOuArabico(raw) {
  return parseNumeroRomanOuArabico(raw, 33)
}

/** Regex unificado para CFW/CMW/CBW, incluindo citações escritas por extenso. */
export const REGEX_CONF_LINK =
  /\b(CFW|Confissão(?:\s+de\s+Fé)?(?:\s+de\s+Westminster)?|CMW|Catecismo\s+Maior(?:\s+de\s+Westminster)?|CBW|Breve\s+Catecismo(?:\s+de\s+Westminster)?)\s*(?:[,;:]\s*)?\(?\s*(?:(?:Cap(?:ítulo)?\.?|Pergunta|Questão)\s*)?([IVXLC]{1,10}|\d{1,3})(?:\s*(?:(?:[,;:]\s*)?(?:Art(?:igo)?\.?|§)\s*|[.:]\s*)([IVXLC]{1,10}|\d{1,3}))?\)?/gi

/** Compatibilidade retroativa com código existente. */
export const REGEX_CFW_LINK = REGEX_CONF_LINK
