/**
 * Compara nomes de arquivos MP3 na pasta "Hinário Gravado" com src/data/hinos.js
 * Uso: node scripts/compare_hinos_pasta.js "C:\\caminho\\para\\pasta"
 */
import { readdirSync, statSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const folderArg = process.argv[2] || ''
const folder =
  folderArg ||
  'C:\\Users\\Pr Wilson Lucas\\Desktop\\Hinário Gravado'

const { hinos } = await import(pathToFileURL(join(root, 'src/data/hinos.js')).href)

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function tituloFromArquivo(t) {
  return String(t || '')
    .replace(/\(primeira musica\)/gi, '')
    .replace(/\(segunda musica\)/gi, '')
    .replace(/\(terceira musica\)/gi, '')
    .replace(/\(\d+\)/g, '')
    .replace(/-2\s*$/i, '')
    .replace(/\s+-\s*$/g, '')
    .trim()
}

/** @param {string} fn */
function parseNome(fn) {
  const base = fn.replace(/\.mp3$/i, '').trim()
  // "110 A - algo" ou "325-A - algo"
  let m = base.match(/^(\d+)\s*[-–]?\s*([A-Za-z])\s*[-–—]\s*(.+)$/)
  if (m) {
    const numKey = `${parseInt(m[1], 10)}${m[2].toUpperCase()}`
    return {
      fn,
      raw: base,
      numeroStr: numKey,
      numeroInt: parseInt(m[1], 10),
      tituloArq: m[3].trim()
    }
  }
  m = base.match(/^(\d+)\s*[-–—]\s*(.+)$/)
  if (m) {
    return {
      fn,
      raw: base,
      numeroStr: String(parseInt(m[1], 10)),
      numeroInt: parseInt(m[1], 10),
      tituloArq: m[2].trim()
    }
  }
  return { fn, raw: base, numeroStr: null, numeroInt: null, tituloArq: base }
}

const mapaApp = new Map()
for (const h of hinos) {
  mapaApp.set(String(h.numero), {
    numero: h.numero,
    titulo: h.titulo,
    norm: norm(h.titulo)
  })
}

let files = []
try {
  files = readdirSync(folder).filter((f) => f.toLowerCase().endsWith('.mp3'))
} catch (e) {
  console.error('Erro ao ler pasta:', folder, e.message)
  process.exit(1)
}

const parsed = files.map(parseNome)

/** @param {string} a @param {string} b */
function tituloConfere(esperado, arquivo) {
  const e = norm(esperado)
  const a1 = norm(tituloFromArquivo(arquivo))
  const a2 = norm(arquivo)
  if (!e.length) return { ok: false, razao: 'vazio' }
  if (a1 === e || a2 === e) return { ok: true, razao: 'exato' }
  if (a1.length > 4 && (e.includes(a1) || a1.includes(e))) return { ok: true, razao: 'contem' }
  const pref = Math.min(14, e.length, a1.length)
  if (pref >= 6 && e.slice(0, pref) === a1.slice(0, pref)) return { ok: true, razao: 'prefixo' }
  // primeiras palavras
  const we = e.split(' ').filter(Boolean)
  const wa = a1.split(' ').filter(Boolean)
  if (we.length >= 2 && wa.length >= 2 && we[0] === wa[0] && we[1] === wa[1])
    return { ok: true, razao: '2palavras' }
  return { ok: false, razao: 'diff', normEsp: e, normArq: a1 }
}

let ok = 0
let fuzzy = 0
const tituloDiff = []
const parseFail = []
const numeroDesconhecido = []

for (const p of parsed) {
  if (!p.numeroStr) {
    parseFail.push(p.fn)
    continue
  }
  const app = mapaApp.get(p.numeroStr)
  if (!app) {
    numeroDesconhecido.push({ fn: p.fn, numeroStr: p.numeroStr })
    continue
  }
  const r = tituloConfere(app.titulo, p.tituloArq)
  if (r.ok) {
    ok++
    if (r.razao !== 'exato') fuzzy++
  } else {
    tituloDiff.push({
      fn: p.fn,
      numero: p.numeroStr,
      tituloArquivo: p.tituloArq,
      tituloApp: app.titulo
    })
  }
}

const numerosApp = new Set(hinos.map((h) => String(h.numero)))
const numerosMp3 = new Set(parsed.filter((x) => x.numeroStr).map((x) => x.numeroStr))

const semMp3ParaNumero = [...numerosApp].filter((n) => !numerosMp3.has(n)).map(Number).sort((a, b) => a - b)
const mp3SemHinoNoApp = [...numerosMp3].filter((n) => !numerosApp.has(n)).sort()

console.log('Pasta:', folder)
console.log(
  JSON.stringify(
    {
      totalHinosApp: hinos.length,
      totalArquivosMp3: files.length,
      mp3ComNumeroReconhecido: parsed.filter((p) => p.numeroStr).length,
      tituloCompativel: ok,
      tituloCompativelNaoExato: fuzzy,
      tituloDivergente: tituloDiff.length,
      nomeNaoParseado: parseFail.length,
      numerosMp3SemEntradaNoApp: mp3SemHinoNoApp.length,
      hinosSemNenhumMp3: semMp3ParaNumero.length
    },
    null,
    2
  )
)

if (parseFail.length) {
  console.log('\n--- Arquivos com nome não reconhecido (padrão NNN - Título) ---')
  parseFail.slice(0, 30).forEach((f) => console.log(' ', f))
  if (parseFail.length > 30) console.log(' ... +' + (parseFail.length - 30))
}

if (numeroDesconhecido.length) {
  console.log('\n--- Número no arquivo não existe em hinos.js (amostra) ---')
  numeroDesconhecido.slice(0, 25).forEach((x) => console.log(' ', x.numeroStr, x.fn))
  if (numeroDesconhecido.length > 25)
    console.log(' ... total:', numeroDesconhecido.length)
}

if (tituloDiff.length) {
  console.log('\n--- Título provavelmente diferente do app (amostra 40) ---')
  tituloDiff.slice(0, 40).forEach((x) => {
    console.log(`  #${x.numero} | ${x.tituloArquivo.slice(0, 50)} ...`)
    console.log(`         app: ${x.tituloApp}`)
  })
  if (tituloDiff.length > 40) console.log(' ... total divergentes:', tituloDiff.length)
}

if (semMp3ParaNumero.length) {
  console.log('\n--- Números do hinário no app sem nenhum MP3 correspondente (amostra 50) ---')
  const amostra = semMp3ParaNumero.slice(0, 50).map((n) => {
    const h = mapaApp.get(String(n))
    return `${n}: ${h?.titulo || '?'}`
  })
  amostra.forEach((l) => console.log(' ', l))
  if (semMp3ParaNumero.length > 50)
    console.log(' ... total sem arquivo:', semMp3ParaNumero.length)
}

if (mp3SemHinoNoApp.length) {
  console.log('\n--- Pastas com números que não existem no app ---')
  console.log(mp3SemHinoNoApp.join(', '))
}

// --- Repetições: mais de um arquivo .mp3 para a mesma chave (número ou número+letra) ---
const porChave = new Map()
for (const p of parsed) {
  if (!p.numeroStr) continue
  if (!porChave.has(p.numeroStr)) porChave.set(p.numeroStr, [])
  porChave.get(p.numeroStr).push(p)
}
const chavesRepetidas = [...porChave.entries()]
  .filter(([, arr]) => arr.length > 1)
  .sort((a, b) => {
    const na = parseInt(String(a[0]).match(/^\d+/)?.[0] || '0', 10)
    const nb = parseInt(String(b[0]).match(/^\d+/)?.[0] || '0', 10)
    return na - nb || String(a[0]).localeCompare(String(b[0]))
  })

if (chavesRepetidas.length) {
  console.log('\n=== REPETIDAS (mais de um MP3 para o mesmo número / número+letra) ===')
  console.log(`Total de números/chaves com duplicata: ${chavesRepetidas.length}`)
  for (const [chave, arr] of chavesRepetidas) {
    console.log(`\n#${chave} — ${arr.length} arquivos:`)
    for (const p of arr) {
      let bytes = ''
      try {
        const st = statSync(join(folder, p.fn))
        bytes = ` (${st.size} bytes)`
      } catch {
        bytes = ''
      }
      console.log(`  - ${p.fn}${bytes}`)
    }
  }
} else {
  console.log('\n=== Nenhuma chave numérica repetida (um arquivo por número). ===')
}

// --- Possível cópia binária duplicada: mesmo tamanho + mesmo título normalizado ---
const porTamTitulo = new Map()
for (const p of parsed) {
  if (!p.numeroStr) continue
  let size = 0
  try {
    size = statSync(join(folder, p.fn)).size
  } catch {
    continue
  }
  const t = norm(tituloFromArquivo(p.tituloArq))
  const key = `${p.numeroStr}|${size}|${t}`
  if (!porTamTitulo.has(key)) porTamTitulo.set(key, [])
  porTamTitulo.get(key).push(p.fn)
}
const copiasProvaveis = [...porTamTitulo.entries()].filter(([, names]) => names.length > 1)
if (copiasProvaveis.length) {
  console.log('\n=== Prováveis cópias idênticas (mesmo #, mesmo tamanho, mesmo título normalizado) ===')
  for (const [, names] of copiasProvaveis) {
    console.log('')
    names.forEach((n) => console.log(' ', n))
  }
}
