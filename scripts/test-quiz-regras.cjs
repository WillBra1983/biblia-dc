const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const rules = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules.quizRetiroTorneios.$torneioId
const snapshot = value => ({ val: () => value ?? null, exists: () => value != null, child: key => snapshot(value?.[key]) })
const verified = uid => ({ uid, token: { email_verified: true } })
const root = snapshot({ quizRetiroTorneios: { retiro: { config: { criadoPorUid: 'dono' } } } })
let count = 0
function check(rule, uid, old, next, expected, label) {
  const auth = uid === null ? null : uid === 'naoVerificado' ? { uid, token: { email_verified: false } } : verified(uid)
  const result = vm.runInNewContext(rule, { auth, root, data: snapshot(old), newData: snapshot(next), $torneioId: 'retiro', $uid: 'jogador', $teamId: 'time1' })
  assert.equal(Boolean(result), expected, label)
  count++
}
for (const name of ['meta', 'timesBloqueados']) {
  const rule = name === 'meta' ? rules.meta['.write'] : rules.timesBloqueados.$teamId['.write']
  check(rule, 'dono', {}, { liberado: true }, true, name + ' organizador')
  check(rule, 'jogador', {}, { liberado: true }, false, name + ' outro usuário')
  check(rule, null, {}, {}, false, name + ' sem login')
}
const config = rules.config['.write']
check(config, 'dono', null, { criadoPorUid: 'dono' }, true, 'criar competição')
check(config, 'jogador', null, { criadoPorUid: 'dono' }, false, 'não atribuir outro criador')
check(config, 'jogador', { criadoPorUid: 'dono' }, { criadoPorUid: 'jogador' }, false, 'não tomar competição')
check(config, 'dono', { criadoPorUid: 'dono' }, { criadoPorUid: 'dono' }, true, 'editar própria competição')
check(config, 'dono', { criadoPorUid: 'dono' }, { criadoPorUid: 'jogador' }, false, 'criador imutável')
check(config, 'naoVerificado', null, { criadoPorUid: 'naoVerificado' }, false, 'e-mail confirmado')
for (const rule of [rules.participantes.$uid['.write'], rules.jogadores.$teamId.$uid['.write']]) {
  check(rule, 'jogador', null, { nome: 'Jogador' }, true, 'inscrição própria')
  check(rule, 'estranho', {}, null, false, 'terceiro não exclui participante')
  check(rule, 'dono', {}, null, true, 'organizador pode remover')
  check(rule, 'dono', {}, { nome: 'Outro' }, false, 'organizador não se passa pelo participante')
  check(rule, 'naoVerificado', null, {}, false, 'inscrição exige verificação')
}
const reentry = rules.reentradas.$uid['.write']
check(reentry, 'jogador', null, { status: 'pendente' }, true, 'pedir reentrada')
check(reentry, 'jogador', { status: 'pendente' }, { status: 'aprovado' }, false, 'não aprovar própria entrada')
check(reentry, 'dono', { status: 'pendente' }, { status: 'aprovado', respondidoEm: 1 }, true, 'organizador aprova')
check(reentry, 'estranho', null, { status: 'pendente' }, false, 'não pedir em nome de outro')
check(reentry, 'jogador', null, { status: 'pendente', respondidoEm: 1 }, false, 'não simular resposta do organizador')
console.log(`Regras do Quiz: ${count}/${count} cenários das expressões aprovados localmente (sem emulador Firebase).`)
