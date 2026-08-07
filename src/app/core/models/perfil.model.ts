import { PermissaoResponse } from './permissao.model';

export interface PerfilRequest {
  descricao: string;
  permissoes: number[];
}

export interface PerfilUpdateRequest {
  descricao: string;
  permissoes: Array<Pick<PermissaoResponse, 'id'>>;
}

export interface PerfilFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  descricao?: string;
}

export interface PerfilResponse {
  id: number;
  descricao: string;
  permissoes: PermissaoResponse[];
  criadoEm: string;
  atualizadoEm: string;
}
