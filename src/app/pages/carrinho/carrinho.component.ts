import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { ItemCarrinho, ProdutoCarrinho } from '../../core/models/carrinho.model';
import { GrupoComplementoResponse } from '../../core/models/complemento.model';
import { ConfiguracaoComercialResponse } from '../../core/models/configuracao-comercial.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { ConfiguracaoComercialService } from '../../core/services/configuracao-comercial.service';
import { GrupoComplementoService } from '../../core/services/grupo-complemento.service';
import { PedidoFinanceiroService } from '../../core/services/pedido-financeiro.service';
import { ProdutoService } from '../../core/services/produto.service';
import {
  ProdutoPersonalizacaoComponent,
  ProdutoPersonalizacaoConfirmacao
} from '../../shared/components/produto-personalizacao/produto-personalizacao.component';

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [
    CurrencyPipe,
    RouterLink,
    NzButtonModule,
    NzCardModule,
    NzDrawerModule,
    NzEmptyModule,
    NzIconModule,
    NzPopconfirmModule,
    ProdutoPersonalizacaoComponent
  ],
  templateUrl: './carrinho.component.html',
  styleUrl: './carrinho.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarrinhoComponent implements OnInit {
  protected readonly carrinhoService = inject(CarrinhoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);
  private readonly grupoComplementoService = inject(GrupoComplementoService);
  private readonly configuracaoComercialService = inject(ConfiguracaoComercialService);
  private readonly pedidoFinanceiroService = inject(PedidoFinanceiroService);
  private readonly produtoService = inject(ProdutoService);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly itemEditando = signal<ItemCarrinho | null>(null);
  protected readonly gruposItemEditando = signal<GrupoComplementoResponse[]>([]);
  protected readonly drawerEdicaoAberto = signal(false);
  protected readonly carregandoComplementos = signal(false);
  protected readonly configuracaoComercial = signal<ConfiguracaoComercialResponse | null>(null);
  protected readonly resumoFinanceiro = computed(() =>
    this.pedidoFinanceiroService.calcularPrevia(
      this.carrinhoService.valorTotal(),
      this.configuracaoComercial()?.percentualDescontoPadrao,
      this.configuracaoComercial()?.valorTaxaFixa,
      0
    )
  );
  protected readonly totalPrevisto = computed(() => this.resumoFinanceiro().valorTotal);

  ngOnInit(): void {
    const unidadeSlug = this.route.snapshot.paramMap.get('unidadeSlug');

    if (unidadeSlug) {
      this.carrinhoService.definirUnidadeSlug(unidadeSlug);
    }

    this.carregarConfiguracaoComercial();
  }

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

    const slug = this.carrinhoService.unidadeSlug();
    const operacao$: Observable<ProdutoCarrinhoComComplementos | GrupoComplementoResponse[]> = slug
      ? this.produtoService.buscarPublicoPorUnidade(slug, item.produto.id)
      : this.grupoComplementoService.listarPorProduto(item.produto.id);

    operacao$.pipe(
      finalize(() => this.carregandoComplementos.set(false))
    ).subscribe({
      next: (resultado) => {
        const grupos = Array.isArray(resultado) ? resultado : resultado.gruposComplementos ?? [];
        this.gruposItemEditando.set(this.normalizarGrupos(grupos));
      },
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

    void this.router.navigate(this.carrinhoService.checkoutLink());
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

  protected possuiValor(valor: number | null | undefined): boolean {
    return Math.abs(Number(valor ?? 0)) > 0.0001;
  }

  protected possuiPersonalizacao(item: ItemCarrinho): boolean {
    return !!item.observacao || !!item.complementos?.length;
  }

  protected descricaoCurta(produto: ProdutoCarrinho): string {
    return produto.descricao?.trim() || 'Sem descricao.';
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

  private carregarConfiguracaoComercial(): void {
    this.configuracaoComercialService.buscar().subscribe({
      next: (configuracao) => this.configuracaoComercial.set(configuracao),
      error: () => this.configuracaoComercial.set(null)
    });
  }
}

type ProdutoCarrinhoComComplementos = ProdutoCarrinho & {
  gruposComplementos?: GrupoComplementoResponse[];
};
