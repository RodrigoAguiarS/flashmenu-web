import { FormaPagamentoResponse } from './forma-pagamento.model';

export type StatusPedido = 'AGUARDANDO_PAGAMENTO' | 'PAGO' | 'CANCELADO' | string;
export type StatusPagamento = 'PENDENTE' | 'PAGO' | 'CANCELADO' | string;
export type TipoPedido = 'DELIVERY' | 'PDV' | string;

export interface ItemPedidoRequest {
  produtoId: number;
  quantidade: number;
}

export interface PedidoRequest {
  formaPagamentoId: number;
  tipo?: TipoPedido;
  itens: ItemPedidoRequest[];
}

export interface AlterarStatusPedidoRequest {
  status: StatusPedido;
}

export interface PedidoFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  usuarioId?: number;
  status?: StatusPedido;
  tipo?: TipoPedido;
}

export interface ItemPedidoResponse {
  id: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface PagamentoResponse {
  id: number;
  formaPagamento: FormaPagamentoResponse;
  valor: number;
  status: StatusPagamento;
  dataCriacao: string;
  dataPagamento: string | null;
}

export interface PedidoResponse {
  id: number;
  status: StatusPedido;
  tipo: TipoPedido | null;
  dataCriacao: string;
  subtotal: number;
  percentualAcrescimo: number;
  valorAcrescimo: number;
  valorTotal: number;
  formaPagamento: FormaPagamentoResponse;
  itens: ItemPedidoResponse[];
  pagamento: PagamentoResponse | null;
}
