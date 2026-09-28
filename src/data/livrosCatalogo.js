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
    descricao: 'Uma investigação pastoral da vida espiritual, das marcas da conversão e do amadurecimento da fé cristã.',
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
    descricao: 'Ilustrações, imagens e observações reunidas por Spurgeon para dar clareza e força ao ensino cristão.',
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
    descricao: 'Retratos de homens e acontecimentos que marcaram a história protestante, apresentados para iluminar a igreja de hoje.',
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
    descricao: 'Uma exposição dialogada e sistemática da fé cristã, organizada para instrução doutrinária da igreja.',
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
    descricao: 'Uma contemplação da condução de Deus na história pessoal do cristão, especialmente em caminhos difíceis e inesperados.',
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
    descricao: 'Um exame direto da diferença entre a aparência religiosa e a realidade de uma fé transformadora.',
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
    descricao: 'Um retrato pastoral das marcas da piedade verdadeira e de sua expressão concreta na vida do cristão.',
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
    descricao: 'Consolo bíblico para consciências aflitas, corações desanimados e cristãos atravessando tempos de profunda provação.',
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
    descricao: 'Uma obra clássica de exame e segurança espiritual sobre o chamado, a fé e o interesse pessoal em Cristo.',
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
