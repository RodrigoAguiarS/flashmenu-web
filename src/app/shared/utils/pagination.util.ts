const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function criarOpcoesTamanhoPagina(totalElements: number, options = DEFAULT_PAGE_SIZE_OPTIONS): number[] {
  if (totalElements <= 0) {
    return [options[0]];
  }

  const opcoes = options.filter((option) => option < totalElements);

  return [...opcoes, totalElements];
}
