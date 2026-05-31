import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import { useApp } from '../contexts/AppContext'
import { ChatAppExportBubble, ChatAppExportDialog } from '../components/ChatAppExport'
import { PENDING_CHAT_EXPORT_KEY } from '../constants/chatExportPending'
import { consumePendingLoginRedirect } from '../utils/chatExportSend'
import { EXPORT_KIND_LABELS, applyExportImport } from '../utils/appExportPayload'
import ArrowBack from '@mui/icons-material/ArrowBack'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SearchIcon from '@mui/icons-material/Search'
import SendIcon from '@mui/icons-material/Send'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { hintForFirebaseAuthError } from '../utils/firebaseAuthErrors'
import EmailVerificationGate from '../components/EmailVerificationGate'
import AuthConectarForm from '../components/AuthConectarForm'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'
import { gravatarPhotoUrl } from '../utils/gravatarUrl'
import { compressImageToJpeg } from '../utils/profileImage'
import { confirmarAsync } from '../utils/uiDialogs'
import { updateProfile } from 'firebase/auth'
import { getFirebaseAuth } from '../config/firebase'
import {
  acceptFriendRequest,
  addFavorite,
  cancelFriendRequest,
  claimPublicHandle,
  dmChatId,
  ensureChatMembership,
  fetchChatMessages,
  markChatAsRead,
  fetchUserProfile,
  normalizePublicHandle,
  rejectFriendRequest,
  removeFavorite,
  removeFriend,
  hideChatOnlyForMe,
  deleteMessageForEveryone,
  ensurePublicProfileHasEmail,
  ensurePublicProfileMirrorAuth,
  hideMessageForMe,
  reportChatMessage,
  repairDmChatListIfMissing,
  resolvePeerToUid,
  sendChatMessage,
  sendFriendRequest,
  subscribeFavorites,
  subscribeFriendRequestsIn,
  subscribeFriendRequestsOut,
  subscribeFriends,
  subscribeMessages,
  subscribeHiddenMessageIds,
  subscribeUserChatList,
  subscribePeerPublicProfile,
  subscribeUserProfile,
  searchPeopleByTerm,
  uploadProfilePhoto,
  deleteProfilePhotoFile,
  writeUserProfilePublic,
  subscribeRecentPeople,
  setRecentPerson,
  removeRecentPerson,
  clearRecentPeople
} from '../services/chatService'

/** Mensagem curta para o usuário final (sem detalhes de infraestrutura). */
function hintRtdbPermissionDenied(error) {
  const code = String(error?.code ?? '')
  const msg = String(error?.message ?? '')
  if (code === 'PERMISSION_DENIED' || /permission denied/i.test(msg)) {
    return 'Não foi possível completar esta operação. Aguarde um instante, saia e entre de novo ou tente mais tarde.'
  }
  return ''
}

/** Data e hora da mensagem para exibição (pt-BR). */
function formatChatMessageDateTime(ts) {
  if (ts == null) return ''
  if (typeof ts !== 'number' || Number.isNaN(ts)) return ''
  try {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function normalizeInboxQuery(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Hora na lista de conversas (estilo resumo). */
/** Foto do perfil público, Gravatar ou e-mail da última mensagem (fallback). */
function avatarUrlForPeer(prof, listRow, messageSenderEmail) {
  const fromProfile = typeof prof?.photoURL === 'string' ? prof.photoURL.trim() : ''
  if (fromProfile) return fromProfile
  const email =
    (typeof prof?.email === 'string' && prof.email.trim()) ||
    (typeof listRow?.peerEmail === 'string' && listRow.peerEmail.trim()) ||
    (typeof messageSenderEmail === 'string' && messageSenderEmail.trim()) ||
    ''
  return gravatarPhotoUrl(email) || undefined
}

const avatarImgProps = { referrerPolicy: 'no-referrer' }

/** Chip enxuto (sem MUI `Chip`) para anotar Amigo/Favorito em "Pessoas". */
function PeopleChip({ label, tone }) {
  const palette =
    tone === 'friend'
      ? { bg: 'rgba(46, 125, 50, 0.85)', fg: '#ffffff' }
      : tone === 'favorite'
        ? { bg: 'rgba(255, 179, 0, 0.85)', fg: '#1a1a1a' }
        : { bg: 'rgba(255,255,255,0.18)', fg: '#ffffff' }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        bgcolor: palette.bg,
        color: palette.fg,
        fontSize: '0.62rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        px: 0.75,
        py: 0.15,
        borderRadius: 999,
        flexShrink: 0,
        lineHeight: 1.4,
      }}
    >
      {label}
    </Box>
  )
}

/** Chave antiga (antes de migrar a lista para RTDB). Lemos só para migração suave. */
const LEGACY_RECENT_PEOPLE_KEY = 'salvation-chat-recent-people'

function readLegacyRecentPeople() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LEGACY_RECENT_PEOPLE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r) => r && typeof r.uid === 'string' && r.uid.length > 0)
  } catch {
    return []
  }
}

function clearLegacyRecentPeople() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_RECENT_PEOPLE_KEY)
  } catch {
    /* ignore */
  }
}

/** Texto humano para "abriu há X". Em pt-BR e sem libs externas. */
function formatRecentPersonAge(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return ''
  const diff = Date.now() - ts
  if (diff < 0) return ''
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'há instantes'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatRecentPersonFullDate(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return ''
  try {
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * Linha de "pessoa" com swipe horizontal para alternar favorito.
 *
 *  - **Mobile (touch)**: arraste a linha para a esquerda; ao soltar com mais de
 *    `SWIPE_THRESHOLD_PX`, dispara `onToggleFavorite`. Direção vertical libera
 *    o scroll normal (lock direcional em ~8 px).
 *  - **Desktop / acessibilidade**: também mostramos um botão de estrela à
 *    direita (sempre visível) com o mesmo efeito — discoverable e usável por
 *    teclado/lupa.
 */
const SWIPE_THRESHOLD_PX = 80
const SWIPE_LOCK_PX = 8
const SWIPE_MAX_PX = 140

function SwipeFavoriteRow({ isFavorite, onToggleFavorite, busy, children }) {
  const itemRef = useRef(null)
  const startRef = useRef({ x: 0, y: 0, locked: null })
  const deltaXRef = useRef(0)

  const applyTransform = (x, animate = false) => {
    const el = itemRef.current
    if (!el) return
    el.style.transition = animate ? 'transform 0.18s ease' : 'none'
    el.style.transform = x === 0 ? 'translateX(0)' : `translateX(${x}px)`
  }

  const reset = (animate = true) => {
    deltaXRef.current = 0
    startRef.current.locked = null
    applyTransform(0, animate)
  }

  return (
    <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 2,
          gap: 0.75,
          background: isFavorite
            ? 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(120,40,40,0.78) 100%)'
            : 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,179,0,0.92) 100%)',
          color: isFavorite ? '#fff' : '#1a1a1a',
          fontWeight: 800,
          fontSize: '0.72rem',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          pointerEvents: 'none'
        }}
      >
        {isFavorite ? <StarBorderIcon fontSize="small" /> : <StarIcon fontSize="small" />}
        <span>{isFavorite ? 'Desfavoritar' : 'Favoritar'}</span>
      </Box>
      <Box
        ref={itemRef}
        sx={{
          position: 'relative',
          willChange: 'transform',
          background: 'transparent'
        }}
        onTouchStart={(e) => {
          if (busy) return
          const t = e.touches[0]
          startRef.current = { x: t.clientX, y: t.clientY, locked: null }
          applyTransform(deltaXRef.current, false)
        }}
        onTouchMove={(e) => {
          if (busy) return
          const t = e.touches[0]
          const dx = t.clientX - startRef.current.x
          const dy = t.clientY - startRef.current.y
          if (startRef.current.locked == null) {
            if (Math.abs(dx) > SWIPE_LOCK_PX || Math.abs(dy) > SWIPE_LOCK_PX) {
              startRef.current.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
            }
          }
          if (startRef.current.locked === 'h') {
            // Apenas swipe para a esquerda (delta negativo) revela a ação.
            // Permitimos um pequeno "puxão" para a direita para feedback tátil.
            const clamped = Math.max(-SWIPE_MAX_PX, Math.min(20, dx))
            deltaXRef.current = clamped
            applyTransform(clamped, false)
          }
        }}
        onTouchEnd={() => {
          if (busy) {
            reset(true)
            return
          }
          const dx = deltaXRef.current
          if (dx <= -SWIPE_THRESHOLD_PX) {
            try {
              onToggleFavorite?.()
            } catch {
              /* ignore */
            }
          }
          reset(true)
        }}
        onTouchCancel={() => reset(true)}
      >
        {children}
      </Box>
    </Box>
  )
}

function openAvatarPreviewUrl(setter, url) {
  const u = typeof url === 'string' ? url.trim() : ''
  if (u) setter(u)
}

function avatarUrlForSearchRow(row) {
  const from = typeof row?.photoURL === 'string' ? row.photoURL.trim() : ''
  if (from) return from
  return gravatarPhotoUrl(typeof row?.email === 'string' ? row.email : '') || undefined
}

function formatChatListRowTime(ts) {
  if (typeof ts !== 'number' || Number.isNaN(ts) || ts <= 0) return ''
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Chat() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    user,
    isConfigured,
    logout,
    setLastError,
    lastError
  } = useFirebaseAuth()

  const { setDiscipuladoRespostas, setDiscipuladoTema } = useApp()

  const [busy, setBusy] = useState(false)
  const [activeChatId, setActiveChatId] = useState(null)
  const [activePeerUid, setActivePeerUid] = useState(null)
  const [chatList, setChatList] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')

  const [myProfile, setMyProfile] = useState({})
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileHandleInput, setProfileHandleInput] = useState('')
  const [profileCity, setProfileCity] = useState('')
  const [profileProfession, setProfileProfession] = useState('')
  const [profileChurch, setProfileChurch] = useState('')
  const [peerProfile, setPeerProfile] = useState(null)

  const [favorites, setFavorites] = useState([])
  const [friendRequestsIn, setFriendRequestsIn] = useState([])
  const [friendRequestsOut, setFriendRequestsOut] = useState([])
  const [friends, setFriends] = useState([])
  const [peerProfilesMap, setPeerProfilesMap] = useState({})

  /** Avisos na vista logada (lastError do contexto não era mostrado aqui). */
  const [chatListNotice, setChatListNotice] = useState('')
  const [peerDialog, setPeerDialog] = useState(null)
  const [peerDialogInput, setPeerDialogInput] = useState('')
  const [peerDialogError, setPeerDialogError] = useState('')
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [deleteChatTarget, setDeleteChatTarget] = useState(null)
  const [hiddenMsgIds, setHiddenMsgIds] = useState({})
  const [msgMenu, setMsgMenu] = useState(null)
  /** Primeiro snapshot de `users/{uid}/profile` recebido (evita modal antes da RTDB responder). */
  const [profileSyncedFromDb, setProfileSyncedFromDb] = useState(false)

  const [inboxSearch, setInboxSearch] = useState('')
  const [inboxMenuAnchor, setInboxMenuAnchor] = useState(null)
  /** Pessoas (handles) encontradas pela busca da caixa de entrada — fora do chatList. */
  const [inboxPeopleResults, setInboxPeopleResults] = useState([])
  const [inboxPeopleBusy, setInboxPeopleBusy] = useState(false)
  /** Últimos contatos abertos pela busca — sincronizado entre dispositivos via RTDB. */
  const [recentPeople, setRecentPeople] = useState([])
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [auxListDialog, setAuxListDialog] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [appBarChatSlot, setAppBarChatSlot] = useState(null)

  /** Pacote pendente (discipulado, versículos, quiz, etc.) até enviar no chat. */
  const [pendingExport, setPendingExport] = useState(null)
  /** Mensagem cujo pacote está aberto no diálogo de pré-visualização. */
  const [exportDialogMsg, setExportDialogMsg] = useState(null)

  const bottomRef = useRef(null)
  const profilePhotoInputRef = useRef(null)
  const chatListRepairAttempted = useRef(new Set())
  const peerProfileUnsubsRef = useRef(new Map())
  const suggestedPeerForExportRef = useRef(null)

  /** `listRow`: entrada em `chatList` com peerName/peerEmail gravados no envio. */
  const peerLabel = useCallback((uid, listRow) => {
    const p = peerProfilesMap[uid]
    if (p?.handle) return `@${p.handle}`
    if (p?.displayName) return p.displayName
    if (listRow?.peerName) return listRow.peerName
    if (p?.email) return p.email
    if (listRow?.peerEmail) return listRow.peerEmail
    return uid ? `${uid.slice(0, 10)}…` : '—'
  }, [peerProfilesMap])

  const filteredChatList = useMemo(() => {
    const q = normalizeInboxQuery(inboxSearch)
    if (!q) return chatList
    return chatList.filter((row) => {
      const bits = [
        peerLabel(row.peerUid, row),
        row.chatId,
        row.peerUid,
        row.preview,
        row.peerName,
        row.peerEmail
      ]
      const prof = peerProfilesMap[row.peerUid]
      if (prof) {
        bits.push(
          prof.handle,
          prof.displayName,
          prof.email,
          prof.phoneDisplay,
          prof.city,
          prof.professionOrStudy,
          prof.church
        )
      }
      const hay = normalizeInboxQuery(bits.filter(Boolean).join(' '))
      return hay.includes(q)
    })
  }, [chatList, inboxSearch, peerLabel, peerProfilesMap])

  useLayoutEffect(() => {
    if (!isConfigured || user === undefined || !user?.uid || activeChatId) {
      setAppBarChatSlot(null)
      return
    }
    const el = document.getElementById('chat-appbar-actions')
    setAppBarChatSlot(el || null)
  }, [isConfigured, user, activeChatId])

  useEffect(() => {
    if (!user?.uid) {
      setProfileSyncedFromDb(false)
      return
    }
    setProfileSyncedFromDb(false)
    return subscribeUserProfile(user.uid, (data) => {
      setMyProfile(data)
      setProfileSyncedFromDb(true)
    })
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !user?.email || usuarioPrecisaVerificarEmail(user)) return
    ensurePublicProfileHasEmail(user.uid, user.email).catch(() => {})
  }, [user?.uid, user?.email, user?.emailVerified])

  useEffect(() => {
    if (!user?.uid) {
      setPendingExport(null)
      return
    }
    try {
      const raw = sessionStorage.getItem(PENDING_CHAT_EXPORT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (typeof parsed?.exportPayload === 'string' && parsed?.exportKind) {
        setPendingExport({
          exportKind: parsed.exportKind,
          exportPayload: parsed.exportPayload,
          previewText: String(parsed.previewText || ''),
          suggestedPeerUid: String(parsed.suggestedPeerUid || '').trim()
        })
      }
    } catch {
      sessionStorage.removeItem(PENDING_CHAT_EXPORT_KEY)
    }
  }, [user?.uid])

  // Pós-login: se o usuário foi enviado para o Chat só porque tentou abrir
  // um recurso protegido (Strong, Plano de leitura, etc.), retomamos a
  // intenção original e o devolvemos para o destino correto.
  useEffect(() => {
    if (!user?.uid || usuarioPrecisaVerificarEmail(user)) return
    try {
      if (sessionStorage.getItem(PENDING_CHAT_EXPORT_KEY)) return
    } catch (_) {
      // Sem acesso a sessionStorage: segue tentando o redirect mesmo assim.
    }
    const destino = consumePendingLoginRedirect()
    if (!destino) return
    navigate(destino, { replace: true })
  }, [user?.uid, user?.emailVerified, navigate])

  useEffect(() => {
    if (!pendingExport) {
      suggestedPeerForExportRef.current = null
    }
  }, [pendingExport])

  useEffect(() => {
    const sp = pendingExport?.suggestedPeerUid
    if (!sp || !user?.uid || activeChatId) return
    if (suggestedPeerForExportRef.current === sp) return
    suggestedPeerForExportRef.current = sp
    void openChatWithPeer(sp).catch(() => {
      suggestedPeerForExportRef.current = null
    })
    // openChatWithPeer é estável o suficiente para este fluxo pontual
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita reabrir ao mudar referência da função
  }, [pendingExport?.suggestedPeerUid, user?.uid, activeChatId])

  useEffect(() => {
    if (!user?.uid || usuarioPrecisaVerificarEmail(user)) return
    ensurePublicProfileMirrorAuth(user.uid, {
      email: user.email || '',
      photoURL: user.photoURL || '',
      displayName: user.displayName || ''
    }).catch(() => {})
  }, [user?.uid, user?.email, user?.photoURL, user?.displayName, user?.emailVerified])

  useEffect(() => {
    if (!user) return
    setProfileName(user.displayName || myProfile.displayName || '')
    setProfilePhone(myProfile.phoneDisplay || '')
    setProfileHandleInput(myProfile.handle ? `@${myProfile.handle}` : '')
    setProfileCity(typeof myProfile.city === 'string' ? myProfile.city : '')
    setProfileProfession(typeof myProfile.professionOrStudy === 'string' ? myProfile.professionOrStudy : '')
    setProfileChurch(typeof myProfile.church === 'string' ? myProfile.church : '')
  }, [
    user,
    myProfile.displayName,
    myProfile.phoneDisplay,
    myProfile.handle,
    myProfile.city,
    myProfile.professionOrStudy,
    myProfile.church,
    user?.displayName
  ])

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeUserChatList(user.uid, setChatList)
    return unsub
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    const u1 = subscribeFavorites(user.uid, setFavorites)
    const u2 = subscribeFriendRequestsIn(user.uid, setFriendRequestsIn)
    const u3 = subscribeFriendRequestsOut(user.uid, setFriendRequestsOut)
    const u4 = subscribeFriends(user.uid, setFriends)
    const u5 = subscribeRecentPeople(user.uid, setRecentPeople)
    return () => {
      u1()
      u2()
      u3()
      u4()
      u5()
    }
  }, [user?.uid])

  /**
   * Migração suave: se o usuário tinha "Recentes" gravados no `localStorage`
   * (versão anterior, por dispositivo), envia para o RTDB e limpa a chave local.
   * Não corre se já houver dados no RTDB para este usuário — assim evitamos
   * sobrescrever entradas mais novas vindas de outro dispositivo.
   */
  const recentPeopleMigratedRef = useRef(false)
  useEffect(() => {
    if (!user?.uid || recentPeopleMigratedRef.current) return
    const legacy = readLegacyRecentPeople()
    if (legacy.length === 0) {
      recentPeopleMigratedRef.current = true
      return
    }
    if (recentPeople.length > 0) {
      clearLegacyRecentPeople()
      recentPeopleMigratedRef.current = true
      return
    }
    recentPeopleMigratedRef.current = true
    void (async () => {
      try {
        for (const row of legacy) {
          await setRecentPerson(user.uid, row)
        }
      } finally {
        clearLegacyRecentPeople()
      }
    })()
  }, [user?.uid, recentPeople.length])

  const peerUidsKey = useMemo(() => {
    const u = new Set(
      [
        ...favorites.map((f) => f.peerUid),
        ...friendRequestsIn.map((r) => r.fromUid),
        ...friendRequestsOut.map((r) => r.toUid),
        ...friends.map((f) => f.peerUid),
        ...chatList.map((c) => c.peerUid)
      ].filter(Boolean)
    )
    return [...u].sort().join(',')
  }, [favorites, friendRequestsIn, friendRequestsOut, friends, chatList])

  useEffect(() => {
    if (!user?.uid) {
      peerProfileUnsubsRef.current.forEach((unsub) => unsub())
      peerProfileUnsubsRef.current.clear()
      setPeerProfilesMap({})
      return
    }
    const want = new Set(peerUidsKey ? peerUidsKey.split(',').filter(Boolean) : [])
    const m = peerProfileUnsubsRef.current
    for (const uid of want) {
      if (m.has(uid)) continue
      const unsub = subscribePeerPublicProfile(uid, (data) => {
        setPeerProfilesMap((prev) => ({ ...prev, [uid]: { ...data } }))
      })
      m.set(uid, unsub)
    }
    for (const uid of [...m.keys()]) {
      if (!want.has(uid)) {
        m.get(uid)?.()
        m.delete(uid)
        setPeerProfilesMap((prev) => {
          if (!prev[uid]) return prev
          const next = { ...prev }
          delete next[uid]
          return next
        })
      }
    }
  }, [user?.uid, peerUidsKey])

  const visibleMessages = useMemo(
    () => messages.filter((m) => !hiddenMsgIds[m.id]),
    [messages, hiddenMsgIds]
  )

  const totalChatUnread = useMemo(
    () => chatList.reduce((acc, r) => acc + Math.max(0, Number(r.unreadCount) || 0), 0),
    [chatList]
  )

  const activeChatListRow = useMemo(
    () => chatList.find((c) => c.chatId === activeChatId),
    [chatList, activeChatId]
  )

  const lastMsgFromPeer = useMemo(() => {
    if (!activePeerUid) return null
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      const m = visibleMessages[i]
      if (m.senderUid === activePeerUid) return m
    }
    return null
  }, [visibleMessages, activePeerUid])

  useEffect(() => {
    if (!activeChatId || !user?.uid) {
      setMessages([])
      chatListRepairAttempted.current.clear()
      return
    }
    const unsub = subscribeMessages(activeChatId, setMessages)
    return unsub
  }, [activeChatId, user?.uid])

  useEffect(() => {
    if (!user?.uid || !activeChatId) {
      setHiddenMsgIds({})
      return
    }
    return subscribeHiddenMessageIds(user.uid, activeChatId, setHiddenMsgIds)
  }, [user?.uid, activeChatId])

  /** WebView/Capacitor: o WebSocket pode ficar em pausa; ao voltar à tela, sincroniza mensagens. */
  useEffect(() => {
    if (!activeChatId || !user?.uid) return
    let cancelled = false
    const sync = () => {
      fetchChatMessages(activeChatId)
        .then((rows) => {
          if (!cancelled) setMessages(rows)
        })
        .catch(() => {})
    }
    const onVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVis)
    const capP = import('@capacitor/app')
      .then(({ App }) => App.addListener('resume', sync))
      .catch(() => null)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      capP.then((h) => h && h.remove()).catch(() => {})
    }
  }, [activeChatId, user?.uid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages, activeChatId])

  /** Uma vez por conversa aberta: repõe chatList/participantes se faltar (dados antigos). */
  useEffect(() => {
    if (!user?.uid || !activeChatId || !activePeerUid || visibleMessages.length === 0) return
    if (chatListRepairAttempted.current.has(activeChatId)) return
    chatListRepairAttempted.current.add(activeChatId)
    const last = visibleMessages[visibleMessages.length - 1]
    const preview = (last?.text && String(last.text).slice(0, 120)) || ''
    let lastTs = Date.now()
    if (last?.ts != null) {
      const n = typeof last.ts === 'number' ? last.ts : null
      if (n != null) lastTs = n
    }
    repairDmChatListIfMissing({
      chatId: activeChatId,
      myUid: user.uid,
      peerUid: activePeerUid,
      preview,
      lastTs
    }).catch(() => {})
  }, [user?.uid, activeChatId, activePeerUid, visibleMessages])

  useEffect(() => {
    setMsgMenu(null)
  }, [activeChatId])

  /** Abrir conversa = marcar como lida; novas mensagens com o chat aberto também. */
  useEffect(() => {
    if (!user?.uid || !activeChatId) return
    markChatAsRead(user.uid, activeChatId).catch(() => {})
  }, [user?.uid, activeChatId])

  useEffect(() => {
    if (!user?.uid || !activeChatId || visibleMessages.length === 0) return
    const t = window.setTimeout(() => {
      markChatAsRead(user.uid, activeChatId).catch(() => {})
    }, 400)
    return () => window.clearTimeout(t)
  }, [user?.uid, activeChatId, visibleMessages.length])

  useEffect(() => {
    if (!activePeerUid) {
      setPeerProfile(null)
      return
    }
    let cancelled = false
    fetchUserProfile(activePeerUid).then((p) => {
      if (!cancelled) setPeerProfile(p)
    })
    return () => {
      cancelled = true
    }
  }, [activePeerUid])

  useEffect(() => {
    if (!chatListNotice) return
    const t = setTimeout(() => setChatListNotice(''), 5000)
    return () => clearTimeout(t)
  }, [chatListNotice])

  const searchPeopleByTermEnriched = useCallback(async (termRaw) => {
    const normHandle = normalizePublicHandle(String(termRaw).replace(/^@+/, ''))
    const normEmail = String(termRaw ?? '')
      .trim()
      .toLowerCase()
    if (normHandle.length < 2 && normEmail.length < 2) {
      const e = new Error('SHORT')
      e.code = 'SHORT'
      throw e
    }
    const rows = await searchPeopleByTerm(termRaw, 30)
    const enriched = await Promise.all(
      rows.map(async ({ handle, uid, email: emailFromIndex, displayName: nameFromIndex }) => {
        if (!uid) {
          return {
            handle: handle || '',
            uid: '',
            displayName: '',
            photoURL: '',
            email: emailFromIndex || '',
            city: '',
            professionOrStudy: '',
            church: ''
          }
        }
        let p = null
        try {
          p = await fetchUserProfile(uid)
        } catch {
          p = null
        }
        const photoURL =
          typeof p?.photoURL === 'string' && p.photoURL.trim() ? p.photoURL.trim() : ''
        const profileHandle =
          typeof p?.handle === 'string' && p.handle.trim() ? p.handle.trim() : handle || ''
        const email =
          (emailFromIndex && String(emailFromIndex).trim()) ||
          (p?.email && String(p.email).trim()) ||
          ''
        return {
          handle: profileHandle,
          uid,
          displayName:
            (p?.displayName && String(p.displayName)) ||
            (nameFromIndex && String(nameFromIndex)) ||
            '',
          photoURL,
          email,
          city: (p?.city && String(p.city)) || '',
          professionOrStudy: (p?.professionOrStudy && String(p.professionOrStudy)) || '',
          church: (p?.church && String(p.church)) || ''
        }
      })
    )
    return enriched.filter((r) => r.uid)
  }, [])

  /**
   * Chave estável dos UIDs já em conversa — usada para filtrar a busca de "Pessoas"
   * sem reabrir o efeito a cada novo snapshot do chatList (que muda referência mesmo
   * sem mudança real de conjunto).
   */
  const chatListPeerUidsKey = useMemo(
    () => chatList.map((c) => c.peerUid).filter(Boolean).sort().join(','),
    [chatList]
  )

  /**
   * Conjuntos auxiliares para anotar resultados de "Pessoas" com chip Amigo/Favorito
   * — sem reler `friends`/`favorites` a cada render.
   */
  const friendsUidSet = useMemo(
    () => new Set(friends.map((f) => f.peerUid).filter(Boolean)),
    [friends]
  )
  const favoritesUidSet = useMemo(
    () => new Set(favorites.map((f) => f.peerUid).filter(Boolean)),
    [favorites]
  )

  /**
   * Adiciona uma pessoa ao topo de "Recentes". Persiste no RTDB (sincroniza
   * entre dispositivos); a subscrição em `subscribeRecentPeople` retorna o
   * estado atualizado.
   */
  const pushRecentPerson = useCallback(
    (person) => {
      if (!person || !person.uid || !user?.uid) return
      setRecentPerson(user.uid, person).catch(() => {})
    },
    [user?.uid]
  )

  /**
   * Recentes a exibir = só quem **ainda não está** em `chatList` (já apareceria
   * em "Conversas") e diferente de mim. Quem entrou para a inbox vira "conversa"
   * e desaparece daqui sozinho, evitando ruído visual.
   */
  const recentPeopleToShow = useMemo(() => {
    if (!user?.uid) return []
    const existingUids = new Set(
      chatListPeerUidsKey ? chatListPeerUidsKey.split(',').filter(Boolean) : []
    )
    return recentPeople.filter(
      (r) => r && r.uid && r.uid !== user.uid && !existingUids.has(r.uid)
    )
  }, [recentPeople, chatListPeerUidsKey, user?.uid])

  /** Sai da tela de mensagens e volta à Bíblia (mantém a sessão). */
  const handleLeaveChat = useCallback(() => {
    setActiveChatId(null)
    setActivePeerUid(null)
    navigate('/', { replace: true })
  }, [navigate])

  const dismissRecentPerson = useCallback(
    async (peerUid) => {
      if (!user?.uid || !peerUid) return
      setRecentPeople((prev) => prev.filter((r) => r.uid !== peerUid))
      try {
        await removeRecentPerson(user.uid, peerUid)
      } catch (e) {
        setLastError(
          hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível remover dos recentes.'
        )
      }
    },
    [user?.uid, setLastError]
  )

  const handleClearRecentPeople = useCallback(async () => {
    if (!user?.uid) return
    setBusy(true)
    setLastError(null)
    try {
      setRecentPeople([])
      await clearRecentPeople(user.uid)
      setChatListNotice('Pesquisas recentes removidas.')
    } catch (e) {
      setLastError(
        hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível limpar os recentes.'
      )
    } finally {
      setBusy(false)
    }
  }, [user?.uid, setLastError])

  useEffect(() => {
    if (!user || searchParams.get('perfil') !== '1') return
    setProfileDialogOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('perfil')
    setSearchParams(next, { replace: true })
  }, [user, searchParams, setSearchParams])

  /**
   * Busca pessoas (handles) enquanto o usuário digita na barra da caixa de entrada,
   * com debounce e exclusão de quem já está em alguma conversa — assim a seção
   * "Pessoas" só lista contatos **novos**, complementando "Conversas".
   */
  useEffect(() => {
    if (!user?.uid) {
      setInboxPeopleResults([])
      setInboxPeopleBusy(false)
      return
    }
    const term = inboxSearch.trim().replace(/^@+/, '')
    if (term.length < 2) {
      setInboxPeopleResults([])
      setInboxPeopleBusy(false)
      return
    }
    let cancelled = false
    setInboxPeopleBusy(true)
    const handle = window.setTimeout(async () => {
      try {
        const rows = await searchPeopleByTermEnriched(inboxSearch)
        if (cancelled) return
        const existingUids = new Set(
          chatListPeerUidsKey ? chatListPeerUidsKey.split(',').filter(Boolean) : []
        )
        const filtered = rows.filter(
          (r) => r.uid && r.uid !== user.uid && !existingUids.has(r.uid)
        )
        setInboxPeopleResults(filtered)
      } catch (err) {
        if (!cancelled) {
          if (err?.code !== 'SHORT') {
            setChatListNotice('Não foi possível buscar pessoas. Tente de novo.')
          }
          setInboxPeopleResults([])
        }
      } finally {
        if (!cancelled) setInboxPeopleBusy(false)
      }
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [inboxSearch, user?.uid, chatListPeerUidsKey, searchPeopleByTermEnriched])

  /**
   * Liga/desliga "favorito" para uma pessoa. Como `addFavorite`/`removeFavorite`
   * dependem de `auth.uid`, validamos `user?.uid` e ignoramos no estado anônimo
   * (defesa em profundidade — a UI já não permite chegar aqui sem login).
   */
  const toggleFavorite = useCallback(
    async (peerUid) => {
      if (!user?.uid || !peerUid || peerUid === user.uid) return
      try {
        if (favoritesUidSet.has(peerUid)) {
          await removeFavorite(user.uid, peerUid)
          setChatListNotice('Removido dos favoritos.')
        } else {
          await addFavorite(user.uid, peerUid)
          setChatListNotice('Adicionado aos favoritos.')
        }
      } catch (e) {
        setLastError(
          hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível atualizar o favorito.'
        )
      }
    },
    [user?.uid, favoritesUidSet, setLastError]
  )

  const openChatWithPeer = async (raw) => {
    const p = String(raw ?? '').trim()
    if (!p || !user?.uid) return
    setBusy(true)
    setLastError(null)
    try {
      const peerUid = await resolvePeerToUid(p)
      if (!peerUid) {
        setLastError('Não encontramos esse @apelido, e-mail ou UID. Confira com a pessoa.')
        return
      }
      if (peerUid === user.uid) {
        setLastError('Use o @apelido, e-mail ou UID de outra pessoa.')
        return
      }
      const cid = dmChatId(user.uid, peerUid)
      await ensureChatMembership(cid, user.uid, peerUid)
      setActiveChatId(cid)
      setActivePeerUid(peerUid)
      setPeerUidInput('')
      setLastError(null)
      setChatListNotice('')
    } catch (e) {
      setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível abrir a conversa.')
    } finally {
      setBusy(false)
    }
  }

  const resolvePeerOnly = async (raw) => {
    const p = String(raw ?? '').trim()
    if (!p || !user?.uid) return null
    const peerUid = await resolvePeerToUid(p)
    if (!peerUid || peerUid === user.uid) return null
    return peerUid
  }

  const openPeerDialog = (mode) => {
    setPeerDialog(mode)
    setPeerDialogInput(peerUidInput.trim())
    setPeerDialogError('')
    setLastError(null)
  }

  const closePeerDialog = () => {
    setPeerDialog(null)
    setPeerDialogInput('')
    setPeerDialogError('')
  }

  const submitPeerDialog = async () => {
    if (!user?.uid || !peerDialog) return
    setPeerDialogError('')
    setBusy(true)
    setLastError(null)
    try {
      const peerUid = await resolvePeerOnly(peerDialogInput)
      if (!peerUid) {
        setPeerDialogError('Informe um @apelido ou UID válido (não é possível usar a sua própria conta).')
        return
      }
      if (peerDialog === 'favorite') {
        await addFavorite(user.uid, peerUid)
        setChatListNotice('Adicionado aos favoritos.')
      } else {
        await sendFriendRequest(user.uid, peerUid)
        setChatListNotice('Pedido de amizade enviado.')
      }
      setPeerUidInput('')
      closePeerDialog()
    } catch (e) {
      setPeerDialogError(e?.message || 'Não foi possível concluir.')
    } finally {
      setBusy(false)
    }
  }

  const saveProfileBasics = async () => {
    if (!user?.uid) return
    setBusy(true)
    setLastError(null)
    try {
      const auth = getFirebaseAuth()
      if (auth?.currentUser && profileName.trim()) {
        await updateProfile(auth.currentUser, { displayName: profileName.trim() })
      }
      await writeUserProfilePublic(user.uid, {
        displayName: profileName.trim(),
        email: user.email || '',
        handle: myProfile.handle || '',
        phoneDisplay: profilePhone.trim(),
        photoURL: (myProfile.photoURL || user?.photoURL || '').trim(),
        city: profileCity.trim(),
        professionOrStudy: profileProfession.trim(),
        church: profileChurch.trim()
      })
    } catch (e) {
      setLastError(e?.message || 'Não foi possível salvar o perfil.')
    } finally {
      setBusy(false)
    }
  }

  const savePublicHandle = async () => {
    if (!user?.uid) return
    setBusy(true)
    setLastError(null)
    try {
      const raw = profileHandleInput.trim().replace(/^@+/, '')
      if (!raw) {
        setLastError('Digite um apelido (ex.: maria_silva).')
        return
      }
      const h = await claimPublicHandle(user.uid, raw, myProfile.handle || '')
      await writeUserProfilePublic(user.uid, {
        displayName: profileName.trim() || user.displayName || '',
        email: user.email || '',
        handle: h,
        phoneDisplay: profilePhone.trim(),
        photoURL: (myProfile.photoURL || user?.photoURL || '').trim(),
        city: profileCity.trim(),
        professionOrStudy: profileProfession.trim(),
        church: profileChurch.trim()
      })
      setMyProfile((prev) => ({ ...prev, handle: h }))
      setProfileHandleInput(`@${h}`)
      setProfileDialogOpen(false)
    } catch (e) {
      setLastError(e?.message || 'Não foi possível reservar este apelido.')
    } finally {
      setBusy(false)
    }
  }

  const handleProfilePhotoSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.uid) return
    setBusy(true)
    setLastError(null)
    try {
      const blob = await compressImageToJpeg(file, 512, 0.82)
      const url = await uploadProfilePhoto(user.uid, blob)
      const auth = getFirebaseAuth()
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url })
      }
      await writeUserProfilePublic(user.uid, {
        displayName: profileName.trim(),
        email: user.email || '',
        handle: myProfile.handle || '',
        phoneDisplay: profilePhone.trim(),
        photoURL: url,
        city: profileCity.trim(),
        professionOrStudy: profileProfession.trim(),
        church: profileChurch.trim()
      })
    } catch (err) {
      setLastError(hintRtdbPermissionDenied(err) || err?.message || 'Não foi possível enviar a foto.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveProfilePhoto = async () => {
    if (!user?.uid) return
    const ok = await confirmarAsync({
      titulo: 'Remover foto',
      mensagem: 'Remover a foto de perfil?',
      labelOk: 'Remover',
      destrutivo: true
    })
    if (!ok) return
    setBusy(true)
    setLastError(null)
    try {
      await deleteProfilePhotoFile(user.uid)
      const auth = getFirebaseAuth()
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: '' })
      }
      await writeUserProfilePublic(user.uid, {
        displayName: profileName.trim(),
        email: user.email || '',
        handle: myProfile.handle || '',
        phoneDisplay: profilePhone.trim(),
        photoURL: '',
        city: profileCity.trim(),
        professionOrStudy: profileProfession.trim(),
        church: profileChurch.trim()
      })
    } catch (err) {
      setLastError(hintRtdbPermissionDenied(err) || err?.message || 'Não foi possível remover a foto.')
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    if (!activeChatId || !user?.uid || !activePeerUid) return
    setBusy(true)
    setLastError(null)
    try {
      await sendChatMessage({
        chatId: activeChatId,
        text: draft,
        myUid: user.uid,
        peerUid: activePeerUid,
        senderDisplayName: user.displayName || myProfile.displayName || '',
        senderEmail: user.email || myProfile.email || ''
      })
      setDraft('')
      const rows = await fetchChatMessages(activeChatId)
      setMessages(rows)
    } catch (e) {
      setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Falha ao enviar.')
    } finally {
      setBusy(false)
    }
  }

  const handleSendPendingExport = async () => {
    if (!pendingExport || !activeChatId || !user?.uid || !activePeerUid) return
    setBusy(true)
    setLastError(null)
    try {
      await sendChatMessage({
        chatId: activeChatId,
        text: pendingExport.previewText,
        myUid: user.uid,
        peerUid: activePeerUid,
        senderDisplayName: user.displayName || myProfile.displayName || '',
        senderEmail: user.email || myProfile.email || '',
        exportKind: pendingExport.exportKind,
        exportPayload: pendingExport.exportPayload
      })
      sessionStorage.removeItem(PENDING_CHAT_EXPORT_KEY)
      setPendingExport(null)
      const rows = await fetchChatMessages(activeChatId)
      setMessages(rows)
    } catch (e) {
      setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Falha ao enviar o pacote.')
    } finally {
      setBusy(false)
    }
  }

  const confirmApplyExport = (kind) => {
    const mensagemPorKind = {
      discipulado:
        'As respostas deste envio serão mescladas com as suas neste módulo. Deseja continuar?',
      versiculos_marcados:
        'Os versículos marcados serão mesclados com os seus (não apaga os que já tem). Continuar?',
      biblia_versiculos:
        'Os versículos serão adicionados aos seus marcados (onde ainda não existirem). Continuar?',
      devocional: 'A lista de devocionais lidos será mesclada com a sua. Continuar?',
      mais_de_deus: 'A lista de subtemas lidos será mesclada com a sua. Continuar?',
      quiz: 'Serão mesclados apenas pontos (Fase 1) e desbloqueios de fases no seu dispositivo. Continuar?',
      estudo_biblico: 'Abrir a leitura deste estudo compartilhado no aplicativo? (É preciso estar online.)',
      prova_biblica: 'Abrir a página de resultado desta avaliação (somente leitura)?'
    }
    return confirmarAsync({
      titulo: 'Aplicar este envio?',
      mensagem: mensagemPorKind[kind] || 'Aplicar este envio no aplicativo?',
      labelOk: 'Aplicar'
    })
  }

  const handleApplyExport = async (kind, data) => {
    if (!kind || !data) return
    const ok = await confirmApplyExport(kind)
    if (!ok) return
    applyExportImport(kind, data, {
      setDiscipuladoRespostas,
      setDiscipuladoTema,
      navigate
    })
    setExportDialogMsg(null)
  }

  if (!isConfigured) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Mensagens
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          As mensagens ainda não estão disponíveis neste aplicativo. Atualize para a versão mais recente ou entre em
          contato com o suporte.
        </Typography>
      </Box>
    )
  }

  if (user === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (user && usuarioPrecisaVerificarEmail(user)) {
    return (
      <Box sx={{ p: 1 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowBack />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={600}>
            Confirmar e-mail
          </Typography>
        </Stack>
        <EmailVerificationGate email={user.email} />
      </Box>
    )
  }

  if (!user) {
    return (
      <Box sx={{ p: 1 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <IconButton onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowBack />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={600}>
            Mensagens
          </Typography>
        </Stack>
        <AuthConectarForm />
      </Box>
    )
  }

  const legacyAnonymousBlocked = user.isAnonymous === true && profileSyncedFromDb
  const mustCompletePublicHandle =
    !user.isAnonymous && profileSyncedFromDb && !String(myProfile?.handle || '').trim()

  return (
    <Box
      data-no-global-pinch
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        background: !activeChatId ? 'linear-gradient(135deg, #004d40 0%, #00695c 100%)' : undefined
      }}
    >
      {appBarChatSlot
        ? createPortal(
            <Badge
              color="error"
              variant="dot"
              invisible={friendRequestsIn.length === 0}
              overlap="circular"
            >
                <IconButton
                  color="inherit"
                  aria-label="Mais opções"
                  edge="end"
                  onClick={(e) => setInboxMenuAnchor(e.currentTarget)}
                >
                  <MoreVertIcon />
                </IconButton>
            </Badge>,
            appBarChatSlot
          )
        : null}

      <Dialog
        open={legacyAnonymousBlocked}
        disableEscapeKeyDown
        onClose={() => {}}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Sessão anônima não é mais permitida</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
            Por segurança, as mensagens exigem conta com e-mail ou Google. Entre com um destes métodos na tela de
            login (menu Conectar).
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" disabled={busy} onClick={() => void logout().then(() => navigate('/chat', { replace: true }))}>
            Ir para o login
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={mustCompletePublicHandle}
        disableEscapeKeyDown
        onClose={() => {}}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Escolha o seu @apelido</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              O apelido é público e único (mínimo de 3 caracteres). Você só precisa escolher uma vez; depois pode usar o
              chat normalmente.
            </Typography>
            <TextField
              size="small"
              fullWidth
              label="Apelido público (@)"
              value={profileHandleInput}
              onChange={(e) => setProfileHandleInput(e.target.value)}
              placeholder="ex.: maria_silva"
              helperText="Letras minúsculas, números e _"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" disabled={busy} onClick={() => savePublicHandle()}>
            Salvar apelido
          </Button>
        </DialogActions>
      </Dialog>

      <Stack
        component="header"
        aria-label="Mensagens"
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{
          px: 1,
          py: 0.5,
          borderBottom: 1,
          borderColor: !activeChatId ? 'rgba(255,255,255,0.22)' : 'divider',
          gap: 0.5,
          flexWrap: 'nowrap'
        }}
      >
        <IconButton
          onClick={() => {
            if (activeChatId) {
              setActiveChatId(null)
              setActivePeerUid(null)
            } else {
              handleLeaveChat()
            }
          }}
          aria-label={activeChatId ? 'Fechar conversa' : 'Voltar para a Bíblia'}
          sx={{
            color: !activeChatId ? 'common.white' : undefined,
            flexShrink: 0
          }}
        >
          <ArrowBack />
        </IconButton>
        {!activeChatId ? (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                  minWidth: 0,
                  width: '100%',
                  color: 'common.white'
                }}
              >
                <Typography
                  component="span"
                  variant="caption"
                  fontWeight={700}
                  noWrap
                  sx={{ flexShrink: 0, maxWidth: '45%', color: 'inherit' }}
                  title={myProfile.handle ? `@${myProfile.handle}` : undefined}
                >
                  {myProfile.handle ? `@${myProfile.handle}` : '—'}
                </Typography>
                <Typography component="span" variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                  |
                </Typography>
                <Typography
                  component="span"
                  variant="caption"
                  noWrap
                  sx={{ flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.92)' }}
                  title={user.email || undefined}
                >
                  {user.email || '—'}
                </Typography>
              </Stack>
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}
      </Stack>

      {(lastError || chatListNotice) && (
        <Box sx={{ px: 2, pt: 1, flexShrink: 0 }}>
          {lastError ? (
            <Alert severity="error" onClose={() => setLastError(null)}>
              {lastError}
            </Alert>
          ) : (
            <Alert severity="success" onClose={() => setChatListNotice('')}>
              {chatListNotice}
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeChatId ? (
          <>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderBottom: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                flexShrink: 0,
                bgcolor: 'rgba(0, 0, 0, 0.22)'
              }}
            >
              <TextField
                size="small"
                fullWidth
                placeholder="Pesquisar conversas e pessoas (nome, @apelido, e-mail…)"
                value={inboxSearch}
                onChange={(e) => setInboxSearch(e.target.value)}
                sx={{
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.55)',
                    opacity: 1
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.75)' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    color: 'common.white',
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.65)' }
                  }
                }}
              />
              {totalChatUnread > 0 ? (
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 0.75, fontWeight: 700, color: '#ffcdd2' }}
                >
                  {totalChatUnread > 99 ? '99+' : totalChatUnread} conversa(s) com mensagens não lidas
                </Typography>
              ) : null}
            </Box>

            {pendingExport ? (
              <Alert severity="info" sx={{ mx: 1.5, mt: 1, flexShrink: 0 }}>
                {`Envio pendente (${EXPORT_KIND_LABELS[pendingExport.exportKind] || 'conteúdo'}): abra uma conversa e toque em "Enviar agora" no topo do chat.`}
              </Alert>
            ) : null}

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {(() => {
                const hasQuery = inboxSearch.trim().length > 0
                const hasConvResults = filteredChatList.length > 0
                const hasPeopleResults = inboxPeopleResults.length > 0
                const peopleTermLongEnough =
                  inboxSearch.trim().replace(/^@+/, '').length >= 2
                if (!hasQuery && chatList.length === 0) {
                  return (
                    <Typography
                      variant="body2"
                      sx={{ px: 2, py: 3, color: 'rgba(255,255,255,0.92)' }}
                    >
                      Nenhuma conversa ainda. Pesquise por nome, <strong>@apelido</strong> ou <strong>e-mail</strong> na barra acima.
                </Typography>
                  )
                }
                if (
                  hasQuery &&
                  !hasConvResults &&
                  !hasPeopleResults &&
                  !inboxPeopleBusy &&
                  peopleTermLongEnough
                ) {
                  return (
                    <Typography
                      variant="body2"
                      sx={{ px: 2, py: 3, color: 'rgba(255,255,255,0.92)' }}
                    >
                      Nada encontrado para “{inboxSearch.trim()}”. Tente outra parte do nome, do <strong>@apelido</strong> ou do <strong>e-mail</strong>.
                </Typography>
                  )
                }
                if (
                  hasQuery &&
                  !hasConvResults &&
                  !hasPeopleResults &&
                  !inboxPeopleBusy &&
                  !peopleTermLongEnough
                ) {
                  return (
                    <Typography
                      variant="body2"
                      sx={{ px: 2, py: 3, color: 'rgba(255,255,255,0.92)' }}
                    >
                      Nenhuma conversa corresponde à pesquisa. Digite pelo menos 2 letras para procurar pessoas novas.
                    </Typography>
                  )
                }
                return null
              })()}

              {filteredChatList.length > 0 && (
                <>
                  {inboxSearch.trim() && (
                    <Typography
                      variant="overline"
                      sx={{
                        display: 'block',
                        px: 1.5,
                        pt: 1,
                        pb: 0.25,
                        letterSpacing: 0.5,
                        color: 'rgba(255,255,255,0.72)',
                        fontWeight: 700,
                      }}
                    >
                      Conversas ({filteredChatList.length})
                    </Typography>
                  )}
                <List
                  dense
                  disablePadding
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.12)',
                    borderRadius: 1,
                    m: 1,
                    p: 0.5
                  }}
                >
                  {filteredChatList.map((row) => {
                    const label = peerLabel(row.peerUid, row) || row.chatId
                    const initial = (label.replace(/^@/, '').charAt(0) || '?').toUpperCase()
                    const prof = peerProfilesMap[row.peerUid]
                    const listAvatarUrl = avatarUrlForPeer(prof, row)
                    return (
                      <Stack
                        key={row.chatId}
                        direction="row"
                        alignItems="stretch"
                        sx={{
                          mb: 0.6,
                          borderRadius: 1,
                          bgcolor: 'rgba(0, 0, 0, 0.38)',
                          border: 1,
                          borderColor: 'rgba(255,255,255,0.14)',
                          '&:last-of-type': { mb: 0 }
                        }}
                      >
                        <ListItemButton
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            py: 1.25,
                            alignItems: 'flex-start',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' }
                          }}
                          onClick={() => {
                            setActiveChatId(row.chatId)
                            setActivePeerUid(row.peerUid)
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 56, mt: 0.25 }}>
                            <Avatar
                              src={listAvatarUrl || undefined}
                              alt=""
                              imgProps={avatarImgProps}
                              sx={{
                                width: 48,
                                height: 48,
                                ...(listAvatarUrl
                                  ? { cursor: 'pointer' }
                                  : {})
                              }}
                              {...(listAvatarUrl
                                ? {
                                    onClick: (e) => {
                                      e.stopPropagation()
                                      openAvatarPreviewUrl(setAvatarPreviewUrl, listAvatarUrl)
                                    },
                                    'aria-label': 'Ver foto em tamanho grande'
                                  }
                                : {})}
                            >
                              {listAvatarUrl ? null : initial}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            sx={{ my: 0, flex: 1, minWidth: 0 }}
                            primary={
                              <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                spacing={1}
                                sx={{ width: '100%', mb: 0.25 }}
                              >
                                <Typography
                                  component="span"
                                  variant="body2"
                                  fontWeight={700}
                                  noWrap
                                  sx={{ flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.96)' }}
                                >
                                  {label}
                                </Typography>
                                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0 }}>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.72)' }}
                                  >
                                    {formatChatListRowTime(row.lastTs)}
                                  </Typography>
                                  {Number(row.unreadCount) > 0 ? (
                                    <Box
                                      component="span"
                                      aria-label={`${Number(row.unreadCount)} não lidas`}
                                      sx={{
                                        minWidth: 20,
                                        height: 20,
                                        px: Number(row.unreadCount) > 9 ? 0.5 : 0,
                                        borderRadius: 999,
                                        bgcolor: 'success.main',
                                        color: 'success.contrastText',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      {Number(row.unreadCount) > 99 ? '99+' : Number(row.unreadCount)}
                                    </Box>
                                  ) : null}
                                </Stack>
                              </Stack>
                            }
                            secondary={row.preview || '—'}
                            secondaryTypographyProps={{
                              noWrap: true,
                              sx: { color: 'rgba(255,255,255,0.68)' }
                            }}
                          />
                        </ListItemButton>
                        <IconButton
                          size="small"
                          aria-label="Apagar conversa só para mim"
                          disabled={busy}
                          sx={{
                            flexShrink: 0,
                            alignSelf: 'center',
                            mr: 0.5,
                            color: 'rgba(255,255,255,0.85)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteChatTarget({
                              chatId: row.chatId,
                              peerUid: row.peerUid,
                              label: peerLabel(row.peerUid, row) || row.chatId
                            })
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )
                  })}
                </List>
                </>
              )}

              {!inboxSearch.trim() && recentPeopleToShow.length > 0 ? (
                <>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ px: 1.5, pt: 1, pb: 0.25 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: 0.5,
                        color: 'rgba(255,255,255,0.72)',
                        fontWeight: 700,
                      }}
                    >
                      Pesquisadas recentemente ({recentPeopleToShow.length})
                    </Typography>
                    <Button
                      size="small"
                      disabled={busy || !user?.uid}
                      onClick={() => void handleClearRecentPeople()}
                      sx={{
                        ml: 'auto',
                        minWidth: 'auto',
                        px: 1,
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      Limpar
                    </Button>
                  </Stack>
                  <List
                    dense
                    disablePadding
                    sx={{
                      bgcolor: 'rgba(0, 0, 0, 0.12)',
                      borderRadius: 1,
                      m: 1,
                      p: 0.5,
                    }}
                  >
                    {recentPeopleToShow.map((row) => {
                      const initial = (row.handle?.charAt(0) || '?').toUpperCase()
                      const url = avatarUrlForSearchRow(row)
                      const meta =
                        [row.city, row.professionOrStudy, row.church]
                          .filter(Boolean)
                          .join(' · ') || (row.email || '—')
                      const isFriend = friendsUidSet.has(row.uid)
                      const isFavorite = favoritesUidSet.has(row.uid)
                      const ageLabel = formatRecentPersonAge(row.addedAt)
                      const fullDate = formatRecentPersonFullDate(row.addedAt)
                      return (
                        <Box key={row.uid} sx={{ mb: 0.6, '&:last-of-type': { mb: 0 } }}>
                          <SwipeFavoriteRow
                            isFavorite={isFavorite}
                            onToggleFavorite={() => toggleFavorite(row.uid)}
                            busy={busy}
                          >
                            <ListItemButton
                              disabled={busy}
                              onClick={() => {
                                pushRecentPerson(row)
                                openChatWithPeer(row.handle ? `@${row.handle}` : row.uid)
                              }}
                              sx={{
                                borderRadius: 1,
                                bgcolor: 'rgba(0, 0, 0, 0.38)',
                                border: 1,
                                borderColor: 'rgba(255,255,255,0.14)',
                                alignItems: 'center',
                                pr: 10,
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' }
                              }}
                            >
                              <ListItemAvatar sx={{ minWidth: 56 }}>
                                <Avatar
                                  src={url || undefined}
                                  alt=""
                                  imgProps={avatarImgProps}
                                  sx={{ width: 44, height: 44 }}
                                >
                                  {url ? null : initial}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Stack
                                    direction="row"
                                    spacing={0.75}
                                    alignItems="center"
                                    sx={{ minWidth: 0 }}
                                  >
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      fontWeight={700}
                                      noWrap
                                      sx={{ color: 'rgba(255,255,255,0.96)', minWidth: 0 }}
                                    >
                                      {row.handle
                                        ? `@${row.handle}`
                                        : row.displayName || row.email || row.uid.slice(0, 10) + '…'}
                                      {row.handle && row.displayName ? (
                                        <Typography
                                          component="span"
                                          variant="body2"
                                          sx={{
                                            ml: 0.75,
                                            fontWeight: 400,
                                            color: 'rgba(255,255,255,0.82)'
                                          }}
                                        >
                                          — {row.displayName}
                                        </Typography>
                                      ) : null}
                                    </Typography>
                                    {isFriend ? <PeopleChip label="Amigo" tone="friend" /> : null}
                                    {isFavorite ? (
                                      <PeopleChip label="Favorito" tone="favorite" />
                                    ) : null}
                                    {ageLabel ? (
                                      <Tooltip
                                        title={fullDate ? `Pesquisado em ${fullDate}` : ''}
                                        arrow
                                        enterTouchDelay={200}
                                      >
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          sx={{
                                            ml: 'auto',
                                            color: 'rgba(255,255,255,0.6)',
                                            fontStyle: 'italic',
                                            flexShrink: 0,
                                            cursor: 'help'
                                          }}
                                        >
                                          {ageLabel}
                                        </Typography>
                                      </Tooltip>
                                    ) : null}
                                  </Stack>
                                }
                                secondary={meta}
                                secondaryTypographyProps={{
                                  noWrap: true,
                                  sx: { color: 'rgba(255,255,255,0.62)' }
                                }}
                              />
                            </ListItemButton>
                            <Stack
                              direction="row"
                              spacing={0.25}
                              sx={{
                                position: 'absolute',
                                right: 6,
                                top: '50%',
                                transform: 'translateY(-50%)'
                              }}
                            >
                              <Tooltip title="Remover dos recentes" arrow>
                                <IconButton
                                  size="small"
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void dismissRecentPerson(row.uid)
                                  }}
                                  sx={{
                                    color: 'rgba(255,255,255,0.55)',
                                    '&:hover': {
                                      color: '#ffcdd2',
                                      bgcolor: 'rgba(255,255,255,0.08)'
                                    }
                                  }}
                                  aria-label="Remover dos recentes"
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip
                                title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                arrow
                              >
                                <IconButton
                                  size="small"
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(row.uid)
                                  }}
                                  sx={{
                                    color: isFavorite ? '#ffb300' : 'rgba(255,255,255,0.55)',
                                    '&:hover': {
                                      color: '#ffb300',
                                      bgcolor: 'rgba(255,255,255,0.08)'
                                    }
                                  }}
                                  aria-label={
                                    isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
                                  }
                                >
                                  {isFavorite ? (
                                    <StarIcon fontSize="small" />
                                  ) : (
                                    <StarBorderIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </SwipeFavoriteRow>
                        </Box>
                      )
                    })}
                  </List>
                </>
              ) : null}

              {inboxSearch.trim() &&
              (inboxPeopleResults.length > 0 || inboxPeopleBusy) ? (
                <>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ px: 1.5, pt: 1, pb: 0.25 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: 0.5,
                        color: 'rgba(255,255,255,0.72)',
                        fontWeight: 700,
                      }}
                    >
                      Pessoas{inboxPeopleResults.length > 0 ? ` (${inboxPeopleResults.length})` : ''}
                    </Typography>
                    {inboxPeopleBusy ? (
                      <CircularProgress size={12} sx={{ color: 'rgba(255,255,255,0.65)' }} />
                    ) : null}
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.55)', ml: 'auto' }}
                    >
                      Iniciar nova conversa
                    </Typography>
                  </Stack>
                  {inboxPeopleResults.length > 0 ? (
                    <List
                      dense
                      disablePadding
                      sx={{
                        bgcolor: 'rgba(0, 0, 0, 0.12)',
                        borderRadius: 1,
                        m: 1,
                        p: 0.5,
                      }}
                    >
                      {inboxPeopleResults.map((row) => {
                        const labelPrimary = row.handle
                          ? `@${row.handle}`
                          : row.displayName || row.email || row.uid?.slice(0, 10) || '—'
                        const initial = (
                          row.handle?.charAt(0) ||
                          row.displayName?.charAt(0) ||
                          row.email?.charAt(0) ||
                          '?'
                        ).toUpperCase()
                        const url = avatarUrlForSearchRow(row)
                        const meta =
                          [row.city, row.professionOrStudy, row.church]
                            .filter(Boolean)
                            .join(' · ') || (row.email || '—')
                        const isFriend = friendsUidSet.has(row.uid)
                        const isFavorite = favoritesUidSet.has(row.uid)
                        return (
                          <Box key={row.uid} sx={{ mb: 0.6, '&:last-of-type': { mb: 0 } }}>
                            <SwipeFavoriteRow
                              isFavorite={isFavorite}
                              onToggleFavorite={() => toggleFavorite(row.uid)}
                              busy={busy}
                            >
                              <ListItemButton
                                disabled={busy}
                                onClick={() => {
                                  pushRecentPerson(row)
                                  const destino = row.handle
                                    ? `@${row.handle}`
                                    : row.email || row.uid
                                  openChatWithPeer(destino)
                                }}
                                sx={{
                                  borderRadius: 1,
                                  bgcolor: 'rgba(0, 0, 0, 0.38)',
                                  border: 1,
                                  borderColor: 'rgba(255,255,255,0.14)',
                                  alignItems: 'center',
                                  pr: 6,
                                  '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' }
                                }}
                              >
                                <ListItemAvatar sx={{ minWidth: 56 }}>
                                  <Avatar
                                    src={url || undefined}
                                    alt=""
                                    imgProps={avatarImgProps}
                                    sx={{ width: 44, height: 44 }}
                                  >
                                    {url ? null : initial}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Stack
                                      direction="row"
                                      spacing={0.75}
                                      alignItems="center"
                                      sx={{ minWidth: 0 }}
                                    >
                                      <Typography
                                        component="span"
                                        variant="body2"
                                        fontWeight={700}
                                        noWrap
                                        sx={{ color: 'rgba(255,255,255,0.96)', minWidth: 0 }}
                                      >
                                        {labelPrimary}
                                        {row.handle && row.displayName ? (
                                          <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{
                                              ml: 0.75,
                                              fontWeight: 400,
                                              color: 'rgba(255,255,255,0.82)'
                                            }}
                                          >
                                            — {row.displayName}
                                          </Typography>
                                        ) : null}
                                        {!row.handle && row.displayName && row.email ? (
                                          <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{
                                              ml: 0.75,
                                              fontWeight: 400,
                                              color: 'rgba(255,255,255,0.72)'
                                            }}
                                          >
                                            ({row.email})
                                          </Typography>
                                        ) : null}
                                      </Typography>
                                      {isFriend ? <PeopleChip label="Amigo" tone="friend" /> : null}
                                      {isFavorite ? (
                                        <PeopleChip label="Favorito" tone="favorite" />
                                      ) : null}
                                    </Stack>
                                  }
                                  secondary={meta}
                                  secondaryTypographyProps={{
                                    noWrap: true,
                                    sx: { color: 'rgba(255,255,255,0.62)' }
                                  }}
                                />
                              </ListItemButton>
                              <Tooltip
                                title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                arrow
                              >
                                <IconButton
                                  size="small"
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(row.uid)
                                  }}
                                  sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: isFavorite ? '#ffb300' : 'rgba(255,255,255,0.55)',
                                    '&:hover': {
                                      color: '#ffb300',
                                      bgcolor: 'rgba(255,255,255,0.08)'
                                    }
                                  }}
                                  aria-label={
                                    isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
                                  }
                                >
                                  {isFavorite ? (
                                    <StarIcon fontSize="small" />
                                  ) : (
                                    <StarBorderIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </SwipeFavoriteRow>
                          </Box>
                        )
                      })}
                    </List>
                  ) : null}
                </>
              ) : null}
            </Box>

            <Menu
              anchorEl={inboxMenuAnchor}
              open={Boolean(inboxMenuAnchor)}
              onClose={() => setInboxMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => {
                  setInboxMenuAnchor(null)
                  setSettingsDialogOpen(true)
                }}
              >
                Configuração
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setInboxMenuAnchor(null)
                  setAuxListDialog('favorites')
                }}
              >
                Favoritos
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setInboxMenuAnchor(null)
                  openPeerDialog('friend')
                }}
              >
                Enviar pedido de amizade
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setInboxMenuAnchor(null)
                  setAuxListDialog('in')
                }}
              >
                Pedidos recebidos
                {friendRequestsIn.length > 0 ? ` (${friendRequestsIn.length})` : ''}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setInboxMenuAnchor(null)
                  setAuxListDialog('out')
                }}
              >
                Pedidos enviados
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setInboxMenuAnchor(null)
                  setAuxListDialog('friends')
                }}
              >
                Amigos
              </MenuItem>
            </Menu>

            <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle>Configuração</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    ID da sua conta:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  >
                    {user.uid}
                  </Typography>
                  {!myProfile.handle ? (
                    <Typography variant="body2" color="warning.main">
                      Escolha um @apelido na janela obrigatória ou em Editar perfil para outras pessoas encontrarem você.
                    </Typography>
                  ) : null}
                  <Button
                    variant="contained"
                    onClick={() => {
                      setSettingsDialogOpen(false)
                      setProfileDialogOpen(true)
                    }}
                  >
                    Editar perfil
                  </Button>
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setSettingsDialogOpen(false)}>Fechar</Button>
              </DialogActions>
            </Dialog>

            <Dialog
              open={auxListDialog != null}
              onClose={() => setAuxListDialog(null)}
              fullWidth
              maxWidth="sm"
              scroll="paper"
            >
              <DialogTitle>
                {auxListDialog === 'favorites'
                  ? 'Favoritos'
                  : auxListDialog === 'in'
                    ? 'Pedidos recebidos'
                    : auxListDialog === 'out'
                      ? 'Pedidos enviados'
                      : auxListDialog === 'friends'
                        ? 'Amigos'
                        : ''}
              </DialogTitle>
              <DialogContent dividers sx={{ pt: 1 }}>
                {auxListDialog === 'favorites' && (
                  <Stack spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => {
                        setAuxListDialog(null)
                        openPeerDialog('favorite')
                      }}
                    >
                      Adicionar favorito
                    </Button>
                    {favorites.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum favorito ainda.
                      </Typography>
                    ) : (
                      <List dense>
                        {favorites.map((row) => (
                          <Stack
                            key={row.peerUid}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ sm: 'center' }}
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}
                          >
                            <Typography variant="body2" noWrap title={row.peerUid}>
                              {peerLabel(row.peerUid)}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" variant="outlined" disabled={busy} onClick={() => openChatWithPeer(row.peerUid)}>
                                Chat
                              </Button>
                              <Button
                                size="small"
                                color="inherit"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true)
                                  setLastError(null)
                                  try {
                                    await removeFavorite(user.uid, row.peerUid)
                                  } catch (e) {
                                    setLastError(e?.message || 'Erro ao remover.')
                                  } finally {
                                    setBusy(false)
                                  }
                                }}
                              >
                                Remover
                              </Button>
                            </Stack>
                          </Stack>
                        ))}
                      </List>
                    )}
                  </Stack>
                )}

                {auxListDialog === 'in' && (
                  <>
                    {friendRequestsIn.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum pedido recebido.
                      </Typography>
                    ) : (
                      <List dense>
                        {friendRequestsIn.map((row) => (
                          <Stack
                            key={row.fromUid}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ sm: 'center' }}
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}
                          >
                            <Typography variant="body2" noWrap title={row.fromUid}>
                              {peerLabel(row.fromUid)}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true)
                                  setLastError(null)
                                  try {
                                    await acceptFriendRequest(user.uid, row.fromUid)
                                    setChatListNotice('Agora são amigos.')
                                  } catch (e) {
                                    setLastError(e?.message || 'Erro ao aceitar.')
                                  } finally {
                                    setBusy(false)
                                  }
                                }}
                              >
                                Aceitar
                              </Button>
                              <Button
                                size="small"
                                color="inherit"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true)
                                  setLastError(null)
                                  try {
                                    await rejectFriendRequest(user.uid, row.fromUid)
                                    setChatListNotice('Pedido recusado.')
                                  } catch (e) {
                                    setLastError(e?.message || 'Erro ao recusar.')
                                  } finally {
                                    setBusy(false)
                                  }
                                }}
                              >
                                Recusar
                              </Button>
                            </Stack>
                          </Stack>
                        ))}
                      </List>
                    )}
                  </>
                )}

                {auxListDialog === 'out' && (
                  <>
                    {friendRequestsOut.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum pedido enviado pendente.
                      </Typography>
                    ) : (
                      <List dense>
                        {friendRequestsOut.map((row) => (
                          <Stack
                            key={row.toUid}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ sm: 'center' }}
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}
                          >
                            <Typography variant="body2" noWrap title={row.toUid}>
                              {peerLabel(row.toUid)}
                            </Typography>
                            <Button
                              size="small"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true)
                                setLastError(null)
                                try {
                                  await cancelFriendRequest(user.uid, row.toUid)
                                  setChatListNotice('Pedido cancelado.')
                                } catch (e) {
                                  setLastError(e?.message || 'Erro ao cancelar.')
                                } finally {
                                  setBusy(false)
                                }
                              }}
                            >
                              Cancelar pedido
                            </Button>
                          </Stack>
                        ))}
                      </List>
                    )}
                  </>
                )}

                {auxListDialog === 'friends' && (
                  <>
                    {friends.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum amigo na lista ainda.
                      </Typography>
                    ) : (
                      <List dense>
                        {friends.map((row) => (
                          <Stack
                            key={row.peerUid}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ sm: 'center' }}
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}
                          >
                            <Typography variant="body2" noWrap title={row.peerUid}>
                              {peerLabel(row.peerUid)}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" variant="outlined" disabled={busy} onClick={() => openChatWithPeer(row.peerUid)}>
                                Chat
                              </Button>
                              <Button
                                size="small"
                                color="inherit"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true)
                                  setLastError(null)
                                  try {
                                    await removeFriend(user.uid, row.peerUid)
                                  } catch (e) {
                                    setLastError(e?.message || 'Erro ao remover.')
                                  } finally {
                                    setBusy(false)
                                  }
                                }}
                              >
                                Deixar de ser amigo
                              </Button>
                            </Stack>
                          </Stack>
                        ))}
                      </List>
                    )}
                  </>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setAuxListDialog(null)}>Fechar</Button>
              </DialogActions>
            </Dialog>
          </>
      ) : (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: 2, py: 0.5, bgcolor: 'action.hover', flexShrink: 0 }}
          >
            <Button
              size="small"
              onClick={() => {
                setActiveChatId(null)
                setActivePeerUid(null)
              }}
            >
              Conversas
            </Button>
            {(() => {
              const convLabel =
                peerProfile?.handle
                  ? `@${peerProfile.handle}`
                  : peerProfile?.displayName ||
                    lastMsgFromPeer?.senderDisplayName ||
                    activeChatListRow?.peerName ||
                    peerProfile?.email ||
                    lastMsgFromPeer?.senderEmail ||
                    activeChatListRow?.peerEmail ||
                    `Usuário ${activePeerUid.slice(0, 10)}…`
              const convInitial = (String(convLabel).replace(/^@/, '').charAt(0) || '?').toUpperCase()
              const convAvatarUrl = avatarUrlForPeer(
                peerProfile,
                activeChatListRow,
                lastMsgFromPeer?.senderEmail
              )
              return (
                <Avatar
                  src={convAvatarUrl || undefined}
                  alt=""
                  imgProps={avatarImgProps}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    ...(convAvatarUrl ? { cursor: 'pointer' } : {})
                  }}
                  {...(convAvatarUrl
                    ? {
                        onClick: () => openAvatarPreviewUrl(setAvatarPreviewUrl, convAvatarUrl),
                        'aria-label': 'Ver foto em tamanho grande'
                      }
                    : {})}
                >
                  {convAvatarUrl ? null : convInitial}
                </Avatar>
              )
            })()}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                noWrap
                title={activePeerUid}
                component="div"
              >
                Com{' '}
                {peerProfile?.handle
                  ? `@${peerProfile.handle}`
                  : peerProfile?.displayName ||
                    lastMsgFromPeer?.senderDisplayName ||
                    activeChatListRow?.peerName ||
                    peerProfile?.email ||
                    lastMsgFromPeer?.senderEmail ||
                    activeChatListRow?.peerEmail ||
                    `Usuário ${activePeerUid.slice(0, 10)}…`}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ wordBreak: 'break-all', display: 'block', lineHeight: 1.3 }}
              >
                ID: {activePeerUid}
                {peerProfile?.email && (peerProfile?.handle || peerProfile?.displayName)
                  ? ` · ${peerProfile.email}`
                  : ''}
                {(lastMsgFromPeer?.senderEmail || activeChatListRow?.peerEmail) &&
                !(peerProfile?.handle || peerProfile?.displayName || peerProfile?.email) ? (
                  <>
                    {' · '}
                    {lastMsgFromPeer?.senderEmail || activeChatListRow?.peerEmail}
                  </>
                ) : null}
              </Typography>
            </Box>
            <IconButton
              size="small"
              aria-label="Apagar conversa só para mim"
              disabled={busy || !activeChatId}
              sx={{ flexShrink: 0 }}
              onClick={() =>
                setDeleteChatTarget({
                  chatId: activeChatId,
                  peerUid: activePeerUid,
                  label: peerLabel(activePeerUid, activeChatListRow) || activePeerUid
                })
              }
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>

          {pendingExport ? (
            <Alert
              severity="info"
              sx={{ mx: 2, mt: 1, flexShrink: 0 }}
              action={
                <Button color="inherit" size="small" disabled={busy} onClick={handleSendPendingExport}>
                  Enviar agora
                </Button>
              }
            >
              Envio ({EXPORT_KIND_LABELS[pendingExport.exportKind] || 'conteúdo'}) pronto para esta conversa.
            </Alert>
          ) : null}

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 2, py: 1 }}>
            {visibleMessages.map((m) => {
              const mine = m.senderUid === user.uid
              const messageTimeLabel = formatChatMessageDateTime(m.ts)
              return (
                <Box
                  key={m.id}
                  sx={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-start',
                    gap: 0.5,
                    mb: 1
                  }}
                >
                  {!mine && (
                    <IconButton
                      size="small"
                      aria-label="Opções da mensagem"
                      disabled={busy}
                      sx={{ mt: 0.25, flexShrink: 0 }}
                      onClick={(e) => setMsgMenu({ anchorEl: e.currentTarget, message: m })}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                  {m.exportPayload ? (
                    <Box sx={{ maxWidth: '85%' }}>
                      <ChatAppExportBubble
                        message={m}
                        mine={mine}
                        onOpenDetails={() => setExportDialogMsg(m)}
                      />
                      {messageTimeLabel ? (
                        <Typography
                          variant="caption"
                          component="div"
                          sx={{
                            mt: 0.5,
                            textAlign: mine ? 'right' : 'left',
                            opacity: 0.75,
                            color: mine ? 'grey.100' : 'text.secondary',
                            px: 0.5
                          }}
                        >
                          {messageTimeLabel}
                        </Typography>
                      ) : null}
                    </Box>
                  ) : (
                  <Paper
                    elevation={1}
                    sx={{
                      maxWidth: '85%',
                      px: 1.5,
                      py: 1,
                      background: mine ? 'linear-gradient(135deg, #004d40 0%, #00695c 100%)' : undefined,
                      bgcolor: mine ? undefined : 'grey.300',
                      color: mine ? 'primary.contrastText' : '#1a1a1a'
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'inherit'
                      }}
                    >
                      {m.text}
                    </Typography>
                    {messageTimeLabel ? (
                      <Typography
                        variant="caption"
                        component="div"
                        sx={{
                          mt: 0.75,
                          textAlign: mine ? 'right' : 'left',
                          opacity: 0.88,
                          color: 'inherit'
                        }}
                      >
                        {messageTimeLabel}
                      </Typography>
                    ) : null}
                  </Paper>
                  )}
                  {mine && (
                    <IconButton
                      size="small"
                      aria-label="Opções da mensagem"
                      disabled={busy}
                      sx={{ mt: 0.25, flexShrink: 0 }}
                      onClick={(e) => setMsgMenu({ anchorEl: e.currentTarget, message: m })}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              )
            })}
            <div ref={bottomRef} />
          </Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{ p: 1, borderTop: 1, borderColor: 'divider', alignItems: 'flex-end', flexShrink: 0 }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder="Escreva uma mensagem…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <IconButton color="primary" onClick={handleSend} disabled={busy || !draft.trim()} aria-label="Enviar">
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      )}
      </Box>

      <Menu
        anchorEl={msgMenu?.anchorEl}
        open={Boolean(msgMenu)}
        onClose={() => !busy && setMsgMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {msgMenu?.message && msgMenu.message.senderUid !== user?.uid ? (
          <MenuItem
            disabled={busy}
            onClick={async () => {
              const m = msgMenu?.message
              setMsgMenu(null)
              if (!user?.uid || !activeChatId || !m) return
              setBusy(true)
              setLastError(null)
              try {
                await reportChatMessage({
                  reporterUid: user.uid,
                  chatId: activeChatId,
                  messageId: m.id,
                  reportedUid: m.senderUid || '',
                  textPreview: String(m.text || m.preview || '').slice(0, 200)
                })
                setAuthSuccess('Denúncia registrada. Obrigado — analisaremos em breve.')
              } catch (e) {
                setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível registrar a denúncia.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Denunciar mensagem
          </MenuItem>
        ) : null}
        <MenuItem
          disabled={busy}
          onClick={async () => {
            const m = msgMenu?.message
            setMsgMenu(null)
            if (!user?.uid || !activeChatId || !m) return
            setBusy(true)
            setLastError(null)
            try {
              await hideMessageForMe(user.uid, activeChatId, m.id)
            } catch (e) {
              setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível apagar a mensagem.')
            } finally {
              setBusy(false)
            }
          }}
        >
          Apagar só para mim
        </MenuItem>
        {msgMenu?.message && msgMenu.message.senderUid === user?.uid && (
          <MenuItem
            disabled={busy}
            onClick={async () => {
              const m = msgMenu?.message
              setMsgMenu(null)
              if (!activeChatId || !m) return
              const ok = await confirmarAsync({
                titulo: 'Apagar mensagem',
                mensagem: 'Remover esta mensagem para ambos? Não é possível desfazer.',
                labelOk: 'Apagar',
                destrutivo: true
              })
              if (!ok) return
              setBusy(true)
              setLastError(null)
              try {
                await deleteMessageForEveryone(activeChatId, m.id)
              } catch (e) {
                setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível apagar para todos.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Apagar para todos
          </MenuItem>
        )}
      </Menu>

      <ChatAppExportDialog
        open={Boolean(exportDialogMsg)}
        onClose={() => setExportDialogMsg(null)}
        exportPayload={exportDialogMsg?.exportPayload}
        fallbackExportKind={exportDialogMsg?.exportKind}
        onApply={handleApplyExport}
        busy={busy}
      />

      <Dialog
        open={Boolean(avatarPreviewUrl)}
        onClose={() => setAvatarPreviewUrl(null)}
        fullScreen
        aria-label="Pré-visualização da foto de perfil"
        PaperProps={{
          sx: {
            m: 0,
            bgcolor: 'rgba(0,0,0,0.94)',
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center'
          }
        }}
      >
        <IconButton
          aria-label="Fechar"
          onClick={() => setAvatarPreviewUrl(null)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'common.white',
            zIndex: 1,
            bgcolor: 'rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
          }}
          size="large"
        >
          <CloseIcon />
        </IconButton>
        {avatarPreviewUrl ? (
          <Box
            component="img"
            src={avatarPreviewUrl}
            alt=""
            referrerPolicy="no-referrer"
            sx={{
              display: 'block',
              margin: 'auto',
              maxWidth: '100%',
              maxHeight: '100vh',
              '@supports (max-height: 100dvh)': { maxHeight: '100dvh' },
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              p: 2,
              pt: 8,
              boxSizing: 'border-box'
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={profileDialogOpen}
        onClose={() => !busy && setProfileDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Meu perfil</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Avatar
                src={
                  (myProfile.photoURL || user?.photoURL || '').trim() ||
                  gravatarPhotoUrl(user?.email || myProfile.email || '') ||
                  undefined
                }
                alt=""
                imgProps={avatarImgProps}
                sx={{
                  width: 88,
                  height: 88,
                  cursor:
                    (myProfile.photoURL || user?.photoURL || '').trim() ||
                    gravatarPhotoUrl(user?.email || myProfile.email || '')
                      ? 'pointer'
                      : 'default'
                }}
                {...(() => {
                  const u =
                    (myProfile.photoURL || user?.photoURL || '').trim() ||
                    gravatarPhotoUrl(user?.email || myProfile.email || '') ||
                    ''
                  return u
                    ? {
                        onClick: () => openAvatarPreviewUrl(setAvatarPreviewUrl, u),
                        'aria-label': 'Ver foto em tamanho grande'
                      }
                    : {}
                })()}
              />
              <Box>
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleProfilePhotoSelected}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  disabled={busy}
                  onClick={() => profilePhotoInputRef.current?.click()}
                >
                  Escolher foto
                </Button>
                <Button
                  size="small"
                  color="inherit"
                  disabled={busy || !(myProfile.photoURL || user?.photoURL)}
                  onClick={() => handleRemoveProfilePhoto()}
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Remover foto
                </Button>
              </Box>
            </Stack>
            <Divider />
            <TextField
              size="small"
              fullWidth
              label="Nome exibido"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              label="Telefone (só exibição, opcional)"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="Ex.: (69) 99999-0000"
              helperText="No futuro, poderemos permitir buscar alguém só pelo número, com confirmação por SMS."
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Os campos abaixo são opcionais. Outras pessoas com sessão iniciada podem ver essas informações no seu perfil
              público neste aplicativo.
            </Typography>
            <TextField
              size="small"
              fullWidth
              label="Cidade / região"
              value={profileCity}
              onChange={(e) => setProfileCity(e.target.value)}
              placeholder="Ex.: Porto Velho — RO"
            />
            <TextField
              size="small"
              fullWidth
              label="Profissão ou situação (ex.: estudante)"
              value={profileProfession}
              onChange={(e) => setProfileProfession(e.target.value)}
              placeholder="Ex.: Pastor · Estudante de teologia"
            />
            <TextField
              size="small"
              fullWidth
              label="Igreja que frequenta"
              value={profileChurch}
              onChange={(e) => setProfileChurch(e.target.value)}
              placeholder="Ex.: Igreja Presbiteriana …"
            />
            <Button size="small" variant="outlined" disabled={busy} onClick={() => saveProfileBasics()}>
              Salvar dados do perfil
            </Button>
            <Divider />
            <TextField
              size="small"
              fullWidth
              label="Apelido público (@)"
              value={profileHandleInput}
              onChange={(e) => setProfileHandleInput(e.target.value)}
              placeholder="ex.: maria_silva"
              helperText={`Único no app. Letras minúsculas, números e _. Atual: ${
                myProfile.handle ? `@${myProfile.handle}` : 'nenhum'
              }`}
            />
            <Button size="small" variant="contained" disabled={busy} onClick={() => savePublicHandle()}>
              Salvar apelido
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProfileDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteChatTarget != null}
        onClose={() => !busy && setDeleteChatTarget(null)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        PaperProps={{
          sx: { maxHeight: 'min(92vh, 560px)', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle>Apagar conversa só para mim</DialogTitle>
        <DialogContent
          dividers
          sx={{
            flex: '1 1 auto',
            overflow: 'auto',
            px: 2,
            pt: 1,
            pb: 2
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Conversa com <strong>{deleteChatTarget?.label}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Para <strong>apagar uma mensagem para todos</strong> os participantes, use o menu (⋮) na própria mensagem —
            apenas nas mensagens <strong>que você enviou</strong>.
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Button fullWidth onClick={() => setDeleteChatTarget(null)} disabled={busy} variant="outlined">
              Cancelar
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              disabled={busy}
              onClick={async () => {
                if (!user?.uid || !deleteChatTarget) return
                setBusy(true)
                setLastError(null)
                try {
                  await hideChatOnlyForMe(user.uid, deleteChatTarget.chatId)
                  if (deleteChatTarget.peerUid) {
                    await removeRecentPerson(user.uid, deleteChatTarget.peerUid)
                    setRecentPeople((prev) =>
                      prev.filter((r) => r.uid !== deleteChatTarget.peerUid)
                    )
                  }
                  if (activeChatId === deleteChatTarget.chatId) {
                    setActiveChatId(null)
                    setActivePeerUid(null)
                  }
                  setDeleteChatTarget(null)
                } catch (e) {
                  setLastError(hintRtdbPermissionDenied(e) || e?.message || 'Não foi possível apagar a conversa.')
                } finally {
                  setBusy(false)
                }
              }}
            >
              Apagar só para mim
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={peerDialog != null} onClose={() => !busy && closePeerDialog()} fullWidth maxWidth="sm">
        <DialogTitle>
          {peerDialog === 'favorite' ? 'Adicionar aos favoritos' : 'Enviar pedido de amizade'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escreve o <strong>@apelido</strong> ou cola o <strong>UID técnico</strong> da pessoa. O valor do campo
            &quot;Nova conversa&quot; acima é copiado automaticamente quando abres esta janela.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="@apelido ou UID"
            value={peerDialogInput}
            onChange={(e) => {
              setPeerDialogInput(e.target.value)
              setPeerDialogError('')
            }}
            placeholder="@maria ou wxQBWRqh…"
          />
          {peerDialogError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {peerDialogError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => !busy && closePeerDialog()}>Cancelar</Button>
          <Button variant="contained" disabled={busy} onClick={() => submitPeerDialog()}>
            {peerDialog === 'favorite' ? 'Adicionar' : 'Enviar pedido'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
