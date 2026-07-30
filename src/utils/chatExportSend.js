import { PENDING_CHAT_EXPORT_KEY } from '../constants/chatExportPending'
import { mostrarSnackbar } from './uiDialogs'
import {
  estaSemRede,
  MSG_SEM_INTERNET_RECURSO,
  rotaConteudoLocalOffline,
  rotaExigeContaOuNuvem,
} from './conteudoLocalOffline'

/**
 * Chave de sessionStorage que guarda a URL para onde o usuário deve voltar
 * automaticamente assim que concluir o login. Usada por
 * `ensureUserForFeature` (salva) e `consumePendingLoginRedirect` (lê).
 */
const PENDING_LOGIN_REDIRECT_KEY = 'salvation-pending-login-redirect'
const PENDING_CHAT_DRAFT_KEY = 'salvation-pending-chat-draft'

/** Tempo máximo (ms) que uma intenção de redirecionamento fica "viva". */
const PENDING_LOGIN_REDIRECT_TTL_MS = 10 * 60 * 1000 // 10 min

function destinoLoginValido(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/chat')
}

export function loginPathComRetorno(url) {
  return destinoLoginValido(url) ? `/chat?returnTo=${encodeURIComponent(url)}` : '/chat'
}

export function obterPendingLoginRedirect() {
  try {
    const pelaUrl = new URLSearchParams(window.location.search).get('returnTo')
    if (destinoLoginValido(pelaUrl)) return pelaUrl

    const raw = sessionStorage.getItem(PENDING_LOGIN_REDIRECT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !destinoLoginValido(parsed?.url)
      || (typeof parsed.ts === 'number' && (Date.now() - parsed.ts) > PENDING_LOGIN_REDIRECT_TTL_MS)
    ) {
      return null
    }
    return parsed.url
  } catch {
    return null
  }
}

/** Exige usuário autenticado; caso contrário avisa e envia para o chat. */
export function ensureUserForChatExport(user, navigate) {
  if (user === undefined) {
    mostrarSnackbar({
      mensagem: 'Aguarde, verificando sua sessão…',
      severidade: 'info',
    })
    navigate('/chat')
    return false
  }
  if (!user?.uid) {
    if (estaSemRede()) {
      mostrarSnackbar({ mensagem: MSG_SEM_INTERNET_RECURSO, severidade: 'info' })
      navigate('/')
      return false
    }
    mostrarSnackbar({
      mensagem: 'Entre na sua conta para enviar pelo chat.',
      severidade: 'info'
    })
    navigate('/chat')
    return false
  }
  if (estaSemRede()) {
    mostrarSnackbar({ mensagem: MSG_SEM_INTERNET_RECURSO, severidade: 'info' })
    return false
  }
  return true
}

/**
 * Exige usuário autenticado para rotas da nuvem (chat, estudos compartilhados…).
 * Rotas locais (ex.: plano de leitura offline) seguem mesmo sem conta.
 * **guarda a URL de destino** para retomar depois do login e redireciona
 * para a tela de login (`/chat`).
 *
 * @param {object|null} user      Objeto de usuário (`null`/`undefined` = não logado).
 * @param {Function}    navigate  `useNavigate()` do react-router.
 * @param {object}      [opts]
 * @param {string}      [opts.mensagem]    Mensagem custom para o snackbar.
 * @param {string}      [opts.redirectTo]  URL que o usuário pretendia abrir.
 *                                         Se omitido, usamos a URL atual
 *                                         (`pathname+search+hash`).
 *
 * @returns {boolean} `true` se a ação pode prosseguir; `false` caso o
 *                    redirect para login já tenha sido disparado.
 */
export function ensureUserForFeature(user, navigate, { mensagem, redirectTo } = {}) {
  const destino =
    redirectTo ||
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '/')

  if (user === undefined) {
    mostrarSnackbar({
      mensagem: 'Aguarde, verificando sua sessão…',
      severidade: 'info',
    })
    // /chat exibe AuthConectarForm mesmo durante a verificação (app nativo iOS).
    navigate(loginPathComRetorno(destino))
    return false
  }

  const destinoPath =
    typeof destino === 'string' ? destino.split('?')[0].split('#')[0] : '/'

  if (user?.uid && estaSemRede() && rotaExigeContaOuNuvem(destinoPath)) {
    mostrarSnackbar({ mensagem: MSG_SEM_INTERNET_RECURSO, severidade: 'info' })
    return false
  }

  if (!user?.uid) {
    if (estaSemRede()) {
      if (rotaConteudoLocalOffline(destinoPath)) {
        return true
      }
      mostrarSnackbar({ mensagem: MSG_SEM_INTERNET_RECURSO, severidade: 'info' })
      return false
    }
    try {
      const target = destino
      // Não fazemos sentido voltar para `/chat` depois de logar dentro de
      // `/chat` — isso só causa "piscar" sem efeito.
      if (target && !target.startsWith('/chat')) {
        sessionStorage.setItem(
          PENDING_LOGIN_REDIRECT_KEY,
          JSON.stringify({ url: target, ts: Date.now() })
        )
      }
    } catch (_) {
      // sessionStorage indisponível (ex.: modo privado restrito): segue sem.
    }

    mostrarSnackbar({
      mensagem: mensagem || 'Entre na sua conta para usar este recurso.',
      severidade: 'info'
    })
    navigate(loginPathComRetorno(destino))
    return false
  }
  return true
}

/**
 * Lê (e remove) a URL que o usuário pretendia abrir antes do login. Usada
 * pela tela de Chat para redirecionar de volta assim que o login for
 * concluído. Retorna `null` se não houver intenção pendente ou se a
 * intenção tiver expirado (`PENDING_LOGIN_REDIRECT_TTL_MS`).
 */
export function consumePendingLoginRedirect() {
  const pendente = obterPendingLoginRedirect()
  try {
    sessionStorage.removeItem(PENDING_LOGIN_REDIRECT_KEY)
  } catch (_) {
    /* ignore */
  }
  return pendente
}

export function pushPendingChatDraft(navigate, text) {
  const draft = String(text || '').trim()
  if (!draft) return
  sessionStorage.setItem(PENDING_CHAT_DRAFT_KEY, draft)
  navigate('/chat')
}

export function consumePendingChatDraft() {
  try {
    const draft = String(sessionStorage.getItem(PENDING_CHAT_DRAFT_KEY) || '').trim()
    sessionStorage.removeItem(PENDING_CHAT_DRAFT_KEY)
    return draft
  } catch {
    return ''
  }
}

/**
 * Guarda o pacote e abre o chat para o usuário escolher a conversa e tocar em "Enviar agora".
 */
export function pushPendingChatExport(navigate, { exportKind, exportPayload, previewText, suggestedPeerUid }) {
  sessionStorage.setItem(
    PENDING_CHAT_EXPORT_KEY,
    JSON.stringify({
      exportKind,
      exportPayload,
      previewText: String(previewText || ''),
      suggestedPeerUid: suggestedPeerUid ? String(suggestedPeerUid).trim() : ''
    })
  )
  navigate('/chat')
}
