import { PerfilResponse } from './perfil.model';
import { EnderecoRequest } from './endereco.model';
import { UnidadeResumo } from './unidade.model';

export interface UsuarioRequest {
  nome: string;
  login: string;
  telefone: string;
  idPerfil: number;
  senha?: string;
  endereco?: EnderecoRequest;
}

export interface AlterarSenhaUsuarioRequest {
  novaSenha: string;
}

export interface UsuarioFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  nome?: string;
  email?: string;
  telefone?: string;
  ativo?: boolean;
  perfilId?: number;
}

export interface UsuarioResponse {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  unidade: UnidadeResumo | null;
  perfil: PerfilResponse | null;
  empresaId?: number | null;
  empresaNome?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
}
