export type TipoDocumentoMask = 'cpf' | 'cnpj' | 'telefone';

export function somenteNumeros(valor: string | number | null | undefined): string {
  return String(valor ?? '').replace(/\D/g, '');
}

export function formatarCpf(valor: string | number | null | undefined): string {
  const numeros = somenteNumeros(valor).slice(0, 11);

  return numeros
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function formatarCnpj(valor: string | number | null | undefined): string {
  const numeros = somenteNumeros(valor).slice(0, 14);

  return numeros
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

export function formatarTelefone(valor: string | number | null | undefined): string {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\(\d{2}\) \d{4})(\d)/, '$1-$2');
  }

  return numeros
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2');
}

export function aplicarMascaraDocumento(tipo: TipoDocumentoMask, valor: string | number | null | undefined): string {
  const formatadores: Record<TipoDocumentoMask, (valor: string | number | null | undefined) => string> = {
    cpf: formatarCpf,
    cnpj: formatarCnpj,
    telefone: formatarTelefone
  };

  return formatadores[tipo](valor);
}
