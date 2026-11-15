const assert = require('node:assert/strict')
const { performance } = require('node:perf_hooks')
const { alvoPesquisa, paginasPesquisa, promptPesquisa, chavePesquisa } = require('../functions/src/pesquisaStrongPlano')
const { extrairPesquisa, fontePertinente } = require('../functions/src/pesquisaBiblica')
const { obterPesquisaStrong } = require('../functions/src/strongPesquisaService')
const inicio = performance.now(), logger = {warn(){}}
let grupos = 0
async function teste(nome, fn) { await fn(); grupos++; console.log('OK: ' + nome) }
const body = (codigo, extra='') => ({contents:[{role:'user',parts:[{text:`Código Strong: ${codigo}\nForma original (Unicode): קהה\n${extra}`}]}]})
function candidato(codigo, direto=false) {
  const h = codigo.startsWith('H'), n=Number(codigo.slice(1))
  const urls=[`https://www.blueletterbible.org/lexicon/${codigo.toLowerCase()}/kjv/${h?'wlc':'tr'}/0-1/`,`https://biblehub.com/${h?'hebrew':'greek'}/${n}.htm`]
  const texto = `${codigo}: significado lexical documentado, formas e ocorrências. ` + urls.join(' ') + ' Obras compartilhadas nos dois sites são identificadas, não contadas como léxicos independentes.'
  return {finishReason:'STOP',content:{parts:[{text:texto}]},...(direto ? {urlContextMetadata:{urlMetadata:urls.map(retrievedUrl=>({retrievedUrl,urlRetrievalStatus:'URL_RETRIEVAL_STATUS_SUCCESS'}))}} : {groundingMetadata:{webSearchQueries:[codigo],groundingChunks:urls.map(uri=>({web:{uri}})),groundingSupports:[{segment:{text:`${codigo}: dado lexical e ocorrências.`},groundingChunkIndices:[0,1]}]}})}
}
const resposta = c => ({ok:true,status:200,json:async()=>({candidates:[c]})})
const vazio = {finishReason:'STOP',content:{parts:[{text:'Resposta sem confirmação de leitura.'}]}}
async function run() {
  await teste('H6949 recebe verbetes específicos, WLC hebraico e catálogo completo, sem README',()=>{
    const alvo=alvoPesquisa(JSON.stringify(body('H6949').contents))
    assert.deepEqual(alvo.codigos,['H6949'])
    const paginas=paginasPesquisa(alvo)
    assert.equal(paginas.length,3)
    assert.ok(paginas[0].includes('/wlc/'))
    assert.ok(paginas[1].includes('/hebrew/6949.htm'))
    assert.ok(!promptPesquisa(JSON.stringify(body('H6949').contents)).includes('README.md'))
    assert.ok(promptPesquisa('H6949','busca').includes('Google Search'))
    assert.ok(promptPesquisa('H6949','busca').includes('Perseus'))
  })
  await teste('Grego usa TR e não confunde derivações citadas com o lema solicitado',()=>{
    const alvo=alvoPesquisa(JSON.stringify(body('G1492','Derivação: G3700, G3708').contents))
    assert.deepEqual(alvo.codigos,['G1492'])
    assert.ok(paginasPesquisa(alvo)[0].includes('/tr/'))
  })
  await teste('Rejeita README, código diferente e duas páginas do mesmo site',async()=>{
    const alvo={codigos:['H6949'],lema:'קהה'}
    assert.equal(fontePertinente('https://github.com/openscriptures/morphhb/blob/master/README.md','H6949',alvo),false)
    assert.equal(fontePertinente('https://biblehub.com/hebrew/6948.htm','H6949',alvo),false)
    await assert.rejects(extrairPesquisa({...candidato('H6949'),groundingMetadata:{groundingChunks:[{web:{uri:'https://biblehub.com/hebrew/6949.htm'}},{web:{uri:'https://biblehub.com/hebrew/6949.htm?x=2'}}],groundingSupports:[{segment:{text:'H6949'},groundingChunkIndices:[0,1]}]}},undefined,alvo))
    assert.equal((await extrairPesquisa(candidato('H6949'),undefined,alvo)).fontes.length,2)
  })
  await teste('Leitura direta falha; busca alternativa recupera evidências sem gerar o resumo',async()=>{
    const pedidos=[], cache=new Map()
    const resultado=await obterPesquisaStrong({body:body('H6949','fallback'),logger,lerCache:async k=>cache.get(k),gravarCache:async(k,v)=>cache.set(k,v),chamar:async p=>{pedidos.push(p);return resposta(p.tools[0].url_context?vazio:candidato('H6949'))}})
    assert.equal(pedidos.length,2)
    assert.ok(pedidos[0].tools[0].url_context)
    assert.ok(pedidos[1].tools[0].google_search)
    assert.equal(resultado.metodo,'busca')
    const reutilizado=await obterPesquisaStrong({body:body('H6949','fallback'),logger,lerCache:async k=>cache.get(k),gravarCache:async()=>{},chamar:async()=>{throw Error('Não pode pagar novamente')}})
    assert.equal(reutilizado.reutilizada,true)
  })
  await teste('Cache diferencia passagem e forma; registros vencidos são refeitos',async()=>{
    assert.notEqual(chavePesquisa(body('H6949','Ez 18:2').contents),chavePesquisa(body('H6949','Ec 10:10').contents))
    let chamadas=0
    await obterPesquisaStrong({body:body('G907','cache vencido'),logger,lerCache:async()=>({versao:3,expiraEm:0,dossie:{}}),gravarCache:async()=>{},chamar:async()=>{chamadas++;return resposta(candidato('G907',true))}})
    assert.equal(chamadas,1)
  })
  await teste('Duas solicitações concorrentes compartilham a pesquisa em andamento',async()=>{
    let chamadas=0
    const opcoes={body:body('G3056','concorrente'),logger,lerCache:async()=>null,gravarCache:async()=>{},chamar:async()=>{chamadas++;await new Promise(r=>setTimeout(r,10));return resposta(candidato('G3056',true))}}
    await Promise.all([obterPesquisaStrong(opcoes),obterPesquisaStrong(opcoes)])
    assert.equal(chamadas,1)
  })
  await teste('Falha total para em duas tentativas; clique repetido imediato não paga mais pesquisa',async()=>{
    let chamadas=0
    const opcoes={body:body('H9999','insuficiente'),logger,lerCache:async()=>null,gravarCache:async()=>{},chamar:async()=>{chamadas++;return resposta(vazio)}}
    await assert.rejects(obterPesquisaStrong(opcoes))
    await assert.rejects(obterPesquisaStrong(opcoes))
    assert.equal(chamadas,2)
  })
  await teste('Cota esgotada interrompe a pesquisa sem repetir chamadas pagas',async()=>{
    let chamadas=0
    await assert.rejects(obterPesquisaStrong({body:body('H1234','cota'),logger,lerCache:async()=>null,gravarCache:async()=>{},chamar:async()=>{chamadas++;return {ok:false,status:429}}}),e=>e.code==='COTA_PESQUISA')
    assert.equal(chamadas,1)
  })
  console.log(`${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s. Nenhuma chamada real à IA.`)
}
run().catch(e=>{console.error(e);process.exitCode=1})
