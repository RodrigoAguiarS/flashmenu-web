import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NgxMaskDirective } from 'ngx-mask';

import { ProdutoCarrinho } from '../../core/models/carrinho.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';
import { CheckoutFacade } from './checkout.facade';
import { IdentificacaoClienteComponent } from './components/identificacao-cliente/identificacao-cliente.component';

type CheckoutEtapa = 'clienteEndereco' | 'pedidoPagamento' | 'resumo';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    TelefonePipe,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzQRCodeModule,
    NzRadioModule,
    NzSpinModule,
    NzStepsModule,
    NzTagModule,
    NgxMaskDirective,
    IdentificacaoClienteComponent
  ],
  providers: [CheckoutFacade],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);

  protected readonly carrinhoService = inject(CarrinhoService);
  protected readonly checkout = inject(CheckoutFacade);
  protected readonly imagensInvalidas = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly etapaAtual = signal<CheckoutEtapa>('clienteEndereco');
  protected readonly etapasCheckout = ['Cliente', 'Pedido', 'Resumo'] as const;
  protected readonly etapaAtualCheckout = computed(() => this.indiceEtapa(this.etapaAtual()));
  protected readonly podeAvancarClienteEndereco = computed(() => this.checkout.entregaPedidoValido());
  protected readonly podeAvancarPedidoPagamento = computed(() => this.checkout.pagamentoValido());

  ngOnInit(): void {
    const unidadeSlug = this.route.snapshot.paramMap.get('unidadeSlug');

    if (unidadeSlug) {
      this.carrinhoService.definirUnidadeSlug(unidadeSlug);
    } else if (this.carrinhoService.unidadeSlug()) {
      void this.router.navigate(this.carrinhoService.checkoutLink(), { replaceUrl: true });
      return;
    }

    if (this.carrinhoService.vazio()) {
      this.message.warning('Adicione produtos antes de finalizar o pedido.');
      void this.router.navigate(['/carrinho']);
      return;
    }

    this.checkout.inicializar(unidadeSlug);
  }

  protected finalizarPedido(): void {
    if (this.etapaAtual() !== 'resumo') {
      this.avancarEtapa();
      return;
    }

    this.checkout.finalizarPedido();
  }

  protected clienteIdentificadoComSucesso(): void {
    this.checkout.atualizarClienteIdentificado();
  }

  protected avancarEtapa(): void {
    this.checkout.mensagemErro.set(null);

    const etapaAtual = this.etapaAtual();

    if (etapaAtual === 'clienteEndereco') {
      if (!this.checkout.usuario()) {
        this.message.warning('Identifique o cliente antes de continuar.');
        return;
      }

      if (!this.checkout.enderecoEntrega()) {
        this.message.warning('Informe um endereço de entrega antes de continuar.');
        return;
      }

      this.etapaAtual.set('pedidoPagamento');
      return;
    }

    if (etapaAtual === 'pedidoPagamento') {
      if (!this.checkout.pagamentoValido()) {
        this.checkout.formulario.markAllAsTouched();
        this.message.warning('Escolha uma forma de pagamento válida.');
        return;
      }

      this.etapaAtual.set('resumo');
    }
  }

  protected voltarEtapa(): void {
    const etapaAtual = this.etapaAtual();

    if (etapaAtual === 'resumo') {
      this.etapaAtual.set('pedidoPagamento');
      return;
    }

    this.etapaAtual.set('clienteEndereco');
  }

  protected editarClienteEndereco(): void {
    this.etapaAtual.set('clienteEndereco');
  }

  protected editarPedidoPagamento(): void {
    this.etapaAtual.set('pedidoPagamento');
  }

  protected selecionarFormaPagamento(formaPagamentoId: number): void {
    this.checkout.formulario.patchValue({ formaPagamentoId });
  }

  protected valor(valor: number | null | undefined): number {
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }

  protected rotuloFormaPagamento(forma: FormaPagamentoResponse): string {
    const tipo = forma.tipo;

    if (tipo === 'PIX') {
      return 'PIX';
    }

    if (tipo === 'CARTAO_CREDITO') {
      return 'Cartão de crédito';
    }

    if (tipo === 'CARTAO_DEBITO') {
      return 'Cartão de débito';
    }

    if (tipo === 'DINHEIRO') {
      return 'Dinheiro';
    }

    return forma.nome;
  }

  protected descricaoFormaPagamento(forma: FormaPagamentoResponse): string {
    if (forma.tipo === 'PIX') {
      return 'Pagamento instantâneo';
    }

    if (forma.tipo === 'DINHEIRO') {
      return 'Pague na entrega';
    }

    if (forma.percentualAcrescimo) {
      return `Acréscimo de ${this.valor(forma.percentualAcrescimo)}%`;
    }

    return 'Sem acréscimo';
  }

  protected iconeFormaPagamento(forma: FormaPagamentoResponse): string {
    if (forma.tipo === 'PIX') {
      return 'thunderbolt';
    }

    if (forma.tipo === 'DINHEIRO') {
      return 'dollar';
    }

    if (forma.tipo === 'CARTAO_CREDITO' || forma.tipo === 'CARTAO_DEBITO') {
      return 'credit-card';
    }

    return 'wallet';
  }

  protected textoBotaoConfirmar(): string {
    const total = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.checkout.totalPrevisto());

    if (this.checkout.pagamentoPix()) {
      return `Pagar ${total} com PIX`;
    }

    return `Confirmar pedido - ${total}`;
  }

  protected subtotalItem(preco: number, quantidade: number): number {
    return Number(preco ?? 0) * quantidade;
  }

  protected precoItem(item: { valorUnitarioEstimado?: number; produto: ProdutoCarrinho }): number {
    return Number(item.valorUnitarioEstimado ?? item.produto.valorVenda ?? 0);
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

  private indiceEtapa(etapa: CheckoutEtapa): number {
    const etapas: CheckoutEtapa[] = ['clienteEndereco', 'pedidoPagamento', 'resumo'];
    return etapas.indexOf(etapa);
  }
}
