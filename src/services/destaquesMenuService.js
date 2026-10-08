export const LIMITE_APRESENTACAO = 600
export const APRESENTACAO_LUZ_TEMPOS = 'Conheça a história da Reforma inglesa com J. C. Ryle: John Wycliffe, John Rogers, John Hooper, Rowland Taylor, Hugh Latimer, John Bradford, Nicholas Ridley, Samuel Ward, Richard Baxter e William Gurnall. A obra também examina o arcebispo William Laud e o conflito entre Jaime II e os sete bispos. Uma leitura sobre fé, coragem, perseguição e as lições do passado para a igreja de hoje.'

export async function conectarDestaques() {
  const { loadFirebaseModules, getFirebaseDatabase } = await import('../config/firebase')
  await loadFirebaseModules()
  const api = await import('firebase/database')
  const db = getFirebaseDatabase()
  if (!db) throw new Error('Não foi possível conectar. Tente novamente.')
  return { api, db, referencia: api.ref(db, 'destaquesMenu') }
}

export function destaquesAtivos(itens, agora = Date.now()) {
  return itens.filter((item) => item.ativo !== false && (!item.inicioEm || item.inicioEm <= agora) && (!item.fimEm || item.fimEm > agora))
}

export async function registrarInteracaoDestaque(dados) {
  const { getFirebaseFunctions, loadFirebaseModules } = await import('../config/firebase')
  await loadFirebaseModules()
  const functions = getFirebaseFunctions()
  if (!functions) throw new Error('Serviço temporariamente indisponível.')
  const { httpsCallable } = await import('firebase/functions')
  return (await httpsCallable(functions, 'registrarInteracaoDestaque')(dados)).data
}
