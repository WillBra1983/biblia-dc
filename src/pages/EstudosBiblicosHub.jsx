import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useFirebaseAuth } from '../contexts/FirebaseAuthContext'
import { useApp } from '../contexts/AppContext'
import { resolveFontFamily } from '../utils/fontFamily'
import { readingLineHeightToCss } from '../utils/readingLineHeight'
import EstudosBiblicosListaLinha from '../components/EstudosBiblicosListaLinha'
import {
  listarMeusEstudos,
  listarEstudosSalvos,
  listarModulos,
  buscarEstudosPublicosPorTema,
  correspondeBuscaTemaEstudos,
  obterEstudoBiblico,
  estudoEstaMarcadoComoPublico,
  estudoBiblicoCorrespondeBuscaPublica,
  deveAparecerNaBuscaTemaEstudosBiblicos,
  apagarEstudoAutor
} from '../services/bibliaEstudosService'

export default function EstudosBiblicosHub() {
  const navigate = useNavigate()
  const { user, isConfigured } = useFirebaseAuth()
  const { fontSize, fontFamily, lineHeight } = useApp()
  const ff = resolveFontFamily(fontFamily)
  const lh = readingLineHeightToCss(lineHeight)

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [meus, setMeus] = useState([])
  const [salvos, setSalvos] = useState([])
  const [modulos, setModulos] = useState([])
  const [buscaTema, setBuscaTema] = useState('')
  const [publicos, setPublicos] = useState([])
  const [publicSearchBusy, setPublicSearchBusy] = useState(false)
  const [publicSearchErr, setPublicSearchErr] = useState(null)
  const [apagarId, setApagarId] = useState(null)

  const carregar = useCallback(async () => {
    if (!user?.uid) {
      setMeus([])
      setSalvos([])
      setModulos([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const [m, s, mods] = await Promise.all([
        listarMeusEstudos(user.uid),
        listarEstudosSalvos(user.uid),
        listarModulos(user.uid)
      ])
      setMeus(m.map((row) => ({ ...row, _tipo: 'meu' })))
      setSalvos(s.map((row) => ({ ...row, _tipo: 'salvo' })))
      setModulos(mods)
    } catch (e) {
      setErr(e?.message || 'Não foi possível carregar os estudos.')
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    carregar()
  }, [carregar])

  const buscaNorm = useMemo(
    () =>
      String(buscaTema || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim(),
    [buscaTema]
  )

  const filtraPorTema = useCallback(
    (row) => {
      if (buscaNorm.length < 2) return true
      const hay = `${row?.tema || ''} ${row?.referenciaCompacta || ''} ${row?.authorName || ''}`
      return correspondeBuscaTemaEstudos(hay, buscaNorm)
    },
    [buscaNorm]
  )

  const salvosFiltrados = useMemo(() => salvos.filter(filtraPorTema), [salvos, filtraPorTema])
  const meusFiltrados = useMemo(() => meus.filter(filtraPorTema), [meus, filtraPorTema])

  const meusFiltradosPorModulo = useMemo(() => {
    const idsValidos = new Set(modulos.map((x) => x.id))
    const sem = []
    const porId = new Map()
    modulos.forEach((mo) => porId.set(mo.id, []))
    for (const row of meusFiltrados) {
      const mid = row.moduleId && idsValidos.has(row.moduleId) ? row.moduleId : null
      if (!mid) {
        sem.push(row)
        continue
      }
      if (!porId.has(mid)) porId.set(mid, [])
      porId.get(mid).push(row)
    }
    return { sem, porId }
  }, [meusFiltrados, modulos])

  useEffect(() => {
    let cancel = false
    const t = setTimeout(async () => {
      if (buscaNorm.length < 2) {
        if (!cancel) {
          setPublicos([])
          setPublicSearchBusy(false)
          setPublicSearchErr(null)
        }
        return
      }
      setPublicSearchBusy(true)
      setPublicSearchErr(null)
      try {
        const rows = await buscarEstudosPublicosPorTema(buscaNorm, 30)
        if (cancel) return
        const apiIds = new Set(rows.map((r) => r.id))
        /**
         * Usar `meus` (não só os já filtrados por tema): o critério da lista inclui só tema/ref/autor,
         * mas a pesquisa pública também usa introdução/citações — senão o merge não tentava o documento certo.
         * Limite para não disparar dezenas de leituras por tecla.
         */
        const candidatos = meus.filter((row) => !apiIds.has(row.id)).slice(0, 40)
        const extras = await Promise.all(
          candidatos.map(async (row) => {
            try {
              const s = await obterEstudoBiblico(row.id)
              if (!s || !deveAparecerNaBuscaTemaEstudosBiblicos(s)) return null
              if (!estudoEstaMarcadoComoPublico(s)) return null
              if (!estudoBiblicoCorrespondeBuscaPublica(s, buscaNorm)) return null
              return {
                id: s.id,
                tema: String(s.tema || ''),
                referenciaCompacta: String(s.referenciaCompacta || ''),
                authorName: String(s.authorName || ''),
                updatedAt: Number(s.updatedAt || 0),
                _tipo: 'publico'
              }
            } catch {
              return null
            }
          })
        )
        const merged = [...rows, ...extras.filter(Boolean)]
        const seen = new Set()
        const deduped = []
        for (const r of merged) {
          if (seen.has(r.id)) continue
          seen.add(r.id)
          deduped.push(r)
        }
        if (!cancel) {
          setPublicos(deduped)
          setPublicSearchErr(null)
        }
      } catch (e) {
        if (!cancel) {
          setPublicos([])
          setPublicSearchErr(e?.message || 'Não foi possível concluir a pesquisa pública.')
        }
      } finally {
        if (!cancel) setPublicSearchBusy(false)
      }
    }, 250)
    return () => {
      cancel = true
      clearTimeout(t)
    }
  }, [buscaNorm, meus])

  const totalLista = salvosFiltrados.length + meusFiltrados.length

  if (!isConfigured) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2 }}>
        <Alert severity="warning">Conta e base de dados não estão configuradas neste ambiente.</Alert>
      </Box>
    )
  }

  if (user === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    return (
      <Box sx={{ px: { xs: 1, sm: 2 }, py: 2, maxWidth: 520, mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Faça login para criar estudos e abrir os que guardou.
        </Typography>
        <Typography component={RouterLink} to="/chat" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
          Ir para Mensagens e entrar
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: 2,
        pb: 6,
        maxWidth: 960,
        width: '100%',
        mx: 'auto',
        color: 'text.primary',
        bgcolor: 'background.default',
        fontSize: `${fontSize || 100}%`,
        fontFamily: ff,
        lineHeight: lh
      }}
    >
      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
        <Button
          component={RouterLink}
          to="/estudos-biblicos/gerir"
          variant="contained"
          endIcon={<AddCircleOutlineIcon />}
          sx={{
            minHeight: 44,
            px: 2,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 800,
            boxShadow: '0 8px 18px rgba(0, 77, 64, 0.18)'
          }}
        >
          Administrar
        </Button>
      </Box>

      <TextField
        fullWidth
        size="small"
        label="Buscar estudos"
        placeholder="Digite o tema — mínimo 2 letras"
        helperText="Mínimo 2 letras. Inclui estudos públicos abaixo quando aplicável."
        value={buscaTema}
        onChange={(e) => setBuscaTema(e.target.value)}
        sx={{ mb: 2 }}
        inputProps={{ 'aria-label': 'Buscar estudos por tema', autoComplete: 'off' }}
        FormHelperTextProps={{ sx: { maxWidth: '100%' } }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box>
          {salvosFiltrados.length > 0 && (
            <Box sx={{ mb: salvosFiltrados.length && meusFiltrados.length ? 3 : 0 }}>
              <EstudosBiblicosListaLinha
                rows={salvosFiltrados}
                navigate={navigate}
                setApagarId={() => {}}
                mostrarAcoesAutor={false}
              />
            </Box>
          )}

          {meusFiltrados.length > 0 && (
            <Box>
              {modulos.map((mo) => {
                const rows = meusFiltradosPorModulo.porId.get(mo.id) || []
                if (!rows.length) return null
                return (
                  <Box key={mo.id} sx={{ mb: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: 'text.primary', mb: 0.75, fontWeight: 700, opacity: 0.95 }}
                    >
                      {mo.nome}
                    </Typography>
                    <EstudosBiblicosListaLinha
                      rows={rows}
                      navigate={navigate}
                      setApagarId={setApagarId}
                      mostrarAcoesAutor
                    />
                  </Box>
                )
              })}
              {meusFiltradosPorModulo.sem.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: 'text.primary', mb: 0.75, fontWeight: 700, opacity: 0.95 }}
                  >
                    Sem módulo
                  </Typography>
                  <EstudosBiblicosListaLinha
                    rows={meusFiltradosPorModulo.sem}
                    navigate={navigate}
                    setApagarId={setApagarId}
                    mostrarAcoesAutor
                  />
                </Box>
              )}
            </Box>
          )}

          {totalLista === 0 && buscaNorm.length < 2 && (
            <Typography variant="body2" color="text.secondary">
              Nenhum estudo aqui ainda. Digite pelo menos duas letras na pesquisa para ver estudos públicos da comunidade.
            </Typography>
          )}

          {buscaNorm.length >= 2 && (
            <Box sx={{ mt: totalLista > 0 ? 3 : 0 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.primary', mb: 0.75, fontWeight: 700, opacity: 0.95 }}>
                Estudos públicos
              </Typography>
              {publicSearchErr && (
                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setPublicSearchErr(null)}>
                  {publicSearchErr}
                </Alert>
              )}
              {publicSearchBusy ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : publicos.length > 0 ? (
                <EstudosBiblicosListaLinha
                  rows={publicos}
                  navigate={navigate}
                  setApagarId={() => {}}
                  mostrarAcoesAutor={false}
                />
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Nenhum estudo público encontrado para esse tema.
                  </Typography>
                  {(meusFiltrados.length > 0 || salvosFiltrados.length > 0) && (
                    <Alert severity="info" sx={{ mt: 0.5 }}>
                      Os estudos acima são seus ou salvos por você. “Estudos públicos” mostra só trabalhos de toda a
                      comunidade em que o autor ativou “Tornar este estudo público nas pesquisas de temas” ao editar.
                      Abra o seu estudo, ative essa opção e guarde para aparecer aqui para outros.
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}

      <Dialog open={Boolean(apagarId)} onClose={() => setApagarId(null)}>
        <DialogTitle>Apagar estudo?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Esta ação remove o estudo para todos (incluindo quem tinha salvo).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApagarId(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!apagarId || !user?.uid) return
              try {
                await apagarEstudoAutor(apagarId, user.uid)
                setApagarId(null)
                await carregar()
              } catch (e) {
                setErr(e?.message || 'Falha ao apagar.')
                setApagarId(null)
              }
            }}
          >
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
