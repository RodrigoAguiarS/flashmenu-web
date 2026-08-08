import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { StandardError, ValidationError } from '../../core/models/api-error.model';
import { ProdutoCarrinho } from '../../core/models/carrinho.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { PedidoRequest } from '../../core/models/pedido.model';
import { AuthService } from '../../core/services/auth.service';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { FormaPagamentoService } from '../../core/services/forma-pagamento.service';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzSelectModule,
    NzSpinModule
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly formaPagamentoService = inject(FormaPagamentoService);
  private readonly pedidoService = inject(PedidoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carrinhoService = inject(CarrinhoService);
  protected readonly formasPagamento = signal<FormaPagamentoResponse[]>([]);
  protected readonly formaPagamentoId = signal<number | null>(null);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly carregando = signal(false);
  protected readonly finalizando = signal(false);
  protected readonly mensagemErro = signal<string | null>(null);
  protected readonly usuario = computed(() => this.authService.usuarioAutenticado());
  protected readonly formaPagamentoSelecionada = computed(() => {
    const formaPagamentoId = this.formaPagamentoId();
    return this.formasPagamento().find((forma) => forma.id === formaPagamentoId) ?? null;
  });
  protected readonly percentualAcrescimo = computed(() => Number(this.formaPagamentoSelecionada()?.percentualAcrescimo ?? 0));
  protected readonly valorAcrescimo = computed(() => {
    const subtotal = this.carrinhoService.valorTotal();
    return subtotal * (this.percentualAcrescimo() / 100);
  });

  protected readonly formulario = this.fb.group({
    formaPagamentoId: this.fb.control<number | null>(null, [Validators.required])
  });

  ngOnInit(): void {
    if (this.carrinhoService.vazio()) {
      this.message.warning('Adicione produtos antes de finalizar o pedido.');
      void this.router.navigate(['/carrinho']);
      return;
    }

    this.carregarFormasPagamento();

    this.formulario.controls.formaPagamentoId.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((formaPagamentoId) => this.formaPagamentoId.set(formaPagamentoId));
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

    const request: PedidoRequest = {
      formaPagamentoId: this.formulario.controls.formaPagamentoId.value ?? 0,
      itens: this.carrinhoService.itens().map((item) => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade
      }))
    };

    this.finalizando.set(true);

    this.pedidoService.finalizarPedido(request).pipe(
      finalize(() => this.finalizando.set(false))
    ).subscribe({
      next: (pedido) => {
        this.carrinhoService.limpar();
        this.message.success('Pedido realizado com sucesso.');
        void this.router.navigate(['/pedido/sucesso'], {
          state: {
            pedido
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) {
          void this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
          return;
        }

        this.mensagemErro.set(this.extrairMensagemErro(error));
      }
    });
  }

  protected subtotalItem(preco: number, quantidade: number): number {
    return Number(preco ?? 0) * quantidade;
  }

  protected imagemPrincipal(produto: ProdutoCarrinho): string | null {
    if (this.imagensInvalidas().has(produto.id)) {
      return null;
    }

    return produto.imagemUrl ?? produto.arquivosUrl?.[0] ?? null;
  }

  protected marcarImagemInvalida(produtoId: number): void {
    this.imagensInvalidas.update((ids) => new Set(ids).add(produtoId));
  }

  protected totalPrevisto(): number {
    const subtotal = this.carrinhoService.valorTotal();

    return subtotal + this.valorAcrescimo();
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
      error: (error: HttpErrorResponse) => this.mensagemErro.set(this.extrairMensagemErro(error))
    });
  }

  private extrairMensagemErro(error: HttpErrorResponse): string {
    const body = error.error;

    if (this.ehErroValidacao(body)) {
      return body.errors.map((erroCampo) => erroCampo.message).join(' ');
    }

    if (this.ehErroPadrao(body)) {
      return body.message || body.error || 'Nao foi possivel finalizar o pedido.';
    }

    return 'Nao foi possivel finalizar o pedido.';
  }

  private ehErroValidacao(value: unknown): value is ValidationError {
    return !!value && typeof value === 'object' && Array.isArray((value as ValidationError).errors);
  }

  private ehErroPadrao(value: unknown): value is StandardError {
    return !!value && typeof value === 'object' && 'message' in value;
  }
}
