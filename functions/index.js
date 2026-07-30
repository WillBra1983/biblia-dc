/**
 * Ponto de entrada das Cloud Functions do projeto Bíblia DC.
 *
 * Cada arquivo em `src/` exporta uma função; aqui só fazemos o
 * re-export para o runtime do Firebase descobri-las pelo nome.
 */

const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp()
}

// Push de chat (RTDB trigger)
exports.pushChatMensagem = require('./src/onMensagemChat').pushChatMensagem

// Aviso administrativo (callable)
exports.enviarAvisoAdmin = require('./src/enviarAvisoAdmin').enviarAvisoAdmin

// Lembretes diários (cron)
exports.lembretesDiarios = require('./src/lembretesDiarios').lembretesDiarios

// Auto-inscrição no topic `novidades` (3 triggers RTDB)
const topicNovidades = require('./src/gerirTopicNovidades')
exports.inscreverTokenNovoNovidades = topicNovidades.inscreverTokenNovoNovidades
exports.desinscreverTokenRemovidoNovidades = topicNovidades.desinscreverTokenRemovidoNovidades
exports.aoMudarPreferenciaNovidades = topicNovidades.aoMudarPreferenciaNovidades

// Votação em estudos IA (versículo + perícope): 10 positivos → oficial; 10 negativos → descarta candidato
exports.onVotoEstudoCurado = require('./src/onVotoEstudoCurado').onVotoEstudoCurado

// Métricas de visualização por secção (cliente deduplica por entrada; RTDB só admin lê)
exports.registrarVisualizacaoSecao =
  require('./src/registrarVisualizacaoSecao').registrarVisualizacaoSecao

// Lista utilizadores Auth (paginado) — só admin
exports.listarUsuariosAdmin = require('./src/listarUsuariosAdmin').listarUsuariosAdmin

// Apaga contas e-mail/senha sem verificação após 48 h (cron diário)
exports.limparContasEmailNaoVerificadas =
  require('./src/limparContasEmailNaoVerificadas').limparContasEmailNaoVerificadas

// Cadastro e-mail/senha: pendência até abrir o link (sem utilizador Auth antes disso)
exports.iniciarCadastroEmailSenha = require('./src/cadastroEmailSenha').iniciarCadastroEmailSenha
exports.finalizarCadastroEmailLink = require('./src/cadastroEmailSenha').finalizarCadastroEmailLink
exports.cancelarCadastroEmailPendente = require('./src/cadastroEmailSenha').cancelarCadastroEmailPendente

// Prova bíblica: gabarito só no servidor (aluno)
exports.iniciarProvaBiblicaAluno = require('./src/provaBiblicaAluno').iniciarProvaBiblicaAluno
exports.avaliarProvaBiblicaAluno = require('./src/provaBiblicaAluno').avaliarProvaBiblicaAluno

// Reconstrói índices de busca do chat (userSearch + profileEmails) — só admin
exports.sincronizarIndiceBuscaAdmin =
  require('./src/sincronizarIndiceBuscaAdmin').sincronizarIndiceBuscaAdmin

// Desativar / reativar / apagar utilizador no Auth — só admin
exports.gerenciarUsuarioAdmin = require('./src/gerenciarUsuarioAdmin').gerenciarUsuarioAdmin

// Chat: resolver e-mail → UID (Auth + índice RTDB)
exports.resolverEmailParaUid = require('./src/resolverEmailParaUid').resolverEmailParaUid

// Ranking do plano: espelha progresso de users/{uid}/planoLeitura → planoLeituraRanking/{uid}
exports.onPlanoLeituraRankingSync =
  require('./src/onPlanoLeituraRanking').onPlanoLeituraRankingSync

// Ranking do plano: rebuild sob demanda ao abrir a lista (throttle 7 dias)
exports.atualizarRankingPlanoLeitura =
  require('./src/atualizarRankingPlanoLeitura').atualizarRankingPlanoLeitura

// Versão Android na Play Store → RTDB (aviso in-app); cron + callable admin
exports.sincronizarVersaoPlayStoreAdmin =
  require('./src/sincronizarVersaoPlayStoreAdmin').sincronizarVersaoPlayStoreAdmin
exports.sincronizarVersaoPlayStoreCron =
  require('./src/sincronizarVersaoPlayStoreCron').sincronizarVersaoPlayStoreCron

// Proxy Gemini (chave no servidor; auth + cota por usuário)
exports.geminiGenerateContent = require('./src/geminiProxy').geminiGenerateContent

// Versiculo do dia: selecao sem repeticao e publicacao direta na Biblia comentada.
const versiculoDoDia = require('./src/versiculoDoDia')
exports.publicarVersiculoDoDia = versiculoDoDia.publicarVersiculoDoDia
exports.selecionarVersiculoDoDia = versiculoDoDia.selecionarVersiculoDoDia
exports.garantirVersiculoDoDia = versiculoDoDia.garantirVersiculoDoDia
exports.substituirVersiculoDoDia = versiculoDoDia.substituirVersiculoDoDia
exports.prepararVersiculoDoDiaSubstituido = versiculoDoDia.prepararVersiculoDoDiaSubstituido
exports.registrarCompartilhamentoVersiculoDoDia = versiculoDoDia.registrarCompartilhamentoVersiculoDoDia
