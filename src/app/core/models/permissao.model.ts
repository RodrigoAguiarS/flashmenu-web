export interface PermissaoFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  codigo?: number;
  authority?: string;
}

export interface PermissaoResponse {
  id: number;
  codigo: number;
  authority: string;
  criadoEm: string;
  atualizadoEm: string;
}
