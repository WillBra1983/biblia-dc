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

export function ultimaLinhaPermitida(linha, medirLargura, largura = 850) {
  const palavras = String(linha || '').trim().split(/\s+/).filter(Boolean)
  if (palavras.length && /\.[”’"')\]]*$/.test(String(linha).trim())) return true
  if (palavras.length >= 4) return true
  if (palavras.length < 2) return false
  const maiores = palavras.slice().sort((a, b) => medirLargura(b) - medirLargura(a)).slice(0, 2)
  return medirLargura(maiores.join(' ')) >= largura * 0.6
}

export function ajustarUltimaLinha(linhas, medirLargura, largura = 850) {
  const ajustadas = [...linhas]
  let ultimo = ajustadas.length - 1
  while (ultimo >= 0 && !ajustadas[ultimo].trim()) ultimo--
  if (ultimo < 0) return null
  while (!ultimaLinhaPermitida(ajustadas[ultimo], medirLargura, largura)) {
    // Não juntar parágrafos diferentes para cumprir a quantidade de palavras.
    if (ultimo < 1 || !ajustadas[ultimo - 1].trim()) return null
    const anteriores = ajustadas[ultimo - 1].trim().split(/\s+/)
    const nova = `${anteriores.at(-1)} ${ajustadas[ultimo]}`
    if (medirLargura(nova) > largura) return null
    ajustadas[ultimo] = nova
    anteriores.pop()
    if (anteriores.length) ajustadas[ultimo - 1] = anteriores.join(' ')
    else { ajustadas.splice(ultimo - 1, 1); ultimo-- }
  }
  // Não resolver a última linha criando uma palavra órfã na penúltima.
  const anterior = ajustadas[ultimo - 1]
  if (anterior?.trim().split(/\s+/).length === 1 && linhas[ultimo - 1]?.trim().split(/\s+/).length > 1) {
    const unidas = `${anterior} ${ajustadas[ultimo]}`
    if (medirLargura(unidas) > largura) return null
    ajustadas.splice(ultimo - 1, 2, unidas)
  }
  return ajustadas
}

function ajustarTrecho(ctx, trecho, reduzirFonte = false, tamanhoFixo = null, controlarUltimaLinha = true) {
  for (let tamanho = tamanhoFixo || 60; tamanho >= (tamanhoFixo || (reduzirFonte ? 36 : TAMANHO_MINIMO)); tamanho -= 2) {
    ctx.font = `600 ${tamanho}px Georgia, serif`
    const originais = linhasDoTexto(ctx, trecho, 850)
    const linhas = controlarUltimaLinha ? ajustarUltimaLinha(originais, (texto) => ctx.measureText(texto).width) : originais
    if (!linhas) continue
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

export function aspasTrechoImagem(texto, numero = 1, total = 1) {
  return `${numero === 1 ? '“' : ''}${texto}${numero === total ? '”' : ''}`
}

export async function gerarImagemTrechoLivro({ trecho, titulo, autor, capaUrl, urlLivro, reduzirFonte = false, numero = 1, total = 1, tamanhoFonte = null }) {
  const texto = normalizarTrecho(trecho)
  if (texto.length < (total > 1 ? 1 : 20)) throw new Error('Selecione um trecho um pouco maior.')

  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d', { alpha: false })
  const ajuste = ajustarTrecho(ctx, aspasTrechoImagem(texto, numero, total), reduzirFonte, tamanhoFonte)

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
  // A divisão pode deixar quadros sem quebra de parágrafo. Isso não deve
  // mudar o alinhamento de uma continuação do mesmo trecho.
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,.32)'
  ctx.shadowBlur = 8
  const alturaTexto = ajuste.linhas.length * ajuste.alturaLinha
  let y = 505 - alturaTexto / 2 + ajuste.alturaLinha / 2
  for (const linha of ajuste.linhas) {
    if (linha) ctx.fillText(linha, 115, y)
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

export async function compartilharImagemTrechoLivro(blob, { titulo }) {
  const blobs = Array.isArray(blob) ? blob : [blob]
  if (!blobs.length || blobs.some((imagem) => !imagem?.size || imagem.type !== 'image/png')) throw new Error('As imagens ainda não estão prontas para compartilhar.')
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
      await Share.share({ title: `Trecho de ${titulo}`, files: uris, dialogTitle: 'Compartilhar imagens do trecho' })
      // Alguns destinos só leem os anexos depois que o seletor fecha.
      // Não apagar os PNGs imediatamente após a confirmação do compartilhamento.
      window.setTimeout(() => {
        void Promise.all(paths.map((path) => Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})))
      }, 24 * 60 * 60 * 1000)
      return true
    } catch (erro) {
      await Promise.all(paths.map((path) => Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})))
      throw erro
    }
  }
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof File === 'undefined') return false
  const arquivos = blobs.map((imagem, indice) => new File([imagem], `trecho-livro-${indice + 1}-de-${blobs.length}.png`, { type: 'image/png' }))
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: arquivos })) return false
  await navigator.share({ title: `Trecho de ${titulo}`, files: arquivos })
  return true
}

export function dividirTrechoEmPartes(texto, cabe, quantidade = 0) {
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
  if (quantidade) {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 12) throw new Error('Escolha entre 1 e 12 quadros.')
    if (quantidade < partes.length) throw new Error(`Este trecho precisa de pelo menos ${partes.length} quadros para ficar legível. Escolha mais quadros ou reduza a fonte.`)
    while (partes.length < quantidade) {
      const candidatos = partes.map((parte, indice) => ({ parte, indice, tokens: parte.match(/\S+\s*/g) || [] })).filter((valor) => valor.tokens.length > 1).sort((a, b) => b.parte.length - a.parte.length)
      if (!candidatos.length) throw new Error('O trecho é muito curto para essa quantidade de quadros.')
      const { parte, indice, tokens } = candidatos[0]
      let ponto = 1, tamanho = tokens[0].length
      while (ponto < tokens.length - 1 && tamanho < parte.length / 2) { tamanho += tokens[ponto].length; ponto++ }
      partes.splice(indice, 1, tokens.slice(0, ponto).join('').trim(), tokens.slice(ponto).join('').trim())
    }
  }
  return partes
}

export function penalidadeFinalQuadro(linhas, medirLargura) {
  const ultima = linhas.filter((linha) => linha.trim()).at(-1) || ''
  const fimFrase = /[.!?][”"')]*$/.test(ultima.trim())
  const palavras = ultima.trim().split(/\s+/).filter(Boolean)
  const palavraFinal = (palavras.at(-1) || '').toLowerCase().replace(/[“”"(),;:]/g, '')
  const conectivo = !fimFrase && /^(que|de|da|do|das|dos|e|em|a|o|as|os|com|para|por|uma|um|ao|à|no|na|nos|nas|se)$/.test(palavraFinal)
  const isolada = palavras.length === 1 && !fimFrase
  const muitoCurta = !fimFrase && medirLargura(ultima) < 850 * 0.18
  return (conectivo ? 8 : 0) + (isolada ? 10 : muitoCurta ? 4 : 0)
}

export function planejarImagensTrecho(ctx, opcoes) {
  const texto = normalizarTrecho(opcoes.trecho)
  if (texto.length < 20) throw new Error('Selecione um trecho um pouco maior.')
  const minimo = opcoes.reduzirFonte ? 36 : TAMANHO_MINIMO
  const cabeCom = (tamanho) => (parte) => { try { ajustarTrecho(ctx, `“${parte}”`, opcoes.reduzirFonte, tamanho, false); return true } catch { return false } }
  const quantidade = Number(opcoes.quantidadeQuadros) || (opcoes.dividir ? dividirTrechoEmPartes(texto, cabeCom(minimo)).length : 1)
  let partes, tamanhoFonte
  for (let tamanho = 60; tamanho >= minimo; tamanho -= 2) {
    try { partes = dividirTrechoEmPartes(texto, cabeCom(tamanho), quantidade); tamanhoFonte = tamanho; break } catch { /* Tentar fonte menor para todo o conjunto. */ }
  }
  if (!partes) throw new Error('O texto não cabe nessa quantidade de quadros com letra legível. Escolha mais quadros ou reduza a fonte.')
  const cabe = cabeCom(tamanhoFonte)
  const linhas = (parte) => { ctx.font = `600 ${tamanhoFonte}px Georgia, serif`; return linhasDoTexto(ctx, `“${parte}”`, 850).length }
  const tokensOriginais = texto.match(/\S+\s*/g) || []
  // Equilibra pares adjacentes pelo espaço real ocupado, não por caracteres.
  for (let rodada = 0; rodada < 6; rodada++) {
    for (let indice = 0; indice < partes.length - 1; indice++) {
      const primeiro = partes.slice(0, indice).reduce((soma, parte) => soma + (parte.match(/\S+/g) || []).length, 0)
      const quantidadePalavras = (partes[indice].match(/\S+/g) || []).length + (partes[indice + 1].match(/\S+/g) || []).length
      const palavras = tokensOriginais.slice(primeiro, primeiro + quantidadePalavras)
      let inicio = 1, fim = palavras.length - 1
      while (inicio < fim) {
        const meio = Math.floor((inicio + fim) / 2)
        if (linhas(palavras.slice(0, meio).join('').trim()) < linhas(palavras.slice(meio).join('').trim())) inicio = meio + 1
        else fim = meio
      }
      let melhor = null
      for (let corte = Math.max(1, inicio - 24); corte <= Math.min(palavras.length - 1, inicio + 24); corte++) {
        const esquerda = palavras.slice(0, corte).join('').trim(), direita = palavras.slice(corte).join('').trim()
        if (!cabe(esquerda) || !cabe(direita)) continue
        try { ajustarTrecho(ctx, aspasTrechoImagem(esquerda, indice + 1, partes.length), opcoes.reduzirFonte, tamanhoFonte) } catch { continue }
        const quebraNatural = /[.!?][”"')]*\s*$/.test(palavras[corte - 1]) || palavras[corte - 1].includes('\n')
        const diferenca = Math.abs(linhas(esquerda) - linhas(direita))
        ctx.font = `600 ${tamanhoFonte}px Georgia, serif`
        const linhasEsquerda = linhasDoTexto(ctx, aspasTrechoImagem(esquerda, indice + 1, partes.length), 850)
        const finalRuim = penalidadeFinalQuadro(linhasEsquerda, (valor) => ctx.measureText(valor).width)
        const custo = diferenca + (quebraNatural ? 0 : 1.8) + finalRuim
        if (!melhor || custo < melhor.custo) melhor = { esquerda, direita, custo }
      }
      if (melhor) partes.splice(indice, 2, melhor.esquerda, melhor.direita)
    }
  }
  for (let tamanho = tamanhoFonte; tamanho >= minimo; tamanho -= 2) {
    try {
      partes.forEach((parte, indice) => ajustarTrecho(ctx, aspasTrechoImagem(parte, indice + 1, partes.length), opcoes.reduzirFonte, tamanho))
      return { partes, tamanhoFonte: tamanho }
    } catch { /* Usar a mesma fonte menor em todos os quadros. */ }
  }
  throw new Error('Não foi possível manter pelo menos 4 palavras na última linha de cada quadro. Ajuste o trecho ou escolha outra quantidade de quadros.')
}

export async function gerarImagensTrechoLivro(opcoes) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const { partes, tamanhoFonte } = planejarImagensTrecho(ctx, opcoes)
  const imagens = []
  for (const [indice, trecho] of partes.entries()) imagens.push(await gerarImagemTrechoLivro({ ...opcoes, trecho, tamanhoFonte, numero: indice + 1, total: partes.length }))
  return imagens
}
