import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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

  protected readonly exibirDesconto = computed(() =>
    this.possuiValor(this.resumo().valorDesconto) || this.possuiValor(this.resumo().percentualDesconto)
  );
  protected readonly exibirTaxaFixa = computed(() => this.possuiValor(this.resumo().valorTaxaFixa));
  protected readonly exibirAcrescimo = computed(() =>
    this.possuiValor(this.resumo().valorAcrescimo) || this.possuiValor(this.resumo().percentualAcrescimo)
  );

  protected valor(valor: number | null | undefined): number {
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }

  private possuiValor(valor: number | null | undefined): boolean {
    return this.valor(valor) !== 0;
  }
}
