import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  LinearProgress,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Stack,
} from '@mui/material'
import { useApp } from '../contexts/AppContext'
import { useNavigate } from 'react-router-dom'
import { PLANOS, PLANOS_NOVO_CADASTRO, PLANO_BIBLIA_COMPLETA_ID } from '../data/planos'
import Delete from '@mui/icons-material/Delete'
import { getGlassCardStyles } from '../utils/glassCardStyles'
import PlanoPinchZoomShell from '../components/PlanoPinchZoomShell'
import CloudSyncBadge from '../components/CloudSyncBadge'
import { sxFundoVerdePagina } from '../utils/fundoVerdePagina'
import {
  migrarLegadoSeNecessario,
  listarInstancias,
  obterInstancia,
  obterTemplate,
  definirInstanciaAtiva,
  criarInstancia,
  atualizarPrazoInstancia,
  limparProgressoInstancia,
  removerInstancia,
  obterProgressoInstancia,
  calcularPrevisaoInicial,
  MAX_PLANOS_ATIVOS,
  MAX_DIAS_PLANO,
  obterMetricasResumo,
} from '../utils/planoLeituraUsuario'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { sincronizarPlanoLeituraAposAlteracaoDestrutiva } from '../services/planoLeituraCloudSync'
import { adicionarDiasIso, diaCivilAmericaSaoPaulo, diferencaDiasIso } from '../utils/fusoHorarioBrasil'
import { confirmarAsync } from '../utils/uiDialogs'

export default function PlanoLeitura() {
  const primeiroAcessoRef = useRef(false)
  const { planoLeitura, setPlanoLeitura, isDarkMode } = useApp()
  const { user } = useFirebaseAuth()
  const navigate = useNavigate()
  const [atualizar, setAtualizar] = useState(0)
  const [dialogLimpar, setDialogLimpar] = useState({ aberto: false, instanciaId: null })
  const [erroConfiguracao, setErroConfiguracao] = useState('')
  const [dialogNovo, setDialogNovo] = useState({
    instanciaId: null,
    aberto: false,
    templateId: PLANO_BIBLIA_COMPLETA_ID,
    dataInicio: diaCivilAmericaSaoPaulo(),
    dataFim: '',
  })

  useEffect(() => {
    migrarLegadoSeNecessario()
    setAtualizar((x) => x + 1)
  }, [])

  useEffect(() => {
    const refresh = () => setAtualizar((x) => x + 1)
    window.addEventListener('salvation-plano-leitura-atualizado', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('salvation-plano-leitura-atualizado', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  const instancias = useMemo(() => {
    void atualizar
    return listarInstancias()
  }, [atualizar])

  const abrirNovoPlano = () => {
    setErroConfiguracao('')
    const padrao = PLANOS_NOVO_CADASTRO[0]
    const padraoId = padrao?.id ?? PLANO_BIBLIA_COMPLETA_ID
    const tid = PLANOS_NOVO_CADASTRO.some((p) => p.id === dialogNovo.templateId)
      ? dialogNovo.templateId
      : padraoId
    const t = obterTemplate(tid) || padrao || PLANOS[0]
    const inicio = dialogNovo.dataInicio || diaCivilAmericaSaoPaulo()
    const fimDefault =
      t.diasTotais >= 365
        ? adicionarDiasIso(inicio, 364)
        : adicionarDiasIso(inicio, Math.max(0, t.diasTotais - 1))
    setDialogNovo((d) => ({
      ...d,
      aberto: true,
      instanciaId: null,
      templateId: t?.id ?? PLANO_BIBLIA_COMPLETA_ID,
      dataInicio: inicio,
      dataFim: d.dataFim || fimDefault,
    }))
  }

  const previa = useMemo(() => {
    if (!dialogNovo.aberto) return null
    return calcularPrevisaoInicial(dialogNovo.templateId, dialogNovo.dataInicio, dialogNovo.dataFim)
  }, [dialogNovo.aberto, dialogNovo.templateId, dialogNovo.dataInicio, dialogNovo.dataFim])

  const templateSelecionadoNovo = useMemo(
    () => obterTemplate(dialogNovo.templateId),
    [dialogNovo.templateId]
  )

  const dataFimMaxima = useMemo(
    () => adicionarDiasIso(dialogNovo.dataInicio || diaCivilAmericaSaoPaulo(), MAX_DIAS_PLANO - 1),
    [dialogNovo.dataInicio]
  )

  useEffect(() => {
    if (!atualizar || instancias.length || primeiroAcessoRef.current) return
    primeiroAcessoRef.current = true
    abrirNovoPlano()
  }, [atualizar, instancias.length])

  const confirmarNovoPlano = () => {
    if (!previa?.valido) return
    const r = dialogNovo.instanciaId ? atualizarPrazoInstancia(dialogNovo.instanciaId, dialogNovo.dataFim) : criarInstancia({
      templateId: dialogNovo.templateId,
      dataInicio: dialogNovo.dataInicio,
      dataFim: dialogNovo.dataFim,
    })
    if (!r.ok) { setErroConfiguracao(r.erro || 'Não foi possível salvar seu plano.'); return }
    const inst = r.instancia
    setPlanoLeitura((prev) => ({
      ...prev,
      planoAtual: inst.templateId,
      instanciaAtivaId: inst.id,
      dataInicio: inst.dataInicio,
      ultimaLeitura: new Date().toISOString(),
    }))
    setDialogNovo((d) => ({ ...d, aberto: false }))
    setAtualizar((x) => x + 1)
    navigate(`/plano-leitura-biblia?id=${encodeURIComponent(inst.id)}`)
  }

  const continuarInstancia = (id) => {
    definirInstanciaAtiva(id)
    const inst = obterInstancia(id)
    if (inst) {
      setPlanoLeitura((prev) => ({
        ...prev,
        planoAtual: inst.templateId,
        instanciaAtivaId: inst.id,
      }))
    }
    navigate(`/plano-leitura-biblia?id=${encodeURIComponent(id)}`)
  }

  const limparPlano = async (instanciaId) => {
    limparProgressoInstancia(instanciaId)
    setDialogLimpar({ aberto: false, instanciaId: null })
    setAtualizar((x) => x + 1)
    if (user?.uid) {
      try {
        await sincronizarPlanoLeituraAposAlteracaoDestrutiva(user.uid)
      } catch {
        /* ignore */
      }
    }
  }

  const excluirInstancia = async (instanciaId) => {
    const instancia = obterInstancia(instanciaId)
    if (!instancia) return
    const confirmado = await confirmarAsync({
      titulo: 'Excluir plano de leitura?',
      mensagem: `O plano “${obterTemplate(instancia.templateId)?.titulo || 'Plano de leitura'}” será removido, junto com seu progresso e histórico neste plano. Esta ação não pode ser desfeita.`,
      labelOk: 'Excluir plano',
      labelCancelar: 'Cancelar',
      destrutivo: true,
    })
    if (!confirmado) return
    removerInstancia(instanciaId)
    setAtualizar((x) => x + 1)
    const restantes = listarInstancias()
    if (restantes[0]) {
      definirInstanciaAtiva(restantes[0].id)
      setPlanoLeitura((prev) => ({
        ...prev,
        instanciaAtivaId: restantes[0].id,
        planoAtual: restantes[0].templateId,
      }))
    } else {
      setPlanoLeitura((prev) => ({
        ...prev,
        instanciaAtivaId: null,
        planoAtual: null,
      }))
    }
    if (user?.uid) {
      try {
        await sincronizarPlanoLeituraAposAlteracaoDestrutiva(user.uid)
      } catch {
        /* ignore */
      }
    }
  }

  const renderInstancia = (inst) => {
    const t = obterTemplate(inst.templateId)
    if (!t) return null
    const { pct } = obterProgressoInstancia(inst.id)
    const m = obterMetricasResumo(inst.id)
    const ativo = inst.id === planoLeitura?.instanciaAtivaId

    return (
      <Paper
        key={inst.id}
        sx={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: 1,
          bgcolor: isDarkMode ? 'grey.900' : 'grey.100',
          color: isDarkMode ? 'white' : 'grey.900',
          p: { xs: 2, sm: 3 },
          minWidth: 0,
          overflow: 'hidden',
          border: ativo ? '2px solid' : undefined,
          borderColor: 'primary.main',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                color: isDarkMode ? 'primary.main' : 'primary.dark',
                fontWeight: 500,
                overflowWrap: 'break-word',
              }}
            >
              {t.titulo}
            </Typography>
            <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.400' : 'grey.800', mt: 0.5 }}>
              {inst.dataInicio} → {inst.dataFim}
            </Typography>
            {m && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip size="small" label={`${m.diasLeitura} dias de leitura`} />
                <Chip size="small" color="primary" variant="outlined" label={`${m.diasConsecutivos} consecutivos`} />
                <Chip
                  size="small"
                  color={m.emDia ? 'success' : 'warning'}
                  label={m.emDia ? 'Leitura em dia' : 'Atrasado no ritmo'}
                />
              </Box>
            )}
          </Box>
          <IconButton
            size="small"
            color="error"
            onClick={() => excluirInstancia(inst.id)}
            aria-label="Remover plano"
          >
            <Delete />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ color: isDarkMode ? 'grey.400' : 'grey.700', mt: 1 }}>
          Progresso: {Math.round(pct)}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            mt: 0.5,
            height: 8,
            borderRadius: 4,
            bgcolor: isDarkMode ? 'grey.800' : 'grey.300',
            '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
          }}
        />

        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button variant="contained" fullWidth onClick={() => continuarInstancia(inst.id)}>
            {obterProgressoInstancia(inst.id).lidos > 0 ? 'Continuar plano' : 'Abrir plano'}
          </Button>
          <Button variant="outlined" fullWidth onClick={() => setDialogNovo({ aberto: true, instanciaId: inst.id, templateId: inst.templateId, dataInicio: inst.dataInicio, dataFim: inst.dataFim })}>Alterar prazo e ritmo de leitura</Button>
          {obterProgressoInstancia(inst.id).lidos > 0 && (
            <Button size="small" color="warning" onClick={() => setDialogLimpar({ aberto: true, instanciaId: inst.id })}>
              Limpar progresso deste plano
            </Button>
          )}
        </Box>
      </Paper>
    )
  }

  useEffect(() => {
    if (!dialogLimpar.aberto) return
    const handlePopState = () => {
      setDialogLimpar({ aberto: false, instanciaId: null })
      window.history.pushState(null, '')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [dialogLimpar])

  return (
    <Box sx={{ ...sxFundoVerdePagina, px: { xs: 1, sm: 3 } }}>
    <Container maxWidth="lg" sx={{ py: 0, minWidth: 0, overflowX: 'hidden', boxSizing: 'border-box', px: 0 }}>
      <PlanoPinchZoomShell>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' },
            textAlign: 'center',
            color: '#fff',
            mb: 2,
          }}
        >
          Plano de leitura bíblica
        </Typography>

        {/* Mostra ao usuário o status de sincronização — o plano já sobe para o
            RTDB automaticamente (`planoLeituraCloudSync`) quando logado. */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <CloudSyncBadge recurso="plano de leitura" />
        </Box>

        <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.85)' }}>
          Um plano ativo · prazo personalizável (até 1 ano)
        </Typography>

        <Grid container spacing={2} sx={{ minWidth: 0, width: '100%' }}>
          {instancias.map((i) => (
            <Grid item xs={12} key={i.id} sx={{ minWidth: 0, maxWidth: '100%' }}>
              {renderInstancia(i)}
            </Grid>
          ))}
        </Grid>

        {instancias.length < MAX_PLANOS_ATIVOS && (
          <Paper
            sx={{
              mt: 2,
              p: 2,
              ...getGlassCardStyles('linear-gradient(135deg, rgba(25, 118, 210, 0.85) 0%, rgba(21, 101, 192, 0.85) 100%)', {
                hover: false,
                borderRadius: 2,
              }),
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
              Iniciar plano
            </Typography>
            <Button variant="contained" color="inherit" onClick={abrirNovoPlano}>
              Definir início e prazo
            </Button>
          </Paper>
        )}
      </PlanoPinchZoomShell>

      <Dialog open={dialogNovo.aberto} onClose={() => setDialogNovo((d) => ({ ...d, aberto: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{dialogNovo.instanciaId ? 'Ajustar seu plano' : 'Configure seu primeiro plano'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {erroConfiguracao && <Alert severity="error">{erroConfiguracao}</Alert>}
          <Alert severity="info">{dialogNovo.instanciaId ? 'Altere o prazo sem perder capítulos lidos, histórico ou conquistas. A data de início permanece a mesma.' : 'Escolha quando começar e em quanto tempo quer concluir. Você poderá ajustar o prazo depois.'}</Alert>
          {PLANOS_NOVO_CADASTRO.length > 1 && (
            <TextField
              select
              label="Modelo"
              disabled={Boolean(dialogNovo.instanciaId)}
              value={dialogNovo.templateId}
              onChange={(e) => {
                const id = e.target.value
                const t = obterTemplate(id)
                const inicio = dialogNovo.dataInicio
                const fim =
                  t && t.diasTotais
                    ? adicionarDiasIso(inicio, Math.max(0, Number(t.diasTotais) - 1))
                    : adicionarDiasIso(inicio, 364)
                setDialogNovo((d) => ({ ...d, templateId: id, dataFim: fim }))
              }}
              SelectProps={{ native: true }}
              fullWidth
            >
              {PLANOS_NOVO_CADASTRO.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}
                </option>
              ))}
            </TextField>
          )}
          <TextField
            label="Início"
            disabled={Boolean(dialogNovo.instanciaId)}
            type="date"
            value={dialogNovo.dataInicio}
            onChange={(e) => {
              const inicio = e.target.value
              const t = obterTemplate(dialogNovo.templateId)
              const fimSugerido =
                t && t.diasTotais
                  ? adicionarDiasIso(inicio, Math.max(0, Number(t.diasTotais) - 1))
                  : adicionarDiasIso(inicio, 364)
              const fimMax = adicionarDiasIso(inicio, MAX_DIAS_PLANO - 1)
              setDialogNovo((d) => {
                let fim = d.dataFim
                if (!fim || diferencaDiasIso(inicio, fim) < 0 || diferencaDiasIso(fim, fimMax) < 0) {
                  fim = fimSugerido
                }
                return { ...d, dataInicio: inicio, dataFim: fim }
              })
            }}
            InputLabelProps={{ shrink: true }}
          />
          <Typography fontWeight={700}>Escolha um prazo ou personalize a data</Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
            {[90, 180, 270, 365].map((dias) => <Button variant={diferencaDiasIso(dialogNovo.dataInicio, dialogNovo.dataFim) === dias - 1 ? 'contained' : 'outlined'} key={dias} onClick={() => setDialogNovo((d) => ({ ...d, dataFim: adicionarDiasIso(d.dataInicio, dias - 1) }))}>{dias} dias</Button>)}
          </Stack>
          <TextField
            label="Data de conclusão"
            type="date"
            value={dialogNovo.dataFim}
            onChange={(e) => setDialogNovo((d) => ({ ...d, dataFim: e.target.value }))}
            helperText={
              templateSelecionadoNovo?.diasTotais
                ? `Sugestão do modelo: ${templateSelecionadoNovo.diasTotais} dias — você pode encurtar o prazo.`
                : 'Escolha a data final do plano.'
            }
            inputProps={{
              min: dialogNovo.dataInicio,
              max: dataFimMaxima,
            }}
            InputLabelProps={{ shrink: true }}
          />
          {previa && previa.valido && (
            <Alert severity="success">
              {previa.dias} dias · ~{previa.capitulosPorDia.toFixed(2)} capítulos/dia · {previa.capitulosTotal}{' '}
              capítulos
            </Alert>
          )}
          {previa && !previa.valido && <Alert severity="error">{previa.erro}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogNovo((d) => ({ ...d, aberto: false }))}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarNovoPlano} disabled={!previa?.valido}>
            {dialogNovo.instanciaId ? 'Salvar alterações' : 'Iniciar meu plano'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogLimpar.aberto} onClose={() => setDialogLimpar({ aberto: false, instanciaId: null })}>
        <DialogTitle>Limpar leituras</DialogTitle>
        <DialogContent>
          <Typography>
            Limpar todo o progresso deste plano? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogLimpar({ aberto: false, instanciaId: null })}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => limparPlano(dialogLimpar.instanciaId)}>
            Limpar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </Box>
  )
}
