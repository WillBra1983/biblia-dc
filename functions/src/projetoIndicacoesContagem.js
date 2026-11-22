function totaisIndicacoes(dados = {}) {
  const contas = Object.keys(dados.confirmadas || {}).length
  const cliquesIos = Object.keys(dados.cliquesIos || {}).length
  return { contas, cliquesIos, total: contas + cliquesIos }
}

module.exports = { totaisIndicacoes }
