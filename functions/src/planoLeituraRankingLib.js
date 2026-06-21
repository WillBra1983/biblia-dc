/**

 * Lógica partilhada: plano RTDB → entrada pública do ranking.

 */



const PLANO_ID_RANKING = 'biblia'

const TOTAL_CAPS_PADRAO = 1189



function diaCivilAmericaSaoPaulo(date = new Date()) {

  try {

    const parts = new Intl.DateTimeFormat('pt-BR', {

      timeZone: 'America/Sao_Paulo',

      year: 'numeric',

      month: '2-digit',

      day: '2-digit',

    }).formatToParts(date)

    const y = parts.find((p) => p.type === 'year')?.value

    const m = parts.find((p) => p.type === 'month')?.value

    const d = parts.find((p) => p.type === 'day')?.value

    if (y && m && d) return `${y}-${m}-${d}`

  } catch {

    /* ignore */

  }

  const x = new Date(date)

  const yy = x.getFullYear()

  const mm = String(x.getMonth() + 1).padStart(2, '0')

  const dd = String(x.getDate()).padStart(2, '0')

  return `${yy}-${mm}-${dd}`

}



function diferencaDiasIso(isoEarlier, isoLater) {

  const pa = String(isoEarlier || '').split('-').map(Number)

  const pb = String(isoLater || '').split('-').map(Number)

  if (pa.length !== 3 || pb.length !== 3 || pa.some((n) => !Number.isFinite(n)) || pb.some((n) => !Number.isFinite(n))) {

    return NaN

  }

  const u1 = Date.UTC(pa[0], pa[1] - 1, pa[2])

  const u2 = Date.UTC(pb[0], pb[1] - 1, pb[2])

  return Math.round((u2 - u1) / 86400000)

}



function contarDiasEntreInicioFim(dataInicio, dataFim) {

  if (!dataInicio || !dataFim) return 0

  const d = diferencaDiasIso(dataInicio, dataFim)

  return d < 0 ? 0 : d + 1

}



function cumulativoEsperadoAteDiaK(totalCaps, diasPlano, k) {

  if (k <= 0) return 0

  if (k >= diasPlano) return totalCaps

  return Math.floor((k * totalCaps) / diasPlano)

}



function indiceDiaNoPlano(inst, iso) {

  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)

  if (D < 1) return null

  if (diferencaDiasIso(inst.dataInicio, iso) < 0) return null

  if (diferencaDiasIso(inst.dataFim, iso) > 0) return null

  return diferencaDiasIso(inst.dataInicio, iso) + 1

}



function obterIndicesPremioDia(inst) {

  const D = contarDiasEntreInicioFim(inst.dataInicio, inst.dataFim)

  if (D < 1) return []

  const lidos = Array.isArray(inst.capitulosLidos) ? inst.capitulosLidos.length : 0

  const raw = Array.isArray(inst.indicesPlanoBonificados) ? inst.indicesPlanoBonificados : []

  return [

    ...new Set(

      raw

        .map(Number)

        .filter(

          (k) =>

            Number.isFinite(k) &&

            k >= 1 &&

            k <= D &&

            lidos >= cumulativoEsperadoAteDiaK(TOTAL_CAPS_PADRAO, D, k)

        )

    ),

  ].sort((a, b) => a - b)

}



function calcularDiasLeitura(inst) {

  return obterIndicesPremioDia(inst).length

}



function calcularSequenciaConsecutiva(inst, hoje = diaCivilAmericaSaoPaulo()) {

  const indices = new Set(obterIndicesPremioDia(inst))

  const kHoje = indiceDiaNoPlano(inst, hoje)

  if (kHoje == null || !indices.has(kHoje)) return 0



  let seq = 0

  let k = kHoje

  while (indices.has(k)) {

    seq += 1

    k -= 1

  }

  return seq

}



function resolverNome(profile = {}) {

  const handle =

    typeof profile.handle === 'string' ? profile.handle.trim().replace(/^@+/, '').toLowerCase() : ''

  if (handle) return `@${handle}`.slice(0, 80)



  const email = typeof profile.email === 'string' ? profile.email.trim() : ''

  if (email.includes('@')) {

    const parte = email.split('@')[0].trim()

    if (parte) return parte.slice(0, 80)

  }



  const dn = typeof profile.displayName === 'string' ? profile.displayName.trim() : ''

  if (dn) return dn.slice(0, 80)



  return 'Leitor'

}



function escolherInstancia(estado) {

  if (!estado || typeof estado !== 'object') return null

  const instancias = Array.isArray(estado.instancias) ? estado.instancias : []

  if (!instancias.length) return null

  const ativaId = estado.instanciaAtivaId ? String(estado.instanciaAtivaId) : ''

  return instancias.find((i) => i && String(i.id) === ativaId) || instancias[0]

}



function montarPayloadRanking(inst, profile = {}) {

  const caps = Array.isArray(inst.capitulosLidos) ? inst.capitulosLidos : []

  const lidos = caps.length

  if (lidos < 1) return null



  const total = TOTAL_CAPS_PADRAO

  const pct = Math.round(Math.max(0, Math.min(100, (lidos / total) * 100)) * 10) / 10

  const handle =

    typeof profile.handle === 'string' ? profile.handle.trim().replace(/^@+/, '').toLowerCase() : ''

  return {

    displayName: resolverNome(profile),

    handle: handle.slice(0, 30),

    photoURL:

      typeof profile.photoURL === 'string' && profile.photoURL.trim()

        ? profile.photoURL.trim().slice(0, 600)

        : '',

    capitulosLidos: lidos,

    progressoPct: pct,

    totalCapitulos: total,

    diasLeitura: calcularDiasLeitura(inst),

    diasConsecutivos: calcularSequenciaConsecutiva(inst),

    updatedAt: Date.now(),

    planoId: PLANO_ID_RANKING,

  }

}



/**

 * Atualiza ou remove `planoLeituraRanking/{uid}` a partir do nó do plano + perfil.

 * @returns {'published'|'removed'|'skipped'}

 */

async function sincronizarRankingDoPlano(db, uid, planoLeituraVal, profile = {}) {

  const rankingRef = db.ref(`planoLeituraRanking/${uid}`)



  if (profile.rankingPlanoOptIn === false) {

    await rankingRef.remove().catch(() => {})

    return 'removed'

  }



  const estado =

    planoLeituraVal?.estado && typeof planoLeituraVal.estado === 'object'

      ? planoLeituraVal.estado

      : null

  const inst = escolherInstancia(estado)

  if (!inst) {

    await rankingRef.remove().catch(() => {})

    return 'removed'

  }



  const payload = montarPayloadRanking(inst, profile)

  if (!payload) {

    await rankingRef.remove().catch(() => {})

    return 'removed'

  }



  await rankingRef.set(payload)

  return 'published'

}



/** Reconstrói todas as entradas de `planoLeituraRanking` a partir dos planos na nuvem. */

async function reconstruirTodosRankingsPlano(db) {

  const usersSnap = await db.ref('users').get()

  if (!usersSnap.exists()) {

    return { processados: 0, publicados: 0, removidos: 0, ignorados: 0 }

  }



  let ignorados = 0

  const tarefas = []



  usersSnap.forEach((userChild) => {

    const uid = userChild.key

    if (!uid) return

    const dados = userChild.val() || {}

    const planoLeitura = dados.planoLeitura

    if (!planoLeitura || typeof planoLeitura !== 'object') {

      ignorados += 1

      return

    }

    const profile = dados.profile && typeof dados.profile === 'object' ? dados.profile : {}

    tarefas.push(

      sincronizarRankingDoPlano(db, uid, planoLeitura, profile).catch(() => 'skipped')

    )

  })



  const resultados = await Promise.all(tarefas)

  return {

    processados: resultados.length,

    publicados: resultados.filter((r) => r === 'published').length,

    removidos: resultados.filter((r) => r === 'removed').length,

    ignorados,

  }

}



module.exports = {

  sincronizarRankingDoPlano,

  reconstruirTodosRankingsPlano,

  escolherInstancia,

  montarPayloadRanking,

  calcularSequenciaConsecutiva,

  calcularDiasLeitura,

  obterIndicesPremioDia,

}


