import { Injectable } from '@angular/core';

import { PedidoResumoFinanceiro } from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoFinanceiroService {
  calcularPrevia(
    subtotal: number,
    percentualDesconto: number | null | undefined,
    valorTaxaFixa: number | null | undefined,
    percentualAcrescimo: number | null | undefined
  ): PedidoResumoFinanceiro {
    const subtotalNormalizado = this.normalizarValor(subtotal);
    const percentualDescontoNormalizado = this.normalizarValor(percentualDesconto);
    const valorTaxaFixaNormalizado = this.normalizarValor(valorTaxaFixa);
    const percentualAcrescimoNormalizado = this.normalizarValor(percentualAcrescimo);
    const valorDesconto = subtotalNormalizado * (percentualDescontoNormalizado / 100);
    const baseCalculo = subtotalNormalizado - valorDesconto + valorTaxaFixaNormalizado;
    const valorAcrescimo = baseCalculo * (percentualAcrescimoNormalizado / 100);

    return {
      subtotal: subtotalNormalizado,
      percentualDesconto: percentualDescontoNormalizado,
      valorDesconto,
      valorTaxaFixa: valorTaxaFixaNormalizado,
      percentualAcrescimo: percentualAcrescimoNormalizado,
      valorAcrescimo,
      valorTotal: baseCalculo + valorAcrescimo
    };
  }

  private normalizarValor(valor: number | null | undefined): number {
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }
}
