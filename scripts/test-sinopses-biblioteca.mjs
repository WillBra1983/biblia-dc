import assert from 'node:assert/strict'
import fs from 'node:fs'
import { livrosCatalogo } from '../src/data/livrosCatalogo.js'
import { contarApresentacao, partesApresentacao } from '../src/utils/apresentacaoFormatada.js'
import { versaoCompartilhamentoLivro } from '../src/utils/livroShareVersao.js'
import { bibliotecaSharePagesPlugin } from '../vite-plugin-biblioteca-share.js'

const service = fs.readFileSync(new URL('../src/services/bibliotecaLivrosService.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '').replace(/export /g, '')
const mesclar = new Function('livrosCatalogo', `${service}\nreturn catalogoMesclado`)(livrosCatalogo)
const assets = []
await bibliotecaSharePagesPlugin().generateBundle.call({ emitFile(asset) { assets.push(asset) } })
for (const livro of livrosCatalogo) {
  assert.ok(contarApresentacao(livro.descricao) <= 1800, livro.id)
  assert.ok(partesApresentacao(livro.descricao).some(p => p.tipo === 'negrito'), livro.id)
  const remoto = { descricao: 'Sinopse da revisão anterior', versaoDescricaoEditorial: 1, publicado: false, precoPixCentavos: 2500 }
  const atualizado = mesclar({ [livro.id]: remoto }).find(l => l.id === livro.id)
  assert.equal(atualizado.descricao, livro.descricao)
  assert.equal(atualizado.publicado, false)
  assert.equal(atualizado.precoPixCentavos, 2500)
  const editado = mesclar({ [livro.id]: { ...remoto, versaoDescricaoEditorial: 2 } }).find(l => l.id === livro.id)
  assert.equal(editado.descricao, remoto.descricao)
  const html = assets.find(a => a.fileName === `compartilhar/livro/${livro.id}.html`).source
  const texto = partesApresentacao(livro.descricao).map(p => p.texto).join('')
  assert.ok(html.includes(texto))
  assert.ok(!html.includes('*'))
  assert.ok(html.includes(`?v=${versaoCompartilhamentoLivro(livro)}`))
}
const ryle = livrosCatalogo.find(l => l.id === 'luz-dos-tempos-antigos').descricao
for (const nome of ['John Wycliffe', 'John Rogers', 'John Hooper', 'Rowland Taylor', 'Hugh Latimer', 'John Bradford', 'Nicholas Ridley', 'Samuel Ward', 'Richard Baxter', 'William Gurnall', 'William Laud', 'Jaime II', 'William Sancroft', 'Lloyd', 'Turner', 'Lake', 'Ken', 'White', 'Jonathan Trelawney']) {
  assert.ok(ryle.includes(nome), `Falta o personagem ${nome}`)
}
console.log('Sinopses: limites, formatação, personagens de Ryle, migração, futuras edições e prévias aprovados para os nove livros.')
