import { useMemo, useState } from 'react'
import { Box, Tooltip, Dialog, DialogTitle, DialogContent, IconButton, Typography } from '@mui/material'
import Close from '@mui/icons-material/Close'
import { obterResumoEscadaParaUI } from '../utils/escadaPlanoLeitura'
import { srcEscadaPorVariante } from '../utils/planoEscadaImagens'

const TITULOS = {
  bronze: 'Bronze na escada (a cada 4 vira prata)',
  prata: 'Prata na escada (a cada 4 vira ouro)',
  ouro: 'Ouro na escada (a cada 4 vira troféu)',
  trofeu: 'Troféu na escada (a cada 4 vira super troféu)',
  superTrofeu: 'Super troféu campeão',
}

function miniaturaPorVariante(v) {
  const trofeuAlto = v === 'trofeu' || v === 'superTrofeu'
  return {
    h: trofeuAlto ? { xs: 40, sm: 44 } : { xs: 36, sm: 40 },
    w: trofeuAlto ? { xs: 34, sm: 38 } : { xs: 36, sm: 40 },
  }
}

/**
 * Linha superior: miniaturas da esquerda para a direita (bronze → prata → ouro → troféu → super).
 * @param {string} [instanciaId] — escada é por plano; obrigatório no ecrã do plano.
 * @param {object | null} [previewResumo] — durante a fila de celebrações, reflete o passo atual (ex.: 4 bronzes antes da prata).
 */
export default function PlanoEscadaBarraMedalhas({ tick = 0, previewResumo = null, instanciaId = null }) {
  void tick
  const [prateleiraAberta, setPrateleiraAberta] = useState(false)
  const r = previewResumo ?? obterResumoEscadaParaUI(instanciaId || undefined)
  const totalPremios = r.restoBronze + r.restoPrata + r.restoOuro + r.restoTrofeu + r.superTrofeu
  const itensPrateleira = useMemo(
    () => [
      { id: 'bronze', variante: 'bronze', titulo: 'Bronze', qtd: r.restoBronze },
      { id: 'prata', variante: 'prata', titulo: 'Prata', qtd: r.restoPrata },
      { id: 'ouro', variante: 'ouro', titulo: 'Ouro', qtd: r.restoOuro },
      { id: 'trofeu', variante: 'trofeu', titulo: 'Troféu', qtd: r.restoTrofeu },
      { id: 'superTrofeu', variante: 'superTrofeu', titulo: 'Super troféu', qtd: r.superTrofeu },
    ],
    [r]
  )

  /** Ordem fixa de “peças” visíveis no tabuleiro da escada */
  const sequencia = []
  for (let i = 0; i < r.restoBronze; i++) sequencia.push({ k: `b${i}`, v: 'bronze' })
  for (let i = 0; i < r.restoPrata; i++) sequencia.push({ k: `p${i}`, v: 'prata' })
  for (let i = 0; i < r.restoOuro; i++) sequencia.push({ k: `o${i}`, v: 'ouro' })
  for (let i = 0; i < r.restoTrofeu; i++) sequencia.push({ k: `t${i}`, v: 'trofeu' })
  for (let i = 0; i < r.superTrofeu; i++) sequencia.push({ k: `s${i}`, v: 'superTrofeu' })

  if (sequencia.length === 0) return null

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 0.75,
          width: '100%',
          minHeight: { xs: 44, sm: 48 },
          py: 0.5,
          px: 0.5,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 3,
            bgcolor: 'action.disabledBackground',
          },
        }}
      >
        {sequencia.map((item) => {
          const src = srcEscadaPorVariante(item.v)
          const dim = miniaturaPorVariante(item.v)
          return (
            <Tooltip key={item.k} title={`${TITULOS[item.v] || item.v} (toque para abrir prateleira)`}>
              <Box
                component="button"
                type="button"
                onClick={() => setPrateleiraAberta(true)}
                sx={{
                  border: 0,
                  p: 0,
                  m: 0,
                  lineHeight: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt=""
                  sx={{
                    height: dim.h,
                    width: dim.w,
                    objectFit: 'contain',
                    flexShrink: 0,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                  }}
                />
              </Box>
            </Tooltip>
          )
        })}
      </Box>

      <Dialog open={prateleiraAberta} onClose={() => setPrateleiraAberta(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pr: 6 }}>
          Prateleira de prêmios
          <IconButton
            aria-label="Fechar prateleira"
            onClick={() => setPrateleiraAberta(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {totalPremios} prêmio(s) acumulado(s) na escada.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.2 }}>
            {itensPrateleira
              .filter((item) => item.qtd > 0)
              .map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 1.2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    component="img"
                    src={srcEscadaPorVariante(item.variante)}
                    alt={item.titulo}
                    sx={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.titulo}: {item.qtd}
                  </Typography>
                </Box>
              ))}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  )
}
