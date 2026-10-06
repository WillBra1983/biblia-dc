import fs from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { transformSync } from 'esbuild'
const arquivos = ['src/components/EditorApresentacao.jsx', 'src/components/CampoTextoEstudo.jsx', 'src/components/TextoComReferencias.jsx', 'src/components/EditorialProse.jsx', 'src/pages/EstudoBiblicoEditor.jsx', 'src/pages/EstudoBiblicoIaPassagem.jsx', 'src/pages/EstudoBiblicoIaPericope.jsx', 'src/pages/StrongEstudoResumo.jsx']
for (const arquivo of arquivos) transformSync(fs.readFileSync(arquivo, 'utf8'), { loader: 'jsx' })
const contexto = { module: { exports: {} }, exports: {} }
vm.runInNewContext(transformSync(fs.readFileSync('src/utils/formatoEstudo.js', 'utf8'), { format: 'cjs' }).code, contexto)
const { lerFormatoEstudo, escreverFormatoEstudo } = contexto.module.exports
const original = '# Tema\n\nFé em **João 3:16** e *Romanos 8:1*.\n\nSegundo parágrafo.'
const editor = fs.readFileSync('src/components/EditorApresentacao.jsx', 'utf8')
const serializarCodigo = editor.slice(editor.indexOf('function serializar'), editor.indexOf('function preencher'))
const serializar = new Function(`${serializarCodigo}; return serializar`)()
const folha = (valor) => ({ nodeType: 3, nodeValue: valor })
const elemento = (nome, filhos, style = {}) => ({ nodeType: 1, nodeName: nome, childNodes: filhos, style })
assert.equal(serializar(elemento('DIV', [elemento('B', [folha('Fé')]), folha(' em '), elemento('I', [folha('João 3:16')])])), '**Fé** em *João 3:16*')
assert.equal(serializar(elemento('DIV', [elemento('SPAN', [folha('ambos')], { fontWeight: '700', fontStyle: 'italic' })])), '***ambos***')
assert.equal(serializar(elemento('DIV', [folha('Primeiro'), elemento('DIV', [folha('Segundo')])])), 'Primeiro\nSegundo')
assert.equal(lerFormatoEstudo(original).texto, original)
assert.equal(lerFormatoEstudo(original).alinhamento, null)
for (const alinhamento of ['justify', 'left']) {
  const salvo = escreverFormatoEstudo(original, alinhamento)
  assert.equal(lerFormatoEstudo(salvo).texto, original)
  assert.equal(lerFormatoEstudo(salvo).alinhamento, alinhamento)
  assert.equal(escreverFormatoEstudo(salvo, alinhamento), salvo)
}
const textoComRefs = fs.readFileSync('src/components/TextoComReferencias.jsx', 'utf8')
const trecho = textoComRefs.slice(textoComRefs.indexOf('function expandirMarcacaoEditorialNasPartes'), textoComRefs.indexOf('function renderizarEstiloEditorial'))
const expandir = new Function(`${trecho}; return expandirMarcacaoEditorialNasPartes`)()
const partes = expandir([{ conteudo: '**Fé em ' }, { isRef: true, ref: 'João 3:16' }, { conteudo: '** e *graça*.' }])
assert.equal(partes.find((parte) => parte.isRef).negrito, true)
assert.equal(partes.find((parte) => parte.conteudo === 'graça').italico, true)
assert.ok(partes.every((parte) => !String(parte.conteudo || '').includes('*')))
console.log('OK: 8 componentes, texto antigo preservado, alinhamento salvo/reaberto, parágrafos e formatação atravessando links bíblicos.')
