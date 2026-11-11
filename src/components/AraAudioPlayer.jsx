import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import HeadphonesIcon from '@mui/icons-material/Headphones'
import CloseIcon from '@mui/icons-material/Close'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { obterAudioAra, obterAudioAraSalvo } from '../services/araAudioService'
import { validarMarcacoesAra, versiculoAraNoTempo } from '../utils/araAudioTimings'
import { versaoBiblicaPorId } from '../data/bibliaVersoes'
import { bibliaAudioOfflineService } from '../services/bibliaAudioOfflineService'

async function baixarAudio(url) {
  const resposta = await fetch(url, { credentials: 'omit' })
  if (!resposta.ok) throw Error('Download indisponível.')
  return resposta.blob()
}

export default function AraAudioPlayer({ livroId, capitulo, livroNome, cor, versao = 'ara', onVersiculoChange, carregarAudio = obterAudioAra, carregarSalvo = obterAudioAraSalvo, repositorioOffline = bibliaAudioOfflineService, baixarArquivo = baixarAudio }) {
  const audioRef = useRef(null)
  const pedidoRef = useRef(0)
  const versiculoAtivoRef = useRef(null)
  const arquivoInputRef = useRef(null)
  const consultaOfflineRef = useRef(0)
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [modoArquivo, setModoArquivo] = useState(false)
  const [acompanhar, setAcompanhar] = useState(false)
  const [audioSalvo, setAudioSalvo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroOffline, setErroOffline] = useState('')
  const [menuAnchor, setMenuAnchor] = useState(null)
  const sigla = versaoBiblicaPorId(versao)?.sigla || 'ARA'
  const referencia = `${versao}:${livroId}:${capitulo}`

  const publicarVersiculo = (versiculo) => {
    if (versiculoAtivoRef.current === versiculo) return
    versiculoAtivoRef.current = versiculo
    onVersiculoChange?.(versiculo)
  }

  const parar = () => {
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load() }
  }
  const fechar = () => {
    pedidoRef.current++
    parar()
    setAberto(false)
    setCarregando(false)
    setDados(null)
    setErro('')
    setModoArquivo(false)
    setAcompanhar(false)
    setMenuAnchor(null)
    setErroOffline('')
    setSalvando(false)
    publicarVersiculo(null)
  }
  useEffect(() => {
    fechar()
    return () => { pedidoRef.current++; parar() }
  }, [versao, livroId, capitulo])
  useEffect(() => {
    const consulta = ++consultaOfflineRef.current
    setAudioSalvo(false)
    repositorioOffline.existe(versao, livroId, capitulo).then(existe => {
      if (consulta === consultaOfflineRef.current) setAudioSalvo(existe)
    }).catch(() => {})
    return () => { consultaOfflineRef.current++ }
  }, [versao, livroId, capitulo, repositorioOffline])
  useEffect(() => () => { onVersiculoChange?.(null) }, [onVersiculoChange])
  useEffect(() => {
    // Guarda o elemento exato: a ref já pode ter sido limpa ao desmontar.
    const audio = audioRef.current
    const urlLocal = dados?.local && dados.referenciaPlayer === referencia ? dados.url : null
    return () => {
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load() }
      if (urlLocal) URL.revokeObjectURL(urlLocal)
    }
  }, [dados?.url, referencia])

  const abrirArquivo = async (evento) => {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!arquivo) return
    const pedido = ++pedidoRef.current
    const gravacao = ++consultaOfflineRef.current
    parar()
    setAberto(true)
    setModoArquivo(true)
    setAcompanhar(false)
    publicarVersiculo(null)
    setCarregando(false)
    setDados(null)
    setErro('')
    setErroOffline('')
    setMenuAnchor(null)
    if (!arquivo.size || (!arquivo.type.startsWith('audio/') && !/\.(mp3|m4a|mp4|wav|ogg|oga|aac|flac|opus|webm)$/i.test(arquivo.name))) {
      setErro('Selecione um arquivo de áudio salvo no aparelho.')
      return
    }
    try {
      const salvo = carregarSalvo(livroId, capitulo, { versao })
      const metadados = { nomeArquivo: arquivo.name, marcacoes: validarMarcacoesAra(salvo?.marcacoes), origemConferida: false }
      setDados({ url: URL.createObjectURL(arquivo), local: true, referenciaPlayer: referencia, ...metadados })
      setSalvando(true)
      try {
        await repositorioOffline.salvar(versao, livroId, capitulo, arquivo, metadados)
        if (gravacao === consultaOfflineRef.current) setAudioSalvo(true)
      } catch {
        if (pedido === pedidoRef.current) setErroOffline('O arquivo pode ser ouvido agora, mas não foi possível guardá-lo para as próximas aberturas.')
      } finally { if (pedido === pedidoRef.current) setSalvando(false) }
    } catch {
      setErro('Não foi possível abrir esse arquivo. Selecione o áudio novamente.')
    }
  }

  const abrirOffline = async () => {
    const pedido = ++pedidoRef.current
    parar(); publicarVersiculo(null)
    setAberto(true); setModoArquivo(true); setMenuAnchor(null); setDados(null); setErro(''); setErroOffline(''); setCarregando(true)
    try {
      const salvo = await repositorioOffline.obter(versao, livroId, capitulo)
      if (pedido !== pedidoRef.current) return
      if (!salvo) { setAudioSalvo(false); throw Error('Arquivo não encontrado.') }
      const metadados = salvo.metadados || {}
      setAcompanhar(metadados.origemConferida === true)
      setDados({ ...metadados, marcacoes: validarMarcacoesAra(metadados.marcacoes), url: URL.createObjectURL(salvo.arquivo), local: true, referenciaPlayer: referencia })
    } catch { if (pedido === pedidoRef.current) setErro('Não foi possível abrir o áudio salvo deste capítulo.') }
    finally { if (pedido === pedidoRef.current) setCarregando(false) }
  }
  const salvarCapitulo = async () => {
    if (!dadosAtuais || dadosAtuais.local || salvando) return
    const pedido = pedidoRef.current
    const gravacao = ++consultaOfflineRef.current
    setMenuAnchor(null); setSalvando(true); setErroOffline('')
    try {
      const arquivo = await baixarArquivo(dadosAtuais.url)
      if (gravacao !== consultaOfflineRef.current) return
      const nomeArquivo = new URL(dadosAtuais.url).pathname.split('/').at(-1)
      await repositorioOffline.salvar(versao, livroId, capitulo, arquivo, { nomeArquivo, marcacoes: dadosAtuais.marcacoes, origemConferida: true })
      if (gravacao === consultaOfflineRef.current) setAudioSalvo(true)
    } catch { if (pedido === pedidoRef.current) setErroOffline('Não foi possível salvar o capítulo. Você também pode selecionar um arquivo já baixado nas opções do áudio.') }
    finally { if (pedido === pedidoRef.current) setSalvando(false) }
  }
  const removerOffline = async () => {
    const pedido = pedidoRef.current
    consultaOfflineRef.current++
    setMenuAnchor(null)
    try {
      await repositorioOffline.remover(versao, livroId, capitulo)
      if (pedido === pedidoRef.current) { setAudioSalvo(false); if (dadosAtuais?.local) fechar() }
    } catch { if (pedido === pedidoRef.current) setErroOffline('Não foi possível remover o áudio salvo.') }
  }

  const carregar = async (atualizar = false) => {
    const pedido = ++pedidoRef.current
    parar()
    setAberto(true)
    setModoArquivo(false)
    setAcompanhar(true)
    publicarVersiculo(null)
    setDados(null)
    setErro('')
    setCarregando(true)
    try {
      const fonte = await carregarAudio(livroId, capitulo, { atualizar, versao })
      if (pedidoRef.current === pedido) setDados({ ...fonte, marcacoes: validarMarcacoesAra(fonte.marcacoes), referenciaPlayer: referencia })
    } catch {
      if (pedidoRef.current === pedido) setErro('Não foi possível carregar o áudio deste capítulo. Tente novamente.')
    } finally {
      if (pedidoRef.current === pedido) setCarregando(false)
    }
  }
  const dadosAtuais = dados?.referenciaPlayer === referencia ? dados : null
  const atualizarVersiculo = (audio) => publicarVersiculo(acompanhar && !erro
    ? versiculoAraNoTempo(dadosAtuais?.marcacoes || [], audio.currentTime) : null)
  return (
    <Box sx={{ mb: 2, px: 0.5, maxWidth: 680, mx: 'auto' }}>
      {!aberto ? <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button startIcon={<HeadphonesIcon />} aria-label={`Ouvir ${sigla}`} onClick={() => carregar()} sx={{ color: cor || 'primary.main', textTransform: 'none' }}>
          Ouvir
        </Button>
      </Box> : <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{modoArquivo ? 'Áudio do aparelho' : `Áudio ${sigla} · ${livroNome} ${capitulo}`}</Typography>
          <Box sx={{ display: 'flex' }}>
            <IconButton size="small" aria-label="Opções do áudio" onClick={evento => setMenuAnchor(evento.currentTarget)}><MoreVertIcon fontSize="small" /></IconButton>
            <IconButton size="small" aria-label={`Fechar áudio ${sigla}`} onClick={fechar}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        </Box>
        {carregando && <Typography role="status" color="text.secondary">Carregando áudio…</Typography>}
        {salvando && <Typography role="status" color="text.secondary">Salvando áudio…</Typography>}
        {erroOffline && <Alert severity="warning" sx={{ my: 1 }}>{erroOffline}</Alert>}
        {erro && <Alert severity="warning" sx={{ my: 1 }} action={modoArquivo ? undefined : <Button color="inherit" size="small" onClick={() => carregar(true)}>Tentar novamente</Button>}>{erro}</Alert>}
        {dadosAtuais && <>
          <audio key={dadosAtuais.url} ref={audioRef} controls preload={dadosAtuais.local ? 'metadata' : 'none'} src={dadosAtuais.url}
            aria-label={dadosAtuais.local ? `Áudio salvo: ${dadosAtuais.nomeArquivo}` : `Narração ${sigla} de ${livroNome} ${capitulo}`} style={{ width: '100%', marginTop: 8 }}
            onTimeUpdate={(evento) => atualizarVersiculo(evento.currentTarget)}
            onSeeked={(evento) => atualizarVersiculo(evento.currentTarget)}
            onPlay={(evento) => atualizarVersiculo(evento.currentTarget)}
            onEnded={() => publicarVersiculo(null)}
            onError={() => { publicarVersiculo(null); setErro(dadosAtuais.local ? 'Não foi possível reproduzir esse arquivo. Selecione outro áudio salvo em formato compatível.' : 'A reprodução foi interrompida. Tente carregar o áudio novamente.') }} />
          {dadosAtuais.local ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, overflowWrap: 'anywhere' }}>Offline · {dadosAtuais.nomeArquivo}</Typography> : <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>{dadosAtuais.credito}</Typography>
            <Button size="small" component="a" href={dadosAtuais.paginaFonte} target="_blank" rel="noopener noreferrer" sx={{ textTransform: 'none' }}>Fonte: bible.com</Button>
          </>}
        </>}
      </Box>}
      {audioSalvo && !aberto && <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button size="small" onClick={abrirOffline} sx={{ textTransform: 'none', color: cor || 'primary.main' }}>Ouvir offline</Button>
      </Box>}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {dadosAtuais && !dadosAtuais.local && <MenuItem disabled={salvando || audioSalvo} onClick={salvarCapitulo}>{audioSalvo ? 'Capítulo salvo no aparelho' : 'Salvar capítulo para ouvir offline'}</MenuItem>}
        <MenuItem disabled={salvando} onClick={() => { setMenuAnchor(null); arquivoInputRef.current?.click() }}>Selecionar arquivo já baixado</MenuItem>
        {audioSalvo && <MenuItem onClick={removerOffline}>Remover áudio salvo deste capítulo</MenuItem>}
        {dadosAtuais?.marcacoes?.length > 0 && <MenuItem onClick={() => {
          const ativar = !acompanhar
          setAcompanhar(ativar); setMenuAnchor(null)
          publicarVersiculo(ativar ? versiculoAraNoTempo(dadosAtuais.marcacoes, audioRef.current?.currentTime) : null)
        }}>{acompanhar ? 'Desativar acompanhamento' : dadosAtuais.local && !dadosAtuais.origemConferida ? `Confirmar gravação ${sigla} deste capítulo e acompanhar` : 'Acompanhar versículos'}</MenuItem>}
      </Menu>
      <input ref={arquivoInputRef} type="file" accept="audio/*,.mp3,.m4a,.mp4,.wav,.ogg,.oga,.aac,.flac,.opus,.webm" hidden aria-label="Selecionar áudio salvo no aparelho" onChange={abrirArquivo} />
    </Box>
  )
}
