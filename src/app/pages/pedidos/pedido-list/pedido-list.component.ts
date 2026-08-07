import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PedidoResponse, StatusPagamento, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { PedidoService } from '../../../core/services/pedido.service';

@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzCollapseModule,
    NzEmptyModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './pedido-list.component.html',
  styleUrl: './pedido-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoListComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly pedidos = signal<PedidoResponse[]>([]);
  protected readonly possuiPedidos = computed(() => this.pedidos().length > 0);

  ngOnInit(): void {
    this.carregarPedidos();
  }

  protected corStatus(status: StatusPedido): string {
    const cores: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'processing',
      PAGO: 'success',
      CANCELADO: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected statusTexto(status: StatusPedido): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      PAGO: 'Pago',
      CANCELADO: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  protected corStatusPagamento(status: StatusPagamento): string {
    const cores: Record<string, string> = {
      PENDENTE: 'warning',
      PAGO: 'success',
      CANCELADO: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected statusPagamentoTexto(status: StatusPagamento): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      CANCELADO: 'Cancelado'
    };

    return labels[status] ?? status;
  }

  protected corTipo(tipo: TipoPedido | null): string {
    const cores: Record<string, string> = {
      DELIVERY: 'blue',
      PDV: 'purple'
    };

    return tipo ? cores[tipo] ?? 'default' : 'default';
  }

  protected tipoTexto(tipo: TipoPedido | null): string {
    const labels: Record<string, string> = {
      DELIVERY: 'Delivery',
      PDV: 'PDV'
    };

    return tipo ? labels[tipo] ?? tipo : 'Nao informado';
  }

  private carregarPedidos(): void {
    this.carregando.set(true);

    this.pedidoService.listarMeusPedidos().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (pedidos) => this.pedidos.set(pedidos),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar seus pedidos.';
    }

    return 'Nao foi possivel carregar seus pedidos.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
