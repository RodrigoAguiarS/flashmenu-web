import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtribuirEntregadorRequest,
  EntregaFiltros,
  EntregaResponse,
  RecusarEntregaRequest
} from '../models/entrega.model';
import { PageResponse } from '../models/page.model';

@Injectable({
  providedIn: 'root'
})
export class EntregaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/entregas`;

  listar(filtros: EntregaFiltros): Observable<PageResponse<EntregaResponse>> {
    return this.http.get<PageResponse<EntregaResponse>>(this.baseUrl, {
      params: this.criarParametros(filtros)
    });
  }

  listarMinhas(filtros: Pick<EntregaFiltros, 'page' | 'size' | 'sort' | 'status'>): Observable<PageResponse<EntregaResponse>> {
    return this.http.get<PageResponse<EntregaResponse>>(`${this.baseUrl}/minhas`, {
      params: this.criarParametros(filtros)
    });
  }

  buscarPorId(id: number): Observable<EntregaResponse> {
    return this.http.get<EntregaResponse>(`${this.baseUrl}/${id}`);
  }

  distribuirPedido(pedidoId: number): Observable<EntregaResponse> {
    return this.http.post<EntregaResponse>(`${this.baseUrl}/pedidos/${pedidoId}/distribuir`, {});
  }

  atribuirPedido(pedidoId: number, request: AtribuirEntregadorRequest): Observable<EntregaResponse> {
    return this.http.patch<EntregaResponse>(`${this.baseUrl}/pedidos/${pedidoId}/atribuir`, request);
  }

  aceitar(id: number): Observable<EntregaResponse> {
    return this.http.patch<EntregaResponse>(`${this.baseUrl}/${id}/aceitar`, {});
  }

  recusar(id: number, request: RecusarEntregaRequest): Observable<EntregaResponse> {
    return this.http.patch<EntregaResponse>(`${this.baseUrl}/${id}/recusar`, request);
  }

  iniciar(id: number): Observable<EntregaResponse> {
    return this.http.patch<EntregaResponse>(`${this.baseUrl}/${id}/iniciar`, {});
  }

  concluir(id: number): Observable<EntregaResponse> {
    return this.http.patch<EntregaResponse>(`${this.baseUrl}/${id}/concluir`, {});
  }

  private criarParametros(filtros: Partial<EntregaFiltros>): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page ?? 0)
      .set('size', filtros.size ?? 10);

    const opcionais: Record<string, string | number | undefined> = {
      sort: filtros.sort,
      status: filtros.status,
      entregadorId: filtros.entregadorId
    };

    Object.entries(opcionais).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return params;
  }
}
