import { useState } from 'react'
import { Box, Button, Card, CardActionArea, CardContent, Chip, LinearProgress, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { obterEstudosVisiveis } from '../data/discipulado'
import { buscarLicoesDiscipulado, rotuloModuloDiscipulado } from '../utils/discipuladoNavegacao'

export default function MenuDiscipulado({ temas, moduloId, navigate, abrirLicao, ultimaLicao, concluida }) {
  const [busca, setBusca] = useState('')
  const modulo = temas.find((tema) => tema.id === moduloId)
  const licoes = modulo ? obterEstudosVisiveis(modulo) : []
  const resultados = busca.trim() ? buscarLicoesDiscipulado(temas, busca).filter(({ tema }) => !modulo || tema.id === modulo.id) : []
  const totalConcluidas = licoes.filter((licao) => concluida(modulo.id, licao.id)).length
  const abrirModulo = (id) => { setBusca(''); navigate(`/discipulado?modulo=${id}`) }

  const itemLicao = ({ tema, estudo, numero }) => (
    <Card key={`${tema.id}-${estudo.id}`} variant="outlined" sx={{ borderRadius: 2 }}>
      <CardActionArea onClick={() => abrirLicao(tema.id, estudo.id)}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" color="primary">{rotuloModuloDiscipulado(temas, tema.id)} · Lição {numero}</Typography>
            <Typography component="h2" sx={{ fontWeight: 750, lineHeight: 1.35 }}>{estudo.titulo}</Typography>
            {estudo.resumo && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{estudo.resumo}</Typography>}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Lição completa · {estudo.questoes?.length || 0} perguntas de fixação
              {estudo.meditacao?.length ? ` · ${estudo.meditacao.length} meditações` : ''}
            </Typography>
          </Box>
          {concluida(tema.id, estudo.id) && <CheckCircleIcon color="success" aria-label="Lição concluída" />}
          <NavigateNextIcon color="action" />
        </CardContent>
      </CardActionArea>
    </Card>
  )

  return (
    <Box sx={{ width: '100%', maxWidth: 920, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: 2, pb: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      {modulo && <Button startIcon={<ArrowBackIcon />} onClick={() => { setBusca(''); navigate('/discipulado') }}>Todos os módulos</Button>}
      <Typography variant="overline" color="primary">{modulo ? rotuloModuloDiscipulado(temas, modulo.id) : 'Discipulado'}</Typography>
      <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: '1.6rem', sm: '2rem' } }}>
        {modulo?.titulo || 'Módulos e lições'}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
        {modulo ? 'Escolha uma lição. Leia o texto completo e responda ao questionário ao final.' : 'Escolha um módulo ou encontre uma lição pelo título.'}
      </Typography>
      <TextField fullWidth size="small" label={modulo ? 'Buscar lição neste módulo' : 'Buscar módulo ou lição'} value={busca}
        onChange={(event) => setBusca(event.target.value)} type="search" sx={{ mb: 2 }} />
      {busca.trim() ? (
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {!modulo && temas.filter((tema) => {
            const normalizar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            const titulo = normalizar(`${rotuloModuloDiscipulado(temas, tema.id)} ${tema.titulo}`)
            return normalizar(busca).trim().split(/\s+/).every((termo) => titulo.includes(termo))
          }).map((tema) => <Button key={tema.id} variant="outlined" onClick={() => abrirModulo(tema.id)} sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}>
            {rotuloModuloDiscipulado(temas, tema.id)} — {tema.titulo}
          </Button>)}
          {resultados.map(itemLicao)}
          {!resultados.length && <Typography color="text.secondary" role="status">Nenhuma lição encontrada. Você também pode abrir um módulo pela lista.</Typography>}
        </Box>
      ) : modulo ? (
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {licoes.length > 0 && <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>{totalConcluidas} de {licoes.length} lições concluídas</Typography>
            <LinearProgress variant="determinate" value={100 * totalConcluidas / licoes.length} aria-label="Progresso do módulo" />
          </Box>}
          <Button variant="outlined" onClick={() => abrirLicao(modulo.id)} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 1.5 }} endIcon={<NavigateNextIcon />}>
            {licoes.length ? 'Apresentação do módulo' : 'Estudar a abertura e responder ao questionário'}
          </Button>
          {licoes.map((estudo, indice) => itemLicao({ tema: modulo, estudo, numero: indice + 1 }))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {ultimaLicao && <Button variant="contained" onClick={() => abrirLicao(ultimaLicao.tema.id, ultimaLicao.estudo?.id ?? null)} sx={{ justifyContent: 'space-between', textAlign: 'left', textTransform: 'none', py: 1.5 }} endIcon={<NavigateNextIcon />}>
            Continuar: {ultimaLicao.estudo?.titulo || ultimaLicao.tema.titulo}
          </Button>}
          {temas.map((tema) => {
            const estudos = obterEstudosVisiveis(tema)
            const feitas = estudos.filter((estudo) => concluida(tema.id, estudo.id)).length
            return <Card key={tema.id} variant="outlined" sx={{ borderRadius: 2 }}>
              <CardActionArea onClick={() => abrirModulo(tema.id)}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="primary">{rotuloModuloDiscipulado(temas, tema.id)}</Typography>
                    <Typography component="h2" sx={{ fontWeight: 750, lineHeight: 1.35 }}>{tema.titulo}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {estudos.length ? `${estudos.length} lições · ${feitas} concluídas` : 'Texto de abertura e questionário'}
                    </Typography>
                  </Box>
                  {estudos.length > 0 && <Chip label="Ver lições" size="small" />}
                  <NavigateNextIcon color="action" />
                </CardContent>
              </CardActionArea>
            </Card>
          })}
        </Box>
      )}
    </Box>
  )
}
