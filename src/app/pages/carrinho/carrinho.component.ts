import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ItemCarrinho, ProdutoCarrinho } from '../../core/models/carrinho.model';
import { GrupoComplementoResponse } from '../../core/models/complemento.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { GrupoComplementoService } from '../../core/services/grupo-complemento.service';
import {
  ProdutoPersonalizacaoComponent,
  ProdutoPersonalizacaoConfirmacao
} from '../../shared/components/produto-personalizacao/produto-personalizacao.component';

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
    NzDrawerModule,
    NzEmptyModule,
    NzIconModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzTagModule,
    ProdutoPersonalizacaoComponent
  ],
  templateUrl: './carrinho.component.html',
  styleUrl: './carrinho.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarrinhoComponent {
  protected readonly carrinhoService = inject(CarrinhoService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly grupoComplementoService = inject(GrupoComplementoService);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly itemEditando = signal<ItemCarrinho | null>(null);
  protected readonly gruposItemEditando = signal<GrupoComplementoResponse[]>([]);
  protected readonly drawerEdicaoAberto = signal(false);
  protected readonly carregandoComplementos = signal(false);

  incrementar(item: ItemCarrinho): void {
    if (!this.carrinhoService.incrementar(item.id)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
    }
  }

  decrementar(item: ItemCarrinho): void {
    if (!this.carrinhoService.decrementar(item.id)) {
      this.message.info('A quantidade minima e 1.');
    }
  }

  alterarQuantidade(item: ItemCarrinho, quantidade: number | null): void {
    if (!this.carrinhoService.definirQuantidade(item.id, quantidade ?? 1)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
    }
  }

  remover(item: ItemCarrinho): void {
    this.carrinhoService.remover(item.id);
    this.message.success('Produto removido do carrinho.');
  }

  editarPersonalizacao(item: ItemCarrinho): void {
    this.itemEditando.set(item);
    this.drawerEdicaoAberto.set(true);
    this.carregandoComplementos.set(true);

    this.grupoComplementoService.listarPorProduto(item.produto.id).pipe(
      finalize(() => this.carregandoComplementos.set(false))
    ).subscribe({
      next: (grupos) => this.gruposItemEditando.set(this.normalizarGrupos(grupos)),
      error: () => this.message.error('Nao foi possivel carregar os complementos do produto.')
    });
  }

  fecharEdicao(): void {
    this.drawerEdicaoAberto.set(false);
    this.itemEditando.set(null);
    this.gruposItemEditando.set([]);
  }

  confirmarEdicao(evento: ProdutoPersonalizacaoConfirmacao): void {
    const item = this.itemEditando();

    if (!item) {
      return;
    }

    if (!this.carrinhoService.atualizarConfiguracao(item.id, evento.complementos, evento.observacao, evento.quantidade)) {
      this.message.warning('Nao foi possivel atualizar a personalizacao com o estoque atual.');
      return;
    }

    this.message.success('Personalizacao atualizada.');
    this.fecharEdicao();
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
    return this.carrinhoService.obterPrecoItem(item) * item.quantidade;
  }

  protected precoItem(item: ItemCarrinho): number {
    return this.carrinhoService.obterPrecoItem(item);
  }

  protected estoqueMaximo(produto: ProdutoCarrinho): number {
    return this.carrinhoService.quantidadeDisponivel(produto) ?? 999;
  }

  private normalizarGrupos(grupos: GrupoComplementoResponse[]): GrupoComplementoResponse[] {
    return grupos
      .filter((grupo) => grupo.ativo)
      .map((grupo) => ({
        ...grupo,
        opcoes: [...(grupo.opcoes ?? [])].filter((opcao) => opcao.ativo)
      }));
  }
}
