const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict')
const {createRequire}=require('node:module')
async function main(){
  let consultas=0,grupos=0,cliquesIos=0,erroIos=false,travarIos=false
  const livros={watson:{titulo:'O Retrato do Homem Piedoso',autor:'Thomas Watson',descricao:'As marcas da graça na vida cristã.',capa:'https://firebasestorage.googleapis.com/v0/b/publico/o/capa.webp?alt=media&token=publico',publicado:true,arquivos:{completo:{chave:'segredo-r2-privado'}}},secreto:{titulo:'NÃO PUBLICADO',autor:'Autor privado',capa:'https://example.test/secreto.png',publicado:false},excluido:{titulo:'EXCLUÍDO',excluido:true},aspas:{titulo:'Título " onmouseover="alert(1)',publicado:true}}
  livros['penas-para-flechas']={titulo:'Livro recolhido',publicado:false}
  const versiculos={'-post123':{referencia:'João 3:16',texto:'Porque Deus amou ao mundo',uid:'UID-PRIVADO'}}
  const canticos={publico:{titulo:'Louvor publicado',artista:'Autor',textoOriginal:'LETRA-PRIVADA',authorUid:'UID-PRIVADO'},privado:{titulo:'CANTO-PRIVADO',localPrivado:true}}
  const destaques={mensagem:{titulo:'Uma palavra de esperança',texto:'Permaneça na Palavra.',autor:'Autor',ativo:true,uid:'UID-PRIVADO'},futuro:{titulo:'FUTURO-PRIVADO',inicioEm:Date.now()+86400000},expirado:{titulo:'EXPIRADO-PRIVADO',fimEm:Date.now()-1000},livro:{livroId:'watson'},recolhido:{livroId:'secreto'}}
  let indisponivel=false
  const capaPng=fs.readFileSync('public/icons/icon-512.png')
  const api={},requireFuncao=createRequire(path.resolve('functions/src/conviteAplicativo.js'))
  function dependencias(n){
    if(n==='firebase-functions/v2/https')return {onRequest:(_,f)=>f}
    if(n==='./compartilhamentoImagens')return {carregarCapaPng:async()=>capaPng}
    if(n==='./projetoCliqueIos')return {registrarCliqueIos:async()=>{cliquesIos++;if(travarIos)return new Promise(()=>{});if(erroIos)throw Error('Indisponível');return {contabilizada:true}}}
    if(n==='./firebaseAdmin')return {database:()=>({ref:p=>({get:async()=>{
      assert.ok(/^(bibliotecaLivros|versiculosCompartilhadosPublicos|canticosCompartilhados|destaquesMenu)\//.test(p),'Somente metadados públicos')
      if(indisponivel)throw Error('Indisponível')
      consultas++
      const fonte=p.startsWith('versiculosCompartilhadosPublicos/')?versiculos:p.startsWith('canticosCompartilhados/')?canticos:p.startsWith('destaquesMenu/')?destaques:livros
      return {val:()=>fonte[p.split('/').at(-1)]||null}
    }})})}
    return requireFuncao(n)
  }
  vm.runInNewContext(fs.readFileSync('functions/src/conviteAplicativo.js','utf8'),{exports:api,URL,URLSearchParams,setTimeout,clearTimeout,__dirname:path.resolve('functions/src'),require:dependencias})
  async function abrir(ua,query={},method='GET',headers={}){
    const r={headers:{},code:200,body:'',destino:'',set(k,v){this.headers[k]=v;return this},status(c){this.code=c;return this},type(t){this.tipo=t;return this},send(b){this.body=b;return this},sendFile(f){this.arquivo=f;return this},redirect(c,d){this.code=c;this.destino=d;return this}}
    await api.baixarBiblia({method,query,get:n=>n==='user-agent'?ua:headers[n]||''},r);return r
  }
  const meta=(html,key)=>html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`))?.[1].replaceAll('&amp;','&').replaceAll('&quot;','"')
  const download='https://us-central1-biblia-dc.cloudfunctions.net/baixarBiblia',play='https://play.google.com/store/apps/details?id=com.bibliadc.app',apple='https://apps.apple.com/br/app/biblia-do-discipulo-cristao/id6772898342',codigo='a'.repeat(32)
  const android=await abrir('Android',{convite:codigo}),ref=new URLSearchParams(new URL(android.destino).searchParams.get('referrer'))
  assert.equal(android.code,302);assert.equal(ref.get('convite'),codigo);assert.equal(android.body,'');grupos++
  for(const ua of ['iPhone','iPad','iPod'])assert.equal((await abrir(ua,{tipo:'livro',id:'watson'})).destino,apple)
  assert.equal(consultas,0,'O clique no celular não aguarda o banco');grupos++
  const desktop=await abrir('Windows',{convite:codigo})
  assert.equal(desktop.code,200);assert.ok(!/foundcine|<iframe|id="root"/i.test(desktop.body));assert.ok(desktop.body.includes('Baixar na Google Play'));grupos++
  const script=desktop.body.match(/<script nonce="[a-f0-9]+">([\s\S]*?)<\/script>/)[1]
  for(const [ua,touch,esperado] of [['Macintosh',5,download+'?convite='+codigo+'&ios=1'],['Macintosh',0,''],['WhatsApp Android',5,android.destino]]){let destino='';vm.runInNewContext(script,{navigator:{userAgent:ua,maxTouchPoints:touch},location:{replace:u=>{destino=u}}});assert.equal(destino,esperado)}grupos++
  for(const r of [android,desktop]){assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(r.headers.Vary,'User-Agent');assert.equal(r.headers['Referrer-Policy'],'no-referrer')}
  assert.ok(desktop.headers['Content-Security-Policy'].includes(`'nonce-${desktop.body.match(/<script nonce="([a-f0-9]+)"/)[1]}'`));grupos++
  for(const ua of ['WhatsApp/2 A','WhatsApp Android','facebookexternalhit/1.1','TelegramBot','Twitterbot']){const r=await abrir(ua,{convite:codigo});assert.equal(r.code,200);assert.equal(meta(r.body,'og:title'),'Bíblia do Discípulo Cristão');assert.equal(meta(r.body,'og:url'),download+'?convite='+codigo);assert.equal(meta(r.body,'og:image'),download+'?imagem=logo');assert.ok(meta(r.body,'og:description').includes('gratuito'))}grupos++
  const logo=await abrir('WhatsApp',{imagem:'logo'}),png=fs.readFileSync(logo.arquivo)
  assert.deepEqual(png,fs.readFileSync('public/icons/icon-512.png'));assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);grupos++
  assert.ok(meta((await abrir('WhatsApp',{tipo:'secao',id:'livraria'})).body,'og:title').startsWith('Livraria Cristã'))
  const secoes=require('../functions/src/compartilhamentoSecoes.json')
  for(const [id,s]of Object.entries(secoes)){const r=await abrir('WhatsApp',{imagem:'secao',id});assert.equal(r.tipo,'png');assert.ok(r.arquivo.endsWith(s.imagem.replace(/\.[^.]+$/,'.png')));assert.ok(fs.readFileSync(r.arquivo).subarray(0,8).equals(capaPng.subarray(0,8)))}grupos++
  const livro=await abrir('WhatsApp',{tipo:'livro',id:'watson'})
  assert.equal(meta(livro.body,'og:title'),'O Retrato do Homem Piedoso — Thomas Watson');assert.ok(meta(livro.body,'og:description').includes('marcas da graça'));assert.ok(meta(livro.body,'og:image').includes('imagem=capa&id=watson'));assert.ok(!livro.body.includes('segredo-r2-privado'))
  const capa=await abrir('WhatsApp',{imagem:'capa',id:'watson'});assert.equal(capa.tipo,'png');assert.ok(capa.body.equals(capaPng));assert.equal(consultas,1);grupos++
  for(const id of ['secreto','excluido','inexistente','penas-para-flechas']){const r=await abrir('WhatsApp',{tipo:'livro',id});assert.ok(meta(r.body,'og:title').startsWith('Livraria Cristã'));assert.ok(!/NÃO PUBLICADO|EXCLUÍDO|Autor privado|example.test|Penas para Flechas/.test(r.body));assert.ok((await abrir('WhatsApp',{imagem:'capa',id})).arquivo.endsWith('biblia-logo.png'))}grupos++
  const aspas=await abrir('WhatsApp',{tipo:'livro',id:'aspas'});assert.ok(aspas.body.includes('&quot; onmouseover=&quot;'));assert.ok(!aspas.body.includes('content="Título " onmouseover='));grupos++
  for(const [dados,titulo]of [[{tipo:'biblia',livro:'43',capitulo:'3',versiculos:'16',versao:'naa'},'João 3:16 (NAA)'],[{tipo:'strong',id:'G26'},'Strong G26'],[{tipo:'discipulado',id:'2',licao:'3',parte:'questao',numero:'4'},'questão 4'],[{tipo:'dia',id:'2026-11-21'},'21/11/2026'],[{tipo:'cantico',grupo:'salmos',id:'23'},'Salmo 23'],[{tipo:'doutrina',id:'catecismo-maior',pergunta:'1'},'pergunta 1']])assert.ok(meta((await abrir('WhatsApp',dados)).body,'og:title').includes(titulo));grupos++
  const especifico=await abrir('Android',{tipo:'livro',id:'watson',convite:codigo}),referencia=new URLSearchParams(new URL(especifico.destino).searchParams.get('referrer'));assert.equal(referencia.get('id'),'watson');assert.equal(referencia.get('tipo'),'livro');assert.equal(referencia.get('convite'),codigo);grupos++
  assert.equal((await abrir('Android',{url:'https://evil.test',convite:'<script>'})).destino,play);assert.equal((await abrir('Android',{},'POST')).code,405);assert.equal((await abrir('Android',{},'HEAD')).code,302)
  assert.ok((await abrir('WhatsApp',{imagem:'secao',id:'__proto__'})).arquivo.endsWith('biblia-logo.png'));assert.equal(meta((await abrir('WhatsApp',{tipo:'secao',id:'constructor'})).body,'og:title'),'Bíblia do Discípulo Cristão');grupos++
  const local=await abrir('WhatsApp',{tipo:'livro',id:'retrato-do-homem-piedoso'})
  assert.ok(meta(local.body,'og:title').includes('Thomas Watson'))
  const capaLocal=await abrir('WhatsApp',{imagem:'capa',id:'retrato-do-homem-piedoso'})
  assert.ok(capaLocal.arquivo.endsWith('retrato-do-homem-piedoso.png'));assert.ok(fs.existsSync(capaLocal.arquivo));grupos++
  const mural=await abrir('WhatsApp',{tipo:'versiculo',id:'-post123'})
  assert.ok(meta(mural.body,'og:title').includes('João 3:16'));assert.ok(meta(mural.body,'og:description').includes('Porque Deus'));assert.ok(!mural.body.includes('UID-PRIVADO'));grupos++
  for(const [dados,titulo] of [[{tipo:'explicacao',livro:'43',capitulo:'3',versiculos:'16',modo:'passagem'},'Versículos explicados'],[{tipo:'teologia',id:'justificacao'},'justificacao'],[{tipo:'avaliacao',id:'abc'},'avaliação bíblica'],[{tipo:'devocional',id:'12'},'Dia 68: Quando Filhos Imaturos Dividem a Família']])assert.ok(meta((await abrir('WhatsApp',dados)).body,'og:title').includes(titulo))
  assert.equal((await abrir('WhatsApp',{tipo:'biblia',livro:'43',capitulo:'3',versiculos:['16','17']})).code,200);grupos++
  indisponivel=true
  assert.ok(meta((await abrir('WhatsApp',{tipo:'livro',id:'luz-dos-tempos-antigos'})).body,'og:title').startsWith('Livraria Cristã'))
  indisponivel=false;grupos++
  const hino=await abrir('WhatsApp',{tipo:'cantico',grupo:'letra',id:'1'})
  assert.ok(meta(hino.body,'og:title').includes('Doxologia'));grupos++
  const canto=await abrir('WhatsApp',{tipo:'cantico',grupo:'outras-cancoes',id:'publico'})
  assert.ok(meta(canto.body,'og:title').includes('Louvor publicado'));assert.ok(!/LETRA-PRIVADA|UID-PRIVADO/.test(canto.body))
  assert.ok(!(await abrir('WhatsApp',{tipo:'cantico',grupo:'outras-cancoes',id:'privado'})).body.includes('CANTO-PRIVADO'));grupos++
  const mensagem=await abrir('WhatsApp',{tipo:'destaque',id:'mensagem'})
  assert.ok(meta(mensagem.body,'og:title').includes('Uma palavra de esperança'));assert.ok(meta(mensagem.body,'og:description').includes('Permaneça'));assert.ok(!mensagem.body.includes('UID-PRIVADO'))
  for(const id of ['futuro','expirado']) assert.ok(!(await abrir('WhatsApp',{tipo:'destaque',id})).body.includes('PRIVADO'))
  assert.ok(meta((await abrir('WhatsApp',{tipo:'destaque',id:'livro'})).body,'og:title').includes('Thomas Watson'))
  assert.ok(!(await abrir('WhatsApp',{tipo:'destaque',id:'recolhido'})).body.includes('NÃO PUBLICADO'));grupos++
  const entradaIos=await abrir('iPhone',{convite:codigo})
  assert.equal(cliquesIos,0);assert.ok(entradaIos.destino.startsWith(download))
  const cookie=entradaIos.headers['Set-Cookie'].split(';')[0],retorno=Object.fromEntries(new URL(entradaIos.destino).searchParams)
  assert.ok(/HttpOnly; Secure; SameSite=Lax/.test(entradaIos.headers['Set-Cookie']))
  assert.equal((await abrir('iPhone',retorno,'GET',{cookie})).destino,apple);assert.equal(cliquesIos,1);grupos++
  for(const [ua,method,headers] of [['iPhone','HEAD',{cookie}],['iPhone','GET',{cookie,purpose:'prefetch'}],['iPhone','GET',{cookie,'sec-purpose':'prefetch;prerender'}],['WhatsApp iPhone','GET',{cookie}],['facebookexternalhit iPhone','GET',{cookie}],['Android','GET',{cookie}]]) await abrir(ua,{convite:codigo},method,headers)
  assert.equal(cliquesIos,1);grupos++
  assert.equal((await abrir('iPhone',retorno)).destino,apple,'Cookies bloqueados não causam loop nem somam')
  assert.equal(cliquesIos,1);grupos++
  const ipad=await abrir('Macintosh',{convite:codigo,ios:'1'})
  assert.ok(ipad.headers['Set-Cookie']);assert.equal((await abrir('Macintosh',Object.fromEntries(new URL(ipad.destino).searchParams),'GET',{cookie})).destino,apple)
  assert.equal(cliquesIos,2);grupos++
  assert.equal((await abrir('Mozilla/5.0 (iPhone) AppleWebKit Safari WhatsApp/2.0',{convite:codigo},'GET',{cookie})).destino,apple)
  assert.equal(cliquesIos,3,'Navegador dentro do mensageiro não é confundido com robô de prévia');grupos++
  erroIos=true;assert.equal((await abrir('iPhone',{convite:codigo},'GET',{cookie})).destino,apple);grupos++
  travarIos=true
  const inicioEspera=Date.now();assert.equal((await abrir('iPhone',{convite:codigo},'GET',{cookie})).destino,apple)
  assert.ok(Date.now()-inicioEspera<6000,'Registro indisponível não deixa o redirecionamento aguardando indefinidamente');grupos++
  console.log(`Convites e prévias: ${grupos}/${grupos} grupos aprovados; rede, bancos e aparelhos simulados.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
