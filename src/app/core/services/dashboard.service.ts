import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DashboardPeriodoFiltros,
  DashboardResumoResponse,
  ProdutoEstoqueBaixoResponse,
  ProdutoMaisVendidoResponse,
  VendaPorDiaResponse,
  VendaPorFormaPagamentoResponse
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/dashboard`;

  buscarResumo(filtros: DashboardPeriodoFiltros): Observable<DashboardResumoResponse> {
    return this.http.get<DashboardResumoResponse>(`${this.baseUrl}/resumo`, {
      params: this.criarParametrosPeriodo(filtros)
    });
  }

  buscarVendasPorDia(filtros: DashboardPeriodoFiltros): Observable<VendaPorDiaResponse[]> {
    return this.http.get<VendaPorDiaResponse[]>(`${this.baseUrl}/vendas-por-dia`, {
      params: this.criarParametrosPeriodo(filtros)
    });
  }

  buscarProdutosMaisVendidos(
    filtros: DashboardPeriodoFiltros,
    limit?: number
  ): Observable<ProdutoMaisVendidoResponse[]> {
    let params = this.criarParametrosPeriodo(filtros);

    if (limit !== undefined) {
      params = params.set('limit', limit);
    }

    return this.http.get<ProdutoMaisVendidoResponse[]>(`${this.baseUrl}/produtos-mais-vendidos`, { params });
  }

  buscarVendasPorFormaPagamento(filtros: DashboardPeriodoFiltros): Observable<VendaPorFormaPagamentoResponse[]> {
    return this.http.get<VendaPorFormaPagamentoResponse[]>(`${this.baseUrl}/formas-pagamento`, {
      params: this.criarParametrosPeriodo(filtros)
    });
  }

  buscarProdutosComEstoqueBaixo(limite?: number): Observable<ProdutoEstoqueBaixoResponse[]> {
    const params = limite !== undefined ? new HttpParams().set('limite', limite) : undefined;
    return this.http.get<ProdutoEstoqueBaixoResponse[]>(`${this.baseUrl}/estoque-baixo`, { params });
  }

  private criarParametrosPeriodo(filtros: DashboardPeriodoFiltros): HttpParams {
    return new HttpParams()
      .set('dataInicio', filtros.dataInicio)
      .set('dataFim', filtros.dataFim);
  }
}
