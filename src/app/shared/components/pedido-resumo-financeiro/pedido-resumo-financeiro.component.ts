import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TipoFormaPagamento } from '../../../core/models/forma-pagamento.model';
import { PedidoResumoFinanceiro } from '../../../core/models/pedido.model';

@Component({
  selector: 'app-pedido-resumo-financeiro',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './pedido-resumo-financeiro.component.html',
  styleUrl: './pedido-resumo-financeiro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PedidoResumoFinanceiroComponent {
  readonly resumo = input.required<PedidoResumoFinanceiro>();
  readonly rotuloTotal = input('Total');
  readonly formaPagamentoTipo = input<TipoFormaPagamento | null | undefined>(null);
  readonly valorRecebido = input<number | null | undefined>(null);
  readonly troco = input<number | null | undefined>(null);

  protected readonly exibirDesconto = computed(() =>
    this.possuiValor(this.resumo().valorDesconto) || this.possuiValor(this.resumo().percentualDesconto)
  );
  protected readonly exibirTaxaFixa = computed(() => this.possuiValor(this.resumo().valorTaxaFixa));
  protected readonly exibirAcrescimo = computed(() =>
    this.possuiValor(this.resumo().valorAcrescimo) || this.possuiValor(this.resumo().percentualAcrescimo)
  );
  protected readonly exibirPagamentoDinheiro = computed(() => this.formaPagamentoTipo() === 'DINHEIRO');

  protected valor(valor: number | null | undefined): number {
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }

  protected valorInformado(valor: number | null | undefined): boolean {
    return valor !== null && valor !== undefined && Number.isFinite(Number(valor));
  }

  private possuiValor(valor: number | null | undefined): boolean {
    return this.valor(valor) !== 0;
  }
}
