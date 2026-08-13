import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PedidoResponse, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { AuthService } from '../../../core/services/auth.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { salvarArquivo } from '../../../core/utils/download-file';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PedidoResumoFinanceiroComponent } from '../../../shared/components/pedido-resumo-financeiro/pedido-resumo-financeiro.component';

@Component({
  selector: 'app-pedido-admin-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzTagModule,
    PageHeaderComponent,
    PedidoResumoFinanceiroComponent
  ],
  templateUrl: './pedido-admin-detail.component.html',
  styleUrl: './pedido-admin-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoAdminDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly pedidoService = inject(PedidoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly processando = signal(false);
  protected readonly exportandoPdf = signal(false);
  protected readonly pedido = signal<PedidoResponse | null>(null);
  protected readonly possuiPedido = computed(() => this.pedido() !== null);
  protected readonly podeAlterarStatusPedido = computed(() => this.authService.possuiPermissao(PERMISSOES.PEDIDO_ALTERAR_STATUS));

  ngOnInit(): void {
    this.carregarPedido();
  }

  protected corStatus(status: StatusPedido): string {
    const cores: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'warning',
      AGUARDANDO_CONFIRMACAO: 'processing',
      CONFIRMADO: 'success',
      CONCLUIDO: 'success',
      CANCELADO: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected statusTexto(status: StatusPedido): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
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

  protected corStatusPedido(pedido: PedidoResponse): string {
    return this.pagamentoPixPendente(pedido) ? 'warning' : this.corStatus(pedido.status);
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

  protected pagamentoStatusTexto(pedido: PedidoResponse): string {
    return this.pagamentoConfirmado(pedido) ? 'Pago' : 'Pendente';
  }

  protected pagamentoConfirmado(pedido: PedidoResponse): boolean {
    return pedido.pagamento?.status === 'PAGO' || !!pedido.pagamento?.confirmadoEm;
  }

  protected pagamentoPixPendente(pedido: PedidoResponse): boolean {
    return pedido.formaPagamento.tipo === 'PIX'
      && !this.pagamentoConfirmado(pedido)
      && pedido.status !== 'CONCLUIDO'
      && pedido.status !== 'CANCELADO';
  }

  protected podeConcluirPedido(pedido: PedidoResponse): boolean {
    return this.podeAlterarStatusPedido() && pedido.status === 'CONFIRMADO';
  }

  protected concluirPedido(): void {
    const pedido = this.pedido();

    if (!pedido || !this.podeConcluirPedido(pedido)) {
      return;
    }

    this.processando.set(true);

    this.pedidoService.concluirPedido(pedido.id).pipe(
      finalize(() => this.processando.set(false))
    ).subscribe({
      next: (pedidoAtualizado) => {
        this.pedido.set(pedidoAtualizado);
        this.message.success('Pedido concluido com sucesso.');
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
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
