function dataLocal() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cuiaba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

async function firebase() {
  const { loadFirebaseModules, getFirebaseDatabase, getFirebaseFunctions } = await import('../config/firebase')
  await loadFirebaseModules()
  const [dbApi, functionsApi] = await Promise.all([
    import('firebase/database'),
    import('firebase/functions'),
  ])
  return { db: getFirebaseDatabase(), fns: getFirebaseFunctions(), dbApi, functionsApi }
}

export function linkComentarioVersiculo(item) {
  if (!item) return ''
  const query = new URLSearchParams({
    livro: String(item.livroId),
    capitulo: String(item.capitulo),
    versiculos: String(item.versiculo),
  })
  const configurada = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim()
  const base = (configurada || 'https://foundcine.com/biblia').replace(/\/$/, '')
  return `${base}/estudos-biblicos/ia-passagem?${query}`
}

export function linkPaginaVersiculoDoDia(item) {
  if (!item?.data) return linkComentarioVersiculo(item)
  const configurada = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim()
  const base = (configurada || 'https://foundcine.com/biblia').replace(/\/$/, '')
  return `${base}/versiculo-do-dia?data=${encodeURIComponent(item.data)}`
}

export async function obterVersiculoDoDia({ selecionarSeAusente = true } = {}) {
  const hoje = dataLocal()
  const { db, fns, dbApi, functionsApi } = await firebase()
  if (!db) return null
  let snap = await dbApi.get(dbApi.ref(db, `versiculosDoDia/${hoje}`))
  if (!snap.child('chave').exists() && selecionarSeAusente && fns) {
    try {
      const resultado = await functionsApi.httpsCallable(fns, 'selecionarVersiculoDoDia', { timeout: 30_000 })()
      if (resultado?.data?.chave) return resultado.data
      snap = await dbApi.get(dbApi.ref(db, `versiculosDoDia/${hoje}`))
    } catch (_) {
      // O cron pode estar terminando a selecao; o menu mantem seu estado neutro.
    }
  }
  return snap.child('chave').exists() ? snap.val() : null
}

export async function abrirVersiculoDoDia() {
  const { fns, functionsApi } = await firebase()
  if (!fns) throw new Error('Servico indisponivel no momento.')
  const resultado = await functionsApi.httpsCallable(fns, 'garantirVersiculoDoDia', { timeout: 240_000 })()
  return resultado?.data?.chave ? resultado.data : null
}

export async function substituirVersiculoDoDia(referencia) {
  const { fns, functionsApi } = await firebase()
  if (!fns) throw new Error('Serviço indisponível no momento.')
  const chamada = functionsApi.httpsCallable(fns, 'substituirVersiculoDoDia', { timeout: 30_000 })
  const resultado = await chamada({ referencia: String(referencia || '').trim() })
  return resultado?.data?.chave ? resultado.data : null
}

export async function obterVersiculoDoDiaPorData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) return null
  const { db, dbApi } = await firebase()
  if (!db) return null
  const snap = await dbApi.get(dbApi.ref(db, `versiculosDoDia/${data}`))
  return snap.child('status').val() === 'pronto' ? snap.val() : null
}

export async function obterComentarioDoDia(item) {
  const publicado = String(item?.comentario || '').trim()
  const estudoKey = String(item?.estudoKey || item?.chave || '').trim()
  if (!estudoKey) return publicado

  try {
    const { db, dbApi } = await firebase()
    const snap = await dbApi.get(dbApi.ref(db, `estudosCurados/${estudoKey}`))
    const atual = String(snap.child('texto').val() || '').trim()
    // A Biblia Comentada e a fonte atual. O registro diario conserva apenas
    // uma copia de contingencia para continuar abrindo durante falhas de rede.
    return atual || publicado
  } catch (_) {
    return publicado
  }
}

export async function listarVersiculosDoDia() {
  const { db, dbApi } = await firebase()
  if (!db) return []
  const snap = await dbApi.get(dbApi.ref(db, 'versiculosDoDia'))
  const itens = []
  snap.forEach((child) => {
    const value = child.val() || {}
    if (value.status === 'pronto') itens.push({ ...value, data: value.data || child.key })
  })
  return itens.sort((a, b) => String(b.data).localeCompare(String(a.data)))
}
