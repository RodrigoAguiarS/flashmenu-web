import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EntregaResponse, StatusEntrega } from '../../../core/models/entrega.model';
import { StatusPedido } from '../../../core/models/pedido.model';
import { AuthService } from '../../../core/services/auth.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { criarOpcoesTamanhoPagina } from '../../../shared/utils/pagination.util';

@Component({
  selector: 'app-entrega-admin-list',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NzButtonModule,
    NzDescriptionsModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputNumberModule,
    NzModalModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzTimelineModule,
    PageHeaderComponent
  ],
  templateUrl: './entrega-admin-list.component.html',
  styleUrl: './entrega-admin-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntregaAdminListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly entregaService = inject(EntregaService);
  private readonly message = inject(NzMessageService);

  protected readonly entregas = signal<EntregaResponse[]>([]);
  protected readonly entregaDetalhe = signal<EntregaResponse | null>(null);
  protected readonly entregaAtribuicao = signal<EntregaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly carregandoDetalhe = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly drawerAberto = signal(false);
  protected readonly modalAtribuicaoAberto = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly possuiEntregas = computed(() => this.entregas().length > 0);
  protected readonly pageSizeOptions = computed(() => criarOpcoesTamanhoPagina(this.total()));
  protected readonly podeAtribuirEntrega = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_ATRIBUIR));
  protected readonly statusOptions: StatusEntrega[] = [
    'ATRIBUIDA',
    'ACEITA',
    'EM_ROTA',
    'ENTREGUE',
    'RECUSADA',
    'CANCELADA'
  ];

  protected readonly filtros = this.fb.group({
    status: this.fb.control<StatusEntrega | null>(null),
    entregadorId: this.fb.control<number | null>(null)
  });

  protected readonly atribuicaoForm = this.fb.group({
    entregadorId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)])
  });

  ngOnInit(): void {
    this.carregarEntregas();
  }

  protected filtrar(): void {
    this.pageIndex.set(1);
    this.carregarEntregas();
  }

  protected limparFiltros(): void {
    this.filtros.reset({ status: null, entregadorId: null });
    this.filtrar();
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarEntregas();
  }

  protected alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarEntregas();
  }

  protected visualizar(entrega: EntregaResponse): void {
    this.drawerAberto.set(true);
    this.carregandoDetalhe.set(true);

    this.entregaService.buscarPorId(entrega.id).pipe(
      finalize(() => this.carregandoDetalhe.set(false))
    ).subscribe({
      next: (detalhe) => this.entregaDetalhe.set(detalhe),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected fecharDetalhe(): void {
    this.drawerAberto.set(false);
    this.entregaDetalhe.set(null);
  }

  protected distribuir(entrega: EntregaResponse): void {
    const pedidoId = this.obterPedidoId(entrega);

    if (!pedidoId) {
      this.message.warning('Nao foi possivel identificar o pedido da entrega.');
      return;
    }

    this.executarAcao(entrega.id, 'Entrega distribuida com sucesso.', () =>
      this.entregaService.distribuirPedido(pedidoId)
    );
  }

  protected abrirAtribuicao(entrega: EntregaResponse): void {
    this.entregaAtribuicao.set(entrega);
    this.atribuicaoForm.reset({ entregadorId: entrega.entregador?.id ?? entrega.entregadorId ?? null });
    this.modalAtribuicaoAberto.set(true);
  }

  protected fecharAtribuicao(): void {
    this.modalAtribuicaoAberto.set(false);
    this.entregaAtribuicao.set(null);
    this.atribuicaoForm.reset({ entregadorId: null });
  }

  protected confirmarAtribuicao(): void {
    const entrega = this.entregaAtribuicao();
    const pedidoId = entrega ? this.obterPedidoId(entrega) : null;

    if (!entrega || !pedidoId) {
      this.message.warning('Nao foi possivel identificar o pedido da entrega.');
      return;
    }

    if (this.atribuicaoForm.invalid) {
      this.atribuicaoForm.markAllAsTouched();
      return;
    }

    const { entregadorId } = this.atribuicaoForm.getRawValue();

    if (!entregadorId) {
      return;
    }

    this.executarAcao(entrega.id, 'Entregador atribuido com sucesso.', () =>
      this.entregaService.atribuirPedido(pedidoId, { entregadorId })
    );
    this.fecharAtribuicao();
  }

  protected numeroPedido(entrega: EntregaResponse): number | string {
    return entrega.numeroPedido ?? this.obterPedidoId(entrega) ?? '-';
  }

  protected clienteNome(entrega: EntregaResponse): string {
    return entrega.cliente?.nome ?? this.pedidoCompleto(entrega)?.cliente?.nome ?? 'Nao informado';
  }

  protected entregadorNome(entrega: EntregaResponse): string {
    return entrega.entregador?.nome ?? 'Nao atribuido';
  }

  protected statusPedido(entrega: EntregaResponse): StatusPedido | null {
    return entrega.statusPedido ?? this.pedidoResumo(entrega)?.status ?? null;
  }

  protected statusPedidoTexto(status: StatusPedido | null): string {
    const labels: Record<StatusPedido, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmacao',
      CONFIRMADO: 'Confirmado',
      CONCLUIDO: 'Concluido',
      CANCELADO: 'Cancelado'
    };

    return status ? labels[status] : 'Nao informado';
  }

  protected statusEntregaTexto(status: StatusEntrega): string {
    const labels: Record<StatusEntrega, string> = {
      CRIADA: 'Criada',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Em rota',
      ENTREGUE: 'Entregue',
      RECUSADA: 'Recusada',
      CANCELADA: 'Cancelada'
    };

    return labels[status] ?? status;
  }

  protected corStatusEntrega(status: StatusEntrega): string {
    const cores: Record<StatusEntrega, string> = {
      CRIADA: 'default',
      ATRIBUIDA: 'processing',
      ACEITA: 'blue',
      EM_ROTA: 'warning',
      ENTREGUE: 'success',
      RECUSADA: 'error',
      CANCELADA: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected enderecoTexto(entrega: EntregaResponse): string {
    const endereco = entrega.enderecoEntrega ?? this.pedidoCompleto(entrega)?.enderecoEntrega;

    if (!endereco) {
      return 'Nao informado';
    }

    const complemento = endereco.complemento ? ` - ${endereco.complemento}` : '';
    return `${endereco.logradouro}, ${endereco.numero}${complemento} - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}`;
  }

  protected timeline(entrega: EntregaResponse): Array<{ titulo: string; data?: string | null; cor: string }> {
    return [
      { titulo: 'Criada', data: entrega.criadoEm, cor: 'gray' },
      { titulo: 'Atribuida', data: entrega.atribuidoEm, cor: 'blue' },
      { titulo: 'Aceita', data: entrega.aceitoEm, cor: 'green' },
      { titulo: 'Saiu para entrega', data: entrega.saiuParaEntregaEm, cor: 'orange' },
      { titulo: entrega.status === 'CANCELADA' ? 'Cancelada' : 'Entregue', data: entrega.canceladoEm ?? entrega.entregueEm, cor: entrega.status === 'CANCELADA' ? 'red' : 'green' }
    ];
  }

  private carregarEntregas(): void {
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.entregaService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'id',
      status: filtros.status ?? undefined,
      entregadorId: filtros.entregadorId ?? undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.entregas.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.entregas.set([]);
        this.total.set(0);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private executarAcao(entregaId: number, mensagemSucesso: string, operacao: () => ReturnType<EntregaService['distribuirPedido']>): void {
    this.processandoId.set(entregaId);

    operacao().pipe(
      finalize(() => this.processandoId.set(null))
    ).subscribe({
      next: (entregaAtualizada) => {
        this.entregas.update((entregas) =>
          entregas.map((entrega) => entrega.id === entregaAtualizada.id ? entregaAtualizada : entrega)
        );
        this.message.success(mensagemSucesso);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private obterPedidoId(entrega: EntregaResponse): number | null {
    return entrega.pedidoId ?? entrega.numeroPedido ?? entrega.pedido?.id ?? null;
  }

  private pedidoResumo(entrega: EntregaResponse): { status: StatusPedido } | null {
    return entrega.pedido && 'status' in entrega.pedido ? entrega.pedido : null;
  }

  private pedidoCompleto(entrega: EntregaResponse): import('../../../core/models/pedido.model').PedidoResponse | null {
    return entrega.pedido && 'itens' in entrega.pedido ? entrega.pedido : null;
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel concluir a operacao.';
    }

    return 'Nao foi possivel concluir a operacao.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
