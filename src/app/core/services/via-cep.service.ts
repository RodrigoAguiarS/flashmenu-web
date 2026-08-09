import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ViaCepResponse } from '../models/via-cep.model';

@Injectable({
  providedIn: 'root'
})
export class ViaCepService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://viacep.com.br/ws';

  buscarPorCep(cep: string): Observable<ViaCepResponse> {
    return this.http.get<ViaCepResponse>(`${this.baseUrl}/${cep.replace(/\D/g, '')}/json/`);
  }
}
