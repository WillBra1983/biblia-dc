import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'
import { createCanvas } from '@napi-rs/canvas'

function carregar(arquivo, extras = {}) {
  const source = fs.readFileSync(arquivo, 'utf8').replace(/^import .*$/gm, '')
  const contexto = { module: { exports: {} }, exports: {}, ...extras }
  vm.runInNewContext(transformSync(source, { format: 'cjs', loader: 'js' }).code, contexto)
  return contexto.module.exports
}
const { normalizarTrechoLivro } = carregar('src/utils/textoTrechoLivro.js')
const { partesApresentacao, contarApresentacao } = carregar('src/utils/apresentacaoFormatada.js')
assert.equal(contarApresentacao('**Negrito** e *itálico*'), 'Negrito e itálico'.length)
assert.equal(partesApresentacao('***Ambos***')[0].tipo, 'negritoitalico')
assert.equal(contarApresentacao('***Ambos***'), 5)
let fontesTrecho = new Set()
let alinhamentosTrecho = new Set()
const canvasFactory = () => {
  const canvas = createCanvas(1080, 1350)
  const ctx = canvas.getContext('2d')
  const desenhar = ctx.fillText.bind(ctx)
  ctx.fillText = (texto, x, y) => {
    if (ctx.font.includes('Georgia') && y < 960) { fontesTrecho.add(ctx.font); alinhamentosTrecho.add(`${ctx.textAlign}:${x}`) }
    desenhar(texto, x, y)
  }
  canvas.toBlob = (callback) => callback(new Blob([canvas.toBuffer('image/png')], { type: 'image/png' }))
  return canvas
}
const funcoes = carregar('src/utils/livroTrechoImagem.js', { normalizarTrechoLivro, document: { createElement: canvasFactory }, Blob })
assert.equal(funcoes.aspasTrechoImagem('Trecho', 1, 1), '“Trecho”')
assert.equal(funcoes.aspasTrechoImagem('Início', 1, 4), '“Início')
assert.equal(funcoes.aspasTrechoImagem('Continuação', 2, 4), 'Continuação')
assert.equal(funcoes.aspasTrechoImagem('Continuação', 3, 4), 'Continuação')
assert.equal(funcoes.aspasTrechoImagem('Fim', 4, 4), 'Fim”')
const medir = (texto) => texto.length * 25
assert.equal(funcoes.ultimaLinhaPermitida('uma linha com quatro', medir), true)
assert.equal(funcoes.ultimaLinhaPermitida('apenas três palavras', medir), false)
assert.equal(funcoes.ultimaLinhaPermitida('extraordinariamente incompreensivelmente', medir), true)
assert.equal(funcoes.ultimaLinhaPermitida('que', medir), false)
assert.deepEqual(Array.from(funcoes.ajustarUltimaLinha(['marido e mulher são', 'pessoas'], medir)), ['marido e mulher são pessoas'])
assert.equal(funcoes.ultimaLinhaPermitida('ordem.', medir), true)
assert.equal(funcoes.ultimaLinhaPermitida('ordem.”', medir), true)
assert.deepEqual(Array.from(funcoes.ajustarUltimaLinha(['sociedade é mantida em', 'ordem.'], medir)), ['sociedade é mantida em', 'ordem.'])
assert.equal(funcoes.ultimaLinhaPermitida('ordem', medir), false)
assert.equal(funcoes.ajustarUltimaLinha(['parágrafo anterior', '', 'que'], medir), null)
assert.ok(funcoes.penalidadeFinalQuadro(['relações entre marido e mulher', 'que'], medir) > funcoes.penalidadeFinalQuadro(['relações entre marido e mulher'], medir))
assert.equal(funcoes.penalidadeFinalQuadro(['O parágrafo termina aqui.'], medir), 0)
assert.ok(funcoes.penalidadeFinalQuadro(['Uma frase que termina em que'], medir) > 0)
const original = 'Pergunta 9\nMinistro: Como faremos isso?\n\nDiscípulo: Conhecendo-o como todo-poderoso e perfeitamente bom. '.repeat(8)
const partes = funcoes.dividirTrechoEmPartes(original, (texto) => texto.length <= 240)
assert.ok(partes.length > 1)
assert.equal(partes.join(' ').replace(/\s+/g, ' ').trim(), original.replace(/\s+/g, ' ').trim())
assert.throws(() => funcoes.dividirTrechoEmPartes('a'.repeat(12001), () => true), /12 mil/)
const imagens = await funcoes.gerarImagensTrechoLivro({ trecho: original, titulo: 'Livro de teste', autor: 'Autor', dividir: true })
assert.ok(imagens.length > 1)
assert.ok(imagens.every((imagem) => imagem.type === 'image/png' && imagem.size > 10000))
const menores = await funcoes.gerarImagensTrechoLivro({ trecho: original, titulo: 'Livro de teste', dividir: true, reduzirFonte: true })
assert.ok(menores.length <= imagens.length)
fontesTrecho = new Set()
alinhamentosTrecho = new Set()
const escolhidas = await funcoes.gerarImagensTrechoLivro({ trecho: original, titulo: 'Livro de teste', dividir: true, quantidadeQuadros: 6 })
assert.equal(escolhidas.length, 6)
assert.equal(fontesTrecho.size, 1, 'Os seis quadros devem desenhar o trecho com a mesma fonte.')
assert.deepEqual([...alinhamentosTrecho], ['left:115'], 'Os trechos devem ter a mesma margem e alinhamento em todos os quadros.')
await assert.rejects(funcoes.gerarImagensTrechoLivro({ trecho: original, quantidadeQuadros: 1 }), /não cabe/)
const seisPartes = funcoes.dividirTrechoEmPartes(original, (texto) => texto.length <= 240, 6)
assert.equal(seisPartes.length, 6)
assert.equal(seisPartes.join(' ').replace(/\s+/g, ' ').trim(), original.replace(/\s+/g, ' ').trim())
let enviado
class Arquivo extends Blob { constructor(conteudo, nome, opcoes) { super(conteudo, opcoes); this.name = nome } }
const envioWeb = carregar('src/utils/livroTrechoImagem.js', {
  normalizarTrechoLivro, Capacitor: { isNativePlatform: () => false }, File: Arquivo,
  navigator: { canShare: ({ files }) => files.length > 0, share: async (dados) => { enviado = dados } },
})
await envioWeb.compartilharImagemTrechoLivro(escolhidas, { titulo: 'Teste', urlLivro: 'https://example.org/livro' })
assert.equal(enviado.files.length, 6)
assert.equal(enviado.text, undefined)
assert.equal(enviado.url, undefined)
assert.ok(enviado.files.every((arquivo) => arquivo.type === 'image/png'))
let nativo, apagados = 0
class LeitorTeste { readAsDataURL() { this.result = 'data:image/png;base64,teste'; this.onload() } }
const envioNativo = carregar('src/utils/livroTrechoImagem.js', {
  normalizarTrechoLivro, Capacitor: { isNativePlatform: () => true }, FileReader: LeitorTeste, Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: async () => {}, getUri: async ({ path }) => ({ uri: `file:///cache/${path}` }), deleteFile: async () => { apagados++ } },
  Share: { share: async (dados) => { nativo = dados } }, window: { setTimeout: () => {} },
})
await envioNativo.compartilharImagemTrechoLivro(escolhidas, { titulo: 'Teste' })
assert.equal(nativo.files.length, 6)
assert.equal(nativo.text, undefined)
assert.equal(apagados, 0)
console.log('OK: quantidade escolhida, preservação do texto e envio web/nativo com PNGs sem link ou exclusão prematura (simulados).')
await assert.rejects(funcoes.gerarImagensTrechoLivro({ trecho: original, dividir: false }), /não cabe/)
const plano = funcoes.planejarImagensTrecho(canvasFactory().getContext('2d'), { trecho: original, quantidadeQuadros: 6 })
assert.equal(plano.partes.length, 6)
assert.ok(plano.tamanhoFonte >= 46 && plano.tamanhoFonte <= 60)
assert.equal(plano.partes.join(' ').replace(/\s+/g, ' ').trim(), original.replace(/\s+/g, ' ').trim())
const { destaquesAtivos, LIMITE_APRESENTACAO, APRESENTACAO_LUZ_TEMPOS } = carregar('src/services/destaquesMenuService.js')
assert.ok(APRESENTACAO_LUZ_TEMPOS.length <= LIMITE_APRESENTACAO)
assert.ok(APRESENTACAO_LUZ_TEMPOS.includes('William Gurnall'))
assert.deepEqual(Array.from(destaquesAtivos([{ id: 'ativo' }, { id: 'futuro', inicioEm: 2000 }, { id: 'expirado', fimEm: 1000 }, { id: 'desativado', ativo: false }], 1000), (item) => item.id), ['ativo'])
const regras = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules.destaquesMenu
assert.match(regras['.write'], /admin/)
assert.equal(regras['.read'], true)
console.log(`OK: texto preservado, limites, ${imagens.length} imagens PNG, fonte reduzida, calendário e regras administrativas.`)
const destaque = fs.readFileSync('src/components/DestaquesMenu.jsx', 'utf8')
const textoDestaque = fs.readFileSync('src/components/TextoDestaque.jsx', 'utf8')
assert.ok(!destaque.includes('setDetalhe'))
assert.match(destaque, /onPointerDown/)
assert.ok(!destaque.includes('Troca automática'))
assert.ok(!destaque.includes('Destaque anterior'))
assert.ok(!destaque.includes('Retomar'))
assert.match(destaque, /Escolher destaque/)
const { direcaoGestoDestaque } = carregar('src/utils/gestoDestaques.js')
assert.equal(direcaoGestoDestaque({ x: 100, y: 100 }, { x: 20, y: 105 }), 1)
assert.equal(direcaoGestoDestaque({ x: 100, y: 100 }, { x: 180, y: 105 }), -1)
assert.equal(direcaoGestoDestaque({ x: 100, y: 100 }, { x: 120, y: 105 }), 0)
assert.equal(direcaoGestoDestaque({ x: 100, y: 100 }, { x: 20, y: 220 }), 0)
assert.match(destaque, /acessos\[item\?\.livroId\]\?\.ativo === true/)
assert.match(textoDestaque, /scrollHeight > elemento.clientHeight/)
assert.match(textoDestaque, /Ler menos/)
console.log('OK: expansão no quadro, indicadores, gestos horizontais/verticais, acesso confirmado e rotação automática.')
