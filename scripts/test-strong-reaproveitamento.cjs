const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm')
const { transformSync } = require('esbuild')
const source = transformSync(fs.readFileSync('src/services/strongResumoInlineService.js','utf8'), {format:'cjs'}).code

function ambiente({ local = '', publicado = 'Lemma compartilhado', tokenPublicado = '', falhaLemma = false, falhaToken = false } = {}) {
  const lemma = new Map(local ? [['G26',local]] : []), tokens = new Map(), sessao = new Map()
  const chamadas = {lemma:0,token:0}
  const mocks = {
    strongEstudoHelpers: {limparResumoLexicalParaExibicao:t=>String(t||'').trim(),resumoTextoPareceCompleto:()=>true},
    strongTextoPt: {textoCurtoLexicalPt:()=>'',capitalizarFrasesPtBr:t=>t},
    strongResumoIaStorage: {strongResumoIaStorageKey:(code,token)=>code+JSON.stringify(token)},
    strongResumoLocalCache: {
      lerResumoLemmaLocalStrong:c=>lemma.get(c),salvarResumoLemmaLocalStrong:(c,t)=>lemma.set(c,t),
      lerResumoTokenLocalStrong:c=>tokens.get(c),salvarResumoTokenLocalStrong:(c,t)=>tokens.set(c,t),
      limparResumoLemmaLocalStrong:c=>lemma.delete(c),limparResumoTokenLocalStrong:c=>tokens.delete(c),
    },
    strongTokenHelpers: {chaveCacheAnaliseToken:(code,t)=>`${code}@${t.text}@${t.versiculo}`,
      formatarReferenciaPassagemToken:()=>'',precisaAnaliseFormaPassagem:t=>Boolean(t)},
    strongResumoShareService: {
      obterResumoStrongPublicadoPorCodigo:async()=>{if(falhaLemma)throw Error('rede');return publicado?{id:'existente',resumo:publicado}:null},
      obterResumoTokenPublicadoPorChave:async()=>{if(falhaToken)throw Error('rede');return tokenPublicado?{id:'token',resumo:tokenPublicado}:null},
      criarResumoStrongCompartilhavel:async()=> 'salvo',atualizarResumoStrongCompartilhavel:async()=>{},publicarResumoTokenAutomatico:async()=>{},
    },
    strongEstudoAiService: {iaGeminiDisponivel:()=>true,
      gerarResumoLemmaStrongGemini:async()=>{chamadas.lemma++;return {ok:true,text:'Lemma novo'}},
      gerarResumoTokenStrongGemini:async()=>{chamadas.token++;return {ok:true,text:'Token novo'}},
    },
    conteudoLocalOffline:{estaSemRede:()=>false},firebase:{getFirebaseDatabase:()=>null},database:{},
  }
  const module={exports:{}}
  vm.runInNewContext(source, {module,exports:module.exports,sessionStorage:{getItem:k=>sessao.get(k),setItem:(k,v)=>sessao.set(k,v),removeItem:k=>sessao.delete(k)},
    require:name=>{const key=name.split('/').pop();if(!(key in mocks))throw Error(name);return mocks[key]}})
  return {resolver:(token=null,forcar=false)=>module.exports.resolverResumoLexicalInline({code:'G26',detalhe:{strong:'G26'},user:{uid:'u'},token,forcar}),chamadas}
}

async function main() {
  let checks=0
  let a=ambiente();assert.equal((await a.resolver()).lemmaText,'Lemma compartilhado');assert.equal(a.chamadas.lemma,0);checks++
  a=ambiente({local:'Lemma local',tokenPublicado:'Token compartilhado'})
  const token={text:'forma',versiculo:1}
  assert.equal((await a.resolver(token)).tokenText,'Token compartilhado');assert.equal(a.chamadas.token,0);checks++
  a=ambiente({falhaLemma:true});assert.equal((await a.resolver()).ok,false);assert.equal(a.chamadas.lemma,0);checks++
  a=ambiente({local:'Lemma local',falhaToken:true});assert.equal((await a.resolver(token)).tokenText,'');assert.equal(a.chamadas.token,0);checks++
  a=ambiente({publicado:''});await a.resolver(token);assert.equal(a.chamadas.lemma,1);assert.equal(a.chamadas.token,1);checks++
  await a.resolver(token);assert.equal(a.chamadas.lemma,1);assert.equal(a.chamadas.token,1);checks++
  await a.resolver({...token,versiculo:2});assert.equal(a.chamadas.lemma,1);assert.equal(a.chamadas.token,2);checks++
  const registros = new Map(Array.from({length:85},(_,i)=>[`strongResumo_G${i+1}`,{kind:'strongResumo',code:`G${i+1}`,resumo:'Estudo'}]))
  registros.set('strongResumoToken_G26_a',{kind:'strongResumoToken',code:'G26',resumo:'Token de G26'})
  registros.set('strongResumoToken_G260_a',{kind:'strongResumoToken',code:'G260',resumo:'Token de G260'})
  const pedidos = [], mod = {exports:{}}
  const dados = {
    ref:(_,path)=>path, orderByKey:()=>({tipo:'ordem'}), startAt:v=>({tipo:'inicio',v}),
    endAt:v=>({tipo:'fim',v}), limitToFirst:v=>({tipo:'limite',v}), query:(path,...ops)=>({path,ops}),
    get:async pedido=>{
      pedidos.push(pedido)
      const valor=tipo=>pedido.ops.find(o=>o.tipo===tipo).v
      const rows=[...registros].sort(([x],[y])=>x<y?-1:1)
        .filter(([key])=>key>=valor('inicio')&&key<=valor('fim')).slice(0,valor('limite'))
      return {forEach:cb=>rows.forEach(([key,v])=>cb({key,val:()=>v}))}
    },
  }
  const compartilhamento = transformSync(fs.readFileSync('src/services/strongResumoShareService.js','utf8'),{format:'cjs'}).code
  vm.runInNewContext(compartilhamento,{module:mod,exports:mod.exports,
    require:n=>n==='firebase/database'?dados:{getFirebaseDatabase:()=>({})}})
  const codigos=[];let apos=''
  do {
    const pagina=await mod.exports.listarResumosStrongGerados({apos})
    assert.ok(pagina.itens.length<=40);codigos.push(...pagina.itens.map(i=>i.code));apos=pagina.proximo
  } while(apos)
  assert.equal(codigos.length,85);assert.equal(new Set(codigos).size,85);checks++
  const tokenPage=await mod.exports.listarResumosStrongGerados({tokens:true,code:'G26'})
  assert.equal(tokenPage.itens.length,1);assert.equal(tokenPage.itens[0].code,'G26');checks++
  assert.ok(pedidos.every(p=>p.path==='bibliaEstudos'&&p.ops.some(o=>o.tipo==='limite')));checks++
  console.log(`Reaproveitamento Strong: ${checks}/${checks} cenários aprovados; nenhuma chamada real à IA ou ao Firebase.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
