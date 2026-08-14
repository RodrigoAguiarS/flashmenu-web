import { TipoFormaPagamento } from './forma-pagamento.model';
import { EnderecoResponse } from './endereco.model';
import { PedidoParticipanteResponse, PedidoResponse, StatusPagamento, StatusPedido } from './pedido.model';
import { UnidadeResumo } from './unidade.model';

export type StatusEntrega =
  | 'AGUARDANDO_ENTREGADOR'
  | 'ATRIBUIDA'
  | 'ACEITA'
  | 'EM_ROTA'
  | 'ENTREGUE'
  | 'CANCELADA'
  | 'RECUSADA';

export interface EntregaFiltros {
  page: number;
  size: number;
  sort?: string;
  status?: StatusEntrega;
  entregadorId?: number;
}

export interface AtribuirEntregadorRequest {
  entregadorId: number;
}

export interface RecusarEntregaRequest {
  observacao?: string | null;
}

export interface EntregaUsuarioResumo {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

export interface EntregaPedidoResumo {
  id: number;
  status: StatusPedido;
  tipo?: string | null;
}

export interface EntregaResponse {
  id: number;
  pedidoId?: number | null;
  numeroPedido?: number | null;
  pedido?: PedidoResponse | EntregaPedidoResumo | null;
  cliente?: PedidoParticipanteResponse | null;
  enderecoEntrega?: EnderecoResponse | null;
  unidade?: UnidadeResumo | null;
  entregador?: EntregaUsuarioResumo | null;
  entregadorId?: number | null;
  status: StatusEntrega;
  statusPedido?: StatusPedido | null;
  tipoFormaPagamento?: TipoFormaPagamento | null;
  valorTotal?: number | null;
  valorRecebido?: number | null;
  troco?: number | null;
  statusPagamento?: StatusPagamento | null;
  observacao?: string | null;
  criadoEm?: string | null;
  atribuidoEm?: string | null;
  aceitoEm?: string | null;
  saiuParaEntregaEm?: string | null;
  entregueEm?: string | null;
  canceladoEm?: string | null;
  recusadoEm?: string | null;
  atualizadoEm?: string | null;
}
