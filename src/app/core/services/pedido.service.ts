import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { AlterarStatusPedidoRequest, PedidoFiltros, PedidoRequest, PedidoResponse } from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/pedidos`;

  finalizarPedido(request: PedidoRequest): Observable<PedidoResponse> {
    return this.http.post<PedidoResponse>(this.baseUrl, request);
  }

  listarMeusPedidos(): Observable<PedidoResponse[]> {
    return this.http.get<PedidoResponse[]>(this.baseUrl);
  }

  listarTodosPaginado(filtros: PedidoFiltros): Observable<PageResponse<PedidoResponse>> {
    return this.http.get<PageResponse<PedidoResponse>>(`${this.baseUrl}/listarTodosPaginado`, {
      params: this.criarParametros(filtros)
    });
  }

  buscarMeuPedido(id: number): Observable<PedidoResponse> {
    return this.http.get<PedidoResponse>(`${this.baseUrl}/${id}`);
  }

  buscarPedidoAdministrativo(id: number): Observable<PedidoResponse> {
    return this.listarTodosPaginado({ page: 0, size: 1, id }).pipe(
      map((page) => {
        const pedido = page.content[0];

        if (!pedido) {
          throw new Error('Pedido nao encontrado.');
        }

        return pedido;
      })
    );
  }

  alterarStatus(id: number, request: AlterarStatusPedidoRequest): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(`${this.baseUrl}/${id}/status`, request);
  }

  confirmarPagamento(id: number): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(`${this.baseUrl}/${id}/confirmar-pagamento`, {});
  }

  cancelarPedido(id: number): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(`${this.baseUrl}/${id}/cancelar`, {});
  }

  exportarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
  }

  private criarParametros(filtros: PedidoFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    const opcionais: Record<string, string | number | undefined> = {
      sort: filtros.sort,
      id: filtros.id,
      usuarioId: filtros.usuarioId,
      status: filtros.status,
      tipo: filtros.tipo
    };

    Object.entries(opcionais).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return params;
  }
}
