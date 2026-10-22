import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
import { livroVisivelNoAcervo } from '../src/utils/disponibilidadeLivro.js'

const pix = { publicado: true, pixAtivo: true, precoPixCentavos: 2500, arquivos: { completo: { chave: 'livro.epub' } } }
assert.equal(livroVisivelNoAcervo(pix), true)
assert.equal(livroVisivelNoAcervo({ ...pix, publicado: false }), false)
assert.equal(livroVisivelNoAcervo({ ...pix, excluido: true }), false)
assert.equal(livroVisivelNoAcervo({ ...pix, precoPixCentavos: 0 }), false)
assert.equal(livroVisivelNoAcervo({ ...pix, arquivos: {} }), false)
assert.equal(livroVisivelNoAcervo({}), false)
for (const campo of ['androidUrl', 'appleUrl', 'amazonUrl']) {
  assert.equal(livroVisivelNoAcervo({ [campo]: 'https://example.com/livro' }), true)
}
const source = fs.readFileSync(new URL('../src/pages/BibliotecaLivros.jsx', import.meta.url), 'utf8')
const result = ts.transpileModule(source, { fileName: 'BibliotecaLivros.jsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext }, reportDiagnostics: true })
assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
// Exercita as opções de compra reais nas três plataformas, sem depender dos componentes visuais.
const compiled = result.outputText
const start = compiled.indexOf('function opcoesLivro(')
const end = compiled.indexOf('function rotuloAcaoOpcao(', start)
assert.ok(start >= 0 && end > start)
for (const plataforma of ['web', 'android', 'ios']) {
  const opcoes = new Function('PLATAFORMA', '_jsx', 'PixIcon', 'AndroidIcon', 'AppleIcon', 'StorefrontOutlinedIcon', `${compiled.slice(start, end)}; return opcoesLivro`)(plataforma, () => null, null, null, null, null)
  assert.equal(livroVisivelNoAcervo(pix), true)
  assert.deepEqual(opcoes(pix).map(o => o.id), plataforma === 'web' ? ['pix'] : [])
}
console.log('Aprovado: livros Pix visíveis no acervo, rascunhos e cadastros incompletos ocultos, compra Pix mantida na web e página válida.')
