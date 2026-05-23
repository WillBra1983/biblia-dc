import { livros } from './biblia'

// Ordem cronológica dos livros
const ordemCronologica = [
  { livroId: 1, inicio: 1, fim: 50 }, // Gênesis
  { livroId: 18, inicio: 1, fim: 42 }, // Jó
  { livroId: 2, inicio: 1, fim: 40 }, // Êxodo
  { livroId: 3, inicio: 1, fim: 27 }, // Levítico
  { livroId: 4, inicio: 1, fim: 36 }, // Números
  { livroId: 5, inicio: 1, fim: 34 }, // Deuteronômio
  { livroId: 6, inicio: 1, fim: 24 }, // Josué
  { livroId: 7, inicio: 1, fim: 21 }, // Juízes
  { livroId: 8, inicio: 1, fim: 4 }, // Rute
  { livroId: 9, inicio: 1, fim: 31 }, // 1 Samuel
  { livroId: 10, inicio: 1, fim: 24 }, // 2 Samuel
  { livroId: 19, inicio: 1, fim: 150 }, // Salmos (distribuídos)
  { livroId: 20, inicio: 1, fim: 31 }, // Provérbios
  { livroId: 22, inicio: 1, fim: 8 }, // Cantares
  { livroId: 11, inicio: 1, fim: 22 }, // 1 Reis
  { livroId: 12, inicio: 1, fim: 25 }, // 2 Reis
  { livroId: 28, inicio: 1, fim: 14 }, // Oséias
  { livroId: 29, inicio: 1, fim: 3 }, // Joel
  { livroId: 30, inicio: 1, fim: 9 }, // Amós
  { livroId: 31, inicio: 1, fim: 1 }, // Obadias
  { livroId: 32, inicio: 1, fim: 4 }, // Jonas
  { livroId: 33, inicio: 1, fim: 7 }, // Miquéias
  { livroId: 34, inicio: 1, fim: 3 }, // Naum
  { livroId: 35, inicio: 1, fim: 3 }, // Habacuque
  { livroId: 36, inicio: 1, fim: 3 }, // Sofonias
  { livroId: 23, inicio: 1, fim: 66 }, // Isaías
  { livroId: 24, inicio: 1, fim: 52 }, // Jeremias
  { livroId: 25, inicio: 1, fim: 5 }, // Lamentações
  { livroId: 26, inicio: 1, fim: 48 }, // Ezequiel
  { livroId: 27, inicio: 1, fim: 12 }, // Daniel
  { livroId: 37, inicio: 1, fim: 2 }, // Ageu
  { livroId: 38, inicio: 1, fim: 14 }, // Zacarias
  { livroId: 13, inicio: 1, fim: 29 }, // 1 Crônicas
  { livroId: 14, inicio: 1, fim: 36 }, // 2 Crônicas
  { livroId: 15, inicio: 1, fim: 10 }, // Esdras
  { livroId: 16, inicio: 1, fim: 13 }, // Neemias
  { livroId: 17, inicio: 1, fim: 10 }, // Ester
  { livroId: 39, inicio: 1, fim: 4 }, // Malaquias
  { livroId: 21, inicio: 1, fim: 12 }, // Eclesiastes
  // Novo Testamento em ordem cronológica
  { livroId: 40, inicio: 1, fim: 28 }, // Mateus
  { livroId: 41, inicio: 1, fim: 16 }, // Marcos
  { livroId: 42, inicio: 1, fim: 24 }, // Lucas
  { livroId: 43, inicio: 1, fim: 21 }, // João
  { livroId: 44, inicio: 1, fim: 28 }, // Atos
  { livroId: 59, inicio: 1, fim: 5 }, // Tiago
  { livroId: 48, inicio: 1, fim: 6 }, // Gálatas
  { livroId: 52, inicio: 1, fim: 5 }, // 1 Tessalonicenses
  { livroId: 53, inicio: 1, fim: 3 }, // 2 Tessalonicenses
  { livroId: 46, inicio: 1, fim: 16 }, // 1 Coríntios
  { livroId: 47, inicio: 1, fim: 13 }, // 2 Coríntios
  { livroId: 45, inicio: 1, fim: 16 }, // Romanos
  { livroId: 49, inicio: 1, fim: 6 }, // Efésios
  { livroId: 50, inicio: 1, fim: 4 }, // Filipenses
  { livroId: 51, inicio: 1, fim: 4 }, // Colossenses
  { livroId: 57, inicio: 1, fim: 1 }, // Filemom
  { livroId: 54, inicio: 1, fim: 6 }, // 1 Timóteo
  { livroId: 56, inicio: 1, fim: 3 }, // Tito
  { livroId: 55, inicio: 1, fim: 4 }, // 2 Timóteo
  { livroId: 58, inicio: 1, fim: 13 }, // Hebreus
  { livroId: 60, inicio: 1, fim: 5 }, // 1 Pedro
  { livroId: 61, inicio: 1, fim: 3 }, // 2 Pedro
  { livroId: 62, inicio: 1, fim: 5 }, // 1 João
  { livroId: 63, inicio: 1, fim: 1 }, // 2 João
  { livroId: 64, inicio: 1, fim: 1 }, // 3 João
  { livroId: 65, inicio: 1, fim: 1 }, // Judas
  { livroId: 66, inicio: 1, fim: 22 }, // Apocalipse
]

export const PLANO_BIBLIA_COMPLETA_ID = 'biblia'

export const PLANOS = [
  {
    id: PLANO_BIBLIA_COMPLETA_ID,
    titulo: 'Bíblia completa',
    descricao: 'Todos os livros; use o mapa na tela do plano para ir a um trecho.',
    capitulos: 1189,
    diasTotais: 365,
    capitulosPorDia: 3.3,
    livros,
  },
  {
    id: 'cronologico',
    ocultoNoCadastro: true,
    titulo: 'Plano Cronológico',
    descricao: 'Leia a Bíblia na ordem dos acontecimentos históricos',
    capitulos: 1189,
    diasTotais: 365,
    capitulosPorDia: 3.3,
    livros: ordemCronologica.map(item => ({
      ...livros.find(l => l.id === item.livroId),
      inicioPlano: item.inicio,
      fimPlano: item.fim
    }))
  },
  {
    id: 'anual',
    ocultoNoCadastro: true,
    titulo: 'Plano Anual',
    descricao: 'Leia a Bíblia completa em 1 ano',
    capitulos: 1189,
    diasTotais: 365,
    capitulosPorDia: 3.3,
    livros,
  },
  {
    id: 'nt-90',
    ocultoNoCadastro: true,
    titulo: 'Novo Testamento em 90 dias',
    descricao: 'Leitura focada no Novo Testamento',
    capitulos: 260,
    diasTotais: 90,
    capitulosPorDia: 2.9,
    livros: livros.filter(l => l.testamento === 'NT')
  },
  {
    id: 'sabedoria-30',
    ocultoNoCadastro: true,
    titulo: 'Livros de Sabedoria em 90 dias',
    descricao: 'Jó, Salmos, Provérbios, Eclesiastes e Cantares',
    capitulos: 243,
    diasTotais: 90,
    capitulosPorDia: 2.7,
    livros: livros.filter(l => ['Jó', 'Salmos', 'Provérbios', 'Eclesiastes', 'Cantares'].includes(l.nome))
  }
]

/** Modelos que ainda aparecem ao criar plano novo (os demais existem só para instâncias antigas). */
export const PLANOS_NOVO_CADASTRO = PLANOS.filter((p) => !p.ocultoNoCadastro)
