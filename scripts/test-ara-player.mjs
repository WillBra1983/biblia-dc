// Exercita o componente real em um host determinístico de hooks e mídia.
// Não substitui a conferência do áudio no navegador/dispositivo.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { transformSync } from 'esbuild'
import * as timings from '../src/utils/araAudioTimings.js'
import * as catalogo from '../src/data/bibliaVersoes.js'

const inicio = performance.now()
const codigo = transformSync(readFileSync('src/components/AraAudioPlayer.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'cjs' }).code
const fonte = { url: 'https://audio-bible-cdn.youversionapi.com/549/32k/GEN/1-07ae319461bae66a36e101b895f44cac.mp3?version_id=1608', paginaFonte: 'https://www.bible.com/pt/audio-bible/1608/GEN.1.ARA', credito: 'ARA em Áudio ℗ 2018 Sociedade Bíblica do Brasil.' }
function adiada() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function host(carregarAudio, opcoes = {}) {
  const criados = [], revogados = []
  const itensSalvos = new Map()
  const repositorio = {
    async existe(...args) { return itensSalvos.has(args.join(':')) },
    async obter(...args) { return itensSalvos.get(args.join(':')) || null },
    async salvar(v,l,c,arquivo,metadados) { itensSalvos.set([v,l,c].join(':'),{arquivo,metadados}) },
    async remover(...args) { itensSalvos.delete(args.join(':')) },
  }
  const hooks = []; let cursor = 0, efeitos = [], alterado = false, tree, media = null, props = { livroId: 1, capitulo: 1, livroNome: 'Gênesis', carregarAudio, repositorioOffline: repositorio, ...opcoes }
  const react = {
    useState(inicial) {
      const i = cursor++
      hooks[i] ||= { valor: inicial }
      return [hooks[i].valor, valor => { const proximo = typeof valor === 'function' ? valor(hooks[i].valor) : valor; if (!Object.is(proximo, hooks[i].valor)) { hooks[i].valor = proximo; alterado = true } }]
    },
    useRef(inicial) { const i = cursor++; hooks[i] ||= { current: inicial }; return hooks[i] },
    useEffect(fn, deps) {
      const i = cursor++; const anterior = hooks[i]
      if (!anterior || deps.some((d, j) => !Object.is(d, anterior.deps[j]))) efeitos.push(() => { anterior?.limpar?.(); hooks[i] = { deps, limpar: fn() } })
    },
  }
  const elemento = (type, props) => ({ type, props })
  const mod = { exports: {} }
  vm.runInNewContext(codigo, { URL: class extends URL { static createObjectURL(arquivo) { const url = `blob:offline-${criados.length + 1}`; criados.push({ arquivo, url }); return url } static revokeObjectURL(url) { revogados.push(url) } }, module: mod, exports: mod.exports, require(nome) {
    if (nome === 'react') return react
    if (nome === 'react/jsx-runtime') return { jsx: elemento, jsxs: elemento }
    if (nome === '@mui/material') return Object.fromEntries(['Alert', 'Box', 'Button', 'IconButton', 'Menu', 'MenuItem', 'Typography'].map(n => [n, n]))
    if (nome.startsWith('@mui/icons-material/')) return { default: nome }
    if (nome === '../services/araAudioService') return { obterAudioAra: carregarAudio, obterAudioAraSalvo: () => null }
    if (nome === '../utils/araAudioTimings') return timings
    if (nome === '../data/bibliaVersoes') return catalogo
    if (nome === '../services/bibliaAudioOfflineService') return { bibliaAudioOfflineService: repositorio }
    throw new Error(`Importação inesperada: ${nome}`)
  } })
  function todos(no = tree) {
    if (!no || typeof no !== 'object') return []
    if (Array.isArray(no)) return no.filter(filho => filho !== undefined).flatMap(todos)
    return no.props?.children === undefined ? [no] : [no, ...todos(no.props.children)]
  }
  function render(novas = {}) {
    props = { ...props, ...novas }
    for (let tentativas = 0; tentativas < 20; tentativas++) {
      alterado = false; cursor = 0; efeitos = []; tree = mod.exports.default(props)
      const audio = todos().find(n => n.type === 'audio')
      if (!audio) { if (media) media.ref.current = null; media = null }
      else {
        if (!media || media.src !== audio.props.src) {
          media = { src: audio.props.src, ref: audio.props.ref, elemento: { pausas: 0, removido: false, cargas: 0, pause() { this.pausas++ }, removeAttribute() { this.removido = true }, load() { this.cargas++ } } }
        }
        media.ref.current = media.elemento
      }
      efeitos.forEach(fn => fn())
      if (!alterado) return
    }
    throw new Error('Renderização não estabilizou')
  }
  render()
  return { render, todos, criados, revogados, itensSalvos, selecionar(arquivo) { const evento = { target: { files: arquivo ? [arquivo] : [], value: 'arquivo' } }; evento.tarefa = todos().find(n => n.type === 'input').props.onChange(evento); render(); return evento }, unmount() { if (media) media.ref.current = null; hooks.forEach(h => h?.limpar?.()) }, media: () => media?.elemento, botao: texto => todos().find(n => ['Button','MenuItem'].includes(n.type) && n.props.children === texto) }
}
let grupos = 0
async function teste(nome, fn) { await fn(); grupos++; console.log(`OK: ${nome}`) }
await teste('Áudio é consultado somente ao abrir; erro oferece nova tentativa', async () => {
  let chamadas = 0
  const h = host(async () => { chamadas++; throw Error('Sem conexão') })
  assert.equal(chamadas, 0)
  await h.botao('Ouvir').props.onClick(); h.render()
  assert.equal(chamadas, 1)
  const alerta = h.todos().find(n => n.type === 'Alert')
  assert.ok(alerta)
  await alerta.props.action.props.onClick(); h.render()
  assert.equal(chamadas, 2)
})
await teste('Resposta de um pedido fechado não reabre o player', async () => {
  const pedido = adiada(); const h = host(() => pedido.promise)
  const abrindo = h.botao('Ouvir').props.onClick(); h.render()
  h.todos().find(n => n.props?.['aria-label'] === 'Fechar áudio ARA').props.onClick(); h.render()
  pedido.resolve(fonte); await abrindo; h.render()
  assert.ok(h.botao('Ouvir'))
  assert.ok(!h.todos().some(n => n.type === 'audio'))
})
await teste('Trocar de capítulo interrompe e libera o elemento de áudio anterior', async () => {
  const h = host(async () => fonte)
  await h.botao('Ouvir').props.onClick(); h.render()
  const audio = h.media()
  assert.ok(audio)
  h.render({ capitulo: 2 })
  assert.ok(audio.pausas > 0)
  assert.ok(audio.removido)
  assert.ok(h.botao('Ouvir'))
})
await teste('Pedido do capítulo anterior é ignorado ao navegar durante a carga', async () => {
  const pedido = adiada(); const h = host(() => pedido.promise)
  const abrindo = h.botao('Ouvir').props.onClick(); h.render()
  h.render({ capitulo: 2 }); pedido.resolve(fonte); await abrindo; h.render()
  assert.ok(!h.todos().some(n => n.type === 'audio'))
})
await teste('Sair do player para o Strong interrompe o áudio mesmo após limpar a ref', async () => {
  const h = host(async () => fonte)
  await h.botao('Ouvir').props.onClick(); h.render()
  const audio = h.media()
  h.unmount()
  assert.ok(audio.pausas > 0)
  assert.ok(audio.removido)
})
await teste('Arquivo salvo toca por URL local sem consultar o servidor', async () => {
  let chamadas = 0
  const h = host(async () => { chamadas++; throw Error('Offline') })
  const evento = h.selecionar({ name: 'João 1.mp3', type: 'audio/mpeg', size: 1500 })
  const audio = h.todos().find(n => n.type === 'audio')
  assert.equal(audio.props.src, 'blob:offline-1')
  assert.equal(audio.props.preload, 'metadata')
  assert.equal(evento.target.value, '')
  assert.equal(chamadas, 0)
  assert.ok(!h.todos().some(n => n.props?.href === fonte.paginaFonte))
  h.unmount()
  assert.deepEqual(h.revogados, ['blob:offline-1'])
})
await teste('Trocar arquivo ou capítulo libera o áudio offline anterior', async () => {
  const h = host(async () => fonte)
  h.selecionar({ name: '1.mp3', type: '', size: 1500 })
  const anterior = h.media()
  h.selecionar({ name: '2.mp3', type: 'audio/mpeg', size: 1500 })
  assert.ok(anterior.pausas > 0)
  assert.deepEqual(h.revogados, ['blob:offline-1'])
  h.render({ capitulo: 2 })
  assert.deepEqual(h.revogados, ['blob:offline-1', 'blob:offline-2'])
})
await teste('Áudio local prevalece sobre consulta online atrasada; cancelar seleção preserva o player', async () => {
  const pedido = adiada(); const h = host(() => pedido.promise)
  const abrindo = h.botao('Ouvir').props.onClick(); h.render()
  h.selecionar({ name: '1.mp3', type: 'audio/mpeg', size: 1500 })
  pedido.resolve(fonte); await abrindo; h.render()
  h.selecionar(null)
  assert.equal(h.todos().find(n => n.type === 'audio').props.src, 'blob:offline-1')
  assert.deepEqual(h.revogados, [])
})
await teste('Arquivos inválidos e falhas de mídia locais não oferecem consulta online automática', async () => {
  let chamadas = 0
  const h = host(async () => { chamadas++; return fonte })
  for (const arquivo of [{ name: 'texto.pdf', type: 'application/pdf', size: 10 }, { name: 'vazio.mp3', type: 'audio/mpeg', size: 0 }]) {
    h.selecionar(arquivo)
    assert.equal(h.todos().find(n => n.type === 'Alert').props.action, undefined)
    assert.ok(!h.todos().some(n => n.type === 'audio'))
  }
  h.selecionar({ name: '1.mp3', type: 'audio/mpeg', size: 1500 })
  h.todos().find(n => n.type === 'audio').props.onError(); h.render()
  assert.equal(h.todos().find(n => n.type === 'Alert').props.action, undefined)
  assert.equal(chamadas, 0)
})
await teste('Áudio online publica versículos reais, ignora repetições e limpa ao fechar', async () => {
  const ativos = []
  const marcacoes = [{ versiculo: 1, inicio: 5, fim: 10 }, { versiculo: 2, inicio: 10, fim: 20 }]
  const h = host(async () => ({ ...fonte, marcacoes }), { onVersiculoChange: v => ativos.push(v) })
  await h.botao('Ouvir').props.onClick(); h.render()
  const evento = tempo => ({ currentTarget: { currentTime: tempo } })
  const audio = h.todos().find(n => n.type === 'audio')
  audio.props.onTimeUpdate(evento(5)); audio.props.onTimeUpdate(evento(6)); audio.props.onSeeked(evento(12)); audio.props.onSeeked(evento(2))
  assert.deepEqual(ativos, [1,2,null])
  audio.props.onTimeUpdate(evento(7)); h.unmount()
  assert.equal(ativos.at(-1), null)
})
await teste('Arquivo offline só acompanha após confirmação da gravação e usa marcações salvas', () => {
  const ativos = []; let consultas = 0
  const h = host(async () => { consultas++; return fonte }, { carregarSalvo: () => ({ marcacoes: [{ versiculo: 1, inicio: 5, fim: 10 }] }), onVersiculoChange: v => ativos.push(v) })
  h.selecionar({ name: 'meu-audio.mp3', type: 'audio/mpeg', size: 1500 })
  h.todos().find(n => n.type === 'audio').props.onTimeUpdate({ currentTarget: { currentTime: 6 } })
  assert.deepEqual(ativos, [])
  h.media().currentTime = 6
  h.botao('Confirmar gravação ARA deste capítulo e acompanhar').props.onClick(); h.render()
  assert.deepEqual(ativos, [1])
  h.botao('Desativar acompanhamento').props.onClick(); h.render()
  assert.deepEqual(ativos, [1,null])
  assert.equal(consultas, 0)
})
await teste('Troca de versão interrompe o áudio e ignora a resposta da tradução anterior', async () => {
  const pedido = adiada(); const h = host(() => pedido.promise)
  const abrindo = h.botao('Ouvir').props.onClick(); h.render()
  h.render({versao:'naa'})
  pedido.resolve(fonte); await abrindo; h.render()
  assert.ok(h.botao('Ouvir'))
  assert.equal(h.botao('Ouvir').props['aria-label'],'Ouvir NAA')
  assert.ok(!h.todos().some(n=>n.type==='audio'))
})
await teste('Controle offline não aparece sem arquivo e aparece depois de salvar o capítulo',async()=>{
 const h=host(async()=>fonte)
 await Promise.resolve(); h.render()
 assert.ok(h.botao('Ouvir'))
 assert.equal(h.botao('Ouvir offline'),undefined)
 const e=h.selecionar({name:'1.mp3',type:'audio/mpeg',size:1000})
 await e.tarefa; h.render()
 h.todos().find(n=>n.props?.['aria-label']==='Fechar áudio ARA').props.onClick(); h.render()
 assert.ok(h.botao('Ouvir offline'))
 h.render({capitulo:2}); await Promise.resolve(); h.render()
 assert.equal(h.botao('Ouvir offline'),undefined)
})
await teste('Ouvir offline reabre o arquivo salvo sem consultar o servidor',async()=>{
 let consultas=0
 const h=host(async()=>{consultas++;throw Error('Sem rede')})
 await h.selecionar({name:'1.mp3',type:'audio/mpeg',size:1000}).tarefa; h.render()
 h.todos().find(n=>n.props?.['aria-label']==='Fechar áudio ARA').props.onClick(); h.render()
 await h.botao('Ouvir offline').props.onClick(); h.render()
 assert.equal(consultas,0)
 assert.ok(h.todos().find(n=>n.type==='audio').props.src.startsWith('blob:'))
 await h.botao('Remover áudio salvo deste capítulo').props.onClick(); h.render()
 assert.equal(h.botao('Ouvir offline'),undefined)
})
await teste('Falha ao guardar não anuncia disponibilidade offline',async()=>{
 const h=host(async()=>fonte,{repositorioOffline:{existe:async()=>false,salvar:async()=>{throw Error('Quota')},obter:async()=>null}})
 await h.selecionar({name:'1.mp3',type:'audio/mpeg',size:1000}).tarefa; h.render()
 h.todos().find(n=>n.props?.['aria-label']==='Fechar áudio ARA').props.onClick(); h.render()
 assert.equal(h.botao('Ouvir offline'),undefined)
})
await teste('Salvar online conclui mesmo ao fechar; trocar capítulo evita gravar resposta antiga',async()=>{
 const arquivo={size:1000,type:'audio/mpeg'}
 const pedido=adiada(); const h=host(async()=>fonte,{baixarArquivo:()=>pedido.promise})
 await h.botao('Ouvir').props.onClick(); h.render()
 const gravando=h.botao('Salvar capítulo para ouvir offline').props.onClick(); h.render()
 h.todos().find(n=>n.props?.['aria-label']==='Fechar áudio ARA').props.onClick(); h.render()
 pedido.resolve(arquivo); await gravando; h.render()
 assert.ok(h.botao('Ouvir offline'))
 const outro=adiada(); const g=host(async()=>fonte,{baixarArquivo:()=>outro.promise})
 await g.botao('Ouvir').props.onClick(); g.render()
 const antigo=g.botao('Salvar capítulo para ouvir offline').props.onClick(); g.render()
 g.render({capitulo:2}); outro.resolve(arquivo); await antigo; g.render()
 assert.equal(g.itensSalvos.size,0)
})
console.log(`${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s.`)
