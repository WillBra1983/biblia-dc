import { Box, Container, Paper, Typography, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'

export default function Privacidade() {
  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Política de Privacidade — Bíblia DC
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Última atualização: maio de 2026
        </Typography>

        <Typography variant="body1" sx={{ mb: 2 }}>
          O aplicativo <strong>Bíblia DC</strong> (Bíblia do Discípulo Cristão) é desenvolvido por Wilson
          Lucas Ferreira. Esta política descreve como tratamos dados quando você usa o app no celular, no
          site ou no navegador (PWA).
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          1. Conteúdo local (offline)
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Grande parte do conteúdo (Bíblia, discipulado, hinário, confissão, etc.) fica armazenada no
          aparelho para leitura offline. Esse material não envolve criação de conta.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          2. Conta e autenticação
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Se você criar conta ou entrar (e-mail/senha, Google ou Apple), usamos o{' '}
          <strong>Firebase Authentication</strong> (Google) para identificar você. Podemos receber: nome,
          e-mail, foto de perfil (se o provedor enviar) e identificador único da conta.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          3. Dados na nuvem
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Com login, alguns dados são sincronizados no <strong>Firebase Realtime Database</strong>, por
          exemplo: perfil público (nome, @usuário, cidade, igreja, se você preencher), mensagens de chat,
          favoritos, progresso de estudos, quiz, plano de leitura, versículos marcados e preferências de
          notificação. Você controla o que compartilha no perfil e no chat.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          4. Chat e moderação
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Mensagens são trocadas entre usuários que iniciam conversa. Você pode apagar mensagens e{' '}
          <strong>denunciar</strong> conteúdo inadequado; denúncias ficam registradas para análise pela
          equipe. Contato: WhatsApp (69) 9 9910-4826.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          5. Notificações
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Se você autorizar, usamos <strong>Firebase Cloud Messaging</strong> para lembretes (devocional,
          plano de leitura) e avisos de chat. Guardamos tokens de dispositivo associados à sua conta para
          enviar push; você pode desativar nas Configurações.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          6. Inteligência artificial (Gemini)
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Recursos opcionais de estudo (ex.: resumo lexical Strong) podem enviar trechos lexicais/bíblicos
          à API <strong>Google Gemini</strong> para gerar texto. Não enviamos sua senha; apenas o necessário
          para o pedido de IA.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          7. O que não fazemos
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Não vendemos seus dados. Não usamos localização GPS contínua. Não acessamos sua agenda ou
          contatos do telefone.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
          8. Seus direitos
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Você pode pedir esclarecimentos, correção ou exclusão de conta entrando em contato pelo WhatsApp
          acima. Lei aplicável: Brasil (LGPD).
        </Typography>

        <Typography variant="body2" sx={{ mt: 2 }}>
          <MuiLink component={Link} to="/sobre">
            Voltar ao Sobre
          </MuiLink>
          {' · '}
          <MuiLink href="https://wa.me/5569999104826" target="_blank" rel="noopener noreferrer">
            Contato
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  )
}
