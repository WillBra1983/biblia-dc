import { versaoBiblicaPorId } from '../data/bibliaVersoes.js'

const CHAVE = 'biblia-versao-selecionada-v1'
const ouvintes = new Set()
let atual = 'ara'
try { const salvo = globalThis.localStorage?.getItem(CHAVE); if (versaoBiblicaPorId(salvo)) atual = salvo } catch {}

export const obterVersaoBiblica = () => atual
export function definirVersaoBiblica(id) {
  if (!versaoBiblicaPorId(id)) throw new Error('Versão bíblica não disponível.')
  if (id === atual) return
  atual = id
  try { globalThis.localStorage?.setItem(CHAVE, id) } catch {}
  ouvintes.forEach(fn => fn())
}
export function assinarVersaoBiblica(fn) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}
