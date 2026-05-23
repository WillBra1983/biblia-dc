import { Capacitor } from '@capacitor/core'

const isCapacitorNative = () =>
  typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.() === true

/**
 * Converte erros do Firebase Auth em texto útil (pt-BR) + dica de configuração.
 * Códigos em GOOGLE_SIGN_IN_STATUS_HINTS: ApiException do Google Sign-In Android.
 */
const GOOGLE_SIGN_IN_STATUS_HINTS = {
  '10':
    'DEVELOPER_ERROR: no app instalado pela Play Store falta a SHA-1 da chave de ASSINATURA DO APP (Google) no Firebase — não use só a SHA da keystore local (upload). Baixe google-services.json de novo (deve surgir um 4º cliente Android) e publique um AAB novo.',
  '12500': 'SIGN_IN_FAILED: falha geral no fluxo (rede, Play Services ou configuração).',
  '12502': 'SIGN_IN_REQUIRED: nenhuma conta Google na sessão.',
  '7': 'NETWORK_ERROR.',
  '8': 'INTERNAL_ERROR do Play Services.'
}

/** Popup Google fechado ou cancelado — sessão anterior permanece. */
export function isAuthCancelError(error) {
  const code = String(error?.code ?? '')
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/user-cancelled'
  ) {
    return true
  }
  const msg = String(error?.message ?? '').toLowerCase()
  return msg.includes('popup closed') || msg.includes('cancelled') || msg.includes('canceled')
}

export function hintForFirebaseAuthError(error) {
  const code = String(error?.code ?? '')
  const msg = String(error?.message ?? '')

  if (msg === 'Something went wrong' && GOOGLE_SIGN_IN_STATUS_HINTS[code] && isCapacitorNative()) {
    return [
      'Falha no login Google nativo.',
      `Código Google Play Services: ${code} — ${GOOGLE_SIGN_IN_STATUS_HINTS[code]}`,
      '',
      'No Capacitor, `androidClientId` deve ser o ID do cliente OAuth tipo Web (o mesmo do Firebase), não o cliente Android — isso já está ajustado no projeto.',
      'Se ainda falhar: confira SHA-1/SHA-256 no Firebase e reinstale o APK.'
    ].join('\n')
  }
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  if (
    code.includes('api-key-not-valid') ||
    msg.toLowerCase().includes('api-key-not-valid') ||
    msg.toLowerCase().includes('please pass a valid api key')
  ) {
    const lines = [
      'A chave de API não é aceita neste ambiente (o Google rejeita a requisição).',
      '',
      'Causa comum: a chave está com "Restrições de aplicativo" que não incluem o site OU o APK (Capacitor).',
      '',
      '1) Google Cloud Console → APIs e serviços → Credenciais.',
      '2) Abra a "Chave de API" cujo valor é o VITE_FIREBASE_API_KEY do .env.',
      '3) Em "Restrições de aplicativo", escolha uma destas opções:',
      '',
      '   A) Referenciadores HTTP — inclua TODOS os que usar:',
      '      - http://localhost:3000/*',
      '      - http://127.0.0.1:3000/*',
      '      - https://localhost/*     ← necessário para o WebView do Capacitor no Android (não é o mesmo que http!)',
      '      - https://foundcine.com/*',
      '',
      '   B) Ou, para testar sem dor de cabeça: "Nenhuma" (menos seguro; em produção volte a restringir).',
      '',
      '4) Alternativa no APK: em vez de só referenciadores, alguns times usam restrição "Aplicativos Android"',
      '   com o pacote com.bibliadc.app + impressão digital SHA-1 da keystore de release (Firebase também pede isso para o login Google nativo).',
      '',
      '5) Salve, espere 1–2 minutos e teste de novo (no PC: reinicie npm run dev; no APK: reinstale o build).'
    ]
    if (isCapacitorNative()) {
      const plataforma =
        typeof Capacitor !== 'undefined' ? Capacitor.getPlatform() : 'nativo'
      lines.splice(
        3,
        0,
        `Você está no app ${plataforma}: sem https://localhost/* na chave, o mesmo erro do PC pode aparecer aqui.`,
        ''
      )
    }
    return lines.join('\n')
  }

  if (code.includes('argument-error') || msg.includes('argument-error')) {
    return [
      'Erro de argumento no login com Google (OAuth).',
      '',
      '1) Google Cloud Console → APIs e serviços → Credenciais.',
      '2) Em "ID do cliente OAuth 2.0", abra o cliente do tipo "Aplicativo da Web" (criado pelo Firebase/Google).',
      '3) Em "Origens JavaScript autorizadas", adicione exatamente:',
      `   - ${origin}`,
      '   - http://localhost',
      '   - http://localhost:3000',
      '   - https://biblia-dc.firebaseapp.com',
      '4) Salve e teste de novo.'
    ].join('\n')
  }

  if (code === 'salvation/email-not-verified') {
    return (
      error?.message ||
      'Confirme seu e-mail antes de entrar. Abra o link enviado (verifique o spam) ou use "Reenviar e-mail" na tela seguinte.'
    )
  }

  if (code.includes('operation-not-allowed')) {
    return 'Este método de login está desativado. No Firebase → Authentication → Método de login, ative Google e/ou Anônimo.'
  }

  if (code.includes('popup-blocked') || code.includes('popup-closed-by-user')) {
    return 'O popup foi bloqueado ou fechado. Permita popups para este site ou tente de novo.'
  }

  if (
    code.includes('developer-error') ||
    msg.toLowerCase().includes('developer error') ||
    msg.includes('12500') ||
    msg.includes('10')
  ) {
    const plataforma =
      typeof Capacitor !== 'undefined' ? Capacitor.getPlatform() : 'android'
    if (plataforma === 'ios') {
      return [
        'O login Google nativo do iOS foi rejeitado pela configuração atual.',
        '',
        'Confira no Firebase/Google Cloud:',
        '1) App iOS `com.bibliadc.app` cadastrado no projeto Firebase.',
        '2) `GoogleService-Info.plist` em `ios/App/App/` (baixado do Firebase).',
        '3) Cliente OAuth tipo iOS + `iosClientId` em `capacitor.config.json`.',
        '4) URL scheme (REVERSED_CLIENT_ID) em Info.plist → URL Types no Xcode.',
        '5) Rebuild no Xcode após alterar credenciais.'
      ].join('\n')
    }
    return [
      'O login Google nativo do Android foi rejeitado pela configuração atual.',
      '',
      'Confira estes pontos no Firebase/Google Cloud:',
      '1) O app Android `com.bibliadc.app` precisa existir no projeto Firebase.',
      '2) O arquivo `android/app/google-services.json` precisa ser o deste app Android.',
      '3) Cadastre no Firebase a SHA-1 e a SHA-256 da keystore usada para assinar o APK.',
      '4) Gere novo build e reinstale o aplicativo após salvar as credenciais.',
      '',
      'Se o erro persistir, normalmente é SHA incorreta ou `google-services.json` de outro app.'
    ].join('\n')
  }

  return msg || code || String(error)
}
