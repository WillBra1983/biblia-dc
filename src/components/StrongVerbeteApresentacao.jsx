import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material'
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined'
import StarOutline from '@mui/icons-material/StarOutline'
import { limparTextoStepBible, montarDefinicaoExibicao, montarTwotPesquisaUrl } from '../utils/strongEstudoHelpers'
import { livros as livrosData } from '../data/biblia'
import {
  pararPronunciaStrong,
  pronunciaDisponivel,
  reproduzirPronunciaStrong,
  temVozOriginalInstalada,
} from '../utils/strongPronunciationAudio'
import { mostrarSnackbar } from '../utils/uiDialogs'

function useStrongDictPalette() {
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'
  return {
    label: dark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.45)',
    chipBg: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    chipBorder: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    itemBg: dark ? 'rgba(255,255,255,0.06)' : '#f4f4f6',
    itemBorder: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
    heroScript: dark ? '#fff' : '#111',
    noteBg: '#ffffff',
    noteText: '#1a1a1a',
    noteBorder: 'rgba(0,0,0,0.12)',
  }
}

function SecaoRotulo({ children, sx = {} }) {
  const p = useStrongDictPalette()
  return (
    <Typography
      component="p"
      sx={{
        m: 0,
        mb: 0.75,
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: p.label,
        ...sx,
      }}
    >
      {children}
    </Typography>
  )
}

function ItemCaixa({ children, onClick, sx = {} }) {
  const p = useStrongDictPalette()
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'
  return (
    <Box
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      sx={{
        px: 1.75,
        py: 1.25,
        borderRadius: 2.5,
        bgcolor: p.itemBg,
        border: '1px solid',
        borderColor: p.itemBorder,
        ...(onClick
          ? {
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: dark ? 'rgba(255,255,255,0.1)' : '#ebebed' },
            }
          : {}),
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

function ChipMeta({ label, icon, onClick, href }) {
  const p = useStrongDictPalette()
  const sx = {
    height: 28,
    fontSize: '0.78rem',
    fontWeight: 600,
    bgcolor: p.chipBg,
    border: '1px solid',
    borderColor: p.chipBorder,
    color: 'text.primary',
    '& .MuiChip-icon': { color: 'text.secondary', fontSize: 16 },
  }
  if (href) {
    return (
      <Chip
        component="a"
        href={href}
        target="_blank"
        rel="noreferrer"
        clickable
        label={label}
        icon={icon}
        sx={sx}
      />
    )
  }
  if (onClick) {
    return <Chip clickable label={label} icon={icon} onClick={onClick} sx={sx} />
  }
  return <Chip label={label} icon={icon} sx={sx} />
}

function BotaoPronuncia({ strongCode, unicode, translit, pronuncia, ehGrego }) {
  const [estado, setEstado] = useState('idle')
  const podeOuvir = pronunciaDisponivel() && !!(unicode || translit || pronuncia)
  const vozOriginal = temVozOriginalInstalada(ehGrego)
  const dica = vozOriginal
    ? 'Ouvir pronúncia (voz hebraica/grega do sistema)'
    : 'Ouvir guia fonética (seu PC não tem voz hebraica/grega instalada)'

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices()
    }
    return () => pararPronunciaStrong()
  }, [])

  const ouvir = useCallback(async () => {
    if (!podeOuvir) return
    if (estado === 'playing') {
      pararPronunciaStrong()
      setEstado('idle')
      return
    }
    setEstado('loading')
    try {
      await reproduzirPronunciaStrong({
        strongCode,
        unicode,
        translit,
        pronuncia,
        ehGrego,
      })
      setEstado('playing')
      window.setTimeout(() => setEstado('idle'), 2800)
    } catch {
      setEstado('idle')
      mostrarSnackbar({
        mensagem: 'Não foi possível reproduzir a pronúncia neste dispositivo.',
        severidade: 'info',
      })
    }
  }, [podeOuvir, estado, strongCode, unicode, translit, pronuncia, ehGrego])

  if (!podeOuvir) return null

  return (
    <Tooltip title={dica}>
      <span>
        <IconButton
          size="small"
          onClick={() => void ouvir()}
          aria-label="Ouvir pronúncia"
          sx={{
            ml: 0.25,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {estado === 'loading' ? (
            <CircularProgress size={16} />
          ) : (
            <VolumeUpOutlined sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  )
}

export default function StrongVerbeteApresentacao({
  detalhe,
  code,
  ehGrego,
  traduzirStrongPtBr,
  sxTextoLeitura,
  token,
  bdbDetalhe,
  notaTexto,
  setNotaTexto,
  salvarNota,
  notaStatus,
  user,
  onIrLogin,
  ocorrencias,
  ocorrenciasLoading,
  ocorrenciasTotal,
  onVerTodasOcorrencias,
  onAbrirOcorrencia,
  renderSomenteCodigosDerivacao,
}) {
  const p = useStrongDictPalette()

  const definicao =
    traduzirStrongPtBr
      ? detalhe.definition_pt || detalhe.definition || montarDefinicaoExibicao(detalhe)
      : detalhe.definition_original || montarDefinicaoExibicao(detalhe)

  const pronuncia = String(detalhe.pronunciation || '').trim()
  const posLabel = detalhe.lexicalIndex?.find((li) => li?.pos)?.pos || ''

  const usosPt = [
    ...new Set(
      (detalhe.lexicalIndex || []).flatMap((li) => {
        const raw = String(
          traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def || ''
        ).trim()
        if (!raw) return []
        return raw.split(/[;|]/).map((p) => p.trim()).filter(Boolean)
      })
    ),
  ]

  const derivacaoRaw = traduzirStrongPtBr
    ? String(detalhe.derivation_pt || detalhe.derivation || detalhe.derivation_original || '').trim()
    : String(detalhe.derivation_original || detalhe.derivation || '').trim()

  const codigosDerivacao = derivacaoRaw ? renderSomenteCodigosDerivacao(derivacaoRaw) : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Cabeçalho do verbete */}
      <Box>
        <Typography
          variant="h4"
          component="p"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2.35rem', sm: '2.75rem' },
            lineHeight: 1.15,
            color: p.heroScript,
            fontFamily: '"Source Serif 4", "Noto Serif Hebrew", "Times New Roman", serif',
            mb: 2.5,
            wordBreak: 'break-word',
            textAlign: 'center',
          }}
        >
          {detalhe.greek_unicode || '—'}
        </Typography>

        {!!detalhe.greek_translit && (
          <Box sx={{ mb: 2 }}>
            <SecaoRotulo>Transliteração</SecaoRotulo>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.35rem', sm: '1.55rem' },
                letterSpacing: 0.2,
                color: 'text.primary',
              }}
            >
              {detalhe.greek_translit}
            </Typography>
          </Box>
        )}

        {!!pronuncia && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <SecaoRotulo sx={{ mb: 0 }}>Pronúncia</SecaoRotulo>
              <BotaoPronuncia
                strongCode={detalhe.strong || code}
                unicode={detalhe.greek_unicode}
                translit={detalhe.greek_translit}
                pronuncia={pronuncia}
                ehGrego={ehGrego}
              />
            </Box>
            <Typography sx={{ fontSize: '1.05rem', color: 'text.primary', fontStyle: 'italic' }}>
              {pronuncia}
            </Typography>
          </Box>
        )}

        {!pronuncia && !!(detalhe.greek_unicode || detalhe.greek_translit) && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <SecaoRotulo sx={{ mb: 0 }}>Ouvir</SecaoRotulo>
            <BotaoPronuncia
              strongCode={detalhe.strong || code}
              unicode={detalhe.greek_unicode}
              translit={detalhe.greek_translit}
              pronuncia=""
              ehGrego={ehGrego}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <ChipMeta label={detalhe.strong || code} />
          <ChipMeta label={ehGrego ? 'Grego' : 'Hebraico'} icon={<StarOutline />} />
          {!!posLabel && <ChipMeta label={posLabel} />}
        </Box>
      </Box>

      {token && (
        <Box>
          <SecaoRotulo>Token na passagem</SecaoRotulo>
          <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.primary' }}>
            <strong>{token.text || '—'}</strong>
            {token.lemma || token.lemma_raw ? ` · ${token.lemma || token.lemma_raw}` : ''}
          </Typography>
        </Box>
      )}

      {!!definicao && (
        <Box>
          <SecaoRotulo>Definição</SecaoRotulo>
          <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.primary', lineHeight: 1.65 }}>
            {definicao}
          </Typography>
        </Box>
      )}

      {!!codigosDerivacao && (
        <Box>
          <SecaoRotulo>Referências Strong relacionadas</SecaoRotulo>
          <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.secondary' }}>
            {codigosDerivacao}
          </Typography>
        </Box>
      )}

      {!!usosPt.length && (
        <Box>
          <SecaoRotulo>Uso em português</SecaoRotulo>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {usosPt.map((uso, idx) => (
              <ItemCaixa key={`uso-${idx}`}>
                <Typography sx={{ ...sxTextoLeitura, color: 'text.primary', m: 0 }}>
                  {uso}
                </Typography>
              </ItemCaixa>
            ))}
          </Box>
        </Box>
      )}

      {!!detalhe.lexicalIndex?.length && (
        <Box>
          <SecaoRotulo>Índice lexical (acadêmico)</SecaoRotulo>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {detalhe.lexicalIndex.map((li) => (
              <ItemCaixa key={`${li.entry_id}-${li.bdb || ''}-${li.twot || ''}`}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'text.primary', mb: 0.35, ...sxTextoLeitura }}
                >
                  {[li.entry_id, li.pos].filter(Boolean).join(' · ') || '—'}
                </Typography>
                {(li.bdb || li.twot) && (
                  <Typography variant="body2" component="div" sx={{ color: 'text.secondary', ...sxTextoLeitura }}>
                    {li.bdb ? `BDB ${li.bdb}` : ''}
                    {li.bdb && li.twot ? ' · ' : ''}
                    {li.twot && (
                      <Box
                        component="a"
                        href={montarTwotPesquisaUrl(li.twot)}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          color: 'primary.main',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                          fontWeight: 600,
                        }}
                      >
                        {`TWOT ${li.twot}`}
                      </Box>
                    )}
                  </Typography>
                )}
                {(traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def) && (
                  <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', ...sxTextoLeitura }}>
                    {traduzirStrongPtBr ? li.short_def_pt || li.short_def : li.short_def_original || li.short_def}
                  </Typography>
                )}
              </ItemCaixa>
            ))}
          </Box>
        </Box>
      )}

      {(bdbDetalhe.loading || bdbDetalhe.entry) && (
        <Box>
          <SecaoRotulo>BDB {bdbDetalhe.code ? `(${bdbDetalhe.code})` : ''}</SecaoRotulo>
          {bdbDetalhe.loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Carregando verbete BDB…
              </Typography>
            </Box>
          ) : (
            <ItemCaixa>
              <Typography variant="body1" sx={{ ...sxTextoLeitura, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                {String(
                  (traduzirStrongPtBr
                    ? bdbDetalhe.entry.content_text_pt ||
                      bdbDetalhe.entry.content_text ||
                      bdbDetalhe.entry.content_text_original
                    : bdbDetalhe.entry.content_text_original ||
                      bdbDetalhe.entry.content_text_pt ||
                      bdbDetalhe.entry.content_text) || ''
                )}
              </Typography>
            </ItemCaixa>
          )}
        </Box>
      )}

      <Box>
        <SecaoRotulo>STEPBible</SecaoRotulo>
        {!!detalhe.stepBibleEntries?.length ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {detalhe.stepBibleEntries.map((e, idx) => {
              const glossEn = limparTextoStepBible(e.gloss_original || e.gloss || '')
              const glossPt = limparTextoStepBible(e.gloss_pt || '')
              const glossLinha = traduzirStrongPtBr ? glossPt || glossEn : glossEn
              const definicaoPt = limparTextoStepBible(e.definition_pt || e.definition_original || '')
              const definicaoEn = limparTextoStepBible(e.definition_clean || e.definition || '')
              const definicaoSb = traduzirStrongPtBr ? definicaoPt || definicaoEn : definicaoEn
              return (
                <ItemCaixa key={`${e.source}-${e.strongs_extended}-${idx}`}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, ...sxTextoLeitura }}
                  >
                    {String(e.source || '').replace('stepbible-', '').toUpperCase()}
                  </Typography>
                  {!!glossLinha && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.35, ...sxTextoLeitura }}>
                      {glossLinha}
                    </Typography>
                  )}
                  {!!definicaoSb && (
                    <Typography variant="body2" sx={{ color: 'text.primary', ...sxTextoLeitura }}>
                      {definicaoSb}
                    </Typography>
                  )}
                </ItemCaixa>
              )
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={sxTextoLeitura}>
            Nenhum conteúdo STEPBible disponível para este verbete.
          </Typography>
        )}
      </Box>

      <Box>
        <SecaoRotulo>Anotação deste verbete ({code})</SecaoRotulo>
        {!user?.uid ? (
          <Alert
            severity="info"
            action={
              <Button size="small" variant="outlined" onClick={onIrLogin}>
                Entrar
              </Button>
            }
          >
            Faça login para criar e sincronizar anotações deste dicionário entre seus dispositivos.
          </Alert>
        ) : (
          <>
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              placeholder="Escreva observações sobre esta palavra (contexto, aplicações, dúvidas, etc.)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: p.noteBg,
                  color: p.noteText,
                  borderRadius: 2.5,
                  '& fieldset': { borderColor: p.noteBorder },
                  '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                },
                '& .MuiInputBase-input::placeholder': { color: 'rgba(0,0,0,0.42)', opacity: 1 },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button size="small" variant="contained" onClick={salvarNota} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Salvar anotação
              </Button>
              {!!notaStatus && (
                <Typography variant="caption" color="text.secondary">
                  {notaStatus}
                </Typography>
              )}
            </Box>
          </>
        )}
      </Box>

      <Box>
        <SecaoRotulo>Ocorrências em outros textos</SecaoRotulo>
        {ocorrenciasTotal != null && ocorrenciasTotal > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, ...sxTextoLeitura }}>
            {ocorrenciasTotal === 1
              ? '1 referência no texto original.'
              : `${ocorrenciasTotal} referências no texto original.`}
          </Typography>
        )}
        {ocorrenciasLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Buscando ocorrências…
            </Typography>
          </Box>
        )}
        {!ocorrenciasLoading && !!ocorrencias.length && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {ocorrencias.map((r, idx) => (
              <ItemCaixa key={`occ-${idx}`} onClick={() => onAbrirOcorrencia(r, idx)}>
                <Typography
                  sx={{
                    ...sxTextoLeitura,
                    color: 'primary.main',
                    fontWeight: 600,
                    m: 0,
                  }}
                >
                  {`${livrosData.find((l) => Number(l.id) === Number(r.livroId))?.nome || 'Livro'} ${r.capitulo}:${r.versiculo}`}
                </Typography>
              </ItemCaixa>
            ))}
            {ocorrenciasTotal != null && ocorrenciasTotal > 0 && (
              <Button
                size="small"
                variant={ocorrenciasTotal > ocorrencias.length ? 'contained' : 'outlined'}
                onClick={onVerTodasOcorrencias}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600, borderRadius: 2, mt: 0.25 }}
              >
                {ocorrenciasTotal > ocorrencias.length
                  ? `Ver todas (${ocorrenciasTotal})`
                  : 'Ver lista completa'}
              </Button>
            )}
          </Box>
        )}
        {!ocorrenciasLoading && !ocorrencias.length && (
          <Typography variant="body2" color="text.secondary" sx={sxTextoLeitura}>
            Não encontramos ocorrências para este código no texto original.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
