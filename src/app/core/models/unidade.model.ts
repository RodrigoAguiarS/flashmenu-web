export interface UnidadeResumo {
  id: number;
  empresaId: number;
  nome: string;
  slug: string;
  ativo: boolean;
}

export interface UnidadeResponse extends UnidadeResumo {
  criadoEm: string;
  atualizadoEm: string;
}

export interface UnidadeRequest {
  nome: string;
  slug: string;
  ativo: boolean;
}
