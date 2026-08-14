import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { EntregaResponse, StatusEntrega } from '../../../core/models/entrega.model';
import { TipoFormaPagamento } from '../../../core/models/forma-pagamento.model';
import { StatusPagamento } from '../../../core/models/pedido.model';
import { AuthService } from '../../../core/services/auth.service';
import { EntregaService } from '../../../core/services/entrega.service';

type StatusFiltroEntrega = StatusEntrega | null;

@Component({
  selector: 'app-minhas-entregas',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSkeletonModule,
    NzTagModule
  ],
  templateUrl: './minhas-entregas.component.html',
  styleUrl: './minhas-entregas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MinhasEntregasComponent implements OnInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly entregaService = inject(EntregaService);
  private readonly message = inject(NzMessageService);

  protected readonly entregas = signal<EntregaResponse[]>([]);
  protected readonly statusSelecionado = signal<StatusFiltroEntrega>(null);
  protected readonly entregaConclusao = signal<EntregaResponse | null>(null);
  protected readonly entregaRecusa = signal<EntregaResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly carregandoMais = signal(false);
  protected readonly processandoId = signal<number | null>(null);
  protected readonly erroCarregamento = signal<string | null>(null);
  protected readonly online = signal(this.obterStatusOnline());
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly total = signal(0);
  protected readonly ultimaPagina = signal(true);
  protected readonly possuiEntregas = computed(() => this.entregas().length > 0);
  protected readonly podeCarregarMais = computed(() => this.possuiEntregas() && !this.ultimaPagina());
  protected readonly podeAceitar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_ACEITAR));
  protected readonly podeRecusar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_RECUSAR));
  protected readonly podeIniciar = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_INICIAR));
  protected readonly podeConcluir = computed(() => this.authService.possuiPermissao(PERMISSOES.ENTREGA_CONCLUIR));
  protected readonly skeletonCards = [1, 2, 3];
  protected readonly statusFiltros: Array<{ label: string; status: StatusFiltroEntrega }> = [
    { label: 'Todas', status: null },
    { label: 'Atribuidas', status: 'ATRIBUIDA' },
    { label: 'Aceitas', status: 'ACEITA' },
    { label: 'Em rota', status: 'EM_ROTA' },
    { label: 'Entregues', status: 'ENTREGUE' },
    { label: 'Recusadas', status: 'RECUSADA' }
  ];

  protected readonly recusaForm = this.fb.group({
    observacao: ['']
  });

  private readonly marcarOnline = (): void => this.online.set(true);
  private readonly marcarOffline = (): void => this.online.set(false);

  ngOnInit(): void {
    window.addEventListener('online', this.marcarOnline);
    window.addEventListener('offline', this.marcarOffline);
    this.carregarEntregas(true);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.marcarOnline);
    window.removeEventListener('offline', this.marcarOffline);
  }

  protected selecionarStatus(status: StatusFiltroEntrega): void {
    if (this.statusSelecionado() === status && this.possuiEntregas()) {
      return;
    }

    this.statusSelecionado.set(status);
    this.carregarEntregas(true);
  }

  protected filtroAtivo(status: StatusFiltroEntrega): boolean {
    return this.statusSelecionado() === status;
  }

  protected tentarNovamente(): void {
    this.carregarEntregas(true);
  }

  protected carregarMais(): void {
    if (this.carregandoMais() || this.ultimaPagina()) {
      return;
    }

    this.carregarEntregas(false);
  }

  protected aceitar(entrega: EntregaResponse): void {
    if (!this.podeExecutarAcao()) {
      return;
    }

    this.executarAcao(entrega.id, 'Entrega aceita.', () => this.entregaService.aceitar(entrega.id));
  }

  protected iniciar(entrega: EntregaResponse): void {
    if (!this.podeExecutarAcao()) {
      return;
    }

    this.executarAcao(entrega.id, 'Rota iniciada.', () => this.entregaService.iniciar(entrega.id));
  }

  protected abrirConfirmacaoConclusao(entrega: EntregaResponse): void {
    if (!this.podeExecutarAcao()) {
      return;
    }

    this.entregaConclusao.set(entrega);
  }

  protected fecharConfirmacaoConclusao(): void {
    this.entregaConclusao.set(null);
  }

  protected confirmarConclusao(): void {
    const entrega = this.entregaConclusao();

    if (!entrega || !this.podeExecutarAcao()) {
      return;
    }

    this.executarAcao(entrega.id, 'Entrega concluida.', () => this.entregaService.concluir(entrega.id));
    this.fecharConfirmacaoConclusao();
  }

  protected abrirRecusa(entrega: EntregaResponse): void {
    if (!this.podeExecutarAcao()) {
      return;
    }

    this.entregaRecusa.set(entrega);
    this.recusaForm.reset({ observacao: '' });
  }

  protected fecharRecusa(): void {
    this.entregaRecusa.set(null);
    this.recusaForm.reset({ observacao: '' });
  }

  protected confirmarRecusa(): void {
    const entrega = this.entregaRecusa();

    if (!entrega || !this.podeExecutarAcao()) {
      return;
    }

    const observacao = this.recusaForm.controls.observacao.value.trim();
    this.executarAcao(entrega.id, 'Entrega recusada.', () =>
      this.entregaService.recusar(entrega.id, { observacao: observacao || null })
    );
    this.fecharRecusa();
  }

  protected abrirRota(entrega: EntregaResponse): void {
    const endereco = this.enderecoBusca(entrega);

    if (!endereco) {
      this.message.warning('Endereco nao informado para esta entrega.');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank', 'noopener');
  }

  protected podeAceitarEntrega(entrega: EntregaResponse): boolean {
    return this.podeAceitar() && entrega.status === 'ATRIBUIDA';
  }

  protected podeRecusarEntrega(entrega: EntregaResponse): boolean {
    return this.podeRecusar() && (entrega.status === 'ATRIBUIDA' || entrega.status === 'ACEITA');
  }

  protected podeIniciarEntrega(entrega: EntregaResponse): boolean {
    return this.podeIniciar() && entrega.status === 'ACEITA';
  }

  protected podeConcluirEntrega(entrega: EntregaResponse): boolean {
    return this.podeConcluir() && entrega.status === 'EM_ROTA';
  }

  protected numeroPedido(entrega: EntregaResponse): number | string {
    return entrega.numeroPedido ?? entrega.pedidoId ?? entrega.pedido?.id ?? '-';
  }

  protected clienteNome(entrega: EntregaResponse): string {
    const pedidoCliente = entrega.pedido && 'cliente' in entrega.pedido ? entrega.pedido.cliente?.nome : null;
    return entrega.cliente?.nome ?? pedidoCliente ?? 'Cliente nao informado';
  }

  protected enderecoLinhaPrincipal(entrega: EntregaResponse): string {
    const endereco = this.endereco(entrega);

    if (!endereco) {
      return 'Endereco nao informado';
    }

    return `${endereco.logradouro}, ${endereco.numero}`;
  }

  protected enderecoLinhaSecundaria(entrega: EntregaResponse): string {
    const endereco = this.endereco(entrega);

    if (!endereco) {
      return '';
    }

    const complemento = endereco.complemento ? `${endereco.complemento} · ` : '';
    return `${complemento}${endereco.bairro} · ${endereco.cidade}/${endereco.estado}`;
  }

  protected valorTotal(entrega: EntregaResponse): number | null {
    const valorPedido = entrega.pedido && 'valorTotal' in entrega.pedido ? entrega.pedido.valorTotal : null;
    return entrega.valorTotal ?? valorPedido ?? null;
  }

  protected tipoFormaPagamento(entrega: EntregaResponse): TipoFormaPagamento | null {
    const tipoPedido = entrega.pedido && 'formaPagamento' in entrega.pedido ? entrega.pedido.formaPagamento?.tipo : null;
    return entrega.tipoFormaPagamento ?? tipoPedido ?? null;
  }

  protected statusPagamento(entrega: EntregaResponse): StatusPagamento | null {
    const statusPedido = entrega.pedido && 'pagamento' in entrega.pedido ? entrega.pedido.pagamento?.status : null;
    return entrega.statusPagamento ?? statusPedido ?? null;
  }

  protected pagamentoResumo(entrega: EntregaResponse): string {
    const tipo = this.tipoFormaPagamento(entrega);
    const status = this.statusPagamento(entrega);

    if (tipo === 'DINHEIRO') {
      const recebido = entrega.valorRecebido !== null && entrega.valorRecebido !== undefined
        ? `Recebido ${this.formatarMoeda(entrega.valorRecebido)}`
        : status === 'PAGO'
          ? 'Dinheiro pago'
          : 'Receber dinheiro';
      const troco = entrega.troco !== null && entrega.troco !== undefined
        ? `Troco ${this.formatarMoeda(entrega.troco)}`
        : null;

      return troco ? `${recebido} - ${troco}` : recebido;
    }

    return `${this.tipoFormaPagamentoTexto(tipo)} - ${this.statusPagamentoTexto(status)}`;
  }

  protected tipoFormaPagamentoTexto(tipo: TipoFormaPagamento | null): string {
    const labels: Record<string, string> = {
      PIX: 'Pix',
      DINHEIRO: 'Dinheiro',
      CARTAO_DEBITO: 'Cartao',
      CARTAO_CREDITO: 'Cartao'
    };

    return tipo ? labels[tipo] ?? tipo : 'Pagamento';
  }

  protected statusPagamentoTexto(status: StatusPagamento | null): string {
    const labels: Record<StatusPagamento, string> = {
      PENDENTE: 'Pendente',
      PAGO: 'Pago',
      EXPIRADO: 'Expirado',
      CANCELADO: 'Cancelado',
      ERRO: 'Erro'
    };

    return status ? labels[status] : 'Nao informado';
  }

  protected corStatusPagamento(status: StatusPagamento | null): string {
    const cores: Record<StatusPagamento, string> = {
      PENDENTE: 'warning',
      PAGO: 'success',
      EXPIRADO: 'default',
      CANCELADO: 'error',
      ERRO: 'error'
    };

    return status ? cores[status] : 'default';
  }

  protected statusEntregaTexto(status: StatusEntrega): string {
    const labels: Record<StatusEntrega, string> = {
      AGUARDANDO_ENTREGADOR: 'Aguardando',
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
      AGUARDANDO_ENTREGADOR: 'default',
      ATRIBUIDA: 'processing',
      ACEITA: 'blue',
      EM_ROTA: 'warning',
      ENTREGUE: 'success',
      CANCELADA: 'error',
      RECUSADA: 'error'
    };

    return cores[status] ?? 'default';
  }

  protected textoMomentoStatus(entrega: EntregaResponse): string {
    const labels: Record<StatusEntrega, string> = {
      AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Saiu',
      ENTREGUE: 'Entregue',
      CANCELADA: 'Cancelada',
      RECUSADA: 'Recusada'
    };

    return labels[entrega.status] ?? 'Atualizada';
  }

  protected dataStatusAtual(entrega: EntregaResponse): string | null | undefined {
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

  protected textoAcaoPrincipal(entrega: EntregaResponse): string {
    const labels: Partial<Record<StatusEntrega, string>> = {
      ATRIBUIDA: 'Aceitar entrega',
      ACEITA: 'Iniciar entrega',
      EM_ROTA: 'Confirmar entrega',
      ENTREGUE: 'Ver detalhes',
      RECUSADA: 'Ver detalhes',
      CANCELADA: 'Ver detalhes'
    };

    return labels[entrega.status] ?? 'Ver detalhes';
  }

  protected executarAcaoPrincipal(entrega: EntregaResponse): void {
    if (this.podeAceitarEntrega(entrega)) {
      this.aceitar(entrega);
      return;
    }

    if (this.podeIniciarEntrega(entrega)) {
      this.iniciar(entrega);
      return;
    }

    if (this.podeConcluirEntrega(entrega)) {
      this.abrirConfirmacaoConclusao(entrega);
    }
  }

  private carregarEntregas(reset: boolean): void {
    if (!this.online()) {
      this.erroCarregamento.set('Voce esta offline. Verifique sua conexao e tente novamente.');
      return;
    }

    const proximaPagina = reset ? 0 : this.pageIndex() + 1;
    this.erroCarregamento.set(null);

    if (reset) {
      this.carregando.set(true);
    } else {
      this.carregandoMais.set(true);
    }

    this.entregaService.listarMinhas({
      page: proximaPagina,
      size: this.pageSize(),
      sort: 'id',
      status: this.statusSelecionado() ?? undefined
    }).pipe(
      finalize(() => {
        this.carregando.set(false);
        this.carregandoMais.set(false);
      })
    ).subscribe({
      next: (page) => {
        this.pageIndex.set(page.number);
        this.total.set(page.totalElements);
        this.ultimaPagina.set(page.last);
        this.entregas.set(reset ? page.content : [...this.entregas(), ...page.content]);
      },
      error: (error: HttpErrorResponse) => {
        if (reset) {
          this.entregas.set([]);
          this.total.set(0);
          this.ultimaPagina.set(true);
        }
        this.erroCarregamento.set(this.extrairMensagemErro(error));
      }
    });
  }

  private executarAcao(entregaId: number, mensagemSucesso: string, operacao: () => ReturnType<EntregaService['aceitar']>): void {
    this.processandoId.set(entregaId);

    operacao().pipe(
      finalize(() => this.processandoId.set(null))
    ).subscribe({
      next: (entregaAtualizada) => {
        this.sincronizarEntrega(entregaAtualizada);
        this.message.success(mensagemSucesso);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private sincronizarEntrega(entregaAtualizada: EntregaResponse): void {
    const statusFiltro = this.statusSelecionado();

    if (statusFiltro && entregaAtualizada.status !== statusFiltro) {
      this.entregas.update((entregas) => entregas.filter((entrega) => entrega.id !== entregaAtualizada.id));
      this.total.update((total) => Math.max(0, total - 1));
      return;
    }

    this.entregas.update((entregas) =>
      entregas.map((entrega) => entrega.id === entregaAtualizada.id ? entregaAtualizada : entrega)
    );
  }

  private podeExecutarAcao(): boolean {
    if (!this.online()) {
      this.message.warning('Voce esta offline. A acao nao foi enviada.');
      return false;
    }

    return true;
  }

  private endereco(entrega: EntregaResponse): EntregaResponse['enderecoEntrega'] {
    const enderecoPedido = entrega.pedido && 'enderecoEntrega' in entrega.pedido ? entrega.pedido.enderecoEntrega : null;
    return entrega.enderecoEntrega ?? enderecoPedido ?? null;
  }

  private enderecoBusca(entrega: EntregaResponse): string | null {
    const endereco = this.endereco(entrega);

    if (!endereco) {
      return null;
    }

    const complemento = endereco.complemento ? ` ${endereco.complemento}` : '';
    return `${endereco.logradouro}, ${endereco.numero}${complemento}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.estado}`;
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  private obterStatusOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar suas entregas.';
    }

    return 'Nao foi possivel carregar suas entregas.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
