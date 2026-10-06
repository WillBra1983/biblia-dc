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
const canvasFactory = () => {
  const canvas = createCanvas(1080, 1350)
  canvas.toBlob = (callback) => callback(new Blob([canvas.toBuffer('image/png')], { type: 'image/png' }))
  return canvas
}
const funcoes = carregar('src/utils/livroTrechoImagem.js', { normalizarTrechoLivro, document: { createElement: canvasFactory }, Blob })
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
await assert.rejects(funcoes.gerarImagensTrechoLivro({ trecho: original, dividir: false }), /muito longo/)
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
