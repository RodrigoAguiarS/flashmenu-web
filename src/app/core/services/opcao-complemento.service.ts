import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { OpcaoComplementoRequest, OpcaoComplementoResponse } from '../models/complemento.model';
import { PageResponse } from '../models/page.model';

@Injectable({
  providedIn: 'root'
})
export class OpcaoComplementoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/opcoes-complementos`;

  listar(filtros: { page: number; size: number; sort?: string; id?: number; grupoId?: number; nome?: string }): Observable<PageResponse<OpcaoComplementoResponse>> {
    let params = new HttpParams().set('page', filtros.page).set('size', filtros.size);

    Object.entries({
      sort: filtros.sort,
      id: filtros.id,
      grupoId: filtros.grupoId,
      nome: filtros.nome
    }).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return this.http.get<PageResponse<OpcaoComplementoResponse>>(this.baseUrl, { params });
  }

  criar(request: OpcaoComplementoRequest): Observable<OpcaoComplementoResponse> {
    return this.http.post<OpcaoComplementoResponse>(this.baseUrl, request);
  }

  atualizar(id: number, request: OpcaoComplementoRequest): Observable<OpcaoComplementoResponse> {
    return this.http.put<OpcaoComplementoResponse>(`${this.baseUrl}/${id}`, request);
  }

  ativar(id: number): Observable<OpcaoComplementoResponse> {
    return this.http.patch<OpcaoComplementoResponse>(`${this.baseUrl}/${id}/ativar`, {});
  }

  desativar(id: number): Observable<OpcaoComplementoResponse> {
    return this.http.patch<OpcaoComplementoResponse>(`${this.baseUrl}/${id}/desativar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
