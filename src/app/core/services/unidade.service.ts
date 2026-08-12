import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { HorarioFuncionamentoRequest, HorarioFuncionamentoResponse } from '../models/horario-funcionamento.model';
import { UnidadeRequest, UnidadeResponse } from '../models/unidade.model';

@Injectable({
  providedIn: 'root'
})
export class UnidadeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/unidades`;

  listar(): Observable<UnidadeResponse[]> {
    return this.http.get<UnidadeResponse[]>(this.baseUrl);
  }

  buscarPublicaPorSlug(slug: string): Observable<UnidadeResponse> {
    return this.http.get<UnidadeResponse>(
      `${environment.apiUrl}/api/publico/unidades/${encodeURIComponent(slug)}`
    );
  }

  cadastrar(request: UnidadeRequest): Observable<UnidadeResponse> {
    return this.http.post<UnidadeResponse>(this.baseUrl, request);
  }

  atualizar(id: number, request: UnidadeRequest): Observable<UnidadeResponse> {
    return this.http.put<UnidadeResponse>(`${this.baseUrl}/${id}`, request);
  }

  listarHorarios(unidadeId: number): Observable<HorarioFuncionamentoResponse[]> {
    return this.http.get<HorarioFuncionamentoResponse[]>(`${this.baseUrl}/${unidadeId}/horarios`);
  }

  listarHorariosPublicos(unidadeId: number): Observable<HorarioFuncionamentoResponse[]> {
    return this.http.get<HorarioFuncionamentoResponse[]>(
      `${environment.apiUrl}/api/publico/unidades/${unidadeId}/horarios`
    );
  }

  atualizarHorariosSemana(
    unidadeId: number,
    request: HorarioFuncionamentoRequest[]
  ): Observable<HorarioFuncionamentoResponse[]> {
    return this.http.put<HorarioFuncionamentoResponse[]>(`${this.baseUrl}/${unidadeId}/horarios`, request);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
