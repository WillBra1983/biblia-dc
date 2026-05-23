/**
 * Cadastro e-mail/senha: pendência no RTDB até o utilizador abrir o link (Firebase Auth).
 * Só após `signInWithEmailLink` + `finalizarCadastroEmailLink` existe conta com senha.
 */

const admin = require('firebase-admin')
const crypto = require('crypto')
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { logger } = require('firebase-functions/v2')

const PENDING_TTL_MS = 24 * 60 * 60 * 1000
const MIN_PASSWORD_LEN = 6

function normalizeEmail(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

function encodeEmailRtdbKey(email) {
  return normalizeEmail(email).replace(/\./g, ',')
}

function pendingSecretKey() {
  const raw = process.env.CADASTRO_PENDING_SECRET || ''
  if (raw.length >= 16) {
    return crypto.createHash('sha256').update(raw).digest()
  }
  logger.warn(
    'CADASTRO_PENDING_SECRET não definido — use firebase functions:secrets:set CADASTRO_PENDING_SECRET'
  )
  return crypto.createHash('sha256').update('salvation-cadastro-pending-dev-only').digest()
}

function encryptPassword(plain) {
  const key = pendingSecretKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    passwordEnc: enc.toString('base64'),
    passwordIv: iv.toString('base64'),
    passwordTag: tag.toString('base64'),
  }
}

function decryptPassword(payload) {
  const key = pendingSecretKey()
  const iv = Buffer.from(payload.passwordIv, 'base64')
  const tag = Buffer.from(payload.passwordTag, 'base64')
  const enc = Buffer.from(payload.passwordEnc, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

function validarSenha(password) {
  const p = String(password ?? '')
  if (p.length < MIN_PASSWORD_LEN) {
    return { ok: false, mensagem: `A senha precisa ter pelo menos ${MIN_PASSWORD_LEN} caracteres.` }
  }
  return { ok: true, password: p }
}

function validarNome(displayName) {
  const nome = String(displayName ?? '').trim()
  if (!nome) return { ok: true, nome: '' }
  if (nome.length < 2) {
    return { ok: false, mensagem: 'Se informar um nome, use pelo menos 2 caracteres.' }
  }
  const lower = nome.toLowerCase()
  if (['test', 'teste', 'fake', 'falso', 'usuario', 'user', 'xxx'].includes(lower)) {
    return { ok: false, mensagem: 'Use seu nome real no perfil.' }
  }
  return { ok: true, nome: nome.slice(0, 120) }
}

const DOMINIOS_BLOQUEADOS = new Set([
  'example.com',
  'test.com',
  'teste.com',
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'yopmail.com',
  '10minutemail.com',
])

function validarEmailServidor(emailRaw) {
  const email = normalizeEmail(emailRaw)
  if (!email.includes('@') || email.length < 5 || email.length > 320) {
    return { ok: false, mensagem: 'Informe um e-mail válido.' }
  }
  const dominio = email.slice(email.indexOf('@') + 1)
  if (DOMINIOS_BLOQUEADOS.has(dominio)) {
    return { ok: false, mensagem: 'Este domínio de e-mail não é permitido.' }
  }
  const local = email.split('@')[0].replace(/\+.*/, '')
  if (/^test\d*$/i.test(local) || ['test', 'teste', 'fake'].includes(local)) {
    return { ok: false, mensagem: 'Este endereço de e-mail não é permitido.' }
  }
  return { ok: true, email }
}

async function emailJaExisteNoAuth(email) {
  try {
    await admin.auth().getUserByEmail(email)
    return true
  } catch (e) {
    if (e?.code === 'auth/user-not-found') return false
    throw e
  }
}

const CADASTRO_OPTS = {
  region: 'us-central1',
  maxInstances: 10,
  cors: true,
  secrets: ['CADASTRO_PENDING_SECRET'],
}

exports.iniciarCadastroEmailSenha = onCall(
  CADASTRO_OPTS,
  async (req) => {
    const valEmail = validarEmailServidor(req.data?.email)
    if (!valEmail.ok) {
      throw new HttpsError('invalid-argument', valEmail.mensagem)
    }
    const valSenha = validarSenha(req.data?.password)
    if (!valSenha.ok) {
      throw new HttpsError('invalid-argument', valSenha.mensagem)
    }
    const valNome = validarNome(req.data?.displayName)
    if (!valNome.ok) {
      throw new HttpsError('invalid-argument', valNome.mensagem)
    }

    if (await emailJaExisteNoAuth(valEmail.email)) {
      throw new HttpsError('already-exists', 'Já existe uma conta com este e-mail. Use Entrar.')
    }

    const now = Date.now()
    const key = encodeEmailRtdbKey(valEmail.email)
    const ref = admin.database().ref(`pendingEmailSignups/${key}`)
    const existing = (await ref.get()).val()
    if (existing && Number(existing.expiresAt) < now) {
      await ref.remove().catch(() => {})
    }
    const enc = encryptPassword(valSenha.password)
    await ref.set({
      email: valEmail.email,
      displayName: valNome.nome,
      ...enc,
      createdAt: now,
      expiresAt: now + PENDING_TTL_MS,
    })

    return {
      ok: true,
      message:
        'Enviamos um link para o seu e-mail. Só depois de abrir o link a conta é criada. Verifique também o spam.',
    }
  }
)

exports.finalizarCadastroEmailLink = onCall(
  CADASTRO_OPTS,
  async (req) => {
    const uid = req.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Abra o link do e-mail neste aparelho para concluir o cadastro.')
    }

    const tokenEmail = normalizeEmail(req.auth?.token?.email || '')
    if (!tokenEmail) {
      throw new HttpsError('failed-precondition', 'E-mail da sessão inválido.')
    }

    const ref = admin.database().ref(`pendingEmailSignups/${encodeEmailRtdbKey(tokenEmail)}`)
    const snap = await ref.get()
    const pending = snap.val()
    if (!pending) {
      throw new HttpsError(
        'failed-precondition',
        'Cadastro pendente não encontrado ou já concluído. Solicite um novo link em Criar conta.'
      )
    }

    if (Number(pending.expiresAt) < Date.now()) {
      await ref.remove().catch(() => {})
      throw new HttpsError('deadline-exceeded', 'O link expirou. Crie a conta novamente.')
    }

    let plainPassword
    try {
      plainPassword = decryptPassword(pending)
    } catch {
      await ref.remove().catch(() => {})
      throw new HttpsError('internal', 'Não foi possível validar o cadastro. Tente criar a conta de novo.')
    }

    const displayName =
      typeof pending.displayName === 'string' ? pending.displayName.trim().slice(0, 120) : ''

    await admin.auth().updateUser(uid, {
      password: plainPassword,
      emailVerified: true,
      ...(displayName ? { displayName } : {}),
    })

    await ref.remove().catch(() => {})

    return { ok: true, emailVerified: true }
  }
)
