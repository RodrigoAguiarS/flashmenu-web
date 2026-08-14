import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule } from 'ng-zorro-antd/modal';
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
import { EntregaService } from '../../../core/services/entrega.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { salvarArquivo } from '../../../core/utils/download-file';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { criarOpcoesTamanhoPagina } from '../../../shared/utils/pagination.util';

type StatusFiltroOperacional = StatusPedido | null;

interface PedidoOperacionalView {
  pedido: PedidoResponse;
  quantidadeItens: number;
  statusTexto: string;
  statusClasse: string;
  tipoTexto: string;
  tempoRelativo: string;
  formaPagamentoTexto: string;
  pagamentoStatusTexto: string;
  pagamentoStatusClasse: string;
  novo: boolean;
  atrasado: boolean;
  acaoPrincipal: 'confirmar-pagamento' | 'concluir-pedido' | 'ver-pedido' | 'aguardar-pagamento' | null;
  acaoPrincipalLabel: string | null;
}

@Component({
  selector: 'app-pedido-admin-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzDropdownModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputNumberModule,
    NzMenuModule,
    NzModalModule,
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
  private readonly entregaService = inject(EntregaService);
  private readonly authService = inject(AuthService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly entregaProcessandoId = signal<number | null>(null);
  protected readonly pdfProcessandoId = signal<number | null>(null);
  protected readonly pedidoAtribuicao = signal<PedidoResponse | null>(null);
  protected readonly modalAtribuicaoAberto = signal(false);
  protected readonly filtrosAvancadosAbertos = signal(false);
  protected readonly pedidos = signal<PedidoResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly possuiPedidos = computed(() => this.pedidos().length > 0);
  protected readonly pageSizeOptions = computed(() => criarOpcoesTamanhoPagina(this.total()));
  protected readonly pedidosOperacionais = computed(() =>
    this.pedidos().map((pedido) => this.criarPedidoOperacional(pedido))
  );
  protected readonly resumoOperacional = computed(() => {
    const pedidos = this.pedidos();

    return {
      novos: pedidos.filter((pedido) => pedido.status === 'AGUARDANDO_CONFIRMACAO').length,
      aguardandoPagamento: pedidos.filter((pedido) => this.pagamentoPixPendente(pedido) || pedido.status === 'AGUARDANDO_PAGAMENTO').length,
      confirmados: pedidos.filter((pedido) => pedido.status === 'CONFIRMADO').length,
      concluidos: pedidos.filter((pedido) => pedido.status === 'CONCLUIDO').length,
      cancelados: pedidos.filter((pedido) => pedido.status === 'CANCELADO').length,
      vendas: pedidos
        .filter((pedido) => this.pedidoFaturavel(pedido))
        .reduce((total, pedido) => total + pedido.valorTotal, 0)
    };
  });
  protected readonly podeCancelarPedido = computed(() => this.authService.possuiPermissao(PERMISSOES.PEDIDO_CANCELAR));
  protected readonly podeConfirmarPagamento = computed(() => this.authService.possuiPermissao(PERMISSOES.PAGAMENTO_CONFIRMAR));
  protected readonly podeAlterarStatusPedido = computed(() => this.authService.possuiPermissao(PERMISSOES.PEDIDO_ALTERAR_STATUS));
  protected readonly podeAtribuirEntrega = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_ATRIBUIR));
  protected readonly tipoOptions: TipoPedido[] = ['DELIVERY', 'PDV'];
  protected readonly statusFiltros: Array<{ label: string; status: StatusFiltroOperacional; contador: () => number }> = [
    { label: 'Todos', status: null, contador: () => this.total() },
    { label: 'Novos', status: 'AGUARDANDO_CONFIRMACAO', contador: () => this.resumoOperacional().novos },
    { label: 'Aguardando pagamento', status: 'AGUARDANDO_PAGAMENTO', contador: () => this.resumoOperacional().aguardandoPagamento },
    { label: 'Confirmados', status: 'CONFIRMADO', contador: () => this.resumoOperacional().confirmados },
    { label: 'Concluidos', status: 'CONCLUIDO', contador: () => this.resumoOperacional().concluidos },
    { label: 'Cancelados', status: 'CANCELADO', contador: () => this.resumoOperacional().cancelados }
  ];

  protected readonly filtros = this.fb.group({
    id: this.fb.control<number | null>(null),
    usuarioId: this.fb.control<number | null>(null),
    status: this.fb.control<StatusPedido | null>(null),
    tipo: this.fb.control<TipoPedido | null>(null)
  });

  protected readonly atribuicaoEntregaForm = this.fb.group({
    entregadorId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)])
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

  protected selecionarStatus(status: StatusFiltroOperacional): void {
    this.filtros.controls.status.setValue(status);
    this.filtrar();
  }

  protected filtroStatusAtivo(status: StatusFiltroOperacional): boolean {
    return this.filtros.controls.status.value === status;
  }

  protected alternarFiltrosAvancados(): void {
    this.filtrosAvancadosAbertos.update((aberto) => !aberto);
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarPedidos();
  }

  protected alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
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

  protected concluirPedido(pedido: PedidoResponse): void {
    this.executarAcao(pedido.id, 'Pedido concluido com sucesso.', () =>
      this.pedidoService.concluirPedido(pedido.id)
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

  protected podeGerenciarEntrega(pedido: PedidoResponse): boolean {
    return this.podeAtribuirEntrega() && pedido.tipo === 'DELIVERY' && pedido.status === 'CONFIRMADO';
  }

  protected distribuirEntrega(pedido: PedidoResponse): void {
    if (!this.podeGerenciarEntrega(pedido)) {
      return;
    }

    this.entregaProcessandoId.set(pedido.id);

    this.entregaService.distribuirPedido(pedido.id).pipe(
      finalize(() => this.entregaProcessandoId.set(null))
    ).subscribe({
      next: () => this.message.success('Entrega distribuida com sucesso.'),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected abrirAtribuicaoEntrega(pedido: PedidoResponse): void {
    if (!this.podeGerenciarEntrega(pedido)) {
      return;
    }

    this.pedidoAtribuicao.set(pedido);
    this.atribuicaoEntregaForm.reset({ entregadorId: null });
    this.modalAtribuicaoAberto.set(true);
  }

  protected fecharAtribuicaoEntrega(): void {
    this.modalAtribuicaoAberto.set(false);
    this.pedidoAtribuicao.set(null);
    this.atribuicaoEntregaForm.reset({ entregadorId: null });
  }

  protected confirmarAtribuicaoEntrega(): void {
    const pedido = this.pedidoAtribuicao();

    if (!pedido) {
      return;
    }

    if (this.atribuicaoEntregaForm.invalid) {
      this.atribuicaoEntregaForm.markAllAsTouched();
      return;
    }

    const { entregadorId } = this.atribuicaoEntregaForm.getRawValue();

    if (!entregadorId) {
      return;
    }

    this.entregaProcessandoId.set(pedido.id);

    this.entregaService.atribuirPedido(pedido.id, { entregadorId }).pipe(
      finalize(() => this.entregaProcessandoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success('Entregador atribuido com sucesso.');
        this.fecharAtribuicaoEntrega();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected podeExecutarConfirmacao(pedido: PedidoResponse): boolean {
    return this.podeConfirmarPagamento()
      && pedido.status !== 'CONFIRMADO'
      && pedido.status !== 'CONCLUIDO'
      && pedido.status !== 'CANCELADO'
      && pedido.formaPagamento.tipo !== 'PIX'
      && !this.pagamentoConfirmado(pedido);
  }

  protected podeExecutarConclusao(pedido: PedidoResponse): boolean {
    return this.podeAlterarStatusPedido() && pedido.status === 'CONFIRMADO';
  }

  protected podeExecutarCancelamento(pedido: PedidoResponse): boolean {
    return this.podeCancelarPedido() && pedido.status !== 'CONCLUIDO' && pedido.status !== 'CANCELADO';
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

  private criarPedidoOperacional(pedido: PedidoResponse): PedidoOperacionalView {
    const pagamentoConfirmado = this.pagamentoConfirmado(pedido);
    const pagamentoPixPendente = this.pagamentoPixPendente(pedido);
    const minutos = this.minutosDesdeCriacao(pedido.dataCriacao);

    return {
      pedido,
      quantidadeItens: pedido.itens.reduce((total, item) => total + item.quantidade, 0),
      statusTexto: pagamentoPixPendente ? 'Aguardando pagamento' : this.statusTexto(pedido.status),
      statusClasse: this.statusClasse(pedido, pagamentoPixPendente),
      tipoTexto: this.tipoTexto(pedido.tipo),
      tempoRelativo: this.tempoRelativo(pedido.dataCriacao),
      formaPagamentoTexto: pedido.formaPagamento.nome,
      pagamentoStatusTexto: pagamentoConfirmado ? 'Pago' : 'Pendente',
      pagamentoStatusClasse: pagamentoConfirmado ? 'pagamento-pago' : 'pagamento-pendente',
      novo: minutos <= 10 && !this.pedidoTerminal(pedido),
      atrasado: minutos >= 45 && !this.pedidoTerminal(pedido),
      acaoPrincipal: this.acaoPrincipal(pedido),
      acaoPrincipalLabel: this.acaoPrincipalLabel(pedido)
    };
  }

  private acaoPrincipal(pedido: PedidoResponse): PedidoOperacionalView['acaoPrincipal'] {
    if (this.podeExecutarConfirmacao(pedido)) {
      return 'confirmar-pagamento';
    }

    if (this.pagamentoPixPendente(pedido)) {
      return 'aguardar-pagamento';
    }

    if (this.podeExecutarConclusao(pedido)) {
      return 'concluir-pedido';
    }

    if (pedido.status === 'CONFIRMADO') {
      return 'ver-pedido';
    }

    return null;
  }

  private acaoPrincipalLabel(pedido: PedidoResponse): string | null {
    const acao = this.acaoPrincipal(pedido);
    const labels: Record<NonNullable<PedidoOperacionalView['acaoPrincipal']>, string> = {
      'confirmar-pagamento': 'Confirmar pagamento',
      'concluir-pedido': 'Concluir pedido',
      'ver-pedido': 'Ver pedido',
      'aguardar-pagamento': 'Aguardando pagamento'
    };

    return acao ? labels[acao] : null;
  }

  private statusClasse(pedido: PedidoResponse, pagamentoPixPendente: boolean): string {
    if (pagamentoPixPendente || pedido.status === 'AGUARDANDO_PAGAMENTO') {
      return 'status-pagamento';
    }

    const classes: Record<StatusPedido, string> = {
      AGUARDANDO_PAGAMENTO: 'status-pagamento',
      AGUARDANDO_CONFIRMACAO: 'status-confirmacao',
      CONFIRMADO: 'status-confirmado',
      CONCLUIDO: 'status-concluido',
      CANCELADO: 'status-cancelado'
    };

    return classes[pedido.status];
  }

  private tempoRelativo(data: string): string {
    const minutos = this.minutosDesdeCriacao(data);

    if (minutos < 1) {
      return 'agora';
    }

    if (minutos < 60) {
      return `ha ${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);

    if (horas < 24) {
      return `ha ${horas} h`;
    }

    const dias = Math.floor(horas / 24);
    return `ha ${dias} d`;
  }

  private minutosDesdeCriacao(data: string): number {
    const criadoEm = new Date(data).getTime();

    if (Number.isNaN(criadoEm)) {
      return 0;
    }

    return Math.max(0, Math.floor((Date.now() - criadoEm) / 60000));
  }

  private pagamentoConfirmado(pedido: PedidoResponse): boolean {
    return pedido.pagamento?.status === 'PAGO' || !!pedido.pagamento?.confirmadoEm;
  }

  private pagamentoPixPendente(pedido: PedidoResponse): boolean {
    return pedido.formaPagamento.tipo === 'PIX'
      && !this.pagamentoConfirmado(pedido)
      && !this.pedidoTerminal(pedido);
  }

  private pedidoTerminal(pedido: PedidoResponse): boolean {
    return pedido.status === 'CONCLUIDO' || pedido.status === 'CANCELADO';
  }

  private pedidoFaturavel(pedido: PedidoResponse): boolean {
    return pedido.status === 'CONFIRMADO' || pedido.status === 'CONCLUIDO';
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
