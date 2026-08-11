import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NgxMaskDirective } from 'ngx-mask';

import { ProdutoCarrinho } from '../../core/models/carrinho.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PedidoResumoFinanceiroComponent } from '../../shared/components/pedido-resumo-financeiro/pedido-resumo-financeiro.component';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';
import { CheckoutFacade } from './checkout.facade';
import { IdentificacaoClienteComponent } from './components/identificacao-cliente/identificacao-cliente.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    TelefonePipe,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzCollapseModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    NgxMaskDirective,
    PageHeaderComponent,
    PedidoResumoFinanceiroComponent,
    IdentificacaoClienteComponent
  ],
  providers: [CheckoutFacade],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);

  protected readonly carrinhoService = inject(CarrinhoService);
  protected readonly checkout = inject(CheckoutFacade);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());

  ngOnInit(): void {
    const unidadeSlug = this.route.snapshot.paramMap.get('unidadeSlug');

    if (unidadeSlug) {
      this.carrinhoService.definirUnidadeSlug(unidadeSlug);
    } else if (this.carrinhoService.unidadeSlug()) {
      void this.router.navigate(this.carrinhoService.checkoutLink(), { replaceUrl: true });
      return;
    }

    if (this.carrinhoService.vazio()) {
      this.message.warning('Adicione produtos antes de finalizar o pedido.');
      void this.router.navigate(['/carrinho']);
      return;
    }

    this.checkout.inicializar(unidadeSlug);
  }

  protected finalizarPedido(): void {
    this.checkout.finalizarPedido();
  }

  protected subtotalItem(preco: number, quantidade: number): number {
    return Number(preco ?? 0) * quantidade;
  }

  protected precoItem(item: { valorUnitarioEstimado?: number; produto: ProdutoCarrinho }): number {
    return Number(item.valorUnitarioEstimado ?? item.produto.valorVenda ?? 0);
  }

  protected imagemPrincipal(produto: ProdutoCarrinho): string | null {
    if (this.imagensInvalidas().has(produto.id)) {
      return null;
    }

    return produto.imagemUrl ?? produto.arquivosUrl?.[0] ?? null;
  }

  protected marcarImagemInvalida(produtoId: number): void {
    this.imagensInvalidas.update((ids) => new Set(ids).add(produtoId));
  }
}
