import { FormaPagamentoResponse } from './forma-pagamento.model';
import { EnderecoResponse } from './endereco.model';
import { UnidadeResumo } from './unidade.model';

export type StatusPedido = 'AGUARDANDO_PAGAMENTO' | 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO';
export type StatusPagamento = 'PENDENTE' | 'PAGO' | 'EXPIRADO' | 'CANCELADO' | 'ERRO';
export type TipoPedido = 'DELIVERY' | 'PDV';
export type StatusEntregaPedido =
  | 'AGUARDANDO_ENTREGADOR'
  | 'ATRIBUIDA'
  | 'ACEITA'
  | 'EM_ROTA'
  | 'ENTREGUE'
  | 'CANCELADA'
  | 'RECUSADA';

export interface ItemPedidoComplementoRequest {
  opcaoComplementoId: number;
  quantidade: number;
}

export interface ItemPedidoRequest {
  produtoId: number;
  quantidade: number;
  observacao?: string | null;
  complementos?: ItemPedidoComplementoRequest[];
}

export interface PedidoRequest {
  formaPagamentoId: number;
  tipo?: TipoPedido;
  valorRecebido?: number | null;
  troco?: number | null;
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
  unidadeId?: number;
  status?: StatusPedido;
  tipo?: TipoPedido;
  dataInicio?: string;
  dataFim?: string;
  recentes?: boolean;
}

export interface ItemPedidoResponse {
  id: number;
  produtoId: number;
  produtoNome: string;
  produtoImagemUrl?: string | null;
  produtoArquivosUrl?: string[] | null;
  quantidade: number;
  valorProduto: number;
  precoUnitario: number;
  valorUnitarioFinal: number;
  subtotal: number;
  observacao?: string | null;
  complementos?: ItemPedidoComplementoResponse[];
}

export interface ItemPedidoComplementoResponse {
  id?: number;
  opcaoComplementoId?: number;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface PagamentoResponse {
  id: number;
  formaPagamento: FormaPagamentoResponse;
  valor: number;
  status: StatusPagamento;
  provedorCobrancaId?: string | null;
  provedorStatus?: string | null;
  pixExpiraEm?: string | null;
  confirmadoEm?: string | null;
  dataCriacao: string;
}

export interface PedidoParticipanteResponse {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

export interface PedidoEntregaResponse {
  id: number;
  status: StatusEntregaPedido;
  entregador?: PedidoParticipanteResponse | null;
  atribuidoEm?: string | null;
  aceitoEm?: string | null;
  saiuParaEntregaEm?: string | null;
  entregueEm?: string | null;
}

export interface PedidoResponse {
  id: number;
  status: StatusPedido;
  tipo: TipoPedido | null;
  dataCriacao: string;
  confirmadoEm?: string | null;
  subtotal: number;
  percentualDesconto: number;
  valorDesconto: number;
  valorTaxaFixa: number;
  percentualAcrescimo: number;
  valorAcrescimo: number;
  valorTotal: number;
  valorRecebido?: number | null;
  troco?: number | null;
  formaPagamento: FormaPagamentoResponse;
  itens: ItemPedidoResponse[];
  pagamento: PagamentoResponse | null;
  cliente: PedidoParticipanteResponse | null;
  vendedor: PedidoParticipanteResponse | null;
  unidade: UnidadeResumo | null;
  enderecoEntrega: EnderecoResponse | null;
  entrega?: PedidoEntregaResponse | null;
}

export interface PedidoResumoFinanceiro {
  subtotal: number;
  percentualDesconto?: number | null;
  valorDesconto?: number | null;
  valorTaxaFixa?: number | null;
  percentualAcrescimo?: number | null;
  valorAcrescimo?: number | null;
  valorTotal: number;
}
