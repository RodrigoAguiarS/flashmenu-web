import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GrupoComplementoRequest, GrupoComplementoResponse, OpcaoComplementoResponse } from '../models/complemento.model';
import { PageResponse } from '../models/page.model';

@Injectable({
  providedIn: 'root'
})
export class GrupoComplementoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/grupos-complementos`;
  private readonly produtosUrl = `${environment.apiUrl}/api/produtos`;

  listarPorProduto(produtoId: number): Observable<GrupoComplementoResponse[]> {
    return this.http.get<GrupoComplementoResponse[]>(`${this.produtosUrl}/${produtoId}/grupos-complementos`);
  }

  listar(filtros: { page: number; size: number; sort?: string; id?: number; produtoId?: number; nome?: string }): Observable<PageResponse<GrupoComplementoResponse>> {
    let params = new HttpParams().set('page', filtros.page).set('size', filtros.size);

    Object.entries({
      sort: filtros.sort,
      id: filtros.id,
      produtoId: filtros.produtoId,
      nome: filtros.nome
    }).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return this.http.get<PageResponse<GrupoComplementoResponse>>(this.baseUrl, { params });
  }

  buscarPorId(id: number): Observable<GrupoComplementoResponse> {
    return this.http.get<GrupoComplementoResponse>(`${this.baseUrl}/${id}`);
  }

  criar(request: GrupoComplementoRequest): Observable<GrupoComplementoResponse> {
    return this.http.post<GrupoComplementoResponse>(this.baseUrl, request);
  }

  atualizar(id: number, request: GrupoComplementoRequest): Observable<GrupoComplementoResponse> {
    return this.http.put<GrupoComplementoResponse>(`${this.baseUrl}/${id}`, request);
  }

  listarOpcoes(grupoId: number): Observable<OpcaoComplementoResponse[]> {
    return this.http.get<OpcaoComplementoResponse[]>(`${this.baseUrl}/${grupoId}/opcoes`);
  }

  ativar(id: number): Observable<GrupoComplementoResponse> {
    return this.http.patch<GrupoComplementoResponse>(`${this.baseUrl}/${id}/ativar`, {});
  }

  desativar(id: number): Observable<GrupoComplementoResponse> {
    return this.http.patch<GrupoComplementoResponse>(`${this.baseUrl}/${id}/desativar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
