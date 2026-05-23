import React, { useState, useRef, useEffect } from 'react'
import { Box, IconButton, Slider, Typography } from '@mui/material'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Pause from '@mui/icons-material/Pause'
import { useApp } from '../contexts/AppContext'

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Resolve audioUrl para funcionar no site (base /biblia/) e no app (APK/AAB, base /)
function resolveAudioUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '')
  return `${base}/${url.replace(/^\//, '')}`
}

export default function AudioPlayer({ url, label = 'Áudio' }) {
  const { isDarkMode } = useApp()
  const audioRef = useRef(null)
  const resolvedUrl = resolveAudioUrl(url)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !resolvedUrl) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
    }
    const onCanPlay = () => setLoaded(true)
    const onError = () => setError(true)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [resolvedUrl])

  useEffect(() => {
    if (!resolvedUrl) return
    setLoaded(false)
    setError(false)
    setCurrentTime(0)
    setDuration(0)
  }, [resolvedUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => setError(true))
    }
    setPlaying(!playing)
  }

  const handleSeek = (_, value) => {
    const v = Array.isArray(value) ? value[0] : value
    const audio = audioRef.current
    if (audio && Number.isFinite(v)) {
      audio.currentTime = v
      setCurrentTime(v)
    }
  }

  if (!resolvedUrl) return null
  const durationFinite = Number.isFinite(duration) && duration > 0

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1.5,
        borderRadius: 1,
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        border: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap'
      }}
    >
      <audio ref={audioRef} src={resolvedUrl} preload="metadata" />
      <IconButton
        onClick={togglePlay}
        disabled={error}
        color="primary"
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
      >
        {playing ? <Pause /> : <PlayArrow />}
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {label && (
          <Typography variant="caption" color="text.secondary" display="block">
            {label}
          </Typography>
        )}
        {error ? (
          <Typography variant="caption" color="error">
            Não foi possível carregar o áudio.
          </Typography>
        ) : durationFinite ? (
          <Slider
            size="small"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            sx={{ mt: 0.5 }}
            aria-label="Posição do áudio"
          />
        ) : loaded ? (
          <Typography variant="caption" color="text.secondary">
            {formatTime(currentTime)}
          </Typography>
        ) : null}
      </Box>
      {durationFinite && (
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
      )}
    </Box>
  )
}
