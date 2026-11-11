// Resolve apenas metadados públicos. O MP3 continua no servidor da fonte.
const CODIGOS = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ')
const CAPITULOS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22]
const CREDITO = 'ARA em Áudio ℗ 2018 Sociedade Bíblica do Brasil. Todos os direitos reservados.'
const VERSOES_AUDIO = { ara: { sigla: 'ARA', versionId: 1608, gravacaoId: 549 }, naa: { sigla: 'NAA', versionId: 1840 }, ntlh: { sigla: 'NTLH', versionId: 211 } }

function referenciaAra(livroId, capitulo, versao = 'ara') {
  const id = Number(livroId)
  const cap = Number(capitulo)
  const traducao = VERSOES_AUDIO[versao]
  if (!Object.hasOwn(VERSOES_AUDIO, versao) || !Number.isInteger(id) || id < 1 || id > 66 || !Number.isInteger(cap) || cap < 1 || cap > CAPITULOS[id - 1]) {
    const erro = new Error('Referência bíblica inválida.')
    erro.code = 'invalid-argument'
    throw erro
  }
  const codigo = CODIGOS[id - 1]
  return { livroId: id, capitulo: cap, codigo, versao, ...traducao, referencia: `${codigo}.${cap}.${traducao.sigla}`, paginaFonte: `https://www.bible.com/pt/audio-bible/${traducao.versionId}/${codigo}.${cap}.${traducao.sigla}` }
}

function validarUrlAudioAra(valor, ref) {
  try {
    const url = new URL(valor, ref.paginaFonte)
    return url.protocol === 'https:' && url.hostname === 'audio-bible-cdn.youversionapi.com'
      && !url.username && !url.password && !url.port
      && new RegExp(`^/${ref.gravacaoId || '[1-9]\\d*'}/32k/${ref.codigo}/${ref.capitulo}-[a-f0-9]{32}\\.mp3$`, 'i').test(url.pathname)
      && url.searchParams.get('version_id') === String(ref.versionId)
      && [...url.searchParams.keys()].every((chave) => chave === 'version_id')
      ? url.href : null
  } catch { return null }
}

function extrairAudioAra(html, ref) {
  const objetos = []
  for (const script of String(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\btype\s*=\s*(['"])application\/ld\+json\1/i.test(script[1])) continue
    try { objetos.push(JSON.parse(script[2])) } catch { /* Outros blocos não impedem a leitura do AudioObject. */ }
  }
  function procurar(valor) {
    if (!valor || typeof valor !== 'object') return null
    if ((Array.isArray(valor['@type']) ? valor['@type'] : [valor['@type']]).includes('AudioObject')) {
      const url = validarUrlAudioAra(valor.contentUrl, ref)
      if (url) return url
    }
    for (const filho of Object.values(valor)) {
      if (filho && typeof filho === 'object') {
        const url = procurar(filho)
        if (url) return url
      }
    }
    return null
  }
  for (const objeto of objetos) {
    const url = procurar(objeto)
    if (url) return { ...ref, url, gravacaoId: Number(new URL(url).pathname.split('/')[1]), credito: ref.versao === 'ara' ? CREDITO : `${ref.sigla} em áudio. Sociedade Bíblica do Brasil. Fonte: bible.com.` }
  }
  const erro = new Error('A fonte não disponibilizou o áudio ARA deste capítulo.')
  erro.code = 'not-found'
  throw erro
}

function extrairAudioApiAra(json, ref) {
  const candidatos = Array.isArray(json?.response?.data) ? json.response.data.filter(item => item.version_id === ref.versionId && Number.isInteger(item.id) && item.id > 0 && (!ref.gravacaoId || item.id === ref.gravacaoId)) : []
  const gravacao = candidatos.find(item => item.default && !item.dramatized) || candidatos.find(item => !item.dramatized) || candidatos[0]
  const url = validarUrlAudioAra(gravacao?.download_urls?.format_mp3_32k, { ...ref, gravacaoId: gravacao?.id || ref.gravacaoId })
  if (!url) throw new Error('Gravação ARA não encontrada nos metadados.')
  let marcacoes = []
  if (Array.isArray(gravacao.timing) && gravacao.timing.length <= 176) {
    let anterior = 0, fimAnterior = 0
    const validas = gravacao.timing.every((item) => {
      const match = new RegExp(`^${ref.codigo}\\.${ref.capitulo}\\.([1-9]\\d{0,2})$`).exec(item.usfm)
      const versiculo = Number(match?.[1])
      if (!match || versiculo > 176 || versiculo <= anterior || !Number.isFinite(item.start) || !Number.isFinite(item.end)
        || item.start < fimAnterior || item.end <= item.start || item.end > 14400) return false
      anterior = versiculo; fimAnterior = item.end
      marcacoes.push({ versiculo, inicio: item.start, fim: item.end })
      return true
    })
    if (!validas) marcacoes = []
  }
  return { ...ref, url, credito: ref.versao === 'ara' ? CREDITO : (gravacao.copyright_short?.text || `${ref.sigla} em áudio. Sociedade Bíblica do Brasil. Fonte: bible.com.`), gravacaoId: gravacao.id, marcacoes }
}

function criarResolvedorAra({ fetchImpl = globalThis.fetch, agora = Date.now } = {}) {
  const cache = new Map()
  const pendentes = new Map()
  return async function resolver(livroId, capitulo, { atualizar = false, versao = 'ara' } = {}) {
    const ref = referenciaAra(livroId, capitulo, versao)
    const chave = ref.referencia
    const salvo = cache.get(chave)
    if (!atualizar && salvo?.expira > agora()) return salvo.dados
    if (pendentes.has(chave)) return pendentes.get(chave)
    const tarefa = (async () => {
      try {
        const endereco = `https://audio-bible.youversionapi.com/3.1/chapter.json?reference=${ref.codigo}.${ref.capitulo}&version_id=${ref.versionId}`
        const respostaApi = await fetchImpl(endereco, {
          signal: AbortSignal.timeout(10000), redirect: 'error', headers: { Accept: 'application/json' },
        })
        if (!respostaApi.ok) throw new Error('Metadados indisponíveis.')
        const texto = await respostaApi.text()
        if (texto.length > 500000) throw new Error('Metadados excederam o limite.')
        const dados = extrairAudioApiAra(JSON.parse(texto), ref)
        cache.set(chave, { dados, expira: agora() + 86400000 })
        return dados
      } catch { /* A página pública permite ouvir mesmo sem marcações disponíveis. */ }
      const resposta = await fetchImpl(ref.paginaFonte, {
        signal: AbortSignal.timeout(10000), redirect: 'error', headers: { Accept: 'text/html' },
      })
      if (!resposta.ok) {
        const erro = new Error('Não foi possível consultar a fonte do áudio ARA.')
        erro.code = resposta.status === 404 ? 'not-found' : 'unavailable'
        throw erro
      }
      if (!String(resposta.headers.get('content-type') || '').includes('text/html')) throw new Error('Resposta inesperada da fonte ARA.')
      const html = await resposta.text()
      if (html.length > 2000000) throw new Error('Resposta da fonte ARA excedeu o limite.')
      const dados = extrairAudioAra(html, ref)
      cache.set(chave, { dados, expira: agora() + 86400000 })
      return dados
    })()
    pendentes.set(chave, tarefa)
    try { return await tarefa } finally { pendentes.delete(chave) }
  }
}

module.exports = { referenciaAra, validarUrlAudioAra, extrairAudioAra, extrairAudioApiAra, criarResolvedorAra }
