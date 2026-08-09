import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CategoriaFiltros, CategoriaRequest, CategoriaResponse } from '../models/categoria.model';
import { PageResponse } from '../models/page.model';

interface MensagemResponse {
  mensagem?: string;
  erro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/categorias`;

  listar(filtros: CategoriaFiltros): Observable<PageResponse<CategoriaResponse>> {
    return this.http.get<PageResponse<CategoriaResponse>>(`${this.baseUrl}/listaTodosPaginado`, {
      params: this.criarParametros(filtros)
    });
  }

  buscarPorId(id: number): Observable<CategoriaResponse> {
    return this.http.get<CategoriaResponse>(`${this.baseUrl}/buscarCategoriaPorId/${id}`);
  }

  cadastrar(request: CategoriaRequest): Observable<CategoriaResponse> {
    return this.http.post<CategoriaResponse>(`${this.baseUrl}/criarCategoria`, request);
  }

  atualizar(id: number, request: CategoriaRequest): Observable<CategoriaResponse> {
    return this.http.put<CategoriaResponse>(`${this.baseUrl}/atualizarCategoria/${id}`, request);
  }

  excluir(id: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(`${this.baseUrl}/deletarCategoria/${id}`);
  }

  private criarParametros(filtros: CategoriaFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    const opcionais: Record<string, string | number | undefined> = {
      sort: filtros.sort,
      id: filtros.id,
      nome: filtros.nome,
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
