import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PedidoStatusNotificacao } from '../../../core/models/pedido-notificacao.model';
import { PedidoResponse, StatusEntregaPedido, StatusPagamento, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { ProdutoResponse } from '../../../core/models/produto.model';
import { AuthService } from '../../../core/services/auth.service';
import { PedidoNotificacaoService } from '../../../core/services/pedido-notificacao.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { ProdutoService } from '../../../core/services/produto.service';
import { salvarArquivo } from '../../../core/utils/download-file';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PedidoResumoFinanceiroComponent } from '../../../shared/components/pedido-resumo-financeiro/pedido-resumo-financeiro.component';

@Component({
  selector: 'app-pedido-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    NzButtonModule,
    NzEmptyModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    PageHeaderComponent,
    PedidoResumoFinanceiroComponent
  ],
  templateUrl: './pedido-detail.component.html',
  styleUrl: './pedido-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly pedidoService = inject(PedidoService);
  private readonly pedidoNotificacaoService = inject(PedidoNotificacaoService);
  private readonly produtoService = inject(ProdutoService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carregando = signal(false);
  protected readonly exportandoPdf = signal(false);
  protected readonly pedido = signal<PedidoResponse | null>(null);
  protected readonly produtos = signal<Record<number, ProdutoResponse>>({});
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly possuiPedido = computed(() => this.pedido() !== null);
  private notificacaoPedidoDestination: string | null = null;

  ngOnInit(): void {
    this.carregarPedido();
    this.configurarNotificacoes();
  }

  ngOnDestroy(): void {
    if (this.notificacaoPedidoDestination) {
      this.pedidoNotificacaoService.removerInscricao(this.notificacaoPedidoDestination);
    }
  }

  protected statusTexto(status: StatusPedido): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmacao',
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

  protected corStatusPedido(pedido: PedidoResponse): string {
    return this.pagamentoPixPendente(pedido) ? 'warning' : this.corStatus(pedido.status);
  }

  protected statusClasse(status: StatusPedido): string {
    const classes: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'aguardando',
      AGUARDANDO_CONFIRMACAO: 'aguardando',
      CONFIRMADO: 'confirmado',
      CONCLUIDO: 'concluido',
      CANCELADO: 'cancelado'
    };

    return classes[status] ?? 'neutro';
  }

  protected statusDescricao(pedido: PedidoResponse): string {
    if (pedido.status === 'CANCELADO') {
      return 'Este pedido foi cancelado.';
    }

    if (pedido.status === 'CONCLUIDO') {
      return 'Pedido concluido.';
    }

    if (this.pagamentoPixPendente(pedido)) {
      return 'Aguardando pagamento Pix.';
    }

    if (pedido.status === 'AGUARDANDO_PAGAMENTO') {
      return 'Seu pedido foi criado e aguarda pagamento.';
    }

    if (pedido.status === 'AGUARDANDO_CONFIRMACAO') {
      return this.pagamentoConfirmado(pedido) ? 'Pagamento pago. Aguardando confirmacao.' : 'Seu pedido foi enviado e aguarda confirmacao.';
    }

    return 'Pedido confirmado.';
  }

  protected entregaStatusTexto(status: StatusEntregaPedido): string {
    const labels: Record<StatusEntregaPedido, string> = {
      AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
      ATRIBUIDA: 'Atribuida',
      ACEITA: 'Aceita',
      EM_ROTA: 'Em rota',
      ENTREGUE: 'Entregue',
      CANCELADA: 'Cancelada',
      RECUSADA: 'Recusada'
    };

    return labels[status] ?? status;
  }

  protected entregaStatusCor(status: StatusEntregaPedido): string {
    const cores: Record<StatusEntregaPedido, string> = {
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

  protected entregaTimeline(pedido: PedidoResponse): Array<{ label: string; data: string | null | undefined }> {
    const entrega = pedido.entrega;

    if (!entrega) {
      return [];
    }

    return [
      { label: 'Atribuida', data: entrega.atribuidoEm },
      { label: 'Aceita pelo entregador', data: entrega.aceitoEm },
      { label: 'Saiu para entrega', data: entrega.saiuParaEntregaEm },
      { label: 'Entregue', data: entrega.entregueEm }
    ];
  }

  protected tipoTexto(tipo: TipoPedido | null): string {
    const labels: Record<string, string> = {
      DELIVERY: 'Delivery',
      PDV: 'Balcao'
    };

    return tipo ? labels[tipo] ?? tipo : 'Nao informado';
  }

  protected corTipo(tipo: TipoPedido | null): string {
    const cores: Record<string, string> = {
      DELIVERY: 'blue',
      PDV: 'purple'
    };

    return tipo ? cores[tipo] ?? 'default' : 'default';
  }

  protected tipoIcone(tipo: TipoPedido | null): string {
    return tipo === 'PDV' ? 'shop' : 'environment';
  }

  protected pagamentoStatusTexto(pedido: PedidoResponse): string {
    return this.pagamentoConfirmado(pedido) ? 'Pago' : 'Pendente';
  }

  protected pagamentoStatusClasse(pedido: PedidoResponse): string {
    return this.pagamentoConfirmado(pedido) ? 'concluido' : 'aguardando';
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

  protected itemPrecoUnitario(item: { valorUnitarioFinal?: number; precoUnitario: number }): number {
    return Number(item.valorUnitarioFinal ?? item.precoUnitario ?? 0);
  }

  protected itemPrecoBase(item: { valorProduto?: number; precoUnitario: number }): number {
    return Number(item.valorProduto ?? item.precoUnitario ?? 0);
  }

  protected produtoDetalhe(produtoId: number): ProdutoResponse | null {
    return this.produtos()[produtoId] ?? null;
  }

  protected imagemPrincipal(produto: ProdutoResponse): string | null {
    if (this.imagensInvalidas().has(produto.id)) {
      return null;
    }

    return produto.imagemUrl ?? produto.arquivosUrl?.[0] ?? null;
  }

  protected marcarImagemInvalida(produtoId: number): void {
    this.imagensInvalidas.update((ids) => new Set(ids).add(produtoId));
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

    this.pedidoService.buscarMeuPedido(id).pipe(
      switchMap((pedido) =>
        this.carregarProdutosPedido(pedido).pipe(
          map((produtos) => ({ pedido, produtos }))
        )
      ),
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: ({ pedido, produtos }) => {
        this.pedido.set(pedido);
        this.produtos.set(produtos);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private configurarNotificacoes(): void {
    const pedidoId = this.pedidoIdRota();

    if (!pedidoId) {
      return;
    }

    this.notificacaoPedidoDestination = `/topic/pedidos/${pedidoId}`;
    this.pedidoNotificacaoService.conectar(undefined, this.authService.obterToken());
    this.pedidoNotificacaoService.ouvirPedido(pedidoId);
    this.pedidoNotificacaoService.notificacoes$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((notificacao) => {
      if (notificacao.pedidoId !== pedidoId) {
        return;
      }

      this.processarNotificacaoPedido(notificacao);
    });
  }

  private processarNotificacaoPedido(notificacao: PedidoStatusNotificacao): void {
    const pedido = this.pedido();

    if (notificacao.mensagem) {
      this.message.info(notificacao.mensagem);
    }

    if (pedido) {
      this.pedido.set(this.aplicarNotificacaoPedido(pedido, notificacao));
    }

    this.carregarPedido();
  }

  private aplicarNotificacaoPedido(pedido: PedidoResponse, notificacao: PedidoStatusNotificacao): PedidoResponse {
    return {
      ...pedido,
      status: (notificacao.statusPedido ?? pedido.status) as StatusPedido,
      tipo: (notificacao.tipoPedido ?? pedido.tipo) as TipoPedido | null,
      pagamento: pedido.pagamento && notificacao.statusPagamento
        ? { ...pedido.pagamento, status: notificacao.statusPagamento as StatusPagamento }
        : pedido.pagamento,
      entrega: pedido.entrega && notificacao.statusEntrega
        ? { ...pedido.entrega, status: notificacao.statusEntrega as StatusEntregaPedido }
        : pedido.entrega
    };
  }

  private pedidoIdRota(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private carregarProdutosPedido(pedido: PedidoResponse) {
    const produtoIds = [...new Set(pedido.itens.map((item) => item.produtoId))];

    if (!produtoIds.length) {
      return of({});
    }

    return forkJoin(
      produtoIds.map((produtoId) =>
        this.produtoService.buscarPorId(produtoId).pipe(catchError(() => of(null)))
      )
    ).pipe(
      map((produtos) =>
        produtos.reduce<Record<number, ProdutoResponse>>((acc, produto) => {
          if (produto) {
            acc[produto.id] = produto;
          }

          return acc;
        }, {})
      )
    );
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
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
