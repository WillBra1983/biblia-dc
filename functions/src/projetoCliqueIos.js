const { createHash } = require('node:crypto')

function criarRegistroCliqueIos(database) {
  return async function registrarCliqueIos({ codigo, navegador }) {
    if (!/^[a-f0-9]{32}$/.test(codigo || '') || !/^[a-f0-9]{64}$/.test(navegador || '')) return { contabilizada: false }
    const raiz = database().ref('projetoIndicacoes')
    const convite = (await raiz.child(`convites/${codigo}`).get()).val()
    if (!convite?.uid || typeof convite.uid !== 'string') return { contabilizada: false }
    const chave = createHash('sha256').update(navegador).digest('hex')
    // A reserva global impede repetir o mesmo navegador com outro remetente.
    // A repetição com o mesmo remetente pode concluir uma escrita interrompida.
    const reserva = await raiz.child(`iosNavegadores/${chave}`).transaction(atual => {
      if (!atual) return { indicador: convite.uid, criadoEm: Date.now() }
      return atual.indicador === convite.uid ? atual : undefined
    })
    if (!reserva.committed) return { contabilizada: false }
    const criadoEm = reserva.snapshot.val().criadoEm
    const resultado = await raiz.child(`contas/${convite.uid}`).transaction(atual => {
      if (!atual) return null
      if (atual.cliquesIos?.[chave]) return undefined
      return { ...atual, cliquesIos: { ...atual.cliquesIos, [chave]: { criadoEm, tipo: 'clique_ios' } } }
    })
    return { contabilizada: resultado.committed && Boolean(resultado.snapshot.val()?.cliquesIos?.[chave]) }
  }
}

module.exports = { criarRegistroCliqueIos, registrarCliqueIos: criarRegistroCliqueIos(() => require('./firebaseAdmin').database()) }
