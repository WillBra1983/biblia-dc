// Mesmo contato de suporte publicado nas telas Sobre e Privacidade.
export function contatoPagamentoPix(pedido, titulo) {
  const mensagem = `Olá! Gostaria de conferir o pagamento do pedido ${pedido.codigo}, livro "${titulo}". O aplicativo informou que o Pix não foi localizado. Vou enviar o comprovante, se o pagamento foi realizado.`
  return 'https://wa.me/5569999104826?text=' + encodeURIComponent(mensagem)
}
