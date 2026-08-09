import { UsuarioResponse } from './usuario.model';
import { EnderecoRequest, EnderecoResponse } from './endereco.model';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  usuario: UsuarioResponse;
}

export interface ClienteIdentificacaoResponse {
  encontrado: boolean;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  endereco: EnderecoResponse | null;
}

export interface ClienteCheckoutRequest {
  nome: string;
  login: string;
  telefone: string;
  senha: string;
  endereco?: EnderecoRequest;
}
