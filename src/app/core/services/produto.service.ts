import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import { ProdutoFiltros, ProdutoRequest, ProdutoResponse } from '../models/produto.model';

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

  cadastrar(request: ProdutoRequest, imagem?: File | null): Observable<ProdutoResponse> {
    if (imagem) {
      return this.http.post<ProdutoResponse>(`${this.baseUrl}/criarProdutoComImagem`, this.criarFormData(request, imagem));
    }

    return this.http.post<ProdutoResponse>(`${this.baseUrl}/criarProduto`, request);
  }

  atualizar(id: number, request: ProdutoRequest, imagem?: File | null): Observable<ProdutoResponse> {
    if (imagem) {
      return this.http.put<ProdutoResponse>(
        `${this.baseUrl}/atualizarProdutoComImagem/${id}`,
        this.criarFormData(request, imagem)
      );
    }

    return this.http.put<ProdutoResponse>(`${this.baseUrl}/atualizarProduto/${id}`, request);
  }

  alterarImagem(id: number, imagem: File): Observable<ProdutoResponse> {
    const formData = new FormData();
    formData.append('imagem', imagem);

    return this.http.put<ProdutoResponse>(`${this.baseUrl}/${id}/imagem`, formData);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/deletarProduto/${id}`);
  }

  private criarFormData(request: ProdutoRequest, imagem: File): FormData {
    const formData = new FormData();
    formData.append('produto', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    formData.append('imagem', imagem);

    return formData;
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
