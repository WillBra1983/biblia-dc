// O Excel será convertido em um arquivo JavaScript
// Áudio opcional: pode incluir "audioUrl" em:
//   - introducao.audioUrl (tema ou estudo)
//   - cada item de questoes[].audioUrl
//   - cada dia em meditacao.dias[].audioUrl
// Use URL completa (https://...) OU caminho relativo (ex: "audios/lição-01.mp3").
// Caminho relativo: coloque os arquivos em public/audios/; o mesmo valor funciona
// no site (build:web) e no app (APK/AAB, build:android).
export const discipuladoData = [
  {
    id: 1,
    titulo: "A Sagrada Escritura como Revelação de Deus",
    introducao: {
      texto: "A singularidade e a autoridade das Escrituras\n\nA Bíblia é a Palavra viva do Deus vivo: inspirada pelo Espírito Santo, infalível e plenamente confiável. Ela não é produto da evolução da religiosidade humana, nem um mero compêndio cultural ou registro histórico, mas a revelação especial pela qual Deus fala com autoridade, dá a conhecer o seu caráter e a sua vontade, e conduz pecadores ao conhecimento salvador de Cristo (2 Timóteo 3:15-17; 2 Pedro 1:20-21; Hebreus 1:1-2). Nas Escrituras, o Senhor não apenas informa: Ele convoca, confronta, consola, corrige e restaura, exercendo o seu governo por meio da Palavra (Isaías 55:10-11; Salmos 19; João 17:17).\n\n1) Diversidade histórica, unidade redentiva\n\nA singularidade das Escrituras também se evidencia em sua composição: ao longo de aproximadamente 1.600 anos (do séc. XV a.C. ao final do séc. I d.C.), por cerca de 40 autores humanos, em três idiomas (hebraico, aramaico e grego), em contextos históricos, sociais e geográficos variados. Ainda assim, por trás dessa diversidade, permanece uma coerência notável: um só Deus, uma só história e um único propósito redentor.\n\nA Bíblia não é uma colcha de retalhos de ideias religiosas, mas o drama unificado da redenção — criação, queda, redenção e consumação — que culmina na pessoa e na obra de Jesus Cristo (Lucas 24:27 e Lucas 24:44-47; Efésios 1:9-10). Por isso, a antiga máxima frequentemente associada a Agostinho continua pertinente: \"O Novo Testamento está oculto no Antigo; o Antigo está revelado no Novo.\"\n\n2) Unidade teológica e centralidade de Cristo\n\nEssa unidade não é apenas literária; é teológica e cristocêntrica. O \"fio dourado\" que atravessa toda a Escritura é o Deus da aliança, que salva um povo para si por pura graça, mediante um Mediador perfeito. O plano redentor é revelado progressivamente: desde a promessa do Descendente que esmagaria a serpente (Gênesis 3:15), passando pelas sombras do sistema sacrificial e do sacerdócio (Hebreus 9; Hebreus 10), até a plena luz do evangelho em Cristo — o Cordeiro de Deus e o último Adão (João 1:29; Romanos 5:12-21; 1 Coríntios 15:45-49).\n\nAssim, a Bíblia não é, primariamente, um manual de autoaperfeiçoamento, mas o testemunho autorizado de Deus acerca de quem Ele é e de como Ele salva.\n\n3) Canonicidade, inspiração e confiabilidade\n\nNa tradição reformada, confessamos que a revelação escrita de Deus é composta por 66 livros canônicos (39 no Antigo Testamento e 27 no Novo), recebidos como Palavra de Deus porque são \"soprados\" por Ele (2 Timóteo 3:16). A inspiração não significa que Deus apenas \"auxiliou\" os autores, mas que o Espírito Santo superintendeu a escrita de tal modo que o resultado é, ao mesmo tempo, plenamente humano e plenamente divino — verdadeiro em tudo o que afirma e totalmente digno de confiança em tudo o que ensina para a fé e a vida (2 Pedro 1:21).\n\nA tradição reformada destaca que a Escritura se autentica ao coração do crente pelo testemunho interno do Espírito Santo: não por persuasão meramente humana, mas pela própria voz de Deus selada em nós pelo Espírito. Pastoralmente, essa convicção preserva a fé de depender, em última instância, de carisma, tradição ou erudição; a confiança final repousa no Deus que fala.\n\n4) Autoridade e suficiência: a voz do próprio Deus\n\nA Confissão de Fé de Westminster expressa essa doutrina com clareza: \"a autoridade da Escritura Sagrada… depende unicamente de Deus, seu Autor, que é a verdade em si mesma\" (CFW I.4). E acrescenta que \"todo o conselho de Deus... ou está expressamente declarado na Escritura ou pode ser legitimamente deduzido dela\" (CFW I.6), afirmando a suficiência bíblica.\n\nIsso significa que a Escritura contém tudo o que é necessário para conhecer a Deus salvadoramente, para adorá-lo de modo aceitável e para viver em obediência — não que responda a toda curiosidade humana, mas que é plenamente adequada para o propósito para o qual Deus a concedeu. O Breve Catecismo de Westminster resume: \"A Palavra de Deus… é a única regra para nos dirigir em como podemos glorificar e gozar a Deus\" (BCW, Perg. 2).\n\n5) Sola Scriptura: a norma infalível que governa a Igreja\n\nDaí decorre o princípio de Sola Scriptura: somente a Escritura é a norma infalível (norma normans) que julga todas as demais autoridades. A tradição da Igreja tem valor; credos e confissões têm importância; a razão e a experiência possuem papel legítimo. Contudo, nenhuma dessas instâncias se assenta acima da Palavra. Antes, todas são chamadas a submeter-se a ela, porque somente a Escritura possui autoridade divina e, portanto, governa a doutrina, a ética, a adoração e a esperança da Igreja (Atos 17:11; Isaías 8:20; João 10:35).\n\nConclusão\n\nA Bíblia é singular não apenas por sua extensão histórica e diversidade humana, mas por sua origem e finalidade: Deus fala, Deus revela, Deus salva. Nela, o Senhor não nos entrega apenas informações sobre o céu, mas o próprio caminho de reconciliação com Ele — Jesus Cristo, anunciado em promessa e revelado em plenitude. E porque esta Palavra é de Deus, ela é eficaz: ilumina a mente, humilha o orgulho, desperta a fé, fortalece o coração e conforma o povo de Deus à imagem do Filho (Salmos 119; Romanos 10:17; Tiago 1:21-25).",
      versiculo: "Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção e para a educação na justiça. (2 Timóteo 3:16)"
    },
    questoes: [
      {
        id: 1,
        pergunta: "Quem é o verdadeiro autor das Escrituras?",
        referencias: ["2 Timóteo 3:16", "2 Pedro 1:20-21"],
        alternativas: [
          { id: "a", texto: "Seres angelicais", correta: false },
          { id: "b", texto: "O próprio Deus, por meio do Espírito Santo", correta: true },
          { id: "c", texto: "Os profetas e apóstolos por inspiração pessoal", correta: false },
          { id: "d", texto: "Os líderes religiosos da história", correta: false }
        ],
        explicacao: "Embora os livros da Bíblia tenham sido escritos por homens em contextos variados, o verdadeiro autor é o próprio Deus. Como declara Pedro, \"homens falaram da parte de Deus, movidos pelo Espírito Santo\" (2 Pedro 1:21). A inspiração é divina: os autores humanos foram instrumentos, e não originadores da mensagem."
      },
      {
        id: 2,
        pergunta: "Qual é a estrutura da Bíblia segundo a tradição reformada?",
        referencias: ["Lucas 24:44", "CFW I.2", "CFW I.3"],
        alternativas: [
          { id: "a", texto: "39 livros no total. Apenas o Antigo Testamento é canônico", correta: false },
          { id: "b", texto: "66 livros: 39 no Antigo Testamento e 27 no Novo. Todos são, igualmente, a Palavra de Deus", correta: true },
          { id: "c", texto: "73 livros, incluindo os apócrifos mencionados na tradição católica", correta: false },
          { id: "d", texto: "27 livros no total. Apenas o Novo Testamento foi aprovado por Jesus", correta: false }
        ],
        explicacao: "A tradição reformada reconhece 66 livros canônicos, inspirados por Deus. Os apócrifos, embora históricos, não têm autoridade divina (CFW I.3). A divisão da Bíblia em Antigo e Novo Testamento manifesta a progressiva revelação do plano de redenção.\n\n📚 A Confissão declara: \"Os livros comumente chamados Apócrifos... não são de autoridade divina e não devem ser usados senão como escritos humanos.\" (CFW I.3)"
      },
      {
        id: 3,
        pergunta: "Qual é o tema central da Escritura?",
        referencias: ["Lucas 24:27", "João 5:39"],
        alternativas: [
          { id: "a", texto: "Desenvolvimento moral da humanidade", correta: false },
          { id: "b", texto: "A trajetória do povo de Israel", correta: false },
          { id: "c", texto: "A revelação de Deus em Cristo para a salvação dos pecadores", correta: true },
          { id: "d", texto: "Princípios de sabedoria para o sucesso terreno", correta: false }
        ],
        explicacao: "Toda a Escritura, do Gênesis ao Apocalipse, aponta para Cristo. Ele é o centro da revelação de Deus, o cumprimento das promessas e a chave interpretativa da Bíblia. A leitura bíblica deve sempre nos conduzir a uma visão mais clara do Redentor.\n\n✝️ Martinho Lutero disse: \"A Escritura é o berço no qual Cristo é colocado.\""
      },
      {
        id: 4,
        pergunta: "O que significa dizer que a Bíblia é inerrante?",
        referencias: ["Salmos 12:6", "João 17:17"],
        alternativas: [
          { id: "a", texto: "Que ela nunca erra em sua mensagem e ensinos", correta: true },
          { id: "b", texto: "Que foi escrita diretamente por Deus sem intervenção humana", correta: false },
          { id: "c", texto: "Que nunca sofreu mudanças nos manuscritos", correta: false },
          { id: "d", texto: "Que todas as suas traduções são perfeitas", correta: false }
        ],
        explicacao: "A inerrância bíblica afirma que, nos manuscritos originais, a Palavra de Deus é totalmente isenta de erro em tudo o que ensina — quer sobre doutrina, quer sobre a realidade da vida e da história. Isso não significa que toda tradução seja perfeita, mas que a mensagem revelada por Deus é verdadeira em sua totalidade.\n\n📖 Salmos 12:6: \"As palavras do Senhor são palavras puras, como prata refinada...\"\n\n✝️ João 17:17: \"Santifica-os na verdade; a Tua palavra é a verdade.\""
      },
      {
        id: 5,
        pergunta: "Por que devemos ler e estudar a Bíblia?",
        referencias: ["2 Timóteo 3:15-17", "Salmos 1:1-3"],
        alternativas: [
          { id: "a", texto: "Para adquirir conhecimento sobre a história antiga", correta: false },
          { id: "b", texto: "Para conhecer a vontade de Deus e crescer espiritualmente", correta: true },
          { id: "c", texto: "Para termos argumentos em debates religiosos", correta: false },
          { id: "d", texto: "Para aprender como prosperar financeiramente", correta: false }
        ],
        explicacao: "Ler e estudar a Bíblia é um meio de graça pelo qual somos transformados. A Palavra nos torna sábios para a salvação (2 Timóteo 3:15), nos equipa para boas obras (2 Timóteo 3:17), e nos conduz à verdadeira prosperidade espiritual (Salmos 1:2-3).\n\n🌿 Salmos 1:2-3: \"Antes, o seu prazer está na lei do Senhor, e na sua lei medita de dia e de noite... tudo quanto fizer prosperar.\""
      },
      {
        id: 6,
        pergunta: "O que significa a suficiência das Escrituras?",
        referencias: ["2 Pedro 1:3-4", "2 Timóteo 3:16-17"],
        alternativas: [
          { id: "a", texto: "Que a Bíblia contém tudo o que precisamos para a fé e a vida cristã", correta: true },
          { id: "b", texto: "Que ela é suficiente para responder todas as questões científicas", correta: false },
          { id: "c", texto: "Que só precisamos do Novo Testamento", correta: false },
          { id: "d", texto: "Que não precisamos de mestres e pregadores", correta: false }
        ],
        explicacao: "A suficiência da Escritura ensina que tudo o que Deus quis nos revelar para a salvação e santidade está contido na Bíblia. Não precisamos de revelações modernas, nem de tradições humanas adicionais. A Palavra é completa e suficiente para nos tornar maduros na fé."
      },
      {
        id: 7,
        pergunta: "Como podemos interpretar corretamente a Bíblia?",
        referencias: ["2 Timóteo 2:15", "Neemias 8:8"],
        alternativas: [
          { id: "a", texto: "Cada um deve interpretar do seu jeito", correta: false },
          { id: "b", texto: "Buscando compreender o contexto e permitindo que a Escritura interprete a própria Escritura", correta: true },
          { id: "c", texto: "Apenas líderes religiosos podem interpretá-la", correta: false },
          { id: "d", texto: "Depende de revelações pessoais", correta: false }
        ],
        explicacao: "A interpretação correta da Escritura exige diligência, reverência e fidelidade ao sentido pretendido pelo autor inspirado. O princípio reformado da analogia da fé nos ensina que a Escritura interpreta a própria Escritura (Scriptura sui ipsius interpres), e que passagens mais claras lançam luz sobre as mais difíceis."
      },
      {
        id: 8,
        pergunta: "Qual a melhor maneira de estudar a Bíblia?",
        referencias: ["Salmos 119:18", "Atos 17:11"],
        alternativas: [
          { id: "a", texto: "Lendo um versículo aleatório por dia", correta: false },
          { id: "b", texto: "Estudando com oração, reverência e buscando entender o contexto", correta: true },
          { id: "c", texto: "Apenas ouvindo sermões", correta: false },
          { id: "d", texto: "Com base em sentimentos e experiências pessoais", correta: false }
        ],
        explicacao: "A Escritura deve ser estudada com oração, humildade e cuidado. Assim como os bereanos examinavam diariamente as Escrituras (Atos 17:11), somos chamados a buscar o entendimento com dependência do Espírito Santo e atenção ao contexto bíblico."
      },
      {
        id: 9,
        pergunta: "O que Jesus disse sobre a Escritura?",
        referencias: ["João 5:39", "João 10:35"],
        alternativas: [
          { id: "a", texto: "Que ela é apenas um guia moral", correta: false },
          { id: "b", texto: "Que não devemos segui-la literalmente", correta: false },
          { id: "c", texto: "Que ela testifica sobre Ele e não pode falhar", correta: true },
          { id: "d", texto: "Que apenas o Antigo Testamento é válido", correta: false }
        ],
        explicacao: "Jesus confirmou a autoridade, unidade e infalibilidade da Escritura. Ele declarou que as Escrituras dão testemunho dEle (João 5:39) e afirmou que a Palavra de Deus \"não pode ser anulada\" (João 10:35). Para Cristo, negar a Escritura é negar a revelação de Deus."
      },
      {
        id: 10,
        pergunta: "Como a Bíblia nos ajuda a vencer o pecado?",
        referencias: ["Salmos 119:11", "Efésios 6:17", "Mateus 4:1-11"],
        alternativas: [
          { id: "a", texto: "Dando regras para seguirmos por esforço próprio", correta: false },
          { id: "b", texto: "Servindo como um amuleto de proteção", correta: false },
          { id: "c", texto: "Renovando nossa mente e nos guiando para a santidade", correta: true },
          { id: "d", texto: "Fazendo com que Deus nos abençoe automaticamente", correta: false }
        ],
        explicacao: "A Palavra de Deus é um instrumento de santificação e proteção espiritual. O salmista diz: \"Guardei a tua palavra no coração, para não pecar contra ti\" (Salmos 119:11). Cristo usou a Escritura para resistir às tentações de Satanás no deserto (Mateus 4). O apóstolo Paulo chama a Palavra de \"espada do Espírito\" (Efésios 6:17), essencial na batalha contra o pecado."
      },
      {
        id: 11,
        pergunta: "Por que a Bíblia é chamada de 'Palavra de Deus'?",
        referencias: ["2 Timóteo 3:16", "2 Pedro 1:21"],
        alternativas: [
          { id: "a", texto: "Porque contém bons conselhos humanos", correta: false },
          { id: "b", texto: "Porque foi inspirada por Deus e revela Sua vontade", correta: true },
          { id: "c", texto: "Porque foi escrita apenas por profetas", correta: false },
          { id: "d", texto: "Porque é um livro antigo e respeitado", correta: false }
        ],
        explicacao: "A Bíblia é chamada de Palavra de Deus porque foi inspirada pelo Espírito Santo. Os autores humanos escreveram movidos por Deus, transmitindo Sua mensagem e vontade ao Seu povo (2 Timóteo 3:16; 2 Pedro 1:21)."
      },
      {
        id: 12,
        pergunta: "O que significa dizer que a Escritura é a única regra infalível de fé e prática?",
        referencias: ["Isaías 8:20", "Atos 17:11", "2 Timóteo 3:16-17"],
        alternativas: [
          { id: "a", texto: "Que devemos seguir também tradições humanas", correta: false },
          { id: "b", texto: "Que a Bíblia é suficiente e tem autoridade suprema sobre toda tradição ou opinião humana", correta: true },
          { id: "c", texto: "Que apenas o Novo Testamento é regra de fé", correta: false },
          { id: "d", texto: "Que cada um pode criar sua própria regra", correta: false }
        ],
        explicacao: "A Escritura é a única regra infalível de fé e prática porque é inspirada por Deus e suficiente para nos instruir em tudo o que diz respeito à salvação e piedade (2 Timóteo 3:16-17). Nenhuma tradição, experiência ou opinião humana pode se sobrepor à autoridade da Palavra. A Confissão de Fé de Westminster 1.6 afirma que toda a vontade de Deus necessária para a Sua glória e para a salvação, fé e vida do homem está expressa ou pode ser logicamente deduzida das Escrituras."
      }
    ],
    meditacao: [
      {
        dia: 1,
        titulo: "A Bíblia é a Palavra de Deus",
        leitura: "2 Timóteo 3:14-17; 2 Pedro 1:20-21",
        texto: "A Bíblia é a Palavra viva do Deus vivo. Ela não procede de homens, mas do próprio Deus que, por meio do Espírito Santo, inspirou os autores humanos. A Escritura não apenas contém a verdade — ela é a própria verdade revelada por Deus, suficiente para nos salvar, corrigir e formar em justiça.",
        reflexao: "Você se aproxima da Bíblia como uma voz divina e autoritativa, ou como apenas um livro religioso?",
        oracao: "Senhor, dá-me reverência pela Tua Palavra. Que eu a receba com fé e submissão, como se o próprio Senhor estivesse falando comigo."
      },
      {
        dia: 2,
        titulo: "A Inerrância das Escrituras",
        leitura: "Salmos 12:6; João 17:17",
        texto: "As Escrituras são puras, verdadeiras e sem erro. Deus é luz, e n'Ele não há treva alguma. Por isso, Sua Palavra não engana, não falha, não mente. Crer na inerrância é crer que Deus é fiel e que Sua revelação é absolutamente confiável.",
        reflexao: "Há trechos da Bíblia que você tende a relativizar ou duvidar? Por quê?",
        oracao: "Senhor, fortalece minha fé na Tua Palavra. Que eu confie em cada promessa, cada mandamento, cada verdade que Tu revelaste."
      },
      {
        dia: 3,
        titulo: "A Suficiência da Escritura",
        leitura: "2 Pedro 1:3-4; Salmos 19:7-11",
        texto: "A Escritura é suficiente para tudo que diz respeito à salvação, santidade e direção para a vida. Nada falta, nada precisa ser acrescentado. Quando buscamos conselhos em fontes humanas sem examinar a Palavra, revelamos incredulidade funcional.",
        reflexao: "Onde você tem buscado orientação — na Palavra ou nas vozes do mundo?",
        oracao: "Pai, ensina-me a confiar que a Tua Palavra é suficiente. Que ela seja minha fonte principal de sabedoria e direção."
      },
      {
        dia: 4,
        titulo: "A Autoridade das Escrituras",
        leitura: "Isaías 40:8; Mateus 24:35",
        texto: "As opiniões dos homens mudam, mas a Palavra do Senhor permanece para sempre. Ela não está sujeita à cultura, à ciência ou ao tempo. Sua autoridade é suprema, pois é a voz do Rei dos reis. A Reforma proclamou: Sola Scriptura — somente a Escritura é a regra infalível de fé e prática.",
        reflexao: "Sua vida está realmente debaixo da autoridade da Escritura? Quais áreas você resiste entregar?",
        oracao: "Senhor, dobra meu coração à Tua vontade. Que a Tua Palavra governe cada pensamento, decisão e ação minha."
      },
      {
        dia: 5,
        titulo: "O Poder Transformador da Bíblia",
        leitura: "Hebreus 4:12; Romanos 12:2",
        texto: "A Palavra de Deus é viva e eficaz. Ela discerne intenções, confronta pecados, consola em dores e transforma o caráter. Ler a Escritura não é apenas adquirir informação, mas encontrar-se com o Deus que transforma vidas.",
        reflexao: "A Palavra tem moldado sua vida ou você a lê superficialmente?",
        oracao: "Deus eterno, faz Tua Palavra penetrar minha alma, transformando minha mente, afetos e vontades conforme Cristo."
      },
      {
        dia: 6,
        titulo: "Fé: Descanso Total em Cristo",
        leitura: "João 6:29",
        texto: "Fé verdadeira é lançar-se nos braços de Cristo, confiar em Sua suficiência, abandonar todo orgulho e crer na obra perfeita da cruz.",
        reflexao: "Você vive mais guiado pela Palavra de Deus ou pelas suas percepções humanas?",
        oracao: "Senhor Jesus, Tu és suficiente. Eu confio inteiramente em Ti.",
        desafio: "Reafirme sua fé hoje, dizendo: \"Cristo basta para mim.\""
      },
      {
        dia: 7,
        titulo: "A Bíblia como Guia Diário",
        leitura: "Salmos 119:105; Mateus 7:24-27",
        texto: "A Escritura não é apenas para estudo, mas para vida. É lâmpada para nossos pés, luz para o caminho. Quem ouve e pratica a Palavra edifica a vida sobre a Rocha. Quem a ignora, constrói sobre areia. Nossa segurança está na obediência à revelação divina.",
        reflexao: "Você consulta a Palavra diariamente antes de tomar decisões? Como ela tem moldado seu dia a dia?",
        oracao: "Senhor, guia-me por Teu caminho. Que a Tua Palavra seja meu alimento diário e a base firme da minha vida."
      }
    ],
    conclusao: {
      texto: "A Bíblia é a Palavra inspirada de Deus, completamente confiável e suficiente para nos guiar em toda a vida cristã.",
      versiculo: "Toda a Escritura é inspirada por Deus e útil para o ensino, para a repreensão, para a correção e para a educação na justiça. (2 Timóteo 3:16)",
      aplicacao: [
        "Como você tem valorizado a Palavra de Deus em sua vida?",
        "De que maneira a Bíblia tem transformado seu pensamento e conduta?",
        "Qual seu compromisso com a leitura e estudo das Escrituras?"
      ]
    }
  },
  {
    id: 2,
    titulo: "A Ordem da Salvação",
    introducao: {
      texto: "A Ordem da Salvação (Ordo Salutis) é a expressão teológica usada para descrever a sequência lógica — e, em alguns aspectos, cronológica — da aplicação da redenção de Cristo ao pecador, segundo a perspectiva bíblica e reformada. Embora os teólogos reformados possam variar em nuances, existe um consenso clássico sobre os principais elementos que compõem a Ordo Salutis.\n\nAqui estão todos os principais pontos da Ordo Salutis na tradição Reformada:\n\n1. Eleição (Efésios 1:4-5)\nA escolha soberana e incondicional de Deus, antes da fundação do mundo, de determinadas pessoas para a salvação.\n\n\"Assim como nos escolheu nele antes da fundação do mundo, para sermos santos e irrepreensíveis...\" (Efésios 1:4)\n\nReferência: CFW, Capítulo 3 - \"Do Decreto Eterno de Deus\"\n\n2. Predestinação (Romanos 8:29-30)\nDeterminação divina que inclui a eleição para a vida eterna e a reprovação dos ímpios.\n\n\"Porque os que dantes conheceu também os predestinou...\" (Romanos 8:29)\n\n3. Chamado Eficaz (João 6:37 e João 6:44)\nA ação irresistível do Espírito Santo, que aplica o chamado interno e eficaz àqueles que Deus elegeu.\n\n\"Todo aquele que o Pai me dá virá a mim...\" (João 6:37)\n\nReferência: CFW, Capítulo 10 - \"Do Chamado Eficaz\"\n\n4. Regeneração (João 3:3-8)\nO novo nascimento, quando o Espírito Santo vivifica o pecador espiritualmente morto.\n\n\"Importa-vos nascer de novo.\" (Jo 3:7)\n\n5. Conversão (Fé e Arrependimento) (Efésios 2:8; Atos 11:18)\nResposta do homem regenerado: fé salvadora e arrependimento sincero.\n\n\"Pela graça sois salvos, mediante a fé; e isto não vem de vós, é dom de Deus.\" (Ef 2:8)\n\nReferência: CFW, Capítulo 14 e 15 - \"Da Fé Salvadora\" e \"Do Arrependimento para a Vida\"\n\n6. Justificação (Romanos 5:1)\nA declaração legal de Deus, perdoando os pecados do pecador e imputando a justiça de Cristo.\n\n\"Justificados, pois, mediante a fé, temos paz com Deus...\" (Rm 5:1)\n\nReferência: CFW, Capítulo 11 - \"Da Justificação\"\n\n7. Adoção (Gálatas 4:4-7)\nDeus faz do justificado Seu filho amado, com todos os privilégios decorrentes.\n\n\"Para resgatar os que estavam sob a lei, a fim de que recebêssemos a adoção de filhos.\" (Gl 4:5)\n\nReferência: CFW, Capítulo 12 - \"Da Adoção\"\n\n8. Santificação (Hebreus 12:14)\nProcesso progressivo, onde o crente é conformado à imagem de Cristo.\n\n\"Segui a paz com todos e a santificação, sem a qual ninguém verá o Senhor.\" (Hb 12:14)\n\nReferência: CFW, Capítulo 13 - \"Da Santificação\"\n\n9. Perseverança dos Santos (Filipenses 1:6)\nGarantia de que os verdadeiramente regenerados perseverarão até o fim.\n\n\"Aquele que começou boa obra em vós há de completá-la...\" (Fp 1:6)\n\nReferência: CFW, Capítulo 17 - \"Da Perseverança dos Santos\"\n\n10. Glorificação (Romanos 8:30)\nConsumação da salvação, quando o crente é perfeitamente conformado a Cristo na ressurreição.\n\n\"Aos que justificou, a esses também glorificou.\" (Romanos 8:30)\n\nResumindo a Ordo Salutis Reformada:\nEleição\nPredestinação\nChamado Eficaz\nRegeneração\nConversão (Fé e Arrependimento)\nJustificação\nAdoção\nSantificação\nPerseverança dos Santos\nGlorificação\n\nEsta sequência mostra como Deus soberanamente salva o pecador do começo ao fim, cumprindo Seu decreto eterno, operando pela graça, e glorificando a Si mesmo em todo o processo da salvação."
    },
    estudos: [
      {
        id: 1,
        titulo: "Eleição",
        introducao: {
          texto: "A doutrina da eleição é um dos pilares da teologia bíblica, destacando a soberania de Deus na salvação. Ela afirma que, antes da fundação do mundo, Deus escolheu, por Sua livre e soberana vontade, aqueles que seriam salvos, não com base em méritos ou obras humanas, mas segundo o beneplácito de Sua vontade (Efésios 1:4-5).\n\nEssa eleição é incondicional, ou seja, não depende de qualquer previsão de fé da parte de Deus ou boas obras por parte do ser humano. É um ato de graça divina, demonstrando que a salvação é totalmente obra de Deus, desde o início até a consumação. Essa doutrina traz conforto aos crentes, assegurando que sua salvação está firmemente ancorada na vontade imutável de Deus.\n\nDEFINIÇÕES\n\nA eleição é o ato eterno de Deus, pelo qual Ele escolhe em Cristo um povo para a salvação, segundo o conselho da Sua vontade e para o louvor da Sua graça.\n\nA eleição não se baseia em fé prevista, obras futuras ou mérito humano, mas unicamente na graça soberana de Deus.\n\nA eleição humilha o pecador, exalta a graça divina e fortalece a segurança do crente em Cristo.\n\nFUNDAMENTAÇÃO BÍBLICA\n\nA Escritura é clara:\n\n- Efésios 1:4-5 — \"nos escolheu nele antes da fundação do mundo...\"\n- Romanos 9:11-13 — \"para que o propósito de Deus quanto à eleição prevalecesse...\"\n- João 6:37 — \"Todo aquele que o Pai me dá virá a mim...\"\n- 2 Timóteo 1:9 — \"não segundo as nossas obras, mas conforme o seu próprio propósito e graça...\"\n\nCONFISSÃO DE FÉ DE WESTMINSTER\n\nCapítulo 3.5:\n\"Os que Deus predestinou para a vida, são escolhidos por Ele desde a eternidade, segundo o seu eterno e imutável propósito, e segundo o conselho secreto e beneplácito da sua vontade.\"\n\nBreve Catecismo de Westminster, Pergunta 20:\n\"Deus, tendo, desde toda a eternidade, escolhido alguns para a vida eterna, entrou em um pacto de graça para livrá-los do estado de pecado e miséria e trazê-los a um estado de salvação por um Redentor.\"\n\nOBJETIVO DO ESTUDO\n- Mostrar a origem da salvação: a mente eterna e graciosa de Deus\n- Humilhar o orgulho humano\n- Exaltar a graça soberana\n- Confortar o coração dos eleitos"
    },
    questoes: [
      {
        id: 1,
        pergunta: "Segundo Efésios 1:4-5, quando Deus escolheu os seus eleitos?",
        referencias: ["Efésios 1:4-5"],
        alternativas: [
          { id: "a", texto: "Antes da fundação do mundo", correta: true },
          { id: "b", texto: "Após o nascimento de Cristo", correta: false },
          { id: "c", texto: "No momento da conversão", correta: false },
          { id: "d", texto: "Após observar a fé das pessoas", correta: false }
        ],
        explicacao: "\"Nos elegeu nele antes da fundação do mundo...\" (Efésios 1:4)"
      },
      {
        id: 2,
        pergunta: "Segundo a Confissão de Fé de Westminster III.5, por que Deus elegeu alguns?",
        referencias: ["CFW 3.5"],
        alternativas: [
          { id: "a", texto: "Por serem melhores que outros", correta: false },
          { id: "b", texto: "Por Sua soberana e livre graça", correta: true },
          { id: "c", texto: "Por prever sua fé", correta: false },
          { id: "d", texto: "Por seus futuros méritos", correta: false }
        ],
        explicacao: "\"Segundo o conselho secreto e beneplácito da sua vontade.\" (CFW 3.5). A eleição é inteiramente gratuita e soberana, não baseada em previsão de mérito humano."
      },
      {
        id: 3,
        pergunta: "Em Romanos 9:11-13, qual foi a base da escolha de Jacó e não de Esaú?",
        referencias: ["Romanos 9:11-13"],
        alternativas: [
          { id: "a", texto: "Boas obras de Jacó", correta: false },
          { id: "b", texto: "Caráter humilde de Jacó", correta: false },
          { id: "c", texto: "Propósito de Deus segundo a eleição", correta: true },
          { id: "d", texto: "Parentesco natural com Abraão, independentemente da eleição", correta: false }
        ],
        explicacao: "\"Não por obras, mas por Aquele que chama.\" (Romanos 9:11). O argumento paulino destaca que a distinção entre Jacó e Esaú repousa no propósito eletivo de Deus, e não em méritos pessoais."
      },
      {
        id: 4,
        pergunta: "Segundo João 6:37, quem virá a Cristo?",
        referencias: ["João 6:37"],
        alternativas: [
          { id: "a", texto: "Aqueles que buscarem de coração sincero", correta: false },
          { id: "b", texto: "Apenas os judeus", correta: false },
          { id: "c", texto: "Somente os pobres e humildes", correta: false },
          { id: "d", texto: "Todo aquele que o Pai lhe dá", correta: true }
        ],
        explicacao: "\"Todo aquele que o Pai me dá virá a mim.\" (João 6:37). O chamado eficaz decorre diretamente da eleição divina."
      },
      {
        id: 5,
        pergunta: "Segundo 2 Timóteo 1:9, a salvação é segundo:",
        referencias: ["2 Timóteo 1:9"],
        alternativas: [
          { id: "a", texto: "O propósito e graça de Deus", correta: true },
          { id: "b", texto: "Nossas obras", correta: false },
          { id: "c", texto: "Nosso livre-arbítrio", correta: false },
          { id: "d", texto: "O batismo como causa meritória", correta: false }
        ],
        explicacao: "\"Não segundo as nossas obras, mas conforme o seu propósito e graça.\" (2 Timóteo 1:9)"
      },
      {
        id: 6,
        pergunta: "A doutrina da eleição produz no crente:",
        referencias: ["Efésios 1:4-6", "Romanos 8:28-39"],
        alternativas: [
          { id: "a", texto: "Orgulho espiritual", correta: false },
          { id: "b", texto: "Segurança humilde em Cristo", correta: true },
          { id: "c", texto: "Insegurança constante quanto à salvação", correta: false },
          { id: "d", texto: "Desejo de abandonar a fé nas provações", correta: false }
        ],
        explicacao: "Por saber que a salvação foi decidida pelo conselho eterno e imutável de Deus e consumada em Cristo, o crente descansa em graça — não em merecimento — e é levado à humildade e ao louvor (cf. Efésios 1:4-6)."
      },
      {
        id: 7,
        pergunta: "O objetivo final da eleição, segundo Efésios 1:6, é:",
        referencias: ["Efésios 1:6"],
        alternativas: [
          { id: "a", texto: "Exaltação humana perante os homens", correta: false },
          { id: "b", texto: "Justiça própria diante de Deus", correta: false },
          { id: "c", texto: "Louvor da glória da graça de Deus", correta: true },
          { id: "d", texto: "Louvor dos eleitos como mérito próprio", correta: false }
        ],
        explicacao: "\"Para louvor da glória da sua graça.\" (Efésios 1:6)"
      },
      {
        id: 8,
        pergunta: "Segundo Atos 13:48, quem crerá no Evangelho?",
        referencias: ["Atos 13:48"],
        alternativas: [
          { id: "a", texto: "Quem desejar de coração, sem distinção divina", correta: false },
          { id: "b", texto: "Todos os ouvintes indistintamente", correta: false },
          { id: "c", texto: "Quem fizer boas obras antes de crer", correta: false },
          { id: "d", texto: "Quem Deus destinar para a vida eterna", correta: true }
        ],
        explicacao: "\"Creram todos os que haviam sido destinados para a vida eterna.\" (Atos 13:48)"
      },
      {
        id: 9,
        pergunta: "Segundo a CFW 3.6, o que Deus também determinou para os eleitos, além do fim (vida eterna)?",
        referencias: ["CFW 3.6"],
        alternativas: [
          { id: "a", texto: "Os meios pelos quais os eleitos são efetivamente chamados, justificados, adotados, santificados e guardados para a salvação", correta: true },
          { id: "b", texto: "Que os eleitos seriam salvos sem fé, sem chamado eficaz e sem santificação", correta: false },
          { id: "c", texto: "Que os eleitos poderiam cair total e finalmente da graça", correta: false },
          { id: "d", texto: "Que a eleição dependeria de méritos previstos no homem", correta: false }
        ],
        explicacao: "CFW 3.6 ensina que Deus não só predestinou alguns para a glória, mas também preordenou todos os meios para que cheguem a ela."
      },
      {
        id: 10,
        pergunta: "A doutrina da eleição deve produzir nos crentes:",
        referencias: ["CFW 3.8"],
        alternativas: [
          { id: "a", texto: "Preguiça espiritual e descuido das Escrituras", correta: false },
          { id: "b", texto: "Amor e louvor a Deus", correta: true },
          { id: "c", texto: "Desprezo arrogante pelos perdidos", correta: false },
          { id: "d", texto: "Indiferença à santidade e à obediência", correta: false }
        ],
        explicacao: "CFW 3.8 — \"Motivo de louvor, reverência e humildade.\""
      },
      {
        id: 11,
        pergunta: "Quem são os eleitos, segundo 1 Tessalonicenses 1:4-5?",
        referencias: ["1 Tessalonicenses 1:4-5"],
        alternativas: [
          { id: "a", texto: "Os que pertencem etnicamente a Israel", correta: false },
          { id: "b", texto: "Aqueles em quem o evangelho operou também em poder do Espírito", correta: true },
          { id: "c", texto: "Aqueles que guardam a lei como fundamento da eleição", correta: false },
          { id: "d", texto: "Todos os que foram batizados na infância", correta: false }
        ],
        explicacao: "\"Sabendo, amados irmãos, a vossa eleição, porque o nosso evangelho não chegou até vós somente em palavras, mas também em poder.\" (1 Tessalonicenses 1:4-5)"
      },
      {
        id: 12,
        pergunta: "Qual deve ser a resposta do eleito à graça de Deus, segundo Romanos 12:1?",
        referencias: ["Romanos 12:1"],
        alternativas: [
          { id: "a", texto: "Apresentar o corpo em sacrifício vivo, santo e agradável a Deus", correta: true },
          { id: "b", texto: "Descaso e vida despreocupada com a vontade divina", correta: false },
          { id: "c", texto: "Indiferença espiritual, desde que esteja na igreja", correta: false },
          { id: "d", texto: "Continuar em pecado para que abunde a graça", correta: false }
        ],
        explicacao: "\"Apresentai os vossos corpos em sacrifício vivo, santo e agradável a Deus.\" (Romanos 12:1)"
      },
      {
        id: 13,
        pergunta: "Qual é a base da eleição segundo Efésios 1:4-5?",
        referencias: ["Efésios 1:4-5"],
        alternativas: [
          { id: "a", texto: "Fé e boas obras previstas nos eleitos", correta: false },
          { id: "b", texto: "Justiça própria conquistada pelos crentes", correta: false },
          { id: "c", texto: "O beneplácito da vontade de Deus em Cristo", correta: true },
          { id: "d", texto: "Arrependimento como condição anterior ao decreto", correta: false }
        ],
        explicacao: "Efésios 1:4-5 ensina que Deus nos escolheu em Cristo antes da fundação do mundo, segundo o beneplácito de Sua vontade, e não com base em qualquer mérito humano."
      },
      {
        id: 14,
        pergunta: "Segundo Romanos 9:13 (citando Malaquias 1:2-3), o que a declaração \"Amei Jacó e aborreci Esaú\" evidencia no argumento paulino?",
        referencias: ["Romanos 9:10-13", "Malaquias 1:2-3"],
        alternativas: [
          { id: "a", texto: "Que Deus amou Jacó por ser moralmente superior a Esaú", correta: false },
          { id: "b", texto: "Que Esaú foi rejeitado apenas em razão de suas más obras futuras", correta: false },
          { id: "c", texto: "Que o texto versa só sobre nações, sem relação com a doutrina da eleição", correta: false },
          { id: "d", texto: "O propósito soberano de Deus na distinção, já antes do nascimento dos gêmeos", correta: true }
        ],
        explicacao: "Paulo cita as palavras de Malaquias para sustentar que a distinção divina não se baseia em mérito humano, mas no conselho de Deus (contexto de Romanos 9:10-13)."
      },
      {
        id: 15,
        pergunta: "Em João 15:16, o que Jesus afirma sobre a escolha dos discípulos?",
        referencias: ["João 15:16"],
        alternativas: [
          { id: "a", texto: "Que foram eles que, em primeiro lugar, escolheram segui-Lo", correta: false },
          { id: "b", texto: "Que Ele os escolheu para irem e darem fruto duradouro", correta: true },
          { id: "c", texto: "Que a escolha foi mútua entre eles e o Senhor", correta: false },
          { id: "d", texto: "Que a eleição dependia antes de tudo da vontade deles", correta: false }
        ],
        explicacao: "Jesus afirma que não foram os discípulos que O escolheram, mas Ele os escolheu para irem e darem fruto, e para que o fruto deles permaneça."
      },
      {
        id: 16,
        pergunta: "Segundo João 6:44, quem virá a Cristo?",
        referencias: ["João 6:44"],
        alternativas: [
          { id: "a", texto: "Todo aquele que, por si só, decidir vir a Jesus", correta: false },
          { id: "b", texto: "Quem primeiro buscar a Deus por esforço próprio", correta: false },
          { id: "c", texto: "Aquele a quem o Pai atrair", correta: true },
          { id: "d", texto: "Quem cumprir integralmente a lei antes de vir", correta: false }
        ],
        explicacao: "\"Ninguém pode vir a mim, se o Pai... o não atrair.\" (João 6:44) — o chamado eficaz está em harmonia com a eleição e a obra do Pai."
      },
      {
        id: 17,
        pergunta: "O que significa \"eleição incondicional\" na teologia reformada?",
        referencias: ["CFW 3.5", "Efésios 1:4-5"],
        alternativas: [
          { id: "a", texto: "Que a escolha de Deus não depende de fé ou obras humanas como condição", correta: true },
          { id: "b", texto: "Que Deus escolhe com base na fé prevista nos eleitos", correta: false },
          { id: "c", texto: "Que todos os homens serão salvos, haja ou não fé", correta: false },
          { id: "d", texto: "Que a eleição é outorgada segundo obras futuras merecidas", correta: false }
        ],
        explicacao: "A eleição incondicional afirma que Deus escolhe quem será salvo não com base em mérito, fé ou obra humana como condição, mas segundo Seu eterno decreto e graça (CFW 3.5)."
      },
      {
        id: 18,
        pergunta: "Em 1 Coríntios 1:27-29, por que Deus escolheu as coisas loucas e fracas do mundo?",
        referencias: ["1 Coríntios 1:27-29"],
        alternativas: [
          { id: "a", texto: "Porque não havia pessoas melhores disponíveis", correta: false },
          { id: "b", texto: "Para mostrar que a sabedoria humana salva", correta: false },
          { id: "c", texto: "Para que os humildes se gloriem em si mesmos", correta: false },
          { id: "d", texto: "Para envergonhar o sábio e o forte e para que ninguém se glorie diante de Deus", correta: true }
        ],
        explicacao: "Deus escolheu o que é insensato e fraco aos olhos do mundo para envergonhar o sábio e o forte, \"para que, ante Deus, ninguém se glorie\" (1 Coríntios 1:29)."
      },
      {
        id: 19,
        pergunta: "Segundo João 10:27-28, quem são, de fato, as ovelhas do Bom Pastor?",
        referencias: ["João 10:27-28"],
        alternativas: [
          { id: "a", texto: "Toda a humanidade sem distinção alguma", correta: false },
          { id: "b", texto: "Apenas aqueles que mais se esforçam pela moralidade", correta: false },
          { id: "c", texto: "As que ouvem a voz de Cristo, às quais Ele dá a vida eterna", correta: true },
          { id: "d", texto: "Somente os descendentes naturais de Abraão", correta: false }
        ],
        explicacao: "\"As minhas ovelhas ouvem a minha voz... e eu lhes dou a vida eterna.\" (João 10:27-28) — coerente com o rebanho dado pelo Pai ao Filho."
      }
        ],
        meditacao: [
      {
        dia: 1,
            titulo: "Eleição: Uma Graça Imerecida",
            leitura: "Efésios 1:4-5",
            texto: "A eleição nos lembra que Deus nos amou antes que existíssemos. Ele nos escolheu não por méritos, não por obras, mas puramente por Sua graça. Deus nos amou porque assim Lhe agradou.",
            reflexao: "Durante o dia, repita para si: \"Fui amado por Deus antes de tudo existir.\"",
            oracao: "Senhor, obrigado por me amares sem que eu merecesse. Que eu nunca me glorie em mim mesmo, mas sempre em Ti.",
            desafio: "Durante o dia, repita para si: \"Fui amado por Deus antes de tudo existir.\""
      },
      {
        dia: 2,
            titulo: "Eleição: Segura em Deus",
            leitura: "Romanos 8:33",
            texto: "Quem pode destruir a obra de Deus? Quem pode separar o eleito do amor do Pai? A eleição garante a segurança eterna dos filhos de Deus.",
            reflexao: "Sua segurança está em Deus ou em seus próprios esforços?",
            oracao: "Pai, dá-me descanso em Teu cuidado eterno. Que eu viva sem medo, pois pertenço a Ti.",
            desafio: "Escreva numa folha: \"Nada pode me separar do amor de Deus.\" E deixe num lugar visível."
      },
      {
        dia: 3,
            titulo: "Eleição: Fruto de Santidade",
            leitura: "Efésios 1:4",
            texto: "A eleição não é desculpa para o pecado, mas chamado para a santidade. Deus nos elegeu para sermos semelhantes a Cristo.",
            reflexao: "Como a eleição tem te motivado à santidade?",
            oracao: "Senhor, ajuda-me a viver como Teu filho separado do mundo, puro em palavras, atos e pensamentos.",
            desafio: "Escolha hoje um pecado para mortificar e lute contra ele em oração."
      },
      {
        dia: 4,
            titulo: "Eleição: Um Chamado ao Louvor",
            leitura: "Efésios 1:6",
            texto: "A eleição não exalta o homem, mas Deus. Quanto mais eu entendo que tudo é graça, mais o meu coração explode em louvor.",
            reflexao: "Como você tem expressado gratidão pela graça de Deus?",
            oracao: "Deus bendito, que minha vida cante para sempre: Soli Deo Gloria!",
            desafio: "Escolha um salmo para cantar ou ler em adoração hoje."
      },
      {
        dia: 5,
            titulo: "Eleição: Fonte de Humildade",
            leitura: "1 Coríntios 1:27-29",
            texto: "A eleição destrói todo orgulho. Se fui salvo foi pura graça. A doutrina da eleição nos leva à humildade.",
            reflexao: "Como a doutrina da eleição tem afetado seu orgulho?",
            oracao: "Senhor, livra-me de toda arrogância espiritual. Tudo o que sou vem de Ti.",
            desafio: "Sirva alguém hoje de forma prática e discreta."
      },
      {
        dia: 6,
            titulo: "Eleição: Motivação para Evangelizar",
            leitura: "Atos 13:48",
            texto: "A eleição não anula a evangelização. Ela a garante! Quem prega sabe que o Espírito aplicará a Palavra no coração dos eleitos.",
            reflexao: "Como a doutrina da eleição afeta seu zelo evangelístico?",
            oracao: "Deus, dá-me ousadia para pregar o Evangelho e confiar que Tu salvarás os Teus.",
            desafio: "Fale de Cristo hoje a alguém."
      },
      {
        dia: 7,
            titulo: "Eleição: Glória Futura Garantida",
            leitura: "Romanos 8:30",
            texto: "A eleição não termina aqui. Ela garante a glorificação futura dos santos. Um dia estaremos com Cristo, livres do pecado e da dor.",
            reflexao: "Como a certeza da glorificação afeta sua vida hoje?",
            oracao: "Pai, mantém meus olhos na eternidade. Prepara-me para o céu.",
            desafio: "Pense em como seria viver eternamente com Cristo. Anote o que mais deseja ver ou viver na glória."
          }
        ]
      },
      {
        id: 2,
        titulo: "Predestinação",
        introducao: {
          texto: "A doutrina da predestinação afirma que Deus, em Seu eterno decreto, ordenou tudo o que acontece, incluindo o destino final de todas as pessoas, para a manifestação de Sua glória. Esta doutrina está intimamente ligada à eleição, mas é mais ampla, abrangendo todo o propósito eterno de Deus.\n\nDEFINIÇÕES\n\n\"A predestinação é o decreto eterno de Deus pelo qual Ele determinou o destino de todas as Suas criaturas racionais, para a manifestação de Sua glória.\"\n\n\"A predestinação inclui tanto a eleição quanto a reprovação, manifestando a soberania absoluta de Deus sobre todas as Suas criaturas.\"\n\n\"Chamamos predestinação o eterno decreto de Deus pelo qual Ele determinou o que queria fazer de cada homem.\"\n\nFUNDAMENTAÇÃO BÍBLICA\n\nRomanos 8:29-30 — \"Porque os que dantes conheceu também os predestinou...\"\n\nEfésios 1:11 — \"Nele, digo, em quem também fomos feitos herança, havendo sido predestinados...\"\n\nAtos 4:27-28 — \"Para fazerem tudo o que a tua mão e o teu propósito predestinaram...\"\n\nCONFISSÃO DE FÉ DE WESTMINSTER\n\nCapítulo 3.3-4:\n\"Pelo decreto de Deus, para a manifestação de sua glória, alguns homens e anjos são predestinados para a vida eterna, e outros preordenados para a morte eterna. Estes anjos e homens, assim predestinados e preordenados, são particular e imutavelmente designados...\"\n\nOBJETIVO DO ESTUDO\n- Compreender a amplitude do decreto eterno de Deus\n- Reconhecer a soberania absoluta de Deus\n- Humilhar-se diante do mistério divino\n- Glorificar a Deus por Seu sábio propósito"
    },
    questoes: [
      {
            id: 1,
            pergunta: "Segundo Romanos 8:29-30, o que precede a predestinação?",
            referencias: ["Romanos 8:29-30"],
            alternativas: [
              { id: "a", texto: "Fé humana", correta: false },
              { id: "b", texto: "Presciência divina", correta: true },
              { id: "c", texto: "Obras humanas", correta: false },
              { id: "d", texto: "Decisão pessoal", correta: false }
            ],
            explicacao: "\"Porquanto aos que de antemão conheceu, também os predestinou...\" (Romanos 8:29). A presciência divina é o conhecimento prévio que Deus tem de todas as coisas, não por mera previsão, mas por ter Ele estabelecido todas as coisas que existem e acontecem."
          },
          {
            id: 2,
            pergunta: "Como a predestinação se relaciona com a evangelização?",
            referencias: ["2 Timóteo 2:10", "Atos 18:9-10"],
            alternativas: [
              { id: "a", texto: "Torna-a desnecessária", correta: false },
              { id: "b", texto: "Motiva-a e encoraja-a", correta: true },
              { id: "c", texto: "Impede-a", correta: false },
              { id: "d", texto: "Não tem relação", correta: false }
            ],
            explicacao: "A predestinação encoraja a evangelização, pois Deus tem Seu povo escolhido que responderá ao evangelho."
          },
          {
            id: 3,
            pergunta: "Qual a relação entre predestinação e oração?",
            referencias: ["Mateus 6:10", "Tiago 4:15"],
            alternativas: [
              { id: "a", texto: "A predestinação torna a oração inútil", correta: false },
              { id: "b", texto: "A oração é um meio ordenado por Deus", correta: true },
              { id: "c", texto: "Não há relação entre elas", correta: false },
              { id: "d", texto: "A oração muda o decreto de Deus", correta: false }
            ],
            explicacao: "A oração é um dos meios pelos quais Deus executa Seu decreto eterno."
          },
          {
            id: 4,
            pergunta: "Segundo Atos 4:27-28, até mesmo a crucificação de Cristo foi:",
            referencias: ["Atos 4:27-28"],
            alternativas: [
              { id: "a", texto: "Um acidente histórico", correta: false },
              { id: "b", texto: "Predestinada por Deus", correta: true },
              { id: "c", texto: "Apenas decisão humana", correta: false },
              { id: "d", texto: "Um plano dos judeus", correta: false }
            ],
            explicacao: "\"Para fazerem tudo o que a tua mão e o teu propósito predestinaram que sucedesse.\" (Atos 4:28)"
          },
          {
            id: 5,
            pergunta: "O que a predestinação revela sobre o caráter de Deus?",
            referencias: ["Romanos 11:33-36"],
            alternativas: [
              { id: "a", texto: "Apenas Sua justiça", correta: false },
              { id: "b", texto: "Sua sabedoria e soberania", correta: true },
              { id: "c", texto: "Somente Sua misericórdia", correta: false },
              { id: "d", texto: "Apenas Seu poder", correta: false }
            ],
            explicacao: "A predestinação manifesta a profundidade das riquezas da sabedoria e do conhecimento de Deus."
          },
          {
            id: 6,
            pergunta: "Como a predestinação afeta nossa vida de oração?",
            referencias: ["Mateus 6:10"],
            alternativas: [
              { id: "a", texto: "Torna a oração desnecessária", correta: false },
              { id: "b", texto: "É um meio de realizar o decreto", correta: true },
              { id: "c", texto: "Anula o valor da oração", correta: false },
              { id: "d", texto: "Não tem relação com a oração", correta: false }
            ],
            explicacao: "A oração é um dos meios ordenados por Deus para cumprir Seus decretos eternos."
          },
          {
            id: 7,
            pergunta: "Qual a relação entre predestinação e responsabilidade humana?",
            referencias: ["Filipenses 2:12-13"],
            alternativas: [
              { id: "a", texto: "São contraditórias", correta: false },
              { id: "b", texto: "Coexistem harmoniosamente", correta: true },
              { id: "c", texto: "A predestinação elimina a responsabilidade", correta: false },
              { id: "d", texto: "São mutuamente excludentes", correta: false }
            ],
            explicacao: "Deus opera em nós o querer e o realizar, mas devemos trabalhar nossa salvação com temor e tremor."
          },
          {
            id: 8,
            pergunta: "Como a predestinação deve afetar nossa evangelização?",
            referencias: ["Atos 18:9-10"],
            alternativas: [
              { id: "a", texto: "Desestimula o evangelismo", correta: false },
              { id: "b", texto: "Encoraja a proclamação", correta: true },
              { id: "c", texto: "Torna-a desnecessária", correta: false },
              { id: "d", texto: "Não tem relação", correta: false }
            ],
            explicacao: "A certeza de que Deus tem seu povo escolhido nos encoraja a pregar sem medo."
          },
          {
            id: 9,
            pergunta: "O que a predestinação produz no crente?",
            referencias: ["Romanos 8:28-30"],
            alternativas: [
              { id: "a", texto: "Orgulho espiritual", correta: false },
              { id: "b", texto: "Humilde confiança", correta: true },
              { id: "c", texto: "Passividade total", correta: false },
              { id: "d", texto: "Desespero", correta: false }
            ],
            explicacao: "A predestinação produz segurança e humildade, sabendo que tudo coopera para o bem dos que amam a Deus."
          },
          {
            id: 10,
            pergunta: "Qual o propósito final da predestinação?",
            referencias: ["Efésios 1:5-6"],
            alternativas: [
              { id: "a", texto: "Felicidade humana", correta: false },
              { id: "b", texto: "Glória de Deus", correta: true },
              { id: "c", texto: "Salvação universal", correta: false },
              { id: "d", texto: "Condenação dos ímpios", correta: false }
            ],
            explicacao: "Todo o decreto visa o louvor da glória da graça de Deus."
          },
          {
            id: 11,
            pergunta: "Como devemos tratar esta doutrina?",
            referencias: ["Deuteronômio 29:29"],
            alternativas: [
              { id: "a", texto: "Com especulação curiosa", correta: false },
              { id: "b", texto: "Com humilde adoração", correta: true },
              { id: "c", texto: "Com rejeição total", correta: false },
              { id: "d", texto: "Com indiferença", correta: false }
            ],
            explicacao: "As coisas secretas pertencem ao Senhor, mas as reveladas são para nós e nossos filhos."
          },
          {
            id: 12,
            pergunta: "O que a doutrina da salvação ensina que a predestinação:",
            referencias: ["2 Tessalonicenses 2:13"],
            alternativas: [
              { id: "a", texto: "Depende do homem", correta: false },
              { id: "b", texto: "É totalmente de Deus", correta: true },
              { id: "c", texto: "É parcialmente divina", correta: false },
              { id: "d", texto: "É incerta", correta: false }
            ],
            explicacao: "Deus nos escolheu desde o princípio para a salvação, mediante a santificação do Espírito e fé na verdade."
          }
        ],
        meditacao: [
          {
            dia: 1,
            titulo: "O Propósito Eterno de Deus",
            leitura: "Efésios 1:11",
            texto: "Deus não age por acaso. Cada detalhe da história está sob Seu controle soberano. Isso nos dá conforto em tempos difíceis e humildade em tempos prósperos.",
            reflexao: "Como a soberania de Deus afeta sua visão das circunstâncias atuais?",
            oracao: "Senhor, ajuda-me a confiar em Teu propósito eterno, mesmo quando não entendo Teus caminhos.",
            desafio: "Liste três situações difíceis e ore reconhecendo o controle de Deus sobre elas."
          },
          {
            dia: 2,
            titulo: "A Soberania Divina no Decreto Eterno",
            leitura: "Efésios 1:11",
            texto: "O decreto de Deus abrange todas as coisas. Nada acontece por acaso. Isso nos dá paz em meio às tempestades da vida.",
            reflexao: "Como a soberania de Deus te conforta nas dificuldades?",
            oracao: "Pai, ajuda-me a descansar em Teu controle soberano sobre todas as coisas.",
            desafio: "Identifique uma situação difícil e confie-a ao controle de Deus."
          },
          {
            dia: 3,
            titulo: "A Presciência Divina",
            leitura: "Romanos 8:29",
            texto: "Deus conhece todos os planos e propósitos antes que eles aconteçam. Ele sabe o que vai acontecer antes mesmo de acontecer. Isso nos dá paz e confiança em tempos difíceis.",
            reflexao: "Como a presciência divina afeta sua vida hoje?",
            oracao: "Pai, ensina-me a confiar em Teu plano eterno, mesmo quando não entendo o que está por vir.",
            desafio: "Liste três situações futuras que você gostaria de entender melhor."
          },
          {
            dia: 4,
            titulo: "A Justiça Divina",
            leitura: "Romanos 3:21-26",
            texto: "Deus é justo e justo é Deus. Ele não vê as pessoas pelo que fazem, mas pelo que são. Ele vê o coração e o pensamento. Isso nos dá esperança e confiança em nossas lutas.",
            reflexao: "Como a justiça divina afeta sua vida cristã?",
            oracao: "Pai, ensina-me a viver como um justo, para que eu possa ser justo como Tu.",
            desafio: "Liste três situações em que você sente falta de justiça em sua vida."
          },
          {
            dia: 5,
            titulo: "A Graça Divina",
            leitura: "Efésios 2:4-7",
            texto: "A graça de Deus é uma bênção que nos transforma e nos dá poder para viver de acordo com a vontade de Deus. É uma força que nos ajuda a superar o pecado e a viver santamente.",
            reflexao: "Como a graça divina afeta sua vida cristã?",
            oracao: "Deus, dá-me a graça que eu precise hoje para viver de acordo com a tua vontade.",
            desafio: "Pense em uma situação em que você sentiu falta de graça divina e ora para pedir ajuda."
          },
          {
            dia: 6,
            titulo: "A Predisposição Divina",
            leitura: "Romanos 8:28",
            texto: "Deus nos criou com uma predisposição para viver de acordo com a vontade dele. Isso nos dá uma tendência natural para agir de acordo com a vontade de Deus.",
            reflexao: "Como a predisposição divina afeta sua vida cristã?",
            oracao: "Pai, ensina-me a reconhecer e seguir a tua vontade em todas as coisas.",
            desafio: "Liste três situações em que você sentiu que Deus estava guiando sua vida."
          },
          {
            dia: 7,
            titulo: "A Admissão Divina",
            leitura: "Romanos 8:30",
            texto: "Deus nos aduz para a vida eterna. Ele nos dá a oportunidade de viver de acordo com a vontade dele. Isso nos dá esperança e confiança em nossas lutas.",
            reflexao: "Como a admissão divina afeta sua vida cristã?",
            oracao: "Pai, ensina-me a confiar em Teu plano eterno, mesmo quando não entendo o que está por vir.",
            desafio: "Liste três situações em que você sentiu falta de admissão divina em sua vida."
          }
        ]
      },
      {
        id: 3,
        titulo: "Chamado Eficaz",
        introducao: {
          texto: "O Chamado Eficaz é aquele ato soberano de Deus, pelo qual Ele, através da pregação da Palavra e pelo poder do Espírito Santo, chama interiormente os Seus eleitos da morte espiritual para a vida, concedendo-lhes arrependimento e fé.\n\nDEFINIÇÕES\n\nDefinição 1:\n\"O chamado eficaz não consiste meramente em persuasão externa, mas é acompanhado de uma operação poderosa do Espírito, que infalivelmente conduz o pecador a Cristo.\"\n\nDefinição 2:\n\"Há um chamado externo, resistido por muitos; porém o chamado eficaz é vitorioso, pois Deus convence, ilumina e vivifica o coração.\"\n\nSíntese doutrinária:\n\"É o Espírito de Deus quem aplica eficazmente a Palavra ao coração, tornando viva e frutífera a pregação do evangelho.\"\n\nFUNDAMENTAÇÃO BÍBLICA\n\nJoão 6:37 — \"Todo aquele que o Pai me dá virá a mim.\"\n\nJoão 6:44 — \"Ninguém pode vir a mim se o Pai que me enviou não o trouxer.\"\n\nRomanos 8:30 — \"Aos que chamou, a esses também justificou.\"\n\n2 Timóteo 1:9 — \"Chamou-nos com santa vocação, não segundo as nossas obras, mas conforme o seu próprio propósito.\"\n\nEzequiel 36:26-27 — \"Dar-vos-ei coração novo.\"\n\nCONFISSÃO DE FÉ DE WESTMINSTER — Cap. 10.1\n\"Aos que Deus predestinou para a vida, Ele se apraz em chamar eficazmente, em Seu tempo designado e por Sua Palavra e Espírito, tirando-os do estado de pecado e morte para a graça e salvação em Jesus Cristo.\""
        },
        questoes: [
          {
            id: 1,
            pergunta: "Qual é a origem do chamado eficaz segundo 2 Timóteo 1:9?",
            referencias: ["2 Timóteo 1:9", "Efésios 2:4-5", "Romanos 9:11", "CFW 10.1"],
            alternativas: [
              { id: "a", texto: "Nossas boas obras", correta: false },
              { id: "b", texto: "Decisão humana", correta: false },
              { id: "c", texto: "Propósito e graça de Deus", correta: true },
              { id: "d", texto: "Mérito da fé", correta: false }
            ],
            explicacao: "O chamado eficaz é obra do propósito soberano de Deus. Como resume a CFW 10.1, Deus chama os seus \"por sua Palavra e Espírito\", tirando-os do estado de pecado e morte para a graça em Cristo."
          },
          {
            id: 2,
            pergunta: "Qual é o efeito imediato do chamado eficaz segundo João 6:44?",
            referencias: ["João 6:37", "João 6:44", "1 Coríntios 1:24"],
            alternativas: [
              { id: "a", texto: "Persuasão racional", correta: false },
              { id: "b", texto: "Convite externo apenas", correta: false },
              { id: "c", texto: "Atração eficaz para Cristo", correta: true },
              { id: "d", texto: "Livre decisão do homem", correta: false }
            ],
            explicacao: "Deus não apenas convida os homens por meio da Palavra, mas os atrai eficazmente por Seu Espírito. Em João 6:44, o verbo \"atrair\" aponta para a ação eficaz do Pai no coração."
  },
  {
    id: 3,
            pergunta: "O chamado eficaz ocorre por meio de qual instrumento ordinário?",
            referencias: ["Romanos 10:17", "1 Coríntios 1:21", "Tiago 1:18"],
            alternativas: [
              { id: "a", texto: "Sonhos espirituais", correta: false },
              { id: "b", texto: "Pregação da Palavra", correta: true },
              { id: "c", texto: "Emoções religiosas", correta: false },
              { id: "d", texto: "Obras da lei", correta: false }
            ],
            explicacao: "A Confissão de Fé de Westminster (10.1) afirma que Deus chama os Seus \"pela Sua Palavra e Espírito\". O Espírito aplica a Palavra de modo eficaz ao coração."
          },
          {
            id: 4,
            pergunta: "Como Paulo descreve o chamado eficaz em Romanos 8:30?",
            referencias: ["Romanos 8:30", "Romanos 11:29", "Efésios 1:18"],
            alternativas: [
              { id: "a", texto: "Um chamado que pode ser resistido", correta: false },
              { id: "b", texto: "Um convite geral", correta: false },
              { id: "c", texto: "Um chamado eficaz e inseparável da justificação", correta: true },
              { id: "d", texto: "Uma oferta condicional", correta: false }
            ],
            explicacao: "Todos os que são chamados eficazmente são justificados. A cadeia de Romanos 8:30 é inquebrantável e mostra a segurança do decreto de Deus."
          },
          {
            id: 5,
            pergunta: "Qual é a evidência do chamado eficaz na vida do crente?",
            referencias: ["1 Coríntios 1:24", "João 10:27", "Gálatas 1:15-16"],
            alternativas: [
              { id: "a", texto: "Perfeição moral", correta: false },
              { id: "b", texto: "Desejo por Cristo", correta: true },
              { id: "c", texto: "Êxtase emocional", correta: false },
              { id: "d", texto: "Simples tradição religiosa", correta: false }
            ],
            explicacao: "Os verdadeiramente chamados são aqueles que passaram a valorizar Cristo como o tesouro supremo."
          },
          {
            id: 6,
            pergunta: "O chamado eficaz transforma a vontade humana, segundo Ezequiel 36:26-27?",
            referencias: ["Ezequiel 36:26-27", "Filipenses 2:13", "João 3:5-6", "CFW 10.1"],
            alternativas: [
              { id: "a", texto: "A vontade humana coopera primeiro", correta: false },
              { id: "b", texto: "Deus espera a resposta humana", correta: false },
              { id: "c", texto: "Deus regenera e dá novo coração", correta: true },
              { id: "d", texto: "A regeneração depende da vontade", correta: false }
            ],
            explicacao: "O chamado eficaz inclui a regeneração, um ato sobrenatural que transforma a natureza. A CFW 10.1 descreve isso como receber \"coração de pedra\" removido e \"coração de carne\" concedido."
          },
          {
            id: 7,
            pergunta: "O que distingue o chamado eficaz do chamado geral?",
            referencias: ["Mateus 22:14", "João 10:26-27", "Atos 16:14"],
            alternativas: [
              { id: "a", texto: "O chamado eficaz é mais insistente", correta: false },
              { id: "b", texto: "O chamado geral usa outra linguagem", correta: false },
              { id: "c", texto: "O chamado eficaz é interno e irresistível", correta: true },
              { id: "d", texto: "Não há diferença", correta: false }
            ],
            explicacao: "A Confissão (10.2): \"Esse chamado é da exclusiva graça de Deus, e não depende de algo previsto no homem.\" Muitos são chamados externamente, mas os eleitos são chamados eficazmente (cf. Mateus 22:14)."
      },
      {
        id: 8,
            pergunta: "Qual é o papel do Espírito Santo no chamado eficaz?",
            referencias: ["João 3:8", "1 Coríntios 2:12", "Tito 3:5"],
        alternativas: [
              { id: "a", texto: "Esclarecer doutrinas", correta: false },
              { id: "b", texto: "Convencer apenas externamente", correta: false },
              { id: "c", texto: "Regenerar e aplicar a Palavra", correta: true },
              { id: "d", texto: "Julgar os pecadores", correta: false }
            ],
            explicacao: "O Espírito não apenas ilumina, mas cria nova vida."
      },
      {
        id: 9,
            pergunta: "Quem são os verdadeiros receptores do chamado eficaz?",
            referencias: ["João 10:27", "Romanos 8:28", "Atos 13:48"],
        alternativas: [
              { id: "a", texto: "Todos os que ouvem o evangelho", correta: false },
              { id: "b", texto: "Os que fazem boas obras", correta: false },
              { id: "c", texto: "Os eleitos de Deus", correta: true },
              { id: "d", texto: "Os que pedem sinais", correta: false }
            ],
            explicacao: "A voz de Cristo só é eficaz nas ovelhas que Lhe foram dadas pelo Pai."
      },
      {
        id: 10,
            pergunta: "O chamado eficaz conduz inevitavelmente a quê?",
            referencias: ["Romanos 8:30", "João 6:39", "Filipenses 1:6"],
        alternativas: [
              { id: "a", texto: "Possibilidade de salvação", correta: false },
              { id: "b", texto: "Emoção religiosa", correta: false },
              { id: "c", texto: "Justificação e glorificação", correta: true },
              { id: "d", texto: "Nova tentativa de obediência", correta: false }
            ],
            explicacao: "O chamado eficaz é eficaz precisamente porque é acompanhado pela justificação e culmina na glória."
          },
          {
            id: 11,
            pergunta: "Por que nem todos que ouvem o evangelho respondem com fé?",
            referencias: ["João 8:43", "1 Coríntios 2:14", "2 Coríntios 4:4"],
            alternativas: [
              { id: "a", texto: "Falta de interesse", correta: false },
              { id: "b", texto: "Obstinação natural", correta: false },
              { id: "c", texto: "Ausência do chamado eficaz", correta: true },
              { id: "d", texto: "Cultura contrária", correta: false }
            ],
            explicacao: "A Palavra só surte efeito quando o Espírito abre os corações para recebê-la."
          },
          {
            id: 12,
            pergunta: "Qual é a resposta natural ao chamado eficaz?",
            referencias: ["Atos 16:14", "Salmos 110:3", "João 1:12-13"],
            alternativas: [
              { id: "a", texto: "Curiosidade religiosa", correta: false },
              { id: "b", texto: "Fé e arrependimento sinceros", correta: true },
              { id: "c", texto: "Simpatia por Cristo", correta: false },
              { id: "d", texto: "Conformismo moral", correta: false }
            ],
            explicacao: "A fé é fruto do chamado eficaz. É Deus quem opera tanto o querer como o realizar."
          }
        ],
        meditacao: [
      {
        dia: 1,
            titulo: "Deus Nos Chamou Para a Vida",
            leitura: "João 6:44",
            texto: "O chamado eficaz não depende de nossa força, inteligência ou esforço. É Deus quem chama. É um chamado que cria vida onde só havia morte. Quando Deus chama, a alma responde porque é vivificada.",
            reflexao: "Onde você estaria hoje se Deus não tivesse te chamado?",
            oracao: "Senhor, obrigado porque o Teu chamado venceu minha morte espiritual. Faz-me viver para Ti.",
            desafio: "Reflita: Onde você estaria hoje se Deus não tivesse te chamado?"
      },
      {
        dia: 2,
            titulo: "Chamados Pela Palavra e Espírito",
            leitura: "Romanos 10:17",
            texto: "Deus usa a Palavra pregada como instrumento. Mas é o Espírito quem torna essa Palavra viva no coração. A Palavra atinge os ouvidos; o Espírito atinge o coração.",
            reflexao: "Como você tem valorizado a pregação da Palavra?",
            oracao: "Senhor, faz Tua Palavra arder em meu coração a cada dia.",
            desafio: "Ouça hoje um sermão expositivo com atenção reverente."
      },
      {
        dia: 3,
            titulo: "Chamados Para Cristo",
            leitura: "1 Coríntios 1:24",
            texto: "O Chamado Eficaz não é para uma religião, mas para uma Pessoa: Cristo. O coração regenerado corre para Cristo como a única esperança.",
            reflexao: "Cristo tem sido seu maior tesouro?",
            oracao: "Jesus, és meu maior tesouro. Faz-me amar-Te mais.",
            desafio: "Ore hoje apenas louvando a Cristo por quem Ele é."
      },
      {
        dia: 4,
            titulo: "Chamados Para a Comunhão",
            leitura: "1 Coríntios 1:9",
            texto: "A salvação não é só livramento do inferno. É comunhão viva com Cristo. O chamado eficaz une o crente vitalmente a Cristo.",
            reflexao: "Como está sua comunhão diária com Cristo?",
            oracao: "Senhor, ensina-me a desfrutar da comunhão Contigo diariamente.",
            desafio: "Separe hoje 15 minutos de silêncio só para estar na presença de Cristo."
      },
      {
        dia: 5,
            titulo: "Chamados Para a Santidade",
            leitura: "2 Timóteo 1:9",
            texto: "O chamado eficaz sempre produz frutos de santidade. Quem foi chamado por Deus não vive mais da mesma maneira. A eleição não é licença para pecar, mas poder para santificar.",
            reflexao: "Como o chamado de Deus tem transformado sua vida?",
            oracao: "Deus santo, purifica meu coração e minha conduta.",
            desafio: "Identifique um pecado a ser mortificado e confesse a Deus."
      },
      {
        dia: 6,
            titulo: "Chamados Com Segurança",
            leitura: "Romanos 8:30",
            texto: "O chamado eficaz garante justificação, santificação e glorificação. Deus não chama para abandonar; Ele chama para completar a obra.",
            reflexao: "Como essa certeza afeta sua vida cristã?",
            oracao: "Senhor, dá-me descanso em Tuas promessas infalíveis.",
            desafio: "Escreva hoje tudo que Deus já fez por você desde que te chamou."
      },
      {
        dia: 7,
            titulo: "Chamados Para Glorificar a Deus",
            leitura: "1 Pedro 2:9",
            texto: "O Chamado Eficaz nos transforma em proclamadores da glória de Deus. Todo eleito é missionário da graça que o alcançou.",
            reflexao: "Como você tem proclamado a graça de Deus?",
            oracao: "Senhor, que eu viva para contar Tuas maravilhas todos os dias.",
            desafio: "Compartilhe com alguém hoje seu testemunho de como Deus te chamou."
          }
        ]
  },
  {
    id: 4,
        titulo: "Regeneração - Novo Nascimento",
        introducao: {
          texto: "INTRODUÇÃO TEOLÓGICA — O QUE É REGENERAÇÃO?\n\nDEFINIÇÕES\n\n\"Regeneração é aquela obra secreta, imediata e sobrenatural do Espírito Santo, pela qual Ele implanta no pecador eleito o princípio da nova vida espiritual, tornando-o capaz de responder a Deus.\"\n\n\"Regeneração é a criação de uma nova vida. Não é apenas reforma moral, mas o surgimento de uma nova natureza.\"\n\n\"A regeneração é o renovar da alma pela virtude do Espírito Santo, fazendo-nos participar da vida de Deus.\"\n\nCARACTERÍSTICAS DA REGENERAÇÃO\n\n1. A Regeneração é Obra Exclusiva de Deus.\n→ O homem natural está espiritualmente morto (Efésios 2:1).\n→ Somente o Espírito Santo pode gerar vida espiritual (João 3:5-8).\n\n2. A Regeneração Precede Qualquer Atitude Humana\n→ Não é causada pela fé, mas causa a fé (1 João 5:1).\n→ O novo nascimento é ato de soberania divina (João 1:12-13).\n\n3. É um Ato Interno, Invisível, Instantâneo\n→ Não é um processo lento: é uma criação de vida espiritual onde havia morte (Ezequiel 36:26-27).\n\n4. Os Seus Efeitos Imediatos\n→ Nova disposição interior.\n→ Novo amor por Deus.\n→ Sensibilidade para com o pecado.\n→ Desejo de buscar a Deus.\n\nMas atenção: arrependimento e fé virão como fruto, não como parte da regeneração.\n\nFUNDAMENTAÇÃO BÍBLICA\n\nJoão 3:3; João 3:5-8 — Necessidade absoluta do novo nascimento.\n Efésios 2:1-5 — O homem está morto; Deus dá vida.\n Tito 3:5 — Regeneração pelo Espírito Santo.\n 1 João 5:1 — Quem crê já nasceu de Deus.\nJoão 1:12-13 — Nascidos de Deus, não da vontade humana.\nEzequiel 36:26-27 — Novo coração e novo espírito.\n\nCONFISSÃO DE FÉ DE WESTMINSTER — Cap. 10.2\n\"Este chamado eficaz é de Deus unicamente. Ele renova os seus corações, iluminando as suas mentes espiritualmente, e lhes tirando o coração de pedra, dando-lhes um coração de carne...\"\n\nCATECISMO MAIOR DE WESTMINSTER — Pergunta 67\n\"A regeneração é obra de Deus pela qual Ele cria um novo coração e espírito no homem, habilitando-o a responder ao evangelho.\"\n\nSÍNTESE FINAL REFORMADA DA REGENERAÇÃO\nNão é convite → é criação.\nNão é persuasão → é vivificação.\nNão é resposta humana → é ato soberano de Deus.\nÉ o nascimento espiritual do eleito.\nÉ a raiz invisível da futura fé e arrependimento.\nÉ a operação interior, secreta e eficaz do Espírito Santo."
  },
  questoes: [
    {
      id: 1,
      pergunta: "Segundo João 3:3, o que Jesus ensina sobre a necessidade da regeneração?",
      referencias: ["João 3:3", "João 3:5-7", "Efésios 2:1", "CFW 10.2"],
      alternativas: [
        { id: "a", texto: "É opcional", correta: false },
        { id: "b", texto: "É necessária para ver o Reino", correta: true },
        { id: "c", texto: "É recomendável", correta: false },
        { id: "d", texto: "É um processo humano", correta: false }
      ],
      explicacao: "Sem o novo nascimento ninguém pode ver ou entrar no Reino de Deus (João 3:3-5); por isso, a regeneração é indispensável para a comunhão com Deus. Como ensina a CFW 10.2, essa obra é \"de Deus unicamente\"."
    },
    {
      id: 2,
      pergunta: "De acordo com João 3:5, a regeneração é realizada por meio de quê?",
      referencias: ["Tito 3:5", "Ezequiel 36:25-27", "João 3:5"],
      alternativas: [
        { id: "a", texto: "Boas obras", correta: false },
        { id: "b", texto: "Decisão humana", correta: false },
        { id: "c", texto: "Palavra e Espírito", correta: true },
        { id: "d", texto: "Práticas religiosas", correta: false }
      ],
      explicacao: "Deus opera a regeneração por meio da Sua Palavra e pelo Espírito Santo (Tito 3:5; Tiago 1:18; 1 Pedro 1:23)."
    },
    {
      id: 3,
      pergunta: "Segundo Efésios 2:1-5, qual era a condição do homem antes da regeneração?",
      referencias: ["Efésios 2:1-5", "Romanos 3:10-12", "Colossenses 2:13"],
      alternativas: [
        { id: "a", texto: "Enfraquecido espiritualmente", correta: false },
        { id: "b", texto: "Neutro", correta: false },
        { id: "c", texto: "Morto espiritualmente", correta: true },
        { id: "d", texto: "Pecador, mas capaz por si mesmo", correta: false }
      ],
      explicacao: "A Escritura descreve o homem natural como espiritualmente morto em delitos e pecados (Efésios 2:1), incapaz de gerar vida espiritual por si mesmo."
    },
    {
      id: 4,
      pergunta: "Segundo João 1:12-13, o novo nascimento depende de quê?",
      referencias: ["João 1:12-13", "Tiago 1:18", "1 Pedro 1:23"],
      alternativas: [
        { id: "a", texto: "Vontade humana", correta: false },
        { id: "b", texto: "Tradição religiosa", correta: false },
        { id: "c", texto: "Vontade soberana de Deus", correta: true },
        { id: "d", texto: "Méritos próprios", correta: false }
      ],
      explicacao: "A regeneração é obra soberana de Deus: o novo nascimento não procede da vontade da carne nem da vontade do homem (João 1:13). O Catecismo Maior (pergunta 67) descreve essa graça como criação de novo coração."
    },
    {
      id: 5,
      pergunta: "Em Tito 3:5, Paulo afirma que a regeneração acontece por qual ação?",
      referencias: ["Tito 3:5", "João 3:5-6", "Ezequiel 36:26-27"],
      alternativas: [
        { id: "a", texto: "Obras de justiça", correta: false },
        { id: "b", texto: "Moralidade humana", correta: false },
        { id: "c", texto: "Renovação pelo Espírito", correta: true },
        { id: "d", texto: "Sacramentos", correta: false }
      ],
      explicacao: "Tito 3:5 ensina que a salvação inclui o lavar regenerador e renovador do Espírito Santo."
    },
    {
      id: 6,
      pergunta: "Segundo Ezequiel 36:26, o que Deus faz no coração regenerado?",
      referencias: ["Ezequiel 36:26", "Jeremias 31:33", "Hebreus 8:10"],
      alternativas: [
        { id: "a", texto: "Ensina a melhorar", correta: false },
        { id: "b", texto: "Dá novo código moral", correta: false },
        { id: "c", texto: "Cria um novo coração", correta: true },
        { id: "d", texto: "Corrige apenas o exterior", correta: false }
      ],
      explicacao: "A regeneração não é mero ajuste externo; é nova criação em Cristo, com novo coração e nova disposição (2 Coríntios 5:17; Ezequiel 36:26)."
    },
    {
      id: 7,
      pergunta: "Qual imagem bíblica descreve bem a regeneração?",
      referencias: ["Efésios 2:5", "João 3:8", "2 Coríntios 5:17"],
      alternativas: [
        { id: "a", texto: "Reforma", correta: false },
        { id: "b", texto: "Reeducação", correta: false },
        { id: "c", texto: "Vivificação (dar vida)", correta: true },
        { id: "d", texto: "Aperfeiçoamento", correta: false }
      ],
      explicacao: "Regenerar é vivificar espiritualmente quem estava morto em pecados (Efésios 2:5)."
    },
    {
      id: 8,
      pergunta: "Segundo 1 João 5:1, a fé é causa ou fruto da regeneração?",
      referencias: ["1 João 5:1", "João 6:44-45", "Atos 16:14"],
      alternativas: [
        { id: "a", texto: "Causa", correta: false },
        { id: "b", texto: "Fruto", correta: true }
      ],
      explicacao: "Em 1 João 5:1, o novo nascimento aparece como fundamento da fé: crer em Cristo evidencia a obra prévia de Deus no coração."
    },
    {
      id: 9,
      pergunta: "Em João 3:8, o agir do Espírito na regeneração é comparado a quê?",
      referencias: ["João 3:8", "Atos 16:14", "João 1:13"],
      alternativas: [
        { id: "a", texto: "Luz", correta: false },
        { id: "b", texto: "Fogo", correta: false },
        { id: "c", texto: "Vento soberano e livre", correta: true },
        { id: "d", texto: "Água corrente", correta: false }
      ],
      explicacao: "João 3:8 destaca a liberdade soberana do Espírito no novo nascimento: Ele age onde e como quer."
    },
    {
      id: 10,
      pergunta: "O novo nascimento resulta em quê imediatamente?",
      referencias: ["1 João 3:9", "1 João 2:29", "Efésios 2:10"],
      alternativas: [
        { id: "a", texto: "Vida religiosa apenas", correta: false },
        { id: "b", texto: "Transformação interior", correta: true },
        { id: "c", texto: "Abandono total do pecado instantâneo", correta: false },
        { id: "d", texto: "Apenas mudança externa", correta: false }
      ],
      explicacao: "O novo nascimento produz transformação interior e nova inclinação para a justiça (1 João 2:29; 1 João 3:9)."
    },
    {
      id: 11,
      pergunta: "O que precede o novo nascimento?",
      referencias: ["João 1:13", "Romanos 9:16", "Tiago 1:18"],
      alternativas: [
        { id: "a", texto: "Nada — Deus age soberanamente", correta: true },
        { id: "b", texto: "Fé humana", correta: false },
        { id: "c", texto: "Boas obras", correta: false },
        { id: "d", texto: "Decisão pessoal", correta: false }
      ],
      explicacao: "A vida espiritual nasce da ação soberana de Deus, não da iniciativa autônoma do homem natural (João 1:13; Romanos 9:16)."
    },
    {
      id: 12,
      pergunta: "A quem pertence a glória pela regeneração?",
      referencias: ["Efésios 2:8-9", "Jonas 2:9", "1 Coríntios 1:29-31"],
      alternativas: [
        { id: "a", texto: "Ao homem", correta: false },
        { id: "b", texto: "À igreja", correta: false },
        { id: "c", texto: "Ao pregador do evangelho", correta: false },
        { id: "d", texto: "Aos pais crentes", correta: false },
        { id: "e", texto: "À decisão do indivíduo", correta: false },
        { id: "f", texto: "A Deus exclusivamente", correta: true }
      ],
      explicacao: "A regeneração é inteiramente obra de Deus. Não depende da vontade humana, nem da influência de terceiros. A Confissão de Fé (Cap. 10.2) declara: \"Este chamado eficaz é da exclusiva graça de Deus.\" Assim, toda a glória da salvação pertence somente ao Senhor."
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "Novo Nascimento: A Obra Soberana de Deus",
      leitura: "João 1:13",
      texto: "Você nasceu fisicamente sem escolha sua. Da mesma forma, o nascimento espiritual é iniciativa de Deus. Ele nos gera com Sua Palavra e Espírito, em obra sobrenatural de graça.",
      reflexao: "Lembre-se hoje que você vive espiritualmente porque Deus o quis.",
      oracao: "Senhor, Tu me deste nova vida quando eu estava morto. Toda glória seja Tua."
    },
    {
      dia: 2,
      titulo: "Do Cadáver ao Coração",
      leitura: "Efésios 2:1",
      texto: "A regeneração não é um retoque moral. É ressurreição espiritual. Deus encontra o pecador morto em delitos e o vivifica pela Sua graça.",
      reflexao: "Medite hoje: \"Eu estava morto. Agora vivo. Isso é milagre.\"",
      oracao: "Pai, tira de mim toda presunção. Lembra-me que fui ressuscitado por Ti."
    },
    {
      dia: 3,
      titulo: "Coração Novo, Nova Vida",
      leitura: "Ezequiel 36:26",
      texto: "A regeneração não apenas muda nossas ações, mas transforma nosso coração. Em Cristo, Deus faz nova criação.",
      reflexao: "Observe hoje suas motivações. De onde vêm suas atitudes?",
      oracao: "Senhor, cria em mim não só novas atitudes, mas um novo coração que Te ama."
    },
    {
      dia: 4,
      titulo: "Vento que Sopra",
      leitura: "João 3:8",
      texto: "O Espírito não pede permissão. Ele sopra soberano, misterioso e irresistível, aplicando a graça no tempo determinado por Deus.",
      reflexao: "Reserve 10 minutos em silêncio e peça que o Espírito sussurre ao seu coração.",
      oracao: "Espírito Santo, sopra sobre mim, continuamente, renovando minha alma."
    },
    {
      dia: 5,
      titulo: "Lavados e Renovados",
      leitura: "Tito 3:5",
      texto: "A regeneração é um lavar: Deus nos limpa internamente, não apenas externamente, pelo Espírito Santo.",
      reflexao: "Pense em áreas da sua vida que ainda precisam ser lavadas pela graça.",
      oracao: "Senhor, lava-me por dentro. Purifica minha vontade e desejos."
    },
    {
      dia: 6,
      titulo: "Sinais de Vida",
      leitura: "1 João 3:9",
      texto: "A regeneração gera sinais: novo amor, novo ódio pelo pecado, nova direção. A nova vida espiritual se manifesta em frutos.",
      reflexao: "Examine sua vida: o que você faz hoje que não fazia antes da regeneração?",
      oracao: "Senhor, ajuda-me a viver como alguém que nasceu de novo."
    },
    {
      dia: 7,
      titulo: "Nova Criação, Novo Propósito",
      leitura: "Efésios 2:10",
      texto: "O regenerado vive para Deus. Ele foi recriado com um propósito: glorificar Aquele que o fez nascer de novo e andar em boas obras.",
      reflexao: "Escolha uma boa obra hoje para fazer em gratidão a Deus.",
      oracao: "Senhor, usa minha nova vida para cumprir Teus planos eternos."
    }
  ]
},
{
  id: 5,
  titulo: "Conversão (Fé e Arrependimento)",
  introducao: {
    texto: "INTRODUÇÃO\n\nNeste estudo, trataremos a Conversão como fruto necessário da Regeneração. Não falaremos ainda de Justificação ou Adoção — que virão depois.\n\nDEFINIÇÕES\n\n\"Conversão é aquela operação graciosa e contínua de Deus na alma regenerada, pela qual o pecador, iluminado e vivificado, volta-se voluntariamente para Deus com fé e arrependimento.\"\n\n\"Conversão é o primeiro ato consciente da nova vida. Regenerado pela graça, o homem agora crê e se arrepende.\"\n\n\"Fé e arrependimento são os dois pés pelos quais o regenerado caminha em direção a Deus.\"\n\nA NATUREZA DA FÉ\n- Não é apenas crença intelectual\n\n- É confiar em Cristo como Salvador e Senhor\n\n- É dom de Deus (Efésios 2:8)\n\n- Crer é descansar em Cristo (João 6:29)\n\nA NATUREZA DO ARREPENDIMENTO\n- Mudança de mente, coração e direção (Atos 3:19)\n\n- Inclui tristeza pelo pecado (2 Coríntios 7:10)\n\n- Inclui abandono do pecado (Provérbios 28:13)\n\n- É dom de Deus (Atos 11:18)\n\nCATECISMO MAIOR DE WESTMINSTER\nPergunta 76:\n\"Arrependimento para a vida é uma graça salvadora pela qual um pecador, tendo sentido profundamente seus pecados e miséria, e percebido a misericórdia de Deus em Cristo, com tristeza e ódio dos seus pecados, os abandona e volta-se para Deus com propósito de obediência.\"\n\nPergunta 72:\n\"A fé justificadora é uma graça salvadora, operada no coração do pecador pelo Espírito e Palavra de Deus.\"\n\nRESUMO DA CONVERSÃO\n- Regeneração dá vida\n\n- Conversão é o primeiro movimento consciente dessa vida: fé + arrependimento\n\n- Ambas são dons de Deus\n\n- Fé é voltar-se para Cristo\n\n- Arrependimento é voltar-se contra o pecado\n\n- Não são meros sentimentos — são mudanças reais de direção"
  },
  questoes: [
    {
      id: 1,
      pergunta: "Segundo Efésios 2:8-9, qual a origem da fé salvadora?",
      referencias: ["Efésios 2:8-9", "Filipenses 1:29", "João 6:29"],
      alternativas: [
        { id: "a", texto: "Força de vontade", correta: false },
        { id: "b", texto: "Emoção humana", correta: false },
        { id: "c", texto: "Tradição religiosa", correta: false },
        { id: "d", texto: "Decisão autônoma", correta: false },
        { id: "e", texto: "Dom de Deus", correta: true },
        { id: "f", texto: "Sabedoria humana", correta: false }
      ],
      explicacao: "A fé é produzida pela graça divina no coração regenerado. O Catecismo Maior (pergunta 72) descreve a fé justificadora como graça salvadora operada pelo Espírito por meio da Palavra."
    },
    {
      id: 2,
      pergunta: "Qual a principal característica da fé salvadora, segundo João 6:29?",
      referencias: ["João 6:29", "João 1:12", "Romanos 10:9-10"],
      alternativas: [
        { id: "a", texto: "Confiança em Cristo", correta: true },
        { id: "b", texto: "Medo do inferno", correta: false },
        { id: "c", texto: "Vontade de prosperar", correta: false },
        { id: "d", texto: "Moralidade elevada", correta: false },
        { id: "e", texto: "Observar regras", correta: false },
        { id: "f", texto: "Sentimentalismo", correta: false }
      ],
      explicacao: "Crer é confiar pessoalmente em Cristo como Salvador."
  },
  {
    id: 3,
      pergunta: "Segundo Atos 11:18, qual é a origem do verdadeiro arrependimento?",
      referencias: ["Atos 11:18", "2 Timóteo 2:25", "Atos 5:31"],
      alternativas: [
        { id: "a", texto: "Esforço moral humano", correta: false },
        { id: "b", texto: "Emoção passageira", correta: false },
        { id: "c", texto: "Sentimento de culpa", correta: false },
        { id: "d", texto: "Dom de Deus", correta: true },
        { id: "e", texto: "Medo do castigo", correta: false },
        { id: "f", texto: "Vontade do pecador", correta: false }
      ],
      explicacao: "Arrependimento para a vida é uma graça salvadora. Como resume o Catecismo Maior (pergunta 76), trata-se de dom de Deus que leva o pecador a odiar o pecado e voltar-se para o Senhor."
    },
    {
      id: 4,
      pergunta: "Segundo Marcos 1:15, qual é o conteúdo do chamado de Cristo?",
      referencias: ["Marcos 1:15", "Atos 20:21", "Atos 17:30"],
      alternativas: [
        { id: "a", texto: "Amor", correta: false },
        { id: "b", texto: "Fé", correta: false }, 
        { id: "c", texto: "Arrependimento", correta: false },
        { id: "d", texto: "Obediência", correta: false },
        { id: "e", texto: "Fé e Arrependimento juntos", correta: true },
        { id: "f", texto: "Obras religiosas", correta: false }
      ],
      explicacao: "Cristo une a fé ao arrependimento, porque ninguém crê verdadeiramente sem voltar-se do pecado."
    },
    {
      id: 5,
      pergunta: "Segundo Atos 3:19, o arrependimento conduz a quê?",
      referencias: ["Atos 3:19", "2 Coríntios 7:10", "Provérbios 28:13"],
      alternativas: [
        { id: "a", texto: "Alívio momentâneo", correta: false },
        { id: "b", texto: "Vida religiosa", correta: false },
        { id: "c", texto: "Perdão dos pecados", correta: true },
        { id: "d", texto: "Prosperidade", correta: false },
        { id: "e", texto: "Fama espiritual", correta: false },
        { id: "f", texto: "Sensação de bem-estar", correta: false }
      ],
      explicacao: "O verdadeiro arrependimento sempre leva ao perdão, pois é fruto do Espírito."
    },
    {
      id: 6,
      pergunta: "Em 1 Tessalonicenses 1:9-10, conversão significa virar-se de quê para quê?",
      referencias: ["1 Tessalonicenses 1:9-10", "Atos 14:15", "Isaías 55:7"],
      alternativas: [
        { id: "a", texto: "Do erro para a verdade", correta: false },
        { id: "b", texto: "Dos ídolos para Deus", correta: false },
        { id: "c", texto: "Das obras para a graça", correta: false },
        { id: "d", texto: "Da escuridão para a luz", correta: false },
        { id: "e", texto: "Do pecado para Cristo", correta: false },
        { id: "f", texto: "Todas as anteriores", correta: true }
      ],
      explicacao: "Conversão é viragem total de direção."
    },
    {
      id: 7,
      pergunta: "Segundo Atos 20:21, o evangelho exige do pecador o quê?",
      referencias: ["Atos 20:21", "Marcos 1:15", "Hebreus 6:1"],
      alternativas: [
        { id: "a", texto: "Apenas crer", correta: false },
        { id: "b", texto: "Apenas se arrepender", correta: false },
        { id: "c", texto: "Arrependimento e fé juntos", correta: true },
        { id: "d", texto: "Obras meritórias", correta: false },
        { id: "e", texto: "Regras religiosas", correta: false },
        { id: "f", texto: "Batismo", correta: false }
      ],
      explicacao: "A conversão reformada une fé e arrependimento como duas faces da mesma graça: voltar-se para Deus e voltar-se contra o pecado."
    },
    {
      id: 8,
      pergunta: "O arrependimento verdadeiro inclui, segundo 2 Coríntios 7:10:",
      referencias: ["2 Coríntios 7:10", "Joel 2:12-13", "Provérbios 28:13"],
      alternativas: [
        { id: "a", texto: "Ódio ao pecado", correta: false },
        { id: "b", texto: "Tristeza por pecar contra Deus", correta: false },
        { id: "c", texto: "Mudança de vida", correta: false },
        { id: "d", texto: "Lamento verdadeiro", correta: false },
        { id: "e", texto: "Mortificação do pecado", correta: false },
        { id: "f", texto: "Todas as anteriores", correta: true }
      ],
      explicacao: "Arrependimento que não conduz a abandono do pecado não é bíblico."
    },
    {
      id: 9,
      pergunta: "A fé salvadora tem qual objeto principal?",
      referencias: ["João 14:1", "Atos 16:31", "Romanos 10:9-10"],
      alternativas: [
        { id: "a", texto: "Doutrinas", correta: false },
        { id: "b", texto: "Igreja", correta: false },
        { id: "c", texto: "Emoções", correta: false },
        { id: "d", texto: "Cristo", correta: true },
        { id: "e", texto: "Leis morais", correta: false },
        { id: "f", texto: "Anjos", correta: false }
      ],
      explicacao: "A fé que salva descansa exclusivamente em Cristo."
    },
    {
      id: 10,
      pergunta: "A fé verdadeira resulta em quê?",
      referencias: ["Tiago 2:17", "Gálatas 5:6", "Efésios 2:10"],
      alternativas: [
        { id: "a", texto: "Obediência amorosa", correta: true },
        { id: "b", texto: "Ociosidade religiosa", correta: false },
        { id: "c", texto: "Indiferença prática", correta: false },
        { id: "d", texto: "Legalismo", correta: false },
        { id: "e", texto: "Afastamento do mundo", correta: false },
        { id: "f", texto: "Todas as anteriores", correta: false }
      ],
      explicacao: "A fé verdadeira nunca caminha sozinha. Sempre traz frutos."
    },
    {
      id: 11,
      pergunta: "Segundo 2 Timóteo 2:25, o arrependimento é concedido por quem?",
      referencias: ["2 Timóteo 2:25", "Atos 11:18", "João 6:44"],
      alternativas: [
        { id: "a", texto: "Pelo próprio homem", correta: false },
        { id: "b", texto: "Por Deus", correta: true },
        { id: "c", texto: "Pela igreja", correta: false },
        { id: "d", texto: "Pelo pregador", correta: false },
        { id: "e", texto: "Pelo batismo", correta: false },
        { id: "f", texto: "Pelas boas obras", correta: false }
      ],
      explicacao: "O arrependimento é dom divino, não produção humana."
    },
    {
      id: 12,
      pergunta: "Qual é a verdadeira origem da conversão bíblica (fé e arrependimento)?",
      referencias: ["Efésios 2:8-9", "Atos 11:18", "2 Timóteo 2:25", "Catecismo Maior 75"],
      alternativas: [
        { id: "a", texto: "Decisão livre do homem natural", correta: false },
        { id: "b", texto: "Tradição religiosa", correta: false },
        { id: "c", texto: "Rituais exteriores", correta: false },
        { id: "d", texto: "Obediência à lei", correta: false },
        { id: "e", texto: "Esforço pessoal", correta: false },
        { id: "f", texto: "Graça de Deus aplicada ao coração regenerado", correta: true }
      ],
      explicacao: "Conversão não nasce da capacidade humana, mas é fruto da graça eficaz. Catecismo Maior 75: \"Obra da livre e especial graça de Deus.\""
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "A Graça que nos Chama à Conversão",
      leitura: "Atos 11:18",
      texto: "Fé e arrependimento não nascem de nossa natureza caída. São dádivas que o Pai entrega aos Seus filhos. O pecador não se converte porque é bom; ele se converte porque Deus é bom. Até o voltar-se para Deus é graça de Deus.",
      reflexao: "Como você tem valorizado essas dádivas divinas?",
      oracao: "Senhor, muito obrigado por me dar fé e arrependimento. Eu nada trouxe para Ti — tudo veio de Ti.",
      desafio: "Relembre o dia ou o processo da sua conversão. Agradeça a Deus."
    },
    {
      dia: 2,
      titulo: "O Arrependimento que Vem do Alto",
      leitura: "2 Timóteo 2:25",
      texto: "Arrependimento não é remorso. É um dom que vem de cima e muda o coração, afasta do pecado e aproxima de Deus. Arrependimento não é tristeza por ser pego, mas por ter ofendido a santidade de Deus.",
      reflexao: "Como tem sido seu arrependimento - superficial ou profundo?",
      oracao: "Pai, concede-me um arrependimento profundo, que nasce do amor e temor do Senhor.",
      desafio: "Examine um pecado habitual e confesse sinceramente a Deus."
    },
    {
      dia: 3,
      titulo: "Fé: Descanso Total em Cristo",
      leitura: "João 6:29",
      texto: "Fé verdadeira é lançar-se nos braços de Cristo, confiar em Sua suficiência, abandonar todo orgulho e crer na obra perfeita da cruz. A fé é olhar para fora de si mesmo e descansar em Cristo.",
      reflexao: "Em que você tem confiado além de Cristo?",
      oracao: "Senhor Jesus, Tu és suficiente. Eu confio inteiramente em Ti.",
      desafio: "Reafirme sua fé hoje, dizendo: \"Cristo basta para mim.\""
    },
    {
      dia: 4,
      titulo: "Arrependimento: Ódio ao Pecado",
      leitura: "2 Coríntios 7:10",
      texto: "Quem ama a Deus aprende a odiar o pecado, não apenas por suas consequências, mas por sua natureza ofensiva a Deus. Arrependimento genuíno nasce do amor por Deus.",
      reflexao: "Como você vê o pecado - como inimigo ou como amigo?",
      oracao: "Senhor, dá-me um coração que detesta o pecado como Tu detestas.",
      desafio: "Liste os pecados que você mais negligencia e ore contra eles."
    },
    {
      dia: 5,
      titulo: "Fé que Transforma a Vida",
      leitura: "Tiago 2:17",
      texto: "Fé verdadeira sempre gera obediência, amor, serviço e frutos visíveis. Não é fé morta, mas viva, operante e perseverante. A fé que não reforma a vida é falsa fé.",
      reflexao: "Que frutos sua fé tem produzido?",
      oracao: "Senhor, que a minha fé se manifeste em obras de amor para Tua glória.",
      desafio: "Realize hoje um ato prático de amor que reflita sua fé."
    },
    {
      dia: 6,
      titulo: "Conversão: Virando-se Totalmente a Deus",
      leitura: "1 Tessalonicenses 1:9",
      texto: "Conversão não é apenas parar de fazer o mal — é passar a viver para Deus, com nova mente, novos desejos, nova direção. Conversão é virar as costas ao pecado e o rosto para Deus.",
      reflexao: "Para onde está voltado seu coração hoje?",
      oracao: "Deus Santo, toma meu coração, minha mente e meus passos. Quero viver totalmente para Ti.",
      desafio: "Reflita: O que ainda ocupa lugar de ídolo em seu coração? Renuncie."
    },
    {
      dia: 7,
      titulo: "Fé e Arrependimento: Uma Vida Inteira de Conversão",
      leitura: "Atos 20:21",
      texto: "Conversão não é um evento apenas — é um estado de vida. Todos os dias o crente caminha em fé e se volta do pecado, cada vez mais, para Cristo. A vida cristã é fé e arrependimento diários.",
      reflexao: "Como tem sido sua caminhada diária de fé e arrependimento?",
      oracao: "Senhor, mantém-me em contínua conversão, até o dia que eu Te veja face a face.",
      desafio: "Ore: \"Senhor, não me deixe conformar com o pecado. Faz-me sempre Teu convertido.\""
    }
  ]
},
{
    id: 6,
    titulo: "Justificação",
    introducao: {
      texto: "A justificação é o ato jurídico de Deus, pelo qual Ele declara o pecador — que está unido a Cristo pela fé — justo diante d'Ele, não com base em obras, mas exclusivamente com base na justiça de Cristo, imputada ao crente.\n\nTrata-se de um ato forense (legal), e não de um processo interno ou transformador (o que é próprio da santificação).\n\nNa justificação:\nO pecador não é tornado justo em si mesmo, mas é declarado justo com base em uma justiça que lhe é externa (extra nos) — a justiça de Cristo.\n\nÉ pela fé somente (sola fide), e não por obras, méritos ou sacramentos.\n\nNatureza da Justificação:\n1. Declaração legal de Deus\nJustificação é um pronunciamento de Deus como Juiz. Não é infusão de justiça, mas imputação da justiça de Cristo ao pecador.\n\n2. Dupla Imputação\nNossos pecados são imputados a Cristo (2 Coríntios 5:21)\nA justiça de Cristo é imputada a nós (Romanos 5:19; Filipenses 3:9)\n\n3. Fundamento e Meio\nFundamento: justiça ativa e passiva de Cristo (sua obediência e morte).\nMeio: fé somente, como instrumento, e não como mérito.\n\n4. Resultado\nPerdão completo dos pecados.\nAceitação diante de Deus como justo.\nPaz com Deus (Romanos 5.1).\n\nConfissão de Fé de Westminster — Capítulo 11.1\n\"Aqueles a quem Deus eficazmente chama, também livremente justifica; não por infundir neles justiça, mas por perdoar seus pecados e aceitar suas pessoas como justas, somente por causa de Cristo, imputando-lhes a obediência ativa e passiva de Cristo, e recebendo isso somente pela fé.\"\n\nSíntese Reformada da Justificação:\nDeus é justo e justificador do ímpio que crê (Rm 3.26).\nA justiça que justifica está fora do crente — em Cristo.\nA fé não é a base, mas o instrumento da justificação.\nÉ um ato único, completo e irreversível.\nConduz à paz, segurança e vida eterna."
  },
  questoes: [
    {
      id: 1,
      pergunta: "Conforme Romanos 3:24, a justificação é concedida de que forma?",
      referencias: ["Romanos 3:24", "Tito 3:7", "Efésios 2:8-9", "CFW 11.1"],
      alternativas: [
        { id: "a", texto: "Por obras", correta: false },
        { id: "b", texto: "Pela graça", correta: true },
        { id: "c", texto: "Pela fé + obras", correta: false },
        { id: "d", texto: "Por esforço moral", correta: false },
        { id: "e", texto: "Por tradição religiosa", correta: false },
        { id: "f", texto: "Por batismo", correta: false }
      ],
      explicacao: "A justificação é uma dádiva graciosa de Deus, não algo conquistado. A CFW 11.1 ensina que Deus justifica \"não por infundir neles justiça\", mas por perdoar e aceitar o pecador somente por causa de Cristo."
    },
    {
      id: 2,
      pergunta: "De acordo com Romanos 5:1, qual é o meio pelo qual o pecador é justificado?",
      referencias: ["Romanos 5:1", "Gálatas 2:16", "Efésios 2:8", "CFW 11.2"],
      alternativas: [
        { id: "a", texto: "Fé", correta: true },
        { id: "b", texto: "Boas obras", correta: false },
        { id: "c", texto: "Santidade pessoal", correta: false },
        { id: "d", texto: "Perseverança", correta: false },
        { id: "e", texto: "Cerimônias religiosas", correta: false },
        { id: "f", texto: "Meditação e jejum", correta: false }
      ],
      explicacao: "A fé é o meio instrumental, e não a base da justificação. Conforme a CFW 11.2, a fé recebe e descansa em Cristo e Sua justiça."
    },
    {
      id: 3,
      pergunta: "Qual tipo de justiça é imputada ao crente na justificação, segundo Filipenses 3:9?",
      referencias: ["Filipenses 3:9", "Romanos 4:5", "2 Coríntios 5:21"],
      alternativas: [
        { id: "a", texto: "Justiça própria", correta: false },
        { id: "b", texto: "Justiça de obras", correta: false },
        { id: "c", texto: "Justiça social", correta: false },
        { id: "d", texto: "Justiça de Cristo", correta: true },
        { id: "e", texto: "Justiça parcial", correta: false },
        { id: "f", texto: "Justiça mosaica", correta: false }
      ],
      explicacao: "A justiça imputada não é nossa, mas de Cristo — perfeita, plena e suficiente."
    },
    {
      id: 4,
      pergunta: "Segundo 2 Coríntios 5:21, o que Deus fez com nossos pecados e a justiça de Cristo?",
      referencias: ["2 Coríntios 5:21", "Isaías 53:5-6", "Romanos 4:6-8"],
      alternativas: [
        { id: "a", texto: "Cristo levou parte do nosso pecado", correta: false },
        { id: "b", texto: "Fomos parcialmente justificados", correta: false },
        { id: "c", texto: "Cristo tomou o pecado e nos deu sua justiça", correta: true },
        { id: "d", texto: "Deus apenas nos perdoou", correta: false },
        { id: "e", texto: "A justiça é algo que adquirimos", correta: false },
        { id: "f", texto: "A cruz remove nossa natureza pecaminosa", correta: false }
      ],
      explicacao: "A justificação envolve a troca divina: nossos pecados imputados a Cristo e Sua justiça imputada a nós."
    },
    {
      id: 5,
      pergunta: "A justificação é um processo contínuo ou um ato único?",
      referencias: ["Romanos 5:1", "João 5:24", "Hebreus 10:14"],
      alternativas: [
        { id: "a", texto: "Um processo lento", correta: false },
        { id: "b", texto: "Um ato contínuo", correta: false },
        { id: "c", texto: "Um ato jurídico único", correta: true },
        { id: "d", texto: "Depende da santificação", correta: false },
        { id: "e", texto: "Provisório até o juízo", correta: false },
        { id: "f", texto: "Repetido após cada pecado", correta: false }
      ],
      explicacao: "A justificação é definitiva, não progressiva. É uma declaração legal, feita uma vez para sempre por Deus, distinta do processo contínuo da santificação."
    },
    {
      id: 6,
      pergunta: "O que é excluído da base da justificação segundo Efésios 2:8-9?",
      referencias: ["Efésios 2:8-9", "Romanos 3:27-28", "Gálatas 3:11"],
      alternativas: [
        { id: "a", texto: "Graça", correta: false },
        { id: "b", texto: "Fé", correta: false },
        { id: "c", texto: "Obras humanas", correta: true },
        { id: "d", texto: "Misericórdia", correta: false },
        { id: "e", texto: "Obediência de Cristo", correta: false },
        { id: "f", texto: "Amor de Deus", correta: false }
      ],
      explicacao: "As obras não contribuem para a justificação. A salvação é pela graça, mediante a fé, para que toda glória seja de Deus."
    },
    {
      id: 7,
      pergunta: "Segundo Provérbios 17:15, qual é a implicação de justificar o ímpio?",
      referencias: ["Provérbios 17:15", "Êxodo 23:7", "Romanos 3:26"],
      alternativas: [
        { id: "a", texto: "Deus jamais justifica o ímpio", correta: false },
        { id: "b", texto: "Somente quem é justo pode ser aceito", correta: false },
        { id: "c", texto: "Justificar o ímpio é injustiça", correta: false },
        { id: "d", texto: "O homem se justifica a si mesmo", correta: false },
        { id: "e", texto: "Deus justifica o ímpio com base nos méritos de Cristo", correta: true },
        { id: "f", texto: "A Justificação é sempre com base moral", correta: false }
      ],
      explicacao: "Deus não viola Sua justiça ao justificar o ímpio; Ele o faz legitimamente com base na obra substitutiva de Cristo."
    },
    {
      id: 8,
      pergunta: "Segundo Romanos 4:5, a quem Deus justifica?",
      referencias: ["Romanos 4:5", "Lucas 18:13-14", "Isaías 1:18"],
      alternativas: [
        { id: "a", texto: "Os santos", correta: false },
        { id: "b", texto: "Os que têm boa conduta", correta: false },
        { id: "c", texto: "Os religiosos", correta: false },
        { id: "d", texto: "Os que se têm medo do inferno", correta: false },
        { id: "e", texto: "Os justos pela lei", correta: false },
        { id: "f", texto: "O ímpio que crê naquele que o justifica", correta: true }
      ],
      explicacao: "A justificação não é para quem crê que a mereça, mas para o ímpio que crê no substituto justo — Cristo."
    },
    {
      id: 9,
      pergunta: "O que a justificação imediatamente produz no crente?",
      referencias: ["Romanos 5:1", "Romanos 8:1", "João 5:24"],
      alternativas: [
        { id: "a", texto: "Santidade perfeita", correta: false },
        { id: "b", texto: "Paz com Deus", correta: true },
        { id: "c", texto: "Imunidade ao pecado", correta: false },
        { id: "d", texto: "Obediência plena", correta: false },
        { id: "e", texto: "Inerrância moral", correta: false },
        { id: "f", texto: "Autoridade espiritual", correta: false }
      ],
      explicacao: "Justificados, os crentes são reconciliados com Deus. Não estão mais sob condenação, mas em paz."
    },
    {
      id: 10,
      pergunta: "Qual opção define a fé corretamente?",
      referencias: ["Gálatas 2:16", "João 1:12", "Romanos 3:28"],
      alternativas: [
        { id: "a", texto: "Fé é virtude meritória", correta: false },
        { id: "b", texto: "Fé é substituto das obras", correta: false },
        { id: "c", texto: "Fé é o instrumento que nos une a Cristo", correta: true },
        { id: "d", texto: "Fé é uma obra da lei", correta: false },
        { id: "e", texto: "Fé é confiança em si mesmo", correta: false },
        { id: "f", texto: "Fé é ritual religioso", correta: false }
      ],
      explicacao: "A fé não justifica a pessoa por si mesma, mas o justifica por meio daquilo a que ela se apega — Cristo e Sua justiça."
    },
    {
      id: 11,
      pergunta: "A justificação se baseia em que tipo de justiça?",
      referencias: ["Romanos 10:4", "Filipenses 3:9", "1 Coríntios 1:30"],
      alternativas: [
        { id: "a", texto: "Justiça pessoal", correta: false },
        { id: "b", texto: "Justiça social", correta: false },
        { id: "c", texto: "Justiça moral", correta: false },
        { id: "d", texto: "Justiça de Cristo", correta: true },
        { id: "e", texto: "Justiça parcial", correta: false },
        { id: "f", texto: "Justiça angélica", correta: false }
      ],
      explicacao: "Não é a nossa obediência que nos justifica, mas a obediência perfeita de Cristo, tanto em vida quanto em morte."
    },
    {
      id: 12,
      pergunta: "Qual é o resultado último da justificação?",
      referencias: ["Romanos 8:30", "João 5:24", "Romanos 5:2"],
      alternativas: [
        { id: "a", texto: "Santificação", correta: false },
        { id: "b", texto: "Boas obras", correta: false },
        { id: "c", texto: "Perseverança", correta: false },
        { id: "d", texto: "Glorificação", correta: true },
        { id: "e", texto: "Batismo", correta: false },
        { id: "f", texto: "Sucesso espiritual", correta: false }
      ],
      explicacao: "A justificação é o elo irreversível da cadeia da salvação. Quem é justificado será glorificado."
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "Justificados Gratuitamente",
      leitura: "Romanos 3:24",
      texto: "A justificação é dom, não recompensa. Deus, por pura graça, declara justo o pecador que crê, sem exigir méritos. Isso nos impede de nos gloriar e nos convida a adorar.",
      reflexao: "Lembre-se hoje: \"Fui justificado, não porque mereci, mas porque Deus é gracioso.\"",
      oracao: "Senhor, eu Te louvo porque me justificaste gratuitamente. Que meu coração jamais confunda graça com merecimento."
    },
    {
      dia: 2,
      titulo: "Paz com Deus",
      leitura: "Romanos 5:1",
      texto: "A culpa se foi. A condenação acabou. Justificados, temos paz verdadeira. O tribunal de Deus não nos acusa mais. Somos reconciliados para sempre com Ele.",
      reflexao: "Sempre que se sentir acusado hoje, diga: \"Tenho paz com Deus. Estou justificado.\"",
      oracao: "Pai, obrigado pela paz que excede todo entendimento. Faz-me descansar na Tua absolvição eterna."
    },
    {
      dia: 3,
      titulo: "Justiça Alheia, Não Minha",
      leitura: "Filipenses 3:9",
      texto: "Não somos aceitos por sermos justos, mas porque recebemos a justiça de Outro — Cristo. Sua obediência é nossa veste diante de Deus.",
      reflexao: "Medite: \"Cristo é minha justiça. Nada mais apresentarei diante de Deus.\"",
      oracao: "Senhor, livra-me de confiar em mim mesmo. Que eu me esconda na justiça perfeita de Cristo."
    },
    {
      dia: 4,
      titulo: "O Substituto Perfeito",
      leitura: "2 Coríntios 5:21",
      texto: "A cruz é o lugar da troca gloriosa: Cristo recebe nosso pecado, e nós recebemos Sua justiça. Não é teatro: é justiça real, operada no tribunal de Deus.",
      reflexao: "Proclame hoje: \"Ele levou minha culpa. Eu visto Sua justiça.\"",
      oracao: "Senhor Jesus, Teu sacrifício me salvou. Tu foste tratado como eu merecia, para que eu fosse tratado como Tu mereces."
    },
    {
      dia: 5,
      titulo: "Nada de Mim",
      leitura: "Efésios 2:8-9",
      texto: "Nem uma gota da nossa justificação vem de nós. Tudo é graça. Tudo é dom. Toda glória é de Deus. A humildade nasce dessa verdade.",
      reflexao: "Evite hoje toda comparação espiritual. Apenas dê glória a Deus.",
      oracao: "Senhor, tira de mim toda vanglória. Tudo que sou, tenho em Cristo. Que eu me glorie apenas na cruz."
    },
    {
      dia: 6,
      titulo: "O Ímpio que Crê",
      leitura: "Romanos 4:5",
      texto: "Deus justifica não os bons, mas os ímpios. O que O agrada não é nosso esforço, mas nossa fé em Seu Filho. Isso é escândalo para o orgulhoso, e consolo para o humilde.",
      reflexao: "Agradeça hoje pela justificação de pecadores como você — e interceda por outros que ainda não creram.",
      oracao: "Senhor, fui ímpio, e Tu me justificaste. Jamais me esqueça de quem eu era, e do que Tu fizeste."
    },
    {
      dia: 7,
      titulo: "Justificados para Glorificação",
      leitura: "Romanos 8:30",
      texto: "A justificação não é o fim, mas o começo de uma eternidade segura. Quem é justificado será glorificado. O decreto de Deus é infalível, e Sua obra, perfeita.",
      reflexao: "Confie plenamente hoje: \"Sou justificado. Logo, serei glorificado.\"",
      oracao: "Pai, obrigado porque o que começaste em mim, completarás. Dá-me segurança em Tua fidelidade."
    }
  ]
},
{
  id: 7,
  titulo: "Adoção",
  introducao: {
    texto: `A adoção dos cristãos não é um gesto meramente afetivo, mas o decreto soberano e gracioso do Deus Triuno pelo qual o Pai, "em amor", escolhe aqueles que foram redimidos pelo sangue de Cristo, concedendo-lhes pleno acesso à sua família (Efésios 1:3-6; Gálatas 4:4-5). Não é fruto de nossa fé ou decisão — embora nossa fé em Cristo seja o canal pelo qual experimentamos essa graça — mas sim o ato legal e relacional que transfere o crente da condição de réu para a de filho legítimo, com todos os direitos e as bênçãos inerentes ao primogênito do Criador.\n\nAssim, a adoção divina engloba tanto o estabelecimento de um novo status jurídico perante o Juiz Santo, quanto a beleza de um vínculo íntimo com o Pai que nos chama de "Aba, Pai" (Romanos 8:15). É a expressão máxima do amor de Deus, resplandecendo em nossa filiação e preparando-nos para a glória futura.\n\nDistinções importantes:\n- **Justificação**: decreto judicial pelo qual Deus declara o pecador justo, com base na imputação da justiça de Cristo.  \n- **Adoção**: ato relacional e legal que estabelece o justo como filho pleno de Deus, dotado de todos os direitos de herdeiro.  \n- **Santificação**: processo contínuo de renovação moral e espiritual, pelo poder do Espírito, à semelhança de Cristo.\n\nNatureza da Adoção:\n- **Ato soberano do Pai** — não decorre de méritos humanos, mas é conferida a quem está unido a Cristo (Jo 1.12-13; Ef 1.5).  \n- **Fundamentada na união com Cristo** — o redimido participa do Filho como Primogênito, tornando-se co-herdeiro das promessas (Gl 4.4-5; Rm 8.17).  \n- **Privilegios espirituais** — inclusão no pacto de graça, acesso confiante ao trono da graça, disciplina paternal, e selo do Espírito, que assegura nossa herança (Rm 8.15-17; Ef 1.13-14).  \n- **Identidade e intimidade** — o crente passa de órfão a filho, desfrutando não apenas de direitos jurídicos, mas de uma comunhão de amor e confiança com Deus ("Aba, Pai") e com os irmãos em Cristo.\n\nConfissão de Fé de Westminster — Capítulo 12  \n> "Todos os que são justificados, Deus se apraz em fazer participantes da graça da adoção, por meio de Jesus Cristo; eles são recebidos no número dos filhos de Deus, têm o Seu nome sobre eles, recebem o Espírito de adoção, têm acesso ao trono da graça com ousadia, e são feitos herdeiros de todas as promessas."\n\nSíntese Reformada da Adoção:\n- É **ato simultaneamente legal e relacional**, estabelecendo-nos como filhos legítimos de Deus.  \n- É tão **graciosa e gratuita** quanto a justificação, fruto do amor trinitário.  \n- Gera **confiança** diante de Deus, **identidade** como herdeiros e **esperança** na consumação futura da glória.  \n- Concedida exclusivamente aos **que estão em Cristo**, é sinal e selo da aliança eterna.`
  },
  questoes: [
    {
      id: 1,
      pergunta: "Segundo João 1:12, quem recebe o direito de ser feito filho de Deus?",
      referencias: ["João 1:12", "Gálatas 3:26", "Efésios 1:5"],
      alternativas: [
        { id: "a", texto: "Todos os seres humanos", correta: false },
        { id: "b", texto: "Todos os religiosos", correta: false },
        { id: "c", texto: "Os que têm bom comportamento", correta: false },
        { id: "d", texto: "Aqueles que recebem a Cristo", correta: true },
        { id: "e", texto: "Os que cumprem a lei", correta: false },
        { id: "f", texto: "As crianças batizadas", correta: false }
      ],
      explicacao: "A filiação espiritual não é universal — é exclusiva para os que creem em Cristo. Em harmonia com a CFW 12, Deus recebe esses no número dos seus filhos e lhes dá os privilégios da adoção."
    },
    {
      id: 2,
      pergunta: "Qual é a origem da adoção, segundo Efésios 1:5?",
      referencias: ["Efésios 1:5", "João 1:13", "Romanos 8:15"],
      alternativas: [
        { id: "a", texto: "Vontade humana", correta: false },
        { id: "b", texto: "Santidade pessoal", correta: false },
        { id: "c", texto: "Vontade soberana de Deus", correta: true },
        { id: "d", texto: "Participação em sacramentos", correta: false },
        { id: "e", texto: "Esforço religioso", correta: false },
        { id: "f", texto: "Méritos próprios", correta: false }
      ],
      explicacao: "A adoção procede da decisão eterna e graciosa de Deus, não de qualquer mérito humano. Efésios 1:5 destaca que ela acontece \"segundo o beneplácito da sua vontade\"."
    },
    {
      id: 3,
      pergunta: "O que o Espírito Santo concede aos filhos de Deus, segundo Romanos 8:15?",
      referencias: ["Romanos 8:15", "Gálatas 4:6", "João 14:16-17"],
      alternativas: [
        { id: "a", texto: "Espírito de temor", correta: false },
        { id: "b", texto: "Espírito de escravidão", correta: false },
        { id: "c", texto: "Espírito de condenação", correta: false },
        { id: "d", texto: "Espírito de adoção", correta: true },
        { id: "e", texto: "Espírito de dúvidas", correta: false },
        { id: "f", texto: "Espírito de julgamento", correta: false }
      ],
      explicacao: "O Espírito Santo testifica interiormente que somos filhos de Deus, dando-nos intimidade e confiança com o Pai."
    },
    {
      id: 4,
      pergunta: "Segundo Gálatas 4:6-7, o filho de Deus é também:",
      referencias: ["Gálatas 4:6-7", "Romanos 8:17", "1 Pedro 1:3-4"],
      alternativas: [
        { id: "a", texto: "Inimigo de Deus", correta: false },
        { id: "b", texto: "Servo sem privilégios", correta: false },
        { id: "c", texto: "Cidadão apenas", correta: false },
        { id: "d", texto: "Herdeiro de Deus", correta: true },
        { id: "e", texto: "Obreiro assalariado", correta: false },
        { id: "f", texto: "Visitante espiritual", correta: false }
      ],
      explicacao: "A adoção concede herança espiritual eterna — somos coerdeiros com Cristo."
    },
    {
      id: 5,
      pergunta: "Qual é o papel da adoção no acesso a Deus?",
      referencias: ["Efésios 2:18", "Hebreus 4:16", "João 14:6"],
      alternativas: [
        { id: "a", texto: "Acesso mediado por santos", correta: false },
        { id: "b", texto: "Acesso limitado", correta: false },
        { id: "c", texto: "Nenhum acesso direto", correta: false },
        { id: "d", texto: "Acesso livre ao trono da graça", correta: true },
        { id: "e", texto: "Acesso parcial por obras", correta: false },
        { id: "f", texto: "Acesso apenas após santificação total", correta: false }
      ],
      explicacao: "Filhos têm acesso direto e constante ao Pai, com confiança e liberdade, não por méritos, mas por adoção."
    },
    {
      id: 6,
      pergunta: "A adoção é um privilégio de quem?",
      referencias: ["1 João 3:1", "Romanos 9:8", "João 8:44"],
      alternativas: [
        { id: "a", texto: "Todos os seres humanos", correta: false },
        { id: "b", texto: "Somente israelitas", correta: false },
        { id: "c", texto: "Apenas profetas", correta: false },
        { id: "d", texto: "Somente crentes em Cristo", correta: true },
        { id: "e", texto: "Crianças e inocentes", correta: false },
        { id: "f", texto: "Homens sinceros de todas as religiões", correta: false }
      ],
      explicacao: "A filiação divina não é universal. Só os que estão unidos a Cristo pela fé são adotados por Deus."
    },
    {
      id: 7,
      pergunta: "A adoção está ligada a qual outro benefício, segundo Romanos 8:29?",
      referencias: ["Romanos 8:29", "Hebreus 2:11", "Colossenses 1:18"],
      alternativas: [
        { id: "a", texto: "Obediência legalista", correta: false },
        { id: "b", texto: "Semelhança com Cristo", correta: true },
        { id: "c", texto: "Êxtase espiritual", correta: false },
        { id: "d", texto: "Isenção de sofrimento", correta: false },
        { id: "e", texto: "Poder sobrenatural", correta: false },
        { id: "f", texto: "Independência moral", correta: false }
      ],
      explicacao: "Os filhos adotivos são conformados ao Filho Eterno. Isso é parte do propósito da adoção: formar uma família semelhante ao Primogênito."
    },
    {
      id: 8,
      pergunta: "O que confirma nossa filiação, segundo Romanos 8:16?",
      referencias: ["Romanos 8:16", "Gálatas 4:6", "Efésios 1:13-14"],
      alternativas: [
        { id: "a", texto: "Obras", correta: false },
        { id: "b", texto: "Emoções", correta: false },
        { id: "c", texto: "Mérito religioso", correta: false },
        { id: "d", texto: "Testemunho do Espírito", correta: true },
        { id: "e", texto: "Aprovação alheia", correta: false },
        { id: "f", texto: "Consagração pessoal", correta: false }
      ],
      explicacao: "A segurança da adoção é obra do Espírito, que convence o coração do crente de sua identidade em Cristo."
    },
    {
      id: 9,
      pergunta: "Filhos adotados por Deus também participam de quê, segundo Hebreus 12:6?",
      referencias: ["Hebreus 12:6", "Provérbios 3:11-12", "Apocalipse 3:19"],
      alternativas: [
        { id: "a", texto: "Disciplina amorosa", correta: true },
        { id: "b", texto: "Condenação legal", correta: false },
        { id: "c", texto: "Rejeição eventual", correta: false },
        { id: "d", texto: "Sofrimento punitivo", correta: false },
        { id: "e", texto: "Liberdade sem responsabilidade", correta: false },
        { id: "f", texto: "Imunidade a dificuldades", correta: false }
      ],
      explicacao: "Deus trata Seus filhos com correção amorosa. A disciplina é sinal de adoção, não de rejeição."
    },
    {
      id: 10,
      pergunta: "A adoção é um ato...",
      referencias: ["Gálatas 4:5", "Romanos 8:15", "Efésios 1:5"],
      alternativas: [
        { id: "a", texto: "Processual", correta: false },
        { id: "b", texto: "Progressivo", correta: false },
        { id: "c", texto: "Reversível", correta: false },
        { id: "d", texto: "Declaratório e legal", correta: true },
        { id: "e", texto: "Simbólico apenas", correta: false },
        { id: "f", texto: "Condicional", correta: false }
      ],
      explicacao: "A adoção, como a justificação, é um ato legal de Deus, não um processo moral."
    },
    {
      id: 11,
      pergunta: "Filhos adotados são também:",
      referencias: ["Romanos 8:17", "1 Pedro 1:4", "Colossenses 1:12"],
      alternativas: [
        { id: "a", texto: "Escravos espirituais", correta: false },
        { id: "b", texto: "Criaturas apenas", correta: false },
        { id: "c", texto: "Servos temporários", correta: false },
        { id: "d", texto: "Herdeiros de Deus", correta: true },
        { id: "e", texto: "Agentes auxiliares", correta: false },
        { id: "f", texto: "Anjos humanos", correta: false }
      ],
      explicacao: "A herança da glória pertence aos filhos. A adoção garante participação eterna no Reino de Deus."
    },
    {
      id: 12,
      pergunta: "Qual é a maior expressão da nossa adoção futura, segundo Romanos 8:23?",
      referencias: ["Romanos 8:23", "Filipenses 3:20-21", "1 Coríntios 15:51-53"],
      alternativas: [
        { id: "a", texto: "Santificação progressiva", correta: false },
        { id: "b", texto: "Glorificação do corpo", correta: true },
        { id: "c", texto: "Comunhão plena", correta: false },
        { id: "d", texto: "Milagres diários", correta: false },
        { id: "e", texto: "Ascensão espiritual", correta: false },
        { id: "f", texto: "Instrução teológica", correta: false }
      ],
      explicacao: "A adoção terá sua expressão final na ressurreição gloriosa, quando receberemos corpos incorruptíveis e perfeitos."
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "Amados e Recebidos como Filhos",
      leitura: "Efésios 1:5",
      texto: "A adoção não é consequência de quem somos, mas de quem Deus é. Ele nos escolheu e nos recebeu como filhos por Seu puro prazer e amor. Essa é nossa identidade verdadeira: filhos do Pai celestial.",
      reflexao: "Diga em oração durante o dia: \"Eu sou filho de Deus, por graça.\"",
      oracao: "Senhor, obrigado por me escolher e adotar. Que eu viva como Teu filho amado, com gratidão e reverência."
    },
    {
      dia: 2,
      titulo: "Direito de Ser Chamado Filho",
      leitura: "João 1:12",
      texto: "Ser filho de Deus é um direito concedido por Cristo, não um status natural. Não somos filhos por natureza, mas por adoção. A fé em Cristo nos concede esse privilégio.",
      reflexao: "Reflita hoje: \"Como posso honrar meu Pai celestial com minhas atitudes?\"",
      oracao: "Jesus, obrigado por me dar o direito de ser chamado filho de Deus. Faz-me viver à altura desse nome."
    },
    {
      dia: 3,
      titulo: "Espírito de Adoção",
      leitura: "Romanos 8:15",
      texto: "Adoção gera intimidade. Não tememos um juiz, mas nos achegamos a um Pai. O Espírito Santo nos dá esse clamor — profundo, sincero, íntimo.",
      reflexao: "Ore com confiança. Fale com Deus como Pai amoroso — sem formalismo, mas com reverência.",
      oracao: "Pai, que o Teu Espírito testifique hoje em mim que sou Teu filho. Ensina-me a clamar: Aba!"
    },
    {
      dia: 4,
      titulo: "Coerdeiros com Cristo",
      leitura: "Romanos 8:17",
      texto: "A herança de Cristo é nossa. O céu é nosso destino. A glória é nossa esperança. Adoção nos torna coerdeiros com o Rei dos reis.",
      reflexao: "Reflita: \"O que tem governado meus desejos — o céu ou a terra?\"",
      oracao: "Senhor, que minha esperança esteja no Teu Reino e não nos bens deste mundo. Eu sou Teu herdeiro em Cristo."
    },
    {
      dia: 5,
      titulo: "Disciplina de Pai",
      leitura: "Hebreus 12:6",
      texto: "A disciplina do Pai não é rejeição, mas prova de filiação. Deus não castiga como juiz punitivo, mas corrige como Pai amoroso que deseja a nossa santidade.",
      reflexao: "Identifique uma área de sua vida em que Deus tem te corrigido. Responda com humildade.",
      oracao: "Pai, dá-me um coração ensinável. Aceito Tua disciplina como prova do Teu amor por mim."
    },
    {
      dia: 6,
      titulo: "Identidade em Cristo",
      leitura: "Gálatas 3:26",
      texto: "Em um mundo que busca identidade em tantas fontes erradas, o cristão encontra sua identidade em Cristo. Você é filho de Deus. Isso basta.",
      reflexao: "Rejeite hoje qualquer mentira que diminua sua dignidade como filho de Deus.",
      oracao: "Senhor, livra-me de buscar valor fora de Ti. Minha identidade está em ser Teu filho."
    },
    {
      dia: 7,
      titulo: "Adoção Plena no Porvir",
      leitura: "Romanos 8:23",
      texto: "A adoção será plenamente manifesta quando nossos corpos forem glorificados. Até lá, vivemos como filhos esperando o retorno do Pai.",
      reflexao: "Viva hoje como quem espera a glória futura com alegria e esperança.",
      oracao: "Senhor, anseio pelo dia da redenção completa. Até lá, guarda-me firme como Teu filho."
    }
  ]
},
{
  id: 8,
  titulo: "Santificação",
  introducao: {
    texto: "Santificação é a obra contínua da graça de Deus na vida do crente, pela qual ele é transformado, renovado e conformado à imagem de Cristo. Ao contrário da justificação (que é um ato único), a santificação é um processo progressivo, que dura toda a vida cristã.\n\nA santificação:\n\nTem início na regeneração\n\nProssegue pela ação do Espírito e da Palavra\n\nCoopera com o crente, mas depende inteiramente da graça\n\nSerá consumada apenas na glorificação\n\nCaracterísticas da Santificação\nObra de Deus no homem — É Deus quem santifica, mas com participação ativa do crente (Filipenses 2:12-13).\n\nProgressiva — O crente é cada vez mais separado do pecado e dedicado a Deus (2 Coríntios 3:18).\n\nDistinta da justificação — Justificação remove a culpa; santificação remove o poder do pecado.\n\nInterna e externa — Muda tanto o coração quanto os frutos visíveis da vida.\n\nConduz à obediência e ao temor de Deus — Não é apenas moralidade, mas consagração.\n\nConfissão de Fé de Westminster — Capítulo 13\n\"Aqueles que são chamados e regenerados, têm um novo coração e um novo espírito criado neles, são santificados real e pessoalmente, pelo poder da morte e ressurreição de Cristo, e pela operação do Espírito, aplicando a eles a virtude da morte e ressurreição de Cristo.\"\n\nSíntese Reformada da Santificação\nÉ obra da Trindade: o Pai decreta, o Filho realiza, o Espírito aplica.\n\nÉ uma transformação progressiva, não instantânea.\n\nDepende da Palavra, oração, sacramentos e disciplina espiritual.\n\nExige mortificação do pecado e vivificação da graça.\n\nO crente jamais será perfeito nesta vida, mas é chamado à perfeição futura."
  },
  questoes: [
    {
      id: 1,
      pergunta: "Segundo 1 Tessalonicenses 5:23, quem é o agente da santificação?",
      referencias: ["1 Tessalonicenses 5:23", "João 17:17", "1 Coríntios 6:11"],
      alternativas: [
        { id: "a", texto: "O próprio homem", correta: false },
        { id: "b", texto: "A igreja", correta: false },
        { id: "c", texto: "A tradição religiosa", correta: false },
        { id: "d", texto: "Deus", correta: true },
        { id: "e", texto: "Méritos individuais", correta: false },
        { id: "f", texto: "Os anjos", correta: false }
      ],
      explicacao: "Santificação é obra divina. O homem coopera, mas não é o autor; a CFW 13 afirma que os regenerados são santificados real e pessoalmente pela operação do Espírito."
    },
    {
      id: 2,
      pergunta: "Qual é o meio ordinário da santificação, segundo João 17:17?",
      referencias: ["João 17:17", "Salmos 119:9", "Efésios 5:26"],
      alternativas: [
        { id: "a", texto: "Rituais", correta: false },
        { id: "b", texto: "Emocionalismo", correta: false },
        { id: "c", texto: "Sonhos espirituais", correta: false },
        { id: "d", texto: "A Palavra de Deus", correta: true },
        { id: "e", texto: "Isolamento", correta: false },
        { id: "f", texto: "Tradição oral", correta: false }
      ],
      explicacao: "Deus opera santidade por meio da Palavra — lida, pregada, aplicada."
    },
    {
      id: 3,
      pergunta: "Segundo Hebreus 12:14, por que a santificação é indispensável?",
      referencias: ["Hebreus 12:14", "Mateus 5:8", "Efésios 5:27"],
      alternativas: [
        { id: "a", texto: "Porque agrada à igreja", correta: false },
        { id: "b", texto: "Porque traz benefícios terrenos", correta: false },
        { id: "c", texto: "Porque é prova de espiritualidade", correta: false },
        { id: "d", texto: "Porque é necessária para ver a Deus", correta: true },
        { id: "e", texto: "Porque gera poder", correta: false },
        { id: "f", texto: "Porque traz popularidade", correta: false }
      ],
      explicacao: "A santificação é evidência da salvação. Sem ela, não há comunhão final com Deus."
    },
    {
      id: 4,
      pergunta: "Qual é o resultado prático da santificação, segundo Gálatas 5:22-23?",
      referencias: ["Gálatas 5:22-23", "Romanos 6:22", "2 Pedro 1:5-8"],
      alternativas: [
        { id: "a", texto: "Novas línguas", correta: false },
        { id: "b", texto: "Frutos visíveis de caráter", correta: true },
        { id: "c", texto: "Profecias regulares", correta: false },
        { id: "d", texto: "Sonhos e visões", correta: false },
        { id: "e", texto: "Êxtase emocional", correta: false },
        { id: "f", texto: "Conhecimento profundo", correta: false }
      ],
      explicacao: "Santificação se manifesta em atitudes transformadas, não apenas experiências espirituais."
    },
    {
      id: 5,
      pergunta: "Segundo Filipenses 2:12-13, como o crente deve viver sua santificação?",
      referencias: ["Filipenses 2:12-13", "Romanos 12:1-2", "Tito 2:11-12"],
      alternativas: [
        { id: "a", texto: "Passivamente", correta: false },
        { id: "b", texto: "Em temor e tremor, cooperando com Deus", correta: true },
        { id: "c", texto: "De forma independente", correta: false },
        { id: "d", texto: "Mediante votos religiosos", correta: false },
        { id: "e", texto: "Apenas por emoções", correta: false },
        { id: "f", texto: "Confiando em seus méritos", correta: false }
      ],
      explicacao: "A santificação exige esforço sincero, mas sempre com dependência total da graça de Deus: \"Deus é quem efetua em vós tanto o querer como o realizar\" (Fp 2:13)."
    },
    {
      id: 6,
      pergunta: "O que caracteriza o início da santificação?",
      referencias: ["2 Coríntios 5:17", "Ezequiel 36:26", "Romanos 6:4"],
      alternativas: [
        { id: "a", texto: "Uma nova religião", correta: false },
        { id: "b", texto: "Um novo grupo social", correta: false },
        { id: "c", texto: "Uma nova natureza espiritual", correta: true },
        { id: "d", texto: "Um novo batismo", correta: false },
        { id: "e", texto: "Novas experiências místicas", correta: false },
        { id: "f", texto: "Um novo nome", correta: false }
      ],
      explicacao: "Santificação nasce da regeneração, que cria um novo coração e novas disposições."
    },
    {
      id: 7,
      pergunta: "Qual é a luta contínua presente na vida do crente, segundo Gálatas 5:17?",
      referencias: ["Gálatas 5:17", "Romanos 7:23", "1 Pedro 2:11"],
      alternativas: [
        { id: "a", texto: "Contra inimigos físicos", correta: false },
        { id: "b", texto: "Contra o mundo exterior", correta: false },
        { id: "c", texto: "Contra governos", correta: false },
        { id: "d", texto: "Contra a carne e o pecado interno", correta: true },
        { id: "e", texto: "Contra tradições antigas", correta: false },
        { id: "f", texto: "Contra pessoas difíceis", correta: false }
      ],
      explicacao: "O crente vive uma batalha espiritual interna até o dia da glorificação."
    },
    {
      id: 8,
      pergunta: "Como Romanos 12:2 orienta a santificação prática?",
      referencias: ["Romanos 12:2", "Efésios 4:22-24", "Colossenses 3:1-10"],
      alternativas: [
        { id: "a", texto: "Mudança externa", correta: false },
        { id: "b", texto: "Renovação mental e espiritual", correta: true },
        { id: "c", texto: "Submissão à tradição", correta: false },
        { id: "d", texto: "Repetição de rituais", correta: false },
        { id: "e", texto: "Reclusão monástica", correta: false },
        { id: "f", texto: "Voto de pobreza", correta: false }
      ],
      explicacao: "A mente renovada pela verdade conduz à vida santa. Santificação começa no coração e mente."
    },
    {
      id: 9,
      pergunta: "O que distingue a santificação da justificação?",
      referencias: ["1 Coríntios 6:11", "Romanos 8:30", "Hebreus 10:14"],
      alternativas: [
        { id: "a", texto: "Nada; são iguais", correta: false },
        { id: "b", texto: "Justificação é interna; santificação é externa", correta: false },
        { id: "c", texto: "Justificação é instantânea; santificação é progressiva", correta: true },
        { id: "d", texto: "Ambas são progressivas", correta: false },
        { id: "e", texto: "Santificação é mais importante", correta: false },
        { id: "f", texto: "Justificação depende de nós", correta: false }
      ],
      explicacao: "Justificação é um ato jurídico. Santificação é um processo contínuo de transformação."
    },
    {
      id: 10,
      pergunta: "Segundo 2 Coríntios 7:1, como o crente deve responder à santificação?",
      referencias: ["2 Coríntios 7:1", "Hebreus 12:1", "Colossenses 3:5"],
      alternativas: [
        { id: "a", texto: "Relaxando na graça", correta: false },
        { id: "b", texto: "Negligenciando os pecados ocultos", correta: false },
        { id: "c", texto: "Buscando perfeição prática", correta: true },
        { id: "d", texto: "Desistindo diante das falhas", correta: false },
        { id: "e", texto: "Confiando em si mesmo", correta: false },
        { id: "f", texto: "Evitando responsabilidades", correta: false }
      ],
      explicacao: "A graça que justifica também ensina a viver de forma santa e diligente diante de Deus."
    },
    {
      id: 11,
      pergunta: "Qual é a fonte de poder para a santificação?",
      referencias: ["Gálatas 5:16", "Romanos 8:13", "Efésios 3:16"],
      alternativas: [
        { id: "a", texto: "Força de vontade", correta: false },
        { id: "b", texto: "Sabedoria humana", correta: false },
        { id: "c", texto: "Espírito Santo", correta: true },
        { id: "d", texto: "Disciplina externa apenas", correta: false },
        { id: "e", texto: "Padrões sociais", correta: false },
        { id: "f", texto: "Êxtase místico", correta: false }
      ],
      explicacao: "É o Espírito quem capacita o crente a mortificar o pecado e viver para Deus."
    },
    {
      id: 12,
      pergunta: "Qual é o alvo final da santificação, segundo 1 Tessalonicenses 5:23?",
      referencias: ["1 Tessalonicenses 5:23", "Romanos 8:29", "Efésios 5:27"],
      alternativas: [
        { id: "a", texto: "Ter boa reputação", correta: false },
        { id: "b", texto: "Ser respeitado pelos homens", correta: false },
        { id: "c", texto: "Ser irrepreensível diante de Deus", correta: true },
        { id: "d", texto: "Ser líder espiritual", correta: false },
        { id: "e", texto: "Viver sem problemas", correta: false },
        { id: "f", texto: "Ganhar influência", correta: false }
      ],
      explicacao: "O propósito final é tornar o crente semelhante a Cristo, puro e separado para a glória de Deus."
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "Separados para Deus",
      leitura: "1 Coríntios 6:11",
      texto: "A santificação começa com a separação do mundo e a consagração a Deus. Fomos retirados do império das trevas e colocados no Reino do Filho. Agora pertencemos a Deus — corpo, alma e espírito.",
      reflexao: "Pergunte-se hoje: \"Esta decisão honra o fato de que sou santo ao Senhor?\"",
      oracao: "Senhor, fui separado por Ti. Ajuda-me a viver como quem Te pertence totalmente."
    },
    {
      dia: 2,
      titulo: "Santifica-os na Verdade",
      leitura: "João 17:17",
      texto: "A Palavra de Deus é o instrumento principal da santificação. Ao ser lida, pregada e meditada, ela renova a mente e transforma o coração. Sem ela, não há santidade verdadeira.",
      reflexao: "Separe tempo hoje para ler e meditar profundamente em um salmo.",
      oracao: "Pai, que a Tua Palavra molde meus pensamentos, sentimentos e ações."
    },
    {
      dia: 3,
      titulo: "Santidade é Necessária",
      leitura: "Hebreus 12:14",
      texto: "Santidade não é opcional. É evidência de vida nova. O crente verdadeiro não vive no pecado, mas na luta contra ele. Santidade é a marca dos filhos de Deus.",
      reflexao: "Reflita: há pecados tolerados em sua vida? Hoje é dia de quebrantamento.",
      oracao: "Senhor, guarda-me da indiferença espiritual. Concede-me sede de pureza."
    },
    {
      dia: 4,
      titulo: "O Fruto do Espírito",
      leitura: "Gálatas 5:22-23",
      texto: "Santidade se revela em caráter, não em experiências espetaculares. Deus quer formar em nós o caráter de Cristo. Isso se manifesta no modo como amamos, reagimos, falamos e vivemos.",
      reflexao: "Escolha um fruto do Espírito e ore especificamente por ele hoje.",
      oracao: "Espírito Santo, produz em mim o fruto da Tua presença. Molda meu coração segundo Cristo."
    },
    {
      dia: 5,
      titulo: "Trabalhai, Porque Deus Opera",
      leitura: "Filipenses 2:12-13",
      texto: "Santificação envolve esforço espiritual, mas não depende de nossa força. Deus opera em nós, e por isso podemos lutar com esperança e confiança. É um esforço sustentado pela graça.",
      reflexao: "Dedique tempo hoje à oração pessoal. Lute em oração por transformação real.",
      oracao: "Senhor, dá-me diligência sem orgulho, e dependência sem passividade."
    },
    {
      dia: 6,
      titulo: "Mortificai o Pecado",
      leitura: "Colossenses 3:5",
      texto: "Santificação é guerra espiritual. O pecado não deve ser domesticado, mas morto. A carne deve ser combatida diariamente com armas espirituais: Palavra, oração e comunhão.",
      reflexao: "Identifique hoje uma área específica de pecado e clame por vitória.",
      oracao: "Deus santo, mostra-me meus pecados ocultos e ajuda-me a mortificá-los pela Tua graça."
    },
    {
      dia: 7,
      titulo: "Transformados em Glória",
      leitura: "2 Coríntios 3:18",
      texto: "A santificação é preparação para a glória. Somos moldados à imagem de Cristo até o dia em que o veremos face a face. Cada passo, cada prova, cada queda e restauração — tudo coopera para esse fim.",
      reflexao: "Agradeça hoje por cada área em que você já vê progresso espiritual.",
      oracao: "Senhor, completa em mim a obra que começaste. Que eu Te reflita mais hoje do que ontem."
    }
  ]
},
{
  id: 9,
  titulo: "Perseverança dos Santos",
  introducao: {
    texto: "A perseverança dos santos é a doutrina pela qual se afirma que todos os que foram verdadeiramente regenerados, justificados e adotados por Deus permanecerão na fé até o fim e jamais cairão total e finalmente da graça. Essa perseverança não depende da força humana, mas da fidelidade de Deus que sustenta Seus eleitos.\n\nNatureza da Perseverança\n\nNão é perfeição — os santos podem cair em pecado, mas não perderão sua salvação definitiva.\n\nÉ garantida pela aliança — Deus prometeu levar à glória todos os que justificou (Romanos 8:30).\n\nDepende da intercessão de Cristo — Ele vive para interceder e sustentar os Seus (Hebreus 7:25).\n\nÉ sustentada pelo Espírito Santo — O Espírito sela e preserva os crentes até o fim (Efésios 4:30).\n\nEvidencia-se pela fé contínua e frutos de obediência — O verdadeiro crente persevera porque foi transformado.\n\nTextos Fundamentais\n\nFiel é o Deus que começou — Filipenses 1:6; 1 Coríntios 1:8-9\n\nNinguém arrebata das mãos de Cristo — João 10:27-29\n\nNada nos separa de Deus — Romanos 8:35-39\n\nCristo intercede pelos Seus — Hebreus 7:25; Lucas 22:31-32\n\nConfissão de Fé de Westminster — Cap. 17\n\n\"Aqueles a quem Deus aceitou em Seu Amado, e eficazmente chamou e santificou pelo Seu Espírito, nunca podem cair total nem finalmente do estado de graça, mas, com certeza, perseverarão até o fim e serão salvos eternamente.\"\n\nSíntese Reformada da Perseverança\n\nA perseverança é fruto da obra completa e fiel de Deus.\n\nOs crentes perseveram porque são guardados pelo poder de Deus.\n\nA queda total e final é impossível para os verdadeiros regenerados.\n\nA perseverança não exclui a necessidade de vigilância, oração e santidade.\n\nÉ consolo, motivação e segurança para o crente verdadeiro."
  },
  questoes: [
    {
      id: 1,
      pergunta: "Segundo Filipenses 1:6, o que Deus fará com a boa obra iniciada nos crentes?",
      referencias: ["Filipenses 1:6", "Salmos 138:8", "1 Coríntios 1:8-9", "CFW 17.1"],
      alternativas: [
        { id: "a", texto: "Suspenderá se houver falhas", correta: false },
        { id: "b", texto: "Deixará incompleta", correta: false },
        { id: "c", texto: "Completará fielmente", correta: true },
        { id: "d", texto: "Dependerá do esforço final do homem", correta: false },
        { id: "e", texto: "Substituirá por outra obra", correta: false },
        { id: "f", texto: "Cancelará em caso de pecado", correta: false }
      ],
      explicacao: "Deus é o autor e consumador da salvação. Em linha com a CFW 17.1, os verdadeiros crentes não cairão total e finalmente do estado de graça."
    },
    {
      id: 2,
      pergunta: "De acordo com João 10:28-29, o que pode arrebatar os crentes das mãos de Cristo?",
      referencias: ["João 10:28-29", "Romanos 8:38-39", "Colossenses 3:3"],
      alternativas: [
        { id: "a", texto: "O pecado habitual", correta: false },
        { id: "b", texto: "A vontade do diabo", correta: false },
        { id: "c", texto: "O mundo", correta: false },
        { id: "d", texto: "As tentações", correta: false },
        { id: "e", texto: "Nada e ninguém", correta: true },
        { id: "f", texto: "A dúvida", correta: false }
      ],
      explicacao: "A segurança do crente está nas mãos de Cristo e do Pai. Nada externo ou interno pode desfazer essa proteção."
    },
    {
      id: 3,
      pergunta: "O que Romanos 8:30 ensina sobre a ordem da salvação?",
      referencias: ["Romanos 8:30", "João 6:39", "Hebreus 10:14"],
      alternativas: [
        { id: "a", texto: "A salvação pode ser perdida", correta: false },
        { id: "b", texto: "Apenas alguns justificados serão glorificados", correta: false },
        { id: "c", texto: "Justificação e glorificação estão unidas", correta: true },
        { id: "d", texto: "Glorificação é incerta", correta: false },
        { id: "e", texto: "O fim depende do início", correta: false },
        { id: "f", texto: "Cada fase é separada", correta: false }
      ],
      explicacao: "Deus conduz até o fim todos os que justificou. A cadeia da salvação é inquebrável."
    },
    {
      id: 4,
      pergunta: "Qual é o papel de Cristo na perseverança, segundo Hebreus 7:25?",
      referencias: ["Hebreus 7:25", "Lucas 22:31-32", "Romanos 8:34"],
      alternativas: [
        { id: "a", texto: "Interceder continuamente", correta: true },
        { id: "b", texto: "Julgar os crentes", correta: false },
        { id: "c", texto: "Acusar diante do Pai", correta: false },
        { id: "d", texto: "Abandonar os fracos", correta: false },
        { id: "e", texto: "Aplicar disciplina condenatória", correta: false },
        { id: "f", texto: "Rejeitar quando há falhas", correta: false }
      ],
      explicacao: "A perseverança dos santos é garantida pela contínua intercessão de Cristo em favor dos Seus (Hb 7:25; Rm 8:34)."
    },
    {
      id: 5,
      pergunta: "O que Pedro deveria fazer após sua queda, segundo Lucas 22:32?",
      referencias: ["Lucas 22:32", "João 21:15-17", "1 Pedro 5:10"],
      alternativas: [
        { id: "a", texto: "Recomeçar do zero", correta: false },
        { id: "b", texto: "Negar seu chamado", correta: false },
        { id: "c", texto: "Esquecer o ocorrido", correta: false },
        { id: "d", texto: "Abandonar o ministério", correta: false },
        { id: "e", texto: "Fortalecer outros após ser restaurado", correta: true },
        { id: "f", texto: "Viver culpado", correta: false }
      ],
      explicacao: "A perseverança permite quedas temporárias, mas não a ruína final. Deus restaura e usa Seus filhos."
    },
    {
      id: 6,
      pergunta: "Segundo 1 Pedro 1:5, por que os crentes perseveram?",
      referencias: ["1 Pedro 1:5", "Salmo 37:28", "2 Timóteo 4:18"],
      alternativas: [
        { id: "a", texto: "Por força de vontade", correta: false },
        { id: "b", texto: "Por temor do inferno", correta: false },
        { id: "c", texto: "Por mérito constante", correta: false },
        { id: "d", texto: "Pelo poder de Deus", correta: true },
        { id: "e", texto: "Pelo apoio de líderes", correta: false },
        { id: "f", texto: "Pela repetição de rituais", correta: false }
      ],
      explicacao: "A perseverança depende do poder divino, não da estabilidade humana."
    },
    {
      id: 7,
      pergunta: "O que Romanos 8:35-39 declara sobre nossa relação com o amor de Deus?",
      referencias: ["Romanos 8:35-39", "Efésios 1:13-14", "2 Coríntios 1:21-22"],
      alternativas: [
        { id: "a", texto: "O pecado não confessado", correta: false },
        { id: "b", texto: "A perseguição", correta: false },
        { id: "c", texto: "A morte", correta: false },
        { id: "d", texto: "Nada pode separar", correta: true },
        { id: "e", texto: "Somente a apostasia", correta: false },
        { id: "f", texto: "Nenhuma certeza é possível", correta: false }
      ],
      explicacao: "O amor de Deus em Cristo é invencível. A salvação dos crentes é segura e inabalável."
    },
    {
      id: 8,
      pergunta: "Segundo Judas 24-25, quem é capaz de nos guardar de tropeçar?",
      referencias: ["Judas 24-25", "Salmo 121:3", "Isaías 41:10"],
      alternativas: [
        { id: "a", texto: "Nós mesmos", correta: false },
        { id: "b", texto: "Nossos líderes", correta: false },
        { id: "c", texto: "A igreja", correta: false },
        { id: "d", texto: "Deus", correta: true },
        { id: "e", texto: "Anjos", correta: false },
        { id: "f", texto: "Nossa consciência", correta: false }
      ],
      explicacao: "O poder para permanecer não está em nós, mas em Deus, que é fiel e poderoso para nos guardar."
    },
    {
      id: 9,
      pergunta: "Qual é o fruto visível da perseverança, segundo Mateus 24:13?",
      referencias: ["Mateus 24:13", "João 15:4-6", "Hebreus 3:14"],
      alternativas: [
        { id: "a", texto: "Emoções fortes", correta: false },
        { id: "b", texto: "Consagração inicial", correta: false },
        { id: "c", texto: "Perseverança na fé e obediência", correta: true },
        { id: "d", texto: "Experiências espirituais", correta: false },
        { id: "e", texto: "Ativismo religioso", correta: false },
        { id: "f", texto: "Conhecimento teológico", correta: false }
      ],
      explicacao: "A salvação verdadeira se evidencia por uma vida que persevera até o fim em Cristo."
    },
    {
      id: 10,
      pergunta: "Em 2 Timóteo 2:13, o que acontece se formos infiéis?",
      referencias: ["2 Timóteo 2:13", "Lamentações 3:22-23", "Salmo 89:33"],
      alternativas: [
        { id: "a", texto: "Deus nos abandona", correta: false },
        { id: "b", texto: "Perda da salvação", correta: false },
        { id: "c", texto: "Somos rejeitados", correta: false },
        { id: "d", texto: "Deus continua fiel", correta: true },
        { id: "e", texto: "Caímos totalmente da graça", correta: false },
        { id: "f", texto: "Recomeçamos do zero", correta: false }
      ],
      explicacao: "A fidelidade de Deus não depende da nossa. Ele permanece leal ao pacto de salvação em Cristo."
    },
    {
      id: 11,
      pergunta: "Como o crente deve responder à promessa da perseverança?",
      referencias: ["2 Pedro 1:10", "Filipenses 2:12", "Hebreus 10:23"],
      alternativas: [
        { id: "a", texto: "Com relaxamento", correta: false },
        { id: "b", texto: "Com apatia", correta: false },
        { id: "c", texto: "Com segurança presunçosa", correta: false },
        { id: "d", texto: "Com diligência e santidade", correta: true },
        { id: "e", texto: "Com orgulho doutrinário", correta: false },
        { id: "f", texto: "Com incerteza", correta: false }
      ],
      explicacao: "A segurança da salvação leva à vigilância espiritual e ao crescimento em graça."
    },
    {
      id: 12,
      pergunta: "O que Apocalipse 3:5 promete ao que vencer?",
      referencias: ["Apocalipse 3:5", "Apocalipse 2:10", "Lucas 10:20"],
      alternativas: [
        { id: "a", texto: "Viverá sem provas", correta: false },
        { id: "b", texto: "Terá sucesso terreno", correta: false },
        { id: "c", texto: "Receberá recompensas temporais", correta: false },
        { id: "d", texto: "Terá seu nome eternamente garantido", correta: true },
        { id: "e", texto: "Será isento de disciplina", correta: false },
        { id: "f", texto: "Se tornará infalível", correta: false }
      ],
      explicacao: "A perseverança conduz à glorificação. Os nomes dos santos estão selados no livro da vida."
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "Aquele que Começou, Completará",
      leitura: "Filipenses 1:6",
      texto: "\"Aquele que começou boa obra em vós há de completá-la até ao dia de Cristo Jesus.\"\n\nDeus não abandona a obra que começa. A perseverança não depende do seu desempenho perfeito, mas da fidelidade do Pai que prometeu terminar o que iniciou.",
      reflexao: "Repita hoje, sempre que desanimar: \"Deus não falha no que começa.\"",
      oracao: "Senhor, confio que terminarás a Tua obra em mim. Sustenta-me em cada passo."
    },
    {
      dia: 2,
      titulo: "Nas Mãos de Cristo",
      leitura: "João 10:28",
      texto: "\"Ninguém as arrebatará da minha mão.\"\n\nAs mãos de Cristo são firmes, eternas e invioláveis. Quem está nelas está seguro, ainda que passe por quedas e tempestades. Essa é sua verdadeira segurança.",
      reflexao: "Confesse sua segurança em Cristo: \"Estou nas mãos do meu Salvador.\"",
      oracao: "Jesus, eu Te agradeço porque minha salvação está segura nas Tuas mãos, não nas minhas."
    },
    {
      dia: 3,
      titulo: "Intercessão que Sustenta",
      leitura: "Hebreus 7:25",
      texto: "\"Vivendo sempre para interceder por eles.\"\n\nCristo não apenas morreu por nós, mas vive para nos guardar. Sua intercessão é eficaz e constante, mesmo quando nossa fé vacila.",
      reflexao: "Ore hoje com confiança, lembrando que Cristo ora por você.",
      oracao: "Senhor Jesus, continua intercedendo por mim. Eu preciso da Tua fidelidade a cada dia."
    },
    {
      dia: 4,
      titulo: "Guardados pelo Poder de Deus",
      leitura: "1 Pedro 1:5",
      texto: "\"Guardados pelo poder de Deus, mediante a fé.\"\n\nNossa perseverança não se apoia em nossa força. Somos guardados pelo poder de Deus. É Ele quem vigia nosso caminho e nos sustenta até o fim.",
      reflexao: "Rejeite a autoconfiança espiritual. Renda-se ao cuidado poderoso de Deus.",
      oracao: "Pai, meu coração se alegra por saber que sou guardado por Ti."
    },
    {
      dia: 5,
      titulo: "Nada nos Separará",
      leitura: "Romanos 8:39",
      texto: "\"Nada poderá nos separar do amor de Deus.\"\n\nA perseverança dos santos é ancorada no amor inquebrantável de Deus. Nem o pecado, nem o sofrimento, nem a morte poderão desfazer o que o amor de Deus uniu em Cristo.",
      reflexao: "Medite hoje em como o amor de Deus tem sustentado você até aqui.",
      oracao: "Senhor, que essa certeza seja meu abrigo: Teu amor me cerca e me guarda eternamente."
    },
    {
      dia: 6,
      titulo: "Prova da Fé",
      leitura: "Mateus 24:13",
      texto: "\"Aquele que perseverar até o fim será salvo.\"\n\nA perseverança não é o caminho para merecer a salvação, mas a evidência de que ela é real. O crente verdadeiro permanece, porque foi transformado.",
      reflexao: "Avalie sua caminhada: você está avançando com fidelidade ou apenas resistindo?",
      oracao: "Deus fiel, fortalece minha fé para que eu persevere com alegria e reverência."
    },
    {
      dia: 7,
      titulo: "Nome no Livro da Vida",
      leitura: "Apocalipse 3:5",
      texto: "\"Jamais apagarei o seu nome do livro da vida.\"\n\nOs nomes dos santos estão escritos no livro da vida desde a eternidade. A promessa de Cristo é clara: quem persevera será honrado e jamais esquecido.",
      reflexao: "Celebre hoje sua esperança segura. Viva com os olhos na glória prometida.",
      oracao: "Jesus, Te louvo porque meu nome está escrito por Tua graça, e será preservado por Teu poder."
    }
  ]
},
{
  id: 10,
  titulo: "Glorificação",
  introducao: {
    texto: "Glorificação é o ato final da obra redentora de Deus na vida dos Seus eleitos. É a consumação da salvação, quando os crentes serão plenamente libertos da presença do pecado, receberão corpos incorruptíveis e viverão eternamente na presença gloriosa de Deus.\n\nEssa doutrina abrange:\n\n1. A ressurreição corporal dos crentes\n2. A transformação final da alma\n3. A perfeita conformidade com Cristo\n4. A entrada definitiva na comunhão eterna com Deus\n\nCaracterísticas da Glorificação:\n\n1. É futura e escatológica — ocorrerá na volta de Cristo.\n2. É completa — envolve corpo e alma.\n3. É irreversível — estado eterno e definitivo.\n4. É fruto da graça soberana — resultado final da eleição e da perseverança.\n5. É centrada em Cristo — veremos a Cristo e seremos como Ele.\n\nConfissão de Fé de Westminster — Capítulo 32 e 33\n\n\"No último dia, os corpos de todos os santos, sendo unidos à alma, serão glorificados. Então, os eleitos entrarão na posse plena e eterna da bem-aventurança.\"\n\nSíntese Reformada da Glorificação:\n\n1. É a esperança suprema dos crentes.\n2. É resultado certo da salvação iniciada por Deus.\n3. Os crentes serão glorificados como Cristo, em corpo, alma e comunhão.\n4. Essa verdade consola, anima e fortalece os que sofrem nesta vida.\n5. Tudo converge para a glória de Deus — glorificação é o ápice da graça."
  },
  questoes: [
    {
      id: 1,
      pergunta: "Segundo Romanos 8:30, quem será glorificado?",
      referencias: ["Romanos 8:30", "João 6:39-40", "Filipenses 1:6"],
      alternativas: [
        { id: "a", texto: "Os que merecem", correta: false },
        { id: "b", texto: "Os que vivem perfeitamente", correta: false },
        { id: "c", texto: "Os que perseveram por esforço próprio", correta: false },
        { id: "d", texto: "Todos os predestinados, chamados e justificados", correta: true },
        { id: "e", texto: "Os que seguem tradições", correta: false },
        { id: "f", texto: "Os que fazem boas obras", correta: false }
      ],
      explicacao: "A glorificação é garantida para todos os que foram justificados. A cadeia da salvação é inquebrantável, culminando no que a tradição reformada chama de consumação final da redenção."
    },
    {
      id: 2,
      pergunta: "O que será transformado na glorificação, segundo Filipenses 3:21?",
      referencias: ["Filipenses 3:21", "1 Coríntios 15:42-44", "1 João 3:2"],
      alternativas: [
        { id: "a", texto: "Somente a alma", correta: false },
        { id: "b", texto: "O corpo físico e mortal", correta: true },
        { id: "c", texto: "As emoções", correta: false },
        { id: "d", texto: "A memória apenas", correta: false },
        { id: "e", texto: "O espírito apenas", correta: false },
        { id: "f", texto: "O ambiente em volta", correta: false }
      ],
      explicacao: "A glorificação inclui a ressurreição do corpo em estado de perfeição, semelhante ao corpo glorificado de Cristo, conforme 1 Coríntios 15 e Filipenses 3:21."
    },
    {
      id: 3,
      pergunta: "Segundo 1 João 3:2, como será nossa semelhança com Cristo?",
      referencias: ["1 João 3:2", "Romanos 8:29", "Colossenses 3:4"],
      alternativas: [
        { id: "a", texto: "Parcial", correta: false },
        { id: "b", texto: "Apenas espiritual", correta: false },
        { id: "c", texto: "Total, em corpo e alma", correta: true },
        { id: "d", texto: "Em obediência externa", correta: false },
        { id: "e", texto: "Em sentimentos", correta: false },
        { id: "f", texto: "Simbólica", correta: false }
      ],
      explicacao: "Seremos conformados à imagem de Cristo — não apenas em aparência, mas em santidade e glória."
    },
    {
      id: 4,
      pergunta: "Segundo 2 Coríntios 4:17, como Paulo descreve a glória futura?",
      referencias: ["2 Coríntios 4:17", "Romanos 8:18", "Apocalipse 21:4"],
      alternativas: [
        { id: "a", texto: "Temporária", correta: false },
        { id: "b", texto: "Paga com sofrimento", correta: false },
        { id: "c", texto: "Superior a qualquer tribulação presente", correta: true },
        { id: "d", texto: "Incerta", correta: false },
        { id: "e", texto: "Depende do esforço", correta: false },
        { id: "f", texto: "Inalcançável", correta: false }
      ],
      explicacao: "A glória futura compensa plenamente os sofrimentos do presente. É eterna e incomparável."
    },
    {
      id: 5,
      pergunta: "Qual é a herança dos santos, segundo Romanos 8:17?",
      referencias: ["Romanos 8:17", "1 Pedro 1:4", "Efésios 1:18"],
      alternativas: [
        { id: "a", texto: "Glória compartilhada com Cristo", correta: true },
        { id: "b", texto: "Terras e bens terrenos", correta: false },
        { id: "c", texto: "Autoridade política", correta: false },
        { id: "d", texto: "Conhecimento místico", correta: false },
        { id: "e", texto: "Vida fácil", correta: false },
        { id: "f", texto: "Imortalidade natural", correta: false }
      ],
      explicacao: "A herança dos santos é eterna e celestial — compartilhamos a glória do Filho."
    },
    {
      id: 6,
      pergunta: "O que Apocalipse 21:4 promete quanto ao sofrimento?",
      referencias: ["Apocalipse 21:4", "Isaías 25:8", "João 16:22"],
      alternativas: [
        { id: "a", texto: "Diminuição do sofrimento", correta: false },
        { id: "b", texto: "Alívio temporário", correta: false },
        { id: "c", texto: "Extinção completa da dor", correta: true },
        { id: "d", texto: "Castigo merecido", correta: false },
        { id: "e", texto: "Continuidade em outra forma", correta: false },
        { id: "f", texto: "Substituição por outra pena", correta: false }
      ],
      explicacao: "A glorificação elimina completamente o sofrimento, a morte e todo efeito da queda."
    },
    {
      id: 7,
      pergunta: "Em 1 Coríntios 15:52, como ocorrerá a glorificação corporal?",
      referencias: ["1 Coríntios 15:52", "1 Tessalonicenses 4:16-17", "João 5:28-29"],
      alternativas: [
        { id: "a", texto: "Gradualmente", correta: false },
        { id: "b", texto: "Em processo", correta: false },
        { id: "c", texto: "Instantaneamente, por milagre", correta: true },
        { id: "d", texto: "Naturalmente, pela evolução", correta: false },
        { id: "e", texto: "Simbolicamente", correta: false },
        { id: "f", texto: "Após mil anos", correta: false }
      ],
      explicacao: "A ressurreição e transformação dos corpos ocorrerá em um instante, no retorno de Cristo."
    },
    {
      id: 8,
      pergunta: "Quem participará da glorificação, segundo Colossenses 3:4?",
      referencias: ["Colossenses 3:4", "2 Timóteo 2:10", "Romanos 5:2"],
      alternativas: [
        { id: "a", texto: "Apenas os mártires", correta: false },
        { id: "b", texto: "Os que alcançarem um nível elevado de santidade", correta: false },
        { id: "c", texto: "Todos os que estão em Cristo", correta: true },
        { id: "d", texto: "Os que superarem provas específicas", correta: false },
        { id: "e", texto: "Apenas os apóstolos", correta: false },
        { id: "f", texto: "Os que fizerem milagres", correta: false }
      ],
      explicacao: "Todos os crentes verdadeiros serão glorificados, não por méritos, mas por estarem unidos a Cristo."
    },
    {
      id: 9,
      pergunta: "O que acontecerá com a criação, segundo Romanos 8:21?",
      referencias: ["Romanos 8:21", "Isaías 65:17", "2 Pedro 3:13"],
      alternativas: [
        { id: "a", texto: "Será destruída completamente", correta: false },
        { id: "b", texto: "Será redimida e restaurada", correta: true },
        { id: "c", texto: "Será esquecida", correta: false },
        { id: "d", texto: "Deixará de existir", correta: false },
        { id: "e", texto: "Tornar-se-á puramente espiritual", correta: false },
        { id: "f", texto: "Tornar-se-á mais resistente", correta: false }
      ],
      explicacao: "A glorificação envolve também a criação, que será renovada para abrigar os redimidos em um novo céu e nova terra."
    },
    {
      id: 10,
      pergunta: "Em que os crentes se gloriarão na eternidade, segundo Efésios 2:7?",
      referencias: ["Efésios 2:7", "Apocalipse 5:9-13", "1 Coríntios 1:31"],
      alternativas: [
        { id: "a", texto: "Nos seus próprios méritos", correta: false },
        { id: "b", texto: "Na sua fidelidade", correta: false },
        { id: "c", texto: "Na graça de Deus em Cristo", correta: true },
        { id: "d", texto: "Na sua posição e título", correta: false },
        { id: "e", texto: "Na história da igreja", correta: false },
        { id: "f", texto: "Em suas boas obras", correta: false }
      ],
      explicacao: "Toda glória da salvação — inclusive da glorificação — pertence a Deus. Os redimidos cantarão a graça eternamente."
    },
    {
      id: 11,
      pergunta: "O que ocorrerá com o pecado na glorificação?",
      referencias: ["Apocalipse 21:27", "Hebreus 12:23", "2 Pedro 3:13"],
      alternativas: [
        { id: "a", texto: "Será tolerado em pequenos graus", correta: false },
        { id: "b", texto: "Continuará oculto", correta: false },
        { id: "c", texto: "Desaparecerá completamente", correta: true },
        { id: "d", texto: "Existirá como teste", correta: false },
        { id: "e", texto: "Persistirá em memória", correta: false },
        { id: "f", texto: "Será perdoado continuamente", correta: false }
      ],
      explicacao: "A glorificação inclui a purificação final de todo pecado. Os redimidos estarão moralmente perfeitos."
    },
    {
      id: 12,
      pergunta: "Qual é o clímax da glorificação, segundo Apocalipse 22:4?",
      referencias: ["Apocalipse 22:4", "Salmos 17:15", "Mateus 5:8"],
      alternativas: [
        { id: "a", texto: "Vida longa", correta: false },
        { id: "b", texto: "Descanso eterno", correta: false },
        { id: "c", texto: "Ver a face de Deus", correta: true },
        { id: "d", texto: "Conhecimento profundo", correta: false },
        { id: "e", texto: "Liberdade plena", correta: false },
        { id: "f", texto: "Recompensas pessoais", correta: false }
      ],
      explicacao: "O ápice da glorificação é a visão beatífica — contemplar Deus em glória, face a face, para sempre."
    }
  ],
  meditacao: [
    {
      dia: 1,
      titulo: "A Obra Será Completada",
      leitura: "Romanos 8:30",
      texto: "Desde a eternidade, Deus traçou o plano da salvação completa. A glorificação é o fim garantido do caminho iniciado na eleição. A obra que começou será consumada na perfeição eterna.",
      reflexao: "Relembre a fidelidade de Deus até aqui. Confie que Ele terminará a obra.",
      oracao: "Senhor, que eu viva cada dia com os olhos fixos na glória futura que tens preparado para mim."
    },
    {
      dia: 2,
      titulo: "Corpo Transformado",
      leitura: "Filipenses 3:21",
      texto: "O corpo fraco, sujeito à dor e ao pecado, será transformado. A glorificação inclui a redenção do nosso corpo, conforme o corpo ressuscitado de Cristo. Teremos corpos glorificados, incorruptíveis e imortais.",
      reflexao: "Consagre hoje seu corpo a Deus, como templo do Espírito, aguardando sua futura transformação.",
      oracao: "Senhor, obrigado porque minha esperança não está na juventude ou força física, mas na glorificação que virá."
    },
    {
      dia: 3,
      titulo: "Seremos Como Ele",
      leitura: "1 João 3:2",
      texto: "A glorificação inclui não apenas a aparência física, mas a natureza moral. Seremos conformados à imagem do Filho — santos, puros, perfeitos. A visão de Cristo nos transformará.",
      reflexao: "Viva hoje com o desejo de crescer em santidade, como antecipação da glória futura.",
      oracao: "Jesus, anseio pelo dia em que Te verei como Tu és, e serei como Tu és."
    },
    {
      dia: 4,
      titulo: "Glória Incomparável",
      leitura: "2 Coríntios 4:17",
      texto: "As dores desta vida não são dignas de ser comparadas com a glória que virá. O sofrimento, longe de ser em vão, está preparando uma eternidade de alegria, pureza e paz.",
      reflexao: "Encare as dificuldades de hoje com os olhos na eternidade. Medite em Romanos 8:18.",
      oracao: "Senhor, fortalece-me na tribulação com a certeza da glória futura."
    },
    {
      dia: 5,
      titulo: "Novo Céu e Nova Terra",
      leitura: "Apocalipse 21:4",
      texto: "O mundo será renovado. A criação deixará de gemer. Lágrimas, dor, morte e luto desaparecerão. Deus habitará conosco e tudo será novo.",
      reflexao: "Reflita: onde está sua esperança — na terra presente ou no mundo por vir?",
      oracao: "Pai, prepara meu coração para morar contigo. Dá-me sede do novo céu e da nova terra."
    },
    {
      dia: 6,
      titulo: "Coerdeiros com Cristo",
      leitura: "Romanos 8:17",
      texto: "A herança eterna pertence aos filhos de Deus. Compartilharemos da glória de Cristo. Não apenas veremos, mas participaremos da Sua glória.",
      reflexao: "Escreva hoje uma oração de gratidão pela herança que o espera na eternidade.",
      oracao: "Senhor, mesmo no sofrimento, ajuda-me a lembrar que sou herdeiro de uma glória eterna."
    },
    {
      dia: 7,
      titulo: "Veremos Sua Face",
      leitura: "Apocalipse 22:4",
      texto: "Nada será maior do que isso: contemplar a face de Deus. Não haverá véu, culpa, pecado ou distância. A glorificação culmina na comunhão perfeita com o Criador.",
      reflexao: "Passe um tempo hoje em silêncio, apenas adorando e ansiando por ver a face de Deus.",
      oracao: "Deus eterno, prepara meu coração para Te ver face a face. Que meu anseio por Ti cresça dia após dia."
    }
  ]
}
]
}
,
{
  id: 3,
  titulo: "A mediação de Cristo — Por que precisamos de um Salvador?",
  introducao: {
    texto: "O estudo da mediação de Cristo não pode ser iniciado corretamente sem antes compreendermos duas realidades fundamentais: quem Deus é e quem nós somos.\n\nEssa ordem não é arbitrária — é bíblica, teológica e pastoralmente necessária. João Calvino abre as Institutas lembrando que o verdadeiro conhecimento envolve o conhecimento de Deus e o conhecimento de nós mesmos. Um ilumina o outro.\n\nSe não compreendermos a santidade, a justiça e a perfeição de Deus, reduziremos o pecado e trataremos Cristo como opcional. Por outro lado, se não compreendermos a gravidade da queda humana — culpa, corrupção e incapacidade espiritual — transformaremos a salvação em mero aprimoramento moral.\n\nPortanto:\n\n- Sem conhecer Deus corretamente, não sentimos a necessidade de reconciliação.\n- Sem conhecer nossa condição corretamente, não buscamos um Salvador verdadeiro.\n\nA Confissão de Fé de Westminster segue essa ordem: primeiro Deus (cap. II), depois o homem em queda (cap. VI), e então Cristo Mediador (cap. VIII). A mediação não é um conceito isolado, mas a resposta divina a um problema real.\n\nA Escritura apresenta esse cenário com clareza:\n\nDeus é santo e justo (Isaías 6:3; Salmos 145:17).\nO homem é pecador e culpado (Romanos 3:23).\nEntre ambos há um abismo que não pode ser atravessado por esforço humano.\n\nÉ nesse contexto que o evangelho se revela como boa notícia necessária: \"Porquanto há um só Deus e um só Mediador entre Deus e os homens, Cristo Jesus, homem\" (1 Timóteo 2:5).\n\nComo vamos caminhar (o mesmo roteiro do menu de subtemas deste módulo):\n\n1. Deus vivo: majestade, santidade e fidelidade\n2. O homem: honra originária e tragédia da queda\n3. O abismo: culpa, justiça e por que mediadores humanos não bastam\n4. Jesus Cristo, único Mediador: obra e vida na presença de Deus\n\nEste módulo não é apenas informativo. Ele chama à resposta: arrependimento, fé e descanso em Cristo.",
    versiculo: "Porquanto há um só Deus e um só Mediador entre Deus e os homens, Cristo Jesus, homem (1 Timóteo 2:5)."
  },
  estudos: [
    {
      id: 1,
      titulo: "Deus Vivo: Majestade, Santidade e Fidelidade",
      /* Oculto temporariamente enquanto o material é revisado/melhorado.
         Trocar para `false` (ou remover) para reexibir nos menus. */
      oculto: true,
      introducao: {
        texto: "A doutrina de Deus na teologia reformada não começa com especulação filosófica, mas com uma pergunta fundamental: onde Deus Se dá a conhecer verdadeiramente?\nA resposta das Escrituras é clara: na Palavra que Ele mesmo revelou e, de modo supremo, na pessoa do Filho:\n\n• \"Ninguém jamais viu a Deus; o Filho unigênito... o revelou\" (João 1:18).\n• \"Havendo Deus outrora falado, muitas vezes e de muitas maneiras, aos pais pelos profetas, nestes últimos dias nos falou pelo Filho\" (Hebreus 1:1-2).\n• Fora dessa revelação, o homem não conhece a Deus — antes, fabrica ídolos conforme sua própria imaginação (Romanos 1:21-23).\n• Por isso, conhecer o Deus verdadeiro é o primeiro passo para compreender a necessidade de um Mediador.\n\n1) Unidade e incomparabilidade\n\nDeus é um só: \"Ouve, Israel, o Senhor nosso Deus é o único Senhor\" (Deuteronômio 6:4). Não há, nem no céu nem na terra, quem Lhe seja comparável (Salmos 89:6-8). Essa unicidade não é mera afirmação numérica, mas envolve exclusividade de adoração e zelo pelo Seu santo nome (Êxodo 20:2-7).\n\nContudo, este único Deus subsiste eternamente em três pessoas (Pai, Filho e Espírito Santo), um só em essência e trino em pessoas (Mateus 28:19). A doutrina da Trindade não é um acréscimo secundário, mas o fundamento indispensável para compreender corretamente a obra de Cristo e do Espírito Santo, bem como a plenitude do ser divino.\n\n2) Atributos incomunicáveis\n\nSão perfeições próprias de Deus, que não pertencem à criatura no mesmo sentido:\n\n• Espiritualidade e invisibilidade — \"Deus é espírito\" (João 4:24); não é limitado por corpo ou espaço (Atos 17:24-25).\n• Autossuficiência (aseidade) — Deus é independente: \"de nada necessita\" (Atos 17:25); tudo procede dEle e para Ele (Romanos 11:36).\n• Imutabilidade — \"Eu, o Senhor, não mudo\" (Malaquias 3:6); nEle não há variação (Tiago 1:17).\n• Eternidade — \"De eternidade a eternidade, tu és Deus\" (Salmos 90:2).\n• Onipresença — Deus está presente em todo lugar, sem se confundir com a criação (Jeremias 23:24; Salmos 139:7).\n• Onisciência e sabedoria — conhece todas as coisas perfeitamente (Salmos 139:1-6).\n• Onipotência — \"faz todas as coisas conforme o conselho da sua vontade\" (Efésios 1:11).\n\nEsses atributos nos conduzem à reverência: Deus não pode ser reduzido à medida humana nem manipulado por vontades criadas.\n\n3) Atributos comunicáveis\n\nSão perfeições que, em grau finito e derivado, refletem-se na criatura:\n\n• Santidade — pureza absoluta e separação do pecado (Isaías 6:3; 1 Pedro 1:15-16).\n• Justiça e retidão — Deus é perfeitamente justo em todos os Seus caminhos (Salmos 145:17).\n• Bondade, misericórdia e graça — \"Compassivo e misericordioso\" (Salmos 103:8); rico em perdoar (Êxodo 34:6-7).\n• Amor — \"Deus é amor\" (1 João 4:8), demonstrado de forma suprema no envio do Filho.\n• Verdade e fidelidade — Deus é absolutamente confiável (2 Timóteo 2:13; Salmos 33:4).\n\nEm Deus não há composição de partes; Seus atributos são uma só essência perfeita. Assim, Sua majestade, santidade e fidelidade não competem entre si, mas revelam a plenitude do Seu ser.\n\n4) Relação com o mundo\n\nA fé reformada rejeita tanto o panteísmo quanto o deísmo. Deus não se confunde com o mundo, mas também não está distante dele. Ele sustenta todas as coisas pela Palavra do Seu poder (Hebreus 1:3) e governa soberanamente cada detalhe da história (Efésios 1:11). Sua providência abrange tanto a ordem da criação quanto a redenção, sem jamais comprometer Sua justiça ou santidade.\n\n5) Fim último e vida cristã\n\nO propósito final da existência humana é glorificar a Deus e desfrutá-Lo para sempre (1 Coríntios 10:31; Salmos 86:9). Isso se expressa de forma concreta: culto \"em espírito e em verdade\" (João 4:24), arrependimento sincero, obediência prática e uma vida inteira submetida ao senhorio de Cristo — no trabalho, na família e em todas as esferas da existência.\n\nA Confissão de Fé de Westminster (cap. II) exprime, em linguagem confessional, boa parte desse panorama — vale confrontar com as Escrituras citadas acima no texto integral do aplicativo.\n"
      },
      questoes: [
        {
          id: 1,
          pergunta: "Segundo João 4:24, qual afirmação orienta o culto verdadeiro a Deus?",
          referencias: ["João 4:24"],
          alternativas: [
            { id: "a", texto: "Deus é matéria, como ídolos de pedra ou metal", correta: false },
            { id: "b", texto: "Deus é espírito; e importa que os seus adoradores o adorem em espírito e em verdade", correta: true },
            { id: "c", texto: "O lugar físico do culto resolve o que importa para Deus", correta: false },
            { id: "d", texto: "Quem adora pode ignorar o que Deus já revelou na Escritura", correta: false }
          ],
          explicacao: "Espiritualidade divina e culto \"em espírito e em verdade\" são o par que João 4:24 fixa — eixo na doutrina de Deus de Berkhof."
        },
        {
          id: 2,
          pergunta: "Segundo Isaías 6:5, por que Isaías exclama: \"Ai de mim! Pois estou perdido\"?",
          referencias: ["Isaías 6:1-5"],
          alternativas: [
            { id: "a", texto: "Porque viu o Rei, o Senhor dos Exércitos, e reconheceu ser homem de lábios impuros", correta: true },
            { id: "b", texto: "Porque duvidou da existência de Deus", correta: false },
            { id: "c", texto: "Porque dormiu durante a visão", correta: false },
            { id: "d", texto: "Porque queria fugir do templo", correta: false }
          ],
          explicacao: "O texto liga visão da santidade do trono à consciência de impureza — núcleo do atributo de santidade."
        },
        {
          id: 3,
          pergunta: "O que Salmos 145:17 declara expressamente sobre o Senhor?",
          referencias: ["Salmos 145:17"],
          alternativas: [
            { id: "a", texto: "Que Ele é injusto quando permite sofrimento", correta: false },
            { id: "b", texto: "Que o Senhor é justo em todos os seus caminhos e bondoso em todas as suas obras", correta: true },
            { id: "c", texto: "Que abandona quem lhe serve", correta: false },
            { id: "d", texto: "Que muda de juízo conforme opiniões humanas", correta: false }
          ],
          explicacao: "Justiça e bondade nos \"caminhos\" e \"obras\" de Deus — atributos morais na linha reformada."
        },
        {
          id: 4,
          pergunta: "Segundo Salmos 139:2-3, que aspectos da vida do salmista Deus conhece ou percebe?",
          referencias: ["Salmos 139:1-4"],
          alternativas: [
            { id: "a", texto: "Só palavras e atos públicos, nada da vida íntima", correta: false },
            { id: "b", texto: "Sabe quando o salmista se assenta e se levanta; de longe penetra os pensamentos; esquadrinha andar, deitar e conhece todos os caminhos", correta: true },
            { id: "c", texto: "Somente grandes pecados; o cotidiano fica oculto", correta: false },
            { id: "d", texto: "Nada sobre futuro nem decisões", correta: false }
          ],
          explicacao: "Onisciência providencial — Berkhof trata conhecimento divino como perfeição incomunicável em sentido pleno."
        },
        {
          id: 5,
          pergunta: "Em Êxodo 34:6-7, que combinação o próprio texto apresenta, lado a lado, sobre Deus?",
          referencias: ["Êxodo 34:6-7"],
          alternativas: [
            { id: "a", texto: "Compassivo e misericordioso e retidão, junto do juízo que não declara inocente o culpado", correta: true },
            { id: "b", texto: "Somente ira, sem qualquer graça", correta: false },
            { id: "c", texto: "Somente perdão, sem consequência moral para culpa", correta: false },
            { id: "d", texto: "Indiferença igual ao bem e ao mal", correta: false }
          ],
          explicacao: "Graça e juízo no mesmo auto-revelar — equilíbrio clássico na ética teológica."
        },
        {
          id: 6,
          pergunta: "Segundo 1 Coríntios 10:31, para que fim devemos fazer tudo, até comer e beber?",
          referencias: ["1 Coríntios 10:31"],
          alternativas: [
            { id: "a", texto: "Para agradar principalmente a nós mesmos", correta: false },
            { id: "b", texto: "Para a glória de Deus", correta: true },
            { id: "c", texto: "Para aparecer bem na igreja", correta: false },
            { id: "d", texto: "Para provar moral superior aos outros", correta: false }
          ],
          explicacao: "A teleologia cristã — sumo bem é a glória de Deus — fecha o sistema doutrinário sobre Sua majestade."
        },
        {
          id: 7,
          pergunta: "Segundo Malaquias 3:6, por que os filhos de Jacó não foram consumidos?",
          referencias: ["Malaquias 3:6"],
          alternativas: [
            { id: "a", texto: "Porque o Senhor não muda — por isso os filhos de Jacó não são consumidos", correta: true },
            { id: "b", texto: "Porque Jacó merecia por natureza", correta: false },
            { id: "c", texto: "Porque Deus muda de plano conforme o humor do povo", correta: false },
            { id: "d", texto: "Porque o texto nega imutabilidade divina", correta: false }
          ],
          explicacao: "O texto liga diretamente imutabilidade (\"Eu, o Senhor, não mudo\") à não consumição do povo na linha da aliança — fundamento clássico para falar da fidelidade divina em Berkhof."
        },
        {
          id: 8,
          pergunta: "Segundo Atos 17:24-25, que contraste o apóstolo faz sobre o Deus que criou o mundo?",
          referencias: ["Atos 17:24-25"],
          alternativas: [
            { id: "a", texto: "Que não habita em templos feitos por mãos humanas nem é servido como se precisasse de algo, por ser Ele quem a tudo dá vida", correta: true },
            { id: "b", texto: "Que depende dos sacerdotes para subsistir", correta: false },
            { id: "c", texto: "Que é igual aos ídolos de pedra que precisam ser carregados", correta: false },
            { id: "d", texto: "Que habita só no templo de Jerusalém", correta: false }
          ],
          explicacao: "Expressa autossuficiência e transcendência — Deus não é uma parte do cosmos que precisa de culto para \"sobreviver\"."
        },
        {
          id: 9,
          pergunta: "Segundo Tiago 1:17, como são os dons supremos procedentes do Pai?",
          referencias: ["Tiago 1:17"],
          alternativas: [
            { id: "a", texto: "Bons e perfeitos; com Ele não há mudança nem sombra de variação", correta: true },
            { id: "b", texto: "Instáveis, ora bons ora maus", correta: false },
            { id: "c", texto: "Fonte de trevas e luz alternadas", correta: false },
            { id: "d", texto: "Sem relação com imutabilidade divina", correta: false }
          ],
          explicacao: "Reflexão clássica sobre imutabilidade moral e fontal da graça — eco do tratamento berkhofiano dos atributos."
        },
        {
          id: 10,
          pergunta: "Segundo Salmos 90:2, como o salmista qualifica a eternidade de Deus em relação às gerações?",
          referencias: ["Salmos 90:2"],
          alternativas: [
            { id: "a", texto: "\"Antes de nascerem os montes\" e \"desde a eternidade até a eternidade\", tu és Deus", correta: true },
            { id: "b", texto: "Deus começou no tempo junto com os montes", correta: false },
            { id: "c", texto: "As gerações são eternas como Deus", correta: false },
            { id: "d", texto: "Deus existe só enquanto durar o mundo visível", correta: false }
          ],
          explicacao: "Eternidade divina — antes da criação temporal; base para soberania histórica."
        }
      ],
      meditacao: [
        {
          dia: 1,
          titulo: "Revelação: quem é este Deus?",
          leitura: "João 1:18",
          texto: "Sem Cristo, falta rosto para o Pai; adoração sem revelação vira projeção.",
          reflexao: "Sua imagem de Deus está ligada ao Cristo das Escrituras ou a um ideal seu?",
          oracao: "Pai, revela-te ao meu coração pelo Filho."
        },
        {
          dia: 2,
          titulo: "Um só Senhor",
          leitura: "Deuteronômio 6:4",
          texto: "O Shema não é ornamento — é compromisso com um Deus exclusivo.",
          reflexao: "O que na sua vida compete com o primeiro lugar de Deus?",
          oracao: "Um só Deus em meu coração e na minha casa."
        },
        {
          dia: 3,
          titulo: "Imutável",
          leitura: "Malaquias 3:6",
          texto: "Promessas firmes porque Aquele que jurou não oscila como nós.",
          reflexao: "Você ancora esperança na mudança de humor humano ou no caráter imutável de Deus?",
          oracao: "Sê minha rocha — eu mudo; tu não."
        },
        {
          dia: 4,
          titulo: "Santo, santo, santo",
          leitura: "Isaías 6:3",
          texto: "Toda a terra cheia da glória dEle — não de uma \"energia\" anônima.",
          reflexao: "A santidade de Deus pesa sobre alguma área que você tem tratado como pequena?",
          oracao: "Purifica-me para estar diante da tua glória."
        },
        {
          dia: 5,
          titulo: "Onisciente",
          leitura: "Salmos 139:1-6",
          texto: "Nada escapa — nem para condenação vã nem para cuidado sem falha.",
          reflexao: "Isso assusta ou consola? Por quê?",
          oracao: "Conhece-me e não me abandones onde não vejo."
        },
        {
          dia: 6,
          titulo: "Misericórdia e juízo",
          leitura: "Êxodo 34:6-7",
          texto: "O mesmo Deus que guarda bondade ira visitar culpa — sem contradição.",
          reflexao: "Você aceita os dois aspectos ou silencia um deles?",
          oracao: "Ensina-me a temer-te e a confiar na tua misericórdia em Cristo."
        },
        {
          dia: 7,
          titulo: "Para a glória dEle",
          leitura: "1 Coríntios 10:31",
          texto: "Comer e beber como discipulado — teleologia que transforma rotina.",
          reflexao: "Um hábito comum hoje pode ser oferecido conscientemente ao Senhor?",
          oracao: "Que até o simples honre o teu nome."
        }
      ]
    },
    {
      id: 2,
      titulo: "O homem: honra originária e tragédia da queda",
      oculto: true,
      introducao: {
        texto: "A doutrina do homem precisa ser lida à luz da doutrina de Deus. Fomos criados à imagem do Criador, com dignidade real e vocação santa (Gênesis 1:26-27). Porém, pela queda, perdemos a retidão original e entramos em estado de culpa e corrupção (Gênesis 3).\n\nA Escritura não descreve o ser humano como moralmente neutro, mas como espiritualmente morto, inclinado ao mal e incapaz de retornar a Deus por si mesmo (Efésios 2:1-3; Romanos 8:7; 1 Coríntios 2:14). A famosa sequência de Romanos 3:10-12 é radical: \"Não há justo, nem um sequer... não há quem busque a Deus\". Isso não significa que todos são tão maus quanto poderiam ser em intensidade, mas que todas as dimensões da pessoa foram alcançadas pelo pecado.\n\nDefinições centrais para este estudo:\n\n- Imagem de Deus: dignidade e vocação recebidas na criação, ainda presentes após a queda, embora profundamente deformadas.\n- Queda: entrada histórica do pecado pela desobediência de Adão, com efeitos sobre toda a raça.\n- Depravação total: corrupção que atinge intelecto, afeições e vontade, sem extinguir totalmente a humanidade criada.\n- Culpa: responsabilidade jurídica diante de Deus santo.\n\nA Confissão de Fé de Westminster (cap. VI) resume: por esse pecado, nossos primeiros pais caíram da comunhão com Deus e nós, neles, ficamos mortos em pecado e corrompidos em todas as faculdades da alma e do corpo. Em linguagem pastoral: o problema humano não é só falta de instrução; é alienação de Deus.\n\nAplicações diretas:\n\n- Pare de medir sua condição comparando-se com quem parece pior; a medida é a santidade de Deus.\n- Não confie no coração como autoridade final; submeta-o à Palavra.\n- Reconheça a dignidade do próximo como portador da imagem divina, sem negar que todos necessitam de novo nascimento e graça.\n\nSem queda real, a cruz vira exagero. Com queda real, Cristo aparece como necessidade absoluta."
      },
      questoes: [
        {
          id: 1,
          pergunta: "Segundo Gênesis 1:27, como Deus criou o homem?",
          referencias: ["Gênesis 1:27"],
          alternativas: [
            { id: "a", texto: "Sem diferença real em relação aos animais", correta: false },
            { id: "b", texto: "À sua imagem; macho e fêmea os criou", correta: true },
            { id: "c", texto: "Só como corpo, sem falar em imagem de Deus", correta: false },
            { id: "d", texto: "Só para competir entre si", correta: false }
          ],
          explicacao: "O texto declara criados \"à sua imagem\" como \"macho e fêmea\"."
        },
        {
          id: 2,
          pergunta: "Segundo Romanos 3:10-12 (citando a Escritura), o que se declara sobre justiça e entendimento?",
          referencias: ["Romanos 3:10-12"],
          alternativas: [
            { id: "a", texto: "Não há justo, nem um sequer; não há quem entenda; não há quem busque a Deus", correta: true },
            { id: "b", texto: "A maioria nasce justa por natureza", correta: false },
            { id: "c", texto: "Só certos grupos estão perdidos", correta: false },
            { id: "d", texto: "Com boa vontade, todos acham a Deus sozinhos", correta: false }
          ],
          explicacao: "A resposta segue a citação paulina: ausência de justo, de quem entenda e de quem busque a Deus."
        },
        {
          id: 3,
          pergunta: "O que Jeremias 17:9 afirma sobre o coração humano?",
          referencias: ["Jeremias 17:9"],
          alternativas: [
            { id: "a", texto: "Que é enganoso mais do que todas as coisas e incuravelmente perverso", correta: true },
            { id: "b", texto: "Que é fiável para dirigir a vida sem a Palavra", correta: false },
            { id: "c", texto: "Que já nasce igual ao coração de Deus", correta: false },
            { id: "d", texto: "Que dispensa arrependimento", correta: false }
          ],
          explicacao: "O texto fala em coração enganoso \"mais do que todas as coisas\" e \"perversíssimo\"; a alternativa correta preserva esse sentido."
        },
        {
          id: 4,
          pergunta: "Segundo Tiago 3:9, que contraste a mesma língua faz?",
          referencias: ["Tiago 3:9"],
          alternativas: [
            { id: "a", texto: "Bendizemos ao Senhor e amaldiçoamos os homens feitos à semelhança de Deus", correta: true },
            { id: "b", texto: "Cantar salmos ou ficar calado sobre o evangelho", correta: false },
            { id: "c", texto: "Orar em secreto versus pregar em público", correta: false },
            { id: "d", texto: "Jejuar versus comer", correta: false }
          ],
          explicacao: "O texto opõe bendizer o Senhor a amaldiçoar homens feitos à semelhança divina."
        },
        {
          id: 5,
          pergunta: "Como Efésios 2:1-3 retrata como estavam os que agora são salvos?",
          referencias: ["Efésios 2:1-3"],
          alternativas: [
            { id: "a", texto: "Mortos em ofensas e pecados; entregues à carne e ao pensamento déspotas; por natureza, filhos da ira", correta: true },
            { id: "b", texto: "Neutros: nem mortos nem vivos espiritualmente", correta: false },
            { id: "c", texto: "Já justos por esforço, só aguardando confirmação", correta: false },
            { id: "d", texto: "Obedientes à lei sem necessidade de Cristo", correta: false }
          ],
          explicacao: "Paulo fala em \"mortos em ofensas e pecados\", em entrega aos desejos da carne e em serem \"por natureza, filhos da ira\", conforme o trecho citado."
        },
        {
          id: 6,
          pergunta: "Segundo Provérbios 28:13, quem encobre transgressões e quem confessa e deixa?",
          referencias: ["Provérbios 28:13"],
          alternativas: [
            { id: "a", texto: "O que encobre as suas transgressões jamais prosperará; o que as confessa e deixa alcançará misericórdia", correta: true },
            { id: "b", texto: "Quem esconde recebe honra; quem confessa é humilhado sem recurso", correta: false },
            { id: "c", texto: "Dá no mesmo confessar ou esconder diante de Deus", correta: false },
            { id: "d", texto: "Deus fecha a porta para todo mundo que confessa", correta: false }
          ],
          explicacao: "O texto contrasta quem encobre (não prospera) com quem confessa e deixa (alcança misericórdia), na redação do versículo."
        }
      ],
      meditacao: [
        {
          dia: 1,
          titulo: "Imagem sem soberba",
          leitura: "Gênesis 1:27",
          texto: "Ser criado à imagem de Deus honra dependência dele — não faz de nós centrão do mundo.",
          reflexao: "Você tem usado \"dignidade\" como desculpa para soberba ou como motivação para servir?",
          oracao: "Senhor, ensina-me a amar o próximo como quem porta tua marca de criação."
        },
        {
          dia: 2,
          titulo: "Ninguém faz o bem",
          leitura: "Romanos 3:12",
          texto: "O texto trata \"todos\" — some mito da pessoa \"boa demais pra precisar de graça\".",
          reflexao: "Com quem você se compara para se sentir \"melhor\" espiritualmente?",
          oracao: "Tira comparativos que escondem minha falta real de mérito."
        },
        {
          dia: 3,
          titulo: "Coração enganoso",
          leitura: "Jeremias 17:9",
          texto: "Intuído sem a Palavra não basta como bússola — precisamos ouvir Cristo nos profetas e apostolos.",
          reflexao: "Qual decisão recente nasceu mais de apetite próprio que de mandamento de Cristo?",
          oracao: "Ilumina meus caminhos; não deixes meu pensamento só se enganar."
        },
        {
          dia: 4,
          titulo: "De mortos a vida",
          leitura: "Efésios 2:4-5",
          texto: "\"Mas Deus\", rico em misericórdia, vivifica — a solução não nasce primeiro de dentro do \"túmulo\" espiritual.",
          reflexao: "Agradeça hoje a iniciativa de Deus, não apenas esforços seus.",
          oracao: "Pai, lembra-me de que estava morto e que me vivificaste juntamente com Cristo."
        },
        {
          dia: 5,
          titulo: "Mesma lingua, dois destinos",
          leitura: "Tiago 3:9-10",
          texto: "Louvar ao Senhor pede vigilância com palavras que ferem iguais feitos à semelhança de Deus.",
          reflexao: "Com quem você precisa pedir perdão pelo jeito de falar?",
          oracao: "Domina minha língua para edificar com honra a tua imagem no outro."
        },
        {
          dia: 6,
          titulo: "Confessar com humildade",
          leitura: "Tiago 5:16",
          texto: "Confissão mútua (com juízo e pastoreio sábio) acompanha cura e oração — não é teatro, é honestidade diante de Deus no corpo.",
          reflexao: "Há pecado nomeado só na secretária do coração ou também com alguém confiável na igreja?",
          oracao: "Dá coragem para confessar e receber misericórdia."
        },
        {
          dia: 7,
          titulo: "Nova criação",
          leitura: "2 Coríntios 5:17",
          texto: "O fim prometido não é só admitir pecado, mas em Cristo ser \"nova criatura\" com frutos novos.",
          reflexao: "Que hábito o Espírito convence você a largar com fé ativa?",
          oracao: "Jesus, governa cada área onde a velha criatura insiste."
        }
      ]
    },
    {
      id: 3,
      titulo: "O abismo: culpa, justiça e por que mediadores humanos não bastam",
      oculto: true,
      introducao: {
        texto: "Entre a santidade infinita de Deus e o pecador há um problema que religião superficial não resolve — \"As vossas iniqüidades fazem separação entre vós e o vosso Deus\" (Isaías 59:2). A ira \"se revela do céu contra toda impiedade e injustiça dos homens que detêm injustamente a verdade\" (Romanos 1:18). Tentativas típicas de \"resolver\" como se Deus não fosse ofendido — autoperdão fingido, fichas espirituais com boas ações, negar falta própria, ou inventar outro intermediário — batem contra o texto. \"Porquanto há um só Deus e um só Mediador entre Deus e os homens, Cristo Jesus, homem\" (1 Timóteo 2:5). Pedro, sobre Jesus: \"Salvação nenhuma há em outro algum\" — \"nem outro há, debaixo do céu, dado entre os homens, pelo qual devamos ser salvos\" (Atos 4:12). Hebreus adverte com seriedade: \"Horrível coisa é cair nas mãos do Deus vivo\" (10:31). Davi volta o foco onde importa primeiro: \"Pequei contra ti, contra ti somente, e fiz o que é mau perante os teus olhos\" (Salmos 51:4).\n\nÉ por isso que os próximos passos já apontam para Cristo como único que cumpriu a lei, morreu em nosso lugar e vive como advogado e Rei. Este estudo fecha o espaço para qualquer Salvador \"caseiro\" antes de saborearmos a obra terminada na lição seguinte."
      },
      questoes: [
        {
          id: 1,
          pergunta: "Segundo Isaías 59:2, o que nossas iniqüidades fazem entre nós e Deus?",
          referencias: ["Isaías 59:2"],
          alternativas: [
            { id: "a", texto: "Fazem separação — \"as vossas iniqüidades fazem separação entre vós e o vosso Deus\"", correta: true },
            { id: "b", texto: "Aproximam mais intimamente só com sinceridade humana", correta: false },
            { id: "c", texto: "São irrelevantes se a intenção for boa", correta: false },
            { id: "d", texto: "Só afetam pessoas, não a relação vertical com Deus", correta: false }
          ],
          explicacao: "É explícito no texto: iniqüidades fazem separação entre o povo e Deus."
        },
        {
          id: 2,
          pergunta: "Contra quê Romanos 1:18 diz que se revela a ira desde o céu?",
          referencias: ["Romanos 1:18"],
          alternativas: [
            { id: "a", texto: "Contra \"toda impiedade e injustiça dos homens\", que prendem \"injustamente a verdade\"", correta: true },
            { id: "b", texto: "Só contra quem nunca ouviu o evangelho pregado", correta: false },
            { id: "c", texto: "Só contra anjos malignos", correta: false },
            { id: "d", texto: "Contra estruturas materiais mais que contra pecado moral", correta: false }
          ],
          explicacao: "O texto menciona manifestação contra impiedade, injustiça e também o reter \"injustamente\" a verdade."
        },
        {
          id: 3,
          pergunta: "Segundo Hebreus 10:31, que coisa \"horrível\" se declara?",
          referencias: ["Hebreus 10:31"],
          alternativas: [
            { id: "a", texto: "Cair nas mãos do Deus vivo", correta: true },
            { id: "b", texto: "Passar fome no deserto sem guia humano", correta: false },
            { id: "c", texto: "Ser esquecido pelas amizades mundanas", correta: false },
            { id: "d", texto: "Somente perdas financeiras grandes", correta: false }
          ],
          explicacao: "A pergunta retórica do autor aponta para cair nas mãos do Deus vivo; o texto qualifica isso como \"horrível coisa\"."
        },
        {
          id: 4,
          pergunta: "Segundo 1 Timóteo 2:5, quantos mediadores há entre Deus e as pessoas, e quem é esse mediador?",
          referencias: ["1 Timóteo 2:5"],
          alternativas: [
            { id: "a", texto: "Um só Mediador entre Deus e os homens, Cristo Jesus, homem", correta: true },
            { id: "b", texto: "Vários, conforme cada cultura", correta: false },
            { id: "c", texto: "Nenhum — cada um sobe por méritos", correta: false },
            { id: "d", texto: "Os anjos, no mesmo papel que Cristo", correta: false }
          ],
          explicacao: "O texto diz \"um só Deus\" e \"um só Mediador\" — Cristo Jesus, homem."
        },
        {
          id: 5,
          pergunta: "Segundo Atos 4:12, existe salvação em outro qualquer?",
          referencias: ["Atos 4:12"],
          alternativas: [
            { id: "a", texto: "Não; \"salvação nenhuma há em outro algum\" nem outro nome dado \"pelo qual devamos ser salvos\"", correta: true },
            { id: "b", texto: "Sim, em qualquer nome sincero", correta: false },
            { id: "c", texto: "Sim, para quem for moral o bastante", correta: false },
            { id: "d", texto: "Não importa o nome; importa só sentimento", correta: false }
          ],
          explicacao: "Pedro nega salvação em outro e confessa exclusividade do nome de Jesus, como declara o texto em Atos 4:12."
        },
        {
          id: 6,
          pergunta: "Segundo Salmos 51:4, contra quem Davi reconhece ter pecado e que resultado isso dá à justiça de Deus?",
          referencias: ["Salmos 51:4"],
          alternativas: [
            { id: "a", texto: "Contra Deus, contra Deus somente, \"e fiz o que é mau perante os teus olhos\", para que sejas tido por justo no falar e puro no julgar", correta: true },
            { id: "b", texto: "Só contra outras pessoas ofendidas, sem envolver a Deus", correta: false },
            { id: "c", texto: "Contra si mesmo sem relação com o juízo divino", correta: false },
            { id: "d", texto: "Contra Israel inteiro de modo genérico", correta: false }
          ],
          explicacao: "O texto coloca o pecado primeiramente contra Deus (\"contra ti somente\") e liga isso à justiça e pureza de Deus no julgar."
        }
      ],
      meditacao: [
        {
          dia: 1,
          titulo: "Santidade que não finge",
          leitura: "Habacuque 1:13",
          texto: "Olhos \"puros demais\" para aprovar o mal — distância real entre luz divina e nossas escolhas.",
          reflexao: "Você trata pecado fixo como detalhe pequeno diante desse retrato de Deus?",
          oracao: "Santo Deus, não deixes meu coração dormir no conforto do pecado."
        },
        {
          dia: 2,
          titulo: "Muro de separação",
          leitura: "Isaías 59:2",
          texto: "Iniqüidades não são só \"problema emocional\" — produzem separação real com o Deus santo.",
          reflexao: "Você busca só alívio para sensações ou reconciliação com Deus em Cristo?",
          oracao: "Conduz-me a reconciliação verdadeira, não a maquiagem espiritual."
        },
        {
          dia: 3,
          titulo: "Ira revelada",
          leitura: "Romanos 1:18",
          texto: "Impiedade (vertical) e injustiça (horizontal) estão no alvo da ira revelada — fé viva reage às duas.",
          reflexao: "Onde você relativiza padrão moral de Deus por conveniência?",
          oracao: "Desperta arrependimento e retidão onde negligenciei o teu nome."
        },
        {
          dia: 4,
          titulo: "Sombras que apontam o Cordeiro",
          leitura: "Hebreus 10:1-4",
          texto: "Sacrifícios repetidos mostravam limites — apontavam para um sacrifício único e suficiente.",
          reflexao: "Você ainda tenta \"pagar\" na carne o que só Cristo pagou de uma vez?",
          oracao: "Livra-me de confiar em merecimento ritual."
        },
        {
          dia: 5,
          titulo: "Um mediador, porta aberta",
          leitura: "João 14:6",
          texto: "Jesus como caminho exclusivo não é mesquinharia — é convite claro: venham por ele, pecadores de toda nação.",
          reflexao: "Como falar disso com firmeza e mansidão para quem você ama?",
          oracao: "Acrescenta mansidão à verdade na minha boca."
        },
        {
          dia: 6,
          titulo: "Nome em que há salvação",
          leitura: "Atos 4:12",
          texto: "Não existe plano B revelado para salvar — o nome de Jesus é o Pai dá ao mundo.",
          reflexao: "Há esperança secreta de que Deus salve \"de outro jeito\" quem recusa o evangelho?",
          oracao: "Usa-me para anunciar esse nome com amor antes que acabe o tempo da pregação."
        },
        {
          dia: 7,
          titulo: "Contrito e encorajado",
          leitura: "Isaías 57:15",
          texto: "O Altíssimo habita com o contrito — não abaixa santidade; levanta quem se humilha.",
          reflexao: "Hoje confesse pecado começando por Deus ofendido, como Davi.",
          oracao: "Revive coração contrito e abatido."
        }
      ]
    },
    {
      id: 4,
      titulo: "Jesus Cristo, único Mediador: obra e vida na presença de Deus",
      oculto: true,
      introducao: {
        texto: "Cristo é verdadeiro Deus e verdadeiro homem em uma só pessoa — duas naturezas sem se confundir (CFW VIII.2; leia o capítulo VIII todo). Ele exerce ofícios de Profeta, Sacerdote e Rei: revela o Pai, oferece sacrifício que realmente satisfaz a justiça divina, e governa para salvar até o fim. \"Sendo justificado gratuitamente pela sua graça, mediante a redenção que há em Cristo Jesus, a qual Deus propôs para propiciação mediante a fé\" (Romanos 3:24-25; continue lendo até o v. 26 sobre demonstrar a justiça de Deus). João diz de Jesus: \"Eis o Cordeiro de Deus, que tira o pecado do mundo!\" (João 1:29). Romanos diz que \"os que recebem a abundância da graça e o dom da justiça reinarão em vida por meio de um só, a saber, Jesus Cristo\" (5:17).\n\nTrês coisas práticas sadias:\n\n- Ler Escrituras como Palavra do Profeta supremo (\"nestes últimos dias, nos falou pelo Filho\" — Hebreus 1:2; leia 1:1-2 inteiro).\n- Orar e viver culto lembrando que não há outro mediador salvífico — pastores e liderança ajudam, mas não substituem Cristo (1 Timóteo 2:5).\n- Obedecer crescentemente porque o Rei ressuscitado reina — e esperar seu retorno com alegria limpa.\n\n\"Mas vós sois dele, em Cristo Jesus, o qual se nos tornou, da parte de Deus, sabedoria, e justiça, e santificação, e redenção\" (1 Coríntios 1:30), \"para que, como está escrito: Aquele que se gloria, glorie-se no Senhor\" (1:31). Teologia que não cai nos joelhos vira arquivo morto — deixemos o Espírito unir doutrina e adoração."
      },
      questoes: [
        {
          id: 1,
          pergunta: "Segundo 1 Timóteo 2:5, quem é o único Mediador entre Deus e os homens?",
          referencias: ["1 Timóteo 2:5"],
          alternativas: [
            { id: "a", texto: "Cristo Jesus, homem", correta: true },
            { id: "b", texto: "Qualquer crente piedoso extraordinário", correta: false },
            { id: "c", texto: "Um anjo destacado pelo céu", correta: false },
            { id: "d", texto: "O arrependimento sozinho, sem Cristo como pessoa mediadora", correta: false }
          ],
          explicacao: "O texto identifica Cristo Jesus, homem, como esse Mediador único."
        },
        {
          id: 2,
          pergunta: "Segundo Hebreus 1:1-2, de que modo falou Deus nos últimos dias?",
          referencias: ["Hebreus 1:1-2"],
          alternativas: [
            { id: "a", texto: "Apenas por profetas soltos sem culminação definida", correta: false },
            { id: "b", texto: "Nos últimos dias, por um Filho, herdeiro de todas as coisas", correta: true },
            { id: "c", texto: "Só em visões novas além das Escrituras", correta: false },
            { id: "d", texto: "Por conselhos humanos institucionais que substituem o texto sagrado", correta: false }
          ],
          explicacao: "Hebreus 1:2 diz que nestes últimos dias Deus nos falou pelo Filho herdeiro e pelo qual também fez o universo; leia 1:1-2 inteiro."
        },
        {
          id: 3,
          pergunta: "Para que Hebreus 9:26 diz que Cristo se manifestou \"uma vez\", \"à conclusão dos séculos\"?",
          referencias: ["Hebreus 9:26"],
          alternativas: [
            { id: "a", texto: "Para aniquilar o pecado pelo sacrifício de si mesmo", correta: true },
            { id: "b", texto: "Para estabelecer império político terreno imediato", correta: false },
            { id: "c", texto: "Para repetir eternamente sacrifícios como antes", correta: false },
            { id: "d", texto: "Para dispensar uso normativo da Escritura", correta: false }
          ],
          explicacao: "A ligação do autor é manifestação única de Cristo com desfazer pecado mediante sacrifício próprio."
        },
        {
          id: 4,
          pergunta: "Segundo Filipenses 2:10-11, qual confissão toda língua dará?",
          referencias: ["Filipenses 2:10-11"],
          alternativas: [
            { id: "a", texto: "Que Jesus Cristo é Senhor, para glória de Deus Pai", correta: true },
            { id: "b", texto: "Que todas as religiões são caminhos iguais ao fim", correta: false },
            { id: "c", texto: "Que não haverá juízo futuro algum", correta: false },
            { id: "d", texto: "Que cada um escolhe senhor sem consequência moral", correta: false }
          ],
          explicacao: "A ARa anuncia confissão universal de Jesus Cristo como Senhor para glória do Pai."
        },
        {
          id: 5,
          pergunta: "Segundo Romanos 5:17, quem reinará em vida e em relação a quem?",
          referencias: ["Romanos 5:17"],
          alternativas: [
            { id: "a", texto: "Os que recebem \"a abundância da graça e o dom da justiça\" reinarão em vida \"por meio de um só, a saber, Jesus Cristo\"", correta: true },
            { id: "b", texto: "Todos reinam sem relação com graça", correta: false },
            { id: "c", texto: "Só quem nunca pecou reinará", correta: false },
            { id: "d", texto: "Reinam pela própria observância exterior sem Cristo como cabeça", correta: false }
          ],
          explicacao: "O texto associa reinar \"em vida\" à graça abundante e ao dom da justiça por meio de um só mediador soberano — Jesus Cristo (comparar também o contexto sobre \"um só\" no capítulo)."
        },
        {
          id: 6,
          pergunta: "Segundo 1 Coríntios 1:30, onde estão sabedoria, justiça, santificação e redenção credora de glória?",
          referencias: ["1 Coríntios 1:30"],
          alternativas: [
            { id: "a", texto: "Em Cristo Jesus, \"o qual se nos tornou, da parte de Deus\", sabedoria, justiça, santificação e redenção", correta: true },
            { id: "b", texto: "No próprio ego renovado cortado das Escrituras", correta: false },
            { id: "c", texto: "Só em tradições humanas não testadas pela Palavra", correta: false },
            { id: "d", texto: "Em filosofias de debate público alienadas do evangelho", correta: false }
          ],
          explicacao: "O texto diz que sois de Cristo, \"em Cristo Jesus\", o qual se nos tornou, da parte de Deus, sabedoria, justiça, santificação e redenção."
        }
      ],
      meditacao: [
        {
          dia: 1,
          titulo: "Palavra encarnada",
          leitura: "João 1:14",
          texto: "O Verbo \"habitou\" entre nós como carne sem perder glória revelada aos discípulos.",
          reflexao: "Que áreas resistem porque prefiro outra voz senão Cristo?",
          oracao: "Sujeito-me inteiramente ao que revelas como Verbo vivo."
        },
        {
          dia: 2,
          titulo: "Advogado fiel",
          leitura: "1 João 1:9; 2:1-2",
          texto: "Temos Advogado com o Pai e propiciação real — perdão objetivo aliado ao convite ao nomear pecado.",
          reflexao: "Você nomeou falhas específicas diante Dele esta semana?",
          oracao: "Obrigado, Jesus, por seres Advogado mesmo quando vacilo."
        },
        {
          dia: 3,
          titulo: "Sacrifício de uma só vez",
          leitura: "Hebreus 10:10-14",
          texto: "Assentado após obra consumada — acaba o ciclo de culpa cobrada sem descansar no Filho.",
          reflexao: "Você ainda \"cobra\" algo de si que Cristo já cumpriu?",
          oracao: "Confirma em mim descanso filial na obra acabada."
        },
        {
          dia: 4,
          titulo: "Cordeiro de Deus",
          leitura: "João 1:29",
          texto: "Remove pecado mundano — fé pequena ainda assim se prende só nesse único trabalhador suficiente.",
          reflexao: "Leva hoje algo concreto de novo aos pés da cruz em vez de carregar sozinho.",
          oracao: "Tira das minhas mãos cargas que só tu podes levar."
        },
        {
          dia: 5,
          titulo: "Descanso do Rei",
          leitura: "Mateus 11:28-30",
          texto: "Jugo manso substitui fadiga de autopromoção religiosa fingindo \"dar conta\" ante Deus soberano.",
          reflexao: "Você anda cansado por tentar ser \"suficiente\" sem Cristo suficiente?",
          oracao: "Recebo teu jugo manso onde antes carregava exigências impossíveis."
        },
        {
          dia: 6,
          titulo: "Sabedoria dada",
          leitura: "1 Coríntios 1:30",
          texto: "Não tiramos santidade inicial como mérito próprio — recebemos nEle; santificação crescente igualmente ponta pra Cristo.",
          reflexao: "Antes de medir seu \"desempenho\", adore graça gratuita primeiro.",
          oracao: "Cada passo santificador celebre sua suficiência, não o meu orgulho."
        },
        {
          dia: 7,
          titulo: "Gloriar no Senhor",
          leitura: "1 Coríntios 1:31",
          texto: "\"Aquele que se gloria\" gloría-se unicamente onde Deus manda — no Senhor resgatador.",
          reflexao: "Liste três motivos das Escrituras para louvor centrado só em Cristo hoje.",
          oracao: "Como ordena a Palavra, que eu me glorie somente em ti."
        }
      ]
    }
  ]
}
]

/**
 * Retorna a lista de sub-estudos visíveis (filtra os marcados com `oculto: true`).
 *
 * Use sempre que estiver renderizando a lista de estudos no menu/cards do
 * discipulado: o conteúdo continua disponível por id (deep link / busca) mas
 * deixa de aparecer nas listas até a flag ser removida.
 */
export function obterEstudosVisiveis(tema) {
  if (!tema || !Array.isArray(tema.estudos)) return []
  return tema.estudos.filter((e) => e && !e.oculto)
}