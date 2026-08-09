import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import {
  AjusteEstoqueProdutoRequest,
  MovimentacaoProdutoFiltros,
  MovimentacaoProdutoRequest,
  MovimentacaoProdutoResponse
} from '../models/movimentacao-produto.model';

@Injectable({
  providedIn: 'root'
})
export class MovimentacaoProdutoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/produtos`;

  listarPorProduto(
    produtoId: number,
    filtros: MovimentacaoProdutoFiltros
  ): Observable<PageResponse<MovimentacaoProdutoResponse>> {
    return this.http.get<PageResponse<MovimentacaoProdutoResponse>>(this.movimentacoesUrl(produtoId), {
      params: this.criarParametros(filtros)
    });
  }

  registrarEntrada(produtoId: number, request: MovimentacaoProdutoRequest): Observable<MovimentacaoProdutoResponse> {
    return this.http.post<MovimentacaoProdutoResponse>(`${this.movimentacoesUrl(produtoId)}/entrada`, request);
  }

  registrarAjuste(produtoId: number, request: AjusteEstoqueProdutoRequest): Observable<MovimentacaoProdutoResponse> {
    return this.http.post<MovimentacaoProdutoResponse>(`${this.movimentacoesUrl(produtoId)}/ajuste`, request);
  }

  private movimentacoesUrl(produtoId: number): string {
    return `${this.baseUrl}/${produtoId}/movimentacoes`;
  }

  private criarParametros(filtros: MovimentacaoProdutoFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    if (filtros.tipo) {
      params = params.set('tipo', filtros.tipo);
    }

    return params;
  }
}
