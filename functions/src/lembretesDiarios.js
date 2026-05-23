/**
 * Cron: lembretes diários de devocional e plano de leitura.
 *
 * Funciona com Cloud Scheduler (rodando a cada **15 minutos**, das 5h às 9h
 * da manhã no fuso configurado). Em cada execução, varremos todos os
 * usuários, lemos suas preferências, e enviamos push para quem (a)
 * habilitou um dos lembretes e (b) o horário escolhido coincide com a
 * "fatia atual" de tempo.
 *
 * Observações
 * -----------
 * - Mantemos a janela de checagem pequena (15 min) para que um usuário
 *   que escolheu 07:00 receba o push exatamente entre 07:00 e 07:14.
 * - O fuso global pode ser ajustado em `TIMEZONE` (default
 *   `America/Sao_Paulo`). Suporte por-usuário (campo `timezone` no perfil)
 *   pode ser somado depois.
 * - Se o número de usuários crescer muito, paginar via `orderByKey()` +
 *   `startAfter()`.
 */

const admin = require('firebase-admin')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger } = require('firebase-functions/v2')
const { enviarParaUsuarios } = require('./push')

const TIMEZONE = 'America/Sao_Paulo'
const JANELA_MIN = 15

/**
 * Retorna `HH:mm` da hora atual no fuso configurado, arredondada para
 * baixo no múltiplo de `JANELA_MIN`. Ex.: 07:08 → '07:00', 07:21 → '07:15'.
 */
function fatiaAtual() {
  const agora = new Date()
  // Manipulação simples via Intl
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const [hh, mm] = fmt.format(agora).split(':').map(Number)
  const minutoFatia = Math.floor(mm / JANELA_MIN) * JANELA_MIN
  return `${String(hh).padStart(2, '0')}:${String(minutoFatia).padStart(2, '0')}`
}

function horarioPertenceAFatia(horarioPref, fatia) {
  if (typeof horarioPref !== 'string') return false
  // Aceita 'H:mm' ou 'HH:mm'
  const m = horarioPref.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return false
  const hh = String(Number(m[1])).padStart(2, '0')
  const mins = Number(m[2])
  const minutoFatia = Math.floor(mins / JANELA_MIN) * JANELA_MIN
  return `${hh}:${String(minutoFatia).padStart(2, '0')}` === fatia
}

exports.lembretesDiarios = onSchedule(
  {
    schedule: 'every 15 minutes from 05:00 to 09:00',
    timeZone: TIMEZONE,
    region: 'us-central1',
    maxInstances: 1
  },
  async () => {
    const fatia = fatiaAtual()
    logger.info('Iniciando varredura de lembretes', { fatia })

    const usuariosSnap = await admin.database().ref('users').get()
    if (!usuariosSnap.exists()) return

    const uidsDevocional = []
    const uidsPlano = []
    usuariosSnap.forEach((u) => {
      const prefs = u.child('notif/preferencias').val() || {}
      if (!horarioPertenceAFatia(prefs.horarioLembrete, fatia)) return
      if (prefs.lembreteDevocional) uidsDevocional.push(u.key)
      if (prefs.lembretePlano) uidsPlano.push(u.key)
    })

    if (uidsDevocional.length) {
      await enviarParaUsuarios({
        uids: uidsDevocional,
        categoria: 'lembreteDevocional',
        notification: {
          title: 'Devocional do dia',
          body: 'Vamos parar um instante e abrir a Palavra hoje?'
        },
        data: { tipo: 'lembrete-devocional', url: '/devocional' }
      })
    }

    if (uidsPlano.length) {
      await enviarParaUsuarios({
        uids: uidsPlano,
        categoria: 'lembretePlano',
        notification: {
          title: 'Plano de leitura',
          body: 'Não perca a leitura de hoje. Toque para abrir o seu plano.'
        },
        data: { tipo: 'lembrete-plano', url: '/plano-leitura-biblia' }
      })
    }

    logger.info('Varredura concluída', {
      fatia,
      devocional: uidsDevocional.length,
      plano: uidsPlano.length
    })
  }
)
