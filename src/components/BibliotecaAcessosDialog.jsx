import { useEffect, useState } from 'react'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography, Divider } from '@mui/material'
import { listarAcessosBibliotecaAdmin } from '../services/bibliotecaLivrosService'

const dataLocal = (data) => new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const modalidades = { amostra_percentual: 'Amostra por percentual', promocao_tempo: 'Promoção por tempo', amostra: 'Amostra gratuita', comprado: 'Leitura com acesso completo', detalhes: 'Detalhes do livro' }

export default function BibliotecaAcessosDialog({ aberto, livros, onClose }) {
  const [inicio, setInicio] = useState(() => dataLocal(new Date(Date.now() - 29 * 86400000)))
  const [fim, setFim] = useState(() => dataLocal(new Date()))
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  useEffect(() => {
    if (!aberto) return
    let ativo = true
    const a = new Date(`${inicio}T00:00:00`).getTime()
    const b = new Date(`${fim}T23:59:59.999`).getTime()
    if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) { setErro('Escolha um período válido.'); setDados(null); setCarregando(false); return }
    setCarregando(true); setErro(''); setDados(null)
    listarAcessosBibliotecaAdmin(a, b).then((resultado) => { if (ativo) setDados(resultado) }).catch(() => { if (ativo) setErro('Não foi possível consultar os acessos. Confira se as funções e regras foram publicadas.') }).finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [aberto, inicio, fim])
  const eventos = dados?.eventos || []
  const contas = [...new Set(eventos.map((item) => item.uid))]
  return <Dialog open={aberto} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>Acessos à biblioteca</DialogTitle>
    <DialogContent>
      <Stack direction="row" spacing={2} sx={{ mt: 1, mb: 2 }}><TextField label="De" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><TextField label="Até" type="date" value={fim} onChange={(e) => setFim(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Stack>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Aberturas registradas, não confirmação de leitura. Os acessos administrativos e os arquivos da biblioteca pessoal não entram nesta lista. Consultas de até 93 dias.</Typography>
      {erro && <Alert severity="warning">{erro}</Alert>}
      {carregando && <CircularProgress size={28} />}
      {dados && <>
        <Typography sx={{ mb: 2 }}>{contas.length} pessoas · {eventos.filter((e) => e.tipo === 'entrada').length} entradas · {eventos.filter((e) => e.tipo === 'leitura').length} aberturas para leitura</Typography>
        {dados.limitado && <Alert severity="info">Mostrando os 5.000 registros mais recentes. Reduza o período para consultar menos resultados.</Alert>}
        {!eventos.length && <Typography>Nenhum acesso registrado neste período.</Typography>}
        {contas.map((uid) => {
          const itens = eventos.filter((e) => e.uid === uid)
          const grupos = new Map()
          itens.filter((e) => e.livroId).forEach((e) => { const chave = `${e.livroId}:${e.modalidade}`; const grupo = grupos.get(chave) || { ...e, quantidade: 0 }; grupo.quantidade++; grupo.criadoEm = Math.max(grupo.criadoEm, e.criadoEm); grupos.set(chave, grupo) })
          return <Stack key={uid} spacing={1} sx={{ py: 2 }}>
            <Typography fontWeight={700}>{dados.usuarios?.[uid] || uid}</Typography>
            <Typography variant="body2">{itens.filter((e) => e.tipo === 'entrada').length} entradas · Último acesso: {new Date(Math.max(...itens.map((e) => e.criadoEm))).toLocaleString('pt-BR')}</Typography>
            {[...grupos.values()].map((e) => <Typography variant="body2" key={`${e.livroId}:${e.modalidade}`}>{livros.find((l) => l.id === e.livroId)?.titulo || e.livroId} — {modalidades[e.modalidade] || e.modalidade} · {e.quantidade} abertura(s) · {new Date(e.criadoEm).toLocaleString('pt-BR')}</Typography>)}
            <Divider />
          </Stack>
        })}
      </>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Fechar</Button></DialogActions>
  </Dialog>
}
