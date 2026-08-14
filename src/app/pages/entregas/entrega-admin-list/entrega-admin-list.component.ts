import { CurrencyPipe, DatePipe } from '@angular/common';
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
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EntregaResponse, StatusEntrega } from '../../../core/models/entrega.model';
import { TipoFormaPagamento } from '../../../core/models/forma-pagamento.model';
import { StatusPagamento, StatusPedido } from '../../../core/models/pedido.model';
import { UsuarioResponse } from '../../../core/models/usuario.model';
import { AuthService } from '../../../core/services/auth.service';
import { EntregaService } from '../../../core/services/entrega.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { criarOpcoesTamanhoPagina } from '../../../shared/utils/pagination.util';

type StatusFiltroEntrega = StatusEntrega | null;

@Component({
  selector: 'app-entrega-admin-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    NzButtonModule,
    NzDescriptionsModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSpinModule,
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
  private readonly usuarioService = inject(UsuarioService);
  private readonly message = inject(NzMessageService);

  protected readonly entregas = signal<EntregaResponse[]>([]);
  protected readonly entregadores = signal<UsuarioResponse[]>([]);
  protected readonly entregaDetalhe = signal<EntregaResponse | null>(null);
  protected readonly entregaAtribuicao = signal<EntregaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly carregandoDetalhe = signal(false);
  protected readonly carregandoEntregadores = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly drawerAberto = signal(false);
  protected readonly modalAtribuicaoAberto = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = computed(() => criarOpcoesTamanhoPagina(this.total()));
  protected readonly possuiEntregas = computed(() => this.entregasOperacionais().length > 0);
  protected readonly podeAtribuirEntrega = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_ATRIBUIR));
  protected readonly entregasOperacionais = computed(() => {
    const termo = this.normalizarBusca(this.filtros.controls.busca.value);

    return [...this.entregas()]
      .filter((entrega) => this.entregaContemBusca(entrega, termo))
      .sort((a, b) => this.prioridadeOperacional(a) - this.prioridadeOperacional(b));
  });
  protected readonly indicadores = computed(() => {
    const entregas = this.entregas();
    const hoje = new Date().toDateString();

    return {
      semEntregador: entregas.filter((entrega) => this.semEntregador(entrega)).length,
      atribuidas: entregas.filter((entrega) => entrega.status === 'ATRIBUIDA').length,
      emRota: entregas.filter((entrega) => entrega.status === 'EM_ROTA').length,
      entreguesHoje: entregas.filter((entrega) => entrega.status === 'ENTREGUE' && this.mesmaData(entrega.entregueEm, hoje)).length
    };
  });
  protected readonly statusFiltros: Array<{ label: string; status: StatusFiltroEntrega }> = [
    { label: 'Todas', status: null },
    { label: 'Sem entregador', status: 'AGUARDANDO_ENTREGADOR' },
    { label: 'Atribuidas', status: 'ATRIBUIDA' },
    { label: 'Aceitas', status: 'ACEITA' },
    { label: 'Em rota', status: 'EM_ROTA' },
    { label: 'Entregues', status: 'ENTREGUE' },
    { label: 'Recusadas', status: 'RECUSADA' }
  ];

  protected readonly filtros = this.fb.group({
    busca: [''],
    status: this.fb.control<StatusFiltroEntrega>(null),
    entregadorId: this.fb.control<number | null>(null)
  });

  protected readonly atribuicaoForm = this.fb.group({
    entregadorId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)])
  });

  ngOnInit(): void {
    this.carregarEntregadores();
    this.carregarEntregas();
  }

  protected filtrar(): void {
    this.pageIndex.set(1);
    this.carregarEntregas();
  }

  protected limparFiltros(): void {
    this.filtros.reset({ busca: '', status: null, entregadorId: null });
    this.filtrar();
  }

  protected selecionarStatus(status: StatusFiltroEntrega): void {
    this.filtros.controls.status.setValue(status);
    this.filtrar();
  }

  protected filtroStatusAtivo(status: StatusFiltroEntrega): boolean {
    return this.filtros.controls.status.value === status;
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

  protected podeAtribuirAdministrativamente(entrega: EntregaResponse): boolean {
    return this.podeAtribuirEntrega()
      && entrega.status !== 'EM_ROTA'
      && entrega.status !== 'ENTREGUE'
      && entrega.status !== 'CANCELADA';
  }

  protected numeroPedido(entrega: EntregaResponse): number | string {
    return entrega.numeroPedido ?? this.obterPedidoId(entrega) ?? '-';
  }

  protected clienteNome(entrega: EntregaResponse): string {
    return entrega.cliente?.nome ?? this.pedidoCompleto(entrega)?.cliente?.nome ?? 'Nao informado';
  }

  protected entregadorNome(entrega: EntregaResponse): string {
    return entrega.entregador?.nome ?? 'Sem entregador';
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
      AGUARDANDO_ENTREGADOR: 'Sem entregador',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Em rota',
      ENTREGUE: 'Entregue',
      CANCELADA: 'Cancelada',
      RECUSADA: 'Recusada'
    };

    return labels[status] ?? status;
  }

  protected corStatusEntrega(status: StatusEntrega): string {
    const cores: Record<StatusEntrega, string> = {
      AGUARDANDO_ENTREGADOR: 'warning',
      ATRIBUIDA: 'processing',
      ACEITA: 'blue',
      EM_ROTA: 'warning',
      ENTREGUE: 'success',
      CANCELADA: 'error',
      RECUSADA: 'error'
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

  protected momentoStatus(entrega: EntregaResponse): string {
    const data = this.dataStatusAtual(entrega);

    if (!data) {
      return 'Sem horario';
    }

    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected resumoPendencia(entrega: EntregaResponse): string | null {
    if (this.semEntregador(entrega)) {
      return `Sem entregador ${this.tempoDesde(entrega.criadoEm)}`;
    }

    if (entrega.status === 'ATRIBUIDA') {
      return `Aguardando aceite ${this.tempoDesde(entrega.atribuidoEm)}`;
    }

    if (entrega.status === 'RECUSADA') {
      return 'Entrega recusada';
    }

    return null;
  }

  protected tipoFormaPagamentoTexto(tipo: TipoFormaPagamento | null | undefined): string {
    const labels: Record<string, string> = {
      PIX: 'Pix',
      DINHEIRO: 'Dinheiro',
      CARTAO_DEBITO: 'Cartao debito',
      CARTAO_CREDITO: 'Cartao credito'
    };

    return tipo ? labels[tipo] ?? tipo : 'Nao informado';
  }

  protected entregaEmDinheiro(entrega: EntregaResponse): boolean {
    return entrega.tipoFormaPagamento === 'DINHEIRO';
  }

  protected valorRecebidoTexto(entrega: EntregaResponse): string {
    return entrega.valorRecebido !== null && entrega.valorRecebido !== undefined
      ? this.formatarMoeda(entrega.valorRecebido)
      : 'Nao informado';
  }

  protected trocoTexto(entrega: EntregaResponse): string {
    return entrega.troco !== null && entrega.troco !== undefined
      ? this.formatarMoeda(entrega.troco)
      : 'Nao informado';
  }

  protected pagamentoOperacionalTexto(entrega: EntregaResponse): string {
    if (this.entregaEmDinheiro(entrega)) {
      const recebido = entrega.valorRecebido !== null && entrega.valorRecebido !== undefined
        ? `Recebido ${this.formatarMoeda(entrega.valorRecebido)}`
        : 'Dinheiro';
      const troco = entrega.troco !== null && entrega.troco !== undefined
        ? `Troco ${this.formatarMoeda(entrega.troco)}`
        : 'Troco nao informado';

      return `${recebido} · ${troco}`;
    }

    return `${this.tipoFormaPagamentoTexto(entrega.tipoFormaPagamento)} · ${this.statusPagamentoTexto(entrega.statusPagamento)}`;
  }

  protected statusPagamentoTexto(status: StatusPagamento | null | undefined): string {
    const labels: Record<StatusPagamento, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      EXPIRADO: 'Expirado',
      CANCELADO: 'Cancelado',
      ERRO: 'Erro'
    };

    return status ? labels[status] : 'Nao informado';
  }

  protected corStatusPagamento(status: StatusPagamento | null | undefined): string {
    const cores: Record<StatusPagamento, string> = {
      PENDENTE: 'warning',
      PAGO: 'success',
      EXPIRADO: 'default',
      CANCELADO: 'error',
      ERRO: 'error'
    };

    return status ? cores[status] : 'default';
  }

  protected timeline(entrega: EntregaResponse): Array<{ titulo: string; data?: string | null; cor: string }> {
    return [
      { titulo: 'Criada', data: entrega.criadoEm, cor: 'gray' },
      { titulo: 'Atribuida', data: entrega.atribuidoEm, cor: 'blue' },
      { titulo: 'Aceita', data: entrega.aceitoEm, cor: 'green' },
      { titulo: 'Em rota', data: entrega.saiuParaEntregaEm, cor: 'orange' },
      {
        titulo: entrega.status === 'RECUSADA' ? 'Recusada' : entrega.status === 'CANCELADA' ? 'Cancelada' : 'Entregue',
        data: entrega.status === 'RECUSADA' ? entrega.atualizadoEm : entrega.canceladoEm ?? entrega.entregueEm,
        cor: entrega.status === 'RECUSADA' || entrega.status === 'CANCELADA' ? 'red' : 'green'
      }
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

  private carregarEntregadores(): void {
    this.carregandoEntregadores.set(true);

    this.usuarioService.listar({ page: 0, size: 100, sort: 'nome', ativo: true }).pipe(
      finalize(() => this.carregandoEntregadores.set(false))
    ).subscribe({
      next: (page) => this.entregadores.set(page.content.filter((usuario) => this.usuarioEhEntregador(usuario))),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
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

  private prioridadeOperacional(entrega: EntregaResponse): number {
    const prioridades: Record<StatusEntrega, number> = {
      AGUARDANDO_ENTREGADOR: 0,
      RECUSADA: 1,
      ATRIBUIDA: 2,
      ACEITA: 3,
      EM_ROTA: 4,
      ENTREGUE: 5,
      CANCELADA: 6
    };

    return prioridades[entrega.status] ?? 99;
  }

  private semEntregador(entrega: EntregaResponse): boolean {
    return entrega.status === 'AGUARDANDO_ENTREGADOR' || !entrega.entregador;
  }

  private dataStatusAtual(entrega: EntregaResponse): string | null | undefined {
    const datas: Record<StatusEntrega, string | null | undefined> = {
      AGUARDANDO_ENTREGADOR: entrega.criadoEm,
      ATRIBUIDA: entrega.atribuidoEm,
      ACEITA: entrega.aceitoEm,
      EM_ROTA: entrega.saiuParaEntregaEm,
      ENTREGUE: entrega.entregueEm,
      CANCELADA: entrega.canceladoEm,
      RECUSADA: entrega.atualizadoEm ?? entrega.criadoEm
    };

    return datas[entrega.status];
  }

  private tempoDesde(data?: string | null): string {
    if (!data) {
      return '';
    }

    const minutos = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 60000));

    if (minutos < 1) {
      return 'agora';
    }

    if (minutos < 60) {
      return `ha ${minutos} min`;
    }

    return `ha ${Math.floor(minutos / 60)} h`;
  }

  private mesmaData(data: string | null | undefined, hoje: string): boolean {
    if (!data) {
      return false;
    }

    return new Date(data).toDateString() === hoje;
  }

  private entregaContemBusca(entrega: EntregaResponse, termo: string): boolean {
    if (!termo) {
      return true;
    }

    const valores = [
      String(this.numeroPedido(entrega)),
      this.clienteNome(entrega),
      this.enderecoTexto(entrega),
      this.entregadorNome(entrega)
    ].map((valor) => this.normalizarBusca(valor));

    return valores.some((valor) => valor.includes(termo));
  }

  private normalizarBusca(valor: string | null | undefined): string {
    return (valor ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  private usuarioEhEntregador(usuario: UsuarioResponse): boolean {
    return usuario.perfil?.permissoes.some((permissao) => permissao.authority === PERMISSOES.ENTREGA_ACEITAR) ?? false;
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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
