import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { EnderecoResponse } from '../../core/models/endereco.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { PedidoRequest } from '../../core/models/pedido.model';
import { AuthService } from '../../core/services/auth.service';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { EnderecoService } from '../../core/services/endereco.service';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { PedidoService } from '../../core/services/pedido.service';

@Injectable()
export class CheckoutFacade {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly formaPagamentoService = inject(FormaPagamentoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly authService = inject(AuthService);
  private readonly carrinhoService = inject(CarrinhoService);
  private readonly enderecoService = inject(EnderecoService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formasPagamento = signal<FormaPagamentoResponse[]>([]);
  readonly enderecos = signal<EnderecoResponse[]>([]);
  readonly carregandoEnderecos = signal(false);
  readonly formaPagamentoId = signal<number | null>(null);
  readonly carregando = signal(false);
  readonly finalizando = signal(false);
  readonly mensagemErro = signal<string | null>(null);
  readonly usuario = computed(() => this.authService.usuarioAutenticado());
  readonly enderecoEntrega = computed(() => this.enderecos().find((endereco) => endereco.principal) ?? this.enderecos()[0] ?? null);
  readonly formaPagamentoSelecionada = computed(() => {
    const formaPagamentoId = this.formaPagamentoId();
    return this.formasPagamento().find((forma) => forma.id === formaPagamentoId) ?? null;
  });
  readonly percentualAcrescimo = computed(() => Number(this.formaPagamentoSelecionada()?.percentualAcrescimo ?? 0));
  readonly valorAcrescimo = computed(() => {
    const subtotal = this.carrinhoService.valorTotal();
    return subtotal * (this.percentualAcrescimo() / 100);
  });
  readonly totalPrevisto = computed(() => this.carrinhoService.valorTotal() + this.valorAcrescimo());
  readonly checkoutValido = computed(() =>
    !this.carrinhoService.vazio() &&
    !!this.usuario() &&
    !!this.enderecoEntrega() &&
    !!this.formaPagamentoId() &&
    !this.finalizando()
  );

  readonly formulario = this.fb.group({
    formaPagamentoId: this.fb.control<number | null>(null, [Validators.required])
  });

  inicializar(): void {
    this.carregarFormasPagamento();
    this.carregarEnderecosEntrega();

    this.formulario.controls.formaPagamentoId.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((formaPagamentoId) => this.formaPagamentoId.set(formaPagamentoId));
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

    if (!this.usuario()) {
      this.mensagemErro.set('Identifique o cliente antes de confirmar o pedido.');
      return;
    }

    if (!this.enderecoEntrega()) {
      this.mensagemErro.set('Informe um endereco de entrega antes de confirmar o pedido.');
      return;
    }

    const request: PedidoRequest = {
      formaPagamentoId: this.formulario.controls.formaPagamentoId.value ?? 0,
      itens: this.carrinhoService.itens().map((item) => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade,
        observacao: item.observacao ?? null
      }))
    };

    this.finalizando.set(true);

    this.pedidoService.finalizarPedido(request).pipe(
      finalize(() => this.finalizando.set(false))
    ).subscribe({
      next: (pedido) => {
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
        this.mensagemErro.set(this.extrairMensagemErro(error, 'Nao foi possivel carregar o endereco de entrega.'));
      }
    });
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
