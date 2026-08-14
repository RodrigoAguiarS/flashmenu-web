import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EmpresaRequest, EmpresaResponse } from '../models/empresa.model';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/empresa`;

  buscar(): Observable<EmpresaResponse> {
    return this.http.get<EmpresaResponse>(this.baseUrl);
  }

  criar(request: EmpresaRequest): Observable<EmpresaResponse> {
    return this.http.post<EmpresaResponse>(this.baseUrl, request);
  }

  atualizar(request: EmpresaRequest): Observable<EmpresaResponse> {
    return this.http.put<EmpresaResponse>(this.baseUrl, request);
  }
}
