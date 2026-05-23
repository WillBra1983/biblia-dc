import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// Configuração do canal de notificação para Android 8+ (iOS não usa channelId)
const createNotificationChannel = async () => {
  if (Capacitor.getPlatform() !== 'android') {
    return
  }
  
  try {
    await LocalNotifications.createChannel({
      id: 'devocional',
      name: 'Devocional Diário',
      description: 'Lembretes para devocional diário',
      importance: 4, // HIGH
      visibility: 1, // PUBLIC
      sound: 'default',
      vibration: true
    })
  } catch (error) {
    // Ignora erros de "Not implemented" na web
    if (Capacitor.getPlatform() === 'web') {
      return
    }
    console.error('❌ Erro ao criar canal de notificação:', error)
  }
}

export const scheduleDevocionalReminder = async () => {
  try {
    await createNotificationChannel();

    // Cancela notificações anteriores
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    // Calcula o próximo horário das 6h da manhã
    const now = new Date();
    const next6h = new Date(now);
    next6h.setHours(6, 0, 0, 0);
    if (now >= next6h) {
      // Se já passou das 6h hoje, agenda para amanhã
      next6h.setDate(next6h.getDate() + 1);
    }

    // Prepara a configuração da notificação
    const notificationConfig = {
      id: 1,
      title: 'Bíblia DC',
      body: 'Vamos parar um instante para nossa devocional do dia?',
      schedule: {
        at: next6h
      },
      sound: 'default',
      actionTypeId: 'OPEN_APP',
      vibrate: true,
      priority: 'high'
    }

    // Adiciona channelId apenas no Android (não suportado na web)
    if (Capacitor.getPlatform() === 'android') {
      notificationConfig.channelId = 'devocional'
    }

    await LocalNotifications.schedule({
      notifications: [notificationConfig]
    });
  } catch (error) {
    // Ignora erros de "Not implemented" na web
    if (Capacitor.getPlatform() === 'web') {
      return
    }
    console.error('❌ Erro ao agendar notificação:', error);
  }
};

/**
 * Solicita permissão para lembretes locais (Devocional, etc.).
 *
 * Importante: NÃO chame isso no carregamento da página. Só dispare em
 * resposta a uma ação explícita do usuário (ex.: ativar lembrete diário
 * em Configurações). Pedir permissão "do nada" no navegador faz o Chrome
 * registrar avisos no console e, depois de algumas recusas, **bloqueia
 * silenciosamente** novos pedidos para sempre.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.silencioseNegado=true]
 *   Quando `true`, se a permissão já foi negada antes, retornamos sem
 *   tentar de novo (evita ruído no console do navegador).
 * @returns {Promise<'granted'|'denied'|'prompt'|'unknown'>}
 */
export const requestNotificationPermission = async ({ silencioseNegado = true } = {}) => {
  try {
    // Evita acordar o popup do navegador automaticamente quando já foi
    // negado — alguns browsers (Chrome/Edge) registram warnings nesse
    // caso. Em ambiente nativo isso é apenas otimização.
    if (silencioseNegado) {
      try {
        const atual = await LocalNotifications.checkPermissions()
        if (atual?.display === 'denied') return 'denied'
      } catch (_) {
        // Se nem checar conseguimos, seguimos para o request normal.
      }
    }

    const result = await LocalNotifications.requestPermissions()
    if (result.display === 'granted') {
      await scheduleDevocionalReminder()
    }
    return result?.display || 'unknown'
  } catch (error) {
    // Ignora erros de "Not implemented" na web
    if (Capacitor.getPlatform() === 'web') {
      return 'unknown'
    }
    console.error('❌ Erro ao solicitar permissão:', error)
    return 'unknown'
  }
}

export const checkNotificationStatus = async () => {
  try {
    const permissions = await LocalNotifications.checkPermissions()
    const pending = await LocalNotifications.getPending()
    return { permissions, pending }
  } catch (error) {
    // Ignora erros de "Not implemented" na web
    if (Capacitor.getPlatform() === 'web') {
      return { permissions: null, pending: null }
    }
    console.error('❌ Erro ao verificar status:', error)
    return { permissions: null, pending: null }
  }
}
