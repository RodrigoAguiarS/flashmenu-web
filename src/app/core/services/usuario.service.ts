import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/page.model';
import {
  AlterarSenhaUsuarioRequest,
  UsuarioFiltros,
  UsuarioRequest,
  UsuarioResponse
} from '../models/usuario.model';

interface MensagemResponse {
  mensagem?: string;
  erro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/usuarios`;

  listar(filtros: UsuarioFiltros): Observable<PageResponse<UsuarioResponse>> {
    return this.http.get<PageResponse<UsuarioResponse>>(`${this.baseUrl}/listarUsuarios`, {
      params: this.criarParametros(filtros)
    });
  }

  buscarPorId(id: number): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.baseUrl}/buscarUsuarioId/${id}`);
  }

  cadastrar(usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.baseUrl}/criarUsuarios`, usuario);
  }

  atualizar(id: number, usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.baseUrl}/atualizarUsuario/${id}`, usuario);
  }

  alterarSenha(id: number, request: AlterarSenhaUsuarioRequest): Observable<MensagemResponse> {
    return this.http.post<MensagemResponse>(`${this.baseUrl}/${id}/alterar-senha`, request);
  }

  excluir(id: number): Observable<MensagemResponse> {
    return this.http.delete<MensagemResponse>(`${this.baseUrl}/${id}`);
  }

  ativar(id: number): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.baseUrl}/${id}/ativar`, {});
  }

  desativar(id: number): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.baseUrl}/${id}/desativar`, {});
  }

  private criarParametros(filtros: UsuarioFiltros): HttpParams {
    let params = new HttpParams()
      .set('page', filtros.page)
      .set('size', filtros.size);

    const opcionais: Record<string, string | number | boolean | undefined> = {
      sort: filtros.sort,
      id: filtros.id,
      nome: filtros.nome,
      email: filtros.email,
      telefone: filtros.telefone,
      ativo: filtros.ativo,
      perfilId: filtros.perfilId
    };

    Object.entries(opcionais).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, valor);
      }
    });

    return params;
  }
}

