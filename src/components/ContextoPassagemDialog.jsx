import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { buscarCapituloNaVersao, buscarPericopesNaVersao } from '../services/bibliaService'
import { obterVersaoBiblica } from '../utils/bibliaVersionStore'
import { urlLeitorBiblia } from '../utils/bibliaDeepLinks'
import { prepararContextoPassagem } from '../utils/contextoPassagem'

export default function ContextoPassagemDialog({ open, item, onClose, onNavigate }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const livroId = item?.livroId, capitulo = item?.capitulo, versiculo = item?.versiculo
  const versao = item?.versaoBiblica || obterVersaoBiblica()
  useEffect(() => {
    if (!open || !livroId || !capitulo) return undefined
    let ativo = true
    setDados(null); setErro(false)
    Promise.all([buscarCapituloNaVersao(versao, livroId, capitulo), buscarPericopesNaVersao(versao, livroId, capitulo)])
      .then(([versos, pericopes]) => { if (ativo) setDados({ versos, pericopes }) })
      .catch(() => { if (ativo) setErro(true) })
    return () => { ativo = false }
  }, [open, livroId, capitulo, versiculo, versao, tentativa])
  const contexto = prepararContextoPassagem(item, dados?.versos, dados?.pericopes)
  function abrir(path) { onClose(); onNavigate({ path }) }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="contexto-passagem-titulo">
    <DialogTitle id="contexto-passagem-titulo" sx={{ pb: 1 }}>
      <Typography component="span" sx={{ display: 'block', fontWeight: 800, fontSize: '1.15rem' }}>Entenda a passagem</Typography>
      <Typography component="span" variant="body2" color="text.secondary">{item?.referencia}{item?.versao ? ' · ' + item.versao : ''}</Typography>
    </DialogTitle>
    <DialogContent dividers sx={{ '& p': { lineHeight: 1.6 }, '& h3': { fontSize: '.94rem', fontWeight: 800, mb: .75 } }}>
      {contexto && <>
        <Typography component="h3" sx={{ mt: 0 }}>O contexto do livro</Typography>
        <Typography component="p" variant="body2" sx={{ mt: 0, mb: 2 }}>{contexto.introducao}</Typography>
        {contexto.explicacao && <>
          <Typography component="h3">O que está acontecendo nesta passagem</Typography>
          <Typography component="p" variant="body2" sx={{ mt: 0, mb: 2 }}>{contexto.explicacao}</Typography>
        </>}
        {!dados && !erro && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}><CircularProgress size={20}/><Typography variant="body2">Abrindo os versículos próximos…</Typography></Box>}
        {erro && <Alert severity="info" action={<Button onClick={() => setTentativa(valor => valor + 1)}>Tentar novamente</Button>}>O enquadramento está disponível, mas não foi possível carregar o texto bíblico agora.</Alert>}
        {dados && <>
          <Typography component="h3">{contexto.tituloSecao}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Seção: {contexto.referenciaSecao}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Trecho ao redor do versículo: {contexto.referenciaTrecho || item?.referencia}</Typography>
          {contexto.trecho.map(valor => <Typography key={valor.numero} component="p" variant="body2" sx={{ m: 0, mb: .6, p: .9, borderRadius: 1, borderLeft: valor.selecionado ? '3px solid #bc8b2f' : '3px solid transparent', bgcolor: valor.selecionado ? 'action.selected' : 'transparent', fontWeight: valor.selecionado ? 600 : 400 }}><Box component="span" sx={{ fontWeight: 800, mr: .6 }}>{valor.numero}{valor.numeroFim > valor.numero ? '–' + valor.numeroFim : ''}</Box>{valor.texto}</Typography>)}
          {!contexto.trecho.length && <Alert severity="info">O trecho não está disponível nesta tradução.</Alert>}
          <Button onClick={() => abrir(urlLeitorBiblia({ livroId, capitulo, versiculos: [versiculo] }))} sx={{ mt: .5 }}>Abrir capítulo na Bíblia</Button>
        </>}
      </>}
    </DialogContent>
    <DialogActions sx={{ flexWrap: 'wrap' }}>
      <Button onClick={() => abrir('/versiculo-do-dia')}>Comentário completo</Button>
      <Button onClick={onClose} variant="contained">Fechar</Button>
    </DialogActions>
  </Dialog>
}
