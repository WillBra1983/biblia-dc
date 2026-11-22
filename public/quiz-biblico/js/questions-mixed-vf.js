/**
 * Perguntas mistas — Verdadeiro/Falso e múltipla escolha (dificuldade média/alta).
 * Distribuídas automaticamente pelo merge em fases de 50.
 */
const questionsMixedVF = [
  // —— Verdadeiro ou Falso ——
  {
    number: 9001,
    type: 'vf',
    question: 'José, filho de Jacó, foi vendido pelos irmãos por vinte moedas de prata.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: 'Gênesis 37:28',
    biblicalText:
      'Então, passaram ali uns homens midianitas mercadores; e puxando, tirando José da cova, venderam José aos ismaelitas por vinte moedas de prata.',
    explanation:
      'A quantia correta é vinte moedas — não dez. Esse detalhe numérico é uma armadilha comum em questões de nível médio.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 9002,
    type: 'vf',
    question: 'A décima praga sobre o Egito foi a escuridão por três dias.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Êxodo 10:21-23; 12:29',
    explanation:
      'A nona praga foi a escuridão. A décima e última foi a morte dos primogênitos, após a qual Faraó liberou Israel.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 9003,
    type: 'vf',
    question: 'Pedro negou Jesus três vezes antes de o galo cantar, conforme Jesus havia predito.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: 'Mateus 26:34,69-75',
    biblicalText:
      'Então, começou ele a praguejar e a jurar: Não conheço esse homem. E imediatamente cantou o galo.',
    explanation:
      'Jesus predisse três negações antes do canto do galo; Pedro cumpriu exatamente essa profecia.',
    category: 'evangelhos',
    difficulty: 1,
  },
  {
    number: 9004,
    type: 'vf',
    question: 'Moisés entrou na Terra Prometida e liderou Israel na conquista de Jericó.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Deuteronômio 34:4-5; Josué 6:1-2',
    explanation:
      'Moisés viu a terra do alto do monte Nebo, mas morreu sem entrar. A conquista de Jericó foi conduzida por Josué.',
    category: 'antigo_testamento',
    difficulty: 1,
  },
  {
    number: 9005,
    type: 'vf',
    question: 'Davi derrotou Golias usando primeiro uma funda e uma pedra, antes de decapitá-lo com a espada do filisteu.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: '1 Samuel 17:49-51',
    biblicalText:
      'E Davi pôs a mão no alforje, e tomou dali uma pedra, e a fundou, e feriu o filisteu na testa; e a pedra se lhe cravou na testa, e caiu sobre o rosto em terra.',
    explanation:
      'A vitória veio pela funda; só depois Davi usou a espada de Golias. Confundir a ordem dos eventos é erro frequente.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 9006,
    type: 'vf',
    question: 'O livro de Ester menciona explicitamente o nome pessoal de Deus (YHWH) no texto hebreu.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Ester (livro completo)',
    explanation:
      'Ester é um dos dois livros bíblicos (com Cantares) em que o nome divino YHWH não aparece no texto hebreu, embora a providência de Deus esteja implícita.',
    category: 'antigo_testamento',
    difficulty: 3,
  },
  {
    number: 9007,
    type: 'vf',
    question: 'Paulo era natural de Tarso, cidade da província romana da Cilícia.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: 'Atos 21:39; 22:3',
    biblicalText: 'Disse-lhe Paulo: Eu sou judeu, natural de Tarso, cidade da Cilícia.',
    explanation: 'Paulo tinha dupla cidadania: judeu de Tarso e cidadão romano (Atos 22:25-28).',
    category: 'atos',
    difficulty: 2,
  },
  {
    number: 9008,
    type: 'vf',
    question: 'Timóteo foi discípulo pessoal de Jesus durante os três anos do ministério público na Galileia.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Atos 16:1-3; 1 Timóteo 1:2',
    explanation:
      'Timóteo conheceu Paulo em Listra e tornou-se seu colaborador. Ele não integrava o grupo dos doze apóstolos do ministério de Jesus.',
    category: 'atos',
    difficulty: 2,
  },
  {
    number: 9010,
    type: 'vf',
    question: 'Elias foi arrebatado ao céu em um redemoinho, sem passar pela morte comum.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: '2 Reis 2:11',
    biblicalText:
      'E aconteceu que, indo eles andando e falando, eis que um carro de fogo, com cavalos de fogo, os separou; e Elias subiu ao céu no redemoinho.',
    explanation: 'Enoque e Elias são os dois personagens bíblicos que não morreram de forma ordinária segundo o relato bíblico.',
    category: 'profetas',
    difficulty: 2,
  },
  {
    number: 9011,
    type: 'vf',
    question: 'A carta de Tiago, no NT, foi escrita pelo apóstolo Tiago, irmão de João e filho de Zebedeu.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Tiago 1:1; Gálatas 1:19',
    explanation:
      'Tiago, filho de Zebedeu, foi martirizado cedo (Atos 12:2). A epístola é tradicionalmente atribuída a Tiago, irmão do Senhor, líder da igreja de Jerusalém.',
    category: 'novo_testamento',
    difficulty: 3,
  },
  {
    number: 9012,
    type: 'vf',
    question: 'Os israelitas comeram maná no deserto por quarenta anos, até chegarem à terra habitada.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: 'Êxodo 16:35',
    biblicalText:
      'E os filhos de Israel comeram maná quarenta anos, até que entraram em terra habitada; comeram maná até que chegaram aos termos da terra de Canaã.',
    explanation: 'O maná cessou somente após a Páscoa em Gilgal, quando comeram do fruto da terra (Josué 5:12).',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 9013,
    type: 'vf',
    question: 'Jonas foi enviado a pregar contra Nínive porque os ninivitas já tinham expulsado os assírios de Israel.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Jonas 1:1-2',
    biblicalText:
      'Levanta-te, vai à grande cidade de Nínive, e clama contra ela, porque a sua malícia subiu até mim.',
    explanation:
      'Deus enviou Jonas por causa da maldade de Nínive, não por expulsão de assírios. Jonas fugiu porque temia a misericórdia de Deus para com os inimigos.',
    category: 'profetas',
    difficulty: 2,
  },
  {
    number: 9014,
    type: 'vf',
    question: 'Em Romanos 3:23, Paulo afirma que todos pecaram e carecem da glória de Deus.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 0,
    reference: 'Romanos 3:23',
    biblicalText: 'Porque todos pecaram e destituídos estão da glória de Deus.',
    explanation: 'Versículo central da doutrina da depravação universal e necessidade da graça.',
    category: 'cartas_paulinas',
    difficulty: 1,
  },
  {
    number: 9015,
    type: 'vf',
    question: 'Jesus nasceu em Nazaré, conforme a profecia de Miqueias 5:2.',
    options: ['Verdadeiro', 'Falso'],
    correctAnswer: 1,
    reference: 'Miqueias 5:2; Lucas 2:4-7',
    explanation:
      'Miqueias profetizou Belém como cidade do nascimento do Messias. Jesus nasceu em Belém, mas foi criado em Nazaré.',
    category: 'evangelhos',
    difficulty: 2,
  },

  // —— Múltipla escolha (distratores plausíveis) ——
  {
    number: 9017,
    type: 'mc',
    question: 'Qual era a ocupação de Amós antes de sua vocação profética?',
    options: [
      'Sacerdote em Betel',
      'Criador de ovelhas e cultivador de sicômoros em Tecoa',
      'Escriba na corte de Uzias',
      'Guerreiro na tribo de Manassés',
    ],
    correctAnswer: 1,
    reference: 'Amós 1:1; 7:14',
    biblicalText:
      'Então respondeu Amós e disse a Amazias: Eu não sou profeta, nem filho de profeta; mas boieiro, e cultivador de sicômoros.',
    explanation:
      'Amós era laico, vindo de Tecoa, e não pertencia à guilda profética — fato que reforça a autoridade divina de sua mensagem.',
    category: 'profetas',
    difficulty: 3,
  },
  {
    number: 9018,
    type: 'mc',
    question: 'Em qual monte Abraão foi instruído a sacrificar Isaque?',
    options: ['Monte Sinai', 'Monte Moriá', 'Monte Carmelo', 'Monte Nebo'],
    correctAnswer: 1,
    reference: 'Gênesis 22:2',
    biblicalText:
      'E disse: Toma agora o teu filho, o teu único filho, Isaque, a quem amas, e vai-te à terra de Moriá, e oferece-o ali em holocausto.',
    explanation:
      'Moriá é associado posteriormente ao templo em Jerusalém (2 Crônicas 3:1). Sinai é do Êxodo; Carmelo, de Elias; Nebo, de Moisés.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 9019,
    type: 'mc',
    question: 'Quantas cartas canônicas Paulo escreveu à igreja de Corinto que estão na Bíblia?',
    options: ['Uma', 'Duas', 'Três', 'Quatro'],
    correctAnswer: 1,
    reference: '1 Coríntios; 2 Coríntios; 1 Coríntios 5:9',
    explanation:
      'Temos 1 e 2 Coríntios na Bíblia. Paulo menciona uma carta anterior (perdida) em 1 Coríntios 5:9 — logo, escreveu ao menos três, mas só duas são canônicas.',
    category: 'cartas_paulinas',
    difficulty: 3,
  },
  {
    number: 9020,
    type: 'mc',
    question: 'Quem fechou a porta da arca após Noé, sua família e os animais entrarem?',
    options: ['Noé', 'Sem', 'O Senhor', 'Cam'],
    correctAnswer: 2,
    reference: 'Gênesis 7:16',
    biblicalText:
      'E os que entraram, macho e fêmea de toda carne, entraram como Deus lhe tinha ordenado; e o Senhor o fechou dentro.',
    explanation:
      'Noé obedeceu construindo e entrando, mas foi Deus quem fechou a porta — sinal de proteção e juízo simultâneos.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 9021,
    type: 'mc',
    question: 'Qual profeta casou-se com Gômer como sinal profético do infiel Israel?',
    options: ['Oséias', 'Jeremias', 'Ezequiel', 'Malaquias'],
    correctAnswer: 0,
    reference: 'Oséias 1:2',
    biblicalText:
      'O princípio da palavra do Senhor por Oséias. Disse o Senhor a Oséias: Vai, toma uma mulher de prostituições.',
    explanation:
      'Ezequiel também usou ações simbólicas, mas o casamento com Gômer é exclusivo de Oséias.',
    category: 'profetas',
    difficulty: 2,
  },
  {
    number: 9022,
    type: 'mc',
    question: 'Segundo Atos, em qual cidade Paulo foi apedrejado e dado por morto, mas se levantou e seguiu viagem?',
    options: ['Filipos', 'Listra', 'Éfeso', 'Corinto'],
    correctAnswer: 1,
    reference: 'Atos 14:19-20',
    biblicalText:
      'Então, vieram judeus de Antioquia e de Icônio e, persuadindo as multidões, apedrejaram a Paulo e o arrastaram para fora da cidade, cuidando que estava morto.',
    explanation:
      'Em Filipos Paulo foi açoitado e preso; em Éfeso houve tumulto; em Listra sofreu apedrejamento.',
    category: 'atos',
    difficulty: 3,
  },
  {
    number: 9023,
    type: 'mc',
    question: 'Qual era o nome de Abraão antes de Deus mudá-lo?',
    options: ['Abrão', 'Abiel', 'Adão', 'Arão'],
    correctAnswer: 0,
    reference: 'Gênesis 17:5',
    biblicalText:
      'E não se chamará mais o teu nome Abrão, mas Abraão será o teu nome, porque por pai de multidão de nações te tenho constituído.',
    explanation: 'Abrão significa "pai exaltado"; Abraão, "pai de multidão".',
    category: 'antigo_testamento',
    difficulty: 1,
  },
  {
    number: 9024,
    type: 'mc',
    question: 'A carta aos Gálatas combate principalmente falsos mestres que exigiam:',
    options: [
      'Observância de dias e meses festivos apenas',
      'Circuncisão e observância da lei mosaica para justificação',
      'Rejeição total do Antigo Testamento',
      'Adoração exclusiva no templo de Jerusalém',
    ],
    correctAnswer: 1,
    reference: 'Gálatas 2:3-5; 5:2-4',
    biblicalText:
      'E isto por causa dos falsos irmãos, que se entremeteram a espiar a nossa liberdade que temos em Cristo Jesus, para nos pôr em servidão.',
    explanation:
      'O contexto galata é a justificação só pela fé versus obras da lei, especialmente a circuncisão imposta aos gentios.',
    category: 'cartas_paulinas',
    difficulty: 2,
  },
  {
    number: 9025,
    type: 'mc',
    question: 'Qual discípulo exigiu ver as marcas dos cravos antes de crer na ressurreição?',
    options: ['Pedro', 'Tomé', 'Filipe', 'André'],
    correctAnswer: 1,
    reference: 'João 20:25-28',
    biblicalText:
      'Disse-lhe Tomé: Senhor meu e Deus meu!',
    explanation:
      'Tomé tornou-se exemplo de crença após exame — Jesus o repreende suavemente pela incredulidade inicial.',
    category: 'evangelhos',
    difficulty: 1,
  },
  {
    number: 9026,
    type: 'mc',
    question: 'Quem interpretou o sonho das vacas gordas e magras do faraó no Egito?',
    options: ['Moisés', 'Arão', 'José', 'Daniel'],
    correctAnswer: 2,
    reference: 'Gênesis 41:25-26',
    biblicalText:
      'Então disse José a Faraó: O sonho de Faraó é um só; o que Deus vai fazer, notificou a Faraó.',
    explanation:
      'Daniel interpretou sonhos na Babilônia séculos depois. José foi elevado a governador do Egito após essa interpretação.',
    category: 'antigo_testamento',
    difficulty: 1,
  },
  {
    number: 9027,
    type: 'mc',
    question: 'Quem em Colossenses 4:14 é chamado "o médico amado"?',
    options: ['Marcos', 'Lucas', 'Mateus', 'João'],
    correctAnswer: 1,
    reference: 'Colossenses 4:14',
    biblicalText: 'Saúda-vos Lucas, o médico amado, e Demas.',
    explanation:
      'O texto nomeia Lucas e o qualifica como médico; não precisa apelar a tradição externa.',
    category: 'evangelhos',
    difficulty: 2,
  },
  {
    number: 9028,
    type: 'mc',
    question: 'Na contagem protestante usual, quantos livros compõem a Bíblia completa (AT + NT)?',
    options: ['73', '66', '72', '39'],
    correctAnswer: 1,
    reference: 'Lucas 24:44; cânon protestante',
    explanation:
      'Na tradição protestante: 39 livros do AT + 27 do NT = 66. A Bíblia católica inclui deuterocanônicos (73 no total).',
    category: 'variados',
    difficulty: 2,
  },
  {
    number: 9029,
    type: 'mc',
    question: 'Quem disse: "Eis aqui a serva do Senhor; cumpra-se em mim segundo a tua palavra"?',
    options: ['Ana', 'Maria', 'Elisabet', 'Débora'],
    correctAnswer: 1,
    reference: 'Lucas 1:38',
    biblicalText:
      'Disse então Maria: Eis aqui a serva do Senhor; cumpra-se em mim segundo a tua palavra. E o anjo ausentou-se dela.',
    explanation:
      'A submissão de Maria à vontade de Deus contrasta com a dúvida inicial de Zacarias no mesmo capítulo.',
    category: 'evangelhos',
    difficulty: 2,
  },
  {
    number: 9030,
    type: 'mc',
    question: 'Quais eram os nomes hebreus originais de Sadraque, Mesaque e Abede-Nego?',
    options: ['Ananias, Misael e Azarias', 'Eleazar, Natã e Simeão', 'Daniel, Hananias e Berequias', 'Jeremias, Oséias e Mica'],
    correctAnswer: 0,
    reference: 'Daniel 1:6-7',
    biblicalText:
      'Entre eles estavam, dos filhos de Judá, Daniel, Hananias, Misael e Azarias.',
    explanation:
      'Os nomes babilônicos (Sadraque, Mesaque, Abede-Nego) substituíram os nomes hebreus que honravam a Deus: Hananias, Misael e Azarias.',
    category: 'profetas',
    difficulty: 3,
  },
]

window.questionsMixedVF = questionsMixedVF
