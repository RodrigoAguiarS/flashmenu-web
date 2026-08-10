export interface OpcaoComplementoResponse {
  id: number;
  grupoComplementoId: number;
  nome: string;
  descricao?: string | null;
  valorAdicional: number;
  quantidadeMaxima: number;
  ativo: boolean;
  ordem: number;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface GrupoComplementoResponse {
  id: number;
  produtoId: number;
  nome: string;
  descricao?: string | null;
  quantidadeMinima: number;
  quantidadeMaxima: number;
  obrigatorio: boolean;
  ativo: boolean;
  ordem: number;
  opcoes?: OpcaoComplementoResponse[];
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface GrupoComplementoRequest {
  produtoId: number;
  nome: string;
  descricao?: string | null;
  quantidadeMinima: number;
  quantidadeMaxima: number;
  obrigatorio: boolean;
  ordem: number;
}

export interface OpcaoComplementoRequest {
  grupoComplementoId: number;
  nome: string;
  descricao?: string | null;
  valorAdicional: number;
  quantidadeMaxima: number;
  ordem: number;
}

export interface ComplementoSelecionado {
  opcaoComplementoId: number;
  quantidade: number;
  nome: string;
  valorAdicional: number;
  grupoComplementoId: number;
}
