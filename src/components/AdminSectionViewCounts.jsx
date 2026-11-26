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
  salmos: 'Salmos',
  outras_cancoes: 'Outras canções',
  versiculo_do_dia: 'Versículo do dia',
  versiculos_do_dia: 'Arquivo diário',
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
 * Acessos por entrada autenticada, não quantidade de pessoas distintas.
 * Contas administrativas ficam fora dos contadores.
 */
export default function AdminSectionViewCounts({ keys, ehAdmin }) {
  const assinatura = JSON.stringify([...new Set((keys || []).filter(Boolean))])
  const keysArr = useMemo(() => JSON.parse(assinatura), [assinatura])
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
    setMetricas({})

    let cancelado = false
    const unsubs = []

    void (async () => {
      try {
        await loadFirebaseModules()
        if (cancelado) return
        const db = getFirebaseDatabase()
        if (!db) throw new Error('Banco indisponível')

        const atualizar = (key, campo, val) => {
          if (cancelado) return
          setMetricas((prev) => ({
            ...prev,
            [key]: { ...prev[key], [campo]: Number(val) || 0, [`${campo}Erro`]: false },
          }))
        }
        const falhou = (key, campo) => {
          if (cancelado) return
          setMetricas(prev => ({ ...prev, [key]: { ...prev[key], [`${campo}Erro`]: true } }))
        }

        for (const key of keysArr) {
          const rTotal = ref(db, `adminMetrics/sectionViews/total/${key}`)
          const rHoje = ref(db, `adminMetrics/sectionViews/daily/${dia}/${key}`)
          unsubs.push(
            onValue(rTotal, (snap) => {
              atualizar(key, 'total', snap.val())
            }, () => falhou(key, 'total'))
          )
          unsubs.push(
            onValue(rHoje, (snap) => {
              atualizar(key, 'hoje', snap.val())
            }, () => falhou(key, 'hoje'))
          )
        }
      } catch {
        if (!cancelado) setMetricas(Object.fromEntries(keysArr.map(key => [key, { hojeErro: true, totalErro: true }])))
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

  return <Box aria-label="Acessos registrados" sx={{ mt: .75, display: 'flex', flexWrap: 'wrap', gap: 1, minWidth: 0 }}>
    {keysArr.map(key => {
      const m = metricas[key] || {}
      const valor = campo => m[campo+'Erro'] ? 'Indisponível' : m[campo] == null ? '…' : formatarNumero(m[campo])
      return <Box key={key} sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: .25 }}>
        {LABEL_CURTO[key] && <Typography variant="caption" sx={{ fontWeight: 700 }}>{LABEL_CURTO[key]}</Typography>}
        <Tooltip title="Acessos de contas autenticadas: uma vez por conta, seção e entrada no dia. Administradores não entram na contagem. Não é uma contagem de pessoas únicas.">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: .75, minWidth: 0, color: '#fff176' }}>
            <VisibilityOutlined sx={{ fontSize: 16, flexShrink: 0 }} />
            <Typography component="span" variant="caption" sx={{ fontWeight: 800, fontSize: '.8rem' }}>Hoje: {valor('hoje')}</Typography>
            <Typography component="span" variant="caption" sx={{ fontWeight: 800, fontSize: '.8rem' }}>Total: {valor('total')}</Typography>
          </Box>
        </Tooltip>
        {(m.hojeErro || m.totalErro) && <Typography variant="caption" role="status">Falha ao consultar os acessos.</Typography>}
      </Box>
    })}
  </Box>
}
