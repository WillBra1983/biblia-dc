// Referências selecionadas para o destaque diário. O texto permanece vindo
// do catálogo bíblico; a seleção nunca reescreve nem resume a Escritura.
const VERSAO_EDITORIAL = 1
const TEMAS = {
  graca: ['43_3_16', '45_5_8', '49_2_8', '49_2_10', '56_3_5', '62_1_9', '45_8_1', '47_5_17', '43_1_14', '43_1_12', '45_6_23', '48_2_20', '49_1_7', '51_1_13', '60_1_3', '55_1_9'],
  confianca: ['19_23_1', '19_46_1', '19_56_3', '19_62_5', '19_121_2', '20_3_5', '23_26_3', '23_41_10', '23_43_2', '40_6_33', '40_11_28', '43_14_1', '45_8_28', '50_4_6', '60_5_7', '58_13_6'],
  oracao: ['19_5_3', '19_34_4', '19_62_8', '19_145_18', '24_33_3', '40_6_6', '40_7_7', '40_26_41', '42_18_1', '45_8_26', '49_6_18', '51_4_2', '52_5_17', '59_1_5', '62_5_14', '58_4_16'],
  santidade: ['19_51_10', '19_119_9', '19_119_11', '20_4_23', '45_6_12', '45_12_2', '48_5_16', '49_4_32', '49_5_1', '51_3_12', '52_4_3', '54_4_12', '58_12_14', '59_1_22', '60_1_15', '62_2_6'],
  palavra: ['5_6_6', '6_1_8', '19_1_2', '19_19_7', '19_119_18', '19_119_105', '19_119_130', '23_40_8', '23_55_11', '40_4_4', '43_17_17', '51_3_16', '55_3_16', '58_4_12', '59_1_21', '60_2_2'],
  amor: ['3_19_18', '20_17_17', '40_5_9', '40_5_44', '40_22_37', '40_22_39', '43_13_34', '45_12_10', '45_12_18', '46_13_4', '46_16_14', '48_6_2', '49_4_2', '51_3_14', '58_10_24', '62_4_19'],
  esperanca: ['19_27_14', '19_30_5', '19_42_11', '23_40_31', '25_3_22', '25_3_24', '43_11_25', '43_14_27', '43_16_33', '45_8_18', '45_15_13', '47_4_17', '50_1_6', '58_10_23', '60_5_10', '66_21_4'],
  sabedoria: ['19_90_12', '20_1_7', '20_3_7', '20_9_10', '20_11_25', '20_15_1', '20_16_3', '20_16_9', '20_18_13', '20_19_17', '20_21_3', '33_6_8', '46_10_31', '50_4_8', '51_4_6', '59_3_17'],
}
const REFERENCIAS = Object.entries(TEMAS).flatMap(([tema, chaves]) => chaves.map(chave => ({ chave, tema })))

function hash(texto) {
  let valor = 2166136261
  for (const caractere of String(texto)) {
    valor ^= caractere.charCodeAt(0)
    valor = Math.imul(valor, 16777619)
  }
  return valor >>> 0
}

function escolherVersiculoEditorial(catalogo, usados = {}, data) {
  const indice = new Map(catalogo.map(item => [`${item.bookId}_${item.chapter}_${item.verse}`, item]))
  const disponiveis = REFERENCIAS.flatMap(({ chave, tema }) => {
    const item = indice.get(chave)
    return item && String(item.text || '').trim() ? [{ ...item, editorialTema: tema, editorialVersao: VERSAO_EDITORIAL, chaveEditorial: chave }] : []
  })
  if (!disponiveis.length) throw new Error('O catálogo não contém as referências do destaque diário.')
  let candidatos = disponiveis.filter(item => !usados[item.chaveEditorial])
  // Ao completar o catálogo, reutiliza primeiro a referência usada há mais
  // tempo. Mantém o histórico existente sem apagar registros nem travar o dia.
  if (!candidatos.length) {
    const maisAntiga = disponiveis.map(item => String(usados[item.chaveEditorial])).sort()[0]
    candidatos = disponiveis.filter(item => String(usados[item.chaveEditorial]) === maisAntiga)
  }
  const dias = Math.floor(Date.parse(`${data}T12:00:00Z`) / 86400000)
  const temas = Object.keys(TEMAS)
  const tema = temas[((Number.isFinite(dias) ? dias : hash(data)) % temas.length + temas.length) % temas.length]
  const doTema = candidatos.filter(item => item.editorialTema === tema)
  const grupo = doTema.length ? doTema : candidatos
  return grupo[hash(data) % grupo.length]
}

module.exports = { REFERENCIAS, VERSAO_EDITORIAL, escolherVersiculoEditorial }
