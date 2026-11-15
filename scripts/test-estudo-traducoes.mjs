import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { performance } from 'node:perf_hooks'
import { build, transformSync } from 'esbuild'
import * as catalogo from '../src/data/bibliaVersoes.js'
import * as trad from '../src/utils/estudoTraducao.js'
import * as texto from '../src/utils/bibliaVersoesTexto.js'
import * as tons from '../src/utils/iaTonalidade.js'
import * as livros from '../src/data/biblia.js'
import * as salmos from '../src/data/salmosEstrutura.js'
import * as original from '../src/utils/estudoOriginal.js'
const started=performance.now(), storage=new Map(), dados=new Map(), chamadas=[]
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()}
function modulo(arquivo, deps={}) {
 const m={exports:{}}
 const code=transformSync(fs.readFileSync(arquivo,'utf8'),{format:'cjs',define:{'import.meta.env':'{}'},logLevel:'silent'}).code
 vm.runInNewContext(code,{module:m,exports:m.exports,console,localStorage,Date,require:n=>{if(deps[n])return deps[n];if(n.endsWith('estudoTraducao'))return trad;if(n.endsWith('estudoOriginal'))return original;if(n.endsWith('iaTonalidade'))return tons;throw Error(n)}})
 return m.exports
}
let falharConsulta=false
const api={ref:(_,p)=>p,get:async p=>{if(falharConsulta)throw Error('Offline');const value=dados.get(p) || Object.fromEntries([...dados].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>[k.slice(p.length+1),v]));return {exists:()=>dados.has(p)||Object.keys(value).length>0,val:()=>value}} ,set:async(p,v)=>dados.set(p,v),remove:async p=>dados.delete(p)}
// Bundle somente do repositório, com Firebase em memória. Nenhuma conexão externa.
const dir='.cache/menu-review';fs.mkdirSync(dir,{recursive:true})
await build({entryPoints:['src/services/estudosCuradosService.js'],outfile:dir+'/repo-test.cjs',bundle:true,platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'firebase-memory',setup(b){b.onResolve({filter:/config\/firebase$|^firebase\/database$/},a=>({path:a.path,namespace:'memory'}));b.onLoad({filter:/.*/,namespace:'memory'},a=>({contents:a.path==='firebase/database'?'export const {ref,get,set,remove}=globalThis.__dbApi':'export const loadFirebaseModules=async()=>{};export const getFirebaseDatabase=()=>({})'}))}}]})
globalThis.__dbApi=api
const {createRequire}=await import('node:module');const require=createRequire(import.meta.url);const repo=require(path.resolve(dir+'/repo-test.cjs'))
let passed=0
async function test(nome,fn){await fn();passed++;console.log('OK: '+nome)}
await test('Chaves explicitamente isoladas nas três traduções e tons',()=>{
 for(const tom of tons.TONS_IDS){const keys=catalogo.VERSOES_BIBLICAS.map(v=>repo.chaveEstudoCurado(43,3,[17,16,16],tom,v.id));assert.equal(new Set(keys).size,3);for(const [i,v] of catalogo.VERSOES_BIBLICAS.entries())assert.ok(keys[i].endsWith('~biblia_'+v.id));assert.ok(!keys.includes(repo.chaveEstudoCurado(43,3,[16,17],tom)))}
 assert.throws(()=>trad.validarTraducaoEstudo('invalida'))
})
await test('Cache de versículos e perícopes mantém ARA, NAA e NTLH separados',()=>{
 const c=modulo('src/utils/bibliaIaPassagemCache.js'),p=modulo('src/utils/bibliaIaPericopeCache.js')
 for(const id of ['ara','naa','ntlh']){c.criarCachePassagemPorTraducao(id).gravarCacheIaPassagem(43,3,[16],{texto:id});p.criarCachePericopePorTraducao(id).gravarCachePericope(43,3,1,21,{texto:id})}
 for(const id of ['ara','naa','ntlh']){assert.equal(c.criarCachePassagemPorTraducao(id).lerCacheIaPassagem(43,3,[16]).texto,id);assert.equal(p.criarCachePericopePorTraducao(id).lerCachePericope(43,3,1,21).versaoBiblica,id)}
 c.criarCachePassagemPorTraducao('naa').apagarCacheIaPassagem(43,3,[16]);assert.ok(c.criarCachePassagemPorTraducao('ara').lerCacheIaPassagem(43,3,[16]));assert.equal(c.lerCacheIaPassagem(43,3,[16]),null)
})
await test('Salvar, recuperar, votar e remover afeta somente a tradução solicitada',async()=>{
 for(const id of ['ara','naa','ntlh']){const r=repo.criarRepositorioEstudosPorTraducao(id);assert.equal((await r.salvarEstudoCurado({livroId:43,capitulo:3,versArr:[16],texto:id,uidAutor:'admin'})).ok,true);assert.equal((await r.salvarPericopeCurada({livroId:43,capitulo:3,inicio:1,fim:21,texto:id,uidAutor:'admin'})).ok,true);await r.registrarVoto({livroId:43,capitulo:3,versArr:[16],voto:'positivo',uid:'leitor'});await r.registrarVotoPericope({livroId:43,capitulo:3,inicio:1,fim:21,voto:'positivo',uid:'leitor'})}
 for(const id of ['ara','naa','ntlh']){const r=repo.criarRepositorioEstudosPorTraducao(id);assert.equal((await r.lerEstudoCurado(43,3,[16])).texto,id);assert.equal((await r.lerPericopeCurada(43,3,1,21)).versaoBiblica,id);assert.equal(await r.lerMeuVoto({livroId:43,capitulo:3,versArr:[16],uid:'leitor'}),'positivo')}
 await repo.criarRepositorioEstudosPorTraducao('naa').removerEstudoCurado(43,3,[16]);assert.equal(await repo.criarRepositorioEstudosPorTraducao('naa').lerEstudoCurado(43,3,[16]),null);assert.ok(await repo.criarRepositorioEstudosPorTraducao('ara').lerEstudoCurado(43,3,[16]));assert.equal((await repo.listarEstudosPericope()).length,1)
})
await test('Candidatos e descarte também mantêm a separação',async()=>{
 for(const id of ['ara','ntlh']){const r=repo.criarRepositorioEstudosPorTraducao(id);await r.publicarEstudoCandidato({livroId:1,capitulo:1,versArr:[1],texto:id,uidAutor:'leitor',uid:'leitor'});await r.publicarPericopeCandidata({livroId:1,capitulo:1,inicio:1,fim:5,texto:id,uidAutor:'leitor',uid:'leitor'});assert.equal((await r.lerEstudoCandidato(1,1,[1])).texto,id);assert.equal((await r.lerPericopeCandidata(1,1,1,5)).texto,id)}
 await repo.criarRepositorioEstudosPorTraducao('ntlh').descartarEstudoCandidato({livroId:1,capitulo:1,versArr:[1]});assert.ok(await repo.criarRepositorioEstudosPorTraducao('ara').lerEstudoCandidato(1,1,[1]))
})
await test('Cotas permitem a outra tradução do mesmo trecho sem liberar novos trechos',()=>{
 storage.clear();const m=modulo('src/utils/iaGeracaoLimites.js');for(const id of ['v:1','v:2','v:3'])m.marcarGerado({tipo:'versiculo',id:trad.idEstudoNaTraducao(id,'ara')});assert.equal(m.podeGerar({tipo:'versiculo',id:trad.idEstudoNaTraducao('v:1','naa')}).ok,true);assert.equal(m.podeGerar({tipo:'versiculo',id:'v:4~biblia_naa'}).ok,false);assert.equal(m.podeGerar({tipo:'versiculo',id:'v:1~biblia_ara'}).ok,false);m.marcarGerado({tipo:'pericope',id:'p:1~biblia_ara'});assert.equal(m.podeGerar({tipo:'pericope',id:'p:1~biblia_ntlh'}).ok,true);assert.equal(m.podeGerar({tipo:'pericope',id:'p:2~biblia_ntlh'}).ok,false)
})
await test('Texto e prompts partem de ARA por padrão; alternativa usa texto da própria tradução',async()=>{
 const svc=modulo('src/services/bibliaPassagemEstudoIaService.js',{'../utils/bibliaVersoesTexto':texto,'../data/biblia':livros,'../data/salmosEstrutura':salmos,'./bibliaService':{buscarCapituloNaVersao:async id=>[{numero:1,texto:'Texto '+id},{numero:2,texto:'Contexto '+id}],buscarPericopesNaVersao:async()=>[{versiculo:1,titulo:'Título'}]},'./strongEstudoAiService':{iaGeminiDisponivel:()=>true,gerarConteudoGemini:async body=>{chamadas.push(body.contents[0].parts[0].text);return {ok:true,text:'Estudo'}}}})
 const padrao=await svc.montarPassagemLida(1,1,[1]);assert.equal(padrao.meta.versaoBiblica,'ara');assert.match(padrao.textoCitacao,/Texto ara/)
 for(const id of ['ara','naa','ntlh']){const p=await svc.montarPassagemLida(1,1,[1],id),q=await svc.montarPericopeLida(1,1,1,2,'',id);assert.match(p.pericope.texto,new RegExp('Contexto '+id));assert.equal(q.meta.versaoBiblica,id);await svc.gerarComentarioVersiculo({...p,versaoBiblica:id});await svc.gerarEstudoPericopeCompleto({...q,versaoBiblica:id});for(const prompt of chamadas.slice(-2)){assert.ok(prompt.includes('TRADUÇÃO BASE: '+id.toUpperCase()));assert.ok(prompt.includes('Texto '+id))}}
})
await test('Descoberta prioriza ARA histórica integral e encontra as outras traduções sem escrever',async()=>{
 storage.clear();dados.clear();const original='Estudo histórico extenso. '.repeat(500);dados.set('estudosCurados/43_3_16~academico',{texto:original});dados.set('estudosCurados/43_3_16~biblia_ara',{texto:'Cópia recente'});dados.set('estudosCurados/43_3_16~biblia_naa',{texto:'NAA existente'});const antes=JSON.stringify([...dados]);const service=modulo('src/services/estudosDisponiveisService.js',{'./estudosCuradosService':repo,'../utils/bibliaIaPassagemCache':modulo('src/utils/bibliaIaPassagemCache.js'),'../utils/bibliaIaPericopeCache':modulo('src/utils/bibliaIaPericopeCache.js')});const encontrados=await service.consultarEstudosDisponiveis({tipo:'versiculo',livroId:43,capitulo:3,versArr:[16]});assert.equal(encontrados.ara.texto,original);assert.equal(encontrados.ara.legado,true);assert.equal(encontrados.ara.tom,'academico');assert.equal(encontrados.naa.texto,'NAA existente');assert.equal(encontrados.ntlh,undefined);assert.equal(JSON.stringify([...dados]),antes)
})
await test('Registros legados, candidatos e caches de perícopes são localizados como ARA',async()=>{
 storage.clear();dados.clear();dados.set('pericopesCandidatas/43_3_1_21',{texto:'Perícope candidata original'});const passagem=modulo('src/utils/bibliaIaPassagemCache.js'),pericope=modulo('src/utils/bibliaIaPericopeCache.js');passagem.gravarCacheIaPassagem(43,3,[16],{texto:'Cache antigo'});localStorage.setItem('salvation-ia-pericope:43:3:22:30',JSON.stringify({texto:'Cache antigo perícope'}));const service=modulo('src/services/estudosDisponiveisService.js',{'./estudosCuradosService':repo,'../utils/bibliaIaPassagemCache':passagem,'../utils/bibliaIaPericopeCache':pericope});assert.equal((await service.consultarEstudosDisponiveis({tipo:'versiculo',livroId:43,capitulo:3,versArr:[16]})).ara.texto,'Cache antigo');assert.equal((await service.consultarEstudosDisponiveis({tipo:'pericope',livroId:43,capitulo:3,inicio:1,fim:21})).ara.fonte,'candidato');assert.equal((await service.consultarEstudosDisponiveis({tipo:'pericope',livroId:43,capitulo:3,inicio:22,fim:30})).ara.texto,'Cache antigo perícope');assert.equal((await repo.criarRepositorioEstudosPorTraducao('ara',{legadoAra:true}).lerPericopeCandidata(43,3,1,21)).texto,'Perícope candidata original')
})
await test('Falha na consulta é propagada, nunca convertida em ausência de estudos',async()=>{
 falharConsulta=true;try{await assert.rejects(()=>repo.consultarRegistrosEstudo({tipo:'versiculo',livroId:43,capitulo:3,versArr:[16]}),/Offline/)}finally{falharConsulta=false}
})
for(const file of ['src/components/EstudoTraducao.jsx','scripts/fixtures/estudo-traducoes.jsx','src/components/TextoComReferencias.jsx','src/pages/EstudoBiblicoIaPassagem.jsx','src/pages/EstudoBiblicoIaPericope.jsx'])transformSync(fs.readFileSync(file,'utf8'),{loader:'jsx',jsx:'automatic',logLevel:'silent'})
console.log(passed+'/'+passed+' grupos aprovados (100%); falhas: 0%; tempo: '+((performance.now()-started)/1000).toFixed(2)+' s.')
