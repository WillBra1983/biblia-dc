import { contextosLivros, contextosPassagens } from '../data/contextosBiblicos.js'
import { livros } from '../data/biblia.js'

export function prepararContextoPassagem(item, capitulo = [], pericopes = []) {
  const livroId = Number(item?.livroId), cap = Number(item?.capitulo), alvo = Number(item?.versiculo)
  const livro = livros.find(valor => valor.id === livroId)
  if (!livro || !Number.isInteger(cap) || cap < 1 || cap > livro.capitulos || !Number.isInteger(alvo) || alvo < 1) return null
  const versos = capitulo.map((valor, indice) => ({
    numero: Number(valor.numero ?? valor.versiculo) || indice + 1,
    numeroFim: Math.max(Number(valor.numero ?? valor.versiculo) || indice + 1, Number(valor.numeroFim) || Number(valor.numero ?? valor.versiculo) || indice + 1),
    texto: String(valor.texto || '').replace(/^\s*(?:[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)\s*[.:;,)\-–—]?\s*/, '').trim(),
  })).sort((a, b) => a.numero - b.numero)
  const titulos = pericopes.filter(valor => Number(valor.versiculo) > 0).sort((a, b) => Number(a.versiculo) - Number(b.versiculo))
  const anteriores = titulos.filter(valor => Number(valor.versiculo) <= alvo)
  const secao = anteriores[anteriores.length - 1]
  const proxima = titulos.find(valor => Number(valor.versiculo) > alvo)
  const ultimo = versos.reduce((max, valor) => Math.max(max, valor.numeroFim), alvo)
  const inicioSecao = secao ? Number(secao.versiculo) : 1
  const fimSecao = proxima ? Number(proxima.versiculo) - 1 : ultimo
  const especifico = contextosPassagens.find(valor => valor.livroId === livroId && valor.capitulo === cap && alvo >= valor.inicio && alvo <= valor.fim)
  const inicioTrecho = Math.max(inicioSecao, alvo - 2)
  const fimTrecho = Math.min(fimSecao, alvo + 2)
  const trecho = versos.filter(valor => valor.numero <= fimTrecho && valor.numeroFim >= inicioTrecho)
  const alvoNaSecao = `${livro.nome} ${cap}:${inicioSecao}${fimSecao > inicioSecao ? '–' + fimSecao : ''}`
  return {
    livro: livro.nome, introducao: contextosLivros[livroId], explicacao: especifico?.texto || '',
    tituloSecao: secao?.titulo || 'Contexto do capítulo', referenciaSecao: alvoNaSecao,
    referenciaTrecho: trecho.length ? `${livro.nome} ${cap}:${trecho[0].numero}${trecho[trecho.length - 1].numeroFim > trecho[0].numero ? '–' + trecho[trecho.length - 1].numeroFim : ''}` : '',
    trecho: trecho.map(valor => ({ ...valor, selecionado: valor.numero <= alvo && valor.numeroFim >= alvo })),
  }
}
