const { onRequest } = require('firebase-functions/v2/https')
const { randomBytes } = require('node:crypto')
const path = require('node:path')
const secoes = require('./compartilhamentoSecoes.json')
const { previaCompartilhamento, livroCatalogoPublico, identificacao } = require('./compartilhamentoPrevia')
const { carregarCapaPng } = require('./compartilhamentoImagens')
const { registrarCliqueIos } = require('./projetoCliqueIos')

const PLAY = 'https://play.google.com/store/apps/details?id=com.bibliadc.app'
const APP_STORE = 'https://apps.apple.com/br/app/biblia-do-discipulo-cristao/id6772898342'
const DOWNLOAD = 'https://us-central1-biblia-dc.cloudfunctions.net/baixarBiblia'
const NOME = 'Bíblia do Discípulo Cristão'
const escapeHtml = valor => String(valor || '').replace(/[&<>"']/g, letra => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[letra]))
const cacheLivros = new Map()
function buscarLivro(id, raiz = 'bibliotecaLivros') {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id || '')) return Promise.resolve(null)
  const chave = `${raiz}/${id}`
  const cache = cacheLivros.get(chave)
  if (cache?.ate > Date.now()) return cache.promessa
  const promessa = (async () => {
    let timer
    try {
      const admin = require('./firebaseAdmin')
      return await Promise.race([
        admin.database().ref(chave).get().then(snap => snap.val()),
        new Promise(resolve => { timer = setTimeout(() => resolve(undefined), 2500) }),
      ])
    } catch { return undefined }
    finally { clearTimeout(timer) }
  })()
  if (cacheLivros.size >= 100) cacheLivros.delete(cacheLivros.keys().next().value)
  cacheLivros.set(chave, { ate: Date.now() + 60000, promessa })
  return promessa
}

exports.baixarBiblia = onRequest({ region: 'us-central1', maxInstances: 5, memory: '512MiB', concurrency: 4, invoker: 'public' }, async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.set('Vary', 'User-Agent')
  res.set('Referrer-Policy', 'no-referrer')
  res.set('X-Content-Type-Options', 'nosniff')
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.set('Allow', 'GET, HEAD')
    res.status(405).send('Método não permitido.')
    return
  }
  if (req.query?.imagem === 'logo') {
    res.set('Cache-Control', 'public, max-age=86400')
    res.type('png').sendFile(path.join(__dirname, 'assets', 'biblia-logo.png'))
    return
  }
  if (req.query?.imagem === 'secao') {
    const secao = Object.hasOwn(secoes, req.query.id || '') ? secoes[req.query.id] : null
    res.set('Cache-Control', 'public, max-age=86400')
    res.type('png').sendFile(secao ? path.join(__dirname, 'assets', 'menu-fundos', secao.imagem.replace(/\.[^.]+$/, '.png')) : path.join(__dirname, 'assets', 'biblia-logo.png'))
    return
  }
  if (req.query?.imagem === 'capa') {
    const livro = livroCatalogoPublico(req.query.id, await buscarLivro(req.query.id))
    res.set('Cache-Control', 'public, max-age=300')
    if (livro?.capaLocal) res.type('png').sendFile(path.join(__dirname, 'assets', 'capas', livro.capaLocal))
    else {
      const imagem = livro?.capa ? await carregarCapaPng(livro.capa) : null
      if (imagem) res.type('png').send(imagem)
      else res.type('png').sendFile(path.join(__dirname, 'assets', 'biblia-logo.png'))
    }
    return
  }
  const codigo = typeof req.query?.convite === 'string' && /^[a-f0-9]{32}$/.test(req.query.convite) ? req.query.convite : ''
  const play = new URL(PLAY)
  const parametros = new URLSearchParams()
  if (codigo) parametros.set('convite', codigo)
  // A identidade segue no Install Referrer do Android sem mudar o destino da loja.
  if (req.query?.tipo) for (const [chave, valor] of Object.entries(identificacao(req.query))) if (valor) parametros.set(chave, valor)
  if (parametros.size) play.searchParams.set('referrer', parametros.toString())
  const ua = req.get('user-agent') || ''
  const previa = /^WhatsApp\b|facebookexternalhit|bot|crawler|spider|preview|Viber|vkShare/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && req.query?.ios === '1')
  if (!previa && ios) {
    const antecipado = /prefetch|prerender/i.test([req.get('purpose'), req.get('sec-purpose'), req.get('x-purpose')].filter(Boolean).join(' '))
    if (codigo && req.method === 'GET' && !antecipado) {
      const navegador = String(req.get('cookie') || '').match(/(?:^|;\s*)biblia_convite_ios=([a-f0-9]{64})(?:;|$)/)?.[1]
      if (!navegador && req.query?.iosCookie !== '1') {
        // Confirma que o navegador aceita o identificador antes de creditar.
        // Não há página intermediária nem interação adicional.
        res.set('Set-Cookie', `biblia_convite_ios=${randomBytes(32).toString('hex')}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`)
        const retorno = new URL(DOWNLOAD)
        for (const [chave, valor] of Object.entries(req.query || {})) if (typeof valor === 'string') retorno.searchParams.set(chave, valor)
        retorno.searchParams.set('ios', '1')
        retorno.searchParams.set('iosCookie', '1')
        res.redirect(302, retorno.href)
        return
      }
      if (navegador) {
        let timer
        try {
          await Promise.race([
            registrarCliqueIos({ codigo, navegador }),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Tempo de registro excedido')), 2500) }),
          ])
        }
        catch { /* A indisponibilidade da campanha não impede baixar o aplicativo. */ }
        finally { clearTimeout(timer) }
      }
    }
    res.redirect(302, APP_STORE)
    return
  }
  if (!previa && /Android/i.test(ua)) { res.redirect(302, play.href); return }

  // Somente o mural público pode fornecer textos para a prévia de versículos.
  const dadosPrevia = await previaCompartilhamento(req.query, {
    buscarLivro,
    buscarVersiculo: id => buscarLivro(id, 'versiculosCompartilhadosPublicos'),
    buscarCantico: id => buscarLivro(id, 'canticosCompartilhados'),
    buscarDestaque: id => buscarLivro(id, 'destaquesMenu'),
  })
  const titulo = escapeHtml(dadosPrevia.titulo), descricao = escapeHtml(dadosPrevia.descricao)
  const imagem = escapeHtml(dadosPrevia.imagem), imagemAlt = escapeHtml(dadosPrevia.imagemAlt)

  // iPadOS pode se apresentar como Macintosh. Confere o toque sem carregar o app web.
  const nonce = randomBytes(16).toString('hex')
  res.set('Content-Security-Policy', `default-src 'none'; img-src 'self' https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`)
  const convite = new URL(DOWNLOAD)
  for (const [chave, valor] of Object.entries(dadosPrevia.conteudo)) if (valor && (chave !== 'tipo' || valor !== 'app')) convite.searchParams.set(chave, valor)
  if (codigo) convite.searchParams.set('convite', codigo)
  const destinoIos = new URL(convite.href)
  destinoIos.searchParams.set('ios', '1')
  const iosScript = codigo && !previa ? destinoIos.href : APP_STORE
  res.type('html').status(200).send(`<!doctype html><html lang="pt-BR"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${titulo}</title><meta name="description" content="${descricao}">
    <meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="${NOME}"><meta property="og:title" content="${titulo}">
    <meta property="og:description" content="${descricao}"><meta property="og:url" content="${escapeHtml(convite.href)}">
    <meta property="og:image" content="${imagem}"><meta property="og:image:alt" content="${imagemAlt}">
    ${dadosPrevia.imagemTipo ? `<meta property="og:image:type" content="${dadosPrevia.imagemTipo}">` : ''}
    ${dadosPrevia.imagemLargura ? `<meta property="og:image:width" content="${dadosPrevia.imagemLargura}"><meta property="og:image:height" content="${dadosPrevia.imagemAltura}">` : ''}
    <meta name="twitter:card" content="summary"><meta name="twitter:title" content="${titulo}">
    <meta name="twitter:description" content="${descricao}"><meta name="twitter:image" content="${imagem}">
    <style>body{font:18px system-ui,sans-serif;max-width:480px;margin:8vh auto;padding:24px;color:#153e2b}img{width:112px;height:112px;border-radius:16px}a{display:block;margin:16px 0;padding:16px;border-radius:10px;background:#14532d;color:white;text-align:center;text-decoration:none}</style>
    </head><body><img src="${imagem}" alt="${imagemAlt}" width="112" height="112" style="object-fit:contain"><h1>${titulo}</h1><p>${descricao}</p><p>Escolha a loja do seu aparelho.</p>
    <a id="android" rel="noreferrer" href="${play.href.replaceAll('&', '&amp;')}">Baixar na Google Play</a><a rel="noreferrer" href="${APP_STORE}">Baixar na App Store</a>
    <script nonce="${nonce}">if (/Android/i.test(navigator.userAgent)) location.replace(${JSON.stringify(play.href)}); else if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)) location.replace(${JSON.stringify(iosScript)});</script></body></html>`)
})
