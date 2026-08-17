import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PedidoResponse, StatusEntregaPedido, StatusPedido } from '../../core/models/pedido.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { PedidoResumoFinanceiroComponent } from '../../shared/components/pedido-resumo-financeiro/pedido-resumo-financeiro.component';
import {
  EntregaTimelineItem,
  entregaStatusCor,
  entregaStatusTexto,
  entregaTimelinePedido
} from '../../shared/utils/entrega-status.util';
import {
  pagamentoConfirmadoPedido,
  pagamentoPixPendentePedido,
  statusPagamentoClasse,
  statusPagamentoPedido,
  statusPagamentoTexto
} from '../../shared/utils/pagamento-status.util';

@Component({
  selector: 'app-pedido-sucesso',
  standalone: true,
  imports: [DatePipe, RouterLink, NzButtonModule, NzIconModule, NzResultModule, NzTagModule, PedidoResumoFinanceiroComponent],
  templateUrl: './pedido-sucesso.component.html',
  styleUrl: './pedido-sucesso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoSucessoComponent {
  private readonly router = inject(Router);
  protected readonly carrinhoService = inject(CarrinhoService);
  protected readonly pedido = this.router.getCurrentNavigation()?.extras.state?.['pedido'] as PedidoResponse | undefined;

  protected statusTexto(status: StatusPedido): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmacao',
      CONFIRMADO: 'Confirmado',
      CONCLUIDO: 'Concluido',
      CANCELADO: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  protected statusPedidoTexto(pedido: PedidoResponse): string {
    if (this.pagamentoPixPendente(pedido)) {
      return 'Aguardando pagamento';
    }

    return this.statusTexto(pedido.status);
  }

  protected pagamentoConfirmado(pedido: PedidoResponse): boolean {
    return pagamentoConfirmadoPedido(pedido);
  }

  protected pagamentoStatusTexto(pedido: PedidoResponse): string {
    return statusPagamentoTexto(statusPagamentoPedido(pedido));
  }

  protected pagamentoStatusClasse(pedido: PedidoResponse): string {
    return statusPagamentoClasse(statusPagamentoPedido(pedido));
  }

  protected entregaStatusTexto(status: StatusEntregaPedido): string {
    return entregaStatusTexto(status);
  }

  protected entregaStatusCor(status: StatusEntregaPedido): string {
    return entregaStatusCor(status);
  }

  protected entregaTimeline(pedido: PedidoResponse): EntregaTimelineItem[] {
    return entregaTimelinePedido(pedido);
  }

  private pagamentoPixPendente(pedido: PedidoResponse): boolean {
    return pagamentoPixPendentePedido(pedido);
  }
}
