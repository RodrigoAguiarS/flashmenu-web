export interface DashboardPeriodoFiltros {
  dataInicio: string;
  dataFim: string;
}

export interface DashboardResumoResponse {
  totalPedidos: number;
  pedidosPagos: number;
  pedidosAguardandoConfirmacao: number;
  pedidosCancelados: number;
  faturamentoBruto: number;
  ticketMedio: number;
  valorAcrescimos: number;
  quantidadeItensVendidos: number;
}

export interface VendaPorDiaResponse {
  data: string;
  totalPedidos: number;
  faturamento: number;
}

export interface ProdutoMaisVendidoResponse {
  produtoId: number;
  produtoNome: string;
  quantidadeVendida: number;
  faturamento: number;
}

export interface VendaPorFormaPagamentoResponse {
  formaPagamentoId: number;
  nome: string;
  totalPedidos: number;
  faturamento: number;
  valorAcrescimos: number;
}

export interface ProdutoEstoqueBaixoResponse {
  produtoId: number;
  produtoNome: string;
  quantidadeEstoque: number;
}
