export function normalizarTelefoneWhatsapp(telefone: string | null | undefined): string | null {
  const valor = telefone?.replace(/\D/g, '') ?? '';

  if (!valor) {
    return null;
  }

  return valor.startsWith('55') ? valor : `55${valor}`;
}

export function montarLinkWhatsapp(telefone: string | null | undefined, nomeLoja: string): string | null {
  const telefoneNormalizado = normalizarTelefoneWhatsapp(telefone);

  if (!telefoneNormalizado) {
    return null;
  }

  const texto = encodeURIComponent(`Ola, vim pelo FlashMenu e quero fazer um pedido na ${nomeLoja}.`);
  return `https://wa.me/${telefoneNormalizado}?text=${texto}`;
}

export function montarUrlPublicaLoja(origin: string, slug: string | null | undefined): string {
  return slug ? `${origin}/loja/${slug}` : origin;
}
