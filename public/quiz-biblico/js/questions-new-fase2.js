/** Perguntas novas — Fase 2 (conteúdo intermediário) */
const questionsNewFase2 = [
  {
    number: 62,
    question: 'Quem são os doze apóstolos escolhidos por Jesus?',
    options: [
      'Pedro, André, Tiago, João, Filipe, Bartolomeu, Mateus, Tomé, Tiago (filho de Alfeu), Tadeu, Simão, o Zelote e Paulo',
      'Pedro, André, Tiago, João, Filipe, Bartolomeu, Mateus, Tomé, Tiago (filho de Alfeu), Tadeu, Simão, o Zelote e Barnabé',
      'Pedro, André, Tiago, João, Filipe, Bartolomeu, Mateus, Tomé, Tiago (filho de Alfeu), Tadeu, Simão, o Zelote e Judas Iscariotes',
      'Pedro, André, Tiago, João, Filipe, Bartolomeu, Mateus, Tomé, Tiago (filho de Alfeu), Tadeu, Simão, o Zelote e Matias',
    ],
    correctAnswer: 2,
    reference: 'Mateus 10:2-4; Marcos 3:16-19; Lucas 6:14-16',
    biblicalText:
      'Estes são os nomes dos doze apóstolos: primeiro, Simão, chamado Pedro, e André, seu irmão; Tiago, filho de Zebedeu, e João, seu irmão; Filipe e Bartolomeu; Tomé e Mateus, o publicano; Tiago, filho de Alfeu, e Tadeu; Simão, o Zelote, e Judas Iscariotes, que o traiu.',
    explanation:
      'Jesus escolheu doze discípulos durante seu ministério. Paulo, Barnabé e Matias não faziam parte desse grupo original — Matias foi sorteado depois da traição de Judas, e Paulo foi chamado apóstolo posteriormente.',
    category: 'novo_testamento',
    difficulty: 3,
  },
  {
    number: 63,
    question: 'Segundo Paulo, quantas cartas ele escreveu à igreja de Corinto?',
    options: ['Uma', 'Duas', 'Três', 'Quatro'],
    correctAnswer: 2,
    reference: '1 Coríntios 5:9; 1 Coríntios; 2 Coríntios',
    biblicalText:
      'Escrevi-vos na carta que não vos associásseis com os devassos; … escrevi que não vos juntásseis com aqueles que, dizendo-se irmãos, são devassos.',
    explanation:
      'Paulo menciona em 1 Coríntios 5:9 uma carta anterior àquela epístola. Somando essa carta perdida com 1 e 2 Coríntios, sabemos pelo próprio apóstolo que escreveu ao menos três cartas à igreja de Corinto (duas estão no cânon).',
    category: 'cartas_paulinas',
    difficulty: 2,
  },
  {
    number: 64,
    question: 'Qual animal teve uma parte do corpo usada como arma por Sansão?',
    options: ['Leão', 'Jumento', 'Cavalo', 'Urso'],
    correctAnswer: 1,
    reference: 'Juízes 15:15',
    biblicalText:
      'E achou uma queixada de jumento recente, e estendeu a mão, e tomou-a, e feriu com ela mil homens.',
    explanation:
      'Sansão usou a queixada de um jumento recém-morto para derrotar mil filisteus, mostrando que Deus concedeu força sobrenatural.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 65,
    question: 'O que Jonas lamentou mais do que o povo de Nínive?',
    options: [
      'A morte dos peixes do mar',
      'A morte (ou o ressecamento) da planta que lhe dava sombra',
      'A destruição de Israel',
      'A tempestade no navio',
    ],
    correctAnswer: 1,
    reference: 'Jonas 4:6-11',
    biblicalText:
      'E fez crescer o Senhor Deus uma aboboreira, que subiu por cima de Jonas, para que fizesse sombra sobre a sua cabeça e o livrasse do seu enfado. E Jonas se alegrou grandemente por causa da aboboreira. Mas Deus enviou um bicho, ao subir da alva do dia seguinte, o qual feriu a aboboreira, e esta se secou. … E disse o Senhor: Tu te compadeceste da aboboreira … e não me compadeceria eu de Nínive, aquela grande cidade, em que estão mais de cento e vinte mil homens?',
    explanation:
      'Jonas ficou mais triste pela planta que secou do que pela possibilidade de destruição de milhares de habitantes de Nínive, e Deus usou isso para ensinar-lhe sobre misericórdia.',
    category: 'profetas',
    difficulty: 2,
  },
  {
    number: 66,
    question: 'Quantas pessoas sobraram dos desastres ocorridos nas propriedades de Jó?',
    options: ['Uma', 'Duas', 'Três', 'Quatro'],
    correctAnswer: 3,
    reference: 'Jó 1:13-19',
    biblicalText:
      'Eis que chegou um mensageiro … somente eu escapei, para te trazer a nova. … Eis que chegou outro mensageiro … somente eu escapei, para te trazer a nova. … Eis que chegou outro mensageiro … somente eu escapei, para te trazer a nova. … Eis que chegou outro mensageiro … somente eu escapei, para te trazer a nova.',
    explanation:
      'Após cada desastre, apenas um mensageiro escapava para contar a Jó o ocorrido. Foram quatro desastres e quatro sobreviventes.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 67,
    question: 'Quantos homens treinados saíram com Abraão para resgatar Ló?',
    options: ['144', '318', '500', '600'],
    correctAnswer: 1,
    reference: 'Gênesis 14:14',
    biblicalText:
      'Ouvindo, pois, Abrão que seu irmão estava preso, armou os seus criados, nascidos em sua casa, trezentos e dezoito, e os perseguiu até Dan.',
    explanation:
      'Abraão armou 318 servos nascidos em sua casa e os perseguiu até Dan, derrotando os reis que haviam levado Ló como prisioneiro.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 68,
    question: 'Qual era o parentesco entre Abraão e Ló?',
    options: ['Irmãos', 'Sobrinho', 'Primos', 'Pai e filho'],
    correctAnswer: 1,
    reference: 'Gênesis 11:31',
    biblicalText:
      'E tomou Terá a Abrão, seu filho, e a Ló, filho de Harã, filho de seu filho, e a Sarai, sua nora, mulher de Abrão, seu filho.',
    explanation:
      'Ló era filho de Harã, irmão de Abraão — portanto, sobrinho de Abram. Acompanhou Abraão na jornada até Canaã.',
    category: 'personagens',
    difficulty: 1,
  },
  {
    number: 69,
    question: 'Qual personagem fugiu da mulher de Potifar deixando sua veste para trás?',
    options: ['Elias', 'Jacó', 'Davi', 'José'],
    correctAnswer: 3,
    reference: 'Gênesis 39:12',
    biblicalText:
      'E ela agarrou-o pela sua veste, dizendo: Deita-te comigo. Porém ele, deixando a sua veste na mão dela, fugiu, e saiu para fora.',
    explanation:
      'José fugiu da tentação de Potifar, deixando sua veste nas mãos da mulher de Potifar. Diferente do jovem não identificado em Marcos 14, aqui temos um personagem conhecido da narrativa patriarcal.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 70,
    question: 'Qual patriarca disse que Sara era sua irmã para o faraó?',
    options: ['Abraão', 'Isaque', 'Jacó', 'José'],
    correctAnswer: 0,
    reference: 'Gênesis 12:10-20',
    biblicalText:
      'E aconteceu que, chegando Abrão ao Egito, viram os egípcios a mulher, que era mui formosa. … E disseram a Faraó: Esta mulher é irmã dele; por isso a tomou por mulher.',
    explanation:
      'Temendo morrer por causa da beleza de Sara, Abraão pediu que ela dissesse ser sua irmã. Faraó tomou Sara, mas Deus interveio e restituiu Abraão e sua esposa.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 71,
    question: 'Quem foi sorteado para ocupar o lugar de Judas Iscariotes entre os doze?',
    options: ['Paulo', 'Barnabé', 'Matias', 'Silas'],
    correctAnswer: 2,
    reference: 'Atos 1:26',
    biblicalText:
      'E sortearam, e caiu a sorte sobre Matias; e foi contado com os onze apóstolos.',
    explanation:
      'Após a ascensão de Jesus, os discípulos oraram e sortearam entre Matias e José Barsabás. Matias completou o número dos doze, substituindo Judas.',
    category: 'novo_testamento',
    difficulty: 2,
  },
  {
    number: 72,
    question: 'Além de Abraão, qual patriarca também disse que sua esposa era sua irmã?',
    options: ['Isaque', 'Jacó', 'José', 'Noé'],
    correctAnswer: 0,
    reference: 'Gênesis 26:7',
    biblicalText:
      'E perguntando-lhe os homens daquele lugar acerca de sua mulher, disse: É minha irmã; porque temia de dizer: É minha mulher.',
    explanation:
      'Isaque, temendo ser morto em Gerar, disse que Rebeca era sua irmã. Abimeleque, rei dos filisteus, descobriu a verdade e repreendeu Isaque.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 73,
    question: 'Qual era o nome de Pedro antes de Jesus lhe dar o apelido Cefas/Pedro?',
    options: ['João', 'André', 'Simão', 'Filipe'],
    correctAnswer: 2,
    reference: 'João 1:42',
    biblicalText:
      'Levou-o a Jesus. E, fixando Jesus os olhos nele, disse: Tu és Simão, filho de Jonas; tu serás chamado Cefas (que quer dizer Pedro).',
    explanation:
      'Pedro era originalmente chamado Simão, filho de Jonas. Jesus lhe deu o nome Cefas (Pedro), significando rocha, destacando seu papel na igreja.',
    category: 'novo_testamento',
    difficulty: 2,
  },
  {
    number: 74,
    question: 'Quantas pragas Deus enviou sobre o Egito antes da libertação de Israel?',
    options: ['Sete', 'Dez', 'Doze', 'Quatorze'],
    correctAnswer: 1,
    reference: 'Êxodo 7–12',
    biblicalText:
      'E Moisés e Aarão fizeram todas estas maravilhas perante Faraó; mas o Senhor endureceu o coração de Faraó, e não deixou ir os filhos de Israel da sua terra.',
    explanation:
      'Deus enviou dez pragas sobre o Egito — da água transformada em sangue até a morte dos primogênitos — para demonstrar seu poder e compelir Faraó a liberar Israel.',
    category: 'antigo_testamento',
    difficulty: 1,
  },
  {
    number: 75,
    question: 'Quem viu a sarça ardente que não se consumia no monte Horebe?',
    options: ['Elias', 'Moisés', 'Josué', 'Arão'],
    correctAnswer: 1,
    reference: 'Êxodo 3:2-4',
    biblicalText:
      'E apareceu-lhe o Anjo do Senhor em uma chama de fogo, no meio de uma sarça; e olhou, e eis que a sarça ardia no fogo, e a sarça não se consumia.',
    explanation:
      'Deus chamou Moisés por meio da sarça ardente, revelando-se como o Deus de Abraão, Isaque e Jacó, e o comissionou a libertar Israel do Egito.',
    category: 'antigo_testamento',
    difficulty: 1,
  },
  {
    number: 76,
    question:
      'Quem disse a Ester: "Quem sabe se para conjuntura como esta é que foste elevada a rainha"?',
    options: ['Mordecai', 'Assuero', 'Mefibosete', 'Neemias'],
    correctAnswer: 0,
    reference: 'Ester 4:14 (ARA)',
    biblicalText:
      'Então, lhes disse Mordecai que respondessem a Ester: Não imagines que, por estares na casa do rei, só tu escaparás entre todos os judeus. Porque, se de todo te calares agora, de outra parte se levantará para os judeus socorro e livramento, mas tu e a casa de teu pai perecereis; e quem sabe se para conjuntura como esta é que foste elevada a rainha?',
    explanation:
      'Mordecai exortou Ester a interceder pelo povo judeu perante o rei, reconhecendo que Deus a havia colocado naquele posição por um propósito providencial.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 77,
    question: 'Qual animal falou com o profeta Balaão?',
    options: ['Cavalo', 'Jumenta', 'Camelo', 'Leão'],
    correctAnswer: 1,
    reference: 'Números 22:28',
    biblicalText:
      'Então o Senhor abriu a boca da jumenta, a qual disse a Balaão: Que te fiz eu, que me feriste já três vezes?',
    explanation:
      'Deus abriu a boca da jumenta de Balaão para repreendê-lo, quando ele a espancava por desviar-se do caminho. O profeta acabou sendo impedido de amaldiçoar Israel.',
    category: 'profetas',
    difficulty: 2,
  },
  {
    number: 78,
    question: 'Quem fechou a porta da arca quando Noé e sua família entraram?',
    options: ['Noé', 'Sem', 'Deus (o Senhor)', 'Os anjos'],
    correctAnswer: 2,
    reference: 'Gênesis 7:16',
    biblicalText:
      'E os que entraram, macho e fêmea de toda carne, entraram como Deus lhe tinha ordenado; e o Senhor o fechou dentro.',
    explanation:
      'Noé obedeceu e entrou na arca, mas foi o próprio Senhor quem fechou a porta — sinal de que a salvação e o julgamento estavam nas mãos de Deus.',
    category: 'antigo_testamento',
    difficulty: 2,
  },
  {
    number: 79,
    question: 'Qual era o nome do irmão mais velho de Moisés, escolhido como primeiro sumo sacerdote?',
    options: ['Josué', 'Calebe', 'Arão', 'Eleazar'],
    correctAnswer: 2,
    reference: 'Êxodo 4:14',
    biblicalText:
      'Então irá contigo Arão, teu irmão; eis que ele fala bem. … e ele te servirá de boca, e tu lhe servirás de Deus.',
    explanation:
      'Arão era irmão de Moisés e foi ungido sumo sacerdote de Israel, auxiliando Moisés na liderança e no culto no deserto.',
    category: 'personagens',
    difficulty: 1,
  },
  {
    number: 80,
    question: 'Qual profeta foi engolido por um grande peixe por desobedecer a Deus?',
    options: ['Jonas', 'Elias', 'Amós', 'Naum'],
    correctAnswer: 0,
    reference: 'Jonas 1:17',
    biblicalText:
      'Preparou, pois, o Senhor um grande peixe, para engolir a Jonas; e esteve Jonas três dias e três noites no ventre do peixe.',
    explanation:
      'Jonas fugiu do chamado de Deus para pregar em Nínive e foi lançado ao mar. Deus usou o peixe para trazê-lo de volta ao seu propósito.',
    category: 'profetas',
    difficulty: 1,
  },
  {
    number: 81,
    question: 'Com qual nome Deus abençoou Jacó após lutar com ele?',
    options: ['Abraão', 'Israel', 'Isaque', 'José'],
    correctAnswer: 1,
    reference: 'Gênesis 32:28',
    biblicalText:
      'Disse-lhe, pois: Não te chamarás mais Jacó, mas sim Israel; pois como príncipe lutaste com Deus e com os homens, e prevaleceste.',
    explanation:
      'Depois da luta no vau de Jaboque, Deus mudou o nome de Jacó para Israel, que significa "aquele que luta com Deus" — origem do nome do povo escolhido.',
    category: 'personagens',
    difficulty: 2,
  },
  {
    number: 82,
    question: 'Qual era o nome da esposa de Abraão?',
    options: ['Rebeca', 'Raquel', 'Sara', 'Lia'],
    correctAnswer: 2,
    reference: 'Gênesis 17:15',
    biblicalText:
      'E disse Deus a Abraão: Quanto a Sarai, tua mulher, não lhe chamarás mais Sarai, mas Sara será o seu nome.',
    explanation:
      'Sara (antes Sarai) foi a esposa de Abraão e mãe de Isaque na velhice, cumprindo a promessa de Deus de uma descendência numerosa.',
    category: 'personagens',
    difficulty: 1,
  },
]

window.questionsNewFase2 = questionsNewFase2
