import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { PermissaoFiltros, PermissaoResponse } from '../models/permissao.model';

@Injectable({
  providedIn: 'root'
})
export class PermissaoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/permissoes`;

  listar(filtros: PermissaoFiltros): Observable<PageResponse<PermissaoResponse>> {
    return this.http.get<PageResponse<PermissaoResponse>>(`${this.baseUrl}/listarTodos`, {
      params: this.criarParametros(filtros)
    });
  }

  private criarParametros(filtros: PermissaoFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    const opcionais: Record<string, string | number | undefined> = {
      sort: filtros.sort,
      id: filtros.id,
      codigo: filtros.codigo,
      authority: filtros.authority
    };

    Object.entries(opcionais).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return params;
  }
}
