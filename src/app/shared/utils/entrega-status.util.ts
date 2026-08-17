import { PedidoResponse, StatusEntregaPedido } from '../../core/models/pedido.model';

export interface EntregaTimelineItem {
  label: string;
  data: string | null | undefined;
}

export function entregaStatusTexto(status: StatusEntregaPedido): string {
  const labels: Record<StatusEntregaPedido, string> = {
    AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
    ATRIBUIDA: 'Atribuida',
    ACEITA: 'Aceita',
    EM_ROTA: 'Em rota',
    ENTREGUE: 'Entregue',
    CANCELADA: 'Cancelada',
    RECUSADA: 'Recusada'
  };

  return labels[status] ?? status;
}

export function entregaStatusClasse(status: StatusEntregaPedido): string {
  const classes: Record<StatusEntregaPedido, string> = {
    AGUARDANDO_ENTREGADOR: 'aguardando',
    ATRIBUIDA: 'aguardando',
    ACEITA: 'confirmado',
    EM_ROTA: 'andamento',
    ENTREGUE: 'concluido',
    CANCELADA: 'cancelado',
    RECUSADA: 'cancelado'
  };

  return classes[status] ?? 'neutro';
}

export function entregaStatusCor(status: StatusEntregaPedido): string {
  const cores: Record<StatusEntregaPedido, string> = {
    AGUARDANDO_ENTREGADOR: 'default',
    ATRIBUIDA: 'processing',
    ACEITA: 'blue',
    EM_ROTA: 'warning',
    ENTREGUE: 'success',
    CANCELADA: 'error',
    RECUSADA: 'error'
  };

  return cores[status] ?? 'default';
}

export function entregaTimelinePedido(pedido: PedidoResponse): EntregaTimelineItem[] {
  const entrega = pedido.entrega;

  if (!entrega) {
    return [];
  }

  return [
    { label: 'Atribuida', data: entrega.atribuidoEm },
    { label: 'Aceita pelo entregador', data: entrega.aceitoEm },
    { label: 'Saiu para entrega', data: entrega.saiuParaEntregaEm },
    { label: 'Entregue', data: entrega.entregueEm }
  ];
}
