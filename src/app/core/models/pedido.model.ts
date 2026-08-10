import { FormaPagamentoResponse } from './forma-pagamento.model';
import { EnderecoResponse } from './endereco.model';

export type StatusPedido = 'AGUARDANDO_CONFIRMACAO' | 'PAGO' | 'CANCELADO' | string;
export type TipoPedido = 'DELIVERY' | 'PDV' | string;

export interface ItemPedidoRequest {
  produtoId: number;
  quantidade: number;
  observacao?: string | null;
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
  observacao?: string | null;
}

export interface PagamentoResponse {
  id: number;
  formaPagamento: FormaPagamentoResponse;
  valor: number;
  dataCriacao: string;
  dataPagamento: string | null;
}

export interface PedidoParticipanteResponse {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
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
  cliente?: PedidoParticipanteResponse | null;
  vendedor?: PedidoParticipanteResponse | null;
  enderecoEntrega?: EnderecoResponse | null;
}
