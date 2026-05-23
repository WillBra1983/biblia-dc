import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Slider
} from '@mui/material'
import { extrairReferenciaBiblica, limparReferenciasParalelasARA } from '../utils/biblia'
import { buscarIntervaloVersiculos, buscarLivroPorNome } from '../services/bibliaService'
import { resolveFontFamily } from '../utils/fontFamily'

/**
 * Abre o texto bíblico correspondente a um fragmento de referência (ex.: "Marcos 9.49-50").
 */
export default function ReferenciasParalelasDialog({ open, onClose, fragmento, fontFamily }) {
  const [loading, setLoading] = useState(false)
  const [blocos, setBlocos] = useState([])
  const [erro, setErro] = useState(null)
  const [zoom, setZoom] = useState(100)

  useEffect(() => {
    if (open) setZoom(100)
  }, [open])

  useEffect(() => {
    if (!open || !fragmento) {
      setBlocos([])
      setErro(null)
      setLoading(false)
      return
    }
    let cancelled = false
    const limpo = limparReferenciasParalelasARA(fragmento)

    ;(async () => {
      setLoading(true)
      setErro(null)
      setBlocos([])
      try {
        const refs = extrairReferenciaBiblica(limpo)
        if (!refs.length) {
          if (!cancelled) {
            setErro('Não foi possível interpretar esta referência.')
            setLoading(false)
          }
          return
        }
        const out = []
        for (const r of refs) {
          const livro = await buscarLivroPorNome(r.livroNome)
          if (!livro) {
            out.push({ tipo: 'erro', refLabel: r.textoOriginal, mensagem: 'Livro não encontrado' })
            continue
          }
          const vInicio = r.versiculoInicio || 1
          const vFim = r.versiculoFim != null ? r.versiculoFim : vInicio
          const { versiculos } = await buscarIntervaloVersiculos(livro.id, r.capitulo, vInicio, vFim)
          out.push({
            tipo: 'ok',
            refLabel: r.textoOriginal,
            livroNome: livro.nome,
            capitulo: r.capitulo,
            versiculos: versiculos || []
          })
        }
        if (!cancelled) {
          setBlocos(out)
        }
      } catch (e) {
        if (!cancelled) setErro(e?.message || 'Erro ao carregar texto.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, fragmento])

  const ff = resolveFontFamily(fontFamily)
  const extrairNumeroOriginalETexto = (texto, numeroFallback) => {
    const bruto = String(texto || '')
    // Captura número arábico e/ou sobrescrito no começo do versículo.
    const m = bruto.match(/^\s*(?:(\d+)\s*)?(?:([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*)?(.*)$/s)
    if (!m) {
      return { numero: String(numeroFallback ?? ''), textoLimpo: bruto.trim() }
    }
    const numeroArabico = (m[1] || '').trim()
    const numeroSobrescrito = (m[2] || '').trim()
    const restante = (m[3] || '').trim()
    return {
      numero: numeroSobrescrito || numeroArabico || String(numeroFallback ?? ''),
      textoLimpo: restante
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>Texto semelhante</DialogTitle>
      <DialogContent dividers>
        {fragmento && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            {fragmento}
          </Typography>
        )}
        {loading && (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={32} />
          </Box>
        )}
        {!loading && erro && <Alert severity="warning">{erro}</Alert>}
        {!loading &&
          !erro &&
          blocos.map((b, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              {b.tipo === 'erro' ? (
                <Typography variant="body2" color="error">
                  {b.refLabel}: {b.mensagem}
                </Typography>
              ) : (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {b.livroNome} {b.capitulo}
                  </Typography>
                  {(!b.versiculos || b.versiculos.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum versículo encontrado para este trecho.
                    </Typography>
                  ) : (
                    b.versiculos.map((v) => {
                      const { numero, textoLimpo } = extrairNumeroOriginalETexto(v.texto, v.numero)
                      return (
                        <Typography
                          key={v.numero}
                          variant="body2"
                          sx={{ mb: 1, fontFamily: ff, lineHeight: 1.55, fontSize: `${zoom}%` }}
                        >
                          <Box component="span" sx={{ fontWeight: 600, opacity: 0.85 }}>
                            {numero}{' '}
                          </Box>
                          {textoLimpo}
                        </Typography>
                      )
                    })
                  )}
                </>
              )}
            </Box>
          ))}
      </DialogContent>
      <Box
        sx={{
          px: 3,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Slider
          value={zoom}
          min={100}
          max={200}
          step={10}
          onChange={(_, value) => {
            if (typeof value === 'number') setZoom(value)
          }}
          sx={{ flex: 1 }}
        />
        <Typography variant="body2" sx={{ minWidth: 48, textAlign: 'right' }}>
          {zoom}%
        </Typography>
      </Box>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
