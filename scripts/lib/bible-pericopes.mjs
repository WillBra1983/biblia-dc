import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { parseFragment } = require('parse5')

const atributo = (no, nome) => no.attrs?.find(a => a.name === nome)?.value || ''
const classes = no => atributo(no, 'class').split(/\s+/).filter(Boolean).map(c => c.replace(/^.*_/, ''))
function texto(no) {
  if (no.nodeName === '#text') return no.value
  return (no.childNodes || []).map(texto).join(' ').replace(/\s+/g, ' ').trim()
}

/** Extrai apenas títulos e referências paralelas, sem conservar o texto bíblico. */
export function extrairPericopesYouVersion(json, ref) {
  const dados = json?.response?.data
  const usfm = `${ref.codigo}.${ref.capitulo}`
  if (json?.response?.code !== 200 || dados?.reference?.version_id !== ref.versionId
    || !dados.reference.usfm?.includes(usfm) || typeof dados.content !== 'string') throw Error(`Resposta não corresponde a ${usfm} ${ref.sigla}`)
  const arvore = parseFragment(dados.content)
  const pericopes = [], pendentes = [], versiculos = new Set()
  let capituloCorreto = false
  function visitar(no) {
    const tipos = classes(no)
    if (tipos.includes('chapter') && atributo(no, 'data-usfm') === usfm) capituloCorreto = true
    if (tipos.some(c => /^(?:s[1-4]|ms[1-3])$/.test(c))) {
      const titulo = texto(no)
      if (!titulo || titulo.length > 1000) throw Error(`Título inválido em ${usfm}`)
      pendentes.push({ titulo, referencias: null })
      return
    }
    if (tipos.includes('r')) {
      if (pendentes.length) pendentes[pendentes.length - 1].referencias = texto(no) || null
      return
    }
    if (tipos.includes('verse')) {
      const referencia = atributo(no, 'data-usfm')
      if (!referencia.startsWith(usfm + '.')) throw Error(`Versículo de outro capítulo em ${usfm}`)
      const numero = Number(referencia.slice(usfm.length + 1).match(/^\d+/)?.[0])
      if (!Number.isInteger(numero) || numero < 1 || numero > 176) throw Error(`Número de versículo inválido em ${usfm}`)
      versiculos.add(numero)
      for (const item of pendentes.splice(0)) pericopes.push({ livro_id: ref.livroId, capitulo: ref.capitulo, versiculo: numero, ...item })
      return
    }
    for (const filho of no.childNodes || []) visitar(filho)
  }
  visitar(arvore)
  if (!capituloCorreto || !versiculos.size || pendentes.length) throw Error(`Estrutura incompleta em ${usfm}`)
  return { livro_id: ref.livroId, capitulo: ref.capitulo, versiculos: versiculos.size, pericopes }
}
