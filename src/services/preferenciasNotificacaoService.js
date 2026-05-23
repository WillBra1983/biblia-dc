/**
 * Preferências de notificação do usuário no RTDB.
 *
 * Caminho: `/users/{uid}/notif/preferencias`
 *
 * Campos:
 *   - chat                  (boolean)
 *   - novidades             (boolean) — receber pushes do topic 'novidades'
 *   - lembreteDevocional    (boolean)
 *   - lembretePlano         (boolean)
 *   - horarioLembrete       (string 'HH:mm')
 *
 * As Cloud Functions checam esses campos antes de enviar push. O cliente
 * também usa para mostrar/ocultar switches já marcados.
 */

import { getFirebaseDatabase } from '../config/firebase'

export const PREFS_PADRAO = Object.freeze({
  chat: true,
  novidades: true,
  lembreteDevocional: false,
  lembretePlano: false,
  horarioLembrete: '07:00'
})

/**
 * Lê as preferências do usuário (com defaults para campos faltantes).
 * @param {string} uid
 * @returns {Promise<typeof PREFS_PADRAO>}
 */
export async function obterPreferenciasNotificacao(uid) {
  if (!uid) return { ...PREFS_PADRAO }
  const db = getFirebaseDatabase()
  if (!db) return { ...PREFS_PADRAO }
  const { ref, get } = await import('firebase/database')
  const snap = await get(ref(db, `users/${uid}/notif/preferencias`))
  return { ...PREFS_PADRAO, ...(snap.exists() ? snap.val() : {}) }
}

/**
 * Atualiza as preferências (merge — preserva campos não enviados).
 * @param {string} uid
 * @param {Partial<typeof PREFS_PADRAO>} patch
 */
export async function atualizarPreferenciasNotificacao(uid, patch) {
  if (!uid || !patch || typeof patch !== 'object') return
  const db = getFirebaseDatabase()
  if (!db) return
  const { ref, update } = await import('firebase/database')
  await update(ref(db, `users/${uid}/notif/preferencias`), patch)
}

/**
 * Inscreve / cancela inscrição em um topic do FCM. No Capacitor nativo
 * isso vai exigir uma function callable; na web não é possível subscribe
 * direto via JS — o servidor faz isso quando recebe o token. Esta função
 * é um placeholder para chamada futura.
 *
 * @param {string} uid
 * @param {string} topic
 * @param {boolean} inscrever
 */
export async function alternarTopicAssinatura(uid, topic, inscrever) {
  // Hoje as Cloud Functions enviam para o topic `novidades` direto e
  // confiamos no campo `notif/preferencias/novidades` para filtrar.
  // Mantemos a assinatura aqui para futuras necessidades (segmentação).
  void uid; void topic; void inscrever
}
