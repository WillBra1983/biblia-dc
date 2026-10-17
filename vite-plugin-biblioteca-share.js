import { livrosCatalogo } from './src/data/livrosCatalogo.js'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { partesApresentacao } from './src/utils/apresentacaoFormatada.js'
import { versaoCompartilhamentoLivro } from './src/utils/livroShareVersao.js'

const BASE_PUBLICA = 'https://foundcine.com/biblia'

function escaparHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function paginaLivro(livro, imagemCompartilhamento) {
  const id = encodeURIComponent(livro.id)
  const titulo = escaparHtml(`${livro.titulo} — ${livro.autor}`)
  const descricao = escaparHtml(partesApresentacao(livro.descricao || `Conheça ${livro.titulo} na Biblioteca do Discípulo Cristão.`).map((parte) => parte.texto).join(''))
  const imagem = imagemCompartilhamento
  const url = `${BASE_PUBLICA}/compartilhar/livro/${id}.html?v=${versaoCompartilhamentoLivro(livro)}`
  const destino = `${BASE_PUBLICA}/biblioteca/${id}?abrir=1&origem=compartilhamento`
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><meta name="description" content="${descricao}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="book"><meta property="og:site_name" content="Biblioteca do Discípulo Cristão">
<meta property="og:title" content="${titulo}"><meta property="og:description" content="${descricao}">
<meta property="og:image" content="${escaparHtml(imagem)}"><meta property="og:image:alt" content="Capa de ${escaparHtml(livro.titulo)}">
<meta property="og:image:secure_url" content="${escaparHtml(imagem)}"><meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="800"><meta property="og:image:height" content="1200">
<meta property="og:url" content="${url}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${titulo}"><meta name="twitter:description" content="${descricao}"><meta name="twitter:image" content="${escaparHtml(imagem)}">
<meta property="al:android:package" content="com.bibliadc.app"><meta property="al:android:app_name" content="Bíblia DC">
<meta property="al:android:url" content="com.bibliadc.app://open/biblioteca/${id}?abrir=1&amp;origem=compartilhamento">
<script>location.replace(${JSON.stringify(destino)})</script>
</head><body><p>Abrindo <a href="${destino}">${escaparHtml(livro.titulo)}</a>…</p></body></html>`
}

export function bibliotecaSharePagesPlugin() {
  return {
    name: 'biblioteca-share-pages',
    apply: 'build',
    async generateBundle() {
      for (const livro of livrosCatalogo) {
        // JPEG estático: a prévia não depende de JavaScript nem de suporte a WebP.
        const imagemArquivo = `compartilhar/livro/capas/${livro.id}.jpg`
        const capa = new URL(`./public/${livro.capa}`, import.meta.url)
        const imagem = await sharp(fileURLToPath(capa))
          .resize(800, 1200, { fit: 'contain', background: '#ffffff' })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 85 })
          .toBuffer()
        this.emitFile({ type: 'asset', fileName: imagemArquivo, source: imagem })
        this.emitFile({
          type: 'asset',
          fileName: `compartilhar/livro/${livro.id}.html`,
          source: paginaLivro(livro, `${BASE_PUBLICA}/${imagemArquivo}`),
        })
      }
    },
  }
}
