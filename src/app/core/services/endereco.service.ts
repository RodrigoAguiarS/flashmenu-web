import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EnderecoRequest, EnderecoResponse } from '../models/endereco.model';

@Injectable({
  providedIn: 'root'
})
export class EnderecoService {
  private readonly http = inject(HttpClient);

  listar(usuarioId: number): Observable<EnderecoResponse[]> {
    return this.http.get<EnderecoResponse[]>(this.baseUrl(usuarioId));
  }

  buscar(usuarioId: number, enderecoId: number): Observable<EnderecoResponse> {
    return this.http.get<EnderecoResponse>(`${this.baseUrl(usuarioId)}/${enderecoId}`);
  }

  criar(usuarioId: number, request: EnderecoRequest): Observable<EnderecoResponse> {
    return this.http.post<EnderecoResponse>(this.baseUrl(usuarioId), request);
  }

  atualizar(usuarioId: number, enderecoId: number, request: EnderecoRequest): Observable<EnderecoResponse> {
    return this.http.put<EnderecoResponse>(`${this.baseUrl(usuarioId)}/${enderecoId}`, request);
  }

  definirPrincipal(usuarioId: number, enderecoId: number): Observable<EnderecoResponse> {
    return this.http.patch<EnderecoResponse>(`${this.baseUrl(usuarioId)}/${enderecoId}/principal`, {});
  }

  excluir(usuarioId: number, enderecoId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl(usuarioId)}/${enderecoId}`);
  }

  private baseUrl(usuarioId: number): string {
    return `${environment.apiUrl}/api/usuarios/${usuarioId}/enderecos`;
  }
}
