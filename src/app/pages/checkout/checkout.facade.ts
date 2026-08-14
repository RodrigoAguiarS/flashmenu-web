import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, Subscription, catchError, finalize, switchMap, timer } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { EnderecoResponse } from '../../core/models/endereco.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { ConfiguracaoComercialResponse } from '../../core/models/configuracao-comercial.model';
import { PedidoRequest, PedidoResponse } from '../../core/models/pedido.model';
import { PixCobrancaResponse, PixPagamentoStatus } from '../../core/models/pix-pagamento.model';
import { AuthService } from '../../core/services/auth.service';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { ConfiguracaoComercialService } from '../../core/services/configuracao-comercial.service';
import { EnderecoService } from '../../core/services/endereco.service';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { PedidoFinanceiroService } from '../../core/services/pedido-financeiro.service';
import { PedidoService } from '../../core/services/pedido.service';
import { PixPagamentoService } from '../../core/services/pix-pagamento.service';

@Injectable()
export class CheckoutFacade {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly formaPagamentoService = inject(FormaPagamentoService);
  private readonly configuracaoComercialService = inject(ConfiguracaoComercialService);
  private readonly pedidoFinanceiroService = inject(PedidoFinanceiroService);
  private readonly pedidoService = inject(PedidoService);
  private readonly pixPagamentoService = inject(PixPagamentoService);
  private readonly authService = inject(AuthService);
  private readonly carrinhoService = inject(CarrinhoService);
  private readonly enderecoService = inject(EnderecoService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formasPagamento = signal<FormaPagamentoResponse[]>([]);
  readonly configuracaoComercial = signal<ConfiguracaoComercialResponse | null>(null);
  readonly enderecos = signal<EnderecoResponse[]>([]);
  readonly carregandoEnderecos = signal(false);
  readonly formaPagamentoId = signal<number | null>(null);
  readonly valorRecebidoDinheiro = signal<number | null>(null);
  readonly carregando = signal(false);
  readonly finalizando = signal(false);
  readonly mensagemErro = signal<string | null>(null);
  readonly unidadeSlug = signal<string | null>(null);
  readonly pedidoPix = signal<PedidoResponse | null>(null);
  readonly cobrancaPix = signal<PixCobrancaResponse | null>(null);
  readonly valorPix = signal<number | null>(null);
  readonly modalPixAberta = signal(false);
  readonly gerandoPix = signal(false);
  readonly consultandoPix = signal(false);
  readonly statusPix = signal<PixPagamentoStatus | null>(null);
  readonly erroPix = signal<string | null>(null);
  readonly pagamentoPixAprovado = signal(false);
  readonly usuario = computed(() => this.authService.usuarioAutenticado());
  readonly enderecoEntrega = computed(() => this.enderecos().find((endereco) => endereco.principal) ?? this.enderecos()[0] ?? null);
  readonly formaPagamentoSelecionada = computed(() => {
    const formaPagamentoId = this.formaPagamentoId();
    return this.formasPagamento().find((forma) => forma.id === formaPagamentoId) ?? null;
  });
  readonly percentualAcrescimo = computed(() => Number(this.formaPagamentoSelecionada()?.percentualAcrescimo ?? 0));
  readonly resumoFinanceiro = computed(() =>
    this.pedidoFinanceiroService.calcularPrevia(
      this.carrinhoService.valorTotal(),
      this.configuracaoComercial()?.percentualDescontoPadrao,
      this.configuracaoComercial()?.valorTaxaFixa,
      this.percentualAcrescimo()
    )
  );
  readonly valorAcrescimo = computed(() => this.resumoFinanceiro().valorAcrescimo ?? 0);
  readonly totalPrevisto = computed(() => this.resumoFinanceiro().valorTotal);
  readonly pagamentoEmDinheiro = computed(() => this.formaPagamentoSelecionada()?.tipo === 'DINHEIRO');
  readonly pagamentoPix = computed(() => this.formaPagamentoSelecionada()?.tipo === 'PIX');
  readonly pixCopiaECola = computed(() => {
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
  readonly pixQrCodeImagem = computed(() => {
    const cobranca = this.cobrancaPix();
    const base64 = cobranca?.pixQrCode ?? cobranca?.qrCodeBase64;

    if (base64) {
      return base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    }

    return cobranca?.qrCodeUrl ?? null;
  });
  readonly pixExpiracao = computed(() => this.cobrancaPix()?.expiracao ?? this.cobrancaPix()?.expiraEm ?? null);
  readonly pixExpirado = computed(() => {
    const status = this.statusPix();
    return status === 'EXPIRADO' || status === 'CANCELADO';
  });
  readonly troco = computed(() => {
    const valorRecebido = Number(this.valorRecebidoDinheiro() ?? 0);
    return Math.max(valorRecebido - this.totalPrevisto(), 0);
  });
  readonly valorRecebidoInsuficiente = computed(() =>
    this.pagamentoEmDinheiro() &&
    this.valorRecebidoDinheiro() !== null &&
    Number(this.valorRecebidoDinheiro()) < this.totalPrevisto()
  );
  readonly checkoutValido = computed(() =>
    !this.carrinhoService.vazio() &&
    !!this.usuario() &&
    !!this.formaPagamentoId() &&
    (!this.pagamentoEmDinheiro() || (!!this.valorRecebidoDinheiro() && !this.valorRecebidoInsuficiente())) &&
    !this.finalizando()
  );

  readonly formulario = this.fb.group({
    formaPagamentoId: this.fb.control<number | null>(null, [Validators.required]),
    valorRecebidoDinheiro: this.fb.control<number | null>(null)
  });

  private readonly validarPagamentoDinheiro = effect(() => {
    this.totalPrevisto();
    this.atualizarValidacaoValorRecebido();
  });

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
  private pollingPix?: Subscription;

  inicializar(unidadeSlug: string | null = null): void {
    this.unidadeSlug.set(unidadeSlug);
    this.carregarConfiguracaoComercial();
    this.carregarFormasPagamento();
    this.carregarEnderecosEntrega();

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

  atualizarClienteIdentificado(): void {
    this.authService.usuarioLogado().pipe(
      finalize(() => this.carregarEnderecosEntrega())
    ).subscribe({
      error: () => this.carregarEnderecosEntrega()
    });
  }

  finalizarPedido(): void {
    this.mensagemErro.set(null);

    if (this.carrinhoService.vazio()) {
      this.message.warning('Adicione produtos antes de finalizar o pedido.');
      void this.router.navigate(['/carrinho']);
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.valorRecebidoInsuficiente()) {
      this.formulario.controls.valorRecebidoDinheiro.markAsTouched();
      this.message.warning('Valor recebido menor que o total do pedido.');
      return;
    }

    if (!this.usuario()) {
      this.mensagemErro.set('Identifique o cliente antes de confirmar o pedido.');
      return;
    }

    const request: PedidoRequest = {
      formaPagamentoId: this.formulario.controls.formaPagamentoId.value ?? 0,
      ...(this.pagamentoEmDinheiro() ? this.criarPagamentoDinheiroRequest() : {}),
      itens: this.carrinhoService.itens().map((item) => ({
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

        this.carrinhoService.limpar();
        this.message.success('Pedido realizado com sucesso.');
        void this.router.navigate(['/pedido/sucesso'], { state: { pedido } });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.mensagemErro.set('Sua sessao expirou. Confirme seus dados para continuar.');
          return;
        }

        this.mensagemErro.set(this.extrairMensagemErro(error, 'Nao foi possivel finalizar o pedido.'));
      }
    });
  }

  copiarCodigoPix(): void {
    const codigo = this.pixCopiaECola();

    if (!codigo) {
      this.message.warning('Codigo PIX indisponivel.');
      return;
    }

    if (!navigator.clipboard) {
      this.message.info(codigo);
      return;
    }

    void navigator.clipboard.writeText(codigo)
      .then(() => this.message.success('Codigo PIX copiado.'))
      .catch(() => this.message.info(codigo));
  }

  tentarGerarPixNovamente(): void {
    const pedido = this.pedidoPix();

    if (!pedido) {
      return;
    }

    this.gerarCobrancaPix(pedido);
  }

  fecharModalPix(): void {
    if (this.pagamentoPixAprovado()) {
      this.modalPixAberta.set(false);
      return;
    }

    this.message.info('Aguardando confirmacao do pagamento PIX.');
  }

  private carregarFormasPagamento(): void {
    this.carregando.set(true);

    this.formaPagamentoService.listarAtivas().pipe(
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: (formas) => {
        this.formasPagamento.set(formas);

        if (formas.length === 1) {
          this.formulario.patchValue({ formaPagamentoId: formas[0].id });
          this.formaPagamentoId.set(formas[0].id);
        }
      },
      error: (error: HttpErrorResponse) =>
        this.mensagemErro.set(this.extrairMensagemErro(error, 'Nao foi possivel finalizar o pedido.'))
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
        this.erroPix.set(this.extrairMensagemErro(error, 'Nao foi possivel gerar a cobranca PIX.'));
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
        this.erroPix.set('PIX expirado. Gere uma nova cobranca para continuar.');
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

    this.pedidoService.buscarMeuPedido(pedidoId).subscribe({
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
    this.carrinhoService.limpar();
    this.modalPixAberta.set(false);
    void this.router.navigate(['/pedido/sucesso'], { state: { pedido } });
  }

  private pararPollingPix(): void {
    this.pollingPix?.unsubscribe();
    this.pollingPix = undefined;
  }

  private normalizarValorMonetario(valor: number): number {
    return Math.round(Number(valor ?? 0) * 100) / 100;
  }

  private criarPagamentoDinheiroRequest(): Pick<PedidoRequest, 'valorRecebido' | 'troco'> {
    return {
      valorRecebido: this.normalizarValorMonetario(this.formulario.controls.valorRecebidoDinheiro.value ?? 0),
      troco: this.normalizarValorMonetario(this.troco())
    };
  }

  private carregarConfiguracaoComercial(): void {
    this.configuracaoComercialService.buscar().subscribe({
      next: (configuracao) => this.configuracaoComercial.set(configuracao),
      error: () => this.configuracaoComercial.set(null)
    });
  }

  private carregarEnderecosEntrega(): void {
    const usuario = this.usuario();

    if (!usuario) {
      this.enderecos.set([]);
      return;
    }

    this.carregandoEnderecos.set(true);

    this.enderecoService.listar(usuario.id).pipe(
      finalize(() => this.carregandoEnderecos.set(false))
    ).subscribe({
      next: (enderecos) => this.enderecos.set(enderecos.filter((endereco) => endereco.ativo)),
      error: (error: HttpErrorResponse) => {
        this.enderecos.set([]);
        if (error.status !== 404) {
          this.message.warning(this.extrairMensagemErro(error, 'Nao foi possivel carregar o endereco do cliente.'));
        }
      }
    });
  }

  private atualizarValidacaoValorRecebido(): void {
    const controle = this.formulario.controls.valorRecebidoDinheiro;
    const validadores = this.pagamentoEmDinheiro()
      ? [Validators.required, Validators.min(this.totalPrevisto())]
      : [];

    controle.setValidators(validadores);
    controle.updateValueAndValidity({ emitEvent: false });
  }

  private extrairMensagemErro(error: HttpErrorResponse, mensagemPadrao: string): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || mensagemPadrao;
    }

    return mensagemPadrao;
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
