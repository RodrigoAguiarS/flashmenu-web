import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap } from 'rxjs';
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
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { CategoriaResponse } from '../../core/models/categoria.model';
import { GrupoComplementoResponse, ComplementoSelecionado } from '../../core/models/complemento.model';
import { HorarioFuncionamentoResponse } from '../../core/models/horario-funcionamento.model';
import { ProdutoResponse } from '../../core/models/produto.model';
import { UnidadeResponse } from '../../core/models/unidade.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { AuthService } from '../../core/services/auth.service';
import { ProdutoService } from '../../core/services/produto.service';
import { UnidadeService } from '../../core/services/unidade.service';
import { encontrarProximaAbertura, estaAbertaAgora, montarHorariosSemana } from '../../core/utils/horario-funcionamento.util';
import {
  ProdutoPersonalizacaoComponent,
  ProdutoPersonalizacaoConfirmacao
} from '../../shared/components/produto-personalizacao/produto-personalizacao.component';

interface ProdutosPorCategoria {
  categoria: CategoriaResponse;
  produtos: ProdutoResponse[];
}

interface FiltrosCatalogo {
  nome: string;
  categoriaId: number | null;
}

interface AcaoCarregarProdutos {
  reset: boolean;
}

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
    NzResultModule,
    NzSkeletonModule,
    NzSpinModule,
    NzTagModule,
    NzTooltipModule,
    ProdutoPersonalizacaoComponent
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CatalogoComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly unidadeService = inject(UnidadeService);
  private readonly authService = inject(AuthService);
  protected readonly carrinhoService = inject(CarrinhoService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('categoriasMenuRef')
  private categoriasMenuRef?: ElementRef<HTMLElement>;
  @ViewChild('filtrosRef')
  private filtrosRef?: ElementRef<HTMLElement>;

  protected readonly unidadeSlug = signal<string | null>(null);
  protected readonly unidadeResumo = signal<UnidadeResponse | null>(null);
  protected readonly horariosUnidade = signal<HorarioFuncionamentoResponse[]>([]);
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
  protected readonly carregandoMais = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly carregandoDescoberta = signal(false);
  protected readonly categoriasComOverflow = signal(false);
  protected readonly categoriasPodeRolarEsquerda = signal(false);
  protected readonly categoriasPodeRolarDireita = signal(false);
  protected readonly filtrosCompactos = signal(false);
  protected readonly exibirAtalhoRetorno = signal(false);
  protected readonly erroProdutos = signal<string | null>(null);
  protected readonly filtroNome = signal('');
  protected readonly categoriaSelecionadaId = signal<number | null>(null);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(12);
  protected readonly ultimaPagina = signal(true);
  protected readonly possuiProdutos = computed(() => this.produtos().length > 0);
  protected readonly podeCarregarMais = computed(() => this.possuiProdutos() && !this.ultimaPagina());
  protected readonly cardapioIndisponivel = signal(false);
  protected readonly mensagemCardapioIndisponivel = signal('Cardápio não encontrado.');
  protected readonly produtosNovidades = signal<ProdutoResponse[]>([]);
  protected readonly tituloCatalogo = computed(() => this.unidadeSlug() ? 'Cardápio' : 'Catálogo');
  protected readonly tipoDescoberta = computed<'novidades' | null>(() => this.produtosNovidades().length ? 'novidades' : null);
  protected readonly tituloDescoberta = computed(() => this.tipoDescoberta() === 'novidades' ? 'Novidades' : null);
  protected readonly produtosDescoberta = computed(() => this.produtosNovidades());
  protected readonly exibirDescoberta = computed(() => (
    !!this.tipoDescoberta()
    && this.produtosDescoberta().length > 0
    && !this.carregandoDescoberta()
    && !this.cardapioIndisponivel()
  ));
  protected readonly unidadeAberta = computed(() => {
    const unidade = this.unidadeResumo();

    if (!unidade?.ativo) {
      return false;
    }

    if (typeof unidade.abertaAgora === 'boolean') {
      return unidade.abertaAgora;
    }

    return estaAbertaAgora(this.horariosUnidade());
  });
  protected readonly statusUnidade = computed(() => this.unidadeAberta() ? 'Aberto' : 'Fechado');
  protected readonly statusUnidadeComplemento = computed(() => {
    const unidade = this.unidadeResumo();

    if (!unidade?.ativo) {
      return 'Unidade indisponível';
    }

    if (this.unidadeAberta()) {
      const horarioHoje = montarHorariosSemana(this.horariosUnidade()).find((horario) => horario.hoje);
      return horarioHoje?.horaFechamento ? `Fecha às ${horarioHoje.horaFechamento}` : null;
    }

    return encontrarProximaAbertura(this.horariosUnidade());
  });
  protected readonly valorPedidoMinimo = computed(() => {
    const valor = this.unidadeResumo()?.valorPedidoMinimo;
    return typeof valor === 'number' && valor > 0 ? valor : null;
  });
  protected readonly quantidadePedidoMinimo = computed(() => {
    const quantidade = this.unidadeResumo()?.pedidoMinimo;
    return typeof quantidade === 'number' && quantidade > 0 ? Math.trunc(quantidade) : null;
  });
  protected readonly produtosPorCategoria = computed<ProdutosPorCategoria[]>(() => {
    const grupos = new Map<number, ProdutosPorCategoria>();

    this.produtos().forEach((produto) => {
      const grupo = grupos.get(produto.categoria.id);

      if (grupo) {
        grupo.produtos.push(produto);
        return;
      }

      grupos.set(produto.categoria.id, {
        categoria: produto.categoria,
        produtos: [produto]
      });
    });

    return Array.from(grupos.values()).sort((a, b) => a.categoria.nome.localeCompare(b.categoria.nome));
  });
  protected readonly categoriasMenu = computed(() => {
    const categorias = this.categorias().filter((categoria) => categoria.ativo);

    if (categorias.length) {
      return categorias;
    }

    return this.produtosPorCategoria().map((grupo) => grupo.categoria);
  });

  protected readonly filtros = this.fb.group({
    nome: [''],
    categoriaId: this.fb.control<number | null>(null)
  });
  protected readonly skeletonCards = Array.from({ length: 8 });
  private readonly carregarProdutosAcao$ = new Subject<AcaoCarregarProdutos>();
  private readonly limiteDescoberta = 6;
  private ultimaAcaoProdutos: AcaoCarregarProdutos | null = null;
  private sequenciaCarregamentoProdutos = 0;
  private carregamentoProdutosAtivo = 0;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      this.atualizarIndicadoresCategorias();
      this.atualizarEstadoNavegacao();
    });
  }

  ngOnInit(): void {
    this.iniciarFluxoCarregamentoProdutos();

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
        this.unidadeResumo.set(null);
        this.horariosUnidade.set([]);
        this.pageIndex.set(0);
        this.erroProdutos.set(null);
        this.carregarResumoUnidade(slug);
        this.carregarCategorias();
        this.carregarProdutosDescoberta(slug);
        this.dispararCarregamentoProdutos({ reset: true });

        if (Number.isFinite(produtoId) && produtoId > 0) {
          this.carregarProdutoPublico(produtoId, true);
        }
      });

    this.filtros.valueChanges
      .pipe(
        debounceTime(350),
        map((filtros) => this.normalizarFiltrosCatalogo(filtros.nome, filtros.categoriaId)),
        distinctUntilChanged((anterior, atual) => (
          anterior.nome === atual.nome
          && anterior.categoriaId === atual.categoriaId
        )),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((filtros) => {
        this.filtroNome.set(filtros.nome);
        this.categoriaSelecionadaId.set(filtros.categoriaId);
        this.dispararCarregamentoProdutos({ reset: true });
      });
  }

  carregarMais(): void {
    if (this.carregando() || this.carregandoMais() || this.ultimaPagina()) {
      return;
    }

    this.dispararCarregamentoProdutos({ reset: false });
  }

  selecionarCategoria(categoriaId: number | null): void {
    this.categoriaSelecionadaId.set(categoriaId);
    this.filtros.patchValue({ categoriaId });
  }

  tentarNovamenteProdutos(): void {
    if (this.carregando() || this.carregandoMais()) {
      return;
    }

    this.dispararCarregamentoProdutos(this.ultimaAcaoProdutos ?? { reset: true });
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
      this.message.warning('Produto sem estoque disponível.');
      return;
    }

    if (!this.carrinhoService.adicionar(produto, quantidade, observacao, complementos)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponível.');
      return;
    }

    this.message.success('Produto adicionado ao carrinho.');
    this.fecharDetalhes();
  }

  adicionarOuPersonalizar(produto: ProdutoResponse): void {
    if (!this.carrinhoService.possuiEstoque(produto)) {
      this.message.warning('Produto sem estoque disponível.');
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
      return 'Disponível';
    }

    return estoque > 0 ? `${estoque} em estoque` : 'Sem estoque';
  }

  protected estoqueTextoConsumidor(produto: ProdutoResponse): string | null {
    const estoque = this.carrinhoService.quantidadeDisponivel(produto);

    if (estoque === null || estoque > 3) {
      return null;
    }

    return estoque > 0 ? 'Últimas unidades' : 'Indisponível';
  }

  protected descricaoProduto(produto: ProdutoResponse): string | null {
    const descricao = produto.descricao?.trim();
    return descricao ? descricao : null;
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

  private iniciarFluxoCarregamentoProdutos(): void {
    this.carregarProdutosAcao$
      .pipe(
        switchMap((acao) => {
          const slug = this.unidadeSlug();

          if (!slug) {
            this.produtos.set([]);
            this.total.set(0);
            this.ultimaPagina.set(true);
            this.erroProdutos.set(null);
            return EMPTY;
          }

          const filtros = this.normalizarFiltrosCatalogo(
            this.filtros.controls.nome.value,
            this.filtros.controls.categoriaId.value
          );

          const proximaPagina = acao.reset ? 0 : this.pageIndex() + 1;
          const idRequisicao = ++this.sequenciaCarregamentoProdutos;
          this.carregamentoProdutosAtivo = idRequisicao;
          this.ultimaAcaoProdutos = acao;
          this.erroProdutos.set(null);

          if (acao.reset) {
            this.carregando.set(true);
          } else {
            this.carregandoMais.set(true);
          }

          return this.produtoService.listarPublicoPorUnidade(slug, {
            page: proximaPagina,
            size: this.pageSize(),
            sort: 'nome',
            nome: filtros.nome || undefined,
            categoriaId: filtros.categoriaId ?? undefined
          }).pipe(
            catchError((error: HttpErrorResponse) => {
              if (acao.reset) {
                this.produtos.set([]);
                this.total.set(0);
                this.ultimaPagina.set(true);
              }

              this.tratarErroCardapio(error);
              const mensagemErro = this.extrairMensagemErro(error);
              this.erroProdutos.set(mensagemErro);
              this.message.error(mensagemErro);
              return EMPTY;
            }),
            finalize(() => {
              if (this.carregamentoProdutosAtivo !== idRequisicao) {
                return;
              }

              this.carregando.set(false);
              this.carregandoMais.set(false);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((page) => {
        this.pageIndex.set(page.number);
        this.produtos.set(this.ultimaAcaoProdutos?.reset ? page.content : [...this.produtos(), ...page.content]);
        this.total.set(page.totalElements);
        this.ultimaPagina.set(page.last);
        queueMicrotask(() => this.atualizarIndicadoresCategorias());
      });
  }

  private dispararCarregamentoProdutos(acao: AcaoCarregarProdutos): void {
    this.carregarProdutosAcao$.next({ ...acao });
  }

  private normalizarFiltrosCatalogo(nome: string | null | undefined, categoriaId: number | null | undefined): FiltrosCatalogo {
    return {
      nome: (nome ?? '').trim(),
      categoriaId: categoriaId ?? null
    };
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
      next: (categorias) => {
        this.categorias.set(categorias);
        queueMicrotask(() => this.atualizarIndicadoresCategorias());
      },
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
      this.message.warning('Acesse o cardápio pelo link da unidade.');
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
    this.unidadeResumo.set(null);
    this.horariosUnidade.set([]);
    this.produtos.set([]);
    this.produtosNovidades.set([]);
    this.categorias.set([]);
    this.total.set(0);
    this.ultimaPagina.set(true);
    this.cardapioIndisponivel.set(true);
    this.mensagemCardapioIndisponivel.set('Acesse o cardápio pelo link público da unidade.');
  }

  private tratarErroCardapio(error: HttpErrorResponse): void {
    if (error.status === 404 || error.status === 410) {
      this.cardapioIndisponivel.set(true);
      this.mensagemCardapioIndisponivel.set('Unidade não encontrada ou cardápio indisponível.');
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
      return body.message || body.error || 'Não foi possível carregar o catálogo.';
    }

    return 'Não foi possível carregar o catálogo.';
  }

  protected aoRolarCategorias(): void {
    this.atualizarIndicadoresCategorias();
  }

  @HostListener('window:scroll')
  protected aoRolarPagina(): void {
    this.atualizarEstadoNavegacao();
  }

  @HostListener('window:resize')
  protected aoRedimensionarJanela(): void {
    this.atualizarIndicadoresCategorias();
    this.atualizarEstadoNavegacao();
  }

  protected voltarParaCategorias(): void {
    const alvo = this.filtrosRef?.nativeElement ?? this.categoriasMenuRef?.nativeElement;

    if (!alvo || typeof window === 'undefined') {
      return;
    }

    const topo = alvo.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({
      top: Math.max(0, topo),
      behavior: 'smooth'
    });
  }

  private carregarResumoUnidade(slug: string): void {
    this.unidadeService.buscarPublicaPorSlug(slug).pipe(
      switchMap((unidade) => forkJoin({
        unidade: of(unidade),
        horarios: this.unidadeService.listarHorariosPublicos(unidade.id).pipe(
          catchError(() => of([] as HorarioFuncionamentoResponse[]))
        )
      })),
      catchError(() => EMPTY),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ unidade, horarios }) => {
      if (this.unidadeSlug() !== slug) {
        return;
      }

      this.unidadeResumo.set(unidade);
      this.horariosUnidade.set(horarios);
    });
  }

  private carregarProdutosDescoberta(slug: string): void {
    this.carregandoDescoberta.set(true);
    this.produtosNovidades.set([]);

    this.produtoService.listarPublicoPorUnidade(slug, {
      page: 0,
      size: this.limiteDescoberta,
      sort: 'criadoEm,desc'
    }).pipe(
      catchError(() => of({
        content: [] as ProdutoResponse[],
        totalElements: 0,
        totalPages: 0,
        size: this.limiteDescoberta,
        number: 0,
        first: true,
        last: true,
        empty: true
      })),
      finalize(() => this.carregandoDescoberta.set(false)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((page) => {
      if (this.unidadeSlug() !== slug) {
        return;
      }

      this.produtosNovidades.set(
        page.content
          .filter((produto) => produto.ativo !== false)
          .slice(0, this.limiteDescoberta)
      );
    });
  }

  private atualizarIndicadoresCategorias(): void {
    const container = this.categoriasMenuRef?.nativeElement;

    if (!container) {
      this.categoriasComOverflow.set(false);
      this.categoriasPodeRolarEsquerda.set(false);
      this.categoriasPodeRolarDireita.set(false);
      return;
    }

    const limite = 2;
    const possuiOverflow = container.scrollWidth - container.clientWidth > limite;
    const scrollLeft = container.scrollLeft;
    const maximo = Math.max(0, container.scrollWidth - container.clientWidth);

    this.categoriasComOverflow.set(possuiOverflow);
    this.categoriasPodeRolarEsquerda.set(possuiOverflow && scrollLeft > limite);
    this.categoriasPodeRolarDireita.set(possuiOverflow && maximo - scrollLeft > limite);
  }

  private atualizarEstadoNavegacao(): void {
    if (typeof window === 'undefined') {
      this.filtrosCompactos.set(false);
      this.exibirAtalhoRetorno.set(false);
      return;
    }

    const posicaoVertical = Math.max(0, window.scrollY || 0);
    const alturaViewport = Math.max(0, window.innerHeight || 0);
    const limiteAtalho = Math.max(560, Math.round(alturaViewport * 1.2));

    this.filtrosCompactos.set(posicaoVertical > 96);
    this.exibirAtalhoRetorno.set(posicaoVertical > limiteAtalho);
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
