import { inflateRawSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const INDEX_URL = 'https://ebible.org/multimedia/hbo/'
const OUTPUT = resolve('src/data/hebrewAudioTimings.json')

async function fetchWithRetry(url, options = {}) {
  let lastError
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(url, options)
      if (response.ok || response.status === 206) return response
      lastError = new Error(`Falha ${response.status} ao ler ${url}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (attempt + 1)))
  }
  throw lastError
}

async function fetchBytes(url, start, end) {
  const response = await fetchWithRetry(url, { headers: { Range: `bytes=${start}-${end}` } })
  return Buffer.from(await response.arrayBuffer())
}

function findEocd(buffer) {
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i
  }
  return -1
}

async function listZipEntries(url) {
  const head = await fetchWithRetry(url, { method: 'HEAD' })
  const length = Number(head.headers.get('content-length'))
  if (!Number.isFinite(length) || length < 22) throw new Error(`Tamanho inválido: ${url}`)

  const tailStart = Math.max(0, length - 65_557)
  const tail = await fetchBytes(url, tailStart, length - 1)
  const eocd = findEocd(tail)
  if (eocd < 0) throw new Error(`Diretório ZIP não encontrado: ${url}`)
  const centralSize = tail.readUInt32LE(eocd + 12)
  const centralOffset = tail.readUInt32LE(eocd + 16)
  const central = await fetchBytes(url, centralOffset, centralOffset + centralSize - 1)
  const entries = []
  let offset = 0
  while (offset + 46 <= central.length && central.readUInt32LE(offset) === 0x02014b50) {
    const compression = central.readUInt16LE(offset + 10)
    const compressedSize = central.readUInt32LE(offset + 20)
    const fileNameLength = central.readUInt16LE(offset + 28)
    const extraLength = central.readUInt16LE(offset + 30)
    const commentLength = central.readUInt16LE(offset + 32)
    const localOffset = central.readUInt32LE(offset + 42)
    const name = central.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8')
    entries.push({ name, compression, compressedSize, localOffset })
    offset += 46 + fileNameLength + extraLength + commentLength
  }
  return entries
}

async function readZipEntry(url, entry) {
  const local = await fetchBytes(url, entry.localOffset, entry.localOffset + 29)
  if (local.readUInt32LE(0) !== 0x04034b50) throw new Error(`Entrada ZIP inválida: ${entry.name}`)
  const fileNameLength = local.readUInt16LE(26)
  const extraLength = local.readUInt16LE(28)
  const dataStart = entry.localOffset + 30 + fileNameLength + extraLength
  const compressed = await fetchBytes(url, dataStart, dataStart + entry.compressedSize - 1)
  if (entry.compression === 0) return compressed
  if (entry.compression === 8) return inflateRawSync(compressed)
  throw new Error(`Compressão ${entry.compression} não suportada: ${entry.name}`)
}

function parseSmil(xml) {
  const verses = new Map()
  const pattern = /<text\s+src="[^"]+#(\d+)[^"]*"\s*\/><audio\s+clipBegin="([\d.]+)"\s+clipEnd="([\d.]+)"/g
  for (const match of xml.matchAll(pattern)) {
    const verse = Number(match[1])
    const begin = Number(match[2])
    const end = Number(match[3])
    const current = verses.get(verse)
    verses.set(verse, current ? [Math.min(current[0], begin), Math.max(current[1], end)] : [begin, end])
  }
  return Object.fromEntries([...verses.entries()].sort((a, b) => a[0] - b[0]))
}

async function inBatches(items, size, worker) {
  const output = []
  for (let index = 0; index < items.length; index += size) {
    output.push(...(await Promise.all(items.slice(index, index + size).map(worker))))
  }
  return output
}

async function main() {
  const htmlResponse = await fetchWithRetry(INDEX_URL)
  const html = await htmlResponse.text()
  const links = [...html.matchAll(/href="(Tanakh fluent [^"]+\.epub)"/g)].map((match) => match[1])
  if (links.length !== 39) throw new Error(`Esperados 39 livros; encontrados ${links.length}`)

  const output = {}
  for (let index = 0; index < links.length; index += 1) {
    const bookId = index + 1
    const url = new URL(links[index], INDEX_URL).href
    const entries = (await listZipEntries(url)).filter((entry) => /\/00-[A-Z0-9]+-\d{3}\.xhtml\.smil$/.test(entry.name))
    const chapters = {}
    const parsed = await inBatches(entries, 4, async (entry) => {
      const chapter = Number(entry.name.match(/-(\d{3})\.xhtml\.smil$/)?.[1])
      if (!chapter) return null
      return [chapter, parseSmil((await readZipEntry(url, entry)).toString('utf8'))]
    })
    for (const item of parsed) if (item) chapters[item[0]] = item[1]
    output[bookId] = chapters
    process.stdout.write(`Livro ${bookId}: ${Object.keys(chapters).length} capítulos\n`)
  }

  await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, 'utf8')
  process.stdout.write(`Marcações salvas em ${OUTPUT}\n`)
}

await main()
