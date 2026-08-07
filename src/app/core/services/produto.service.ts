import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { ProdutoFiltros, ProdutoResponse } from '../models/produto.model';

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/produtos`;

  listar(filtros: ProdutoFiltros): Observable<PageResponse<ProdutoResponse>> {
    return this.http.get<PageResponse<ProdutoResponse>>(`${this.baseUrl}/listaTodosPaginado`, {
      params: this.criarParametros(filtros)
    });
  }

  buscarPorId(id: number): Observable<ProdutoResponse> {
    return this.http.get<ProdutoResponse>(`${this.baseUrl}/buscarProdutoPorId/${id}`);
  }

  private criarParametros(filtros: ProdutoFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    const opcionais: Record<string, string | number | undefined> = {
      sort: filtros.sort,
      id: filtros.id,
      nome: filtros.nome,
      descricao: filtros.descricao,
      valorFornecedor: filtros.valorFornecedor,
      quantidadeEstoque: filtros.quantidadeEstoque,
      categoriaId: filtros.categoriaId
    };

    Object.entries(opcionais).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return params;
  }
}

