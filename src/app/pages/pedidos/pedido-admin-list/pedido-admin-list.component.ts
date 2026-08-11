import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PedidoResponse, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { AuthService } from '../../../core/services/auth.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { salvarArquivo } from '../../../core/utils/download-file';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-pedido-admin-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputNumberModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    PageHeaderComponent
  ],
  templateUrl: './pedido-admin-list.component.html',
  styleUrl: './pedido-admin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoAdminListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly pedidoService = inject(PedidoService);
  private readonly authService = inject(AuthService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly pdfProcessandoId = signal<number | null>(null);
  protected readonly pedidos = signal<PedidoResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly possuiPedidos = computed(() => this.pedidos().length > 0);
  protected readonly podeCancelarPedido = computed(() => this.authService.possuiPermissao(PERMISSOES.PEDIDO_CANCELAR));
  protected readonly podeConfirmarPagamento = computed(() => this.authService.possuiPermissao(PERMISSOES.PAGAMENTO_CONFIRMAR));
  protected readonly statusOptions: StatusPedido[] = ['AGUARDANDO_CONFIRMACAO', 'PAGO', 'CANCELADO'];
  protected readonly tipoOptions: TipoPedido[] = ['DELIVERY', 'PDV'];

  protected readonly filtros = this.fb.group({
    id: this.fb.control<number | null>(null),
    usuarioId: this.fb.control<number | null>(null),
    status: this.fb.control<StatusPedido | null>(null),
    tipo: this.fb.control<TipoPedido | null>(null)
  });

  ngOnInit(): void {
    this.carregarPedidos();
  }

  protected filtrar(): void {
    this.pageIndex.set(1);
    this.carregarPedidos();
  }

  protected limparFiltros(): void {
    this.filtros.reset({ id: null, usuarioId: null, status: null, tipo: null });
    this.pageIndex.set(1);
    this.carregarPedidos();
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarPedidos();
  }

  protected confirmarPagamento(pedido: PedidoResponse): void {
    this.executarAcao(pedido.id, 'Pagamento confirmado com sucesso.', () =>
      this.pedidoService.confirmarPagamento(pedido.id)
    );
  }

  protected cancelarPedido(pedido: PedidoResponse): void {
    this.executarAcao(pedido.id, 'Pedido cancelado com sucesso.', () =>
      this.pedidoService.cancelarPedido(pedido.id)
    );
  }

  protected exportarPdf(pedido: PedidoResponse): void {
    this.pdfProcessandoId.set(pedido.id);

    this.pedidoService.exportarPdf(pedido.id).pipe(
      finalize(() => this.pdfProcessandoId.set(null))
    ).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, `pedido-${pedido.id}.pdf`),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected podeExecutarConfirmacao(pedido: PedidoResponse): boolean {
    return this.podeConfirmarPagamento() && pedido.status !== 'PAGO' && pedido.status !== 'CANCELADO';
  }

  protected podeExecutarCancelamento(pedido: PedidoResponse): boolean {
    return this.podeCancelarPedido() && pedido.status !== 'CANCELADO';
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

  protected nomeUnidade(pedido: PedidoResponse): string {
    return pedido.unidade?.nome ?? 'Unidade nao informada';
  }

  private carregarPedidos(): void {
    const filtros = this.filtros.getRawValue();
    const unidadeId = this.authService.usuarioAutenticado()?.unidade?.id;

    if (!unidadeId) {
      this.pedidos.set([]);
      this.total.set(0);
      this.message.warning('Nao foi possivel identificar a unidade do usuario logado.');
      return;
    }

    this.carregando.set(true);

    this.pedidoService.listarTodosPaginado({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'id',
      id: filtros.id ?? undefined,
      usuarioId: filtros.usuarioId ?? undefined,
      unidadeId,
      status: filtros.status ?? undefined,
      tipo: filtros.tipo ?? undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.pedidos.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private executarAcao(
    pedidoId: number,
    mensagemSucesso: string,
    operacao: () => ReturnType<PedidoService['confirmarPagamento']>
  ): void {
    this.processandoId.set(pedidoId);

    operacao().pipe(
      finalize(() => this.processandoId.set(null))
    ).subscribe({
      next: (pedidoAtualizado) => {
        this.pedidos.update((pedidos) =>
          pedidos.map((pedido) => pedido.id === pedidoAtualizado.id ? pedidoAtualizado : pedido)
        );
        this.message.success(mensagemSucesso);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar os pedidos.';
    }

    return 'Nao foi possivel carregar os pedidos.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
