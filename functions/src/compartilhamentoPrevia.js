const secoes = require('./compartilhamentoSecoes.json')
const catalogo = require('./catalogoCompartilhamento.json')
const livrosBiblicos = require('./bibliaReferencias.json')
const referencias = require('./compartilhamentoReferencias.json')
const DOWNLOAD = 'https://us-central1-biblia-dc.cloudfunctions.net/baixarBiblia'
const NOME = 'Bíblia do Discípulo Cristão'
const DESCRICAO = 'Leia e ouça a Bíblia, estude e cresça no conhecimento da Palavra. Aplicativo gratuito e sem propagandas para Android e iPhone.'
const ID = /^[a-zA-Z0-9_-]{1,100}$/
const tipos = new Set(['app', 'secao', 'livro', 'biblia', 'strong', 'discipulado', 'dia', 'cantico', 'doutrina', 'estudo', 'explicacao', 'versiculo', 'teologia', 'avaliacao', 'devocional', 'destaque'])
const texto = (valor, max = 220) => String(valor || '').replace(/<[^>]*>/g, '').replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
const inteiro = (valor, max) => /^\d{1,3}$/.test(String(valor || '')) && Number(valor) > 0 && Number(valor) <= max ? String(Number(valor)) : ''

function identificacao(dados = {}) {
  dados = Object.fromEntries(Object.entries(dados).filter(([, valor]) => typeof valor === 'string'))
  const tipo = tipos.has(dados.tipo) ? dados.tipo : 'app'
  const resultado = { tipo }
  if (ID.test(dados.id || '') || (tipo === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(dados.id || ''))) resultado.id = dados.id
  if (tipo === 'secao' && !Object.hasOwn(secoes, resultado.id || '')) return { tipo: 'app' }
  if (['biblia', 'explicacao', 'estudo'].includes(tipo) && (tipo !== 'estudo' || dados.livro)) {
    resultado.livro = inteiro(dados.livro, 66)
    const livro = livrosBiblicos.find(l => String(l.id) === resultado.livro)
    resultado.capitulo = inteiro(dados.capitulo, livro?.capitulos || 0)
    if (!resultado.livro || !resultado.capitulo) {
      if (tipo !== 'estudo') return { tipo: 'secao', id: tipo === 'explicacao' ? 'explicados' : 'biblia' }
      delete resultado.livro; delete resultado.capitulo
    }
    if (/^\d{1,3}(?:,\d{1,3}){0,175}$/.test(dados.versiculos || '')) resultado.versiculos = [...new Set(dados.versiculos.split(',').map(Number).filter(n => n > 0 && n < 177))].sort((a,b) => a-b).join(',')
    if (['ara', 'naa', 'ntlh'].includes(dados.versao)) resultado.versao = dados.versao
  }
  if (tipo === 'explicacao' && ['passagem', 'pericope'].includes(dados.modo)) resultado.modo = dados.modo
  if (tipo === 'strong' && !/^[HG]\d{1,5}$/.test(resultado.id || '')) return { tipo: 'app' }
  if (tipo === 'strong' && ID.test(dados.rid || '')) resultado.rid = dados.rid
  if (tipo === 'discipulado') {
    if (ID.test(dados.licao || '')) resultado.licao = dados.licao
    if (['questao', 'devocional', 'completo'].includes(dados.parte)) resultado.parte = dados.parte
    for (const chave of ['numero', 'dia']) if (inteiro(dados[chave], 365)) resultado[chave] = inteiro(dados[chave], 365)
  }
  if (tipo === 'cantico' && ['letra', 'cifras', 'salmos', 'canticos', 'outras-cancoes'].includes(dados.grupo)) resultado.grupo = dados.grupo
  if (tipo === 'doutrina') for (const chave of ['capitulo', 'pergunta']) if (inteiro(dados[chave], 200)) resultado[chave] = inteiro(dados[chave], 200)
  if (tipo === 'livro' && /^[a-f0-9]{8}$/.test(dados.v || '')) resultado.v = dados.v
  if (tipo === 'teologia') for (const chave of ['secao', 'tema', 'item', 'aba']) if (ID.test(dados[chave] || '')) resultado[chave] = dados[chave]
  return resultado
}

function linkImagem(tipo, id = '') {
  const url = new URL(DOWNLOAD)
  url.searchParams.set('imagem', tipo)
  if (id) url.searchParams.set('id', id)
  return url.href
}

function capaPublica(valor) {
  const original = String(valor || '').trim()
  if (/^(?:livros|capas)\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$/i.test(original)) return new URL(original, 'https://foundcine.com/biblia/').href
  try {
    const url = new URL(original)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch { return '' }
}

function livroPublico(livro) {
  if (!livro || livro.publicado === false || livro.excluido || !texto(livro.titulo)) return null
  return { titulo: texto(livro.titulo, 180), autor: texto(livro.autor, 140), descricao: texto(livro.descricao, 240), capa: capaPublica(livro.capa) }
}

function livroCatalogoPublico(id, remoto) {
  if (remoto === undefined || (remoto != null && (typeof remoto !== 'object' || Array.isArray(remoto)))) return null
  const base = Object.hasOwn(catalogo, id || '') ? catalogo[id] : null
  if (!base && !remoto) return null
  const livro = { ...(base || {}), ...(remoto || {}) }
  if (base?.descricao && Number(remoto?.versaoDescricaoEditorial || 0) < base.versaoDescricaoEditorial) livro.descricao = base.descricao
  const publico = livroPublico(livro)
  if (publico && /^(?:livros|capas)\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$/.test(base?.capa || '') && capaPublica(base.capa) === publico.capa && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) publico.capaLocal = id + '.png'
  return publico
}

function referenciaBiblica(conteudo) {
  const nome = livrosBiblicos.find(l => String(l.id) === conteudo.livro)?.nome
  return nome && conteudo.capitulo ? `${nome} ${conteudo.capitulo}${conteudo.versiculos ? `:${conteudo.versiculos}` : ''}${conteudo.versao ? ` (${conteudo.versao.toUpperCase()})` : ''}` : ''
}

async function previaCompartilhamento(dados = {}, provedores = {}) {
  const { buscarLivro = async () => null, buscarVersiculo = async () => null, buscarCantico = async () => null, buscarDestaque = async () => null } = provedores
  const conteudo = identificacao(dados)
  const previa = { titulo: NOME, descricao: DESCRICAO, imagem: linkImagem('logo'), imagemTipo: 'image/png', imagemLargura: 512, imagemAltura: 512, imagemAlt: `Logo da ${NOME}`, conteudo }
  const usarSecao = id => {
    const secao = Object.hasOwn(secoes, id || '') ? secoes[id] : null
    if (!secao) return
    previa.titulo = `${secao.titulo} | ${NOME}`
    previa.descricao = secao.descricao
    previa.imagem = linkImagem('secao', id)
    previa.imagemTipo = 'image/png'
    delete previa.imagemLargura; delete previa.imagemAltura
    previa.imagemAlt = secao.titulo
  }
  switch (conteudo.tipo) {
    case 'secao': usarSecao(conteudo.id); break
    case 'livro': {
      const livro = ID.test(conteudo.id || '') ? livroCatalogoPublico(conteudo.id, await buscarLivro(conteudo.id)) : null
      if (!livro) { previa.conteudo = { tipo: 'secao', id: 'livraria' }; usarSecao('livraria'); break }
      previa.titulo = `${livro.titulo}${livro.autor ? ` — ${livro.autor}` : ''}`
      previa.descricao = [livro.descricao, `Conheça este livro na Livraria Cristã da ${NOME}.`].filter(Boolean).join(' ')
      if (livro.capa) {
        previa.imagem = linkImagem('capa', conteudo.id)
        previa.imagemTipo = 'image/png'
        delete previa.imagemLargura; delete previa.imagemAltura
        previa.imagemAlt = `Capa de ${livro.titulo}`
      }
      break
    }
    case 'biblia': {
      usarSecao('biblia')
      previa.titulo = `${referenciaBiblica(conteudo)} | ${NOME}`
      previa.descricao = 'Leia esta passagem e seu contexto na Bíblia do Discípulo Cristão.'
      break
    }
    case 'strong': usarSecao('explicados'); previa.titulo = `Estudo Strong ${conteudo.id} | ${NOME}`; previa.descricao = 'Conheça o significado desta palavra e aprofunde o estudo do texto bíblico.'; break
    case 'discipulado': {
      usarSecao('discipulado')
      const detalhe = [conteudo.id, conteudo.licao && `lição ${conteudo.licao}`, conteudo.parte === 'questao' && conteudo.numero && `questão ${conteudo.numero}`, conteudo.parte === 'devocional' && conteudo.dia && `devocional ${conteudo.dia}`].filter(Boolean).join(' · ')
      previa.titulo = `Discipulado${detalhe ? ` — ${detalhe}` : ''} | ${NOME}`
      break
    }
    case 'dia':
    case 'versiculo': {
      usarSecao('mural')
      const id = conteudo.tipo === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(conteudo.id || '') ? `versiculo-dia-${conteudo.id}` : conteudo.tipo === 'versiculo' ? conteudo.id : ''
      const item = ID.test(id || '') ? await buscarVersiculo(id) : null
      const referencia = texto(item?.referencia, 100)
      const data = conteudo.tipo === 'dia' && /^\d{4}-\d{2}-\d{2}$/.test(conteudo.id || '') ? conteudo.id.split('-').reverse().join('/') : ''
      previa.titulo = [conteudo.tipo === 'dia' ? 'Versículo do dia' : 'Versículo compartilhado', referencia, data].filter(Boolean).join(' — ') + ` | ${NOME}`
      if (texto(item?.texto, 240)) previa.descricao = texto(item.texto, 240)
      break
    }
    case 'cantico': {
      usarSecao('canticos')
      const chave = String(conteudo.id || '').toLowerCase().replace(/^0+(?=\d)/, '')
      const indice = conteudo.grupo === 'cifras' ? referencias.cifras : conteudo.grupo === 'salmos' ? referencias.salmos : referencias.hinos
      let item = Object.hasOwn(indice, chave) ? indice[chave] : null
      if (conteudo.grupo === 'outras-cancoes' && ID.test(conteudo.id || '')) {
        const compartilhado = await buscarCantico(conteudo.id)
        item = compartilhado && !compartilhado.localPrivado && !compartilhado.excluido && compartilhado.publicado !== false ? compartilhado : null
      }
      const rotulo = conteudo.grupo === 'salmos' ? 'Salmo' : ['letra', 'cifras'].includes(conteudo.grupo) ? 'Hino' : 'Cântico'
      const numero = texto(item?.numero || (/^\d[\da-z_-]{0,9}$/i.test(conteudo.id || '') ? conteudo.id : ''), 20)
      const titulo = texto(item?.titulo, 160)
      const nome = conteudo.grupo === 'salmos' && /^salmo\b/i.test(titulo) ? titulo : `${rotulo}${numero ? ` ${numero}` : ''}${titulo ? ` — ${titulo}` : ''}`
      previa.titulo = `${nome}${conteudo.grupo === 'cifras' ? ' (cifras)' : ''} | ${NOME}`
      break
    }
    case 'doutrina': {
      usarSecao('westminster')
      const nome = { confissao: 'Confissão de Fé de Westminster', 'catecismo-maior': 'Catecismo Maior de Westminster', 'catecismo-breve': 'Breve Catecismo de Westminster' }[conteudo.id] || 'Padrões de Westminster'
      previa.titulo = `${nome}${conteudo.capitulo ? ` — capítulo ${conteudo.capitulo}` : ''}${conteudo.pergunta ? ` — pergunta ${conteudo.pergunta}` : ''} | ${NOME}`
      break
    }
    case 'estudo': usarSecao('estudos'); previa.titulo = `Estudo bíblico${referenciaBiblica(conteudo) ? ` — ${referenciaBiblica(conteudo)}` : ' compartilhado'} | ${NOME}`; break
    case 'explicacao': usarSecao('explicados'); previa.titulo = `Versículos explicados — ${referenciaBiblica(conteudo)} | ${NOME}`; break
    case 'teologia': usarSecao('teologia'); previa.titulo = `Conteúdo teológico${conteudo.id ? ` — ${conteudo.id.replace(/-/g, ' ')}` : ''} | ${NOME}`; break
    case 'avaliacao': usarSecao('estudos'); previa.titulo = `Resultado de avaliação bíblica | ${NOME}`; break
    case 'devocional': {
      usarSecao('devocional')
      const item = Object.hasOwn(referencias.devocionais, conteudo.id || '') ? referencias.devocionais[conteudo.id] : null
      previa.titulo = item ? `Devocional — Dia ${item.ordem}: ${texto(item.titulo, 160)} | ${NOME}` : `Devocional | ${NOME}`
      break
    }
    case 'destaque': {
      const item = ID.test(conteudo.id || '') ? await buscarDestaque(conteudo.id) : null
      const inicio = Number(item?.inicioEm || 0), fim = Number(item?.fimEm || 0), agora = Date.now()
      if (!item || item.ativo === false || item.publicado === false || item.excluido || !Number.isFinite(inicio) || !Number.isFinite(fim) || inicio > agora || (fim && fim <= agora)) break
      if (item.livroId) {
        if (!ID.test(item.livroId)) break
        return previaCompartilhamento({ tipo: 'livro', id: item.livroId, convite: dados.convite }, provedores)
      }
      previa.titulo = `${texto(item.titulo, 160) || 'Mensagem do dia'} | ${NOME}`
      previa.descricao = [texto(item.texto, 240), texto(item.autor, 100)].filter(Boolean).join(' — ')
      break
    }
  }
  const url = new URL(DOWNLOAD)
  for (const [chave, valor] of Object.entries(previa.conteudo)) if (valor) url.searchParams.set(chave, valor)
  if (/^[a-f0-9]{32}$/.test(dados.convite || '')) url.searchParams.set('convite', dados.convite)
  previa.url = url.href
  return previa
}

module.exports = { previaCompartilhamento, livroPublico, livroCatalogoPublico, secoes, DOWNLOAD, NOME, DESCRICAO, identificacao }
