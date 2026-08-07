import { PermissaoResponse } from './permissao.model';

export interface PerfilResponse {
  id: number;
  descricao: string;
  permissoes: PermissaoResponse[];
  criadoEm: string;
  atualizadoEm: string;
}
