import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PedidoResponse } from '../../core/models/pedido.model';

@Component({
  selector: 'app-pedido-sucesso',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, NzButtonModule, NzResultModule, NzTagModule],
  templateUrl: './pedido-sucesso.component.html',
  styleUrl: './pedido-sucesso.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoSucessoComponent {
  private readonly router = inject(Router);
  protected readonly pedido = this.router.getCurrentNavigation()?.extras.state?.['pedido'] as PedidoResponse | undefined;

  protected statusPagamentoTexto(status: string): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      CANCELADO: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  protected corStatusPagamento(status: string): string {
    const cores: Record<string, string> = {
      PENDENTE: 'warning',
      PAGO: 'success',
      CANCELADO: 'error'
    };

    return cores[status] ?? 'default';
  }
}
