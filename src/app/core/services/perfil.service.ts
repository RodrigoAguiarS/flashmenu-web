import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { PerfilFiltros, PerfilRequest, PerfilResponse, PerfilUpdateRequest } from '../models/perfil.model';

interface MensagemResponse {
  mensagem?: string;
  erro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/perfis`;

  listar(filtros: PerfilFiltros): Observable<PageResponse<PerfilResponse>> {
    return this.http.get<PageResponse<PerfilResponse>>(`${this.baseUrl}/listarTodos`, {
      params: this.criarParametros(filtros)
    });
  }

  buscarPorId(id: number): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(`${this.baseUrl}/buscarPorId/${id}`);
  }

  cadastrar(request: PerfilRequest): Observable<PerfilResponse> {
    return this.http.post<PerfilResponse>(`${this.baseUrl}/criarPerfil`, request);
  }

  atualizar(id: number, request: PerfilUpdateRequest): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(`${this.baseUrl}/atualizarPerfil/${id}`, request);
  }

  excluir(id: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(`${this.baseUrl}/deletarPerfil/${id}`);
  }

  adicionarPermissao(id: number, permissaoId: number): Observable<PerfilResponse> {
    return this.http.post<PerfilResponse>(`${this.baseUrl}/${id}/adicionarPermissao`, { permissaoId });
  }

  removerPermissao(id: number, permissaoId: number): Observable<PerfilResponse> {
    return this.http.delete<PerfilResponse>(`${this.baseUrl}/${id}/removerPermissao`, {
      body: { permissaoId }
    });
  }

  private criarParametros(filtros: PerfilFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    const opcionais: Record<string, string | number | undefined> = {
      sort: filtros.sort,
      id: filtros.id,
      descricao: filtros.descricao
    };

    Object.entries(opcionais).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return params;
  }
}
