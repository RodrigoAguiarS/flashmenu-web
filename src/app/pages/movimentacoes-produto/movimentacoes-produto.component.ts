import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
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
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { PERMISSOES } from '../../core/auth/permissoes';
import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { MovimentacaoProdutoResponse, TipoMovimentacaoProduto } from '../../core/models/movimentacao-produto.model';
import { ProdutoResponse } from '../../core/models/produto.model';
import { AuthService } from '../../core/services/auth.service';
import { MovimentacaoProdutoService } from '../../core/services/movimentacao-produto.service';
import { ProdutoService } from '../../core/services/produto.service';
import { salvarArquivo } from '../../core/utils/download-file';

@Component({
  selector: 'app-movimentacoes-produto',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzPaginationModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule
  ],
  templateUrl: './movimentacoes-produto.component.html',
  styleUrl: './movimentacoes-produto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovimentacoesProdutoComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly produtoService = inject(ProdutoService);
  private readonly movimentacaoProdutoService = inject(MovimentacaoProdutoService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly produtos = signal<ProdutoResponse[]>([]);
  protected readonly movimentacoes = signal<MovimentacaoProdutoResponse[]>([]);
  protected readonly carregandoProdutos = signal(false);
  protected readonly carregandoMovimentacoes = signal(false);
  protected readonly salvandoEntrada = signal(false);
  protected readonly salvandoAjuste = signal(false);
  protected readonly exportandoAuditoriaProduto = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly produtoSelecionadoId = signal<number | null>(null);
  protected readonly tipoSelecionado = signal<TipoMovimentacaoProduto | null>(null);

  protected readonly tiposMovimentacao: TipoMovimentacaoProduto[] = ['ENTRADA', 'SAIDA', 'ESTORNO', 'AJUSTE'];
  protected readonly podeListarMovimentacoes = computed(() =>
    this.authService.possuiAlgumaPermissao([PERMISSOES.MOVIMENTACAO_LISTAR, PERMISSOES.PRODUTO_LISTAR])
  );
  protected readonly podeCriarMovimentacao = computed(() =>
    this.authService.possuiAlgumaPermissao([PERMISSOES.MOVIMENTACAO_CRIAR, PERMISSOES.PRODUTO_EDITAR])
  );
  protected readonly produtoSelecionado = computed(() => {
    const produtoId = this.produtoSelecionadoId();
    return this.produtos().find((produto) => produto.id === produtoId) ?? null;
  });
  protected readonly possuiProdutoSelecionado = computed(() => this.produtoSelecionadoId() !== null);
  protected readonly ultimaMovimentacao = computed(() => this.movimentacoes()[0] ?? null);
  protected readonly tipoAuditoriaTexto = computed(() => {
    const tipo = this.tipoSelecionado();
    return tipo ? this.tipoTexto(tipo) : 'Todos os tipos';
  });

  protected readonly filtroForm = this.fb.group({
    produtoId: this.fb.control<number | null>(null, [Validators.required]),
    tipo: this.fb.control<TipoMovimentacaoProduto | null>(null)
  });

  protected readonly entradaForm = this.fb.group({
    quantidade: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    observacao: ['', [Validators.maxLength(255)]]
  });

  protected readonly ajusteForm = this.fb.group({
    quantidadeEstoque: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    observacao: ['', [Validators.maxLength(255)]]
  });

  ngOnInit(): void {
    this.carregarProdutos();

    this.filtroForm.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        const filtros = this.filtroForm.getRawValue();
        this.produtoSelecionadoId.set(filtros.produtoId);
        this.tipoSelecionado.set(filtros.tipo);
        this.pageIndex.set(1);
        this.carregarMovimentacoes();
      });
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarMovimentacoes();
  }

  protected alterarTamanhoPagina(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.pageIndex.set(1);
    this.carregarMovimentacoes();
  }

  protected limparFiltroTipo(): void {
    this.filtroForm.controls.tipo.setValue(null);
  }

  protected registrarEntrada(): void {
    if (!this.podeCriarMovimentacao()) {
      this.message.warning('Seu usuario nao possui permissao para movimentar estoque.');
      return;
    }

    const produto = this.produtoSelecionado();

    if (!produto || this.entradaForm.invalid) {
      this.entradaForm.markAllAsTouched();
      this.filtroForm.controls.produtoId.markAsTouched();
      return;
    }

    const valor = this.entradaForm.getRawValue();
    this.salvandoEntrada.set(true);

    this.movimentacaoProdutoService.registrarEntrada(produto.id, {
      quantidade: valor.quantidade ?? 0,
      observacao: valor.observacao.trim() || null
    }).pipe(
      finalize(() => this.salvandoEntrada.set(false))
    ).subscribe({
      next: (movimentacao) => {
        this.message.success('Entrada registrada com sucesso.');
        this.entradaForm.reset({ quantidade: null, observacao: '' });
        this.atualizarSaldoProduto(movimentacao);
        this.carregarMovimentacoes();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected registrarAjuste(): void {
    if (!this.podeCriarMovimentacao()) {
      this.message.warning('Seu usuario nao possui permissao para movimentar estoque.');
      return;
    }

    const produto = this.produtoSelecionado();

    if (!produto || this.ajusteForm.invalid) {
      this.ajusteForm.markAllAsTouched();
      this.filtroForm.controls.produtoId.markAsTouched();
      return;
    }

    const valor = this.ajusteForm.getRawValue();
    this.salvandoAjuste.set(true);

    this.movimentacaoProdutoService.registrarAjuste(produto.id, {
      quantidadeEstoque: valor.quantidadeEstoque ?? 0,
      observacao: valor.observacao.trim() || null
    }).pipe(
      finalize(() => this.salvandoAjuste.set(false))
    ).subscribe({
      next: (movimentacao) => {
        this.message.success('Ajuste registrado com sucesso.');
        this.ajusteForm.reset({ quantidadeEstoque: null, observacao: '' });
        this.atualizarSaldoProduto(movimentacao);
        this.carregarMovimentacoes();
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected tipoTexto(tipo: TipoMovimentacaoProduto): string {
    const labels: Record<TipoMovimentacaoProduto, string> = {
      ENTRADA: 'Entrada',
      SAIDA: 'Saida',
      ESTORNO: 'Estorno',
      AJUSTE: 'Ajuste'
    };

    return labels[tipo];
  }

  protected tipoCor(tipo: TipoMovimentacaoProduto): string {
    const cores: Record<TipoMovimentacaoProduto, string> = {
      ENTRADA: 'success',
      SAIDA: 'error',
      ESTORNO: 'processing',
      AJUSTE: 'warning'
    };

    return cores[tipo];
  }

  protected diferencaSaldo(movimentacao: MovimentacaoProdutoResponse): string {
    const diferenca = movimentacao.saldoPosterior - movimentacao.saldoAnterior;
    return `${diferenca > 0 ? '+' : ''}${diferenca}`;
  }

  protected exportarAuditoriaProduto(): void {
    const filtros = this.filtroForm.getRawValue();

    if (!filtros.produtoId || !this.podeListarMovimentacoes()) {
      this.filtroForm.controls.produtoId.markAsTouched();
      return;
    }

    this.exportandoAuditoriaProduto.set(true);

    this.movimentacaoProdutoService.exportarAuditoriaProdutoPdf(filtros.produtoId, filtros.tipo).pipe(
      finalize(() => this.exportandoAuditoriaProduto.set(false))
    ).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, `auditoria-movimentacoes-produto-${filtros.produtoId}.pdf`),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  private carregarProdutos(): void {
    this.carregandoProdutos.set(true);
    this.mensagemErro.set(null);

    this.produtoService.listar({ page: 0, size: 100, sort: 'nome' }).pipe(
      finalize(() => this.carregandoProdutos.set(false))
    ).subscribe({
      next: (page) => this.produtos.set(page.content),
      error: (error: HttpErrorResponse) => {
        this.produtos.set([]);
        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  private carregarMovimentacoes(): void {
    const filtros = this.filtroForm.getRawValue();

    if (!filtros.produtoId || !this.podeListarMovimentacoes()) {
      this.movimentacoes.set([]);
      this.total.set(0);
      return;
    }

    this.carregandoMovimentacoes.set(true);
    this.mensagemErro.set(null);

    this.movimentacaoProdutoService.listarPorProduto(filtros.produtoId, {
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      tipo: filtros.tipo
    }).pipe(
      finalize(() => this.carregandoMovimentacoes.set(false))
    ).subscribe({
      next: (page) => {
        this.movimentacoes.set(page.content);
        this.total.set(page.totalElements);
      },
      error: (error: HttpErrorResponse) => {
        this.movimentacoes.set([]);
        this.total.set(0);
        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  private atualizarSaldoProduto(movimentacao: MovimentacaoProdutoResponse): void {
    this.produtos.update((produtos) =>
      produtos.map((produto) =>
        produto.id === movimentacao.produtoId
          ? { ...produto, quantidadeEstoque: movimentacao.saldoPosterior }
          : produto
      )
    );
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
