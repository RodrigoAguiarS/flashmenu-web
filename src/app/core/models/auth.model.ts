import { UsuarioResponse } from './usuario.model';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  usuario: UsuarioResponse;
}
