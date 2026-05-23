# Checklist de Compliance para Fontes Biblicas

Checklist operacional para aprovar datasets antes de integrar no app em producao.

## Etapa 1: Identificacao da fonte

- [ ] Nome do dataset e mantenedor identificados
- [ ] URL oficial do repositorio/site registrada
- [ ] Arquivo exato (path) que sera importado registrado
- [ ] Versao imutavel definida (tag/commit/hash)

## Etapa 2: Licenca

- [ ] Licenca encontrada no repositorio
- [ ] Licenca valida para o arquivo/dataset especifico
- [ ] Licenca compativel com app proprietario
- [ ] Clausulas de atribuicao documentadas
- [ ] Clausulas de copyleft analisadas (GPL/AGPL/LGPL etc.)

## Etapa 3: Risco juridico

- [ ] Fonte marcada como Aprovado/Revisar/Bloqueado
- [ ] Se Revisar/Bloqueado, existe plano alternativo
- [ ] Parecer juridico solicitado quando necessario

## Etapa 4: Integracao tecnica

- [ ] Script de importacao reproduzivel criado
- [ ] Log de importacao com data e hash salvo em `docs/`
- [ ] Dados integrados sem mistura de fontes com licencas conflitantes
- [ ] Tela/arquivo de notices atualizados

## Etapa 5: Gate de producao

- [ ] `docs/licencas-fontes-biblicas.md` atualizado
- [ ] `docs/third-party-notices-template.md` atualizado com fontes reais
- [ ] Validacao final de release assinada por responsavel tecnico

## Regra de bloqueio

Se qualquer item de licenca estiver inconclusivo, a fonte nao entra no build de producao.
