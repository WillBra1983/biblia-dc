import { useEffect, useState } from 'react'
import { Button } from '@mui/material'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined'
import { conectarDestaques, registrarInteracaoDestaque } from '../services/destaquesMenuService'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { mostrarSnackbar } from '../utils/uiDialogs'
import { partesApresentacao } from '../utils/apresentacaoFormatada'
import CompartilharVersiculoImagemDialog from './CompartilharVersiculoImagemDialog'

export default function AcoesDestaque({ item, livro }) {
  const { user } = useFirebaseAuth()
  const [curtido, setCurtido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [compartilhar, setCompartilhar] = useState(false)
  const [contagens, setContagens] = useState({ likesCount: 0, sharesCount: 0 })
  useEffect(() => {
    let ativo = true
    const parar = []
    setCurtido(false)
    setContagens({ likesCount: 0, sharesCount: 0 })
    conectarDestaques().then(({ api, db }) => {
      if (!ativo) return
      for (const campo of ['likesCount', 'sharesCount']) parar.push(api.onValue(api.ref(db, `destaquesMenuInteracoes/${item.id}/${campo}`), (snapshot) => {
        if (ativo) setContagens((valor) => ({ ...valor, [campo]: Number(snapshot.val() || 0) }))
      }, () => {}))
      if (user?.uid) {
        parar.push(api.onValue(api.ref(db, `destaquesMenuInteracoes/${item.id}/curtidas/${user.uid}`), (snapshot) => {
          if (ativo) setCurtido(snapshot.val() === true)
        }, () => {}))
        registrarInteracaoDestaque({ id: item.id, tipo: 'consulta' }).catch(() => {})
      }
    }).catch(() => {})
    return () => { ativo = false; parar.forEach((cancelar) => cancelar()) }
  }, [item.id, user?.uid])
  async function curtir() {
    if (!user?.uid) { mostrarSnackbar({ mensagem: 'Entre na conta para curtir.', severidade: 'info' }); return }
    setSalvando(true)
    try {
      await registrarInteracaoDestaque({ id: item.id, tipo: 'curtida', curtido: !curtido })
    } catch { mostrarSnackbar({ mensagem: 'Não foi possível salvar a curtida. Tente novamente.', severidade: 'error' }) }
    finally { setSalvando(false) }
  }
  const texto = partesApresentacao(item.texto || livro?.descricao || '').map((parte) => parte.texto).join('')
  return <>
    <Button size="small" disabled={salvando} aria-pressed={curtido} startIcon={curtido ? <FavoriteIcon sx={{ color: '#bd2635' }} /> : <FavoriteBorderIcon />} onClick={() => void curtir()}>{curtido ? 'Curtido' : 'Curtir'} {contagens.likesCount > 0 ? contagens.likesCount : ''}</Button>
    <Button size="small" startIcon={<ShareOutlinedIcon />} onClick={() => setCompartilhar(true)}>Compartilhar {contagens.sharesCount > 0 ? contagens.sharesCount : ''}</Button>
    <CompartilharVersiculoImagemDialog open={compartilhar} onClose={() => setCompartilhar(false)} texto={texto} referencia={item.titulo || livro?.titulo || (item.tipo === 'trecho' ? 'Trecho de livro' : 'Mensagem do dia')} modoDireto registrarEnvio={false} onActionComplete={() => setCompartilhar(false)} onShared={() => {
      if (user?.uid) void registrarInteracaoDestaque({ id: item.id, tipo: 'compartilhamento', eventoId: crypto.randomUUID() }).catch(() => mostrarSnackbar({ mensagem: 'A imagem foi compartilhada, mas não foi possível registrar a contagem.', severidade: 'warning' }))
    }} />
  </>
}
