import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'
import * as uso from '../src/utils/menuMaisVistos.js'
const inicio = performance.now(), persistidos = new Map()
globalThis.localStorage = { getItem: key => persistidos.get(key) || null, setItem: (key, value) => persistidos.set(key, value) }
let grupos = 0
function teste(nome, fn) { fn(); grupos++; console.log('OK: ' + nome) }
const visitar = (uid, path, vezes) => { for (let n=0; n<vezes; n++) uso.registrarUsoMaisVistos(path, uid) }
const listar = uid => uso.selecionarMaisVistos(uso.lerSnapshotMaisVistos(uid))

teste('Só aparece depois de três visitas, sem quadros vazios', () => {
  assert.deepEqual(listar('limiar'), [])
  visitar('limiar', '/biblia', 2); assert.deepEqual(listar('limiar'), [])
  visitar('limiar', '/biblia', 1); assert.deepEqual(listar('limiar'), ['/biblia'])
})
teste('Preenche progressivamente e mantém no máximo quatro opções', () => {
  const paths = ['/biblia','/discipulado','/devocional','/biblioteca','/quiz-retiro']
  paths.forEach((p,n) => { visitar('quatro',p,7-n); assert.equal(listar('quatro').length, Math.min(n+1,4)) })
  assert.deepEqual(listar('quatro'), paths.slice(0,4))
  visitar('quatro', '/quiz-retiro', 3)
  assert.ok(listar('quatro').includes('/quiz-retiro'))
  assert.ok(!listar('quatro').includes('/biblioteca'))
})
teste('A opção que passa a ser mais usada assume a primeira posição', () => {
  visitar('ordem','/biblia',4); visitar('ordem','/devocional',3)
  assert.equal(listar('ordem')[0],'/biblia')
  visitar('ordem','/devocional',2); assert.equal(listar('ordem')[0],'/devocional')
})
teste('Empates favorecem o uso mais recente', () => {
  visitar('empate','/biblia',3); visitar('empate','/devocional',3)
  assert.deepEqual(listar('empate'),['/devocional','/biblia'])
})
teste('Históricos separados por conta e visitante', () => {
  visitar('conta-a','/biblia',3); visitar('conta-b','/biblioteca',3); visitar(null,'/quiz-retiro',3)
  assert.deepEqual(listar('conta-a'),['/biblia'])
  assert.deepEqual(listar('conta-b'),['/biblioteca'])
  assert.deepEqual(listar(null),['/quiz-retiro'])
})
teste('Renderizações repetidas, capítulos e páginas internas não somam visitas', () => {
  assert.equal(uso.registrarNavegacaoMaisVistos('/', 'rotas'),true)
  assert.equal(uso.registrarNavegacaoMaisVistos('/', 'rotas'),false)
  assert.equal(uso.registrarNavegacaoMaisVistos('/biblia?capitulo=2', 'rotas'),false)
  assert.equal(uso.registrarNavegacaoMaisVistos('/estudo-strong/H6949', 'rotas'),false)
  uso.registrarNavegacaoMaisVistos('/discipulado/1/2', 'rotas')
  assert.equal(uso.registrarNavegacaoMaisVistos('/discipulado/1/3', 'rotas'),false)
  uso.registrarNavegacaoMaisVistos('/biblia', 'rotas')
  assert.deepEqual(listar('rotas'),[])
  uso.registrarUsoMaisVistos('/biblia', 'rotas')
  assert.equal(uso.registrarNavegacaoMaisVistos('/biblia', 'rotas'),false)
  assert.deepEqual(listar('rotas'),['/biblia'])
})
teste('Reabrir uma opção pelo menu conta mesmo sem mudar a rota', () => {
  visitar('menu','/biblia',3); assert.deepEqual(listar('menu'),['/biblia'])
  assert.equal(uso.caminhoMaisVisto('/biblioteca/livro/ler'),'/biblioteca')
  assert.equal(uso.caminhoMaisVisto('/estudos-biblicos/ia-passagem'),'/biblioteca-estudos')
  assert.equal(uso.caminhoMaisVisto('/hinario/cifras/1'),'/hinario/letra')
})
teste('Dados inválidos e rotas administrativas não quebram nem contaminam o ranking', () => {
  assert.deepEqual(uso.selecionarMaisVistos('JSON inválido'),[])
  assert.deepEqual(uso.selecionarMaisVistos(JSON.stringify({usos:{'/biblia':{visitas:-5,ultimo:1},'/admin/usuarios':{visitas:100,ultimo:2}}})),[])
  assert.equal(uso.registrarUsoMaisVistos('/admin/usuarios','admin'),false)
})
teste('Armazenamento bloqueado mantém a função durante a sessão', () => {
  const salvo=globalThis.localStorage
  globalThis.localStorage={getItem:()=> '{}',setItem:()=>{throw Error('Quota')}}
  visitar('bloqueado','/biblia',3); assert.deepEqual(listar('bloqueado'),['/biblia'])
  globalThis.localStorage=salvo
})
teste('Assinantes recebem atualizações e podem encerrar a assinatura', () => {
  let eventos=0; const parar=uso.assinarMaisVistos(()=>eventos++)
  visitar('eventos','/devocional',1); assert.equal(eventos,1)
  parar(); visitar('eventos','/devocional',1); assert.equal(eventos,1)
})
const recarregado=await import('../src/utils/menuMaisVistos.js?recarregado')
teste('Histórico persiste após recarregar o módulo', () => {
  assert.deepEqual(recarregado.selecionarMaisVistos(recarregado.lerSnapshotMaisVistos('quatro')),listar('quatro'))
})

const code=transformSync(fs.readFileSync('src/components/MenuCards.jsx','utf8'),{loader:'jsx',jsx:'automatic',format:'cjs'}).code
const generic=new Proxy({__esModule:true},{get:(_,key)=>key==='__esModule'?true:()=>null})
const todos=(node,pred)=>!node||typeof node!=='object'?[]:[...(pred(node)?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>todos(child,pred))]
teste('Menu mostra de um a quatro cartões em duas colunas, inclusive no modo lista', () => {
  for (const modo of ['cards','lista']) for(let quantidade=0;quantidade<=4;quantidade++) {
    const paths=['/biblia','/devocional','/confissao','/hinario/salmos'].slice(0,quantidade)
    const mod={exports:{}}
    vm.runInNewContext(code,{console,module:mod,exports:mod.exports,require(name){
      if(name==='react')return {useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect(){}}
      if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}
      if(name==='@mui/material')return new Proxy({},{get:(_,key)=>key})
      if(name==='react-router-dom')return {useNavigate:()=>()=>{},useLocation:()=>({pathname:'/'})}
      if(name.includes('FirebaseAuthContext'))return {useFirebaseAuth:()=>({user:null})}
      if(name.includes('AppContext'))return {useApp:()=>({isDarkMode:false})}
      if(name.includes('useMaisVistos'))return {useMaisVistos:()=>paths}
      if(name.includes('menuPreferencias'))return {lerPreferenciasMenu:()=>({visualizacao:modo,metricas:false})}
      if(name==='./MenuAcessoCard')return {__esModule:true,default:'MenuAcessoCard'}
      return generic
    }})
    const tree=mod.exports.default({menuOpen:true}), section=todos(tree,n=>n.props?.['aria-labelledby']==='menu-mais-vistos')[0]
    if(!quantidade){assert.equal(section,undefined);continue}
    const cards=todos(section,n=>n.type==='MenuAcessoCard')
    assert.equal(cards.length,quantidade)
    assert.deepEqual(cards.map(n=>n.props.item.path),paths)
    assert.ok(cards.every(n=>n.props.lista===false))
    assert.ok(todos(section,n=>n.type==='Grid'&&n.props.item).every(n=>n.props.xs===6))
  }
})
for(const file of ['src/components/Layout.jsx','src/hooks/useMaisVistos.js'])transformSync(fs.readFileSync(file,'utf8'),{loader:file.endsWith('jsx')?'jsx':'js'})
console.log(`${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now()-inicio)/1000).toFixed(2)} s.`)
