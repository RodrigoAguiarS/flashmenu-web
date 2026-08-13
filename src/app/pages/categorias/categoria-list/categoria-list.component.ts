import { DatePipe } from '@angular/common';
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
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { PERMISSOES } from '../../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../../core/models/api-error.model';
import { CategoriaResponse } from '../../../core/models/categoria.model';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriaService } from '../../../core/services/categoria.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { criarOpcoesTamanhoPagina } from '../../../shared/utils/pagination.util';

@Component({
  selector: 'app-categoria-list',
  standalone: true,
  imports: [
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
    NzPaginationModule,
    NzPopconfirmModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
    PageHeaderComponent
  ],
  templateUrl: './categoria-list.component.html',
  styleUrl: './categoria-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriaListComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly categoriaSelecionada = signal<CategoriaResponse | null>(null);
  protected readonly drawerAberto = signal(false);
  protected readonly carregando = signal(false);
  protected readonly excluindoId = signal<number | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = computed(() => criarOpcoesTamanhoPagina(this.total()));
  protected readonly podeCriarCategoria = computed(() => this.authService.possuiPermissao(PERMISSOES.CATEGORIA_CRIAR));
  protected readonly podeEditarCategoria = computed(() => this.authService.possuiPermissao(PERMISSOES.CATEGORIA_EDITAR));
  protected readonly podeExcluirCategoria = computed(() => this.authService.possuiPermissao(PERMISSOES.CATEGORIA_DELETAR));

  protected readonly filtros = this.fb.group({
    nome: [''],
    descricao: ['']
  });

  ngOnInit(): void {
    this.carregarCategorias();

    this.filtros.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.pageIndex.set(1);
        this.carregarCategorias();
      });
  }

  alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarCategorias();
  }

  alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarCategorias();
  }

  limparFiltros(): void {
    this.filtros.reset({
      nome: '',
      descricao: ''
    });
  }

  visualizar(categoria: CategoriaResponse): void {
    this.categoriaSelecionada.set(categoria);
    this.drawerAberto.set(true);
  }

  fecharDrawer(): void {
    this.drawerAberto.set(false);
    this.categoriaSelecionada.set(null);
  }

  excluir(categoria: CategoriaResponse): void {
    this.excluindoId.set(categoria.id);

    this.categoriaService.excluir(categoria.id).pipe(
      finalize(() => this.excluindoId.set(null))
    ).subscribe({
      next: () => {
        this.message.success('Categoria excluida com sucesso.');
        this.carregarCategorias();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected statusColor(categoria: CategoriaResponse): string {
    return categoria.ativo ? 'success' : 'default';
  }

  protected statusTexto(categoria: CategoriaResponse): string {
    return categoria.ativo ? 'Ativa' : 'Inativa';
  }

  private carregarCategorias(): void {
    const filtros = this.filtros.getRawValue();
    this.carregando.set(true);

    this.categoriaService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'nome',
      nome: filtros.nome?.trim() || undefined,
      descricao: filtros.descricao?.trim() || undefined
    }).pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (page) => {
        this.categorias.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.categorias.set([]);
        this.total.set(0);
        this.message.error(this.extrairMensagemErro(error));
      }
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
