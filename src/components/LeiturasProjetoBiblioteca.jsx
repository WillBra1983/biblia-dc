import { useEffect, useState } from 'react'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { carregarCampanhaProjeto } from '../services/projetoCompartilhamentoService'
import CompartilharProjetoDialog from './CompartilharProjetoDialog'

export default function LeiturasProjetoBiblioteca() {
  const { user } = useFirebaseAuth(), navigate = useNavigate()
  const [campanha, setCampanha] = useState(null), [aberto, setAberto] = useState(false)
  useEffect(() => {
    if (!user?.uid) return undefined
    let ativo = true
    const carregar = () => carregarCampanhaProjeto().then(dados => { if (ativo) setCampanha({ ...dados, uid: user.uid }) }).catch(() => {})
    void carregar()
    window.addEventListener('focus', carregar)
    return () => { ativo = false; window.removeEventListener('focus', carregar) }
  }, [user?.uid, aberto])
  if (!campanha || campanha.uid !== user?.uid || (!campanha.creditos && !campanha.beneficios.length)) return null
  return <Paper variant="outlined" sx={{ mb: 2.5, p: 2, borderRadius: 2 }}>
    <Stack spacing={1.25}>
      <Typography fontWeight={800}>Leituras conquistadas com seus convites</Typography>
      {campanha.beneficios.map(b => <Box key={b.livroId}><Typography variant="body2" fontWeight={700}>{b.titulo}</Typography><Typography variant="caption">Leitura liberada até {new Date(b.acessoAte).toLocaleDateString('pt-BR')}</Typography><Button size="small" sx={{ ml: 1 }} onClick={() => navigate(`/biblioteca/${encodeURIComponent(b.livroId)}/ler?conviteLeitura=1`)}>Continuar leitura</Button></Box>)}
      {campanha.creditos > 0 && <Button variant="outlined" onClick={() => setAberto(true)}>Escolher livro · {campanha.creditos} {campanha.creditos === 1 ? 'benefício disponível' : 'benefícios disponíveis'}</Button>}
    </Stack>
    <CompartilharProjetoDialog aberto={aberto} onClose={() => setAberto(false)} />
  </Paper>
}
