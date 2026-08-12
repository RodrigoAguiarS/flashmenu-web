import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PedidoResponse } from '../models/pedido.model';
import { PixCobrancaRequest, PixCobrancaResponse, PixStatusResponse } from '../models/pix-pagamento.model';

@Injectable({
  providedIn: 'root'
})
export class PixPagamentoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/pagamentos/pix`;

  gerarCobranca(pedidoId: number, request: PixCobrancaRequest): Observable<PixCobrancaResponse> {
    return this.http.post<PixCobrancaResponse>(`${this.baseUrl}/pedidos/${pedidoId}/cobranca`, request);
  }

  consultarStatus(pedidoId: number): Observable<PixStatusResponse> {
    return this.http.get<PixStatusResponse>(`${this.baseUrl}/pedidos/${pedidoId}/status`);
  }

  buscarPedidoAtualizado(pedidoId: number): Observable<PedidoResponse> {
    return this.http.get<PedidoResponse>(`${environment.apiUrl}/api/pedidos/${pedidoId}`);
  }
}
