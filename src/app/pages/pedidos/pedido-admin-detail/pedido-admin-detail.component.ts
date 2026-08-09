import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  selector: 'app-pedido-admin-detail',
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
  templateUrl: './pedido-admin-detail.component.html',
  styleUrl: './pedido-admin-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoAdminDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidoService = inject(PedidoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly exportandoPdf = signal(false);
  protected readonly pedido = signal<PedidoResponse | null>(null);
  protected readonly possuiPedido = computed(() => this.pedido() !== null);

  ngOnInit(): void {
    this.carregarPedido();
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

  protected exportarPdf(): void {
    const pedido = this.pedido();

    if (!pedido) {
      return;
    }

    this.exportandoPdf.set(true);

    this.pedidoService.exportarPdf(pedido.id).pipe(
      finalize(() => this.exportandoPdf.set(false))
    ).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, `pedido-${pedido.id}.pdf`),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private carregarPedido(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.message.error('Pedido invalido.');
      return;
    }

    this.carregando.set(true);

    this.pedidoService.buscarPedidoAdministrativo(id).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (pedido) => this.pedido.set(pedido),
      error: (error: HttpErrorResponse | Error) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private extrairMensagemErro(error: HttpErrorResponse | Error): string {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error.message || 'Nao foi possivel carregar o pedido.';
    }

    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar o pedido.';
    }

    return 'Nao foi possivel carregar o pedido.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
