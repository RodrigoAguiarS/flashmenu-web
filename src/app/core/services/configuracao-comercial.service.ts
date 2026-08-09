import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ConfiguracaoComercialRequest,
  ConfiguracaoComercialResponse
} from '../models/configuracao-comercial.model';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracaoComercialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/configuracao-comercial`;

  buscar(): Observable<ConfiguracaoComercialResponse> {
    return this.http.get<ConfiguracaoComercialResponse>(this.baseUrl);
  }

  criar(request: ConfiguracaoComercialRequest): Observable<ConfiguracaoComercialResponse> {
    return this.http.post<ConfiguracaoComercialResponse>(this.baseUrl, request);
  }

  atualizar(request: ConfiguracaoComercialRequest): Observable<ConfiguracaoComercialResponse> {
    return this.http.put<ConfiguracaoComercialResponse>(this.baseUrl, request);
  }
}
