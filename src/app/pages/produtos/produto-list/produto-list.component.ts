import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { CategoriaResponse } from '../../../core/models/categoria.model';
import { ProdutoResponse } from '../../../core/models/produto.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProdutoService } from '../../../core/services/produto.service';

@Component({
  selector: 'app-produto-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzDescriptionsModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule
  ],
  templateUrl: './produto-list.component.html',
  styleUrl: './produto-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProdutoListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly produtos = signal<ProdutoResponse[]>([]);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly produtoSelecionado = signal<ProdutoResponse | null>(null);
  protected readonly imagensInvalidas = signal<Set<number>>(new Set());
  protected readonly drawerAberto = signal(false);
  protected readonly carregando = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly excluindoId = signal<number | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly podeCriarProduto = computed(() => this.authService.possuiPermissao(PERMISSOES.PRODUTO_CRIAR));
  protected readonly podeEditarProduto = computed(() => this.authService.possuiPermissao(PERMISSOES.PRODUTO_EDITAR));
  protected readonly podeExcluirProduto = computed(() => this.authService.possuiPermissao(PERMISSOES.PRODUTO_DELETAR));

  protected readonly filtros = this.fb.group({
    nome: [''],
    categoriaId: this.fb.control<number | null>(null),
    quantidadeEstoque: this.fb.control<number | null>(null)
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

  alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarProdutos();
  }

  limparFiltros(): void {
    this.filtros.reset({
      nome: '',
      categoriaId: null,
      quantidadeEstoque: null
    });
  }

  visualizar(produto: ProdutoResponse): void {
    this.produtoSelecionado.set(produto);
    this.drawerAberto.set(true);
  }

  fecharDrawer(): void {
    this.drawerAberto.set(false);
    this.produtoSelecionado.set(null);
  }

  excluir(produto: ProdutoResponse): void {
    this.excluindoId.set(produto.id);

    this.produtoService.excluir(produto.id).pipe(
      finalize(() => this.excluindoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success('Produto excluido com sucesso.');
        this.carregarProdutos();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
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

  protected estoqueColor(produto: ProdutoResponse): string {
    return produto.quantidadeEstoque > 0 ? 'success' : 'default';
  }

  protected estoqueTexto(produto: ProdutoResponse): string {
    return produto.quantidadeEstoque > 0 ? `${produto.quantidadeEstoque} un.` : 'Sem estoque';
  }

  private carregarProdutos(): void {
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.produtoService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'id',
      nome: filtros.nome?.trim() || undefined,
      categoriaId: filtros.categoriaId ?? undefined,
      quantidadeEstoque: filtros.quantidadeEstoque ?? undefined
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
      next: (page) => this.categorias.set(page.content.filter((categoria) => categoria.ativo)),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
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
