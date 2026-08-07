import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { PerfilResponse } from '../models/perfil.model';

export interface PerfilFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  descricao?: string;
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

