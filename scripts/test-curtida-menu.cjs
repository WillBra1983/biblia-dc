const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
const item = { data:'2026-11-14', texto:'Versículo', referencia:'Jo 3:16' }
let uid = 'leitor', publicUpdate, ownUpdate, paradas = 0, cursor = 0, efeitosNovos = [], redirecionou = false
const estados = [], efeitos = []
const react = {
  useState(initial) { const n=cursor++; if (!(n in estados)) estados[n]=n===0?item:initial; return [estados[n],value=>{estados[n]=typeof value==='function'?value(estados[n]):value}] },
  useEffect(fn,deps) { const n=cursor++, anterior=efeitos[n]; if (!anterior || deps.some((d,i)=>d!==anterior.deps[i])) efeitosNovos.push(()=>{anterior?.limpar?.();efeitos[n]={deps,limpar:fn()}}) }
}
const generico = new Proxy({__esModule:true},{get:(_,key)=>key==='__esModule'?true:()=>null})
const code = transformSync(fs.readFileSync('src/components/MenuCards.jsx','utf8')+'\nexport { VersiculoDoDiaMenu }',{loader:'jsx',jsx:'automatic',format:'cjs'}).code
const mod={exports:{}}
vm.runInNewContext(code,{console,module:mod,exports:mod.exports,require(name){
  if(name==='react')return react
  if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}
  if(name==='@mui/material')return new Proxy({},{get:(_,key)=>key})
  if(name.includes('FirebaseAuthContext'))return {useFirebaseAuth:()=>({user:uid?{uid}:null})}
  if(name.includes('versiculoDoDiaService'))return {obterVersiculoDoDia:async()=>item,abrirVersiculoDoDia:async()=>item,linkPaginaVersiculoDoDia:()=>'/versiculo-do-dia'}
  if(name.includes('versiculosCompartilhadosService'))return {
    assinarDestaqueVersiculoDoDia:async(_,cb)=>{publicUpdate=cb;return ()=>{paradas++}},
    assinarCurtidaDoUsuario:async(usuario,id,cb)=>{assert.equal(usuario,uid);assert.equal(id,'versiculo-dia-2026-11-14');ownUpdate=cb;return ()=>{paradas++}},
    alternarCurtida:async()=>true
  }
  return generico
}})
function render(){cursor=0;efeitosNovos=[];const tree=mod.exports.VersiculoDoDiaMenu({onNavigate:()=>{redirecionou=true}});for(const f of efeitosNovos)f();return tree}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result}return null}
const botao = tree=>find(tree,n=>n.type==='IconButton' && typeof n.props['aria-pressed']==='boolean')
const contador = tree=>find(botao(tree),n=>n.type==='Box' && n.props.component==='span')?.props.children
;(async()=>{
  render();await new Promise(r=>setImmediate(r))
  assert.equal(contador(render()),undefined,'Zero oculto')
  publicUpdate({likesCount:7});assert.equal(contador(render()),7,'Total aparece para o leitor')
  ownUpdate(true);assert.equal(botao(render()).props['aria-pressed'],true,'Curtida feita fora do menu preenche coração')
  ownUpdate(false);assert.equal(botao(render()).props['aria-pressed'],false,'Remoção feita fora do menu esvazia coração')
  publicUpdate({likesCount:8});assert.equal(contador(render()),8,'Contagem acompanha outras curtidas')
  let propagou=false;await botao(render()).props.onClick({stopPropagation(){propagou=true}})
  assert.equal(propagou,true);assert.equal(redirecionou,false,'Curtir não abre a explicação')
  uid=null;render();assert.equal(botao(render()).props.disabled,true,'Visitante não pode curtir')
  for(const e of efeitos)e?.limpar?.()
  await new Promise(r=>setImmediate(r))
  assert.ok(paradas>=3,'Listeners encerrados ao sair ou trocar usuário')
  console.log('8/8 cenários aprovados (100%); falhas: 0%; tempo: '+((performance.now()-inicio)/1000).toFixed(2)+' s. Contador e sincronização reativa verificados.')
})().catch(e=>{console.error(e);process.exitCode=1})
