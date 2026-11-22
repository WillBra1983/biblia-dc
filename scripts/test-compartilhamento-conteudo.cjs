const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const {transformSync}=require('esbuild')
process.env.GOMAXPROCS='1'
const cache=new Map(),navigator={clipboard:{writeText:async s=>{navigator.copiado=s}}}
function carregar(file){
  file=path.resolve(file)
  if(cache.has(file))return cache.get(file).exports
  if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'))
  const m={exports:{}};cache.set(file,m)
  const mocks={'@capacitor/core':{Capacitor:{isNativePlatform:()=>false}},'@capacitor/share':{Share:{}},'@capacitor/filesystem':{Directory:{Cache:'cache'},Filesystem:{}},qrcode:{}}
  vm.runInNewContext(transformSync(fs.readFileSync(file,'utf8'),{format:'cjs',define:{'import.meta.env':'{}'}}).code,{module:m,exports:m.exports,URL,URLSearchParams,Blob,File,navigator,require:n=>n in mocks?mocks[n]:n.startsWith('.')?carregar(path.resolve(path.dirname(file),n+(/\.(json|js)$/.test(n)?'':'.js'))):require(n)})
  return m.exports
}
async function main(){
  let grupos=0
  const api=carregar('src/utils/compartilhamentoConteudo.js')
  const converter=p=>new URL(api.normalizarLinkCompartilhamento('https://foundcine.com/biblia'+p))
  for(const [rota,tipo,id]of [
    ['/biblioteca','secao','livraria'],['/biblioteca/retrato-do-homem-piedoso','livro','retrato-do-homem-piedoso'],['/compartilhar/livro/penas-para-flechas.html?v=1234abcd','livro','penas-para-flechas'],
    ['/discipulado/2/3?parte=questao&numero=4','discipulado','2'],['/estudo-strong/G26/resumo?rid=abc','strong','G26'],['/versiculo-do-dia?data=2026-11-21','dia','2026-11-21'],
    ['/versiculos-compartilhados?item=-ABC123','versiculo','-ABC123'],['/hinario/salmos/23','cantico','23'],['/catecismo-maior?pergunta=1','doutrina','catecismo-maior'],
    ['/estudos-biblicos/abrir?estudo=-XYZ123&livro=43&capitulo=3&versiculos=16','estudo','-XYZ123'],['/estudos-biblicos/avaliacao-resultado?id=abc','avaliacao','abc'],
    ['/mais-de-deus?secao=assim-diz&tema=fe&item=justificacao','teologia','justificacao'],['/quiz-retiro','secao','quiz'],['/devocional?dia=12','devocional','12'],
    ['/biblioteca/retrato-do-homem-piedoso/amostra','livro','retrato-do-homem-piedoso'],['/estudos-biblicos/-XYZ123','estudo','-XYZ123'],
  ]){
    const u=converter(rota);assert.equal(u.origin,'https://us-central1-biblia-dc.cloudfunctions.net');assert.equal(u.searchParams.get('tipo'),tipo,rota);assert.equal(u.searchParams.get('id'),id,rota)
    assert.equal(api.normalizarLinkCompartilhamento(u.href),u.href);grupos++
  }
  const biblia=converter('/?livro=43&capitulo=3&versiculos=16,17&versao=naa')
  assert.equal(biblia.searchParams.get('tipo'),'biblia');assert.equal(biblia.searchParams.get('versao'),'naa');assert.equal(biblia.searchParams.get('versiculos'),'16,17');grupos++
  const pericope=converter('/estudos-biblicos/ia-pericope?livro=43&capitulo=3&inicio=16&fim=18&titulo=Privado')
  assert.equal(pericope.searchParams.get('tipo'),'explicacao');assert.equal(pericope.searchParams.get('modo'),'pericope');assert.equal(pericope.searchParams.get('versiculos'),'16,17,18');assert.equal(pericope.searchParams.has('titulo'),false);grupos++
  assert.equal(converter('/estudos-biblicos/ia-passagem?livro=43&capitulo=3&versiculos=16').searchParams.get('tipo'),'explicacao');grupos++
  for(const rota of ['/perfil?uid=segredo&token=segredo','/admin/usuarios?uid=segredo','/chat?user=segredo']){const u=converter(rota);assert.equal(u.searchParams.get('tipo'),'app');assert.ok(!u.href.includes('segredo'))}grupos++
  const externo='https://www.youtube.com/watch?v=abc';assert.equal(api.normalizarLinkCompartilhamento(externo),externo)
  assert.equal(api.normalizarLinkCompartilhamento('https://foundcine.com.evil.test/biblia/biblioteca'),'https://foundcine.com.evil.test/biblia/biblioteca');grupos++
  const corpus='Palavra e referência.\nhttps://foundcine.com/biblia/?livro=43&capitulo=3&versiculos=16\nhttps://foundcine.com/biblia/biblioteca.'
  const normal=api.normalizarTextoCompartilhamento(corpus);assert.ok(normal.startsWith('Palavra e referência.'));assert.ok(!normal.includes('foundcine.com'));assert.ok(normal.includes('tipo=biblia')&&normal.includes('id=livraria.'));grupos++
  for(const url of ['com.bibliadc.app://open/biblioteca','intent://open/biblioteca#Intent;scheme=com.bibliadc.app;package=com.bibliadc.app;end'])assert.equal(new URL(api.normalizarLinkCompartilhamento(url)).searchParams.get('id'),'livraria');grupos++
  const nativo=carregar('src/utils/nativeShare.js')
  const url='https://foundcine.com/biblia/biblioteca'
  const payload=nativo.montarPayloadShareNativo({title:'Livraria',text:'Conheça a livraria\n'+url,url})
  assert.ok(!payload.text.includes('foundcine'));assert.equal(payload.url,undefined);assert.ok(payload.text.includes('id=livraria'));grupos++
  const pagina=api.prepararCompartilhamentoConteudo({title:'Bíblia DC',text:'Acesse este conteúdo no Bíblia DC.',url})
  assert.ok(pagina.title.includes('Livraria Cristã'));assert.ok(pagina.text.includes('catálogo'));grupos++
  const livroApi=carregar('src/utils/livroShare.js'),livro=carregar('src/data/livrosCatalogo.js').livrosCatalogo.find(l=>l.id==='retrato-do-homem-piedoso')
  await livroApi.compartilharLivro(livro)
  assert.ok(navigator.copiado.includes(livro.titulo)&&navigator.copiado.includes(livro.autor)&&navigator.copiado.includes('tipo=livro&id=retrato-do-homem-piedoso'));grupos++
  assert.notEqual(livroApi.linkCompartilhamentoLivro(livro.id,livro),livroApi.linkCompartilhamentoLivro(livro.id,{...livro,capa:'https://example.test/nova-capa.png'}));grupos++
  let enviado;navigator.share=async p=>{enviado=p};navigator.canShare=()=>true
  const blob=new Blob(['imagem original'],{type:'image/png'}),trecho=carregar('src/utils/livroTrechoImagem.js')
  await trecho.compartilharImagemTrechoLivro([blob,blob],{titulo:livro.titulo,urlLivro:'https://foundcine.com/biblia/biblioteca/'+livro.id})
  assert.equal(enviado.files.length,2);assert.ok(enviado.text.includes('tipo=livro'));assert.equal(await enviado.files[0].text(),'imagem original');grupos++
  const verso=carregar('src/utils/versiculoImagem.js')
  await verso.compartilharArquivoImagem(blob,'João 3:16','https://foundcine.com/biblia/?livro=43&capitulo=3&versiculos=16','Porque Deus amou o mundo')
  assert.equal(enviado.files.length,1);assert.ok(enviado.text.includes('João 3:16')&&enviado.text.includes('tipo=biblia'));assert.equal(await enviado.files[0].text(),'imagem original');grupos++
  navigator.share=async()=>{const e=new Error('Cancelado');e.name='AbortError';throw e}
  assert.equal(await carregar('src/utils/compartilharOpcoes.js').compartilharNativo({text:'Teste',url}),true);grupos++
  const contexto=carregar('src/utils/compartilhamentoPagina.js')
  const limparAntigo=contexto.registrarCompartilhamentoPagina({pathname:'/hinario/letra/',title:'Hino 1',url:'hino1'})
  const limparAtual=contexto.registrarCompartilhamentoPagina({pathname:'/hinario/letra',title:'Hino 2',url:'hino2'})
  limparAntigo();assert.equal(contexto.obterCompartilhamentoPagina('/hinario/letra/').title,'Hino 2')
  assert.equal(contexto.obterCompartilhamentoPagina('/biblioteca'),null);limparAtual();assert.equal(contexto.obterCompartilhamentoPagina('/hinario/letra'),null);grupos++
  assert.equal(converter('/estudos-biblicos/prova-resultado?id=abc').searchParams.get('tipo'),'avaliacao');grupos++
  console.log(`Conteúdos compartilhados: ${grupos}/${grupos} grupos aprovados; destinos externos simulados e anexos preservados.`)
}
main().catch(e=>{console.error(e);process.exitCode=1})
