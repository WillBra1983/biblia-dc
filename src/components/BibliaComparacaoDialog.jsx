import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Dialog, DialogTitle, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import NavigateBefore from '@mui/icons-material/NavigateBefore'
import NavigateNext from '@mui/icons-material/NavigateNext'
import { livros } from '../data/biblia'
import { VERSOES_BIBLICAS } from '../data/bibliaVersoes'
import { buscarCapituloNaVersao, buscarPericopesNaVersao } from '../services/bibliaService'
import { ancoraComparacao, topoComparacao } from '../utils/bibliaComparacaoScroll'
import TextoFalasJesus from './TextoFalasJesus'

function medir(painel) {
  return [...painel.querySelectorAll('[data-comparacao-versiculo]')].map(elemento => ({
    inicio: Number(elemento.dataset.comparacaoVersiculo),
    fim: Number(elemento.dataset.versiculoFim),
    topo: elemento.offsetTop,
    altura: elemento.offsetHeight,
  }))
}

export default function BibliaComparacaoDialog({ livroId, capituloInicial, versaoInicial, versiculoInicial = 1, fontFamily, fontSize = 100, onClose }) {
  const [livro, setLivro] = useState(livroId)
  const [capitulo, setCapitulo] = useState(capituloInicial)
  const [versoes, setVersoes] = useState(() => [versaoInicial, ...VERSOES_BIBLICAS.map(v => v.id).filter(id => id !== versaoInicial)].slice(0, 3))
  const [paineis, setPaineis] = useState([])
  const [painelOculto, setPainelOculto] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tentativa, setTentativa] = useState(0)
  const elementos = useRef([])
  const esperados = useRef([])
  const ancora = useRef({ posicao: versiculoInicial })
  const livroAtual = livros.find(item => item.id === livro) || livros[0]
  const chaveVersoes = versoes.join(':')

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    Promise.all(versoes.map(async versao => {
      try {
        const [versiculos, pericopes] = await Promise.all([
          buscarCapituloNaVersao(versao, livro, capitulo),
          buscarPericopesNaVersao(versao, livro, capitulo),
        ])
        if (!versiculos?.length) throw Error('Capítulo indisponível')
        return { versiculos, pericopes }
      } catch { return { erro: 'Não foi possível carregar esta tradução. Verifique a conexão ou tente novamente.' } }
    })).then(resultado => {
      if (!cancelado) { setPaineis(resultado); setCarregando(false) }
    })
    return () => { cancelado = true }
  }, [livro, capitulo, chaveVersoes, tentativa])

  function posicionar(indice, origem = ancora.current) {
    const painel = elementos.current[indice]
    if (!painel) return
    const topo = topoComparacao(medir(painel), origem, Math.max(0, painel.scrollHeight - painel.clientHeight))
    painel.scrollTop = topo
    esperados.current[indice] = painel.scrollTop
  }
  useLayoutEffect(() => {
    if (carregando) return
    elementos.current.forEach((_, indice) => posicionar(indice))
    if (typeof ResizeObserver === 'undefined') return
    let frame
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => elementos.current.forEach((_, indice) => posicionar(indice)))
    })
    elementos.current.filter(Boolean).forEach(elemento => {
      observer.observe(elemento)
      const conteudo = elemento.querySelector('[data-comparacao-conteudo]')
      if (conteudo) observer.observe(conteudo)
    })
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [paineis, carregando, painelOculto])

  function sincronizar(indice) {
    const painel = elementos.current[indice]
    if (esperados.current[indice] != null && Math.abs(painel.scrollTop - esperados.current[indice]) <= 1) {
      esperados.current[indice] = null
      return
    }
    esperados.current[indice] = null
    ancora.current = ancoraComparacao(medir(painel), painel.scrollTop, Math.max(0, painel.scrollHeight - painel.clientHeight))
    elementos.current.forEach((_, outro) => { if (outro !== indice) posicionar(outro) })
  }
  function mudarPassagem(novoLivro, novoCapitulo) {
    ancora.current = { posicao: 1 }
    esperados.current = []
    setLivro(novoLivro); setCapitulo(novoCapitulo)
  }

  return <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="comparacao-biblia-titulo"
    PaperProps={{ sx: { m: 1, width: 'calc(100% - 16px)', height: 'calc(100dvh - 24px)', maxHeight: 'calc(100dvh - 24px)', display: 'flex', overflow: 'hidden' } }}>
    <DialogTitle id="comparacao-biblia-titulo" sx={{ position: 'relative', minHeight: 56, flexShrink: 0, py: 1.5, pr: painelOculto === null ? 7 : 13, fontSize: '1.1rem' }}>
      Comparar traduções
      {painelOculto !== null && <Tooltip title="Reabrir terceira versão">
        <IconButton aria-label="Reabrir terceira versão" onClick={() => setPainelOculto(null)} sx={{ position: 'absolute', width: 44, height: 44, right: 52, top: 6 }}><AddIcon /></IconButton>
      </Tooltip>}
      <IconButton aria-label="Fechar comparação" onClick={onClose} sx={{ position: 'absolute', width: 44, height: 44, right: 8, top: 6 }}><CloseIcon /></IconButton>
    </DialogTitle>
    <Box sx={{ display: 'flex', gap: 1, px: 1.5, pb: 1, alignItems: 'center' }}>
      <TextField select label="Livro" size="small" value={livro} SelectProps={{ native: true }} sx={{ flex: 1, minWidth: 0 }}
        onChange={evento => mudarPassagem(Number(evento.target.value), 1)}>
        {livros.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
      </TextField>
      <TextField select label="Capítulo" size="small" value={capitulo} SelectProps={{ native: true }} sx={{ width: 90 }}
        onChange={evento => mudarPassagem(livro, Number(evento.target.value))}>
        {Array.from({ length: livroAtual.capitulos }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </TextField>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
        <IconButton size="small" aria-label="Capítulo anterior na comparação" disabled={capitulo <= 1} onClick={() => mudarPassagem(livro, capitulo - 1)}><NavigateBefore /></IconButton>
        <IconButton size="small" aria-label="Próximo capítulo na comparação" disabled={capitulo >= livroAtual.capitulos} onClick={() => mudarPassagem(livro, capitulo + 1)}><NavigateNext /></IconButton>
      </Box>
    </Box>
    <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: `repeat(${painelOculto === null ? 3 : 2}, minmax(0, 1fr))`, gap: 1, px: 1, pb: 1 }}>
      {versoes.map((versao, indice) => painelOculto === indice ? null : <Box key={indice} sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ px: 1, py: 0.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField select fullWidth size="small" value={versao} SelectProps={{ native: true }}
            inputProps={{ 'aria-label': `Tradução do painel ${indice + 1}` }}
            onChange={evento => setVersoes(atuais => atuais.map((atual, i) => i === indice ? evento.target.value : atual))}>
            {VERSOES_BIBLICAS.map(item => <option key={item.id} value={item.id}>{item.sigla} — {item.nome}</option>)}
          </TextField>
          {painelOculto === null && <Tooltip title="Fechar este painel e comparar duas versões">
            <IconButton size="small" aria-label={`Fechar painel ${indice + 1} da comparação`} onClick={() => setPainelOculto(indice)}><CloseIcon fontSize="small" /></IconButton>
          </Tooltip>}
        </Box>
        <Box ref={elemento => { elementos.current[indice] = elemento }} onScroll={() => { if (!carregando && !paineis[indice]?.erro) sincronizar(indice) }}
          role="region" aria-label={`${VERSOES_BIBLICAS.find(v => v.id === versao)?.sigla} — ${livroAtual.nome} ${capitulo}`} tabIndex={0}
          aria-busy={carregando} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', overscrollBehavior: 'contain', overflowAnchor: 'none', fontFamily, fontSize: `${fontSize}%`, lineHeight: 1.6 }}>
          <Box data-comparacao-conteudo>
          {carregando ? <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} aria-label="Carregando comparação" /></Box>
            : paineis[indice]?.erro ? <Alert severity="warning" action={<Button onClick={() => setTentativa(n => n + 1)}>Tentar novamente</Button>}>{paineis[indice].erro}</Alert>
              : paineis[indice]?.versiculos.map(verso => <Box key={verso.numero} data-comparacao-versiculo={verso.numero} data-versiculo-fim={verso.numeroFim || verso.numero} sx={{ px: 1.5, py: 0.5 }}>
                {paineis[indice].pericopes.filter(p => p.versiculo >= verso.numero && p.versiculo <= (verso.numeroFim || verso.numero)).map((p, i) =>
                  <Typography key={i} component="div" sx={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 700, py: 0.5 }}>{p.titulo}</Typography>)}
                <Box component="span" sx={{ fontSize: '0.75em', fontWeight: 700, mr: 0.75 }}>{verso.numeroFim > verso.numero ? `${verso.numero}–${verso.numeroFim}` : verso.numero}</Box>
                <TextoFalasJesus texto={verso.textoMarcado || verso.texto} semNumero />
              </Box>)}
          </Box>
        </Box>
      </Box>)}
    </Box>
  </Dialog>
}
