import { CategoriaResponse } from './categoria.model';
import { GrupoComplementoResponse } from './complemento.model';

export interface ProdutoResponse {
  id: number;
  nome: string;
  descricao: string;
  categoria: CategoriaResponse;
  valorVenda: number;
  imagemUrl: string | null;
  arquivosUrl: string[];
  valorFornecedor: number;
  quantidadeEstoque: number;
  ativo?: boolean;
  criadoEm: string;
  atualizadoEm: string;
  gruposComplementos?: GrupoComplementoResponse[];
}

export interface ProdutoRequest {
  nome: string;
  descricao: string;
  categoriaId: number;
  valorFornecedor: number;
  arquivosUrl: string[];
  quantidadeEstoque: number;
}

export interface ProdutoFiltros {
  page: number;
  size: number;
  sort?: string;
  id?: number;
  nome?: string;
  descricao?: string;
  valorFornecedor?: number;
  quantidadeEstoque?: number;
  categoriaId?: number;
}
