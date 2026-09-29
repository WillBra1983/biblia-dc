import { livrosCatalogo } from './src/data/livrosCatalogo.js'

const BASE_PUBLICA = 'https://foundcine.com/biblia'

function escaparHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function paginaLivro(livro) {
  const id = encodeURIComponent(livro.id)
  const titulo = escaparHtml(`${livro.titulo} — ${livro.autor}`)
  const descricao = escaparHtml(livro.descricao || `Conheça ${livro.titulo} na Biblioteca do Discípulo Cristão.`)
  const imagem = /^(https?:)/i.test(livro.capa) ? livro.capa : `${BASE_PUBLICA}/${String(livro.capa || '').replace(/^\//, '')}`
  const url = `${BASE_PUBLICA}/compartilhar/livro/${id}.html`
  const destino = `${BASE_PUBLICA}/biblioteca/${id}?abrir=1&origem=compartilhamento`
  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><meta name="description" content="${descricao}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="book"><meta property="og:site_name" content="Biblioteca do Discípulo Cristão">
<meta property="og:title" content="${titulo}"><meta property="og:description" content="${descricao}">
<meta property="og:image" content="${escaparHtml(imagem)}"><meta property="og:image:alt" content="Capa de ${escaparHtml(livro.titulo)}">
<meta property="og:url" content="${url}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${titulo}"><meta name="twitter:description" content="${descricao}"><meta name="twitter:image" content="${escaparHtml(imagem)}">
<meta property="al:android:package" content="com.bibliadc.app"><meta property="al:android:app_name" content="Bíblia DC">
<meta property="al:android:url" content="com.bibliadc.app://open/biblioteca/${id}?abrir=1&amp;origem=compartilhamento">
<meta http-equiv="refresh" content="0;url=${destino}">
<script>location.replace(${JSON.stringify(destino)})</script>
</head><body><p>Abrindo <a href="${destino}">${escaparHtml(livro.titulo)}</a>…</p></body></html>`
}

export function bibliotecaSharePagesPlugin() {
  return {
    name: 'biblioteca-share-pages',
    apply: 'build',
    generateBundle() {
      for (const livro of livrosCatalogo) {
        this.emitFile({
          type: 'asset',
          fileName: `compartilhar/livro/${livro.id}.html`,
          source: paginaLivro(livro),
        })
      }
    },
  }
}
