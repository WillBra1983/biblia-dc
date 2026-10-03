import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { CachePaginasPdf, FilaRenderPdf, prioridadePaginaPdf } from '../src/utils/pdfLeituraRecursos.js'

// Verificação real do motor gráfico, sem login ou alterações na biblioteca.
// O canvas nativo do teste não aceita superfícies auxiliares com dimensão zero.
// Esse ajuste é exclusivo do teste; o leitor usa o canvas normal do navegador.
class CanvasTeste {
  create(width, height) { const canvas = createCanvas(Math.max(1, width), Math.max(1, height)); return { canvas, context: canvas.getContext('2d') } }
  reset(item, width, height) { item.canvas.width = Math.max(1, width); item.canvas.height = Math.max(1, height) }
  destroy(item) { item.canvas = null; item.context = null }
}
const tarefa = getDocument({ data: new Uint8Array(readFileSync(new URL('../public/hinario-com-cifras.pdf', import.meta.url))), CanvasFactory: CanvasTeste, useSystemFonts: false, disableFontFace: true, standardFontDataUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)) })
const documento = await tarefa.promise
const cache = new CachePaginasPdf()
const fila = new FilaRenderPdf(2)
let renderizacoes = 0
async function abrir(numero) {
  const chave = `${numero}:420`
  const salvo = cache.obter(chave)
  if (salvo) return salvo
  return fila.agendar(async () => {
    const folha = await documento.getPage(numero)
    const base = folha.getViewport({ scale: 1 })
    const viewport = folha.getViewport({ scale: 420 / base.width })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    await folha.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    renderizacoes++
    cache.guardar(chave, canvas, canvas.width * canvas.height * 4)
    return canvas
  }, () => prioridadePaginaPdf(numero, 1)).promise
}
try {
  const inicio = performance.now()
  const numeros = Array.from({ length: Math.min(8, documento.numPages) }, (_, i) => i + 1)
  await Promise.all(numeros.map(abrir))
  const primeiraPassagemMs = Math.round(performance.now() - inicio)
  const antes = renderizacoes
  const volta = performance.now()
  for (const numero of [...numeros].reverse()) {
    const imagem = await abrir(numero)
    assert.ok(imagem.width > 0 && imagem.height > 0)
  }
  const retornoMs = Math.round(performance.now() - volta)
  assert.equal(renderizacoes, antes, 'Retorno às páginas prontas não pode chamar render() novamente')
  assert.ok(cache.bytes <= cache.limiteBytes)
  console.log(JSON.stringify({ paginasDoPdf: documento.numPages, paginasTestadas: numeros.length, renderizacoes, primeiraPassagemMs, retornoMs, cacheMiB: +(cache.bytes / 1048576).toFixed(2) }))
} finally {
  cache.limpar()
  await tarefa.destroy()
}
