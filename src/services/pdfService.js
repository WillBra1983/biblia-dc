import initSqlJs from 'sql.js'

/** Promise única: pdf.js + worker (só carrega na rota de cifras / busca no PDF). */
let pdfjsModulePromise = null

async function ensurePdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = (async () => {
      const [pdfjsLib, workerMod] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      ])
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default
      return pdfjsLib
    })()
  }
  return pdfjsModulePromise
}

let db = null
let SQL = null
/** Cache do mapeamento número → página (null = ainda não carregado; {} = carregado sem dados) */
let jsonIndexCache = null

/** Cache: `${numero}|${tituloNorm}` → página (1-based) após busca no PDF */
const tituloPageCache = new Map()

/** Documento pdf.js (mesmo buffer que getPdfBytes) */
let pdfDocumentPromise = null

const getBase = () => (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'

/** Nome do PDF de cifras na pasta public/ */
export const HINARIO_PDF_FILENAME = 'hinario-com-cifras.pdf'

/** Índice JSON opcional: `public/hinario_cifrado_index.json` — override manual número → página */
export const HINARIO_CIFRADO_INDEX_JSON = 'hinario_cifrado_index.json'

/**
 * Caminho relativo ao app (ex.: `/hinario-com-cifras.pdf` ou `/biblia/hinario-com-cifras.pdf`).
 * Use com `fetch()` — no Capacitor resolve contra a origem do WebView (ex.: `https://localhost`).
 */
export function getPdfAssetPath() {
  const base = getBase().replace(/\/$/, '') || ''
  return (base ? `${base}/${HINARIO_PDF_FILENAME}` : `/${HINARIO_PDF_FILENAME}`).replace(
    /\/+/g,
    '/'
  )
}

let pdfBytesCache = null

/**
 * Carrega o PDF inteiro na memória (uma vez). Evita `getDocument({ url })`, que no Android
 * costuma falhar com `localhost` + requisições HTTP range do pdf.js.
 */
export async function getPdfBytes() {
  if (pdfBytesCache) return pdfBytesCache
  const path = getPdfAssetPath()
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`PDF não encontrado (${res.status}): ${path}`)
  }
  pdfBytesCache = new Uint8Array(await res.arrayBuffer())
  return pdfBytesCache
}

/**
 * Instância única do documento pdf.js (para viewer e busca por título).
 */
export async function getPdfDocument() {
  if (!pdfDocumentPromise) {
    pdfDocumentPromise = (async () => {
      const pdfjsLib = await ensurePdfJs()
      const data = await getPdfBytes()
      return pdfjsLib.getDocument({ data }).promise
    })().catch((err) => {
      pdfDocumentPromise = null
      throw err
    })
  }
  return pdfDocumentPromise
}

export function invalidatePdfBytesCache() {
  pdfBytesCache = null
  pdfDocumentPromise = null
  tituloPageCache.clear()
}

export function invalidateCifradoIndexCache() {
  jsonIndexCache = null
}

/** Invalida PDF em memória (bytes + documento + cache de páginas por título). */
export function invalidatePdfDocumentCache() {
  invalidatePdfBytesCache()
}

/**
 * Carrega mapeamento número do hino → página do PDF (1-based) a partir de JSON em public/.
 * Chaves começando com `_` são ignoradas. Aceita objeto `{ "15": 42 }` ou array `[{ "numero": 15, "pdf_page": 42 }]`.
 */
async function loadJsonIndex() {
  if (jsonIndexCache !== null) return jsonIndexCache

  try {
    const base = getBase().replace(/\/$/, '') || ''
    const baseSlash = base ? base + '/' : '/'
    const res = await fetch(`${baseSlash}${HINARIO_CIFRADO_INDEX_JSON}`)
    if (!res.ok) {
      jsonIndexCache = {}
      return jsonIndexCache
    }
    const data = await res.json()
    const out = {}
    if (Array.isArray(data)) {
      for (const row of data) {
        if (row == null || typeof row !== 'object') continue
        const n = row.numero
        const p = row.pdf_page ?? row.pagina ?? row.page
        if (n == null || p == null) continue
        out[String(n)] = p
      }
    } else if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith('_')) continue
        out[k] = v
      }
    }
    jsonIndexCache = out
    return jsonIndexCache
  } catch (e) {
    console.warn('pdfService: índice JSON de cifras indisponível:', e)
    jsonIndexCache = {}
    return jsonIndexCache
  }
}

function paginaFromRow(result) {
  if (!result || typeof result !== 'object') return null
  const raw = result.pdf_page ?? result.pagina ?? result.page
  if (raw == null || raw === '') return null
  if (typeof raw === 'object' && raw !== null) {
    return null
  }
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? n : null
}

const initDB = async () => {
  if (db) return db
  
  try {
    const base = getBase().replace(/\/$/, '') || ''
    const baseSlash = base ? base + '/' : '/'
    if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `${baseSlash}sql.js/${file}`
    })
    }
    
    const response = await fetch(`${baseSlash}hinario_cifrado.db`)
    if (!response.ok) {
      console.warn(
        `pdfService: hinario_cifrado.db não encontrado (${response.status}); use ${HINARIO_CIFRADO_INDEX_JSON} ou coloque o .db em public/.`
      )
      return null
    }
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    db = new SQL.Database(uint8Array)
    return db
  } catch (error) {
    console.warn('pdfService: SQLite de cifras indisponível:', error)
    return null
  }
}

function buscarPaginaSql(database, numero) {
  const queries = [
    'SELECT pdf_page FROM hinos_cifrados WHERE numero = ?',
    'SELECT pagina AS pdf_page FROM hinos_cifrados WHERE numero = ?',
    'SELECT page AS pdf_page FROM hinos_cifrados WHERE numero = ?'
  ]
  for (const q of queries) {
    try {
      const stmt = database.prepare(q)
      stmt.bind([numero])
      const row = stmt.step() ? stmt.getAsObject() : null
      stmt.free()
      const p = paginaFromRow(row)
      if (p != null) return p
    } catch (_) {
      // coluna/tabela inexistente
    }
  }
  return null
}

function stripAccents(s) {
  let t = String(s || '')
    .replace(/\u00f1/g, 'n')
    .replace(/\u00d1/g, 'N')
  t = t.normalize('NFD').replace(/\p{M}/gu, '')
  return t
}

/**
 * Texto para comparação (minúsculas, sem acentos, pontuação colapsada).
 * Inclui casos comuns em PDF (ñ, hífen mole, variações de extração).
 */
function normalizeForMatch(s) {
  return stripAccents(String(s || ''))
    .toLowerCase()
    .replace(/\u00ad/g, '')
    .replace(/\btriuno\b/g, 'trino')
    .replace(/[^a-z0-9\u00e0-\u00ff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Título encontrado no texto da página (frase completa ou todas as palavras significativas). */
function tituloMatchesPageNorm(normPage, tituloNorm) {
  if (!tituloNorm || tituloNorm.length < 2) return false
  if (normPage.includes(tituloNorm)) return true
  const words = tituloNorm.split(' ').filter(w => w.length >= 3)
  if (words.length < 2) return false
  return words.every(w => normPage.includes(w))
}

/** Verifica se o número do hino (ex.: 1, 001) aparece como token antes do título. */
function numeroMatchesBeforeTitle(before, numHino) {
  const n = parseInt(String(numHino), 10)
  if (!Number.isFinite(n) || n < 1) return false
  const nStr = String(n)
  const pad3 = String(n).padStart(3, '0')
  const re = new RegExp(`(?:^|[^0-9])(${nStr}|${pad3})(?![0-9])`)
  return re.test(before)
}

async function getPageTextNormalized(page) {
  const textContent = await page.getTextContent()
  const raw = textContent.items.map(item => item.str).join(' ')
  return normalizeForMatch(raw)
}

/**
 * Localiza a página do PDF onde aparecem as cifras do hino: título no texto
 * e, quando há ambiguidade (títulos repetidos), o número do hino antes do título.
 */
async function buscarPaginaPorTituloNoPdf(titulo, numero) {
  const tituloNorm = normalizeForMatch(titulo)
  if (!tituloNorm || tituloNorm.length < 2) return null

  const numHino = parseInt(String(numero), 10)
  if (!Number.isFinite(numHino)) return null

  const cacheKey = `${numero}|${tituloNorm}`
  if (tituloPageCache.has(cacheKey)) {
    return tituloPageCache.get(cacheKey)
  }

  try {
    const pdf = await getPdfDocument()
    const maxPages = pdf.numPages
    const titleOnlyPages = []

    for (let p = 1; p <= maxPages; p++) {
      const page = await pdf.getPage(p)
      const norm = await getPageTextNormalized(page)
      if (!tituloMatchesPageNorm(norm, tituloNorm)) continue

      const positions = []
      if (norm.includes(tituloNorm)) {
        let pos = 0
        while ((pos = norm.indexOf(tituloNorm, pos)) !== -1) {
          positions.push(pos)
          pos += 1
        }
      } else {
        const words = tituloNorm.split(' ').filter(w => w.length >= 3)
        const first = words[0]
        let pos = 0
        while ((pos = norm.indexOf(first, pos)) !== -1) {
          const win = norm.slice(pos, pos + Math.min(220, norm.length - pos))
          if (words.every(w => win.includes(w))) {
            positions.push(pos)
          }
          pos += 1
        }
      }

      for (const pos of positions) {
        const before = norm.slice(Math.max(0, pos - 160), pos)
        if (numeroMatchesBeforeTitle(before, numHino)) {
          tituloPageCache.set(cacheKey, p)
          return p
        }
      }

      titleOnlyPages.push(p)
    }

    if (titleOnlyPages.length === 1) {
      const p = titleOnlyPages[0]
      tituloPageCache.set(cacheKey, p)
      return p
    }

    tituloPageCache.set(cacheKey, null)
    return null
  } catch (e) {
    console.warn('pdfService.buscarPaginaPorTituloNoPdf:', e)
    return null
  }
}

export const pdfService = {
  getPdfAssetPath,
  getPdfBytes,
  getPdfDocument,
  invalidatePdfBytesCache,
  invalidateCifradoIndexCache,
  invalidatePdfDocumentCache,

  /**
   * Resolve página (1-based) no PDF de cifras: override em JSON (número → página) e, em seguida,
   * busca no texto do PDF pelo título do hino; com títulos repetidos, usa o número do hino antes do título.
   */
  async buscarPaginaParaCifras({ titulo, numero }) {
    try {
      const idx = await loadJsonIndex()
      const key = String(numero)
      if (Object.prototype.hasOwnProperty.call(idx, key)) {
        const raw = idx[key]
        const n = Number(raw)
        if (Number.isFinite(n) && n >= 1) return n
      }

      const fromPdf = await buscarPaginaPorTituloNoPdf(titulo, numero)
      return fromPdf
    } catch (error) {
      console.warn('pdfService.buscarPaginaParaCifras:', error)
      return null
    }
  },

  /** @deprecated Preferir buscarPaginaParaCifras — índice por número só. */
  async buscarPagina(numero) {
    try {
      const idx = await loadJsonIndex()
      const key = String(numero)
      if (Object.prototype.hasOwnProperty.call(idx, key)) {
        const raw = idx[key]
        const n = Number(raw)
        if (Number.isFinite(n) && n >= 1) return n
      }

      const database = await initDB()
      if (!database) return null
      return buscarPaginaSql(database, numero)
    } catch (error) {
      console.warn('pdfService.buscarPagina:', error)
      return null
    }
  }
} 
