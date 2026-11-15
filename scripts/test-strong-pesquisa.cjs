const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path')
const { performance } = require('node:perf_hooks')
const inicio = performance.now(), arquivo = path.resolve('functions/src/geminiProxy.js')
const cache = new Map(), pedidos = []
let respostaSemFontes = false
class HttpsError extends Error { constructor(code,message,details){super(message);this.code=code;this.details=details} }
const context = { exports:{}, __dirname:path.dirname(arquivo), AbortSignal, Date,
 require:nome=>{
  if(nome==='./firebaseAdmin') return {database:Object.assign(()=>({ref:p=>({get:async()=>({val:()=>cache.get(p)||false}),set:async v=>cache.set(p,v),transaction:async()=>({committed:true})})}),{ServerValue:{TIMESTAMP:1}})}
  if(nome==='firebase-functions/v2/https') return {onCall:(_,cb)=>cb,HttpsError}
  if(nome==='firebase-functions/params') return {defineSecret:()=>({value:()=> 'CHAVE-FICTICIA'})}
  if(nome==='firebase-functions/v2') return {logger:{info(){},warn(){},error(){}}}
  return require(nome.startsWith('.') ? path.resolve(path.dirname(arquivo),nome) : nome)
 },
 fetch:async(_,opts)=>{
  const pedido=JSON.parse(opts.body);pedidos.push(pedido)
  const urls=['https://www.blueletterbible.org/lexicon/h6949/kjv/wlc/0-1/','https://biblehub.com/hebrew/6949.htm']
  const candidato={finishReason:'STOP',content:{parts:[{text:pedido.tools ? 'H6949: verbete lexical e ocorrências. '+urls.join(' ') : 'Resumo simulado.'}]}}
  if(pedido.tools && !respostaSemFontes)candidato.urlContextMetadata={urlMetadata:urls.map(retrievedUrl=>({retrievedUrl,urlRetrievalStatus:'URL_RETRIEVAL_STATUS_SUCCESS'}))}
  return {ok:true,status:200,json:async()=>({candidates:[candidato]})}
 }
}
vm.runInNewContext(fs.readFileSync(arquivo,'utf8'),context)
const req={auth:{uid:'usuario'},data:{model:'gemini-2.5-flash',body:{pesquisaBiblicaObrigatoria:true,contents:[{role:'user',parts:[{text:'Código Strong: H6949'}]}]}}}
;(async()=>{
 const res=await context.exports.geminiGenerateContent(req)
 assert.equal(res.data.pesquisaBiblica.fontes.length,2)
 assert(pedidos[0].tools[0].url_context)
 assert.equal(pedidos.at(-1).tools,undefined)
 assert(pedidos.at(-1).systemInstruction.parts.at(-1).text.includes('Dossiê verificado'))
 assert.equal(pedidos.at(-1).pesquisaBiblicaObrigatoria,undefined)
 const antes=pedidos.length
 await context.exports.geminiGenerateContent(req)
 assert.equal(pedidos.length,antes+1,'Cache dispensa pesquisa, apenas uma redação')
 respostaSemFontes=true
 await assert.rejects(context.exports.geminiGenerateContent({...req,data:{...req.data,body:{...req.data.body,contents:[{role:'user',parts:[{text:'Código Strong: H6948'}]}]}}}),e=>e.code==='unavailable' && e.details.etapa==='pesquisa')
 assert.equal(pedidos.length,antes+3,'Falha faz duas pesquisas e nenhuma redação')
 await assert.rejects(context.exports.geminiGenerateContent({...req,auth:null}),e=>e.code==='unauthenticated')
 console.log('Proxy Strong: fluxo, cache, bloqueio sem evidência e autenticação aprovados (100%); falhas: 0%; tempo: '+((performance.now()-inicio)/1000).toFixed(2)+' s. Nenhuma chamada real.')
})().catch(e=>{console.error(e);process.exitCode=1})
