const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { decidirArquivo } = require('../functions/src/bibliotecaDegustacao')
const inicio = performance.now()
let agora = 1800000000000, grupos = 0
const dados = {}, usuarios = new Map()
class Relogio extends Date { static now() { return agora } }
function obter(path) { return path.split('/').filter(Boolean).reduce((v, k) => v?.[k], dados) ?? null }
function salvar(path, value) {
  const partes = path.split('/').filter(Boolean), chave = partes.pop()
  const pai = partes.reduce((v, k) => v[k] ||= {}, dados)
  if (value == null) delete pai[chave]; else pai[chave] = structuredClone(value)
}
const snap = valor => ({ val: () => structuredClone(valor) })
const referencia = path => ({
  child: child => referencia(`${path}/${child}`), get: async () => snap(obter(path)), set: async value => salvar(path, value),
  transaction: async fn => {
    // Simula o primeiro callback vazio do RTDB mesmo com dados existentes.
    const frio = fn(null)
    if (frio === undefined) return { committed: false, snapshot: snap(obter(path)) }
    const novo = fn(structuredClone(obter(path)))
    if (novo === undefined) return { committed: false, snapshot: snap(obter(path)) }
    salvar(path, novo)
    return { committed: true, snapshot: snap(obter(path)) }
  },
})
class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details } }
const api = {}
vm.runInNewContext(fs.readFileSync('functions/src/projetoCompartilhamento.js', 'utf8'), {
  exports: api, Date: Relogio, require: nome => {
    if (nome === './firebaseAdmin') return { database: () => ({ ref: referencia }), auth: () => ({ getUser: async uid => { if (!usuarios.has(uid)) throw Error('Conta ausente'); return usuarios.get(uid) } }) }
    if (nome === 'firebase-functions/v2/https') return { onCall: (_, fn) => fn, HttpsError }
    if (nome === 'node:crypto') return crypto
    if (nome === './projetoIndicacoesContagem') return require('../functions/src/projetoIndicacoesContagem')
    throw Error(nome)
  },
})
function usuario(uid, extras = {}) { usuarios.set(uid, { uid, email: `${uid}@example.com`, emailVerified: true, providerData: [{ providerId: 'password' }], metadata: { creationTime: new Date(agora).toISOString() }, ...extras }); return uid }
const req = (uid, data = {}) => ({ auth: uid ? { uid } : undefined, data })
async function visita(codigo, dispositivo) { return api.registrarVisitaConviteProjeto(req(null, { codigo, dispositivo })) }
async function confirmar(uid, codigo, dispositivo, extras = {}) {
  const v = await visita(codigo, dispositivo)
  usuario(uid, extras)
  return api.confirmarIndicacaoProjeto(req(uid, { recibo: v.recibo, dispositivo }))
}
;(async () => {
  salvar('bibliotecaLivros', { livro: { titulo: 'Livro de teste', publicado: true, arquivos: { completo: { chave: 'privado.epub' } } }, outro: { titulo: 'Outro título', publicado: true, arquivos: { completo: { chave: 'outro.epub' } } }, rascunho: { publicado: false } })
  usuario('autor')
  const base = { dispositivo: 'aparelho-autor-123456789' }
  const campanha = await api.obterCampanhaProjeto(req('autor', base))
  assert.equal(campanha.meta, 10); assert.equal(campanha.total, 0); assert.equal(campanha.creditos, 0)
  assert.equal((await api.obterCampanhaProjeto(req('autor', base))).codigo, campanha.codigo)
  assert.equal(campanha.livros.length, 2); grupos++
  await assert.rejects(api.obterCampanhaProjeto(req(null, base)), { code: 'unauthenticated' })
  await assert.rejects(visita('invalido', 'aparelho-qualquer-123456'), { code: 'invalid-argument' }); grupos++
  const aparelho = 'primeiro-aparelho-123456'
  const v = await visita(campanha.codigo, aparelho)
  usuario('primeiro')
  assert.equal((await api.confirmarIndicacaoProjeto(req('primeiro', { recibo: v.recibo, dispositivo: aparelho }))).contabilizada, true)
  await api.confirmarIndicacaoProjeto(req('primeiro', { recibo: v.recibo, dispositivo: aparelho }))
  assert.equal((await api.obterCampanhaProjeto(req('autor', base))).total, 1, 'Repetir confirmação não duplica o crédito'); grupos++
  assert.equal((await confirmar('mesmo-aparelho', campanha.codigo, aparelho)).contabilizada, false)
  assert.equal((await confirmar('email-repetido', campanha.codigo, 'aparelho-email-diferente', { email: 'primeiro@example.com' })).contabilizada, false); grupos++
  assert.equal((await confirmar('antigo', campanha.codigo, 'aparelho-antigo-123456', { metadata: { creationTime: new Date(agora - 1).toISOString() } })).contabilizada, false)
  assert.equal((await confirmar('mesmo-do-autor', campanha.codigo, base.dispositivo)).contabilizada, false)
  const propria = await visita(campanha.codigo, 'outro-aparelho-autor-123')
  assert.equal((await api.confirmarIndicacaoProjeto(req('autor', { recibo: propria.recibo, dispositivo: 'outro-aparelho-autor-123' }))).contabilizada, false); grupos++
  await assert.rejects(confirmar('nao-verificado', campanha.codigo, 'aparelho-nao-verificado', { emailVerified: false }), { code: 'failed-precondition' })
  const roubado = await visita(campanha.codigo, 'aparelho-legitimo-1234')
  usuario('falsificado')
  await assert.rejects(api.confirmarIndicacaoProjeto(req('falsificado', { recibo: roubado.recibo, dispositivo: 'aparelho-diferente-123' })), { code: 'failed-precondition' }); grupos++
  usuario('outro-autor')
  const c2 = await api.obterCampanhaProjeto(req('outro-autor', { dispositivo: 'aparelho-outro-autor-123' }))
  assert.equal((await confirmar('primeiro', c2.codigo, 'novo-aparelho-primeiro-123')).contabilizada, false)
  assert.equal((await api.obterCampanhaProjeto(req('outro-autor', { dispositivo: 'aparelho-outro-autor-123' }))).total, 0); grupos++
  for (let i = 2; i <= 5; i++) assert.equal((await confirmar(`pessoa-${i}`, campanha.codigo, `aparelho-pessoa-${i}-123456`)).contabilizada, true)
  const cinco = await api.obterCampanhaProjeto(req('autor', base))
  assert.equal(cinco.total, 5); assert.equal(cinco.creditos, 0)
  await assert.rejects(api.resgatarLeituraProjeto(req('autor', { livroId: 'livro' })), { code: 'failed-precondition' }); grupos++
  for (let i = 6; i <= 9; i++) assert.equal((await confirmar(`pessoa-${i}`, campanha.codigo, `aparelho-pessoa-${i}-123456`)).contabilizada, true)
  assert.equal((await api.obterCampanhaProjeto(req('autor', base))).creditos, 0)
  await assert.rejects(api.resgatarLeituraProjeto(req('autor', { livroId: 'livro' })), { code: 'failed-precondition' })
  assert.equal((await confirmar('pessoa-10', campanha.codigo, 'aparelho-pessoa-10-123456')).contabilizada, true)
  const dez = await api.obterCampanhaProjeto(req('autor', base))
  assert.equal(dez.total, 10); assert.equal(dez.creditos, 1); grupos++
  const simultaneos = await Promise.allSettled(['livro', 'outro'].map(livroId => api.resgatarLeituraProjeto(req('autor', { livroId }))))
  assert.equal(simultaneos.filter(r => r.status === 'fulfilled').length, 1, 'Um crédito não pode liberar dois livros em concorrência')
  const beneficio = simultaneos.find(r => r.status === 'fulfilled').value
  assert.equal(beneficio.acessoAte, agora + 7 * 86400000)
  assert.equal((await api.obterCampanhaProjeto(req('autor', base))).creditos, 0)
  assert.equal(obter('bibliotecaAcessos/autor/livro'), null, 'Benefício não cria compra permanente'); grupos++
  const livro = { publicado: true }
  const leitura = decidirArquivo({ livro, finalidade: 'completo', agora, acessoTemporarioAte: beneficio.acessoAte })
  assert.equal(leitura.finalidade, 'completo'); assert.equal(leitura.acessoAte, beneficio.acessoAte)
  assert.ok(decidirArquivo({ livro, finalidade: 'completo', agora: beneficio.acessoAte, acessoTemporarioAte: beneficio.acessoAte }).erro)
  assert.ok(decidirArquivo({ livro: { ...livro, downloadPermitido: true }, finalidade: 'completo', agora, acessoTemporarioAte: beneficio.acessoAte, download: true }).erro)
  assert.ok(decidirArquivo({ livro: { publicado: false }, finalidade: 'completo', agora, acessoTemporarioAte: beneficio.acessoAte }).erro); grupos++
  const registrarIos = require('../functions/src/projetoCliqueIos').criarRegistroCliqueIos(() => ({ ref: referencia }))
  usuario('autor-ios')
  const baseIos = { dispositivo: 'aparelho-autor-ios-123456' }
  const campanhaIos = await api.obterCampanhaProjeto(req('autor-ios', baseIos))
  for (let i = 0; i < 9; i++) await confirmar(`misto-${i}`, campanhaIos.codigo, `aparelho-misto-${i}-123456`)
  const navegador = 'a'.repeat(64)
  assert.equal((await registrarIos({ codigo: campanhaIos.codigo, navegador })).contabilizada, true)
  const mista = await api.obterCampanhaProjeto(req('autor-ios', baseIos))
  assert.equal(mista.total, 10); assert.equal(mista.contasConfirmadas, 9); assert.equal(mista.cliquesIos, 1); assert.equal(mista.creditos, 1)
  const leituraIos = await api.resgatarLeituraProjeto(req('autor-ios', { livroId: 'livro' }))
  assert.equal(leituraIos.acessoAte, agora + 7 * 86400000); grupos++
  assert.equal((await registrarIos({ codigo: campanhaIos.codigo, navegador })).contabilizada, false)
  assert.equal((await registrarIos({ codigo: campanha.codigo, navegador })).contabilizada, false)
  assert.equal((await api.obterCampanhaProjeto(req('autor-ios', baseIos))).total, 10)
  assert.equal((await registrarIos({ codigo: 'invalido', navegador })).contabilizada, false)
  assert.equal((await registrarIos({ codigo: campanhaIos.codigo, navegador: 'invalido' })).contabilizada, false)
  assert.equal((await registrarIos({ codigo: 'f'.repeat(32), navegador: 'b'.repeat(64) })).contabilizada, false); grupos++
  const repetidos = await Promise.all(Array.from({length:5}, () => registrarIos({ codigo: campanhaIos.codigo, navegador: 'c'.repeat(64) })))
  assert.equal(repetidos.filter(r => r.contabilizada).length, 1)
  assert.equal((await api.obterCampanhaProjeto(req('autor-ios', baseIos))).total, 11)
  const gravados = Object.values(obter('projetoIndicacoes/contas/autor-ios/cliquesIos'))
  assert.ok(gravados.every(r => r.tipo === 'clique_ios')); grupos++
  const interrompido = 'd'.repeat(64), hashIos = crypto.createHash('sha256').update(interrompido).digest('hex')
  salvar(`projetoIndicacoes/iosNavegadores/${hashIos}`, { indicador: 'autor-ios', criadoEm: agora - 1000 })
  assert.equal((await registrarIos({ codigo: campanhaIos.codigo, navegador: interrompido })).contabilizada, true)
  assert.equal(obter(`projetoIndicacoes/contas/autor-ios/cliquesIos/${hashIos}`).criadoEm, agora - 1000)
  assert.equal((await registrarIos({ codigo: campanhaIos.codigo, navegador: interrompido })).contabilizada, false); grupos++
  const expirado = await visita(campanha.codigo, 'aparelho-convite-expirado')
  usuario('tardio'); agora += 31 * 86400000
  await assert.rejects(api.confirmarIndicacaoProjeto(req('tardio', { recibo: expirado.recibo, dispositivo: 'aparelho-convite-expirado' })), { code: 'failed-precondition' })
  assert.equal((await api.obterCampanhaProjeto(req('autor', base))).beneficios.length, 0); grupos++
  console.log(`Indicações: ${grupos}/${grupos} grupos aprovados (100%); falhas: 0%; tempo: ${((performance.now() - inicio) / 1000).toFixed(2)} s. RTDB e contas simulados; sem concessões reais.`)
})().catch(e => { console.error(e); process.exitCode = 1 })
