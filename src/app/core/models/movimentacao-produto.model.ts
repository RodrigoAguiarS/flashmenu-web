export type TipoMovimentacaoProduto = 'ENTRADA' | 'SAIDA' | 'ESTORNO' | 'AJUSTE';

export interface MovimentacaoProdutoRequest {
  quantidade: number;
  observacao?: string | null;
}

export interface AjusteEstoqueProdutoRequest {
  quantidadeEstoque: number;
  observacao?: string | null;
}

export interface MovimentacaoProdutoResponse {
  id: number;
  produtoId: number;
  produtoNome: string;
  pedidoId: number | null;
  tipo: TipoMovimentacaoProduto;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  observacao: string | null;
  criadoEm: string;
}

export interface MovimentacaoProdutoFiltros {
  page: number;
  size: number;
  tipo?: TipoMovimentacaoProduto | null;
}
