import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { validarCopiaCola, crc16, definirValorCopiaCola } = require('../functions/src/bibliotecaPixPayload.js')
const codigo = "00020126950014br.gov.bcb.pix01361676372a-157b-47b2-a141-1a7f38475f1f0233Cofrinho de WILSON LUCAS FERREIRA5204000053039865802BR5921WILSON LUCAS FERREIRA6009Ji-Parana61087690761662270523COFRVjIwMDZCUVVPMDAwMDM630474B6"
assert.equal(validarCopiaCola(codigo).codigo, codigo)
assert.equal(validarCopiaCola(codigo).chave, '1676372a-157b-47b2-a141-1a7f38475f1f')
assert.throws(() => validarCopiaCola(codigo.slice(0, 100)))
assert.throws(() => validarCopiaCola(codigo.slice(0, -4) + '0000'))
const valores = new Map([['users/admin/admin', true], ['bibliotecaLivros/livro', { pixAtivo: true, precoPixCentavos: 1990, arquivos: { completo: { chave: 'livro.pdf' } } }]])
function snap(value) { return { exists: () => value != null, val: () => value, child: key => snap(value?.[key]), forEach: fn => Object.entries(value || {}).forEach(([key, v]) => fn({ key, val: () => v })) } }
let pedidos = {}
let cacheFrio = false
let duranteTransacao = null
const ref = (path = '') => ({
  key: path.split('/').at(-1),
  get: async () => snap(valores.get(path)),
  set: async value => valores.set(path, value),
  update: async value => {
    if (path) { valores.set(path, { ...valores.get(path), ...value }); return }
    for (const [key, v] of Object.entries(value)) {
      const partes = key.split('/')
      const campo = partes.pop()
      const alvo = partes.join('/')
      if (partes.length === 2 && partes[0] === 'bibliotecaPedidos') valores.set(alvo, { ...valores.get(alvo), [campo]: v })
      else valores.set(key, v)
    }
  },
  transaction: async fn => {
    if (cacheFrio) {
      const inicial = fn(null)
      if (inicial === undefined) return { committed: false, snapshot: snap(null) }
    }
    duranteTransacao?.(path)
    const value = fn(valores.get(path) ?? null)
    if (value === undefined) return { committed: false, snapshot: snap(valores.get(path)) }
    if (value === null) valores.delete(path)
    else valores.set(path, value)
    return { committed: true, snapshot: snap(value) }
  },
  push: () => ref('bibliotecaPedidos/novo-pedido'),
  orderByChild: campo => ({ equalTo: valor => ({ get: async () => snap(path === 'bibliotecaVinculosVisitantes'
    ? Object.fromEntries([...valores].filter(([key, item]) => key.startsWith(path + '/') && item[campo] === valor).map(([key, item]) => [key.slice(path.length + 1), item]))
    : pedidos) }) }),
})
class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details } }
const api = {}
vm.runInNewContext(fs.readFileSync('functions/src/bibliotecaPix.js', 'utf8'), { exports: api, Buffer, require: name => {
  if (name === './firebaseAdmin') return { database: () => ({ ref }) }
  if (name === './bibliotecaPixPayload') return { validarCopiaCola, crc16, definirValorCopiaCola }
  if (name === 'qrcode') return { toDataURL: async value => value }
  if (name === './bibliotecaVisitante') return { identificarLeitor: async req => req.auth?.uid || 'visitante' }
  if (name === './push') return { enviarParaUsuarios: async () => {} }
  if (name === 'firebase-functions/v2/https') return { onCall: (_, fn) => fn, HttpsError }
  throw new Error(name)
} })
await api.salvarConfiguracaoPixBiblioteca({ auth: { uid: 'admin' }, data: { chave: codigo } })
assert.equal(valores.get('bibliotecaConfiguracao/pix').pixCopiaCola, codigo)
for (const auth of [undefined, { uid: 'email-senha' }]) {
  const pedido = await api.criarPedidoPixBiblioteca({ auth, data: { livroId: 'livro', nomeComprador: 'Maria da Silva' } })
  assert.equal(pedido.pixCopiaCola, codigo)
  assert.equal(pedido.qrCodeDataUrl, codigo)
}
pedidos = { antigo: { uid: 'visitante', livroId: 'livro', codigo: 'ANTIGO', pixCopiaCola: 'invalido', valorCentavos: 1990, status: 'aguardando_pagamento' } }
assert.equal((await api.criarPedidoPixBiblioteca({ data: { livroId: 'livro', nomeComprador: 'Maria da Silva' } })).pixCopiaCola, codigo)
await assert.rejects(api.salvarConfiguracaoPixBiblioteca({ auth: { uid: 'admin' }, data: { chave: codigo.slice(0, 100) } }), { code: 'invalid-argument' })
console.log('Pix: código completo preservado no cadastro, QR e cópia; CRC, truncamento, visitante, e-mail e pedido pendente verificados.')

const pendencia = { uid: 'visitante', livroId: 'livro', status: 'aguardando_pagamento', pixCopiaCola: codigo, valorCentavos: 1990, codigo: 'PENDENTE' }
valores.set('bibliotecaPedidos/pendente', { ...pendencia })
await assert.rejects(api.removerPendenciaPixBiblioteca({ data: { pedidoId: 'pendente' } }), { code: 'unauthenticated' })
await assert.rejects(api.removerPendenciaPixBiblioteca({ auth: { uid: 'cliente' }, data: { pedidoId: 'pendente' } }), { code: 'permission-denied' })
await api.removerPendenciaPixBiblioteca({ auth: { uid: 'admin' }, data: { pedidoId: 'pendente' } })
assert.equal(valores.get('bibliotecaPedidos/pendente').ocultoAdmin, true)
assert.equal(valores.get('bibliotecaPedidos/pendente').pixCopiaCola, codigo)
pedidos = { pendente: valores.get('bibliotecaPedidos/pendente') }
const retomado = await api.criarPedidoPixBiblioteca({ data: { livroId: 'livro', nomeComprador: 'Maria da Silva' } })
assert.equal(retomado.pedidoId, 'pendente', 'Fechar e reabrir retoma o mesmo pedido, inclusive removido da lista')
await api.informarPagamentoPixBiblioteca({ data: { pedidoId: 'pendente' } })
assert.equal(valores.get('bibliotecaPedidos/pendente').status, 'pagamento_informado')
assert.equal(valores.get('bibliotecaPedidos/pendente').ocultoAdmin, false, 'Pagamento informado volta para conferência')
for (const status of ['pagamento_informado', 'aprovado', 'recusado']) {
  valores.set('bibliotecaPedidos/protegido', { ...pendencia, status })
  await assert.rejects(api.removerPendenciaPixBiblioteca({ auth: { uid: 'admin' }, data: { pedidoId: 'protegido' } }), { code: 'failed-precondition' })
  assert.equal(valores.get('bibliotecaPedidos/protegido').status, status)
}
console.log('Pendências: remoção exclusiva de administrador, retomada do mesmo Pix, retorno à conferência e proteção de pagamentos aprovados/informados verificados.')

// A observação deve chegar ao dono do pedido, inclusive visitante, e persistir na reabertura.
const adminReq = { auth: { uid: 'admin' }, data: { pedidoId: 'pendente', aprovado: false, observacao: 'Não recebemos o Pix de R$ 19,90. Envie o comprovante para conferência.' } }
await api.decidirPedidoPixBiblioteca(adminReq)
assert.equal(valores.get('bibliotecaPedidos/pendente').status, 'recusado')
assert.equal(valores.get('bibliotecaPedidos/pendente').observacaoAdmin, adminReq.data.observacao)
const consulta = await api.consultarPedidoPixBiblioteca({ data: { pedidoId: 'pendente' } })
assert.equal(consulta.observacaoAdmin, adminReq.data.observacao)
assert.equal(consulta.status, 'recusado')
await assert.rejects(api.consultarPedidoPixBiblioteca({ auth: { uid: 'intruso' }, data: { pedidoId: 'pendente' } }), { code: 'not-found' })
await assert.rejects(api.responderPagamentoNaoLocalizadoBiblioteca({ auth: { uid: 'intruso' }, data: { pedidoId: 'pendente' } }), { code: 'not-found' })
pedidos = { pendente: valores.get('bibliotecaPedidos/pendente') }
const reaberto = await api.criarPedidoPixBiblioteca({ data: { livroId: 'livro', nomeComprador: 'Maria da Silva' } })
assert.equal(reaberto.pedidoId, 'pendente')
assert.equal(reaberto.status, 'recusado')
assert.equal(reaberto.observacaoAdmin, adminReq.data.observacao)
await api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'pendente' } })
assert.equal(valores.get('bibliotecaPedidos/pendente').status, 'aguardando_pagamento')
assert.equal(valores.get('bibliotecaPedidos/pendente').respostaCliente, 'Ainda não fiz o pagamento.')
assert.equal((await api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'pendente' } })).status, 'aguardando_pagamento', 'Resposta repetida retorna o mesmo estado')
await api.informarPagamentoPixBiblioteca({ data: { pedidoId: 'pendente' } })
await api.decidirPedidoPixBiblioteca({ ...adminReq, data: { pedidoId: 'pendente', aprovado: false } })
assert.match(valores.get('bibliotecaPedidos/pendente').observacaoAdmin, /Não localizamos/)
// Após receber comprovante e conferir o banco, o administrador pode aprovar o mesmo pedido.
await api.decidirPedidoPixBiblioteca({ ...adminReq, data: { pedidoId: 'pendente', aprovado: true } })
assert.equal(valores.get('bibliotecaPedidos/pendente').status, 'aprovado')
assert.equal(valores.get('bibliotecaAcessos/visitante/livro').ativo, true)
await assert.rejects(api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'pendente' } }), { code: 'failed-precondition' })
// Contas por e-mail e visitantes vinculados recebem apenas o próprio status.
valores.set('bibliotecaPedidos/email', { ...pendencia, uid: 'conta-email', status: 'recusado', observacaoAdmin: 'Conferir comprovante.' })
assert.equal((await api.consultarPedidoPixBiblioteca({ auth: { uid: 'conta-email' }, data: { pedidoId: 'email' } })).observacaoAdmin, 'Conferir comprovante.')
valores.set('bibliotecaPedidos/vinculado', { ...pendencia, uid: 'visitante_original', status: 'recusado' })
valores.set('bibliotecaVinculosVisitantes/visitante_original', { uid: 'conta-email' })
assert.equal((await api.consultarPedidoPixBiblioteca({ auth: { uid: 'conta-email' }, data: { pedidoId: 'vinculado' } })).status, 'recusado')
console.log('Comunicação: observação persistente, reabertura do mesmo pedido, autorização, resposta de não pagamento e aprovação após conferência verificadas.')

// O visitante precisa se identificar, e o nome deve aparecer inclusive em pedidos antigos.
valores.delete('bibliotecaAcessos/visitante/livro')
pedidos = {}
for (const nomeComprador of ['', '   ', 'Maria', '123 456', 'Maria 123', 'A'.repeat(161) + ' Silva']) {
  await assert.rejects(api.criarPedidoPixBiblioteca({ data: { livroId: 'livro', nomeComprador } }), { code: 'invalid-argument' })
}
await api.criarPedidoPixBiblioteca({ data: { livroId: 'livro', nomeComprador: "  João   D’Ávila  " } })
assert.equal(valores.get('bibliotecaPedidos/novo-pedido').nomeComprador, 'João D’Ávila')
await api.criarPedidoPixBiblioteca({ auth: { uid: 'conta-email', token: { name: 'Nome da Conta', email: 'conta@example.com' } }, data: { livroId: 'livro' } })
assert.equal(valores.get('bibliotecaPedidos/novo-pedido').nomeComprador, 'Nome da Conta')
await api.criarPedidoPixBiblioteca({ auth: { uid: 'conta-email', token: { email: 'conta@example.com' } }, data: { livroId: 'livro' } })
assert.equal(valores.get('bibliotecaPedidos/novo-pedido').nomeComprador, 'conta@example.com')
valores.set('bibliotecaPedidos/sem-nome', { ...pendencia, nomeComprador: '' })
pedidos = { 'sem-nome': valores.get('bibliotecaPedidos/sem-nome') }
const antigoComNome = await api.criarPedidoPixBiblioteca({ data: { livroId: 'livro', nomeComprador: 'Maria da Silva' } })
assert.equal(antigoComNome.pedidoId, 'sem-nome')
assert.equal(valores.get('bibliotecaPedidos/sem-nome').nomeComprador, 'Maria da Silva')
console.log('Nome do visitante: obrigatório, validação de sobrenome, acentos, normalização, gravação, retomada de pedido e identificação de contas verificados.')

// Regressão: a primeira execução pode receber null com o pedido ainda existente.
const inicioRemocao = performance.now()
cacheFrio = true
valores.set('bibliotecaPedidos/frio', { ...pendencia })
await api.removerPendenciaPixBiblioteca({ auth: { uid: 'admin' }, data: { pedidoId: 'frio' } })
const ocultado = valores.get('bibliotecaPedidos/frio')
assert.equal(ocultado.ocultoAdmin, true)
for (const [campo, valor] of Object.entries(pendencia)) assert.equal(ocultado[campo], valor, 'Preserva ' + campo)
assert.equal(ocultado.removidoDaListaPor, 'admin')
await assert.rejects(api.removerPendenciaPixBiblioteca({ auth: { uid: 'admin' }, data: { pedidoId: 'inexistente' } }), { code: 'not-found' })
assert.equal(valores.has('bibliotecaPedidos/inexistente'), false)
for (const status of ['pagamento_informado', 'aprovado', 'recusado']) {
  valores.set('bibliotecaPedidos/protegido-frio', { ...pendencia, status })
  await assert.rejects(api.removerPendenciaPixBiblioteca({ auth: { uid: 'admin' }, data: { pedidoId: 'protegido-frio' } }), { code: 'failed-precondition' })
  assert.equal(valores.get('bibliotecaPedidos/protegido-frio').status, status)
  assert.equal(valores.get('bibliotecaPedidos/protegido-frio').ocultoAdmin, undefined)
}
valores.set('bibliotecaPedidos/concorrente', { ...pendencia })
duranteTransacao = path => { if (path === 'bibliotecaPedidos/concorrente') valores.set(path, { ...pendencia, status: 'aprovado' }) }
await assert.rejects(api.removerPendenciaPixBiblioteca({ auth: { uid: 'admin' }, data: { pedidoId: 'concorrente' } }), { code: 'failed-precondition' })
assert.equal(valores.get('bibliotecaPedidos/concorrente').ocultoAdmin, undefined)
duranteTransacao = null
console.log('Remoção com cache frio: 6/6 cenários aprovados (100%); falhas: 0%; tempo: '+((performance.now()-inicioRemocao)/1000).toFixed(2)+' s. Pedido inexistente e pagamentos protegidos sem alteração.')

const inicioResposta = performance.now()
await api.salvarConfiguracaoPixBiblioteca({ auth: { uid: 'admin' }, data: { chave: 'livraria@example.com', nome: 'Livraria Crista', cidade: 'Tangara' } })
const recusado = { ...pendencia, status: 'recusado', pixCopiaCola: codigo, livroTitulo: 'Livro de teste', observacaoAdmin: 'Envie o comprovante.' }
valores.set('bibliotecaPedidos/resposta-fria', recusado)
const respostaFria = await api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'resposta-fria' } })
assert.equal(respostaFria.status, 'aguardando_pagamento')
assert.notEqual(respostaFria.pixCopiaCola, codigo, 'Substitui o Pix antigo sem exigir reabertura')
assert.equal(validarCopiaCola(respostaFria.pixCopiaCola).chave, 'livraria@example.com')
assert.equal(respostaFria.qrCodeDataUrl, respostaFria.pixCopiaCola)
assert.equal(valores.get('bibliotecaPedidos/resposta-fria').observacaoAdmin, recusado.observacaoAdmin)
assert.equal((await api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'resposta-fria' } })).pixCopiaCola, respostaFria.pixCopiaCola)
for (const status of ['aprovado', 'pagamento_informado']) {
  valores.set('bibliotecaPedidos/resposta-protegida', { ...recusado, status })
  await assert.rejects(api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'resposta-protegida' } }), { code: 'failed-precondition' })
  assert.equal(valores.get('bibliotecaPedidos/resposta-protegida').status, status)
}
valores.set('bibliotecaPedidos/resposta-concorrente', recusado)
duranteTransacao = path => { if (path === 'bibliotecaPedidos/resposta-concorrente') valores.set(path, { ...recusado, status: 'aprovado' }) }
await assert.rejects(api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'resposta-concorrente' } }), { code: 'failed-precondition' })
assert.equal(valores.get('bibliotecaPedidos/resposta-concorrente').pixCopiaCola, codigo)
duranteTransacao = null
await assert.rejects(api.responderPagamentoNaoLocalizadoBiblioteca({ data: { pedidoId: 'sem-pedido' } }), { code: 'not-found' })
valores.set('bibliotecaPedidos/consulta-atualizada', { ...pendencia, pixCopiaCola: codigo })
const consultaAtualizada = await api.consultarPedidoPixBiblioteca({ data: { pedidoId: 'consulta-atualizada', incluirPix: true } })
assert.equal(validarCopiaCola(consultaAtualizada.pixCopiaCola).chave, 'livraria@example.com')
valores.set('bibliotecaPedidos/consulta-recusada', recusado)
assert.equal((await api.consultarPedidoPixBiblioteca({ data: { pedidoId: 'consulta-recusada', incluirPix: true } })).pixCopiaCola, codigo, 'Não altera os dados de um pagamento em disputa')
pedidos = {
  proprio: { ...recusado, uid: 'conta-email' },
  vinculado: { ...recusado, uid: 'visitante_original', atualizadoEm: 99 },
  outro: { ...recusado, uid: 'intruso' },
  visitante: { ...recusado, uid: 'visitante' },
  aprovado: { ...recusado, uid: 'conta-email', status: 'aprovado' },
  pendente: { ...pendencia, uid: 'conta-email', atualizadoEm: 999 },
}
const listaConta = (await api.listarMeusPedidosPixBiblioteca({ auth: { uid: 'conta-email' } })).pedidos
assert.deepEqual(Array.from(listaConta, item => item.pedidoId), ['vinculado', 'proprio', 'pendente'])
assert.ok(listaConta.every(item => !('uid' in item) && !('pixCopiaCola' in item)), 'Entrega somente metadados necessários')
assert.deepEqual(Array.from((await api.listarMeusPedidosPixBiblioteca({ data: {} })).pedidos, item => item.pedidoId), ['visitante'])
assert.equal((await api.listarMeusPedidosPixBiblioteca({ auth: { uid: 'sem-compras' } })).pedidos.length, 0)
const inicioContribuicao = performance.now()
const antesContribuicao = JSON.stringify([...valores.entries()])
const livre = await api.obterPixContribuicao({})
assert.equal(validarCopiaCola(livre.pixCopiaCola).chave, 'livraria@example.com')
assert.equal(validarCopiaCola(livre.pixCopiaCola).valor, undefined, 'Chave simples gera contribuição de valor livre')
assert.equal(livre.valorCentavos, null)
assert.equal(livre.qrCodeDataUrl, livre.pixCopiaCola)
assert.equal(JSON.stringify([...valores.entries()]), antesContribuicao, 'Consultar contribuição não cria pedido nem libera acesso')
assert.deepEqual(Object.keys(livre).sort(), ['nome', 'pixCopiaCola', 'qrCodeDataUrl', 'valorCentavos'], 'Não expõe metadados administrativos')
await api.salvarConfiguracaoPixBiblioteca({ auth: { uid: 'admin' }, data: { chave: codigo } })
const cofrinho = await api.obterPixContribuicao({})
assert.equal(cofrinho.pixCopiaCola, codigo, 'Preserva integralmente o Pix e a identificação do cofrinho')
assert.equal(cofrinho.nome, 'WILSON LUCAS FERREIRA')
assert.equal(cofrinho.valorCentavos, null)
for (const valorCentavos of [200, 500, 1000, 2000, 5000, 10000, 50000, 100000, 1234]) {
  const contribuicao = await api.obterPixContribuicao({ data: { valorCentavos } })
  const payload = validarCopiaCola(contribuicao.pixCopiaCola)
  assert.equal(contribuicao.valorCentavos, valorCentavos)
  assert.equal(Math.round(Number(payload.valor) * 100), valorCentavos)
  assert.equal(payload.chave, validarCopiaCola(codigo).chave)
  assert.ok(contribuicao.pixCopiaCola.includes('Cofrinho de WILSON LUCAS FERREIRA'))
  assert.ok(contribuicao.pixCopiaCola.includes('COFRVjIwMDZCUVVPMDAwMDM'), 'Preserva também o identificador do cofrinho')
}
for (const valorCentavos of [0, -1, 1.5, '200', 10000001, Infinity]) await assert.rejects(api.obterPixContribuicao({ data: { valorCentavos } }), { code: 'invalid-argument' })
console.log('Contribuição com valor: 9/9 valores aprovados (100%); valores inválidos rejeitados e cofrinho preservado.')
const semCrc = codigo.replace('5802BR', '54045.005802BR').slice(0, -4)
const fixo = semCrc + crc16(semCrc)
await api.salvarConfiguracaoPixBiblioteca({ auth: { uid: 'admin' }, data: { chave: fixo } })
assert.equal((await api.obterPixContribuicao({})).valorCentavos, 500, 'Valor fixo cadastrado deve ser informado ao usuário')
valores.set('bibliotecaConfiguracao/pix', { ativo: false })
await assert.rejects(api.obterPixContribuicao({}), { code: 'failed-precondition' })
valores.set('bibliotecaConfiguracao/pix', { ativo: true, chave: 'chave', nome: 'Nome', cidade: 'Cidade', pixCopiaCola: 'truncado' })
await assert.rejects(api.obterPixContribuicao({}), { code: 'failed-precondition' })
console.log('Contribuição Pix: 6/6 grupos aprovados (100%); falhas: 0%; tempo: '+((performance.now()-inicioContribuicao)/1000).toFixed(2)+' s. Sem transferências reais.')
console.log('Resposta e avisos Pix: 10/10 grupos aprovados (100%); falhas: 0%; tempo: '+((performance.now()-inicioResposta)/1000).toFixed(2)+' s. Cache frio, repetição, Pix atualizado, concorrência e isolamento de contas/visitantes verificados.')
