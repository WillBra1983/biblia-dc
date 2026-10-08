import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { transformSync } from 'esbuild'

const contexto = { exports: {}, require: (nome) => nome === './firebaseAdmin' ? {} : { onCall: (_, handler) => handler, HttpsError: Error } }
vm.runInNewContext(fs.readFileSync('functions/src/destaquesInteracoes.js', 'utf8'), contexto)
const atualizar = contexto.exports.atualizarInteracao
let estado = atualizar(null, 'a', { tipo: 'consulta' }, { antigo: true })
assert.equal(estado.likesCount, 1)
estado = atualizar(estado, 'a', { tipo: 'curtida', curtido: true })
assert.equal(estado.likesCount, 2)
estado = atualizar(estado, 'a', { tipo: 'curtida', curtido: true })
assert.equal(estado.likesCount, 2, 'Reenvio não duplica curtida')
estado = atualizar(estado, 'a', { tipo: 'curtida', curtido: false })
assert.equal(estado.likesCount, 1)
estado = atualizar(estado, 'antigo', { tipo: 'curtida', curtido: false })
assert.equal(estado.likesCount, 0)
for (const eventoId of ['um', 'um', 'dois']) estado = atualizar(estado, 'a', { tipo: 'compartilhamento', eventoId })
assert.equal(estado.sharesCount, 2, 'Cada envio confirmado conta apenas uma vez')
const rules = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules.destaquesMenuInteracoes
assert.equal(rules['.write'], false)
assert.equal(rules.$destaqueId.likesCount['.read'], true)
assert.equal(rules.$destaqueId.sharesCount['.read'], true)
assert.equal(rules.$destaqueId.curtidas.$uid['.read'], 'auth != null && auth.uid === $uid')
for (const arquivo of ['src/components/AcoesDestaque.jsx', 'src/components/MenuCards.jsx', 'src/pages/VersiculoDoDia.jsx']) {
  const source = fs.readFileSync(arquivo, 'utf8')
  transformSync(source, { loader: 'jsx' })
  assert.match(source, /likesCount > 0/)
  assert.match(source, /sharesCount > 0/)
}
console.log('OK: curtidas preservadas, remoção, envios sem duplicação, privacidade e ocultação de zero.')
