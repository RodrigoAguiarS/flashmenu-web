import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ItemCarrinho, ProdutoCarrinho } from '../../core/models/carrinho.model';
import { CarrinhoService } from '../../core/services/carrinho.service';

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    RouterLink,
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzEmptyModule,
    NzIconModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzTagModule
  ],
  templateUrl: './carrinho.component.html',
  styleUrl: './carrinho.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarrinhoComponent {
  protected readonly carrinhoService = inject(CarrinhoService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());

  incrementar(item: ItemCarrinho): void {
    if (!this.carrinhoService.incrementar(item.produto.id)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
    }
  }

  decrementar(item: ItemCarrinho): void {
    if (!this.carrinhoService.decrementar(item.produto.id)) {
      this.message.info('A quantidade minima e 1.');
    }
  }

  alterarQuantidade(item: ItemCarrinho, quantidade: number | null): void {
    if (!this.carrinhoService.definirQuantidade(item.produto.id, quantidade ?? 1)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
    }
  }

  remover(item: ItemCarrinho): void {
    this.carrinhoService.remover(item.produto.id);
    this.message.success('Produto removido do carrinho.');
  }

  limpar(): void {
    this.carrinhoService.limpar();
    this.message.success('Carrinho limpo.');
  }

  finalizar(): void {
    if (this.carrinhoService.vazio()) {
      this.message.warning('Adicione produtos antes de finalizar o pedido.');
      return;
    }

    void this.router.navigate(['/checkout']);
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

  protected preco(produto: ProdutoCarrinho): number {
    return this.carrinhoService.obterPreco(produto);
  }

  protected subtotal(item: ItemCarrinho): number {
    return this.preco(item.produto) * item.quantidade;
  }

  protected estoqueMaximo(produto: ProdutoCarrinho): number {
    return this.carrinhoService.quantidadeDisponivel(produto) ?? 999;
  }
}
