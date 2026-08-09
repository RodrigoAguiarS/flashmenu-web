export interface EmpresaRequest {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  email?: string | null;
  telefone?: string | null;
}

export interface EmpresaResponse extends EmpresaRequest {
  id: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm?: string | null;
}
