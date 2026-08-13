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
    return this.http.post<PedidoResponse>(this.baseUrl, request).pipe(
      map((pedido) => this.normalizarPedido(pedido))
    );
  }

  listarMeusPedidosPaginado(usuarioId: number, filtros: Pick<PedidoFiltros, 'page' | 'size' | 'sort'>): Observable<PageResponse<PedidoResponse>> {
    return this.listarTodosPaginado({
      ...filtros,
      usuarioId,
      tipo: 'DELIVERY'
    });
  }

  listarTodosPaginado(filtros: PedidoFiltros): Observable<PageResponse<PedidoResponse>> {
    return this.http.get<PageResponse<PedidoResponse>>(`${this.baseUrl}/listarTodosPaginado`, {
      params: this.criarParametros(filtros)
    }).pipe(
      map((page) => ({
        ...page,
        content: page.content.map((pedido) => this.normalizarPedido(pedido))
      }))
    );
  }

  buscarMeuPedido(id: number): Observable<PedidoResponse> {
    return this.http.get<PedidoResponse>(`${this.baseUrl}/${id}`).pipe(
      map((pedido) => this.normalizarPedido(pedido))
    );
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

  confirmarPagamento(id: number): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(`${this.baseUrl}/${id}/confirmar-pagamento`, {}).pipe(
      map((pedido) => this.normalizarPedido(pedido))
    );
  }

  cancelarPedido(id: number): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(`${this.baseUrl}/${id}/cancelar`, {}).pipe(
      map((pedido) => this.normalizarPedido(pedido))
    );
  }

  alterarStatusPedido(id: number, request: AlterarStatusPedidoRequest): Observable<PedidoResponse> {
    return this.http.patch<PedidoResponse>(`${this.baseUrl}/${id}/status`, request).pipe(
      map((pedido) => this.normalizarPedido(pedido))
    );
  }

  concluirPedido(id: number): Observable<PedidoResponse> {
    return this.alterarStatusPedido(id, { status: 'CONCLUIDO' });
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
      unidadeId: filtros.unidadeId,
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

  private normalizarPedido(pedido: PedidoResponse): PedidoResponse {
    return {
      ...pedido,
      confirmadoEm: this.obterConfirmadoEm(pedido)
    };
  }

  private obterConfirmadoEm(pedido: PedidoResponse): string | null {
    return pedido.pagamento?.confirmadoEm ?? null;
  }
}
