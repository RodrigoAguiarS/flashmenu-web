import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
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
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NgxMaskDirective } from 'ngx-mask';

import { ItemCarrinho, ProdutoCarrinho } from '../../core/models/carrinho.model';
import { CategoriaResponse } from '../../core/models/categoria.model';
import { GrupoComplementoResponse } from '../../core/models/complemento.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { PedidoRequest } from '../../core/models/pedido.model';
import { ProdutoResponse } from '../../core/models/produto.model';
import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { CategoriaService } from '../../core/services/categoria.service';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { GrupoComplementoService } from '../../core/services/grupo-complemento.service';
import { PdvService } from '../../core/services/pdv.service';
import { PedidoService } from '../../core/services/pedido.service';
import { ProdutoService } from '../../core/services/produto.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  ProdutoPersonalizacaoComponent,
  ProdutoPersonalizacaoConfirmacao
} from '../../shared/components/produto-personalizacao/produto-personalizacao.component';

@Component({
  selector: 'app-pdv',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzDividerModule,
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
    NzSpinModule,
    NzTagModule,
    NzTooltipModule,
    NgxMaskDirective,
    ProdutoPersonalizacaoComponent,
    PageHeaderComponent
  ],
  templateUrl: './pdv.component.html',
  styleUrl: './pdv.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdvComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly grupoComplementoService = inject(GrupoComplementoService);
  private readonly formaPagamentoService = inject(FormaPagamentoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pdvService = inject(PdvService);
  protected readonly produtos = signal<ProdutoResponse[]>([]);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly formasPagamento = signal<FormaPagamentoResponse[]>([]);
  protected readonly formaPagamentoId = signal<number | null>(null);
  protected readonly valorRecebidoDinheiro = signal<number | null>(null);
  protected readonly imagensInvalidas = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly produtoPersonalizacao = signal<ProdutoResponse | ProdutoCarrinho | null>(null);
  protected readonly itemEditando = signal<ItemCarrinho | null>(null);
  protected readonly gruposPersonalizacao = signal<GrupoComplementoResponse[]>([]);
  protected readonly drawerPersonalizacaoAberto = signal(false);
  protected readonly carregandoComplementos = signal(false);
  protected readonly carregandoProdutos = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly carregandoPagamento = signal(false);
  protected readonly finalizando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(12);
  protected readonly possuiProdutos = computed(() => this.produtos().length > 0);
  protected readonly tituloDrawerPersonalizacao = computed(() =>
    this.itemEditando() ? 'Editar adicionais' : 'Personalizar produto'
  );
  protected readonly textoConfirmarPersonalizacao = computed(() =>
    this.itemEditando() ? 'Salvar adicionais' : 'Adicionar a venda'
  );
  protected readonly formaPagamentoSelecionada = computed(() => {
    const formaPagamentoId = this.formaPagamentoId();
    return this.formasPagamento().find((forma) => forma.id === formaPagamentoId) ?? null;
  });
  protected readonly percentualAcrescimo = computed(() => Number(this.formaPagamentoSelecionada()?.percentualAcrescimo ?? 0));
  protected readonly valorAcrescimo = computed(() => this.pdvService.valorTotal() * (this.percentualAcrescimo() / 100));
  protected readonly totalPrevisto = computed(() => this.pdvService.valorTotal() + this.valorAcrescimo());
  protected readonly pagamentoEmDinheiro = computed(() => this.formaPagamentoSelecionada()?.tipo === 'DINHEIRO');
  protected readonly troco = computed(() => {
    const valorRecebido = Number(this.valorRecebidoDinheiro() ?? 0);
    return Math.max(valorRecebido - this.totalPrevisto(), 0);
  });
  protected readonly valorRecebidoInsuficiente = computed(() =>
    this.pagamentoEmDinheiro() &&
    this.valorRecebidoDinheiro() !== null &&
    Number(this.valorRecebidoDinheiro()) < this.totalPrevisto()
  );

  protected readonly filtros = this.fb.group({
    nome: [''],
    categoriaId: this.fb.control<number | null>(null)
  });

  protected readonly formulario = this.fb.group({
    formaPagamentoId: this.fb.control<number | null>(null, [Validators.required]),
    valorRecebidoDinheiro: this.fb.control<number | null>(null)
  });

  private readonly validarPagamentoDinheiro = effect(() => {
    this.totalPrevisto();
    this.atualizarValidacaoValorRecebido();
  });

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarFormasPagamento();
    this.carregarProdutos();

    this.filtros.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((anterior, atual) => JSON.stringify(anterior) === JSON.stringify(atual)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.pageIndex.set(1);
      this.carregarProdutos();
    });

    this.formulario.controls.formaPagamentoId.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((formaPagamentoId) => {
      this.formaPagamentoId.set(formaPagamentoId);

      if (!this.pagamentoEmDinheiro()) {
        this.formulario.controls.valorRecebidoDinheiro.setValue(null);
      }

      this.atualizarValidacaoValorRecebido();
    });

    this.formulario.controls.valorRecebidoDinheiro.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((valorRecebido) => this.valorRecebidoDinheiro.set(valorRecebido));
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarProdutos();
  }

  protected limparFiltros(): void {
    this.filtros.reset({ nome: '', categoriaId: null });
  }

  protected adicionarProduto(produto: ProdutoResponse): void {
    if (!this.pdvService.possuiEstoque(produto)) {
      this.message.warning('Produto sem estoque disponivel.');
      return;
    }

    this.carregandoComplementos.set(true);
    this.grupoComplementoService.listarPorProduto(produto.id).pipe(
      finalize(() => this.carregandoComplementos.set(false))
    ).subscribe({
      next: (grupos) => {
        const gruposAtivos = this.normalizarGrupos(grupos);

        if (!gruposAtivos.length) {
          this.adicionarProdutoConfigurado(produto, { quantidade: 1, observacao: null, complementos: [], valorEstimado: produto.valorVenda });
          return;
        }

        this.itemEditando.set(null);
        this.produtoPersonalizacao.set(produto);
        this.gruposPersonalizacao.set(gruposAtivos);
        this.drawerPersonalizacaoAberto.set(true);
      },
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected confirmarPersonalizacao(evento: ProdutoPersonalizacaoConfirmacao): void {
    const item = this.itemEditando();

    if (item) {
      if (!this.pdvService.atualizarConfiguracao(item.id, evento.complementos, evento.quantidade)) {
        this.message.warning('Nao foi possivel atualizar os adicionais com o estoque atual.');
        return;
      }

      this.message.success('Adicionais atualizados.');
      this.fecharPersonalizacao();
      return;
    }

    const produto = this.produtoPersonalizacao();

    if (!produto) {
      return;
    }

    this.adicionarProdutoConfigurado(produto, evento);
    this.fecharPersonalizacao();
  }

  protected fecharPersonalizacao(): void {
    this.drawerPersonalizacaoAberto.set(false);
    this.produtoPersonalizacao.set(null);
    this.itemEditando.set(null);
    this.gruposPersonalizacao.set([]);
  }

  protected incrementar(item: ItemCarrinho): void {
    if (!this.pdvService.incrementar(item.id)) {
      this.message.warning('Quantidade maior que o estoque disponivel.');
    }
  }

  protected decrementar(item: ItemCarrinho): void {
    if (!this.pdvService.decrementar(item.id)) {
      this.message.info('Quantidade minima mantida.');
    }
  }

  protected alterarQuantidade(item: ItemCarrinho, quantidade: number | null): void {
    if (!this.pdvService.definirQuantidade(item.id, quantidade ?? 1)) {
      this.message.warning('Quantidade maior que o estoque disponivel.');
    }
  }

  protected editarPersonalizacao(item: ItemCarrinho): void {
    this.itemEditando.set(item);
    this.produtoPersonalizacao.set(item.produto);
    this.gruposPersonalizacao.set([]);
    this.drawerPersonalizacaoAberto.set(true);
    this.carregandoComplementos.set(true);

    this.grupoComplementoService.listarPorProduto(item.produto.id).pipe(
      finalize(() => this.carregandoComplementos.set(false))
    ).subscribe({
      next: (grupos) => this.gruposPersonalizacao.set(this.normalizarGrupos(grupos)),
      error: (error: HttpErrorResponse) => this.message.error(this.extrairMensagemErro(error))
    });
  }

  protected removerProduto(itemId: string): void {
    this.pdvService.remover(itemId);
  }

  protected limparVenda(): void {
    this.pdvService.limpar();
    this.mensagemErro.set(null);
  }

  protected finalizarVenda(): void {
    this.mensagemErro.set(null);

    if (this.pdvService.vazio()) {
      this.message.warning('Adicione produtos antes de finalizar a venda.');
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.valorRecebidoInsuficiente()) {
      this.formulario.controls.valorRecebidoDinheiro.markAsTouched();
      this.message.warning('Valor recebido menor que o total da venda.');
      return;
    }

    const request: PedidoRequest = {
      formaPagamentoId: this.formulario.controls.formaPagamentoId.value ?? 0,
      tipo: 'PDV',
      itens: this.pdvService.itens().map((item) => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade,
        observacao: item.observacao ?? null,
        complementos: (item.complementos ?? []).map((complemento) => ({
          opcaoComplementoId: complemento.opcaoComplementoId,
          quantidade: complemento.quantidade
        }))
      }))
    };

    this.finalizando.set(true);

    this.pedidoService.finalizarPedido(request).pipe(
      finalize(() => this.finalizando.set(false))
    ).subscribe({
      next: (pedido) => {
        this.pdvService.limpar();
        this.message.success(`Venda #${pedido.id} registrada com sucesso.`);
        void this.router.navigate(['/pedidos/gerenciar', pedido.id]);
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  protected imagemPrincipal(produto: ProdutoResponse | ProdutoCarrinho): string | null {
    const imagensInvalidas = this.imagensInvalidas();
    return this.urlsImagem(produto).find((url) => !imagensInvalidas.has(url)) ?? null;
  }

  protected marcarImagemInvalida(url: string): void {
    this.imagensInvalidas.update((urls) => new Set(urls).add(url));
  }

  protected estoqueTexto(produto: ProdutoResponse): string {
    const estoque = this.pdvService.quantidadeDisponivel(produto);

    if (estoque === null) {
      return 'Disponivel';
    }

    return estoque > 0 ? `${estoque} em estoque` : 'Sem estoque';
  }

  protected estoqueMaximo(produto: ProdutoCarrinho | ProdutoResponse): number {
    return this.pdvService.quantidadeDisponivel(produto) ?? 999;
  }

  protected podeAdicionar(produto: ProdutoResponse): boolean {
    return this.pdvService.possuiEstoque(produto);
  }

  protected preco(produto: ProdutoResponse | ProdutoCarrinho): number {
    return this.pdvService.obterPreco(produto);
  }

  protected subtotalItem(item: ItemCarrinho): number {
    return this.pdvService.obterPrecoItem(item) * item.quantidade;
  }

  protected precoItem(item: ItemCarrinho): number {
    return this.pdvService.obterPrecoItem(item);
  }

  private carregarProdutos(): void {
    const filtros = this.filtros.getRawValue();
    this.carregandoProdutos.set(true);

    this.produtoService.listar({
      page: this.pageIndex() - 1,
      size: this.pageSize(),
      sort: 'nome',
      nome: filtros.nome?.trim() || undefined,
      categoriaId: filtros.categoriaId ?? undefined
    }).pipe(
      finalize(() => this.carregandoProdutos.set(false))
    ).subscribe({
      next: (page) => {
        this.produtos.set(page.content);
        this.pdvService.sincronizarProdutos(page.content);
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

  private carregarFormasPagamento(): void {
    this.carregandoPagamento.set(true);

    this.formaPagamentoService.listarAtivas().pipe(
      finalize(() => this.carregandoPagamento.set(false))
    ).subscribe({
      next: (formas) => {
        this.formasPagamento.set(formas);

        if (formas.length === 1) {
          this.formulario.patchValue({ formaPagamentoId: formas[0].id });
          this.formaPagamentoId.set(formas[0].id);
        }
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  private adicionarProdutoConfigurado(produto: ProdutoCarrinho | ProdutoResponse, evento: ProdutoPersonalizacaoConfirmacao): void {
    if (!this.pdvService.adicionar(produto, evento.quantidade, evento.complementos)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponivel.');
      return;
    }

    this.message.success('Produto adicionado a venda.');
  }

  private normalizarGrupos(grupos: GrupoComplementoResponse[]): GrupoComplementoResponse[] {
    return grupos
      .filter((grupo) => grupo.ativo)
      .map((grupo) => ({
        ...grupo,
        opcoes: [...(grupo.opcoes ?? [])].filter((opcao) => opcao.ativo)
      }));
  }

  private atualizarValidacaoValorRecebido(): void {
    const controle = this.formulario.controls.valorRecebidoDinheiro;
    const validadores = this.pagamentoEmDinheiro()
      ? [Validators.required, Validators.min(this.totalPrevisto())]
      : [];

    controle.setValidators(validadores);
    controle.updateValueAndValidity({ emitEvent: false });
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel processar a venda.';
    }

    return 'Nao foi possivel processar a venda.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }

  private urlsImagem(produto: ProdutoResponse | ProdutoCarrinho): string[] {
    return [produto.imagemUrl, ...(produto.arquivosUrl ?? [])]
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      .map((url) => url.trim());
  }
}
