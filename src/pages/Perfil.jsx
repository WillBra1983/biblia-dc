import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, Box, Button, CircularProgress, Container, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { updateProfile } from 'firebase/auth'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { getFirebaseAuth } from '../config/firebase'
import { fetchUserProfile, writeUserProfilePublic, claimPublicHandle, uploadProfilePhoto, deleteProfilePhotoFile } from '../services/chatService'
import { compressImageToJpeg } from '../utils/profileImage'
import { confirmarAsync } from '../utils/uiDialogs'
import AuthConectarForm from '../components/AuthConectarForm'
import EmailVerificationGate from '../components/EmailVerificationGate'
import { usuarioPrecisaVerificarEmail } from '../utils/emailVerificationAuth'

export default function Perfil() {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const fotoRef = useRef(null)
  const [form, setForm] = useState({})
  const [apelidoAtual, setApelidoAtual] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [perfilCarregado, setPerfilCarregado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    if (!user?.uid) { setCarregando(false); return }
    let ativo = true
    setCarregando(true); setPerfilCarregado(false); setErro('')
    fetchUserProfile(user.uid).then((dados) => {
      if (!ativo) return
      setForm({ ...dados, displayName: dados?.displayName || user.displayName || '', photoURL: dados?.photoURL || user.photoURL || '' })
      setApelidoAtual(dados?.handle || '')
      setPerfilCarregado(true)
    }).catch(() => { if (ativo) setErro('Não foi possível carregar o perfil. Reabra esta página para tentar novamente.') }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [user?.uid])
  const alterar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }))
  async function persistir(dados) {
    const auth = getFirebaseAuth()
    if (!auth?.currentUser || auth.currentUser.uid !== user.uid) throw new Error('Entre novamente na sua conta.')
    await writeUserProfilePublic(user.uid, { ...dados, email: user.email || '' })
    await updateProfile(auth.currentUser, { displayName: dados.displayName.trim(), photoURL: dados.photoURL || '' })
  }
  async function salvar() {
    setOcupado(true); setErro(''); setAviso('')
    try {
      const nome = String(form.displayName || '').trim()
      if (!nome) throw new Error('Informe seu nome.')
      let handle = String(form.handle || '').trim().replace(/^@+/, '').toLowerCase()
      if (!handle && apelidoAtual) throw new Error('Para alterar seu apelido, informe um novo apelido.')
      if (handle !== apelidoAtual && handle) {
        handle = await claimPublicHandle(user.uid, handle, apelidoAtual)
        setApelidoAtual(handle); setForm((atual) => ({ ...atual, handle }))
      }
      await persistir({ ...form, displayName: nome, handle })
      setAviso('Perfil atualizado.')
    } catch (falha) { setErro(falha.message || 'Não foi possível salvar o perfil.') }
    finally { setOcupado(false) }
  }
  async function foto(event) {
    const arquivo = event.target.files?.[0]; event.target.value = ''
    if (!arquivo) return
    setOcupado(true); setErro(''); setAviso('')
    try {
      const url = await uploadProfilePhoto(user.uid, await compressImageToJpeg(arquivo, 512, .82))
      await persistir({ ...form, handle: apelidoAtual, photoURL: url })
      setForm((atual) => ({ ...atual, photoURL: url })); setAviso('Foto atualizada.')
    } catch (falha) { setErro(falha.message || 'Não foi possível enviar a foto.') }
    finally { setOcupado(false) }
  }
  async function removerFoto() {
    if (!await confirmarAsync({ titulo: 'Remover foto?', mensagem: 'Você poderá escolher outra depois.', labelOk: 'Remover', destrutivo: true })) return
    setOcupado(true); setErro('')
    try { await persistir({ ...form, handle: apelidoAtual, photoURL: '' }); await deleteProfilePhotoFile(user.uid); setForm((atual) => ({ ...atual, photoURL: '' })); setAviso('Foto removida.') }
    catch (falha) { setErro(falha.message || 'Não foi possível remover a foto.') }
    finally { setOcupado(false) }
  }
  if (!user) return <Container maxWidth="sm" sx={{ py: 3 }}><Typography variant="h5" sx={{ mb: 2 }}>Meu perfil</Typography><AuthConectarForm /></Container>
  if (usuarioPrecisaVerificarEmail(user)) return <EmailVerificationGate email={user.email} />
  return <Container maxWidth="sm" sx={{ py: 3 }}>
    <Typography variant="h5" fontWeight={800}>Meu perfil</Typography>
    <Typography color="text.secondary" sx={{ mt: .5, mb: 2 }}>Sua identificação e informações da conta, em um só lugar.</Typography>
    {carregando ? <CircularProgress /> : !perfilCarregado ? <Alert severity="error">{erro || 'Não foi possível carregar seu perfil.'}</Alert> : <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
      <Stack spacing={2}>
        {erro && <Alert severity="error">{erro}</Alert>}{aviso && <Alert severity="success" onClose={() => setAviso('')}>{aviso}</Alert>}
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={form.photoURL || undefined} sx={{ width: 72, height: 72 }}>{form.displayName?.slice(0, 1)}</Avatar>
          <Box><Button variant="outlined" startIcon={<PhotoCameraOutlinedIcon />} disabled={ocupado || !form.displayName} onClick={() => fotoRef.current?.click()}>Escolher foto</Button><input ref={fotoRef} hidden type="file" accept="image/*" onChange={foto} />{form.photoURL && <Button disabled={ocupado} onClick={removerFoto} sx={{ display: 'block', mt: .5 }}>Remover foto</Button>}</Box>
        </Stack>
        <TextField label="Nome exibido" value={form.displayName || ''} onChange={alterar('displayName')} required inputProps={{ maxLength: 100 }} />
        <TextField label="Apelido público (@)" value={form.handle || ''} onChange={alterar('handle')} helperText="Use letras minúsculas, números e _. Seus contatos podem encontrar você por esse apelido." />
        <TextField label="E-mail da conta" value={user.email || 'Não informado'} InputProps={{ readOnly: true }} />
        <Divider />
        <Typography fontWeight={700}>Informações opcionais</Typography><Typography variant="body2" color="text.secondary">Estas informações poderão ser vistas por outros usuários conectados.</Typography>
        {[['phoneDisplay', 'Telefone'], ['city', 'Cidade / região'], ['professionOrStudy', 'Profissão / estudo'], ['church', 'Igreja']].map(([campo, label]) => <TextField key={campo} label={label} value={form[campo] || ''} onChange={alterar(campo)} />)}
        <Button variant="contained" disabled={ocupado || !form.displayName?.trim()} onClick={salvar}>{ocupado ? 'Salvando…' : 'Salvar perfil'}</Button>
        <Divider />
        <Typography variant="body2" fontWeight={700}>Código da conta</Typography><Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>{user.uid}</Typography>
        <Button startIcon={<ContentCopyOutlinedIcon />} onClick={async () => { try { await navigator.clipboard.writeText(user.uid); setAviso('Código copiado.') } catch { setErro('Não foi possível copiar. Você pode selecionar o código acima.') } }}>Copiar código</Button>
      </Stack>
    </Paper>}
    <Stack direction="row" spacing={1} sx={{ mt: 2 }}><Button onClick={() => navigate('/chat')}>Mensagens</Button><Button onClick={() => navigate('/configuracoes')}>Configurações</Button></Stack>
  </Container>
}
