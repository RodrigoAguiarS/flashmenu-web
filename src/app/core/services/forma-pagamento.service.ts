import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FormaPagamentoPercentualRequest, FormaPagamentoResponse } from '../models/forma-pagamento.model';

@Injectable({
  providedIn: 'root'
})
export class FormaPagamentoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/formas-pagamento`;

  listarAtivas(): Observable<FormaPagamentoResponse[]> {
    return this.http.get<FormaPagamentoResponse[]>(this.baseUrl);
  }

  atualizarPercentualAcrescimo(
    id: number,
    request: FormaPagamentoPercentualRequest
  ): Observable<FormaPagamentoResponse> {
    return this.http.patch<FormaPagamentoResponse>(`${this.baseUrl}/${id}/percentual-acrescimo`, request);
  }
}
