import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PedidoResponse, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { PedidoService } from '../../../core/services/pedido.service';
import { salvarArquivo } from '../../../core/utils/download-file';

@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    NzButtonModule,
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
  private readonly router = inject(Router);
  private readonly pedidoService = inject(PedidoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly pdfProcessandoId = signal<number | null>(null);
  protected readonly pedidos = signal<PedidoResponse[]>([]);
  protected readonly possuiPedidos = computed(() => this.pedidos().length > 0);

  ngOnInit(): void {
    this.carregarPedidos();
  }

  protected corStatus(status: StatusPedido): string {
    const cores: Record<string, string> = {
      AGUARDANDO_CONFIRMACAO: 'processing',
      PAGO: 'success',
      CANCELADO: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected statusTexto(status: StatusPedido): string {
    const labels: Record<string, string> = {
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
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

  protected abrirDetalhe(id: number, event?: Event): void {
    event?.stopPropagation();
    void this.router.navigate(['/pedidos', id]);
  }

  protected exportarPdf(pedido: PedidoResponse, event: Event): void {
    event.stopPropagation();
    this.pdfProcessandoId.set(pedido.id);

    this.pedidoService.exportarPdf(pedido.id).pipe(
      finalize(() => this.pdfProcessandoId.set(null))
    ).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, `pedido-${pedido.id}.pdf`),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
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
