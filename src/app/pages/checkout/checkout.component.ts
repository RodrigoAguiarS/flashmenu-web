import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzQRCodeModule } from 'ng-zorro-antd/qr-code';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NgxMaskDirective } from 'ngx-mask';

import { ProdutoCarrinho } from '../../core/models/carrinho.model';
import { FormaPagamentoResponse } from '../../core/models/forma-pagamento.model';
import { CarrinhoService } from '../../core/services/carrinho.service';
import { TelefonePipe } from '../../shared/pipes/telefone.pipe';
import { CheckoutFacade } from './checkout.facade';
import { IdentificacaoClienteComponent } from './components/identificacao-cliente/identificacao-cliente.component';

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
    NzCardModule,
    NzCollapseModule,
    NzEmptyModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzQRCodeModule,
    NzSpinModule,
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
    this.checkout.finalizarPedido();
  }

  protected selecionarFormaPagamento(formaPagamentoId: number): void {
    this.checkout.formulario.patchValue({ formaPagamentoId });
  }

  protected valor(valor: number | null | undefined): number {
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }

  protected possuiValor(valor: number | null | undefined): boolean {
    return this.valor(valor) !== 0;
  }

  protected rotuloFormaPagamento(forma: FormaPagamentoResponse): string {
    const tipo = forma.tipo;

    if (tipo === 'PIX') {
      return 'PIX';
    }

    if (tipo === 'CARTAO_CREDITO') {
      return 'Cartao de credito';
    }

    if (tipo === 'CARTAO_DEBITO') {
      return 'Cartao de debito';
    }

    if (tipo === 'DINHEIRO') {
      return 'Dinheiro';
    }

    return forma.nome;
  }

  protected descricaoFormaPagamento(forma: FormaPagamentoResponse): string {
    if (forma.tipo === 'PIX') {
      return 'Pagamento instantaneo';
    }

    if (forma.tipo === 'DINHEIRO') {
      return 'Pague na entrega';
    }

    if (forma.percentualAcrescimo) {
      return `Acrescimo de ${this.valor(forma.percentualAcrescimo)}%`;
    }

    return 'Sem acrescimo';
  }

  protected iconeFormaPagamento(forma: FormaPagamentoResponse): string {
    if (forma.tipo === 'PIX') {
      return 'PIX';
    }

    if (forma.tipo === 'DINHEIRO') {
      return 'R$';
    }

    return 'CARD';
  }

  protected textoBotaoConfirmar(): string {
    const total = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(this.checkout.totalPrevisto());

    if (this.checkout.pagamentoPix()) {
      return `Pagar ${total} com PIX`;
    }

    return `Confirmar pedido · ${total}`;
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
}
