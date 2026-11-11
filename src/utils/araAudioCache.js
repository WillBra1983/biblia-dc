import { validarMarcacoesAra } from './araAudioTimings.js'
import { versaoBiblicaPorId } from '../data/bibliaVersoes.js'

const prefixo = 'ara-audio-marcacoes-v1:'

export function salvarMetadadosAra(dados, armazenamento) {
  try {
    if (!validarMarcacoesAra(dados?.marcacoes).length) return
    const destino = armazenamento ?? globalThis.localStorage
    destino?.setItem(`${prefixo}${dados.versao || 'ara'}:${dados.livroId}:${dados.capitulo}`, JSON.stringify(dados))
  } catch { /* Falta de espaço/permissão não impede a reprodução online. */ }
}

export function lerMetadadosAra(livroId, capitulo, armazenamento, versao = 'ara') {
  try {
    const origem = armazenamento ?? globalThis.localStorage
    const traducao = versaoBiblicaPorId(versao)
    if (!traducao) return null
    const dados = JSON.parse(origem?.getItem(`${prefixo}${versao}:${livroId}:${capitulo}`) || 'null')
    if (!dados || Number(dados.livroId) !== Number(livroId) || Number(dados.capitulo) !== Number(capitulo)
      || (dados.versao || 'ara') !== versao || !Number.isInteger(dados.gravacaoId) || dados.gravacaoId < 1
      || (versao === 'ara' && dados.gravacaoId !== 549) || !validarMarcacoesAra(dados.marcacoes).length) return null
    const url = new URL(dados.url)
    if (url.protocol !== 'https:' || url.hostname !== 'audio-bible-cdn.youversionapi.com'
      || !url.pathname.startsWith(`/${dados.gravacaoId}/32k/`) || url.searchParams.get('version_id') !== String(traducao.bibleComId)) return null
    return dados
  } catch { return null }
}
