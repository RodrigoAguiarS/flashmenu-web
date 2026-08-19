import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  effect,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, Subscription, catchError, debounceTime, distinctUntilChanged, finalize, switchMap, timer } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NgxMaskDirective } from 'ngx-mask';

import { ItemCarrinho, ProdutoCarrinho } from '../../core/models/carrinho.model';
import { CategoriaResponse } from '../../core/models/categoria.model';
import { GrupoComplementoResponse } from '../../core/models/complemento.model';
import { ConfiguracaoComercialResponse } from '../../core/models/configuracao-comercial.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { PedidoRequest, PedidoResponse, PedidoResumoFinanceiro } from '../../core/models/pedido.model';
import { PixCobrancaResponse, PixPagamentoStatus } from '../../core/models/pix-pagamento.model';
import { ProdutoResponse } from '../../core/models/produto.model';
import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { CategoriaService } from '../../core/services/categoria.service';
import { ConfiguracaoComercialService } from '../../core/services/configuracao-comercial.service';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { GrupoComplementoService } from '../../core/services/grupo-complemento.service';
import { PedidoFinanceiroService } from '../../core/services/pedido-financeiro.service';
import { PdvService } from '../../core/services/pdv.service';
import { PedidoService } from '../../core/services/pedido.service';
import { PixPagamentoService } from '../../core/services/pix-pagamento.service';
import { ProdutoService } from '../../core/services/produto.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PedidoResumoFinanceiroComponent } from '../../shared/components/pedido-resumo-financeiro/pedido-resumo-financeiro.component';
import {
  ProdutoPersonalizacaoComponent,
  ProdutoPersonalizacaoConfirmacao
} from '../../shared/components/produto-personalizacao/produto-personalizacao.component';

@Component({
  selector: 'app-pdv',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzPopconfirmModule,
    NzQRCodeModule,
    NzRadioModule,
    NzSpinModule,
    NzTagModule,
    NzTooltipModule,
    NgxMaskDirective,
    ProdutoPersonalizacaoComponent,
    PedidoResumoFinanceiroComponent,
    PageHeaderComponent
  ],
  templateUrl: './pdv.component.html',
  styleUrl: './pdv.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PdvComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly grupoComplementoService = inject(GrupoComplementoService);
  private readonly configuracaoComercialService = inject(ConfiguracaoComercialService);
  private readonly pedidoFinanceiroService = inject(PedidoFinanceiroService);
  private readonly formaPagamentoService = inject(FormaPagamentoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly pixPagamentoService = inject(PixPagamentoService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly pdvService = inject(PdvService);
  protected readonly pdvMobile = signal(false);
  protected readonly produtos = signal<ProdutoResponse[]>([]);
  protected readonly categorias = signal<CategoriaResponse[]>([]);
  protected readonly formasPagamento = signal<FormaPagamentoResponse[]>([]);
  protected readonly configuracaoComercial = signal<ConfiguracaoComercialResponse | null>(null);
  protected readonly formaPagamentoId = signal<number | null>(null);
  protected readonly valorRecebidoDinheiro = signal<number | null>(null);
  protected readonly imagensInvalidas = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly produtoPersonalizacao = signal<ProdutoResponse | ProdutoCarrinho | null>(null);
  protected readonly itemEditando = signal<ItemCarrinho | null>(null);
  protected readonly gruposPersonalizacao = signal<GrupoComplementoResponse[]>([]);
  protected readonly drawerPersonalizacaoAberto = signal(false);
  protected readonly drawerVendaAberto = signal(false);
  protected readonly carregandoComplementos = signal(false);
  protected readonly carregandoProdutos = signal(false);
  protected readonly carregandoCategorias = signal(false);
  protected readonly carregandoPagamento = signal(false);
  protected readonly finalizando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly pedidoPix = signal<PedidoResponse | null>(null);
  protected readonly cobrancaPix = signal<PixCobrancaResponse | null>(null);
  protected readonly valorPix = signal<number | null>(null);
  protected readonly modalPixAberta = signal(false);
  protected readonly gerandoPix = signal(false);
  protected readonly consultandoPix = signal(false);
  protected readonly statusPix = signal<PixPagamentoStatus | null>(null);
  protected readonly erroPix = signal<string | null>(null);
  protected readonly pagamentoPixAprovado = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(1);
  protected readonly pageSize = signal(24);
  protected readonly possuiProdutos = computed(() => this.produtos().length > 0);
  protected readonly tituloDrawerPersonalizacao = computed(() =>
    this.itemEditando() ? 'Editar adicionais' : 'Personalizar produto'
  );
  protected readonly textoConfirmarPersonalizacao = computed(() =>
    this.itemEditando() ? 'Salvar adicionais' : 'Adicionar à venda'
  );
  protected readonly formaPagamentoSelecionada = computed(() => {
    const formaPagamentoId = this.formaPagamentoId();
    return this.formasPagamento().find((forma) => forma.id === formaPagamentoId) ?? null;
  });
  protected readonly percentualAcrescimo = computed(() => Number(this.formaPagamentoSelecionada()?.percentualAcrescimo ?? 0));
  protected readonly resumoFinanceiro = computed<PedidoResumoFinanceiro>(() => {
    if (this.pdvService.vazio()) {
      return {
        subtotal: 0,
        percentualDesconto: 0,
        valorDesconto: 0,
        valorTaxaFixa: 0,
        percentualAcrescimo: 0,
        valorAcrescimo: 0,
        valorTotal: 0
      };
    }

    return this.pedidoFinanceiroService.calcularPrevia(
      this.pdvService.valorTotal(),
      this.configuracaoComercial()?.percentualDescontoPadrao,
      this.configuracaoComercial()?.valorTaxaFixa,
      this.percentualAcrescimo()
    );
  });
  protected readonly valorAcrescimo = computed(() => this.resumoFinanceiro().valorAcrescimo ?? 0);
  protected readonly totalPrevisto = computed(() => this.resumoFinanceiro().valorTotal);
  protected readonly pagamentoEmDinheiro = computed(() => this.formaPagamentoSelecionada()?.tipo === 'DINHEIRO');
  protected readonly pagamentoPix = computed(() => this.formaPagamentoSelecionada()?.tipo === 'PIX');
  protected readonly pixCopiaECola = computed(() => {
    const cobranca = this.cobrancaPix();
    const candidatos = [
      cobranca?.pixCopiaCola,
      cobranca?.pixCopiaECola,
      cobranca?.copiaECola,
      cobranca?.codigoPix,
      cobranca?.qrCode
    ];

    return candidatos.find((codigo) => this.ehCodigoPixCopiaECola(codigo))?.trim() ?? null;
  });
  protected readonly pixQrCodeImagem = computed(() => {
    const cobranca = this.cobrancaPix();
    const base64 = cobranca?.pixQrCode ?? cobranca?.qrCodeBase64;

    if (base64) {
      return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    }

    return cobranca?.qrCodeUrl ?? null;
  });
  protected readonly pixExpiracao = computed(() => this.cobrancaPix()?.expiracao ?? this.cobrancaPix()?.expiraEm ?? null);
  protected readonly pixExpirado = computed(() => {
    const status = this.statusPix();
    return status === 'EXPIRADO' || status === 'CANCELADO';
  });
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

  @ViewChild('buscaProduto') private buscaProduto?: ElementRef<HTMLInputElement>;

  private readonly validarPagamentoDinheiro = effect(() => {
    this.totalPrevisto();
    this.atualizarValidacaoValorRecebido();
  });
  private pollingPix?: Subscription;

  private ehCodigoPixCopiaECola(codigo: string | null | undefined): codigo is string {
    const valor = codigo?.trim();

    if (!valor) {
      return false;
    }

    if (valor.startsWith('data:image') || /^https?:\/\//i.test(valor)) {
      return false;
    }

    if (valor.length > 1200) {
      return false;
    }

    return valor.includes('BR.GOV.BCB.PIX') || valor.startsWith('000201') || valor.length < 900;
  }

  ngOnInit(): void {
    this.breakpointObserver.observe('(max-width: 1039px)').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((state) => {
      this.pdvMobile.set(state.matches);

      if (!state.matches) {
        this.fecharVendaMobile();
      }
    });

    this.carregarConfiguracaoComercial();
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

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (!this.pdvMobile()) {
        this.focarBusca();
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected navegarPorAtalhos(event: KeyboardEvent): void {
    if (this.modalPixAberta()) {
      return;
    }

    if (event.key === 'F2') {
      event.preventDefault();
      this.focarBusca();
      return;
    }

    if (event.key === 'F4') {
      event.preventDefault();
      this.selecionarFormaPorTipo('PIX');
      return;
    }

    if (event.key === 'F5') {
      event.preventDefault();
      this.selecionarFormaPorTipo('CARTAO_DEBITO');
      return;
    }

    if (event.key === 'F6') {
      event.preventDefault();
      this.selecionarFormaPorTipo('CARTAO_CREDITO');
      return;
    }

    if (event.key === 'F7') {
      event.preventDefault();
      this.selecionarFormaPorTipo('DINHEIRO');
      return;
    }

    if (event.key === 'F9') {
      event.preventDefault();
      this.finalizarVenda();
      return;
    }

    if (event.key === 'Escape') {
      this.fecharPersonalizacao();
    }
  }

  protected alterarPagina(pageIndex: number): void {
    this.pageIndex.set(pageIndex);
    this.carregarProdutos();
  }

  protected limparFiltros(): void {
    this.filtros.reset({ nome: '', categoriaId: null });
  }

  protected limparBusca(): void {
    this.filtros.patchValue({ nome: '' });
    this.focarBusca();
  }

  protected selecionarCategoria(categoriaId: number | null): void {
    this.filtros.patchValue({ categoriaId });
  }

  protected categoriaSelecionada(categoriaId: number | null): boolean {
    return this.filtros.controls.categoriaId.value === categoriaId;
  }

  protected adicionarProdutoBusca(): void {
    const produto = this.produtos()[0];

    if (!produto) {
      return;
    }

    this.adicionarProduto(produto);
    this.filtros.patchValue({ nome: '' });
    this.focarBusca();
  }

  protected adicionarProduto(produto: ProdutoResponse): void {
    if (!this.pdvService.possuiEstoque(produto)) {
      this.message.warning('Produto sem estoque disponível.');
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
        this.message.warning('Não foi possível atualizar os adicionais com o estoque atual.');
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

  protected abrirVendaMobile(): void {
    this.drawerVendaAberto.set(true);
  }

  protected fecharVendaMobile(): void {
    this.drawerVendaAberto.set(false);
  }

  protected incrementar(item: ItemCarrinho): void {
    if (!this.pdvService.incrementar(item.id)) {
      this.message.warning('Quantidade maior que o estoque disponível.');
    }
  }

  protected decrementar(item: ItemCarrinho): void {
    if (item.quantidade <= 1) {
      this.removerProduto(item.id);
      this.message.info('Produto removido da venda.');
      return;
    }

    if (!this.pdvService.decrementar(item.id)) {
      this.message.warning('Não foi possível diminuir a quantidade.');
    }
  }

  protected alterarQuantidade(item: ItemCarrinho, quantidade: number | null): void {
    if (!this.pdvService.definirQuantidade(item.id, quantidade ?? 1)) {
      this.message.warning('Quantidade maior que o estoque disponível.');
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

  protected selecionarFormaPagamento(formaPagamento: FormaPagamentoResponse): void {
    this.formulario.patchValue({ formaPagamentoId: formaPagamento.id });
    this.formaPagamentoId.set(formaPagamento.id);
    this.formulario.controls.formaPagamentoId.markAsTouched();
  }

  protected formaPagamentoAtalho(formaPagamento: FormaPagamentoResponse): string | null {
    const atalhos: Record<string, string> = {
      PIX: 'F4',
      CARTAO_DEBITO: 'F5',
      CARTAO_CREDITO: 'F6',
      DINHEIRO: 'F7'
    };

    return atalhos[formaPagamento.tipo] ?? null;
  }

  protected formaPagamentoIcone(formaPagamento: FormaPagamentoResponse): string {
    const icones: Record<string, string> = {
      PIX: 'thunderbolt',
      CARTAO_DEBITO: 'credit-card',
      CARTAO_CREDITO: 'credit-card',
      DINHEIRO: 'dollar'
    };

    return icones[formaPagamento.tipo] ?? 'wallet';
  }

  protected descricaoFormaPagamento(formaPagamento: FormaPagamentoResponse): string {
    if (formaPagamento.tipo === 'PIX') {
      return 'Pagamento instantâneo';
    }

    if (formaPagamento.tipo === 'DINHEIRO') {
      return 'Pagamento imediato';
    }

    if (formaPagamento.percentualAcrescimo) {
      return `Acréscimo de ${Number(formaPagamento.percentualAcrescimo)}%`;
    }

    return 'Sem acréscimo';
  }

  protected formaPagamentoSelecionadaPorId(formaPagamentoId: number): boolean {
    return this.formaPagamentoId() === formaPagamentoId;
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
      ...(this.pagamentoEmDinheiro() ? this.criarPagamentoDinheiroRequest() : {}),
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
    const valorPixPrevisto = this.normalizarValorMonetario(this.totalPrevisto());

    this.pedidoService.finalizarPedido(request).pipe(
      finalize(() => this.finalizando.set(false))
    ).subscribe({
      next: (pedido) => {
        if (this.pagamentoPix()) {
          this.iniciarPagamentoPix(pedido, valorPixPrevisto);
          return;
        }

        this.pdvService.limpar();
        this.message.success(`Venda #${pedido.id} registrada com sucesso.`);
        void this.router.navigate(['/pedidos/', pedido.id]);
      },
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  protected copiarCodigoPix(): void {
    const codigo = this.pixCopiaECola();

    if (!codigo) {
      this.message.warning('Código PIX indisponível.');
      return;
    }

    if (!navigator.clipboard) {
      this.message.info(codigo);
      return;
    }

    void navigator.clipboard.writeText(codigo)
      .then(() => this.message.success('Código PIX copiado.'))
      .catch(() => this.message.info(codigo));
  }

  protected tentarGerarPixNovamente(): void {
    const pedido = this.pedidoPix();

    if (!pedido) {
      return;
    }

    this.gerarCobrancaPix(pedido);
  }

  protected fecharModalPix(): void {
    if (this.pagamentoPixAprovado()) {
      this.modalPixAberta.set(false);
      return;
    }

    this.message.info('Aguardando confirmação do pagamento PIX.');
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
      return 'Disponível';
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

  private iniciarPagamentoPix(pedido: PedidoResponse, valorPix: number): void {
    this.pedidoPix.set(pedido);
    this.valorPix.set(valorPix);
    this.modalPixAberta.set(true);
    this.pagamentoPixAprovado.set(false);
    this.gerarCobrancaPix(pedido);
  }

  private gerarCobrancaPix(pedido: PedidoResponse): void {
    this.erroPix.set(null);
    this.cobrancaPix.set(null);
    this.statusPix.set('PENDENTE');
    this.gerandoPix.set(true);
    this.pararPollingPix();

    const valor = this.valorPix() ?? this.normalizarValorMonetario(this.totalPrevisto());

    this.pixPagamentoService.gerarCobranca(pedido.id, { valor }).pipe(
      finalize(() => this.gerandoPix.set(false))
    ).subscribe({
      next: (cobranca) => {
        this.cobrancaPix.set(cobranca);
        this.statusPix.set(cobranca.status ?? 'AGUARDANDO_PAGAMENTO');
        this.iniciarPollingPix(pedido.id);
      },
      error: (error: HttpErrorResponse) => {
        this.erroPix.set(this.extrairMensagemErro(error));
        this.statusPix.set('PENDENTE');
      }
    });
  }

  private iniciarPollingPix(pedidoId: number): void {
    this.consultandoPix.set(true);

    this.pollingPix = timer(0, 5000).pipe(
      switchMap(() => this.pixPagamentoService.consultarStatus(pedidoId).pipe(
        catchError(() => EMPTY)
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((status) => {
      this.statusPix.set(status.status);

      if (status.expirado || status.status === 'EXPIRADO' || status.status === 'CANCELADO') {
        this.pararPollingPix();
        this.consultandoPix.set(false);
        this.erroPix.set('PIX expirado. Gere uma nova cobrança para continuar.');
        return;
      }

      if (status.pago || status.status === 'PAGO') {
        this.pararPollingPix();
        this.consultandoPix.set(false);
        this.confirmarPagamentoPix(pedidoId);
      }
    });
  }

  private confirmarPagamentoPix(pedidoId: number): void {
    this.pagamentoPixAprovado.set(true);
    this.message.success('Pagamento PIX aprovado.');

    this.pedidoService.buscarPedidoAdministrativo(pedidoId).subscribe({
      next: (pedidoAtualizado) => this.concluirPedidoPix(pedidoAtualizado),
      error: () => {
        const pedido = this.pedidoPix();
        if (pedido) {
          this.concluirPedidoPix({ ...pedido, status: 'CONFIRMADO' });
        }
      }
    });
  }

  private concluirPedidoPix(pedido: PedidoResponse): void {
    this.pedidoPix.set(pedido);
    this.pdvService.limpar();
    this.modalPixAberta.set(false);
    void this.router.navigate(['/pedidos/', pedido.id]);
  }

  private pararPollingPix(): void {
    this.pollingPix?.unsubscribe();
    this.pollingPix = undefined;
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

  private carregarConfiguracaoComercial(): void {
    this.configuracaoComercialService.buscar().subscribe({
      next: (configuracao) => this.configuracaoComercial.set(configuracao),
      error: () => this.configuracaoComercial.set(null)
    });
  }

  private adicionarProdutoConfigurado(produto: ProdutoCarrinho | ProdutoResponse, evento: ProdutoPersonalizacaoConfirmacao): void {
    if (!this.pdvService.adicionar(produto, evento.quantidade, evento.complementos)) {
      this.message.warning('Quantidade solicitada maior que o estoque disponível.');
      return;
    }

    this.message.success('Produto adicionado à venda.');

    if (!this.pdvMobile()) {
      this.focarBusca();
    }
  }

  private selecionarFormaPorTipo(tipo: string): void {
    const formaPagamento = this.formasPagamento().find((forma) => forma.tipo === tipo);

    if (formaPagamento) {
      this.selecionarFormaPagamento(formaPagamento);
    }
  }

  private focarBusca(): void {
    this.buscaProduto?.nativeElement.focus();
    this.buscaProduto?.nativeElement.select();
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

  private normalizarValorMonetario(valor: number): number {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  }

  private criarPagamentoDinheiroRequest(): Pick<PedidoRequest, 'valorRecebido' | 'troco'> {
    return {
      valorRecebido: this.normalizarValorMonetario(this.formulario.controls.valorRecebidoDinheiro.value ?? 0),
      troco: this.normalizarValorMonetario(this.troco())
    };
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Não foi possível processar a venda.';
    }

    return 'Não foi possível processar a venda.';
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
