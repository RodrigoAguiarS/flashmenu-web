import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { CategoriaResponse } from '../../core/models/categoria.model';
import { ProdutoResponse } from '../../core/models/produto.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { ProdutoService } from '../../core/services/produto.service';

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
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    NzTooltipModule
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogoComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly carrinhoService = inject(CarrinhoService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly produtos = signal<ProdutoResponse[]>([]);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly produtoSelecionado = signal<ProdutoResponse | null>(null);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly drawerAberto = signal(false);
  protected readonly quantidadeDetalhe = signal(1);
  protected readonly observacaoDetalhe = signal('');
  protected readonly carregando = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(12);
  protected readonly possuiProdutos = computed(() => this.produtos().length > 0);

  protected readonly filtros = this.fb.group({
    nome: [''],
    categoriaId: this.fb.control<number | null>(null)
  });

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarProdutos();

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
    this.quantidadeDetalhe.set(1);
    this.observacaoDetalhe.set('');
    this.drawerAberto.set(true);
  }

  fecharDetalhes(): void {
    this.drawerAberto.set(false);
    this.produtoSelecionado.set(null);
    this.quantidadeDetalhe.set(1);
    this.observacaoDetalhe.set('');
  }

  adicionarProduto(produto: ProdutoResponse, quantidade = 1, observacao?: string | null): void {
    if (!this.carrinhoService.possuiEstoque(produto)) {
      this.message.warning('Produto sem estoque disponivel.');
      return;
    }

    if (!this.carrinhoService.adicionar(produto, quantidade, observacao)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
      return;
    }

    this.message.success('Produto adicionado ao carrinho.');
  }

  alterarObservacaoDetalhe(observacao: string): void {
    this.observacaoDetalhe.set((observacao ?? '').substring(0, 255));
  }

  alterarQuantidadeDetalhe(quantidade: number | null): void {
    const produto = this.produtoSelecionado();
    const valor = Math.max(1, Math.trunc(quantidade ?? 1));
    const estoque = produto ? this.carrinhoService.quantidadeDisponivel(produto) : null;

    this.quantidadeDetalhe.set(estoque === null ? valor : Math.min(valor, estoque));
  }

  adicionarProdutoSelecionado(): void {
    const produto = this.produtoSelecionado();

    if (!produto) {
      return;
    }

    this.adicionarProduto(produto, this.quantidadeDetalhe(), this.observacaoDetalhe());
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
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.produtoService.listar({
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
        this.message.error(this.extrairMensagemErro(error));
      }
    });
  }

  private carregarCategorias(): void {
    this.carregandoCategorias.set(true);

    this.categoriaService.listar({ page: 0, size: 100, sort: 'nome' }).pipe(
      finalize(() => this.carregandoCategorias.set(false))
    ).subscribe({
      next: (page) => this.categorias.set(page.content),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
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
