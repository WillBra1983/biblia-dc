const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path')
const arquivo = path.resolve('functions/src/geminiProxy.js')
let respostaSemFontes = false, pedidoEnviado, pedidos = []
class HttpsError extends Error { constructor(code,message){super(message);this.code=code} }
const context = { exports:{}, __dirname:path.dirname(arquivo), AbortSignal, Date,
 require:nome=>{
  if(nome==='./firebaseAdmin') return {database:()=>({ref:()=>({get:async()=>({val:()=>false}),transaction:async()=>({committed:true})})})}
  if(nome==='firebase-functions/v2/https') return {onCall:(_,cb)=>cb,HttpsError}
  if(nome==='firebase-functions/params') return {defineSecret:()=>({value:()=> 'CHAVE-FICTICIA'})}
  if(nome==='firebase-functions/v2') return {logger:{info(){},warn(){},error(){}}}
  return require(nome.startsWith('.') ? path.resolve(path.dirname(arquivo),nome) : nome)
 },
 fetch:async(_,opts)=>{
  pedidoEnviado=JSON.parse(opts.body)
  pedidos.push(pedidoEnviado)
  return {ok:true,status:200,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'Resumo simulado.'}]},groundingMetadata:respostaSemFontes ? {} : {webSearchQueries:['palavra grega'],groundingChunks:[{web:{uri:'https://www.stepbible.org/teste'}},{web:{uri:'https://logeion.uchicago.edu/teste'}}],groundingSupports:[{segment:{text:'Afirmação com evidência.'},groundingChunkIndices:[0,1]}]}}]})}
 }
}
vm.runInNewContext(fs.readFileSync(arquivo,'utf8'),context)
const req={auth:{uid:'usuario'},data:{model:'gemini-2.5-flash',body:{pesquisaBiblicaObrigatoria:true,contents:[{role:'user',parts:[{text:'Explique o lema.'}]}]}}}
;(async()=>{
 const res=await context.exports.geminiGenerateContent(req)
 assert.equal(res.data.pesquisaBiblica.fontes.length,2)
 assert(pedidos[0].tools[0].url_context)
 assert.equal(pedidoEnviado.tools,undefined)
 assert(pedidoEnviado.systemInstruction.parts.at(-1).text.includes('Dossiê verificado'))
 assert.equal(pedidoEnviado.pesquisaBiblicaObrigatoria,undefined)
 respostaSemFontes=true
 await assert.rejects(context.exports.geminiGenerateContent(req),e=>e.code==='unavailable')
 await assert.rejects(context.exports.geminiGenerateContent({...req,auth:null}),e=>e.code==='unauthenticated')
 console.log('Strong: busca obrigatória no servidor, evidência verificada e falha sem pesquisa; nenhuma chamada real.')
})().catch(e=>{console.error(e);process.exitCode=1})
