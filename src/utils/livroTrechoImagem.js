import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import QRCode from 'qrcode'
import { normalizarTrechoLivro } from './textoTrechoLivro'

const LARGURA = 1080
const ALTURA = 1350
const TAMANHO_MINIMO = 46
const MAXIMO_LINHAS = 12

function normalizarTrecho(texto) {
  return normalizarTrechoLivro(texto)
}

function linhasDoTexto(ctx, texto, larguraMaxima) {
  const linhas = []
  for (const paragrafo of normalizarTrecho(texto).split('\n')) {
    const palavras = paragrafo.split(' ').filter(Boolean)
    if (!palavras.length) { linhas.push(''); continue }
    let linha = palavras.shift()
    for (const palavra of palavras) {
      const teste = `${linha} ${palavra}`
      if (ctx.measureText(teste).width <= larguraMaxima) linha = teste
      else { linhas.push(linha); linha = palavra }
    }
    if (linha) linhas.push(linha)
  }
  return linhas
}

function ajustarTrecho(ctx, trecho, reduzirFonte = false) {
  for (let tamanho = 60; tamanho >= (reduzirFonte ? 36 : TAMANHO_MINIMO); tamanho -= 2) {
    ctx.font = `600 ${tamanho}px Georgia, serif`
    const linhas = linhasDoTexto(ctx, trecho, 850)
    const alturaLinha = Math.round(tamanho * 1.34)
    if (linhas.every((linha) => ctx.measureText(linha).width <= 850) && linhas.length <= (reduzirFonte ? 14 : MAXIMO_LINHAS) && linhas.length * alturaLinha <= 680) {
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

export async function gerarImagemTrechoLivro({ trecho, titulo, autor, capaUrl, urlLivro, reduzirFonte = false, numero = 1, total = 1 }) {
  const texto = normalizarTrecho(trecho)
  if (texto.length < (total > 1 ? 1 : 20)) throw new Error('Selecione um trecho um pouco maior.')

  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d', { alpha: false })
  const ajuste = ajustarTrecho(ctx, `“${texto}”`, reduzirFonte)

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
  if (total > 1) { ctx.font = '700 28px Arial, sans-serif'; ctx.fillText(`${numero}/${total}`, LARGURA / 2, 158) }

  ctx.font = `600 ${ajuste.tamanho}px Georgia, serif`
  const estruturado = texto.includes('\n')
  ctx.textAlign = estruturado ? 'left' : 'center'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.32)'
  ctx.shadowBlur = 8
  const alturaTexto = ajuste.linhas.length * ajuste.alturaLinha
  let y = 505 - alturaTexto / 2 + ajuste.alturaLinha / 2
  for (const linha of ajuste.linhas) {
    if (linha) ctx.fillText(linha, estruturado ? 115 : LARGURA / 2, y)
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

export function baixarImagemTrechoLivro(blob, titulo, numero = 1, total = 1) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const nome = String(titulo || 'trecho-livro').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  link.href = url
  link.download = `${nome || 'trecho-livro'}${total > 1 ? `-${numero}-de-${total}` : ''}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function compartilharImagemTrechoLivro(blob, { titulo, autor, urlLivro }) {
  const blobs = Array.isArray(blob) ? blob : [blob]
  const texto = [`Trecho de “${titulo}”${autor ? `, de ${autor}` : ''}.`, 'Disponível na Biblioteca Digital.', urlLivro].filter(Boolean).join('\n\n')
  if (Capacitor.isNativePlatform?.()) {
    const paths = [], uris = []
    try {
    for (const [indice, imagem] of blobs.entries()) {
    const path = `trecho-livro-${Date.now()}-${indice + 1}.png`
    const data = await new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(String(leitor.result || '').split(',')[1] || '')
      leitor.onerror = () => reject(leitor.error || new Error('Não foi possível preparar a imagem.'))
      leitor.readAsDataURL(imagem)
    })
    await Filesystem.writeFile({ path, data, directory: Directory.Cache })
    paths.push(path)
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
    uris.push(uri)
    }
      await Share.share({ title: `Trecho de ${titulo}`, text: texto, files: uris, dialogTitle: 'Compartilhar trecho do livro' })
      return true
    } finally {
      await Promise.all(paths.map((path) => Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})))
    }
  }
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') return false
  const arquivos = blobs.map((imagem, indice) => new File([imagem], `trecho-livro-${indice + 1}-de-${blobs.length}.png`, { type: 'image/png' }))
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: arquivos })) return false
  await navigator.share({ title: `Trecho de ${titulo}`, text: texto, files: arquivos })
  return true
}

export function dividirTrechoEmPartes(texto, cabe) {
  const original = normalizarTrecho(texto)
  if (original.length > 12000) throw new Error('Compartilhe um trecho de até 12 mil caracteres, não o livro inteiro.')
  const partes = []
  let atual = ''
  for (const token of original.match(/\S+\s*/g) || []) {
    if (atual && !cabe((atual + token).trim())) { partes.push(atual.trim()); atual = '' }
    atual += token
    if (!cabe(atual.trim())) throw new Error('Há uma palavra muito longa para a imagem. Ajuste o trecho.')
  }
  if (atual.trim()) partes.push(atual.trim())
  if (partes.length > 12) throw new Error('O trecho ultrapassa 12 imagens. Selecione uma parte menor.')
  return partes
}

export async function gerarImagensTrechoLivro(opcoes) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const texto = normalizarTrecho(opcoes.trecho)
  if (texto.length < 20) throw new Error('Selecione um trecho um pouco maior.')
  const cabe = (parte) => { try { ajustarTrecho(ctx, `“${parte}”`, opcoes.reduzirFonte); return true } catch { return false } }
  const partes = opcoes.dividir ? dividirTrechoEmPartes(texto, cabe) : [texto]
  const imagens = []
  for (const [indice, trecho] of partes.entries()) imagens.push(await gerarImagemTrechoLivro({ ...opcoes, trecho, numero: indice + 1, total: partes.length }))
  return imagens
}
