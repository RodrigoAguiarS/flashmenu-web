import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UnidadeRequest, UnidadeResponse } from '../models/unidade.model';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/unidades`;

  listar(): Observable<UnidadeResponse[]> {
    return this.http.get<UnidadeResponse[]>(this.baseUrl);
  }

  cadastrar(request: UnidadeRequest): Observable<UnidadeResponse> {
    return this.http.post<UnidadeResponse>(this.baseUrl, request);
  }

  atualizar(id: number, request: UnidadeRequest): Observable<UnidadeResponse> {
    return this.http.put<UnidadeResponse>(`${this.baseUrl}/${id}`, request);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
