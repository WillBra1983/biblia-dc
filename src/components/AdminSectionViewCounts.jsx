import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { ref, onValue } from 'firebase/database'
import { loadFirebaseModules, getFirebaseDatabase } from '../config/firebase'
import { dataMetricaHojeBr } from '../utils/sectionViewKeys'

const LABEL_CURTO = {
  chat: 'Chat',
  config_notificacoes: 'Config',
  admin_usuarios: 'Contas',
  admin_notificar: 'Aviso',
  hinario_letra: 'Letra',
  hinario_cifras: 'Cifras',
  confissao: 'CFW',
  catecismo_maior: 'Maior',
  catecismo_breve: 'Breve',
}

function formatarNumero(n) {
  const v = Number(n) || 0
  try {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  } catch {
    return String(v)
  }
}

/**
 * Dois olhos por chave: primeiro = visualizações hoje (America/Sao_Paulo),
 * segundo = total. Só montar quando `ehAdmin` for true.
 */
export default function AdminSectionViewCounts({ keys, ehAdmin }) {
  const keysArr = useMemo(() => [...new Set((keys || []).filter(Boolean))], [keys])
  const [dia, setDia] = useState(() => dataMetricaHojeBr())
  const [metricas, setMetricas] = useState(() => ({}))

  useEffect(() => {
    const t = setInterval(() => {
      const d = dataMetricaHojeBr()
      setDia((prev) => (prev !== d ? d : prev))
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!ehAdmin || keysArr.length === 0) return undefined

    let cancelado = false
    const unsubs = []

    void (async () => {
      try {
        await loadFirebaseModules()
        if (cancelado) return
        const db = getFirebaseDatabase()
        if (!db) return

        const atualizar = (key, campo, val) => {
          setMetricas((prev) => ({
            ...prev,
            [key]: { ...prev[key], [campo]: Number(val) || 0 },
          }))
        }

        for (const key of keysArr) {
          const rTotal = ref(db, `adminMetrics/sectionViews/total/${key}`)
          const rHoje = ref(db, `adminMetrics/sectionViews/daily/${dia}/${key}`)
          unsubs.push(
            onValue(rTotal, (snap) => {
              atualizar(key, 'total', snap.val())
            })
          )
          unsubs.push(
            onValue(rHoje, (snap) => {
              atualizar(key, 'hoje', snap.val())
            })
          )
        }
      } catch {
        /* ignore */
      }
    })()

    return () => {
      cancelado = true
      unsubs.forEach((u) => {
        try {
          u()
        } catch {
          /* ignore */
        }
      })
    }
  }, [ehAdmin, keysArr, dia])

  if (!ehAdmin || keysArr.length === 0) return null

  return (
    <Box
      sx={{
        mt: 0.75,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        rowGap: 0.5,
      }}
    >
      {keysArr.map((key) => {
        const m = metricas[key] || {}
        const hoje = m.hoje ?? 0
        const total = m.total ?? 0
        const rotulo = LABEL_CURTO[key] || ''
        return (
          <Box
            key={`${key}-${dia}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              flexWrap: 'wrap',
            }}
          >
            {rotulo ? (
              <Typography component="span" variant="caption" sx={{ opacity: 0.75, fontWeight: 700, mr: 0.25 }}>
                {rotulo}
              </Typography>
            ) : null}
            <Tooltip title="Visualizações hoje (entrada única por utilizador por rota)">
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.15,
                  opacity: 0.92,
                }}
              >
                <VisibilityOutlined sx={{ fontSize: 15, verticalAlign: 'middle', color: '#fff176 !important', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))' }} />
                <Typography component="span" variant="caption" sx={{ color: '#fff176 !important', fontWeight: 800, fontSize: '0.72rem', textShadow: '0 1px 1px rgba(0,0,0,.65) !important' }}>
                  {formatarNumero(hoje)}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip title="Total de visualizações (todas as entradas)">
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.15,
                  opacity: 0.92,
                }}
              >
                <VisibilityOutlined sx={{ fontSize: 15, verticalAlign: 'middle', color: '#fff176 !important', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.5))' }} />
                <Typography component="span" variant="caption" sx={{ color: '#fff176 !important', fontWeight: 800, fontSize: '0.72rem', textShadow: '0 1px 1px rgba(0,0,0,.65) !important' }}>
                  {formatarNumero(total)}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        )
      })}
    </Box>
  )
}
