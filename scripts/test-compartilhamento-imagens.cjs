const assert=require('node:assert/strict'),fs=require('node:fs'),sharp=require('sharp')
const {criarCarregadorCapas}=require('../functions/src/compartilhamentoImagens')
sharp.concurrency(1)
async function main(){
  let grupos=0
  const png=fs.readFileSync('public/icons/icon-512.png'),url='https://firebasestorage.googleapis.com/v0/b/test/o/capa?alt=media'
  let buscas=0,sinal
  const carregar=criarCarregadorCapas({buscar:async(u,opcoes)=>{assert.equal(u,url);assert.equal(opcoes.redirect,'error');sinal=opcoes.signal;buscas++;return new Response(png,{headers:{'content-type':'image/png'}})}})
  const [a,b]=await Promise.all([carregar(url),carregar(url)])
  assert.equal(buscas,1);assert.ok(a.equals(b));assert.equal(sinal.aborted,true);grupos++
  const meta=await sharp(a).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,512);assert.equal(meta.height,512)
  assert.ok((await sharp(a).raw().toBuffer()).equals(await sharp(png).raw().toBuffer()));grupos++
  let proibidas=0
  const seguro=criarCarregadorCapas({buscar:async()=>{proibidas++;throw Error('Não deveria buscar')}})
  for(const invalido of ['http://firebasestorage.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://169.254.169.254/x','https://firebasestorage.googleapis.com.evil.test/x','https://usuario:senha@firebasestorage.googleapis.com/x','https://storage.googleapis.com:8443/x','file:///etc/passwd'])assert.equal(await seguro(invalido),null)
  assert.equal(proibidas,0);grupos++
  for(const [corpo,headers,status]of [[png,{'content-type':'image/png'},404],[png,{'content-type':'text/html'},200],[png,{'content-type':'image/png','content-length':String(5*1024*1024)},200],[Buffer.from('<svg onload="alert(1)"/>'),{'content-type':'image/png'},200]]){
    let conversoes=0
    const imagem=criarCarregadorCapas({buscar:async()=>new Response(corpo,{status,headers}),converter:async()=>{conversoes++;return png}})
    assert.equal(await imagem(url),null);assert.equal(conversoes,0)
  }
  grupos++
  let conversoes=0
  const grande=criarCarregadorCapas({buscar:async()=>new Response(Buffer.alloc(4*1024*1024+1),{headers:{'content-type':'image/png'}}),converter:async()=>{conversoes++;return png}})
  assert.equal(await grande(url),null);assert.equal(conversoes,0);grupos++
  const excessoPixels=await sharp({create:{width:2500,height:2500,channels:3,background:'#fff'}}).png().toBuffer()
  assert.equal(await criarCarregadorCapas({buscar:async()=>new Response(excessoPixels,{headers:{'content-type':'image/png'}})})(url),null);grupos++
  for(const formato of ['jpeg','webp']){
    const original=await sharp(png)[formato]().toBuffer()
    const imagem=await criarCarregadorCapas({buscar:async()=>new Response(original,{headers:{'content-type':'image/'+formato}})})(url)
    assert.equal((await sharp(imagem).metadata()).format,'png')
    assert.equal((await sharp(imagem).metadata()).width,512)
  }
  grupos++
  let requests=0
  const limitado=criarCarregadorCapas({buscar:async()=>{requests++;return new Response(png,{headers:{'content-type':'image/png'}})},converter:async()=>png})
  for(let i=0;i<5;i++)await limitado(url+'&v='+i)
  await limitado(url+'&v=0');assert.equal(requests,6);grupos++
  assert.equal(await criarCarregadorCapas({buscar:async()=>{throw Error('Rede indisponível')}})(url),null)
  assert.equal(await criarCarregadorCapas({buscar:async()=>new Response(png,{headers:{'content-type':'image/png'}}),converter:async()=>{throw Error('Arquivo inválido')}})(url),null);grupos++
  console.log(`Imagens de compartilhamento: ${grupos}/${grupos} grupos aprovados; conversão real, rede simulada.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
