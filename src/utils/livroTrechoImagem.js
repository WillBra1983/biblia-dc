import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import QRCode from 'qrcode'

const LARGURA = 1080
const ALTURA = 1350
const TAMANHO_MINIMO = 46
const MAXIMO_LINHAS = 12

function normalizarTrecho(texto) {
  return String(texto || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function linhasDoTexto(ctx, texto, larguraMaxima) {
  const palavras = normalizarTrecho(texto).split(' ').filter(Boolean)
  const linhas = []
  let linha = palavras.shift() || ''
  for (const palavra of palavras) {
    const teste = `${linha} ${palavra}`
    if (ctx.measureText(teste).width <= larguraMaxima) linha = teste
    else { linhas.push(linha); linha = palavra }
  }
  if (linha) linhas.push(linha)
  return linhas
}

function ajustarTrecho(ctx, trecho) {
  for (let tamanho = 60; tamanho >= TAMANHO_MINIMO; tamanho -= 2) {
    ctx.font = `600 ${tamanho}px Georgia, serif`
    const linhas = linhasDoTexto(ctx, trecho, 850)
    const alturaLinha = Math.round(tamanho * 1.34)
    if (linhas.length <= MAXIMO_LINHAS && linhas.length * alturaLinha <= 680) {
      return { tamanho, linhas, alturaLinha }
    }
  }
  throw new Error('O trecho está muito longo para permanecer legível. Selecione uma parte menor.')
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const imagem = new Image()
    imagem.crossOrigin = 'anonymous'
    imagem.onload = () => resolve(imagem)
    imagem.onerror = () => reject(new Error('imagem indisponível'))
    imagem.src = src
  })
}

function desenharImagemCortada(ctx, imagem, x, y, largura, altura) {
  const escala = Math.max(largura / imagem.naturalWidth, altura / imagem.naturalHeight)
  const origemLargura = largura / escala
  const origemAltura = altura / escala
  const origemX = (imagem.naturalWidth - origemLargura) / 2
  const origemY = (imagem.naturalHeight - origemAltura) / 2
  ctx.drawImage(imagem, origemX, origemY, origemLargura, origemAltura, x, y, largura, altura)
}

export async function gerarImagemTrechoLivro({ trecho, titulo, autor, capaUrl, urlLivro }) {
  const texto = normalizarTrecho(trecho)
  if (texto.length < 20) throw new Error('Selecione um trecho um pouco maior.')

  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d', { alpha: false })
  const ajuste = ajustarTrecho(ctx, `“${texto}”`)

  const fundo = ctx.createLinearGradient(0, 0, LARGURA, ALTURA)
  fundo.addColorStop(0, '#073f37')
  fundo.addColorStop(0.58, '#062b27')
  fundo.addColorStop(1, '#101d18')
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, LARGURA, ALTURA)
  const luz = ctx.createRadialGradient(890, 130, 10, 890, 130, 690)
  luz.addColorStop(0, 'rgba(221,181,89,.30)')
  luz.addColorStop(1, 'rgba(221,181,89,0)')
  ctx.fillStyle = luz
  ctx.fillRect(0, 0, LARGURA, ALTURA)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e4bd68'
  ctx.font = '800 29px Arial, sans-serif'
  ctx.fillText('BIBLIOTECA DO DISCÍPULO CRISTÃO', LARGURA / 2, 82)
  ctx.fillStyle = 'rgba(228,189,104,.65)'
  ctx.fillRect(405, 119, 270, 3)

  ctx.font = `600 ${ajuste.tamanho}px Georgia, serif`
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.32)'
  ctx.shadowBlur = 8
  const alturaTexto = ajuste.linhas.length * ajuste.alturaLinha
  let y = 505 - alturaTexto / 2 + ajuste.alturaLinha / 2
  for (const linha of ajuste.linhas) {
    ctx.fillText(linha, LARGURA / 2, y)
    y += ajuste.alturaLinha
  }
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255,255,255,.18)'
  ctx.fillRect(90, 960, 900, 1)

  let capa = null
  if (capaUrl) capa = await carregarImagem(capaUrl).catch(() => null)
  if (capa) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(92, 1000, 126, 190, 8)
    ctx.clip()
    desenharImagemCortada(ctx, capa, 92, 1000, 126, 190)
    ctx.restore()
  }

  ctx.textAlign = 'left'
  const textoX = capa ? 250 : 92
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 38px Georgia, serif'
  const tituloLinhas = linhasDoTexto(ctx, String(titulo || 'Livro'), capa ? 500 : 650).slice(0, 2)
  tituloLinhas.forEach((linha, indice) => ctx.fillText(linha, textoX, 1030 + indice * 48))
  ctx.fillStyle = 'rgba(255,255,255,.72)'
  ctx.font = '500 27px Arial, sans-serif'
  ctx.fillText(String(autor || '').slice(0, 52), textoX, 1144)
  ctx.fillStyle = '#e4bd68'
  ctx.font = '700 23px Arial, sans-serif'
  ctx.fillText('LEIA NA BIBLIOTECA DIGITAL', textoX, 1192)

  if (urlLivro) {
    const qrDataUrl = await QRCode.toDataURL(urlLivro, { width: 180, margin: 1, color: { dark: '#062b27', light: '#ffffff' } })
    const qr = await carregarImagem(qrDataUrl)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(820, 995, 170, 170, 10)
    ctx.fill()
    ctx.drawImage(qr, 830, 1005, 150, 150)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,.68)'
    ctx.font = '600 19px Arial, sans-serif'
    ctx.fillText('ABRIR O LIVRO', 905, 1192)
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.font = '500 20px Arial, sans-serif'
  ctx.fillText('Trecho compartilhado pelo aplicativo Bíblia DC', LARGURA / 2, 1293)

  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.')),
    'image/png',
    0.96,
  ))
}

export function baixarImagemTrechoLivro(blob, titulo) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const nome = String(titulo || 'trecho-livro').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url
  link.download = `${nome || 'trecho-livro'}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function compartilharImagemTrechoLivro(blob, { titulo, autor, urlLivro }) {
  const texto = [`Trecho de “${titulo}”${autor ? `, de ${autor}` : ''}.`, 'Disponível na Biblioteca Digital.', urlLivro].filter(Boolean).join('\n\n')
  if (Capacitor.isNativePlatform?.()) {
    const path = `trecho-livro-${Date.now()}.png`
    const data = await new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(String(leitor.result || '').split(',')[1] || '')
      leitor.onerror = () => reject(leitor.error || new Error('Não foi possível preparar a imagem.'))
      leitor.readAsDataURL(blob)
    })
    await Filesystem.writeFile({ path, data, directory: Directory.Cache })
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
    try {
      await Share.share({ title: `Trecho de ${titulo}`, text: texto, files: [uri], dialogTitle: 'Compartilhar trecho do livro' })
      return true
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})
    }
  }
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') return false
  const arquivo = new File([blob], 'trecho-livro.png', { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [arquivo] })) return false
  await navigator.share({ title: `Trecho de ${titulo}`, text, files: [arquivo] })
  return true
}
