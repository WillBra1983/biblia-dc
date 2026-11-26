import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

function dataTexto(valor) {
  if (!valor) return 'Não registrado'
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? 'Não registrado' : data.toLocaleString('pt-BR')
}

/** Todos os dados de uma conta permanecem juntos, inclusive em telas estreitas. */
export default function AdminUsuarioCard({ usuario: r, uidAtual, listaDoDia, ocupado, onGerir, onCopiar }) {
  const campos = [
    ['E-mail', r.email || 'Não informado'],
    ['Apelido no chat', r.profileHandle ? `@${r.profileHandle}` : 'Não informado'],
    ['Login', r.provedorLabel || r.signInProvider || 'Não informado'],
    ['Conta criada em', dataTexto(r.creationTime)],
    [listaDoDia ? 'Último acesso no dia' : 'Último acesso', dataTexto(listaDoDia
      ? r.acessoNoDiaLastAt : r.ultimoAcesso || r.lastAccessAt || r.lastSignInTime)],
  ]
  const protegida = r.uid === uidAtual || r.ehAdmin
  return <Paper component="article" variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere' }}>
    <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
      <Typography component="h2" sx={{ flex: '1 1 180px', minWidth: 0, fontSize: '1.1rem', fontWeight: 800 }}>
        {r.displayName || r.email || 'Conta sem nome'}
      </Typography>
      <Chip size="small" label={r.disabled ? 'Desativada' : 'Ativa'} color={r.disabled ? 'default' : 'success'} />
      {protegida && <Chip size="small" label={r.uid === uidAtual ? 'Você · Admin' : 'Admin'} />}
    </Stack>
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
      {campos.map(([label, valor]) => <Box key={label} sx={{ minWidth: 0 }}>
        <Typography component="dt" sx={{ fontSize: '.8rem', color: 'text.secondary', fontWeight: 700 }}>{label}</Typography>
        <Typography component="dd" sx={{ m: 0, fontSize: '.95rem', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{valor}</Typography>
      </Box>)}
      <Box sx={{ minWidth: 0 }}>
        <Typography component="dt" sx={{ fontSize: '.8rem', color: 'text.secondary', fontWeight: 700 }}>UID</Typography>
        <Typography component="dd" sx={{ m: 0, fontFamily: 'monospace', fontSize: '.85rem', overflowWrap: 'anywhere' }}>{r.uid}</Typography>
      </Box>
    </Box>
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1} sx={{ mt: 2 }}>
      <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopiar(r.uid)} sx={{ minHeight: 44 }}>Copiar UID</Button>
      {!protegida && <>
        <Button size="small" variant="outlined" disabled={ocupado} color={r.disabled ? 'success' : 'warning'}
          onClick={() => onGerir(r.uid, r.disabled ? 'reativar' : 'desativar', r.disabled ? 'Reativar conta' : 'Desativar conta')}
          sx={{ minHeight: 44 }}>{r.disabled ? 'Reativar conta' : 'Desativar conta'}</Button>
        <Button size="small" color="error" disabled={ocupado} onClick={() => onGerir(r.uid, 'apagar', 'Apagar conta')} sx={{ minHeight: 44 }}>Apagar conta</Button>
      </>}
    </Stack>
  </Paper>
}
