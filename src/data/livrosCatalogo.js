/**
 * Catálogo editorial da Biblioteca.
 *
 * Quando um título for publicado, cadastre a página em `amazonUrl`. Quando
 * o conteúdo estiver disponível nos aplicativos, informe `androidUrl` e/ou
 * `appleUrl`. Cada opção só aparece quando o destino correspondente existe.
 */
export const livrosCatalogo = Object.freeze([
  {
    id: 'reflexoes-experiencia-crista',
    titulo: 'Reflexões sobre a Experiência Cristã',
    autor: 'Archibald Alexander',
    capa: 'livros/reflexoes-experiencia-crista.webp',
    amazonUrl: '',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "Como reconhecer a **ação da graça** em meio às emoções, dúvidas e mudanças da vida cristã? Archibald Alexander examina a **experiência religiosa à luz das Escrituras**, acompanhando o despertar da consciência, a conversão e o crescimento na fé. Trata das diferenças entre as experiências dos convertidos, da luta contra o pecado, dos períodos de declínio espiritual e dos sinais de amadurecimento.\n\nO percurso inclui **impressões religiosas na infância, evidências do novo nascimento, influência do temperamento, melancolia, sonhos e visões**, além do valor e dos limites dos relatos de conversão. Alexander discute pensamentos perturbadores, santificação imperfeita, crescimento na graça e restauração após o afastamento espiritual. Na parte dedicada ao fim da vida, considera a experiência de cristãos como Andrew Rivet, Thomas Halyburton, John Janeway, Edward Payson, Samuel Finley, Richard Baxter e Thomas Scott. Esses relatos ajudam a perceber a variedade das experiências e a necessidade de julgá-las pela Palavra, sem transformar a história de outra pessoa em regra obrigatória para todos.\n\nCom *discernimento pastoral*, o autor alerta contra a confiança em impressões passageiras e contra a exigência de que todos percorram o mesmo caminho emocional. Ao abordar também as provações e a preparação para a morte, conduz o leitor a examinar o coração e a buscar segurança na verdade do evangelho. Uma leitura para quem deseja compreender melhor a própria caminhada e acompanhar outras pessoas com sabedoria.",
  },
  {
    id: 'penas-para-flechas',
    titulo: 'Penas para Flechas',
    autor: 'C. H. Spurgeon',
    capa: 'livros/penas-para-flechas.webp',
    amazonUrl: '',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "Spurgeon reúne **ilustrações, comparações e observações** destinadas a tornar o ensino cristão mais claro, concreto e memorável. Cenas da natureza, situações do cotidiano e episódios variados se transformam em imagens que ajudam a comunicar verdades sobre o pecado, a graça, a fé, a oração e a vida com Deus.\n\nAs peças abordam **fé e incredulidade, arrependimento, orgulho, hipocrisia, oração, sofrimento, perseverança e serviço cristão**. Spurgeon aproveita imagens do trabalho, das viagens e da natureza para expor atitudes humanas e tornar visíveis questões espirituais. O leitor encontra comparações e episódios curtos, em vez de uma argumentação contínua organizada como tratado. É possível percorrer a coletânea aos poucos ou buscar imagens para um assunto de ensino. O prefácio esclarece sua intenção: oferecer auxílio à comunicação da verdade. Assim, a leitura também mostra como selecionar uma comparação pertinente e subordiná-la ao sentido da mensagem que se deseja transmitir.\n\nO propósito dessas pequenas peças é **servir à mensagem do evangelho**: assim como as penas dão direção à flecha, uma boa ilustração ajuda a verdade a alcançar a compreensão e a consciência do ouvinte. A obra oferece recursos para pastores, professores e líderes de estudo, além de reflexões breves para a leitura pessoal. Seu valor está tanto nos exemplos reunidos quanto no estímulo a observar a vida com atenção e a *ensinar com simplicidade e vigor*.",
  },
  {
    id: 'luz-dos-tempos-antigos',
    titulo: 'Luz dos Tempos Antigos',
    autor: 'J. C. Ryle',
    capa: 'livros/luz-dos-tempos-antigos.webp',
    amazonUrl: 'https://www.amazon.com/dp/B0HKVGX92G',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "Em **Luz dos Tempos Antigos**, J. C. Ryle reúne história e biografia para explicar as convicções, os conflitos e o legado do protestantismo inglês. O livro percorre a preparação da Reforma, as perseguições do século XVI e as disputas religiosas do século XVII, relacionando acontecimentos públicos à fé e à atuação de pessoas concretas.\n\n**Os onze homens retratados** são John Wycliffe; os seis mártires John Rogers, John Hooper, Rowland Taylor, Hugh Latimer, John Bradford e Nicholas Ridley; os puritanos Samuel Ward, Richard Baxter e William Gurnall; e o arcebispo William Laud. Ryle apresenta exemplos que admira e também figuras cujas ideias e ações critica, especialmente Laud, sempre a partir de sua perspectiva protestante e anglicana.\n\nOs capítulos históricos discutem **por que os reformadores foram queimados**, a perseguição sob Maria I, a política religiosa de Laud e o confronto de Jaime II com os sete bispos. Nesse último episódio, aparecem William Sancroft e os bispos Lloyd, Turner, Lake, Ken, White e Jonathan Trelawney, que se opuseram à ordem do rei e foram levados a julgamento.\n\nAo narrar ministérios, prisões, martírios e controvérsias, Ryle examina a autoridade das Escrituras, a pregação do evangelho, a doutrina da ceia, a liberdade de consciência e os limites da interferência política na igreja. Sua intenção é mostrar como o esquecimento dessas lutas enfraquece o discernimento cristão. O leitor encontra uma introdução aos personagens e às questões que moldaram essa história, acompanhada de um chamado à *fidelidade doutrinária, à coragem e à perseverança*.",
  },
  {
    id: 'catecismo-de-genebra',
    titulo: 'Catecismo da Igreja de Genebra',
    autor: 'João Calvino',
    capa: 'livros/catecismo-de-genebra.webp',
    amazonUrl: 'https://www.amazon.com/dp/B0HDTLGQLR',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "Organizado como um diálogo de **perguntas e respostas** entre mestre e aluno, o Catecismo da Igreja de Genebra apresenta os fundamentos da fé cristã na perspectiva da Reforma. João Calvino parte do conhecimento de Deus e da finalidade da vida humana para explicar o que o cristão crê e como essa fé orienta sua adoração e sua conduta.\n\nO conteúdo se distribui em **fé, lei, oração, Palavra e sacramentos**. Na exposição do Credo, aparecem Deus Pai, a criação, a pessoa e a obra de Cristo, o Espírito Santo, a igreja, o perdão, a ressurreição e a vida eterna. Os mandamentos esclarecem os deveres para com Deus e o próximo; a oração do Senhor ensina o que pedir e com que confiança. A seção final considera a pregação, o batismo e a ceia, relacionando os sinais às promessas de Deus e à fé de quem os recebe. O diálogo permite acompanhar objeções, distinções e explicações progressivas, oferecendo uma visão articulada da doutrina reformada e de suas consequências para o culto e a vida diária.\n\nA exposição percorre o **Credo Apostólico, os Dez Mandamentos, a oração do Senhor** e os sacramentos do batismo e da ceia. Ao relacionar *doutrina e prática*, mostra a ligação entre confiança em Cristo, obediência, oração e participação na vida da igreja. Concebida para a instrução cristã, a obra também oferece um roteiro para estudo pessoal, ensino em família e formação de novos discípulos.",
  },
  {
    id: 'misterio-da-providencia',
    titulo: 'O Mistério da Providência',
    autor: 'John Flavel',
    capa: 'livros/misterio-da-providencia.webp',
    amazonUrl: 'https://www.amazon.com/dp/B0HDT3SK8F',
    androidUrl: '',
    appleUrl: '',
    destaque: true,
    descricao: "Como perceber o cuidado de Deus quando os acontecimentos parecem confusos ou contrários às nossas expectativas? John Flavel examina a **providência divina na história do cristão**, considerando o nascimento, a criação, a conversão, o trabalho, a vida familiar e as experiências de preservação e sofrimento. Sua reflexão convida a reconhecer o governo de Deus tanto nos grandes acontecimentos quanto nas circunstâncias comuns.\n\nA argumentação se organiza em **evidências da providência, meditação sobre os atos de Deus e aplicações práticas**. Primeiro, percorre nascimento e educação, conversão, ocupação profissional, assuntos familiares, livramentos e santificação. Depois, ensina a considerar essas experiências em conjunto, recordar benefícios e refletir sobre circunstâncias difíceis. Por fim, apresenta motivos para esse exercício e orientações para colocá-lo em prática. Flavel trata a memória das misericórdias como auxílio à confiança no presente: recordar o cuidado recebido pode fortalecer a oração, moderar a ansiedade e estimular a gratidão. O leitor encontra um caminho de reflexão sobre sua história, sem a pretensão de explicar todos os propósitos ocultos de Deus.\n\nAlém de expor o tema, Flavel ensina a meditar sobre os caminhos já percorridos e a recordar as misericórdias recebidas. O reconhecimento dos limites da compreensão humana acompanha o chamado à **gratidão, à paciência e à confiança**. Uma obra para quem deseja enfrentar incertezas com fé e aprender a considerar a própria história à luz da *sabedoria e da bondade divinas*.",
  },
  {
    id: 'quase-cristao-desmascarado',
    titulo: 'O Quase Cristão Desmascarado',
    autor: 'Matthew Mead',
    capa: 'livros/quase-cristao-desmascarado.webp',
    amazonUrl: '',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "É possível conhecer a doutrina, participar da vida religiosa e demonstrar zelo sem que o coração tenha sido renovado? A partir da expressão “quase cristão”, Matthew Mead examina até onde uma pessoa pode avançar na aparência de piedade e ainda permanecer distante da **realidade da conversão**. Seu argumento confronta a confiança na moralidade exterior, no conhecimento e nas práticas religiosas como provas suficientes de salvação.\n\nA investigação considera **conhecimento religioso, dons, profissão de fé, deveres, zelo, oração e participação na igreja**. Mead pergunta como essas manifestações podem existir sem uma entrega sincera a Cristo e examina até o sofrimento por motivos religiosos e a luta contra certos pecados. Em seguida, procura explicar por que alguém se detém numa condição apenas exterior e por que esse estado é perigoso. Suas distinções chamam atenção para as raízes da conduta: medo das consequências, desejo de reconhecimento e reforma parcial não equivalem à renovação do coração. O exame desemboca no apelo a buscar uma fé inteira e sincera, sem tomar os próprios desempenhos religiosos como fundamento de aceitação diante de Deus.\n\nCom perguntas de exame pessoal e aplicações diretas, o autor distingue manifestações externas de religião da fé acompanhada de **arrependimento e transformação interior**. O propósito é despertar quem se acomoda a uma profissão de fé sem vida e conduzir o leitor a buscar sinceridade diante de Deus. Uma leitura incisiva sobre *autoengano, novo nascimento* e a necessidade de uma relação verdadeira com Cristo.",
  },
  {
    id: 'retrato-do-homem-piedoso',
    titulo: 'O Retrato do Homem Piedoso',
    autor: 'Thomas Watson',
    capa: 'livros/retrato-do-homem-piedoso.webp',
    amazonUrl: 'https://www.amazon.com/dp/B0HL464H55',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "Thomas Watson descreve o caráter cristão por meio das **marcas que a graça produz no coração e na conduta**. Conhecimento de Deus, fé, amor, oração, arrependimento, humildade e sinceridade aparecem como aspectos de uma vida voltada para o Senhor. Com imagens expressivas e aplicações práticas, o autor mostra como a piedade alcança os desejos, as palavras, as escolhas e os relacionamentos.\n\nO núcleo apresenta **24 características do homem piedoso**. Entre elas estão estimar a Cristo, amar a Palavra, cultivar adoração reverente, servir a Deus sem buscar aprovação humana, entristecer-se pelo pecado e viver sob a ação do Espírito. Watson inclui disposição para as coisas celestiais, zelo, paciência, gratidão, amor aos irmãos, integridade nos relacionamentos e esforço para ajudar outros a crescer na piedade. Depois do retrato, oferece incentivos, meios práticos e razões para perseverar, seguidos de conselho e consolo aos crentes. A exposição se encerra com a união entre Cristo e seu povo. Esse desenvolvimento permite ler a obra tanto como exame da própria vida quanto como orientação para cultivar hábitos e afeições coerentes com a fé.\n\nAo mesmo tempo, distingue a devoção verdadeira de sua aparência e chama o leitor a examinar as motivações de sua obediência. O retrato apresentado serve ao **exame pessoal e ao crescimento espiritual**, destacando tanto a luta contra o pecado quanto a *dependência da graça*. A obra oferece orientação para quem deseja cultivar uma fé vivida no cotidiano e compreender melhor os frutos da renovação cristã.",
  },
  {
    id: 'consolo-para-os-abatidos',
    titulo: 'Consolo para os Abatidos',
    autor: 'William Bridge',
    capa: 'livros/consolo-para-os-abatidos.webp',
    amazonUrl: '',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "Partindo do Salmo 42:11, William Bridge se dirige ao cristão que enfrenta abatimento e dificuldade para descansar nas **promessas de Deus**. Examina situações que perturbam a paz espiritual: a lembrança de pecados, a percepção de uma fé fraca, as falhas no cumprimento dos deveres, as tentações, as aflições e a falta de segurança quanto à salvação.\n\nA obra reúne **treze sermões**, começando pela paz do cristão, pela possibilidade de sua interrupção e pelas razões para resistir ao desânimo. As aplicações alcançam pecados graves, fraqueza da graça, falhas nos deveres, ausência de segurança, tentações, sensação de abandono por Deus, aflições e sentimento de inutilidade no serviço. Bridge também considera o abatimento alimentado pela própria condição de estar abatido. O percurso culmina na fé em Jesus Cristo como resposta espiritual a essas inquietações. As distinções entre humilhação pelo pecado e desespero ajudam a compreender o cuidado pastoral do autor: ele chama ao arrependimento e, ao mesmo tempo, aponta razões para que o crente aflito não abandone a esperança.\n\nEm cada caso, procura conduzir a consciência aflita a considerar a **suficiência de Cristo e a fidelidade divina**. O autor reconhece que a paz do crente pode ser interrompida e oferece argumentos bíblicos para renovar sua esperança em meio às lutas. A obra reúne *exortação e consolo pastoral*, ajudando o leitor a enfrentar o desânimo espiritual com oração, fé e atenção às promessas do evangelho.",
  },
  {
    id: 'grande-interesse-do-cristao',
    titulo: 'O Grande Interesse do Cristão',
    autor: 'William Guthrie',
    capa: 'livros/grande-interesse-do-cristao.webp',
    amazonUrl: '',
    androidUrl: '',
    appleUrl: '',
    destaque: false,
    descricao: "**Como saber se pertencemos a Cristo** e como responder ao evangelho quando ainda não temos essa segurança? William Guthrie organiza sua exposição em torno dessas duas questões. Na primeira parte, examina os fundamentos bíblicos pelos quais alguém pode reconhecer sua participação na salvação, considerando a fé, a renovação interior e as diferenças entre a experiência do crente e a mera aparência religiosa.\n\nA estrutura tem **duas partes: reconhecer uma participação salvadora em Cristo e compreender como alcançá-la**. A primeira examina os diferentes modos pelos quais Deus atrai pecadores, o papel da convicção de pecado, a natureza da fé e as evidências da nova criatura. Distingue experiências preparatórias de uma conversão verdadeira e considera a atuação do Espírito. A segunda explica o acolhimento da salvação oferecida em Cristo e responde a dúvidas sobre pecados graves, falta de força para crer e ausência de frutos. Trata ainda do pecado contra o Espírito Santo e do compromisso expresso com Deus. Esse percurso reúne critérios de discernimento e instrução para quem hesita diante do evangelho, procurando desfazer tanto a falsa segurança quanto os obstáculos à confiança no Salvador.\n\nNa segunda, orienta quem busca a Cristo e responde a objeções relacionadas à indignidade pessoal, à gravidade do pecado e à dificuldade de crer. Sua preocupação é conduzir o leitor a uma **confiança efetiva no Salvador**, acompanhada de uma vida renovada. Uma obra de orientação pastoral para o exame pessoal, o esclarecimento de dúvidas e a busca de *segurança nas promessas de Deus*.",
  },
])

export function obterLivroCatalogo(id) {
  return livrosCatalogo.find((livro) => livro.id === id) || null
}

export function urlCapaLivro(caminho) {
  const valor = String(caminho || '').trim()
  if (/^(https?:|data:|blob:)/i.test(valor)) return valor
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/${valor.replace(/^\//, '')}`
}

