import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { PedidoResponse, StatusPedido, TipoPedido } from '../../../core/models/pedido.model';
import { ProdutoResponse } from '../../../core/models/produto.model';
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
export class PedidoDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidoService = inject(PedidoService);
  private readonly produtoService = inject(ProdutoService);
  private readonly message = inject(NzMessageService);

  protected readonly carregando = signal(false);
  protected readonly exportandoPdf = signal(false);
  protected readonly pedido = signal<PedidoResponse | null>(null);
  protected readonly produtos = signal<Record<number, ProdutoResponse>>({});
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
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
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmacao',
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
