const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { criarResolvedorAra } = require('./araAudioCore')
const resolver = criarResolvedorAra()

// Conteúdo público, inclusive para leitores sem conta. Não recebe URLs do cliente.
exports.obterAudioAra = onCall(
  { region: 'us-central1', cors: true, maxInstances: 3, timeoutSeconds: 30, memory: '256MiB' },
  async (req) => {
    try {
      return await resolver(req.data?.livroId, req.data?.capitulo, { atualizar: req.data?.atualizar === true, versao: req.data?.versao || 'ara' })
    } catch (erro) {
      const codigo = ['invalid-argument', 'not-found'].includes(erro.code) ? erro.code : 'unavailable'
      throw new HttpsError(codigo, codigo === 'invalid-argument' ? 'Referência bíblica inválida.' : 'O áudio ARA não pôde ser carregado. Tente novamente.')
    }
  }
)
