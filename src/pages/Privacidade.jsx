import { Box, Button, Container, Divider, Link as MuiLink, Paper, Typography } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { Link } from 'react-router-dom'

const WHATSAPP_EXCLUSAO =
  'https://wa.me/5569999104826?text=Solicito%20a%20exclus%C3%A3o%20da%20minha%20conta%20e%20dos%20dados%20associados%20no%20aplicativo%20B%C3%ADblia%20do%20Disc%C3%ADpulo%20Crist%C3%A3o.'

function Secao({ titulo, children, id }) {
  return (
    <Box component="section" id={id} sx={{ scrollMarginTop: 90 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>
        {titulo}
      </Typography>
      <Typography component="div" variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Box>
  )
}

export default function Privacidade() {
  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Política de Privacidade — Bíblia do Discípulo Cristão
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Última atualização: 25 de julho de 2026
        </Typography>

        <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
          O aplicativo <strong>Bíblia DC — Bíblia do Discípulo Cristão</strong>, identificado pelo pacote{' '}
          <strong>com.bibliadc.app</strong>, é desenvolvido por <strong>Wilson Lucas Ferreira</strong>.
          Esta política explica como os dados são tratados no Android, iOS e site/PWA.
        </Typography>

        <Secao titulo="1. Conteúdo local e uso sem conta">
          A Bíblia, o discipulado, o hinário, as confissões e outros materiais podem ser utilizados sem
          criar conta. Parte do conteúdo e das preferências fica armazenada no próprio dispositivo para
          leitura offline.
        </Secao>

        <Secao titulo="2. Conta e dados coletados">
          Ao criar uma conta ou entrar por e-mail, Google ou Apple, o Firebase Authentication pode
          processar nome, e-mail, foto de perfil, provedor de acesso e identificador único da conta. Se o
          usuário preencher o perfil, também podemos armazenar @usuário, telefone, cidade, profissão ou
          estudo e igreja. Uma foto selecionada pelo usuário pode ser comprimida e enviada como foto de
          perfil.
        </Secao>

        <Secao titulo="3. Dados de uso e conteúdo enviado pelo usuário">
          Com login, podemos sincronizar mensagens de chat, amizades, favoritos, progresso de estudos e
          quiz, plano de leitura, versículos marcados, preferências de notificação, estudos compartilhados
          e respostas enviadas pelo próprio usuário. Esses dados são usados para fornecer sincronização,
          comunicação e continuidade entre dispositivos.
        </Secao>

        <Secao titulo="4. Notificações e dados do dispositivo">
          Quando autorizado, o Firebase Cloud Messaging processa tokens do dispositivo para enviar
          lembretes e avisos de chat. O aplicativo pode receber informações técnicas necessárias ao
          funcionamento, como plataforma, versão do app e registros de erro. Não usamos localização GPS
          contínua, agenda, contatos, SMS ou histórico de chamadas.
        </Secao>

        <Secao titulo="5. Inteligência artificial">
          Recursos opcionais de estudo podem enviar à API Google Gemini o texto bíblico, lexical ou a
          pergunta necessária para gerar uma resposta. Senhas não são enviadas à inteligência artificial.
          O usuário deve evitar inserir dados pessoais sensíveis em solicitações de IA.
        </Secao>

        <Secao titulo="6. Compartilhamento e prestadores de serviço">
          Não vendemos dados pessoais. Dados podem ser processados por fornecedores necessários ao app,
          especialmente Google Firebase (autenticação, banco de dados, armazenamento, notificações e
          infraestrutura) e Google Gemini nos recursos opcionais de IA. Informações também podem ser
          apresentadas a outros usuários quando o titular decide publicar perfil, conversar ou
          compartilhar conteúdo. Poderemos fornecer dados quando exigido por lei ou para proteger
          usuários e a segurança do serviço.
        </Secao>

        <Secao titulo="7. Chat, conteúdo público e moderação">
          Mensagens são transmitidas aos participantes das conversas. O usuário pode apagar mensagens e
          denunciar conteúdo inadequado. Denúncias e dados estritamente necessários podem ser analisados
          e mantidos durante o período necessário para moderação, prevenção de abuso e cumprimento legal.
        </Secao>

        <Secao titulo="8. Segurança">
          Adotamos medidas técnicas e administrativas razoáveis, incluindo conexões HTTPS, autenticação e
          regras de acesso no Firebase. Nenhum método de armazenamento ou transmissão é totalmente isento
          de risco; por isso, também recomendamos que o usuário proteja suas credenciais e seu aparelho.
        </Secao>

        <Secao titulo="9. Retenção dos dados">
          Os dados vinculados à conta são mantidos enquanto a conta estiver ativa ou enquanto forem
          necessários para fornecer o serviço. Após uma solicitação válida de exclusão, eliminamos a conta
          e os dados pessoais associados em prazo razoável, normalmente em até 30 dias. Informações podem
          ser conservadas por período adicional quando necessário para segurança, prevenção de fraude,
          cumprimento de obrigação legal ou ciclos técnicos de backup.
        </Secao>

        <Secao titulo="10. Exclusão da conta e dos dados" id="excluir-conta">
          <strong>É possível solicitar a exclusão mesmo que o aplicativo já tenha sido desinstalado.</strong>{' '}
          Envie a solicitação pelo botão abaixo usando o telefone associado ou informe o e-mail da conta.
          Poderemos pedir uma confirmação razoável de titularidade. A exclusão abrange a conta de acesso e
          os dados associados, ressalvadas as retenções legais descritas acima.
          <Button
            component="a"
            href={WHATSAPP_EXCLUSAO}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            startIcon={<WhatsAppIcon />}
            sx={{ display: 'flex', width: 'fit-content', mt: 2 }}
          >
            Solicitar exclusão da conta
          </Button>
        </Secao>

        <Secao titulo="11. Direitos e contato">
          Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção,
          informação, oposição e exclusão quando aplicável. Contato do responsável: Wilson Lucas Ferreira,
          WhatsApp{' '}
          <MuiLink href="https://wa.me/5569999104826" target="_blank" rel="noopener noreferrer">
            +55 69 99910-4826
          </MuiLink>.
        </Secao>

        <Secao titulo="12. Alterações desta política">
          Esta política pode ser atualizada para refletir mudanças legais ou funcionais. A data da versão
          mais recente será informada no início desta página.
        </Secao>

        <Divider sx={{ my: 2 }} />
        <Typography variant="body2">
          <MuiLink component={Link} to="/sobre">Voltar ao Sobre</MuiLink>
          {' · '}
          <MuiLink href={WHATSAPP_EXCLUSAO} target="_blank" rel="noopener noreferrer">
            Exclusão de conta
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  )
}
