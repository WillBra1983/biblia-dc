import { loadFirebaseModules, getFirebaseFunctions } from '../config/firebase'
import { validarMarcacoesAra } from '../utils/araAudioTimings'
import { lerMetadadosAra, salvarMetadadosAra } from '../utils/araAudioCache'
import { obterVersaoBiblica } from '../utils/bibliaVersionStore'
import { versaoBiblicaPorId } from '../data/bibliaVersoes'

const cache = new Map()
export const obterAudioAraSalvo = (livroId, capitulo, { versao = obterVersaoBiblica() } = {}) => lerMetadadosAra(livroId, capitulo, undefined, versao)

export async function obterAudioAra(livroId, capitulo, { atualizar = false, versao = obterVersaoBiblica() } = {}) {
  const traducao = versaoBiblicaPorId(versao)
  if (!traducao) throw new Error('Versão bíblica não disponível.')
  const chave = `${versao}:${livroId}:${capitulo}`
  if (!atualizar && cache.has(chave)) return cache.get(chave)
  const tarefa = (async () => {
    await loadFirebaseModules()
    const functions = getFirebaseFunctions()
    if (!functions) throw new Error('Não foi possível conectar ao serviço de áudio ARA.')
    const { httpsCallable } = await import('firebase/functions')
    const resultado = await httpsCallable(functions, 'obterAudioAra', { timeout: 35000 })({ livroId, capitulo, atualizar, versao })
    const dados = resultado.data
    const url = new URL(dados?.url)
    if (url.protocol !== 'https:' || url.hostname !== 'audio-bible-cdn.youversionapi.com'
      || url.searchParams.get('version_id') !== String(traducao.bibleComId) || Number(dados.livroId) !== Number(livroId)
      || Number(dados.capitulo) !== Number(capitulo)) throw new Error('O áudio recebido não corresponde ao capítulo ARA.')
    const fonte = { ...dados, versao, marcacoes: validarMarcacoesAra(dados.marcacoes) }
    salvarMetadadosAra(fonte)
    return fonte
  })()
  cache.set(chave, tarefa)
  try { return await tarefa } catch (erro) { cache.delete(chave); throw erro }
}
