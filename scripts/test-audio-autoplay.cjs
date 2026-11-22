const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const { transformSync } = require('esbuild')
const inicio = performance.now()
const flush = () => new Promise(resolve => setImmediate(resolve))
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
function achar(no, teste) {
  if (!no || typeof no !== 'object') return null
  if (teste(no)) return no
  for (const filho of [no.props?.children].flat(Infinity)) { const r = achar(filho, teste); if (r) return r }
  return null
}
function montar(versao = 'ara', carregarAudio = async () => ({ url: 'https://audio.test/capitulo.mp3' })) {
  let cursor = 0, arvore, efeitos = [], props
  const slots = []
  const hooks = {
    useState(valor) { const i = cursor++; if (!(i in slots)) slots[i] = valor; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
    useRef(valor) { const i = cursor++; return slots[i] ||= { current: valor } },
    useEffect(fn, deps) { const i = cursor++; const anterior = slots[i]; if (!anterior || deps.some((v, j) => v !== anterior.deps[j])) { slots[i] = { deps }; efeitos.push(fn) } },
  }
  const modulo = { exports: {} }
  const code = transformSync(fs.readFileSync('src/components/AraAudioPlayer.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic', format: 'cjs' }).code
  vm.runInNewContext(code, { module: modulo, exports: modulo.exports, URL: { createObjectURL: () => 'blob:audio', revokeObjectURL() {} }, require: n => {
    if (n === 'react') return hooks
    if (n === 'react/jsx-runtime') return jsx
    if (n === '@mui/material') return new Proxy({}, { get: (_, k) => k })
    if (n.includes('araAudioTimings')) return { validarMarcacoesAra: m => m || [], versiculoAraNoTempo: () => null }
    if (n.includes('bibliaVersoes')) return { versaoBiblicaPorId: id => ({ sigla: id.toUpperCase() }) }
    return { default: () => null }
  } })
  props = { livroId: 43, capitulo: 3, livroNome: 'João', versao, carregarAudio, carregarSalvo: () => null,
    repositorioOffline: { existe: async () => true, obter: async () => ({ arquivo: {}, metadados: {} }), salvar: async () => {} } }
  const render = () => { cursor = 0; arvore = modulo.exports.default(props); const fila = efeitos; efeitos = []; fila.forEach(fn => fn()); return arvore }
  render(); render()
  return { render, achar: t => achar(arvore, t), props }
}
;(async () => {
  let grupos = 0
  for (const versao of ['ara', 'naa', 'ntlh']) {
    const app = montar(versao)
    await app.achar(n => n.props?.['aria-label'] === `Ouvir ${versao.toUpperCase()}`).props.onClick()
    app.render()
    const audio = app.achar(n => n.type === 'audio')
    assert.equal(audio.props.autoPlay, true)
    let plays = 0
    const elemento = { play: () => { plays++; return Promise.resolve() }, currentTime: 0 }
    audio.props.onCanPlay({ currentTarget: elemento })
    audio.props.onPlay({ currentTarget: elemento })
    audio.props.onCanPlay({ currentTarget: elemento })
    assert.equal(plays, 1, 'Não reinicia a reprodução após pausar ou novos eventos canplay')
    grupos++
  }
  const offline = montar()
  await flush(); offline.render()
  await offline.achar(n => n.props?.children === 'Ouvir offline').props.onClick()
  offline.render()
  assert.equal(offline.achar(n => n.type === 'audio').props.autoPlay, true); grupos++

  const arquivo = montar()
  await arquivo.achar(n => n.type === 'input').props.onChange({ target: { files: [{ size: 10, type: 'audio/mpeg', name: 'capitulo.mp3' }], value: 'arquivo' } })
  arquivo.render()
  assert.equal(arquivo.achar(n => n.type === 'audio').props.autoPlay, true); grupos++

  const bloqueado = montar()
  await bloqueado.achar(n => n.props?.['aria-label'] === 'Ouvir ARA').props.onClick(); bloqueado.render()
  bloqueado.achar(n => n.type === 'audio').props.onCanPlay({ currentTarget: { play: () => Promise.reject(Error('NotAllowedError')) } })
  await flush(); bloqueado.render()
  assert.match(bloqueado.achar(n => n.type === 'Alert').props.children, /Toque no play/)
  assert.ok(bloqueado.achar(n => n.type === 'audio'), 'Mantém controles para reprodução manual'); grupos++

  const cancelado = montar()
  await cancelado.achar(n => n.props?.['aria-label'] === 'Ouvir ARA').props.onClick(); cancelado.render()
  let rejeitar
  cancelado.achar(n => n.type === 'audio').props.onCanPlay({ currentTarget: { play: () => new Promise((_, reject) => { rejeitar = reject }) } })
  cancelado.achar(n => n.props?.['aria-label'] === 'Fechar áudio ARA').props.onClick()
  rejeitar(Error('AbortError')); await flush(); cancelado.render()
  assert.equal(cancelado.achar(n => n.type === 'Alert'), null); grupos++

  let resolver
  const pendente = montar('ara', () => new Promise(resolve => { resolver = resolve }))
  const pedido = pendente.achar(n => n.props?.['aria-label'] === 'Ouvir ARA').props.onClick(); pendente.render()
  pendente.achar(n => n.props?.['aria-label'] === 'Fechar áudio ARA').props.onClick()
  resolver({ url: 'https://audio.test/atrasado.mp3' }); await pedido; pendente.render()
  assert.equal(pendente.achar(n => n.type === 'audio'), null); grupos++
  console.log(`Autoplay: ${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Componentes e eventos simulados; sem aparelho físico.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
