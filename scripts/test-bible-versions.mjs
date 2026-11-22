import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import vm from 'node:vm'
import initSqlJs from 'sql.js'
import { transformSync } from 'esbuild'
import * as catalogo from '../src/data/bibliaVersoes.js'
import * as store from '../src/utils/bibliaVersionStore.js'
import * as sessao from '../src/utils/bibliaSessionCache.js'
import { linhasCitacaoVersiculos, tokensDoBloco } from '../src/utils/bibliaVersoesTexto.js'
import { montarSlidesModoPericope, montarSlidesModoVersiculo } from '../src/utils/bibliaApresentacaoSlides.js'
const inicio=performance.now()
const SQL=await initSqlJs()
const codigo=transformSync(readFileSync('src/services/bibliaService.js','utf8'),{loader:'js',format:'cjs',logLevel:'silent'}).code
function criarServico({ falha=false }={}) {
 const mod={exports:{}}
 vm.runInNewContext(codigo,{module:mod,exports:mod.exports,console:{...console,error:()=>{}},fetch:()=>{throw Error('Download não esperado')},require(nome){
  if(nome==='sql.js') return async()=>SQL
  if(nome==='./bibliaCapituloRapido') return {obterCapituloRapido:async()=>null,preaquecerCapituloInicial:async()=>null,guardarCapituloConsultado(){}}
  if(nome==='../data/bibliaVersoes') return catalogo
  if(nome==='../utils/bibliaVersionStore') return store
  if(nome==='../utils/bibliaSessionCache') return {limparBibliaSessaoCache(){}}
  if(nome==='../utils/biblia') return {normalizarNomeLivro:n=>String(n).trim().toLowerCase()}
  if(nome==='../utils/sqliteAssetCache') return {obterSqliteAssetBytes:async arquivo=>{if(falha)throw Error('Offline'); return new Uint8Array(readFileSync(`public/${arquivo}`))}}
  throw Error(nome)
 }})
 return mod.exports
}
const servico=criarServico()
let grupos=0
async function teste(nome,fn){await fn();grupos++;console.log(`OK: ${nome}`)}
await teste('As três bases têm 66 livros, 1.189 capítulos e referências sem lacunas internas',async()=>{
 for(const versao of catalogo.VERSOES_BIBLICAS){
  const db=await servico.initDB(versao.id)
  assert.equal(db.exec('SELECT COUNT(*) FROM book')[0].values[0][0],66)
  assert.equal(db.exec('SELECT COUNT(*) FROM (SELECT book_id,chapter FROM verse GROUP BY book_id,chapter)')[0].values[0][0],1189)
  assert.equal(db.exec('SELECT COUNT(*) FROM verse_versioned WHERE text IS NULL OR TRIM(text) = \'\'')[0].values[0][0],0)
  const rows=db.exec('SELECT book_id,chapter,verse_number,verse_end FROM verse_versioned ORDER BY book_id,chapter,verse_number')[0].values
  let chave='',fim=0
  for(const [b,c,v,f] of rows){if(`${b}:${c}`!==chave){chave=`${b}:${c}`;fim=0}assert.equal(v,fim+1,`${versao.id} ${chave}`);fim=f}
 }
})
await teste('Leitura, referências e busca usam a mesma versão e isolam os caches',async()=>{
 const textos=[]
 for(const versao of catalogo.VERSOES_BIBLICAS){
  await servico.alterarVersaoBiblica(versao.id)
  const cap=await servico.buscarCapitulo(1,1)
  const ref=await servico.buscarIntervaloVersiculos(1,1,1,1)
  assert.equal(cap[0].texto,ref.versiculos[0].texto)
  assert.equal(ref.versiculos[0].versao,versao.sigla)
  textos.push(cap[0].texto)
  const busca=await servico.buscarTexto(cap[0].texto.slice(0,18),'texto','ambos',1,'incompleta')
  assert.ok(busca.some(v=>v.capitulo===1 && v.versiculo===1))
 }
 assert.equal(new Set(textos).size,3)
 await servico.alterarVersaoBiblica('ara')
 assert.equal((await servico.buscarCapitulo(1,1))[0].texto,textos[0])
})
await teste('NTLH preserva blocos: uma referência a 6:10 retorna o bloco 9–10',async()=>{
 await servico.alterarVersaoBiblica('ntlh')
 const cap=await servico.buscarCapitulo(1,6)
 const intervalo=await servico.buscarIntervaloVersiculos(1,6,10,10)
 assert.equal(intervalo.versiculos.length,1)
 assert.equal(intervalo.versiculos[0].numero,9)
 assert.equal(intervalo.versiculos[0].numeroFim,10)
 assert.ok(intervalo.versiculos[0].texto.includes('Sem, Cam e Jafé'))
 assert.equal(cap.find(v=>v.numero===9).numeroFim,10)
 assert.equal(await servico.contarVersiculos(1,6),22)
})
await teste('Versão inválida ou falha de carregamento não muda a escolha atual',async()=>{
 await servico.alterarVersaoBiblica('ara')
 await assert.rejects(servico.alterarVersaoBiblica('inexistente'))
 assert.equal(store.obterVersaoBiblica(),'ara')
 const offline=criarServico({falha:true})
 await assert.rejects(offline.alterarVersaoBiblica('naa'))
 assert.equal(store.obterVersaoBiblica(),'ara')
})
await teste('Consultas pendentes conservam a versão com que foram iniciadas',async()=>{
 await servico.alterarVersaoBiblica('ara')
 const pendente=servico.buscarCapitulo(43,3)
 await servico.alterarVersaoBiblica('naa')
 const antiga=await pendente, nova=await servico.buscarCapitulo(43,3)
 assert.notEqual(antiga[15].texto,nova[15].texto)
 assert.equal(store.obterVersaoBiblica(),'naa')
})
await teste('Referências por nome e textos do dia/marcados acompanham a seleção sem alterar o original',async()=>{
 const original={livroId:43,capitulo:3,versiculo:16,texto:'Texto guardado anteriormente',corId:'verde'}
 for(const v of catalogo.VERSOES_BIBLICAS){
  await servico.alterarVersaoBiblica(v.id)
  const item=await servico.aplicarVersaoBiblica(original)
  const ref=await servico.buscarVersiculo('João 3:16')
  assert.ok(ref.versiculos.length)
  assert.equal(item.versaoBiblica,v.id)
  assert.equal(item.corId,'verde')
  assert.notEqual(item.texto,original.texto)
  assert.ok(ref.versiculos[0].texto.includes(item.texto))
 }
 assert.equal(original.texto,'Texto guardado anteriormente')
})
await teste('Cache de tela não reaproveita uma tradução anterior, inclusive após desmontagem atrasada',()=>{
 store.definirVersaoBiblica('ara')
 sessao.gravarBibliaSessaoCache({livroId:1,capitulo:1,resultados:[{texto:'ARA'}],versaoBiblica:'ara'})
 store.definirVersaoBiblica('naa')
 assert.equal(sessao.lerBibliaSessaoCache(),null)
 sessao.gravarBibliaSessaoCache({livroId:1,capitulo:1,resultados:[{texto:'ARA antiga'}],versaoBiblica:'ara'})
 assert.equal(sessao.bibliaSessaoCacheCasa(1,1),false)
})
await teste('Slides, citações e Strong preservam o bloco NTLH sem repetir nem deslocar números',async()=>{
 await servico.alterarVersaoBiblica('ntlh')
 const rows=await servico.buscarCapitulo(1,6)
 const linhas=linhasCitacaoVersiculos(rows,[9,10,11])
 assert.equal(linhas.length,2)
 assert.ok(linhas[0].startsWith('9–10 '))
 const slides=montarSlidesModoVersiculo(rows)
 assert.equal(slides.find(s=>s.versiculo===9).numero,'9–10')
 const blocos=montarSlidesModoPericope(rows,await servico.buscarPericopes(1,6))
 assert.equal(blocos.at(-1).fim,22)
 assert.equal(new Set(blocos.flatMap(b=>b.versiculos.map(v=>v.versiculo))).size,rows.length)
 const tokens=tokensDoBloco({9:[{text:'a'}],10:[{text:'b'}]},9,10)
 assert.deepEqual(tokens.map(t=>t.versiculoOrigem),[9,10])
})
await teste('NAA e NTLH apresentam seus próprios títulos e os encontram na busca',async()=>{
 for(const [versao,total,titulo] of [['naa',3044,'A criação do Universo'],['ntlh',2692,'A criação do Universo e da raça humana']]){
  await servico.alterarVersaoBiblica(versao)
  const db=await servico.initDB()
  assert.equal(db.exec('SELECT COUNT(*) FROM pericopes')[0].values[0][0],total)
  const titulos=await servico.buscarPericopes(1,1)
  assert.equal(titulos[0].titulo,titulo)
  assert.equal(titulos[0].versiculo,1)
  const busca=await servico.buscarTexto('criação','pericope','AT',1)
  assert.ok(busca.some(v=>v.capitulo===1 && v.pericope===titulo))
  assert.equal(db.exec('SELECT COUNT(*) FROM pericopes p WHERE NOT EXISTS (SELECT 1 FROM verse v WHERE v.book_id=p.livro_id AND v.chapter=p.capitulo AND v.verse_number=p.versiculo)')[0].values[0][0],0)
 }
 await servico.alterarVersaoBiblica('ntlh')
 const titulos=await servico.buscarPericopes(1,6)
 assert.ok(titulos.some(p=>p.titulo==='A barca de Noé' && p.versiculo===9))
})
for(const arquivo of ['src/App.jsx','src/pages/Biblia.jsx','src/components/BibliaVersaoSeletor.jsx','src/components/TextoBiblico.jsx','src/components/VersiculoPopup.jsx','src/pages/BibliaApresentacao.jsx','src/pages/EstudoBiblicoEditor.jsx','src/pages/VersiculoDoDia.jsx','src/pages/VersiculosMarcados.jsx']) transformSync(readFileSync(arquivo,'utf8'),{loader:'jsx',jsx:'automatic'})
transformSync(readFileSync('src/services/bibliaPassagemEstudoIaService.js','utf8'),{loader:'js'})
await teste('Comparação consulta três traduções em paralelo sem mudar a versão global',async()=>{
 await servico.alterarVersaoBiblica('naa')
 const antes=store.obterVersaoBiblica()
 const textos=await Promise.all(catalogo.VERSOES_BIBLICAS.map(v=>servico.buscarCapituloNaVersao(v.id,1,1)))
 assert.equal(new Set(textos.map(c=>c[0].texto)).size,3)
 assert.equal(store.obterVersaoBiblica(),antes)
 assert.equal((await servico.buscarCapitulo(1,1))[0].texto,textos[1][0].texto)
 const titulos=await Promise.all(['naa','ntlh'].map(v=>servico.buscarPericopesNaVersao(v,1,1)))
 assert.notEqual(titulos[0][0].titulo,titulos[1][0].titulo)
 await assert.rejects(async()=>servico.buscarCapituloNaVersao('invalida',1,1))
 assert.equal(store.obterVersaoBiblica(),antes)
})
transformSync(readFileSync('src/components/BibliaComparacaoDialog.jsx','utf8'),{loader:'jsx',jsx:'automatic'})
console.log(`${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)
