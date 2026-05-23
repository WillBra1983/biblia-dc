import { useMemo } from 'react'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined'
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'

/**
 * Pequeno indicador de "sincronizado com a sua conta" — exibido em telas
 * cujos dados (plano de leitura, versículos marcados) sobem para o RTDB
 * automaticamente quando o usuário está autenticado e o Firebase está
 * configurado. Em outras situações mostra um aviso sutil de que só fica
 * neste aparelho.
 *
 * @param {object} props
 * @param {boolean} [props.featureEnabled=true] — algumas rotas têm flag
 *   própria (ex.: `VERSICULOS_MARCADOS_CLOUD_SYNC_ENABLED`). Quando `false`
 *   o badge cai automaticamente para “somente neste aparelho”.
 * @param {string} [props.recurso="dados"] — usado na tooltip e no texto curto.
 */
export default function CloudSyncBadge({ featureEnabled = true, recurso = 'dados' }) {
  const { user, isConfigured } = useFirebaseAuth()

  /** Sincronizando quando: Firebase configurado + usuário logado + feature ON. */
  const ativo = useMemo(
    () => Boolean(isConfigured && user?.uid && featureEnabled),
    [isConfigured, user?.uid, featureEnabled]
  )

  const label = ativo ? 'Sincronizado' : 'Apenas neste aparelho'
  const tooltip = ativo
    ? `Seus ${recurso} estão sincronizados com a sua conta e disponíveis em outros aparelhos que entrarem com o mesmo e-mail.`
    : user?.uid
      ? `Seus ${recurso} ficam guardados neste aparelho. A sincronização entre aparelhos está temporariamente desativada para este recurso.`
      : `Entre com a sua conta para que seus ${recurso} fiquem disponíveis em outros aparelhos.`

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        size="small"
        variant="outlined"
        color={ativo ? 'success' : 'default'}
        icon={ativo ? <CloudDoneOutlinedIcon /> : <CloudOffOutlinedIcon />}
        label={label}
        sx={{
          fontWeight: 600,
          // Mantém altura compacta para encaixar ao lado do título sem desalinhar.
          height: 26,
          '& .MuiChip-icon': { ml: 0.5, fontSize: 16 },
          '& .MuiChip-label': { px: 1 }
        }}
      />
    </Tooltip>
  )
}
