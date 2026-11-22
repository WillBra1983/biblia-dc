import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { livrosCatalogo } from '../src/data/livrosCatalogo.js'
import { livros } from '../src/data/biblia.js'
import sharp from 'sharp'
import initSqlJs from 'sql.js'
import { devocionalData } from '../src/data/devocional.js'

const raizPadrao = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export async function sincronizarMetadadosCompartilhamento(raiz = raizPadrao) {
  sharp.concurrency(1)
  const salvar = (caminho, dados) => {
    const bytes = Buffer.isBuffer(dados) ? dados : Buffer.from(JSON.stringify(dados, null, 2) + '\n')
    if (!existsSync(caminho) || !readFileSync(caminho).equals(bytes)) writeFileSync(caminho, bytes)
  }
  const destino = resolve(raiz, 'functions/src')
  const versaoEditorial = Number(readFileSync(resolve(raiz, 'src/services/bibliotecaLivrosService.js'), 'utf8').match(/VERSAO_DESCRICAO_EDITORIAL\s*=\s*(\d+)/)?.[1] || 0)
  const catalogo = Object.fromEntries(livrosCatalogo.filter(l => l.publicado !== false && !l.excluido).map(l => [l.id, {
    titulo: l.titulo, autor: l.autor, capa: l.capa, descricao: String(l.descricao || '').slice(0, 600), versaoDescricaoEditorial: versaoEditorial,
  }]))
  salvar(resolve(destino, 'catalogoCompartilhamento.json'), catalogo)
  // Somente nomes e limites de capítulos; nenhum texto bíblico é duplicado.
  salvar(resolve(destino, 'bibliaReferencias.json'), livros.map(({ id, nome, capitulos }) => ({ id, nome, capitulos })))
  const normalizarId = valor => String(valor ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '')
  const referencias = { hinos: {}, cifras: {}, salmos: {}, devocionais: {} }
  const bancoHinario = resolve(raiz, 'public/hinario.db')
  if (existsSync(bancoHinario)) {
    const SQL = await initSqlJs(), db = new SQL.Database(readFileSync(bancoHinario))
    try {
      for (const [numero, titulo] of db.exec('SELECT numero, titulo FROM hinos')[0]?.values || []) referencias.hinos[normalizarId(numero)] = { numero: String(numero), titulo }
    } finally { db.close() }
  }
  const cifras = JSON.parse(readFileSync(resolve(raiz, 'public/hinario-cifras.json'), 'utf8'))
  for (const hino of cifras.hinos || []) referencias.cifras[normalizarId(hino.id)] = { numero: String(hino.id), titulo: hino.titulo }
  const salmos = JSON.parse(readFileSync(resolve(raiz, 'public/salmodia-cifras.json'), 'utf8'))
  for (const salmo of salmos.canticos || []) referencias.salmos[normalizarId(salmo.id)] = { numero: String(salmo.numero || salmo.id), titulo: salmo.titulo }
  for (const devocional of devocionalData) referencias.devocionais[String(devocional.id)] = { ordem: devocional.ordem, titulo: devocional.titulo }
  salvar(resolve(destino, 'compartilhamentoReferencias.json'), referencias)
  const assets = resolve(destino, 'assets')
  mkdirSync(resolve(assets, 'menu-fundos'), { recursive: true })
  mkdirSync(resolve(assets, 'capas'), { recursive: true })
  salvar(resolve(assets, 'biblia-logo.png'), readFileSync(resolve(raiz, 'public/icons/icon-512.png')))
  const secoes = JSON.parse(readFileSync(resolve(destino, 'compartilhamentoSecoes.json'), 'utf8'))
  const png = async origem => sharp(origem, { limitInputPixels: 64_000_000 }).rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
  for (const nome of new Set(Object.values(secoes).map(s => s.imagem))) salvar(resolve(assets, 'menu-fundos', nome.replace(/\.[^.]+$/, '.png')), await png(resolve(raiz, 'public/menu-fundos', nome)))
  for (const livro of livrosCatalogo) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(livro.id) || !/^(?:livros|capas)\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$/.test(livro.capa || '')) continue
    salvar(resolve(assets, 'capas', livro.id + '.png'), await png(resolve(raiz, 'public', livro.capa)))
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await sincronizarMetadadosCompartilhamento()
  console.log('Prévias sincronizadas com o catálogo e as imagens existentes do aplicativo.')
}
