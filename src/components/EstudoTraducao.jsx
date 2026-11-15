import { selecionarEstudoOriginal } from '../utils/estudoOriginal'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Box, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useVersaoBiblica } from '../hooks/useVersaoBiblica'
import { consultarEstudosDisponiveis } from '../services/estudosDisponiveisService'
import { validarTraducaoEstudo } from '../utils/estudoTraducao'

export const TraducaoEstudoContext = createContext(null)

export function EstudoComTraducao({ componente: Conteudo, tipo = 'versiculo' }) {
  const [params] = useSearchParams()
  const leitura = useVersaoBiblica()
  const location = useLocation()
  return <EscolhaTraducao key={location.key + ':' + params.toString()} componente={Conteudo}
    tipo={tipo} versaoLeitura={leitura} params={params} />
}

function EscolhaTraducao({ componente: Conteudo, tipo, versaoLeitura, params }) {
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const [disponiveis, setDisponiveis] = useState({})
  const [escolha, setEscolha] = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const passagem = useMemo(() => ({ tipo, livroId: Number(params.get('livro')),
    capitulo: Number(params.get('capitulo') ?? params.get('cap')),
    versArr: [...new Set(String(params.get('versiculos') || '').split(/[;,]/).map(Number).filter(n => Number.isInteger(n) && n > 0))].sort((a,b) => a-b),
    inicio: Number(params.get('inicio')), fim: Number(params.get('fim'))
  }), [params, tipo])
  const valida = passagem.livroId > 0 && passagem.capitulo > 0 && (tipo === 'pericope'
    ? passagem.inicio > 0 && passagem.fim >= passagem.inicio : passagem.versArr.length > 0)
  useEffect(() => {
    if (!user?.uid || !valida) return
    let cancelado = false
    setErro('')
    consultarEstudosDisponiveis(passagem).then(encontrados => {
      if (cancelado) return
      setDisponiveis(encontrados)
      if (encontrados[versaoLeitura] || !Object.keys(encontrados).length) {
        setEscolha({ versao: versaoLeitura, estudo: encontrados[versaoLeitura] || null })
      } else {
        setConfirmar(versaoLeitura)
      }
    }).catch(() => {
      if (!cancelado) setErro('Não foi possível verificar os estudos existentes. Nenhuma geração foi iniciada. Tente novamente.')
    })
    return () => { cancelado = true }
    // A tradução solicitada fica fixada nesta abertura do estudo.
  }, [user?.uid, valida, passagem, tentativa])

  const abrir = versao => {
    validarTraducaoEstudo(versao)
    if (disponiveis[versao]) {
      setEscolha({ versao, estudo: disponiveis[versao] })
      setConfirmar(null)
    } else setConfirmar(versao)
  }
  const registrarGerado = useCallback(estudo => {
    setDisponiveis(atuais => ({ ...atuais, [estudo.versaoBiblica]: estudo }))
  }, [])
  if (user === null) return <Navigate to="/chat" replace />
  if (user === undefined) return <Box sx={{ p: 3 }}><CircularProgress size={24} /></Box>
  if (!valida) return <Conteudo versaoEstudo={versaoLeitura} versaoLeitura={versaoLeitura} onTrocarTraducao={abrir} />
  const sigla = confirmar ? validarTraducaoEstudo(confirmar).sigla : ''
  return <>
    {erro ? <Alert severity="error" action={<Button onClick={() => setTentativa(n => n+1)}>Tentar novamente</Button>}>{erro}</Alert>
      : escolha ? <TraducaoEstudoContext.Provider value={escolha.versao}>
        <Conteudo key={escolha.versao} versaoEstudo={escolha.versao} versaoLeitura={versaoLeitura}
          estudoExistente={escolha.estudo} estudoBase={escolha.estudoBase} estudosDisponiveis={disponiveis}
          onEstudoGerado={registrarGerado} onTrocarTraducao={abrir} />
      </TraducaoEstudoContext.Provider>
      : !confirmar && <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}><CircularProgress size={24} />Verificando estudos existentes…</Box>}
    <Dialog open={Boolean(confirmar)} onClose={() => escolha ? setConfirmar(null) : navigate(params.get('returnTo') || '/')}>
      <DialogTitle>Estudos já disponíveis</DialogTitle>
      <DialogContent>
        <Typography>Já existem estudos deste trecho em {Object.keys(disponiveis).map(id => validarTraducaoEstudo(id).sigla).join(' e ')}. Você pode abri-los sem gerar outro material.</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
          {Object.keys(disponiveis).map(id => <Button key={id} variant="outlined" onClick={() => abrir(id)}>Abrir estudo em {validarTraducaoEstudo(id).sigla}</Button>)}
        </Box>
        <Typography>O novo estudo será adaptado a partir do estudo original em {selecionarEstudoOriginal(disponiveis) ? validarTraducaoEstudo(selecionarEstudoOriginal(disponiveis).versaoBiblica).sigla : 'ARA'}, preservando sua explicação e revisando o que depende da tradução. Deseja gerar em {sigla} mesmo assim?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => escolha ? setConfirmar(null) : navigate(params.get('returnTo') || '/')}>Cancelar</Button>
        <Button variant="contained" onClick={() => { setEscolha({ versao: confirmar, estudo: null, estudoBase: selecionarEstudoOriginal(disponiveis) }); setConfirmar(null) }}>Sim, gerar em {sigla}</Button>
      </DialogActions>
    </Dialog>
  </>
}

export function AvisoTraducaoEstudo({ versaoEstudo, versaoLeitura, onTrocar, ocupado, disponiveis = {} }) {
  const estudo = validarTraducaoEstudo(versaoEstudo)
  const leitura = validarTraducaoEstudo(versaoLeitura)
  const outras = Object.keys(disponiveis).filter(id => id !== estudo.id)
  const oferecerGeracao = leitura.id !== estudo.id && !disponiveis[leitura.id]
  return <Box sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
    <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
      Este estudo é baseado na tradução {estudo.sigla}.
      {(outras.length > 0 || oferecerGeracao) && <Box sx={{ mt: .75, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {outras.map(id => <Button key={id} size="small" disabled={ocupado} onClick={() => onTrocar(id)}>Abrir estudo em {validarTraducaoEstudo(id).sigla}</Button>)}
        {oferecerGeracao && <Button size="small" variant="outlined" disabled={ocupado} onClick={() => onTrocar(leitura.id)}>Gerar em {leitura.sigla}</Button>}
      </Box>}
    </Alert>
  </Box>
}
