import { consultarRegistrosEstudo } from './estudosCuradosService'
import { lerCacheIaPassagem } from '../utils/bibliaIaPassagemCache'
import { lerCachePericope } from '../utils/bibliaIaPericopeCache'
import { TOM_PADRAO, TONS_IDS } from '../utils/iaTonalidade'

const tons = [TOM_PADRAO, ...TONS_IDS.filter(t => t !== TOM_PADRAO)]
const temTexto = item => typeof item?.texto === 'string' && Boolean(item.texto.trim())

/** Consulta somente dados existentes. Nunca chama a IA nem altera os registros. */
export async function consultarEstudosDisponiveis(passagem) {
  const registros = await consultarRegistrosEstudo(passagem)
  const resultado = {}
  for (const versao of ['ara', 'naa', 'ntlh']) {
    const opcoes = versao === 'ara' ? [undefined, 'ara'] : [versao]
    busca: for (const chaveVersao of opcoes) {
      // Os registros históricos sem sufixo são ARA e têm prioridade sobre
      // cópias ARA produzidas depois da introdução das chaves por tradução.
      for (const tom of tons) {
        for (const fonte of ['oficial', 'candidato', 'cache']) {
          let estudo
          if (fonte === 'cache') {
            estudo = passagem.tipo === 'pericope'
              ? lerCachePericope(passagem.livroId, passagem.capitulo, passagem.inicio, passagem.fim, tom, chaveVersao)
              : lerCacheIaPassagem(passagem.livroId, passagem.capitulo, passagem.versArr, tom, chaveVersao)
          } else {
            estudo = registros.find(r => r.versao === chaveVersao && r.tom === tom && r.fonte === fonte)?.estudo
          }
          if (temTexto(estudo)) {
            resultado[versao] = { ...estudo, versaoBiblica: versao, tom, fonte, legado: chaveVersao == null }
            break busca
          }
        }
      }
    }
  }
  return resultado
}
