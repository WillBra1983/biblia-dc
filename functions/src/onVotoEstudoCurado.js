/**
 * Quando alguém vota em `votosEstudos/{estudoKey}/{uid}`, reconta os votos.
 *
 * Regras de negócio (alinhadas ao app):
 * - Com 10 votos **positivos** primeiro: copia o candidato para o nó oficial
 *   (`estudosCurados` ou `pericopesCuradas`) e apaga candidato + todos os votos.
 * - Com 10 votos **negativos** primeiro (ou empate 10–10): apaga só o candidato
 *   e todos os votos; o oficial existente **não** é tocado.
 * - Se já existe oficial para a mesma chave, não promove de novo (idempotente).
 *
 * `estudoKey` pode ser:
 * - `43_3_1-2` → versículos (livro_cap_versSet), tom pastoral (padrão).
 * - `43_3_1-2~academico` → versículos, tom acadêmico.
 * - `peri:43_3_1_19` → perícope, tom pastoral.
 * - `peri:43_3_1_19~contemplativo` → perícope, tom contemplativo.
 *
 * O sufixo `~<tom>` é apenas parte da chave RTDB — os nós `estudosCandidatos`
 * e `estudosCurados` (e suas variantes de perícope) usam a chave inteira, e
 * cada tom é tratado como um estudo independente.
 */

const admin = require('firebase-admin')
const { onValueWritten } = require('firebase-functions/v2/database')
const { logger } = require('firebase-functions/v2')

const THRESHOLD = 10
const PREFIXO_VOTO = 'votosEstudos'
const PREFIXO_ESTUDO = 'estudosCurados'
const PREFIXO_CANDIDATO = 'estudosCandidatos'
const PREFIXO_PERICOPE = 'pericopesCuradas'
const PREFIXO_PERICOPE_CAND = 'pericopesCandidatas'

/**
 * Separa a base da chave do sufixo de tom (`~<tom>`).
 * Para chaves sem sufixo, retorna o tom default `pastoral`.
 */
function separarTom(chave) {
  const idx = String(chave || '').indexOf('~')
  if (idx === -1) return { base: String(chave || ''), tom: 'pastoral' }
  return { base: String(chave).slice(0, idx), tom: String(chave).slice(idx + 1) || 'pastoral' }
}

function parseVerseEstudoKey(estudoKey) {
  const { base, tom } = separarTom(estudoKey)
  const parts = base.split('_')
  if (parts.length < 3) return null
  const livroId = Number(parts[0])
  const capitulo = Number(parts[1])
  const versStr = parts.slice(2).join('_')
  const versArr = versStr
    .split('-')
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0)
  if (!livroId || !capitulo || !versArr.length) return null
  // `passagemKey` é a chave COMPLETA (com sufixo, se houver) — usada para
  // ler/escrever em `estudosCandidatos`/`estudosCurados`.
  return { tipo: 'versiculo', livroId, capitulo, versArr, tom, passagemKey: estudoKey }
}

function parsePeriEstudoKey(estudoKey) {
  if (!String(estudoKey || '').startsWith('peri:')) return null
  const inner = String(estudoKey).slice(5)
  const { base, tom } = separarTom(inner)
  const parts = base.split('_')
  if (parts.length !== 4) return null
  const [livroId, capitulo, inicio, fim] = parts.map((x) => Number(x))
  if (!livroId || !capitulo || !inicio || !fim) return null
  // `periDbKey` carrega o sufixo de tom (sem o `peri:`).
  return { tipo: 'pericope', livroId, capitulo, inicio, fim, tom, periDbKey: inner }
}

async function contarVotos(estudoKey) {
  const snap = await admin.database().ref(`${PREFIXO_VOTO}/${estudoKey}`).get()
  if (!snap.exists()) return { positivos: 0, negativos: 0 }
  let positivos = 0
  let negativos = 0
  snap.forEach((child) => {
    const v = child.child('voto').val()
    if (v === 'positivo') positivos += 1
    else if (v === 'negativo') negativos += 1
  })
  return { positivos, negativos }
}

exports.onVotoEstudoCurado = onValueWritten(
  {
    ref: `${PREFIXO_VOTO}/{estudoKey}/{uid}`,
    region: 'us-central1'
  },
  async (event) => {
    const { estudoKey } = event.params
    if (!estudoKey) return

    const { positivos, negativos } = await contarVotos(estudoKey)

    const peri = parsePeriEstudoKey(estudoKey)
    const verse = peri ? null : parseVerseEstudoKey(estudoKey)
    if (!peri && !verse) {
      logger.warn('Chave de voto não reconhecida', { estudoKey })
      return
    }

    const db = admin.database()
    let refOficial
    let refCandidato
    if (peri) {
      refOficial = db.ref(`${PREFIXO_PERICOPE}/${peri.periDbKey}`)
      refCandidato = db.ref(`${PREFIXO_PERICOPE_CAND}/${peri.periDbKey}`)
    } else {
      refOficial = db.ref(`${PREFIXO_ESTUDO}/${verse.passagemKey}`)
      refCandidato = db.ref(`${PREFIXO_CANDIDATO}/${verse.passagemKey}`)
    }

    const [snapOficial, snapCand] = await Promise.all([refOficial.get(), refCandidato.get()])
    const jaOficial =
      snapOficial.exists() &&
      typeof snapOficial.child('texto').val() === 'string' &&
      String(snapOficial.child('texto').val() || '').trim().length > 0

    const temCandidato =
      snapCand.exists() &&
      typeof snapCand.child('texto').val() === 'string' &&
      String(snapCand.child('texto').val() || '').trim().length > 0

    // Já existe oficial: nada a promover (votos costumam ser apagados na promoção).
    if (jaOficial) return

    const negGanha =
      negativos >= THRESHOLD &&
      (negativos > positivos || (negativos === positivos && negativos >= THRESHOLD))
    const posGanha =
      positivos >= THRESHOLD &&
      positivos > negativos &&
      temCandidato

    if (negGanha) {
      await Promise.allSettled([
        refCandidato.remove(),
        db.ref(`${PREFIXO_VOTO}/${estudoKey}`).remove()
      ])
      logger.info('Candidato descartado por limiar de votos negativos', {
        estudoKey,
        tom: (peri || verse)?.tom,
        positivos,
        negativos
      })
      return
    }

    if (posGanha) {
      const cand = snapCand.val() || {}
      const texto = String(cand.texto || '').trim()
      if (!texto) {
        logger.warn('Promoção abortada: candidato sem texto', { estudoKey })
        return
      }
      const agora = Date.now()
      const autorUid = String(cand.autorUid || 'sistema:votacao').slice(0, 128)

      if (peri) {
        await refOficial.set({
          texto,
          titulo: String(cand.titulo || ''),
          referencia: String(cand.referencia || ''),
          atualizadoEm: agora,
          autorUid,
          versao: 1
        })
      } else {
        await refOficial.set({
          texto,
          referenciaCompacta: String(cand.referenciaCompacta || ''),
          pericopeKey: cand.pericopeKey != null ? cand.pericopeKey : null,
          atualizadoEm: agora,
          autorUid,
          versao: 1
        })
      }

      await Promise.allSettled([refCandidato.remove(), db.ref(`${PREFIXO_VOTO}/${estudoKey}`).remove()])

      logger.info('Candidato promovido a oficial por limiar de votos positivos', {
        estudoKey,
        tom: (peri || verse)?.tom,
        positivos,
        negativos
      })
    }
  }
)
