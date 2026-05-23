import { read, utils } from 'xlsx'

export const carregarMaterialDiscipulado = async () => {
  try {
    const response = await fetch('/material/discipulado.xlsx')
    const arrayBuffer = await response.arrayBuffer()
    const workbook = read(arrayBuffer)
    
    // Processa as abas da planilha
    const modulos = utils.sheet_to_json(workbook.Sheets['Módulos'])
    const licoes = utils.sheet_to_json(workbook.Sheets['Lições'])
    const questoes = utils.sheet_to_json(workbook.Sheets['Questões'])
    
    // Estrutura os dados
    return processarDados(modulos, licoes, questoes)
  } catch (error) {
    console.error('Erro ao carregar material:', error)
    throw error
  }
} 