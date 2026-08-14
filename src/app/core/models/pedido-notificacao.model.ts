export enum StatusPedidoNotificacao {
  AGUARDANDO_PAGAMENTO = 'AGUARDANDO_PAGAMENTO',
  AGUARDANDO_CONFIRMACAO = 'AGUARDANDO_CONFIRMACAO',
  CONFIRMADO = 'CONFIRMADO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO'
}

export enum StatusPagamentoNotificacao {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
  EXPIRADO = 'EXPIRADO'
}

export enum StatusEntregaNotificacao {
  AGUARDANDO_ENTREGADOR = 'AGUARDANDO_ENTREGADOR',
  ATRIBUIDA = 'ATRIBUIDA',
  ACEITA = 'ACEITA',
  EM_ROTA = 'EM_ROTA',
  ENTREGUE = 'ENTREGUE',
  CANCELADA = 'CANCELADA',
  RECUSADA = 'RECUSADA'
}

export enum TipoPedidoNotificacao {
  DELIVERY = 'DELIVERY',
  PDV = 'PDV'
}

export enum TipoFormaPagamentoNotificacao {
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  CARTAO_CREDITO = 'CARTAO_CREDITO'
}

export interface PedidoStatusNotificacao {
  pedidoId: number;
  unidadeId?: number;
  entregadorId?: number;
  statusPedido?: StatusPedidoNotificacao;
  statusPagamento?: StatusPagamentoNotificacao;
  statusEntrega?: StatusEntregaNotificacao;
  tipoPedido?: TipoPedidoNotificacao;
  tipoFormaPagamento?: TipoFormaPagamentoNotificacao;
  mensagem: string;
  dataHora: string;
}
