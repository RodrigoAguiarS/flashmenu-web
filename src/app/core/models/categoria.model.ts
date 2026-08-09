export interface CategoriaRequest {
  nome: string;
  descricao: string;
}

export interface CategoriaResponse {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CategoriaFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  nome?: string;
  descricao?: string;
}
