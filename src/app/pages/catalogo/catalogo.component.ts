import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { CategoriaResponse } from '../../core/models/categoria.model';
import { GrupoComplementoResponse, ComplementoSelecionado } from '../../core/models/complemento.model';
import { ProdutoResponse } from '../../core/models/produto.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { AuthService } from '../../core/services/auth.service';
import { ProdutoService } from '../../core/services/produto.service';
import {
  ProdutoPersonalizacaoComponent,
  ProdutoPersonalizacaoConfirmacao
} from '../../shared/components/produto-personalizacao/produto-personalizacao.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CurrencyPipe,
    RouterLink,
    NzBadgeModule,
    NzButtonModule,
    NzCardModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzPaginationModule,
    NzResultModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    NzTooltipModule,
    ProdutoPersonalizacaoComponent,
    PageHeaderComponent
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogoComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly authService = inject(AuthService);
  private readonly carrinhoService = inject(CarrinhoService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly unidadeSlug = signal<string | null>(null);
  protected readonly produtos = signal<ProdutoResponse[]>([]);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly produtoSelecionado = signal<ProdutoResponse | null>(null);
  protected readonly gruposProdutoSelecionado = signal<GrupoComplementoResponse[]>([]);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly drawerAberto = signal(false);
  protected readonly carregandoComplementos = signal(false);
  protected readonly quantidadeDetalhe = signal(1);
  protected readonly observacaoDetalhe = signal('');
  protected readonly carregando = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(12);
  protected readonly possuiProdutos = computed(() => this.produtos().length > 0);
  protected readonly cardapioIndisponivel = signal(false);
  protected readonly mensagemCardapioIndisponivel = signal('Cardapio nao encontrado.');
  protected readonly tituloCatalogo = computed(() => this.unidadeSlug() ? 'Cardapio' : 'Catalogo');
  protected readonly descricaoCatalogo = computed(() =>
    this.unidadeSlug()
      ? 'Escolha os produtos desta unidade e monte seu pedido.'
      : 'Acesse o cardapio pelo link publico da unidade.'
  );

  protected readonly filtros = this.fb.group({
    nome: [''],
    categoriaId: this.fb.control<number | null>(null)
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = params.get('unidadeSlug');
        const produtoId = Number(params.get('produtoId'));

        if (!slug) {
          this.redirecionarParaUnidadeLogadaOuExibirErro();
          return;
        }

        this.unidadeSlug.set(slug);
        this.carrinhoService.definirUnidadeSlug(slug);
        this.cardapioIndisponivel.set(false);
        this.pageIndex.set(1);
        this.carregarCategorias();
        this.carregarProdutos();

        if (Number.isFinite(produtoId) && produtoId > 0) {
          this.carregarProdutoPublico(produtoId, true);
        }
      });

    this.filtros.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pageIndex.set(1);
        this.carregarProdutos();
      });
  }

  alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarProdutos();
  }

  limparFiltros(): void {
    this.filtros.reset({
      nome: '',
      categoriaId: null
    });
  }

  abrirDetalhes(produto: ProdutoResponse): void {
    this.produtoSelecionado.set(produto);
    this.gruposProdutoSelecionado.set([]);
    this.quantidadeDetalhe.set(1);
    this.observacaoDetalhe.set('');
    this.drawerAberto.set(true);
    this.carregarComplementosProduto(produto);
  }

  fecharDetalhes(): void {
    this.drawerAberto.set(false);
    this.produtoSelecionado.set(null);
    this.gruposProdutoSelecionado.set([]);
    this.quantidadeDetalhe.set(1);
    this.observacaoDetalhe.set('');
  }

  adicionarProduto(
    produto: ProdutoResponse,
    quantidade = 1,
    observacao?: string | null,
    complementos: ComplementoSelecionado[] = []
  ): void {
    if (!this.carrinhoService.possuiEstoque(produto)) {
      this.message.warning('Produto sem estoque disponivel.');
      return;
    }

    if (!this.carrinhoService.adicionar(produto, quantidade, observacao, complementos)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
      return;
    }

    this.message.success('Produto adicionado ao carrinho.');
    this.fecharDetalhes();
  }

  adicionarOuPersonalizar(produto: ProdutoResponse): void {
    if (!this.carrinhoService.possuiEstoque(produto)) {
      this.message.warning('Produto sem estoque disponivel.');
      return;
    }

    this.carregarProdutoPublico(produto.id, false, true);
  }

  confirmarPersonalizacao(evento: ProdutoPersonalizacaoConfirmacao): void {
    const produto = this.produtoSelecionado();

    if (!produto) {
      return;
    }

    this.adicionarProduto(produto, evento.quantidade, evento.observacao, evento.complementos);
  }

  adicionarProdutoSimplesSelecionado(): void {
    const produto = this.produtoSelecionado();

    if (!produto) {
      return;
    }

    this.adicionarProduto(produto, this.quantidadeDetalhe(), this.observacaoDetalhe());
  }

  alterarQuantidadeDetalhe(quantidade: number | null): void {
    const produto = this.produtoSelecionado();
    const valor = Math.max(1, Math.trunc(quantidade ?? 1));
    const estoque = produto ? this.carrinhoService.quantidadeDisponivel(produto) : null;

    this.quantidadeDetalhe.set(estoque === null ? valor : Math.min(valor, estoque));
  }

  alterarObservacaoDetalhe(observacao: string): void {
    this.observacaoDetalhe.set((observacao ?? '').substring(0, 255));
  }

  marcarImagemInvalida(produtoId: number): void {
    this.imagensInvalidas.update((ids) => new Set(ids).add(produtoId));
  }

  protected imagemPrincipal(produto: ProdutoResponse): string | null {
    if (this.imagensInvalidas().has(produto.id)) {
      return null;
    }

    return produto.imagemUrl ?? produto.arquivosUrl?.[0] ?? null;
  }

  protected estoqueTexto(produto: ProdutoResponse): string {
    const estoque = this.carrinhoService.quantidadeDisponivel(produto);

    if (estoque === null) {
      return 'Disponivel';
    }

    return estoque > 0 ? `${estoque} em estoque` : 'Sem estoque';
  }

  protected preco(produto: ProdutoResponse): number {
    return this.carrinhoService.obterPreco(produto);
  }

  protected estoqueMaximo(produto: ProdutoResponse): number {
    return this.carrinhoService.quantidadeDisponivel(produto) ?? 999;
  }

  protected podeAdicionar(produto: ProdutoResponse): boolean {
    return this.carrinhoService.possuiEstoque(produto);
  }

  private carregarProdutos(): void {
    const slug = this.unidadeSlug();

    if (!slug) {
      this.produtos.set([]);
      this.total.set(0);
      return;
    }

    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.produtoService.listarPublicoPorUnidade(slug, {
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'nome',
      nome: filtros.nome?.trim() || undefined,
      categoriaId: filtros.categoriaId ?? undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.produtos.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.produtos.set([]);
        this.total.set(0);
        this.tratarErroCardapio(error);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private carregarCategorias(): void {
    const slug = this.unidadeSlug();

    if (!slug) {
      this.categorias.set([]);
      return;
    }

    this.carregandoCategorias.set(true);

    this.categoriaService.listarPublicoPorUnidade(slug, { page: 0, size: 100, sort: 'nome' }).pipe(
      finalize(() => this.carregandoCategorias.set(false))
    ).subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: (error: HttpErrorResponse) => {
        this.categorias.set([]);
        this.tratarErroCardapio(error);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private carregarComplementosProduto(produto: ProdutoResponse): void {
    this.carregarProdutoPublico(produto.id, true);
  }

  private carregarProdutoPublico(produtoId: number, abrirDrawer: boolean, adicionarAoCarrinho = false): void {
    const slug = this.unidadeSlug();

    if (!slug) {
      this.message.warning('Acesse o cardapio pelo link da unidade.');
      return;
    }

    this.carregandoComplementos.set(true);
    this.gruposProdutoSelecionado.set([]);

    this.produtoService.buscarPublicoPorUnidade(slug, produtoId).pipe(
      finalize(() => this.carregandoComplementos.set(false))
    ).subscribe({
      next: (produto) => {
        const gruposAtivos = this.normalizarGrupos(produto.gruposComplementos ?? []);

        if (adicionarAoCarrinho && !gruposAtivos.length) {
          this.adicionarProduto(produto);
          return;
        }

        this.produtoSelecionado.set(produto);
        this.gruposProdutoSelecionado.set(gruposAtivos);
        this.quantidadeDetalhe.set(1);
        this.observacaoDetalhe.set('');

        if (abrirDrawer || gruposAtivos.length) {
          this.drawerAberto.set(true);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.tratarErroCardapio(error);
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private redirecionarParaUnidadeLogadaOuExibirErro(): void {
    const slug = this.authService.obterUsuarioAtual()?.unidade?.slug ?? this.carrinhoService.unidadeSlug();

    if (slug) {
      void this.router.navigate(['/cardapio', slug], { replaceUrl: true });
      return;
    }

    this.carrinhoService.limparContextoUnidade();
    this.unidadeSlug.set(null);
    this.produtos.set([]);
    this.categorias.set([]);
    this.total.set(0);
    this.cardapioIndisponivel.set(true);
    this.mensagemCardapioIndisponivel.set('Acesse o cardapio pelo link publico da unidade.');
  }

  private tratarErroCardapio(error: HttpErrorResponse): void {
    if (error.status === 404 || error.status === 410) {
      this.cardapioIndisponivel.set(true);
      this.mensagemCardapioIndisponivel.set('Unidade nao encontrada ou cardapio indisponivel.');
    }
  }

  private normalizarGrupos(grupos: GrupoComplementoResponse[]): GrupoComplementoResponse[] {
    return grupos
      .filter((grupo) => grupo.ativo)
      .map((grupo) => ({
        ...grupo,
        opcoes: [...(grupo.opcoes ?? [])].filter((opcao) => opcao.ativo)
      }));
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel carregar o catalogo.';
    }

    return 'Nao foi possivel carregar o catalogo.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
