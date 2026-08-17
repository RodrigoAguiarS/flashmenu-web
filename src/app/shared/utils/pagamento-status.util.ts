import { PedidoResponse, StatusPagamento } from '../../core/models/pedido.model';

export type PagamentoStatusClasse =
  | 'pagamento-pendente'
  | 'pagamento-pago'
  | 'pagamento-cancelado'
  | 'pagamento-expirado'
  | 'pagamento-erro'
  | 'pagamento-nao-informado';

export function statusPagamentoPedido(pedido: PedidoResponse): StatusPagamento | null {
  return pedido.pagamento?.status ?? null;
}

export function pagamentoConfirmadoPedido(pedido: PedidoResponse): boolean {
  const status = statusPagamentoPedido(pedido);

  if (status) {
    return status === 'PAGO';
  }

  return !!pedido.pagamento?.confirmadoEm;
}

export function pagamentoPixPendentePedido(pedido: PedidoResponse): boolean {
  const status = statusPagamentoPedido(pedido);

  return pedido.formaPagamento.tipo === 'PIX'
    && (status === 'PENDENTE' || (!status && !pagamentoConfirmadoPedido(pedido)))
    && pedido.status !== 'CONCLUIDO'
    && pedido.status !== 'CANCELADO';
}

export function statusPagamentoTexto(status: StatusPagamento | null | undefined): string {
  const labels: Record<StatusPagamento, string> = {
    PENDENTE: 'Pendente',
    PAGO: 'Pago',
    EXPIRADO: 'Expirado',
    CANCELADO: 'Cancelado',
    ERRO: 'Erro'
  };

  return status ? labels[status] ?? status : 'Nao informado';
}

export function statusPagamentoClasse(status: StatusPagamento | null | undefined): PagamentoStatusClasse {
  const classes: Record<StatusPagamento, PagamentoStatusClasse> = {
    PENDENTE: 'pagamento-pendente',
    PAGO: 'pagamento-pago',
    EXPIRADO: 'pagamento-expirado',
    CANCELADO: 'pagamento-cancelado',
    ERRO: 'pagamento-erro'
  };

  return status ? classes[status] ?? 'pagamento-nao-informado' : 'pagamento-nao-informado';
}
