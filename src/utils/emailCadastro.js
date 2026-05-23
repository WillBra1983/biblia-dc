/**
 * Validação de e-mail no cadastro (e-mail/senha).
 * Domínios de teste/descartáveis comuns — bloqueio no cliente; reforço ideal via Blocking Functions no Firebase.
 */

const DOMINIOS_BLOQUEADOS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'teste.com',
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'yopmail.com',
  '10minutemail.com',
  'discard.email',
  'sharklasers.com',
  'grr.la',
])

const PARTES_LOCAL_BLOQUEADAS = new Set([
  'test',
  'teste',
  'fake',
  'falso',
  'xxx',
  'asdf',
  'qwerty',
  'naoexiste',
  'nao',
])

const NOMES_EXIBICAO_BLOQUEADOS = new Set(['test', 'teste', 'fake', 'falso', 'usuario', 'user', 'xxx'])

export function dominioEmailBloqueado(emailRaw) {
  const email = String(emailRaw ?? '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return false
  const dominio = email.slice(at + 1)
  return DOMINIOS_BLOQUEADOS.has(dominio)
}

export function mensagemEmailCadastroBloqueado() {
  return 'Este domínio de e-mail não é permitido. Use um e-mail real (Gmail, Hotmail, etc.).'
}

function parteLocalEmailBloqueada(email) {
  const at = email.indexOf('@')
  if (at < 1) return false
  const local = email.slice(0, at).replace(/\+.*/, '').toLowerCase()
  if (PARTES_LOCAL_BLOQUEADAS.has(local)) return true
  if (/^test\d*$/i.test(local)) return true
  return false
}

export function validarNomeExibicaoCadastro(displayNameRaw) {
  const nome = String(displayNameRaw ?? '').trim()
  if (!nome) return { ok: true, nome: '' }
  if (nome.length < 2) {
    return { ok: false, mensagem: 'Se informar um nome, use pelo menos 2 caracteres.' }
  }
  if (NOMES_EXIBICAO_BLOQUEADOS.has(nome.toLowerCase())) {
    return { ok: false, mensagem: 'Use seu nome real no perfil (não use "test" ou nomes genéricos).' }
  }
  return { ok: true, nome }
}

export function validarEmailParaCadastro(emailRaw) {
  const email = String(emailRaw ?? '').trim().toLowerCase()
  if (!email.includes('@') || email.length < 5) {
    return { ok: false, mensagem: 'Informe um e-mail válido.' }
  }
  if (dominioEmailBloqueado(email)) {
    return { ok: false, mensagem: mensagemEmailCadastroBloqueado() }
  }
  if (parteLocalEmailBloqueada(email)) {
    return {
      ok: false,
      mensagem: 'Este endereço de e-mail não é permitido. Use um e-mail pessoal real.',
    }
  }
  return { ok: true, email }
}
