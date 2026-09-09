import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material'
import HeadphonesIcon from '@mui/icons-material/Headphones'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import CloseIcon from '@mui/icons-material/Close'
import {
  ORIGINAL_AUDIO_ATTRIBUTIONS,
  audiosCapituloHebraico,
  introducaoAudioHebraico,
  tipoAudioLinguaOriginal,
  urlAudioCapituloGrego,
} from '../utils/originalLanguageAudio'
import { sxHebrewVocalizado } from '../utils/hebrewDisplay'

const SPEEDS = [1, 0.8, 1.25, 1.5]

function formatTime(value) {
  const total = Math.max(0, Math.floor(Number(value) || 0))
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export default function StrongOriginalAudioPlayer({ livroId, capitulo, cor, onVersiculoChange }) {
  const audioRef = useRef(null)
  const continuarRef = useRef(false)
  const mudandoFaixaRef = useRef(false)
  const versiculoAtivoRef = useRef(null)
  const introducaoRef = useRef(null)
  const [aberto, setAberto] = useState(false)
  const [tocando, setTocando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [tempo, setTempo] = useState(0)
  const [duracao, setDuracao] = useState(0)
  const [velocidade, setVelocidade] = useState(1)
  const [faixaIndex, setFaixaIndex] = useState(0)
  const [marcacoes, setMarcacoes] = useState([])
  const [introducaoAtiva, setIntroducaoAtiva] = useState(false)

  const tipo = tipoAudioLinguaOriginal(livroId)
  const fonte = ORIGINAL_AUDIO_ATTRIBUTIONS[tipo]
  const faixas = useMemo(() => {
    if (tipo === 'hebraico') return audiosCapituloHebraico(livroId, capitulo)
    if (tipo === 'grego') {
      const src = urlAudioCapituloGrego(livroId, capitulo)
      return src ? [{ src, inicio: 0, fim: null }] : []
    }
    return []
  }, [tipo, livroId, capitulo])
  const faixa = faixas[faixaIndex] || faixas[0] || null
  const src = faixa?.src || null
  const inicioFaixa = Number(faixa?.inicio) || 0
  const introducao = tipo === 'hebraico' ? introducaoAudioHebraico(livroId, capitulo) : null

  const publicarVersiculoAtivo = (versiculo) => {
    const proximo = Number(versiculo) || null
    if (versiculoAtivoRef.current === proximo) return
    versiculoAtivoRef.current = proximo
    onVersiculoChange?.(proximo)
  }

  useEffect(() => {
    const audio = audioRef.current
    continuarRef.current = false
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    setAberto(false)
    setTocando(false)
    setCarregando(false)
    setErro(false)
    setTempo(0)
    setDuracao(0)
    setFaixaIndex(0)
    setMarcacoes([])
    setIntroducaoAtiva(false)
    publicarVersiculoAtivo(null)
    mudandoFaixaRef.current = false
  }, [livroId, capitulo, tipo])

  useEffect(() => {
    let cancelado = false
    publicarVersiculoAtivo(null)
    if (!aberto || !faixa) {
      setMarcacoes([])
      return () => {
        cancelado = true
      }
    }
    const carregar = tipo === 'hebraico'
      ? import('../utils/hebrewAudioTimings').then(({ marcacoesVersiculosHebraicos }) =>
          marcacoesVersiculosHebraicos(livroId, faixa)
        )
      : import('../utils/greekAudioTimings').then(({ marcacoesVersiculosGregos }) =>
          marcacoesVersiculosGregos(livroId, capitulo)
        )
    carregar.then((proximasMarcacoes) => {
      if (!cancelado) setMarcacoes(proximasMarcacoes)
    })
    return () => {
      cancelado = true
    }
  }, [aberto, tipo, livroId, capitulo, faixaIndex, src])

  useEffect(() => {
    if (!introducao || !aberto || faixaIndex !== 0 || !marcacoes.length) {
      setIntroducaoAtiva(false)
      return
    }
    const agora = Number(audioRef.current?.currentTime) || 0
    setIntroducaoAtiva(agora < marcacoes[0].inicio)
  }, [introducao, aberto, faixaIndex, marcacoes])

  useEffect(() => {
    if (!introducaoAtiva || !tocando) return
    introducaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [introducaoAtiva, tocando])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src || !aberto) return undefined
    setErro(false)
    setTempo(0)
    setDuracao(0)
    audio.src = src
    audio.playbackRate = velocidade
    audio.load()
    if (continuarRef.current) {
      setCarregando(true)
      audio.play().catch(() => {
        continuarRef.current = false
        setCarregando(false)
        setTocando(false)
        setErro(true)
      })
    }
    mudandoFaixaRef.current = false
    return undefined
  }, [src, aberto, faixaIndex])

  useEffect(() => () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
    onVersiculoChange?.(null)
  }, [])

  if (!tipo || !src) return null

  const alternar = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (tocando) {
      continuarRef.current = false
      audio.pause()
      setTocando(false)
      return
    }
    setErro(false)
    setCarregando(true)
    try {
      await audio.play()
      setTocando(true)
    } catch {
      setErro(true)
      setTocando(false)
    } finally {
      setCarregando(false)
    }
  }

  const concluirFaixa = () => {
    if (mudandoFaixaRef.current) return
    if (faixaIndex < faixas.length - 1) {
      mudandoFaixaRef.current = true
      continuarRef.current = true
      setFaixaIndex((atual) => atual + 1)
      return
    }
    continuarRef.current = false
    setTocando(false)
    setIntroducaoAtiva(false)
    publicarVersiculoAtivo(null)
  }

  const avancarOuVoltar = (segundos) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || !faixa) return
    const fim = Number(faixa.fim) || audio.duration
    const alvo = audio.currentTime + segundos
    if (alvo >= fim && faixaIndex < faixas.length - 1) {
      continuarRef.current = tocando
      setFaixaIndex((atual) => atual + 1)
      return
    }
    if (alvo < inicioFaixa && faixaIndex > 0) {
      continuarRef.current = tocando
      setFaixaIndex((atual) => atual - 1)
      return
    }
    audio.currentTime = Math.min(fim, Math.max(inicioFaixa, alvo))
  }

  const trocarVelocidade = () => {
    const index = SPEEDS.indexOf(velocidade)
    const next = SPEEDS[(index + 1) % SPEEDS.length]
    setVelocidade(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const fechar = () => {
    const audio = audioRef.current
    continuarRef.current = false
    audio?.pause()
    setTocando(false)
    setAberto(false)
    setIntroducaoAtiva(false)
    publicarVersiculoAtivo(null)
  }

  return (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center', px: 0.5 }}>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadStart={() => setCarregando(true)}
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          const fim = Number(faixa?.fim) || Number(audio.duration) || 0
          audio.currentTime = inicioFaixa
          setTempo(0)
          setDuracao(Math.max(0, fim - inicioFaixa))
          setCarregando(false)
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget
          const fim = Number(faixa?.fim)
          if (fim && !audio.paused && audio.currentTime >= fim - 0.12) {
            audio.pause()
            concluirFaixa()
            return
          }
          const agora = Number(audio.currentTime) || 0
          const marcacao = marcacoes.find(
            (item) => agora >= item.inicio && agora < item.fim
          )
          setIntroducaoAtiva(
            Boolean(introducao && faixaIndex === 0 && marcacoes.length && agora < marcacoes[0].inicio)
          )
          publicarVersiculoAtivo(marcacao?.versiculo || null)
          setTempo(Math.max(0, agora - inicioFaixa))
        }}
        onPlaying={() => {
          setTocando(true)
          setCarregando(false)
        }}
        onPause={() => setTocando(false)}
        onEnded={concluirFaixa}
        onError={() => {
          continuarRef.current = false
          setCarregando(false)
          setTocando(false)
          setErro(true)
          setIntroducaoAtiva(false)
          publicarVersiculoAtivo(null)
        }}
      />

      {!aberto ? (
        <Tooltip title={`Ouvir o capítulo em ${tipo}`}>
          <IconButton
            onClick={() => setAberto(true)}
            aria-label={`Abrir áudio em ${tipo}`}
            sx={{
              width: 38,
              height: 38,
              color: cor || 'primary.main',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <HeadphonesIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Box
          sx={{
            width: '100%',
            maxWidth: 680,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            px: { xs: 0.75, sm: 1.25 },
            py: 0.65,
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <IconButton
              size="small"
              aria-label="Voltar 15 segundos"
              onClick={() => avancarOuVoltar(-15)}
            >
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={alternar}
              disabled={carregando && !tocando}
              aria-label={tocando ? 'Pausar' : 'Reproduzir'}
              sx={{ color: cor || 'primary.main' }}
            >
              {tocando ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <IconButton
              size="small"
              aria-label="Avançar 15 segundos"
              onClick={() => avancarOuVoltar(15)}
            >
              <SkipNextIcon fontSize="small" />
            </IconButton>

            <Box sx={{ minWidth: 0, flex: 1, px: 0.5 }}>
              <Slider
                size="small"
                min={0}
                max={duracao || 1}
                step={0.1}
                value={Math.min(tempo, duracao || 1)}
                onChange={(_, value) => {
                  const audio = audioRef.current
                  if (audio) audio.currentTime = inicioFaixa + (Number(value) || 0)
                  setTempo(Number(value) || 0)
                }}
                aria-label="Posição do áudio"
                sx={{ py: 0, color: cor || 'primary.main' }}
              />
              <Box sx={{ mt: -0.65, display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary' }}>
                  {formatTime(tempo)}
                </Typography>
                <Typography sx={{ fontSize: '0.64rem', color: erro ? 'error.main' : 'text.secondary' }}>
                  {erro
                    ? 'Áudio indisponível'
                    : `${faixas.length > 1 ? `parte ${faixaIndex + 1}/${faixas.length} · ` : ''}${formatTime(duracao)}`}
                </Typography>
              </Box>
            </Box>

            <Tooltip title="Alterar velocidade">
              <IconButton
                size="small"
                onClick={trocarVelocidade}
                aria-label={`Velocidade ${velocidade} vezes`}
                sx={{
                  width: 34,
                  height: 30,
                  borderRadius: 1,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {velocidade}×
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={fechar} aria-label="Fechar áudio">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {introducao ? (
            <Box
              ref={introducaoRef}
              sx={{
                mt: 0.45,
                mx: 0.5,
                px: 0.8,
                py: 0.5,
                borderRadius: 1,
                bgcolor: introducaoAtiva ? 'rgba(255, 193, 7, 0.22)' : 'action.hover',
                boxShadow: introducaoAtiva ? `inset 4px 0 0 ${cor || '#1e7a35'}` : 'none',
                transition: 'background-color 180ms ease, box-shadow 180ms ease',
              }}
            >
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                Antes do versículo 1, o leitor anuncia:
              </Typography>
              <Typography
                className="hebrew-vocalizado"
                dir="rtl"
                lang="he"
                sx={{
                  ...sxHebrewVocalizado,
                  fontSize: { xs: '1.05rem', sm: '1.15rem' },
                  lineHeight: 1.6,
                  textAlign: 'right',
                }}
              >
                {introducao.hebraico}
              </Typography>
              <Typography sx={{ fontSize: '0.67rem', lineHeight: 1.3, color: 'text.secondary' }}>
                {introducao.portugues}
              </Typography>
            </Box>
          ) : null}

          <Typography
            component="div"
            sx={{ mt: 0.2, px: 0.5, fontSize: '0.61rem', lineHeight: 1.25, color: 'text.secondary' }}
          >
            {tipo === 'hebraico' ? 'Hebraico' : 'Grego'} ·{' '}
            <Box component="a" href={fonte.fonte} target="_blank" rel="noreferrer" sx={{ color: 'inherit' }}>
              {fonte.leitor}
            </Box>{' '}
            · {fonte.detalhe}
            {fonte.licenca ? (
              <>
                {' · '}
                <Box component="a" href={fonte.licenca} target="_blank" rel="noreferrer" sx={{ color: 'inherit' }}>
                  licença
                </Box>
              </>
            ) : null}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
