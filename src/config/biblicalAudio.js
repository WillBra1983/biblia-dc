/**
 * Áudio bíblico experimental (versículo OT / pilotos). Desligado por defeito nos builds.
 * Ativar só em dev/teste: VITE_BIBLICAL_AUDIO=true
 */
export const biblicalAudioEnabled =
  String(import.meta.env.VITE_BIBLICAL_AUDIO || '').toLowerCase() === 'true'
