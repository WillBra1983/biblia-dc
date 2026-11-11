import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { performance } from 'node:perf_hooks'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { livros } from '../src/data/biblia.js'
const require = createRequire(import.meta.url)
const { referenciaAra, validarUrlAudioAra, extrairAudioAra, extrairAudioApiAra, criarResolvedorAra } = require('../functions/src/araAudioCore.js')
import { validarMarcacoesAra, versiculoAraNoTempo } from '../src/utils/araAudioTimings.js'
import { lerMetadadosAra, salvarMetadadosAra } from '../src/utils/araAudioCache.js'
const inicio = performance.now()
let grupos = 0
async function teste(nome, executar) { await executar(); grupos++; console.log(`OK: ${nome}`) }
const ref = referenciaAra(1, 1)
const url = 'https://audio-bible-cdn.youversionapi.com/549/32k/GEN/1-07ae319461bae66a36e101b895f44cac.mp3?version_id=1608'
// AudioObject público observado na página ARA de Gênesis 1.
const html = `<html><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'AudioObject', contentUrl: url })}</script></html>`
const resposta = (texto = html, status = 200) => ({ ok: status === 200, status, headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }), text: async () => texto })
const api = { response: { data: [{ id: 549, version_id: 1608, download_urls: { format_mp3_32k: url }, timing: [{ usfm: 'GEN.1.1', start: 5, end: 10 }, { usfm: 'GEN.1.2', start: 10, end: 20 }] }] } }
const respostaApi = () => resposta(JSON.stringify(api))

await teste('Mapeamento de todos os 1.189 capítulos e limites dos 66 livros', () => {
  let total = 0
  for (const livro of livros) {
    for (let cap = 1; cap <= livro.capitulos; cap++) { assert.equal(referenciaAra(livro.id, cap).capitulo, cap); total++ }
    assert.throws(() => referenciaAra(livro.id, livro.capitulos + 1))
  }
  assert.equal(total, 1189)
  assert.equal(referenciaAra(43, 1).codigo, 'JHN')
  for (const id of [0, 67, -1, 1.5, 'https://outro.site']) assert.throws(() => referenciaAra(id, 1))
  for (const cap of [0, -1, 1.5, Infinity, '1/../../']) assert.throws(() => referenciaAra(1, cap))
})
await teste('Extração do AudioObject preserva a origem e os créditos', () => {
  const audio = extrairAudioAra(html, ref)
  assert.equal(audio.url, url)
  assert.equal(audio.paginaFonte, ref.paginaFonte)
  assert.ok(audio.credito.includes('Sociedade Bíblica do Brasil'))
  const grafo = `<script id="audio" type='application/ld+json'>${JSON.stringify({ '@graph': [{ '@type': ['AudioObject'], contentUrl: url }] })}</script>`
  assert.equal(extrairAudioAra(grafo, ref).url, url)
})
await teste('Rejeita tradução, capítulo, domínio ou protocolo diferentes e URLs assinadas', () => {
  for (const invalida of [url.replace('/GEN/1-', '/GEN/2-'), url.replace('version_id=1608', 'version_id=212'), url.replace('https:', 'http:'), url.replace('youversionapi.com', 'youversionapi.com.exemplo.org'), url + '&Signature=temporaria', url.replace('/549/', '/123/')]) {
    assert.equal(validarUrlAudioAra(invalida, ref), null)
  }
  assert.throws(() => extrairAudioAra(html, referenciaAra(1, 2)), { code: 'not-found' })
  assert.throws(() => extrairAudioAra('<script type="application/ld+json">inválido</script>', ref), { code: 'not-found' })
})
await teste('Cache e consultas simultâneas evitam baixar a página repetidamente', async () => {
  let chamadas = 0
  const resolver = criarResolvedorAra({ fetchImpl: async (pagina, opcoes) => { chamadas++; assert.equal(pagina, 'https://audio-bible.youversionapi.com/3.1/chapter.json?reference=GEN.1&version_id=1608'); assert.equal(opcoes.redirect, 'error'); return respostaApi() } })
  const [a, b] = await Promise.all([resolver(1, 1), resolver(1, 1)])
  assert.equal(a.url, b.url)
  await resolver(1, 1)
  assert.equal(chamadas, 1)
  await resolver(1, 1, { atualizar: true })
  assert.equal(chamadas, 2)
})
await teste('Cache expira e falhas permitem uma nova tentativa', async () => {
  let relogio = 0
  let chamadas = 0
  const resolver = criarResolvedorAra({ agora: () => relogio, fetchImpl: async () => { chamadas++; return respostaApi() } })
  await resolver(1, 1); relogio += 86400001; await resolver(1, 1)
  assert.equal(chamadas, 2)
  let falhar = true
  const recuperar = criarResolvedorAra({ fetchImpl: async () => falhar ? resposta('', 503) : resposta() })
  await assert.rejects(recuperar(1, 1), { code: 'unavailable' })
  falhar = false
  assert.equal((await recuperar(1, 1)).url, url)
})
await teste('Ausência de áudio nunca usa outra tradução nem substitui pela língua original', async () => {
  const resolver = criarResolvedorAra({ fetchImpl: async () => resposta('<html>Sem áudio</html>') })
  await assert.rejects(resolver(1, 1), { code: 'not-found' })
  const tela = readFileSync('src/pages/Biblia.jsx', 'utf8')
  assert.ok(tela.includes('{modoStrongProva && livroAtual && capitulo > 0 ? (\n              <StrongOriginalAudioPlayer'))
  transformSync(tela, { loader: 'jsx', jsx: 'automatic' })
  transformSync(readFileSync('src/components/AraAudioPlayer.jsx', 'utf8'), { loader: 'jsx', jsx: 'automatic' })
  transformSync(readFileSync('src/services/araAudioService.js', 'utf8'), { loader: 'js' })
})
await teste('Tempos pertencem à gravação 549 e rejeitam outro capítulo ou intervalos inválidos', () => {
  const dados = extrairAudioApiAra(api, ref)
  assert.equal(dados.gravacaoId, 549)
  assert.deepEqual(dados.marcacoes, [{ versiculo: 1, inicio: 5, fim: 10 }, { versiculo: 2, inicio: 10, fim: 20 }])
  for (const timing of [[{ usfm: 'JHN.1.1', start: 5, end: 10 }], [{ usfm: 'GEN.1.1', start: -1, end: 10 }], [{ usfm: 'GEN.1.1', start: 10, end: 5 }], [{ usfm: 'GEN.1.1', start: 5, end: 10 }, { usfm: 'GEN.1.2', start: 9, end: 20 }]]) {
    const copia = structuredClone(api); copia.response.data[0].timing = timing
    assert.deepEqual(extrairAudioApiAra(copia, ref).marcacoes, [])
  }
  const outra = structuredClone(api); outra.response.data[0].id = 1422
  assert.throws(() => extrairAudioApiAra(outra, ref))
})
await teste('Acompanhamento respeita início, fim, intervalos vazios e saltos do áudio', () => {
  const m = validarMarcacoesAra([{ versiculo: 1, inicio: 5, fim: 10 }, { versiculo: 2, inicio: 12, fim: 20 }])
  for (const [tempo, esperado] of [[0,null],[5,1],[9.99,1],[10,null],[11,null],[12,2],[19.99,2],[20,null],[6,1],[NaN,null]]) assert.equal(versiculoAraNoTempo(m, tempo), esperado)
  assert.deepEqual(validarMarcacoesAra([{ versiculo: 1, inicio: 0, fim: Infinity }]), [])
})
await teste('Marcações persistem sem áudio e são recuperadas offline somente para o capítulo correto', () => {
  const valores = new Map(); const storage = { setItem: (k,v) => valores.set(k,v), getItem: k => valores.get(k) }
  const dados = extrairAudioApiAra(api, ref)
  salvarMetadadosAra(dados, storage)
  assert.deepEqual(lerMetadadosAra(1,1,storage), dados)
  assert.equal(lerMetadadosAra(1,2,storage), null)
  const chave = [...valores.keys()][0]
  valores.set(chave, 'JSON inválido'); assert.equal(lerMetadadosAra(1,1,storage), null)
  valores.set(chave, JSON.stringify({ ...dados, gravacaoId: 1422 })); assert.equal(lerMetadadosAra(1,1,storage), null)
  assert.doesNotThrow(() => salvarMetadadosAra(dados, { setItem() { throw Error('Quota') } }))
})
await teste('Cache de áudio e marcações distingue ARA, NAA e NTLH', async () => {
  const storageMap = new Map()
  const storage = { setItem: (k,v) => storageMap.set(k,v), getItem: k => storageMap.get(k) }
  for (const [versao,versionId,gravacaoId] of [['ara',1608,549],['naa',1840,700],['ntlh',211,701]]) {
    const referencia = referenciaAra(1,1,versao)
    const copia = structuredClone(api)
    const item = copia.response.data[0]
    item.version_id = versionId; item.id = gravacaoId
    item.download_urls.format_mp3_32k = url.replace('/549/',`/${gravacaoId}/`).replace('version_id=1608',`version_id=${versionId}`)
    const dados = extrairAudioApiAra(copia,referencia)
    assert.equal(dados.versao,versao)
    assert.equal(dados.versionId,versionId)
    assert.equal(validarUrlAudioAra(dados.url,ref),versao==='ara'?url:null)
    salvarMetadadosAra(dados,storage)
  }
  assert.equal(storageMap.size,3)
  assert.equal(lerMetadadosAra(1,1,storage,'naa').versionId,1840)
  assert.equal(lerMetadadosAra(1,1,storage,'ntlh').versionId,211)
  assert.equal(lerMetadadosAra(1,1,storage,'ara').gravacaoId,549)
  assert.throws(()=>referenciaAra(1,1,'inexistente'))
})
await teste('Falha na consulta das marcações mantém o áudio da página sem inventar tempos', async () => {
  const resolver = criarResolvedorAra({ fetchImpl: async pagina => pagina.includes('chapter.json') ? resposta('',503) : resposta() })
  const dados = await resolver(1,1)
  assert.equal(dados.url, url)
  assert.equal(dados.marcacoes, undefined)
})
console.log(`${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. Cobertura real de rede será verificada separadamente.`)
