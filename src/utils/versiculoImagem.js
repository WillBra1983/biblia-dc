import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const LARGURA = 1080
const ALTURA = 1350

const base = () => {
  const valor = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/'
  return valor.endsWith('/') ? valor : `${valor}/`
}

export const FUNDOS_VERSICULO = [
  { id: 'amanhecer', nome: 'Amanhecer', arquivo: 'amanhecer.webp', overlay: 0.5 },
  { id: 'montanhas', nome: 'Montanhas', arquivo: 'montanhas.webp', overlay: 0.48 },
  { id: 'ceu', nome: 'Céu', arquivo: 'ceu.webp', overlay: 0.42 },
  { id: 'rio-sereno', nome: 'Rio sereno', arquivo: 'rio-sereno.webp', overlay: 0.48 },
  { id: 'cachoeira', nome: 'Cachoeira', arquivo: 'cachoeira.webp', overlay: 0.5 },
  { id: 'cruz', nome: 'Cruz', arquivo: 'cruz.webp', overlay: 0.44 },
  { id: 'lago', nome: 'Lago', arquivo: 'lago.webp', overlay: 0.48 },
  { id: 'caminho', nome: 'Caminho', arquivo: 'caminho.webp', overlay: 0.5 },
  { id: 'mar', nome: 'Mar', arquivo: 'mar.webp', overlay: 0.46 },
  { id: 'classico', nome: 'Clássico', cor: '#123c32', overlay: 0 },
]

export function urlFundoVersiculo(fundo) {
  return fundo?.arquivo ? `${base()}compartilhar-versiculo/${fundo.arquivo}` : ''
}

export function urlLogoApp() {
  return `${base()}icons/icon-192.png`
}

export function limparNumeracaoTextoVersiculo(texto) {
  return String(texto || '')
    .split(/\n+/)
    .map((linha) =>
      linha
        .replace(/^\s*(?:\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*[.:;,)\-–—]?\s*/, '')
        .trim()
    )
    .filter(Boolean)
    .join(' ')
}

function ehLetraMinuscula(caractere) {
  if (!caractere) return false
  return (
    caractere === caractere.toLocaleLowerCase('pt-BR') &&
    caractere !== caractere.toLocaleUpperCase('pt-BR')
  )
}

export function formatarCitacaoTextoVersiculo(texto) {
  const limpo = limparNumeracaoTextoVersiculo(texto)
  if (!limpo) return ''

  const primeiraLetra = limpo.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/)?.[0] || ''
  const ultimoCaractere = limpo.trim().slice(-1)
  const iniciaEmContinuacao = ehLetraMinuscula(primeiraLetra)
  const terminaEmContinuacao =
    ehLetraMinuscula(ultimoCaractere) || /[,;:–—-]$/.test(limpo.trim())

  const inicio = iniciaEmContinuacao ? '[...] ' : ''
  const fim = terminaEmContinuacao ? ' [...]' : ''
  return `“${inicio}${limpo}${fim}”`
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar o fundo escolhido.'))
    img.src = src
  })
}

function linhasDoTexto(ctx, texto, larguraMaxima) {
  const linhas = []
  for (const paragrafo of String(texto || '').split(/\n+/)) {
    const palavras = paragrafo.trim().split(/\s+/).filter(Boolean)
    if (!palavras.length) continue
    let linha = palavras.shift()
    for (const palavra of palavras) {
      const teste = `${linha} ${palavra}`
      if (ctx.measureText(teste).width <= larguraMaxima) linha = teste
      else {
        linhas.push(linha)
        linha = palavra
      }
    }
    linhas.push(linha)
  }
  return linhas
}

function ajustarTexto(ctx, texto, larguraMaxima, alturaMaxima) {
  for (let tamanho = 66; tamanho >= 34; tamanho -= 2) {
    ctx.font = `600 ${tamanho}px Georgia, serif`
    const linhas = linhasDoTexto(ctx, texto, larguraMaxima)
    const alturaLinha = Math.round(tamanho * 1.34)
    if (linhas.length * alturaLinha <= alturaMaxima) return { tamanho, linhas, alturaLinha }
  }

  ctx.font = '600 34px Georgia, serif'
  const alturaLinha = 46
  const maxLinhas = Math.floor(alturaMaxima / alturaLinha)
  const linhas = linhasDoTexto(ctx, texto, larguraMaxima).slice(0, maxLinhas)
  if (linhas.length === maxLinhas) {
    let ultima = linhas[maxLinhas - 1]
    while (ultima.length > 1 && ctx.measureText(`${ultima}…`).width > larguraMaxima) {
      ultima = ultima.slice(0, -1)
    }
    linhas[maxLinhas - 1] = `${ultima.trim()}…`
  }
  return { tamanho: 34, linhas, alturaLinha }
}

export async function gerarImagemVersiculo({ referencia, texto, fundoId }) {
  const fundo = FUNDOS_VERSICULO.find((item) => item.id === fundoId) || FUNDOS_VERSICULO[0]
  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d', { alpha: false })

  if (fundo.arquivo) {
    const img = await carregarImagem(urlFundoVersiculo(fundo))
    ctx.drawImage(img, 0, 0, LARGURA, ALTURA)
  } else {
    ctx.fillStyle = fundo.cor
    ctx.fillRect(0, 0, LARGURA, ALTURA)
    const brilho = ctx.createRadialGradient(810, 180, 20, 810, 180, 760)
    brilho.addColorStop(0, 'rgba(214, 180, 93, 0.24)')
    brilho.addColorStop(1, 'rgba(6, 35, 30, 0)')
    ctx.fillStyle = brilho
    ctx.fillRect(0, 0, LARGURA, ALTURA)
  }

  if (fundo.overlay) {
    ctx.fillStyle = `rgba(4, 15, 20, ${fundo.overlay})`
    ctx.fillRect(0, 0, LARGURA, ALTURA)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.font = '700 30px Arial, sans-serif'
  ctx.fillText('BÍBLIA DO DISCÍPULO CRISTÃO', LARGURA / 2, 105)
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.fillRect(390, 148, 300, 3)

  const textoCitacao = formatarCitacaoTextoVersiculo(texto)
  const ajuste = ajustarTexto(ctx, textoCitacao, 860, 700)
  ctx.font = `600 ${ajuste.tamanho}px Georgia, serif`
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.34)'
  ctx.shadowBlur = 10
  const alturaTotal = ajuste.linhas.length * ajuste.alturaLinha
  let y = 610 - alturaTotal / 2 + ajuste.alturaLinha / 2
  for (const linha of ajuste.linhas) {
    ctx.fillText(linha, LARGURA / 2, y)
    y += ajuste.alturaLinha
  }

  ctx.shadowBlur = 6
  ctx.font = '700 46px Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(String(referencia || '').trim(), LARGURA / 2, 1125)

  ctx.shadowBlur = 0
  const logo = await carregarImagem(urlLogoApp())
  const logoTamanho = 66
  ctx.drawImage(logo, (LARGURA - logoTamanho) / 2, 1217, logoTamanho, logoTamanho)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
      'image/png',
      0.96
    )
  })
}

export function baixarImagemVersiculo(blob, referencia) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const nome = String(referencia || 'versiculo').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url
  link.download = `${nome || 'versiculo'}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function compartilharArquivoImagem(blob, referencia, url, texto = '') {
  const link = String(url || '').trim()
  const citacao = formatarCitacaoTextoVersiculo(texto)
  const partes = [citacao, String(referencia || '').trim()].filter(Boolean)
  if (link) partes.push(`Abrir este texto no aplicativo:\n${link}`)
  const textoCompartilhamento = partes.join('\n\n')
  if (Capacitor.isNativePlatform?.()) {
    const path = `versiculo-biblico-${Date.now()}.png`
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
      reader.onerror = () => reject(reader.error || new Error('Não foi possível preparar a imagem.'))
      reader.readAsDataURL(blob)
    })
    await Filesystem.writeFile({ path, data, directory: Directory.Cache })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
    try {
      await Share.share({
        title: `Versículo bíblico - ${referencia}`,
        text: textoCompartilhamento,
        files: [uri],
        dialogTitle: 'Compartilhar versículo',
      })
      return true
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})
    }
  }

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') {
    return false
  }
  const arquivo = new File([blob], 'versiculo-biblico.png', { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [arquivo] })) return false
  await navigator.share({
    title: `Versículo bíblico - ${referencia}`,
    text: textoCompartilhamento,
    files: [arquivo],
  })
  return true
}
