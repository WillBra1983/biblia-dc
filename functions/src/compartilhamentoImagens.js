const MAX_BYTES = 4 * 1024 * 1024
const HOSTS = new Set(['firebasestorage.googleapis.com', 'storage.googleapis.com'])

function rasterPermitido(bytes) {
  return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
}

async function converterPng(bytes) {
  const sharp = require('sharp')
  sharp.concurrency(1)
  sharp.cache({ memory: 8, files: 0, items: 4 })
  return sharp(bytes, { limitInputPixels: 4_000_000 }).rotate()
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 }).toBuffer()
}

function criarCarregadorCapas({ buscar = (...args) => fetch(...args), converter = converterPng } = {}) {
  const cache = new Map()
  return async function carregar(endereco) {
    let url
    try { url = new URL(endereco) } catch { return null }
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !HOSTS.has(url.hostname)) return null
    const anterior = cache.get(url.href)
    if (anterior?.ate > Date.now()) return anterior.promessa
    const promessa = (async () => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      try {
        const resposta = await buscar(url.href, { redirect: 'error', signal: controller.signal })
        if (!resposta.ok || !resposta.body || Number(resposta.headers.get('content-length')) > MAX_BYTES) return null
        const tipo = String(resposta.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(tipo)) return null
        const partes = []; let tamanho = 0
        for await (const parte of resposta.body) {
          const bytes = Buffer.from(parte)
          tamanho += bytes.length
          if (tamanho > MAX_BYTES) return null
          partes.push(bytes)
        }
        const bytes = Buffer.concat(partes)
        if (!rasterPermitido(bytes)) return null
        return await converter(bytes)
      } catch { return null }
      finally { clearTimeout(timer); controller.abort() }
    })()
    if (cache.size >= 4) cache.delete(cache.keys().next().value)
    cache.set(url.href, { ate: Date.now() + 300000, promessa })
    return promessa
  }
}

module.exports = { criarCarregadorCapas, carregarCapaPng: criarCarregadorCapas() }
